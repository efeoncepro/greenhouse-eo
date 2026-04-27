import 'server-only'

import { getProvider } from '@/config/payment-instruments'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { query } from '@/lib/db'
import {
  FinanceValidationError,
  normalizeString,
  toDateString,
  toNumber,
  toTimestampString
} from '@/lib/finance/shared'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { listPaymentInstrumentAuditEntries } from '@/lib/finance/payment-instruments/audit'
import { getCategoryProviderRule } from '@/lib/finance/payment-instruments/category-rules'
import type {
  PaymentInstrumentAdminAccount,
  PaymentInstrumentAdminDetail,
  PaymentInstrumentImpact,
  PaymentInstrumentReadinessCheck,
  PaymentInstrumentSensitiveField,
  PaymentInstrumentTreasury
} from '@/lib/finance/payment-instruments/types'

/**
 * Resolve the counterparty id for an instrument when its category rule
 * declares one. Today only `shareholder_account` carries a counterparty —
 * the shareholder identity_profile, persisted in `accounts.metadata_json`.
 *
 * Future categories (employee_wallet, intercompany_loan, escrow, …) will
 * each persist their counterparty in their own column or metadata field;
 * extend this helper accordingly. The readiness check stays generic.
 */
const readCounterpartyId = (account: PaymentInstrumentAdminAccount): string | null => {
  const meta = (account.metadataJsonSafe ?? null) as Record<string, unknown> | null

  if (!meta) return null

  const candidate = meta.shareholderProfileId
    ?? meta.shareholder_profile_id
    ?? meta.counterpartyProfileId
    ?? meta.counterparty_profile_id

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim()
  }

  return null
}

type AccountRow = {
  space_id: string | null
  account_id: string
  account_name: string
  bank_name: string
  account_number: string | null
  account_number_full: string | null
  currency: string
  account_type: string
  country_code: string
  is_active: boolean
  opening_balance: unknown
  opening_balance_date: string | Date | null
  notes: string | null
  instrument_category: string
  provider_slug: string | null
  provider_identifier: string | null
  card_last_four: string | null
  card_network: string | null
  credit_limit: unknown
  responsible_user_id: string | null
  default_for: string[] | null
  display_order: unknown
  metadata_json: unknown
  created_at: string | Date | null
  updated_at: string | Date | null
}

type ImpactRow = {
  income_payments_count: string
  expense_payments_count: string
  settlement_groups_count: string
  settlement_legs_count: string
  balances_count: string
  closed_balances_count: string
  closed_periods_count: string
  latest_balance_date: string | Date | null
  latest_movement_at: string | Date | null
}

type MovementRow = {
  movement_id: string
  movement_date: string | Date | null
  source: string
  direction: 'in' | 'out'
  amount: unknown
  currency: string
  description: string | null
  is_reconciled: boolean
}

type HistoryRow = {
  period_label: string
  closing_balance: unknown
  period_inflows: unknown
  period_outflows: unknown
}

const maskValue = (value: string | null | undefined, visible = 4) => {
  const normalized = normalizeString(value)

  if (!normalized) return null

  const suffix = normalized.slice(-visible)

  return suffix ? `•••• ${suffix}` : '••••'
}

const sanitizeMetadata = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string | number | boolean | null>>(
    (acc, [key, entryValue]) => {
      if (!key || /(token|secret|password|credential|webhook|bearer|api[_-]?key|private[_-]?key)/i.test(key)) {
        return acc
      }

      if (entryValue == null || ['string', 'number', 'boolean'].includes(typeof entryValue)) {
        acc[key] = entryValue as string | number | boolean | null
      }

      return acc
    },
    {}
  )
}

