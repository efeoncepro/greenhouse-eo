/**
 * Geometría de gráficos: del dato a las coordenadas. DOMAIN-FREE.
 *
 * No importa el contrato de ningún dominio — define sus propios tipos de entrada y quien compone
 * traduce. El catálogo de Insights y el del informe de auditoría SEO deben poder compartir esta
 * geometría sin que ninguno de los dos aparezca nombrado acá.
 *
 * Devuelve NÚMEROS, no HTML: porcentajes y ángulos que la plantilla pinta como ancho CSS, `d` de un
 * path o posición absoluta. La razón es la misma por la que existe `chart-bar-geometry` en el
 * catálogo comercial: si la plantilla escribe las etiquetas sin recalcular la geometría, el gráfico
 * miente. Acá el cálculo es único y las guardas lanzan.
 *
 * Decisiones de oficio aplicadas (Cleveland & McGill 1984; Tufte; Few):
 *
 * - **Posición y longitud antes que ángulo y área.** Por eso las porciones tienen techo duro: un
 *   lector estima mal un ángulo y peor un área.
 * - **Etiqueta directa sobre el dato, no leyenda.** En papel no hay hover: si el valor no está
 *   impreso junto a su marca, no se puede leer. Ida y vuelta a una leyenda es trabajo que el lector
 *   no debería hacer.
 * - **Distinguible en gris.** El documento se revisa impreso en escala de grises, que es una barra
 *   más alta que "colorblind-safe": exige separación de LUMINANCIA, no de tono.
 * - **La ausencia no es cero.** Un `null` viaja como hueco declarado; nunca se interpola ni se
 *   dibuja como 0.
 */

export class ChartGeometryError extends Error {
  readonly reason: string

  constructor(reason: string, detail: string) {
    super(`${reason}: ${detail}`)
    this.name = 'ChartGeometryError'
    this.reason = reason
  }
}

/** Una serie ya resuelta a números. `null` = ausencia declarada, nunca 0. */
export interface GeometrySeries {
  readonly seriesId: string
  readonly label: string
  readonly values: readonly (number | null)[]
}

export interface BarGeometry {
  readonly seriesId: string
  readonly dimensionIndex: number
  /** 0–100. La plantilla lo pinta como ancho o alto. */
  readonly lengthPct: number
  readonly value: number
}

export interface AxisScale {
  readonly min: number
  readonly max: number
  /** `true` sólo si el eje arranca en cero. Las barras lo exigen. */
  readonly baselineZero: boolean
}

const finiteValues = (series: readonly GeometrySeries[]): number[] =>
  series.flatMap(s => s.values.filter((v): v is number => v !== null))

/**
 * Escala de un eje de magnitud.
 *
 * `requireZeroBaseline` es obligatorio para barras: la longitud codifica el valor, y cortar el eje
 * multiplica visualmente una diferencia que no existe — el "lie factor" de Tufte. En líneas la
 * pendiente codifica el cambio, así que el cero no es obligatorio.
 */
export const resolveScale = (
  series: readonly GeometrySeries[],
  options: { readonly requireZeroBaseline: boolean }
): AxisScale => {
  const values = finiteValues(series)

  if (values.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna serie tiene un valor medible')
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)

  if (options.requireZeroBaseline && rawMin < 0) {
    throw new ChartGeometryError(
      'negative_with_zero_baseline',
      `hay un valor negativo (${rawMin}) y este gráfico exige base cero; un valor negativo no se oculta ni se dibuja como cero`
    )
  }

  const min = options.requireZeroBaseline ? 0 : rawMin
  const max = rawMax

  if (max === min) {
    // Todas las marcas iguales: sin rango no hay geometría honesta que dibujar.
    throw new ChartGeometryError(
      'flat_series',
      `todos los valores son ${max}; una comparación sin variación se lee mejor como cifra o tabla`
    )
  }

  return { min, max, baselineZero: options.requireZeroBaseline }
}

/**
 * Barras con base cero. Sirve a las tres variantes (simple, agrupada, apilada): lo que cambia es
 * cómo la plantilla dispone las marcas, no cómo se calcula su longitud.
 */
export const barGeometry = (series: readonly GeometrySeries[], dimensionCount: number): BarGeometry[] => {
  const scale = resolveScale(series, { requireZeroBaseline: true })
  const out: BarGeometry[] = []

  series.forEach(s => {
    if (s.values.length !== dimensionCount) {
      throw new ChartGeometryError(
        'series_dimension_mismatch',
        `la serie "${s.seriesId}" trae ${s.values.length} valores y el eje declara ${dimensionCount} dimensiones`
      )
    }

    s.values.forEach((value, dimensionIndex) => {
      if (value === null) return // hueco declarado: no se dibuja marca

      out.push({
        seriesId: s.seriesId,
        dimensionIndex,
        lengthPct: Math.round((value / scale.max) * 1000) / 10,
        value
      })
    })
  })

  return out
}

export interface LinePoint {
  readonly seriesId: string
  readonly index: number
  /** 0–100 sobre el ancho útil. */
  readonly xPct: number
  /** 0–100 desde abajo. */
  readonly yPct: number
  readonly value: number
  /** El último punto medible de la serie: se etiqueta siempre, es lo que el lector busca. */
  readonly isLast: boolean
}

