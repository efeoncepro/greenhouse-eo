import 'server-only'

/**
 * TASK-1709 Slice 2 — Colector de evidencia de MERCADO del prospecto.
 *
 * Cuatro llamadas al proveedor, todas live, todas sin pedirle acceso a nadie, todas en
 * familias ya permitidas (`labs`, `backlinks`). El tope se validó ANTES de llamar acá
 * (el command hace `enforceProspectDiagnosticBudget` con el forecast del conjunto):
 * este módulo NO reimplementa el gate — sólo ejecuta y reporta el costo real.
 *
 * Cada fuente degrada de forma independiente (una caída de Backlinks no pierde los
 * ranked keywords), y el costo real sale del campo `cost` del proveedor — el ledger
 * lo escribe el TRANSPORTE (por eso el import de `register-provider-spend` es
 * obligatorio: sin él, la primera llamada cobrada LANZA).
 *
 * 🔴 Este módulo NUNCA fetchea el sitio del prospecto ni construye una URL de red:
 * la evidencia de sitio vive en `site-evidence.ts`, delegada al sustrato.
 */

import '../register-provider-spend'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import type { DataForSeoFamily } from '@/lib/ai/dataforseo-families'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProspectSource, ProspectSubject } from './contracts'
import {
  PROSPECT_BACKLINKS_COMPETITORS_ENDPOINT,
  PROSPECT_BACKLINKS_COMPETITORS_LIMIT,
  PROSPECT_COMPETITORS_DOMAIN_ENDPOINT,
  PROSPECT_COMPETITORS_LIMIT,
  PROSPECT_DOMAIN_INTERSECTION_ENDPOINT,
  PROSPECT_LINK_GAP_LIMIT,
  PROSPECT_LINK_GAP_MAX_TARGETS,
  PROSPECT_RANKED_KEYWORDS_ENDPOINT,
  PROSPECT_RANKED_KEYWORDS_LIMIT
} from './contracts'

export interface ProspectSourceOutcome {
  source: ProspectSource
  ok: boolean
  costUsd: number
  items: unknown[]
  errorCode: string | null
}

export interface ProspectMarketEvidence {
  rankedKeywords: ProspectSourceOutcome
  competitorsDomain: ProspectSourceOutcome
  backlinksCompetitors: ProspectSourceOutcome
  domainIntersection: ProspectSourceOutcome
  /** Suma del `cost` real reportado por el proveedor en las llamadas de esta corrida. */
  actualCostUsd: number
}

interface RunCallInput {
  family: DataForSeoFamily
  endpoint: string
  payload: Record<string, unknown>
  source: ProspectSource
  organizationId: string
}

const runCall = async ({ family, endpoint, payload, source, organizationId }: RunCallInput): Promise<ProspectSourceOutcome> => {
  try {
    const response = await postDataForSeoTask({
      family: family as Exclude<DataForSeoFamily, 'serp'>,
      endpoint,
      organizationId,
      tasks: [{ ...payload, tag: `task-1709-prospect` }]
    })

    const task = (response.tasks[0] ?? {}) as {
      status_code?: number
      result?: Array<{ items?: unknown[] }>
    }

    // HTTP 200 con task fallida es provider_error, nunca un resultado vacío legítimo.
    if (!response.ok || task.status_code !== 20000) {
      return {
        source,
        ok: false,
        costUsd: response.cost ?? 0,
        items: [],
        errorCode: response.breakerOpen ? 'breaker_open' : `provider_error_${String(task.status_code ?? response.httpStatus)}`
      }
    }

    const items = task.result?.flatMap(result => result.items ?? []) ?? []

    return { source, ok: true, costUsd: response.cost ?? 0, items, errorCode: null }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_collect' },
      extra: { endpoint, prospectSource: source }
    })

    return { source, ok: false, costUsd: 0, items: [], errorCode: 'transport_error' }
  }
}

/** Dominio de un item de `backlinks/competitors` (shape defensivo). */
const competitorDomainOf = (item: unknown): string | null => {
  if (typeof item !== 'object' || item === null) return null

  const target = (item as Record<string, unknown>).target

  return typeof target === 'string' && target.length > 0 ? target.toLowerCase() : null
}

