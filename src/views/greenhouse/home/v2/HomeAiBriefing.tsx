'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
import type { ThemeColor } from '@core/types'

import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { AiBriefingNarrativeKind, HomeAiBriefingData } from '@/lib/home/contract'
import { formatTime as formatGreenhouseTime } from '@/lib/format'

const TASK407_ARIA_BRIEFING_DE_HOY = "Briefing de hoy"
const TASK407_ARIA_BRIEFING_GENERANDOSE_EN_VIVO = "Briefing generándose en vivo"


interface HomeAiBriefingProps {
  data: HomeAiBriefingData
}

const KIND_META: Record<AiBriefingNarrativeKind, { icon: string; color: ThemeColor }> = {
  business: { icon: 'tabler-trending-up', color: 'primary' },
  team: { icon: 'tabler-users', color: 'info' },
  platform: { icon: 'tabler-server-2', color: 'success' },
  finance: { icon: 'tabler-cash', color: 'success' },
  hr: { icon: 'tabler-user-heart', color: 'info' },
  delivery: { icon: 'tabler-target', color: 'primary' },
  personal: { icon: 'tabler-user-circle', color: 'secondary' }
}

const formatTime = (iso: string): string => {
  try {
    return formatGreenhouseTime(new Date(iso), {
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')
  } catch {
    return ''
  }
}

/**
 * Smart Home v2 — AI Briefing (proactive narrative, role-aware).
 *
 * Pattern: Card-with-Accordion (MUI native). The first narrative is
 * expanded by default; the rest are collapsed. Each AccordionSummary
 * shows kind icon + title + signal-count chip; AccordionDetails renders
 * the body via NexaMentionText (mention chips resolve), drill CTA at
 * the bottom.
 *
 * Trust strip: footer caption "Generado HH:MM por {modelLabel} · Verifica
 * antes de actuar." This is not optional — every LLM-generated surface
 * gets a provenance line.
 *
 * Capability gate: composer drops the block when user lacks
 * `home.briefing.daily`.
 */
export const HomeAiBriefing = ({ data }: HomeAiBriefingProps) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState<number | null>(0)

  if (data.narratives.length === 0) {
    return (
      <Card component='section' aria-label={TASK407_ARIA_BRIEFING_DE_HOY}>
        <CardHeader
          avatar={<CustomAvatar variant='rounded' skin='light' color='primary' size={36}><i className='tabler-sparkles text-[20px]' /></CustomAvatar>}
          title='Briefing de hoy'
          subheader='El primer briefing del día se genera a las 06:00. Vuelve más tarde.'
          titleTypographyProps={{ variant: 'h5' }}
        />
      </Card>
    )
  }

  const sourceLabel = data.source === 'precomputed'
    ? `Generado ${formatTime(data.generatedAt)} por ${data.modelLabel}`
    : `Generado en vivo · ${data.modelLabel}`

  return (
    <Card component='section' aria-label={TASK407_ARIA_BRIEFING_DE_HOY} aria-describedby='briefing-trust-note'>
      <CardHeader
        avatar={<CustomAvatar variant='rounded' skin='light' color='primary' size={36}><i className='tabler-sparkles text-[20px]' /></CustomAvatar>}
        title='Briefing de hoy'
        subheader={
          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography variant='caption' color='text.secondary'>{sourceLabel}</Typography>
            {data.source === 'realtime' ? (
              <Box
                aria-label={TASK407_ARIA_BRIEFING_GENERANDOSE_EN_VIVO}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  animation: 'gh-briefing-pulse 1s linear infinite',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  '@keyframes gh-briefing-pulse': {
                    '0%, 100%': { opacity: 0.3 },
                    '50%': { opacity: 1 }
                  }
                }}
              />
            ) : null}
          </Stack>
        }
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Regenerar briefing', 'Ver historial', 'Configurar tono']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent sx={{ pt: 0, pb: 1 }}>
        {data.narratives.map((narrative, index) => {
          const meta = KIND_META[narrative.kind] ?? KIND_META.business
          const isExpanded = expanded === index

          return (
            <motion.div
              key={`${narrative.kind}-${index}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={reduced ? undefined : { duration: 0.2, delay: 0.1 * index, ease: [0.2, 0, 0, 1] }}
            >
              <Accordion
                disableGutters
                elevation={0}
                expanded={isExpanded}
                onChange={() => setExpanded(isExpanded ? null : index)}
                sx={{
                  bgcolor: 'transparent',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
                  '&:not(:last-child)': { mb: 1.5 },
                  '&::before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={<i className='tabler-chevron-down text-[18px]' />}
                  aria-controls={`briefing-${narrative.kind}-content`}
                  id={`briefing-${narrative.kind}-header`}
                >
                  <Stack direction='row' spacing={1.5} alignItems='center' flex={1} minWidth={0}>
                    <CustomAvatar skin='light' variant='rounded' color={meta.color} size={28}>
                      <i className={classnames(meta.icon, 'text-[16px]')} />
                    </CustomAvatar>
                    <Typography variant='overline' sx={{ letterSpacing: 0.5, lineHeight: 1.4 }} color='text.primary'>
                      {narrative.title}
                    </Typography>
                    {narrative.signalCount != null && narrative.signalCount > 0 ? (
                      <Chip
                        size='small'
                        variant='outlined'
                        color={meta.color}
                        label={`${narrative.signalCount} ${narrative.signalCount === 1 ? 'señal' : 'señales'}`}
                        sx={{ ml: 'auto', mr: 1, height: 22, fontSize: 11 }}
                      />
                    ) : null}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1.5}>
                    <NexaMentionText text={narrative.body} variant='body2' sx={{ color: 'text.primary' }} />
                    {narrative.drillHref ? (
                      <Button
                        size='small'
                        variant='text'
                        color='primary'
                        endIcon={<i className='tabler-arrow-right text-base' style={{ transition: 'transform 120ms cubic-bezier(0.2, 0, 0, 1)' }} />}
                        onClick={() => router.push(narrative.drillHref!)}
                        sx={{ alignSelf: 'flex-start', '&:hover .tabler-arrow-right': { transform: 'translateX(2px)' } }}
                      >
                        Ver causa raíz
                      </Button>
                    ) : null}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          )
        })}
        <Typography
          id='briefing-trust-note'
          variant='caption'
          color='text.disabled'
          role='note'
          sx={{ display: 'block', mt: 2 }}
        >
          {sourceLabel} · Verifica la información antes de actuar.
        </Typography>
      </CardContent>
    </Card>
  )
}

export default HomeAiBriefing
