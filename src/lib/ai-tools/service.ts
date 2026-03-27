import 'server-only'

import { randomUUID } from 'node:crypto'

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

import { ensureAiToolingInfrastructure } from '@/lib/ai-tools/schema'
import {
  assertAiToolingPostgresReady,
  isAiToolingPostgresEnabled,
  pgConsumeAiCredits,
  pgCreateAiTool,
  pgCreateLicense,
  pgCreateWallet,
  pgGetAiCreditSummary,
  pgGetAiCreditWallet,
  pgGetAiToolCatalogItem,
  pgGetAiToolLicense,
  pgGetAiToolingAdminMetadata,
  pgListAiCreditLedger,
  pgListAiCreditWallets,
  pgListAiToolLicenses,
  pgListAiToolsCatalog,
  pgReloadAiCredits,
  pgUpdateAiTool,
  pgUpdateLicense,
  pgUpdateWallet,
  shouldFallbackFromAiToolingPostgres
} from '@/lib/ai-tools/postgres-store'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getLatestEconomicIndicator } from '@/lib/finance/economic-indicators'
import { syncProviderRegistryFromFinanceSuppliers } from '@/lib/providers/canonical'
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
  getAiToolingProjectId,
  getCurrentMonthDateRange,
  getCurrentDateString,
  getPeriodDateRange,
  getViewerKind,
  normalizeNullableString,
  normalizeString,
  runAiToolingQuery,
  slugify,
  toDateString,
  toInt,
  toNullableNumber,
  toNumber,
  toTimestampString
} from '@/lib/ai-tools/shared'

type ProviderRow = {
  provider_id: string | null
  provider_name: string | null
  provider_category: string | null
  provider_kind: string | null
  website_url: string | null
  support_url: string | null
  icon_url: string | null
  is_active: boolean | null
}

type ToolRow = {
  tool_id: string | null
  tool_name: string | null
  provider_id: string | null
  provider_name: string | null
  vendor: string | null
  tool_category: string | null
  tool_subcategory: string | null
  cost_model: string | null
  subscription_amount: number | string | null
  subscription_currency: string | null
  subscription_billing_cycle: string | null
  subscription_seats: number | string | null
  credit_unit_name: string | null
  credit_unit_cost: number | string | null
  credit_unit_currency: string | null
  credits_included_monthly: number | string | null
  fin_supplier_id: string | null
  description: string | null
  website_url: string | null
  icon_url: string | null
  is_active: boolean | null
  sort_order: number | string | null
}

type LicenseRow = ToolRow & {
  license_id: string | null
  member_id: string | null
  member_name: string | null
  member_email: string | null
  license_status: string | null
  activated_at: { value?: string } | string | null
  expires_at: { value?: string } | string | null
  access_level: string | null
  license_key: string | null
  account_email: string | null
  notes: string | null
  assigned_by: string | null
  created_at: { value?: string } | string | null
  updated_at: { value?: string } | string | null
}

type WalletRow = {
  wallet_id: string | null
  wallet_name: string | null
  wallet_scope: string | null
  client_id: string | null
  client_name: string | null
  tool_id: string | null
  tool_name: string | null
  provider_id: string | null
  provider_name: string | null
  credit_unit_name: string | null
  initial_balance: number | string | null
  current_balance: number | string | null
  reserved_balance: number | string | null
  monthly_limit: number | string | null
  monthly_consumed: number | string | null
  monthly_reset_day: number | string | null
  low_balance_threshold: number | string | null
  valid_from: { value?: string } | string | null
  valid_until: { value?: string } | string | null
  wallet_status: string | null
  notes: string | null
  icon_url: string | null
  credit_unit_cost: number | string | null
  credit_unit_currency: string | null
}

type LedgerRow = {
  ledger_id: string | null
  wallet_id: string | null
  request_id: string | null
  entry_type: string | null
  credit_amount: number | string | null
  balance_before: number | string | null
  balance_after: number | string | null
  consumed_by_member_id: string | null
  consumed_by_name: string | null
  client_id: string | null
  client_name: string | null
  notion_task_id: string | null
  notion_project_id: string | null
  project_name: string | null
  asset_description: string | null
  unit_cost: number | string | null
  cost_currency: string | null
  total_cost: number | string | null
  total_cost_clp: number | string | null
  reload_reason: string | null
  reload_reference: string | null
  notes: string | null
  created_by: string | null
  created_at: { value?: string } | string | null
}

type ClientRow = {
  client_id: string | null
  client_name: string | null
  active: boolean | null
}

type MemberRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  active: boolean | null
}

type FinanceSupplierRow = {
  supplier_id: string | null
  legal_name: string | null
  trade_name: string | null
  payment_currency: string | null
}

const getProjectId = () => getAiToolingProjectId()

const mapProvider = (row: ProviderRow): ProviderRecord => ({
  providerId: String(row.provider_id || ''),
  providerName: String(row.provider_name || ''),
  providerCategory: (row.provider_category || 'ai_vendor') as ProviderRecord['providerCategory'],
  providerKind: (row.provider_kind || 'organization') as ProviderRecord['providerKind'],
  websiteUrl: normalizeNullableString(row.website_url),
  supportUrl: normalizeNullableString(row.support_url),
  iconUrl: normalizeNullableString(row.icon_url),
  isActive: Boolean(row.is_active)
})

const mapTool = (row: ToolRow): AiTool => ({
  toolId: String(row.tool_id || ''),
  toolName: String(row.tool_name || ''),
  providerId: String(row.provider_id || ''),
  providerName: normalizeNullableString(row.provider_name),
  vendor: normalizeNullableString(row.vendor),
  toolCategory: (row.tool_category || 'gen_text') as AiTool['toolCategory'],
  toolSubcategory: normalizeNullableString(row.tool_subcategory),
  costModel: (row.cost_model || 'subscription') as AiTool['costModel'],
  subscriptionAmount: toNullableNumber(row.subscription_amount),
  subscriptionCurrency: String(row.subscription_currency || 'USD'),
  subscriptionBillingCycle: String(row.subscription_billing_cycle || 'monthly'),
  subscriptionSeats: toNullableNumber(row.subscription_seats),
  creditUnitName: normalizeNullableString(row.credit_unit_name),
  creditUnitCost: toNullableNumber(row.credit_unit_cost),
  creditUnitCurrency: String(row.credit_unit_currency || 'USD'),
  creditsIncludedMonthly: toNullableNumber(row.credits_included_monthly),
  finSupplierId: normalizeNullableString(row.fin_supplier_id),
  description: normalizeNullableString(row.description),
  websiteUrl: normalizeNullableString(row.website_url),
  iconUrl: normalizeNullableString(row.icon_url),
  isActive: Boolean(row.is_active),
  sortOrder: toInt(row.sort_order)
})

