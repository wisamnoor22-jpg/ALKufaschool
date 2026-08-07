import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/payroll.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const EMPLOYEES_URL = `${API_BASE}/employees`;
const HOLIDAYS_URL = `${API_BASE}/holidays`;
const SCHOOL_TIME_ZONE = "Asia/Baghdad";

const salaryFormatter = new Intl.NumberFormat("ar-IQ", {
  maximumFractionDigits: 0,
});

const holidayDateFormatter = new Intl.DateTimeFormat("ar-IQ", {
  timeZone: SCHOOL_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const EMPTY_HOLIDAY_FORM = {
  holiday_date: "",
  title: "عطلة مدرسية",
  notes: "",
};

const normalizeEmployees = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.employees)) return payload.employees;
  return [];
};

const normalizeHolidays = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.holidays)) return payload.holidays;
  return [];
};

const formatSalary = (value) => {
  if (value === null || value === undefined || value === "") {
    return "غير محدد";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "غير محدد";

  return `${salaryFormatter.format(numericValue)} د.ع`;
};

const getBaghdadToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SCHOOL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatHolidayDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "تاريخ غير محدد";

  return holidayDateFormatter.format(new Date(`${value}T12:00:00+03:00`));
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "تعذر إكمال الطلب");
    error.status = response.status;
    throw error;
  }

  return data;
};

