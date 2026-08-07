/**
 * TASK-1302 — Contratos del dominio SEO (materialización GSC + oportunidades).
 *
 * Tipos consumer-agnósticos: los consumen UI (TASK-1306/1308), Nexa y el lane
 * ecosystem/MCP (TASK-1645) sin lógica duplicada por consumer. Mandato parity del
 * operador 2026-08-05: todo reader nace con shape `{ ok } | { ok: false, errorCode }`.
 *
 * Este archivo NO importa `server-only`: es sólo tipos, y la UI necesita importarlos.
 */

// `import type` pleno (no `{ type X }`): el bundle del ops-worker preserva el side-effect
// import de la forma con especificadores y lo deja como external sin resolver — el gate
// worker:runtime-deps-gate lo detecta como paquete fantasma `@/lib`.
import type { SearchConsoleConnectionStatus } from '@/lib/growth/search-console'

/** Códigos de degradación honesta compartidos por el dominio SEO. */
export type SeoDegradationCode =
  | 'disabled'
  | 'not_connected'
  | 'token_unhealthy'
  | 'query_failed'
  | 'no_data'

/** Resultado de materializar un día de GSC para una organización. */
export type GscDailySnapshotResult =
  | {
      ok: true
      organizationId: string
      siteUrl: string
      captureDate: string
      rowsWritten: number
      pagesFetched: number
      /**
       * `true` si se alcanzó el techo de páginas y Google todavía tenía filas.
       * NUNCA se trunca en silencio: el caller debe loguearlo y subir el techo.
       */
      truncated: boolean
    }
  | { ok: false; errorCode: SeoDegradationCode; status: SearchConsoleConnectionStatus | null }

/** Una organización elegible para el batch diario de materialización. */
export interface SearchConsoleActiveOrg {
  organizationId: string
  siteUrl: string
}

/**
 * Disponibilidad de los datos de mercado (volumen/dificultad).
 *
 * Hoy siempre `unavailable`: el family registry de DataForSEO Labs es TASK-1300 y aún
 * no aterrizó. El striking-distance NO depende de esto — se calcula con datos medidos
 * de GSC — así que el reader entrega valor completo igual y el mercado sólo enriquece.
 */
export type SeoMarketAvailability = 'available' | 'unavailable'

export interface KeywordOpportunity {
  keyword: string
  /** Página que hoy rankea para la keyword (la mejor posicionada de la ventana). */
  page: string
  /**
   * Posición media PONDERADA POR IMPRESIONES en la ventana.
   *
   * ⚠️ NO es el promedio simple de las posiciones diarias: GSC ya entrega su `position`
   * ponderada por impresiones dentro del período, así que promediar días planos le daría
   * el mismo peso a un día de 2 impresiones que a uno de 500.
   */
  position: number
  impressions: number
  clicks: number
  /** CTR observado en la ventana (clicks / impressions), no el de un día suelto. */
  ctr: number
  /**
   * Clics incrementales estimados si la keyword llegara a la posición objetivo.
   *
   * `impressions × max(0, ctrEsperadoEnObjetivo − ctrActual)`. La curva de CTR por
   * posición se deriva de los datos de la PROPIA organización, no de una tabla de
   * industria: así absorbe sola el efecto de los AI Overviews en ese sitio concreto.
   * La unidad es clics, no un score abstracto — es lo que el negocio entiende.
   */
  estimatedClickGain: number
  /** Posición 8–10: ya en página 1, el empujón más barato. */
  quickWin: boolean
  /**
   * La misma keyword aparece con más de una página en la ventana.
   *
   * No es una oportunidad de optimización sino de CONSOLIDACIÓN: dos URLs compitiendo
   * por la misma intención se diluyen entre sí (canibalización).
   */
  cannibalized: boolean
  /** Nº de páginas distintas que rankean para esta keyword en la ventana. */
  competingPages: number
  searchVolume: number | null
  difficulty: number | null
}

