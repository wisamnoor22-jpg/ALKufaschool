import { useEffect, useMemo, useState } from "react";
import ReportPrintHeader from "../components/common/ReportPrintHeader";
import "../styles/attendance.css";
import "../styles/reportPrint.css";

const API_BASE = "http://localhost:5000";

const attendanceSections = [
  {
    id: "students",
    title: "حضور الطلاب",
    description: "البحث عن الطلاب وتسجيل الحضور والغياب والإجازات",
    code: "ST",
  },
  {
    id: "employees",
    title: "حضور الموظفين",
    description: "البحث عن الموظفين وتسجيل الحضور والغياب والإجازات",
    code: "HR",
  },
];

const STATUS_LABELS = {
  present: "حاضر",
  excused: "مجاز",
  absent: "غائب",
  late: "متأخر",
};

const createEmptyRecord = () => ({
  status: "present",
  notes: "",
  check_in_time: "",
  check_out_time: "",
  late_minutes: 0,
});

const isValidTime = (value) =>
  !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

function AttendanceWorkspace({
  type,
  title,
  peopleUrl,
  attendanceUrl,
  onBack,
}) {
  const isStudents = type === "students";

  const [people, setPeople] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(getLocalDate());
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("الكل");
  const [section, setSection] = useState("الكل");
  const [employeeType, setEmployeeType] = useState("الكل");
  const [loading, setLoading] = useState(true);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [reportOpen, setReportOpen] = useState(false);

  const showMessage = (text, kind = "success") => {
    setMessage(text);
    setMessageType(kind);
  };

  const personKey = (person) =>
    isStudents ? Number(person.enrollment_id) : Number(person.id);

  const getRecord = (person) =>
    records[personKey(person)] || createEmptyRecord();

  const updateStatus = (person, status) => {
    const key = personKey(person);

    setRecords((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] || createEmptyRecord()),
        status,
      },
    }));
  };

  const updateNotes = (person, notes) => {
    const key = personKey(person);

    setRecords((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] || createEmptyRecord()),
        notes,
      },
    }));
  };

  const updateEmployeeField = (person, field, value) => {
    const key = personKey(person);

    setRecords((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] || createEmptyRecord()),
        [field]: value,
      },
    }));
  };

  const loadPeople = async () => {
    const response = await fetch(`${API_BASE}${peopleUrl}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "تعذر تحميل الأسماء");
    }

    const list = Array.isArray(data) ? data : [];

    setPeople(
      isStudents
        ? list.filter((person) => Number(person.enrollment_id) > 0)
        : list
    );
  };

  const loadAttendance = async () => {
    const response = await fetch(
      `${API_BASE}${attendanceUrl}?date=${encodeURIComponent(date)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "تعذر تحميل الحضور");
    }

    const loaded = {};

    (Array.isArray(data) ? data : []).forEach((record) => {
      const key = isStudents
        ? Number(record.student_enrollment_id)
        : Number(record.employee_id);

      loaded[key] = {
        status: record.status || "present",
        notes: record.notes || "",
        check_in_time: record.check_in_time || "",
        check_out_time: record.check_out_time || "",
        late_minutes: Number(record.late_minutes || 0),
      };
    });

    setRecords(loaded);
    setAttendanceLoaded(true);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setAttendanceLoaded(false);
        setMessage("");
        await Promise.all([loadPeople(), loadAttendance()]);
      } catch (error) {
        console.error(error);
        showMessage(error.message || "Failed to fetch", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [date, type]);

  const grades = useMemo(
    () =>
      [...new Set(people.map((person) => person.grade).filter(Boolean))],
    [people]
  );

  const sections = useMemo(() => {
    const source =
      grade === "الكل"
        ? people
        : people.filter((person) => person.grade === grade);

    return [
      ...new Set(source.map((person) => person.section).filter(Boolean)),
    ];
  }, [people, grade]);

  const employeeTypes = useMemo(
    () =>
      [
        ...new Set(
          people.map((person) => person.employee_type).filter(Boolean)
        ),
      ],
    [people]
  );

  const filteredPeople = useMemo(() => {
    const query = normalize(search);

    return people.filter((person) => {
      const matchesSearch =
        !query ||
        normalize(person.full_name).includes(query) ||
        normalize(person.phone).includes(query);

      if (isStudents) {
        const matchesGrade =
          grade === "الكل" || person.grade === grade;
        const matchesSection =
          section === "الكل" || person.section === section;

        return matchesSearch && matchesGrade && matchesSection;
      }

      const matchesType =
        employeeType === "الكل" ||
        person.employee_type === employeeType;

      return matchesSearch && matchesType;
    });
  }, [
    people,
    search,
    isStudents,
    grade,
    section,
    employeeType,
  ]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    return filteredPeople.slice(0, 8);
  }, [filteredPeople, search]);

  const absentPeople = useMemo(
    () =>
      people.filter(
        (person) => getRecord(person).status === "absent"
      ),
    [people, records]
  );

  const excusedPeople = useMemo(
    () =>
      people.filter(
        (person) => getRecord(person).status === "excused"
      ),
    [people, records]
  );

  const latePeople = people.filter(
    (person) => getRecord(person).status === "late"
  );

  const presentCount = people.filter(
    (person) => getRecord(person).status === "present"
  ).length;

  const reportPeople = isStudents
    ? [...absentPeople, ...excusedPeople]
    : [...absentPeople, ...excusedPeople, ...latePeople];

  const markFromSearchAbsent = (person) => {
    updateStatus(person, "absent");
    setSearch("");
    showMessage(`تمت إضافة ${person.full_name} إلى قائمة الغياب`);
  };

  const saveAttendance = async () => {
    if (people.length === 0) {
      showMessage("لا توجد أسماء لحفظ حضورها", "error");
      return;
    }

    if (!attendanceLoaded) {
      showMessage(
        "تعذر التحقق من سجل الحضور الحالي. أعد تحميل الصفحة قبل الحفظ لحماية البيانات الموجودة.",
        "error"
      );
      return;
    }

    const payloadRecords = people.map((person) => {
      const record = getRecord(person);

      const payload = {
        [isStudents ? "student_enrollment_id" : "employee_id"]:
          personKey(person),
        status: record.status,
        notes: String(record.notes || "").trim(),
      };

      if (!isStudents) {
        payload.check_in_time = record.check_in_time || null;
        payload.check_out_time = record.check_out_time || null;
        payload.late_minutes = Number(record.late_minutes || 0);
      }

      return payload;
    });

    if (!isStudents) {
      const invalidRecord = people.find((person) => {
        const record = getRecord(person);
        const lateMinutes = Number(record.late_minutes || 0);

        return (
          !isValidTime(record.check_in_time) ||
          !isValidTime(record.check_out_time) ||
          !Number.isInteger(lateMinutes) ||
          lateMinutes < 0
        );
      });

      if (invalidRecord) {
        showMessage(
          `تحقق من أوقات الحضور والانصراف ودقائق التأخير للموظف ${invalidRecord.full_name}`,
          "error"
        );
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `${API_BASE}${attendanceUrl}/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendance_date: date,
            records: payloadRecords,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر حفظ الحضور");
      }

      showMessage(data.message || "تم حفظ الحضور بنجاح");
    } catch (error) {
      console.error(error);
      showMessage(error.message || "تعذر حفظ الحضور", "error");
    } finally {
      setSaving(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const academicYear = isStudents
    ? people.find((person) => person.academic_year)?.academic_year || ""
    : "";

  return (
    <>
      <header className="attendance-page-header">
        <button
          type="button"
          className="attendance-back-button"
          onClick={onBack}
        >
          رجوع
        </button>

        <div className="attendance-heading">
          <h2>{title}</h2>
          <p>البحث السريع وتسجيل حالة الحضور اليومية</p>
        </div>

        <button
          type="button"
          className="attendance-report-button"
          onClick={() => setReportOpen(true)}
        >
          التقرير
        </button>
      </header>

      {message && (
        <div className={`attendance-message ${messageType}`}>
          {message}
        </div>
      )}

      <section className="card attendance-search-panel data-list-filters">
        <div className="attendance-date-field">
          <label>تاريخ الحضور</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="attendance-main-search">
          <label>
            ابحث عن {isStudents ? "طالب غائب" : "موظف غائب"}
          </label>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isStudents
                ? "اكتب اسم الطالب أو رقم الهاتف، مثال: وسام نور"
                : "اكتب اسم الموظف أو رقم الهاتف"
            }
            autoComplete="off"
          />

          {search.trim() && (
            <div className="attendance-search-results data-list-card data-list-rows">
              {searchResults.length > 0 ? (
                searchResults.map((person) => (
                  <button
                    type="button"
                    key={personKey(person)}
                    className="data-list-row"
                    onClick={() => markFromSearchAbsent(person)}
                  >
                    <div>
                      <strong className="data-list-name">
                        {person.full_name}
                      </strong>
                      <span>
                        {isStudents
                          ? `${person.grade || "صف غير محدد"} — ${
                              person.section || "شعبة غير محددة"
                            }`
                          : person.employee_type || "نوع غير محدد"}
                      </span>
                    </div>

                    <span className="attendance-add-absent">
                      إضافة للغياب
                    </span>
                  </button>
                ))
              ) : (
                <p className="data-list-empty">لا توجد نتائج مطابقة</p>
              )}
            </div>
          )}
        </div>

        {isStudents ? (
          <>
            <div className="attendance-filter-field">
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

            <div className="attendance-filter-field">
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
          </>
        ) : (
          <div className="attendance-filter-field">
            <label>نوع الموظف</label>
            <select
              value={employeeType}
              onChange={(event) =>
                setEmployeeType(event.target.value)
              }
            >
              <option value="الكل">جميع الموظفين</option>
              {employeeTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section
        className={`attendance-summary-grid ${
          isStudents ? "" : "employee-attendance-summary"
        }`}
      >
        <div className="attendance-summary-card total">
          <strong>{people.length}</strong>
          <span>الإجمالي</span>
        </div>
        <div className="attendance-summary-card present">
          <strong>{presentCount}</strong>
          <span>حاضر</span>
        </div>
        <div className="attendance-summary-card excused">
          <strong>{excusedPeople.length}</strong>
          <span>مجاز</span>
        </div>
        <div className="attendance-summary-card absent">
          <strong>{absentPeople.length}</strong>
          <span>غائب</span>
        </div>
        {!isStudents && (
          <div className="attendance-summary-card late">
            <strong>{latePeople.length}</strong>
            <span>متأخر</span>
          </div>
        )}
      </section>

      <section className="card attendance-absence-card data-list-card">
        <div className="attendance-section-title data-list-header">
          <div>
            <h3>قائمة الغياب اليوم</h3>
            <p>
              الضغط على الاسم من نتائج البحث يضيفه إلى هذه القائمة
            </p>
          </div>
          <span>{absentPeople.length}</span>
        </div>

        <div className="attendance-absence-list data-list-scroll">
          <div className="attendance-list-column-header attendance-absence-columns">
            <span>الاسم والبيانات</span>
            <span>الإجراء</span>
          </div>

          {absentPeople.length > 0 ? (
            <div className="attendance-selected-list data-list-rows">
              {absentPeople.map((person) => (
                <div
                  key={personKey(person)}
                  className="attendance-selected-person data-list-row"
                >
                  <div>
                    <strong className="data-list-name">
                      {person.full_name}
                    </strong>
                    <small>
                      {isStudents
                        ? `${person.grade || ""} ${
                            person.section
                              ? `— شعبة ${person.section}`
                              : ""
                          }`
                        : person.employee_type || ""}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="attendance-remove-absence data-list-action"
                    onClick={() => updateStatus(person, "present")}
                  >
                    إزالة من الغياب
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="attendance-empty-message data-list-empty">
              لم يُضف أي اسم إلى قائمة الغياب
            </p>
          )}
        </div>
      </section>

      <section className="card attendance-people-card data-list-card">
        <div className="attendance-section-title data-list-header">
          <div>
            <h3>
              قائمة {isStudents ? "الطلاب" : "الموظفين"}
            </h3>
            <p>غيّر حالة أي اسم قبل حفظ الحضور</p>
          </div>
          <span>{filteredPeople.length}</span>
        </div>

        <div
          className={`attendance-records-list data-list-scroll ${
            isStudents ? "students" : "employees"
          }`}
        >
          <div
            className={`attendance-list-column-header attendance-people-columns ${
              isStudents ? "students" : "employees"
            }`}
          >
            <span>الاسم والبيانات</span>
            <span>الحالة</span>
            {!isStudents && <span>أوقات الدوام والتأخير</span>}
            <span>الملاحظة</span>
          </div>

          {loading ? (
            <p className="attendance-loading data-list-loading">
              جاري تحميل الأسماء...
            </p>
          ) : (
            <div className="attendance-people-list data-list-rows">
              {filteredPeople.length > 0 ? (
                filteredPeople.map((person) => {
                  const record = getRecord(person);

                  return (
                    <article
                      key={personKey(person)}
                      className={`attendance-person-row data-list-row ${
                        isStudents ? "" : "employee"
                      } ${record.status}`}
                    >
                      <div className="attendance-person-info">
                        <strong className="data-list-name">
                          {person.full_name}
                        </strong>
                        <span>
                          {isStudents
                            ? `${person.grade || "صف غير محدد"} — شعبة ${
                                person.section || "غير محددة"
                              }`
                            : person.employee_type || "موظف"}
                        </span>
                      </div>

                      <div className="attendance-status-actions data-list-actions">
                      <button
                        type="button"
                        className={
                          record.status === "present"
                            ? "active present"
                            : "present"
                        }
                        onClick={() =>
                          updateStatus(person, "present")
                        }
                      >
                        حاضر
                      </button>

                      <button
                        type="button"
                        className={
                          record.status === "excused"
                            ? "active excused"
                            : "excused"
                        }
                        onClick={() =>
                          updateStatus(person, "excused")
                        }
                      >
                        مجاز
                      </button>

                      <button
                        type="button"
                        className={
                          record.status === "absent"
                            ? "active absent"
                            : "absent"
                        }
                        onClick={() =>
                          updateStatus(person, "absent")
                        }
                      >
                        غائب
                      </button>

                      {!isStudents && (
                        <button
                          type="button"
                          className={
                            record.status === "late"
                              ? "active late"
                              : "late"
                          }
                          onClick={() =>
                            updateStatus(person, "late")
                          }
                        >
                          متأخر
                        </button>
                      )}
                      </div>

                      {!isStudents && (
                        <div className="attendance-employee-times">
                        <label>
                          <span>وقت الحضور</span>
                          <input
                            className="data-list-control"
                            type="time"
                            value={record.check_in_time || ""}
                            onChange={(event) =>
                              updateEmployeeField(
                                person,
                                "check_in_time",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>وقت الانصراف</span>
                          <input
                            className="data-list-control"
                            type="time"
                            value={record.check_out_time || ""}
                            onChange={(event) =>
                              updateEmployeeField(
                                person,
                                "check_out_time",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>دقائق التأخير</span>
                          <input
                            className="data-list-control"
                            type="number"
                            min="0"
                            step="1"
                            value={record.late_minutes ?? 0}
                            onChange={(event) =>
                              updateEmployeeField(
                                person,
                                "late_minutes",
                                event.target.value
                              )
                            }
                          />
                        </label>
                        </div>
                      )}

                      <input
                        className="attendance-note-input data-list-control"
                        value={record.notes}
                        onChange={(event) =>
                          updateNotes(person, event.target.value)
                        }
                        placeholder="ملاحظة اختيارية"
                      />
                    </article>
                  );
                })
              ) : (
                <p className="attendance-empty-message data-list-empty">
                  لا توجد أسماء مطابقة
                </p>
              )}
            </div>
          )}
        </div>

        <div className="attendance-save-area">
          <button
            type="button"
            className="attendance-save-button"
            onClick={saveAttendance}
            disabled={
              saving ||
              loading ||
              !attendanceLoaded ||
              people.length === 0
            }
          >
            {saving ? "جاري الحفظ..." : "حفظ الحضور"}
          </button>
        </div>
      </section>

      {reportOpen && (
        <div className="attendance-modal-overlay">
          <div className="attendance-report-modal">
            <div className="modal-sticky-close-bar">
              <button
                type="button"
                className="attendance-modal-close modal-sticky-close"
                onClick={() => setReportOpen(false)}
                aria-label="إغلاق تقرير الحضور"
              >
                ×
              </button>
            </div>

            <div className="attendance-print-area report-print-document">
              <ReportPrintHeader
                title={`تقرير ${title}`}
                date={date}
                academicYear={academicYear}
              />

              <div className="attendance-report-counts">
                <div className="attendance-report-count absent">
                  <strong>{absentPeople.length}</strong>
                  <span>عدد الغياب</span>
                </div>

                <div className="attendance-report-count excused">
                  <strong>{excusedPeople.length}</strong>
                  <span>عدد المجازين</span>
                </div>

                {!isStudents && (
                  <div className="attendance-report-count late">
                    <strong>{latePeople.length}</strong>
                    <span>عدد المتأخرين</span>
                  </div>
                )}
              </div>

              <h3>
                {isStudents
                  ? "تفاصيل الغياب والإجازات"
                  : "تفاصيل الغياب والإجازات والتأخير"}
              </h3>

              {reportPeople.length > 0 ? (
                <div className="attendance-report-table-wrapper data-list-card data-list-scroll">
                  <table className="attendance-report-table data-list-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        {isStudents && <th>الشعبة</th>}
                        {!isStudents && <th>الحضور</th>}
                        {!isStudents && <th>الانصراف</th>}
                        {!isStudents && <th>دقائق التأخير</th>}
                        <th>الحالة</th>
                        <th>الملاحظة</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reportPeople.map((person) => {
                        const record = getRecord(person);

                        return (
                          <tr key={personKey(person)}>
                            <td>{person.full_name}</td>

                            {isStudents && (
                              <td>{person.section || "غير محددة"}</td>
                            )}

                            {!isStudents && (
                              <>
                                <td>{record.check_in_time || "—"}</td>
                                <td>{record.check_out_time || "—"}</td>
                                <td>{record.late_minutes || "—"}</td>
                              </>
                            )}

                            <td>
                              <span
                                className={`attendance-report-status ${record.status}`}
                              >
                                {STATUS_LABELS[record.status] || record.status}
                              </span>
                            </td>

                            <td>{record.notes || "لا توجد ملاحظة"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  {isStudents
                    ? "لا يوجد غائبون أو مجازون لهذا اليوم"
                    : "لا توجد حالات غياب أو إجازة أو تأخير لهذا اليوم"}
                </p>
              )}
            </div>

            <div className="attendance-report-actions">
              <button type="button" onClick={printReport}>
                طباعة التقرير
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Attendance() {
  const [activeSection, setActiveSection] = useState("");

  return (
    <div className="main-content attendance-page" dir="rtl">
      {!activeSection && (
        <>
          <header className="attendance-page-header">
            <div className="attendance-heading">
              <h2>إدارة الحضور</h2>
              <p>اختر حضور الطلاب أو حضور الموظفين</p>
            </div>
          </header>

          <section className="attendance-sections-grid">
            {attendanceSections.map((item) => (
              <button
                key={item.id}
                type="button"
                className="attendance-section-card"
                onClick={() => setActiveSection(item.id)}
              >
                <span className="attendance-section-code">
                  {item.code}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="attendance-section-arrow">←</span>
              </button>
            ))}
          </section>
        </>
      )}

      {activeSection === "students" && (
        <AttendanceWorkspace
          type="students"
          title="حضور الطلاب"
          peopleUrl="/students"
          attendanceUrl="/student-attendance"
          onBack={() => setActiveSection("")}
        />
      )}

      {activeSection === "employees" && (
        <AttendanceWorkspace
          type="employees"
          title="حضور الموظفين"
          peopleUrl="/employees"
          attendanceUrl="/employee-attendance"
          onBack={() => setActiveSection("")}
        />
      )}
    </div>
  );
}
