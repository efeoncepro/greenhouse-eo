import { NextResponse } from 'next/server'

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
    const conditions: string[] = []
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // --- Data query -----------------------------------------------------------
    const limitParam = paramIndex + 1
    const offsetParam = paramIndex + 2

    const dataQuery = `
      SELECT
        ip.payment_id,
        ip.income_id,
        ip.payment_date,
        ip.amount,
        ip.currency,
        ip.reference,
        ip.payment_method,
        ip.payment_source,
        ip.is_reconciled,
        ip.created_at,
        i.invoice_number,
        i.description AS invoice_description,
        i.total_amount AS invoice_total,
        i.client_id,
        COALESCE(i.client_name, cp.legal_name) AS client_name,
        i.exchange_rate_to_clp
      FROM greenhouse_finance.income_payments ip
      INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      LEFT JOIN greenhouse_finance.client_profiles cp ON cp.client_profile_id = i.client_profile_id
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

    // --- Summary KPI query ----------------------------------------------------
    const summaryQuery = `
      SELECT
        COALESCE(SUM(ip.amount * COALESCE(i.exchange_rate_to_clp, 1)), 0) AS total_collected_clp,
        COUNT(*) AS total_payments,
        COUNT(*) FILTER (WHERE NOT ip.is_reconciled) AS unreconciled_count
      FROM greenhouse_finance.income_payments ip
      INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      ${whereClause}
    `

    // --- Execute all three queries in parallel --------------------------------
    const [dataRows, countRows, summaryRows] = await Promise.all([
      runGreenhousePostgresQuery<Record<string, unknown>>(dataQuery, [...params, pageSize, offset]),
      runGreenhousePostgresQuery<Record<string, unknown>>(countQuery, params),
      runGreenhousePostgresQuery<Record<string, unknown>>(summaryQuery, params)
    ])

    const total = toNumber(countRows[0]?.total ?? 0)
    const summaryRow = summaryRows[0] ?? {}

    // --- Normalize rows to camelCase ------------------------------------------
    const items = dataRows.map(row => ({
      paymentId: normalizeString(row.payment_id),
      incomeId: normalizeString(row.income_id),
      paymentDate: toDateString(row.payment_date as string | null),
      amount: roundCurrency(toNumber(row.amount)),
      currency: normalizeString(row.currency),
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
      exchangeRateToClp: row.exchange_rate_to_clp != null ? toNumber(row.exchange_rate_to_clp) : null
    }))

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      summary: {
        totalCollectedClp: roundCurrency(toNumber(summaryRow.total_collected_clp)),
        totalPayments: toNumber(summaryRow.total_payments),
        unreconciledCount: toNumber(summaryRow.unreconciled_count)
      }
    })
  } catch (error) {
    console.error('[cash-in] Unexpected error:', error)

    throw error
  }
}
