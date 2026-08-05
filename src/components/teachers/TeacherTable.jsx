import { useState } from "react";

const DELETE_REASONS = [
  { value: "resignation", label: "استقالة." },
  { value: "termination", label: "إنهاء خدمة." },
  { value: "transfer", label: "نقل." },
  { value: "retirement", label: "تقاعد." },
  { value: "other", label: "سبب آخر." },
];

export default function TeacherTable({
  employees = [],
  onDelete,
  onView,
  onEdit,
  onReport,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonDetails, setDeleteReasonDetails] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (employee) => {
    setDeleteTarget(employee);
    setDeleteReason("");
    setDeleteReasonDetails("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setDeleteTarget(null);
    setDeleteReason("");
    setDeleteReasonDetails("");
    setDeleteError("");
  };

  const deleteEmployee = async (event) => {
    event.preventDefault();

    if (!deleteTarget) return;

    if (!deleteReason) {
      setDeleteError("يرجى تحديد سبب حذف الموظف");
      return;
    }

    if (deleteReason === "other" && !deleteReasonDetails.trim()) {
      setDeleteError("يرجى كتابة سبب حذف الموظف");
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      const response = await fetch(
        `http://localhost:5000/employees/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason_code: deleteReason,
            reason_details:
              deleteReason === "other"
                ? deleteReasonDetails.trim()
                : "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "تعذر حذف الموظف");
      }

      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      setDeleteReason("");
      setDeleteReasonDetails("");
      onDelete?.(deletedId);
    } catch (error) {
      console.error(error);
      setDeleteError(error.message || "حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="teachers-table-wrapper data-list-scroll">
      <table className="teachers-table data-list-table">
        <thead>
          <tr>
            <th>الرقم الوظيفي</th>
            <th>الاسم</th>
            <th>نوع الموظف</th>
            <th>الاختصاص</th>
            <th>الشفت</th>
            <th>الهاتف</th>
            <th>الراتب</th>
            <th>العنوان</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="9" className="teachers-empty-state data-list-empty">
                لا توجد بيانات مطابقة
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <span className="teachers-code-badge">
                    {employee.employee_code || "غير مسجل"}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() => onView?.(employee)}
                    className="teachers-name-button data-list-name"
                  >
                    {employee.full_name}
                  </button>
                </td>

                <td>{employee.employee_type || "غير محدد"}</td>
                <td>{employee.specialization || "—"}</td>
                <td>{employee.work_shift || "غير مسجل"}</td>
                <td>{employee.phone || "غير مسجل"}</td>
                <td>
                  {employee.salary === null ||
                  employee.salary === undefined ||
                  employee.salary === ""
                    ? "غير مسجل"
                    : `${Number(employee.salary).toLocaleString("ar-IQ")} د.ع`}
                </td>
                <td>{employee.address || "غير مسجل"}</td>

                <td>
                  <div className="teachers-actions data-list-actions">
                    <button
                      type="button"
                      onClick={() => onReport?.(employee)}
                      className="teachers-report-button"
                    >
                      تقرير
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit?.(employee)}
                      className="teachers-edit-button"
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(employee)}
                      className="teachers-delete-button"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="teachers-delete-overlay">
          <div
            className="teachers-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-delete-title"
          >
            <div className="modal-sticky-close-bar">
              <button
                type="button"
                className="teachers-delete-close modal-sticky-close"
                onClick={closeDeleteModal}
                disabled={deleting}
                aria-label="إغلاق نافذة حذف الموظف"
              >
                ×
              </button>
            </div>

            <h2 id="employee-delete-title">تأكيد حذف الموظف</h2>
            <p className="teachers-delete-name">
              الموظف: <strong>{deleteTarget.full_name}</strong>
            </p>

            <div className="teachers-delete-warning" role="alert">
              تحذير: سيُحفظ سجل كامل قبل حذف الموظف، ثم تُحذف سجلات
              الحضور والمستندات المرتبطة به. العملية نهائية ولا تتضمن
              استرجاعًا في هذه المرحلة.
            </div>

            <form onSubmit={deleteEmployee}>
              <fieldset className="teachers-delete-reasons">
                <legend>سبب حذف الموظف</legend>

                {DELETE_REASONS.map((reason) => (
                  <label key={reason.value}>
                    <input
                      type="radio"
                      name="employee_delete_reason"
                      value={reason.value}
                      checked={deleteReason === reason.value}
                      onChange={(event) => {
                        setDeleteReason(event.target.value);
                        setDeleteError("");
                      }}
                      disabled={deleting}
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </fieldset>

              {deleteReason === "other" && (
                <div className="teachers-delete-other">
                  <label htmlFor="employee-delete-reason-details">
                    اكتب سبب الحذف <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="employee-delete-reason-details"
                    value={deleteReasonDetails}
                    onChange={(event) => {
                      setDeleteReasonDetails(event.target.value);
                      setDeleteError("");
                    }}
                    maxLength="500"
                    rows="4"
                    required
                    disabled={deleting}
                  />
                </div>
              )}

              {deleteError && (
                <div className="teachers-delete-error" role="alert">
                  {deleteError}
                </div>
              )}

              <div className="teachers-delete-actions">
                <button
                  type="submit"
                  className="teachers-delete-confirm"
                  disabled={deleting}
                >
                  {deleting ? "جاري الحذف..." : "تأكيد الحذف النهائي"}
                </button>
                <button
                  type="button"
                  className="teachers-delete-cancel"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
