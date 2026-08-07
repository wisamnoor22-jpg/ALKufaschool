BEGIN;

CREATE TABLE IF NOT EXISTS timetable_periods (
  id SERIAL PRIMARY KEY,
  work_shift VARCHAR(20) NOT NULL,
  period_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT timetable_periods_shift_check
    CHECK (work_shift IN ('صباحي', 'ظهري')),
  CONSTRAINT timetable_periods_number_check
    CHECK (period_number > 0),
  CONSTRAINT timetable_periods_time_check
    CHECK (start_time < end_time),
  CONSTRAINT timetable_periods_shift_number_unique
    UNIQUE (work_shift, period_number)
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id SERIAL PRIMARY KEY,
  work_shift VARCHAR(20) NOT NULL,
  grade VARCHAR(100) NOT NULL,
  section VARCHAR(20) NOT NULL,
  day_name VARCHAR(20) NOT NULL,
  period_number INTEGER NOT NULL,
  subject VARCHAR(100) NOT NULL,
  teacher_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT timetable_entries_shift_check
    CHECK (work_shift IN ('صباحي', 'ظهري')),
  CONSTRAINT timetable_entries_day_check
    CHECK (day_name IN ('الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس')),
  CONSTRAINT timetable_entries_section_check
    CHECK (section IN ('أ', 'ب', 'ج', 'د')),
  CONSTRAINT timetable_entries_cell_unique
    UNIQUE (work_shift, grade, section, day_name, period_number),
  CONSTRAINT timetable_entries_period_fk
    FOREIGN KEY (work_shift, period_number)
    REFERENCES timetable_periods(work_shift, period_number)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS timetable_entries_teacher_day_idx
  ON timetable_entries (teacher_id, day_name);

CREATE INDEX IF NOT EXISTS timetable_entries_lookup_idx
  ON timetable_entries (work_shift, grade, day_name, section, period_number);

INSERT INTO timetable_periods (work_shift, period_number, start_time, end_time)
VALUES
  ('صباحي', 1, '08:00', '08:45'),
  ('صباحي', 2, '08:50', '09:35'),
  ('صباحي', 3, '09:40', '10:25'),
  ('صباحي', 4, '10:40', '11:25'),
  ('صباحي', 5, '11:30', '12:15'),
  ('ظهري', 1, '13:30', '14:15'),
  ('ظهري', 2, '14:20', '15:05'),
  ('ظهري', 3, '15:10', '15:55'),
  ('ظهري', 4, '16:10', '16:55'),
  ('ظهري', 5, '17:00', '17:45')
ON CONFLICT (work_shift, period_number) DO NOTHING;

COMMIT;