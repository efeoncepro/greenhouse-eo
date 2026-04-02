-- Up Migration
SET search_path = greenhouse_delivery, greenhouse_core, public;

ALTER TABLE greenhouse_delivery.projects
  DROP CONSTRAINT IF EXISTS projects_space_id_fkey;

ALTER TABLE greenhouse_delivery.sprints
  DROP CONSTRAINT IF EXISTS sprints_space_id_fkey;

ALTER TABLE greenhouse_delivery.tasks
  DROP CONSTRAINT IF EXISTS tasks_space_id_fkey;

UPDATE greenhouse_delivery.projects AS p
SET space_id = s.space_id
FROM greenhouse_core.spaces AS s
WHERE p.space_id IS NOT NULL
  AND p.space_id <> s.space_id
  AND s.client_id = p.space_id;

UPDATE greenhouse_delivery.sprints AS spr
SET space_id = s.space_id
FROM greenhouse_core.spaces AS s
WHERE spr.space_id IS NOT NULL
  AND spr.space_id <> s.space_id
  AND s.client_id = spr.space_id;

UPDATE greenhouse_delivery.tasks AS t
SET space_id = s.space_id
FROM greenhouse_core.spaces AS s
WHERE t.space_id IS NOT NULL
  AND t.space_id <> s.space_id
  AND s.client_id = t.space_id;

ALTER TABLE greenhouse_delivery.projects
  ADD CONSTRAINT projects_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces(space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.sprints
  ADD CONSTRAINT sprints_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces(space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.tasks
  ADD CONSTRAINT tasks_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces(space_id)
  ON DELETE SET NULL;

-- Down Migration
SET search_path = greenhouse_delivery, greenhouse_core, public;

ALTER TABLE greenhouse_delivery.projects
  DROP CONSTRAINT IF EXISTS projects_space_id_fkey;

ALTER TABLE greenhouse_delivery.projects
  ADD CONSTRAINT projects_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.notion_workspaces(space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.sprints
  DROP CONSTRAINT IF EXISTS sprints_space_id_fkey;

ALTER TABLE greenhouse_delivery.sprints
  ADD CONSTRAINT sprints_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.notion_workspaces(space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_delivery.tasks
  DROP CONSTRAINT IF EXISTS tasks_space_id_fkey;

ALTER TABLE greenhouse_delivery.tasks
  ADD CONSTRAINT tasks_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.notion_workspaces(space_id)
  ON DELETE SET NULL;
