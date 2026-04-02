-- Up Migration

SET search_path = greenhouse_delivery, greenhouse_core, public;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS assignee_source_id TEXT;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS assignee_member_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS project_source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE greenhouse_delivery.tasks
SET assignee_member_ids = ARRAY[assignee_member_id]
WHERE assignee_member_id IS NOT NULL
  AND array_length(assignee_member_ids, 1) IS NULL;

UPDATE greenhouse_delivery.tasks
SET project_source_ids = ARRAY[notion_project_id]
WHERE notion_project_id IS NOT NULL
  AND array_length(project_source_ids, 1) IS NULL;

CREATE INDEX IF NOT EXISTS delivery_tasks_assignee_source_idx
  ON greenhouse_delivery.tasks (assignee_source_id);

-- Down Migration

SET search_path = greenhouse_delivery, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_delivery.delivery_tasks_assignee_source_idx;

ALTER TABLE greenhouse_delivery.tasks
  DROP COLUMN IF EXISTS project_source_ids;

ALTER TABLE greenhouse_delivery.tasks
  DROP COLUMN IF EXISTS assignee_member_ids;

ALTER TABLE greenhouse_delivery.tasks
  DROP COLUMN IF EXISTS assignee_source_id;
