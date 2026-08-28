import { describe, expect, it } from 'vitest'

import {
  computePriorityScore,
  isCurveUsableAtPosition,
  type OrgCtrCurve
} from '../priority-score'
import { getPriorityScoreConfig } from '../score-versions'

const curveOf = (buckets: Record<number, { impressions: number; clicks: number }>): OrgCtrCurve => {
  const curve: OrgCtrCurve = new Map()

  for (const [position, sample] of Object.entries(buckets)) {
    curve.set(Number(position), {
      impressions: sample.impressions,
      clicks: sample.clicks,
      ctr: sample.impressions > 0 ? sample.clicks / sample.impressions : 0
    })
  }

  return curve
}

/**
 * Curva REAL de berel.com, ventana 28d, medida contra PG el 2026-08-28. Es una curva sana:
 * el bucket objetivo (5) tiene 37.600 impresiones y 370 clics → CTR 0,98%.
 *
 * Ese 0,98% es ~6× menor que el 6% de las tablas de industria para posición 1–5, y coincide
 * con la curva medida que documenta la skill `seo-aeo` para un vertical deprimido (1,12% en
 * posición 5). Es exactamente el efecto que derivar la curva del propio sitio absorbe sin
 * tener que estimarlo.
 */
const BEREL_CURVE = curveOf({
  1: { impressions: 94_657, clicks: 4464 },
  2: { impressions: 213_125, clicks: 6720 },
  3: { impressions: 27_835, clicks: 697 },
  4: { impressions: 33_833, clicks: 464 },
  5: { impressions: 37_600, clicks: 370 },
  8: { impressions: 59_144, clicks: 297 }
})

/**
 * 🔴 Curva REAL de efeoncepro.com, misma ventana y misma query. Casi entera en cero — no
 * porque el CTR sea cero, sino porque NADIE MIDIÓ LO SUFICIENTE. Es la curva que hace fallar
 * al reader legacy en silencio, y el caso que la banda 2 existe para declarar.
 */
const EFEONCE_CURVE = curveOf({
  1: { impressions: 32, clicks: 0 },
  2: { impressions: 26, clicks: 0 },
  3: { impressions: 25, clicks: 0 },
  4: { impressions: 57, clicks: 1 },
  5: { impressions: 75, clicks: 0 },
  6: { impressions: 322, clicks: 0 },
  7: { impressions: 410, clicks: 0 },
  8: { impressions: 350, clicks: 0 }
})

