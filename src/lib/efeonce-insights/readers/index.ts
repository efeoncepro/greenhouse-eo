import 'server-only'

/**
 * TASK-1845 — readers canónicos (todo consumer pasa por aquí; ninguno lee tablas directo).
 * Cada reader revalida actor/target/módulo y proyecta por audiencia.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { assertInsightsAccess } from '../authz'
import { getInsightsCatalog, type InsightsCatalog } from '../catalog'
import type { InsightAudience } from '../contracts/request'
import type { InsightEditionState } from '../contracts/states'
import { InsightsNotFoundError } from '../errors'
import { getInsightEditionById, listInsightEditionTransitions, listInsightEditions } from '../stores/edition-store'
import { getInsightEditorialPlanByEdition } from '../stores/plan-store'
import { getInsightReportById, listInsightReports } from '../stores/report-store'
import { getInsightEvidenceSnapshotByEdition } from '../stores/snapshot-store'
import { canViewEvidence, isEditionVisibleTo, projectEdition, projectPlan, projectReport, projectSnapshot, type InsightEditionDto, type InsightReportDto, type InsightViewer } from './projection'

interface ReaderScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
}

const viewerOf = (isInternal: boolean): InsightViewer => (isInternal ? 'internal' : 'client')

export const readInsightsCatalog = async (scope: ReaderScope): Promise<InsightsCatalog> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })

  return getInsightsCatalog(grant)
}

export const readInsightReports = async (scope: ReaderScope & { limit: number; offset: number }): Promise<{ items: InsightReportDto[]; total: number }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })
  const result = await listInsightReports(undefined, { organizationId: grant.organizationId, status: 'active', limit: scope.limit, offset: scope.offset })

  return { items: result.items.map(projectReport), total: result.total }
}

export const readInsightReport = async (scope: ReaderScope & { reportId: string }): Promise<{ report: InsightReportDto; editions: InsightEditionDto[] }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })
  const report = await getInsightReportById(undefined, grant.organizationId, scope.reportId)

  if (!report) throw new InsightsNotFoundError('report', scope.reportId)

  const viewer = viewerOf(grant.isInternal)
  const editions = await listInsightEditions(undefined, { organizationId: grant.organizationId, reportId: report.reportId, audience: grant.isInternal ? null : 'client', limit: 200, offset: 0 })

  return { report: projectReport(report), editions: editions.items.filter(edition => isEditionVisibleTo(edition, viewer)).map(edition => projectEdition(edition, viewer)) }
}

export const readInsightEditions = async (
  scope: ReaderScope & { reportId?: string | null; states?: InsightEditionState[] | null; audience?: InsightAudience | null; limit: number; offset: number }
): Promise<{ items: InsightEditionDto[]; total: number }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })
  const viewer = viewerOf(grant.isInternal)

  const result = await listInsightEditions(undefined, {
    organizationId: grant.organizationId,
    reportId: scope.reportId ?? null,
    states: scope.states ?? null,
    // El cliente sólo lista ediciones de SU audiencia; un filtro `internal` se ignora en silencio.
    audience: grant.isInternal ? scope.audience ?? null : 'client',
    limit: scope.limit,
    offset: scope.offset
  })

  return { items: result.items.map(edition => projectEdition(edition, viewer)), total: result.total }
}

export const readInsightEdition = async (scope: ReaderScope & { editionId: string; includeEvidence?: boolean }) => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })
  const viewer = viewerOf(grant.isInternal)
  const edition = await getInsightEditionById(undefined, grant.organizationId, scope.editionId)

  if (!edition || !isEditionVisibleTo(edition, viewer)) throw new InsightsNotFoundError('edition', scope.editionId)

  const [snapshot, plan, history] = await Promise.all([
    scope.includeEvidence && canViewEvidence(edition, viewer) ? getInsightEvidenceSnapshotByEdition(undefined, grant.organizationId, edition.editionId) : null,
    scope.includeEvidence && canViewEvidence(edition, viewer) ? getInsightEditorialPlanByEdition(undefined, grant.organizationId, edition.editionId) : null,
    grant.isInternal ? listInsightEditionTransitions(undefined, grant.organizationId, edition.editionId) : null
  ])

  return {
    edition: projectEdition(edition, viewer),
    evidence: snapshot ? projectSnapshot(snapshot) : null,
    plan: plan ? projectPlan(plan, viewer) : null,
    history: history?.map(row => ({ transitionId: row.transitionId, fromState: row.fromState, toState: row.toState, requiresHumanGate: row.requiresHumanGate, actorKind: row.actorKind, reason: row.reason, createdAt: row.createdAt })) ?? null
  }
}

// TASK-1846 — readers del render durable (runs/outputs por edición y audiencia)
export { readInsightRenderRun, readInsightRenderRuns, type InsightOutputDto, type InsightRenderRunDto } from '../render/readers'
