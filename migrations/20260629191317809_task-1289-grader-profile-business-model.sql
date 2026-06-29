-- Up Migration

-- TASK-1289 — Business model axis on the grader profile (the buyer-intent framing).
--
-- `business_model` is ORTHOGONAL to the category: it decides the buyer-intent framing of the
-- prompts (TASK-1290). ISSUE-110's root cause was the engine assuming EVERY brand is a B2B
-- agency/provider (Efeonce's own ICP) → consumer brands (SKY) scored a false-0. These additive
-- columns persist the RESOLVED model (SoT) + confidence + provenance, derived by
-- `classifyBusinessModel` (grounded brand_intelligence candidate > conservative category
-- heuristic > honest `unknown`). `business_model_source` mirrors `category_source`'s honest
-- provenance: 'brand_intelligence' | 'category_heuristic' are the two derived sub-sources
-- (the spec's umbrella "derived"); 'operator_override' is the human backstop (Slice 3).
-- The enum is closed (CHECK), `unknown` is allowed, and it is NEVER defaulted to agency.

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.grader_profiles
  ADD COLUMN IF NOT EXISTS business_model            TEXT,
  ADD COLUMN IF NOT EXISTS business_model_confidence NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS business_model_source     TEXT;

-- business_model enum (matches BUSINESS_MODELS / BrandBusinessModel in business-model.ts).
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_business_model_check
  CHECK (
    business_model IS NULL
    OR business_model IN (
      'consumer_b2c', 'b2b_service_provider', 'b2b_product_saas',
      'retail_ecommerce', 'marketplace', 'public_institution', 'unknown'
    )
  );

-- business_model_source enum (honest provenance; mirrors category_source).
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_source_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_business_model_source_check
  CHECK (
    business_model_source IS NULL
    OR business_model_source IN ('brand_intelligence', 'category_heuristic', 'operator_override', 'unknown')
  );

-- Confidence is a 0..1 score.
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_confidence_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_business_model_confidence_check
  CHECK (business_model_confidence IS NULL OR (business_model_confidence >= 0 AND business_model_confidence <= 1));

-- Partial index: surface profiles whose business model is unresolved (reliability signal reads it).
CREATE INDEX IF NOT EXISTS grader_profiles_business_model_unresolved_idx
  ON greenhouse_growth.grader_profiles (profile_id)
  WHERE business_model IS NULL OR business_model = 'unknown';

-- Append-only audit of business-model changes (operator override + derived backfills). One row
-- per real transition: from→to + provenance + reason + actor. Mirrors the recommendation-status
-- history pattern (TASK-1275) + provider_observations append-only trigger (TASK-1226).
CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_business_model_history (
  history_id          TEXT PRIMARY KEY DEFAULT ('gbmh-' || gen_random_uuid()::text),
  profile_id          TEXT NOT NULL,
  organization_id     TEXT,
  from_business_model TEXT
    CHECK (from_business_model IS NULL OR from_business_model IN (
      'consumer_b2c', 'b2b_service_provider', 'b2b_product_saas',
      'retail_ecommerce', 'marketplace', 'public_institution', 'unknown')),
  to_business_model   TEXT NOT NULL
    CHECK (to_business_model IN (
      'consumer_b2c', 'b2b_service_provider', 'b2b_product_saas',
      'retail_ecommerce', 'marketplace', 'public_institution', 'unknown')),
  to_source           TEXT NOT NULL
    CHECK (to_source IN ('brand_intelligence', 'category_heuristic', 'operator_override', 'unknown')),
  confidence          NUMERIC(3, 2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  reason              TEXT,
  changed_by          TEXT NOT NULL,
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grader_business_model_history_profile_fkey
    FOREIGN KEY (profile_id) REFERENCES greenhouse_growth.grader_profiles (profile_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grader_business_model_history_profile_idx
  ON greenhouse_growth.grader_business_model_history (profile_id, changed_at DESC);

-- Append-only: block UPDATE/DELETE (defense in depth over the runtime grant).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_business_model_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.grader_business_model_history es append-only (TASK-1289): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_grader_business_model_history_append_only ON greenhouse_growth.grader_business_model_history;
CREATE TRIGGER trg_grader_business_model_history_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.grader_business_model_history
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_business_model_history_mutation();

-- GRANTs (history = SELECT/INSERT for runtime; the trigger enforces append-only).
GRANT SELECT, INSERT ON greenhouse_growth.grader_business_model_history TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.grader_business_model_history TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_business_model_history TO greenhouse_migrator_user;

-- Anti pre-up-marker guard (ISSUE-068): abort if columns or the history table were not created.
DO $$
DECLARE
  cols int;
  tbl int;
BEGIN
  SELECT COUNT(*) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'grader_profiles'
    AND column_name IN ('business_model', 'business_model_confidence', 'business_model_source');

  SELECT COUNT(*) INTO tbl
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_business_model_history';

  IF cols <> 3 OR tbl <> 1 THEN
    RAISE EXCEPTION 'TASK-1289 anti pre-up-marker check: business model columns/history NOT created (cols=%, tbl=%). Migration markers may be inverted.', cols, tbl;
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP TRIGGER IF EXISTS trg_grader_business_model_history_append_only ON greenhouse_growth.grader_business_model_history;
DROP FUNCTION IF EXISTS greenhouse_growth.block_business_model_history_mutation();
DROP TABLE IF EXISTS greenhouse_growth.grader_business_model_history;

DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_business_model_unresolved_idx;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_check;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_source_check;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_business_model_confidence_check;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP COLUMN IF EXISTS business_model,
  DROP COLUMN IF EXISTS business_model_confidence,
  DROP COLUMN IF EXISTS business_model_source;
