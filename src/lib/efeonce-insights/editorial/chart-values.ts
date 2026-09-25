/**
 * TASK-1888 — invariantes de VALOR de un `ChartSpecV1`, con los valores del snapshot. Delegan en la MISMA geometría
 * que dibuja el catálogo (`artifact-composer/chart-geometry.ts`, por su entrada pública `pure`): un embudo que crece,
 * un Venn con un conjunto vacío o una porción negativa se rechazan con la guarda exacta que los rechazaría al
 * dibujar. Idénticas por construcción, no una copia.
 *
 * Vive fuera de `contracts/` porque `artifact-composer/pure` arrastra `node:crypto` y los contratos los consume el
 * navegador. La validación estructural sigue en `contracts/chart-spec.ts`; `validateEditorialPlan` corre ambas.
 */

import {
  ChartGeometryError,
  bulletGeometry,
  funnelGeometry,
  gaugeGeometry,
  heatmapGeometry,
  sliceGeometry,
  upsetGeometry,
  vennTwoGeometry,
  waffleGeometry,
  waterfallGeometry
} from '@/lib/artifact-composer/pure'

import type { ChartSpecV1, ChartSpecViolation } from '../contracts/chart-spec'

/** Valor de un hecho por id; `undefined` = hecho desconocido (ya reportado como `unknown_fact`). */
export type ChartFactValues = ReadonlyMap<string, number | null>

const geometryRule = (error: unknown): string | null => (error instanceof ChartGeometryError ? error.reason : null)

/**
 * Invariantes de VALOR por familia, delegadas en la geometría que dibuja. Sólo corre con los valores del snapshot:
 * la validación estructural sola no puede saber si un embudo crece.
 */
const valueViolations = (spec: ChartSpecV1, values: ChartFactValues, push: (rule: string, detail: string) => void): void => {
  const value = (id: string | null | undefined): number | null => (id ? values.get(id) ?? null : null)

  const guard = (run: () => void) => {
    try {
      run()
    } catch (error) {
      const code = geometryRule(error)

      if (code === null) throw error
      push(`geometry_${code}`, (error as Error).message)
    }
  }

  if ((spec.family === 'pie' || spec.family === 'donut') && spec.series[0]) {
    const series = spec.series[0]

    guard(() => sliceGeometry(series.factIds.map((id, index) => ({ seriesId: id, label: spec.dimensionLabels[index] ?? id, value: value(id) }))))
  }

  if (spec.family === 'scatter' && spec.series.length === 2) {
    const [x, y] = spec.series

    x!.factIds.forEach((id, index) => {
      if ((value(id) === null) !== (value(y!.factIds[index]) === null)) {
        push('scatter_complete_pairs', `la observación ${index + 1} tiene una sola coordenada`)
      }
    })
  }

  const data = spec.data

  if (!data) return

  switch (data.kind) {
    case 'bullet':
      for (const item of data.items) {
        const current = value(item.valueFactId)
        const target = value(item.targetFactId)

        if (current === null || target === null) {
          push('bullet_measured', `el ítem ${item.itemId} necesita valor y meta medidos`)
          continue
        }

        guard(() => bulletGeometry(current, target))
      }

      break

    case 'gauge': {
      const current = value(data.valueFactId)
      const previous = value(data.previousFactId)

      if (current === null || previous === null) {
        push('gauge_previous_required', 'el medidor necesita el valor actual y el del período anterior medidos')
        break
      }

      guard(() => gaugeGeometry(current, { min: data.min, max: data.max }))
      guard(() => gaugeGeometry(previous, { min: data.min, max: data.max }))

      const target = value(data.targetFactId)

      if (target !== null) guard(() => gaugeGeometry(target, { min: data.min, max: data.max }))
      break
    }

    case 'waterfall': {
      const steps = data.steps.map(step => ({ stepId: step.stepId, label: step.label, delta: value(step.factId), isTotal: step.isTotal }))

      if (steps.some(step => step.delta === null)) {
        push('waterfall_measured', 'cada paso de la cascada necesita su aporte medido')
        break
      }

      guard(() => waterfallGeometry(steps.map(step => ({ ...step, delta: step.delta as number }))))
      break
    }

    case 'funnel': {
      const stages = data.stages.map(stage => ({ stageId: stage.stageId, label: stage.label, value: value(stage.factId) }))

      if (stages.some(stage => stage.value === null)) {
        push('funnel_measured', 'cada etapa del embudo necesita su valor medido')
        break
      }

      guard(() => funnelGeometry(stages.map(stage => ({ ...stage, value: stage.value as number }))))
      break
    }

    case 'heatmap':
      guard(() =>
        heatmapGeometry(data.cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => ({ rowId: String(rowIndex), columnId: String(columnIndex), value: value(cell) }))))
      )
      break

    case 'waffle': {
      const parts = data.parts.map(part => ({ seriesId: part.partId, value: value(part.factId) }))

      if (parts.some(part => part.value === null)) {
        push('waffle_measured', 'cada parte del waffle necesita su conteo medido')
        break
      }

      guard(() => waffleGeometry(parts.map(part => ({ ...part, value: part.value as number }))))

      const total = value(data.totalFactId)
      const sum = parts.reduce((acc, part) => acc + (part.value as number), 0)

      if (data.totalFactId && (total === null || Math.abs(total - sum) > 1e-9)) {
        push('waffle_parts_sum_total', `las partes suman ${sum} y el total declarado es ${total ?? 'sin dato'}`)
      }

      break
    }

    case 'venn_two': {
      const onlyA = value(data.onlyAFactId)
      const onlyB = value(data.onlyBFactId)
      const both = value(data.bothFactId)

      if (onlyA === null || onlyB === null || both === null) {
        push('venn_measured', 'el Venn necesita los tres tamaños medidos (sólo A, sólo B y ambos)')
        break
      }

      guard(() => vennTwoGeometry(onlyA, onlyB, both))
      break
    }

    case 'upset': {
      const sizes = data.intersections.map(intersection => value(intersection.factId))

      if (sizes.some(size => size === null)) {
        push('upset_measured', 'cada intersección del UpSet necesita su conteo medido')
        break
      }

      guard(() => upsetGeometry(data.sets.map(set => set.setId), data.intersections.map((intersection, index) => ({ setIds: intersection.setIds, size: sizes[index] as number }))))

      if (sizes.some((size, index) => index > 0 && (size as number) > (sizes[index - 1] as number))) {
        push('upset_sorted_desc', 'las intersecciones del UpSet se declaran de mayor a menor')
      }

      break
    }
  }
}

/** Violaciones de valor del spec. Correr sólo sobre un spec estructuralmente válido (`validateChartSpec` vacío). */
export const validateChartSpecValues = (spec: ChartSpecV1, values: ChartFactValues): ChartSpecViolation[] => {
  const violations: ChartSpecViolation[] = []

  valueViolations(spec, values, (rule, detail) => violations.push({ chartId: spec.chartId, rule, detail }))

  return violations
}
