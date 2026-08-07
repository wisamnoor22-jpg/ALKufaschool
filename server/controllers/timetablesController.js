const db = require("../db");

const ALLOWED_SHIFTS = new Set(["صباحي", "ظهري"]);
const ALLOWED_DAYS = new Set([
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
]);
const ALLOWED_GRADES = new Set([
  "الصف الأول",
  "الصف الثاني",
  "الصف الثالث",
  "الصف الرابع",
  "الصف الخامس",
  "الصف السادس",
  "الأول المتوسط",
  "الثاني المتوسط",
  "الثالث المتوسط",
  "الرابع الإعدادي",
  "الخامس الإعدادي",
  "السادس الإعدادي",
]);
const ALLOWED_SECTIONS = new Set(["أ", "ب", "ج", "د"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const timeToMinutes = (value) => {
  const match = TIME_PATTERN.exec(String(value || ""));
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

const validateLocation = ({ workShift, grade, section, dayName }) => {
  if (!ALLOWED_SHIFTS.has(workShift)) {
    return "الدوام المحدد غير معتمد";
  }
  if (!ALLOWED_GRADES.has(grade)) {
    return "الصف المحدد غير معتمد";
  }
  if (section && !ALLOWED_SECTIONS.has(section)) {
    return "الشعبة المحددة غير معتمدة";
  }
  if (!ALLOWED_DAYS.has(dayName)) {
    return "اليوم المحدد غير معتمد";
  }

  return null;
};

const normalizePeriods = (times) => {
  if (!times || typeof times !== "object" || Array.isArray(times)) {
    return { error: "بيانات أوقات الحصص غير صحيحة" };
  }

  const normalized = {};

  for (const workShift of ALLOWED_SHIFTS) {
    const periods = times[workShift];

    if (!Array.isArray(periods) || periods.length < 1 || periods.length > 12) {
      return {
        error: `يجب أن يحتوي الدوام ${workShift} على حصة واحدة إلى 12 حصة`,
      };
    }

    let previousEnd = null;
    normalized[workShift] = [];

    for (let index = 0; index < periods.length; index += 1) {
      const start = normalizeText(periods[index]?.start);
      const end = normalizeText(periods[index]?.end);
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);

      if (startMinutes === null || endMinutes === null) {
        return { error: "صيغة وقت الحصة يجب أن تكون HH:MM" };
      }
      if (startMinutes >= endMinutes) {
        return { error: "يجب أن يكون وقت بداية الحصة قبل وقت نهايتها" };
      }
      if (previousEnd !== null && startMinutes < previousEnd) {
        return { error: "لا يمكن أن تتداخل أوقات الحصص" };
      }

      normalized[workShift].push({
        period_number: index + 1,
        start,
        end,
      });
      previousEnd = endMinutes;
    }
  }

  return { value: normalized };
};

const loadPeriods = async (queryable = db) => {
  const result = await queryable.query(
    `SELECT
       work_shift,
       period_number,
       TO_CHAR(start_time, 'HH24:MI') AS start,
       TO_CHAR(end_time, 'HH24:MI') AS end
     FROM timetable_periods
     ORDER BY
       CASE work_shift WHEN 'صباحي' THEN 1 ELSE 2 END,
       period_number`
  );

  return result.rows.reduce(
    (accumulator, period) => {
      accumulator[period.work_shift].push({
        period_number: period.period_number,
        start: period.start,
        end: period.end,
      });
      return accumulator;
    },
    { صباحي: [], ظهري: [] }
  );
};

exports.getPeriods = async (req, res) => {
  try {
    const times = await loadPeriods();
    return res.json({ times });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب أوقات الحصص",
    });
  }
};

