import Module from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type PatchedModule = typeof Module & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown
}

const patchedModule = Module as PatchedModule
const originalLoad = patchedModule._load

patchedModule._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {}
  }

  return originalLoad.apply(this, [request, parent, isMain])
}

type CountRow = {
  total_tasks?: unknown
  with_assignee_source?: unknown
  with_assignee_member?: unknown
  with_assignee_member_ids?: unknown
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value: unknown }).value)
  }

  return 0
}

const parsePeriodArgs = () => {
  const [yearArg, monthArg] = process.argv.slice(2)
  const now = new Date()
  const year = yearArg ? Number(yearArg) : now.getFullYear()
  const month = monthArg ? Number(monthArg) : now.getMonth() + 1

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Usage: pnpm exec tsx scripts/remediate-ico-assignee-attribution.ts [year] [month]')
  }

  return { year, month }
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const { year, month } = parsePeriodArgs()
  const { getBigQueryClient, getBigQueryProjectId } = await import('../src/lib/bigquery')
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const logCounts = async (label: string) => {
    const [rows] = await bq.query({
      query: `
        SELECT
          COUNT(*) AS total_tasks,
          COUNTIF(assignee_source_id IS NOT NULL) AS with_assignee_source,
          COUNTIF(assignee_member_id IS NOT NULL) AS with_assignee_member,
          COUNTIF(assignee_member_ids IS NOT NULL AND ARRAY_LENGTH(assignee_member_ids) > 0) AS with_assignee_member_ids
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      `
    })

    const row = (rows[0] ?? {}) as CountRow

    console.log(`${label}: total=${toNumber(row.total_tasks)}, source=${toNumber(row.with_assignee_source)}, member=${toNumber(row.with_assignee_member)}, member_ids=${toNumber(row.with_assignee_member_ids)}`)
  }

  console.log(`=== Remediate ICO assignee attribution for ${year}-${String(month).padStart(2, '0')} ===\n`)
  await logCounts('Before conformed sync')

  const { syncNotionToConformed } = await import('../src/lib/sync/sync-notion-conformed')
  const syncResult = await syncNotionToConformed()

  console.log('\nConformed sync result:')
  console.log(JSON.stringify(syncResult, null, 2))

  await logCounts('After conformed sync')

  const { materializeMonthlySnapshots } = await import('../src/lib/ico-engine/materialize')
  const materializeResult = await materializeMonthlySnapshots(year, month)

  console.log('\nICO materialization result:')
  console.log(JSON.stringify(materializeResult, null, 2))

  const [memberRows] = await bq.query({
    query: `
      SELECT COUNT(*) AS total_rows, COUNT(DISTINCT member_id) AS distinct_members
      FROM \`${projectId}.ico_engine.metrics_by_member\`
      WHERE period_year = @year AND period_month = @month
    `,
    params: { year, month }
  })

  console.log('\nmetrics_by_member verification:')
  console.log(JSON.stringify(memberRows, null, 2))

  const { closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  await closeGreenhousePostgres().catch(() => {})
}

main().catch(error => {
  console.error('ICO assignee remediation failed:', error)
  process.exit(1)
})
