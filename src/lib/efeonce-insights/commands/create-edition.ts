import 'server-only'

/**
 * TASK-1845 — `createEdition` / `reviseEdition` (commands canónicos; UI/API/MCP son adapters).
 * Idempotencia: misma key + mismo encargo ⇒ misma edición; misma key + encargo distinto ⇒
 * conflicto. Estado + historial + outbox en UNA transacción; la generación corre después del
 * commit (por fases, cada una atómica) salvo `deferGeneration` (TASK-1846 la moverá al worker).
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertAudienceAllowed, assertInsightsAccess } from '../authz'
import { InsightsGenerationDisabledError, InsightsIdempotencyConflictError, InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { publishInsightEditionCreated, publishInsightReportCreated } from '../events'
import { isInsightsGenerationEnabled } from '../flags'
import { hashCanonical } from '../request-hash'
import { findInsightEditionByIdempotencyKey, getInsightEditionById, insertInsightEdition } from '../stores/edition-store'
import type { InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { insertInsightReport, lockInsightReport } from '../stores/report-store'
import { runInsightGeneration, type RunGenerationResult } from './generation'
import { validateInsightRequest } from './validate-request'

export interface CreateInsightEditionInput {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  /** Encargo crudo (InsightRequestV1 sin actor); se valida aquí. */
  request: unknown
  /** Revisar: nueva versión sobre un reporte existente. */
  reportId?: string | null
  supersedesEditionId?: string | null
  deferGeneration?: boolean
  env?: NodeJS.ProcessEnv
}

export interface CreateInsightEditionResult {
  report: InsightReportRecord
  edition: InsightEditionRecord
  idempotent: boolean
  generation: RunGenerationResult | null
}

const stripIdempotency = (request: InsightEditionRecord['request']) => {
  const rest = { ...request }

  delete rest.idempotencyKey

  return rest
}

export const createInsightEdition = async (input: CreateInsightEditionInput): Promise<CreateInsightEditionResult> => {
  if (!isInsightsGenerationEnabled(input.env)) throw new InsightsGenerationDisabledError()

  const grant = await assertInsightsAccess({ subject: input.subject, actorOrganizationId: input.actorOrganizationId, organizationId: input.organizationId, need: 'create' })
  const { request } = validateInsightRequest(input.request, { organizationId: grant.organizationId, allowedAudiences: grant.allowedAudiences })

  assertAudienceAllowed(grant, request.audience)

  const requestHash = hashCanonical(stripIdempotency(request))

  if (request.idempotencyKey) {
    const existing = await findInsightEditionByIdempotencyKey(undefined, grant.organizationId, request.idempotencyKey)

    if (existing) {
      if (existing.requestHash !== requestHash) throw new InsightsIdempotencyConflictError(request.idempotencyKey, existing.editionId)

      const { getInsightReportById } = await import('../stores/report-store')
      const report = await getInsightReportById(undefined, grant.organizationId, existing.reportId)

      return { report: report!, edition: existing, idempotent: true, generation: null }
    }
  }

  const created = await withGreenhousePostgresTransaction(async client => {
    let report: InsightReportRecord | null = null

    if (input.reportId) {
      report = await lockInsightReport(client, grant.organizationId, input.reportId)
      if (!report) throw new InsightsNotFoundError('report', input.reportId)
    } else {
      report = await insertInsightReport(client, {
        organizationId: grant.organizationId,
        title: request.title ?? `Insights ${request.modules.join('+')} ${request.period.start}–${request.period.endExclusive}`,
        purpose: request.purpose ?? 'Edición generada desde el encargo',
        actor: grant.actor
      })
      await lockInsightReport(client, grant.organizationId, report.reportId)
      await publishInsightReportCreated(client, { version: 1, reportId: report.reportId, reportCode: report.reportCode, organizationId: report.organizationId, actorKind: grant.actor.kind })
    }

    if (input.supersedesEditionId) {
      const previous = await getInsightEditionById(client, grant.organizationId, input.supersedesEditionId)

      if (!previous || previous.reportId !== report.reportId) throw new InsightsNotFoundError('edition', input.supersedesEditionId)
    }

    const windows = validateInsightRequest(request, { organizationId: grant.organizationId, allowedAudiences: grant.allowedAudiences }).windows

    const edition = await insertInsightEdition(client, {
      reportId: report.reportId,
      organizationId: grant.organizationId,
      audience: request.audience,
      request,
      requestHash,
      idempotencyKey: request.idempotencyKey ?? null,
      modules: request.modules,
      outputs: request.outputs,
      periodTimeZone: request.period.timeZone,
      periodStartUtc: windows.current.startUtc,
      periodEndUtc: windows.current.endUtc,
      supersedesEditionId: input.supersedesEditionId ?? null,
      actor: grant.actor
    })

    await publishInsightEditionCreated(client, {
      version: 1,
      editionId: edition.editionId,
      reportId: report.reportId,
      organizationId: edition.organizationId,
      editionVersion: edition.version,
      audience: edition.audience,
      modules: edition.modules,
      outputs: edition.outputs,
      periodStartUtc: edition.periodStartUtc,
      periodEndUtc: edition.periodEndUtc,
      requestHash,
      supersedesEditionId: edition.supersedesEditionId,
      actorKind: grant.actor.kind
    })

    return { report, edition }
  })

  const generation = input.deferGeneration ? null : await runInsightGeneration(created.edition)

  return { report: created.report, edition: generation?.edition ?? created.edition, idempotent: false, generation }
}

export interface ReviseInsightEditionInput extends Omit<CreateInsightEditionInput, 'reportId' | 'supersedesEditionId'> {
  editionId: string
}

/** Corregir = versión nueva del mismo reporte (la anterior nunca muta; si estaba emitida sigue emitida). */
export const reviseInsightEdition = async (input: ReviseInsightEditionInput): Promise<CreateInsightEditionResult> => {
  const previous = await getInsightEditionById(undefined, input.organizationId, input.editionId)

  if (!previous) throw new InsightsNotFoundError('edition', input.editionId)
  if (previous.state === 'withdrawn') throw new InsightsNotReadyError('Una edición retirada no se revisa; crea un encargo nuevo', { editionId: input.editionId })

  return createInsightEdition({ ...input, reportId: previous.reportId, supersedesEditionId: previous.editionId })
}
