-- Up Migration

-- TASK-1412 · Proposal Studio: la versión de un artefacto se DERIVA, nunca se autora.
-- Antes de poder derivar MAX+1 por (proposal_id, kind), la historia existente debe ser
-- consistente: el default fijo `version=1` dejó duplicados potenciales. Se renumera de
-- forma DETERMINISTA por (created_at, proposal_asset_id) y se sella con unicidad.

-- 1. Backfill: renumerar TODA la historia por (proposal_id, kind) — idempotente
--    (si ya está bien numerada, el UPDATE no cambia filas).
WITH renumbered AS (
  SELECT
    proposal_asset_id,
    ROW_NUMBER() OVER (
      PARTITION BY proposal_id, kind
      ORDER BY created_at ASC, proposal_asset_id ASC
    ) AS next_version
  FROM greenhouse_commercial.proposal_assets
)
UPDATE greenhouse_commercial.proposal_assets pa
SET version = r.next_version,
    updated_at = now()
FROM renumbered r
WHERE pa.proposal_asset_id = r.proposal_asset_id
  AND pa.version IS DISTINCT FROM r.next_version;

-- 2. Unicidad: dos versiones iguales del mismo kind en la misma proposal son imposibles.
CREATE UNIQUE INDEX IF NOT EXISTS proposal_assets_kind_version_unique
  ON greenhouse_commercial.proposal_assets (proposal_id, kind, version);

-- 3. Anti pre-up-marker guard: aborta si el índice no quedó creado o si quedaron duplicados.
DO $$
DECLARE
  index_exists boolean;
  duplicate_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_commercial'
      AND tablename = 'proposal_assets'
      AND indexname = 'proposal_assets_kind_version_unique'
  ) INTO index_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'TASK-1412 anti pre-up-marker check: proposal_assets_kind_version_unique was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT 1
    FROM greenhouse_commercial.proposal_assets
    GROUP BY proposal_id, kind, version
    HAVING COUNT(*) > 1
  ) d;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'TASK-1412 backfill check: % duplicated (proposal_id, kind, version) groups remain.', duplicate_count;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.proposal_assets_kind_version_unique;
