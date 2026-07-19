/**
 * TASK-1430 — modelo de presentación del cockpit de CTAs (browser-safe).
 *
 * Este archivo NO define reglas de negocio: los enums/metadata vienen del
 * contrato canónico (`src/lib/growth/ctas/contracts.ts`, browser-safe desde
 * TASK-1431) y acá solo se les asigna presentación (íconos/tonos) + el modelo
 * de borrador del authoring. La validación de verdad es server-side
 * (`authorDraftCta` + publish gate); el cliente solo anticipa.
 */
import {
  CTA_ACTION_KIND_METADATA,
  CTA_ACTION_KINDS,
  CTA_PLACEMENTS,
  isInterruptivePlacement,
  type CtaActionKind,
  type CtaPlacement,
} from '@/lib/growth/ctas/contracts'
import type { CtaRenderContractMirror } from '@/growth-cta-renderer/contract'
import { RENDERER_CONTRACT_VERSION } from '@/growth-cta-renderer/version'

export { CTA_ACTION_KIND_METADATA, CTA_ACTION_KINDS, CTA_PLACEMENTS, isInterruptivePlacement }
export type { CtaActionKind, CtaPlacement }

// ─── Semántica de intención (authoring; persiste en `purpose`) ────────────────

export const CTA_INTENT_KINDS = ['report_followup', 'lead_magnet', 'tool_continuation', 'meeting'] as const

export type CtaIntentKind = (typeof CTA_INTENT_KINDS)[number]

export const resolveIntentKind = (purpose: string | null | undefined): CtaIntentKind | null =>
  (CTA_INTENT_KINDS as readonly string[]).includes(purpose ?? '') ? (purpose as CtaIntentKind) : null

// ─── Presentación (íconos Tabler / tonos de chip) ─────────────────────────────

export const INTENT_ICON: Record<CtaIntentKind, string> = {
  report_followup: 'tabler-file-analytics',
  lead_magnet: 'tabler-magnet',
  tool_continuation: 'tabler-route',
  meeting: 'tabler-calendar-event',
}

export const PLACEMENT_ICON: Record<CtaPlacement, string> = {
  embedded: 'tabler-layout-grid-add',
  inline_banner: 'tabler-layout-align-middle',
  sticky_banner: 'tabler-layout-navbar',
  slide_in: 'tabler-layout-bottombar-expand',
  popup_modal: 'tabler-app-window',
  floating_button: 'tabler-circle-plus',
}

export const APPEARANCE_KINDS = ['default', 'spotlight', 'minimal'] as const

export type CtaAppearanceKind = (typeof APPEARANCE_KINDS)[number]

export const APPEARANCE_ICON: Record<CtaAppearanceKind, string> = {
  default: 'tabler-square',
  spotlight: 'tabler-sparkles',
  minimal: 'tabler-minus',
}

export const ACTION_ICON: Record<CtaActionKind, string> = {
  open_growth_form: 'tabler-forms',
  link_url: 'tabler-external-link',
  open_think_tool: 'tabler-tool',
  book_meeting: 'tabler-calendar-plus',
}

/** Compatible con GreenhouseChip.tone Y con statusTone del surface-system (sin `secondary`). */
export const STATUS_TONE: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  review: 'info',
  published: 'success',
  paused: 'warning',
  deprecated: 'default',
  archived: 'default',
}

// ─── Límites de contenido (espejo de `ctaContentSchema`; parity test dedicado) ─

export const CTA_CONTENT_LIMITS = {
  eyebrow: 80,
  headline: 200,
  body: 600,
  ctaLabel: 80,
  dismissLabel: 60,
  footnote: 200,
} as const

// ─── Modelo de borrador del authoring ─────────────────────────────────────────

export interface CtaAuthoringDraft {
  name: string
  intent: CtaIntentKind
  placement: CtaPlacement
  appearance: CtaAppearanceKind
  content: {
    eyebrow: string
    headline: string
    body: string
    ctaLabel: string
    dismissLabel: string
    footnote: string
  }
  hasAsset: boolean
  visualAssetRef: string
  actionKind: CtaActionKind
  /** Valor del campo requerido por el kind (url/formRef/toolPath/meetingUrl). */
  actionDestination: string
  actionNewContext: boolean
  targeting: {
    routes: string
    excludeRoutes: string
  }
  suppression: {
    dismissCooldownDays: number
    suppressAfterConversion: boolean
    maxImpressionsPerWindow: number
    windowHours: number
  }
}

export const newAuthoringDraft = (): CtaAuthoringDraft => ({
  name: '',
  intent: 'report_followup',
  placement: 'inline_banner',
  appearance: 'default',
  content: { eyebrow: '', headline: '', body: '', ctaLabel: '', dismissLabel: 'Ahora no', footnote: '' },
  hasAsset: false,
  visualAssetRef: '',
  actionKind: 'link_url',
  actionDestination: '',
  actionNewContext: false,
  targeting: { routes: '/**', excludeRoutes: '' },
  suppression: { dismissCooldownDays: 14, suppressAfterConversion: true, maxImpressionsPerWindow: 2, windowHours: 24 },
})

