const db = require("../db");

const MAX_ROWS = 120;
const MAX_PEOPLE = 300;
const MAX_TIMETABLE_ROWS = 450;

const normalizeArabic = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsAny = (text, words) =>
  words.some((word) => text.includes(normalizeArabic(word)));

const KEYWORDS = {
  staff: [
    "معلمة", "معلمات", "معلم", "معلمين", "الكادر", "موظف", "موظفين",
    "اختصاص", "تخصص", "رياضيات", "عربي", "انكليزي", "انجليزي",
    "فيزياء", "كيمياء", "احياء", "اسلامية", "اجتماعيات", "حاسوب",
  ],
  students: [
    "طالب", "طالبة", "طلاب", "طالبات", "الطلبة", "شعبة", "شعب",
    "صف", "مرحلة", "تسجيل", "قبول",
  ],
  attendance: [
    "حضور", "غياب", "غائب", "غائبة", "تأخير", "متأخر", "دوام اليوم",
  ],
  finance: [
    "قسط", "اقساط", "دفعة", "دفعات", "حساب", "الحسابات", "مالي",
    "مالية", "متبقي", "مدفوع", "تحصيل", "وصل", "وصولات", "رسوم",
  ],
  payroll: [
    "راتب", "رواتب", "اجر", "أجر", "استقطاع", "خصم راتب", "راتبه", "راتبها",
  ],
  timetable: [
    "جدول", "جداول", "حصة", "حصص", "مادة", "مواد", "تدريس",
    "تدرس", "يدرس", "وقت الحصة", "اوقات الحصص",
  ],
  results: [
    "درجة", "درجات", "نتيجة", "نتائج", "امتحان", "اختبار",
    "يومي", "شهري", "نصف السنة",
  ],
  holidays: [
    "عطلة", "عطل", "عطلات", "اجازة رسمية", "إجازة رسمية",
  ],
  archive: [
    "محذوف", "محذوفات", "سجل المحذوفات", "ارشيف", "أرشيف", "حذف",
  ],
  transfers: [
    "نقل طالب", "نقل الطلاب", "تنقل", "تنقلات", "تحويل شعبة",
    "نقل شعبة", "بين الشعب",
  ],
  academic: [
    "سنة دراسية", "السنة الدراسية", "عام دراسي", "العام الدراسي",
  ],
  documents: [
    "وثيقة", "وثائق", "مستند", "مستندات", "ملف مرفق", "مرفقات",
  ],
  contact: [
    "هاتف", "رقم الهاتف", "رقم تلفون", "عنوان", "سكن",
  ],
  broad: [
    "كل شيء", "كلشي", "كل شي", "كل المعلومات", "تفاصيل المدرسة",
    "ملخص المدرسة", "وضع المدرسة", "احصائيات المدرسة", "إحصائيات المدرسة",
  ],
};

const TABLE_GROUPS = {
  finance: ["student_fees", "payments", "receipts", "grade_fees"],
  holidays: ["holidays"],
  archive: ["deletion_archive"],
  transfers: ["student_section_transfers"],
  academic: ["academic_years"],
  documents: ["student_documents", "employee_documents"],
};

const SAFE_REMOVED_FIELDS = [
  "password",
  "password_hash",
  "api_key",
  "token",
  "secret",
  "file_data",
  "binary_data",
  "content",
];

const safeQuery = async (label, text, params = []) => {
  try {
    const result = await db.query(text, params);
    return result.rows;
  } catch (error) {
    console.error("AI read query failed:", {
      label,
      code: error.code,
    });
    return null;
  }
};

const tableExists = async (tableName) => {
  const rows = await safeQuery(
    `exists-${tableName}`,
    "SELECT to_regclass($1) AS table_name",
    [`public.${tableName}`]
  );

  return Boolean(rows?.[0]?.table_name);
};

const quoteIdentifier = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error("Unsafe SQL identifier");
  }

  return `"${name}"`;
};

const readTablePreview = async (tableName, limit = MAX_ROWS) => {
  if (!(await tableExists(tableName))) return null;

  const removedFields = SAFE_REMOVED_FIELDS
    .map((field) => `'${field.replace(/'/g, "''")}'`)
    .join(", ");

  const sql = `
    SELECT
      to_jsonb(t) - ARRAY[${removedFields}]::text[] AS row
    FROM ${quoteIdentifier(tableName)} t
    LIMIT $1
  `;

  const rows = await safeQuery(`preview-${tableName}`, sql, [limit]);
  return rows ? rows.map((item) => item.row) : null;
};

const readTableCount = async (tableName) => {
  if (!(await tableExists(tableName))) return null;

  const rows = await safeQuery(
    `count-${tableName}`,
    `SELECT COUNT(*)::integer AS count FROM ${quoteIdentifier(tableName)}`
  );

  return rows?.[0]?.count ?? null;
};

