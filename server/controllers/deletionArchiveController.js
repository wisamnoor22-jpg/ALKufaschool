import { useEffect, useState } from "react";
import "../styles/deletionArchive.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_URL = `${API_BASE}/deletion-archive`;

const ENTITY_LABELS = {
  student: "طالب",
  employee: "موظف",
  employee_document: "مستند موظف",
  grade_fee: "رسم مرحلة",
  student_section_transfer: "تنقل بين الشعب",
};

const SECTION_LABELS = {
  student: "المعلومات الشخصية للطالب",
  student_enrollments: "بيانات التسجيل الدراسي",
  student_attendance: "سجل حضور الطالب",
  student_fees: "السجل المالي والرسوم",
  payments: "الدفعات",
  payment_receipts: "إيصالات الدفع",
  employee: "المعلومات الشخصية والوظيفية",
  employee_attendance: "سجل حضور الموظف",
  employee_documents: "مستندات الموظف",
  employee_document: "بيانات المستند",
  employee_reference: "بيانات الموظف المرتبط",
  grade_fee: "بيانات رسم المرحلة",
  transfer: "تفاصيل التنقل بين الشعب",
};

const FIELD_LABELS = {
  id: "المعرّف السابق",
  student_id: "معرّف الطالب",
  student_name: "اسم الطالب",
  employee_id: "معرّف الموظف",
  employee_code: "الرقم الوظيفي",
  full_name: "الاسم الكامل",
  gender: "النوع",
  school_shift: "وقت الدوام",
  birth_date: "تاريخ الميلاد",
  phone: "الهاتف",
  address: "العنوان",
  grade: "الصف",
  grade_id: "معرّف الصف",
  grade_name: "الصف",
  section: "الشعبة",
  section_id: "معرّف الشعبة",
  section_name: "الشعبة",
  academic_year_id: "معرّف السنة الدراسية",
  academic_year: "السنة الدراسية",
  academic_year_name: "السنة الدراسية",
  enrollment_status: "حالة التسجيل",
  result_status: "حالة النتيجة",
  promotion_status: "حالة الترحيل",
  enrollment_date: "تاريخ التسجيل",
  withdrawal_date: "تاريخ الانسحاب",
  attendance_date: "تاريخ الحضور",
  status: "الحالة",
  notes: "الملاحظات",
  total_fee: "إجمالي الرسم",
  discount: "الخصم",
  amount: "المبلغ",
  payment_date: "تاريخ الدفع",
  payment_method: "طريقة الدفع",
  receipt_number: "رقم الوصل",
  employee_name: "اسم الموظف",
  accountant_name: "اسم المحاسب",
  employee_type: "نوع الموظف",
  specialization: "الاختصاص",
  work_shift: "الشفت",
  job_title: "المسمى الوظيفي",
  salary: "الراتب",
  document_type: "نوع المستند",
  document_name: "اسم المستند",
  file_name: "اسم الملف",
  uploaded_at: "تاريخ الرفع",
  from_section_id: "معرّف الشعبة السابقة",
  from_section_name: "من شعبة",
  to_section_id: "معرّف الشعبة الجديدة",
  to_section_name: "إلى شعبة",
  transfer_reason: "سبب النقل",
  transfer_source: "طريقة النقل",
  transferred_by: "تم النقل بواسطة",
  transferred_at: "تاريخ ووقت النقل",
  created_at: "تاريخ الإنشاء",
  updated_at: "آخر تحديث",
  deleted_at: "تاريخ الحذف",
};

const EMPTY_FILTERS = {
  search: "",
  entity_type: "",
  date_from: "",
  date_to: "",
};

const formatDateTime = (value) => {
  if (!value) return "غير متوفر";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return "غير متوفر";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (
    ["amount", "total_fee", "discount", "salary"].includes(key) &&
    !Number.isNaN(Number(value))
  ) {
    return `${Number(value).toLocaleString("en-US")} د.ع`;
  }

  if (key.endsWith("_at") || key.endsWith("_date")) {
    return formatDateTime(value);
  }

  if (key === "transfer_source") {
    return value === "section_delete" ? "نقل تلقائي عند حذف شعبة" : "نقل يدوي";
  }

  return String(value);
};

