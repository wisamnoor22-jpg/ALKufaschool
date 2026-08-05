import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/Dashboard.css";

import FeesStats from "../components/finance/FeesStats";
import FeesTable from "../components/finance/FeesTable";
import PaymentForm from "../components/finance/PaymentForm";
import PaymentHistory from "../components/finance/PaymentHistory";
import GradeFeesManager from "../components/finance/GradeFeesManager";

const FEES_API = "http://localhost:5000/fees";

const sections = [
  {
    id: "payments",
    title: "تسديد الأقساط",
    description: "البحث عن الطالب وتسجيل دفعة جديدة",
    code: "PY",
  },
  {
    id: "grade-fees",
    title: "إدارة الأقساط الدراسية",
    description: "تحديد مبلغ القسط لكل مرحلة دراسية",
    code: "FM",
  },
  {
    id: "reports",
    title: "التقارير المالية",
    description: "تقارير المقبوضات والمتبقي والتحصيل",
    code: "RP",
  },
];

export default function Fees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = sections.some(({ id }) => id === requestedSection)
    ? requestedSection
    : "";
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [selectedFeeForPayment, setSelectedFeeForPayment] =
    useState(null);

  const [selectedFeeForHistory, setSelectedFeeForHistory] =
    useState(null);

  const [showQuickPayment, setShowQuickPayment] =
    useState(false);

  const [quickSearch, setQuickSearch] = useState("");

  const loadFees = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(FEES_API);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "تعذر جلب الحسابات"
        );
      }

      setFees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "تعذر جلب الحسابات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeSection === "payments" ||
      activeSection === "reports"
    ) {
      const loadTimer = window.setTimeout(loadFees, 0);
      return () => window.clearTimeout(loadTimer);
    }
  }, [activeSection, loadFees]);

  const filteredFees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return fees;

    return fees.filter((fee) => {
      return (
        fee.full_name?.toLowerCase().includes(query) ||
        fee.academic_year?.toLowerCase().includes(query)
      );
    });
  }, [fees, search]);

  const quickPaymentFees = useMemo(() => {
    const query = quickSearch.trim().toLowerCase();

    const unpaidFees = fees.filter((fee) => {
      const totalFee = Number(fee.total_fee || 0);
      const discount = Number(fee.discount || 0);
      const paid = Number(fee.paid || 0);
      const remaining = Math.max(
        totalFee - discount - paid,
        0
      );

      return remaining > 0;
    });

    if (!query) return unpaidFees;

    return unpaidFees.filter((fee) => {
      return (
        fee.full_name?.toLowerCase().includes(query) ||
        fee.academic_year?.toLowerCase().includes(query)
      );
    });
  }, [fees, quickSearch]);

  const totals = useMemo(() => {
    return fees.reduce(
      (result, fee) => {
        const totalFee = Number(fee.total_fee || 0);
        const discount = Number(fee.discount || 0);
        const paid = Number(fee.paid || 0);
        const netFee = Math.max(totalFee - discount, 0);

        result.totalFees += netFee;
        result.totalPaid += paid;
        result.totalRemaining += Math.max(
          netFee - paid,
          0
        );

        return result;
      },
      {
        totalFees: 0,
        totalPaid: 0,
        totalRemaining: 0,
      }
    );
  }, [fees]);

  const handlePaymentSaved = () => {
    setSelectedFeeForPayment(null);
    setShowQuickPayment(false);
    setQuickSearch("");
    loadFees();
  };

  const openSection = (sectionId) => {
    setSearch("");
    setMessage("");
    setShowQuickPayment(false);
    setQuickSearch("");
    setSearchParams({ section: sectionId });
  };

  const openQuickPayment = () => {
    setMessage("");

    if (fees.length === 0) {
      setMessage(
        "لا توجد حسابات طلاب متاحة لتسديد قسط"
      );
      return;
    }

    setQuickSearch("");
    setShowQuickPayment(true);
  };

  const chooseStudentForPayment = (fee) => {
    setShowQuickPayment(false);
    setQuickSearch("");
    setSelectedFeeForPayment(fee);
  };

  return (
    <div className="main-content fees-page" dir="rtl">
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: "14px 0 0" }}>
            الحسابات والأقساط
          </h2>

          <p style={{ color: "var(--muted-color, #64748b)", marginBottom: 0 }}>
            إدارة الرسوم والدفعات والتقارير المالية
          </p>
        </div>
      </div>

      {message && (
        <div style={messageStyle}>{message}</div>
      )}

      {!activeSection && (
        <div className="section-cards" style={sectionsGridStyle}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => openSection(section.id)}
              className="section-card"
              style={sectionButtonResetStyle}
            >
              <span className="section-icon">
                {section.code}
              </span>

              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>

              <b>←</b>
            </button>
          ))}
        </div>
      )}

      {activeSection === "grade-fees" && (
        <GradeFeesManager />
      )}

      {activeSection === "payments" && (
        <>
          <div style={paymentsTopRowStyle}>
            <SectionTitle
              title="تسديد الأقساط"
              description="اختر الطالب ثم سجل الدفعة المستلمة"
            />

            <button
              type="button"
              onClick={openQuickPayment}
              style={topPaymentButtonStyle}
            >
              + تسديد قسط
            </button>
          </div>

          <SearchInput
            search={search}
            setSearch={setSearch}
            placeholder="بحث باسم الطالب أو السنة الدراسية..."
          />

          {loading ? (
            <h3>جاري تحميل حسابات الطلاب...</h3>
          ) : (
            <FeesTable
              fees={filteredFees}
              onPayment={setSelectedFeeForPayment}
              onHistory={setSelectedFeeForHistory}
            />
          )}
        </>
      )}

      {activeSection === "reports" && (
        <>
          <SectionTitle
            title="التقارير المالية"
            description="ملخص الأقساط والمقبوضات والمبالغ المتبقية"
          />

          <FeesStats
            totalStudents={fees.length}
            totalFees={totals.totalFees}
            totalPaid={totals.totalPaid}
            totalRemaining={totals.totalRemaining}
          />
        </>
      )}

      {showQuickPayment && (
        <div style={quickOverlayStyle}>
          <div style={quickModalStyle}>
            <div className="modal-sticky-header" style={quickModalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>
                  تسديد قسط
                </h2>

                <p style={quickModalSubtitleStyle}>
                  ابحث عن الطالب ثم اختر حسابه
                </p>
              </div>

              <button
                type="button"
                className="modal-sticky-close"
                onClick={() => {
                  setShowQuickPayment(false);
                  setQuickSearch("");
                }}
                style={quickCloseButtonStyle}
                aria-label="إغلاق نافذة تسديد القسط"
              >
                ×
              </button>
            </div>

            <input
              className="data-list-control data-list-search"
              value={quickSearch}
              onChange={(event) =>
                setQuickSearch(event.target.value)
              }
              placeholder="ابحث باسم الطالب أو السنة الدراسية..."
              style={quickSearchStyle}
              autoFocus
            />

            <div className="data-list-card data-list-rows" style={quickStudentsListStyle}>
              {quickPaymentFees.length === 0 ? (
                <div className="data-list-empty" style={quickEmptyStyle}>
                  لا يوجد طالب لديه مبلغ متبقٍ
                </div>
              ) : (
                quickPaymentFees.map((fee) => {
                  const totalFee = Number(
                    fee.total_fee || 0
                  );
                  const discount = Number(
                    fee.discount || 0
                  );
                  const paid = Number(fee.paid || 0);
                  const remaining = Math.max(
                    totalFee - discount - paid,
                    0
                  );

                  return (
                    <button
                      key={fee.id}
                      type="button"
                      onClick={() =>
                        chooseStudentForPayment(fee)
                      }
                      className="data-list-row data-list-select-row"
                      style={quickStudentButtonStyle}
                    >
                      <div>
                        <strong style={quickStudentNameStyle}>
                          {fee.full_name}
                        </strong>

                        <span style={quickStudentMetaStyle}>
                          السنة الدراسية:{" "}
                          {fee.academic_year}
                        </span>
                      </div>

                      <div style={quickRemainingBoxStyle}>
                        <span>المتبقي</span>

                        <strong>
                          {remaining.toLocaleString()} د.ع
                        </strong>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedFeeForPayment && (
        <PaymentForm
          fee={selectedFeeForPayment}
          onClose={() =>
            setSelectedFeeForPayment(null)
          }
          onSaved={handlePaymentSaved}
        />
      )}

      {selectedFeeForHistory && (
        <PaymentHistory
          fee={selectedFeeForHistory}
          onClose={() =>
            setSelectedFeeForHistory(null)
          }
        />
      )}
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div style={sectionHeaderStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>

      <p style={{ color: "var(--muted-color, #64748b)", marginBottom: 0 }}>
        {description}
      </p>
    </div>
  );
}

function SearchInput({
  search,
  setSearch,
  placeholder,
}) {
  return (
    <div className="data-list-filters" style={{ marginBottom: 20 }}>
      <input
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder={placeholder}
        className="data-list-control data-list-search"
        style={searchStyle}
      />
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 25,
  gap: 15,
  flexWrap: "wrap",
};

const sectionsGridStyle = {
  direction: "rtl",
  gridTemplateColumns:
    "repeat(3, minmax(260px, 1fr))",
};

const sectionButtonResetStyle = {
  width: "100%",
  fontFamily: "inherit",
  textAlign: "right",
  cursor: "pointer",
};

const paymentsTopRowStyle = {
  display: "flex",
  alignItems: "stretch",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "20px",
  direction: "rtl",
};

const sectionHeaderStyle = {
  flex: 1,
  marginBottom: 0,
  padding: "18px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  borderRadius: "13px",
  border: "1px solid var(--border-color, #e5e9ef)",
};

const topPaymentButtonStyle = {
  alignSelf: "stretch",
  minWidth: "170px",
  padding: "14px 22px",
  border: "none",
  borderRadius: "13px",
  background: "#198754",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "17px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 7px 18px rgba(25,135,84,.22)",
};

const searchStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 15,
  boxSizing: "border-box",
};

const messageStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  padding: "12px",
  borderRadius: "9px",
  marginBottom: "15px",
  fontWeight: "bold",
};

const quickOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  padding: "20px",
  background: "rgba(15,23,42,.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const quickModalStyle = {
  width: "min(720px, 100%)",
  maxHeight: "88vh",
  padding: "22px",
  borderRadius: "16px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  overflowY: "auto",
  boxShadow: "0 24px 70px rgba(15,23,42,.28)",
};

const quickModalHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "15px",
  marginBottom: "16px",
};

const quickModalSubtitleStyle = {
  margin: "6px 0 0",
  color: "#64748b",
};

const quickCloseButtonStyle = {
  width: "40px",
  height: "40px",
  border: "none",
  borderRadius: "9px",
  background: "var(--soft-bg, #f1f5f9)",
  color: "var(--text-color, #334155)",
  fontSize: "26px",
  cursor: "pointer",
};

const quickSearchStyle = {
  width: "100%",
  minHeight: "46px",
  padding: "11px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "15px",
  outline: "none",
};

const quickStudentsListStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "15px",
};

const quickStudentButtonStyle = {
  width: "100%",
  minHeight: "82px",
  padding: "14px",
  border: "1px solid #dfe7ef",
  borderRadius: "12px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  textAlign: "right",
  fontFamily: "inherit",
  cursor: "pointer",
};

const quickStudentNameStyle = {
  display: "block",
  color: "#163c70",
  fontSize: "17px",
};

const quickStudentMetaStyle = {
  display: "block",
  marginTop: "6px",
  color: "#64748b",
  fontSize: "14px",
};

const quickRemainingBoxStyle = {
  minWidth: "145px",
  padding: "10px",
  borderRadius: "9px",
  background: "#fff7ed",
  color: "#9a3412",
  textAlign: "center",
};

const quickEmptyStyle = {
  padding: "36px",
  border: "1px dashed #cbd5e1",
  borderRadius: "12px",
  color: "#64748b",
  textAlign: "center",
};
