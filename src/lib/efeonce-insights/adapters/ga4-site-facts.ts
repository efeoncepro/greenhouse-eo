import 'server-only'

/**
 * TASK-1962 — lo que GA4 aporta al Search Visibility 360: qué pasa DESPUÉS del clic. Search Console dice cuántas veces
 * Google mostró y llevó a la marca; el Grader, si los motores de IA la nombran. GA4 cierra los dos: cuántas visitas
 * orgánicas llegaron al sitio (y cuántas interactuaron) y cuántas llegaron desde asistentes de IA, y desde cuál.
 *
 * Lee SÓLO el reader dueño `readGa4Analytics` (conexión OAuth por organización, TASK-1284); una consulta por ventana con
 * la agrupación de canales por defecto de GA4 (`sessionDefaultChannelGroup`). No recalcula nada que GA4 no entregue.
 *
 * - Flag apagado en el runtime ⇒ sin hechos y sin límite: no es algo que el cliente pueda resolver ni un alcance de la
 *   edición (el worker que aún no tiene el flag no debe ensuciar el informe con «fuera de alcance»).
 * - Sin conexión ⇒ `not_connected` sobre `ga4`: el plan se lo pide al cliente.
 * - Token caído o consulta fallida ⇒ `insufficient_data`: el informe sale sin GA4 y lo dice.
 */

import { type Ga4AnalyticsResult, readGa4Analytics } from '@/lib/growth/analytics-ga4/reader'

import { GH_INSIGHTS } from '@/lib/copy/insights'

import { type InsightChannelId } from '../contracts/channels'
import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { InsightModule } from '../contracts/request'
import type { ResolvedInsightWindow } from '../window'
import { evidenceWindow, factId } from './contract'

export const GA4_ADAPTER_VERSION = 'ga4_site_facts_v1'

const GA4_METHOD = { name: 'ga4_channel_sessions', version: 'ga4_default_channel_group_v1' }

/** Nombres EXACTOS de la agrupación de canales por defecto de GA4 (no se traducen: se comparan). */
const ORGANIC_SEARCH = 'Organic Search'
const AI_ASSISTANT = 'AI Assistant'

/** Asistentes con más visitas que se nombran; el resto queda en el total de visitas desde IA. */
const AI_SOURCE_LIMIT = 5

/**
 * Fuente de GA4 (`sessionSource`, p. ej. `chatgpt.com`) → canal del documento (isotipo). Un host desconocido queda sin
 * canal y se muestra por su nombre.
 */
