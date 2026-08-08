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

const includesAny = (text, words) =>
  words.some((word) => text.includes(normalizeArabic(word)));

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "غير مسجل");
  return `${Math.round(number).toLocaleString("en-US")} دينار`;
};

const formatStatusRows = (rows = []) => {
  if (!rows.length) return "لا توجد سجلات حضور لليوم.";

  return rows
    .map((row) => `- ${row.status}: ${row.count}`)
    .join("\n");
};

const knownSubjects = [
  "رياضيات",
  "عربي",
  "لغة عربية",
  "انكليزي",
  "انجليزي",
  "لغة انكليزية",
  "لغة انجليزية",
  "فيزياء",
  "كيمياء",
  "احياء",
  "إحياء",
  "اسلامية",
  "إسلامية",
  "اجتماعيات",
  "حاسوب",
  "فنية",
  "رياضة",
];

const findSubject = (message) => {
  const normalized = normalizeArabic(message);

  return knownSubjects.find((subject) =>
    normalized.includes(normalizeArabic(subject))
  ) || null;
};

const directSalaryAnswer = (message, databaseContext) => {
  const normalized = normalizeArabic(message);

  if (!includesAny(normalized, ["راتب", "رواتب", "راتبها", "راتبه"])) {
    return null;
  }

  const mentionedEmployee = databaseContext?.mentioned_employee?.employee;

  if (
    mentionedEmployee &&
    mentionedEmployee.salary !== undefined &&
    mentionedEmployee.salary !== null
  ) {
    return `راتب **${mentionedEmployee.full_name}** المسجل في النظام هو **${formatMoney(
      mentionedEmployee.salary
    )}**.`;
  }

  const payroll = Array.isArray(databaseContext?.payroll)
    ? databaseContext.payroll
    : [];

  if (!payroll.length) return null;

  const wantsTeachers = includesAny(normalized, [
    "معلمة",
    "معلمات",
    "المعلمات",
  ]);

  const rows = wantsTeachers
    ? payroll.filter((row) => row.employee_type === "معلمة")
    : payroll;

  if (!rows.length) return null;

  if (includesAny(normalized, ["مجموع", "اجمالي", "إجمالي"])) {
    const total = rows.reduce((sum, row) => sum + Number(row.salary || 0), 0);
    return `إجمالي الرواتب المسجلة هو **${formatMoney(total)}** لعدد **${
      rows.length
    }** ${wantsTeachers ? "معلمة" : "موظف/معلمة"}.`;
  }

  const lines = rows.map(
    (row, index) =>
      `${index + 1}. **${row.full_name}** — ${formatMoney(row.salary)}${
        row.specialization ? ` — ${row.specialization}` : ""
      }`
  );

  return `${wantsTeachers ? "رواتب المعلمات" : "الرواتب"} المسجلة حاليًا:\n\n${lines.join(
    "\n"
  )}`;
};

const directSpecializationAnswer = (message, databaseContext) => {
  const normalized = normalizeArabic(message);

  const staff = databaseContext?.staff;
  const teachers = Array.isArray(staff?.teachers) ? staff.teachers : [];

  if (!teachers.length) return null;

  const subject = findSubject(message);

  if (
    subject &&
    includesAny(normalized, ["كم", "عدد", "معلمة", "معلمات", "اختصاص", "تخصص"])
  ) {
    const wanted = normalizeArabic(subject);

    const matches = teachers.filter((teacher) =>
      normalizeArabic(teacher.specialization || "").includes(wanted)
    );

    if (!matches.length) {
      return `لا توجد معلمة مسجلة حاليًا باختصاص **${subject}** في بيانات الكادر.`;
    }

    return `عدد المعلمات اللاتي يظهر في اختصاصهن **${subject}** هو **${
      matches.length
    }**:\n\n${matches
      .map(
        (teacher, index) =>
          `${index + 1}. **${teacher.full_name}**${
            teacher.specialization ? ` — ${teacher.specialization}` : ""
          }`
      )
      .join("\n")}`;
  }

  const mentionedEmployee = databaseContext?.mentioned_employee?.employee;

  if (
    mentionedEmployee &&
    includesAny(normalized, ["اختصاص", "تخصص", "تدرس", "مادة"])
  ) {
    return `اختصاص **${mentionedEmployee.full_name}** المسجل هو: **${
      mentionedEmployee.specialization || "غير محدد"
    }**.`;
  }

  if (
    includesAny(normalized, [
      "اختصاصات المعلمات",
      "تخصصات المعلمات",
      "اختصاص المعلمات",
    ])
  ) {
    const summary = Array.isArray(staff?.specialization_summary)
      ? staff.specialization_summary
      : [];

    if (!summary.length) return null;

    return `اختصاصات المعلمات المسجلة حاليًا:\n\n${summary
      .map(
        (item) =>
          `- **${item.specialization}**: ${item.teachers_count} معلمة`
      )
      .join("\n")}`;
  }

  return null;
};

