import React from "react";

export default function GradeFeesManager() {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>
            إدارة الرسوم الدراسية
          </h2>

          <p style={subTitleStyle}>
            تحديد الرسوم السنوية لكل مرحلة دراسية
          </p>
        </div>

        <button style={addButtonStyle}>
          + إضافة رسم دراسي
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th>المرحلة</th>
            <th>السنة الدراسية</th>
            <th>الرسم السنوي</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td
              colSpan="4"
              style={{
                textAlign: "center",
                padding: 40,
                color: "#777",
              }}
            >
              لا توجد رسوم مسجلة
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const containerStyle = {
  background: "#fff",
  borderRadius: 15,
  padding: 20,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const subTitleStyle = {
  color: "#777",
  marginTop: 6,
};

const addButtonStyle = {
  background: "#1e3c72",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};