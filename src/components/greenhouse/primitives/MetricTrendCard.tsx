'use client'

// React Imports
import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

// Core Imports
import OptionMenu from '@core/components/option-menu'
import type { OptionType } from '@core/components/option-menu/types'

// Charts (Recharts — sanctioned for KPI-card sparklines; React-event tooltip is
// hoverable + keyboard-reachable + verifiable, unlike ApexCharts' SVG hit-test)
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip } from '@/libs/Recharts'

// Greenhouse Imports
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion, AnimatePresence } from '@/libs/FramerMotion'

import { isCardDensityAtLeast, useContainerDensity, type CardDensityRequest } from './card-density'
import {
  cardDensityLayoutTransition,
  cardDensityRevealTransition,
  cardDensityRevealRisePx,
  cardDensityRevealStaggerSec,
  type CardEntrance
} from './card-density/card-density-motion'

// ── Types ─────────────────────────────────────────────────────────────

export type MetricTrendPoint = {
  /** Short axis label, e.g. "Abr". */
  label: string
  /** Metric value for the period; `null` when the period has no data. */
  value: number | null
}

type MetricFormat = 'percentage' | 'integer' | 'decimal'

/** Semantic accent — maps to the MUI palette (success / warning / error). */
export type MetricTrendTone = 'success' | 'warning' | 'error'

type ChartDatum = {
  /** Normalized x in [0,1]. Edge anchors sit at 0 and 1; real points are inset. */
  x: number
  value: number | null
  label?: string
  edge?: boolean
  isLastReal?: boolean
}

export type MetricTrendCardProps = {
  /** Metric code, rendered as the prominent card title (e.g. "OTD%"). */
  title: string
  /** Full metric name shown beside the title (e.g. "On-Time Delivery"). */
  metricName?: string
  /** Cadence + period label under the title (e.g. "Mensual · May 2026"). */
  periodLabel: string
  /** Hero value driving the big number; `null` renders an em dash. */
  value: number | null
  /** Ordered month-over-month series (oldest → newest). */
  series: MetricTrendPoint[]
  /** Semantic tone — drives the accent color of the line + area + marker. */
  tone?: MetricTrendTone | null
  /** How the hero value (and tooltip) is formatted. */
  format?: MetricFormat
  /** Suffix for the month-over-month delta chip, e.g. "pts". */
  deltaUnit?: string
  /** Optional 3-dot menu items. When omitted, the menu is not rendered. */
  menuOptions?: OptionType[]
  /** Tooltip for the 3-dot trigger. */
  menuTooltip?: string
  /** Optional `data-capture` hook for visual capture (GVC) targeting. */
  dataCapture?: string
  /**
   * TASK-1115 — adaptive density (opt-in). `undefined` = `full` (legacy, byte-identical). `'auto'` = the
   * card adapts to its OWN width (container query): `condensed` drops metricName + period label and shrinks
   * the chart; `peek` drops the chart and keeps title + value + delta. The hero value + delta never vanish
   * (honest condensation, never clips).
   */
  density?: CardDensityRequest
  /**
   * TASK-1110 — entrada "al armarse" (opt-in). `'none'` (default) = sin entrada, legacy byte-idéntico.
   * `'assemble'` = el dato se construye frente al usuario: el número cuenta 0 → valor y el chart se dibuja solo
   * al montar (para respuestas de Nexa moments que materializan en vivo). reduced-motion → valor final + chart
   * estático (never-hidden). Es un enhancement client-side.
   */
  entrance?: CardEntrance
}

// ── Helpers ───────────────────────────────────────────────────────────

const formatValue = (value: number, format: MetricFormat): string => {
  switch (format) {
    case 'integer':
      return String(Math.round(value))
    case 'decimal':
      return value.toFixed(1)
    case 'percentage':
    default:
      return `${value.toFixed(1)}%`
  }
}

const valueFormatter =
  (format: MetricFormat) =>
  (n: number): string =>
    formatValue(n, format)

/** Drop leading/trailing nulls so the line spans the real data (no floating start). */
const trimNulls = (series: MetricTrendPoint[]): MetricTrendPoint[] => {
  let start = 0
  let end = series.length - 1

  while (start <= end && series[start].value === null) start++
  while (end >= start && series[end].value === null) end--

  return start > end ? [] : series.slice(start, end + 1)
}

