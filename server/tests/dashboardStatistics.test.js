const assert = require("node:assert/strict");

const pool = require("../db");
const {
  getSchoolDateContext,
  loadDashboardStatistics,
} = require("../controllers/dashboardStatisticsController");

const FIXED_NOW = new Date("2026-08-05T08:00:00.000Z");

const assertNonNegativeNumbers = (value, path = "statistics") => {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    assert.ok(value >= 0, `${path} must not be negative`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNonNegativeNumbers(item, `${path}[${index}]`)
    );
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      assertNonNegativeNumbers(item, `${path}.${key}`)
    );
  }
};

const run = async () => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const baghdadBoundary = getSchoolDateContext(
      new Date("2026-08-04T21:30:00.000Z")
    );
    assert.equal(baghdadBoundary.schoolDate, "2026-08-05");

    const baseline = await loadDashboardStatistics(client, FIXED_NOW);
    assert.equal(baseline.timeZone, "Asia/Baghdad");
    assert.equal(baseline.schoolDate, "2026-08-05");
    assert.equal(baseline.studentAttendance.absentWithExcuse, null);
    assert.ok(baseline.studentAttendance.limitations.length > 0);
    assertNonNegativeNumbers(baseline);

    const noAttendanceDay = await loadDashboardStatistics(
      client,
      new Date("2035-01-15T08:00:00.000Z")
    );
    assert.equal(noAttendanceDay.studentAttendance.recordedStudents, 0);
    assert.equal(noAttendanceDay.studentAttendance.present, 0);
    assert.equal(noAttendanceDay.studentAttendance.attendanceRate, 0);
    assert.equal(
      noAttendanceDay.employeeAttendance.absent,
      noAttendanceDay.employeeAttendance.totalEmployees
    );

    await client.query("BEGIN");
    transactionStarted = true;

    const activeYearResult = await client.query(`
      SELECT id, name
      FROM academic_years
      WHERE is_active = TRUE AND is_closed = FALSE
      ORDER BY id DESC
      LIMIT 1
    `);
    const gradeResult = await client.query(`
      SELECT id, name
      FROM grades
      WHERE is_active = TRUE
      ORDER BY sort_order, id
      LIMIT 1
    `);

    assert.ok(activeYearResult.rows[0], "An active academic year is required");
    assert.ok(gradeResult.rows[0], "An active grade is required");

    const activeYear = activeYearResult.rows[0];
    const grade = gradeResult.rows[0];
    const uniqueSuffix = `${Date.now()}-${Math.random()}`;

    const employeeIds = [];
    for (const [index, label] of [
      "inside",
      "checked-out",
      "without-record",
    ].entries()) {
      const result = await client.query(
        `INSERT INTO employees (employee_code, full_name, employee_type)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [
          `DASH-${Date.now().toString(36)}-${index}`,
          `اختبار لوحة التحكم ${label}`,
          "اختبار",
        ]
      );
      employeeIds.push(result.rows[0].id);
    }

    await client.query(
      `INSERT INTO employee_attendance (
         employee_id, attendance_date, status,
         check_in_time, check_out_time, late_minutes
       ) VALUES
         ($1, $3, 'late', '08:15', NULL, 15),
         ($2, $3, 'present', '07:45', '14:10', 0)`,
      [employeeIds[0], employeeIds[1], baseline.schoolDate]
    );

    const afterEmployeeAttendance = await loadDashboardStatistics(
      client,
      FIXED_NOW
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.totalEmployees,
      baseline.employeeAttendance.totalEmployees + 3
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.late,
      baseline.employeeAttendance.late + 1
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.currentlyInside,
      baseline.employeeAttendance.currentlyInside + 1
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.checkedOut,
      baseline.employeeAttendance.checkedOut + 1
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.absent,
      baseline.employeeAttendance.absent + 1
    );
    assert.equal(
      afterEmployeeAttendance.employeeAttendance.totalLateMinutes,
      baseline.employeeAttendance.totalLateMinutes + 15
    );

    await client.query(
      `UPDATE employee_attendance
       SET check_out_time = '14:30'
       WHERE employee_id = $1 AND attendance_date = $2`,
      [employeeIds[0], baseline.schoolDate]
    );

    const afterEmployeeCheckout = await loadDashboardStatistics(
      client,
      FIXED_NOW
    );
    assert.equal(
      afterEmployeeCheckout.employeeAttendance.currentlyInside,
      baseline.employeeAttendance.currentlyInside
    );
    assert.equal(
      afterEmployeeCheckout.employeeAttendance.checkedOut,
      baseline.employeeAttendance.checkedOut + 2
    );

    const studentIds = [];
    const enrollmentIds = [];
    for (let index = 0; index < 5; index += 1) {
      const studentResult = await client.query(
        `INSERT INTO students (full_name, gender, grade)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [`طالب اختبار لوحة التحكم ${index} ${uniqueSuffix}`, "طالب", grade.name]
      );
      const studentId = studentResult.rows[0].id;
      studentIds.push(studentId);

      const enrollmentResult = await client.query(
        `INSERT INTO student_enrollments (
           student_id, academic_year_id, grade_id,
           enrollment_status, enrollment_date
         ) VALUES ($1, $2, $3, 'active', $4)
         RETURNING id`,
        [studentId, activeYear.id, grade.id, baseline.schoolDate]
      );
      enrollmentIds.push(enrollmentResult.rows[0].id);
    }

    const attendanceStatuses = ["present", "absent", "excused", "late"];
    for (let index = 0; index < attendanceStatuses.length; index += 1) {
      await client.query(
        `INSERT INTO student_attendance (
           student_enrollment_id, attendance_date, status
         ) VALUES ($1, $2, $3)`,
        [enrollmentIds[index], baseline.schoolDate, attendanceStatuses[index]]
      );
    }

    const afterStudentAttendance = await loadDashboardStatistics(
      client,
      FIXED_NOW
    );
    assert.equal(
      afterStudentAttendance.studentAttendance.totalActiveStudents,
      baseline.studentAttendance.totalActiveStudents + 5
    );
    assert.equal(
      afterStudentAttendance.studentAttendance.present,
      baseline.studentAttendance.present + 2
    );
    assert.equal(
      afterStudentAttendance.studentAttendance.absentWithoutExcuse,
      baseline.studentAttendance.absentWithoutExcuse + 1
    );
    assert.equal(
      afterStudentAttendance.studentAttendance.onLeave,
      baseline.studentAttendance.onLeave + 1
    );
    assert.equal(
      afterStudentAttendance.studentAttendance.recordedStudents,
      baseline.studentAttendance.recordedStudents + 4
    );

    const firstFeeResult = await client.query(
      `INSERT INTO student_fees (
         student_id, academic_year, total_fee, discount
       ) VALUES ($1, $2, 1000, 0)
       RETURNING id`,
      [studentIds[0], activeYear.name]
    );
    const secondFeeResult = await client.query(
      `INSERT INTO student_fees (
         student_id, academic_year, total_fee, discount
       ) VALUES ($1, $2, 1000, 0)
       RETURNING id`,
      [studentIds[1], activeYear.name]
    );

    const firstFeeId = firstFeeResult.rows[0].id;
    const secondFeeId = secondFeeResult.rows[0].id;

    await client.query(
      `INSERT INTO payments (student_fee_id, amount, payment_date)
       VALUES
         ($1, 400, $3),
         ($1, 600, $3),
         ($2, 250, $3)`,
      [firstFeeId, secondFeeId, baseline.schoolDate]
    );

    const afterMultiplePayments = await loadDashboardStatistics(
      client,
      FIXED_NOW
    );
    assert.equal(
      afterMultiplePayments.finance.totalRequired,
      baseline.finance.totalRequired + 2000
    );
    assert.equal(
      afterMultiplePayments.finance.totalPaid,
      baseline.finance.totalPaid + 1250
    );
    assert.equal(
      afterMultiplePayments.finance.totalRemaining,
      baseline.finance.totalRemaining + 750
    );
    assert.equal(
      afterMultiplePayments.finance.fullyPaidStudents,
      baseline.finance.fullyPaidStudents + 1
    );
    assert.equal(
      afterMultiplePayments.finance.studentsWithBalance,
      baseline.finance.studentsWithBalance + 1
    );
    assert.equal(
      afterMultiplePayments.finance.paymentsTodayCount,
      baseline.finance.paymentsTodayCount + 3
    );
    assert.equal(
      afterMultiplePayments.finance.paymentsTodayAmount,
      baseline.finance.paymentsTodayAmount + 1250
    );

    await client.query(
      `INSERT INTO payments (student_fee_id, amount, payment_date)
       VALUES ($1, 750, $2)`,
      [secondFeeId, baseline.schoolDate]
    );

    const afterCompletingBalance = await loadDashboardStatistics(
      client,
      FIXED_NOW
    );
    assert.equal(
      afterCompletingBalance.finance.totalPaid,
      baseline.finance.totalPaid + 2000
    );
    assert.equal(
      afterCompletingBalance.finance.totalRemaining,
      baseline.finance.totalRemaining
    );
    assert.equal(
      afterCompletingBalance.finance.fullyPaidStudents,
      baseline.finance.fullyPaidStudents + 2
    );
    assert.equal(
      afterCompletingBalance.finance.studentsWithBalance,
      baseline.finance.studentsWithBalance
    );

    await client.query(
      `UPDATE academic_years
       SET name = $1
       WHERE id = $2`,
      [`NOF-${Date.now().toString(36)}`, activeYear.id]
    );
    const withoutFees = await loadDashboardStatistics(client, FIXED_NOW);
    assert.equal(withoutFees.finance.totalRequired, 0);
    assert.equal(withoutFees.finance.totalPaid, 0);
    assert.equal(withoutFees.finance.totalRemaining, 0);
    assert.equal(withoutFees.finance.collectionRate, 0);
    assert.equal(withoutFees.finance.paymentsTodayCount, 0);
    assertNonNegativeNumbers(withoutFees);

    await client.query("ROLLBACK");
    transactionStarted = false;

    const afterRollback = await loadDashboardStatistics(client, FIXED_NOW);
    assert.deepEqual(afterRollback.students, baseline.students);
    assert.deepEqual(afterRollback.employees, baseline.employees);
    assert.deepEqual(afterRollback.finance, baseline.finance);
    assert.deepEqual(
      afterRollback.employeeAttendance,
      baseline.employeeAttendance
    );

    console.log("Dashboard statistics integration tests passed");
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
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
