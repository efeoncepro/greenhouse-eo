'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { EChartsOption } from 'echarts'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { getChartTypographyFromTheme } from '@/components/theme/chart-typography'
import { MOTION_DURATION_MS, MOTION_DURATION_S } from '@/components/greenhouse/motion/core/tokens'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import { selectFeaturedRankSeries } from '@/lib/growth/seo/client/select-featured-series'
import type { RankEvolutionSeries } from '@/lib/growth/seo/contracts'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import AppECharts from '@/libs/styles/AppECharts'
import { resolveChartColor } from '@/libs/styles/resolveApexColor'

export interface SeoRankEvolutionChartProps {
  series: RankEvolutionSeries[]
  range: { from: string; to: string; days: number }
  dataCapture?: string
  surface?: 'contained' | 'open'
}

const SERIES_SYMBOLS = ['circle', 'diamond', 'triangle', 'rect', 'roundRect'] as const

const formatRank = (value: number | null): string => (value === null ? 'Sin dato' : value.toFixed(1))

const formatDateLabel = (date: string): string => date.slice(5).replace('-', '/')

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const SeoRankEvolutionChart = ({
  series,
  range,
  dataCapture = 'seo-client-evolution',
  surface = 'contained'
}: SeoRankEvolutionChartProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [showTable, setShowTable] = useState(false)
  const [hiddenKeywords, setHiddenKeywords] = useState<Set<string>>(() => new Set())

  const featuredSeries = useMemo(() => selectFeaturedRankSeries(series), [series])

  const visibleSeries = useMemo(
    () => featuredSeries.filter(serie => !hiddenKeywords.has(serie.keyword)),
    [featuredSeries, hiddenKeywords]
  )

  const dates = useMemo(() => {
    const unique = new Set<string>()

    series.forEach(serie => serie.points.forEach(point => unique.add(point.date)))

    return [...unique].sort()
  }, [series])

  const observedDates = useMemo(
    () => dates.filter(date => series.some(serie => serie.points.some(point => point.date === date && point.position !== null))),
    [dates, series]
  )

  const chartDates = useMemo(
    () => dates.filter(date => featuredSeries.some(serie => serie.points.some(point => point.date === date && point.position !== null))),
    [dates, featuredSeries]
  )

  const positionMax = useMemo(() => {
    const values = featuredSeries.flatMap(serie =>
      serie.points.map(point => point.position).filter((position): position is number => position !== null)
    )

    return Math.ceil(Math.max(10, ...(values.length > 0 ? values : [10])) + 1)
  }, [featuredSeries])

  const latestReading = useMemo(() => {
    const latestDate = chartDates[chartDates.length - 1] ?? null

    const latestCandidates = featuredSeries.flatMap(serie =>
      serie.points
        .filter(point => point.date === latestDate && point.position !== null)
        .map(point => ({ keyword: serie.keyword, position: point.position as number }))
    )

    const fallbackCandidates = featuredSeries.flatMap(serie =>
      [...serie.points]
        .reverse()
        .filter(point => point.position !== null)
        .slice(0, 1)
        .map(point => ({ keyword: serie.keyword, position: point.position as number }))
    )

    const best = [...(latestCandidates.length > 0 ? latestCandidates : fallbackCandidates)].sort(
      (left, right) => left.position - right.position
    )[0]

    return { date: latestDate, ...best }
  }, [chartDates, featuredSeries])

  const observedSnapshots = useMemo(
    () =>
      observedDates.slice(-6).map(date => {
        const candidates = featuredSeries
          .flatMap(serie => {
            const point = serie.points.find(candidate => candidate.date === date)

            return point?.position !== null && point?.position !== undefined
              ? [{ keyword: serie.keyword, position: point.position }]
              : []
          })
          .sort((left, right) => left.position - right.position)

        return {
          date,
          count: candidates.length,
          keyword: candidates[0]?.keyword ?? null,
          position: candidates[0]?.position ?? null
        }
      }),
    [featuredSeries, observedDates]
  )

  const measuredDays = observedDates.length
  const chartDays = chartDates.length
  const coveragePercent = Math.min(100, Math.round((measuredDays / Math.max(1, range.days)) * 100))
  const sparseThreshold = Math.min(8, Math.ceil(range.days * 0.2))
  const isSparse = measuredDays <= sparseThreshold
  const axisInk = resolveChartColor(theme.palette.text.secondary, '#6B6876')
  const gridInk = resolveChartColor(theme.palette.divider, '#DBDBDB')
  const paperInk = resolveChartColor(theme.palette.background.paper, '#FFFFFF')
  const chartTypography = getChartTypographyFromTheme(theme)

  const seriesColors = useMemo(
    () => (theme.palette.mode === 'dark' ? GH_COLORS.chart.categoricalDark : GH_COLORS.chart.categorical),
    [theme.palette.mode]
  )

  const option = useMemo<EChartsOption>(
    () => ({
      animation: !prefersReduced,
      animationDuration: MOTION_DURATION_MS.long,
      textStyle: chartTypography.axisLabel,
      aria: {
        enabled: true,
        label: { description: GH_GROWTH_SEO_CLIENT.evolution.aria }
      },
      grid: { left: 8, right: 22, top: 24, bottom: 36, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: paperInk,
        borderColor: gridInk,
        borderWidth: 1,
        padding: [10, 12],
        axisPointer: { type: 'line', lineStyle: { color: theme.palette.primary.main, width: 1 } },
        textStyle: { ...chartTypography.tooltip, color: theme.palette.text.primary },
        formatter: (params: unknown) => {
          const entries = (Array.isArray(params) ? params : [params]) as Array<{
            seriesName?: string
            marker?: string
            value?: unknown
            axisValue?: unknown
          }>

          const header = escapeHtml(String(entries[0]?.axisValue ?? ''))

          const lines = entries
            .filter(entry => entry.value !== null && entry.value !== undefined)
            .map(
              entry =>
                `<div style="display:flex;align-items:center;gap:6px"><span>${entry.marker ?? ''}</span><span>${escapeHtml(String(entry.seriesName ?? ''))}</span><b style="margin-left:auto">${formatRank(Number(entry.value))}</b></div>`
            )

          return [`<div style="font-weight:700;margin-bottom:6px">${header}</div>`, ...(lines.length > 0 ? lines : [`<div>${GH_GROWTH_SEO_CLIENT.evolution.noMeasurement}</div>`])].join('')
        }
      },
      legend: { show: false },
      xAxis: {
        type: 'category',
        data: chartDates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridInk } },
        axisTick: { show: false },
        axisLabel: { ...chartTypography.axisLabel, color: axisInk, formatter: formatDateLabel, hideOverlap: true }
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: 1,
        max: positionMax,
        minInterval: 1,
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } },
        axisLabel: { ...chartTypography.axisLabel, color: axisInk, formatter: (value: number) => String(value) }
      },
      series: visibleSeries.map(serie => {
        const featuredIndex = featuredSeries.findIndex(featured => featured.keyword === serie.keyword)
        const byDate = new Map(serie.points.map(point => [point.date, point.position]))
        const color = seriesColors[featuredIndex % seriesColors.length]

        return {
          name: serie.keyword,
          type: 'line' as const,
          data: chartDates.map(date => byDate.get(date) ?? null),
          connectNulls: false,
          showSymbol: true,
          symbol: SERIES_SYMBOLS[featuredIndex % SERIES_SYMBOLS.length],
          symbolSize: 7,
          lineStyle: { color, width: 2.5, type: featuredIndex % 2 === 0 ? 'solid' : 'dashed' },
          itemStyle: { color },
          markPoint: {
            symbol: 'circle',
            symbolSize: 12,
            label: { show: false },
            itemStyle: { color, borderColor: paperInk, borderWidth: 2 },
            data: (() => {
              // El predicado de tipo (y no un cast) es lo que le deja ver a TS que el punto
              // encontrado YA tiene posición: `coord` no admite `null`, y un `as` acá
              // silenciaría justo el caso que importa — la keyword sin corte medido.
              const point = [...serie.points]
                .reverse()
                .find((candidate): candidate is typeof candidate & { position: number } => candidate.position !== null)

              return point ? [{ coord: [point.date, point.position], name: 'Último corte' }] : []
            })()
          },
          emphasis: { focus: 'series' as const, scale: true },
          animation: !prefersReduced
        }
      })
    }),
    [
      axisInk,
      chartTypography,
      featuredSeries,
      gridInk,
      chartDates,
      paperInk,
      prefersReduced,
      positionMax,
      seriesColors,
      theme.palette.primary.main,
      theme.palette.text.primary,
      visibleSeries
    ]
  )

  if (series.length === 0 || measuredDays === 0) {
    const emptyBody = (
      <Stack spacing={1}>
          <Typography variant='h5' component='h2'>
            {GH_GROWTH_SEO_CLIENT.evolution.title}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            {GH_GROWTH_SEO_CLIENT.evolution.emptyDescription}
          </Typography>
      </Stack>
    )

    return surface === 'open' ? (
      <Box data-capture={dataCapture} data-ui-surface='open' sx={{ borderBlockStart: '1px solid', borderColor: 'divider', pt: { xs: 3, md: 4 } }}>
        {emptyBody}
      </Box>
    ) : (
      <Card variant='outlined' data-capture={dataCapture} data-ui-surface='contained'>
        <CardContent>{emptyBody}</CardContent>
      </Card>
    )
  }

  const coverageNote = GH_GROWTH_SEO_CLIENT.evolution.coverage(measuredDays, range.days)

  const body = (
    <Stack spacing={3}>
      <Box sx={{ pb: { xs: 2, sm: 2.5 }, borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'flex-start' }}
          justifyContent='space-between'
        >
        <Stack spacing={0.75}>
          <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography variant='h5' component='h2'>
              {GH_GROWTH_SEO_CLIENT.evolution.title}
            </Typography>
            <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              · {featuredSeries.length} destacadas
            </Typography>
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.evolution.subtitle}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {coverageNote} · {range.from} — {range.to}
          </Typography>
        </Stack>
        <Stack
          spacing={0.35}
          sx={{
            minWidth: { sm: 154 },
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            px: { xs: 0, sm: 1 },
            py: 0
          }}
        >
          <Typography variant='caption' color='text.secondary'>
            Cobertura del rango
          </Typography>
          <Typography variant='monoAmount' color='text.primary' sx={{ lineHeight: 1 }}>
            {coveragePercent}%
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {measuredDays} cortes
          </Typography>
        </Stack>
        <Button
          variant='text'
          size='small'
          onClick={() => setShowTable(current => !current)}
          aria-expanded={showTable}
          aria-controls={`${dataCapture}-table-panel`}
          sx={theme => ({
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            color: 'primary.dark',
            bgcolor: 'background.paper',
            px: 0.5,
            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            '&:focus-visible, &:focus': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
          })}
        >
          {showTable ? GH_GROWTH_SEO_CLIENT.evolution.hideTableLabel : GH_GROWTH_SEO_CLIENT.evolution.tableLabel}
        </Button>
        </Stack>
      </Box>

      {isSparse ? (
        <Box
          sx={theme => ({
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: 'action.hover'
          })}
        >
          <Stack spacing={2}>
            <Stack direction='row' spacing={1.25} alignItems='flex-start' sx={{ minWidth: 0 }}>
              <Box component='i' className='tabler-info-circle' aria-hidden='true' sx={{ mt: 0.2, flexShrink: 0, fontSize: 18, color: 'text.secondary' }} />
              <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                <Typography variant='subtitle2' color='text.primary' fontWeight={800}>
                  {GH_GROWTH_SEO_CLIENT.evolution.sparseTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ textWrap: 'pretty' }}>
                  {GH_GROWTH_SEO_CLIENT.evolution.sparseNote(measuredDays, range.days)}
                </Typography>
              </Stack>
            </Stack>

            <Box
              component='ol'
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `repeat(${Math.max(1, observedSnapshots.length)}, minmax(0, 1fr))` },
                gap: 1.5,
                listStyle: 'none',
                p: 0,
                m: 0
              }}
            >
              {observedSnapshots.map((snapshot, index) => (
                <Stack
                  key={snapshot.date}
                  component='li'
                  direction={{ xs: 'row', md: 'column' }}
                  spacing={{ xs: 1.5, md: 0.75 }}
                  alignItems={{ xs: 'baseline', md: 'flex-start' }}
                  sx={{
                    minWidth: 0,
                    px: { xs: 0, md: 1.5 },
                    py: { xs: 1.1, md: 0.75 },
                    borderInlineStart: { md: index === 0 ? 'none' : '1px solid' },
                    borderColor: 'action.hover'
                  }}
                >
                  <Typography variant='caption' color='text.secondary' sx={{ minInlineSize: { xs: 54, md: 'auto' }, fontVariantNumeric: 'tabular-nums' }}>
                    {formatDateLabel(snapshot.date)}
                  </Typography>
                  <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                    <Typography variant='subtitle2' color='text.primary' fontWeight={800} noWrap title={snapshot.keyword ?? undefined}>
                      {snapshot.position === null ? GH_GROWTH_SEO_CLIENT.evolution.noMeasurement : `Posición ${formatRank(snapshot.position)}`}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' noWrap title={snapshot.keyword ?? undefined}>
                      {snapshot.keyword ?? `${snapshot.count} keywords medidas`}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Box>
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
          borderBlock: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction='row' spacing={1.25} alignItems='center' sx={{ minWidth: 0, px: { xs: 0, sm: 2 }, py: 2, borderInlineStart: { sm: 'none' } }}>
          <Box component='i' className='tabler-chart-line' aria-hidden='true' sx={{ flexShrink: 0, color: 'primary.main', fontSize: 22 }} />
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.evolution.latestLabel}
            </Typography>
            <Typography variant='body2' fontWeight={700} noWrap>
              {latestReading.date ?? range.to}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={0.25} sx={{ minWidth: 0, px: { xs: 0, sm: 2 }, py: 2, borderBlockStart: { xs: '1px solid', sm: 'none' }, borderInlineStart: { sm: '1px solid' }, borderColor: 'divider' }}>
          <Typography variant='caption' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.evolution.bestPositionLabel}
          </Typography>
          <Typography variant='body2' fontWeight={700} noWrap sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {latestReading.keyword && latestReading.position !== undefined
              ? GH_GROWTH_SEO_CLIENT.evolution.bestPosition(latestReading.keyword, formatRank(latestReading.position))
              : GH_GROWTH_SEO_CLIENT.evolution.noMeasurement}
          </Typography>
        </Stack>
        <Stack spacing={0.65} sx={{ minWidth: 0, px: { xs: 0, sm: 2 }, py: 2, borderBlockStart: { xs: '1px solid', sm: 'none' }, borderInlineStart: { sm: '1px solid' }, borderColor: 'divider' }}>
          <Stack direction='row' justifyContent='space-between' spacing={1}>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.evolution.coverageProgress(measuredDays, range.days)}
            </Typography>
            <Typography variant='caption' fontWeight={700} color='text.primary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {coveragePercent}%
            </Typography>
          </Stack>
          <Box sx={{ blockSize: 4, bgcolor: 'divider', overflow: 'hidden' }}>
            <motion.div
              initial={prefersReduced ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.extended }}
              style={{ blockSize: '100%', inlineSize: `${coveragePercent}%`, transformOrigin: 'left center', background: 'var(--mui-palette-text-primary)' }}
            />
          </Box>
        </Stack>
      </Box>

      {!isSparse ? (
        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            {GH_GROWTH_SEO_CLIENT.evolution.featuredNote(featuredSeries.length, series.length)}
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            flexWrap='wrap'
            useFlexGap
            role='group'
            aria-label={GH_GROWTH_SEO_CLIENT.evolution.ariaKeywords}
          >
            {featuredSeries.map((serie, index) => {
              const hidden = hiddenKeywords.has(serie.keyword)
              const color = seriesColors[index % seriesColors.length]

              return (
                <ButtonBase
                  key={serie.keyword}
                  component='button'
                  type='button'
                  aria-pressed={!hidden}
                  onClick={() => {
                    setHiddenKeywords(current => {
                      const next = new Set(current)

                      if (next.has(serie.keyword)) {
                        next.delete(serie.keyword)
                      } else if (next.size < featuredSeries.length - 1) {
                        next.add(serie.keyword)
                      }

                      return next
                    })
                  }}
                  sx={theme => ({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.9,
                    maxWidth: '100%',
                    minHeight: 36,
                    minWidth: { xs: 44, sm: 0 },
                    px: 0.5,
                    py: 1,
                    color: hidden ? 'text.disabled' : 'text.primary',
                    bgcolor: 'transparent',
                    transition: theme.transitions.create(['background-color', 'color', 'transform'], { duration: theme.transitions.duration.shorter }),
                    '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
                  })}
                >
                  <Box
                    aria-hidden='true'
                    sx={{
                      inlineSize: 18,
                      blockSize: 0,
                      flexShrink: 0,
                      borderBlockStart: `2px ${index % 2 === 0 ? 'solid' : 'dashed'} ${color}`,
                      opacity: hidden ? 0.45 : 1
                    }}
                  />
                  <Typography variant='caption' color={hidden ? 'text.secondary' : 'text.primary'} noWrap sx={{ maxWidth: { xs: 180, sm: 220 }, textDecoration: hidden ? 'line-through' : 'none' }}>
                    {serie.keyword}
                  </Typography>
                </ButtonBase>
              )
            })}
          </Stack>
        </Stack>
      ) : null}

      {!isSparse ? (
        <Stack
          component='figure'
          spacing={1}
          sx={theme => ({
            m: 0,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: 'background.paper',
            boxShadow: 'inset 0 1px 0 var(--mui-palette-action-hover)'
          })}
        >
          <Stack component='figcaption' id={`${dataCapture}-chart-caption`} spacing={0.25}>
            <Typography variant='subtitle2' color='text.primary' fontWeight={700}>
              {GH_GROWTH_SEO_CLIENT.evolution.chartStageLabel}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.evolution.observedScope(chartDays, measuredDays, range.days)}
            </Typography>
          </Stack>
          <Box role='img' aria-labelledby={`${dataCapture}-chart-caption`} sx={{ minInlineSize: 0 }}>
            <AppECharts option={option} height={280} boxProps={{ minWidth: 0 }} />
          </Box>
        </Stack>
      ) : null}

      <AnimatePresence initial={false} mode='wait'>
        {showTable ? (
          <motion.div
            key='seo-evolution-table'
            id={`${dataCapture}-table-panel`}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.standard }}
          >
            <Stack spacing={1}>
              <Typography variant='caption' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.evolution.tableScrollHint}
              </Typography>
              <Box sx={{ display: { xs: 'block', sm: 'none' }, borderBlock: '1px solid', borderColor: 'divider' }}>
                {dates.map(date => (
                  <Stack key={date} component='section' spacing={1} sx={{ py: 1.5, borderBlockEnd: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='subtitle2' component='h3' color='text.primary' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {date}
                    </Typography>
                    <Stack component='ul' spacing={0.75} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label={`${GH_GROWTH_SEO_CLIENT.evolution.ariaTable} · ${date}`}>
                      {featuredSeries.map((serie, index) => {
                        const point = serie.points.find(candidate => candidate.date === date)
                        const color = seriesColors[index % seriesColors.length]

                        return (
                          <Stack key={serie.keyword} component='li' direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ minWidth: 0 }}>
                            <Stack direction='row' alignItems='center' spacing={0.9} sx={{ minWidth: 0 }}>
                              <Box aria-hidden='true' sx={{ inlineSize: 16, borderBlockStart: `2px ${index % 2 === 0 ? 'solid' : 'dashed'} ${color}`, flexShrink: 0 }} />
                              <Typography variant='body2' noWrap title={serie.keyword}>
                                {serie.keyword}
                              </Typography>
                            </Stack>
                            <Typography variant='body2' color={point?.position === null || point === undefined ? 'text.secondary' : 'text.primary'} fontWeight={600} sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                              {formatRank(point?.position ?? null)}
                            </Typography>
                          </Stack>
                        )
                      })}
                    </Stack>
                  </Stack>
                ))}
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <DataTableShell
                  identifier={`${dataCapture}-table`}
                  ariaLabel={GH_GROWTH_SEO_CLIENT.evolution.ariaTable}
                  density='comfortable'
                  stickyFirstColumn
                  containerSx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                    '& > [role="region"]': { scrollbarGutter: 'stable', overscrollBehavior: 'contain' },
                    '& .MuiTableCell-root': { borderColor: 'divider' },
                    '& thead .MuiTableCell-root': {
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                      fontWeight: 700,
                      borderBottomWidth: 2,
                      whiteSpace: 'nowrap'
                    },
                    '& tbody .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'transparent' },
                    '& tbody .MuiTableRow-root:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Table size='small' stickyHeader aria-label={GH_GROWTH_SEO_CLIENT.evolution.ariaTable} sx={{ minWidth: '100%', '& caption': { captionSide: 'top', textAlign: 'start', color: 'text.secondary', py: 1 } }}>
                    <caption>{GH_GROWTH_SEO_CLIENT.evolution.ariaTable}</caption>
                    <TableHead>
                      <TableRow>
                        <TableCell scope='col'>{GH_GROWTH_SEO_CLIENT.evolution.tableDateHeader}</TableCell>
                        {featuredSeries.map(serie => (
                          <TableCell key={serie.keyword} align='right' scope='col'>
                            <Typography variant='caption' color='text.primary' fontWeight={700} noWrap title={serie.keyword}>
                              {serie.keyword}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dates.map(date => (
                        <TableRow key={date} hover>
                          <TableCell scope='row' sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            <Typography variant='body2' fontWeight={600} noWrap>
                              {date}
                            </Typography>
                          </TableCell>
                          {featuredSeries.map(serie => {
                            const point = serie.points.find(candidate => candidate.date === date)

                            return (
                              <TableCell key={serie.keyword} align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                <Typography variant='body2' color={point?.position === null || point === undefined ? 'text.secondary' : 'text.primary'}>
                                  {formatRank(point?.position ?? null)}
                                </Typography>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableShell>
              </Box>
            </Stack>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Stack>
  )

  return surface === 'open' ? (
    <Box data-capture={dataCapture} data-ui-surface='open' sx={{ borderBlockStart: '1px solid', borderColor: 'divider', pt: { xs: 3, md: 4 } }}>
      {body}
    </Box>
  ) : (
    <Card
      elevation={0}
      data-capture={dataCapture}
      data-ui-surface='contained'
      sx={theme => ({
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        bgcolor: 'background.paper',
        boxShadow: theme.greenhouseElevation.raised.boxShadow
      })}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4 }, '&:last-child': { pb: { xs: 2.5, sm: 3, md: 4 } } }}>{body}</CardContent>
    </Card>
  )
}

export default SeoRankEvolutionChart
