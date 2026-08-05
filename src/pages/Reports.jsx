import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReportPrintHeader from "../components/common/ReportPrintHeader";
import PayrollReport from "../components/payroll/PayrollReport";
import "../styles/reports.css";
import "../styles/reportPrint.css";

const API_BASE = "http://localhost:5000";

const REPORT_SECTIONS = [
  {
    id: "student-attendance",
    code: "ST",
    title: "تقرير حضور الطلاب",
    description:
      "تقارير الغياب والإجازات حسب اليوم أو الشهر أو فترة زمنية والصف والشعبة.",
    features: ["اختيار التاريخ", "الصف والشعبة", "الطلاب كثيرو الغياب"],
  },
  {
    id: "employee-attendance",
    code: "HR",
    title: "تقرير حضور الموظفين",
    description:
      "تقارير الحضور والانصراف والتأخير والغياب للموظفين.",
    features: ["وقت الحضور والانصراف", "حساب التأخير", "تقارير شهرية"],
  },
  {
    id: "fees",
    code: "FN",
    title: "تقرير الأقساط",
    description:
      "تقارير الدفعات والمبالغ المدفوعة والمتبقية والوصولات المالية.",
    features: ["دفعات اليوم والشهر", "المتبقي والمسدد", "تصدير Excel"],
  },
  {
    id: "payroll",
    code: "PY",
    title: "تقرير الرواتب",
    description:
      "كشف الرواتب الشهرية والحضور والغياب والتأخير والاستقطاعات وصافي الراتب.",
    features: ["المعلمات والإداريون", "تصفية شهرية", "طباعة وتصدير Excel"],
  },
];

const STATUS_LABELS = {
  absent: "غائب بدون عذر",
  excused: "مجاز",
  late: "متأخر",
  present: "حاضر",
};

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;

  return { start, end };
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
};

