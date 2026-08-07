const db = require("../db");
const {
  getActiveAcademicYear,
  getOrCreateSection,
} = require("../services/enrollmentService");

const SCHOOL_GRADE_LABELS = [
  "الصف الأول",
  "الصف الثاني",
  "الصف الثالث",
  "الصف الرابع",
  "الصف الخامس",
  "الصف السادس",
  "الأول المتوسط",
  "الثاني المتوسط",
];

const MORNING_SECTION_PLAN = [
  ["أ", "ب", "ت"],
  ["أ", "ب", "ت"],
  ["أ"],
  ["أ"],
  ["أ"],
  ["أ"],
  ["أ"],
  ["أ"],
];

const normalizeSectionName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const toPositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const getAcademicYearLabel = (academicYear) =>
  academicYear?.name ||
  academicYear?.academic_year ||
  academicYear?.year_name ||
  academicYear?.label ||
  "السنة الدراسية الحالية";

const getSchoolGrades = async (client = db) => {
  const result = await client.query(
    `
      SELECT id, name
      FROM grades
      ORDER BY id ASC
      LIMIT $1
    `,
    [SCHOOL_GRADE_LABELS.length]
  );

  return result.rows.map((grade, index) => ({
    ...grade,
    display_name: SCHOOL_GRADE_LABELS[index] || grade.name,
    school_order: index + 1,
  }));
};

const getSectionOrThrow = async (client, sectionId, academicYearId) => {
  const result = await client.query(
    `
      SELECT id, academic_year_id, grade_id, name, is_active
      FROM sections
      WHERE id = $1
        AND academic_year_id = $2
        AND is_active = TRUE
      FOR UPDATE
    `,
    [sectionId, academicYearId]
  );

  if (!result.rows.length) {
    const error = new Error("الشعبة غير موجودة في السنة الدراسية الحالية");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const getStudentSections = async (req, res) => {
  try {
    const academicYear = await getActiveAcademicYear();
    const academicYearId = Number(academicYear.id);
    const grades = await getSchoolGrades();
    const gradeIds = grades.map((grade) => Number(grade.id));

    if (!gradeIds.length) {
      return res.json({
        academic_year: getAcademicYearLabel(academicYear),
        grades: [],
        sections: [],
        students: [],
      });
    }

    const [sectionsResult, studentsResult] = await Promise.all([
      db.query(
        `
          SELECT
            sec.id,
            sec.grade_id,
            sec.name,
            g.name AS grade_name,
            COUNT(se.id)::INTEGER AS student_count
          FROM sections sec
          JOIN grades g ON g.id = sec.grade_id
          LEFT JOIN student_enrollments se
            ON se.section_id = sec.id
           AND se.academic_year_id = $1
           AND se.enrollment_status = 'active'
           AND se.deleted_at IS NULL
          WHERE sec.academic_year_id = $1
            AND sec.is_active = TRUE
            AND sec.grade_id = ANY($2::INTEGER[])
          GROUP BY sec.id, sec.grade_id, sec.name, g.name
          ORDER BY sec.grade_id ASC, sec.name ASC
        `,
        [academicYearId, gradeIds]
      ),
      db.query(
        `
          SELECT
            s.id,
            s.full_name,
            s.gender,
            se.id AS enrollment_id,
            se.grade_id,
            se.section_id,
            g.name AS grade_name,
            sec.name AS section_name
          FROM student_enrollments se
          JOIN students s ON s.id = se.student_id
          JOIN grades g ON g.id = se.grade_id
          LEFT JOIN sections sec ON sec.id = se.section_id
          WHERE se.academic_year_id = $1
            AND se.enrollment_status = 'active'
            AND se.deleted_at IS NULL
            AND se.grade_id = ANY($2::INTEGER[])
          ORDER BY se.grade_id ASC, sec.name ASC NULLS LAST, s.full_name ASC
        `,
        [academicYearId, gradeIds]
      ),
    ]);

    const gradeLabelById = new Map(
      grades.map((grade) => [Number(grade.id), grade.display_name])
    );

    const sections = sectionsResult.rows.map((section) => ({
      ...section,
      grade_name:
        gradeLabelById.get(Number(section.grade_id)) || section.grade_name,
    }));

    const students = studentsResult.rows.map((student) => ({
      id: Number(student.id),
      full_name: student.full_name,
      gender: student.gender,
      enrollment_id: Number(student.enrollment_id),
      grade_id: Number(student.grade_id),
      grade_name:
        gradeLabelById.get(Number(student.grade_id)) || student.grade_name,
      section_id: student.section_id ? Number(student.section_id) : null,
      section_name: student.section_name || null,
    }));

    return res.json({
      academic_year: getAcademicYearLabel(academicYear),
      grades,
      sections,
      students,
    });
  } catch (error) {
    console.error("getStudentSections error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "تعذر جلب الشعب والطلاب",
    });
  }
};

const initializeMorningSectionPlan = async (req, res) => {
  try {
    const academicYear = await getActiveAcademicYear();
    const grades = await getSchoolGrades();
    let createdOrConfirmed = 0;

    for (let index = 0; index < grades.length; index += 1) {
      const grade = grades[index];
      const sectionNames = MORNING_SECTION_PLAN[index] || ["أ"];

      for (const sectionName of sectionNames) {
        await getOrCreateSection({
          academicYearId: Number(academicYear.id),
          gradeId: Number(grade.id),
          sectionName,
        });
        createdOrConfirmed += 1;
      }
    }

    return res.json({
      message:
        "تم التأكد من وجود الشعب المعتمدة للدوام الصباحي دون حذف أي شعبة أو نقل أي طالب.",
      sections_checked: createdOrConfirmed,
    });
  } catch (error) {
    console.error("initializeMorningSectionPlan error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "تعذر تطبيق توزيع الشعب المعتمد",
    });
  }
};

