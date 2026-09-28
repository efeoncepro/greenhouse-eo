-- Up Migration

-- TASK-1921 Slice 1 — cola de render de las piezas de marca de Efeonce (La órbita por superficie y Glitch).
--
-- Dueño: Greenhouse por ahora (decisión del operador, 2026-09-28); después Marketing Studio o Globe. Por eso el schema
-- es propio (`greenhouse_brand`) y nada de estas tablas se referencia desde otro dominio: extraer el dueño es mover
-- el schema y el command, no desenredar FKs.
--
-- Dos niveles, como Insights (TASK-1846):
--   · brand_render_requests = lo que se pidió (pieza, documento o edición), con su clave de idempotencia
--   · brand_render_jobs     = una salida por catálogo: la unidad que el `artifact-worker` reclama y reintenta sola
-- Una edición de Glitch pide hasta tres catálogos (carrusel, sueltas, overlays): si falla uno, los otros se conservan.
--
-- El manifiesto sellado al encolar es inmutable: el worker renderiza exactamente ese input y compara su hash.

CREATE SCHEMA IF NOT EXISTS greenhouse_brand;
ALTER SCHEMA greenhouse_brand OWNER TO greenhouse_ops;
GRANT USAGE ON SCHEMA greenhouse_brand TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_brand TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_brand TO greenhouse_migrator_user;

CREATE OR REPLACE FUNCTION greenhouse_brand.assert_brand_render_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% es append-only: un pedido de render de marca no se borra (cancelled es un estado, no DELETE)', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION greenhouse_brand.assert_brand_render_no_delete() OWNER TO greenhouse_ops;

CREATE OR REPLACE FUNCTION greenhouse_brand.assert_brand_render_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% es append-only: un evento de render no se modifica', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION greenhouse_brand.assert_brand_render_append_only() OWNER TO greenhouse_ops;

CREATE TABLE IF NOT EXISTS greenhouse_brand.brand_render_requests (
  request_id text PRIMARY KEY DEFAULT ('brq-' || gen_random_uuid()::text),
  -- Organización dueña del pedido (Efeonce en marca propia). El command la valida contra el actor.
  organization_id text NOT NULL,
  -- Qué se pidió: una pieza de La órbita, un documento (brochure/propuesta) o una edición de Glitch.
  family text NOT NULL CHECK (family IN ('graphic_line_piece', 'graphic_line_document', 'glitch_edition')),
  -- sha256(intent canónico + assetIds de plates/fotos + versiones AXIS). Mismo pedido ⇒ mismo request.
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  -- Resumen sin datos sensibles (receta, uso, número de edición…): para listar y auditar sin abrir el manifiesto.
  request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Plates y fotos referenciados por assetId (uploader canónico); nunca una ruta local.
  source_asset_ids text[] NOT NULL DEFAULT '{}',
  axis_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'running', 'completed', 'partial_failed', 'failed', 'cancelled')),
  requested_by_kind text NOT NULL CHECK (requested_by_kind IN ('member', 'agent', 'system', 'cli')),
  requested_by_user_id text,
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_render_requests_cancelled_has_timestamp
    CHECK (state <> 'cancelled' OR cancelled_at IS NOT NULL)
);
ALTER TABLE greenhouse_brand.brand_render_requests OWNER TO greenhouse_ops;

CREATE UNIQUE INDEX IF NOT EXISTS brand_render_requests_idempotency_uq
  ON greenhouse_brand.brand_render_requests (organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS brand_render_requests_org_idx
  ON greenhouse_brand.brand_render_requests (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_brand.brand_render_jobs (
  job_id text PRIMARY KEY DEFAULT ('brj-' || gen_random_uuid()::text),
  request_id text NOT NULL,
  organization_id text NOT NULL,
  catalog_name text NOT NULL CHECK (catalog_name IN (
    'graphic-line-deck', 'graphic-line-stills', 'graphic-line-overlays',
    'glitch-carousel', 'glitch-stills', 'glitch-overlays'
  )),
  output_target text NOT NULL CHECK (output_target IN ('pdf-merged', 'png-set')),
  artifact_id text NOT NULL,
  -- `{ input }` del plan (CompositionPlanInput) + su hash: el worker resuelve el catálogo y compara el input emitido.
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[0-9a-f]{64}$'),
  -- Qué assets externos materializar y de dónde (assetIds), sin bytes.
  asset_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  deadline timestamptz,
  state text NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'running', 'completed', 'failed', 'dead_letter', 'cancelled')),
  failure_code text
    CHECK (failure_code IS NULL OR failure_code IN (
      'semantic_rejected', 'size_rejected', 'geometry_rejected', 'font_fallback_detected', 'missing_asset',
      'blank_slide', 'manifest_drift', 'render_error', 'timeout', 'dispatch_error', 'cancelled'
    )),
  failure_detail text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  lease_expires_at timestamptz,
  -- Monotónico por fila: sube en cada claim; finalizar con un token viejo no escribe nada (patrón TASK-1846).
  fence_token bigint NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  execution_name text,
  -- Un PDF (pdf-merged) o N PNG (png-set): cada uno es un asset versionado; nunca se sobreescribe.
  output_asset_ids text[] NOT NULL DEFAULT '{}',
  output_report jsonb,
  -- Procedencia del asset: versiones AXIS del Job, receta, hashes del input y de cada fuente, jobId, actor.
  provenance jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_render_jobs_request_fk
    FOREIGN KEY (request_id) REFERENCES greenhouse_brand.brand_render_requests (request_id),
  CONSTRAINT brand_render_jobs_completed_has_assets
    CHECK (state <> 'completed' OR cardinality(output_asset_ids) > 0),
  CONSTRAINT brand_render_jobs_completed_has_provenance
    CHECK (state <> 'completed' OR provenance IS NOT NULL),
  CONSTRAINT brand_render_jobs_failed_has_code
    CHECK (state NOT IN ('failed', 'dead_letter') OR failure_code IS NOT NULL)
);
ALTER TABLE greenhouse_brand.brand_render_jobs OWNER TO greenhouse_ops;

