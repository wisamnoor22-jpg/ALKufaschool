const pool = require("../db");

const SCHOOL_TIME_ZONE = "Asia/Baghdad";

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const roundPercentage = (value) =>
  Math.round(Math.min(Math.max(numberOrZero(value), 0), 100) * 10) / 10;

const getSchoolDateContext = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: SCHOOL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const schoolDate = `${parts.year}-${parts.month}-${parts.day}`;
  const monthStart = `${parts.year}-${parts.month}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextMonthStart = [
    nextMonthDate.getUTCFullYear(),
    String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");

  return {
    schoolDate,
    monthStart,
    nextMonthStart,
    generatedAt: now.toISOString(),
  };
};

const STUDENTS_QUERY = `
  WITH active_year AS (
    SELECT id, name
    FROM academic_years
    WHERE is_active = TRUE
      AND is_closed = FALSE
    ORDER BY id DESC
    LIMIT 1
  ),
  active_enrollments AS (
    SELECT DISTINCT ON (se.student_id)
      se.student_id,
      s.gender,
      COALESCE(se.school_shift, s.school_shift, 'صباحي') AS school_shift,
      COALESCE(g.name, NULLIF(TRIM(s.grade), ''), 'غير محدد') AS grade
    FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    LEFT JOIN grades g ON g.id = se.grade_id
    WHERE se.enrollment_status = 'active'
      AND se.deleted_at IS NULL
      AND (
        NOT EXISTS (SELECT 1 FROM active_year)
        OR se.academic_year_id = (SELECT id FROM active_year)
      )
    ORDER BY se.student_id, se.id DESC
  ),
  grade_counts AS (
    SELECT grade, COUNT(*)::integer AS count
    FROM active_enrollments
    GROUP BY grade
  )
  SELECT
    (SELECT COUNT(*)::integer FROM students) AS total,
    (SELECT COUNT(*)::integer FROM active_enrollments) AS active_total,
    (
      SELECT COUNT(*)::integer
      FROM active_enrollments
      WHERE school_shift = 'صباحي'
        AND LOWER(COALESCE(gender, '')) IN ('طالب', 'ذكر', 'male')
    ) AS morning_male,
    (
      SELECT COUNT(*)::integer
      FROM active_enrollments
      WHERE school_shift = 'صباحي'
        AND LOWER(COALESCE(gender, '')) IN ('طالبة', 'أنثى', 'female')
    ) AS morning_female,
    (
      SELECT COUNT(*)::integer
      FROM active_enrollments
      WHERE school_shift = 'ظهري'
        AND LOWER(COALESCE(gender, '')) IN ('طالب', 'ذكر', 'male')
    ) AS afternoon_male,
    (
      SELECT COUNT(*)::integer
      FROM students
      WHERE LOWER(COALESCE(gender, '')) IN ('طالب', 'ذكر', 'male')
    ) AS male,
    (
      SELECT COUNT(*)::integer
      FROM students
      WHERE LOWER(COALESCE(gender, '')) IN ('طالبة', 'أنثى', 'female')
    ) AS female,
    (
      SELECT COUNT(*)::integer
      FROM students
      WHERE created_at >= $1::date
        AND created_at < $2::date
    ) AS added_this_month,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT('grade', grade, 'count', count)
          ORDER BY count DESC, grade
        )
        FROM grade_counts
      ),
      '[]'::json
    ) AS by_grade,
    (SELECT name FROM active_year) AS academic_year