function RecordGrid({ record }) {
  return (
    <dl className="deletion-record-grid">
      {Object.entries(record || {}).map(([key, value]) => (
        <div key={key}>
          <dt>{FIELD_LABELS[key] || key.replaceAll("_", " ")}</dt>
          <dd>{formatValue(key, value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function SnapshotSection({ name, value }) {
  const title = SECTION_LABELS[name] || name.replaceAll("_", " ");

  if (Array.isArray(value)) {
    return (
      <section className="deletion-detail-section">
        <div className="deletion-detail-section-heading">
          <h3>{title}</h3>
          <span>{value.length}</span>
        </div>

        {value.length === 0 ? (
          <p className="deletion-detail-empty">لا توجد سجلات محفوظة.</p>
        ) : (
          <div className="deletion-record-list">
            {value.map((record, index) => (
              <article key={record.id || `${name}-${index}`}>
                <strong className="deletion-record-number">
                  سجل {index + 1}
                </strong>
                <RecordGrid record={record} />
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="deletion-detail-section">
      <div className="deletion-detail-section-heading">
        <h3>{title}</h3>
      </div>
      <RecordGrid record={value || {}} />
    </section>
  );
}

export default function DeletionArchive() {
  const [items, setItems] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadItems = async (requestedFilters = filters, signal) => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      Object.entries(requestedFilters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await fetch(`${API_URL}${suffix}`, {
        signal,
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب السجل الإداري");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setEntityTypes(
        Array.isArray(data.entity_types) ? data.entity_types : []
      );
      setTotal(Number(data.total || 0));
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      console.error(requestError);
      setError(requestError.message || "تعذر الاتصال بالخادم");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadItems(EMPTY_FILTERS, controller.signal);

    return () => controller.abort();
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadItems(filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    loadItems(EMPTY_FILTERS);
  };

  const showDetails = async (item) => {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(item.source_id || item.id)}?record_kind=${encodeURIComponent(item.record_kind || "deletion")}`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب تفاصيل السجل");
      }

      setSelectedItem(data);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر جلب التفاصيل");
    } finally {
      setDetailsLoading(false);
    }
  };

  const getDetailsSections = (item) => {
    if (item?.snapshot_data && Object.keys(item.snapshot_data).length > 0) {
      return item.snapshot_data;
    }

    if (item?.metadata && Object.keys(item.metadata).length > 0) {
      return { transfer: item.metadata };
    }

    return {};
  };

  const getActionText = (item) => {
    if (item.record_kind === "transfer") {
      return item.action_description || "نقل بين الشعب";
    }

    return item.deletion_reason || item.action_description || "حذف من النظام";
  };

  return (
    <div className="main-content deletion-archive-page" dir="rtl">
      <header className="deletion-archive-header">
        <div>
          <h1>سجل المحذوفات والتنقلات</h1>
          <p>
            سجل إداري للقراءة فقط يحفظ العناصر المحذوفة وتنقلات الطلاب بين
            الشعب مع تاريخ كل عملية.
          </p>
        </div>

        <div className="deletion-archive-count">
          <strong>{total}</strong>
          <span>سجل إداري</span>
        </div>
      </header>

      <form
        className="deletion-archive-filters data-list-filters"
        onSubmit={handleFilterSubmit}
      >
        <input
          type="search"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
          placeholder="ابحث بالاسم أو المعرّف أو العملية..."
          maxLength="120"
        />

        <select
          value={filters.entity_type}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              entity_type: event.target.value,
            }))
          }
        >
          <option value="">جميع أنواع السجلات</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {ENTITY_LABELS[type] || type}
            </option>
          ))}
        </select>

        <label>
          <span>من تاريخ</span>
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                date_from: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>إلى تاريخ</span>
          <input
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                date_to: event.target.value,
              }))
            }
          />
        </label>

        <div className="deletion-filter-actions">
          <button type="submit">تطبيق التصفية</button>
          <button type="button" onClick={clearFilters}>
            مسح
          </button>
        </div>
      </form>

      {error && <div className="deletion-archive-error">{error}</div>}

      <section className="deletion-archive-table-wrapper data-list-card data-list-scroll">
        <table className="deletion-archive-table data-list-table">
          <thead>
            <tr>
              <th>نوع السجل</th>
              <th>الاسم</th>
              <th>المعرّف</th>
              <th>العملية</th>
              <th>المستخدم</th>
              <th>التاريخ والوقت</th>
              <th>التفاصيل</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  className="deletion-archive-empty data-list-loading"
                >
                  جاري تحميل السجل الإداري...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="deletion-archive-empty data-list-empty"
                >
                  لا توجد سجلات مطابقة.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`${item.record_kind || "deletion"}:${item.id}`}>
                  <td>
                    <span
                      className={`deletion-type ${
                        item.record_kind === "transfer"
                          ? "student"
                          : item.entity_type
                      }`}
                    >
                      {ENTITY_LABELS[item.entity_type] || item.entity_type}
                    </span>
                  </td>

                  <td className="deletion-entity-name data-list-name">
                    {item.entity_name}
                  </td>
                  <td>{item.entity_id}</td>
                  <td>{getActionText(item)}</td>
                  <td>{item.deleted_by || "النظام"}</td>
                  <td>{formatDateTime(item.deleted_at)}</td>

                  <td>
                    <button
                      type="button"
                      className="deletion-details-button data-list-action"
                      onClick={() => showDetails(item)}
                      disabled={detailsLoading}
                    >
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {selectedItem && (
        <div
          className="deletion-details-overlay"
          onMouseDown={() => setSelectedItem(null)}
        >
          <div
            className="deletion-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deletion-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-sticky-close-bar">
              <button
                type="button"
                className="deletion-details-close modal-sticky-close"
                onClick={() => setSelectedItem(null)}
                aria-label="إغلاق تفاصيل السجل"
              >
                ×
              </button>
            </div>

            <header>
              <span>
                {ENTITY_LABELS[selectedItem.entity_type] ||
                  selectedItem.entity_type}
              </span>

              <h2 id="deletion-details-title">
                {selectedItem.entity_name}
              </h2>

              <p>
                المعرّف: {selectedItem.entity_id} —{" "}
                {selectedItem.record_kind === "transfer" ? "نُقل في" : "حُذف في"}{" "}
                {formatDateTime(selectedItem.deleted_at)}
              </p>

              <strong>
                {selectedItem.record_kind === "transfer"
                  ? selectedItem.action_description || "نقل بين الشعب"
                  : `سبب الحذف: ${
                      selectedItem.deletion_reason || "غير محدد"
                    }`}
              </strong>
            </header>

            <div className="deletion-details-content">
              {Object.entries(getDetailsSections(selectedItem)).map(
                ([name, value]) => (
                  <SnapshotSection key={name} name={name} value={value} />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}