const loadDatabaseCatalog = async () => {
  const candidates = [
    "students",
    "student_enrollments",
    "employees",
    "student_attendance",
    "employee_attendance",
    "student_fees",
    "payments",
    "receipts",
    "grade_fees",
    "academic_years",
    "holidays",
    "exams",
    "exam_scores",
    "exam_types",
    "timetable_entries",
    "timetable_periods",
    "deletion_archive",
    "student_section_transfers",
    "student_documents",
    "employee_documents",
  ];

  const catalog = {};

  for (const tableName of candidates) {
    const count = await readTableCount(tableName);
    if (count !== null) catalog[tableName] = count;
  }

  return catalog;
};

const loadOverview = async () => {
  const rows = await safeQuery(
    "overview",
    `
      SELECT
        (SELECT COUNT(*)::integer FROM students) AS students_count,
        (SELECT COUNT(*)::integer FROM employees) AS employees_count,
        (
          SELECT COUNT(*)::integer
          FROM employees
          WHERE employee_type = 'معلمة'
        ) AS teachers_count,
        (
          SELECT COUNT(*)::integer
          FROM employees
          WHERE employee_type <> 'معلمة'
        ) AS administrative_employees_count
    `
  );

  return rows?.[0] || null;
};

const loadTeacherDirectory = async () => {
  const rows = await safeQuery(
    "teacher-directory",
    `
      SELECT
        id,
        employee_code,
        full_name,
        employee_type,
        specialization,
        work_shift
      FROM employees
      WHERE employee_type = 'معلمة'
      ORDER BY full_name
      LIMIT $1
    `,
    [MAX_PEOPLE]
  );

  const summary = await safeQuery(
    "teacher-specialization-summary",
    `
      SELECT
        COALESCE(NULLIF(TRIM(specialization), ''), 'غير محدد') AS specialization,
        COUNT(*)::integer AS teachers_count
      FROM employees
      WHERE employee_type = 'معلمة'
      GROUP BY COALESCE(NULLIF(TRIM(specialization), ''), 'غير محدد')
      ORDER BY teachers_count DESC, specialization
    `
  );

  return {
    teachers: rows || [],
    specialization_summary: summary || [],
  };
};

const loadStudentDistribution = async () => {
  const rows = await safeQuery(
    "student-distribution",
    `
      SELECT
        COALESCE(grade, 'غير محدد') AS grade,
        COALESCE(section, 'غير محدد') AS section,
        COALESCE(school_shift, 'غير محدد') AS school_shift,
        COUNT(*)::integer AS students_count
      FROM students
      GROUP BY grade, section, school_shift
      ORDER BY grade, section, school_shift
    `
  );

  return rows || [];
};

const loadAttendance = async () => {
  const [studentsToday, employeesToday] = await Promise.all([
    safeQuery(
      "student-attendance-today",
      `
        SELECT status, COUNT(*)::integer AS count
        FROM student_attendance
        WHERE attendance_date = CURRENT_DATE
        GROUP BY status
        ORDER BY status
      `
    ),
    safeQuery(
      "employee-attendance-today",
      `
        SELECT status, COUNT(*)::integer AS count
        FROM employee_attendance
        WHERE attendance_date = CURRENT_DATE
        GROUP BY status
        ORDER BY status
      `
    ),
  ]);

  return {
    today: {
      students: studentsToday || [],
      employees: employeesToday || [],
    },
  };
};

const loadPayroll = async () => {
  const rows = await safeQuery(
    "payroll",
    `
      SELECT
        id,
        full_name,
        employee_type,
        specialization,
        work_shift,
        salary
      FROM employees
      ORDER BY
        CASE WHEN employee_type = 'معلمة' THEN 0 ELSE 1 END,
        full_name
      LIMIT $1
    `,
    [MAX_PEOPLE]
  );

  return rows || [];
};

const loadTimetable = async () => {
  const [periods, entries] = await Promise.all([
    safeQuery(
      "timetable-periods",
      `
        SELECT
          work_shift,
          period_number,
          TO_CHAR(start_time, 'HH24:MI') AS start_time,
          TO_CHAR(end_time, 'HH24:MI') AS end_time
        FROM timetable_periods
        ORDER BY work_shift, period_number
      `
    ),
    safeQuery(
      "timetable-entries",
      `
        SELECT
          entry.work_shift,
          entry.grade,
          entry.section,
          entry.day_name,
          entry.period_number,
          entry.subject,
          teacher.id AS teacher_id,
          teacher.full_name AS teacher_name,
          teacher.specialization AS teacher_specialization,
          teacher.work_shift AS teacher_work_shift
        FROM timetable_entries entry
        LEFT JOIN employees teacher
          ON teacher.id = entry.teacher_id
        ORDER BY
          entry.work_shift,
          entry.day_name,
          entry.grade,
          entry.section,
          entry.period_number
        LIMIT $1
      `,
      [MAX_TIMETABLE_ROWS]
    ),
  ]);

  return {
    periods: periods || [],
    entries: entries || [],
  };
};

