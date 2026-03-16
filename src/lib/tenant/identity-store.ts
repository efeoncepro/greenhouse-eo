import 'server-only'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'

// ── Readiness check with TTL cache ──────────────────────────

const IDENTITY_PG_REQUIRED_TABLES = [
  'greenhouse_core.client_users',
  'greenhouse_core.roles',
  'greenhouse_core.user_role_assignments',
  'greenhouse_serving.session_360'
] as const

let identityPgReadyCache: { ready: boolean; checkedAt: number } | null = null
const IDENTITY_PG_READY_TTL = 60_000

const assertIdentityPostgresReady = async () => {
  if (!isGreenhousePostgresConfigured()) {
    throw new IdentityPostgresNotReady('PostgreSQL not configured')
  }

  const now = Date.now()

  if (identityPgReadyCache && now - identityPgReadyCache.checkedAt < IDENTITY_PG_READY_TTL) {
    if (!identityPgReadyCache.ready) {
      throw new IdentityPostgresNotReady('Schema not ready (cached)')
    }

    return
  }

  try {
    for (const table of IDENTITY_PG_REQUIRED_TABLES) {
      const [schema, name] = table.split('.')

      await runGreenhousePostgresQuery(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
        [schema, name]
      )
    }

    // Check that client_users has the V2 columns
    const colRows = await runGreenhousePostgresQuery(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'greenhouse_core' AND table_name = 'client_users'
         AND column_name = 'microsoft_oid'`
    )

    if (colRows.length === 0) {
      throw new IdentityPostgresNotReady('client_users missing V2 columns')
    }

    identityPgReadyCache = { ready: true, checkedAt: now }
  } catch (error) {
    identityPgReadyCache = { ready: false, checkedAt: now }

    if (error instanceof IdentityPostgresNotReady) throw error
    throw new IdentityPostgresNotReady('Schema check failed')
  }
}

class IdentityPostgresNotReady extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IdentityPostgresNotReady'
  }
}

export const shouldFallbackFromIdentityPostgres = (error: unknown) => {
  if (error instanceof IdentityPostgresNotReady) return true

  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('PostgreSQL not configured') ||
    message.includes('Schema not ready') ||
    message.includes('ECONNREFUSED') ||
    message.includes('connection refused') ||
    message.includes('does not exist') ||
    (message.includes('relation') && message.includes('does not exist'))
  )
}

// ── Scope loaders ───────────────────────────────────────────

const loadProjectScopes = async (userId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ project_id: string }>(
    `SELECT project_id FROM greenhouse_core.user_project_scopes WHERE user_id = $1 AND active = TRUE`,
    [userId]
  )

  return rows.map((r: { project_id: string }) => r.project_id)
}

const loadCampaignScopes = async (userId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ campaign_id: string }>(
    `SELECT campaign_id FROM greenhouse_core.user_campaign_scopes WHERE user_id = $1 AND active = TRUE`,
    [userId]
  )

  return rows.map((r: { campaign_id: string }) => r.campaign_id)
}

const loadServiceModules = async (clientId: string): Promise<{ businessLines: string[]; serviceModules: string[] }> => {
  const rows = await runGreenhousePostgresQuery<{ module_code: string; business_line: string | null }>(
    `SELECT sm.module_code, sm.business_line
     FROM greenhouse_core.client_service_modules csm
     JOIN greenhouse_core.service_modules sm ON sm.module_id = csm.module_id
     WHERE csm.client_id = $1 AND csm.active = TRUE AND sm.active = TRUE`,
    [clientId]
  )

  const businessLines: string[] = []
  const serviceModules: string[] = []

  for (const r of rows) {
    if (r.business_line) businessLines.push(r.module_code)
    else serviceModules.push(r.module_code)
  }

  return { businessLines, serviceModules }
}

// ── Session row shape from session_360 view ─────────────────

// Use Record<string, unknown> compatible type for runGreenhousePostgresQuery generic
type Session360Row = Record<string, unknown> & {
  user_id: string
  public_id: string | null
  email: string
  full_name: string
  tenant_type: string
  auth_mode: string | null
  status: string
  active: boolean
  client_id: string | null
  client_name: string | null
  identity_profile_id: string | null
  member_id: string | null
  microsoft_oid: string | null
  microsoft_tenant_id: string | null
  microsoft_email: string | null
  google_sub: string | null
  google_email: string | null
  avatar_url: string | null
  password_hash: string | null
  password_hash_algorithm: string | null
  timezone: string
  default_portal_home_path: string | null
  last_login_at: string | null
  last_login_provider: string | null
  role_codes: string[]
  route_groups: string[]
  feature_flags: string[]
  // Account 360 — nullable until M1 migration populates spaces/organizations
  space_id: string | null
  space_public_id: string | null
  organization_id: string | null
  organization_public_id: string | null
  organization_name: string | null
}

// ── Main lookup functions ───────────────────────────────────

const sessionRowToAccessRow = async (row: Session360Row) => {
  const roleCodes = Array.isArray(row.role_codes) ? row.role_codes : []

  const projectScopes = roleCodes.includes('client_specialist')
    ? await loadProjectScopes(row.user_id)
    : []

  const campaignScopes = roleCodes.includes('client_specialist')
    ? await loadCampaignScopes(row.user_id)
    : []

  const { businessLines, serviceModules } = row.client_id
    ? await loadServiceModules(row.client_id)
    : { businessLines: [] as string[], serviceModules: [] as string[] }

  return {
    user_id: row.user_id,
    client_id: row.client_id,
    client_name: row.client_name,
    tenant_type: row.tenant_type,
    email: row.email,
    microsoft_oid: row.microsoft_oid,
    microsoft_tenant_id: row.microsoft_tenant_id,
    microsoft_email: row.microsoft_email,
    google_sub: row.google_sub,
    google_email: row.google_email,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    role_codes: roleCodes,
    route_groups: Array.isArray(row.route_groups) ? row.route_groups : [],
    project_scopes: projectScopes,
    campaign_scopes: campaignScopes,
    business_lines: businessLines,
    service_modules: serviceModules,
    feature_flags: Array.isArray(row.feature_flags) ? row.feature_flags : [],
    timezone: row.timezone,
    portal_home_path: row.default_portal_home_path,
    auth_mode: row.auth_mode,
    active: row.active,
    status: row.status,
    password_hash: row.password_hash,
    password_hash_algorithm: row.password_hash_algorithm,
    // Account 360
    space_id: row.space_id ?? null,
    space_public_id: row.space_public_id ?? null,
    organization_id: row.organization_id ?? null,
    organization_public_id: row.organization_public_id ?? null,
    organization_name: row.organization_name ?? null
  }
}

export const getSessionFromPostgresByMicrosoftOid = async (oid: string) => {
  await assertIdentityPostgresReady()

  const rows = await runGreenhousePostgresQuery<Session360Row>(
    `SELECT * FROM greenhouse_serving.session_360 WHERE microsoft_oid = $1 LIMIT 1`,
    [oid]
  )

  return rows[0] ? sessionRowToAccessRow(rows[0]) : null
}

export const getSessionFromPostgresByGoogleSub = async (sub: string) => {
  await assertIdentityPostgresReady()

  const rows = await runGreenhousePostgresQuery<Session360Row>(
    `SELECT * FROM greenhouse_serving.session_360 WHERE google_sub = $1 LIMIT 1`,
    [sub]
  )

  return rows[0] ? sessionRowToAccessRow(rows[0]) : null
}

export const getSessionFromPostgresByEmail = async (email: string) => {
  await assertIdentityPostgresReady()

  const normalized = email.trim().toLowerCase()

  const rows = await runGreenhousePostgresQuery<Session360Row>(
    `SELECT * FROM greenhouse_serving.session_360
     WHERE LOWER(email) = $1
        OR LOWER(COALESCE(microsoft_email, '')) = $1
        OR LOWER(COALESCE(google_email, '')) = $1
     LIMIT 1`,
    [normalized]
  )

  return rows[0] ? sessionRowToAccessRow(rows[0]) : null
}

export const getSessionFromPostgresByUserId = async (userId: string) => {
  await assertIdentityPostgresReady()

  const rows = await runGreenhousePostgresQuery<Session360Row>(
    `SELECT * FROM greenhouse_serving.session_360 WHERE user_id = $1 LIMIT 1`,
    [userId]
  )

  return rows[0] ? sessionRowToAccessRow(rows[0]) : null
}

export const getInternalUsersFromPostgres = async () => {
  await assertIdentityPostgresReady()

  return runGreenhousePostgresQuery<{
    user_id: string
    email: string
    microsoft_email: string | null
    full_name: string
  }>(
    `SELECT user_id, email, microsoft_email, full_name
     FROM greenhouse_core.client_users
     WHERE active = TRUE AND status IN ('active', 'invited') AND tenant_type = 'efeonce_internal'`
  )
}

// ── SSO linking writes ──────────────────────────────────────

export const linkMicrosoftIdentityInPostgres = async ({
  userId,
  oid,
  tenantId,
  microsoftEmail
}: {
  userId: string
  oid: string
  tenantId?: string | null
  microsoftEmail: string
}) => {
  await assertIdentityPostgresReady()

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users SET
      microsoft_oid = $2,
      microsoft_tenant_id = $3,
      microsoft_email = $4,
      auth_mode = CASE
        WHEN auth_mode = 'credentials' THEN 'both'
        WHEN auth_mode = 'both' THEN 'both'
        WHEN password_hash IS NOT NULL THEN 'both'
        ELSE 'sso'
      END,
      status = CASE WHEN status = 'invited' THEN 'active' ELSE status END,
      active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1`,
    [userId, oid, tenantId || null, microsoftEmail.trim().toLowerCase()]
  )
}

export const linkGoogleIdentityInPostgres = async ({
  userId,
  sub,
  googleEmail
}: {
  userId: string
  sub: string
  googleEmail: string
}) => {
  await assertIdentityPostgresReady()

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users SET
      google_sub = $2,
      google_email = $3,
      auth_mode = CASE
        WHEN auth_mode = 'credentials' THEN 'both'
        WHEN auth_mode = 'both' THEN 'both'
        WHEN password_hash IS NOT NULL THEN 'both'
        ELSE 'sso'
      END,
      status = CASE WHEN status = 'invited' THEN 'active' ELSE status END,
      active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1`,
    [userId, sub, googleEmail.trim().toLowerCase()]
  )
}

export const updateLastLoginInPostgres = async (userId: string, provider = 'credentials') => {
  await assertIdentityPostgresReady()

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users SET
      last_login_at = CURRENT_TIMESTAMP,
      last_login_provider = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1`,
    [userId, provider]
  )
}
