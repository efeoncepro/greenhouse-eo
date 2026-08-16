-- Up Migration

-- TASK-1735 — Expediente de Evaluación: notas append-only per-application.
-- La narrativa de evaluación (análisis CV-vs-assessment, notas de entrevista) se persiste
-- como hechos inmutables: sin UPDATE/DELETE (trigger + grants), corrección = nota nueva.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_application_note (
  note_id         TEXT PRIMARY KEY DEFAULT ('hnote-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  kind            TEXT NOT NULL CHECK (kind IN ('cv_analysis', 'assessment_review', 'interview_note', 'general')),
  body_md         TEXT NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  author_user_id  TEXT NOT NULL CHECK (length(author_user_id) > 0),
  source          TEXT NOT NULL DEFAULT 'human' CHECK (source IN ('human', 'agent')),
  context_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_application_note_app_idx
  ON greenhouse_hiring.hiring_application_note (application_id, created_at DESC);

-- Guard append-only propio del expediente (mirror del patrón talent_pool TASK-1726).
CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_hiring_note_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'hiring_application_note es append-only (TASK-1735): % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hiring_application_note_append_only ON greenhouse_hiring.hiring_application_note;
CREATE TRIGGER trg_hiring_application_note_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.hiring_application_note
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_hiring_note_mutation();

ALTER TABLE greenhouse_hiring.hiring_application_note OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_application_note TO greenhouse_runtime;

-- Capability nueva: anotar el expediente (escritura de notas + propose/confirm del dossier).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.application.annotate', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1735 — Escribir notas del Expediente de Evaluación (append-only) y proponer/confirmar borradores agénticos del dossier. Grant tier gobernanza: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS. Internal-only: nunca candidate-facing.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker guard (TASK-1735): aborta si el DDL no se aplicó de verdad.
DO $$
DECLARE table_ok boolean; trigger_ok boolean; cap_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_application_note'
  ) INTO table_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_hiring_application_note_append_only'
  ) INTO trigger_ok;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'hiring.application.annotate' AND deprecated_at IS NULL
  ) INTO cap_ok;

  IF NOT table_ok OR NOT trigger_ok OR NOT cap_ok THEN
    RAISE EXCEPTION 'TASK-1735 anti pre-up-marker check failed: table=% trigger=% capability=%',
      table_ok, trigger_ok, cap_ok;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_hiring_application_note_append_only ON greenhouse_hiring.hiring_application_note;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_hiring_note_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_application_note;
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key = 'hiring.application.annotate';
