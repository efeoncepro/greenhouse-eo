import process from 'node:process'
import Module from 'node:module'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

// Allow operational scripts to reuse server-only modules from the runtime.
type ModuleLoad = (request: string, parent: NodeModule | null, isMain: boolean) => unknown
type ModuleWithLoad = typeof Module & { _load: ModuleLoad }

const moduleWithLoad = Module as ModuleWithLoad
const originalLoad = moduleWithLoad._load

moduleWithLoad._load = function patchedLoad(request: string, parent: NodeModule | null, isMain: boolean) {
  if (request === 'server-only') {
    return {}
  }

  return originalLoad.apply(this, [request, parent, isMain])
}

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('admin')

const BILLABLE_CLIENT_ID = 'hubspot-company-30825221458'

const MEMBER_START_DATES = [
  { memberId: 'daniela-ferreira', startDate: '2024-12-01' },
  { memberId: 'melkin-hernandez', startDate: '2025-08-01' },
  { memberId: 'andres-carlosama', startDate: '2025-08-01' }
] as const

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')
  const { computeClientLaborCosts } = await import('@/lib/finance/payroll-cost-allocation')
  const { computeClientEconomicsSnapshots, getClientEconomics } = await import('@/lib/finance/postgres-store-intelligence')
  const { syncDailyUsdClpExchangeRate } = await import('@/lib/finance/exchange-rates')

  try {
    for (const row of MEMBER_START_DATES) {
      await runGreenhousePostgresQuery(
        `
          UPDATE greenhouse_core.client_team_assignments
          SET start_date = $3::date,
              updated_at = CURRENT_TIMESTAMP
          WHERE member_id = $1
            AND client_id = $2
            AND (start_date IS NULL OR start_date > $3::date)
        `,
        [row.memberId, BILLABLE_CLIENT_ID, row.startDate]
      )
    }

    const assignments = await runGreenhousePostgresQuery(
      `
        SELECT assignment_id, member_id, client_id, fte_allocation, start_date, end_date
        FROM greenhouse_core.client_team_assignments
        WHERE client_id = $1
          AND member_id = ANY($2::text[])
        ORDER BY member_id, assignment_id
      `,
      [BILLABLE_CLIENT_ID, MEMBER_START_DATES.map(row => row.memberId)]
    )

    const exchangeRateSync = await syncDailyUsdClpExchangeRate('2026-02-28')
    const labor = await computeClientLaborCosts(2026, 2)
    const snapshots = await computeClientEconomicsSnapshots(
      2026,
      2,
      'backfill-february-billable-assignments'
    )
    const skySnapshot = await getClientEconomics(BILLABLE_CLIENT_ID, 2026, 2)

    console.log(JSON.stringify({
      assignments,
      exchangeRateSync,
      labor,
      snapshots,
      skySnapshot
    }, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
