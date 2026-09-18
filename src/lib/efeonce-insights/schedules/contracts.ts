/**
 * TASK-1848 — contratos de la recurrencia (browser-safe). Un schedule es una PLANTILLA de encargo
 * con período relativo + cadencia + zona + autoridad durable. V1: cada ocurrencia genera la edición
 * y pide su render, y queda en revisión humana. Autoemitir o autoenviar no existe (`review_policy`).
 */

import type { InsightActorKind } from '../contracts/states'
import type { InsightScheduleCadence } from '../window'

export type InsightScheduleState = 'draft' | 'active' | 'paused' | 'retired'
export type InsightSchedulePauseReason = 'manual' | 'authority_revoked' | 'module_unavailable' | 'repeated_failures'
export type InsightScheduleOccurrenceState = 'pending' | 'generating' | 'generated' | 'render_requested' | 'failed' | 'skipped'

export const INSIGHT_SCHEDULE_CADENCES: readonly InsightScheduleCadence[] = ['weekly', 'monthly']
export const INSIGHT_SCHEDULE_REVIEW_POLICY = 'draft_for_review' as const
export const INSIGHT_SCHEDULE_MAX_ACTIVE_PER_ORG = 10

/** Una ocurrencia `generating` más vieja que esto se considera caída y se reintenta (misma key). */
export const INSIGHT_SCHEDULE_STALE_GENERATING_MINUTES = 30
export const INSIGHT_SCHEDULE_MAX_OCCURRENCE_ATTEMPTS = 3

/** Access log del reader público: retención acotada (§8/§10), purgada por el tick. */
export const INSIGHT_SHARE_ACCESS_RETENTION_DAYS = 180

export interface InsightScheduleRecord {
  scheduleId: string
  organizationId: string
  scheduleVersion: number
  state: InsightScheduleState
  label: string
  cadence: InsightScheduleCadence
  timeZone: string
  consolidationDays: number
  catchUpLimit: number
  requestTemplate: Record<string, unknown>
  reviewPolicy: typeof INSIGHT_SCHEDULE_REVIEW_POLICY
  authorizedByActorKind: InsightActorKind
  authorizedByUserId: string
  activatedAt: string | null
  pausedAt: string | null
  pauseReason: InsightSchedulePauseReason | null
  retiredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InsightScheduleOccurrenceRecord {
  occurrenceId: string
  scheduleId: string
  scheduleVersion: number
  organizationId: string
  periodStart: string
  periodEndExclusive: string
  state: InsightScheduleOccurrenceState
  editionId: string | null
  renderRunId: string | null
  failureCode: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}

export interface InsightScheduleDto extends Omit<InsightScheduleRecord, 'authorizedByUserId'> {
  recentOccurrences: Array<Pick<InsightScheduleOccurrenceRecord, 'occurrenceId' | 'periodStart' | 'periodEndExclusive' | 'state' | 'editionId' | 'failureCode'>>
}

/** Idempotency key de la edición de una ocurrencia: dos ticks ⇒ la misma edición, nunca dos. */
export const insightScheduleEditionKey = (scheduleId: string, scheduleVersion: number, periodStart: string): string =>
  `sched-${scheduleId}-v${scheduleVersion}-${periodStart}`
