'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { CompositionShell, GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { getMicrocopy } from '@/lib/copy'
import { formatDate as formatGreenhouseDate } from '@/lib/format'
import type { WorkforceActivationIssue, WorkforceActivationLane, WorkforceActivationReadiness } from '@/lib/workforce/activation/types'
import type {
  HiringActivationBlockedReason,
  HiringActivationRequest,
  HiringActivationState
} from '@/lib/workforce/hiring-activation/types'

import CustomChip from '@core/components/mui/Chip'

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

type HiringActivationVisualState = HiringActivationState | 'ready_to_activate' | 'approved' | 'in_setup' | 'completed' | 'pending'

interface HiringActivationQueueItem {
  handoffId: string
  applicationId: string
  openingId: string
  openingTitle: string
  spaceId: string | null
  organizationId: string | null
  identityProfileId: string
  candidateFacetId: string
  personDisplayName: string | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  approvedSince: string
  downstreamRef: string | null
  request: HiringActivationRequest | null
}

interface HiringActivationQueueResult {
  enabled: boolean
  items: HiringActivationQueueItem[]
}

interface HiringHandoffDto {
  handoffId: string
  applicationId: string
  openingId: string
  decisionId: string
  identityProfileId: string
  candidateFacetId: string
  selectedDestination: string
  state: 'pending' | 'approved' | 'in_setup' | 'completed' | 'blocked' | 'cancelled'
  expectedLegalEntity: string | null
  tentativeStartDate: string | null
  downstreamRef: string | null
  blockedReason: string | null
  blockedDetail: string | null
  stateChangedAt: string
  createdAt: string
  updatedAt: string
}

interface HiringActivationDetail {
  handoff: HiringHandoffDto
  request: HiringActivationRequest | null
  readiness: WorkforceActivationReadiness | null
  readyToActivate: boolean
}

type SnackState = { severity: 'success' | 'error' | 'info'; message: string } | null

const copy = getMicrocopy().hiringActivation

const cardBorderSx = {
  border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  borderRadius: 'var(--mui-shape-customBorderRadius-lg)'
}

const activationNavShellSx = {
  inlineSize: '100%',
  maxInlineSize: '100%',
  bgcolor: 'background.paper',
  border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
  p: 1,
  overflow: 'hidden'
}

const activationNavButtonSx = (active: boolean) => ({
  flex: { xs: '1 1 100%', sm: '1 1 auto' },
  minBlockSize: (theme: Theme) => theme.spacing(9),
  minInlineSize: { xs: 0, sm: 156 },
  justifyContent: 'flex-start',
  borderRadius: 'var(--mui-shape-customBorderRadius-md)',
  color: active ? 'primary.main' : 'text.secondary',
  bgcolor: active ? 'primary.lightOpacity' : 'transparent',
  fontWeight: 700,
  textTransform: 'none',
  transition: (theme: Theme) =>
    theme.transitions.create(['background-color', 'color', 'transform'], {
      duration: theme.transitions.duration.shorter
    }),
  '&:hover': {
    bgcolor: active ? 'primary.lightOpacity' : 'action.hover',
    transform: 'translateY(-1px)'
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' }
  }
})

const statusColor: Record<HiringActivationVisualState | string, ChipColor> = {
  pending: 'secondary',
  pending_hr_review: 'warning',
  approved: 'info',
  in_setup: 'primary',
  blocked: 'error',
  member_created: 'primary',
  onboarding_open: 'info',
  ready_to_activate: 'success',
  active: 'success',
  completed: 'success',
  cancelled: 'default'
}

const statusIcon: Record<HiringActivationVisualState | string, string> = {
  pending: 'tabler-circle-dashed',
  pending_hr_review: 'tabler-eye-check',
  approved: 'tabler-circle-check',
  in_setup: 'tabler-progress',
  blocked: 'tabler-alert-triangle',
  member_created: 'tabler-user-check',
  onboarding_open: 'tabler-list-check',
  ready_to_activate: 'tabler-shield-check',
  active: 'tabler-circle-check',
  completed: 'tabler-circle-check',
  cancelled: 'tabler-circle-x'
}

const readinessColor: Record<WorkforceActivationLane['status'], ChipColor> = {
  ready: 'success',
  warning: 'warning',
  blocked: 'error',
  not_applicable: 'secondary'
}

const readinessIcon: Record<WorkforceActivationLane['status'], string> = {
  ready: 'tabler-circle-check',
  warning: 'tabler-alert-triangle',
  blocked: 'tabler-circle-x',
  not_applicable: 'tabler-minus'
}

const formatDate = (value?: string | null, fallback = '—') => {
  if (!value) return fallback

  const normalized = value.length === 10 ? `${value}T00:00:00` : value

  return formatGreenhouseDate(new Date(normalized), {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }, 'es-CL')
}

