/**
 * TASK-1709 — Contratos del carril de diagnóstico de prospecto (tier `prospect`).
 *
 * El sujeto es el par (rootDomain, market, language) — NO una organización ni un
 * `seo_target`. Todo dato de este carril nace con lente `estimated` y `capturedAt`:
 * no hay Search Console de un prospecto, así que no existe un solo dato medido
 * (ISSUE-154: presentar un estimado sin marca es el defecto que este contrato
 * hace imposible a nivel de tipo Y de CHECK en DB).
 *
 * El contrato de salida NO tiene campo de score, veredicto, salud, benchmark de
 * mercado ni lift — a propósito: el diagnóstico enumera pérdida cuantificada de ESE
 * dominio, jamás certifica salud ni exhibe cifras prestadas (un template con una
 * cifra mal citada se multiplica por cientos de artefactos).
 *
 * Módulo PURO (sin `server-only`): tipos, vocabularios y el forecast de costo que
 * el preview necesita sin round-trip. Las capacidades de servidor viven en
 * `collect.ts` / `store.ts` / `command.ts`.
 */

import type { SeoFigureShape, SeoLens } from '../lens'
import {
  BACKLINKS_RESULT_ROW_USD,
  BACKLINKS_TASK_SETUP_USD,
  LABS_RESULT_ROW_USD,
  LABS_TASK_SETUP_USD
} from '../provider-pricing'

// ─── Sujeto ──────────────────────────────────────────────────────────────────

export interface ProspectSubject {
  /** Dominio registrable en minúsculas, sin scheme ni path (`acme.cl`). */
  rootDomain: string
  /** Mercado ISO-2 mayúsculas (`CL`). Vocabulario cerrado: `PROSPECT_MARKETS`. */
  market: string
  languageCode: string
  locationCode: number
}

/**
 * Mercados habilitados del carril (ISO-2 → location_code de DataForSEO, que es
 * ISO 3166-1 numérico + 2000). Cerrado a propósito: un mercado nuevo es una decisión
 * comercial que se agrega acá, no un passthrough del caller.
 */
export const PROSPECT_MARKETS: Readonly<
  Record<string, { locationCode: number; languageCode: string; label: string }>
> = {
  CL: { locationCode: 2152, languageCode: 'es', label: 'Chile' },
  MX: { locationCode: 2484, languageCode: 'es', label: 'México' },
  CO: { locationCode: 2170, languageCode: 'es', label: 'Colombia' },
  PE: { locationCode: 2604, languageCode: 'es', label: 'Perú' },
  AR: { locationCode: 2032, languageCode: 'es', label: 'Argentina' },
  ES: { locationCode: 2724, languageCode: 'es', label: 'España' },
  US: { locationCode: 2840, languageCode: 'en', label: 'Estados Unidos' }
} as const

const DOMAIN_PATTERN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * Normaliza la entrada del caller a un sujeto válido, o explica por qué no.
 * Acepta el dominio con o sin scheme/`www.`; NUNCA construye una URL de red acá
 * (este módulo no fetchea — regla dura del carril).
 */
export const resolveProspectSubject = (
  rawDomain: string,
  rawMarket: string
): { ok: true; subject: ProspectSubject } | { ok: false; reason: 'invalid_domain' | 'unsupported_market' } => {
  const market = rawMarket.trim().toUpperCase()
  const marketConfig = PROSPECT_MARKETS[market]

  if (!marketConfig) {
    return { ok: false, reason: 'unsupported_market' }
  }

  let domain = rawDomain.trim().toLowerCase()

  domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '')
  domain = domain.split('/')[0].split('?')[0].split('#')[0].split(':')[0]

  if (!DOMAIN_PATTERN.test(domain)) {
    return { ok: false, reason: 'invalid_domain' }
  }

  return {
    ok: true,
    subject: {
      rootDomain: domain,
      market,
      languageCode: marketConfig.languageCode,
      locationCode: marketConfig.locationCode
    }
  }
}

// ─── Fuentes autorizadas (vocabulario cerrado, espejo del CHECK en DB) ───────

export const PROSPECT_SOURCES = [
  'labs_ranked_keywords',
  'labs_competitors_domain',
  'backlinks_competitors',
  'backlinks_domain_intersection',
  'onpage_reads',
  'site_substrate'
] as const

export type ProspectSource = (typeof PROSPECT_SOURCES)[number]

/**
 * Endpoints del colector — los ÚNICOS cuatro del proveedor que este carril puede
 * tocar (criterio de aceptación: ningún otro endpoint aparece en el código del
 * carril). Todos caen en familias ya permitidas: cero familias nuevas.
 */
export const PROSPECT_RANKED_KEYWORDS_ENDPOINT = '/v3/dataforseo_labs/google/ranked_keywords/live'
export const PROSPECT_COMPETITORS_DOMAIN_ENDPOINT = '/v3/dataforseo_labs/google/competitors_domain/live'
export const PROSPECT_BACKLINKS_COMPETITORS_ENDPOINT = '/v3/backlinks/competitors/live'
export const PROSPECT_DOMAIN_INTERSECTION_ENDPOINT = '/v3/backlinks/domain_intersection/live'

/** Reads OnPage post-crawl (gratis 30 días) — sólo si YA existe un crawl del dominio. */
export const PROSPECT_ONPAGE_SUMMARY_ENDPOINT = '/v3/on_page/summary'

// ─── Límites (cotas de costo: cada fila devuelta cuesta) ─────────────────────