describe('TASK-1700 — computePriorityScore', () => {
  it('banda 1: clics incrementales = impresiones × (CTR objetivo − CTR actual)', () => {
    // 10.000 impresiones, 20 clics → CTR actual 0,2%. Objetivo (pos 5 de Berel): 0,98404%.
    const result = computePriorityScore({
      impressions: 10_000,
      clicks: 20,
      weightedPosition: 12,
      curve: BEREL_CURVE
    })

    expect(result.basis).toBe('measured_incremental_clicks')
    expect(result.band).toBe(1)
    expect(result.score).toBeCloseTo(10_000 * (370 / 37_600 - 20 / 10_000), 3)
    expect(result.breakdown.ctrCurveSource).toBe('org_measured')
  })

  it('banda 1: clampea a cero cuando el CTR actual ya supera al esperado', () => {
    // 5% actual contra 0,98% esperado: la ganancia por POSICIÓN es 0, no negativa.
    const result = computePriorityScore({
      impressions: 1000,
      clicks: 50,
      weightedPosition: 9,
      curve: BEREL_CURVE
    })

    expect(result.band).toBe(1)
    expect(result.score).toBe(0)
    expect(result.breakdown.basisReason).toContain('snippet')
  })

  it('banda 3: sin impresiones no hay score, y el verbo honesto es medir', () => {
    const result = computePriorityScore({
      impressions: 0,
      clicks: 0,
      weightedPosition: null,
      curve: BEREL_CURVE
    })

    expect(result.basis).toBe('no_measured_demand')
    expect(result.band).toBe(3)
    expect(result.score).toBeNull()
    expect(result.breakdown.incrementalClicks).toBeNull()
  })

  it('banda 2: hay demanda medida pero la curva no alcanza', () => {
    const result = computePriorityScore({
      impressions: 5000,
      clicks: 10,
      weightedPosition: 11,
      curve: EFEONCE_CURVE
    })

    expect(result.basis).toBe('measured_without_curve')
    expect(result.band).toBe(2)
    expect(result.score).toBeNull()
    expect(result.breakdown.ctrCurveSource).toBe('unusable')
    // El CTR actual SÍ se conoce: lo que falta es el esperado.
    expect(result.breakdown.currentCtr).toBeCloseTo(0.002, 6)
    expect(result.breakdown.expectedCtrAtTarget).toBeNull()
  })

  /**
   * 🔴 REGRESIÓN DEL BUG CLASS DEL READER LEGACY (evidencia de `greenhouse-eo-63`, 2026-08-28).
   *
   * `expectedCtrAt` del reader legacy hace `if (typeof measured === 'number') return measured`:
   * un **0 medido pasa el guard** y anula el fallback. Con la curva de efeoncepro eso da
   * `targetCtr = 0` → `estimatedClickGain = 0` para TODA la lente → el `.sort()` es un no-op
   * y el titular afirma "no hay oportunidad" sobre un sitio con 410 impresiones en posición 7.
   *
   * Es la doctrina ●/◑ violada en su centro: **ausencia de evidencia tratada como evidencia
   * de cero**. Este test fija que la cola NO puede heredarlo: un bucket con cero clics jamás
   * es "CTR esperado 0", es muestra insuficiente, y cae a banda 2 con score NULL.
   *
   * El modo de falla que atrapa si alguien "simplifica" el resolver: una banda 1 entera con
   * score 0 pasaría el CHECK de la base sin problema —el número existe y es válido— y sólo
   * este test la ve.
   */
  it('NO hereda el bug legacy: un 0 medido es muestra insuficiente, nunca un CTR esperado de 0', () => {
    const result = computePriorityScore({
      impressions: 410,
      clicks: 0,
      weightedPosition: 7,
      curve: EFEONCE_CURVE
    })

    expect(result.band).not.toBe(1)
    expect(result.basis).toBe('measured_without_curve')
    expect(result.score).toBeNull()
    // El anti-assert que importa: si algún día esto vuelve a ser 0 en vez de null, el bug volvió.
    expect(result.breakdown.expectedCtrAtTarget).not.toBe(0)
  })

  it('el piso mira impresiones Y clics: mucha impresión con cero clics sigue sin servir', () => {
    const config = getPriorityScoreConfig()

    // Supera el piso de impresiones por lejos, pero no hay un solo clic que estime el CTR.
    const curve = curveOf({ 5: { impressions: 500_000, clicks: 0 } })

    expect(isCurveUsableAtPosition(curve, 5, config)).toBe(false)

    // Y el reverso: pocos clics sobre muestra chica tampoco.
    expect(isCurveUsableAtPosition(curveOf({ 5: { impressions: 40, clicks: 6 } }), 5, config)).toBe(false)

    // La curva de Berel sí pasa; la de efeoncepro no. Es la frontera que el piso dibuja.
    expect(isCurveUsableAtPosition(BEREL_CURVE, 5, config)).toBe(true)
    expect(isCurveUsableAtPosition(EFEONCE_CURVE, 5, config)).toBe(false)
  })

  it('la base sale de la EVIDENCIA y no del origen: un candidato con impresiones se puntúa', () => {
    // `readKeywordDiscovery` compone `measuredGsc` y su orden por defecto premia justo este
    // caso. Atar la banda al origen habría sido una regla que se rompe sola.
    const result = computePriorityScore({
      impressions: 2400,
      clicks: 3,
      weightedPosition: 14,
      curve: BEREL_CURVE
    })

    expect(result.band).toBe(1)
    expect(result.score).toBeGreaterThan(0)
  })
})
