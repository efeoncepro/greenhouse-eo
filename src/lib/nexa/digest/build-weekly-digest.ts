import 'server-only'

import { sql } from 'kysely'

import { APP_URL } from '@/emails/constants'
import { getDb } from '@/lib/db'
import { ICO_METRIC_REGISTRY } from '@/lib/ico-engine/metric-registry'

import type {
  WeeklyDigestBuildOptions,
  WeeklyDigestBuildResult,
  WeeklyDigestInsight,
  WeeklyDigestNarrativePart,
  WeeklyDigestSeverity,
  WeeklyDigestSpaceSection
} from './types'

const DIGEST_TIMEZONE = 'America/Santiago'
const DEFAULT_WEEKLY_DIGEST_LIMIT = 8
const MIN_WEEKLY_DIGEST_LIMIT = 5
const MAX_WEEKLY_DIGEST_LIMIT = 10
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface WeeklyDigestRow extends Record<string, unknown> {
  enrichment_id: string
  space_id: string
  space_name: string | null
  client_name: string | null
  signal_type: string
  metric_name: string
  severity: string | null
  quality_score: number | string | null
  explanation_summary: string | null
  root_cause_narrative: string | null
  recommended_action: string | null
  confidence: number | string | null
  processed_at: string | Date
}

const METRIC_SHORT_NAMES = new Map<string, string>(
  ICO_METRIC_REGISTRY.map(metric => [metric.code, metric.shortName])
)

METRIC_SHORT_NAMES.set('rpa_avg', 'RpA')

const MENTION_PATTERN = /@\[((?:[^\]\\]|\\.)+)\]\((space|member|project):([^)]+)\)/g

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

const normalizeLimit = (limit?: number) => {
  const candidate = Number(limit)

  if (!Number.isFinite(candidate)) {
    return DEFAULT_WEEKLY_DIGEST_LIMIT
  }

  return Math.max(MIN_WEEKLY_DIGEST_LIMIT, Math.min(MAX_WEEKLY_DIGEST_LIMIT, Math.trunc(candidate)))
}

