import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  AccessLevel,
  AdminCreditSummary,
  AiCreditLedgerEntry,
  AiCreditLedgerResponse,
  AiCreditWallet,
  AiCreditWalletsResponse,
  AiTool,
  AiToolLicensesResponse,
  AiToolingAdminMetadata,
  AiToolsCatalogResponse,
  ClientCreditSummary,
  CreateAiToolInput,
  CreateLicenseInput,
  CreateWalletInput,
  MemberToolLicense,
  ProviderRecord,
  ReloadCreditsInput,
  UpdateAiToolInput,
  UpdateLicenseInput,
  UpdateWalletInput,
  WalletStatus
} from '@/types/ai-tools'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  ACCESS_LEVELS,
  AiToolingValidationError,
  COST_MODELS,
  LICENSE_STATUSES,
  RELOAD_REASONS,
  TOOL_CATEGORIES,
  WALLET_SCOPES,
  WALLET_STATUSES,
  assertDateString,
  assertEnum,
  assertPositiveInteger,
  getCurrentDateString,
  getCurrentMonthDateRange,
  getPeriodDateRange,
  getViewerKind,
  normalizeNullableString,
  normalizeString,
  slugify,
  toDateString,
  toInt,
  toNullableNumber,
  toNumber,
  toTimestampString
} from '@/lib/ai-tools/shared'

type QueryableClient = Pick<PoolClient, 'query'>

type ProviderRow = {
  provider_id: string
  provider_name: string
  provider_category: string | null
  provider_kind: string | null
  website_url: string | null
  support_url: string | null
  icon_url: string | null
  is_active: boolean
}

type ToolRow = {
  tool_id: string
  tool_name: string
  provider_id: string
  provider_name: string | null
  vendor: string | null
  tool_category: string
  tool_subcategory: string | null
  cost_model: string
  subscription_amount: unknown
  subscription_currency: string | null
  subscription_billing_cycle: string | null
  subscription_seats: unknown
  credit_unit_name: string | null
  credit_unit_cost: unknown
  credit_unit_currency: string | null
  credits_included_monthly: unknown
  fin_supplier_id: string | null
  description: string | null
  website_url: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: unknown
}

type LicenseRow = ToolRow & {
  license_id: string
  member_id: string
  member_name: string | null
  member_email: string | null
  license_status: string
  activated_at: string | Date | null
  expires_at: string | Date | null
  access_level: string | null
  license_key: string | null
  account_email: string | null
  notes: string | null
  assigned_by: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type WalletRow = {
  wallet_id: string
  wallet_name: string
  wallet_scope: string
  client_id: string | null
  client_name: string | null
  tool_id: string
  tool_name: string
  provider_id: string | null
  provider_name: string | null
  credit_unit_name: string
  initial_balance: unknown
  current_balance: unknown
  reserved_balance: unknown
  monthly_limit: unknown
  monthly_consumed: unknown
  monthly_reset_day: unknown
  low_balance_threshold: unknown
  valid_from: string | Date
  valid_until: string | Date | null
  wallet_status: string
  notes: string | null
  icon_url: string | null
  credit_unit_cost: unknown
  credit_unit_currency: string | null
}

type LedgerRow = {
  ledger_id: string
  wallet_id: string
  request_id: string | null
  entry_type: string
  credit_amount: unknown
  balance_before: unknown
  balance_after: unknown
  consumed_by_member_id: string | null
  consumed_by_name: string | null
  client_id: string | null
  client_name: string | null
  notion_task_id: string | null
  notion_project_id: string | null
  project_name: string | null
  asset_description: string | null
  unit_cost: unknown
  cost_currency: string | null
  total_cost: unknown
  total_cost_clp: unknown
  reload_reason: string | null
  reload_reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string | Date | null
}

type ClientRow = {
  client_id: string
  client_name: string
  active: boolean
}

type MemberRow = {
  member_id: string
  display_name: string
  email: string | null
  active: boolean
}

type FinanceSupplierRow = {
  supplier_id: string
  legal_name: string
  trade_name: string | null
  payment_currency: string | null
}

type ActiveLicenseEventRow = {
  license_id: string
  member_id: string
  tool_id: string
  activated_at: string | Date | null
  expires_at: string | Date | null
}

const AI_TOOLING_POSTGRES_REQUIRED_TABLES = [
  'greenhouse_core.providers',
  'greenhouse_core.clients',
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_finance.suppliers',
  'greenhouse_finance.exchange_rates',
  'greenhouse_sync.outbox_events',
  'greenhouse_ai.tool_catalog',
  'greenhouse_ai.member_tool_licenses',
  'greenhouse_ai.credit_wallets',
  'greenhouse_ai.credit_ledger'
] as const

let aiToolingPostgresReadyPromise: Promise<void> | null = null
let aiToolingPostgresReadyAt = 0

const AI_TOOLING_POSTGRES_READY_TTL_MS = 60_000

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const getExistingAiToolingTables = async () => {
  const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
    `
      SELECT schemaname || '.' || tablename AS qualified_name
      FROM pg_tables
      WHERE schemaname = ANY($1::text[])
    `,
    [['greenhouse_core', 'greenhouse_finance', 'greenhouse_sync', 'greenhouse_ai']]
  )

  return new Set(rows.map(row => row.qualified_name))
}

const providerCategoryFromType = (providerType: string | null) => {
  switch ((providerType || '').trim()) {
    case 'software_suite':
      return 'software_suite' as const
    case 'identity_provider':
      return 'identity_provider' as const
    case 'delivery_platform':
      return 'delivery_platform' as const
    case 'financial_vendor':
      return 'financial_vendor' as const
    default:
      return 'ai_vendor' as const
  }
}

const providerKindFromType = (providerType: string | null) => {
  switch ((providerType || '').trim()) {
    case 'delivery_platform':
      return 'platform' as const
    default:
      return 'organization' as const
  }
}

const getCurrentSantiagoPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    const now = new Date()

    return { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 }
  }

  return { periodYear: Number(match[1]), periodMonth: Number(match[2]) }
}

const getActiveLicenseScopesForTool = async (toolId: string, client: QueryableClient) =>
  queryRows<ActiveLicenseEventRow>(
    `
      SELECT license_id, member_id, tool_id, activated_at, expires_at
      FROM greenhouse_ai.member_tool_licenses
      WHERE tool_id = $1
        AND license_status = 'active'
      ORDER BY member_id ASC, license_id ASC
    `,
    [toolId],
    client
  )

const hasToolCostImpact = (input: UpdateAiToolInput) =>
  input.costModel !== undefined ||
  input.subscriptionAmount !== undefined ||
  input.subscriptionCurrency !== undefined ||
  input.subscriptionBillingCycle !== undefined ||
  input.subscriptionSeats !== undefined ||
  input.creditUnitCost !== undefined ||
  input.creditUnitCurrency !== undefined

const toIsoDate = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const mapProvider = (row: ProviderRow): ProviderRecord => ({
  providerId: normalizeString(row.provider_id),
  providerName: normalizeString(row.provider_name),
  providerCategory: providerCategoryFromType(row.provider_category),
  providerKind: providerKindFromType(row.provider_kind || row.provider_category),
  websiteUrl: normalizeNullableString(row.website_url),
  supportUrl: normalizeNullableString(row.support_url),
  iconUrl: normalizeNullableString(row.icon_url),
  isActive: Boolean(row.is_active)
})

const mapTool = (row: ToolRow): AiTool => ({
  toolId: normalizeString(row.tool_id),
  toolName: normalizeString(row.tool_name),
  providerId: normalizeString(row.provider_id),
  providerName: normalizeNullableString(row.provider_name),
  vendor: normalizeNullableString(row.vendor),
  toolCategory: (normalizeString(row.tool_category) || 'gen_text') as AiTool['toolCategory'],
  toolSubcategory: normalizeNullableString(row.tool_subcategory),
  costModel: (normalizeString(row.cost_model) || 'subscription') as AiTool['costModel'],
  subscriptionAmount: toNullableNumber(row.subscription_amount),
  subscriptionCurrency: normalizeString(row.subscription_currency || 'USD') || 'USD',
  subscriptionBillingCycle: normalizeString(row.subscription_billing_cycle || 'monthly') || 'monthly',
  subscriptionSeats: toNullableNumber(row.subscription_seats),
  creditUnitName: normalizeNullableString(row.credit_unit_name),
  creditUnitCost: toNullableNumber(row.credit_unit_cost),
  creditUnitCurrency: normalizeString(row.credit_unit_currency || 'USD') || 'USD',
  creditsIncludedMonthly: toNullableNumber(row.credits_included_monthly),
  finSupplierId: normalizeNullableString(row.fin_supplier_id),
  description: normalizeNullableString(row.description),
  websiteUrl: normalizeNullableString(row.website_url),
  iconUrl: normalizeNullableString(row.icon_url),
  isActive: Boolean(row.is_active),
  sortOrder: toInt(row.sort_order)
})

