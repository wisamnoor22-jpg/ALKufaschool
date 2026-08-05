const pool = require("../db");
const {
  createDeletionArchive,
} = require("../services/deletionArchiveService");

const DELETE_REASONS = {
  transferred: "انتقل إلى مدرسة أخرى.",
  dismissed: "فُصل من المدرسة.",
  graduated: "تخرج.",
  withdrawn: "انسحب.",
  other: "سبب آخر.",
};
const ALLOWED_GENDERS = new Set(["طالب", "طالبة"]);
const ALLOWED_SCHOOL_SHIFTS = new Set(["صباحي", "ظهري"]);
const {
  createEnrollment,
  updateCurrentSection,
  getStudentWithCurrentEnrollment,
  getStudentsWithCurrentEnrollment,
} = require("../services/enrollmentService");

const sendError = (res, error, fallbackMessage) => {
  console.error(error);

  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : fallbackMessage,
  });
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const validateStudentShift = (genderValue, schoolShiftValue) => {
  const gender = normalizeText(genderValue);
  const schoolShift = normalizeText(schoolShiftValue);

  if (!ALLOWED_GENDERS.has(gender)) {
    return { error: "نوع الطالب غير صحيح" };
  }

  if (!ALLOWED_SCHOOL_SHIFTS.has(schoolShift)) {
    return { error: "وقت الدوام مطلوب ويجب أن يكون صباحي أو ظهري" };
  }

  if (gender === "طالبة" && schoolShift === "ظهري") {
    return {
      error:
        "الدوام الظهري مخصص للطلاب الذكور فقط؛ اختر الدوام الصباحي للطالبة",
    };
  }

  return { value: { gender, school_shift: schoolShift } };
};

