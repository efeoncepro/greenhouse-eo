/**
 * TASK-1697 — Growth · Site substrate · Contracts (extraídos de `ai-visibility/probes/contracts.ts`).
 *
 * Los 4 tipos del fetcher de sitio, renombrados `Probe*` → `Site*` (§5.4 de la auditoría:
 * "exportarlo con nombres que lo digan — el sustrato no mide nada, trae bytes y los parsea").
 * Los nombres viejos sobreviven como alias re-exportados en `ai-visibility/probes/contracts.ts`
 * para que ningún dependiente cambie una línea. PURO: sin IO, sin imports.
 */

/**
 * Vocabulario cerrado de fallo del fetcher (TASK-1778 agregó los `blocked_*` finos):
 *  - `blocked` — guard de entrada (URL inválida, host no público literal, cross-host).
 *  - `blocked_redirect` — un salto de redirect salió de la familia del sujeto / excedió el tope.
 *  - `blocked_private_address` — el hostname resolvió (DNS) a una dirección no pública.
 *  - `blocked_robots` — el `robots.txt` del sujeto prohíbe la ruta a NUESTRO user-agent
 *    (hallazgo, no fallo: "no pudimos leer porque tu robots.txt lo prohíbe").
 *  - `too_large` — legacy (pre-streaming); el fetcher ya no lo emite, se conserva por compat.
 */
export type SiteFetchErrorCode =
  | 'timeout'
  | 'network'
  | 'blocked'
  | 'blocked_redirect'
  | 'blocked_private_address'
  | 'blocked_robots'
  | 'too_large'
  | 'http_error'

/** Respuesta normalizada del fetcher. NUNCA lanza: un fallo se refleja en `ok=false` + `errorCode`. */
export interface SiteFetchResult {
  ok: boolean
  /** HTTP status; 0 si fue error de red/timeout/bloqueo antes de respuesta. */
  status: number
  /** URL final (tras redirects), para evidencia/diagnóstico. */
  url: string
  /** Cuerpo de texto acotado (truncado a un máximo defensivo). */
  body: string
  contentType: string | null
  errorCode: SiteFetchErrorCode | null
  /**
   * TASK-1778 — `true` cuando el body fue cortado al tope de bytes. ADITIVO: opcional con
   * default `false` (ausente = no truncado) para no romper mocks/consumers existentes; el
   * fetcher real SIEMPRE lo setea. Un probe de PRESENCIA jamás concluye ausencia sobre un
   * cuerpo truncado: "no encontré" en un body parcial significa "no miré todo", no "no está".
   * Los consumers leen `truncated === true`.
   */
  truncated?: boolean
  /**
   * TASK-1778 — ¿la respuesta permite AFIRMAR ausencia? Señales baratas y ASIMÉTRICAS por
   * diseño (sólo pueden RETIRAR una afirmación, nunca agregar una): truncado, shell JS vacío
   * (`<div id="root">` único, `<noscript>` pidiendo JS, razón texto/markup ≈ 0). ADITIVO:
   * opcional con default `true` (ausente = observable); el fetcher real SIEMPRE lo setea.
   * Con `observable === false` los probes de presencia degradan a `skipped`, NUNCA
   * `score: 0`. Los consumers leen `observable === false` (nunca `!observable`, que trataría
   * `undefined` como no-observable e invertiría el default).
   */
  observable?: boolean
}

export interface SiteFetchInit {
  /** Acepta override del Accept header (p.ej. application/xml para sitemap). */
  accept?: string
  /** Timeout por request (ms). El fetcher impone un tope defensivo. */
  timeoutMs?: number
  /** Máximo de bytes a leer del body (defensa anti-payload gigante). */
  maxBytes?: number
  /**
   * TASK-1778 — Override del User-Agent, para variar NUESTRO propio token (p.ej.
   * `GreenhouseAEOGrader-EdgeCheck/1.0`). NUNCA para presentarse como el crawler de un
   * tercero (GPTBot/OAI-SearchBot/PerplexityBot…): suplantar la identidad de otro bot es
   * evasión verificable (WAFs validan por reverse-DNS) y costo reputacional del dominio
   * auditor. Coherente con el matching de robots.txt: se matchea nuestro token, jamás
   * los de los bots que auditamos. Default: `COURTESY_USER_AGENT`.
   */
  userAgent?: string
}

/**
 * Fetcher acotado al dominio del sujeto. Resuelve `path` relativo contra el baseUrl del
 * sujeto y rechaza cross-host / hosts no públicos (SSRF). Inyectable para tests.
 */
export type SiteFetcher = (path: string, init?: SiteFetchInit) => Promise<SiteFetchResult>
