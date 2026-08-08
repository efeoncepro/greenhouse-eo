'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { EChartsOption } from 'echarts'

import { getChartTypographyFromTheme } from '@/components/theme/chart-typography'
import { MOTION_DURATION_MS } from '@/components/greenhouse/motion/core/tokens'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import type { SeoAeoGapResult, SeoAeoQuadrant } from '@/lib/growth/seo/contracts'
import useReducedMotion from '@/hooks/useReducedMotion'
import AppECharts from '@/libs/styles/AppECharts'
import { resolveChartColor } from '@/libs/styles/resolveApexColor'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'

type SeoAeoGapReady = Extract<SeoAeoGapResult, { ok: true }>

export interface SeoAeoQuadrantProps {
  gap: SeoAeoGapReady | null
  dataCapture?: string
  surface?: 'contained' | 'open'
}

const quadrantOrder: SeoAeoQuadrant[] = ['dominante', 'riesgo', 'oportunidad', 'invisible']
const tablePriority: SeoAeoQuadrant[] = ['invisible', 'riesgo', 'oportunidad', 'dominante']

const QUADRANT_ICONS: Record<SeoAeoQuadrant, string> = {
  dominante: 'tabler-circle-check',
  riesgo: 'tabler-alert-triangle',
  oportunidad: 'tabler-bulb',
  invisible: 'tabler-eye-off'
}

const QUADRANT_SYMBOLS: Record<SeoAeoQuadrant, 'circle' | 'diamond' | 'triangle' | 'rect'> = {
  dominante: 'circle',
  riesgo: 'diamond',
  oportunidad: 'triangle',
  invisible: 'rect'
}

