const pool = require("../db");

const ALLOWED_STATUSES = new Set([
  "present",
  "absent",
  "excused",
  "late",
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
          status VARCHAR(20) NOT NULL,
          notes TEXT,
          check_in_time TIME,
          check_out_time TIME,
          late_minutes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (employee_id, attendance_date)
        );

        ALTER TABLE employee_attendance
          ADD COLUMN IF NOT EXISTS check_in_time TIME;

        ALTER TABLE employee_attendance
          ADD COLUMN IF NOT EXISTS check_out_time TIME;

        ALTER TABLE employee_attendance
          ADD COLUMN IF NOT EXISTS late_minutes INTEGER NOT NULL DEFAULT 0;

        ALTER TABLE employee_attendance
          DROP CONSTRAINT IF EXISTS employee_attendance_status_check;

        ALTER TABLE employee_attendance
          ADD CONSTRAINT employee_attendance_status_check
          CHECK (status IN ('present', 'absent', 'excused', 'late'));

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

const isValidTime = (value) =>
  value === null ||
  value === undefined ||
  value === "" ||
  /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

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
         TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
         TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time,
         late_minutes,
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

const getAttendanceReport = async (req, res) => {
  try {
    await ensureAttendanceTable();

    const { from, to, employee_type } = req.query;

    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({
        message:
          "يرجى تحديد تاريخ بداية ونهاية صحيحين بصيغة YYYY-MM-DD",
      });
    }

    if (from > to) {
      return res.status(400).json({
        message: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
      });
    }

    const values = [from, to];
    const conditions = [
      "ea.attendance_date BETWEEN $1 AND $2",
    ];

    const normalizedType = normalizeText(employee_type);

    if (normalizedType && normalizedType !== "الكل") {
      values.push(normalizedType);
      conditions.push(
        `COALESCE(e.employee_type, '') = $${values.length}`
      );
    }

    const result = await pool.query(
      `SELECT
         ea.id,
         ea.employee_id,
         e.full_name,
         e.employee_type,
         ea.attendance_date::text AS attendance_date,
         ea.status,
         ea.notes,
         TO_CHAR(ea.check_in_time, 'HH24:MI') AS check_in_time,
         TO_CHAR(ea.check_out_time, 'HH24:MI') AS check_out_time,
         ea.late_minutes,
         CASE
           WHEN ea.check_in_time IS NOT NULL
             AND ea.check_out_time IS NOT NULL
           THEN ROUND(
             EXTRACT(
               EPOCH FROM (ea.check_out_time - ea.check_in_time)
             ) / 3600.0,
             2
           )
           ELSE NULL
         END AS work_hours
       FROM employee_attendance ea
       JOIN employees e
         ON e.id = ea.employee_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY
         ea.attendance_date DESC,
         e.full_name`,
      values
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ea.status = 'absent')::int
           AS absent_count,
         COUNT(*) FILTER (WHERE ea.status = 'excused')::int
           AS excused_count,
         COUNT(*) FILTER (WHERE ea.status = 'late')::int
           AS late_count,
         COALESCE(SUM(ea.late_minutes), 0)::int
           AS total_late_minutes
       FROM employee_attendance ea
       JOIN employees e
         ON e.id = ea.employee_id
       WHERE ${conditions.join(" AND ")}`,
      values
    );

    const frequentLateResult = await pool.query(
      `SELECT
         ea.employee_id,
         e.full_name,
         e.employee_type,
         COUNT(*)::int AS late_count,
         COALESCE(SUM(ea.late_minutes), 0)::int
           AS total_late_minutes
       FROM employee_attendance ea
       JOIN employees e
         ON e.id = ea.employee_id
       WHERE ${conditions.join(" AND ")}
         AND ea.status = 'late'
       GROUP BY
         ea.employee_id,
         e.full_name,
         e.employee_type
       HAVING COUNT(*) >= 3
       ORDER BY
         late_count DESC,
         total_late_minutes DESC,
         e.full_name`,
      values
    );

    return res.json({
      filters: {
        from,
        to,
        employee_type: normalizedType || "الكل",
      },
      summary: summaryResult.rows[0],
      records: result.rows,
      frequent_late_employees: frequentLateResult.rows,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ في إعداد تقرير حضور الموظفين",
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
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        return res.status(400).json({
          message: "إحدى سجلات الحضور غير صحيحة",
        });
      }

      const employeeId = Number(record.employee_id);
      const status = String(record.status || "").trim();
      const notes = normalizeText(record.notes);
      const hasCheckInTime = Object.prototype.hasOwnProperty.call(
        record,
        "check_in_time"
      );
      const hasCheckOutTime = Object.prototype.hasOwnProperty.call(
        record,
        "check_out_time"
      );
      const hasLateMinutes = Object.prototype.hasOwnProperty.call(
        record,
        "late_minutes"
      );
      const checkInTime = hasCheckInTime
        ? record.check_in_time || null
        : null;
      const checkOutTime = hasCheckOutTime
        ? record.check_out_time || null
        : null;
      const lateMinutes = hasLateMinutes
        ? Number(record.late_minutes)
        : 0;

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

      if (
        (hasCheckInTime && !isValidTime(checkInTime)) ||
        (hasCheckOutTime && !isValidTime(checkOutTime))
      ) {
        return res.status(400).json({
          message: "صيغة وقت الحضور أو الانصراف غير صحيحة",
        });
      }

      if (
        hasLateMinutes &&
        (!Number.isInteger(lateMinutes) || lateMinutes < 0)
      ) {
        return res.status(400).json({
          message: "عدد دقائق التأخير غير صحيح",
        });
      }

      normalized.set(employeeId, {
        employee_id: employeeId,
        status,
        notes: notes || null,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        late_minutes: lateMinutes,
        has_late_minutes: hasLateMinutes,
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
           notes,
           check_in_time,
           check_out_time,
           late_minutes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (employee_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           check_in_time = COALESCE(
             EXCLUDED.check_in_time,
             employee_attendance.check_in_time
           ),
           check_out_time = COALESCE(
             EXCLUDED.check_out_time,
             employee_attendance.check_out_time
           ),
           late_minutes = CASE
             WHEN $8 THEN EXCLUDED.late_minutes
             ELSE employee_attendance.late_minutes
           END,
           updated_at = NOW()`,
        [
          row.employee_id,
          attendance_date,
          row.status,
          row.notes,
          row.check_in_time,
          row.check_out_time,
          row.late_minutes,
          row.has_late_minutes,
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
  getAttendanceReport,
  saveBulkAttendance,
};
