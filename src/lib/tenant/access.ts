import 'server-only'

import { compare } from 'bcryptjs'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { updateTenantLastLogin as updateClientTenantLastLogin } from '@/lib/tenant/clients'

type TenantType = 'client' | 'efeonce_internal'

interface TenantAccessRow {
  user_id: string
  client_id: string | null
  client_name: string | null
  tenant_type: string | null
  email: string
  microsoft_oid: string | null
  microsoft_tenant_id: string | null
  microsoft_email: string | null
  full_name: string
  role_codes: string[] | null
  route_groups: string[] | null
  project_scopes: string[] | null
  campaign_scopes: string[] | null
  business_lines: string[] | null
  service_modules: string[] | null
  feature_flags: string[] | null
  timezone: string | null
  portal_home_path: string | null
  auth_mode: string | null
  active: boolean | null
  status: string | null
  password_hash: string | null
  password_hash_algorithm: string | null
}

export interface TenantAccessRecord {
  userId: string
  clientId: string
  clientName: string
  tenantType: TenantType
  email: string
  microsoftOid: string | null
  microsoftTenantId: string | null
  microsoftEmail: string | null
  fullName: string
  roleCodes: string[]
  primaryRoleCode: string
  routeGroups: string[]
  projectScopes: string[]
  campaignScopes: string[]
  businessLines: string[]
  serviceModules: string[]
  projectIds: string[]
  role: string
  featureFlags: string[]
  timezone: string
  portalHomePath: string
  authMode: string
  active: boolean
  status: string
  passwordHash: string | null
  passwordHashAlgorithm: string | null
}

const rolePriority = [
  'efeonce_admin',
  'efeonce_operations',
  'efeonce_account',
  'client_executive',
  'client_manager',
  'client_specialist'
]

const normalizeStringArray = (value: string[] | null | undefined, fallback: string[] = []) => {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value.map(item => item.trim()).filter(Boolean)
}

const resolveTenantType = (value: string | null | undefined): TenantType =>
  value === 'efeonce_internal' ? 'efeonce_internal' : 'client'

const getPrimaryRoleCode = (roleCodes: string[], tenantType: TenantType) => {
  if (roleCodes.length === 0) {
    return tenantType === 'efeonce_internal' ? 'efeonce_account' : 'client_executive'
  }

  const sorted = [...roleCodes].sort((left, right) => {
    const leftIndex = rolePriority.indexOf(left)
    const rightIndex = rolePriority.indexOf(right)

    const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex
    const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex

    if (normalizedLeftIndex === normalizedRightIndex) {
      return left.localeCompare(right)
    }

    return normalizedLeftIndex - normalizedRightIndex
  })

  return sorted[0]
}

const deriveRouteGroups = (roleCodes: string[], tenantType: TenantType) => {
  const routeGroups = new Set<string>()

  for (const roleCode of roleCodes) {
    if (roleCode.startsWith('efeonce_')) {
      routeGroups.add('internal')
    }

    if (roleCode === 'efeonce_admin') {
      routeGroups.add('admin')
    }

    if (roleCode.startsWith('client_')) {
      routeGroups.add('client')
    }
  }

  if (routeGroups.size === 0) {
    routeGroups.add(tenantType === 'efeonce_internal' ? 'internal' : 'client')
  }

  return Array.from(routeGroups)
}

const normalizeTenantAccessRow = (row: TenantAccessRow): TenantAccessRecord => {
  const tenantType = resolveTenantType(row.tenant_type)
  const roleCodes = normalizeStringArray(row.role_codes)
  const primaryRoleCode = getPrimaryRoleCode(roleCodes, tenantType)
  const routeGroups = normalizeStringArray(row.route_groups, deriveRouteGroups(roleCodes, tenantType))
  const projectScopes = normalizeStringArray(row.project_scopes)
  const campaignScopes = normalizeStringArray(row.campaign_scopes)
  const businessLines = normalizeStringArray(row.business_lines)
  const serviceModules = normalizeStringArray(row.service_modules)

  return {
    userId: row.user_id,
    clientId: row.client_id || '',
    clientName: row.client_name || (tenantType === 'efeonce_internal' ? 'Efeonce Internal' : 'Greenhouse Client'),
    tenantType,
    email: row.email,
    microsoftOid: row.microsoft_oid,
    microsoftTenantId: row.microsoft_tenant_id,
    microsoftEmail: row.microsoft_email,
    fullName: row.full_name,
    roleCodes,
    primaryRoleCode,
    routeGroups,
    projectScopes,
    campaignScopes,
    businessLines,
    serviceModules,
    projectIds: projectScopes,
    role: primaryRoleCode,
    featureFlags: normalizeStringArray(row.feature_flags),
    timezone: row.timezone || 'UTC',
    portalHomePath:
      row.portal_home_path || (tenantType === 'efeonce_internal' ? '/internal/dashboard' : '/dashboard'),
    authMode: row.auth_mode || 'credentials',
    active: Boolean(row.active),
    status: row.status || 'disabled',
    passwordHash: row.password_hash,
    passwordHashAlgorithm: row.password_hash_algorithm
  }
}

