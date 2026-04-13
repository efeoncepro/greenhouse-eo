import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceDownstreamScope } from '@/lib/finance/canonical'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { FinanceValidationError } from '@/lib/finance/shared'
import { listHes, createHes } from '@/lib/finance/hes-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const clientId = searchParams.get('clientId') || undefined
    const organizationId = searchParams.get('organizationId') || undefined
    const clientProfileId = searchParams.get('clientProfileId') || undefined
    const hubspotCompanyId = searchParams.get('hubspotCompanyId') || undefined
    const requestedSpaceId = searchParams.get('spaceId') || undefined

    const resolvedScope =
      clientId || organizationId || clientProfileId || hubspotCompanyId || requestedSpaceId
        ? await resolveFinanceDownstreamScope({
            clientId,
            organizationId,
            clientProfileId,
            hubspotCompanyId,
            requestedSpaceId
          })
        : null

    const items = await listHes({
      clientId: resolvedScope?.clientId ?? clientId,
      organizationId: resolvedScope?.organizationId ?? organizationId,
      spaceId: resolvedScope?.spaceId ?? requestedSpaceId,
      status: searchParams.get('status') || undefined,
      purchaseOrderId: searchParams.get('purchaseOrderId') || undefined
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('hes', error)

      return financeSchemaDriftResponse('hes', { items: [], total: 0 })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.hesNumber || !body.serviceDescription || !body.amount) {
    return NextResponse.json(
      { error: 'Faltan campos obligatorios: hesNumber, serviceDescription, amount' },
      { status: 400 }
    )
  }

  try {
    const resolvedScope = await resolveFinanceDownstreamScope({
      clientId: body.clientId,
      organizationId: body.organizationId,
      clientProfileId: body.clientProfileId,
      hubspotCompanyId: body.hubspotCompanyId,
      requestedSpaceId: body.spaceId ?? tenant.spaceId,
      requireLegacyClientBridge: true
    })

    const result = await createHes({
      ...body,
      clientId: resolvedScope.clientId!,
      organizationId: resolvedScope.organizationId,
      spaceId: resolvedScope.spaceId ?? tenant.spaceId ?? null,
      createdBy: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
