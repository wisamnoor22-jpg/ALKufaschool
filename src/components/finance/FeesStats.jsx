export default function FeesStats({
  totalStudents,
  totalFees,
  totalPaid,
  totalRemaining,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 20,
        marginBottom: 25,
      }}
    >
      <Card
        title="عدد الطلاب"
        value={totalStudents}
        color="var(--heading-color, #1e3c72)"
      />

      <Card
        title="إجمالي الأقساط"
        value={`${Number(totalFees).toLocaleString()} د.ع`}
        color="var(--fees-total-color, #0f766e)"
      />

      <Card
        title="المبالغ المستلمة"
        value={`${Number(totalPaid).toLocaleString()} د.ع`}
        color="var(--fees-paid-color, #15803d)"
      />

      <Card
        title="المتبقي"
        value={`${Number(totalRemaining).toLocaleString()} د.ع`}
        color="var(--fees-remaining-color, #b91c1c)"
      />
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        color: "var(--text-color, #1f2937)",
        border: "1px solid var(--border-color, #e5e9ef)",
        borderRadius: 14,
        padding: 20,
        boxShadow: "0 8px 18px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          color: "var(--muted-color, #64748b)",
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
