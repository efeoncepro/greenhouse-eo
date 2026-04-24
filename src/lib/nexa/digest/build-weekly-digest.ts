import 'server-only'

import { APP_URL } from '@/emails/constants'
import { ICO_METRIC_REGISTRY } from '@/lib/ico-engine/metric-registry'
import {
  MENTION_PATTERN,
  emitPresentationLog,
  loadMentionContext,
  resolveAllNarrativeFields,
  selectPresentableEnrichments,
  summarizePresentationReports,
  type MentionResolutionReport,
  type PresentableEnrichment,
  type PresentationFilters
} from '@/lib/ico-engine/ai/narrative-presentation'

import type {
  WeeklyDigestBuildOptions,
  WeeklyDigestBuildResult,
  WeeklyDigestInsight,
  WeeklyDigestNarrativePart,
  WeeklyDigestSeverity,
  WeeklyDigestSpaceSection
} from './types'

/**
 * ═══════════════════════════════════════════════════════════════════
 * Weekly Executive Digest Builder (TASK-598 refactor)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Construye el resumen semanal de Nexa insights leyendo enrichments de los
 * últimos 7 días. Usa la capa `narrative-presentation.ts` para:
 *   - Filtrar enrichments huérfanos (signal ya borrado por DELETE+INSERT).
 *   - Deduplicar por signal_id (materialize diario genera hasta N copias).
 *   - Limitar por space (diversity cap) para evitar que un tenant domine.
 *   - Re-hidratar @[label](type:id) contra canonical vigente al render.
 *   - Sanitizar sentinels ("Sin nombre", etc.) y technical IDs.
 *
 * Pre-TASK-598: 300+ líneas con query inline + parser fragile.
 * Post-TASK-598: consumer delgado de utilities compartidas.
 */

const DIGEST_TIMEZONE = 'America/Santiago'
const DEFAULT_WEEKLY_DIGEST_LIMIT = 8
const MIN_WEEKLY_DIGEST_LIMIT = 5
const MAX_WEEKLY_DIGEST_LIMIT = 10
const DEFAULT_MAX_PER_SPACE = 3
const DEFAULT_MIN_QUALITY_SCORE = 0
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const METRIC_SHORT_NAMES = new Map<string, string>(
  ICO_METRIC_REGISTRY.map(metric => [metric.code, metric.shortName])
)

METRIC_SHORT_NAMES.set('rpa_avg', 'RpA')

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  timeZone: DIGEST_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

const NUMBER_FORMATTER = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0
})

// ─── Helpers ──────────────────────────────────────────────────────────

const normalizeLimit = (limit?: number) => {
  const candidate = Number(limit)

  if (!Number.isFinite(candidate)) {
    return DEFAULT_WEEKLY_DIGEST_LIMIT
  }

  return Math.max(MIN_WEEKLY_DIGEST_LIMIT, Math.min(MAX_WEEKLY_DIGEST_LIMIT, Math.trunc(candidate)))
}

const getMetricLabel = (metricName: string) => METRIC_SHORT_NAMES.get(metricName) ?? metricName

const formatDateLabel = (date: Date) => DATE_FORMATTER.format(date)

const getDigestWindow = (now = new Date()) => {
  const end = new Date(now)
  const start = new Date(end.getTime() - WEEK_MS)

  return {
    startAt: start,
    endAt: end,
    label: `${formatDateLabel(start)} - ${formatDateLabel(end)}`
  }
}

const resolvePortalUrl = () => process.env.NEXT_PUBLIC_APP_URL?.trim() || APP_URL

const buildSpaceHref = (spaceId: string, portalUrl: string) =>
  `${portalUrl.replace(/\/$/, '')}/agency/spaces/${encodeURIComponent(spaceId)}`

const buildMentionHref = (type: 'space' | 'member' | 'project', id: string, portalUrl: string) => {
  const base = portalUrl.replace(/\/$/, '')

  if (type === 'space') return `${base}/agency/spaces/${encodeURIComponent(id)}`
  if (type === 'member') return `${base}/people/${encodeURIComponent(id)}`

  return null
}

