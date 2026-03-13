import { execSync } from 'node:child_process'

import { getPreferredEfeonceMicrosoftEmail } from '../src/lib/tenant/internal-email-aliases'

type InternalUserRow = {
  user_id: string
  email: string
  full_name: string
  microsoft_email: string | null
  auth_mode: string
  active: boolean | string | null
  status: string
}

type BigQueryField = {
  name: string
}

type BigQueryResponse = {
  schema?: {
    fields?: BigQueryField[]
  }
  rows?: Array<{
    f: Array<{ v: string | null }>
  }>
}

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const shouldWrite = process.argv.includes('--write')
const serviceAccountEmail = 'greenhouse-portal@efeonce-group.iam.gserviceaccount.com'

const getAccessToken = () => {
  if (process.env.GCP_ACCESS_TOKEN?.trim()) {
    return process.env.GCP_ACCESS_TOKEN.trim()
  }

  return execSync(`gcloud auth print-access-token --account ${serviceAccountEmail}`, {
    stdio: ['ignore', 'pipe', 'pipe']
  })
    .toString()
    .trim()
}

const runQuery = async (query: string) => {
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      useLegacySql: false
    })
  })

  if (!response.ok) {
    throw new Error(`BigQuery query failed with status ${response.status}: ${await response.text()}`)
  }

  return (await response.json()) as BigQueryResponse
}

const mapRows = <TRow extends Record<string, unknown>>(response: BigQueryResponse) => {
  const fieldNames = response.schema?.fields?.map(field => field.name) || []

  return (response.rows || []).map(row => {
    const record = {} as Record<string, unknown>

    row.f.forEach((fieldValue, index) => {
      record[fieldNames[index] || `field_${index}`] = fieldValue.v
    })

    return record as TRow
  })
}

const getInternalUsersMissingMicrosoftEmail = async () => {
  const response = await runQuery(`
    SELECT
      cu.user_id,
      cu.email,
      cu.full_name,
      cu.microsoft_email,
      cu.auth_mode,
      cu.active,
      cu.status
    FROM \`${projectId}.greenhouse.client_users\` AS cu
    WHERE cu.tenant_type = 'efeonce_internal'
      AND cu.active = TRUE
      AND cu.status IN ('active', 'invited')
      AND cu.microsoft_email IS NULL
    ORDER BY cu.full_name
  `)

  return mapRows<InternalUserRow>(response).map(row => ({
    ...row,
    microsoft_email: typeof row.microsoft_email === 'string' ? row.microsoft_email : null,
    active: String(row.active).toLowerCase() === 'true'
  }))
}

const escapeSqlString = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const updateMicrosoftEmail = async ({ userId, microsoftEmail }: { userId: string; microsoftEmail: string }) => {
  await runQuery(`
    UPDATE \`${projectId}.greenhouse.client_users\`
    SET
      microsoft_email = '${escapeSqlString(microsoftEmail)}',
      updated_at = CURRENT_TIMESTAMP()
    WHERE user_id = '${escapeSqlString(userId)}'
  `)
}

const main = async () => {
  const rows = await getInternalUsersMissingMicrosoftEmail()

  if (rows.length === 0) {
    console.log('No active internal Efeonce users are missing microsoft_email.')

    return
  }

  const plannedUpdates = rows
    .map(row => ({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      suggestedMicrosoftEmail: getPreferredEfeonceMicrosoftEmail({
        email: row.email,
        fullName: row.full_name,
        microsoftEmail: row.microsoft_email
      })
    }))
    .filter(row => Boolean(row.suggestedMicrosoftEmail))

  console.table(plannedUpdates)

  if (!shouldWrite) {
    console.log('Dry run only. Re-run with --write to persist microsoft_email values.')

    return
  }

  for (const update of plannedUpdates) {
    await updateMicrosoftEmail({
      userId: update.userId,
      microsoftEmail: update.suggestedMicrosoftEmail!
    })
  }

  console.log(`Updated ${plannedUpdates.length} internal Efeonce users.`)
}

main().catch(error => {
  console.error('Unable to backfill internal Efeonce Microsoft aliases.', error)
  process.exit(1)
})
