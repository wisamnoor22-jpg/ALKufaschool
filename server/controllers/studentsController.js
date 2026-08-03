const pool = require("../db");
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

    await client.query("BEGIN");

    const studentResult = await client.query(
      `INSERT INTO students (
         full_name,
         gender,
         birth_date,
         phone,
         address,
         grade,
         section
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        full_name.trim(),
        gender || null,
        birth_date || null,
        phone || null,
        address || null,
        grade.trim(),
        section?.trim() || null,
      ]
    );

    const student = studentResult.rows[0];

    await createEnrollment({
      studentId: student.id,
      gradeName: grade,
      sectionName: section,
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
    } = req.body;

    if (!full_name?.trim()) {
      return res.status(400).json({
        message: "اسم الطالب مطلوب",
      });
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
           section = $6
       WHERE id = $7`,
      [
        full_name.trim(),
        gender || null,
        birth_date || null,
        phone || null,
        address || null,
        section?.trim() || null,
        id,
      ]
    );

    await updateCurrentSection({
      studentId: id,
      sectionName: section,
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
    const { id } = req.params;

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

    const financialRecords = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM student_fees WHERE student_id = $1
       ) AS has_financial_records`,
      [id]
    );

    if (financialRecords.rows[0].has_financial_records) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "لا يمكن حذف الطالب لوجود سجلات مالية مرتبطة به",
      });
    }

    await client.query(
      "DELETE FROM student_enrollments WHERE student_id = $1",
      [id]
    );

    const deletedStudent = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "تم حذف الطالب بنجاح",
      student: deletedStudent.rows[0],
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
  updateStudent,
  deleteStudent,
};