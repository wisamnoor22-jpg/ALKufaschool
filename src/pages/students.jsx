import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import StudentsTable from "../components/students/StudentsTable";

const API_URL = "http://localhost:5000/students";
const emptyForm = {
  full_name: "",
  gender: "",
  birth_date: "",
  phone: "",
  address: "",
  grade: "الأول الابتدائي",
  section: "أ",
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("الكل");
  const [filterGender, setFilterGender] = useState("الكل");

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("تعذر جلب الطلاب");
      }

      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error(error);
      setMessage("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handleAddStudent = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim() || !form.gender) {
      setMessage("يرجى إدخال اسم الطالب واختيار النوع");
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
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر إضافة الطالب");
      }

      setStudents((previousStudents) => [
        data.student,
        ...previousStudents,
      ]);

      setForm(emptyForm);
      setIsModalOpen(false);
      setMessage("تمت إضافة الطالب بنجاح");
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesGrade =
      filterGrade === "الكل" || student.grade === filterGrade;

    const matchesGender =
      filterGender === "الكل" || student.gender === filterGender;

    return matchesSearch && matchesGrade && matchesGender;
  });

  return (
    <div
      className="main-content"
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <header
        className="topbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, color: "#1e3c72", fontSize: "19px" }}>
          قائمة الطلاب
        </h2>

      
      </header>

      {message && (
        <div
          style={{
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "8px",
            backgroundColor: message.includes("بنجاح")
              ? "#e8f5e9"
              : "#ffebee",
            color: message.includes("بنجاح")
              ? "#1b5e20"
              : "#b71c1c",
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
      )}

      <section
        className="card"
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>سجل الطلاب والطالبات</h3>

          <p style={{ color: "#666", marginBottom: 0 }}>
            عدد الطلاب المسجلين: {students.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setIsModalOpen(true);
          }}
          style={primaryButtonStyle}
        >
          إضافة طالب جديد +
        </button>
      </section>

      <section
        className="card"
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          placeholder="ابحث باسم الطالب..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={filterInputStyle}
        />

        <select
          value={filterGrade}
          onChange={(event) => setFilterGrade(event.target.value)}
          style={filterInputStyle}
        >
          <option value="الكل">جميع الصفوف</option>
          <option value="الأول الابتدائي">الأول الابتدائي</option>
          <option value="الثاني الابتدائي">الثاني الابتدائي</option>
          <option value="الثالث الابتدائي">الثالث الابتدائي</option>
          <option value="الرابع الابتدائي">الرابع الابتدائي</option>
          <option value="الخامس الابتدائي">الخامس الابتدائي</option>
          <option value="السادس الابتدائي">السادس الابتدائي</option>
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
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "30px" }}>
            جاري تحميل الطلاب...
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "750px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #ddd",
                  backgroundColor: "#f5f7fa",
                }}
              >
                <th style={tableCellStyle}>الرقم</th>
                <th style={tableCellStyle}>الاسم الكامل</th>
                <th style={tableCellStyle}>النوع</th>
                <th style={tableCellStyle}>الصف</th>
                <th style={tableCellStyle}>الشعبة</th>
                <th style={tableCellStyle}>الهاتف</th>
                <th style={tableCellStyle}>السكن</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={tableCellStyle}>{student.id}</td>

                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: "bold",
                        color: "#1e3c72",
                      }}
                    >
                      {student.full_name}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "15px",
                          fontWeight: "bold",
                          backgroundColor:
                            student.gender === "طالبة"
                              ? "#fce4ec"
                              : "#e3f2fd",
                          color:
                            student.gender === "طالبة"
                              ? "#c2185b"
                              : "#1565c0",
                        }}
                      >
                        {student.gender}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      {student.grade || "غير محدد"}
                    </td>

                    <td style={tableCellStyle}>
                      {student.section || "غير محددة"}
                    </td>

                    <td style={tableCellStyle}>
                      {student.phone || "غير مسجل"}
                    </td>

                    <td style={tableCellStyle}>
                      {student.address || "غير مسجل"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#777",
                    }}
                  >
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
              onClick={() => setIsModalOpen(false)}
              style={closeButtonStyle}
            >
              ×
            </button>

            <h2 style={{ color: "#1e3c72", textAlign: "center" }}>
              إضافة طالب أو طالبة
            </h2>

            <form onSubmit={handleAddStudent}>
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

              <div style={formGroupStyle}>
                <label style={labelStyle}>الصف</label>

                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="الأول الابتدائي">
                    الأول الابتدائي
                  </option>
                  <option value="الثاني الابتدائي">
                    الثاني الابتدائي
                  </option>
                  <option value="الثالث الابتدائي">
                    الثالث الابتدائي
                  </option>
                  <option value="الرابع الابتدائي">
                    الرابع الابتدائي
                  </option>
                  <option value="الخامس الابتدائي">
                    الخامس الابتدائي
                  </option>
                  <option value="السادس الابتدائي">
                    السادس الابتدائي
                  </option>
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
                  <option value="أ">أ</option>
                  <option value="ب">ب</option>
                  <option value="ج">ج</option>
                  <option value="د">د</option>
                </select>
              </div>

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

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  marginTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={primaryButtonStyle}
                >
                  {saving ? "جاري الحفظ..." : "حفظ الطالب"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

const primaryButtonStyle = {
  backgroundColor: "#1e3c72",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  backgroundColor: "#e0e0e0",
  color: "#333",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const filterInputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "7px",
  minWidth: "200px",
  textAlign: "right",
};

const tableCellStyle = {
  padding: "12px",
  textAlign: "right",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "15px",
};

const modalContentStyle = {
  position: "relative",
  backgroundColor: "white",
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "25px",
  borderRadius: "14px",
  direction: "rtl",
};

const closeButtonStyle = {
  position: "absolute",
  top: "10px",
  left: "15px",
  border: "none",
  background: "none",
  fontSize: "28px",
  cursor: "pointer",
};

const formGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  marginBottom: "12px",
};

const labelStyle = {
  fontWeight: "bold",
  color: "#444",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "7px",
  boxSizing: "border-box",
  textAlign: "right",
};