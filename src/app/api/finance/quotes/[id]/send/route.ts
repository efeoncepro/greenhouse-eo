import { NextResponse } from 'next/server'

import { query, withTransaction } from '@/lib/db'
import { captureSalesContextAtSent } from '@/lib/commercial/sales-context'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { requestApproval } from '@/lib/commercial/governance/approval-steps-store'
import {
  publishQuotationApprovalRequested,
  publishQuotationSent
} from '@/lib/commercial/quotation-events'
import {
  checkDiscountHealth,
  resolveMarginTarget,
  resolveQuotationIdentity
} from '@/lib/finance/pricing'
import {
  quotationIdentityHasTenantAnchor,
  tenantCanAccessQuotationIdentity
} from '@/lib/finance/pricing/quotation-tenant-access'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuotationHeaderRow extends Record<string, unknown> {
  business_line_code: string | null
  pricing_model: string
  commercial_model: string | null
  staffing_model: string | null
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

interface QuotationLineRow extends Record<string, unknown> {
  line_item_id: string
  subtotal_after_discount: string | number | null
  subtotal_cost: string | number | null
}

const toIsoDate = (value: string | Date | null): string => {
  if (!value) return new Date().toISOString().slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(
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

  if (!quotationIdentityHasTenantAnchor(identity)) {
    return NextResponse.json(
      { error: 'La cotización no tiene un scope tenant válido.' },
      { status: 409 }
    )
  }

  if (!(await tenantCanAccessQuotationIdentity({ tenant, identity }))) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const headerRows = await query<QuotationHeaderRow>(
    `SELECT business_line_code, pricing_model, commercial_model, staffing_model, total_cost, total_price_before_discount,
            total_discount, total_price, effective_margin_pct, target_margin_pct,
            margin_floor_pct, current_version, quote_date, status
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
         AND (
           ($2::text IS NOT NULL AND organization_id = $2)
           OR ($3::text IS NOT NULL AND space_id = $3)
         )`,
    [identity.quotationId, identity.organizationId, identity.spaceId]
  )

  const header = headerRows[0]

  if (!header) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const currentStatus = header.status

  if (currentStatus === 'sent') {
    return NextResponse.json(
      { error: 'La cotización ya fue enviada.' },
      { status: 409 }
    )
  }

  if (currentStatus === 'approved') {
    return NextResponse.json(
      { error: 'La cotización ya está aprobada y no puede enviarse nuevamente.' },
      { status: 409 }
    )
  }

  if (currentStatus === 'converted') {
    return NextResponse.json(
      { error: 'La cotización ya fue convertida en una venta.' },
      { status: 409 }
    )
  }

  if (currentStatus === 'pending_approval') {
    return NextResponse.json(
      {
        error:
          'La cotización está en aprobación. Resuelve los pasos pendientes primero.'
      },
      { status: 409 }
    )
  }

  if (currentStatus === 'rejected') {
    return NextResponse.json(
      { error: 'La cotización fue rechazada y no puede enviarse.' },
      { status: 409 }
    )
  }

  if (currentStatus === 'expired') {
    return NextResponse.json(
      { error: 'La cotización está expirada. Genera una nueva versión antes de enviarla.' },
      { status: 409 }
    )
  }

  if (currentStatus !== 'draft') {
    return NextResponse.json(
      { error: `Estado inválido para envío: ${currentStatus}.` },
      { status: 409 }
    )
  }

  // Build discount health + margin resolution input from canonical header.
  const lineRows = await query<QuotationLineRow>(
    `SELECT line_item_id, subtotal_after_discount, subtotal_cost
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2`,
    [identity.quotationId, header.current_version]
  )

  const marginResolution = await resolveMarginTarget({
    businessLineCode: header.business_line_code,
    quoteDate: toIsoDate(header.quote_date),
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

  if (health.requiresApproval) {
    const result = await requestApproval({
      quotationId: identity.quotationId,
      versionNumber: header.current_version,
      spaceId: identity.spaceId,
      actor: { userId: tenant.userId, name: tenant.clientName || tenant.userId },
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

    await recordAudit({
      quotationId: identity.quotationId,
      versionNumber: header.current_version,
      action: 'approval_requested',
      actorUserId: tenant.userId,
      actorName: tenant.clientName || tenant.userId,
      details: {
        origin: 'send_attempt',
        stepCount: result.steps.length,
        marginPct: health.quotationMarginPct,
        marginFloorPct: health.marginFloorPct,
        marginTargetPct: health.marginTargetPct
      }
    })

    return NextResponse.json({
      quotationId: identity.quotationId,
      sent: false,
      approvalRequired: true,
      newStatus: 'pending_approval',
      steps: result.steps,
      health
    })
  }

  // Health OK — transition to sent atomically.
  await withTransaction(async client => {
    await captureSalesContextAtSent({
      quotationId: identity.quotationId,
      organizationId: identity.organizationId,
      spaceId: identity.spaceId,
      client
    })

    if (identity.organizationId) {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
           SET status = 'sent',
               sent_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE quotation_id = $1
             AND organization_id = $2`,
        [identity.quotationId, identity.organizationId]
      )
    } else if (identity.spaceId) {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
           SET status = 'sent',
               sent_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE quotation_id = $1
             AND space_id = $2`,
        [identity.quotationId, identity.spaceId]
      )
    } else {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
           SET status = 'sent',
               sent_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE quotation_id = $1`,
        [identity.quotationId]
      )
    }
  })

  await publishQuotationSent({
    quotationId: identity.quotationId,
    versionNumber: header.current_version,
    sentBy: tenant.userId,
    pricingModel: header.pricing_model,
    commercialModel: header.commercial_model,
    staffingModel: header.staffing_model
  })

  await recordAudit({
    quotationId: identity.quotationId,
    versionNumber: header.current_version,
    action: 'sent',
    actorUserId: tenant.userId,
    actorName: tenant.clientName || tenant.userId,
    details: {
      marginPct: health.quotationMarginPct,
      marginFloorPct: health.marginFloorPct,
      marginTargetPct: health.marginTargetPct
    }
  })

  return NextResponse.json({
    quotationId: identity.quotationId,
    sent: true,
    approvalRequired: false,
    newStatus: 'sent',
    health
  })
}
