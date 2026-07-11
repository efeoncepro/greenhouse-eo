/**
 * TASK-1390 — Growth AI Visibility · Deterministic sourceType classifier (ISSUE-120 Gap A).
 *
 * Clasifica el `sourceType` de una citation POR DOMINIO, sin LLM. Antes de esto,
 * ningún eslabón asignaba `sourceType` (los provider adapters emiten `{url,title,domain}`)
 * → `citation_quality` era estructuralmente 0 para toda marca. El clasificador es
 * curable (listas versionadas en código, extensibles por PR) y honesto: sin match
 * → `unknown`, nunca inventa tipo.
 *
 * Reglas de mapeo (vocabulario existente `GROWTH_AI_VISIBILITY_SOURCE_TYPES`):
 *  - `owned`      → mismo sitio que el dominio del sujeto (same-site, subdomain-aware).
 *  - `news`       → prensa (general CL/LATAM/global + especializada del vertical).
 *  - `social`     → redes sociales / UGC social.
 *  - `earned`     → plataformas de review/reputación + referencia de terceros de alta
 *                   autoridad (Wikipedia). SOLO lista curada — earned NO es catch-all
 *                   (inflaría `citation_quality`, que cuenta owned/earned/news como creíbles).
 *  - `directory`  → directorios/guías/agregadores de contenido.
 *  - `marketplace`→ OTAs/plataformas de venta de terceros.
 *  - `unknown`    → todo lo demás (incluye dominios de competidores y gobierno).
 *
 * ISSUE-120 Gap B (same-site): el matching de dominios del pipeline era igualdad
 * exacta — `blog.skyairline.com` ≠ `skyairline.com` perdía la señal owned. Acá vive
 * `isSameSiteDomain`, comparación por sufijo de dominio registrable en ambas
 * direcciones (los dominios ya vienen normalizados sin `www.` por `normalizeDomain`).
 */

import { type GrowthAiVisibilitySourceType } from '../contracts'
import { normalizeDomain } from '../observation'

/**
 * ¿`a` y `b` pertenecen al mismo sitio? Igualdad o relación de subdominio en
 * cualquier dirección (`blog.skyairline.com` ≡ `skyairline.com`). Los inputs se
 * normalizan (lowercase, sin protocolo/path/`www.`); inválidos → false.
 */
export const isSameSiteDomain = (a: string | null | undefined, b: string | null | undefined): boolean => {
  const left = normalizeDomain(a ?? null)
  const right = normalizeDomain(b ?? null)

  if (!left || !right) {
    return false
  }

  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
}

// ── Listas curadas (eTLD+1 sin www; el match es same-site → cubre subdominios como es.trustpilot.com) ──

/** Prensa general CL/LATAM/global + especializada de verticales cubiertos (aviación/turismo/negocios). */
const NEWS_DOMAINS = [
  // Chile / LATAM general
  'biobiochile.cl',
  'df.cl',
  'latercera.com',
  'emol.com',
  't13.cl',
  'cooperativa.cl',
  'adnradio.cl',
  'chocale.cl',
  'pagina7.cl',
  'forbes.cl',
  'forbes.com',
  'infobae.com',
  'clarin.com',
  'lanacion.com.ar',
  'elcomercio.pe',
  'eluniversal.com.mx',
  // Especializada aviación/turismo/negocios
  'ladevi.info',
  'aviacionline.com',
  'elaereo.com',
  'simpleflying.com',
  'aviacionaldia.com',
  'portalinnova.cl',
  // Global
  'reuters.com',
  'bloomberg.com',
  'cnn.com',
  'bbc.com',
  'elpais.com'
] as const

/** Redes sociales / plataformas de UGC social. */
const SOCIAL_DOMAINS = [
  'instagram.com',
  'youtube.com',
  'facebook.com',
  'tiktok.com',
  'reddit.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'pinterest.com',
  'threads.net'
] as const

/**
 * Review/reputación + referencia de terceros de alta autoridad. Curada a propósito:
 * `earned` cuenta como fuente creíble en el scoring — no es un catch-all.
 */
const EARNED_DOMAINS = [
  'trustpilot.com',
  'reclamos.cl',
  'wikipedia.org',
  'airlinequality.com',
  'airlineratings.com',
  'tripadvisor.com',
  'tripadvisor.es',
  'tripadvisor.cl',
  'tripadvisor.co',
  'tripadvisor.com.ar',
  'tripadvisor.com.mx',
  'tripadvisor.com.br',
  'tripadvisor.com.pe'
] as const

/** Directorios/guías/agregadores. */
const DIRECTORY_DOMAINS = [
  'turismocity.cl',
  'turismocity.com.ar',
  'datosmundial.com',
  'visitchile.com',
  'chiletrip.net',
  'conocer.com',
  'quieroviajarsola.com'
] as const

/** OTAs / plataformas de venta de terceros. */
const MARKETPLACE_DOMAINS = [
  'despegar.cl',
  'despegar.com',
  'despegar.com.ar',
  'despegar.com.mx',
  'despegar.com.pe',
  'esky.com',
  'esky.cl',
  'edestinos.com',
  'kayak.com',
  'kayak.cl',
  'expedia.com',
  'expedia.cl',
  'booking.com',
  'skyscanner.com',
  'skyscanner.cl',
  'alternativeairlines.com',
  'viajesfalabella.cl'
] as const

const CURATED_LISTS: ReadonlyArray<readonly [GrowthAiVisibilitySourceType, readonly string[]]> = [
  ['news', NEWS_DOMAINS],
  ['social', SOCIAL_DOMAINS],
  ['earned', EARNED_DOMAINS],
  ['directory', DIRECTORY_DOMAINS],
  ['marketplace', MARKETPLACE_DOMAINS]
]

/**
 * Clasifica el `sourceType` de un dominio citado. `owned` manda (same-site con el
 * dominio del sujeto); después las listas curadas; sin match → `unknown`.
 */
export const classifySourceType = (
  citationDomain: string | null | undefined,
  subjectDomain: string | null | undefined
): GrowthAiVisibilitySourceType => {
  const domain = normalizeDomain(citationDomain ?? null)

  if (!domain) {
    return 'unknown'
  }

  if (subjectDomain && isSameSiteDomain(domain, subjectDomain)) {
    return 'owned'
  }

  for (const [sourceType, list] of CURATED_LISTS) {
    if (list.some(curated => isSameSiteDomain(domain, curated))) {
      return sourceType
    }
  }

  return 'unknown'
}
