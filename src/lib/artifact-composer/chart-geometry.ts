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

/* ────────────────────────────────────────────────────────────────────────────
 * Familias extendidas (TASK-1847). Mismo principio: números, no HTML; guardas
 * que lanzan antes que dibujar algo defendible a medias.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface BulletGeometry {
  /** 0–100 del valor medido sobre la escala. */
  readonly valuePct: number
  /** 0–100 de la meta sobre la misma escala. */
  readonly targetPct: number
  readonly value: number
  readonly target: number
  /** `true` cuando el valor alcanzó o superó la meta. */
  readonly reached: boolean
}

/**
 * Bullet (Few): un valor contra su meta, en una sola línea.
 *
 * La meta es una MARCA sobre la misma escala, no una segunda barra: comparar dos longitudes
 * paralelas invita a leer la diferencia como magnitud propia, que es lo que el bullet evita.
 */
export const bulletGeometry = (
  value: number,
  target: number,
  options: { readonly ceiling?: number } = {}
): BulletGeometry => {
  if (target <= 0) {
    throw new ChartGeometryError('invalid_target', `la meta debe ser positiva; llegó ${target}`)
  }

  if (value < 0) {
    throw new ChartGeometryError('negative_value', `un bullet no dibuja valores negativos; llegó ${value}`)
  }

  const ceiling = options.ceiling ?? Math.max(value, target) * 1.1

  return {
    valuePct: Math.round((value / ceiling) * 1000) / 10,
    targetPct: Math.round((target / ceiling) * 1000) / 10,
    value,
    target,
    reached: value >= target
  }
}

export interface FunnelStage {
  readonly stageId: string
  readonly label: string
  readonly value: number
}

export interface FunnelStageGeometry extends FunnelStage {
  /** 0–100 respecto de la primera etapa. */
  readonly widthPct: number
  /** Tasa de paso desde la etapa anterior; `null` en la primera. */
  readonly stepRatePct: number | null
  /** Tasa acumulada desde la primera etapa. */
  readonly cumulativeRatePct: number
}

/**
 * Embudo de etapas estrictamente ordenadas.
 *
 * La guarda que lo mantiene honesto: **cada etapa debe ser subconjunto de la anterior**. Si una
 * etapa crece, no es un embudo — son categorías puestas en forma de embudo, que es una manera de
 * hacer parecer un proceso lo que no lo es.
 *
 * Lo que el lector busca no es el ancho sino la CAÍDA, así que la tasa de paso se calcula acá y
 * viaja con cada etapa: escribirla aparte es invitar a que diverja del dibujo.
 */
export const funnelGeometry = (stages: readonly FunnelStage[]): FunnelStageGeometry[] => {
  if (stages.length < 2) {
    throw new ChartGeometryError('too_few_stages', `un embudo necesita al menos 2 etapas; llegaron ${stages.length}`)
  }

  const first = stages[0]!

  if (first.value <= 0) {
    throw new ChartGeometryError('empty_funnel', 'la primera etapa del embudo es cero: no hay nada que caiga')
  }

  stages.forEach((stage, index) => {
    if (stage.value < 0) {
      throw new ChartGeometryError('negative_stage', `la etapa "${stage.stageId}" es negativa (${stage.value})`)
    }

    const previous = stages[index - 1]

    if (previous && stage.value > previous.value) {
      throw new ChartGeometryError(
        'stage_grows',
        `la etapa "${stage.stageId}" (${stage.value}) supera a "${previous.stageId}" (${previous.value}); ` +
          'un embudo exige que cada etapa sea subconjunto de la anterior — esto son categorías, no un proceso'
      )
    }
  })

  return stages.map((stage, index) => {
    const previous = stages[index - 1]

    return {
      ...stage,
      widthPct: Math.round((stage.value / first.value) * 1000) / 10,
      stepRatePct:
        previous && previous.value > 0 ? Math.round((stage.value / previous.value) * 1000) / 10 : null,
      cumulativeRatePct: Math.round((stage.value / first.value) * 1000) / 10
    }
  })
}

