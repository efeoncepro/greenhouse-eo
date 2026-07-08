-- Up Migration

-- TASK-1367 Slice 1 — Careers Apply Intake Service (split backend de TASK-354).
-- Additive-only sobre la foundation de TASK-353.
--  (a) candidate_facet: portafolio/LinkedIn como enlace (V1 links-only; el upload de archivo es TASK-1362).
--  (b) hiring_application_intake_events: ledger append-only para rate-limit (ventanas por email_hash/ip_hash)
--      + audit del intake público SIN PII cruda (solo hashes). Mirror del grader (grader_intake_events).
-- Consent + source columns ya existen en candidate_facet (TASK-353) — no se tocan.

-- (a) Enlaces de portafolio/LinkedIn (nullable, additive).
ALTER TABLE greenhouse_hiring.candidate_facet
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url  TEXT;

-- (b) Ledger append-only de eventos de intake público (sin PII: solo hashes salteados).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_application_intake_events (
  event_id           TEXT PRIMARY KEY DEFAULT ('haie-' || gen_random_uuid()::text),
  email_hash         TEXT,
  ip_hash            TEXT,
  opening_public_id  TEXT,
  outcome            TEXT NOT NULL CHECK (outcome IN ('accepted', 'rate_limited', 'captcha_failed', 'invalid', 'spam_rejected', 'not_open')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para el conteo de ventanas del rate-limit (por hash + día).
CREATE INDEX IF NOT EXISTS hiring_intake_email_window_idx
  ON greenhouse_hiring.hiring_application_intake_events (email_hash, created_at)
  WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS hiring_intake_ip_window_idx
  ON greenhouse_hiring.hiring_application_intake_events (ip_hash, created_at)
  WHERE ip_hash IS NOT NULL;

-- Anti pre-up-marker guard (ISSUE-068): aborta si el DDL no quedó aplicado.
DO $$
DECLARE col_count integer; tbl_exists boolean;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hiring' AND table_name = 'candidate_facet'
    AND column_name IN ('portfolio_url', 'linkedin_url');
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_application_intake_events'
  ) INTO tbl_exists;

  IF col_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1367 anti pre-up-marker: candidate_facet link columns NOT added (count=%).', col_count;
  END IF;
  IF NOT tbl_exists THEN
    RAISE EXCEPTION 'TASK-1367 anti pre-up-marker: hiring_application_intake_events NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- GRANTs (espeja TASK-353/1360). Ledger mutable → DML a runtime.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application_intake_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application_intake_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_application_intake_events TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_application_intake_events;
ALTER TABLE greenhouse_hiring.candidate_facet
  DROP COLUMN IF EXISTS portfolio_url,
  DROP COLUMN IF EXISTS linkedin_url;
