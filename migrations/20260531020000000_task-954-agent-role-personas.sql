-- Up Migration
-- TASK-954 — Agent Role Personas
-- Adds least-privilege operational agent users for collaborator and client-facing flows.
-- Password: Gh-Agent-2026! (same bcrypt cost-12 hash as the original agent user)
-- Intended for POST /api/auth/agent-session, Playwright, GVC and role-sensitive diagnostics.

SET search_path = greenhouse_core, public;
SELECT set_config('app.password_change_authorized', 'true', true);

-- 0. Dedicated sandbox tenant for the client-facing agent persona.
INSERT INTO clients (
  client_id,
  public_id,
  client_name,
  legal_name,
  tenant_type,
  status,
  active,
  timezone,
  country_code,
  billing_currency,
  notes,
  lifecyclestage,
  lifecyclestage_source,
  default_locale
) VALUES (
  'agent-client-sandbox',
  'agent-client-sandbox',
  'Greenhouse Agent Client Sandbox',
  'Greenhouse Agent Client Sandbox',
  'client',
  'active',
  TRUE,
  'America/Santiago',
  'CL',
  'CLP',
  'TASK-954 — sandbox tenant for client-facing automated agent sessions. Not a real customer.',
  'customer',
  'manual_override',
  'es-CL'
)
ON CONFLICT (client_id) DO UPDATE
SET client_name = EXCLUDED.client_name,
    legal_name = EXCLUDED.legal_name,
    tenant_type = EXCLUDED.tenant_type,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    timezone = EXCLUDED.timezone,
    country_code = EXCLUDED.country_code,
    billing_currency = EXCLUDED.billing_currency,
    notes = EXCLUDED.notes,
    lifecyclestage = EXCLUDED.lifecyclestage,
    lifecyclestage_source = EXCLUDED.lifecyclestage_source,
    default_locale = EXCLUDED.default_locale,
    updated_at = NOW();

-- 1. Collaborator-only agent persona.
INSERT INTO client_users (
  user_id,
  email,
  full_name,
  tenant_type,
  auth_mode,
  status,
  active,
  password_hash,
  password_hash_algorithm,
  timezone,
  default_portal_home_path,
  locale
) VALUES (
  'user-agent-collaborator-001',
  'agent-collaborator@greenhouse.efeonce.org',
  'Greenhouse Agent (Collaborator)',
  'efeonce_internal',
  'credentials',
  'active',
  TRUE,
  '$2b$12$Du4ozS/P9WA5tzTrJ99pZe.jBzQx7VwScxnlUQcwRdeE5QUhcDtX.',
  'bcrypt',
  'America/Santiago',
  '/my',
  'es-CL'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    tenant_type = EXCLUDED.tenant_type,
    auth_mode = EXCLUDED.auth_mode,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    password_hash = EXCLUDED.password_hash,
    password_hash_algorithm = EXCLUDED.password_hash_algorithm,
    timezone = EXCLUDED.timezone,
    default_portal_home_path = EXCLUDED.default_portal_home_path,
    locale = EXCLUDED.locale,
    updated_at = NOW();

INSERT INTO user_role_assignments (
  assignment_id,
  user_id,
  role_code,
  status,
  active,
  assigned_by_user_id
) VALUES (
  'assign-agent-collaborator-collaborator',
  'user-agent-collaborator-001',
  'collaborator',
  'active',
  TRUE,
  'user-agent-e2e-001'
)
ON CONFLICT (assignment_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    role_code = EXCLUDED.role_code,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    assigned_by_user_id = EXCLUDED.assigned_by_user_id,
    updated_at = NOW();

-- 2. Client-facing composite agent persona.
INSERT INTO client_users (
  user_id,
  client_id,
  email,
  full_name,
  tenant_type,
  auth_mode,
  status,
  active,
  password_hash,
  password_hash_algorithm,
  timezone,
  default_portal_home_path,
  locale
) VALUES (
  'user-agent-client-001',
  'agent-client-sandbox',
  'agent-client@greenhouse.efeonce.org',
  'Greenhouse Agent (Client)',
  'client',
  'credentials',
  'active',
  TRUE,
  '$2b$12$Du4ozS/P9WA5tzTrJ99pZe.jBzQx7VwScxnlUQcwRdeE5QUhcDtX.',
  'bcrypt',
  'America/Santiago',
  '/home',
  'es-CL'
)
ON CONFLICT (user_id) DO UPDATE
SET client_id = EXCLUDED.client_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    tenant_type = EXCLUDED.tenant_type,
    auth_mode = EXCLUDED.auth_mode,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    password_hash = EXCLUDED.password_hash,
    password_hash_algorithm = EXCLUDED.password_hash_algorithm,
    timezone = EXCLUDED.timezone,
    default_portal_home_path = EXCLUDED.default_portal_home_path,
    locale = EXCLUDED.locale,
    updated_at = NOW();

INSERT INTO user_role_assignments (
  assignment_id,
  user_id,
  role_code,
  client_id,
  status,
  active,
  assigned_by_user_id
) VALUES
  (
    'assign-agent-client-executive',
    'user-agent-client-001',
    'client_executive',
    'agent-client-sandbox',
    'active',
    TRUE,
    'user-agent-e2e-001'
  ),
  (
    'assign-agent-client-manager',
    'user-agent-client-001',
    'client_manager',
    'agent-client-sandbox',
    'active',
    TRUE,
    'user-agent-e2e-001'
  ),
  (
    'assign-agent-client-specialist',
    'user-agent-client-001',
    'client_specialist',
    'agent-client-sandbox',
    'active',
    TRUE,
    'user-agent-e2e-001'
  )
ON CONFLICT (assignment_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    role_code = EXCLUDED.role_code,
    client_id = EXCLUDED.client_id,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    assigned_by_user_id = EXCLUDED.assigned_by_user_id,
    updated_at = NOW();

DO $$
DECLARE
  collaborator_roles TEXT[];
  client_roles TEXT[];
BEGIN
  SELECT ARRAY_AGG(role_code ORDER BY role_code)
    INTO collaborator_roles
  FROM user_role_assignments
  WHERE user_id = 'user-agent-collaborator-001'
    AND active = TRUE
    AND status = 'active';

  IF collaborator_roles IS DISTINCT FROM ARRAY['collaborator']::TEXT[] THEN
    RAISE EXCEPTION 'TASK-954 invariant failed: collaborator agent roles = %', collaborator_roles;
  END IF;

  SELECT ARRAY_AGG(role_code ORDER BY role_code)
    INTO client_roles
  FROM user_role_assignments
  WHERE user_id = 'user-agent-client-001'
    AND active = TRUE
    AND status = 'active';

  IF client_roles IS DISTINCT FROM ARRAY['client_executive', 'client_manager', 'client_specialist']::TEXT[] THEN
    RAISE EXCEPTION 'TASK-954 invariant failed: client agent roles = %', client_roles;
  END IF;
END $$;

-- Down Migration

DELETE FROM greenhouse_core.user_role_assignments
WHERE user_id IN ('user-agent-collaborator-001', 'user-agent-client-001');

DELETE FROM greenhouse_core.client_users
WHERE user_id IN ('user-agent-collaborator-001', 'user-agent-client-001');

DELETE FROM greenhouse_core.clients c
WHERE c.client_id = 'agent-client-sandbox'
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.client_users u
    WHERE u.client_id = c.client_id
  );
