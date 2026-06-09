import type { AccountComplete360 } from '@/types/account-complete-360'
import type { OrganizationProjectsSummary } from '@/lib/account-360/organization-projects'
import type { OrganizationDetail, OrganizationFinanceSummary } from '@/lib/account-360/organization-store'
import type { ClientLifecycleCase } from '@/lib/client-lifecycle/types'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import type { EntrypointContext, OrganizationWorkspaceProjection } from './projection-types'
import type { OrganizationFacet } from './facet-capability-mapping'

export const ORGANIZATION_WORKSPACE_COMPACT_SIGNAL_SOURCES = [
  'workspace_projection',
  'organization_360',
  'account_360',
  'projects',
  'finance_summary',
  'client_lifecycle',
  'reliability_signals'
] as const

export type OrganizationWorkspaceCompactSignalSource =
  (typeof ORGANIZATION_WORKSPACE_COMPACT_SIGNAL_SOURCES)[number]

export const ORGANIZATION_WORKSPACE_COMPACT_SIGNAL_STATUSES = [
  'ready',
  'partial',
  'empty',
  'unavailable'
] as const

export type OrganizationWorkspaceCompactSignalsStatus =
  (typeof ORGANIZATION_WORKSPACE_COMPACT_SIGNAL_STATUSES)[number]

export const ORGANIZATION_WORKSPACE_READINESS_STATES = [
  'complete',
  'pending',
  'blocked',
  'unknown'
] as const

export type OrganizationWorkspaceReadinessState =
  (typeof ORGANIZATION_WORKSPACE_READINESS_STATES)[number]

export const ORGANIZATION_WORKSPACE_HEALTH_STATES = [
  'good',
  'watch',
  'risk',
  'blocked',
  'unknown'
] as const

export type OrganizationWorkspaceHealthState =
  (typeof ORGANIZATION_WORKSPACE_HEALTH_STATES)[number]

export const ORGANIZATION_WORKSPACE_SIGNAL_SEVERITIES = [
  'info',
  'success',
  'warning',
  'error'
] as const

export type OrganizationWorkspaceSignalSeverity =
  (typeof ORGANIZATION_WORKSPACE_SIGNAL_SEVERITIES)[number]

export const ORGANIZATION_WORKSPACE_NEXT_ACTION_KINDS = [
  'review',
  'complete',
  'refresh',
  'monitor'
] as const

export type OrganizationWorkspaceNextActionKind =
  (typeof ORGANIZATION_WORKSPACE_NEXT_ACTION_KINDS)[number]

export const ORGANIZATION_WORKSPACE_PROVENANCE_CONFIDENCE = [
  'high',
  'medium',
  'low'
] as const

export type OrganizationWorkspaceProvenanceConfidence =
  (typeof ORGANIZATION_WORKSPACE_PROVENANCE_CONFIDENCE)[number]

export type OrganizationWorkspaceCompactSignalsInput = {
  subject: TenantEntitlementSubject
  organizationId: string
  entrypointContext: EntrypointContext
  asOf?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  limits?: {
    account360?: number
    nextActions?: number
    recentSignals?: number
  }
}

export type CompactSignalDriver = {
  id: string
  label: string
  value: string
  severity: OrganizationWorkspaceSignalSeverity
  source: OrganizationWorkspaceCompactSignalSource
  facet?: OrganizationFacet
}

export type CompactReadinessItem = {
  id: string
  label: string
  state: OrganizationWorkspaceReadinessState
  source: OrganizationWorkspaceCompactSignalSource
  facet?: OrganizationFacet
  helper: string
}

export type CompactRecentSignal = {
  id: string
  title: string
  body: string
  severity: OrganizationWorkspaceSignalSeverity
  source: OrganizationWorkspaceCompactSignalSource
  facet?: OrganizationFacet
  observedAt: string | null
}

export type CompactNextAction = {
  id: string
  label: string
  kind: OrganizationWorkspaceNextActionKind
  source: OrganizationWorkspaceCompactSignalSource
  facet?: OrganizationFacet
  href: string | null
  dueAt: string | null
}

export type CompactSignalProvenance = {
  source: OrganizationWorkspaceCompactSignalSource
  label: string
  status: 'available' | 'degraded' | 'skipped'
  observedAt: string | null
  confidence: OrganizationWorkspaceProvenanceConfidence
}

export type CompactSignalDegradedSource = {
  source: OrganizationWorkspaceCompactSignalSource
  status: 'timeout' | 'error' | 'not_configured'
  observedAt: string
  durationMs: number
  error: string | null
}

export type OrganizationWorkspaceCompactSignals = {
  organizationId: string
  entrypointContext: EntrypointContext
  status: OrganizationWorkspaceCompactSignalsStatus
  computedAt: string
  asOf: string
  period: { year: number; month: number }
  projection: {
    visibleFacets: OrganizationFacet[]
    defaultFacet: OrganizationFacet | null
    degradedMode: boolean
    degradedReason: OrganizationWorkspaceProjection['degradedReason']
  }
  health: {
    overallState: OrganizationWorkspaceHealthState
    score: number | null
    drivers: CompactSignalDriver[]
  }
  readiness: CompactReadinessItem[]
  recentSignals: CompactRecentSignal[]
  nextActions: CompactNextAction[]
  provenance: CompactSignalProvenance[]
  degradedSources: CompactSignalDegradedSource[]
  sourceFreshness: Record<OrganizationWorkspaceCompactSignalSource, string | null>
}

export type OrganizationWorkspaceCompactSignalSourceValues = {
  projection: OrganizationWorkspaceProjection
  detail: OrganizationDetail | null
  account360: AccountComplete360 | null
  projects: OrganizationProjectsSummary | null
  financeSummary: OrganizationFinanceSummary | null
  lifecycleCase: ClientLifecycleCase | null
}
