-- Up Migration

-- TASK-1736 Slice 2 — Modelo de evidencia aditivo + reconciliación de identidad del candidato.
-- ADR vinculante: GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1 (D1/D3).
--
-- Dos tablas append-only en greenhouse_hiring:
-- 1. candidate_identity_intake_evidence — la capa `submitted` del ADR D1: lo que la persona
--    escribió, application-scoped e INMUTABLE, junto a las representaciones derivadas versionadas
--    (estructural, clasificación de casing, propuesta y search key). Resuelve la Open Question #2
--    del ADR: una sola fila por intake (evidencia + representaciones juntas), con dedupe
--    idempotente por application + identity + versión + digest del input.
-- 2. candidate_identity_display_audit — audit append-only de TODA reconciliación (fuente
--    `reconcile`) y corrección humana (fuente `human`) del display name. El "quién/cuándo/antes/
--    después/razón" vive acá; resuelve la Open Question #3 del ADR: audit local, SIN evento outbox
--    (ningún consumer downstream lo necesita hoy; agregarlo después es aditivo).
--
-- PII posture: estas tablas SÍ contienen nombres (evidencia y before/after del audit) — son DB
-- restringida con grants mínimos, NUNCA logs/eventos/métricas. El contrato no-PII aplica a
-- observabilidad, no al expediente.

