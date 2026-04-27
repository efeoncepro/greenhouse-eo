'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useRouter } from 'next/navigation'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

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

const InsightCard = ({ card, index }: { card: HomeAiInsightCard; index: number }) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const meta = DOMAIN_META[card.domain] ?? DOMAIN_META.agency

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.2, delay: 0.05 * index, ease: [0.2, 0, 0, 1] }}
    >
      <Card
        variant='outlined'
        sx={{
          height: '100%',
          cursor: card.drillHref ? 'pointer' : 'default',
          transition: 'box-shadow 120ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            transform: card.drillHref ? 'translateY(-2px)' : undefined,
            boxShadow: theme => theme.shadows[2]
          }
        }}
        onClick={() => card.drillHref && router.push(card.drillHref)}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color={meta.color} size={32}>
              <i className={meta.icon} style={{ fontSize: 18 }} />
            </CustomAvatar>
            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {meta.label} · {card.signalType}
            </Typography>
            {card.severity ? (
              <Chip
                size='small'
                variant='outlined'
                color={SEVERITY_TONE[card.severity]}
                label={card.severity === 'critical' ? 'Crítico' : card.severity === 'warning' ? 'Atención' : 'Info'}
                sx={{ ml: 'auto', height: 20, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
              />
            ) : null}
          </Stack>
          <Typography variant='body1' sx={{ fontWeight: 500 }}>
            {card.headline}
          </Typography>
          {card.recommendedAction ? (
            <Typography variant='caption' color='text.secondary' sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              <strong>Acción sugerida: </strong>
              {card.recommendedAction}
            </Typography>
          ) : null}
          {card.drillHref ? (
            <Stack direction='row' spacing={1} sx={{ mt: 'auto' }}>
              <Button
                size='small'
                variant='text'
                color='primary'
                endIcon={<i className='tabler-arrow-right' style={{ fontSize: 14 }} />}
              >
                Ver causa raíz
              </Button>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const HomeAiInsightsBento = ({ data }: HomeAiInsightsBentoProps) => {
  if (!data || data.cards.length === 0) {
    return (
      <Card component='section' aria-label='Nexa Insights'>
        <CardHeader
          title={
            <Stack direction='row' alignItems='center' spacing={1.5}>
              <CustomAvatar variant='rounded' skin='light' color='primary' size={32}>
                <i className='tabler-sparkles' style={{ fontSize: 18 }} />
              </CustomAvatar>
              <Typography variant='h6' component='h2'>Nexa Insights</Typography>
            </Stack>
          }
        />
        <CardContent>
          <Stack role='status' aria-live='polite' spacing={1.5} alignItems='center' sx={{ py: 4, color: 'text.secondary' }}>
            <Typography variant='body2'>Sin señales analizadas todavía. Nexa procesa señales nuevas cada hora.</Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card component='section' aria-label='Nexa Insights'>
      <CardHeader
        title={
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color='primary' size={32}>
              <i className='tabler-sparkles' style={{ fontSize: 18 }} />
            </CustomAvatar>
            <Typography variant='h6' component='h2'>Nexa Insights</Typography>
          </Stack>
        }
        subheader={
          <Typography variant='caption' color='text.secondary'>
            {data.totalAnalyzed} señales analizadas
            {data.lastAnalysisAt ? ` · último análisis ${new Date(data.lastAnalysisAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}` : null}
          </Typography>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {data.cards.map((card, index) => (
            <Grid key={card.insightId} size={{ xs: 12, md: 6 }}>
              <InsightCard card={card} index={index} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default HomeAiInsightsBento
