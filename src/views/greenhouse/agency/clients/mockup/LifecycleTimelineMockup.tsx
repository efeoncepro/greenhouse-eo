'use client'

// TASK-992 mockup — Account 360 lifecycle timeline ("estás aquí"). Shows origin,
// per-facet completeness (Identidad/Comercial/Operaciones/Finanzas/Acceso) with
// what's missing, a health banner, and the touchpoint timeline. Local mock data.

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { OperationalPanel } from '@/components/greenhouse/primitives'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'

import {
  MOCK_FINANCE_DRAWER_CLIENT as CLIENT,
  MOCK_LIFECYCLE_FACETS,
  MOCK_TIMELINE_EVENTS,
  type FacetStatus,
  type MockLifecycleFacet,
  type MockTimelineEvent
} from './client-onboarding-data'

const FACET_LABEL: Record<MockLifecycleFacet['key'], string> = {
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

const EVENT_ICON: Record<MockTimelineEvent['kind'], string> = {
  opened: 'tabler-flag-3',
  item_completed: 'tabler-circle-check',
  evidence_attached: 'tabler-paperclip',
  blocker_added: 'tabler-alert-triangle'
}

const FacetRow = ({ facet }: { facet: MockLifecycleFacet }) => {
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

const LifecycleTimelineMockup = () => {
  const theme = useTheme()
  const pendingFacets = MOCK_LIFECYCLE_FACETS.filter(f => f.status !== 'complete').length

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      {/* Header */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          {CLIENT.organizationName}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {T.timeline.title} · {T.timeline.subtitle}
        </Typography>
      </Stack>

      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 5 }}>
        <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {T.timeline.originLabel}
        </Typography>
        <CustomChip round='true' size='small' variant='tonal' color='primary' icon={<i className='tabler-brand-hipchat' />} label='HubSpot' />
      </Stack>

      {/* Health banner — severity derived from facet rollup, not hardcoded healthy */}
      {pendingFacets > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-progress-alert' />} sx={{ mb: 5 }}>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.timeline.atRiskTitle}</AlertTitle>
          {T.timeline.atRiskDescription.replace('{count}', String(pendingFacets))}
        </Alert>
      ) : (
        <Alert severity='info' icon={<i className='tabler-route' />} sx={{ mb: 5 }}>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.timeline.healthyTitle}</AlertTitle>
          {T.timeline.healthyDescription}
        </Alert>
      )}

      <Grid container spacing={6}>
        {/* Facet completeness */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 3 }}>
            {T.timeline.facetsTitle}
          </Typography>
          <Stack spacing={2}>
            {MOCK_LIFECYCLE_FACETS.map(f => (
              <FacetRow key={f.key} facet={f} />
            ))}
          </Stack>
        </Grid>

        {/* Timeline events */}
        <Grid size={{ xs: 12, md: 5 }}>
          <OperationalPanel title={T.timeline.eventsTitle} icon='tabler-timeline-event' iconColor='info'>
            <Box sx={{ position: 'relative', pl: 1 }}>
              {MOCK_TIMELINE_EVENTS.map((ev, index) => {
                const isLast = index === MOCK_TIMELINE_EVENTS.length - 1

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
          </OperationalPanel>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LifecycleTimelineMockup
