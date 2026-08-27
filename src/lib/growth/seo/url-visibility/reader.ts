/**
 * TASK-1776 — Reader canónico de visibilidad por sujeto-página. ÚNICO consumo: ni la UI, ni
 * Nexa, ni MCP, ni los lanes tocan `seo_url_visibility_snapshots` directo.
 *
 * Contrato de honestidad (§5 de la arquitectura): toda cifra con `lens: 'estimated'` +
 * `capturedAt`; sujeto sin dato → `no_market_data`, jamás ceros fantasma; la posición ◑ de
 * `ranked_keywords` NUNCA se promedia con la posición ● de GSC. 🔴 `captured_by_organization_id`
 * NO se selecciona (un test lo prueba).
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { SeoDomainPositionDistribution } from '../domain-overview/persist'
import { normalizeOverviewDomain } from '../domain-overview/persist'
import type { SeoUrlVisibilitySourceEndpoint, SeoUrlVisibilityTopKeyword } from './persist'
import { resolveVisibilitySubject, type VisibilitySubjectKind } from './resolve-subject'

export const URL_VISIBILITY_DEFAULT_HISTORY_MONTHS = 12
export const URL_VISIBILITY_MAX_HISTORY_MONTHS = 36

export interface UrlVisibilityHistoryPoint {
  /** `YYYY-MM`. */
  month: string
  totalRankedKeywords: number | null
  organicEtv: number | null
  source: SeoUrlVisibilitySourceEndpoint
}

export type ReadUrlVisibilityResult =
  | { ok: false; reason: 'no_market_data' | 'invalid_subject' }
  | {
      ok: true
      subject: string
      kind: VisibilitySubjectKind
      /** ◑ — SIEMPRE 'estimated'; nunca 'measured'. */
      lens: 'estimated'
      capturedAt: string
      source: SeoUrlVisibilitySourceEndpoint
      locationCode: string
      languageCode: string
      /** Universo de keywords ranqueadas del sujeto (total_count del proveedor). */
      totalRankedKeywords: number | null
      organicKeywords: number | null
      organicEtv: number | null
      organicEstimatedTrafficCostUsd: number | null
      paidKeywords: number | null
      paidEtv: number | null
      positionDistribution: SeoDomainPositionDistribution | null
      momentum: { isNew: number | null; isUp: number | null; isDown: number | null; isLost: number | null } | null
      /** Detalle top-N comprado en la captura (sólo `ranked_keywords`). */
      topKeywords: SeoUrlVisibilityTopKeyword[] | null
      history: UrlVisibilityHistoryPoint[]
    }

type SnapshotRow = {
  raw_subject: string
  capture_date: Date | string
  source_endpoint: SeoUrlVisibilitySourceEndpoint
  organic_pos_1: number | null
  organic_pos_2_3: number | null
  organic_pos_4_10: number | null
  organic_pos_11_20: number | null
  organic_pos_21_30: number | null
  organic_pos_31_40: number | null
  organic_pos_41_50: number | null
  organic_pos_51_60: number | null
  organic_pos_61_70: number | null
  organic_pos_71_80: number | null
  organic_pos_81_90: number | null
  organic_pos_91_100: number | null
  organic_count: number | null
  organic_etv: string | null
  organic_estimated_paid_traffic_cost: string | null
  organic_is_new: number | null
  organic_is_up: number | null
  organic_is_down: number | null
  organic_is_lost: number | null
  paid_count: number | null
  paid_etv: string | null
  total_ranked_keywords: number | null
  top_keywords: unknown
}

const asNumber = (value: string | null): number | null => {
  if (value === null) return null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: Date | string): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

/** La captura directa manda sobre los colectores de concentración dentro del mismo mes. */
const SOURCE_PRIORITY: Record<SeoUrlVisibilitySourceEndpoint, number> = {
  ranked_keywords: 3,
  relevant_pages: 2,
  subdomains: 2
}

const hasAnyData = (row: SnapshotRow): boolean =>
  row.organic_count !== null || row.organic_etv !== null || row.total_ranked_keywords !== null || row.paid_etv !== null

