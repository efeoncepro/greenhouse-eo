-- Up Migration
-- Exclude merged profiles from person_360 serving view.
-- Profiles with status='merged' are absorbed into another profile
-- and should not appear as separate rows.

DROP VIEW IF EXISTS greenhouse_serving.person_360;

CREATE OR REPLACE VIEW greenhouse_serving.person_360 AS
SELECT
  -- ═══ Canonical identity ═══
  ip.profile_id           AS identity_profile_id,
  ip.public_id            AS eo_id,
  ip.serial_number,
  ip.canonical_email,
  ip.full_name,
  ip.job_title,
  ip.profile_type,
  ip.status               AS identity_status,
  ip.active               AS identity_active,
  ip.primary_source_system,
  ip.default_auth_mode,

  -- ═══ Resolved fields (COALESCE — best available cross-facet) ═══
  COALESCE(ip.canonical_email, m.primary_email, first_user.email, first_contact.email)
    AS resolved_email,
  COALESCE(m.display_name, ip.full_name, first_user.full_name, first_contact.display_name)
    AS resolved_display_name,
  first_user.avatar_url   AS resolved_avatar_url,
  COALESCE(m.phone, first_contact.phone)
    AS resolved_phone,
  COALESCE(ip.job_title, first_contact.job_title)
    AS resolved_job_title,

  -- ═══ Member facet (internal collaborator) ═══
  m.member_id,
  m.public_id             AS member_public_id,
  m.display_name          AS member_display_name,
  m.primary_email         AS member_email,
  m.phone                 AS member_phone,
  m.job_level,
  m.employment_type,
  m.hire_date,
  m.contract_end_date,
  m.daily_required,
  m.reports_to_member_id,
  m.status                AS member_status,
  m.active                AS member_active,
  m.department_id,
  d.name                  AS department_name,

  -- ═══ User facet (portal access) ═══
  first_user.user_id,
  first_user.public_id    AS user_public_id,
  first_user.email        AS user_email,
  first_user.full_name    AS user_full_name,
  first_user.tenant_type,
  first_user.auth_mode,
  first_user.status       AS user_status,
  first_user.active       AS user_active,
  first_user.client_id,
  c.client_name,
  first_user.last_login_at,
  first_user.avatar_url,
  first_user.timezone     AS user_timezone,
  first_user.default_portal_home_path,
  first_user.microsoft_oid,
  first_user.google_sub,
  first_user.password_hash_algorithm,

  -- ═══ CRM facet (commercial contact) ═══
  first_contact.contact_record_id   AS crm_contact_id,
  first_contact.display_name        AS crm_display_name,
  first_contact.email               AS crm_email,
  first_contact.job_title           AS crm_job_title,
  first_contact.phone               AS crm_phone,
  first_contact.mobile_phone        AS crm_mobile_phone,
  first_contact.lifecycle_stage,
  first_contact.lead_status,
  first_contact.hubspot_contact_id,

  -- ═══ Aggregates ═══
  COALESCE(user_agg.user_count, 0)                    AS user_count,
  COALESCE(link_agg.source_link_count, 0)              AS source_link_count,
  COALESCE(link_agg.linked_systems, ARRAY[]::TEXT[])   AS linked_systems,
  COALESCE(role_agg.active_role_codes, ARRAY[]::TEXT[]) AS active_role_codes,

  -- ═══ Facet booleans ═══
  (m.member_id IS NOT NULL)                     AS has_member_facet,
  (first_user.user_id IS NOT NULL)              AS has_user_facet,
  (first_contact.contact_record_id IS NOT NULL) AS has_crm_facet,

  ip.created_at,
  ip.updated_at

FROM greenhouse_core.identity_profiles AS ip

-- Member facet
LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id

LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id

-- User facet: deterministic first active user
LEFT JOIN LATERAL (
  SELECT cu.*
  FROM greenhouse_core.client_users cu
  WHERE cu.identity_profile_id = ip.profile_id
  ORDER BY cu.active DESC, cu.created_at ASC
  LIMIT 1
) AS first_user ON TRUE

LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = first_user.client_id

-- CRM facet: first linked contact
LEFT JOIN LATERAL (
  SELECT ct.*
  FROM greenhouse_crm.contacts ct
  WHERE ct.linked_identity_profile_id = ip.profile_id
  ORDER BY ct.created_at ASC
  LIMIT 1
) AS first_contact ON TRUE

-- User count
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS user_count
  FROM greenhouse_core.client_users cu2
  WHERE cu2.identity_profile_id = ip.profile_id
) AS user_agg ON TRUE

-- Source links
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS source_link_count,
    ARRAY_AGG(DISTINCT sl.source_system) FILTER (WHERE sl.active) AS linked_systems
  FROM greenhouse_core.identity_profile_source_links sl
  WHERE sl.profile_id = ip.profile_id
) AS link_agg ON TRUE

-- Active role codes from primary user
LEFT JOIN LATERAL (
  SELECT
    ARRAY_AGG(DISTINCT ura.role_code) FILTER (
      WHERE ura.active
        AND ura.role_code IS NOT NULL
    ) AS active_role_codes
  FROM greenhouse_core.user_role_assignments ura
  WHERE ura.user_id = first_user.user_id
) AS role_agg ON TRUE

-- ── Exclude merged profiles ──
WHERE ip.status != 'merged';

GRANT SELECT ON greenhouse_serving.person_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_360 TO greenhouse_migrator;
GRANT SELECT ON greenhouse_serving.person_360 TO greenhouse_app;


-- Down Migration
-- Remove the WHERE filter, restoring person_360 to include all profiles
-- (rollback to previous definition from migration 20260405164846570)
