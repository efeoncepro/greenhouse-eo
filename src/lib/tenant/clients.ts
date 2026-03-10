import 'server-only'

import { compare } from 'bcryptjs'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { demoClientConfig } from '@/lib/demo-client'

export interface TenantAuthRecord {
  clientId: string
  clientName: string
  email: string
  role: string
  projectIds: string[]
  featureFlags: string[]
  timezone: string
  portalHomePath: string
  authMode: string
  active: boolean
  status: string
  passwordHash: string | null
  passwordHashAlgorithm: string | null
}

interface TenantAuthRow {
  client_id: string
  client_name: string
  primary_contact_email: string
  role: string
  notion_project_ids: string[] | null
  feature_flags: string[] | null
  timezone: string | null
  portal_home_path: string | null
  auth_mode: string | null
  active: boolean | null
  status: string | null
  password_hash: string | null
  password_hash_algorithm: string | null
}

const normalizeStringArray = (value: string[] | null | undefined, fallback: string[] = []) => {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value.map(item => item.trim()).filter(Boolean)
}

const normalizeTenantAuthRow = (row: TenantAuthRow): TenantAuthRecord => ({
  clientId: row.client_id,
  clientName: row.client_name,
  email: row.primary_contact_email,
  role: row.role || 'client',
  projectIds: normalizeStringArray(row.notion_project_ids),
  featureFlags: normalizeStringArray(row.feature_flags),
  timezone: row.timezone || 'UTC',
  portalHomePath: row.portal_home_path || '/dashboard',
  authMode: row.auth_mode || 'credentials',
  active: Boolean(row.active),
  status: row.status || 'disabled',
  passwordHash: row.password_hash,
  passwordHashAlgorithm: row.password_hash_algorithm
})

export const getTenantAuthRecordByEmail = async (email: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        client_id,
        client_name,
        primary_contact_email,
        role,
        notion_project_ids,
        feature_flags,
        timezone,
        portal_home_path,
        auth_mode,
        active,
        status,
        password_hash,
        password_hash_algorithm
      FROM \`${projectId}.greenhouse.clients\`
      WHERE LOWER(primary_contact_email) = LOWER(@email)
      LIMIT 1
    `,
    params: { email }
  })

  const tenantRow = (rows[0] as TenantAuthRow | undefined) || null

  return tenantRow ? normalizeTenantAuthRow(tenantRow) : null
}

export const verifyTenantPassword = async (tenant: TenantAuthRecord, password: string) => {
  if (!tenant.active || tenant.status !== 'active') {
    return false
  }

  if (tenant.authMode === 'env_demo') {
    return tenant.clientId === demoClientConfig.id && tenant.email === demoClientConfig.email && password === demoClientConfig.password
  }

  if (tenant.passwordHash && tenant.passwordHashAlgorithm === 'bcrypt') {
    return compare(password, tenant.passwordHash)
  }

  return false
}

export const updateTenantLastLogin = async (clientId: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.clients\`
      SET
        last_login_at = CURRENT_TIMESTAMP(),
        updated_at = CURRENT_TIMESTAMP()
      WHERE client_id = @clientId
    `,
    params: { clientId }
  })
}