const parseTopKeywords = (value: unknown): SeoUrlVisibilityTopKeyword[] | null => {
  const parsed = typeof value === 'string' ? safeJson(value) : value

  if (!Array.isArray(parsed) || parsed.length === 0) return null

  return parsed as SeoUrlVisibilityTopKeyword[]
}

const safeJson = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const readUrlVisibility = async (input: {
  subject: string
  kind: VisibilitySubjectKind | string
  keepQuery?: boolean
  locationCode: string
  languageCode: string
  historyMonths?: number
}): Promise<ReadUrlVisibilityResult> => {
  const resolution = resolveVisibilitySubject({
    subject: input.subject,
    kind: input.kind,
    keepQuery: input.keepQuery
  })

  if (!resolution.ok) return { ok: false, reason: 'invalid_subject' }

  const historyMonths = Math.min(
    Math.max(1, input.historyMonths ?? URL_VISIBILITY_DEFAULT_HISTORY_MONTHS),
    URL_VISIBILITY_MAX_HISTORY_MONTHS
  )

  // 🔴 SIN captured_by_organization_id ni provider_cost.
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT raw_subject, capture_date, source_endpoint,
            organic_pos_1, organic_pos_2_3, organic_pos_4_10, organic_pos_11_20,
            organic_pos_21_30, organic_pos_31_40, organic_pos_41_50, organic_pos_51_60,
            organic_pos_61_70, organic_pos_71_80, organic_pos_81_90, organic_pos_91_100,
            organic_count, organic_etv, organic_estimated_paid_traffic_cost,
            organic_is_new, organic_is_up, organic_is_down, organic_is_lost,
            paid_count, paid_etv, total_ranked_keywords, top_keywords
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE subject_kind = $1
        AND normalized_subject = $2
        AND location_code = $3
        AND language_code = $4
      ORDER BY capture_date DESC
      LIMIT $5`,
    [
      resolution.subject.kind,
      resolution.subject.normalized,
      input.locationCode,
      input.languageCode,
      URL_VISIBILITY_MAX_HISTORY_MONTHS * 2
    ]
  )

  const withData = rows.filter(hasAnyData)

  if (withData.length === 0) return { ok: false, reason: 'no_market_data' }

  const photo = [...withData].sort((a, b) => {
    const dateDiff = toIsoDate(b.capture_date).localeCompare(toIsoDate(a.capture_date))

    if (dateDiff !== 0) return dateDiff

    return SOURCE_PRIORITY[b.source_endpoint] - SOURCE_PRIORITY[a.source_endpoint]
  })[0]

  const byMonth = new Map<string, SnapshotRow>()

  for (const row of withData) {
    const month = toIsoDate(row.capture_date).slice(0, 7)
    const current = byMonth.get(month)

    if (!current || SOURCE_PRIORITY[row.source_endpoint] > SOURCE_PRIORITY[current.source_endpoint]) {
      byMonth.set(month, row)
    }
  }

  const history: UrlVisibilityHistoryPoint[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-historyMonths)
    .map(([month, row]) => ({
      month,
      totalRankedKeywords: row.total_ranked_keywords ?? row.organic_count,
      organicEtv: asNumber(row.organic_etv),
      source: row.source_endpoint
    }))

  const hasPositions = photo.organic_pos_1 !== null || photo.organic_pos_4_10 !== null || photo.organic_pos_11_20 !== null

  return {
    ok: true,
    subject: resolution.subject.normalized,
    kind: resolution.subject.kind,
    lens: 'estimated',
    capturedAt: toIsoDate(photo.capture_date),
    source: photo.source_endpoint,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    totalRankedKeywords: photo.total_ranked_keywords,
    organicKeywords: photo.organic_count,
    organicEtv: asNumber(photo.organic_etv),
    organicEstimatedTrafficCostUsd: asNumber(photo.organic_estimated_paid_traffic_cost),
    paidKeywords: photo.paid_count,
    paidEtv: asNumber(photo.paid_etv),
    positionDistribution: hasPositions
      ? {
          pos1: photo.organic_pos_1,
          pos2_3: photo.organic_pos_2_3,
          pos4_10: photo.organic_pos_4_10,
          pos11_20: photo.organic_pos_11_20,
          pos21_30: photo.organic_pos_21_30,
          pos31_40: photo.organic_pos_31_40,
          pos41_50: photo.organic_pos_41_50,
          pos51_60: photo.organic_pos_51_60,
          pos61_70: photo.organic_pos_61_70,
          pos71_80: photo.organic_pos_71_80,
          pos81_90: photo.organic_pos_81_90,
          pos91_100: photo.organic_pos_91_100
        }
      : null,
    momentum:
      photo.source_endpoint === 'ranked_keywords'
        ? {
            isNew: photo.organic_is_new,
            isUp: photo.organic_is_up,
            isDown: photo.organic_is_down,
            isLost: photo.organic_is_lost
          }
        : null,
    topKeywords: parseTopKeywords(photo.top_keywords),
    history
  }
}

export interface VisibilityConcentrationItem {
  subject: string
  kind: Extract<VisibilitySubjectKind, 'url' | 'subdomain'>
  capturedAt: string
  totalRankedKeywords: number | null
  organicKeywords: number | null
  organicEtv: number | null
  paidEtv: number | null
}

export type ReadVisibilityConcentrationResult =
  | { ok: false; reason: 'no_market_data' | 'invalid_subject' }
  | {
      ok: true
      domain: string
      kind: 'url' | 'subdomain'
      lens: 'estimated'
      capturedAt: string
      items: VisibilityConcentrationItem[]
    }

/**
 * "¿Qué páginas (o subdominios) de este dominio concentran el tráfico?" — la última medición
 * por sujeto hijo, ordenada por ETV. Lee lo que dejaron `relevant_pages`/`subdomains` (y las
 * capturas directas de URLs del mismo host).
 */
export const readVisibilityConcentration = async (input: {
  domain: string
  kind: 'url' | 'subdomain'
  locationCode: string
  languageCode: string
  limit?: number
}): Promise<ReadVisibilityConcentrationResult> => {
  // Mismo guard que el colector: el path se valida sobre el CRUDO (la normalización lo recorta).
  const rawWithoutScheme = input.domain.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')

  if (rawWithoutScheme.replace(/\/$/, '').includes('/')) return { ok: false, reason: 'invalid_subject' }

  const normalizedDomain = normalizeOverviewDomain(input.domain)

  if (!normalizedDomain) return { ok: false, reason: 'invalid_subject' }

  const limit = Math.min(Math.max(1, input.limit ?? 25), 100)

  const rows = await runGreenhousePostgresQuery<{
    normalized_subject: string
    capture_date: Date | string
    total_ranked_keywords: number | null
    organic_count: number | null
    organic_etv: string | null
    paid_etv: string | null
  }>(
    `SELECT DISTINCT ON (normalized_subject)
            normalized_subject, capture_date, total_ranked_keywords,
            organic_count, organic_etv, paid_etv
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE subject_kind = $1
        AND (normalized_subject = $2 OR normalized_subject LIKE $2 || $3 OR normalized_subject LIKE '%.' || $2)
        AND location_code = $4
        AND language_code = $5
        AND (organic_etv IS NOT NULL OR organic_count IS NOT NULL OR total_ranked_keywords IS NOT NULL)
      ORDER BY normalized_subject, capture_date DESC`,
    [input.kind, normalizedDomain, input.kind === 'url' ? '/%' : ' ', input.locationCode, input.languageCode]
  )

  if (rows.length === 0) return { ok: false, reason: 'no_market_data' }

  const items: VisibilityConcentrationItem[] = rows
    .map(row => ({
      subject: row.normalized_subject,
      kind: input.kind,
      capturedAt: toIsoDate(row.capture_date),
      totalRankedKeywords: row.total_ranked_keywords,
      organicKeywords: row.organic_count,
      organicEtv: asNumber(row.organic_etv),
      paidEtv: asNumber(row.paid_etv)
    }))
    .sort((a, b) => (b.organicEtv ?? -1) - (a.organicEtv ?? -1))
    .slice(0, limit)

  const capturedAt = items.reduce(
    (latest, item) => (item.capturedAt > latest ? item.capturedAt : latest),
    items[0].capturedAt
  )

  return { ok: true, domain: normalizedDomain, kind: input.kind, lens: 'estimated', capturedAt, items }
}