const mapLicense = (row: LicenseRow): MemberToolLicense => ({
  licenseId: String(row.license_id || ''),
  memberId: String(row.member_id || ''),
  memberName: normalizeNullableString(row.member_name),
  memberEmail: normalizeNullableString(row.member_email),
  toolId: String(row.tool_id || ''),
  licenseStatus: (row.license_status || 'pending') as MemberToolLicense['licenseStatus'],
  activatedAt: toDateString(row.activated_at),
  expiresAt: toDateString(row.expires_at),
  accessLevel: (row.access_level || 'full') as AccessLevel,
  licenseKey: normalizeNullableString(row.license_key),
  accountEmail: normalizeNullableString(row.account_email),
  notes: normalizeNullableString(row.notes),
  assignedBy: normalizeNullableString(row.assigned_by),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at),
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
  const walletStatus = (row.wallet_status || 'active') as WalletStatus

  return {
    walletId: String(row.wallet_id || ''),
    walletName: String(row.wallet_name || ''),
    walletScope: (row.wallet_scope || 'client') as AiCreditWallet['walletScope'],
    clientId: normalizeNullableString(row.client_id),
    clientName: normalizeNullableString(row.client_name),
    toolId: String(row.tool_id || ''),
    toolName: String(row.tool_name || ''),
    providerId: normalizeNullableString(row.provider_id),
    providerName: normalizeNullableString(row.provider_name),
    creditUnitName: String(row.credit_unit_name || 'credit'),
    initialBalance,
    currentBalance,
    reservedBalance,
    monthlyLimit: toNullableNumber(row.monthly_limit),
    monthlyConsumed: toInt(row.monthly_consumed),
    monthlyResetDay: Math.max(1, toInt(row.monthly_reset_day) || 1),
    lowBalanceThreshold: toNullableNumber(row.low_balance_threshold),
    validFrom: toDateString(row.valid_from) || '',
    validUntil: toDateString(row.valid_until),
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
  ledgerId: String(row.ledger_id || ''),
  walletId: String(row.wallet_id || ''),
  requestId: normalizeNullableString(row.request_id),
  entryType: (row.entry_type || 'debit') as AiCreditLedgerEntry['entryType'],
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
  createdAt: toTimestampString(row.created_at)
})

const assertOperatorOrAdminMember = async (memberId: string) => {
  const projectId = getProjectId()

  const [row] = await runAiToolingQuery<MemberRow>(
    `
      SELECT member_id, display_name, email, active
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  if (!row || !row.active) {
    throw new AiToolingValidationError('Active team member not found.', 404)
  }

  return row
}

const assertClient = async (clientId: string) => {
  const projectId = getProjectId()

  const [row] = await runAiToolingQuery<ClientRow>(
    `
      SELECT client_id, client_name, active
      FROM \`${projectId}.greenhouse.clients\`
      WHERE client_id = @clientId
      LIMIT 1
    `,
    { clientId }
  )

  if (!row) {
    throw new AiToolingValidationError('Client not found.', 404)
  }

  return row
}

const getProviders = async (activeOnly = false) => {
  await ensureAiToolingInfrastructure()

  try {
    await syncProviderRegistryFromFinanceSuppliers()
  } catch (err) {
    console.warn('[ai-tools/service] Provider sync from finance suppliers failed, continuing with existing providers:', err)
  }

  const projectId = getProjectId()

  const rows = await runAiToolingQuery<ProviderRow>(
    `
      SELECT *
      FROM \`${projectId}.greenhouse.providers\`
      ${activeOnly ? 'WHERE COALESCE(is_active, TRUE) = TRUE' : ''}
      ORDER BY provider_name ASC
    `
  )

  return rows.map(mapProvider)
}

const getToolById = async (toolId: string) => {
  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()

  const [row] = await runAiToolingQuery<ToolRow>(
    `
      SELECT
        t.*,
        p.provider_name
      FROM \`${projectId}.greenhouse.ai_tool_catalog\` AS t
      LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
        ON p.provider_id = t.provider_id
      WHERE t.tool_id = @toolId
      LIMIT 1
    `,
    { toolId }
  )

  return row ? mapTool(row) : null
}

export const getAiToolCatalogItem = async (toolId: string) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgGetAiToolCatalogItem(toolId)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  return getToolById(toolId)
}

const getLicenseById = async (licenseId: string) => {
  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()

  const [row] = await runAiToolingQuery<LicenseRow>(
    `
      SELECT
        l.*,
        m.display_name AS member_name,
        m.email AS member_email,
        t.*,
        p.provider_name
      FROM \`${projectId}.greenhouse.member_tool_licenses\` AS l
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = l.member_id
      INNER JOIN \`${projectId}.greenhouse.ai_tool_catalog\` AS t
        ON t.tool_id = l.tool_id
      LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
        ON p.provider_id = t.provider_id
      WHERE l.license_id = @licenseId
      LIMIT 1
    `,
    { licenseId }
  )

  return row ? mapLicense(row) : null
}

export const getAiToolLicense = async (licenseId: string) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgGetAiToolLicense(licenseId)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  return getLicenseById(licenseId)
}

const getWalletById = async (walletId: string, { includeCost }: { includeCost: boolean }) => {
  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const { startDate, endDate } = getCurrentMonthDateRange()

  const [row] = await runAiToolingQuery<WalletRow>(
    `
      WITH monthly AS (
        SELECT
          wallet_id,
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS monthly_consumed
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE DATE(created_at) BETWEEN DATE(@startDate) AND DATE(@endDate)
        GROUP BY wallet_id
      )
      SELECT
        w.*,
        t.provider_id,
        p.provider_name,
        t.icon_url,
        t.credit_unit_cost,
        t.credit_unit_currency,
        COALESCE(m.monthly_consumed, 0) AS monthly_consumed
      FROM \`${projectId}.greenhouse.ai_credit_wallets\` AS w
      INNER JOIN \`${projectId}.greenhouse.ai_tool_catalog\` AS t
        ON t.tool_id = w.tool_id
      LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
        ON p.provider_id = t.provider_id
      LEFT JOIN monthly AS m
        ON m.wallet_id = w.wallet_id
      WHERE w.wallet_id = @walletId
      LIMIT 1
    `,
    { walletId, startDate, endDate }
  )

  return row ? mapWallet(row, { includeCost }) : null
}

