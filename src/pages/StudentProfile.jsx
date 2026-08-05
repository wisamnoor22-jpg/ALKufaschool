import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/Dashboard.css";
import "../styles/students.css";

const API_URL = "http://localhost:5000/students";

const formatDate = (value) => {
  if (!value) return "غير مسجل";

  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
};

export default function StudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/${studentId}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "تعذر جلب ملف الطالب");
        }

        setStudent(data);
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "تعذر جلب ملف الطالب");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [studentId]);

  if (loading) {
    return <main className="main-content student-profile-page">جاري تحميل ملف الطالب...</main>;
  }

  if (!student) {
    return <main className="main-content students-message error">{error || "الطالب غير موجود"}</main>;
  }

  const fields = [
    ["الاسم الكامل", student.full_name],
    ["النوع", student.gender],
    ["وقت الدوام", student.school_shift],
    ["تاريخ الميلاد", formatDate(student.birth_date)],
    ["رقم الهاتف", student.phone],
    ["العنوان", student.address],
    ["الصف الحالي", student.grade],
    ["الشعبة", student.section],
    ["السنة الدراسية", student.academic_year],
  ];

  return (
    <main className="main-content student-profile-page" dir="rtl">
      <header className="student-profile-header">
        <div>
          <h1>{student.full_name}</h1>
          <p>ملف الطالب والتسجيل الدراسي الحالي</p>
        </div>
        <span className="student-profile-shift">
          الدوام: {student.school_shift || "غير محدد"}
        </span>
      </header>

      {error && <div className="students-message error">{error}</div>}

      <section className="card student-profile-grid">
        {fields.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value || "غير مسجل"}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
