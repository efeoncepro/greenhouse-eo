/**
 * Browser renderer of the blog chart block (`efeoncepro/chart`, efeonce-editorial-blocks).
 *
 * Built with `pnpm renderer:editorial-chart:build` into the plugin as `src/chart/engine.js`, downloaded by the loader
 * (`view.js`) when a chart nears the viewport. It enhances the server-rendered figure: render.php already printed the
 * title, an accessible table with every number and the source, so the page reads complete without JavaScript. This
 * script paints the chart with ECharts (SVG renderer, tree-shaken) and animates it once; `prefers-reduced-motion`
 * paints it still.
 *
 * Colors and fonts come from CSS custom properties of the figure (`--eo-ch-*`, set by style.css per tone and scheme),
 * so dark mode, the paper/navy tone and the accent of the post's line stay owned by CSS, never hardcoded here.
 * One highlighted entity carries the accent; the rest is recessive context (tints of the context grey, told apart by
 * direct labels and a 2 px surface gap). Where a chart has a decisive point — the last point of a line, the tip of
 * the measure's arc — it is the sphere of La órbita, the only one in the piece. Text always wears ink, never a series
 * color.
 */

import * as echarts from 'echarts/core'
import { BarChart, GaugeChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

import { formatEditorialValue, parseEditorialChart, shareOf, type EditorialChart } from './contract'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
  MarkLineComponent,
  GraphicComponent,
  SVGRenderer
])

type Palette = {
  ink: string
  muted: string
  accent: string
  context: string
  grid: string
  surface: string
  font: string
  display: string
}

type Ctx = { data: EditorialChart; p: Palette; animate: boolean; width: number; height: number }
type Option = echarts.EChartsCoreOption

const SELECTOR = 'figure.eo-chart[data-eo-chart]'

/** Kinds whose layout depends on the plot size: repaint on resize instead of just scaling. */
const SIZE_DEPENDENT = new Set(['per-hundred', 'venn', 'pie', 'measure', 'matrix', 'before-after'])

const mounted = new WeakMap<HTMLElement, { chart: echarts.ECharts; data: EditorialChart }>()

const readPalette = (figure: HTMLElement): Palette => {
  // The figure may live in the block editor's iframe: read its styles from its own window.
  const css = (figure.ownerDocument.defaultView ?? window).getComputedStyle(figure)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback

  return {
    ink: v('--eo-ch-ink', '#023c70'),
    muted: v('--eo-ch-muted', 'rgba(2, 60, 112, 0.72)'),
    accent: v('--eo-ch-accent', '#0375db'),
    context: v('--eo-ch-context', '#7f98b2'),
    grid: v('--eo-ch-grid', 'rgba(2, 60, 112, 0.12)'),
    surface: v('--eo-ch-surface', '#f7f8f6'),
    font: v('--eo-ch-font', '"DM Sans", sans-serif'),
    display: v('--eo-ch-display', '"Bricolage Grotesque", sans-serif')
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const withAlpha = (color: string, alpha: number) => {
  const hex = color.match(/^#([0-9a-f]{6})$/i)

  if (!hex) return color

  const n = parseInt(hex[1], 16)

  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Tints of the context grey for parts that are not the highlight (order-stable, never a new hue). */
const contextTint = (p: Palette, i: number) => withAlpha(p.context, [1, 0.72, 0.52, 0.38, 0.28, 0.2, 0.15][i % 7])

const fmtOf = (data: EditorialChart) => (value: number | null) => formatEditorialValue(value, data.format, data.unit)

const tooltip = (p: Palette, fmt: (v: number | null) => string, trigger: 'axis' | 'item' = 'axis') => ({
  trigger,
  backgroundColor: p.surface,
  borderColor: p.grid,
  textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 },
  axisPointer: { type: trigger === 'axis' ? 'line' : 'none', lineStyle: { color: p.grid, width: 1 } },
  valueFormatter: (value: unknown) => fmt(typeof value === 'number' ? value : null)
})

const legend = (data: EditorialChart, p: Palette) =>
  data.series.length > 1
    ? {
        top: 0,
        left: 0,
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 4,
        itemGap: 18,
        textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 }
      }
    : undefined

const base = ({ p, animate }: Ctx, duration = 1200): Option => ({
  animation: animate,
  animationDuration: duration,
  animationEasing: 'cubicOut',
  textStyle: { fontFamily: p.font, color: p.muted }
})

const axisLabel = (p: Palette, extra: Record<string, unknown> = {}) => ({ color: p.muted, fontSize: 12, ...extra })

// ------------------------------------------------------------------------------------------------------------ line

const lineOption = (ctx: Ctx): Option => {
  const { data, p, animate } = ctx
  const emphasis = data.emphasis ?? 0
  const last = data.categories.length - 1
  const highlight = data.highlight === undefined ? last : data.highlight
  const fmt = fmtOf(data)
  const multi = data.series.length > 1

  return {
    ...base(ctx, 1400),
    legend: legend(data, p),
    grid: { left: 4, right: multi ? 76 : 24, top: multi ? 52 : 32, bottom: 8, containLabel: true },
    tooltip: tooltip(p, fmt),
    xAxis: {
      type: 'category',
      data: data.categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: axisLabel(p, { hideOverlap: true })
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,

      // Ticks stay short (no unit, compact numbers) so a phone keeps room for the plot; the unit lives in the
      // highlighted value and the tooltip.
      axisLabel: axisLabel(p, {
        formatter: (value: number) => formatEditorialValue(value, data.format === 'number' ? 'compact' : data.format)
      }),
      splitLine: { lineStyle: { color: p.grid } }
    },
    series: data.series.map((s, i) => {
      const isEmphasis = i === emphasis
      const color = isEmphasis ? p.accent : p.context
      const point = highlight !== null && isEmphasis ? s.values[highlight] : null

      return {
        type: 'line',
        name: s.name,
        data: s.values,
        smooth: 0.3,
        showSymbol: false,
        symbolSize: 8,
        z: isEmphasis ? 3 : 2,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        emphasis: { focus: 'series' },
        areaStyle: isEmphasis
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: withAlpha(p.accent, 0.22) },
                { offset: 1, color: withAlpha(p.accent, 0) }
              ])
            }
          : undefined,
        endLabel: multi ? { show: true, formatter: s.name, color: p.ink, fontSize: 12, distance: 8 } : undefined,
        markPoint:
          point !== null && point !== undefined
            ? {
                symbol: 'circle',
                symbolSize: 14,
                animationDelay: animate ? 1300 : 0,
                itemStyle: sphereStyle(p),
                label: { show: true, position: 'top', distance: 12, formatter: fmt(point), color: p.ink, fontSize: 15, fontWeight: 700 },
                data: [{ coord: [highlight as number, point] }]
              }
            : undefined
      }
    })
  }
}

