import { useState } from "react";
import BackButton from "../components/common/BackButton";
import "../styles/reports.css";

const REPORT_SECTIONS = [
  {
    id: "student-attendance",
    code: "ST",
    title: "تقرير حضور الطلاب",
    description:
      "تقارير الغياب والإجازات حسب اليوم أو الشهر أو فترة زمنية والصف والشعبة.",
    features: ["اختيار التاريخ", "الصف والشعبة", "الطلاب كثيرو الغياب"],
  },
  {
    id: "employee-attendance",
    code: "HR",
    title: "تقرير حضور الموظفين",
    description:
      "تقارير الحضور والانصراف والتأخير والغياب والإجازات للموظفين.",
    features: ["وقت الحضور والانصراف", "حساب التأخير", "تقارير شهرية"],
  },
  {
    id: "fees",
    code: "FN",
    title: "تقرير الأقساط",
    description:
      "تقارير الدفعات والمبالغ المدفوعة والمتبقية والوصولات المالية.",
    features: ["دفعات اليوم والشهر", "المتبقي والمسدد", "تصدير Excel"],
  },
];

function ReportPlaceholder({ report, onBack }) {
  return (
    <section className="reports-workspace">
      <header className="reports-workspace-header">
        <button
          type="button"
          className="reports-inner-back"
          onClick={onBack}
        >
          رجوع
        </button>

        <div>
          <span className="reports-workspace-code">{report.code}</span>
          <h2>{report.title}</h2>
          <p>{report.description}</p>
        </div>
      </header>

      <div className="reports-coming-card">
        <strong>القسم جاهز للبدء</strong>
        <p>
          سنضيف الفلاتر والبيانات والطباعة والتصدير في الخطوة التالية.
        </p>
      </div>
    </section>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState("");

  const selectedReport = REPORT_SECTIONS.find(
    (report) => report.id === activeReport
  );

  return (
    <main className="main-content reports-page" dir="rtl">
      {!selectedReport ? (
        <>
          <header className="reports-page-header">
            <BackButton />

            <div>
              <h1>مركز التقارير</h1>
              <p>
                اختر نوع التقرير المطلوب لعرض البيانات وطباعتها أو
                تصديرها.
              </p>
            </div>
          </header>

          <section className="reports-grid">
            {REPORT_SECTIONS.map((report) => (
              <button
                key={report.id}
                type="button"
                className={`report-card report-card-${report.id}`}
                onClick={() => setActiveReport(report.id)}
              >
                <span className="report-card-code">{report.code}</span>

                <div className="report-card-content">
                  <h2>{report.title}</h2>
                  <p>{report.description}</p>

                  <div className="report-card-features">
                    {report.features.map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                  </div>
                </div>

                <span className="report-card-arrow">←</span>
              </button>
            ))}
          </section>
        </>
      ) : (
        <ReportPlaceholder
          report={selectedReport}
          onBack={() => setActiveReport("")}
        />
      )}
    </main>
  );
}