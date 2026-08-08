const db = require("../db");

const parseDateFilter = (value) => {
  if (!value) return null;

  const normalized = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
};

const isTransferType = (entityType) =>
  String(entityType || "") === "student_section_transfer";

exports.getArchiveItems = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim().slice(0, 120);
    const entityType = String(req.query.entity_type || "").trim().slice(0, 80);
    const dateFrom = parseDateFilter(req.query.date_from);
    const dateTo = parseDateFilter(req.query.date_to);
    const requestedLimit = Number(req.query.limit || 200);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 500)
      : 200;

    if (dateFrom === undefined || dateTo === undefined) {
      return res.status(400).json({ message: "صيغة التاريخ غير صحيحة" });
    }

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(
        entity_name ILIKE $${values.length}
        OR entity_id ILIKE $${values.length}
        OR COALESCE(deletion_reason, '') ILIKE $${values.length}
        OR COALESCE(metadata::text, '') ILIKE $${values.length}
      )`);
    }

    if (entityType) {
      values.push(entityType);
      conditions.push(`entity_type = $${values.length}`);
    }

    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(`deleted_at >= $${values.length}::date`);
    }

    if (dateTo) {
      values.push(dateTo);
      conditions.push(`deleted_at < ($${values.length}::date + INTERVAL '1 day')`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await db.query(
      `SELECT COUNT(*)::integer AS total
       FROM deletion_archive
       ${whereClause}`,
      values
    );

    const itemValues = [...values, limit];
    const itemsResult = await db.query(
      `SELECT
         id,
         id AS source_id,
         CASE
           WHEN entity_type = 'student_section_transfer' THEN 'transfer'
           ELSE 'deletion'
         END AS record_kind,
         entity_type,
         entity_id,
         entity_name,
         deletion_reason AS action_description,
         deletion_reason,
         deleted_by,
         deleted_at,
         metadata
       FROM deletion_archive
       ${whereClause}
       ORDER BY deleted_at DESC, id DESC
       LIMIT $${itemValues.length}`,
      itemValues
    );

    const typesResult = await db.query(
      `SELECT DISTINCT entity_type
       FROM deletion_archive
       ORDER BY entity_type`
    );

    return res.json({
      items: itemsResult.rows,
      total: Number(countResult.rows[0]?.total || 0),
      entity_types: typesResult.rows.map((row) => row.entity_type),
    });
  } catch (error) {
    console.error("getArchiveItems error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب سجل المحذوفات والتنقلات",
    });
  }
};

exports.getArchiveCount = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*)::integer AS total FROM deletion_archive"
    );

    return res.json({ total: Number(result.rows[0]?.total || 0) });
  } catch (error) {
    console.error("getArchiveCount error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب عدد سجلات الأرشيف",
    });
  }
};

exports.getArchiveItemById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "رقم السجل غير صحيح" });
    }

    const result = await db.query(
      `SELECT *
       FROM deletion_archive
       WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "السجل غير موجود" });
    }

    const row = result.rows[0];
    const transfer = isTransferType(row.entity_type);
    const metadata = row.metadata || {};

    if (transfer) {
      return res.json({
        ...row,
        source_id: row.id,
        record_kind: "transfer",
        action_description:
          row.deletion_reason ||
          `نقل من شعبة ${metadata.from_section_name || "غير محددة"} إلى شعبة ${metadata.to_section_name || "غير محددة"}`,
        snapshot_data: {
          transfer: {
            student_id: metadata.student_id || row.entity_id,
            student_name: metadata.student_name || row.entity_name,
            academic_year: metadata.academic_year,
            grade_name: metadata.grade_name,
            from_section_id: metadata.from_section_id,
            from_section_name: metadata.from_section_name,
            to_section_id: metadata.to_section_id,
            to_section_name: metadata.to_section_name,
            transfer_reason: metadata.transfer_reason || row.deletion_reason,
            transfer_source: metadata.transfer_source,
            transferred_by: metadata.transferred_by || row.deleted_by,
            transferred_at: metadata.transferred_at || row.deleted_at,
          },
        },
      });
    }

    return res.json({
      ...row,
      source_id: row.id,
      record_kind: "deletion",
      action_description: row.deletion_reason || "حذف من النظام",
    });
  } catch (error) {
    console.error("getArchiveItemById error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب تفاصيل السجل",
    });
  }
};