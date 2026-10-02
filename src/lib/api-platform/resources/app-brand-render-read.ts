import 'server-only'

/**
 * TASK-1921 — App lane del render de piezas de marca, lecturas. No importa el command (ISSUE-177: una ruta GET no
 * carga lo que no lee).
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { readBrandRenderRequest, readBrandRenderRequests } from '@/lib/brand-surfaces/production/readers'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'

import { withBrandRenderErrors } from './brand-render-errors'

export const getAppBrandRenderRequest = async ({ context, requestId }: { context: AppPlatformRequestContext; requestId: string }) =>
  withBrandRenderErrors(async () => ({ data: await readBrandRenderRequest({ subject: buildTenantEntitlementSubject(context.tenant), requestId }) }))

export const listAppBrandRenderRequests = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) =>
  withBrandRenderErrors(async () => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '20')

    return { data: await readBrandRenderRequests({ subject: buildTenantEntitlementSubject(context.tenant), limit: Number.isFinite(limit) ? limit : 20 }) }
  })
