-- Up Migration

SET search_path TO public, greenhouse_growth;

-- TASK-1250 — Ledger de idempotencia DB-level del email de entrega del informe del
-- AI Visibility Grader. Un snapshot reportable genera COMO MÁXIMO un email principal por
-- (report_id, email_type): el snapshot es inmutable + versionado, así que `report_id` es la
-- clave de idempotencia canónica. El reactive consumer reclama el slot con
-- INSERT ... ON CONFLICT antes de enviar → disparos concurrentes (worker publish + retry)
-- NUNCA doble-envían. `lead_id` queda para trazabilidad (1 report → 1 run → 1 lead).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_report_email_dispatches (
  dispatch_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             TEXT         NOT NULL REFERENCES greenhouse_growth.grader_runs(run_id),
  report_id          TEXT         NOT NULL REFERENCES greenhouse_growth.grader_reports(report_id),
  lead_id            TEXT         NOT NULL,
  email_type         TEXT         NOT NULL DEFAULT 'ai_visibility_grader_report',
  recipient_email    TEXT         NOT NULL,
  status             TEXT         NOT NULL DEFAULT 'claimed',
  reason             TEXT,
  resend_message_id  TEXT,
  claimed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  sent_at            TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_report_email_dispatches_status_check
    CHECK (status IN ('claimed', 'sent', 'failed', 'skipped'))
);

-- Idempotencia DB-level: una fila por (report_id, email_type). El claim del consumer
-- (INSERT ON CONFLICT DO UPDATE WHERE failed/stale) usa este índice como guard atómico.
CREATE UNIQUE INDEX IF NOT EXISTS grader_report_email_dispatches_report_type_uniq
  ON greenhouse_growth.grader_report_email_dispatches (report_id, email_type);

CREATE INDEX IF NOT EXISTS grader_report_email_dispatches_run_idx
  ON greenhouse_growth.grader_report_email_dispatches (run_id);

-- Lectura del reliability signal (failures / dead-letter / claims colgados).
CREATE INDEX IF NOT EXISTS grader_report_email_dispatches_status_idx
  ON greenhouse_growth.grader_report_email_dispatches (status, updated_at);

-- Kill-switch row del nuevo email type (default enabled = no pausado; el gate real de
-- production send es el env flag GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED, default OFF).
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
VALUES ('ai_visibility_grader_report', TRUE)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker: aborta si la tabla no quedó creada.
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_report_email_dispatches'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1250 anti pre-up-marker: grader_report_email_dispatches NOT created. Markers invertidos.';
  END IF;
END
$$;

-- Ownership + GRANTs. DML al runtime (claim/mark del dispatch).
ALTER TABLE greenhouse_growth.grader_report_email_dispatches OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_email_dispatches TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_email_dispatches TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_report_email_dispatches TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_report_email_dispatches;
