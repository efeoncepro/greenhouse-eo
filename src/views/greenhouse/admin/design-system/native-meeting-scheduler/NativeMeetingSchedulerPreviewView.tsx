'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import GlobalStyles from '@mui/material/GlobalStyles'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { CTA_FIXTURES } from '@/growth-cta-renderer/fixtures'
import { MeetingActivationController } from '@/growth-cta-renderer/meeting-action'
import { CtaRenderer } from '@/growth-cta-renderer/renderer'
import { resolveCtaSystemCopy } from '@/growth-cta-renderer/copy'
import { ensureStylesInjected as ensureCtaStyles } from '@/growth-cta-renderer/styles'
import { createMeetingFixtureApi, type MeetingFixtureOutcome } from '@/growth-meeting-renderer/fixtures'
import { MeetingRenderer } from '@/growth-meeting-renderer/renderer'
import { ensureMeetingStyles } from '@/growth-meeting-renderer/styles'
import type { MeetingTurnstilePort } from '@/growth-meeting-renderer/turnstile'

const OUTCOMES: Record<MeetingFixtureOutcome, string> = {
  confirmed: 'Confirmado',
  ambiguous: 'Verificando',
  slot_unavailable: 'Horario ocupado',
}

const EMBED_SNIPPET = `<efeonce-meeting-scheduler
  scheduler-key="efeonce-discovery-30"
  surface="efeonce-public-site"
  placement="contact_scheduler"
  base-url="https://greenhouse.efeoncepro.com"
></efeonce-meeting-scheduler>
<script src="https://efeonce-public-renderers.vercel.app/loader.js" defer></script>`

const previewTurnstile: MeetingTurnstilePort = {
  mount() {
    return {
      execute: async () => 'preview-captcha-token',
      reset() {},
      destroy() {},
    }
  },
}

const SchedulerCanvas = ({ outcome }: { outcome: MeetingFixtureOutcome }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) return
    ensureMeetingStyles(document)

    const renderer = new MeetingRenderer(host, {
      api: createMeetingFixtureApi(outcome),
      turnstile: previewTurnstile,
      surfaceId: 'greenhouse-design-system',
      schedulerKey: 'efeonce-discovery-30',
      requestedTimezone: 'America/Santiago',
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

const GrowthCtaSchedulerSeam = ({ outcome }: { outcome: MeetingFixtureOutcome }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) return

    ensureCtaStyles(document)
    ensureMeetingStyles(document)

    const contract = CTA_FIXTURES.nativeMeetingScheduler.build()

    if (contract.action.kind !== 'open_meeting_scheduler') return

    const controller = new MeetingActivationController({
      doc: document,
      action: contract.action,
      baseUrl: window.location.origin,
      placement: 'growth_cta_preview',
      copy: resolveCtaSystemCopy(),
      createSchedulerElement: doc => {
        const element = doc.createElement('div')

        element.className = 'ghm-scope'
        element.setAttribute('data-capture', 'growth-cta-native-scheduler')

        const meeting = new MeetingRenderer(element, {
          api: createMeetingFixtureApi(outcome),
          turnstile: previewTurnstile,
          surfaceId: 'greenhouse-design-system',
          schedulerKey: 'efeonce-discovery-30',
          requestedTimezone: 'America/Santiago',
          now: () => new Date('2026-07-21T12:00:00.000Z'),
          activationMode: 'dialog',
          telemetryBase: {
            scheduler_key: 'efeonce-discovery-30', surface_id: 'greenhouse-design-system',
            placement: 'growth_cta_preview', renderer_version: 'preview', contract_version: 'growth-meeting-scheduler.v1',
          },
        })

        void meeting.load()

        return { element, dispose: () => meeting.destroy() }
      },
    })

    const renderer = new CtaRenderer({
      root: host,
      contract,
      copy: resolveCtaSystemCopy(),
      telemetry: { emit: () => undefined },
      onPrimary: async () => false,
      onTaskPrimary: invoker => controller.open(invoker),
      onTaskIntent: () => { void controller.prewarm() },
      onIngest: () => undefined,
    })

    host.classList.add('ghc-scope')
    renderer.render()

    return () => {
      renderer.destroy()
      controller.dispose()
    }
  }, [outcome])

  return <div ref={hostRef} data-capture='growth-cta-meeting-launcher' />
}

const NativeMeetingSchedulerPreviewView = () => {
  const [outcome, setOutcome] = useState<MeetingFixtureOutcome>('confirmed')

  return (
    <>
      <GlobalStyles
        styles={{
          '@media (max-width: 650px)': {
            '.ts-vertical-layout-header': { display: 'none !important' },
            '[data-capture="dashboard-floating-actions"]': { display: 'none !important' }
          }
        }}
      />
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

      <Card variant='outlined' sx={{ mb: 4, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px` }} data-capture='growth-cta-scheduler-seam'>
        <CardContent>
          <Typography variant='overline' color='primary'>Growth CTA synergy</Typography>
          <Typography variant='h6' sx={{ mb: 0.5 }}>Launcher compacto, agenda rica bajo demanda</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3, maxWidth: 760 }}>
            El CTA conserva su tamaño. En desktop abre un diálogo y en móvil una task surface full-screen; cerrar y
            reabrir mantiene el mismo flujo en memoria.
          </Typography>
          <GrowthCtaSchedulerSeam outcome={outcome} />
        </CardContent>
      </Card>

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
    </>
  )
}

export default NativeMeetingSchedulerPreviewView
