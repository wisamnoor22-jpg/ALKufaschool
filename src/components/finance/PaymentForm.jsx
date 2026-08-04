import React, { useEffect, useMemo, useState } from "react";

const FEES_API = "http://localhost:5000/fees";
const EMPLOYEES_API = "http://localhost:5000/employees";

const createInitialForm = () => ({
  amount: "",
  payment_method: "نقدًا",
  receipt_number: "",
  accountant_employee_id: "",
  assistant_employee_id: "",
  notes: "",
});

export default function PaymentForm({
  fee,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(createInitialForm);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totalFee = Number(fee.total_fee || 0);
  const discount = Number(fee.discount || 0);
  const paid = Number(fee.paid || 0);
  const remaining = Math.max(
    totalFee - discount - paid,
    0
  );

  const accountants = useMemo(() => {
    return employees.filter((employee) =>
      String(employee.employee_type || "")
        .trim()
        .includes("محاسب")
    );
  }, [employees]);

  const selectableAccountants = useMemo(() => {
    return accountants.length > 0
      ? accountants
      : employees;
  }, [accountants, employees]);

  const assistantEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        String(employee.id) !==
        String(form.accountant_employee_id)
    );
  }, [employees, form.accountant_employee_id]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (
      !form.accountant_employee_id &&
      selectableAccountants.length > 0
    ) {
      setForm((previous) => ({
        ...previous,
        accountant_employee_id: String(
          selectableAccountants[0].id
        ),
      }));
    }
  }, [
    selectableAccountants,
    form.accountant_employee_id,
  ]);

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      setMessage("");

      const response = await fetch(EMPLOYEES_API);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "تعذر جلب قائمة الموظفين"
        );
      }

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(
        error.message || "تعذر جلب قائمة الموظفين"
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleChange = ({
    target: { name, value },
  }) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (
        name === "accountant_employee_id" &&
        value === previous.assistant_employee_id
      ) {
        next.assistant_employee_id = "";
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      setMessage("أدخل مبلغ دفعة صحيحًا");
      return;
    }

    if (amount > remaining) {
      setMessage(
        "مبلغ الدفعة أكبر من المبلغ المتبقي"
      );
      return;
    }

    if (!form.accountant_employee_id) {
      setMessage("يرجى اختيار المحاسب");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `${FEES_API}/${fee.id}/payments`,
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
            accountant_employee_id: Number(
              form.accountant_employee_id
            ),
            assistant_employee_id:
              form.assistant_employee_id
                ? Number(form.assistant_employee_id)
                : null,
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
      setMessage(
        error.message || "تعذر تسجيل الدفعة"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>تسجيل دفعة</h2>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
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
            <Field label="مبلغ الدفعة *">
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                min="1"
                max={remaining}
                required
                autoFocus
                style={inputStyle}
              />
            </Field>

            <Field label="طريقة الدفع">
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
            </Field>

            <Field label="رقم الإيصال">
              <input
                name="receipt_number"
                value={form.receipt_number}
                onChange={handleChange}
                placeholder="اختياري"
                style={inputStyle}
              />
            </Field>

            <Field label="المحاسب *">
              <select
                name="accountant_employee_id"
                value={form.accountant_employee_id}
                onChange={handleChange}
                disabled={
                  loadingEmployees ||
                  selectableAccountants.length === 0
                }
                required
                style={inputStyle}
              >
                {loadingEmployees ? (
                  <option value="">
                    جاري تحميل الموظفين...
                  </option>
                ) : selectableAccountants.length ===
                  0 ? (
                  <option value="">
                    لا يوجد موظفون مسجلون
                  </option>
                ) : (
                  selectableAccountants.map(
                    (employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.full_name}
                      </option>
                    )
                  )
                )}
              </select>
            </Field>

            <Field label="الموظف المساعد">
              <select
                name="assistant_employee_id"
                value={form.assistant_employee_id}
                onChange={handleChange}
                disabled={loadingEmployees}
                style={inputStyle}
              >
                <option value="">
                  لا يوجد موظف مساعد
                </option>

                {assistantEmployees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.full_name} —{" "}
                    {employee.employee_type ||
                      "موظف"}
                  </option>
                ))}
              </select>
            </Field>
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
                  remaining -
                    Number(form.amount || 0),
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
              disabled={
                saving ||
                loadingEmployees ||
                !form.accountant_employee_id
              }
              style={{
                ...saveButtonStyle,
                opacity:
                  saving ||
                  loadingEmployees ||
                  !form.accountant_employee_id
                    ? 0.6
                    : 1,
              }}
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

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
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
  maxWidth: "760px",
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
  minHeight: "44px",
  padding: "11px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "#fff",
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