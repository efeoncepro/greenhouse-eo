-- Up Migration

-- TASK-1288 Slice 4 — Brand Intelligence (grounded shared read) snapshot.
--
-- ONE grounded read per brand (LLM over the site's readable content + entity signals),
-- frozen as a VERSIONED snapshot. It is the SHARED INPUT that category (TASK-1288),
-- business_model (TASK-1289) and prompts (TASK-1290) DERIVE from — the site is read once,
-- three things are derived (no triple read, no monolith coupling stable to volatile).
--
-- Two-plane model: `candidate_category_node` is a real MACRO/MID taxonomy node (or 'unknown');
-- `fine_category` is the long-tail descriptor as DATA (e.g. "fabricante de pinturas"), NEVER a node.
--
-- Versioned + append-only-ish: a new read inserts a new version and supersedes the prior
-- active one (provenance preserved; partial unique keeps one 'active' per profile).

SET search_path TO public, greenhouse_growth;

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_brand_intelligence (
  brand_intelligence_id    TEXT PRIMARY KEY DEFAULT ('gbi-' || gen_random_uuid()::text),
  profile_id               TEXT NOT NULL REFERENCES greenhouse_growth.grader_profiles (profile_id) ON DELETE CASCADE,
  version                  INTEGER NOT NULL,
  -- Grounded summary (the shared snapshot consumed by 1288/1289/1290).
  what_the_brand_does      TEXT,
  candidate_category_node  TEXT,
  fine_category            TEXT,
  candidate_business_model TEXT,
  -- Provenance: which signals fed the read + model/provider + confidence.
  signals_used             JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence               NUMERIC(3, 2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  model                    TEXT,
  provider                 TEXT,
  status                   TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, version)
);

-- One active snapshot per profile (the current grounded read).
CREATE UNIQUE INDEX IF NOT EXISTS grader_brand_intelligence_active_idx
  ON greenhouse_growth.grader_brand_intelligence (profile_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS grader_brand_intelligence_profile_idx
  ON greenhouse_growth.grader_brand_intelligence (profile_id);

-- Anti pre-up-marker guard (ISSUE-068).
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_brand_intelligence'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1288 anti pre-up-marker check: greenhouse_growth.grader_brand_intelligence was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Ownership + GRANTs (runtime DML; versioned → SELECT/INSERT/UPDATE for supersede).
ALTER TABLE greenhouse_growth.grader_brand_intelligence OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_brand_intelligence TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_brand_intelligence TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_brand_intelligence TO greenhouse_migrator_user;

-- Down Migration

SET search_path TO public, greenhouse_growth;

DROP TABLE IF EXISTS greenhouse_growth.grader_brand_intelligence CASCADE;