`;

const EMPLOYEES_QUERY = `
  WITH employee_types AS (
    SELECT
      COALESCE(
        NULLIF(TRIM(employee_type), ''),
        NULLIF(TRIM(job_title), ''),
        'غير محدد'
      ) AS employee_type,
      COUNT(*)::integer AS count
    FROM employees
    GROUP BY 1
  ),
  employee_shifts AS (
    SELECT
      COALESCE(NULLIF(TRIM(work_shift), ''), 'غير محدد') AS work_shift,
      COUNT(*)::integer AS count
    FROM employees
    GROUP BY 1
  )
  SELECT
    (SELECT COUNT(*)::integer FROM employees) AS total,
    (
      SELECT COUNT(*)::integer
      FROM employees
      WHERE created_at >= $1::date
        AND created_at < $2::date
    ) AS added_this_month,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT('type', employee_type, 'count', count)
          ORDER BY count DESC, employee_type
        )
        FROM employee_types
      ),
      '[]'::json
    ) AS by_type,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT('shift', work_shift, 'count', count)
          ORDER BY count DESC, work_shift
        )
        FROM employee_shifts
      ),
      '[]'::json
    ) AS by_shift
`;

const EMPLOYEE_ATTENDANCE_QUERY = `
  WITH today_attendance AS (
    SELECT *
    FROM employee_attendance
    WHERE attendance_date = $1::date
  )
  SELECT
    COUNT(e.id)::integer AS total_employees,
    COUNT(*) FILTER (WHERE a.status = 'present')::integer AS present,
    COUNT(*) FILTER (WHERE a.status = 'late')::integer AS late,
    COUNT(*) FILTER (
      WHERE a.id IS NULL OR a.status = 'absent'
    )::integer AS absent,
    COUNT(*) FILTER (WHERE a.check_out_time IS NOT NULL)::integer AS checked_out,
    COUNT(*) FILTER (
      WHERE a.check_in_time IS NOT NULL
        AND a.check_out_time IS NULL
    )::integer AS currently_inside,
    COALESCE(SUM(GREATEST(a.late_minutes, 0)), 0)::integer
      AS total_late_minutes,
    COALESCE(
      ROUND(AVG(GREATEST(a.late_minutes, 0)) FILTER (
        WHERE a.status = 'late'
      ), 1),
      0
    ) AS average_late_minutes,
    TO_CHAR(MAX(a.check_in_time), 'HH24:MI') AS latest_check_in,
    TO_CHAR(MAX(a.check_out_time), 'HH24:MI') AS latest_check_out,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'workShift', work_shift,
            'total', total,
            'present', present,
            'late', late,
            'absent', absent
          )
          ORDER BY work_shift
        )
        FROM (
          SELECT
            COALESCE(NULLIF(TRIM(e2.work_shift), ''), 'غير محدد')
              AS work_shift,
            COUNT(e2.id)::integer AS total,
            COUNT(*) FILTER (WHERE a2.status = 'present')::integer
              AS present,
            COUNT(*) FILTER (WHERE a2.status = 'late')::integer AS late,
            COUNT(*) FILTER (
              WHERE a2.id IS NULL OR a2.status = 'absent'
            )::integer AS absent
          FROM employees e2
          LEFT JOIN today_attendance a2 ON a2.employee_id = e2.id
          GROUP BY 1
        ) AS employee_shift_rows
      ),
      '[]'::json
    ) AS by_shift
  FROM employees e
  LEFT JOIN today_attendance a ON a.employee_id = e.id
