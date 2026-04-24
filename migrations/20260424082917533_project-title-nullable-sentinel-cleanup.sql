-- Up Migration
-- ============================================================
-- TASK-588 — Project/Task/Sprint title resolution hardening
-- ============================================================
-- Hace nullable los campos *_name en greenhouse_delivery.* y
-- limpia el poison 'Sin nombre' (y otros sentinels) que el sync
-- inyectaba cuando el título no resolvía desde notion_ops.
--
-- Contexto: Sky Airline tiene la propiedad Notion title en una
-- columna distinta (`project_name` / `nombre_de_la_tarea`) que
-- Efeonce (`nombre_del_proyecto` / `nombre_de_tarea`). El sync
-- canónico hardcodea la columna de Efeonce → Sky queda con
-- placeholder. El fix: canónico jamás escribe placeholder, NULL
-- representa "desconocido", y CHECK prohíbe que se cuele.
--
-- DEPLOY ORDER: esta migración DEBE aplicarse antes de desplegar
-- el código TASK-588 que escribe NULL. El código viejo sigue
-- escribiendo 'Sin nombre' mientras la flag
-- GREENHOUSE_DELIVERY_TITLE_CASCADE_ENABLED esté en 0, por lo que
-- el orden correcto es migración → deploy código → flip flag.
--
-- Los CHECK constraints se agregan DESPUÉS del cleanup para no
-- violar filas existentes mientras el writer legacy sigue activo
-- con flag=0.
-- ============================================================

SET search_path = greenhouse_delivery, public;

-- ------------------------------------------------------------
-- Fase 1 — DROP NOT NULL (instantáneo, sin lock prolongado)
-- ------------------------------------------------------------

ALTER TABLE greenhouse_delivery.projects
  ALTER COLUMN project_name DROP NOT NULL;

ALTER TABLE greenhouse_delivery.tasks
  ALTER COLUMN task_name DROP NOT NULL;

ALTER TABLE greenhouse_delivery.sprints
  ALTER COLUMN sprint_name DROP NOT NULL;

-- ------------------------------------------------------------
-- Fase 2 — Cleanup de sentinels (batch-safe donde aplica)
-- ------------------------------------------------------------
-- Lista canónica de sentinels (insensible a mayúsculas y espacios).
-- Mantener sincronizada con el CHECK constraint de la Fase 3 y
-- con PROJECT_DISPLAY_SENTINELS en el resolver del ICO.
--
-- sentinels = {'sin nombre','sin título','sin titulo',
--              'untitled','no title','sem nome','n/a'}

-- projects: ~200 filas totales, UPDATE directo es seguro.
UPDATE greenhouse_delivery.projects
SET project_name = NULL
WHERE project_name IS NOT NULL
  AND LOWER(TRIM(project_name)) IN (
    'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
  );

-- tasks: volumen alto (~3590 filas Sky + legacy). Batch para
-- evitar ACCESS EXCLUSIVE LOCK prolongado que bloquee syncs en
-- curso. Loop termina cuando no queda nada que actualizar.
DO $$
DECLARE
  affected INTEGER;
BEGIN
  LOOP
    WITH batch AS (
      SELECT ctid
      FROM greenhouse_delivery.tasks
      WHERE task_name IS NOT NULL
        AND LOWER(TRIM(task_name)) IN (
          'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
        )
      LIMIT 2000
    )
    UPDATE greenhouse_delivery.tasks AS t
    SET task_name = NULL
    FROM batch
    WHERE t.ctid = batch.ctid;

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;

    -- Breathing room para otros writers concurrentes.
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- sprints: ~30 filas totales, UPDATE directo es seguro.
UPDATE greenhouse_delivery.sprints
SET sprint_name = NULL
WHERE sprint_name IS NOT NULL
  AND LOWER(TRIM(sprint_name)) IN (
    'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
  );

-- ------------------------------------------------------------
-- Fase 3 — CHECK constraints (tras cleanup completo)
-- ------------------------------------------------------------
-- Previene que cualquier writer futuro reintroduzca el poison.
-- El sync nuevo escribe NULL; el sync legacy con flag=0 también
-- pasa (el cleanup ya barrió los sentinels históricos).

ALTER TABLE greenhouse_delivery.projects
  ADD CONSTRAINT projects_name_no_sentinel_chk
  CHECK (
    project_name IS NULL
    OR (
      TRIM(project_name) <> ''
      AND LOWER(TRIM(project_name)) NOT IN (
        'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
      )
    )
  );

ALTER TABLE greenhouse_delivery.tasks
  ADD CONSTRAINT tasks_name_no_sentinel_chk
  CHECK (
    task_name IS NULL
    OR (
      TRIM(task_name) <> ''
      AND LOWER(TRIM(task_name)) NOT IN (
        'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
      )
    )
  );

ALTER TABLE greenhouse_delivery.sprints
  ADD CONSTRAINT sprints_name_no_sentinel_chk
  CHECK (
    sprint_name IS NULL
    OR (
      TRIM(sprint_name) <> ''
      AND LOWER(TRIM(sprint_name)) NOT IN (
        'sin nombre', 'sin título', 'sin titulo', 'untitled', 'no title', 'sem nome', 'n/a'
      )
    )
  );

-- Down Migration
-- ------------------------------------------------------------
-- Reversa de CHECK constraints (cleanly).
-- NO se revierten UPDATEs: los sentinels históricos perdieron
-- su contenido a propósito y no se reinstalan.
-- NO se re-agrega NOT NULL: si hay filas NULL (esperado), el
-- ALTER fallaría. Dejar NOT NULL como irreversible.
-- ------------------------------------------------------------

ALTER TABLE greenhouse_delivery.projects DROP CONSTRAINT IF EXISTS projects_name_no_sentinel_chk;
ALTER TABLE greenhouse_delivery.tasks    DROP CONSTRAINT IF EXISTS tasks_name_no_sentinel_chk;
ALTER TABLE greenhouse_delivery.sprints  DROP CONSTRAINT IF EXISTS sprints_name_no_sentinel_chk;