const getIdentityAccessRecord = async ({
  whereClause,
  params,
  types
}: {
  whereClause: string
  params: Record<string, unknown>
  types?: Record<string, string>
}) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        cu.user_id,
        cu.client_id,
        COALESCE(c.client_name, IF(cu.tenant_type = 'efeonce_internal', 'Efeonce Internal', cu.full_name)) AS client_name,
        cu.tenant_type,
        cu.email,
        cu.microsoft_oid,
        cu.microsoft_tenant_id,
        cu.microsoft_email,
        cu.full_name,
        ARRAY_AGG(DISTINCT ura.role_code IGNORE NULLS ORDER BY ura.role_code) AS role_codes,
        ARRAY_AGG(DISTINCT route_group IGNORE NULLS ORDER BY route_group) AS route_groups,
        ARRAY_AGG(DISTINCT ups.project_id IGNORE NULLS ORDER BY ups.project_id) AS project_scopes,
        ARRAY_AGG(DISTINCT ucs.campaign_id IGNORE NULLS ORDER BY ucs.campaign_id) AS campaign_scopes,
        ARRAY_AGG(DISTINCT IF(sm.module_kind = 'business_line', csm.module_code, NULL) IGNORE NULLS ORDER BY IF(sm.module_kind = 'business_line', csm.module_code, NULL)) AS business_lines,
        ARRAY_AGG(DISTINCT IF(sm.module_kind = 'service_module', csm.module_code, NULL) IGNORE NULLS ORDER BY IF(sm.module_kind = 'service_module', csm.module_code, NULL)) AS service_modules,
        ARRAY_AGG(DISTINCT cff.feature_code IGNORE NULLS ORDER BY cff.feature_code) AS feature_flags,
        COALESCE(cu.timezone, c.timezone, 'UTC') AS timezone,
        COALESCE(cu.default_portal_home_path, c.portal_home_path, IF(cu.tenant_type = 'efeonce_internal', '/internal/dashboard', '/dashboard')) AS portal_home_path,
        cu.auth_mode,
        cu.active,
        cu.status,
        cu.password_hash,
        cu.password_hash_algorithm
      FROM \`${projectId}.greenhouse.client_users\` AS cu
      LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
        ON c.client_id = cu.client_id
      LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
        ON ura.user_id = cu.user_id
       AND ura.active = TRUE
       AND ura.status = 'active'
       AND (ura.effective_from IS NULL OR ura.effective_from <= CURRENT_TIMESTAMP())
       AND (ura.effective_to IS NULL OR ura.effective_to >= CURRENT_TIMESTAMP())
      LEFT JOIN \`${projectId}.greenhouse.roles\` AS roles
        ON roles.role_code = ura.role_code
      LEFT JOIN UNNEST(COALESCE(roles.route_group_scope, [])) AS route_group
      LEFT JOIN \`${projectId}.greenhouse.user_project_scopes\` AS ups
        ON ups.user_id = cu.user_id
       AND ups.active = TRUE
      LEFT JOIN \`${projectId}.greenhouse.user_campaign_scopes\` AS ucs
        ON ucs.user_id = cu.user_id
       AND ucs.active = TRUE
      LEFT JOIN \`${projectId}.greenhouse.client_service_modules\` AS csm
        ON csm.client_id = cu.client_id
       AND csm.active = TRUE
      LEFT JOIN \`${projectId}.greenhouse.service_modules\` AS sm
        ON sm.module_code = csm.module_code
       AND sm.active = TRUE
      LEFT JOIN \`${projectId}.greenhouse.client_feature_flags\` AS cff
        ON cff.client_id = cu.client_id
       AND cff.active = TRUE
       AND cff.status IN ('enabled', 'staged')
      WHERE ${whereClause}
      GROUP BY
        cu.user_id,
        cu.client_id,
        client_name,
        cu.tenant_type,
        cu.email,
        cu.microsoft_oid,
        cu.microsoft_tenant_id,
        cu.microsoft_email,
        cu.full_name,
        timezone,
        portal_home_path,
        cu.auth_mode,
        cu.active,
        cu.status,
        cu.password_hash,
        cu.password_hash_algorithm
      LIMIT 1
    `,
    params,
    ...(types ? { types } : {})
  })

  const accessRow = (rows[0] as TenantAccessRow | undefined) || null

  return accessRow ? normalizeTenantAccessRow(accessRow) : null
}