-- ── 1. Evidencia de intake (append-only) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_hiring.candidate_identity_intake_evidence (
  evidence_id            TEXT PRIMARY KEY DEFAULT ('ciie-' || gen_random_uuid()::text),
  application_id         TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  identity_profile_id    TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  -- Evidencia: RAW exacto post-parser (trim exterior + cap). JAMÁS se muta ni se "corrige".
  submitted_full_name    TEXT NOT NULL CHECK (length(submitted_full_name) BETWEEN 1 AND 400),
  -- Representación display estructural (NFC + controles/bidi/zero-width fuera + whitespace).
  normalized_structural  TEXT NOT NULL CHECK (length(normalized_structural) BETWEEN 1 AND 400),
  -- Clasificación de casing de la policy versionada (dominio cerrado — espejo del TS).
  casing_classification  TEXT NOT NULL CHECK (casing_classification IN (
    'well_formed', 'degenerate_lower', 'degenerate_upper', 'mixed_ambiguous', 'non_latin', 'mononym'
  )),
  -- Propuesta de display SOLO para degenerados evidentes; NULL para el resto (la policy no adivina).
  proposed_display_name  TEXT NULL CHECK (proposed_display_name IS NULL OR length(proposed_display_name) BETWEEN 1 AND 400),
  search_key             TEXT NOT NULL,
  search_key_version     TEXT NOT NULL,
  normalization_version  TEXT NOT NULL,
  -- Digest del input raw (idempotencia; NUNCA sale de la DB).
  input_digest           TEXT NOT NULL CHECK (length(input_digest) = 64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotencia del write path (ADR §Robustness): retry del mismo intake = no-op (ON CONFLICT DO NOTHING).
CREATE UNIQUE INDEX IF NOT EXISTS candidate_identity_intake_evidence_dedupe_idx
  ON greenhouse_hiring.candidate_identity_intake_evidence
  (application_id, identity_profile_id, normalization_version, input_digest);

CREATE INDEX IF NOT EXISTS candidate_identity_intake_evidence_profile_idx
  ON greenhouse_hiring.candidate_identity_intake_evidence (identity_profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_candidate_identity_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'candidate_identity_intake_evidence es append-only (TASK-1736): % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_identity_intake_evidence_append_only
  ON greenhouse_hiring.candidate_identity_intake_evidence;
CREATE TRIGGER trg_candidate_identity_intake_evidence_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.candidate_identity_intake_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_candidate_identity_evidence_mutation();

ALTER TABLE greenhouse_hiring.candidate_identity_intake_evidence OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_hiring.candidate_identity_intake_evidence TO greenhouse_runtime;

-- ── 2. Audit de reconciliación/corrección de display (append-only) ───────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_hiring.candidate_identity_display_audit (
  audit_id             TEXT PRIMARY KEY DEFAULT ('cida-' || gen_random_uuid()::text),
  identity_profile_id  TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  -- Application origen del reconcile; NULL en correcciones humanas person-scoped.
  application_id       TEXT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  -- `human` = corrección de operador (capability-gated); `reconcile` = automatismo D3.
  source               TEXT NOT NULL CHECK (source IN ('human', 'reconcile')),
  -- `applied` = full_name mutado; `needs_review` = discrepancia sustantiva/CAS fallido, SIN mutar;
  -- `skipped` = no había nada que aplicar (precondición no elegible / sin propuesta / sin cambio).
  outcome              TEXT NOT NULL CHECK (outcome IN ('applied', 'needs_review', 'skipped')),
  before_full_name     TEXT NULL,
  after_full_name      TEXT NULL,
  -- Nombre que el automatismo habría propuesto (contexto para el humano en needs_review).
  proposed_full_name   TEXT NULL,
  reason               TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  -- Actor humano obligatorio para `human`; NULL para `reconcile` (automatismo del intake).
  actor_user_id        TEXT NULL,
  normalization_version TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT candidate_identity_display_audit_actor_check CHECK (
    (source = 'human' AND actor_user_id IS NOT NULL AND length(actor_user_id) > 0)
    OR source = 'reconcile'
  ),
  CONSTRAINT candidate_identity_display_audit_applied_check CHECK (
    outcome <> 'applied' OR after_full_name IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS candidate_identity_display_audit_profile_idx
  ON greenhouse_hiring.candidate_identity_display_audit (identity_profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_candidate_identity_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'candidate_identity_display_audit es append-only (TASK-1736): % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_identity_display_audit_append_only
  ON greenhouse_hiring.candidate_identity_display_audit;
CREATE TRIGGER trg_candidate_identity_display_audit_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.candidate_identity_display_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_candidate_identity_audit_mutation();

ALTER TABLE greenhouse_hiring.candidate_identity_display_audit OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_hiring.candidate_identity_display_audit TO greenhouse_runtime;

-- ── 3. Capability de corrección humana del display (Open Question #1: capability fina NUEVA) ─────
--
-- Por qué nueva y NO reusar `hiring.candidate.reveal_identity` (read de PII) ni
-- `hiring.application.annotate` (narrativa del expediente): corregir el display name de una Person
-- es un WRITE sobre `greenhouse_core.identity_profiles` — verbo y radio distintos. Grant tier
-- gobernanza role-only (EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS), patrón TASK-1714:
-- deliberadamente SIN routeGroup `internal` y NUNCA client_*.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.candidate.correct_display', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1736 — Corregir el display name de la identidad de un candidato (before-value + actor + reason >=5 chars + audit append-only; la evidencia submitted jamás se toca). Una corrección humana siempre gana sobre el automatismo de reconciliación. Grant role-only: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker guard (ISSUE-068): aborta si el DDL/seed no quedó aplicado de verdad.
DO $$
DECLARE evidence_ok boolean; audit_ok boolean; ev_trigger_ok boolean; audit_trigger_ok boolean;
        dedupe_ok boolean; cap_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'candidate_identity_intake_evidence'
  ) INTO evidence_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'candidate_identity_display_audit'
  ) INTO audit_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_candidate_identity_intake_evidence_append_only'
  ) INTO ev_trigger_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_candidate_identity_display_audit_append_only'
  ) INTO audit_trigger_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring' AND indexname = 'candidate_identity_intake_evidence_dedupe_idx'
  ) INTO dedupe_ok;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'hiring.candidate.correct_display' AND deprecated_at IS NULL
  ) INTO cap_ok;

  IF NOT evidence_ok OR NOT audit_ok OR NOT ev_trigger_ok OR NOT audit_trigger_ok OR NOT dedupe_ok OR NOT cap_ok THEN
    RAISE EXCEPTION 'TASK-1736 anti pre-up-marker check failed: evidence=% audit=% ev_trigger=% audit_trigger=% dedupe_idx=% capability=%',
      evidence_ok, audit_ok, ev_trigger_ok, audit_trigger_ok, dedupe_ok, cap_ok;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_candidate_identity_display_audit_append_only
  ON greenhouse_hiring.candidate_identity_display_audit;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_candidate_identity_audit_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.candidate_identity_display_audit;

DROP TRIGGER IF EXISTS trg_candidate_identity_intake_evidence_append_only
  ON greenhouse_hiring.candidate_identity_intake_evidence;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_candidate_identity_evidence_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.candidate_identity_intake_evidence;

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key = 'hiring.candidate.correct_display' AND deprecated_at IS NULL;