const loadResults = async () => {
  const exams = await safeQuery(
    "exam-summary",
    `
      SELECT
        e.id,
        e.grade,
        e.section,
        e.subject,
        et.name AS exam_type,
        e.exam_name,
        e.exam_date::text AS exam_date,
        e.max_score,
        COUNT(es.id)::integer AS recorded_scores,
        ROUND(AVG(es.score), 2) AS average_score
      FROM exams e
      JOIN exam_types et
        ON et.id = e.exam_type_id
      LEFT JOIN exam_scores es
        ON es.exam_id = e.id
      GROUP BY
        e.id,
        e.grade,
        e.section,
        e.subject,
        et.name,
        e.exam_name,
        e.exam_date,
        e.max_score
      ORDER BY e.exam_date DESC, e.id DESC
      LIMIT $1
    `,
    [MAX_ROWS]
  );

  return exams || [];
};

const loadPeopleIndex = async () => {
  const [students, employees] = await Promise.all([
    safeQuery(
      "student-name-index",
      "SELECT id, full_name FROM students ORDER BY full_name"
    ),
    safeQuery(
      "employee-name-index",
      "SELECT id, full_name FROM employees ORDER BY full_name"
    ),
  ]);

  return {
    students: students || [],
    employees: employees || [],
  };
};

const findMentionedPerson = (message, rows) => {
  const normalizedMessage = normalizeArabic(message);

  return [...(rows || [])]
    .filter((row) => {
      const normalizedName = normalizeArabic(row.full_name);
      return normalizedName.length >= 4 && normalizedMessage.includes(normalizedName);
    })
    .sort(
      (a, b) =>
        normalizeArabic(b.full_name).length - normalizeArabic(a.full_name).length
    )[0] || null;
};

const loadStudentDetail = async (studentId, wants) => {
  const rows = await safeQuery(
    "student-detail",
    `
      SELECT
        id,
        full_name,
        gender,
        birth_date,
        grade,
        section,
        school_shift,
        phone,
        address
      FROM students
      WHERE id = $1
      LIMIT 1
    `,
    [studentId]
  );

  const row = rows?.[0];
  if (!row) return null;

  const student = {
    id: row.id,
    full_name: row.full_name,
    gender: row.gender,
    birth_date: row.birth_date,
    grade: row.grade,
    section: row.section,
    school_shift: row.school_shift,
  };

  if (wants.contact) {
    student.phone = row.phone;
    student.address = row.address;
  }

  const detail = { student };

  if (wants.attendance) {
    detail.attendance = (await safeQuery(
      "student-attendance-detail",
      `
        SELECT
          sa.attendance_date::text AS attendance_date,
          sa.status,
          sa.notes
        FROM student_attendance sa
        JOIN student_enrollments se
          ON se.id = sa.student_enrollment_id
        WHERE se.student_id = $1
        ORDER BY sa.attendance_date DESC
        LIMIT 90
      `,
      [studentId]
    )) || [];
  }

  if (wants.finance) {
    detail.finance = (await safeQuery(
      "student-finance-detail",
      `
        SELECT
          sf.academic_year,
          sf.total_fee,
          COALESCE(sf.discount, 0) AS discount,
          COALESCE(SUM(p.amount), 0) AS paid,
          (
            sf.total_fee
            - COALESCE(sf.discount, 0)
            - COALESCE(SUM(p.amount), 0)
          ) AS remaining
        FROM student_fees sf
        LEFT JOIN payments p
          ON p.student_fee_id = sf.id
        WHERE sf.student_id = $1
        GROUP BY
          sf.id,
          sf.academic_year,
          sf.total_fee,
          sf.discount
        ORDER BY sf.academic_year DESC
      `,
      [studentId]
    )) || [];
  }

  if (wants.results) {
    detail.results = (await safeQuery(
      "student-results-detail",
      `
        SELECT
          e.subject,
          et.name AS exam_type,
          e.exam_name,
          e.exam_date::text AS exam_date,
          e.max_score,
          es.score,
          es.note
        FROM exam_scores es
        JOIN exams e
          ON e.id = es.exam_id
        JOIN exam_types et
          ON et.id = e.exam_type_id
        WHERE es.student_id = $1
        ORDER BY e.exam_date DESC, e.id DESC
        LIMIT 120
      `,
      [studentId]
    )) || [];
  }

  return detail;
};