function StudentAttendanceReport({ onBack }) {
  const monthRange = getMonthRange();

  const [mode, setMode] = useState("day");
  const [singleDate, setSingleDate] = useState(getToday());
  const [fromDate, setFromDate] = useState(monthRange.start);
  const [toDate, setToDate] = useState(monthRange.end);
  const [grade, setGrade] = useState("الكل");
  const [section, setSection] = useState("الكل");
  const [schoolShift, setSchoolShift] = useState("الكل");
  const [students, setStudents] = useState([]);
  const [report, setReport] = useState({
    summary: {
      absent_count: 0,
      excused_count: 0,
      late_count: 0,
      absent_students_count: 0,
    },
    records: [],
    frequent_absence_students: [],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const effectiveRange = useMemo(() => {
    if (mode === "day") {
      return { from: singleDate, to: singleDate };
    }

    return { from: fromDate, to: toDate };
  }, [mode, singleDate, fromDate, toDate]);

  const grades = useMemo(
    () =>
      [...new Set(students.map((item) => item.grade).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "ar")
      ),
    [students]
  );

  const sections = useMemo(() => {
    const source =
      grade === "الكل"
        ? students
        : students.filter((item) => item.grade === grade);

    return [...new Set(source.map((item) => item.section).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "ar")
    );
  }, [students, grade]);

  const loadStudents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/students`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب بيانات الطلاب");
      }

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر جلب بيانات الطلاب");
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!effectiveRange.from || !effectiveRange.to) {
      setMessage("حدد التاريخ أو الفترة المطلوبة");
      return;
    }

    if (effectiveRange.from > effectiveRange.to) {
      setMessage("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams({
        from: effectiveRange.from,
        to: effectiveRange.to,
        grade,
        section,
        school_shift: schoolShift,
      });

      const response = await fetch(
        `${API_BASE}/student-attendance/report?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر إعداد التقرير");
      }

      setReport({
        summary: {
          absent_count: Number(data.summary?.absent_count || 0),
          excused_count: Number(data.summary?.excused_count || 0),
          late_count: Number(data.summary?.late_count || 0),
          absent_students_count: Number(
            data.summary?.absent_students_count || 0
          ),
        },
        records: Array.isArray(data.records) ? data.records : [],
        frequent_absence_students: Array.isArray(
          data.frequent_absence_students
        )
          ? data.frequent_absence_students
          : [],
      });
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر إعداد التقرير");
    } finally {
      setLoading(false);
    }
  }, [effectiveRange.from, effectiveRange.to, grade, schoolShift, section]);

  useEffect(() => {
    const timer = window.setTimeout(loadStudents, 0);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  useEffect(() => {
    const timer = window.setTimeout(loadReport, 0);
    return () => window.clearTimeout(timer);
  }, [loadReport, mode, singleDate, fromDate, toDate, grade, section, schoolShift]);

  const exportCsv = () => {
    const headers = [
      "الاسم",
      "وقت الدوام",
      "الصف",
      "الشعبة",
      "التاريخ",
      "الحالة",
      "الملاحظة",
    ];

    const rows = report.records.map((record) => [
      record.full_name || "",
      record.school_shift || "",
      record.grade || "",
      record.section || "",
      record.attendance_date || "",
      STATUS_LABELS[record.status] || record.status || "",
      record.notes || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-attendance-${effectiveRange.from}-${effectiveRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const academicYear =
    report.records.find((record) => record.academic_year)?.academic_year ||
    students.find((student) => student.academic_year)?.academic_year ||
    "";
  const printDate =
    effectiveRange.from === effectiveRange.to
      ? formatDate(effectiveRange.from)
      : `${formatDate(effectiveRange.from)} إلى ${formatDate(
          effectiveRange.to
        )}`;

  return (
    <section className="reports-workspace student-report-workspace report-print-document">
      <header className="reports-workspace-header">
        <button
          type="button"
          className="reports-inner-back"
          onClick={onBack}
        >
          رجوع
        </button>

        <div className="reports-workspace-heading">
          <span className="reports-workspace-code">ST</span>
          <div>
            <h2>تقرير حضور الطلاب</h2>
            <p>
              عرض الغياب والإجازات حسب التاريخ أو الفترة والصف والشعبة.
            </p>
          </div>
        </div>

        <div className="reports-header-actions">
          <button type="button" onClick={window.print}>
            طباعة
          </button>
          <button type="button" onClick={exportCsv}>
            Excel
          </button>
        </div>
      </header>

      {message && <div className="reports-error-message">{message}</div>}

      <section className="reports-filters-card data-list-filters">
        <div className="reports-filter-group">
          <label>نوع التقرير</label>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="day">يومي</option>
            <option value="month">شهري</option>
            <option value="range">فترة مخصصة</option>
          </select>
        </div>

        {mode === "day" ? (
          <div className="reports-filter-group">
            <label>اختر اليوم</label>
            <input
              type="date"
              value={singleDate}
              onChange={(event) => setSingleDate(event.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="reports-filter-group">
              <label>من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="reports-filter-group">
              <label>إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="reports-filter-group">
          <label>الصف</label>
          <select
            value={grade}
            onChange={(event) => {
              setGrade(event.target.value);
              setSection("الكل");
            }}
          >
            <option value="الكل">جميع الصفوف</option>
            {grades.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-filter-group">
          <label>الشعبة</label>
          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
          >
            <option value="الكل">جميع الشعب</option>
            {sections.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-filter-group">
          <label>وقت الدوام</label>
          <select
            value={schoolShift}
            onChange={(event) => setSchoolShift(event.target.value)}
          >
            <option value="الكل">جميع الدوامات</option>
            <option value="صباحي">صباحي</option>
            <option value="ظهري">ظهري</option>
          </select>
        </div>

      </section>

      <ReportPrintHeader
        title="تقرير حضور الطلاب"
        date={printDate}
        academicYear={academicYear}
        shift={schoolShift === "الكل" ? "جميع الدوامات" : schoolShift}
      />

      <section className="reports-summary-grid">
        <article className="reports-summary-card absent">
          <strong>{report.summary.absent_count}</strong>
          <span>حالات الغياب</span>
        </article>

        <article className="reports-summary-card excused">
          <strong>{report.summary.excused_count}</strong>
          <span>حالات الإجازة</span>
        </article>

        <article className="reports-summary-card late">
          <strong>{report.summary.late_count}</strong>
          <span>حالات التأخير</span>
        </article>

        <article className="reports-summary-card students">
          <strong>{report.summary.absent_students_count}</strong>
          <span>طلاب غائبون</span>
        </article>
      </section>

      <section className="reports-table-card data-list-card">
        <div className="reports-table-header data-list-header">
          <div>
            <h3>معاينة الغياب والإجازات</h3>
            <p>
              عرض غير قابل للتعديل قبل الطباعة
            </p>
          </div>
          <span>
            {
              report.records.filter(
                (record) =>
                  record.status === "absent" ||
                  record.status === "excused"
              ).length
            } سجل
          </span>
        </div>

        <div className="reports-table-wrapper data-list-scroll">
          <table className="reports-data-table data-list-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>وقت الدوام</th>
                <th>الصف</th>
                <th>الشعبة</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الملاحظة</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="reports-empty-cell data-list-loading">
                    جاري إعداد التقرير...
                  </td>
                </tr>
              ) : report.records.filter(
                  (record) =>
                    record.status === "absent" ||
                    record.status === "excused"
                ).length > 0 ? (
                report.records
                  .filter(
                    (record) =>
                      record.status === "absent" ||
                      record.status === "excused"
                  )
                  .map((record) => (
                    <tr key={record.id}>
                      <td className="reports-student-name data-list-name">
                        {record.full_name}
                      </td>
                      <td>{record.school_shift || "صباحي"}</td>
                      <td>{record.grade || "غير محدد"}</td>
                      <td>{record.section || "غير محددة"}</td>
                      <td>{formatDate(record.attendance_date)}</td>
                      <td>
                        <span
                          className={`reports-status-badge ${record.status}`}
                        >
                          {STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td>{record.notes || "لا توجد ملاحظة"}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="7" className="reports-empty-cell data-list-empty">
                    لا يوجد غائبون أو مجازون في اليوم أو الفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-warning-card">
        <div className="reports-table-header">
          <div>
            <h3>تنبيه الغياب المتكرر</h3>
            <p>الطلاب الذين وصلوا إلى 3 غيابات أو أكثر خلال الفترة</p>
          </div>
          <span>{report.frequent_absence_students.length}</span>
        </div>

        {report.frequent_absence_students.length > 0 ? (
          <div className="reports-frequent-grid">
            {report.frequent_absence_students.map((student) => (
              <article key={student.student_enrollment_id}>
                <div>
                  <strong>{student.full_name}</strong>
                  <span>
                    {student.grade || "صف غير محدد"} — شعبة{" "}
                    {student.section || "غير محددة"} —{" "}
                    {student.school_shift || "صباحي"}
                  </span>
                </div>
                <b>{student.absence_count} غيابات</b>
              </article>
            ))}
          </div>
        ) : (
          <p className="reports-empty-message">
            لا يوجد طالب وصل إلى 3 غيابات خلال الفترة المحددة
          </p>
        )}
      </section>
    </section>
  );
}


function EmployeeAttendanceReport({ onBack }) {
  const monthRange = getMonthRange();

  const [mode, setMode] = useState("day");
  const [singleDate, setSingleDate] = useState(getToday());
  const [fromDate, setFromDate] = useState(monthRange.start);
  const [toDate, setToDate] = useState(monthRange.end);
  const [employeeType, setEmployeeType] = useState("الكل");
  const [workShift, setWorkShift] = useState("الكل");
  const [employees, setEmployees] = useState([]);
  const [report, setReport] = useState({
    summary: {
      absent_count: 0,
      late_count: 0,
      total_late_minutes: 0,
    },
    records: [],
    frequent_late_employees: [],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const effectiveRange = useMemo(() => {
    if (mode === "day") {
      return { from: singleDate, to: singleDate };
    }

    return { from: fromDate, to: toDate };
  }, [mode, singleDate, fromDate, toDate]);

  const employeeTypes = useMemo(
    () =>
      [
        ...new Set(
          employees
            .map((employee) => employee.employee_type)
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, "ar")),
    [employees]
  );

  const loadEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/employees`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب بيانات الموظفين");
      }

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر جلب بيانات الموظفين");
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!effectiveRange.from || !effectiveRange.to) {
      setMessage("حدد التاريخ أو الفترة المطلوبة");
      return;
    }

    if (effectiveRange.from > effectiveRange.to) {
      setMessage("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams({
        from: effectiveRange.from,
        to: effectiveRange.to,
        employee_type: employeeType,
        work_shift: workShift,
      });

      const response = await fetch(
        `${API_BASE}/employee-attendance/report?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر إعداد تقرير الموظفين");
      }

      setReport({
        summary: {
          absent_count: Number(data.summary?.absent_count || 0),
          late_count: Number(data.summary?.late_count || 0),
          total_late_minutes: Number(
            data.summary?.total_late_minutes || 0
          ),
        },
        records: Array.isArray(data.records) ? data.records : [],
        frequent_late_employees: Array.isArray(
          data.frequent_late_employees
        )
          ? data.frequent_late_employees
          : [],
      });
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر إعداد تقرير الموظفين");
    } finally {
      setLoading(false);
    }
  }, [effectiveRange.from, effectiveRange.to, employeeType, workShift]);

  useEffect(() => {
    const timer = window.setTimeout(loadEmployees, 0);
    return () => window.clearTimeout(timer);
  }, [loadEmployees]);

  useEffect(() => {
    const timer = window.setTimeout(loadReport, 0);
    return () => window.clearTimeout(timer);
  }, [loadReport, mode, singleDate, fromDate, toDate, employeeType, workShift]);

  const exportCsv = () => {
    const headers = [
      "الاسم",
      "نوع الموظف",
      "الشفت",
      "التاريخ",
      "وقت الحضور",
      "وقت الانصراف",
      "دقائق التأخير",
      "ساعات العمل",
      "الحالة",
      "الملاحظة",
    ];

    const rows = report.records.map((record) => [
      record.full_name || "",
      record.employee_type || "",
      record.work_shift || "",
      record.attendance_date || "",
      record.check_in_time || "",
      record.check_out_time || "",
      record.late_minutes || 0,
      record.work_hours || "",
      STATUS_LABELS[record.status] || record.status || "",
      record.notes || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employee-attendance-${effectiveRange.from}-${effectiveRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const visibleRecords = report.records.filter(
    (record) =>
      record.status === "absent" ||
      record.status === "late"
  );
  const printDate =
    effectiveRange.from === effectiveRange.to
      ? formatDate(effectiveRange.from)
      : `${formatDate(effectiveRange.from)} إلى ${formatDate(
          effectiveRange.to
        )}`;

  return (
    <section className="reports-workspace employee-report-workspace report-print-document">
      <header className="reports-workspace-header">
        <button
          type="button"
          className="reports-inner-back"
          onClick={onBack}
        >
          رجوع
        </button>

        <div className="reports-workspace-heading">
          <span className="reports-workspace-code">HR</span>
          <div>
            <h2>تقرير حضور الموظفين</h2>
            <p>
              عرض الغياب والإجازات والتأخير وأوقات الحضور والانصراف.
            </p>
          </div>
        </div>

        <div className="reports-header-actions">
          <button type="button" onClick={window.print}>
            طباعة
          </button>
          <button type="button" onClick={exportCsv}>
            Excel
          </button>
        </div>
      </header>

      {message && <div className="reports-error-message">{message}</div>}

      <section className="reports-filters-card employee-report-filters data-list-filters">
        <div className="reports-filter-group">
          <label>نوع التقرير</label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="day">يومي</option>
            <option value="month">شهري</option>
            <option value="range">فترة مخصصة</option>
          </select>
        </div>

        {mode === "day" ? (
          <div className="reports-filter-group">
            <label>اختر اليوم</label>
            <input
              type="date"
              value={singleDate}
              onChange={(event) => setSingleDate(event.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="reports-filter-group">
              <label>من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="reports-filter-group">
              <label>إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </>
        )}

        <div className="reports-filter-group">
          <label>نوع الموظف</label>
          <select
            value={employeeType}
            onChange={(event) => setEmployeeType(event.target.value)}
          >
            <option value="الكل">جميع الموظفين</option>
            {employeeTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-filter-group">
          <label>شفت الموظف</label>
          <select
            value={workShift}
            onChange={(event) => setWorkShift(event.target.value)}
          >
            <option value="الكل">جميع الشفتات</option>
            <option value="صباحي">صباحي</option>
            <option value="ظهري">ظهري</option>
            <option value="صباحي وظهري">صباحي وظهري</option>
          </select>
        </div>
      </section>

      <ReportPrintHeader
        title="تقرير حضور الموظفين"
        date={printDate}
        shift={workShift === "الكل" ? "جميع الشفتات" : workShift}
      />

      <section className="reports-summary-grid">
        <article className="reports-summary-card absent">
          <strong>{report.summary.absent_count}</strong>
          <span>الغائبون</span>
        </article>

        <article className="reports-summary-card late">
          <strong>{report.summary.late_count}</strong>
          <span>المتأخرون</span>
        </article>

        <article className="reports-summary-card students">
          <strong>{report.summary.total_late_minutes}</strong>
          <span>مجموع دقائق التأخير</span>
        </article>
      </section>

      <section className="reports-table-card data-list-card">
        <div className="reports-table-header data-list-header">
          <div>
            <h3>معاينة الحضور والتأخير</h3>
            <p>عرض غير قابل للتعديل قبل الطباعة</p>
          </div>
          <span>{visibleRecords.length} سجل</span>
        </div>

        <div className="reports-table-wrapper data-list-scroll">
          <table className="reports-data-table employee-report-table data-list-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>نوع الموظف</th>
                <th>الشفت</th>
                <th>التاريخ</th>
                <th>الحضور</th>
                <th>الانصراف</th>
                <th>التأخير</th>
                <th>ساعات العمل</th>
                <th>الحالة</th>
                <th>الملاحظة</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="reports-empty-cell data-list-loading">
                    جاري إعداد التقرير...
                  </td>
                </tr>
              ) : visibleRecords.length > 0 ? (
                visibleRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="reports-student-name data-list-name">
                      {record.full_name}
                    </td>
                    <td>{record.employee_type || "غير محدد"}</td>
                    <td>{record.work_shift || "غير محدد"}</td>
                    <td>{formatDate(record.attendance_date)}</td>
                    <td>{record.check_in_time || "—"}</td>
                    <td>{record.check_out_time || "—"}</td>
                    <td>
                      {Number(record.late_minutes || 0) > 0
                        ? `${record.late_minutes} دقيقة`
                        : "—"}
                    </td>
                    <td>
                      {record.work_hours
                        ? `${record.work_hours} ساعة`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`reports-status-badge ${record.status}`}
                      >
                        {STATUS_LABELS[record.status] || record.status}
                      </span>
                    </td>
                    <td>{record.notes || "لا توجد ملاحظة"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="reports-empty-cell data-list-empty">
                    لا توجد حالات غياب أو إجازة أو تأخير في الفترة
                    المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-warning-card">
        <div className="reports-table-header">
          <div>
            <h3>تنبيه التأخير المتكرر</h3>
            <p>الموظفون الذين تأخروا 3 مرات أو أكثر خلال الفترة</p>
          </div>
          <span>{report.frequent_late_employees.length}</span>
        </div>

        {report.frequent_late_employees.length > 0 ? (
          <div className="reports-frequent-grid">
            {report.frequent_late_employees.map((employee) => (
              <article key={employee.employee_id}>
                <div>
                  <strong>{employee.full_name}</strong>
                  <span>
                    {employee.employee_type || "موظف"} —{" "}
                    {employee.work_shift || "شفت غير محدد"}
                  </span>
                </div>
                <b>
                  {employee.late_count} تأخيرات —{" "}
                  {employee.total_late_minutes} دقيقة
                </b>
              </article>
            ))}
          </div>
        ) : (
          <p className="reports-empty-message">
            لا يوجد موظف وصل إلى 3 تأخيرات خلال الفترة المحددة
          </p>
        )}
      </section>
    </section>
  );
}

function ReportPlaceholder({ report, onBack }) {
  return (
    <section className="reports-workspace">
      <header className="reports-workspace-header">
        <button
          type="button"
          className="reports-inner-back"
          onClick={onBack}
        >
          رجوع
        </button>

        <div className="reports-workspace-heading">
          <span className="reports-workspace-code">{report.code}</span>
          <div>
            <h2>{report.title}</h2>
            <p>{report.description}</p>
          </div>
        </div>
      </header>

      <div className="reports-coming-card">
        <strong>القسم جاهز للبدء</strong>
        <p>سيتم تفعيله في الخطوة التالية.</p>
      </div>
    </section>
  );
}

export default function Reports() {
  const [searchParams] = useSearchParams();
  const requestedReport = searchParams.get("report") || "";
  const requestedEmployeeId = searchParams.get("employee_id");
  const [activeReport, setActiveReport] = useState(
    REPORT_SECTIONS.some((report) => report.id === requestedReport)
      ? requestedReport
      : ""
  );

  const selectedReport = REPORT_SECTIONS.find(
    (report) => report.id === activeReport
  );

  return (
    <main className="main-content reports-page" dir="rtl">
      {!selectedReport ? (
        <>
          <header className="reports-page-header">
            <div>
              <h1>مركز التقارير</h1>
              <p>
                اختر نوع التقرير المطلوب لعرض البيانات وطباعتها أو
                تصديرها.
              </p>
            </div>
          </header>

          <section className="reports-grid">
            {REPORT_SECTIONS.map((report) => (
              <button
                key={report.id}
                type="button"
                className={`report-card report-card-${report.id}`}
                onClick={() => setActiveReport(report.id)}
              >
                <span className="report-card-code">{report.code}</span>

                <div className="report-card-content">
                  <h2>{report.title}</h2>
                  <p>{report.description}</p>

                  <div className="report-card-features">
                    {report.features.map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                  </div>
                </div>

                <span className="report-card-arrow">←</span>
              </button>
            ))}
          </section>
        </>
      ) : selectedReport.id === "student-attendance" ? (
        <StudentAttendanceReport onBack={() => setActiveReport("")} />
      ) : selectedReport.id === "employee-attendance" ? (
        <EmployeeAttendanceReport onBack={() => setActiveReport("")} />
      ) : selectedReport.id === "payroll" ? (
        <PayrollReport
          title={requestedEmployeeId ? "تقرير راتب الموظف" : "تقرير الرواتب"}
          employeeId={requestedEmployeeId}
          onBack={() => setActiveReport("")}
        />
      ) : (
        <ReportPlaceholder
          report={selectedReport}
          onBack={() => setActiveReport("")}
        />
      )}
    </main>
  );
}
