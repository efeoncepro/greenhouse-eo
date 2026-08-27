/**
 * TASK-1697 — Re-export shim. El fetcher de sitio vive en `@/lib/growth/site-substrate`
 * (`site-fetch.ts`, movido con `git mv` para preservar el historial de la guarda SSRF).
 * Este shim conserva los nombres históricos `Probe*` para que ningún dependiente del
 * dominio AEO cambie una línea; NO envuelve — re-exporta alias, cero lógica propia.
 * Retirarlo (reescribiendo los consumers al barrel del sustrato) es follow-up declarado.
 */

export {
  createSiteFetcher as createProbeFetcher,
  resolveSubjectSite,
  isNonPublicResolvedAddress,
  MAX_REDIRECTS,
  type SiteFetcherDeps as ProbeFetcherDeps,
  type ResolvedAddress
} from '@/lib/growth/site-substrate'
