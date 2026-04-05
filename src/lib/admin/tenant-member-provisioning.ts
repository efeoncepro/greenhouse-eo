import 'server-only'

import { createHash } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import {
  type TenantContactProvisioningResult,
  type TenantContactsProvisioningSummary,
  normalizeTenantContactIds
} from '@/lib/admin/tenant-member-provisioning-shared'
import { verifyTenantContactProvisioningSnapshotToken } from '@/lib/admin/tenant-contact-provisioning-snapshot'
import {
  getHubSpotGreenhouseCompanyContacts,
  type HubSpotGreenhouseContactProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { resolveContactDisplayName } from '@/lib/contacts/contact-display'
import { getSpaceNotionSourceByClientId } from '@/lib/space-notion/space-notion-store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type TenantProvisioningContext = {
  clientId: string
  clientName: string
  hubspotCompanyId: string | null
  portalHomePath: string | null
  timezone: string | null
  spaceId: string | null
  notionProjectIds: string[]
}

type ExistingUserRow = {
  user_id: string
  client_id: string | null
  email: string
}

const DEFAULT_LOCALE = 'es-CL'
const DEFAULT_TIMEZONE = 'America/Santiago'
const DEFAULT_PORTAL_HOME = '/dashboard'

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() || null

const buildScopeId = (userId: string, projectId: string) => {
  const digest = createHash('sha256').update(`${userId}:${projectId}`).digest('hex').slice(0, 18)

  return `scope-${digest}`
}

const ensureTenantMembership = async ({
  userId,
  clientId,
  email,
  fullName,
  jobTitle,
  portalHomePath,
  timezone,
  actorUserId,
  hubspotContactId,
  projectIds
}: {
  userId: string
  clientId: string
  email: string
  fullName: string
  jobTitle: string | null
  portalHomePath: string
  timezone: string
  actorUserId: string
  hubspotContactId: string
  projectIds: string[]
}) => {
  await upsertClientUser({
    userId,
    clientId,
    email,
    fullName,
    jobTitle,
    portalHomePath,
    timezone,
    actorUserId
  })

  await upsertClientExecutiveAssignment({
    userId,
    clientId,
    hubspotContactId
  })

  await upsertProjectScopes({
    userId,
    clientId,
    projectIds
  })
}

const getTenantProvisioningContext = async (clientId: string): Promise<TenantProvisioningContext | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        client_id,
        client_name,
        hubspot_company_id,
        portal_home_path,
        timezone
      FROM \`${projectId}.greenhouse.clients\`
      WHERE client_id = @clientId
      LIMIT 1
    `,
    params: { clientId }
  })

  const row = (rows as Array<Record<string, unknown>>)[0]

  if (!row) {
    return null
  }

  // Resolve project IDs via space_notion_sources (canonical) → notion_ops.proyectos
  let spaceId: string | null = null
  let notionProjectIds: string[] = []

  try {
    const spaceSource = await getSpaceNotionSourceByClientId(clientId)

    if (spaceSource) {
      spaceId = spaceSource.spaceId

      const [projectRows] = await bigQuery.query({
        query: `
          SELECT DISTINCT notion_page_id
          FROM \`${projectId}.notion_ops.proyectos\`
          WHERE space_id = @spaceId
            AND notion_page_id IS NOT NULL
        `,
        params: { spaceId }
      })

      notionProjectIds = (projectRows as Array<Record<string, unknown>>)
        .map(r => String(r.notion_page_id || '').trim())
        .filter(Boolean)
    }
  } catch {
    // Non-fatal: fall through to legacy fallback
  }

  // Legacy fallback: read notion_project_ids from clients table
  if (notionProjectIds.length === 0 && !spaceId) {
    try {
      const [legacyRows] = await bigQuery.query({
        query: `
          SELECT notion_project_ids
          FROM \`${projectId}.greenhouse.clients\`
          WHERE client_id = @clientId
          LIMIT 1
        `,
        params: { clientId }
      })

      const legacyRow = (legacyRows as Array<Record<string, unknown>>)[0]

      if (legacyRow && Array.isArray(legacyRow.notion_project_ids)) {
        notionProjectIds = legacyRow.notion_project_ids
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      }
    } catch {
      // Non-fatal
    }
  }

  return {
    clientId: String(row.client_id || ''),
    clientName: String(row.client_name || row.client_id || ''),
    hubspotCompanyId: row.hubspot_company_id ? String(row.hubspot_company_id) : null,
    portalHomePath: row.portal_home_path ? String(row.portal_home_path) : null,
    timezone: row.timezone ? String(row.timezone) : null,
    spaceId,
    notionProjectIds
  }
}