const sphereStyle = (p: Palette) => ({
  color: p.accent,
  borderColor: p.surface,
  borderWidth: 3,
  shadowBlur: 14,
  shadowColor: withAlpha(p.accent, 0.55)
})

// ---------------------------------------------------------------------------------------------- column (vertical)

const columnOption = (ctx: Ctx): Option => {
  const { data, p, animate } = ctx
  const emphasis = data.emphasis ?? 0
  const highlight = data.highlight ?? null
  const fmt = fmtOf(data)
  const single = data.series.length === 1
  const showValues = (single || data.stacked) && data.categories.length <= 12

  return {
    ...base(ctx, 900),
    animationDelay: (idx: number) => (animate ? idx * 70 : 0),
    legend: legend(data, p),
    grid: { left: 4, right: 8, top: single ? 28 : 52, bottom: 8, containLabel: true },
    tooltip: tooltip(p, fmt),
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: axisLabel(p, { color: p.ink, hideOverlap: true, interval: 0, overflow: 'truncate' })
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLabel: axisLabel(p, {
        formatter: (value: number) => formatEditorialValue(value, data.format === 'number' ? 'compact' : data.format)
      }),
      splitLine: { lineStyle: { color: p.grid } }
    },
    series: data.series.map((s, i) => {
      const isEmphasis = i === emphasis
      const top = !data.stacked || i === data.series.length - 1

      // Series-level color too, so the legend shows the series' own color (items may override it).
      const seriesColor = single || isEmphasis ? p.accent : contextTint(p, i)

      return {
        type: 'bar',
        name: s.name,
        color: seriesColor,
        stack: data.stacked ? 'total' : undefined,
        barMaxWidth: 56,
        barGap: '12%',
        data: s.values.map((v, j) => ({
          value: v,
          itemStyle: {
            color: single
              ? highlight === null || j === highlight
                ? p.accent
                : p.context
              : isEmphasis
                ? p.accent
                : contextTint(p, i),
            borderColor: p.surface,
            borderWidth: data.stacked ? 1 : 0,
            borderRadius: top ? [4, 4, 0, 0] : 0
          }
        })),
        label: showValues && (single || i === data.series.length - 1)
          ? {
              show: true,
              position: 'top',
              distance: 6,
              color: p.ink,
              fontSize: 13,
              fontWeight: 600,
              formatter: (params: { dataIndex: number; value: unknown }) => {
                if (!data.stacked) return fmt(typeof params.value === 'number' ? params.value : null)

                return fmt(data.series.reduce((sum, ss) => sum + (ss.values[params.dataIndex] ?? 0), 0))
              }
            }
          : undefined
      }
    })
  }
}

// ---------------------------------------------------------------------------------------- bar (horizontal ranking)

