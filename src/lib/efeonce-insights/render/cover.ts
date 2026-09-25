/**
 * TASK-1889 — portada del informe y del deck desde el plan SELLADO. El catálogo sólo dibuja: el tema
 * (navy o blanco) y el logo los selló TASK-1888 en `plan.cover`; los canales salen de los gráficos
 * de la edición (`channelId`); las líneas «Qué mide este informe», de `plan.scopeLines`.
 *
 * Browser-safe: sólo tipos y la entrada liviana del composer.
 */

import type { SlotValues } from '@/lib/artifact-composer'
import { EXTERNAL_ASSET_PREFIX } from '@/lib/artifact-composer/pure'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import { INSIGHT_CHANNEL_IDS, type InsightChannelId } from '../contracts/channels'
import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'

/** Referencia sellada al logo de la organización: los bytes los entrega el worker al componer. */
export const orgLogoRef = (assetId: string): string => `${EXTERNAL_ASSET_PREFIX}org-logo:${assetId}`

const collect = (value: unknown, found: Set<string>): void => {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, found)

    return
  }

  if (!value || typeof value !== 'object') return

  for (const [key, item] of Object.entries(value)) {
    if (key === 'channelId' && typeof item === 'string') found.add(item)
    else if (key === 'dimensionChannelIds' && Array.isArray(item)) item.forEach(id => typeof id === 'string' && found.add(id))
    else collect(item, found)
  }
}

/**
 * Canales que miden los gráficos dados, en el orden canónico del registro de canales. `google_ai_overview`
 * comparte isotipo con Google: en una fila de logos se muestra una vez.
 */
export const channelsOf = (chapters: readonly PlanChapterV1[]): InsightChannelId[] => {
  const found = new Set<string>()

  for (const chapter of chapters) collect(chapter.charts, found)

  if (found.has('google_ai_overview')) {
    found.delete('google_ai_overview')
    found.add('google')
  }

  return INSIGHT_CHANNEL_IDS.filter(id => found.has(id))
}

export const channelNameOf = (id: InsightChannelId): string => GH_INSIGHTS.channels[id] ?? id

export interface CoverCommon {
  editionLabel: string
  eyebrow: string
  reportTitle: string
  confidentialityLine: string
}

/**
 * Portada navy o blanca según `plan.cover` (sin `cover`, plan v1: navy, la portada por defecto). En navy
 * sólo va el logo apto para fondo oscuro; en blanco, el logo por defecto (el validador de TASK-1888 ya
 * garantiza la pareja tema/variante).
 */
export const coverPage = (
  plan: EditorialPlanV1,
  common: CoverCommon,
  options: { contentTypes: { dark: string; light: string | null } }
): { contentType: string; slots: SlotValues } => {
  const cover = plan.cover
  const logo = cover?.logoAssetId ? orgLogoRef(cover.logoAssetId) : null
  const slots: SlotValues = { ...common }

  if (cover?.theme === 'light' && options.contentTypes.light) {
    const channels = channelsOf(plan.chapters)

    slots.scopeLabel = GH_INSIGHTS.catalog.scopeLabel
    slots.scopeLines = plan.scopeLines && plan.scopeLines.length > 0 ? plan.scopeLines : [GH_INSIGHTS.catalog.scopeFallback]

    if (channels.length > 0) slots.channels = channels.map(channelId => ({ channelId }))
    if (logo) slots.preparedFor = { label: GH_INSIGHTS.catalog.preparedFor, logo }

    return { contentType: options.contentTypes.light, slots }
  }

  // Navy: el logo por defecto sobre navy nunca se dibuja (sería el logo en positivo sobre oscuro).
  if (logo && cover?.logoVariant === 'on_dark') slots.preparedFor = { label: GH_INSIGHTS.catalog.preparedFor, logo }

  return { contentType: options.contentTypes.dark, slots }
}