const createStudentSection = async (req, res) => {
  try {
    const gradeId = toPositiveInteger(req.body?.grade_id);
    const name = normalizeSectionName(req.body?.name);

    if (!gradeId) {
      return res.status(400).json({ message: "الصف غير صحيح" });
    }

    if (!name) {
      return res.status(400).json({ message: "اسم الشعبة مطلوب" });
    }

    if (name.length > 20) {
      return res.status(400).json({
        message: "اسم الشعبة يجب ألا يتجاوز 20 حرفًا",
      });
    }

    const academicYear = await getActiveAcademicYear();
    const grades = await getSchoolGrades();
    const grade = grades.find((item) => Number(item.id) === gradeId);

    if (!grade) {
      return res.status(400).json({
        message: "يمكن إضافة الشعب للصفوف المعتمدة في المدرسة فقط",
      });
    }

    const section = await getOrCreateSection({
      academicYearId: Number(academicYear.id),
      gradeId,
      sectionName: name,
    });

    return res.status(201).json({
      message: `تمت إضافة/تفعيل شعبة ${name} بنجاح`,
      section,
    });
  } catch (error) {
    console.error("createStudentSection error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "تعذر إضافة الشعبة",
    });
  }
};

const renameStudentSection = async (req, res) => {
  const sectionId = toPositiveInteger(req.params.id);
  const name = normalizeSectionName(req.body?.name);

  if (!sectionId) {
    return res.status(400).json({ message: "معرف الشعبة غير صحيح" });
  }

  if (!name) {
    return res.status(400).json({ message: "اسم الشعبة مطلوب" });
  }

  if (name.length > 20) {
    return res.status(400).json({
      message: "اسم الشعبة يجب ألا يتجاوز 20 حرفًا",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const academicYear = await getActiveAcademicYear(client);
    const academicYearId = Number(academicYear.id);
    const section = await getSectionOrThrow(
      client,
      sectionId,
      academicYearId
    );

    const duplicate = await client.query(
      `
        SELECT id
        FROM sections
        WHERE academic_year_id = $1
          AND grade_id = $2
          AND LOWER(TRIM(name)) = LOWER(TRIM($3))
          AND id <> $4
          AND is_active = TRUE
        LIMIT 1
      `,
      [academicYearId, section.grade_id, name, sectionId]
    );

    if (duplicate.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "يوجد بالفعل شعبة بالاسم نفسه ضمن هذا الصف",
      });
    }

    const updated = await client.query(
      `
        UPDATE sections
        SET name = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, grade_id, name
      `,
      [name, sectionId]
    );

    await client.query(
      `
        UPDATE students s
        SET section = $1
        WHERE EXISTS (
          SELECT 1
          FROM student_enrollments se
          WHERE se.student_id = s.id
            AND se.academic_year_id = $2
            AND se.section_id = $3
            AND se.enrollment_status = 'active'
            AND se.deleted_at IS NULL
        )
      `,
      [name, academicYearId, sectionId]
    );

    await client.query("COMMIT");

    return res.json({
      message: `تم تغيير اسم الشعبة إلى ${name}`,
      section: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("renameStudentSection error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "تعذر تعديل اسم الشعبة",
    });
  } finally {
    client.release();
  }
};

const transferStudentsBetweenSections = async (req, res) => {
  const fromSectionId = toPositiveInteger(req.body?.from_section_id);
  const toSectionId = toPositiveInteger(req.body?.to_section_id);
  const studentIds = Array.isArray(req.body?.student_ids)
    ? [...new Set(req.body.student_ids.map(toPositiveInteger).filter(Boolean))]
    : [];

  if (!fromSectionId || !toSectionId) {
    return res.status(400).json({
      message: "حدد الشعبة الحالية والشعبة الجديدة",
    });
  }

  if (fromSectionId === toSectionId) {
    return res.status(400).json({
      message: "يجب أن تكون الشعبة الجديدة مختلفة عن الشعبة الحالية",
    });
  }

  if (!studentIds.length) {
    return res.status(400).json({
      message: "حدد طالبًا واحدًا على الأقل للنقل",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const academicYear = await getActiveAcademicYear(client);
    const academicYearId = Number(academicYear.id);
    const fromSection = await getSectionOrThrow(
      client,
      fromSectionId,
      academicYearId
    );
    const toSection = await getSectionOrThrow(
      client,
      toSectionId,
      academicYearId
    );

    if (Number(fromSection.grade_id) !== Number(toSection.grade_id)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "النقل بين الشعب متاح داخل الصف نفسه فقط",
      });
    }

    const eligible = await client.query(
      `
        SELECT student_id
        FROM student_enrollments
        WHERE academic_year_id = $1
          AND section_id = $2
          AND enrollment_status = 'active'
          AND deleted_at IS NULL
          AND student_id = ANY($3::INTEGER[])
        FOR UPDATE
      `,
      [academicYearId, fromSectionId, studentIds]
    );

    const eligibleIds = eligible.rows.map((row) => Number(row.student_id));

    if (!eligibleIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "لم يتم العثور على الطلاب المحددين داخل هذه الشعبة",
      });
    }

    const updatedEnrollments = await client.query(
      `
        UPDATE student_enrollments
        SET section_id = $1
        WHERE academic_year_id = $2
          AND section_id = $3
          AND enrollment_status = 'active'
          AND deleted_at IS NULL
          AND student_id = ANY($4::INTEGER[])
        RETURNING student_id
      `,
      [toSectionId, academicYearId, fromSectionId, eligibleIds]
    );

    await client.query(
      `
        UPDATE students
        SET section = $1
        WHERE id = ANY($2::INTEGER[])
      `,
      [toSection.name, eligibleIds]
    );

    await client.query("COMMIT");

    return res.json({
      message: `تم نقل ${updatedEnrollments.rowCount} طالب إلى شعبة ${toSection.name} بنجاح`,
      transferred_count: updatedEnrollments.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("transferStudentsBetweenSections error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "تعذر نقل الطلاب بين الشعب",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getStudentSections,
  initializeMorningSectionPlan,
  createStudentSection,
  renameStudentSection,
  transferStudentsBetweenSections,
};