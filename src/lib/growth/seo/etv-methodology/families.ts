/**
 * TASK-1805 — Matriz contractual de las 14 familias DataForSEO Labs ETV-capable.
 *
 * Fuente: respuesta directa de DataForSEO del 2026-09-02 (registro en
 * `docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`) cruzada con
 * los callers reales del repo (`docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md` §3).
 *
 * Nueve familias tienen caller: seis familias/SIETE caminos consumen ETV (`ranked_keywords` lo
 * consumen dos caminos: visibilidad por sujeto y diagnóstico de prospecto), tres callers lo ignoran
 * y cinco familias no están habilitadas. Keyword Suggestions/Ideas no devuelven ETV y quedan fuera.
 *
 * 🔴 Regla de ownership: una familia `provider_supported_not_enabled` sólo pasa a `etv_consumed` por
 * su task dueña (`ownerTask`). Ampliar esta matriz desde otra task es la clase de cambio que el test
 * de la matriz existe para rechazar.
 */

import type { EtvFamilyClassification } from './contracts'

export type EtvLabsFamilySlug =
  | 'ranked_keywords'
  | 'serp_competitors'
  | 'relevant_pages'
  | 'subdomains'
  | 'competitors_domain'
  | 'categories_for_domain'
  | 'domain_intersection'
  | 'page_intersection'
  | 'domain_rank_overview'
  | 'historical_rank_overview'
  | 'historical_serps'
  | 'bulk_traffic_estimation'
  | 'historical_bulk_traffic_estimation'
  | 'domain_metrics_by_categories'

export type EtvLabsFamilyDefinition = {
  readonly slug: EtvLabsFamilySlug
  /** Nombre comercial del proveedor, tal como aparece en su matriz. */
  readonly providerName: string
  /** Path Google del endpoint (la variante Bing existe pero Greenhouse no la llama). */
  readonly googleEndpoint: string
  readonly classification: EtvFamilyClassification
  /** Caminos de código que consumen o ignoran ETV (vacío cuando no hay caller). */
  readonly consumerPaths: readonly string[]
  /** Task que gobierna la habilitación cuando no hay caller; null si ya está en uso. */
  readonly ownerTask: string | null
}

const define = (definition: EtvLabsFamilyDefinition): EtvLabsFamilyDefinition => definition

