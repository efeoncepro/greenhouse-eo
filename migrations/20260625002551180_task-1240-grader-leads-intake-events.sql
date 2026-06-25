-- Up Migration
--
-- TASK-1240 — Growth AI Visibility · Public run intake: leads + abuse/cost counters (EPIC-020 B).
--
-- `grader_leads`: el lead capturado en el intake público (persona + email + consent →
-- HubSpot), entidad distinta del `grader_profile` (la marca medida). Consent append-only
-- (`consent_at`); el email crudo vive SOLO aquí (con consent), NUNCA viaja a providers.
-- `grader_intake_events`: log append-only de intentos del intake (con identificadores
-- HASHEADOS) para rate-limit (per-IP/per-email) + presupuesto global diario (cost guard).

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_leads (
  lead_id              TEXT PRIMARY KEY DEFAULT ('glead-' || gen_random_uuid()::text),
  email                TEXT NOT NULL,
  consent              BOOLEAN NOT NULL,
  consent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_name           TEXT NOT NULL,
  website_url          TEXT,
  market               TEXT NOT NULL,
  category             TEXT NOT NULL,
  industry             TEXT,
  persona              TEXT,
  company_size         TEXT,
  main_challenge       TEXT,
  competitors_declared TEXT[] NOT NULL DEFAULT '{}',
  run_id               TEXT REFERENCES greenhouse_growth.grader_runs(run_id),
  profile_id           TEXT REFERENCES greenhouse_growth.grader_profiles(profile_id),
  ip_hash              TEXT,
  source               TEXT NOT NULL DEFAULT 'public_intake',
  hubspot_synced_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Sólo se persiste un lead que consintió (defensa en profundidad; el command lo exige).
  CONSTRAINT grader_leads_consent_required CHECK (consent = TRUE)
);

CREATE INDEX IF NOT EXISTS grader_leads_email_idx ON greenhouse_growth.grader_leads (email);
CREATE INDEX IF NOT EXISTS grader_leads_run_idx ON greenhouse_growth.grader_leads (run_id);
CREATE INDEX IF NOT EXISTS grader_leads_hubspot_pending_idx
  ON greenhouse_growth.grader_leads (created_at) WHERE hubspot_synced_at IS NULL;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_intake_events (
  event_id            TEXT PRIMARY KEY DEFAULT ('gie-' || gen_random_uuid()::text),
  ip_hash             TEXT,
  email_hash          TEXT,
  run_id              TEXT REFERENCES greenhouse_growth.grader_runs(run_id),
  estimated_cost_usd  NUMERIC,
  -- 'accepted' | 'rate_limited' | 'cost_blocked' | 'captcha_failed' | 'invalid'
  outcome             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grader_intake_events_ip_idx ON greenhouse_growth.grader_intake_events (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS grader_intake_events_email_idx ON greenhouse_growth.grader_intake_events (email_hash, created_at);
CREATE INDEX IF NOT EXISTS grader_intake_events_window_idx ON greenhouse_growth.grader_intake_events (created_at);

-- Anti pre-up-marker: aborta si las tablas no quedaron creadas.
DO $$
DECLARE table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth' AND table_name IN ('grader_leads', 'grader_intake_events');

  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1240 anti pre-up-marker: expected 2 tables, got %. Markers invertidos.', table_count;
  END IF;
END
$$;

-- Ownership + GRANTs. `grader_leads`: DML (hubspot_synced_at se actualiza en EPIC-020 D).
-- `grader_intake_events`: append-only (SELECT/INSERT al runtime).
ALTER TABLE greenhouse_growth.grader_leads OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.grader_intake_events OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_leads TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_leads TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_leads TO greenhouse_migrator_user;

GRANT SELECT, INSERT ON greenhouse_growth.grader_intake_events TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_intake_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_intake_events TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_intake_events;
DROP TABLE IF EXISTS greenhouse_growth.grader_leads;
