/**
 * TASK-1845 — `ChartSpecV1` (browser-safe). Contrato de DATOS del gráfico: qué relación,
 * qué series, qué unidades y qué equivalente tabular. La librería visual y los catálogos
 * viven en TASK-1847; ningún componente visual nace aquí.
 *
 * Reglas (arquitectura §6): barras con origen cero; pie/donut sólo partes no superpuestas
 * de un mismo total; dispersión requiere observaciones pareadas; sin doble eje ni 3D.
 *
 * TASK-1888 — 15 familias. Las 7 originales («de series») describen sus datos con `series` +
 * `dimensionLabels`. Las 8 nuevas («de datos propios») los describen en `data`, un tipo discriminado
 * por familia; todo número sigue siendo un `factId` del snapshot. El cambio es ADITIVO: un spec v1
 * sellado (sin `data`, sin `channelId`) valida y compone igual que antes, y `specVersion` no cambia.
 *
 * Aquí vive la validación ESTRUCTURAL (browser-safe, sin imports del motor). Las invariantes de VALOR (embudo
 * que no crece, Venn con conjuntos no vacíos…) viven en `editorial/chart-values.ts`, que llama a la MISMA
 * geometría que dibuja (`artifact-composer/chart-geometry.ts`): idénticas por construcción. No están acá porque
 * la entrada pública del motor (`artifact-composer/pure`) arrastra el módulo crypto de Node, y este archivo lo consume el
 * navegador.
 */


import type { InsightChannelId } from './channels'

export const CHART_SPEC_VERSION = 'chart_spec_v1' as const

/**
 * Techo de partes de pie/donut. Espejo de `MAX_SLICES` de la geometría (un test los mantiene iguales): se declara
 * acá porque el contrato no puede importar el motor.
 */
export const MAX_COMPOSITION_PARTS = 3

/** Familias cuyos datos viajan en `series` + `dimensionLabels` (contrato original de TASK-1845). */
export const SERIES_CHART_FAMILIES = ['bar', 'bar_grouped', 'bar_stacked', 'line', 'pie', 'donut', 'scatter'] as const

/** Familias cuyos datos viajan en `data` (TASK-1888). `series` queda vacío. */
export const DATA_CHART_FAMILIES = ['bullet', 'waterfall', 'funnel', 'gauge', 'heatmap', 'waffle', 'venn_two', 'upset'] as const

export const CHART_FAMILIES = [...SERIES_CHART_FAMILIES, ...DATA_CHART_FAMILIES] as const
export type ChartFamily = (typeof CHART_FAMILIES)[number]
export type SeriesChartFamily = (typeof SERIES_CHART_FAMILIES)[number]
export type DataChartFamily = (typeof DATA_CHART_FAMILIES)[number]

export const isDataChartFamily = (family: ChartFamily): family is DataChartFamily =>
  (DATA_CHART_FAMILIES as readonly string[]).includes(family)

/**
 * `target`: resultado contra una meta (bullet, medidor). `decomposition`: qué explica un cambio (cascada).
 * `conversion`: paso entre etapas (embudo). `overlap`: coincidencia de conjuntos (Venn, UpSet).
 */
export const CHART_RELATIONS = ['comparison', 'trend', 'composition', 'distribution', 'correlation', 'target', 'decomposition', 'conversion', 'overlap'] as const
export type ChartRelation = (typeof CHART_RELATIONS)[number]

export interface ChartSeriesV1 {
  seriesId: string
  label: string
  /** Cada punto referencia un hecho del snapshot; ninguna cifra vive sólo en el gráfico. */
  factIds: string[]
  unit: string
  /** TASK-1888 — la serie representa un canal (p. ej. una línea por motor). */
  channelId?: InsightChannelId
}

export interface ChartScaleV1 {
  kind: 'linear'
  /** Barras: SIEMPRE 0. Líneas: 0 o null (auto) declarado, nunca implícito. */
  baseline: 0 | null
}

