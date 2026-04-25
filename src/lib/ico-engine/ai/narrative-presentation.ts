import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

import {
  isProjectDisplaySentinel,
  isTechnicalProjectIdentifier
} from './entity-display-resolution'

/**
 * ═══════════════════════════════════════════════════════════════════
 * ICO Narrative Presentation Layer (TASK-598)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Resuelve narrativas frozen de `ico_ai_signal_enrichment_history` contra la
 * verdad canónica vigente al momento de renderizar. Los enrichments LLM se
 * persisten con tokens `@[label](type:id)` donde el `label` queda congelado al
 * momento de generación — si el proyecto se llamaba "Sin nombre" el lunes
 * pasado y hoy se llama "TEASER TS", el enrichment sigue diciendo "Sin nombre"
 * para siempre. Esta capa hace el lookup canónico live y sanitiza sentinels.
 *
 * Analogía: Slack renderiza `<@U123|old_username>` mostrando el username
 * actual del user. Mismo patrón.
 *
 * Consumers:
 *   - src/lib/nexa/digest/build-weekly-digest.ts (lunes email)
 *   - TASK-595 UI inbox (EPIC-006) — reusará sin cambios
 *   - TASK-596 webhooks + Nexa — idem
 *
 * No escribe a BQ ni PG. Es pure resolver al read.
 */

// ─── Regex canónico para menciones @[label](type:id) ──────────────────

export const MENTION_PATTERN =
  /@\[((?:[^\]\\]|\\.)+)\]\((space|member|project):([^)]+)\)/g

export type MentionType = 'space' | 'member' | 'project'

// ─── Tipos públicos ───────────────────────────────────────────────────

export interface MentionResolutionContext {
  projects: Map<string, string | null>
  members: Map<string, string | null>
  spaces: Map<string, string | null>
  fallbacks: {
    project: string
    member: string
    space: string
  }
}

export type MentionFallbackReason =
  | 'none'
  | 'sentinel'
  | 'missing_entity'
  | 'null_canonical'
  | 'technical_id'

export interface MentionResolutionReport {
  type: MentionType
  id: string
  originalLabel: string
  resolvedLabel: string
  fallbackReason: MentionFallbackReason
}

export interface ResolvedNarrative {
  text: string
  reports: MentionResolutionReport[]
}

export interface PresentableEnrichment {
  enrichment_id: string
  signal_id: string
  space_id: string
  space_name: string | null
  client_name: string | null
  signal_type: string
  metric_name: string
  severity: 'critical' | 'warning' | 'info'
  quality_score: number | null
  confidence: number | null
  explanation_summary: string | null
  root_cause_narrative: string | null
  recommended_action: string | null
  processed_at: string
  member_id: string | null
  project_id: string | null
}

export type SeverityFloor = 'info' | 'warning' | 'critical'

export interface PresentationFilters {
  requireSignalExists?: boolean
  minQualityScore?: number
  maxPerSpace?: number
  maxTotal?: number
  severityFloor?: SeverityFloor
}

export interface NarrativePresentationLog {
  event: 'narrative_presentation'
  source: string
  window_start?: string
  window_end?: string
  total_mentions: number
  resolved: number
  fallback_count_by_reason: Record<MentionFallbackReason, number>
  fallback_rate: number
}

// ─── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_FALLBACKS: MentionResolutionContext['fallbacks'] = {
  project: 'este proyecto',
  member: 'este responsable',
  space: 'este espacio'
}

const SEVERITY_ORDER: Record<'critical' | 'warning' | 'info', number> = {
  critical: 0,
  warning: 1,
  info: 2
}

const SEVERITY_FLOOR_INDEX: Record<SeverityFloor, number> = {
  critical: 0,
  warning: 1,
  info: 2
}

// ─── Internals ────────────────────────────────────────────────────────

const normalizeText = (value: string | null | undefined) => value?.trim() ?? ''

