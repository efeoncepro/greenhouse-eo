'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { GreenhouseKpiDelta } from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_GROWTH_SEO_PERFORMANCE } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { SeoPerformanceMode, SeoPerformanceStanding } from '@/lib/growth/seo/contracts'
import { Line, LineChart, ResponsiveContainer, YAxis } from '@/libs/Recharts'
import AppRecharts from '@/libs/styles/AppRecharts'

/**
 * TASK-1307 — el detalle accionable del conjunto, y a la vez el **fallback tabular** de la
 * serie: un chart nunca puede ser la única forma de leer el dato.
 *
 * `DataTableShell` es obligatorio (regla dura de UI Platform: >6 columnas + orden +
 * sparkline embebido). Aporta lo que un `<Table>` crudo no: densidad resuelta por el ANCHO
 * REAL del contenedor y **scroll horizontal interno**, para que la tabla densa nunca empuje
 * el ancho de la página en 390px.
 *
 * ⚠️ Semántica invertida de la posición: `GreenhouseKpiDelta` con `invert` pinta el −5 en
 * verde con flecha abajo. **El signo y la flecha siguen al número real** — sólo cambia el
 * juicio (bueno/malo). Falsear el signo para "verse positivo" sería mentir sobre el dato.
 *
 * ⚠️ Toda celda sin dato dice "Pendiente", jamás 0: la posición 0 no existe y un CTR de 0%
 * afirmaría que apareciste y nadie hizo clic.
 */

type SortColumn = 'item' | 'position' | 'delta' | 'clicks' | 'impressions' | 'ctr'
type SortDirection = 'asc' | 'desc'

export interface SeoPerformanceTableProps {
  standings: SeoPerformanceStanding[]
  mode: SeoPerformanceMode
  /** Drill: navega a la misma superficie con la serie filtrada (`?urls=`/`?keywords=`). */
  onDrill: (item: string) => void
}

/**
 * Sparkline de fila: la serie diaria se agrega a buckets (≤26) ANTES de dibujar — 179
 * puntos crudos en 96px son ~2 puntos por pixel: un sismógrafo de agujas, no una
 * tendencia (mismo defecto corregido en la banda KPI; hallazgo del operador). El bucket
 * es el promedio de los días MEDIDOS; un bucket sin mediciones es `null` (hueco).
 */
const MAX_ROW_SPARKLINE_POINTS = 26

const bucketTrend = (trend: Array<number | null>): Array<number | null> => {
  if (trend.length <= MAX_ROW_SPARKLINE_POINTS) return trend

  const bucketSize = Math.ceil(trend.length / MAX_ROW_SPARKLINE_POINTS)
  const buckets: Array<number | null> = []

  for (let index = 0; index < trend.length; index += bucketSize) {
    const measured = trend.slice(index, index + bucketSize).filter((value): value is number => value !== null)

    buckets.push(measured.length > 0 ? measured.reduce((total, value) => total + value, 0) / measured.length : null)
  }

  return buckets
}

/**
 * Umbral neutro del Δ30d de posición: ±0.3. Un promedio ponderado por impresiones oscila
 * ±0.1–0.2 por puro ruido de mezcla de queries; pintar ese vaivén en rojo ("empeoró")
 * trata ruido como señal. Bajo el umbral el valor SE MUESTRA igual, en gris neutro — se
 * suprime el juicio, no el dato.
 */
const POSITION_DELTA_NEUTRAL_THRESHOLD = 0.3

/** `null` SIEMPRE al final, ordene como ordene: un "sin dato" no es ni el mejor ni el peor. */
const compareNullable = (a: number | null, b: number | null, direction: SortDirection): number => {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  return direction === 'asc' ? a - b : b - a
}

