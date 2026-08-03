const pool = require("../db");

const addStudent = async (req, res) => {
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

    const result = await pool.query(
      `INSERT INTO students
      (full_name, gender, birth_date, phone, address, grade, section)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        full_name.trim(),
        gender || null,
        birth_date || null,
        phone || null,
        address || null,
        grade || null,
        section || null,
      ]
    );

    res.status(201).json({
      message: "تمت إضافة الطالب بنجاح",
      student: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ في إضافة الطالب",
    });
  }
};

const getStudents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM students ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ في جلب الطلاب",
    });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

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

    const result = await pool.query(
      `UPDATE students
       SET full_name = $1,
           gender = $2,
           birth_date = $3,
           phone = $4,
           address = $5,
           grade = $6,
           section = $7
       WHERE id = $8
       RETURNING *`,
      [
        full_name.trim(),
        gender || null,
        birth_date || null,
        phone || null,
        address || null,
        grade || null,
        section || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    res.json({
      message: "تم تعديل بيانات الطالب بنجاح",
      student: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ في تعديل الطالب",
    });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    res.json({
      message: "تم حذف الطالب بنجاح",
      student: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ في حذف الطالب",
    });
  }
};

module.exports = {
  addStudent,
  getStudents,
  updateStudent,
  deleteStudent,
};