export interface ChartReferenceV1 {
  label: string
  factId: string | null
  value: number | null
}

export interface ChartTabularEquivalentV1 {
  columns: string[]
  /** Filas como referencias a factIds (una celda = un hecho o null). */
  rows: Array<Array<string | null>>
}

// ─── Datos por familia (TASK-1888) ────────────────────────────────────────────────────────────────

export interface ChartBulletItemV1 {
  itemId: string
  label: string
  valueFactId: string
  /** La meta es un HECHO (leído del registro dueño, p. ej. ICO), nunca un literal del planner. */
  targetFactId: string
  channelId?: InsightChannelId
}

export interface ChartBulletDataV1 {
  kind: 'bullet'
  /** RpA mejora al bajar; OTD y FTR al subir. La meta es la marca; la dirección decide si se alcanzó. */
  direction: 'higher_is_better' | 'lower_is_better'
  items: ChartBulletItemV1[]
}

export interface ChartGaugeDataV1 {
  kind: 'gauge'
  valueFactId: string
  /** Obligatorio: un medidor sin su período anterior no dice si la marca avanzó. */
  previousFactId: string
  targetFactId: string | null
  /** Escala de la métrica (p. ej. un puntaje 0–100); el barrido es 270° fijo en la geometría. */
  min: number
  max: number
}

export interface ChartWaterfallDataV1 {
  kind: 'waterfall'
  steps: Array<{ stepId: string; label: string; factId: string; isTotal: boolean }>
}

export interface ChartFunnelDataV1 {
  kind: 'funnel'
  /** Cada etapa es subconjunto de la anterior (la geometría lo exige). */
  stages: Array<{ stageId: string; label: string; factId: string }>
}

export interface ChartHeatmapDataV1 {
  kind: 'heatmap'
  rowLabels: string[]
  columnLabels: string[]
  /** `cells[row][column]` = factId o null (hueco declarado, nunca cero). La plantilla imprime el valor. */
  cells: Array<Array<string | null>>
}

export interface ChartWaffleDataV1 {
  kind: 'waffle'
  parts: Array<{ partId: string; label: string; factId: string; channelId?: InsightChannelId }>
  /** Total contable del que las partes son porciones no superpuestas; si viene, las partes deben sumarlo. */
  totalFactId: string | null
}

export interface ChartVennTwoDataV1 {
  kind: 'venn_two'
  setA: { label: string; channelId?: InsightChannelId }
  setB: { label: string; channelId?: InsightChannelId }
  onlyAFactId: string
  onlyBFactId: string
  bothFactId: string
}

export interface ChartUpsetDataV1 {
  kind: 'upset'
  sets: Array<{ setId: string; label: string; channelId?: InsightChannelId }>
  /** Ordenadas de mayor a menor por tamaño (invariante del contrato). */
  intersections: Array<{ intersectionId: string; setIds: string[]; factId: string }>
}

export type ChartFamilyDataV1 =
  | ChartBulletDataV1
  | ChartGaugeDataV1
  | ChartWaterfallDataV1
  | ChartFunnelDataV1
  | ChartHeatmapDataV1
  | ChartWaffleDataV1
  | ChartVennTwoDataV1
  | ChartUpsetDataV1

export interface ChartSpecV1 {
  specVersion: typeof CHART_SPEC_VERSION
  chartId: string
  family: ChartFamily
  relation: ChartRelation
  title: string
  /** Familias de series: ≥ 1. Familias de datos propios: vacío (los datos viven en `data`). */
  series: ChartSeriesV1[]
  dimensionLabels: string[]
  /** TASK-1888 — canal de cada dimensión, paralelo a `dimensionLabels` (null = la dimensión no es un canal). */
  dimensionChannelIds?: Array<InsightChannelId | null>
  unit: string
  scale: ChartScaleV1
  references: ChartReferenceV1[]
  /** Equivalente tabular obligatorio para TODA familia (accesibilidad y fallback del render). */
  tabularEquivalent: ChartTabularEquivalentV1
  /** TASK-1888 — obligatorio en familias de datos propios, con `data.kind === family`; ausente en las de series. */
  data?: ChartFamilyDataV1
}