`;

const STUDENT_ATTENDANCE_QUERY = `
  WITH active_year AS (
    SELECT id
    FROM academic_years
    WHERE is_active = TRUE
      AND is_closed = FALSE
    ORDER BY id DESC
    LIMIT 1
  ),
  active_enrollments AS (
    SELECT DISTINCT ON (se.student_id)
      se.id AS enrollment_id,
      se.student_id,
      s.gender,
      COALESCE(se.school_shift, s.school_shift, 'صباحي') AS school_shift,
      COALESCE(g.name, NULLIF(TRIM(s.grade), ''), 'غير محدد') AS grade
    FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    LEFT JOIN grades g ON g.id = se.grade_id
    WHERE se.enrollment_status = 'active'
      AND se.deleted_at IS NULL
      AND (
        NOT EXISTS (SELECT 1 FROM active_year)
        OR se.academic_year_id = (SELECT id FROM active_year)
      )
      AND (
        COALESCE(se.school_shift, s.school_shift, 'صباحي') <> 'ظهري'
        OR LOWER(COALESCE(s.gender, '')) IN ('طالب', 'ذكر', 'male')
      )
    ORDER BY se.student_id, se.id DESC
  ),
  today_records AS (
    SELECT sa.*
    FROM student_attendance sa
    WHERE sa.attendance_date = $1::date
  ),
  attendance_rows AS (
    SELECT
      ae.student_id,
      ae.grade,
      ae.school_shift,
      tr.status
    FROM active_enrollments ae
    LEFT JOIN today_records tr
      ON tr.student_enrollment_id = ae.enrollment_id
  ),
  absence_by_grade AS (
    SELECT
      grade,
      COUNT(*) FILTER (WHERE status = 'absent')::integer
        AS absent_without_excuse,
      COUNT(*) FILTER (WHERE status = 'excused')::integer
        AS on_leave,
      COUNT(*) FILTER (
        WHERE status IN ('absent', 'excused')
      )::integer AS total_absent
    FROM attendance_rows
    GROUP BY grade
    HAVING COUNT(*) FILTER (
      WHERE status IN ('absent', 'excused')
    ) > 0
  ),
  attendance_by_shift AS (
    SELECT
      school_shift,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE status IN ('present', 'late'))::integer
        AS present,
      COUNT(*) FILTER (WHERE status = 'absent')::integer
        AS absent_without_excuse,
      COUNT(*) FILTER (WHERE status = 'excused')::integer
        AS on_leave,
      COUNT(*) FILTER (WHERE status IS NOT NULL)::integer
        AS recorded,
      COALESCE(
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late'))
          / NULLIF(COUNT(*), 0),
          1
        ),
        0
      ) AS attendance_rate
    FROM attendance_rows
    GROUP BY school_shift
  )
  SELECT
    COUNT(*)::integer AS total_active_students,
    COUNT(*) FILTER (WHERE status IN ('present', 'late'))::integer
      AS present,
    COUNT(*) FILTER (WHERE status = 'absent')::integer
      AS absent_without_excuse,
    COUNT(*) FILTER (WHERE status = 'excused')::integer
      AS on_leave,
    COUNT(*) FILTER (WHERE status IS NOT NULL)::integer
      AS recorded_students,
    COALESCE(
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late'))
        / NULLIF(COUNT(*), 0),
        1
      ),
      0
    ) AS attendance_rate,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'grade', grade,
            'absentWithoutExcuse', absent_without_excuse,
            'onLeave', on_leave,
            'totalAbsent', total_absent
          )
          ORDER BY total_absent DESC, grade
        )
        FROM absence_by_grade
      ),
      '[]'::json
    ) AS absence_by_grade,
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'schoolShift', school_shift,
            'total', total,
            'present', present,
            'absentWithoutExcuse', absent_without_excuse,
            'onLeave', on_leave,
            'recorded', recorded,
            'attendanceRate', attendance_rate
          )
          ORDER BY school_shift
        )
        FROM attendance_by_shift
      ),
      '[]'::json
    ) AS by_shift
  FROM attendance_rows
