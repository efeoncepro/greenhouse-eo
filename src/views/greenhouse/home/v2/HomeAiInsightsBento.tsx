'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import {
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseNexaBrandMark,
  GreenhouseShinyBorder
} from '@/components/greenhouse/primitives'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { MOTION_DURATION_S, MOTION_EASE, motionCss } from '@/components/theme/motion-tokens'
import { GH_NEXA } from '@/lib/copy/nexa'
import { NEXA_FLOATING_OPEN_EVENT } from '@/lib/nexa/floating-events'
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeAiInsightCard, HomeAiInsightsBentoData } from '@/lib/home/contract'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

const TASK407_ARIA_NEXA_INSIGHTS = GH_NEXA.brand_full
const FRAMER_EASE_EMPHASIZED: [number, number, number, number] = [...MOTION_EASE.emphasized.cubicBezier]

interface HomeAiInsightsBentoProps {
  data: HomeAiInsightsBentoData
}

const DOMAIN_META: Record<HomeAiInsightCard['domain'], { label: string; icon: string; color: ThemeColor }> = {
  finance: { label: 'Finanzas', icon: 'tabler-cash', color: 'success' },
  delivery: { label: 'Delivery', icon: 'tabler-target', color: 'primary' },
  hr: { label: 'Personas', icon: 'tabler-users', color: 'info' },
  commercial: { label: 'Comercial', icon: 'tabler-briefcase', color: 'warning' },
  agency: { label: 'Agencia', icon: 'tabler-building', color: 'primary' },
  people: { label: 'Equipo', icon: 'tabler-users-group', color: 'info' },
  integrations: { label: 'Integraciones', icon: 'tabler-plug', color: 'secondary' }
}

const SEVERITY_TONE: Record<NonNullable<HomeAiInsightCard['severity']>, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info'
}

const SEVERITY_LABEL: Record<NonNullable<HomeAiInsightCard['severity']>, string> = {
  critical: GH_NEXA.severity_label.critical,
  warning: GH_NEXA.severity_label.warning,
  info: GH_NEXA.severity_label.info
}

const formatSignalType = (signalType: string) => GH_NEXA.signal_type[signalType] ?? signalType.replaceAll('_', ' ')

const AskNexaButton = ({ card }: { card?: HomeAiInsightCard }) => {
  const handleAsk = () => {
    window.dispatchEvent(
      new CustomEvent(NEXA_FLOATING_OPEN_EVENT, {
        detail: {
          source: 'home-nexa-insights',
          focusRef: card ? { kind: 'nexa_insight', id: card.insightId } : undefined,
          seedPrompt: card ? GH_NEXA.home_bento_ask_nexa_seed(card.metricLabel) : GH_NEXA.home_bento_ask_nexa_overview_seed
        }
      })
    )
  }

  return (
    <GreenhouseShinyBorder
      asButton
      variant='cta'
      size='compact'
      palette='nexa'
      ariaLabel={card ? GH_NEXA.insight_ask_nexa_aria : GH_NEXA.home_bento_ask_nexa_overview_aria}
      onClick={handleAsk}
      dataCapture={card ? 'home-nexa-insight-ask' : 'home-nexa-insights-ask'}
    >
      <GreenhouseNexaBrandMark kind='inlineMarkOnDark' size='small' sx={{ inlineSize: 18, blockSize: 18 }} />
      {GH_NEXA.insight_ask_nexa_cta}
    </GreenhouseShinyBorder>
  )
}

