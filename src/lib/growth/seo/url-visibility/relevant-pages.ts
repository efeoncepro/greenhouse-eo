/**
 * TASK-1776 — "¿Qué páginas y qué subdominios concentran el tráfico?" — colectores on-demand
 * sobre DataForSEO Labs `relevant_pages` y `subdomains`.
 *
 * NO corren en el cron (decisión OQ3: correrlos siempre añadiría costo fijo por corrida). Son
 * primitives bajo demanda: el drill-down natural después de mirar la foto de dominio de un
 * competidor. Cada página devuelta se persiste como fila `subject_kind='url'` y cada
 * subdominio como `subject_kind='subdomain'`, en la MISMA tabla del hecho (multi-productor).
 *
 * Contrato de gasto: mismo patrón que la captura directa — frescura por corrida, gate de
 * entitlement, fila-marcador con NULLs cuando el proveedor no conoce el dominio, ledger en el
 * transporte. El `limit` es la palanca de costo (cada fila devuelta se cobra).
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { parseDomainOverviewSide, type DomainRankOverviewSideRaw } from '../domain-overview/capture'
import { normalizeOverviewDomain } from '../domain-overview/persist'
import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoModuleEnabled, isSeoUrlVisibilityEnabled } from '../flags'
import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../provider-pricing'
import { estimateUrlVisibilityCost, resolveRowLimit } from './capture'
import {
  buildNullVisibilitySnapshot,
  persistUrlVisibilitySnapshots,
  URL_VISIBILITY_FRESHNESS_DAYS,
  type SeoUrlVisibilitySnapshotInput,
  type SeoUrlVisibilitySourceEndpoint
} from './persist'

const asNonNegativeInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return Math.round(value)
}

/** Normaliza un `page_address` absoluto a la clave `host+path` (la raíz queda como el host). */
export const normalizePageAddress = (pageAddress: string): string | null => {
  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(pageAddress) ? pageAddress : `https://${pageAddress}`
    )

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')

    return `${host}${path}`
  } catch {
    return null
  }
}

/** Shape del item de `relevant_pages` (doc as-of 2026-08-27). */
export interface RelevantPageItemRaw {
  page_address?: string | null
  metrics?: {
    organic?: DomainRankOverviewSideRaw | null
    paid?: DomainRankOverviewSideRaw | null
  } | null
}

/** Shape del item de `subdomains` (doc as-of 2026-08-27). */
export interface SubdomainItemRaw {
  subdomain?: string | null
  metrics?: {
    organic?: DomainRankOverviewSideRaw | null
    paid?: DomainRankOverviewSideRaw | null
  } | null
}

const projectSideMetrics = (metrics: {
  organic?: DomainRankOverviewSideRaw | null
  paid?: DomainRankOverviewSideRaw | null
} | null | undefined) => {
  const organic = parseDomainOverviewSide(metrics?.organic)
  const paid = parseDomainOverviewSide(metrics?.paid)

  return {
    organic,
    paid: { count: paid.count, etv: paid.etv },
    // `count` del agregado = SERPs del top-100 donde aparece el sujeto.
    totalRankedKeywords: asNonNegativeInt(metrics?.organic?.count)
  }
}

/**
 * ¿Hay una corrida de este colector para el dominio dentro del ciclo? La corrida deja filas
 * de sus sujetos hijos (`host/path` para páginas, `sub.host` para subdominios) o la
 * fila-marcador del propio dominio cuando el proveedor no lo conoce.
 */
const hasFreshRunForDomain = async (input: {
  normalizedDomain: string
  locationCode: string
  languageCode: string
  sourceEndpoint: SeoUrlVisibilitySourceEndpoint
}): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ found: number }>(
    `SELECT 1 AS found
       FROM greenhouse_growth.seo_url_visibility_snapshots
      WHERE source_endpoint = $1
        AND location_code = $2
        AND language_code = $3
        AND (
              normalized_subject = $4
           OR normalized_subject LIKE $4 || '/%'
           OR normalized_subject LIKE '%.' || $4
            )
        AND (CURRENT_DATE - capture_date) < $5
      LIMIT 1`,
    [input.sourceEndpoint, input.locationCode, input.languageCode, input.normalizedDomain, URL_VISIBILITY_FRESHNESS_DAYS]
  )

  return rows.length > 0
}