const barOption = (ctx: Ctx): Option => {
  const { data, p, animate } = ctx
  const s = data.series[0]
  const fmt = fmtOf(data)
  const highlight = data.highlight ?? null

  // Ranking reads top-down: ECharts draws the first category at the bottom of a category y-axis, so reverse.
  const order = data.categories.map((_, i) => i).reverse()

  return {
    ...base(ctx, 900),
    animationDelay: (idx: number) => (animate ? (order.length - 1 - idx) * 90 : 0),
    grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
    tooltip: tooltip(p, fmt, 'item'),
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: order.map(i => data.categories[i]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: axisLabel(p, { color: p.ink, fontSize: 13, margin: 12 })
    },
    series: [
      {
        type: 'bar',
        name: s.name,
        barWidth: '58%',
        data: order.map(i => ({
          value: s.values[i],
          itemStyle: { color: highlight === null || i === highlight ? p.accent : p.context, borderRadius: [0, 4, 4, 0] }
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: (params: { value: unknown }) => fmt(typeof params.value === 'number' ? params.value : null),
          color: p.ink,
          fontSize: 13,
          fontWeight: 600
        }
      }
    ]
  }
}

// ------------------------------------------------------------------------------------------------- pie (donut)

const pieOption = (ctx: Ctx): Option => {
  const { data, p, width, height } = ctx
  const values = data.series[0].values
  const shares = shareOf(values)
  const largest = values.reduce<number>((best, v, i) => ((v ?? 0) > (values[best] ?? 0) ? i : best), 0)
  const highlight = data.highlight ?? largest
  const pct = (n: number) => formatEditorialValue(Math.round(n * 10) / 10, 'percent')

  // A phone has no room for labels around the ring: they move to a legend under it, with their share.
  const narrow = width < 520
  const cy = narrow ? height * 0.36 : height / 2
  let tint = 0

  return {
    ...base(ctx, 1100),
    tooltip: {
      ...tooltip(p, fmtOf(data), 'item'),
      formatter: (params: { dataIndex: number; name: string }) =>
        `${params.name}: ${fmtOf(data)(values[params.dataIndex])} (${pct(shares[params.dataIndex])})`
    },
    legend: narrow
      ? {
          bottom: 0,
          left: 'center',
          orient: 'vertical',
          icon: 'circle',
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8,
          textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 },
          formatter: (name: string) => `${name}  ${pct(shares[data.categories.indexOf(name)])}`
        }
      : undefined,

    // The center carries the highlighted part: its share, big, and its name.
    graphic: [
      {
        type: 'text',
        x: width / 2,
        y: cy - (narrow ? 22 : 26),
        style: { text: pct(shares[highlight]), fill: p.ink, font: `700 ${narrow ? 26 : 34}px ${p.display}`, align: 'center' }
      },
      {
        type: 'text',
        x: width / 2,
        y: cy + (narrow ? 10 : 14),
        style: {
          text: data.categories[highlight],
          fill: p.muted,
          font: `500 13px ${p.font}`,
          align: 'center',
          width: narrow ? 110 : 150,
          overflow: 'truncate'
        }
      }
    ],
    series: [
      {
        type: 'pie',
        radius: narrow ? [Math.min(width, height * 0.66) * 0.27, Math.min(width, height * 0.66) * 0.42] : ['52%', '78%'],
        center: [width / 2, cy],
        startAngle: 90,
        animationType: 'expansion',
        avoidLabelOverlap: true,
        padAngle: 1,
        itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 4 },
        label: {
          show: !narrow,
          color: p.ink,
          fontSize: 12,
          lineHeight: 16,
          formatter: (params: { dataIndex: number; name: string }) => `${params.name}\n{v|${pct(shares[params.dataIndex])}}`,
          rich: { v: { fontWeight: 700, fontSize: 13, color: p.ink } }
        },
        labelLine: { show: !narrow, length: 14, length2: 12, lineStyle: { color: p.grid } },
        data: data.categories.map((name, i) => ({
          name,
          value: values[i],
          itemStyle: { color: i === highlight ? p.accent : contextTint(p, tint++) }
        }))
      }
    ]
  }
}

// --------------------------------------------------------------------------------- funnel (centered stage bars)

