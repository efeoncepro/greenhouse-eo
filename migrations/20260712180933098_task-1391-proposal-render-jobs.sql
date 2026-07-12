-- Up Migration

-- ═══════════════════════════════════════════════════════════════════════════
-- TASK-1391 — Artifact Renderer: job record de render (append-only + idempotente)
--
-- `proposal_render_jobs` es el registro gobernado de cada render: qué manifest
-- EXACTO (hash sellado), para qué propuesta/propósito/audience, con qué
-- constraints del RFP fijadas, y su ciclo de vida. El worker (Cloud Run Job
-- `artifact-worker`, frontera autorizada 2026-07-12 por excepción documentada
-- de EPIC-027) SOLO ejecuta filas de esta tabla — nunca un plan mutable.
--
-- Invariantes duros (espejo del patrón TASK-1392/TASK-848):
--   · idempotencia canónica: UNIQUE (owner_org_id, proposal_id, manifest_hash,
--     artifact_purpose) — un retry reutiliza la fila, jamás un segundo asset.
--   · campos inmutables post-INSERT (manifest, hash, deadline, audience…).
--   · anti-DELETE: los jobs son evidencia, no se borran.
--   · historial `proposal_render_job_events` append-only.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_render_jobs (
  render_job_id text PRIMARY KEY DEFAULT ('prnd-' || gen_random_uuid()::text),
  owner_org_id text NOT NULL,
  proposal_id text NOT NULL,
  -- Propósito semántico del artefacto dentro de la propuesta (deck de oferta,
  -- preview interno…). Parte de la clave de idempotencia.
  artifact_purpose text NOT NULL CHECK (char_length(artifact_purpose) >= 3),
  audience text NOT NULL CHECK (audience IN ('internal', 'client_facing')),
  catalog_name text NOT NULL,
  output_target text NOT NULL,
  -- El ResolvedCompositionManifest COMPLETO, verbatim (domain-free: catálogo +
  -- plan + hashes). El audience/evidencia viven en columnas propias del job.
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[0-9a-f]{64}$'),
  -- Referencias de evidencia citadas por el artefacto, con su audience RESUELTO
  -- por la proyección allowlisted al encolar: [{"evidenceId","audience"}].
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Constraints del requisito-set FIJADAS al encolar (maxPdfMb, formats,
  -- maxPages, accessibilityRequired…). El worker falla cerrado contra esto.
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Deadline de la Proposal FIJADO al encolar (prioridad determinista).
  deadline timestamptz,
  state text NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'dispatched', 'running', 'completed', 'failed', 'dead_letter')),
  -- Código canónico del último fallo/rechazo (NULL si nunca falló):
  failure_code text
    CHECK (failure_code IS NULL OR failure_code IN (
      'audience_violation', 'accessibility_unsupported', 'semantic_rejected',
      'size_rejected', 'geometry_rejected', 'font_fallback_detected',
      'missing_asset', 'blank_slide', 'manifest_drift', 'render_error',
      'timeout', 'dispatch_error'
    )),
  failure_detail text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  dispatched_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  -- Nombre de la ejecución Cloud Run (auditoría cruzada con GCP).
  execution_name text,
  -- Outputs: asset canónico del PDF final + previews PNG + reporte de
  -- validadores/detectores de la ejecución que completó.
  output_pdf_asset_id text,
  output_preview_asset_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_report jsonb,
  requested_by_kind text NOT NULL CHECK (requested_by_kind IN ('member', 'system', 'cli')),
  requested_by_member_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_render_jobs_proposal_fk
    FOREIGN KEY (proposal_id) REFERENCES greenhouse_commercial.proposals (proposal_id),
  -- Un artefacto client_facing solo lo pide un member (gate humano también en DB).
  CONSTRAINT proposal_render_jobs_client_facing_requires_member
    CHECK (audience <> 'client_facing' OR (requested_by_kind = 'member' AND requested_by_member_id IS NOT NULL)),
  -- Completed con target PDF exige el asset final; failed/dead_letter exigen código.
  CONSTRAINT proposal_render_jobs_completed_has_output
    CHECK (state <> 'completed' OR output_pdf_asset_id IS NOT NULL OR output_target <> 'pdf-merged'),
  CONSTRAINT proposal_render_jobs_failed_has_code
    CHECK (state NOT IN ('failed', 'dead_letter') OR failure_code IS NOT NULL)
);

-- Clave de idempotencia canónica (Slice 0 · decisión 2): TODA la vida del job.
CREATE UNIQUE INDEX IF NOT EXISTS proposal_render_jobs_idempotency_uq
  ON greenhouse_commercial.proposal_render_jobs (owner_org_id, proposal_id, manifest_hash, artifact_purpose);

CREATE INDEX IF NOT EXISTS proposal_render_jobs_dispatch_idx
  ON greenhouse_commercial.proposal_render_jobs (state, deadline NULLS LAST, created_at)
  WHERE state = 'queued';

CREATE INDEX IF NOT EXISTS proposal_render_jobs_proposal_idx
  ON greenhouse_commercial.proposal_render_jobs (owner_org_id, proposal_id);

-- Historial append-only de transiciones.
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_render_job_events (
  event_id text PRIMARY KEY DEFAULT ('prje-' || gen_random_uuid()::text),
  render_job_id text NOT NULL
    REFERENCES greenhouse_commercial.proposal_render_jobs (render_job_id),
  owner_org_id text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'system', 'cli', 'worker', 'dispatcher')),
  actor_member_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_render_job_events_job_idx
  ON greenhouse_commercial.proposal_render_job_events (render_job_id, created_at DESC);

