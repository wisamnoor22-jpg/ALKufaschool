const db = require("../db");

exports.getGradeFees = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM grade_fees
      ORDER BY academic_year DESC, id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب أقساط المراحل",
    });
  }
};

exports.addGradeFee = async (req, res) => {
  try {
    const { grade, academic_year, total_fee } = req.body;

    if (!grade?.trim() || !academic_year?.trim()) {
      return res.status(400).json({
        message: "المرحلة والسنة الدراسية مطلوبتان",
      });
    }

    if (!total_fee || Number(total_fee) <= 0) {
      return res.status(400).json({
        message: "مبلغ القسط غير صحيح",
      });
    }

    const result = await db.query(
      `
      INSERT INTO grade_fees
      (
        grade,
        academic_year,
        total_fee
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        grade.trim(),
        academic_year.trim(),
        Number(total_fee),
      ]
    );

    res.status(201).json({
      message: "تمت إضافة قسط المرحلة بنجاح",
      gradeFee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "تم تسجيل قسط لهذه المرحلة في هذه السنة مسبقًا",
      });
    }

    res.status(500).json({
      message: "حدث خطأ أثناء إضافة قسط المرحلة",
    });
  }
};

exports.updateGradeFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, academic_year, total_fee } = req.body;

    if (!grade?.trim() || !academic_year?.trim()) {
      return res.status(400).json({
        message: "المرحلة والسنة الدراسية مطلوبتان",
      });
    }

    if (!total_fee || Number(total_fee) <= 0) {
      return res.status(400).json({
        message: "مبلغ القسط غير صحيح",
      });
    }

    const result = await db.query(
      `
      UPDATE grade_fees
      SET
        grade = $1,
        academic_year = $2,
        total_fee = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        grade.trim(),
        academic_year.trim(),
        Number(total_fee),
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "قسط المرحلة غير موجود",
      });
    }

    res.json({
      message: "تم تعديل قسط المرحلة بنجاح",
      gradeFee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "تم تسجيل قسط لهذه المرحلة في هذه السنة مسبقًا",
      });
    }

    res.status(500).json({
      message: "حدث خطأ أثناء تعديل قسط المرحلة",
    });
  }
};

exports.deleteGradeFee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM grade_fees
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "قسط المرحلة غير موجود",
      });
    }

    res.json({
      message: "تم حذف قسط المرحلة بنجاح",
      gradeFee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف قسط المرحلة",
    });
  }
};