const funnelOption = (ctx: Ctx): Option => {
  const { data, p, animate } = ctx
  const values = data.series[0].values as number[]
  const fmt = fmtOf(data)
  const highlight = data.highlight ?? values.length - 1
  const order = data.categories.map((_, i) => i).reverse()

  // Stage widths: proportional while the stages stay within 10×; beyond that (12 000 visits → 38 clients) the last
  // stages would vanish, so widths go logarithmic, from 100 % down to a 28 % floor. The numbers carry the magnitude.
  const top = Math.max(...values, 1)
  const bottom = Math.max(Math.min(...values.filter(v => v > 0)), 1)
  const logScale = top / bottom > 10

  // On a phone the floor rises so every stage keeps its value inside the bar.
  const floor = ctx.width < 520 ? 46 : 28

  const widthOf = (v: number) =>
    logScale ? floor + (100 - floor) * (Math.log(Math.max(v, 1) / bottom) / Math.log(top / bottom)) : (v / top) * 100

  const max = 100
  const inside = (i: number) => widthOf(values[i]) >= 42

  const rate = (i: number) =>
    i === 0 || !values[i - 1] ? '' : ` · ${formatEditorialValue(Math.round((values[i] / values[i - 1]) * 1000) / 10, 'percent')}`

  return {
    ...base(ctx, 900),
    animationDelay: (idx: number) => (animate ? (order.length - 1 - idx) * 110 : 0),
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(p, fmt, 'item'),
      formatter: (params: { seriesIndex: number; dataIndex: number }) => {
        const i = order[params.dataIndex]

        return `${data.categories[i]}: ${fmt(values[i])}${rate(i)}`
      }
    },
    xAxis: { type: 'value', show: false, max, min: 0 },
    yAxis: {
      type: 'category',
      data: order.map(i => data.categories[i]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: axisLabel(p, { color: p.ink, fontSize: 13, margin: 12 })
    },
    series: [
      {
        // Invisible offset that centers each stage.
        type: 'bar',
        stack: 'funnel',
        silent: true,
        itemStyle: { color: 'transparent' },
        data: order.map(i => (max - widthOf(values[i])) / 2),
        tooltip: { show: false }
      },
      {
        type: 'bar',
        stack: 'funnel',
        name: data.series[0].name,
        barWidth: '62%',
        data: order.map(i => ({
          value: widthOf(values[i]),
          itemStyle: { color: i === highlight ? p.accent : contextTint(p, Math.min(i, 3)), borderRadius: 4 },

          // The value sits inside a wide stage (white on the fill) and beside a narrow one (ink on the panel).
          label: inside(i) ? { position: 'inside', color: '#ffffff' } : { position: 'right', color: p.ink, distance: 8 }
        })),
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 700,
          formatter: (params: { dataIndex: number }) => {
            const i = order[params.dataIndex]

            return `${fmt(values[i])}${rate(i)}`
          }
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------- before-after (columns / dumbbell)

const beforeAfterOption = (ctx: Ctx): Option => {
  const { data, p, animate } = ctx
  const [before, after] = data.series
  const fmt = fmtOf(data)

  if (data.categories.length === 1) {
    const b = before.values[0] as number
    const a = after.values[0] as number
    const delta = b === 0 ? null : ((a - b) / Math.abs(b)) * 100
    const deltaText = delta === null ? '' : `${delta > 0 ? '+' : ''}${formatEditorialValue(Math.round(delta), 'percent')}`

    return {
      ...base(ctx, 1000),
      animationDelay: (idx: number) => (animate ? idx * 260 : 0),
      grid: { left: 4, right: 4, top: 48, bottom: 8, containLabel: true },
      tooltip: tooltip(p, fmt, 'item'),
      graphic: deltaText
        ? [{ type: 'text', right: 4, top: 4, style: { text: deltaText, fill: p.ink, font: `700 22px ${p.display}`, align: 'right' } }]
        : undefined,
      xAxis: {
        type: 'category',
        data: [before.name, after.name],
        axisLine: { lineStyle: { color: p.grid } },
        axisTick: { show: false },
        axisLabel: axisLabel(p, { color: p.ink, fontSize: 14, fontWeight: 600 })
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'bar',
          name: data.categories[0],
          barWidth: '46%',
          data: [
            { value: b, itemStyle: { color: p.context, borderRadius: [6, 6, 0, 0] } },
            { value: a, itemStyle: { color: p.accent, borderRadius: [6, 6, 0, 0] } }
          ],
          label: { show: true, position: 'top', distance: 8, color: p.ink, fontSize: 16, fontWeight: 700, formatter: (x: { value: unknown }) => fmt(x.value as number) }
        }
      ]
    }
  }

  // Several categories: a dumbbell per row — the connector, the «before» dot in context, the «after» dot in accent.
  const highlight = data.highlight ?? null
  const order = data.categories.map((_, i) => i).reverse()
  const lo = order.map(i => Math.min(before.values[i] as number, after.values[i] as number))
  const span = order.map(i => Math.abs((after.values[i] as number) - (before.values[i] as number)))
  const min = Math.min(0, ...lo)

  return {
    ...base(ctx, 1000),
    legend: { ...legend(data, p), data: [before.name, after.name] },
    grid: { left: 8, right: 56, top: 44, bottom: 8, containLabel: true },
    tooltip: { ...tooltip(p, fmt, 'axis'), axisPointer: { type: 'shadow', shadowStyle: { color: withAlpha(p.context, 0.08) } } },
    xAxis: {
      type: 'value',
      min,
      splitNumber: ctx.width < 520 ? 2 : 4,
      axisLabel: axisLabel(p, { formatter: (value: number) => formatEditorialValue(value, data.format === 'number' ? 'compact' : data.format) }),
      splitLine: { lineStyle: { color: p.grid } }
    },
    yAxis: {
      type: 'category',
      data: order.map(i => data.categories[i]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: axisLabel(p, { color: p.ink, fontSize: 13, margin: 12 })
    },
    series: [
      { type: 'bar', stack: 'db', silent: true, itemStyle: { color: 'transparent' }, data: lo.map(v => v - min), tooltip: { show: false } },
      {
        type: 'bar',
        stack: 'db',
        silent: true,
        barWidth: 3,
        data: order.map((i, k) => ({ value: span[k], itemStyle: { color: i === highlight ? withAlpha(p.accent, 0.55) : withAlpha(p.context, 0.4) } })),
        tooltip: { show: false }
      },
      {
        type: 'scatter',
        name: before.name,
        color: p.context,
        symbolSize: 12,
        itemStyle: { color: p.context, borderColor: p.surface, borderWidth: 2 },
        data: order.map(i => before.values[i]),
        z: 3
      },
      {
        // Color follows the series: «after» is always the accent; the highlighted row gets the bigger dot.
        type: 'scatter',
        name: after.name,
        color: p.accent,
        z: 4,
        data: order.map(i => ({
          value: after.values[i],
          symbolSize: i === highlight ? 18 : 13,
          itemStyle: i === highlight ? sphereStyle(p) : { color: p.accent, borderColor: p.surface, borderWidth: 2 }
        })),
        label: { show: true, position: 'right', distance: 8, color: p.ink, fontSize: 13, fontWeight: 700, formatter: (x: { value: unknown }) => fmt(x.value as number) }
      }
    ]
  }
}

// ------------------------------------------------------------------------------------ measure (La órbita's ring)

const measureOption = (ctx: Ctx): Option => {
  const { data, p, width, height } = ctx
  const value = data.series[0].values[0] as number
  const size = Math.min(width, height)
  const ring = Math.max(6, Math.round(size * 0.028))
  const sphere = ring * 2.4

  // The gauge draws its ring between radius − ring and radius; the pointer icon spans [offset − length, offset] along
  // its axis. Put the sphere's center on the middle of the ring's stroke.
  const radius = (size / 2) * 0.82
  const sphereOffset = -(radius - ring / 2) + sphere / 2

  return {
    ...base(ctx, 1600),
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        min: 0,
        max: 100,
        radius: '82%',
        center: ['50%', '50%'],
        progress: { show: true, width: ring, roundCap: true, itemStyle: { color: p.accent } },
        axisLine: { lineStyle: { width: ring, color: [[1, p.grid]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },

        // The pointer is the sphere: a circle pushed out to the ring, so it rides the tip of the arc as it grows.
        pointer: {
          show: true,
          icon: 'circle',
          width: sphere,
          length: sphere,
          offsetCenter: [0, sphereOffset],
          itemStyle: sphereStyle(p)
        },
        anchor: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '28%'],
          color: p.muted,
          fontFamily: p.font,
          fontSize: Math.max(12, Math.round(size * 0.045)),
          width: size * 0.6,
          overflow: 'break'
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-4%'],
          color: p.ink,
          fontFamily: p.display,
          fontWeight: 700,
          fontSize: Math.max(28, Math.round(size * 0.16)),
          formatter: (v: number) => formatEditorialValue(Math.round(v * 10) / 10, data.format === 'number' ? 'percent' : data.format)
        },
        data: [{ value, name: data.categories[0] }]
      }
    ]
  }
}

// ------------------------------------------------------------------------------------- per-hundred (100 dots)

const perHundredOption = (ctx: Ctx): Option => {
  const { data, p, animate, width, height } = ctx
  const value = Math.round(data.series[0].values[0] as number)
  const narrow = width < 520
  const side = narrow ? Math.min(width, height * 0.72) : Math.min(height, width * 0.5)
  const cell = side / 10
  const left = narrow ? (width - side) / 2 : 0
  const dots = Array.from({ length: 100 }, (_, i) => [i % 10, 9 - Math.floor(i / 10)])

  return {
    ...base(ctx, 500),
    grid: { left, top: 0, width: side, height: side },
    xAxis: { type: 'value', min: -0.5, max: 9.5, show: false },
    yAxis: { type: 'value', min: -0.5, max: 9.5, show: false },
    // The number and its sentence: beside the dots on desktop, centered under them on a phone (x is the anchor of
    // `align`, so centering uses x = width / 2 instead of `left: 'center'`).
    graphic: [
      {
        type: 'text',
        x: narrow ? width / 2 : side + Math.max(24, width * 0.06),
        y: narrow ? side + 12 : height * 0.3,
        style: { text: `${value}`, fill: p.ink, font: `700 ${narrow ? 40 : 64}px ${p.display}`, align: narrow ? 'center' : 'left' }
      },
      {
        type: 'text',
        x: narrow ? width / 2 : side + Math.max(24, width * 0.06),
        y: narrow ? side + 62 : height * 0.3 + 76,
        style: {
          text: `de cada 100 ${data.categories[0]}`,
          fill: p.muted,
          font: `500 ${narrow ? 14 : 16}px ${p.font}`,
          lineHeight: 22,
          align: narrow ? 'center' : 'left',
          width: narrow ? width - 32 : width - side - 48,
          overflow: 'break'
        }
      }
    ],
    series: [
      {
        type: 'scatter',
        silent: true,
        symbol: 'circle',
        symbolSize: cell * 0.62,
        animationDelay: (idx: number) => (animate ? idx * 9 : 0),
        data: dots.map((coord, i) => ({ value: coord, itemStyle: { color: i < value ? p.accent : withAlpha(p.context, 0.28) } }))
      }
    ]
  }
}

// ----------------------------------------------------------------------------------------------- matrix (2 × 2)

/**
 * Place each point's label where it does not collide with an earlier one: its natural side (toward the center), then
 * the other side, above, below. ECharts' own overlap handling misses labels on the same row, so the boxes are estimated
 * here in plot pixels (≈ 7 px per character at 12 px).
 */
const placeMatrixLabels = (labels: string[], xs: number[], ys: number[], plotW: number, plotH: number) => {
  const ux = plotW / 10
  const uy = plotH / 10
  const boxes: Array<[number, number, number, number]> = []

  const boxFor = (i: number, pos: string): [number, number, number, number] => {
    const w = labels[i].length * 6.2 + 8
    const h = 16
    const cx = xs[i] * ux
    const cy = (10 - ys[i]) * uy

    if (pos === 'right') return [cx + 10, cy - h / 2, cx + 10 + w, cy + h / 2]
    if (pos === 'left') return [cx - 10 - w, cy - h / 2, cx - 10, cy + h / 2]
    if (pos === 'top') return [cx - w / 2, cy - 12 - h, cx + w / 2, cy - 12]

    return [cx - w / 2, cy + 12, cx + w / 2, cy + 12 + h]
  }

  // Overlap with earlier labels plus whatever runs past the plot's sides, in px²; 0 means the place is free.
  const cost = (b: [number, number, number, number]) =>
    boxes.reduce((sum, o) => sum + Math.max(0, Math.min(b[2], o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[3], o[3]) - Math.max(b[1], o[1])), 0) +
    (Math.max(0, -b[0]) + Math.max(0, b[2] - plotW)) * (b[3] - b[1])

  let crowded = false

  const positions = labels.map((_, i) => {
    const natural = xs[i] > 5 ? ['left', 'right'] : ['right', 'left']
    const candidates = [...natural, 'top', 'bottom']
    const free = candidates.find(candidate => cost(boxFor(i, candidate)) === 0)

    // The first free place in order of preference; if none is free, the least crowded one, and the plot is crowded.
    const pos =
      free ?? candidates.reduce((best, candidate) => (cost(boxFor(i, candidate)) < cost(boxFor(i, best)) ? candidate : best))

    if (!free) crowded = true
    boxes.push(boxFor(i, pos))

    return pos
  })

  return { positions, crowded }
}

const matrixOption = (ctx: Ctx): Option => {
  const { data, p, animate, width, height } = ctx
  const [xs, ys] = data.series
  const highlight = data.highlight ?? null

  // A phone reserves a strip under the plot for the numbered list (style.css adds that height).
  const narrow = width < 520
  const listHeight = narrow ? data.categories.length * 20 + 8 : 0
  const plotH = height - 52 - listHeight

  // Highlight first, so its label keeps its natural place.
  const order = data.categories.map((_, i) => i).sort((a, b) => (a === highlight ? -1 : b === highlight ? 1 : 0))

  const placed = placeMatrixLabels(
    order.map(i => data.categories[i]),
    order.map(i => xs.values[i] as number),
    order.map(i => ys.values[i] as number),
    width - 44,
    plotH
  )

  const positions: string[] = []

  order.forEach((i, k) => {
    positions[i] = placed.positions[k]
  })

  // Crowded phone plot: every point carries its number and the names go in a list under the axis.
  const numbered = narrow && placed.crowded

  return {
    ...base(ctx, 900),
    // Axis names sit outside the plot (no tick labels: the quadrants are the scale), so the grid leaves room for them.
    // The strip is used only when numbered; otherwise the plot takes the whole height.
    grid: { left: 32, right: 12, top: 12, bottom: 40 + (numbered ? listHeight : 0), containLabel: false },
    graphic: numbered
      ? data.categories.map((label, i) => ({
          type: 'text',
          x: 32,
          y: height - listHeight + 4 + i * 20,
          style: { text: `${i + 1}  ${label}`, fill: p.ink, font: `${i === highlight ? 700 : 500} 13px ${p.font}` }
        }))
      : undefined,
    tooltip: {
      ...tooltip(p, v => formatEditorialValue(v), 'item'),
      formatter: (params: { dataIndex: number }) =>
        `${data.categories[params.dataIndex]}<br>${xs.name}: ${xs.values[params.dataIndex]} · ${ys.name}: ${ys.values[params.dataIndex]}`
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 10,
      interval: 5,
      name: `${xs.name} →`,
      nameLocation: 'middle',
      nameGap: 16,
      nameTextStyle: { color: p.ink, fontSize: 13, fontWeight: 600 },
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: p.grid, width: 1 } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10,
      interval: 5,
      name: `${ys.name} →`,
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 14,
      nameTextStyle: { color: p.ink, fontSize: 13, fontWeight: 600 },
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: p.grid, width: 1 } }
    },
    series: [
      {
        type: 'scatter',
        animationDelay: (idx: number) => (animate ? idx * 80 : 0),
        data: data.categories.map((label, i) => ({
          name: label,
          value: [xs.values[i], ys.values[i]],
          symbolSize: numbered ? 20 : i === highlight ? 18 : 13,
          itemStyle: i === highlight ? sphereStyle(p) : { color: p.context, borderColor: p.surface, borderWidth: 2 },
          label: numbered
            ? { position: 'inside', color: '#ffffff', fontSize: 11, fontWeight: 700, formatter: `${i + 1}` }
            : { position: positions[i] }
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: p.ink,
          fontSize: 12,
          fontWeight: 600,
          formatter: (x: { name: string }) => x.name
        },
        labelLayout: { hideOverlap: false }
      }
    ]
  }
}

// --------------------------------------------------------------------------------------------- venn (3 circles)

const vennOption = (ctx: Ctx): Option => {
  const { data, p, animate, width, height } = ctx
  // On a phone the circles take more of the width so their labels keep whole words.
  const r = Math.min(width * (width < 520 ? 0.27 : 0.2), height * 0.3)
  const cx = width / 2
  const cy = height / 2 + r * 0.12
  const d = r * 0.62

  const centers = [
    [cx - d, cy - d * 0.55],
    [cx + d, cy - d * 0.55],
    [cx, cy + d * 0.62]
  ]

  const labelPos = [
    [centers[0][0] - r * 0.35, centers[0][1] - r * 0.25, 'center'],
    [centers[1][0] + r * 0.35, centers[1][1] - r * 0.25, 'center'],
    [centers[2][0], centers[2][1] + r * 0.45, 'center']
  ] as const

  return {
    ...base(ctx, 900),
    graphic: [
      ...centers.map((c, i) => ({
        type: 'circle',
        shape: { cx: c[0], cy: c[1], r },
        style: { fill: withAlpha(p.context, 0.16), stroke: p.context, lineWidth: 1.5 },
        enterFrom: animate ? { shape: { r: 0 }, style: { opacity: 0 } } : undefined,
        enterAnimation: { duration: 700, delay: i * 160, easing: 'cubicOut' }
      })),
      ...data.categories.map((label, i) => ({
        type: 'text',
        x: labelPos[i][0],
        y: labelPos[i][1],
        style: {
          text: label,
          fill: p.ink,
          font: `600 ${width < 520 ? 13 : 15}px ${p.font}`,
          align: labelPos[i][2],
          verticalAlign: 'middle',
          width: r * 1.4,
          overflow: 'break',
          lineOverflow: 'none'
        },
        enterFrom: animate ? { style: { opacity: 0 } } : undefined,
        enterAnimation: { duration: 500, delay: 500 + i * 120 }
      })),
      {
        type: 'circle',
        shape: { cx, cy: cy - d * 0.16, r: Math.max(6, r * 0.06) },
        style: { fill: p.accent, stroke: p.surface, lineWidth: 3, shadowBlur: 14, shadowColor: withAlpha(p.accent, 0.55) },
        enterFrom: animate ? { shape: { r: 0 } } : undefined,
        enterAnimation: { duration: 500, delay: 900 }
      },
      ...(data.centerLabel
        ? [
            {
              type: 'text',
              x: cx,
              y: cy - d * 0.16 + Math.max(16, r * 0.16),
              style: {
                text: data.centerLabel,
                fill: p.ink,
                font: `700 ${width < 520 ? 12 : 14}px ${p.font}`,
                align: 'center',
                verticalAlign: 'top',
                width: r * 0.9,
                overflow: 'break'
              },
              enterFrom: animate ? { style: { opacity: 0 } } : undefined,
              enterAnimation: { duration: 500, delay: 1000 }
            }
          ]
        : [])
    ]
  }
}

const BUILDERS: Record<EditorialChart['kind'], (ctx: Ctx) => Option> = {
  line: lineOption,
  column: columnOption,
  bar: barOption,
  pie: pieOption,
  funnel: funnelOption,
  'before-after': beforeAfterOption,
  measure: measureOption,
  'per-hundred': perHundredOption,
  matrix: matrixOption,
  venn: vennOption
}

const optionFor = (figure: HTMLElement, plot: HTMLElement, data: EditorialChart, animate: boolean) =>
  BUILDERS[data.kind]({ data, p: readPalette(figure), animate, width: plot.clientWidth, height: plot.clientHeight })

const paint = (figure: HTMLElement, data: EditorialChart) => {
  const plot = figure.querySelector<HTMLElement>('.eo-chart__plot')

  // The DOM state is the guard shared across realms: the editor can load this engine in two windows.
  if (!plot || figure.dataset.eoChartState === 'ready') return

  const chart = echarts.init(plot, null, { renderer: 'svg' })

  chart.setOption(optionFor(figure, plot, data, !reducedMotion()))
  mounted.set(figure, { chart, data })
  figure.dataset.eoChartState = 'ready'

  let lastWidth = plot.clientWidth

  new ResizeObserver(() => {
    chart.resize()

    if (SIZE_DEPENDENT.has(data.kind) && Math.abs(plot.clientWidth - lastWidth) > 4) {
      lastWidth = plot.clientWidth
      chart.setOption(optionFor(figure, plot, data, false), { notMerge: true })
    }
  }).observe(plot)
}

/** The page, plus the block editor's canvas iframe (same origin) where the server render of the block lands. */
const EDITOR_CANVAS = 'iframe[name="editor-canvas"]'

const editorDocuments = (): Document[] => {
  const docs: Document[] = []

  document.querySelectorAll<HTMLIFrameElement>(EDITOR_CANVAS).forEach(frame => {
    try {
      if (frame.contentDocument) docs.push(frame.contentDocument)
    } catch {
      // cross-origin frame: not ours
    }
  })

  return docs
}

/** Repaint without animation when the scheme or tone changes (colors live in CSS). */
const repaintAll = () => {
  ;[document, ...editorDocuments()].flatMap(doc => [...doc.querySelectorAll<HTMLElement>(SELECTOR)]).forEach(figure => {
    const entry = mounted.get(figure)
    const plot = figure.querySelector<HTMLElement>('.eo-chart__plot')

    if (entry && plot) entry.chart.setOption(optionFor(figure, plot, entry.data, false), { notMerge: true })
  })
}

const visibility =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return

            const figure = entry.target as HTMLElement

            visibility?.unobserve(figure)
            prepare(figure, true)
          })
        },
        { threshold: 0.35 }
      )
    : null

