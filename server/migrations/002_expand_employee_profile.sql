BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS third_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS work_shift VARCHAR(30),
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);

WITH normalized_names AS (
  SELECT
    id,
    regexp_split_to_array(
      regexp_replace(BTRIM(full_name), '\s+', ' ', 'g'),
      ' '
    ) AS name_parts
  FROM employees
  WHERE NULLIF(BTRIM(full_name), '') IS NOT NULL
)
UPDATE employees AS employee
SET
  first_name = COALESCE(
    NULLIF(BTRIM(employee.first_name), ''),
    normalized_names.name_parts[1]
  ),
  middle_name = COALESCE(
    NULLIF(BTRIM(employee.middle_name), ''),
    normalized_names.name_parts[2]
  ),
  third_name = COALESCE(
    NULLIF(BTRIM(employee.third_name), ''),
    NULLIF(
      array_to_string(
        normalized_names.name_parts[
          3:array_length(normalized_names.name_parts, 1)
        ],
        ' '
      ),
      ''
    )
  )
FROM normalized_names
WHERE employee.id = normalized_names.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_salary_nonnegative'
      AND conrelid = 'employees'::regclass
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_salary_nonnegative
      CHECK (salary IS NULL OR salary >= 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_work_shift_check'
      AND conrelid = 'employees'::regclass
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_work_shift_check
      CHECK (
        work_shift IS NULL OR
        work_shift IN ('صباحي', 'ظهري', 'صباحي وظهري')
      )
      NOT VALID;
  END IF;
END
$$;

COMMIT;
