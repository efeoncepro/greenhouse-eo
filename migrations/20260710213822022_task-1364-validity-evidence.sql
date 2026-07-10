-- Up Migration

-- TASK-1364 — Evidencia auditable de validez del assessment (documentación técnica EU AI Act).
-- Append-only: cada snapshot de validez computado y persistido queda inmutable (quién, cuándo,
-- scope, fuente de outcome, muestra, coeficientes). El loop es READ-ONLY sobre scores/outcomes;
-- esta tabla solo registra la evidencia derivada.

CREATE TABLE IF NOT EXISTS greenhouse_hr.assessment_validity_evidence (
  evidence_id      TEXT PRIMARY KEY DEFAULT ('avev-' || gen_random_uuid()::text),
  scope_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  window_months    INTEGER NOT NULL,
  outcome_source   TEXT NOT NULL,
  sample_size      INTEGER NOT NULL,
  verdict          TEXT NOT NULL CHECK (verdict IN ('insufficient_sample', 'preliminary', 'established')),
  result_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_by      TEXT,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_validity_evidence_computed_idx
  ON greenhouse_hr.assessment_validity_evidence (computed_at);

CREATE OR REPLACE FUNCTION greenhouse_hr.assert_validity_evidence_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'assessment_validity_evidence es append-only (evidencia AI-Act). Computar un snapshot nuevo, nunca editar.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validity_evidence_no_update_trigger ON greenhouse_hr.assessment_validity_evidence;
CREATE TRIGGER validity_evidence_no_update_trigger
  BEFORE UPDATE ON greenhouse_hr.assessment_validity_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_validity_evidence_append_only();

DROP TRIGGER IF EXISTS validity_evidence_no_delete_trigger ON greenhouse_hr.assessment_validity_evidence;
CREATE TRIGGER validity_evidence_no_delete_trigger
  BEFORE DELETE ON greenhouse_hr.assessment_validity_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_validity_evidence_append_only();

GRANT SELECT, INSERT ON greenhouse_hr.assessment_validity_evidence TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hr.assessment_validity_evidence TO greenhouse_app;

DO $$
DECLARE t INTEGER;
BEGIN
  SELECT COUNT(*) INTO t FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hr' AND table_name = 'assessment_validity_evidence';

  IF t <> 1 THEN
    RAISE EXCEPTION 'TASK-1364 anti pre-up-marker: evidence table not created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS validity_evidence_no_update_trigger ON greenhouse_hr.assessment_validity_evidence;
DROP TRIGGER IF EXISTS validity_evidence_no_delete_trigger ON greenhouse_hr.assessment_validity_evidence;
DROP FUNCTION IF EXISTS greenhouse_hr.assert_validity_evidence_append_only();
DROP TABLE IF EXISTS greenhouse_hr.assessment_validity_evidence;
