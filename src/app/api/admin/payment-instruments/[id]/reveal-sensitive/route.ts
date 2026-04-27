import { NextResponse } from 'next/server'

import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import {
  assertPaymentInstrumentCapability,
  revealPaymentInstrumentSensitiveFields
} from '@/lib/finance/payment-instruments'
import { resolveFinanceSpaceId } from '@/lib/finance/payment-instruments/admin-detail'
import { validateReason } from '@/lib/finance/payment-instruments/validation'
import type { PaymentInstrumentSensitiveField } from '@/lib/finance/payment-instruments/types'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const sensitiveFields = new Set<PaymentInstrumentSensitiveField>(['accountNumberFull', 'providerIdentifier'])

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.payment_instruments.reveal_sensitive',
      action: 'read'
    })

    const { id } = await context.params
    const body = await request.json()
    const field = normalizeString(body.field) as PaymentInstrumentSensitiveField

    if (!sensitiveFields.has(field)) {
      throw new FinanceValidationError('Campo sensible no soportado.', 422)
    }

    const reason = validateReason(body.reason)
    const spaceId = await resolveFinanceSpaceId(tenant)

    const revealed = await revealPaymentInstrumentSensitiveFields({
      accountId: id,
      spaceId,
      actorUserId: tenant.userId || null,
      fields: [field],
      reason
    })

    return NextResponse.json(
      {
        field,
        value: revealed.fields[field],
        expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache'
        }
      }
    )
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode })
    }

    throw error
  }
}
