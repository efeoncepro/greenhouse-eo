-- Up Migration

-- TASK-1255 — Growth Forms PII Hardening (Ley 21.719).
-- Postura tiered: national_id (cédula) = cifrado at-rest application-layer (AES-256-GCM,
-- key en GCP Secret Manager), movido FUERA de normalized_fields_json a una columna
-- dedicada `encrypted_fields_json` (boundary: el dispatcher lee normalized_fields_json,
-- así que national_id físicamente no puede viajar a HubSpot). email/teléfono quedan en
-- claro en normalized_fields_json (contrato downstream) pero enmascarados en lectura admin.
-- Reveal gobernado (capability + reason + audit) replica el patrón person-legal-profile.

-- 1. Columna cifrada en form_submission. Map fieldKey → envelope
--    { v, alg, ciphertext, iv, tag, mask, country }. national_id sale del blob en claro.
ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS encrypted_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. lead_pii_reveal_audit — trail append-only de cada reveal de PII cruda (cédula).
--    NUNCA guarda el valor crudo: solo qué campos se revelaron + actor + reason + ip.
CREATE TABLE IF NOT EXISTS greenhouse_growth.lead_pii_reveal_audit (
  audit_id        TEXT PRIMARY KEY DEFAULT ('lpra-' || gen_random_uuid()::text),
  submission_id   TEXT NOT NULL REFERENCES greenhouse_growth.form_submission (submission_id) ON DELETE RESTRICT,
  form_id         TEXT NOT NULL REFERENCES greenhouse_growth.form_definition (form_id) ON DELETE RESTRICT,
  action          TEXT NOT NULL DEFAULT 'revealed_pii'
                    CHECK (action IN ('revealed_pii')),
  actor_user_id   TEXT NOT NULL,
  actor_email     TEXT,
  reason          TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  diff_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_pii_reveal_audit_submission_idx
  ON greenhouse_growth.lead_pii_reveal_audit (submission_id);
CREATE INDEX IF NOT EXISTS lead_pii_reveal_audit_actor_created_idx
  ON greenhouse_growth.lead_pii_reveal_audit (actor_user_id, created_at DESC);

-- 3. Trigger anti-UPDATE/DELETE (append-only: el rastro del reveal nunca se borra).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_lead_pii_reveal_audit_mutation()
  RETURNS TRIGGER AS $fn$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.lead_pii_reveal_audit es append-only (TASK-1255): % bloqueado.', TG_OP;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_pii_reveal_audit_append_only ON greenhouse_growth.lead_pii_reveal_audit;
CREATE TRIGGER trg_lead_pii_reveal_audit_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.lead_pii_reveal_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_lead_pii_reveal_audit_mutation();

-- 4. Anti pre-up-marker bug guard: aborta si los objetos esperados NO quedaron creados.
DO $$
DECLARE
  has_column boolean;
  has_audit_table boolean;
  has_trigger boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'form_submission'
      AND column_name = 'encrypted_fields_json'
  ) INTO has_column;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'lead_pii_reveal_audit'
  ) INTO has_audit_table;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_lead_pii_reveal_audit_append_only'
  ) INTO has_trigger;

  IF NOT has_column THEN
    RAISE EXCEPTION 'TASK-1255 anti pre-up-marker check: form_submission.encrypted_fields_json NOT created. Markers may be inverted.';
  END IF;

  IF NOT has_audit_table THEN
    RAISE EXCEPTION 'TASK-1255 anti pre-up-marker check: lead_pii_reveal_audit NOT created. Markers may be inverted.';
  END IF;

  IF NOT has_trigger THEN
    RAISE EXCEPTION 'TASK-1255 anti pre-up-marker check: append-only trigger NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- 5. Ownership + GRANTs (espeja TASK-1229).
ALTER TABLE greenhouse_growth.lead_pii_reveal_audit OWNER TO greenhouse_ops;

-- audit: SELECT/INSERT (UPDATE/DELETE bloqueado por trigger — defensa en profundidad).
GRANT SELECT, INSERT ON greenhouse_growth.lead_pii_reveal_audit TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.lead_pii_reveal_audit TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.lead_pii_reveal_audit TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_lead_pii_reveal_audit_mutation() TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS trg_lead_pii_reveal_audit_append_only ON greenhouse_growth.lead_pii_reveal_audit;
DROP TABLE IF EXISTS greenhouse_growth.lead_pii_reveal_audit CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_lead_pii_reveal_audit_mutation() CASCADE;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS encrypted_fields_json;
