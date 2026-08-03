const db = require("../db");

// جميع الرسوم
exports.getFees = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        sf.*,
        s.full_name,
        COALESCE(SUM(p.amount),0) AS paid
      FROM student_fees sf
      JOIN students s ON s.id = sf.student_id
      LEFT JOIN payments p
        ON p.student_fee_id = sf.id
      GROUP BY sf.id, s.full_name
      ORDER BY sf.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "حدث خطأ أثناء جلب الرسوم",
    });
  }
};

// إضافة رسوم
exports.addFee = async (req, res) => {
  try {
    const {
      student_id,
      academic_year,
      total_fee,
      discount,
    } = req.body;

    if (!student_id || !academic_year || !total_fee) {
      return res.status(400).json({
        message: "جميع الحقول المطلوبة يجب إدخالها",
      });
    }

    const exists = await db.query(
      `
      SELECT id
      FROM student_fees
      WHERE student_id = $1
      AND academic_year = $2
      `,
      [student_id, academic_year]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        message:
          "تم تسجيل قسط لهذا الطالب في هذه السنة الدراسية مسبقًا",
      });
    }

    const result = await db.query(
      `
      INSERT INTO student_fees
      (
        student_id,
        academic_year,
        total_fee,
        discount
      )
      VALUES
      ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        student_id,
        academic_year,
        total_fee,
        discount || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء إضافة القسط",
    });
  }
};
// جميع دفعات قسط معين
exports.getPayments = async (req, res) => {
  try {
    const { feeId } = req.params;

    const result = await db.query(
      `
      SELECT *
      FROM payments
      WHERE student_fee_id = $1
      ORDER BY payment_date DESC, id DESC
      `,
      [feeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الدفعات",
    });
  }
};

// إضافة دفعة
exports.addPayment = async (req, res) => {
  try {
    const { feeId } = req.params;

    const {
      amount,
      payment_method,
      receipt_number,
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "مبلغ الدفعة غير صحيح",
      });
    }

    const result = await db.query(
      `
      INSERT INTO payments
      (
        student_fee_id,
        amount,
        payment_method,
        receipt_number,
        notes
      )
      VALUES
      ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        feeId,
        amount,
        payment_method || "Cash",
        receipt_number || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدفعة",
    });
  }
};