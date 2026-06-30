/**
 * TASK-1266 — Growth AI Visibility · Site Readiness Probe Layer · Contracts (Slice 1).
 *
 * Los probes son una SEGUNDA fuente de evidencia del run-engine, hermana de los
 * provider adapters pero de naturaleza distinta: en vez de preguntarle a un answer
 * engine SOBRE la marca, le hacen preguntas técnicas read-only AL SITIO de la marca
 * (HTTP GET de superficies públicas + render headless opcional). Producen dos ejes
 * ORTOGONALES al score de percepción — `structural` ("¿por qué no te citan?") y
 * `agentic` ("¿te pueden usar los agentes?") — NUNCA fusionados al overall de percepción.
 *
 * Invariantes (PURO; sin IO en este módulo):
 *  - Honest degradation `null ≠ 0`: una señal no medible → `score: null` + `reason`,
 *    excluida del promedio ponderado del eje. NUNCA `score: 0` cuando no se probó.
 *  - Read-only sobre superficies públicas: cero auth, cero mutación, cero endpoint
 *    privado del sitio analizado. El fetcher aplica SSRF guard + timeout + cortesía.
 *  - Probes headless-dependientes (CWV, WebMCP runtime) degradan a `skipped`/`no_headless`
 *    cuando no hay `HeadlessRenderer` inyectado (el runtime Chromium se cablea aparte,
 *    fuera de Vercel; ver `Architecture Alignment` de la task). WebMCP es el techo de la
 *    escala agéntica, no el único camino.
 */

export const PROBE_LAYER_VERSION = 'ai_readiness_probe_v1' as const
export type ProbeLayerVersion = typeof PROBE_LAYER_VERSION

/**
 * Ejes ortogonales al de percepción. NUNCA se fusionan entre sí ni con el overall de
 * percepción. `structural` ("¿por qué no te citan?") y `agentic` ("¿te pueden usar los
 * agentes?") prueban el SITIO del sujeto; `entity` (TASK-1267) prueba el BACKBONE de
 * entidad de la marca EN EL MUNDO (Google Knowledge Graph / Wikidata / Reddit-UGC) —
 * la causa que el eje de percepción `entity_clarity` solo ve reflejada.
 */
export const PROBE_AXES = ['structural', 'agentic', 'entity'] as const
export type ProbeAxis = (typeof PROBE_AXES)[number]

/**
 * Tipos de probe. Estables (alimentan la tabla + el scoring): se declaran TODOS aquí
 * aunque los probes concretos lleguen en Slice 2 (structural) / Slice 3 (agentic).
 */
export const PROBE_KINDS = [
  // Structural AEO (Slice 2) — "¿por qué no te citan?"
  'robots_txt', // acceso de crawlers IA (GPTBot/PerplexityBot/ClaudeBot/Google-Extended/OAI-SearchBot)
  'json_ld', // structured data schema.org en el HTML
  'llms_txt', // llms.txt / llms-full.txt
  'sitemap', // sitemap.xml + canonical discoverability
  'core_web_vitals', // CWV / render (headless — degrada si no hay Chromium)
  // Agentic-web readiness (Slice 3) — "¿te pueden usar los agentes?"
  'well_known_mcp', // .well-known/mcp
  'api_discoverability', // OpenAPI / .well-known/ai-plugin.json discoverability
  'dom_semantics', // DOM semántico / ARIA / landmarks (HTTP-static; full version headless)
  'structured_actions', // potentialAction / SearchAction en JSON-LD
  'webmcp_tools', // navigator.modelContext tools registradas (headless — degrada si no hay Chromium)
  // Entity backbone (TASK-1267) — "¿existe tu entidad en el mundo que los motores razonan?"
  'knowledge_graph', // Google Knowledge Graph API: ¿la marca es entidad conocida? (tipo, descripción)
  'wikidata', // Wikidata/Wikipedia: ¿la marca tiene entrada estructurada? (sitelink + sitio oficial)
  'reddit_ugc' // Reddit/UGC: presencia/menciones de la marca (fuente top de citas de ChatGPT)
] as const
export type ProbeKind = (typeof PROBE_KINDS)[number]

/** Estado del probe (patrón de los provider adapters: SIEMPRE resuelve, NUNCA lanza). */
export const PROBE_STATUSES = ['succeeded', 'skipped', 'failed'] as const
export type ProbeStatus = (typeof PROBE_STATUSES)[number]

