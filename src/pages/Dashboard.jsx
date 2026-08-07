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
import "../styles/dashboardTimetablePreview.css";
import "../styles/reportPrint.css";
import schoolLogo from "../images/logo.png";

const STATISTICS_URL = "http://localhost:5000/dashboard/statistics";
const TIMETABLE_API = "http://localhost:5000/timetables";
const SCHOOL_TIME_ZONE = "Asia/Baghdad";
const TABLE_HEADER_HEIGHT = 58;
const OPPORTUNITY_MINUTES = 10;
const OPPORTUNITY_ROW_WEIGHT = 0.42;

const TIMETABLE_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
];

const TIMETABLE_GRADES = [
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
];

const TIMETABLE_SECTIONS = ["أ", "ب", "ج", "د"];

const DEFAULT_SHIFT_TIMES = {
  صباحي: [
    { period_number: 1, start: "08:00", end: "08:45" },
    { period_number: 2, start: "08:50", end: "09:35" },
    { period_number: 3, start: "09:40", end: "10:25" },
    { period_number: 4, start: "10:40", end: "11:25" },
    { period_number: 5, start: "11:30", end: "12:15" },
  ],
  ظهري: [
    { period_number: 1, start: "13:30", end: "14:15" },
    { period_number: 2, start: "14:20", end: "15:05" },
    { period_number: 3, start: "15:10", end: "15:55" },
    { period_number: 4, start: "16:10", end: "16:55" },
    { period_number: 5, start: "17:00", end: "17:45" },
  ],
};

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

const sections = [
  {
    title: "الطلاب",
    description: "إدارة ملفات الطلبة",
    path: "/students",
    code: "ST",
  },
  {
    title: "الكادر",
    description: "الموظفون والحضور",
    path: "/teachers",
    code: "HR",
  },
  {
    title: "الحسابات",
    description: "الأقساط والدفعات",
    path: "/fees",
    code: "FN",
  },
  {
    title: "الحضور",
    description: "الحضور والغياب",
    path: "/attendance",
    code: "AT",
  },
  {
    title: "الرواتب",
    description: "رواتب الكادر والاستقطاعات",
    path: "/payroll",
    code: "PY",
  },
  {
    title: "الدرجات",
    description: "النتائج والتقييمات",
    path: "/results",
    code: "GR",
  },
  {
    title: "الجداول",
    description: "الجداول الدراسية",
    path: "/timetable",
    code: "SC",
  },
  {
    title: "التقارير",
    description: "مركز التقارير",
    path: "/reports",
    code: "RP",
  },
  {
    title: "سجل المحذوفات",
    description: "الأرشيف الإداري للعناصر المحذوفة",
    path: "/deletion-archive",
    code: "DA",
    showsArchiveCount: true,
  },
  {
    title: "الإعدادات",
    description: "إعدادات النظام",
    path: "/settings",
    code: "SE",
  },
];

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

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "تعذر إكمال الطلب");
  }

  return data;
};

const getBaghdadParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    hour12: false,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getArabicBaghdadDay = (date = new Date()) =>
  new Intl.DateTimeFormat("ar-IQ", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
  }).format(date);

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
};

