import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const EXPECTED_COLUMNS = [
  'cohort_month',
  'dimension_key',
  'category_key',
  'stage',
  'template_id',
  'eligible_count',
  'advanced_count',
]

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  // This smoke is intended to run after `pnpm pg:connect`; keep Google credentials out of
  // the test path and exercise the exact local proxy connection used by migration tooling.
  process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME = ''
  process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
  process.env.GREENHOUSE_POSTGRES_PORT = process.env.GREENHOUSE_POSTGRES_PORT || '15432'
  process.env.GREENHOUSE_POSTGRES_SSL = 'false'

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('../../src/lib/postgres/client')

  try {
    const columns = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'greenhouse_hiring' AND table_name = 'assessment_fairness'
       ORDER BY ordinal_position`,
    )

    const actualColumns = columns.map((row) => row.column_name)

    if (JSON.stringify(actualColumns) !== JSON.stringify(EXPECTED_COLUMNS)) {
      throw new Error(`assessment_fairness column contract drift: ${JSON.stringify(actualColumns)}`)
    }

    const ratios = await runGreenhousePostgresQuery<{
      current_ratio: string | number
      previous_ratio: string | number
      ratio_drift: string | number
    }>(
      `WITH synthetic(period, category_key, eligible_count, advanced_count) AS (
         VALUES
           ('current', 'group_a', 20::numeric, 10::numeric),
           ('current', 'group_b', 20::numeric, 5::numeric),
           ('previous', 'group_a', 20::numeric, 10::numeric),
           ('previous', 'group_b', 20::numeric, 9::numeric)
       ), rates AS (
         SELECT period, category_key, advanced_count / eligible_count AS selection_rate
         FROM synthetic
         WHERE eligible_count >= 10
       ), reference_rates AS (
         SELECT period, MAX(selection_rate) AS reference_rate
         FROM rates
         GROUP BY period
       ), impact AS (
         SELECT rates.period, rates.category_key,
                rates.selection_rate / NULLIF(reference_rates.reference_rate, 0) AS impact_ratio
         FROM rates
         JOIN reference_rates USING (period)
       )
       SELECT
         MIN(impact_ratio) FILTER (WHERE period = 'current') AS current_ratio,
         MIN(impact_ratio) FILTER (WHERE period = 'previous') AS previous_ratio,
         MIN(impact_ratio) FILTER (WHERE period = 'current')
           - MIN(impact_ratio) FILTER (WHERE period = 'previous') AS ratio_drift
       FROM impact`,
    )

    const row = ratios[0]

    if (!row || Number(row.current_ratio) !== 0.5 || Number(row.previous_ratio) !== 0.9 || Number(row.ratio_drift) !== -0.4) {
      throw new Error(`synthetic four-fifths smoke failed: ${JSON.stringify(row)}`)
    }

    await runGreenhousePostgresQuery(
      `SELECT cohort_month, dimension_key, category_key, stage, template_id,
              eligible_count, advanced_count
       FROM greenhouse_hiring.assessment_fairness
       WHERE template_id = $1
       LIMIT 1`,
      ['atpl-task-1365-nonexistent'],
    )

    console.log('TASK-1365 fairness DB smoke PASS: aggregate-only view + ratio=0.5 + drift=-0.4')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'TASK-1365 fairness smoke failed')
  process.exitCode = 1
})
