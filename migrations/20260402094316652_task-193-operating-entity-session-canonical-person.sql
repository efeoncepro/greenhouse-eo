-- Up Migration
SET search_path = greenhouse_core, greenhouse_serving, public;

-- Regularize the canonical Efeonce operating entity.
INSERT INTO greenhouse_core.organizations (
  organization_id,
  public_id,
  organization_name,
  legal_name,
  tax_id,
  tax_id_type,
  legal_address,
  country,
  organization_type,
  is_operating_entity,
  status,
  active,
  created_at,
  updated_at
)
SELECT
  'org-' || gen_random_uuid()::text,
  'EO-ORG-' || LPAD(nextval('greenhouse_core.seq_organization_public_id')::text, 4, '0'),
  'Efeonce',
  'Efeonce Group SpA',
  '77.357.182-1',
  'RUT',
  'Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile',
  'CL',
  'other',
  TRUE,
  'active',
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM greenhouse_core.organizations o
  WHERE o.organization_name = 'Efeonce'
     OR o.legal_name = 'Efeonce Group SpA'
     OR o.tax_id = '77.357.182-1'
);

UPDATE greenhouse_core.organizations
SET is_operating_entity = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE is_operating_entity = TRUE
  AND organization_id <> (
    SELECT o.organization_id
    FROM greenhouse_core.organizations o
    WHERE o.tax_id = '77.357.182-1'
       OR o.legal_name = 'Efeonce Group SpA'
       OR o.organization_name = 'Efeonce'
    ORDER BY
      CASE
        WHEN o.tax_id = '77.357.182-1' THEN 0
        WHEN o.legal_name = 'Efeonce Group SpA' THEN 1
        ELSE 2
      END,
      o.updated_at DESC NULLS LAST,
      o.created_at DESC NULLS LAST,
      o.organization_id ASC
    LIMIT 1
  );

UPDATE greenhouse_core.organizations
SET organization_name = 'Efeonce',
    legal_name = 'Efeonce Group SpA',
    tax_id = '77.357.182-1',
    tax_id_type = 'RUT',
    legal_address = 'Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile',
    country = COALESCE(NULLIF(country, ''), 'CL'),
    is_operating_entity = TRUE,
    status = 'active',
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = (
  SELECT o.organization_id
  FROM greenhouse_core.organizations o
  WHERE o.tax_id = '77.357.182-1'
     OR o.legal_name = 'Efeonce Group SpA'
     OR o.organization_name = 'Efeonce'
  ORDER BY
    CASE
      WHEN o.tax_id = '77.357.182-1' THEN 0
      WHEN o.legal_name = 'Efeonce Group SpA' THEN 1
      ELSE 2
    END,
    o.updated_at DESC NULLS LAST,
    o.created_at DESC NULLS LAST,
    o.organization_id ASC
  LIMIT 1
);

-- Backfill collaborators into the operating entity as their primary organization.
UPDATE greenhouse_core.person_memberships pm
SET active = TRUE,
    status = 'active',
    space_id = NULL,
    role_label = COALESCE(m.role_title, pm.role_label),
    is_primary = TRUE,
    updated_at = CURRENT_TIMESTAMP
FROM greenhouse_core.members m
WHERE m.active = TRUE
  AND m.identity_profile_id IS NOT NULL
  AND pm.profile_id = m.identity_profile_id
  AND pm.organization_id = (
    SELECT o.organization_id
    FROM greenhouse_core.organizations o
    WHERE o.is_operating_entity = TRUE
      AND o.active = TRUE
    ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
    LIMIT 1
  )
  AND pm.membership_type = 'team_member';

