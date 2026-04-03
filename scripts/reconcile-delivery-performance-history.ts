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
    throw new Error('Usage: pnpm exec tsx scripts/reconcile-delivery-performance-history.ts [year] [month]')
  }

  return { year, month }
}

const main = async () => {
  const { year, month } = parsePeriodArgs()

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { reconcileHistoricalPerformancePeriod } = await import('../src/lib/ico-engine/historical-reconciliation')
  const { closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  console.log(`=== Reconcile Delivery Performance History ${year}-${String(month).padStart(2, '0')} ===\n`)

  const result = await reconcileHistoricalPerformancePeriod(year, month)

  console.log(JSON.stringify(result, null, 2))

  await closeGreenhousePostgres().catch(() => {})
}

main().catch(error => {
  console.error('Delivery performance reconciliation failed:', error)
  process.exit(1)
})