const AI_SOURCE_CHANNELS: ReadonlyArray<{ match: RegExp; channelId: InsightChannelId; label: string }> = [
  { match: /(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, channelId: 'chatgpt', label: 'ChatGPT' },
  { match: /(^|\.)gemini\.google\.com$|^gemini$/, channelId: 'gemini', label: 'Gemini' },
  { match: /(^|\.)perplexity\.ai$/, channelId: 'perplexity', label: 'Perplexity' },
  { match: /(^|\.)claude\.ai$/, channelId: 'claude', label: 'Claude' }
]

/** Nombres legibles de asistentes sin isotipo en el documento. */
const AI_SOURCE_LABELS: ReadonlyArray<{ match: RegExp; label: string }> = [
  { match: /(^|\.)copilot\.(microsoft\.)?com$|^copilot$/, label: 'Copilot' },
  { match: /(^|\.)deepseek\.com$/, label: 'DeepSeek' },
  { match: /(^|\.)meta\.ai$/, label: 'Meta AI' },
  { match: /(^|\.)grok\.com$/, label: 'Grok' },
  { match: /(^|\.)you\.com$/, label: 'You.com' }
]

export const aiSourceOf = (sourceMedium: string): { key: string; label: string; channelId?: InsightChannelId } => {
  const host = sourceMedium.split(' / ')[0]!.trim().toLowerCase()
  const channel = AI_SOURCE_CHANNELS.find(entry => entry.match.test(host))

  if (channel) return { key: channel.channelId, label: channel.label, channelId: channel.channelId }

  // Un asistente con varios hosts (copilot.com y copilot.microsoft.com) es UNA fila: la clave sale de su nombre.
  const named = AI_SOURCE_LABELS.find(entry => entry.match.test(host))
  const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

  return { key: (named ? slug(named.label) : slug(host)) || 'otro', label: named?.label ?? host }
}

export interface Ga4WindowRead {
  result: Ga4AnalyticsResult
}

/** Una consulta por ventana: sesiones por canal por defecto y fuente/medio. */
export const readGa4ChannelWindow = (organizationId: string, window: ResolvedInsightWindow): Promise<Ga4AnalyticsResult> =>
  readGa4Analytics(organizationId, {
    startDate: window.start,
    endDate: window.endInclusive,
    dimensions: ['sessionDefaultChannelGroup', 'sessionSourceMedium'],
    metrics: ['sessions', 'engagedSessions']
  })

export interface Ga4FactsOutput {
  facts: EvidenceFactV1[]
  rejections: EvidenceRejectionV1[]
  source: EvidenceSourceV1 | null
}

const rejectionOf = (module: InsightModule, result: Extract<Ga4AnalyticsResult, { ok: false }>): EvidenceRejectionV1[] => {
  if (result.errorCode === 'disabled') return []

  return [
    result.errorCode === 'not_connected'
      ? { module, metricId: 'ga4', reason: 'not_connected', detail: 'Google Analytics 4 no está conectado para la organización' }
      : { module, metricId: 'ga4', reason: 'insufficient_data', detail: `GA4: ${result.errorCode}` }
  ]
}

const baseFor = (module: InsightModule, organizationId: string, propertyId: string, window: ResolvedInsightWindow, population: string) => ({
  factVersion: 'evidence_fact_v1' as const,
  module,
  population,
  source: `ga4:property/${propertyId}`,
  method: GA4_METHOD,
  coverage: { kind: 'complete' as const, ratio: null, populationSize: null },
  freshness: { asOf: new Date().toISOString() },
  observation: 'observed' as const,
  window: evidenceWindow(window, 'period'),
  evidenceRef: `ga4:${organizationId}:${propertyId}:${window.start}_${window.endExclusive}`
})

const sourceFor = (module: InsightModule, window: ResolvedInsightWindow, asOf: string): EvidenceSourceV1 => ({
  module,
  adapterVersion: GA4_ADAPTER_VERSION,
  reader: 'readGa4Analytics',
  asOf,
  method: GA4_METHOD,
  coverage: { kind: 'complete', ratio: null, populationSize: null },
  servedWindow: { start: window.start, endExclusive: window.endExclusive, granularity: 'period', partial: window.partial }
})

const sumWhere = (rows: Extract<Ga4AnalyticsResult, { ok: true }>['rows'], channel: string, metric: 'sessions' | 'engagedSessions'): number =>
  rows.filter(row => row.dimensions.sessionDefaultChannelGroup === channel).reduce((sum, row) => sum + (row.metrics[metric] ?? 0), 0)

/**
 * SEO — visitas orgánicas al sitio y cuántas de ellas interactuaron (sesiones con interacción de GA4). «Organic Search»
 * de GA4 incluye todos los buscadores, no sólo Google: por eso estos hechos no llevan el canal `google`.
 */
export const ga4OrganicFacts = (organizationId: string, window: ResolvedInsightWindow, result: Ga4AnalyticsResult, comparisonIds: Record<string, string | null>): Ga4FactsOutput => {
  if (!result.ok) return { facts: [], rejections: rejectionOf('seo', result), source: null }

  const sessions = sumWhere(result.rows, ORGANIC_SEARCH, 'sessions')
  const engaged = sumWhere(result.rows, ORGANIC_SEARCH, 'engagedSessions')
  const base = baseFor('seo', organizationId, result.propertyId, window, GH_INSIGHTS.ga4.organicPopulation)

  const facts: EvidenceFactV1[] = [
    { ...base, factId: factId('seo', 'site.organic_sessions', window), metricId: 'site.organic_sessions', label: GH_INSIGHTS.metrics['site.organic_sessions']!, value: sessions, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds['site.organic_sessions'] ?? null },
    { ...base, factId: factId('seo', 'site.organic_engaged_sessions', window), metricId: 'site.organic_engaged_sessions', label: GH_INSIGHTS.metrics['site.organic_engaged_sessions']!, value: engaged, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds['site.organic_engaged_sessions'] ?? null }
  ]

  return { facts, rejections: [], source: sourceFor('seo', window, base.freshness.asOf) }
}

/**
 * AEO — visitas que llegaron desde asistentes de IA (canal «AI Assistant» de GA4) y de cuáles. Es la otra mitad de la
 * visibilidad en IA: el Grader dice si la nombran; esto, cuánta gente llega por esa vía. Los asistentes se comparan con
 * el período anterior por clave estable (`ai_source.<asistente>`), no por posición en el ranking.
 */
export const ga4AiFacts = (organizationId: string, window: ResolvedInsightWindow, result: Ga4AnalyticsResult, comparisonIds: Record<string, string | null>, editorialV2: boolean): Ga4FactsOutput => {
  if (!result.ok) return { facts: [], rejections: rejectionOf('aeo', result), source: null }

  const rows = result.rows.filter(row => row.dimensions.sessionDefaultChannelGroup === AI_ASSISTANT)
  const total = rows.reduce((sum, row) => sum + (row.metrics.sessions ?? 0), 0)
  const base = baseFor('aeo', organizationId, result.propertyId, window, GH_INSIGHTS.ga4.aiPopulation)

  const facts: EvidenceFactV1[] = [
    { ...base, factId: factId('aeo', 'ai_sessions', window), metricId: 'ai_sessions', label: GH_INSIGHTS.metrics.ai_sessions!, value: total, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds.ai_sessions ?? null }
  ]

  // Por asistente sólo con contrato v2 (figura propia), para que la evidencia v1 quede mínima.
  if (editorialV2 && total > 0) {
    const bySource = new Map<string, { label: string; channelId?: InsightChannelId; sessions: number }>()

    for (const row of rows) {
      const source = aiSourceOf(row.dimensions.sessionSourceMedium ?? '')
      const entry = bySource.get(source.key) ?? { label: source.label, channelId: source.channelId, sessions: 0 }

      entry.sessions += row.metrics.sessions ?? 0
      bySource.set(source.key, entry)
    }

    ;[...bySource.entries()]
      .filter(([, entry]) => entry.sessions > 0)
      .sort((a, b) => b[1].sessions - a[1].sessions || (a[0] < b[0] ? -1 : 1))
      .slice(0, AI_SOURCE_LIMIT)
      .forEach(([key, entry]) => {
        const metricId = `ai_source.${key}`

        facts.push({ ...base, factId: factId('aeo', metricId, window), metricId, label: entry.label, value: entry.sessions, unit: 'count', numerator: entry.sessions, denominator: total, comparisonFactId: comparisonIds[metricId] ?? null, dimension: { assistant: entry.label }, ...(entry.channelId ? { channelId: entry.channelId } : {}) })
      })
  }

  return { facts, rejections: [], source: sourceFor('aeo', window, base.freshness.asOf) }
}
