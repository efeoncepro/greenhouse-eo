import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { listPendingNuboxExportRfcDispositions } from '@/lib/finance/nubox-export-rfc-disposition/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-990 Slice 4 — Lista las disposiciones pendientes de facturas de
 * exportación Nubox (DTE 110/111/112) cuyo RFC no matcheó automáticamente a una
 * organización. Gated por capability finance.nubox_export.review_disposition
 * (FINANCE_ADMIN + EFEONCE_ADMIN).
 */
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.nubox_export.review_disposition', 'update', 'tenant')) {
    return NextResponse.json(
      { error: 'No tienes permiso para revisar disposiciones de exportación Nubox.', code: 'forbidden' },
      { status: 403 }
    )
  }

  try {
    const items = await listPendingNuboxExportRfcDispositions()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'nubox_export_rfc_dispositions_list_endpoint' }
    })

    return NextResponse.json(
      { error: 'No fue posible listar las disposiciones. Revisa los logs.', code: 'list_failed' },
      { status: 500 }
    )
  }
}
