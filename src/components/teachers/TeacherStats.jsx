export default function TeacherStats({ total = 0 }) {
  const stats = [
    { label: "إجمالي الموظفين", value: total },
    { label: "الحاضرون", value: 0 },
    { label: "المتأخرون", value: 0 },
    { label: "الغائبون", value: 0 },
  ];

  return (
    <section className="teachers-stats-grid">
      {stats.map((item) => (
        <article key={item.label} className="teachers-stat-card">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </section>
  );
}