/**
 * Resultado producido por un probe (lo que `Probe.run` devuelve). El gatherer lo
 * envuelve con `runId`/`probeKind`/`axis`/`probeLayerVersion`/ids/latencia.
 *  - `succeeded` → `score` 0..100 (medido).
 *  - `skipped` → `score: null` (no aplicable / sin runtime, p.ej. `no_headless`).
 *  - `failed` → `score: null` (error de fetch / parse). El raw error va a observabilidad.
 * `score: null` SIEMPRE queda excluido del promedio del eje (honest degradation).
 */
export interface ProbeOutcome {
  status: ProbeStatus
  /** 0..100 medido, o null (skipped/failed/sin evidencia) → excluido del promedio. */
  score: number | null
  /** Razón renderizable SIEMPRE presente (orienta al operador y al fix-it de TASK-1269). */
  reason: string
  /** Evidencia cruda public-safe (status code, conteos, snippet acotado). NUNCA PII ni secretos. */
  evidence: Record<string, unknown>
  /** Código de error estable cuando `failed`/`skipped` (p.ej. `no_headless`, `timeout`). */
  errorCode?: string | null
}

/** ProbeResult persistido (runtime camelCase, espejo de `grader_probe_results`). */
export interface ProbeResult extends ProbeOutcome {
  probeId: string
  runId: string
  probeKind: ProbeKind
  axis: ProbeAxis
  latencyMs: number
  probeLayerVersion: ProbeLayerVersion
  createdAt: string
}

// ── Fetcher (read-only, SSRF-guarded) ────────────────────────────────────────

export type ProbeFetchErrorCode = 'timeout' | 'network' | 'blocked' | 'too_large' | 'http_error'

/** Respuesta normalizada del fetcher. NUNCA lanza: un fallo se refleja en `ok=false` + `errorCode`. */
export interface ProbeFetchResult {
  ok: boolean
  /** HTTP status; 0 si fue error de red/timeout/bloqueo antes de respuesta. */
  status: number
  /** URL final (tras redirects), para evidencia/diagnóstico. */
  url: string
  /** Cuerpo de texto acotado (truncado a un máximo defensivo). */
  body: string
  contentType: string | null
  errorCode: ProbeFetchErrorCode | null
}

export interface ProbeFetchInit {
  /** Acepta override del Accept header (p.ej. application/xml para sitemap). */
  accept?: string
  /** Timeout por request (ms). El fetcher impone un tope defensivo. */
  timeoutMs?: number
  /** Máximo de bytes a leer del body (defensa anti-payload gigante). */
  maxBytes?: number
}

/**
 * Fetcher acotado al dominio del run. Resuelve `path` relativo contra el baseUrl del
 * sujeto y rechaza cross-host / hosts no públicos (SSRF). Inyectable para tests.
 */
export type ProbeFetcher = (path: string, init?: ProbeFetchInit) => Promise<ProbeFetchResult>

// ── Entity API fetcher (terceros, host-allowlisted; TASK-1267) ────────────────

export type EntityFetchErrorCode = 'timeout' | 'network' | 'blocked' | 'too_large' | 'http_error'

/** Respuesta normalizada del fetcher externo. NUNCA lanza: un fallo → `ok=false` + `errorCode`. */
export interface EntityFetchResult {
  ok: boolean
  /** HTTP status; 0 si fue error de red/timeout/bloqueo antes de respuesta. */
  status: number
  /** Cuerpo de texto acotado (truncado a un máximo defensivo). */
  body: string
  errorCode: EntityFetchErrorCode | null
}

export interface EntityFetchInit {
  timeoutMs?: number
  maxBytes?: number
  /** Header Authorization opcional (p.ej. bearer de Reddit OAuth). NUNCA se loggea. */
  authorization?: string
}

/**
 * Fetcher read-only a APIs PÚBLICAS de entidad de TERCEROS (Google Knowledge Graph /
 * Wikidata / Reddit). Distinto del `ProbeFetcher` del eje structural/agentic: ese está
 * acotado al host del SUJETO (SSRF), este está acotado por ALLOWLIST a los hosts de las
 * APIs de entidad. Recibe una URL absoluta; rechaza cualquier host fuera de la allowlist.
 * Inyectable para tests.
 */