export type KeywordOpportunitiesResult =
  | {
      ok: true
      organizationId: string
      seoTargetId: string
      windowDays: number
      /** Umbral de impresiones efectivamente aplicado (percentil resuelto sobre los datos). */
      impressionsThreshold: number
      market: SeoMarketAvailability
      opportunities: KeywordOpportunity[]
    }
  | { ok: false; errorCode: SeoDegradationCode | 'target_not_found'; status: SearchConsoleConnectionStatus | null }

/**
 * ═══ TASK-1305 — Cruce SEO↔AEO (quadrant 360) ═══
 *
 * Derived read cross-módulo: la lente SEO (posición medida, `seo_gsc_daily`) y la lente
 * AEO (citabilidad IA, `grader_scores`) se mantienen como DOS EJES ORTOGONALES — el
 * boundary §1.1 del doc maestro prohíbe promediarlas, mergearlas por SQL o
 * reconciliarlas. "Rankeas #1 y la IA no te cita" es una celda de la matriz (riesgo),
 * no un bug.
 */

/** Celda de la matriz 2×2: rankeo (X) × citabilidad IA (Y). */
export type SeoAeoQuadrant = 'dominante' | 'riesgo' | 'oportunidad' | 'invisible'

/**
 * Granularidad del eje AEO. En V1 es `domain`: `grader_scores` es por-run (dominio
 * completo), así que todas las keywords comparten la citabilidad del dominio. TASK-1311
 * (citation attribution URL-level) lo refina a `url` SIN romper este contrato.
 */
export type SeoAeoAxisGranularity = 'domain'

export interface SeoAeoKeywordStanding {
  keyword: string
  /** Página mejor posicionada para la keyword en la ventana. */
  page: string
  /** Posición media ponderada por impresiones (mismo método que KeywordOpportunity). */
  position: number
  impressions: number
  clicks: number
}

export interface SeoAeoQuadrantEntry {
  keyword: string
  rankPosition: number
  /** Score AEO del eje Y. En granularidad `domain` es el overall del dominio. */
  aeoScore: number
  quadrant: SeoAeoQuadrant
}

export interface SeoAeoGapLenses {
  seoLens: {
    windowDays: number
    /** Keywords medidas (GSC) ordenadas por impresiones desc. */
    keywords: SeoAeoKeywordStanding[]
  }
  aeoLens: {
    latestRunId: string
    latestRunAt: string | null
    /** `grader_scores.overall_score` (0–100) del último run reportable. */
    overallScore: number
    /** `overallScore >= umbral de citabilidad` (documentado en el clasificador). */
    cited: boolean
  }
}

export type SeoAeoGapResult =
  | ({
      ok: true
      organizationId: string
      seoTargetId: string
      aeoAxisGranularity: SeoAeoAxisGranularity
      quadrants: SeoAeoQuadrantEntry[]
      /** Clasificación agregada del dominio (mejor posición SEO × citabilidad). */
      domainQuadrant: SeoAeoQuadrant
    } & SeoAeoGapLenses)
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_seo_data' | 'no_aeo_data' | 'query_failed'
      status: null
    }

/**
 * ═══ TASK-1303 — Rank capture + evolución temporal ═══
 *
 * La serie DataForSEO (posición EXACTA en una SERP concreta, con competidores y SERP
 * features) es una fuente DISTINTA de la serie GSC (posición promediada del propio
 * dominio). El contrato de honestidad del doc maestro §5 prohíbe promediarlas: el
 * reader de evolución sirve SOLO la serie DataForSEO; el cruce vive en el report layer.
 */

/**
 * Evento outbox del batch de captura (constante local del dominio, patrón growth-forms:
 * el seam de extracción §17.3 evita acoplar `src/lib/growth/seo/**` al catálogo central).
 */
export const SEO_RANK_SNAPSHOT_CAPTURED_EVENT = 'growth.seo.rank_snapshot.captured'

