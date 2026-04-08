import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  assertNonEmptyString,
  assertValidCurrency,
  FinanceValidationError,
  normalizeString,
  toNumber,
  toNullableNumber,
  ACCOUNT_TYPES,
  type AccountType
} from '@/lib/finance/shared'
import {
  listFinanceAccountsFromPostgres,
  createFinanceAccountInPostgres
} from '@/lib/finance/postgres-store'
import { INSTRUMENT_CATEGORIES, type InstrumentCategory } from '@/config/payment-instruments'

export const dynamic = 'force-dynamic'

/**
 * Derive a slug-based accountId from the account name + currency.
 * Same pattern used by the CreateAccountDrawer on the frontend.
 */
const generateAccountId = (name: string, currency: string): string => {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug}-${currency.toLowerCase()}`
}

/** Map instrument category to a sensible default account type */
const defaultAccountTypeForCategory = (category: InstrumentCategory): AccountType => {
  switch (category) {
    case 'bank_account':
      return 'checking'
    case 'credit_card':
      return 'other'
    case 'fintech':
      return category === 'fintech' && ACCOUNT_TYPES.includes('paypal' as AccountType)
        ? 'paypal' as AccountType
        : 'other'
    case 'payment_platform':
      return 'other'
    case 'cash':
      return 'other'
    case 'payroll_processor':
      return 'other'
    default:
      return 'checking'
  }
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accounts = await listFinanceAccountsFromPostgres({ includeInactive: true })

    return NextResponse.json({
      items: accounts,
      total: accounts.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // ── Required fields ──
    const accountName = assertNonEmptyString(body.accountName, 'accountName')
    const bankName = assertNonEmptyString(body.bankName, 'bankName')
    const currency = assertValidCurrency(body.currency)

    // Validate instrument category
    const rawCategory = normalizeString(body.instrumentCategory)

    if (!rawCategory || !INSTRUMENT_CATEGORIES.includes(rawCategory as InstrumentCategory)) {
      throw new FinanceValidationError(
        `instrumentCategory is required and must be one of: ${INSTRUMENT_CATEGORIES.join(', ')}`
      )
    }

    const instrumentCategory = rawCategory as InstrumentCategory

    // ── Optional fields ──
    const providerSlug = body.providerSlug ? normalizeString(body.providerSlug) : null

    const accountType = (body.accountType && ACCOUNT_TYPES.includes(body.accountType))
      ? body.accountType as AccountType
      : defaultAccountTypeForCategory(instrumentCategory)

    const country = normalizeString(body.country) || 'CL'
    const providerIdentifier = body.providerIdentifier ? normalizeString(body.providerIdentifier) : null
    const cardLastFour = body.cardLastFour ? normalizeString(body.cardLastFour) : null
    const cardNetwork = body.cardNetwork ? normalizeString(body.cardNetwork) : null
    const creditLimit = toNullableNumber(body.creditLimit)
    const accountNumber = body.accountNumber ? normalizeString(body.accountNumber) : null
    const accountNumberFull = body.accountNumberFull ? normalizeString(body.accountNumberFull) : null
    const responsibleUserId = body.responsibleUserId ? normalizeString(body.responsibleUserId) : null
    const defaultFor = Array.isArray(body.defaultFor) ? body.defaultFor.map(String) : []
    const displayOrder = body.displayOrder != null ? toNumber(body.displayOrder) : 0
    const openingBalance = toNumber(body.openingBalance)
    const openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
    const notes = body.notes ? normalizeString(body.notes) : null

    const metadataJson = (typeof body.metadataJson === 'object' && body.metadataJson && !Array.isArray(body.metadataJson))
      ? body.metadataJson as Record<string, unknown>
      : undefined

    // Generate accountId from name + currency (same pattern as CreateAccountDrawer)
    const accountId = body.accountId
      ? assertNonEmptyString(body.accountId, 'accountId')
      : generateAccountId(accountName, currency)

    await createFinanceAccountInPostgres({
      accountId,
      accountName,
      bankName,
      accountNumber,
      accountNumberFull,
      currency,
      accountType,
      country,
      openingBalance,
      openingBalanceDate,
      notes,
      actorUserId: tenant.userId || null,
      instrumentCategory,
      providerSlug,
      providerIdentifier,
      cardLastFour,
      cardNetwork,
      creditLimit,
      responsibleUserId,
      defaultFor,
      displayOrder,
      metadataJson
    })

    return NextResponse.json({ accountId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