const mapLicense = (row: LicenseRow): MemberToolLicense => ({
  licenseId: normalizeString(row.license_id),
  memberId: normalizeString(row.member_id),
  memberName: normalizeNullableString(row.member_name),
  memberEmail: normalizeNullableString(row.member_email),
  toolId: normalizeString(row.tool_id),
  licenseStatus: (normalizeString(row.license_status) || 'pending') as MemberToolLicense['licenseStatus'],
  activatedAt: toDateString(row.activated_at as string | { value?: string } | null),
  expiresAt: toDateString(row.expires_at as string | { value?: string } | null),
  accessLevel: (normalizeString(row.access_level) || 'full') as AccessLevel,
  licenseKey: normalizeNullableString(row.license_key),
  accountEmail: normalizeNullableString(row.account_email),
  notes: normalizeNullableString(row.notes),
  assignedBy: normalizeNullableString(row.assigned_by),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null),
  tool: row.tool_id ? mapTool(row) : null
})

const getBalanceHealth = (wallet: {
  currentBalance: number
  initialBalance: number
  lowBalanceThreshold: number | null
  walletStatus: WalletStatus
}) => {
  if (wallet.walletStatus === 'depleted' || wallet.currentBalance <= 0) {
    return 'depleted' as const
  }

  if (wallet.lowBalanceThreshold !== null && wallet.currentBalance <= wallet.lowBalanceThreshold) {
    return 'critical' as const
  }

  if (wallet.initialBalance <= 0) {
    return 'healthy' as const
  }

  const ratio = wallet.currentBalance / wallet.initialBalance

  if (ratio <= 0.2) {
    return 'critical' as const
  }

  if (ratio <= 0.5) {
    return 'warning' as const
  }

  return 'healthy' as const
}

const mapWallet = (row: WalletRow, { includeCost }: { includeCost: boolean }): AiCreditWallet => {
  const currentBalance = toInt(row.current_balance)
  const reservedBalance = toInt(row.reserved_balance)
  const initialBalance = toInt(row.initial_balance)
  const walletStatus = (normalizeString(row.wallet_status) || 'active') as WalletStatus

  return {
    walletId: normalizeString(row.wallet_id),
    walletName: normalizeString(row.wallet_name),
    walletScope: (normalizeString(row.wallet_scope) || 'client') as AiCreditWallet['walletScope'],
    clientId: normalizeNullableString(row.client_id),
    clientName: normalizeNullableString(row.client_name),
    toolId: normalizeString(row.tool_id),
    toolName: normalizeString(row.tool_name),
    providerId: normalizeNullableString(row.provider_id),
    providerName: normalizeNullableString(row.provider_name),
    creditUnitName: normalizeString(row.credit_unit_name || 'credit') || 'credit',
    initialBalance,
    currentBalance,
    reservedBalance,
    monthlyLimit: toNullableNumber(row.monthly_limit),
    monthlyConsumed: toInt(row.monthly_consumed),
    monthlyResetDay: Math.max(1, toInt(row.monthly_reset_day) || 1),
    lowBalanceThreshold: toNullableNumber(row.low_balance_threshold),
    validFrom: toDateString(row.valid_from as string | { value?: string } | null) || '',
    validUntil: toDateString(row.valid_until as string | { value?: string } | null),
    walletStatus,
    balanceHealth: getBalanceHealth({
      currentBalance,
      initialBalance,
      lowBalanceThreshold: toNullableNumber(row.low_balance_threshold),
      walletStatus
    }),
    usagePercent: initialBalance > 0 ? Math.min(100, Math.round((currentBalance / initialBalance) * 100)) : 0,
    availableBalance: currentBalance - reservedBalance,
    unitCost: includeCost ? toNullableNumber(row.credit_unit_cost) : null,
    costCurrency: includeCost ? normalizeNullableString(row.credit_unit_currency) : null,
    notes: normalizeNullableString(row.notes),
    toolIconUrl: normalizeNullableString(row.icon_url)
  }
}

const mapLedger = (row: LedgerRow, { includeCost }: { includeCost: boolean }): AiCreditLedgerEntry => ({
  ledgerId: normalizeString(row.ledger_id),
  walletId: normalizeString(row.wallet_id),
  requestId: normalizeNullableString(row.request_id),
  entryType: (normalizeString(row.entry_type) || 'debit') as AiCreditLedgerEntry['entryType'],
  creditAmount: toInt(row.credit_amount),
  balanceBefore: toInt(row.balance_before),
  balanceAfter: toInt(row.balance_after),
  consumedByMemberId: normalizeNullableString(row.consumed_by_member_id),
  consumedByName: normalizeNullableString(row.consumed_by_name),
  clientId: normalizeNullableString(row.client_id),
  clientName: normalizeNullableString(row.client_name),
  notionTaskId: normalizeNullableString(row.notion_task_id),
  notionProjectId: normalizeNullableString(row.notion_project_id),
  projectName: normalizeNullableString(row.project_name),
  assetDescription: normalizeNullableString(row.asset_description),
  unitCost: includeCost ? toNullableNumber(row.unit_cost) : null,
  costCurrency: includeCost ? normalizeNullableString(row.cost_currency) : null,
  totalCost: includeCost ? toNullableNumber(row.total_cost) : null,
  totalCostClp: includeCost ? toNullableNumber(row.total_cost_clp) : null,
  reloadReason: normalizeNullableString(row.reload_reason) as AiCreditLedgerEntry['reloadReason'],
  reloadReference: normalizeNullableString(row.reload_reference),
  notes: normalizeNullableString(row.notes),
  createdBy: normalizeNullableString(row.created_by),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null)
})

const publishAiToolingOutboxEvent = async ({
  client,
  aggregateType,
  aggregateId,
  eventType,
  payload
}: {
  client: QueryableClient
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}) => {
  await queryRows(
    `
      INSERT INTO greenhouse_sync.outbox_events (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload_json,
        status,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', CURRENT_TIMESTAMP)
    `,
    [randomUUID(), aggregateType, aggregateId, eventType, JSON.stringify(payload)],
    client
  )
}

export const isAiToolingPostgresEnabled = () => isGreenhousePostgresConfigured()

export const assertAiToolingPostgresReady = async () => {
  if (!isAiToolingPostgresEnabled()) {
    throw new AiToolingValidationError('AI Tooling Postgres store is not configured in this environment.', 503, {
      missingConfig: true,
      code: 'AI_TOOLING_POSTGRES_NOT_CONFIGURED'
    })
  }

  if (Date.now() - aiToolingPostgresReadyAt < AI_TOOLING_POSTGRES_READY_TTL_MS) {
    return
  }

  if (aiToolingPostgresReadyPromise) {
    return aiToolingPostgresReadyPromise
  }

  aiToolingPostgresReadyPromise = (async () => {
    const existingTables = await getExistingAiToolingTables()
    const missingTables = AI_TOOLING_POSTGRES_REQUIRED_TABLES.filter(tableName => !existingTables.has(tableName))

    if (missingTables.length > 0) {
      throw new AiToolingValidationError(
        'AI Tooling Postgres schema is not ready in this environment. Run setup-postgres-ai-tooling before using this module.',
        503,
        {
          code: 'AI_TOOLING_POSTGRES_SCHEMA_NOT_READY',
          missingTables
        }
      )
    }

    aiToolingPostgresReadyAt = Date.now()
  })().catch(error => {
    aiToolingPostgresReadyPromise = null
    throw error
  })

  return aiToolingPostgresReadyPromise.finally(() => {
    aiToolingPostgresReadyPromise = null
  })
}

export const shouldFallbackFromAiToolingPostgres = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  return (
    message.includes('ai tooling postgres store is not configured') ||
    message.includes('ai tooling postgres schema is not ready') ||
    message.includes('greenhouse postgres is not configured')
  )
}

const getProvidersInternal = async (activeOnly = false) => {
  await assertAiToolingPostgresReady()

  const rows = await runGreenhousePostgresQuery<ProviderRow>(
    `
      SELECT
        provider_id,
        provider_name,
        provider_type AS provider_category,
        provider_type AS provider_kind,
        website_url,
        NULL::text AS support_url,
        NULL::text AS icon_url,
        active AS is_active
      FROM greenhouse_core.providers
      WHERE ($1::boolean = FALSE OR active = TRUE)
      ORDER BY provider_name ASC
    `,
    [activeOnly]
  )

  return rows.map(mapProvider)
}

const getToolByIdInternal = async (toolId: string) => {
  await assertAiToolingPostgresReady()

  const rows = await runGreenhousePostgresQuery<ToolRow>(
    `
      SELECT
        t.*,
        p.provider_name
      FROM greenhouse_ai.tool_catalog AS t
      LEFT JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      WHERE t.tool_id = $1
      LIMIT 1
    `,
    [toolId]
  )

  return rows[0] ? mapTool(rows[0]) : null
}

