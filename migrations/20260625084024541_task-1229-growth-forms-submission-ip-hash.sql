-- Up Migration

-- TASK-1229 — Rate-limit per-IP del motor Growth Forms sin guardar IP cruda.
-- Additive: columna ip_hash (sha256 salteado) en form_submission. El submit cuenta
-- submissions aceptadas por ip_hash/email_hash (ventana 1 día) vía el abuse-guard
-- core compartido (src/lib/growth/public-submission/abuse-guard.ts). NUNCA IP cruda.
ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS form_submission_ip_hash_idx
  ON greenhouse_growth.form_submission (ip_hash);

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'form_submission'
      AND column_name = 'ip_hash'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1229 anti pre-up-marker: form_submission.ip_hash NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.form_submission_ip_hash_idx;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS ip_hash;