const isHumanLabel = (value: string | null) => {
  if (!value) return false
  if (isProjectDisplaySentinel(value)) return false
  if (isTechnicalProjectIdentifier(value)) return false

  return value.trim().length > 0
}

const extractMentionRefs = (narratives: Array<string | null | undefined>) => {
  const byType: Record<MentionType, Set<string>> = {
    space: new Set(),
    member: new Set(),
    project: new Set()
  }

  for (const narrative of narratives) {
    const text = normalizeText(narrative)

    if (!text) continue

    for (const match of text.matchAll(MENTION_PATTERN)) {
      const type = match[2] as MentionType
      const id = normalizeText(match[3])

      if (id) {
        byType[type].add(id)
      }
    }
  }

  return byType
}

// ─── Canonical loaders ────────────────────────────────────────────────

const loadProjectLabels = async (projectIds: string[]): Promise<Map<string, string | null>> => {
  const out = new Map<string, string | null>()

  if (projectIds.length === 0) return out

  const db = await getDb()

  // Un `project:id` mention puede apuntar a `notion_project_id` o al canonical
  // `project_record_id`. Resolvemos ambos caminos para no dejar mentions sin
  // hidratar por alias.
  const rows = await db
    .selectFrom('greenhouse_delivery.projects')
    .select(['project_record_id', 'notion_project_id', 'project_name'])
    .where(({ eb, or }) =>
      or([
        eb('project_record_id', 'in', projectIds),
        eb('notion_project_id', 'in', projectIds)
      ])
    )
    .where('active', '=', true)
    .where('is_deleted', '=', false)
    .execute()

  for (const row of rows) {
    const label = normalizeText(row.project_name) || null

    if (row.project_record_id && projectIds.includes(row.project_record_id)) {
      out.set(row.project_record_id, label)
    }

    if (row.notion_project_id && projectIds.includes(row.notion_project_id)) {
      out.set(row.notion_project_id, label)
    }
  }

  for (const id of projectIds) {
    if (!out.has(id)) out.set(id, null)
  }

  return out
}

const loadMemberLabels = async (memberIds: string[]): Promise<Map<string, string | null>> => {
  const out = new Map<string, string | null>()

  if (memberIds.length === 0) return out

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.members')
    .select(['member_id', 'display_name'])
    .where('member_id', 'in', memberIds)
    .execute()

  for (const row of rows) {
    out.set(row.member_id, normalizeText(row.display_name) || null)
  }

  for (const id of memberIds) {
    if (!out.has(id)) out.set(id, null)
  }

  return out
}

const loadSpaceLabels = async (spaceIds: string[]): Promise<Map<string, string | null>> => {
  const out = new Map<string, string | null>()

  if (spaceIds.length === 0) return out

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name'])
    .where('space_id', 'in', spaceIds)
    .execute()

  for (const row of rows) {
    out.set(row.space_id, normalizeText(row.space_name) || null)
  }

  for (const id of spaceIds) {
    if (!out.has(id)) out.set(id, null)
  }

  return out
}

// ─── Public API: loadMentionContext ───────────────────────────────────

export interface LoadMentionContextInput {
  enrichments: Array<{
    explanation_summary: string | null
    root_cause_narrative: string | null
    recommended_action: string | null
    space_id?: string | null
    member_id?: string | null
    project_id?: string | null
  }>
  fallbacks?: Partial<MentionResolutionContext['fallbacks']>
}

