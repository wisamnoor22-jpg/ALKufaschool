const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pool = require("../db");
const {
  ALLOWED_EMPLOYEE_TYPES,
  ALLOWED_WORK_SHIFTS,
  validateEmployeePayload,
} = require("../controllers/employeesController");

const API_URL = process.env.API_URL || "http://localhost:5000";
const migrationPath = path.join(
  __dirname,
  "..",
  "migrations",
  "002_expand_employee_profile.sql"
);

const basePayload = {
  first_name: "سارة",
  middle_name: "محمد",
  third_name: "حسن",
  employee_type: "معلمة",
  specialization: "الرياضيات",
  salary: 0,
  address: "الكوفة",
  phone: "0770 123 4567",
  work_shift: "صباحي",
  notes: "اختبار تكاملي",
};

const requestJson = async (pathname, options = {}) => {
  const response = await fetch(`${API_URL}${pathname}`, options);
  const data = await response.json();
  return { response, data };
};

const createEmployee = async (payload) => {
  const { response, data } = await requestJson("/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 201, JSON.stringify(data));
  return data.employee;
};

const runValidationTests = () => {
  const teacher = validateEmployeePayload(basePayload);
  assert.equal(teacher.error, undefined);
  assert.equal(teacher.value.full_name, "سارة محمد حسن");
  assert.equal(teacher.value.salary, 0);

  assert.match(
    validateEmployeePayload({ ...basePayload, specialization: "" }).error,
    /اختصاص/
  );

  for (const employeeType of ALLOWED_EMPLOYEE_TYPES) {
    const validation = validateEmployeePayload({
      ...basePayload,
      employee_type: employeeType,
      specialization: employeeType === "معلمة" ? "العلوم" : "قيمة قديمة",
    });
    assert.equal(validation.error, undefined);
    assert.equal(
      validation.value.specialization,
      employeeType === "معلمة" ? "العلوم" : null
    );
  }

  for (const workShift of ALLOWED_WORK_SHIFTS) {
    assert.equal(
      validateEmployeePayload({ ...basePayload, work_shift: workShift }).error,
      undefined
    );
  }

  assert.equal(validateEmployeePayload({ ...basePayload, salary: 750000 }).error, undefined);
  assert.match(validateEmployeePayload({ ...basePayload, salary: -1 }).error, /الراتب/);
  assert.match(validateEmployeePayload({ ...basePayload, salary: "abc" }).error, /الراتب/);
  assert.equal(
    validateEmployeePayload({ ...basePayload, phone: "٠٧٧٠/١٢٣.٤٥٦٧" }).error,
    undefined
  );
};

const run = async () => {
  const createdIds = new Set();
  const archiveIds = new Set();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  runValidationTests();

  try {
    const legacyInsert = await pool.query(
      `INSERT INTO employees (employee_code, full_name, employee_type)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`LEG-${Date.now().toString(36)}`, "موظف قديم محفوظ", "نوع قديم"]
    );
    const legacyId = legacyInsert.rows[0].id;
    createdIds.add(legacyId);

    await pool.query(fs.readFileSync(migrationPath, "utf8"));

    const legacyAfterMigration = await pool.query(
      `SELECT first_name, middle_name, third_name, full_name
       FROM employees
       WHERE id = $1`,
      [legacyId]
    );
    assert.deepEqual(legacyAfterMigration.rows[0], {
      first_name: "موظف",
      middle_name: "قديم",
      third_name: "محفوظ",
      full_name: "موظف قديم محفوظ",
    });

    const types = [
      ["معلمة", "اللغة العربية", "صباحي"],
      ["المدير", null, "ظهري"],
      ["المعاون", null, "صباحي وظهري"],
      ["مسؤول الحسابات", null, "صباحي"],
      ["موظف الاستعلامات", null, "ظهري"],
    ];
    const created = [];

    for (const [index, [employeeType, specialization, workShift]] of types.entries()) {
      const employee = await createEmployee({
        ...basePayload,
        first_name: `اختبار${index}`,
        middle_name: "موظف",
        third_name: suffix,
        employee_type: employeeType,
        specialization,
        work_shift: workShift,
        salary: index === 0 ? 0 : 500000 + index,
      });
      created.push(employee);
      createdIds.add(employee.id);
      assert.equal(employee.full_name, `اختبار${index} موظف ${suffix}`);
      assert.equal(employee.specialization, specialization);
    }

    const missingSpecialization = await requestJson("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...basePayload, specialization: "" }),
    });
    assert.equal(missingSpecialization.response.status, 400);

    for (const salary of [-1, "ليس رقمًا"]) {
      const invalidSalary = await requestJson("/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, salary }),
      });
      assert.equal(invalidSalary.response.status, 400);
    }

    const list = await requestJson("/employees");
    assert.equal(list.response.status, 200);
    assert.ok(list.data.some((employee) => employee.id === created[0].id));

    const profile = await requestJson(`/employees/${created[0].id}`);
    assert.equal(profile.response.status, 200);
    assert.equal(profile.data.first_name, "اختبار0");
    assert.equal(profile.data.work_shift, "صباحي");

    const updatePayload = {
      ...basePayload,
      first_name: "مدير",
      middle_name: "قديم",
      third_name: "معدل",
      employee_type: "المدير",
      specialization: "اختصاص يجب مسحه",
      work_shift: "صباحي وظهري",
      salary: 900000,
    };
    const update = await requestJson(`/employees/${legacyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });
    assert.equal(update.response.status, 200, JSON.stringify(update.data));
    assert.equal(update.data.employee.full_name, "مدير قديم معدل");
    assert.equal(update.data.employee.specialization, null);

    const attendanceDate = "2026-08-05";
    await pool.query(
      `INSERT INTO employee_attendance (
         employee_id, attendance_date, status,
         check_in_time, late_minutes
       ) VALUES ($1, $2, 'late', '08:10', 10)`,
      [created[0].id, attendanceDate]
    );

    const report = await requestJson(
      `/employee-attendance/report?from=${attendanceDate}&to=${attendanceDate}`
    );
    assert.equal(report.response.status, 200, JSON.stringify(report.data));
    const attendanceRecord = report.data.records.find(
      (record) => record.employee_id === created[0].id
    );
    assert.equal(attendanceRecord.full_name, created[0].full_name);

    const deletion = await requestJson(`/employees/${created[0].id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason_code: "retirement", reason_details: "" }),
    });
    assert.equal(deletion.response.status, 200, JSON.stringify(deletion.data));
    createdIds.delete(created[0].id);
    archiveIds.add(deletion.data.deletion_reason.archive_id);

    const archived = await pool.query(
      `SELECT snapshot_data
       FROM deletion_archive
       WHERE id = $1`,
      [deletion.data.deletion_reason.archive_id]
    );
    const archivedEmployee = archived.rows[0].snapshot_data.employee;
    for (const field of [
      "first_name",
      "middle_name",
      "third_name",
      "employee_type",
      "specialization",
      "salary",
      "address",
      "phone",
      "work_shift",
    ]) {
      assert.ok(Object.hasOwn(archivedEmployee, field), `${field} missing from archive`);
    }
    assert.equal(archived.rows[0].snapshot_data.employee_attendance.length, 1);

    console.log("Employee migration, validation, API, attendance and archive tests passed");
  } finally {
    const ids = [...createdIds];
    if (ids.length > 0) {
      await pool.query("DELETE FROM employee_attendance WHERE employee_id = ANY($1::int[])", [ids]);
      await pool.query("DELETE FROM employee_documents WHERE employee_id = ANY($1::int[])", [ids]);
      await pool.query("DELETE FROM employees WHERE id = ANY($1::int[])", [ids]);
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
