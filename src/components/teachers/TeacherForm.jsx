import { useState } from "react";

const API_URL = "http://localhost:5000/employees";

const EMPLOYEE_TYPES = [
  "معلمة",
  "المدير",
  "المعاون",
  "مسؤول الحسابات",
  "موظف الاستعلامات",
];

const WORK_SHIFTS = ["صباحي", "ظهري", "صباحي وظهري"];

const SPECIALIZATIONS = [
  "اللغة العربية",
  "الرياضيات",
  "اللغة الإنجليزية",
  "العلوم",
  "التربية الإسلامية",
];

const splitLegacyName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    first_name: parts[0] || "",
    middle_name: parts[1] || "",
    third_name: parts.slice(2).join(" "),
  };
};

const createInitialForm = (employee) => {
  const legacyName = splitLegacyName(employee?.full_name);
  const specialization = employee?.specialization || "";
  const knownSpecialization = SPECIALIZATIONS.includes(specialization);

  return {
    first_name: employee?.first_name || legacyName.first_name,
    middle_name: employee?.middle_name || legacyName.middle_name,
    third_name: employee?.third_name || legacyName.third_name,
    employee_type: EMPLOYEE_TYPES.includes(employee?.employee_type)
      ? employee.employee_type
      : "",
    salary:
      employee?.salary === null || employee?.salary === undefined
        ? ""
        : String(employee.salary),
    address: employee?.address || "",
    phone: employee?.phone || "",
    work_shift: WORK_SHIFTS.includes(employee?.work_shift)
      ? employee.work_shift
      : "",
    specialization_option: knownSpecialization
      ? specialization
      : specialization
        ? "أخرى"
        : "",
    custom_specialization: knownSpecialization ? "" : specialization,
    notes: employee?.notes || "",
  };
};

