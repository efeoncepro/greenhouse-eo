import { NextResponse } from 'next/server'

import {
  convertQuoteToCash,
  QuoteToCashApprovalRequiredError,
  QuoteToCashError,
  QuoteToCashMissingAnchorsError,
  QuotationNotConvertibleError,
  QuotationNotFoundError
} from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const buildEntitlementSubjectFromTenant = (tenant: TenantContext): TenantEntitlementSubject => ({
  userId: tenant.userId,
  tenantType: tenant.tenantType,
  roleCodes: tenant.roleCodes,
  primaryRoleCode: tenant.primaryRoleCode,
  routeGroups: tenant.routeGroups,
  authorizedViews: [],
  projectScopes: tenant.projectScopes,
  campaignScopes: tenant.campaignScopes,
  businessLines: tenant.businessLines,
  serviceModules: tenant.serviceModules,
  portalHomePath: tenant.portalHomePath
})

// TASK-541 Fase G: explicit operator-triggered quote-to-cash conversion.
// POST /api/commercial/quotations/:id/convert-to-cash
//
// Auth: `requireFinanceTenantContext` + capability `commercial.quote_to_cash.execute`.
// The command itself owns idempotency, transactionality, and the dual
// approval gate. The route translates domain errors into the matching HTTP
// status codes and respects the 202 semantic when an approval is queued.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quotationId } = await params
  const normalizedQuotationId = quotationId?.trim()

  if (!normalizedQuotationId) {
    return NextResponse.json({ error: 'quotation id is required' }, { status: 400 })
  }

  const subject = buildEntitlementSubjectFromTenant(tenant)
  const canExecute = hasEntitlement(subject, 'commercial.quote_to_cash.execute', 'approve')

  if (!canExecute) {
    return NextResponse.json(
      { error: 'Missing capability commercial.quote_to_cash.execute' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown> = {}

  try {
    const raw = await request.text()

    if (raw.trim()) {
      body = JSON.parse(raw) as Record<string, unknown>
    }
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const tenantScope = `${tenant.tenantType}:${tenant.clientId || 'system'}`

  try {
    const result = await convertQuoteToCash({
      quotationId: normalizedQuotationId,
      conversionTriggeredBy: 'operator',
      hubspotDealId: typeof body.hubspotDealId === 'string' ? body.hubspotDealId : null,
      correlationId: typeof body.correlationId === 'string' ? body.correlationId : undefined,
      skipApprovalGate: body.skipApprovalGate === true,
      actor: {
        userId: tenant.userId,
        tenantScope,
        name: tenant.clientName
      }
    })

    const status = result.status === 'completed' || result.status === 'idempotent_hit' ? 200 : 202

    return NextResponse.json(result, { status })
  } catch (error) {
    if (error instanceof QuoteToCashApprovalRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          approvalId: error.approvalId,
          thresholdClp: error.thresholdClp
        },
        { status: 202 }
      )
    }

    if (
      error instanceof QuotationNotFoundError
      || error instanceof QuotationNotConvertibleError
      || error instanceof QuoteToCashMissingAnchorsError
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    if (error instanceof QuoteToCashError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error('[api/commercial/quotations/convert-to-cash] unexpected error', error)

    return NextResponse.json(
      { error: 'Quote-to-cash choreography failed', code: 'QUOTE_TO_CASH_UNEXPECTED' },
      { status: 500 }
    )
  }
}