export const resolveFinanceSpaceId = async (tenant: TenantContext) => {
  if (tenant.spaceId) return tenant.spaceId

  const rows = await query<{ space_id: string }>(
    `
      SELECT space_id
      FROM greenhouse_core.spaces
      WHERE space_id = 'space-efeonce'
         OR client_id = 'space-efeonce'
         OR space_type = 'internal_space'
      ORDER BY
        CASE
          WHEN space_id = 'space-efeonce' THEN 0
          WHEN client_id = 'space-efeonce' THEN 1
          WHEN space_type = 'internal_space' THEN 2
          ELSE 3
        END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        space_id ASC
      LIMIT 1
    `
  )

  const resolved = rows[0]?.space_id ?? null

  if (!resolved) {
    throw new FinanceValidationError(
      'Payment instrument administration requires a resolved tenant space.',
      422,
      { userId: tenant.userId },
      'PAYMENT_INSTRUMENT_SPACE_REQUIRED'
    )
  }

  return resolved
}

const spacePredicate = (alias: string) =>
  `${alias}.space_id = $2`

export const getPaymentInstrumentAccountRow = async (accountId: string, spaceId: string | null) => {
  const rows = await query<AccountRow>(
    `
      SELECT
        space_id,
        account_id,
        account_name,
        bank_name,
        account_number,
        account_number_full,
        currency,
        account_type,
        country_code,
        is_active,
        opening_balance,
        opening_balance_date,
        notes,
        instrument_category,
        provider_slug,
        provider_identifier,
        card_last_four,
        card_network,
        credit_limit,
        responsible_user_id,
        default_for,
        display_order,
        metadata_json,
        created_at,
        updated_at
      FROM greenhouse_finance.accounts a
      WHERE a.account_id = $1
        AND ${spacePredicate('a')}
      LIMIT 1
    `,
    [accountId, spaceId]
  )

  return rows[0] ?? null
}

const serializeAccount = (row: AccountRow): PaymentInstrumentAdminAccount => {
  const provider = getProvider(row.provider_slug)

  return {
    accountId: row.account_id,
    accountName: row.account_name,
    bankName: row.bank_name,
    instrumentCategory: row.instrument_category,
    providerSlug: row.provider_slug,
    providerName: provider?.name ?? null,
    currency: row.currency,
    country: row.country_code || 'CL',
    isActive: Boolean(row.is_active),
    openingBalance: toNumber(row.opening_balance),
    openingBalanceDate: toDateString(row.opening_balance_date as string | { value?: string } | null),
    accountType: row.account_type,
    accountNumberMasked: maskValue(row.account_number_full || row.account_number),
    providerIdentifierMasked: maskValue(row.provider_identifier),
    cardLastFour: row.card_last_four,
    cardNetwork: row.card_network,
    creditLimit: row.credit_limit != null ? toNumber(row.credit_limit) : null,
    responsibleUserId: row.responsible_user_id,
    defaultFor: Array.isArray(row.default_for) ? row.default_for : [],
    displayOrder: toNumber(row.display_order),
    notes: row.notes,
    metadataJsonSafe: sanitizeMetadata(row.metadata_json),
    createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
    updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
  }
}

