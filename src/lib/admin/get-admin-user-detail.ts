import 'server-only'

import { buildTenantPublicId, buildUserPublicId } from '@/lib/ids/greenhouse-ids'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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
  try {
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
  } catch {
    return { hubspotCompanyId: null, featureFlags: [] as string[] }
  }
}

const getRouteGroups = async (roleCodes: string[]) => {
  if (roleCodes.length === 0) return []

  try {
    const rows = await runGreenhousePostgresQuery<RouteGroupRow>(
      `SELECT DISTINCT UNNEST(route_group_scope) AS route_group
       FROM greenhouse_core.roles
       WHERE role_code = ANY($1)
       ORDER BY route_group`,
      [roleCodes]
    )

    return rows.map(r => r.route_group)
  } catch {
    return []
  }
}

const getProjectScopes = async (userId: string): Promise<ProjectScopeRow[]> => {
  try {
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
  } catch {
    // Fallback: greenhouse_delivery.projects may not be provisioned yet
    const rows = await runGreenhousePostgresQuery<{ project_id: string }>(
      `SELECT project_id
       FROM greenhouse_core.user_project_scopes
       WHERE user_id = $1 AND active = TRUE
       ORDER BY project_id`,
      [userId]
    )

    return rows.map(r => ({ project_id: r.project_id, project_name: null }))
  }
}

const getCampaignScopes = async (userId: string): Promise<CampaignScopeRow[]> => {
  try {
    return await runGreenhousePostgresQuery<CampaignScopeRow>(
      `SELECT campaign_id
       FROM greenhouse_core.user_campaign_scopes
       WHERE user_id = $1 AND active = TRUE
       ORDER BY campaign_id`,
      [userId]
    )
  } catch {
    return []
  }
}

// ── Main function ──

export const getAdminUserDetail = async (identifier: string): Promise<AdminUserDetail | null> => {
  try {
    const person = await getPersonFromPostgres(identifier)

    if (!person) return null

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
  } catch (error) {
    console.error('[getAdminUserDetail] Postgres error', { identifier }, error)

    return null
  }
}
