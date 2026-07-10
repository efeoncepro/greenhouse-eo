-- Up Migration

-- TASK-1362 — Quarantine/scan de assets subidos desde la web pública.
--
-- Contexto: el upload público de CV (TASK-354/1367) ya está vivo y confía en el
-- MIME declarado por el cliente; nunca se inspeccionó un byte. Esta migración
-- crea el sustrato para que `pending → scan → attached | quarantined` sea real:
--
--   1. `quarantined` como estado terminal de `greenhouse_core.assets`.
--   2. `greenhouse_core.asset_scan_results`: registro append-only del veredicto.
--   3. Backfill: los assets de candidato que entraron sin scan quedan marcados
--      `legacy_unscanned` — rastro auditable, sin tocar su `status` (siguen
--      descargables por HR) y sin bajar bytes desde GCS.
--
-- Forma del registro tomada de `greenhouse_context.context_document_quarantine`
-- (structured-context): append-only + estado de resolución + findings en JSONB.

-- 1. `quarantined` en el CHECK de status.
--    La tabla nació en `scripts/setup-postgres-shared-assets.sql`, no en una
--    migración, así que el constraint se reemplaza por su nombre real en PG.
ALTER TABLE greenhouse_core.assets
  DROP CONSTRAINT IF EXISTS assets_status_check;

ALTER TABLE greenhouse_core.assets
  ADD CONSTRAINT assets_status_check
  CHECK (status IN ('pending', 'attached', 'orphaned', 'deleted', 'quarantined'));

