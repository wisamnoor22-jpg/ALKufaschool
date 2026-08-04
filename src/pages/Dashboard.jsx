import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReportPrintHeader from "../components/common/ReportPrintHeader";
import "../styles/Dashboard.css";
import "../styles/reportPrint.css";
import schoolLogo from "../images/logo.png";

const employees = [
  { id: 1, name: "أحمد علي حسن", time: "07:55", status: "present" },
  { id: 2, name: "زهراء كريم جاسم", time: "08:08", status: "late" },
  { id: 3, name: "حسين مهدي كاظم", time: "لم يحضر", status: "absent" },
  { id: 4, name: "نور فاضل عباس", time: "07:51", status: "present" },
  { id: 5, name: "علي رعد محسن", time: "08:03", status: "late" },
  { id: 6, name: "مريم سعد هادي", time: "07:49", status: "present" },
];

const notifications = [
  {
    id: 1,
    title: "تسجيل حضور متأخر",
    summary: "الموظفة زهراء حضرت الساعة 08:08",
    details: "تم تسجيل تأخير قدره 8 دقائق عن وقت الدوام الرسمي.",
    path: "/teachers",
    unread: true,
  },
  {
    id: 2,
    title: "قسط جديد",
    summary: "تم تسجيل دفعة جديدة لطالب",
    details: "تم استلام دفعة مالية جديدة وإضافتها إلى سجل الحسابات.",
    path: "/fees",
    unread: true,
  },
  {
    id: 3,
    title: "نسخة احتياطية ناجحة",
    summary: "تم حفظ النسخة الاحتياطية",
    details: "آخر نسخة احتياطية اكتملت بنجاح اليوم الساعة 02:30 ص.",
    path: "/settings",
    unread: false,
  },
];

const absentStudents = [
  { id: 1, name: "علي حسن كريم", grade: "الثالث الابتدائي", section: "أ", reason: "بدون عذر" },
  { id: 2, name: "زهراء فاضل عباس", grade: "الخامس الابتدائي", section: "ب", reason: "إجازة مرضية" },
  { id: 3, name: "حسين جواد كاظم", grade: "الرابع الابتدائي", section: "أ", reason: "بدون عذر" },
];

const changesToday = [
  { id: 1, label: "تم تسجيل 3 طلاب جدد", time: "10:42" },
  { id: 2, label: "تم استلام 18 قسطًا", time: "10:15" },
  { id: 3, label: "تم تعديل بيانات موظف", time: "09:35" },
  { id: 4, label: "تم نقل طالب بين شعبتين", time: "09:10" },
];

const systemStatus = [
  { id: 1, label: "قاعدة البيانات", state: "online" },
  { id: 2, label: "الخادم", state: "online" },
  { id: 3, label: "جهاز البصمة", state: "warning" },
  { id: 4, label: "النسخة الاحتياطية", state: "online" },
];

