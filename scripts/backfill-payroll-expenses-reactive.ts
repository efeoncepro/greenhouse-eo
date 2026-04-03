import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

type PeriodRow = {
  period_id: string
  year: number | string
  month: number | string
}

const parseTargetPeriods = () =>
  process.argv
    .slice(2)
    .flatMap(arg => {
      if (arg.startsWith('--period=')) {
        return [arg.slice('--period='.length).trim()]
      }

      return arg.trim() ? [arg.trim()] : []
    })
    .filter(Boolean)

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')
  const { materializePayrollExpensesForExportedPeriod } = await import('@/lib/finance/payroll-expense-reactive')

  try {
    const explicitPeriods = parseTargetPeriods()

    const periodRows = explicitPeriods.length > 0
      ? await runGreenhousePostgresQuery<PeriodRow>(
          `
            SELECT period_id, year, month
            FROM greenhouse_payroll.payroll_periods
            WHERE period_id = ANY($1)
            ORDER BY year ASC, month ASC
          `,
          [explicitPeriods]
        )
      : await runGreenhousePostgresQuery<PeriodRow>(
          `
            SELECT p.period_id, p.year, p.month
            FROM greenhouse_payroll.payroll_periods p
            WHERE p.status = 'exported'
              AND (
                NOT EXISTS (
                  SELECT 1
                  FROM greenhouse_finance.expenses e
                  WHERE e.payroll_period_id = p.period_id
                    AND e.expense_type = 'social_security'
                )
                OR EXISTS (
                  SELECT 1
                  FROM greenhouse_payroll.payroll_entries pe
                  WHERE pe.period_id = p.period_id
                    AND NOT EXISTS (
                      SELECT 1
                      FROM greenhouse_finance.expenses e2
                      WHERE e2.payroll_entry_id = pe.entry_id
                    )
                )
              )
            ORDER BY p.year ASC, p.month ASC
          `
        )

    const results = []

    for (const period of periodRows) {
      const result = await materializePayrollExpensesForExportedPeriod({
        periodId: String(period.period_id),
        year: Number(period.year),
        month: Number(period.month)
      })

      results.push({
        periodId: String(period.period_id),
        year: Number(period.year),
        month: Number(period.month),
        ...result
      })
    }

    console.log(JSON.stringify({
      processed: results.length,
      periods: results
    }, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