export const getPaymentInstrumentImpact = async (accountId: string, spaceId: string | null): Promise<PaymentInstrumentImpact> => {
  const rows = await query<ImpactRow>(
    `
      WITH income AS (
        SELECT COUNT(*)::text AS count, MAX(payment_date)::timestamptz AS latest_at
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1 AND ${spacePredicate('ip')}
      ),
      expense AS (
        SELECT COUNT(*)::text AS count, MAX(payment_date)::timestamptz AS latest_at
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1 AND ${spacePredicate('ep')}
      ),
      settlement_groups AS (
        SELECT COUNT(*)::text AS count
        FROM greenhouse_finance.settlement_groups sg
        WHERE sg.primary_instrument_id = $1 AND ${spacePredicate('sg')}
      ),
      settlement_legs AS (
        SELECT COUNT(*)::text AS count, MAX(transaction_date)::timestamptz AS latest_at
        FROM greenhouse_finance.settlement_legs sl
        WHERE (sl.instrument_id = $1 OR sl.counterparty_instrument_id = $1) AND ${spacePredicate('sl')}
      ),
      balances AS (
        SELECT
          COUNT(*)::text AS count,
          COUNT(*) FILTER (WHERE is_period_closed = TRUE)::text AS closed_count,
          MAX(balance_date)::timestamptz AS latest_balance_date
        FROM greenhouse_finance.account_balances ab
        WHERE ab.account_id = $1 AND ${spacePredicate('ab')}
      ),
      periods AS (
        SELECT COUNT(*) FILTER (WHERE status IN ('closed', 'reconciled'))::text AS closed_count
        FROM greenhouse_finance.reconciliation_periods rp
        WHERE rp.account_id = $1 AND ${spacePredicate('rp')}
      )
      SELECT
        income.count AS income_payments_count,
        expense.count AS expense_payments_count,
        settlement_groups.count AS settlement_groups_count,
        settlement_legs.count AS settlement_legs_count,
        balances.count AS balances_count,
        balances.closed_count AS closed_balances_count,
        periods.closed_count AS closed_periods_count,
        balances.latest_balance_date,
        GREATEST(income.latest_at, expense.latest_at, settlement_legs.latest_at) AS latest_movement_at
      FROM income, expense, settlement_groups, settlement_legs, balances, periods
    `,
    [accountId, spaceId]
  )

  const row = rows[0]

  const impact = {
    incomePaymentsCount: toNumber(row?.income_payments_count),
    expensePaymentsCount: toNumber(row?.expense_payments_count),
    settlementGroupsCount: toNumber(row?.settlement_groups_count),
    settlementLegsCount: toNumber(row?.settlement_legs_count),
    balancesCount: toNumber(row?.balances_count),
    closedBalancesCount: toNumber(row?.closed_balances_count),
    closedPeriodsCount: toNumber(row?.closed_periods_count),
    latestBalanceDate: toDateString(row?.latest_balance_date as string | { value?: string } | null),
    latestMovementAt: toTimestampString(row?.latest_movement_at as string | { value?: string } | null),
    highImpactMutationRequired: false
  }

  impact.highImpactMutationRequired =
    impact.incomePaymentsCount > 0 ||
    impact.expensePaymentsCount > 0 ||
    impact.settlementLegsCount > 0 ||
    impact.closedBalancesCount > 0 ||
    impact.closedPeriodsCount > 0

  return impact
}

const getPaymentInstrumentTreasury = async (accountId: string, spaceId: string | null): Promise<PaymentInstrumentTreasury> => {
  const [balanceRow] = await query<{
    closing_balance: unknown
    currency: string
    balance_date: string | Date | null
  }>(
    `
      SELECT closing_balance, currency, balance_date
      FROM greenhouse_finance.account_balances ab
      WHERE ab.account_id = $1 AND ${spacePredicate('ab')}
      ORDER BY balance_date DESC
      LIMIT 1
    `,
    [accountId, spaceId]
  )

  const movements = await query<MovementRow>(
    `
      SELECT *
      FROM (
        SELECT
          ip.payment_id AS movement_id,
          ip.payment_date AS movement_date,
          'Cobro' AS source,
          'in'::text AS direction,
          ip.amount,
          COALESCE(ip.currency, 'CLP') AS currency,
          COALESCE(ip.reference, ip.notes, 'Cobro registrado') AS description,
          ip.is_reconciled
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1 AND ${spacePredicate('ip')}
        UNION ALL
        SELECT
          ep.payment_id AS movement_id,
          ep.payment_date AS movement_date,
          'Pago' AS source,
          'out'::text AS direction,
          ep.amount,
          ep.currency,
          COALESCE(ep.reference, ep.notes, 'Pago registrado') AS description,
          ep.is_reconciled
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1 AND ${spacePredicate('ep')}
        UNION ALL
        SELECT
          sl.settlement_leg_id AS movement_id,
          sl.transaction_date AS movement_date,
          'Settlement' AS source,
          CASE WHEN sl.direction = 'in' THEN 'in' ELSE 'out' END AS direction,
          sl.amount,
          sl.currency,
          COALESCE(sl.provider_reference, sl.notes, sl.leg_type, 'Movimiento settlement') AS description,
          sl.is_reconciled
        FROM greenhouse_finance.settlement_legs sl
        WHERE (sl.instrument_id = $1 OR sl.counterparty_instrument_id = $1) AND ${spacePredicate('sl')}
      ) movements
      ORDER BY movement_date DESC NULLS LAST
      LIMIT 20
    `,
    [accountId, spaceId]
  )

  const history = await query<HistoryRow>(
    `
      SELECT
        to_char(balance_date, 'YYYY-MM') AS period_label,
        closing_balance,
        period_inflows,
        period_outflows
      FROM greenhouse_finance.account_balances ab
      WHERE ab.account_id = $1 AND ${spacePredicate('ab')}
      ORDER BY balance_date DESC
      LIMIT 12
    `,
    [accountId, spaceId]
  )

  return {
    currentBalance: balanceRow
      ? {
          amount: toNumber(balanceRow.closing_balance),
          currency: balanceRow.currency,
          asOf: toDateString(balanceRow.balance_date as string | { value?: string } | null)
        }
      : null,
    recentMovements: movements.map(movement => ({
      id: movement.movement_id,
      date: toTimestampString(movement.movement_date as string | { value?: string } | null),
      source: movement.source,
      direction: movement.direction,
      amount: toNumber(movement.amount),
      currency: movement.currency,
      description: movement.description || movement.source,
      reconciled: Boolean(movement.is_reconciled)
    })),
    history: history.reverse().map(item => ({
      period: item.period_label,
      balance: toNumber(item.closing_balance),
      inflows: toNumber(item.period_inflows),
      outflows: toNumber(item.period_outflows)
    }))
  }
}

