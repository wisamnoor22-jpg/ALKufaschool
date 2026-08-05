const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pool = require("../db");
const {
  loadPayroll,
  validatePayrollQuery,
} = require("../controllers/payrollController");

const TEACHER_SALARY = 660000;
const migrationPath = path.join(
  __dirname,
  "..",
  "migrations",
  "004_employee_attendance_statuses.sql"
);

const insertEmployee = async (client, suffix, overrides = {}) => {
  const employee = {
    employeeCode: `PAY-${suffix}`,
    fullName: "اختبار راتب موظف",
    firstName: "اختبار",
    middleName: "راتب",
    thirdName: "موظف",
    employeeType: "معلمة",
    workShift: "صباحي",
    specialization: "الرياضيات",
    salary: TEACHER_SALARY,
    ...overrides,
  };

  const result = await client.query(
    `INSERT INTO employees (
       employee_code,
       full_name,
       first_name,
       middle_name,
       third_name,
       employee_type,
       work_shift,
       specialization,
       salary
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      employee.employeeCode,
      employee.fullName,
      employee.firstName,
      employee.middleName,
      employee.thirdName,
      employee.employeeType,
      employee.workShift,
      employee.specialization,
      employee.salary,
    ]
  );

  return result.rows[0].id;
};

const insertAttendance = (client, employeeId, date, status, lateMinutes = 0) =>
  client.query(
    `INSERT INTO employee_attendance (
       employee_id,
       attendance_date,
       status,
       late_minutes
     )
     VALUES ($1, $2, $3, $4)`,
    [employeeId, date, status, lateMinutes]
  );

const loadAugustPayroll = (client, filters = {}) =>
  loadPayroll(client, {
    year: 2026,
    month: 8,
    staffType: "all",
    employeeType: "all",
    workShift: "all",
    employeeId: null,
    ...filters,
  });

const run = async () => {
  const legacyStatus = await pool.query(
    `SELECT COUNT(*)::integer AS count
     FROM employee_attendance
     WHERE status = 'excused'`
  );
  assert.equal(legacyStatus.rows[0].count, 0);
  await pool.query(fs.readFileSync(migrationPath, "utf8"));

  const valid = validatePayrollQuery({ year: "2026", month: "8" });
  assert.equal(valid.error, undefined);
  assert.match(validatePayrollQuery({ month: "13" }).error, /الشهر/);
  assert.match(
    validatePayrollQuery({ employee_type: "نوع غير معتمد" }).error,
    /نوع الموظف/
  );

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const suffix = Date.now().toString(36);
    const teacherId = await insertEmployee(client, `${suffix}-T`);
    const adminId = await insertEmployee(client, `${suffix}-A`, {
      employeeCode: `PAY-${suffix}-A`,
      fullName: "اختبار راتب مدير",
      thirdName: "مدير",
      employeeType: "المدير",
      workShift: "ظهري",
      specialization: null,
      salary: 900000,
    });

    await insertAttendance(client, teacherId, "2026-08-03", "present");
    await insertAttendance(client, teacherId, "2026-08-04", "absent");
    await insertAttendance(client, teacherId, "2026-08-05", "late", 25);
    await insertAttendance(client, teacherId, "2026-08-07", "absent");
    await insertAttendance(client, teacherId, "2026-08-08", "absent");
    await insertAttendance(client, adminId, "2026-08-04", "absent");
    await insertAttendance(client, adminId, "2026-08-05", "late", 10);

    const report = await loadAugustPayroll(client);
    const teacher = report.employees.find((item) => item.id === teacherId);
    const admin = report.employees.find((item) => item.id === adminId);

    assert.ok(teacher);
    assert.equal(teacher.dailyWage, 30000);
    assert.equal(teacher.presentDays, 1);
    assert.equal(teacher.absentDays, 1);
    assert.equal(teacher.lateDays, 1);
    assert.equal(teacher.totalLateMinutes, 25);
    assert.equal(teacher.absenceDeduction, 30000);
    assert.equal(teacher.lateDeduction, 0);
    assert.equal(teacher.netSalary, 630000);

    assert.ok(admin);
    assert.equal(admin.dailyWage, null);
    assert.equal(admin.absentDays, 1);
    assert.equal(admin.lateDays, 1);
    assert.equal(admin.totalDeductions, 0);
    assert.equal(admin.netSalary, 900000);

    await assert.rejects(
      insertAttendance(client, teacherId, "2026-08-03", "present"),
      /unique|duplicate/i
    );
    await client.query("ROLLBACK");
    transactionStarted = false;

    await client.query("BEGIN");
    transactionStarted = true;
    const updatedTeacherId = await insertEmployee(client, `${suffix}-U`, {
      employeeCode: `PAY-${suffix}-U`,
      salary: 880000,
    });
    const updatedReport = await loadAugustPayroll(client, {
      staffType: "teachers",
      workShift: "صباحي",
      employeeId: updatedTeacherId,
    });
    assert.equal(updatedReport.employees.length, 1);
    assert.equal(updatedReport.employees[0].dailyWage, 40000);
    assert.equal(updatedReport.employees[0].netSalary, 880000);
    assert.ok(
      Object.values(updatedReport.totals).every(
        (value) => Number.isFinite(value) && value >= 0
      )
    );

    await client.query("ROLLBACK");
    transactionStarted = false;
    console.log("Payroll integration tests passed");
  } catch (error) {
    if (transactionStarted) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
