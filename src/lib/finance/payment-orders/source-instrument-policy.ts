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
  account_name?: string | null
  bank_name?: string | null
  currency: string
  instrument_category: string
  provider_slug: string | null
  is_active: boolean
  default_for: string[] | null
}

interface FundingPolicyRow extends Record<string, unknown> {
  policy_id: string
  processor_slug: string | null
  payment_method: string | null
  order_currency: string | null
  source_account_id: string
  intermediary_account_id: string | null
  settlement_mode: 'direct' | 'via_intermediary'
  priority: number
  notes: string | null
  source_account_name: string | null
  source_bank_name: string | null
  source_currency: string
  source_instrument_category: string
  source_provider_slug: string | null
  source_is_active: boolean
  source_default_for: string[] | null
  intermediary_account_name: string | null
  intermediary_bank_name: string | null
  intermediary_currency: string | null
  intermediary_instrument_category: string | null
  intermediary_provider_slug: string | null
  intermediary_is_active: boolean | null
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
    intermediaryAccountId: string | null
    intermediaryProviderSlug: string | null
    settlementMode: string | null
    reason: string
  }
}

export interface PaymentOrderSourceInstrumentOption {
  accountId: string
  accountName: string
  bankName: string
  currency: string
  instrumentCategory: string
  providerSlug: string | null
  recommended: boolean
  reason: string
  settlementMode: 'direct' | 'via_intermediary'
  intermediaryAccountId: string | null
  intermediaryName: string | null
}

const normalize = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''

const isDeelRail = (context: PaymentOrderSourcePolicyContext) =>
  normalize(context.processorSlug) === 'deel' || normalize(context.paymentMethod) === 'deel'

const isGlobal66Rail = (context: PaymentOrderSourcePolicyContext) =>
  normalize(context.processorSlug) === 'global66' || normalize(context.paymentMethod) === 'global66'

