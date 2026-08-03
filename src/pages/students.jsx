import { useEffect, useMemo, useState } from "react";
import "../styles/Dashboard.css";
import "../styles/students.css";
import BackButton from "../components/common/BackButton";

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

const translateEnrollmentStatus = (status) => {
  const labels = {
    active: "مستمر",
    transferred: "منقول",
    withdrawn: "منسحب",
    graduated: "متخرج",
    suspended: "موقوف",
  };

  return labels[status] || status || "غير محددة";
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

  const isEditing = Boolean(selectedStudent);

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

  const academicYears = useMemo(
    () => [
      ...new Set(
        students
          .map((student) => student.academic_year)
          .filter(Boolean)
      ),
    ],
    [students]
  );

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

      const url = isEditing
        ? `${API_URL}/${selectedStudent.id}`
        : API_URL;

      const payload = {
        full_name: form.full_name.trim(),
        gender: form.gender,
        birth_date: form.birth_date || null,
        phone: form.phone.trim(),
        address: form.address.trim(),
        section: form.section,
      };

      if (!isEditing) {
        payload.grade = form.grade;
      }

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

      setIsModalOpen(false);
      setSelectedStudent(null);
      setForm(createEmptyForm());
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
      className="main-content students-page"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <header className="topbar students-topbar">
        <div>
          <BackButton />
          <p className="students-page-subtitle">
            الصف والشعبة والسنة الدراسية مرتبطة بالتسجيل السنوي
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="students-primary-button"
        >
          إضافة طالب جديد +
        </button>
      </header>

      {message && (
        <div className={`students-message ${messageType}`}>
          {message}
        </div>
      )}

      <section className="card students-summary-card">
        <div>
          <h3>سجل الطلاب والطالبات</h3>
          <p>إجمالي الطلاب: {students.length}</p>
        </div>

        <div className="students-summary-items">
          <div className="students-summary-item">
            <strong>{filteredStudents.length}</strong>
            <span>نتائج ظاهرة</span>
          </div>

          <div className="students-summary-item">
            <strong>{academicYears[0] || "غير محددة"}</strong>
            <span>السنة الدراسية</span>
          </div>
        </div>
      </section>

      <section className="card students-filters-card">
        <input
          type="search"
          placeholder="ابحث باسم الطالب أو رقم الهاتف..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="students-filter-input students-search-input"
        />

        <select
          value={filterGrade}
          onChange={(event) => setFilterGrade(event.target.value)}
          className="students-filter-input"
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
          className="students-filter-input"
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
          className="students-filter-input"
        >
          <option value="الكل">جميع السنوات</option>
          {academicYears.map((academicYear) => (
            <option key={academicYear} value={academicYear}>
              {academicYear}
            </option>
          ))}
        </select>
      </section>

      <section className="card students-table-card">
        {loading ? (
          <p className="students-loading">جاري تحميل الطلاب...</p>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>الاسم الكامل</th>
                <th>النوع</th>
                <th>الصف الحالي</th>
                <th>الشعبة</th>
                <th>السنة الدراسية</th>
                <th>الحالة</th>
                <th>الهاتف</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td className="students-name-cell">
                      {student.full_name}
                    </td>
                    <td>
                      <span
                        className={`students-gender-badge ${
                          student.gender === "طالبة"
                            ? "female"
                            : "male"
                        }`}
                      >
                        {student.gender || "غير محدد"}
                      </span>
                    </td>
                    <td>{student.grade || "غير محدد"}</td>
                    <td>
                      <span className="students-section-badge">
                        {student.section || "غير محددة"}
                      </span>
                    </td>
                    <td>
                      <span className="students-year-badge">
                        {student.academic_year || "غير مرتبطة"}
                      </span>
                    </td>
                    <td>
                      <span className="students-status-badge">
                        {translateEnrollmentStatus(
                          student.enrollment_status
                        )}
                      </span>
                    </td>
                    <td>{student.phone || "غير مسجل"}</td>
                    <td>
                      <div className="students-actions">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="students-edit-button"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          disabled={deletingId === student.id}
                          className="students-delete-button"
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
                  <td colSpan="9" className="students-empty-state">
                    لا توجد بيانات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {isModalOpen && (
        <div className="students-modal-overlay">
          <div className="students-modal-content">
            <button
              type="button"
              onClick={closeModal}
              className="students-modal-close"
              aria-label="إغلاق"
            >
              ×
            </button>

            <h2>
              {isEditing
                ? "تعديل بيانات الطالب"
                : "إضافة طالب أو طالبة"}
            </h2>

            <form onSubmit={handleSubmit}>
              <section className="students-form-section">
                <div className="students-form-section-header">
                  <span>1</span>
                  <div>
                    <h3>بيانات الطالب</h3>
                    <p>المعلومات الشخصية الأساسية</p>
                  </div>
                </div>

                <div className="students-form-group">
                  <label>الاسم الكامل *</label>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="students-form-grid">
                  <div className="students-form-group">
                    <label>النوع *</label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      required
                    >
                      <option value="">اختر النوع</option>
                      <option value="طالب">طالب</option>
                      <option value="طالبة">طالبة</option>
                    </select>
                  </div>

                  <div className="students-form-group">
                    <label>تاريخ الميلاد</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={form.birth_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="students-form-grid">
                  <div className="students-form-group">
                    <label>رقم الهاتف</label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="students-form-group">
                    <label>مكان السكن</label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </section>

              <section className="students-form-section">
                <div className="students-form-section-header">
                  <span>2</span>
                  <div>
                    <h3>
                      {isEditing
                        ? "التسجيل الحالي"
                        : "التسجيل الأول"}
                    </h3>
                    <p>
                      {isEditing
                        ? "الصف والسنة لا يتغيران من شاشة التعديل"
                        : "يُحفظ التسجيل في السنة الدراسية النشطة"}
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="students-readonly-grid">
                    <div className="students-readonly-field">
                      <span>السنة الدراسية</span>
                      <strong>
                        {selectedStudent.academic_year ||
                          "غير محددة"}
                      </strong>
                    </div>

                    <div className="students-readonly-field">
                      <span>حالة التسجيل</span>
                      <strong>
                        {translateEnrollmentStatus(
                          selectedStudent.enrollment_status
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="students-form-grid">
                  <div className="students-form-group">
                    <label>الصف *</label>

                    {isEditing ? (
                      <div className="students-readonly-input">
                        {selectedStudent.grade || "غير محدد"}
                      </div>
                    ) : (
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
                    )}
                  </div>

                  <div className="students-form-group">
                    <label>الشعبة</label>
                    <select
                      name="section"
                      value={form.section}
                      onChange={handleChange}
                    >
                      {SECTIONS.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="students-modal-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="students-primary-button"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : isEditing
                      ? "حفظ التعديلات"
                      : "حفظ الطالب"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="students-secondary-button"
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