const FAMILY_RELATIONS: Readonly<Record<ChartFamily, readonly ChartRelation[]>> = {
  bar: ['comparison', 'distribution'],
  bar_grouped: ['comparison'],
  bar_stacked: ['composition', 'comparison'],
  line: ['trend'],
  pie: ['composition'],
  donut: ['composition'],
  scatter: ['correlation'],
  bullet: ['target'],
  gauge: ['target'],
  waterfall: ['decomposition'],
  funnel: ['conversion'],
  heatmap: ['trend', 'distribution'],
  waffle: ['composition'],
  venn_two: ['overlap'],
  upset: ['overlap']
}

export interface ChartSpecViolation {
  chartId: string
  rule: string
  detail: string
}

/** Todo factId que el spec referencia, en cualquier familia (series, datos propios, referencias y tabla). */
export const chartSpecFactIds = (spec: ChartSpecV1): string[] => {
  const ids: string[] = spec.series.flatMap(series => series.factIds)
  const data = spec.data

  if (data) {
    switch (data.kind) {
      case 'bullet':
        data.items.forEach(item => ids.push(item.valueFactId, item.targetFactId))
        break
      case 'gauge':
        ids.push(data.valueFactId, data.previousFactId)
        if (data.targetFactId) ids.push(data.targetFactId)
        break
      case 'waterfall':
        data.steps.forEach(step => ids.push(step.factId))
        break
      case 'funnel':
        data.stages.forEach(stage => ids.push(stage.factId))
        break
      case 'heatmap':
        data.cells.forEach(row => row.forEach(cell => cell !== null && ids.push(cell)))
        break
      case 'waffle':
        data.parts.forEach(part => ids.push(part.factId))
        if (data.totalFactId) ids.push(data.totalFactId)
        break
      case 'venn_two':
        ids.push(data.onlyAFactId, data.onlyBFactId, data.bothFactId)
        break
      case 'upset':
        data.intersections.forEach(intersection => ids.push(intersection.factId))
        break
    }
  }

  for (const reference of spec.references) if (reference.factId) ids.push(reference.factId)

  return ids
}

/** Forma de los datos propios, sin valores: tamaños mínimos y grillas completas. */
const dataShapeViolations = (data: ChartFamilyDataV1, push: (rule: string, detail: string) => void): void => {
  switch (data.kind) {
    case 'bullet':
      if (data.items.length === 0) push('bullet_items_required', 'un bullet necesita al menos un ítem con valor y meta')
      break
    case 'gauge':
      if (!(data.max > data.min)) push('gauge_range', `el rango del medidor es inválido (min=${data.min}, max=${data.max})`)
      break
    case 'waterfall':
      if (data.steps.length < 2) push('waterfall_steps', 'una cascada necesita al menos dos pasos')
      if (data.steps.slice(1, -1).some(step => step.isTotal)) push('waterfall_total_position', 'un total sólo puede abrir o cerrar la cascada')
      break
    case 'funnel':
      if (data.stages.length < 2) push('funnel_stages', 'un embudo necesita al menos dos etapas')
      break
    case 'heatmap':
      if (data.rowLabels.length === 0 || data.columnLabels.length === 0) push('heatmap_grid', 'el heatmap necesita filas y columnas')

      if (data.cells.length !== data.rowLabels.length || data.cells.some(row => row.length !== data.columnLabels.length)) {
        push('heatmap_grid', 'la grilla de celdas no coincide con filas × columnas')
      }

      break
    case 'waffle':
      if (data.parts.length === 0) push('waffle_parts', 'un waffle necesita al menos una parte')
      break
    case 'venn_two':
      break

    case 'upset': {
      const setIds = new Set(data.sets.map(set => set.setId))

      if (data.sets.length < 2) push('upset_sets', 'un UpSet necesita al menos dos conjuntos')
      if (data.intersections.length === 0) push('upset_intersections', 'un UpSet necesita al menos una intersección')

      if (data.intersections.some(intersection => intersection.setIds.length === 0 || intersection.setIds.some(id => !setIds.has(id)))) {
        push('upset_unknown_set', 'una intersección referencia un conjunto no declarado')
      }

      break
    }
  }
}

