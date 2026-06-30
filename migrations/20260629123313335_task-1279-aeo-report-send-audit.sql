-- Up Migration

SET search_path TO public, greenhouse_growth;

-- TASK-1279 — Audit append-only del envío operador del informe AEO + creación del Lead HubSpot
-- (cross-sell gobernado). Una fila por DECISIÓN de envío del operador (run × recipient). El objeto
-- comercial creado es un Lead de HubSpot (objeto `leads`), NUNCA un Deal. Idempotencia por
-- (run_id, lower(recipient_email)): el command no doble-envía al mismo destinatario para el mismo run.
-- `email_status`/`lead_status` los muta el reactive consumer (lane ops-reactive-growth) de forma
-- independiente e idempotente; la fila no se borra (append-only a nivel de evento de envío).
-- `recipient_email` se persiste crudo (necesidad operativa: enviar + asociar el contacto HubSpot),
-- consistente con greenhouse_growth.grader_report_email_dispatches.recipient_email — PG interno,
-- NUNCA cruza al outbox (PII-free), al cliente, a Sentry ni a logs externos.
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_report_send_log (
  send_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               TEXT         NOT NULL REFERENCES greenhouse_growth.grader_runs(run_id),
  organization_id      TEXT         NOT NULL,
  recipient_email      TEXT         NOT NULL,
  recipient_name       TEXT,
  -- Tipo comercial del Lead: cliente con relación (expansion) vs prospecto (new_business).
  -- DERIVADO server-side del organization_type (NUNCA confiar en el operador para el consent gate).
  lead_type            TEXT         NOT NULL,
  -- Base legal del envío. Prospecto: 'legitimate_interest' (+ consent_ref obligatorio).
  -- Cliente con relación activa: 'service_relationship' (sin consent explícito).
  legal_basis          TEXT         NOT NULL,
  -- Referencia al consentimiento capturado (post-conversación) — NO el PII crudo del consentimiento.
  consent_ref          TEXT,
  requested_by         TEXT         NOT NULL,
  email_status         TEXT         NOT NULL DEFAULT 'pending',
  lead_status          TEXT         NOT NULL DEFAULT 'pending',
  hubspot_lead_id      TEXT,
  hubspot_contact_id   TEXT,
  hubspot_company_id   TEXT,
  resend_message_id    TEXT,
  reason               TEXT,
  requested_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_report_send_log_lead_type_check
    CHECK (lead_type IN ('expansion', 'new_business')),
  CONSTRAINT grader_report_send_log_legal_basis_check
    CHECK (legal_basis IN ('legitimate_interest', 'service_relationship')),
  CONSTRAINT grader_report_send_log_email_status_check
    CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT grader_report_send_log_lead_status_check
    CHECK (lead_status IN ('pending', 'created', 'failed', 'skipped')),
  -- Consent gate duro a nivel DB (defense-in-depth del 422 del command): interés legítimo
  -- (prospecto) SIEMPRE exige una referencia de consentimiento no vacía.
  CONSTRAINT grader_report_send_log_consent_required
    CHECK (legal_basis <> 'legitimate_interest' OR (consent_ref IS NOT NULL AND length(btrim(consent_ref)) > 0))
);

-- Idempotencia DB-level: una fila por (run_id, email normalizado). El claim del command
-- (INSERT ON CONFLICT DO NOTHING) usa este índice como guard atómico → no doble-envío.
CREATE UNIQUE INDEX IF NOT EXISTS grader_report_send_log_run_recipient_uniq
  ON greenhouse_growth.grader_report_send_log (run_id, lower(recipient_email));

CREATE INDEX IF NOT EXISTS grader_report_send_log_org_idx
  ON greenhouse_growth.grader_report_send_log (organization_id);

-- Lectura de los reliability signals (envíos / leads fallidos).
CREATE INDEX IF NOT EXISTS grader_report_send_log_status_idx
  ON greenhouse_growth.grader_report_send_log (email_status, lead_status, updated_at);

-- Anti pre-up-marker: aborta si la tabla no quedó creada (markers invertidos).
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_report_send_log'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1279 anti pre-up-marker: grader_report_send_log NOT created. Markers invertidos.';
  END IF;
END
$$;

-- Ownership + GRANTs. DML al runtime (claim del command + mark del reactive consumer).
ALTER TABLE greenhouse_growth.grader_report_send_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_send_log TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_send_log TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_report_send_log TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_report_send_log;
