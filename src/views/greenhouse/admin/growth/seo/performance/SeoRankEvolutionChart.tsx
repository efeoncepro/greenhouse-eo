'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { EChartsOption } from 'echarts'

import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_GROWTH_SEO_PERFORMANCE } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { SeoPerformanceMetric, SeoPerformanceSeries } from '@/lib/growth/seo/contracts'
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
  range: { from: string; to: string; days: number }
  /**
   * Bandas de contexto (ej. una actualización de algoritmo). Hoy siempre vacío: el dominio
   * NO tiene todavía una fuente de eventos de algoritmo, y hardcodear fechas conocidas de
   * la industria pintaría en el gráfico del cliente un hecho que Greenhouse no midió. El
   * componente lo soporta para cuando exista la fuente (follow-up declarado en la task).
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

const SeoRankEvolutionChart = ({ series, metric, range, events = [] }: SeoRankEvolutionChartProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [showTable, setShowTable] = useState(false)

  const isDark = theme.palette.mode === 'dark'
  const isPosition = metric === 'position'
  const metricLabel = GH_GROWTH_SEO_PERFORMANCE.metric[metric]

  // Unión ordenada de todas las fechas: es lo que permite que un día que UNA serie no midió
  // exista como `null` en su arreglo en vez de desaparecer (y que la línea se corte ahí).
  const dates = useMemo(() => {
    const all = new Set<string>()

    for (const serie of series) {
      for (const point of serie.points) {
        all.add(point.date)
      }
    }

    return [...all].sort()
  }, [series])

  const axisInk = resolveChartColor(theme.palette.text.secondary, '#6B6876')
  const gridInk = resolveChartColor(theme.palette.divider, '#DBDBDB')
  const paperInk = resolveChartColor(theme.palette.background.paper, '#FFFFFF')
  const targetInk = resolveChartColor(theme.palette.success.dark, '#0B726C')

  /**
   * Techo del eje de posición. Tiene que incluir SIEMPRE la meta top-3: con series muy
   * buenas (todas en 1) el auto-scale de ECharts cierra el rango en ~1.6 y la línea de meta
   * queda fuera del gráfico — la referencia comercial desaparecería justo cuando se está
   * cumpliendo. El piso de 10 le da al chart la forma reconocible de un rank tracker.
   */
  const positionMax = useMemo(() => {
    const values = series.flatMap(serie =>
      serie.points.map(point => point.value).filter((value): value is number => value !== null)
    )

    return Math.max(10, Math.ceil(Math.max(TARGET_POSITION + 2, ...(values.length > 0 ? values : [0]))))
  }, [series])

  const option = useMemo<EChartsOption>(() => {
    const chartSeries = series.map((serie, index) => {
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
        ...(index === 0 && events.length > 0
          ? {
              markArea: {
                silent: true,
                itemStyle: { color: resolveChartColor(theme.palette.warning.light, '#FFE0B2'), opacity: 0.25 },
                data: events.map(event => [
                  { xAxis: event.from, name: event.label },
                  { xAxis: event.to }
                ])
              }
            }
          : {})
      }
    })

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
        valueFormatter: (value: unknown) =>
          value === null || value === undefined ? GH_GROWTH_SEO_PERFORMANCE.table.pending : formatValue(Number(value), metric)
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
    series,
    dates,
    metric,
    isDark,
    isPosition,
    positionMax,
    events,
    prefersReduced,
    axisInk,
    gridInk,
    paperInk,
    targetInk,
    theme.palette.text.primary,
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
  const measuredDays = dates.length

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
            </Stack>

            <Button variant='outlined' size='small' onClick={() => setShowTable(current => !current)} aria-expanded={showTable}>
              {showTable ? GH_GROWTH_SEO_PERFORMANCE.chart.hideTable : GH_GROWTH_SEO_PERFORMANCE.chart.showTable}
            </Button>
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
          </Stack>

          <Box role='img' aria-label={ariaLabel}>
            <AppECharts option={option} height={380} />
          </Box>

          {/* `text.secondary`, no `disabled`: es una instrucción que hay que poder leer
              (el disabled quedó en 2.29:1 contra blanco — hallazgo axe del GVC). */}
          <Typography variant='caption' color='text.secondary'>
            {GH_GROWTH_SEO_PERFORMANCE.chart.zoomHint}
          </Typography>

          {showTable ? (
            // Fallback tabular real: la misma serie, legible por lector de pantalla y
            // copiable. Scroll INTERNO — la tabla nunca empuja el ancho de la página.
            <TableContainer sx={{ maxBlockSize: 320, overflowX: 'auto', maxInlineSize: '100%' }}>
              <Table size='small' aria-label={GH_GROWTH_SEO_PERFORMANCE.chart.tableCaption}>
                <TableHead>
                  <TableRow>
                    <TableCell>{GH_GROWTH_SEO_PERFORMANCE.chart.tableDateHeader}</TableCell>
                    {series.map(serie => (
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
                      {series.map(serie => {
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
