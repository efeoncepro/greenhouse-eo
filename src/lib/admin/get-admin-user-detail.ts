import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildTenantPublicId, buildUserPublicId } from '@/lib/ids/greenhouse-ids'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePersonIdentifier } from '@/lib/person-360/resolve-eo-id'

export interface AdminUserProjectScope {
  projectId: string
  projectName: string
  accessLevel: string
  pageUrl: string | null
}

export interface AdminUserCampaignScope {
  campaignId: string
  accessLevel: string
}

export interface AdminUserDetail {
  eoId: string | null
  userId: string
  publicUserId: string
  identityProfileId: string | null
  linkedMemberId: string | null
  fullName: string
  email: string
  avatarUrl: string | null
  jobTitle: string | null
  tenantType: 'client' | 'efeonce_internal'
  status: string
  active: boolean
  authMode: string
  passwordAlgorithm: string | null
  defaultPortalHomePath: string
  timezone: string | null
  locale: string | null
  lastLoginAt: string | null
  invitedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  client: {
    clientId: string
    publicId: string | null
    clientName: string
    primaryContactEmail: string | null
    hubspotCompanyId: string | null
    featureFlags: string[]
  }
  roleCodes: string[]
  routeGroups: string[]
  projectScopes: AdminUserProjectScope[]
  campaignScopes: AdminUserCampaignScope[]
}

// ── Postgres row types ──

type PersonRow = {
  eo_id: string | null
  identity_profile_id: string | null
  user_id: string
  member_id: string | null
  resolved_display_name: string
  user_email: string | null
  resolved_avatar_url: string | null
  resolved_job_title: string | null
  tenant_type: string | null
  user_status: string | null
  user_active: boolean | null
  auth_mode: string | null
  password_hash_algorithm: string | null
  default_portal_home_path: string | null
  user_timezone: string | null
  last_login_at: string | null
  client_id: string | null
  client_name: string | null
  active_role_codes: string[] | null
  created_at: string | null
  updated_at: string | null
}

type ClientRow = {
  hubspot_company_id: string | null
  billing_currency: string | null
}

type FeatureFlagRow = { flag_code: string }

type RouteGroupRow = { route_group: string }

type ProjectScopeRow = {
  project_id: string
  project_name: string | null
}

type CampaignScopeRow = {
  campaign_id: string
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const toIsoString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'value' in (value as Record<string, unknown>)) {
    const rawValue = (value as { value?: unknown }).value

    return typeof rawValue === 'string' ? rawValue : null
  }

  return null
}

// ── Queries ──

