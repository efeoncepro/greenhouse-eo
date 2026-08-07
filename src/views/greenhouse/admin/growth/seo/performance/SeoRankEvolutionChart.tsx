'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { EChartsOption } from 'echarts'

import { GreenhouseChip } from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_GROWTH_SEO_PERFORMANCE } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { SeoPerformanceMetric, SeoPerformanceSeries, SeoPerformanceSource } from '@/lib/growth/seo/contracts'
import AppECharts from '@/libs/styles/AppECharts'
import { resolveChartColor } from '@/libs/styles/resolveApexColor'

import { resolveSeoSeriesStyle, SEO_SERIES_SHAPE_LABEL } from './seo-performance-series-style'

/**
 * TASK-1307 — el chart ancla del módulo SEO (§10.3): la película de la evolución.
 *
 * ⚠️ EJE Y INVERTIDO en posición: 1 arriba = mejor, para que "subir en el gráfico"
 * signifique "mejorar". Es el estándar de rank-tracking (Semrush/Ahrefs) y un eje normal
 * sería contra-intuitivo justo en la lectura que más importa. La inversión se declara en
 * TRES lugares — el subtítulo VISIBLE, el `aria-label` y el tooltip — porque dejarla sólo
 * en la geometría le pide al operador que la infiera.
 *
 * ⚠️ LOS HUECOS SON HUECOS. Cada serie se rellena contra la unión de fechas de todas las
 * series y los días sin medición viajan como `null`; con `connectNulls: false` (el default
 * de ECharts, declarado acá igual para que nadie lo "arregle") la línea se corta. Omitir el
 * punto en vez de emitir `null` haría que ECharts uniera los extremos del hueco: una
 * interpolación visual que afirma una medición que nunca existió.
 *
 * Colorblind-safe por FORMA (color + tipo de línea + símbolo) — ver `seo-performance-series-style`.
 */

/** Referencia comercial del módulo: estar en el top 3. Sólo aplica al eje de posición. */
const TARGET_POSITION = 3

export interface SeoRankEvolutionChartProps {
  series: SeoPerformanceSeries[]
  metric: SeoPerformanceMetric
  /**
   * Origen RESUELTO de estas series. Vive acá y no en la cabecera de la pantalla porque
   * explica ESTE artefacto: un gráfico que carga su propia procedencia sigue siendo honesto
   * cuando alguien lo recorta y lo pega en una presentación. (La cabecera conserva sólo la
   * frescura, que sí aplica a toda la pantalla.)
   */
  source: SeoPerformanceSource
  range: { from: string; to: string; days: number }
  /**
   * Bandas de contexto: updates CONFIRMADOS del algoritmo de Google dentro del rango
   * (fuente: el registro curado `algorithm-updates.ts` — sólo entradas confirmadas por
   * Google, nunca rumores de terceros). Una caída colectiva dentro de una banda tiene una
   * explicación distinta a una caída propia del sitio, y esa distinción es exactamente la
   * conversación con el cliente.
   */
  events?: Array<{ from: string; to: string; label: string }>
}

const formatValue = (value: number, metric: SeoPerformanceMetric): string => {
  if (metric === 'ctr') return `${(value * 100).toFixed(2)}%`
  // Una posición se lee con un decimal: sin formatter el tick crudo muestra el ruido de
  // punto flotante ("5.7999999999999998").
  if (metric === 'position') return value.toFixed(1)

  return formatInteger(Math.round(value))
}

