import { NextResponse } from 'next/server'

import { requireCommercialTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { materializeInvoiceFromApprovedQuotation } from '@/lib/finance/quote-to-cash/materialize-invoice-from-quotation'
import { closeQuoteToCash, CloseQuoteToCashError } from '@/lib/commercial/quote-to-cash/close-quote-to-cash'
import { isQ2cCanonicalCloseEnabled } from '@/lib/commercial/quote-to-cash/flags'
import { QuoteToCashApprovalRequiredError } from '@/lib/commercial/party/commands/convert-quote-to-cash-types'

export const dynamic = 'force-dynamic'

interface ConvertToInvoiceBody {
  dueDate?: string | null
  idempotencyKey?: string | null
}

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

/**
 * TASK-350 — Simple branch of quote-to-cash.
 *
 * POST /api/finance/quotes/[id]/convert-to-invoice
 * Body: { dueDate?: string (YYYY-MM-DD), idempotencyKey?: string }
 *
 * Materializes an income row directly from an approved (or sent) quotation
 * without requiring OC/HES. Rejected if the quotation has any PO or approved
 * HES linked (use the enterprise branch instead).
 *
 * TASK-1206: cuando `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` está ON, delega en el comando
 * canónico `closeQuoteToCash` (income idempotente + audit Q2C + contrato + party + eventos).
 * Default OFF → path legacy `materializeInvoiceFromApprovedQuotation` (sin audit Q2C). Cutover
 * gateado hasta el staging smoke. La respuesta es backward-compatible (mismos campos + extras).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TASK-1202 — gate fino de accion (capability != route-group).
  if (!can(tenant, 'commercial.quote_to_cash.execute', 'approve', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para convertir una cotizacion en factura.', code: 'forbidden' }, { status: 403 })
  }

  const { id } = await params

  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: ConvertToInvoiceBody = {}

  try {
    body = (await request.json()) as ConvertToInvoiceBody
  } catch {
    body = {}
  }

  // TASK-1206 — camino canónico (flag-gated). Delega en closeQuoteToCash.
  if (isQ2cCanonicalCloseEnabled()) {
    try {
      const result = await closeQuoteToCash({
        quotationId: identity.quotationId,
        strategy: 'simple_invoice',
        subject: buildEntitlementSubjectFromTenant(tenant),
        actor: {
          userId: tenant.userId,
          tenantScope: `${tenant.tenantType}:${tenant.clientId || 'system'}`,
          name: tenant.clientName
        },
        dueDate: body.dueDate ?? null,
        idempotencyKey: body.idempotencyKey ?? null
      })

      return NextResponse.json(
        {
          // backward-compatible shape
          incomeId: result.incomeId,
          quotationId: result.quotationId,
          contractId: result.contractId,
          quotationStatus: 'converted',
          totalAmountClp: result.totalAmountClp,
          // additive (TASK-1206)
          operationId: result.operationId,
          correlationId: result.correlationId,
          strategy: result.strategy,
          finalState: result.finalState,
          replayed: result.replayed
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof QuoteToCashApprovalRequiredError) {
        return NextResponse.json(
          { error: error.message, code: error.code, approvalId: error.approvalId, thresholdClp: error.thresholdClp },
          { status: 202 }
        )
      }

      if (error instanceof CloseQuoteToCashError) {
        return NextResponse.json({ error: error.message, code: error.code, actionable: error.actionable }, { status: error.statusCode })
      }

      console.error('[api/finance/quotes/convert-to-invoice] closeQuoteToCash failed', error)

      return NextResponse.json({ error: 'No se pudo cerrar la cotización a factura.', code: 'quote_to_cash_unexpected' }, { status: 500 })
    }
  }

  // Legacy path (flag OFF) — sin audit Q2C. Se retira en el cutover.
  try {
    const result = await materializeInvoiceFromApprovedQuotation({
      quotationId: identity.quotationId,
      actor: {
        userId: tenant.userId,
        name: tenant.clientName || tenant.userId
      },
      dueDate: body.dueDate ?? null
    })

    return NextResponse.json(
      {
        incomeId: result.incomeId,
        quotationId: result.quotationId,
        contractId: result.contractId,
        quotationStatus: result.quotationStatus,
        totalAmountClp: result.totalAmountClp
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al materializar la factura.'

    const status = message.includes('already converted')
      ? 409
      : message.includes('not found')
        ? 404
        : message.includes('must be in status')
          ? 409
          : message.includes('enterprise branch')
            ? 409
            : 400

    return NextResponse.json({ error: message }, { status })
  }
}
