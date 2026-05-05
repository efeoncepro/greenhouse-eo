import type { GreenhouseEntitlementModule } from '@/config/entitlements-catalog'
import type { PortalHomePolicyKey } from '@/lib/tenant/resolve-portal-home-path'

export interface ModuleCard {
  id: string
  title: string
  subtitle: string
  icon: string
  route: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
  isNew?: boolean
}

// TASK-553 — `HomeRecommendedShortcut` is the Home-facing projection of a
// `CanonicalShortcut` from `src/lib/shortcuts/catalog.ts`. `id` mirrors the
// canonical `key`. Header surfaces consume the catalog directly via
// `resolveAvailableShortcuts` / `resolveRecommendedShortcuts`.
export interface HomeRecommendedShortcut {
  id: string
  label: string
  route: string
  icon: string
  module: GreenhouseEntitlementModule
}

export interface HomeAccessContext {
  audienceKey: 'admin' | 'internal' | 'hr' | 'finance' | 'collaborator' | 'client'
  startupPolicyKey: PortalHomePolicyKey
  moduleKeys: GreenhouseEntitlementModule[]
}

export interface HomeNexaInsightItem {
  id: string
  signalType: string
  metricId: string
  severity: string | null
  explanation: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  processedAt: string
}

export interface HomeNexaInsightsPayload {
  totalAnalyzed: number
  lastAnalysis: string | null
  runStatus: 'succeeded' | 'partial' | 'failed' | null
  insights: HomeNexaInsightItem[]
  timeline: HomeNexaInsightItem[]
}

export interface PendingTask {
  id: string
  title: string
  description: string
  type: 'project' | 'finance' | 'hr' | 'other'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  ctaLabel?: string
  ctaRoute?: string
}

export interface NexaMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  suggestions?: string[]
  timestamp: string
}

export interface HomeSnapshot {
  user: {
    firstName: string
    lastName: string | null
    role: string
  }
  greeting: {
    title: string
    subtitle: string
  }
  modules: ModuleCard[]
  tasks: PendingTask[]
  recommendedShortcuts?: HomeRecommendedShortcut[]
  accessContext?: HomeAccessContext | null
  nexaInsights?: HomeNexaInsightsPayload | null
  financeStatus?: {
    periodLabel: string
    closureStatus: string | null
    readinessPct: number | null
    latestMarginPct: number | null
    latestMarginPeriodLabel: string | null
    latestPeriodClosed: boolean
  } | null
  nexaIntro: string
  computedAt: string
}
