-- Up Migration

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS headline TEXT;

COMMENT ON COLUMN greenhouse_core.members.headline IS 'Short professional tagline (e.g. Senior UX Designer | Motion & Brand)';

-- Down Migration

ALTER TABLE greenhouse_core.members
  DROP COLUMN IF EXISTS headline;