const formatDateTime = (value?: string | null, fallback = '—') => {
  if (!value) return fallback

  return formatGreenhouseDate(new Date(value), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }, 'es-CL')
}

const initials = (value?: string | null) => {
  if (!value?.trim()) return 'GH'

  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

const getStatusLabel = (state: string) => copy.statuses[state] ?? state

const getBlockedReasonLabel = (reason?: string | null) =>
  copy.blockedReasons[reason ?? 'unknown'] ?? copy.blockedReasons.unknown

const readJson = async <T,>(response: Response, fallbackError: string): Promise<T> => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : fallbackError

    throw new Error(message)
  }

  return payload as T
}

const deriveItemState = (item: HiringActivationQueueItem): HiringActivationVisualState => {
  if (item.request?.state) return item.request.state
  if (item.downstreamRef) return 'completed'

  return 'approved'
}

const deriveDetailState = (detail: HiringActivationDetail | null): HiringActivationVisualState => {
  if (!detail) return 'pending'

  const requestState = detail.request?.state

  if (requestState === 'active' || requestState === 'cancelled' || requestState === 'blocked') return requestState
  if (detail.readyToActivate && requestState === 'onboarding_open') return 'ready_to_activate'
  if (requestState) return requestState

  return detail.handoff.state
}

const iconSx = (size = 20) => ({
  fontSize: (theme: Theme) => theme.typography.pxToRem(size),
  lineHeight: 1
})

const StatusChip = ({ state, size = 'small' }: { state: HiringActivationVisualState | string; size?: 'small' | 'medium' }) => (
  <CustomChip
    round='true'
    size={size}
    variant='tonal'
    color={statusColor[state] ?? 'secondary'}
    icon={<Box component='i' className={statusIcon[state] ?? 'tabler-circle-dashed'} sx={iconSx(16)} />}
    label={getStatusLabel(state)}
  />
)

