import { useCallback, useEffect, useMemo, useState } from "react";
import ReportPrintHeader from "../common/ReportPrintHeader";
import "../../styles/payroll.css";
import "../../styles/reportPrint.css";

const API_URL = "http://localhost:5000/payroll";
const SCHOOL_TIME_ZONE = "Asia/Baghdad";
const EMPLOYEE_TYPES = [
  "معلمة",
  "المدير",
  "المعاون",
  "مسؤول الحسابات",
  "موظف الاستعلامات",
];

const currencyFormatter = new Intl.NumberFormat("ar-IQ", {
  style: "currency",
  currency: "IQD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ar-IQ", {
  maximumFractionDigits: 2,
});

const formatCurrency = (value) =>
  currencyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatNumber = (value) =>
  numberFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);

const getCurrentSchoolMonth = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: SCHOOL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return { year: Number(parts.year), month: Number(parts.month) };
};

const createEmptyPayroll = () => ({
  employees: [],
  totals: {
    baseSalaries: 0,
    absenceDeductions: 0,
    deductions: 0,
    netSalaries: 0,
  },
  policy: {
    lateDeductionEnabled: false,
    administrativeDeductionEnabled: false,
  },
});

export default function PayrollReport({
  title = "تقرير الرواتب",
  initialStaffType = "all",
  lockedStaffType = false,
  employeeId = null,
  onBack,
}) {
  const current = useMemo(() => getCurrentSchoolMonth(), []);
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [staffType, setStaffType] = useState(initialStaffType);
  const [employeeType, setEmployeeType] = useState("all");
  const [workShift, setWorkShift] = useState("all");
  const [payroll, setPayroll] = useState(createEmptyPayroll());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayroll = useCallback(async (signal) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      staff_type: staffType,
      employee_type: employeeType,
      work_shift: workShift,
    });

    if (employeeId) params.set("employee_id", String(employeeId));

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        signal,
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر إعداد كشف الرواتب");
      }

      setPayroll(data);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        console.error(requestError);
        setError(requestError.message || "تعذر إعداد كشف الرواتب");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [employeeId, employeeType, month, staffType, workShift, year]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => loadPayroll(controller.signal), 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPayroll]);

  const exportCsv = () => {
    const headers = [
      "التسلسل",
      "الاسم الثلاثي",
      "نوع الموظف",
      "الشفت",
      "الراتب الأساسي",
      "الأجر اليومي",
      "الحضور",
      "الغياب",
      "التأخير",
      "دقائق التأخير",
      "خصم الغياب",
      "إجمالي الخصومات",
      "صافي الراتب",
    ];
    const rows = payroll.employees.map((employee, index) => [
      index + 1,
      employee.fullName,
      employee.employeeType,
      employee.workShift || "",
      employee.baseSalary,
      employee.dailyWage ?? "",
      employee.presentDays,
      employee.absentDays,
      employee.lateDays,
      employee.totalLateMinutes,
      employee.absenceDeduction,
      employee.totalDeductions,
      employee.netSalary,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${year}-${String(month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = `${String(month).padStart(2, "0")}/${year}`;

  return (
    <section className="payroll-report report-print-document" dir="rtl">
      <header className="payroll-report-header report-screen-only">
        {onBack && (
          <button type="button" className="payroll-back-button" onClick={onBack}>
            رجوع
          </button>
        )}
        <div>
          <h2>{title}</h2>
          <p>حساب مباشر من الرواتب المسجلة وحضور الفترة المحددة.</p>
        </div>
        <div className="payroll-header-actions">
          <button type="button" onClick={() => window.print()}>طباعة</button>
          <button type="button" onClick={exportCsv}>Excel</button>
        </div>
      </header>

      {error && <div className="payroll-error report-screen-only" role="alert">{error}</div>}

      <section className="payroll-filters data-list-filters report-screen-only">
        <label>
          السنة
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
        <label>
          الشهر
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        {!lockedStaffType && !employeeId && (
          <label>
            نوع الكادر
            <select value={staffType} onChange={(event) => setStaffType(event.target.value)}>
              <option value="all">الكل</option>
              <option value="teachers">المعلمات</option>
              <option value="administrative">الموظفون الإداريون</option>
            </select>
          </label>
        )}
        {!employeeId && (
          <label>
            نوع الموظف
            <select value={employeeType} onChange={(event) => setEmployeeType(event.target.value)}>
              <option value="all">جميع الأنواع</option>
              {EMPLOYEE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        )}
        {!employeeId && (
          <label>
            الشفت
            <select value={workShift} onChange={(event) => setWorkShift(event.target.value)}>
              <option value="all">جميع الشفتات</option>
              <option value="صباحي">صباحي</option>
              <option value="ظهري">ظهري</option>
              <option value="صباحي وظهري">صباحي وظهري</option>
            </select>
          </label>
        )}
      </section>

      <ReportPrintHeader
        title={title}
        date={periodLabel}
        shift={workShift === "all" ? "جميع الشفتات" : workShift}
      />

      <section className="payroll-summary-grid reports-summary-grid">
        <article className="reports-summary-card">
          <strong>{formatCurrency(payroll.totals.baseSalaries)}</strong>
          <span>مجموع الرواتب الأساسية</span>
        </article>
        <article className="reports-summary-card absent">
          <strong>{formatCurrency(payroll.totals.deductions)}</strong>
          <span>مجموع الخصومات</span>
        </article>
        <article className="reports-summary-card students">
          <strong>{formatCurrency(payroll.totals.netSalaries)}</strong>
          <span>مجموع صافي الرواتب</span>
        </article>
      </section>

      {!payroll.policy.administrativeDeductionEnabled &&
        payroll.employees.some((employee) => employee.employeeType !== "معلمة") && (
          <div className="payroll-policy-warning report-screen-only">
            لم تعتمد بعد قاعدة خصم غياب أو تأخير الإداريين؛ تُعرض بياناتهم دون خصم آلي.
          </div>
        )}

      <section className="data-list-card reports-table-card">
        <div className="data-list-header report-screen-only">
          <div><h3>كشف الرواتب</h3><p>الفترة: {periodLabel}</p></div>
          <span>{payroll.employees.length} موظف</span>
        </div>
        <div className="data-list-scroll reports-table-wrapper">
          <table className="data-list-table payroll-report-table">
            <thead>
              <tr>
                <th>#</th><th>الاسم الثلاثي</th><th>النوع</th><th>الشفت</th>
                <th>الأساسي</th><th>الأجر اليومي</th><th>الحضور</th><th>الغياب</th>
                <th>التأخير</th><th>دقائق التأخير</th><th>خصم الغياب</th>
                <th>الخصومات</th><th>الصافي</th><th className="report-screen-only">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="14" className="data-list-loading">جاري حساب الرواتب...</td></tr>
              ) : payroll.employees.length === 0 ? (
                <tr><td colSpan="14" className="data-list-empty">لا توجد بيانات رواتب مطابقة.</td></tr>
              ) : payroll.employees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td><td className="data-list-name">{employee.fullName}</td>
                  <td>{employee.employeeType}</td><td>{employee.workShift || "—"}</td>
                  <td>{formatCurrency(employee.baseSalary)}</td>
                  <td>{employee.dailyWage === null ? "—" : formatCurrency(employee.dailyWage)}</td>
                  <td>{formatNumber(employee.presentDays)}</td><td>{formatNumber(employee.absentDays)}</td>
                  <td>{formatNumber(employee.lateDays)}</td><td>{formatNumber(employee.totalLateMinutes)}</td>
                  <td>{formatCurrency(employee.absenceDeduction)}</td>
                  <td>{formatCurrency(employee.totalDeductions)}</td>
                  <td>{formatCurrency(employee.netSalary)}</td>
                  <td className="report-screen-only">
                    <button type="button" className="payroll-details-button" onClick={() => setSelectedEmployee(employee)}>
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="4">الإجماليات</th>
                <th>{formatCurrency(payroll.totals.baseSalaries)}</th>
                <th colSpan="5">—</th>
                <th>{formatCurrency(payroll.totals.absenceDeductions)}</th>
                <th>{formatCurrency(payroll.totals.deductions)}</th>
                <th>{formatCurrency(payroll.totals.netSalaries)}</th>
                <th className="report-screen-only">—</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {selectedEmployee && (
        <div className="payroll-modal-overlay report-screen-only" role="presentation">
          <div className="payroll-details-modal" role="dialog" aria-modal="true" aria-labelledby="payroll-details-title">
            <div className="modal-sticky-close-bar">
              <button type="button" className="modal-sticky-close" aria-label="إغلاق تفاصيل الراتب" onClick={() => setSelectedEmployee(null)}>×</button>
            </div>
            <h3 id="payroll-details-title">تفاصيل راتب {selectedEmployee.fullName}</h3>
            <div className="payroll-detail-grid">
              <div><span>الراتب الأساسي</span><strong>{formatCurrency(selectedEmployee.baseSalary)}</strong></div>
              <div><span>الأجر اليومي</span><strong>{selectedEmployee.dailyWage === null ? "غير معتمد" : formatCurrency(selectedEmployee.dailyWage)}</strong></div>
              <div><span>أيام الحضور</span><strong>{formatNumber(selectedEmployee.presentDays)}</strong></div>
              <div><span>أيام الغياب</span><strong>{formatNumber(selectedEmployee.absentDays)}</strong></div>
              <div><span>أيام التأخير</span><strong>{formatNumber(selectedEmployee.lateDays)}</strong></div>
              <div><span>دقائق التأخير</span><strong>{formatNumber(selectedEmployee.totalLateMinutes)}</strong></div>
              <div><span>خصم الغياب</span><strong>{formatCurrency(selectedEmployee.absenceDeduction)}</strong></div>
              <div><span>خصم التأخير</span><strong>{formatCurrency(selectedEmployee.lateDeduction)}</strong></div>
              <div><span>إجمالي الخصومات</span><strong>{formatCurrency(selectedEmployee.totalDeductions)}</strong></div>
              <div><span>صافي الراتب</span><strong>{formatCurrency(selectedEmployee.netSalary)}</strong></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