const sections = [
  { title: "الطلاب", description: "إدارة ملفات الطلبة", path: "/students", code: "ST" },
  { title: "الكادر", description: "الموظفون والحضور", path: "/teachers", code: "HR" },
  { title: "الحسابات", description: "الأقساط والدفعات", path: "/fees", code: "FN" },
  { title: "الحضور", description: "الحضور والغياب", path: "/attendance", code: "AT" },
  { title: "الدرجات", description: "النتائج والتقييمات", path: "/results", code: "GR" },
  { title: "الجداول", description: "الجداول الدراسية", path: "/timetable", code: "SC" },
  { title: "التقارير", description: "مركز التقارير", path: "/reports", code: "RP" },
  { title: "السجل", description: "آخر العمليات", path: "/history", code: "LG" },
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("alkufa-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("alkufa-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const dateText = useMemo(() => {
    return new Intl.DateTimeFormat("ar-IQ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }, []);

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

  const unreadCount = notifications.filter((item) => item.unread).length;

  const statusText = {
    present: "حاضر",
    late: "متأخر",
    absent: "غائب",
  };

  return (
    <div className="founder-dashboard" dir="rtl">
      <header className="founder-header">
        <div className="brand-area">
          <img src={schoolLogo} alt="شعار المدرسة" />
          <div>
            <h1>مدرسة الكوفة الأهلية</h1>
            <p>مرحبًا بك، بحساب المؤسس</p>
          </div>
        </div>

        <div className="header-tools">
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
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
            title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>

          <div className="date-chip">{dateText}</div>
          <button type="button" className="logout-button" onClick={() => navigate("/")}>تسجيل الخروج</button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="top-grid">
          <article className="panel employee-panel">
            <div className="panel-heading">
              <div>
                <h2>حضور الموظفين اليوم</h2>
                <p>الاسم يمينًا ووقت الحضور يسارًا</p>
              </div>
              <div className="employee-summary">
                <span className="present">3 حاضر</span>
                <span className="late">2 متأخر</span>
                <span className="absent">1 غائب</span>
              </div>
            </div>

            <div className="employee-list">
              {employees.map((employee) => (
                <button
                  type="button"
                  key={employee.id}
                  className={`employee-row ${employee.status}`}
                  onClick={() => navigate("/teachers")}
                >
                  <div>
                    <strong>{employee.name}</strong>
                    <span>{statusText[employee.status]}</span>
                  </div>
                  <time>{employee.time}</time>
                </button>
              ))}
            </div>
          </article>

          <article className="panel financial-panel" onClick={() => navigate("/fees")}>
            <div className="panel-heading">
              <div>
                <h2>الحالة المالية للمدرسة</h2>
                <p>ملخص الأقساط الحالية</p>
              </div>
              <span className="trend">+6% هذا الشهر</span>
            </div>

            <div className="financial-body">
              <Donut value={82} color="#20a464" label="نسبة التحصيل" />
              <div className="financial-values">
                <div><span className="paid-dot" /><p>المقبوض</p><strong>82,000,000 د.ع</strong></div>
                <div><span className="remaining-dot" /><p>المتبقي</p><strong>18,000,000 د.ع</strong></div>
                <div className="payment-counts">
                  <span>310 مسدد بالكامل</span>
                  <span>95 مسدد جزئيًا</span>
                  <span>65 غير مسدد</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="middle-grid">
          <button type="button" className="panel attendance-panel" onClick={() => setAttendanceOpen(true)}>
            <div className="panel-heading">
              <div><h2>حضور الطلاب اليوم</h2><p>اضغط لعرض قائمة الغياب</p></div>
            </div>
            <div className="attendance-body">
              <Donut value={96} color="#2ca66f" label="نسبة الحضور" />
              <div className="attendance-numbers">
                <span><b>452</b> حاضر</span>
                <span><b>18</b> غائب</span>
              </div>
            </div>
          </button>

          <article className="panel">
            <div className="panel-heading"><div><h2>ماذا تغير اليوم؟</h2><p>آخر العمليات المهمة</p></div></div>
            <div className="simple-list">
              {changesToday.map((item) => (
                <div key={item.id}><span>{item.label}</span><time>{item.time}</time></div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading"><div><h2>حالة الأنظمة</h2><p>المكونات الأساسية</p></div></div>
            <div className="systems-list">
              {systemStatus.map((item) => (
                <div key={item.id}>
                  <span className={`system-dot ${item.state}`} />
                  <strong>{item.label}</strong>
                  <small>{item.state === "online" ? "متصل" : "يحتاج متابعة"}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel backup-panel">
            <div className="panel-heading"><div><h2>النسخة الاحتياطية</h2><p>حماية بيانات المدرسة</p></div></div>
            <span className="backup-badge">ناجحة</span>
            <strong>اليوم، 02:30 ص</strong>
            <p>آخر نسخة احتياطية اكتملت دون أخطاء.</p>
            <button type="button" onClick={() => navigate("/settings")}>إدارة النسخ الاحتياطية</button>
          </article>
        </section>

        <section className="sections-area">
          <div className="section-title"><h2>أقسام النظام</h2><p>انتقل مباشرة إلى القسم المطلوب</p></div>
          <div className="section-cards">
            {sections.map((item) => (
              <Link key={item.path} to={item.path} className="section-card">
                <span className="section-icon">{item.code}</span>
                <div><h3>{item.title}</h3><p>{item.description}</p></div>
                <b>←</b>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {attendanceOpen && (
        <div className="modal-overlay">
          <div className="absence-modal printable-area report-print-document">
            <div className="modal-header report-screen-only">
              <div><h2>قائمة الطلاب الغائبين</h2><p>{dateText}</p></div>
              <button type="button" className="print-hide" onClick={() => setAttendanceOpen(false)}>×</button>
            </div>

            <ReportPrintHeader
              title="قائمة الطلاب الغائبين"
              date={dateText}
            />

            <table>
              <thead><tr><th>#</th><th>اسم الطالب</th><th>الصف</th><th>الشعبة</th><th>السبب</th></tr></thead>
              <tbody>
                {absentStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>{student.grade}</td>
                    <td>{student.section}</td>
                    <td>{student.reason}</td>
                  </tr>
                ))}
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
