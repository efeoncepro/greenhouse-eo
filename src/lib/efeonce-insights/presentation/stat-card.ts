/**
 * TASK-1974 — lo que imprime cada cifra de una tarjeta, resuelto UNA vez para todos los consumidores (modelo web para
 * Think, mappers del PDF y del deck). Ningún consumer calcula la variación, el tono ni el período: los toma de acá
 * (lección de TASK-1957: dos humanizaciones divergen en silencio). Pura y browser-safe.
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { InsightChannelId } from '../contracts/channels'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { PlanStatDirection, PlanStatItemV1 } from '../contracts/plan'
import { changeToneOf, type ChangeDirection, type ChangeTone } from '../editorial/figure-selection'
import { formatDeltaForUnit, formatFactValue } from '../editorial/format'
import { windowLabelOf } from './vocabulary'
import { metricGlyphOf, type MetricGlyphKey } from './metric-glyphs'

/** Piezas de la cifra: la grande y su unidad pequeña («#» antes; «%»/«pp» pegado después; una palabra como unidad). */
export interface StatValueParts {
  prefix?: string
  value: string
  suffix?: string
  unitLabel?: string
}

/** «#6,9» → prefijo «#», cifra «6,9»; «1,8 %» → cifra «1,8», sufijo «%»; «12 pos.» → cifra «12», unidad «pos.». */
export const splitStatValue = (display: string): StatValueParts => {
  const match = /^(#?)([+\-−]?\d[\d.,]*)\s*(.*)$/.exec(display.trim())

  if (!match) return { value: display }

  const rest = match[3] ?? ''
  const tail = rest === '' ? {} : /^(%|‰|pp)$/.test(rest) ? { suffix: rest } : { unitLabel: rest }

  return { ...(match[1] ? { prefix: match[1] } : {}), value: match[2]!, ...tail }
}

/** Decimales impresos de una cifra es-CL («1,8» → 1; «13.606» → 0). */
const decimalsOf = (value: string): number => {
  const comma = value.indexOf(',')

  return comma === -1 ? 0 : value.length - comma - 1
}

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
  /** «Primer período medido» cuando hay valor pero no comparable: dice por qué no hay variación. */
  firstPeriod: string | null
  /** «Menor es mejor» sólo cuando subir es malo. */
  lowerIsBetter: string | null
  /** Piezas de la cifra para dibujarla grande con su unidad pequeña. */
  parts: StatValueParts
  /**
   * TASK-1975 — recorrido de la cifra en el informe Live (motion aprobado): del valor anterior al actual, con los decimales
   * que se imprimen. null sin comparable o sin dato (no hay recorrido que mostrar).
   */
  count: { from: number; to: number; decimals: number } | null
  /**
   * Isotipo de canal en la celda (contrato AXIS `efeonce.insights-stat-card` 0.2.0): sólo cuando el tablero mezcla
   * motores de respuesta. La celda se nombra por su canal (`label`) y la métrica va en `context`. null en otro caso.
   */
  channel: { platform: StatPlatform; name: string } | null
  /** La métrica bajo el nombre del canal («de las respuestas menciona la marca»). Sólo con `channel`. */
  context: string | null
  /**
   * TASK-1990/1996 — glifo Trazo de la métrica (`metric-glyphs.ts`). null con `channel` (isotipo o glifo, nunca los dos) o
   * cuando la métrica no tiene glifo.
   */
  metricIcon: MetricGlyphKey | null
}

/**
 * Plataforma de la que sale una cifra: la marca cuyo isotipo la identifica (`AXIS_PLATFORM_ASSETS` de
 * @efeoncepro/axis-brand-assets). La fuente manda sobre el canal: Search Console y GA4 miden Google pero tienen su
 * propio isotipo, e ICO lo mide Greenhouse. Es el vocabulario de canales (TASK-1990: los 19 ids de AXIS).
 */
export type StatPlatform = InsightChannelId

const AI_ANSWER_PLATFORMS: ReadonlySet<StatPlatform> = new Set(['chatgpt', 'gemini', 'claude', 'perplexity', 'google_ai_overview'])

/** Orden de los isotipos en el título: Search Console primero (es la fuente de verdad del tráfico orgánico). */
const TITLE_ORDER: readonly StatPlatform[] = ['google_search_console', 'google_analytics', 'google', 'greenhouse']

/** Máximo de isotipos en el título de un tablero; con más fuentes no se dibuja ninguno (el título ya las nombra). */
const TITLE_MAX = 3

