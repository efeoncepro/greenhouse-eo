import process from 'node:process'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  // 1. Check compensation versions
  console.log('=== Compensation Versions ===')
  const comps = await runGreenhousePostgresQuery<{
    version_id: string; member_id: string; display_name: string;
    currency: string; base_salary: string; effective_from: string; effective_to: string | null
  }>(`
    SELECT cv.version_id, cv.member_id, m.display_name, cv.currency,
           cv.base_salary, cv.effective_from::text, cv.effective_to::text
    FROM greenhouse_core.compensation_versions cv
    JOIN greenhouse_core.members m ON m.member_id = cv.member_id
    WHERE m.active = TRUE
    ORDER BY m.display_name, cv.effective_from DESC
  `)

  if (comps.length === 0) {
    console.log('  ✗ No compensation versions found in greenhouse_core.compensation_versions')
  } else {
    for (const c of comps) {
      console.log(`  ${c.display_name.padEnd(25)} ${c.currency} ${String(c.base_salary).padStart(10)} from:${c.effective_from} to:${c.effective_to ?? 'null'}`)
    }
  }

  // 2. Check if maybe they're in BigQuery only
  console.log('\n=== Payroll Periods ===')
  const periods = await runGreenhousePostgresQuery<{
    period_id: string; status: string; year: string; month: string
  }>(`
    SELECT period_id, status, period_year::text AS year, period_month::text AS month
    FROM greenhouse_hr.payroll_periods
    ORDER BY period_year DESC, period_month DESC
    LIMIT 5
  `).catch(() => [])

  if (periods.length === 0) {
    console.log('  ✗ No payroll periods found in greenhouse_hr.payroll_periods')
  } else {
    for (const p of periods) {
      console.log(`  ${p.period_id.padEnd(15)} ${p.year}-${p.month.padStart(2, '0')} status:${p.status}`)
    }
  }

  // 3. Check what getApplicableCompensationVersionsForPeriod would return
  console.log('\n=== Testing getApplicableCompensationVersionsForPeriod ===')
  try {
    const { getApplicableCompensationVersionsForPeriod } = await import('@/lib/payroll/get-compensation')
    const result = await getApplicableCompensationVersionsForPeriod('2026-03-01', '2026-03-31')
    console.log(`  Found ${result.length} applicable versions for 2026-03`)
    for (const r of result) {
      console.log(`  ${(r as any).memberName?.padEnd(25) ?? 'unknown'} ${(r as any).currency} base:${(r as any).baseSalary}`)
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err instanceof Error ? err.message : err}`)
  }

  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')
  await closeGreenhousePostgres()
}

main()
