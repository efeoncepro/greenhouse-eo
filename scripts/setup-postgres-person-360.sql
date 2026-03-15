-- Person 360 — Unified identity serving view
-- Anchored on identity_profiles, with LEFT JOIN facets for member, user, and CRM contact.
-- Follows the same pattern as member_360, user_360, provider_360 in setup-postgres-canonical-360.sql.

DROP VIEW IF EXISTS greenhouse_serving.person_360;

CREATE OR REPLACE VIEW greenhouse_serving.person_360 AS
SELECT
  -- Identity anchor (root)
  ip.profile_id           AS identity_profile_id,
  ip.public_id            AS identity_public_id,
  ip.canonical_email,
  ip.full_name,
  ip.job_title,
  ip.profile_type,
  ip.status               AS identity_status,
  ip.active               AS identity_active,
  ip.primary_source_system,

  -- Member facet (nullable)
  m.member_id,
  m.public_id             AS member_public_id,
  m.display_name          AS member_display_name,
  m.primary_email         AS member_email,
  m.job_level,
  m.employment_type,
  m.hire_date,
  m.status                AS member_status,
  m.active                AS member_active,
  m.department_id,
  d.name                  AS department_name,

  -- User facet: primary active user (nullable)
  first_user.user_id,
  first_user.public_id    AS user_public_id,
  first_user.email        AS user_email,
  first_user.tenant_type,
  first_user.auth_mode,
  first_user.status       AS user_status,
  first_user.active       AS user_active,
  first_user.client_id,
  c.client_name,
  first_user.last_login_at,

  -- CRM contact facet: primary linked contact (nullable)
  first_contact.contact_record_id AS crm_contact_id,
  first_contact.display_name      AS crm_display_name,
  first_contact.email             AS crm_email,

  -- Aggregates
  COALESCE(user_agg.user_count, 0)                    AS user_count,
  COALESCE(link_agg.source_link_count, 0)              AS source_link_count,
  COALESCE(link_agg.linked_systems, ARRAY[]::TEXT[])   AS linked_systems,

  -- Facet booleans (convenience for filtering and UX)
  (m.member_id IS NOT NULL)                     AS has_member_facet,
  (first_user.user_id IS NOT NULL)              AS has_user_facet,
  (first_contact.contact_record_id IS NOT NULL) AS has_crm_facet,

  ip.created_at,
  ip.updated_at

FROM greenhouse_core.identity_profiles AS ip

LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id

LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id

-- Deterministic pick: first active user, then earliest created
LEFT JOIN LATERAL (
  SELECT cu.*
  FROM greenhouse_core.client_users cu
  WHERE cu.identity_profile_id = ip.profile_id
  ORDER BY cu.active DESC, cu.created_at ASC
  LIMIT 1
) AS first_user ON TRUE

LEFT JOIN greenhouse_core.clients AS c
  ON c.client_id = first_user.client_id

-- Deterministic pick: first linked CRM contact
LEFT JOIN LATERAL (
  SELECT ct.*
  FROM greenhouse_crm.contacts ct
  WHERE ct.linked_identity_profile_id = ip.profile_id
  ORDER BY ct.created_at ASC
  LIMIT 1
) AS first_contact ON TRUE

-- User count aggregate
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS user_count
  FROM greenhouse_core.client_users cu2
  WHERE cu2.identity_profile_id = ip.profile_id
) AS user_agg ON TRUE

-- Source link aggregate
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS source_link_count,
    ARRAY_AGG(DISTINCT sl.source_system) FILTER (WHERE sl.active) AS linked_systems
  FROM greenhouse_core.identity_profile_source_links sl
  WHERE sl.profile_id = ip.profile_id
) AS link_agg ON TRUE;
