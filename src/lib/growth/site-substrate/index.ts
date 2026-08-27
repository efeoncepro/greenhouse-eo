/**
 * TASK-1697 — Growth · Site substrate · Barrel (punto de entrada canónico).
 *
 * El sustrato de sitio dice cómo se OBTIENE la evidencia — fetch SSRF-guarded + parseo
 * HTML/robots — y NUNCA cómo se JUZGA (el scoring, los probes y los review gates viven en
 * los dominios). Carta verificable por test de frontera + lint `growth-substrate-boundary`:
 * no importa `growth/*`, no persiste, no conoce organizaciones. Única dependencia
 * transversal permitida: `@/lib/observability/capture`.
 *
 * Consumers autorizados: cualquier módulo bajo `src/lib/growth/**` (grader AEO, SEO,
 * análisis de contenido). Para el dominio AEO los nombres históricos `Probe*` siguen
 * resolviendo vía los shims de `ai-visibility/probes/*`.
 */

export {
  createSiteFetcher,
  resolveSubjectSite,
  isNonPublicResolvedAddress,
  MAX_REDIRECTS,
  GROWTH_PROBE_FETCH_STRICT_NETWORK_FLAG,
  isProbeFetchStrictNetworkEnabled,
  type SiteFetcherDeps,
  type ResolvedAddress
} from './site-fetch'

export {
  type SiteFetchErrorCode,
  type SiteFetchResult,
  type SiteFetchInit,
  type SiteFetcher
} from './contracts'

export {
  extractJsonLdBlocks,
  flattenJsonLdNodes,
  jsonLdTypes,
  analyzeDomSemantics,
  assessHtmlObservability,
  type DomSemanticsSnapshot,
  type HtmlObservabilityAssessment
} from './html'

export { parseRobotsPolicy, isPathAllowed, type RobotsPolicyGroup, type RobotsPolicyRule } from './robots-policy'

export { readBodyWithCap, type CappedBodyRead } from './read-body'
