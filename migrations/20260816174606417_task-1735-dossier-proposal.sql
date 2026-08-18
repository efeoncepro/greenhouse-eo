-- Up Migration

-- TASK-1735 — Expediente de Evaluación SMART: ledger de propuestas del dossier agéntico.
-- El LLM PROPONE un borrador de expediente (propose_json); solo un humano lo confirma
-- (propose → confirm → execute). Terminal-once con guard en código (FOR UPDATE + state
-- machine), sin trigger: el confirm SÍ muta status/decision — por eso runtime lleva UPDATE.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_application_dossier_proposal (
  proposal_id     TEXT PRIMARY KEY DEFAULT ('hdsp-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  proposed_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  input_digest    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
  decision_note   TEXT,
  confirmed_by    TEXT,
  confirmed_at    TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotencia del propose: un solo `proposed` activo por (application_id, input_digest).
-- Mismo estado de fuentes → misma propuesta, sin segunda llamada al provider.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_dossier_proposal_active_digest_idx
  ON greenhouse_hiring.hiring_application_dossier_proposal (application_id, input_digest)
  WHERE status = 'proposed';

CREATE INDEX IF NOT EXISTS hiring_dossier_proposal_app_idx
  ON greenhouse_hiring.hiring_application_dossier_proposal (application_id, created_at DESC);

ALTER TABLE greenhouse_hiring.hiring_application_dossier_proposal OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.hiring_application_dossier_proposal TO greenhouse_runtime;

-- Anti pre-up-marker guard (TASK-1735): aborta si el DDL no se aplicó de verdad.
DO $$
DECLARE table_ok boolean; digest_idx_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_application_dossier_proposal'
  ) INTO table_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_hiring' AND indexname = 'hiring_dossier_proposal_active_digest_idx'
  ) INTO digest_idx_ok;

  IF NOT table_ok OR NOT digest_idx_ok THEN
    RAISE EXCEPTION 'TASK-1735 anti pre-up-marker check failed: table=% digest_idx=%',
      table_ok, digest_idx_ok;
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_application_dossier_proposal;