const getLicenseByIdInternal = async (licenseId: string) => {
  await assertAiToolingPostgresReady()

  const rows = await runGreenhousePostgresQuery<LicenseRow>(
    `
      SELECT
        l.license_id,
        l.member_id,
        m.display_name AS member_name,
        m.primary_email AS member_email,
        l.license_status,
        l.activated_at,
        l.expires_at,
        l.access_level,
        l.license_key,
        l.account_email,
        l.notes,
        l.assigned_by_user_id AS assigned_by,
        l.created_at,
        l.updated_at,
        t.*,
        p.provider_name
      FROM greenhouse_ai.member_tool_licenses AS l
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = l.member_id
      INNER JOIN greenhouse_ai.tool_catalog AS t
        ON t.tool_id = l.tool_id
      LEFT JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      WHERE l.license_id = $1
      LIMIT 1
    `,
    [licenseId]
  )

  return rows[0] ? mapLicense(rows[0]) : null
}

const getWalletByIdInternal = async (walletId: string, { includeCost }: { includeCost: boolean }) => {
  await assertAiToolingPostgresReady()
  const { startDate, endDate } = getCurrentMonthDateRange()

  const rows = await runGreenhousePostgresQuery<WalletRow>(
    `
      WITH monthly AS (
        SELECT
          wallet_id,
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS monthly_consumed
        FROM greenhouse_ai.credit_ledger
        WHERE created_at::date BETWEEN $2::date AND $3::date
        GROUP BY wallet_id
      )
      SELECT
        w.wallet_id,
        w.wallet_name,
        w.wallet_scope,
        w.client_id,
        c.client_name,
        w.tool_id,
        t.tool_name,
        t.provider_id,
        p.provider_name,
        w.credit_unit_name,
        w.initial_balance,
        w.current_balance,
        w.reserved_balance,
        w.monthly_limit,
        COALESCE(m.monthly_consumed, w.monthly_consumed, 0) AS monthly_consumed,
        w.monthly_reset_day,
        w.low_balance_threshold,
        w.valid_from,
        w.valid_until,
        w.wallet_status,
        w.notes,
        t.icon_url,
        t.credit_unit_cost,
        t.credit_unit_currency
      FROM greenhouse_ai.credit_wallets AS w
      INNER JOIN greenhouse_ai.tool_catalog AS t
        ON t.tool_id = w.tool_id
      LEFT JOIN greenhouse_core.clients AS c
        ON c.client_id = w.client_id
      LEFT JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      LEFT JOIN monthly AS m
        ON m.wallet_id = w.wallet_id
      WHERE w.wallet_id = $1
      LIMIT 1
    `,
    [walletId, startDate, endDate]
  )

  return rows[0] ? mapWallet(rows[0], { includeCost }) : null
}

