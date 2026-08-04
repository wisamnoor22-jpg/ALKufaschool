import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/fees";

export default function PaymentHistory({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
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

      const loadedPayments = Array.isArray(data) ? data : [];

      setPayments(loadedPayments);

      if (loadedPayments.length > 0) {
        setSelectedPaymentId(
          String(loadedPayments[0].id)
        );
      }
    } catch (error) {
      setMessage(error.message || "تعذر جلب سجل الدفعات");
    } finally {
      setLoading(false);
    }
  };

  const selectedPayment = useMemo(() => {
    return (
      payments.find(
        (payment) =>
          String(payment.id) ===
          String(selectedPaymentId)
      ) || payments[0]
    );
  }, [payments, selectedPaymentId]);

  const totalFee = Number(fee.total_fee || 0);
  const paidBeforeSelected = useMemo(() => {
    if (!selectedPayment) return 0;

    return payments
      .filter(
        (payment) =>
          Number(payment.id) < Number(selectedPayment.id)
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );
  }, [payments, selectedPayment]);

  const currentAmount = Number(
    selectedPayment?.amount || 0
  );

  const totalPaidAfterPayment =
    paidBeforeSelected + currentAmount;

  const remainingAfterPayment = Math.max(
    totalFee - totalPaidAfterPayment,
    0
  );

  const collectionRate =
    totalFee > 0
      ? Math.min(
          (totalPaidAfterPayment / totalFee) * 100,
          100
        )
      : 0;

  const printReceipt = () => {
    if (!selectedPayment) return;

    const logoUrl = `${window.location.origin}/logo.png`;

    const receiptHtml = `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>وصل قبض - ${escapeHtml(
            fee.full_name
          )}</title>

          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Tahoma, sans-serif;
            }

            body {
              padding: 0;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt {
              width: 100%;
              min-height: 178mm;
              border: 2px solid #000000;
              background: #ffffff;
            }

            .receipt-header {
              padding: 10px 18px 12px;
              border-bottom: 2px solid #000000;
              text-align: center;
            }

            .logo {
              display: block;
              width: 82px;
              height: 82px;
              margin: 0 auto 5px;
              object-fit: contain;
            }

            .school-name {
              margin: 0;
              font-size: 25px;
              font-weight: 900;
            }

            .receipt-title {
              margin-top: 4px;
              font-size: 19px;
              font-weight: 900;
            }

            .receipt-body {
              display: grid;
              gap: 9px;
              padding: 14px 18px 18px;
            }

            .grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 9px;
            }

            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 9px;
            }

            .grid-1 {
              display: grid;
              grid-template-columns: 1fr;
            }

            .box {
              border: 1px dashed #000000;
              border-radius: 5px;
              overflow: hidden;
            }

            .box-label {
              display: block;
              padding: 6px;
              border-bottom: 1px dashed #000000;
              background: #f2f2f2;
              font-size: 12px;
              font-weight: 900;
              text-align: center;
            }

            .box-value {
              display: block;
              min-height: 30px;
              padding: 7px;
              color: #000000;
              font-size: 15px;
              font-weight: 900;
              text-align: center;
            }

            .field {
              display: grid;
              grid-template-columns: 145px 1fr;
              min-height: 43px;
              border: 1px dashed #000000;
              border-radius: 5px;
              overflow: hidden;
            }

            .field-label {
              display: flex;
              align-items: center;
              padding: 7px;
              border-left: 1px dashed #000000;
              background: #f2f2f2;
              font-size: 13px;
              font-weight: 900;
            }

            .field-value {
              display: flex;
              align-items: center;
              padding: 7px 10px;
              color: #000000;
              font-size: 14px;
              font-weight: 900;
            }

            .numeric {
              direction: ltr;
              unicode-bidi: isolate;
              font-family: Arial, sans-serif;
              font-weight: 900;
            }

            .footer {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 30px;
              margin-top: 14px;
              padding-top: 8px;
            }

            .employee {
              min-width: 330px;
              text-align: right;
              font-size: 14px;
              font-weight: 900;
            }

            .employee strong {
              display: inline-block;
              min-width: 210px;
              padding-bottom: 5px;
              border-bottom: 1px solid #000000;
            }

            .stamp {
              width: 230px;
              min-height: 70px;
              text-align: center;
              font-size: 14px;
              font-weight: 900;
            }

            .stamp-line {
              display: block;
              margin-top: 40px;
              border-bottom: 1px solid #000000;
            }
          </style>
        </head>

        <body>
          <section class="receipt">
            <header class="receipt-header">
              <img
                class="logo"
                src="${logoUrl}"
                alt=""
              />

              <h1 class="school-name">
                مدرسة الكوفة الأهلية
              </h1>

              <div class="receipt-title">
                وصل قبض أجور دراسية
              </div>
            </header>

            <div class="receipt-body">
              <div class="grid-4">
                ${printBox(
                  "رقم الوصل",
                  selectedPayment.receipt_number ||
                    formatNumber(selectedPayment.id),
                  true
                )}

                ${printBox(
                  "تاريخ التسديد",
                  formatDate(selectedPayment.payment_date),
                  true
                )}

                ${printBox(
                  "السنة الدراسية",
                  toEnglishDigits(fee.academic_year),
                  true
                )}

                ${printBox(
                  "نسبة التحصيل",
                  `${collectionRate.toFixed(2)}%`,
                  true
                )}
              </div>

              <div class="grid-1">
                ${printField(
                  "اسم الطالب",
                  fee.full_name
                )}
              </div>

              <div class="grid-3">
                ${printField(
                  "الصف",
                  fee.grade || "غير مسجل"
                )}

                ${printField(
                  "الشعبة",
                  fee.section || "غير مسجلة"
                )}

                ${printField(
                  "طريقة الدفع",
                  selectedPayment.payment_method ||
                    "نقدًا"
                )}
              </div>

              <div class="grid-3">
                ${printField(
                  "المبلغ المدفوع رقمًا",
                  formatMoney(currentAmount),
                  true
                )}

                ${printField(
                  "أجور الدراسة الكاملة",
                  formatMoney(totalFee),
                  true
                )}

                ${printField(
                  "المتبقي بعد الدفعة",
                  formatMoney(remainingAfterPayment),
                  true
                )}
              </div>

              <div class="grid-1">
                ${printField(
                  "المبلغ المدفوع كتابةً",
                  `${numberToArabicWords(
                    currentAmount
                  )} دينار عراقي فقط لا غير`
                )}
              </div>

              <div class="grid-3">
                ${printField(
                  "المدفوع سابقًا",
                  formatMoney(paidBeforeSelected),
                  true
                )}

                ${printField(
                  "إجمالي المدفوع",
                  formatMoney(totalPaidAfterPayment),
                  true
                )}

                ${printField(
                  "الملاحظات",
                  selectedPayment.notes ||
                    "لا توجد ملاحظات"
                )}
              </div>

              <div class="footer">
                <div class="employee">
                  الموظف المختص:
                  <strong>
                    ${escapeHtml(
                      selectedPayment.employee_name ||
                        "غير مسجل"
                    )}
                  </strong>
                </div>

                <div class="stamp">
                  ختم المدرسة
                  <span class="stamp-line"></span>
                </div>
              </div>
            </div>
          </section>

          <script>
            window.addEventListener("load", function () {
              setTimeout(function () {
                window.print();
              }, 300);
            });

            window.addEventListener("afterprint", function () {
              window.close();
            });
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      setMessage(
        "المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>طباعة وصل</h2>

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

        {loading ? (
          <p style={loadingStyle}>
            جاري تحميل الدفعات...
          </p>
        ) : payments.length === 0 ? (
          <div style={emptyStyle}>
            لا توجد دفعات مسجلة لهذا الطالب.
          </div>
        ) : (
          <>
            <div style={paymentSelectorStyle}>
              <label style={selectorLabelStyle}>
                اختر الدفعة المطلوب طباعة وصلها
              </label>

              <select
                value={selectedPaymentId}
                onChange={(event) =>
                  setSelectedPaymentId(event.target.value)
                }
                style={selectorStyle}
              >
                {payments.map((payment) => (
                  <option
                    key={payment.id}
                    value={payment.id}
                  >
                    {formatDate(payment.payment_date)} —{" "}
                    {formatMoney(payment.amount)}
                  </option>
                ))}
              </select>
            </div>

            {selectedPayment && (
              <section style={previewStyle}>
                <div style={previewHeaderStyle}>
                  <img
                    src="/logo.png"
                    alt=""
                    style={logoStyle}
                  />

                  <h3 style={previewSchoolStyle}>
                    مدرسة الكوفة الأهلية
                  </h3>

                  <div style={previewTitleStyle}>
                    وصل قبض أجور دراسية
                  </div>
                </div>

                <div style={previewBodyStyle}>
                  <strong>
                    الطالب: {fee.full_name}
                  </strong>

                  <span>
                    مبلغ الدفعة:{" "}
                    {formatMoney(currentAmount)}
                  </span>

                  <span>
                    الموظف المختص:{" "}
                    {selectedPayment.employee_name ||
                      "غير مسجل"}
                  </span>
                </div>
              </section>
            )}

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
                onClick={printReceipt}
                style={printButtonStyle}
              >
                طباعة الوصل
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function printBox(label, value, numeric = false) {
  return `
    <div class="box">
      <span class="box-label">${escapeHtml(label)}</span>
      <strong class="box-value ${
        numeric ? "numeric" : ""
      }">
        ${escapeHtml(value)}
      </strong>
    </div>
  `;
}

function printField(label, value, numeric = false) {
  return `
    <div class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <strong class="field-value ${
        numeric ? "numeric" : ""
      }">
        ${escapeHtml(value)}
      </strong>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toEnglishDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    )
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatMoney(value) {
  return `${formatNumber(value)} د.ع`;
}

