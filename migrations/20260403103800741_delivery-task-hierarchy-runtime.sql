-- Up Migration

SET search_path = greenhouse_delivery, greenhouse_core, public;

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS tarea_principal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE greenhouse_delivery.tasks
  ADD COLUMN IF NOT EXISTS subtareas_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS delivery_tasks_parent_ids_gin
  ON greenhouse_delivery.tasks USING GIN (tarea_principal_ids);

CREATE INDEX IF NOT EXISTS delivery_tasks_subtask_ids_gin
  ON greenhouse_delivery.tasks USING GIN (subtareas_ids);

-- Down Migration

DROP INDEX IF EXISTS greenhouse_delivery.delivery_tasks_subtask_ids_gin;
DROP INDEX IF EXISTS greenhouse_delivery.delivery_tasks_parent_ids_gin;

ALTER TABLE greenhouse_delivery.tasks
  DROP COLUMN IF EXISTS subtareas_ids;

ALTER TABLE greenhouse_delivery.tasks
  DROP COLUMN IF EXISTS tarea_principal_ids;