export const loadMentionContext = async ({
  enrichments,
  fallbacks
}: LoadMentionContextInput): Promise<MentionResolutionContext> => {
  const narratives: Array<string | null | undefined> = []

  for (const enrichment of enrichments) {
    narratives.push(enrichment.explanation_summary)
    narratives.push(enrichment.root_cause_narrative)
    narratives.push(enrichment.recommended_action)
  }

  const refs = extractMentionRefs(narratives)

  // También incluimos los IDs estructurados de cada enrichment — a veces la
  // narrativa no los menciona via @[...] pero los necesitamos para el context
  // (p. ej. space_id siempre está en la fila aunque no haya token).
  for (const enrichment of enrichments) {
    if (enrichment.space_id) refs.space.add(enrichment.space_id)
    if (enrichment.member_id) refs.member.add(enrichment.member_id)
    if (enrichment.project_id) refs.project.add(enrichment.project_id)
  }

  const [projects, members, spaces] = await Promise.all([
    loadProjectLabels([...refs.project]),
    loadMemberLabels([...refs.member]),
    loadSpaceLabels([...refs.space])
  ])

  return {
    projects,
    members,
    spaces,
    fallbacks: { ...DEFAULT_FALLBACKS, ...(fallbacks ?? {}) }
  }
}

// ─── Public API: resolveMentions ──────────────────────────────────────

const resolveMentionLabel = (
  type: MentionType,
  id: string,
  originalLabel: string,
  context: MentionResolutionContext
): { label: string; reason: MentionFallbackReason } => {
  const fallback = context.fallbacks[type]

  const map: Map<string, string | null> =
    type === 'project' ? context.projects : type === 'member' ? context.members : context.spaces

  if (!map.has(id)) {
    return { label: fallback, reason: 'missing_entity' }
  }

  const canonical = map.get(id) ?? null

  if (canonical === null) {
    return { label: fallback, reason: 'null_canonical' }
  }

  if (isProjectDisplaySentinel(canonical)) {
    return { label: fallback, reason: 'sentinel' }
  }

  if (isTechnicalProjectIdentifier(canonical)) {
    return { label: fallback, reason: 'technical_id' }
  }

  return { label: canonical, reason: 'none' }
}

/**
 * Barre los sentinels y IDs técnicos que quedaron como texto plano (no como
 * mentions @[...]) y los reemplaza con el fallback genérico. Conservador:
 * solo opera sobre tokens que matchean `proyecto "X"` / `proyecto 'X'` donde
 * X es un sentinel o ID técnico, para no tocar texto humano con palabras que
 * coinciden parcialmente.
 */
const sanitizeStandalonePlainSentinels = (
  text: string,
  fallbacks: MentionResolutionContext['fallbacks']
) => {
  let output = text

  // Patrón: proyecto "Sin nombre" | proyecto 'Sin nombre' | el proyecto Sin nombre
  // Usamos lookaround acotado: la palabra clave "proyecto" delante y el
  // sentinel entre comillas o como bare phrase de 1-2 palabras.
  const quotedProjectSentinel = /\b(proyecto|el proyecto|un proyecto|este proyecto)\s+['"]([^'"]{1,40})['"]/gi

  output = output.replace(quotedProjectSentinel, (match, prefix: string, label: string) => {
    return isProjectDisplaySentinel(label) ? fallbacks.project : match
  })

  const barePhrasePattern = /\b(proyecto|el proyecto|un proyecto)\s+(Sin nombre|Sin título|Sin titulo|Untitled|No title|Sem nome|N\/A)\b/gi

  output = output.replace(barePhrasePattern, (_match, prefix: string) => {
    void prefix
    
return fallbacks.project
  })

  return output
}

export const resolveMentions = (
  narrative: string | null | undefined,
  context: MentionResolutionContext
): ResolvedNarrative => {
  const reports: MentionResolutionReport[] = []
  const text = normalizeText(narrative)

  if (!text) {
    return { text: '', reports }
  }

  let cursor = 0
  let output = ''

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0

    if (index > cursor) {
      output += text.slice(cursor, index)
    }

    const originalLabel = normalizeText(match[1])
    const type = match[2] as MentionType
    const id = normalizeText(match[3])

    const { label: resolvedLabel, reason } = resolveMentionLabel(type, id, originalLabel, context)

    reports.push({
      type,
      id,
      originalLabel,
      resolvedLabel,
      fallbackReason: reason
    })

    if (reason === 'none') {
      // Preserva sintaxis @[label](type:id) para que downstream parsers
      // (builder del digest, UI) puedan renderizar como link con la label
      // canonical vigente.
      output += `@[${resolvedLabel}](${type}:${id})`
    } else {
      output += resolvedLabel
    }

    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    output += text.slice(cursor)
  }

  output = sanitizeStandalonePlainSentinels(output, context.fallbacks)
  output = output.replace(/\s{2,}/g, ' ').trim()

  return { text: output, reports }
}

