-- Up Migration
-- Align member_skills and member_tools with the 4-state verification model
-- already used by member_certifications (self_declared → pending_review → verified|rejected).

-- member_skills: add verification_status + rejection_reason
ALTER TABLE greenhouse_core.member_skills
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'self_declared',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE greenhouse_core.member_skills
  ADD CONSTRAINT member_skills_verification_status_check
    CHECK (verification_status IN ('self_declared', 'pending_review', 'verified', 'rejected'));

-- Backfill: any skill with verified_by already set → 'verified'
UPDATE greenhouse_core.member_skills
SET verification_status = 'verified'
WHERE verified_by IS NOT NULL AND verification_status = 'self_declared';

COMMENT ON COLUMN greenhouse_core.member_skills.verification_status IS 'self_declared → pending_review → verified|rejected';
COMMENT ON COLUMN greenhouse_core.member_skills.rejection_reason IS 'Reason provided when admin rejects the skill';

-- member_tools: add verification_status + rejection_reason
ALTER TABLE greenhouse_core.member_tools
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'self_declared',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE greenhouse_core.member_tools
  ADD CONSTRAINT member_tools_verification_status_check
    CHECK (verification_status IN ('self_declared', 'pending_review', 'verified', 'rejected'));

-- Backfill: any tool with verified_by already set → 'verified'
UPDATE greenhouse_core.member_tools
SET verification_status = 'verified'
WHERE verified_by IS NOT NULL AND verification_status = 'self_declared';

COMMENT ON COLUMN greenhouse_core.member_tools.verification_status IS 'self_declared → pending_review → verified|rejected';
COMMENT ON COLUMN greenhouse_core.member_tools.rejection_reason IS 'Reason provided when admin rejects the tool';

-- Runtime grants (following the pattern from talent-profile-runtime-grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_skills TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_tools TO greenhouse_runtime;

-- Down Migration

ALTER TABLE greenhouse_core.member_skills
  DROP CONSTRAINT IF EXISTS member_skills_verification_status_check;
ALTER TABLE greenhouse_core.member_skills
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS rejection_reason;

ALTER TABLE greenhouse_core.member_tools
  DROP CONSTRAINT IF EXISTS member_tools_verification_status_check;
ALTER TABLE greenhouse_core.member_tools
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS rejection_reason;
