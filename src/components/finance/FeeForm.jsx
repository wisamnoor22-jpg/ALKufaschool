import React, { useMemo, useState } from "react";

const API_URL = "http://localhost:5000/fees";

function getAcademicYears() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const currentStartYear = month >= 7 ? year : year - 1;

  return {
    defaultYear: `${currentStartYear}-${currentStartYear + 1}`,
    options: [
      `${currentStartYear - 1}-${currentStartYear}`,
      `${currentStartYear}-${currentStartYear + 1}`,
    ],
  };
}

const academicYears = getAcademicYears();

const initialForm = {
  student_id: "",
  academic_year: academicYears.defaultYear,
  total_fee: "",
  discount: "",
};

export default function FeeForm({
  students = [],
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(initialForm);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query || selectedStudent) return [];

    return students
      .filter((student) => {
        return (
          student.full_name?.toLowerCase().includes(query) ||
          student.grade?.toLowerCase().includes(query) ||
          student.section?.toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }, [students, studentSearch, selectedStudent]);

  const handleChange = ({ target: { name, value } }) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleStudentSearch = (event) => {
    const value = event.target.value;

    setStudentSearch(value);
    setSelectedStudent(null);
    setShowResults(Boolean(value.trim()));

    setForm((previous) => ({
      ...previous,
      student_id: "",
    }));
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearch(student.full_name);
    setShowResults(false);
    setMessage("");

    setForm((previous) => ({
      ...previous,
      student_id: student.id,
    }));
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setShowResults(false);

    setForm((previous) => ({
      ...previous,
      student_id: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.student_id ||
      !form.academic_year ||
      !form.total_fee
    ) {
      setMessage(
        "الطالب والسنة الدراسية ومبلغ القسط مطلوبة"
      );
      return;
    }

    const totalFee = Number(form.total_fee);
    const discount = Number(form.discount || 0);

    if (totalFee <= 0) {
      setMessage("يجب أن يكون مبلغ القسط أكبر من صفر");
      return;
    }

    if (discount < 0 || discount > totalFee) {
      setMessage("قيمة الخصم غير صحيحة");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: Number(form.student_id),
          academic_year: form.academic_year,
          total_fee: totalFee,
          discount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر إضافة القسط");
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
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>إضافة قسط جديد</h2>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {message && (
          <div style={messageStyle}>{message}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={studentSearchContainerStyle}>
            <label style={labelStyle}>
              البحث عن الطالب *
            </label>

            <input
              value={studentSearch}
              onChange={handleStudentSearch}
              onFocus={() => {
                if (studentSearch.trim() && !selectedStudent) {
                  setShowResults(true);
                }
              }}
              placeholder="اكتب اسم الطالب أو الصف..."
              autoComplete="off"
              style={inputStyle}
            />

            {showResults && (
              <div style={searchResultsStyle}>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => selectStudent(student)}
                      style={studentResultStyle}
                    >
                      <strong>{student.full_name}</strong>

                      <span style={studentDetailsStyle}>
                        {student.grade || "الصف غير محدد"}
                        {student.section
                          ? ` — الشعبة ${student.section}`
                          : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={noResultsStyle}>
                    لا توجد نتائج مطابقة
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div style={selectedStudentStyle}>
              <div>
                <strong>{selectedStudent.full_name}</strong>

                <span style={studentDetailsStyle}>
                  {selectedStudent.grade || "الصف غير محدد"}
                  {selectedStudent.section
                    ? ` — الشعبة ${selectedStudent.section}`
                    : ""}
                </span>
              </div>

              <button
                type="button"
                onClick={clearStudent}
                style={changeStudentButtonStyle}
              >
                تغيير
              </button>
            </div>
          )}

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>
                السنة الدراسية *
              </label>

              <select
                name="academic_year"
                value={form.academic_year}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                {academicYears.options.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                مبلغ القسط *
              </label>

              <input
                type="number"
                name="total_fee"
                value={form.total_fee}
                onChange={handleChange}
                min="1"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>الخصم</label>

              <input
                type="number"
                name="discount"
                value={form.discount}
                onChange={handleChange}
                min="0"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={summaryStyle}>
            <span>القسط بعد الخصم</span>

            <strong>
              {Math.max(
                Number(form.total_fee || 0) -
                  Number(form.discount || 0),
                0
              ).toLocaleString()}{" "}
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
              {saving ? "جاري الحفظ..." : "حفظ القسط"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1200,
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "650px",
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
  marginBottom: "20px",
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
};

const studentSearchContainerStyle = {
  position: "relative",
  marginBottom: "14px",
};

const searchResultsStyle = {
  position: "absolute",
  top: "100%",
  right: 0,
  left: 0,
  zIndex: 20,
  maxHeight: "260px",
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #d6dbe2",
  borderRadius: "8px",
  boxShadow: "0 8px 20px rgba(0,0,0,.12)",
};

const studentResultStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  padding: "12px",
  textAlign: "right",
  background: "#fff",
  color: "#111827",
  border: "none",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
};

const selectedStudentStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "13px",
  marginBottom: "16px",
  background: "#eef4fb",
  border: "1px solid #cbd9ea",
  borderRadius: "9px",
};

const changeStudentButtonStyle = {
  border: "none",
  background: "#e5e7eb",
  color: "#222",
  padding: "7px 12px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "bold",
};

const studentDetailsStyle = {
  display: "block",
  color: "#777",
  fontSize: "13px",
  marginTop: "5px",
};

const noResultsStyle = {
  padding: "15px",
  textAlign: "center",
  color: "#777",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
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
  background: "#1e3c72",
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