-- Up Migration

-- TASK-1688 — Completitud de contacto en postulaciones Careers (ADR: delta 2026-08-12 en
-- GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1). Aditiva, nullable, SIN backfill: los datos de
-- contacto durables (teléfono E.164 + país de residencia autodeclarado) viven en el facet
-- person-first; el mensaje pertenece a la postulación. Legacy queda NULL ("No informado") —
-- NUNCA inferir país desde prefijo telefónico, IP, CV ni correo.

ALTER TABLE greenhouse_hiring.candidate_facet
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT;

ALTER TABLE greenhouse_hiring.candidate_facet
  ADD COLUMN IF NOT EXISTS residence_country_code TEXT;

-- ISO 3166-1 alpha-2 mayúsculas; el catálogo semántico vive en src/lib/locale/countries.ts.
ALTER TABLE greenhouse_hiring.candidate_facet
  DROP CONSTRAINT IF EXISTS candidate_facet_residence_country_code_check;

ALTER TABLE greenhouse_hiring.candidate_facet
  ADD CONSTRAINT candidate_facet_residence_country_code_check
  CHECK (residence_country_code IS NULL OR residence_country_code ~ '^[A-Z]{2}$') NOT VALID;

ALTER TABLE greenhouse_hiring.candidate_facet
  VALIDATE CONSTRAINT candidate_facet_residence_country_code_check;

COMMENT ON COLUMN greenhouse_hiring.candidate_facet.phone_e164 IS
  'TASK-1688 — teléfono de contacto normalizado E.164 (opcional; PII interna; nunca en payloads públicos). No infiere residencia.';

COMMENT ON COLUMN greenhouse_hiring.candidate_facet.residence_country_code IS
  'TASK-1688 — país de residencia AUTODECLARADO (ISO 3166-1 alpha-2). No es dirección, nacionalidad ni elegibilidad laboral. NULL = legacy/no informado (sin backfill).';

ALTER TABLE greenhouse_hiring.hiring_application
  ADD COLUMN IF NOT EXISTS candidate_message TEXT;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_candidate_message_len_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_candidate_message_len_check
  CHECK (candidate_message IS NULL OR char_length(candidate_message) <= 4000) NOT VALID;

ALTER TABLE greenhouse_hiring.hiring_application
  VALIDATE CONSTRAINT hiring_application_candidate_message_len_check;

COMMENT ON COLUMN greenhouse_hiring.hiring_application.candidate_message IS
  'TASK-1688 — mensaje del candidato, application-scoped (≤4000). PII interna: nunca se copia al facet ni a payloads públicos.';

-- Anti pre-up-marker bug guard.
DO $$
DECLARE col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE (table_schema = 'greenhouse_hiring' AND table_name = 'candidate_facet'
         AND column_name IN ('phone_e164', 'residence_country_code'))
     OR (table_schema = 'greenhouse_hiring' AND table_name = 'hiring_application'
         AND column_name = 'candidate_message');

  IF col_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1688 anti pre-up-marker check: expected 3 new columns, found %. Migration markers may be inverted.', col_count;
  END IF;
END
$$;

-- Down Migration

-- Rollback destructivo de PII: sólo con ADR + plan de retención aprobado (spec TASK-1688).
ALTER TABLE greenhouse_hiring.hiring_application DROP CONSTRAINT IF EXISTS hiring_application_candidate_message_len_check;
ALTER TABLE greenhouse_hiring.hiring_application DROP COLUMN IF EXISTS candidate_message;
ALTER TABLE greenhouse_hiring.candidate_facet DROP CONSTRAINT IF EXISTS candidate_facet_residence_country_code_check;
ALTER TABLE greenhouse_hiring.candidate_facet DROP COLUMN IF EXISTS residence_country_code;
ALTER TABLE greenhouse_hiring.candidate_facet DROP COLUMN IF EXISTS phone_e164;