const getPersonFromPostgres = async (identifier: string): Promise<PersonRow | null> => {
  // Resolve identifier — could be EO-ID, userId, or memberId
  const resolved = await resolvePersonIdentifier(identifier)

  if (!resolved?.userId) {
    // Try direct userId lookup if not resolved via person_360
    const rows = await runGreenhousePostgresQuery<PersonRow>(
      `SELECT
        ip.public_id AS eo_id,
        cu.identity_profile_id,
        cu.user_id,
        m.member_id,
        COALESCE(m.display_name, ip.full_name, cu.full_name, 'Sin nombre') AS resolved_display_name,
        cu.email AS user_email,
        cu.avatar_url AS resolved_avatar_url,
        COALESCE(ip.job_title, cu.full_name) AS resolved_job_title,
        cu.tenant_type,
        cu.status AS user_status,
        cu.active AS user_active,
        cu.auth_mode,
        cu.password_hash_algorithm,
        cu.default_portal_home_path,
        cu.timezone AS user_timezone,
        cu.last_login_at,
        cu.client_id,
        c.client_name,
        COALESCE(
          ARRAY_AGG(DISTINCT ura.role_code) FILTER (WHERE ura.active AND ura.role_code IS NOT NULL),
          ARRAY[]::TEXT[]
        ) AS active_role_codes,
        cu.created_at,
        cu.updated_at
      FROM greenhouse_core.client_users cu
      LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cu.identity_profile_id
      LEFT JOIN greenhouse_core.members m ON m.identity_profile_id = cu.identity_profile_id
      LEFT JOIN greenhouse_core.clients c ON c.client_id = cu.client_id
      LEFT JOIN greenhouse_core.user_role_assignments ura ON ura.user_id = cu.user_id
      WHERE cu.user_id = $1
      GROUP BY ip.public_id, cu.identity_profile_id, cu.user_id, m.member_id, m.display_name,
               ip.full_name, cu.full_name, cu.email, cu.avatar_url, ip.job_title,
               cu.tenant_type, cu.status, cu.active, cu.auth_mode, cu.password_hash_algorithm,
               cu.default_portal_home_path, cu.timezone, cu.last_login_at,
               cu.client_id, c.client_name, cu.created_at, cu.updated_at
      LIMIT 1`,
      [identifier]
    )

    return rows[0] ?? null
  }

  const rows = await runGreenhousePostgresQuery<PersonRow>(
    `SELECT
      p.eo_id,
      p.identity_profile_id,
      p.user_id,
      p.member_id,
      p.resolved_display_name,
      p.user_email,
      p.resolved_avatar_url,
      p.resolved_job_title,
      p.tenant_type,
      p.user_status,
      p.user_active,
      p.auth_mode,
      p.password_hash_algorithm,
      p.default_portal_home_path,
      p.user_timezone,
      p.last_login_at,
      p.client_id,
      p.client_name,
      p.active_role_codes,
      p.created_at,
      p.updated_at
    FROM greenhouse_serving.person_360 p
    WHERE p.user_id = $1
    LIMIT 1`,
    [resolved.userId]
  )

  return rows[0] ?? null
}

const getClientExtras = async (clientId: string) => {
  const [clientRows, flagRows] = await Promise.all([
    runGreenhousePostgresQuery<ClientRow>(
      `SELECT hubspot_company_id, billing_currency
       FROM greenhouse_core.clients WHERE client_id = $1`,
      [clientId]
    ),
    runGreenhousePostgresQuery<FeatureFlagRow>(
      `SELECT flag_code FROM greenhouse_core.client_feature_flags
       WHERE client_id = $1 AND enabled = TRUE ORDER BY flag_code`,
      [clientId]
    )
  ])

  return {
    hubspotCompanyId: clientRows[0]?.hubspot_company_id ?? null,
    featureFlags: flagRows.map(r => r.flag_code)
  }
}

const getRouteGroups = async (roleCodes: string[]) => {
  if (roleCodes.length === 0) return []

  const rows = await runGreenhousePostgresQuery<RouteGroupRow>(
    `SELECT DISTINCT UNNEST(route_group_scope) AS route_group
     FROM greenhouse_core.roles
     WHERE role_code = ANY($1)
     ORDER BY route_group`,
    [roleCodes]
  )

  return rows.map(r => r.route_group)
}

const getProjectScopes = async (userId: string) => {
  const rows = await runGreenhousePostgresQuery<ProjectScopeRow>(
    `SELECT
      ups.project_id,
      dp.project_name
    FROM greenhouse_core.user_project_scopes ups
    LEFT JOIN greenhouse_delivery.projects dp
      ON dp.project_record_id = ups.project_id
    WHERE ups.user_id = $1
      AND ups.active = TRUE
    ORDER BY COALESCE(dp.project_name, ups.project_id)`,
    [userId]
  )

  return rows
}

const getCampaignScopes = async (userId: string) => {
  const rows = await runGreenhousePostgresQuery<CampaignScopeRow>(
    `SELECT campaign_id
     FROM greenhouse_core.user_campaign_scopes
     WHERE user_id = $1 AND active = TRUE
     ORDER BY campaign_id`,
    [userId]
  )

  return rows
}

