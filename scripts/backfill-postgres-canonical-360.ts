import { BigQuery } from '@google-cloud/bigquery'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const datasetId = process.env.GREENHOUSE_BIGQUERY_DATASET || 'greenhouse'
const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'

const bigQuery = new BigQuery({ projectId })

const tableRef = (tableName: string) => `\`${projectId}.${datasetId}.${tableName}\``
const informationSchemaRef = `\`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLES\``

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed ? trimmed : null
  }

  if (typeof value === 'object' && value && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  return String(value)
}

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }

  return fallback
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const s = toNullableString(value)

  if (!s) return null
  const n = Number(s)

  return Number.isFinite(n) ? n : null
}

const toTextArray = (value: unknown): string[] | null => {
  if (value === null || value === undefined) return null

  if (Array.isArray(value)) {
    const filtered = value.map(v => (typeof v === 'string' ? v.trim() : String(v))).filter(Boolean)

    return filtered.length > 0 ? filtered : null
  }

  return null
}

const INTERNAL_NOTION_WORKSPACE_CLIENT_IDS = new Set(['space-efeonce'])

const isInternalNotionWorkspaceSeed = (row: Record<string, unknown>) => {
  const clientId = toNullableString(row.client_id)
  const tenantType = toNullableString(row.tenant_type)

  return tenantType === 'efeonce_internal' || (clientId ? INTERNAL_NOTION_WORKSPACE_CLIENT_IDS.has(clientId) : false)
}

const buildDerivedPublicId = (prefix: string, value: string | null) => {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()

  return normalized ? `${prefix}-${normalized}` : null
}

const queryBigQuery = async <T>(query: string, params: Record<string, unknown> = {}) => {
  const [rows] = await bigQuery.query({
    query,
    params,
    location: bigQueryLocation
  })

  return rows as T[]
}

const tableExists = async (tableName: string) => {
  const [row] = await queryBigQuery<{ total: number | string }>(
    `
      SELECT COUNT(1) AS total
      FROM ${informationSchemaRef}
      WHERE table_name = @tableName
    `,
    { tableName }
  )

  return Number(row?.total || 0) > 0
}

