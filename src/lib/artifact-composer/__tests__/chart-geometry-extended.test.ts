import { describe, expect, it } from 'vitest'

import {
  bulletGeometry,
  ChartGeometryError,
  funnelGeometry,
  gaugeGeometry,
  heatmapGeometry,
  upsetGeometry,
  vennTwoGeometry,
  waffleGeometry,
  waterfallGeometry,
  WAFFLE_CELLS
} from '../chart-geometry'

describe('bulletGeometry', () => {
  it('ubica valor y meta en la MISMA escala', () => {
    const b = bulletGeometry(80, 100, { ceiling: 200 })

    expect(b.valuePct).toBe(40)
    expect(b.targetPct).toBe(50)
  })

  it('declara si la meta se alcanzó, en vez de dejarlo a la vista', () => {
    expect(bulletGeometry(100, 100).reached).toBe(true)
    expect(bulletGeometry(99, 100).reached).toBe(false)
  })

  it('rechaza una meta no positiva', () => {
    expect(() => bulletGeometry(10, 0)).toThrow(/invalid_target/)
  })
})

describe('funnelGeometry', () => {
  const stage = (stageId: string, value: number) => ({ stageId, label: stageId, value })

  it('mide cada etapa contra la primera y calcula la caída entre etapas', () => {
    const f = funnelGeometry([stage('impresiones', 1000), stage('clics', 250), stage('sesiones', 200)])

    expect(f.map(s => s.widthPct)).toEqual([100, 25, 20])
    expect(f[1].stepRatePct).toBe(25)
    expect(f[2].stepRatePct).toBe(80)
    expect(f[0].stepRatePct).toBeNull()
  })

  it('RECHAZA una etapa que crece: eso no es un embudo, son categorías', () => {
    expect(() => funnelGeometry([stage('a', 100), stage('b', 140)])).toThrow(/stage_grows/)
  })

  it('rechaza un embudo de una sola etapa', () => {
    expect(() => funnelGeometry([stage('a', 100)])).toThrow(/too_few_stages/)
  })
})

describe('waterfallGeometry', () => {
  it('flota los pasos sobre el acumulado y ancla los totales a la base', () => {
    const w = waterfallGeometry([
      { stepId: 'inicio', label: 'Julio', delta: 100, isTotal: true },
      { stepId: 'contenido', label: 'Contenido nuevo', delta: 18 },
      { stepId: 'posiciones', label: 'Posiciones perdidas', delta: -6 },
      { stepId: 'cierre', label: 'Agosto', delta: 112, isTotal: true }
    ])

    expect(w.map(b => b.direction)).toEqual(['total', 'increase', 'decrease', 'total'])
    expect(w[1].runningTotal).toBe(118)
    expect(w[2].runningTotal).toBe(112)
    expect(w[0].bottomPct).toBe(0)
  })

  it('rechaza una cascada sin variación', () => {
    expect(() => waterfallGeometry([{ stepId: 'a', label: 'a', delta: 0 }])).toThrow(/flat_series/)
  })
})

describe('gaugeGeometry', () => {
  it('traduce el valor a grados sobre el barrido declarado', () => {
    const g = gaugeGeometry(50, { sweepDeg: 270 })

    expect(g.progressPct).toBe(50)
    expect(g.sweptDeg).toBe(135)
  })

  it('rechaza un medidor cerrado: un valor bajo se leería como casi completo', () => {
    expect(() => gaugeGeometry(10, { sweepDeg: 360 })).toThrow(/full_circle_gauge/)
  })

  it('rechaza un valor fuera de rango en vez de recortarlo al tope', () => {
    expect(() => gaugeGeometry(140)).toThrow(/value_out_of_range/)
  })

  it('resuelve la banda del umbral cuando se declaran', () => {
    const bands = [
      { upTo: 40, name: 'crítico' },
      { upTo: 70, name: 'atención' },
      { upTo: 100, name: 'óptimo' }
    ]

    expect(gaugeGeometry(35, { bands }).band).toBe('crítico')
    expect(gaugeGeometry(85, { bands }).band).toBe('óptimo')
  })
})

describe('heatmapGeometry', () => {
  it('normaliza la intensidad sobre el rango observado', () => {
    const cells = heatmapGeometry([
      { rowId: 'seo', columnId: 'ene', value: 0 },
      { rowId: 'seo', columnId: 'feb', value: 50 },
      { rowId: 'seo', columnId: 'mar', value: 100 }
    ])

    expect(cells.map(c => c.intensityPct)).toEqual([0, 50, 100])
  })

  it('una celda SIN DATO queda en null, no en intensidad cero', () => {
    const cells = heatmapGeometry([
      { rowId: 'seo', columnId: 'ene', value: null },
      { rowId: 'seo', columnId: 'feb', value: 10 },
      { rowId: 'seo', columnId: 'mar', value: 20 }
    ])

    expect(cells[0].intensityPct).toBeNull()
  })
})