WITH ranked_memberships AS (
  SELECT
    pm.membership_id,
    ROW_NUMBER() OVER (
      PARTITION BY pm.profile_id
      ORDER BY
        pm.active DESC,
        pm.is_primary DESC,
        pm.updated_at DESC NULLS LAST,
        pm.created_at DESC NULLS LAST,
        pm.membership_id ASC
    ) AS row_num
  FROM greenhouse_core.person_memberships pm
  WHERE pm.organization_id = (
      SELECT o.organization_id
      FROM greenhouse_core.organizations o
      WHERE o.is_operating_entity = TRUE
        AND o.active = TRUE
      ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
      LIMIT 1
    )
    AND pm.membership_type = 'team_member'
    AND pm.profile_id IN (
      SELECT m.identity_profile_id
      FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND m.identity_profile_id IS NOT NULL
    )
)
UPDATE greenhouse_core.person_memberships pm
SET active = FALSE,
    status = 'inactive',
    is_primary = FALSE,
    updated_at = CURRENT_TIMESTAMP
FROM ranked_memberships ranked
WHERE pm.membership_id = ranked.membership_id
  AND ranked.row_num > 1;

INSERT INTO greenhouse_core.person_memberships (
  membership_id,
  public_id,
  profile_id,
  organization_id,
  space_id,
  membership_type,
  role_label,
  department,
  is_primary,
  status,
  active,
  created_at,
  updated_at
)
SELECT
  'mbr-' || gen_random_uuid()::text,
  'EO-MBR-' || LPAD(nextval('greenhouse_core.seq_membership_public_id')::text, 4, '0'),
  m.identity_profile_id,
  operating_org.organization_id,
  NULL,
  'team_member',
  m.role_title,
  NULL,
  TRUE,
  'active',
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM greenhouse_core.members m
CROSS JOIN LATERAL (
  SELECT o.organization_id
  FROM greenhouse_core.organizations o
  WHERE o.is_operating_entity = TRUE
    AND o.active = TRUE
  ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
  LIMIT 1
) AS operating_org
WHERE m.active = TRUE
  AND m.identity_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.person_memberships pm
    WHERE pm.profile_id = m.identity_profile_id
      AND pm.organization_id = operating_org.organization_id
      AND pm.membership_type = 'team_member'
  );

UPDATE greenhouse_core.person_memberships pm
SET is_primary = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE pm.active = TRUE
  AND pm.profile_id IN (
    SELECT m.identity_profile_id
    FROM greenhouse_core.members m
    WHERE m.active = TRUE
      AND m.identity_profile_id IS NOT NULL
  )
  AND NOT (
    pm.organization_id = (
      SELECT o.organization_id
      FROM greenhouse_core.organizations o
      WHERE o.is_operating_entity = TRUE
        AND o.active = TRUE
      ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
      LIMIT 1
    )
    AND pm.membership_type = 'team_member'
  );

UPDATE greenhouse_core.person_memberships pm
SET is_primary = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE pm.active = TRUE
  AND pm.organization_id = (
    SELECT o.organization_id
    FROM greenhouse_core.organizations o
    WHERE o.is_operating_entity = TRUE
      AND o.active = TRUE
    ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
    LIMIT 1
  )
  AND pm.membership_type = 'team_member'
  AND pm.profile_id IN (
    SELECT m.identity_profile_id
    FROM greenhouse_core.members m
    WHERE m.active = TRUE
      AND m.identity_profile_id IS NOT NULL
  );

