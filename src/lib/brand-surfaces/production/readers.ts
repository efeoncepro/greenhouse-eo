import 'server-only'

/**
 * TASK-1921 — readers del render de piezas de marca. Mismo gate que el command (interno + capability de lectura +
 * organización de la marca). Devuelven el estado y, por cada salida lista, su enlace de descarga por el proxy
 * autenticado del asset store (nunca una URL del bucket). No exponen el plan, las rutas de las fuentes ni la procedencia
 * cruda más allá de sus hashes.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'

import { assertBrandRenderAccess } from './authz'
import { BrandRenderNotFoundError } from './errors'
import { getBrandRenderRequest, listBrandRenderJobs, listBrandRenderRequests, type BrandRenderJobRecord, type BrandRenderRequestRecord } from './store'

export interface BrandRenderJobView {
  jobId: string
  catalogName: string
  outputTarget: string
  state: string
  attempts: number
  maxAttempts: number
  failureCode: string | null
  outputs: { assetId: string; downloadUrl: string }[]
  finishedAt: string | null
}

export interface BrandRenderRequestView {
  requestId: string
  family: string
  state: string
  summary: Record<string, unknown>
  axisVersions: Record<string, string>
  requestedByKind: string
  createdAt: string
  finishedAt: string | null
  jobs: BrandRenderJobView[]
}

const jobView = (job: BrandRenderJobRecord): BrandRenderJobView => ({
  jobId: job.jobId,
  catalogName: job.catalogName,
  outputTarget: job.outputTarget,
  state: job.state,
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  failureCode: job.failureCode,
  outputs: job.state === 'completed' ? job.outputAssetIds.map((assetId) => ({ assetId, downloadUrl: buildPrivateAssetDownloadUrl(assetId) })) : [],
  finishedAt: job.finishedAt
})

const requestView = (request: BrandRenderRequestRecord, jobs: BrandRenderJobRecord[]): BrandRenderRequestView => ({
  requestId: request.requestId,
  family: request.family,
  state: request.state,
  summary: request.summary,
  axisVersions: request.axisVersions,
  requestedByKind: request.requestedByKind,
  createdAt: request.createdAt,
  finishedAt: request.finishedAt,
  jobs: jobs.map(jobView)
})

export const readBrandRenderRequest = async (input: { subject: TenantEntitlementSubject; requestId: string }): Promise<BrandRenderRequestView> => {
  const grant = await assertBrandRenderAccess({ subject: input.subject, need: 'read' })
  const request = await getBrandRenderRequest(grant.organizationId, input.requestId)

  if (!request) throw new BrandRenderNotFoundError('brand_render_request', input.requestId)

  return requestView(request, await listBrandRenderJobs(request.requestId))
}

export const readBrandRenderRequests = async (input: { subject: TenantEntitlementSubject; limit?: number }): Promise<BrandRenderRequestView[]> => {
  const grant = await assertBrandRenderAccess({ subject: input.subject, need: 'read' })
  const requests = await listBrandRenderRequests(grant.organizationId, input.limit)

  return Promise.all(requests.map(async (request) => requestView(request, await listBrandRenderJobs(request.requestId))))
}

/** Vista de lo que devolvió el command (misma forma que el reader, sin releer). */
export const brandRenderRequestView = requestView
