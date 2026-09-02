-- Up Migration

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- TASK-1805 — EXPAND: la metodología ETV pasa a ser identidad del hecho (DataForSEO Improved ETV).
--
-- DataForSEO cambia el cálculo detrás del mismo campo `etv` sin cambiar el shape. Sin esta dimensión,
-- una revisión del modelo entra a la trayectoria como si fuera performance SEO. Este expand es
-- ADITIVO y compatible con el código viejo que sigue corriendo en producción sobre la MISMA instancia
-- Cloud SQL (dev/staging/prod comparten base — ISSUE-161):
--
--   - columnas con DEFAULT transitorio: `legacy_static_v1` + evidencia `contract_default_pre_cutoff`.
--     Un INSERT viejo (sin las columnas) sigue funcionando y queda etiquetado con la VERDAD: su
--     método se atribuye por contrato (cuenta registrada antes del 2026-09-01 → default legacy hasta
--     el corte) y por request shape (el código nunca envió `use_improved_etv`), no por fecha.
--   - la UNIQUE legacy se CONSERVA (los writers viejos hacen `ON CONFLICT ON CONSTRAINT <legacy>`);
--     la UNIQUE formula-aware se AGREGA al lado. Coexistir dos métodos el mismo día sólo es posible
--     tras el CONTRACT (`docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending`),
--     que retira la legacy y los defaults cuando Vercel y ops-worker ya escriben método explícito.
--   - guard de corte en la propia base: desde 2026-11-01T00:00:00Z el default del proveedor es
--     improved, así que una fila con evidencia contractual capturada desde ese instante es
--     IMPOSIBLE y se rechaza; igual una legacy con `etv_requested_at` desde el corte. Así el código
--     viejo falla cerrado post-corte aunque no conozca la policy.
--
-- Filas existentes al aplicar (readback 2026-09-02): 5 fotos de dominio, 8 de visibilidad,
-- 2 diagnósticos de prospecto (1 hecho ETV). Todas capturadas 2026-08-27/29 → legacy con evidencia
-- contractual. No hay ventana ambigua. Append-only NO se toca: el DEFAULT del ADD COLUMN llena las
-- filas sin disparar el trigger de UPDATE.
--
-- ADR: docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- 0. Guard de corte compartido (fail-closed en la base, independiente del runtime que escriba).
CREATE OR REPLACE FUNCTION greenhouse_growth.guard_seo_etv_methodology_cutoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff CONSTANT timestamptz := '2026-11-01T00:00:00Z';
  row_json jsonb := to_jsonb(NEW);
  observed_at timestamptz := COALESCE(
    (row_json ->> 'captured_at')::timestamptz,
    (row_json ->> 'created_at')::timestamptz,
    now()
  );
BEGIN
  IF NEW.etv_methodology_evidence = 'contract_default_pre_cutoff' AND observed_at >= cutoff THEN
    RAISE EXCEPTION 'TASK-1805: greenhouse_growth.% rechaza evidencia contractual desde el corte del proveedor (%); desde 2026-11-01T00:00:00Z el default es improved y la fila debe llevar request explícito.',
      TG_TABLE_NAME, observed_at;
  END IF;

  IF NEW.etv_methodology_version = 'legacy_static_v1'
     AND NEW.etv_requested_at IS NOT NULL
     AND NEW.etv_requested_at >= cutoff THEN
    RAISE EXCEPTION 'TASK-1805: greenhouse_growth.% rechaza legacy solicitado en/después del corte (%): el proveedor ignora use_improved_etv=false desde 2026-11-01T00:00:00Z.',
      TG_TABLE_NAME, NEW.etv_requested_at;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION greenhouse_growth.guard_seo_etv_methodology_cutoff() TO greenhouse_runtime;

