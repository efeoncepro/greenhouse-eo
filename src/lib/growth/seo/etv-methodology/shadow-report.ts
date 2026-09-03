/**
 * TASK-1806 Slice 2 — LECTOR de evidencia del shadow + benchmark GSC + composición del resultado.
 *
 * Esta capa NUNCA llama a DataForSEO. Lee lo que el ejecutor bounded (Slice 1) dejó en las tablas
 * formula-aware de `TASK-1805` (`seo_domain_overview_snapshots`, `seo_url_visibility_snapshots`) y en su
 * `summary.json` (latencia, costo, equivalencia de inputs, celda prospecto que NO persiste), trae AMBAS
 * metodologías del mismo `capture_date` por separado (jamás una serie mixta) y las proyecta a
 * `EtvComparableSnapshot` para que el decisor puro (`shadow-decision.ts`) aplique el preregistro.
 *
 * GSC (first-party) se lee por organización propia con propiedad activa: ventana de 28 días terminando 2
 * días antes de la fecha de evaluación (GSC no publica D-1), país = mercado, todos los dispositivos, y se
 * normaliza a mensual con el factor declarado 30/28. Se compara, nunca se promedia.
 *
 * 🔴 Ninguna consulta selecciona `captured_by_organization_id`, `provider_cost` ni payloads.
 */

import 'server-only'

import { getSearchConsoleConnection } from '@/lib/growth/search-console/connection-store'
import { readSearchConsoleAnalytics } from '@/lib/growth/search-console/reader'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { ETV_IMPROVED_METHODOLOGY, ETV_LEGACY_METHODOLOGY, isEtvHistoricalCalculationBasis, type EtvHistoricalCalculationBasis, type EtvMethodologyVersion } from './contracts'
import type { EtvComparableSnapshot, EtvComparableTopItem, EtvEvaluationMode } from './evaluator'
import {
  decideEtvShadow,
  deriveEtvShadowOperability,
  evaluateEtvShadowCell,
  normalizeEtvShadowSubject,
  PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03,
  resolveEtvShadowGscWindow,
  resolveEtvShadowSubjectRole,
  type EtvShadowCellEvaluation,
  type EtvShadowCellInput,
  type EtvShadowCohort,
  type EtvShadowCohortCell,
  type EtvShadowGscWindow,
  type EtvShadowHistoricalSeries,
  type EtvShadowRunSummary,
  type EtvShadowThresholds
} from './shadow-decision'
import { renderEtvShadowReportMarkdown, type EtvShadowEvaluationResult, type EtvShadowLatencySummary } from './shadow-report-markdown'

export { renderEtvShadowReportMarkdown }
export type { EtvShadowEvaluationResult }

// ─── Evidencia persistida ────────────────────────────────────────────────────────────────────

type MethodSlot<T> = { legacy: T | null; improved: T | null }

const emptySlot = <T>(): MethodSlot<T> => ({ legacy: null, improved: null })

const slotKey = (version: string): keyof MethodSlot<unknown> | null =>
  version === ETV_LEGACY_METHODOLOGY ? 'legacy' : version === ETV_IMPROVED_METHODOLOGY ? 'improved' : null

const asNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIso = (value: Date | string | null): string | null => {
  if (value === null) return null

  return value instanceof Date ? value.toISOString() : String(value)
}

const toIsoDate = (value: Date | string): string => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10))

/** Evidencia proyectada de una celda (o de un target de la celda bulk). */
export type EtvShadowEvidenceCell = {
  cellIndex: number
  cell: EtvShadowCohortCell
  /** Sujeto normalizado que se evalúa (la celda bulk se expande en un item por target). */
  subject: string
  snapshots: MethodSlot<EtvComparableSnapshot>
  hasData: MethodSlot<boolean>
  evidence: MethodSlot<string>
  historical: EtvShadowHistoricalSeries | null
}

type DomainRow = {
  etv_methodology_version: string
  etv_methodology_evidence: string
  etv_historical_basis: string | null
  capture_date: Date | string
  captured_at: Date | string
  organic_etv: string | null
  paid_etv: string | null
  organic_count: number | null
  organic_estimated_paid_traffic_cost: string | null
}