function prepare(figure: HTMLElement, now = false) {
  if (mounted.has(figure) || figure.dataset.eoChartState === 'error' || figure.dataset.eoChartState === 'ready') return

  // In the editor the author is looking at the block: paint at once, no viewport wait.
  if (figure.ownerDocument !== document) now = true

  let data: EditorialChart

  try {
    const json = figure.querySelector('script[type="application/json"]')?.textContent ?? ''

    data = parseEditorialChart(JSON.parse(json))
  } catch {
    // Fail-closed: the server-rendered table stays as the visible content.
    figure.dataset.eoChartState = 'error'

    return
  }

  if (now || !visibility) paint(figure, data)
  else visibility.observe(figure)
}

const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>(SELECTOR).forEach(figure => prepare(figure))

const watched = new WeakSet<Document>()

/** Mount the figures of a document and keep watching it: the block editor inserts the server render after load. */
const watchDocument = (doc: Document) => {
  if (watched.has(doc) || !doc.body) return

  watched.add(doc)
  scan(doc)

  // `nodeType` instead of `instanceof HTMLElement`: nodes of the editor iframe belong to another realm.
  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return

        const element = node as HTMLElement

        if (element.matches(SELECTOR)) prepare(element)
        else scan(element)
      })
    }
  }).observe(doc.body, { childList: true, subtree: true })
}

const watchEditorCanvas = () => editorDocuments().forEach(watchDocument)

const start = () => {
  watchDocument(document)
  watchEditorCanvas()

  // The editor canvas iframe is created after this script runs and swaps its document when it loads (a blob URL),
  // so on editor pages re-check it every second; `watched` keeps each document to a single scan and observer.
  if (document.body.classList.contains('block-editor-page')) window.setInterval(watchEditorCanvas, 1000)

  new MutationObserver(repaintAll).observe(document.body, { attributes: true, attributeFilter: ['class'] })
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', repaintAll)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
