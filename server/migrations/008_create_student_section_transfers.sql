BEGIN;

CREATE TABLE IF NOT EXISTS student_section_transfers (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  student_name TEXT NOT NULL,
  academic_year_id BIGINT,
  academic_year_name TEXT,
  grade_id BIGINT,
  grade_name TEXT,
  from_section_id BIGINT,
  from_section_name TEXT NOT NULL,
  to_section_id BIGINT,
  to_section_name TEXT NOT NULL,
  transfer_reason TEXT,
  transfer_source VARCHAR(40) NOT NULL DEFAULT 'manual',
  transferred_by VARCHAR(120) NOT NULL DEFAULT 'النظام',
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_section_transfers_student
  ON student_section_transfers (student_id);

CREATE INDEX IF NOT EXISTS idx_student_section_transfers_academic_year
  ON student_section_transfers (academic_year_id);

CREATE INDEX IF NOT EXISTS idx_student_section_transfers_date
  ON student_section_transfers (transferred_at DESC);

COMMENT ON TABLE student_section_transfers IS
  'Permanent administrative history of student transfers between sections.';

COMMIT;