import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type BigQueryDepartmentRow = {
  department_id: string | null
  name: string | null
  description: string | null
  parent_department_id: string | null
  head_member_id: string | null
  business_unit: string | null
  active: boolean | null
  sort_order: number | string | null
  created_at: string | null
  updated_at: string | null
}

const toStr = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toStr((value as { value?: unknown }).value)
  }

  return String(value).trim() || null
}

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') return Number(value) || 0

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toNum((value as { value?: unknown }).value)
  }

  return 0
}

const toBool = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true'

  return Boolean(value)
}

const toTs = (value: unknown) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value || null
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toTs((value as { value?: unknown }).value)
  }

  return null
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('GCP_PROJECT or GOOGLE_CLOUD_PROJECT must be configured.')
  }

  const bigQuery = new BigQuery({ projectId })

  try {
    const [departmentRows] = await bigQuery.query({
      query: `
        SELECT
          department_id,
          name,
          description,
          parent_department_id,
          head_member_id,
          business_unit,
          active,
          sort_order,
          created_at,
          updated_at
        FROM \`${projectId}.greenhouse.departments\`
        ORDER BY sort_order ASC, name ASC
      `
    })

    console.log(`BigQuery departments: ${departmentRows.length}`)

    for (const rawRow of departmentRows as BigQueryDepartmentRow[]) {
      const departmentId = toStr(rawRow.department_id)
      const name = toStr(rawRow.name)

      if (!departmentId || !name) {
        console.warn('Skipping department row without department_id/name:', rawRow)
        continue
      }

      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_core.departments (
            department_id,
            name,
            description,
            parent_department_id,
            head_member_id,
            business_unit,
            active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, CURRENT_TIMESTAMP),COALESCE($10::timestamptz, CURRENT_TIMESTAMP))
          ON CONFLICT (department_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            parent_department_id = EXCLUDED.parent_department_id,
            head_member_id = EXCLUDED.head_member_id,
            business_unit = EXCLUDED.business_unit,
            active = EXCLUDED.active,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          departmentId,
          name,
          toStr(rawRow.description),
          toStr(rawRow.parent_department_id),
          toStr(rawRow.head_member_id),
          toStr(rawRow.business_unit),
          toBool(rawRow.active ?? true),
          toNum(rawRow.sort_order),
          toTs(rawRow.created_at),
          toTs(rawRow.updated_at)
        ]
      )
    }

    console.log(`Upserted departments into PostgreSQL: ${departmentRows.length}`)
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('HR departments backfill failed:', error)
  process.exit(1)
})