export const statPlatformOf = (fact: Pick<EvidenceFactV1, 'source' | 'channelId'> & { metricId?: string }): StatPlatform | null => {
  if ((fact.source ?? '').startsWith('greenhouse_growth.seo_gsc')) return 'google_search_console'
  // GA4 por asistente: cada parte es su asistente; «Otros asistentes» no es GA4 ni un asistente con isotipo (sin plataforma).
  if ((fact.source ?? '').startsWith('ga4:')) return fact.channelId ?? ((fact.metricId ?? '').startsWith('ai_source.') ? null : 'google_analytics')
  if ((fact.source ?? '').startsWith('ico_engine')) return 'greenhouse'

  return fact.channelId ?? null
}

/** Cómo lleva isotipos un tablero de cifras (regla aprobada el 2026-10-03, una sola para PDF, deck y web). */
export interface StatBoardChannels {
  /** Isotipos una vez en el título: todas las cifras salen de estas plataformas (Search Console primero). */
  title: StatPlatform[]
  /** El tablero mezcla motores de respuesta: cada celda lleva el isotipo de su canal. */
  perCell: boolean
}

export const statBoardChannelsOf = (facts: ReadonlyArray<Pick<EvidenceFactV1, 'source' | 'channelId'> & { metricId?: string }>): StatBoardChannels => {
  const platforms = facts.map(statPlatformOf)
  const known = [...new Set(platforms.filter((platform): platform is StatPlatform => platform !== null))]

  if (platforms.length === 0 || known.length === 0) return { title: [], perCell: false }

  // Tablero de motores o asistentes distintos: isotipo en cada celda. Una celda sin plataforma conocida («Otros
  // asistentes») queda sólo con su nombre (contrato AXIS 0.2.0, `unknownPlatform: 'name-only'`).
  if (known.length > 1 && known.every(platform => AI_ANSWER_PLATFORMS.has(platform))) return { title: [], perCell: true }

  // Fuera de eso, una cifra sin plataforma apaga los isotipos: el título no afirma una fuente que no es.
  if (platforms.some(platform => platform === null)) return { title: [], perCell: false }

  const rank = (platform: StatPlatform) => (TITLE_ORDER.indexOf(platform) === -1 ? TITLE_ORDER.length : TITLE_ORDER.indexOf(platform))
  const title = known.sort((a, b) => rank(a) - rank(b))

  return { title: title.length <= TITLE_MAX ? title : [], perCell: false }
}

/** Nombre visible del canal en una celda con isotipo (el de AXIS: «AI Overview», no «Respuestas de Google»). */
const channelNameOf = (platform: StatPlatform): string => GH_INSIGHTS.stat.channelNames[platform] ?? GH_INSIGHTS.channels[platform] ?? platform

/** La métrica bajo el canal: la frase de su familia («de las respuestas menciona la marca») o su nombre corto. */
const channelContextOf = (fact: Pick<EvidenceFactV1, 'metricId'>, label: string): string => {
  const family = fact.metricId.split('.')[0] ?? fact.metricId

  return GH_INSIGHTS.stat.channelContext[fact.metricId] ?? GH_INSIGHTS.stat.channelContext[family] ?? label
}

const unsigned = (delta: string): string => delta.replace(/^[+\-−]\s*/, '')

export const statItemView = (item: PlanStatItemV1, byId: ReadonlyMap<string, EvidenceFactV1>, locale: string, board?: StatBoardChannels): StatItemView | null => {
  const fact = byId.get(item.factId)

  if (!fact) return null

  const previous = item.comparisonFactId ? byId.get(item.comparisonFactId) : undefined
  const comparable = previous && previous.value !== null && fact.value !== null ? previous : undefined
  const delta = comparable ? formatDeltaForUnit(fact.value!, comparable.value!, fact.unit, locale) : null
  const tone = comparable ? changeToneOf(fact.value!, comparable.value!, item.direction) : null

  const platform = board?.perCell ? statPlatformOf(fact) : null
  const channel = platform ? { platform, name: channelNameOf(platform) } : null

  return {
    itemId: item.itemId,
    label: channel ? channel.name : item.label,
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
    firstPeriod: fact.value !== null && !comparable ? GH_INSIGHTS.stat.firstPeriod : null,
    lowerIsBetter: item.direction === 'lower_is_better' ? GH_INSIGHTS.stat.lowerIsBetter : null,
    parts: splitStatValue(formatFactValue(fact.value, fact.unit, locale)),
    count: comparable ? { from: comparable.value!, to: fact.value!, decimals: decimalsOf(splitStatValue(formatFactValue(fact.value, fact.unit, locale)).value) } : null,
    channel,
    context: channel ? channelContextOf(fact, item.label) : null,
    metricIcon: channel ? null : metricGlyphOf(fact.metricId)
  }
}
