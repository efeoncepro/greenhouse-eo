-- Up Migration

-- TASK-1428 Slice 1-3 — Growth CTA suppression, exposure y kill switches: 3 tablas aditivas en
-- greenhouse_growth. Additive-only (no toca las 4 tablas foundation de TASK-1339).
--   1. cta_visitor_state    — estado pseudónimo por sujeto (visitor|session) para suppression/
--                             frequency capping server-side (arch §11 visitor state store).
--                             Solo hashes (mismo salt del dominio CTA); NUNCA identificadores crudos.
--   2. cta_exposure_rollup  — Tier B analítico AGREGADO por hora (arch §9.4 opción sampled/
--                             aggregates: jamás 1 fila OLTP por pageview; cardinalidad acotada
--                             por dims). Retención explícita corta (purga oportunista, ver adapter).
--   3. cta_kill_switch_event — kill switch global/per-surface append-only (arch §16.3): el estado
--                             vigente = último evento por scope; audit built-in + outbox in-tx.
-- Arch: GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md §§9.4, 11, 16.2, 16.3, 17, 20.

-- 1. cta_visitor_state — estado por (subject, cta). cta_id NULL = ventana global interruptiva
--    del sujeto (cap engine-level cross-CTA). subject_kind='session' es el fallback conservador
--    sin consentimiento durable (retención corta aplicada por el adapter de purga).
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_visitor_state (
  state_id              TEXT PRIMARY KEY DEFAULT ('cvst-' || gen_random_uuid()::text),
  subject_kind          TEXT NOT NULL CHECK (subject_kind IN ('visitor', 'session')),
  subject_hash          TEXT NOT NULL,
  cta_id                TEXT REFERENCES greenhouse_growth.cta_definition (cta_id) ON DELETE CASCADE,
  last_dismissed_at     TIMESTAMPTZ,
  dismiss_count         INTEGER NOT NULL DEFAULT 0,
  converted_at          TIMESTAMPTZ,
  -- Referencia de auditoría de la conversión verificada server-side (form_submission_id); sin PII.
  conversion_ref        TEXT,
  window_started_at     TIMESTAMPTZ,
  impressions_in_window INTEGER NOT NULL DEFAULT 0,
  last_impression_at    TIMESTAMPTZ,
  consent_state         TEXT CHECK (consent_state IS NULL OR consent_state IN ('granted', 'denied', 'unknown')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upsert determinista por sujeto+cta (cta_id NULL participa como valor: ventana global).
CREATE UNIQUE INDEX IF NOT EXISTS cta_visitor_state_subject_idx
  ON greenhouse_growth.cta_visitor_state (subject_kind, subject_hash, cta_id) NULLS NOT DISTINCT;

-- Purga por retención (session corta / visitor acotada) barre por antigüedad.
CREATE INDEX IF NOT EXISTS cta_visitor_state_retention_idx
  ON greenhouse_growth.cta_visitor_state (subject_kind, updated_at);

DROP TRIGGER IF EXISTS trg_cta_visitor_state_touch ON greenhouse_growth.cta_visitor_state;
CREATE TRIGGER trg_cta_visitor_state_touch
  BEFORE UPDATE ON greenhouse_growth.cta_visitor_state
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- 2. cta_exposure_rollup — agregados horarios Tier B. reason_class es enum cerrado (defensa en
--    profundidad del allowlist sanitizado; extender = migración). enforced separa shadow (false)
--    de enforcement real (true) para el shadow-compare del rollout.
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_exposure_rollup (
  rollup_id       TEXT PRIMARY KEY DEFAULT ('cexp-' || gen_random_uuid()::text),
  bucket_start    TIMESTAMPTZ NOT NULL,
  cta_id          TEXT REFERENCES greenhouse_growth.cta_definition (cta_id) ON DELETE CASCADE,
  surface_id      TEXT REFERENCES greenhouse_growth.cta_surface_binding (surface_id) ON DELETE CASCADE,
  placement       TEXT,
  exposure_kind   TEXT NOT NULL CHECK (exposure_kind IN ('eligible', 'suppressed', 'viewed')),
  reason_class    TEXT CHECK (
    reason_class IS NULL OR reason_class IN (
      'dismissed', 'frequency_capped', 'already_converted', 'higher_priority_selected',
      'surface_killed', 'global_killed', 'consent_or_identity_limited',
      'placement_not_supported', 'policy_invalid', 'runtime_degraded'
    )
  ),
  decision_source TEXT NOT NULL CHECK (decision_source IN ('server', 'browser')),
  enforced        BOOLEAN NOT NULL DEFAULT FALSE,
  observed_count  INTEGER NOT NULL DEFAULT 0,
  estimated_count NUMERIC(14, 2) NOT NULL DEFAULT 0,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cta_exposure_rollup_dims_idx
  ON greenhouse_growth.cta_exposure_rollup
    (bucket_start, cta_id, surface_id, placement, exposure_kind, reason_class, decision_source, enforced)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS cta_exposure_rollup_bucket_idx
  ON greenhouse_growth.cta_exposure_rollup (bucket_start DESC);

-- 3. cta_kill_switch_event — append-only (engage|release); el estado vigente es el último evento
--    por scope. reason obligatorio (audit); actor_ref = identidad del operador interno.
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_kill_switch_event (
  kill_event_id TEXT PRIMARY KEY DEFAULT ('cksw-' || gen_random_uuid()::text),
  scope         TEXT NOT NULL CHECK (scope IN ('global', 'surface')),
  surface_id    TEXT REFERENCES greenhouse_growth.cta_surface_binding (surface_id) ON DELETE RESTRICT,
  action        TEXT NOT NULL CHECK (action IN ('engage', 'release')),
  reason        TEXT NOT NULL CHECK (char_length(btrim(reason)) >= 5),
  actor_ref     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cta_kill_switch_scope_surface CHECK ((scope = 'global') = (surface_id IS NULL))
);

CREATE INDEX IF NOT EXISTS cta_kill_switch_event_scope_idx
  ON greenhouse_growth.cta_kill_switch_event (scope, surface_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_growth.block_cta_kill_switch_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.cta_kill_switch_event es append-only (TASK-1428): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_cta_kill_switch_event_immutable ON greenhouse_growth.cta_kill_switch_event;
CREATE TRIGGER trg_cta_kill_switch_event_immutable
  BEFORE UPDATE OR DELETE ON greenhouse_growth.cta_kill_switch_event
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_cta_kill_switch_event_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si las 3 tablas o el unique de visitor state
-- no quedaron creados.
DO $$
DECLARE
  table_count INTEGER;
  subject_idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('cta_visitor_state', 'cta_exposure_rollup', 'cta_kill_switch_event');

  IF table_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1428 anti pre-up-marker: expected 3 tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO subject_idx_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_growth' AND indexname = 'cta_visitor_state_subject_idx';

  IF subject_idx_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1428 anti pre-up-marker: unique index cta_visitor_state_subject_idx missing.';
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-1339).
ALTER TABLE greenhouse_growth.cta_visitor_state OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.cta_exposure_rollup OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.cta_kill_switch_event OWNER TO greenhouse_ops;

-- visitor_state: upsert + purga oportunista de retención ⇒ full DML.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_visitor_state TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_visitor_state TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_visitor_state TO greenhouse_migrator_user;
-- exposure_rollup: upsert increment + purga de retención ⇒ full DML.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_exposure_rollup TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_exposure_rollup TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_exposure_rollup TO greenhouse_migrator_user;
-- kill switch ledger: solo SELECT/INSERT para runtime (trigger bloquea UPDATE/DELETE).
GRANT SELECT, INSERT ON greenhouse_growth.cta_kill_switch_event TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.cta_kill_switch_event TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_kill_switch_event TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_cta_kill_switch_event_mutation() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.cta_kill_switch_event CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.cta_exposure_rollup CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.cta_visitor_state CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_cta_kill_switch_event_mutation() CASCADE;
