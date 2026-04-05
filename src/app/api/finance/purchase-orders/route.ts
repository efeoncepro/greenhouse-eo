import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolveFinanceDownstreamScope } from '@/lib/finance/canonical'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { FinanceValidationError } from '@/lib/finance/shared'
import { listPurchaseOrders, createPurchaseOrder } from '@/lib/finance/purchase-order-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined
  const organizationId = searchParams.get('organizationId') || undefined
  const clientProfileId = searchParams.get('clientProfileId') || undefined
  const hubspotCompanyId = searchParams.get('hubspotCompanyId') || undefined
  const requestedSpaceId = searchParams.get('spaceId') || undefined
  const status = searchParams.get('status') || undefined

  try {
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

    const items = await listPurchaseOrders({
      clientId: resolvedScope?.clientId ?? clientId,
      organizationId: resolvedScope?.organizationId ?? organizationId,
      spaceId: resolvedScope?.spaceId ?? requestedSpaceId,
      status
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('purchase orders', error)

      return financeSchemaDriftResponse('purchase orders', { items: [], total: 0 })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { poNumber, authorizedAmount, issueDate } = body

  if (!poNumber || !authorizedAmount || !issueDate) {
    return NextResponse.json(
      { error: 'Missing required fields: poNumber, authorizedAmount, issueDate' },
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

    const result = await createPurchaseOrder({
      poNumber,
      clientId: resolvedScope.clientId!,
      organizationId: resolvedScope.organizationId,
      spaceId: resolvedScope.spaceId ?? tenant.spaceId ?? null,
      authorizedAmount: Number(authorizedAmount),
      currency: body.currency,
      exchangeRateToClp: body.exchangeRateToClp ? Number(body.exchangeRateToClp) : undefined,
      issueDate,
      expiryDate: body.expiryDate,
      description: body.description,
      serviceScope: body.serviceScope,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      attachmentAssetId: body.attachmentAssetId,
      notes: body.notes,
      attachmentUrl: body.attachmentUrl,
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