const getAccount = async (client: QueryableClient, accountId: string) => {
  const result = await client.query<AccountPolicyRow>(
    `SELECT account_id, account_name, bank_name, currency, instrument_category, provider_slug, is_active, default_for
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
    `SELECT account_id, account_name, bank_name, currency, instrument_category, provider_slug, is_active, default_for
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

const buildPolicySql = (requireSourceAccount: boolean) => `
  SELECT
    p.policy_id,
    p.processor_slug,
    p.payment_method,
    p.order_currency,
    p.source_account_id,
    p.intermediary_account_id,
    p.settlement_mode,
    p.priority,
    p.notes,
    source.account_name AS source_account_name,
    source.bank_name AS source_bank_name,
    source.currency AS source_currency,
    source.instrument_category AS source_instrument_category,
    source.provider_slug AS source_provider_slug,
    source.is_active AS source_is_active,
    source.default_for AS source_default_for,
    intermediary.account_name AS intermediary_account_name,
    intermediary.bank_name AS intermediary_bank_name,
    intermediary.currency AS intermediary_currency,
    intermediary.instrument_category AS intermediary_instrument_category,
    intermediary.provider_slug AS intermediary_provider_slug,
    intermediary.is_active AS intermediary_is_active
  FROM greenhouse_finance.payment_order_processor_funding_policies p
  JOIN greenhouse_finance.accounts source
    ON source.account_id = p.source_account_id
  LEFT JOIN greenhouse_finance.accounts intermediary
    ON intermediary.account_id = p.intermediary_account_id
  WHERE p.is_active = TRUE
    AND (p.processor_slug = $1 OR p.payment_method = $1)
    AND (p.order_currency IS NULL OR p.order_currency = $2)
    ${requireSourceAccount ? 'AND p.source_account_id = $3' : ''}
  ORDER BY
    CASE WHEN p.order_currency = $2 THEN 0 ELSE 1 END,
    p.priority ASC,
    p.policy_id ASC
`

const findFundingPolicy = async (
  client: QueryableClient,
  context: PaymentOrderSourcePolicyContext,
  sourceAccountId?: string | null
) => {
  const rail = normalize(context.processorSlug) || normalize(context.paymentMethod)

  if (!rail) return null

  const values = sourceAccountId
    ? [rail, String(context.currency), sourceAccountId]
    : [rail, String(context.currency)]

  try {
    const result = await client.query<FundingPolicyRow>(
      `${buildPolicySql(Boolean(sourceAccountId))} LIMIT 1`,
      values
    )

    return result.rows[0] ?? null
  } catch (error) {
    // Backward compatibility for environments that have not applied the policy
    // migration yet: fall through to legacy direct resolution.
    if (error instanceof Error && /payment_order_processor_funding_policies/.test(error.message)) {
      return null
    }

    throw error
  }
}

const listFundingPolicies = async (
  client: QueryableClient,
  context: PaymentOrderSourcePolicyContext
) => {
  const rail = normalize(context.processorSlug) || normalize(context.paymentMethod)

  if (!rail) return []

  try {
    const result = await client.query<FundingPolicyRow>(
      buildPolicySql(false),
      [rail, String(context.currency)]
    )

    return result.rows
  } catch (error) {
    if (error instanceof Error && /payment_order_processor_funding_policies/.test(error.message)) {
      return []
    }

    throw error
  }
}

const accountFromPolicy = (policy: FundingPolicyRow): AccountPolicyRow => ({
  account_id: policy.source_account_id,
  account_name: policy.source_account_name,
  bank_name: policy.source_bank_name,
  currency: policy.source_currency,
  instrument_category: policy.source_instrument_category,
  provider_slug: policy.source_provider_slug,
  is_active: policy.source_is_active,
  default_for: policy.source_default_for
})

const settlementConfigFromPolicy = (policy: FundingPolicyRow): SettlementConfigurationInput | null => {
  if (policy.settlement_mode !== 'via_intermediary') return null

  return {
    settlementMode: 'via_intermediary',
    fundingInstrumentId: policy.source_account_id,
    intermediaryInstrumentId: policy.intermediary_account_id,
    intermediaryMode: 'counterparty_only'
  }
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
  settlementConfig: SettlementConfigurationInput | null = null,
  policy?: FundingPolicyRow | null
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
    intermediaryAccountId: policy?.intermediary_account_id ?? null,
    intermediaryProviderSlug: policy?.intermediary_provider_slug ?? null,
    settlementMode: policy?.settlement_mode ?? null,
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

    const policy = await findFundingPolicy(client, context, context.sourceAccountId)

    return buildResolution(
      context,
      account,
      policy ? 'explicit_source_account_with_processor_policy' : 'explicit_source_account',
      policy ? settlementConfigFromPolicy(policy) : null,
      policy
    )
  }

  const policy = await findFundingPolicy(client, context)

  if (policy) {
    const account = accountFromPolicy(policy)

    assertAccountCanSettleOrder(account)

    if (policy.intermediary_account_id && policy.intermediary_is_active === false) {
      throw new PaymentOrderValidationError(
        `El intermediario ${policy.intermediary_account_id} no esta activo.`,
        'source_account_inactive',
        422
      )
    }

    return buildResolution(
      context,
      account,
      `default_processor_policy:${policy.policy_id}`,
      settlementConfigFromPolicy(policy),
      policy
    )
  }

  if (isDeelRail(context)) {
    return buildResolution(context, null, 'processor_policy_required')
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

export const listPaymentOrderSourceInstrumentOptions = async (
  client: QueryableClient,
  context: PaymentOrderSourcePolicyContext
): Promise<PaymentOrderSourceInstrumentOption[]> => {
  const policies = await listFundingPolicies(client, context)

  if (policies.length > 0) {
    return policies.map((policy, index) => ({
      accountId: policy.source_account_id,
      accountName: policy.source_account_name ?? policy.source_account_id,
      bankName: policy.source_bank_name ?? policy.source_account_name ?? policy.source_account_id,
      currency: policy.source_currency,
      instrumentCategory: policy.source_instrument_category,
      providerSlug: policy.source_provider_slug,
      recommended: index === 0,
      reason: policy.notes ?? `Policy ${policy.policy_id}`,
      settlementMode: policy.settlement_mode,
      intermediaryAccountId: policy.intermediary_account_id,
      intermediaryName: policy.intermediary_account_name ?? policy.intermediary_account_id
    }))
  }

  if (isDeelRail(context)) return []

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

    return fallback ? [{
      accountId: fallback.account_id,
      accountName: fallback.account_name ?? fallback.account_id,
      bankName: fallback.bank_name ?? fallback.account_name ?? fallback.account_id,
      currency: fallback.currency,
      instrumentCategory: fallback.instrument_category,
      providerSlug: fallback.provider_slug,
      recommended: true,
      reason: preferred ? 'Global66 activo en la moneda de la orden.' : 'Global66 activo disponible como fallback.',
      settlementMode: 'direct',
      intermediaryAccountId: null,
      intermediaryName: null
    }] : []
  }

  const result = await client.query<AccountPolicyRow>(
    `SELECT account_id, account_name, bank_name, currency, instrument_category, provider_slug, is_active, default_for
       FROM greenhouse_finance.accounts
      WHERE is_active = TRUE
        AND currency = $1
        AND provider_slug <> 'deel'
        AND instrument_category <> 'payroll_processor'
      ORDER BY
        CASE WHEN 'payroll' = ANY(COALESCE(default_for, ARRAY[]::text[])) THEN 0 ELSE 1 END,
        display_order ASC NULLS LAST,
        account_id ASC`,
    [context.currency]
  )

  return result.rows.map((account, index) => ({
    accountId: account.account_id,
    accountName: account.account_name ?? account.account_id,
    bankName: account.bank_name ?? account.account_name ?? account.account_id,
    currency: account.currency,
    instrumentCategory: account.instrument_category,
    providerSlug: account.provider_slug,
    recommended: index === 0,
    reason: 'Instrumento directo activo en la moneda de la orden.',
    settlementMode: 'direct',
    intermediaryAccountId: null,
    intermediaryName: null
  }))
}
