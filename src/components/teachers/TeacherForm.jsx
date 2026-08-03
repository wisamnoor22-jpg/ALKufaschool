import React, { useState } from "react";

const employeeTypes = [
  "مدير",
  "معاون إداري",
  "كادر تدريسي",
  "محاسب",
  "موظف إداري",
  "أمين مخزن",
  "حارس",
  "عامل خدمة",
  "سائق",
  "أخرى",
];

const initialForm = {
  full_name: "",
  phone: "",
  address: "",
  employee_type: "",
  custom_employee_type: "",
  salary: "",
  notes: "",
};

export default function TeacherForm({ onClose, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicates, setDuplicates] = useState([]);

  const handleChange = ({ target: { name, value } }) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const getEmployeeType = () => {
    if (form.employee_type === "أخرى") {
      return form.custom_employee_type.trim();
    }

    return form.employee_type;
  };

  const saveEmployee = async (force = false) => {
    const response = await fetch("http://localhost:5000/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        employee_type: getEmployeeType(),
        salary: form.salary,
        notes: form.notes,
        force,
      }),
    });

    const data = await response.json();

    if (
      response.status === 409 &&
      data.code === "POSSIBLE_DUPLICATE"
    ) {
      setDuplicates(data.duplicates || []);
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "تعذر إضافة الموظف");
    }

    onSaved(data.employee);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim() || !getEmployeeType()) {
      setMessage("الاسم الكامل ونوع الموظف مطلوبان");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      await saveEmployee(false);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnyway = async () => {
    try {
      setSaving(true);
      setMessage("");
      await saveEmployee(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMerge = async (employeeId) => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `http://localhost:5000/employees/${employeeId}/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            address: form.address,
            employee_type: getEmployeeType(),
            salary: form.salary,
            notes: form.notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر دمج الموظف");
      }

      onSaved(data.employee);
      onClose();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>إضافة موظف جديد</h2>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {message && <div style={messageStyle}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={gridStyle}>
            <Field
              label="الاسم الكامل"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
            />

            <SelectField
              label="نوع الموظف"
              name="employee_type"
              value={form.employee_type}
              onChange={handleChange}
              options={employeeTypes}
              required
            />

            {form.employee_type === "أخرى" && (
              <Field
                label="المسمى الوظيفي"
                name="custom_employee_type"
                value={form.custom_employee_type}
                onChange={handleChange}
                required
              />
            )}

            <Field
              label="رقم الهاتف"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />

            <Field
              label="العنوان"
              name="address"
              value={form.address}
              onChange={handleChange}
            />

            <Field
              label="الراتب"
              name="salary"
              type="number"
              value={form.salary}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginTop: "14px" }}>
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
              {saving ? "جاري الحفظ..." : "حفظ الموظف"}
            </button>
          </div>
        </form>

        {duplicates.length > 0 && (
          <div style={duplicateOverlayStyle}>
            <div style={duplicateModalStyle}>
              <h3 style={{ marginTop: 0 }}>
                توجد سجلات مشابهة
              </h3>

              {duplicates.map((employee) => (
                <div
                  key={employee.id}
                  style={duplicateCardStyle}
                >
                  <div>
                    <strong>{employee.full_name}</strong>

                    <div style={smallTextStyle}>
                      {employee.employee_code} —{" "}
                      {employee.employee_type || "بدون نوع"}
                    </div>

                    <div style={smallTextStyle}>
                      الهاتف: {employee.phone || "غير مسجل"} | السكن:{" "}
                      {employee.address || "غير مسجل"}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleMerge(employee.id)}
                    style={mergeButtonStyle}
                  >
                    دمج
                  </button>
                </div>
              ))}

              <div style={actionsStyle}>
                <button
                  type="button"
                  onClick={() => setDuplicates([])}
                  style={cancelButtonStyle}
                >
                  رجوع
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAddAnyway}
                  style={continueButtonStyle}
                >
                  إضافة رغم التشابه
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required ? "*" : ""}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required ? "*" : ""}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
      >
        <option value="">اختر</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "760px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "18px",
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
  border: 0,
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "bold",
  color: "#333",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const saveButtonStyle = {
  background: "#1e3c72",
  color: "#fff",
  border: 0,
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cancelButtonStyle = {
  background: "#e5e7eb",
  color: "#222",
  border: 0,
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const messageStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "14px",
};

const duplicateOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1100,
  padding: "20px",
};

const duplicateModalStyle = {
  width: "100%",
  maxWidth: "620px",
  maxHeight: "80vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "16px",
  padding: "22px",
};

const duplicateCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  marginBottom: "10px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  background: "#f8fafc",
};

const smallTextStyle = {
  marginTop: "5px",
  color: "#666",
  fontSize: "13px",
};

const mergeButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: 0,
  padding: "8px 14px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "bold",
};

const continueButtonStyle = {
  background: "#d97706",
  color: "#fff",
  border: 0,
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};