const domainRowHasData = (row: DomainRow): boolean =>
  row.organic_count !== null || row.organic_etv !== null || row.paid_etv !== null || row.organic_estimated_paid_traffic_cost !== null

const projectDomainRow = (row: DomainRow, methodology: EtvMethodologyVersion, topItems: EtvComparableTopItem[] = []): EtvComparableSnapshot => ({
  methodology,
  capturedAt: toIso(row.captured_at) ?? toIsoDate(row.capture_date),
  organicEtv: asNumber(row.organic_etv),
  paidEtv: asNumber(row.paid_etv),
  organicEstimatedTrafficCostUsd: asNumber(row.organic_estimated_paid_traffic_cost),
  organicCount: row.organic_count,
  topItems,
  historicalBasis: isEtvHistoricalCalculationBasis(row.etv_historical_basis) ? row.etv_historical_basis : null
})

/** Foto de dominio / screening: una fila por método en el `capture_date` (UNIQUE formula-aware). */
const readDomainOverviewEvidence = async (input: {
  subject: string
  locationCode: string
  languageCode: string
  sourceEndpoint: 'domain_rank_overview' | 'bulk_traffic_estimation'
  captureDate: string
}): Promise<Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence'>> => {
  const rows = await runGreenhousePostgresQuery<DomainRow>(
    `SELECT etv_methodology_version, etv_methodology_evidence, etv_historical_basis,
            capture_date, captured_at, organic_etv, paid_etv, organic_count, organic_estimated_paid_traffic_cost
       FROM greenhouse_growth.seo_domain_overview_snapshots
      WHERE normalized_domain = $1
        AND location_code = $2
        AND language_code = $3
        AND source_endpoint = $4
        AND capture_date = $5::date
      ORDER BY etv_methodology_version, captured_at DESC`,
    [input.subject, input.locationCode, input.languageCode, input.sourceEndpoint, input.captureDate]
  )

  const snapshots = emptySlot<EtvComparableSnapshot>()
  const hasData = emptySlot<boolean>()
  const evidence = emptySlot<string>()

  for (const row of rows) {
    const key = slotKey(row.etv_methodology_version)

    if (!key || snapshots[key]) continue

    snapshots[key] = projectDomainRow(row, row.etv_methodology_version as EtvMethodologyVersion)
    hasData[key] = domainRowHasData(row)
    evidence[key] = row.etv_methodology_evidence
  }

  return { snapshots, hasData, evidence }
}

/**
 * Histórico: una fila por mes (capture_date = primer día del mes) y por método dentro del período de la
 * celda. La foto comparable de la celda es el ÚLTIMO mes del período; la serie completa viaja aparte para
 * la regla de discontinuidad (§5.3). Las filas legacy pueden ser anteriores al shadow (evidencia
 * `contract_default_pre_cutoff`, append-only): se declara en el artefacto, no se oculta.
 */
const readHistoricalEvidence = async (input: {
  subject: string
  locationCode: string
  languageCode: string
  fromMonth: string
  toMonth: string
}): Promise<Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence' | 'historical'>> => {
  const rows = await runGreenhousePostgresQuery<DomainRow>(
    `SELECT etv_methodology_version, etv_methodology_evidence, etv_historical_basis,
            capture_date, captured_at, organic_etv, paid_etv, organic_count, organic_estimated_paid_traffic_cost
       FROM greenhouse_growth.seo_domain_overview_snapshots
      WHERE normalized_domain = $1
        AND location_code = $2
        AND language_code = $3
        AND source_endpoint = 'historical_rank_overview'
        AND capture_date BETWEEN $4::date AND $5::date
      ORDER BY etv_methodology_version, capture_date ASC`,
    [input.subject, input.locationCode, input.languageCode, `${input.fromMonth}-01`, `${input.toMonth}-01`]
  )

  const historical: EtvShadowHistoricalSeries = { legacy: [], improved: [] }
  const snapshots = emptySlot<EtvComparableSnapshot>()
  const hasData = emptySlot<boolean>()
  const evidence = emptySlot<string>()

  for (const row of rows) {
    const key = slotKey(row.etv_methodology_version)

    if (!key) continue

    const month = toIsoDate(row.capture_date).slice(0, 7)

    if (key === 'legacy') {
      historical.legacy.push({ month, organicEtv: asNumber(row.organic_etv) })
    } else {
      historical.improved.push({
        month,
        organicEtv: asNumber(row.organic_etv),
        basis: isEtvHistoricalCalculationBasis(row.etv_historical_basis) ? (row.etv_historical_basis as EtvHistoricalCalculationBasis) : null
      })
    }

    // Último mes del período = foto comparable de la celda (las filas vienen ASC por mes).
    snapshots[key] = projectDomainRow(row, row.etv_methodology_version as EtvMethodologyVersion)
    hasData[key] = (hasData[key] ?? false) || domainRowHasData(row)
    evidence[key] = row.etv_methodology_evidence
  }

  return { snapshots, hasData, evidence, historical }
}

