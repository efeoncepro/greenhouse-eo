-- Up Migration
-- TASK-431 — Tenant + User Locale Persistence Model
-- Locale is presentation state. It does not change routeGroups, views,
-- entitlements, startup policy, or business semantics.

ALTER TABLE greenhouse_core.identity_profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS default_locale TEXT;

ALTER TABLE greenhouse_core.clients
  ADD COLUMN IF NOT EXISTS default_locale TEXT;

ALTER TABLE greenhouse_core.identity_profiles
  DROP CONSTRAINT IF EXISTS identity_profiles_preferred_locale_check;

ALTER TABLE greenhouse_core.identity_profiles
  ADD CONSTRAINT identity_profiles_preferred_locale_check
  CHECK (preferred_locale IS NULL OR preferred_locale IN ('es-CL', 'en-US')) NOT VALID;

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_default_locale_check;

ALTER TABLE greenhouse_core.organizations
  ADD CONSTRAINT organizations_default_locale_check
  CHECK (default_locale IS NULL OR default_locale IN ('es-CL', 'en-US')) NOT VALID;

ALTER TABLE greenhouse_core.clients
  DROP CONSTRAINT IF EXISTS clients_default_locale_check;

ALTER TABLE greenhouse_core.clients
  ADD CONSTRAINT clients_default_locale_check
  CHECK (default_locale IS NULL OR default_locale IN ('es-CL', 'en-US')) NOT VALID;

-- Absorb legacy email-era user locale into the canonical identity profile
-- preference. Existing runtime has client_users.locale='es' for all users;
-- preserving it as explicit es-CL avoids surprising current sessions.
WITH normalized_legacy AS (
  SELECT
    cu.identity_profile_id,
    CASE
      WHEN BOOL_OR(cu.locale IN ('en', 'en-US')) THEN 'en-US'
      WHEN BOOL_OR(cu.locale IN ('es', 'es-CL')) THEN 'es-CL'
      ELSE NULL
    END AS preferred_locale
  FROM greenhouse_core.client_users cu
  WHERE cu.identity_profile_id IS NOT NULL
  GROUP BY cu.identity_profile_id
)
UPDATE greenhouse_core.identity_profiles ip
SET preferred_locale = nl.preferred_locale,
    updated_at = CURRENT_TIMESTAMP
FROM normalized_legacy nl
WHERE ip.profile_id = nl.identity_profile_id
  AND ip.preferred_locale IS NULL
  AND nl.preferred_locale IS NOT NULL;

-- Seed existing accounts/tenant bridges conservatively to the current portal
-- default. Future tenant defaults can be changed by admin UI/API.
UPDATE greenhouse_core.organizations
SET default_locale = 'es-CL',
    updated_at = CURRENT_TIMESTAMP
WHERE default_locale IS NULL
  AND active = TRUE;

UPDATE greenhouse_core.clients
SET default_locale = 'es-CL',
    updated_at = CURRENT_TIMESTAMP
WHERE default_locale IS NULL
  AND active = TRUE;

ALTER TABLE greenhouse_core.identity_profiles
  VALIDATE CONSTRAINT identity_profiles_preferred_locale_check;

ALTER TABLE greenhouse_core.organizations
  VALIDATE CONSTRAINT organizations_default_locale_check;

ALTER TABLE greenhouse_core.clients
  VALIDATE CONSTRAINT clients_default_locale_check;

