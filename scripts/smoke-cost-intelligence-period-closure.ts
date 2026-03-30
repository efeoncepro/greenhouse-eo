import { createRequire } from 'node:module'
import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)
const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const padMonth = (value: number) => String(value).padStart(2, '0')

const main = async () => {
  const { resolveOperationalCalendarContext, getOperationalPayrollMonth } = await import('@/lib/calendar/operational-calendar')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { publishOutboxEvent } = await import('@/lib/sync/publish-event')
  const { ensureReactiveSchema, processReactiveEvents } = await import('@/lib/sync/reactive-consumer')
  const { AGGREGATE_TYPES, EVENT_TYPES } = await import('@/lib/sync/event-catalog')

  try {
    const calendarContext = resolveOperationalCalendarContext()
    const operationalMonth = getOperationalPayrollMonth(new Date(), calendarContext)
    const year = Number(process.env.COST_INTELLIGENCE_SMOKE_YEAR || operationalMonth.operationalYear)
    const month = Number(process.env.COST_INTELLIGENCE_SMOKE_MONTH || operationalMonth.operationalMonth)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid smoke period. Use COST_INTELLIGENCE_SMOKE_YEAR and COST_INTELLIGENCE_SMOKE_MONTH with YYYY / MM values.')
    }

    const periodId = `${year}-${padMonth(month)}`
    const smokeRunId = `task068-smoke-${Date.now()}`
    const aggregateId = `smoke-expense-${periodId}-${smokeRunId}`

    const eventId = await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.expense,
      aggregateId,
      eventType: EVENT_TYPES.financeExpenseUpdated,
      payload: {
        expenseId: aggregateId,
        periodId,
        periodYear: year,
        periodMonth: month,
        documentDate: `${periodId}-01`,
        smokeRunId,
        source: 'task-068-smoke'
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
    const reactive = await processReactiveEvents({ domain: 'cost_intelligence', batchSize: 1 })

    const [snapshot] = await runGreenhousePostgresQuery<{
      period_year: number
      period_month: number
      closure_status: string
      readiness_pct: number
      snapshot_revision: number
      materialized_at: string
    }>(
      `
        SELECT
          period_year,
          period_month,
          closure_status,
          readiness_pct,
          snapshot_revision,
          materialized_at::text AS materialized_at
        FROM greenhouse_serving.period_closure_status
        WHERE period_year = $1
          AND period_month = $2
      `,
      [year, month]
    )

    const [reactiveLog] = await runGreenhousePostgresQuery<{
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
        ORDER BY reacted_at DESC
        LIMIT 1
      `,
      [eventId]
    )

    const output = {
      smokeRunId,
      eventId,
      periodId,
      reactive,
      snapshot: snapshot || null,
      reactiveLog: reactiveLog || null
    }

    console.log(JSON.stringify(output, null, 2))

    if (!snapshot) {
      throw new Error(`Smoke failed: no period_closure_status row materialized for ${periodId}.`)
    }

    if (!reactiveLog) {
      throw new Error(`Smoke failed: no reactive log entry recorded for ${eventId}.`)
    }

    if (reactiveLog.last_error) {
      throw new Error(`Smoke failed: reactive log captured an error for ${eventId}: ${reactiveLog.last_error}`)
    }

    if (!reactive.actions.some(action => action.includes(periodId))) {
      throw new Error(`Smoke failed: reactive consumer did not report materialization for ${periodId}.`)
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