type VisibilityRow = {
  etv_methodology_version: string
  etv_methodology_evidence: string
  subject_kind: string
  normalized_subject: string
  captured_at: Date | string
  capture_date: Date | string
  organic_etv: string | null
  paid_etv: string | null
  organic_count: number | null
  organic_estimated_paid_traffic_cost: string | null
  total_ranked_keywords: number | null
  top_keywords: unknown
}

const parseTopKeywords = (value: unknown): EtvComparableTopItem[] => {
  const parsed = typeof value === 'string' ? safeJson(value) : value

  if (!Array.isArray(parsed)) return []

  return parsed
    .map(item => (item && typeof item === 'object' ? (item as { keyword?: unknown; etv?: unknown }) : null))
    .filter((item): item is { keyword?: unknown; etv?: unknown } => item !== null && typeof item.keyword === 'string')
    .map(item => ({ subject: String(item.keyword), etv: typeof item.etv === 'number' && Number.isFinite(item.etv) ? item.etv : null }))
}

const safeJson = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/** `ranked_keywords` (visibilidad): fila `domain` del sujeto; top-N = `top_keywords` (heredan la fórmula del padre). */
const readRankedKeywordsEvidence = async (input: {
  subject: string
  locationCode: string
  languageCode: string
  captureDate: string
}): Promise<Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence'>> => {
  const rows = await runGreenhousePostgresQuery<VisibilityRow>(
    `SELECT etv_methodology_version, etv_methodology_evidence, subject_kind, normalized_subject,
            captured_at, capture_date, organic_etv, paid_etv, organic_count, organic_estimated_paid_traffic_cost,
            total_ranked_keywords, top_keywords
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE subject_kind = 'domain'
        AND normalized_subject = $1
        AND location_code = $2
        AND language_code = $3
        AND source_endpoint = 'ranked_keywords'
        AND capture_date = $4::date
      ORDER BY etv_methodology_version, captured_at DESC`,
    [input.subject, input.locationCode, input.languageCode, input.captureDate]
  )

  const snapshots = emptySlot<EtvComparableSnapshot>()
  const hasData = emptySlot<boolean>()
  const evidence = emptySlot<string>()

  for (const row of rows) {
    const key = slotKey(row.etv_methodology_version)

    if (!key || snapshots[key]) continue

    snapshots[key] = {
      methodology: row.etv_methodology_version as EtvMethodologyVersion,
      capturedAt: toIso(row.captured_at) ?? toIsoDate(row.capture_date),
      organicEtv: asNumber(row.organic_etv),
      paidEtv: asNumber(row.paid_etv),
      organicEstimatedTrafficCostUsd: asNumber(row.organic_estimated_paid_traffic_cost),
      organicCount: row.organic_count ?? row.total_ranked_keywords,
      topItems: parseTopKeywords(row.top_keywords)
    }
    hasData[key] = row.organic_count !== null || row.organic_etv !== null || row.total_ranked_keywords !== null || row.paid_etv !== null
    evidence[key] = row.etv_methodology_evidence
  }

  return { snapshots, hasData, evidence }
}

/**
 * `relevant_pages` / `subdomains`: cada item es una fila hija (`url` = `host/path`, `subdomain` = `sub.host`)
 * del mismo `capture_date`; la fila-marcador `domain` con NULLs significa "el proveedor no conoce el sujeto".
 * El orden del top-N se reconstruye por `organic_etv DESC NULLS LAST` (el colector ordena provider-side por
 * ETV) con `created_at ASC` como desempate (orden de inserción).
 */