// ─── Tipos cliente del detail (JSON del GET admin: las fechas llegan string) ──

export interface CtaMetricWindowValueClient {
  current: number
  previous: number
  deltaPct: number | null
}

export interface CtaRateWindowValueClient {
  current: number | null
  previous: number | null
  deltaPp: number | null
}

export interface CtaMarketingMetricsClient {
  windowDays: number
  impressions: CtaMetricWindowValueClient
  clicks: CtaMetricWindowValueClient
  conversions: CtaMetricWindowValueClient
  ctr: CtaRateWindowValueClient
  conversionRate: CtaRateWindowValueClient
  coverage: 'ok' | 'impressions_undercounted'
  lastEventAt: string | null
}

export interface CtaVersionClient {
  ctaVersionId: string
  version: number
  status: string
  locale: string
  placement: string
  styleVariant: string | null
  content: unknown
  actionPolicy: unknown
  targetingPolicy: unknown
  suppressionPolicy: unknown
  priorityPolicy: unknown
  visualAssetRef: string | null
  publishedAt: string | null
  createdAt: string
}

export interface CtaSummaryClient {
  ctaId: string
  slug: string
  name: string
  purpose: string
  ownerTeam: string | null
  campaignSlug: string | null
  status: string
  defaultLocale: string
  latestVersion: number | null
  latestVersionId: string | null
  latestVersionStatus: string | null
  publishedVersionId: string | null
  latestPlacement: string | null
  latestStyleVariant: string | null
  latestActionKind: string | null
}

export interface CtaDetailClient {
  summary: CtaSummaryClient
  versions: CtaVersionClient[]
  conversion: Array<{ eventKind: string; trustLevel: string; total: number }>
  metrics: CtaMarketingMetricsClient | null
}

export interface CtaKillSwitchStateClient {
  globalKilled: boolean
  killedSurfaceIds: string[]
}

export interface CtaKillSwitchAuditClient {
  killEventId: string
  scope: string
  surfaceId: string | null
  action: string
  reason: string
  actorRef: string | null
  createdAt: string
}

export interface CtaCockpitCapabilities {
  canAuthor: boolean
  canPublish: boolean
  canPause: boolean
}

