'use client'

// TASK-992 Slice 3 — Account 360 lifecycle timeline RUNTIME ("estás aquí").
// Cabled 1:1 from the APPROVED mockup (LifecycleTimelineMockup) — same JSX, facet
// rows, health banner, event timeline. Fed from real data (timeline-reader). Adds
// the empty (no case) + degraded (read failed) states the mockup left for runtime
// (state-design: honest degradation, never crash / never show fake data).

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'
import type {
  FacetKey,
  FacetStatus,
  LifecycleFacet,
  LifecycleTimelineData,
  LifecycleTimelineEvent
} from '@/lib/client-lifecycle/timeline-reader'

const FACET_LABEL: Record<FacetKey, string> = {
  identidad: T.timeline.facetIdentidad,
  comercial: T.timeline.facetComercial,
  operaciones: T.timeline.facetOperaciones,
  finanzas: T.timeline.facetFinanzas,
  acceso: T.timeline.facetAcceso
}

const STATUS_META: Record<FacetStatus, { label: string; color: 'success' | 'warning' | 'secondary'; icon: string }> = {
  complete: { label: T.timeline.facetComplete, color: 'success', icon: 'tabler-circle-check-filled' },
  partial: { label: T.timeline.facetPartial, color: 'warning', icon: 'tabler-progress' },
  pending: { label: T.timeline.facetPending, color: 'secondary', icon: 'tabler-circle' }
}

const EVENT_ICON: Record<LifecycleTimelineEvent['kind'], string> = {
  opened: 'tabler-flag-3',
  item_completed: 'tabler-circle-check',
  evidence_attached: 'tabler-paperclip',
  blocker_added: 'tabler-alert-triangle',
  other: 'tabler-point'
}

const ORIGIN_LABEL: Record<string, string> = {
  hubspot_company: 'HubSpot',
  hubspot_deal: 'HubSpot',
  nubox_sale: 'Nubox',
  adopt: 'Cotizador',
  manual: 'Manual'
}

const FacetRow = ({ facet }: { facet: LifecycleFacet }) => {
  const theme = useTheme()
  const meta = STATUS_META[facet.status]
  const iconColor = meta.color === 'secondary' ? theme.palette.text.disabled : theme.palette[meta.color].main

  return (
    <Stack
      direction='row'
      spacing={3}
      alignItems='center'
      sx={{ p: 3, borderRadius: `${theme.shape.customBorderRadius.md}px`, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}
    >
      <i className={meta.icon} style={{ fontSize: 22, color: iconColor, flexShrink: 0 }} aria-hidden />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {FACET_LABEL[facet.key]}
          </Typography>
          <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
          <Typography variant='caption' sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
            {facet.done}/{facet.total}
          </Typography>
        </Stack>
        {facet.missing ? (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            {T.timeline.facetMissingPrefix} {facet.missing}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

interface Props {
  organizationName: string
  data: LifecycleTimelineData | null
  /** Read failed — show the honest degraded state, never fake data. */
  degraded?: boolean
  /** When set, the empty-state CTA links here (the single front door). */
  startOnboardingHref?: string
}

const LifecycleTimeline = ({ organizationName, data, degraded, startOnboardingHref }: Props) => {
  const theme = useTheme()

  const Header = (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Typography variant='h4' sx={{ fontWeight: 700 }}>
        {organizationName}
      </Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {T.timeline.title} · {T.timeline.subtitle}
      </Typography>
    </Stack>
  )

  if (degraded) {
    return (
      <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
        {Header}
        <Alert severity='error' icon={<i className='tabler-alert-circle' />} sx={{ mt: 4 }} role='alert'>
          <AlertTitle sx={{ fontWeight: 600 }}>No pudimos cargar el ciclo de vida</AlertTitle>
          Tuvimos un problema al leer el caso de onboarding. Refrescá la página para reintentar.
        </Alert>
      </Box>
    )
  }

  if (!data) {
    return (
      <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
        {Header}
        <EmptyState
          icon='tabler-route'
          title='Sin caso de onboarding'
          description='Este cliente todavía no tiene un proceso de alta registrado. Cuando se cree, aquí ves su origen, etapas y completitud.'
          minHeight={220}
          action={
            startOnboardingHref ? (
              <Button variant='contained' href={startOnboardingHref} startIcon={<i className='tabler-circle-plus' />}>
                Iniciar onboarding
              </Button>
            ) : undefined
          }
        />
      </Box>
    )
  }

  const originLabel = data.origin ? ORIGIN_LABEL[data.origin] ?? data.origin : null

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      {Header}

      {originLabel ? (
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 5 }}>
          <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {T.timeline.originLabel}
          </Typography>
          <CustomChip round='true' size='small' variant='tonal' color='primary' icon={<i className='tabler-brand-hipchat' />} label={originLabel} />
        </Stack>
      ) : null}

      {/* Health banner — severity derived from facet rollup, not hardcoded. */}
      {data.pendingFacetCount > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-progress-alert' />} sx={{ mb: 5 }} role='status'>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.timeline.atRiskTitle}</AlertTitle>
          {T.timeline.atRiskDescription.replace('{count}', String(data.pendingFacetCount))}
        </Alert>
      ) : (
        <Alert severity='info' icon={<i className='tabler-route' />} sx={{ mb: 5 }} role='status'>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.timeline.healthyTitle}</AlertTitle>
          {T.timeline.healthyDescription}
        </Alert>
      )}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 3 }}>
            {T.timeline.facetsTitle}
          </Typography>
          <Stack spacing={2}>
            {data.facets.map(f => (
              <FacetRow key={f.key} facet={f} />
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <OperationalPanel title={T.timeline.eventsTitle} icon='tabler-timeline-event' iconColor='info'>
            {data.events.length === 0 ? (
              <EmptyState icon='tabler-timeline-event' title='Sin eventos aún' description='Los hitos del onboarding aparecerán aquí.' minHeight={140} />
            ) : (
              <Box sx={{ position: 'relative', pl: 1 }}>
                {data.events.map((ev, index) => {
                  const isLast = index === data.events.length - 1

                  return (
                    <Box key={ev.id} sx={{ position: 'relative', pb: isLast ? 0 : 4 }}>
                      {!isLast ? (
                        <Box sx={{ position: 'absolute', left: 13, top: 28, bottom: -4, width: 2, bgcolor: 'divider' }} aria-hidden />
                      ) : null}
                      <Stack direction='row' spacing={3} alignItems='flex-start'>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          <i className={EVENT_ICON[ev.kind]} style={{ fontSize: 15 }} aria-hidden />
                        </Box>
                        <Box sx={{ minWidth: 0, pt: 0.25 }}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {ev.label}
                          </Typography>
                          {ev.detail ? (
                            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                              {ev.detail}
                            </Typography>
                          ) : null}
                          <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                            {ev.actor} · {ev.displayAt}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            )}
          </OperationalPanel>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LifecycleTimeline