-- 1. seo_domain_overview_snapshots ────────────────────────────────────────────────────────────
ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  ADD COLUMN IF NOT EXISTS etv_methodology_version TEXT NOT NULL DEFAULT 'legacy_static_v1',
  ADD COLUMN IF NOT EXISTS etv_methodology_evidence TEXT NOT NULL DEFAULT 'contract_default_pre_cutoff',
  ADD COLUMN IF NOT EXISTS etv_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etv_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS etv_historical_basis TEXT;

ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_methodology_version_check,
  ADD CONSTRAINT seo_domain_overview_etv_methodology_version_check
    CHECK (etv_methodology_version IN ('legacy_static_v1', 'improved_layout_clickstream_v2')),
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_methodology_evidence_check,
  ADD CONSTRAINT seo_domain_overview_etv_methodology_evidence_check
    CHECK (etv_methodology_evidence IN ('explicit_request', 'contract_default_pre_cutoff')),
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_evidence_consistency_check,
  ADD CONSTRAINT seo_domain_overview_etv_evidence_consistency_check
    CHECK ((etv_methodology_evidence = 'explicit_request') = (etv_requested_at IS NOT NULL AND etv_policy_version IS NOT NULL)),
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_historical_basis_check,
  ADD CONSTRAINT seo_domain_overview_etv_historical_basis_check
    CHECK (
      etv_historical_basis IS NULL
      OR (etv_historical_basis IN ('fully_recomputed', 'calibrated_approximation')
          AND etv_methodology_version = 'improved_layout_clickstream_v2')
    ),
  DROP CONSTRAINT IF EXISTS seo_domain_overview_capture_method_unique,
  ADD CONSTRAINT seo_domain_overview_capture_method_unique
    UNIQUE (normalized_domain, location_code, language_code, capture_date, etv_methodology_version);

COMMENT ON COLUMN greenhouse_growth.seo_domain_overview_snapshots.etv_methodology_version IS
  'TASK-1805: fórmula ETV detrás de la fila (legacy_static_v1|improved_layout_clickstream_v2). Parte de la identidad: dos métodos pueden coexistir el mismo día; el mismo método no se duplica.';
COMMENT ON COLUMN greenhouse_growth.seo_domain_overview_snapshots.etv_methodology_evidence IS
  'TASK-1805: explicit_request (la request llevó use_improved_etv + requested_at + policy) o contract_default_pre_cutoff (atribuido por contrato: cuenta pre-2026-09-01 y código sin flag, siempre antes del corte). Nunca por fecha.';
COMMENT ON COLUMN greenhouse_growth.seo_domain_overview_snapshots.etv_requested_at IS
  'TASK-1805: instante UTC de la request explícita. Junto a la policy permite derivar el método efectivo; el proveedor no expone versión.';
COMMENT ON COLUMN greenhouse_growth.seo_domain_overview_snapshots.etv_policy_version IS
  'TASK-1805: versión de la policy con la que se tradujo configuración → parámetro → método efectivo.';
COMMENT ON COLUMN greenhouse_growth.seo_domain_overview_snapshots.etv_historical_basis IS
  'TASK-1805: sólo improved histórico. fully_recomputed desde 2026-07; calibrated_approximation antes (ratio de julio por dominio, no recomputación keyword por keyword).';

DROP TRIGGER IF EXISTS trg_seo_domain_overview_etv_cutoff_guard ON greenhouse_growth.seo_domain_overview_snapshots;
CREATE TRIGGER trg_seo_domain_overview_etv_cutoff_guard
  BEFORE INSERT ON greenhouse_growth.seo_domain_overview_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_seo_etv_methodology_cutoff();

-- 2. seo_url_visibility_snapshots ─────────────────────────────────────────────────────────────
ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  ADD COLUMN IF NOT EXISTS etv_methodology_version TEXT NOT NULL DEFAULT 'legacy_static_v1',
  ADD COLUMN IF NOT EXISTS etv_methodology_evidence TEXT NOT NULL DEFAULT 'contract_default_pre_cutoff',
  ADD COLUMN IF NOT EXISTS etv_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etv_policy_version TEXT;

ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_methodology_version_check,
  ADD CONSTRAINT seo_url_visibility_etv_methodology_version_check
    CHECK (etv_methodology_version IN ('legacy_static_v1', 'improved_layout_clickstream_v2')),
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_methodology_evidence_check,
  ADD CONSTRAINT seo_url_visibility_etv_methodology_evidence_check
    CHECK (etv_methodology_evidence IN ('explicit_request', 'contract_default_pre_cutoff')),
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_evidence_consistency_check,
  ADD CONSTRAINT seo_url_visibility_etv_evidence_consistency_check
    CHECK ((etv_methodology_evidence = 'explicit_request') = (etv_requested_at IS NOT NULL AND etv_policy_version IS NOT NULL)),
  DROP CONSTRAINT IF EXISTS seo_url_visibility_capture_method_unique,
  ADD CONSTRAINT seo_url_visibility_capture_method_unique
    UNIQUE (subject_kind, normalized_subject, location_code, language_code, capture_date, etv_methodology_version);

COMMENT ON COLUMN greenhouse_growth.seo_url_visibility_snapshots.etv_methodology_version IS
  'TASK-1805: fórmula ETV de la fila y de sus top_keywords (heredan del padre). Parte de la identidad por método.';
