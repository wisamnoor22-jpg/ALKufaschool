import { useRef, useState } from "react";
import "../styles/Results.css";

const GRADES = [
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
];

const SECTIONS = ["أ", "ب", "ج", "د"];

const EXAM_TYPES = ["يومي", "شهري", "نصف السنة"];

export default function Results() {
  const [page, setPage] = useState("home");
  const [addMethod, setAddMethod] = useState("");

  const excelInputRef = useRef(null);
  const wordInputRef = useRef(null);

  const [grade, setGrade] = useState(GRADES[0]);
  const [section, setSection] = useState(SECTIONS[0]);
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [maxScore, setMaxScore] = useState("100");

  const openAddGrades = () => {
    setPage("add");
    setAddMethod("");
  };

  const handleExcelFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    alert(`تم اختيار ملف Excel:\n${file.name}`);
  };

  const handleWordFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    alert(`تم اختيار ملف Word:\n${file.name}`);
  };

  return (
    <main className="results-page" dir="rtl">
      <section className="results-container">
        <header className="results-header">
          <div>
            <h1>إدارة الدرجات</h1>
            <p>عرض الدرجات أو إضافة درجات جديدة</p>
          </div>
        </header>

        {page === "home" && (
          <section className="results-cards-grid">
            <button
              type="button"
              className="results-home-card results-home-card-blue"
              onClick={() => setPage("view")}
            >
              <div className="results-card-icon">د</div>

              <div className="results-card-content">
                <h2>الدرجات</h2>
                <p>
                  عرض درجات الطلاب المحفوظة حسب الصف والشعبة
                  والمادة.
                </p>
              </div>

              <span className="results-card-arrow">←</span>
            </button>

            <button
              type="button"
              className="results-home-card results-home-card-green"
              onClick={openAddGrades}
            >
              <div className="results-card-icon">+</div>

              <div className="results-card-content">
                <h2>إضافة درجات</h2>
                <p>
                  إضافة الدرجات يدويًا أو رفعها من ملف Excel أو
                  Word.
                </p>
              </div>

              <span className="results-card-arrow">←</span>
            </button>
          </section>
        )}

        {page === "view" && (
          <section>
            <div className="results-subheader">
              <button
                type="button"
                className="results-back-button"
                onClick={() => setPage("home")}
              >
                رجوع
              </button>

              <div>
                <h2>الدرجات</h2>
                <p>عرض الدرجات المحفوظة للطلاب</p>
              </div>
            </div>

            <section className="results-panel results-form-grid">
              <label className="results-field">
                <span>الصف</span>

                <select
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                >
                  {GRADES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="results-field">
                <span>الشعبة</span>

                <select
                  value={section}
                  onChange={(event) =>
                    setSection(event.target.value)
                  }
                >
                  {SECTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="results-field">
                <span>المادة</span>

                <input
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="اسم المادة"
                />
              </label>

              <div className="results-action-box">
                <button
                  type="button"
                  className="results-primary-button"
                >
                  عرض الدرجات
                </button>
              </div>
            </section>

            <section className="results-panel results-empty">
              لا توجد درجات معروضة حاليًا
            </section>
          </section>
        )}

        {page === "add" && addMethod === "" && (
          <section>
            <div className="results-subheader">
              <button
                type="button"
                className="results-back-button"
                onClick={() => setPage("home")}
              >
                رجوع
              </button>

              <div>
                <h2>إضافة درجات</h2>
                <p>اختر طريقة إضافة الدرجات</p>
              </div>
            </div>

            <section className="results-methods-grid">
              <button
                type="button"
                className="results-method-card results-method-excel"
                onClick={() => excelInputRef.current?.click()}
              >
                <div className="results-method-icon">X</div>

                <div className="results-method-content">
                  <h3>رفع Excel</h3>
                  <p>
                    رفع ملف درجات بصيغة XLS أو XLSX ومعاينته قبل
                    الحفظ.
                  </p>
                </div>

                <span className="results-card-arrow">←</span>
              </button>

              <button
                type="button"
                className="results-method-card results-method-word"
                onClick={() => wordInputRef.current?.click()}
              >
                <div className="results-method-icon">W</div>

                <div className="results-method-content">
                  <h3>رفع Word</h3>
                  <p>
                    رفع ملف درجات بصيغة DOC أو DOCX ومعاينته قبل
                    الحفظ.
                  </p>
                </div>

                <span className="results-card-arrow">←</span>
              </button>

              <button
                type="button"
                className="results-method-card results-method-manual"
                onClick={() => setAddMethod("manual")}
              >
                <div className="results-method-icon">+</div>

                <div className="results-method-content">
                  <h3>إدخال يدوي</h3>
                  <p>
                    اختيار الصف والشعبة ثم إدخال درجات الطلاب
                    مباشرة.
                  </p>
                </div>

                <span className="results-card-arrow">←</span>
              </button>
            </section>

            <input
              ref={excelInputRef}
              className="results-hidden-input"
              type="file"
              accept=".xls,.xlsx"
              onChange={handleExcelFile}
            />

            <input
              ref={wordInputRef}
              className="results-hidden-input"
              type="file"
              accept=".doc,.docx"
              onChange={handleWordFile}
            />
          </section>
        )}

        {page === "add" && addMethod === "manual" && (
          <section>
            <div className="results-subheader">
              <button
                type="button"
                className="results-back-button"
                onClick={() => setAddMethod("")}
              >
                رجوع
              </button>

              <div>
                <h2>الإدخال اليدوي</h2>
                <p>أدخل بيانات الامتحان ثم اعرض الطلاب</p>
              </div>
            </div>

            <section className="results-panel results-form-grid">
              <label className="results-field">
                <span>الصف</span>

                <select
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                >
                  {GRADES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="results-field">
                <span>الشعبة</span>

                <select
                  value={section}
                  onChange={(event) =>
                    setSection(event.target.value)
                  }
                >
                  {SECTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="results-field">
                <span>المادة</span>

                <input
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="اسم المادة"
                />
              </label>

              <label className="results-field">
                <span>نوع الامتحان</span>

                <select
                  value={examType}
                  onChange={(event) =>
                    setExamType(event.target.value)
                  }
                >
                  {EXAM_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="results-field">
                <span>اسم الامتحان</span>

                <input
                  value={examName}
                  onChange={(event) =>
                    setExamName(event.target.value)
                  }
                  placeholder="مثال: امتحان الشهر الأول"
                />
              </label>

              <label className="results-field">
                <span>تاريخ الامتحان</span>

                <input
                  type="date"
                  value={examDate}
                  onChange={(event) =>
                    setExamDate(event.target.value)
                  }
                />
              </label>

              <label className="results-field">
                <span>الدرجة الكلية</span>

                <input
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(event) =>
                    setMaxScore(event.target.value)
                  }
                />
              </label>

              <div className="results-action-box">
                <button
                  type="button"
                  className="results-primary-button"
                >
                  عرض الطلاب
                </button>
              </div>
            </section>

            <section className="results-panel results-empty">
              ستظهر قائمة الطلاب هنا بعد اختيار بيانات الامتحان
            </section>
          </section>
        )}
      </section>
    </main>
  );
}
