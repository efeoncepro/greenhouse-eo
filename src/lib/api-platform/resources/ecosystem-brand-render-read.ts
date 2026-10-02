import 'server-only'

/** TASK-1921 — Ecosystem lane del render de marca, lecturas (no importa el command: ISSUE-177). */

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { readBrandRenderRequest, readBrandRenderRequests } from '@/lib/brand-surfaces/production/readers'

import { withBrandRenderErrors } from './brand-render-errors'
import { resolveBrandRenderEcosystemSubject } from './ecosystem-brand-render-scope'

export const getEcosystemBrandRenderRequestPayload = async ({ context, requestId }: { context: ApiPlatformRequestContext; requestId: string }) =>
  withBrandRenderErrors(async () => ({ data: await readBrandRenderRequest({ subject: resolveBrandRenderEcosystemSubject(context), requestId }) }))

export const listEcosystemBrandRenderRequestsPayload = async ({ context, request }: { context: ApiPlatformRequestContext; request: Request }) =>
  withBrandRenderErrors(async () => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '20')

    return { data: await readBrandRenderRequests({ subject: resolveBrandRenderEcosystemSubject(context), limit: Number.isFinite(limit) ? limit : 20 }) }
  })
