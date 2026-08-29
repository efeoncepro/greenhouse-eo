import 'server-only'

/**
 * TASK-1700 — Vocabularios cerrados y tipos del aggregate de la cola priorizada.
 *
 * Espejo EXACTO de los CHECK de la migración `task-1700-seo-work-queue`. Estos tipos no son
 * la autoridad: el esquema lo es. Si divergen, gana PostgreSQL — por eso el vocabulario se
 * amplía con una migración y nunca agregando un string acá.
 */

/**
 * De dónde nace una entrada de trabajo. Los orígenes **NUNCA se promedian**: un objetivo
 * declarado en posición 60 es distancia por recorrer, no urgencia, y mezclarlo con un
 * striking-distance de posición 9 produce un número que no significa nada. Cada origen
 * aporta filas con su propia base de puntuación y su propia banda.
 */
export const WORK_QUEUE_ORIGINS = [
  'gsc_striking_distance',
  'discovery_candidate',
  'declared_target',
  'aeo_gap',
  'competitor_gap',
  'consolidation'
] as const

export type SeoWorkQueueOrigin = (typeof WORK_QUEUE_ORIGINS)[number]

/**
 * Qué acción propone el item. La canibalización entra como `consolidate` y **jamás** como
 * `optimize`: no es una keyword que empujar, son dos URLs que fusionar, y presentarla junto
 * a un "optimizar" hace que el operador tome la acción equivocada.
 */
export const WORK_QUEUE_VERBS = ['optimize', 'create', 'consolidate', 'measure'] as const

export type SeoWorkQueueVerb = (typeof WORK_QUEUE_VERBS)[number]

/**
 * 🔴 Sobre qué evidencia se puntuó — el invariante ● medido / ◑ estimado aplicado al ORDEN.
 *
 * - `measured_incremental_clicks` (banda 1): hay impresiones de GSC **y** la curva de CTR
 *   propia es estadísticamente utilizable en la posición objetivo. `priority_score` = clics
 *   incrementales estimados.
 * - `measured_without_curve` (banda 2): hay demanda medida, pero la curva propia no alcanza
 *   para afirmar un CTR esperado. `priority_score` NULL; el orden dentro de la banda es por
 *   impresiones. Decir "0 clics de ganancia" acá sería fabricar una medición.
 * - `no_measured_demand` (banda 3): nadie llegó por esa keyword en la ventana.
 *   `priority_score` NULL y verbo `measure`. **Está prohibido puntuar esta banda con el
 *   volumen estimado del proveedor** — en es-LATAM es justo donde mide peor (ISSUE-152).
 */
export const WORK_QUEUE_SCORE_BASES = [
  'measured_incremental_clicks',
  'measured_without_curve',
  'no_measured_demand'
] as const

export type SeoWorkQueueScoreBasis = (typeof WORK_QUEUE_SCORE_BASES)[number]

/** Banda de orden. El orden canónico es banda ASC, luego score DESC, luego keyword ASC. */
export type SeoWorkQueueScoreBand = 1 | 2 | 3

/**
 * Banda que le corresponde a cada base. La relación es 1:1 y la impone un CHECK en DB
 * (`seo_work_queue_items_basis_band_score`); acá vive para que el TS no pueda construir un
 * item inconsistente antes de llegar a la base.
 */
export const SCORE_BASIS_BAND: Record<SeoWorkQueueScoreBasis, SeoWorkQueueScoreBand> = {
  measured_incremental_clicks: 1,
  measured_without_curve: 2,
  no_measured_demand: 3
}

/** Salud de un origen en un snapshot. Un origen caído NO baja el score de los demás. */
export type SeoWorkQueueOriginState = 'ok' | 'degraded' | 'down'

export interface SeoWorkQueueOriginHealth {
  origin: SeoWorkQueueOrigin
  state: SeoWorkQueueOriginState
  /**
   * Por qué. Obligatorio cuando el estado no es `ok`: "degradado" sin razón es un hueco que
   * el operador no puede juzgar. `null` sólo con `state: 'ok'`.
   */
  reason: string | null
  /** Frescura del insumo del origen, cuando el origen la conoce. */
  asOf: string | null
  /** Cuántas filas aportó al snapshot. `0` con `state: 'ok'` es un vacío legítimo. */
  itemCount: number
}

/**
 * Desglose del score, persistido con cada item. Es lo que permite contestar "¿por qué esto
 * ya no es prioridad?" seis meses después sin recomputar nada.
 */
