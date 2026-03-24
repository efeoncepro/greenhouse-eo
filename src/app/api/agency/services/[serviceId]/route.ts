import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { getServiceDetail, updateService, deactivateService } from '@/lib/services/service-store'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serviceId } = await params
  const detail = await getServiceDetail(serviceId)

  if (!detail) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serviceId } = await params
  const body = await request.json()

  const result = await updateService(serviceId, body, tenant.userId)

  if (!result.updated) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  return NextResponse.json({ serviceId, updated: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serviceId } = await params

  const result = await deactivateService(serviceId, tenant.userId)

  return NextResponse.json({ serviceId, ...result })
}