export type EntityApiFetcher = (url: string, init?: EntityFetchInit) => Promise<EntityFetchResult>

/**
 * Sub-contexto que necesitan los probes de entidad (TASK-1267): identidad de la marca para
 * la consulta + desambiguación por dominio, idioma/mercado, el fetcher externo allowlisted,
 * y la API key del Knowledge Graph resuelta server-side (null → el KG probe degrada
 * `not_configured`, honest degradation; los demás no requieren auth).
 */
export interface EntityProbeContext {
  /** Nombre de marca a consultar (del perfil del grader). */
  brandName: string
  /** Host del sujeto (p.ej. `example.com`) para desambiguar por dominio, no solo por nombre. */
  domain: string
  /** Mercado del run (p.ej. `CL`) — orienta relevancia/idioma. */
  market: string
  /** Locale del run (p.ej. `es-CL`) — del que se deriva el idioma de Wikidata/KG. */
  locale: string
  /** Fetcher externo host-allowlisted (KG/Wikidata/Reddit). */
  fetch: EntityApiFetcher
  /** API key de Google Knowledge Graph resuelta server-side; null → KG probe degrada honesto. */
  knowledgeGraphApiKey: string | null
}

// ── Headless renderer seam (Chromium fuera de Vercel; null por defecto) ───────

export interface HeadlessRenderResult {
  /** HTML renderizado tras ejecución de JS. */
  html: string
  /** Métricas CWV cuando el renderer corre Lighthouse; null si no las computa. */
  coreWebVitals: HeadlessCoreWebVitals | null
  /** Tools WebMCP detectadas (navigator/document.modelContext); null si no se inspeccionó. */
  webmcpTools: string[] | null
}

export interface HeadlessCoreWebVitals {
  lcpMs: number | null
  cls: number | null
  inpMs: number | null
  performanceScore: number | null
}

/**
 * Runtime de render headless (Chromium + Lighthouse). Vive FUERA de Vercel (Cloud Run
 * worker con Chromium). Por defecto `null` → los probes headless degradan a `skipped`
 * con `errorCode='no_headless'`. El cableado real es un follow-up que NO toca el substrate.
 */
export interface HeadlessRenderer {
  render(url: string): Promise<HeadlessRenderResult>
}

// ── Probe + context ──────────────────────────────────────────────────────────

export interface ProbeContext {
  /** Host normalizado del sujeto (p.ej. `example.com`), sin esquema. */
  domain: string
  /** Base URL absoluta del sujeto (p.ej. `https://example.com`). */
  baseUrl: string
  /** Fetcher read-only SSRF-guarded acotado al dominio. */
  fetcher: ProbeFetcher
  /** Renderer headless inyectado, o null (probes headless → skipped). */
  headless: HeadlessRenderer | null
  /**
   * Sub-contexto de entidad inyectado (TASK-1267), o ausente/null cuando el eje `entity`
   * no está habilitado → los probes de entidad degradan a `skipped/no_entity_context`. Es
   * OPTIONAL para no romper a los probes structural/agentic (que lo ignoran) ni a sus tests.
   */
  entity?: EntityProbeContext | null
}

export interface Probe {
  readonly kind: ProbeKind
  readonly axis: ProbeAxis
  /** Si requiere render headless (Chromium). Si true y `ctx.headless` es null → skipped. */
  readonly requiresHeadless: boolean
  /** Ejecuta el probe. SIEMPRE resuelve a un ProbeOutcome (status refleja el resultado), NUNCA lanza. */
  run(ctx: ProbeContext): Promise<ProbeOutcome>
}

/** Outcome canónico para un probe headless sin runtime disponible (honest degradation). */
export const NO_HEADLESS_OUTCOME: ProbeOutcome = {
  status: 'skipped',
  score: null,
  reason: 'Requiere render headless (Chromium); sin runtime disponible en este entorno.',
  evidence: {},
  errorCode: 'no_headless'
}

/** Outcome canónico para un probe de entidad sin sub-contexto inyectado (honest degradation). */
export const NO_ENTITY_CONTEXT_OUTCOME: ProbeOutcome = {
  status: 'skipped',
  score: null,
  reason: 'Eje de entidad no habilitado; sin contexto de marca/fetcher de entidad disponible.',
  evidence: {},
  errorCode: 'no_entity_context'
}