const getAdminUserDetailFromBigQuery = async (userId: string): Promise<AdminUserDetail | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [userRows, projectScopeRows, campaignScopeRows] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT
          cu.user_id,
          cu.identity_profile_id,
          ip.public_id AS identity_public_id,
          cu.full_name,
          cu.email,
          cu.avatar_url,
          cu.job_title,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.password_hash_algorithm,
          cu.default_portal_home_path,
          cu.timezone,
          cu.locale,
          cu.last_login_at,
          cu.invited_at,
          cu.created_at,
          cu.updated_at,
          cu.client_id,
          c.client_name,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.feature_flags,
          ARRAY_AGG(DISTINCT ura.role_code IGNORE NULLS ORDER BY ura.role_code) AS role_codes,
          ARRAY_AGG(DISTINCT route_group IGNORE NULLS ORDER BY route_group) AS route_groups
        FROM \`${projectId}.greenhouse.client_users\` AS cu
        LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
          ON c.client_id = cu.client_id
        LEFT JOIN \`${projectId}.greenhouse.identity_profiles\` AS ip
          ON ip.profile_id = cu.identity_profile_id
        LEFT JOIN \`${projectId}.greenhouse.user_role_assignments\` AS ura
          ON ura.user_id = cu.user_id
         AND ura.active = TRUE
        LEFT JOIN \`${projectId}.greenhouse.roles\` AS roles
          ON roles.role_code = ura.role_code
        LEFT JOIN UNNEST(COALESCE(roles.route_group_scope, [])) AS route_group
        WHERE cu.user_id = @userId
        GROUP BY
          cu.user_id,
          cu.identity_profile_id,
          identity_public_id,
          cu.full_name,
          cu.email,
          cu.avatar_url,
          cu.job_title,
          cu.tenant_type,
          cu.status,
          cu.active,
          cu.auth_mode,
          cu.password_hash_algorithm,
          cu.default_portal_home_path,
          cu.timezone,
          cu.locale,
          cu.last_login_at,
          cu.invited_at,
          cu.created_at,
          cu.updated_at,
          cu.client_id,
          c.client_name,
          c.primary_contact_email,
          c.hubspot_company_id,
          c.feature_flags
        LIMIT 1
      `,
      params: { userId }
    }),
    bigQuery.query({
      query: `
        SELECT
          ups.project_id,
          ups.access_level,
          COALESCE(dp.project_name, p.nombre_del_proyecto, ups.project_id) AS project_name,
          COALESCE(dp.page_url, p.page_url) AS page_url
        FROM \`${projectId}.greenhouse.user_project_scopes\` AS ups
        LEFT JOIN \`${projectId}.greenhouse_conformed.delivery_projects\` AS dp
          ON dp.project_record_id = ups.project_id
        LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
          ON p.notion_page_id = ups.project_id
        WHERE ups.user_id = @userId
          AND ups.active = TRUE
        ORDER BY project_name
      `,
      params: { userId }
    }),
    bigQuery.query({
      query: `
        SELECT
          campaign_id,
          access_level
        FROM \`${projectId}.greenhouse.user_campaign_scopes\`
        WHERE user_id = @userId
          AND active = TRUE
        ORDER BY campaign_id
      `,
      params: { userId }
    })
  ])

  const row = (userRows[0] as Array<Record<string, unknown>>)[0]

  if (!row) {
    return null
  }

  return {
    eoId: row.identity_public_id ? String(row.identity_public_id) : null,
    userId: String(row.user_id || ''),
    publicUserId: buildUserPublicId({ userId: String(row.user_id || '') }),
    identityProfileId: row.identity_profile_id ? String(row.identity_profile_id) : null,
    linkedMemberId: null,
    fullName: String(row.full_name || 'Sin nombre'),
    email: String(row.email || ''),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    jobTitle: row.job_title ? String(row.job_title) : null,
    tenantType: (row.tenant_type as AdminUserDetail['tenantType']) || 'client',
    status: String(row.status || ''),
    active: Boolean(row.active),
    authMode: String(row.auth_mode || ''),
    passwordAlgorithm: row.password_hash_algorithm ? String(row.password_hash_algorithm) : null,
    defaultPortalHomePath: String(row.default_portal_home_path || ''),
    timezone: row.timezone ? String(row.timezone) : null,
    locale: row.locale ? String(row.locale) : null,
    lastLoginAt: toIsoString(row.last_login_at),
    invitedAt: toIsoString(row.invited_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    client: {
      clientId: String(row.client_id || ''),
      publicId: row.client_id
        ? buildTenantPublicId({
            clientId: String(row.client_id || ''),
            hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null
          })
        : null,
      clientName: String(row.client_name || row.client_id || ''),
      primaryContactEmail: row.primary_contact_email ? String(row.primary_contact_email) : null,
      hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null,
      featureFlags: normalizeStringArray(row.feature_flags)
    },
    roleCodes: normalizeStringArray(row.role_codes),
    routeGroups: normalizeStringArray(row.route_groups),
    projectScopes: (projectScopeRows[0] as Array<Record<string, unknown>>).map(scopeRow => ({
      projectId: String(scopeRow.project_id || ''),
      projectName: String(scopeRow.project_name || scopeRow.project_id || ''),
      accessLevel: String(scopeRow.access_level || ''),
      pageUrl: scopeRow.page_url ? String(scopeRow.page_url) : null
    })),
    campaignScopes: (campaignScopeRows[0] as Array<Record<string, unknown>>).map(scopeRow => ({
      campaignId: String(scopeRow.campaign_id || ''),
      accessLevel: String(scopeRow.access_level || '')
    }))
  }
}

