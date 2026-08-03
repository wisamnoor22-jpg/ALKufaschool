const pool = require("../db");

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeGradeName = (value) =>
  normalizeText(value).replace(/^الصف\s+/, "");

const getActiveAcademicYear = async (client = pool) => {
  const result = await client.query(
    `SELECT id, name, start_date, end_date, is_active, is_closed
     FROM academic_years
     WHERE is_active = TRUE
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    const error = new Error("لا توجد سنة دراسية نشطة");
    error.statusCode = 409;
    throw error;
  }

  if (result.rows[0].is_closed) {
    const error = new Error("السنة الدراسية الحالية مغلقة");
    error.statusCode = 409;
    throw error;
  }

  return result.rows[0];
};

const getGradeByName = async (gradeName, client = pool) => {
  const normalizedGrade = normalizeGradeName(gradeName);

  if (!normalizedGrade) {
    const error = new Error("المرحلة الدراسية مطلوبة");
    error.statusCode = 400;
    throw error;
  }

  const result = await client.query(
    `SELECT id, name, education_level, sort_order
     FROM grades
     WHERE REPLACE(name, 'الصف ', '') = $1
       AND is_active = TRUE
     LIMIT 1`,
    [normalizedGrade]
  );

  if (result.rows.length === 0) {
    const error = new Error(`المرحلة الدراسية غير موجودة: ${gradeName}`);
    error.statusCode = 400;
    throw error;
  }

  return result.rows[0];
};

const getOrCreateSection = async ({
  academicYearId,
  gradeId,
  sectionName,
  client = pool,
}) => {
  const normalizedSection = normalizeText(sectionName);

  if (!normalizedSection) {
    return null;
  }

  const result = await client.query(
    `INSERT INTO sections (
       academic_year_id,
       grade_id,
       name
     )
     VALUES ($1, $2, $3)
     ON CONFLICT (academic_year_id, grade_id, name)
     DO UPDATE SET
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, name`,
    [academicYearId, gradeId, normalizedSection]
  );

  return result.rows[0];
};

const createEnrollment = async ({
  studentId,
  gradeName,
  sectionName,
  client = pool,
}) => {
  const academicYear = await getActiveAcademicYear(client);
  const grade = await getGradeByName(gradeName, client);
  const section = await getOrCreateSection({
    academicYearId: academicYear.id,
    gradeId: grade.id,
    sectionName,
    client,
  });

  const result = await client.query(
    `INSERT INTO student_enrollments (
       student_id,
       academic_year_id,
       grade_id,
       section_id,
       enrollment_status,
       result_status,
       promotion_status,
       enrollment_date
     )
     VALUES ($1, $2, $3, $4, 'active', 'pending', 'not_processed', CURRENT_DATE)
     ON CONFLICT (student_id, academic_year_id)
     DO UPDATE SET
       grade_id = EXCLUDED.grade_id,
       section_id = EXCLUDED.section_id,
       enrollment_status = 'active',
       updated_at = NOW(),
       deleted_at = NULL
     RETURNING *`,
    [studentId, academicYear.id, grade.id, section?.id || null]
  );

  return {
    ...result.rows[0],
    academic_year: academicYear.name,
    grade: grade.name,
    section: section?.name || null,
  };
};

const updateCurrentSection = async ({
  studentId,
  sectionName,
  client = pool,
}) => {
  const academicYear = await getActiveAcademicYear(client);

  const enrollmentResult = await client.query(
    `SELECT se.id, se.grade_id, g.name AS grade
     FROM student_enrollments se
     JOIN grades g ON g.id = se.grade_id
     WHERE se.student_id = $1
       AND se.academic_year_id = $2
       AND se.deleted_at IS NULL
     LIMIT 1`,
    [studentId, academicYear.id]
  );

  if (enrollmentResult.rows.length === 0) {
    const error = new Error("لا يوجد تسجيل حالي لهذا الطالب");
    error.statusCode = 404;
    throw error;
  }

  const enrollment = enrollmentResult.rows[0];

  const section = await getOrCreateSection({
    academicYearId: academicYear.id,
    gradeId: enrollment.grade_id,
    sectionName,
    client,
  });

  const updatedResult = await client.query(
    `UPDATE student_enrollments
     SET section_id = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [section?.id || null, enrollment.id]
  );

  return {
    ...updatedResult.rows[0],
    academic_year: academicYear.name,
    grade: enrollment.grade,
    section: section?.name || null,
  };
};

const getStudentWithCurrentEnrollment = async (
  studentId,
  client = pool
) => {
  const result = await client.query(
    `SELECT
       s.*,
       COALESCE(g.name, s.grade) AS grade,
       COALESCE(sec.name, s.section) AS section,
       ay.name AS academic_year,
       se.id AS enrollment_id,
       se.enrollment_status,
       se.result_status,
       se.promotion_status
     FROM students s
     LEFT JOIN student_enrollments se
       ON se.student_id = s.id
      AND se.deleted_at IS NULL
     LEFT JOIN academic_years ay
       ON ay.id = se.academic_year_id
     LEFT JOIN grades g
       ON g.id = se.grade_id
     LEFT JOIN sections sec
       ON sec.id = se.section_id
     WHERE s.id = $1
     ORDER BY ay.is_active DESC, se.created_at DESC
     LIMIT 1`,
    [studentId]
  );

  return result.rows[0] || null;
};

const getStudentsWithCurrentEnrollment = async (client = pool) => {
  const result = await client.query(
    `SELECT
       s.*,
       COALESCE(g.name, s.grade) AS grade,
       COALESCE(sec.name, s.section) AS section,
       ay.name AS academic_year,
       se.id AS enrollment_id,
       se.enrollment_status,
       se.result_status,
       se.promotion_status
     FROM students s
     LEFT JOIN student_enrollments se
       ON se.student_id = s.id
      AND se.deleted_at IS NULL
     LEFT JOIN academic_years ay
       ON ay.id = se.academic_year_id
     LEFT JOIN grades g
       ON g.id = se.grade_id
     LEFT JOIN sections sec
       ON sec.id = se.section_id
     ORDER BY ay.is_active DESC, s.id DESC`
  );

  return result.rows;
};

module.exports = {
  getActiveAcademicYear,
  getGradeByName,
  getOrCreateSection,
  createEnrollment,
  updateCurrentSection,
  getStudentWithCurrentEnrollment,
  getStudentsWithCurrentEnrollment,
};