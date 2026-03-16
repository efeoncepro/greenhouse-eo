import { NextResponse } from 'next/server'

import { requireInternalTenantContext, requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationDetail, updateOrganization } from '@/lib/account-360/organization-store'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const detail = await getOrganizationDetail(id)

  if (!detail) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const result = await updateOrganization(id, body)

  if (!result.updated) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  return NextResponse.json({ organizationId: id, updated: true })
}
