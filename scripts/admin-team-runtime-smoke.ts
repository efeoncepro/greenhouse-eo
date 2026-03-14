import { BigQuery } from '@google-cloud/bigquery'

type ColumnRow = {
  column_name: string | null
}

type ClientRow = {
  client_id: string | null
  client_name: string | null
  active: boolean | null
}

type MemberRow = {
  member_id: string | null
  email: string | null
  email_aliases: string[] | null
  role_category: string | null
  active: boolean | null
}

type AssignmentRow = {
  assignment_id: string | null
  client_id: string | null
  member_id: string | null
  active: boolean | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
}

const requiredMemberColumns = [
  'member_id',
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
]

const requiredAssignmentColumns = [
  'assignment_id',
  'client_id',
  'member_id',
  'fte_allocation',
  'hours_per_month',
  'role_title_override',
  'relevance_note_override',
  'contact_channel_override',
  'contact_handle_override',
  'active',
  'start_date',
  'end_date'
]

const requiredAuditColumns = [
  'event_id',
  'event_type',
  'actor_user_id',
  'client_id',
  'target_entity_type',
  'target_entity_id',
  'event_payload',
  'occurred_at'
]

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim()
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")

  return hasDoubleQuotes || hasSingleQuotes ? trimmed.slice(1, -1).trim() : trimmed
}

const normalizeLegacyEscapedJson = (value: string) =>
  stripWrappingQuotes(value)
    .replace(/\r?\n/g, '')
    .replace(/^\{\\n\s*/, '{')
    .replace(/,\\n\s*"/g, ',"')
    .replace(/\\n\}$/g, '}')
    .replace(/\\n\\r\\n$/g, '')

const collapseDoubledQuotes = (value: string) => value.replace(/""/g, '"')

const extractJsonEnvelope = (value: string) => {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')

  return start >= 0 && end > start ? value.slice(start, end + 1) : value
}

const buildCredentialCandidates = (value: string) => {
  const stripped = stripWrappingQuotes(value)
  const unescaped = stripped.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\"/g, '"')
  const normalized = normalizeLegacyEscapedJson(stripped)
  const extracted = extractJsonEnvelope(stripped)
  const extractedNormalized = extractJsonEnvelope(normalized)

  return Array.from(
    new Set(
      [
        value,
        stripped,
        unescaped,
        normalized,
        collapseDoubledQuotes(stripped),
        collapseDoubledQuotes(unescaped),
        extracted,
        extractedNormalized
      ].filter(Boolean)
    )
  )
}

const parseCredentials = (candidates: string[]) => {
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)

      if (parsed && typeof parsed === 'object') {
        return parsed
      }

      if (typeof parsed === 'string') {
        const reparsed = JSON.parse(parsed)

        if (reparsed && typeof reparsed === 'object') {
          return reparsed
        }
      }
    } catch {
      // Try next candidate.
    }
  }

  return undefined
}

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT environment variable')
  }

  return projectId
}

const getGoogleCredentials = () => {
  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  const rawCredentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64?.trim()

  if (rawCredentials) {
    const parsed = parseCredentials(buildCredentialCandidates(rawCredentials))

    if (parsed) {
      return parsed
    }
  }

  if (rawCredentialsBase64) {
    const decoded = Buffer.from(stripWrappingQuotes(rawCredentialsBase64), 'base64').toString('utf8')
    const parsed = parseCredentials(buildCredentialCandidates(decoded))

    if (parsed) {
      return parsed
    }
  }

  return undefined
}

const getBigQueryClient = () =>
  new BigQuery({
    projectId: getProjectId(),
    ...(getGoogleCredentials() ? { credentials: getGoogleCredentials() } : {})
  })

const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

const assertColumns = (name: string, actual: string[], required: string[]) => {
  const missing = required.filter(column => !actual.includes(column))

  if (missing.length > 0) {
    throw new Error(`${name} is missing required columns: ${missing.join(', ')}`)
  }
}

const run = async () => {
  const projectId = getProjectId()
  const bigQuery = getBigQueryClient()

  const [memberColumns, assignmentColumns, auditColumns, activeClients, members, assignments] = await Promise.all([
    bigQuery.query({
      query: `
        SELECT column_name
        FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = 'team_members'
        ORDER BY ordinal_position
      `
    }),
    bigQuery.query({
      query: `
        SELECT column_name
        FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = 'client_team_assignments'
        ORDER BY ordinal_position
      `
    }),
    bigQuery.query({
      query: `
        SELECT column_name
        FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = 'audit_events'
        ORDER BY ordinal_position
      `
    }),
    bigQuery.query({
      query: `
        SELECT client_id, client_name, active
        FROM \`${projectId}.greenhouse.clients\`
        WHERE active = TRUE
        ORDER BY client_name
        LIMIT 10
      `
    }),
    bigQuery.query({
      query: `
        SELECT
          member_id,
          email,
          COALESCE(email_aliases, ARRAY<STRING>[]) AS email_aliases,
          role_category,
          active
        FROM \`${projectId}.greenhouse.team_members\`
        ORDER BY member_id
      `
    }),
    bigQuery.query({
      query: `
        SELECT
          assignment_id,
          client_id,
          member_id,
          active,
          start_date,
          end_date
        FROM \`${projectId}.greenhouse.client_team_assignments\`
        ORDER BY assignment_id
        LIMIT 25
      `
    })
  ])

  const memberColumnNames = (memberColumns[0] as ColumnRow[]).map(row => String(row.column_name || ''))
  const assignmentColumnNames = (assignmentColumns[0] as ColumnRow[]).map(row => String(row.column_name || ''))
  const auditColumnNames = (auditColumns[0] as ColumnRow[]).map(row => String(row.column_name || ''))

  assertColumns('greenhouse.team_members', memberColumnNames, requiredMemberColumns)
  assertColumns('greenhouse.client_team_assignments', assignmentColumnNames, requiredAssignmentColumns)
  assertColumns('greenhouse.audit_events', auditColumnNames, requiredAuditColumns)

  console.log(
    JSON.stringify(
      {
        projectId,
        memberColumns: memberColumnNames,
        assignmentColumns: assignmentColumnNames,
        auditColumns: auditColumnNames,
        activeClients: (activeClients[0] as ClientRow[]).map(row => ({
          clientId: String(row.client_id || ''),
          clientName: String(row.client_name || row.client_id || ''),
          active: Boolean(row.active)
        })),
        members: (members[0] as MemberRow[]).map(row => ({
          memberId: String(row.member_id || ''),
          email: String(row.email || ''),
          emailAliases: Array.isArray(row.email_aliases) ? row.email_aliases.filter(Boolean) : [],
          roleCategory: row.role_category || null,
          active: Boolean(row.active)
        })),
        assignments: (assignments[0] as AssignmentRow[]).map(row => ({
          assignmentId: String(row.assignment_id || ''),
          clientId: String(row.client_id || ''),
          memberId: String(row.member_id || ''),
          active: Boolean(row.active),
          startDate: toDateString(row.start_date),
          endDate: toDateString(row.end_date)
        }))
      },
      null,
      2
    )
  )
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