export interface LineGeometry {
  readonly scale: AxisScale
  readonly points: readonly LinePoint[]
  /**
   * Tramos continuos. Un `null` CORTA el trazo en vez de unir los extremos: unirlos inventaría una
   * evolución que nadie midió.
   */
  readonly segments: readonly (readonly LinePoint[])[]
}

export const lineGeometry = (
  series: readonly GeometrySeries[],
  options: { readonly zeroBaseline?: boolean } = {}
): LineGeometry => {
  const scale = resolveScale(series, { requireZeroBaseline: options.zeroBaseline ?? false })
  const span = scale.max - scale.min
  const points: LinePoint[] = []
  const segments: LinePoint[][] = []

  series.forEach(s => {
    const lastMeasurable = s.values.reduce<number>((acc, v, i) => (v === null ? acc : i), -1)
    let run: LinePoint[] = []

    s.values.forEach((value, index) => {
      if (value === null) {
        if (run.length > 0) segments.push(run)
        run = []

        return
      }

      const point: LinePoint = {
        seriesId: s.seriesId,
        index,
        xPct:
          s.values.length === 1 ? 0 : Math.round((index / (s.values.length - 1)) * 1000) / 10,
        yPct: Math.round(((value - scale.min) / span) * 1000) / 10,
        value,
        isLast: index === lastMeasurable
      }

      points.push(point)
      run.push(point)
    })

    if (run.length > 0) segments.push(run)
  })

  return { scale, points, segments }
}

/**
 * Techo de porciones para circular y dona.
 *
 * Cleveland & McGill ubican el ángulo en cuarto lugar de precisión perceptual, detrás de posición y
 * longitud; pasadas unas pocas porciones el lector ya no compara, adivina. El contrato de datos
 * permite la familia y este techo la mantiene honesta: por encima, la respuesta correcta es una
 * barra horizontal, no una torta más apretada.
 */
export const MAX_SLICES = 3

export interface SliceGeometry {
  readonly seriesId: string
  readonly label: string
  readonly value: number
  readonly sharePct: number
  readonly startAngleDeg: number
  readonly endAngleDeg: number
}

/**
 * Porciones de un mismo total. Exige partes no superpuestas y no acepta negativos: una porción
 * negativa no existe.
 */
export const sliceGeometry = (parts: readonly { seriesId: string; label: string; value: number | null }[]): SliceGeometry[] => {
  const measurable = parts.filter((p): p is { seriesId: string; label: string; value: number } => p.value !== null)

  if (measurable.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna porción tiene valor medible')
  }

  if (measurable.length > MAX_SLICES) {
    throw new ChartGeometryError(
      'too_many_slices',
      `${measurable.length} porciones exceden el máximo de ${MAX_SLICES}; con más partes el lector estima mal el ángulo — usa una barra horizontal`
    )
  }

  const negative = measurable.find(p => p.value < 0)

  if (negative) {
    throw new ChartGeometryError(
      'negative_share',
      `la porción "${negative.seriesId}" es negativa (${negative.value}); una parte de un total no puede serlo`
    )
  }

  const total = measurable.reduce((sum, p) => sum + p.value, 0)

  if (total <= 0) {
    throw new ChartGeometryError('empty_total', 'el total de las porciones es cero')
  }

  let cursor = 0

  return measurable.map(part => {
    const sharePct = Math.round((part.value / total) * 1000) / 10
    const sweep = (part.value / total) * 360
    const startAngleDeg = Math.round(cursor * 10) / 10

    cursor += sweep

    return {
      seriesId: part.seriesId,
      label: part.label,
      value: part.value,
      sharePct,
      startAngleDeg,
      endAngleDeg: Math.round(cursor * 10) / 10
    }
  })
}

export interface ScatterPoint {
  readonly pointId: string
  readonly xPct: number
  readonly yPct: number
  readonly x: number
  readonly y: number
}

/**
 * Dispersión. Exige el par completo: un punto al que le falta una coordenada no se ubica, y
 * suponerla sería inventar la observación.
 */
export const scatterGeometry = (
  pairs: readonly { pointId: string; x: number | null; y: number | null }[]
): ScatterPoint[] => {
  const incomplete = pairs.find(p => (p.x === null) !== (p.y === null))

  if (incomplete) {
    throw new ChartGeometryError(
      'unpaired_observation',
      `la observación "${incomplete.pointId}" tiene una sola coordenada; una dispersión necesita el par completo`
    )
  }

  const complete = pairs.filter((p): p is { pointId: string; x: number; y: number } => p.x !== null && p.y !== null)

  if (complete.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna observación tiene el par completo')
  }

  const xs = complete.map(p => p.x)
  const ys = complete.map(p => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || 1

  return complete.map(p => ({
    pointId: p.pointId,
    x: p.x,
    y: p.y,
    xPct: Math.round(((p.x - xMin) / xSpan) * 1000) / 10,
    yPct: Math.round(((p.y - yMin) / ySpan) * 1000) / 10
  }))
}
