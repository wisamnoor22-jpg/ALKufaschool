import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/holidays.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const HOLIDAYS_URL = `${API_BASE}/holidays`;
const SCHOOL_TIME_ZONE = "Asia/Baghdad";

const EMPTY_FORM = {
  holiday_date: "",
  title: "عطلة مدرسية",
  notes: "",
};

const holidayDateFormatter = new Intl.DateTimeFormat("ar-IQ", {
  timeZone: SCHOOL_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const normalizeHolidays = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.holidays)) return payload.holidays;
  return [];
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return "تاريخ غير محدد";
  }

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

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const today = getBaghdadToday();

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await requestJson(HOLIDAYS_URL);
      setHolidays(normalizeHolidays(data));
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر تحميل العطل");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const { upcoming, past } = useMemo(() => {
    const normalized = holidays
      .filter((holiday) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(holiday.holiday_date || ""))
      )
      .sort((a, b) =>
        String(a.holiday_date).localeCompare(String(b.holiday_date))
      );

    return {
      upcoming: normalized.filter((holiday) => holiday.holiday_date >= today),
      past: normalized
        .filter((holiday) => holiday.holiday_date < today)
        .sort((a, b) =>
          String(b.holiday_date).localeCompare(String(a.holiday_date))
        ),
    };
  }, [holidays, today]);

  const openNewHoliday = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      holiday_date: today,
    });
    setModalOpen(true);
    setNotice("");
  };

  const openEditHoliday = (holiday) => {
    setEditingId(holiday.id);
    setForm({
      holiday_date: holiday.holiday_date || "",
      title: holiday.title || "عطلة مدرسية",
      notes: holiday.notes || "",
    });
    setModalOpen(true);
    setNotice("");
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveHoliday = async (event) => {
    event.preventDefault();

    if (!form.holiday_date) {
      setNotice("اختر تاريخ العطلة أولًا.");
      return;
    }

    if (!form.title.trim()) {
      setNotice("اكتب اسمًا أو سببًا واضحًا للعطلة.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `${HOLIDAYS_URL}/${encodeURIComponent(editingId)}`
        : HOLIDAYS_URL;

      await requestJson(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          holiday_date: form.holiday_date,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
        }),
      });

      await loadHolidays();
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setNotice(
        form.holiday_date < today
          ? "تم اعتماد العطلة السابقة، وأصبح هذا اليوم معفى من خصم الغياب."
          : "تم تسجيل العطلة، ولن يُحتسب غياب الموظفين في هذا اليوم ضمن الخصم."
      );
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر حفظ العطلة");
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (holiday) => {
    const confirmed = window.confirm(
      `هل تريد حذف عطلة ${formatHolidayDate(
        holiday.holiday_date
      )}؟\nبعد الحذف يعود اليوم إلى الاحتساب العادي.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(holiday.id);
      setError("");
      await requestJson(`${HOLIDAYS_URL}/${encodeURIComponent(holiday.id)}`, {
        method: "DELETE",
      });
      await loadHolidays();
      setNotice("تم حذف العطلة وإعادة اليوم إلى الاحتساب العادي.");
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر حذف العطلة");
    } finally {
      setDeletingId(null);
    }
  };

  const renderHoliday = (holiday, type) => (
    <article className="holiday-item" key={holiday.id}>
      <div className={`holiday-date-box ${type}`} aria-hidden="true">
        <strong>
          {String(holiday.holiday_date || "").slice(8, 10) || "--"}
        </strong>
        <span>{type === "upcoming" ? "قادمة" : "سابقة"}</span>
      </div>

      <div className="holiday-info">
        <strong>{holiday.title || "عطلة مدرسية"}</strong>
        <span>{formatHolidayDate(holiday.holiday_date)}</span>
        {holiday.notes && <small>{holiday.notes}</small>}
      </div>

      <div className="holiday-actions">
        <button type="button" onClick={() => openEditHoliday(holiday)}>
          تعديل
        </button>
        <button
          type="button"
          className="danger"
          disabled={deletingId === holiday.id}
          onClick={() => deleteHoliday(holiday)}
        >
          {deletingId === holiday.id ? "..." : "حذف"}
        </button>
      </div>
    </article>
  );

  return (
    <main className="holidays-page" dir="rtl">
      <section className="holidays-shell">
        <header className="holidays-header">
          <div>
            <span className="holidays-eyebrow">تقويم الدوام</span>
            <h1>العطل المدرسية</h1>
            <p>
              إدارة العطل الرسمية والطارئة، بما فيها العطل التي يتم اعتمادها
              بعد مرور تاريخها.
            </p>
          </div>

          <button
            type="button"
            className="add-holiday-button"
            onClick={openNewHoliday}
          >
            <span aria-hidden="true">＋</span>
            تسجيل عطلة
          </button>
        </header>

        <section className="holiday-summary" aria-label="ملخص العطل">
          <div>
            <span>إجمالي العطل</span>
            <strong>{holidays.length}</strong>
          </div>
          <div>
            <span>العطل القادمة</span>
            <strong>{upcoming.length}</strong>
          </div>
          <div>
            <span>العطل السابقة</span>
            <strong>{past.length}</strong>
          </div>
        </section>

        <div className="holiday-protection-note">
          <span aria-hidden="true">✓</span>
          <p>
            <strong>حماية الراتب:</strong> تسجيل اليوم كعطلة لا يغيّر سجل
            الحضور نفسه؛ بل يجعل ذلك اليوم معفى من خصم الغياب.
          </p>
        </div>

        {notice && (
          <div className="holidays-notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="holidays-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadHolidays}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading ? (
          <div className="holidays-state">جاري تحميل العطل...</div>
        ) : (
          <div className="holiday-columns">
            <section className="holiday-group">
              <div className="holiday-group-heading">
                <div>
                  <span className="holiday-dot upcoming" />
                  <h2>العطل القادمة</h2>
                </div>
                <small>{upcoming.length}</small>
              </div>

              <div className="holiday-list">
                {upcoming.length > 0 ? (
                  upcoming.map((holiday) => renderHoliday(holiday, "upcoming"))
                ) : (
                  <p className="holiday-empty">لا توجد عطلة قادمة مسجلة.</p>
                )}
              </div>
            </section>

            <section className="holiday-group">
              <div className="holiday-group-heading">
                <div>
                  <span className="holiday-dot past" />
                  <h2>العطل السابقة</h2>
                </div>
                <small>{past.length}</small>
              </div>

              <div className="holiday-list">
                {past.length > 0 ? (
                  past.map((holiday) => renderHoliday(holiday, "past"))
                ) : (
                  <p className="holiday-empty">لا توجد عطلة سابقة مسجلة.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="holiday-modal-overlay"
          role="presentation"
          onMouseDown={closeModal}
        >
          <section
            className="holiday-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="holiday-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="holiday-modal-header">
              <div>
                <span>تقويم الدوام</span>
                <h2 id="holiday-modal-title">
                  {editingId ? "تعديل العطلة" : "تسجيل عطلة"}
                </h2>
                <p>يمكن اختيار تاريخ قادم أو تاريخ مضى سابقًا.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="إغلاق"
              >
                ×
              </button>
            </header>

            <form className="holiday-form" onSubmit={saveHoliday}>
              <label>
                <span>تاريخ العطلة</span>
                <input
                  type="date"
                  name="holiday_date"
                  value={form.holiday_date}
                  onChange={updateForm}
                  required
                />
                {form.holiday_date && (
                  <small>{formatHolidayDate(form.holiday_date)}</small>
                )}
              </label>

              <label>
                <span>اسم / سبب العطلة</span>
                <input
                  type="text"
                  name="title"
                  maxLength="120"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="مثال: عطلة رسمية أو عطلة طارئة"
                  required
                />
              </label>

              <label className="wide">
                <span>
                  ملاحظة <small>اختياري</small>
                </span>
                <textarea
                  name="notes"
                  maxLength="500"
                  rows="4"
                  value={form.notes}
                  onChange={updateForm}
                  placeholder="يمكن كتابة سبب القرار أو أي توضيح إداري."
                />
              </label>

              <div className="holiday-form-info">
                <span aria-hidden="true">i</span>
                <p>
                  إذا كان التاريخ قد مضى، يبقى سجل الحضور محفوظًا ويصبح ذلك
                  اليوم <strong>معفى من خصم الراتب</strong>.
                </p>
              </div>

              <div className="holiday-modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving
                    ? "جاري الحفظ..."
                    : editingId
                      ? "حفظ التعديل"
                      : "اعتماد العطلة"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}