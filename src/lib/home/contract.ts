/**
 * TASK-696 — Smart Home v2 versioned contract.
 *
 * Single source of truth for the shape consumed by:
 *   - the web Smart Home shell (`src/views/greenhouse/home/v2/`)
 *   - future MCP read surfaces (TASK-647 / TASK-650)
 *   - the Teams bot home digest
 *   - any mobile / desktop shell that lands later
 *
 * Same versioning discipline as Platform Health V1 (`platform-health.v1`):
 * additive changes are non-breaking (new optional fields, new block ids).
 * Breaking changes require a `home-snapshot.v2` bump with deprecation window.
 */

import 'server-only'

import type { HomeAudienceKey } from '@/lib/entitlements/types'

export const HOME_SNAPSHOT_CONTRACT_VERSION = 'home-snapshot.v1' as const

export type HomeSnapshotContractVersion = typeof HOME_SNAPSHOT_CONTRACT_VERSION

// -- Block identity -----------------------------------------------------------

export type HomeBlockId =
  | 'hero-ai'
  | 'pulse-strip'
  | 'today-inbox'
  | 'closing-countdown'
  | 'ai-insights-bento'
  | 'recents-rail'
  | 'reliability-ribbon'
  | 'calendar-rail'
  | 'runway-strategic'
  | 'ai-briefing'
  | 'at-risk-watchlist'

export type HomeSlotKey = 'hero' | 'pulse' | 'main' | 'aside' | 'footer'

export type HomeBlockOutcome = 'ok' | 'degraded' | 'hidden' | 'error'

export type HomeUiDensity = 'cozy' | 'comfortable' | 'compact'

export interface HomeBlockEnvelope<T = unknown> {
  blockId: HomeBlockId
  slot: HomeSlotKey
  outcome: HomeBlockOutcome
  data: T | null
  degradedSources?: string[]
  fetchedAtMs: number
  ttlMs: number
  errorMessage?: string
  /** Source name when the block degrades because of a single source — surfaced in UI tooltips. */
  degradedSourceLabel?: string | null
}

// -- Block payload shapes -----------------------------------------------------

export type PulseTrendDirection = 'up' | 'down' | 'flat'
export type PulseStatus = 'optimal' | 'attention' | 'critical' | 'unknown'

export interface PulseKpiCard {
  kpiId: string
  label: string
  value: number | null
  unit: 'currency' | 'percentage' | 'integer' | 'days' | 'count' | 'minutes'
  currency?: 'CLP' | 'USD' | 'UF' | null
  delta: number | null
  deltaPct: number | null
  trend: PulseTrendDirection
  status: PulseStatus
  sparkline: number[]
  sparklineLabels?: string[]
  drillHref: string | null
  description?: string | null
  computedAt: string
  source: 'precomputed' | 'realtime'
}

export interface HomePulseStripData {
  audienceKey: HomeAudienceKey
  cards: PulseKpiCard[]
  generatedAt: string
}

export interface HomeHeroAiSuggestion {
  prompt: string
  shortLabel: string
  intent: string
}

export interface HomeHeroAiIdentity {
  displayName: string
  role: string
  tenantLabel: string
  avatarUrl: string | null
}

export interface HomeHeroAiData {
  greeting: string
  subtitle: string
  modelLabel: string
  modelKey: string
  suggestions: HomeHeroAiSuggestion[]
  lastQueryAtMs: number | null
  disclaimer: string
  identity: HomeHeroAiIdentity | null
}

export type TodayInboxKind =
  | 'approval'
  | 'closing'
  | 'sla_breach'
  | 'sync_drift'
  | 'mention'
  | 'task'
  | 'incident'
  | 'reminder'

export type TodayInboxSeverity = 'critical' | 'warning' | 'info'

export interface TodayInboxItem {
  itemId: string
  kind: TodayInboxKind
  severity: TodayInboxSeverity
  title: string
  description: string | null
  href: string | null
  dueAt: string | null
  origin: string
  actions: Array<{
    actionId: 'approve' | 'dismiss' | 'snooze' | 'open'
    label: string
    primary?: boolean
  }>
  createdAt: string
}

export interface HomeTodayInboxData {
  items: TodayInboxItem[]
  totalUnread: number
  groupCounts: Partial<Record<TodayInboxKind, number>>
  fetchedAt: string
}

export type ClosingTrafficLight = 'green' | 'yellow' | 'red'

export interface HomeClosingCountdownItem {
  closingId: string
  domain: 'finance' | 'payroll'
  label: string
  periodLabel: string
  readinessPct: number | null
  hoursRemaining: number | null
  trafficLight: ClosingTrafficLight
  ctaHref: string | null
  ctaLabel: string | null
}

export interface HomeClosingCountdownData {
  items: HomeClosingCountdownItem[]
  asOf: string
}