describe('waffleGeometry', () => {
  it('reparte exactamente cien celdas', () => {
    const cells = waffleGeometry([
      { seriesId: 'a', value: 33 },
      { seriesId: 'b', value: 33 },
      { seriesId: 'c', value: 34 }
    ])

    expect(cells).toHaveLength(WAFFLE_CELLS)
    expect(cells.every(c => c.seriesId !== null)).toBe(true)
  })

  it('reparte por participación, no por número de partes', () => {
    const cells = waffleGeometry([
      { seriesId: 'a', value: 75 },
      { seriesId: 'b', value: 25 }
    ])

    expect(cells.filter(c => c.seriesId === 'a')).toHaveLength(75)
    expect(cells.filter(c => c.seriesId === 'b')).toHaveLength(25)
  })

  it('con restos, ninguna parte medible desaparece y el total sigue siendo cien', () => {
    const cells = waffleGeometry([
      { seriesId: 'a', value: 1 },
      { seriesId: 'b', value: 1 },
      { seriesId: 'c', value: 1 }
    ])

    expect(cells).toHaveLength(WAFFLE_CELLS)

    for (const id of ['a', 'b', 'c']) {
      expect(cells.filter(c => c.seriesId === id).length).toBeGreaterThan(0)
    }
  })
})

/** Área exacta de la lente entre dos círculos — el juez independiente del Venn. */
const lensArea = (rA: number, rB: number, d: number): number => {
  if (d >= rA + rB) return 0
  if (d <= Math.abs(rA - rB)) return Math.PI * Math.min(rA, rB) ** 2

  const a = rA * rA
  const b = rB * rB

  return (
    a * Math.acos((d * d + a - b) / (2 * d * rA)) +
    b * Math.acos((d * d + b - a) / (2 * d * rB)) -
    0.5 * Math.sqrt((-d + rA + rB) * (d + rA - rB) * (d - rA + rB) * (d + rA + rB))
  )
}

describe('vennTwoGeometry', () => {
  it('los círculos tienen ÁREA proporcional a la cardinalidad de cada conjunto', () => {
    const v = vennTwoGeometry(300, 100, 200)

    expect(Math.PI * v.radiusA ** 2).toBeCloseTo(500, 6)
    expect(Math.PI * v.radiusB ** 2).toBeCloseTo(300, 6)
  })

  it('la distancia entre centros produce EXACTAMENTE el área de intersección pedida', () => {
    for (const [onlyA, onlyB, both] of [
      [300, 100, 200],
      [50, 50, 10],
      [1000, 20, 5],
      [10, 900, 80]
    ]) {
      const v = vennTwoGeometry(onlyA, onlyB, both)

      // Juez independiente: se recalcula la lente desde la geometría devuelta.
      expect(lensArea(v.radiusA, v.radiusB, v.centerDistance)).toBeCloseTo(both, 3)
    }
  })

  it('conjuntos disjuntos: los círculos se tocan sin solaparse', () => {
    const v = vennTwoGeometry(100, 100, 0)

    expect(v.centerDistance).toBeCloseTo(v.radiusA + v.radiusB, 9)
  })

  it('contención total: el menor cae dentro del mayor', () => {
    const v = vennTwoGeometry(400, 0, 100)

    expect(v.centerDistance).toBeCloseTo(Math.abs(v.radiusA - v.radiusB), 9)
  })

  it('rechaza un conjunto vacío: eso es un círculo, no un Venn', () => {
    expect(() => vennTwoGeometry(0, 50, 0)).toThrow(/empty_set/)
  })

  it('rechaza cardinalidades negativas', () => {
    expect(() => vennTwoGeometry(-1, 10, 5)).toThrow(ChartGeometryError)
  })
})

describe('upsetGeometry', () => {
  it('ordena las intersecciones de mayor a menor y mide por longitud', () => {
    const u = upsetGeometry(
      ['google', 'ia', 'convierte'],
      [
        { setIds: ['google'], size: 40 },
        { setIds: ['google', 'ia'], size: 120 },
        { setIds: ['ia'], size: 80 }
      ]
    )

    expect(u.intersections.map(i => i.size)).toEqual([120, 80, 40])
    expect(u.intersections[0].lengthPct).toBe(100)
    expect(u.intersections[2].lengthPct).toBeCloseTo(33.3, 1)
  })

  it('rechaza una intersección que referencia un conjunto no declarado', () => {
    expect(() =>
      upsetGeometry(['a', 'b'], [{ setIds: ['a', 'fantasma'], size: 10 }])
    ).toThrow(/unknown_set/)
  })

  it('rechaza menos de dos conjuntos: para uno solo no hay intersección que mostrar', () => {
    expect(() => upsetGeometry(['a'], [{ setIds: ['a'], size: 10 }])).toThrow(/too_few_sets/)
  })

  it('es determinista ante empates de tamaño', () => {
    const args: [string[], { setIds: string[]; size: number }[]] = [
      ['a', 'b', 'c'],
      [
        { setIds: ['c'], size: 10 },
        { setIds: ['a'], size: 10 },
        { setIds: ['b'], size: 10 }
      ]
    ]

    expect(upsetGeometry(...args)).toEqual(upsetGeometry(...args))
    expect(upsetGeometry(...args).intersections.map(i => i.setIds[0])).toEqual(['a', 'b', 'c'])
  })
})
