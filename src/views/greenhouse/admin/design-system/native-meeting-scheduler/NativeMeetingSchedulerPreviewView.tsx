'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { createMeetingFixtureApi, type MeetingFixtureOutcome } from '@/growth-meeting-renderer/fixtures'
import { MeetingRenderer } from '@/growth-meeting-renderer/renderer'
import { ensureMeetingStyles } from '@/growth-meeting-renderer/styles'

const OUTCOMES: Record<MeetingFixtureOutcome, string> = {
  confirmed: 'Confirmado',
  ambiguous: 'Verificando',
  slot_unavailable: 'Horario ocupado',
}

const EMBED_SNIPPET = `<efeonce-meeting-scheduler
  scheduler-key="efeonce-discovery-30"
  surface="efeonce-public-site"
  placement="contact_scheduler"
  timezone="America/Santiago"
  base-url="https://greenhouse.efeoncepro.com"
>
  <a href="https://meetings.hubspot.com/efeonce">Abrir agenda segura</a>
</efeonce-meeting-scheduler>
<script src="https://greenhouse.efeoncepro.com/growth-meetings/renderer-stable.js" defer></script>`

const SchedulerCanvas = ({ outcome }: { outcome: MeetingFixtureOutcome }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) return
    ensureMeetingStyles(document)

    const renderer = new MeetingRenderer(host, {
      api: createMeetingFixtureApi(outcome),
      turnstile: {
        mount({ onToken }) {
          onToken('preview-captcha-token')

          return { destroy() {} }
        },
      },
      surfaceId: 'greenhouse-design-system',
      schedulerKey: 'efeonce-discovery-30',
      requestedTimezone: 'America/Santiago',
      emergencyFallbackUrl: 'https://meetings.hubspot.com/efeonce',
      now: () => new Date('2026-07-21T12:00:00.000Z'),
      telemetryBase: {
        scheduler_key: 'efeonce-discovery-30',
        surface_id: 'greenhouse-design-system',
        placement: 'scheduler_preview',
        renderer_version: 'preview',
        contract_version: 'growth-meeting-scheduler.v1',
      },
    })

    void renderer.load()

    return () => renderer.destroy()
  }, [outcome])

  return <div ref={hostRef} className='ghm-scope' data-capture='native-meeting-scheduler-canvas' />
}

const NativeMeetingSchedulerPreviewView = () => {
  const [outcome, setOutcome] = useState<MeetingFixtureOutcome>('confirmed')

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        width: { xs: 'calc(100dvw - 24px)', md: '100%' },
        maxWidth: 1500,
        minWidth: 0,
        mx: 'auto'
      }}
      data-capture='native-meeting-scheduler-preview'
    >
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant='overline' color='primary'>
          Growth systems · TASK-1510
        </Typography>
        <Typography variant='h4'>Native Meeting Scheduler</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
          Una experiencia Efeonce portable y medible. Esta galería monta el mismo renderer vanilla que usarán
          WordPress y Astro; los datos son fixtures deterministas y nunca crean una reunión real.
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
        <Typography variant='caption' color='text.secondary'>Resultado simulado</Typography>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={outcome}
          onChange={(_, value: MeetingFixtureOutcome | null) => value && setOutcome(value)}
          aria-label='Resultado simulado de la reserva'
        >
          {(Object.keys(OUTCOMES) as MeetingFixtureOutcome[]).map(key => (
            <ToggleButton key={key} value={key}>{OUTCOMES[key]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <SchedulerCanvas key={outcome} outcome={outcome} />

      <Card
        variant='outlined'
        sx={{ mt: 4, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px` }}
        data-capture='native-meeting-scheduler-embed'
      >
        <CardContent>
          <Typography variant='subtitle2' gutterBottom>Embed portable con fallback progresivo</Typography>
          <Typography variant='caption' color='text.secondary'>
            El enlace de HubSpot permanece usable si el bundle o la API no cargan. El browser no conoce IDs internos
            del proveedor y la conversión confirmada vive solo en dataLayer.
          </Typography>
          <Box
            component='pre'
            sx={{ mt: 2, mb: 0, p: 2, borderRadius: theme => `${theme.shape.customBorderRadius.md}px`, bgcolor: 'action.hover', overflowX: 'auto' }}
          >
            <Typography component='code' variant='caption' sx={{ whiteSpace: 'pre' }}>{EMBED_SNIPPET}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default NativeMeetingSchedulerPreviewView
