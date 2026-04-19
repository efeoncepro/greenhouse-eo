import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

import {
  listApprovalSteps,
  requestApproval,
  decideApprovalStep
} from '@/lib/commercial/governance/approval-steps-store'
import {
  publishQuotationApprovalDecided,
  publishQuotationApprovalRequested,
  publishQuotationApproved
} from '@/lib/commercial/quotation-events'
import {
  checkDiscountHealth,
  resolveMarginTarget,
  resolveQuotationIdentity
} from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuotationGovernanceRow extends Record<string, unknown> {
  business_line_code: string | null
  pricing_model: string
  total_cost: string | number | null
  total_price_before_discount: string | number | null
  total_discount: string | number | null
  total_price: string | number | null
  effective_margin_pct: string | number | null
  target_margin_pct: string | number | null
  margin_floor_pct: string | number | null
  current_version: number
  quote_date: string | Date | null
  status: string
}

const toDateString = (value: string | Date | null): string => {
  if (!value) return new Date().toISOString().slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  if (!identity.spaceId) {
    return NextResponse.json(
      { error: 'La cotización no tiene un scope tenant válido.' },
      { status: 409 }
    )
  }

  const steps = await listApprovalSteps(identity.quotationId, identity.spaceId)

  return NextResponse.json({ quotationId: identity.quotationId, items: steps, total: steps.length })
}

interface DecideBody {
  action?: 'request' | 'decide'
  stepId?: string
  decision?: 'approved' | 'rejected'
  notes?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  if (!identity.spaceId) {
    return NextResponse.json(
      { error: 'La cotización no tiene un scope tenant válido.' },
      { status: 409 }
    )
  }

  let body: DecideBody

  try {
    body = (await request.json()) as DecideBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const action = body.action ?? (body.stepId ? 'decide' : 'request')

  const actor = {
    userId: tenant.userId,
    name: tenant.clientName || tenant.userId,
    roleCodes: tenant.roleCodes
  }

  if (action === 'request') {
    const headerRows = await query<QuotationGovernanceRow>(
      `SELECT business_line_code, pricing_model, total_cost, total_price_before_discount,
              total_discount, total_price, effective_margin_pct, target_margin_pct,
              margin_floor_pct, current_version, quote_date, status
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
           AND space_id = $2`,
      [identity.quotationId, identity.spaceId]
    )

    const header = headerRows[0]

    if (!header) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const lineRows = await query<{
      line_item_id: string
      subtotal_after_discount: string | number | null
      subtotal_cost: string | number | null
    }>(
      `SELECT line_item_id, subtotal_after_discount, subtotal_cost
         FROM greenhouse_commercial.quotation_line_items
         WHERE quotation_id = $1 AND version_number = $2`,
      [identity.quotationId, header.current_version]
    )

    const marginResolution = await resolveMarginTarget({
      businessLineCode: header.business_line_code,
      quoteDate: toDateString(header.quote_date),
      quotationOverride:
        toNumberOrNull(header.target_margin_pct) !== null &&
        toNumberOrNull(header.margin_floor_pct) !== null
          ? {
              targetMarginPct: Number(header.target_margin_pct),
              floorMarginPct: Number(header.margin_floor_pct)
            }
          : null
    })

    const health = checkDiscountHealth({
      totals: {
        totalCost: Number(header.total_cost ?? 0),
        totalPriceBeforeDiscount: Number(header.total_price_before_discount ?? 0),
        totalDiscount: Number(header.total_discount ?? 0),
        totalPrice: Number(header.total_price ?? 0),
        effectiveMarginPct: toNumberOrNull(header.effective_margin_pct)
      },
      marginTargetPct: marginResolution.targetMarginPct,
      marginFloorPct: marginResolution.floorMarginPct,
      lineItems: lineRows.map(line => ({
        lineItemId: line.line_item_id,
        subtotalAfterDiscount: Number(line.subtotal_after_discount ?? 0),
        subtotalCost: toNumberOrNull(line.subtotal_cost)
      }))
    })

    const result = await requestApproval({
      quotationId: identity.quotationId,
      versionNumber: header.current_version,
      spaceId: identity.spaceId,
      actor: { userId: actor.userId, name: actor.name },
      evaluationInput: {
        businessLineCode: header.business_line_code,
        pricingModel: header.pricing_model as 'staff_aug' | 'retainer' | 'project',
        quotationMarginPct: health.quotationMarginPct,
        marginTargetPct: health.marginTargetPct,
        marginFloorPct: health.marginFloorPct,
        totalPrice: Number(header.total_price ?? 0),
        discountPct: health.discountPct
      }
    })

    if (result.steps.length === 0) {
      return NextResponse.json({
        quotationId: identity.quotationId,
        steps: [],
        approvalRequired: false,
        message: 'No se cumplió ninguna condición de aprobación. La cotización puede enviarse sin aprobación previa.'
      })
    }

    if (result.quotationStatusChanged) {
      await publishQuotationApprovalRequested({
        quotationId: identity.quotationId,
        versionNumber: header.current_version,
        steps: result.steps.map(step => ({
          stepId: step.stepId,
          requiredRole: step.requiredRole,
          conditionLabel: step.conditionLabel
        })),
        requestedBy: tenant.userId
      })
    }

    return NextResponse.json({
      quotationId: identity.quotationId,
      steps: result.steps,
      approvalRequired: true,
      newStatus: 'pending_approval'
    })
  }

  if (action === 'decide') {
    if (!body.stepId || !body.decision) {
      return NextResponse.json(
        { error: 'stepId y decision son requeridos para decidir una aprobación.' },
        { status: 400 }
      )
    }

    if (body.decision !== 'approved' && body.decision !== 'rejected') {
      return NextResponse.json(
        { error: `decision inválida: ${body.decision}` },
        { status: 400 }
      )
    }

    try {
      const decision = await decideApprovalStep({
        stepId: body.stepId,
        decision: body.decision,
        actor,
        spaceId: identity.spaceId,
        notes: body.notes ?? null
      })

      await publishQuotationApprovalDecided({
        quotationId: decision.quotationId,
        versionNumber: decision.versionNumber,
        stepId: decision.step.stepId,
        decision: body.decision,
        decidedBy: tenant.userId,
        conditionLabel: decision.step.conditionLabel,
        notes: body.notes ?? null,
        resultingStatus: decision.quotationNewStatus
      })

      if (decision.quotationNewStatus === 'sent') {
        await publishQuotationApproved({
          quotationId: decision.quotationId,
          approvedBy: tenant.userId
        })
      }

      return NextResponse.json({
        quotationId: decision.quotationId,
        step: decision.step,
        allResolved: decision.allResolved,
        anyRejected: decision.anyRejected,
        newStatus: decision.quotationNewStatus
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al decidir aprobación.'

      const status = message.includes('already decided')
        ? 409
        : message.includes('not found')
          ? 404
          : message.includes('required role')
            ? 403
            : 400

      return NextResponse.json({ error: message }, { status })
    }
  }

  return NextResponse.json(
    { error: `action inválida: ${action}` },
    { status: 400 }
  )
}
