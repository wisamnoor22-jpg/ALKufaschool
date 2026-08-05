const db = require("../db");
const {
  createDeletionArchive,
} = require("../services/deletionArchiveService");

const syncStudentFeesForGrade = async (
  client,
  grade,
  academicYear,
  totalFee
) => {
  await client.query(
    `
    UPDATE student_fees sf
    SET total_fee = $1
    FROM students s
    WHERE s.id = sf.student_id
      AND LOWER(TRIM(COALESCE(s.grade, ''))) =
          LOWER(TRIM($2))
      AND TRIM(sf.academic_year) = TRIM($3)
    `,
    [Number(totalFee), grade, academicYear]
  );
};

exports.getGradeFees = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM grade_fees
      ORDER BY academic_year DESC, id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "حدث خطأ أثناء جلب أقساط المراحل",
    });
  }
};

exports.addGradeFee = async (req, res) => {
  const client = await db.connect();

  try {
    const { grade, academic_year, total_fee } =
      req.body;

    if (!grade?.trim() || !academic_year?.trim()) {
      return res.status(400).json({
        message:
          "المرحلة والسنة الدراسية مطلوبتان",
      });
    }

    if (!total_fee || Number(total_fee) <= 0) {
      return res.status(400).json({
        message: "مبلغ القسط غير صحيح",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO grade_fees
      (
        grade,
        academic_year,
        total_fee
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        grade.trim(),
        academic_year.trim(),
        Number(total_fee),
      ]
    );

    await syncStudentFeesForGrade(
      client,
      grade.trim(),
      academic_year.trim(),
      Number(total_fee)
    );

    await client.query("COMMIT");

    res.status(201).json({
      message:
        "تمت إضافة قسط المرحلة وتحديث أقساط الطلاب بنجاح",
      gradeFee: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "تم تسجيل قسط لهذه المرحلة في هذه السنة مسبقًا",
      });
    }

    res.status(500).json({
      message:
        "حدث خطأ أثناء إضافة قسط المرحلة",
    });
  } finally {
    client.release();
  }
};

exports.updateGradeFee = async (req, res) => {
  const client = await db.connect();

  try {
    const { id } = req.params;
    const { grade, academic_year, total_fee } =
      req.body;

    if (!grade?.trim() || !academic_year?.trim()) {
      return res.status(400).json({
        message:
          "المرحلة والسنة الدراسية مطلوبتان",
      });
    }

    if (!total_fee || Number(total_fee) <= 0) {
      return res.status(400).json({
        message: "مبلغ القسط غير صحيح",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT *
      FROM grade_fees
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "قسط المرحلة غير موجود",
      });
    }

    const result = await client.query(
      `
      UPDATE grade_fees
      SET
        grade = $1,
        academic_year = $2,
        total_fee = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        grade.trim(),
        academic_year.trim(),
        Number(total_fee),
        id,
      ]
    );

    await syncStudentFeesForGrade(
      client,
      grade.trim(),
      academic_year.trim(),
      Number(total_fee)
    );

    await client.query("COMMIT");

    res.json({
      message:
        "تم تعديل القسط وتحديث وصول الطلاب بنجاح",
      gradeFee: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "تم تسجيل قسط لهذه المرحلة في هذه السنة مسبقًا",
      });
    }

    res.status(500).json({
      message:
        "حدث خطأ أثناء تعديل قسط المرحلة",
    });
  } finally {
    client.release();
  }
};

exports.deleteGradeFee = async (req, res) => {
  const client = await db.connect();

  try {
    const id = Number(req.params.id);
    const deletionReason =
      typeof req.body?.deletion_reason === "string"
        ? req.body.deletion_reason.trim()
        : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم الرسم الدراسي غير صحيح",
      });
    }

    if (deletionReason.length > 500) {
      return res.status(400).json({
        message: "سبب حذف الرسم يجب ألا يتجاوز 500 حرف",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM grade_fees
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "رسم المرحلة غير موجود",
      });
    }

    const gradeFee = existingResult.rows[0];

    const archiveRecord = await createDeletionArchive(client, {
      entityType: "grade_fee",
      entityId: id,
      entityName: `${gradeFee.grade} - ${gradeFee.academic_year}`,
      deletionReason: deletionReason || "حذف رسم دراسي.",
      snapshotData: {
        grade_fee: gradeFee,
      },
      metadata: {
        schema_version: 1,
        source: "grade_fee_deletion",
      },
    });

    const result = await client.query(
      `
      DELETE FROM grade_fees
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "قسط المرحلة غير موجود",
      });
    }

    await client.query("COMMIT");

    res.json({
      message: "تم حذف قسط المرحلة بنجاح",
      gradeFee: result.rows[0],
      archive_id: archiveRecord.id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      message:
        "حدث خطأ أثناء حذف قسط المرحلة",
    });
  } finally {
    client.release();
  }
};