export interface WaterfallStep {
  readonly stepId: string
  readonly label: string
  /** Positivo suma, negativo resta. El primero y el último pueden declararse como total. */
  readonly delta: number
  readonly isTotal?: boolean
}

export interface WaterfallBar {
  readonly stepId: string
  readonly label: string
  readonly delta: number
  /** 0–100 desde la base del eje. */
  readonly bottomPct: number
  readonly heightPct: number
  readonly direction: 'increase' | 'decrease' | 'total'
  /** Acumulado tras aplicar este paso. */
  readonly runningTotal: number
}

/**
 * Cascada: de dónde a dónde, y qué explicó el cambio.
 *
 * Es la única familia del set que responde POR QUÉ cambió algo, y por eso vale su plantilla. El
 * eje arranca en cero porque las alturas son magnitudes; los totales se anclan a la base y los
 * pasos flotan sobre el acumulado.
 */
export const waterfallGeometry = (steps: readonly WaterfallStep[]): WaterfallBar[] => {
  if (steps.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'una cascada sin pasos no dibuja nada')
  }

  let running = 0

  const raw = steps.map(step => {
    const start = step.isTotal ? 0 : running

    running = step.isTotal ? step.delta : running + step.delta

    return { step, start, end: running }
  })

  const bounds = raw.flatMap(r => [r.start, r.end])
  const max = Math.max(...bounds, 0)
  const min = Math.min(...bounds, 0)
  const span = max - min

  if (span === 0) {
    throw new ChartGeometryError('flat_series', 'la cascada no varía: sin rango no hay geometría honesta')
  }

  return raw.map(({ step, start, end }) => {
    const low = Math.min(start, end)
    const high = Math.max(start, end)

    return {
      stepId: step.stepId,
      label: step.label,
      delta: step.delta,
      bottomPct: Math.round(((low - min) / span) * 1000) / 10,
      heightPct: Math.round(((high - low) / span) * 1000) / 10,
      direction: step.isTotal ? 'total' : step.delta >= 0 ? 'increase' : 'decrease',
      runningTotal: end
    }
  })
}

export interface GaugeGeometry {
  readonly value: number
  /** 0–100 de avance sobre el arco. */
  readonly progressPct: number
  /** Grados recorridos sobre el barrido declarado. */
  readonly sweptDeg: number
  readonly band: string | null
}

/**
 * Medidor de un solo número con umbrales.
 *
 * El arco es CONTEXTO; el dato es el número impreso. Se dibuja con un hueco inferior declarado
 * (barrido < 360°) para que un valor bajo no se lea como un círculo casi completo.
 */
export const gaugeGeometry = (
  value: number,
  options: {
    readonly min?: number
    readonly max?: number
    readonly sweepDeg?: number
    readonly bands?: readonly { readonly upTo: number; readonly name: string }[]
  } = {}
): GaugeGeometry => {
  const min = options.min ?? 0
  const max = options.max ?? 100
  const sweepDeg = options.sweepDeg ?? 270

  if (max <= min) {
    throw new ChartGeometryError('invalid_range', `el rango del medidor es inválido (min=${min}, max=${max})`)
  }

  if (sweepDeg >= 360) {
    throw new ChartGeometryError(
      'full_circle_gauge',
      `el barrido es ${sweepDeg}°: un medidor cerrado hace que un valor bajo se lea como casi completo`
    )
  }

  if (value < min || value > max) {
    throw new ChartGeometryError(
      'value_out_of_range',
      `el valor ${value} cae fuera del rango declarado [${min}, ${max}]; un medidor no recorta su dato`
    )
  }

  const progress = (value - min) / (max - min)
  const band = options.bands?.find(b => value <= b.upTo)?.name ?? null

  return {
    value,
    progressPct: Math.round(progress * 1000) / 10,
    sweptDeg: Math.round(progress * sweepDeg * 10) / 10,
    band
  }
}