/** Aggregate type del evento de captura (identity: `seo_target_id`, 'seot-{uuid}'). */
export const SEO_RANK_SNAPSHOT_AGGREGATE_TYPE = 'seo_target'

/** Devices soportados por el schema (CHECK de TASK-1299). */
export type SeoRankDevice = 'desktop' | 'mobile' | 'tablet'

/** Resultado de una combinación keyword×engine×device dentro de una captura. */
export type SeoRankCaptureComboStatus =
  /** Snapshot insertado (position puede ser null: keyword trackeada, dominio no rankea). */
  | 'captured'
  /** Ya existía snapshot para este `capture_date` — no se pega el provider (idempotencia sin gasto). */
  | 'already_captured'
  /** El spend fence re-consultó el gate a mitad del batch y frenó el resto. */
  | 'budget_blocked'
  /** Circuit breaker de la familia abierto: no se intentó (≠ intentado y fallido). */
  | 'breaker_open'
  /** El provider respondió error o el parse no encontró un resultado utilizable. */
  | 'provider_error'

export interface SeoRankCaptureComboOutcome {
  keyword: string
  engine: string
  device: SeoRankDevice
  status: SeoRankCaptureComboStatus
  position: number | null
  url: string | null
  /** Costo del call atribuido a la fila (procedencia). El presupuesto vive en el ledger. */
  providerCostUsd: number
  errorCode: string | null
}

/**
 * Estado agregado de la captura de un target. `succeeded` exige capturar TODO lo
 * elegible; `degraded` (elegibles > 0, capturados = 0) NUNCA se reporta como éxito —
 * espejo de la regla BigQuery DML de CLAUDE.md.
 */
export type SeoRankCaptureStatus = 'succeeded' | 'partial' | 'degraded' | 'skipped'

export type SeoRankCaptureResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      status: SeoRankCaptureStatus
      /** Combos keyword×engine×device del scope que faltaban por capturar hoy. */
      eligible: number
      captured: number
      alreadyCaptured: number
      budgetBlocked: number
      providerErrors: number
      breakerOpen: number
      /** Suma de costos reportados por el provider en esta corrida (informativo). */
      costUsd: number
      sourceRunId: string
      outcomes: SeoRankCaptureComboOutcome[]
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'target_not_active'
        | 'no_keywords'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
      status: null
    }

/**
 * ═══ TASK-1304 — Site audit (OnPage async) + backlink snapshot ═══
 *
 * OnPage es task-based ASYNC: el ciclo son DOS fases desacopladas (enqueue crea la task y
 * persiste `provider_task_id` con `status=running`; collect poll-ea idempotente y
 * materializa exactamente una vez). Backlinks es live síncrono (snapshot semanal).
 * Eventos como constantes locales del dominio (patrón growth-forms, seam §17.3).
 */

/** Evento de rastro: se creó una task OnPage (aún sin resultado). */
export const SEO_SITE_AUDIT_QUEUED_EVENT = 'growth.seo.site_audit.queued'

/** Evento de materialización: el collect cerró el run (dispara el mirror BQ reactivo). */
export const SEO_SITE_AUDIT_COMPLETED_EVENT = 'growth.seo.site_audit.completed'

/** Evento de captura de backlink snapshot (dispara el mirror BQ reactivo). */
export const SEO_BACKLINK_SNAPSHOT_CAPTURED_EVENT = 'growth.seo.backlink_snapshot.captured'

/** Estados del run de audit (CHECK de TASK-1299). `running` es el único no-terminal. */
export type SeoSiteAuditRunStatus = 'running' | 'succeeded' | 'degraded' | 'failed'

/** Severidades de finding (CHECK de TASK-1299). */
export type SeoSiteAuditFindingSeverity = 'critical' | 'warning' | 'notice'

