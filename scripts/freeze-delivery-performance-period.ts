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

const parsePeriodArgs = () => {
  const [yearArg, monthArg] = process.argv.slice(2)
  const now = new Date()
  const year = yearArg ? Number(yearArg) : now.getFullYear()
  const month = monthArg ? Number(monthArg) : now.getMonth() + 1

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Usage: pnpm exec tsx scripts/freeze-delivery-performance-period.ts [year] [month]')
  }

  return { year, month }
}

const main = async () => {
  const { year, month } = parsePeriodArgs()

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { freezeDeliveryTaskMonthlySnapshot, materializeMonthlySnapshots } = await import('../src/lib/ico-engine/materialize')
  const { agencyPerformanceReportProjection } = await import('../src/lib/sync/projections/agency-performance-report')
  const { closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  console.log(`=== Freeze Delivery Performance Period ${year}-${String(month).padStart(2, '0')} ===\n`)

  const taskSnapshot = await freezeDeliveryTaskMonthlySnapshot(year, month)
  const materialization = await materializeMonthlySnapshots(year, month)

  const agencyProjectionResult = await agencyPerformanceReportProjection.refresh(
    { entityType: 'agency_performance_report', entityId: 'agency' },
    { reportScope: 'agency', periodYear: year, periodMonth: month }
  )

  console.log(JSON.stringify({
    periodYear: year,
    periodMonth: month,
    taskSnapshot,
    materialization,
    agencyProjectionResult
  }, null, 2))

  await closeGreenhousePostgres().catch(() => {})
}

main().catch(error => {
  console.error('Delivery performance period freeze failed:', error)
  process.exit(1)
})
