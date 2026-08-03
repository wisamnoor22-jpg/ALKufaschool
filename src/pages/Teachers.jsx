import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import "../styles/teachers.css";

import BackButton from "../components/common/BackButton";
import TeacherStats from "../components/teachers/TeacherStats";
import TeacherTable from "../components/teachers/TeacherTable";
import TeacherForm from "../components/teachers/TeacherForm";

const API_URL = "http://localhost:5000/employees";

const EMPLOYEE_TYPES = [
  "الكل",
  "كادر تدريسي",
  "إداري",
  "طبيب",
  "عامل",
  "حارس",
  "سائق",
];

export default function Teachers() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [employeeType, setEmployeeType] = useState("الكل");
  const [message, setMessage] = useState("");

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب الموظفين");
      }

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.full_name?.toLowerCase().includes(query) ||
        employee.employee_code?.toLowerCase().includes(query) ||
        employee.employee_type?.toLowerCase().includes(query) ||
        employee.phone?.toLowerCase().includes(query) ||
        employee.address?.toLowerCase().includes(query);

      const matchesType =
        employeeType === "الكل" ||
        employee.employee_type === employeeType;

      return matchesSearch && matchesType;
    });
  }, [employees, search, employeeType]);

  const handleSaved = (employee) => {
    setEmployees((previous) => [employee, ...previous]);
    setShowForm(false);
    navigate(`/teachers/${employee.id}`);
  };

  const handleView = (employee) => {
    navigate(`/teachers/${employee.id}`);
  };

  return (
    <div className="main-content teachers-page" dir="rtl">
      <header className="teachers-page-header">
        <div className="teachers-header-copy">
          <BackButton />

          <div>
            <h2>الكادر التدريسي والإداري</h2>
            <p>إدارة الموظفين والحضور والرواتب والتقارير</p>
          </div>
        </div>

        <button
          type="button"
          className="teachers-primary-button"
          onClick={() => setShowForm(true)}
        >
          إضافة موظف جديد +
        </button>
      </header>

      {message && <div className="teachers-message">{message}</div>}

      <TeacherStats total={employees.length} />

      <section className="card teachers-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي أو الهاتف..."
          className="teachers-search-input"
        />

        <select
          value={employeeType}
          onChange={(event) => setEmployeeType(event.target.value)}
          className="teachers-filter-select"
        >
          {EMPLOYEE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "الكل" ? "جميع أنواع الموظفين" : type}
            </option>
          ))}
        </select>
      </section>

      <section className="card teachers-table-section">
        {loading ? (
          <p className="teachers-loading">جاري تحميل الموظفين...</p>
        ) : (
          <TeacherTable
            employees={filteredEmployees}
            onDelete={loadEmployees}
            onView={handleView}
            onEdit={() => alert("سيتم إضافة التعديل في الخطوة القادمة")}
            onReport={() => alert("سيتم إضافة التقرير في الخطوة القادمة")}
          />
        )}
      </section>

      {showForm && (
        <TeacherForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}