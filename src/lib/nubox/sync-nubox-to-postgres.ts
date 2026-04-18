import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { syncCanonicalFinanceQuote } from '@/lib/finance/quotation-canonical-store'
import { recordPayment } from '@/lib/finance/payment-ledger'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { ensureOrganizationForSupplier } from '@/lib/account-360/organization-identity'
import type { NuboxConformedSale, NuboxConformedPurchase, NuboxConformedBankMovement } from '@/lib/nubox/types'

type NuboxProjectionSale = NuboxConformedSale & {
  source_last_ingested_at: string | null
}

type NuboxProjectionPurchase = NuboxConformedPurchase & {
  source_last_ingested_at: string | null
}

/** Safely parse a numeric value that may come as string, quoted string, or number from BigQuery */
const safeNum = (v: unknown): number | null => {
  if (v == null) return null
  if (typeof v === 'number') return v

  const s = String(v).replace(/^"|"$/g, '').trim()

  if (s === '' || s === 'null') return null

  const n = Number(s)

  return Number.isFinite(n) ? n : null
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncNuboxToPostgresResult = {
  syncRunId: string
  incomesCreated: number
  incomesUpdated: number
  quotesCreated: number
  quotesUpdated: number
  expensesCreated: number
  expensesUpdated: number
  suppliersAutoProvisioned: number
  orphanedRecords: number
  expensesReconciled: number
  incomesReconciled: number
  durationMs: number
}

// ─── Read Conformed Data ────────────────────────────────────────────────────

const readConformedSales = async (projectId: string): Promise<NuboxProjectionSale[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      WITH latest_conformed AS (
        SELECT * EXCEPT(rn)
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (PARTITION BY nubox_sale_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
          FROM \`${projectId}.greenhouse_conformed.nubox_sales\` c
        )
        WHERE rn = 1
      ),
      latest_raw AS (
        SELECT source_object_id, CAST(ingested_at AS STRING) AS source_last_ingested_at
        FROM (
          SELECT source_object_id, ingested_at,
                 ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
          FROM \`${projectId}.greenhouse_raw.nubox_sales_snapshots\`
          WHERE is_deleted = FALSE
        )
        WHERE rn = 1
      )
      SELECT c.* REPLACE(
        CAST(c.emission_date AS STRING) AS emission_date,
        CAST(c.due_date AS STRING) AS due_date,
        CAST(c.synced_at AS STRING) AS synced_at
      ),
      latest_raw.source_last_ingested_at
      FROM latest_conformed c
      LEFT JOIN latest_raw ON latest_raw.source_object_id = c.nubox_sale_id
    `
  })

  return rows as unknown as NuboxProjectionSale[]
}

const readConformedPurchases = async (projectId: string): Promise<NuboxProjectionPurchase[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      WITH latest_conformed AS (
        SELECT * EXCEPT(rn)
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (PARTITION BY nubox_purchase_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
          FROM \`${projectId}.greenhouse_conformed.nubox_purchases\` c
        )
        WHERE rn = 1
      ),
      latest_raw AS (
        SELECT source_object_id, CAST(ingested_at AS STRING) AS source_last_ingested_at
        FROM (
          SELECT source_object_id, ingested_at,
                 ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
          FROM \`${projectId}.greenhouse_raw.nubox_purchases_snapshots\`
          WHERE is_deleted = FALSE
        )
        WHERE rn = 1
      )
      SELECT c.* REPLACE(
        CAST(c.emission_date AS STRING) AS emission_date,
        CAST(c.due_date AS STRING) AS due_date,
        CAST(c.synced_at AS STRING) AS synced_at
      ),
      latest_raw.source_last_ingested_at
      FROM latest_conformed c
      LEFT JOIN latest_raw ON latest_raw.source_object_id = c.nubox_purchase_id
    `
  })

  return rows as unknown as NuboxProjectionPurchase[]
}

// ─── Income Projection ─────────────────────────────────────────────────────

const upsertIncomeFromSale = async (sale: NuboxProjectionSale): Promise<'created' | 'updated' | 'skipped'> => {
  // Skip if nubox_sale_id is not a valid number
  if (!sale.nubox_sale_id || isNaN(Number(sale.nubox_sale_id))) return 'skipped'

  // Annulled documents are stored but excluded from revenue calculations
  const isAnnulled = sale.is_annulled === true

  // Check if income already exists for this nubox document
  const existing = await runGreenhousePostgresQuery<{ income_id: string }>(
    `SELECT income_id FROM greenhouse_finance.income
     WHERE nubox_document_id = $1
     LIMIT 1`,
    [Number(sale.nubox_sale_id)]
  )

  if (existing.length > 0) {
    // Update existing income with latest Nubox data + backfill organization_id if missing
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.income SET
        nubox_sii_track_id = $2,
        nubox_emission_status = $3,
        dte_type_code = $4,
        dte_folio = $5,
        organization_id = COALESCE(organization_id, $6),
        balance_nubox = $7,
        is_annulled = $8,
        nubox_pdf_url = $9,
        nubox_xml_url = $10,
        nubox_last_synced_at = COALESCE($11::timestamptz, greenhouse_finance.income.nubox_last_synced_at, NOW()),
        updated_at = NOW()
      WHERE nubox_document_id = $1`,
      [
        Number(sale.nubox_sale_id),
        sale.sii_track_id ? Number(sale.sii_track_id) : null,
        sale.emission_status_name,
        sale.dte_type_code,
        sale.folio,
        sale.organization_id || null,
        safeNum(sale.balance),
        isAnnulled,
        sale.pdf_url,
        sale.xml_url,
        sale.source_last_ingested_at
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

  // Credit notes (DTE 61) are stored with negative amounts
  const isCreditNote = sale.dte_type_code === '61'
  const signMultiplier = isCreditNote ? -1 : 1

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_finance.income (
        income_id, client_id, organization_id, client_name, invoice_number, invoice_date, due_date,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_status, amount_paid, income_type, is_annulled, service_line,
        nubox_document_id, nubox_sii_track_id, nubox_emission_status,
        dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
        dte_type_abbreviation, dte_type_name,
        exempt_amount, other_taxes_amount, withholding_amount,
        balance_nubox, payment_form, payment_form_name,
        origin, period_year, period_month,
        nubox_pdf_url, nubox_xml_url, nubox_details_url, nubox_references_url,
        client_main_activity,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'CLP', $8, 0.19, $9, $10,
        1, $10,
        $11, 0, $12, $19, NULL,
        $13, $14, $15,
        $16, $17, $18, $36::timestamptz,
        $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31, $32, $33, $34,
        $35,
        NULL, NOW(), NOW()
      )
      ON CONFLICT (income_id) DO UPDATE SET
        nubox_document_id = COALESCE(greenhouse_finance.income.nubox_document_id, EXCLUDED.nubox_document_id),
        nubox_sii_track_id = COALESCE(EXCLUDED.nubox_sii_track_id, greenhouse_finance.income.nubox_sii_track_id),
        nubox_emission_status = COALESCE(EXCLUDED.nubox_emission_status, greenhouse_finance.income.nubox_emission_status),
        dte_type_code = COALESCE(EXCLUDED.dte_type_code, greenhouse_finance.income.dte_type_code),
        dte_folio = COALESCE(EXCLUDED.dte_folio, greenhouse_finance.income.dte_folio),
        nubox_emitted_at = COALESCE(EXCLUDED.nubox_emitted_at, greenhouse_finance.income.nubox_emitted_at),
        organization_id = COALESCE(greenhouse_finance.income.organization_id, EXCLUDED.organization_id),
        is_annulled = EXCLUDED.is_annulled,
        balance_nubox = EXCLUDED.balance_nubox,
        nubox_pdf_url = COALESCE(EXCLUDED.nubox_pdf_url, greenhouse_finance.income.nubox_pdf_url),
        nubox_xml_url = COALESCE(EXCLUDED.nubox_xml_url, greenhouse_finance.income.nubox_xml_url),
        nubox_last_synced_at = COALESCE($36::timestamptz, greenhouse_finance.income.nubox_last_synced_at, NOW()),
        updated_at = NOW()`,
      [
        incomeId,
        sale.client_id,
        sale.organization_id || null,
        sale.client_trade_name || 'Unknown',
        sale.folio,
        sale.emission_date,
        sale.due_date,
        (safeNum(sale.net_amount) ?? 0) * signMultiplier,
        (safeNum(sale.tax_vat_amount) ?? 0) * signMultiplier,
        (safeNum(sale.total_amount) ?? 0) * signMultiplier,
        isCreditNote ? 'paid' : (isAnnulled ? 'written_off' : 'pending'),
        mapDteTypeToIncomeType(sale.dte_type_code),
        Number(sale.nubox_sale_id),
        sale.sii_track_id ? Number(sale.sii_track_id) : null,
        sale.emission_status_name,
        sale.dte_type_code,
        sale.folio,
        sale.emission_date,
        isAnnulled,
        sale.dte_type_abbreviation,
        sale.dte_type_name,
        safeNum(sale.exempt_amount) != null ? (safeNum(sale.exempt_amount) ?? 0) * signMultiplier : null,
        safeNum(sale.other_taxes_amount) != null ? (safeNum(sale.other_taxes_amount) ?? 0) * signMultiplier : null,
        safeNum(sale.withholding_amount) != null ? (safeNum(sale.withholding_amount) ?? 0) * signMultiplier : null,
        safeNum(sale.balance),
        sale.payment_form_code === '1' ? 'contado' : sale.payment_form_code === '2' ? 'credito' : null,
        sale.payment_form_name,
        sale.origin_name,
        sale.period_year,
        sale.period_month,
        sale.pdf_url,
        sale.xml_url,
        sale.details_url,
        sale.references_url,
        sale.client_main_activity,
        sale.source_last_ingested_at
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

  // Ensure an organization exists for this supplier (find-or-create by tax_id)
  let organizationId: string | null = null

  if (purchase.supplier_rut) {
    try {
      organizationId = await ensureOrganizationForSupplier({
        taxId: purchase.supplier_rut,
        taxIdType: 'RUT',
        legalName: purchase.supplier_trade_name || 'Unknown',
        country: 'CL'
      })
    } catch {
      // Non-blocking: log but don't fail supplier provisioning
      console.warn(`[autoProvisionSupplier] Failed to ensure org for ${purchase.supplier_rut}`)
    }
  }

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.suppliers (
      supplier_id, organization_id, legal_name, trade_name, tax_id, tax_id_type,
      country_code, category, is_active, payment_currency,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, 'RUT', 'CL', 'other', TRUE, 'CLP', NOW(), NOW())
    ON CONFLICT (supplier_id) DO UPDATE SET
      organization_id = COALESCE(greenhouse_finance.suppliers.organization_id, EXCLUDED.organization_id),
      updated_at = NOW()`,
    [
      supplierId,
      organizationId,
      purchase.supplier_trade_name || 'Unknown',
      purchase.supplier_trade_name,
      purchase.supplier_rut
    ]
  )

  return supplierId
}

const upsertExpenseFromPurchase = async (
  purchase: NuboxProjectionPurchase
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
        is_annulled = $3,
        sii_document_status = $4,
        balance_nubox = $5,
        nubox_pdf_url = $6,
        nubox_last_synced_at = COALESCE($7::timestamptz, greenhouse_finance.expenses.nubox_last_synced_at, NOW()),
        updated_at = NOW()
      WHERE nubox_purchase_id = $1`,
      [
        Number(purchase.nubox_purchase_id),
        purchase.document_status_name,
        purchase.is_annulled ?? false,
        purchase.document_status_name,
        safeNum(purchase.balance),
        purchase.pdf_url,
        purchase.source_last_ingested_at
      ]
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

  const isExpenseAnnulled = purchase.is_annulled === true

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
        is_annulled, sii_document_status, receipt_date, purchase_type,
        balance_nubox, vat_unrecoverable_amount, vat_fixed_assets_amount, vat_common_use_amount,
        nubox_pdf_url, dte_type_code, dte_folio,
        exempt_amount, other_taxes_amount, withholding_amount,
        period_year, period_month,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, 'supplier', $2,
        'CLP', $3, 0.19, $4, $5,
        1, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14,
        $15, $16, $33::timestamptz,
        $17, $18, $19::date, $20,
        $21, $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31, $32,
        NULL, NOW(), NOW()
      )
      ON CONFLICT (expense_id) DO NOTHING`,
      [
        expenseId,
        `${purchase.dte_type_name || 'Factura'} — ${purchase.supplier_trade_name || 'Unknown'}`,
        safeNum(purchase.net_amount) ?? 0,
        safeNum(purchase.tax_vat_amount) ?? 0,
        safeNum(purchase.total_amount) ?? 0,
        isExpenseAnnulled ? 'written_off' : ((safeNum(purchase.balance) ?? -1) === 0 ? 'paid' : 'pending'),
        purchase.folio,
        purchase.emission_date,
        purchase.due_date,
        supplierId,
        purchase.supplier_trade_name,
        Number(purchase.nubox_purchase_id),
        purchase.document_status_name,
        purchase.supplier_rut,
        purchase.supplier_trade_name,
        purchase.origin_name,
        isExpenseAnnulled,
        purchase.document_status_name,
        purchase.receipt_date,
        purchase.purchase_type_name,
        safeNum(purchase.balance),
        safeNum(purchase.vat_unrecoverable_amount),
        safeNum(purchase.vat_fixed_assets_amount),
        safeNum(purchase.vat_common_use_amount),
        purchase.pdf_url,
        purchase.dte_type_code,
        purchase.folio,
        safeNum(purchase.exempt_amount),
        safeNum(purchase.total_other_taxes_amount),
        safeNum(purchase.total_withholding_amount),
        purchase.period_year,
        purchase.period_month,
        purchase.source_last_ingested_at
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

    // Emit SII claim alert if document is "Reclamado"
    if (purchase.document_status_name === 'Reclamado') {
      await client.query(
        `INSERT INTO greenhouse_sync.outbox_events (
          event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
        ) VALUES ($1, 'finance.expense', $2, 'finance.sii_claim.detected', $3::jsonb, 'pending', NOW())`,
        [
          `evt-${randomUUID()}`,
          expenseId,
          JSON.stringify({
            expenseId,
            supplierName: purchase.supplier_trade_name,
            dteFolio: purchase.folio,
            siiStatus: purchase.document_status_name
          })
        ]
      )
    }
  })

  return { action: 'created', autoProvisioned }
}

// ─── Bank Movement Reconciliation ─────────────────────────────────────────

const readConformedBankMovements = async (projectId: string): Promise<NuboxConformedBankMovement[]> => {
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      WITH latest_conformed AS (
        SELECT * EXCEPT(rn)
        FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (PARTITION BY nubox_movement_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
          FROM \`${projectId}.greenhouse_conformed.nubox_bank_movements\` c
        )
        WHERE rn = 1
      )
      SELECT * REPLACE(
        CAST(payment_date AS STRING) AS payment_date,
        CAST(synced_at AS STRING) AS synced_at
      )
      FROM latest_conformed
      WHERE linked_purchase_id IS NOT NULL OR linked_sale_id IS NOT NULL
    `
  })

  return rows as unknown as NuboxConformedBankMovement[]
}