const assertOperatorOrAdminMemberInternal = async (memberId: string) => {
  await assertAiToolingPostgresReady()

  const rows = await runGreenhousePostgresQuery<MemberRow>(
    `
      SELECT
        member_id,
        display_name,
        primary_email AS email,
        active
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  const row = rows[0]

  if (!row || !row.active) {
    throw new AiToolingValidationError('Active team member not found.', 404)
  }

  return row
}

const assertClientInternal = async (clientId: string) => {
  await assertAiToolingPostgresReady()

  const rows = await runGreenhousePostgresQuery<ClientRow>(
    `
      SELECT
        client_id,
        client_name,
        active
      FROM greenhouse_core.clients
      WHERE client_id = $1
      LIMIT 1
    `,
    [clientId]
  )

  const row = rows[0]

  if (!row) {
    throw new AiToolingValidationError('Client not found.', 404)
  }

  return row
}

const getUsdToClpRateInternal = async () => {
  try {
    const rows = await runGreenhousePostgresQuery<{ rate: unknown }>(
      `
        SELECT rate
        FROM greenhouse_finance.exchange_rates
        WHERE from_currency = 'USD'
          AND to_currency = 'CLP'
        ORDER BY rate_date DESC
        LIMIT 1
      `
    )

    return toNullableNumber(rows[0]?.rate) ?? 950
  } catch {
    return 950
  }
}

const assertWalletVisibleToTenant = (tenant: TenantContext, wallet: AiCreditWallet) => {
  const viewerKind = getViewerKind(tenant)

  if (viewerKind === 'client' && wallet.clientId !== tenant.clientId) {
    throw new AiToolingValidationError('Forbidden', 403)
  }
}

export const pgGetAiToolCatalogItem = async (toolId: string) => getToolByIdInternal(toolId)

export const pgGetAiToolLicense = async (licenseId: string) => getLicenseByIdInternal(licenseId)

export const pgGetAiCreditWallet = async ({
  walletId,
  tenant
}: {
  walletId: string
  tenant: TenantContext
}) => {
  const includeCost = getViewerKind(tenant) === 'admin'
  const wallet = await getWalletByIdInternal(walletId, { includeCost })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  assertWalletVisibleToTenant(tenant, wallet)

  return wallet
}

export const pgGetAiToolingAdminMetadata = async (): Promise<AiToolingAdminMetadata> => {
  await assertAiToolingPostgresReady()

  const [providers, financeSuppliers, clients, members] = await Promise.all([
    getProvidersInternal(true),
    runGreenhousePostgresQuery<FinanceSupplierRow>(
      `
        SELECT
          supplier_id,
          legal_name,
          trade_name,
          payment_currency
        FROM greenhouse_finance.suppliers
        WHERE is_active = TRUE
        ORDER BY COALESCE(trade_name, legal_name) ASC
      `
    ),
    runGreenhousePostgresQuery<ClientRow>(
      `
        SELECT
          client_id,
          client_name,
          active
        FROM greenhouse_core.clients
        WHERE active = TRUE
        ORDER BY client_name ASC
      `
    ),
    runGreenhousePostgresQuery<MemberRow>(
      `
        SELECT
          member_id,
          display_name,
          primary_email AS email,
          active
        FROM greenhouse_core.members
        WHERE active = TRUE
        ORDER BY display_name ASC
      `
    )
  ])

  return {
    providers,
    financeSuppliers: financeSuppliers.map(row => ({
      supplierId: normalizeString(row.supplier_id),
      legalName: normalizeString(row.legal_name),
      tradeName: normalizeNullableString(row.trade_name),
      paymentCurrency: normalizeNullableString(row.payment_currency)
    })),
    activeClients: clients.map(row => ({
      clientId: normalizeString(row.client_id),
      clientName: normalizeString(row.client_name || row.client_id)
    })),
    activeMembers: members.map(row => ({
      memberId: normalizeString(row.member_id),
      displayName: normalizeString(row.display_name),
      email: normalizeString(row.email || '')
    })),
    toolCategories: [...TOOL_CATEGORIES],
    costModels: [...COST_MODELS],
    accessLevels: [...ACCESS_LEVELS],
    licenseStatuses: [...LICENSE_STATUSES],
    walletScopes: [...WALLET_SCOPES],
    walletStatuses: [...WALLET_STATUSES],
    reloadReasons: [...RELOAD_REASONS]
  }
}

export const pgListAiToolsCatalog = async ({
  category,
  costModel,
  activeOnly = true
}: {
  category?: string | null
  costModel?: string | null
  activeOnly?: boolean
} = {}): Promise<AiToolsCatalogResponse> => {
  await assertAiToolingPostgresReady()

  const values: unknown[] = []
  const where: string[] = ['1 = 1']

  if (activeOnly) {
    where.push('t.is_active = TRUE')
  }

  if (category) {
    values.push(category)
    where.push(`t.tool_category = $${values.length}`)
  }

  if (costModel) {
    values.push(costModel)
    where.push(`t.cost_model = $${values.length}`)
  }

  const [providers, rows] = await Promise.all([
    getProvidersInternal(activeOnly),
    runGreenhousePostgresQuery<ToolRow>(
      `
        SELECT
          t.*,
          p.provider_name
        FROM greenhouse_ai.tool_catalog AS t
        LEFT JOIN greenhouse_core.providers AS p
          ON p.provider_id = t.provider_id
        WHERE ${where.join(' AND ')}
        ORDER BY t.sort_order ASC, t.tool_name ASC
      `,
      values
    )
  ])

  const tools = rows.map(mapTool)

  return {
    tools,
    providers,
    summary: {
      total: tools.length,
      active: tools.filter(tool => tool.isActive).length,
      categories: tools.reduce<Record<string, number>>((accumulator, tool) => {
        accumulator[tool.toolCategory] = (accumulator[tool.toolCategory] || 0) + 1

        return accumulator
      }, {})
    }
  }
}

export const pgListAiToolLicenses = async ({
  memberId,
  status
}: {
  memberId?: string | null
  status?: string | null
} = {}): Promise<AiToolLicensesResponse> => {
  await assertAiToolingPostgresReady()

  const values: unknown[] = []
  const where: string[] = ['1 = 1']

  if (memberId) {
    values.push(memberId)
    where.push(`l.member_id = $${values.length}`)
  }

  if (status) {
    values.push(status)
    where.push(`l.license_status = $${values.length}`)
  }

  const rows = await runGreenhousePostgresQuery<LicenseRow>(
    `
      SELECT
        l.license_id,
        l.member_id,
        m.display_name AS member_name,
        m.primary_email AS member_email,
        l.license_status,
        l.activated_at,
        l.expires_at,
        l.access_level,
        l.license_key,
        l.account_email,
        l.notes,
        l.assigned_by_user_id AS assigned_by,
        l.created_at,
        l.updated_at,
        t.*,
        p.provider_name
      FROM greenhouse_ai.member_tool_licenses AS l
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = l.member_id
      INNER JOIN greenhouse_ai.tool_catalog AS t
        ON t.tool_id = l.tool_id
      LEFT JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      WHERE ${where.join(' AND ')}
      ORDER BY m.display_name ASC, t.sort_order ASC, t.tool_name ASC
    `,
    values
  )

  const licenses = rows.map(mapLicense)

  return {
    licenses,
    summary: {
      total: licenses.length,
      active: licenses.filter(license => license.licenseStatus === 'active').length,
      members: new Set(licenses.map(license => license.memberId)).size
    }
  }
}

export const pgListAiCreditWallets = async ({
  tenant,
  clientId,
  toolId,
  status,
  scope
}: {
  tenant: TenantContext
  clientId?: string | null
  toolId?: string | null
  status?: string | null
  scope?: string | null
}): Promise<AiCreditWalletsResponse> => {
  await assertAiToolingPostgresReady()

  const viewerKind = getViewerKind(tenant)
  const { startDate, endDate } = getCurrentMonthDateRange()
  const values: unknown[] = [startDate, endDate]
  const where: string[] = ['1 = 1']

  if (viewerKind === 'client') {
    values.push(tenant.clientId)
    where.push(`w.client_id = $${values.length}`)
  } else if (clientId) {
    values.push(clientId)
    where.push(`w.client_id = $${values.length}`)
  }

  if (toolId) {
    values.push(toolId)
    where.push(`w.tool_id = $${values.length}`)
  }

  if (status) {
    values.push(status)
    where.push(`w.wallet_status = $${values.length}`)
  }

  if (scope) {
    values.push(scope)
    where.push(`w.wallet_scope = $${values.length}`)
  }

  const rows = await runGreenhousePostgresQuery<WalletRow>(
    `
      WITH monthly AS (
        SELECT
          wallet_id,
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS monthly_consumed
        FROM greenhouse_ai.credit_ledger
        WHERE created_at::date BETWEEN $1::date AND $2::date
        GROUP BY wallet_id
      )
      SELECT
        w.wallet_id,
        w.wallet_name,
        w.wallet_scope,
        w.client_id,
        c.client_name,
        w.tool_id,
        t.tool_name,
        t.provider_id,
        p.provider_name,
        w.credit_unit_name,
        w.initial_balance,
        w.current_balance,
        w.reserved_balance,
        w.monthly_limit,
        COALESCE(m.monthly_consumed, w.monthly_consumed, 0) AS monthly_consumed,
        w.monthly_reset_day,
        w.low_balance_threshold,
        w.valid_from,
        w.valid_until,
        w.wallet_status,
        w.notes,
        t.icon_url,
        t.credit_unit_cost,
        t.credit_unit_currency
      FROM greenhouse_ai.credit_wallets AS w
      INNER JOIN greenhouse_ai.tool_catalog AS t
        ON t.tool_id = w.tool_id
      LEFT JOIN greenhouse_core.clients AS c
        ON c.client_id = w.client_id
      LEFT JOIN greenhouse_core.providers AS p
        ON p.provider_id = t.provider_id
      LEFT JOIN monthly AS m
        ON m.wallet_id = w.wallet_id
      WHERE ${where.join(' AND ')}
      ORDER BY w.wallet_status ASC, w.wallet_name ASC
    `,
    values
  )

  const includeCost = viewerKind === 'admin'
  const wallets = rows.map(row => mapWallet(row, { includeCost }))

  return {
    wallets,
    summary: {
      totalWallets: wallets.length,
      activeWallets: wallets.filter(wallet => wallet.walletStatus === 'active').length,
      depletedWallets: wallets.filter(wallet => wallet.walletStatus === 'depleted').length,
      totalCreditsAvailable: wallets.reduce((sum, wallet) => sum + wallet.availableBalance, 0)
    }
  }
}

export const pgListAiCreditLedger = async ({
  tenant,
  walletId,
  entryType,
  dateFrom,
  dateTo,
  memberId,
  limit = 50,
  offset = 0
}: {
  tenant: TenantContext
  walletId: string
  entryType?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  memberId?: string | null
  limit?: number
  offset?: number
}): Promise<AiCreditLedgerResponse> => {
  await assertAiToolingPostgresReady()
  const wallet = await getWalletByIdInternal(walletId, { includeCost: true })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  assertWalletVisibleToTenant(tenant, wallet)

  const values: unknown[] = [walletId]
  const where: string[] = ['l.wallet_id = $1']

  if (entryType && entryType !== 'all') {
    values.push(entryType)
    where.push(`l.entry_type = $${values.length}`)
  }

  if (dateFrom) {
    values.push(dateFrom)
    where.push(`l.created_at::date >= $${values.length}::date`)
  }

  if (dateTo) {
    values.push(dateTo)
    where.push(`l.created_at::date <= $${values.length}::date`)
  }

  if (memberId) {
    values.push(memberId)
    where.push(`l.consumed_by_member_id = $${values.length}`)
  }

  const summaryValues = [...values]
  const countValues = [...values]
  const limitValue = Math.min(Math.max(limit, 1), 200)
  const offsetValue = Math.max(offset, 0)

  values.push(limitValue, offsetValue)
  const limitIndex = values.length - 1
  const offsetIndex = values.length

  const [entriesRows, summaryRows, countRows] = await Promise.all([
    runGreenhousePostgresQuery<LedgerRow>(
      `
        SELECT
          l.ledger_id,
          l.wallet_id,
          l.request_id,
          l.entry_type,
          l.credit_amount,
          l.balance_before,
          l.balance_after,
          l.consumed_by_member_id,
          m.display_name AS consumed_by_name,
          l.client_id,
          c.client_name,
          l.notion_task_id,
          l.notion_project_id,
          l.project_name,
          l.asset_description,
          l.unit_cost,
          l.cost_currency,
          l.total_cost,
          l.total_cost_clp,
          l.reload_reason,
          l.reload_reference,
          l.notes,
          l.created_by_user_id AS created_by,
          l.created_at
        FROM greenhouse_ai.credit_ledger AS l
        LEFT JOIN greenhouse_core.members AS m
          ON m.member_id = l.consumed_by_member_id
        LEFT JOIN greenhouse_core.clients AS c
          ON c.client_id = l.client_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.created_at DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      values
    ),
    runGreenhousePostgresQuery<{
      total_debits: unknown
      total_credits: unknown
      total_cost_usd: unknown
      total_cost_clp: unknown
    }>(
      `
        SELECT
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS total_debits,
          SUM(CASE WHEN entry_type = 'credit' THEN credit_amount ELSE 0 END) AS total_credits,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost, 0) ELSE 0 END) AS total_cost_usd,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost_clp, 0) ELSE 0 END) AS total_cost_clp
        FROM greenhouse_ai.credit_ledger AS l
        WHERE ${where.join(' AND ')}
      `,
      summaryValues
    ),
    runGreenhousePostgresQuery<{ total_entries: unknown }>(
      `
        SELECT COUNT(*) AS total_entries
        FROM greenhouse_ai.credit_ledger AS l
        WHERE ${where.join(' AND ')}
      `,
      countValues
    )
  ])

  const includeCost = getViewerKind(tenant) === 'admin'
  const entries = entriesRows.map(row => mapLedger(row, { includeCost }))
  const summary = summaryRows[0]
  const totalEntries = toInt(countRows[0]?.total_entries)

  return {
    entries,
    summary: {
      totalEntries,
      totalDebits: toInt(summary?.total_debits),
      totalCredits: toInt(summary?.total_credits),
      totalCostUsd: includeCost ? toNullableNumber(summary?.total_cost_usd) : null,
      totalCostClp: includeCost ? toNullableNumber(summary?.total_cost_clp) : null
    },
    pagination: {
      limit: limitValue,
      offset: offsetValue,
      hasMore: offsetValue + entries.length < totalEntries
    }
  }
}

