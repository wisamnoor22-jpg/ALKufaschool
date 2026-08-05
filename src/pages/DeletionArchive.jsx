import { useEffect, useState } from "react";
import "../styles/deletionArchive.css";

const API_URL = "http://localhost:5000/deletion-archive";

const ENTITY_LABELS = {
  student: "طالب",
  employee: "موظف",
  employee_document: "مستند موظف",
  grade_fee: "رسم مرحلة",
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
};

const FIELD_LABELS = {
  id: "المعرّف السابق",
  student_id: "معرّف الطالب",
  employee_id: "معرّف الموظف",
  employee_code: "الرقم الوظيفي",
  full_name: "الاسم الكامل",
  gender: "النوع",
  birth_date: "تاريخ الميلاد",
  phone: "الهاتف",
  address: "العنوان",
  grade: "الصف",
  section: "الشعبة",
  created_at: "تاريخ الإنشاء",
  updated_at: "آخر تحديث",
  academic_year_id: "معرّف السنة الدراسية",
  academic_year: "السنة الدراسية",
  academic_year_name: "السنة الدراسية",
  grade_id: "معرّف الصف",
  grade_name: "الصف",
  section_id: "معرّف الشعبة",
  section_name: "الشعبة",
  enrollment_status: "حالة التسجيل",
  result_status: "حالة النتيجة",
  promotion_status: "حالة الترحيل",
  enrollment_date: "تاريخ التسجيل",
  withdrawal_date: "تاريخ الانسحاب",
  deleted_at: "تاريخ الحذف المنطقي السابق",
  attendance_date: "تاريخ الحضور",
  status: "الحالة",
  notes: "الملاحظات",
  student_enrollment_id: "معرّف التسجيل",
  total_fee: "إجمالي الرسم",
  discount: "الخصم",
  student_fee_id: "معرّف سجل الرسم",
  amount: "المبلغ",
  payment_date: "تاريخ الدفع",
  payment_method: "طريقة الدفع",
  receipt_number: "رقم الوصل",
  employee_name: "اسم الموظف",
  accountant_employee_id: "معرّف المحاسب",
  accountant_name: "اسم المحاسب",
  assistant_employee_id: "معرّف المساعد",
  assistant_name: "اسم المساعد",
  responsible_employee_id: "معرّف المسؤول",
  responsible_employee_name: "اسم المسؤول",
  payment_id: "معرّف الدفعة",
  receipt_code: "رمز الإيصال",
  printed: "تمت الطباعة",
  employee_type: "نوع الموظف",
  first_name: "الاسم الأول",
  middle_name: "الاسم الثاني",
  third_name: "الاسم الثالث",
  specialization: "الاختصاص",
  work_shift: "الشفت",
  job_title: "المسمى الوظيفي",
  salary: "الراتب",
  fingerprint_id: "معرّف البصمة",
  check_in_time: "وقت الحضور",
  check_out_time: "وقت الانصراف",
  late_minutes: "دقائق التأخير",
  document_type: "نوع المستند",
  document_name: "اسم المستند",
  file_name: "اسم الملف",
  file_path: "مسار الملف",
  file_size: "حجم الملف",
  uploaded_at: "تاريخ الرفع",
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

  return String(value);
};

function RecordGrid({ record }) {
  return (
    <dl className="deletion-record-grid">
      {Object.entries(record).map(([key, value]) => (
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

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch(API_URL, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "تعذر جلب سجل المحذوفات");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setEntityTypes(
          Array.isArray(data.entity_types) ? data.entity_types : []
        );
        setTotal(Number(data.total || 0));
        setError("");
      })
      .catch((requestError) => {
        if (!active || requestError.name === "AbortError") return;
        console.error(requestError);
        setError(requestError.message || "تعذر الاتصال بالخادم");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadItems = async (requestedFilters) => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      Object.entries(requestedFilters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });

      const response = await fetch(`${API_URL}?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب سجل المحذوفات");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setEntityTypes(
        Array.isArray(data.entity_types) ? data.entity_types : []
      );
      setTotal(Number(data.total || 0));
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

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

      const response = await fetch(`${API_URL}/${item.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب تفاصيل العنصر المحذوف");
      }

      setSelectedItem(data);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "تعذر جلب التفاصيل");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="main-content deletion-archive-page" dir="rtl">
      <header className="deletion-archive-header">
        <div>
          <h1>سجل المحذوفات</h1>
          <p>سجل إداري للقراءة فقط يحتفظ بنسخة البيانات قبل الحذف.</p>
        </div>
        <div className="deletion-archive-count">
          <strong>{total}</strong>
          <span>عنصر محذوف</span>
        </div>
      </header>

      <form className="deletion-archive-filters data-list-filters" onSubmit={handleFilterSubmit}>
        <input
          type="search"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
          placeholder="ابحث بالاسم أو المعرّف أو سبب الحذف..."
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
          <option value="">جميع أنواع العناصر</option>
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
              <th>نوع العنصر</th>
              <th>الاسم</th>
              <th>المعرّف السابق</th>
              <th>سبب الحذف</th>
              <th>المستخدم</th>
              <th>تاريخ ووقت الحذف</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="deletion-archive-empty data-list-loading">
                  جاري تحميل سجل المحذوفات...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="deletion-archive-empty data-list-empty">
                  لا توجد عناصر محذوفة مطابقة.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`deletion-type ${item.entity_type}`}>
                      {ENTITY_LABELS[item.entity_type] || item.entity_type}
                    </span>
                  </td>
                  <td className="deletion-entity-name data-list-name">{item.entity_name}</td>
                  <td>{item.entity_id}</td>
                  <td>{item.deletion_reason || "سبب عام غير محدد"}</td>
                  <td>{item.deleted_by || "غير متوفر في النظام الحالي"}</td>
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
        <div className="deletion-details-overlay">
          <div
            className="deletion-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deletion-details-title"
          >
            <div className="modal-sticky-close-bar">
              <button
                type="button"
                className="deletion-details-close modal-sticky-close"
                onClick={() => setSelectedItem(null)}
                aria-label="إغلاق تفاصيل العنصر المحذوف"
              >
                ×
              </button>
            </div>

            <header>
              <span>
                {ENTITY_LABELS[selectedItem.entity_type] ||
                  selectedItem.entity_type}
              </span>
              <h2 id="deletion-details-title">{selectedItem.entity_name}</h2>
              <p>
                المعرّف السابق: {selectedItem.entity_id} — حُذف في{" "}
                {formatDateTime(selectedItem.deleted_at)}
              </p>
              <strong>
                سبب الحذف: {selectedItem.deletion_reason || "غير محدد"}
              </strong>
            </header>

            <div className="deletion-details-content">
              {Object.entries(selectedItem.snapshot_data || {}).map(
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