const normalizeSeverity = (value: unknown): WeeklyDigestSeverity => {
  if (value === 'critical' || value === 'warning' || value === 'info') {
    return value
  }

  return 'info'
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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

const parseNarrativeText = (value: string, portalUrl: string): WeeklyDigestNarrativePart[] => {
  const parts: WeeklyDigestNarrativePart[] = []
  let cursor = 0

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0

    if (index > cursor) {
      parts.push({ type: 'text', value: value.slice(cursor, index) })
    }

    const label = match[1]?.trim()
    const type = match[2] as 'space' | 'member' | 'project'
    const id = match[3]?.trim()

    if (label && id) {
      const href = buildMentionHref(type, id, portalUrl)

      parts.push(
        href
          ? {
              type: 'link',
              value: label,
              href
            }
          : {
              type: 'text',
              value: label
            }
      )
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

const formatNarrativeAsText = (parts: WeeklyDigestNarrativePart[]) =>
  parts
    .map(part => (part.type === 'link' ? `${part.value} (${part.href})` : part.value))
    .join('')

const buildInsightHeadline = (row: WeeklyDigestRow) => {
  const metricLabel = getMetricLabel(row.metric_name)
  const score = toNumber(row.quality_score)

  return score === null ? metricLabel : `${metricLabel} · score ${NUMBER_FORMATTER.format(score)}`
}

const buildInsightNarrative = (
  row: WeeklyDigestRow,
  portalUrl: string
): WeeklyDigestNarrativePart[] => {
  const spaceName = row.space_name?.trim() || row.space_id
  const clientName = row.client_name?.trim() || null
  const summary = row.explanation_summary?.trim() || `Se materializo una senal sobre ${getMetricLabel(row.metric_name)}.`
  const action = row.recommended_action?.trim() || ''
  const spaceHref = buildSpaceHref(row.space_id, portalUrl)

  const narrative: WeeklyDigestNarrativePart[] = [
    { type: 'link', value: spaceName, href: spaceHref },
    ...(clientName ? [{ type: 'text' as const, value: ` · ${clientName}` }] : []),
    { type: 'text', value: ' — ' },
    ...parseNarrativeText(summary, portalUrl)
  ]

  if (action) {
    narrative.push({ type: 'text', value: ' Acción sugerida: ' })
    narrative.push(...parseNarrativeText(action, portalUrl))
  }

  return narrative
}

export const buildWeeklyDigest = async (
  options: WeeklyDigestBuildOptions = {}
): Promise<WeeklyDigestBuildResult> => {
  const limit = normalizeLimit(options.limit)
  const window = getDigestWindow(options.now)
  const portalUrl = resolvePortalUrl()
  const db = await getDb()

  const enrichmentHistoryWindow = sql<{
    enrichment_id: string
    space_id: string
    signal_type: string
    metric_name: string
    severity: string | null
    quality_score: number | string | null
    explanation_summary: string | null
    recommended_action: string | null
    root_cause_narrative: string | null
    confidence: number | string | null
    processed_at: Date
    status: string
  }>`(
    SELECT DISTINCT ON (enrichment_id)
      enrichment_id,
      space_id,
      signal_type,
      metric_name,
      severity,
      quality_score,
      explanation_summary,
      recommended_action,
      root_cause_narrative,
      confidence,
      processed_at,
      status
    FROM greenhouse_serving.ico_ai_signal_enrichment_history
    WHERE processed_at >= ${window.startAt}
      AND processed_at < ${window.endAt}
    ORDER BY enrichment_id, processed_at DESC
  )`.as('enrich')

  const rows = await db
    .selectFrom(enrichmentHistoryWindow)
    .innerJoin('greenhouse_core.spaces as spaces', join =>
      join
        .onRef('spaces.space_id', '=', 'enrich.space_id')
        .on('spaces.active', '=', true)
    )
    .leftJoin('greenhouse_core.clients as clients', 'clients.client_id', 'spaces.client_id')
    .select([
      'enrich.enrichment_id as enrichment_id',
      'enrich.space_id as space_id',
      'spaces.space_name as space_name',
      'clients.client_name as client_name',
      'enrich.signal_type as signal_type',
      'enrich.metric_name as metric_name',
      'enrich.severity as severity',
      'enrich.quality_score as quality_score',
      'enrich.explanation_summary as explanation_summary',
      'enrich.recommended_action as recommended_action',
      'enrich.root_cause_narrative as root_cause_narrative',
      'enrich.confidence as confidence',
      sql<string>`enrich.processed_at::text`.as('processed_at')
    ])
    .where('enrich.status', '=', 'succeeded')
    .orderBy(sql`
      CASE COALESCE(enrich.severity, '')
        WHEN 'critical' THEN 0
        WHEN 'warning' THEN 1
        WHEN 'info' THEN 2
        ELSE 3
      END
    `)
    .orderBy(sql`enrich.quality_score DESC NULLS LAST`)
    .orderBy('enrich.processed_at', 'desc')
    .limit(limit)
    .execute() as WeeklyDigestRow[]

  const normalizedRows = rows.map(row => ({
    ...row,
    severity: normalizeSeverity(row.severity),
    qualityScore: toNumber(row.quality_score),
    confidence: toNumber(row.confidence),
    processedAt: typeof row.processed_at === 'string' ? row.processed_at : row.processed_at.toISOString()
  }))

  const insightsBySpace = new Map<string, WeeklyDigestInsight[]>()
  const spaceLabels = new Map<string, string>()
  const spaceOrder = new Map<string, number>()

  const counts = {
    critical: 0,
    warning: 0,
    info: 0
  }

  normalizedRows.forEach((row, index) => {
    const spaceName = row.space_name?.trim() || row.space_id
    const sectionName = spaceName

    const rootCauseText = row.root_cause_narrative?.trim()

    const rootCauseNarrative = rootCauseText
      ? parseNarrativeText(rootCauseText, portalUrl)
      : undefined

    const insight: WeeklyDigestInsight = {
      severity: row.severity,
      headline: buildInsightHeadline(row),
      narrative: buildInsightNarrative(row, portalUrl),
      ...(rootCauseNarrative ? { rootCauseNarrative } : {}),
      actionLabel: 'Abrir Space',
      actionUrl: buildSpaceHref(row.space_id, portalUrl)
    }

    insightsBySpace.set(row.space_id, [...(insightsBySpace.get(row.space_id) ?? []), insight])
    spaceLabels.set(row.space_id, sectionName)

    if (!spaceOrder.has(row.space_id)) {
      spaceOrder.set(row.space_id, index)
    }

    counts[row.severity] += 1
  })

  const spaces: WeeklyDigestSpaceSection[] = [...insightsBySpace.entries()]
    .sort((left, right) => {
      const leftOrder = spaceOrder.get(left[0]) ?? 0
      const rightOrder = spaceOrder.get(right[0]) ?? 0

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

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
    totalInsights: normalizedRows.length,
    criticalCount: counts.critical,
    warningCount: counts.warning,
    infoCount: counts.info,
    spacesAffected: spaces.length,
    spaces,
    portalUrl,
    closingNote: 'Resumen automatico basado en los insights materializados del periodo. Abre Greenhouse para ver el detalle completo.',
    window: {
      startAt: window.startAt.toISOString(),
      endAt: window.endAt.toISOString(),
      label: window.label
    }
  }
}

export const formatWeeklyDigestNarrativeText = (parts: WeeklyDigestNarrativePart[]) =>
  formatNarrativeAsText(parts)

export const WEEKLY_DIGEST_DEFAULT_LIMIT = DEFAULT_WEEKLY_DIGEST_LIMIT