export type SeoSiteAuditQueueResult =
  | {
      ok: true
      auditRunId: string
      seoTargetId: string
      organizationId: string
      captureDate: string
      providerTaskId: string
      /** Costo reportado por el provider al crear la task (procedencia; el presupuesto vive en el ledger). */
      providerCostUsd: number
      status: 'running'
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'target_not_active'
        /** Ya hay una task OnPage en vuelo para el target (el collect aún no la cierra). */
        | 'audit_already_running'
        /** Hoy ya hay un audit exitoso para el target — re-encolar sería gasto duplicado. */
        | 'already_captured_today'
        | 'no_entitlement'
        | 'expired'
        | 'quota_exhausted'
        | 'budget_exhausted'
        | 'breaker_open'
        | 'provider_error'
      status: null
    }

/** Resultado de un ciclo de collect sobre UN run en `running`. */
export type SeoSiteAuditCollectRunOutcome =
  /** La task OnPage sigue crawleando — no-op honesto, se reintenta en el próximo ciclo. */
  | 'in_progress'
  /** Run materializado (status final + findings) en esta pasada. */
  | 'materialized'
  /** Otro proceso tenía el claim (SKIP LOCKED) — no se tocó. */
  | 'claimed_elsewhere'
  /** El poll al provider falló (breaker/HTTP) — el run queda `running` para reintento. */
  | 'poll_failed'
  /** El run superó la edad máxima sin completar y se degradó a `failed`. */
  | 'gave_up'

export interface SeoSiteAuditCollectSummary {
  /** Runs en `running` visibles al iniciar el ciclo. */
  pending: number
  materialized: number
  inProgress: number
  pollFailed: number
  gaveUp: number
  claimedElsewhere: number
  outcomes: Array<{
    auditRunId: string
    seoTargetId: string
    outcome: SeoSiteAuditCollectRunOutcome
    finalStatus: SeoSiteAuditRunStatus | null
    findings: number
  }>
}

export interface SeoSiteAuditFindingView {
  url: string
  issueType: string
  severity: SeoSiteAuditFindingSeverity
  detail: Record<string, unknown>
}

export interface SeoSiteAuditRunView {
  auditRunId: string
  captureDate: string
  status: SeoSiteAuditRunStatus
  crawledPages: number | null
  healthScore: number | null
  startedAt: string | null
  finishedAt: string | null
}

export type SiteAuditReportResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      run: SeoSiteAuditRunView
      /** Findings agrupados por severidad (orden: critical → warning → notice). */
      findings: Record<SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView[]>
      totals: Record<SeoSiteAuditFindingSeverity, number>
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'run_not_found' | 'no_data' | 'query_failed'
      status: null
    }

export type SeoBacklinkCaptureResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      /**
       * `captured` = snapshot completo · `already_captured` = idempotencia sin gasto ·
       * `partial` = summary OK pero el delta new/lost no se pudo obtener (se persiste
       * el snapshot con `new_lost_delta` vacío — honesto, no fabricado).
       */
      status: 'captured' | 'already_captured' | 'partial'
      providerCostUsd: number
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'target_not_active'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
        | 'breaker_open'
        | 'provider_error'
      status: null
    }

/** Punto de la serie semanal del perfil de enlaces (una fila por `capture_date`). */
export interface BacklinkProfilePoint {
  /** `capture_date` (YYYY-MM-DD). */
  date: string
  referringDomains: number | null
  backlinksTotal: number | null
  /** Rank del dominio en escala 0–100 (`rank_scale: one_hundred`). */
  domainRank: number | null
  /** Proxy de toxicidad 0–1 (spam score promedio del perfil entrante / 100). */
  toxicShare: number | null
  newLostDelta: Record<string, unknown>
}

export type BacklinkProfileResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      range: { from: string; to: string; days: number }
      points: BacklinkProfilePoint[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_data' | 'query_failed'
      status: null
    }

