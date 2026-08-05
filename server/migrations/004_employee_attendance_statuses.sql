BEGIN;

DO $$
DECLARE
  legacy_excused_count INTEGER;
BEGIN
  SELECT COUNT(*)::integer
  INTO legacy_excused_count
  FROM employee_attendance
  WHERE status = 'excused';

  IF legacy_excused_count > 0 THEN
    RAISE EXCEPTION
      'Cannot remove employee excused status: % legacy records require an explicit conversion decision',
      legacy_excused_count;
  END IF;
END
$$;

ALTER TABLE employee_attendance
  DROP CONSTRAINT IF EXISTS employee_attendance_status_check;

ALTER TABLE employee_attendance
  ADD CONSTRAINT employee_attendance_status_check
  CHECK (status IN ('present', 'absent', 'late'));

COMMIT;