COMMENT ON COLUMN greenhouse_growth.seo_url_visibility_snapshots.etv_methodology_evidence IS
  'TASK-1805: explicit_request o contract_default_pre_cutoff (ver seo_domain_overview_snapshots).';
COMMENT ON COLUMN greenhouse_growth.seo_url_visibility_snapshots.etv_requested_at IS
  'TASK-1805: instante UTC de la request explícita.';
COMMENT ON COLUMN greenhouse_growth.seo_url_visibility_snapshots.etv_policy_version IS
  'TASK-1805: versión de la policy ETV aplicada.';

DROP TRIGGER IF EXISTS trg_seo_url_visibility_etv_cutoff_guard ON greenhouse_growth.seo_url_visibility_snapshots;
CREATE TRIGGER trg_seo_url_visibility_etv_cutoff_guard
  BEFORE INSERT ON greenhouse_growth.seo_url_visibility_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_seo_etv_methodology_cutoff();

-- 3. seo_prospect_diagnostics (cabecera: una request ranked_keywords = una fórmula por diagnóstico).
--    El hecho `estimated_monthly_traffic` hereda el método de su cabecera y lo declara además en
--    detail_json (etvMethodologyVersion + sampleRows/rowLimit/truncated); el CHECK del hecho entra en
--    el CONTRACT para no romper al escritor viejo. La idempotencia diaria NO cambia.
ALTER TABLE greenhouse_growth.seo_prospect_diagnostics
  ADD COLUMN IF NOT EXISTS etv_methodology_version TEXT NOT NULL DEFAULT 'legacy_static_v1',
  ADD COLUMN IF NOT EXISTS etv_methodology_evidence TEXT NOT NULL DEFAULT 'contract_default_pre_cutoff',
  ADD COLUMN IF NOT EXISTS etv_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etv_policy_version TEXT;

ALTER TABLE greenhouse_growth.seo_prospect_diagnostics
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_methodology_version_check,
  ADD CONSTRAINT seo_prospect_diagnostics_etv_methodology_version_check
    CHECK (etv_methodology_version IN ('legacy_static_v1', 'improved_layout_clickstream_v2')),
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_methodology_evidence_check,
  ADD CONSTRAINT seo_prospect_diagnostics_etv_methodology_evidence_check
    CHECK (etv_methodology_evidence IN ('explicit_request', 'contract_default_pre_cutoff')),
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_evidence_consistency_check,
  ADD CONSTRAINT seo_prospect_diagnostics_etv_evidence_consistency_check
    CHECK ((etv_methodology_evidence = 'explicit_request') = (etv_requested_at IS NOT NULL AND etv_policy_version IS NOT NULL));

COMMENT ON COLUMN greenhouse_growth.seo_prospect_diagnostics.etv_methodology_version IS
  'TASK-1805: fórmula ETV solicitada al proveedor para este diagnóstico; el hecho estimated_monthly_traffic la hereda.';
COMMENT ON COLUMN greenhouse_growth.seo_prospect_diagnostics.etv_methodology_evidence IS
  'TASK-1805: explicit_request o contract_default_pre_cutoff.';
COMMENT ON COLUMN greenhouse_growth.seo_prospect_diagnostics.etv_requested_at IS
  'TASK-1805: instante UTC de la request explícita.';
COMMENT ON COLUMN greenhouse_growth.seo_prospect_diagnostics.etv_policy_version IS
  'TASK-1805: versión de la policy ETV aplicada.';

DROP TRIGGER IF EXISTS trg_seo_prospect_diagnostics_etv_cutoff_guard ON greenhouse_growth.seo_prospect_diagnostics;
CREATE TRIGGER trg_seo_prospect_diagnostics_etv_cutoff_guard
  BEFORE INSERT OR UPDATE OF etv_methodology_version, etv_methodology_evidence, etv_requested_at
  ON greenhouse_growth.seo_prospect_diagnostics
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_seo_etv_methodology_cutoff();

