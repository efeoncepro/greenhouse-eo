/**
 * TASK-1339 — Growth CTA engine: readers canónicos (read path gobernado).
 *
 * El read público sale de acá YA ARBITRADO (0–1 interruptivo + N no-interruptivos)
 * y browser-safe — nunca el candidate set ni la política (arch §11/§20). Los
 * listados admin alimentan el cockpit futuro, Nexa/MCP y CLI sobre el mismo
 * primitive (Full API Parity).
 */
import 'server-only'

import { verifyEmbedKeySecret } from '@/lib/growth/forms/embed-key'

import { captureWithDomain } from '@/lib/observability/capture'

import { resolveCtaAction } from './action-router'
import { arbitrateCandidates, isRouteEligible, resolvePriorityScore, type ArbiterCandidate } from './arbiter'
import type { ArbitratedRenderResult, CtaSuppressionDecision, CtaVisitorContext } from './contracts'
import {
  getFirstViewedBucketAt,
  recordCtaExposureBatch,
  summarizeViewedExposureWindows,
  type RecordExposureInput,
} from './exposure'
import {
  isCtaEngineEnabled,
  isCtaSuppressionEnforcementEnabled,
  resolveCtaGlobalInterruptiveCapPerDay,
} from './flags'
import { getKillSwitchState } from './kill-switch'
import { compileCtaVersion } from './render-contract'
import {
  type CtaConversionSummary,
  type CtaDefinitionRow,
  type CtaVersionRow,
  getCtaDefinitionById,
  getLastAcceptedEventAt,
  getSurfaceBindingById,
  listCtaDefinitions,
  listPublishedCandidates,
  listSurfaceBindings,
  listVersionsForCta,
  recordServerErrorEventOncePerDay,
  summarizeAlignedEventCounts,
  summarizeConversionEventWindows,
  summarizeConversionEvents,
} from './store'
import { evaluateCtaSuppression, parseSuppressionPolicy } from './suppression'
import {
  claimInterruptiveImpression,
  getVisitorStateRows,
  mergeGlobalWindows,
  mergeStateSnapshots,
  resolveVisitorSubjects,
} from './visitor-state'

// ─── Public: render contract arbitrado ────────────────────────────────────────

export type PublicRenderOutcome =
  | { outcome: 'ok'; result: ArbitratedRenderResult }
  | { outcome: 'disabled' }
  | { outcome: 'surface_unauthorized' }

export interface GetArbitratedRenderInput {
  surfaceId: string
  embedKey: string | null
  origin: string | null
  route: string
  /** TASK-1428: contexto pseudónimo opcional (headers) — sin él aplica el fallback conservador. */
  visitorContext?: CtaVisitorContext
}

/**
 * Read público del renderer: valida surface + embed key + origin, honra el kill
 * switch (arch §16.3 — SIEMPRE enforced, gana sobre eligibility y cache local),
 * evalúa targeting + suppression server-side (shadow u enforcement según flag) y
 * arbitra. Un CTA cuya acción ya no resuelve (form despublicado) se EXCLUYE del
 * render y deja breadcrumb `form_handoff_failed` (dedupe 1/día) — el visitante
 * nunca ve un prompt roto. Toda exposición (eligible/suppressed) va a Tier B
 * fire-and-forget (fail-open: analytics jamás bloquea el render).
 */
