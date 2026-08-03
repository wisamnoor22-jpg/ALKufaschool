export default function StudentsTable({
  students,
  loading,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: "30px" }}>
        جاري تحميل الطلاب...
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "850px",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "2px solid #ddd",
              backgroundColor: "#f5f7fa",
            }}
          >
            <th style={cellStyle}>الرقم</th>
            <th style={cellStyle}>الاسم الكامل</th>
            <th style={cellStyle}>النوع</th>
            <th style={cellStyle}>الصف</th>
            <th style={cellStyle}>الشعبة</th>
            <th style={cellStyle}>الهاتف</th>
            <th style={cellStyle}>السكن</th>
            <th style={cellStyle}>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {students.length > 0 ? (
            students.map((student) => (
              <tr
                key={student.id}
                style={{ borderBottom: "1px solid #eee" }}
              >
                <td style={cellStyle}>{student.id}</td>

                <td
                  style={{
                    ...cellStyle,
                    fontWeight: "bold",
                    color: "#1e3c72",
                  }}
                >
                  {student.full_name}
                </td>

                <td style={cellStyle}>{student.gender}</td>
                <td style={cellStyle}>{student.grade || "غير محدد"}</td>
                <td style={cellStyle}>{student.section || "غير محددة"}</td>
                <td style={cellStyle}>{student.phone || "غير مسجل"}</td>
                <td style={cellStyle}>{student.address || "غير مسجل"}</td>

                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => onEdit(student)}
                      style={editButtonStyle}
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(student)}
                      style={deleteButtonStyle}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="8"
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#777",
                }}
              >
                لا توجد بيانات مطابقة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = {
  padding: "12px",
  textAlign: "right",
};

const editButtonStyle = {
  backgroundColor: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "7px 12px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  backgroundColor: "#d32f2f",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "7px 12px",
  cursor: "pointer",
};