const pool = require("../db");

const ALLOWED_STATUSES = new Set([
  "present",
  "absent",
  "excused",
]);

let attendanceTablePromise = null;

const ensureAttendanceTable = () => {
  if (!attendanceTablePromise) {
    attendanceTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS employee_attendance (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER NOT NULL
            REFERENCES employees(id)
            ON DELETE CASCADE,
          attendance_date DATE NOT NULL,
          status VARCHAR(20) NOT NULL
            CHECK (status IN ('present', 'absent', 'excused')),
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (employee_id, attendance_date)
        );

        CREATE INDEX IF NOT EXISTS idx_employee_attendance_date
          ON employee_attendance(attendance_date);

        CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee
          ON employee_attendance(employee_id);
      `)
      .catch((error) => {
        attendanceTablePromise = null;
        throw error;
      });
  }

  return attendanceTablePromise;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const getAttendanceByDate = async (req, res) => {
  try {
    await ensureAttendanceTable();

    const attendanceDate = req.query.date;

    if (!isValidDate(attendanceDate)) {
      return res.status(400).json({
        message: "يرجى تحديد تاريخ صحيح بصيغة YYYY-MM-DD",
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         employee_id,
         attendance_date::text AS attendance_date,
         status,
         notes,
         created_at,
         updated_at
       FROM employee_attendance
       WHERE attendance_date = $1
       ORDER BY employee_id`,
      [attendanceDate]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ في جلب حضور الموظفين",
    });
  }
};

const saveBulkAttendance = async (req, res) => {
  await ensureAttendanceTable();
  const client = await pool.connect();

  try {
    const { attendance_date, records } = req.body;

    if (!isValidDate(attendance_date)) {
      return res.status(400).json({
        message: "يرجى تحديد تاريخ صحيح",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        message: "لا توجد سجلات حضور للحفظ",
      });
    }

    const normalized = new Map();

    for (const record of records) {
      const employeeId = Number(record.employee_id);
      const status = String(record.status || "").trim();
      const notes =
        typeof record.notes === "string"
          ? record.notes.trim()
          : "";

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          message: "رقم أحد الموظفين غير صحيح",
        });
      }

      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          message: "إحدى حالات الحضور غير صحيحة",
        });
      }

      normalized.set(employeeId, {
        employee_id: employeeId,
        status,
        notes: notes || null,
      });
    }

    const rows = Array.from(normalized.values());
    const employeeIds = rows.map((row) => row.employee_id);

    await client.query("BEGIN");

    const employeesResult = await client.query(
      `SELECT id FROM employees WHERE id = ANY($1::int[])`,
      [employeeIds]
    );

    if (employeesResult.rows.length !== employeeIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "يوجد موظف غير مسجل في النظام",
      });
    }

    for (const row of rows) {
      await client.query(
        `INSERT INTO employee_attendance (
           employee_id,
           attendance_date,
           status,
           notes
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           updated_at = NOW()`,
        [
          row.employee_id,
          attendance_date,
          row.status,
          row.notes,
        ]
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "تم حفظ حضور الموظفين بنجاح",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ في حفظ حضور الموظفين",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAttendanceByDate,
  saveBulkAttendance,
};