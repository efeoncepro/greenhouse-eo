// ═══════════════════════════════════════════════════════════
// AccountComplete360 — Federated serving layer types
// TASK-274: Account Complete 360
// ═══════════════════════════════════════════════════════════

import type { SensitivityLevel } from '@/types/person-complete-360'

// ── Facet Names ──

export const ACCOUNT_FACET_NAMES = [
  'identity',
  'spaces',
  'team',
  'economics',
  'delivery',
  'finance',
  'crm',
  'services',
  'staffAug'
] as const

export type AccountFacetName = (typeof ACCOUNT_FACET_NAMES)[number]

// ── Account Scope (resolved once, passed to all facets) ──

export interface AccountScope {
  organizationId: string
  publicId: string | null
  hubspotCompanyId: string | null
  spaceIds: string[]
  clientIds: string[]
}

// ── Resolver Meta ──

export interface AccountResolverMeta {
  resolvedAt: string
  resolverVersion: string
  facetsRequested: AccountFacetName[]
  facetsResolved: AccountFacetName[]
  timing: Partial<Record<AccountFacetName, number>>
  cacheStatus: Partial<Record<AccountFacetName, 'hit' | 'miss' | 'stale' | 'bypass'>>
  errors: { facet: AccountFacetName; error: string }[]
  deniedFacets: { facet: AccountFacetName; reason: string }[]
  redactedFields: Partial<Record<AccountFacetName, string[]>>
  warnings: string[]
  totalMs: number
}

// ── Facet Definition (registry shape) ──

export interface AccountFacetDefinition {
  fetch: (scope: AccountScope, ctx: AccountFacetContext) => Promise<unknown>
  cacheTTLSeconds: number
  sensitivityLevel: SensitivityLevel
}

// ── Facet Fetch Context (temporal + pagination) ──

export interface AccountFacetContext {
  asOf: string | null
  limit: number | null
  offset: number | null
}

// ── Identity Facet ──

export interface AccountIdentityFacet {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  taxId: string | null
  taxIdType: string | null
  industry: string | null
  country: string | null
  organizationType: string
  status: string
  active: boolean
  hubspotCompanyId: string | null
  notes: string | null
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  createdAt: string | null
  updatedAt: string | null
}

// ── Spaces Facet ──

export interface AccountSpaceEntry {
  spaceId: string
  publicId: string
  spaceName: string
  spaceType: string
  clientId: string | null
  clientName: string | null
  status: string
  activeModuleCount: number
}

export type AccountSpacesFacet = AccountSpaceEntry[]

// ── Team Facet ──

export interface AccountTeamMember {
  profileId: string
  eoId: string | null
  name: string
  avatarUrl: string | null
  jobTitle: string | null
  department: string | null
  fteAllocation: number | null
  membershipType: string
  isPrimary: boolean
}

