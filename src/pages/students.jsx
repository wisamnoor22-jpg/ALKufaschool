import { useEffect, useMemo, useState } from "react";
import "../styles/Dashboard.css";

const API_URL = "http://localhost:5000/students";

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

const SECTIONS = ["أ", "ب", "ج", "د"];

const createEmptyForm = () => ({
  full_name: "",
  gender: "",
  birth_date: "",
  phone: "",
  address: "",
  grade: GRADES[0],
  section: SECTIONS[0],
});

const formatDateForInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("الكل");
  const [filterGender, setFilterGender] = useState("الكل");
  const [filterAcademicYear, setFilterAcademicYear] = useState("الكل");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب الطلاب");
      }

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showMessage(error.message || "تعذر الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const academicYears = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.academic_year)
          .filter(Boolean)
      ),
    ];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.full_name?.toLowerCase().includes(normalizedSearch) ||
        student.phone?.toLowerCase().includes(normalizedSearch);

      const matchesGrade =
        filterGrade === "الكل" || student.grade === filterGrade;

      const matchesGender =
        filterGender === "الكل" || student.gender === filterGender;

      const matchesAcademicYear =
        filterAcademicYear === "الكل" ||
        student.academic_year === filterAcademicYear;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesGender &&
        matchesAcademicYear
      );
    });
  }, [
    students,
    search,
    filterGrade,
    filterGender,
    filterAcademicYear,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setSelectedStudent(null);
    setForm(createEmptyForm());
    setMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);

    setForm({
      full_name: student.full_name || "",
      gender: student.gender || "",
      birth_date: formatDateForInput(student.birth_date),
      phone: student.phone || "",
      address: student.address || "",
      grade: student.grade || GRADES[0],
      section: student.section || SECTIONS[0],
    });

    setMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setSelectedStudent(null);
    setForm(createEmptyForm());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      showMessage("يرجى إدخال اسم الطالب", "error");
      return;
    }

    if (!form.gender) {
      showMessage("يرجى اختيار النوع", "error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const isEditing = Boolean(selectedStudent);
      const url = isEditing
        ? `${API_URL}/${selectedStudent.id}`
        : API_URL;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? "تعذر تعديل بيانات الطالب"
              : "تعذر إضافة الطالب")
        );
      }

      if (isEditing) {
        setStudents((previousStudents) =>
          previousStudents.map((student) =>
            student.id === selectedStudent.id
              ? data.student
              : student
          )
        );

        showMessage("تم تعديل بيانات الطالب بنجاح");
      } else {
        setStudents((previousStudents) => [
          data.student,
          ...previousStudents,
        ]);

        showMessage("تمت إضافة الطالب بنجاح");
      }

      closeModal();
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الطالب: ${student.full_name}؟`
    );

    if (!confirmed) return;

    try {
      setDeletingId(student.id);
      setMessage("");

      const response = await fetch(`${API_URL}/${student.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر حذف الطالب");
      }

      setStudents((previousStudents) =>
        previousStudents.filter(
          (currentStudent) => currentStudent.id !== student.id
        )
      );

      showMessage("تم حذف الطالب بنجاح");
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="main-content"
      style={{ direction: "rtl", textAlign: "right", color: "var(--text)" }}
    >
      <header className="topbar" style={topbarStyle}>
        <div>
          <h2 style={pageTitleStyle}>إدارة الطلاب</h2>
          <p style={pageSubtitleStyle}>
            الصف والشعبة والسنة الدراسية تُقرأ من التسجيل السنوي للطالب
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          style={primaryButtonStyle}
        >
          إضافة طالب جديد +
        </button>
      </header>

      {message && (
        <div
          style={{
            ...messageStyle,
            ...(messageType === "success"
              ? successMessageStyle
              : errorMessageStyle),
          }}
        >
          {message}
        </div>
      )}

      <section className="card" style={summaryCardStyle}>
        <div>
          <h3 style={{ margin: 0 }}>سجل الطلاب والطالبات</h3>
          <p style={mutedTextStyle}>
            إجمالي الطلاب: {students.length}
          </p>
        </div>

        <div style={summaryItemsStyle}>
          <div style={summaryItemStyle}>
            <strong>{filteredStudents.length}</strong>
            <span>نتائج ظاهرة</span>
          </div>

          <div style={summaryItemStyle}>
            <strong>{academicYears[0] || "غير محددة"}</strong>
            <span>السنة الدراسية</span>
          </div>
        </div>
      </section>

      <section className="card" style={filtersCardStyle}>
        <input
          type="search"
          placeholder="ابحث باسم الطالب أو رقم الهاتف..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ ...filterInputStyle, flex: "1 1 260px" }}
        />

        <select
          value={filterGrade}
          onChange={(event) => setFilterGrade(event.target.value)}
          style={filterInputStyle}
        >
          <option value="الكل">جميع الصفوف</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>

        <select
          value={filterGender}
          onChange={(event) => setFilterGender(event.target.value)}
          style={filterInputStyle}
        >
          <option value="الكل">الطلاب والطالبات</option>
          <option value="طالب">الطلاب</option>
          <option value="طالبة">الطالبات</option>
        </select>

        <select
          value={filterAcademicYear}
          onChange={(event) =>
            setFilterAcademicYear(event.target.value)
          }
          style={filterInputStyle}
        >
          <option value="الكل">جميع السنوات</option>
          {academicYears.map((academicYear) => (
            <option key={academicYear} value={academicYear}>
              {academicYear}
            </option>
          ))}
        </select>
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <p style={loadingStyle}>جاري تحميل الطلاب...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={tableCellStyle}>الرقم</th>
                <th style={tableCellStyle}>الاسم الكامل</th>
                <th style={tableCellStyle}>النوع</th>
                <th style={tableCellStyle}>الصف الحالي</th>
                <th style={tableCellStyle}>الشعبة</th>
                <th style={tableCellStyle}>السنة الدراسية</th>
                <th style={tableCellStyle}>الحالة</th>
                <th style={tableCellStyle}>الهاتف</th>
                <th style={tableCellStyle}>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} style={tableRowStyle}>
                    <td style={tableCellStyle}>{student.id}</td>

                    <td style={studentNameCellStyle}>
                      {student.full_name}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          ...genderBadgeStyle,
                          ...(student.gender === "طالبة"
                            ? femaleBadgeStyle
                            : maleBadgeStyle),
                        }}
                      >
                        {student.gender || "غير محدد"}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      {student.grade || "غير محدد"}
                    </td>

                    <td style={tableCellStyle}>
                      {student.section || "غير محددة"}
                    </td>

                    <td style={tableCellStyle}>
                      <span style={academicYearBadgeStyle}>
                        {student.academic_year || "غير مرتبطة"}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      <span style={statusBadgeStyle}>
                        {student.enrollment_status === "active"
                          ? "مستمر"
                          : student.enrollment_status || "غير محددة"}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      {student.phone || "غير مسجل"}
                    </td>

                    <td style={tableCellStyle}>
                      <div style={actionsStyle}>
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          style={editButtonStyle}
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          disabled={deletingId === student.id}
                          style={{
                            ...deleteButtonStyle,
                            opacity:
                              deletingId === student.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === student.id
                            ? "جاري الحذف..."
                            : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={emptyStateStyle}>
                    لا توجد بيانات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button
              type="button"
              onClick={closeModal}
              style={closeButtonStyle}
              aria-label="إغلاق"
            >
              ×
            </button>

            <h2 style={modalTitleStyle}>
              {selectedStudent
                ? "تعديل بيانات الطالب"
                : "إضافة طالب أو طالبة"}
            </h2>

            <p style={modalSubtitleStyle}>
              سيتم حفظ الصف والشعبة ضمن السنة الدراسية النشطة
            </p>

            <form onSubmit={handleSubmit}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>الاسم الكامل *</label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={formGridStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>النوع *</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">اختر النوع</option>
                    <option value="طالب">طالب</option>
                    <option value="طالبة">طالبة</option>
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>تاريخ الميلاد</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={form.birth_date}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={formGridStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>الصف *</label>
                  <select
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  >
                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>الشعبة</label>
                  <select
                    name="section"
                    value={form.section}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    {SECTIONS.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={formGridStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>رقم الهاتف</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>مكان السكن</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={modalActionsStyle}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...primaryButtonStyle,
                    opacity: saving ? 0.65 : 1,
                  }}
                >
                  {saving
                    ? "جاري الحفظ..."
                    : selectedStudent
                      ? "حفظ التعديلات"
                      : "حفظ الطالب"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={secondaryButtonStyle}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const topbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const pageTitleStyle = {
  margin: 0,
  color: "var(--brand-900)",
  fontSize: "21px",
};

const pageSubtitleStyle = {
  margin: "6px 0 0",
  color: "var(--muted)",
  fontSize: "13px",
};

const messageStyle = {
  padding: "12px 14px",
  marginBottom: "16px",
  borderRadius: "10px",
  fontWeight: "700",
};

const successMessageStyle = {
  backgroundColor: "#e8f5e9",
  color: "#1b5e20",
  border: "1px solid #c8e6c9",
};

const errorMessageStyle = {
  backgroundColor: "#ffebee",
  color: "#b71c1c",
  border: "1px solid #ffcdd2",
};

const summaryCardStyle = {
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
};

const mutedTextStyle = {
  color: "var(--muted)",
  margin: "7px 0 0",
};

const summaryItemsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const summaryItemStyle = {
  minWidth: "125px",
  padding: "10px 14px",
  borderRadius: "10px",
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const filtersCardStyle = {
  marginBottom: "18px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const primaryButtonStyle = {
  backgroundColor: "#1e3c72",
  color: "#ffffff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "700",
};

const secondaryButtonStyle = {
  backgroundColor: "#e5e7eb",
  color: "var(--text)",
  border: "none",
  padding: "11px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "700",
};

const filterInputStyle = {
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  minWidth: "175px",
  backgroundColor: "var(--surface)",
  color: "var(--text)",
  colorScheme: "light dark",
  outline: "none",
  textAlign: "right",
};

const loadingStyle = {
  textAlign: "center",
  padding: "32px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1100px",
};

const tableHeaderRowStyle = {
  borderBottom: "2px solid #dbe3ec",
  backgroundColor: "var(--background)",
  color: "var(--text)",
};

const tableRowStyle = {
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
};

const tableCellStyle = {
  padding: "12px",
  textAlign: "right",
  verticalAlign: "middle",
};

const studentNameCellStyle = {
  ...tableCellStyle,
  fontWeight: "700",
  color: "var(--brand-900)",
};

const genderBadgeStyle = {
  display: "inline-flex",
  padding: "4px 9px",
  borderRadius: "999px",
  fontWeight: "700",
  fontSize: "12px",
};

const femaleBadgeStyle = {
  backgroundColor: "#fce4ec",
  color: "#c2185b",
};

const maleBadgeStyle = {
  backgroundColor: "#e3f2fd",
  color: "#1565c0",
};

const academicYearBadgeStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "8px",
  backgroundColor: "#eef2ff",
  color: "#3730a3",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const statusBadgeStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#dcfce7",
  color: "#166534",
  fontWeight: "700",
  fontSize: "12px",
};

const actionsStyle = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  backgroundColor: "#1976d2",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  padding: "7px 11px",
  cursor: "pointer",
  fontWeight: "700",
};

const deleteButtonStyle = {
  backgroundColor: "#d32f2f",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  padding: "7px 11px",
  cursor: "pointer",
  fontWeight: "700",
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "34px",
  color: "var(--muted)",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "16px",
};

const modalContentStyle = {
  position: "relative",
  backgroundColor: "var(--surface)",
  color: "var(--text)",
  width: "100%",
  maxWidth: "680px",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "28px",
  borderRadius: "16px",
  direction: "rtl",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
};

const closeButtonStyle = {
  position: "absolute",
  top: "10px",
  left: "14px",
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontSize: "28px",
  cursor: "pointer",
};

const modalTitleStyle = {
  margin: 0,
  color: "var(--brand-900)",
  textAlign: "center",
};

const modalSubtitleStyle = {
  margin: "7px 0 22px",
  color: "var(--muted)",
  textAlign: "center",
  fontSize: "13px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
};

const formGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "13px",
};

const labelStyle = {
  fontWeight: "700",
  color: "var(--text)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 11px",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxSizing: "border-box",
  backgroundColor: "var(--surface)",
  color: "var(--text)",
  colorScheme: "light dark",
  outline: "none",
  textAlign: "right",
};

const modalActionsStyle = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
  marginTop: "12px",
  flexWrap: "wrap",
};