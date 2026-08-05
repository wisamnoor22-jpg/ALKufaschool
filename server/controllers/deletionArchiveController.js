const db = require("../db");

const parseDateFilter = (value) => {
  if (!value) return null;

  const normalized = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
};

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
      return res.status(400).json({
        message: "صيغة التاريخ غير صحيحة",
      });
    }

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(
        entity_name ILIKE $${values.length}
        OR entity_id ILIKE $${values.length}
        OR COALESCE(deletion_reason, '') ILIKE $${values.length}
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

    values.push(limit);

    const itemsResult = await db.query(
      `SELECT
         id,
         entity_type,
         entity_id,
         entity_name,
         deletion_reason,
         deleted_by,
         deleted_at,
         metadata
       FROM deletion_archive
       ${whereClause}
       ORDER BY deleted_at DESC, id DESC
       LIMIT $${values.length}`,
      values
    );

    const typesResult = await db.query(
      `SELECT DISTINCT entity_type
       FROM deletion_archive
       ORDER BY entity_type`
    );

    return res.json({
      items: itemsResult.rows,
      total: countResult.rows[0].total,
      entity_types: typesResult.rows.map((row) => row.entity_type),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب سجل المحذوفات",
    });
  }
};

exports.getArchiveCount = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*)::integer AS total FROM deletion_archive"
    );

    return res.json({ total: result.rows[0].total });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب عدد العناصر المحذوفة",
    });
  }
};

exports.getArchiveItemById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم سجل المحذوفات غير صحيح",
      });
    }

    const result = await db.query(
      `SELECT *
       FROM deletion_archive
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "سجل المحذوفات غير موجود",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب تفاصيل العنصر المحذوف",
    });
  }
};
