import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/studentManagement.css";

const API_BASE = "http://localhost:5000";
const SECTIONS_API = `${API_BASE}/student-sections`;

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "تعذر إكمال الطلب");
    error.status = response.status;
    throw error;
  }

  return data;
};

function Modal({ title, description, onClose, children, wide = false }) {
  return (
    <div className="student-sections-modal-overlay" role="presentation">
      <section
        className={`student-sections-modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="student-sections-modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function StudentSections() {
  const [data, setData] = useState({
    academic_year: "",
    grades: [],
    sections: [],
    students: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [gradeFilter, setGradeFilter] = useState("الكل");

  const [addOpen, setAddOpen] = useState(false);
  const [addGradeId, setAddGradeId] = useState("");
  const [addName, setAddName] = useState("");

  const [renameSection, setRenameSection] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [transferSource, setTransferSource] = useState(null);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [transferSearch, setTransferSearch] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadSections = useCallback(async () => {
    try {
      setLoading(true);
      const result = await requestJson(SECTIONS_API);
      setData({
        academic_year: result.academic_year || "",
        grades: Array.isArray(result.grades) ? result.grades : [],
        sections: Array.isArray(result.sections) ? result.sections : [],
        students: Array.isArray(result.students) ? result.students : [],
      });
      setMessage("");
    } catch (error) {
      showMessage(
        error.message || "تعذر تحميل الشعب. تأكد من ربط مسار student-sections بالخادم.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (!addGradeId && data.grades.length) {
      setAddGradeId(String(data.grades[0].id));
    }
  }, [addGradeId, data.grades]);

  const sectionsByGrade = useMemo(() => {
    const grouped = new Map();

    data.grades.forEach((grade) => {
      grouped.set(String(grade.id), {
        grade,
        sections: [],
      });
    });

    data.sections.forEach((section) => {
      const key = String(section.grade_id);
      if (!grouped.has(key)) {
        grouped.set(key, {
          grade: {
            id: section.grade_id,
            name: section.grade_name || "صف غير محدد",
            display_name: section.grade_name || "صف غير محدد",
          },
          sections: [],
        });
      }
      grouped.get(key).sections.push(section);
    });

    return [...grouped.values()].filter((group) => {
      if (gradeFilter === "الكل") return true;
      return String(group.grade.id) === gradeFilter;
    });
  }, [data.grades, data.sections, gradeFilter]);

  const totalStudents = data.students.length;
  const totalSections = data.sections.length;

  const handleInitializePlan = async () => {
    const confirmed = window.confirm(
      "سيتم إنشاء الشعب الناقصة فقط حسب التوزيع المعتمد، ولن تُحذف أي شعبة أو يُنقل أي طالب. هل تريد المتابعة؟"
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const result = await requestJson(`${SECTIONS_API}/initialize-plan`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      showMessage(result.message || "تم تطبيق توزيع الشعب المعتمد.");
      await loadSections();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async (event) => {
    event.preventDefault();

    if (!addGradeId || !addName.trim()) {
      showMessage("اختر الصف واكتب اسم الشعبة.", "error");
      return;
    }

    try {
      setSaving(true);
      const result = await requestJson(SECTIONS_API, {
        method: "POST",
        body: JSON.stringify({
          grade_id: Number(addGradeId),
          name: addName.trim(),
        }),
      });
      setAddOpen(false);
      setAddName("");
      showMessage(result.message || "تمت إضافة الشعبة.");
      await loadSections();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openRename = (section) => {
    setRenameSection(section);
    setRenameValue(section.name || "");
  };

  const handleRename = async (event) => {
    event.preventDefault();

    if (!renameSection || !renameValue.trim()) {
      showMessage("اسم الشعبة مطلوب.", "error");
      return;
    }

    try {
      setSaving(true);
      const result = await requestJson(
        `${SECTIONS_API}/${renameSection.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ name: renameValue.trim() }),
        }
      );
      setRenameSection(null);
      showMessage(result.message || "تم تعديل اسم الشعبة.");
      await loadSections();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const studentsForSource = useMemo(() => {
    if (!transferSource) return [];
    const query = normalize(transferSearch);

    return data.students.filter((student) => {
      const sameSection = Number(student.section_id) === Number(transferSource.id);
      const matchesSearch = !query || normalize(student.full_name).includes(query);
      return sameSection && matchesSearch;
    });
  }, [data.students, transferSearch, transferSource]);

  const transferTargets = useMemo(() => {
    if (!transferSource) return [];
    return data.sections.filter(
      (section) =>
        Number(section.grade_id) === Number(transferSource.grade_id) &&
        Number(section.id) !== Number(transferSource.id)
    );
  }, [data.sections, transferSource]);

  const openTransfer = (section) => {
    const targets = data.sections.filter(
      (candidate) =>
        Number(candidate.grade_id) === Number(section.grade_id) &&
        Number(candidate.id) !== Number(section.id)
    );

    setTransferSource(section);
    setTransferTargetId(targets[0] ? String(targets[0].id) : "");
    setSelectedStudentIds([]);
    setTransferSearch("");
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = studentsForSource.map((student) => Number(student.id));
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedStudentIds.includes(id));

    setSelectedStudentIds((current) => {
      if (allSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  };

  const handleTransfer = async () => {
    if (!transferSource || !transferTargetId) {
      showMessage("اختر الشعبة التي سينتقل إليها الطلاب.", "error");
      return;
    }

    if (!selectedStudentIds.length) {
      showMessage("حدد طالبًا واحدًا على الأقل للنقل.", "error");
      return;
    }

    const target = transferTargets.find(
      (section) => String(section.id) === transferTargetId
    );

    const confirmed = window.confirm(
      `سيتم نقل ${selectedStudentIds.length} طالب من شعبة ${transferSource.name} إلى شعبة ${target?.name || "المختارة"}. هل تريد المتابعة؟`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const result = await requestJson(`${SECTIONS_API}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          from_section_id: Number(transferSource.id),
          to_section_id: Number(transferTargetId),
          student_ids: selectedStudentIds,
        }),
      });
      setTransferSource(null);
      setSelectedStudentIds([]);
      showMessage(result.message || "تم نقل الطلاب.");
      await loadSections();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="student-sections-page" dir="rtl">
      <section className="student-sections-header">
        <div>
          <span className="student-management-eyebrow">سجل الطلاب / الشعب</span>
          <h1>إدارة الشعب</h1>
          <p>
            أضف الشعب وعدّل أسماءها وانقل الطلاب بين شعب الصف نفسه مع الحفاظ
            على سجل الطالب الحالي.
          </p>
        </div>

        <div className="student-sections-header-actions">
          <button
            type="button"
            className="student-sections-secondary-action"
            onClick={handleInitializePlan}
            disabled={saving}
          >
            تطبيق التوزيع المعتمد
          </button>
          <button
            type="button"
            className="student-sections-primary-action"
            onClick={() => setAddOpen(true)}
          >
            + إضافة شعبة
          </button>
        </div>
      </section>

      <section className="student-sections-plan-note">
        <div>
          <strong>الدوام الصباحي</strong>
          <span>الأول والثاني الابتدائي: أ، ب، ت</span>
        </div>
        <div>
          <strong>بقية الصفوف</strong>
          <span>الثالث إلى السادس + الأول والثاني المتوسط: أ فقط</span>
        </div>
        <small>
          زر «تطبيق التوزيع المعتمد» ينشئ الشعب الناقصة فقط ولا يحذف الشعب
          الموجودة ولا ينقل أي طالب تلقائيًا.
        </small>
      </section>

      {message && (
        <div className={`student-sections-message ${messageType}`} role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="إغلاق الرسالة">
            ×
          </button>
        </div>
      )}

      <section className="student-sections-metrics">
        <article>
          <span>السنة الدراسية</span>
          <strong>{data.academic_year || "السنة الحالية"}</strong>
        </article>
        <article>
          <span>عدد الشعب</span>
          <strong>{totalSections}</strong>
        </article>
        <article>
          <span>الطلاب الموزعون</span>
          <strong>{totalStudents}</strong>
        </article>
      </section>

      <section className="student-sections-toolbar">
        <div>
          <label htmlFor="student-sections-grade-filter">الصف</label>
          <select
            id="student-sections-grade-filter"
            value={gradeFilter}
            onChange={(event) => setGradeFilter(event.target.value)}
          >
            <option value="الكل">كل الصفوف</option>
            {data.grades.map((grade) => (
              <option key={grade.id} value={String(grade.id)}>
                {grade.display_name || grade.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={loadSections} disabled={loading}>
          ↻ {loading ? "جاري التحديث..." : "تحديث"}
        </button>
      </section>

      {loading ? (
        <div className="student-sections-state">جاري تحميل الشعب والطلاب...</div>
      ) : (
        <section className="student-sections-grade-grid">
          {sectionsByGrade.map(({ grade, sections }) => (
            <article className="student-sections-grade-card" key={grade.id}>
              <header>
                <div>
                  <small>الصف</small>
                  <h2>{grade.display_name || grade.name}</h2>
                </div>
                <span>{sections.length} شعبة</span>
              </header>

              <div className="student-sections-list">
                {sections.length ? (
                  sections.map((section) => (
                    <div className="student-section-row" key={section.id}>
                      <div className="student-section-name">
                        <span>شعبة</span>
                        <strong>{section.name}</strong>
                      </div>
                      <div className="student-section-count">
                        <strong>{section.student_count || 0}</strong>
                        <span>طالب</span>
                      </div>
                      <div className="student-section-actions">
                        <button type="button" onClick={() => openRename(section)}>
                          تعديل الاسم
                        </button>
                        <button
                          type="button"
                          className="transfer"
                          onClick={() => openTransfer(section)}
                        >
                          نقل الطلاب
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="student-sections-empty">
                    لا توجد شعبة مسجلة لهذا الصف بعد.
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {addOpen && (
        <Modal
          title="إضافة شعبة"
          description="اختر الصف واكتب اسم الشعبة الجديدة."
          onClose={() => setAddOpen(false)}
        >
          <form className="student-sections-form" onSubmit={handleAddSection}>
            <label>
              <span>الصف</span>
              <select
                value={addGradeId}
                onChange={(event) => setAddGradeId(event.target.value)}
                required
              >
                {data.grades.map((grade) => (
                  <option key={grade.id} value={String(grade.id)}>
                    {grade.display_name || grade.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>اسم الشعبة</span>
              <input
                value={addName}
                onChange={(event) => setAddName(event.target.value)}
                placeholder="مثال: أ"
                maxLength={20}
                autoFocus
                required
              />
            </label>
            <div className="student-sections-form-actions">
              <button type="button" onClick={() => setAddOpen(false)}>
                إلغاء
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "جاري الحفظ..." : "إضافة الشعبة"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renameSection && (
        <Modal
          title="تعديل اسم الشعبة"
          description={`${renameSection.grade_name || "الصف"} — الاسم الحالي: ${renameSection.name}`}
          onClose={() => setRenameSection(null)}
        >
          <form className="student-sections-form" onSubmit={handleRename}>
            <label>
              <span>الاسم الجديد</span>
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={20}
                autoFocus
                required
              />
            </label>
            <div className="student-sections-form-actions">
              <button type="button" onClick={() => setRenameSection(null)}>
                إلغاء
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ الاسم"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {transferSource && (
        <Modal
          title={`نقل طلاب شعبة ${transferSource.name}`}
          description={transferSource.grade_name || "اختر الطلاب والشعبة الجديدة"}
          onClose={() => setTransferSource(null)}
          wide
        >
          <div className="student-transfer-layout">
            <aside className="student-transfer-destination">
              <label>
                <span>النقل إلى</span>
                <select
                  value={transferTargetId}
                  onChange={(event) => setTransferTargetId(event.target.value)}
                >
                  {transferTargets.length ? (
                    transferTargets.map((section) => (
                      <option key={section.id} value={String(section.id)}>
                        شعبة {section.name}
                      </option>
                    ))
                  ) : (
                    <option value="">لا توجد شعبة أخرى في هذا الصف</option>
                  )}
                </select>
              </label>

              <div className="student-transfer-summary">
                <span>المحدد للنقل</span>
                <strong>{selectedStudentIds.length}</strong>
                <small>طالب</small>
              </div>

              <button
                type="button"
                className="student-transfer-submit"
                onClick={handleTransfer}
                disabled={saving || !transferTargetId || !selectedStudentIds.length}
              >
                {saving ? "جاري النقل..." : "نقل الطلاب المحددين"}
              </button>
            </aside>

            <div className="student-transfer-students">
              <div className="student-transfer-search-row">
                <input
                  value={transferSearch}
                  onChange={(event) => setTransferSearch(event.target.value)}
                  placeholder="بحث باسم الطالب..."
                />
                <button type="button" onClick={toggleAllVisible}>
                  تحديد/إلغاء الكل
                </button>
              </div>

              <div className="student-transfer-list">
                {studentsForSource.length ? (
                  studentsForSource.map((student) => {
                    const studentId = Number(student.id);
                    const checked = selectedStudentIds.includes(studentId);

                    return (
                      <label
                        className={`student-transfer-student ${checked ? "selected" : ""}`}
                        key={student.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(studentId)}
                        />
                        <span>
                          <strong>{student.full_name}</strong>
                          <small>{student.gender || "طالب"}</small>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="student-sections-empty">
                    لا يوجد طلاب في هذه الشعبة أو لا توجد نتائج مطابقة.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}