const addStudent = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      gender,
      birth_date,
      phone,
      address,
      grade,
      section,
      school_shift,
    } = req.body;

    if (!full_name?.trim()) {
      return res.status(400).json({
        message: "اسم الطالب مطلوب",
      });
    }

    if (!grade?.trim()) {
      return res.status(400).json({
        message: "المرحلة الدراسية مطلوبة",
      });
    }

    const shiftValidation = validateStudentShift(gender, school_shift);

    if (shiftValidation.error) {
      return res.status(400).json({ message: shiftValidation.error });
    }

    await client.query("BEGIN");

    const studentResult = await client.query(
      `INSERT INTO students (
         full_name,
         gender,
         birth_date,
         phone,
         address,
         grade,
         section,
         school_shift
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        full_name.trim(),
        shiftValidation.value.gender,
        birth_date || null,
        phone || null,
        address || null,
        grade.trim(),
        section?.trim() || null,
        shiftValidation.value.school_shift,
      ]
    );

    const student = studentResult.rows[0];

    await createEnrollment({
      studentId: student.id,
      gradeName: grade,
      sectionName: section,
      schoolShift: shiftValidation.value.school_shift,
      client,
    });

    await client.query("COMMIT");

    const completeStudent = await getStudentWithCurrentEnrollment(
      student.id
    );

    return res.status(201).json({
      message: "تمت إضافة الطالب بنجاح",
      student: completeStudent,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, error, "حدث خطأ في إضافة الطالب");
  } finally {
    client.release();
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await getStudentsWithCurrentEnrollment();
    return res.json(students);
  } catch (error) {
    return sendError(res, error, "حدث خطأ في جلب الطلاب");
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await getStudentWithCurrentEnrollment(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "الطالب غير موجود" });
    }

    return res.json(student);
  } catch (error) {
    return sendError(res, error, "حدث خطأ في جلب ملف الطالب");
  }
};

const updateStudent = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const {
      full_name,
      gender,
      birth_date,
      phone,
      address,
      section,
      school_shift,
    } = req.body;

    if (!full_name?.trim()) {
      return res.status(400).json({
        message: "اسم الطالب مطلوب",
      });
    }

    const shiftValidation = validateStudentShift(gender, school_shift);

    if (shiftValidation.error) {
      return res.status(400).json({ message: shiftValidation.error });
    }

    await client.query("BEGIN");

    const currentStudent = await getStudentWithCurrentEnrollment(
      id,
      client
    );

    if (!currentStudent) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    await client.query(
      `UPDATE students
       SET full_name = $1,
           gender = $2,
           birth_date = $3,
           phone = $4,
           address = $5,
           section = $6,
           school_shift = $7
       WHERE id = $8`,
      [
        full_name.trim(),
        shiftValidation.value.gender,
        birth_date || null,
        phone || null,
        address || null,
        section?.trim() || null,
        shiftValidation.value.school_shift,
        id,
      ]
    );

    await updateCurrentSection({
      studentId: id,
      sectionName: section,
      schoolShift: shiftValidation.value.school_shift,
      client,
    });

    await client.query("COMMIT");

    const completeStudent = await getStudentWithCurrentEnrollment(id);

    return res.json({
      message: "تم تعديل بيانات الطالب بنجاح",
      student: completeStudent,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, error, "حدث خطأ في تعديل الطالب");
  } finally {
    client.release();
  }
};

const deleteStudent = async (req, res) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);
    const requestBody =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const reasonCode =
      typeof requestBody.reason_code === "string"
        ? requestBody.reason_code.trim()
        : "";
    const reasonDetails =
      typeof requestBody.reason_details === "string"
        ? requestBody.reason_details.trim()
        : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم الطالب غير صحيح",
      });
    }

    if (!Object.hasOwn(DELETE_REASONS, reasonCode)) {
      return res.status(400).json({
        message: "يرجى تحديد سبب حذف الطالب",
      });
    }

    if (reasonCode === "other" && !reasonDetails) {
      return res.status(400).json({
        message: "يرجى كتابة سبب حذف الطالب",
      });
    }

    if (reasonDetails.length > 500) {
      return res.status(400).json({
        message: "سبب حذف الطالب يجب ألا يتجاوز 500 حرف",
      });
    }

    await client.query("BEGIN");

    const studentResult = await client.query(
      "SELECT * FROM students WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (studentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    const enrollmentsResult = await client.query(
      `SELECT
         se.*,
         ay.name AS academic_year_name,
         g.name AS grade_name,
         sec.name AS section_name
       FROM student_enrollments se
       JOIN academic_years ay ON ay.id = se.academic_year_id
       JOIN grades g ON g.id = se.grade_id
       LEFT JOIN sections sec ON sec.id = se.section_id
       WHERE se.student_id = $1
       ORDER BY se.enrollment_date, se.id
       FOR UPDATE OF se`,
      [id]
    );

    const attendanceResult = await client.query(
      `SELECT sa.*
       FROM student_attendance sa
       JOIN student_enrollments se
         ON se.id = sa.student_enrollment_id
       WHERE se.student_id = $1
       ORDER BY sa.attendance_date, sa.id
       FOR UPDATE OF sa`,
      [id]
    );

    const feesResult = await client.query(
      `SELECT *
       FROM student_fees
       WHERE student_id = $1
       ORDER BY academic_year, id
       FOR UPDATE`,
      [id]
    );

    const paymentsResult = await client.query(
      `SELECT p.*
       FROM payments p
       JOIN student_fees sf ON sf.id = p.student_fee_id
       WHERE sf.student_id = $1
       ORDER BY p.payment_date, p.id
       FOR UPDATE OF p`,
      [id]
    );

    const receiptsResult = await client.query(
      `SELECT pr.*
       FROM payment_receipts pr
       JOIN payments p ON p.id = pr.payment_id
       JOIN student_fees sf ON sf.id = p.student_fee_id
       WHERE sf.student_id = $1
       ORDER BY pr.created_at, pr.id
       FOR UPDATE OF pr`,
      [id]
    );

    const relatedCounts = {
      student_enrollments: enrollmentsResult.rowCount,
      student_attendance: attendanceResult.rowCount,
      student_fees: feesResult.rowCount,
      payments: paymentsResult.rowCount,
      payment_receipts: receiptsResult.rowCount,
    };

    const archiveRecord = await createDeletionArchive(client, {
      entityType: "student",
      entityId: id,
      entityName: studentResult.rows[0].full_name,
      deletionReason:
        reasonCode === "other"
          ? reasonDetails
          : DELETE_REASONS[reasonCode],
      snapshotData: {
        student: studentResult.rows[0],
        student_enrollments: enrollmentsResult.rows,
        student_attendance: attendanceResult.rows,
        student_fees: feesResult.rows,
        payments: paymentsResult.rows,
        payment_receipts: receiptsResult.rows,
      },
      metadata: {
        schema_version: 1,
        reason_code: reasonCode,
        source: "student_deletion",
        related_counts: relatedCounts,
      },
    });

    const deletedReceipts = await client.query(
      `DELETE FROM payment_receipts
       WHERE payment_id IN (
         SELECT p.id
         FROM payments p
         JOIN student_fees sf
           ON sf.id = p.student_fee_id
         WHERE sf.student_id = $1
       )`,
      [id]
    );

    const deletedPayments = await client.query(
      `DELETE FROM payments
       USING student_fees sf
       WHERE payments.student_fee_id = sf.id
         AND sf.student_id = $1`,
      [id]
    );

    const deletedFees = await client.query(
      "DELETE FROM student_fees WHERE student_id = $1",
      [id]
    );

    const deletedAttendance = await client.query(
      `DELETE FROM student_attendance
       WHERE student_enrollment_id IN (
         SELECT id
         FROM student_enrollments
         WHERE student_id = $1
       )`,
      [id]
    );

    const deletedEnrollments = await client.query(
      "DELETE FROM student_enrollments WHERE student_id = $1",
      [id]
    );

    const deletedStudent = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "تم حذف الطالب وسجلاته المرتبطة بنجاح",
      student: deletedStudent.rows[0],
      deletion_reason: {
        code: reasonCode,
        details: reasonCode === "other" ? reasonDetails : "",
        persisted: true,
        archive_id: archiveRecord.id,
      },
      deleted_records: {
        payment_receipts: deletedReceipts.rowCount,
        payments: deletedPayments.rowCount,
        student_fees: deletedFees.rowCount,
        student_attendance: deletedAttendance.rowCount,
        student_enrollments: deletedEnrollments.rowCount,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return sendError(res, error, "حدث خطأ في حذف الطالب");
  } finally {
    client.release();
  }
};

module.exports = {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  validateStudentShift,
  ALLOWED_SCHOOL_SHIFTS,
};
