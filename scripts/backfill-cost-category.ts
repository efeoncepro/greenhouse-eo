import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    // ─── Classify expenses by cost_category based on expense_type ───

    // payroll → direct_labor, cost_is_direct = true (member delivers to client)
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses
       SET cost_category = 'direct_labor',
           cost_is_direct = CASE WHEN member_id IS NOT NULL THEN TRUE ELSE FALSE END,
           updated_at = CURRENT_TIMESTAMP
       WHERE expense_type = 'payroll'
         AND (cost_category IS NULL OR cost_category = 'operational')`,
      []
    )

    console.log(`  payroll → direct_labor: updated`)

    // social_security → tax_social
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses
       SET cost_category = 'tax_social',
           cost_is_direct = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE expense_type = 'social_security'
         AND (cost_category IS NULL OR cost_category = 'operational')`,
      []
    )

    console.log(`  social_security → tax_social: updated`)

    // tax → tax_social
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses
       SET cost_category = 'tax_social',
           cost_is_direct = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE expense_type = 'tax'
         AND (cost_category IS NULL OR cost_category = 'operational')`,
      []
    )

    console.log(`  tax → tax_social: updated`)

    // supplier and miscellaneous stay as 'operational' (default)
    // Just ensure cost_is_direct = false for them
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses
       SET cost_is_direct = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE expense_type IN ('supplier', 'miscellaneous')
         AND cost_is_direct IS NULL`,
      []
    )

    console.log(`  supplier/miscellaneous → operational: updated`)

    // ─── Verify distribution ───
    const dist = await runGreenhousePostgresQuery<{ cost_category: string; cnt: string }>(
      `SELECT cost_category, COUNT(*) AS cnt
       FROM greenhouse_finance.expenses
       GROUP BY cost_category
       ORDER BY cnt DESC`,
      []
    )

    console.log('\n--- Cost category distribution ---')

    for (const row of dist) {
      console.log(`  ${row.cost_category ?? '(null)'}: ${row.cnt}`)
    }

    console.log('\nBackfill complete.')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
