import { BigQuery } from '@google-cloud/bigquery'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const datasetId = process.env.GREENHOUSE_BIGQUERY_DATASET || 'greenhouse'
const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'

const bigQuery = new BigQuery({ projectId })

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') { const t = value.trim();



return t || null }

  if (typeof value === 'object' && value && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  return String(value)
}

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const s = toNullableString(value)
  const n = s ? Number(s) : Number.NaN

  return Number.isFinite(n) ? n : fallback
}

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const n = value.trim().toLowerCase()

    if (n === 'true') return true
    if (n === 'false') return false
  }

  return fallback
}

const backfillAssignments = async () => {
  const [rows] = await bigQuery.query({
    query: `
      SELECT
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
        end_date,
        created_at,
        updated_at
      FROM \`${projectId}.${datasetId}.client_team_assignments\`
    `,
    location: bigQueryLocation
  })

  let backfilled = 0
  let skipped = 0

  for (const row of rows as Record<string, unknown>[]) {
    const assignmentId = toNullableString(row.assignment_id)
    const clientId = toNullableString(row.client_id)
    const memberId = toNullableString(row.member_id)

    if (!assignmentId || !clientId || !memberId) {
      skipped++
      continue
    }

    try {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_core.client_team_assignments (
          assignment_id, client_id, member_id, fte_allocation, hours_per_month,
          role_title_override, relevance_note_override, contact_channel_override,
          contact_handle_override, active, start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12::date,
          COALESCE($13::timestamptz, CURRENT_TIMESTAMP),
          COALESCE($14::timestamptz, CURRENT_TIMESTAMP))
        ON CONFLICT (assignment_id) DO UPDATE SET
          client_id = EXCLUDED.client_id,
          member_id = EXCLUDED.member_id,
          fte_allocation = EXCLUDED.fte_allocation,
          hours_per_month = EXCLUDED.hours_per_month,
          role_title_override = EXCLUDED.role_title_override,
          relevance_note_override = EXCLUDED.relevance_note_override,
          contact_channel_override = EXCLUDED.contact_channel_override,
          contact_handle_override = EXCLUDED.contact_handle_override,
          active = EXCLUDED.active,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          updated_at = EXCLUDED.updated_at`,
        [
          assignmentId,
          clientId,
          memberId,
          toNumber(row.fte_allocation, 0),
          row.hours_per_month !== null && row.hours_per_month !== undefined ? toNumber(row.hours_per_month) : null,
          toNullableString(row.role_title_override),
          toNullableString(row.relevance_note_override),
          toNullableString(row.contact_channel_override),
          toNullableString(row.contact_handle_override),
          toBoolean(row.active, true),
          toNullableString(row.start_date),
          toNullableString(row.end_date),
          toNullableString(row.created_at),
          toNullableString(row.updated_at)
        ]
      )
      backfilled++
    } catch (error) {
      console.warn(`Skipping assignment ${assignmentId}:`, error instanceof Error ? error.message : error)
      skipped++
    }
  }

  return { backfilled, skipped }
}

const main = async () => {
  const result = await backfillAssignments()

  console.log(JSON.stringify({ backfilled: result }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