-- 2. Registro append-only de veredictos de scan.
CREATE TABLE IF NOT EXISTS greenhouse_core.asset_scan_results (
  scan_id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES greenhouse_core.assets (asset_id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('clean', 'suspicious', 'infected', 'error', 'legacy_unscanned')),
  scanner TEXT NOT NULL,
  scanner_version TEXT NOT NULL,
  -- Findings sin PII ni contenido del archivo. NUNCA bytes del documento.
  findings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  declared_mime_type TEXT,
  detected_mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  -- Triage humano de lo que quedó en cuarentena.
  resolution_status TEXT NOT NULL DEFAULT 'open'
    CHECK (resolution_status IN ('open', 'ignored', 'confirmed_malicious', 'false_positive')),
  resolution_notes TEXT,
  resolved_by_user_id TEXT REFERENCES greenhouse_core.client_users (user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT asset_scan_results_resolution_invariant CHECK (
    resolution_status = 'open' OR resolved_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS asset_scan_results_asset_idx
  ON greenhouse_core.asset_scan_results (asset_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS asset_scan_results_verdict_idx
  ON greenhouse_core.asset_scan_results (verdict, scanned_at DESC);

CREATE INDEX IF NOT EXISTS asset_scan_results_open_quarantine_idx
  ON greenhouse_core.asset_scan_results (resolution_status, scanned_at DESC)
  WHERE verdict IN ('suspicious', 'infected', 'error');

-- El veredicto es evidencia forense: no se reescribe ni se borra. Sólo el
-- triage humano (`resolution_*`) puede mutar; el resto de las columnas queda
-- congelado, igual que el audit log de person-legal-profile (TASK-784).
CREATE OR REPLACE FUNCTION greenhouse_core.assert_asset_scan_result_append_only()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'asset_scan_results is append-only: DELETE is not allowed (scan_id=%)', OLD.scan_id;
  END IF;

  IF NEW.asset_id IS DISTINCT FROM OLD.asset_id
    OR NEW.verdict IS DISTINCT FROM OLD.verdict
    OR NEW.scanner IS DISTINCT FROM OLD.scanner
    OR NEW.scanner_version IS DISTINCT FROM OLD.scanner_version
    OR NEW.findings_json IS DISTINCT FROM OLD.findings_json
    OR NEW.declared_mime_type IS DISTINCT FROM OLD.declared_mime_type
    OR NEW.detected_mime_type IS DISTINCT FROM OLD.detected_mime_type
    OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
    OR NEW.scanned_at IS DISTINCT FROM OLD.scanned_at
  THEN
    RAISE EXCEPTION 'asset_scan_results is append-only: only resolution_* columns may change (scan_id=%)', OLD.scan_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_scan_results_append_only ON greenhouse_core.asset_scan_results;

CREATE TRIGGER asset_scan_results_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_core.asset_scan_results
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_asset_scan_result_append_only();

COMMENT ON TABLE greenhouse_core.asset_scan_results IS
  'TASK-1362 — Veredicto append-only del escaneo de un asset antes de quedar attached. Solo las columnas resolution_* mutan (triage humano).';

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.asset_scan_results TO greenhouse_runtime;

-- 3. Backfill idempotente: todo asset de documento de candidato que ya existe
--    entró sin scan. Se registra el hecho; NO se toca `status` (un CV legítimo
--    de un candidato real no se pone en cuarentena por un cambio de plataforma)
--    y NO se descargan bytes desde GCS dentro de una migración.
INSERT INTO greenhouse_core.asset_scan_results (
  scan_id,
  asset_id,
  verdict,
  scanner,
  scanner_version,
  findings_json,
  declared_mime_type,
  size_bytes,
  scanned_at
)
SELECT
  'ascan-legacy-' || a.asset_id,
  a.asset_id,
  'legacy_unscanned',
  'none',
  '0',
  jsonb_build_array(jsonb_build_object(
    'code', 'uploaded_before_scan_existed',
    'severity', 'advisory',
    'detail', 'El asset se adjunto antes de que la plataforma tuviera escaneo de contenido (TASK-1362).'
  )),
  a.mime_type,
  a.size_bytes,
  a.uploaded_at
FROM greenhouse_core.assets a
WHERE a.retention_class = 'hiring_candidate_document'
  AND a.status <> 'deleted'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_core.asset_scan_results r WHERE r.asset_id = a.asset_id
  );

-- 4. Anti pre-up-marker guard: si los markers quedaran invertidos, el DDL de
--    arriba nunca correría y esta migración se registraría como aplicada en vacío.
DO $$
DECLARE
  table_exists boolean;
  status_check_allows_quarantine boolean;
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'asset_scan_results'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1362 anti pre-up-marker check: greenhouse_core.asset_scan_results was NOT created.';
  END IF;

  SELECT pg_get_constraintdef(con.oid) LIKE '%quarantined%'
  INTO status_check_allows_quarantine
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE n.nspname = 'greenhouse_core' AND rel.relname = 'assets' AND con.conname = 'assets_status_check';

  IF NOT COALESCE(status_check_allows_quarantine, false) THEN
    RAISE EXCEPTION 'TASK-1362 anti pre-up-marker check: assets_status_check does NOT allow quarantined.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'asset_scan_results_append_only' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1362 anti pre-up-marker check: append-only trigger was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS asset_scan_results_append_only ON greenhouse_core.asset_scan_results;
DROP FUNCTION IF EXISTS greenhouse_core.assert_asset_scan_result_append_only();
DROP TABLE IF EXISTS greenhouse_core.asset_scan_results;

-- Sin este paso el rollback fallaría al re-crear el CHECK: un asset en
-- cuarentena no cabe en el enum viejo. `orphaned` es su vecino semántico (subido,
-- nunca adjuntado, sin owner) y deja los bytes intactos en el bucket para triage.
UPDATE greenhouse_core.assets SET status = 'orphaned' WHERE status = 'quarantined';

ALTER TABLE greenhouse_core.assets
  DROP CONSTRAINT IF EXISTS assets_status_check;

ALTER TABLE greenhouse_core.assets
  ADD CONSTRAINT assets_status_check
  CHECK (status IN ('pending', 'attached', 'orphaned', 'deleted'));