CREATE OR REPLACE VIEW greenhouse_serving.session_360 AS
WITH operating_entity AS (
  SELECT
    o.organization_id,
    o.public_id AS organization_public_id,
    o.organization_name
  FROM greenhouse_core.organizations o
  WHERE o.is_operating_entity = TRUE
    AND o.active = TRUE
  ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST, o.organization_id ASC
  LIMIT 1
)
SELECT
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.client_id,
  c.client_name,
  u.identity_profile_id,
  u.member_id,
  u.microsoft_oid,
  u.microsoft_tenant_id,
  u.microsoft_email,
  u.google_sub,
  u.google_email,
  u.avatar_url,
  u.password_hash,
  u.password_hash_algorithm,
  COALESCE(u.timezone, c.timezone, 'America/Santiago') AS timezone,
  u.default_portal_home_path,
  u.last_login_at,
  u.last_login_provider,
  CASE
    WHEN u.tenant_type = 'client' THEN COALESCE(bridge_space.space_id, membership_context.space_id)
    ELSE NULL::text
  END AS space_id,
  CASE
    WHEN u.tenant_type = 'client' THEN COALESCE(bridge_space.space_public_id, membership_context.space_public_id)
    ELSE NULL::text
  END AS space_public_id,
  CASE
    WHEN u.tenant_type = 'efeonce_internal' THEN COALESCE(op.organization_id, membership_context.organization_id, bridge_org.organization_id)
    ELSE COALESCE(bridge_org.organization_id, membership_context.organization_id)
  END AS organization_id,
  CASE
    WHEN u.tenant_type = 'efeonce_internal' THEN COALESCE(op.organization_public_id, membership_context.organization_public_id, bridge_org.public_id)
    ELSE COALESCE(bridge_org.public_id, membership_context.organization_public_id)
  END AS organization_public_id,
  CASE
    WHEN u.tenant_type = 'efeonce_internal' THEN COALESCE(op.organization_name, membership_context.organization_name, bridge_org.organization_name)
    ELSE COALESCE(bridge_org.organization_name, membership_context.organization_name)
  END AS organization_name,
  COALESCE(
    ARRAY_AGG(DISTINCT ura.role_code) FILTER (
      WHERE ura.active
        AND ura.role_code IS NOT NULL
        AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)
    ),
    ARRAY[]::text[]
  ) AS role_codes,
  COALESCE(
    ARRAY_AGG(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL),
    ARRAY[]::text[]
  ) AS route_groups,
  COALESCE(
    ARRAY_AGG(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled),
    ARRAY[]::text[]
  ) AS feature_flags
FROM greenhouse_core.client_users u
LEFT JOIN greenhouse_core.clients c
  ON c.client_id = u.client_id
LEFT JOIN LATERAL (
  SELECT
    s.space_id,
    s.public_id AS space_public_id,
    s.organization_id
  FROM greenhouse_core.spaces s
  WHERE s.client_id = u.client_id
    AND s.active = TRUE
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
  LIMIT 1
) AS bridge_space ON TRUE
LEFT JOIN greenhouse_core.organizations bridge_org
  ON bridge_org.organization_id = bridge_space.organization_id
 AND bridge_org.active = TRUE
LEFT JOIN LATERAL (
  SELECT
    pm.space_id,
    s.public_id AS space_public_id,
    pm.organization_id,
    o.public_id AS organization_public_id,
    o.organization_name
  FROM greenhouse_core.person_memberships pm
  LEFT JOIN greenhouse_core.spaces s
    ON s.space_id = pm.space_id
  LEFT JOIN greenhouse_core.organizations o
    ON o.organization_id = pm.organization_id
   AND o.active = TRUE
  WHERE pm.profile_id = u.identity_profile_id
    AND pm.active = TRUE
  ORDER BY
    pm.is_primary DESC,
    pm.updated_at DESC NULLS LAST,
    pm.created_at DESC NULLS LAST,
    pm.membership_id ASC
  LIMIT 1
) AS membership_context ON TRUE
LEFT JOIN operating_entity op
  ON TRUE
LEFT JOIN greenhouse_core.user_role_assignments ura
  ON ura.user_id = u.user_id
LEFT JOIN greenhouse_core.roles r
  ON r.role_code = ura.role_code
LEFT JOIN LATERAL UNNEST(r.route_group_scope) AS rg(rg)
  ON TRUE
LEFT JOIN greenhouse_core.client_feature_flags cff
  ON cff.client_id = u.client_id