function formatDate(value) {
  if (!value) return "غير مسجل";

  const date = new Date(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

function numberToArabicWords(value) {
  const number = Math.round(Number(value || 0));

  if (number === 0) return "صفر";

  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];

  const tens = [
    "",
    "",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];

  const hundreds = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];

  const joinParts = (parts) =>
    parts.filter(Boolean).join(" و");

  const belowThousand = (amount) => {
    const parts = [];
    const hundred = Math.floor(amount / 100);
    const remainder = amount % 100;

    if (hundred) {
      parts.push(hundreds[hundred]);
    }

    if (remainder) {
      if (remainder < 20) {
        parts.push(ones[remainder]);
      } else {
        const unit = remainder % 10;
        const ten = Math.floor(remainder / 10);

        parts.push(
          joinParts([
            unit ? ones[unit] : "",
            tens[ten],
          ])
        );
      }
    }

    return joinParts(parts);
  };

  const scaleText = (
    count,
    singular,
    dual,
    plural,
    accusative
  ) => {
    if (count === 1) return singular;
    if (count === 2) return dual;

    if (count >= 3 && count <= 10) {
      return `${belowThousand(count)} ${plural}`;
    }

    return `${belowThousand(count)} ${accusative}`;
  };

  const parts = [];
  let remaining = number;

  const millions = Math.floor(remaining / 1_000_000);
  remaining %= 1_000_000;

  if (millions) {
    parts.push(
      scaleText(
        millions,
        "مليون",
        "مليونان",
        "ملايين",
        "مليونًا"
      )
    );
  }

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (thousands) {
    parts.push(
      scaleText(
        thousands,
        "ألف",
        "ألفان",
        "آلاف",
        "ألفًا"
      )
    );
  }

  if (remaining) {
    parts.push(belowThousand(remaining));
  }

  return joinParts(parts);
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  padding: "20px",
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  width: "100%",
  maxWidth: "850px",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "16px",
  background: "#fff",
  direction: "rtl",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const subTitleStyle = {
  marginTop: "7px",
  color: "#777",
  fontWeight: "bold",
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  fontSize: "28px",
  cursor: "pointer",
};

const messageStyle = {
  padding: "11px",
  marginBottom: "15px",
  borderRadius: "8px",
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: "bold",
};

const loadingStyle = {
  padding: "30px",
  textAlign: "center",
};

const emptyStyle = {
  padding: "35px",
  borderRadius: "10px",
  background: "#f7f9fc",
  color: "#777",
  textAlign: "center",
};

const paymentSelectorStyle = {
  padding: "15px",
  marginBottom: "16px",
  border: "1px solid #e4e8ee",
  borderRadius: "10px",
  background: "#f7f9fc",
};

const selectorLabelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "bold",
};

const selectorStyle = {
  width: "100%",
  minHeight: "43px",
  padding: "9px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  fontFamily: "inherit",
};

const previewStyle = {
  border: "1px solid #d7dee8",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#ffffff",
};

const previewHeaderStyle = {
  padding: "15px",
  borderBottom: "1px solid #d7dee8",
  textAlign: "center",
};

const logoStyle = {
  display: "block",
  width: "72px",
  height: "72px",
  margin: "0 auto 5px",
  objectFit: "contain",
};

const previewSchoolStyle = {
  margin: 0,
  color: "#163c70",
  fontSize: "21px",
};

const previewTitleStyle = {
  marginTop: "4px",
  fontWeight: "900",
};

const previewBodyStyle = {
  display: "grid",
  gap: "8px",
  padding: "16px",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const closeActionButtonStyle = {
  padding: "10px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#e5e7eb",
  color: "#222",
  cursor: "pointer",
  fontWeight: "bold",
};

const printButtonStyle = {
  padding: "10px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#6f42c1",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};