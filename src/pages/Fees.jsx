import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

import FeesStats from "../components/finance/FeesStats";
import FeesTable from "../components/finance/FeesTable";
import PaymentForm from "../components/finance/PaymentForm";
import PaymentHistory from "../components/finance/PaymentHistory";
import GradeFeesManager from "../components/finance/GradeFeesManager";

const FEES_API = "http://localhost:5000/fees";

const sections = [
  {
    id: "grade-fees",
    title: "إدارة الأقساط الدراسية",
    description: "تحديد مبلغ القسط لكل مرحلة دراسية",
    icon: "⚙️",
  },
  {
    id: "payments",
    title: "تسديد الأقساط",
    description: "البحث عن الطالب وتسجيل دفعة جديدة",
    icon: "💵",
  },
  {
    id: "reports",
    title: "التقارير المالية",
    description: "تقارير المقبوضات والمتبقي والتحصيل",
    icon: "📊",
  },
];

export default function Fees() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("");
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [selectedFeeForPayment, setSelectedFeeForPayment] =
    useState(null);

  const [selectedFeeForHistory, setSelectedFeeForHistory] =
    useState(null);

  const loadFees = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(FEES_API);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب الحسابات");
      }

      setFees(data);
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeSection === "payments" ||
      activeSection === "reports"
    ) {
      loadFees();
    }
  }, [activeSection]);

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

  const totals = useMemo(() => {
    return fees.reduce(
      (result, fee) => {
        const totalFee = Number(fee.total_fee || 0);
        const discount = Number(fee.discount || 0);
        const paid = Number(fee.paid || 0);
        const netFee = Math.max(totalFee - discount, 0);

        result.totalFees += netFee;
        result.totalPaid += paid;
        result.totalRemaining += Math.max(netFee - paid, 0);

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
    loadFees();
  };

  const returnToSections = () => {
    setActiveSection("");
    setSearch("");
    setMessage("");
  };

  return (
    <div className="main-content" dir="rtl">
      <div style={headerStyle}>
        <div>
          <button
            type="button"
            onClick={
              activeSection
                ? returnToSections
                : () => navigate(-1)
            }
            style={backButtonStyle}
          >
            رجوع
          </button>

          <h2 style={{ margin: "14px 0 0" }}>
            الحسابات والأقساط
          </h2>

          <p style={{ color: "#777", marginBottom: 0 }}>
            إدارة الرسوم والدفعات والتقارير المالية
          </p>
        </div>
      </div>

      {message && (
        <div style={messageStyle}>{message}</div>
      )}

      {!activeSection && (
        <div style={sectionsGridStyle}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              style={sectionCardStyle}
            >
              <span style={sectionIconStyle}>
                {section.icon}
              </span>

              <div>
                <h3 style={sectionTitleStyle}>
                  {section.title}
                </h3>

                <p style={sectionDescriptionStyle}>
                  {section.description}
                </p>
              </div>

              <span style={arrowStyle}>←</span>
            </button>
          ))}
        </div>
      )}

      {activeSection === "grade-fees" && (
  <GradeFeesManager />
)}

      {activeSection === "payments" && (
        <>
          <SectionTitle
            title="تسديد الأقساط"
            description="اختر الطالب ثم سجل الدفعة المستلمة"
          />

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

      {selectedFeeForPayment && (
        <PaymentForm
          fee={selectedFeeForPayment}
          onClose={() => setSelectedFeeForPayment(null)}
          onSaved={handlePaymentSaved}
        />
      )}

      {selectedFeeForHistory && (
        <PaymentHistory
          fee={selectedFeeForHistory}
          onClose={() => setSelectedFeeForHistory(null)}
        />
      )}
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div style={sectionHeaderStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>

      <p style={{ color: "#777", marginBottom: 0 }}>
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
    <div style={{ marginBottom: 20 }}>
      <input
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder={placeholder}
        style={searchStyle}
      />
    </div>
  );
}

function SectionPlaceholder({ title, text }) {
  return (
    <div style={placeholderStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginBottom: 0 }}>{text}</p>
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

const backButtonStyle = {
  background: "#edf1f5",
  color: "#1e3c72",
  border: "none",
  padding: "9px 14px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
};

const sectionsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

const sectionCardStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  minHeight: "135px",
  padding: "22px",
  background: "#fff",
  color: "#222",
  border: "1px solid #e5e9ef",
  borderRadius: "15px",
  boxShadow: "0 7px 20px rgba(0,0,0,.07)",
  textAlign: "right",
  cursor: "pointer",
};

const sectionIconStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "55px",
  height: "55px",
  background: "#edf3fb",
  borderRadius: "13px",
  fontSize: "27px",
};

const sectionTitleStyle = {
  margin: "0 0 7px",
  color: "#1e3c72",
};

const sectionDescriptionStyle = {
  margin: 0,
  color: "#777",
  lineHeight: 1.6,
};

const arrowStyle = {
  position: "absolute",
  left: "18px",
  bottom: "15px",
  color: "#1e3c72",
  fontWeight: "bold",
};

const sectionHeaderStyle = {
  marginBottom: "20px",
  padding: "18px",
  background: "#fff",
  borderRadius: "13px",
  border: "1px solid #e5e9ef",
};

const searchStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 15,
  boxSizing: "border-box",
};

const placeholderStyle = {
  padding: "40px 25px",
  textAlign: "center",
  color: "#666",
  background: "#fff",
  border: "1px solid #e5e9ef",
  borderRadius: "14px",
};

const messageStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  padding: "12px",                                                                                                          
  borderRadius: "9px",
  marginBottom: "15px",
  fontWeight: "bold",
};