/** Punto de la serie de evolución: una medición diaria de una keyword. */
export interface RankEvolutionPoint {
  /** `capture_date` (YYYY-MM-DD). */
  date: string
  /** Posición orgánica medida; null = trackeada pero el dominio no rankeó ese día. */
  position: number | null
  url: string | null
}

export interface RankEvolutionSeries {
  keyword: string
  points: RankEvolutionPoint[]
}

export type RankEvolutionSource = 'postgres' | 'bigquery'

export type RankEvolutionResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      engine: string
      device: SeoRankDevice
      /** Ventana efectivamente servida. */
      range: { from: string; to: string; days: number }
      /** PG = ventana caliente (~180d); BigQuery = historia larga (rango mayor). */
      source: RankEvolutionSource
      series: RankEvolutionSeries[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_data' | 'query_failed'
      status: null
    }

/**
 * ═══ TASK-1307 — Rendimiento en el tiempo de un set de URLs/keywords (pantalla ancla §10.3) ═══
 *
 * ⚠️ POR QUÉ ESTE READER EXISTE (la spec lo declaraba `Backend impact: none`, y era falso).
 *
 * La pantalla ancla necesita DOS cosas que `readRankEvolution` no puede dar:
 *   1. **El eje URL.** `readRankEvolution` filtra por keyword y nada más — la posición
 *      exacta de DataForSEO se mide contra una keyword, no contra una página. El único
 *      eje URL real del dominio es `seo_gsc_daily.page` (dato MEDIDO).
 *   2. **Clics / impresiones / CTR.** Los snapshots de rank son SOLO posición; el volumen
 *      vive en Search Console.
 *
 * ⚠️ CONTRATO DE HONESTIDAD §5 — las dos fuentes NUNCA se promedian ni se fusionan. La
 * fuente de una lectura queda determinada por (modo × métrica), con una regla única y
 * declarada en la UI con la leyenda ●/◑:
 *
 *   | modo    | métrica              | fuente                                        |
 *   |---------|----------------------|-----------------------------------------------|
 *   | keyword | position             | DataForSEO ◑ (posición exacta de mercado)      |
 *   | keyword | clicks/impr/ctr      | Search Console ● (grano `query`)               |
 *   | url     | cualquiera           | Search Console ● (grano `page`)                |
 *
 * No hay celda mixta: una serie entera pertenece a una sola fuente. Es lo que permite
 * decir "◑ estimado" o "● medido" del gráfico completo sin una mentira por serie.
 *
 * ⚠️ FALLBACK entre fuentes (2026-08-07): la celda keyword×position es una INTENCIÓN, no
 * una promesa ciega. GSC también mide posición por keyword (promedio ponderado), así que
 * cuando la serie exacta de DataForSEO es más joven que la medida (rank capture recién
 * arrancado vs. historial GSC), el reader sirve la de GSC y lo DECLARA en `source`.
 * "Si no vienen de uno, vienen del otro" — pero jamás promediadas.
 */

/** Eje del set elegido: comparar keywords entre sí, o URLs entre sí. Nunca mezclados. */
export type SeoPerformanceMode = 'keyword' | 'url'

/** Qué mide el eje Y. `position` es la única con eje invertido (1 arriba = mejor). */
export type SeoPerformanceMetric = 'position' | 'clicks' | 'impressions' | 'ctr'

/** Procedencia de la lectura completa (leyenda ●/◑). Se deriva de (modo × métrica). */
export type SeoPerformanceSource = 'gsc_measured' | 'dataforseo_estimated'

/** Un punto diario. `value: null` = sin medición ese día (hueco real, NUNCA interpolado). */
export interface SeoPerformancePoint {
  date: string
  value: number | null
}

export interface SeoPerformanceSeries {
  /** La keyword o la URL, según el modo. */
  item: string
  points: SeoPerformancePoint[]
  /**
   * `true` cuando la serie cubre menos de la mitad de la ventana pedida (keyword recién
   * trackeada o proveedor con lag). La UI lo declara con un banner; el chart la dibuja
   * hasta donde hay dato y deja el hueco visible.
   */
  sparse: boolean
}

