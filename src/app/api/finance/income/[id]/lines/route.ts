import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { parsePersistedIncomeTaxSnapshot } from '@/lib/finance/income-tax-snapshot'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface LineItemRow extends Record<string, unknown> {
  line_item_id: string
  income_id: string
  line_number: number
  description: string | null
  quantity: string | number
  unit_price: string | number
  total_amount: string | number
  discount_percent: string | number | null
  is_exempt: boolean
  tax_code: string | null
  tax_rate_snapshot: string | number | null
  tax_amount_snapshot: string | number | null
  tax_snapshot_json: unknown | null
  is_tax_exempt: boolean
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rows = await runGreenhousePostgresQuery<LineItemRow>(
      `SELECT line_item_id, income_id, line_number, description,
              quantity, unit_price, total_amount, discount_percent, is_exempt,
              tax_code, tax_rate_snapshot, tax_amount_snapshot, tax_snapshot_json, is_tax_exempt
       FROM greenhouse_finance.income_line_items
       WHERE income_id = $1
       ORDER BY line_number ASC`,
      [id]
    )

    const items = rows.map(r => ({
      lineItemId: String(r.line_item_id),
      incomeId: String(r.income_id),
      lineNumber: Number(r.line_number),
      description: r.description ? String(r.description) : null,
      quantity: toNumber(r.quantity),
      unitPrice: toNumber(r.unit_price),
      totalAmount: toNumber(r.total_amount),
      discountPercent: r.discount_percent != null ? toNumber(r.discount_percent) : null,
      isExempt: Boolean(r.is_tax_exempt ?? r.is_exempt),
      taxCode: r.tax_code ? String(r.tax_code) : null,
      taxRateSnapshot: r.tax_rate_snapshot != null ? toNumber(r.tax_rate_snapshot) : null,
      taxAmountSnapshot: r.tax_amount_snapshot != null ? toNumber(r.tax_amount_snapshot) : null,
      taxSnapshot: parsePersistedIncomeTaxSnapshot(r.tax_snapshot_json)
    }))

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({ items: [] })
    }

    throw error
  }
}
