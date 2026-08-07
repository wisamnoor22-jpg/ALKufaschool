import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import ReportPrintHeader from "../components/common/ReportPrintHeader";
import "../styles/Dashboard.css";
import "../styles/reportPrint.css";
import schoolLogo from "../images/logo.png";

const STATISTICS_URL = "http://localhost:5000/dashboard/statistics";
const SCHOOL_TIME_ZONE = "Asia/Baghdad";

const EMPTY_STATISTICS = {
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
  },
  employees: { total: 0, addedThisMonth: 0, byType: [], byShift: [] },
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
    limitations: [],
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
  },
  archive: { total: 0 },
  sectionErrors: {},
};

const numberFormatter = new Intl.NumberFormat("ar-IQ", {
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("ar-IQ", {
  style: "currency",
  currency: "IQD",
  maximumFractionDigits: 0,
});

const formatNumber = (value) =>
  numberFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatCurrency = (value) =>
  currencyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatClockTime = (value) => value || "—";

const formatSchoolDate = (date) => {
  const weekday = new Intl.DateTimeFormat("ar-IQ", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
  }).format(date);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SCHOOL_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return `${weekday} ${parts.day}-${parts.month}-${parts.year}`;
};

const sections = [
  { title: "الطلاب", description: "إدارة ملفات الطلبة", path: "/students", code: "ST" },
  { title: "الكادر", description: "الموظفون والحضور", path: "/teachers", code: "HR" },
  { title: "الحسابات", description: "الأقساط والدفعات", path: "/fees", code: "FN" },
  { title: "الحضور", description: "الحضور والغياب", path: "/attendance", code: "AT" },
  { title: "الرواتب", description: "رواتب الكادر والاستقطاعات", path: "/payroll", code: "PY" },
  { title: "الدرجات", description: "النتائج والتقييمات", path: "/results", code: "GR" },
  { title: "الجداول", description: "الجداول الدراسية", path: "/timetable", code: "SC" },
  { title: "التقارير", description: "مركز التقارير", path: "/reports", code: "RP" },
  {
    title: "سجل المحذوفات",
    description: "الأرشيف الإداري للعناصر المحذوفة",
    path: "/deletion-archive",
    code: "DA",
    showsArchiveCount: true,
  },
  { title: "الإعدادات", description: "إعدادات النظام", path: "/settings", code: "SE" },
];

function Donut({ value, color, label }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} className="donut-track" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="donut-progress"
          style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="donut-value">
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statisticsError, setStatisticsError] = useState("");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const inFlightRequestRef = useRef(null);
  const requestControllerRef = useRef(null);
  const hasStatisticsRef = useRef(false);
  const refreshStatistics = useCallback((initialLoad = false) => {
    if (inFlightRequestRef.current) {
      return inFlightRequestRef.current;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (initialLoad && !hasStatisticsRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const request = (async () => {
      try {
        const response = await fetch(STATISTICS_URL, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "تعذر تحديث لوحة التحكم");
        }

        if (!controller.signal.aborted) {
          hasStatisticsRef.current = true;
          setStatistics(data);
          setStatisticsError("");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatisticsError(
            error.message || "تعذر تحديث إحصائيات لوحة التحكم"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }

        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
          inFlightRequestRef.current = null;
        }
      }
    })();

    inFlightRequestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      refreshStatistics(true);
    }, 0);
    const interval = window.setInterval(() => {
      refreshStatistics();
    }, 60_000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshStatistics();
      }
    };

    const refreshOnFocus = () => refreshStatistics();

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      inFlightRequestRef.current = null;
    };
  }, [refreshStatistics]);

  useEffect(() => {
    const dateTimer = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 60_000);

    return () => window.clearInterval(dateTimer);
  }, []);

  const dateText = useMemo(() => formatSchoolDate(currentDate), [currentDate]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return sections.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [search]);

  const stats = statistics || EMPTY_STATISTICS;
  const partialErrorCount = Object.keys(stats.sectionErrors || {}).length;
  const lastUpdatedText = statistics?.generatedAt
    ? new Intl.DateTimeFormat("ar-IQ", {
        timeZone: SCHOOL_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(statistics.generatedAt))
    : "لم يتم التحديث بعد";

  const notifications = [
    {
      id: "late-employees",
      title: "تأخير الموظفين اليوم",
      summary: `${formatNumber(stats.employeeAttendance.late)} موظف متأخر`,
      details: `مجموع التأخير ${formatNumber(
        stats.employeeAttendance.totalLateMinutes
      )} دقيقة.`,
      path: "/attendance",
      unread: stats.employeeAttendance.late > 0,
    },
    {
      id: "today-payments",
      title: "دفعات اليوم",
      summary: `${formatNumber(
        stats.finance.paymentsTodayCount
      )} دفعة مسجلة`,
      details: `المجموع ${formatCurrency(
        stats.finance.paymentsTodayAmount
      )}.`,
      path: "/fees",
      unread: stats.finance.paymentsTodayCount > 0,
    },
    {
      id: "dashboard-health",
      title: "حالة تحديث الإحصائيات",
      summary:
        partialErrorCount > 0
          ? `${formatNumber(partialErrorCount)} قسم يحتاج إعادة تحديث`
          : "جميع الأقسام محدثة",
      details: `آخر تحديث: ${lastUpdatedText}`,
      path: "/dashboard",
      unread: partialErrorCount > 0,
    },
  ];

  const unreadCount = notifications.filter((item) => item.unread).length;
  const dailyHighlights = [
    {
      id: "payments",
      label: "الدفعات المسجلة اليوم",
      value: formatNumber(stats.finance.paymentsTodayCount),
    },
    {
      id: "students",
      label: "طلاب أضيفوا هذا الشهر",
      value: formatNumber(stats.students.addedThisMonth),
    },
    {
      id: "employees",
      label: "موظفون أضيفوا هذا الشهر",
      value: formatNumber(stats.employees.addedThisMonth),
    },
    {
      id: "archive",
      label: "عناصر في سجل المحذوفات",
      value: formatNumber(stats.archive.total),
    },
  ];

  return (
    <div className="founder-dashboard" dir="rtl">
      <header className="founder-header">
        <div className="brand-area">
          <img src={schoolLogo} alt="شعار المدرسة" />
          <div>
            <h1>مدرسة الكوفة الأهلية التكميلية المختلطة</h1>
            <p>مرحبًا بك، بحساب المؤسس</p>
          </div>
        </div>

        <div className="header-tools">
          <div className="notifications">
            <button
              type="button"
              className="icon-button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="الإشعارات"
            >
              !
              {unreadCount > 0 && <b>{unreadCount}</b>}
            </button>

            {notificationsOpen && (
              <div className="notifications-menu">
                <div className="menu-title">
                  <strong>الإشعارات</strong>
                  <span>{unreadCount} غير مقروء</span>
                </div>

                {notifications.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`notification-item ${item.unread ? "unread" : ""}`}
                    onClick={() => navigate(item.path)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                    <small>{item.details}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="statistics-refresh-button"
            onClick={() => refreshStatistics()}
            disabled={loading || refreshing}
            aria-label="تحديث الإحصائيات"
          >
            <span aria-hidden="true">↻</span>
            {loading || refreshing ? "جاري التحديث..." : "تحديث الإحصائيات"}
          </button>

          <div className="date-chip">{dateText}</div>

          <div className="global-search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث سريع في النظام..."
            />

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((item) => (
                  <button key={item.path} type="button" onClick={() => navigate(item.path)}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="logout-button" onClick={() => navigate("/")}>تسجيل الخروج</button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-refresh-bar" aria-live="polite">
          <div>
            <strong>
              {loading ? "جاري تحميل الإحصائيات..." : "الإحصائيات محدثة"}
            </strong>
            <span>آخر تحديث: {lastUpdatedText}</span>
          </div>
        </section>

        {statisticsError && (
          <div className="dashboard-error" role="alert">
            <span>{statisticsError}</span>
            <button type="button" onClick={() => refreshStatistics()}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {partialErrorCount > 0 && (
          <div className="dashboard-partial-warning" role="status">
            تعذر تحديث {formatNumber(partialErrorCount)} قسم، بينما بقيت بقية
            الإحصائيات متاحة.
          </div>
        )}

        <section className="top-grid">
          <article className="panel employee-panel">
            <div className="panel-heading">
              <div>
                <h2>حضور الموظفين اليوم</h2>
                <p>ملخص مباشر لسجل الحضور في تاريخ المدرسة</p>
              </div>
              <div className="employee-summary">
                <span className="present">
                  {formatNumber(stats.employeeAttendance.present)} حاضر
                </span>
                <span className="late">
                  {formatNumber(stats.employeeAttendance.late)} متأخر
                </span>
                <span className="absent">
                  {formatNumber(stats.employeeAttendance.absent)} غائب
                </span>
              </div>
            </div>

            <div className="employee-metrics-grid">
              <div className="dashboard-metric">
                <span>إجمالي الموظفين</span>
                <strong>{formatNumber(stats.employeeAttendance.totalEmployees)}</strong>
              </div>
              <div className="dashboard-metric inside">
                <span>داخل المدرسة الآن</span>
                <strong>{formatNumber(stats.employeeAttendance.currentlyInside)}</strong>
              </div>
              <div className="dashboard-metric">
                <span>سجلوا وقت خروج</span>
                <strong>{formatNumber(stats.employeeAttendance.checkedOut)}</strong>
              </div>
              <div className="dashboard-metric late-minutes">
                <span>مجموع دقائق التأخير</span>
                <strong>
                  {formatNumber(stats.employeeAttendance.totalLateMinutes)} دقيقة
                </strong>
              </div>
              <div className="dashboard-metric">
                <span>متوسط التأخير</span>
                <strong>
                  {formatNumber(stats.employeeAttendance.averageLateMinutes)} دقيقة
                </strong>
              </div>
              <div className="dashboard-metric">
                <span>آخر دخول</span>
                <strong>{formatClockTime(stats.employeeAttendance.latestCheckIn)}</strong>
              </div>
              <div className="dashboard-metric">
                <span>آخر خروج</span>
                <strong>{formatClockTime(stats.employeeAttendance.latestCheckOut)}</strong>
              </div>
            </div>
            <div className="distribution-list shift-distribution" aria-label="حضور الموظفين حسب الشفت">
              {stats.employeeAttendance.byShift.length > 0 ? (
                stats.employeeAttendance.byShift.map((item) => (
                  <div key={item.workShift}>
                    <span>{item.workShift}</span>
                    <strong>
                      {formatNumber(Number(item.present) + Number(item.late))} حاضر · {formatNumber(item.absent)} غائب
                    </strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات حضور موزعة حسب الشفت.</p>
              )}
            </div>
          </article>

          <article className="panel financial-panel" onClick={() => navigate("/fees")}>
            <div className="panel-heading">
              <div>
                <h2>الحالة المالية للمدرسة</h2>
                <p>ملخص السنة الدراسية {stats.finance.academicYear || "النشطة"}</p>
              </div>
              <span className="trend">
                {formatNumber(stats.finance.collectionRate)}% تحصيل
              </span>
            </div>

            <div className="financial-body">
              <Donut
                value={stats.finance.collectionRate}
                color="#20a464"
                label="نسبة التحصيل"
              />
              <div className="financial-values">
                <div>
                  <span className="required-dot" />
                  <p>إجمالي الرسوم المطلوبة</p>
                  <strong>{formatCurrency(stats.finance.totalRequired)}</strong>
                </div>
                <div>
                  <span className="paid-dot" />
                  <p>إجمالي المدفوع</p>
                  <strong>{formatCurrency(stats.finance.totalPaid)}</strong>
                </div>
                <div>
                  <span className="remaining-dot" />
                  <p>إجمالي المتبقي</p>
                  <strong>{formatCurrency(stats.finance.totalRemaining)}</strong>
                </div>
                <div className="payment-counts">
                  <span>
                    {formatNumber(stats.finance.fullyPaidStudents)} مسدد بالكامل
                  </span>
                  <span>
                    {formatNumber(stats.finance.partiallyPaidStudents)} مسدد جزئيًا
                  </span>
                  <span>
                    {formatNumber(stats.finance.unpaidStudents)} غير مسدد
                  </span>
                </div>
              </div>
            </div>

            <div className="finance-details-grid">
              <div>
                <span>دفعات اليوم</span>
                <strong>{formatNumber(stats.finance.paymentsTodayCount)}</strong>
                <small>{formatCurrency(stats.finance.paymentsTodayAmount)}</small>
              </div>
              <div>
                <span>دفعات الشهر</span>
                <strong>{formatNumber(stats.finance.paymentsThisMonthCount)}</strong>
                <small>{formatCurrency(stats.finance.paymentsThisMonthAmount)}</small>
              </div>
              <div>
                <span>طلاب عليهم رصيد</span>
                <strong>{formatNumber(stats.finance.studentsWithBalance)}</strong>
              </div>
              <div>
                <span>أعلى صف في المتبقي</span>
                <strong>
                  {stats.finance.highestOutstandingGrade?.grade || "—"}
                </strong>
                <small>
                  {stats.finance.highestOutstandingGrade
                    ? formatCurrency(
                        stats.finance.highestOutstandingGrade.remaining
                      )
                    : "لا يوجد رصيد"}
                </small>
              </div>
            </div>
          </article>
        </section>

        <section className="middle-grid">
          <button type="button" className="panel attendance-panel" onClick={() => setAttendanceOpen(true)}>
            <div className="panel-heading">
              <div>
                <h2>حضور الطلاب اليوم</h2>
                <p>اضغط لعرض ملخص الغياب حسب الصف</p>
              </div>
            </div>
            <div className="attendance-body">
              <Donut
                value={stats.studentAttendance.attendanceRate}
                color="#2ca66f"
                label="نسبة الحضور"
              />
              <div className="attendance-numbers">
                <span>
                  <b>{formatNumber(stats.studentAttendance.totalActiveStudents)}</b>
                  إجمالي نشط
                </span>
                <span>
                  <b>{formatNumber(stats.studentAttendance.present)}</b> حاضر
                </span>
                <span>
                  <b>{formatNumber(stats.studentAttendance.absentWithoutExcuse)}</b>
                  غائب دون عذر
                </span>
                <span>
                  <b>{formatNumber(stats.studentAttendance.onLeave)}</b> مجاز
                </span>
                <span>
                  <b>
                    {stats.studentAttendance.absentWithExcuse === null
                      ? "—"
                      : formatNumber(stats.studentAttendance.absentWithExcuse)}
                  </b>
                  غائب بعذر
                </span>
              </div>
            </div>
            <div className="attendance-top-grade">
              <span>أكثر صف فيه غياب اليوم</span>
              <strong>
                {stats.studentAttendance.topAbsentGrade?.grade || "لا يوجد غياب"}
              </strong>
            </div>
            <div className="distribution-list shift-distribution" aria-label="حضور الطلاب حسب الدوام">
              {stats.studentAttendance.byShift.length > 0 ? (
                stats.studentAttendance.byShift.map((item) => (
                  <div key={item.schoolShift}>
                    <span>{item.schoolShift}</span>
                    <strong>
                      {formatNumber(item.present)} حاضر · {formatNumber(
                        Number(item.absentWithoutExcuse) + Number(item.onLeave)
                      )} غائب
                    </strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات حضور موزعة حسب الدوام.</p>
              )}
            </div>
          </button>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>ماذا تغير اليوم؟</h2>
                <p>مؤشرات محدثة من قاعدة البيانات</p>
              </div>
            </div>
            <div className="simple-list">
              {dailyHighlights.map((item) => (
                <div key={item.id}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>حالة الأنظمة</h2>
                <p>حالة مصادر لوحة التحكم</p>
              </div>
            </div>
            <div className="systems-list">
              <div>
                <span className={`system-dot ${statistics ? "online" : "warning"}`} />
                <strong>الخادم وقاعدة البيانات</strong>
                <small>{statistics ? "متصل" : "بانتظار الاتصال"}</small>
              </div>
              <div>
                <span className={`system-dot ${partialErrorCount ? "warning" : "online"}`} />
                <strong>أقسام الإحصائيات</strong>
                <small>{partialErrorCount ? "تحديث جزئي" : "محدثة"}</small>
              </div>
              <div>
                <span className="system-dot online" />
                <strong>توقيت المدرسة</strong>
                <small>{statistics?.timeZone || SCHOOL_TIME_ZONE}</small>
              </div>
              <div>
                <span className="system-dot warning" />
                <strong>جهاز البصمة</strong>
                <small>لا يوجد مصدر حالة مربوط</small>
              </div>
            </div>
          </article>

          <article className="panel backup-panel">
            <div className="panel-heading"><div><h2>النسخة الاحتياطية</h2><p>حماية بيانات المدرسة</p></div></div>
            <span className="backup-badge unavailable">غير مربوط</span>
            <strong>لا توجد إحصائية نسخ احتياطي</strong>
            <p>لم يُعثر على جدول أو خدمة تحفظ وقت وحالة آخر نسخة احتياطية.</p>
            <button type="button" onClick={() => navigate("/settings")}>إدارة النسخ الاحتياطية</button>
          </article>
        </section>

        <section className="entity-statistics-grid">
          <article className="panel entity-stat-card">
            <div className="panel-heading">
              <div>
                <h2>إحصائيات الطلاب</h2>
                <p>التوزيع الحالي حسب النوع والصف</p>
              </div>
            </div>
            <div className="entity-summary">
              <div><span>الإجمالي</span><strong>{formatNumber(stats.students.total)}</strong></div>
              <div><span>النشطون</span><strong>{formatNumber(stats.students.activeTotal)}</strong></div>
              <div><span>الطلاب</span><strong>{formatNumber(stats.students.male)}</strong></div>
              <div><span>الطالبات</span><strong>{formatNumber(stats.students.female)}</strong></div>
              <div><span>طلاب صباحي</span><strong>{formatNumber(stats.students.morningMale)}</strong></div>
              <div><span>طالبات صباحي</span><strong>{formatNumber(stats.students.morningFemale)}</strong></div>
              <div><span>طلاب ظهري</span><strong>{formatNumber(stats.students.afternoonMale)}</strong></div>
              <div><span>أضيفوا هذا الشهر</span><strong>{formatNumber(stats.students.addedThisMonth)}</strong></div>
            </div>
            <div className="distribution-list">
              {stats.students.byGrade.length > 0 ? (
                stats.students.byGrade.map((item) => (
                  <div key={item.grade}>
                    <span>{item.grade}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات توزيع للصفوف.</p>
              )}
            </div>
          </article>

          <article className="panel entity-stat-card">
            <div className="panel-heading">
              <div>
                <h2>إحصائيات الموظفين</h2>
                <p>التوزيع حسب النوع أو الوظيفة</p>
              </div>
            </div>
            <div className="entity-summary">
              <div><span>إجمالي الموظفين</span><strong>{formatNumber(stats.employees.total)}</strong></div>
              <div><span>أضيفوا هذا الشهر</span><strong>{formatNumber(stats.employees.addedThisMonth)}</strong></div>
            </div>
            <div className="distribution-list">
              {stats.employees.byType.length > 0 ? (
                stats.employees.byType.map((item) => (
                  <div key={item.type}>
                    <span>{item.type}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات توزيع للموظفين.</p>
              )}
            </div>
            <div className="distribution-list shift-distribution" aria-label="توزيع الموظفين حسب الشفت">
              {stats.employees.byShift.length > 0 ? (
                stats.employees.byShift.map((item) => (
                  <div key={item.shift}>
                    <span>{item.shift}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات توزيع حسب الشفت.</p>
              )}
            </div>
          </article>
        </section>

        <section className="sections-area">
          <div className="section-title"><h2>أقسام النظام</h2><p>انتقل مباشرة إلى القسم المطلوب</p></div>
          <div className="section-cards">
            {sections.map((item) => (
              <Link key={item.path} to={item.path} className="section-card">
                <span className="section-icon">{item.code}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.showsArchiveCount
                      ? loading && !statistics
                        ? "جاري حساب العناصر المحذوفة..."
                        : `${formatNumber(stats.archive.total)} عنصر محذوف`
                      : item.description}
                  </p>
                </div>
                <b>←</b>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {attendanceOpen && (
        <div className="modal-overlay">
          <div className="absence-modal printable-area report-print-document">
            <div className="modal-header modal-sticky-header report-screen-only">
              <div><h2>ملخص غياب الطلاب حسب الصف</h2><p>{dateText}</p></div>
              <button type="button" className="modal-sticky-close print-hide" onClick={() => setAttendanceOpen(false)} aria-label="إغلاق ملخص غياب الطلاب">×</button>
            </div>

            <ReportPrintHeader
              title="ملخص غياب الطلاب حسب الصف"
              date={dateText}
            />

            <table className="data-list-table report-screen-list">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الصف</th>
                  <th>غياب دون عذر</th>
                  <th>مجازون</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {stats.studentAttendance.absenceByGrade.length > 0 ? (
                  stats.studentAttendance.absenceByGrade.map((item, index) => (
                    <tr key={item.grade}>
                      <td>{index + 1}</td>
                      <td>{item.grade}</td>
                      <td>{formatNumber(item.absentWithoutExcuse)}</td>
                      <td>{formatNumber(item.onLeave)}</td>
                      <td>{formatNumber(item.totalAbsent)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="data-list-empty" colSpan="5">
                      لا توجد حالات غياب مسجلة لهذا اليوم.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="modal-actions print-hide">
              <button type="button" className="secondary" onClick={() => setAttendanceOpen(false)}>إغلاق</button>
              <button type="button" className="primary" onClick={() => window.print()}>طباعة الغياب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
