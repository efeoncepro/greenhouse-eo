/**
 * Governed builder + checks for the dynamic `efeoncepro/chart` block («Gráfico Efeonce», efeonce-editorial-blocks).
 *
 * The spec declares `{ kind: 'chart', chart, title?, caption?, sourceLabel?, sourceUrl?, tone? }` and this module
 * serializes the self-closing block exactly as WordPress stores it. The chart is validated with the same contract the
 * browser renderer and the plugin use (`src/editorial-chart-renderer/contract.ts` ↔ `EO_Chart::validate`), so a spec
 * that would print nothing on the public page never reaches a draft.
 *
 * Contract: `docs/public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md` §Gráfico Efeonce.
 */

import { EditorialChartError, parseEditorialChart, type EditorialChart } from '../../../editorial-chart-renderer/contract'

import { serializeGutenbergBlockAttributes } from './gutenberg-blocks'

export const EDITORIAL_CHART_BLOCK_NAME = 'efeoncepro/chart'

export const EDITORIAL_CHART_ALLOWED_ATTRIBUTES = ['chart', 'title', 'caption', 'sourceLabel', 'sourceUrl', 'tone', 'anchor'] as const

export const EDITORIAL_CHART_TONES = ['light', 'dark'] as const
export type EditorialChartTone = (typeof EDITORIAL_CHART_TONES)[number]

export type EditorialChartBlockInput = {
  chart: EditorialChart
  /** The conclusion of the chart, not its topic: «Los clics se triplicaron en seis meses». */
  title?: string
  caption?: string
  sourceLabel?: string
  /** https URL of the source. */
  sourceUrl?: string
  /** `light` (paper, default) or `dark` (navy). */
  tone?: EditorialChartTone
}

export const isEditorialChartTone = (value: unknown): value is EditorialChartTone =>
  typeof value === 'string' && (EDITORIAL_CHART_TONES as readonly string[]).includes(value)

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Validate a chart attribute; returns the stable error code, or null when it renders. */
export const editorialChartErrorCode = (chart: unknown): string | null => {
  try {
    parseEditorialChart(chart)

    return null
  } catch (error) {
    return error instanceof EditorialChartError ? error.code : 'chart_invalid'
  }
}

const plain = (value: string | undefined, field: string, max: number) => {
  const text = (value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

  if (text.length > max) throw new Error(`content_factory_article_chart_${field}_too_long`)

  return text
}

/**
 * Render `<!-- wp:efeoncepro/chart {"chart":{…},"title":"…"} /-->`. Throws on an invalid chart, tone or source URL so a
 * malformed spec never reaches a draft.
 */
export const renderEditorialChartBlock = (input: EditorialChartBlockInput): string => {
  const code = editorialChartErrorCode(input.chart)

  if (code) throw new Error(`content_factory_article_${code}`)

  const attrs: Record<string, unknown> = { chart: parseEditorialChart(input.chart) }
  const title = plain(input.title, 'title', 140)
  const caption = plain(input.caption, 'caption', 280)
  const sourceLabel = plain(input.sourceLabel, 'source_label', 140)

  if (title) attrs.title = title
  if (caption) attrs.caption = caption
  if (sourceLabel) attrs.sourceLabel = sourceLabel

  if (input.sourceUrl !== undefined && input.sourceUrl !== '') {
    if (!isHttpsUrl(input.sourceUrl)) throw new Error(`content_factory_article_chart_source_url_invalid:${input.sourceUrl}`)

    attrs.sourceUrl = input.sourceUrl
  }

  if (input.tone !== undefined) {
    if (!isEditorialChartTone(input.tone)) throw new Error(`content_factory_article_chart_tone_invalid:${String(input.tone)}`)

    attrs.tone = input.tone
  }

  return `<!-- wp:${EDITORIAL_CHART_BLOCK_NAME} ${serializeGutenbergBlockAttributes(attrs)} /-->`
}
