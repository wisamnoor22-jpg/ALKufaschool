import { useEffect, useState } from "react";
import "./GradeFeesManager.css";

const API_URL = "http://localhost:5000/grade-fees";

const GRADES = [
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "الأول المتوسط",
  "الثاني المتوسط",
  "الثالث المتوسط",
  "الرابع الإعدادي",
  "الخامس الإعدادي",
  "السادس الإعدادي",
];

const EMPTY_FORM = {
  grade: GRADES[0],
  academic_year: "2026-2027",
  total_fee: "",
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} د.ع`;

export default function GradeFeesManager() {
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingFee, setEditingFee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadFees = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب الرسوم الدراسية");
      }

      setFees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showMessage(error.message || "تعذر الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const openAddModal = () => {
    setEditingFee(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (fee) => {
    setEditingFee(fee);
    setForm({
      grade: fee.grade,
      academic_year: fee.academic_year,
      total_fee: String(fee.total_fee || ""),
    });
    setMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setEditingFee(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.grade.trim() || !form.academic_year.trim()) {
      showMessage("المرحلة والسنة الدراسية مطلوبتان", "error");
      return;
    }

    if (!form.total_fee || Number(form.total_fee) <= 0) {
      showMessage("أدخل مبلغ رسم صحيحًا", "error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const url = editingFee
        ? `${API_URL}/${editingFee.id}`
        : API_URL;

      const response = await fetch(url, {
        method: editingFee ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade: form.grade.trim(),
          academic_year: form.academic_year.trim(),
          total_fee: Number(form.total_fee),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingFee
              ? "تعذر تعديل الرسم الدراسي"
              : "تعذر إضافة الرسم الدراسي")
        );
      }

      showMessage(
        editingFee
          ? "تم تعديل الرسم الدراسي بنجاح"
          : "تمت إضافة الرسم الدراسي بنجاح"
      );

      setIsModalOpen(false);
      setEditingFee(null);
      setForm(EMPTY_FORM);
      await loadFees();
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fee) => {
    const confirmed = window.confirm(
      `هل تريد حذف رسم ${fee.grade} للسنة ${fee.academic_year}؟`
    );

    if (!confirmed) return;

    try {
      setMessage("");

      const response = await fetch(`${API_URL}/${fee.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر حذف الرسم الدراسي");
      }

      showMessage("تم حذف الرسم الدراسي بنجاح");
      await loadFees();
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    }
  };

  return (
    <section className="grade-fees-manager">
      <div className="grade-fees-header">
        <div>
          <h2>إدارة الرسوم الدراسية</h2>
          <p>تحديد الرسوم السنوية لكل مرحلة دراسية</p>
        </div>

        <button
          type="button"
          className="grade-fees-add-button"
          onClick={openAddModal}
        >
          + إضافة رسم دراسي
        </button>
      </div>

      {message && (
        <div className={`grade-fees-message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="grade-fees-table-wrapper data-list-card data-list-scroll">
        <table className="grade-fees-table data-list-table">
          <thead>
            <tr>
              <th>المرحلة</th>
              <th>السنة الدراسية</th>
              <th>الرسم السنوي</th>
              <th>الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="grade-fees-empty-state data-list-empty">
                  جاري تحميل الرسوم...
                </td>
              </tr>
            ) : fees.length === 0 ? (
              <tr>
                <td colSpan="4" className="grade-fees-empty-state data-list-empty">
                  لا توجد رسوم مسجلة
                </td>
              </tr>
            ) : (
              fees.map((fee) => (
                <tr key={fee.id}>
                  <td className="grade-fees-name data-list-name">{fee.grade}</td>

                  <td>
                    <span className="grade-fees-year-badge">
                      {fee.academic_year}
                    </span>
                  </td>

                  <td className="grade-fees-amount">
                    {formatMoney(fee.total_fee)}
                  </td>

                  <td>
                    <div className="grade-fees-actions data-list-actions">
                      <button
                        type="button"
                        className="grade-fees-edit-button"
                        onClick={() => openEditModal(fee)}
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        className="grade-fees-delete-button"
                        onClick={() => handleDelete(fee)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="grade-fees-modal-overlay">
          <div className="grade-fees-modal">
            <div className="modal-sticky-close-bar">
              <button
                type="button"
                className="grade-fees-modal-close modal-sticky-close"
                onClick={closeModal}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <h3>
              {editingFee
                ? "تعديل الرسم الدراسي"
                : "إضافة رسم دراسي"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="grade-fees-form-group">
                <label>المرحلة *</label>

                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  required
                >
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grade-fees-form-group">
                <label>السنة الدراسية *</label>

                <input
                  name="academic_year"
                  value={form.academic_year}
                  onChange={handleChange}
                  placeholder="2026-2027"
                  required
                />
              </div>

              <div className="grade-fees-form-group">
                <label>الرسم السنوي *</label>

                <input
                  type="number"
                  name="total_fee"
                  value={form.total_fee}
                  onChange={handleChange}
                  min="1"
                  placeholder="500000"
                  required
                />
              </div>

              <div className="grade-fees-modal-actions">
                <button
                  type="submit"
                  className="grade-fees-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingFee
                      ? "حفظ التعديل"
                      : "حفظ"}
                </button>

                <button
                  type="button"
                  className="grade-fees-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
