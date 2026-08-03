const pool = require("../db");

const ALLOWED_STATUSES = new Set([
  "present",
  "absent",
  "late",
  "excused",
]);

let attendanceTablePromise = null;

const ensureAttendanceTable = () => {
  if (!attendanceTablePromise) {
    attendanceTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS student_attendance (
          id SERIAL PRIMARY KEY,
          student_enrollment_id INTEGER NOT NULL
            REFERENCES student_enrollments(id)
            ON DELETE CASCADE,
          attendance_date DATE NOT NULL,
          status VARCHAR(20) NOT NULL
            CHECK (status IN ('present', 'absent', 'late', 'excused')),
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (student_enrollment_id, attendance_date)
        );

        CREATE INDEX IF NOT EXISTS idx_student_attendance_date
          ON student_attendance(attendance_date);

        CREATE INDEX IF NOT EXISTS idx_student_attendance_enrollment
          ON student_attendance(student_enrollment_id);
      `)
      .catch((error) => {
        attendanceTablePromise = null;
        throw error;
      });
  }

  return attendanceTablePromise;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
};

const sendServerError = (res, error, fallbackMessage) => {
  console.error(error);

  return res.status(500).json({
    message: fallbackMessage,
  });
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
         sa.id,
         sa.student_enrollment_id,
         sa.attendance_date::text AS attendance_date,
         sa.status,
         sa.notes,
         sa.created_at,
         sa.updated_at
       FROM student_attendance sa
       WHERE sa.attendance_date = $1
       ORDER BY sa.student_enrollment_id ASC`,
      [attendanceDate]
    );

    return res.json(result.rows);
  } catch (error) {
    return sendServerError(
      res,
      error,
      "حدث خطأ في جلب حضور الطلاب"
    );
  }
};

const saveBulkAttendance = async (req, res) => {
  await ensureAttendanceTable();

  const client = await pool.connect();

  try {
    const { attendance_date, records } = req.body;

    if (!isValidDate(attendance_date)) {
      return res.status(400).json({
        message: "يرجى تحديد تاريخ صحيح بصيغة YYYY-MM-DD",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        message: "لا توجد سجلات حضور للحفظ",
      });
    }

    const uniqueRecords = new Map();

    for (const record of records) {
      const enrollmentId = Number(record.student_enrollment_id);
      const status = String(record.status || "").trim();
      const notes =
        typeof record.notes === "string"
          ? record.notes.trim()
          : "";

      if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
        return res.status(400).json({
          message: "أحد أرقام تسجيل الطلاب غير صحيح",
        });
      }

      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          message: "إحدى حالات الحضور غير صحيحة",
        });
      }

      uniqueRecords.set(enrollmentId, {
        student_enrollment_id: enrollmentId,
        status,
        notes: notes || null,
      });
    }

    const normalizedRecords = Array.from(uniqueRecords.values());
    const enrollmentIds = normalizedRecords.map(
      (record) => record.student_enrollment_id
    );

    await client.query("BEGIN");

    const enrollmentResult = await client.query(
      `SELECT id
       FROM student_enrollments
       WHERE id = ANY($1::int[])
         AND deleted_at IS NULL`,
      [enrollmentIds]
    );

    if (enrollmentResult.rows.length !== enrollmentIds.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "يوجد طالب بلا تسجيل دراسي حالي، حدّث بيانات الطلاب أولًا",
      });
    }

    const savedRecords = [];

    for (const record of normalizedRecords) {
      const result = await client.query(
        `INSERT INTO student_attendance (
           student_enrollment_id,
           attendance_date,
           status,
           notes
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_enrollment_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING
           id,
           student_enrollment_id,
           attendance_date::text AS attendance_date,
           status,
           notes,
           created_at,
           updated_at`,
        [
          record.student_enrollment_id,
          attendance_date,
          record.status,
          record.notes,
        ]
      );

      savedRecords.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.json({
      message: "تم حفظ حضور الطلاب بنجاح",
      records: savedRecords,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    return sendServerError(
      res,
      error,
      "حدث خطأ في حفظ حضور الطلاب"
    );
  } finally {
    client.release();
  }
};

module.exports = {
  getAttendanceByDate,
  saveBulkAttendance,
};