const readConcentrationEvidence = async (input: {
  subject: string
  locationCode: string
  languageCode: string
  sourceEndpoint: 'relevant_pages' | 'subdomains'
  captureDate: string
}): Promise<Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence'>> => {
  const childKind = input.sourceEndpoint === 'relevant_pages' ? 'url' : 'subdomain'

  const rows = await runGreenhousePostgresQuery<VisibilityRow>(
    `SELECT etv_methodology_version, etv_methodology_evidence, subject_kind, normalized_subject,
            captured_at, capture_date, organic_etv, paid_etv, organic_count, organic_estimated_paid_traffic_cost,
            total_ranked_keywords, top_keywords
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE source_endpoint = $1
        AND location_code = $2
        AND language_code = $3
        AND capture_date = $4::date
        AND (
              (subject_kind = $5 AND (normalized_subject = $6 OR normalized_subject LIKE $6 || '/%' OR normalized_subject LIKE '%.' || $6))
           OR (subject_kind = 'domain' AND normalized_subject = $6)
            )
      ORDER BY etv_methodology_version, organic_etv DESC NULLS LAST, created_at ASC`,
    [input.sourceEndpoint, input.locationCode, input.languageCode, input.captureDate, childKind, input.subject]
  )

  const snapshots = emptySlot<EtvComparableSnapshot>()
  const hasData = emptySlot<boolean>()
  const evidence = emptySlot<string>()
  const items: MethodSlot<EtvComparableTopItem[]> = { legacy: null, improved: null }
  const markers: MethodSlot<VisibilityRow> = emptySlot<VisibilityRow>()

  for (const row of rows) {
    const key = slotKey(row.etv_methodology_version)

    if (!key) continue

    if (row.subject_kind === 'domain') {
      markers[key] = row
      continue
    }

    items[key] = [...(items[key] ?? []), { subject: row.normalized_subject, etv: asNumber(row.organic_etv) }]
    evidence[key] = evidence[key] ?? row.etv_methodology_evidence

    if (!snapshots[key]) {
      snapshots[key] = {
        methodology: row.etv_methodology_version as EtvMethodologyVersion,
        capturedAt: toIso(row.captured_at) ?? toIsoDate(row.capture_date),
        organicEtv: null,
        paidEtv: null,
        organicEstimatedTrafficCostUsd: null,
        organicCount: null,
        topItems: []
      }
    }
  }

  for (const key of ['legacy', 'improved'] as const) {
    const list = items[key]

    if (list && snapshots[key]) {
      snapshots[key] = { ...(snapshots[key] as EtvComparableSnapshot), topItems: list, organicCount: list.length }
      hasData[key] = list.length > 0
    } else if (markers[key]) {
      const marker = markers[key] as VisibilityRow

      snapshots[key] = {
        methodology: marker.etv_methodology_version as EtvMethodologyVersion,
        capturedAt: toIso(marker.captured_at) ?? toIsoDate(marker.capture_date),
        organicEtv: null,
        paidEtv: null,
        organicEstimatedTrafficCostUsd: null,
        organicCount: null,
        topItems: []
      }
      hasData[key] = false
      evidence[key] = marker.etv_methodology_evidence
    }
  }

  return { snapshots, hasData, evidence }
}

/** Prospecto: NO persiste; la evidencia es `prospectTraffic` de las dos requests del `summary.json`. */
const readProspectEvidence = (summary: EtvShadowRunSummary | null, cellIndex: number): Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence'> => {
  const snapshots = emptySlot<EtvComparableSnapshot>()
  const hasData = emptySlot<boolean>()
  const evidence = emptySlot<string>()

  for (const request of summary?.requests ?? []) {
    if (request.cellIndex !== cellIndex || request.purpose !== 'prospect') continue

    const key = slotKey(request.methodology)

    if (!key || snapshots[key]) continue

    const traffic = request.prospectTraffic ?? null

    snapshots[key] = {
      methodology: request.methodology,
      capturedAt: request.requestedAt ?? 'unknown',
      organicEtv: null,
      paidEtv: null,
      organicEstimatedTrafficCostUsd: null,
      organicCount: traffic ? traffic.sampleRows : null,
      topItems: [],
      prospectTraffic: traffic ?? undefined
    }
    hasData[key] = traffic !== null && traffic.sum !== null
    evidence[key] = 'summary_json'
  }

  return { snapshots, hasData, evidence }
}