const upsertClient = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.clients (
        client_id,
        client_name,
        tenant_type,
        status,
        active,
        hubspot_company_id,
        timezone,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'client', $3, $4, $5, $6, $7, COALESCE($8::timestamptz, CURRENT_TIMESTAMP), COALESCE($9::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (client_id) DO UPDATE
      SET
        client_name = EXCLUDED.client_name,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        hubspot_company_id = EXCLUDED.hubspot_company_id,
        timezone = EXCLUDED.timezone,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.client_id),
      toNullableString(row.client_name),
      toNullableString(row.status) || 'active',
      toBoolean(row.active, true),
      toNullableString(row.hubspot_company_id),
      toNullableString(row.timezone),
      toNullableString(row.notes),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )

  const hubspotCompanyId = toNullableString(row.hubspot_company_id)

  if (hubspotCompanyId && toNullableString(row.client_id)) {
    await runGreenhousePostgresQuery(
      `
        INSERT INTO greenhouse_core.entity_source_links (
          link_id,
          entity_type,
          entity_id,
          source_system,
          source_object_type,
          source_object_id,
          source_display_name,
          is_primary,
          active
        )
        VALUES ($1, 'client', $2, 'hubspot_crm', 'company', $3, $4, TRUE, TRUE)
        ON CONFLICT (link_id) DO UPDATE
        SET
          source_display_name = EXCLUDED.source_display_name,
          active = EXCLUDED.active,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        `client-${toNullableString(row.client_id)}-hubspot-company-${hubspotCompanyId}`,
        toNullableString(row.client_id),
        hubspotCompanyId,
        toNullableString(row.client_name)
      ]
    )
  }
}

const upsertNotionWorkspace = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.notion_workspaces (
        space_id,
        public_id,
        client_id,
        space_name,
        space_type,
        primary_project_database_source_id,
        status,
        active,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, CURRENT_TIMESTAMP), COALESCE($11::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (space_id) DO UPDATE
      SET
        public_id = EXCLUDED.public_id,
        client_id = EXCLUDED.client_id,
        space_name = EXCLUDED.space_name,
        space_type = EXCLUDED.space_type,
        primary_project_database_source_id = COALESCE(EXCLUDED.primary_project_database_source_id, greenhouse_core.notion_workspaces.primary_project_database_source_id),
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.space_id),
      toNullableString(row.public_id),
      toNullableString(row.client_id),
      toNullableString(row.space_name),
      toNullableString(row.space_type) || 'client_space',
      toNullableString(row.primary_project_database_source_id),
      toNullableString(row.status) || 'active',
      toBoolean(row.active, true),
      toNullableString(row.notes),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertNotionWorkspaceSourceBinding = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.notion_workspace_source_bindings (
        binding_id,
        space_id,
        source_system,
        source_object_type,
        source_object_id,
        binding_role,
        source_display_name,
        is_primary,
        active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, CURRENT_TIMESTAMP), COALESCE($11::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (space_id, source_system, source_object_type, source_object_id, binding_role) DO UPDATE
      SET
        source_display_name = EXCLUDED.source_display_name,
        is_primary = EXCLUDED.is_primary,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.binding_id),
      toNullableString(row.space_id),
      toNullableString(row.source_system),
      toNullableString(row.source_object_type),
      toNullableString(row.source_object_id),
      toNullableString(row.binding_role),
      toNullableString(row.source_display_name),
      toBoolean(row.is_primary),
      toBoolean(row.active, true),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertIdentityProfile = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.identity_profiles (
        profile_id,
        public_id,
        profile_type,
        canonical_email,
        full_name,
        job_title,
        status,
        active,
        default_auth_mode,
        primary_source_system,
        primary_source_object_type,
        primary_source_object_id,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, CURRENT_TIMESTAMP), COALESCE($15::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (profile_id) DO UPDATE
      SET
        public_id = EXCLUDED.public_id,
        profile_type = EXCLUDED.profile_type,
        canonical_email = EXCLUDED.canonical_email,
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        default_auth_mode = EXCLUDED.default_auth_mode,
        primary_source_system = EXCLUDED.primary_source_system,
        primary_source_object_type = EXCLUDED.primary_source_object_type,
        primary_source_object_id = EXCLUDED.primary_source_object_id,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.profile_id),
      toNullableString(row.public_id),
      toNullableString(row.profile_type),
      toNullableString(row.canonical_email),
      toNullableString(row.full_name),
      toNullableString(row.job_title),
      toNullableString(row.status) || 'active',
      toBoolean(row.active, true),
      toNullableString(row.default_auth_mode),
      toNullableString(row.primary_source_system),
      toNullableString(row.primary_source_object_type),
      toNullableString(row.primary_source_object_id),
      toNullableString(row.notes),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertIdentityProfileSourceLink = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.identity_profile_source_links (
        link_id,
        profile_id,
        source_system,
        source_object_type,
        source_object_id,
        source_user_id,
        source_email,
        source_display_name,
        is_primary,
        is_login_identity,
        active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, CURRENT_TIMESTAMP), COALESCE($13::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (link_id) DO UPDATE
      SET
        source_user_id = EXCLUDED.source_user_id,
        source_email = EXCLUDED.source_email,
        source_display_name = EXCLUDED.source_display_name,
        is_primary = EXCLUDED.is_primary,
        is_login_identity = EXCLUDED.is_login_identity,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.link_id),
      toNullableString(row.profile_id),
      toNullableString(row.source_system),
      toNullableString(row.source_object_type),
      toNullableString(row.source_object_id),
      toNullableString(row.source_user_id),
      toNullableString(row.source_email),
      toNullableString(row.source_display_name),
      toBoolean(row.is_primary),
      toBoolean(row.is_login_identity),
      toBoolean(row.active, true),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertClientUser = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.client_users (
        user_id,
        client_id,
        identity_profile_id,
        email,
        full_name,
        tenant_type,
        auth_mode,
        status,
        active,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, COALESCE($11::timestamptz, CURRENT_TIMESTAMP), COALESCE($12::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (user_id) DO UPDATE
      SET
        client_id = EXCLUDED.client_id,
        identity_profile_id = EXCLUDED.identity_profile_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        tenant_type = EXCLUDED.tenant_type,
        auth_mode = EXCLUDED.auth_mode,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        last_login_at = EXCLUDED.last_login_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.user_id),
      toNullableString(row.client_id),
      toNullableString(row.identity_profile_id),
      toNullableString(row.email),
      toNullableString(row.full_name),
      toNullableString(row.tenant_type) || 'client',
      toNullableString(row.auth_mode),
      toNullableString(row.status) || 'active',
      toBoolean(row.active, true),
      toNullableString(row.last_login_at),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertMember = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.members (
        member_id, identity_profile_id, display_name, primary_email, phone,
        job_level, employment_type, hire_date, contract_end_date, status, active,
        first_name, last_name, preferred_name, legal_name, birth_date, biography, avatar_url,
        role_title, role_category, org_role_id, profession_id, seniority_level,
        location_city, location_country, time_zone,
        email_aliases, contact_channel, contact_handle, relevance_note,
        azure_oid, notion_user_id, notion_display_name, hubspot_owner_id, teams_user_id, slack_user_id,
        years_experience, efeonce_start_date, languages,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8::date, $9::date, 'active', $10,
        $11, $12, $13, $14, $15::date, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25,
        $26::text[], $27, $28, $29,
        $30, $31, $32, $33, $34, $35,
        $36, $37::date, $38::text[],
        COALESCE($39::timestamptz, CURRENT_TIMESTAMP),
        COALESCE($40::timestamptz, CURRENT_TIMESTAMP)
      )
      ON CONFLICT (member_id) DO UPDATE SET
        identity_profile_id = EXCLUDED.identity_profile_id,
        display_name = EXCLUDED.display_name,
        primary_email = EXCLUDED.primary_email,
        phone = EXCLUDED.phone,
        job_level = EXCLUDED.job_level,
        employment_type = EXCLUDED.employment_type,
        hire_date = EXCLUDED.hire_date,
        contract_end_date = EXCLUDED.contract_end_date,
        active = EXCLUDED.active,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        preferred_name = EXCLUDED.preferred_name,
        legal_name = EXCLUDED.legal_name,
        birth_date = EXCLUDED.birth_date,
        biography = EXCLUDED.biography,
        avatar_url = EXCLUDED.avatar_url,
        role_title = EXCLUDED.role_title,
        role_category = EXCLUDED.role_category,
        org_role_id = EXCLUDED.org_role_id,
        profession_id = EXCLUDED.profession_id,
        seniority_level = EXCLUDED.seniority_level,
        location_city = EXCLUDED.location_city,
        location_country = EXCLUDED.location_country,
        time_zone = EXCLUDED.time_zone,
        email_aliases = EXCLUDED.email_aliases,
        contact_channel = EXCLUDED.contact_channel,
        contact_handle = EXCLUDED.contact_handle,
        relevance_note = EXCLUDED.relevance_note,
        azure_oid = EXCLUDED.azure_oid,
        notion_user_id = EXCLUDED.notion_user_id,
        notion_display_name = EXCLUDED.notion_display_name,
        hubspot_owner_id = EXCLUDED.hubspot_owner_id,
        teams_user_id = EXCLUDED.teams_user_id,
        slack_user_id = EXCLUDED.slack_user_id,
        years_experience = EXCLUDED.years_experience,
        efeonce_start_date = EXCLUDED.efeonce_start_date,
        languages = EXCLUDED.languages,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.member_id),                                    // $1
      toNullableString(row.identity_profile_id),                          // $2
      toNullableString(row.display_name),                                 // $3
      toNullableString(row.email),                                        // $4
      toNullableString(row.phone),                                        // $5
      toNullableString(row.job_level) || toNullableString(row.seniority_level), // $6
      toNullableString(row.employment_type),                              // $7
      toNullableString(row.hire_date) || toNullableString(row.efeonce_start_date), // $8
      toNullableString(row.contract_end_date),                            // $9
      toBoolean(row.active, true),                                        // $10
      toNullableString(row.first_name),                                   // $11
      toNullableString(row.last_name),                                    // $12
      toNullableString(row.preferred_name),                               // $13
      toNullableString(row.legal_name),                                   // $14
      toNullableString(row.birth_date),                                   // $15
      toNullableString(row.biography),                                    // $16
      toNullableString(row.avatar_url),                                   // $17
      toNullableString(row.role_title),                                   // $18
      toNullableString(row.role_category),                                // $19
      toNullableString(row.org_role_id),                                  // $20
      toNullableString(row.profession_id),                                // $21
      toNullableString(row.seniority_level),                              // $22
      toNullableString(row.location_city),                                // $23
      toNullableString(row.location_country),                             // $24
      toNullableString(row.time_zone),                                    // $25
      toTextArray(row.email_aliases),                                     // $26
      toNullableString(row.contact_channel),                              // $27
      toNullableString(row.contact_handle),                               // $28
      toNullableString(row.relevance_note),                               // $29
      toNullableString(row.azure_oid),                                    // $30
      toNullableString(row.notion_user_id),                               // $31
      toNullableString(row.notion_display_name),                          // $32
      toNullableString(row.hubspot_owner_id),                             // $33
      toNullableString(row.teams_user_id),                                // $34
      toNullableString(row.slack_user_id),                                // $35
      toNullableNumber(row.years_experience),                             // $36
      toNullableString(row.efeonce_start_date),                           // $37
      toTextArray(row.languages),                                         // $38
      toNullableString(row.created_at),                                   // $39
      toNullableString(row.updated_at)                                    // $40
    ]
  )
}

const updateMemberManagerLink = async (row: Record<string, unknown>) => {
  const memberId = toNullableString(row.member_id)

  if (!memberId) {
    return
  }

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_core.members
      SET reports_to_member_id = $2
      WHERE member_id = $1
    `,
    [memberId, toNullableString(row.reports_to)]
  )
}