export interface HomeAiInsightCard {
  insightId: string
  domain: 'finance' | 'delivery' | 'hr' | 'commercial' | 'agency' | 'people' | 'integrations'
  signalType: string
  severity: 'critical' | 'warning' | 'info' | null
  metricLabel: string
  headline: string
  rootCauseSummary: string | null
  recommendedAction: string | null
  drillHref: string | null
  processedAt: string
}

export interface HomeAiInsightsBentoData {
  cards: HomeAiInsightCard[]
  totalAnalyzed: number
  lastAnalysisAt: string | null
}

export interface HomeRecentItem {
  recentId: string
  entityKind: string
  entityId: string
  title: string
  href: string
  badge?: string | null
  lastSeenAt: string
  visitCount: number
}

export interface HomeRecentsRailData {
  items: HomeRecentItem[]
  draftItems: HomeRecentItem[]
}

export type CalendarEventKind =
  | 'closing'
  | 'leave_window'
  | 'sprint_end'
  | 'cycle_review'
  | 'invoice_due'
  | 'meeting'
  | 'holiday'

export interface HomeCalendarEvent {
  eventId: string
  kind: CalendarEventKind
  title: string
  startsAt: string
  endsAt?: string | null
  href: string | null
  badge?: string | null
}

export interface HomeCalendarRailData {
  events: HomeCalendarEvent[]
  asOf: string
}

// -- Runway / Cash Position (CEO + finance) ----------------------------------

export interface HomeRunwayData {
  cashCurrent: number | null
  burnMonthly: number | null
  runwayMonths: number | null
  cashCurrency: 'CLP' | 'USD' | 'UF'
  trend: PulseTrendDirection
  deltaPct: number | null
  monthlyHistory: Array<{ periodLabel: string; cash: number; burn: number }>
  status: PulseStatus
  drillHref: string | null
  asOf: string
  computedFrom: 'income_minus_expenses' | 'manual_balance'
}

// -- AI Briefing (proactive narrative, role-aware) ---------------------------

export type AiBriefingNarrativeKind = 'business' | 'team' | 'platform' | 'finance' | 'hr' | 'delivery' | 'personal'

export interface AiBriefingNarrative {
  kind: AiBriefingNarrativeKind
  title: string
  body: string
  signalCount?: number | null
  drillHref?: string | null
}

export interface HomeAiBriefingData {
  narratives: AiBriefingNarrative[]
  modelLabel: string
  generatedAt: string
  source: 'precomputed' | 'realtime'
  audienceScope: 'ceo' | 'finance' | 'hr' | 'delivery' | 'internal' | 'personal'
}

// -- At-Risk Watchlist (role-aware payload) ----------------------------------

export type AtRiskKind = 'space' | 'invoice' | 'member' | 'project'

export interface AtRiskItem {
  itemId: string
  kind: AtRiskKind
  title: string
  subtitle: string | null
  riskScore: number
  riskBand: 'critical' | 'attention' | 'monitor'
  drivers: string[]
  href: string | null
  metric?: { label: string; value: string } | null
}

export interface HomeAtRiskWatchlistData {
  audienceScope: 'ceo' | 'finance' | 'hr' | 'delivery'
  domainLabel: string
  items: AtRiskItem[]
  asOf: string
}

export type ReliabilityModuleStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface HomeReliabilityModuleSummary {
  moduleKey: string
  label: string
  status: ReliabilityModuleStatus
  incidentsOpen: number
  lastIncidentAt: string | null
}

export interface HomeReliabilityRibbonData {
  rollup: ReliabilityModuleStatus
  modules: HomeReliabilityModuleSummary[]
  degradedSources: string[]
  asOf: string
}

// -- Snapshot -----------------------------------------------------------------

export interface HomeSnapshotMeta {
  renderedAtMs: number
  composerVersion: 'home-composer.v1'
  /** 0..1 — proportion of blocks that resolved with `outcome === 'ok'`. */
  confidence: number
  cacheHits: number
  cacheMisses: number
  durationMs: number
}

export interface HomeSnapshotV1 {
  contractVersion: HomeSnapshotContractVersion
  audience: HomeAudienceKey
  roleCodes: string[]
  density: HomeUiDensity
  defaultView: string | null
  optedOutOfV2: boolean
  blocks: HomeBlockEnvelope[]
  meta: HomeSnapshotMeta
}

// -- Helpers ------------------------------------------------------------------

export const isHomeSnapshotV1 = (value: unknown): value is HomeSnapshotV1 => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { contractVersion?: unknown; blocks?: unknown }

  
return (
    candidate.contractVersion === HOME_SNAPSHOT_CONTRACT_VERSION &&
    Array.isArray(candidate.blocks)
  )
}

export const findBlock = <T = unknown>(snapshot: HomeSnapshotV1, blockId: HomeBlockId): HomeBlockEnvelope<T> | null => {
  return (snapshot.blocks.find(block => block.blockId === blockId) as HomeBlockEnvelope<T> | undefined) ?? null
}

export const HOME_BLOCK_TTL_MS_DEFAULT = 30_000
