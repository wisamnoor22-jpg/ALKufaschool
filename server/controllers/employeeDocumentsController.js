const db = require("../db");
const path = require("path");

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
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM employee_documents WHERE id = $1",
      [id]
    );

    res.json({
      message: "تم حذف المستند",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف المستند",
    });
  }
};
