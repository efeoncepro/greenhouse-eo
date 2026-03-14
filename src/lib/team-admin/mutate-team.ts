import 'server-only'

import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getPeopleTableColumns, toContactChannel, toDateString, toNumber, toStringArray } from '@/lib/people/shared'
import type {
  CreateAssignmentInput,
  CreateMemberInput,
  TeamAdminAssignmentRecord,
  TeamAdminClientOption,
  TeamAdminMetadata,
  TeamAdminMemberRecord,
  TeamContactChannel,
  TeamRoleCategory,
  UpdateAssignmentInput,
  UpdateMemberInput
} from '@/types/team'

const getProjectId = () => getBigQueryProjectId()

const roleCategories: TeamRoleCategory[] = ['account', 'operations', 'strategy', 'design', 'development', 'media', 'unknown']

const writableMemberColumns = new Set([
  'display_name',
  'email',
  'email_aliases',
  'location_country',
  'location_city',
  'role_title',
  'role_category',
  'avatar_url',
  'contact_channel',
  'contact_handle',
  'relevance_note',
  'azure_oid',
  'notion_user_id',
  'hubspot_owner_id',
  'active'
])

const writableAssignmentColumns = new Set([
  'fte_allocation',
  'hours_per_month',
  'role_title_override',
  'relevance_note_override',
  'contact_channel_override',
  'contact_handle_override',
  'start_date',
  'end_date',
  'active'
])

type MemberRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  email_aliases: string[] | null
  role_title: string | null
  role_category: string | null
  avatar_url: string | null
  location_country: string | null
  location_city: string | null
  contact_channel: string | null
  contact_handle: string | null
  relevance_note: string | null
  azure_oid: string | null
  notion_user_id: string | null
  hubspot_owner_id: string | null
  active: boolean | null
}

type AssignmentRow = {
  assignment_id: string | null
  client_id: string | null
  client_name: string | null
  member_id: string | null
  fte_allocation: number | string | null
  hours_per_month: number | string | null
  role_title_override: string | null
  relevance_note_override: string | null
  contact_channel_override: string | null
  contact_handle_override: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  active: boolean | null
}

type ClientRow = {
  client_id: string | null
  client_name: string | null
  active: boolean | null
}

type ExistingMemberConflictRow = {
  member_id: string | null
  email: string | null
  email_aliases: string[] | null
}

type ExistingPrincipalConflictRow = {
  user_id: string | null
  email: string | null
  microsoft_email: string | null
}

export class TeamAdminValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'TeamAdminValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const toTeamAdminErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof TeamAdminValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  const detail = error instanceof Error ? error.message : String(error)

  return NextResponse.json({ error: fallbackMessage, detail }, { status: 500 })
}

const runQuery = async <T>(query: string, params: Record<string, unknown> = {}) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params
  })

  return rows as T[]
}

const currentDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const normalizeEmail = (value: unknown) => {
  const normalized = normalizeText(value)?.toLowerCase() || null

  return normalized
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const ensureValidEmail = (value: unknown, label: string) => {
  const normalized = normalizeEmail(value)

  if (!normalized || !isValidEmail(normalized)) {
    throw new TeamAdminValidationError(`${label} must be a valid email address.`)
  }

  return normalized
}

const ensurePublicMemberEmail = (value: unknown) => {
  const email = ensureValidEmail(value, 'email')

  if (!email.endsWith('@efeoncepro.com')) {
    throw new TeamAdminValidationError('email must use the @efeoncepro.com domain.')
  }

  return email
}

const normalizeEmailAliases = (value: unknown, publicEmail: string) => {
  const values = Array.isArray(value) ? value : []
  const aliases = new Set<string>([publicEmail])

  for (const item of values) {
    const email = normalizeEmail(item)

    if (!email) {
      continue
    }

    if (!isValidEmail(email)) {
      throw new TeamAdminValidationError(`Invalid email alias: ${String(item)}`)
    }

    aliases.add(email)
  }

  return Array.from(aliases)
}

const ensureRoleCategory = (value: unknown): TeamRoleCategory => {
  const normalized = normalizeText(value)

  if (!normalized || !roleCategories.includes(normalized as TeamRoleCategory)) {
    throw new TeamAdminValidationError('roleCategory is invalid.')
  }

  return normalized as TeamRoleCategory
}

const ensureContactChannel = (value: unknown): TeamContactChannel => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return 'teams'
  }

  return toContactChannel(normalized)
}