const SeoPerformanceTable = ({ standings, mode, onDrill }: SeoPerformanceTableProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  // Default: la mejor posición arriba. Es la pregunta con la que el operador llega.
  const [sortColumn, setSortColumn] = useState<SortColumn>('position')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const copy = GH_GROWTH_SEO_PERFORMANCE.table
  const axisLabel = mode === 'url' ? copy.axisUrl : copy.axisKeyword

  const sorted = useMemo(() => {
    const rows = [...standings]

    rows.sort((a, b) => {
      switch (sortColumn) {
        case 'item':
          return sortDirection === 'asc' ? a.item.localeCompare(b.item) : b.item.localeCompare(a.item)
        case 'delta':
          return compareNullable(a.positionDelta30d, b.positionDelta30d, sortDirection)
        case 'clicks':
          return sortDirection === 'asc' ? a.clicks - b.clicks : b.clicks - a.clicks
        case 'impressions':
          return sortDirection === 'asc' ? a.impressions - b.impressions : b.impressions - a.impressions
        case 'ctr':
          return compareNullable(a.ctr, b.ctr, sortDirection)
        case 'position':
        default:
          return compareNullable(a.position, b.position, sortDirection)
      }
    })

    return rows
  }, [standings, sortColumn, sortDirection])

  const toggleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'))

      return
    }

    setSortColumn(column)
    // Texto asciende A→Z; los números arrancan por el "mejor", que en posición es el menor
    // y en volumen es el mayor.
    setSortDirection(column === 'item' || column === 'position' ? 'asc' : 'desc')
  }

  const sortLabel = (column: SortColumn, label: string, align: 'left' | 'right' = 'right') => (
    <TableSortLabel
      active={sortColumn === column}
      direction={sortColumn === column ? sortDirection : 'asc'}
      onClick={() => toggleSort(column)}
      sx={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}
    >
      {label}
    </TableSortLabel>
  )

  const ariaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' =>
    sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <Card data-capture='seo-performance-table'>
      <CardContent>
        <Stack spacing={4}>
          <Typography variant='h5' component='h2'>
            {copy.title.replace('{axis}', axisLabel)}
          </Typography>

          <DataTableShell identifier='seo-performance-standings' ariaLabel={copy.ariaLabel} stickyFirstColumn>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell aria-sort={ariaSort('item')}>
                    {sortLabel('item', mode === 'url' ? copy.colItemUrl : copy.colItemKeyword, 'left')}
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('position')}>
                    <Tooltip title={copy.colPositionHint}>
                      <span>{sortLabel('position', copy.colPosition)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('delta')}>
                    <Tooltip title={copy.colDeltaHint}>
                      <span>{sortLabel('delta', copy.colDelta)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('clicks')}>
                    {sortLabel('clicks', copy.colClicks)}
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('impressions')}>
                    {sortLabel('impressions', copy.colImpressions)}
                  </TableCell>
                  <TableCell align='right' aria-sort={ariaSort('ctr')}>
                    {sortLabel('ctr', copy.colCtr)}
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title={copy.colTrendHint}>
                      <span>{copy.colTrend}</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map(row => {
                  const trendPoints = bucketTrend(row.trend)
                    .map((value, index) => ({ index, value }))
                    .filter(point => point.value !== null)

                  return (
                    <TableRow
                      key={row.item}
                      hover
                      // Fila alcanzable por teclado con la MISMA acción que el click: sin
                      // `tabIndex`+`onKeyDown` el drill sería exclusivo del mouse.
                      tabIndex={0}
                      role='button'
                      aria-label={copy.drillAria.replace('{item}', row.item)}
                      onClick={() => onDrill(row.item)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onDrill(row.item)
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ maxInlineSize: 280 }}>
                        <Typography variant='body2' noWrap title={row.item}>
                          {row.item}
                        </Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.position === null ? (
                          <Typography variant='body2' color='text.secondary'>
                            {copy.pending}
                          </Typography>
                        ) : (
                          row.position.toFixed(1)
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        {row.positionDelta30d === null ? (
                          <Tooltip title={copy.noComparisonHint}>
                            <Typography variant='caption' color='text.secondary'>
                              {copy.noComparison}
                            </Typography>
                          </Tooltip>
                        ) : (
                          // `invert`: en posición, bajar de número es mejorar → verde con
                          // flecha abajo. El signo mostrado sigue siendo el real.
                          <GreenhouseKpiDelta
                            value={row.positionDelta30d}
                            format='number'
                            invert
                            fractionDigits={1}
                            neutralThreshold={POSITION_DELTA_NEUTRAL_THRESHOLD}
                          />
                        )}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatInteger(row.clicks)}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatInteger(row.impressions)}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.ctr === null ? (
                          <Typography variant='body2' color='text.secondary'>
                            {copy.pending}
                          </Typography>
                        ) : (
                          `${(row.ctr * 100).toFixed(2)}%`
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        {trendPoints.length >= 2 ? (
                          <AppRecharts>
                            <Box sx={{ inlineSize: 96, minInlineSize: 96, overflowX: 'clip' }}>
                              <ResponsiveContainer width='100%' height={28}>
                                <LineChart data={trendPoints}>
                                  {/* Eje invertido también en el sparkline: si la línea del
                                      chart sube al mejorar, la de la fila no puede bajar. */}
                                  <YAxis hide reversed domain={['dataMin', 'dataMax']} />
                                  <Line
                                    type='monotone'
                                    dataKey='value'
                                    stroke={theme.palette.primary.main}
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={!prefersReduced}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          </AppRecharts>
                        ) : (
                          <Typography variant='caption' color='text.secondary'>
                            {copy.trendUnavailable}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SeoPerformanceTable
