DROP VIEW IF EXISTS greenhouse_serving.person_360;
CREATE OR REPLACE VIEW greenhouse_serving.person_360 AS
WITH member_rollup AS (
  SELECT
    m.identity_profile_id,
    COUNT(*)::int AS member_count,
    (ARRAY_AGG(m.member_id ORDER BY m.active DESC, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST))[1] AS primary_member_id,
    (ARRAY_AGG(m.public_id ORDER BY m.active DESC, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST))[1] AS primary_member_public_id,
    (ARRAY_AGG(m.display_name ORDER BY m.active DESC, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST))[1] AS member_display_name,
    (ARRAY_AGG(m.primary_email ORDER BY m.active DESC, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST))[1] AS member_email,
    (ARRAY_AGG(m.department_id ORDER BY m.active DESC, m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST))[1] AS primary_department_id,
    BOOL_OR(m.active) AS has_active_member
  FROM greenhouse_core.members m
  WHERE m.identity_profile_id IS NOT NULL
  GROUP BY m.identity_profile_id
),
user_rollup AS (
  SELECT
    u.identity_profile_id,
    COUNT(*)::int AS user_count,
    COUNT(*) FILTER (WHERE u.active)::int AS active_user_count,
    COUNT(*) FILTER (WHERE u.tenant_type = 'efeonce_internal')::int AS internal_user_count,
    COUNT(*) FILTER (WHERE u.tenant_type <> 'efeonce_internal')::int AS client_user_count,
    (ARRAY_AGG(u.user_id ORDER BY u.active DESC, u.updated_at DESC NULLS LAST, u.created_at DESC NULLS LAST))[1] AS primary_user_id,
    (ARRAY_AGG(u.public_id ORDER BY u.active DESC, u.updated_at DESC NULLS LAST, u.created_at DESC NULLS LAST))[1] AS primary_user_public_id,
    (ARRAY_AGG(u.email ORDER BY u.active DESC, u.updated_at DESC NULLS LAST, u.created_at DESC NULLS LAST))[1] AS primary_user_email,
    (ARRAY_AGG(u.full_name ORDER BY u.active DESC, u.updated_at DESC NULLS LAST, u.created_at DESC NULLS LAST))[1] AS primary_user_name,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT u.user_id), NULL) AS user_ids,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT u.email), NULL) AS user_emails,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT u.client_id), NULL) AS user_client_ids,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT u.tenant_type), NULL) AS tenant_types
  FROM greenhouse_core.client_users u
  WHERE u.identity_profile_id IS NOT NULL
  GROUP BY u.identity_profile_id
),
contact_rollup AS (
  SELECT
    c.linked_identity_profile_id AS identity_profile_id,
    COUNT(*)::int AS contact_count,
    (ARRAY_AGG(c.contact_record_id ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST))[1] AS primary_contact_record_id,
    (ARRAY_AGG(c.hubspot_contact_id ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST))[1] AS primary_hubspot_contact_id,
    (ARRAY_AGG(c.display_name ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST))[1] AS primary_contact_name,
    (ARRAY_AGG(c.email ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST))[1] AS primary_contact_email,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.contact_record_id), NULL) AS contact_record_ids,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.client_id), NULL) AS contact_client_ids,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.email), NULL) AS contact_emails,
    BOOL_OR(c.active AND NOT COALESCE(c.is_deleted, FALSE)) AS has_active_contact
  FROM greenhouse_crm.contacts c
  WHERE c.linked_identity_profile_id IS NOT NULL
  GROUP BY c.linked_identity_profile_id
),
membership_rollup AS (
  SELECT
    pm.profile_id AS identity_profile_id,
    COUNT(*)::int AS membership_count,
    (
      SELECT json_agg(json_build_object(
        'membershipId', sub.membership_id,
        'organizationId', sub.organization_id,
        'organizationName', o.organization_name,
        'spaceId', sub.space_id,
        'membershipType', sub.membership_type,
        'roleLabel', sub.role_label,
        'isPrimary', sub.is_primary
      ) ORDER BY sub.is_primary DESC, o.organization_name NULLS LAST)
      FROM greenhouse_core.person_memberships sub
      LEFT JOIN greenhouse_core.organizations o ON o.organization_id = sub.organization_id
      WHERE sub.profile_id = pm.profile_id AND sub.active = TRUE
    ) AS memberships_json,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT pm.organization_id), NULL) AS organization_ids
  FROM greenhouse_core.person_memberships pm
  WHERE pm.active = TRUE
  GROUP BY pm.profile_id
)
SELECT
  p.profile_id AS identity_profile_id,
  p.public_id AS identity_profile_public_id,
  p.profile_type,
  p.canonical_email,
  COALESCE(
    NULLIF(TRIM(p.full_name), ''),
    NULLIF(TRIM(m.member_display_name), ''),
    NULLIF(TRIM(u.primary_user_name), ''),
    NULLIF(TRIM(c.primary_contact_name), '')
  ) AS display_name,
  p.full_name AS profile_full_name,
  p.job_title,
  p.status AS profile_status,
  p.active AS profile_active,
  p.default_auth_mode,
  p.primary_source_system,
  p.primary_source_object_type,
  p.primary_source_object_id,
  m.primary_member_id,
  m.primary_member_public_id,
  m.member_count,
  m.member_display_name,
  m.member_email,
  m.primary_department_id,
  COALESCE(m.has_active_member, FALSE) AS has_active_member,
  u.primary_user_id,
  u.primary_user_public_id,
  u.user_count,
  u.active_user_count,
  u.internal_user_count,
  u.client_user_count,
  u.primary_user_email,
  u.primary_user_name,
  COALESCE(u.user_ids, ARRAY[]::text[]) AS user_ids,
  COALESCE(u.user_emails, ARRAY[]::text[]) AS user_emails,
  COALESCE(u.user_client_ids, ARRAY[]::text[]) AS user_client_ids,
  COALESCE(u.tenant_types, ARRAY[]::text[]) AS tenant_types,
  c.primary_contact_record_id,
  c.primary_hubspot_contact_id,
  c.contact_count,
  c.primary_contact_name,
  c.primary_contact_email,
  COALESCE(c.contact_record_ids, ARRAY[]::text[]) AS contact_record_ids,
  COALESCE(c.contact_client_ids, ARRAY[]::text[]) AS contact_client_ids,
  COALESCE(c.contact_emails, ARRAY[]::text[]) AS contact_emails,
  COALESCE(c.has_active_contact, FALSE) AS has_active_contact,
  (m.primary_member_id IS NOT NULL) AS has_member_facet,
  (u.primary_user_id IS NOT NULL) AS has_user_facet,
  (c.primary_contact_record_id IS NOT NULL) AS has_crm_contact_facet,
  (mbr.membership_count IS NOT NULL AND mbr.membership_count > 0) AS has_membership_facet,
  ARRAY_REMOVE(
    ARRAY[
      CASE WHEN m.primary_member_id IS NOT NULL THEN 'member' END,
      CASE WHEN u.primary_user_id IS NOT NULL THEN 'user' END,
      CASE WHEN c.primary_contact_record_id IS NOT NULL THEN 'crm_contact' END,
      CASE WHEN mbr.membership_count IS NOT NULL AND mbr.membership_count > 0 THEN 'membership' END
    ]::text[],
    NULL
  ) AS person_facets,
  -- Account 360: memberships
  COALESCE(mbr.membership_count, 0) AS membership_count,
  mbr.memberships_json AS memberships,
  COALESCE(mbr.organization_ids, ARRAY[]::text[]) AS organization_ids,
  p.created_at,
  p.updated_at
FROM greenhouse_core.identity_profiles p
LEFT JOIN member_rollup m
  ON m.identity_profile_id = p.profile_id
LEFT JOIN user_rollup u
  ON u.identity_profile_id = p.profile_id
LEFT JOIN contact_rollup c
  ON c.identity_profile_id = p.profile_id
LEFT JOIN membership_rollup mbr
  ON mbr.identity_profile_id = p.profile_id;

GRANT SELECT ON greenhouse_serving.person_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_360 TO greenhouse_migrator;

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'postgres-person-360-serving-v1',
  'person_360',
  CURRENT_USER,
  'Creates greenhouse_serving.person_360 over identity_profiles, members, client_users and crm contacts.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