export const resolveAllNarrativeFields = <
  T extends {
    explanation_summary: string | null
    root_cause_narrative: string | null
    recommended_action: string | null
  }
>(
  enrichment: T,
  context: MentionResolutionContext
): Omit<T, 'explanation_summary' | 'root_cause_narrative' | 'recommended_action'> & {
  explanation_summary: string
  root_cause_narrative: string
  recommended_action: string
  presentation_reports: MentionResolutionReport[]
} => {
  const summary = resolveMentions(enrichment.explanation_summary, context)
  const rootCause = resolveMentions(enrichment.root_cause_narrative, context)
  const action = resolveMentions(enrichment.recommended_action, context)

  return {
    ...enrichment,
    explanation_summary: summary.text,
    root_cause_narrative: rootCause.text,
    recommended_action: action.text,
    presentation_reports: [...summary.reports, ...rootCause.reports, ...action.reports]
  }
}

// ─── Public API: selectPresentableEnrichments ─────────────────────────

interface EnrichmentRow extends Record<string, unknown> {
  enrichment_id: string
  signal_id: string
  space_id: string
  space_name: string | null
  client_name: string | null
  signal_type: string
  metric_name: string
  severity: string | null
  quality_score: number | string | null
  confidence: number | string | null
  explanation_summary: string | null
  root_cause_narrative: string | null
  recommended_action: string | null
  processed_at: string | Date
  member_id: string | null
  project_id: string | null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const normalizeSeverity = (value: unknown): PresentableEnrichment['severity'] => {
  if (value === 'critical' || value === 'warning' || value === 'info') {
    return value
  }

  return 'info'
}

export const selectPresentableEnrichments = async (
  windowStart: Date,
  windowEnd: Date,
  filters: PresentationFilters = {}
): Promise<PresentableEnrichment[]> => {
  const {
    requireSignalExists = true,
    minQualityScore = 0,
    maxPerSpace = 3,
    maxTotal = 8,
    severityFloor = 'warning'
  } = filters

  const db = await getDb()

  // Dedup `DISTINCT ON (signal_id)` preserva el enrichment más reciente por
  // signal dentro de la ventana, evitando el count inflado cuando el
  // materialize diario re-emite el mismo signal.
  //
  // INNER JOIN con ico_ai_signals filtra huérfanos (enrichments cuyo signal
  // parent fue borrado por el DELETE+INSERT del materialize).
  //
  // ROW_NUMBER OVER PARTITION BY space_id limita items por tenant — evita que
  // Sky con 10 críticos domine el top-8.

  const severityFloorIndex = SEVERITY_FLOOR_INDEX[severityFloor]
  const severityAllowed: Array<'critical' | 'warning' | 'info'> = []

  if (severityFloorIndex >= SEVERITY_ORDER.critical) severityAllowed.push('critical')
  if (severityFloorIndex >= SEVERITY_ORDER.warning) severityAllowed.push('warning')
  if (severityFloorIndex >= SEVERITY_ORDER.info) severityAllowed.push('info')

  const signalJoinClause = requireSignalExists
    ? sql`INNER JOIN greenhouse_serving.ico_ai_signals sig ON sig.signal_id = e.signal_id`
    : sql``

  const rows = await sql<EnrichmentRow>`
    WITH eligible AS (
      SELECT DISTINCT ON (e.signal_id)
        e.enrichment_id,
        e.signal_id,
        e.space_id,
        e.signal_type,
        e.metric_name,
        e.severity,
        e.quality_score,
        e.confidence,
        e.explanation_summary,
        e.root_cause_narrative,
        e.recommended_action,
        e.processed_at,
        e.member_id,
        e.project_id
      FROM greenhouse_serving.ico_ai_signal_enrichment_history e
      ${signalJoinClause}
      INNER JOIN greenhouse_core.spaces sp
        ON sp.space_id = e.space_id
       AND sp.active = TRUE
      WHERE e.status = 'succeeded'
        AND e.processed_at >= ${windowStart}
        AND e.processed_at < ${windowEnd}
        AND COALESCE(e.quality_score, 0) >= ${minQualityScore}
        AND COALESCE(e.severity, 'info') IN (${sql.join(severityAllowed)})
      ORDER BY e.signal_id, e.processed_at DESC
    ),
    ranked AS (
      SELECT
        el.*,
        sp.space_name,
        cl.client_name,
        ROW_NUMBER() OVER (
          PARTITION BY el.space_id
          ORDER BY
            CASE COALESCE(el.severity, 'info')
              WHEN 'critical' THEN 0
              WHEN 'warning'  THEN 1
              WHEN 'info'     THEN 2
              ELSE 3
            END,
            el.quality_score DESC NULLS LAST,
            el.processed_at DESC
        ) AS per_space_rank
      FROM eligible el
      INNER JOIN greenhouse_core.spaces sp ON sp.space_id = el.space_id
      LEFT JOIN greenhouse_core.clients cl ON cl.client_id = sp.client_id
    )
    SELECT *
    FROM ranked
    WHERE per_space_rank <= ${maxPerSpace}
    ORDER BY
      CASE COALESCE(severity, 'info')
        WHEN 'critical' THEN 0
        WHEN 'warning'  THEN 1
        WHEN 'info'     THEN 2
        ELSE 3
      END,
      quality_score DESC NULLS LAST,
      processed_at DESC
    LIMIT ${maxTotal}
  `.execute(db)

  return rows.rows.map(
    (row): PresentableEnrichment => ({
      enrichment_id: row.enrichment_id,
      signal_id: row.signal_id,
      space_id: row.space_id,
      space_name: row.space_name,
      client_name: row.client_name,
      signal_type: row.signal_type,
      metric_name: row.metric_name,
      severity: normalizeSeverity(row.severity),
      quality_score: toNumberOrNull(row.quality_score),
      confidence: toNumberOrNull(row.confidence),
      explanation_summary: row.explanation_summary,
      root_cause_narrative: row.root_cause_narrative,
      recommended_action: row.recommended_action,
      processed_at:
        typeof row.processed_at === 'string' ? row.processed_at : row.processed_at.toISOString(),
      member_id: row.member_id,
      project_id: row.project_id
    })
  )
}

// ─── Observability ────────────────────────────────────────────────────

export const summarizePresentationReports = (
  reports: MentionResolutionReport[],
  options: { source: string; windowStart?: Date; windowEnd?: Date }
): NarrativePresentationLog => {
  const fallback_count_by_reason: Record<MentionFallbackReason, number> = {
    none: 0,
    sentinel: 0,
    missing_entity: 0,
    null_canonical: 0,
    technical_id: 0
  }

  for (const report of reports) {
    fallback_count_by_reason[report.fallbackReason] += 1
  }

  const total = reports.length
  const resolved = fallback_count_by_reason.none
  const fallback = total - resolved

  return {
    event: 'narrative_presentation',
    source: options.source,
    window_start: options.windowStart?.toISOString(),
    window_end: options.windowEnd?.toISOString(),
    total_mentions: total,
    resolved,
    fallback_count_by_reason,
    fallback_rate: total === 0 ? 0 : Math.round((fallback / total) * 10000) / 10000
  }
}

export const emitPresentationLog = (log: NarrativePresentationLog) => {
  console.log(JSON.stringify(log))
}

// Reusable helper: human label check (export for tests + downstream use)
export { isHumanLabel }
