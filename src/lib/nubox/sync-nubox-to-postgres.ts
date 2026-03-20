import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import type { NuboxConformedSale, NuboxConformedPurchase } from '@/lib/nubox/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncNuboxToPostgresResult = {
  syncRunId: string
  incomesCreated: number
  incomesUpdated: number
  expensesCreated: number
  expensesUpdated: number
  suppliersAutoProvisioned: number
  orphanedRecords: number
  durationMs: number
}

// ─── Read Conformed Data ────────────────────────────────────────────────────

const readConformedSales = async (projectId: string): Promise<NuboxConformedSale[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `SELECT * REPLACE(
      CAST(emission_date AS STRING) AS emission_date,
      CAST(due_date AS STRING) AS due_date,
      CAST(synced_at AS STRING) AS synced_at
    ) FROM \`${projectId}.greenhouse_conformed.nubox_sales\``
  })

  return rows as unknown as NuboxConformedSale[]
}

const readConformedPurchases = async (projectId: string): Promise<NuboxConformedPurchase[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `SELECT * REPLACE(
      CAST(emission_date AS STRING) AS emission_date,
      CAST(due_date AS STRING) AS due_date,
      CAST(synced_at AS STRING) AS synced_at
    ) FROM \`${projectId}.greenhouse_conformed.nubox_purchases\``
  })

  return rows as unknown as NuboxConformedPurchase[]
}

// ─── Income Projection ─────────────────────────────────────────────────────

const upsertIncomeFromSale = async (sale: NuboxConformedSale): Promise<'created' | 'updated' | 'skipped'> => {
  // Skip if nubox_sale_id is not a valid number
  if (!sale.nubox_sale_id || isNaN(Number(sale.nubox_sale_id))) return 'skipped'

  // Check if income already exists for this nubox document
  const existing = await runGreenhousePostgresQuery<{ income_id: string }>(
    `SELECT income_id FROM greenhouse_finance.income
     WHERE nubox_document_id = $1
     LIMIT 1`,
    [Number(sale.nubox_sale_id)]
  )

  if (existing.length > 0) {
    // Update existing income with latest Nubox data
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.income SET
        nubox_sii_track_id = $2,
        nubox_emission_status = $3,
        dte_type_code = $4,
        dte_folio = $5,
        nubox_last_synced_at = NOW(),
        updated_at = NOW()
      WHERE nubox_document_id = $1`,
      [
        Number(sale.nubox_sale_id),
        sale.sii_track_id ? Number(sale.sii_track_id) : null,
        sale.emission_status_name,
        sale.dte_type_code,
        sale.folio
      ]
    )

    // Publish outbox event
    await publishOutboxEvent(
      'finance.income',
      existing[0].income_id,
      'finance.income.nubox_synced',
      { nubox_sale_id: sale.nubox_sale_id, emission_status: sale.emission_status_name }
    )

    return 'updated'
  }

  // Skip sales without identity resolution
  if (!sale.client_id) return 'skipped'

  // Create new income record
  const incomeId = `INC-NB-${sale.nubox_sale_id}`

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_finance.income (
        income_id, client_id, client_name, invoice_number, invoice_date, due_date,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_status, amount_paid, income_type, service_line,
        nubox_document_id, nubox_sii_track_id, nubox_emission_status,
        dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        'CLP', $7, 0.19, $8, $9,
        1, $9,
        $10, 0, $11, NULL,
        $12, $13, $14,
        $15, $16, $17, NOW(),
        NULL, NOW(), NOW()
      )
      ON CONFLICT (income_id) DO NOTHING`,
      [
        incomeId,
        sale.client_id,
        sale.client_trade_name || 'Unknown',
        sale.folio,
        sale.emission_date,
        sale.due_date,
        Number(sale.net_amount ?? 0),
        Number(sale.tax_vat_amount ?? 0),
        Number(sale.total_amount ?? 0),
        Number(sale.balance ?? -1) === 0 ? 'paid' : 'pending',
        mapDteTypeToIncomeType(sale.dte_type_code),
        Number(sale.nubox_sale_id),
        sale.sii_track_id ? Number(sale.sii_track_id) : null,
        sale.emission_status_name,
        sale.dte_type_code,
        sale.folio,
        sale.emission_date
      ]
    )

    // Publish outbox event
    await client.query(
      `INSERT INTO greenhouse_sync.outbox_events (
        event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
      ) VALUES ($1, 'finance.income', $2, 'finance.income.created', $3::jsonb, 'pending', NOW())`,
      [
        `evt-${randomUUID()}`,
        incomeId,
        JSON.stringify({
          income_id: incomeId,
          source: 'nubox_sync',
          nubox_sale_id: sale.nubox_sale_id,
          total_amount: sale.total_amount
        })
      ]
    )
  })

  return 'created'
}

