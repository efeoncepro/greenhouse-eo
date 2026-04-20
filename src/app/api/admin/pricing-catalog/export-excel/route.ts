import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { buildPricingCatalogWorkbook } from '@/lib/commercial/pricing-catalog-excel'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pricing-catalog/export-excel
 *
 * TASK-471 slice 6 — Excel export del catálogo vigente.
 * Devuelve un workbook multi-sheet (Roles + Tools + Overheads + Metadata)
 * con Content-Disposition attachment para download directo.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await getServerAuthSession()
  const actor = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'

  try {
    const buffer = await buildPricingCatalogWorkbook({
      exportedAt: new Date().toISOString(),
      exportedBy: actor,
      schemaVersion: 'v1'
    })

    const filename = `pricing-catalog-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('[TASK-471] Failed to build pricing catalog workbook', error)

    return NextResponse.json({ error: 'Failed to generate Excel export.' }, { status: 500 })
  }
}
