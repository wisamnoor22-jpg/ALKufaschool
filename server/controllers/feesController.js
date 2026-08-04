const db = require("../db");

const ensurePaymentEmployeeColumns = async () => {
  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS accountant_employee_id INTEGER
  `);

  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS accountant_name VARCHAR(150)
  `);

  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS assistant_employee_id INTEGER
  `);

  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS assistant_name VARCHAR(150)
  `);
};

const getEmployeeById = async (employeeId) => {
  if (!employeeId) return null;

  const result = await db.query(
    `
      SELECT
        id,
        full_name,
        employee_type
      FROM employees
      WHERE id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  return result.rows[0] || null;
};

// جميع الرسوم
exports.getFees = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        sf.*,
        s.full_name,
        s.grade,
        s.section,
        COALESCE(SUM(p.amount), 0) AS paid
      FROM student_fees sf
      JOIN students s
        ON s.id = sf.student_id
      LEFT JOIN payments p
        ON p.student_fee_id = sf.id
      GROUP BY
        sf.id,
        s.full_name,
        s.grade,
        s.section
      ORDER BY sf.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Get fees error:", error);

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
        INSERT INTO student_fees (
          student_id,
          academic_year,
          total_fee,
          discount
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        student_id,
        academic_year,
        Number(total_fee),
        Number(discount || 0),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Add fee error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء إضافة القسط",
    });
  }
};

// جميع دفعات قسط معين
exports.getPayments = async (req, res) => {
  try {
    await ensurePaymentEmployeeColumns();

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
    console.error("Get payments error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الدفعات",
    });
  }
};

// إضافة دفعة
exports.addPayment = async (req, res) => {
  try {
    await ensurePaymentEmployeeColumns();

    const { feeId } = req.params;

    const {
      amount,
      payment_method,
      receipt_number,
      accountant_employee_id,
      assistant_employee_id,
      notes,
    } = req.body;

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        message: "مبلغ الدفعة غير صحيح",
      });
    }

    const accountant = await getEmployeeById(
      Number(accountant_employee_id)
    );

    if (!accountant) {
      return res.status(400).json({
        message: "المحاسب المحدد غير موجود",
      });
    }

    let assistant = null;

    if (assistant_employee_id) {
      assistant = await getEmployeeById(
        Number(assistant_employee_id)
      );

      if (!assistant) {
        return res.status(400).json({
          message: "الموظف المساعد المحدد غير موجود",
        });
      }

      if (
        Number(assistant.id) ===
        Number(accountant.id)
      ) {
        return res.status(400).json({
          message:
            "لا يمكن اختيار المحاسب نفسه كموظف مساعد",
        });
      }
    }

    const feeResult = await db.query(
      `
        SELECT
          sf.id,
          sf.total_fee,
          sf.discount,
          COALESCE(SUM(p.amount), 0) AS paid
        FROM student_fees sf
        LEFT JOIN payments p
          ON p.student_fee_id = sf.id
        WHERE sf.id = $1
        GROUP BY sf.id
      `,
      [feeId]
    );

    if (feeResult.rows.length === 0) {
      return res.status(404).json({
        message: "حساب القسط غير موجود",
      });
    }

    const fee = feeResult.rows[0];

    const remaining = Math.max(
      Number(fee.total_fee || 0) -
        Number(fee.discount || 0) -
        Number(fee.paid || 0),
      0
    );

    if (paymentAmount > remaining) {
      return res.status(400).json({
        message:
          "مبلغ الدفعة أكبر من المبلغ المتبقي",
      });
    }

    const result = await db.query(
      `
        INSERT INTO payments (
          student_fee_id,
          amount,
          payment_method,
          receipt_number,
          accountant_employee_id,
          accountant_name,
          assistant_employee_id,
          assistant_name,
          notes
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )
        RETURNING *
      `,
      [
        feeId,
        paymentAmount,
        payment_method || "نقدًا",
        receipt_number || null,
        accountant.id,
        accountant.full_name,
        assistant?.id || null,
        assistant?.full_name || null,
        notes || null,
      ]
    );

    res.status(201).json({
      message: "تم تسجيل الدفعة بنجاح",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Add payment error:", error);

    res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدفعة",
    });
  }
};