export const pgGetAiCreditSummary = async ({
  tenant,
  clientId,
  period = 'current_month'
}: {
  tenant: TenantContext
  clientId?: string | null
  period?: string
}): Promise<ClientCreditSummary | AdminCreditSummary> => {
  await assertAiToolingPostgresReady()
  const viewerKind = getViewerKind(tenant)
  const effectiveClientId = viewerKind === 'client' ? tenant.clientId : clientId || null

  const walletsResponse = await pgListAiCreditWallets({
    tenant,
    clientId: effectiveClientId
  })

  const { startDate, endDate } = getPeriodDateRange(period)
  const values: unknown[] = [startDate, endDate]
  const where: string[] = ['l.created_at::date BETWEEN $1::date AND $2::date']

  if (effectiveClientId) {
    values.push(effectiveClientId)
    where.push(`l.client_id = $${values.length}`)
  }

  const [projectRows, costByToolRows, costByClientRows, summaryRows] = await Promise.all([
    runGreenhousePostgresQuery<{ project_name: string | null; credits_consumed: unknown }>(
      `
        SELECT
          COALESCE(l.project_name, 'Sin proyecto') AS project_name,
          SUM(l.credit_amount) AS credits_consumed
        FROM greenhouse_ai.credit_ledger AS l
        WHERE ${where.join(' AND ')}
          AND l.entry_type = 'debit'
        GROUP BY l.project_name
        ORDER BY credits_consumed DESC
        LIMIT 5
      `,
      values
    ),
    runGreenhousePostgresQuery<{ tool_name: string | null; credits_consumed: unknown; total_cost_usd: unknown }>(
      `
        SELECT
          t.tool_name,
          SUM(l.credit_amount) AS credits_consumed,
          SUM(COALESCE(l.total_cost, 0)) AS total_cost_usd
        FROM greenhouse_ai.credit_ledger AS l
        INNER JOIN greenhouse_ai.credit_wallets AS w
          ON w.wallet_id = l.wallet_id
        INNER JOIN greenhouse_ai.tool_catalog AS t
          ON t.tool_id = w.tool_id
        WHERE ${where.join(' AND ')}
          AND l.entry_type = 'debit'
        GROUP BY t.tool_name
        ORDER BY total_cost_usd DESC, credits_consumed DESC
        LIMIT 10
      `,
      values
    ),
    runGreenhousePostgresQuery<{ client_name: string | null; credits_consumed: unknown; total_cost_usd: unknown }>(
      `
        SELECT
          COALESCE(c.client_name, 'Pool interno') AS client_name,
          SUM(l.credit_amount) AS credits_consumed,
          SUM(COALESCE(l.total_cost, 0)) AS total_cost_usd
        FROM greenhouse_ai.credit_ledger AS l
        LEFT JOIN greenhouse_core.clients AS c
          ON c.client_id = l.client_id
        WHERE ${where.join(' AND ')}
          AND l.entry_type = 'debit'
        GROUP BY c.client_name
        ORDER BY total_cost_usd DESC, credits_consumed DESC
        LIMIT 10
      `,
      values
    ),
    runGreenhousePostgresQuery<{ total_credits_consumed: unknown; total_cost_usd: unknown; total_cost_clp: unknown }>(
      `
        SELECT
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS total_credits_consumed,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost, 0) ELSE 0 END) AS total_cost_usd,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost_clp, 0) ELSE 0 END) AS total_cost_clp
        FROM greenhouse_ai.credit_ledger AS l
        WHERE ${where.join(' AND ')}
      `,
      values
    )
  ])

  const baseSummary: ClientCreditSummary = {
    wallets: walletsResponse.wallets.map(wallet => ({
      ...wallet,
      toolIconUrl: wallet.toolIconUrl
    })),
    totalCreditsAvailable: walletsResponse.summary.totalCreditsAvailable,
    totalCreditsConsumed: toInt(summaryRows[0]?.total_credits_consumed),
    topConsumingProjects: projectRows.map(row => ({
      projectName: String(row.project_name || 'Sin proyecto'),
      creditsConsumed: toInt(row.credits_consumed)
    }))
  }

  if (viewerKind !== 'admin') {
    return baseSummary
  }

  return {
    ...baseSummary,
    totalCostUsd: toNumber(summaryRows[0]?.total_cost_usd),
    totalCostClp: toNumber(summaryRows[0]?.total_cost_clp),
    costByTool: costByToolRows.map(row => ({
      toolName: String(row.tool_name || 'Herramienta'),
      creditsConsumed: toInt(row.credits_consumed),
      totalCostUsd: toNumber(row.total_cost_usd)
    })),
    costByClient: costByClientRows.map(row => ({
      clientName: String(row.client_name || 'Cliente'),
      creditsConsumed: toInt(row.credits_consumed),
      totalCostUsd: toNumber(row.total_cost_usd)
    }))
  }
}

export const pgCreateAiTool = async (input: CreateAiToolInput) => {
  await assertAiToolingPostgresReady()
  const toolId = slugify(normalizeString(input.toolId || input.toolName))

  if (!toolId) {
    throw new AiToolingValidationError('toolId is required.')
  }

  if (!normalizeString(input.toolName)) {
    throw new AiToolingValidationError('toolName is required.')
  }

  assertEnum(input.toolCategory, TOOL_CATEGORIES, 'toolCategory')
  assertEnum(input.costModel, COST_MODELS, 'costModel')

  const providers = await getProvidersInternal(false)

  if (!providers.find(provider => provider.providerId === input.providerId)) {
    throw new AiToolingValidationError('Provider not found.', 404)
  }

  const existing = await getToolByIdInternal(toolId)

  if (existing) {
    throw new AiToolingValidationError('AI tool already exists.', 409, { toolId })
  }

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        INSERT INTO greenhouse_ai.tool_catalog (
          tool_id,
          tool_name,
          provider_id,
          vendor,
          tool_category,
          tool_subcategory,
          cost_model,
          subscription_amount,
          subscription_currency,
          subscription_billing_cycle,
          subscription_seats,
          credit_unit_name,
          credit_unit_cost,
          credit_unit_currency,
          credits_included_monthly,
          fin_supplier_id,
          description,
          website_url,
          icon_url,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13::numeric, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
      [
        toolId,
        normalizeString(input.toolName),
        normalizeString(input.providerId),
        normalizeNullableString(input.vendor),
        input.toolCategory,
        normalizeNullableString(input.toolSubcategory),
        input.costModel,
        input.subscriptionAmount ?? null,
        normalizeString(input.subscriptionCurrency || 'USD') || 'USD',
        normalizeString(input.subscriptionBillingCycle || 'monthly') || 'monthly',
        input.subscriptionSeats ?? null,
        normalizeNullableString(input.creditUnitName),
        input.creditUnitCost ?? null,
        normalizeString(input.creditUnitCurrency || 'USD') || 'USD',
        input.creditsIncludedMonthly ?? null,
        normalizeNullableString(input.finSupplierId),
        normalizeNullableString(input.description),
        normalizeNullableString(input.websiteUrl),
        normalizeNullableString(input.iconUrl),
        input.isActive ?? true,
        input.sortOrder ?? 0
      ],
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_tool',
      aggregateId: toolId,
      eventType: 'ai_tool.created',
      payload: { toolId, providerId: input.providerId }
    })
  })

  const created = await getToolByIdInternal(toolId)

  if (!created) {
    throw new AiToolingValidationError('Created tool could not be reloaded.', 500)
  }

  return created
}