-- 4. Anti pre-up-marker + verificación de lo que este expand PROMETE.
DO $$
DECLARE
  tbl text;
  col text;
  missing int;
  legacy_rows int;
  explicit_rows int;
  bad_evidence int;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['seo_domain_overview_snapshots', 'seo_url_visibility_snapshots', 'seo_prospect_diagnostics'] LOOP
    FOREACH col IN ARRAY ARRAY['etv_methodology_version', 'etv_methodology_evidence', 'etv_requested_at', 'etv_policy_version'] LOOP
      SELECT count(*) INTO missing
        FROM information_schema.columns
       WHERE table_schema = 'greenhouse_growth' AND table_name = tbl AND column_name = col;
      IF missing = 0 THEN
        RAISE EXCEPTION 'TASK-1805 anti pre-up-marker: %.% NO existe. Markers invertidos?', tbl, col;
      END IF;
    END LOOP;

    EXECUTE format(
      'SELECT count(*) FILTER (WHERE etv_methodology_version = %L AND etv_methodology_evidence = %L),
              count(*) FILTER (WHERE etv_methodology_evidence = %L),
              count(*) FILTER (WHERE etv_methodology_evidence = %L AND (etv_requested_at IS NOT NULL OR etv_policy_version IS NOT NULL))
         FROM greenhouse_growth.%I',
      'legacy_static_v1', 'contract_default_pre_cutoff', 'explicit_request', 'contract_default_pre_cutoff', tbl
    ) INTO legacy_rows, explicit_rows, bad_evidence;

    IF explicit_rows <> 0 OR bad_evidence <> 0 THEN
      RAISE EXCEPTION 'TASK-1805: % tiene filas con evidencia inconsistente tras el expand (explicit=%, bad=%).', tbl, explicit_rows, bad_evidence;
    END IF;

    RAISE NOTICE 'TASK-1805 expand %: % filas atribuidas legacy_static_v1 por contrato (pre-corte).', tbl, legacy_rows;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_domain_overview_capture_method_unique') THEN
    RAISE EXCEPTION 'TASK-1805: falta seo_domain_overview_capture_method_unique.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_url_visibility_capture_method_unique') THEN
    RAISE EXCEPTION 'TASK-1805: falta seo_url_visibility_capture_method_unique.';
  END IF;
  -- La UNIQUE legacy debe SEGUIR existiendo hasta el contract: los writers viejos la nombran.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_domain_overview_capture_unique')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_url_visibility_capture_unique') THEN
    RAISE EXCEPTION 'TASK-1805: la UNIQUE legacy desapareció en el expand; eso pertenece al contract.';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgname IN (
        'trg_seo_domain_overview_etv_cutoff_guard',
        'trg_seo_url_visibility_etv_cutoff_guard',
        'trg_seo_prospect_diagnostics_etv_cutoff_guard') AND NOT tgisinternal) <> 3 THEN
    RAISE EXCEPTION 'TASK-1805: faltan triggers de guard de corte.';
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_domain_overview_snapshots' AND column_name = 'etv_requested_at')
     <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'TASK-1805: etv_requested_at debe ser timestamptz (el corte es un instante UTC).';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_seo_prospect_diagnostics_etv_cutoff_guard ON greenhouse_growth.seo_prospect_diagnostics;
DROP TRIGGER IF EXISTS trg_seo_url_visibility_etv_cutoff_guard ON greenhouse_growth.seo_url_visibility_snapshots;
DROP TRIGGER IF EXISTS trg_seo_domain_overview_etv_cutoff_guard ON greenhouse_growth.seo_domain_overview_snapshots;

ALTER TABLE greenhouse_growth.seo_prospect_diagnostics
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_evidence_consistency_check,
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_methodology_evidence_check,
  DROP CONSTRAINT IF EXISTS seo_prospect_diagnostics_etv_methodology_version_check,
  DROP COLUMN IF EXISTS etv_policy_version,
  DROP COLUMN IF EXISTS etv_requested_at,
  DROP COLUMN IF EXISTS etv_methodology_evidence,
  DROP COLUMN IF EXISTS etv_methodology_version;

ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  DROP CONSTRAINT IF EXISTS seo_url_visibility_capture_method_unique,
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_evidence_consistency_check,
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_methodology_evidence_check,
  DROP CONSTRAINT IF EXISTS seo_url_visibility_etv_methodology_version_check,
  DROP COLUMN IF EXISTS etv_policy_version,
  DROP COLUMN IF EXISTS etv_requested_at,
  DROP COLUMN IF EXISTS etv_methodology_evidence,
  DROP COLUMN IF EXISTS etv_methodology_version;

ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  DROP CONSTRAINT IF EXISTS seo_domain_overview_capture_method_unique,
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_historical_basis_check,
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_evidence_consistency_check,
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_methodology_evidence_check,
  DROP CONSTRAINT IF EXISTS seo_domain_overview_etv_methodology_version_check,
  DROP COLUMN IF EXISTS etv_historical_basis,
  DROP COLUMN IF EXISTS etv_policy_version,
  DROP COLUMN IF EXISTS etv_requested_at,
  DROP COLUMN IF EXISTS etv_methodology_evidence,
  DROP COLUMN IF EXISTS etv_methodology_version;

DROP FUNCTION IF EXISTS greenhouse_growth.guard_seo_etv_methodology_cutoff();