const getExistingUsers = async ({
  userIds,
  emails
}: {
  userIds: string[]
  emails: string[]
}): Promise<ExistingUserRow[]> => {
  if (userIds.length === 0 && emails.length === 0) {
    return []
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        user_id,
        client_id,
        email
      FROM \`${projectId}.greenhouse.client_users\`
      WHERE user_id IN UNNEST(@userIds)
         OR LOWER(email) IN UNNEST(@emails)
    `,
    params: {
      userIds,
      emails
    }
  })

  return (rows as Array<Record<string, unknown>>).map(row => ({
    user_id: String(row.user_id || ''),
    client_id: row.client_id ? String(row.client_id) : null,
    email: String(row.email || '')
  }))
}

const upsertClientUser = async ({
  userId,
  clientId,
  email,
  fullName,
  jobTitle,
  portalHomePath,
  timezone,
  actorUserId
}: {
  userId: string
  clientId: string
  email: string
  fullName: string
  jobTitle: string | null
  portalHomePath: string
  timezone: string
  actorUserId: string
}) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      MERGE \`${projectId}.greenhouse.client_users\` AS target
      USING (
        SELECT
          @userId AS user_id,
          @clientId AS client_id,
          'client' AS tenant_type,
          @email AS email,
          @fullName AS full_name,
          @jobTitle AS job_title,
          'invited' AS status,
          FALSE AS active,
          'password_reset_pending' AS auth_mode,
          CAST(NULL AS STRING) AS password_hash,
          CAST(NULL AS STRING) AS password_hash_algorithm,
          @portalHomePath AS default_portal_home_path,
          @timezone AS timezone,
          '${DEFAULT_LOCALE}' AS locale,
          CAST(NULL AS STRING) AS avatar_url,
          CAST(NULL AS TIMESTAMP) AS last_login_at,
          CURRENT_TIMESTAMP() AS invited_at,
          @actorUserId AS invited_by_user_id,
          CURRENT_TIMESTAMP() AS created_at,
          CURRENT_TIMESTAMP() AS updated_at
      ) AS source
      ON target.user_id = source.user_id
      WHEN MATCHED THEN
        UPDATE SET
          client_id = source.client_id,
          tenant_type = source.tenant_type,
          email = source.email,
          full_name = source.full_name,
          job_title = source.job_title,
          status = source.status,
          active = source.active,
          auth_mode = source.auth_mode,
          default_portal_home_path = source.default_portal_home_path,
          timezone = source.timezone,
          locale = source.locale,
          invited_by_user_id = source.invited_by_user_id,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          user_id,
          client_id,
          tenant_type,
          email,
          full_name,
          job_title,
          status,
          active,
          auth_mode,
          password_hash,
          password_hash_algorithm,
          default_portal_home_path,
          timezone,
          locale,
          avatar_url,
          last_login_at,
          invited_at,
          invited_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          source.user_id,
          source.client_id,
          source.tenant_type,
          source.email,
          source.full_name,
          source.job_title,
          source.status,
          source.active,
          source.auth_mode,
          source.password_hash,
          source.password_hash_algorithm,
          source.default_portal_home_path,
          source.timezone,
          source.locale,
          source.avatar_url,
          source.last_login_at,
          source.invited_at,
          source.invited_by_user_id,
          source.created_at,
          source.updated_at
        )
    `,
    params: {
      userId,
      clientId,
      email,
      fullName,
      jobTitle,
      portalHomePath,
      timezone,
      actorUserId
    },
    types: {
      userId: 'STRING',
      clientId: 'STRING',
      email: 'STRING',
      fullName: 'STRING',
      jobTitle: 'STRING',
      portalHomePath: 'STRING',
      timezone: 'STRING',
      actorUserId: 'STRING'
    }
  })
}