// ─── Narrative parsing to email parts ─────────────────────────────────

/**
 * Convierte un string con mentions @[label](type:id) ya resueltos por
 * `resolveMentions` a la estructura de partes que consume el template
 * (WeeklyDigestNarrativePart[]). Aquí solo hacemos conversión de texto →
 * estructura; la semántica de labels (sentinels, fresh canonical, etc.) ya
 * fue aplicada upstream por la capa de presentación.
 */
const parseNarrativeToParts = (value: string, portalUrl: string): WeeklyDigestNarrativePart[] => {
  const parts: WeeklyDigestNarrativePart[] = []
  let cursor = 0

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0

    if (index > cursor) {
      parts.push({ type: 'text', value: value.slice(cursor, index) })
    }

    const label = match[1]?.trim() ?? ''
    const type = match[2] as 'space' | 'member' | 'project'
    const id = match[3]?.trim() ?? ''

    if (label && id) {
      const href = buildMentionHref(type, id, portalUrl)

      parts.push(href ? { type: 'link', value: label, href } : { type: 'text', value: label })
    } else {
      parts.push({ type: 'text', value: match[0] })
    }

    cursor = index + match[0].length
  }

  if (cursor < value.length) {
    parts.push({ type: 'text', value: value.slice(cursor) })
  }

  return parts.filter(part => part.value.trim().length > 0)
}

export const formatWeeklyDigestNarrativeText = (parts: WeeklyDigestNarrativePart[]) =>
  parts.map(part => (part.type === 'link' ? `${part.value} (${part.href})` : part.value)).join('')

// ─── Builder ──────────────────────────────────────────────────────────

const normalizeSeverityForDigest = (value: PresentableEnrichment['severity']): WeeklyDigestSeverity => value

const buildInsightHeadline = (enrichment: PresentableEnrichment) => {
  const metricLabel = getMetricLabel(enrichment.metric_name)
  const score = enrichment.quality_score

  return score === null ? metricLabel : `${metricLabel} · score ${NUMBER_FORMATTER.format(score)}`
}

const buildInsightNarrative = (
  enrichment: PresentableEnrichment & {
    explanation_summary: string
    recommended_action: string
  },
  portalUrl: string
): WeeklyDigestNarrativePart[] => {
  const spaceName = enrichment.space_name?.trim() || enrichment.space_id
  const clientName = enrichment.client_name?.trim() || null

  const summary =
    enrichment.explanation_summary.trim() ||
    `Se materializó una señal sobre ${getMetricLabel(enrichment.metric_name)}.`

  const action = enrichment.recommended_action.trim()
  const spaceHref = buildSpaceHref(enrichment.space_id, portalUrl)

  const narrative: WeeklyDigestNarrativePart[] = [
    { type: 'link', value: spaceName, href: spaceHref },
    ...(clientName ? [{ type: 'text' as const, value: ` · ${clientName}` }] : []),
    { type: 'text', value: ' — ' },
    ...parseNarrativeToParts(summary, portalUrl)
  ]

  if (action) {
    narrative.push({ type: 'text', value: ' Acción sugerida: ' })
    narrative.push(...parseNarrativeToParts(action, portalUrl))
  }

  return narrative
}

export interface WeeklyDigestBuildExtraOptions {
  filters?: Partial<Pick<PresentationFilters, 'minQualityScore' | 'maxPerSpace' | 'severityFloor'>>
}