GROUP BY
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.client_id,
  c.client_name,
  c.timezone,
  u.identity_profile_id,
  u.member_id,
  u.microsoft_oid,
  u.microsoft_tenant_id,
  u.microsoft_email,
  u.google_sub,
  u.google_email,
  u.avatar_url,
  u.password_hash,
  u.password_hash_algorithm,
  u.timezone,
  u.default_portal_home_path,
  u.last_login_at,
  u.last_login_provider,
  bridge_space.space_id,
  bridge_space.space_public_id,
  membership_context.space_id,
  membership_context.space_public_id,
  bridge_org.organization_id,
  bridge_org.public_id,
  bridge_org.organization_name,
  membership_context.organization_id,
  membership_context.organization_public_id,
  membership_context.organization_name,
  op.organization_id,
  op.organization_public_id,
  op.organization_name;

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
    COUNT(DISTINCT pm.organization_id)::int AS organization_membership_count,
    (
      SELECT JSON_AGG(JSON_BUILD_OBJECT(
        'membershipId', sub.membership_id,
        'organizationId', sub.organization_id,
        'organizationName', o.organization_name,
        'spaceId', sub.space_id,
        'membershipType', sub.membership_type,
        'roleLabel', sub.role_label,
        'isPrimary', sub.is_primary
      ) ORDER BY sub.is_primary DESC, o.organization_name NULLS LAST)
      FROM greenhouse_core.person_memberships sub
      LEFT JOIN greenhouse_core.organizations o
        ON o.organization_id = sub.organization_id
      WHERE sub.profile_id = pm.profile_id
        AND sub.active = TRUE
    ) AS memberships_json,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT pm.organization_id), NULL) AS organization_ids,
    (ARRAY_AGG(pm.organization_id ORDER BY pm.is_primary DESC, pm.updated_at DESC NULLS LAST, pm.created_at DESC NULLS LAST, pm.membership_id ASC))[1] AS primary_organization_id,
    (ARRAY_AGG(o.organization_name ORDER BY pm.is_primary DESC, pm.updated_at DESC NULLS LAST, pm.created_at DESC NULLS LAST, pm.membership_id ASC))[1] AS primary_organization_name,
    (ARRAY_AGG(pm.membership_type ORDER BY pm.is_primary DESC, pm.updated_at DESC NULLS LAST, pm.created_at DESC NULLS LAST, pm.membership_id ASC))[1] AS primary_membership_type
  FROM greenhouse_core.person_memberships pm
  LEFT JOIN greenhouse_core.organizations o
    ON o.organization_id = pm.organization_id
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
  COALESCE(mbr.membership_count, 0) AS membership_count,
  mbr.memberships_json AS memberships,
  COALESCE(mbr.organization_ids, ARRAY[]::text[]) AS organization_ids,
  p.created_at,
  p.updated_at,
  p.public_id AS eo_id,
  m.primary_member_id AS member_id,
  u.primary_user_id AS user_id,
  COALESCE(
    NULLIF(TRIM(p.full_name), ''),
    NULLIF(TRIM(m.member_display_name), ''),
    NULLIF(TRIM(u.primary_user_name), ''),
    NULLIF(TRIM(c.primary_contact_name), '')
  ) AS resolved_display_name,
  u.primary_user_email AS user_email,
  u.primary_user_name AS user_full_name,
  CASE
    WHEN COALESCE(u.internal_user_count, 0) > 0 AND COALESCE(u.client_user_count, 0) = 0 THEN 'efeonce_internal'
    WHEN COALESCE(u.client_user_count, 0) > 0 AND COALESCE(u.internal_user_count, 0) = 0 THEN 'client'
    ELSE NULL::text
  END AS tenant_type,
  CASE
    WHEN COALESCE(u.active_user_count, 0) > 0 THEN 'active'
    WHEN COALESCE(u.user_count, 0) > 0 THEN 'inactive'
    ELSE NULL::text
  END AS user_status,
  (COALESCE(u.active_user_count, 0) > 0) AS user_active,
  mbr.primary_organization_id,
  mbr.primary_organization_name,
  mbr.primary_membership_type,
  COALESCE(mbr.organization_membership_count, 0) AS organization_membership_count,
  COALESCE(m.has_active_member, FALSE) AS is_efeonce_collaborator
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