export const ETV_LABS_FAMILIES: readonly EtvLabsFamilyDefinition[] = [
  define({
    slug: 'ranked_keywords',
    providerName: 'Ranked Keywords',
    googleEndpoint: '/v3/dataforseo_labs/google/ranked_keywords/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/url-visibility/capture.ts', 'src/lib/growth/seo/prospect/collect.ts'],
    ownerTask: null
  }),
  define({
    slug: 'serp_competitors',
    providerName: 'SERP Competitors',
    googleEndpoint: '/v3/dataforseo_labs/google/serp_competitors/live',
    classification: 'provider_supported_not_enabled',
    consumerPaths: [],
    ownerTask: 'TASK-1809'
  }),
  define({
    slug: 'relevant_pages',
    providerName: 'Relevant Pages',
    googleEndpoint: '/v3/dataforseo_labs/google/relevant_pages/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/url-visibility/relevant-pages.ts'],
    ownerTask: null
  }),
  define({
    slug: 'subdomains',
    providerName: 'Subdomains',
    googleEndpoint: '/v3/dataforseo_labs/google/subdomains/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/url-visibility/relevant-pages.ts'],
    ownerTask: null
  }),
  define({
    slug: 'competitors_domain',
    providerName: 'Competitors by Domain',
    googleEndpoint: '/v3/dataforseo_labs/google/competitors_domain/live',
    classification: 'etv_ignored',
    consumerPaths: ['src/lib/growth/seo/prospect/collect.ts'],
    ownerTask: null
  }),
  define({
    slug: 'categories_for_domain',
    providerName: 'Categories for Domain',
    googleEndpoint: '/v3/dataforseo_labs/google/categories_for_domain/live',
    classification: 'provider_supported_not_enabled',
    consumerPaths: [],
    ownerTask: 'TASK-1808'
  }),
  define({
    slug: 'domain_intersection',
    providerName: 'Domain Intersection',
    googleEndpoint: '/v3/dataforseo_labs/google/domain_intersection/live',
    classification: 'etv_ignored',
    consumerPaths: ['src/lib/growth/seo/competitor-coverage.ts'],
    ownerTask: null
  }),
  define({
    slug: 'page_intersection',
    providerName: 'Page Intersection',
    googleEndpoint: '/v3/dataforseo_labs/google/page_intersection/live',
    classification: 'provider_supported_not_enabled',
    consumerPaths: [],
    ownerTask: 'TASK-1810'
  }),
  define({
    slug: 'domain_rank_overview',
    providerName: 'Domain Rank Overview',
    googleEndpoint: '/v3/dataforseo_labs/google/domain_rank_overview/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/domain-overview/capture.ts'],
    ownerTask: null
  }),
  define({
    slug: 'historical_rank_overview',
    providerName: 'Historical Rank Overview',
    googleEndpoint: '/v3/dataforseo_labs/google/historical_rank_overview/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/domain-overview/history-backfill.ts'],
    ownerTask: null
  }),
  define({
    slug: 'historical_serps',
    providerName: 'Historical SERPs',
    googleEndpoint: '/v3/dataforseo_labs/google/historical_serps/live',
    classification: 'etv_ignored',
    consumerPaths: ['src/lib/growth/seo/rank-history-seed.ts'],
    ownerTask: null
  }),
  define({
    slug: 'bulk_traffic_estimation',
    providerName: 'Bulk Traffic Estimation',
    googleEndpoint: '/v3/dataforseo_labs/google/bulk_traffic_estimation/live',
    classification: 'etv_consumed',
    consumerPaths: ['src/lib/growth/seo/domain-overview/traffic-estimation.ts'],
    ownerTask: null
  }),
  define({
    slug: 'historical_bulk_traffic_estimation',
    providerName: 'Historical Bulk Traffic Estimation',
    googleEndpoint: '/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live',
    classification: 'provider_supported_not_enabled',
    consumerPaths: [],
    ownerTask: 'TASK-1811'
  }),
  define({
    slug: 'domain_metrics_by_categories',
    providerName: 'Domain Metrics by Categories',
    googleEndpoint: '/v3/dataforseo_labs/google/domain_metrics_by_categories/live',
    classification: 'provider_supported_not_enabled',
    consumerPaths: [],
    ownerTask: 'TASK-1808'
  })
]

const BY_ENDPOINT: ReadonlyMap<string, EtvLabsFamilyDefinition> = new Map(
  ETV_LABS_FAMILIES.map(family => [family.googleEndpoint, family])
)

const BY_SLUG: ReadonlyMap<EtvLabsFamilySlug, EtvLabsFamilyDefinition> = new Map(
  ETV_LABS_FAMILIES.map(family => [family.slug, family])
)

/** Resuelve la familia por path EXACTO del endpoint Google; `null` si no es ETV-capable. */
export const resolveEtvLabsFamilyByEndpoint = (endpoint: string): EtvLabsFamilyDefinition | null =>
  BY_ENDPOINT.get(endpoint) ?? null

export const resolveEtvLabsFamilyBySlug = (slug: EtvLabsFamilySlug): EtvLabsFamilyDefinition => {
  const family = BY_SLUG.get(slug)

  if (!family) throw new Error(`ETV family desconocida: ${slug}`)

  return family
}

export const listEtvLabsFamilies = (classification?: EtvFamilyClassification): readonly EtvLabsFamilyDefinition[] =>
  classification ? ETV_LABS_FAMILIES.filter(family => family.classification === classification) : ETV_LABS_FAMILIES

/**
 * Resumen contractual: 14 familias · 6 consumidas · 7 caminos consumidores · 3 ignoradas · 5 no
 * habilitadas. Lo verifica el test de la matriz y lo sirve el evaluador en su dry-run.
 */
export const summarizeEtvLabsFamilies = () => {
  const consumed = listEtvLabsFamilies('etv_consumed')

  return {
    families: ETV_LABS_FAMILIES.length,
    consumedFamilies: consumed.length,
    consumerPaths: consumed.reduce((total, family) => total + family.consumerPaths.length, 0),
    ignoredCallers: listEtvLabsFamilies('etv_ignored').length,
    notEnabled: listEtvLabsFamilies('provider_supported_not_enabled').length
  }
}
