-- Up Migration
SET search_path = greenhouse_core, public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_head_member_id_fkey'
      AND conrelid = 'greenhouse_core.departments'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.departments
      ADD CONSTRAINT departments_head_member_id_fkey
      FOREIGN KEY (head_member_id)
      REFERENCES greenhouse_core.members(member_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS departments_head_member_idx
  ON greenhouse_core.departments (head_member_id);

CREATE INDEX IF NOT EXISTS departments_parent_department_idx
  ON greenhouse_core.departments (parent_department_id);

-- Down Migration
SET search_path = greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_core.departments_parent_department_idx;
DROP INDEX IF EXISTS greenhouse_core.departments_head_member_idx;

ALTER TABLE greenhouse_core.departments
  DROP CONSTRAINT IF EXISTS departments_head_member_id_fkey;