exports.updatePeriods = async (req, res) => {
  const validation = normalizePeriods(req.body?.times);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const workShift of ALLOWED_SHIFTS) {
      const periods = validation.value[workShift];

      for (const period of periods) {
        await client.query(
          `INSERT INTO timetable_periods
             (work_shift, period_number, start_time, end_time)
           VALUES ($1, $2, $3::time, $4::time)
           ON CONFLICT (work_shift, period_number)
           DO UPDATE SET
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             updated_at = CURRENT_TIMESTAMP`,
          [workShift, period.period_number, period.start, period.end]
        );
      }

      const assignedRemovedPeriods = await client.query(
        `SELECT COUNT(*)::integer AS count
         FROM timetable_entries
         WHERE work_shift = $1
           AND period_number > $2`,
        [workShift, periods.length]
      );

      if (assignedRemovedPeriods.rows[0].count > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message:
            `لا يمكن حذف آخر حصص الدوام ${workShift} لأنها تحتوي على دروس محفوظة. فرّغ هذه الحصص أولًا.`,
        });
      }

      await client.query(
        `DELETE FROM timetable_periods
         WHERE work_shift = $1
           AND period_number > $2`,
        [workShift, periods.length]
      );
    }

    const conflictResult = await client.query(
      `SELECT
         first_entry.id AS first_entry_id,
         second_entry.id AS second_entry_id,
         teacher.full_name AS teacher_name,
         first_entry.day_name,
         first_entry.grade AS first_grade,
         first_entry.section AS first_section,
         second_entry.grade AS second_grade,
         second_entry.section AS second_section
       FROM timetable_entries AS first_entry
       JOIN timetable_periods AS first_period
         ON first_period.work_shift = first_entry.work_shift
        AND first_period.period_number = first_entry.period_number
       JOIN timetable_entries AS second_entry
         ON second_entry.teacher_id = first_entry.teacher_id
        AND second_entry.day_name = first_entry.day_name
        AND second_entry.id > first_entry.id
       JOIN timetable_periods AS second_period
         ON second_period.work_shift = second_entry.work_shift
        AND second_period.period_number = second_entry.period_number
       JOIN employees AS teacher
         ON teacher.id = first_entry.teacher_id
       WHERE first_entry.teacher_id IS NOT NULL
         AND first_period.start_time < second_period.end_time
         AND first_period.end_time > second_period.start_time
       LIMIT 1`
    );

    if (conflictResult.rows.length > 0) {
      await client.query("ROLLBACK");
      const conflict = conflictResult.rows[0];
      return res.status(409).json({
        message:
          "تعذر حفظ الأوقات لأنها ستنشئ تضاربًا في جدول إحدى المعلمات",
        conflict,
      });
    }

    const times = await loadPeriods(client);
    await client.query("COMMIT");

    return res.json({
      message: "تم حفظ أوقات الحصص بنجاح",
      times,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء حفظ أوقات الحصص",
    });
  } finally {
    client.release();
  }
};

exports.getEntries = async (req, res) => {
  try {
    const workShift = normalizeText(req.query.shift);
    const grade = normalizeText(req.query.grade);
    const section = normalizeText(req.query.section);
    const dayName = normalizeText(req.query.day_name);
    const locationError = validateLocation({
      workShift,
      grade,
      section,
      dayName,
    });

    if (locationError) {
      return res.status(400).json({ message: locationError });
    }

    const parameters = [workShift, grade, dayName];
    let sectionFilter = "";

    if (section) {
      parameters.push(section);
      sectionFilter = `AND entry.section = $${parameters.length}`;
    }

    const result = await db.query(
      `SELECT
         entry.id,
         entry.work_shift,
         entry.grade,
         entry.section,
         entry.day_name,
         entry.period_number,
         entry.subject,
         entry.teacher_id,
         teacher.full_name AS teacher_name,
         teacher.specialization AS teacher_specialization,
         teacher.work_shift AS teacher_work_shift
       FROM timetable_entries AS entry
       LEFT JOIN employees AS teacher
         ON teacher.id = entry.teacher_id
       WHERE entry.work_shift = $1
         AND entry.grade = $2
         AND entry.day_name = $3
         ${sectionFilter}
       ORDER BY entry.period_number, entry.section`,
      parameters
    );

    return res.json({ entries: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الجدول",
    });
  }
};

