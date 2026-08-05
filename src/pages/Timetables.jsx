import { useEffect, useMemo, useState } from "react";
import "../styles/timetables.css";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const SUBJECTS = [
  "إسلامية",
  "عربي",
  "رياضيات",
  "إنكليزي",
  "علوم",
  "أخلاق",
  "فنية",
  "رياضة",
];

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

const STORAGE_KEY = "alkufa-timetables-design-v1";
const DEFAULT_LESSONS = 5;
const MIN_LESSONS = 1;
const MAX_LESSONS = 10;

const createEmptySchedule = (lessonsCount) =>
  Array.from({ length: lessonsCount }, () =>
    Object.fromEntries(DAYS.map((day) => [day, ""]))
  );

const getScheduleKey = (grade, section, shift) =>
  `${grade}__${section}__${shift}`;

const loadSavedData = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
};

export default function Timetables() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [section, setSection] = useState("أ");
  const [shift, setShift] = useState("صباحي");
  const [savedSchedules, setSavedSchedules] = useState(loadSavedData);
  const [lessonsCount, setLessonsCount] = useState(DEFAULT_LESSONS);
  const [schedule, setSchedule] = useState(() =>
    createEmptySchedule(DEFAULT_LESSONS)
  );
  const [message, setMessage] = useState("");

  const activeKey = useMemo(
    () =>
      selectedGrade ? getScheduleKey(selectedGrade, section, shift) : "",
    [selectedGrade, section, shift]
  );

  useEffect(() => {
    if (!activeKey) return;

    const saved = savedSchedules[activeKey];

    if (saved) {
      setLessonsCount(saved.lessonsCount);
      setSchedule(saved.schedule);
    } else {
      setLessonsCount(DEFAULT_LESSONS);
      setSchedule(createEmptySchedule(DEFAULT_LESSONS));
    }

    setMessage("");
  }, [activeKey, savedSchedules]);

  const updateLessonsCount = (nextCount) => {
    const safeCount = Math.min(
      MAX_LESSONS,
      Math.max(MIN_LESSONS, Number(nextCount) || DEFAULT_LESSONS)
    );

    setLessonsCount(safeCount);
    setSchedule((current) => {
      if (safeCount > current.length) {
        return [
          ...current,
          ...createEmptySchedule(safeCount - current.length),
        ];
      }

      return current.slice(0, safeCount);
    });
  };

  const updateSubject = (lessonIndex, day, subject) => {
    setSchedule((current) =>
      current.map((lesson, index) =>
        index === lessonIndex ? { ...lesson, [day]: subject } : lesson
      )
    );
  };

  const saveSchedule = () => {
    if (!selectedGrade) return;

    const nextData = {
      ...savedSchedules,
      [activeKey]: {
        grade: selectedGrade,
        section,
        shift,
        lessonsCount,
        schedule,
        updatedAt: new Date().toISOString(),
      },
    };

    setSavedSchedules(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    setMessage("تم حفظ تصميم الجدول على هذا الجهاز.");
  };

  const clearSchedule = () => {
    setSchedule(createEmptySchedule(lessonsCount));
    setMessage("تم تفريغ الجدول. اضغط حفظ لتثبيت التغيير.");
  };

  return (
    <main className="timetables-page" dir="rtl">
      {!selectedGrade ? (
        <>
          <header className="timetables-page-heading">
            <div>
              <span className="timetables-kicker">الإدارة المدرسية</span>
              <h1>الجداول الدراسية</h1>
              <p>
                اختر المرحلة لفتح جدول أيام الأسبوع وتحديد المواد وعدد
                الحصص.
              </p>
            </div>
          </header>

          <section className="timetables-grades-grid">
            {GRADES.map((grade, index) => (
              <button
                key={grade}
                type="button"
                className="timetable-grade-card"
                onClick={() => setSelectedGrade(grade)}
              >
                <span className="grade-card-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{grade}</h2>
                  <p>فتح الجدول الأسبوعي</p>
                </div>
                <span className="grade-card-arrow" aria-hidden="true">
                  ←
                </span>
              </button>
            ))}
          </section>
        </>
      ) : (
        <>
          <header className="timetable-editor-heading">
            <button
              type="button"
              className="timetable-back-button"
              onClick={() => setSelectedGrade("")}
            >
              رجوع إلى الصفوف
            </button>

            <div>
              <span className="timetables-kicker">الجدول الأسبوعي</span>
              <h1>{selectedGrade}</h1>
              <p>الأيام من الأحد إلى الخميس</p>
            </div>
          </header>

          <section className="timetable-toolbar">
            <label>
              <span>الشعبة</span>
              <select
                value={section}
                onChange={(event) => setSection(event.target.value)}
              >
                <option value="أ">أ</option>
                <option value="ب">ب</option>
                <option value="ج">ج</option>
                <option value="د">د</option>
              </select>
            </label>

            <label>
              <span>وقت الدوام</span>
              <select
                value={shift}
                onChange={(event) => setShift(event.target.value)}
              >
                <option value="صباحي">صباحي</option>
                <option value="ظهري">ظهري</option>
              </select>
            </label>

            <div className="lessons-counter">
              <span>عدد الحصص</span>
              <div>
                <button
                  type="button"
                  onClick={() => updateLessonsCount(lessonsCount - 1)}
                  disabled={lessonsCount <= MIN_LESSONS}
                  aria-label="تقليل عدد الحصص"
                >
                  −
                </button>
                <strong>{lessonsCount}</strong>
                <button
                  type="button"
                  onClick={() => updateLessonsCount(lessonsCount + 1)}
                  disabled={lessonsCount >= MAX_LESSONS}
                  aria-label="زيادة عدد الحصص"
                >
                  +
                </button>
              </div>
            </div>

            <div className="timetable-context">
              <span>{selectedGrade}</span>
              <b>شعبة {section}</b>
              <b>{shift}</b>
            </div>
          </section>

          {message && (
            <div className="timetable-message" role="status">
              {message}
            </div>
          )}

          <section className="timetable-card">
            <div className="timetable-scroll">
              <table className="weekly-timetable">
                <thead>
                  <tr>
                    <th className="lesson-number-heading">عدد الدروس</th>
                    {DAYS.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {schedule.map((lesson, lessonIndex) => (
                    <tr key={lessonIndex}>
                      <th className="lesson-number-cell">
                        <span>الحصة</span>
                        <strong>{lessonIndex + 1}</strong>
                      </th>

                      {DAYS.map((day) => (
                        <td key={day}>
                          <select
                            value={lesson[day] || ""}
                            onChange={(event) =>
                              updateSubject(
                                lessonIndex,
                                day,
                                event.target.value
                              )
                            }
                            aria-label={`${day} الحصة ${lessonIndex + 1}`}
                          >
                            <option value="">بدون مادة</option>
                            {SUBJECTS.map((subject) => (
                              <option key={subject} value={subject}>
                                {subject}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="timetable-actions">
            <button
              type="button"
              className="timetable-clear-button"
              onClick={clearSchedule}
            >
              مسح الجدول
            </button>

            <button
              type="button"
              className="timetable-save-button"
              onClick={saveSchedule}
            >
              حفظ الجدول
            </button>
          </footer>

          <p className="timetable-design-note">
            هذه مرحلة التصميم الأولى. منع تضارب المعلمات والحصص سيُضاف في
            المرحلة التالية.
          </p>
        </>
      )}
    </main>
  );
}