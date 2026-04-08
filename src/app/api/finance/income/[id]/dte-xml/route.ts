import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getNuboxSaleXml } from '@/lib/nubox/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: incomeId } = await params

  const rows = await runGreenhousePostgresQuery<{ nubox_document_id: number | null; dte_folio: string | null }>(
    `SELECT nubox_document_id, dte_folio FROM greenhouse_finance.income WHERE income_id = $1`,
    [incomeId]
  )

  if (rows.length === 0 || !rows[0].nubox_document_id) {
    return NextResponse.json({ error: 'No DTE emitted for this income' }, { status: 404 })
  }

  try {
    const xml = await getNuboxSaleXml(rows[0].nubox_document_id)
    const folio = rows[0].dte_folio || rows[0].nubox_document_id

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="DTE-${folio}.xml"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('DTE XML download failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