const QUADRANT_COLOR_SOURCE: Record<SeoAeoQuadrant, string> = {
  dominante: GH_COLORS.role.development.textDark,
  riesgo: GH_COLORS.role.design.textDark,
  oportunidad: GH_COLORS.role.strategy.source,
  invisible: GH_COLORS.role.account.source
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const SeoAeoQuadrant = ({ gap, dataCapture = 'seo-client-quadrant', surface = 'contained' }: SeoAeoQuadrantProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [showAllRows, setShowAllRows] = useState(false)
  const chartTypography = getChartTypographyFromTheme(theme)

  const axisInk = resolveChartColor(theme.palette.text.secondary, '#6B6876')
  const gridInk = resolveChartColor(theme.palette.divider, '#DBDBDB')
  const paperInk = resolveChartColor(theme.palette.background.paper, '#FFFFFF')

  const quadrantInk = useMemo<Record<SeoAeoQuadrant, string>>(
    () => ({
      dominante: resolveChartColor(QUADRANT_COLOR_SOURCE.dominante, '#025199'),
      riesgo: resolveChartColor(QUADRANT_COLOR_SOURCE.riesgo, '#82113A'),
      oportunidad: resolveChartColor(QUADRANT_COLOR_SOURCE.oportunidad, '#633F93'),
      invisible: resolveChartColor(QUADRANT_COLOR_SOURCE.invisible, '#023C70')
    }),
    []
  )

  const quadrantWash = useMemo<Record<SeoAeoQuadrant, string>>(
    () => ({
      dominante: alpha(QUADRANT_COLOR_SOURCE.dominante, theme.palette.mode === 'dark' ? 0.16 : 0.075),
      riesgo: alpha(QUADRANT_COLOR_SOURCE.riesgo, theme.palette.mode === 'dark' ? 0.15 : 0.07),
      oportunidad: alpha(QUADRANT_COLOR_SOURCE.oportunidad, theme.palette.mode === 'dark' ? 0.16 : 0.075),
      invisible: alpha(QUADRANT_COLOR_SOURCE.invisible, theme.palette.mode === 'dark' ? 0.13 : 0.055)
    }),
    [theme.palette.mode]
  )

  const quadrantCounts = useMemo(() => {
    const counts = quadrantOrder.reduce<Record<SeoAeoQuadrant, number>>(
      (accumulator, quadrant) => ({ ...accumulator, [quadrant]: 0 }),
      { dominante: 0, riesgo: 0, oportunidad: 0, invisible: 0 }
    )

    gap?.quadrants.forEach(entry => {
      counts[entry.quadrant] += 1
    })

    return counts
  }, [gap])

  const prioritizedRows = useMemo(() => {
    if (!gap) return []

    return [...gap.quadrants].sort((left, right) => {
      const priorityDelta = tablePriority.indexOf(left.quadrant) - tablePriority.indexOf(right.quadrant)

      return priorityDelta || left.rankPosition - right.rankPosition
    })
  }, [gap])

  const visibleRows = showAllRows ? prioritizedRows : prioritizedRows.slice(0, 8)

  const dominantQuadrant = useMemo(
    () =>
      quadrantOrder.reduce<SeoAeoQuadrant>(
        (current, quadrant) => (quadrantCounts[quadrant] > quadrantCounts[current] ? quadrant : current),
        'dominante'
      ),
    [quadrantCounts]
  )

  const option = useMemo<EChartsOption>(() => {
    if (!gap) return {}

    const maxRank = Math.ceil(Math.max(20, ...gap.quadrants.map(entry => entry.rankPosition)) + 1)

    return {
      animation: !prefersReduced,
      animationDuration: MOTION_DURATION_MS.long,
      aria: {
        enabled: true,
        label: {
          description: `${GH_GROWTH_SEO_CLIENT.quadrant.title}. ${GH_GROWTH_SEO_CLIENT.quadrant.orthogonal}`
        }
      },
      grid: { left: 52, right: 24, top: 24, bottom: 56, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: paperInk,
        borderColor: gridInk,
        textStyle: { ...chartTypography.tooltip, color: theme.palette.text.primary },
        formatter: (params: unknown) => {
          const point = (params as { data?: { value?: [number, number]; name?: string; quadrant?: SeoAeoQuadrant } }).data
          const values = point?.value ?? [null, null]
          const label = point?.quadrant ? GH_GROWTH_SEO_CLIENT.quadrant.labels[point.quadrant] : ''

          return `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(point?.name ?? '')}</div><div>${escapeHtml(GH_GROWTH_SEO_CLIENT.quadrant.tableAeo)} <b>${values[0]}</b></div><div>${escapeHtml(GH_GROWTH_SEO_CLIENT.quadrant.tableSeo)} <b>${values[1]}</b></div><div style="margin-top:6px">${escapeHtml(label)}</div>`
        }
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: GH_GROWTH_SEO_CLIENT.quadrant.xAxis,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { ...chartTypography.title, color: axisInk },
        axisLine: { lineStyle: { color: gridInk } },
        axisLabel: { ...chartTypography.axisLabel, color: axisInk },
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: 1,
        max: maxRank,
        name: GH_GROWTH_SEO_CLIENT.quadrant.yAxis,
        nameLocation: 'middle',
        nameGap: 38,
        nameTextStyle: { ...chartTypography.title, color: axisInk },
        axisLine: { lineStyle: { color: gridInk } },
        axisLabel: { ...chartTypography.axisLabel, color: axisInk },
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 17,
          data: gap.quadrants.map(entry => ({
            name: entry.keyword,
            value: [entry.aeoScore, entry.rankPosition],
            quadrant: entry.quadrant,
            symbol: QUADRANT_SYMBOLS[entry.quadrant],
            itemStyle: {
              color: quadrantInk[entry.quadrant],
              borderColor: paperInk,
              borderWidth: 2,
              shadowColor: quadrantInk[entry.quadrant],
              shadowBlur: 6
            }
          })),
          emphasis: {
            focus: 'self',
            scale: 1.5,
            itemStyle: { borderWidth: 3, shadowBlur: 0 }
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: axisInk, type: 'dashed', width: 1.25 },
            data: [{ xAxis: 50 }, { yAxis: 10 }]
          },
          markArea: {
            silent: true,
            itemStyle: { opacity: 1 },
            label: {
              show: true,
              color: axisInk,
              fontFamily: chartTypography.fontFamily,
              fontSize: chartTypography.dataLabel.fontSize,
              fontWeight: 700,
              position: 'insideTopLeft'
            },
            data: quadrantOrder.map(quadrant => {
              const bounds: Record<SeoAeoQuadrant, [{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }]> = {
                dominante: [{ xAxis: 50, yAxis: 1 }, { xAxis: 100, yAxis: 10 }],
                riesgo: [{ xAxis: 0, yAxis: 1 }, { xAxis: 50, yAxis: 10 }],
                oportunidad: [{ xAxis: 50, yAxis: 10 }, { xAxis: 100, yAxis: maxRank }],
                invisible: [{ xAxis: 0, yAxis: 10 }, { xAxis: 50, yAxis: maxRank }]
              }

              return [
                {
                  name: GH_GROWTH_SEO_CLIENT.quadrant.labels[quadrant],
                  ...bounds[quadrant][0],
                  itemStyle: { color: quadrantWash[quadrant] }
                },
                bounds[quadrant][1]
              ]
            })
          }
        }
      ]
    }
  }, [axisInk, chartTypography, gap, gridInk, paperInk, prefersReduced, quadrantInk, quadrantWash, theme.palette.text.primary])

  if (!gap) {
    return (
      <Box
        data-capture={dataCapture}
        data-ui-surface={surface}
        sx={surface === 'open' ? { borderBlockStart: '1px solid', borderColor: 'divider', pt: { xs: 3, md: 4 } } : theme => ({
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: `${theme.shape.customBorderRadius.xl}px`,
          p: { xs: 3, md: 4 },
          bgcolor: 'background.paper'
        })}
      >
          <EmptyState
            icon='tabler-star-off'
            title={GH_GROWTH_SEO_CLIENT.quadrant.states.emptyTitle}
            description={GH_GROWTH_SEO_CLIENT.quadrant.states.emptyDescription}
          />
      </Box>
    )
  }

  const label = GH_GROWTH_SEO_CLIENT.quadrant.labels[gap.domainQuadrant]
  const dominantLabel = GH_GROWTH_SEO_CLIENT.quadrant.labels[dominantQuadrant]

  return (
    <Box
      data-capture={dataCapture}
      data-ui-surface={surface}
      sx={surface === 'open' ? { borderBlockStart: '1px solid', borderColor: 'divider', pt: { xs: 3, md: 4 } } : theme => ({
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        p: { xs: 3, md: 4 },
        bgcolor: 'background.paper',
        boxShadow: theme.greenhouseElevation.raised.boxShadow
      })}
    >
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ sm: 'flex-start' }}>
            <Stack spacing={0.75}>
              <Typography variant='overline' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.quadrant.eyebrow}
              </Typography>
              <Typography variant='h5' component='h2'>
                {GH_GROWTH_SEO_CLIENT.quadrant.title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.quadrant.subtitle}
              </Typography>
            </Stack>
            <Stack spacing={1} alignItems={{ sm: 'flex-end' }}>
              <Typography variant='monoAmount' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.quadrant.pointCount(gap.quadrants.length)}
              </Typography>
              <Button
                href='/aeo'
                variant='text'
                size='small'
                startIcon={<i className='tabler-star' aria-hidden='true' />}
                sx={theme => ({ alignSelf: { xs: 'flex-start', sm: 'flex-end' }, color: 'primary.dark', px: 0.5, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }, '&:focus-visible, &:focus': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 } })}
              >
                {GH_GROWTH_SEO_CLIENT.page.viewAeo}
              </Button>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'stretch' }}
            sx={{ borderBlock: '1px solid', borderColor: 'divider', py: 1.5 }}
          >
            <Stack
              direction='row'
              spacing={1.25}
              alignItems='center'
              sx={{
                minWidth: 0,
                flex: 1,
                pr: { sm: 2 },
                borderInlineEnd: { sm: '1px solid' },
                borderColor: 'divider'
              }}
            >
              <Box
                aria-hidden='true'
                sx={{ display: 'grid', placeItems: 'center', flexShrink: 0, color: 'text.secondary', fontSize: '1.35rem' }}
              >
                <i className={QUADRANT_ICONS[gap.domainQuadrant]} aria-hidden='true' style={{ color: quadrantInk[gap.domainQuadrant] }} />
              </Box>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_GROWTH_SEO_CLIENT.quadrant.domain}
                </Typography>
                <Typography variant='body2' fontWeight={700}>
                  {GH_GROWTH_SEO_CLIENT.quadrant.domainQuadrant(label)}
                </Typography>
              </Stack>
            </Stack>
            <Stack
              direction='row'
              spacing={1.25}
              alignItems='center'
              sx={theme => ({
                minWidth: 0,
                flex: 1.35,
                px: { xs: 0, sm: 1.5 },
                py: { xs: 1.25, sm: 0 },
                color: 'text.primary',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                bgcolor: 'background.paper'
              })}
            >
              <Box
                component='i'
                className={QUADRANT_ICONS[dominantQuadrant]}
                aria-hidden='true'
                sx={{ flexShrink: 0, color: quadrantInk[dominantQuadrant], fontSize: 20 }}
              />
              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography variant='body2' color='text.primary' fontWeight={800}>
                  {GH_GROWTH_SEO_CLIENT.quadrant.dominantInsight(dominantLabel, quadrantCounts[dominantQuadrant], gap.quadrants.length)}
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ textWrap: 'pretty' }}>
                  {GH_GROWTH_SEO_CLIENT.quadrant.dominantAction[dominantQuadrant]}
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Stack spacing={1.25} role='group' aria-label={GH_GROWTH_SEO_CLIENT.quadrant.ariaLegend}>
            <Typography variant='overline' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.quadrant.distributionTitle}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                borderBlock: '1px solid',
                borderColor: 'action.hover'
              }}
            >
              {quadrantOrder.map((quadrant, index) => (
                  <Box
                    key={quadrant}
                    sx={{
                      minWidth: 0,
                      borderInlineStart: {
                        xs: index % 2 === 0 ? 'none' : '1px solid',
                        md: index === 0 ? 'none' : '1px solid'
                      },
                      borderBlockStart: {
                        xs: index < 2 ? 'none' : '1px solid',
                        md: 'none'
                      },
                      borderColor: 'action.hover',
                      px: { xs: 1.25, sm: 1.5 },
                      py: 1.25,
                      bgcolor: 'transparent'
                    }}
                  >
                    <Stack direction='row' spacing={0.9} alignItems='center' sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'grid', placeItems: 'center', flexShrink: 0, color: quadrantInk[quadrant] }} aria-hidden='true'>
                        <i className={QUADRANT_ICONS[quadrant]} />
                      </Box>
                      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                        <Typography variant='caption' color='text.secondary' noWrap>
                          {GH_GROWTH_SEO_CLIENT.quadrant.labels[quadrant]}
                        </Typography>
                        <Typography variant='subtitle2' fontWeight={700} color='text.primary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {quadrantCounts[quadrant]}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
            </Box>
          </Stack>

          <Stack
            component='figure'
            spacing={1}
            sx={theme => ({
              order: { xs: 3, md: 3 },
              m: 0,
              p: { xs: 1.5, sm: 2, md: 2.5 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.action.hover, 0.32)} 100%)`,
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.05 : 0.82)}`
            })}
          >
            <Stack component='figcaption' id={`${dataCapture}-chart-caption`} spacing={0.25} sx={{ px: 0.5 }}>
              <Typography variant='overline' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.quadrant.chartStageLabel}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.quadrant.orthogonal}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ textWrap: 'pretty' }}>
                <Box component='span' sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {GH_GROWTH_SEO_CLIENT.quadrant.granularityLabel}
                </Box>
                {' · '}
                {GH_GROWTH_SEO_CLIENT.quadrant.granularityHint}
              </Typography>
            </Stack>
            <Box role='img' aria-labelledby={`${dataCapture}-chart-caption`} sx={{ minInlineSize: 0 }}>
              <AppECharts option={option} height={270} boxProps={{ minWidth: 0 }} />
            </Box>
          </Stack>

          <Stack spacing={0.5}>
            <Box sx={{ display: 'none' }} />
          </Stack>

          <Stack spacing={1} sx={{ order: { xs: 4, md: 4 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='space-between' alignItems={{ sm: 'center' }}>
              <Stack spacing={0.25}>
                <Typography variant='subtitle2' color='text.primary' fontWeight={700}>
                  {GH_GROWTH_SEO_CLIENT.quadrant.tableExcerpt(visibleRows.length, prioritizedRows.length)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_CLIENT.quadrant.tableScrollHint}
                </Typography>
              </Stack>
              {prioritizedRows.length > 8 ? (
                <Button
                  variant='text'
                  size='small'
                  onClick={() => setShowAllRows(current => !current)}
                  aria-expanded={showAllRows}
                  aria-controls={`${dataCapture}-table-panel`}
                  endIcon={<i className={showAllRows ? 'tabler-chevron-up' : 'tabler-chevron-down'} aria-hidden='true' />}
                  sx={theme => ({ alignSelf: { xs: 'flex-start', sm: 'auto' }, color: 'primary.dark', px: 0.5, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }, '&:focus-visible, &:focus': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 } })}
                >
                  {showAllRows ? GH_GROWTH_SEO_CLIENT.quadrant.tableHideAll : GH_GROWTH_SEO_CLIENT.quadrant.tableShowAll(prioritizedRows.length)}
                </Button>
              ) : null}
            </Stack>
            <Box id={`${dataCapture}-table-panel`}>
              <Stack
                component='ul'
                spacing={0}
                sx={theme => ({
                  listStyle: 'none',
                  p: 0,
                  m: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.74)}`
                })}
                aria-label={GH_GROWTH_SEO_CLIENT.quadrant.ariaTable}
              >
                <Box
                  aria-hidden='true'
                  sx={theme => ({
                    display: { xs: 'none', sm: 'grid' },
                    gridTemplateColumns: 'minmax(220px, 1fr) 92px 92px 150px',
                    columnGap: 1.5,
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.025),
                    borderBlockEnd: '1px solid',
                    borderColor: 'divider'
                  })}
                >
                  <Typography variant='caption' color='text.secondary' fontWeight={700}>
                    {GH_GROWTH_SEO_CLIENT.quadrant.tableKeyword}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' fontWeight={700} textAlign='end'>
                    {GH_GROWTH_SEO_CLIENT.quadrant.tableSeo}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' fontWeight={700} textAlign='end'>
                    {GH_GROWTH_SEO_CLIENT.quadrant.tableAeo}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' fontWeight={700}>
                    {GH_GROWTH_SEO_CLIENT.quadrant.tableReading}
                  </Typography>
                </Box>
                {visibleRows.map(entry => (
                    <Box
                      key={`${entry.keyword}-${entry.quadrant}`}
                      component='li'
                      sx={theme => ({
                        display: 'grid',
                        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(220px, 1fr) 92px 92px 150px' },
                        columnGap: { xs: 1, sm: 1.5 },
                        rowGap: 0.5,
                        alignItems: 'center',
                        minWidth: 0,
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 1.35, sm: 1.15 },
                        borderBlockEnd: '1px solid',
                        borderColor: 'divider',
                        transition: `background-color ${MOTION_DURATION_MS.short}ms ease, transform ${MOTION_DURATION_MS.short}ms ease`,
                        '&:last-of-type': { borderBlockEnd: 0 },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.025),
                          transform: 'translateY(-1px)'
                        }
                      })}
                    >
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ minWidth: 0 }}>
                        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                          <Typography variant='body2' fontWeight={700} noWrap title={entry.keyword}>
                            {entry.keyword}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: { xs: 'block', sm: 'none' }, fontVariantNumeric: 'tabular-nums' }}
                          >
                            SEO {entry.rankPosition.toFixed(1)} · AEO dominio {entry.aeoScore.toFixed(0)}
                          </Typography>
                        </Stack>
                      </Stack>
                      {[
                        entry.rankPosition.toFixed(1),
                        entry.aeoScore.toFixed(0)
                      ].map((value, valueIndex) => (
                        <Box
                          key={`${entry.keyword}-${valueIndex === 0 ? 'seo' : 'aeo'}`}
                          sx={theme => ({
                            display: { xs: 'none', sm: 'inline-grid' },
                            justifySelf: 'end',
                            minInlineSize: 58,
                            px: 1,
                            py: 0.45,
                            border: '1px solid',
                            borderColor: 'action.hover',
                            borderRadius: 999,
                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.05 : 0.018),
                            textAlign: 'center'
                          })}
                        >
                          <Typography variant='caption' color='text.primary' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {value}
                          </Typography>
                        </Box>
                      ))}
                      <Stack
                        direction='row'
                        spacing={0.7}
                        alignItems='center'
                        sx={theme => ({
                          justifySelf: { xs: 'end', sm: 'start' },
                          flexShrink: 0,
                          color: quadrantInk[entry.quadrant],
                          whiteSpace: 'nowrap',
                          px: { xs: 0, sm: 0.75 },
                          py: { xs: 0, sm: 0.35 },
                          borderRadius: 999,
                          bgcolor: { xs: 'transparent', sm: quadrantWash[entry.quadrant] },
                          border: { xs: 'none', sm: '1px solid' },
                          borderColor: { xs: 'transparent', sm: alpha(QUADRANT_COLOR_SOURCE[entry.quadrant], theme.palette.mode === 'dark' ? 0.32 : 0.18) }
                        })}
                      >
                        <i className={QUADRANT_ICONS[entry.quadrant]} aria-hidden='true' />
                        <Typography variant='caption' color='inherit' fontWeight={700}>
                          {GH_GROWTH_SEO_CLIENT.quadrant.labels[entry.quadrant]}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
              </Stack>
            </Box>
          </Stack>

          <Stack spacing={0.5} sx={{ order: { xs: 5, md: 5 } }}>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.quadrant.measured}
            </Typography>
          </Stack>
        </Stack>
    </Box>
  )
}

export default SeoAeoQuadrant