export const getArbitratedRenderContracts = async (
  input: GetArbitratedRenderInput,
): Promise<PublicRenderOutcome> => {
  if (!isCtaEngineEnabled()) return { outcome: 'disabled' }

  const surface = await getSurfaceBindingById(input.surfaceId)

  if (!surface || surface.status !== 'active') return { outcome: 'surface_unauthorized' }

  if (!verifyEmbedKeySecret(input.embedKey, surface.embed_key_hash)) {
    return { outcome: 'surface_unauthorized' }
  }

  const origins = Array.isArray(surface.origin_allowlist_json) ? (surface.origin_allowlist_json as string[]) : []

  if (!input.origin || !origins.includes(input.origin)) return { outcome: 'surface_unauthorized' }

  // Kill switch (§16.3): produce `killed`, nunca un falso vacío indistinguible.
  const killState = await getKillSwitchState()
  const surfaceKilled = killState.killedSurfaceIds.includes(surface.surface_id)

  if (killState.globalKilled || surfaceKilled) {
    recordCtaExposureBatch([
      {
        ctaId: null,
        surfaceId: surface.surface_id,
        placement: null,
        exposureKind: 'suppressed',
        reasonClass: killState.globalKilled ? 'global_killed' : 'surface_killed',
        decisionSource: 'server',
        enforced: true,
      },
    ])

    return { outcome: 'ok', result: { interruptive: null, nonInterruptive: [], engineState: 'killed' } }
  }

  const allowedSlugs = Array.isArray(surface.allowed_cta_slugs_json)
    ? (surface.allowed_cta_slugs_json as string[])
    : []

  const candidates = await listPublishedCandidates(allowedSlugs.length > 0 ? allowedSlugs : null)
  const eligible = candidates.filter(candidate => isRouteEligible(candidate.targeting_policy_json, input.route))

  interface CompiledCandidate extends ArbiterCandidate {
    ctaId: string
    suppressionPolicyJson: unknown
    decision: CtaSuppressionDecision
  }

  const compiled: CompiledCandidate[] = []

  for (const candidate of eligible) {
    const action = await resolveCtaAction(candidate.action_policy_json)

    if (!action.ok) {
      try {
        await recordServerErrorEventOncePerDay({
          ctaId: candidate.cta_id,
          ctaVersionId: candidate.cta_version_id,
          surfaceId: surface.surface_id,
          reason: 'form_handoff_failed',
        })
      } catch {
        // best-effort: el breadcrumb nunca rompe el read path (Sentry lo cubre en la route).
      }

      continue
    }

    const { renderContract } = compileCtaVersion(candidate, surface, action.action)

    if (!renderContract) continue

    compiled.push({
      renderContract,
      priorityScore: resolvePriorityScore(candidate.priority_policy_json),
      ctaId: candidate.cta_id,
      suppressionPolicyJson: candidate.suppression_policy_json,
      decision: { outcome: 'eligible', reason: null },
    })
  }

  // ── Suppression server-side (TASK-1428): shadow (default) u enforcement por flag ──
  const enforcement = isCtaSuppressionEnforcementEnabled()
  const subjects = resolveVisitorSubjects(input.visitorContext)
  const now = new Date()
  const exposures: RecordExposureInput[] = []

  if (compiled.length > 0) {
    const stateRows =
      subjects.length > 0 ? await getVisitorStateRows(subjects, compiled.map(candidate => candidate.ctaId)) : []

    const globalWindow = mergeGlobalWindows(stateRows)
    const globalCap = resolveCtaGlobalInterruptiveCapPerDay()

    for (const candidate of compiled) {
      const perCtaRows = stateRows.filter(row => row.cta_id === candidate.ctaId)

      candidate.decision = evaluateCtaSuppression({
        policyJson: candidate.suppressionPolicyJson,
        interruptive: candidate.renderContract.interruptive,
        hasSubject: subjects.length > 0,
        state: mergeStateSnapshots(perCtaRows),
        globalWindow,
        globalInterruptiveCapPerDay: globalCap,
        now,
      })
    }
  }

  const survivors = enforcement ? compiled.filter(candidate => candidate.decision.outcome === 'eligible') : compiled

  const result = arbitrateCandidates(survivors)

  // Colisión de prioridad: interruptivos elegibles que perdieron el arbitraje
  // (fuente del signal growth.cta.priority_collision; se registra en ambos modos).
  const interruptiveEligible = compiled.filter(
    candidate => candidate.renderContract.interruptive && candidate.decision.outcome === 'eligible',
  )

  for (const loser of interruptiveEligible) {
    if (result.interruptive && loser.renderContract.cta.ctaId !== result.interruptive.cta.ctaId) {
      loser.decision = { outcome: 'suppressed', reason: 'higher_priority_selected' }
    }
  }

  // Claim atómico de la exposición interruptiva (solo enforcement: de N renders
  // concurrentes exactamente uno gana; task §Frequency and re-entry semantics).
  if (enforcement && result.interruptive && subjects.length > 0) {
    const winner = compiled.find(candidate => candidate.renderContract.cta.ctaId === result.interruptive?.cta.ctaId)
    const policy = winner ? parseSuppressionPolicy(winner.suppressionPolicyJson) : null

    if (winner && policy) {
      const claim = await claimInterruptiveImpression({
        subject: subjects[0],
        ctaId: winner.ctaId,
        windowHours: policy.windowHours,
        maxImpressionsPerWindow: policy.maxImpressionsPerWindow,
        globalCapPerDay: resolveCtaGlobalInterruptiveCapPerDay(),
        consentState: input.visitorContext?.consentState ?? 'unknown',
      })

      if (!claim.granted) {
        winner.decision = { outcome: 'capped', reason: 'frequency_capped' }
        result.interruptive = null
      }
    } else {
      // Sin policy parseable el candidato jamás llega acá en enforcement (fail-closed).
      result.interruptive = null
    }
  }

  for (const candidate of compiled) {
    exposures.push({
      ctaId: candidate.ctaId,
      surfaceId: surface.surface_id,
      placement: candidate.renderContract.placement,
      exposureKind: candidate.decision.outcome === 'eligible' ? 'eligible' : 'suppressed',
      reasonClass: candidate.decision.reason,
      decisionSource: 'server',
      enforced: enforcement,
    })
  }

  recordCtaExposureBatch(exposures)

  return { outcome: 'ok', result: { ...result, engineState: 'ok' } }
}

