-- Up Migration
--
-- TASK-987 — session_360.route_groups must honor role-assignment lifecycle.
--
-- ROOT CAUSE (over-exposure, ISSUE-083): the `greenhouse_serving.session_360`
-- view aggregates `role_codes` WITH the lifecycle predicate
-- (`ura.active AND (effective_to IS NULL OR > now)`) but aggregates
-- `route_groups` WITHOUT it. Result: a REVOKED/expired role assignment still
-- contributes its `roles.route_group_scope`, so users keep broad navigation
-- (e.g. a collaborator whose `efeonce_account` was revoked still sees
-- `internal`+`commercial` → Personas/Comercial). The BigQuery fallback path
-- (`getIdentityAccessRecord`) already filters `ura.active=TRUE AND status='active'`
-- at the JOIN — only this PG view diverged.
--
-- FIX: the `route_groups` aggregate FILTER mirrors the EXACT lifecycle predicate
-- used by `role_codes`. One canonical predicate; no divergence.
--
-- GOVERNANCE remediation (same transaction, no access gap): Humberly Henriquez
-- ("Finance Manager") was operating on leaked route groups from her revoked
-- finance_manager/hr_payroll/efeonce_operations roles. Per operator decision she
-- legitimately needs Finanzas + HR → re-granted the canonical ACTIVE roles
-- `finance_admin` + `hr_manager` (which carry route_groups + role_view_assignments
-- + role_entitlement_defaults). The other affected users (Valentina, Andres,
-- Melkin) are collaborators who correctly lose the leaked broad groups; their
-- supervisor surfaces (Mi equipo / Aprobaciones) are gated by `supervisorAccess`
-- (independent of route groups) and are UNAFFECTED. Daniela keeps `internal`
-- via her ACTIVE `efeonce_operations`.

-- 1. Governance remediation — re-grant Humberly her canonical ACTIVE roles
--    BEFORE the view fix takes effect (idempotent; no access gap).
INSERT INTO greenhouse_core.user_role_assignments
  (assignment_id, user_id, role_code, status, active, effective_from, assigned_by_user_id)
SELECT
  'assignment-efeonce-internal-humberly-henriquez-finance_admin',
  'user-efeonce-internal-humberly-henriquez',
  'finance_admin', 'active', TRUE, NOW(), 'user-efeonce-admin-julio-reyes'
WHERE NOT EXISTS (
  SELECT 1 FROM greenhouse_core.user_role_assignments
  WHERE user_id = 'user-efeonce-internal-humberly-henriquez'
    AND role_code = 'finance_admin' AND active = TRUE
);

INSERT INTO greenhouse_core.user_role_assignments
  (assignment_id, user_id, role_code, status, active, effective_from, assigned_by_user_id)
SELECT
  'assignment-efeonce-internal-humberly-henriquez-hr_manager',
  'user-efeonce-internal-humberly-henriquez',
  'hr_manager', 'active', TRUE, NOW(), 'user-efeonce-admin-julio-reyes'
WHERE NOT EXISTS (
  SELECT 1 FROM greenhouse_core.user_role_assignments
  WHERE user_id = 'user-efeonce-internal-humberly-henriquez'
    AND role_code = 'hr_manager' AND active = TRUE
);

-- 2. Canonical fix — route_groups derives ONLY from active, in-effect roles.
CREATE OR REPLACE VIEW greenhouse_serving.session_360 AS
 SELECT u.user_id,
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
    COALESCE(u.timezone, c.timezone, 'America/Santiago'::text) AS timezone,
    u.default_portal_home_path,
    u.last_login_at,
    u.last_login_provider,
    spc.space_id,
    spc.public_id AS space_public_id,
    org.organization_id,
    org.public_id AS organization_public_id,
    org.organization_name,
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE ura.active AND ura.role_code IS NOT NULL AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)), ARRAY[]::text[]) AS role_codes,
    COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL AND ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)), ARRAY[]::text[]) AS route_groups,
    COALESCE(array_agg(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled), ARRAY[]::text[]) AS feature_flags,
    u.locale AS legacy_locale,
    ip.preferred_locale,
    c.default_locale AS client_default_locale,
    org.default_locale AS organization_default_locale,
    COALESCE(ip.preferred_locale, org.default_locale, c.default_locale,
        CASE
            WHEN u.locale = ANY (ARRAY['en'::text, 'en-US'::text]) THEN 'en-US'::text
            WHEN u.locale = ANY (ARRAY['es'::text, 'es-CL'::text]) THEN 'es-CL'::text
            ELSE NULL::text
        END, 'es-CL'::text) AS effective_locale
   FROM greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = u.identity_profile_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = u.client_id
     LEFT JOIN greenhouse_core.spaces spc ON spc.client_id = u.client_id AND spc.active = true
     LEFT JOIN greenhouse_core.organizations org ON org.organization_id = spc.organization_id AND org.active = true
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ura.user_id = u.user_id
     LEFT JOIN greenhouse_core.roles r ON r.role_code = ura.role_code
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON true
     LEFT JOIN greenhouse_core.client_feature_flags cff ON cff.client_id = u.client_id
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, c.default_locale, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, u.locale, ip.preferred_locale, spc.space_id, spc.public_id, org.organization_id, org.public_id, org.organization_name, org.default_locale;

