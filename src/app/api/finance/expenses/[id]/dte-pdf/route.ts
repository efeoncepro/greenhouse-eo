import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getNuboxPurchasePdf } from '@/lib/nubox/client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: expenseId } = await params

  const rows = await runGreenhousePostgresQuery<{ nubox_purchase_id: number | null; document_number: string | null }>(
    `SELECT nubox_purchase_id, document_number FROM greenhouse_finance.expenses WHERE expense_id = $1`,
    [expenseId]
  )

  if (rows.length === 0 || !rows[0].nubox_purchase_id) {
    return NextResponse.json({ error: 'No Nubox purchase linked to this expense' }, { status: 404 })
  }

  try {
    const pdfBuffer = await getNuboxPurchasePdf(rows[0].nubox_purchase_id)
    const docNum = rows[0].document_number || rows[0].nubox_purchase_id

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Compra-${docNum}.pdf"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Expense PDF download failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
