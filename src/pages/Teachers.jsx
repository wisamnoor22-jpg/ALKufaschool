import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import "../styles/teachers.css";

import TeacherStats from "../components/teachers/TeacherStats";
import TeacherTable from "../components/teachers/TeacherTable";
import TeacherForm from "../components/teachers/TeacherForm";

const API_URL = "http://localhost:5000/employees";

const EMPLOYEE_TYPES = [
  "الكل",
  "معلمة",
  "المدير",
  "المعاون",
  "مسؤول الحسابات",
  "موظف الاستعلامات",
];

export default function Teachers() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
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
    // Fetching the initial external API state is the intended synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        employee.specialization?.toLowerCase().includes(query) ||
        employee.work_shift?.toLowerCase().includes(query) ||
        employee.first_name?.toLowerCase().includes(query) ||
        employee.middle_name?.toLowerCase().includes(query) ||
        employee.third_name?.toLowerCase().includes(query) ||
        employee.phone?.toLowerCase().includes(query) ||
        employee.address?.toLowerCase().includes(query);

      const matchesType =
        employeeType === "الكل" ||
        employee.employee_type === employeeType;

      return matchesSearch && matchesType;
    });
  }, [employees, search, employeeType]);

  const availableEmployeeTypes = useMemo(() => {
    const legacyTypes = employees
      .map((employee) => employee.employee_type)
      .filter((type) => type && !EMPLOYEE_TYPES.includes(type));

    return [...EMPLOYEE_TYPES, ...new Set(legacyTypes)];
  }, [employees]);

  const handleSaved = (employee, { isEditing } = {}) => {
    setEmployees((previous) =>
      isEditing
        ? previous.map((item) => (item.id === employee.id ? employee : item))
        : [employee, ...previous]
    );
    setShowForm(false);
    setEditingEmployee(null);

    if (!isEditing) {
      navigate(`/teachers/${employee.id}`);
    }
  };

  const handleView = (employee) => {
    navigate(`/teachers/${employee.id}`);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleReport = (employee) => {
    navigate(`/reports?report=payroll&employee_id=${employee.id}`);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="main-content teachers-page" dir="rtl">
      <header className="teachers-page-header">
        <div className="teachers-header-copy">
          <div>
            <h2>الكادر التدريسي والإداري</h2>
            <p>إدارة الموظفين والحضور والرواتب والتقارير</p>
          </div>
        </div>

        <button
          type="button"
          className="teachers-primary-button"
          onClick={() => {
            setEditingEmployee(null);
            setShowForm(true);
          }}
        >
          إضافة موظف جديد +
        </button>
      </header>

      {message && <div className="teachers-message">{message}</div>}

      <TeacherStats total={employees.length} />

      <section className="card teachers-filters data-list-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي أو الهاتف..."
          className="teachers-search-input data-list-control data-list-search"
        />

        <select
          value={employeeType}
          onChange={(event) => setEmployeeType(event.target.value)}
          className="teachers-filter-select data-list-control"
        >
          {availableEmployeeTypes.map((type) => (
            <option key={type} value={type}>
              {type === "الكل" ? "جميع أنواع الموظفين" : type}
            </option>
          ))}
        </select>
      </section>

      <section className="card teachers-table-section data-list-card">
        {loading ? (
          <p className="teachers-loading data-list-loading">جاري تحميل الموظفين...</p>
        ) : (
          <TeacherTable
            employees={filteredEmployees}
            onDelete={loadEmployees}
            onView={handleView}
            onEdit={handleEdit}
            onReport={handleReport}
          />
        )}
      </section>

      {showForm && (
        <TeacherForm
          key={editingEmployee?.id || "new-employee"}
          employee={editingEmployee}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