const HomeNexaInsightsHeader = ({
  data,
  empty = false
}: {
  data?: HomeAiInsightsBentoData
  empty?: boolean
}) => {
  const summary =
    data && data.lastAnalysisAt
      ? GH_NEXA.home_bento_last_analysis(
          data.totalAnalyzed,
          formatGreenhouseDateTime(
            new Date(data.lastAnalysisAt),
            {
              dateStyle: 'short',
              timeStyle: 'short'
            },
            'es-CL'
          )
        )
      : data
        ? GH_NEXA.insights_total_analyzed(data.totalAnalyzed)
        : GH_NEXA.home_bento_empty_subheader

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      justifyContent='space-between'
    >
      <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ minWidth: 0 }}>
        <GreenhouseNexaBrandMark
          kind='badgeIcon'
          size='medium'
          dataCapture='home-nexa-insights-mark'
          sx={theme => ({
            flexShrink: 0,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            boxShadow: `0 0 0 4px ${alpha(theme.axis.ramp.info[500], 0.08)}`
          })}
        />
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap' }}>
            <Typography variant='h5'>{GH_NEXA.brand_full}</Typography>
            {!empty ? (
              <GreenhouseChip
                size='small'
                variant='signal'
                kind='status'
                tone='info'
                label={GH_NEXA.home_bento_source_chip}
              />
            ) : null}
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            {summary}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction='row' spacing={1} alignItems='center' justifyContent={{ xs: 'space-between', sm: 'flex-end' }}>
        {!empty ? <AskNexaButton /> : null}
        {!empty ? <OptionMenu options={[GH_NEXA.home_bento_menu_view_all, GH_NEXA.home_bento_menu_configure]} /> : null}
      </Stack>
    </Stack>
  )
}

