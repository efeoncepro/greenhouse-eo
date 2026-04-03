-- ════════════════════════════════════════════════════════════════════════════
-- Account 360 Object Model — M3: Organization 360 Serving View
-- ════════════════════════════════════════════════════════════════════════════
-- Composite view providing a 360° view of an Organization:
--   - Core attributes
--   - Spaces (tenant operativo) facet
--   - People (via person_memberships) facet
--   - Finance summary (via client bridge)
-- ════════════════════════════════════════════════════════════════════════════

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
  -- Spaces facet: operational tenants under this organization
  (
    SELECT json_agg(json_build_object(
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
  -- People facet: all person memberships for this organization
  (
    SELECT json_agg(json_build_object(
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
    ) ORDER BY pm.is_primary DESC, ip.full_name)
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
    LEFT JOIN greenhouse_core.members m ON m.identity_profile_id = pm.profile_id
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
    ) assignment_summary ON TRUE
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS people,
  -- Counts
  (
    SELECT COUNT(*)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id AND s.active = TRUE
  ) AS space_count,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id AND pm.active = TRUE
  ) AS membership_count,
  (
    SELECT COUNT(DISTINCT pm.profile_id)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id AND pm.active = TRUE
  ) AS unique_person_count
FROM greenhouse_core.organizations o;

-- Grant access
GRANT SELECT ON greenhouse_serving.organization_360
  TO greenhouse_app, greenhouse_runtime;
