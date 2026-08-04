const express = require("express");
const pool = require("../db");

const router = express.Router();

const DEFAULT_EXAM_TYPES = ["يومي", "شهري", "نصف السنة"];

const initializeResultsTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      grade VARCHAR(100) NOT NULL,
      section VARCHAR(20) NOT NULL,
      subject VARCHAR(120) NOT NULL,
      exam_type_id INTEGER NOT NULL REFERENCES exam_types(id),
      exam_name VARCHAR(150) NOT NULL,
      exam_date DATE NOT NULL,
      max_score NUMERIC(7, 2) NOT NULL CHECK (max_score > 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE (
        grade,
        section,
        subject,
        exam_type_id,
        exam_name,
        exam_date
      )
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_scores (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL
        REFERENCES exams(id)
        ON DELETE CASCADE,

      student_id INTEGER NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

      score NUMERIC(7, 2),
      note VARCHAR(250) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE (exam_id, student_id)
    )
  `);

  for (const examType of DEFAULT_EXAM_TYPES) {
    await pool.query(
      `
        INSERT INTO exam_types (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `,
      [examType]
    );
  }
};

initializeResultsTables().catch((error) => {
  console.error("Results tables initialization failed:", error);
});

router.get("/exam-types", async (req, res, next) => {
  try {
    await initializeResultsTables();

    const result = await pool.query(`
      SELECT id, name
      FROM exam_types
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post("/exam-types", async (req, res, next) => {
  try {
    await initializeResultsTables();

    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        message: "يرجى إدخال اسم نوع الامتحان",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO exam_types (name)
        VALUES ($1)

        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name

        RETURNING id, name
      `,
      [name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get("/students", async (req, res, next) => {
  try {
    const grade = String(req.query.grade || "").trim();
    const section = String(req.query.section || "").trim();

    if (!grade || !section) {
      return res.status(400).json({
        message: "يرجى اختيار الصف والشعبة",
      });
    }

    const result = await pool.query(
      `
        SELECT
          s.id,
          s.full_name,
          s.gender,
          current_enrollment.grade,
          current_enrollment.section,
          current_enrollment.academic_year

        FROM students s

        LEFT JOIN LATERAL (
          SELECT
            se.grade,
            se.section,
            se.academic_year

          FROM student_enrollments se

          WHERE se.student_id = s.id

          ORDER BY se.id DESC
          LIMIT 1
        ) current_enrollment ON TRUE

        WHERE current_enrollment.grade = $1
          AND current_enrollment.section = $2

        ORDER BY s.full_name ASC
      `,
      [grade, section]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get("/exam", async (req, res, next) => {
  try {
    await initializeResultsTables();

    const grade = String(req.query.grade || "").trim();
    const section = String(req.query.section || "").trim();
    const subject = String(req.query.subject || "").trim();
    const examTypeId = Number(req.query.examTypeId);
    const examName = String(req.query.examName || "").trim();
    const examDate = String(req.query.examDate || "").trim();

    if (
      !grade ||
      !section ||
      !subject ||
      !examTypeId ||
      !examName ||
      !examDate
    ) {
      return res.status(400).json({
        message: "بيانات الامتحان غير مكتملة",
      });
    }

    const examResult = await pool.query(
      `
        SELECT
          e.id,
          e.grade,
          e.section,
          e.subject,
          e.exam_name,
          e.exam_date,
          e.max_score,
          et.id AS exam_type_id,
          et.name AS exam_type_name

        FROM exams e

        JOIN exam_types et
          ON et.id = e.exam_type_id

        WHERE e.grade = $1
          AND e.section = $2
          AND e.subject = $3
          AND e.exam_type_id = $4
          AND e.exam_name = $5
          AND e.exam_date = $6

        LIMIT 1
      `,
      [
        grade,
        section,
        subject,
        examTypeId,
        examName,
        examDate,
      ]
    );

    if (examResult.rows.length === 0) {
      return res.json({
        exam: null,
        scores: [],
      });
    }

    const exam = examResult.rows[0];

    const scoresResult = await pool.query(
      `
        SELECT
          student_id,
          score,
          note

        FROM exam_scores

        WHERE exam_id = $1
      `,
      [exam.id]
    );

    res.json({
      exam,
      scores: scoresResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/save", async (req, res, next) => {
  const client = await pool.connect();

  try {
    await initializeResultsTables();

    const {
      grade,
      section,
      subject,
      examTypeId,
      examName,
      examDate,
      maxScore,
      scores,
    } = req.body;

    const normalizedExamTypeId = Number(examTypeId);
    const normalizedMaxScore = Number(maxScore);

    if (
      !grade ||
      !section ||
      !subject ||
      !normalizedExamTypeId ||
      !String(examName || "").trim() ||
      !examDate ||
      !Number.isFinite(normalizedMaxScore) ||
      normalizedMaxScore <= 0
    ) {
      return res.status(400).json({
        message: "يرجى إكمال بيانات الامتحان بصورة صحيحة",
      });
    }

    if (!Array.isArray(scores)) {
      return res.status(400).json({
        message: "قائمة الدرجات غير صحيحة",
      });
    }

    const invalidScore = scores.find((item) => {
      if (item.score === null || item.score === "") {
        return false;
      }

      const score = Number(item.score);

      return (
        !Number.isFinite(score) ||
        score < 0 ||
        score > normalizedMaxScore
      );
    });

    if (invalidScore) {
      return res.status(400).json({
        message: "توجد درجة أكبر من الدرجة الكلية أو أقل من صفر",
      });
    }

    await client.query("BEGIN");

    const examResult = await client.query(
      `
        INSERT INTO exams (
          grade,
          section,
          subject,
          exam_type_id,
          exam_name,
          exam_date,
          max_score
        )

        VALUES ($1, $2, $3, $4, $5, $6, $7)

        ON CONFLICT (
          grade,
          section,
          subject,
          exam_type_id,
          exam_name,
          exam_date
        )

        DO UPDATE SET
          max_score = EXCLUDED.max_score,
          updated_at = CURRENT_TIMESTAMP

        RETURNING id
      `,
      [
        String(grade).trim(),
        String(section).trim(),
        String(subject).trim(),
        normalizedExamTypeId,
        String(examName).trim(),
        examDate,
        normalizedMaxScore,
      ]
    );

    const examId = examResult.rows[0].id;

    for (const item of scores) {
      const studentId = Number(item.studentId);

      const score =
        item.score === null || item.score === ""
          ? null
          : Number(item.score);

      const note = String(item.note || "").trim();

      await client.query(
        `
          INSERT INTO exam_scores (
            exam_id,
            student_id,
            score,
            note
          )

          VALUES ($1, $2, $3, $4)

          ON CONFLICT (exam_id, student_id)

          DO UPDATE SET
            score = EXCLUDED.score,
            note = EXCLUDED.note,
            updated_at = CURRENT_TIMESTAMP
        `,
        [examId, studentId, score, note]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "تم حفظ الدرجات بنجاح",
      examId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;