const InsightCard = ({ card, index, featured = false }: { card: HomeAiInsightCard; index: number; featured?: boolean }) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const meta = DOMAIN_META[card.domain] ?? DOMAIN_META.agency

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={
        reduced
          ? undefined
          : {
              duration: MOTION_DURATION_S.standard,
              delay: MOTION_DURATION_S.instant * index,
              ease: FRAMER_EASE_EMPHASIZED
            }
      }
      style={{ height: '100%' }}
    >
      <Box
        component='article'
        sx={{
          height: '100%',
          minWidth: 0,
          p: featured ? { xs: 2.5, sm: 3 } : 2.5,
          border: '1px solid',
          borderColor: theme => (featured ? alpha(theme.axis.ramp.info[500], 0.3) : theme.palette.divider),
          borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
          background: theme =>
            featured
              ? `linear-gradient(135deg, ${alpha(theme.axis.ramp.primary[900], 0.045)} 0%, ${alpha(theme.axis.ramp.info[500], 0.075)} 100%)`
              : theme.palette.background.paper,
          boxShadow: theme => (featured ? `0 16px 36px ${alpha(theme.axis.ramp.primary[900], 0.08)}` : 'none'),
          display: 'flex',
          flexDirection: 'column',
          gap: featured ? 2 : 1.5,
          transition: `box-shadow ${motionCss.duration.short} ${motionCss.ease.emphasized}, transform ${motionCss.duration.short} ${motionCss.ease.emphasized}`,
          '&:hover': {
            transform: card.drillHref ? 'translateY(-2px)' : undefined,
            boxShadow: theme => theme.greenhouseElevation.raised.boxShadow
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover': {
              transform: 'none'
            }
          }
        }}
      >
        <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={1.5}>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', minWidth: 0 }}>
            {featured ? (
              <GreenhouseChip
                size='small'
                variant='solid'
                kind='status'
                tone='info'
                label={GH_NEXA.home_bento_priority_label}
              />
            ) : null}
            <GreenhouseChip
              size='small'
              variant='label'
              kind='attribute'
              tone={meta.color}
              iconClassName={meta.icon}
              label={meta.label}
            />
            <GreenhouseChip
              size='small'
              variant='outlined'
              kind='attribute'
              tone='default'
              label={formatSignalType(card.signalType)}
            />
          </Stack>
          <Box sx={{ flexShrink: 0 }}>
            {card.severity ? (
              <GreenhouseChip
                size='small'
                variant='label'
                kind='status'
                tone={SEVERITY_TONE[card.severity]}
                label={SEVERITY_LABEL[card.severity]}
              />
            ) : null}
          </Box>
        </Stack>

        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant='overline' color='text.secondary'>
            {featured ? GH_NEXA.home_bento_impact_label : GH_NEXA.home_bento_signal_label}
          </Typography>
          <NexaMentionText
            text={card.headline}
            variant={featured ? 'h6' : 'body1'}
            sx={{
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: featured ? 3 : 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          />
        </Stack>

        {featured && card.rootCauseSummary ? (
          <Box
            sx={theme => ({
              display: { xs: 'none', sm: 'block' },
              p: 2,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              bgcolor: alpha(theme.palette.background.paper, 0.72)
            })}
          >
            <Typography variant='overline' color='text.secondary'>
              {GH_NEXA.home_bento_root_cause_label}
            </Typography>
            <NexaMentionText
              text={card.rootCauseSummary}
              variant='body2'
              sx={{
                mt: 0.5,
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            />
          </Box>
        ) : null}

        <Stack spacing={1.5} sx={{ mt: 'auto' }}>
          {card.recommendedAction ? (
            <Stack direction='row' spacing={1} alignItems='flex-start'>
              <Box
                aria-hidden='true'
                component='i'
                className='tabler-bulb'
                sx={{ color: 'warning.main', flexShrink: 0, fontSize: theme => theme.spacing(4.5), mt: 0.25 }}
              />
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant='overline' color='text.secondary'>
                  {GH_NEXA.insights_action_label}
                </Typography>
                <NexaMentionText
                  text={card.recommendedAction}
                  variant='body2'
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: { xs: featured ? 2 : 3, sm: 2 },
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    color: 'text.secondary'
                  }}
                />
              </Stack>
            </Stack>
          ) : null}

          <Stack
            direction={featured ? 'row' : 'column'}
            spacing={1}
            alignItems={featured ? 'center' : 'flex-start'}
            sx={{ flexWrap: featured ? 'wrap' : 'nowrap' }}
          >
            {card.drillHref ? (
              <GreenhouseButton
                size='small'
                variant='text'
                kind='navigation'
                trailingIconClassName='tabler-arrow-right'
                onClick={() => router.push(card.drillHref!)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {featured ? GH_NEXA.home_bento_open_root_cause_cta : GH_NEXA.insights_root_cause_expand}
              </GreenhouseButton>
            ) : null}
            {featured ? (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <AskNexaButton card={card} />
              </Box>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </motion.div>
  )
}

export const HomeAiInsightsBento = ({ data }: HomeAiInsightsBentoProps) => {
  const router = useRouter()

  if (!data || data.cards.length === 0) {
    return (
      <Card component='section' aria-label={TASK407_ARIA_NEXA_INSIGHTS} data-capture='home-nexa-insights-bento'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <HomeNexaInsightsHeader empty />
          <Typography role='status' aria-live='polite' variant='body2' color='text.secondary'>
            {GH_NEXA.home_bento_empty_body}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card component='section' aria-label={TASK407_ARIA_NEXA_INSIGHTS} data-capture='home-nexa-insights-bento'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <HomeNexaInsightsHeader data={data} />
        <Grid container spacing={3}>
          {data.cards.map((card, index) => (
            <Grid
              key={card.insightId}
              size={{
                xs: 12,
                md: index === 0 || data.cards.length === 1 ? 12 : 6
              }}
            >
              <InsightCard card={card} index={index} featured={index === 0} />
            </Grid>
          ))}
        </Grid>
        <Stack direction='row' justifyContent='flex-end'>
          <GreenhouseButton
            size='small'
            variant='text'
            kind='navigation'
            trailingIconClassName='tabler-arrow-right'
            onClick={() => router.push('/nexa/insights')}
          >
            {GH_NEXA.home_bento_view_all_cta}
          </GreenhouseButton>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default HomeAiInsightsBento
