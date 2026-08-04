import { useState } from "react";
import BackButton from "../components/common/BackButton";
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

  const [grade, setGrade] = useState(GRADES[0]);
  const [section, setSection] = useState(SECTIONS[0]);
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [maxScore, setMaxScore] = useState("100");

  return (
    <main className="results-page" dir="rtl">
      <section className="results-container">
        <header className="results-header">
          <BackButton />

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
              onClick={() => setPage("add")}
            >
              <div className="results-card-icon">+</div>

              <div className="results-card-content">
                <h2>إضافة درجات</h2>
                <p>
                  إنشاء امتحان جديد وإدخال درجات الطلاب ثم حفظها.
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
                <button type="button" className="results-primary-button">
                  عرض الدرجات
                </button>
              </div>
            </section>

            <section className="results-panel results-empty">
              لا توجد درجات معروضة حاليًا
            </section>
          </section>
        )}

        {page === "add" && (
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
                <button type="button" className="results-primary-button">
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