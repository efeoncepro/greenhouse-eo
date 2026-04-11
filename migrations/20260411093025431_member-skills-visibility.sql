-- Up Migration

ALTER TABLE greenhouse_core.member_skills
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal';

ALTER TABLE greenhouse_core.member_skills
  ADD CONSTRAINT member_skills_visibility_check
    CHECK (visibility IN ('internal', 'client_visible'));

COMMENT ON COLUMN greenhouse_core.member_skills.visibility IS 'Audience: internal (self+admin only) or client_visible (requires verification)';

-- Down Migration

ALTER TABLE greenhouse_core.member_skills
  DROP CONSTRAINT IF EXISTS member_skills_visibility_check;

ALTER TABLE greenhouse_core.member_skills
  DROP COLUMN IF EXISTS visibility;