const formatLessonClock = (value) => {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  const suffix = hours >= 12 ? "م" : "ص";
  const normalized = hours % 12 || 12;

  return `${normalized}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const getCurrentShiftState = (nowMinutes, times) => {
  const morning = times.صباحي || [];
  const afternoon = times.ظهري || [];

  const morningStart = morning.length ? timeToMinutes(morning[0].start) : 0;
  const morningEnd = morning.length
    ? timeToMinutes(morning[morning.length - 1].end)
    : 0;

  const afternoonStart = afternoon.length
    ? timeToMinutes(afternoon[0].start)
    : 0;
  const afternoonEnd = afternoon.length
    ? timeToMinutes(afternoon[afternoon.length - 1].end)
    : 0;

  if (nowMinutes < morningStart) {
    return { shift: "صباحي", status: "before" };
  }

  if (nowMinutes <= morningEnd) {
    return { shift: "صباحي", status: "active" };
  }

  if (nowMinutes < afternoonStart) {
    return { shift: "ظهري", status: "waiting" };
  }

  if (nowMinutes <= afternoonEnd) {
    return { shift: "ظهري", status: "active" };
  }

  return { shift: "ظهري", status: "finished" };
};

const buildScheduleRows = (periods) => {
  const rows = [];

  periods.forEach((period, index) => {
    rows.push({
      type: "period",
      key: `period-${period.period_number}`,
      period,
      periodIndex: index,
      startMinutes: timeToMinutes(period.start),
      endMinutes: timeToMinutes(period.end),
      weight: 1,
    });

    const nextPeriod = periods[index + 1];

    if (!nextPeriod) {
      return;
    }

    const breakStart = timeToMinutes(period.end);
    const breakEnd = timeToMinutes(nextPeriod.start);
    const breakMinutes = breakEnd - breakStart;

    if (breakMinutes <= 0) {
      return;
    }

    const isOpportunity = breakMinutes >= OPPORTUNITY_MINUTES;

    rows.push({
      type: "break",
      key: `break-${period.period_number}-${nextPeriod.period_number}`,
      start: period.end,
      end: nextPeriod.start,
      startMinutes: breakStart,
      endMinutes: breakEnd,
      duration: breakMinutes,
      isOpportunity,
      weight: isOpportunity ? OPPORTUNITY_ROW_WEIGHT : 0,
    });
  });

  return rows;
};

const getTimelineData = (nowMinutes, periods) => {
  if (!periods.length) {
    return {
      position: null,
      currentLessonIndex: -1,
      currentBreakKey: null,
      isBreak: false,
    };
  }

  const rows = buildScheduleRows(periods);
  const totalWeight = rows.reduce((total, row) => total + row.weight, 0);

  if (totalWeight <= 0) {
    return {
      position: null,
      currentLessonIndex: -1,
      currentBreakKey: null,
      isBreak: false,
    };
  }

  let consumedWeight = 0;

  for (const row of rows) {
    if (nowMinutes >= row.startMinutes && nowMinutes <= row.endMinutes) {
      const duration = Math.max(row.endMinutes - row.startMinutes, 1);
      const progress = (nowMinutes - row.startMinutes) / duration;
      const rowProgress =
        row.weight > 0 ? progress * row.weight : 0;

      return {
        position: ((consumedWeight + rowProgress) / totalWeight) * 100,
        currentLessonIndex:
          row.type === "period" ? row.periodIndex : -1,
        currentBreakKey:
          row.type === "break" && row.isOpportunity ? row.key : null,
        isBreak: row.type === "break",
      };
    }

    consumedWeight += row.weight;
  }

  return {
    position: null,
    currentLessonIndex: -1,
    currentBreakKey: null,
    isBreak: false,
  };
};

const entryKey = (section, periodNumber) => `${section}-${periodNumber}`;

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
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>

      <div className="donut-value">
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function DashboardTimetablePreview({ onOpenTimetable }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [times, setTimes] = useState(DEFAULT_SHIFT_TIMES);
  const [selectedGrade, setSelectedGrade] = useState(TIMETABLE_GRADES[0]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = getArabicBaghdadDay(new Date());
    return TIMETABLE_DAYS.includes(day) ? day : TIMETABLE_DAYS[0];
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState("");
  const [entriesError, setEntriesError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPeriods = async () => {
      try {
        const data = await requestJson(`${TIMETABLE_API}/periods`);

        if (!cancelled && data.times) {
          setTimes(data.times);
          setPeriodsError("");
        }
      } catch (error) {
        if (!cancelled) {
          setPeriodsError(
            "تعذر جلب أوقات الحصص، لذلك تُعرض الأوقات الافتراضية مؤقتًا."
          );
        }
      }
    };

    loadPeriods();

    return () => {
      cancelled = true;
    };
  }, []);

  const baghdadParts = getBaghdadParts(currentTime);
  const rawHour = Number(baghdadParts.hour);
  const baghdadHour = rawHour === 24 ? 0 : rawHour;

  const nowMinutes =
    baghdadHour * 60 +
    Number(baghdadParts.minute) +
    Number(baghdadParts.second) / 60;

  const currentArabicDay = getArabicBaghdadDay(currentTime);
  const isSchoolDay = TIMETABLE_DAYS.includes(currentArabicDay);

  const liveState = getCurrentShiftState(nowMinutes, times);
  const activeShift = liveState.shift;
  const activeTimes = times[activeShift] || [];
  const activeScheduleRows = useMemo(
    () => buildScheduleRows(activeTimes).filter((row) => row.type === "period" || row.isOpportunity),
    [activeTimes]
  );

  const timeline =
    liveState.status === "active"
      ? getTimelineData(nowMinutes, activeTimes)
      : {
          position: null,
          currentLessonIndex: -1,
          currentBreakKey: null,
          isBreak: false,
        };

  const statusText = !isSchoolDay
    ? "اليوم عطلة أسبوعية"
    : {
        before: "لم يبدأ الدوام الصباحي بعد",
        active:
          timeline.currentLessonIndex >= 0
            ? `الحصة الحالية: ${timeline.currentLessonIndex + 1}`
            : timeline.isBreak
              ? "استراحة بين الحصص"
              : selectedDay === currentArabicDay
                ? "الدوام جارٍ الآن"
                : "عرض جدول يوم آخر",
        waiting: "انتهى الصباحي — بانتظار بدء الدوام الظهري",
        finished: "انتهى الدوام اليوم",
      }[liveState.status];

  const entryMap = useMemo(
    () =>
      new Map(
        entries.map((entry) => [
          entryKey(entry.section, entry.period_number),
          entry,
        ])
      ),
    [entries]
  );

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setEntriesError("");

      const params = new URLSearchParams({
        shift: activeShift,
        grade: selectedGrade,
        day_name: selectedDay,
      });

      const data = await requestJson(
        `${TIMETABLE_API}/entries?${params.toString()}`
      );

      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      setEntries([]);
      setEntriesError(error.message || "تعذر تحميل جدول الحصص");
    } finally {
      setLoading(false);
    }
  }, [activeShift, selectedDay, selectedGrade]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return (
    <section className="dashboard-timetable" aria-label="معاينة جدول الحصص">
      <div className="dashboard-timetable-head">
        <div>
          <span className="dashboard-timetable-eyebrow">المعاينة المباشرة</span>
          <h2>جدول الدوام {activeShift}</h2>
          <p>{statusText}</p>
        </div>

        <div className="dashboard-timetable-head-tools">
          <div className="dashboard-timetable-clock" aria-live="polite">
            <span>توقيت بغداد</span>
            <strong>
              {String(baghdadHour).padStart(2, "0")}:{baghdadParts.minute}:
              {baghdadParts.second}
            </strong>
          </div>

          <button type="button" onClick={onOpenTimetable}>
            فتح صفحة الجداول
          </button>
        </div>
      </div>

      <div className="dashboard-timetable-grades" aria-label="اختيار الصف">
        {TIMETABLE_GRADES.map((grade) => (
          <button
            key={grade}
            type="button"
            className={selectedGrade === grade ? "active" : ""}
            onClick={() => setSelectedGrade(grade)}
          >
            {grade}
          </button>
        ))}
      </div>

      <div className="dashboard-timetable-toolbar">
        <div className="dashboard-timetable-days" aria-label="اختيار اليوم">
          {TIMETABLE_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={selectedDay === day ? "active" : ""}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="dashboard-timetable-status">
          <span className={`status-dot ${liveState.status}`} />
          <strong>{selectedGrade}</strong>
          <span>{selectedDay}</span>
        </div>
      </div>

      {(periodsError || entriesError) && (
        <div className="dashboard-timetable-error" role="status">
          {entriesError || periodsError}
        </div>
      )}

      <div className="dashboard-timetable-card">
        <div className="dashboard-timetable-table-wrap">
          <table className="dashboard-timetable-table">
            <thead>
              <tr>
                <th className="dashboard-timetable-period-column">الحصة</th>
                <th className="dashboard-timetable-time-column">الوقت</th>

                {TIMETABLE_SECTIONS.map((section) => (
                  <th key={section}>{`${selectedGrade} ${section}`}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {activeScheduleRows.map((row) => {
                if (row.type === "break") {
                  return (
                    <tr
                      key={`${activeShift}-${row.key}`}
                      className={`dashboard-opportunity-row ${
                        timeline.currentBreakKey === row.key
                          ? "current-break"
                          : ""
                      }`}
                    >
                      <td colSpan={TIMETABLE_SECTIONS.length + 2}>
                        <div className="dashboard-opportunity-band">
                          <span />
                          <strong>الفرصة</strong>
                          <small>
                            {formatLessonClock(row.start)} —{" "}
                            {formatLessonClock(row.end)}
                          </small>
                          <span />
                        </div>
                      </td>
                    </tr>
                  );
                }

                const { period, periodIndex } = row;

                return (
                  <tr
                    key={`${activeShift}-${period.period_number}`}
                    className={
                      timeline.currentLessonIndex === periodIndex
                        ? "current-row"
                        : ""
                    }
                  >
                    <th className="dashboard-timetable-period-cell">
                      <span>الحصة</span>
                      <strong>{period.period_number}</strong>
                    </th>

                    <td className="dashboard-timetable-time-cell">
                      <strong>{formatLessonClock(period.start)}</strong>
                      <span>إلى</span>
                      <strong>{formatLessonClock(period.end)}</strong>
                    </td>

                    {TIMETABLE_SECTIONS.map((section) => {
                      const entry = entryMap.get(
                        entryKey(section, period.period_number)
                      );

                      return (
                        <td key={`${section}-${period.period_number}`}>
                          {entry ? (
                            <div className="dashboard-lesson-assignment">
                              <strong>
                                {entry.teacher_name || "معلمة غير محددة"}
                                {entry.teacher_specialization && (
                                  <small>
                                    ({entry.teacher_specialization})
                                  </small>
                                )}
                              </strong>
                              <span>{entry.subject}</span>
                            </div>
                          ) : (
                            <div className="dashboard-lesson-assignment empty">
                              <strong>غير محدد</strong>
                              <span>لم تُضف حصة</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className="dashboard-timetable-loading">
              جاري تحميل الجدول...
            </div>
          )}

          <div
            className="dashboard-timetable-overlay"
            style={{ top: TABLE_HEADER_HEIGHT }}
            aria-hidden="true"
          >
            {timeline.position !== null && (
              <div
                className="dashboard-live-time-line"
                style={{ top: `${timeline.position}%` }}
              >
                <span>
                  {formatLessonClock(
                    `${String(baghdadHour).padStart(2, "0")}:${
                      baghdadParts.minute
                    }`
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
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

  const dateText = useMemo(
    () => formatSchoolDate(currentDate),
    [currentDate]
  );

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return sections.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
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
                    className={`notification-item ${
                      item.unread ? "unread" : ""
                    }`}
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
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={() => navigate("/")}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <DashboardTimetablePreview
          onOpenTimetable={() => navigate("/timetable")}
        />

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
                <strong>
                  {formatNumber(stats.employeeAttendance.totalEmployees)}
                </strong>
              </div>

              <div className="dashboard-metric inside">
                <span>داخل المدرسة الآن</span>
                <strong>
                  {formatNumber(stats.employeeAttendance.currentlyInside)}
                </strong>
              </div>

              <div className="dashboard-metric">
                <span>سجلوا وقت خروج</span>
                <strong>
                  {formatNumber(stats.employeeAttendance.checkedOut)}
                </strong>
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
                <strong>
                  {formatClockTime(stats.employeeAttendance.latestCheckIn)}
                </strong>
              </div>

              <div className="dashboard-metric">
                <span>آخر خروج</span>
                <strong>
                  {formatClockTime(stats.employeeAttendance.latestCheckOut)}
                </strong>
              </div>
            </div>

            <div
              className="distribution-list shift-distribution"
              aria-label="حضور الموظفين حسب الشفت"
            >
              {stats.employeeAttendance.byShift.length > 0 ? (
                stats.employeeAttendance.byShift.map((item) => (
                  <div key={item.workShift}>
                    <span>{item.workShift}</span>
                    <strong>
                      {formatNumber(
                        Number(item.present) + Number(item.late)
                      )}{" "}
                      حاضر · {formatNumber(item.absent)} غائب
                    </strong>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات حضور موزعة حسب الشفت.</p>
              )}
            </div>
          </article>

          <article
            className="panel financial-panel"
            onClick={() => navigate("/fees")}
          >
            <div className="panel-heading">
              <div>
                <h2>الحالة المالية للمدرسة</h2>
                <p>
                  ملخص السنة الدراسية{" "}
                  {stats.finance.academicYear || "النشطة"}
                </p>
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
                  <strong>
                    {formatCurrency(stats.finance.totalRequired)}
                  </strong>
                </div>

                <div>
                  <span className="paid-dot" />
                  <p>إجمالي المدفوع</p>
                  <strong>{formatCurrency(stats.finance.totalPaid)}</strong>
                </div>

                <div>
                  <span className="remaining-dot" />
                  <p>إجمالي المتبقي</p>
                  <strong>
                    {formatCurrency(stats.finance.totalRemaining)}
                  </strong>
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
                <strong>
                  {formatNumber(stats.finance.paymentsTodayCount)}
                </strong>
                <small>
                  {formatCurrency(stats.finance.paymentsTodayAmount)}
                </small>
              </div>

              <div>
                <span>دفعات الشهر</span>
                <strong>
                  {formatNumber(stats.finance.paymentsThisMonthCount)}
                </strong>
                <small>
                  {formatCurrency(stats.finance.paymentsThisMonthAmount)}
                </small>
              </div>

              <div>
                <span>طلاب عليهم رصيد</span>
                <strong>
                  {formatNumber(stats.finance.studentsWithBalance)}
                </strong>
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
          <button
            type="button"
            className="panel attendance-panel"
            onClick={() => setAttendanceOpen(true)}
          >
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
                  <b>
                    {formatNumber(
                      stats.studentAttendance.totalActiveStudents
                    )}
                  </b>
                  إجمالي نشط
                </span>

                <span>
                  <b>{formatNumber(stats.studentAttendance.present)}</b>
                  حاضر
                </span>

                <span>
                  <b>
                    {formatNumber(
                      stats.studentAttendance.absentWithoutExcuse
                    )}
                  </b>
                  غائب دون عذر
                </span>

                <span>
                  <b>{formatNumber(stats.studentAttendance.onLeave)}</b>
                  مجاز
                </span>

                <span>
                  <b>
                    {stats.studentAttendance.absentWithExcuse === null
                      ? "—"
                      : formatNumber(
                          stats.studentAttendance.absentWithExcuse
                        )}
                  </b>
                  غائب بعذر
                </span>
              </div>
            </div>

            <div className="attendance-top-grade">
              <span>أكثر صف فيه غياب اليوم</span>
              <strong>
                {stats.studentAttendance.topAbsentGrade?.grade ||
                  "لا يوجد غياب"}
              </strong>
            </div>

            <div
              className="distribution-list shift-distribution"
              aria-label="حضور الطلاب حسب الدوام"
            >
              {stats.studentAttendance.byShift.length > 0 ? (
                stats.studentAttendance.byShift.map((item) => (
                  <div key={item.schoolShift}>
                    <span>{item.schoolShift}</span>
                    <strong>
                      {formatNumber(item.present)} حاضر ·{" "}
                      {formatNumber(
                        Number(item.absentWithoutExcuse) +
                          Number(item.onLeave)
                      )}{" "}
                      غائب
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
                <span
                  className={`system-dot ${
                    statistics ? "online" : "warning"
                  }`}
                />
                <strong>الخادم وقاعدة البيانات</strong>
                <small>
                  {statistics ? "متصل" : "بانتظار الاتصال"}
                </small>
              </div>

              <div>
                <span
                  className={`system-dot ${
                    partialErrorCount ? "warning" : "online"
                  }`}
                />
                <strong>أقسام الإحصائيات</strong>
                <small>
                  {partialErrorCount ? "تحديث جزئي" : "محدثة"}
                </small>
              </div>

              <div>
                <span className="system-dot online" />
                <strong>توقيت المدرسة</strong>
                <small>
                  {statistics?.timeZone || SCHOOL_TIME_ZONE}
                </small>
              </div>

              <div>
                <span className="system-dot warning" />
                <strong>جهاز البصمة</strong>
                <small>لا يوجد مصدر حالة مربوط</small>
              </div>
            </div>
          </article>

          <article className="panel backup-panel">
            <div className="panel-heading">
              <div>
                <h2>النسخة الاحتياطية</h2>
                <p>حماية بيانات المدرسة</p>
              </div>
            </div>

            <span className="backup-badge unavailable">غير مربوط</span>
            <strong>لا توجد إحصائية نسخ احتياطي</strong>
            <p>
              لم يُعثر على جدول أو خدمة تحفظ وقت وحالة آخر نسخة احتياطية.
            </p>
            <button
              type="button"
              onClick={() => navigate("/settings")}
            >
              إدارة النسخ الاحتياطية
            </button>
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
              <div>
                <span>الإجمالي</span>
                <strong>{formatNumber(stats.students.total)}</strong>
              </div>
              <div>
                <span>النشطون</span>
                <strong>{formatNumber(stats.students.activeTotal)}</strong>
              </div>
              <div>
                <span>الطلاب</span>
                <strong>{formatNumber(stats.students.male)}</strong>
              </div>
              <div>
                <span>الطالبات</span>
                <strong>{formatNumber(stats.students.female)}</strong>
              </div>
              <div>
                <span>طلاب صباحي</span>
                <strong>{formatNumber(stats.students.morningMale)}</strong>
              </div>
              <div>
                <span>طالبات صباحي</span>
                <strong>{formatNumber(stats.students.morningFemale)}</strong>
              </div>
              <div>
                <span>طلاب ظهري</span>
                <strong>{formatNumber(stats.students.afternoonMale)}</strong>
              </div>
              <div>
                <span>أضيفوا هذا الشهر</span>
                <strong>{formatNumber(stats.students.addedThisMonth)}</strong>
              </div>
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
              <div>
                <span>إجمالي الموظفين</span>
                <strong>{formatNumber(stats.employees.total)}</strong>
              </div>
              <div>
                <span>أضيفوا هذا الشهر</span>
                <strong>{formatNumber(stats.employees.addedThisMonth)}</strong>
              </div>
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

            <div
              className="distribution-list shift-distribution"
              aria-label="توزيع الموظفين حسب الشفت"
            >
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
          <div className="section-title">
            <h2>أقسام النظام</h2>
            <p>انتقل مباشرة إلى القسم المطلوب</p>
          </div>

          <div className="section-cards">
            {sections.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="section-card"
              >
                <span className="section-icon">{item.code}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.showsArchiveCount
                      ? loading && !statistics
                        ? "جاري حساب العناصر المحذوفة..."
                        : `${formatNumber(
                            stats.archive.total
                          )} عنصر محذوف`
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
              <div>
                <h2>ملخص غياب الطلاب حسب الصف</h2>
                <p>{dateText}</p>
              </div>
              <button
                type="button"
                className="modal-sticky-close print-hide"
                onClick={() => setAttendanceOpen(false)}
                aria-label="إغلاق ملخص غياب الطلاب"
              >
                ×
              </button>
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
                  stats.studentAttendance.absenceByGrade.map(
                    (item, index) => (
                      <tr key={item.grade}>
                        <td>{index + 1}</td>
                        <td>{item.grade}</td>
                        <td>
                          {formatNumber(item.absentWithoutExcuse)}
                        </td>
                        <td>{formatNumber(item.onLeave)}</td>
                        <td>{formatNumber(item.totalAbsent)}</td>
                      </tr>
                    )
                  )
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
              <button
                type="button"
                className="secondary"
                onClick={() => setAttendanceOpen(false)}
              >
                إغلاق
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => window.print()}
              >
                طباعة الغياب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}