export interface SeoPerformanceStanding {
  item: string
  /** Última posición medida en la ventana. `null` = no rankeó / no se midió. */
  position: number | null
  /**
   * Δ de POSICIÓN a ~30 días: `actual − referencia`. **Negativo = mejoró** (pasar de 8 a 3
   * es −5). El signo NO se falsea para "verse positivo": lo que cambia es la lectura
   * (`GreenhouseKpiDelta invert`), nunca el número.
   *
   * `null` = no hay contra qué comparar (una sola medición en la ventana). NUNCA se
   * fabrica un delta contra cero.
   */
  positionDelta30d: number | null
  clicks: number
  impressions: number
  /** `clicks / impressions` de la ventana. `null` si no hubo impresiones (≠ 0%). */
  ctr: number | null
  /** Serie de posición para el sparkline de la fila (mismo orden temporal). */
  trend: Array<number | null>
}

/** Agregado MEDIDO del conjunto en un día (Search Console, siempre — nunca DataForSEO). */
export interface SeoPerformanceDailyTotal {
  date: string
  clicks: number
  impressions: number
  /**
   * Posición del conjunto PONDERADA POR IMPRESIONES: `Σ(posición×impresiones)/Σ(impresiones)`.
   * Un promedio plano le daría el mismo peso a un ítem de 2 impresiones que a uno de 500.
   * `null` sin impresiones ese día.
   */
  position: number | null
  ctr: number | null
}

export interface SeoPerformanceTotals {
  clicks: number
  impressions: number
  position: number | null
  ctr: number | null
}

/**
 * Titular del conjunto: el agregado del período, la ventana previa comparable y la serie
 * diaria que alimenta el sparkline de cada KPI.
 *
 * `previous: null` = no hay ventana anterior con datos. La UI NO dibuja delta en ese caso:
 * comparar contra una ventana vacía fabricaría un +100% inventado.
 */
export interface SeoPerformanceSummary {
  current: SeoPerformanceTotals
  previous: SeoPerformanceTotals | null
  series: SeoPerformanceDailyTotal[]
}

