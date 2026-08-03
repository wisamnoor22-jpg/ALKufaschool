export default function TeacherStats({ total = 0 }) {
  const stats = [
    { label: "إجمالي الموظفين", value: total },
    { label: "الحاضرون", value: 0 },
    { label: "المتأخرون", value: 0 },
    { label: "الغائبون", value: 0 },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "15px",
        marginBottom: "20px",
      }}
    >
      {stats.map((item) => (
        <div
          key={item.label}
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "14px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ color: "#666", fontSize: "13px" }}>
            {item.label}
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "26px",
              fontWeight: "bold",
              color: "#1e3c72",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}