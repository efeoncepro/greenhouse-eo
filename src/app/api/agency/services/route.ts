import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { getServiceList, createService } from '@/lib/services/service-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || '50') || 50))
  const search = searchParams.get('search') || undefined
  const spaceId = searchParams.get('spaceId') || undefined
  const organizationId = searchParams.get('organizationId') || undefined
  const lineaDeServicio = searchParams.get('lineaDeServicio') || undefined
  const pipelineStage = searchParams.get('pipelineStage') || undefined

  const result = await getServiceList({
    page, pageSize, search,
    spaceId, organizationId, lineaDeServicio, pipelineStage
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.name || !body.spaceId || !body.lineaDeServicio || !body.servicioEspecifico) {
    return NextResponse.json(
      { error: 'name, spaceId, lineaDeServicio, and servicioEspecifico are required.' },
      { status: 400 }
    )
  }

  const result = await createService({
    name: body.name,
    spaceId: body.spaceId,
    organizationId: body.organizationId,
    hubspotCompanyId: body.hubspotCompanyId,
    hubspotDealId: body.hubspotDealId,
    lineaDeServicio: body.lineaDeServicio,
    servicioEspecifico: body.servicioEspecifico,
    pipelineStage: body.pipelineStage,
    startDate: body.startDate,
    targetEndDate: body.targetEndDate,
    totalCost: body.totalCost,
    currency: body.currency,
    modalidad: body.modalidad,
    billingFrequency: body.billingFrequency,
    country: body.country,
    notionProjectId: body.notionProjectId,
    createdBy: tenant.userId
  })

  return NextResponse.json(result, { status: 201 })
}
