import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { assertPaymentInstrumentCapability, createPaymentInstrumentAdmin } from '@/lib/finance/payment-instruments'
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
import { listFinanceAccountsFromPostgres } from '@/lib/finance/postgres-store'
import { INSTRUMENT_CATEGORIES, getProvider, type InstrumentCategory } from '@/config/payment-instruments'
import { resolveFinanceSpaceId } from '@/lib/finance/payment-instruments/admin-detail'
import { assertPaymentInstrumentResponsibleAssignable } from '@/lib/finance/payment-instruments/responsibles'
import { sanitizeMetadataJson, validateProviderForInstrument } from '@/lib/finance/payment-instruments/validation'
import { translatePostgresError, extractPostgresErrorTags } from '@/lib/finance/postgres-error-translator'
import { captureWithDomain } from '@/lib/observability/capture'

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
    case 'shareholder_account':
      return 'other'
    default:
      return 'checking'
  }
}

const maskIdentifier = (value: string | null | undefined) => {
  const normalized = normalizeString(value)

  return normalized ? `•••• ${normalized.slice(-4)}` : null
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.payment_instruments.read',
      action: 'read'
    })

    const spaceId = await resolveFinanceSpaceId(tenant)
    const accounts = await listFinanceAccountsFromPostgres({ includeInactive: true, spaceId })

    const items = accounts.map(a => ({
      accountId: a.accountId,
      instrumentName: a.accountName,
      instrumentCategory: a.instrumentCategory,
      providerSlug: a.providerSlug,
      providerName: a.providerSlug ? getProvider(a.providerSlug)?.name ?? null : null,
      currency: a.currency,
      active: a.isActive,
      isActive: a.isActive,
      accountName: a.accountName,
      bankName: a.bankName,
      accountNumber: maskIdentifier(a.accountNumber),
      accountType: a.accountType,
      country: a.country,
      openingBalance: a.openingBalance,
      defaultFor: a.defaultFor ?? [],
      displayOrder: a.displayOrder,
      cardLastFour: a.cardLastFour,
      cardNetwork: a.cardNetwork,
      creditLimit: a.creditLimit,
      providerIdentifierMasked: maskIdentifier(a.providerIdentifier),
      responsibleUserId: a.responsibleUserId,
      readinessStatus: !a.isActive ? 'inactive' : a.defaultFor?.length ? 'ready' : 'needs_configuration',
      notes: a.notes,
      metadataJson: a.metadataJson ?? {},
      createdAt: a.createdAt ?? ''
    }))

    return NextResponse.json({
      items,
      total: items.length
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
        tags: { source: 'payment_instruments_admin', op: 'list', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'payment_instruments_admin', op: 'list' } })

    return NextResponse.json(
      { error: 'Error interno al listar instrumentos de pago.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.payment_instruments.update',
      action: 'update'
    })

    const body = await request.json()

    // ── Required fields ──
    // Accept both `instrumentName` (from CreatePaymentInstrumentDrawer) and `accountName` (legacy)
    const accountName = assertNonEmptyString(body.instrumentName || body.accountName, 'instrumentName')
    const bankName = normalizeString(body.bankName) || accountName
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

    validateProviderForInstrument({
      providerSlug,
      instrumentCategory,
      currency
    })

    const rawAccountType = body.accountType || body.bankAccountType

    const accountType = (rawAccountType && ACCOUNT_TYPES.includes(rawAccountType))
      ? rawAccountType as AccountType
      : defaultAccountTypeForCategory(instrumentCategory)

    const country = normalizeString(body.country) || 'CL'
    const providerIdentifier = normalizeString(body.providerIdentifier || body.fintechAccountId || body.merchantId || body.rutEmpresa) || null
    const cardLastFour = normalizeString(body.cardLastFour || body.cardLast4) || null
    const cardNetwork = normalizeString(body.cardNetwork) || null
    const creditLimit = toNullableNumber(body.creditLimit)
    const accountNumber = normalizeString(body.accountNumber || body.bankAccountNumber) || null
    const accountNumberFull = body.accountNumberFull ? normalizeString(body.accountNumberFull) : null
    const responsibleUserId = body.responsibleUserId ? normalizeString(body.responsibleUserId) : null
    const defaultFor = Array.isArray(body.defaultFor) ? body.defaultFor.map(String) : []
    const displayOrder = body.displayOrder != null ? toNumber(body.displayOrder) : 0
    const openingBalance = toNumber(body.openingBalance)
    const openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
    const notes = body.notes ? normalizeString(body.notes) : null

    const metadataJson = sanitizeMetadataJson(body.metadataJson ?? {})

    // Generate accountId from name + currency (same pattern as CreateAccountDrawer)
    const accountId = body.accountId
      ? assertNonEmptyString(body.accountId, 'accountId')
      : generateAccountId(accountName, currency)

    const spaceId = await resolveFinanceSpaceId(tenant)

    await assertPaymentInstrumentResponsibleAssignable({
      tenant,
      responsibleUserId
    })

    await createPaymentInstrumentAdmin({
      accountId,
      spaceId,
      actorUserId: tenant.userId || null,
      reason: body.reason,
      input: {
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
      }
    })

    return NextResponse.json({ accountId, created: true }, { status: 201 })
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
        tags: { source: 'payment_instruments_admin', op: 'create', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'payment_instruments_admin', op: 'create' } })

    return NextResponse.json(
      { error: 'Error interno al crear el instrumento de pago.' },
      { status: 500 }
    )
  }
}