exports.getTeacherAvailability = async (req, res) => {
  try {
    const workShift = normalizeText(req.query.shift);
    const dayName = normalizeText(req.query.day_name);
    const periodNumber = parsePositiveInteger(req.query.period_number);
    const excludeEntryId = req.query.exclude_entry_id
      ? parsePositiveInteger(req.query.exclude_entry_id)
      : null;

    if (!ALLOWED_SHIFTS.has(workShift)) {
      return res.status(400).json({ message: "الدوام المحدد غير معتمد" });
    }
    if (!ALLOWED_DAYS.has(dayName)) {
      return res.status(400).json({ message: "اليوم المحدد غير معتمد" });
    }
    if (!periodNumber) {
      return res.status(400).json({ message: "رقم الحصة غير صحيح" });
    }

    const targetPeriodResult = await db.query(
      `SELECT start_time, end_time
       FROM timetable_periods
       WHERE work_shift = $1
         AND period_number = $2`,
      [workShift, periodNumber]
    );

    if (targetPeriodResult.rows.length === 0) {
      return res.status(404).json({ message: "الحصة المحددة غير موجودة" });
    }

    const result = await db.query(
      `WITH target_period AS (
         SELECT start_time, end_time
         FROM timetable_periods
         WHERE work_shift = $1
           AND period_number = $2
       )
       SELECT
         teacher.id,
         teacher.full_name,
         teacher.specialization,
         teacher.work_shift,
         conflict.conflict_entry_id,
         conflict.conflict_shift,
         conflict.conflict_grade,
         conflict.conflict_section,
         conflict.conflict_day_name,
         conflict.conflict_period_number,
         conflict.conflict_subject
       FROM employees AS teacher
       CROSS JOIN target_period
       LEFT JOIN LATERAL (
         SELECT
           entry.id AS conflict_entry_id,
           entry.work_shift AS conflict_shift,
           entry.grade AS conflict_grade,
           entry.section AS conflict_section,
           entry.day_name AS conflict_day_name,
           entry.period_number AS conflict_period_number,
           entry.subject AS conflict_subject
         FROM timetable_entries AS entry
         JOIN timetable_periods AS occupied_period
           ON occupied_period.work_shift = entry.work_shift
          AND occupied_period.period_number = entry.period_number
         WHERE entry.teacher_id = teacher.id
           AND entry.day_name = $3
           AND ($4::integer IS NULL OR entry.id <> $4)
           AND occupied_period.start_time < target_period.end_time
           AND occupied_period.end_time > target_period.start_time
         ORDER BY entry.id
         LIMIT 1
       ) AS conflict ON TRUE
       WHERE teacher.employee_type = 'معلمة'
         AND teacher.work_shift IN ($1, 'صباحي وظهري')
       ORDER BY teacher.full_name`,
      [workShift, periodNumber, dayName, excludeEntryId]
    );

    return res.json({ teachers: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء التحقق من توفر المعلمات",
    });
  }
};