// ─── Expense Projection ────────────────────────────────────────────────────

const autoProvisionSupplier = async (purchase: NuboxConformedPurchase): Promise<string> => {
  const supplierId = `sup-nubox-${purchase.supplier_rut}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.suppliers (
      supplier_id, legal_name, trade_name, tax_id, tax_id_type,
      country_code, category, is_active, payment_currency,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'RUT', 'CL', 'other', TRUE, 'CLP', NOW(), NOW())
    ON CONFLICT (supplier_id) DO NOTHING`,
    [
      supplierId,
      purchase.supplier_trade_name || 'Unknown',
      purchase.supplier_trade_name,
      purchase.supplier_rut
    ]
  )

  return supplierId
}

const upsertExpenseFromPurchase = async (
  purchase: NuboxConformedPurchase
): Promise<{ action: 'created' | 'updated' | 'skipped'; autoProvisioned: boolean }> => {
  // Check if expense already exists for this nubox purchase
  const existing = await runGreenhousePostgresQuery<{ expense_id: string }>(
    `SELECT expense_id FROM greenhouse_finance.expenses
     WHERE nubox_purchase_id = $1
     LIMIT 1`,
    [Number(purchase.nubox_purchase_id)]
  )

  if (existing.length > 0) {
    // Update existing expense with latest Nubox data
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses SET
        nubox_document_status = $2,
        nubox_last_synced_at = NOW(),
        updated_at = NOW()
      WHERE nubox_purchase_id = $1`,
      [Number(purchase.nubox_purchase_id), purchase.document_status_name]
    )

    await publishOutboxEvent(
      'finance.expense',
      existing[0].expense_id,
      'finance.expense.nubox_synced',
      { nubox_purchase_id: purchase.nubox_purchase_id, document_status: purchase.document_status_name }
    )

    return { action: 'updated', autoProvisioned: false }
  }

  // Auto-provision supplier if needed
  let supplierId = purchase.supplier_id
  let autoProvisioned = false

  if (!supplierId && purchase.supplier_rut) {
    supplierId = await autoProvisionSupplier(purchase)
    autoProvisioned = true
  }

  if (!supplierId) return { action: 'skipped', autoProvisioned: false }

  // Create new expense record
  const expenseId = `EXP-NB-${purchase.nubox_purchase_id}`

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_finance.expenses (
        expense_id, expense_type, description,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_status, document_number, document_date, due_date,
        supplier_id, supplier_name,
        nubox_purchase_id, nubox_document_status, nubox_supplier_rut,
        nubox_supplier_name, nubox_origin, nubox_last_synced_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, 'supplier', $2,
        'CLP', $3, 0.19, $4, $5,
        1, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14,
        $15, $16, NOW(),
        NULL, NOW(), NOW()
      )
      ON CONFLICT (expense_id) DO NOTHING`,
      [
        expenseId,
        `${purchase.dte_type_name || 'Factura'} — ${purchase.supplier_trade_name || 'Unknown'}`,
        Number(purchase.net_amount ?? 0),
        Number(purchase.tax_vat_amount ?? 0),
        Number(purchase.total_amount ?? 0),
        Number(purchase.balance ?? -1) === 0 ? 'paid' : 'pending',
        purchase.folio,
        purchase.emission_date,
        purchase.due_date,
        supplierId,
        purchase.supplier_trade_name,
        Number(purchase.nubox_purchase_id),
        purchase.document_status_name,
        purchase.supplier_rut,
        purchase.supplier_trade_name,
        purchase.origin_name
      ]
    )

    await client.query(
      `INSERT INTO greenhouse_sync.outbox_events (
        event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
      ) VALUES ($1, 'finance.expense', $2, 'finance.expense.created', $3::jsonb, 'pending', NOW())`,
      [
        `evt-${randomUUID()}`,
        expenseId,
        JSON.stringify({
          expense_id: expenseId,
          source: 'nubox_sync',
          nubox_purchase_id: purchase.nubox_purchase_id,
          total_amount: purchase.total_amount
        })
      ]
    )
  })

  return { action: 'created', autoProvisioned }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapDteTypeToIncomeType = (dteCode: string | null): string => {
  switch (dteCode) {
    case '61': return 'credit_note'
    case '56': return 'debit_note'
    case '52': return 'quote'
    default: return 'service_fee'
  }
}

