-- Up Migration

-- TASK-1227 Slice 4 — normalized_findings + grader_scores en greenhouse_growth.
-- Aditivo. Findings derivados (recomputables → upsert por run+prompt+provider+schema);
-- scores derivados versionados (upsert por run+score_version; recompute = mismo score).

CREATE TABLE IF NOT EXISTS greenhouse_growth.normalized_findings (
  finding_id              TEXT PRIMARY KEY,
  run_id                  TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE RESTRICT,
  prompt_id               TEXT NOT NULL,
  provider                TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'perplexity', 'gemini', 'manual_import')),
  brand_mentioned         TEXT NOT NULL CHECK (brand_mentioned IN ('yes', 'no', 'ambiguous', 'unknown')),
  brand_rank              INTEGER CHECK (brand_rank IS NULL OR brand_rank >= 1),
  competitors_mentioned   TEXT[] NOT NULL DEFAULT '{}',
  sentiment_label         TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'mixed', 'unknown')),
  sentiment_score         NUMERIC(4, 3) CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1)),
  category_associations   TEXT[] NOT NULL DEFAULT '{}',
  message_drift_claims    TEXT[] NOT NULL DEFAULT '{}',
  citation_domains        TEXT[] NOT NULL DEFAULT '{}',
  source_types            TEXT[] NOT NULL DEFAULT '{}',
  commercial_intent_match TEXT NOT NULL CHECK (commercial_intent_match IN ('yes', 'no', 'partial', 'unknown')),
  confidence              NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  trust_signal            TEXT,
  schema_version          TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, prompt_id, provider, schema_version)
);

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_scores (
  score_id        TEXT PRIMARY KEY DEFAULT ('gsc-' || gen_random_uuid()::text),
  run_id          TEXT NOT NULL REFERENCES greenhouse_growth.grader_runs (run_id) ON DELETE RESTRICT,
  score_version   TEXT NOT NULL,
  overall_score   NUMERIC(5, 1) CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  score_status    TEXT NOT NULL CHECK (score_status IN ('completed', 'insufficient_data', 'review_required')),
  auto_releasable BOOLEAN NOT NULL DEFAULT FALSE,
  dimensions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence      NUMERIC(4, 3) NOT NULL DEFAULT 0,
  evidence_count  INTEGER NOT NULL DEFAULT 0,
  coverage        JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_reasons  TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, score_version)
);

CREATE INDEX IF NOT EXISTS normalized_findings_run_idx ON greenhouse_growth.normalized_findings (run_id);
CREATE INDEX IF NOT EXISTS grader_scores_run_idx ON greenhouse_growth.grader_scores (run_id);
CREATE INDEX IF NOT EXISTS grader_scores_status_idx ON greenhouse_growth.grader_scores (score_status);

DROP TRIGGER IF EXISTS trg_normalized_findings_touch_updated_at ON greenhouse_growth.normalized_findings;
CREATE TRIGGER trg_normalized_findings_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.normalized_findings
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_grader_scores_touch_updated_at ON greenhouse_growth.grader_scores;
CREATE TRIGGER trg_grader_scores_touch_updated_at
  BEFORE UPDATE ON greenhouse_growth.grader_scores
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('normalized_findings', 'grader_scores');

  IF table_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1227 anti pre-up-marker: expected 2 tables, got %. Markers may be inverted.', table_count;
  END IF;
END
$$;

ALTER TABLE greenhouse_growth.normalized_findings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.grader_scores OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.normalized_findings TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.normalized_findings TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.normalized_findings TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_scores TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_scores TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_scores TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_scores;
DROP TABLE IF EXISTS greenhouse_growth.normalized_findings;
