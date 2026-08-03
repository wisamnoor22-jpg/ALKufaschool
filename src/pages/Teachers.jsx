import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

import TeacherStats from "../components/teachers/TeacherStats";
import TeacherTable from "../components/teachers/TeacherTable";
import TeacherForm from "../components/teachers/TeacherForm";

const API_URL = "http://localhost:5000/employees";

export default function Teachers() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const loadEmployees = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("تعذر جلب الموظفين");
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSaved = (employee) => {
    setEmployees((previous) => [employee, ...previous]);
    setShowForm(false);
    navigate(`/teachers/${employee.id}`);
  };

  const handleView = (employee) => {
    navigate(`/teachers/${employee.id}`);
  };

  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      employee.full_name?.toLowerCase().includes(query) ||
      employee.employee_code?.toLowerCase().includes(query) ||
      employee.employee_type?.toLowerCase().includes(query) ||
      employee.phone?.toLowerCase().includes(query) ||
      employee.address?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="main-content" dir="rtl">
      <div style={headerStyle}>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={backButtonStyle}
          >
            رجوع
          </button>

          <h2 style={{ margin: "14px 0 0" }}>
            الكادر التدريسي والإداري
          </h2>

          <p style={{ color: "#777", marginBottom: 0 }}>
            إدارة الموظفين والحضور والرواتب والتقارير
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={addButtonStyle}
        >
          + إضافة موظف
        </button>
      </div>

      <TeacherStats total={employees.length} />

      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث بالاسم أو الرقم الوظيفي أو نوع الموظف..."
          style={searchStyle}
        />
      </div>

      {loading ? (
        <h3>جاري تحميل الموظفين...</h3>
      ) : (
        <TeacherTable
          employees={filteredEmployees}
          onDelete={loadEmployees}
          onView={handleView}
          onEdit={() => alert("سنضيف التعديل في الخطوة القادمة")}
          onReport={() => alert("سنضيف التقرير في الخطوة القادمة")}
        />
      )}

      {showForm && (
        <TeacherForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 25,
  gap: 15,
  flexWrap: "wrap",
};

const backButtonStyle = {
  background: "#edf1f5",
  color: "#1e3c72",
  border: "none",
  padding: "9px 14px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const addButtonStyle = {
  background: "#1e3c72",
  color: "#fff",
  border: 0,
  padding: "12px 22px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const searchStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 15,
  boxSizing: "border-box",
};