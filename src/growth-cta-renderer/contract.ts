/**
 * TASK-1340 — Growth CTA renderer: espejo browser-safe del render contract.
 *
 * SOLO TIPOS. Cero zod, cero imports de server code — este archivo entra al bundle
 * público. SSOT del shape: `src/lib/growth/ctas/contracts.ts` (TASK-1339,
 * `greenhouse-growth-cta-popup.v1`). El drift se atrapa con el parity test por
 * asignabilidad compile-time (`src/lib/growth/ctas/__tests__/renderer-contract-parity.test.ts`).
 *
 * Frontera dura: este espejo NUNCA contiene targeting, priority, suppression,
 * analytics/experiment policy, notas de campaña ni PII — el browser recibe el
 * resultado YA arbitrado (arch §11/§20).
 */

export type CtaPlacementMirror =
  | 'embedded'
  | 'inline_banner'
  | 'sticky_banner'
  | 'slide_in'
  | 'popup_modal'
  | 'floating_button'

export interface CtaContentMirror {
  eyebrow?: string
  headline: string
  body?: string
  ctaLabel: string
  dismissLabel?: string
  footnote?: string
}

export interface CtaRenderOpenGrowthFormActionMirror {
  kind: 'open_growth_form'
  formSlug: string
  formKey?: string
}

/** Kinds de la familia `navigate` (TASK-1431) — espejo de `CTA_NAVIGATE_ACTION_KINDS`. */
export type CtaNavigateActionKindMirror = 'link_url' | 'open_think_tool' | 'book_meeting'

/**
 * Acción de navegación YA resuelta server-side (TASK-1431): href validado (https
 * absoluta o path root-relative) + hint de contexto. El executor re-valida el href
 * (defensa en profundidad) y falla closed ante cualquier cosa fuera del contrato.
 */
export interface CtaRenderNavigateActionMirror {
  kind: CtaNavigateActionKindMirror
  href: string
  newContext: boolean
}

export type CtaRenderActionMirror = CtaRenderOpenGrowthFormActionMirror | CtaRenderNavigateActionMirror

export interface CtaRenderContractMirror {
  contractVersion: string
  cta: {
    ctaId: string
    slug: string
    campaignSlug: string | null
    ctaVersionId: string
    version: number
    locale: string
  }
  placement: CtaPlacementMirror
  interruptive: boolean
  styleVariant?: string
  content: CtaContentMirror
  action: CtaRenderActionMirror
  visualAssetRef?: string
  variantId: string
  surfacePolicy: {
    surfaceId: string
    allowedOrigins: string[]
    rendererChannel: 'stable' | 'beta' | 'preview'
  }
}

/**
 * Respuesta del GET público de render (0–1 interruptivo + N no-interruptivos, ya resueltos).
 * `engineState` (TASK-1428, aditivo): `killed` = retiro operativo (§16.3) — el renderer
 * no monta NADA (nunca un falso `dismissed`); ausente = `ok` (compat).
 */
export interface ArbitratedRenderResultMirror {
  interruptive: CtaRenderContractMirror | null
  nonInterruptive: CtaRenderContractMirror[]
  engineState?: 'ok' | 'killed'
}
