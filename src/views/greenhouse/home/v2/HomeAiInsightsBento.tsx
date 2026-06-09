'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { MOTION_DURATION_S, MOTION_EASE, motionCss } from '@/components/theme/motion-tokens'
import { GH_NEXA } from '@/lib/copy/nexa'
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

const InsightCard = ({ card, index }: { card: HomeAiInsightCard; index: number }) => {
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
      <Card
        variant='outlined'
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
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
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color={meta.color} size={32}>
              <Box component='i' className={meta.icon} sx={{ fontSize: theme => theme.spacing(4.5) }} />
            </CustomAvatar>
            <Typography variant='overline' color='text.secondary' sx={{ flex: 1 }}>
              {meta.label} · {formatSignalType(card.signalType)}
            </Typography>
            {card.severity ? (
              <GreenhouseChip
                size='small'
                variant='label'
                kind='status'
                tone={SEVERITY_TONE[card.severity]}
                label={SEVERITY_LABEL[card.severity]}
              />
            ) : null}
          </Stack>
          <NexaMentionText
            text={card.headline}
            variant='body1'
            sx={{
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          />
          {card.recommendedAction ? (
            <Stack direction='row' spacing={1} alignItems='flex-start' sx={{ mt: 'auto' }}>
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
                    WebkitLineClamp: { xs: 3, sm: 2 },
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    color: 'text.secondary'
                  }}
                />
              </Stack>
            </Stack>
          ) : null}
          {card.drillHref ? (
            <GreenhouseButton
              size='small'
              variant='text'
              kind='navigation'
              trailingIconClassName='tabler-arrow-right'
              onClick={() => router.push(card.drillHref!)}
              sx={{ alignSelf: 'flex-start', mt: 1 }}
            >
              {GH_NEXA.insights_root_cause_expand}
            </GreenhouseButton>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const HomeAiInsightsBento = ({ data }: HomeAiInsightsBentoProps) => {
  const router = useRouter()

  if (!data || data.cards.length === 0) {
    return (
      <Card component='section' aria-label={TASK407_ARIA_NEXA_INSIGHTS} data-capture='home-nexa-insights-bento'>
        <CardHeader
          avatar={
            <Box
              component='i'
              className='tabler-sparkles'
              sx={{ color: 'primary.main', fontSize: theme => theme.spacing(5) }}
            />
          }
          title={GH_NEXA.brand_full}
          subheader={GH_NEXA.home_bento_empty_subheader}
          titleTypographyProps={{ variant: 'h5' }}
          sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
        />
        <CardContent>
          <Typography role='status' aria-live='polite' variant='body2' color='text.secondary'>
            {GH_NEXA.home_bento_empty_body}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card component='section' aria-label={TASK407_ARIA_NEXA_INSIGHTS} data-capture='home-nexa-insights-bento'>
      <CardHeader
        avatar={
          <Box
            component='i'
            className='tabler-sparkles'
            sx={{ color: 'primary.main', fontSize: theme => theme.spacing(5) }}
          />
        }
        title={GH_NEXA.brand_full}
        subheader={
          data.lastAnalysisAt
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
            : GH_NEXA.insights_total_analyzed(data.totalAnalyzed)
        }
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={[GH_NEXA.home_bento_menu_view_all, GH_NEXA.home_bento_menu_configure]} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent>
        <Grid container spacing={3}>
          {data.cards.map((card, index) => (
            <Grid key={card.insightId} size={{ xs: 12, md: data.cards.length === 1 ? 12 : 6 }}>
              <InsightCard card={card} index={index} />
            </Grid>
          ))}
        </Grid>
        <Stack direction='row' justifyContent='flex-end' sx={{ mt: 3 }}>
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