export interface AccountTeamFacet {
  totalMembers: number
  totalFte: number
  members: AccountTeamMember[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
}

// ── Economics Facet ──

export interface AccountEconomicsPeriod {
  year: number
  month: number
  closureStatus: string | null
  periodClosed: boolean
  revenueCLP: number
  laborCostCLP: number
  directExpenseCLP: number
  indirectExpenseCLP: number
  totalCostCLP: number
  grossMarginCLP: number
  grossMarginPct: number | null
  headcountFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
}

export interface AccountEconomicsTrendPoint {
  year: number
  month: number
  revenueCLP: number
  laborCostCLP: number
  grossMarginCLP: number
  grossMarginPct: number | null
  headcountFte: number | null
}

export interface AccountClientProfitability {
  clientId: string
  clientName: string
  revenueCLP: number
  costCLP: number
  marginPct: number | null
  fte: number | null
}

export interface AccountEconomicsFacet {
  currentPeriod: AccountEconomicsPeriod | null
  trend: AccountEconomicsTrendPoint[]
  trendPagination: { total: number; limit: number; offset: number }
  byClient: AccountClientProfitability[]
}

// ── Delivery Facet ──

export interface AccountDeliveryIcoMetrics {
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  throughputCount: number
  cycleTimeAvg: number | null
  pipelineVelocity: number | null
  stuckAssetCount: number
  stuckAssetPct: number | null
}

export interface AccountDeliveryFacet {
  icoMetrics: AccountDeliveryIcoMetrics | null
  projectCount: number
  activeProjectCount: number
  sprintCount: number
  taskCounts: {
    total: number
    completed: number
    active: number
    overdue: number
    carryOver: number
  }
}

// ── Finance Facet ──

export interface AccountFinanceClientProfile {
  clientId: string
  legalName: string | null
  currency: string | null
  paymentTerms: number | null
  requiresPo: boolean
  requiresHes: boolean
}

export interface AccountFinanceFacet {
  clientProfiles: AccountFinanceClientProfile[]
  revenueYTD: number
  invoiceCount: number
  outstandingAmount: number
  dteCoverage: { coveredPct: number; uncoveredCount: number } | null
  accountsReceivable: {
    current: number
    overdue30: number
    overdue60: number
    overdue90: number
  } | null
}

// ── CRM Facet ──

export interface AccountCrmCompany {
  hubspotId: string
  name: string | null
  lifecycleStage: string | null
  industry: string | null
  website: string | null
  ownerName: string | null
}

export interface AccountCrmDeal {
  dealName: string
  stage: string | null
  amount: number | null
  currency: string | null
  closeDate: string | null
  ownerName: string | null
}

export interface AccountCrmFacet {
  company: AccountCrmCompany | null
  dealCount: number
  openDealAmount: number
  closedWonYTD: number
  dealsPipeline: AccountCrmDeal[]
  contactCount: number
}

// ── Services Facet ──

export interface AccountServiceEntry {
  serviceId: string
  publicId: string | null
  name: string
  businessLine: string | null
  servicoEspecifico: string | null
  modalidad: string | null
  startDate: string | null
  targetEndDate: string | null
  status: string
  billingFrequency: string | null
  totalCost: number | null
  currency: string | null
}

export interface AccountServicesFacet {
  activeServices: AccountServiceEntry[]
  byBusinessLine: Record<string, number>
  totalActiveCount: number
  totalRevenue: number
}

// ── Staff Aug Facet ──

export interface AccountStaffAugPlacement {
  placementId: string
  memberName: string | null
  memberAvatarUrl: string | null
  organizationName: string | null
  status: string
  lifecycleStage: string | null
  billingRate: number | null
  billingCurrency: string | null
  contractStart: string | null
  contractEnd: string | null
  providerType: string | null
  requiredSkills: string[] | null
}

export interface AccountStaffAugFacet {
  placements: AccountStaffAugPlacement[]
  activePlacementCount: number
  totalBillingRate: number
  byCurrency: { currency: string; totalRate: number; count: number }[]
}

// ── Complete 360 ──

export interface AccountComplete360 {
  _meta: AccountResolverMeta
  identity: AccountIdentityFacet
  spaces?: AccountSpacesFacet
  team?: AccountTeamFacet
  economics?: AccountEconomicsFacet
  delivery?: AccountDeliveryFacet
  finance?: AccountFinanceFacet
  crm?: AccountCrmFacet
  services?: AccountServicesFacet
  staffAug?: AccountStaffAugFacet
}

// ── Options ──

export interface AccountComplete360Options {
  facets?: AccountFacetName[]
  asOf?: string | null
  cacheBypass?: boolean
  limit?: number | null
  offset?: number | null
  requesterRoleCodes?: string[]
  requesterTenantType?: string
  requesterOrganizationId?: string | null
}

// ── Authorization ──

export interface AccountFacetAuthContext {
  requesterRoleCodes: string[]
  requesterTenantType: string
  requesterOrganizationId: string | null
  targetOrganizationId: string
  requestedFacets: AccountFacetName[]
}

export interface AccountFacetAuthResult {
  allowedFacets: AccountFacetName[]
  deniedFacets: { facet: AccountFacetName; reason: string }[]
  fieldRedactions: Partial<Record<AccountFacetName, string[]>>
}
