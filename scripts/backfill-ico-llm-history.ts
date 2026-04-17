import { query } from '@/lib/db'
import { materializeAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-worker'

interface ReplayRunRow extends Record<string, unknown> {
  run_id: string
  space_id: string | null
  period_year: number
  period_month: number
  status: string
  signals_enriched: number
  started_at: string
  completed_at: string | null
}

const getArgValue = (name: string) => {
  const index = process.argv.findIndex(arg => arg === `--${name}`)

  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`)

const parseRequiredNumber = (name: string, fallback: number) => {
  const raw = getArgValue(name)
  const candidate = raw ? Number(raw) : fallback

  if (!Number.isInteger(candidate)) {
    throw new Error(`Invalid --${name} value: ${raw}`)
  }

  return candidate
}

const main = async () => {
  const now = new Date()
  const defaultYear = now.getUTCFullYear()
  const defaultMonth = now.getUTCMonth() + 1
  const periodYear = parseRequiredNumber('year', defaultYear)
  const periodMonth = parseRequiredNumber('month', defaultMonth)
  const from = getArgValue('from') ?? `${periodYear}-${String(periodMonth).padStart(2, '0')}-01T00:00:00.000Z`
  const to = getArgValue('to') ?? now.toISOString()
  const dryRun = hasFlag('dry-run')

  const runs = await query<ReplayRunRow>(
    `
      SELECT
        run_id,
        space_id,
        period_year,
        period_month,
        status,
        signals_enriched,
        started_at::text AS started_at,
        completed_at::text AS completed_at
      FROM greenhouse_serving.ico_ai_enrichment_runs
      WHERE period_year = $1
        AND period_month = $2
        AND signals_enriched > 0
        AND COALESCE(completed_at, started_at) >= $3::timestamptz
        AND COALESCE(completed_at, started_at) <= $4::timestamptz
      ORDER BY COALESCE(completed_at, started_at) ASC, space_id NULLS FIRST, run_id ASC
    `,
    [periodYear, periodMonth, from, to]
  )

  console.log(
    `[backfill-ico-llm-history] period=${periodYear}-${String(periodMonth).padStart(2, '0')} ` +
      `window=${from}..${to} runs=${runs.length} dryRun=${dryRun}`
  )

  if (runs.length === 0) {
    return
  }

  let recovered = 0
  let skippedRetention = 0
  let failed = 0

  for (const run of runs) {
    const asOfTime = run.completed_at ?? run.started_at
    const scopeLabel = run.space_id ? `space=${run.space_id}` : 'scope=global'

    console.log(
      `[backfill-ico-llm-history] replay ${run.run_id} ${scopeLabel} asOf=${asOfTime} enriched=${run.signals_enriched}`
    )

    if (dryRun) {
      continue
    }

    try {
      const result = await materializeAiLlmEnrichments({
        periodYear: run.period_year,
        periodMonth: run.period_month,
        spaceId: run.space_id,
        triggerEventId: run.run_id,
        triggerType: 'historical_backfill',
        asOfTime,
        historyOnly: true
      })

      recovered += result.succeeded

      console.log(
        `[backfill-ico-llm-history] ok ${run.run_id} -> succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped}`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes('Invalid time travel timestamp')) {
        skippedRetention += 1
        console.warn(`[backfill-ico-llm-history] skipped retention boundary for ${run.run_id}: ${message}`)
        continue
      }

      failed += 1
      console.error(`[backfill-ico-llm-history] failed ${run.run_id}: ${message}`)
    }
  }

  console.log(
    `[backfill-ico-llm-history] done recovered=${recovered} skippedRetention=${skippedRetention} failed=${failed}`
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