const buildReadiness = (account: PaymentInstrumentAdminAccount, impact: PaymentInstrumentImpact | null) => {
  const rule = getCategoryProviderRule(account.instrumentCategory)
  const providerRequired = rule?.requiresProvider ?? account.instrumentCategory !== 'cash'
  const providerLabelHint = rule?.providerLabel ?? 'Proveedor'

  const checks: PaymentInstrumentReadinessCheck[] = [
    {
      key: 'active',
      label: account.isActive ? 'Instrumento activo' : 'Instrumento inactivo',
      status: account.isActive ? 'pass' : 'fail',
      helper: account.isActive ? 'Disponible para operaciones.' : 'No se debe usar en nuevos cobros o pagos.'
    },
    {
      key: 'provider',
      label: account.providerSlug
        ? `${providerLabelHint} configurado`
        : providerRequired
          ? `${providerLabelHint} pendiente`
          : 'Proveedor no aplica',
      status: !providerRequired || account.providerSlug ? 'pass' : 'warning',
      helper: account.providerSlug
        ? 'La identidad del proveedor esta completa.'
        : providerRequired
          ? `Agrega ${providerLabelHint.toLowerCase()} para mejorar conciliacion y trazabilidad.`
          : 'Esta categoria no requiere proveedor externo.'
    },
    {
      key: 'routing',
      label: account.defaultFor.length > 0 ? 'Uso operativo definido' : 'Uso operativo pendiente',
      status: account.defaultFor.length > 0 ? 'pass' : 'warning',
      helper: account.defaultFor.length > 0 ? 'Aparece con prioridad clara en selectores.' : 'Define si se usa para cobros, pagos, nomina o impuestos.'
    },
    {
      key: 'owner',
      label: account.responsibleUserId ? 'Responsable asignado' : 'Sin responsable',
      status: account.responsibleUserId ? 'pass' : 'warning',
      helper: account.responsibleUserId ? 'Hay owner operativo para seguimiento.' : 'Asigna un responsable antes de usarlo en flujo recurrente.'
    }
  ]

  if (rule?.requiresCounterparty) {
    const counterpartyId = readCounterpartyId(account)
    const counterpartyLabel = rule.counterpartyLabel ?? 'Counterparty'

    checks.push({
      key: 'counterparty',
      label: counterpartyId
        ? `${counterpartyLabel} asignado`
        : `${counterpartyLabel} pendiente`,
      status: counterpartyId ? 'pass' : 'warning',
      helper: counterpartyId
        ? `Persona vinculada al saldo de este instrumento.`
        : `Asigna ${counterpartyLabel.toLowerCase()} antes de operar saldos.`
    })
  }

  if (impact?.closedPeriodsCount || impact?.closedBalancesCount) {
    checks.push({
      key: 'closed_periods',
      label: 'Tiene periodos cerrados',
      status: 'warning',
      helper: 'Los cambios criticos requieren motivo y confirmacion por impacto historico.'
    })
  }

  const hasFail = checks.some(check => check.status === 'fail')
  const hasWarning = checks.some(check => check.status === 'warning')

  return {
    status: !account.isActive ? 'inactive' as const : hasFail ? 'needs_configuration' as const : hasWarning ? 'at_risk' as const : 'ready' as const,
    checks
  }
}