export default function TeacherForm({ employee = null, onClose, onSaved }) {
  const [form, setForm] = useState(() => createInitialForm(employee));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicates, setDuplicates] = useState([]);
  const isEditing = Boolean(employee?.id);
  const isTeacher = form.employee_type === "معلمة";

  const handleChange = ({ target: { name, value } }) => {
    setMessage("");
    setForm((previous) => {
      if (name === "employee_type" && value !== "معلمة") {
        return {
          ...previous,
          employee_type: value,
          specialization_option: "",
          custom_specialization: "",
        };
      }

      return { ...previous, [name]: value };
    });
  };

  const getSpecialization = () => {
    if (!isTeacher) return null;

    return form.specialization_option === "أخرى"
      ? form.custom_specialization.trim()
      : form.specialization_option;
  };

  const getPayload = () => ({
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    third_name: form.third_name.trim(),
    employee_type: form.employee_type,
    salary: form.salary,
    address: form.address.trim(),
    phone: form.phone.trim(),
    work_shift: form.work_shift,
    specialization: getSpecialization(),
    notes: form.notes.trim(),
  });

  const validateForm = () => {
    if (
      !form.first_name.trim() ||
      !form.middle_name.trim() ||
      !form.third_name.trim()
    ) {
      return "الاسم الأول والثاني والثالث مطلوبة";
    }

    if (!EMPLOYEE_TYPES.includes(form.employee_type)) {
      return "يرجى اختيار نوع موظف معتمد";
    }

    if (!WORK_SHIFTS.includes(form.work_shift)) {
      return "يرجى اختيار الشفت";
    }

    if (
      form.salary !== "" &&
      (!Number.isFinite(Number(form.salary)) || Number(form.salary) < 0)
    ) {
      return "الراتب يجب أن يكون رقمًا غير سالب";
    }

    const phoneDigitCount = (form.phone.match(/[0-9٠-٩]/g) || []).length;

    if (
      form.phone &&
      (!/^[0-9٠-٩+()\-\s./]{7,20}$/.test(form.phone) || phoneDigitCount < 7)
    ) {
      return "صيغة رقم الهاتف غير صحيحة";
    }

    if (isTeacher && !getSpecialization()) {
      return "اختصاص المعلمة مطلوب";
    }

    return "";
  };

  const saveEmployee = async (force = false) => {
    const response = await fetch(
      isEditing ? `${API_URL}/${employee.id}` : API_URL,
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...getPayload(), force }),
      }
    );
    const data = await response.json();

    if (!isEditing && response.status === 409 && data.code === "POSSIBLE_DUPLICATE") {
      setDuplicates(data.duplicates || []);
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          (isEditing ? "تعذر تعديل بيانات الموظف" : "تعذر إضافة الموظف")
      );
    }

    onSaved?.(data.employee, { isEditing });
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
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

      const response = await fetch(`${API_URL}/${employeeId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر دمج الموظف");
      }

      onSaved?.(data.employee, { isEditing: true });
      onClose?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teachers-form-overlay">
      <div
        className="teachers-form-modal modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
      >
        <div className="teachers-form-header modal-sticky-header">
          <h2 id="employee-form-title">
            {isEditing ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
          </h2>
          <button
            type="button"
            className="teachers-form-close modal-sticky-close"
            onClick={onClose}
            aria-label="إغلاق نافذة الموظف"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {employee?.employee_type && !EMPLOYEE_TYPES.includes(employee.employee_type) && (
          <div className="teachers-form-legacy-note">
            النوع القديم المسجل: <strong>{employee.employee_type}</strong>. اختر النوع
            المعتمد قبل الحفظ.
          </div>
        )}

        {message && <div className="teachers-form-message" role="alert">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="teachers-form-grid">
            <Field label="الاسم الأول" name="first_name" value={form.first_name} onChange={handleChange} required />
            <Field label="الاسم الثاني" name="middle_name" value={form.middle_name} onChange={handleChange} required />
            <Field label="الاسم الثالث" name="third_name" value={form.third_name} onChange={handleChange} required />
            <SelectField label="نوع الموظف" name="employee_type" value={form.employee_type} onChange={handleChange} options={EMPLOYEE_TYPES} required />

            {isTeacher && (
              <SelectField
                label="الاختصاص"
                name="specialization_option"
                value={form.specialization_option}
                onChange={handleChange}
                options={[...SPECIALIZATIONS, "أخرى"]}
                required
              />
            )}

            {isTeacher && form.specialization_option === "أخرى" && (
              <Field label="اكتب الاختصاص" name="custom_specialization" value={form.custom_specialization} onChange={handleChange} required />
            )}

            <SelectField label="الشفت" name="work_shift" value={form.work_shift} onChange={handleChange} options={WORK_SHIFTS} required />
            <Field label="الراتب" name="salary" value={form.salary} onChange={handleChange} type="number" min="0" step="1" />
            <Field label="رقم الهاتف" name="phone" value={form.phone} onChange={handleChange} inputMode="tel" />
            <Field label="العنوان" name="address" value={form.address} onChange={handleChange} />

            <div className="teachers-form-field teachers-form-notes">
              <label htmlFor="employee-notes">الملاحظات</label>
              <textarea id="employee-notes" name="notes" value={form.notes} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="teachers-form-actions">
            <button type="button" className="teachers-form-cancel" onClick={onClose} disabled={saving}>إلغاء</button>
            <button type="submit" className="teachers-form-save" disabled={saving}>
              {saving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة الموظف"}
            </button>
          </div>
        </form>

        {duplicates.length > 0 && !isEditing && (
          <div className="teachers-duplicate-overlay">
            <div className="teachers-duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="employee-duplicates-title">
              <h3 id="employee-duplicates-title">توجد سجلات مشابهة</h3>
              {duplicates.map((duplicate) => (
                <div className="teachers-duplicate-card" key={duplicate.id}>
                  <div>
                    <strong>{duplicate.full_name}</strong>
                    <small>{duplicate.employee_code} — {duplicate.employee_type || "غير محدد"}</small>
                  </div>
                  <button type="button" disabled={saving} onClick={() => handleMerge(duplicate.id)}>دمج</button>
                </div>
              ))}
              <div className="teachers-form-actions">
                <button type="button" className="teachers-form-cancel" onClick={() => setDuplicates([])}>رجوع</button>
                <button type="button" className="teachers-form-continue" disabled={saving} onClick={handleAddAnyway}>إضافة رغم التشابه</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false, ...inputProps }) {
  const id = `employee-${name}`;

  return (
    <div className="teachers-form-field">
      <label htmlFor={id}>{label} {required && <span aria-hidden="true">*</span>}</label>
      <input id={id} type={type} name={name} value={value} onChange={onChange} required={required} {...inputProps} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, required = false }) {
  const id = `employee-${name}`;

  return (
    <div className="teachers-form-field">
      <label htmlFor={id}>{label} {required && <span aria-hidden="true">*</span>}</label>
      <select id={id} name={name} value={value} onChange={onChange} required={required}>
        <option value="">اختر</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
