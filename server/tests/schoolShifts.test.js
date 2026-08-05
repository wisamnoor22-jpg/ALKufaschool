const assert = require("node:assert/strict");

const pool = require("../db");
const {
  validateStudentShift,
} = require("../controllers/studentsController");

const API_URL = process.env.API_URL || "http://localhost:5000";

const requestJson = async (pathname, options = {}) => {
  const response = await fetch(`${API_URL}${pathname}`, options);
  const data = await response.json();
  return { response, data };
};

const run = async () => {
  const createdStudentIds = new Set();
  const archiveIds = new Set();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  assert.equal(validateStudentShift("طالب", "صباحي").error, undefined);
  assert.equal(validateStudentShift("طالب", "ظهري").error, undefined);
  assert.equal(validateStudentShift("طالبة", "صباحي").error, undefined);
  assert.match(validateStudentShift("طالبة", "ظهري").error, /الذكور/);
  assert.match(validateStudentShift("طالب", "").error, /وقت الدوام/);

  try {
    const existingStudents = await requestJson("/students");
    assert.equal(existingStudents.response.status, 200);
    assert.ok(existingStudents.data.length > 0, "يلزم صف دراسي موجود للاختبار");

    const grade = existingStudents.data[0].grade;
    const section = existingStudents.data[0].section || "أ";
    const createStudent = async (gender, schoolShift, label) => {
      const result = await requestJson("/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `اختبار الدوام ${label} ${suffix}`,
          gender,
          school_shift: schoolShift,
          grade,
          section,
          birth_date: "2015-01-01",
          phone: "07700000000",
          address: "الكوفة",
        }),
      });
      assert.equal(result.response.status, 201, JSON.stringify(result.data));
      createdStudentIds.add(result.data.student.id);
      assert.equal(result.data.student.school_shift, schoolShift);
      return result.data.student;
    };

    const morningMale = await createStudent("طالب", "صباحي", "ذكر صباحي");
    const afternoonMale = await createStudent("طالب", "ظهري", "ذكر ظهري");
    const morningFemale = await createStudent("طالبة", "صباحي", "طالبة صباحي");

    const invalidFemale = await requestJson("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: `اختبار مرفوض ${suffix}`,
        gender: "طالبة",
        school_shift: "ظهري",
        grade,
        section,
      }),
    });
    assert.equal(invalidFemale.response.status, 400);

    const invalidUpdate = await requestJson(`/students/${morningFemale.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...morningFemale, school_shift: "ظهري" }),
    });
    assert.equal(invalidUpdate.response.status, 400);

    const profile = await requestJson(`/students/${afternoonMale.id}`);
    assert.equal(profile.response.status, 200);
    assert.equal(profile.data.school_shift, "ظهري");

    const enrollmentRows = await pool.query(
      `SELECT student_id, id, school_shift
       FROM student_enrollments
       WHERE student_id = ANY($1::int[])`,
      [[morningMale.id, afternoonMale.id, morningFemale.id]]
    );
    assert.equal(enrollmentRows.rows.length, 3);
    assert.ok(
      enrollmentRows.rows.every((row) =>
        Number(row.student_id) === Number(afternoonMale.id)
          ? row.school_shift === "ظهري"
          : row.school_shift === "صباحي"
      )
    );

    const schoolDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const enrollmentByStudent = new Map(
      enrollmentRows.rows.map((row) => [Number(row.student_id), row.id])
    );
    await pool.query(
      `INSERT INTO student_attendance
         (student_enrollment_id, attendance_date, status, notes)
       VALUES ($1, $4, 'present', 'shift-test'),
              ($2, $4, 'absent', 'shift-test'),
              ($3, $4, 'excused', 'shift-test')`,
      [
        enrollmentByStudent.get(Number(morningMale.id)),
        enrollmentByStudent.get(Number(afternoonMale.id)),
        enrollmentByStudent.get(Number(morningFemale.id)),
        schoolDate,
      ]
    );

    const morningReport = await requestJson(
      `/student-attendance/report?from=${schoolDate}&to=${schoolDate}&school_shift=${encodeURIComponent("صباحي")}`
    );
    assert.equal(morningReport.response.status, 200, JSON.stringify(morningReport.data));
    assert.ok(morningReport.data.records.every((row) => row.school_shift === "صباحي"));

    const afternoonReport = await requestJson(
      `/student-attendance/report?from=${schoolDate}&to=${schoolDate}&school_shift=${encodeURIComponent("ظهري")}`
    );
    assert.equal(afternoonReport.response.status, 200, JSON.stringify(afternoonReport.data));
    assert.ok(afternoonReport.data.records.every((row) => row.school_shift === "ظهري"));
    assert.ok(
      afternoonReport.data.records.some(
        (row) => Number(row.student_id) === Number(afternoonMale.id)
      )
    );

    const dashboard = await requestJson("/dashboard/statistics");
    assert.equal(dashboard.response.status, 200, JSON.stringify(dashboard.data));
    assert.deepEqual(dashboard.data.sectionErrors, {});
    assert.ok(dashboard.data.students.morningMale >= 1);
    assert.ok(dashboard.data.students.morningFemale >= 1);
    assert.ok(dashboard.data.students.afternoonMale >= 1);
    const afternoonStats = dashboard.data.studentAttendance.byShift.find(
      (row) => row.schoolShift === "ظهري"
    );
    assert.ok(afternoonStats);
    assert.equal(Number(afternoonStats.absentWithoutExcuse), 1);

    await assert.rejects(
      pool.query(
        `INSERT INTO students (full_name, gender, grade, school_shift)
         VALUES ($1, 'طالبة', $2, 'ظهري')`,
        [`اختبار قيد قاعدة البيانات ${suffix}`, grade]
      ),
      /students_afternoon_male_only_check/
    );

    const deletion = await requestJson(`/students/${afternoonMale.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason_code: "transferred", reason_details: "" }),
    });
    assert.equal(deletion.response.status, 200, JSON.stringify(deletion.data));
    createdStudentIds.delete(afternoonMale.id);
    archiveIds.add(deletion.data.deletion_reason.archive_id);

    const archive = await pool.query(
      `SELECT snapshot_data FROM deletion_archive WHERE id = $1`,
      [deletion.data.deletion_reason.archive_id]
    );
    assert.equal(archive.rows[0].snapshot_data.student.school_shift, "ظهري");
    assert.equal(
      archive.rows[0].snapshot_data.student_enrollments[0].school_shift,
      "ظهري"
    );

    const invalidRows = await pool.query(
      `SELECT COUNT(*)::integer AS count
       FROM students
       WHERE school_shift = 'ظهري'
         AND LOWER(TRIM(gender)) IN ('طالبة', 'أنثى', 'female')`
    );
    assert.equal(invalidRows.rows[0].count, 0);

    console.log("Student shift validation, API, attendance, dashboard and archive tests passed");
  } finally {
    const ids = [...createdStudentIds];
    if (ids.length > 0) {
      await pool.query(
        `DELETE FROM student_attendance
         WHERE student_enrollment_id IN (
           SELECT id FROM student_enrollments WHERE student_id = ANY($1::int[])
         )`,
        [ids]
      );
      await pool.query("DELETE FROM student_enrollments WHERE student_id = ANY($1::int[])", [ids]);
      await pool.query("DELETE FROM students WHERE id = ANY($1::int[])", [ids]);
    }

    const archives = [...archiveIds];
    if (archives.length > 0) {
      await pool.query("DELETE FROM deletion_archive WHERE id = ANY($1::int[])", [archives]);
    }
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
