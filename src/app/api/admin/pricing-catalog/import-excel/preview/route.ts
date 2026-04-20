import { NextResponse } from 'next/server'

import { previewPricingCatalogExcelImport } from '@/lib/commercial/pricing-catalog-excel'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/pricing-catalog/import-excel/preview
 *
 * TASK-471 slice 6 — Parse Excel + generar diff contra estado actual de DB.
 * No persiste nada. Body: multipart/form-data con campo "file".
 *
 * V1: solo procesa sheet "Roles". Tools + overheads se exportan pero el
 * import-apply queda como follow-up.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing "file" field.' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are accepted.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await previewPricingCatalogExcelImport(buffer)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[TASK-471] Failed to preview pricing catalog Excel import', error)

    return NextResponse.json(
      { error: 'Failed to parse Excel file.' },
      { status: 500 }
    )
  }
}