const getIdentityAccessRecordByEmail = async (email: string) =>
  getIdentityAccessRecord({
    whereClause: "LOWER(cu.email) = LOWER(@email) OR LOWER(COALESCE(cu.microsoft_email, '')) = LOWER(@email)",
    params: { email }
  })

export const getTenantAccessRecordByEmail = async (email: string) => {
  return getIdentityAccessRecordByEmail(email)
}

export const getTenantAccessRecordByMicrosoftOid = async (oid: string) =>
  getIdentityAccessRecord({
    whereClause: 'cu.microsoft_oid = @oid',
    params: { oid }
  })

export const getTenantAccessRecordByAllowedEmailDomain = async (domain: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        c.client_id,
        c.client_name
      FROM \`${projectId}.greenhouse.clients\` AS c
      WHERE c.active = TRUE
        AND LOWER(@domain) IN UNNEST(
          ARRAY(
            SELECT LOWER(allowed_domain)
            FROM UNNEST(COALESCE(c.allowed_email_domains, [])) AS allowed_domain
          )
        )
      LIMIT 1
    `,
    params: { domain }
  })

  const row = rows[0] as { client_id?: string; client_name?: string } | undefined

  return row
    ? {
        clientId: String(row.client_id || ''),
        clientName: String(row.client_name || '')
      }
    : null
}

export const verifyTenantPassword = async (tenant: TenantAccessRecord, password: string) => {
  if (!tenant.active || tenant.status !== 'active') {
    return false
  }

  if (tenant.passwordHash && tenant.passwordHashAlgorithm === 'bcrypt') {
    return compare(password, tenant.passwordHash)
  }

  return false
}

export const isEligibleForMicrosoftSignIn = (tenant: TenantAccessRecord) => {
  if (!tenant.active) {
    return false
  }

  return ['active', 'invited'].includes(tenant.status)
}

export const linkMicrosoftIdentity = async ({
  tenant,
  oid,
  tenantId,
  microsoftEmail
}: {
  tenant: TenantAccessRecord
  oid: string
  tenantId?: string | null
  microsoftEmail: string
}) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.client_users\`
      SET
        microsoft_oid = @oid,
        microsoft_tenant_id = NULLIF(@tenantId, ''),
        microsoft_email = @microsoftEmail,
        auth_mode = CASE
          WHEN auth_mode = 'credentials' THEN 'both'
          WHEN auth_mode = 'both' THEN 'both'
          WHEN password_hash IS NOT NULL THEN 'both'
          ELSE 'sso'
        END,
        status = CASE
          WHEN status = 'invited' THEN 'active'
          ELSE status
        END,
        active = TRUE,
        updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId
    `,
    params: {
      userId: tenant.userId,
      oid,
      tenantId: tenantId || '',
      microsoftEmail: microsoftEmail.trim().toLowerCase()
    }
  })
}

export const updateTenantLastLogin = async (tenant: TenantAccessRecord, provider = 'credentials') => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.client_users\`
      SET
        last_login_at = CURRENT_TIMESTAMP(),
        last_login_provider = @provider,
        updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId
    `,
    params: {
      userId: tenant.userId,
      provider
    }
  })

  if (tenant.clientId) {
    await updateClientTenantLastLogin(tenant.clientId)
  }
}