export const pgUpdateAiTool = async (toolId: string, input: UpdateAiToolInput) => {
  await assertAiToolingPostgresReady()
  const existing = await getToolByIdInternal(toolId)

  if (!existing) {
    throw new AiToolingValidationError('AI tool not found.', 404)
  }

  if (input.providerId) {
    const providers = await getProvidersInternal(false)

    if (!providers.find(provider => provider.providerId === input.providerId)) {
      throw new AiToolingValidationError('Provider not found.', 404)
    }
  }

  const values: unknown[] = []
  const updates: string[] = []

  const setField = (column: string, value: unknown, cast?: string) => {
    values.push(value)
    const placeholder = `$${values.length}${cast ? `::${cast}` : ''}`

    updates.push(`${column} = ${placeholder}`)
  }

  if (input.toolName !== undefined) setField('tool_name', normalizeString(input.toolName))
  if (input.providerId !== undefined) setField('provider_id', normalizeString(input.providerId))
  if (input.vendor !== undefined) setField('vendor', normalizeNullableString(input.vendor))
  if (input.toolCategory !== undefined) setField('tool_category', assertEnum(input.toolCategory, TOOL_CATEGORIES, 'toolCategory'))
  if (input.toolSubcategory !== undefined) setField('tool_subcategory', normalizeNullableString(input.toolSubcategory))
  if (input.costModel !== undefined) setField('cost_model', assertEnum(input.costModel, COST_MODELS, 'costModel'))
  if (input.subscriptionAmount !== undefined) setField('subscription_amount', input.subscriptionAmount ?? null, 'numeric')
  if (input.subscriptionCurrency !== undefined) setField('subscription_currency', normalizeString(input.subscriptionCurrency))
  if (input.subscriptionBillingCycle !== undefined) setField('subscription_billing_cycle', normalizeString(input.subscriptionBillingCycle))
  if (input.subscriptionSeats !== undefined) setField('subscription_seats', input.subscriptionSeats ?? null)
  if (input.creditUnitName !== undefined) setField('credit_unit_name', normalizeNullableString(input.creditUnitName))
  if (input.creditUnitCost !== undefined) setField('credit_unit_cost', input.creditUnitCost ?? null, 'numeric')
  if (input.creditUnitCurrency !== undefined) setField('credit_unit_currency', normalizeString(input.creditUnitCurrency))
  if (input.creditsIncludedMonthly !== undefined) setField('credits_included_monthly', input.creditsIncludedMonthly ?? null)
  if (input.finSupplierId !== undefined) setField('fin_supplier_id', normalizeNullableString(input.finSupplierId))
  if (input.description !== undefined) setField('description', normalizeNullableString(input.description))
  if (input.websiteUrl !== undefined) setField('website_url', normalizeNullableString(input.websiteUrl))
  if (input.iconUrl !== undefined) setField('icon_url', normalizeNullableString(input.iconUrl))
  if (input.isActive !== undefined) setField('is_active', Boolean(input.isActive))
  if (input.sortOrder !== undefined) setField('sort_order', input.sortOrder)

  if (updates.length === 0) {
    return existing
  }

  values.push(toolId)
  const toolIdIndex = values.length
  const publishesFinanceLicenseCost = hasToolCostImpact(input)

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        UPDATE greenhouse_ai.tool_catalog
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE tool_id = $${toolIdIndex}
      `,
      values,
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_tool',
      aggregateId: toolId,
      eventType: 'ai_tool.updated',
      payload: { toolId, providerId: input.providerId ?? existing.providerId }
    })

    if (publishesFinanceLicenseCost) {
      const period = getCurrentSantiagoPeriod()
      const activeLicenses = await getActiveLicenseScopesForTool(toolId, client)

      for (const license of activeLicenses) {
        await publishAiToolingOutboxEvent({
          client,
          aggregateType: 'finance_license_cost',
          aggregateId: license.license_id,
          eventType: 'finance.license_cost.updated',
          payload: {
            licenseId: license.license_id,
            memberId: license.member_id,
            toolId: license.tool_id,
            providerId: input.providerId ?? existing.providerId,
            activatedAt: toIsoDate(license.activated_at),
            expiresAt: toIsoDate(license.expires_at),
            ...period
          }
        })
      }
    }
  })

  const updated = await getToolByIdInternal(toolId)

  if (!updated) {
    throw new AiToolingValidationError('Updated tool could not be reloaded.', 500)
  }

  return updated
}

export const pgCreateLicense = async (input: CreateLicenseInput, actorUserId: string) => {
  await assertAiToolingPostgresReady()

  await assertOperatorOrAdminMemberInternal(input.memberId)
  const tool = await getToolByIdInternal(input.toolId)

  if (!tool || !tool.isActive) {
    throw new AiToolingValidationError('AI tool not found.', 404)
  }

  const licenseId = `${input.memberId}_${input.toolId}`
  const existing = await getLicenseByIdInternal(licenseId)
  const accessLevel = input.accessLevel ? assertEnum(input.accessLevel, ACCESS_LEVELS, 'accessLevel') : 'full'
  const expiresAt = input.expiresAt ? assertDateString(input.expiresAt, 'expiresAt') : null

  if (existing?.licenseStatus === 'active') {
    throw new AiToolingValidationError('This member already has an active license for the selected tool.', 409, { licenseId })
  }

  await withGreenhousePostgresTransaction(async client => {
    if (existing) {
      await queryRows(
        `
          UPDATE greenhouse_ai.member_tool_licenses
          SET
            license_status = 'active',
            activated_at = CURRENT_DATE,
            expires_at = $2::date,
            access_level = $3,
            account_email = $4,
            notes = $5,
            assigned_by_user_id = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE license_id = $1
        `,
        [
          licenseId,
          expiresAt,
          accessLevel,
          normalizeNullableString(input.accountEmail),
          normalizeNullableString(input.notes),
          actorUserId
        ],
        client
      )
    } else {
      await queryRows(
        `
          INSERT INTO greenhouse_ai.member_tool_licenses (
            license_id,
            member_id,
            tool_id,
            license_status,
            activated_at,
            expires_at,
            access_level,
            account_email,
            notes,
            assigned_by_user_id,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, 'active', CURRENT_DATE, $4::date, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `,
        [
          licenseId,
          input.memberId,
          input.toolId,
          expiresAt,
          accessLevel,
          normalizeNullableString(input.accountEmail),
          normalizeNullableString(input.notes),
          actorUserId
        ],
        client
      )
    }

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_license',
      aggregateId: licenseId,
      eventType: existing ? 'ai_license.reactivated' : 'ai_license.created',
      payload: { licenseId, memberId: input.memberId, toolId: input.toolId, providerId: tool.providerId }
    })

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'finance_license_cost',
      aggregateId: licenseId,
      eventType: 'finance.license_cost.updated',
      payload: {
        licenseId,
        memberId: input.memberId,
        toolId: input.toolId,
        providerId: tool.providerId,
        activatedAt: getCurrentDateString(),
        expiresAt,
        ...getCurrentSantiagoPeriod()
      }
    })
  })

  const created = await getLicenseByIdInternal(licenseId)

  if (!created) {
    throw new AiToolingValidationError('License could not be reloaded.', 500)
  }

  return created
}

export const pgUpdateLicense = async (licenseId: string, input: UpdateLicenseInput) => {
  await assertAiToolingPostgresReady()
  const existing = await getLicenseByIdInternal(licenseId)

  if (!existing) {
    throw new AiToolingValidationError('License not found.', 404)
  }

  const values: unknown[] = []
  const updates: string[] = []

  const setField = (column: string, value: unknown, cast?: string) => {
    values.push(value)
    updates.push(`${column} = $${values.length}${cast ? `::${cast}` : ''}`)
  }

  if (input.licenseStatus !== undefined) setField('license_status', assertEnum(input.licenseStatus, LICENSE_STATUSES, 'licenseStatus'))
  if (input.accessLevel !== undefined) setField('access_level', assertEnum(input.accessLevel, ACCESS_LEVELS, 'accessLevel'))
  if (input.accountEmail !== undefined) setField('account_email', normalizeNullableString(input.accountEmail))
  if (input.notes !== undefined) setField('notes', normalizeNullableString(input.notes))
  if (input.expiresAt !== undefined) setField('expires_at', input.expiresAt ? assertDateString(input.expiresAt, 'expiresAt') : null, 'date')

  if (updates.length === 0) {
    return existing
  }

  values.push(licenseId)
  const licenseIndex = values.length

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        UPDATE greenhouse_ai.member_tool_licenses
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE license_id = $${licenseIndex}
      `,
      values,
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_license',
      aggregateId: licenseId,
      eventType: 'ai_license.updated',
      payload: { licenseId, toolId: existing.toolId, memberId: existing.memberId, providerId: existing.tool?.providerId ?? null }
    })

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'finance_license_cost',
      aggregateId: licenseId,
      eventType: 'finance.license_cost.updated',
      payload: {
        licenseId,
        memberId: existing.memberId,
        toolId: existing.toolId,
        providerId: existing.tool?.providerId ?? null,
        activatedAt: existing.activatedAt,
        expiresAt: input.expiresAt ?? existing.expiresAt,
        ...getCurrentSantiagoPeriod()
      }
    })
  })

  const updated = await getLicenseByIdInternal(licenseId)

  if (!updated) {
    throw new AiToolingValidationError('Updated license could not be reloaded.', 500)
  }

  return updated
}

