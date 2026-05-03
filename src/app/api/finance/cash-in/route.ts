import { NextResponse } from 'next/server'

import { sumIncomePaymentsClpForPeriod } from '@/lib/finance/income-payments-reader'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  toNumber,
  toDateString,
  toTimestampString,
  normalizeString,
  roundCurrency
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/cash-in
 *
 * Returns a consolidated list of all income payments (cash received)
 * with joined income context.
 *
 * Query params:
 *   fromDate    — YYYY-MM-DD, inclusive lower bound on payment_date
 *   toDate      — YYYY-MM-DD, inclusive upper bound on payment_date
 *   clientId    — filter by income.client_id
 *   isReconciled — "true" or "false"
 *   page        — page number (default 1)
 *   pageSize    — rows per page (default 50, max 200)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)

    // --- Parse query params ---------------------------------------------------
    const fromDate = url.searchParams.get('fromDate')
    const toDate = url.searchParams.get('toDate')
    const clientId = url.searchParams.get('clientId')
    const isReconciledParam = url.searchParams.get('isReconciled')

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50))
    const offset = (page - 1) * pageSize

    // --- Build dynamic WHERE clause ------------------------------------------
    // TASK-766: detail/count queries siguen leyendo de income_payments raw (la
    // VIEW expone solo subset de columnas + JOIN; estos queries necesitan campos
    // del income/client_profile/account). Pero filtramos 3-axis supersede
    // explicitamente para que data list + count + summary tengan paridad
    // (la VIEW lo filtra automaticamente; aqui replicamos la condicion).
    const conditions: string[] = [
      'ip.superseded_by_payment_id IS NULL',
      'ip.superseded_by_otb_id IS NULL',
      'ip.superseded_at IS NULL'
    ]

    const params: unknown[] = []
    let paramIndex = 0

    if (fromDate) {
      paramIndex++
      conditions.push(`ip.payment_date >= $${paramIndex}`)
      params.push(fromDate)
    }

    if (toDate) {
      paramIndex++
      conditions.push(`ip.payment_date <= $${paramIndex}`)
      params.push(toDate)
    }

    if (clientId) {
      paramIndex++
      conditions.push(`i.client_id = $${paramIndex}`)
      params.push(clientId)
    }

    if (isReconciledParam === 'true' || isReconciledParam === 'false') {
      paramIndex++
      conditions.push(`ip.is_reconciled = $${paramIndex}`)
      params.push(isReconciledParam === 'true')
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    // --- Data query -----------------------------------------------------------
    const limitParam = paramIndex + 1
    const offsetParam = paramIndex + 2

    const dataQuery = `
      SELECT
        ip.payment_id,
        ip.income_id,
        ip.payment_date,
        ip.amount,
        ip.amount_clp,
        ip.currency,
        ip.reference,
        ip.payment_method,
        ip.payment_source,
        ip.is_reconciled,
        ip.created_at,
        ip.payment_account_id,
        i.invoice_number,
        i.description AS invoice_description,
        i.total_amount AS invoice_total,
        i.client_id,
        COALESCE(i.client_name, cp.legal_name) AS client_name,
        i.exchange_rate_to_clp,
        a.account_name AS payment_account_name,
        a.provider_slug AS payment_provider_slug,
        a.instrument_category AS payment_instrument_category
      FROM greenhouse_finance.income_payments ip
      INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      LEFT JOIN greenhouse_finance.client_profiles cp ON cp.client_profile_id = i.client_profile_id
      LEFT JOIN greenhouse_finance.accounts a ON a.account_id = ip.payment_account_id
      ${whereClause}
      ORDER BY ip.payment_date DESC, ip.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    // --- Count query ----------------------------------------------------------
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM greenhouse_finance.income_payments ip
      INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      ${whereClause}
    `

    // --- Summary KPIs (TASK-766 — canonical CLP reader) ----------------------
    // Reemplaza el anti-patron `SUM(ip.amount * COALESCE(i.exchange_rate_to_clp, 1))`.
    //
    // Caso comun (sin clientId): delega al helper canonico
    //   `sumIncomePaymentsClpForPeriod` que lee de VIEW income_payments_normalized.
    // Caso con clientId: SELECT directo a la VIEW con INNER JOIN a income
    //   (helper no expone filtro por client_id), preservando payment_amount_clp
    //   canonico + 3-axis supersede automatico de la VIEW.
    //
    // En ambos paths la fuente de verdad es VIEW income_payments_normalized
    // con `payment_amount_clp` resuelto via COALESCE canonica. Ver
    // src/lib/finance/income-payments-reader.ts para reglas duras.
    const summaryPromise = clientId
      ? (async () => {
          const summaryConditions: string[] = []
          const summaryParams: unknown[] = []
          let idx = 0

          if (fromDate) {
            idx++
            summaryConditions.push(`ipn.payment_date >= $${idx}`)
            summaryParams.push(fromDate)
          }

          if (toDate) {
            idx++
            summaryConditions.push(`ipn.payment_date <= $${idx}`)
            summaryParams.push(toDate)
          }

          idx++
          summaryConditions.push(`i.client_id = $${idx}`)
          summaryParams.push(clientId)

          if (isReconciledParam === 'true' || isReconciledParam === 'false') {
            idx++
            summaryConditions.push(`ipn.is_reconciled = $${idx}`)
            summaryParams.push(isReconciledParam === 'true')
          }

          const summaryWhere = summaryConditions.length > 0 ? `WHERE ${summaryConditions.join(' AND ')}` : ''

          const summaryRows = await runGreenhousePostgresQuery<{
            total_collected_clp: string | number | null
            total_payments: string | number | null
            unreconciled_count: string | number | null
            drift_count: string | number | null
          }>(
            `
            SELECT
              COALESCE(SUM(ipn.payment_amount_clp), 0) AS total_collected_clp,
              COUNT(*) AS total_payments,
              COUNT(*) FILTER (WHERE NOT ipn.is_reconciled) AS unreconciled_count,
              COUNT(*) FILTER (WHERE ipn.has_clp_drift) AS drift_count
            FROM greenhouse_finance.income_payments_normalized ipn
            INNER JOIN greenhouse_finance.income i ON i.income_id = ipn.income_id
            ${summaryWhere}
            `,
            summaryParams
          )

          const row = summaryRows[0] ?? {}

          return {
            totalClp: roundCurrency(toNumber(row.total_collected_clp)),
            totalPayments: toNumber(row.total_payments),
            unreconciledCount: toNumber(row.unreconciled_count),
            driftCount: toNumber(row.drift_count)
          }
        })()
      : sumIncomePaymentsClpForPeriod({
          fromDate: fromDate ?? '0001-01-01',
          toDate: toDate ?? '9999-12-31',
          isReconciled:
            isReconciledParam === 'true'
              ? true
              : isReconciledParam === 'false'
                ? false
                : undefined
        })

    const [dataRows, countRows, summary] = await Promise.all([
      runGreenhousePostgresQuery<Record<string, unknown>>(dataQuery, [...params, pageSize, offset]),
      runGreenhousePostgresQuery<Record<string, unknown>>(countQuery, params),
      summaryPromise
    ])

    const total = toNumber(countRows[0]?.total ?? 0)

    // --- Normalize rows to camelCase ------------------------------------------
    // TASK-774 Slice 7 — exponer SIEMPRE amountClp (FX-resolved) lado a lado
    // con amount (currency original). Consumers UI deben preferir amountClp
    // para mostrar saldo CLP. Cola de conciliacion usa amountClp.
    const items = dataRows.map(row => {
      const amountNative = roundCurrency(toNumber(row.amount))
      const currency = normalizeString(row.currency)
      const amountClpRaw = row.amount_clp != null ? roundCurrency(toNumber(row.amount_clp)) : 0
      const amountClp = amountClpRaw > 0 ? amountClpRaw : (currency === 'CLP' ? amountNative : 0)
      const hasClpDrift = currency !== 'CLP' && amountClpRaw === 0

      return ({
      paymentId: normalizeString(row.payment_id),
      incomeId: normalizeString(row.income_id),
      paymentDate: toDateString(row.payment_date as string | null),
      amount: amountNative,
      amountClp,
      hasClpDrift,
      currency,
      reference: row.reference ? normalizeString(row.reference) : null,
      paymentMethod: row.payment_method ? normalizeString(row.payment_method) : null,
      paymentSource: row.payment_source ? normalizeString(row.payment_source) : null,
      isReconciled: row.is_reconciled === true,
      createdAt: toTimestampString(row.created_at as string | null),
      invoiceNumber: row.invoice_number ? normalizeString(row.invoice_number) : null,
      invoiceDescription: row.invoice_description ? normalizeString(row.invoice_description) : null,
      invoiceTotal: row.invoice_total != null ? roundCurrency(toNumber(row.invoice_total)) : null,
      clientId: row.client_id ? normalizeString(row.client_id) : null,
      clientName: row.client_name ? normalizeString(row.client_name) : null,
      exchangeRateToClp: row.exchange_rate_to_clp != null ? toNumber(row.exchange_rate_to_clp) : null,
      paymentAccountId: row.payment_account_id ? normalizeString(row.payment_account_id) : null,
      paymentAccountName: row.payment_account_name ? normalizeString(row.payment_account_name) : null,
      paymentProviderSlug: row.payment_provider_slug ? normalizeString(row.payment_provider_slug) : null,
      paymentInstrumentCategory: row.payment_instrument_category ? normalizeString(row.payment_instrument_category) : null
      })
    })

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      summary: {
        totalCollectedClp: summary.totalClp,
        totalPayments: summary.totalPayments,
        unreconciledCount: summary.unreconciledCount,
        // TASK-766 — drift count expuesto al UI para que un valor > 0 sea
        // visible (preludio del banner reliability + reparable via
        // POST /api/admin/finance/payments-clp-repair).
        driftCount: summary.driftCount
      }
    })
  } catch (error) {
    console.error('[cash-in] Unexpected error:', error)

    throw error
  }
}
