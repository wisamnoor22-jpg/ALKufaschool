import { useState } from "react";
import PayrollReport from "../components/payroll/PayrollReport";
import "../styles/payroll.css";

const PAYROLL_SECTIONS = [
  {
    id: "teachers",
    code: "TR",
    title: "رواتب المعلمات",
    description: "الأجر اليومي وخصم الغياب وصافي الراتب حسب الحضور الفعلي.",
  },
  {
    id: "administrative",
    code: "AD",
    title: "رواتب الموظفين الإداريين",
    description: "الراتب والحضور والغياب والتأخير دون خصم آلي غير معتمد.",
  },
];

export default function Payroll() {
  const [activeSection, setActiveSection] = useState("");
  const section = PAYROLL_SECTIONS.find((item) => item.id === activeSection);

  return (
    <main className="main-content payroll-page" dir="rtl">
      {!section ? (
        <>
          <header className="payroll-page-header">
            <div><h1>الرواتب</h1><p>اختر فئة الكادر لعرض كشف الرواتب الشهري.</p></div>
          </header>
          <section className="payroll-section-grid">
            {PAYROLL_SECTIONS.map((item) => (
              <button key={item.id} type="button" className="payroll-section-card" onClick={() => setActiveSection(item.id)}>
                <span>{item.code}</span><h2>{item.title}</h2><p>{item.description}</p><b>←</b>
              </button>
            ))}
          </section>
        </>
      ) : (
        <PayrollReport
          title={section.title}
          initialStaffType={section.id}
          lockedStaffType
          onBack={() => setActiveSection("")}
        />
      )}
    </main>
  );
}