export interface SeoWorkQueueScoreBreakdown {
  impressions: number
  clicks: number
  currentCtr: number | null
  weightedPosition: number | null
  targetPosition: number
  expectedCtrAtTarget: number | null
  /** `org_measured` cuando la curva salió del propio GSC; `unusable` cuando no alcanzó. */
  ctrCurveSource: 'org_measured' | 'unusable' | 'not_applicable'
  /** Impresiones y clics del bucket objetivo — la muestra que sostiene (o no) la curva. */
  curveSampleImpressions: number | null
  curveSampleClicks: number | null
  windowDays: number
  incrementalClicks: number | null
  /** Por qué cayó a esta banda, en una frase corta y accionable. */
  basisReason: string
  /**
   * Otros orígenes que también señalaron ESTE MISMO sujeto y quedaron suprimidos por
   * precedencia de acción.
   *
   * No se pierden: un sujeto es UNA decisión, pero la evidencia de por qué aparece sigue
   * siendo de varios motores. Suprimir sin dejar rastro convertiría la deduplicación en una
   * pérdida de información silenciosa.
   */
  alsoSurfacedBy?: Array<{ origin: SeoWorkQueueOrigin; verb: SeoWorkQueueVerb }>
  /**
   * Páginas del sitio compitiendo por esta intención. Sólo en `origin='consolidation'`.
   *
   * Se persiste como DATO y no se deja sólo dentro de `basisReason`: el consumer que
   * renderiza la lente necesita el número, y parsearlo de una frase en prosa lo ataría a la
   * redacción — la clase de acople que se rompe la primera vez que alguien mejora el texto.
   */
  competingPages?: number
  /**
   * TASK-1700 v2 — Share de impresiones de la página principal, cuando se pudo medir.
   * Es el número que SOSTIENE el veredicto de canibalización: sin él, "N páginas compiten"
   * es un conteo que no distingue 41 páginas peleándose una intención de 41 páginas donde
   * una se queda con el 99,3 %.
   */
  mainPageShare?: number | null
  /**
   * TASK-1700 v2 — Techo de CTR de la fila: clics que ganaría si convirtiera como la mediana
   * de SU PROPIA posición. Sólo viaja cuando el techo por posición es 0 (ya está en la
   * objetivo o mejor). Es EVIDENCIA, no orden: no entra al `priority_score` porque no es
   * comparable con "clics que ganas subiendo". Ver `priority-score.ts`.
   */
  snippetCeilingClicks?: number | null
}

/** Una entrada de trabajo, tal como se persiste. */
export interface SeoWorkQueueItemInput {
  origin: SeoWorkQueueOrigin
  normalizedKeyword: string
  targetUrl: string | null
  recommendedVerb: SeoWorkQueueVerb
  scoreBasis: SeoWorkQueueScoreBasis
  scoreBand: SeoWorkQueueScoreBand
  priorityScore: number | null
  breakdown: SeoWorkQueueScoreBreakdown
  /**
   * Procedencia OPACA `<motor>:<entidad>:<id>`. **NUNCA** es FK ni target de JOIN: el
   * consumer que tenga permiso la resuelve con el reader del motor dueño. Es lo que sostiene
   * el boundary §1.1 (cero acople `seo_*` ↔ `grader_*`).
   */
  evidenceRef: string
  /** Versión del score del motor de origen. Obligatoria para `aeo_gap` (CHECK en DB). */
  sourceScoreVersion: string | null
  /** Orden secundario dentro de la banda 2, donde no hay score. */
  tieBreakImpressions: number
}

/** Lo que devuelve un colector: sus filas y su propia salud. Nunca lanza hacia el materializador. */
export interface SeoWorkQueueCollectorResult {
  items: SeoWorkQueueItemInput[]
  health: SeoWorkQueueOriginHealth
}

/** Decisión humana sobre un sujeto de la cola. Append-only; NO ejecuta nada. */
export const WORK_QUEUE_DECISIONS = ['accepted', 'deferred', 'dismissed', 'done'] as const

export type SeoWorkQueueDecision = (typeof WORK_QUEUE_DECISIONS)[number]

/** Frescura del snapshot vigente frente a su `expires_at`. */
export type SeoWorkQueueStaleness = 'fresh' | 'stale' | 'absent'

/**
 * Aggregate type + evento outbox. Viven en el dominio y NO en el catálogo TS central: el
 * seam de extracción (arquitectura SEO §17.3) prohíbe acoplar `src/lib/growth/seo/**` a
 * módulos de otros dominios.
 */
export const SEO_WORK_QUEUE_AGGREGATE_TYPE = 'seo_target' as const
export const SEO_WORK_QUEUE_MATERIALIZED_EVENT = 'growth.seo.work_queue.materialized' as const

/** Prefijos de `evidence_ref` por origen. Opacos por contrato: nadie los parsea para hacer JOIN. */
export const EVIDENCE_REF_PREFIX: Record<SeoWorkQueueOrigin, string> = {
  gsc_striking_distance: 'seo:gsc_query',
  discovery_candidate: 'discovery:candidate',
  declared_target: 'seo:keyword_set_member',
  aeo_gap: 'aeo:grader_run',
  competitor_gap: 'seo:competitor_gap',
  consolidation: 'seo:gsc_query'
}

export const buildEvidenceRef = (origin: SeoWorkQueueOrigin, id: string): string =>
  `${EVIDENCE_REF_PREFIX[origin]}:${id}`
