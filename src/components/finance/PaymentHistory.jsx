import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/fees";

export default function PaymentHistory({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPayments();
  }, [fee.id]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/${fee.id}/payments`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "تعذر جلب سجل الدفعات"
        );
      }

      setPayments(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalFee = Number(fee.total_fee || 0);
  const discount = Number(fee.discount || 0);

  const totalPaid = useMemo(() => {
    return payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
  }, [payments]);

  const netFee = Math.max(totalFee - discount, 0);
  const remaining = Math.max(netFee - totalPaid, 0);

  const printStatement = () => {
    window.print();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>كشف حساب الطالب</h2>

            <div style={subTitleStyle}>
              {fee.full_name} — {fee.academic_year}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {message && (
          <div style={messageStyle}>{message}</div>
        )}

        <div style={summaryGridStyle}>
          <SummaryCard
            label="القسط"
            value={formatMoney(totalFee)}
          />

          <SummaryCard
            label="الخصم"
            value={formatMoney(discount)}
          />

          <SummaryCard
            label="المدفوع"
            value={formatMoney(totalPaid)}
          />

          <SummaryCard
            label="المتبقي"
            value={formatMoney(remaining)}
          />
        </div>

        <div style={tableContainerStyle}>
          {loading ? (
            <p style={loadingStyle}>
              جاري تحميل الدفعات...
            </p>
          ) : payments.length === 0 ? (
            <div style={emptyStyle}>
              لا توجد دفعات مسجلة لهذا الطالب.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead style={tableHeaderStyle}>
                <tr>
                  <th style={cellStyle}>التاريخ</th>
                  <th style={cellStyle}>المبلغ</th>
                  <th style={cellStyle}>طريقة الدفع</th>
                  <th style={cellStyle}>رقم الإيصال</th>
                  <th style={cellStyle}>الملاحظات</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={rowStyle}>
                    <td style={cellStyle}>
                      {formatDate(payment.payment_date)}
                    </td>

                    <td style={cellStyle}>
                      {formatMoney(payment.amount)}
                    </td>

                    <td style={cellStyle}>
                      {payment.payment_method || "غير مسجل"}
                    </td>

                    <td style={cellStyle}>
                      {payment.receipt_number || "غير مسجل"}
                    </td>

                    <td style={cellStyle}>
                      {payment.notes || "لا توجد"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={onClose}
            style={closeActionButtonStyle}
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={printStatement}
            style={printButtonStyle}
          >
            طباعة كشف الحساب
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={summaryCardStyle}>
      <span style={summaryLabelStyle}>{label}</span>
      <strong style={summaryValueStyle}>{value}</strong>
    </div>
  );
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} د.ع`;
}

function formatDate(value) {
  if (!value) return "غير مسجل";

  return new Date(value).toLocaleDateString("ar-IQ");
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "950px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "16px",
  padding: "24px",
  direction: "rtl",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const subTitleStyle = {
  color: "#777",
  marginTop: "7px",
  fontWeight: "bold",
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
};

const messageStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  padding: "11px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontWeight: "bold",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const summaryCardStyle = {
  padding: "15px",
  background: "#f7f9fc",
  border: "1px solid #e4e8ee",
  borderRadius: "10px",
};

const summaryLabelStyle = {
  display: "block",
  color: "#777",
  fontSize: "13px",
};

const summaryValueStyle = {
  display: "block",
  marginTop: "7px",
  fontSize: "18px",
};

const tableContainerStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: "800px",
  borderCollapse: "collapse",
};

const tableHeaderStyle = {
  background: "#1e3c72",
  color: "#fff",
};

const rowStyle = {
  borderBottom: "1px solid #eee",
};

const cellStyle = {
  padding: "13px",
  textAlign: "right",
};

const loadingStyle = {
  textAlign: "center",
  padding: "30px",
};

const emptyStyle = {
  textAlign: "center",
  padding: "35px",
  color: "#777",
  background: "#f7f9fc",
  borderRadius: "10px",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const closeActionButtonStyle = {
  background: "#e5e7eb",
  color: "#222",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const printButtonStyle = {
  background: "#6f42c1",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};