export const pgCreateWallet = async ({
  input,
  actorUserId
}: {
  input: CreateWalletInput
  actorUserId: string
}) => {
  await assertAiToolingPostgresReady()
  const walletScope = assertEnum(input.walletScope, WALLET_SCOPES, 'walletScope')
  const tool = await getToolByIdInternal(input.toolId)

  if (!tool || !tool.isActive) {
    throw new AiToolingValidationError('AI tool not found.', 404)
  }

  const initialBalance = assertPositiveInteger(input.initialBalance, 'initialBalance')
  const validFrom = assertDateString(input.validFrom, 'validFrom')
  const validUntil = input.validUntil ? assertDateString(input.validUntil, 'validUntil') : null
  const monthlyLimit = input.monthlyLimit === undefined || input.monthlyLimit === null ? null : assertPositiveInteger(input.monthlyLimit, 'monthlyLimit')

  const monthlyResetDay =
    input.monthlyResetDay === undefined || input.monthlyResetDay === null ? 1 : assertPositiveInteger(input.monthlyResetDay, 'monthlyResetDay')

  const lowBalanceThreshold =
    input.lowBalanceThreshold === undefined || input.lowBalanceThreshold === null
      ? Math.min(50, initialBalance)
      : assertPositiveInteger(input.lowBalanceThreshold, 'lowBalanceThreshold', { min: 0 })

  let clientId: string | null = null
  let clientName: string | null = null

  if (walletScope === 'client') {
    clientId = normalizeString(input.clientId)

    if (!clientId) {
      throw new AiToolingValidationError('clientId is required for client wallets.')
    }

    const client = await assertClientInternal(clientId)

    if (!client.active) {
      throw new AiToolingValidationError('Client is not active.', 409)
    }

    clientName = normalizeString(client.client_name || client.client_id)
  }

  const ownerSlug = walletScope === 'client' ? clientId : 'internal'
  const walletId = `${walletScope}_${ownerSlug}_${tool.toolId}`
  const existing = await getWalletByIdInternal(walletId, { includeCost: true })

  if (existing) {
    throw new AiToolingValidationError('Wallet already exists for this scope and tool.', 409, { walletId })
  }

  const walletName = walletScope === 'client' ? `${clientName} - ${tool.toolName}` : `Pool interno - ${tool.toolName}`
  const unitCost = tool.creditUnitCost ?? 0
  const costCurrency = tool.creditUnitCurrency || 'USD'

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        INSERT INTO greenhouse_ai.credit_wallets (
          wallet_id,
          wallet_name,
          wallet_scope,
          client_id,
          tool_id,
          credit_unit_name,
          initial_balance,
          current_balance,
          reserved_balance,
          monthly_limit,
          monthly_consumed,
          monthly_reset_day,
          low_balance_threshold,
          valid_from,
          valid_until,
          wallet_status,
          notes,
          alert_sent,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $7, 0, $8, 0, $9, $10, $11::date, $12::date, 'active', $13, FALSE, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
      [
        walletId,
        walletName,
        walletScope,
        clientId,
        tool.toolId,
        tool.creditUnitName || 'credit',
        initialBalance,
        monthlyLimit,
        monthlyResetDay,
        lowBalanceThreshold,
        validFrom,
        validUntil,
        normalizeNullableString(input.notes),
        actorUserId
      ],
      client
    )

    await queryRows(
      `
        INSERT INTO greenhouse_ai.credit_ledger (
          ledger_id,
          wallet_id,
          request_id,
          entry_type,
          credit_amount,
          balance_before,
          balance_after,
          client_id,
          unit_cost,
          cost_currency,
          total_cost,
          total_cost_clp,
          reload_reason,
          notes,
          created_by_user_id,
          created_at
        )
        VALUES (
          $1, $2, $3, 'credit', $4, 0, $4, $5, $6::numeric, $7, 0::numeric, 0::numeric, 'initial_allocation', $8, $9, CURRENT_TIMESTAMP
        )
      `,
      [
        `ledger-${randomUUID()}`,
        walletId,
        `initial-${walletId}`,
        initialBalance,
        clientId,
        unitCost,
        costCurrency,
        normalizeNullableString(input.notes),
        actorUserId
      ],
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_wallet',
      aggregateId: walletId,
      eventType: 'ai_wallet.created',
      payload: { walletId, toolId: tool.toolId, providerId: tool.providerId, clientId }
    })
  })

  const created = await getWalletByIdInternal(walletId, { includeCost: true })

  if (!created) {
    throw new AiToolingValidationError('Created wallet could not be reloaded.', 500)
  }

  return created
}

export const pgUpdateWallet = async (walletId: string, input: UpdateWalletInput) => {
  await assertAiToolingPostgresReady()
  const existing = await getWalletByIdInternal(walletId, { includeCost: true })

  if (!existing) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  const values: unknown[] = []
  const updates: string[] = []

  const setField = (column: string, value: unknown, cast?: string) => {
    values.push(value)
    updates.push(`${column} = $${values.length}${cast ? `::${cast}` : ''}`)
  }

  if (input.monthlyLimit !== undefined) setField('monthly_limit', input.monthlyLimit === null ? null : assertPositiveInteger(input.monthlyLimit, 'monthlyLimit'))
  if (input.monthlyResetDay !== undefined) setField('monthly_reset_day', input.monthlyResetDay === null ? 1 : assertPositiveInteger(input.monthlyResetDay, 'monthlyResetDay'))
  if (input.lowBalanceThreshold !== undefined) setField('low_balance_threshold', input.lowBalanceThreshold === null ? null : assertPositiveInteger(input.lowBalanceThreshold, 'lowBalanceThreshold', { min: 0 }))
  if (input.validFrom !== undefined) setField('valid_from', assertDateString(input.validFrom, 'validFrom'), 'date')
  if (input.validUntil !== undefined) setField('valid_until', input.validUntil ? assertDateString(input.validUntil, 'validUntil') : null, 'date')
  if (input.walletStatus !== undefined) setField('wallet_status', assertEnum(input.walletStatus, WALLET_STATUSES, 'walletStatus'))
  if (input.notes !== undefined) setField('notes', normalizeNullableString(input.notes))

  if (updates.length === 0) {
    return existing
  }

  values.push(walletId)
  const walletIndex = values.length

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        UPDATE greenhouse_ai.credit_wallets
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE wallet_id = $${walletIndex}
      `,
      values,
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_wallet',
      aggregateId: walletId,
      eventType: 'ai_wallet.updated',
      payload: { walletId, toolId: existing.toolId, providerId: existing.providerId, clientId: existing.clientId }
    })
  })

  const updated = await getWalletByIdInternal(walletId, { includeCost: true })

  if (!updated) {
    throw new AiToolingValidationError('Updated wallet could not be reloaded.', 500)
  }

  return updated
}

export const pgConsumeAiCredits = async ({
  input,
  actorUserId
}: {
  input: {
    requestId: string
    walletId: string
    creditAmount: number
    consumedByMemberId: string
    notionTaskId?: string | null
    notionProjectId?: string | null
    projectName?: string | null
    assetDescription: string
    clientId?: string | null
    notes?: string | null
  }
  actorUserId: string
}) => {
  await assertAiToolingPostgresReady()
  const requestId = normalizeString(input.requestId)
  const wallet = await getWalletByIdInternal(normalizeString(input.walletId), { includeCost: true })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  await assertOperatorOrAdminMemberInternal(normalizeString(input.consumedByMemberId))
  const creditAmount = assertPositiveInteger(input.creditAmount, 'creditAmount')
  const assetDescription = normalizeString(input.assetDescription)

  if (!requestId) {
    throw new AiToolingValidationError('requestId is required.')
  }

  if (!assetDescription) {
    throw new AiToolingValidationError('assetDescription is required.')
  }

  const existingRows = await runGreenhousePostgresQuery<LedgerRow>(
    `
      SELECT
        l.ledger_id,
        l.wallet_id,
        l.request_id,
        l.entry_type,
        l.credit_amount,
        l.balance_before,
        l.balance_after,
        l.consumed_by_member_id,
        m.display_name AS consumed_by_name,
        l.client_id,
        c.client_name,
        l.notion_task_id,
        l.notion_project_id,
        l.project_name,
        l.asset_description,
        l.unit_cost,
        l.cost_currency,
        l.total_cost,
        l.total_cost_clp,
        l.reload_reason,
        l.reload_reference,
        l.notes,
        l.created_by_user_id AS created_by,
        l.created_at
      FROM greenhouse_ai.credit_ledger AS l
      LEFT JOIN greenhouse_core.members AS m
        ON m.member_id = l.consumed_by_member_id
      LEFT JOIN greenhouse_core.clients AS c
        ON c.client_id = l.client_id
      WHERE l.wallet_id = $1
        AND l.request_id = $2
        AND l.entry_type = 'debit'
      LIMIT 1
    `,
    [wallet.walletId, requestId]
  )

  if (existingRows[0]) {
    return {
      entry: mapLedger(existingRows[0], { includeCost: true }),
      wallet
    }
  }

  if (wallet.walletStatus === 'suspended') {
    throw new AiToolingValidationError('Wallet is suspended.', 409)
  }

  if (wallet.validUntil && wallet.validUntil < getCurrentDateString()) {
    throw new AiToolingValidationError('Wallet has expired.', 409)
  }

  if (wallet.availableBalance < creditAmount) {
    throw new AiToolingValidationError('Insufficient wallet balance.', 409, {
      availableBalance: wallet.availableBalance
    })
  }

  if (wallet.monthlyLimit !== null && wallet.monthlyConsumed + creditAmount > wallet.monthlyLimit) {
    throw new AiToolingValidationError('Monthly wallet limit exceeded.', 409, {
      monthlyConsumed: wallet.monthlyConsumed,
      monthlyLimit: wallet.monthlyLimit
    })
  }

  const clientId = wallet.walletScope === 'client' ? wallet.clientId : normalizeNullableString(input.clientId)

  if (wallet.walletScope === 'client' && input.clientId && input.clientId !== wallet.clientId) {
    throw new AiToolingValidationError('clientId does not match wallet owner.', 409)
  }

  if (clientId) {
    await assertClientInternal(clientId)
  }

  const balanceBefore = wallet.currentBalance
  const balanceAfter = wallet.currentBalance - creditAmount
  const unitCost = wallet.unitCost ?? 0
  const totalCost = unitCost * creditAmount
  const usdToClpRate = await getUsdToClpRateInternal()
  const totalCostClp = (wallet.costCurrency || 'USD') === 'USD' ? totalCost * usdToClpRate : totalCost
  const nextStatus: WalletStatus = balanceAfter <= 0 ? 'depleted' : wallet.walletStatus === 'depleted' ? 'active' : wallet.walletStatus

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        INSERT INTO greenhouse_ai.credit_ledger (
          ledger_id,
          wallet_id,
          request_id,
          entry_type,
          credit_amount,
          balance_before,
          balance_after,
          consumed_by_member_id,
          client_id,
          notion_task_id,
          notion_project_id,
          project_name,
          asset_description,
          unit_cost,
          cost_currency,
          total_cost,
          total_cost_clp,
          notes,
          created_by_user_id,
          created_at
        )
        VALUES (
          $1, $2, $3, 'debit', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::numeric, $14, $15::numeric, $16::numeric, $17, $18, CURRENT_TIMESTAMP
        )
      `,
      [
        `ledger-${randomUUID()}`,
        wallet.walletId,
        requestId,
        creditAmount,
        balanceBefore,
        balanceAfter,
        normalizeString(input.consumedByMemberId),
        clientId,
        normalizeNullableString(input.notionTaskId),
        normalizeNullableString(input.notionProjectId),
        normalizeNullableString(input.projectName),
        assetDescription,
        unitCost,
        wallet.costCurrency || 'USD',
        totalCost,
        totalCostClp,
        normalizeNullableString(input.notes),
        actorUserId
      ],
      client
    )

    await queryRows(
      `
        UPDATE greenhouse_ai.credit_wallets
        SET
          current_balance = $2,
          monthly_consumed = $3,
          wallet_status = $4,
          alert_sent = CASE
            WHEN $2 <= COALESCE(low_balance_threshold, 0) THEN TRUE
            ELSE alert_sent
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_id = $1
      `,
      [wallet.walletId, balanceAfter, wallet.monthlyConsumed + creditAmount, nextStatus],
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_wallet',
      aggregateId: wallet.walletId,
      eventType: 'ai_wallet.credits_consumed',
      payload: { walletId: wallet.walletId, toolId: wallet.toolId, providerId: wallet.providerId, requestId, creditAmount, clientId }
    })

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'finance_tooling_cost',
      aggregateId: wallet.walletId,
      eventType: 'finance.tooling_cost.updated',
      payload: {
        memberId: normalizeString(input.consumedByMemberId),
        walletId: wallet.walletId,
        toolId: wallet.toolId,
        providerId: wallet.providerId,
        requestId,
        creditAmount,
        ...getCurrentSantiagoPeriod()
      }
    })
  })

  const [entry, updatedWallet] = await Promise.all([
    runGreenhousePostgresQuery<LedgerRow>(
      `
        SELECT
          l.ledger_id,
          l.wallet_id,
          l.request_id,
          l.entry_type,
          l.credit_amount,
          l.balance_before,
          l.balance_after,
          l.consumed_by_member_id,
          m.display_name AS consumed_by_name,
          l.client_id,
          c.client_name,
          l.notion_task_id,
          l.notion_project_id,
          l.project_name,
          l.asset_description,
          l.unit_cost,
          l.cost_currency,
          l.total_cost,
          l.total_cost_clp,
          l.reload_reason,
          l.reload_reference,
          l.notes,
          l.created_by_user_id AS created_by,
          l.created_at
        FROM greenhouse_ai.credit_ledger AS l
        LEFT JOIN greenhouse_core.members AS m
          ON m.member_id = l.consumed_by_member_id
        LEFT JOIN greenhouse_core.clients AS c
          ON c.client_id = l.client_id
        WHERE l.wallet_id = $1
          AND l.request_id = $2
          AND l.entry_type = 'debit'
        LIMIT 1
      `,
      [wallet.walletId, requestId]
    ),
    getWalletByIdInternal(wallet.walletId, { includeCost: true })
  ])

  return {
    entry: entry[0] ? mapLedger(entry[0], { includeCost: true }) : null,
    wallet: updatedWallet
  }
}