export interface CollectProspectMarketEvidenceInput {
  subject: ProspectSubject
  /** Org canónica de Efeonce (atribución del gasto de adquisición), resuelta server-side. */
  acquisitionOrganizationId: string
  /** Competidores declarados por el operador; si faltan, salen de `backlinks/competitors`. */
  competitorDomains?: string[]
}

/**
 * Corre las cuatro fuentes de mercado en orden deliberado: los competidores del link gap
 * salen de `backlinks/competitors` (o del caller), así que esa llamada precede a
 * `domain_intersection`. Si no hay competidores, el link gap se OMITE (no hay a quién
 * intersecar) — omitir es más barato y más honesto que inventar targets.
 */
export const collectProspectMarketEvidence = async (
  input: CollectProspectMarketEvidenceInput
): Promise<ProspectMarketEvidence> => {
  const { subject, acquisitionOrganizationId } = input

  const rankedKeywords = await runCall({
    family: 'labs',
    endpoint: PROSPECT_RANKED_KEYWORDS_ENDPOINT,
    source: 'labs_ranked_keywords',
    organizationId: acquisitionOrganizationId,
    payload: {
      target: subject.rootDomain,
      location_code: subject.locationCode,
      language_code: subject.languageCode,
      limit: PROSPECT_RANKED_KEYWORDS_LIMIT,
      item_types: ['organic', 'ai_overview_reference'],
      load_rank_absolute: true
    }
  })

  const competitorsDomain = await runCall({
    family: 'labs',
    endpoint: PROSPECT_COMPETITORS_DOMAIN_ENDPOINT,
    source: 'labs_competitors_domain',
    organizationId: acquisitionOrganizationId,
    payload: {
      target: subject.rootDomain,
      location_code: subject.locationCode,
      language_code: subject.languageCode,
      limit: PROSPECT_COMPETITORS_LIMIT
    }
  })

  const backlinksCompetitors = await runCall({
    family: 'backlinks',
    endpoint: PROSPECT_BACKLINKS_COMPETITORS_ENDPOINT,
    source: 'backlinks_competitors',
    organizationId: acquisitionOrganizationId,
    payload: {
      target: subject.rootDomain,
      limit: PROSPECT_BACKLINKS_COMPETITORS_LIMIT,
      exclude_large_domains: true
    }
  })

  const declaredCompetitors = (input.competitorDomains ?? [])
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0 && domain !== subject.rootDomain)

  const discoveredCompetitors = backlinksCompetitors.items
    .map(competitorDomainOf)
    .filter((domain): domain is string => domain !== null && domain !== subject.rootDomain)

  const linkGapTargets = [...new Set([...declaredCompetitors, ...discoveredCompetitors])].slice(
    0,
    PROSPECT_LINK_GAP_MAX_TARGETS
  )

  const domainIntersection: ProspectSourceOutcome =
    linkGapTargets.length > 0
      ? await runCall({
          family: 'backlinks',
          endpoint: PROSPECT_DOMAIN_INTERSECTION_ENDPOINT,
          source: 'backlinks_domain_intersection',
          organizationId: acquisitionOrganizationId,
          payload: {
            targets: Object.fromEntries(linkGapTargets.map((domain, index) => [String(index + 1), domain])),
            exclude_targets: [subject.rootDomain],
            limit: PROSPECT_LINK_GAP_LIMIT
          }
        })
      : {
          source: 'backlinks_domain_intersection',
          ok: false,
          costUsd: 0,
          items: [],
          errorCode: 'no_competitors_for_link_gap'
        }

  const actualCostUsd = Number(
    [rankedKeywords, competitorsDomain, backlinksCompetitors, domainIntersection]
      .reduce((sum, outcome) => sum + outcome.costUsd, 0)
      .toFixed(6)
  )

  return { rankedKeywords, competitorsDomain, backlinksCompetitors, domainIntersection, actualCostUsd }
}