export const getPaymentInstrumentAdminDetail = async ({
  accountId,
  tenant
}: {
  accountId: string
  tenant: TenantContext
}): Promise<PaymentInstrumentAdminDetail> => {
  const spaceId = await resolveFinanceSpaceId(tenant)
  const row = await getPaymentInstrumentAccountRow(accountId, spaceId)

  if (!row) {
    throw new FinanceValidationError('Payment instrument not found', 404)
  }

  const account = serializeAccount(row)
  const sectionErrors: PaymentInstrumentAdminDetail['sectionErrors'] = []

  const sections: PaymentInstrumentAdminDetail['sections'] = {
    account: 'ok',
    impact: 'ok',
    treasury: 'ok',
    audit: 'ok'
  }

  let impact: PaymentInstrumentImpact = {
    incomePaymentsCount: 0,
    expensePaymentsCount: 0,
    settlementGroupsCount: 0,
    settlementLegsCount: 0,
    balancesCount: 0,
    closedBalancesCount: 0,
    closedPeriodsCount: 0,
    latestBalanceDate: null,
    latestMovementAt: null,
    highImpactMutationRequired: false
  }

  try {
    impact = await getPaymentInstrumentImpact(accountId, spaceId)
  } catch {
    sections.impact = 'partial'
    sectionErrors.push({ section: 'impact', message: 'No se pudo calcular todo el impacto operativo.' })
  }

  let treasury: PaymentInstrumentTreasury | null = null

  try {
    treasury = await getPaymentInstrumentTreasury(accountId, spaceId)
  } catch {
    sections.treasury = 'partial'
    sectionErrors.push({ section: 'treasury', message: 'La actividad bancaria esta parcialmente disponible.' })
  }

  let audit: PaymentInstrumentAdminDetail['audit'] = []

  try {
    audit = await listPaymentInstrumentAuditEntries({ accountId, spaceId })
  } catch {
    sections.audit = 'partial'
    sectionErrors.push({ section: 'audit', message: 'La auditoria administrativa no esta disponible en este ambiente.' })
  }

  return {
    account,
    readiness: buildReadiness(account, impact),
    impact,
    treasury,
    audit,
    capabilities: {
      read: hasEntitlement(tenant, 'finance.payment_instruments.read', 'read', 'tenant'),
      update: hasEntitlement(tenant, 'finance.payment_instruments.update', 'update', 'tenant'),
      manageDefaults: hasEntitlement(tenant, 'finance.payment_instruments.manage_defaults', 'manage', 'tenant'),
      deactivate: hasEntitlement(tenant, 'finance.payment_instruments.deactivate', 'update', 'tenant'),
      revealSensitive: hasEntitlement(tenant, 'finance.payment_instruments.reveal_sensitive', 'read', 'tenant')
    },
    sections,
    sectionErrors
  }
}

export const revealPaymentInstrumentSensitiveField = async ({
  accountId,
  field,
  tenant
}: {
  accountId: string
  field: PaymentInstrumentSensitiveField
  tenant: TenantContext
}) => {
  const spaceId = await resolveFinanceSpaceId(tenant)
  const row = await getPaymentInstrumentAccountRow(accountId, spaceId)

  if (!row) {
    throw new FinanceValidationError('Payment instrument not found', 404)
  }

  const value = field === 'accountNumberFull' ? row.account_number_full : row.provider_identifier

  if (!value) {
    throw new FinanceValidationError('El campo solicitado no tiene valor registrado.', 404)
  }

  return {
    spaceId,
    value
  }
}
