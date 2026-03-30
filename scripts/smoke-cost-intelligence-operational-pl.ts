import { createRequire } from 'node:module'
import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const padMonth = (value: number) => String(value).padStart(2, '0')

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { publishOutboxEvent } = await import('@/lib/sync/publish-event')
  const { ensureReactiveSchema, processReactiveEvents } = await import('@/lib/sync/reactive-consumer')
  const { AGGREGATE_TYPES, EVENT_TYPES } = await import('@/lib/sync/event-catalog')

  try {
    const candidateRows = await runGreenhousePostgresQuery<{
      period_year: number
      period_month: number
    }>(
      `
        WITH candidates AS (
          SELECT
            EXTRACT(YEAR FROM i.invoice_date)::int AS period_year,
            EXTRACT(MONTH FROM i.invoice_date)::int AS period_month
          FROM greenhouse_finance.income i
          WHERE COALESCE(i.client_id, i.client_profile_id) IS NOT NULL

          UNION ALL

          SELECT
            clca.period_year,
            clca.period_month
          FROM greenhouse_serving.client_labor_cost_allocation clca

          UNION ALL

          SELECT
            ca.period_year,
            ca.period_month
          FROM greenhouse_finance.cost_allocations ca
        )
        SELECT period_year, period_month
        FROM candidates
        WHERE period_year IS NOT NULL
          AND period_month BETWEEN 1 AND 12
        GROUP BY period_year, period_month
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      `
    )

    const candidate = candidateRows[0]
    const now = new Date()
    const year = Number(process.env.COST_INTELLIGENCE_SMOKE_YEAR || candidate?.period_year || now.getFullYear())
    const month = Number(process.env.COST_INTELLIGENCE_SMOKE_MONTH || candidate?.period_month || now.getMonth() + 1)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid smoke period. Use COST_INTELLIGENCE_SMOKE_YEAR and COST_INTELLIGENCE_SMOKE_MONTH with YYYY / MM values.')
    }

    const periodId = `${year}-${padMonth(month)}`
    const smokeRunId = `task069-smoke-${Date.now()}`
    const aggregateId = `smoke-income-${periodId}-${smokeRunId}`

    const eventId = await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.income,
      aggregateId,
      eventType: EVENT_TYPES.financeIncomeUpdated,
      payload: {
        incomeId: aggregateId,
        clientId: 'smoke-client',
        periodId,
        periodYear: year,
        periodMonth: month,
        invoiceDate: `${periodId}-01`,
        smokeRunId,
        source: 'task-069-smoke'
      }
    })

    await runGreenhousePostgresQuery(
      `
        UPDATE greenhouse_sync.outbox_events
        SET status = 'published',
            published_at = NOW(),
            occurred_at = TIMESTAMPTZ '2000-01-01 00:00:00+00'
        WHERE event_id = $1
      `,
      [eventId]
    )

    await ensureReactiveSchema()
    const reactive = await processReactiveEvents({ domain: 'cost_intelligence', batchSize: 5 })

    const snapshots = await runGreenhousePostgresQuery<{
      scope_type: string
      scope_id: string
      scope_name: string
      gross_margin_pct: number | string | null
      materialized_at: string
    }>(
      `
        SELECT
          scope_type,
          scope_id,
          scope_name,
          gross_margin_pct,
          materialized_at::text AS materialized_at
        FROM greenhouse_serving.operational_pl_snapshots
        WHERE period_year = $1
          AND period_month = $2
        ORDER BY scope_type ASC, revenue_clp DESC
        LIMIT 10
      `,
      [year, month]
    )

    const reactiveLog = await runGreenhousePostgresQuery<{
      event_id: string
      handler: string
      result: string | null
      last_error: string | null
      reacted_at: string
    }>(
      `
        SELECT
          event_id,
          handler,
          result,
          last_error,
          reacted_at::text AS reacted_at
        FROM greenhouse_sync.outbox_reactive_log
        WHERE event_id = $1
          AND handler = $2
        ORDER BY reacted_at DESC
        LIMIT 1
      `,
      [eventId, 'operational_pl:finance.income.updated']
    )

    const publishedEvents = await runGreenhousePostgresQuery<{
      event_type: string
      aggregate_id: string
    }>(
      `
        SELECT event_type, aggregate_id
        FROM greenhouse_sync.outbox_events
        WHERE event_type = 'accounting.pl_snapshot.materialized'
          AND payload_json ->> 'periodId' = $1
        ORDER BY occurred_at DESC
        LIMIT 10
      `,
      [periodId]
    )

    const output = {
      smokeRunId,
      eventId,
      periodId,
      reactive,
      reactiveLog: reactiveLog[0] || null,
      snapshotCount: snapshots.length,
      snapshots,
      publishedEventsCount: publishedEvents.length
    }

    console.log(JSON.stringify(output, null, 2))

    if (snapshots.length === 0) {
      throw new Error(`Smoke failed: no operational_pl_snapshots rows materialized for ${periodId}.`)
    }

    if (!reactiveLog[0]) {
      throw new Error(`Smoke failed: no reactive log entry recorded for operational_pl and event ${eventId}.`)
    }

    if (reactiveLog[0].last_error) {
      throw new Error(`Smoke failed: reactive log captured an error for ${eventId}: ${reactiveLog[0].last_error}`)
    }

    if (publishedEvents.length === 0) {
      throw new Error(`Smoke failed: no accounting.pl_snapshot.materialized events found for ${periodId}.`)
    }

    if (!reactive.actions.some(action => action.includes('operational_pl'))) {
      throw new Error(`Smoke failed: reactive consumer did not report operational_pl materialization for ${periodId}.`)
    }
  } finally {
    const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
