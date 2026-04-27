import { NextResponse } from 'next/server'

import { FinanceValidationError } from '@/lib/finance/shared'
import {
  assertPaymentInstrumentCapability,
  updatePaymentInstrumentAdmin
} from '@/lib/finance/payment-instruments'
import {
  getPaymentInstrumentAdminDetail,
  resolveFinanceSpaceId
} from '@/lib/finance/payment-instruments/admin-detail'
import { assertPaymentInstrumentResponsibleAssignable } from '@/lib/finance/payment-instruments/responsibles'
import { parsePaymentInstrumentUpdate, validateReason } from '@/lib/finance/payment-instruments/validation'
import { translatePostgresError, extractPostgresErrorTags } from '@/lib/finance/postgres-error-translator'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const highImpactFields = new Set(['currency', 'instrumentCategory', 'providerSlug', 'isActive'])

const getChangedFields = (updates: Record<string, unknown>) =>
  Object.keys(updates).filter(key => updates[key] !== undefined)

const requireCapability = (
  tenant: NonNullable<Awaited<ReturnType<typeof requireFinanceTenantContext>>['tenant']>,
  capability:
    | 'finance.payment_instruments.read'
    | 'finance.payment_instruments.update'
    | 'finance.payment_instruments.manage_defaults'
    | 'finance.payment_instruments.deactivate',
  action: 'read' | 'update' | 'manage'
) => {
  assertPaymentInstrumentCapability({ tenant, capability, action })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    requireCapability(tenant, 'finance.payment_instruments.read', 'read')

    const { id } = await context.params
    const detail = await getPaymentInstrumentAdminDetail({ accountId: id, tenant })

    return NextResponse.json(detail, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      )
    }

    const translated = translatePostgresError(error)

    if (translated) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'payment_instruments_admin', op: 'detail', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'payment_instruments_admin', op: 'detail' } })

    return NextResponse.json(
      { error: 'Error interno al leer el instrumento de pago.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    requireCapability(tenant, 'finance.payment_instruments.update', 'update')

    const { id } = await context.params
    const body = await request.json()
    const detailBefore = await getPaymentInstrumentAdminDetail({ accountId: id, tenant })

    const updates = parsePaymentInstrumentUpdate({
      ...body,
      currentInstrumentCategory: detailBefore.account.instrumentCategory
    })

    const changedFields = getChangedFields(updates)

    if (changedFields.length === 0) {
      throw new FinanceValidationError('No hay campos para actualizar.', 422)
    }

    const mutatesDefaults = changedFields.some(field => field === 'defaultFor' || field === 'displayOrder')

    if (mutatesDefaults) {
      requireCapability(tenant, 'finance.payment_instruments.manage_defaults', 'manage')
    }

    if (updates.isActive === false || updates.isActive === true) {
      requireCapability(tenant, 'finance.payment_instruments.deactivate', 'update')
    }

    const requiresHighImpactConfirmation =
      detailBefore.impact.highImpactMutationRequired &&
      changedFields.some(field => highImpactFields.has(field))

    const reason = validateReason(body.reason)

    if (updates.responsibleUserId !== undefined) {
      await assertPaymentInstrumentResponsibleAssignable({
        tenant,
        responsibleUserId: updates.responsibleUserId,
        currentResponsibleUserId: detailBefore.account.responsibleUserId
      })
    }

    if (
      requiresHighImpactConfirmation &&
      body.confirmHighImpact !== true &&
      body.impactAcknowledged !== true
    ) {
      return NextResponse.json(
        {
          error: 'Este cambio afecta instrumentos con uso historico. Confirma el impacto y agrega un motivo.',
          impact: detailBefore.impact,
          requiresConfirmation: true
        },
        { status: 409 }
      )
    }

    const spaceId = await resolveFinanceSpaceId(tenant)

    const result = await updatePaymentInstrumentAdmin({
      accountId: id,
      spaceId,
      actorUserId: tenant.userId || null,
      updates,
      reason,
      impactAcknowledged: body.confirmHighImpact === true || body.impactAcknowledged === true
    })

    const detail = await getPaymentInstrumentAdminDetail({ accountId: id, tenant })

    return NextResponse.json({ accountId: id, updated: true, changedFields: result.changedFields, detail })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      )
    }

    const translated = translatePostgresError(error)

    if (translated) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'payment_instruments_admin', op: 'update', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'payment_instruments_admin', op: 'update' } })

    return NextResponse.json(
      { error: 'Error interno al actualizar el instrumento de pago.' },
      { status: 500 }
    )
  }
}
