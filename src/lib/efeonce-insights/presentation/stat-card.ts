/**
 * TASK-1974 — lo que imprime cada cifra de una tarjeta, resuelto UNA vez para todos los consumidores (modelo web para
 * Think, mappers del PDF y del deck). Ningún consumer calcula la variación, el tono ni el período: los toma de acá
 * (lección de TASK-1957: dos humanizaciones divergen en silencio). Pura y browser-safe.
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { PlanStatDirection, PlanStatItemV1 } from '../contracts/plan'
import { changeToneOf, type ChangeDirection, type ChangeTone } from '../editorial/figure-selection'
import { formatDeltaForUnit, formatFactValue } from '../editorial/format'
import { windowLabelOf } from './vocabulary'

export interface StatItemView {
  itemId: string
  label: string
  factId: string
  /** Valor formateado del hecho («13.606», «1,8 %», «#6,9»); «—» sin dato. */
  display: string
  estimated: boolean
  direction: PlanStatDirection | null
  /** Variación contra el comparable: cifra SIN signo (el triángulo dice la dirección) y tono semántico. */
  change: { display: string; direction: ChangeDirection; tone: ChangeTone } | null
  /** «vs 16.390 en agosto de 2026»; null sin comparable con valor. */
  versus: string | null
  /** Las piezas de `versus` por separado (el PDF destaca la cifra) y el hecho comparable; null sin comparable. */
  comparison: { factId: string; display: string; period: string } | null
  /** «Sin dato en septiembre de 2026» cuando el hecho no tiene valor. */
  noData: string | null
  /** «Menor es mejor» sólo cuando subir es malo. */
  lowerIsBetter: string | null
}

const unsigned = (delta: string): string => delta.replace(/^[+\-−]\s*/, '')

export const statItemView = (item: PlanStatItemV1, byId: ReadonlyMap<string, EvidenceFactV1>, locale: string): StatItemView | null => {
  const fact = byId.get(item.factId)

  if (!fact) return null

  const previous = item.comparisonFactId ? byId.get(item.comparisonFactId) : undefined
  const comparable = previous && previous.value !== null && fact.value !== null ? previous : undefined
  const delta = comparable ? formatDeltaForUnit(fact.value!, comparable.value!, fact.unit, locale) : null
  const tone = comparable ? changeToneOf(fact.value!, comparable.value!, item.direction) : null

  return {
    itemId: item.itemId,
    label: item.label,
    factId: fact.factId,
    display: formatFactValue(fact.value, fact.unit, locale),
    estimated: item.estimated,
    direction: item.direction,
    // Una variación que no se imprime (0,0 %) es «sin cambio»: triángulo plano y tono neutro.
    change: comparable && tone ? { display: delta ? unsigned(delta) : '0', direction: delta ? tone.direction : 'flat', tone: delta ? tone.tone : 'neutral' } : null,
    versus: comparable ? GH_INSIGHTS.stat.versus(formatFactValue(comparable.value, comparable.unit, locale), windowLabelOf(comparable.window, locale)) : null,
    comparison: comparable
      ? { factId: comparable.factId, display: formatFactValue(comparable.value, comparable.unit, locale), period: windowLabelOf(comparable.window, locale) }
      : null,
    noData: fact.value === null ? GH_INSIGHTS.stat.noDataIn(windowLabelOf(fact.window, locale)) : null,
    lowerIsBetter: item.direction === 'lower_is_better' ? GH_INSIGHTS.stat.lowerIsBetter : null
  }
}
