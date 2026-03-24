import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('admin')

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    // Check the view exists
    const viewCheck = await runGreenhousePostgresQuery<{ viewname: string }>(
      `SELECT viewname FROM pg_views WHERE schemaname = 'greenhouse_serving' AND viewname = 'client_labor_cost_allocation'`
    )

    console.log('View exists:', viewCheck.length > 0)

    // Try querying it
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT * FROM greenhouse_serving.client_labor_cost_allocation LIMIT 5`
    )

    console.log('Rows returned:', rows.length)

    if (rows.length > 0) {
      console.log('Sample:', JSON.stringify(rows[0], null, 2))
    } else {
      console.log('No data yet (expected if no approved payroll + active assignments overlap)')
    }

    // Check column list
    const cols = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'greenhouse_serving' AND table_name = 'client_labor_cost_allocation'
       ORDER BY ordinal_position`
    )

    console.log('Columns:', cols.map(c => c.column_name).join(', '))
  } finally {
    await closeGreenhousePostgres()
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