// ─── Admin readers ────────────────────────────────────────────────────────────

export interface CtaSummaryVm {
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
  /** TASK-1430: ejes de la última versión para inventario del cockpit (filtros/íconos). */
  latestPlacement: string | null
  latestStyleVariant: string | null
  latestActionKind: string | null
}

const toSummaryVm = (definition: CtaDefinitionRow, versions: CtaVersionRow[]): CtaSummaryVm => {
  const latest = versions[0] ?? null
  const published = versions.find(version => version.status === 'published') ?? null

  const actionPolicy =
    latest?.action_policy_json && typeof latest.action_policy_json === 'object'
      ? (latest.action_policy_json as Record<string, unknown>)
      : null

  return {
    ctaId: definition.cta_id,
    slug: definition.slug,
    name: definition.name,
    purpose: definition.purpose,
    ownerTeam: definition.owner_team,
    campaignSlug: definition.campaign_slug,
    status: definition.status,
    defaultLocale: definition.default_locale,
    latestVersion: latest?.version ?? null,
    latestVersionId: latest?.cta_version_id ?? null,
    latestVersionStatus: latest?.status ?? null,
    publishedVersionId: published?.cta_version_id ?? null,
    latestPlacement: latest?.placement ?? null,
    latestStyleVariant: latest?.style_variant ?? null,
    latestActionKind: typeof actionPolicy?.kind === 'string' ? actionPolicy.kind : null,
  }
}

export const listCtasAdmin = async (): Promise<CtaSummaryVm[]> => {
  const definitions = await listCtaDefinitions()
  const summaries: CtaSummaryVm[] = []

  for (const definition of definitions) {
    const versions = await listVersionsForCta(definition.cta_id)

    summaries.push(toSummaryVm(definition, versions))
  }

  return summaries
}

export interface CtaVersionVm {
  ctaVersionId: string
  version: number
  status: string
  locale: string
  placement: string
  styleVariant: string | null
  content: unknown
  actionPolicy: unknown
  targetingPolicy: unknown
  /** TASK-1430: la postura de supresión autorada viaja al cockpit (editar = versión nueva la preserva). */
  suppressionPolicy: unknown
  priorityPolicy: unknown
  visualAssetRef: string | null
  publishedAt: Date | null
  createdAt: Date
}

// ─── Métricas de marketing (TASK-1430, instrucción del operador) ─────────────

/** Conteo por ventana con variación % ventana-a-ventana (null si la previa fue 0). */
export interface CtaMetricWindowValue {
  current: number
  previous: number
  deltaPct: number | null
}

/** Rate 0–1 por ventana con delta en puntos porcentuales (null si el denominador es 0). */
export interface CtaRateWindowValue {
  current: number | null
  previous: number | null
  deltaPp: number | null
}

/**
 * Métricas de marketing de un CTA, resueltas ÍNTEGRAMENTE server-side (la UI
 * jamás deriva rates/deltas — regla de la task). Fuentes y trust:
 * - `impressions` = rollup Tier B `viewed` (browser-observed, agregado horario).
 * - `clicks` = ledger Tier A `clicked` accepted (`browser_reported`).
 * - `conversions` = ledger `form_submitted`/`action_completed` con
 *   `trust_level='server_confirmed'` (la ÚNICA verdad de conversión; los
 *   breadcrumbs `error` server_confirmed jamás cuentan).
 * - `ctr` = clicks/impressions (browser-derived) · `conversionRate` =
 *   conversions/impressions (numerador server_confirmed sobre viewed browser).
 */