const upsertClientExecutiveAssignment = async ({
  userId,
  clientId,
  hubspotContactId
}: {
  userId: string
  clientId: string
  hubspotContactId: string
}) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      MERGE \`${projectId}.greenhouse.user_role_assignments\` AS target
      USING (
        SELECT
          @assignmentId AS assignment_id,
          @userId AS user_id,
          @clientId AS client_id,
          'client_executive' AS role_code,
          'active' AS status,
          TRUE AS active,
          CURRENT_TIMESTAMP() AS effective_from,
          CAST(NULL AS TIMESTAMP) AS effective_to,
          'Provisioned from HubSpot contact through admin tenant detail.' AS notes,
          CURRENT_TIMESTAMP() AS created_at,
          CURRENT_TIMESTAMP() AS updated_at
      ) AS source
      ON target.assignment_id = source.assignment_id
      WHEN MATCHED THEN
        UPDATE SET
          user_id = source.user_id,
          client_id = source.client_id,
          role_code = source.role_code,
          status = source.status,
          active = source.active,
          effective_from = source.effective_from,
          effective_to = source.effective_to,
          notes = source.notes,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          assignment_id,
          user_id,
          client_id,
          role_code,
          status,
          active,
          effective_from,
          effective_to,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          source.assignment_id,
          source.user_id,
          source.client_id,
          source.role_code,
          source.status,
          source.active,
          source.effective_from,
          source.effective_to,
          source.notes,
          source.created_at,
          source.updated_at
        )
    `,
    params: {
      assignmentId: `assignment-hubspot-contact-${hubspotContactId}-client-executive`,
      userId,
      clientId
    }
  })
}

const upsertProjectScopes = async ({
  userId,
  clientId,
  projectIds
}: {
  userId: string
  clientId: string
  projectIds: string[]
}) => {
  if (projectIds.length === 0) {
    return
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  for (const scopedProjectId of projectIds) {
    await bigQuery.query({
      query: `
        MERGE \`${projectId}.greenhouse.user_project_scopes\` AS target
        USING (
          SELECT
            @scopeId AS scope_id,
            @userId AS user_id,
            @clientId AS client_id,
            @projectId AS project_id,
            'executive_context' AS access_level,
            TRUE AS active,
            CURRENT_TIMESTAMP() AS created_at,
            CURRENT_TIMESTAMP() AS updated_at
        ) AS source
        ON target.scope_id = source.scope_id
        WHEN MATCHED THEN
          UPDATE SET
            user_id = source.user_id,
            client_id = source.client_id,
            project_id = source.project_id,
            access_level = source.access_level,
            active = source.active,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            scope_id,
            user_id,
            client_id,
            project_id,
            access_level,
            active,
            created_at,
            updated_at
          )
          VALUES (
            source.scope_id,
            source.user_id,
            source.client_id,
            source.project_id,
            source.access_level,
            source.active,
            source.created_at,
            source.updated_at
          )
      `,
      params: {
        scopeId: buildScopeId(userId, scopedProjectId),
        userId,
        clientId,
        projectId: scopedProjectId
      }
    })

    // Audit: emit scope.assigned event (TASK-248)
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.userScope,
      aggregateId: buildScopeId(userId, scopedProjectId),
      eventType: EVENT_TYPES.scopeAssigned,
      payload: { userId, scopeType: 'project', scopeId: scopedProjectId, clientId, accessLevel: 'executive_context' }
    }).catch(err => {
      console.warn('[tenant-member-provisioning] Failed to emit scope.assigned event:', err)
    })
  }
}

