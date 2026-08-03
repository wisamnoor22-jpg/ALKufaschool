export default function TeacherTable({
  employees = [],
  onDelete,
  onView,
  onEdit,
  onReport,
}) {
  const deleteEmployee = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/employees/${id}`,
        { method: "DELETE" }
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
    <div className="teachers-table-wrapper">
      <table className="teachers-table">
        <thead>
          <tr>
            <th>الرقم الوظيفي</th>
            <th>الاسم</th>
            <th>نوع الموظف</th>
            <th>الهاتف</th>
            <th>العنوان</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="6" className="teachers-empty-state">
                لا توجد بيانات مطابقة
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <span className="teachers-code-badge">
                    {employee.employee_code || "غير مسجل"}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() => onView?.(employee)}
                    className="teachers-name-button"
                  >
                    {employee.full_name}
                  </button>
                </td>

                <td>{employee.employee_type || "غير محدد"}</td>
                <td>{employee.phone || "غير مسجل"}</td>
                <td>{employee.address || "غير مسجل"}</td>

                <td>
                  <div className="teachers-actions">
                    <button
                      type="button"
                      onClick={() => onReport?.(employee)}
                      className="teachers-report-button"
                    >
                      تقرير
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit?.(employee)}
                      className="teachers-edit-button"
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteEmployee(employee.id)}
                      className="teachers-delete-button"
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