export interface HeatmapCell {
  readonly rowId: string
  readonly columnId: string
  readonly value: number | null
}

export interface HeatmapCellGeometry extends HeatmapCell {
  /**
   * 0–100 de INTENSIDAD, que la plantilla traduce a luminancia.
   *
   * Nunca a tono: el informe se revisa impreso en gris, y un heatmap que codifica por color se
   * vuelve ilegible ahí. Además la celda imprime su valor — el color acompaña, no informa solo.
   */
  readonly intensityPct: number | null
}

export const heatmapGeometry = (cells: readonly HeatmapCell[]): HeatmapCellGeometry[] => {
  const measurable = cells.filter((c): c is HeatmapCell & { value: number } => c.value !== null)

  if (measurable.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna celda del heatmap tiene valor')
  }

  const values = measurable.map(c => c.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  return cells.map(cell => ({
    ...cell,
    // Una celda sin dato NO es intensidad cero: se dibuja como hueco declarado.
    intensityPct: cell.value === null ? null : span === 0 ? 100 : Math.round(((cell.value - min) / span) * 1000) / 10
  }))
}

export interface WaffleCellGeometry {
  readonly index: number
  readonly seriesId: string | null
}

export const WAFFLE_CELLS = 100

/**
 * Waffle: cien celdas repartidas por participación.
 *
 * Es la salida honesta cuando hay más partes de las que una torta soporta: codifica por CONTEO,
 * que el ojo lee exacto, en vez de por ángulo. El reparto usa restos mayores para que las celdas
 * sumen exactamente cien sin que ninguna parte medible desaparezca.
 */
export const waffleGeometry = (
  parts: readonly { readonly seriesId: string; readonly value: number }[]
): WaffleCellGeometry[] => {
  const measurable = parts.filter(p => p.value > 0)

  if (measurable.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna parte del waffle tiene valor positivo')
  }

  const total = measurable.reduce((sum, p) => sum + p.value, 0)
  const exact = measurable.map(p => ({ seriesId: p.seriesId, exact: (p.value / total) * WAFFLE_CELLS }))
  const floors = exact.map(e => ({ ...e, cells: Math.floor(e.exact), remainder: e.exact - Math.floor(e.exact) }))
  let remaining = WAFFLE_CELLS - floors.reduce((sum, f) => sum + f.cells, 0)

  // Restos mayores primero; empate resuelto por orden de entrada para que el reparto sea determinista.
  const order = [...floors].sort((a, b) => b.remainder - a.remainder)

  for (const entry of order) {
    if (remaining <= 0) break
    entry.cells += 1
    remaining -= 1
  }

  const cells: WaffleCellGeometry[] = []

  for (const entry of floors) {
    for (let i = 0; i < entry.cells; i += 1) {
      cells.push({ index: cells.length, seriesId: entry.seriesId })
    }
  }

  while (cells.length < WAFFLE_CELLS) {
    cells.push({ index: cells.length, seriesId: null })
  }

  return cells
}

export interface VennTwoGeometry {
  readonly radiusA: number
  readonly radiusB: number
  /** Distancia entre centros que produce EXACTAMENTE el área de intersección pedida. */
  readonly centerDistance: number
  readonly onlyA: number
  readonly onlyB: number
  readonly both: number
}

/**
 * Venn de DOS conjuntos, con áreas proporcionales reales.
 *
 * Con dos círculos la solución exacta existe y se encuentra numéricamente: hay una única distancia
 * entre centros cuya lente vale el área pedida. Por eso este Venn es cuantitativo y el de tres no:
 * con tres conjuntos, las áreas proporcionales exactas en general NO existen — es una limitación
 * matemática, no de implementación. Un Venn de tres que aparente proporcionalidad miente, así que
 * ese caso se resuelve con `upsetGeometry`.
 */
export const vennTwoGeometry = (onlyA: number, onlyB: number, both: number): VennTwoGeometry => {
  if (onlyA < 0 || onlyB < 0 || both < 0) {
    throw new ChartGeometryError('negative_set', 'un conjunto no puede tener cardinalidad negativa')
  }

  const totalA = onlyA + both
  const totalB = onlyB + both

  if (totalA === 0 || totalB === 0) {
    throw new ChartGeometryError('empty_set', 'un Venn con un conjunto vacío no es un Venn: es un círculo')
  }

  const radiusA = Math.sqrt(totalA / Math.PI)
  const radiusB = Math.sqrt(totalB / Math.PI)

  if (both === 0) {
    // Disjuntos: se tocan sin solaparse.
    return { radiusA, radiusB, centerDistance: radiusA + radiusB, onlyA, onlyB, both }
  }

  const rMin = Math.min(radiusA, radiusB)

  if (both >= Math.PI * rMin * rMin) {
    // Contención total: el menor cae dentro del mayor.
    return { radiusA, radiusB, centerDistance: Math.abs(radiusA - radiusB), onlyA, onlyB, both }
  }

  // Área de la lente para una distancia d, resuelta por bisección: es monótona decreciente en d.
  const lensArea = (d: number): number => {
    if (d >= radiusA + radiusB) return 0
    if (d <= Math.abs(radiusA - radiusB)) return Math.PI * rMin * rMin

    const a = radiusA * radiusA
    const b = radiusB * radiusB

    return (
      a * Math.acos((d * d + a - b) / (2 * d * radiusA)) +
      b * Math.acos((d * d + b - a) / (2 * d * radiusB)) -
      0.5 * Math.sqrt((-d + radiusA + radiusB) * (d + radiusA - radiusB) * (d - radiusA + radiusB) * (d + radiusA + radiusB))
    )
  }

  let low = Math.abs(radiusA - radiusB)
  let high = radiusA + radiusB

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2

    if (lensArea(mid) > both) low = mid
    else high = mid
  }

  // 6 decimales, no 4: la distancia alimenta un ÁREA, y redondearla de más degrada la
  // proporcionalidad que es justamente la promesa de este Venn (lo detectó su propio test).
  return { radiusA, radiusB, centerDistance: Math.round(((low + high) / 2) * 1e6) / 1e6, onlyA, onlyB, both }
}