export const provisionTenantUsersFromHubSpotContacts = async ({
  clientId,
  actorUserId,
  contactIds,
  contactsSnapshotToken
}: {
  clientId: string
  actorUserId: string
  contactIds: string[]
  contactsSnapshotToken?: string | null
}): Promise<TenantContactsProvisioningSummary> => {
  const normalizedContactIds = normalizeTenantContactIds(contactIds)
  const tenant = await getTenantProvisioningContext(clientId)

  if (!tenant) {
    throw new Error(`Tenant ${clientId} not found.`)
  }

  if (!tenant.hubspotCompanyId) {
    throw new Error(`Tenant ${clientId} does not have a HubSpot company mapping.`)
  }

  if (normalizedContactIds.length === 0) {
    return {
      clientId: tenant.clientId,
      clientName: tenant.clientName,
      hubspotCompanyId: tenant.hubspotCompanyId,
      requested: 0,
      created: 0,
      reconciled: 0,
      conflicts: 0,
      invalid: 0,
      errors: 0,
      results: []
    }
  }

  const snapshotContacts =
    contactsSnapshotToken?.trim() && tenant.hubspotCompanyId
      ? verifyTenantContactProvisioningSnapshotToken({
          token: contactsSnapshotToken.trim(),
          clientId: tenant.clientId,
          hubspotCompanyId: tenant.hubspotCompanyId
        })
      : null

  const liveContacts =
    snapshotContacts || (await getHubSpotGreenhouseCompanyContacts(tenant.hubspotCompanyId)).contacts

  const selectedContacts = normalizedContactIds.map(contactId =>
    liveContacts.find(contact => contact.hubspotContactId === contactId)
  )

  const validSelectedContacts = selectedContacts.filter(Boolean) as HubSpotGreenhouseContactProfile[]

  const missingSelections = normalizedContactIds.filter(
    contactId => !validSelectedContacts.some(contact => contact.hubspotContactId === contactId)
  )

  const candidateUserIds = validSelectedContacts.map(contact => `user-hubspot-contact-${contact.hubspotContactId}`)

  const candidateEmails = validSelectedContacts
    .map(contact => normalizeEmail(contact.email))
    .filter((value): value is string => Boolean(value))

  const existingUsers = await getExistingUsers({
    userIds: candidateUserIds,
    emails: candidateEmails
  })

  const existingByUserId = new Map(existingUsers.map(row => [row.user_id, row]))
  const existingByEmail = new Map<string, ExistingUserRow[]>()

  for (const row of existingUsers) {
    const normalizedExistingEmail = normalizeEmail(row.email)

    if (!normalizedExistingEmail) {
      continue
    }

    const current = existingByEmail.get(normalizedExistingEmail) || []

    current.push(row)
    existingByEmail.set(normalizedExistingEmail, current)
  }

  const results: TenantContactProvisioningResult[] = missingSelections.map(contactId => ({
    hubspotContactId: contactId,
    email: null,
    displayName: `HubSpot Contact ${contactId}`,
    outcome: 'invalid',
    reason: 'The selected contact is no longer available in the live HubSpot response.',
    userId: null
  }))

  for (const contact of validSelectedContacts) {
    const normalizedEmail = normalizeEmail(contact.email)
    const canonicalUserId = `user-hubspot-contact-${contact.hubspotContactId}`
    const displayName = resolveContactDisplayName(contact)

    if (!normalizedEmail) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: contact.email,
        displayName,
        outcome: 'invalid',
        reason: 'The HubSpot contact does not have an email address, so it cannot authenticate in Greenhouse.',
        userId: null
      })

      continue
    }

    const existingById = existingByUserId.get(canonicalUserId)
    const existingEmailRows = existingByEmail.get(normalizedEmail) || []

    const sameTenantEmailUsers = Array.from(
      new Map(
        existingEmailRows
          .filter(row => row.client_id === clientId)
          .map(row => [row.user_id, row])
      ).values()
    )

    const otherTenantEmailUsers = Array.from(
      new Map(
        existingEmailRows
          .filter(row => row.client_id && row.client_id !== clientId)
          .map(row => [`${row.client_id}:${row.user_id}`, row])
      ).values()
    )

    const existingTenantEmailUser = sameTenantEmailUsers[0] || null
    const hasExistingCanonicalUser = Boolean(existingById && existingById.client_id === clientId)
    const hasExistingTenantEmailUser = Boolean(existingTenantEmailUser)

    if (
      hasExistingCanonicalUser &&
      hasExistingTenantEmailUser &&
      existingById?.user_id !== existingTenantEmailUser?.user_id
    ) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'conflict',
        reason: `This tenant already has two different users linked to this HubSpot contact/email (${existingById?.user_id} and ${existingTenantEmailUser?.user_id}). Resolve that duplication before provisioning again.`,
        userId: existingById?.user_id || existingTenantEmailUser?.user_id || null
      })

      continue
    }

    if (sameTenantEmailUsers.length > 1) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'conflict',
        reason: `This tenant already has multiple users with the same email (${sameTenantEmailUsers.map(row => row.user_id).join(', ')}). Resolve that duplication before provisioning again.`,
        userId: sameTenantEmailUsers[0]?.user_id || null
      })

      continue
    }

    if (existingById && existingById.client_id !== clientId) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'conflict',
        reason: `This HubSpot contact is already linked to another tenant (${existingById.client_id}).`,
        userId: existingById.user_id
      })

      continue
    }

    if (!hasExistingCanonicalUser && !hasExistingTenantEmailUser && otherTenantEmailUsers.length > 0) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'conflict',
        reason: `This email already belongs to another Greenhouse user (${otherTenantEmailUsers.map(row => row.user_id).join(', ')}).`,
        userId: otherTenantEmailUsers[0]?.user_id || null
      })

      continue
    }

    const targetUserId =
      existingById?.client_id === clientId
        ? existingById.user_id
        : existingTenantEmailUser?.client_id === clientId
          ? existingTenantEmailUser.user_id
          : canonicalUserId

    try {
      await ensureTenantMembership({
        userId: targetUserId,
        clientId,
        email: normalizedEmail,
        fullName: displayName,
        jobTitle: contact.jobTitle?.trim() || null,
        portalHomePath: tenant.portalHomePath || DEFAULT_PORTAL_HOME,
        timezone: tenant.timezone || DEFAULT_TIMEZONE,
        actorUserId,
        hubspotContactId: contact.hubspotContactId,
        projectIds: tenant.notionProjectIds
      })

      if (targetUserId === canonicalUserId && !hasExistingCanonicalUser && !hasExistingTenantEmailUser) {
        results.push({
          hubspotContactId: contact.hubspotContactId,
          email: normalizedEmail,
          displayName,
          outcome: 'created',
          reason: tenant.notionProjectIds.length
            ? `Member created with client_executive role and ${tenant.notionProjectIds.length} base project scopes.`
            : 'Member created with client_executive role and no base project scopes yet.',
          userId: targetUserId
        })

        continue
      }

      const adoptionReason =
        targetUserId !== canonicalUserId
          ? `Existing tenant user ${targetUserId} was matched by email and reconciled with HubSpot contact ${contact.hubspotContactId}.`
          : `Existing tenant user ${targetUserId} was re-synced to ensure client_executive access and base project scopes.`

      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'reconciled',
        reason: tenant.notionProjectIds.length
          ? `${adoptionReason} ${tenant.notionProjectIds.length} base project scopes were ensured.`
          : `${adoptionReason} No base project scopes were available for this tenant yet.`,
        userId: targetUserId
      })
    } catch (error) {
      results.push({
        hubspotContactId: contact.hubspotContactId,
        email: normalizedEmail,
        displayName,
        outcome: 'error',
        reason: error instanceof Error ? error.message : 'Unknown provisioning error while reconciling this contact.',
        userId: targetUserId
      })
    }
  }

  return {
    clientId: tenant.clientId,
    clientName: tenant.clientName,
    hubspotCompanyId: tenant.hubspotCompanyId,
    requested: normalizedContactIds.length,
    created: results.filter(item => item.outcome === 'created').length,
    reconciled: results.filter(item => item.outcome === 'reconciled').length,
    conflicts: results.filter(item => item.outcome === 'conflict').length,
    invalid: results.filter(item => item.outcome === 'invalid').length,
    errors: results.filter(item => item.outcome === 'error').length,
    results
  }
}
