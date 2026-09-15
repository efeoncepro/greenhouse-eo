/**
 * TASK-1845 — proyección por audiencia (browser-safe). El cliente ve sus solicitudes con
 * estado REDACTADO y sólo ediciones de audiencia `client`; nunca fase fallida, owner de
 * revisión ni borradores internos (arquitectura §7.1). El interno ve el estado real.
 */

import type { InsightEditionState } from '../contracts/states'
import type { EditorialPlanRecord, EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'

export type InsightViewer = 'client' | 'internal'

export type ClientEditionStatus = 'in_progress' | 'in_review' | 'issued' | 'needs_attention' | 'withdrawn'

const CLIENT_STATUS: Record<InsightEditionState, ClientEditionStatus> = {
  draft: 'in_progress',
  collecting: 'in_progress',
  composing: 'in_progress',
  validating: 'in_progress',
  ready_for_review: 'in_review',
  issued: 'issued',
  failed: 'needs_attention',
  withdrawn: 'withdrawn'
}

export interface InsightEditionDto {
  editionId: string
  reportId: string
  organizationId: string
  version: number
  audience: InsightEditionRecord['audience']
  status: InsightEditionState | ClientEditionStatus
  /** Sólo interno. */
  failedPhase?: InsightEditionRecord['failedPhase']
  reviewOwnerUserId?: string | null
  modules: string[]
  outputs: string[]
  period: { start: string; endExclusive: string; timeZone: string }
  comparison: InsightEditionRecord['request']['comparison']
  locale: string
  depth: string
  supersedesEditionId: string | null
  issuedAt: string | null
  withdrawnAt: string | null
  createdAt: string
  updatedAt: string
  /** Salidas renderizadas: vacío hasta TASK-1846. */
  outputsAvailable: []
}

export const isEditionVisibleTo = (edition: InsightEditionRecord, viewer: InsightViewer): boolean =>
  viewer === 'internal' || edition.audience === 'client'

export const projectEdition = (edition: InsightEditionRecord, viewer: InsightViewer): InsightEditionDto => ({
  editionId: edition.editionId,
  reportId: edition.reportId,
  organizationId: edition.organizationId,
  version: edition.version,
  audience: edition.audience,
  status: viewer === 'internal' ? edition.state : CLIENT_STATUS[edition.state],
  ...(viewer === 'internal' ? { failedPhase: edition.failedPhase, reviewOwnerUserId: edition.reviewOwnerUserId } : {}),
  modules: edition.modules,
  outputs: edition.outputs,
  period: edition.request.period,
  comparison: edition.request.comparison,
  locale: edition.request.locale,
  depth: edition.request.depth,
  supersedesEditionId: edition.supersedesEditionId,
  issuedAt: edition.issuedAt,
  withdrawnAt: edition.withdrawnAt,
  createdAt: edition.createdAt,
  updatedAt: edition.updatedAt,
  outputsAvailable: []
})

export interface InsightReportDto {
  reportId: string
  reportCode: string
  organizationId: string
  title: string
  purpose: string
  status: InsightReportRecord['status']
  createdAt: string
  updatedAt: string
}

export const projectReport = (report: InsightReportRecord): InsightReportDto => ({
  reportId: report.reportId,
  reportCode: report.reportCode,
  organizationId: report.organizationId,
  title: report.title,
  purpose: report.purpose,
  status: report.status,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt
})

/** Evidencia y plan: el cliente sólo los ve de una edición EMITIDA; el interno siempre. */
export const canViewEvidence = (edition: InsightEditionRecord, viewer: InsightViewer): boolean =>
  viewer === 'internal' || edition.state === 'issued'

export const projectSnapshot = (snapshot: EvidenceSnapshotRecord) => ({
  snapshotId: snapshot.snapshotId,
  sealedAt: snapshot.sealedAt,
  snapshotHash: snapshot.snapshotHash,
  asOfMin: snapshot.asOfMin,
  asOfMax: snapshot.asOfMax,
  facts: snapshot.facts,
  sources: snapshot.sources,
  rejections: snapshot.rejections
})

export const projectPlan = (plan: EditorialPlanRecord, viewer: InsightViewer) => ({
  planId: plan.planId,
  frozenAt: plan.frozenAt,
  planHash: plan.planHash,
  plan: plan.plan,
  // Provenance del modelo: sólo interno (la metadata no filtra prompts ni usage al cliente).
  ...(viewer === 'internal' ? { authoringMode: plan.authoringMode, modelId: plan.modelId, promptVersion: plan.promptVersion } : {})
})
