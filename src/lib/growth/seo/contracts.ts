/**
 * TASK-1302 — Contratos del dominio SEO (materialización GSC + oportunidades).
 *
 * Tipos consumer-agnósticos: los consumen UI (TASK-1306/1308), Nexa y el lane
 * ecosystem/MCP (TASK-1645) sin lógica duplicada por consumer. Mandato parity del
 * operador 2026-08-05: todo reader nace con shape `{ ok } | { ok: false, errorCode }`.
 *
 * Este archivo NO importa `server-only`: es sólo tipos, y la UI necesita importarlos.
 */

import { type SearchConsoleConnectionStatus } from '@/lib/growth/search-console'

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