export const pgReloadAiCredits = async ({
  input,
  actorUserId
}: {
  input: ReloadCreditsInput
  actorUserId: string
}) => {
  await assertAiToolingPostgresReady()
  const wallet = await getWalletByIdInternal(normalizeString(input.walletId), { includeCost: true })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  const creditAmount = assertPositiveInteger(input.creditAmount, 'creditAmount')
  const reloadReason = assertEnum(input.reloadReason, RELOAD_REASONS, 'reloadReason')
  const requestId = normalizeNullableString(input.requestId)

  if (requestId) {
    const existingRows = await runGreenhousePostgresQuery<LedgerRow>(
      `
        SELECT
          l.ledger_id,
          l.wallet_id,
          l.request_id,
          l.entry_type,
          l.credit_amount,
          l.balance_before,
          l.balance_after,
          l.consumed_by_member_id,
          m.display_name AS consumed_by_name,
          l.client_id,
          c.client_name,
          l.notion_task_id,
          l.notion_project_id,
          l.project_name,
          l.asset_description,
          l.unit_cost,
          l.cost_currency,
          l.total_cost,
          l.total_cost_clp,
          l.reload_reason,
          l.reload_reference,
          l.notes,
          l.created_by_user_id AS created_by,
          l.created_at
        FROM greenhouse_ai.credit_ledger AS l
        LEFT JOIN greenhouse_core.members AS m
          ON m.member_id = l.consumed_by_member_id
        LEFT JOIN greenhouse_core.clients AS c
          ON c.client_id = l.client_id
        WHERE l.wallet_id = $1
          AND l.request_id = $2
          AND l.entry_type = 'credit'
        LIMIT 1
      `,
      [wallet.walletId, requestId]
    )

    if (existingRows[0]) {
      return {
        entry: mapLedger(existingRows[0], { includeCost: true }),
        wallet
      }
    }
  }

  const balanceBefore = wallet.currentBalance
  const balanceAfter = wallet.currentBalance + creditAmount

  await withGreenhousePostgresTransaction(async client => {
    await queryRows(
      `
        INSERT INTO greenhouse_ai.credit_ledger (
          ledger_id,
          wallet_id,
          request_id,
          entry_type,
          credit_amount,
          balance_before,
          balance_after,
          client_id,
          unit_cost,
          cost_currency,
          total_cost,
          total_cost_clp,
          reload_reason,
          reload_reference,
          notes,
          created_by_user_id,
          created_at
        )
        VALUES (
          $1, $2, $3, 'credit', $4, $5, $6, $7, $8::numeric, $9, 0::numeric, 0::numeric, $10, $11, $12, $13, CURRENT_TIMESTAMP
        )
      `,
      [
        `ledger-${randomUUID()}`,
        wallet.walletId,
        requestId,
        creditAmount,
        balanceBefore,
        balanceAfter,
        wallet.clientId,
        wallet.unitCost ?? 0,
        wallet.costCurrency || 'USD',
        reloadReason,
        normalizeNullableString(input.reloadReference),
        normalizeNullableString(input.notes),
        actorUserId
      ],
      client
    )

    await queryRows(
      `
        UPDATE greenhouse_ai.credit_wallets
        SET
          current_balance = $2,
          wallet_status = 'active',
          alert_sent = FALSE,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_id = $1
      `,
      [wallet.walletId, balanceAfter],
      client
    )

    await publishAiToolingOutboxEvent({
      client,
      aggregateType: 'ai_wallet',
      aggregateId: wallet.walletId,
      eventType: 'ai_wallet.credits_reloaded',
      payload: { walletId: wallet.walletId, requestId, creditAmount, reloadReason }
    })
  })

  const [entry, updatedWallet] = await Promise.all([
    runGreenhousePostgresQuery<LedgerRow>(
      `
        SELECT
          l.ledger_id,
          l.wallet_id,
          l.request_id,
          l.entry_type,
          l.credit_amount,
          l.balance_before,
          l.balance_after,
          l.consumed_by_member_id,
          m.display_name AS consumed_by_name,
          l.client_id,
          c.client_name,
          l.notion_task_id,
          l.notion_project_id,
          l.project_name,
          l.asset_description,
          l.unit_cost,
          l.cost_currency,
          l.total_cost,
          l.total_cost_clp,
          l.reload_reason,
          l.reload_reference,
          l.notes,
          l.created_by_user_id AS created_by,
          l.created_at
        FROM greenhouse_ai.credit_ledger AS l
        LEFT JOIN greenhouse_core.members AS m
          ON m.member_id = l.consumed_by_member_id
        LEFT JOIN greenhouse_core.clients AS c
          ON c.client_id = l.client_id
        WHERE l.wallet_id = $1
          AND l.entry_type = 'credit'
          AND (($2::text IS NOT NULL AND l.request_id = $2) OR ($2::text IS NULL AND l.reload_reason = $3))
        ORDER BY l.created_at DESC
        LIMIT 1
      `,
      [wallet.walletId, requestId, reloadReason]
    ),
    getWalletByIdInternal(wallet.walletId, { includeCost: true })
  ])

  return {
    entry: entry[0] ? mapLedger(entry[0], { includeCost: true }) : null,
    wallet: updatedWallet
  }
}