const reconcileExpenseFromBankMovement = async (
  movement: NuboxConformedBankMovement
): Promise<boolean> => {
  if (!movement.linked_purchase_id) return false

  const updated = await runGreenhousePostgresQuery<{ expense_id: string }>(
    `UPDATE greenhouse_finance.expenses SET
      payment_status = 'paid',
      payment_date = $2,
      payment_method = $3,
      updated_at = NOW()
    WHERE nubox_purchase_id = $1
      AND payment_status != 'paid'
    RETURNING expense_id`,
    [
      Number(movement.linked_purchase_id),
      movement.payment_date,
      movement.payment_method_description
    ]
  )

  if (updated.length > 0) {
    await publishOutboxEvent(
      'finance.expense',
      updated[0].expense_id,
      'finance.expense.paid_via_nubox',
      {
        nubox_movement_id: movement.nubox_movement_id,
        linked_purchase_id: movement.linked_purchase_id,
        amount: movement.total_amount,
        payment_date: movement.payment_date
      }
    )

    return true
  }

  return false
}

const reconcileIncomeFromBankMovement = async (
  movement: NuboxConformedBankMovement
): Promise<boolean> => {
  if (!movement.linked_sale_id) return false
  if (!movement.payment_date) return false

  // Find the income by nubox_document_id matching the linked sale
  const incomeRows = await runGreenhousePostgresQuery<{ income_id: string; total_amount: number; amount_paid: number }>(
    `SELECT income_id, total_amount, amount_paid
     FROM greenhouse_finance.income
     WHERE nubox_document_id = $1
       AND payment_status != 'paid'
     LIMIT 1`,
    [Number(movement.linked_sale_id)]
  )

  if (incomeRows.length === 0) return false

  const income = incomeRows[0]
  const paymentAmount = Number(movement.total_amount ?? 0)
  const nuboxRef = `nubox-mvmt-${movement.nubox_movement_id}`

  // Deduplication: skip if this Nubox movement was already registered as a payment
  const existingPayment = await runGreenhousePostgresQuery<{ payment_id: string }>(
    `SELECT payment_id FROM greenhouse_finance.income_payments
     WHERE income_id = $1 AND reference = $2 LIMIT 1`,
    [income.income_id, nuboxRef]
  )

  if (existingPayment.length > 0) return false

  const paymentId = `PAY-NUBOX-${movement.nubox_movement_id}`

  const recordedPayment = await recordPayment({
    incomeId: income.income_id,
    paymentId,
    paymentDate: movement.payment_date,
    amount: paymentAmount,
    currency: 'CLP',
    reference: nuboxRef,
    paymentMethod: 'bank_transfer',
    paymentSource: 'nubox_bank_sync',
    notes: 'Auto-registrado desde movimiento bancario Nubox'
  })

  await publishOutboxEvent(
    'finance.income',
    income.income_id,
    'finance.income.payment_received_via_nubox',
    {
      nubox_movement_id: movement.nubox_movement_id,
      linked_sale_id: movement.linked_sale_id,
      amount: paymentAmount,
      payment_date: movement.payment_date,
      new_status: recordedPayment.paymentStatus,
      payment_id: paymentId
    }
  )

  return true
}

