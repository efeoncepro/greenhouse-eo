import process from 'node:process'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  const checks = [
    { label: 'compensation_versions', q: 'SELECT COUNT(*) AS cnt FROM greenhouse_payroll.compensation_versions' },
    { label: 'payroll_periods', q: 'SELECT COUNT(*) AS cnt FROM greenhouse_hr.payroll_periods' },
    { label: 'payroll_entries', q: 'SELECT COUNT(*) AS cnt FROM greenhouse_hr.payroll_entries' },
    { label: 'members', q: 'SELECT COUNT(*) AS cnt FROM greenhouse_core.members WHERE active = TRUE' }
  ]

  for (const { label, q } of checks) {
    try {
      const [row] = await runGreenhousePostgresQuery<{ cnt: string }>(q)
      console.log(`${label.padEnd(30)} ${row?.cnt ?? '?'} rows`)
    } catch (e) {
      console.log(`${label.padEnd(30)} ✗ ${(e as Error).message.slice(0, 60)}`)
    }
  }

  // Check what pgGetApplicableCompensationVersionsForPeriod returns
  console.log('\n--- getApplicableCompensationVersionsForPeriod ---')
  try {
    const { getApplicableCompensationVersionsForPeriod } = await import('@/lib/payroll/get-compensation')
    const result = await getApplicableCompensationVersionsForPeriod('2026-03-01', '2026-03-31')
    console.log(`Found ${result.length} versions`)
    for (const r of result.slice(0, 5)) {
      console.log(`  ${String((r as Record<string, unknown>).memberName).padEnd(25)} ${(r as Record<string, unknown>).currency} base:${(r as Record<string, unknown>).baseSalary}`)
    }
  } catch (e) {
    console.log(`✗ ${(e as Error).message.slice(0, 100)}`)
  }

  await closeGreenhousePostgres()
}

main()