`;

const FINANCE_QUERY = `
  WITH active_year AS (
    SELECT name
    FROM academic_years
    WHERE is_active = TRUE
      AND is_closed = FALSE
    ORDER BY id DESC
    LIMIT 1
  ),
  selected_fees AS (
    SELECT sf.*
    FROM student_fees sf
    WHERE NOT EXISTS (SELECT 1 FROM active_year)
      OR TRIM(sf.academic_year) = TRIM((SELECT name FROM active_year))
  ),
  payment_totals AS (
    SELECT
      student_fee_id,
      COALESCE(SUM(GREATEST(amount, 0)), 0) AS paid
    FROM payments
    GROUP BY student_fee_id
  ),
  fee_rows AS (
    SELECT
      sf.id,
      sf.student_id,
      sf.academic_year,
      GREATEST(COALESCE(sf.total_fee, 0) - COALESCE(sf.discount, 0), 0)
        AS required,
      GREATEST(COALESCE(pt.paid, 0), 0) AS paid,
      GREATEST(
        COALESCE(sf.total_fee, 0)
          - COALESCE(sf.discount, 0)
          - GREATEST(COALESCE(pt.paid, 0), 0),
        0
      ) AS remaining,
      COALESCE(
        (
          SELECT COALESCE(g.name, NULLIF(TRIM(s.grade), ''))
          FROM student_enrollments se
          JOIN academic_years ay ON ay.id = se.academic_year_id
          LEFT JOIN grades g ON g.id = se.grade_id
          WHERE se.student_id = sf.student_id
            AND TRIM(ay.name) = TRIM(sf.academic_year)
            AND se.deleted_at IS NULL
          ORDER BY se.id DESC
          LIMIT 1
        ),
        NULLIF(TRIM(s.grade), ''),
        'غير محدد'
      ) AS grade
    FROM selected_fees sf
    JOIN students s ON s.id = sf.student_id
    LEFT JOIN payment_totals pt ON pt.student_fee_id = sf.id
  ),
  student_balances AS (
    SELECT
      student_id,
      SUM(required) AS required,
      SUM(paid) AS paid,
      SUM(remaining) AS remaining
    FROM fee_rows
    GROUP BY student_id
  ),
  grade_balances AS (
    SELECT grade, SUM(remaining) AS remaining
    FROM fee_rows
    GROUP BY grade
  ),
  payment_periods AS (
    SELECT
      COUNT(*) FILTER (WHERE p.payment_date = $1::date)::integer
        AS payments_today_count,
      COALESCE(SUM(GREATEST(p.amount, 0)) FILTER (
        WHERE p.payment_date = $1::date
      ), 0) AS payments_today_amount,
      COUNT(*) FILTER (
        WHERE p.payment_date >= $2::date
          AND p.payment_date < $3::date
      )::integer AS payments_this_month_count,
      COALESCE(SUM(GREATEST(p.amount, 0)) FILTER (
        WHERE p.payment_date >= $2::date
          AND p.payment_date < $3::date
      ), 0) AS payments_this_month_amount
    FROM payments p
    JOIN selected_fees sf ON sf.id = p.student_fee_id
  )
  SELECT
    COALESCE((SELECT SUM(required) FROM fee_rows), 0) AS total_required,
    COALESCE((SELECT SUM(paid) FROM fee_rows), 0) AS total_paid,
    COALESCE((SELECT SUM(remaining) FROM fee_rows), 0) AS total_remaining,
    (
      SELECT COUNT(*)::integer
      FROM student_balances
      WHERE required > 0 AND remaining = 0
    ) AS fully_paid_students,
    (
      SELECT COUNT(*)::integer
      FROM student_balances
      WHERE remaining > 0
    ) AS students_with_balance,
    (
      SELECT COUNT(*)::integer
      FROM student_balances
      WHERE paid > 0 AND remaining > 0
    ) AS partially_paid_students,
    (
      SELECT COUNT(*)::integer
      FROM student_balances
      WHERE paid = 0 AND remaining > 0
    ) AS unpaid_students,
    payment_periods.payments_today_count,
    payment_periods.payments_today_amount,
    payment_periods.payments_this_month_count,
    payment_periods.payments_this_month_amount,
    COALESCE(
      ROUND(
        100.0 * (SELECT SUM(paid) FROM fee_rows)
        / NULLIF((SELECT SUM(required) FROM fee_rows), 0),
        1
      ),
      0
    ) AS collection_rate,
    (
      SELECT JSON_BUILD_OBJECT('grade', grade, 'remaining', remaining)
      FROM grade_balances
      WHERE remaining > 0
      ORDER BY remaining DESC, grade
      LIMIT 1
    ) AS highest_outstanding_grade,
    (SELECT name FROM active_year) AS academic_year
  FROM payment_periods
