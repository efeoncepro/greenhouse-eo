-- Up Migration

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS linkedin_url    TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url   TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url     TEXT,
  ADD COLUMN IF NOT EXISTS threads_url     TEXT,
  ADD COLUMN IF NOT EXISTS behance_url     TEXT,
  ADD COLUMN IF NOT EXISTS github_url      TEXT,
  ADD COLUMN IF NOT EXISTS dribbble_url    TEXT,
  ADD COLUMN IF NOT EXISTS about_me        TEXT;

COMMENT ON COLUMN greenhouse_core.members.linkedin_url  IS 'LinkedIn profile URL';
COMMENT ON COLUMN greenhouse_core.members.portfolio_url IS 'Personal portfolio or website URL';
COMMENT ON COLUMN greenhouse_core.members.twitter_url   IS 'X/Twitter profile URL';
COMMENT ON COLUMN greenhouse_core.members.threads_url   IS 'Threads profile URL';
COMMENT ON COLUMN greenhouse_core.members.behance_url   IS 'Behance portfolio URL';
COMMENT ON COLUMN greenhouse_core.members.github_url    IS 'GitHub profile URL';
COMMENT ON COLUMN greenhouse_core.members.dribbble_url  IS 'Dribbble portfolio URL';
COMMENT ON COLUMN greenhouse_core.members.about_me      IS 'Free-text professional bio (Sobre mi)';

-- Down Migration

ALTER TABLE greenhouse_core.members
  DROP COLUMN IF EXISTS linkedin_url,
  DROP COLUMN IF EXISTS portfolio_url,
  DROP COLUMN IF EXISTS twitter_url,
  DROP COLUMN IF EXISTS threads_url,
  DROP COLUMN IF EXISTS behance_url,
  DROP COLUMN IF EXISTS github_url,
  DROP COLUMN IF EXISTS dribbble_url,
  DROP COLUMN IF EXISTS about_me;
