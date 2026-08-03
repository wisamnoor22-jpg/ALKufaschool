import { useState } from "react";
import BackButton from "../components/common/BackButton";
import "../styles/attendance.css";

const attendanceSections = [
  {
    id: "students",
    title: "حضور الطلاب",
    description: "تسجيل حضور وغياب الطلاب حسب الصف والشعبة",
    code: "ST",
  },
  {
    id: "employees",
    title: "حضور الموظفين",
    description: "تسجيل حضور وتأخير وغياب الكادر التدريسي والإداري",
    code: "HR",
  },
];

export default function Attendance() {
  const [activeSection, setActiveSection] = useState("");

  const returnToSections = () => {
    setActiveSection("");
  };

  return (
    <div className="main-content attendance-page" dir="rtl">
      <header className="attendance-page-header">
        {activeSection ? (
          <button
            type="button"
            className="attendance-back-button"
            onClick={returnToSections}
          >
            ← رجوع
          </button>
        ) : (
          <BackButton />
        )}

        <div>
          <h2>
            {activeSection === "students"
              ? "حضور الطلاب"
              : activeSection === "employees"
                ? "حضور الموظفين"
                : "إدارة الحضور"}
          </h2>

          <p>
            {activeSection === "students"
              ? "إدارة حضور وغياب الطلاب"
              : activeSection === "employees"
                ? "إدارة حضور وتأخير وغياب الموظفين"
                : "اختر القسم المطلوب"}
          </p>
        </div>
      </header>

      {!activeSection && (
        <section className="attendance-sections-grid">
          {attendanceSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="attendance-section-card"
              onClick={() => setActiveSection(section.id)}
            >
              <span className="attendance-section-code">
                {section.code}
              </span>

              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>

              <span className="attendance-section-arrow">←</span>
            </button>
          ))}
        </section>
      )}

      {activeSection === "students" && (
        <section className="card attendance-content-card">
          <div className="attendance-empty-state">
            <h3>حضور الطلاب</h3>
            <p>
              سيتم هنا إضافة اختيار الصف والشعبة وتسجيل الحضور والغياب.
            </p>
          </div>
        </section>
      )}

      {activeSection === "employees" && (
        <section className="card attendance-content-card">
          <div className="attendance-empty-state">
            <h3>حضور الموظفين</h3>
            <p>
              سيتم هنا إضافة تسجيل الحضور والتأخير والغياب للموظفين.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}