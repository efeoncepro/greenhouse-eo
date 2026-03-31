import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  mapSaleToConformed,
  mapPurchaseToConformed,
  mapExpenseToConformedBankMovement,
  mapIncomeToConformedBankMovement
} from '@/lib/nubox/mappers'
import type {
  NuboxSale,
  NuboxPurchase,
  NuboxExpense,
  NuboxIncome,
  NuboxConformedSale,
  NuboxConformedPurchase,
  NuboxConformedBankMovement
} from '@/lib/nubox/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncNuboxConformedResult = {
  syncRunId: string
  salesConformed: number
  purchasesConformed: number
  bankMovementsConformed: number
  orphanedSales: number
  orphanedPurchases: number
  durationMs: number
}

// ─── Identity Resolution ────────────────────────────────────────────────────

const buildOrgByRutMap = async () => {
  // Use GROUP BY + MAX to pick the first non-null client_id
  // when an organization has multiple active spaces
  const rows = await runGreenhousePostgresQuery<{
    organization_id: string
    tax_id: string
    client_id: string | null
  }>(`
    SELECT o.organization_id, o.tax_id,
           MAX(s.client_id) FILTER (WHERE s.client_id IS NOT NULL) AS client_id
    FROM greenhouse_core.organizations o
    LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id AND s.active = TRUE
    WHERE o.tax_id IS NOT NULL AND o.tax_id <> ''
    GROUP BY o.organization_id, o.tax_id
  `)

  const map = new Map<string, { organization_id: string; client_id: string | null }>()

  for (const row of rows) {
    map.set(row.tax_id, {
      organization_id: row.organization_id,
      client_id: row.client_id
    })
  }

  return map
}

const buildSupplierByRutMap = async () => {
  const rows = await runGreenhousePostgresQuery<{
    supplier_id: string
    tax_id: string
  }>(`
    SELECT supplier_id, tax_id
    FROM greenhouse_finance.suppliers
    WHERE tax_id IS NOT NULL AND tax_id <> ''
  `)

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.tax_id, row.supplier_id)
  }

  return map
}

const buildIncomeByNuboxIdMap = async () => {
  const rows = await runGreenhousePostgresQuery<{
    income_id: string
    nubox_document_id: string
  }>(`
    SELECT income_id, nubox_document_id::text AS nubox_document_id
    FROM greenhouse_finance.income
    WHERE nubox_document_id IS NOT NULL
  `)

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.nubox_document_id, row.income_id)
  }

  return map
}

const buildExpenseByNuboxIdMap = async () => {
  const rows = await runGreenhousePostgresQuery<{
    expense_id: string
    nubox_purchase_id: string
  }>(`
    SELECT expense_id, nubox_purchase_id::text AS nubox_purchase_id
    FROM greenhouse_finance.expenses
    WHERE nubox_purchase_id IS NOT NULL
  `)

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.nubox_purchase_id, row.expense_id)
  }

  return map
}

// ─── Read Latest Raw Snapshots ──────────────────────────────────────────────

const readLatestRawSales = async (projectId: string): Promise<NuboxSale[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT payload_json
      FROM (
        SELECT payload_json,
          ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
        FROM \`${projectId}.greenhouse_raw.nubox_sales_snapshots\`
        WHERE is_deleted = FALSE
      )
      WHERE rn = 1
    `
  })

  return (rows as Array<{ payload_json: unknown }>).map(r => {
    const json = typeof r.payload_json === 'string' ? r.payload_json : JSON.stringify(r.payload_json)

    return JSON.parse(json) as NuboxSale
  })
}

const readLatestRawPurchases = async (projectId: string): Promise<NuboxPurchase[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT payload_json
      FROM (
        SELECT payload_json,
          ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
        FROM \`${projectId}.greenhouse_raw.nubox_purchases_snapshots\`
        WHERE is_deleted = FALSE
      )
      WHERE rn = 1
    `
  })

  return (rows as Array<{ payload_json: unknown }>).map(r => {
    const json = typeof r.payload_json === 'string' ? r.payload_json : JSON.stringify(r.payload_json)

    return JSON.parse(json) as NuboxPurchase
  })
}

const readLatestRawExpenses = async (projectId: string): Promise<NuboxExpense[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT payload_json
      FROM (
        SELECT payload_json,
          ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
        FROM \`${projectId}.greenhouse_raw.nubox_expenses_snapshots\`
        WHERE is_deleted = FALSE
      )
      WHERE rn = 1
    `
  })

  return (rows as Array<{ payload_json: unknown }>).map(r => {
    const json = typeof r.payload_json === 'string' ? r.payload_json : JSON.stringify(r.payload_json)

    return JSON.parse(json) as NuboxExpense
  })
}

const readLatestRawIncomes = async (projectId: string): Promise<NuboxIncome[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT payload_json
      FROM (
        SELECT payload_json,
          ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
        FROM \`${projectId}.greenhouse_raw.nubox_incomes_snapshots\`
        WHERE is_deleted = FALSE
      )
      WHERE rn = 1
    `
  })

  return (rows as Array<{ payload_json: unknown }>).map(r => {
    const json = typeof r.payload_json === 'string' ? r.payload_json : JSON.stringify(r.payload_json)

    return JSON.parse(json) as NuboxIncome
  })
}

// ─── Write Conformed ────────────────────────────────────────────────────────

