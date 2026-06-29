-- Up Migration

-- TASK-1288 Slice 2 — Canonical category resolution on the grader profile.
--
-- `grader_profiles.category` holds the RAW, untrusted `organizations.industry` string
-- (HubSpot enum / CIIU Spanish / null) — ISSUE-110 root cause: it was interpolated
-- verbatim into prompts ("agencias de AIRLINES_AVIATION"). These additive columns persist
-- the RESOLVED canonical taxonomy node (SoT) + provenance, derived by
-- `resolveCanonicalCategory`. The raw `category` column is preserved (additive, no data loss).
--
-- `category_node_id` is the source of truth (a real `industry:*` node or 'unknown'); the
-- localized label is derived from the catalog at read-time, but `category_label` keeps a
-- denormalized es-CL cache for query/report convenience (refreshed on every resolve/backfill).

SET search_path TO public, greenhouse_growth;

ALTER TABLE greenhouse_growth.grader_profiles
  ADD COLUMN IF NOT EXISTS category_node_id   TEXT,
  ADD COLUMN IF NOT EXISTS category_label     TEXT,
  ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS category_source    TEXT;

-- category_source enum (matches CanonicalCategorySource in resolve-category.ts).
-- New columns → all existing rows are NULL → constraint holds; safe to add VALID.
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_category_source_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_category_source_check
  CHECK (
    category_source IS NULL
    OR category_source IN ('brand_intelligence', 'hubspot_map', 'taxonomy_alias', 'unknown')
  );

-- Confidence is a 0..1 score.
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_category_confidence_check;
ALTER TABLE greenhouse_growth.grader_profiles
  ADD CONSTRAINT grader_profiles_category_confidence_check
  CHECK (category_confidence IS NULL OR (category_confidence >= 0 AND category_confidence <= 1));

-- Partial index: surface profiles whose category is unresolved (reliability signal +
-- run guard read this — TASK-1288 Slice 3).
CREATE INDEX IF NOT EXISTS grader_profiles_category_unresolved_idx
  ON greenhouse_growth.grader_profiles (profile_id)
  WHERE category_node_id IS NULL OR category_node_id = 'unknown';

-- Anti pre-up-marker guard (ISSUE-068): abort if the columns were not actually created.
DO $$
DECLARE
  cols int;
BEGIN
  SELECT COUNT(*) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'grader_profiles'
    AND column_name IN ('category_node_id', 'category_label', 'category_confidence', 'category_source');

  IF cols <> 4 THEN
    RAISE EXCEPTION 'TASK-1288 anti pre-up-marker check: grader_profiles canonical category columns NOT created (found %). Migration markers may be inverted.', cols;
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP INDEX IF EXISTS greenhouse_growth.grader_profiles_category_unresolved_idx;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_category_source_check;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP CONSTRAINT IF EXISTS grader_profiles_category_confidence_check;
ALTER TABLE greenhouse_growth.grader_profiles
  DROP COLUMN IF EXISTS category_node_id,
  DROP COLUMN IF EXISTS category_label,
  DROP COLUMN IF EXISTS category_confidence,
  DROP COLUMN IF EXISTS category_source;
