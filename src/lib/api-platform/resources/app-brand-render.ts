import 'server-only'

/**
 * TASK-1921 — App lane del render de piezas de marca (`/api/platform/app/brand-render/**`), commands. Adaptador delgado
 * sobre `requestBrandRender`: el actor es el usuario autenticado; la organización la resuelve el dominio (la de la marca)
 * y un `organizationId` distinto se responde como inexistente. Encolar es asíncrono: 202 (200 si el pedido ya existía).
 * Las lecturas viven en `app-brand-render-read.ts`, para que una ruta GET no cargue el command (sharp, mappers).
 */

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { requestBrandRender } from '@/lib/brand-surfaces/production/commands'
import { brandRenderRequestView } from '@/lib/brand-surfaces/production/readers'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'

import { withBrandRenderErrors } from './brand-render-errors'

export const requestAppBrandRender = async ({ context, body }: { context: AppPlatformRequestContext; body: unknown }) =>
  withBrandRenderErrors(async () => {
    const result = await requestBrandRender({ subject: buildTenantEntitlementSubject(context.tenant), body, actorKind: 'member' })

    return { data: { request: brandRenderRequestView(result.request, result.jobs), idempotent: result.idempotent }, status: result.idempotent ? 200 : 202 }
  })
