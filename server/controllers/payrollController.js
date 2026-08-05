const pool = require("../db");

const SCHOOL_TIME_ZONE = "Asia/Baghdad";
const TEACHER_TYPE = "معلمة";
const ADMINISTRATIVE_TYPES = new Set([
  "المدير",
  "المعاون",
  "مسؤول الحسابات",
  "موظف الاستعلامات",
]);
const ALLOWED_EMPLOYEE_TYPES = new Set([
  TEACHER_TYPE,
  ...ADMINISTRATIVE_TYPES,
]);
const ALLOWED_STAFF_TYPES = new Set(["all", "teachers", "administrative"]);
const ALLOWED_WORK_SHIFTS = new Set([
  "صباحي",
  "ظهري",
  "صباحي وظهري",
]);

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const getCurrentSchoolMonth = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: SCHOOL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
  };
};

const getMonthRange = (year, month) => {
  const nextMonth = new Date(Date.UTC(year, month, 1));

  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: [
      nextMonth.getUTCFullYear(),
      String(nextMonth.getUTCMonth() + 1).padStart(2, "0"),
      "01",
    ].join("-"),
  };
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const validatePayrollQuery = (query = {}, now = new Date()) => {
  const current = getCurrentSchoolMonth(now);
  const year = query.year === undefined ? current.year : Number(query.year);
  const month = query.month === undefined ? current.month : Number(query.month);
  const staffType = normalizeText(query.staff_type) || "all";
  const employeeType = normalizeText(query.employee_type) || "all";
  const workShift = normalizeText(query.work_shift) || "all";
  const employeeId =
    query.employee_id === undefined || query.employee_id === ""
      ? null
      : Number(query.employee_id);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "السنة المحددة غير صحيحة" };
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "الشهر المحدد غير صحيح" };
  }

  if (!ALLOWED_STAFF_TYPES.has(staffType)) {
    return { error: "نوع الكادر المحدد غير صحيح" };
  }

  if (employeeType !== "all" && !ALLOWED_EMPLOYEE_TYPES.has(employeeType)) {
    return { error: "نوع الموظف المحدد غير صحيح" };
  }

  if (workShift !== "all" && !ALLOWED_WORK_SHIFTS.has(workShift)) {
    return { error: "الشفت المحدد غير صحيح" };
  }

  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    return { error: "رقم الموظف غير صحيح" };
  }

  return {
    value: {
      year,
      month,
      staffType,
      employeeType,
      workShift,
      employeeId,
    },
  };
};

const buildPayrollQuery = ({
  year,
  month,
  staffType,
  employeeType,
  workShift,
  employeeId,
}) => {
  const range = getMonthRange(year, month);
  const values = [range.from, range.to];
  const conditions = [];

  if (staffType === "teachers") {
    values.push(TEACHER_TYPE);
    conditions.push(`e.employee_type = $${values.length}`);
  } else if (staffType === "administrative") {
    values.push([...ADMINISTRATIVE_TYPES]);
    conditions.push(`e.employee_type = ANY($${values.length}::text[])`);
  } else {
    values.push([TEACHER_TYPE, ...ADMINISTRATIVE_TYPES]);
    conditions.push(`e.employee_type = ANY($${values.length}::text[])`);
  }

  if (employeeType !== "all") {
    values.push(employeeType);
    conditions.push(`e.employee_type = $${values.length}`);
  }

  if (workShift !== "all") {
    values.push(workShift);
    conditions.push(`e.work_shift = $${values.length}`);
  }

  if (employeeId !== null) {
    values.push(employeeId);
    conditions.push(`e.id = $${values.length}`);
  }

  return {
    range,
    values,
    sql: `
      SELECT
        e.id,
        e.employee_code,
        e.full_name,
        e.first_name,
        e.middle_name,
        e.third_name,
        e.employee_type,
        e.work_shift,
        e.specialization,
        COALESCE(e.salary, 0)::numeric AS base_salary,
        CASE
          WHEN e.employee_type = '${TEACHER_TYPE}'
          THEN ROUND(COALESCE(e.salary, 0)::numeric / 22, 2)
          ELSE NULL
        END AS daily_wage,
        COUNT(ea.id) FILTER (
          WHERE ea.status = 'present'
            AND (
              e.employee_type <> '${TEACHER_TYPE}'
              OR EXTRACT(ISODOW FROM ea.attendance_date) NOT IN (5, 6)
            )
        )::integer AS present_days,
        COUNT(ea.id) FILTER (
          WHERE ea.status = 'absent'
            AND (
              e.employee_type <> '${TEACHER_TYPE}'
              OR EXTRACT(ISODOW FROM ea.attendance_date) NOT IN (5, 6)
            )
        )::integer AS absent_days,
        COUNT(ea.id) FILTER (
          WHERE ea.status = 'late'
            AND (
              e.employee_type <> '${TEACHER_TYPE}'
              OR EXTRACT(ISODOW FROM ea.attendance_date) NOT IN (5, 6)
            )
        )::integer AS late_days,
        COALESCE(SUM(ea.late_minutes) FILTER (
          WHERE ea.status = 'late'
            AND (
              e.employee_type <> '${TEACHER_TYPE}'
              OR EXTRACT(ISODOW FROM ea.attendance_date) NOT IN (5, 6)
            )
        ), 0)::integer AS total_late_minutes
      FROM employees e
      LEFT JOIN employee_attendance ea
        ON ea.employee_id = e.id
       AND ea.attendance_date >= $1::date
       AND ea.attendance_date < $2::date
      WHERE ${conditions.join(" AND ")}
      GROUP BY e.id
      ORDER BY
        CASE WHEN e.employee_type = '${TEACHER_TYPE}' THEN 0 ELSE 1 END,
        e.full_name,
        e.id
    `,
  };
};

