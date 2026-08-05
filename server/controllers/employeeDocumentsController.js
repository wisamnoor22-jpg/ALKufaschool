const db = require("../db");
const path = require("path");
const {
  createDeletionArchive,
} = require("../services/deletionArchiveService");

exports.uploadDocument = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { document_type, document_name } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "يرجى اختيار ملف.",
      });
    }

    const result = await db.query(
      `INSERT INTO employee_documents
      (
        employee_id,
        document_type,
        document_name,
        file_name,
        file_path,
        file_size
      )
      VALUES
      ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        employeeId,
        document_type,
        document_name || null,
        req.file.filename,
        path.relative(process.cwd(), req.file.path),
        req.file.size,
      ]
    );

    res.status(201).json({
      message: "تم رفع المستند بنجاح",
      document: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء رفع المستند",
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await db.query(
      `SELECT *
       FROM employee_documents
       WHERE employee_id = $1
       ORDER BY uploaded_at DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب المستندات",
    });
  }
};

exports.deleteDocument = async (req, res) => {
  const client = await db.connect();

  try {
    const id = Number(req.params.id);
    const deletionReason =
      typeof req.body?.deletion_reason === "string"
        ? req.body.deletion_reason.trim()
        : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم المستند غير صحيح",
      });
    }

    if (deletionReason.length > 500) {
      return res.status(400).json({
        message: "سبب حذف المستند يجب ألا يتجاوز 500 حرف",
      });
    }

    await client.query("BEGIN");

    const documentResult = await client.query(
      `SELECT
         ed.*,
         e.full_name AS employee_name,
         e.employee_code
       FROM employee_documents ed
       JOIN employees e ON e.id = ed.employee_id
       WHERE ed.id = $1
       FOR UPDATE OF ed`,
      [id]
    );

    if (documentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "المستند غير موجود",
      });
    }

    const {
      employee_name: employeeName,
      employee_code: employeeCode,
      ...document
    } = documentResult.rows[0];

    const archiveRecord = await createDeletionArchive(client, {
      entityType: "employee_document",
      entityId: id,
      entityName:
        document.document_name || document.document_type || document.file_name,
      deletionReason: deletionReason || "حذف مستند الموظف.",
      snapshotData: {
        employee_document: document,
        employee_reference: {
          id: document.employee_id,
          employee_code: employeeCode,
          full_name: employeeName,
        },
      },
      metadata: {
        schema_version: 1,
        source: "employee_document_deletion",
        document_file_retained: true,
      },
    });

    const deletedDocument = await client.query(
      "DELETE FROM employee_documents WHERE id = $1 RETURNING *",
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: "تم حذف المستند وأرشفة بياناته",
      document: deletedDocument.rows[0],
      archive_id: archiveRecord.id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف المستند",
    });
  } finally {
    client.release();
  }
};
