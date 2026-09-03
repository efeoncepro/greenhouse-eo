-- TASK-1806 Slice 0b — CONTRACT de la metodología ETV (cuerpo revisado de TASK-1805, parqueado en
-- docs/tasks/pending-migrations/ hasta hoy). Condiciones verificadas el 2026-09-03 antes de aplicar:
--   1. Release 5ec4cf769977 con los writers formula-aware en origin/main; Vercel Production y ops-worker
--      (rev 00635-tbt, env GROWTH_SEO_ETV_METHODOLOGY_VERSION=legacy_static_v1) sirven ese SHA.
--   2. CERO filas con evidencia contractual escritas DESPUÉS del release (las 5/8/2 de la ventana literal de
--      7 días son del 27-29 de agosto, anteriores al release: el código viejo ya no está desplegado).
--   3. Selectores explícitos en ambos runtimes (readback /health del worker: configuredWriteSource=env).
-- Aplicada por instrucción del operador («avanza end-to-end») como precondición del shadow de TASK-1806.
--
-- Up Migration

ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  ALTER COLUMN etv_methodology_version DROP DEFAULT,
  ALTER COLUMN etv_methodology_evidence DROP DEFAULT,
  DROP CONSTRAINT IF EXISTS seo_domain_overview_capture_unique;

ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  ALTER COLUMN etv_methodology_version DROP DEFAULT,
  ALTER COLUMN etv_methodology_evidence DROP DEFAULT,
  DROP CONSTRAINT IF EXISTS seo_url_visibility_capture_unique;

ALTER TABLE greenhouse_growth.seo_prospect_diagnostics
  ALTER COLUMN etv_methodology_version DROP DEFAULT,
  ALTER COLUMN etv_methodology_evidence DROP DEFAULT;

-- El hecho de tráfico estimado declara su metodología. NOT VALID: las filas anteriores al expand
-- heredan el método de su cabecera (seo_prospect_diagnostics.etv_methodology_version) y no se
-- reescriben (append-only); toda fila NUEVA queda sujeta al CHECK.
ALTER TABLE greenhouse_growth.seo_prospect_diagnostic_facts
  DROP CONSTRAINT IF EXISTS seo_prospect_facts_etv_methodology_check,
  ADD CONSTRAINT seo_prospect_facts_etv_methodology_check
    CHECK (
      kind <> 'estimated_monthly_traffic'
      OR (detail_json ? 'etvMethodologyVersion'
          AND detail_json ->> 'etvMethodologyVersion' IN ('legacy_static_v1', 'improved_layout_clickstream_v2'))
    ) NOT VALID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('seo_domain_overview_capture_unique', 'seo_url_visibility_capture_unique')) THEN
    RAISE EXCEPTION 'TASK-1805 contract: la UNIQUE legacy sigue existiendo.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_growth'
       AND table_name IN ('seo_domain_overview_snapshots', 'seo_url_visibility_snapshots', 'seo_prospect_diagnostics')
       AND column_name IN ('etv_methodology_version', 'etv_methodology_evidence')
       AND column_default IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'TASK-1805 contract: quedan DEFAULT transitorios.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_prospect_facts_etv_methodology_check') THEN
    RAISE EXCEPTION 'TASK-1805 contract: falta el CHECK del hecho ETV del prospecto.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.seo_prospect_diagnostic_facts
  DROP CONSTRAINT IF EXISTS seo_prospect_facts_etv_methodology_check;

ALTER TABLE greenhouse_growth.seo_prospect_diagnostics
  ALTER COLUMN etv_methodology_version SET DEFAULT 'legacy_static_v1',
  ALTER COLUMN etv_methodology_evidence SET DEFAULT 'contract_default_pre_cutoff';

ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  ALTER COLUMN etv_methodology_version SET DEFAULT 'legacy_static_v1',
  ALTER COLUMN etv_methodology_evidence SET DEFAULT 'contract_default_pre_cutoff';

ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  ALTER COLUMN etv_methodology_version SET DEFAULT 'legacy_static_v1',
  ALTER COLUMN etv_methodology_evidence SET DEFAULT 'contract_default_pre_cutoff';

-- Reponer la UNIQUE legacy sólo si NO hay coexistencia (falla explícita si la hay: no se borran filas).
ALTER TABLE greenhouse_growth.seo_url_visibility_snapshots
  ADD CONSTRAINT seo_url_visibility_capture_unique
    UNIQUE (subject_kind, normalized_subject, location_code, language_code, capture_date);

ALTER TABLE greenhouse_growth.seo_domain_overview_snapshots
  ADD CONSTRAINT seo_domain_overview_capture_unique
    UNIQUE (normalized_domain, location_code, language_code, capture_date);