export default function Payroll() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [holidaysError, setHolidaysError] = useState("");
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState(EMPTY_HOLIDAY_FORM);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState(null);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await requestJson(EMPLOYEES_URL);
      setEmployees(normalizeEmployees(data));
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر تحميل بيانات الموظفين");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHolidays = useCallback(async () => {
    try {
      setHolidaysLoading(true);
      setHolidaysError("");
      const data = await requestJson(HOLIDAYS_URL);
      setHolidays(normalizeHolidays(data));
    } catch (requestError) {
      console.error(requestError);
      setHolidaysError(requestError.message || "تعذر تحميل العطل");
      setHolidays([]);
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadHolidays();
  }, [loadEmployees, loadHolidays]);

  const rows = useMemo(
    () =>
      employees.map((employee, index) => ({
        ...employee,
        rowNumber: index + 1,
      })),
    [employees]
  );

  const today = getBaghdadToday();

  const { upcomingHolidays, pastHolidays } = useMemo(() => {
    const normalized = holidays
      .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(String(holiday.holiday_date || "")))
      .sort((a, b) => String(a.holiday_date).localeCompare(String(b.holiday_date)));

    return {
      upcomingHolidays: normalized.filter((holiday) => holiday.holiday_date >= today),
      pastHolidays: normalized
        .filter((holiday) => holiday.holiday_date < today)
        .sort((a, b) => String(b.holiday_date).localeCompare(String(a.holiday_date))),
    };
  }, [holidays, today]);

  const visibleUpcomingHolidays = showAllHolidays
    ? upcomingHolidays
    : upcomingHolidays.slice(0, 4);
  const visiblePastHolidays = showAllHolidays ? pastHolidays : pastHolidays.slice(0, 4);
  const hiddenHolidaysCount = Math.max(upcomingHolidays.length - 4, 0) + Math.max(pastHolidays.length - 4, 0);

  const handleReportClick = () => {
    setNotice("زر التقرير جاهز، وسنحدد تصميم تقرير الرواتب لاحقًا.");
  };

  const openNewHoliday = () => {
    setEditingHolidayId(null);
    setHolidayForm({
      ...EMPTY_HOLIDAY_FORM,
      holiday_date: today,
    });
    setHolidayModalOpen(true);
  };

  const openEditHoliday = (holiday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      holiday_date: holiday.holiday_date || "",
      title: holiday.title || "عطلة مدرسية",
      notes: holiday.notes || "",
    });
    setHolidayModalOpen(true);
  };

  const closeHolidayModal = () => {
    if (savingHoliday) return;
    setHolidayModalOpen(false);
    setEditingHolidayId(null);
    setHolidayForm(EMPTY_HOLIDAY_FORM);
  };

  const updateHolidayForm = ({ target: { name, value } }) => {
    setHolidayForm((previous) => ({ ...previous, [name]: value }));
  };

  const saveHoliday = async (event) => {
    event.preventDefault();

    if (!holidayForm.holiday_date) {
      setNotice("اختر تاريخ العطلة أولًا.");
      return;
    }

    if (!holidayForm.title.trim()) {
      setNotice("اكتب اسمًا أو سببًا واضحًا للعطلة.");
      return;
    }

    try {
      setSavingHoliday(true);
      setHolidaysError("");

      const isEditing = Boolean(editingHolidayId);
      const url = isEditing
        ? `${HOLIDAYS_URL}/${encodeURIComponent(editingHolidayId)}`
        : HOLIDAYS_URL;

      await requestJson(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          holiday_date: holidayForm.holiday_date,
          title: holidayForm.title.trim(),
          notes: holidayForm.notes.trim() || null,
        }),
      });

      await loadHolidays();
      setHolidayModalOpen(false);
      setEditingHolidayId(null);
      setHolidayForm(EMPTY_HOLIDAY_FORM);

      setNotice(
        holidayForm.holiday_date < today
          ? "تم اعتماد العطلة السابقة، وسجلات هذا اليوم أصبحت معفاة من خصم الغياب."
          : "تم تسجيل العطلة القادمة، ولن يُحتسب غياب الموظفين في هذا اليوم ضمن الخصم."
      );
    } catch (requestError) {
      console.error(requestError);
      setHolidaysError(requestError.message || "تعذر حفظ العطلة");
    } finally {
      setSavingHoliday(false);
    }
  };

  const deleteHoliday = async (holiday) => {
    const confirmed = window.confirm(
      `هل تريد حذف عطلة ${formatHolidayDate(holiday.holiday_date)}؟\nبعد الحذف يعود هذا اليوم يوم دوام عادي في احتساب الرواتب.`
    );

    if (!confirmed) return;

    try {
      setDeletingHolidayId(holiday.id);
      setHolidaysError("");
      await requestJson(`${HOLIDAYS_URL}/${encodeURIComponent(holiday.id)}`, {
        method: "DELETE",
      });
      await loadHolidays();
      setNotice("تم حذف العطلة وإعادة اليوم إلى الاحتساب العادي.");
    } catch (requestError) {
      console.error(requestError);
      setHolidaysError(requestError.message || "تعذر حذف العطلة");
    } finally {
      setDeletingHolidayId(null);
    }
  };

  const renderHolidayItem = (holiday, kind) => (
    <article className="payroll-holiday-item" key={holiday.id}>
      <div className="payroll-holiday-date-box" aria-hidden="true">
        <strong>{String(holiday.holiday_date || "").slice(8, 10) || "--"}</strong>
        <span>{kind === "upcoming" ? "قادمة" : "سابقة"}</span>
      </div>

      <div className="payroll-holiday-info">
        <strong>{holiday.title || "عطلة مدرسية"}</strong>
        <span>{formatHolidayDate(holiday.holiday_date)}</span>
        {holiday.notes && <small>{holiday.notes}</small>}
      </div>

      <div className="payroll-holiday-actions">
        <button type="button" onClick={() => openEditHoliday(holiday)}>
          تعديل
        </button>
        <button
          type="button"
          className="danger"
          disabled={deletingHolidayId === holiday.id}
          onClick={() => deleteHoliday(holiday)}
        >
          {deletingHolidayId === holiday.id ? "..." : "حذف"}
        </button>
      </div>
    </article>
  );

  return (
    <main className="payroll-page" dir="rtl">
      <section className="payroll-page-shell">
        <header className="payroll-page-header">
          <div className="payroll-title-block">
            <span className="payroll-eyebrow">إدارة الرواتب</span>
            <h1>رواتب الموظفين</h1>
            <p>جميع موظفي المدرسة ورواتبهم المسجلة في النظام.</p>
          </div>

          <button
            type="button"
            className="payroll-report-button"
            onClick={handleReportClick}
          >
            <span aria-hidden="true">▤</span>
            التقرير
          </button>
        </header>

        {notice && (
          <div className="payroll-notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="إغلاق الرسالة">
              ×
            </button>
          </div>
        )}

        <section className="payroll-holidays-card" aria-labelledby="payroll-holidays-title">
          <div className="payroll-holidays-header">
            <div className="payroll-holidays-title-wrap">
              <span className="payroll-holidays-icon" aria-hidden="true">▣</span>
              <div>
                <h2 id="payroll-holidays-title">العطل</h2>
                <p>سجّل عطلة قادمة أو اعتمد عطلة سابقة حتى لا يتحول غياب ذلك اليوم إلى خصم راتب.</p>
              </div>
            </div>

            <div className="payroll-holidays-header-actions">
              <div className="payroll-holidays-stats" aria-label="ملخص العطل">
                <span><b>{upcomingHolidays.length}</b> قادمة</span>
                <span><b>{pastHolidays.length}</b> سابقة</span>
              </div>
              <button type="button" className="payroll-add-holiday-button" onClick={openNewHoliday}>
                <span aria-hidden="true">＋</span>
                تسجيل عطلة
              </button>
            </div>
          </div>

          <div className="payroll-holiday-protection-note">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>حماية الراتب:</strong> تسجيل يوم كعطلة لا يحذف سجل الحضور؛ بل يعلّمه كـ
              <b> معفى من الخصم</b>. لذلك يمكن اعتماد عطلة مفاجئة بعد مرورها بأمان.
            </p>
          </div>

          {holidaysError && (
            <div className="payroll-holidays-error" role="alert">
              <span>{holidaysError}</span>
              <button type="button" onClick={loadHolidays}>إعادة المحاولة</button>
            </div>
          )}

          {holidaysLoading ? (
            <div className="payroll-holidays-loading">جاري تحميل العطل...</div>
          ) : (
            <div className="payroll-holidays-columns">
              <section className="payroll-holiday-group upcoming">
                <div className="payroll-holiday-group-heading">
                  <div>
                    <span className="payroll-holiday-dot" />
                    <h3>العطل القادمة</h3>
                  </div>
                  <small>{upcomingHolidays.length}</small>
                </div>
                <div className="payroll-holiday-list">
                  {visibleUpcomingHolidays.length > 0 ? (
                    visibleUpcomingHolidays.map((holiday) => renderHolidayItem(holiday, "upcoming"))
                  ) : (
                    <p className="payroll-holiday-empty">لا توجد عطلة قادمة مسجلة.</p>
                  )}
                </div>
              </section>

              <section className="payroll-holiday-group past">
                <div className="payroll-holiday-group-heading">
                  <div>
                    <span className="payroll-holiday-dot" />
                    <h3>العطل السابقة</h3>
                  </div>
                  <small>{pastHolidays.length}</small>
                </div>
                <div className="payroll-holiday-list">
                  {visiblePastHolidays.length > 0 ? (
                    visiblePastHolidays.map((holiday) => renderHolidayItem(holiday, "past"))
                  ) : (
                    <p className="payroll-holiday-empty">لا توجد عطلة سابقة مسجلة.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {!holidaysLoading && hiddenHolidaysCount > 0 && (
            <button
              type="button"
              className="payroll-toggle-holidays"
              onClick={() => setShowAllHolidays((value) => !value)}
            >
              {showAllHolidays ? "عرض مختصر" : `عرض كل العطل (+${hiddenHolidaysCount})`}
            </button>
          )}
        </section>

        {error && (
          <div className="payroll-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadEmployees}>إعادة المحاولة</button>
          </div>
        )}

        <section className="payroll-employees-panel" aria-labelledby="payroll-list-title">
          <div className="payroll-list-heading">
            <div>
              <h2 id="payroll-list-title">قائمة الرواتب</h2>
              <p>يظهر هنا كل موظف مع نوعه والراتب المسجل له.</p>
            </div>
            <span className="payroll-employees-count">
              {loading ? "..." : `${rows.length} موظف`}
            </span>
          </div>

          {loading ? (
            <div className="payroll-state">جاري تحميل الرواتب...</div>
          ) : rows.length === 0 && !error ? (
            <div className="payroll-state">لا يوجد موظفون مسجلون حاليًا.</div>
          ) : rows.length > 0 ? (
            <div className="payroll-table-wrap">
              <table className="payroll-employees-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الموظف</th>
                    <th>نوع الموظف</th>
                    <th>الراتب</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => (
                    <tr key={employee.id ?? `${employee.full_name}-${employee.rowNumber}`}>
                      <td className="payroll-row-number">{employee.rowNumber}</td>
                      <td>
                        <div className="payroll-employee-name">
                          <strong>{employee.full_name || "اسم غير محدد"}</strong>
                          {employee.employee_code && <small>{employee.employee_code}</small>}
                        </div>
                      </td>
                      <td>
                        <span className="payroll-employee-type">
                          {employee.employee_type || employee.job_title || "غير محدد"}
                        </span>
                      </td>
                      <td>
                        <strong className="payroll-salary-value">
                          {formatSalary(employee.salary)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>

      {holidayModalOpen && (
        <div className="payroll-holiday-modal-overlay" role="presentation" onMouseDown={closeHolidayModal}>
          <section
            className="payroll-holiday-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="holiday-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="payroll-holiday-modal-header">
              <div>
                <span>تقويم الدوام</span>
                <h2 id="holiday-modal-title">
                  {editingHolidayId ? "تعديل العطلة" : "تسجيل عطلة"}
                </h2>
                <p>يمكن اختيار تاريخ قادم أو تاريخ مضى سابقًا.</p>
              </div>
              <button type="button" onClick={closeHolidayModal} disabled={savingHoliday} aria-label="إغلاق">
                ×
              </button>
            </header>

            <form className="payroll-holiday-form" onSubmit={saveHoliday}>
              <label>
                <span>تاريخ العطلة</span>
                <input
                  type="date"
                  name="holiday_date"
                  value={holidayForm.holiday_date}
                  onChange={updateHolidayForm}
                  required
                />
                {holidayForm.holiday_date && (
                  <small>{formatHolidayDate(holidayForm.holiday_date)}</small>
                )}
              </label>

              <label>
                <span>اسم / سبب العطلة</span>
                <input
                  type="text"
                  name="title"
                  maxLength="120"
                  value={holidayForm.title}
                  onChange={updateHolidayForm}
                  placeholder="مثال: عطلة رسمية أو عطلة طارئة"
                  required
                />
              </label>

              <label className="wide">
                <span>ملاحظة <small>اختياري</small></span>
                <textarea
                  name="notes"
                  maxLength="500"
                  rows="3"
                  value={holidayForm.notes}
                  onChange={updateHolidayForm}
                  placeholder="يمكن كتابة سبب القرار أو أي توضيح إداري."
                />
              </label>

              <div className="payroll-holiday-form-info">
                <span aria-hidden="true">i</span>
                <p>
                  إذا كان التاريخ قد مضى، تُحدّث سجلات الحضور الموجودة لذلك اليوم تلقائيًا إلى
                  <strong> معفاة من خصم الراتب</strong> دون تزوير حالة الحضور نفسها.
                </p>
              </div>

              <div className="payroll-holiday-modal-actions">
                <button type="button" className="secondary" onClick={closeHolidayModal} disabled={savingHoliday}>
                  إلغاء
                </button>
                <button type="submit" className="primary" disabled={savingHoliday}>
                  {savingHoliday ? "جاري الحفظ..." : editingHolidayId ? "حفظ التعديل" : "اعتماد العطلة"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}