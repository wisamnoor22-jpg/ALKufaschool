import React, { useState } from "react";

const API_URL = "http://localhost:5000/fees";

const initialForm = {
  amount: "",
  payment_method: "نقدًا",
  receipt_number: "",
  employee_name: "",
  notes: "",
};

export default function PaymentForm({
  fee,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totalFee = Number(fee.total_fee || 0);
  const discount = Number(fee.discount || 0);
  const paid = Number(fee.paid || 0);
  const remaining = Math.max(totalFee - discount - paid, 0);

  const handleChange = ({ target: { name, value } }) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      setMessage("أدخل مبلغ دفعة صحيحًا");
      return;
    }

    if (amount > remaining) {
      setMessage("مبلغ الدفعة أكبر من المبلغ المتبقي");
      return;
    }

    if (!form.employee_name.trim()) {
      setMessage("يرجى إدخال اسم الموظف المستلم");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/${fee.id}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            payment_method: form.payment_method,
            receipt_number:
              form.receipt_number.trim() || null,
            employee_name: form.employee_name.trim(),
            notes: form.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "تعذر تسجيل الدفعة"
        );
      }

      onSaved?.(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div className="modal-sticky-header" style={headerStyle}>
          <h2 style={{ margin: 0 }}>تسجيل دفعة</h2>

          <button
            type="button"
            className="modal-sticky-close"
            onClick={onClose}
            style={closeButtonStyle}
            aria-label="إغلاق نافذة تسجيل الدفعة"
          >
            ×
          </button>
        </div>

        <div style={studentCardStyle}>
          <strong>{fee.full_name}</strong>

          <span>
            السنة الدراسية: {fee.academic_year}
          </span>

          <span>
            المتبقي: {formatNumber(remaining)} د.ع
          </span>
        </div>

        {message && (
          <div style={messageStyle}>{message}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>
                مبلغ الدفعة *
              </label>

              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                min="1"
                max={remaining}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                طريقة الدفع
              </label>

              <select
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="نقدًا">نقدًا</option>
                <option value="تحويل مصرفي">
                  تحويل مصرفي
                </option>
                <option value="بطاقة">بطاقة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                رقم الوصل
              </label>

              <input
                name="receipt_number"
                value={form.receipt_number}
                onChange={handleChange}
                placeholder="اختياري"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                اسم الموظف المستلم *
              </label>

              <input
                name="employee_name"
                value={form.employee_name}
                onChange={handleChange}
                placeholder="اكتب اسم الموظف"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>الملاحظات</label>

            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="4"
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <div style={summaryStyle}>
            <span>المتبقي بعد الدفعة</span>

            <strong>
              {formatNumber(
                Math.max(
                  remaining - Number(form.amount || 0),
                  0
                )
              )}{" "}
              د.ع
            </strong>
          </div>

          <div style={actionsStyle}>
            <button
              type="button"
              onClick={onClose}
              style={cancelButtonStyle}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              style={saveButtonStyle}
            >
              {saving
                ? "جاري التسجيل..."
                : "تسجيل الدفعة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "720px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "16px",
  padding: "24px",
  direction: "rtl",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
};

const studentCardStyle = {
  display: "grid",
  gap: "7px",
  padding: "14px",
  marginBottom: "15px",
  background: "#f7f9fc",
  borderRadius: "10px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const summaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  marginTop: "18px",
  padding: "14px",
  background: "#f7f9fc",
  borderRadius: "9px",
  fontSize: "17px",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const saveButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#222",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const messageStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  padding: "11px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontWeight: "bold",
};
