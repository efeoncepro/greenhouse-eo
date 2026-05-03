import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-775 Slice 3 — Lógica pura de nubox-balance-sync.
 *
 * Lee balances Nubox desde BigQuery conformed (sales + purchases) y rebajá
 * `balance_nubox` en `greenhouse_finance.income` y `greenhouse_finance.expenses`.
 * Si Nubox dice paid (balance=0) pero Greenhouse dice pending, emite outbox
 * event `finance.balance_divergence.detected` para que un human reconcile.
 *
 * Reusable desde:
 *   - Vercel cron (legacy fallback): `src/app/api/cron/nubox-balance-sync/route.ts`
 *   - Cloud Run ops-worker (canónico): `services/ops-worker/server.ts`
 *
 * Single source of truth — no duplicación de SQL ni event publishing.
 */

interface SaleBalanceRow {
  nubox_sale_id: string
  balance: number
}

interface PurchaseBalanceRow {
  nubox_purchase_id: string
  balance: number
}

interface IncomeUpdateResult extends Record<string, unknown> {
  income_id: string
  payment_status: string
  dte_folio: string | null
}

export interface NuboxBalanceSyncResult {
  incomeUpdated: number
  expenseUpdated: number
  divergences: number
  durationMs: number
}

export const runNuboxBalanceSync = async (): Promise<NuboxBalanceSyncResult> => {
  const startMs = Date.now()
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

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

  for (const row of saleRows as SaleBalanceRow[]) {
    const result = await runGreenhousePostgresQuery<IncomeUpdateResult>(
      `UPDATE greenhouse_finance.income SET
        balance_nubox = $2, updated_at = NOW()
      WHERE nubox_document_id = $1
        AND (balance_nubox IS DISTINCT FROM $2)
      RETURNING income_id, payment_status, dte_folio`,
      [Number(row.nubox_sale_id), row.balance]
    )

    if (result.length === 0) continue

    incomeUpdated++

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

  for (const row of purchaseRows as PurchaseBalanceRow[]) {
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

  return {
    incomeUpdated,
    expenseUpdated,
    divergences,
    durationMs: Date.now() - startMs
  }
}