const upsertProvider = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.providers (
        provider_id,
        provider_name,
        provider_type,
        website_url,
        primary_email,
        status,
        active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NULL, 'active', $5, COALESCE($6::timestamptz, CURRENT_TIMESTAMP), COALESCE($7::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (provider_id) DO UPDATE
      SET
        provider_name = EXCLUDED.provider_name,
        provider_type = EXCLUDED.provider_type,
        website_url = EXCLUDED.website_url,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.provider_id),
      toNullableString(row.provider_name),
      toNullableString(row.provider_kind) || toNullableString(row.provider_category),
      toNullableString(row.website_url),
      toBoolean(row.is_active, true),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertServiceModule = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.service_modules (
        module_id,
        module_code,
        module_name,
        business_line,
        status,
        active,
        description,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'active', $5, $6, COALESCE($7::timestamptz, CURRENT_TIMESTAMP), COALESCE($8::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (module_id) DO UPDATE
      SET
        module_code = EXCLUDED.module_code,
        module_name = EXCLUDED.module_name,
        business_line = EXCLUDED.business_line,
        active = EXCLUDED.active,
        description = EXCLUDED.description,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.module_id),
      toNullableString(row.module_code),
      toNullableString(row.module_label),
      toNullableString(row.parent_module_code) || toNullableString(row.module_code),
      toBoolean(row.active, true),
      toNullableString(row.description),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertClientServiceModule = async (row: Record<string, unknown>) => {
  const clientId = toNullableString(row.client_id)
  const moduleCode = toNullableString(row.module_code)

  if (!clientId || !moduleCode) {
    return
  }

  const [serviceModule] = await runGreenhousePostgresQuery<{ module_id: string }>(
    `
      SELECT module_id
      FROM greenhouse_core.service_modules
      WHERE module_code = $1
      LIMIT 1
    `,
    [moduleCode]
  )

  if (!serviceModule?.module_id) {
    return
  }

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.client_service_modules (
        assignment_id,
        client_id,
        module_id,
        source_system,
        source_reference,
        status,
        active,
        assigned_at,
        ends_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, COALESCE($10::timestamptz, CURRENT_TIMESTAMP), COALESCE($11::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (assignment_id) DO UPDATE
      SET
        client_id = EXCLUDED.client_id,
        module_id = EXCLUDED.module_id,
        source_system = EXCLUDED.source_system,
        source_reference = EXCLUDED.source_reference,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        assigned_at = EXCLUDED.assigned_at,
        ends_at = EXCLUDED.ends_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.assignment_id),
      clientId,
      serviceModule.module_id,
      toNullableString(row.source_system),
      toNullableString(row.source_object_id) || toNullableString(row.source_closedwon_deal_id),
      toBoolean(row.active, true) ? 'active' : 'inactive',
      toBoolean(row.active, true),
      toNullableString(row.valid_from),
      toNullableString(row.valid_to),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertRole = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.roles (
        role_code,
        role_name,
        role_family,
        description,
        tenant_type,
        is_admin,
        is_internal,
        route_group_scope,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], COALESCE($9::timestamptz, CURRENT_TIMESTAMP), COALESCE($10::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (role_code) DO UPDATE
      SET
        role_name = EXCLUDED.role_name,
        role_family = EXCLUDED.role_family,
        description = EXCLUDED.description,
        tenant_type = EXCLUDED.tenant_type,
        is_admin = EXCLUDED.is_admin,
        is_internal = EXCLUDED.is_internal,
        route_group_scope = EXCLUDED.route_group_scope,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.role_code),
      toNullableString(row.role_name),
      toNullableString(row.role_family),
      toNullableString(row.description),
      toNullableString(row.tenant_type),
      toBoolean(row.is_admin),
      toBoolean(row.is_internal),
      Array.isArray(row.route_group_scope) ? row.route_group_scope.map(item => String(item)) : [],
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

const upsertUserRoleAssignment = async (row: Record<string, unknown>) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.user_role_assignments (
        assignment_id,
        user_id,
        role_code,
        client_id,
        status,
        active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, CURRENT_TIMESTAMP), COALESCE($8::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (assignment_id) DO UPDATE
      SET
        user_id = EXCLUDED.user_id,
        role_code = EXCLUDED.role_code,
        client_id = EXCLUDED.client_id,
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `,
    [
      toNullableString(row.assignment_id),
      toNullableString(row.user_id),
      toNullableString(row.role_code),
      toNullableString(row.client_id),
      toNullableString(row.status) || 'active',
      toBoolean(row.active, true),
      toNullableString(row.created_at),
      toNullableString(row.updated_at)
    ]
  )
}

async function main() {
  const summary: Record<string, number> = {}

  const clients = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        client_id,
        client_name,
        status,
        active,
        hubspot_company_id,
        timezone,
        notion_project_ids,
        notes,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('clients')}
      ORDER BY client_id
    `
  )

  for (const row of clients) {
    await upsertClient(row)
  }

  summary.clients = clients.length

  const primaryWorkspaceBySpace = new Map<string, string>()
  const spaceNameById = new Map<string, string>()
  const internalSpaceById = new Map<string, boolean>()

  for (const row of clients) {
    const clientId = toNullableString(row.client_id)

    if (!clientId) {
      continue
    }

    const internalWorkspace = isInternalNotionWorkspaceSeed(row)
    const workspaceId = clientId
    const workspaceName = toNullableString(row.client_name) || clientId

    spaceNameById.set(workspaceId, workspaceName)
    internalSpaceById.set(workspaceId, internalWorkspace)

    await upsertNotionWorkspace({
      space_id: workspaceId,
      public_id: buildDerivedPublicId('EO-SPACE', workspaceId),
      client_id: internalWorkspace ? null : clientId,
      space_name: workspaceName,
      space_type: internalWorkspace ? 'internal_space' : 'client_space',
      status: toNullableString(row.status) || 'active',
      active: toBoolean(row.active, true),
      notes: internalWorkspace
        ? 'Internal agency workspace projected from legacy tenant/client scope during notion workspaces migration.'
        : 'Client delivery workspace projected from legacy tenant/client scope during notion workspaces migration.',
      created_at: row.created_at,
      updated_at: row.updated_at
    })

    for (const notionProjectId of Array.isArray(row.notion_project_ids) ? row.notion_project_ids : []) {
      const normalizedProjectId = toNullableString(notionProjectId)

      if (!normalizedProjectId) {
        continue
      }

      await upsertNotionWorkspaceSourceBinding({
        binding_id: `space-${workspaceId}-legacy-project-${normalizedProjectId}`,
        space_id: workspaceId,
        source_system: 'notion',
        source_object_type: 'project_page',
        source_object_id: normalizedProjectId,
        binding_role: 'legacy_project_scope',
        source_display_name: toNullableString(row.client_name),
        is_primary: false,
        active: true,
        created_at: row.created_at,
        updated_at: row.updated_at
      })
    }
  }

  const notionWorkspaceBindings = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT DISTINCT
        c.client_id,
        c.client_name,
        p._source_database_id AS project_database_source_id
      FROM ${tableRef('clients')} AS c,
      UNNEST(COALESCE(c.notion_project_ids, [])) AS notion_project_id
      INNER JOIN \`${projectId}.notion_ops.proyectos\` AS p
        ON p.notion_page_id = notion_project_id
      WHERE p._source_database_id IS NOT NULL
    `
  )

  for (const row of notionWorkspaceBindings) {
    const spaceId = toNullableString(row.client_id)
    const projectDatabaseSourceId = toNullableString(row.project_database_source_id)

    if (!spaceId || !projectDatabaseSourceId) {
      continue
    }

    const isPrimary = !primaryWorkspaceBySpace.has(spaceId)

    if (isPrimary) {
      primaryWorkspaceBySpace.set(spaceId, projectDatabaseSourceId)
    }

    await upsertNotionWorkspaceSourceBinding({
      binding_id: `space-${spaceId}-workspace-${projectDatabaseSourceId}`,
      space_id: spaceId,
      source_system: 'notion',
      source_object_type: 'project_database',
      source_object_id: projectDatabaseSourceId,
      binding_role: 'delivery_workspace',
      source_display_name: toNullableString(row.client_name),
      is_primary: isPrimary,
      active: true
    })
  }

  for (const [spaceId, projectDatabaseSourceId] of primaryWorkspaceBySpace.entries()) {
    await upsertNotionWorkspace({
      space_id: spaceId,
      public_id: buildDerivedPublicId('EO-SPACE', spaceId),
      client_id: internalSpaceById.get(spaceId) ? null : spaceId,
      space_name: spaceNameById.get(spaceId) || spaceId,
      space_type: internalSpaceById.get(spaceId) ? 'internal_space' : 'client_space',
      primary_project_database_source_id: projectDatabaseSourceId,
      active: true
    })
  }

  summary.notionWorkspaces = clients.length
  summary.notionWorkspaceSourceBindings =
    clients.reduce((total, row) => total + (Array.isArray(row.notion_project_ids) ? row.notion_project_ids.length : 0), 0) +
    notionWorkspaceBindings.length

  const identityProfiles = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        profile_id,
        public_id,
        profile_type,
        canonical_email,
        full_name,
        job_title,
        status,
        active,
        default_auth_mode,
        primary_source_system,
        primary_source_object_type,
        primary_source_object_id,
        notes,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('identity_profiles')}
      ORDER BY profile_id
    `
  )

  for (const row of identityProfiles) {
    await upsertIdentityProfile(row)
  }

  summary.identityProfiles = identityProfiles.length

  const identityLinks = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        link_id,
        profile_id,
        source_system,
        source_object_type,
        source_object_id,
        source_user_id,
        source_email,
        source_display_name,
        is_primary,
        is_login_identity,
        active,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('identity_profile_source_links')}
      ORDER BY link_id
    `
  )

  for (const row of identityLinks) {
    await upsertIdentityProfileSourceLink(row)
  }

  summary.identityProfileSourceLinks = identityLinks.length

  const clientUsers = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        user_id,
        client_id,
        tenant_type,
        email,
        full_name,
        status,
        active,
        auth_mode,
        identity_profile_id,
        CAST(last_login_at AS STRING) AS last_login_at,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('client_users')}
      ORDER BY user_id
    `
  )

  for (const row of clientUsers) {
    await upsertClientUser(row)
  }

  summary.clientUsers = clientUsers.length

  const members = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        member_id,
        display_name,
        email,
        identity_profile_id,
        phone,
        job_level,
        seniority_level,
        employment_type,
        CAST(hire_date AS STRING) AS hire_date,
        CAST(contract_end_date AS STRING) AS contract_end_date,
        reports_to,
        active,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('team_members')}
      ORDER BY member_id
    `
  )

  for (const row of members) {
    await upsertMember(row)
  }

  for (const row of members) {
    await updateMemberManagerLink(row)
  }

  summary.members = members.length

  if (await tableExists('providers')) {
    const providers = await queryBigQuery<Record<string, unknown>>(
      `
        SELECT
          provider_id,
          provider_name,
          provider_category,
          provider_kind,
          website_url,
          is_active,
          CAST(created_at AS STRING) AS created_at,
          CAST(updated_at AS STRING) AS updated_at
        FROM ${tableRef('providers')}
        ORDER BY provider_id
      `
    )

    for (const row of providers) {
      await upsertProvider(row)
    }

    summary.providers = providers.length
  }

  const serviceModules = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        module_id,
        module_code,
        module_label,
        module_kind,
        parent_module_code,
        source_system,
        source_value,
        active,
        description,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('service_modules')}
      ORDER BY module_id
    `
  )

  for (const row of serviceModules) {
    await upsertServiceModule(row)
  }

  summary.serviceModules = serviceModules.length

  const clientServiceModules = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        assignment_id,
        client_id,
        module_code,
        source_system,
        source_object_id,
        source_closedwon_deal_id,
        active,
        CAST(valid_from AS STRING) AS valid_from,
        CAST(valid_to AS STRING) AS valid_to,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('client_service_modules')}
      ORDER BY assignment_id
    `
  )

  for (const row of clientServiceModules) {
    await upsertClientServiceModule(row)
  }

  summary.clientServiceModules = clientServiceModules.length

  const roles = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        role_code,
        role_name,
        role_family,
        description,
        tenant_type,
        is_admin,
        is_internal,
        route_group_scope,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('roles')}
      ORDER BY role_code
    `
  )

  for (const row of roles) {
    await upsertRole(row)
  }

  summary.roles = roles.length

  const userRoleAssignments = await queryBigQuery<Record<string, unknown>>(
    `
      SELECT
        assignment_id,
        user_id,
        client_id,
        role_code,
        status,
        active,
        CAST(created_at AS STRING) AS created_at,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableRef('user_role_assignments')}
      ORDER BY assignment_id
    `
  )

  for (const row of userRoleAssignments) {
    await upsertUserRoleAssignment(row)
  }

  summary.userRoleAssignments = userRoleAssignments.length

  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch(error => {
    console.error('Unable to backfill Greenhouse canonical 360 into PostgreSQL.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