const MetricCard = ({
  color,
  icon,
  label,
  value,
  hint
}: {
  color: ChipColor
  icon: string
  label: string
  value: number | null
  hint: string
}) => (
  <Card
    elevation={0}
    sx={{
      ...cardBorderSx,
      minInlineSize: 0,
      transition: theme => theme.transitions.create(['border-color', 'background-color', 'transform'], {
        duration: theme.transitions.duration.shorter
      }),
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: `${color}.main`,
        bgcolor: `${color}.lightOpacity`
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': { transform: 'none' }
      }
    }}
  >
    <CardContent>
      <Stack direction='row' spacing={3} alignItems='center'>
        <Box
          sx={{
            inlineSize: theme => theme.spacing(11),
            blockSize: theme => theme.spacing(11),
            borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}.lightOpacity`,
            color: `${color}.main`,
            flex: '0 0 auto'
          }}
        >
          <Box component='i' className={icon} sx={iconSx(23)} />
        </Box>
        <Box sx={{ minInlineSize: 0 }}>
          <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {value == null ? copy.kpis.unavailable : <AnimatedCounter value={value} animateFrom={0} />}
          </Typography>
          <Typography fontWeight={700}>{label}</Typography>
          <Typography variant='caption' color='text.secondary'>{hint}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const QueueSkeleton = () => (
  <Stack spacing={2} data-capture='activation-lane-loading'>
    {[0, 1, 2, 3].map(item => (
      <Skeleton key={item} variant='rounded' height={86} />
    ))}
  </Stack>
)

const EmptyStateCard = ({
  icon,
  title,
  body,
  severity = 'info'
}: {
  icon: string
  title: string
  body: string
  severity?: 'info' | 'success' | 'warning' | 'error'
}) => (
  <Alert
    severity={severity}
    icon={<Box component='i' className={icon} sx={iconSx(22)} />}
    sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}
  >
    <AlertTitle>{title}</AlertTitle>
    {body}
  </Alert>
)

const QueuePanel = ({
  enabled,
  error,
  items,
  loading,
  onRetry,
  onSelect,
  selectedId
}: {
  enabled: boolean
  error: string | null
  items: HiringActivationQueueItem[]
  loading: boolean
  onRetry: () => void
  onSelect: (id: string) => void
  selectedId: string | null
}) => (
  <Card elevation={0} sx={{ ...cardBorderSx, overflow: 'hidden' }} data-capture='activation-lane'>
    <CardHeader
      title={copy.queue.title}
      subheader={`${items.length} ${copy.queue.subtitle}`}
      sx={{
        '& .MuiCardHeader-content': { minInlineSize: 0 },
        '& .MuiCardHeader-action': {
          alignSelf: 'center',
          m: 0,
          minInlineSize: 44,
          display: 'flex',
          justifyContent: 'center'
        }
      }}
      action={
        loading ? (
          <Box
            aria-hidden='true'
            sx={{
              minInlineSize: 44,
              inlineSize: 44,
              minBlockSize: 44,
              blockSize: 44,
              display: 'grid',
              placeItems: 'center',
              color: 'text.disabled'
            }}
          >
            <CircularProgress size={18} thickness={4} color='inherit' />
          </Box>
        ) : (
          <Tooltip title={copy.queue.retry}>
            <IconButton
              size='small'
              onClick={onRetry}
              aria-label={copy.queue.retry}
              sx={{
                minInlineSize: 44,
                inlineSize: 44,
                minBlockSize: 44,
                blockSize: 44
              }}
            >
              <Box component='i' className='tabler-refresh' sx={iconSx(18)} />
            </IconButton>
          </Tooltip>
        )
      }
    />
    <Divider />
    <CardContent>
      {!enabled ? (
        <EmptyStateCard icon='tabler-toggle-left' title={copy.queue.flagOffTitle} body={copy.queue.flagOffBody} severity='warning' />
      ) : error ? (
        <Stack spacing={3}>
          <EmptyStateCard icon='tabler-cloud-off' title={copy.queue.errorTitle} body={error} severity='error' />
          <Button variant='tonal' onClick={onRetry} startIcon={<Box component='i' className='tabler-refresh' />}>
            {copy.queue.retry}
          </Button>
        </Stack>
      ) : loading ? (
        <QueueSkeleton />
      ) : items.length === 0 ? (
        <EmptyStateCard icon='tabler-inbox' title={copy.queue.emptyTitle} body={copy.queue.emptyBody} severity='success' />
      ) : (
        <Stack spacing={2} aria-label={copy.aria.queue}>
          {items.map(item => {
            const state = deriveItemState(item)
            const selected = selectedId === item.handoffId

            return (
              <Box
                key={item.handoffId}
                component='button'
                type='button'
                onClick={() => onSelect(item.handoffId)}
                data-capture='activation-queue-row'
                aria-pressed={selected}
                sx={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  border: theme => `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                  borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
                  bgcolor: selected ? 'primary.lightOpacity' : 'background.paper',
                  color: 'text.primary',
                  p: 3,
                  cursor: 'pointer',
                  minInlineSize: 0,
                  transition: theme => theme.transitions.create(['border-color', 'background-color', 'transform'], {
                    duration: theme.transitions.duration.shorter
                  }),
                  '&:hover, &:focus-visible': {
                    borderColor: 'primary.main',
                    bgcolor: selected ? 'primary.lightOpacity' : 'action.hover',
                    transform: 'translateY(-1px)',
                    outline: 'none'
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover, &:focus-visible': { transform: 'none' }
                  }
                }}
              >
                <Stack direction='row' spacing={3} alignItems='center'>
                  <Avatar
                    variant='rounded'
                    sx={{
                      bgcolor: selected ? 'primary.main' : 'primary.lightOpacity',
                      color: selected ? 'primary.contrastText' : 'primary.main',
                      fontWeight: 700,
                      flex: '0 0 auto'
                    }}
                  >
                    {initials(item.personDisplayName)}
                  </Avatar>
                  <Box sx={{ minInlineSize: 0, flex: 1 }}>
                    <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' useFlexGap>
                      <Box sx={{ minInlineSize: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {item.personDisplayName ?? item.identityProfileId}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' noWrap>
                          {item.openingTitle}
                        </Typography>
                      </Box>
                      <StatusChip state={state} />
                    </Stack>
                    <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' sx={{ mt: 1 }}>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(item.approvedSince)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.expectedLegalEntity ?? copy.detail.entity}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}
    </CardContent>
  </Card>
)

const DetailMeta = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ minInlineSize: 0 }}>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
  </Box>
)

const JourneyStep = ({
  caption,
  label,
  status
}: {
  caption: string
  label: string
  status: 'done' | 'active' | 'waiting' | 'blocked'
}) => {
  const color: ChipColor = status === 'done' ? 'success' : status === 'blocked' ? 'error' : status === 'active' ? 'primary' : 'secondary'
  const icon = status === 'done' ? 'tabler-check' : status === 'blocked' ? 'tabler-alert-triangle' : status === 'active' ? 'tabler-loader-2' : 'tabler-clock'

  return (
    <Stack direction='row' spacing={3} alignItems='flex-start'>
      <Box
        sx={{
          inlineSize: theme => theme.spacing(8),
          blockSize: theme => theme.spacing(8),
          borderRadius: '999px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: `${color}.lightOpacity`,
          color: `${color}.main`,
          flex: '0 0 auto'
        }}
      >
        <Box component='i' className={icon} sx={iconSx(18)} />
      </Box>
      <Box sx={{ minInlineSize: 0, pb: 2 }}>
        <Typography fontWeight={700}>{label}</Typography>
        <Typography variant='body2' color='text.secondary'>{caption}</Typography>
      </Box>
    </Stack>
  )
}