/**
 * Fraction of the plot the real points are inset from each edge. The flat
 * segment between an edge anchor and the first/last real point is what lets the
 * line/area reach the card border while the dots + month labels stay inset.
 */
const EDGE_INSET = 0.05

const realX = (index: number, count: number): number =>
  count <= 1 ? 0.5 : EDGE_INSET + (index * (1 - 2 * EDGE_INSET)) / (count - 1)

// ── Tooltip ───────────────────────────────────────────────────────────

type TrendTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number | null; payload?: ChartDatum }>
  title: string
  format: MetricFormat
  accent: string
}

/** Recharts custom tooltip: month + formatted value. Skips the edge anchors. */
const TrendTooltip = ({ active, payload, title, format, accent }: TrendTooltipProps) => {
  const point = payload?.[0]?.payload
  const v = payload?.[0]?.value

  if (!active || point?.edge || v === null || v === undefined) return null

  return (
    <Box
      role='status'
      sx={{
        px: 3,
        py: 2,
        minWidth: 96,
        bgcolor: 'background.paper',
        border: t => `1px solid ${t.palette.divider}`,
        borderRadius: t => `${t.shape.customBorderRadius.sm}px`,
        // Semantic elevation (TASK-1052): anchored chart tooltip → `floating`.
        boxShadow: t => t.greenhouseElevation.floating.boxShadow
      }}
    >
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
        {point?.label}
      </Typography>
      <Stack direction='row' alignItems='center' spacing={1.5}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {title}: {formatValue(v, format)}
        </Typography>
      </Stack>
    </Box>
  )
}

// ── Component ─────────────────────────────────────────────────────────

/**
 * MetricTrendCard — KPI card with an interactive month-over-month area chart.
 *
 * Canonical implementation of the Figma "OTD mensual" design (Design System |
 * Vuexy → AXIS, node 11853:17766). It is a FUNCTIONAL chart, not a decorative
 * sparkline: Recharts area with a hoverable + keyboard-reachable tooltip (month
 * + value), a vertical crosshair cursor, hover markers, an emphasised end
 * marker, and a point-aligned month axis.
 *
 * Layout: the line/area runs **edge to edge** (immersive) via invisible "edge
 * anchor" points at x=0 and x=1, while the real data points — their dots AND
 * their month labels — are inset and aligned, so the markers never sit on the
 * card tips and the labels never touch the borders.
 *
 * Contracts:
 * - Typography (TASK-566): Geist UI base, `kpiValue` variant + tabular-nums for
 *   the hero number; Poppins is display-only (h1–h4) and never applied here.
 * - Color is a real semaphore (zone-driven) and never the only signal — the
 *   value, the signed delta chip + arrow, the tooltip and an sr-only data table
 *   all carry it. The line uses the darker shade to clear WCAG 1.4.11 (3:1).
 * - a11y: `role='img'` + aria-label on the plot, plus a visually-hidden data
 *   `<table>` fallback (the canonical chart fallback for screen readers).
 *
 * Microinteractions (all reduced-motion aware):
 * - area draw-in on mount (Recharts, disabled under prefers-reduced-motion)
 * - hover tooltip + crosshair + active marker on the chart
 * - hover lift + accent border on the card (150ms ease-out)
 * - hero number count-up via AnimatedCounter
 */