/** La celda bulk lleva varios targets en un solo request; se evalúa un item por target. */
const resolveCellTargets = (cell: EtvShadowCohortCell): string[] => {
  if (Array.isArray(cell.targets) && cell.targets.length > 0) return cell.targets.map(target => normalizeEtvShadowSubject(String(target)))

  if (cell.familySlug === 'bulk_traffic_estimation') {
    return cell.subject
      .split(/\s*[+,]\s*/)
      .map(normalizeEtvShadowSubject)
      .filter(Boolean)
  }

  return [normalizeEtvShadowSubject(cell.subject)]
}

/**
 * Lee la evidencia persistida de TODAS las celdas de la cohorte para un `capture_date`, ambas metodologías por
 * separado. Cero llamadas al proveedor.
 */
export const readEtvShadowEvidence = async (input: {
  cohort: EtvShadowCohort
  captureDate: string
  summary?: EtvShadowRunSummary | null
}): Promise<EtvShadowEvidenceCell[]> => {
  const out: EtvShadowEvidenceCell[] = []

  for (const [cellIndex, cell] of input.cohort.cells.entries()) {
    const targets = resolveCellTargets(cell)

    for (const subject of targets) {
      const base = { subject, locationCode: cell.locationCode, languageCode: cell.languageCode }

      let evidence: Pick<EtvShadowEvidenceCell, 'snapshots' | 'hasData' | 'evidence'> & { historical?: EtvShadowHistoricalSeries | null }

      if (cell.purpose === 'prospect') {
        evidence = readProspectEvidence(input.summary ?? null, cellIndex)
      } else if (cell.familySlug === 'domain_rank_overview' || cell.familySlug === 'bulk_traffic_estimation') {
        evidence = await readDomainOverviewEvidence({ ...base, sourceEndpoint: cell.familySlug, captureDate: input.captureDate })
      } else if (cell.familySlug === 'historical_rank_overview') {
        const period = cell.period ?? { fromMonth: input.captureDate.slice(0, 7), toMonth: input.captureDate.slice(0, 7) }

        evidence = await readHistoricalEvidence({ ...base, fromMonth: period.fromMonth, toMonth: period.toMonth })
      } else if (cell.familySlug === 'ranked_keywords') {
        evidence = await readRankedKeywordsEvidence({ ...base, captureDate: input.captureDate })
      } else {
        evidence = await readConcentrationEvidence({ ...base, sourceEndpoint: cell.familySlug, captureDate: input.captureDate })
      }

      out.push({
        cellIndex,
        cell,
        subject,
        snapshots: evidence.snapshots,
        hasData: evidence.hasData,
        evidence: evidence.evidence,
        historical: evidence.historical ?? null
      })
    }
  }

  return out
}

// ─── Benchmark GSC ───────────────────────────────────────────────────────────────────────────

export type EtvShadowGscBenchmarkRead =
  | { status: 'comparable'; siteUrl: string; window: EtvShadowGscWindow; windowClicks: number }
  | {
      status: 'not_comparable'
      reason: 'no_organization' | 'not_connected' | 'property_mismatch' | 'country_not_mapped' | 'disabled' | 'token_unhealthy' | 'query_failed'
    }

const siteUrlHost = (siteUrl: string): string =>
  normalizeEtvShadowSubject(siteUrl.startsWith('sc-domain:') ? siteUrl.slice('sc-domain:'.length) : siteUrl)

/**
 * Benchmark GSC por sujeto×mercado: sólo sujetos con organización propia en la cohorte y propiedad activa
 * cuyo host coincide con el sujeto (una organización que capturó competidores no presta su propiedad).
 * Degrada con etiqueta `not_comparable`; nunca inventa clics.
 */
