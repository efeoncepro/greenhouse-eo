import { describe, expect, it } from 'vitest'

import {
  barGeometry,
  ChartGeometryError,
  lineGeometry,
  MAX_SLICES,
  resolveScale,
  scatterGeometry,
  sliceGeometry,
  type GeometrySeries
} from '../chart-geometry'

const serie = (seriesId: string, values: (number | null)[]): GeometrySeries => ({
  seriesId,
  label: seriesId,
  values
})

describe('resolveScale', () => {
  it('fuerza base cero cuando el gráfico la exige', () => {
    expect(resolveScale([serie('a', [40, 80])], { requireZeroBaseline: true })).toEqual({
      min: 0,
      max: 80,
      baselineZero: true
    })
  })

  it('deja que una línea arranque en su mínimo real, porque la pendiente codifica el cambio', () => {
    expect(resolveScale([serie('a', [40, 80])], { requireZeroBaseline: false }).min).toBe(40)
  })

  it('rechaza un negativo en un gráfico de base cero en vez de ocultarlo', () => {
    expect(() => resolveScale([serie('a', [-5, 10])], { requireZeroBaseline: true })).toThrow(
      ChartGeometryError
    )
  })

  it('rechaza una serie sin variación: sin rango no hay geometría honesta', () => {
    expect(() => resolveScale([serie('a', [7, 7])], { requireZeroBaseline: false })).toThrow(
      /flat_series/
    )
  })

  it('rechaza una serie sin ningún valor medible', () => {
    expect(() => resolveScale([serie('a', [null, null])], { requireZeroBaseline: true })).toThrow(
      /no_measurable_values/
    )
  })
})

describe('barGeometry', () => {
  it('la longitud es proporcional al valor sobre el máximo', () => {
    const bars = barGeometry([serie('a', [50, 100])], 2)

    expect(bars.map(b => b.lengthPct)).toEqual([50, 100])
  })

  it('un null no dibuja marca — no es una barra de largo cero', () => {
    const bars = barGeometry([serie('a', [null, 100])], 2)

    expect(bars).toHaveLength(1)
    expect(bars[0].dimensionIndex).toBe(1)
  })

  it('rechaza una serie con más o menos valores que dimensiones declaradas', () => {
    expect(() => barGeometry([serie('a', [10, 20, 30])], 2)).toThrow(/series_dimension_mismatch/)
  })

  it('conserva el valor junto a la geometría, para que la etiqueta no se escriba aparte', () => {
    expect(barGeometry([serie('a', [25, 100])], 2)[0]).toMatchObject({ value: 25, lengthPct: 25 })
  })
})

describe('lineGeometry', () => {
  it('corta el trazo en un hueco en vez de unir los extremos', () => {
    const { segments } = lineGeometry([serie('a', [10, null, 30])])

    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveLength(1)
    expect(segments[1]).toHaveLength(1)
  })

  it('marca el último punto medible, que es el que el lector busca', () => {
    const { points } = lineGeometry([serie('a', [10, 30, null])])

    expect(points.find(p => p.isLast)?.index).toBe(1)
  })

  it('reparte el eje horizontal por índice', () => {
    const { points } = lineGeometry([serie('a', [10, 20, 30])])

    expect(points.map(p => p.xPct)).toEqual([0, 50, 100])
  })
})

describe('sliceGeometry', () => {
  const part = (seriesId: string, value: number | null) => ({ seriesId, label: seriesId, value })

  it('reparte 360 grados de forma contigua', () => {
    const slices = sliceGeometry([part('a', 50), part('b', 50)])

    expect(slices[0].startAngleDeg).toBe(0)
    expect(slices[0].endAngleDeg).toBe(180)
    expect(slices[1].endAngleDeg).toBe(360)
  })

  it('rechaza más porciones de las que un lector puede comparar por ángulo', () => {
    const parts = Array.from({ length: MAX_SLICES + 1 }, (_, i) => part(`p${i}`, 10))

    expect(() => sliceGeometry(parts)).toThrow(/too_many_slices/)
  })

  it('rechaza una porción negativa: una parte de un total no puede serlo', () => {
    expect(() => sliceGeometry([part('a', -10), part('b', 20)])).toThrow(/negative_share/)
  })

  it('calcula la participación además del ángulo, para imprimirla junto a la porción', () => {
    const slices = sliceGeometry([part('a', 25), part('b', 75)])

    expect(slices.map(s => s.sharePct)).toEqual([25, 75])
  })
})

describe('scatterGeometry', () => {
  it('rechaza una observación con una sola coordenada en vez de suponer la otra', () => {
    expect(() => scatterGeometry([{ pointId: 'p1', x: 10, y: null }])).toThrow(/unpaired_observation/)
  })

  it('normaliza sobre el rango observado', () => {
    const points = scatterGeometry([
      { pointId: 'a', x: 0, y: 0 },
      { pointId: 'b', x: 10, y: 20 }
    ])

    expect(points.map(p => [p.xPct, p.yPct])).toEqual([
      [0, 0],
      [100, 100]
    ])
  })

  it('un par completo con ambas coordenadas nulas se descarta, no rompe', () => {
    const points = scatterGeometry([
      { pointId: 'a', x: null, y: null },
      { pointId: 'b', x: 1, y: 2 },
      { pointId: 'c', x: 3, y: 4 }
    ])

    expect(points.map(p => p.pointId)).toEqual(['b', 'c'])
  })
})
