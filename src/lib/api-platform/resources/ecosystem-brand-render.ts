import 'server-only'

/**
 * TASK-1921 — Ecosystem lane del render de marca, commands. Mismo command que el App lane (`requestBrandRender`); el
 * actor es `agent` (una máquina encola, nunca aprueba ni publica). Las fuentes se referencian por `assetId` ya subido por
 * el uploader canónico: este lane no sube archivos.
 */

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { requestBrandRender } from '@/lib/brand-surfaces/production/commands'
import { brandRenderRequestView } from '@/lib/brand-surfaces/production/readers'

import { withBrandRenderErrors } from './brand-render-errors'
import { resolveBrandRenderEcosystemSubject } from './ecosystem-brand-render-scope'

export const requestEcosystemBrandRenderPayload = async ({ context, body }: { context: ApiPlatformRequestContext; body: unknown }) =>
  withBrandRenderErrors(async () => {
    const subject = resolveBrandRenderEcosystemSubject(context)
    const result = await requestBrandRender({ subject, body, actorKind: 'agent' })

    return { data: { request: brandRenderRequestView(result.request, result.jobs), idempotent: result.idempotent }, status: result.idempotent ? 200 : 202 }
  })