export interface CtaMarketingMetricsVm {
  windowDays: number
  impressions: CtaMetricWindowValue
  clicks: CtaMetricWindowValue
  conversions: CtaMetricWindowValue
  ctr: CtaRateWindowValue
  conversionRate: CtaRateWindowValue
  /**
   * Cobertura de los RATES (determinada server-side, jamás en la UI):
   * - `ok`: el tracking de impresiones cubre toda la ventana; rates ventana completa.
   * - `aligned_partial`: las impresiones nacieron DENTRO de la ventana (Tier B más
   *   nuevo que el ledger) — CTR/tasa se computan sobre la VENTANA ALINEADA
   *   (clics/conversiones desde `coverageSince` ÷ impresiones). Los conteos de las
   *   cards siguen siendo ventana completa; la UI explica el ancla.
   * - `impressions_undercounted`: incluso alineado clicks > impressions (sampling/
   *   asimetrías) — un % sería imposible; la UI muestra conteos + nota.
   */
  coverage: 'ok' | 'aligned_partial' | 'impressions_undercounted'
  /** Ancla de la ventana alineada (primer bucket viewed) cuando coverage=aligned_partial. */
  coverageSince: string | null
  lastEventAt: string | null
}

const CONVERSION_EVENT_KINDS = ['form_submitted', 'action_completed'] as const

const toWindowValue = (current: number, previous: number): CtaMetricWindowValue => ({
  current,
  previous,
  deltaPct: previous > 0 ? ((current - previous) / previous) * 100 : null,
})

const toRateValue = (
  numerator: CtaMetricWindowValue,
  denominator: CtaMetricWindowValue,
): CtaRateWindowValue => {
  const current = denominator.current > 0 ? numerator.current / denominator.current : null
  const previous = denominator.previous > 0 ? numerator.previous / denominator.previous : null

  return {
    current,
    previous,
    deltaPp: current !== null && previous !== null ? (current - previous) * 100 : null,
  }
}

