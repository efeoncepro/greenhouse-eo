-- Up Migration
-- Provision a dedicated agent/E2E user for headless authentication.
-- This user is efeonce_internal with efeonce_admin role for full portal access.
-- Password: Gh-Agent-2026!  (bcrypt 12 rounds)
-- Intended for use with POST /api/auth/agent-session and Playwright E2E.

SET search_path = greenhouse_core, public;

-- 1. User principal
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
  timezone
) VALUES (
  'user-agent-e2e-001',
  'agent@greenhouse.efeonce.org',
  'Greenhouse Agent (E2E)',
  'efeonce_internal',
  'credentials',
  'active',
  TRUE,
  '$2b$12$Du4ozS/P9WA5tzTrJ99pZe.jBzQx7VwScxnlUQcwRdeE5QUhcDtX.',
  'bcrypt',
  'America/Santiago'
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Role assignment — efeonce_admin gives full portal access for testing
INSERT INTO user_role_assignments (
  assignment_id,
  user_id,
  role_code,
  status,
  active,
  assigned_by_user_id
) VALUES (
  'assign-agent-e2e-admin',
  'user-agent-e2e-001',
  'efeonce_admin',
  'active',
  TRUE,
  'user-agent-e2e-001'
)
ON CONFLICT (assignment_id) DO NOTHING;

-- 3. Collaborator role (efeonce_admin always includes collaborator per guardrails)
INSERT INTO user_role_assignments (
  assignment_id,
  user_id,
  role_code,
  status,
  active,
  assigned_by_user_id
) VALUES (
  'assign-agent-e2e-collaborator',
  'user-agent-e2e-001',
  'collaborator',
  'active',
  TRUE,
  'user-agent-e2e-001'
)
ON CONFLICT (assignment_id) DO NOTHING;

-- Down Migration

DELETE FROM greenhouse_core.user_role_assignments
WHERE user_id = 'user-agent-e2e-001';

DELETE FROM greenhouse_core.client_users
WHERE user_id = 'user-agent-e2e-001';
