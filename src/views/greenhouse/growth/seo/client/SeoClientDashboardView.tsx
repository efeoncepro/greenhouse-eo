'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import SeoPrimaryMetric from '@/components/growth/seo/SeoPrimaryMetric'
import { CompositionShell, GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { MOTION_DURATION_S, MOTION_EASE, motionCss } from '@/components/greenhouse/motion/core/tokens'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import type { SeoClientSurfaceRead } from '@/lib/growth/seo/client/read-seo-client-surface'
import { formatNumber } from '@/lib/format/number'
import { resolveOpportunityTone, resolvePositionTone } from '@/lib/growth/seo/client/resolve-seo-metric-signal'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

import SeoAeoQuadrant from './SeoAeoQuadrant'
import SeoRankEvolutionChart from './SeoRankEvolutionChart'

type SeoSection = 'summary' | 'evolution' | 'quadrant'

const SECTION_ORDER: SeoSection[] = ['summary', 'evolution', 'quadrant']

const sectionLabel = (section: SeoSection): string => {
  if (section === 'summary') return GH_GROWTH_SEO_CLIENT.navigator.summary
  if (section === 'evolution') return GH_GROWTH_SEO_CLIENT.navigator.evolution

  return GH_GROWTH_SEO_CLIENT.navigator.quadrant
}

const formatPosition = (value: number | null): string => (value === null ? GH_GROWTH_SEO_CLIENT.summary.noData : value.toFixed(1))

const SummaryEvidenceItem = ({
  label,
  value,
  detail,
  iconClassName
}: {
  label: string
  value: string
  detail: string
  iconClassName: string
}) => (
  <Stack
    spacing={0.75}
    sx={{
      minWidth: 0,
      p: { xs: 1.5, sm: 1.75 },
      borderBlockStart: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Stack direction='row' spacing={1} alignItems='center' sx={{ minWidth: 0 }}>
      <Box component='i' className={iconClassName} aria-hidden='true' sx={{ color: 'text.secondary', fontSize: 18, flexShrink: 0 }} />
      <Typography variant='caption' color='text.secondary' noWrap>
        {label}
      </Typography>
    </Stack>
    <Typography variant='h5' component='p' color='text.primary' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography variant='caption' color='text.secondary' sx={{ textWrap: 'pretty' }}>
      {detail}
    </Typography>
  </Stack>
)

const SummaryDetail = ({ surface, organizationName }: { surface: SeoClientSurfaceRead; organizationName: string }) => {
  const prefersReduced = useReducedMotion()
  const evolution = surface.rankEvolution?.ok ? surface.rankEvolution : null
  const gap = surface.gap?.ok ? surface.gap : null

  const summary = useMemo(() => {
    const latest = evolution
      ? evolution.series
          .map(serie => [...serie.points].reverse().find(point => point.position !== null)?.position ?? null)
          .filter((position): position is number => position !== null)
      : []

    const average = latest.length > 0 ? latest.reduce((sum, position) => sum + position, 0) / latest.length : null
    const pageOne = latest.filter(position => position <= 10).length
    const opportunities = gap?.quadrants.filter(entry => entry.quadrant !== 'dominante').length ?? null

    return {
      average: average === null ? null : Math.round(average * 10) / 10,
      keywordCount: evolution?.series.length ?? 0,
      pageOne,
      opportunities
    }
  }, [evolution, gap])

  const pageOneCoverage = summary.keywordCount > 0 ? Math.round((summary.pageOne / summary.keywordCount) * 100) : null
  const positionTone = resolvePositionTone(summary.average)
  const opportunityTone = resolveOpportunityTone(summary.opportunities)

  const leadTitle = summary.average === null
    ? GH_GROWTH_SEO_CLIENT.summary.leadTitle
    : GH_GROWTH_SEO_CLIENT.summary.titleWithPosition(formatPosition(summary.average))

  const actionItems = [
    { id: 'position', icon: 'tabler-shield-check', text: GH_GROWTH_SEO_CLIENT.summary.actionPosition },
    { id: 'coverage', icon: 'tabler-radar', text: GH_GROWTH_SEO_CLIENT.summary.actionCoverage },
    { id: 'aeo', icon: 'tabler-star', text: GH_GROWTH_SEO_CLIENT.summary.actionAeo }
  ] as const

  return (
    <Stack spacing={4} data-capture='seo-client-summary' sx={{ width: '100%', minWidth: 0, scrollMarginBlockStart: 'calc(var(--header-height, 54px) + 96px)' }}>
      <Box
        data-ui-surface='contained'
        sx={theme => ({
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: `${theme.shape.customBorderRadius.xl}px`,
          bgcolor: 'background.paper',
          boxShadow: theme.greenhouseElevation.raised.boxShadow
        })}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
            minWidth: 0
          }}
        >
          <Stack
            spacing={3}
            sx={{
              order: { xs: 1, md: 1 },
              p: { xs: 3, sm: 3.5, md: 4 },
              minWidth: 0
            }}
          >
            <Stack spacing={1}>
              <Typography variant='overline' color='text.primary'>
                {GH_GROWTH_SEO_CLIENT.summary.eyebrow}
              </Typography>
              <Typography
                variant='h4'
                component='h2'
                sx={{
                  fontSize: { xs: '1.45rem !important', sm: '1.75rem !important', md: '1.9rem !important' },
                  lineHeight: 1.14,
                  letterSpacing: '-0.025em',
                  textWrap: 'balance',
                  maxInlineSize: 700
                }}
              >
                {leadTitle}
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 720, textWrap: 'pretty' }}>
                {GH_GROWTH_SEO_CLIENT.summary.helper}
              </Typography>
            </Stack>

            <Stack
              component='section'
              spacing={1.5}
              aria-label={GH_GROWTH_SEO_CLIENT.summary.nextBestAction}
              sx={{ borderBlock: '1px solid', borderColor: 'divider', py: 2 }}
            >
              <Typography variant='subtitle2' color='text.primary' fontWeight={700}>
                {GH_GROWTH_SEO_CLIENT.summary.nextBestAction}
              </Typography>
              <Stack component='ul' spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {actionItems.map(item => (
                  <Stack key={item.id} component='li' direction='row' spacing={1.1} alignItems='flex-start' sx={{ minWidth: 0 }}>
                    <Box component='i' className={item.icon} aria-hidden='true' sx={{ mt: 0.2, color: 'text.secondary', fontSize: 18, flexShrink: 0 }} />
                    <Typography variant='body2' color='text.secondary' sx={{ textWrap: 'pretty' }}>
                      {item.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>

            <Stack
              data-ui-surface='band'
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              justifyContent='space-between'
              sx={{ mt: 'auto', pt: 1 }}
            >
              <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                <Typography variant='subtitle2' component='h3' color='text.primary' noWrap>
                  {organizationName}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_CLIENT.summary.measuredHint}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap alignItems='center' component='ul' sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <Typography component='li' variant='caption' color='text.secondary'>
                  <Box component='span' aria-hidden='true' sx={{ color: 'text.secondary', mr: 0.5 }}>●</Box>
                  {GH_GROWTH_SEO_CLIENT.page.measured}
                </Typography>
                <Typography component='li' variant='caption' color='text.secondary'>
                  <Box component='span' aria-hidden='true' sx={{ color: 'text.secondary', mr: 0.5 }}>◑</Box>
                  {GH_GROWTH_SEO_CLIENT.page.estimated}
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Stack
            spacing={{ xs: 2.5, md: 3 }}
            sx={theme => ({
              order: { xs: 2, md: 2 },
              minWidth: 0,
              bgcolor: 'action.hover',
              p: { xs: 3, sm: 3.5, md: 4 },
              backgroundImage: `linear-gradient(135deg, ${theme.palette.action.hover}, ${theme.palette.background.paper} 62%)`
            })}
          >
            <Box
              data-ui-surface='open'
              sx={{
                minWidth: 0,
                p: { xs: 0, md: 0 }
              }}
            >
              <SeoPrimaryMetric
                label={GH_GROWTH_SEO_CLIENT.summary.positionLabel}
                signalLabel={GH_GROWTH_SEO_CLIENT.summary.positionSignal}
                value={formatPosition(summary.average)}
                hint={GH_GROWTH_SEO_CLIENT.summary.positionHint}
                tone={positionTone}
                iconClassName={positionTone === 'error' ? 'tabler-trending-down' : 'tabler-trending-up'}
              />
            </Box>

            <Box
              data-capture='seo-client-metric-strip'
              aria-label={GH_GROWTH_SEO_CLIENT.summary.ariaSignals}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: { xs: 0, sm: 2 },
                borderBlock: '1px solid',
                borderColor: 'divider'
              }}
            >
              <SummaryEvidenceItem
                label={GH_GROWTH_SEO_CLIENT.summary.keywordsSignal}
                value={summary.keywordCount > 0 ? formatNumber(summary.keywordCount) : GH_GROWTH_SEO_CLIENT.summary.noData}
                detail={GH_GROWTH_SEO_CLIENT.summary.measuredHint}
                iconClassName='tabler-database'
              />
              <SummaryEvidenceItem
                label={GH_GROWTH_SEO_CLIENT.summary.pageOneSignal}
                value={summary.keywordCount > 0 ? formatNumber(summary.pageOne) : GH_GROWTH_SEO_CLIENT.summary.noData}
                detail={GH_GROWTH_SEO_CLIENT.summary.pageOneHint}
                iconClassName='tabler-chart-bar'
              />
              <SummaryEvidenceItem
                label={GH_GROWTH_SEO_CLIENT.summary.opportunitySignal}
                value={summary.opportunities === null ? GH_GROWTH_SEO_CLIENT.summary.noData : formatNumber(summary.opportunities)}
                detail={GH_GROWTH_SEO_CLIENT.summary.opportunityHint}
                iconClassName={opportunityTone === 'warning' ? 'tabler-alert-triangle' : 'tabler-circle-check'}
              />
            </Box>

            {pageOneCoverage !== null ? (
              <Stack spacing={1} sx={{ pt: 0.25, pb: { xs: 0.5, md: 1 }, bgcolor: 'background.paper' }}>
                <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='baseline'>
                  <Typography variant='caption' color='text.secondary'>
                    {GH_GROWTH_SEO_CLIENT.summary.coverageLabel}
                  </Typography>
                  <Typography variant='monoAmount' color='text.primary'>
                    {pageOneCoverage}%
                  </Typography>
                </Stack>
                <Box
                  role='progressbar'
                  aria-label={GH_GROWTH_SEO_CLIENT.summary.coverageLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pageOneCoverage}
                  sx={theme => ({ blockSize: 8, overflow: 'hidden', borderRadius: `${theme.shape.customBorderRadius.sm}px`, bgcolor: 'action.hover' })}
                >
                  <motion.div
                    initial={prefersReduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.extended, ease: MOTION_EASE.emphasized.cubicBezier ? [...MOTION_EASE.emphasized.cubicBezier] : undefined }}
                    style={{ blockSize: '100%', inlineSize: `${pageOneCoverage}%`, transformOrigin: 'left center', background: 'var(--mui-palette-text-primary)', borderRadius: 'inherit' }}
                  />
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {GH_GROWTH_SEO_CLIENT.summary.coverage(summary.pageOne, summary.keywordCount)}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Stack>
  )
}

const SectionNavigator = ({ active, onChange }: { active: SeoSection; onChange: (section: SeoSection) => void }) => (
  <Box
    component='nav'
    aria-label={GH_GROWTH_SEO_CLIENT.navigator.ariaLabel}
    data-capture='seo-client-section-nav'
    data-ui-surface='band'
    sx={theme => ({
      minWidth: 0,
      overflow: 'hidden',
      borderBlock: '1px solid',
      borderColor: 'divider',
        backgroundColor: 'background.paper',
      '& .MuiTabs-root': { minHeight: 58 },
      '& .MuiTabs-scroller': { overflowX: 'auto !important', scrollbarWidth: 'none' },
      '& .MuiTabs-scroller::-webkit-scrollbar': { display: 'none' },
      '& .MuiTab-root': {
        minHeight: 58,
        minWidth: { xs: 0, sm: 148 },
        px: { xs: 2, sm: 2.5 },
        gap: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        color: `${theme.palette.text.secondary} !important`,
        fontWeight: 600,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        transition: theme.transitions.create(['color', 'background-color'], { duration: theme.transitions.duration.shorter }),
        '& .MuiTab-iconWrapper': { margin: 0, fontSize: '1.15rem' },
        '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
      },
      '& .MuiTab-root.MuiTab-textColorPrimary.Mui-selected, & .MuiTab-root.MuiTab-textColorPrimary.Mui-focusVisible': {
              color: `${theme.palette.primary.dark} !important`,
              backgroundColor: theme.palette.background.paper
      },
      '& .MuiTabs-indicator': { blockSize: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px ${theme.shape.customBorderRadius.sm}px 0 0` },
      '@media (prefers-reduced-motion: reduce)': {
        '& .MuiTab-root': { transition: 'none' }
      }
    })}
  >
    <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ minWidth: 0, pl: { xs: 1, sm: 2 }, pr: { xs: 1, sm: 2 } }}>
      <Tabs
        value={active}
        onChange={(_, value: SeoSection) => onChange(value)}
        variant='scrollable'
        scrollButtons={false}
        aria-label={GH_GROWTH_SEO_CLIENT.navigator.ariaLabel}
        sx={{ minWidth: 0, flex: 1 }}
      >
        {SECTION_ORDER.map(section => {
          const icon = section === 'summary' ? 'tabler-chart-bar' : section === 'evolution' ? 'tabler-chart-line' : 'tabler-chart-dots-3'

          return (
            <Tab
              key={section}
              id={`seo-client-tab-${section}`}
              value={section}
              label={sectionLabel(section)}
              icon={<i className={icon} aria-hidden='true' />}
              iconPosition='start'
              aria-controls={`seo-client-panel-${section}`}
            />
          )
        })}
      </Tabs>
      <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
        {GH_GROWTH_SEO_CLIENT.navigator.reportHint}
      </Typography>
    </Stack>
  </Box>
)

const QuadrantState = ({ surface }: { surface: SeoClientSurfaceRead }) => {
  const gapError = surface.gap && !surface.gap.ok ? surface.gap.errorCode : null

  if (surface.gapReaderFailed || gapError === 'query_failed') {
    return (
      <EmptyState
        icon='tabler-alert-triangle'
        title={GH_GROWTH_SEO_CLIENT.quadrant.states.errorTitle}
        description={GH_GROWTH_SEO_CLIENT.quadrant.states.errorDescription}
      />
    )
  }

  if (gapError === 'no_aeo_data') {
    return (
      <EmptyState
        icon='tabler-star-off'
        title={GH_GROWTH_SEO_CLIENT.quadrant.states.noAeoTitle}
        description={GH_GROWTH_SEO_CLIENT.quadrant.states.noAeoDescription}
        action={
          <Button href='/aeo' variant='outlined' size='small'>
            {GH_GROWTH_SEO_CLIENT.page.viewAeo}
          </Button>
        }
      />
    )
  }

  if (gapError === 'no_seo_data') {
    return (
      <EmptyState
        icon='tabler-chart-no-axes-column'
        title={GH_GROWTH_SEO_CLIENT.quadrant.states.noSeoTitle}
        description={GH_GROWTH_SEO_CLIENT.quadrant.states.noSeoDescription}
      />
    )
  }

  return (
    <EmptyState
      icon='tabler-chart-dots-3'
      title={GH_GROWTH_SEO_CLIENT.quadrant.states.emptyTitle}
      description={GH_GROWTH_SEO_CLIENT.quadrant.states.emptyDescription}
    />
  )
}

const EvolutionState = ({ surface }: { surface: SeoClientSurfaceRead }) => {
  const rankError = surface.rankEvolution && !surface.rankEvolution.ok ? surface.rankEvolution.errorCode : null

  return (
    <EmptyState
      icon='tabler-chart-line-off'
      title={GH_GROWTH_SEO_CLIENT.evolution.emptyTitle}
      description={
        surface.rankReaderFailed || rankError === 'query_failed'
          ? GH_GROWTH_SEO_CLIENT.states.errorDescription
          : GH_GROWTH_SEO_CLIENT.evolution.emptyDescription
      }
    />
  )
}

const Detail = ({ section, surface, organizationName }: { section: SeoSection; surface: SeoClientSurfaceRead; organizationName: string }) => {
  const prefersReduced = useReducedMotion()

  return (
    <Box
      id={`seo-client-panel-${section}`}
      role='tabpanel'
      aria-labelledby={`seo-client-tab-${section}`}
      data-capture={`seo-client-${section}-panel`}
      tabIndex={-1}
      sx={{ minWidth: 0, outline: 'none', scrollMarginBlockStart: 'calc(var(--header-height, 54px) + 36px)' }}
    >
      <AnimatePresence initial={false} mode='wait'>
        <motion.div
          key={section}
          initial={prefersReduced ? false : { y: 8 }}
          animate={{ y: 0 }}
          exit={{ y: -6 }}
          transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.standard, ease: MOTION_EASE.emphasized.cubicBezier ? [...MOTION_EASE.emphasized.cubicBezier] : undefined }}
          style={{ minWidth: 0 }}
        >
          {section === 'summary' ? <SummaryDetail surface={surface} organizationName={organizationName} /> : null}

          {section === 'evolution' ? (
            <Box data-capture='seo-client-evolution' sx={{ scrollMarginBlockStart: 'calc(var(--header-height, 54px) + 96px)' }}>
              {surface.rankEvolution?.ok ? (
                <SeoRankEvolutionChart series={surface.rankEvolution.series} range={surface.rankEvolution.range} surface='contained' />
              ) : (
                <EvolutionState surface={surface} />
              )}
            </Box>
          ) : null}

          {section === 'quadrant' ? (
            <Box data-capture='seo-client-quadrant' sx={{ scrollMarginBlockStart: 'calc(var(--header-height, 54px) + 96px)' }}>
              {surface.gap?.ok ? <SeoAeoQuadrant gap={surface.gap} surface='contained' /> : <QuadrantState surface={surface} />}
            </Box>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </Box>
  )
}

export interface SeoClientDashboardViewProps {
  organizationName: string
  surface: SeoClientSurfaceRead
}

const SeoClientDashboardView = ({ organizationName, surface }: SeoClientDashboardViewProps) => {
  const [active, setActive] = useState<SeoSection>('summary')

  const partial = surface.rankReaderFailed || surface.gapReaderFailed

  return (
    <Stack
      spacing={5}
      sx={{
        p: { xs: 3, sm: 4, md: 6 },
        paddingBlockStart: { xs: 'calc(var(--header-height, 54px) + 24px)', sm: 'calc(var(--header-height, 54px) + 24px)' },
        minWidth: 0,
        width: '100%',
        bgcolor: 'background.paper',
        maxWidth: 1440,
        mx: 'auto'
      }}
      data-capture='seo-client-dashboard'
      data-surface-recipe='operationalWorkbench'
    >
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbRoot, href: '/home' },
          { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbLeaf }
        ]}
      />

    <Box
      data-ui-surface='hero'
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        borderBlock: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ md: 'center' }}
          justifyContent='space-between'
          sx={{ minWidth: 0 }}
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant='overline' color='text.primary'>
              {GH_GROWTH_SEO_CLIENT.page.eyebrow}
            </Typography>
            <Typography variant='surfaceHeroTitle' component='h1'>
              {GH_GROWTH_SEO_CLIENT.page.title}
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 720 }}>
              {GH_GROWTH_SEO_CLIENT.page.description}
            </Typography>
          </Stack>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
            <Chip size='small' variant='outlined' label={surface.connection.dataAsOf ? GH_GROWTH_SEO_CLIENT.page.asOf(surface.connection.dataAsOf) : GH_GROWTH_SEO_CLIENT.page.asOfUnknown} />
            <Button
              href='/growth/seo/report'
              variant='contained'
              size='small'
              endIcon={<i className='tabler-arrow-up-right' aria-hidden='true' />}
              data-capture='seo-client-report-cta'
              sx={{ '& .tabler-arrow-up-right': { transition: `transform ${motionCss.duration.short} ${motionCss.ease.standard}` }, '&:hover .tabler-arrow-up-right': { transform: 'translate(2px, -2px)' }, '@media (prefers-reduced-motion: reduce)': { '& .tabler-arrow-up-right': { transition: 'none' } } }}
            >
              {GH_GROWTH_SEO_CLIENT.page.viewReport}
            </Button>
          </Stack>
        </Stack>
    </Box>

      {partial ? (
        <Alert severity='info'>
          Estamos mostrando las regiones que sí tienen evidencia disponible. Las fuentes no se promedian ni se completan con ceros.
        </Alert>
      ) : null}

      <Box
        sx={{
          minWidth: 0,
          '& [data-composition-region="primary"]': {
            scrollMarginBlockStart: 'calc(var(--header-height, 54px) + 36px)'
          }
        }}
      >
        <CompositionShell
          composition='single'
          instanceId='client-seo-visibility'
          regions={{
            primary: (
              <Stack spacing={{ xs: 4, md: 5 }} sx={{ minWidth: 0 }}>
                <SectionNavigator active={active} onChange={setActive} />
                <Detail section={active} surface={surface} organizationName={organizationName} />
              </Stack>
            )
          }}
        />
      </Box>
    </Stack>
  )
}

export const SeoClientLockedCard = () => (
  <Stack
    spacing={5}
      sx={{
        p: { xs: 3, sm: 4, md: 6 },
        paddingBlockStart: { xs: 'calc(var(--header-height, 54px) + 24px)', sm: 'calc(var(--header-height, 54px) + 24px)' },
        minWidth: 0,
        width: '100%',
        bgcolor: 'background.paper',
        maxWidth: 1440,
        mx: 'auto'
      }}
    data-capture='seo-client-locked'
  >
    <GreenhouseBreadcrumbs
      items={[
        { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbRoot, href: '/home' },
        { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbLeaf }
      ]}
    />
    <Stack
      spacing={2}
      data-ui-surface='open'
      sx={{ borderBlock: '1px solid', borderColor: 'divider', py: { xs: 3, md: 4 }, maxWidth: 840 }}
    >
      <Typography variant='overline' color='text.secondary'>
        Search Visibility 360
      </Typography>
      <Typography variant='h1' component='h1' sx={{ textWrap: 'balance' }}>
        {GH_GROWTH_SEO_CLIENT.states.lockedTitle}
      </Typography>
      <Typography variant='body1' color='text.secondary' sx={{ textWrap: 'pretty' }}>
        {GH_GROWTH_SEO_CLIENT.states.lockedDescription}
      </Typography>
      <Button component='a' href='mailto:hola@efeonce.com' variant='contained' sx={{ alignSelf: 'flex-start' }}>
        {GH_GROWTH_SEO_CLIENT.states.lockedCta}
      </Button>
    </Stack>
  </Stack>
)

export default SeoClientDashboardView
