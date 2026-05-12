-- TASK-727/Sentry follow-up: close remaining role/view gaps where the
-- governance matrix could grant `route_group = internal` only because a role
-- belongs to the internal tenant. Preserve existing explicit grants/denials.

WITH candidate_denials AS (
  SELECT
    r.role_code,
    v.view_code
  FROM greenhouse_core.roles r
  CROSS JOIN greenhouse_core.view_registry v
  WHERE r.is_internal = TRUE
    AND v.active = TRUE
    AND v.route_group = 'internal'
    AND NOT ('internal' = ANY(COALESCE(r.route_group_scope, ARRAY[]::text[])))
),
inserted_denials AS (
  INSERT INTO greenhouse_core.role_view_assignments
    (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
  SELECT
    candidate_denials.role_code,
    candidate_denials.view_code,
    FALSE,
    'migration:20260512-internal-route-fallback-denials',
    NOW(),
    NOW(),
    'migration:20260512-internal-route-fallback-denials'
  FROM candidate_denials
  ON CONFLICT (role_code, view_code) DO NOTHING
  RETURNING role_code, view_code
)
INSERT INTO greenhouse_core.view_access_log
  (action, target_role, target_user, view_code, performed_by, reason, created_at)
SELECT
  'revoke_role',
  inserted_denials.role_code,
  NULL,
  inserted_denials.view_code,
  'migration:20260512-internal-route-fallback-denials',
  'Sentry remediation: explicit denial for internal route-group fallback gap; preserves canonical role route_group_scope semantics.',
  NOW()
FROM inserted_denials;

-- Down migration:
-- DELETE FROM greenhouse_core.view_access_log WHERE performed_by = 'migration:20260512-internal-route-fallback-denials';
-- DELETE FROM greenhouse_core.role_view_assignments WHERE updated_by = 'migration:20260512-internal-route-fallback-denials';
