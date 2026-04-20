-- TASK-486 — Commercial Quotation Canonical Anchor (Organization + Contact)
--
-- Formaliza el anchor canónico de greenhouse_commercial.quotations como
-- Organization + Contact (identity_profile). Deprecia space_id como write path
-- del builder sin eliminar la columna (quote-to-cash legacy readers la siguen
-- consultando post-conversión).
--
-- Cambios:
--  1. Backfill de organization_id para filas legacy donde solo client_id estaba seteado.
--  2. Reporte en raise NOTICE si quedan filas orphan (organization_id aún NULL).
--  3. Nueva columna `contact_identity_profile_id` FK → identity_profiles(profile_id).
--  4. Endurecer `organization_id` como NOT NULL (asume backfill limpio).
--  5. Index `idx_commercial_quotations_organization_status` para tenant scoping nuevo.
--  6. Comentarios de deprecation en space_id + space_resolution_source.
--
-- Rollback: manual. Drop de columnas nuevas + revert NOT NULL. Ver down migration.

-- Up Migration

-- 1. Backfill organization_id desde client_profiles para quotes legacy que solo tienen client_id.
UPDATE greenhouse_commercial.quotations q
SET organization_id = cp.organization_id
FROM greenhouse_finance.client_profiles cp
WHERE q.organization_id IS NULL
  AND q.client_id IS NOT NULL
  AND q.client_id = cp.client_profile_id
  AND cp.organization_id IS NOT NULL;

-- 2. Backfill desde greenhouse_core.spaces (fallback si client_profiles no tiene match).
--    Spaces tiene both client_id y organization_id — es el puente directo.
UPDATE greenhouse_commercial.quotations q
SET organization_id = s.organization_id
FROM greenhouse_core.spaces s
WHERE q.organization_id IS NULL
  AND q.client_id IS NOT NULL
  AND s.client_id = q.client_id
  AND s.active = TRUE
  AND s.organization_id IS NOT NULL;

-- 2b. Backfill desde el space que la quote ya tenga asignado (si trajimos space_id desde
--     el lane legacy pero no organization_id, derivar org de ese space mismo).
UPDATE greenhouse_commercial.quotations q
SET organization_id = s.organization_id
FROM greenhouse_core.spaces s
WHERE q.organization_id IS NULL
  AND q.space_id IS NOT NULL
  AND s.space_id = q.space_id
  AND s.organization_id IS NOT NULL;

-- 3. Reportar orphans via RAISE EXCEPTION si los hay (el mensaje vuela al caller).
--    Así tenemos visibilidad incluso sin que el cliente eche notices.
DO $$
DECLARE
  orphan_count INTEGER;
  orphan_sample TEXT;
BEGIN
  SELECT COUNT(*)
    INTO orphan_count
    FROM greenhouse_commercial.quotations
    WHERE organization_id IS NULL;

  IF orphan_count > 0 THEN
    SELECT string_agg(
        format('qt=%s num=%s client=%s space=%s source=%s hs_quote=%s',
               quotation_id, COALESCE(quotation_number, 'NULL'),
               COALESCE(client_id, 'NULL'), COALESCE(space_id, 'NULL'),
               COALESCE(source_system, 'NULL'), COALESCE(hubspot_quote_id, 'NULL')),
        E'\n'
      )
      INTO orphan_sample
      FROM (
        SELECT quotation_id, quotation_number, client_id, space_id, source_system, hubspot_quote_id
          FROM greenhouse_commercial.quotations
          WHERE organization_id IS NULL
          ORDER BY created_at DESC
          LIMIT 10
      ) sample;

    RAISE NOTICE 'TASK-486 orphan quotations (% total, first 10):', orphan_count;
    RAISE NOTICE '%', orphan_sample;
  END IF;
END $$;

-- 4. Agregar contact_identity_profile_id (FK nullable).
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS contact_identity_profile_id TEXT;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_contact_identity_profile_fkey;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_contact_identity_profile_fkey
    FOREIGN KEY (contact_identity_profile_id)
    REFERENCES greenhouse_core.identity_profiles(profile_id)
    ON DELETE SET NULL;

-- 5. Index parcial (solo filas con contact poblado).
CREATE INDEX IF NOT EXISTS idx_commercial_quotations_contact
  ON greenhouse_commercial.quotations (contact_identity_profile_id)
  WHERE contact_identity_profile_id IS NOT NULL;

-- 6. organization_id se deja NULLABLE a nivel de schema porque existen filas legacy orphan
--    (HubSpot quotes sync sin company mapeable a organization). Enforcement canónico se hace
--    en la capa API (POST /api/finance/quotes valida organizationId required).
--    Follow-up: task dedicada de data remediation cierra orphans, luego otra migración flipea
--    SET NOT NULL a nivel DB. Documentado en Follow-ups de TASK-486.
--    (Comentado intencionalmente — no ejecutar SET NOT NULL hasta que orphans = 0):
-- ALTER TABLE greenhouse_commercial.quotations ALTER COLUMN organization_id SET NOT NULL;

-- 7. Index nuevo para tenant scoping anchored en organization_id.
CREATE INDEX IF NOT EXISTS idx_commercial_quotations_organization_status
  ON greenhouse_commercial.quotations (organization_id, status, updated_at DESC);

-- 8. Marcar space_id + space_resolution_source como DEPRECATED vía COMMENT.
--    (Intencionalmente NO drop — quote-to-cash readers siguen leyendo space_id post-conversion.)
COMMENT ON COLUMN greenhouse_commercial.quotations.space_id IS
  'DEPRECATED (TASK-486, 2026-04-19): post-conversion operational scope only, not canonical anchor. Canonical anchor is organization_id + contact_identity_profile_id. Still populated by legacy readers (quote-to-cash lane) via lateral subquery post-conversion. New writes from the builder / canonical sync set this to NULL. Will be dropped in a follow-up v2 task once all readers migrate.';

COMMENT ON COLUMN greenhouse_commercial.quotations.space_resolution_source IS
  'DEPRECATED (TASK-486, 2026-04-19): audit trail of legacy space resolution logic. No longer populated on new inserts from the canonical path (derived in JS as ''unresolved''). Kept for backwards compat with existing rows.';

COMMENT ON COLUMN greenhouse_commercial.quotations.contact_identity_profile_id IS
  'Canonical contact (persona) associated with the quotation. FK to greenhouse_core.identity_profiles. Added in TASK-486. Optional — quotes may have no contact set yet (prospect stage). Consumers should resolve full contact data via join to identity_profiles (+ person_memberships if role_label / organization context is needed).';

COMMENT ON COLUMN greenhouse_commercial.quotations.organization_id IS
  'Canonical anchor of the quotation (client or prospect). FK to greenhouse_core.organizations. Backfilled from client_profiles / spaces for legacy rows during TASK-486 (2026-04-19). Still NULLABLE at DB level because existing orphan rows (HubSpot quotes without org mapping) exist pre-migration. Canonical enforcement lives in the API layer: POST /api/finance/quotes requires organizationId. A follow-up data remediation task will close remaining orphans and then flip SET NOT NULL at DB level.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_quotations_organization_status;

DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_quotations_contact;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_contact_identity_profile_fkey;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS contact_identity_profile_id;

COMMENT ON COLUMN greenhouse_commercial.quotations.space_id IS NULL;
COMMENT ON COLUMN greenhouse_commercial.quotations.space_resolution_source IS NULL;
COMMENT ON COLUMN greenhouse_commercial.quotations.organization_id IS NULL;