const publishOutboxEvent = async (
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Record<string, unknown>
) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.outbox_events (
      event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
    ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW())`,
    [
      `evt-${randomUUID()}`,
      aggregateType,
      aggregateId,
      eventType,
      JSON.stringify(payload)
    ]
  )
}

// ─── Sync Run Tracking ──────────────────────────────────────────────────────

const writeSyncRun = async ({
  runId,
  status,
  recordsRead = 0,
  notes
}: {
  runId: string
  status: 'running' | 'succeeded' | 'failed'
  recordsRead?: number
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, triggered_by, notes, finished_at
    )
    VALUES ($1, 'nubox', 'postgres_projection', 'incremental', $2, $3, 'nubox_sync', $4,
      CASE WHEN $2 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
    ON CONFLICT (sync_run_id) DO UPDATE SET
      status = EXCLUDED.status,
      records_read = EXCLUDED.records_read,
      notes = EXCLUDED.notes,
      finished_at = EXCLUDED.finished_at`,
    [runId, status, recordsRead, notes || null]
  )
}

// ─── Main Sync Function ────────────────────────────────────────────────────

export const syncNuboxToPostgres = async (): Promise<SyncNuboxToPostgresResult> => {
  const startMs = Date.now()
  const syncRunId = `nubox-pg-${randomUUID()}`
  const projectId = getBigQueryProjectId()

  await writeSyncRun({ runId: syncRunId, status: 'running' })

  try {
    // 1. Read conformed data from BigQuery
    const [conformedSales, conformedPurchases] = await Promise.all([
      readConformedSales(projectId),
      readConformedPurchases(projectId)
    ])

    // 2. Project sales to income
    let incomesCreated = 0
    let incomesUpdated = 0
    let orphanedRecords = 0

    for (const sale of conformedSales) {
      const result = await upsertIncomeFromSale(sale)

      if (result === 'created') incomesCreated++
      else if (result === 'updated') incomesUpdated++
      else if (result === 'skipped') orphanedRecords++
    }

    // 3. Project purchases to expenses
    let expensesCreated = 0
    let expensesUpdated = 0
    let suppliersAutoProvisioned = 0

    for (const purchase of conformedPurchases) {
      const result = await upsertExpenseFromPurchase(purchase)

      if (result.action === 'created') expensesCreated++
      else if (result.action === 'updated') expensesUpdated++
      else if (result.action === 'skipped') orphanedRecords++

      if (result.autoProvisioned) suppliersAutoProvisioned++
    }

    const totalRead = conformedSales.length + conformedPurchases.length

    await writeSyncRun({
      runId: syncRunId,
      status: 'succeeded',
      recordsRead: totalRead,
      notes: `Income: ${incomesCreated} created, ${incomesUpdated} updated. Expenses: ${expensesCreated} created, ${expensesUpdated} updated. Suppliers auto-provisioned: ${suppliersAutoProvisioned}. Orphaned: ${orphanedRecords}`
    })

    return {
      syncRunId,
      incomesCreated,
      incomesUpdated,
      expensesCreated,
      expensesUpdated,
      suppliersAutoProvisioned,
      orphanedRecords,
      durationMs: Date.now() - startMs
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await writeSyncRun({
      runId: syncRunId,
      status: 'failed',
      notes: message.slice(0, 500)
    }).catch(() => {})

    throw error
  }
}