export const PROSPECT_RANKED_KEYWORDS_LIMIT = 1000
export const PROSPECT_COMPETITORS_LIMIT = 25
export const PROSPECT_BACKLINKS_COMPETITORS_LIMIT = 100
export const PROSPECT_LINK_GAP_LIMIT = 500
/** Máximo de competidores que entran al link gap (la API admite 20; acotamos menos). */
export const PROSPECT_LINK_GAP_MAX_TARGETS = 5

// ─── Forecast de costo (peor caso: asume que vuelven todas las filas) ────────

export interface ProspectCostForecast {
  totalUsd: number
  perSource: Record<
    Extract<
      ProspectSource,
      'labs_ranked_keywords' | 'labs_competitors_domain' | 'backlinks_competitors' | 'backlinks_domain_intersection'
    >,
    number
  >
}

/**
 * Costo previsto del CONJUNTO completo de llamadas de mercado. Se valida contra el
 * tope ANTES de la primera llamada (regla dura: si no cabe → `cost_blocked`, cero
 * llamadas). Las fuentes gratis (sustrato propio, reads OnPage post-crawl) no suman.
 */
export const forecastProspectDiagnosticCostUsd = (): ProspectCostForecast => {
  const perSource = {
    labs_ranked_keywords: LABS_TASK_SETUP_USD + PROSPECT_RANKED_KEYWORDS_LIMIT * LABS_RESULT_ROW_USD,
    labs_competitors_domain: LABS_TASK_SETUP_USD + PROSPECT_COMPETITORS_LIMIT * LABS_RESULT_ROW_USD,
    backlinks_competitors: BACKLINKS_TASK_SETUP_USD + PROSPECT_BACKLINKS_COMPETITORS_LIMIT * BACKLINKS_RESULT_ROW_USD,
    backlinks_domain_intersection: BACKLINKS_TASK_SETUP_USD + PROSPECT_LINK_GAP_LIMIT * BACKLINKS_RESULT_ROW_USD
  }

  const totalUsd = Object.values(perSource).reduce((sum, value) => sum + value, 0)

  return { totalUsd: Number(totalUsd.toFixed(4)), perSource }
}

// ─── Hechos ──────────────────────────────────────────────────────────────────

export const PROSPECT_FACT_KINDS = [
  'ranked_keywords_total',
  'ranked_keywords_top10',
  'striking_distance_keywords',
  'ai_overview_citations',
  'estimated_monthly_traffic',
  'competitors_identified',
  'link_gap_referring_domains',
  'site_robots_txt',
  'site_jsonld_blocks',
  'site_sitemap',
  'site_home_observability',
  'site_crawl_blocked',
  'onpage_critical_findings'
] as const

export type ProspectFactKind = (typeof PROSPECT_FACT_KINDS)[number]

export const isProspectFactKind = (value: unknown): value is ProspectFactKind =>
  typeof value === 'string' && (PROSPECT_FACT_KINDS as readonly string[]).includes(value)

/**
 * La lente de este carril admite UN solo valor. El tipo lo fija, el CHECK en DB lo
 * respalda, y el test de contrato falla si alguien agrega otro.
 *
 * TASK-1785 — se estrecha desde el vocabulario CANÓNICO del módulo (`SeoLens`) en vez de
 * declarar su propio literal. No cambia nada de este carril: sigue admitiendo sólo
 * `estimated`. Lo que cambia es que ya no hay dos definiciones de la misma palabra — si
 * mañana el vocabulario canónico se renombra, esto deja de compilar en vez de divergir en
 * silencio.
 */
export type ProspectLens = Extract<SeoLens, 'estimated'>

/**
 * TASK-1709 llegó primero a la forma canónica de una cifra con procedencia; TASK-1785 la
 * generalizó al resto del contrato como `SeoFigureShape`. Este `extends` es lo que impide
 * que las dos vuelvan a divergir: la fuente conserva el vocabulario cerrado de ESTE carril
 * (espejo del CHECK en base), y la forma es la compartida.
 */
export interface ProspectFact extends SeoFigureShape<ProspectSource> {
  kind: ProspectFactKind
  /** `null` = "no lo medimos" — JAMÁS `0` (degradación honesta, invariante del grader). */
  magnitude: number | null
  lens: ProspectLens
  /** Detalle no-numérico del hecho (listas, estados, muestras). */
  detail: Record<string, unknown>
}

// ─── Contrato de salida ──────────────────────────────────────────────────────

export type ProspectDiagnosticStatus = 'running' | 'completed' | 'failed'

export interface ProspectDiagnostic {
  diagnosticId: string
  subject: ProspectSubject
  status: ProspectDiagnosticStatus
  facts: ProspectFact[]
  cost: {
    ceilingUsd: number
    forecastUsd: number
    /** Costo real de la corrida (suma del `cost` del proveedor); null mientras corre. */
    actualUsd: number | null
  }
  provenance: {
    runAt: string
    completedAt: string | null
    createdBy: string
    /** Fuentes que efectivamente aportaron evidencia (las que fallaron no aparecen). */
    sources: ProspectSource[]
  }
  // NO HAY: score, verdict, healthy, benchmark, lift, industryAverage. A propósito.
}

// ─── Evento outbox (constante local al dominio — seam de extracción §17.3) ───

export const SEO_PROSPECT_DIAGNOSTIC_AGGREGATE_TYPE = 'seo_prospect_diagnostic'
export const SEO_PROSPECT_DIAGNOSTIC_COMPLETED_EVENT = 'growth.seo.prospect_diagnostic.completed'
