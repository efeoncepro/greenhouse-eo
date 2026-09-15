/**
 * TASK-1845 — records del dominio (shape server-side, listo para mapear a DTOs por
 * audiencia en commands/readers; nunca se devuelven crudos a UI).
 */

import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanAuthoringMode } from '../contracts/plan'
import type { InsightAudience, InsightRequestV1 } from '../contracts/request'
import type { InsightActorKind, InsightEditionState, InsightFailedPhase } from '../contracts/states'

export interface InsightReportRecord {
  reportId: string
  reportCode: string
  organizationId: string
  purpose: string
  title: string
  status: 'active' | 'archived'
  createdByActorKind: InsightActorKind
  createdByUserId: string | null
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface InsightEditionRecord {
  editionId: string
  reportId: string
  organizationId: string
  version: number
  audience: InsightAudience
  state: InsightEditionState
  failedPhase: InsightFailedPhase | null
  request: InsightRequestV1
  requestHash: string
  idempotencyKey: string | null
  modules: string[]
  outputs: string[]
  periodTimeZone: string
  periodStartUtc: string
  periodEndUtc: string
  supersedesEditionId: string | null
  reviewOwnerUserId: string | null
  issuedAt: string | null
  issuedByUserId: string | null
  issuedHash: string | null
  withdrawnAt: string | null
  createdByActorKind: InsightActorKind
  createdByUserId: string | null
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface InsightEditionTransitionRecord {
  transitionId: string
  editionId: string
  organizationId: string
  fromState: InsightEditionState
  toState: InsightEditionState
  requiresHumanGate: boolean
  actorKind: InsightActorKind
  actorUserId: string | null
  actorMemberId: string | null
  reason: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface EvidenceSnapshotRecord {
  snapshotId: string
  editionId: string
  organizationId: string
  retentionClass: string
  facts: EvidenceFactV1[]
  sources: EvidenceSourceV1[]
  rejections: EvidenceRejectionV1[]
  asOfMin: string | null
  asOfMax: string | null
  snapshotHash: string | null
  sealedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EditorialPlanRecord {
  planId: string
  editionId: string
  organizationId: string
  snapshotId: string
  retentionClass: string
  plan: EditorialPlanV1
  planHash: string | null
  authoringMode: PlanAuthoringMode
  modelId: string | null
  promptVersion: string | null
  modelUsage: Record<string, unknown>
  frozenAt: string | null
  createdAt: string
  updatedAt: string
}
