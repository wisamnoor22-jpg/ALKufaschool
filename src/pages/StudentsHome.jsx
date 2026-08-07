import { useNavigate } from "react-router-dom";
import "../styles/studentManagement.css";

const cards = [
  {
    id: "registry",
    code: "ST",
    title: "سجل الطلاب",
    description: "عرض الطلاب والبحث والفلاتر والإضافة والوصول إلى ملفات الطلاب.",
    path: "/students/registry",
    meta: "السجل الكامل",
  },
  {
    id: "sections",
    code: "CL",
    title: "الشعب",
    description: "إدارة الشعب وإضافة شعبة وتعديل اسمها ونقل الطلاب بين الشعب.",
    path: "/students/sections",
    meta: "إدارة التوزيع",
  },
];

export default function StudentsHome() {
  const navigate = useNavigate();

  return (
    <main className="student-management-page" dir="rtl">
      <section className="student-management-hero">
        <div>
          <span className="student-management-eyebrow">إدارة الطلاب</span>
          <h1>الطلاب والشعب</h1>
          <p>
            اختر سجل الطلاب لإدارة ملفات الطلبة، أو افتح الشعب لإدارة توزيعهم
            على الصفوف والشعب.
          </p>
        </div>

        <div className="student-management-plan-badge">
          <span>الدوام الصباحي</span>
          <strong>توزيع الشعب المعتمد</strong>
        </div>
      </section>

      <section className="student-management-cards" aria-label="أقسام إدارة الطلاب">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="student-management-card"
            onClick={() => navigate(card.path)}
          >
            <span className="student-management-card-code">{card.code}</span>
            <div className="student-management-card-body">
              <small>{card.meta}</small>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>
            <span className="student-management-card-arrow" aria-hidden="true">
              ←
            </span>
          </button>
        ))}
      </section>

      <section className="student-management-plan">
        <div className="student-management-plan-title">
          <span>الخطة الحالية</span>
          <div>
            <h2>شعب الدوام الصباحي</h2>
            <p>هذا التوزيع هو نفسه المستخدم في صفحة الجداول.</p>
          </div>
        </div>

        <div className="student-management-plan-grid">
          <div>
            <strong>الأول الابتدائي</strong>
            <span>أ</span><span>ب</span><span>ت</span>
          </div>
          <div>
            <strong>الثاني الابتدائي</strong>
            <span>أ</span><span>ب</span><span>ت</span>
          </div>
          <div className="wide">
            <strong>الثالث إلى السادس + الأول والثاني المتوسط</strong>
            <span>شعبة أ فقط</span>
          </div>
        </div>
      </section>
    </main>
  );
}