const loadEmployeeDetail = async (employeeId, wants) => {
  const rows = await safeQuery(
    "employee-detail",
    `
      SELECT
        id,
        employee_code,
        full_name,
        employee_type,
        specialization,
        work_shift,
        phone,
        address,
        salary
      FROM employees
      WHERE id = $1
      LIMIT 1
    `,
    [employeeId]
  );

  const row = rows?.[0];
  if (!row) return null;

  const employee = {
    id: row.id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    employee_type: row.employee_type,
    specialization: row.specialization,
    work_shift: row.work_shift,
  };

  if (wants.contact) {
    employee.phone = row.phone;
    employee.address = row.address;
  }

  if (wants.payroll) {
    employee.salary = row.salary;
  }

  const detail = { employee };

  if (wants.attendance) {
    detail.attendance = (await safeQuery(
      "employee-attendance-detail",
      `
        SELECT
          attendance_date::text AS attendance_date,
          status,
          notes,
          TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
          TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time,
          late_minutes
        FROM employee_attendance
        WHERE employee_id = $1
        ORDER BY attendance_date DESC
        LIMIT 90
      `,
      [employeeId]
    )) || [];
  }

  if (wants.timetable) {
    detail.timetable = (await safeQuery(
      "employee-timetable-detail",
      `
        SELECT
          work_shift,
          grade,
          section,
          day_name,
          period_number,
          subject
        FROM timetable_entries
        WHERE teacher_id = $1
        ORDER BY work_shift, day_name, period_number
        LIMIT 150
      `,
      [employeeId]
    )) || [];
  }

  return detail;
};

const loadTableGroup = async (groupName) => {
  const tables = TABLE_GROUPS[groupName] || [];
  const result = {};

  for (const tableName of tables) {
    const preview = await readTablePreview(tableName);
    if (preview !== null) result[tableName] = preview;
  }

  return result;
};

const buildAssistantDatabaseContext = async (message) => {
  const normalized = normalizeArabic(message);

  const wants = {
    staff: containsAny(normalized, KEYWORDS.staff),
    students: containsAny(normalized, KEYWORDS.students),
    attendance: containsAny(normalized, KEYWORDS.attendance),
    finance: containsAny(normalized, KEYWORDS.finance),
    payroll: containsAny(normalized, KEYWORDS.payroll),
    timetable: containsAny(normalized, KEYWORDS.timetable),
    results: containsAny(normalized, KEYWORDS.results),
    holidays: containsAny(normalized, KEYWORDS.holidays),
    archive: containsAny(normalized, KEYWORDS.archive),
    transfers: containsAny(normalized, KEYWORDS.transfers),
    academic: containsAny(normalized, KEYWORDS.academic),
    documents: containsAny(normalized, KEYWORDS.documents),
    contact: containsAny(normalized, KEYWORDS.contact),
    broad: containsAny(normalized, KEYWORDS.broad),
  };

  const context = {
    read_only: true,
    generated_at: new Date().toISOString(),
    school_overview: await loadOverview(),
    database_catalog: await loadDatabaseCatalog(),
  };

  const people = await loadPeopleIndex();
  const mentionedStudent = findMentionedPerson(message, people.students);
  const mentionedEmployee = findMentionedPerson(message, people.employees);

  if (wants.staff || wants.timetable || wants.payroll || wants.broad) {
    context.staff = await loadTeacherDirectory();
  }

  if (wants.students || wants.broad) {
    context.student_distribution = await loadStudentDistribution();
  }

  if (wants.attendance || wants.broad) {
    context.attendance = await loadAttendance();
  }

  if (wants.payroll) {
    context.payroll = await loadPayroll();
  }

  if (wants.timetable) {
    context.timetable = await loadTimetable();
  }

  if (wants.results || wants.broad) {
    context.results = await loadResults();
  }

  if (wants.finance) {
    context.finance = await loadTableGroup("finance");
  }

  if (wants.holidays) {
    context.holidays = await loadTableGroup("holidays");
  }

  if (wants.archive) {
    context.deletion_archive = await loadTableGroup("archive");
  }

  if (wants.transfers) {
    context.student_transfers = await loadTableGroup("transfers");
  }

  if (wants.academic) {
    context.academic_years = await loadTableGroup("academic");
  }

  if (wants.documents) {
    context.documents = await loadTableGroup("documents");
  }

  if (mentionedStudent) {
    context.mentioned_student = await loadStudentDetail(
      mentionedStudent.id,
      wants
    );
  }

  if (mentionedEmployee) {
    context.mentioned_employee = await loadEmployeeDetail(
      mentionedEmployee.id,
      wants
    );
  }

  return context;
};

module.exports = {
  buildAssistantDatabaseContext,
};