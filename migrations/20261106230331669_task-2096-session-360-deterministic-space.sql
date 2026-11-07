-- Up Migration
--
-- TASK-2096 (H1) — session_360 must resolve one row per user and never pick a Space by row order.
--
-- ROOT CAUSE: the view (last defined by TASK-987) LEFT JOINs every active Space of the user's
-- client and GROUPs BY spc.space_id, so a client with two active Spaces yields two rows per user.
-- identity-store.ts reads it with `LIMIT 1` and no ORDER BY: the session Space becomes whatever
-- row the planner returns first. Measured 2026-11-06 (READ ONLY): 0 clients with more than one
-- active Space, 116 rows for 116 users — the defect is latent until a second Space exists.
--
-- FIX: a LATERAL aggregate resolves the client's active Spaces into exactly one row.
--   * space_id / space_public_id: only when the client has exactly ONE active Space.
--   * organization_id: when every active Space shares one Organization (operational accounts of
--     one company, ADR GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1, model B).
--   * active_space_count + space_selection_required are APPENDED so callers can tell
--     "no Space" from "Space must be chosen explicitly". No ordering by updated_at anywhere:
--     editing a Space's metadata can never change the session context.
-- Every pre-existing column keeps its name, position and type; with 0 or 1 active Space the
-- output is identical to the TASK-987 definition (verified row-by-row against the live view).

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
    spc.space_public_id,
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
        END, 'es-CL'::text) AS effective_locale,
    COALESCE(spc.active_space_count, 0) AS active_space_count,
    COALESCE(spc.active_space_count, 0) > 1 AS space_selection_required
   FROM greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = u.identity_profile_id
     LEFT JOIN greenhouse_core.clients c ON c.client_id = u.client_id
     LEFT JOIN LATERAL (
        SELECT CASE WHEN count(*) = 1 THEN min(s.space_id) END AS space_id,
               CASE WHEN count(*) = 1 THEN min(s.public_id) END AS space_public_id,
               CASE WHEN count(DISTINCT s.organization_id) = 1 THEN min(s.organization_id) END AS organization_id,
               count(*)::integer AS active_space_count
          FROM greenhouse_core.spaces s
         WHERE s.client_id = u.client_id AND s.active = true
     ) spc ON true
     LEFT JOIN greenhouse_core.organizations org ON org.organization_id = spc.organization_id AND org.active = true
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ura.user_id = u.user_id
     LEFT JOIN greenhouse_core.roles r ON r.role_code = ura.role_code
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON true
     LEFT JOIN greenhouse_core.client_feature_flags cff ON cff.client_id = u.client_id
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, c.default_locale, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, u.locale, ip.preferred_locale, spc.space_id, spc.space_public_id, spc.active_space_count, org.organization_id, org.public_id, org.organization_name, org.default_locale;

-- Anti pre-up-marker guard: abort unless the new columns exist and the view is one row per user.
DO $$
DECLARE
  missing_columns integer;
  duplicated_users integer;
BEGIN
  SELECT 2 - count(*) INTO missing_columns
    FROM information_schema.columns
   WHERE table_schema = 'greenhouse_serving' AND table_name = 'session_360'
     AND column_name IN ('active_space_count', 'space_selection_required');

  IF missing_columns <> 0 THEN
    RAISE EXCEPTION 'TASK-2096 anti pre-up-marker check: session_360 is missing the space selection columns.';
  END IF;

  SELECT count(*) INTO duplicated_users
    FROM (SELECT user_id FROM greenhouse_serving.session_360 GROUP BY user_id HAVING count(*) > 1) d;

  IF duplicated_users <> 0 THEN
    RAISE EXCEPTION 'TASK-2096: session_360 still returns more than one row for % user(s).', duplicated_users;
  END IF;
END
$$;

GRANT SELECT ON greenhouse_serving.session_360 TO greenhouse_runtime;

-- Down Migration
--
-- No statements on purpose. CREATE OR REPLACE VIEW cannot drop the appended columns, and
-- restoring the TASK-987 definition would bring back the arbitrary Space choice. Roll back by
-- reverting the code that reads space_selection_required; the extra columns are inert for it.
