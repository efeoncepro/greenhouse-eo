import { buildBarFigureEffects } from './bar-figure'
import type { FieldEffect } from './resolver-contract'

const FAMILIES = ['bar', 'bar_grouped', 'bar_stacked', 'line', 'pie', 'donut', 'scatter'] as const

export const figureFamilyEffects = (family: string): FieldEffect[] | null => {
  if (!FAMILIES.includes(family as (typeof FAMILIES)[number])) return null

  return [{ selector: ':self', attr: 'data-chart-family', value: family }]
}

export const figurePathEffects = (path: string, family: unknown, index: 1 | 2 | 3): FieldEffect[] | null => {
  if (!path) return []

  // SVG path data is generated from finite numbers by figure-pages.ts. Keep the resolver fail-closed
  // so this attribute never becomes a raw-HTML or arbitrary-markup channel.
  const pathData = /^geometryPath[123]$/.test(path)
    ? `M 8 80 L ${36 + index * 7} 28 L 92 ${72 - index * 6}`
    : path

  if (!/^[MmLlAaZz0-9.,\s-]*$/.test(pathData)) return null
  if (typeof family !== 'string' || family.startsWith('bar')) return []

  const selector = family === 'line'
    ? `.mark-line.line-${index}`
    : family === 'scatter'
      ? '.mark-scatter'
      : family === 'pie'
        ? `.mark-pie.slice-${index}`
        : family === 'donut'
          ? `.mark-donut.slice-${index}`
          : null

  if (!selector) return null

  return [{ selector, attr: 'd', value: pathData }]
}

export const familyAwareBarEffects = (
  resolverName: string,
  figureRows: unknown,
  item: Record<string, unknown>
): FieldEffect[] | null => {
  const family = item.chartFamily

  if (family === undefined || (typeof family === 'string' && family.startsWith('bar'))) {
    return buildBarFigureEffects(resolverName, figureRows, item)
  }

  return []
}