export const readGscBenchmarks = async (input: {
  cohort: EtvShadowCohort
  evaluationDate: string
  thresholds?: EtvShadowThresholds
}): Promise<Map<string, EtvShadowGscBenchmarkRead>> => {
  const thresholds = input.thresholds ?? PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03
  const organizations = new Map(Object.entries(input.cohort.organizations).map(([subject, organizationId]) => [normalizeEtvShadowSubject(subject), organizationId]))
  const markets = new Map<string, { subject: string; locationCode: string }>()

  for (const cell of input.cohort.cells) {
    if (cell.purpose === 'prospect') continue

    for (const subject of resolveCellTargets(cell)) {
      markets.set(`${subject}|${cell.locationCode}`, { subject, locationCode: cell.locationCode })
    }
  }

  const out = new Map<string, EtvShadowGscBenchmarkRead>()

  for (const [key, market] of markets) {
    if (resolveEtvShadowSubjectRole(market.subject, thresholds) === 'competitor') continue

    const organizationId = organizations.get(market.subject)

    if (!organizationId) {
      out.set(key, { status: 'not_comparable', reason: 'no_organization' })
      continue
    }

    const connection = await getSearchConsoleConnection(organizationId)

    if (!connection || connection.status !== 'active' || !connection.siteUrl) {
      out.set(key, { status: 'not_comparable', reason: 'not_connected' })
      continue
    }

    if (siteUrlHost(connection.siteUrl) !== market.subject) {
      out.set(key, { status: 'not_comparable', reason: 'property_mismatch' })
      continue
    }

    const window = resolveEtvShadowGscWindow({ evaluationDate: input.evaluationDate, locationCode: market.locationCode, thresholds })

    if (!window) {
      out.set(key, { status: 'not_comparable', reason: 'country_not_mapped' })
      continue
    }

    const analytics = await readSearchConsoleAnalytics(organizationId, {
      range: { startDate: window.startDate, endDate: window.endDate },
      dimensions: ['country'],
      rowLimit: 250
    })

    if (!analytics.ok) {
      out.set(key, { status: 'not_comparable', reason: analytics.errorCode === 'not_connected' ? 'not_connected' : analytics.errorCode })
      continue
    }

    const row = analytics.rows.find(item => item.keys[0]?.toLowerCase() === window.country)

    out.set(key, { status: 'comparable', siteUrl: analytics.siteUrl, window, windowClicks: row ? row.clicks : 0 })
  }

  return out
}

// ─── Composición ─────────────────────────────────────────────────────────────────────────────

const latencySummary = (summary: EtvShadowRunSummary | null): EtvShadowLatencySummary => {
  const stats = (values: number[]) => ({
    requests: values.length,
    meanMs: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null,
    maxMs: values.length ? Math.max(...values) : null
  })

  const all = (summary?.requests ?? []).map(request => request.latencyMs).filter((value): value is number => typeof value === 'number')

  const by = (methodology: EtvMethodologyVersion) =>
    (summary?.requests ?? [])
      .filter(request => request.methodology === methodology)
      .map(request => request.latencyMs)
      .filter((value): value is number => typeof value === 'number')

  return {
    ...stats(all),
    byMethodology: {
      [ETV_LEGACY_METHODOLOGY]: stats(by(ETV_LEGACY_METHODOLOGY)),
      [ETV_IMPROVED_METHODOLOGY]: stats(by(ETV_IMPROVED_METHODOLOGY))
    } as EtvShadowLatencySummary['byMethodology']
  }
}

const todayUtc = (): string => new Date().toISOString().slice(0, 10)

/**
 * Evalúa el shadow de punta a punta: evidencia persistida + benchmark GSC + `summary.json` → celdas →
 * decisión preregistrada. Cero llamadas al proveedor.
 */
