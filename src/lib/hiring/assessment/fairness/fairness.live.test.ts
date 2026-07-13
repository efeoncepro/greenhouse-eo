import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('assessment fairness — live PG (TASK-1365)', () => {
  it('la view corre y no expone columnas individuales', async () => {
    const columns = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'greenhouse_hiring' AND table_name = 'assessment_fairness'
       ORDER BY ordinal_position`,
    )

    expect(columns.map((row) => row.column_name)).toEqual([
      'cohort_month',
      'dimension_key',
      'category_key',
      'stage',
      'template_id',
      'eligible_count',
      'advanced_count',
    ])

    await expect(
      runGreenhousePostgresQuery(
        `SELECT cohort_month, dimension_key, category_key, stage, template_id,
                eligible_count, advanced_count
         FROM greenhouse_hiring.assessment_fairness
         WHERE template_id = $1
         LIMIT 1`,
        ['atpl-task-1365-nonexistent'],
      ),
    ).resolves.toEqual([])
  })
})