CREATE OR REPLACE VIEW greenhouse_serving.organization_360 AS
SELECT
  o.organization_id,
  o.public_id,
  o.organization_name,
  o.legal_name,
  o.tax_id,
  o.tax_id_type,
  o.industry,
  o.country,
  o.hubspot_company_id,
  o.status,
  o.active,
  o.notes,
  o.created_at,
  o.updated_at,
  COALESCE(o.organization_type, 'other') AS organization_type,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'spaceId', s.space_id,
      'publicId', s.public_id,
      'spaceName', s.space_name,
      'spaceType', s.space_type,
      'clientId', s.client_id,
      'status', s.status
    ) ORDER BY s.space_name)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS spaces,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'membershipId', pm.membership_id,
      'publicId', pm.public_id,
      'profileId', pm.profile_id,
      'fullName', ip.full_name,
      'canonicalEmail', ip.canonical_email,
      'membershipType', pm.membership_type,
      'roleLabel', pm.role_label,
      'department', pm.department,
      'isPrimary', pm.is_primary,
      'spaceId', pm.space_id,
      'memberId', m.member_id,
      'assignedFte', assignment_summary.assigned_fte,
      'assignmentType', assignment_summary.assignment_type,
      'jobLevel', m.job_level,
      'employmentType', m.employment_type
    ) ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST)
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip
      ON ip.profile_id = pm.profile_id
    LEFT JOIN greenhouse_core.members m
      ON m.identity_profile_id = pm.profile_id
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(a.fte_allocation), 0)::numeric AS assigned_fte,
        CASE
          WHEN COUNT(*) = 0 THEN NULL::text
          WHEN COUNT(DISTINCT a.assignment_type) = 1 THEN MIN(a.assignment_type)
          ELSE 'mixed'
        END AS assignment_type
      FROM greenhouse_core.client_team_assignments a
      JOIN greenhouse_core.spaces s
        ON s.client_id = a.client_id
       AND s.organization_id = o.organization_id
       AND s.active = TRUE
      WHERE m.member_id IS NOT NULL
        AND a.member_id = m.member_id
        AND a.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
    ) AS assignment_summary
      ON TRUE
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS people,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS space_count,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS membership_count,
  (
    SELECT COUNT(DISTINCT pm.profile_id)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS unique_person_count
FROM greenhouse_core.organizations o;

GRANT SELECT ON greenhouse_serving.organization_360 TO greenhouse_app, greenhouse_runtime;

-- Down Migration
SET search_path = greenhouse_core, greenhouse_serving, public;

CREATE OR REPLACE VIEW greenhouse_serving.session_360 AS
SELECT
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.client_id,
  c.client_name,
  u.identity_profile_id,
  u.member_id,
  u.microsoft_oid,
  u.microsoft_tenant_id,
  u.microsoft_email,
  u.google_sub,
  u.google_email,
  u.avatar_url,
  u.password_hash,
  u.password_hash_algorithm,
  COALESCE(u.timezone, c.timezone, 'America/Santiago') AS timezone,
  u.default_portal_home_path,
  u.last_login_at,
  u.last_login_provider,
  spc.space_id,
  spc.public_id AS space_public_id,
  org.organization_id,
  org.public_id AS organization_public_id,
  org.organization_name,
  COALESCE(
    ARRAY_AGG(DISTINCT ura.role_code) FILTER (
      WHERE ura.active
        AND ura.role_code IS NOT NULL
        AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)
    ),
    ARRAY[]::text[]
  ) AS role_codes,
  COALESCE(
    ARRAY_AGG(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL),
    ARRAY[]::text[]
  ) AS route_groups,
  COALESCE(
    ARRAY_AGG(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled),
    ARRAY[]::text[]
  ) AS feature_flags
FROM greenhouse_core.client_users u
LEFT JOIN greenhouse_core.clients c
  ON c.client_id = u.client_id
LEFT JOIN greenhouse_core.spaces spc
  ON spc.client_id = u.client_id
 AND spc.active = TRUE
LEFT JOIN greenhouse_core.organizations org
  ON org.organization_id = spc.organization_id
 AND org.active = TRUE
LEFT JOIN greenhouse_core.user_role_assignments ura
  ON ura.user_id = u.user_id
LEFT JOIN greenhouse_core.roles r
  ON r.role_code = ura.role_code
LEFT JOIN LATERAL UNNEST(r.route_group_scope) AS rg(rg)
  ON TRUE
