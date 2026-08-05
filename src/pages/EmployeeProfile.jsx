import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PayrollReport from "../components/payroll/PayrollReport";
import "../styles/Dashboard.css";

const API_URL = "http://localhost:5000";

const documentTypes = [
  "البطاقة الموحدة",
  "بطاقة السكن",
  "وثيقة التخرج",
  "تأييد التخرج",
  "إجازة السوق",
  "جواز السفر",
  "أخرى",
];

export default function EmployeeProfile() {
 const params = useParams();
const employeeId = params.employeeId || params.id;
  console.log("employeeId =", employeeId);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("info");

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [documentType, setDocumentType] = useState("");
  const [customDocumentType, setCustomDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [showCamera, setShowCamera] = useState(false);

  const finalDocumentType =
    documentType === "أخرى"
      ? customDocumentType.trim()
      : documentType;

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      console.log("Fetching:", `${API_URL}/employees/${employeeId}`);

const response = await fetch(
  `${API_URL}/employees/${employeeId}`
);

console.log("Status:", response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب بيانات الموظف");
      }

      setEmployee(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/employees/${employeeId}/documents`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر جلب المستندات");
      }

      setDocuments(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDocumentsLoading(false);
    }
  }, [employeeId]);

  const resetDocumentForm = () => {
    setDocumentType("");
    setCustomDocumentType("");
    setDocumentName("");
    setSelectedFile(null);
  };

  const uploadDocument = async (file) => {
    if (!finalDocumentType) {
      setMessage("يرجى اختيار نوع المستند");
      return;
    }

    if (!file) {
      setMessage("يرجى اختيار ملف أو التقاط صورة");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const formData = new FormData();

      formData.append("document", file);
      formData.append("document_type", finalDocumentType);
      formData.append("document_name", documentName.trim());

      const response = await fetch(
        `${API_URL}/employees/${employeeId}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر رفع المستند");
      }

      setDocuments((previous) => [
        data.document,
        ...previous,
      ]);

      resetDocumentForm();
      setMessage("تم رفع المستند بنجاح");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    await uploadDocument(selectedFile);
  };
const startCamera = async () => {
  if (!finalDocumentType) {
    setMessage("اختر نوع المستند أولًا");
    return;
  }

  try {
    setMessage("");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    streamRef.current = stream;
    setShowCamera(true);

    requestAnimationFrame(async () => {
      const video = videoRef.current;

      if (!video) return;

      video.srcObject = stream;

      try {
        await video.play();
      } catch (error) {
        console.error(error);
        setMessage("تعذر تشغيل معاينة الكاميرا");
      }
    });
  } catch (error) {
    console.error(error);
    setMessage(
      "تعذر تشغيل الكاميرا. تأكد من توصيلها والسماح للمتصفح باستخدامها."
    );
  }
};

const stopCamera = useCallback(() => {
  if (videoRef.current) {
    videoRef.current.pause();
    videoRef.current.srcObject = null;
  }

  if (streamRef.current) {
    streamRef.current
      .getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
  }

  setShowCamera(false);
}, []);

  useEffect(() => {
    // Loading the route resource is the intended effect synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    if (activeTab === "documents") {
      // Load this external resource only when its tab becomes active.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDocuments();
    }
  }, [activeTab, loadDocuments]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

const captureDocument = () => {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas) {
    setMessage("تعذر الوصول إلى الكاميرا");
    return;
  }

  if (!video.videoWidth || !video.videoHeight) {
    setMessage("انتظر حتى تظهر صورة الكاميرا ثم حاول مرة أخرى");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  canvas.toBlob(
    async (blob) => {
      if (!blob) {
        setMessage("تعذر التقاط الصورة");
        return;
      }

      const file = new File(
        [blob],
        `camera-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
        }
      );

      stopCamera();
      await uploadDocument(file);
    },
    "image/jpeg",
    0.92
  );
};

  const getDocumentUrl = (document) => {
    return `${API_URL}/uploads/employees/${employeeId}/${document.file_name}`;
  };

  const previewDocument = (document) => {
    window.open(
      getDocumentUrl(document),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const printDocument = (document) => {
    const documentUrl = getDocumentUrl(document);

    const printWindow = window.open(
      documentUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (!printWindow) {
      setMessage("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
  };

  const deleteDocument = async (documentId) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المستند؟"
    );

    if (!confirmed) return;

    try {
      setMessage("");

      const response = await fetch(
        `${API_URL}/employees/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر حذف المستند");
      }

      setDocuments((previous) =>
        previous.filter(
          (document) => document.id !== documentId
        )
      );

      setMessage("تم حذف المستند");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (loading) {
    return (
      <div className="main-content" dir="rtl">
        <h3>جاري تحميل ملف الموظف...</h3>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="main-content" dir="rtl">
        <div style={errorStyle}>
          {message || "الموظف غير موجود"}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" dir="rtl">
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: "15px 0 5px" }}>
            {employee.full_name}
          </h2>

          <div style={employeeCodeStyle}>
            {employee.employee_code} —{" "}
            {employee.employee_type || "غير محدد"}
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            ...messageStyle,
            background: message.includes("بنجاح")
              ? "var(--success-bg, #e8f5e9)"
              : "var(--warning-bg, #fff3cd)",
            color: message.includes("بنجاح")
              ? "var(--success-color, #1b5e20)"
              : "var(--warning-color, #664d03)",
          }}
        >
          {message}
        </div>
      )}

      <div style={tabsStyle}>
        <TabButton
          label="المعلومات"
          active={activeTab === "info"}
          onClick={() => setActiveTab("info")}
        />

        <TabButton
          label="المستندات"
          active={activeTab === "documents"}
          onClick={() => setActiveTab("documents")}
        />

        <TabButton
          label="الحضور"
          active={activeTab === "attendance"}
          onClick={() => setActiveTab("attendance")}
        />

        <TabButton
          label="الرواتب"
          active={activeTab === "salary"}
          onClick={() => setActiveTab("salary")}
        />

        <TabButton
          label="التقارير"
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
      </div>

      {activeTab === "info" && (
        <div style={detailsGridStyle}>
          <Detail
            label="الرقم الوظيفي"
            value={employee.employee_code}
          />

          <Detail
            label="الاسم الكامل"
            value={employee.full_name}
          />

          <Detail label="الاسم الأول" value={employee.first_name} />

          <Detail label="الاسم الثاني" value={employee.middle_name} />

          <Detail label="الاسم الثالث" value={employee.third_name} />

          <Detail
            label="نوع الموظف"
            value={employee.employee_type}
          />

          <Detail
            label="الاختصاص"
            value={employee.specialization}
          />

          <Detail label="الشفت" value={employee.work_shift} />

          <Detail
            label="رقم الهاتف"
            value={employee.phone}
          />

          <Detail
            label="العنوان"
            value={employee.address}
          />

          <Detail
            label="الراتب"
            value={
              employee.salary !== null &&
              employee.salary !== undefined &&
              employee.salary !== ""
                ? `${Number(employee.salary).toLocaleString()} د.ع`
                : null
            }
          />

          {employee.employee_type === "معلمة" && (
            <Detail
              label="الأجر اليومي (الراتب ÷ 22)"
              value={
                Number.isFinite(Number(employee.salary))
                  ? `${(Number(employee.salary) / 22).toLocaleString("ar-IQ", {
                      maximumFractionDigits: 2,
                    })} د.ع`
                  : null
              }
            />
          )}

          <Detail
            label="رقم البصمة"
            value={employee.fingerprint_id}
          />

          <div style={{ gridColumn: "1 / -1" }}>
            <Detail
              label="الملاحظات"
              value={employee.notes}
            />
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div>
          <form
            onSubmit={handleFileUpload}
            style={uploadCardStyle}
          >
            <h3 style={{ marginTop: 0 }}>
              إضافة مستند
            </h3>

            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>
                  نوع المستند *
                </label>

                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value)
                  }
                  style={inputStyle}
                  required
                >
                  <option value="">اختر</option>

                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {documentType === "أخرى" && (
                <div>
                  <label style={labelStyle}>
                    نوع المستند *
                  </label>

                  <input
                    value={customDocumentType}
                    onChange={(event) =>
                      setCustomDocumentType(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                    required
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  اسم المستند
                </label>

                <input
                  value={documentName}
                  onChange={(event) =>
                    setDocumentName(event.target.value)
                  }
                  placeholder="اختياري"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  اختيار ملف
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    setSelectedFile(
                      event.target.files?.[0] || null
                    )
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={uploadActionsStyle}>
              <button
                type="submit"
                disabled={saving}
                style={uploadButtonStyle}
              >
                {saving
                  ? "جاري الرفع..."
                  : "رفع الملف"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={startCamera}
                style={cameraButtonStyle}
              >
                التقاط بالكاميرا
              </button>
            </div>
          </form>

          <div className="data-list-card" style={documentsCardStyle}>
            <div className="data-list-header">
              <h3 style={{ marginTop: 0 }}>
                المستندات المحفوظة
              </h3>
            </div>

            {documentsLoading ? (
              <p className="data-list-loading">جاري تحميل المستندات...</p>
            ) : documents.length === 0 ? (
              <div className="data-list-empty" style={emptyStyle}>
                لا توجد مستندات لهذا الموظف.
              </div>
            ) : (
              <div
                className="data-list-scroll"
                style={{ overflowX: "auto" }}
              >
                <table
                  className="data-list-table employee-documents-table"
                  style={tableStyle}
                >
                  <thead style={tableHeaderStyle}>
                    <tr>
                      <th style={cellStyle}>النوع</th>
                      <th style={cellStyle}>الاسم</th>
                      <th style={cellStyle}>تاريخ الإضافة</th>
                      <th style={cellStyle}>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {documents.map((document) => (
                      <tr
                        key={document.id}
                        style={rowStyle}
                      >
                        <td style={cellStyle}>
                          {document.document_type}
                        </td>

                        <td style={cellStyle}>
                          {document.document_name ||
                            document.file_name}
                        </td>

                        <td style={cellStyle}>
                          {new Date(
                            document.uploaded_at
                          ).toLocaleDateString("ar-IQ")}
                        </td>

                        <td style={cellStyle}>
                          <div className="data-list-actions" style={documentActionsStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                previewDocument(document)
                              }
                              className="data-list-action"
                              style={previewButtonStyle}
                            >
                              معاينة
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                printDocument(document)
                              }
                              className="data-list-action"
                              style={printButtonStyle}
                            >
                              طباعة
                            </button>

                            <a
                              href={getDocumentUrl(document)}
                              download
                              className="data-list-action"
                              style={downloadButtonStyle}
                            >
                              تنزيل
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                deleteDocument(document.id)
                              }
                              className="data-list-action"
                              style={deleteButtonStyle}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div style={emptyStyle}>
          سيتم تجهيز هذا القسم لاحقًا.
        </div>
      )}

      {activeTab === "salary" && (
        <PayrollReport
          title="تفاصيل الراتب"
          employeeId={employeeId}
        />
      )}

      {activeTab === "reports" && (
        <PayrollReport
          title="تقرير الكادر والراتب"
          employeeId={employeeId}
        />
      )}

      {showCamera && (
        <div style={cameraOverlayStyle} role="dialog" aria-modal="true">
          <div style={cameraModalStyle}>
            <h3 style={{ marginTop: 0 }}>
              تصوير المستند
            </h3>

            <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  style={videoStyle}
/>

            <canvas
              ref={canvasRef}
              style={{ display: "none" }}
            />

            <div style={cameraActionsStyle}>
              <button
                type="button"
                onClick={stopCamera}
                style={cancelButtonStyle}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={captureDocument}
                disabled={saving}
                style={captureButtonStyle}
              >
                التقاط وحفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 17px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
        background: active ? "var(--primary-bg, #1e3c72)" : "var(--soft-bg, #edf1f5)",
        color: active ? "#fff" : "var(--text-color, #333)",
      }}
    >
      {label}
    </button>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailCardStyle}>
      <span style={detailLabelStyle}>{label}</span>

      <strong style={detailValueStyle}>
        {value || "غير مسجل"}
      </strong>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "20px",
};

const employeeCodeStyle = {
  color: "var(--muted-color, #777)",
  fontWeight: "bold",
};

const messageStyle = {
  padding: "12px",
  borderRadius: "9px",
  marginBottom: "15px",
  fontWeight: "bold",
};

const tabsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const detailCardStyle = {
  padding: "16px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  borderRadius: "11px",
  border: "1px solid var(--border-color, #e6eaf0)",
  boxShadow: "0 4px 12px rgba(0,0,0,.05)",
};

const detailLabelStyle = {
  display: "block",
  color: "var(--muted-color, #777)",
  fontSize: "13px",
};

const detailValueStyle = {
  display: "block",
  marginTop: "7px",
};

const uploadCardStyle = {
  padding: "20px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  border: "1px solid var(--border-color, #e6eaf0)",
  borderRadius: "14px",
  marginBottom: "20px",
  boxShadow: "0 5px 16px rgba(0,0,0,.07)",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid var(--border-color, #ccc)",
  background: "var(--input-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const uploadActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const uploadButtonStyle = {
  background: "#1e3c72",
  color: "#fff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cameraButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const documentsCardStyle = {
  padding: "20px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  border: "1px solid var(--border-color, #e6eaf0)",
  borderRadius: "14px",
  boxShadow: "0 5px 16px rgba(0,0,0,.07)",
};

const tableStyle = {
  width: "100%",
  minWidth: "750px",
  borderCollapse: "collapse",
};

const tableHeaderStyle = {
  background: "#1e3c72",
  color: "#fff",
};

const rowStyle = {
  borderBottom: "1px solid var(--border-color, #eee)",
};

const cellStyle = {
  padding: "13px",
  textAlign: "right",
};

const documentActionsStyle = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
};

const previewButtonStyle = {
  background: "#0d6efd",
  color: "#fff",
  border: "none",
  padding: "7px 11px",
  borderRadius: "6px",
  cursor: "pointer",
};

const printButtonStyle = {
  background: "#6f42c1",
  color: "#fff",
  border: "none",
  padding: "7px 11px",
  borderRadius: "6px",
  cursor: "pointer",
};

const downloadButtonStyle = {
  background: "#198754",
  color: "#fff",
  padding: "7px 11px",
  borderRadius: "6px",
  textDecoration: "none",
};

const deleteButtonStyle = {
  background: "#dc3545",
  color: "#fff",
  border: "none",
  padding: "7px 11px",
  borderRadius: "6px",
  cursor: "pointer",
};

const emptyStyle = {
  textAlign: "center",
  padding: "45px 20px",
  color: "var(--muted-color, #777)",
  background: "var(--soft-bg, #f7f9fc)",
  borderRadius: "12px",
};

const errorStyle = {
  marginTop: "20px",
  padding: "15px",
  background: "var(--danger-bg, #ffebee)",
  color: "var(--danger-color, #b71c1c)",
  borderRadius: "9px",
};

const cameraOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
  padding: "20px",
};

const cameraModalStyle = {
  width: "100%",
  maxWidth: "760px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-color, #1f2937)",
  padding: "20px",
  borderRadius: "15px",
};

const videoStyle = {
  width: "100%",
  maxHeight: "65vh",
  background: "#000",
  borderRadius: "10px",
};

const cameraActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "15px",
};

const cancelButtonStyle = {
  background: "var(--secondary-bg, #e5e7eb)",
  color: "var(--text-color, #222)",
  border: "none",
  padding: "10px 17px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const captureButtonStyle = {
  background: "#198754",
  color: "#fff",
  border: "none",
  padding: "10px 17px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};