// ─── Quote Upsert (DTE 52 → quotes table) ────────────────────────────────

const upsertQuoteFromSale = async (sale: NuboxProjectionSale): Promise<'created' | 'updated' | 'skipped'> => {
  if (!sale.nubox_sale_id || isNaN(Number(sale.nubox_sale_id))) return 'skipped'

  const existing = await runGreenhousePostgresQuery<{ quote_id: string }>(
    `SELECT quote_id FROM greenhouse_finance.quotes WHERE nubox_document_id = $1 LIMIT 1`,
    [String(sale.nubox_sale_id)]
  )

  if (existing.length > 0) {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.quotes SET
        nubox_sii_track_id = $2,
        nubox_emission_status = $3,
        nubox_last_synced_at = COALESCE($4::timestamptz, greenhouse_finance.quotes.nubox_last_synced_at, NOW()),
        updated_at = NOW()
      WHERE nubox_document_id = $1`,
      [String(sale.nubox_sale_id), sale.sii_track_id, sale.emission_status_name, sale.source_last_ingested_at]
    )

    await syncCanonicalFinanceQuote({ quoteId: existing[0].quote_id })

    return 'updated'
  }

  if (!sale.client_id) return 'skipped'

  const quoteId = `QUO-NB-${sale.nubox_sale_id}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.quotes (
      quote_id, client_id, organization_id, client_name,
      quote_number, quote_date, due_date,
      currency, subtotal, tax_rate, tax_amount, total_amount,
      exchange_rate_to_clp, total_amount_clp,
      status, nubox_document_id, nubox_sii_track_id, nubox_emission_status,
      dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      'CLP', $8, 0.19, $9, $10,
      1, $10,
      'sent', $11, $12, $13,
      '52', $14, $15, $16::timestamptz,
      NOW(), NOW()
    )
    ON CONFLICT (quote_id) DO UPDATE SET
      nubox_last_synced_at = COALESCE($16::timestamptz, greenhouse_finance.quotes.nubox_last_synced_at, NOW()), updated_at = NOW()`,
    [
      quoteId,
      sale.client_id,
      sale.organization_id || null,
      sale.client_trade_name || 'Unknown',
      sale.folio,
      sale.emission_date,
      sale.due_date,
      Number(sale.net_amount ?? 0),
      Number(sale.tax_vat_amount ?? 0),
      Number(sale.total_amount ?? 0),
      String(sale.nubox_sale_id),
      sale.sii_track_id,
      sale.emission_status_name,
      sale.folio,
      sale.emission_date,
      sale.source_last_ingested_at
    ]
  )

  await publishOutboxEvent('finance.quote', quoteId, 'finance.quote.created', {
    quote_id: quoteId, source: 'nubox_sync', nubox_sale_id: sale.nubox_sale_id, total_amount: sale.total_amount
  })

  await syncCanonicalFinanceQuote({ quoteId })

  return 'created'
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const mapDteTypeToIncomeType = (dteCode: string | null): string => {
  switch (dteCode) {
    case '61': return 'credit_note'
    case '56': return 'debit_note'
    case '52':
    case 'COT': return 'quote'
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

    // 2. Project sales to income (or quotes for DTE 52)
    let incomesCreated = 0
    let incomesUpdated = 0
    let quotesCreated = 0
    let quotesUpdated = 0
    let orphanedRecords = 0

    for (const sale of conformedSales) {
      if (sale.dte_type_code === '52' || sale.dte_type_code === 'COT') {
        // Cotizaciones go to quotes table, not income
        const result = await upsertQuoteFromSale(sale)

        if (result === 'created') quotesCreated++
        else if (result === 'updated') quotesUpdated++
        else if (result === 'skipped') orphanedRecords++
      } else {
        const result = await upsertIncomeFromSale(sale)

        if (result === 'created') incomesCreated++
        else if (result === 'updated') incomesUpdated++
        else if (result === 'skipped') orphanedRecords++
      }
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

    // 4. Reconcile bank movements (expenses paid + income collections)
    let expensesReconciled = 0
    let incomesReconciled = 0

    try {
      const bankMovements = await readConformedBankMovements(projectId)

      for (const movement of bankMovements) {
        if (movement.movement_direction === 'debit' && movement.linked_purchase_id) {
          const reconciled = await reconcileExpenseFromBankMovement(movement)

          if (reconciled) expensesReconciled++
        } else if (movement.movement_direction === 'credit' && movement.linked_sale_id) {
          const reconciled = await reconcileIncomeFromBankMovement(movement)

          if (reconciled) incomesReconciled++
        }
      }
    } catch (error) {
      // Reconciliation is best-effort — don't fail the entire sync
      console.error('Bank movement reconciliation error:', error)
    }

    const totalRead = conformedSales.length + conformedPurchases.length

    await writeSyncRun({
      runId: syncRunId,
      status: 'succeeded',
      recordsRead: totalRead,
      notes: `Income: ${incomesCreated} created, ${incomesUpdated} updated. Expenses: ${expensesCreated} created, ${expensesUpdated} updated. Suppliers auto-provisioned: ${suppliersAutoProvisioned}. Reconciled: ${expensesReconciled} expenses, ${incomesReconciled} incomes. Orphaned: ${orphanedRecords}`
    })

    return {
      syncRunId,
      incomesCreated,
      incomesUpdated,
      quotesCreated,
      quotesUpdated,
      expensesCreated,
      expensesUpdated,
      suppliersAutoProvisioned,
      orphanedRecords,
      expensesReconciled,
      incomesReconciled,
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