-- ── Triggers de gobernanza ──────────────────────────────────────────────────

-- Campos inmutables del job post-INSERT (el manifest y su contexto NUNCA mutan;
-- retry cambia estado/attempts, no el contrato).
CREATE OR REPLACE FUNCTION greenhouse_commercial.proposal_render_jobs_immutable_guard()
RETURNS trigger AS $$
BEGIN
  IF NEW.owner_org_id IS DISTINCT FROM OLD.owner_org_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
     OR NEW.artifact_purpose IS DISTINCT FROM OLD.artifact_purpose
     OR NEW.audience IS DISTINCT FROM OLD.audience
     OR NEW.catalog_name IS DISTINCT FROM OLD.catalog_name
     OR NEW.output_target IS DISTINCT FROM OLD.output_target
     OR NEW.manifest IS DISTINCT FROM OLD.manifest
     OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash
     OR NEW.evidence_refs IS DISTINCT FROM OLD.evidence_refs
     OR NEW.constraints IS DISTINCT FROM OLD.constraints
     OR NEW.deadline IS DISTINCT FROM OLD.deadline
     OR NEW.requested_by_kind IS DISTINCT FROM OLD.requested_by_kind
     OR NEW.requested_by_member_id IS DISTINCT FROM OLD.requested_by_member_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'TASK-1391: los campos de contrato de proposal_render_jobs son inmutables post-INSERT';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_render_jobs_immutable_trg ON greenhouse_commercial.proposal_render_jobs;
CREATE TRIGGER proposal_render_jobs_immutable_trg
  BEFORE UPDATE ON greenhouse_commercial.proposal_render_jobs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.proposal_render_jobs_immutable_guard();

-- Anti-DELETE en ambas tablas (evidencia operacional, no se borra).
CREATE OR REPLACE FUNCTION greenhouse_commercial.proposal_render_no_delete_guard()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TASK-1391: % es append-only — DELETE prohibido', TG_TABLE_NAME;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_render_jobs_no_delete_trg ON greenhouse_commercial.proposal_render_jobs;
CREATE TRIGGER proposal_render_jobs_no_delete_trg
  BEFORE DELETE ON greenhouse_commercial.proposal_render_jobs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.proposal_render_no_delete_guard();

DROP TRIGGER IF EXISTS proposal_render_job_events_no_delete_trg ON greenhouse_commercial.proposal_render_job_events;
CREATE TRIGGER proposal_render_job_events_no_delete_trg
  BEFORE DELETE ON greenhouse_commercial.proposal_render_job_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.proposal_render_no_delete_guard();

-- El historial además es inmutable (no UPDATE).
CREATE OR REPLACE FUNCTION greenhouse_commercial.proposal_render_job_events_immutable_guard()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TASK-1391: proposal_render_job_events es inmutable — UPDATE prohibido';
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_render_job_events_immutable_trg ON greenhouse_commercial.proposal_render_job_events;
CREATE TRIGGER proposal_render_job_events_immutable_trg
  BEFORE UPDATE ON greenhouse_commercial.proposal_render_job_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.proposal_render_job_events_immutable_guard();

-- ── Capability nueva: commercial.proposal.render (registry; catalog TS + grants
--    van en el mismo PR — coverage test lo enforcea) ─────────────────────────

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('commercial.proposal.render', 'commercial', ARRAY['read', 'execute'], ARRAY['organization', 'tenant'],
   'Solicitar/reintentar/leer jobs de render de artefactos de una Proposal (worker artifact-worker; audience client_facing exige member)', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE
  SET description = EXCLUDED.description, deprecated_at = NULL;

-- ── Anti pre-up-marker guard ────────────────────────────────────────────────

DO $$
DECLARE missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'greenhouse_commercial' AND table_name = 'proposal_render_jobs') THEN
    missing := missing || ' proposal_render_jobs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'greenhouse_commercial' AND table_name = 'proposal_render_job_events') THEN
    missing := missing || ' proposal_render_job_events';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'greenhouse_commercial' AND indexname = 'proposal_render_jobs_idempotency_uq') THEN
    missing := missing || ' idempotency_uq';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
                 WHERE capability_key = 'commercial.proposal.render') THEN
    missing := missing || ' capability_render';
  END IF;
  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1391 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

-- ── Grants (least privilege: runtime opera jobs, no borra) ──────────────────

GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.proposal_render_jobs TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_commercial.proposal_render_job_events TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS proposal_render_job_events_immutable_trg ON greenhouse_commercial.proposal_render_job_events;
DROP TRIGGER IF EXISTS proposal_render_job_events_no_delete_trg ON greenhouse_commercial.proposal_render_job_events;
DROP TRIGGER IF EXISTS proposal_render_jobs_no_delete_trg ON greenhouse_commercial.proposal_render_jobs;
DROP TRIGGER IF EXISTS proposal_render_jobs_immutable_trg ON greenhouse_commercial.proposal_render_jobs;
DROP FUNCTION IF EXISTS greenhouse_commercial.proposal_render_job_events_immutable_guard();
DROP FUNCTION IF EXISTS greenhouse_commercial.proposal_render_no_delete_guard();
DROP FUNCTION IF EXISTS greenhouse_commercial.proposal_render_jobs_immutable_guard();
DROP TABLE IF EXISTS greenhouse_commercial.proposal_render_job_events;
DROP TABLE IF EXISTS greenhouse_commercial.proposal_render_jobs;
UPDATE greenhouse_core.capabilities_registry
  SET deprecated_at = NOW()
  WHERE capability_key = 'commercial.proposal.render';