exports.saveEntry = async (req, res) => {
  const workShift = normalizeText(req.body?.shift);
  const grade = normalizeText(req.body?.grade);
  const section = normalizeText(req.body?.section);
  const dayName = normalizeText(req.body?.day_name);
  const periodNumber = parsePositiveInteger(req.body?.period_number);
  const teacherId = parsePositiveInteger(req.body?.teacher_id);
  const subject = normalizeText(req.body?.subject);
  const replaceConflict = req.body?.replace_conflict === true;
  const locationError = validateLocation({
    workShift,
    grade,
    section,
    dayName,
  });

  if (locationError) {
    return res.status(400).json({ message: locationError });
  }
  if (!periodNumber) {
    return res.status(400).json({ message: "رقم الحصة غير صحيح" });
  }
  if (!teacherId) {
    return res.status(400).json({ message: "يرجى اختيار المعلمة" });
  }
  if (!subject || subject.length > 100) {
    return res.status(400).json({
      message: "اسم المادة مطلوب ويجب ألا يتجاوز 100 حرف",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const dayLockNumber = [...ALLOWED_DAYS].indexOf(dayName) + 1;
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
      teacherId,
      dayLockNumber,
    ]);

    const teacherResult = await client.query(
      `SELECT id, full_name, specialization, work_shift
       FROM employees
       WHERE id = $1
         AND employee_type = 'معلمة'
       FOR SHARE`,
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "المعلمة المحددة غير موجودة" });
    }

    const teacher = teacherResult.rows[0];
    if (![workShift, "صباحي وظهري"].includes(teacher.work_shift)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `المعلمة غير مسجلة ضمن الدوام ${workShift}`,
      });
    }

    const targetPeriodResult = await client.query(
      `SELECT start_time, end_time
       FROM timetable_periods
       WHERE work_shift = $1
         AND period_number = $2`,
      [workShift, periodNumber]
    );

    if (targetPeriodResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "الحصة المحددة غير موجودة" });
    }

    const targetPeriod = targetPeriodResult.rows[0];
    const conflictsResult = await client.query(
      `SELECT
         entry.id,
         entry.work_shift,
         entry.grade,
         entry.section,
         entry.day_name,
         entry.period_number,
         entry.subject
       FROM timetable_entries AS entry
       JOIN timetable_periods AS occupied_period
         ON occupied_period.work_shift = entry.work_shift
        AND occupied_period.period_number = entry.period_number
       WHERE entry.teacher_id = $1
         AND entry.day_name = $2
         AND NOT (
           entry.work_shift = $3
           AND entry.grade = $4
           AND entry.section = $5
           AND entry.period_number = $6
         )
         AND occupied_period.start_time < $7::time
         AND occupied_period.end_time > $8::time
       FOR UPDATE OF entry`,
      [
        teacherId,
        dayName,
        workShift,
        grade,
        section,
        periodNumber,
        targetPeriod.end_time,
        targetPeriod.start_time,
      ]
    );

    if (conflictsResult.rows.length > 0 && !replaceConflict) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "المعلمة مرتبطة بحصة أخرى في الوقت نفسه",
        conflict: conflictsResult.rows[0],
      });
    }

    let removedConflicts = [];
    if (conflictsResult.rows.length > 0) {
      const conflictIds = conflictsResult.rows.map((conflict) => conflict.id);
      const deletedResult = await client.query(
        `DELETE FROM timetable_entries
         WHERE id = ANY($1::integer[])
         RETURNING id, work_shift, grade, section, day_name, period_number, subject`,
        [conflictIds]
      );
      removedConflicts = deletedResult.rows;
    }

    const savedResult = await client.query(
      `INSERT INTO timetable_entries
         (work_shift, grade, section, day_name, period_number, subject, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (work_shift, grade, section, day_name, period_number)
       DO UPDATE SET
         subject = EXCLUDED.subject,
         teacher_id = EXCLUDED.teacher_id,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [workShift, grade, section, dayName, periodNumber, subject, teacherId]
    );

    await client.query("COMMIT");

    return res.json({
      message:
        removedConflicts.length > 0
          ? "تم نقل المعلمة وحفظ الحصة، وأصبح موقع التعارض السابق فارغًا"
          : "تم حفظ الحصة بنجاح",
      entry: {
        ...savedResult.rows[0],
        teacher_name: teacher.full_name,
        teacher_specialization: teacher.specialization,
        teacher_work_shift: teacher.work_shift,
      },
      removed_conflicts: removedConflicts,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء حفظ الحصة",
    });
  } finally {
    client.release();
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const entryId = parsePositiveInteger(req.params.id);
    if (!entryId) {
      return res.status(400).json({ message: "رقم الحصة المحفوظة غير صحيح" });
    }

    const result = await db.query(
      `DELETE FROM timetable_entries
       WHERE id = $1
       RETURNING id`,
      [entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الحصة المحفوظة غير موجودة" });
    }

    return res.json({ message: "تم تفريغ الخلية بنجاح" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تفريغ الخلية",
    });
  }
};