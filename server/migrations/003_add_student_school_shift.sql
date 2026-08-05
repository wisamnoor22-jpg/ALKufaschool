BEGIN;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS school_shift VARCHAR(20);

ALTER TABLE student_enrollments
  ADD COLUMN IF NOT EXISTS school_shift VARCHAR(20);

UPDATE students
SET school_shift = 'صباحي'
WHERE school_shift IS NULL
   OR school_shift NOT IN ('صباحي', 'ظهري');

UPDATE student_enrollments AS enrollment
SET school_shift = COALESCE(student.school_shift, 'صباحي')
FROM students AS student
WHERE student.id = enrollment.student_id
  AND (
    enrollment.school_shift IS NULL
    OR enrollment.school_shift NOT IN ('صباحي', 'ظهري')
  );

ALTER TABLE students
  ALTER COLUMN school_shift SET DEFAULT 'صباحي',
  ALTER COLUMN school_shift SET NOT NULL;

ALTER TABLE student_enrollments
  ALTER COLUMN school_shift SET DEFAULT 'صباحي',
  ALTER COLUMN school_shift SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_school_shift_check'
      AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_school_shift_check
      CHECK (school_shift IN ('صباحي', 'ظهري'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_afternoon_male_only_check'
      AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_afternoon_male_only_check
      CHECK (
        school_shift <> 'ظهري'
        OR LOWER(TRIM(COALESCE(gender, ''))) IN ('طالب', 'ذكر', 'male')
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_enrollments_school_shift_check'
      AND conrelid = 'student_enrollments'::regclass
  ) THEN
    ALTER TABLE student_enrollments
      ADD CONSTRAINT student_enrollments_school_shift_check
      CHECK (school_shift IN ('صباحي', 'ظهري'))
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE students
  VALIDATE CONSTRAINT students_school_shift_check;

ALTER TABLE students
  VALIDATE CONSTRAINT students_afternoon_male_only_check;

ALTER TABLE student_enrollments
  VALIDATE CONSTRAINT student_enrollments_school_shift_check;

COMMIT;
