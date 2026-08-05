import { useEffect, useMemo, useState } from "react";
import "../styles/timetables.css";

const BAGHDAD_TIME_ZONE = "Asia/Baghdad";
const STORAGE_KEY = "alkufa-timetables-preview-v3";
const TABLE_HEADER_HEIGHT = 58;

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const GRADES = [
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

const SECTIONS = ["أ", "ب", "ج", "د"];

const DEFAULT_SHIFT_TIMES = {
  صباحي: [
    { start: "08:00", end: "08:45" },
    { start: "08:50", end: "09:35" },
    { start: "09:40", end: "10:25" },
    { start: "10:40", end: "11:25" },
    { start: "11:30", end: "12:15" },
  ],
  ظهري: [
    { start: "13:30", end: "14:15" },
    { start: "14:20", end: "15:05" },
    { start: "15:10", end: "15:55" },
    { start: "16:10", end: "16:55" },
    { start: "17:00", end: "17:45" },
  ],
};

const TEACHERS = [
  {
    fullName: "زهراء علي حسن",
    specialty: "اللغة العربية",
  },
  {
    fullName: "نور محمد كريم",
    specialty: "الرياضيات",
  },
  {
    fullName: "مريم أحمد جاسم",
    specialty: "اللغة الإنكليزية",
  },
  {
    fullName: "هدى قاسم عباس",
    specialty: "العلوم",
  },
  {
    fullName: "سارة حسين علي",
    specialty: "التربية الإسلامية",
  },
  {
    fullName: "آية فاضل كاظم",
    specialty: "التربية الفنية والرياضة",
  },
];

const SUBJECTS = [
  "عربي",
  "رياضيات",
  "إنكليزي",
  "علوم",
  "إسلامية",
  "فنية",
  "رياضة",
  "أخلاق",
];

const getBaghdadParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BAGHDAD_TIME_ZONE,
    hour12: false,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const minutesToClock = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const formatClock = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  const suffix = hours >= 12 ? "م" : "ص";
  const normalized = hours % 12 || 12;

  return `${normalized}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const loadTimes = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved.times || DEFAULT_SHIFT_TIMES;
  } catch {
    return DEFAULT_SHIFT_TIMES;
  }
};

const saveTimes = (times) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ times }));
};

const getCurrentShiftState = (nowMinutes, times) => {
  const morning = times["صباحي"] || [];
  const afternoon = times["ظهري"] || [];

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

const getTimelineData = (nowMinutes, periods) => {
  if (!periods.length) {
    return { position: null, currentLessonIndex: -1, isBreak: false };
  }

  for (let index = 0; index < periods.length; index += 1) {
    const start = timeToMinutes(periods[index].start);
    const end = timeToMinutes(periods[index].end);

    if (nowMinutes >= start && nowMinutes <= end) {
      const progress = (nowMinutes - start) / Math.max(end - start, 1);

      return {
        position: ((index + progress) / periods.length) * 100,
        currentLessonIndex: index,
        isBreak: false,
      };
    }

    const nextStart = periods[index + 1]
      ? timeToMinutes(periods[index + 1].start)
      : null;

    if (nextStart !== null && nowMinutes > end && nowMinutes < nextStart) {
      return {
        position: ((index + 1) / periods.length) * 100,
        currentLessonIndex: -1,
        isBreak: true,
      };
    }
  }

  return { position: null, currentLessonIndex: -1, isBreak: false };
};

const buildLesson = (gradeIndex, dayIndex, rowIndex, sectionIndex) => {
  const teacherIndex =
    (gradeIndex + dayIndex + rowIndex + sectionIndex) % TEACHERS.length;
  const subjectIndex =
    (gradeIndex * 2 + dayIndex + rowIndex * 2 + sectionIndex) %
    SUBJECTS.length;

  return {
    ...TEACHERS[teacherIndex],
    subject: SUBJECTS[subjectIndex],
  };
};

export default function Timetables() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [times, setTimes] = useState(loadTimes);
  const [selectedDay, setSelectedDay] = useState("الأحد");
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorShift, setEditorShift] = useState("صباحي");
  const [draftTimes, setDraftTimes] = useState(times);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const baghdadParts = getBaghdadParts(currentTime);
  const rawHour = Number(baghdadParts.hour);
  const baghdadHour = rawHour === 24 ? 0 : rawHour;
  const nowMinutes =
    baghdadHour * 60 +
    Number(baghdadParts.minute) +
    Number(baghdadParts.second) / 60;

  const liveState = getCurrentShiftState(nowMinutes, times);
  const activeShift = liveState.shift;
  const activeTimes = times[activeShift] || [];

  const timeline =
    liveState.status === "active"
      ? getTimelineData(nowMinutes, activeTimes)
      : { position: null, currentLessonIndex: -1, isBreak: false };

  const statusText = {
    before: "لم يبدأ الدوام الصباحي بعد",
    active:
      timeline.currentLessonIndex >= 0
        ? `الحصة الحالية: ${timeline.currentLessonIndex + 1}`
        : timeline.isBreak
          ? "استراحة بين الحصص"
          : "الدوام جارٍ الآن",
    waiting: "انتهى الدوام الصباحي — بانتظار بدء الدوام الظهري",
    finished: "انتهى الدوام اليوم",
  }[liveState.status];

  const gradeIndex = GRADES.indexOf(selectedGrade);
  const dayIndex = DAYS.indexOf(selectedDay);

  const classes = useMemo(
    () => SECTIONS.map((section) => `${selectedGrade} ${section}`),
    [selectedGrade]
  );

  const tableLessons = useMemo(
    () =>
      activeTimes.map((_, rowIndex) =>
        SECTIONS.map((__, sectionIndex) =>
          buildLesson(gradeIndex, dayIndex, rowIndex, sectionIndex)
        )
      ),
    [activeTimes, dayIndex, gradeIndex]
  );

  const updateDraftTime = (index, field, value) => {
    setDraftTimes((current) => ({
      ...current,
      [editorShift]: current[editorShift].map((period, periodIndex) =>
        periodIndex === index ? { ...period, [field]: value } : period
      ),
    }));
  };

  const addLesson = () => {
    setDraftTimes((current) => {
      const shiftTimes = current[editorShift];
      const last = shiftTimes[shiftTimes.length - 1] || {
        start: editorShift === "صباحي" ? "08:00" : "13:30",
        end: editorShift === "صباحي" ? "08:45" : "14:15",
      };
      const start = timeToMinutes(last.end) + 5;
      const end = start + 45;

      return {
        ...current,
        [editorShift]: [
          ...shiftTimes,
          { start: minutesToClock(start), end: minutesToClock(end) },
        ],
      };
    });
  };

  const removeLesson = () => {
    setDraftTimes((current) => ({
      ...current,
      [editorShift]:
        current[editorShift].length > 1
          ? current[editorShift].slice(0, -1)
          : current[editorShift],
    }));
  };

  const saveEditedTimes = () => {
    const hasInvalidPeriod = Object.values(draftTimes).some((periods) =>
      periods.some(
        (period, index) =>
          !period.start ||
          !period.end ||
          timeToMinutes(period.start) >= timeToMinutes(period.end) ||
          (index > 0 &&
            timeToMinutes(period.start) <
              timeToMinutes(periods[index - 1].end))
      )
    );

    if (hasInvalidPeriod) {
      setMessage("تحقق من ترتيب الأوقات ومن أن البداية تسبق النهاية.");
      return;
    }

    setTimes(draftTimes);
    saveTimes(draftTimes);
    setEditorOpen(false);
    setMessage("تم حفظ أوقات الحصص.");
  };

  const openEditor = () => {
    setDraftTimes(times);
    setEditorOpen(true);
    setMessage("");
  };

  return (
    <main className="timetable-overview-page" dir="rtl">
      <section className="timetable-command-bar">
        <div className="timetable-command-title">
          <span>المعاينة المباشرة</span>
          <div>
            <h1>جدول الدوام {activeShift}</h1>
            <p>{statusText}</p>
          </div>
        </div>

        <div className="timetable-command-tools">
          <div className="timetable-live-clock" aria-live="polite">
            <span>توقيت بغداد</span>
            <strong>
              {String(baghdadHour).padStart(2, "0")}:{baghdadParts.minute}:
              {baghdadParts.second}
            </strong>
          </div>

          <button type="button" onClick={openEditor}>
            <span aria-hidden="true">✎</span>
            تعديل الحصص
          </button>

          <button
            type="button"
            onClick={() =>
              setMessage("ميزة تكوين الجداول ستُضاف في المرحلة التالية.")
            }
          >
            <span aria-hidden="true">＋</span>
            تكوين الجداول
          </button>
        </div>

        <div className="timetable-grade-strip" aria-label="اختيار المرحلة">
          {GRADES.map((grade, index) => (
            <button
              key={grade}
              type="button"
              className={selectedGrade === grade ? "active" : ""}
              onClick={() => setSelectedGrade(grade)}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{grade}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="timetable-main-preview">
        <div className="timetable-preview-toolbar">
          <div className="timetable-day-tabs">
            {DAYS.map((day) => (
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

          <div className="timetable-preview-status">
            <span className={`status-dot ${liveState.status}`} />
            <span>{statusText}</span>
            <b>{selectedGrade}</b>
          </div>
        </div>

        {message && (
          <div className="timetable-inline-message" role="status">
            {message}
          </div>
        )}

        <div className="timetable-preview-card">
          <div className="timetable-live-grid-wrap">
            <table className="timetable-live-grid">
              <thead>
                <tr>
                  <th className="lesson-index-column">الحصة</th>
                  <th className="lesson-time-column">الوقت</th>
                  {classes.map((className) => (
                    <th key={className}>{className}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {activeTimes.map((period, rowIndex) => (
                  <tr
                    key={`${activeShift}-${rowIndex}`}
                    className={
                      timeline.currentLessonIndex === rowIndex
                        ? "current-row"
                        : ""
                    }
                  >
                    <th className="lesson-index-cell">
                      <span>الحصة</span>
                      <strong>{rowIndex + 1}</strong>
                    </th>

                    <td className="lesson-time-cell">
                      <strong>{formatClock(period.start)}</strong>
                      <span>إلى</span>
                      <strong>{formatClock(period.end)}</strong>
                    </td>

                    {classes.map((className, classIndex) => {
                      const lesson = tableLessons[rowIndex]?.[classIndex];

                      return (
                        <td key={`${className}-${rowIndex}`}>
                          <div className="lesson-assignment">
                            <strong>
                              {lesson.fullName}
                              <small>({lesson.specialty})</small>
                            </strong>
                            <span>{lesson.subject}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className="timetable-body-overlay"
              style={{ top: TABLE_HEADER_HEIGHT }}
              aria-hidden="true"
            >
              {timeline.position !== null && (
                <div
                  className="live-time-line"
                  style={{ top: `${timeline.position}%` }}
                >
                  <span className="live-time-label">
                    {String(baghdadHour).padStart(2, "0")}:
                    {baghdadParts.minute}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {editorOpen && (
        <div
          className="timetable-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditorOpen(false);
            }
          }}
        >
          <section
            className="timetable-times-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="times-modal-title"
          >
            <div className="timetable-modal-header">
              <div>
                <span>إعدادات الدوام</span>
                <h2 id="times-modal-title">تعديل أوقات الحصص</h2>
              </div>

              <button
                type="button"
                className="timetable-modal-close"
                onClick={() => setEditorOpen(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="timetable-shift-switch">
              <button
                type="button"
                className={editorShift === "صباحي" ? "active" : ""}
                onClick={() => setEditorShift("صباحي")}
              >
                الدوام الصباحي
              </button>

              <button
                type="button"
                className={editorShift === "ظهري" ? "active" : ""}
                onClick={() => setEditorShift("ظهري")}
              >
                الدوام الظهري
              </button>
            </div>

            <div className="timetable-times-list">
              {draftTimes[editorShift].map((period, index) => (
                <div className="timetable-time-row" key={index}>
                  <strong>الحصة {index + 1}</strong>

                  <label>
                    <span>من</span>
                    <input
                      type="time"
                      value={period.start}
                      onChange={(event) =>
                        updateDraftTime(index, "start", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>إلى</span>
                    <input
                      type="time"
                      value={period.end}
                      onChange={(event) =>
                        updateDraftTime(index, "end", event.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="timetable-lessons-controls">
              <button type="button" onClick={removeLesson}>
                حذف آخر حصة
              </button>

              <button type="button" onClick={addLesson}>
                إضافة حصة
              </button>
            </div>

            <div className="timetable-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditorOpen(false)}
              >
                إلغاء
              </button>

              <button
                type="button"
                className="primary"
                onClick={saveEditedTimes}
              >
                حفظ الأوقات
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}