-- Un job por (pedido, catálogo): el retry reusa la fila (attempts+1), nunca crea otra.
CREATE UNIQUE INDEX IF NOT EXISTS brand_render_jobs_identity_uq
  ON greenhouse_brand.brand_render_jobs (request_id, catalog_name);

CREATE INDEX IF NOT EXISTS brand_render_jobs_claim_idx
  ON greenhouse_brand.brand_render_jobs (state, deadline NULLS LAST, created_at)
  WHERE state = 'queued';

CREATE INDEX IF NOT EXISTS brand_render_jobs_reclaim_idx
  ON greenhouse_brand.brand_render_jobs (state, lease_expires_at)
  WHERE state = 'running';

CREATE TABLE IF NOT EXISTS greenhouse_brand.brand_render_events (
  render_event_id bigserial PRIMARY KEY,
  job_id text,
  request_id text NOT NULL,
  organization_id text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'agent', 'system', 'cli', 'worker', 'dispatcher')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE greenhouse_brand.brand_render_events OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS brand_render_events_request_idx
  ON greenhouse_brand.brand_render_events (request_id, created_at);

DROP TRIGGER IF EXISTS brand_render_requests_no_delete_trg ON greenhouse_brand.brand_render_requests;
CREATE TRIGGER brand_render_requests_no_delete_trg
  BEFORE DELETE ON greenhouse_brand.brand_render_requests
  FOR EACH ROW EXECUTE FUNCTION greenhouse_brand.assert_brand_render_no_delete();

DROP TRIGGER IF EXISTS brand_render_jobs_no_delete_trg ON greenhouse_brand.brand_render_jobs;
CREATE TRIGGER brand_render_jobs_no_delete_trg
  BEFORE DELETE ON greenhouse_brand.brand_render_jobs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_brand.assert_brand_render_no_delete();

DROP TRIGGER IF EXISTS brand_render_events_no_delete_trg ON greenhouse_brand.brand_render_events;
CREATE TRIGGER brand_render_events_no_delete_trg
  BEFORE DELETE ON greenhouse_brand.brand_render_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_brand.assert_brand_render_no_delete();

DROP TRIGGER IF EXISTS brand_render_events_append_only_trg ON greenhouse_brand.brand_render_events;
CREATE TRIGGER brand_render_events_append_only_trg
  BEFORE UPDATE ON greenhouse_brand.brand_render_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_brand.assert_brand_render_append_only();

GRANT SELECT, INSERT, UPDATE ON greenhouse_brand.brand_render_requests TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_brand.brand_render_jobs TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_brand.brand_render_events TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_brand.brand_render_events_render_event_id_seq TO greenhouse_runtime;

-- Capabilities (Slice 2 las usa): pedir y leer piezas de marca. Grant en src/lib/entitlements/runtime.ts.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('brand_render.request.create', 'brand_render', ARRAY['create'], ARRAY['organization', 'tenant'],
   'TASK-1921 — pedir el render de una pieza de marca (La órbita por superficie o una edición de Glitch).', NOW(), NULL),
  ('brand_render.request.read', 'brand_render', ARRAY['read'], ARRAY['organization', 'tenant'],
   'TASK-1921 — leer el estado de un pedido de render de marca y descargar sus piezas.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: si el Up no corrió de verdad, aborta en vez de registrar la migración en silencio.
DO $$
DECLARE missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_brand' AND table_name = 'brand_render_requests')
    THEN missing := missing || ' brand_render_requests'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_brand' AND table_name = 'brand_render_jobs')
    THEN missing := missing || ' brand_render_jobs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_brand' AND table_name = 'brand_render_events')
    THEN missing := missing || ' brand_render_events'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_brand' AND indexname = 'brand_render_requests_idempotency_uq')
    THEN missing := missing || ' brand_render_requests_idempotency_uq'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_brand' AND indexname = 'brand_render_jobs_identity_uq')
    THEN missing := missing || ' brand_render_jobs_identity_uq'; END IF;
  IF (SELECT count(*) FROM greenhouse_core.capabilities_registry
    WHERE capability_key IN ('brand_render.request.create', 'brand_render.request.read') AND deprecated_at IS NULL) <> 2
    THEN missing := missing || ' capabilities brand_render.*'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1921 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

-- Down Migration

-- SOLO undo. greenhouse-pg-dev SIRVE PRODUCCIÓN (ISSUE-161): correr este down exige autorización del operador.
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key IN ('brand_render.request.create', 'brand_render.request.read');
DROP TRIGGER IF EXISTS brand_render_events_append_only_trg ON greenhouse_brand.brand_render_events;
DROP TRIGGER IF EXISTS brand_render_events_no_delete_trg ON greenhouse_brand.brand_render_events;
DROP TRIGGER IF EXISTS brand_render_jobs_no_delete_trg ON greenhouse_brand.brand_render_jobs;
DROP TRIGGER IF EXISTS brand_render_requests_no_delete_trg ON greenhouse_brand.brand_render_requests;
DROP TABLE IF EXISTS greenhouse_brand.brand_render_events;
DROP TABLE IF EXISTS greenhouse_brand.brand_render_jobs;
DROP TABLE IF EXISTS greenhouse_brand.brand_render_requests;
DROP FUNCTION IF EXISTS greenhouse_brand.assert_brand_render_append_only();
DROP FUNCTION IF EXISTS greenhouse_brand.assert_brand_render_no_delete();
DROP SCHEMA IF EXISTS greenhouse_brand;
