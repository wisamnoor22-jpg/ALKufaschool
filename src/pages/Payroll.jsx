import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/payroll.css";
import schoolLogo from "../images/logo.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PAYROLL_DATA_URL = `${API_BASE}/payroll-data`;
const WORKING_DAYS_DIVISOR = 22;
const SCHOOL_NAME = "مدرسة الكوفة الأهلية التكميلية المختلطة";
const BAGHDAD_TIME_ZONE = "Asia/Baghdad";

const moneyFormatter = new Intl.NumberFormat("ar-IQ", {
  maximumFractionDigits: 0,
});

const monthLabelFormatter = new Intl.DateTimeFormat("ar-IQ", {
  timeZone: BAGHDAD_TIME_ZONE,
  month: "long",
  year: "numeric",
});

const getBaghdadMonth = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BAGHDAD_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}`;
};

const getMonthEndDate = (month) => {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
};

const formatDate = (value) => {
  const text = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return "—";
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const formatMonthLabel = (month) => {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "—";
  return monthLabelFormatter.format(new Date(`${month}-15T12:00:00+03:00`));
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatMoney = (value) => `${moneyFormatter.format(Math.round(toNumber(value)))} د.ع`;

const splitValues = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitValues(item));
  }

  if (value === null || value === undefined || value === "") return [];

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.flatMap((item) => splitValues(item));
    } catch {
      // Ignore invalid JSON and continue as plain text.
    }
  }

  return text
    .split(/[،,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getSpecialization = (employee) => {
  const raw = [
    employee?.specialization,
    employee?.teacher_specialization,
    employee?.primary_specialization,
    employee?.specializations,
    employee?.secondary_specializations,
  ].flatMap((value) => splitValues(value));

  const unique = [];
  const seen = new Set();

  raw.forEach((item) => {
    const key = item.toLocaleLowerCase("ar");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  return unique.length ? unique.join("، ") : "—";
};

const getShiftLabel = (employee) =>
  employee?.work_shift || employee?.school_shift || employee?.shift || "غير محدد";

const getShiftCount = (employee) => {
  const value = String(getShiftLabel(employee)).replace(/\s+/g, " ").trim();
  if (!value || value === "غير محدد") return 0;

  const hasMorning = value.includes("صباح");
  const hasAfternoon = value.includes("ظهر") || value.includes("مساء");
  const bothWords =
    value.includes("الاثنان") ||
    value.includes("الاثنين") ||
    value.includes("كلاهما") ||
    value.includes("كلا الشفتين");

  return (hasMorning && hasAfternoon) || bothWords ? 2 : 1;
};

const getSalaryDueDate = (employee, fallbackDate) => {
  const explicit =
    employee?.salary_due_date ||
    employee?.payroll_date ||
    employee?.salary_date ||
    employee?.payment_date;

  const explicitText = String(explicit || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitText)) return explicitText;

  return fallbackDate;
};

const normalizeEmployees = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.employees)) return payload.employees;
  return [];
};

const getRowFinancials = (employee, monthEndDate) => {
  const salary = toNumber(employee.salary);
  const dailyWage = salary > 0 ? salary / WORKING_DAYS_DIVISOR : 0;
  const absenceCount = Math.max(0, Math.trunc(toNumber(employee.absence_count)));
  const absenceDeduction = Math.min(salary, dailyWage * absenceCount);
  const netSalary = Math.max(0, salary - absenceDeduction);

  return {
    salary,
    dailyWage,
    absenceCount,
    absenceDeduction,
    netSalary,
    shiftCount: getShiftCount(employee),
    shiftLabel: getShiftLabel(employee),
    specialization: getSpecialization(employee),
    salaryDueDate: getSalaryDueDate(employee, monthEndDate),
  };
};

export default function Payroll() {
  const [payrollMonth, setPayrollMonth] = useState(getBaghdadMonth);
  const [employees, setEmployees] = useState([]);
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const reportRef = useRef(null);

  const loadPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${PAYROLL_DATA_URL}?month=${encodeURIComponent(payrollMonth)}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "تعذر تحميل بيانات الرواتب");
      }

      setEmployees(normalizeEmployees(data));
      setPeriod(data.period || { from: `${payrollMonth}-01`, to: getMonthEndDate(payrollMonth) });
    } catch (requestError) {
      console.error(requestError);
      setEmployees([]);
      setPeriod({ from: `${payrollMonth}-01`, to: getMonthEndDate(payrollMonth) });
      setError(requestError.message || "تعذر تحميل بيانات الرواتب");
    } finally {
      setLoading(false);
    }
  }, [payrollMonth]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const monthEndDate = period.to || getMonthEndDate(payrollMonth);

  const rows = useMemo(
    () =>
      employees.map((employee, index) => ({
        ...employee,
        rowNumber: index + 1,
        payroll: getRowFinancials(employee, monthEndDate),
      })),
    [employees, monthEndDate]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, employee) => ({
          employees: summary.employees + 1,
          salaries: summary.salaries + employee.payroll.salary,
          absences: summary.absences + employee.payroll.absenceCount,
          deductions: summary.deductions + employee.payroll.absenceDeduction,
          net: summary.net + employee.payroll.netSalary,
          shifts: summary.shifts + employee.payroll.shiftCount,
        }),
        {
          employees: 0,
          salaries: 0,
          absences: 0,
          deductions: 0,
          net: 0,
          shifts: 0,
        }
      ),
    [rows]
  );

  const closeReport = () => setReportOpen(false);

  const printReport = () => {
    if (!reportRef.current) return;

    const printWindow = window.open("", "_blank", "width=980,height=1200");
    if (!printWindow) {
      setError("تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      return;
    }

    const reportMarkup = reportRef.current.outerHTML;
    const printStyles = `
      @page {
        size: A4 portrait;
        margin: 6mm 6mm 7mm;
      }

      * { box-sizing: border-box; }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #17202b;
        direction: rtl;
        font-family: Tahoma, Arial, "Segoe UI", sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body { width: 100%; }

      .payroll-report-document {
        width: 100%;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #17202b;
        direction: rtl;
        zoom: 0.94;
      }

      .payroll-print-header {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) 94px;
        align-items: center;
        gap: 10px;
        padding-bottom: 8px;
        border-bottom: 2px solid #174f82;
        break-after: avoid;
      }

      .payroll-print-header img {
        width: 52px;
        height: 52px;
        object-fit: contain;
      }

      .payroll-print-header > div:nth-child(2) > strong {
        display: block;
        color: #174f82;
        font-size: 11pt;
        font-weight: 800;
      }

      .payroll-print-header h2 {
        margin: 2px 0 3px;
        color: #0b2f55;
        font-size: 17pt;
        line-height: 1.15;
      }

      .payroll-print-header p {
        margin: 0;
        color: #667383;
        font-size: 7.6pt;
        line-height: 1.35;
      }

      .payroll-print-header p span { margin-inline: 5px; }

      .payroll-print-number {
        padding: 6px 7px;
        border: 1px solid #cbd7e3;
        border-radius: 8px;
        text-align: center;
      }

      .payroll-print-number span {
        display: block;
        color: #667383;
        font-size: 7.2pt;
      }

      .payroll-print-number strong {
        display: block;
        margin-top: 2px;
        color: #0b2f55;
        direction: ltr;
        font-size: 9pt;
      }

      .payroll-print-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        margin: 7px 0;
      }

      .payroll-print-summary > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
        padding: 4px 6px;
        border: 1px solid #dbe4ed;
        border-radius: 6px;
        background: #f7fafc;
      }

      .payroll-print-summary span {
        color: #667383;
        font-size: 7pt;
      }

      .payroll-print-summary strong {
        color: #0b2f55;
        font-size: 7.5pt;
      }

      .payroll-print-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .payroll-print-table thead { display: table-header-group; }

      .payroll-print-table th,
      .payroll-print-table td {
        padding: 2.7px 2.6px;
        border: 1px solid #ccd8e3;
        text-align: right;
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      .payroll-print-table th {
        background: #174f82 !important;
        color: #ffffff !important;
        font-size: 7.45pt;
        font-weight: 900;
        line-height: 1.2;
        text-align: center;
      }

      .payroll-print-table td {
        color: #17202b;
        font-size: 7.35pt;
        line-height: 1.23;
      }

      .payroll-print-table tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .payroll-print-table th:nth-child(1) { width: 3.5%; }
      .payroll-print-table th:nth-child(2) { width: 16.5%; }
      .payroll-print-table th:nth-child(3) { width: 18%; }
      .payroll-print-table th:nth-child(4) { width: 7%; }
      .payroll-print-table th:nth-child(5) { width: 11%; }
      .payroll-print-table th:nth-child(6) { width: 11%; }
      .payroll-print-table th:nth-child(7) { width: 7%; }
      .payroll-print-table th:nth-child(8) { width: 12%; }
      .payroll-print-table th:nth-child(9) { width: 14%; }

      .payroll-print-table td:first-child { text-align: center; }
      .payroll-print-table strong {
        display: block;
        font-size: 7.5pt;
        font-weight: 800;
      }
      .payroll-print-table small {
        display: block;
        margin-top: 1px;
        color: #6b7785;
        font-size: 6.45pt;
        line-height: 1.15;
      }
      .payroll-print-center,
      .payroll-print-deduction { text-align: center !important; }
      .payroll-print-deduction { color: #9a4f00 !important; }

      .payroll-print-notes {
        margin-top: 6px;
        padding: 5px 7px;
        border-right: 3px solid #174f82;
        background: #f7fafc;
        break-inside: avoid;
      }

      .payroll-print-notes strong {
        color: #0b2f55;
        font-size: 7.6pt;
      }

      .payroll-print-notes p {
        margin: 2px 0 0;
        color: #566373;
        font-size: 6.8pt;
        line-height: 1.35;
      }

      .payroll-print-signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 10px;
        text-align: center;
        break-inside: avoid;
      }

      .payroll-print-signatures div { display: grid; gap: 7px; }
      .payroll-print-signatures span {
        color: #344454;
        font-size: 7.2pt;
        font-weight: 900;
      }
      .payroll-print-signatures strong {
        color: #697786;
        font-size: 6.7pt;
        font-weight: 600;
      }
    `;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>كشف رواتب الموظفين - ${formatMonthLabel(payrollMonth)}</title>
          <style>${printStyles}</style>
        </head>
        <body>${reportMarkup}</body>
      </html>`);
    printWindow.document.close();

    const waitForImages = Array.from(printWindow.document.images).map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            })
    );

    Promise.all(waitForImages).then(() => {
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 180);
    });

    printWindow.addEventListener("afterprint", () => printWindow.close(), {
      once: true,
    });
  };

  return (
    <main className="payroll-page" dir="rtl">
      <section className="payroll-page-shell">
        <header className="payroll-page-header">
          <div className="payroll-title-block">
            <span className="payroll-eyebrow">إدارة الرواتب</span>
            <h1>رواتب الموظفين</h1>
            <p>
              كشف شهري موحد للرواتب، الأجر اليومي، الغياب، الاختصاص وعدد الشفتات.
            </p>
          </div>

          <div className="payroll-header-actions">
            <label className="payroll-month-field">
              <span>شهر الرواتب</span>
              <input
                type="month"
                value={payrollMonth}
                onChange={(event) => setPayrollMonth(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="payroll-report-button"
              onClick={() => setReportOpen(true)}
              disabled={loading || rows.length === 0 || Boolean(error)}
            >
              <span aria-hidden="true">▤</span>
              التقرير
            </button>
          </div>
        </header>

        {error && (
          <div className="payroll-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadPayroll}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <section className="payroll-summary-grid" aria-label="ملخص الرواتب">
            <article>
              <span>عدد الموظفين</span>
              <strong>{moneyFormatter.format(totals.employees)}</strong>
            </article>
            <article>
              <span>الرواتب الأساسية</span>
              <strong>{formatMoney(totals.salaries)}</strong>
            </article>
            <article>
              <span>إجمالي الغياب</span>
              <strong>{moneyFormatter.format(totals.absences)}</strong>
            </article>
            <article className="deduction">
              <span>خصومات الغياب</span>
              <strong>{formatMoney(totals.deductions)}</strong>
            </article>
            <article className="net">
              <span>صافي الرواتب</span>
              <strong>{formatMoney(totals.net)}</strong>
            </article>
          </section>
        )}

        <section className="payroll-employees-panel" aria-labelledby="payroll-list-title">
          <div className="payroll-list-heading">
            <div>
              <h2 id="payroll-list-title">قائمة الرواتب</h2>
              <p>
                {formatMonthLabel(payrollMonth)} — الأجر اليومي محسوب على أساس {WORKING_DAYS_DIVISOR} يوم عمل.
              </p>
            </div>
            <span className="payroll-employees-count">
              {loading ? "..." : `${rows.length} موظف`}
            </span>
          </div>

          {loading ? (
            <div className="payroll-state">جاري تحميل الرواتب والغياب...</div>
          ) : rows.length === 0 && !error ? (
            <div className="payroll-state">لا يوجد موظفون مسجلون حاليًا.</div>
          ) : rows.length > 0 ? (
            <div className="payroll-table-wrap">
              <table className="payroll-employees-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الموظف</th>
                    <th>نوع الموظف</th>
                    <th>الاختصاص</th>
                    <th>عدد الشفتات</th>
                    <th>الراتب</th>
                    <th>الأجر اليومي</th>
                    <th>الغياب</th>
                    <th>الخصم</th>
                    <th>موعد الراتب</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => (
                    <tr key={employee.id ?? `${employee.full_name}-${employee.rowNumber}`}>
                      <td className="payroll-row-number" data-label="#">
                        {employee.rowNumber}
                      </td>
                      <td data-label="اسم الموظف">
                        <div className="payroll-employee-name">
                          <strong>{employee.full_name || "اسم غير محدد"}</strong>
                          {employee.employee_code && <small>{employee.employee_code}</small>}
                        </div>
                      </td>
                      <td data-label="نوع الموظف">
                        <span className="payroll-employee-type">
                          {employee.employee_type || employee.job_title || "غير محدد"}
                        </span>
                      </td>
                      <td data-label="الاختصاص" className="payroll-specialization-cell">
                        {employee.payroll.specialization}
                      </td>
                      <td data-label="عدد الشفتات" className="payroll-center-cell">
                        <strong>{employee.payroll.shiftCount || "—"}</strong>
                        <small>{employee.payroll.shiftLabel}</small>
                      </td>
                      <td data-label="الراتب">
                        <strong className="payroll-salary-value">
                          {formatMoney(employee.payroll.salary)}
                        </strong>
                      </td>
                      <td data-label="الأجر اليومي">
                        <strong className="payroll-daily-value">
                          {formatMoney(employee.payroll.dailyWage)}
                        </strong>
                      </td>
                      <td data-label="الغياب" className="payroll-absence-cell">
                        <strong>{employee.payroll.absenceCount}</strong>
                        <small>يوم</small>
                      </td>
                      <td data-label="الخصم" className="payroll-deduction-cell">
                        <strong>
                          {employee.payroll.absenceDeduction > 0
                            ? `-${formatMoney(employee.payroll.absenceDeduction)}`
                            : formatMoney(0)}
                        </strong>
                      </td>
                      <td data-label="موعد الراتب" className="payroll-date-cell">
                        {formatDate(employee.payroll.salaryDueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>

      {reportOpen && (
        <div className="payroll-report-overlay" role="presentation" onMouseDown={closeReport}>
          <section
            className="payroll-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-report-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="payroll-report-toolbar print-hide">
              <div>
                <strong>معاينة تقرير الرواتب</strong>
                <span>{formatMonthLabel(payrollMonth)}</span>
              </div>
              <div>
                <button type="button" className="primary" onClick={printReport}>
                  طباعة التقرير
                </button>
                <button type="button" className="secondary" onClick={closeReport}>
                  إغلاق
                </button>
              </div>
            </div>

            <article ref={reportRef} className="payroll-report-document printable-area">
              <header className="payroll-print-header">
                <img src={schoolLogo} alt="شعار المدرسة" />
                <div>
                  <strong>{SCHOOL_NAME}</strong>
                  <h2 id="payroll-report-title">كشف رواتب الموظفين</h2>
                  <p>
                    شهر الرواتب: <b>{formatMonthLabel(payrollMonth)}</b>
                    <span>•</span>
                    الفترة: {formatDate(period.from)} إلى {formatDate(period.to)}
                  </p>
                </div>
                <div className="payroll-print-number">
                  <span>موعد الصرف</span>
                  <strong>{formatDate(monthEndDate)}</strong>
                </div>
              </header>

              <section className="payroll-print-summary">
                <div><span>الموظفون</span><strong>{totals.employees}</strong></div>
                <div><span>الرواتب الأساسية</span><strong>{formatMoney(totals.salaries)}</strong></div>
                <div><span>أيام الغياب</span><strong>{totals.absences}</strong></div>
                <div><span>خصومات الغياب</span><strong>{formatMoney(totals.deductions)}</strong></div>
                <div><span>صافي الرواتب</span><strong>{formatMoney(totals.net)}</strong></div>
                <div><span>إجمالي الشفتات</span><strong>{totals.shifts}</strong></div>
              </section>

              <table className="payroll-print-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الموظف</th>
                    <th>الوظيفة والاختصاص</th>
                    <th>الشفتات</th>
                    <th>الراتب</th>
                    <th>الأجر اليومي</th>
                    <th>الغياب</th>
                    <th>الخصم</th>
                    <th>الصافي والموعد</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => (
                    <tr key={`report-${employee.id ?? employee.rowNumber}`}>
                      <td>{employee.rowNumber}</td>
                      <td>
                        <strong>{employee.full_name || "اسم غير محدد"}</strong>
                        {employee.employee_code && <small>{employee.employee_code}</small>}
                      </td>
                      <td>
                        <strong>{employee.employee_type || employee.job_title || "غير محدد"}</strong>
                        <small>{employee.payroll.specialization}</small>
                      </td>
                      <td>
                        <strong>{employee.payroll.shiftCount || "—"}</strong>
                        <small>{employee.payroll.shiftLabel}</small>
                      </td>
                      <td>{formatMoney(employee.payroll.salary)}</td>
                      <td>{formatMoney(employee.payroll.dailyWage)}</td>
                      <td className="payroll-print-center">
                        <strong>{employee.payroll.absenceCount}</strong>
                        <small>يوم</small>
                      </td>
                      <td className="payroll-print-deduction">
                        <strong>
                          {employee.payroll.absenceDeduction > 0
                            ? `-${formatMoney(employee.payroll.absenceDeduction)}`
                            : formatMoney(0)}
                        </strong>
                      </td>
                      <td>
                        <strong>{formatMoney(employee.payroll.netSalary)}</strong>
                        <small>{formatDate(employee.payroll.salaryDueDate)}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <section className="payroll-print-notes">
                <strong>ملاحظات الاحتساب</strong>
                <p>
                  الأجر اليومي = الراتب الأساسي ÷ {WORKING_DAYS_DIVISOR}. خصم الغياب = الأجر اليومي × عدد أيام الغياب المسجلة خلال الشهر المحدد. صافي الراتب = الراتب الأساسي − خصم الغياب.
                </p>
              </section>

              <footer className="payroll-print-signatures">
                <div><span>مسؤول الحسابات</span><strong>التوقيع: ______________</strong></div>
                <div><span>مدير المدرسة</span><strong>التوقيع: ______________</strong></div>
                <div><span>الختم</span><strong>________________</strong></div>
              </footer>
            </article>
          </section>
        </div>
      )}
    </main>
  );
}