export const getCtaMarketingMetrics = async (
  ctaId: string,
  windowDays = 30,
): Promise<CtaMarketingMetricsVm> => {
  const [eventWindows, viewedWindows, lastEventAt, firstViewedAt] = await Promise.all([
    summarizeConversionEventWindows(ctaId, windowDays),
    summarizeViewedExposureWindows(ctaId, windowDays),
    getLastAcceptedEventAt(ctaId),
    getFirstViewedBucketAt(ctaId),
  ])

  const sumEvents = (window: 'current' | 'previous', predicate: (row: { eventKind: string; trustLevel: string }) => boolean) =>
    eventWindows
      .filter(row => row.window === window && predicate(row))
      .reduce((total, row) => total + row.total, 0)

  const isClick = (row: { eventKind: string }) => row.eventKind === 'clicked'

  const isConversion = (row: { eventKind: string; trustLevel: string }) =>
    row.trustLevel === 'server_confirmed' &&
    (CONVERSION_EVENT_KINDS as readonly string[]).includes(row.eventKind)

  const viewedFor = (window: 'current' | 'previous') =>
    viewedWindows.find(row => row.window === window)?.viewed ?? 0

  const lastBucketAt = viewedWindows
    .map(row => row.lastBucketAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null

  const impressions = toWindowValue(viewedFor('current'), viewedFor('previous'))
  const clicks = toWindowValue(sumEvents('current', isClick), sumEvents('previous', isClick))
  const conversions = toWindowValue(sumEvents('current', isConversion), sumEvents('previous', isConversion))

  const freshness = [lastEventAt, lastBucketAt].filter((value): value is string => value !== null).sort().at(-1) ?? null

  // Cobertura de rates: si el tracking de impresiones nació DENTRO de la ventana,
  // el CTR honesto se computa sobre la ventana ALINEADA (desde el primer bucket
  // viewed) — "si tienes clics e impresiones, tienes CTR", pero sobre el tramo
  // donde AMBAS señales existen. Los conteos de cards siguen siendo ventana completa.
  const windowStartMs = Date.now() - windowDays * 24 * 60 * 60 * 1000
  const firstViewedMs = firstViewedAt ? Date.parse(firstViewedAt) : null
  const partialCoverage = firstViewedMs !== null && firstViewedMs > windowStartMs

  let ctr = toRateValue(clicks, impressions)
  let conversionRate = toRateValue(conversions, impressions)
  let coverage: CtaMarketingMetricsVm['coverage'] = clicks.current > impressions.current ? 'impressions_undercounted' : 'ok'
  let coverageSince: string | null = null

  if (partialCoverage && impressions.current > 0 && firstViewedAt) {
    const aligned = await summarizeAlignedEventCounts(ctaId, firstViewedAt)
    const alignedClicks = aligned.filter(isClick).reduce((total, row) => total + row.total, 0)
    const alignedConversions = aligned.filter(isConversion).reduce((total, row) => total + row.total, 0)

    if (alignedClicks <= impressions.current) {
      ctr = { current: alignedClicks / impressions.current, previous: null, deltaPp: null }
      conversionRate = { current: alignedConversions / impressions.current, previous: null, deltaPp: null }
      coverage = 'aligned_partial'
      coverageSince = firstViewedAt
    } else {
      coverage = 'impressions_undercounted'
    }
  } else if (partialCoverage) {
    // Aún sin impresiones: rates null (el guard clásico decide el label).
    coverage = clicks.current > 0 ? 'impressions_undercounted' : 'ok'
  }

  // Con cobertura undercounted el VM jamás porta un rate físicamente imposible
  // (contrato limpio: la UI no debe depender de "saber ocultarlo").
  if (coverage === 'impressions_undercounted') {
    ctr = { current: null, previous: null, deltaPp: null }
    conversionRate = { current: null, previous: null, deltaPp: null }
  }

  return {
    windowDays,
    impressions,
    clicks,
    conversions,
    ctr,
    conversionRate,
    coverage,
    coverageSince,
    lastEventAt: freshness,
  }
}

export interface CtaDetailVm {
  summary: CtaSummaryVm
  versions: CtaVersionVm[]
  conversion: CtaConversionSummary[]
  /** null = lectura de métricas degradada (la UI muestra región parcial; lifecycle sigue operable). */
  metrics: CtaMarketingMetricsVm | null
}

/** Detalle admin (server-side; incluye policies — jamás cruza al browser público). */
export const getCtaDetailAdmin = async (ctaId: string): Promise<CtaDetailVm | null> => {
  const definition = await getCtaDefinitionById(ctaId)

  if (!definition) return null

  const versions = await listVersionsForCta(ctaId)
  const conversion = await summarizeConversionEvents(ctaId)

  let metrics: CtaMarketingMetricsVm | null = null

  try {
    metrics = await getCtaMarketingMetrics(ctaId)
  } catch (error) {
    // Degradación honesta: el detalle sigue operable sin métricas (región parcial).
    captureWithDomain(error, 'growth', { tags: { source: 'cta_marketing_metrics_reader' } })
  }

  return {
    summary: toSummaryVm(definition, versions),
    metrics,
    versions: versions.map(version => ({
      ctaVersionId: version.cta_version_id,
      version: version.version,
      status: version.status,
      locale: version.locale,
      placement: version.placement,
      styleVariant: version.style_variant,
      content: version.content_json,
      actionPolicy: version.action_policy_json,
      targetingPolicy: version.targeting_policy_json,
      suppressionPolicy: version.suppression_policy_json,
      priorityPolicy: version.priority_policy_json,
      visualAssetRef: version.visual_asset_ref,
      publishedAt: version.published_at,
      createdAt: version.created_at,
    })),
    conversion,
  }
}

export interface CtaSurfaceVm {
  surfaceId: string
  surfaceKind: string
  surfaceName: string
  originAllowlist: string[]
  allowedCtaSlugs: string[]
  embedKeyId: string | null
  rendererChannel: string
  status: string
}

/** Listado admin de surfaces. NUNCA expone el hash de la credencial. */
export const listCtaSurfacesAdmin = async (): Promise<CtaSurfaceVm[]> => {
  const surfaces = await listSurfaceBindings()

  return surfaces.map(surface => ({
    surfaceId: surface.surface_id,
    surfaceKind: surface.surface_kind,
    surfaceName: surface.surface_name,
    originAllowlist: Array.isArray(surface.origin_allowlist_json)
      ? (surface.origin_allowlist_json as string[])
      : [],
    allowedCtaSlugs: Array.isArray(surface.allowed_cta_slugs_json)
      ? (surface.allowed_cta_slugs_json as string[])
      : [],
    embedKeyId: surface.embed_key_id,
    rendererChannel: surface.renderer_channel,
    status: surface.status,
  }))
}