const ensureCountryCode = (value: unknown) => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  const upper = normalized.toUpperCase()

  if (!/^[A-Z]{2}$/.test(upper)) {
    throw new TeamAdminValidationError('locationCountry must be a valid ISO alpha-2 code.')
  }

  return upper
}

const ensureDateString = (value: unknown, label: string) => {
  const normalized = normalizeText(value)

  if (!normalized) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new TeamAdminValidationError(`${label} must use YYYY-MM-DD format.`)
  }

  return normalized
}

const ensureFte = (value: unknown) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0.1 || parsed > 2) {
    throw new TeamAdminValidationError('fteAllocation must be between 0.1 and 2.0.')
  }

  return Math.round(parsed * 10) / 10
}

const ensureHours = (value: unknown, allowNull = true) => {
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null
    }

    throw new TeamAdminValidationError('hoursPerMonth is required.')
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TeamAdminValidationError('hoursPerMonth must be a positive number.')
  }

  return Math.round(parsed)
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const mapMemberRecord = (row: MemberRow): TeamAdminMemberRecord => ({
  memberId: String(row.member_id || ''),
  displayName: String(row.display_name || ''),
  email: String(row.email || ''),
  emailAliases: toStringArray(row.email_aliases),
  roleTitle: String(row.role_title || ''),
  roleCategory: (row.role_category || 'unknown') as TeamRoleCategory,
  avatarUrl: row.avatar_url || null,
  locationCountry: row.location_country || null,
  locationCity: row.location_city || null,
  contactChannel: toContactChannel(row.contact_channel),
  contactHandle: row.contact_handle || null,
  relevanceNote: row.relevance_note || null,
  azureOid: row.azure_oid || null,
  notionUserId: row.notion_user_id || null,
  hubspotOwnerId: row.hubspot_owner_id || null,
  active: Boolean(row.active)
})

const mapAssignmentRecord = (row: AssignmentRow): TeamAdminAssignmentRecord => ({
  assignmentId: String(row.assignment_id || ''),
  clientId: String(row.client_id || ''),
  clientName: row.client_name || null,
  memberId: String(row.member_id || ''),
  fteAllocation: Math.round(toNumber(row.fte_allocation) * 10) / 10,
  hoursPerMonth: row.hours_per_month === null || row.hours_per_month === undefined ? null : Math.round(toNumber(row.hours_per_month)),
  roleTitleOverride: row.role_title_override || null,
  relevanceNoteOverride: row.relevance_note_override || null,
  contactChannelOverride: row.contact_channel_override ? toContactChannel(row.contact_channel_override) : null,
  contactHandleOverride: row.contact_handle_override || null,
  startDate: toDateString(row.start_date),
  endDate: toDateString(row.end_date),
  active: Boolean(row.active)
})

const getMemberColumns = async () => getPeopleTableColumns('greenhouse', 'team_members')
const getAssignmentColumns = async () => getPeopleTableColumns('greenhouse', 'client_team_assignments')
const getAuditColumns = async () => getPeopleTableColumns('greenhouse', 'audit_events')