// ── Main function ──

export const getAdminUserDetail = async (identifier: string): Promise<AdminUserDetail | null> => {
  if (isGreenhousePostgresConfigured()) {
    try {
      const person = await getPersonFromPostgres(identifier)

      if (person) {
        const userId = person.user_id
        const clientId = person.client_id ?? ''
        const roleCodes = person.active_role_codes ?? []

        const [clientExtras, routeGroups, projectScopes, campaignScopes] = await Promise.all([
          clientId ? getClientExtras(clientId) : Promise.resolve({ hubspotCompanyId: null, featureFlags: [] as string[] }),
          getRouteGroups(roleCodes),
          getProjectScopes(userId),
          getCampaignScopes(userId)
        ])

        return {
          eoId: person.eo_id,
          userId,
          publicUserId: buildUserPublicId({ userId }),
          identityProfileId: person.identity_profile_id,
          linkedMemberId: person.member_id,
          fullName: person.resolved_display_name || 'Sin nombre',
          email: person.user_email || '',
          avatarUrl: person.resolved_avatar_url,
          jobTitle: person.resolved_job_title,
          tenantType: (person.tenant_type as AdminUserDetail['tenantType']) || 'client',
          status: person.user_status || '',
          active: Boolean(person.user_active),
          authMode: person.auth_mode || '',
          passwordAlgorithm: person.password_hash_algorithm,
          defaultPortalHomePath: person.default_portal_home_path || '',
          timezone: person.user_timezone,
          locale: null, // not yet in Postgres
          lastLoginAt: person.last_login_at,
          invitedAt: null, // not yet in Postgres
          createdAt: person.created_at,
          updatedAt: person.updated_at,
          client: {
            clientId,
            publicId: clientId
              ? buildTenantPublicId({ clientId, hubspotCompanyId: clientExtras.hubspotCompanyId })
              : null,
            clientName: person.client_name || clientId || '',
            primaryContactEmail: null, // not yet in Postgres clients table
            hubspotCompanyId: clientExtras.hubspotCompanyId,
            featureFlags: clientExtras.featureFlags
          },
          roleCodes,
          routeGroups,
          projectScopes: projectScopes.map(s => ({
            projectId: s.project_id,
            projectName: s.project_name || s.project_id,
            accessLevel: 'full',
            pageUrl: null
          })),
          campaignScopes: campaignScopes.map(s => ({
            campaignId: s.campaign_id,
            accessLevel: 'full'
          }))
        }
      }
    } catch (error) {
      console.error('Admin user detail Postgres lookup failed; falling back to BigQuery.', {
        identifier,
        error
      })
    }
  }

  if (identifier.startsWith('user-')) {
    return getAdminUserDetailFromBigQuery(identifier)
  }

  return null
}
