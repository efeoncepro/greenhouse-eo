export type ProviderCategory =
  | 'ai_vendor'
  | 'software_suite'
  | 'identity_provider'
  | 'delivery_platform'
  | 'financial_vendor'

export type ProviderKind = 'organization' | 'platform' | 'marketplace'

export interface ProviderRecord {
  providerId: string
  providerName: string
  providerCategory: ProviderCategory
  providerKind: ProviderKind
  websiteUrl: string | null
  supportUrl: string | null
  iconUrl: string | null
  isActive: boolean
}

export type ToolCategory =
  | 'gen_visual'
  | 'gen_video'
  | 'gen_text'
  | 'gen_audio'
  | 'ai_suite'
  | 'creative_production'
  | 'collaboration'
  | 'analytics'
  | 'crm'
  | 'infrastructure'

export type CostModel = 'subscription' | 'per_credit' | 'hybrid' | 'free_tier' | 'included'

export interface AiTool {
  toolId: string
  toolName: string
  providerId: string
  providerName: string | null
  vendor: string | null
  toolCategory: ToolCategory
  toolSubcategory: string | null
  costModel: CostModel
  subscriptionAmount: number | null
  subscriptionCurrency: string
  subscriptionBillingCycle: string
  subscriptionSeats: number | null
  creditUnitName: string | null
  creditUnitCost: number | null
  creditUnitCurrency: string
  creditsIncludedMonthly: number | null
  finSupplierId: string | null
  description: string | null
  websiteUrl: string | null
  iconUrl: string | null
  isActive: boolean
  sortOrder: number
}

export type LicenseStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'revoked'
export type AccessLevel = 'full' | 'limited' | 'trial' | 'viewer'

export interface MemberToolLicense {
  licenseId: string
  memberId: string
  memberName: string | null
  memberEmail: string | null
  toolId: string
  licenseStatus: LicenseStatus
  activatedAt: string | null
  expiresAt: string | null
  accessLevel: AccessLevel
  licenseKey: string | null
  accountEmail: string | null
  notes: string | null
  assignedBy: string | null
  createdAt: string | null
  updatedAt: string | null
  tool: AiTool | null
}

export type WalletScope = 'client' | 'pool'
export type WalletStatus = 'active' | 'depleted' | 'expired' | 'suspended'
export type BalanceHealth = 'healthy' | 'warning' | 'critical' | 'depleted'

export interface AiCreditWallet {
  walletId: string
  walletName: string
  walletScope: WalletScope
  clientId: string | null
  clientName: string | null
  toolId: string
  toolName: string
  providerId: string | null
  providerName: string | null
  creditUnitName: string
  initialBalance: number
  currentBalance: number
  reservedBalance: number
  monthlyLimit: number | null
  monthlyConsumed: number
  monthlyResetDay: number
  lowBalanceThreshold: number | null
  validFrom: string
  validUntil: string | null
  walletStatus: WalletStatus
  balanceHealth: BalanceHealth
  usagePercent: number
  availableBalance: number
  unitCost: number | null
  costCurrency: string | null
  notes: string | null
  toolIconUrl: string | null
}

export type LedgerEntryType = 'debit' | 'credit' | 'reserve' | 'release' | 'adjustment'
export type ReloadReason =
  | 'initial_allocation'
  | 'monthly_renewal'
  | 'purchase'
  | 'bonus'
  | 'rollover'
  | 'manual_adjustment'

export interface AiCreditLedgerEntry {
  ledgerId: string
  walletId: string
  requestId: string | null
  entryType: LedgerEntryType
  creditAmount: number
  balanceBefore: number
  balanceAfter: number
  consumedByMemberId: string | null
  consumedByName: string | null
  clientId: string | null
  clientName: string | null
  notionTaskId: string | null
  notionProjectId: string | null
  projectName: string | null
  assetDescription: string | null
  unitCost: number | null
  costCurrency: string | null
  totalCost: number | null
  totalCostClp: number | null
  reloadReason: ReloadReason | null
  reloadReference: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string | null
}

