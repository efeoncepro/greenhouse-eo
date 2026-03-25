-- ══════════════════════════════════════════════════════
-- Client Organization Identity Bridge
-- Ensures: client_users → identity_profiles → person_memberships → organizations
-- ══════════════════════════════════════════════════════

-- 1. Backfill identity_profile_id on client_users where NULL (match by email)
UPDATE greenhouse_core.client_users cu
SET identity_profile_id = (
  SELECT ip.profile_id
  FROM greenhouse_core.identity_profiles ip
  WHERE LOWER(TRIM(ip.canonical_email)) = LOWER(TRIM(cu.email))
  LIMIT 1
)
WHERE cu.identity_profile_id IS NULL
  AND cu.active = TRUE
  AND cu.email IS NOT NULL
  AND cu.email != '';

-- 2. Create person_memberships for client_users that have identity but no membership
INSERT INTO greenhouse_core.person_memberships (
  membership_id, profile_id, organization_id, space_id,
  membership_type, role_label, is_primary,
  status, active, created_at, updated_at
)
SELECT
  'pm-cu-' || cu.user_id,
  cu.identity_profile_id,
  s.organization_id,
  s.space_id,
  'client_user',
  COALESCE(cu.full_name, cu.email),
  FALSE,
  'active', TRUE, NOW(), NOW()
FROM greenhouse_core.client_users cu
JOIN greenhouse_core.spaces s ON s.client_id = cu.client_id AND s.active = TRUE
WHERE cu.identity_profile_id IS NOT NULL
  AND cu.active = TRUE
  AND s.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_core.person_memberships pm
    WHERE pm.profile_id = cu.identity_profile_id
      AND pm.organization_id = s.organization_id
      AND pm.active = TRUE
  )
ON CONFLICT (membership_id) DO NOTHING;
