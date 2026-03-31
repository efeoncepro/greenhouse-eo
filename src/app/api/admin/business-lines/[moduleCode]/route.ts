import { NextResponse } from 'next/server'

import { loadBusinessLineMetadataByCode, updateBusinessLineMetadata } from '@/lib/business-line/metadata'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ moduleCode: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleCode } = await params
  const metadata = await loadBusinessLineMetadataByCode(moduleCode)

  if (!metadata) {
    return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
  }

  return NextResponse.json(metadata)
}

export async function PUT(request: Request, { params }: { params: Promise<{ moduleCode: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleCode } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowedFields = [
    'label', 'labelFull', 'claim', 'leadIdentityProfileId', 'leadName',
    'description', 'iconName', 'colorHex', 'colorBg', 'isActive', 'sortOrder'
  ] as const

  const patch: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in body) {
      patch[field] = body[field]
    }
  }

  const updated = await updateBusinessLineMetadata(moduleCode, patch)

  if (!updated) {
    return NextResponse.json({ error: 'Business line not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