const JourneyTimeline = ({ detail, item }: { detail: HiringActivationDetail; item: HiringActivationQueueItem | null }) => {
  const request = detail.request
  const detailState = deriveDetailState(detail)
  const hasMember = Boolean(request?.memberId)
  const hasOnboarding = Boolean(request?.onboardingInstanceId || request?.onboardingCaseId)
  const active = request?.state === 'active'
  const blocked = detailState === 'blocked'

  const steps = [
    {
      label: copy.journey.selection,
      caption: item?.approvedSince ? formatDateTime(item.approvedSince) : formatDateTime(detail.handoff.stateChangedAt),
      status: 'done' as const
    },
    {
      label: copy.journey.handoff,
      caption: detail.handoff.handoffId,
      status: blocked && !request ? 'blocked' as const : 'done' as const
    },
    {
      label: copy.journey.member,
      caption: request?.memberId ?? copy.journey.waiting,
      status: blocked && !hasMember ? 'blocked' as const : hasMember ? 'done' as const : request ? 'active' as const : 'waiting' as const
    },
    {
      label: copy.journey.onboarding,
      caption: request?.onboardingInstanceId ?? request?.onboardingCaseId ?? copy.journey.waiting,
      status: blocked && hasMember && !hasOnboarding ? 'blocked' as const : hasOnboarding ? 'done' as const : hasMember ? 'active' as const : 'waiting' as const
    },
    {
      label: copy.journey.activation,
      caption: active ? copy.journey.done : detail.readyToActivate ? copy.statuses.ready_to_activate : copy.journey.waiting,
      status: active ? 'done' as const : blocked ? 'blocked' as const : detail.readyToActivate ? 'active' as const : 'waiting' as const
    }
  ]

  return (
    <Stack spacing={1} data-capture='activation-journey'>
      {steps.map(step => <JourneyStep key={step.label} {...step} />)}
    </Stack>
  )
}

const ReadinessIssueList = ({ issues }: { issues: readonly WorkforceActivationIssue[] }) => {
  if (issues.length === 0) return null

  return (
    <Stack spacing={1.5}>
      {issues.slice(0, 4).map(issue => (
        <Alert
          key={`${issue.code}-${issue.lane}`}
          severity={issue.code.includes('missing') || issue.code.includes('blocked') ? 'warning' : 'info'}
          sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-md)' }}
        >
          <Typography fontWeight={700}>{issue.label}</Typography>
          <Typography variant='body2'>{issue.detail}</Typography>
        </Alert>
      ))}
    </Stack>
  )
}

