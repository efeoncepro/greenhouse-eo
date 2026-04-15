/*
 * scripts/diagnose-marzo-delta-state.ts
 *
 * Diagnostic-only script for TASK-409 hotfix 2026-04-15.
 *
 * Prints the full state of Marzo 2026 Finance delta rows (for
 * `payroll_reliquidation` source_type) plus the related outbox events
 * so we can reason about duplicates and missing deltas before running
 * any destructive reconciliation.
 *
 * Read-only. Safe to run any time.
 */

import { closeGreenhousePostgres, query } from '@/lib/db'

const PERIOD_ID = '2026-03'

interface DeltaRow extends Record<string, unknown> {
  expense_id: string
  member_id: string | null
  currency: string
  total_amount: string | number
  is_annulled: boolean
  notes: string | null
  created_at: Date | string
}

interface OutboxRow extends Record<string, unknown> {
  event_id: string
  aggregate_id: string
  event_type: string
  status: string
  occurred_at: Date | string
  published_at: Date | string | null
  payload: { memberId?: string; deltaGross?: number; deltaNet?: number }
}

interface ReactiveLogRow extends Record<string, unknown> {
  event_id: string
  handler: string
  reacted_at: Date | string
  result: string | null
  retries: number | null
  last_error: string | null
}

const run = async () => {
  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(' Marzo 2026 delta state diagnosis')
  console.log('════════════════════════════════════════════════════════════')

  const deltaRows = await query<DeltaRow>(
    `
      SELECT expense_id, member_id, currency, total_amount, is_annulled, notes, created_at
      FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND source_type = 'payroll_reliquidation'
      ORDER BY member_id, created_at ASC
    `,
    [PERIOD_ID]
  )

  console.log(`\n delta rows: ${deltaRows.length}`)

  for (const row of deltaRows) {
    const flag = row.is_annulled ? ' [ANNULLED]' : ''
    const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at

    console.log(
      `   · ${row.expense_id} | ${row.member_id} | ${row.currency} ${row.total_amount} | ${createdAt}${flag}`
    )
  }

  const outboxRows = await query<OutboxRow>(
    `
      SELECT event_id,
             aggregate_id,
             event_type,
             status,
             occurred_at,
             published_at,
             payload_json AS payload
      FROM greenhouse_sync.outbox_events
      WHERE event_type = 'payroll_entry.reliquidated'
        AND (payload_json->>'periodId' = $1)
      ORDER BY occurred_at ASC
    `,
    [PERIOD_ID]
  )

  console.log(`\n outbox_events (payroll_entry.reliquidated): ${outboxRows.length}`)

  for (const row of outboxRows) {
    const occurredAt = row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at
    const publishedAt = row.published_at ? (row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at) : 'null'
    const memberId = typeof row.payload === 'object' && row.payload ? row.payload.memberId : 'n/a'
    const deltaGross = typeof row.payload === 'object' && row.payload ? row.payload.deltaGross : 'n/a'
    const deltaNet = typeof row.payload === 'object' && row.payload ? row.payload.deltaNet : 'n/a'

    console.log(
      `   · ${row.event_id} | member=${memberId} | status=${row.status} | occurred=${occurredAt} published=${publishedAt} | deltaGross=${deltaGross} deltaNet=${deltaNet}`
    )
  }

  const logRows = await query<ReactiveLogRow>(
    `
      SELECT l.event_id, l.handler, l.reacted_at, l.result, l.retries, l.last_error
      FROM greenhouse_sync.outbox_reactive_log AS l
      INNER JOIN greenhouse_sync.outbox_events AS e ON e.event_id = l.event_id
      WHERE e.event_type = 'payroll_entry.reliquidated'
        AND (e.payload_json->>'periodId' = $1)
        AND l.handler = 'payroll_reliquidation_delta'
      ORDER BY l.reacted_at ASC
    `,
    [PERIOD_ID]
  )

  console.log(`\n outbox_reactive_log entries (payroll_reliquidation_delta handler): ${logRows.length}`)

  for (const row of logRows) {
    const reactedAt = row.reacted_at instanceof Date ? row.reacted_at.toISOString() : row.reacted_at

    console.log(
      `   · ${row.event_id} | handler=${row.handler} | reacted=${reactedAt} | result=${row.result} | retries=${row.retries}`
    )

    if (row.last_error) {
      console.log(`     last_error: ${row.last_error}`)
    }
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
}

run()
  .catch(err => {
    console.error('❌ Diagnosis failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
