import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  assertValidCurrency,
  FinanceValidationError,
  normalizeString,
  toNumber,
  toNullableNumber,
  normalizeBoolean,
  ACCOUNT_TYPES,
  type AccountType
} from '@/lib/finance/shared'
import {
  getFinanceAccountFromPostgres,
  updateFinanceAccountInPostgres
} from '@/lib/finance/postgres-store'
import { INSTRUMENT_CATEGORIES, type InstrumentCategory } from '@/config/payment-instruments'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const account = await getFinanceAccountFromPostgres(id)

    if (!account) {
      return NextResponse.json({ error: 'Payment instrument not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
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
    const { id } = await context.params
    const body = await request.json()

    // ── Build update payload with only provided fields ──
    const updates: Parameters<typeof updateFinanceAccountInPostgres>[0] = { accountId: id }

    if (body.accountName !== undefined) {
      updates.accountName = normalizeString(body.accountName)
    }

    if (body.bankName !== undefined) {
      updates.bankName = normalizeString(body.bankName)
    }

    if (body.currency !== undefined) {
      updates.currency = assertValidCurrency(body.currency)
    }

    if (body.accountType !== undefined) {
      if (!ACCOUNT_TYPES.includes(body.accountType)) {
        throw new FinanceValidationError(
          `accountType must be one of: ${ACCOUNT_TYPES.join(', ')}`
        )
      }

      updates.accountType = body.accountType as AccountType
    }

    if (body.instrumentCategory !== undefined) {
      const rawCategory = normalizeString(body.instrumentCategory)

      if (!INSTRUMENT_CATEGORIES.includes(rawCategory as InstrumentCategory)) {
        throw new FinanceValidationError(
          `instrumentCategory must be one of: ${INSTRUMENT_CATEGORIES.join(', ')}`
        )
      }

      updates.instrumentCategory = rawCategory
    }

    if (body.country !== undefined) {
      updates.country = normalizeString(body.country) || 'CL'
    }

    if (body.isActive !== undefined) {
      updates.isActive = normalizeBoolean(body.isActive)
    }

    if (body.openingBalance !== undefined) {
      updates.openingBalance = toNumber(body.openingBalance)
    }

    if (body.openingBalanceDate !== undefined) {
      updates.openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
    }

    if (body.accountNumber !== undefined) {
      updates.accountNumber = body.accountNumber ? normalizeString(body.accountNumber) : null
    }

    if (body.accountNumberFull !== undefined) {
      updates.accountNumberFull = body.accountNumberFull ? normalizeString(body.accountNumberFull) : null
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes ? normalizeString(body.notes) : null
    }

    if (body.providerSlug !== undefined) {
      updates.providerSlug = body.providerSlug ? normalizeString(body.providerSlug) : null
    }

    if (body.providerIdentifier !== undefined) {
      updates.providerIdentifier = body.providerIdentifier ? normalizeString(body.providerIdentifier) : null
    }

    if (body.cardLastFour !== undefined) {
      updates.cardLastFour = body.cardLastFour ? normalizeString(body.cardLastFour) : null
    }

    if (body.cardNetwork !== undefined) {
      updates.cardNetwork = body.cardNetwork ? normalizeString(body.cardNetwork) : null
    }

    if (body.creditLimit !== undefined) {
      updates.creditLimit = toNullableNumber(body.creditLimit)
    }

    if (body.responsibleUserId !== undefined) {
      updates.responsibleUserId = body.responsibleUserId ? normalizeString(body.responsibleUserId) : null
    }

    if (body.defaultFor !== undefined) {
      updates.defaultFor = Array.isArray(body.defaultFor) ? body.defaultFor.map(String) : []
    }

    if (body.displayOrder !== undefined) {
      updates.displayOrder = toNumber(body.displayOrder)
    }

    if (body.metadataJson !== undefined) {
      updates.metadataJson = (typeof body.metadataJson === 'object' && body.metadataJson && !Array.isArray(body.metadataJson))
        ? body.metadataJson as Record<string, unknown>
        : {}
    }

    await updateFinanceAccountInPostgres(updates)

    return NextResponse.json({ accountId: id, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
