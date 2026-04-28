import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface AccountRow {
  account_id: string
  account_name: string
  currency: string
  instrument_category: string
}

/**
 * TASK-708 Slice 6 — Lista cuentas activas para el dropdown del modal Adoptar.
 *
 * Filtrable por `currency` (la signal trae su currency; el modal pre-filtra el
 * dropdown a cuentas con la misma moneda para reducir errores).
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const currencyParam = searchParams.get('currency')?.toUpperCase().trim() || null

    const rows = currencyParam
      ? await runGreenhousePostgresQuery<AccountRow & Record<string, unknown>>(
          `
            SELECT account_id, account_name, currency, instrument_category
            FROM greenhouse_finance.accounts
            WHERE is_active = TRUE
              AND currency = $1
            ORDER BY account_name ASC
          `,
          [currencyParam]
        )
      : await runGreenhousePostgresQuery<AccountRow & Record<string, unknown>>(
          `
            SELECT account_id, account_name, currency, instrument_category
            FROM greenhouse_finance.accounts
            WHERE is_active = TRUE
            ORDER BY account_name ASC
          `
        )

    return NextResponse.json(
      {
        items: rows.map(row => ({
          accountId: row.account_id,
          accountName: row.account_name,
          currency: row.currency,
          instrumentCategory: row.instrument_category
        }))
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    captureWithDomain(error, 'finance', { tags: { source: 'finance_admin', op: 'external_signals_accounts' } })

    return NextResponse.json({ error: 'Error al cargar cuentas.' }, { status: 500 })
  }
}
