import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/fees";
const LOGO_PATH = "/school-logo.png";

export default function PaymentHistory({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/${fee.id}/payments`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "تعذر جلب آخر دفعة"
        );
      }

      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(
        error.message || "تعذر جلب آخر دفعة"
      );
    } finally {
      setLoading(false);
    }
  }, [fee.id]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadPayments();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadPayments]);

  const latestPayment = payments[0] || null;

  const totalFee = Number(fee.total_fee || 0);
  const discount = Number(fee.discount || 0);
  const netFee = Math.max(totalFee - discount, 0);

  const totalPaid = useMemo(() => {
    return payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
  }, [payments]);

  const currentAmount = Number(
    latestPayment?.amount || 0
  );

  const paidBeforeLatest = Math.max(
    totalPaid - currentAmount,
    0
  );

  const remainingAfterPayment = Math.max(
    netFee - totalPaid,
    0
  );

  const collectionRate =
    netFee > 0
      ? Math.min((totalPaid / netFee) * 100, 100)
      : 0;

  const printLatestReceipt = () => {
    if (!latestPayment) return;

    const logoUrl = `${window.location.origin}${LOGO_PATH}`;

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
              size: A4 portrait;
              margin: 6mm;
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
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt-page {
              width: 100%;
              height: 284mm;
              display: grid;
              grid-template-rows: minmax(0, 1fr) 7mm minmax(0, 1fr);
              gap: 2mm;
            }

            .receipt {
              width: 100%;
              height: 100%;
              min-height: 0;
              border: 1.5px solid #000000;
              background: #ffffff;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .receipt-header {
              padding: 4px 12px 5px;
              border-bottom: 1.5px solid #000000;
              text-align: center;
            }

            .logo {
              display: block;
              width: 48px;
              height: 48px;
              margin: 0 auto 2px;
              object-fit: contain;
            }

            .school-name {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
            }

            .receipt-title {
              margin-top: 1px;
              font-size: 14px;
              font-weight: 900;
            }

            .body {
              display: grid;
              gap: 4px;
              padding: 6px 10px 8px;
            }

            .grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 4px;
            }

            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px;
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
              padding: 3px 4px;
              border-bottom: 1px dashed #000000;
              background: #f2f2f2;
              font-size: 9px;
              font-weight: 900;
              text-align: center;
            }

            .box-value {
              display: block;
              min-height: 21px;
              padding: 4px;
              font-size: 11px;
              font-weight: 900;
              text-align: center;
              overflow-wrap: anywhere;
            }

            .field {
              display: grid;
              grid-template-columns: 100px minmax(0, 1fr);
              min-height: 27px;
              border: 1px dashed #000000;
              border-radius: 5px;
              overflow: hidden;
            }

            .field-label {
              display: flex;
              align-items: center;
              padding: 4px 5px;
              border-left: 1px dashed #000000;
              background: #f2f2f2;
              font-size: 9.5px;
              font-weight: 900;
            }

            .field-value {
              display: flex;
              align-items: center;
              min-width: 0;
              padding: 4px 6px;
              font-size: 10.5px;
              font-weight: 900;
              line-height: 1.25;
              overflow-wrap: anywhere;
            }

            .numeric {
              direction: ltr;
              unicode-bidi: isolate;
              font-family: Arial, sans-serif;
            }

            .footer {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 16px;
              margin-top: 3px;
              padding-top: 2px;
            }

            .employees {
              display: grid;
              gap: 4px;
              min-width: 250px;
              font-size: 10px;
              font-weight: 900;
            }

            .employee-line strong {
              display: inline;
              min-width: 0;
              padding-bottom: 0;
              border-bottom: none;
            }

            .employee-line::after {
              content: "";
              display: block;
              width: 140px;
              margin-top: 9px;
              border-bottom: 1px solid #000000;
            }

            .stamp {
              width: 140px;
              min-height: 35px;
              text-align: center;
              font-size: 10px;
              font-weight: 900;
            }

            .stamp-line {
              display: block;
              margin-top: 20px;
              border-bottom: 1px solid #000000;
            }

            .cut-line {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              visibility: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .cut-line::before {
              content: "";
              position: absolute;
              right: 8mm;
              left: 8mm;
              border-top: 1.5px dashed #000000;
            }

            .cut-line span {
              position: relative;
              z-index: 1;
              padding: 0 8px;
              background: #ffffff;
              font-size: 16px;
              line-height: 1;
            }

            @media print {
              .cut-line {
                visibility: visible;
              }
            }
          </style>
        </head>

        <body>
          <main class="receipt-page">
            <section class="receipt">
            <header class="receipt-header">
              <img
                id="schoolLogo"
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

            <div class="body">
              <div class="grid-4">
                ${printBox(
                  "رقم الوصل",
                  latestPayment.receipt_number ||
                    formatNumber(latestPayment.id),
                  true
                )}

                ${printBox(
                  "تاريخ التسديد",
                  formatDate(
                    latestPayment.payment_date
                  ),
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
                  latestPayment.payment_method ||
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
                  formatMoney(
                    remainingAfterPayment
                  ),
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
                  formatMoney(paidBeforeLatest),
                  true
                )}

                ${printField(
                  "إجمالي المدفوع",
                  formatMoney(totalPaid),
                  true
                )}

                ${printField(
                  "الملاحظات",
                  latestPayment.notes ||
                    "لا توجد ملاحظات"
                )}
              </div>

              <div class="footer">
                <div class="employees">
                  <div class="employee-line">
                    المحاسب:
                    <strong>
                      ${escapeHtml(
                        latestPayment.accountant_name ||
                          "غير مسجل"
                      )}
                    </strong>
                  </div>

                  ${
                    latestPayment.assistant_name
                      ? `
                        <div class="employee-line">
                          الموظف المساعد:
                          <strong>
                            ${escapeHtml(
                              latestPayment.assistant_name
                            )}
                          </strong>
                        </div>
                      `
                      : ""
                  }
                </div>

                <div class="stamp">
                  ختم المدرسة
                  <span class="stamp-line"></span>
                </div>
              </div>
            </div>
            </section>

            <div class="cut-line" aria-hidden="true">
              <span>✂</span>
            </div>
          </main>

          <script>
            var receiptPage = document.querySelector(".receipt-page");
            var firstReceipt = receiptPage.querySelector(".receipt");
            var secondReceipt = firstReceipt.cloneNode(true);
            var secondLogo = secondReceipt.querySelector("#schoolLogo");

            if (secondLogo) {
              secondLogo.removeAttribute("id");
            }

            receiptPage.appendChild(secondReceipt);

            function beginPrint() {
              setTimeout(function () {
                window.print();
              }, 250);
            }

            var logo = document.getElementById("schoolLogo");

            if (logo.complete) {
              beginPrint();
            } else {
              logo.onload = beginPrint;
              logo.onerror = beginPrint;
            }

            window.addEventListener(
              "afterprint",
              function () {
                window.close();
              }
            );
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
        <div className="modal-sticky-header" style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>
              طباعة آخر وصل
            </h2>

            <div style={subTitleStyle}>
              {fee.full_name} — {fee.academic_year}
            </div>
          </div>

          <button
            type="button"
            className="modal-sticky-close"
            onClick={onClose}
            style={closeButtonStyle}
            aria-label="إغلاق معاينة آخر وصل"
          >
            ×
          </button>
        </div>

        {message && (
          <div style={messageStyle}>{message}</div>
        )}

        {loading ? (
          <p style={loadingStyle}>
            جاري تحميل آخر دفعة...
          </p>
        ) : !latestPayment ? (
          <div style={emptyStyle}>
            لا توجد دفعات مسجلة لهذا الطالب.
          </div>
        ) : (
          <>
            <section style={previewStyle}>
              <div style={previewHeaderStyle}>
                <img
                  src={LOGO_PATH}
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
                  آخر دفعة: {formatMoney(currentAmount)}
                </span>

                <span>
                  المحاسب:{" "}
                  {latestPayment.accountant_name ||
                    "غير مسجل"}
                </span>

                {latestPayment.assistant_name && (
                  <span>
                    الموظف المساعد:{" "}
                    {latestPayment.assistant_name}
                  </span>
                )}
              </div>
            </section>

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
                onClick={printLatestReceipt}
                style={printButtonStyle}
              >
                طباعة آخر وصل
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
  background: "var(--overlay-bg, rgba(0,0,0,0.55))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  width: "100%",
  maxWidth: "780px",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "16px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  border: "1px solid var(--border-color, #dbe3ec)",
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
  color: "var(--muted-color, #777)",
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
  background: "var(--danger-bg, #ffebee)",
  color: "var(--danger-color, #b71c1c)",
  fontWeight: "bold",
};

const loadingStyle = {
  padding: "30px",
  textAlign: "center",
};

const emptyStyle = {
  padding: "35px",
  borderRadius: "10px",
  background: "var(--soft-bg, #f7f9fc)",
  color: "var(--muted-color, #777)",
  textAlign: "center",
};

const previewStyle = {
  border: "1px solid var(--border-color, #d7dee8)",
  borderRadius: "12px",
  overflow: "hidden",
  background: "var(--card-bg, #ffffff)",
};

const previewHeaderStyle = {
  padding: "15px",
  borderBottom: "1px solid var(--border-color, #d7dee8)",
  textAlign: "center",
};

const logoStyle = {
  display: "block",
  width: "84px",
  height: "84px",
  margin: "0 auto 5px",
  objectFit: "contain",
};

const previewSchoolStyle = {
  margin: 0,
  color: "var(--heading-color, #163c70)",
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
  background: "var(--secondary-bg, #e5e7eb)",
  color: "var(--text-color, #222)",
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
