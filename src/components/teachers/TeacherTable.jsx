export default function TeacherTable({
  employees = [],
  onDelete,
  onView,
  onEdit,
  onReport,
}) {
  const deleteEmployee = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/employees/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "تعذر حذف الموظف");
        return;
      }

      onDelete?.(id);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div style={tableContainerStyle}>
      <table style={tableStyle}>
        <thead style={tableHeaderStyle}>
          <tr>
            <th style={cellStyle}>الرقم الوظيفي</th>
            <th style={cellStyle}>الاسم</th>
            <th style={cellStyle}>نوع الموظف</th>
            <th style={cellStyle}>الهاتف</th>
            <th style={cellStyle}>العنوان</th>
            <th style={cellStyle}>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="6" style={emptyStyle}>
                لا يوجد موظفون حتى الآن
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id} style={rowStyle}>
                <td style={cellStyle}>
                  {employee.employee_code}
                </td>

                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onView?.(employee)}
                    style={nameButtonStyle}
                  >
                    {employee.full_name}
                  </button>
                </td>

                <td style={cellStyle}>
                  {employee.employee_type || "غير محدد"}
                </td>

                <td style={cellStyle}>
                  {employee.phone || "غير مسجل"}
                </td>

                <td style={cellStyle}>
                  {employee.address || "غير مسجل"}
                </td>

                <td style={cellStyle}>
                  <div style={actionsStyle}>
                    <button
                      type="button"
                      onClick={() => onReport?.(employee)}
                      style={reportButtonStyle}
                    >
                      تقرير
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit?.(employee)}
                      style={editButtonStyle}
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteEmployee(employee.id)}
                      style={deleteButtonStyle}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const tableContainerStyle = {
  background: "#fff",
  borderRadius: "14px",
  overflowX: "auto",
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};

const tableStyle = {
  width: "100%",
  minWidth: "900px",
  borderCollapse: "collapse",
  direction: "rtl",
};

const tableHeaderStyle = {
  background: "#1e3c72",
  color: "#fff",
};

const rowStyle = {
  borderBottom: "1px solid #eee",
};

const cellStyle = {
  padding: "14px",
  textAlign: "right",
};

const emptyStyle = {
  textAlign: "center",
  padding: "35px",
};

const nameButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#1e5fa8",
  padding: 0,
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "underline",
};

const actionsStyle = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const reportButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const editButtonStyle = {
  background: "#f0a500",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};