const getMemberRecord = async (memberId: string) => {
  const projectId = getProjectId()
  const memberColumns = await getMemberColumns()

  const emailAliasesSelect = memberColumns.has('email_aliases')
    ? 'COALESCE(email_aliases, ARRAY<STRING>[]) AS email_aliases,'
    : 'ARRAY<STRING>[] AS email_aliases,'

  const locationCountrySelect = memberColumns.has('location_country')
    ? 'location_country,'
    : 'CAST(NULL AS STRING) AS location_country,'

  const locationCitySelect = memberColumns.has('location_city')
    ? 'location_city,'
    : 'CAST(NULL AS STRING) AS location_city,'

  const azureOidSelect = memberColumns.has('azure_oid') ? 'azure_oid,' : 'CAST(NULL AS STRING) AS azure_oid,'
  const notionUserIdSelect = memberColumns.has('notion_user_id') ? 'notion_user_id,' : 'CAST(NULL AS STRING) AS notion_user_id,'

  const hubspotOwnerIdSelect = memberColumns.has('hubspot_owner_id')
    ? 'hubspot_owner_id,'
    : 'CAST(NULL AS STRING) AS hubspot_owner_id,'

  const rows = await runQuery<MemberRow>(
    `
      SELECT
        member_id,
        display_name,
        email,
        ${emailAliasesSelect}
        role_title,
        role_category,
        avatar_url,
        ${locationCountrySelect}
        ${locationCitySelect}
        contact_channel,
        contact_handle,
        relevance_note,
        ${azureOidSelect}
        ${notionUserIdSelect}
        ${hubspotOwnerIdSelect}
        active
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  return rows[0] ? mapMemberRecord(rows[0]) : null
}

const getAssignmentRecord = async (assignmentId: string) => {
  const projectId = getProjectId()

  const rows = await runQuery<AssignmentRow>(
    `
      SELECT
        a.assignment_id,
        a.client_id,
        c.client_name,
        a.member_id,
        a.fte_allocation,
        a.hours_per_month,
        a.role_title_override,
        a.relevance_note_override,
        a.contact_channel_override,
        a.contact_handle_override,
        a.start_date,
        a.end_date,
        a.active
      FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
      LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
        ON c.client_id = a.client_id
      WHERE a.assignment_id = @assignmentId
      LIMIT 1
    `,
    { assignmentId }
  )

  return rows[0] ? mapAssignmentRecord(rows[0]) : null
}

const getClientRecord = async (clientId: string) => {
  const projectId = getProjectId()

  const rows = await runQuery<ClientRow>(
    `
      SELECT client_id, client_name, active
      FROM \`${projectId}.greenhouse.clients\`
      WHERE client_id = @clientId
      LIMIT 1
    `,
    { clientId }
  )

  return rows[0] || null
}

const getActiveClients = async (): Promise<TeamAdminClientOption[]> => {
  const projectId = getProjectId()

  const rows = await runQuery<ClientRow>(
    `
      SELECT
        client_id,
        client_name,
        active
      FROM \`${projectId}.greenhouse.clients\`
      WHERE active = TRUE
      ORDER BY client_name ASC
    `
  )

  return rows.map(row => ({
    clientId: String(row.client_id || ''),
    clientName: String(row.client_name || row.client_id || ''),
    active: Boolean(row.active)
  }))
}

const getAssignmentByClientAndMember = async (clientId: string, memberId: string) => {
  const projectId = getProjectId()

  const rows = await runQuery<AssignmentRow>(
    `
      SELECT
        a.assignment_id,
        a.client_id,
        c.client_name,
        a.member_id,
        a.fte_allocation,
        a.hours_per_month,
        a.role_title_override,
        a.relevance_note_override,
        a.contact_channel_override,
        a.contact_handle_override,
        a.start_date,
        a.end_date,
        a.active
      FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
      LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
        ON c.client_id = a.client_id
      WHERE a.client_id = @clientId
        AND a.member_id = @memberId
      ORDER BY a.updated_at DESC
      LIMIT 1
    `,
    { clientId, memberId }
  )

  return rows[0] ? mapAssignmentRecord(rows[0]) : null
}

const getMemberIdCandidates = async (baseSlug: string) => {
  const projectId = getProjectId()

  const rows = await runQuery<{ member_id: string | null }>(
    `
      SELECT member_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @baseSlug
         OR STARTS_WITH(member_id, CONCAT(@baseSlug, '-'))
    `,
    { baseSlug }
  )

  return new Set(rows.map(row => String(row.member_id || '')).filter(Boolean))
}

