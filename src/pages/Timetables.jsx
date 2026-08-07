import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/timetables.css";

const API_BASE = "http://localhost:5000";
const TIMETABLE_API = `${API_BASE}/timetables`;
const BAGHDAD_TIME_ZONE = "Asia/Baghdad";
const TABLE_HEADER_HEIGHT = 58;
const OPPORTUNITY_MINUTES = 10;
const OPPORTUNITY_ROW_WEIGHT = 0.42;

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const SECTIONS = ["أ", "ب", "ج", "د"];
const STAGES = [
  {
    id: "primary",
    title: "المرحلة الابتدائية",
    shortTitle: "الابتدائية",
    grades: [
      "الصف الأول",
      "الصف الثاني",
      "الصف الثالث",
      "الصف الرابع",
      "الصف الخامس",
      "الصف السادس",
    ],
  },
  {
    id: "middle",
    title: "المرحلة المتوسطة",
    shortTitle: "المتوسطة",
    grades: ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"],
  },
  {
    id: "secondary",
    title: "المرحلة الإعدادية",
    shortTitle: "الإعدادية",
    grades: ["الرابع الإعدادي", "الخامس الإعدادي", "السادس الإعدادي"],
  },
];
const GRADES = STAGES.flatMap((stage) => stage.grades);
const SUBJECTS = [
  "اللغة العربية",
  "الرياضيات",
  "اللغة الإنكليزية",
  "العلوم",
  "التربية الإسلامية",
  "الاجتماعيات",
  "الحاسوب",
  "التربية الفنية",
  "التربية الرياضية",
  "الأخلاق",
];

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
    const error = new Error(data.message || "تعذر إكمال الطلب");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

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
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToClock = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const formatClock = (value) => {
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

const cloneTimes = (times) => ({
  صباحي: (times.صباحي || []).map((period) => ({ ...period })),
  ظهري: (times.ظهري || []).map((period) => ({ ...period })),
});

const entryKey = (section, periodNumber) => `${section}-${periodNumber}`;

export default function Timetables() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [times, setTimes] = useState(DEFAULT_SHIFT_TIMES);
  const [selectedDay, setSelectedDay] = useState("الأحد");
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [previewEntries, setPreviewEntries] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [timesEditorOpen, setTimesEditorOpen] = useState(false);
  const [editorShift, setEditorShift] = useState("صباحي");
  const [draftTimes, setDraftTimes] = useState(DEFAULT_SHIFT_TIMES);
  const [savingTimes, setSavingTimes] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualView, setManualView] = useState("selection");
  const [manualShift, setManualShift] = useState("صباحي");
  const [manualStageId, setManualStageId] = useState(STAGES[0].id);
  const [manualGrade, setManualGrade] = useState(STAGES[0].grades[0]);
  const [manualSection, setManualSection] = useState(SECTIONS[0]);
  const [manualDay, setManualDay] = useState("الأحد");
  const [manualEntries, setManualEntries] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);

  const [cellEditor, setCellEditor] = useState(null);
  const [subject, setSubject] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [transferCandidate, setTransferCandidate] = useState(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPeriods = async () => {
      try {
        const data = await requestJson(`${TIMETABLE_API}/periods`);
        if (!cancelled && data.times) {
          setTimes(data.times);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            "تعذر جلب أوقات الحصص من الخادم، لذلك تُعرض الأوقات الافتراضية مؤقتًا."
          );
          setMessageType("error");
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

  const previewEntryMap = useMemo(
    () =>
      new Map(
        previewEntries.map((entry) => [
          entryKey(entry.section, entry.period_number),
          entry,
        ])
      ),
    [previewEntries]
  );

  const manualEntryMap = useMemo(
    () =>
      new Map(
        manualEntries.map((entry) => [entry.period_number, entry])
      ),
    [manualEntries]
  );

  const selectedStage = useMemo(
    () => STAGES.find((stage) => stage.id === manualStageId) || STAGES[0],
    [manualStageId]
  );

  const loadPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      const parameters = new URLSearchParams({
        shift: activeShift,
        grade: selectedGrade,
        day_name: selectedDay,
      });
      const data = await requestJson(
        `${TIMETABLE_API}/entries?${parameters.toString()}`
      );
      setPreviewEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      setPreviewEntries([]);
      setMessage(error.message || "تعذر جلب الجدول");
      setMessageType("error");
    } finally {
      setPreviewLoading(false);
    }
  }, [activeShift, selectedDay, selectedGrade]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const loadManualTable = useCallback(async () => {
    if (manualView !== "table") {
      return;
    }

    try {
      setManualLoading(true);
      const parameters = new URLSearchParams({
        shift: manualShift,
        grade: manualGrade,
        section: manualSection,
        day_name: manualDay,
      });
      const data = await requestJson(
        `${TIMETABLE_API}/entries?${parameters.toString()}`
      );
      setManualEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      setManualEntries([]);
      setMessage(error.message || "تعذر جلب جدول الشعبة");
      setMessageType("error");
    } finally {
      setManualLoading(false);
    }
  }, [manualDay, manualGrade, manualSection, manualShift, manualView]);

  useEffect(() => {
    loadManualTable();
  }, [loadManualTable]);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const openTimesEditor = () => {
    setDraftTimes(cloneTimes(times));
    setEditorShift("صباحي");
    setTimesEditorOpen(true);
    setMessage("");
  };

  const adjustDraftTime = (index, field, amount) => {
    setDraftTimes((current) => ({
      ...current,
      [editorShift]: current[editorShift].map((period, periodIndex) =>
        periodIndex === index
          ? {
              ...period,
              [field]: minutesToClock(timeToMinutes(period[field]) + amount),
            }
          : period
      ),
    }));
  };

  const addPeriod = () => {
    setDraftTimes((current) => {
      const shiftPeriods = current[editorShift];
      const lastPeriod = shiftPeriods[shiftPeriods.length - 1];
      const fallbackStart = editorShift === "صباحي" ? "08:00" : "13:30";
      const startMinutes = lastPeriod
        ? timeToMinutes(lastPeriod.end) + 15
        : timeToMinutes(fallbackStart);
      const nextPeriod = {
        period_number: shiftPeriods.length + 1,
        start: minutesToClock(startMinutes),
        end: minutesToClock(startMinutes + 45),
      };

      return {
        ...current,
        [editorShift]: [...shiftPeriods, nextPeriod],
      };
    });
  };

  const removePeriod = () => {
    setDraftTimes((current) => ({
      ...current,
      [editorShift]:
        current[editorShift].length > 1
          ? current[editorShift].slice(0, -1)
          : current[editorShift],
    }));
  };

  const saveEditedTimes = async () => {
    const hasInvalidPeriod = Object.values(draftTimes).some((periods) =>
      periods.some(
        (period, index) =>
          timeToMinutes(period.start) >= timeToMinutes(period.end) ||
          (index > 0 &&
            timeToMinutes(period.start) < timeToMinutes(periods[index - 1].end))
      )
    );

    if (hasInvalidPeriod) {
      showMessage(
        "تحقق من ترتيب الأوقات ومن أن بداية كل حصة تسبق نهايتها.",
        "error"
      );
      return;
    }

    try {
      setSavingTimes(true);
      const data = await requestJson(`${TIMETABLE_API}/periods`, {
        method: "PUT",
        body: JSON.stringify({ times: draftTimes }),
      });
      setTimes(data.times || draftTimes);
      setTimesEditorOpen(false);
      showMessage(data.message || "تم حفظ أوقات الحصص.", "success");
      await Promise.all([loadPreview(), loadManualTable()]);
    } catch (error) {
      showMessage(error.message || "تعذر حفظ أوقات الحصص", "error");
    } finally {
      setSavingTimes(false);
    }
  };

  const openManualEditor = () => {
    setManualOpen(true);
    setManualView("selection");
    setCellEditor(null);
    setMessage("");
  };

  const chooseStage = (stage) => {
    setManualStageId(stage.id);
    setManualGrade(stage.grades[0]);
  };

  const openManualTable = () => {
    setManualDay("الأحد");
    setManualView("table");
  };

  const openCellEditor = async (period) => {
    const entry = manualEntryMap.get(period.period_number) || null;
    setCellEditor({ period, entry });
    setSubject(entry?.subject || "");
    setSelectedTeacherId(entry?.teacher_id || null);
    setTransferCandidate(null);
    setTeachers([]);

    try {
      setTeachersLoading(true);
      const parameters = new URLSearchParams({
        shift: manualShift,
        day_name: manualDay,
        period_number: String(period.period_number),
      });
      if (entry?.id) {
        parameters.set("exclude_entry_id", String(entry.id));
      }
      const data = await requestJson(
        `${TIMETABLE_API}/availability?${parameters.toString()}`
      );
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
    } catch (error) {
      showMessage(error.message || "تعذر جلب المعلمات", "error");
    } finally {
      setTeachersLoading(false);
    }
  };

  const selectTeacher = (teacher) => {
    setSelectedTeacherId(teacher.id);
    setTransferCandidate(teacher.conflict_entry_id ? teacher : null);
  };

  const refreshAfterAssignment = async () => {
    await Promise.all([loadManualTable(), loadPreview()]);
  };

  const saveAssignment = async (replaceConflict = false) => {
    if (!cellEditor) {
      return;
    }
    if (!subject.trim()) {
      showMessage("يرجى اختيار المادة أو كتابة اسمها.", "error");
      return;
    }
    if (!selectedTeacherId) {
      showMessage("يرجى اختيار المعلمة.", "error");
      return;
    }

    try {
      setAssignmentSaving(true);
      const data = await requestJson(`${TIMETABLE_API}/entries`, {
        method: "PUT",
        body: JSON.stringify({
          shift: manualShift,
          grade: manualGrade,
          section: manualSection,
          day_name: manualDay,
          period_number: cellEditor.period.period_number,
          subject: subject.trim(),
          teacher_id: selectedTeacherId,
          replace_conflict: replaceConflict,
        }),
      });
      setCellEditor(null);
      setTransferCandidate(null);
      showMessage(data.message || "تم حفظ الحصة.", "success");
      await refreshAfterAssignment();
    } catch (error) {
      if (error.status === 409 && error.data?.conflict) {
        const selectedTeacher = teachers.find(
          (teacher) => teacher.id === selectedTeacherId
        );
        setTransferCandidate(
          selectedTeacher || {
            id: selectedTeacherId,
            conflict_entry_id: error.data.conflict.id,
            conflict_shift: error.data.conflict.work_shift,
            conflict_grade: error.data.conflict.grade,
            conflict_section: error.data.conflict.section,
            conflict_day_name: error.data.conflict.day_name,
            conflict_period_number: error.data.conflict.period_number,
            conflict_subject: error.data.conflict.subject,
          }
        );
      }
      showMessage(error.message || "تعذر حفظ الحصة", "error");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const clearAssignment = async () => {
    if (!cellEditor?.entry?.id) {
      return;
    }

    try {
      setAssignmentSaving(true);
      const data = await requestJson(
        `${TIMETABLE_API}/entries/${cellEditor.entry.id}`,
        { method: "DELETE" }
      );
      setCellEditor(null);
      showMessage(data.message || "تم تفريغ الخلية.", "success");
      await refreshAfterAssignment();
    } catch (error) {
      showMessage(error.message || "تعذر تفريغ الخلية", "error");
    } finally {
      setAssignmentSaving(false);
    }
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

          <button type="button" onClick={openManualEditor}>
            <span aria-hidden="true">▦</span>
            تعديل الجداول يدويًا
          </button>
          <button type="button" onClick={openTimesEditor}>
            <span aria-hidden="true">◷</span>
            تعديل أوقات الحصص
          </button>
          <button
            type="button"
            onClick={() =>
              showMessage("ميزة تكوين الجداول ستُضاف في المرحلة التالية.")
            }
          >
            <span aria-hidden="true">＋</span>
            تكوين الجداول
          </button>
        </div>

        <div className="timetable-grade-strip" aria-label="اختيار الصف">
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
          <div
            className={`timetable-inline-message ${messageType}`}
            role="status"
          >
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}

        <div className="timetable-preview-card">
          <div className="timetable-live-grid-wrap">
            <table className="timetable-live-grid">
              <thead>
                <tr>
                  <th className="lesson-index-column">الحصة</th>
                  <th className="lesson-time-column">الوقت</th>
                  {SECTIONS.map((section) => (
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
                        className={`timetable-opportunity-row ${
                          timeline.currentBreakKey === row.key
                            ? "current-break"
                            : ""
                        }`}
                      >
                        <td colSpan={SECTIONS.length + 2}>
                          <div className="timetable-opportunity-band">
                            <span />
                            <strong>الفرصة</strong>
                            <small>
                              {formatClock(row.start)} — {formatClock(row.end)}
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
                      <th className="lesson-index-cell">
                        <span>الحصة</span>
                        <strong>{period.period_number}</strong>
                      </th>
                      <td className="lesson-time-cell">
                        <strong>{formatClock(period.start)}</strong>
                        <span>إلى</span>
                        <strong>{formatClock(period.end)}</strong>
                      </td>
                      {SECTIONS.map((section) => {
                        const entry = previewEntryMap.get(
                          entryKey(section, period.period_number)
                        );
                        return (
                          <td key={`${section}-${period.period_number}`}>
                            {entry ? (
                              <div className="lesson-assignment">
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
                              <div className="lesson-assignment empty">
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

            {previewLoading && (
              <div className="timetable-table-loading">جاري تحميل الجدول...</div>
            )}

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
                    {formatClock(
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

      {timesEditorOpen && (
        <div
          className="timetable-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingTimes) {
              setTimesEditorOpen(false);
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
                <p>كل ضغطة تغيّر الوقت بمقدار 15 دقيقة.</p>
              </div>
              <button
                type="button"
                className="timetable-modal-close"
                onClick={() => setTimesEditorOpen(false)}
                disabled={savingTimes}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="timetable-shift-switch">
              {["صباحي", "ظهري"].map((shift) => (
                <button
                  key={shift}
                  type="button"
                  className={editorShift === shift ? "active" : ""}
                  onClick={() => setEditorShift(shift)}
                >
                  الدوام {shift}
                </button>
              ))}
            </div>

            <div className="timetable-times-list">
              {draftTimes[editorShift].map((period, index) => (
                <div className="timetable-time-row" key={period.period_number}>
                  <strong>الحصة {index + 1}</strong>
                  <div className="timetable-time-control">
                    <span>من</span>
                    <div className="time-stepper">
                      <button
                        type="button"
                        onClick={() => adjustDraftTime(index, "start", -15)}
                      >
                        −15
                      </button>
                      <b>{formatClock(period.start)}</b>
                      <button
                        type="button"
                        onClick={() => adjustDraftTime(index, "start", 15)}
                      >
                        +15
                      </button>
                    </div>
                  </div>
                  <div className="timetable-time-control">
                    <span>إلى</span>
                    <div className="time-stepper">
                      <button
                        type="button"
                        onClick={() => adjustDraftTime(index, "end", -15)}
                      >
                        −15
                      </button>
                      <b>{formatClock(period.end)}</b>
                      <button
                        type="button"
                        onClick={() => adjustDraftTime(index, "end", 15)}
                      >
                        +15
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="timetable-lessons-controls">
              <button type="button" onClick={removePeriod}>
                حذف آخر حصة
              </button>
              <button type="button" onClick={addPeriod}>
                إضافة حصة
              </button>
            </div>

            <div className="timetable-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setTimesEditorOpen(false)}
                disabled={savingTimes}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary"
                onClick={saveEditedTimes}
                disabled={savingTimes}
              >
                {savingTimes ? "جاري الحفظ..." : "حفظ الأوقات"}
              </button>
            </div>
          </section>
        </div>
      )}

      {manualOpen && (
        <div className="timetable-modal-overlay manual-editor-overlay">
          <section
            className="manual-timetable-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-editor-title"
          >
            <div className="timetable-modal-header manual-header">
              <div>
                <span>إدارة الجداول</span>
                <h2 id="manual-editor-title">تعديل الجداول يدويًا</h2>
                <p>
                  اختر الدوام والمرحلة والصف والشعبة، ثم عدّل خلايا الجدول.
                </p>
              </div>
              <button
                type="button"
                className="timetable-modal-close"
                onClick={() => setManualOpen(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            {manualView === "selection" ? (
              <div className="manual-selection-content">
                <section className="manual-selection-step">
                  <div className="manual-step-heading">
                    <span>1</span>
                    <div>
                      <h3>اختر الدوام</h3>
                      <p>تظهر لاحقًا معلمات الشفت المختار فقط.</p>
                    </div>
                  </div>
                  <div className="manual-card-grid two-columns">
                    {["صباحي", "ظهري"].map((shift) => (
                      <button
                        key={shift}
                        type="button"
                        className={`manual-choice-card shift-card ${
                          manualShift === shift ? "active" : ""
                        }`}
                        onClick={() => setManualShift(shift)}
                      >
                        <span aria-hidden="true">
                          {shift === "صباحي" ? "☀" : "◐"}
                        </span>
                        <strong>الدوام {shift}</strong>
                        <small>
                          {shift === "صباحي"
                            ? "معلمات الصباحي والمشترك"
                            : "معلمات الظهري والمشترك"}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="manual-selection-step">
                  <div className="manual-step-heading">
                    <span>2</span>
                    <div>
                      <h3>اختر المرحلة الدراسية</h3>
                      <p>تظهر الصفوف التابعة للمرحلة المختارة.</p>
                    </div>
                  </div>
                  <div className="manual-card-grid three-columns">
                    {STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        className={`manual-choice-card ${
                          manualStageId === stage.id ? "active" : ""
                        }`}
                        onClick={() => chooseStage(stage)}
                      >
                        <strong>{stage.title}</strong>
                        <small>{stage.grades.length} صفوف</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="manual-selection-step">
                  <div className="manual-step-heading">
                    <span>3</span>
                    <div>
                      <h3>اختر الصف</h3>
                      <p>{selectedStage.title}</p>
                    </div>
                  </div>
                  <div className="manual-card-grid grade-columns">
                    {selectedStage.grades.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        className={`manual-choice-card compact ${
                          manualGrade === grade ? "active" : ""
                        }`}
                        onClick={() => setManualGrade(grade)}
                      >
                        <strong>{grade}</strong>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="manual-selection-step">
                  <div className="manual-step-heading">
                    <span>4</span>
                    <div>
                      <h3>اختر الشعبة</h3>
                      <p>سيظهر جدول هذه الشعبة وحدها.</p>
                    </div>
                  </div>
                  <div className="manual-card-grid section-columns">
                    {SECTIONS.map((section) => (
                      <button
                        key={section}
                        type="button"
                        className={`manual-choice-card section-card ${
                          manualSection === section ? "active" : ""
                        }`}
                        onClick={() => setManualSection(section)}
                      >
                        <span>شعبة</span>
                        <strong>{section}</strong>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="manual-selection-summary">
                  <div>
                    <span>الاختيار الحالي</span>
                    <strong>
                      الدوام {manualShift} — {manualGrade} — شعبة {manualSection}
                    </strong>
                  </div>
                  <button type="button" onClick={openManualTable}>
                    فتح جدول الشعبة
                  </button>
                </div>
              </div>
            ) : (
              <div className="manual-table-content">
                <div className="manual-table-toolbar">
                  <button
                    type="button"
                    className="manual-back-button"
                    onClick={() => setManualView("selection")}
                  >
                    رجوع للاختيار
                  </button>
                  <div className="manual-table-identity">
                    <span>الدوام {manualShift}</span>
                    <strong>{manualGrade}</strong>
                    <b>شعبة {manualSection}</b>
                  </div>
                  <div className="manual-day-tabs">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={manualDay === day ? "active" : ""}
                        onClick={() => setManualDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="manual-table-wrap">
                  <table className="manual-section-table">
                    <thead>
                      <tr>
                        <th>الحصة</th>
                        <th>الوقت</th>
                        <th>المادة والمعلمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(times[manualShift] || []).map((period) => {
                        const entry = manualEntryMap.get(period.period_number);
                        return (
                          <tr key={`${manualShift}-${period.period_number}`}>
                            <th>
                              <span>الحصة</span>
                              <strong>{period.period_number}</strong>
                            </th>
                            <td className="manual-period-time">
                              <strong>{formatClock(period.start)}</strong>
                              <span>إلى</span>
                              <strong>{formatClock(period.end)}</strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`manual-editable-cell ${
                                  entry ? "filled" : "empty"
                                }`}
                                onClick={() => openCellEditor(period)}
                              >
                                {entry ? (
                                  <>
                                    <strong>{entry.subject}</strong>
                                    <span>
                                      {entry.teacher_name || "معلمة غير محددة"}
                                    </span>
                                    {entry.teacher_specialization && (
                                      <small>{entry.teacher_specialization}</small>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <strong>＋ إضافة درس</strong>
                                    <span>اضغط لاختيار المادة والمعلمة</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {manualLoading && (
                    <div className="timetable-table-loading">
                      جاري تحميل جدول الشعبة...
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {cellEditor && (
        <div className="timetable-modal-overlay cell-editor-overlay">
          <section
            className="lesson-cell-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cell-editor-title"
          >
            <div className="timetable-modal-header">
              <div>
                <span>
                  {manualGrade} — شعبة {manualSection} — {manualDay}
                </span>
                <h2 id="cell-editor-title">
                  تعديل الحصة {cellEditor.period.period_number}
                </h2>
                <p>
                  {formatClock(cellEditor.period.start)} إلى{" "}
                  {formatClock(cellEditor.period.end)}
                </p>
              </div>
              <button
                type="button"
                className="timetable-modal-close"
                onClick={() => setCellEditor(null)}
                disabled={assignmentSaving}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="lesson-editor-body">
              <section className="lesson-editor-section">
                <div className="lesson-editor-heading">
                  <h3>المادة</h3>
                  <span>اختر مادة أو اكتب اسمًا آخر</span>
                </div>
                <div className="subject-chip-list">
                  {SUBJECTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={subject === item ? "active" : ""}
                      onClick={() => setSubject(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={100}
                  placeholder="اسم المادة"
                  className="lesson-subject-input"
                />
              </section>

              <section className="lesson-editor-section teacher-section">
                <div className="lesson-editor-heading">
                  <h3>المعلمة</h3>
                  <span>
                    تظهر معلمات الدوام {manualShift} والمعلمات المسجلات للدوامين.
                  </span>
                </div>

                {teachersLoading ? (
                  <div className="teacher-list-state">جاري تحميل المعلمات...</div>
                ) : teachers.length === 0 ? (
                  <div className="teacher-list-state warning">
                    لا توجد معلمات مسجلات لهذا الشفت.
                  </div>
                ) : (
                  <div className="teacher-choice-list">
                    {teachers.map((teacher) => {
                      const hasConflict = Boolean(teacher.conflict_entry_id);
                      const isSelected = selectedTeacherId === teacher.id;
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          className={`teacher-choice ${
                            hasConflict ? "conflict" : "available"
                          } ${isSelected ? "selected" : ""}`}
                          onClick={() => selectTeacher(teacher)}
                        >
                          <div className="teacher-choice-main">
                            <strong>{teacher.full_name}</strong>
                            <span>
                              {teacher.specialization || "بدون اختصاص مسجل"}
                            </span>
                          </div>
                          {hasConflict ? (
                            <div className="teacher-conflict-note">
                              <b>⚠ تضارب</b>
                              <span>
                                الدوام {teacher.conflict_shift} —{" "}
                                {teacher.conflict_day_name} —{" "}
                                {teacher.conflict_grade} — شعبة{" "}
                                {teacher.conflict_section} — الحصة{" "}
                                {teacher.conflict_period_number}
                              </span>
                              <small>{teacher.conflict_subject}</small>
                            </div>
                          ) : (
                            <span className="teacher-available-badge">متاحة</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {transferCandidate && (
                <div className="teacher-transfer-confirmation" role="alert">
                  <div>
                    <strong>⚠ المعلمة موجودة في جدول آخر بالوقت نفسه</strong>
                    <p>
                      توجد في الدوام {transferCandidate.conflict_shift} —{" "}
                      {transferCandidate.conflict_day_name} —{" "}
                      {transferCandidate.conflict_grade} — شعبة{" "}
                      {transferCandidate.conflict_section} — الحصة{" "}
                      {transferCandidate.conflict_period_number}.
                    </p>
                    <p>
                      عند الاستمرار ستُنقل إلى هذا الجدول ويصبح موقعها السابق
                      فارغًا.
                    </p>
                  </div>
                  <div className="teacher-transfer-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferCandidate(null);
                        setSelectedTeacherId(null);
                      }}
                      disabled={assignmentSaving}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      className="warning-action"
                      onClick={() => saveAssignment(true)}
                      disabled={assignmentSaving}
                    >
                      {assignmentSaving
                        ? "جاري النقل..."
                        : "استمرار ونقل المعلمة"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="timetable-modal-actions lesson-actions">
              {cellEditor.entry && (
                <button
                  type="button"
                  className="danger"
                  onClick={clearAssignment}
                  disabled={assignmentSaving}
                >
                  تفريغ الخلية
                </button>
              )}
              <span className="actions-spacer" />
              <button
                type="button"
                className="secondary"
                onClick={() => setCellEditor(null)}
                disabled={assignmentSaving}
              >
                إلغاء
              </button>
              {!transferCandidate && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => saveAssignment(false)}
                  disabled={assignmentSaving}
                >
                  {assignmentSaving ? "جاري الحفظ..." : "حفظ الدرس"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}