/** Lunes de la semana calendario de una fecha ISO — la clave del bucket semanal. */
const weekStartOf = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00Z`)
  const offset = (parsed.getUTCDay() + 6) % 7

  parsed.setUTCDate(parsed.getUTCDate() - offset)

  return parsed.toISOString().slice(0, 10)
}

/**
 * Agregación SEMANAL de una serie diaria. Reglas por métrica (las del módulo, no promedios
 * ingenuos indiscriminados): volumen (clics/impresiones) se SUMA; posición y CTR se
 * promedian sobre los días MEDIDOS de la semana (los `null` no diluyen — un hueco no es un
 * cero). Una semana sin ninguna medición da `null` (hueco visible). `aiOverview` es "hubo
 * AI Overview en ALGÚN día de la semana".
 */
const toWeekly = (
  points: SeoPerformanceSeries['points'],
  metric: SeoPerformanceMetric
): SeoPerformanceSeries['points'] => {
  const byWeek = new Map<string, { sum: number; measured: number; aio: boolean }>()

  for (const point of points) {
    const key = weekStartOf(point.date)
    const bucket = byWeek.get(key) ?? { sum: 0, measured: 0, aio: false }

    if (point.value !== null) {
      bucket.sum += point.value
      bucket.measured += 1
    }

    bucket.aio = bucket.aio || point.aiOverview === true
    byWeek.set(key, bucket)
  }

  const sumMetric = metric === 'clicks' || metric === 'impressions'

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      value: bucket.measured === 0 ? null : sumMetric ? bucket.sum : bucket.sum / bucket.measured,
      ...(bucket.aio ? { aiOverview: true } : {})
    }))
}

/**
 * Ajusta una banda de evento al eje de categorías: `markArea` sobre un eje `category`
 * necesita valores que EXISTAN como categorías. Se recorta la ventana del evento a las
 * fechas medidas que caen dentro; si ninguna cae, la banda no se dibuja (no se inventa).
 */
const resolveEventSpan = (
  dates: string[],
  event: { from: string; to: string }
): { from: string; to: string } | null => {
  const inside = dates.filter(date => date >= event.from && date <= event.to)

  return inside.length === 0 ? null : { from: inside[0], to: inside[inside.length - 1] }
}

/** Umbral de días medidos sobre el cual el default pasa a semanal (el diario es ruido). */
const WEEKLY_DEFAULT_THRESHOLD = 120

const SeoRankEvolutionChart = ({ series, metric, range, source, events = [] }: SeoRankEvolutionChartProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [showTable, setShowTable] = useState(false)

  // Días medidos CRUDOS (pre-agregación): deciden el default de granularidad.
  const rawMeasuredDays = useMemo(() => {
    const all = new Set<string>()

    for (const serie of series) {
      for (const point of serie.points) {
        all.add(point.date)
      }
    }

    return all.size
  }, [series])

  // En rangos largos el punto-por-día es ruido visual (nube de marcadores); la semana
  // conserva la FORMA. El operador puede volver a diario cuando necesita el detalle.
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>(() =>
    rawMeasuredDays > WEEKLY_DEFAULT_THRESHOLD ? 'weekly' : 'daily'
  )

  const isDark = theme.palette.mode === 'dark'
  const isPosition = metric === 'position'
  const metricLabel = GH_GROWTH_SEO_PERFORMANCE.metric[metric]

  const displaySeries = useMemo(
    () =>
      granularity === 'weekly'
        ? series.map(serie => ({ ...serie, points: toWeekly(serie.points, metric) }))
        : series,
    [series, metric, granularity]
  )

  // Unión ordenada de todas las fechas: es lo que permite que un día que UNA serie no midió
  // exista como `null` en su arreglo en vez de desaparecer (y que la línea se corte ahí).
  const dates = useMemo(() => {
    const all = new Set<string>()

    for (const serie of displaySeries) {
      for (const point of serie.points) {
        all.add(point.date)
      }
    }

    return [...all].sort()
  }, [displaySeries])

  const axisInk = resolveChartColor(theme.palette.text.secondary, '#6B6876')
  const gridInk = resolveChartColor(theme.palette.divider, '#DBDBDB')
  const paperInk = resolveChartColor(theme.palette.background.paper, '#FFFFFF')
  const targetInk = resolveChartColor(theme.palette.success.dark, '#0B726C')

  /**
   * Techo ADAPTATIVO del eje de posición: `max(meta+1, peorDato+1)`.
   *
   * Dos errores que este cálculo evita, uno por lado: (a) el auto-scale de ECharts con
   * series muy buenas cierra el rango en ~1.6 y la meta top-3 queda FUERA del gráfico —
   * la referencia comercial desaparece justo cuando se cumple; (b) un piso fijo de 10
   * (la versión anterior) dejaba la mitad del lienzo muerto cuando todo el dato vive en
   * 1-5 — el rango sigue al dato, no a una forma "reconocible" (hallazgo del operador).
   */
  const positionMax = useMemo(() => {
    const values = displaySeries.flatMap(serie =>
      serie.points.map(point => point.value).filter((value): value is number => value !== null)
    )

    const worst = values.length > 0 ? Math.max(...values) : TARGET_POSITION

    return Math.ceil(Math.max(TARGET_POSITION + 1, worst + 1))
  }, [displaySeries])

  /**
   * Días con AI Overview en la SERP de ALGUNA serie comparada. Sólo la serie ◑
   * (DataForSEO) trae el dato — GSC no reporta features del SERP — así que la ausencia
   * de marcadores en una serie ● es honestidad, no un hueco del componente.
   */
  const aioDates = useMemo(() => {
    const marked = new Set<string>()

    for (const serie of displaySeries) {
      for (const point of serie.points) {
        if (point.aiOverview) marked.add(point.date)
      }
    }

    return dates.filter(date => marked.has(date))
  }, [displaySeries, dates])

  const eventSpans = useMemo(
    () =>
      events
        .map(event => ({ label: event.label, span: resolveEventSpan(dates, event) }))
        .filter((entry): entry is { label: string; span: { from: string; to: string } } => entry.span !== null),
    [events, dates]
  )

  const option = useMemo<EChartsOption>(() => {
    const warningInk = resolveChartColor(theme.palette.warning.main, '#FF6500')

    const chartSeries: Record<string, unknown>[] = displaySeries.map((serie, index) => {
      const style = resolveSeoSeriesStyle(index, isDark)
      const byDate = new Map(serie.points.map(point => [point.date, point.value]))

      return {
        name: serie.item,
        type: 'line' as const,
        // El hueco explícito: sin esto ECharts uniría los extremos e inventaría la medición.
        // Valores planos alineados al eje de categorías — una sola definición del eje X
        // (declarar además pares `[fecha, valor]` daría dos, que es la mitad del bug de
        // los pageerrors de TASK-1306 en el otro motor).
        data: dates.map(date => byDate.get(date) ?? null),
        connectNulls: false,
        showSymbol: true,
        symbol: style.symbol,
        symbolSize: 6,
        lineStyle: { width: 2, type: style.lineType },
        itemStyle: { color: style.color },
        // Last-value label: el nombre de la serie pegado a su último punto evita el
        // ida-y-vuelta a la leyenda para saber cuál línea es cuál.
        endLabel: {
          show: true,
          formatter: (params: { value: number | null }) =>
            params.value === null ? '' : `${serie.item}  ${formatValue(Number(params.value), metric)}`,
          color: style.color,
          fontSize: 11,
          distance: 6
        },
        // Series que terminan en el MISMO valor (frecuente: varias keywords de marca todas
        // en la posición 1) apilarían sus etiquetas hasta volverlas ilegibles. `shiftY` las
        // separa en vertical en vez de esconderlas: perder la etiqueta de una serie sería
        // perder justo la lectura que el label existe para dar.
        labelLayout: { moveOverlap: 'shiftY' as const, hideOverlap: false },
        emphasis: { focus: 'series' as const },
        // Bajo movimiento reducido el estado final se renderiza directo (WCAG 2.3.3).
        animation: !prefersReduced,
        animationDuration: 400,
        ...(index === 0 && isPosition
          ? {
              markLine: {
                silent: true,
                symbol: 'none' as const,
                lineStyle: { color: targetInk, type: 'dashed' as const, width: 1.5 },
                label: {
                  formatter: GH_GROWTH_SEO_PERFORMANCE.chart.targetLabel,
                  position: 'insideEndTop' as const,
                  color: targetInk,
                  fontSize: 11
                },
                data: [{ yAxis: TARGET_POSITION }]
              }
            }
          : {}),
        ...(index === 0 && eventSpans.length > 0
          ? {
              markArea: {
                silent: true,
                itemStyle: { color: resolveChartColor(theme.palette.warning.light, '#FFE0B2'), opacity: 0.25 },
                // Vertical dentro de la banda: dos updates cercanos (marzo/mayo) con
                // etiquetas horizontales se pisan entre sí; en vertical cada una vive
                // dentro de su propia banda.
                label: {
                  color: axisInk,
                  fontSize: 10,
                  // Anclada ABAJO y rotada: crece hacia adentro de la banda (anclarla
                  // arriba la hacía salirse del lienzo y quedaba truncada a "Goo…").
                  position: 'insideBottom' as const,
                  rotate: 90,
                  align: 'left' as const,
                  distance: 8
                },
                // Los límites se recortan a fechas que EXISTEN como categoría del eje —
                // un markArea con una fecha no medida simplemente no se dibujaría.
                data: eventSpans.map(entry => [
                  { xAxis: entry.span.from, name: entry.label },
                  { xAxis: entry.span.to }
                ])
              }
            }
          : {})
      }
    })

    // Carril de AI Overview: un rombo por fecha con AIO, anclado al borde inferior del
    // lienzo (en el eje invertido de posición, `positionMax` ES el borde inferior). Es un
    // carril de contexto, no una serie de datos: `silent`, sin animación de énfasis, y el
    // tooltip lo narra sin número (un rombo no tiene "valor").
    if (aioDates.length > 0 && isPosition) {
      chartSeries.push({
        name: GH_GROWTH_SEO_PERFORMANCE.chart.aioMarker,
        type: 'scatter' as const,
        data: dates.map(date => (aioDates.includes(date) ? positionMax : null)),
        symbol: 'diamond',
        symbolSize: 9,
        itemStyle: { color: warningInk },
        silent: true,
        animation: !prefersReduced,
        z: 1
      })
    }

    return {
      // El gráfico deja aire a la derecha para los last-value labels: sin ese margen se
      // recortarían contra el borde justo en la lectura que más se mira.
      grid: { left: 8, right: 148, top: 16, bottom: 56, containLabel: true },
      tooltip: {
        // `axis` (no `item`): el valor de la pantalla es COMPARAR, así que el tooltip
        // muestra todas las series de esa fecha a la vez.
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { show: false } },
        backgroundColor: paperInk,
        borderColor: gridInk,
        textStyle: { color: resolveChartColor(theme.palette.text.primary, '#2F2B3D'), fontSize: 12 },
        // Formatter propio en vez de `valueFormatter`: el carril de AI Overview se narra
        // SIN número (un rombo de contexto no tiene "valor"; mostrarle el y interno del
        // carril afirmaría una posición que no existe). Días sin medición se omiten de la
        // lista — el hueco ya se ve en el lienzo.
        formatter: (params: unknown) => {
          const entries = (Array.isArray(params) ? params : [params]) as Array<{
            seriesName?: string
            marker?: string
            value?: unknown
            axisValueLabel?: string
          }>

          const header = entries[0]?.axisValueLabel ?? ''

          const lines = entries
            .map(entry => {
              if (entry.seriesName === GH_GROWTH_SEO_PERFORMANCE.chart.aioMarker) {
                return entry.value === null || entry.value === undefined
                  ? null
                  : `${entry.marker ?? ''} ${GH_GROWTH_SEO_PERFORMANCE.chart.aioLegend}`
              }

              if (entry.value === null || entry.value === undefined) return null

              return `${entry.marker ?? ''} ${entry.seriesName}: <b>${formatValue(Number(entry.value), metric)}</b>`
            })
            .filter(Boolean)

          return [`<b>${header}</b>`, ...lines].join('<br/>')
        }
      },
      // SIN leyenda de ECharts: la leyenda de este chart es la de FORMA que se renderiza
      // arriba en HTML, porque es la que nombra el símbolo de cada serie (el contrato
      // colorblind-safe). Dos leyendas para las mismas series sería ruido y duplicación.
      legend: { show: false },
      xAxis: {
        // `category` sobre la unión de fechas, NO `time`: con pocos días medidos un eje
        // temporal reparte ticks por HORA ("04:00, 08:00…") sobre una serie diaria, que es
        // una precisión que el dato no tiene.
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridInk } },
        axisTick: { show: false },
        axisLabel: { color: axisInk, fontSize: 11, hideOverlap: true }
      },
      yAxis: {
        type: 'value',
        // EL invariante: en posición, 1 arriba = mejor.
        inverse: isPosition,
        // Posición arranca en 1 (la 0 no existe) y llega al menos hasta 10 para que la
        // meta top-3 SIEMPRE esté dentro del gráfico. El volumen arranca en 0 porque
        // truncar un eje de volumen distorsiona la magnitud.
        min: isPosition ? 1 : 0,
        ...(isPosition ? { max: positionMax, minInterval: 1 } : {}),
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } },
        axisLabel: {
          color: axisInk,
          fontSize: 11,
          formatter: (value: number) => formatValue(value, metric)
        }
      },
      dataZoom: [
        { type: 'inside', throttle: 50 },
        {
          type: 'slider',
          height: 22,
          bottom: 8,
          borderColor: gridInk,
          fillerColor: resolveChartColor(theme.palette.action.hover, '#F2F2F4'),
          handleStyle: { color: axisInk },
          textStyle: { color: axisInk, fontSize: 10 }
        }
      ],
      series: chartSeries
    } as EChartsOption
  }, [
    displaySeries,
    dates,
    metric,
    isDark,
    isPosition,
    positionMax,
    eventSpans,
    aioDates,
    prefersReduced,
    axisInk,
    gridInk,
    paperInk,
    targetInk,
    theme.palette.text.primary,
    theme.palette.warning.main,
    theme.palette.warning.light,
    theme.palette.action.hover
  ])

  /**
   * Cobertura REAL: días con al menos una medición vs. días pedidos.
   *
   * Es la corrección más importante de la lectura del gráfico. El período pedido y los
   * días medidos casi nunca coinciden — una keyword que empezó a trackearse ayer tiene 2
   * puntos dentro de una ventana de 90 días — y sin decirlo el título "Evolución de
   * posición" sobre una línea de dos puntos se lee como un gráfico roto, no como una serie
   * que recién empieza.
   */
  const measuredDays = rawMeasuredDays

  const coverageNote =
    measuredDays <= 1
      ? GH_GROWTH_SEO_PERFORMANCE.chart.coverageSingle.replace('{from}', dates[0] ?? range.from)
      : GH_GROWTH_SEO_PERFORMANCE.chart.coverage
          .replace('{measured}', String(measuredDays))
          .replace('{requested}', String(range.days))
          .replace('{from}', dates[0] ?? range.from)
          .replace('{to}', dates[dates.length - 1] ?? range.to)

  const ariaLabel = (isPosition ? GH_GROWTH_SEO_PERFORMANCE.chart.ariaPosition : GH_GROWTH_SEO_PERFORMANCE.chart.ariaVolume)
    .replace('{count}', String(series.length))
    .replace('{metric}', metricLabel.toLowerCase())
    .replace('{from}', range.from)
    .replace('{to}', range.to)

  return (
    <Card data-capture='seo-performance-chart'>
      <CardContent>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent='space-between'
            alignItems={{ sm: 'flex-start' }}
          >
            <Stack spacing={1}>
              <Typography variant='h5' component='h2'>
                {GH_GROWTH_SEO_PERFORMANCE.chart.title.replace('{metric}', metricLabel.toLowerCase())}
              </Typography>
              {/* La inversión, dicha con palabras y visible — no sólo en el aria-label. */}
              <Typography variant='body2' color='text.secondary'>
                {isPosition
                  ? GH_GROWTH_SEO_PERFORMANCE.chart.subtitlePosition
                  : GH_GROWTH_SEO_PERFORMANCE.chart.subtitleVolume}
              </Typography>
              {/* Cobertura real: sin esto el gráfico promete una película que el dato
                  todavía no puede contar. Va PEGADO al título, no en un banner al pie. */}
              <Typography variant='caption' color='text.secondary'>
                {coverageNote}
              </Typography>

              {/* Procedencia de ESTAS series, junto al gráfico que describe (principio de
                  proximidad): la fuente vigente va sólida y la otra en label, y el recordatorio
                  de que NUNCA se promedian entre sí queda pegado al artefacto que lo necesita. */}
              <Stack
                direction='row'
                spacing={2}
                alignItems='center'
                aria-label={GH_GROWTH_SEO_PERFORMANCE.source.ariaLabel}
                flexWrap='wrap'
                useFlexGap
                sx={{ pt: 1 }}
              >
                <Tooltip title={GH_GROWTH_SEO_PERFORMANCE.source.measuredHint}>
                  <span>
                    <GreenhouseChip
                      kind='metric'
                      variant={source === 'gsc_measured' ? 'solid' : 'label'}
                      size='small'
                      label={`● ${GH_GROWTH_SEO_PERFORMANCE.source.measured}`}
                    />
                  </span>
                </Tooltip>
                <Tooltip title={GH_GROWTH_SEO_PERFORMANCE.source.estimatedHint}>
                  <span>
                    <GreenhouseChip
                      kind='metric'
                      variant={source === 'dataforseo_estimated' ? 'solid' : 'label'}
                      size='small'
                      label={`◑ ${GH_GROWTH_SEO_PERFORMANCE.source.estimated}`}
                    />
                  </span>
                </Tooltip>
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_PERFORMANCE.source.mixHint}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={granularity}
                onChange={(_event, next: 'daily' | 'weekly' | null) => {
                  // Exclusive permite des-seleccionar (next=null): se ignora — siempre hay
                  // una granularidad activa.
                  if (next) setGranularity(next)
                }}
                aria-label={GH_GROWTH_SEO_PERFORMANCE.chart.granularityLabel}
                // Mismo focus ring explícito que el botón de tabla: el theme no dibuja
                // outline en focus, y el probe de teclado del GVC enfoca programático
                // (no dispara focus-visible) — por eso se cubre también `:focus` plano.
                sx={{
                  '& .MuiToggleButton-root.Mui-focusVisible, & .MuiToggleButton-root:focus-visible, & .MuiToggleButton-root:focus':
                    {
                      outline: theme => `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2
                    }
                }}
              >
                <ToggleButton value='daily'>{GH_GROWTH_SEO_PERFORMANCE.chart.granularityDaily}</ToggleButton>
                <ToggleButton value='weekly'>{GH_GROWTH_SEO_PERFORMANCE.chart.granularityWeekly}</ToggleButton>
              </ToggleButtonGroup>

              <Button
              variant='outlined'
              size='small'
              onClick={() => setShowTable(current => !current)}
              aria-expanded={showTable}
              // Focus ring EXPLÍCITO: el theme no dibuja outline en focus y este toggle
              // es parte del contrato de teclado del chart (probe del GVC). Se cubre
              // también `:focus` plano porque un focus programático (como el del probe)
              // no dispara la heurística focus-visible del navegador.
              sx={{
                '&.Mui-focusVisible, &:focus-visible, &:focus': {
                  outline: theme => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2
                }
              }}
            >
              {showTable ? GH_GROWTH_SEO_PERFORMANCE.chart.hideTable : GH_GROWTH_SEO_PERFORMANCE.chart.showTable}
              </Button>
            </Stack>
          </Stack>

          {/* Leyenda de FORMA: el color solo no basta (WCAG 1.4.1). Cada serie se nombra
              junto a la figura de su marcador, que es lo que sobrevive en monocromo. */}
          <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
            {series.map((serie, index) => {
              const style = resolveSeoSeriesStyle(index, isDark)

              return (
                <Stack key={serie.item} direction='row' spacing={1} alignItems='center'>
                  <Box
                    aria-hidden='true'
                    sx={{
                      inlineSize: 18,
                      blockSize: 0,
                      borderBlockStart: `2px ${typeof style.lineType === 'string' ? style.lineType : 'dashed'} ${style.color}`
                    }}
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {serie.item} · {SEO_SERIES_SHAPE_LABEL[style.symbol] ?? style.symbol}
                  </Typography>
                </Stack>
              )
            })}

            {/* El carril AIO y las bandas de update también se nombran en la leyenda:
                un símbolo sin nombre es un acertijo, no una anotación. */}
            {aioDates.length > 0 && isPosition ? (
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box
                  aria-hidden='true'
                  sx={{
                    inlineSize: 9,
                    blockSize: 9,
                    backgroundColor: 'warning.main',
                    transform: 'rotate(45deg)'
                  }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_PERFORMANCE.chart.aioLegend}
                </Typography>
              </Stack>
            ) : null}

            {eventSpans.length > 0 ? (
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box
                  aria-hidden='true'
                  sx={{
                    inlineSize: 14,
                    blockSize: 10,
                    backgroundColor: 'warning.light',
                    opacity: 0.45,
                    borderRadius: 0.5
                  }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_PERFORMANCE.chart.updatesLegend}
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          <Box role='img' aria-label={ariaLabel}>
            <AppECharts option={option} height={380} />
          </Box>

          {/* `text.secondary`, no `disabled`: es una instrucción que hay que poder leer
              (el disabled quedó en 2.29:1 contra blanco — hallazgo axe del GVC). */}
          <Typography variant='caption' color='text.secondary'>
            {granularity === 'weekly'
              ? `${GH_GROWTH_SEO_PERFORMANCE.chart.granularityWeeklyHint} ${GH_GROWTH_SEO_PERFORMANCE.chart.zoomHint}`
              : GH_GROWTH_SEO_PERFORMANCE.chart.zoomHint}
          </Typography>

          {showTable ? (
            // Fallback tabular real: la misma serie, legible por lector de pantalla y
            // copiable. Scroll INTERNO — la tabla nunca empuja el ancho de la página.
            // `tabIndex` + role/label: una región scrolleable sin foco es inalcanzable
            // por teclado (axe scrollable-region-focusable).
            <TableContainer
              tabIndex={0}
              role='region'
              aria-label={GH_GROWTH_SEO_PERFORMANCE.chart.tableCaption}
              sx={{ maxBlockSize: 320, overflowX: 'auto', maxInlineSize: '100%' }}
            >
              <Table size='small' aria-label={GH_GROWTH_SEO_PERFORMANCE.chart.tableCaption}>
                <TableHead>
                  <TableRow>
                    <TableCell>{GH_GROWTH_SEO_PERFORMANCE.chart.tableDateHeader}</TableCell>
                    {displaySeries.map(serie => (
                      <TableCell key={serie.item} align='right'>
                        {serie.item}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dates.map(date => (
                    <TableRow key={date}>
                      <TableCell>{date}</TableCell>
                      {displaySeries.map(serie => {
                        const value = serie.points.find(point => point.date === date)?.value ?? null

                        return (
                          <TableCell key={serie.item} align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {/* Sin dato se dice "Pendiente", nunca 0. */}
                            {value === null ? GH_GROWTH_SEO_PERFORMANCE.table.pending : formatValue(value, metric)}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SeoRankEvolutionChart