const MetricTrendCard = ({
  title,
  metricName,
  periodLabel,
  value,
  series,
  tone = null,
  format = 'percentage',
  deltaUnit,
  menuOptions,
  menuTooltip,
  dataCapture,
  density: densityRequest,
  entrance = 'none'
}: MetricTrendCardProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const gradientId = useId().replace(/[:]/g, '')

  // TASK-1115 — adaptive density. `full` (default) = legacy byte-identical. condensed drops the secondary
  // context (metricName + period) and shrinks the chart; peek drops the chart (value + delta survive).
  const { ref: densityRef, density, containerType } = useContainerDensity(densityRequest)
  const isPeek = density === 'peek'
  const hideSecondary = isCardDensityAtLeast(density, 'condensed') // condensed + peek
  const chartHeight = hideSecondary ? 96 : 152
  // Card adaptable: el cambio de fit mode (resize + reflow del chart) se anima con framer `layout` →
  // morph fluido. Mantiene la semántica `article`. El path legacy (density undefined) NO usa motion.
  const adaptive = densityRequest !== undefined

  // `layout='position'` (no `size`): framer NO escala la caja → el texto NO se estira a-desproporción durante el
  // morph de ancho (distorsión clásica de `layout`). El ancho lo sigue el contenedor; layout coreografía posición.
  const cardMotionProps = adaptive
    ? {
        component: motion.article,
        layout: prefersReduced ? false : ('position' as const),
        transition: cardDensityLayoutTransition(prefersReduced)
      }
    : { component: 'article' as const }

  // SSR-safe: el reveal sólo activa su `initial` tras montar (sin hydration mismatch — patrón CompositionShell).
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => setHasMounted(true), [])

  // Reveal/unfold canónico (TASK-1115): el contenido que entra/sale entre densidades se DESPLIEGA desde altura
  // 0 (`height: 0↔auto` + opacity, `overflow: hidden`) en vez de popear, mientras la caja morfea con `layout`.
  // El desync caja(200ms)/contenido(300ms) da el efecto Transformer. Solo en el path adaptable; legacy idéntico.
  //
  // ⚠️ `animateHeight=false` (modo fade) es OBLIGATORIO para el chart: el `ResponsiveContainer` de Recharts mide
  // su contenedor con un ResizeObserver; animar `height: auto` sobre él crea un loop infinito de medición
  // (`Maximum update depth exceeded`). El chart se desvanece con opacity y su caja la morfea el `layout` del card.
  const reveal = (
    key: string,
    show: boolean,
    node: ReactNode,
    opts?: { wrapperStyle?: CSSProperties; animateHeight?: boolean; staggerIndex?: number }
  ): ReactNode => {
    if (!adaptive) return show ? node : null

    // Cascada: cada pieza arranca con un delay según su orden de lectura (staggerIndex). Reduced-motion → 0.
    const delay = prefersReduced ? 0 : (opts?.staggerIndex ?? 0) * cardDensityRevealStaggerSec

    const animateHeight = opts?.animateHeight ?? true

    const variants = animateHeight
      ? // Texto → UNFOLD: se despliega desde altura 0 (clipado por overflow:hidden).
        { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 } }
      : // Chart → RISE: sube desde +N px + opacity (trayectoria distinta del texto; transform de compositor).
        {
          initial: { opacity: 0, y: cardDensityRevealRisePx },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: cardDensityRevealRisePx }
        }

    return (
      <AnimatePresence key={`reveal-${key}`} initial={false} mode={animateHeight ? 'sync' : 'popLayout'}>
        {show ? (
          <motion.div
            key={key}
            initial={hasMounted ? variants.initial : false}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ ...cardDensityRevealTransition(prefersReduced), delay }}
            style={animateHeight ? { overflow: 'hidden', ...opts?.wrapperStyle } : opts?.wrapperStyle}
          >
            {node}
          </motion.div>
        ) : null}
      </AnimatePresence>
    )
  }

  const color: MetricTrendTone = tone ?? 'success'
  const fillColor = theme.palette[color].main

  // Stroke uses the darker shade so the line clears the WCAG 1.4.11 3:1 floor
  // against the card background (success.main lime is too light on white).
  const lineColor = theme.palette[color].dark
  const paper = 'var(--mui-palette-background-paper)'

  const trimmed = useMemo(() => trimNulls(series), [series])

  const realPoints = useMemo(
    () => trimmed.filter(p => p.value !== null) as Array<{ label: string; value: number }>,
    [trimmed]
  )

  const canPlot = realPoints.length >= 2

  // Chart data with edge anchors (flat extension to the card borders) so the
  // line is full-bleed while the real points stay inset + aligned with labels.
  const chartData = useMemo<ChartDatum[]>(() => {
    if (!trimmed.length) return []

    const count = trimmed.length
    const firstValue = trimmed[0].value
    const lastValue = trimmed[count - 1].value

    const points: ChartDatum[] = trimmed.map((p, i) => ({
      x: realX(i, count),
      value: p.value,
      label: p.label,
      isLastReal: i === count - 1
    }))

    return [{ x: 0, value: firstValue, edge: true }, ...points, { x: 1, value: lastValue, edge: true }]
  }, [trimmed])

  const tickXs = useMemo(() => trimmed.map((_, i) => realX(i, trimmed.length)), [trimmed])

  const tickFormatter = (x: number): string => {
    let bestLabel = ''
    let bestDist = Infinity

    trimmed.forEach((p, i) => {
      const dist = Math.abs(realX(i, trimmed.length) - x)

      if (dist < bestDist) {
        bestDist = dist
        bestLabel = p.label
      }
    })

    return bestLabel
  }

  // Explicit y-domain with headroom so the line uses the vertical space instead
  // of hugging the baseline (auto-scale on near-flat % series looks empty).
  const yDomain = useMemo<[number, number] | undefined>(() => {
    const values = realPoints.map(p => p.value)

    if (!values.length) return undefined

    const dataMin = Math.min(...values)
    const dataMax = Math.max(...values)
    const pad = Math.max((dataMax - dataMin) * 0.6, dataMax * 0.04, 1)

    return [Math.max(0, dataMin - pad), dataMax + pad]
  }, [realPoints])

  // Month-over-month delta (last two real points).
  const delta = useMemo(() => {
    if (realPoints.length < 2) return null
    const diff = realPoints[realPoints.length - 1].value - realPoints[realPoints.length - 2].value

    if (Math.abs(diff) < 0.05) return null

    return diff
  }, [realPoints])

  const ariaSummary = `${metricName ?? title}, ${periodLabel}: ${
    value !== null ? formatValue(value, format) : 'sin dato'
  }${delta !== null ? `, ${delta > 0 ? 'sube' : 'baja'} ${Math.abs(delta).toFixed(1)} ${deltaUnit ?? ''}`.trimEnd() : ''}`

  // Dots only on real points (never the edge anchors); the last (current) month
  // is emphasised.
  const renderDot = (props: { cx?: number; cy?: number; payload?: ChartDatum }) => {
    const { cx, cy, payload } = props

    if (cx == null || cy == null || payload?.edge || payload?.value == null) return <g key={`empty-${cx}-${cy}`} />

    return (
      <circle
        key={`dot-${payload.x}`}
        cx={cx}
        cy={cy}
        r={payload.isLastReal ? 5 : 3}
        fill={lineColor}
        stroke={paper}
        strokeWidth={2}
      />
    )
  }

  // Render function (not object) so the active marker keeps the zone colour and
  // skips the edge anchors.
  const renderActiveDot = (props: { cx?: number; cy?: number; payload?: ChartDatum }) =>
    props.cx == null || props.cy == null || props.payload?.edge ? (
      <g />
    ) : (
      <circle cx={props.cx} cy={props.cy} r={6} fill={lineColor} stroke={paper} strokeWidth={2} />
    )

  return (
    <Card
      ref={densityRef}
      {...cardMotionProps}
      aria-label={ariaSummary}
      data-capture={dataCapture}
      data-card-density={density}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        containerType,
        border: t => `1px solid ${t.palette.divider}`,
        borderRadius: t => `${t.shape.customBorderRadius.md}px`,
        overflow: 'hidden',
        transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shortest,
          easing: theme.transitions.easing.easeOut
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          // Semantic elevation (TASK-1051): hover lift on an interactive card → `raised`.
          boxShadow: theme.greenhouseElevation.raised.boxShadow,
          borderColor: alpha(lineColor, 0.5)
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' }
        }
      }}
    >
      {/* Title row */}
      <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2} sx={{ pt: 6, px: 6 }}>
        <Stack direction='row' alignItems='baseline' spacing={1.5} sx={{ minWidth: 0 }}>
          <Typography variant='h5'>{title}</Typography>
          {reveal(
            'metricName',
            Boolean(metricName) && !hideSecondary,
            <Typography variant='body2' color='text.secondary' noWrap sx={{ minWidth: 0 }}>
              {metricName}
            </Typography>
          )}
        </Stack>
        {menuOptions && menuOptions.length > 0 ? (
          <Box sx={{ mt: -1, mr: -1 }}>
            <OptionMenu
              icon='tabler-dots-vertical'
              iconClassName='text-textDisabled'
              tooltipProps={menuTooltip ? { title: menuTooltip } : undefined}
              options={menuOptions}
            />
          </Box>
        ) : null}
      </Stack>

      {/* Value block */}
      <Stack spacing={0.5} sx={{ px: 6, pt: 3, pb: 2 }}>
        {reveal(
          'period',
          !hideSecondary,
          <Typography variant='body2' color='text.secondary'>
            {periodLabel}
          </Typography>,
          { staggerIndex: 1 }
        )}
        <Stack direction='row' alignItems='baseline' spacing={2} flexWrap='wrap'>
          <Typography variant='kpiValue' color='text.primary' component='span'>
            {value !== null ? (
              <AnimatedCounter
                value={value}
                formatter={valueFormatter(format)}
                duration={0.9}
                animateFrom={entrance === 'assemble' ? 0 : undefined}
              />
            ) : (
              '—'
            )}
          </Typography>
          {delta !== null ? (
            <Stack
              direction='row'
              alignItems='center'
              spacing={0.5}
              sx={{ color: delta > 0 ? 'success.dark' : 'error.main' }}
            >
              <i
                className={delta > 0 ? 'tabler-trending-up' : 'tabler-trending-down'}
                style={{ fontSize: '1rem' }}
                aria-hidden='true'
              />
              <Typography variant='caption' component='span' sx={{ fontWeight: 600, color: 'inherit' }}>
                {`${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}${deltaUnit ? ` ${deltaUnit}` : ''}`}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>

      {/* Trend chart — edge-to-edge line/area; shrinks in condensed, dropped entirely in peek.
          `position: relative` contiene la tabla sr-only de abajo (visuallyHidden = position:absolute): sin un
          ancestro posicionado escaparía al viewport y su contenido `whiteSpace: nowrap` empujaría el
          scrollWidth de la página (clase TASK-742 / ISSUE-015). Acá queda clipada por su propio width:1px. */}
      {reveal(
        'chart',
        !isPeek,
        <Box sx={{ pb: 4, position: 'relative' }}>
          {canPlot ? (
          <>
            <AppRecharts>
              {/* `minWidth: 0` + `overflowX: clip` rompen el feedback de Recharts ResponsiveContainer: si el
                  contenedor se estrecha más rápido de lo que el chart re-mide, el SVG queda con un ancho stale
                  mayor y empujaría el scrollWidth de página (conocido en contenedores angostos). `clip` corta el
                  desborde horizontal sin clipar el tooltip vertical (overflow-y queda visible). */}
              <Box role='img' aria-label={ariaSummary} sx={{ width: '100%', minWidth: 0, overflowX: 'clip' }}>
                <ResponsiveContainer width='100%' height={chartHeight}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor={fillColor} stopOpacity={0.42} />
                        <stop offset='95%' stopColor={fillColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      hide={hideSecondary}
                      type='number'
                      dataKey='x'
                      domain={[0, 1]}
                      ticks={tickXs}
                      tickFormatter={tickFormatter}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'var(--mui-palette-text-disabled)' }}
                      dy={10}
                    />
                    <YAxis hide domain={yDomain ?? ['auto', 'auto']} />
                    <RTooltip
                      cursor={{ stroke: alpha(lineColor, 0.4), strokeWidth: 1, strokeDasharray: '4 4' }}
                      wrapperStyle={{ outline: 'none', zIndex: 10 }}
                      content={<TrendTooltip title={title} format={format} accent={lineColor} />}
                    />
                    <Area
                      type='monotone'
                      dataKey='value'
                      stroke={lineColor}
                      strokeWidth={2.5}
                      strokeLinecap='round'
                      fill={`url(#${gradientId})`}
                      dot={renderDot}
                      activeDot={renderActiveDot}
                      isAnimationActive={!prefersReduced}
                      animationDuration={700}
                      animationEasing='ease-out'
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </AppRecharts>
            {/* Screen-reader data-table fallback (canonical chart a11y) */}
            <Box component='table' sx={visuallyHidden}>
              <caption>{ariaSummary}</caption>
              <thead>
                <tr>
                  <th scope='col'>Mes</th>
                  <th scope='col'>{title}</th>
                </tr>
              </thead>
              <tbody>
                {trimmed.map((p, i) => (
                  <tr key={`${p.label}-${i}`}>
                    <th scope='row'>{p.label}</th>
                    <td>{p.value !== null ? formatValue(p.value, format) : 'sin dato'}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </>
        ) : (
          <Box sx={{ px: 6, py: 4 }} role='status'>
            <Typography variant='caption' color='text.disabled'>
              Sin histórico suficiente para la tendencia.
            </Typography>
          </Box>
          )}
        </Box>,
        { wrapperStyle: { marginTop: 'auto' }, animateHeight: false }
      )}
    </Card>
  )
}

export default MetricTrendCard
