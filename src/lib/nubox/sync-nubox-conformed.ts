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
import { normalizeTaxId } from '@/lib/finance/multi-currency/tax-identity'
import { isNuboxExportForeignCurrencyEnabled } from '@/lib/finance/multi-currency/flags'
import { captureOrphanRfcExports } from '@/lib/finance/nubox-export-rfc-disposition/store'
import { getNuboxSaleXml } from '@/lib/nubox/client'
import { parseDteForeignCurrencyXml } from '@/lib/nubox/dte-foreign-currency'
import { captureWithDomain } from '@/lib/observability/capture'
import type {
  NuboxSale,
  NuboxPurchase,
  NuboxExpense,
  NuboxIncome,
  NuboxConformedSale,
  NuboxConformedPurchase,
  NuboxConformedBankMovement
} from '@/lib/nubox/types'

// TASK-990 — export DTE legal codes (SII): 110 factura exportación, 111 nota
// débito exportación, 112 nota crédito exportación.
const EXPORT_DTE_CODES = new Set(['110', '111', '112'])

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

export const buildNuboxOrgByRutMap = async () => {
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
    // TASK-990 — key by normalized tax id (RUT or Mexican RFC) so the conformed
    // mapper's normalized lookup matches. Berel (MX) keys on its RFC, not a RUT.
    map.set(normalizeTaxId(row.tax_id), {
      organization_id: row.organization_id,
      client_id: row.client_id
    })
  }

  return map
}

export const buildNuboxSupplierByRutMap = async () => {
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
    map.set(normalizeTaxId(row.tax_id), row.supplier_id)
  }

  return map
}

export const buildNuboxIncomeByNuboxIdMap = async () => {
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

export const buildNuboxExpenseByNuboxIdMap = async () => {
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

// ─── Export foreign-currency enrichment (TASK-990) ──────────────────────────

/**
 * For each export DTE (110/111/112), fetch the SII XML and populate the native
 * (MXN) + functional (CLP) foreign-currency fields from `<Totales>` /
 * `<OtraMoneda>`. Mutates the conformed rows in place. Best-effort per sale.
 */
const enrichExportSalesWithForeignCurrency = async (conformedSales: NuboxConformedSale[]): Promise<void> => {
  const exportSales = conformedSales.filter(s => EXPORT_DTE_CODES.has(s.dte_type_code ?? ''))

  for (const sale of exportSales) {
    const saleId = Number(sale.nubox_sale_id)

    if (!Number.isFinite(saleId)) continue

    try {
      const xml = await getNuboxSaleXml(saleId)
      const parsed = parseDteForeignCurrencyXml(xml)

      // Only populate when the XML actually carries a foreign plane with a
      // recognized ISO currency + native amount. Otherwise leave fields null
      // (CLP-only export, or unrecognized currency → fail-closed, never guess).
      if (parsed?.nativeCurrencyCode && parsed.nativeTotal !== null) {
        sale.foreign_total_amount = parsed.nativeTotal
        sale.foreign_currency_code = parsed.nativeCurrencyCode
        sale.functional_total_amount_clp = parsed.clpTotal
        sale.exportation_detail_json = JSON.stringify(parsed)
        sale.foreign_currency_evidence_source = 'nubox_xml'
        sale.foreign_currency_confidence = 'high'
      }
    } catch (xmlError) {
      captureWithDomain(xmlError, 'finance', {
        tags: { source: 'nubox_export_xml_enrichment' },
        extra: { nuboxSaleId: sale.nubox_sale_id, dteTypeCode: sale.dte_type_code }
      })
    }
  }
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

export const writeNuboxConformedSales = async (rows: NuboxConformedSale[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  // ignoreUnknownValues: defense-in-depth so a new conformed field added in code
  // ahead of the BQ schema (TASK-990 foreign_* columns) never breaks the stream
  // insert; missing columns are dropped, never error.
  await bq.dataset('greenhouse_conformed').table('nubox_sales').insert(rows, { ignoreUnknownValues: true })
}

const writeConformedPurchases = async (projectId: string, rows: NuboxConformedPurchase[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  await bq.dataset('greenhouse_conformed').table('nubox_purchases').insert(rows, { ignoreUnknownValues: true })
}

const writeConformedBankMovements = async (projectId: string, rows: NuboxConformedBankMovement[]) => {
  if (rows.length === 0) return

  const bq = getBigQueryClient()

  await bq.dataset('greenhouse_conformed').table('nubox_bank_movements').insert(rows, { ignoreUnknownValues: true })
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
    VALUES ($1, 'nubox', 'conformed_sync', 'incremental', $2, $3, $4, 'nubox_sync', $5,
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
      buildNuboxOrgByRutMap(),
      buildNuboxSupplierByRutMap(),
      buildNuboxIncomeByNuboxIdMap(),
      buildNuboxExpenseByNuboxIdMap()
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

    // 3b. TASK-990 — enrich export DTEs (110/111/112) with the foreign-currency
    // planes from the authoritative SII XML (`<Totales>` native + `<OtraMoneda>`
    // CLP). Neither the /sales list nor /details endpoints expose this. Gated by
    // NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED; best-effort per sale (an XML fetch
    // failure leaves the foreign fields null, never breaks the sync).
    if (isNuboxExportForeignCurrencyEnabled()) {
      await enrichExportSalesWithForeignCurrency(conformedSales)
    }

    // 4. Count orphans (no identity match)
    const orphanedSales = conformedSales.filter(s => s.client_rut && !s.organization_id).length
    const orphanedPurchases = conformedPurchases.filter(p => p.supplier_rut && !p.supplier_id).length

    // 4b. TASK-990 — capture orphan EXPORT sales (DTE 110/111/112 with a tax id
    // that did not match any organization) into the reviewed-disposition queue.
    // Best-effort: a capture failure must never break the conformed sync.
    const orphanExportSales = conformedSales.filter(
      s => EXPORT_DTE_CODES.has(s.dte_type_code ?? '') && s.client_rut && !s.organization_id
    )

    if (orphanExportSales.length > 0) {
      try {
        await captureOrphanRfcExports(
          orphanExportSales.map(s => ({
            nuboxSaleId: s.nubox_sale_id,
            dteTypeCode: s.dte_type_code,
            rfcRaw: s.client_rut as string,
            rfcNormalized: normalizeTaxId(s.client_rut),
            clientTradeName: s.client_trade_name,
            foreignTotalAmount: s.foreign_total_amount,
            foreignCurrencyCode: s.foreign_currency_code,
            functionalTotalAmountClp: s.functional_total_amount_clp
          }))
        )
      } catch (captureError) {
        captureWithDomain(captureError, 'finance', {
          tags: { source: 'nubox_export_rfc_disposition_capture' },
          extra: { orphanExportCount: orphanExportSales.length }
        })
      }
    }

    // 5. Append conformed snapshots; downstream readers select latest snapshot per Nubox ID
    await writeNuboxConformedSales(conformedSales)
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