export type PageConcentrationStatus = 'captured' | 'fresh' | 'no_market_data' | 'provider_error'

export type CapturePageConcentrationResult =
  | {
      ok: true
      organizationId: string
      domain: string
      status: PageConcentrationStatus
      rowsWritten: number
      costUsd: number
      items: Array<{ subject: string; organicEtv: number | null; organicCount: number | null }>
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'invalid_domain'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
        | 'quota_exhausted'
        | 'provider_error'
      status: null
    }

const runConcentrationCapture = async (input: {
  organizationId: string
  domain: string
  locationCode: string
  languageCode: string
  rowLimit?: number
  endpoint: '/v3/dataforseo_labs/google/relevant_pages/live' | '/v3/dataforseo_labs/google/subdomains/live'
  sourceEndpoint: Extract<SeoUrlVisibilitySourceEndpoint, 'relevant_pages' | 'subdomains'>
}): Promise<CapturePageConcentrationResult> => {
  if (!isSeoModuleEnabled() || !isSeoUrlVisibilityEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  // El path se valida sobre el CRUDO: normalizeOverviewDomain lo recorta y el guard sería
  // código muerto — un caller que pasa `cliente.cl/blog` quiso otra clase de sujeto.
  const rawWithoutScheme = input.domain.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')

  if (rawWithoutScheme.replace(/\/$/, '').includes('/')) {
    return { ok: false, errorCode: 'invalid_domain', status: null }
  }

  const normalizedDomain = normalizeOverviewDomain(input.domain)

  if (!normalizedDomain) {
    return { ok: false, errorCode: 'invalid_domain', status: null }
  }

  const freshRun = await hasFreshRunForDomain({
    normalizedDomain,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    sourceEndpoint: input.sourceEndpoint
  })

  if (freshRun) {
    return {
      ok: true,
      organizationId: input.organizationId,
      domain: normalizedDomain,
      status: 'fresh',
      rowsWritten: 0,
      costUsd: 0,
      items: []
    }
  }

  const rowLimit = Math.min(
    input.rowLimit && input.rowLimit > 0 ? Math.floor(input.rowLimit) : resolveRowLimit(),
    1000
  )

  const { estimatedCostUsd } = estimateUrlVisibilityCost(1, rowLimit)

  const gate = await enforceSeoRunEntitlement(input.organizationId, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    const reason = gate.blockedReason

    return {
      ok: false,
      errorCode:
        reason === 'expired' || reason === 'budget_exhausted' || reason === 'quota_exhausted' ? reason : 'no_entitlement',
      status: null
    }
  }

  try {
    const response = await postDataForSeoTask({
      family: 'labs',
      endpoint: input.endpoint,
      organizationId: input.organizationId,
      tasks: [
        {
          target: normalizedDomain,
          location_code: Number(input.locationCode),
          language_code: input.languageCode,
          item_types: ['organic', 'paid'],
          limit: rowLimit,
          order_by: ['metrics.organic.etv,desc']
        }
      ]
    })

    const providerCostUsd = response.cost ?? 0

    const task = (response.tasks?.[0] ?? {}) as {
      status_code?: number
      result?: Array<{ items?: Array<RelevantPageItemRaw & SubdomainItemRaw> | null }>
    }

    if (!response.ok || task.status_code !== 20000) {
      return { ok: false, errorCode: 'provider_error', status: null }
    }

    const items = task.result?.[0]?.items ?? []
    const snapshots: SeoUrlVisibilitySnapshotInput[] = []
    const resultItems: Array<{ subject: string; organicEtv: number | null; organicCount: number | null }> = []
    const seen = new Set<string>()

    for (const item of items ?? []) {
      const rawSubject =
        input.sourceEndpoint === 'relevant_pages'
          ? typeof item.page_address === 'string'
            ? item.page_address
            : ''
          : typeof item.subdomain === 'string'
            ? item.subdomain
            : ''

      if (!rawSubject) continue

      const normalized =
        input.sourceEndpoint === 'relevant_pages'
          ? normalizePageAddress(rawSubject)
          : rawSubject.trim().toLowerCase()

      if (!normalized || seen.has(normalized)) continue

      seen.add(normalized)

      const metrics = projectSideMetrics(item.metrics)

      snapshots.push({
        subjectKind: input.sourceEndpoint === 'relevant_pages' ? 'url' : 'subdomain',
        normalizedSubject: normalized,
        rawSubject,
        locationCode: input.locationCode,
        languageCode: input.languageCode,
        sourceEndpoint: input.sourceEndpoint,
        organic: metrics.organic,
        paid: metrics.paid,
        totalRankedKeywords: metrics.totalRankedKeywords,
        topKeywords: null
      })

      resultItems.push({
        subject: normalized,
        organicEtv: metrics.organic.etv,
        organicCount: metrics.organic.count
      })
    }

    if (snapshots.length === 0) {
      // Proveedor OK sin items: fila-marcador del dominio para no re-comprar el ciclo.
      await persistUrlVisibilitySnapshots({
        snapshots: [
          buildNullVisibilitySnapshot({
            subjectKind: 'domain',
            normalizedSubject: normalizedDomain,
            rawSubject: input.domain,
            locationCode: input.locationCode,
            languageCode: input.languageCode,
            sourceEndpoint: input.sourceEndpoint
          })
        ],
        capturedByOrganizationId: input.organizationId,
        providerCostUsd
      })

      return {
        ok: true,
        organizationId: input.organizationId,
        domain: normalizedDomain,
        status: 'no_market_data',
        rowsWritten: 1,
        costUsd: Number(providerCostUsd.toFixed(6)),
        items: []
      }
    }

    const { rowsWritten } = await persistUrlVisibilitySnapshots({
      snapshots,
      capturedByOrganizationId: input.organizationId,
      providerCostUsd
    })

    return {
      ok: true,
      organizationId: input.organizationId,
      domain: normalizedDomain,
      status: 'captured',
      rowsWritten,
      costUsd: Number(providerCostUsd.toFixed(6)),
      items: resultItems
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: `seo_url_visibility_${input.sourceEndpoint}` },
      extra: { organizationId: input.organizationId, domain: normalizedDomain }
    })

    return { ok: false, errorCode: 'provider_error', status: null }
  }
}

/** "¿Qué URLs concentran el ETV de este dominio?" — cada página queda como fila `url`. */
export const captureRelevantPages = async (input: {
  organizationId: string
  domain: string
  locationCode: string
  languageCode: string
  rowLimit?: number
}): Promise<CapturePageConcentrationResult> =>
  runConcentrationCapture({
    ...input,
    endpoint: '/v3/dataforseo_labs/google/relevant_pages/live',
    sourceEndpoint: 'relevant_pages'
  })

/** "¿Cuál de sus subdominios pesa?" — cada subdominio queda como fila `subdomain`. */
export const captureSubdomains = async (input: {
  organizationId: string
  domain: string
  locationCode: string
  languageCode: string
  rowLimit?: number
}): Promise<CapturePageConcentrationResult> =>
  runConcentrationCapture({
    ...input,
    endpoint: '/v3/dataforseo_labs/google/subdomains/live',
    sourceEndpoint: 'subdomains'
  })

/** Referencia de costo del colector (documentación viva para previews). */
export const CONCENTRATION_COST_NOTE = `USD ${LABS_TASK_SETUP_USD} por corrida + USD ${LABS_RESULT_ROW_USD} por fila devuelta`
