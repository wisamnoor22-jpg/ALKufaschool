const SENSITIVE_KEY_PATTERN =
  /(password|passcode|secret|token|api[_-]?key|authorization|credential|private[_-]?key)/i;

const sanitizeArchiveData = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeArchiveData(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((sanitized, [key, item]) => {
      if (!SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = sanitizeArchiveData(item);
      }

      return sanitized;
    }, {});
  }

  return value;
};

const createDeletionArchive = async (
  client,
  {
    entityType,
    entityId,
    entityName,
    deletionReason,
    deletedBy = null,
    snapshotData,
    metadata = {},
  }
) => {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("A PostgreSQL client is required");
  }

  if (
    !entityType ||
    entityId === undefined ||
    entityId === null ||
    !entityName
  ) {
    throw new TypeError("Archive entity type, id and name are required");
  }

  const sanitizedSnapshot = sanitizeArchiveData(snapshotData || {});
  const sanitizedMetadata = sanitizeArchiveData(metadata || {});

  const result = await client.query(
    `INSERT INTO deletion_archive (
       entity_type,
       entity_id,
       entity_name,
       deletion_reason,
       deleted_by,
       snapshot_data,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     RETURNING id, deleted_at`,
    [
      String(entityType),
      String(entityId),
      String(entityName),
      deletionReason ? String(deletionReason) : null,
      deletedBy ? String(deletedBy) : null,
      JSON.stringify(sanitizedSnapshot),
      JSON.stringify(sanitizedMetadata),
    ]
  );

  return result.rows[0];
};

module.exports = {
  createDeletionArchive,
  sanitizeArchiveData,
};