const buildNextMemberId = async (displayName: string) => {
  const baseSlug = slugify(displayName)

  if (!baseSlug) {
    throw new TeamAdminValidationError('displayName could not be converted to a valid member id.')
  }

  const taken = await getMemberIdCandidates(baseSlug)

  if (!taken.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2

  while (taken.has(`${baseSlug}-${suffix}`)) {
    suffix += 1
  }

  return `${baseSlug}-${suffix}`
}

const ensureUniqueMemberEmails = async ({
  email,
  emailAliases,
  excludeMemberId
}: {
  email: string
  emailAliases: string[]
  excludeMemberId?: string
}) => {
  const projectId = getProjectId()
  const memberColumns = await getMemberColumns()
  const hasEmailAliases = memberColumns.has('email_aliases')
  const candidateEmails = Array.from(new Set([email, ...emailAliases]))

  const aliasMatchClause = hasEmailAliases
    ? `
        OR EXISTS (
          SELECT 1
          FROM UNNEST(COALESCE(email_aliases, ARRAY<STRING>[])) AS alias
          WHERE LOWER(alias) IN UNNEST(@candidateEmails)
        )
      `
    : ''

  const rows = await runQuery<ExistingMemberConflictRow>(
    `
      SELECT
        member_id,
        email,
        ${hasEmailAliases ? 'COALESCE(email_aliases, ARRAY<STRING>[]) AS email_aliases' : 'ARRAY<STRING>[] AS email_aliases'}
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE LOWER(email) IN UNNEST(@candidateEmails)
      ${aliasMatchClause}
    `,
    { candidateEmails }
  )

  const conflict = rows.find(row => String(row.member_id || '') !== excludeMemberId)

  if (conflict) {
    throw new TeamAdminValidationError('A team member already uses this email or one of the provided aliases.', 409, {
      conflictingMemberId: String(conflict.member_id || '')
    })
  }

  const principalRows = await runQuery<ExistingPrincipalConflictRow>(
    `
      SELECT
        user_id,
        email,
        microsoft_email
      FROM \`${projectId}.greenhouse.client_users\`
      WHERE LOWER(email) IN UNNEST(@candidateEmails)
         OR LOWER(COALESCE(microsoft_email, '')) IN UNNEST(@candidateEmails)
    `,
    { candidateEmails }
  )

  const principalConflict = principalRows.find(row => {
    const principalUserId = String(row.user_id || '')

    return !excludeMemberId || !principalUserId.includes(excludeMemberId)
  })

  if (principalConflict) {
    throw new TeamAdminValidationError('A Greenhouse login principal already uses this email or alias.', 409, {
      conflictingUserId: String(principalConflict.user_id || ''),
      conflictingEmail: principalConflict.email || principalConflict.microsoft_email || null
    })
  }
}

const writeAuditEvent = async ({
  actorUserId,
  eventType,
  targetEntityType,
  targetEntityId,
  clientId,
  payload
}: {
  actorUserId: string
  eventType: string
  targetEntityType: string
  targetEntityId: string
  clientId?: string | null
  payload: Record<string, unknown>
}) => {
  const projectId = getProjectId()
  const auditColumns = await getAuditColumns()

  if (auditColumns.size === 0) {
    return
  }

  await getBigQueryClient().query({
    query: `
      INSERT INTO \`${projectId}.greenhouse.audit_events\` (
        event_id,
        event_type,
        actor_user_id,
        client_id,
        target_entity_type,
        target_entity_id,
        event_payload,
        occurred_at
      )
      VALUES (
        @eventId,
        @eventType,
        @actorUserId,
        @clientId,
        @targetEntityType,
        @targetEntityId,
        PARSE_JSON(@eventPayload),
        CURRENT_TIMESTAMP()
      )
    `,
    params: {
      eventId: `event-${randomUUID()}`,
      eventType,
      actorUserId,
      clientId: clientId || null,
      targetEntityType,
      targetEntityId,
      eventPayload: JSON.stringify(payload)
    }
  })
}

const buildMemberInsertPayload = async (input: CreateMemberInput) => {
  const memberId = await buildNextMemberId(input.displayName)
  const email = ensurePublicMemberEmail(input.email)
  const emailAliases = normalizeEmailAliases(input.emailAliases, email)

  await ensureUniqueMemberEmails({ email, emailAliases })

  return {
    memberId,
    displayName: normalizeText(input.displayName) || (() => { throw new TeamAdminValidationError('displayName is required.') })(),
    email,
    emailAliases,
    locationCountry: ensureCountryCode(input.locationCountry),
    locationCity: normalizeText(input.locationCity),
    roleTitle: normalizeText(input.roleTitle) || (() => { throw new TeamAdminValidationError('roleTitle is required.') })(),
    roleCategory: ensureRoleCategory(input.roleCategory),
    avatarUrl: normalizeText(input.avatarUrl),
    contactChannel: ensureContactChannel(input.contactChannel),
    contactHandle: normalizeText(input.contactHandle),
    relevanceNote: normalizeText(input.relevanceNote),
    azureOid: normalizeText(input.azureOid),
    notionUserId: normalizeText(input.notionUserId),
    hubspotOwnerId: normalizeText(input.hubspotOwnerId)
  }
}

const buildMemberUpdatePayload = async (memberId: string, input: UpdateMemberInput) => {
  const existing = await getMemberRecord(memberId)

  if (!existing) {
    throw new TeamAdminValidationError('Team member not found.', 404)
  }

  const updates: Record<string, unknown> = {}

  if ('displayName' in input) {
    updates.display_name = normalizeText(input.displayName) || (() => { throw new TeamAdminValidationError('displayName cannot be empty.') })()
  }

  let nextEmail = existing.email
  let nextAliases = existing.emailAliases

  if ('email' in input) {
    nextEmail = ensurePublicMemberEmail(input.email)
    updates.email = nextEmail
  }

  if ('emailAliases' in input) {
    nextAliases = normalizeEmailAliases(input.emailAliases, nextEmail)
    updates.email_aliases = nextAliases
  } else if ('email' in input) {
    nextAliases = normalizeEmailAliases(existing.emailAliases.filter(alias => alias !== existing.email), nextEmail)
    updates.email_aliases = nextAliases
  }

  if ('email' in input || 'emailAliases' in input) {
    await ensureUniqueMemberEmails({
      email: nextEmail,
      emailAliases: nextAliases,
      excludeMemberId: memberId
    })
  }

  if ('locationCountry' in input) {
    updates.location_country = ensureCountryCode(input.locationCountry)
  }

  if ('locationCity' in input) {
    updates.location_city = normalizeText(input.locationCity)
  }

  if ('roleTitle' in input) {
    updates.role_title = normalizeText(input.roleTitle) || (() => { throw new TeamAdminValidationError('roleTitle cannot be empty.') })()
  }

  if ('roleCategory' in input) {
    updates.role_category = ensureRoleCategory(input.roleCategory)
  }

  if ('avatarUrl' in input) {
    updates.avatar_url = normalizeText(input.avatarUrl)
  }

  if ('contactChannel' in input) {
    updates.contact_channel = ensureContactChannel(input.contactChannel)
  }

  if ('contactHandle' in input) {
    updates.contact_handle = normalizeText(input.contactHandle)
  }

  if ('relevanceNote' in input) {
    updates.relevance_note = normalizeText(input.relevanceNote)
  }

  if ('azureOid' in input) {
    updates.azure_oid = normalizeText(input.azureOid)
  }

  if ('notionUserId' in input) {
    updates.notion_user_id = normalizeText(input.notionUserId)
  }

  if ('hubspotOwnerId' in input) {
    updates.hubspot_owner_id = normalizeText(input.hubspotOwnerId)
  }

  if ('active' in input) {
    updates.active = Boolean(input.active)
  }

  return {
    existing,
    updates
  }
}

const buildAssignmentUpsertPayload = async (input: CreateAssignmentInput) => {
  const clientId = normalizeText(input.clientId)
  const memberId = normalizeText(input.memberId)

  if (!clientId) {
    throw new TeamAdminValidationError('clientId is required.')
  }

  if (!memberId) {
    throw new TeamAdminValidationError('memberId is required.')
  }

  const [client, member] = await Promise.all([getClientRecord(clientId), getMemberRecord(memberId)])

  if (!client) {
    throw new TeamAdminValidationError('Client not found.', 404)
  }

  if (!client.active) {
    throw new TeamAdminValidationError('Client is not active and cannot receive assignments.', 409)
  }

  if (!member || !member.active) {
    throw new TeamAdminValidationError('Active team member not found.', 404)
  }

  const fteAllocation = ensureFte(input.fteAllocation)
  const hoursPerMonth = ensureHours(input.hoursPerMonth, true) ?? Math.round(fteAllocation * 160)
  const startDate = ensureDateString(input.startDate, 'startDate') || currentDate()

  return {
    assignmentId: `assignment-${clientId}-${memberId}`,
    clientId,
    clientName: client.client_name ? String(client.client_name) : null,
    memberId,
    fteAllocation,
    hoursPerMonth,
    roleTitleOverride: normalizeText(input.roleTitleOverride),
    relevanceNoteOverride: normalizeText(input.relevanceNoteOverride),
    contactChannelOverride: input.contactChannelOverride ? ensureContactChannel(input.contactChannelOverride) : null,
    contactHandleOverride: normalizeText(input.contactHandleOverride),
    startDate
  }
}

const buildAssignmentUpdatePayload = async (assignmentId: string, input: UpdateAssignmentInput) => {
  const existing = await getAssignmentRecord(assignmentId)

  if (!existing) {
    throw new TeamAdminValidationError('Assignment not found.', 404)
  }

  if (!existing.active) {
    throw new TeamAdminValidationError('Only active assignments can be edited.', 409)
  }

  const updates: Record<string, unknown> = {}

  if ('fteAllocation' in input) {
    updates.fte_allocation = ensureFte(input.fteAllocation)
  }

  if ('hoursPerMonth' in input) {
    updates.hours_per_month = ensureHours(input.hoursPerMonth, true)
  } else if ('fteAllocation' in input) {
    updates.hours_per_month = Math.round(ensureFte(input.fteAllocation) * 160)
  }

  if ('roleTitleOverride' in input) {
    updates.role_title_override = normalizeText(input.roleTitleOverride)
  }

  if ('relevanceNoteOverride' in input) {
    updates.relevance_note_override = normalizeText(input.relevanceNoteOverride)
  }

  if ('contactChannelOverride' in input) {
    updates.contact_channel_override = input.contactChannelOverride ? ensureContactChannel(input.contactChannelOverride) : null
  }

  if ('contactHandleOverride' in input) {
    updates.contact_handle_override = normalizeText(input.contactHandleOverride)
  }

  return {
    existing,
    updates
  }
}

export const getAdminTeamMetadata = async (): Promise<TeamAdminMetadata> => ({
  canManageTeam: true,
  memberCrud: true,
  assignmentCrud: true,
  requiredRole: 'efeonce_admin',
  roleCategories,
  contactChannels: ['teams', 'slack', 'email'],
  activeClients: await getActiveClients()
})

export const createMember = async ({
  input,
  actorUserId,
  actorEmail
}: {
  input: CreateMemberInput
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const memberColumns = await getMemberColumns()
  const payload = await buildMemberInsertPayload(input)
  const insertColumns = ['member_id', 'display_name', 'email', 'role_title', 'role_category', 'contact_channel', 'active', 'created_at', 'updated_at']
  const insertValues = ['@memberId', '@displayName', '@email', '@roleTitle', '@roleCategory', '@contactChannel', 'TRUE', 'CURRENT_TIMESTAMP()', 'CURRENT_TIMESTAMP()']

  const params: Record<string, unknown> = {
    memberId: payload.memberId,
    displayName: payload.displayName,
    email: payload.email,
    roleTitle: payload.roleTitle,
    roleCategory: payload.roleCategory,
    contactChannel: payload.contactChannel
  }

  const optionalMemberValues: Array<[string, string, unknown]> = [
    ['email_aliases', '@emailAliases', payload.emailAliases],
    ['location_country', '@locationCountry', payload.locationCountry],
    ['location_city', '@locationCity', payload.locationCity],
    ['avatar_url', '@avatarUrl', payload.avatarUrl],
    ['contact_handle', '@contactHandle', payload.contactHandle],
    ['relevance_note', '@relevanceNote', payload.relevanceNote],
    ['azure_oid', '@azureOid', payload.azureOid],
    ['notion_user_id', '@notionUserId', payload.notionUserId],
    ['hubspot_owner_id', '@hubspotOwnerId', payload.hubspotOwnerId]
  ]

  for (const [column, placeholder, value] of optionalMemberValues) {
    if (!memberColumns.has(column) || value === undefined) {
      continue
    }

    insertColumns.push(column)
    insertValues.push(placeholder)
    params[placeholder.slice(1)] = value
  }

  await getBigQueryClient().query({
    query: `
      INSERT INTO \`${projectId}.greenhouse.team_members\` (
        ${insertColumns.join(', ')}
      )
      VALUES (
        ${insertValues.join(', ')}
      )
    `,
    params
  })

  const created = await getMemberRecord(payload.memberId)

  if (!created) {
    throw new TeamAdminValidationError('Member was created but could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: 'admin.team_member.created',
    targetEntityType: 'team_member',
    targetEntityId: created.memberId,
    payload: {
      actorEmail,
      memberId: created.memberId,
      email: created.email
    }
  })

  return created
}

export const updateMember = async ({
  memberId,
  input,
  actorUserId,
  actorEmail
}: {
  memberId: string
  input: UpdateMemberInput
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const memberColumns = await getMemberColumns()
  const { existing, updates } = await buildMemberUpdatePayload(memberId, input)
  const setClauses: string[] = []
  const params: Record<string, unknown> = { memberId }

  for (const [column, value] of Object.entries(updates)) {
    if (!writableMemberColumns.has(column) || !memberColumns.has(column)) {
      continue
    }

    const paramKey = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

    setClauses.push(`${column} = @${paramKey}`)
    params[paramKey] = value
  }

  if (setClauses.length === 0) {
    return existing
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP()')

  await getBigQueryClient().query({
    query: `
      UPDATE \`${projectId}.greenhouse.team_members\`
      SET ${setClauses.join(', ')}
      WHERE member_id = @memberId
    `,
    params
  })

  const updated = await getMemberRecord(memberId)

  if (!updated) {
    throw new TeamAdminValidationError('Updated member could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: 'admin.team_member.updated',
    targetEntityType: 'team_member',
    targetEntityId: updated.memberId,
    payload: {
      actorEmail,
      previous: existing,
      next: updated
    }
  })

  return updated
}

export const deactivateMember = async ({
  memberId,
  actorUserId,
  actorEmail
}: {
  memberId: string
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const existing = await getMemberRecord(memberId)

  if (!existing) {
    throw new TeamAdminValidationError('Team member not found.', 404)
  }

  await Promise.all([
    getBigQueryClient().query({
      query: `
        UPDATE \`${projectId}.greenhouse.team_members\`
        SET
          active = FALSE,
          updated_at = CURRENT_TIMESTAMP()
        WHERE member_id = @memberId
      `,
      params: { memberId }
    }),
    getBigQueryClient().query({
      query: `
        UPDATE \`${projectId}.greenhouse.client_team_assignments\`
        SET
          active = FALSE,
          end_date = CURRENT_DATE(),
          updated_at = CURRENT_TIMESTAMP()
        WHERE member_id = @memberId
          AND active = TRUE
      `,
      params: { memberId }
    })
  ])

  const updated = await getMemberRecord(memberId)

  if (!updated) {
    throw new TeamAdminValidationError('Deactivated member could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: 'admin.team_member.deactivated',
    targetEntityType: 'team_member',
    targetEntityId: updated.memberId,
    payload: {
      actorEmail,
      memberId: updated.memberId
    }
  })

  return updated
}

export const createAssignment = async ({
  input,
  actorUserId,
  actorEmail
}: {
  input: CreateAssignmentInput
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const payload = await buildAssignmentUpsertPayload(input)
  const existing = await getAssignmentByClientAndMember(payload.clientId, payload.memberId)

  if (existing?.active) {
    throw new TeamAdminValidationError('This member already has an active assignment for the selected account.', 409, {
      assignmentId: existing.assignmentId
    })
  }

  if (existing) {
    await getBigQueryClient().query({
      query: `
        UPDATE \`${projectId}.greenhouse.client_team_assignments\`
        SET
          fte_allocation = @fteAllocation,
          hours_per_month = @hoursPerMonth,
          role_title_override = @roleTitleOverride,
          relevance_note_override = @relevanceNoteOverride,
          contact_channel_override = @contactChannelOverride,
          contact_handle_override = @contactHandleOverride,
          start_date = @startDate,
          end_date = NULL,
          active = TRUE,
          updated_at = CURRENT_TIMESTAMP()
        WHERE assignment_id = @assignmentId
      `,
      params: payload
    })
  } else {
    await getBigQueryClient().query({
      query: `
        INSERT INTO \`${projectId}.greenhouse.client_team_assignments\` (
          assignment_id,
          client_id,
          member_id,
          fte_allocation,
          hours_per_month,
          role_title_override,
          relevance_note_override,
          contact_channel_override,
          contact_handle_override,
          active,
          start_date,
          created_at,
          updated_at
        )
        VALUES (
          @assignmentId,
          @clientId,
          @memberId,
          @fteAllocation,
          @hoursPerMonth,
          @roleTitleOverride,
          @relevanceNoteOverride,
          @contactChannelOverride,
          @contactHandleOverride,
          TRUE,
          @startDate,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
      `,
      params: payload
    })
  }

  const created = await getAssignmentRecord(payload.assignmentId)

  if (!created) {
    throw new TeamAdminValidationError('Assignment was created but could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: existing ? 'admin.team_assignment.reactivated' : 'admin.team_assignment.created',
    targetEntityType: 'team_assignment',
    targetEntityId: created.assignmentId,
    clientId: created.clientId,
    payload: {
      actorEmail,
      assignmentId: created.assignmentId,
      memberId: created.memberId
    }
  })

  return created
}

export const updateAssignment = async ({
  assignmentId,
  input,
  actorUserId,
  actorEmail
}: {
  assignmentId: string
  input: UpdateAssignmentInput
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const assignmentColumns = await getAssignmentColumns()
  const { existing, updates } = await buildAssignmentUpdatePayload(assignmentId, input)
  const setClauses: string[] = []
  const params: Record<string, unknown> = { assignmentId }

  for (const [column, value] of Object.entries(updates)) {
    if (!writableAssignmentColumns.has(column) || !assignmentColumns.has(column)) {
      continue
    }

    const paramKey = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

    setClauses.push(`${column} = @${paramKey}`)
    params[paramKey] = value
  }

  if (setClauses.length === 0) {
    return existing
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP()')

  await getBigQueryClient().query({
    query: `
      UPDATE \`${projectId}.greenhouse.client_team_assignments\`
      SET ${setClauses.join(', ')}
      WHERE assignment_id = @assignmentId
    `,
    params
  })

  const updated = await getAssignmentRecord(assignmentId)

  if (!updated) {
    throw new TeamAdminValidationError('Updated assignment could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: 'admin.team_assignment.updated',
    targetEntityType: 'team_assignment',
    targetEntityId: updated.assignmentId,
    clientId: updated.clientId,
    payload: {
      actorEmail,
      previous: existing,
      next: updated
    }
  })

  return updated
}

export const deleteAssignment = async ({
  assignmentId,
  actorUserId,
  actorEmail
}: {
  assignmentId: string
  actorUserId: string
  actorEmail: string | null
}) => {
  const projectId = getProjectId()
  const existing = await getAssignmentRecord(assignmentId)

  if (!existing) {
    throw new TeamAdminValidationError('Assignment not found.', 404)
  }

  await getBigQueryClient().query({
    query: `
      UPDATE \`${projectId}.greenhouse.client_team_assignments\`
      SET
        active = FALSE,
        end_date = CURRENT_DATE(),
        updated_at = CURRENT_TIMESTAMP()
      WHERE assignment_id = @assignmentId
    `,
    params: { assignmentId }
  })

  const updated = await getAssignmentRecord(assignmentId)

  if (!updated) {
    throw new TeamAdminValidationError('Deleted assignment could not be reloaded.', 500)
  }

  await writeAuditEvent({
    actorUserId,
    eventType: 'admin.team_assignment.deleted',
    targetEntityType: 'team_assignment',
    targetEntityId: updated.assignmentId,
    clientId: updated.clientId,
    payload: {
      actorEmail,
      assignmentId: updated.assignmentId,
      memberId: updated.memberId
    }
  })

  return updated
}