`;

const ARCHIVE_QUERY = `
  SELECT COUNT(*)::integer AS total
  FROM deletion_archive
`;

const defaults = {
  students: {
    total: 0,
    activeTotal: 0,
    male: 0,
    female: 0,
    morningMale: 0,
    morningFemale: 0,
    afternoonMale: 0,
    addedThisMonth: 0,
    byGrade: [],
    academicYear: null,
  },
  employees: {
    total: 0,
    addedThisMonth: 0,
    byType: [],
    byShift: [],
  },
  studentAttendance: {
    totalActiveStudents: 0,
    present: 0,
    absentWithExcuse: null,
    absentWithoutExcuse: 0,
    onLeave: 0,
    recordedStudents: 0,
    attendanceRate: 0,
    topAbsentGrade: null,
    absenceByGrade: [],
    byShift: [],
    limitations: [
      "لا توجد حالة مستقلة للغياب بعذر في بنية الحضور الحالية؛ الحالة excused مستخدمة للمجازين.",
    ],
  },
  employeeAttendance: {
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    checkedOut: 0,
    currentlyInside: 0,
    totalLateMinutes: 0,
    averageLateMinutes: 0,
    latestCheckIn: null,
    latestCheckOut: null,
    byShift: [],
  },
  finance: {
    totalRequired: 0,
    totalPaid: 0,
    totalRemaining: 0,
    fullyPaidStudents: 0,
    studentsWithBalance: 0,
    partiallyPaidStudents: 0,
    unpaidStudents: 0,
    paymentsTodayCount: 0,
    paymentsTodayAmount: 0,
    paymentsThisMonthCount: 0,
    paymentsThisMonthAmount: 0,
    collectionRate: 0,
    highestOutstandingGrade: null,
    academicYear: null,
  },
  archive: { total: 0 },
};

const sectionDefinitions = (context) => [
  {
    key: "students",
    query: STUDENTS_QUERY,
    values: [context.monthStart, context.nextMonthStart],
    map: (row) => ({
      total: numberOrZero(row.total),
      activeTotal: numberOrZero(row.active_total),
      male: numberOrZero(row.male),
      female: numberOrZero(row.female),
      morningMale: numberOrZero(row.morning_male),
      morningFemale: numberOrZero(row.morning_female),
      afternoonMale: numberOrZero(row.afternoon_male),
      addedThisMonth: numberOrZero(row.added_this_month),
      byGrade: Array.isArray(row.by_grade) ? row.by_grade : [],
      academicYear: row.academic_year || null,
    }),
  },
  {
    key: "employees",
    query: EMPLOYEES_QUERY,
    values: [context.monthStart, context.nextMonthStart],
    map: (row) => ({
      total: numberOrZero(row.total),
      addedThisMonth: numberOrZero(row.added_this_month),
      byType: Array.isArray(row.by_type) ? row.by_type : [],
      byShift: Array.isArray(row.by_shift) ? row.by_shift : [],
    }),
  },
  {
    key: "studentAttendance",
    query: STUDENT_ATTENDANCE_QUERY,
    values: [context.schoolDate],
    map: (row) => {
      const absenceByGrade = Array.isArray(row.absence_by_grade)
        ? row.absence_by_grade
        : [];

      return {
        totalActiveStudents: numberOrZero(row.total_active_students),
        present: numberOrZero(row.present),
        absentWithExcuse: null,
        absentWithoutExcuse: numberOrZero(row.absent_without_excuse),
        onLeave: numberOrZero(row.on_leave),
        recordedStudents: numberOrZero(row.recorded_students),
        attendanceRate: roundPercentage(row.attendance_rate),
        topAbsentGrade: absenceByGrade[0] || null,
        absenceByGrade,
        byShift: Array.isArray(row.by_shift) ? row.by_shift : [],
        limitations: defaults.studentAttendance.limitations,
      };
    },
  },
  {
    key: "employeeAttendance",
    query: EMPLOYEE_ATTENDANCE_QUERY,
    values: [context.schoolDate],
    map: (row) => ({
      totalEmployees: numberOrZero(row.total_employees),
      present: numberOrZero(row.present),
      absent: numberOrZero(row.absent),
      late: numberOrZero(row.late),
      checkedOut: numberOrZero(row.checked_out),
      currentlyInside: numberOrZero(row.currently_inside),
      totalLateMinutes: numberOrZero(row.total_late_minutes),
      averageLateMinutes: numberOrZero(row.average_late_minutes),
      latestCheckIn: row.latest_check_in || null,
      latestCheckOut: row.latest_check_out || null,
      byShift: Array.isArray(row.by_shift) ? row.by_shift : [],
    }),
  },
  {
    key: "finance",
    query: FINANCE_QUERY,
    values: [
      context.schoolDate,
      context.monthStart,
      context.nextMonthStart,
    ],
    map: (row) => ({
      totalRequired: numberOrZero(row.total_required),
      totalPaid: numberOrZero(row.total_paid),
      totalRemaining: numberOrZero(row.total_remaining),
      fullyPaidStudents: numberOrZero(row.fully_paid_students),
      studentsWithBalance: numberOrZero(row.students_with_balance),
      partiallyPaidStudents: numberOrZero(row.partially_paid_students),
      unpaidStudents: numberOrZero(row.unpaid_students),
      paymentsTodayCount: numberOrZero(row.payments_today_count),
      paymentsTodayAmount: numberOrZero(row.payments_today_amount),
      paymentsThisMonthCount: numberOrZero(row.payments_this_month_count),
      paymentsThisMonthAmount: numberOrZero(row.payments_this_month_amount),
      collectionRate: roundPercentage(row.collection_rate),
      highestOutstandingGrade: row.highest_outstanding_grade || null,
      academicYear: row.academic_year || null,
    }),
  },
  {
    key: "archive",
    query: ARCHIVE_QUERY,
    values: [],
    map: (row) => ({ total: numberOrZero(row.total) }),
  },
];

const loadDashboardStatistics = async (queryExecutor = pool, now = new Date()) => {
  const context = getSchoolDateContext(now);
  const definitions = sectionDefinitions(context);
  const executeDefinition = async (definition) => {
      const result = await queryExecutor.query(
        definition.query,
        definition.values
      );
      return definition.map(result.rows[0] || {});
  };
  let results;

  if (queryExecutor === pool) {
    results = await Promise.allSettled(
      definitions.map(executeDefinition)
    );
  } else {
    results = [];
    for (const definition of definitions) {
      try {
        results.push({
          status: "fulfilled",
          value: await executeDefinition(definition),
        });
      } catch (reason) {
        results.push({ status: "rejected", reason });
      }
    }
  }

  const payload = {};
  const sectionErrors = {};

  results.forEach((result, index) => {
    const key = definitions[index].key;

    if (result.status === "fulfilled") {
      payload[key] = result.value;
      return;
    }

    console.error(`Dashboard statistics section failed: ${key}`, result.reason);
    payload[key] = defaults[key];
    sectionErrors[key] = "تعذر تحديث هذا القسم";
  });

  return {
    ...payload,
    generatedAt: context.generatedAt,
    schoolDate: context.schoolDate,
    timeZone: SCHOOL_TIME_ZONE,
    sectionErrors,
  };
};

const getDashboardStatistics = async (req, res) => {
  try {
    const statistics = await loadDashboardStatistics();
    return res.json(statistics);
  } catch (error) {
    console.error("Dashboard statistics failed:", error);
    return res.status(500).json({
      message: "تعذر تحميل إحصائيات لوحة التحكم",
    });
  }
};

module.exports = {
  getDashboardStatistics,
  getSchoolDateContext,
  loadDashboardStatistics,
};