export type SeoPerformanceResult =
  | {
      ok: true
      organizationId: string
      /** `null` cuando el modo no consulta rank (todo GSC): no hay target involucrado. */
      seoTargetId: string | null
      mode: SeoPerformanceMode
      metric: SeoPerformanceMetric
      device: SeoRankDevice
      range: { from: string; to: string; days: number }
      source: SeoPerformanceSource
      series: SeoPerformanceSeries[]
      standings: SeoPerformanceStanding[]
      /** Titular medido del conjunto (banda de KPI). Siempre GSC, sea cual sea la métrica. */
      summary: SeoPerformanceSummary
      /**
       * Ítems pedidos que no tienen NINGÚN dato en la ventana. Se nombran en vez de
       * omitirse en silencio: "pediste 4 y te muestro 2" tiene que ser visible.
       */
      itemsWithoutData: string[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'not_connected' | 'no_items' | 'no_data' | 'query_failed'
      status: null
    }

/** Una opción del selector de set: el ítem + su volumen medido, para poder priorizarlo. */
export interface SeoPerformanceCatalogItem {
  item: string
  /** Impresiones acumuladas en la ventana. `0` cuando el ítem sólo existe como keyword trackeada. */
  impressions: number
  /** `true` si la keyword está trackeada por rank capture (tiene serie de posición exacta). */
  tracked: boolean
}

export type SeoPerformanceCatalogResult =
  | {
      ok: true
      organizationId: string
      mode: SeoPerformanceMode
      items: SeoPerformanceCatalogItem[]
    }
  | { ok: false; errorCode: 'disabled' | 'no_data' | 'query_failed'; status: null }

/**
 * ═══ TASK-1308 — Command `trackKeywords` (seguir una keyword) ═══
 *
 * Seguir una keyword no es un INSERT: es un **compromiso de gasto diferido**. El rank
 * capture diario (TASK-1303) paga DataForSEO por cada keyword VIGENTE del set, todos los
 * días, hasta que alguien la deje de seguir. Por eso el command tiene techo, procedencia
 * y outcome por keyword — y por eso el resultado NUNCA es un booleano: un caller que sólo
 * ve `ok: true` no sabe si agregó 1 keyword nueva o rebotó 40 contra el techo.
 */

/** Procedencia del write (vocabulario cerrado, espejo del CHECK de la migración 1308). */
export type SeoKeywordTrackSource = 'operator_ui' | 'nexa' | 'mcp' | 'seed' | 'backfill'

/** Qué pasó con UNA keyword del lote. */
export type SeoKeywordTrackStatus =
  /** Nueva membresía vigente creada. Entra al rank capture del próximo ciclo. */
  | 'tracked'
  /** Ya tenía membresía vigente. Cero writes, cero gasto nuevo — el command es idempotente. */
  | 'already_tracked'
  /** Vacía, sólo espacios o más larga que el máximo: no se persiste basura. */
  | 'invalid'
  /** El set llegó a su techo gobernado. Se rechaza explícito, NUNCA en silencio. */
  | 'capacity_exceeded'

export interface SeoKeywordTrackOutcome {
  /** La keyword normalizada (lo que quedó o habría quedado en la tabla). */
  keyword: string
  status: SeoKeywordTrackStatus
}

export type TrackKeywordsResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      keywordSetId: string
      outcomes: SeoKeywordTrackOutcome[]
      /** Membresías vigentes del target DESPUÉS del command (lo que se paga por ciclo). */
      activeKeywordCount: number
      /** Techo gobernado vigente, para que la UI pueda decir cuánto queda. */
      capacity: number
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'target_not_active'
        | 'no_entitlement'
        | 'no_keywords'
        | 'query_failed'
      status: null
    }

/**
 * Evento outbox del command (constante local del dominio, mismo patrón que el de captura:
 * el seam de extracción §17.3 evita acoplar `src/lib/growth/seo/**` al catálogo central).
 */
export const SEO_KEYWORD_SET_UPDATED_EVENT = 'growth.seo.keyword_set.updated'

/**
 * ═══ TASK-1308 — Command `untrackKeywords` (dejar de seguir) ═══
 *
 * La contraparte que faltaba, y su ausencia era un callejón sin salida DISEÑADO: el set
 * tiene techo, la UI decía "deja de seguir alguna" y no existía forma de hacerlo desde el
 * portal. Cerrar el ciclo también es lo que hace que el gasto sea reversible — sin esto,
 * seguir una keyword era un compromiso permanente.
 *
 * ⚠️ NO BORRA: cierra la ventana con `effective_to`. La tabla es append-only (trigger
 * anti-DELETE de TASK-1299) y el histórico de qué se midió y cuándo es justamente lo que
 * permite explicar una factura pasada.
 */
export type SeoKeywordUntrackStatus =
  /** Membresía vigente cerrada. Deja de entrar al rank capture del próximo ciclo. */
  | 'untracked'
  /** No había membresía vigente. Cero writes — el command es idempotente en ambos sentidos. */
  | 'not_tracked'
  | 'invalid'

export interface SeoKeywordUntrackOutcome {
  keyword: string
  status: SeoKeywordUntrackStatus
}

export type UntrackKeywordsResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      outcomes: SeoKeywordUntrackOutcome[]
      /** Membresías vigentes DESPUÉS del command (lo que se sigue pagando por ciclo). */
      activeKeywordCount: number
      capacity: number
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_entitlement' | 'no_keywords' | 'query_failed'
      status: null
    }
