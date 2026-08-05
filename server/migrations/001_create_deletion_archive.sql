CREATE TABLE IF NOT EXISTS deletion_archive (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(80) NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  deletion_reason TEXT,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT deletion_archive_snapshot_object
    CHECK (jsonb_typeof(snapshot_data) = 'object'),
  CONSTRAINT deletion_archive_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS deletion_archive_deleted_at_idx
  ON deletion_archive (deleted_at DESC);

CREATE INDEX IF NOT EXISTS deletion_archive_entity_type_deleted_at_idx
  ON deletion_archive (entity_type, deleted_at DESC);

CREATE INDEX IF NOT EXISTS deletion_archive_entity_id_idx
  ON deletion_archive (entity_type, entity_id);