export const evaluateEtvShadow = async (input: {
  cohort: EtvShadowCohort
  captureDate: string
  summary?: EtvShadowRunSummary | null
  evaluationDate?: string
  thresholds?: EtvShadowThresholds
}): Promise<EtvShadowEvaluationResult> => {
  const thresholds = input.thresholds ?? PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03
  const summary = input.summary ?? null
  const evaluationDate = input.evaluationDate ?? todayUtc()
  const mode: EtvEvaluationMode = summary?.mode ?? 'exact_ab'

  const [evidence, gsc] = await Promise.all([
    readEtvShadowEvidence({ cohort: input.cohort, captureDate: input.captureDate, summary }),
    readGscBenchmarks({ cohort: input.cohort, evaluationDate, thresholds })
  ])

  const cells: EtvShadowCellEvaluation[] = evidence.map(item => {
    const role = resolveEtvShadowSubjectRole(item.subject, thresholds)
    const benchmark = gsc.get(`${item.subject}|${item.cell.locationCode}`)

    const gscInput: EtvShadowCellInput['gsc'] =
      item.cell.purpose === 'prospect' || role === 'competitor'
        ? { status: 'not_applicable', reason: 'competitor' }
        : (benchmark ?? { status: 'not_comparable', reason: 'no_organization' })

    return evaluateEtvShadowCell({
      cellIndex: item.cellIndex,
      cell: { ...item.cell, subject: item.subject },
      mode,
      legacy: item.snapshots.legacy,
      improved: item.snapshots.improved,
      legacyHasData: item.hasData.legacy ?? undefined,
      improvedHasData: item.hasData.improved ?? undefined,
      legacyEvidence: item.evidence.legacy,
      improvedEvidence: item.evidence.improved,
      gsc: gscInput,
      historical: item.historical,
      operability: summary ? deriveEtvShadowOperability(summary.requests, item.cellIndex, item.cell.familySlug === 'bulk_traffic_estimation' ? undefined : item.subject) : null,
      thresholds
    })
  })

  const cost = {
    forecastUsd: summary?.totals.forecastUsd ?? 0,
    realUsd: summary?.totals.costUsd ?? 0
  }

  const decision = decideEtvShadow(cells, thresholds, { cost: summary ? cost : undefined })
  const withOperability = cells.filter(cell => cell.operability !== null)
  const inputsEquivalent = withOperability.length > 0 && withOperability.every(cell => cell.operability?.inputsEquivalent === true)

  const gscWindows = [...new Set(cells.filter(cell => cell.gsc?.status === 'comparable').map(cell => (cell.gsc?.status === 'comparable' ? `${cell.gsc.window.startDate}..${cell.gsc.window.endDate} (país ${cell.gsc.window.country})` : '')))]

  return {
    cohortId: input.cohort.id,
    runId: summary?.runId ?? null,
    captureDate: input.captureDate,
    evaluationDate,
    mode,
    thresholds,
    cells,
    decision,
    inputsEquivalent,
    cost,
    latency: latencySummary(summary),
    declarations: [
      'GSC es benchmark first-party: se compara error, dirección y cercanía por celda; NUNCA se promedia GSC con ETV.',
      'Legacy e improved se comparan celda a celda; NUNCA se promedian ni se mezclan en una serie.',
      `Ventana GSC: ${thresholds.gscWindowDays} días terminando ${thresholds.gscLagDays} días antes de la fecha de evaluación (GSC no publica D-1 y consolida ~48h)${
        gscWindows.length ? `: ${gscWindows.join('; ')}` : ' — sin celdas comparables'
      }; país = mercado de la celda; todos los dispositivos.`,
      `Normalización mensual de GSC: clics de la ventana × ${(30 / thresholds.gscWindowDays).toFixed(6)} (30/${thresholds.gscWindowDays}); es un factor declarado, no un promedio.`,
      `Comparabilidad: modo \`${mode}\`; una celda sin ambas fórmulas, con status ≠ 20000 o con inputs no equivalentes es inválida para calibración y queda como evidencia.`,
      `Cambio equivalente de organic.count (§5.2): mismo signo y ≥ ${(thresholds.organicCountEquivalenceMinShare * 100).toFixed(0)} % del cambio relativo de ETV — lectura operativa del preregistro, declarada acá.`,
      'Histórico: la foto comparable de cada celda histórica es el último mes del período; la serie completa por método alimenta la regla de discontinuidad (§5.3). Filas legacy anteriores al shadow (`contract_default_pre_cutoff`) cuentan como legacy y se declaran.',
      'Membresía top-N: orden reconstruido por `organic_etv DESC NULLS LAST` + orden de inserción; `relevant_pages`/`subdomains` no tienen ETV agregado en esta lectura (miden membresía, no magnitud).'
    ]
  }
}