const ReadinessPanel = ({
  detail
}: {
  detail: HiringActivationDetail
}) => {
  const readiness = detail.readiness

  if (!readiness) {
    return (
      <Alert
        severity='info'
        data-capture='activation-readiness-degraded'
        sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}
      >
        <AlertTitle>{copy.readiness.noRowsTitle}</AlertTitle>
        {copy.detail.readinessDegraded}
      </Alert>
    )
  }

  return (
    <Stack spacing={4} aria-label={copy.aria.readiness} data-capture='activation-readiness'>
      <Stack spacing={1.5}>
        <Stack direction='row' justifyContent='space-between' spacing={3}>
          <Typography variant='subtitle2'>{copy.readiness.score}</Typography>
          <Typography variant='subtitle2' color={readiness.ready ? 'success.main' : readiness.blockerCount > 0 ? 'error.main' : 'warning.main'}>
            {readiness.readinessScore}%
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={readiness.readinessScore}
          color={readiness.ready ? 'success' : readiness.blockerCount > 0 ? 'error' : 'warning'}
          sx={{ blockSize: 8, borderRadius: '999px' }}
        />
        <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
          <CustomChip round='true' size='small' variant='tonal' color={readiness.blockerCount > 0 ? 'error' : 'success'} label={`${copy.readiness.blockers}: ${readiness.blockerCount}`} />
          <CustomChip round='true' size='small' variant='tonal' color={readiness.warningCount > 0 ? 'warning' : 'success'} label={`${copy.readiness.warnings}: ${readiness.warningCount}`} />
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {readiness.lanes.map(lane => (
          <Box
            key={lane.key}
            sx={{
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: 'var(--mui-shape-customBorderRadius-md)',
              p: 3,
              minInlineSize: 0
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between'>
              <Box sx={{ minInlineSize: 0 }}>
                <Typography fontWeight={700}>{lane.label}</Typography>
                <Typography variant='body2' color='text.secondary'>{lane.detail}</Typography>
                <Typography variant='caption' color='text.secondary'>{lane.owner}</Typography>
              </Box>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={readinessColor[lane.status]}
                icon={<Box component='i' className={readinessIcon[lane.status]} sx={iconSx(16)} />}
                label={copy.readiness[lane.status === 'not_applicable' ? 'notApplicable' : lane.status]}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
              />
            </Stack>
          </Box>
        ))}
      </Stack>

      <ReadinessIssueList issues={[...readiness.blockers, ...readiness.warnings]} />
    </Stack>
  )
}

const DetailPanel = ({
  actionLoading,
  detail,
  detailLoading,
  item,
  onActivate,
  onCancel,
  onOpenOnboarding,
  onCreateMember,
  onResolve,
  onReview
}: {
  actionLoading: string | null
  detail: HiringActivationDetail | null
  detailLoading: boolean
  item: HiringActivationQueueItem | null
  onActivate: () => void
  onCancel: () => void
  onOpenOnboarding: () => void
  onCreateMember: () => void
  onResolve: () => void
  onReview: () => void
}) => {
  if (detailLoading) {
    return (
      <Card elevation={0} sx={cardBorderSx} data-capture='activation-detail-loading'>
        <CardContent>
          <Stack spacing={4}>
            <Skeleton variant='rounded' height={92} />
            <Skeleton variant='rounded' height={180} />
            <Skeleton variant='rounded' height={260} />
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (!detail) {
    return (
      <Card elevation={0} sx={cardBorderSx} data-capture='activation-detail-empty'>
        <CardContent sx={{ py: 10 }}>
          <Stack alignItems='center' spacing={2} textAlign='center'>
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main' }}>
              <Box component='i' className='tabler-route-square' sx={iconSx(24)} />
            </Avatar>
            <Box>
              <Typography variant='h5'>{copy.detail.pendingTitle}</Typography>
              <Typography color='text.secondary'>{copy.detail.pendingBody}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const state = deriveDetailState(detail)
  const request = detail.request
  const memberId = request?.memberId
  const blockedReason = request?.blockedReason ?? detail.handoff.blockedReason
  const blockerDetail = request?.blockedDetail ?? detail.handoff.blockedDetail
  const activationDisabledReason = detail.readyToActivate ? copy.detail.activateReady : copy.detail.activateDisabled
  const busy = Boolean(actionLoading)

  const renderPrimaryAction = () => {
    if (!request) {
      return (
        <Button variant='contained' onClick={onReview} disabled={busy} startIcon={<Box component='i' className='tabler-eye-check' />}>
          {actionLoading === 'review' ? copy.actions.loading : copy.actions.review}
        </Button>
      )
    }

    if (request.state === 'pending_hr_review') {
      return (
        <Button variant='contained' onClick={onCreateMember} disabled={busy} startIcon={<Box component='i' className='tabler-user-plus' />}>
          {actionLoading === 'create-member' ? copy.actions.loading : copy.actions.createMember}
        </Button>
      )
    }

    if (request.state === 'blocked') {
      return (
        <Button variant='contained' color='warning' onClick={onResolve} disabled={busy} startIcon={<Box component='i' className='tabler-tool' />}>
          {copy.actions.resolveBlocker}
        </Button>
      )
    }

    if (request.state === 'member_created') {
      return (
        <Button variant='contained' onClick={onOpenOnboarding} disabled={busy} startIcon={<Box component='i' className='tabler-list-check' />}>
          {actionLoading === 'open-onboarding' ? copy.actions.loading : copy.actions.openOnboarding}
        </Button>
      )
    }

    if (request.state === 'onboarding_open' && !detail.readyToActivate) {
      return (
        <Button
          component={Link}
          href={memberId ? `/hr/workforce/activation?memberId=${encodeURIComponent(memberId)}` : '/hr/workforce/activation'}
          variant='contained'
          color='info'
          startIcon={<Box component='i' className='tabler-clipboard-check' />}
        >
          {copy.actions.goToWorkforceActivation}
        </Button>
      )
    }

    if (detail.readyToActivate && request.state !== 'active' && request.state !== 'cancelled') {
      return (
        <Button variant='contained' color='success' onClick={onActivate} disabled={busy} startIcon={<Box component='i' className='tabler-shield-check' />}>
          {copy.actions.activate}
        </Button>
      )
    }

    return null
  }

  return (
    <Card
      elevation={0}
      sx={{
        ...cardBorderSx,
        overflow: 'hidden',
        position: 'sticky',
        top: theme => theme.spacing(4)
      }}
      data-capture='activation-detail'
    >
      <CardContent>
        <Stack spacing={5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Stack direction='row' spacing={3} alignItems='center' sx={{ minInlineSize: 0 }}>
              <Avatar
                variant='rounded'
                sx={{
                  inlineSize: theme => theme.spacing(14),
                  blockSize: theme => theme.spacing(14),
                  bgcolor: `${statusColor[state] ?? 'primary'}.lightOpacity`,
                  color: `${statusColor[state] ?? 'primary'}.main`,
                  fontWeight: 800
                }}
              >
                {initials(item?.personDisplayName)}
              </Avatar>
              <Box sx={{ minInlineSize: 0 }}>
                <Typography variant='h4' sx={{ overflowWrap: 'anywhere' }}>
                  {item?.personDisplayName ?? detail.handoff.identityProfileId}
                </Typography>
                <Typography color='text.secondary'>{item?.openingTitle ?? detail.handoff.openingId}</Typography>
                <Stack direction='row' spacing={1.5} sx={{ mt: 1 }} useFlexGap flexWrap='wrap'>
                  <StatusChip state={state} />
                  {blockedReason ? <CustomChip round='true' size='small' color='error' variant='tonal' label={getBlockedReasonLabel(blockedReason)} /> : null}
                </Stack>
              </Box>
            </Stack>
            <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
              {memberId ? (
                <Button component={Link} href={`/people/${encodeURIComponent(memberId)}`} variant='tonal' size='small' startIcon={<Box component='i' className='tabler-user-circle' />}>
                  {copy.detail.people360}
                </Button>
              ) : null}
              <Button
                component={Link}
                href={memberId ? `/hr/workforce/activation?memberId=${encodeURIComponent(memberId)}` : '/hr/workforce/activation'}
                variant='tonal'
                size='small'
                color='info'
                startIcon={<Box component='i' className='tabler-clipboard-check' />}
              >
                Workforce Activation
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 3,
              p: 4,
              borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
              bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
              border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              '& > *': { minInlineSize: 0 }
            }}
          >
            <DetailMeta label={copy.detail.source} value='Hiring' />
            <DetailMeta label={copy.detail.handoff} value={detail.handoff.handoffId} />
            <DetailMeta label={copy.detail.decision} value={detail.handoff.decisionId} />
            <DetailMeta label={copy.detail.entity} value={detail.handoff.expectedLegalEntity ?? item?.expectedLegalEntity ?? '—'} />
            <DetailMeta label={copy.detail.area} value={item?.openingTitle ?? detail.handoff.openingId} />
            <DetailMeta label='Inicio' value={formatDate(detail.handoff.tentativeStartDate ?? item?.tentativeStartDate)} />
          </Box>

          {blockedReason ? (
            <Alert
              severity='error'
              data-capture='activation-blocker-banner'
              sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}
              action={
                <Button color='inherit' size='small' onClick={onResolve}>
                  {copy.actions.resolveBlocker}
                </Button>
              }
            >
              <AlertTitle>{copy.detail.blockerTitle}: {getBlockedReasonLabel(blockedReason)}</AlertTitle>
              {blockerDetail ?? copy.dialogs.resolveBody}
            </Alert>
          ) : (
            <Alert severity={detail.readyToActivate ? 'success' : 'info'} sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}>
              {detail.readyToActivate ? copy.detail.activateReady : copy.detail.completeWorkforceProfile}
            </Alert>
          )}

          <Stack spacing={3}>
            <Typography variant='h6'>{copy.detail.journeyTitle}</Typography>
            <JourneyTimeline detail={detail} item={item} />
          </Stack>

          <Divider />

          <Stack spacing={3}>
            <Typography variant='h6'>{copy.detail.readinessTitle}</Typography>
            <ReadinessPanel detail={detail} />
          </Stack>

          <Divider />

          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
              pt: 2,
              pb: 1,
              zIndex: 1
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Typography variant='body2' color='text.secondary'>
                {activationDisabledReason}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {renderPrimaryAction()}
                {request && request.state !== 'active' && request.state !== 'cancelled' ? (
                  <Button variant='outlined' color='error' onClick={onCancel} disabled={busy}>
                    {copy.actions.cancel}
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

const HiringActivationLaneView = () => {
  const [enabled, setEnabled] = useState(true)
  const [items, setItems] = useState<HiringActivationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<HiringActivationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [snack, setSnack] = useState<SnackState>(null)
  const [activateOpen, setActivateOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const selectedItem = useMemo(
    () => items.find(item => item.handoffId === selectedId) ?? null,
    [items, selectedId]
  )

  const queueMetrics = useMemo(() => {
    const blockers = items.filter(item => item.request?.state === 'blocked').length
    const activated = items.filter(item => item.request?.state === 'active').length
    const readyKnown = detail?.readyToActivate ? 1 : 0

    return { blockers, activated, readyKnown }
  }, [detail?.readyToActivate, items])

  const loadDetail = useCallback(async (handoffId: string) => {
    setDetailLoading(true)

    try {
      const payload = await readJson<HiringActivationDetail>(
        await fetch(`/api/hr/hiring-activation/${encodeURIComponent(handoffId)}`),
        copy.feedback.loadError
      )

      setDetail(payload)
    } catch (err) {
      setDetail(null)
      setSnack({ severity: 'error', message: err instanceof Error ? err.message : copy.feedback.loadError })
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = await readJson<HiringActivationQueueResult>(
        await fetch('/api/hr/hiring-activation?limit=50'),
        copy.feedback.loadError
      )

      setEnabled(payload.enabled)
      setItems(payload.items)
      setSelectedId(current => {
        if (!payload.enabled || payload.items.length === 0) return null
        if (current && payload.items.some(item => item.handoffId === current)) return current

        return payload.items[0]?.handoffId ?? null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.feedback.loadError

      setError(message)
      setItems([])
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    if (!enabled || !selectedId) {
      setDetail(null)

      return
    }

    void loadDetail(selectedId)
  }, [enabled, loadDetail, selectedId])

  const runAction = async (action: 'review' | 'create-member' | 'open-onboarding' | 'complete' | 'cancel', successMessage: string, body?: Record<string, unknown>) => {
    if (!selectedId) return

    setActionLoading(action)

    try {
      await readJson<HiringActivationRequest>(
        await fetch(`/api/hr/hiring-activation/${encodeURIComponent(selectedId)}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        }),
        copy.feedback.commandError
      )

      setSnack({ severity: 'success', message: successMessage })
      await loadQueue()
      await loadDetail(selectedId)
    } catch (err) {
      setSnack({ severity: 'error', message: err instanceof Error ? err.message : copy.feedback.commandError })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    await runAction('cancel', copy.feedback.cancelOk, { reasonDetail: cancelReason.trim() || 'Cancelado desde Hiring Activation Lane.' })
    setCancelOpen(false)
    setCancelReason('')
  }

  const blockedReason = detail?.request?.blockedReason ?? detail?.handoff.blockedReason
  const memberId = detail?.request?.memberId ?? null

  return (
    <Stack spacing={6}>
      <Card
        elevation={0}
        sx={{
          ...cardBorderSx,
          overflow: 'hidden',
          background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.09)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 46%, ${alpha(theme.palette.success.main, 0.08)} 100%)`
        }}
        data-capture='activation-hero'
      >
        <CardContent>
          <Stack spacing={4}>
            <GreenhouseBreadcrumbs
              kind='pageHierarchy'
              motion='subtle'
              dataCapture='activation-breadcrumbs'
              items={[
                { label: copy.navigation.hr, href: '/hr', iconClassName: 'tabler-users-group' },
                { label: copy.tabs.onboarding, href: '/hr/onboarding' },
                { label: copy.tabs.readyHires }
              ]}
            />

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={5} justifyContent='space-between'>
              <Box sx={{ maxInlineSize: 760 }}>
                <Typography variant='overline' color='primary.main'>{copy.eyebrow}</Typography>
                <Typography variant='h3' sx={{ mt: 1 }}>{copy.title}</Typography>
                <Typography color='text.secondary' sx={{ mt: 2 }}>
                  {copy.subtitle}
                </Typography>
              </Box>

              <Stack spacing={2} alignItems={{ xs: 'stretch', lg: 'flex-end' }}>
                <Box component='nav' aria-label={copy.aria.activationTabs} sx={activationNavShellSx}>
                  <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                    <Button component={Link} href='/hr/onboarding' sx={activationNavButtonSx(false)}>
                      {copy.tabs.onboarding}
                    </Button>
                    <Button component={Link} href='/hr/offboarding' sx={activationNavButtonSx(false)}>
                      {copy.tabs.offboarding}
                    </Button>
                    <Button component={Link} href='/hr/onboarding?lane=hiring-activation' aria-current='page' sx={activationNavButtonSx(true)}>
                      {copy.tabs.readyHires}
                    </Button>
                  </Stack>
                </Box>
                <Stack direction='row' spacing={2} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }} useFlexGap flexWrap='wrap'>
                  <Button component={Link} href='/hr/onboarding/templates' variant='tonal' startIcon={<Box component='i' className='tabler-template' />}>
                    {copy.actions.openTemplates}
                  </Button>
                  <Button component={Link} href='/hr/workforce/activation' variant='tonal' color='info' startIcon={<Box component='i' className='tabler-clipboard-check' />}>
                    Workforce Activation
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
          gap: 4,
          '& > *': { minInlineSize: 0 }
        }}
      >
        <MetricCard color='primary' icon='tabler-users-plus' label={copy.kpis.queue} value={enabled ? items.length : null} hint={copy.kpis.queueHint} />
        <MetricCard color='success' icon='tabler-shield-check' label={copy.kpis.ready} value={enabled ? queueMetrics.readyKnown : null} hint={copy.kpis.readyHint} />
        <MetricCard color={queueMetrics.blockers > 0 ? 'error' : 'success'} icon='tabler-alert-triangle' label={copy.kpis.blockers} value={enabled ? queueMetrics.blockers : null} hint={copy.kpis.blockersHint} />
        <MetricCard color='info' icon='tabler-circle-check' label={copy.kpis.activated} value={enabled ? queueMetrics.activated : null} hint={copy.kpis.activatedHint} />
      </Box>

      {error ? (
        <Alert
          severity='error'
          action={<Button color='inherit' size='small' onClick={() => void loadQueue()}>{copy.queue.retry}</Button>}
          sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}
        >
          <AlertTitle>{copy.queue.errorTitle}</AlertTitle>
          {error}
        </Alert>
      ) : null}

      <CompositionShell
        composition='masterDetail'
        state='composed'
        detailLabel={copy.detail.title}
        asideLabel={copy.queue.title}
        instanceId='hiring-activation-lane'
        regions={{
          aside: (
            <QueuePanel
              enabled={enabled}
              error={error}
              items={items}
              loading={loading}
              onRetry={() => void loadQueue()}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          ),
          primary: (
            <DetailPanel
              actionLoading={actionLoading}
              detail={detail}
              detailLoading={detailLoading}
              item={selectedItem}
              onActivate={() => setActivateOpen(true)}
              onCancel={() => setCancelOpen(true)}
              onCreateMember={() => void runAction('create-member', copy.feedback.createMemberOk)}
              onOpenOnboarding={() => void runAction('open-onboarding', copy.feedback.openOnboardingOk)}
              onResolve={() => setResolveOpen(true)}
              onReview={() => void runAction('review', copy.feedback.reviewOk)}
            />
          )
        }}
      />

      <Dialog open={activateOpen} onClose={() => setActivateOpen(false)} aria-labelledby='activation-confirm-title'>
        <DialogTitle id='activation-confirm-title'>{copy.dialogs.activateTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{copy.dialogs.activateBody}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivateOpen(false)} disabled={actionLoading === 'complete'}>{copy.actions.close}</Button>
          <Button
            variant='contained'
            color='success'
            onClick={async () => {
              await runAction('complete', copy.feedback.completeOk)
              setActivateOpen(false)
            }}
            disabled={actionLoading === 'complete'}
            startIcon={actionLoading === 'complete' ? <CircularProgress size={16} color='inherit' /> : <Box component='i' className='tabler-shield-check' />}
          >
            {actionLoading === 'complete' ? copy.actions.loading : copy.actions.activate}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} aria-labelledby='activation-cancel-title' fullWidth maxWidth='sm'>
        <DialogTitle id='activation-cancel-title'>{copy.dialogs.cancelTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <DialogContentText>{copy.dialogs.cancelBody}</DialogContentText>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={copy.dialogs.cancelReasonLabel}
              value={cancelReason}
              onChange={event => setCancelReason(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={actionLoading === 'cancel'}>{copy.actions.close}</Button>
          <Button
            variant='contained'
            color='error'
            onClick={() => void handleCancel()}
            disabled={actionLoading === 'cancel'}
            startIcon={actionLoading === 'cancel' ? <CircularProgress size={16} color='inherit' /> : <Box component='i' className='tabler-circle-x' />}
          >
            {actionLoading === 'cancel' ? copy.actions.loading : copy.actions.cancel}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} aria-labelledby='activation-resolve-title' fullWidth maxWidth='sm'>
        <DialogTitle id='activation-resolve-title'>{copy.dialogs.resolveTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity='warning' sx={{ borderRadius: 'var(--mui-shape-customBorderRadius-lg)' }}>
              <AlertTitle>{blockedReason ? getBlockedReasonLabel(blockedReason as HiringActivationBlockedReason) : copy.detail.blockerTitle}</AlertTitle>
              {copy.dialogs.resolveBody}
            </Alert>
            <Typography variant='body2' color='text.secondary'>{copy.dialogs.resolvePendingTask}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {blockedReason === 'onboarding_template_missing' ? (
                <Button component={Link} href='/hr/onboarding/templates' variant='contained' startIcon={<Box component='i' className='tabler-template' />}>
                  {copy.actions.openTemplates}
                </Button>
              ) : null}
              {memberId ? (
                <Button component={Link} href={`/hr/workforce/activation?memberId=${encodeURIComponent(memberId)}`} variant='tonal' startIcon={<Box component='i' className='tabler-clipboard-check' />}>
                  {copy.actions.goToWorkforceActivation}
                </Button>
              ) : null}
              {memberId ? (
                <Button component={Link} href={`/people/${encodeURIComponent(memberId)}`} variant='text' startIcon={<Box component='i' className='tabler-user-circle' />}>
                  {copy.detail.people360}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>{copy.actions.close}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4200}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant='filled' onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  )
}

export default HiringActivationLaneView
