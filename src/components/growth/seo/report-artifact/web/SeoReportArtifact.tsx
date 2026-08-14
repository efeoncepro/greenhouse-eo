'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import BrandWordmark from '@/components/greenhouse/BrandWordmark'
import EmptyState from '@/components/greenhouse/EmptyState'
import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'
import SeoPrimaryMetric from '@/components/growth/seo/SeoPrimaryMetric'
import { SignalStrip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import type { ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import {
  resolveCoverageTone,
  resolveOpportunityTone,
  resolvePositionTone,
  resolveSeoLeadTitle
} from '@/lib/growth/seo/client/resolve-seo-metric-signal'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import SeoAeoQuadrant from '@/views/greenhouse/growth/seo/client/SeoAeoQuadrant'
import SeoRankEvolutionChart from '@/views/greenhouse/growth/seo/client/SeoRankEvolutionChart'

export interface SeoReportArtifactProps {
  model: ReportArtifactModel
}

const formatPosition = (value: number | null): string => (value === null ? 'Sin dato' : `#${value.toFixed(1)}`)

const SeoReportArtifact = ({ model }: SeoReportArtifactProps) => {
  const seo = model.surface?.kind === 'seo' ? model.surface.seo : null
  const prefersReduced = useReducedMotion()

  if (!seo) {
    return (
      <EmptyState
        icon='tabler-file-off'
        title={GH_GROWTH_SEO_CLIENT.report.errorTitle}
        description={GH_GROWTH_SEO_CLIENT.report.errorDescription}
      />
    )
  }

  const reportDate = seo.asOfDate ?? 'Sin fecha de corte'
  const rankSeries = seo.rankEvolution
  const positionTone = resolvePositionTone(seo.summary.positionAverage)
  const coverageTone = resolveCoverageTone(seo.summary.pageOneCount, seo.summary.keywordCount)
  const opportunityTone = resolveOpportunityTone(seo.summary.opportunityCount)

  return (
    <Box
      component='article'
      aria-label={`${GH_GROWTH_SEO_CLIENT.report.title} — ${seo.organizationName}`}
      data-capture='seo-client-report'
      data-surface-recipe='analyticsReport'
      data-ui-surface='open'
      sx={{
        minWidth: 0,
        overflowX: 'clip',
        paddingBlockStart: { xs: 'calc(var(--header-height, 54px) + 72px)', sm: 'calc(var(--header-height, 54px) + 24px)' },
        '& *': { minInlineSize: 0 }
      }}
    >
      <motion.div
        initial={prefersReduced ? false : { y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.standard, ease: MOTION_EASE.emphasized.cubicBezier ? [...MOTION_EASE.emphasized.cubicBezier] : undefined }}
        style={{ minWidth: 0 }}
      >
        <Stack spacing={{ xs: 4, md: 6 }}>
        <Stack
          spacing={3}
          data-ui-surface='open'
          sx={theme => ({
            borderBlockEnd: '1px solid',
            borderColor: 'divider',
            borderInlineStart: `3px solid ${theme.palette.primary.main}`,
            pb: { xs: 3, md: 4 },
            pl: { xs: 2, md: 3 }
          })}
        >
          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
            <BrandWordmark brand='efeonce' height={20} maxWidth={132} />
            <Chip size='small' variant='outlined' label={GH_GROWTH_SEO_CLIENT.report.reportMasthead} />
            <Button
              variant='outlined'
              size='small'
              // Hook estable para GVC: el label de este botón cambió con la auditoría premium
              // ("Descargar informe" → el nombre real del comportamiento) y los scenarios que lo
              // buscaban por texto quedaron rotos. La captura se ata al marker, no a la copy.
              data-capture='seo-report-print-trigger'
              startIcon={<i className='tabler-printer' aria-hidden='true' />}
              onClick={() => window.print()}
              sx={theme => ({
                color: theme.palette.primary.dark,
                borderColor: theme.palette.primary.dark,
                '&:hover': { color: theme.palette.primary.dark, borderColor: theme.palette.primary.dark },
                '&:focus-visible, &:focus': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
              })}
            >
              {GH_GROWTH_SEO_CLIENT.page.reportDownload}
            </Button>
          </Stack>
          <Stack spacing={1}>
            <Typography variant='overline' color='primary.dark'>
              {GH_GROWTH_SEO_CLIENT.report.eyebrow}
            </Typography>
            <Typography variant='surfaceHeroTitle' component='h1'>
              {GH_GROWTH_SEO_CLIENT.report.title}
            </Typography>
            <Typography variant='h5' component='p' color='text.primary'>
              {seo.organizationName}
            </Typography>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='body2' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.page.reportDate(reportDate)}
              </Typography>
              <Chip size='small' variant='outlined' color='success' label={seo.status === 'ready' ? GH_GROWTH_SEO_CLIENT.report.reportStatusReady : GH_GROWTH_SEO_CLIENT.report.reportStatusPartial} />
            </Stack>
            <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 720 }}>
              {GH_GROWTH_SEO_CLIENT.report.reportReadout}
            </Typography>
          </Stack>
        </Stack>

        <Card
          variant='outlined'
          data-ui-surface='contained'
          sx={theme => ({
            borderTopWidth: 3,
            borderTopColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.018),
            // Sin hover lift: el informe es un entregable que se lee y se reenvía, no un
            // control. Levantar la superficie al pasar el mouse promete una acción que no
            // existe (auditoría premium §6 "Motion objetivo": el hover resalta fila, serie
            // o link — nunca eleva cards).
            boxShadow: theme.greenhouseElevation.raised.boxShadow
          })}
        >
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='overline' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.report.eyebrow}
              </Typography>
              <Typography variant='h4' component='h2'>
                {resolveSeoLeadTitle(seo.summary.positionAverage)}
              </Typography>
              <SeoPrimaryMetric
                label={GH_GROWTH_SEO_CLIENT.report.metricPosition}
                signalLabel={GH_GROWTH_SEO_CLIENT.report.metricPositionSignal}
                value={formatPosition(seo.summary.positionAverage)}
                hint={GH_GROWTH_SEO_CLIENT.report.metricPositionHint}
                tone={positionTone}
                iconClassName={positionTone === 'error' ? 'tabler-trending-down' : 'tabler-trending-up'}
              />
              <Typography variant='body1' color='text.secondary'>
                {GH_GROWTH_SEO_CLIENT.report.summary}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <SignalStrip
          kind='insight'
          variant='narrative'
          density='full'
          dataCapture='seo-client-report-metric-strip'
          ariaLabel={GH_GROWTH_SEO_CLIENT.report.summaryAria}
          signals={[
            {
              id: 'keywords',
              label: GH_GROWTH_SEO_CLIENT.report.metricKeywordsSignal,
              value: seo.summary.keywordCount > 0 ? seo.summary.keywordCount : 'Sin dato',
              detail: GH_GROWTH_SEO_CLIENT.report.metricKeywordsHint,
              iconClassName: 'tabler-database',
              tone: 'info'
            },
            {
              id: 'page-one',
              label: GH_GROWTH_SEO_CLIENT.report.metricPageOneSignal,
              value: seo.summary.keywordCount > 0 ? seo.summary.pageOneCount : 'Sin dato',
              detail: GH_GROWTH_SEO_CLIENT.report.metricPageOneHint,
              iconClassName: 'tabler-chart-bar',
              tone: coverageTone === 'default' ? 'info' : coverageTone
            },
            {
              id: 'signals',
              label: GH_GROWTH_SEO_CLIENT.report.metricSignalsSignal,
              value: seo.summary.opportunityCount ?? 'Sin dato',
              detail: GH_GROWTH_SEO_CLIENT.report.metricSignalsHint,
              iconClassName: opportunityTone === 'warning' ? 'tabler-alert-triangle' : 'tabler-circle-check',
              tone: opportunityTone === 'default' ? 'info' : opportunityTone
            }
          ]}
        />

        {seo.gap ? <SeoAeoQuadrant gap={seo.gap} surface='open' dataCapture='seo-client-report-quadrant' /> : null}
        {rankSeries ? (
          <SeoRankEvolutionChart
            series={rankSeries.series}
            range={rankSeries.range}
            surface='open'
            dataCapture='seo-client-report-evolution'
          />
        ) : (
          <EmptyState
            icon='tabler-chart-line-off'
            title={GH_GROWTH_SEO_CLIENT.report.emptyTitle}
            description={GH_GROWTH_SEO_CLIENT.report.emptyDescription}
          />
        )}

        <Box
          data-ui-surface='band'
          sx={theme => ({
            borderBlockStart: '1px solid',
            borderColor: 'divider',
            borderInlineStart: `3px solid ${alpha(theme.palette.primary.main, 0.55)}`,
            pt: { xs: 2.5, md: 3 },
            pl: { xs: 2, md: 3 },
            color: theme.palette.text.primary
          })}
        >
          <Stack spacing={0.75}>
            <Typography variant='subtitle2' color='text.primary'>{GH_GROWTH_SEO_CLIENT.report.methodology}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_SEO_CLIENT.report.methodologyBody}
            </Typography>
          </Stack>
        </Box>
      </Stack>
      </motion.div>
    </Box>
  )
}

export default SeoReportArtifact
