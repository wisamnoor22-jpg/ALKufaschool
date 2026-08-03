export default function FeesTable({
  fees = [],
  onPayment,
  onHistory,
}) {
  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead style={headerStyle}>
          <tr>
            <th style={cellStyle}>الطالب</th>
            <th style={cellStyle}>السنة الدراسية</th>
            <th style={cellStyle}>القسط</th>
            <th style={cellStyle}>الخصم</th>
            <th style={cellStyle}>المدفوع</th>
            <th style={cellStyle}>المتبقي</th>
            <th style={cellStyle}>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {fees.length === 0 ? (
            <tr>
              <td colSpan="7" style={emptyStyle}>
                لا توجد أقساط مسجلة
              </td>
            </tr>
          ) : (
            fees.map((fee) => {
              const total = Number(fee.total_fee || 0);
              const discount = Number(fee.discount || 0);
              const paid = Number(fee.paid || 0);
              const remaining = Math.max(
                total - discount - paid,
                0
              );

              return (
                <tr key={fee.id} style={rowStyle}>
                  <td style={cellStyle}>
                    <strong>{fee.full_name}</strong>
                  </td>

                  <td style={cellStyle}>
                    {fee.academic_year}
                  </td>

                  <td style={cellStyle}>
                    {formatMoney(total)}
                  </td>

                  <td style={cellStyle}>
                    {formatMoney(discount)}
                  </td>

                  <td style={cellStyle}>
                    {formatMoney(paid)}
                  </td>

                  <td style={cellStyle}>
                    <strong
                      style={{
                        color:
                          remaining > 0
                            ? "#b91c1c"
                            : "#15803d",
                      }}
                    >
                      {formatMoney(remaining)}
                    </strong>
                  </td>

                  <td style={cellStyle}>
                    <div style={actionsStyle}>
                      <button
                        type="button"
                        onClick={() => onPayment?.(fee)}
                        disabled={remaining === 0}
                        style={{
                          ...paymentButtonStyle,
                          opacity: remaining === 0 ? 0.5 : 1,
                          cursor:
                            remaining === 0
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        تسجيل دفعة
                      </button>

                      <button
                        type="button"
                        onClick={() => onHistory?.(fee)}
                        style={historyButtonStyle}
                      >
                        كشف الحساب
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} د.ع`;
}

const containerStyle = {
  background: "#fff",
  borderRadius: "14px",
  overflowX: "auto",
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};

const tableStyle = {
  width: "100%",
  minWidth: "950px",
  borderCollapse: "collapse",
  direction: "rtl",
};

const headerStyle = {
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
  padding: "40px",
  color: "#777",
};

const actionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const paymentButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "7px",
  fontWeight: "bold",
};

const historyButtonStyle = {
  background: "#1e5fa8",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "bold",
};