/**
 * Validación ESTRUCTURAL del spec: familia↔relación, baseline de barras, pares en dispersión, porciones ≤ 3, datos
 * propios con su forma y factIds conocidos. Las invariantes de valor se agregan con `validateChartSpecValues`
 * (`editorial/chart-values.ts`); el validador del plan corre ambas.
 */
export const validateChartSpec = (spec: ChartSpecV1, knownFactIds: ReadonlySet<string>): ChartSpecViolation[] => {
  const violations: ChartSpecViolation[] = []
  const push = (rule: string, detail: string) => violations.push({ chartId: spec.chartId, rule, detail })

  if (!(CHART_FAMILIES as readonly string[]).includes(spec.family)) {
    push('unknown_family', `familia ${String(spec.family)} fuera del contrato`)

    return violations
  }

  if (!FAMILY_RELATIONS[spec.family].includes(spec.relation)) {
    push('family_relation', `${spec.family} no representa ${spec.relation}`)
  }

  if (spec.family.startsWith('bar') && spec.scale.baseline !== 0) {
    push('bar_zero_baseline', 'las barras nacen en cero')
  }

  if (isDataChartFamily(spec.family)) {
    if (!spec.data) push('family_data_required', `${spec.family} declara sus datos en \`data\``)
    else if (spec.data.kind !== spec.family) push('family_data_kind', `\`data.kind\` ${spec.data.kind} no coincide con la familia ${spec.family}`)
    else dataShapeViolations(spec.data, push)

    if (spec.series.length > 0) push('family_data_series', `${spec.family} no usa \`series\`: los datos viven en \`data\``)
  } else {
    if (spec.data) push('family_data_unexpected', `${spec.family} describe sus datos en \`series\`, no en \`data\``)
    if (spec.series.length === 0) push('series_required', 'sin series')

    if ((spec.family === 'pie' || spec.family === 'donut') && spec.series.length !== 1) {
      push('composition_single_total', 'pie/donut requiere UNA serie de partes de un mismo total')
    }

    if ((spec.family === 'pie' || spec.family === 'donut') && (spec.series[0]?.factIds.length ?? 0) > MAX_COMPOSITION_PARTS) {
      push('composition_max_slices', `pie/donut admite hasta ${MAX_COMPOSITION_PARTS} partes; con más, una barra`)
    }

    if (spec.family === 'scatter') {
      const lengths = new Set(spec.series.map(series => series.factIds.length))

      if (spec.series.length !== 2 || lengths.size !== 1) {
        push('scatter_paired_observations', 'dispersión requiere dos series con observaciones pareadas')
      }
    }
  }

  if (spec.dimensionChannelIds && spec.dimensionChannelIds.length !== spec.dimensionLabels.length) {
    push('dimension_channels_aligned', 'dimensionChannelIds debe alinear 1:1 con dimensionLabels')
  }

  if (spec.tabularEquivalent.columns.length === 0) push('tabular_equivalent_required', 'todo gráfico trae su equivalente tabular')

  for (const factId of chartSpecFactIds(spec)) {
    if (!knownFactIds.has(factId)) push('unknown_fact', `el gráfico referencia ${factId} fuera del snapshot`)
  }

  for (const row of spec.tabularEquivalent.rows) {
    for (const cell of row) {
      if (cell !== null && !knownFactIds.has(cell)) push('unknown_fact', `tabla referencia ${cell} fuera del snapshot`)
    }
  }

  return violations
}
