import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  isCurveUsableAtPosition,
  resolveExpectedCtrAtPosition,
  SEO_CTR_CURVE_SAMPLE_FLOOR,
  SEO_CTR_CURVE_SQL,
  type SeoOrgCtrCurve
} from '../ctr-curve'
import { isCurveUsableAtPosition as isCurveUsableForScore } from '../work-queue/priority-score'
import { getPriorityScoreConfig } from '../work-queue/score-versions'

const curveOf = (buckets: Record<number, { impressions: number; clicks: number }>): SeoOrgCtrCurve => {
  const curve: SeoOrgCtrCurve = new Map()

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
 * Curva REAL de `berel.com`, ventana 28d, medida contra PG el 2026-08-28. Curva SANA: el
 * bucket objetivo (5) tiene 37.600 impresiones y 370 clics → CTR 0,98%.
 */
const BEREL_CURVE = curveOf({
  1: { impressions: 94_657, clicks: 4464 },
  2: { impressions: 213_125, clicks: 6720 },
  3: { impressions: 27_835, clicks: 697 },
  4: { impressions: 33_833, clicks: 464 },
  5: { impressions: 37_600, clicks: 370 },
  6: { impressions: 49_148, clicks: 383 },
  7: { impressions: 72_239, clicks: 419 },
  8: { impressions: 59_144, clicks: 297 },
  9: { impressions: 59_698, clicks: 235 },
  10: { impressions: 43_151, clicks: 134 }
})

/**
 * 🔴 Curva REAL de `efeoncepro.com`, misma ventana y misma query. Casi entera en cero — no
 * porque el CTR sea cero, sino porque NADIE MIDIÓ LO SUFICIENTE. Es la curva que hacía fallar
 * al reader en silencio.
 */
const EFEONCE_CURVE = curveOf({
  1: { impressions: 32, clicks: 0 },
  2: { impressions: 26, clicks: 0 },
  3: { impressions: 25, clicks: 0 },
  4: { impressions: 57, clicks: 1 },
  5: { impressions: 75, clicks: 0 },
  6: { impressions: 322, clicks: 0 },
  7: { impressions: 410, clicks: 0 },
  8: { impressions: 350, clicks: 0 },
  9: { impressions: 104, clicks: 0 },
  10: { impressions: 68, clicks: 0 }
})

describe('TASK-1792 — el piso de muestra', () => {
  /**
   * Paridad con `work-queue/`. El umbral se ADOPTA de ahí; estos dos tests existen para que
   * moverlo de un solo lado sea imposible en silencio — el modo de divergencia que la matriz
   * de riesgo de la task nombra.
   */
  it('adopta el umbral de score-versions, no propone uno propio', () => {
    const config = getPriorityScoreConfig()

    expect(SEO_CTR_CURVE_SAMPLE_FLOOR.minBucketImpressions).toBe(config.curveMinBucketImpressions)
    expect(SEO_CTR_CURVE_SAMPLE_FLOOR.minBucketClicks).toBe(config.curveMinBucketClicks)
  })

  /**
   * 🔴 La paridad que de verdad importa es la del **PREDICADO**, no la de los números sueltos.
   *
   * Si mañana una versión del score agrega una tercera condición —un mínimo de días con datos,
   * por ejemplo— un test que sólo compare `1000` y `5` seguiría verde con los dos lados ya
   * divergidos. Comparar el VEREDICTO sobre una matriz de curvas fixture no tiene ese agujero:
   * cubre las fronteras de cada dimensión y los dos casos reales medidos contra PG.
   *
   * (Crédito del matiz: `greenhouse-eo-56`, dueña de `TASK-1700`, al acordar el mecanismo.)
   */
  it('el VEREDICTO coincide con el del score en toda la matriz de fronteras', () => {
    const fixtures: Array<{ label: string; curve: SeoOrgCtrCurve }> = [
      { label: 'berel.com real', curve: BEREL_CURVE },
      { label: 'efeoncepro.com real', curve: EFEONCE_CURVE },
      { label: 'bucket ausente', curve: new Map() },
      { label: 'justo en ambos pisos', curve: curveOf({ 5: { impressions: 1000, clicks: 5 } }) },
      { label: 'un clic bajo el piso', curve: curveOf({ 5: { impressions: 1000, clicks: 4 } }) },
      { label: 'una impresión bajo el piso', curve: curveOf({ 5: { impressions: 999, clicks: 5 } }) },
      { label: 'muchísima impresión, cero clics', curve: curveOf({ 5: { impressions: 500_000, clicks: 0 } }) },
      { label: 'muchos clics, muestra chica', curve: curveOf({ 5: { impressions: 40, clicks: 6 } }) },
      { label: 'bucket vacío', curve: curveOf({ 5: { impressions: 0, clicks: 0 } }) }
    ]

    for (const { label, curve } of fixtures) {
      for (const position of [1, 5, 8, 20]) {
        expect(
          isCurveUsableAtPosition(curve, position),
          `veredicto divergente en "${label}" posición ${position}: el reader y el score dejaron de responder lo mismo. Unifica el predicado o declara la divergencia.`
        ).toBe(isCurveUsableForScore(curve, position))
      }
    }
  })

  it('exige impresiones Y clics: mucha impresión con cero clics no sirve', () => {
    expect(isCurveUsableAtPosition(curveOf({ 5: { impressions: 500_000, clicks: 0 } }), 5)).toBe(false)
    // Y el reverso: pocos clics sobre muestra chica tampoco.
    expect(isCurveUsableAtPosition(curveOf({ 5: { impressions: 40, clicks: 6 } }), 5)).toBe(false)
  })

  it('declara NO utilizable el bucket 75/0 de efeoncepro.com', () => {
    expect(isCurveUsableAtPosition(EFEONCE_CURVE, 5)).toBe(false)
  })

  it('declara utilizable el bucket 37.600/370 de berel.com', () => {
    expect(isCurveUsableAtPosition(BEREL_CURVE, 5)).toBe(true)
  })

  it('un bucket ausente nunca es utilizable', () => {
    expect(isCurveUsableAtPosition(new Map(), 5)).toBe(false)
  })
})

describe('TASK-1792 — el veredicto de CTR esperado', () => {
  it('con curva sana usa el CTR MEDIDO y transporta su muestra', () => {
    const verdict = resolveExpectedCtrAtPosition(BEREL_CURVE, 5)

    expect(verdict.source).toBe('org_measured')
    expect(verdict.expectedCtr).toBeCloseTo(0.00984, 5)
    expect(verdict.sampleSize).toEqual({ impressions: 37_600, clicks: 370 })
  })

  /**
   * 🔴 EL ANTI-ASSERT. No prueba el caso de hoy: bloquea el valor VÁLIDO PERO DEGENERADO —
   * el que pasó todos los checks sin que nada fallara. Si algún día `org_measured` vuelve a
   * poder llevar un CTR de 0, el bug class volvió con el build verde.
   */
  it('un veredicto org_measured JAMÁS puede llevar expectedCtr = 0', () => {
    for (const position of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const curve of [BEREL_CURVE, EFEONCE_CURVE]) {
        const verdict = resolveExpectedCtrAtPosition(curve, position)

        if (verdict.source !== 'org_measured') continue

        expect(verdict.expectedCtr).not.toBe(0)
        expect(verdict.expectedCtr).toBeGreaterThan(0)
      }
    }
  })

  it('un 0 medido con muestra insuficiente es `unusable`, nunca un CTR esperado de 0', () => {
    const verdict = resolveExpectedCtrAtPosition(EFEONCE_CURVE, 5)

    expect(verdict.source).toBe('unusable')
    // El assert que importa: si esto vuelve a ser 0, volvió el defecto original.
    expect(verdict.expectedCtr).not.toBe(0)
    expect(verdict.expectedCtr).toBeGreaterThan(0)
    // Y la muestra viaja, para que el consumidor pueda decir POR QUÉ no alcanza.
    expect(verdict.sampleSize).toEqual({ impressions: 75, clicks: 0 })
  })

  /**
   * `unusable` y `fallback` producen el mismo número prestado pero son hechos distintos.
   * Colapsarlos reintroduciría la confusión de ausencia dentro del propio contrato.
   */
  it('distingue "la vimos y no alcanza" de "nunca la observamos"', () => {
    expect(resolveExpectedCtrAtPosition(EFEONCE_CURVE, 5).source).toBe('unusable')
    expect(resolveExpectedCtrAtPosition(EFEONCE_CURVE, 5).sampleSize).not.toBeNull()

    expect(resolveExpectedCtrAtPosition(EFEONCE_CURVE, 40).source).toBe('fallback')
    expect(resolveExpectedCtrAtPosition(EFEONCE_CURVE, 40).sampleSize).toBeNull()
  })

  it('normaliza la posición a bucket entero y nunca baja de 1', () => {
    expect(resolveExpectedCtrAtPosition(BEREL_CURVE, 5.4).targetPosition).toBe(5)
    expect(resolveExpectedCtrAtPosition(BEREL_CURVE, 0).targetPosition).toBe(1)
    expect(resolveExpectedCtrAtPosition(BEREL_CURVE, -3).targetPosition).toBe(1)
  })
})

describe('TASK-1792 — el SQL de la curva', () => {
  /**
   * La decisión de usabilidad NO se toma en el SQL: un `HAVING` borra el bucket de la
   * respuesta y vuelve indistinguible «no vino» de «vino sin muestra» — exactamente la
   * confusión que este módulo cierra.
   */
  it('no aplica HAVING: el filtro de muestra vive en TS, sobre datos inspeccionables', () => {
    expect(SEO_CTR_CURVE_SQL).not.toMatch(/HAVING/i)
    expect(SEO_CTR_CURVE_SQL).toMatch(/SUM\(impressions\)/)
    expect(SEO_CTR_CURVE_SQL).toMatch(/SUM\(clicks\)/)
  })

  /** Gate TASK-893: `capture_date` es DATE; `EXTRACT(EPOCH FROM (a - b))` revienta en runtime. */
  it('no hace date-math prohibida sobre columnas DATE', () => {
    expect(SEO_CTR_CURVE_SQL).not.toMatch(/EXTRACT\s*\(\s*EPOCH/i)
    expect(SEO_CTR_CURVE_SQL).toMatch(/CURRENT_DATE - \$2::int/)
  })
})