CREATE INDEX IF NOT EXISTS identity_profiles_preferred_locale_idx
  ON greenhouse_core.identity_profiles (preferred_locale)
  WHERE preferred_locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS organizations_default_locale_idx
  ON greenhouse_core.organizations (default_locale)
  WHERE default_locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS clients_default_locale_idx
  ON greenhouse_core.clients (default_locale)
  WHERE default_locale IS NOT NULL;

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
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE (ura.active AND (ura.role_code IS NOT NULL) AND ((ura.effective_to IS NULL) OR (ura.effective_to > CURRENT_TIMESTAMP)))), ARRAY[]::text[]) AS role_codes,
    COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE (rg.rg IS NOT NULL)), ARRAY[]::text[]) AS route_groups,
    COALESCE(array_agg(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled), ARRAY[]::text[]) AS feature_flags,
    u.locale AS legacy_locale,
    ip.preferred_locale,
    c.default_locale AS client_default_locale,
    org.default_locale AS organization_default_locale,
    COALESCE(
      ip.preferred_locale,
      org.default_locale,
      c.default_locale,
      CASE
        WHEN u.locale IN ('en', 'en-US') THEN 'en-US'
        WHEN u.locale IN ('es', 'es-CL') THEN 'es-CL'
        ELSE NULL
      END,
      'es-CL'
    ) AS effective_locale
   FROM ((((((((greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.identity_profiles ip ON ((ip.profile_id = u.identity_profile_id)))
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = u.client_id)))
     LEFT JOIN greenhouse_core.spaces spc ON (((spc.client_id = u.client_id) AND (spc.active = true))))
     LEFT JOIN greenhouse_core.organizations org ON (((org.organization_id = spc.organization_id) AND (org.active = true))))
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ((ura.user_id = u.user_id)))
     LEFT JOIN greenhouse_core.roles r ON ((r.role_code = ura.role_code)))
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON (true))
     LEFT JOIN greenhouse_core.client_feature_flags cff ON ((cff.client_id = u.client_id)))
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, c.default_locale, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, u.locale, ip.preferred_locale, spc.space_id, spc.public_id, org.organization_id, org.public_id, org.organization_name, org.default_locale;

GRANT SELECT ON greenhouse_serving.session_360 TO greenhouse_runtime;
GRANT SELECT, UPDATE (preferred_locale) ON greenhouse_core.identity_profiles TO greenhouse_runtime;
GRANT SELECT, UPDATE (default_locale) ON greenhouse_core.organizations TO greenhouse_runtime;
GRANT SELECT, UPDATE (default_locale) ON greenhouse_core.clients TO greenhouse_runtime;

-- Down Migration

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
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE (ura.active AND (ura.role_code IS NOT NULL) AND ((ura.effective_to IS NULL) OR (ura.effective_to > CURRENT_TIMESTAMP)))), ARRAY[]::text[]) AS role_codes,
    COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE (rg.rg IS NOT NULL)), ARRAY[]::text[]) AS route_groups,
    COALESCE(array_agg(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled), ARRAY[]::text[]) AS feature_flags
   FROM (((((((greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = u.client_id)))
     LEFT JOIN greenhouse_core.spaces spc ON (((spc.client_id = u.client_id) AND (spc.active = true))))
     LEFT JOIN greenhouse_core.organizations org ON (((org.organization_id = spc.organization_id) AND (org.active = true))))
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ((ura.user_id = u.user_id)))
     LEFT JOIN greenhouse_core.roles r ON ((r.role_code = ura.role_code)))
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON (true))
     LEFT JOIN greenhouse_core.client_feature_flags cff ON ((cff.client_id = u.client_id)))
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, spc.space_id, spc.public_id, org.organization_id, org.public_id, org.organization_name;

DROP INDEX IF EXISTS greenhouse_core.identity_profiles_preferred_locale_idx;
DROP INDEX IF EXISTS greenhouse_core.organizations_default_locale_idx;
DROP INDEX IF EXISTS greenhouse_core.clients_default_locale_idx;

ALTER TABLE greenhouse_core.identity_profiles
  DROP CONSTRAINT IF EXISTS identity_profiles_preferred_locale_check;

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_default_locale_check;

ALTER TABLE greenhouse_core.clients
  DROP CONSTRAINT IF EXISTS clients_default_locale_check;

ALTER TABLE greenhouse_core.identity_profiles
  DROP COLUMN IF EXISTS preferred_locale;

ALTER TABLE greenhouse_core.organizations
  DROP COLUMN IF EXISTS default_locale;

ALTER TABLE greenhouse_core.clients
  DROP COLUMN IF EXISTS default_locale;