-- 3. Anti pre-up-marker + correctness verification: route_groups must NEVER
--    contain a group that does not come from an ACTIVE+in-effect role.
DO $$
DECLARE leak_count INTEGER; humberly_roles INTEGER;
BEGIN
  SELECT COUNT(*) INTO leak_count
  FROM greenhouse_serving.session_360 s
  LEFT JOIN LATERAL (
    SELECT COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL), ARRAY[]::text[]) AS active_groups
    FROM greenhouse_core.user_role_assignments ura
    JOIN greenhouse_core.roles r ON r.role_code = ura.role_code
    LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON true
    WHERE ura.user_id = s.user_id
      AND ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)
  ) a ON true
  WHERE NOT (s.route_groups <@ COALESCE(a.active_groups, ARRAY[]::text[]));

  IF leak_count > 0 THEN
    RAISE EXCEPTION 'TASK-987: session_360.route_groups still leaks from inactive roles for % user(s)', leak_count;
  END IF;

  SELECT COUNT(*) INTO humberly_roles
  FROM greenhouse_core.user_role_assignments
  WHERE user_id = 'user-efeonce-internal-humberly-henriquez'
    AND role_code IN ('finance_admin','hr_manager') AND active = TRUE;

  IF humberly_roles <> 2 THEN
    RAISE EXCEPTION 'TASK-987: expected Humberly to have 2 active canonical roles (finance_admin, hr_manager), got %', humberly_roles;
  END IF;
END
$$;

-- Down Migration
--
-- Reverts the view to the prior (leaky) derivation and removes the Humberly
-- re-grant. The down path intentionally restores the previous behavior
-- (over-exposure) for migration reversibility only.

DELETE FROM greenhouse_core.user_role_assignments
WHERE assignment_id IN (
  'assignment-efeonce-internal-humberly-henriquez-finance_admin',
  'assignment-efeonce-internal-humberly-henriquez-hr_manager'
);

CREATE OR REPLACE VIEW greenhouse_serving.session_360 AS
 SELECT u.user_id,
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
    COALESCE(u.timezone, c.timezone, 'America/Santiago'::text) AS timezone,
    u.default_portal_home_path,
    u.last_login_at,
    u.last_login_provider,
    spc.space_id,
    spc.public_id AS space_public_id,
    org.organization_id,
    org.public_id AS organization_public_id,
    org.organization_name,
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE ura.active AND ura.role_code IS NOT NULL AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)), ARRAY[]::text[]) AS role_codes,
    COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL), ARRAY[]::text[]) AS route_groups,
    COALESCE(array_agg(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled), ARRAY[]::text[]) AS feature_flags,
    u.locale AS legacy_locale,
    ip.preferred_locale,
    c.default_locale AS client_default_locale,
    org.default_locale AS organization_default_locale,
    COALESCE(ip.preferred_locale, org.default_locale, c.default_locale,
        CASE
            WHEN u.locale = ANY (ARRAY['en'::text, 'en-US'::text]) THEN 'en-US'::text
            WHEN u.locale = ANY (ARRAY['es'::text, 'es-CL'::text]) THEN 'es-CL'::text
            ELSE NULL::text
        END, 'es-CL'::text) AS effective_locale
   FROM greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = u.identity_profile_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = u.client_id
     LEFT JOIN greenhouse_core.spaces spc ON spc.client_id = u.client_id AND spc.active = true
     LEFT JOIN greenhouse_core.organizations org ON org.organization_id = spc.organization_id AND org.active = true
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ura.user_id = u.user_id
     LEFT JOIN greenhouse_core.roles r ON r.role_code = ura.role_code
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON true
     LEFT JOIN greenhouse_core.client_feature_flags cff ON cff.client_id = u.client_id
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, c.default_locale, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, u.locale, ip.preferred_locale, spc.space_id, spc.public_id, org.organization_id, org.public_id, org.organization_name, org.default_locale;