LEFT JOIN greenhouse_core.client_feature_flags cff
  ON cff.client_id = u.client_id
GROUP BY
  u.user_id,
  u.public_id,
  u.email,
  u.full_name,
  u.tenant_type,
  u.auth_mode,
  u.status,
  u.active,
  u.client_id,
  c.client_name,
  c.timezone,
  u.identity_profile_id,
  u.member_id,
  u.microsoft_oid,
  u.microsoft_tenant_id,
  u.microsoft_email,
  u.google_sub,
  u.google_email,
  u.avatar_url,
  u.password_hash,
  u.password_hash_algorithm,
  u.timezone,
  u.default_portal_home_path,
  u.last_login_at,
  u.last_login_provider,
  spc.space_id,
  spc.public_id,
  org.organization_id,
  org.public_id,
  org.organization_name;

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
      SELECT JSON_AGG(JSON_BUILD_OBJECT(
        'membershipId', sub.membership_id,
        'organizationId', sub.organization_id,
        'organizationName', o.organization_name,
        'spaceId', sub.space_id,
        'membershipType', sub.membership_type,
        'roleLabel', sub.role_label,
        'isPrimary', sub.is_primary
      ) ORDER BY sub.is_primary DESC, o.organization_name NULLS LAST)
      FROM greenhouse_core.person_memberships sub
      LEFT JOIN greenhouse_core.organizations o
        ON o.organization_id = sub.organization_id
      WHERE sub.profile_id = pm.profile_id
        AND sub.active = TRUE
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

CREATE OR REPLACE VIEW greenhouse_serving.organization_360 AS
SELECT
  o.organization_id,
  o.public_id,
  o.organization_name,
  o.legal_name,
  o.tax_id,
  o.tax_id_type,
  o.industry,
  o.country,
  o.hubspot_company_id,
  o.status,
  o.active,
  o.notes,
  o.created_at,
  o.updated_at,
  COALESCE(o.organization_type, 'other') AS organization_type,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'spaceId', s.space_id,
      'publicId', s.public_id,
      'spaceName', s.space_name,
      'spaceType', s.space_type,
      'clientId', s.client_id,
      'status', s.status
    ) ORDER BY s.space_name)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS spaces,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'membershipId', pm.membership_id,
      'publicId', pm.public_id,
      'profileId', pm.profile_id,
      'fullName', ip.full_name,
      'canonicalEmail', ip.canonical_email,
      'membershipType', pm.membership_type,
      'roleLabel', pm.role_label,
      'department', pm.department,
      'isPrimary', pm.is_primary,
      'spaceId', pm.space_id
    ) ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST)
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip
      ON ip.profile_id = pm.profile_id
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS people,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS space_count,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS membership_count,
  (
    SELECT COUNT(DISTINCT pm.profile_id)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS unique_person_count
FROM greenhouse_core.organizations o;

GRANT SELECT ON greenhouse_serving.organization_360 TO greenhouse_app, greenhouse_runtime;

UPDATE greenhouse_core.organizations
SET is_operating_entity = FALSE,
    legal_name = CASE WHEN organization_name = 'Efeonce' THEN NULL ELSE legal_name END,
    tax_id = CASE WHEN organization_name = 'Efeonce' THEN NULL ELSE tax_id END,
    tax_id_type = CASE WHEN organization_name = 'Efeonce' THEN NULL ELSE tax_id_type END,
    legal_address = CASE WHEN organization_name = 'Efeonce' THEN NULL ELSE legal_address END,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_name = 'Efeonce'
  AND legal_name = 'Efeonce Group SpA'
  AND tax_id = '77.357.182-1';

DELETE FROM greenhouse_core.person_memberships
WHERE organization_id = (
    SELECT o.organization_id
    FROM greenhouse_core.organizations o
    WHERE o.organization_name = 'Efeonce'
    ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
    LIMIT 1
  )
  AND membership_type = 'team_member'
  AND profile_id IN (
    SELECT m.identity_profile_id
    FROM greenhouse_core.members m
    WHERE m.identity_profile_id IS NOT NULL
  );
