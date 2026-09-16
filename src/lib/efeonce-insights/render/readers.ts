import 'server-only'

/**
 * TASK-1846 — readers del render durable. Revalidan actor/target/módulo y proyectan por audiencia:
 * un cliente sólo ve runs de su audiencia; nunca los de un draft interno.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { assertInsightsAccess } from '../authz'
import type { InsightAudience } from '../contracts/request'
import { InsightsNotFoundError } from '../errors'

import type { InsightOutputRecord, InsightRenderRunRecord } from './contracts'
import { getInsightRenderRun, listInsightOutputsForRun, listInsightRenderRuns } from './store'

interface ReaderScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
}

export interface InsightRenderRunDto {
  renderRunId: string
  editionId: string
  audience: InsightAudience
  requestedOutputs: string[]
  state: InsightRenderRunRecord['state']
  startedAt: string | null
  finishedAt: string | null
  cancelledAt: string | null
  createdAt: string
  outputs: InsightOutputDto[]
}

export interface InsightOutputDto {
  insightOutputId: string
  output: string
  state: InsightOutputRecord['state']
  attempts: number
  failureCode: string | null
  /** Id del asset privado; la descarga autorizada llega con TASK-1848. Nunca una URL firmada acá. */
  outputAssetId: string | null
  manifestHash: string
  finishedAt: string | null
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)

const projectOutput = (o: InsightOutputRecord): InsightOutputDto => ({
  insightOutputId: o.insightOutputId,
  output: o.output,
  state: o.state,
  attempts: o.attempts,
  failureCode: o.failureCode,
  outputAssetId: o.outputAssetId,
  manifestHash: o.manifestHash,
  finishedAt: iso(o.finishedAt)
})

const projectRun = (run: InsightRenderRunRecord, outputs: InsightOutputRecord[]): InsightRenderRunDto => ({
  renderRunId: run.renderRunId,
  editionId: run.editionId,
  audience: run.audience,
  requestedOutputs: run.requestedOutputs,
  state: run.state,
  startedAt: iso(run.startedAt),
  finishedAt: iso(run.finishedAt),
  cancelledAt: iso(run.cancelledAt),
  createdAt: run.createdAt.toISOString(),
  outputs: outputs.map(projectOutput)
})

export const readInsightRenderRun = async (scope: ReaderScope & { renderRunId: string }): Promise<InsightRenderRunDto> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })
  const run = await getInsightRenderRun({ organizationId: grant.organizationId, renderRunId: scope.renderRunId })

  if (!run || !grant.allowedAudiences.includes(run.audience)) throw new InsightsNotFoundError('render_run', scope.renderRunId)

  return projectRun(run, await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId }))
}

export const readInsightRenderRuns = async (
  scope: ReaderScope & { editionId?: string | null; limit: number; offset: number }
): Promise<{ items: InsightRenderRunDto[]; total: number }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'read' })

  const result = await listInsightRenderRuns({
    organizationId: grant.organizationId,
    editionId: scope.editionId ?? null,
    // El cliente sólo lista runs de su audiencia; el interno los ve todos.
    audience: grant.isInternal ? null : 'client',
    limit: scope.limit,
    offset: scope.offset
  })

  const items = await Promise.all(
    result.items.map(async run => projectRun(run, await listInsightOutputsForRun({ organizationId: grant.organizationId, renderRunId: run.renderRunId })))
  )

  return { items, total: result.total }
}
