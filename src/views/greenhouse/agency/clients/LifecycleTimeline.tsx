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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import EmptyState from '@/components/greenhouse/EmptyState'
import { HubSpotIsotype } from '@/components/greenhouse/brand/BrandIsotypes'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { PortalUsersPanel } from '@/views/greenhouse/agency/clients/PortalUsersPanel'
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

// TASK-997 — checklist del caso + anchors capturados (vista read-only).
export interface LifecycleChecklistItemVm {
  itemCode: string
  itemLabel: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked' | 'not_applicable'
  ownerRole: string
  required: boolean
  blocksCompletion: boolean
}

interface LifecycleNotionAnchorVm {
  notionDatabaseId: string
  title: string
}

interface LifecycleTeamsAnchorVm {
  teamId: string
  teamName: string
}

const CHECKLIST_STATUS: Record<
  LifecycleChecklistItemVm['status'],
  { label: string; color: 'success' | 'info' | 'error' | 'secondary'; icon: string }
> = {
  completed: { label: T.checklist.statusCompleted, color: 'success', icon: 'tabler-circle-check-filled' },
  in_progress: { label: T.checklist.statusInProgress, color: 'info', icon: 'tabler-progress' },
  blocked: { label: T.checklist.statusBlocked, color: 'error', icon: 'tabler-alert-triangle' },
  skipped: { label: T.checklist.statusSkipped, color: 'secondary', icon: 'tabler-circle-minus' },
  not_applicable: { label: T.checklist.statusSkipped, color: 'secondary', icon: 'tabler-circle-minus' },
  pending: { label: T.checklist.statusPending, color: 'secondary', icon: 'tabler-circle' }
}

const OWNER_LABEL: Record<string, string> = {
  commercial: T.checklist.ownerCommercial,
  operations: T.checklist.ownerOperations,
  identity: T.checklist.ownerIdentity,
  finance: T.checklist.ownerFinance
}

interface Props {
  organizationName: string
  /** TASK-1001 — org del caso; alimenta el panel interactivo de personas del portal. */
  organizationId: string
  data: LifecycleTimelineData | null
  /** Read failed — show the honest degraded state, never fake data. */
  degraded?: boolean
  /** When set, the empty-state CTA links here (the single front door). */
  startOnboardingHref?: string
  /** TASK-997 — checklist del caso activo (read-only). */
  checklist?: LifecycleChecklistItemVm[]
  /** TASK-997 — bases Notion ancladas (surface en provision_notion_workspace). */
  notionAnchors?: LifecycleNotionAnchorVm[]
  /** TASK-997 — equipo Teams anclado (surface en provision_communication_channels). */
  teamsAnchor?: LifecycleTeamsAnchorVm | null
}

const LifecycleTimeline = ({
  organizationName,
  organizationId,
  data,
  degraded,
  startOnboardingHref,
  checklist,
  notionAnchors,
  teamsAnchor
}: Props) => {
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
  const isHubspotOrigin = data.origin === 'hubspot_company' || data.origin === 'hubspot_sync'
  const completedStepCount = (checklist ?? []).filter(item => item.status === 'completed').length
  const totalStepCount = (checklist ?? []).length

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      {Header}

      {originLabel ? (
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 5 }}>
          <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {T.timeline.originLabel}
          </Typography>
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color='primary'
            icon={isHubspotOrigin ? <HubSpotIsotype size={14} /> : <i className='tabler-database-import' />}
            label={originLabel}
          />
        </Stack>
      ) : null}

      {/* Health banner — severity derived from facet rollup, not hardcoded.
          Cuando ya hay pasos completados (p. ej. lo que el wizard resolvió en el alta),
          el banner muestra PROGRESO honesto en vez de solo "faltan" (state-design). */}
      {data.pendingFacetCount > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-progress-alert' />} sx={{ mb: 5 }} role='status'>
          <AlertTitle sx={{ fontWeight: 600 }}>
            {completedStepCount > 0 ? T.timeline.progressTitle : T.timeline.atRiskTitle}
          </AlertTitle>
          {completedStepCount > 0
            ? T.timeline.progressDescription
                .replace('{completed}', String(completedStepCount))
                .replace('{total}', String(totalStepCount))
                .replace('{pending}', String(totalStepCount - completedStepCount))
            : T.timeline.atRiskDescription.replace('{count}', String(data.pendingFacetCount))}
        </Alert>
      ) : (
        <Alert severity='info' icon={<i className='tabler-route' />} sx={{ mb: 5 }} role='status'>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.timeline.healthyTitle}</AlertTitle>
          {T.timeline.healthyDescription}
        </Alert>
      )}

      {/* TASK-997 — checklist del caso + anchors capturados (read-only) */}
      {checklist && checklist.length > 0 ? (
        <Box sx={{ mb: 6 }}>
          <OperationalPanel title={T.checklist.title} subheader={T.checklist.subtitle} icon='tabler-checklist' iconColor='primary'>
            <Stack spacing={2}>
              {checklist.map((item, index) => {
                const st = CHECKLIST_STATUS[item.status]
                const isNotion = item.itemCode === 'provision_notion_workspace'
                const isTeams = item.itemCode === 'provision_communication_channels'
                const isPortalUsers = item.itemCode === 'provision_client_users_access'

                return (
                  <Box key={item.itemCode}>
                  <Stack
                    direction='row'
                    spacing={2}
                    alignItems='flex-start'
                    sx={{
                      p: 2.5,
                      borderRadius: `${theme.shape.customBorderRadius.md}px`,
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <CustomAvatar skin='light' color={st.color} size={32} variant='rounded'>
                      <i className={st.icon} style={{ fontSize: 16 }} />
                    </CustomAvatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {index + 1}. {item.itemLabel}
                        </Typography>
                        {item.required ? (
                          <CustomChip round='true' size='small' variant='tonal' color='secondary' label={T.checklist.requiredChip} />
                        ) : null}
                        {item.blocksCompletion ? (
                          <CustomChip round='true' size='small' variant='tonal' color='warning' label={T.checklist.blockingChip} />
                        ) : null}
                      </Stack>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {OWNER_LABEL[item.ownerRole] ?? item.ownerRole}
                      </Typography>

                      {isNotion && notionAnchors && notionAnchors.length > 0 ? (
                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                            {T.checklist.anchorNotionLabel}:
                          </Typography>
                          {notionAnchors.map(a => (
                            <CustomChip key={a.notionDatabaseId} round='true' size='small' variant='tonal' color='primary' icon={<i className='tabler-brand-notion' />} label={a.title} />
                          ))}
                        </Stack>
                      ) : null}

                      {isTeams && teamsAnchor ? (
                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                            {T.checklist.anchorTeamsLabel}:
                          </Typography>
                          <CustomChip round='true' size='small' variant='tonal' color='primary' icon={<i className='tabler-brand-teams' />} label={teamsAnchor.teamName} />
                        </Stack>
                      ) : null}
                    </Box>
                    <CustomChip round='true' size='small' variant='tonal' color={st.color} icon={<i className={st.icon} />} label={st.label} />
                  </Stack>
                  {isPortalUsers ? <PortalUsersPanel organizationId={organizationId} /> : null}
                  </Box>
                )
              })}
            </Stack>
          </OperationalPanel>
        </Box>
      ) : null}

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