const directOverviewAnswer = (message, databaseContext) => {
  const normalized = normalizeArabic(message);
  const overview = databaseContext?.school_overview;

  if (!overview) return null;

  if (
    includesAny(normalized, [
      "كم عدد الطلاب",
      "عدد الطلاب",
      "عدد الطلبة",
      "كم طالب",
    ])
  ) {
    return `عدد الطلاب المسجلين حاليًا هو **${overview.students_count}** طالبًا وطالبة.`;
  }

  if (
    includesAny(normalized, [
      "كم عدد المعلمات",
      "عدد المعلمات",
      "كم معلمة",
    ]) &&
    !findSubject(message)
  ) {
    return `عدد المعلمات المسجلات حاليًا هو **${overview.teachers_count}** معلمة.`;
  }

  if (
    includesAny(normalized, [
      "كم عدد الموظفين",
      "عدد الموظفين",
      "عدد الكادر",
    ])
  ) {
    return `إجمالي الكادر المسجل حاليًا هو **${overview.employees_count}**، منهم **${overview.teachers_count}** معلمة و**${overview.administrative_employees_count}** من الموظفين الإداريين.`;
  }

  return null;
};

const directAttendanceAnswer = (message, databaseContext) => {
  const normalized = normalizeArabic(message);

  if (!includesAny(normalized, ["حضور", "غياب", "غائب", "غائبة"])) {
    return null;
  }

  const attendance = databaseContext?.attendance?.today;
  if (!attendance) return null;

  if (includesAny(normalized, ["طلاب", "طالب", "طلبة"])) {
    return `حضور الطلاب لليوم:\n\n${formatStatusRows(attendance.students)}`;
  }

  if (includesAny(normalized, ["موظف", "موظفين", "معلمات", "كادر"])) {
    return `حضور الكادر لليوم:\n\n${formatStatusRows(attendance.employees)}`;
  }

  return `ملخص الحضور لليوم:\n\n**الطلاب**\n${formatStatusRows(
    attendance.students
  )}\n\n**الكادر**\n${formatStatusRows(attendance.employees)}`;
};

const directPersonDetailAnswer = (message, databaseContext) => {
  const normalized = normalizeArabic(message);
  const employee = databaseContext?.mentioned_employee?.employee;
  const student = databaseContext?.mentioned_student?.student;

  if (
    employee &&
    includesAny(normalized, ["دوام", "معلومات", "تفاصيل", "بيانات"])
  ) {
    const parts = [
      `**الاسم:** ${employee.full_name}`,
      `**النوع الوظيفي:** ${employee.employee_type || "غير محدد"}`,
      `**الاختصاص:** ${employee.specialization || "غير محدد"}`,
      `**الدوام:** ${employee.work_shift || "غير محدد"}`,
    ];

    if (employee.phone) parts.push(`**الهاتف:** ${employee.phone}`);
    if (employee.address) parts.push(`**العنوان:** ${employee.address}`);
    if (employee.salary !== undefined && employee.salary !== null) {
      parts.push(`**الراتب:** ${formatMoney(employee.salary)}`);
    }

    return parts.join("\n");
  }

  if (
    student &&
    includesAny(normalized, ["معلومات", "تفاصيل", "بيانات", "صف", "شعبة", "دوام"])
  ) {
    const parts = [
      `**الاسم:** ${student.full_name}`,
      `**الصف:** ${student.grade || "غير محدد"}`,
      `**الشعبة:** ${student.section || "غير محددة"}`,
      `**الدوام:** ${student.school_shift || "غير محدد"}`,
      `**الجنس:** ${student.gender || "غير محدد"}`,
    ];

    if (student.phone) parts.push(`**الهاتف:** ${student.phone}`);
    if (student.address) parts.push(`**العنوان:** ${student.address}`);

    return parts.join("\n");
  }

  return null;
};

const buildDirectDatabaseAnswer = ({ message, databaseContext }) => {
  if (!databaseContext || typeof databaseContext !== "object") return null;

  return (
    directSalaryAnswer(message, databaseContext) ||
    directSpecializationAnswer(message, databaseContext) ||
    directAttendanceAnswer(message, databaseContext) ||
    directOverviewAnswer(message, databaseContext) ||
    directPersonDetailAnswer(message, databaseContext) ||
    null
  );
};

module.exports = {
  buildDirectDatabaseAnswer,
};