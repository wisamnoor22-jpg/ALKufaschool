const db = require("../db");

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const getMonthRange = (monthValue) => {
  const month = String(monthValue || "").trim();

  if (!MONTH_PATTERN.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    month,
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
};

exports.getPayrollData = async (req, res) => {
  const range = getMonthRange(req.query.month);

  if (!range) {
    return res.status(400).json({
      message: "شهر الرواتب غير صحيح. استخدم الصيغة YYYY-MM",
    });
  }

  try {
    const result = await db.query(
      `
        SELECT
          e.*,
          COALESCE(
            (
              SELECT COUNT(*)::INTEGER
              FROM employee_attendance ea
              WHERE ea.employee_id = e.id
                AND ea.status = 'absent'
                AND ea.attendance_date BETWEEN $1::date AND $2::date
            ),
            0
          ) AS absence_count
        FROM employees e
        ORDER BY e.id DESC
      `,
      [range.from, range.to]
    );

    return res.json({
      month: range.month,
      period: {
        from: range.from,
        to: range.to,
      },
      employees: result.rows,
    });
  } catch (error) {
    console.error("getPayrollData error:", error);
    return res.status(500).json({
      message: "تعذر جلب بيانات الرواتب والغياب",
    });
  }
};