const writeConformedSales = async (projectId: string, rows: NuboxConformedSale[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  // Delete only IDs we're about to re-insert (safe upsert pattern)
  const ids = rows.map(r => r.nubox_sale_id)
  const placeholders = ids.map((_, i) => `@id_${i}`).join(', ')
  const params = Object.fromEntries(ids.map((id, i) => [`id_${i}`, id]))

  await bq.query({
    query: `DELETE FROM \`${projectId}.greenhouse_conformed.nubox_sales\` WHERE nubox_sale_id IN (${placeholders})`,
    params
  })

  await bq.dataset('greenhouse_conformed').table('nubox_sales').insert(rows)
}

const writeConformedPurchases = async (projectId: string, rows: NuboxConformedPurchase[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  const ids = rows.map(r => r.nubox_purchase_id)
  const placeholders = ids.map((_, i) => `@id_${i}`).join(', ')
  const params = Object.fromEntries(ids.map((id, i) => [`id_${i}`, id]))

  await bq.query({
    query: `DELETE FROM \`${projectId}.greenhouse_conformed.nubox_purchases\` WHERE nubox_purchase_id IN (${placeholders})`,
    params
  })

  await bq.dataset('greenhouse_conformed').table('nubox_purchases').insert(rows)
}

const writeConformedBankMovements = async (projectId: string, rows: NuboxConformedBankMovement[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  const ids = rows.map(r => r.nubox_movement_id)
  const placeholders = ids.map((_, i) => `@id_${i}`).join(', ')
  const params = Object.fromEntries(ids.map((id, i) => [`id_${i}`, id]))

  await bq.query({
    query: `DELETE FROM \`${projectId}.greenhouse_conformed.nubox_bank_movements\` WHERE nubox_movement_id IN (${placeholders})`,
    params
  })

  await bq.dataset('greenhouse_conformed').table('nubox_bank_movements').insert(rows)
}

// ─── Sync Run Tracking ──────────────────────────────────────────────────────

const writeSyncRun = async ({
  runId,
  status,
  recordsRead = 0,
  recordsWrittenConformed = 0,
  notes
}: {
  runId: string
  status: 'running' | 'succeeded' | 'failed'
  recordsRead?: number
  recordsWrittenConformed?: number
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, records_written_conformed, triggered_by, notes, finished_at
    )
    VALUES ($1, 'nubox', 'conformed_sync', 'full_refresh', $2, $3, $4, 'nubox_sync', $5,
      CASE WHEN $2 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
    ON CONFLICT (sync_run_id) DO UPDATE SET
      status = EXCLUDED.status,
      records_read = EXCLUDED.records_read,
      records_written_conformed = EXCLUDED.records_written_conformed,
      notes = EXCLUDED.notes,
      finished_at = EXCLUDED.finished_at`,
    [runId, status, recordsRead, recordsWrittenConformed, notes || null]
  )
}

// ─── Main Sync Function ────────────────────────────────────────────────────

export const syncNuboxToConformed = async (): Promise<SyncNuboxConformedResult> => {
  const startMs = Date.now()
  const syncRunId = `nubox-conf-${randomUUID()}`
  const projectId = getBigQueryProjectId()

  await writeSyncRun({ runId: syncRunId, status: 'running' })

  try {
    // 1. Build identity maps
    const [orgByRut, supplierByRut, incomeByNuboxId, expenseByNuboxId] = await Promise.all([
      buildOrgByRutMap(),
      buildSupplierByRutMap(),
      buildIncomeByNuboxIdMap(),
      buildExpenseByNuboxIdMap()
    ])

    // 2. Read latest raw snapshots
    const [rawSales, rawPurchases, rawExpenses, rawIncomes] = await Promise.all([
      readLatestRawSales(projectId),
      readLatestRawPurchases(projectId),
      readLatestRawExpenses(projectId),
      readLatestRawIncomes(projectId)
    ])

    // 3. Transform to conformed
    const conformedSales = rawSales.map(s =>
      mapSaleToConformed(s, syncRunId, { orgByRut, incomeByNuboxId })
    )

    const conformedPurchases = rawPurchases.map(p =>
      mapPurchaseToConformed(p, syncRunId, { orgByRut, supplierByRut, expenseByNuboxId })
    )

    const bankMovements = [
      ...rawExpenses.map(e => mapExpenseToConformedBankMovement(e, syncRunId)),
      ...rawIncomes.map(i => mapIncomeToConformedBankMovement(i, syncRunId))
    ]

    // 4. Count orphans (no identity match)
    const orphanedSales = conformedSales.filter(s => s.client_rut && !s.organization_id).length
    const orphanedPurchases = conformedPurchases.filter(p => p.supplier_rut && !p.supplier_id).length

    // 5. Write conformed (DELETE/INSERT)
    await writeConformedSales(projectId, conformedSales)
    await writeConformedPurchases(projectId, conformedPurchases)
    await writeConformedBankMovements(projectId, bankMovements)

    const totalConformed = conformedSales.length + conformedPurchases.length + bankMovements.length
    const totalRead = rawSales.length + rawPurchases.length + rawExpenses.length + rawIncomes.length

    await writeSyncRun({
      runId: syncRunId,
      status: 'succeeded',
      recordsRead: totalRead,
      recordsWrittenConformed: totalConformed,
      notes: orphanedSales + orphanedPurchases > 0
        ? `Orphans: ${orphanedSales} sales, ${orphanedPurchases} purchases (no RUT match)`
        : null
    })

    return {
      syncRunId,
      salesConformed: conformedSales.length,
      purchasesConformed: conformedPurchases.length,
      bankMovementsConformed: bankMovements.length,
      orphanedSales,
      orphanedPurchases,
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