export const buildWeeklyDigest = async (
  options: WeeklyDigestBuildOptions & WeeklyDigestBuildExtraOptions = {}
): Promise<WeeklyDigestBuildResult> => {
  const limit = normalizeLimit(options.limit)
  const window = getDigestWindow(options.now)
  const portalUrl = resolvePortalUrl()

  const filters: PresentationFilters = {
    requireSignalExists: true,
    minQualityScore: options.filters?.minQualityScore ?? DEFAULT_MIN_QUALITY_SCORE,
    maxPerSpace: options.filters?.maxPerSpace ?? DEFAULT_MAX_PER_SPACE,
    maxTotal: limit,
    severityFloor: options.filters?.severityFloor ?? 'warning'
  }

  // 1. Fetch presentable enrichments (filtered, deduped, diverse)
  const enrichments = await selectPresentableEnrichments(window.startAt, window.endAt, filters)

  // 2. Batch load canonical context for all mentions + FKs
  const mentionContext = await loadMentionContext({ enrichments })

  // 3. Re-resolve narratives against current canonical + aggregate reports
  const allReports: MentionResolutionReport[] = []

  const presentable = enrichments.map(enrichment => {
    const resolved = resolveAllNarrativeFields(enrichment, mentionContext)

    allReports.push(...resolved.presentation_reports)

    return resolved
  })

  // 4. Emit presentation log for observability (TASK-594 consumers)
  emitPresentationLog(
    summarizePresentationReports(allReports, {
      source: 'weekly_digest',
      windowStart: window.startAt,
      windowEnd: window.endAt
    })
  )

  // 5. Group by space preserving rank order
  const insightsBySpace = new Map<string, WeeklyDigestInsight[]>()
  const spaceLabels = new Map<string, string>()
  const spaceOrder = new Map<string, number>()
  const counts = { critical: 0, warning: 0, info: 0 }

  presentable.forEach((row, index) => {
    const severity = normalizeSeverityForDigest(row.severity)
    const spaceName = row.space_name?.trim() || row.space_id
    const rootCauseText = row.root_cause_narrative.trim()
    const rootCauseNarrative = rootCauseText ? parseNarrativeToParts(rootCauseText, portalUrl) : undefined

    const insight: WeeklyDigestInsight = {
      severity,
      headline: buildInsightHeadline(row),
      narrative: buildInsightNarrative(row, portalUrl),
      ...(rootCauseNarrative ? { rootCauseNarrative } : {}),
      actionLabel: 'Abrir Space',
      actionUrl: buildSpaceHref(row.space_id, portalUrl)
    }

    insightsBySpace.set(row.space_id, [...(insightsBySpace.get(row.space_id) ?? []), insight])
    spaceLabels.set(row.space_id, spaceName)

    if (!spaceOrder.has(row.space_id)) {
      spaceOrder.set(row.space_id, index)
    }

    counts[severity] += 1
  })

  const spaces: WeeklyDigestSpaceSection[] = [...insightsBySpace.entries()]
    .sort((left, right) => {
      const leftOrder = spaceOrder.get(left[0]) ?? 0
      const rightOrder = spaceOrder.get(right[0]) ?? 0

      if (leftOrder !== rightOrder) return leftOrder - rightOrder

      const leftLabel = spaceLabels.get(left[0]) ?? left[0]
      const rightLabel = spaceLabels.get(right[0]) ?? right[0]

      return leftLabel.localeCompare(rightLabel)
    })
    .map(([spaceId, insights]) => ({
      name: spaceLabels.get(spaceId) ?? spaceId,
      href: buildSpaceHref(spaceId, portalUrl),
      insights
    }))

  return {
    periodLabel: window.label,
    totalInsights: presentable.length,
    criticalCount: counts.critical,
    warningCount: counts.warning,
    infoCount: counts.info,
    spacesAffected: spaces.length,
    spaces,
    portalUrl,
    closingNote:
      'Resumen automatico basado en los insights materializados del periodo. Abre Greenhouse para ver el detalle completo.',
    window: {
      startAt: window.startAt.toISOString(),
      endAt: window.endAt.toISOString(),
      label: window.label
    }
  }
}

export const WEEKLY_DIGEST_DEFAULT_LIMIT = DEFAULT_WEEKLY_DIGEST_LIMIT
