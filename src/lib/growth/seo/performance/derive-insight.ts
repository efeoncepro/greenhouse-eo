import type { SeoPerformanceSummary } from '../contracts'

/**
 * TASK-1307 — lectura cruzada del resumen: la pantalla muestra 4 KPIs, pero el diagnóstico
 * SEO/AEO vive en la RELACIÓN entre ellos (¿cayeron los clics porque perdimos posición,
 * porque cayó la demanda, o porque el SERP nos come el CTR aunque rankeemos igual?).
 *
 * Es una función PURA sobre los mismos totales que alimentan la banda de KPIs — deriva,
 * no re-consulta — y sólo habla cuando el patrón es inequívoco según umbrales explícitos.
 * Sin ventana previa comparable, o con señales mezcladas, devuelve `null` y la UI no
 * muestra nada: un insight ambiguo es peor que ninguno (contrato de honestidad del módulo).
 *
 * Umbrales (los mismos juicios ya calibrados en la pantalla):
 * - posición estable = |Δ| < 0.3 (el umbral de neutralidad de la tabla);
 * - movimiento de volumen relevante = |Δ%| ≥ 15;
 * - movimiento de CTR relevante = |Δ| ≥ 0.5 puntos porcentuales.
 */

export type SeoPerformanceInsightKind =
  /** Clics e impresiones caen juntos con posición estable: cayó la DEMANDA, no el sitio. */
  | 'demand_drop'
  /** Posición estable + impresiones estables + CTR cae: el SERP captura el click (AI Overviews / features). */
  | 'ctr_erosion'
  /** La mejora de posición explica el alza de clics. */
  | 'rank_gain'
  /** La pérdida de posición explica la caída de clics. */
  | 'rank_loss'

export interface SeoPerformanceInsight {
  kind: SeoPerformanceInsightKind
  /** Δ de posición (negativo = mejora). null si alguna ventana no tiene posición. */
  positionDelta: number | null
  /** Δ% de clics vs ventana anterior. */
  clicksDeltaPercent: number | null
  /** Δ% de impresiones vs ventana anterior. */
  impressionsDeltaPercent: number | null
  /** Δ de CTR en puntos porcentuales. */
  ctrDeltaPoints: number | null
}

const POSITION_STABLE_THRESHOLD = 0.3
const VOLUME_RELEVANT_PERCENT = 15
const CTR_RELEVANT_POINTS = 0.5

const percentDelta = (now: number, before: number): number | null =>
  before === 0 ? null : ((now - before) / before) * 100

export const deriveSeoPerformanceInsight = (summary: SeoPerformanceSummary): SeoPerformanceInsight | null => {
  const { current, previous } = summary

  if (!previous) return null

  const clicksPct = percentDelta(current.clicks, previous.clicks)
  const impressionsPct = percentDelta(current.impressions, previous.impressions)

  const positionDelta =
    current.position === null || previous.position === null ? null : current.position - previous.position

  const ctrDeltaPoints = current.ctr === null || previous.ctr === null ? null : (current.ctr - previous.ctr) * 100

  const base = {
    positionDelta,
    clicksDeltaPercent: clicksPct,
    impressionsDeltaPercent: impressionsPct,
    ctrDeltaPoints
  }

  const positionStable = positionDelta !== null && Math.abs(positionDelta) < POSITION_STABLE_THRESHOLD

  // Orden de evaluación: primero los patrones que EXCLUYEN al sitio como causa (demanda,
  // SERP), después los atribuibles a posición. El primero inequívoco gana.
  if (
    positionStable &&
    clicksPct !== null &&
    clicksPct <= -VOLUME_RELEVANT_PERCENT &&
    impressionsPct !== null &&
    impressionsPct <= -VOLUME_RELEVANT_PERCENT
  ) {
    return { kind: 'demand_drop', ...base }
  }

  if (
    positionStable &&
    impressionsPct !== null &&
    Math.abs(impressionsPct) < VOLUME_RELEVANT_PERCENT &&
    ctrDeltaPoints !== null &&
    ctrDeltaPoints <= -CTR_RELEVANT_POINTS
  ) {
    return { kind: 'ctr_erosion', ...base }
  }

  if (
    positionDelta !== null &&
    positionDelta <= -POSITION_STABLE_THRESHOLD &&
    clicksPct !== null &&
    clicksPct >= VOLUME_RELEVANT_PERCENT
  ) {
    return { kind: 'rank_gain', ...base }
  }

  if (
    positionDelta !== null &&
    positionDelta >= POSITION_STABLE_THRESHOLD &&
    clicksPct !== null &&
    clicksPct <= -VOLUME_RELEVANT_PERCENT
  ) {
    return { kind: 'rank_loss', ...base }
  }

  return null
}