export interface ClientCreditSummary {
  wallets: Array<AiCreditWallet & { toolIconUrl: string | null }>
  totalCreditsAvailable: number
  totalCreditsConsumed: number
  topConsumingProjects: Array<{
    projectName: string
    creditsConsumed: number
  }>
}

export interface AdminCreditSummary extends ClientCreditSummary {
  totalCostUsd: number
  totalCostClp: number
  costByTool: Array<{
    toolName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
  costByClient: Array<{
    clientName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
}

export interface AiToolsCatalogResponse {
  tools: AiTool[]
  providers: ProviderRecord[]
  summary: {
    total: number
    active: number
    categories: Record<string, number>
  }
}

export interface AiToolLicensesResponse {
  licenses: MemberToolLicense[]
  summary: {
    total: number
    active: number
    members: number
  }
}

export interface AiCreditWalletsResponse {
  wallets: AiCreditWallet[]
  summary: {
    totalWallets: number
    activeWallets: number
    depletedWallets: number
    totalCreditsAvailable: number
  }
}

export interface AiCreditLedgerResponse {
  entries: AiCreditLedgerEntry[]
  summary: {
    totalEntries: number
    totalDebits: number
    totalCredits: number
    totalCostUsd: number | null
    totalCostClp: number | null
  }
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface CreateAiToolInput {
  toolId: string
  toolName: string
  providerId: string
  vendor?: string | null
  toolCategory: ToolCategory
  toolSubcategory?: string | null
  costModel: CostModel
  subscriptionAmount?: number | null
  subscriptionCurrency?: string
  subscriptionBillingCycle?: string
  subscriptionSeats?: number | null
  creditUnitName?: string | null
  creditUnitCost?: number | null
  creditUnitCurrency?: string
  creditsIncludedMonthly?: number | null
  finSupplierId?: string | null
  description?: string | null
  websiteUrl?: string | null
  iconUrl?: string | null
  isActive?: boolean
  sortOrder?: number
}

export type UpdateAiToolInput = Partial<CreateAiToolInput>

export interface CreateLicenseInput {
  memberId: string
  toolId: string
  accessLevel?: AccessLevel
  accountEmail?: string | null
  notes?: string | null
  expiresAt?: string | null
}

export interface UpdateLicenseInput {
  licenseStatus?: LicenseStatus
  accessLevel?: AccessLevel
  accountEmail?: string | null
  notes?: string | null
  expiresAt?: string | null
}

export interface CreateWalletInput {
  walletScope: WalletScope
  clientId?: string | null
  toolId: string
  initialBalance: number
  monthlyLimit?: number | null
  monthlyResetDay?: number | null
  lowBalanceThreshold?: number | null
  validFrom: string
  validUntil?: string | null
  notes?: string | null
}

export interface UpdateWalletInput {
  monthlyLimit?: number | null
  monthlyResetDay?: number | null
  lowBalanceThreshold?: number | null
  validFrom?: string
  validUntil?: string | null
  walletStatus?: WalletStatus
  notes?: string | null
}

export interface ConsumeCreditsInput {
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

export interface ReloadCreditsInput {
  requestId?: string | null
  walletId: string
  creditAmount: number
  reloadReason: ReloadReason
  reloadReference?: string | null
  notes?: string | null
}

export interface AiToolingAdminMetadata {
  providers: ProviderRecord[]
  financeSuppliers: Array<{
    supplierId: string
    legalName: string
    tradeName: string | null
    paymentCurrency: string | null
  }>
  activeClients: Array<{
    clientId: string
    clientName: string
  }>
  activeMembers: Array<{
    memberId: string
    displayName: string
    email: string
  }>
  toolCategories: ToolCategory[]
  costModels: CostModel[]
  accessLevels: AccessLevel[]
  licenseStatuses: LicenseStatus[]
  walletScopes: WalletScope[]
  walletStatuses: WalletStatus[]
  reloadReasons: ReloadReason[]
}
