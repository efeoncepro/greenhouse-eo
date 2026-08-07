'use client'

import { useMemo, useState } from 'react'

import { useTheme } from '@mui/material/styles'
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

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import { resolveApexColor } from '@/libs/styles/resolveApexColor'
import { formatInteger } from '@/lib/format'
import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { SeoOverviewSeriesPoint } from '@/lib/growth/seo/overview/read-overview-kpis'

/**
 * TASK-1306 — evolución de visibilidad (región 3 del wireframe).
 *
 * DOS charts APILADOS, no un combo de doble eje. `dataviz-design` prohíbe el dual y-axis
 * (Stephen Few): dos escalas distintas sobre el mismo plano dejan que la posición relativa
 * de las curvas sugiera correlaciones que no existen — y acá una escala va de 0 a miles
 * (clics) y la otra de 1 a 20 INVERTIDA. Apilados comparten el eje X y se leen juntos sin
 * mentir.
 *
 * El chart de posición usa `yaxis.reversed` — 1 arriba = mejor. La inversión se declara en
 * el `aria-label` y en el subtítulo visible: no se deja al color ni a la intuición.
 *
 * `Ver tabla de datos` es el fallback tabular obligatorio del contrato de a11y: un chart
 * NUNCA puede ser la única forma de leer la serie.
 */

interface Props {
  series: SeoOverviewSeriesPoint[]
}

const SeoVisibilityEvolutionChart = ({ series }: Props) => {
  const theme = useTheme()
  const [showTable, setShowTable] = useState(false)

  // Formato `{x, y}` en vez de un array plano de valores: con el array plano ApexCharts
  // revienta al encontrar un `null` ("Cannot read properties of null (reading '1')",
  // 8 pageerrors atrapados por el gate de runtime del GVC). Con `{x, y}` el `y: null` es
  // un hueco de primera clase — que es justo lo que necesitamos: un día sin medición se
  // dibuja como hueco, NUNCA interpolado.
  const clicksSeries = useMemo(
    () => [
      {
        name: GH_GROWTH_SEO_OVERVIEW.evolution.clicksSeries,
        data: series.map(point => ({ x: point.date, y: point.clicks }))
      }
    ],
    [series]
  )

  const positionSeries = useMemo(
    () => [
      {
        name: GH_GROWTH_SEO_OVERVIEW.evolution.positionSeries,
        data: series.map(point => ({ x: point.date, y: point.position }))
      }
    ],
    [series]
  )

  // SIN `categories`: los puntos ya viajan como `{x, y}`. Declarar ambos le da a Apex dos
  // definiciones del eje X en conflicto y revienta al cruzarlas (los 8 pageerrors).
  const sharedAxis = {
    type: 'category' as const,
    labels: { style: { colors: resolveApexColor(theme.palette.text.secondary, '#6B6876') } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  }

  const clicksOptions = {
    chart: { type: 'area' as const, toolbar: { show: false }, parentHeightOffset: 0, sparkline: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2 },
    colors: [resolveApexColor(theme.palette.primary.main, '#0375DB')],
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.2, opacityFrom: 0.35, opacityTo: 0.05 } },
    grid: {
      borderColor: resolveApexColor(theme.palette.divider, '#DBDBDB'),
      strokeDashArray: 4,
      xaxis: { lines: { show: false } }
    },
    xaxis: sharedAxis,
    // Los clics SÍ arrancan en 0: el área codifica volumen y truncar el eje distorsiona.
    yaxis: {
      min: 0,
      labels: {
        formatter: (value: number) => (Number.isFinite(value) ? formatInteger(Math.round(value)) : ''),
        style: { colors: resolveApexColor(theme.palette.text.secondary, '#6B6876') }
      }
    },
    tooltip: { theme: theme.palette.mode }
  }

  const positionOptions = {
    chart: { type: 'line' as const, toolbar: { show: false }, parentHeightOffset: 0 },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2, dashArray: 4 },
    colors: [resolveApexColor(theme.palette.secondary.main, '#0B726C')],
    markers: { size: 4 },
    grid: {
      borderColor: resolveApexColor(theme.palette.divider, '#DBDBDB'),
      strokeDashArray: 4,
      xaxis: { lines: { show: false } }
    },
    xaxis: sharedAxis,
    yaxis: {
      // El invariante de la task: 1 arriba = mejor.
      reversed: true,
      labels: {
        // Sin formatter, Apex imprime el tick crudo y el ruido de punto flotante queda a
        // la vista ("5.7999999999999998"). Una posición se lee con un decimal.
        formatter: (value: number) => (Number.isFinite(value) ? value.toFixed(1) : ''),
        style: { colors: resolveApexColor(theme.palette.text.secondary, '#6B6876') }
      }
    },
    tooltip: { theme: theme.palette.mode }
  }

  return (
    <Card data-capture='seo-overview-evolution'>
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
                {GH_GROWTH_SEO_OVERVIEW.evolution.title}
              </Typography>
              {/* La inversión se dice con palabras, no sólo con el eje. */}
              <Typography variant='body2' color='text.secondary'>
                {GH_GROWTH_SEO_OVERVIEW.evolution.subtitle}
              </Typography>
            </Stack>

            <Button
              variant='outlined'
              size='small'
              onClick={() => setShowTable(current => !current)}
              aria-expanded={showTable}
            >
              {showTable ? GH_GROWTH_SEO_OVERVIEW.evolution.hideTable : GH_GROWTH_SEO_OVERVIEW.evolution.showTable}
            </Button>
          </Stack>

          <Box role='img' aria-label={GH_GROWTH_SEO_OVERVIEW.evolution.ariaLabel}>
            <AppReactApexCharts
              type='area'
              height={220}
              width='100%'
              series={clicksSeries}
              options={clicksOptions}
            />
            <AppReactApexCharts
              type='line'
              height={200}
              width='100%'
              series={positionSeries}
              options={positionOptions}
            />
          </Box>

          {showTable ? (
            // Fallback tabular: misma serie, legible por lector de pantalla y copiable.
            // Scroll INTERNO: la tabla nunca empuja el ancho de la página (el gate de
            // layout del GVC la detectó desbordando el viewport).
            <TableContainer sx={{ maxBlockSize: 320, overflowX: 'auto', maxInlineSize: '100%' }}>
              <Table size='small' aria-label={GH_GROWTH_SEO_OVERVIEW.evolution.tableCaption}>
                <TableHead>
                  <TableRow>
                    <TableCell>{GH_GROWTH_SEO_OVERVIEW.evolution.tableDateHeader}</TableCell>
                    <TableCell align='right'>{GH_GROWTH_SEO_OVERVIEW.evolution.clicksSeries}</TableCell>
                    <TableCell align='right'>{GH_GROWTH_SEO_OVERVIEW.kpis.impressions.title}</TableCell>
                    <TableCell align='right'>{GH_GROWTH_SEO_OVERVIEW.evolution.positionSeries}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {series.map(point => (
                    <TableRow key={point.date}>
                      <TableCell>{point.date}</TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {point.clicks}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {point.impressions}
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {/* Sin dato se dice "Pendiente", nunca 0 (que sería una posición imposible). */}
                        {point.position === null
                          ? GH_GROWTH_SEO_OVERVIEW.states.pending
                          : point.position.toFixed(1)}
                      </TableCell>
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

export default SeoVisibilityEvolutionChart