const loadPayroll = async (client, filters) => {
  const query = buildPayrollQuery(filters);
  const result = await client.query(query.sql, query.values);

  const employees = result.rows.map((row) => {
    const baseSalary = numberOrZero(row.base_salary);
    const dailyWage =
      row.employee_type === TEACHER_TYPE
        ? numberOrZero(row.daily_wage)
        : null;
    const absentDays = numberOrZero(row.absent_days);
    const absenceDeduction =
      row.employee_type === TEACHER_TYPE
        ? Math.min(baseSalary, Math.round(absentDays * dailyWage * 100) / 100)
        : 0;
    const lateDeduction = 0;
    const totalDeductions = absenceDeduction + lateDeduction;

    return {
      id: row.id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      firstName: row.first_name,
      middleName: row.middle_name,
      thirdName: row.third_name,
      employeeType: row.employee_type,
      workShift: row.work_shift,
      specialization: row.specialization,
      baseSalary,
      dailyWage,
      presentDays: numberOrZero(row.present_days),
      absentDays,
      lateDays: numberOrZero(row.late_days),
      totalLateMinutes: numberOrZero(row.total_late_minutes),
      absenceDeduction,
      lateDeduction,
      totalDeductions,
      netSalary: Math.max(0, baseSalary - totalDeductions),
      deductionPolicy:
        row.employee_type === TEACHER_TYPE
          ? "teacher_absence_daily_wage"
          : "administrative_policy_pending",
    };
  });

  const totals = employees.reduce(
    (summary, employee) => ({
      baseSalaries: summary.baseSalaries + employee.baseSalary,
      absenceDeductions:
        summary.absenceDeductions + employee.absenceDeduction,
      deductions: summary.deductions + employee.totalDeductions,
      netSalaries: summary.netSalaries + employee.netSalary,
    }),
    {
      baseSalaries: 0,
      absenceDeductions: 0,
      deductions: 0,
      netSalaries: 0,
    }
  );

  return {
    period: {
      year: filters.year,
      month: filters.month,
      from: query.range.from,
      toExclusive: query.range.to,
      timeZone: SCHOOL_TIME_ZONE,
    },
    filters: {
      staffType: filters.staffType,
      employeeType: filters.employeeType,
      workShift: filters.workShift,
      employeeId: filters.employeeId,
    },
    policy: {
      teacherWorkingDaysDivisor: 22,
      teacherWeekendDays: ["الجمعة", "السبت"],
      teacherAbsenceDeduction: true,
      lateDeductionEnabled: false,
      administrativeDeductionEnabled: false,
    },
    employees,
    totals: {
      baseSalaries: Math.round(totals.baseSalaries * 100) / 100,
      absenceDeductions:
        Math.round(totals.absenceDeductions * 100) / 100,
      deductions: Math.round(totals.deductions * 100) / 100,
      netSalaries: Math.round(totals.netSalaries * 100) / 100,
    },
  };
};

const getPayroll = async (req, res) => {
  const validation = validatePayrollQuery(req.query);

  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    const payroll = await loadPayroll(pool, validation.value);
    return res.json(payroll);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ في إعداد كشف الرواتب",
    });
  }
};

module.exports = {
  getPayroll,
  getCurrentSchoolMonth,
  getMonthRange,
  validatePayrollQuery,
  loadPayroll,
  TEACHER_TYPE,
  ADMINISTRATIVE_TYPES,
};
