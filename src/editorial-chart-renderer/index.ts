/**
 * Browser renderer of the blog chart block (`efeoncepro/chart`, efeonce-editorial-blocks).
 *
 * Built with `pnpm renderer:editorial-chart:build` into the plugin as `src/chart/view.js` (the public-site runtime has no
 * build step). It enhances the server-rendered figure: render.php already printed the title, an accessible table with
 * every number and the source, so the page reads complete without JavaScript. This script paints the chart with
 * ECharts (SVG renderer, tree-shaken: line + bar only) when the figure enters the viewport, animating the line or the
 * bars once; `prefers-reduced-motion` paints it still.
 *
 * Colors and fonts come from CSS custom properties of the figure (`--eo-ch-*`, set by style.css per tone and scheme),
 * so dark mode, the paper/navy tone and the accent of the post's line stay owned by CSS, never hardcoded here.
 * One highlighted entity carries the accent; the rest is recessive context. The highlighted point of a line is the
 * sphere of La órbita — the only one in the piece.
 */

import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkPointComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

import { formatEditorialValue, parseEditorialChart, type EditorialChart } from './contract'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, MarkPointComponent, SVGRenderer])

type Palette = {
  ink: string
  muted: string
  accent: string
  context: string
  grid: string
  surface: string
  font: string
}

const SELECTOR = 'figure.eo-chart[data-eo-chart]'
const mounted = new WeakMap<HTMLElement, { chart: echarts.ECharts; data: EditorialChart; animated: boolean }>()

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
    font: v('--eo-ch-font', '"DM Sans", sans-serif')
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const withAlpha = (color: string, alpha: number) => {
  const hex = color.match(/^#([0-9a-f]{6})$/i)

  if (!hex) return color

  const n = parseInt(hex[1], 16)

  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const lineOption = (data: EditorialChart, p: Palette, animate: boolean): echarts.EChartsCoreOption => {
  const emphasis = data.emphasis ?? 0
  const last = data.categories.length - 1
  const highlight = data.highlight === undefined ? last : data.highlight
  const fmt = (value: number | null) => formatEditorialValue(value, data.format, data.unit)
  const directLabels = data.series.length > 1 && data.series.length <= 4

  return {
    animation: animate,
    animationDuration: 1400,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: p.font, color: p.muted },
    grid: { left: 4, right: directLabels ? 76 : 24, top: 32, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.surface,
      borderColor: p.grid,
      textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 },
      axisPointer: { type: 'line', lineStyle: { color: p.grid, width: 1 } },
      valueFormatter: (value: unknown) => fmt(typeof value === 'number' ? value : null)
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontSize: 12, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      // Ticks stay short (no unit, compact numbers) so a phone keeps room for the plot; the unit lives in the
      // highlighted value and the tooltip.
      axisLabel: {
        color: p.muted,
        fontSize: 12,
        formatter: (value: number) => formatEditorialValue(value, data.format === 'number' ? 'compact' : data.format)
      },
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
        connectNulls: false,
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
        endLabel: directLabels
          ? { show: true, formatter: s.name, color: p.ink, fontFamily: p.font, fontSize: 12, distance: 8 }
          : undefined,
        markPoint:
          point !== null && point !== undefined
            ? {
                symbol: 'circle',
                symbolSize: 14,
                animationDelay: animate ? 1300 : 0,
                itemStyle: { color: p.accent, borderColor: p.surface, borderWidth: 3, shadowBlur: 14, shadowColor: withAlpha(p.accent, 0.55) },
                label: {
                  show: true,
                  position: 'top',
                  distance: 12,
                  formatter: fmt(point),
                  color: p.ink,
                  fontFamily: p.font,
                  fontSize: 15,
                  fontWeight: 700
                },
                data: [{ coord: [highlight as number, point] }]
              }
            : undefined
      }
    })
  }
}

const barOption = (data: EditorialChart, p: Palette, animate: boolean): echarts.EChartsCoreOption => {
  const s = data.series[data.emphasis ?? 0]
  const fmt = (value: number | null) => formatEditorialValue(value, data.format, data.unit)
  const highlight = data.highlight ?? null

  // Ranking reads top-down: ECharts draws the first category at the bottom of a category y-axis, so reverse.
  const order = data.categories.map((_, i) => i).reverse()

  return {
    animation: animate,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (idx: number) => (order.length - 1 - idx) * 90,
    textStyle: { fontFamily: p.font, color: p.muted },
    grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'item',
      backgroundColor: p.surface,
      borderColor: p.grid,
      textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 },
      valueFormatter: (value: unknown) => fmt(typeof value === 'number' ? value : null)
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: order.map(i => data.categories[i]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.ink, fontSize: 13, margin: 12 }
    },
    series: [
      {
        type: 'bar',
        name: s.name,
        barWidth: '58%',
        barCategoryGap: '30%',
        data: order.map(i => ({
          value: s.values[i],
          itemStyle: {
            color: highlight === null || i === highlight ? p.accent : p.context,
            borderRadius: [0, 4, 4, 0]
          }
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: (params: { value: unknown }) => fmt(typeof params.value === 'number' ? params.value : null),
          color: p.ink,
          fontFamily: p.font,
          fontSize: 13,
          fontWeight: 600
        }
      }
    ]
  }
}

const optionFor = (data: EditorialChart, p: Palette, animate: boolean) =>
  data.kind === 'line' ? lineOption(data, p, animate) : barOption(data, p, animate)

const paint = (figure: HTMLElement, data: EditorialChart) => {
  const plot = figure.querySelector<HTMLElement>('.eo-chart__plot')

  // The DOM state is the guard shared across realms: the editor can load this engine in two windows.
  if (!plot || figure.dataset.eoChartState === 'ready') return

  const animate = !reducedMotion()
  const chart = echarts.init(plot, null, { renderer: 'svg' })

  chart.setOption(optionFor(data, readPalette(figure), animate))
  mounted.set(figure, { chart, data, animated: animate })
  figure.dataset.eoChartState = 'ready'

  new ResizeObserver(() => chart.resize()).observe(plot)
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

    if (entry) entry.chart.setOption(optionFor(entry.data, readPalette(figure), false), { notMerge: true })
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