export interface UpsetIntersection {
  /** Conjuntos que participan de esta intersección. */
  readonly setIds: readonly string[]
  readonly size: number
}

export interface UpsetGeometry {
  readonly setIds: readonly string[]
  readonly intersections: readonly (UpsetIntersection & { readonly lengthPct: number })[]
}

/**
 * UpSet: intersecciones de N conjuntos como barras ordenadas más una matriz de pertenencia.
 *
 * Es la respuesta correcta cuando los conjuntos pasan de dos. Codifica por LONGITUD —lo que el ojo
 * estima con precisión— en vez de por área, y escala sin volverse ilegible. Orden descendente por
 * tamaño, con el id como desempate para que el dibujo sea determinista.
 */
export const upsetGeometry = (
  setIds: readonly string[],
  intersections: readonly UpsetIntersection[]
): UpsetGeometry => {
  if (setIds.length < 2) {
    throw new ChartGeometryError('too_few_sets', `un UpSet necesita al menos 2 conjuntos; llegaron ${setIds.length}`)
  }

  const unknown = intersections.flatMap(i => i.setIds).find(id => !setIds.includes(id))

  if (unknown) {
    throw new ChartGeometryError('unknown_set', `la intersección referencia un conjunto no declarado: "${unknown}"`)
  }

  const measurable = intersections.filter(i => i.size > 0)

  if (measurable.length === 0) {
    throw new ChartGeometryError('no_measurable_values', 'ninguna intersección tiene elementos')
  }

  const max = Math.max(...measurable.map(i => i.size))

  const sorted = [...measurable].sort(
    (a, b) => b.size - a.size || a.setIds.join('|').localeCompare(b.setIds.join('|'))
  )

  return {
    setIds,
    intersections: sorted.map(i => ({ ...i, lengthPct: Math.round((i.size / max) * 1000) / 10 }))
  }
}
