/**
 * TASK-1339 — Growth CTA engine: compiler del render contract (browser-safe).
 *
 * Compila una `cta_version` + su definición en el contrato que cruza al browser.
 * Frontera dura (arch §9.2/§16): NUNCA salen targeting, priority, suppression,
 * analytics/experiment policy, notas internas ni PII — solo contenido, placement,
 * acción resuelta y surface policy. El zod schema del contrato es el enforcement
 * (strip por construcción: el objeto se construye campo a campo, no por spread).
 */
import 'server-only'

import {
  CTA_CONTRACT_VERSION,
  type CtaPlacement,
  type CtaRenderAction,
  type CtaRenderContract,
  ctaContentSchema,
  ctaRenderContractSchema,
  isInterruptivePlacement,
} from './contracts'
import type { CtaPublishedCandidateRow, CtaSurfaceBindingRow } from './store'

export interface CompileCtaResult {
  renderContract: CtaRenderContract | null
  /** Razones que bloquean publicación/render (contenido inválido, placement desconocido…). */
  blockingReasons: string[]
}

/**
 * Compila la versión a render contract. `resolvedAction` viene del action router
 * (la relación con Growth Forms ya resuelta server-side); si la acción no resuelve,
 * el caller NO llama compile (el candidato se descarta / la publicación se bloquea).
 */
export const compileCtaVersion = (
  candidate: CtaPublishedCandidateRow,
  surface: CtaSurfaceBindingRow,
  resolvedAction: CtaRenderAction,
): CompileCtaResult => {
  const blockingReasons: string[] = []

  const content = ctaContentSchema.safeParse(candidate.content_json ?? {})

  if (!content.success) {
    blockingReasons.push('content_invalid')

    return { renderContract: null, blockingReasons }
  }

  const origins = Array.isArray(surface.origin_allowlist_json)
    ? (surface.origin_allowlist_json as string[])
    : []

  const contract = ctaRenderContractSchema.safeParse({
    contractVersion: CTA_CONTRACT_VERSION,
    cta: {
      ctaId: candidate.cta_id,
      slug: candidate.slug,
      campaignSlug: candidate.campaign_slug,
      ctaVersionId: candidate.cta_version_id,
      version: candidate.version,
      locale: candidate.locale,
    },
    placement: candidate.placement,
    interruptive: isInterruptivePlacement(candidate.placement as CtaPlacement),
    styleVariant: candidate.style_variant ?? undefined,
    content: content.data,
    action: resolvedAction,
    visualAssetRef: candidate.visual_asset_ref ?? undefined,
    variantId: 'control',
    surfacePolicy: {
      surfaceId: surface.surface_id,
      allowedOrigins: origins,
      rendererChannel: surface.renderer_channel,
    },
  })

  if (!contract.success) {
    blockingReasons.push('contract_invalid')

    return { renderContract: null, blockingReasons }
  }

  return { renderContract: contract.data, blockingReasons }
}
