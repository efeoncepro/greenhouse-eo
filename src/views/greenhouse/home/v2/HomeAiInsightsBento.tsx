'use client'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeAiInsightCard, HomeAiInsightsBentoData } from '@/lib/home/contract'

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

const SEVERITY_TONE: Record<NonNullable<HomeAiInsightCard['severity']>, ThemeColor> = {
  critical: 'error',
  warning: 'warning',
  info: 'info'
}

const SEVERITY_LABEL: Record<NonNullable<HomeAiInsightCard['severity']>, string> = {
  critical: 'Crítico',
  warning: 'Atención',
  info: 'Info'
}

const InsightCard = ({ card, index }: { card: HomeAiInsightCard; index: number }) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const meta = DOMAIN_META[card.domain] ?? DOMAIN_META.agency

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.2, delay: 0.05 * index, ease: [0.2, 0, 0, 1] }}
      style={{ height: '100%' }}
    >
      <Card
        variant='outlined'
        sx={{
          height: '100%',
          cursor: card.drillHref ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 120ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            transform: card.drillHref ? 'translateY(-2px)' : undefined,
            boxShadow: theme => theme.shadows[2]
          }
        }}
        onClick={() => card.drillHref && router.push(card.drillHref)}
      >
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color={meta.color} size={32}>
              <i className={classnames(meta.icon, 'text-[18px]')} />
            </CustomAvatar>
            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
              {meta.label} · {card.signalType}
            </Typography>
            {card.severity ? (
              <Chip
                size='small'
                variant='tonal'
                color={SEVERITY_TONE[card.severity]}
                label={SEVERITY_LABEL[card.severity]}
                sx={{ height: 22, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
              />
            ) : null}
          </Stack>
          <NexaMentionText
            text={card.headline}
            variant='body1'
            sx={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          />
          {card.recommendedAction ? (
            <Stack direction='row' spacing={1} alignItems='flex-start' sx={{ mt: 'auto' }}>
              <i className='tabler-bulb text-[18px] text-warning shrink-0' style={{ marginTop: 2 }} />
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                  Acción sugerida
                </Typography>
                <NexaMentionText
                  text={card.recommendedAction}
                  variant='body2'
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'text.secondary' }}
                />
              </Stack>
            </Stack>
          ) : null}
          {card.drillHref ? (
            <Button
              size='small'
              variant='text'
              color='primary'
              endIcon={<i className='tabler-arrow-right text-base' />}
              sx={{ alignSelf: 'flex-start', mt: 1 }}
            >
              Ver causa raíz
            </Button>
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
      <Card component='section' aria-label='Nexa Insights'>
        <CardHeader
          avatar={<i className='tabler-sparkles text-xl text-primary' />}
          title='Nexa Insights'
          subheader='Sin señales analizadas todavía'
          titleTypographyProps={{ variant: 'h5' }}
          sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
        />
        <CardContent>
          <Typography role='status' aria-live='polite' variant='body2' color='text.secondary'>
            Nexa procesa señales nuevas cada hora. Vuelve más tarde para ver insights.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card component='section' aria-label='Nexa Insights'>
      <CardHeader
        avatar={<i className='tabler-sparkles text-xl text-primary' />}
        title='Nexa Insights'
        subheader={
          data.lastAnalysisAt
            ? `${data.totalAnalyzed} señales · último análisis ${new Date(data.lastAnalysisAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`
            : `${data.totalAnalyzed} señales analizadas`
        }
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Ver todos los insights', 'Configurar análisis']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent>
        <Grid container spacing={3}>
          {data.cards.map((card, index) => (
            <Grid
              key={card.insightId}
              size={{ xs: 12, md: data.cards.length === 1 ? 12 : 6 }}
            >
              <InsightCard card={card} index={index} />
            </Grid>
          ))}
        </Grid>
        <Stack direction='row' justifyContent='flex-end' sx={{ mt: 3 }}>
          <Button
            size='small'
            variant='text'
            color='primary'
            endIcon={<i className='tabler-arrow-right text-base' />}
            onClick={() => router.push('/agency/insights')}
          >
            Ver todos los insights del mes
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default HomeAiInsightsBento
