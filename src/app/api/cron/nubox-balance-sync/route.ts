import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/nubox-balance-sync
 *
 * Lightweight cron that updates balance_nubox for income and expenses
 * by reading the latest conformed snapshots from BigQuery.
 * Detects divergences where Nubox says paid but Greenhouse says pending.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()

  try {
    const projectId = getBigQueryProjectId()
    const bq = getBigQueryClient()

    // 1. Read sales balances from conformed
    const [saleRows] = await bq.query({
      query: `
        WITH latest_sales AS (
          SELECT * EXCEPT(rn)
          FROM (
            SELECT s.*,
                   ROW_NUMBER() OVER (PARTITION BY nubox_sale_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
            FROM \`${projectId}.greenhouse_conformed.nubox_sales\` s
          )
          WHERE rn = 1
        )
        SELECT nubox_sale_id, CAST(balance AS FLOAT64) AS balance
        FROM latest_sales
        WHERE balance IS NOT NULL
      `
    })

    let incomeUpdated = 0
    let divergences = 0

    for (const row of saleRows as Array<{ nubox_sale_id: string; balance: number }>) {
      const result = await runGreenhousePostgresQuery<{ income_id: string; payment_status: string; dte_folio: string | null }>(
        `UPDATE greenhouse_finance.income SET
          balance_nubox = $2, updated_at = NOW()
        WHERE nubox_document_id = $1
          AND (balance_nubox IS DISTINCT FROM $2)
        RETURNING income_id, payment_status, dte_folio`,
        [Number(row.nubox_sale_id), row.balance]
      )

      if (result.length > 0) {
        incomeUpdated++

        // Detect divergence: Nubox says 0 (paid) but Greenhouse says pending
        const r = result[0]

        if (row.balance === 0 && ['pending', 'partial', 'overdue'].includes(r.payment_status)) {
          divergences++

          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_sync.outbox_events (
              event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
            ) VALUES ($1, 'finance.income', $2, 'finance.balance_divergence.detected', $3::jsonb, 'pending', NOW())`,
            [
              `evt-${randomUUID()}`,
              r.income_id,
              JSON.stringify({
                incomeId: r.income_id,
                nuboxBalance: row.balance,
                greenhouseStatus: r.payment_status,
                dteFolio: r.dte_folio
              })
            ]
          )
        }
      }
    }

    // 2. Read purchase balances from conformed
    const [purchaseRows] = await bq.query({
      query: `
        WITH latest_purchases AS (
          SELECT * EXCEPT(rn)
          FROM (
            SELECT p.*,
                   ROW_NUMBER() OVER (PARTITION BY nubox_purchase_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
            FROM \`${projectId}.greenhouse_conformed.nubox_purchases\` p
          )
          WHERE rn = 1
        )
        SELECT nubox_purchase_id, CAST(balance AS FLOAT64) AS balance
        FROM latest_purchases
        WHERE balance IS NOT NULL
      `
    })

    let expenseUpdated = 0

    for (const row of purchaseRows as Array<{ nubox_purchase_id: string; balance: number }>) {
      const result = await runGreenhousePostgresQuery<{ expense_id: string }>(
        `UPDATE greenhouse_finance.expenses SET
          balance_nubox = $2, updated_at = NOW()
        WHERE nubox_purchase_id = $1
          AND (balance_nubox IS DISTINCT FROM $2)
        RETURNING expense_id`,
        [Number(row.nubox_purchase_id), row.balance]
      )

      if (result.length > 0) expenseUpdated++
    }

    return NextResponse.json({
      incomeUpdated,
      expenseUpdated,
      divergences,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