export const getAiCreditWallet = async ({
  walletId,
  tenant
}: {
  walletId: string
  tenant: TenantContext
}) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgGetAiCreditWallet({ walletId, tenant })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  const includeCost = getViewerKind(tenant) === 'admin'
  const wallet = await getWalletById(walletId, { includeCost })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  assertWalletVisibleToTenant(tenant, wallet)

  return wallet
}

const getWalletInternal = async (walletId: string) => {
  const wallet = await getWalletById(walletId, { includeCost: true })

  if (!wallet) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  return wallet
}

const assertWalletVisibleToTenant = (tenant: TenantContext, wallet: AiCreditWallet) => {
  const viewerKind = getViewerKind(tenant)

  if (viewerKind === 'client' && wallet.clientId !== tenant.clientId) {
    throw new AiToolingValidationError('Forbidden', 403)
  }
}

const getUsdToClpRate = async () => {
  try {
    const indicator = await getLatestEconomicIndicator('USD_CLP')

    return indicator?.value ?? 950
  } catch {
    return 950
  }
}

export const getAiToolingAdminMetadata = async (): Promise<AiToolingAdminMetadata> => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgGetAiToolingAdminMetadata()
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  await ensureFinanceInfrastructure()
  const projectId = getProjectId()

  const [providers, financeSuppliers, clients, members] = await Promise.all([
    getProviders(true),
    runAiToolingQuery<FinanceSupplierRow>(
      `
        SELECT supplier_id, legal_name, trade_name, payment_currency
        FROM \`${projectId}.greenhouse.fin_suppliers\`
        WHERE is_active = TRUE
        ORDER BY COALESCE(trade_name, legal_name) ASC
      `
    ),
    runAiToolingQuery<ClientRow>(
      `
        SELECT client_id, client_name, active
        FROM \`${projectId}.greenhouse.clients\`
        WHERE active = TRUE
        ORDER BY client_name ASC
      `
    ),
    runAiToolingQuery<MemberRow>(
      `
        SELECT member_id, display_name, email, active
        FROM \`${projectId}.greenhouse.team_members\`
        WHERE active = TRUE
        ORDER BY display_name ASC
      `
    )
  ])

  return {
    providers,
    financeSuppliers: financeSuppliers.map(row => ({
      supplierId: String(row.supplier_id || ''),
      legalName: String(row.legal_name || ''),
      tradeName: normalizeNullableString(row.trade_name),
      paymentCurrency: normalizeNullableString(row.payment_currency)
    })),
    activeClients: clients.map(row => ({
      clientId: String(row.client_id || ''),
      clientName: String(row.client_name || row.client_id || '')
    })),
    activeMembers: members.map(row => ({
      memberId: String(row.member_id || ''),
      displayName: String(row.display_name || ''),
      email: String(row.email || '')
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

export const listAiToolsCatalog = async ({
  category,
  costModel,
  activeOnly = true
}: {
  category?: string | null
  costModel?: string | null
  activeOnly?: boolean
} = {}): Promise<AiToolsCatalogResponse> => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgListAiToolsCatalog({ category, costModel, activeOnly })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const filters = ['1 = 1']
  const params: Record<string, unknown> = {}

  if (activeOnly) {
    filters.push('t.is_active = TRUE')
  }

  if (category) {
    filters.push('t.tool_category = @category')
    params.category = category
  }

  if (costModel) {
    filters.push('t.cost_model = @costModel')
    params.costModel = costModel
  }

  const [providers, rows] = await Promise.all([
    getProviders(activeOnly),
    runAiToolingQuery<ToolRow>(
      `
        SELECT
          t.*,
          p.provider_name
        FROM \`${projectId}.greenhouse.ai_tool_catalog\` AS t
        LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
          ON p.provider_id = t.provider_id
        WHERE ${filters.join(' AND ')}
        ORDER BY t.sort_order ASC, t.tool_name ASC
      `,
      params
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

export const listAiToolLicenses = async ({
  memberId,
  status
}: {
  memberId?: string | null
  status?: string | null
} = {}): Promise<AiToolLicensesResponse> => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgListAiToolLicenses({ memberId, status })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const filters = ['1 = 1']
  const params: Record<string, unknown> = {}

  if (memberId) {
    filters.push('l.member_id = @memberId')
    params.memberId = memberId
  }

  if (status) {
    filters.push('l.license_status = @status')
    params.status = status
  }

  const rows = await runAiToolingQuery<LicenseRow>(
    `
      SELECT
        l.*,
        m.display_name AS member_name,
        m.email AS member_email,
        t.*,
        p.provider_name
      FROM \`${projectId}.greenhouse.member_tool_licenses\` AS l
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = l.member_id
      INNER JOIN \`${projectId}.greenhouse.ai_tool_catalog\` AS t
        ON t.tool_id = l.tool_id
      LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
        ON p.provider_id = t.provider_id
      WHERE ${filters.join(' AND ')}
      ORDER BY m.display_name ASC, t.sort_order ASC, t.tool_name ASC
    `,
    params
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

export const listAiCreditWallets = async ({
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
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgListAiCreditWallets({
        tenant,
        clientId,
        toolId,
        status,
        scope
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const viewerKind = getViewerKind(tenant)
  const projectId = getProjectId()
  const { startDate, endDate } = getCurrentMonthDateRange()
  const filters = ['1 = 1']
  const params: Record<string, unknown> = { startDate, endDate }

  if (viewerKind === 'client') {
    filters.push('w.client_id = @viewerClientId')
    params.viewerClientId = tenant.clientId
  } else if (clientId) {
    filters.push('w.client_id = @clientId')
    params.clientId = clientId
  }

  if (toolId) {
    filters.push('w.tool_id = @toolId')
    params.toolId = toolId
  }

  if (status) {
    filters.push('w.wallet_status = @status')
    params.status = status
  }

  if (scope) {
    filters.push('w.wallet_scope = @scope')
    params.scope = scope
  }

  const rows = await runAiToolingQuery<WalletRow>(
    `
      WITH monthly AS (
        SELECT
          wallet_id,
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS monthly_consumed
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE DATE(created_at) BETWEEN DATE(@startDate) AND DATE(@endDate)
        GROUP BY wallet_id
      )
      SELECT
        w.*,
        t.provider_id,
        p.provider_name,
        t.icon_url,
        t.credit_unit_cost,
        t.credit_unit_currency,
        COALESCE(m.monthly_consumed, 0) AS monthly_consumed
      FROM \`${projectId}.greenhouse.ai_credit_wallets\` AS w
      INNER JOIN \`${projectId}.greenhouse.ai_tool_catalog\` AS t
        ON t.tool_id = w.tool_id
      LEFT JOIN \`${projectId}.greenhouse.providers\` AS p
        ON p.provider_id = t.provider_id
      LEFT JOIN monthly AS m
        ON m.wallet_id = w.wallet_id
      WHERE ${filters.join(' AND ')}
      ORDER BY w.wallet_status ASC, w.wallet_name ASC
    `,
    params
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

export const listAiCreditLedger = async ({
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
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgListAiCreditLedger({
        tenant,
        walletId,
        entryType,
        dateFrom,
        dateTo,
        memberId,
        limit,
        offset
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const viewerKind = getViewerKind(tenant)
  const wallet = await getWalletInternal(walletId)

  assertWalletVisibleToTenant(tenant, wallet)

  const projectId = getProjectId()
  const filters = ['wallet_id = @walletId']

  const params: Record<string, unknown> = {
    walletId,
    limit: Math.min(Math.max(limit, 1), 200),
    offset: Math.max(offset, 0)
  }

  if (entryType && entryType !== 'all') {
    filters.push('entry_type = @entryType')
    params.entryType = entryType
  }

  if (dateFrom) {
    filters.push('DATE(created_at) >= DATE(@dateFrom)')
    params.dateFrom = dateFrom
  }

  if (dateTo) {
    filters.push('DATE(created_at) <= DATE(@dateTo)')
    params.dateTo = dateTo
  }

  if (memberId) {
    filters.push('consumed_by_member_id = @memberId')
    params.memberId = memberId
  }

  const [entriesRows, summaryRows, countRows] = await Promise.all([
    runAiToolingQuery<LedgerRow>(
      `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT @limit
        OFFSET @offset
      `,
      params
    ),
    runAiToolingQuery<{
      total_debits: number | string | null
      total_credits: number | string | null
      total_cost_usd: number | string | null
      total_cost_clp: number | string | null
    }>(
      `
        SELECT
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS total_debits,
          SUM(CASE WHEN entry_type = 'credit' THEN credit_amount ELSE 0 END) AS total_credits,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost, 0) ELSE 0 END) AS total_cost_usd,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost_clp, 0) ELSE 0 END) AS total_cost_clp
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
      `,
      params
    ),
    runAiToolingQuery<{ total_entries: number | string | null }>(
      `
        SELECT COUNT(*) AS total_entries
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
      `,
      params
    )
  ])

  const includeCost = viewerKind === 'admin'
  const entries = entriesRows.map(row => mapLedger(row, { includeCost }))
  const summary = summaryRows[0]
  const totalEntries = toInt(countRows[0]?.total_entries)
  const appliedLimit = params.limit as number
  const appliedOffset = params.offset as number

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
      limit: appliedLimit,
      offset: appliedOffset,
      hasMore: appliedOffset + entries.length < totalEntries
    }
  }
}

export const getAiCreditSummary = async ({
  tenant,
  clientId,
  period = 'current_month'
}: {
  tenant: TenantContext
  clientId?: string | null
  period?: string
}): Promise<ClientCreditSummary | AdminCreditSummary> => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgGetAiCreditSummary({
        tenant,
        clientId,
        period
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const viewerKind = getViewerKind(tenant)
  const effectiveClientId = viewerKind === 'client' ? tenant.clientId : clientId || null

  const walletsResponse = await listAiCreditWallets({
    tenant,
    clientId: effectiveClientId
  })

  const { startDate, endDate } = getPeriodDateRange(period)
  const projectId = getProjectId()
  const filters = ['DATE(created_at) BETWEEN DATE(@startDate) AND DATE(@endDate)']
  const params: Record<string, unknown> = { startDate, endDate }

  if (effectiveClientId) {
    filters.push('client_id = @clientId')
    params.clientId = effectiveClientId
  }

  const [projectRows, costByToolRows, costByClientRows, summaryRows] = await Promise.all([
    runAiToolingQuery<{ project_name: string | null; credits_consumed: number | string | null }>(
      `
        SELECT
          COALESCE(project_name, 'Sin proyecto') AS project_name,
          SUM(credit_amount) AS credits_consumed
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
          AND entry_type = 'debit'
        GROUP BY project_name
        ORDER BY credits_consumed DESC
        LIMIT 5
      `,
      params
    ),
    runAiToolingQuery<{ tool_name: string | null; credits_consumed: number | string | null; total_cost_usd: number | string | null }>(
      `
        SELECT
          w.tool_name,
          SUM(l.credit_amount) AS credits_consumed,
          SUM(COALESCE(l.total_cost, 0)) AS total_cost_usd
        FROM \`${projectId}.greenhouse.ai_credit_ledger\` AS l
        INNER JOIN \`${projectId}.greenhouse.ai_credit_wallets\` AS w
          ON w.wallet_id = l.wallet_id
        WHERE ${filters.join(' AND ')}
          AND l.entry_type = 'debit'
        GROUP BY w.tool_name
        ORDER BY total_cost_usd DESC, credits_consumed DESC
        LIMIT 10
      `,
      params
    ),
    runAiToolingQuery<{ client_name: string | null; credits_consumed: number | string | null; total_cost_usd: number | string | null }>(
      `
        SELECT
          COALESCE(client_name, 'Pool interno') AS client_name,
          SUM(credit_amount) AS credits_consumed,
          SUM(COALESCE(total_cost, 0)) AS total_cost_usd
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
          AND entry_type = 'debit'
        GROUP BY client_name
        ORDER BY total_cost_usd DESC, credits_consumed DESC
        LIMIT 10
      `,
      params
    ),
    runAiToolingQuery<{ total_credits_consumed: number | string | null; total_cost_usd: number | string | null; total_cost_clp: number | string | null }>(
      `
        SELECT
          SUM(CASE WHEN entry_type = 'debit' THEN credit_amount ELSE 0 END) AS total_credits_consumed,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost, 0) ELSE 0 END) AS total_cost_usd,
          SUM(CASE WHEN entry_type = 'debit' THEN COALESCE(total_cost_clp, 0) ELSE 0 END) AS total_cost_clp
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE ${filters.join(' AND ')}
      `,
      params
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

export const createAiTool = async (input: CreateAiToolInput) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgCreateAiTool(input)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const toolId = slugify(normalizeString(input.toolId || input.toolName))

  if (!toolId) {
    throw new AiToolingValidationError('toolId is required.')
  }

  if (!normalizeString(input.toolName)) {
    throw new AiToolingValidationError('toolName is required.')
  }

  assertEnum(input.toolCategory, TOOL_CATEGORIES, 'toolCategory')
  assertEnum(input.costModel, COST_MODELS, 'costModel')

  const providers = await getProviders(false)

  if (!providers.find(provider => provider.providerId === input.providerId)) {
    throw new AiToolingValidationError('Provider not found.', 404)
  }

  const existing = await getToolById(toolId)

  if (existing) {
    throw new AiToolingValidationError('AI tool already exists.', 409, { toolId })
  }

  await runAiToolingQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.ai_tool_catalog\` (
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
        @toolId,
        @toolName,
        @providerId,
        @vendor,
        @toolCategory,
        @toolSubcategory,
        @costModel,
        @subscriptionAmount,
        @subscriptionCurrency,
        @subscriptionBillingCycle,
        @subscriptionSeats,
        @creditUnitName,
        @creditUnitCost,
        @creditUnitCurrency,
        @creditsIncludedMonthly,
        @finSupplierId,
        @description,
        @websiteUrl,
        @iconUrl,
        @isActive,
        @sortOrder,
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP()
      )
    `,
    {
      toolId,
      toolName: normalizeString(input.toolName),
      providerId: normalizeString(input.providerId),
      vendor: normalizeNullableString(input.vendor),
      toolCategory: input.toolCategory,
      toolSubcategory: normalizeNullableString(input.toolSubcategory),
      costModel: input.costModel,
      subscriptionAmount: input.subscriptionAmount ?? null,
      subscriptionCurrency: normalizeString(input.subscriptionCurrency || 'USD') || 'USD',
      subscriptionBillingCycle: normalizeString(input.subscriptionBillingCycle || 'monthly') || 'monthly',
      subscriptionSeats: input.subscriptionSeats ?? null,
      creditUnitName: normalizeNullableString(input.creditUnitName),
      creditUnitCost: input.creditUnitCost ?? null,
      creditUnitCurrency: normalizeString(input.creditUnitCurrency || 'USD') || 'USD',
      creditsIncludedMonthly: input.creditsIncludedMonthly ?? null,
      finSupplierId: normalizeNullableString(input.finSupplierId),
      description: normalizeNullableString(input.description),
      websiteUrl: normalizeNullableString(input.websiteUrl),
      iconUrl: normalizeNullableString(input.iconUrl),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0
    }
  )

  const created = await getToolById(toolId)

  if (!created) {
    throw new AiToolingValidationError('Created tool could not be reloaded.', 500)
  }

  return created
}

export const updateAiTool = async (toolId: string, input: UpdateAiToolInput) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgUpdateAiTool(toolId, input)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const existing = await getToolById(toolId)

  if (!existing) {
    throw new AiToolingValidationError('AI tool not found.', 404)
  }

  if (input.providerId) {
    const providers = await getProviders(false)

    if (!providers.find(provider => provider.providerId === input.providerId)) {
      throw new AiToolingValidationError('Provider not found.', 404)
    }
  }

  const updates: string[] = []
  const params: Record<string, unknown> = { toolId }

  const setField = (column: string, paramKey: string, value: unknown) => {
    updates.push(`${column} = @${paramKey}`)
    params[paramKey] = value
  }

  if (input.toolName !== undefined) setField('tool_name', 'toolName', normalizeString(input.toolName))
  if (input.providerId !== undefined) setField('provider_id', 'providerId', normalizeString(input.providerId))
  if (input.vendor !== undefined) setField('vendor', 'vendor', normalizeNullableString(input.vendor))
  if (input.toolCategory !== undefined) setField('tool_category', 'toolCategory', assertEnum(input.toolCategory, TOOL_CATEGORIES, 'toolCategory'))
  if (input.toolSubcategory !== undefined) setField('tool_subcategory', 'toolSubcategory', normalizeNullableString(input.toolSubcategory))
  if (input.costModel !== undefined) setField('cost_model', 'costModel', assertEnum(input.costModel, COST_MODELS, 'costModel'))
  if (input.subscriptionAmount !== undefined) setField('subscription_amount', 'subscriptionAmount', input.subscriptionAmount ?? null)
  if (input.subscriptionCurrency !== undefined) setField('subscription_currency', 'subscriptionCurrency', normalizeString(input.subscriptionCurrency))
  if (input.subscriptionBillingCycle !== undefined)
    setField('subscription_billing_cycle', 'subscriptionBillingCycle', normalizeString(input.subscriptionBillingCycle))
  if (input.subscriptionSeats !== undefined) setField('subscription_seats', 'subscriptionSeats', input.subscriptionSeats ?? null)
  if (input.creditUnitName !== undefined) setField('credit_unit_name', 'creditUnitName', normalizeNullableString(input.creditUnitName))
  if (input.creditUnitCost !== undefined) setField('credit_unit_cost', 'creditUnitCost', input.creditUnitCost ?? null)
  if (input.creditUnitCurrency !== undefined) setField('credit_unit_currency', 'creditUnitCurrency', normalizeString(input.creditUnitCurrency))
  if (input.creditsIncludedMonthly !== undefined) setField('credits_included_monthly', 'creditsIncludedMonthly', input.creditsIncludedMonthly ?? null)
  if (input.finSupplierId !== undefined) setField('fin_supplier_id', 'finSupplierId', normalizeNullableString(input.finSupplierId))
  if (input.description !== undefined) setField('description', 'description', normalizeNullableString(input.description))
  if (input.websiteUrl !== undefined) setField('website_url', 'websiteUrl', normalizeNullableString(input.websiteUrl))
  if (input.iconUrl !== undefined) setField('icon_url', 'iconUrl', normalizeNullableString(input.iconUrl))
  if (input.isActive !== undefined) setField('is_active', 'isActive', Boolean(input.isActive))
  if (input.sortOrder !== undefined) setField('sort_order', 'sortOrder', input.sortOrder)

  if (updates.length === 0) {
    return existing
  }

  updates.push('updated_at = CURRENT_TIMESTAMP()')

  await runAiToolingQuery(
    `
      UPDATE \`${projectId}.greenhouse.ai_tool_catalog\`
      SET ${updates.join(', ')}
      WHERE tool_id = @toolId
    `,
    params
  )

  const updated = await getToolById(toolId)

  if (!updated) {
    throw new AiToolingValidationError('Updated tool could not be reloaded.', 500)
  }

  return updated
}

export const createLicense = async (input: CreateLicenseInput, actorUserId: string) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgCreateLicense(input, actorUserId)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()

  await assertOperatorOrAdminMember(input.memberId)
  const tool = await getToolById(input.toolId)

  if (!tool || !tool.isActive) {
    throw new AiToolingValidationError('AI tool not found.', 404)
  }

  const licenseId = `${input.memberId}_${input.toolId}`
  const existing = await getLicenseById(licenseId)

  if (existing?.licenseStatus === 'active') {
    throw new AiToolingValidationError('This member already has an active license for the selected tool.', 409, { licenseId })
  }

  const accessLevel = input.accessLevel ? assertEnum(input.accessLevel, ACCESS_LEVELS, 'accessLevel') : 'full'
  const expiresAt = input.expiresAt ? assertDateString(input.expiresAt, 'expiresAt') : null

  if (existing) {
    await runAiToolingQuery(
      `
        UPDATE \`${projectId}.greenhouse.member_tool_licenses\`
        SET
          license_status = 'active',
          activated_at = CURRENT_DATE(),
          expires_at = @expiresAt,
          access_level = @accessLevel,
          account_email = @accountEmail,
          notes = @notes,
          assigned_by = @assignedBy,
          updated_at = CURRENT_TIMESTAMP()
        WHERE license_id = @licenseId
      `,
      {
        licenseId,
        expiresAt,
        accessLevel,
        accountEmail: normalizeNullableString(input.accountEmail),
        notes: normalizeNullableString(input.notes),
        assignedBy: actorUserId
      }
    )
  } else {
    await runAiToolingQuery(
      `
        INSERT INTO \`${projectId}.greenhouse.member_tool_licenses\` (
          license_id,
          member_id,
          tool_id,
          license_status,
          activated_at,
          expires_at,
          access_level,
          account_email,
          notes,
          assigned_by,
          created_at,
          updated_at
        )
        VALUES (
          @licenseId,
          @memberId,
          @toolId,
          'active',
          CURRENT_DATE(),
          @expiresAt,
          @accessLevel,
          @accountEmail,
          @notes,
          @assignedBy,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
      `,
      {
        licenseId,
        memberId: input.memberId,
        toolId: input.toolId,
        expiresAt,
        accessLevel,
        accountEmail: normalizeNullableString(input.accountEmail),
        notes: normalizeNullableString(input.notes),
        assignedBy: actorUserId
      }
    )
  }

  const created = await getLicenseById(licenseId)

  if (!created) {
    throw new AiToolingValidationError('License could not be reloaded.', 500)
  }

  return created
}

export const updateLicense = async (licenseId: string, input: UpdateLicenseInput) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgUpdateLicense(licenseId, input)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const existing = await getLicenseById(licenseId)

  if (!existing) {
    throw new AiToolingValidationError('License not found.', 404)
  }

  const updates: string[] = []
  const params: Record<string, unknown> = { licenseId }

  if (input.licenseStatus !== undefined) {
    updates.push('license_status = @licenseStatus')
    params.licenseStatus = assertEnum(input.licenseStatus, LICENSE_STATUSES, 'licenseStatus')
  }

  if (input.accessLevel !== undefined) {
    updates.push('access_level = @accessLevel')
    params.accessLevel = assertEnum(input.accessLevel, ACCESS_LEVELS, 'accessLevel')
  }

  if (input.accountEmail !== undefined) {
    updates.push('account_email = @accountEmail')
    params.accountEmail = normalizeNullableString(input.accountEmail)
  }

  if (input.notes !== undefined) {
    updates.push('notes = @notes')
    params.notes = normalizeNullableString(input.notes)
  }

  if (input.expiresAt !== undefined) {
    updates.push('expires_at = @expiresAt')
    params.expiresAt = input.expiresAt ? assertDateString(input.expiresAt, 'expiresAt') : null
  }

  if (updates.length === 0) {
    return existing
  }

  updates.push('updated_at = CURRENT_TIMESTAMP()')

  await runAiToolingQuery(
    `
      UPDATE \`${projectId}.greenhouse.member_tool_licenses\`
      SET ${updates.join(', ')}
      WHERE license_id = @licenseId
    `,
    params
  )

  const updated = await getLicenseById(licenseId)

  if (!updated) {
    throw new AiToolingValidationError('Updated license could not be reloaded.', 500)
  }

  return updated
}

export const createWallet = async ({
  input,
  actorUserId
}: {
  input: CreateWalletInput
  actorUserId: string
}) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgCreateWallet({
        input,
        actorUserId
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const walletScope = assertEnum(input.walletScope, WALLET_SCOPES, 'walletScope')
  const tool = await getToolById(input.toolId)

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

    const client = await assertClient(clientId)

    if (!client.active) {
      throw new AiToolingValidationError('Client is not active.', 409)
    }

    clientName = String(client.client_name || client.client_id || '')
  }

  const ownerSlug = walletScope === 'client' ? clientId : 'internal'
  const walletId = `${walletScope}_${ownerSlug}_${tool.toolId}`
  const existing = await getWalletById(walletId, { includeCost: true })

  if (existing) {
    throw new AiToolingValidationError('Wallet already exists for this scope and tool.', 409, { walletId })
  }

  const walletName = walletScope === 'client' ? `${clientName} - ${tool.toolName}` : `Pool interno - ${tool.toolName}`
  const ledgerId = `ledger-${randomUUID()}`

  await runAiToolingQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.ai_credit_wallets\` (
        wallet_id,
        wallet_name,
        wallet_scope,
        client_id,
        client_name,
        tool_id,
        tool_name,
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
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        @walletId,
        @walletName,
        @walletScope,
        @clientId,
        @clientName,
        @toolId,
        @toolName,
        @creditUnitName,
        @initialBalance,
        @initialBalance,
        0,
        @monthlyLimit,
        0,
        @monthlyResetDay,
        @lowBalanceThreshold,
        DATE(@validFrom),
        @validUntil,
        'active',
        @notes,
        FALSE,
        @createdBy,
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP()
      )
    `,
    {
      walletId,
      walletName,
      walletScope,
      clientId,
      clientName,
      toolId: tool.toolId,
      toolName: tool.toolName,
      creditUnitName: tool.creditUnitName || 'credit',
      initialBalance,
      monthlyLimit,
      monthlyResetDay,
      lowBalanceThreshold,
      validFrom,
      validUntil,
      notes: normalizeNullableString(input.notes),
      createdBy: actorUserId
    }
  )

  await runAiToolingQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.ai_credit_ledger\` (
        ledger_id,
        wallet_id,
        request_id,
        entry_type,
        credit_amount,
        balance_before,
        balance_after,
        client_id,
        client_name,
        unit_cost,
        cost_currency,
        total_cost,
        total_cost_clp,
        reload_reason,
        notes,
        created_by,
        created_at
      )
      VALUES (
        @ledgerId,
        @walletId,
        @requestId,
        'credit',
        @creditAmount,
        0,
        @creditAmount,
        @clientId,
        @clientName,
        @unitCost,
        @costCurrency,
        0,
        0,
        'initial_allocation',
        @notes,
        @createdBy,
        CURRENT_TIMESTAMP()
      )
    `,
    {
      ledgerId,
      walletId,
      requestId: `initial-${walletId}`,
      creditAmount: initialBalance,
      clientId,
      clientName,
      unitCost: tool.creditUnitCost ?? 0,
      costCurrency: tool.creditUnitCurrency || 'USD',
      notes: normalizeNullableString(input.notes),
      createdBy: actorUserId
    }
  )

  const created = await getWalletById(walletId, { includeCost: true })

  if (!created) {
    throw new AiToolingValidationError('Created wallet could not be reloaded.', 500)
  }

  return created
}

export const updateWallet = async (walletId: string, input: UpdateWalletInput) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgUpdateWallet(walletId, input)
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const existing = await getWalletById(walletId, { includeCost: true })

  if (!existing) {
    throw new AiToolingValidationError('Wallet not found.', 404)
  }

  const updates: string[] = []
  const params: Record<string, unknown> = { walletId }

  if (input.monthlyLimit !== undefined) {
    updates.push('monthly_limit = @monthlyLimit')
    params.monthlyLimit = input.monthlyLimit === null ? null : assertPositiveInteger(input.monthlyLimit, 'monthlyLimit')
  }

  if (input.monthlyResetDay !== undefined) {
    updates.push('monthly_reset_day = @monthlyResetDay')
    params.monthlyResetDay = input.monthlyResetDay === null ? 1 : assertPositiveInteger(input.monthlyResetDay, 'monthlyResetDay')
  }

  if (input.lowBalanceThreshold !== undefined) {
    updates.push('low_balance_threshold = @lowBalanceThreshold')
    params.lowBalanceThreshold =
      input.lowBalanceThreshold === null ? null : assertPositiveInteger(input.lowBalanceThreshold, 'lowBalanceThreshold', { min: 0 })
  }

  if (input.validFrom !== undefined) {
    updates.push('valid_from = DATE(@validFrom)')
    params.validFrom = assertDateString(input.validFrom, 'validFrom')
  }

  if (input.validUntil !== undefined) {
    updates.push('valid_until = @validUntil')
    params.validUntil = input.validUntil ? assertDateString(input.validUntil, 'validUntil') : null
  }

  if (input.walletStatus !== undefined) {
    updates.push('wallet_status = @walletStatus')
    params.walletStatus = assertEnum(input.walletStatus, WALLET_STATUSES, 'walletStatus')
  }

  if (input.notes !== undefined) {
    updates.push('notes = @notes')
    params.notes = normalizeNullableString(input.notes)
  }

  if (updates.length === 0) {
    return existing
  }

  updates.push('updated_at = CURRENT_TIMESTAMP()')

  await runAiToolingQuery(
    `
      UPDATE \`${projectId}.greenhouse.ai_credit_wallets\`
      SET ${updates.join(', ')}
      WHERE wallet_id = @walletId
    `,
    params
  )

  const updated = await getWalletById(walletId, { includeCost: true })

  if (!updated) {
    throw new AiToolingValidationError('Updated wallet could not be reloaded.', 500)
  }

  return updated
}

export const consumeAiCredits = async ({
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
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgConsumeAiCredits({
        input,
        actorUserId
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const requestId = normalizeString(input.requestId)
  const wallet = await getWalletInternal(normalizeString(input.walletId))
  const consumedBy = await assertOperatorOrAdminMember(normalizeString(input.consumedByMemberId))
  const creditAmount = assertPositiveInteger(input.creditAmount, 'creditAmount')
  const assetDescription = normalizeString(input.assetDescription)

  if (!requestId) {
    throw new AiToolingValidationError('requestId is required.')
  }

  if (!assetDescription) {
    throw new AiToolingValidationError('assetDescription is required.')
  }

  const [existingRows, usdToClpRate] = await Promise.all([
    runAiToolingQuery<LedgerRow>(
      `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE wallet_id = @walletId
          AND request_id = @requestId
          AND entry_type = 'debit'
        LIMIT 1
      `,
      {
        walletId: wallet.walletId,
        requestId
      }
    ),
    getUsdToClpRate()
  ])

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

  const clientName = clientId ? String((await assertClient(clientId)).client_name || clientId) : null
  const balanceBefore = wallet.currentBalance
  const balanceAfter = wallet.currentBalance - creditAmount
  const unitCost = wallet.unitCost ?? 0
  const totalCost = unitCost * creditAmount
  const totalCostClp = (wallet.costCurrency || 'USD') === 'USD' ? totalCost * usdToClpRate : totalCost
  const nextStatus: WalletStatus = balanceAfter <= 0 ? 'depleted' : wallet.walletStatus === 'depleted' ? 'active' : wallet.walletStatus

  await runAiToolingQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.ai_credit_ledger\` (
        ledger_id,
        wallet_id,
        request_id,
        entry_type,
        credit_amount,
        balance_before,
        balance_after,
        consumed_by_member_id,
        consumed_by_name,
        client_id,
        client_name,
        notion_task_id,
        notion_project_id,
        project_name,
        asset_description,
        unit_cost,
        cost_currency,
        total_cost,
        total_cost_clp,
        notes,
        created_by,
        created_at
      )
      VALUES (
        @ledgerId,
        @walletId,
        @requestId,
        'debit',
        @creditAmount,
        @balanceBefore,
        @balanceAfter,
        @consumedByMemberId,
        @consumedByName,
        @clientId,
        @clientName,
        @notionTaskId,
        @notionProjectId,
        @projectName,
        @assetDescription,
        @unitCost,
        @costCurrency,
        @totalCost,
        @totalCostClp,
        @notes,
        @createdBy,
        CURRENT_TIMESTAMP()
      )
    `,
    {
      ledgerId: `ledger-${randomUUID()}`,
      walletId: wallet.walletId,
      requestId,
      creditAmount,
      balanceBefore,
      balanceAfter,
      consumedByMemberId: normalizeString(input.consumedByMemberId),
      consumedByName: String(consumedBy.display_name || ''),
      clientId,
      clientName,
      notionTaskId: normalizeNullableString(input.notionTaskId),
      notionProjectId: normalizeNullableString(input.notionProjectId),
      projectName: normalizeNullableString(input.projectName),
      assetDescription,
      unitCost,
      costCurrency: wallet.costCurrency || 'USD',
      totalCost,
      totalCostClp,
      notes: normalizeNullableString(input.notes),
      createdBy: actorUserId
    }
  )

  await runAiToolingQuery(
    `
      UPDATE \`${projectId}.greenhouse.ai_credit_wallets\`
      SET
        current_balance = @balanceAfter,
        monthly_consumed = @monthlyConsumed,
        wallet_status = @walletStatus,
        alert_sent = CASE
          WHEN @balanceAfter <= COALESCE(low_balance_threshold, 0) THEN TRUE
          ELSE alert_sent
        END,
        updated_at = CURRENT_TIMESTAMP()
      WHERE wallet_id = @walletId
    `,
    {
      walletId: wallet.walletId,
      balanceAfter,
      monthlyConsumed: wallet.monthlyConsumed + creditAmount,
      walletStatus: nextStatus
    }
  )

  const [entry, updatedWallet] = await Promise.all([
    runAiToolingQuery<LedgerRow>(
      `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE wallet_id = @walletId
          AND request_id = @requestId
          AND entry_type = 'debit'
        LIMIT 1
      `,
      { walletId: wallet.walletId, requestId }
    ),
    getWalletById(wallet.walletId, { includeCost: true })
  ])

  return {
    entry: entry[0] ? mapLedger(entry[0], { includeCost: true }) : null,
    wallet: updatedWallet
  }
}

export const reloadAiCredits = async ({
  input,
  actorUserId
}: {
  input: ReloadCreditsInput
  actorUserId: string
}) => {
  if (isAiToolingPostgresEnabled()) {
    try {
      await assertAiToolingPostgresReady()

      return await pgReloadAiCredits({
        input,
        actorUserId
      })
    } catch (error) {
      if (!shouldFallbackFromAiToolingPostgres(error)) {
        throw error
      }
    }
  }

  await ensureAiToolingInfrastructure()
  const projectId = getProjectId()
  const wallet = await getWalletInternal(normalizeString(input.walletId))
  const creditAmount = assertPositiveInteger(input.creditAmount, 'creditAmount')
  const reloadReason = assertEnum(input.reloadReason, RELOAD_REASONS, 'reloadReason')
  const requestId = normalizeNullableString(input.requestId)

  if (requestId) {
    const existingRows = await runAiToolingQuery<LedgerRow>(
      `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE wallet_id = @walletId
          AND request_id = @requestId
          AND entry_type = 'credit'
        LIMIT 1
      `,
      {
        walletId: wallet.walletId,
        requestId
      }
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

  await runAiToolingQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.ai_credit_ledger\` (
        ledger_id,
        wallet_id,
        request_id,
        entry_type,
        credit_amount,
        balance_before,
        balance_after,
        client_id,
        client_name,
        unit_cost,
        cost_currency,
        total_cost,
        total_cost_clp,
        reload_reason,
        reload_reference,
        notes,
        created_by,
        created_at
      )
      VALUES (
        @ledgerId,
        @walletId,
        @requestId,
        'credit',
        @creditAmount,
        @balanceBefore,
        @balanceAfter,
        @clientId,
        @clientName,
        @unitCost,
        @costCurrency,
        0,
        0,
        @reloadReason,
        @reloadReference,
        @notes,
        @createdBy,
        CURRENT_TIMESTAMP()
      )
    `,
    {
      ledgerId: `ledger-${randomUUID()}`,
      walletId: wallet.walletId,
      requestId,
      creditAmount,
      balanceBefore,
      balanceAfter,
      clientId: wallet.clientId,
      clientName: wallet.clientName,
      unitCost: wallet.unitCost ?? 0,
      costCurrency: wallet.costCurrency || 'USD',
      reloadReason,
      reloadReference: normalizeNullableString(input.reloadReference),
      notes: normalizeNullableString(input.notes),
      createdBy: actorUserId
    }
  )

  await runAiToolingQuery(
    `
      UPDATE \`${projectId}.greenhouse.ai_credit_wallets\`
      SET
        current_balance = @balanceAfter,
        wallet_status = 'active',
        alert_sent = FALSE,
        updated_at = CURRENT_TIMESTAMP()
      WHERE wallet_id = @walletId
    `,
    {
      walletId: wallet.walletId,
      balanceAfter
    }
  )

  const [entry, updatedWallet] = await Promise.all([
    runAiToolingQuery<LedgerRow>(
      `
        SELECT *
        FROM \`${projectId}.greenhouse.ai_credit_ledger\`
        WHERE wallet_id = @walletId
          AND reload_reason = @reloadReason
        ORDER BY created_at DESC
        LIMIT 1
      `,
      { walletId: wallet.walletId, reloadReason }
    ),
    getWalletById(wallet.walletId, { includeCost: true })
  ])

  return {
    entry: entry[0] ? mapLedger(entry[0], { includeCost: true }) : null,
    wallet: updatedWallet
  }
}
