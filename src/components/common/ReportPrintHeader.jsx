export default function ReportPrintHeader({
  title,
  date,
  academicYear = "",
  shift = "",
}) {
  return (
    <>
      <header className="report-print-header">
        <img
          className="report-print-logo"
          src="/school-logo.png"
          alt="شعار مدرسة الكوفة الأهلية التكميلية المختلطة"
        />

        <div className="report-print-heading">
          <p className="report-print-school-name">مدرسة الكوفة الأهلية التكميلية المختلطة</p>
          <h1>{title}</h1>
        </div>

        <dl className="report-print-meta">
          <div>
            <dt>التاريخ</dt>
            <dd>{date || "—"}</dd>
          </div>

          {academicYear && (
            <div>
              <dt>السنة الدراسية</dt>
              <dd>{academicYear}</dd>
            </div>
          )}

          {shift && (
            <div>
              <dt>الدوام</dt>
              <dd>{shift}</dd>
            </div>
          )}
        </dl>
      </header>

      <footer className="report-print-footer" aria-hidden="true">
        <span>مدرسة الكوفة الأهلية التكميلية المختلطة</span>
        <span className="report-print-page-number" />
      </footer>
    </>
  );
}
