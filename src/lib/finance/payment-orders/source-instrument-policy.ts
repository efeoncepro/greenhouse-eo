import 'server-only'

import type { SettlementConfigurationInput } from '@/lib/finance/settlement-orchestration'
import type { PaymentOrderCurrency, PaymentOrderPaymentMethod } from '@/types/payment-orders'

import { PaymentOrderValidationError } from './errors'

type QueryableClient = {
  query: <T extends Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>
}

export interface PaymentOrderSourcePolicyContext {
  processorSlug?: string | null
  paymentMethod?: PaymentOrderPaymentMethod | string | null
  currency: PaymentOrderCurrency | string
  sourceAccountId?: string | null
}

interface AccountPolicyRow extends Record<string, unknown> {
  account_id: string
  currency: string
  instrument_category: string
  provider_slug: string | null
  is_active: boolean
  default_for: string[] | null
}

export interface PaymentOrderSourcePolicyResolution {
  sourceAccountId: string | null
  settlementConfig: SettlementConfigurationInput | null
  snapshot: {
    resolvedAt: string
    processorSlug: string | null
    paymentMethod: string | null
    currency: string
    sourceAccountId: string | null
    sourceProviderSlug: string | null
    sourceInstrumentCategory: string | null
    reason: string
  }
}

const normalize = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''

const isDeelRail = (context: PaymentOrderSourcePolicyContext) =>
  normalize(context.processorSlug) === 'deel' || normalize(context.paymentMethod) === 'deel'

const isGlobal66Rail = (context: PaymentOrderSourcePolicyContext) =>
  normalize(context.processorSlug) === 'global66' || normalize(context.paymentMethod) === 'global66'

const getAccount = async (client: QueryableClient, accountId: string) => {
  const result = await client.query<AccountPolicyRow>(
    `SELECT account_id, currency, instrument_category, provider_slug, is_active, default_for
       FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1`,
    [accountId]
  )

  return result.rows[0] ?? null
}

const findFirstActiveAccount = async (
  client: QueryableClient,
  whereSql: string,
  values: unknown[]
) => {
  const result = await client.query<AccountPolicyRow>(
    `SELECT account_id, currency, instrument_category, provider_slug, is_active, default_for
       FROM greenhouse_finance.accounts
      WHERE is_active = TRUE
        AND ${whereSql}
      ORDER BY
        CASE WHEN 'payroll' = ANY(COALESCE(default_for, ARRAY[]::text[])) THEN 0 ELSE 1 END,
        display_order ASC NULLS LAST,
        account_id ASC
      LIMIT 1`,
    values
  )

  return result.rows[0] ?? null
}

const assertAccountCanSettleOrder = (account: AccountPolicyRow) => {
  if (!account.is_active) {
    throw new PaymentOrderValidationError(
      `El instrumento ${account.account_id} no esta activo.`,
      'source_account_inactive',
      422
    )
  }

  if (normalize(account.provider_slug) === 'deel') {
    throw new PaymentOrderValidationError(
      'Deel opera como processor/rail en esta orden, no como instrumento financiero de salida. Selecciona la TC o cuenta real que financia el cargo.',
      'processor_cannot_be_source_account',
      422
    )
  }

  if (normalize(account.instrument_category) === 'payroll_processor') {
    throw new PaymentOrderValidationError(
      `El instrumento ${account.account_id} es un procesador de nomina/transito y no puede ser source_account_id.`,
      'processor_cannot_be_source_account',
      422
    )
  }
}

const buildResolution = (
  context: PaymentOrderSourcePolicyContext,
  account: AccountPolicyRow | null,
  reason: string,
  settlementConfig: SettlementConfigurationInput | null = null
): PaymentOrderSourcePolicyResolution => ({
  sourceAccountId: account?.account_id ?? null,
  settlementConfig,
  snapshot: {
    resolvedAt: new Date().toISOString(),
    processorSlug: context.processorSlug ?? null,
    paymentMethod: context.paymentMethod ?? null,
    currency: String(context.currency),
    sourceAccountId: account?.account_id ?? null,
    sourceProviderSlug: account?.provider_slug ?? null,
    sourceInstrumentCategory: account?.instrument_category ?? null,
    reason
  }
})

export const resolvePaymentOrderSourcePolicy = async (
  client: QueryableClient,
  context: PaymentOrderSourcePolicyContext
): Promise<PaymentOrderSourcePolicyResolution> => {
  if (context.sourceAccountId) {
    const account = await getAccount(client, context.sourceAccountId)

    if (!account) {
      throw new PaymentOrderValidationError(
        `Cuenta ${context.sourceAccountId} no existe en greenhouse_finance.accounts`,
        'source_account_not_found',
        404
      )
    }

    assertAccountCanSettleOrder(account)

    return buildResolution(context, account, 'explicit_source_account')
  }

  if (isDeelRail(context)) {
    const account = await findFirstActiveAccount(
      client,
      `account_id = 'santander-corp-clp'`,
      []
    )

    if (account) {
      assertAccountCanSettleOrder(account)

      return buildResolution(context, account, 'default_deel_corporate_card')
    }
  }

  if (isGlobal66Rail(context)) {
    const preferred = await findFirstActiveAccount(
      client,
      `provider_slug = 'global66' AND currency = $1`,
      [context.currency]
    )

    const fallback = preferred ?? await findFirstActiveAccount(
      client,
      `provider_slug = 'global66'`,
      []
    )

    if (fallback) {
      assertAccountCanSettleOrder(fallback)

      return buildResolution(context, fallback, preferred ? 'default_global66_same_currency' : 'default_global66_active_account')
    }
  }

  return buildResolution(context, null, 'manual_source_required')
}

export const validatePaymentOrderSourceAccount = async (
  client: QueryableClient,
  context: PaymentOrderSourcePolicyContext & { sourceAccountId: string }
) => resolvePaymentOrderSourcePolicy(client, context)