/** Shape mínimo de una versión del detail (el VM llega serializado por JSON). */
export interface CtaVersionLike {
  placement: string
  styleVariant: string | null
  content: unknown
  actionPolicy: unknown
  targetingPolicy: unknown
  visualAssetRef?: string | null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Draft desde la última versión (editar = versión nueva; publish deprecia la anterior). */
export const draftFromVersion = (
  summary: { name: string; purpose: string },
  version: CtaVersionLike,
  suppression?: Record<string, unknown> | null,
): CtaAuthoringDraft => {
  const content = asRecord(version.content)
  const action = asRecord(version.actionPolicy)
  const targeting = asRecord(version.targetingPolicy)
  const suppressionRecord = asRecord(suppression)

  const actionKind = (CTA_ACTION_KINDS as readonly string[]).includes(asString(action.kind))
    ? (asString(action.kind) as CtaActionKind)
    : 'link_url'

  const destinationField = CTA_ACTION_KIND_METADATA[actionKind].requiredPolicyFields[0]
  const visualAssetRef = asString((version as { visualAssetRef?: unknown }).visualAssetRef)

  return {
    name: summary.name,
    intent: resolveIntentKind(summary.purpose) ?? 'lead_magnet',
    placement: (CTA_PLACEMENTS as readonly string[]).includes(version.placement)
      ? (version.placement as CtaPlacement)
      : 'inline_banner',
    appearance: (APPEARANCE_KINDS as readonly string[]).includes(version.styleVariant ?? '')
      ? ((version.styleVariant ?? 'default') as CtaAppearanceKind)
      : 'default',
    content: {
      eyebrow: asString(content.eyebrow),
      headline: asString(content.headline),
      body: asString(content.body),
      ctaLabel: asString(content.ctaLabel),
      dismissLabel: asString(content.dismissLabel) || 'Ahora no',
      footnote: asString(content.footnote),
    },
    hasAsset: visualAssetRef.length > 0,
    visualAssetRef,
    actionKind,
    actionDestination: destinationField ? asString(action[destinationField]) : '',
    actionNewContext: action.openInNewContext === true,
    targeting: {
      routes: Array.isArray(targeting.routes) ? (targeting.routes as string[]).join(', ') : '/**',
      excludeRoutes: Array.isArray(targeting.excludeRoutes) ? (targeting.excludeRoutes as string[]).join(', ') : '',
    },
    suppression: {
      dismissCooldownDays: Number(suppressionRecord.dismissCooldownDays ?? 14),
      suppressAfterConversion: suppressionRecord.suppressAfterConversion !== false,
      maxImpressionsPerWindow: Number(suppressionRecord.maxImpressionsPerWindow ?? 2),
      windowHours: Number(suppressionRecord.windowHours ?? 24),
    },
  }
}

// ─── Builders: payload del command + contrato de preview ──────────────────────

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const splitGlobs = (value: string): string[] =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

/** Payload para `POST /api/admin/growth/ctas` (el server re-valida todo). */
export const buildAuthorPayload = (draft: CtaAuthoringDraft, existingSlug: string | null) => {
  const destinationField = CTA_ACTION_KIND_METADATA[draft.actionKind].requiredPolicyFields[0]
  const actionPolicy: Record<string, unknown> = { kind: draft.actionKind }

  if (destinationField) actionPolicy[destinationField] = draft.actionDestination.trim()
  if (draft.actionKind !== 'open_growth_form') actionPolicy.openInNewContext = draft.actionNewContext

  const content: Record<string, unknown> = {
    headline: draft.content.headline.trim(),
    ctaLabel: draft.content.ctaLabel.trim(),
  }

  if (draft.content.eyebrow.trim()) content.eyebrow = draft.content.eyebrow.trim()
  if (draft.content.body.trim()) content.body = draft.content.body.trim()
  if (draft.content.dismissLabel.trim()) content.dismissLabel = draft.content.dismissLabel.trim()
  if (draft.content.footnote.trim()) content.footnote = draft.content.footnote.trim()

  return {
    slug: existingSlug ?? slugify(draft.name),
    name: draft.name.trim(),
    purpose: draft.intent,
    placement: draft.placement,
    styleVariant: draft.appearance,
    content,
    visualAssetRef: draft.hasAsset && draft.visualAssetRef.trim() ? draft.visualAssetRef.trim() : null,
    actionPolicy,
    targetingPolicy: {
      routes: splitGlobs(draft.targeting.routes).length > 0 ? splitGlobs(draft.targeting.routes) : ['/**'],
      excludeRoutes: splitGlobs(draft.targeting.excludeRoutes),
    },
    suppressionPolicy: { ...draft.suppression },
  }
}

export type PreviewContentMode = 'nominal' | 'long' | 'minimal'

const LONG_SUFFIX = ' — con una promesa localizada más larga para probar el wrapping en densidades compactas'

/**
 * Contrato de preview desde el draft: MISMO shape que el público (mirror), ids
 * de preview e inert por diseño. El destino navigate usa el valor autorado tal
 * cual solo para el preview — la resolución real (host del hub, validaciones)
 * es server-side en el registry.
 */
export const buildPreviewContract = (
  draft: CtaAuthoringDraft,
  mode: PreviewContentMode,
  assetPresent: boolean,
): CtaRenderContractMirror => {
  const headline = draft.content.headline.trim() || 'Título del CTA'
  const metadata = CTA_ACTION_KIND_METADATA[draft.actionKind]

  const action: CtaRenderContractMirror['action'] =
    metadata.executionFamily === 'growth_form'
      ? { kind: 'open_growth_form', formSlug: draft.actionDestination.trim() || 'preview-form' }
      : {
          kind: draft.actionKind as Exclude<CtaActionKind, 'open_growth_form'>,
          href:
            draft.actionKind === 'open_think_tool'
              ? `https://think.efeoncepro.com${draft.actionDestination.trim() || '/'}`
              : draft.actionDestination.trim() || '/',
          newContext: draft.actionNewContext,
        }

  return {
    contractVersion: RENDERER_CONTRACT_VERSION,
    cta: {
      ctaId: 'cdef-preview-draft',
      slug: 'preview-draft',
      campaignSlug: null,
      ctaVersionId: 'cver-preview-draft',
      version: 1,
      locale: 'es-CL',
    },
    placement: draft.placement,
    interruptive: isInterruptivePlacement(draft.placement),
    styleVariant: draft.appearance,
    content: {
      eyebrow: mode === 'minimal' ? undefined : draft.content.eyebrow.trim() || undefined,
      headline: mode === 'long' ? `${headline}${LONG_SUFFIX}` : headline,
      body:
        mode === 'minimal'
          ? undefined
          : mode === 'long'
            ? `${draft.content.body.trim()} ${draft.content.body.trim()}`.trim() || undefined
            : draft.content.body.trim() || undefined,
      ctaLabel: draft.content.ctaLabel.trim() || 'Acción',
      dismissLabel: draft.content.dismissLabel.trim() || 'Cerrar',
      footnote: mode === 'minimal' ? undefined : draft.content.footnote.trim() || undefined,
    },
    action,
    visualAssetRef: assetPresent && draft.hasAsset ? draft.visualAssetRef.trim() || undefined : undefined,
    variantId: 'preview',
    surfacePolicy: { surfaceId: 'csur-preview', allowedOrigins: [], rendererChannel: 'preview' },
  }
}
