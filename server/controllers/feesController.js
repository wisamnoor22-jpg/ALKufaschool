const db = require("../db");

const ensurePaymentEmployeeColumns = async () => {
  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS responsible_employee_id INTEGER
  `);

  await db.query(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS responsible_employee_name VARCHAR(255)
  `);
};

const createMissingStudentFees = async () => {
  await db.query(`
    INSERT INTO student_fees
    (
      student_id,
      academic_year,
      total_fee,
      discount
    )
    SELECT
      s.id,
      ay.name,
      gf.total_fee,
      0
    FROM students s
    JOIN academic_years ay
      ON ay.is_active = TRUE
     AND ay.is_closed = FALSE
    JOIN grade_fees gf
      ON TRIM(gf.academic_year) = TRIM(ay.name)
     AND LOWER(
           TRIM(
             REPLACE(gf.grade, 'الصف ', '')
           )
         ) =
         LOWER(
           TRIM(
             REPLACE(
               COALESCE(s.grade, ''),
               'الصف ',
               ''
             )
           )
         )
    WHERE NOT EXISTS (
      SELECT 1
      FROM student_fees sf
      WHERE sf.student_id = s.id
        AND TRIM(sf.academic_year) = TRIM(ay.name)
    )
    ON CONFLICT DO NOTHING
  `);
};

// جميع الرسوم
exports.getFees = async (req, res) => {
  try {
    await createMissingStudentFees();

    const result = await db.query(`
      SELECT
        sf.*,
        s.full_name,
        s.grade,
        s.section,
        COALESCE(gf.total_fee, sf.total_fee) AS total_fee,
        COALESCE(SUM(p.amount), 0) AS paid
      FROM student_fees sf
      JOIN students s
        ON s.id = sf.student_id
      LEFT JOIN grade_fees gf
        ON LOWER(
             TRIM(
               REPLACE(gf.grade, 'الصف ', '')
             )
           ) =
           LOWER(
             TRIM(
               REPLACE(
                 COALESCE(s.grade, ''),
                 'الصف ',
                 ''
               )
             )
           )
       AND TRIM(gf.academic_year) =
           TRIM(sf.academic_year)
      LEFT JOIN payments p
        ON p.student_fee_id = sf.id
      GROUP BY
        sf.id,
        s.full_name,
        s.grade,
        s.section,
        gf.total_fee
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
        message:
          "جميع الحقول المطلوبة يجب إدخالها",
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

    const currentGradeFee = await db.query(
      `
      SELECT gf.total_fee
      FROM students s
      LEFT JOIN grade_fees gf
        ON LOWER(TRIM(gf.grade)) =
           LOWER(TRIM(COALESCE(s.grade, '')))
       AND TRIM(gf.academic_year) = TRIM($2)
      WHERE s.id = $1
      LIMIT 1
      `,
      [student_id, academic_year]
    );

    const effectiveTotalFee =
      currentGradeFee.rows[0]?.total_fee ??
      Number(total_fee);

    const result = await db.query(
      `
      INSERT INTO student_fees
      (
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
        effectiveTotalFee,
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
    await ensurePaymentEmployeeColumns();

    const { feeId } = req.params;

    const result = await db.query(
      `
      SELECT
        p.*,
        COALESCE(
          p.responsible_employee_name,
          e.full_name
        ) AS responsible_employee_name
      FROM payments p
      LEFT JOIN employees e
        ON e.id = p.responsible_employee_id
      WHERE p.student_fee_id = $1
      ORDER BY p.payment_date DESC, p.id DESC
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
    await ensurePaymentEmployeeColumns();

    const { feeId } = req.params;

    const {
      amount,
      payment_method,
      receipt_number,
      responsible_employee_id,
      responsible_employee_name,
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "مبلغ الدفعة غير صحيح",
      });
    }

    if (!responsible_employee_id) {
      return res.status(400).json({
        message: "الموظف المسؤول مطلوب",
      });
    }

    const employeeResult = await db.query(
      `
      SELECT id, full_name
      FROM employees
      WHERE id = $1
      `,
      [responsible_employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        message: "الموظف المحدد غير موجود",
      });
    }

    const feeResult = await db.query(
      `
      SELECT
        sf.id,
        sf.discount,
        COALESCE(gf.total_fee, sf.total_fee) AS total_fee,
        COALESCE(SUM(p.amount), 0) AS paid
      FROM student_fees sf
      JOIN students s
        ON s.id = sf.student_id
      LEFT JOIN grade_fees gf
        ON LOWER(
             TRIM(
               REPLACE(gf.grade, 'الصف ', '')
             )
           ) =
           LOWER(
             TRIM(
               REPLACE(
                 COALESCE(s.grade, ''),
                 'الصف ',
                 ''
               )
             )
           )
       AND TRIM(gf.academic_year) =
           TRIM(sf.academic_year)
      LEFT JOIN payments p
        ON p.student_fee_id = sf.id
      WHERE sf.id = $1
      GROUP BY
        sf.id,
        sf.discount,
        sf.total_fee,
        gf.total_fee
      `,
      [feeId]
    );

    if (feeResult.rows.length === 0) {
      return res.status(404).json({
        message: "قسط الطالب غير موجود",
      });
    }

    const fee = feeResult.rows[0];
    const remaining = Math.max(
      Number(fee.total_fee || 0) -
        Number(fee.discount || 0) -
        Number(fee.paid || 0),
      0
    );

    if (Number(amount) > remaining) {
      return res.status(400).json({
        message:
          "مبلغ الدفعة أكبر من المبلغ المتبقي",
      });
    }

    const employeeName =
      employeeResult.rows[0].full_name ||
      responsible_employee_name ||
      null;

    const result = await db.query(
      `
      INSERT INTO payments
      (
        student_fee_id,
        amount,
        payment_method,
        receipt_number,
        responsible_employee_id,
        responsible_employee_name,
        notes
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        feeId,
        Number(amount),
        payment_method || "نقدًا",
        receipt_number || null,
        responsible_employee_id,
        employeeName,
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