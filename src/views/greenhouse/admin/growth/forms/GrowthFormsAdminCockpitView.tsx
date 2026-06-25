'use client'

import type { FormEvent, KeyboardEvent } from 'react'
import { useMemo, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import { AnimatedCounter } from '@/components/greenhouse'
import { AdaptiveSidecarLayout, CompositionShell, GreenhouseBreadcrumbs, GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { Motion } from '@/components/greenhouse/motion'
import { GH_GROWTH_FORMS } from '@/lib/copy/growth-forms'
import { formatDateTime } from '@/lib/format'
import type {
  GrowthFormsCockpitDestinationVm,
  GrowthFormsCockpitSubmissionVm,
  GrowthFormsCockpitSurfaceVm,
  GrowthFormsCockpitVm,
  GrowthFormsHealthState,
} from '@/lib/growth/forms/readers'

type SidecarMode = 'inspector' | 'composer' | 'evidence'

type DraftFormState = {
  name: string
  slug: string
  purpose: string
  formKind: 'lead_magnet' | 'subscribe' | 'contact' | 'diagnostic_intake'
  riskProfile: 'low' | 'medium' | 'high'
}

const HEALTH_TONE: Record<GrowthFormsHealthState, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'info',
  setup: 'warning',
  ready: 'info',
  healthy: 'success',
  attention: 'warning',
  dead_letter: 'error',
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  published: 'success',
  delivered: 'success',
  succeeded: 'success',
  review: 'info',
  draft: 'info',
  ready: 'info',
  accepted: 'info',
  routed: 'info',
  retrying: 'warning',
  destination_failed: 'warning',
  pending: 'warning',
  rejected: 'error',
  failed: 'error',
  dead_letter: 'error',
  archived: 'default',
  deprecated: 'default',
}

const STATUS_LABELS = GH_GROWTH_FORMS.statuses

const formatStatus = (status: string | null | undefined) => {
  if (!status) return 'N/A'

  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status.replaceAll('_', ' ')
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A'

  return formatDateTime(value, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', fallback: 'N/A' }, 'es-CL')
}

const compactId = (value: string | null | undefined) => (value ? `${value.slice(0, 8)}...` : 'N/A')

const formatPercent = (value: number) => `${value}%`

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const defaultDraftState: DraftFormState = {
  name: GH_GROWTH_FORMS.starter.defaultName,
  slug: GH_GROWTH_FORMS.starter.defaultSlug,
  purpose: GH_GROWTH_FORMS.starter.defaultPurpose,
  formKind: 'lead_magnet',
  riskProfile: 'low',
}

const buildStarterPayload = (state: DraftFormState) => ({
  slug: state.slug,
  name: state.name,
  formKind: state.formKind,
  purpose: state.purpose,
  riskProfile: state.riskProfile,
  fieldSchema: [
    {
      key: 'email',
      type: 'email',
      label: GH_GROWTH_FORMS.starter.emailLabel,
      required: true,
      autocomplete: 'email',
    },
    {
      key: 'company',
      type: 'text',
      label: GH_GROWTH_FORMS.starter.companyLabel,
      required: true,
      autocomplete: 'organization',
    },
    {
      key: 'interest',
      type: 'select',
      label: GH_GROWTH_FORMS.starter.interestLabel,
      required: true,
      options: [
        { value: 'ai_visibility', label: GH_GROWTH_FORMS.starter.interestAiVisibility },
        { value: 'automation', label: GH_GROWTH_FORMS.starter.interestAutomation },
        { value: 'growth_ops', label: GH_GROWTH_FORMS.starter.interestGrowthOps },
      ],
    },
    {
      key: 'consent',
      type: 'consent',
      label: GH_GROWTH_FORMS.starter.consentLabel,
      required: true,
    },
  ],
  successBehavior: {
    kind: 'review_pending',
    message: GH_GROWTH_FORMS.starter.successMessage,
  },
  consentPolicyVersion: 'growth-public-forms.v1',
  dataClassification: {
    fields: {
      email: 'contact_pii',
      company: 'company',
      interest: 'public',
      consent: 'consent_evidence',
    },
  },
  analyticsPolicy: {
    enabled: true,
    fieldLevelAnalyticsDisabled: true,
  },
})

const sectionSurfaceSx = {
  border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
  borderRadius: (theme: Theme) => `${theme.shape.customBorderRadius.md}px`,
  bgcolor: 'background.paper',
  boxShadow: (theme: Theme) => `0 18px 48px ${alpha(theme.palette.common.black, 0.08)}`,
} satisfies SxProps<Theme>

const sectionTitleSx = {
  color: 'text.primary',
} satisfies SxProps<Theme>

const MetricTile = ({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: string
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info'
}) => (
  <Box
    sx={{
      ...sectionSurfaceSx,
      p: 2,
      minWidth: 0,
      display: 'grid',
      gap: 1,
    }}
  >
    <Stack direction='row' alignItems='center' spacing={1} sx={{ minWidth: 0 }}>
      <Box
        aria-hidden='true'
        sx={theme => ({
          display: 'inline-grid',
          placeItems: 'center',
          inlineSize: 32,
          blockSize: 32,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          bgcolor: tone === 'default' ? 'action.hover' : `${tone}.lightOpacity`,
          color: tone === 'default' ? 'text.primary' : `${tone}.main`,
          flex: '0 0 auto',
        })}
      >
        <i className={icon} />
      </Box>
      <Typography variant='caption' color='text.primary' sx={{ minWidth: 0 }}>
        {label}
      </Typography>
    </Stack>
    <Typography variant='kpiValue' sx={{ lineHeight: 1, overflowWrap: 'anywhere' }}>
      {typeof value === 'number' ? <AnimatedCounter value={value} animateFrom={0} duration={0.55} /> : value}
    </Typography>
  </Box>
)

const OperationalPulse = ({ data }: { data: GrowthFormsCockpitVm }) => {
  const publishedCoverage = data.summary.totalForms > 0 ? Math.round((data.summary.publishedForms / data.summary.totalForms) * 100) : 0
  const hasDeliveryRisk = data.summary.deadLetters > 0 || data.summary.retryQueue > 0
  const governedCoverage = data.summary.totalForms > 0 ? Math.round((data.summary.activeSurfaces / data.summary.totalForms) * 100) : 0

  return (
    <Box
      aria-label={GH_GROWTH_FORMS.aria.operationalPulse}
      data-capture='growth-forms-operational-pulse'
      sx={{
        ...sectionSurfaceSx,
        p: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'center',
        minWidth: 0,
      }}
    >
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
          <Typography variant='overline' color='text.primary'>
            {GH_GROWTH_FORMS.sections.operationalPulse}
          </Typography>
          <GreenhouseChip
            kind='status'
            size='small'
            variant='label'
            tone={hasDeliveryRisk ? 'warning' : 'success'}
            iconClassName={hasDeliveryRisk ? 'tabler-alert-triangle' : 'tabler-shield-check'}
            label={hasDeliveryRisk ? GH_GROWTH_FORMS.insights.retryQueuePending : GH_GROWTH_FORMS.insights.noDeadLetters}
          />
        </Stack>
        <Typography variant='h5'>{GH_GROWTH_FORMS.insights.migrationReadiness}</Typography>
        <Typography variant='body2' color='text.primary' sx={{ maxWidth: '66ch' }}>
          {GH_GROWTH_FORMS.helper.rowSelection}
        </Typography>
      </Stack>

      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
          <Typography variant='body2' color='text.primary'>
            {GH_GROWTH_FORMS.insights.publishedCoverage}
          </Typography>
          <Typography variant='monoId'>{formatPercent(publishedCoverage)}</Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={publishedCoverage}
          aria-label={GH_GROWTH_FORMS.insights.publishedCoverage}
          sx={{ blockSize: 8, borderRadius: 999, bgcolor: theme => alpha(theme.palette.primary.main, 0.1) }}
        />
      </Stack>

      <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ minWidth: 0 }}>
        <GreenhouseChip
          kind='metric'
          size='small'
          variant='label'
          tone={hasDeliveryRisk ? 'warning' : 'success'}
          iconClassName={hasDeliveryRisk ? 'tabler-rotate-clockwise' : 'tabler-circle-check'}
          label={hasDeliveryRisk ? GH_GROWTH_FORMS.insights.retryQueuePending : GH_GROWTH_FORMS.insights.retryQueueClear}
        />
        <GreenhouseChip
          kind='metric'
          size='small'
          variant='label'
          tone='info'
          iconClassName='tabler-browser-check'
          label={`${GH_GROWTH_FORMS.insights.governedSurfaces}: ${formatPercent(governedCoverage)}`}
        />
      </Stack>
    </Box>
  )
}

const StatusChip = ({ status, tone }: { status: string | null | undefined; tone?: 'default' | 'success' | 'warning' | 'error' | 'info' }) => (
  <GreenhouseChip
    kind='status'
    size='small'
    variant='label'
    tone={tone ?? STATUS_TONE[status ?? ''] ?? 'default'}
    label={formatStatus(status)}
  />
)

const DestinationList = ({ destinations }: { destinations: GrowthFormsCockpitDestinationVm[] }) => {
  if (destinations.length === 0) {
    return (
      <Typography variant='body2' color='text.primary'>
        {GH_GROWTH_FORMS.helper.noDestinations}
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {destinations.map(destination => (
        <Box
          key={destination.destinationId}
          sx={{
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
            p: 1.5,
            minWidth: 0,
          }}
        >
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
          <Typography variant='subtitle2' sx={{ ...sectionTitleSx, minWidth: 0, overflowWrap: 'anywhere' }}>
            {destination.provider}
          </Typography>
            <StatusChip status={destination.enabled ? destination.endpointStatus : 'disabled'} tone={destination.enabled ? undefined : 'default'} />
          </Stack>
          <Typography variant='caption' color='text.primary'>
            {destination.adapterKind} · {destination.deliveryMode} · {compactId(destination.destinationId)}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

const SurfaceList = ({ surfaces }: { surfaces: GrowthFormsCockpitSurfaceVm[] }) => (
  <Stack spacing={1}>
    {surfaces.slice(0, 4).map(surface => (
      <Box
        key={surface.surfaceId}
        sx={{
          display: 'grid',
          gap: 0.5,
          border: theme => `1px solid ${theme.palette.divider}`,
          borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
          p: 1.5,
          minWidth: 0,
        }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
          <Typography variant='subtitle2' sx={{ ...sectionTitleSx, minWidth: 0, overflowWrap: 'anywhere' }}>
            {surface.surfaceName}
          </Typography>
          <StatusChip status={surface.status} />
        </Stack>
        <Typography variant='caption' color='text.primary'>
          {surface.surfaceKind} · {surface.rendererChannel} · {surface.originAllowlist[0] ?? 'origin governed'}
        </Typography>
      </Box>
    ))}
  </Stack>
)

const SubmissionsList = ({
  submissions,
  onOpenEvidence,
}: {
  submissions: GrowthFormsCockpitSubmissionVm[]
  onOpenEvidence: () => void
}) => {
  if (submissions.length === 0) {
    return (
      <Typography variant='body2' color='text.primary'>
        {GH_GROWTH_FORMS.helper.noSubmissions}
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {submissions.slice(0, 5).map(submission => (
        <Box
          key={submission.submissionId}
          sx={{
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
            p: 1.5,
            minWidth: 0,
          }}
        >
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
            <Typography variant='monoId' color='text.primary'>{compactId(submission.submissionId)}</Typography>
            <StatusChip status={submission.status} />
          </Stack>
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ mt: 0.75 }}>
            <Typography variant='caption' color='text.primary'>
              {formatDate(submission.createdAt)} · {submission.attempts.length} {GH_GROWTH_FORMS.units.attempts}
            </Typography>
            <GreenhouseButton
              size='small'
              variant='text'
              kind='custom'
              trailingIconClassName='tabler-arrow-right'
              onClick={onOpenEvidence}
            >
              {GH_GROWTH_FORMS.actions.openEvidence}
            </GreenhouseButton>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

const EvidenceLedger = ({ submissions }: { submissions: GrowthFormsCockpitSubmissionVm[] }) => {
  const attempts = submissions.flatMap(submission => submission.attempts.map(attempt => ({ ...attempt, submission }))).slice(0, 12)

  return (
    <Stack spacing={2}>
      {submissions[0]?.consent ? (
        <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
          <Typography variant='subtitle2' gutterBottom sx={sectionTitleSx}>
            {GH_GROWTH_FORMS.sections.consent}
          </Typography>
          <Typography variant='body2' color='text.primary'>
            {submissions[0].consent.consentPolicyVersion} · {submissions[0].consent.legalBasis} · {formatDate(submissions[0].consent.createdAt)}
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
        <Typography variant='subtitle2' gutterBottom sx={sectionTitleSx}>
          {GH_GROWTH_FORMS.sections.evidenceLedger}
        </Typography>
        {attempts.length === 0 ? (
          <Typography variant='body2' color='text.primary'>
            {GH_GROWTH_FORMS.helper.noSubmissions}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {attempts.map(attempt => (
              <Stack
                key={attempt.attemptId}
                direction='row'
                spacing={1.5}
                sx={{
                  minWidth: 0,
                  '&::before': {
                    content: '""',
                    inlineSize: 8,
                    blockSize: 8,
                    borderRadius: '999px',
                    mt: 0.75,
                    bgcolor: `${STATUS_TONE[attempt.status] ?? 'info'}.main`,
                    flex: '0 0 auto',
                  },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
                    <Typography variant='subtitle2' sx={sectionTitleSx}>{attempt.provider}</Typography>
                    <StatusChip status={attempt.status} />
                  </Stack>
                  <Typography variant='caption' color='text.primary' sx={{ display: 'block' }}>
                    {formatDate(attempt.createdAt)} · {compactId(attempt.submission.submissionId)} · {GH_GROWTH_FORMS.units.retry} {attempt.retryCount}
                    {attempt.errorClass ? ` · ${attempt.errorClass}` : ''}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

const Composer = ({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void
  onSubmit: (state: DraftFormState) => void
  pending: boolean
}) => {
  const [draft, setDraft] = useState<DraftFormState>(defaultDraftState)

  const updateField = <TKey extends keyof DraftFormState>(key: TKey, value: DraftFormState[TKey]) => {
    setDraft(current => ({
      ...current,
      [key]: value,
      ...(key === 'name' ? { slug: normalizeSlug(String(value)) } : null),
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(draft)
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <Alert
        severity='info'
        icon={<i className='tabler-sparkles' />}
        sx={{ '& .MuiAlert-message': { minWidth: 0, overflowWrap: 'anywhere' } }}
      >
        <Typography variant='body2' color='inherit'>
          {GH_GROWTH_FORMS.helper.starterTemplate}
        </Typography>
      </Alert>
      <TextField
        size='small'
        label={GH_GROWTH_FORMS.fields.name}
        value={draft.name}
        onChange={event => updateField('name', event.target.value)}
        required
        fullWidth
      />
      <TextField
        size='small'
        label={GH_GROWTH_FORMS.fields.slug}
        value={draft.slug}
        onChange={event => updateField('slug', normalizeSlug(event.target.value))}
        required
        fullWidth
      />
      <TextField
        size='small'
        label={GH_GROWTH_FORMS.fields.purpose}
        value={draft.purpose}
        onChange={event => updateField('purpose', event.target.value)}
        required
        multiline
        minRows={3}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size='small'
          select
          label={GH_GROWTH_FORMS.fields.formKind}
          value={draft.formKind}
          onChange={event => updateField('formKind', event.target.value as DraftFormState['formKind'])}
          fullWidth
        >
          <MenuItem value='lead_magnet'>{GH_GROWTH_FORMS.formKinds.lead_magnet}</MenuItem>
          <MenuItem value='subscribe'>{GH_GROWTH_FORMS.formKinds.subscribe}</MenuItem>
          <MenuItem value='contact'>{GH_GROWTH_FORMS.formKinds.contact}</MenuItem>
          <MenuItem value='diagnostic_intake'>{GH_GROWTH_FORMS.formKinds.diagnostic_intake}</MenuItem>
        </TextField>
        <TextField
          size='small'
          select
          label={GH_GROWTH_FORMS.fields.riskProfile}
          value={draft.riskProfile}
          onChange={event => updateField('riskProfile', event.target.value as DraftFormState['riskProfile'])}
          fullWidth
        >
          <MenuItem value='low'>{GH_GROWTH_FORMS.riskProfiles.low}</MenuItem>
          <MenuItem value='medium'>{GH_GROWTH_FORMS.riskProfiles.medium}</MenuItem>
          <MenuItem value='high'>{GH_GROWTH_FORMS.riskProfiles.high}</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
        <GreenhouseButton type='button' variant='outlined' kind='custom' onClick={onCancel} disabled={pending} fullWidth>
          {GH_GROWTH_FORMS.actions.cancel}
        </GreenhouseButton>
        <GreenhouseButton
          type='submit'
          variant='solid'
          tone='primary'
          kind='custom'
          leadingIconClassName='tabler-device-floppy'
          disabled={pending}
          fullWidth
        >
          {GH_GROWTH_FORMS.actions.saveDraft}
        </GreenhouseButton>
      </Stack>
    </Box>
  )
}

const GrowthFormsAdminCockpitView = ({ data }: { data: GrowthFormsCockpitVm }) => {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(data.forms[0]?.formId ?? null)
  const [sidecarMode, setSidecarMode] = useState<SidecarMode>('inspector')
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState<'all' | GrowthFormsHealthState>('all')
  const [liveStatus, setLiveStatus] = useState<string>(GH_GROWTH_FORMS.feedback.ready)

  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  })

  const [isPending, startTransition] = useTransition()

  const selectedForm = data.forms.find(form => form.formId === selectedId) ?? data.forms[0] ?? null
  const selectedSubmissions = selectedForm ? data.submissions.filter(submission => submission.formId === selectedForm.formId) : []

  const filteredForms = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return data.forms.filter(form => {
      const matchesSearch = !normalized || `${form.name} ${form.slug} ${form.formKind}`.toLowerCase().includes(normalized)
      const matchesHealth = healthFilter === 'all' || form.health === healthFilter

      return matchesSearch && matchesHealth
    })
  }, [data.forms, healthFilter, search])

  const showToast = (severity: 'success' | 'error', message: string) => {
    setLiveStatus(message)
    setToast({ open: true, severity, message })
  }

  const postJson = async (url: string, body?: unknown) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response.json() as Promise<unknown>
  }

  const runLifecycle = (action: 'review' | 'publish' | 'deprecate' | 'archive') => {
    if (!selectedForm?.latestVersionId) return

    setLiveStatus(GH_GROWTH_FORMS.feedback.actionQueued)
    startTransition(() => {
      void (async () => {
        try {
          await postJson(`/api/admin/growth/forms/${selectedForm.formId}/lifecycle`, {
            action,
            formVersionId: selectedForm.latestVersionId,
          })
          showToast('success', GH_GROWTH_FORMS.toast.lifecycleUpdated)
          router.refresh()
        } catch {
          showToast('error', GH_GROWTH_FORMS.toast.actionFailed)
        }
      })()
    })
  }

  const runDispatch = () => {
    setLiveStatus(GH_GROWTH_FORMS.feedback.actionQueued)
    startTransition(() => {
      void (async () => {
        try {
          await postJson('/api/admin/growth/forms/dispatch?limit=25')
          showToast('success', GH_GROWTH_FORMS.toast.dispatchQueued)
          router.refresh()
        } catch {
          showToast('error', GH_GROWTH_FORMS.toast.actionFailed)
        }
      })()
    })
  }

  const createDraft = (draft: DraftFormState) => {
    setLiveStatus(GH_GROWTH_FORMS.feedback.actionQueued)
    startTransition(() => {
      void (async () => {
        try {
          await postJson('/api/admin/growth/forms', buildStarterPayload(draft))
          showToast('success', GH_GROWTH_FORMS.toast.draftCreated)
          setSidecarMode('inspector')
          router.refresh()
        } catch {
          showToast('error', GH_GROWTH_FORMS.toast.actionFailed)
        }
      })()
    })
  }

  const selectForm = (formId: string) => {
    setSelectedId(formId)
    setSidecarMode('inspector')
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, formId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    selectForm(formId)
  }

  const table = (
    <Box data-capture='growth-forms-command-center' sx={{ ...sectionSurfaceSx, minWidth: 0, overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent='space-between'
        spacing={2}
        sx={{ p: 2, borderBottom: theme => `1px solid ${theme.palette.divider}` }}
      >
        <Box sx={{ minWidth: 0 }}>
        <Typography variant='h5' sx={sectionTitleSx}>{GH_GROWTH_FORMS.sections.commandCenter}</Typography>
          <Typography variant='body2' color='text.primary'>
            {data.forms.length} {GH_GROWTH_FORMS.units.forms} · {data.surfaces.length} {GH_GROWTH_FORMS.units.surfaces} · {data.submissions.length} {GH_GROWTH_FORMS.units.submissions}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: '100%', md: 420 } }}>
          <TextField
            size='small'
            value={search}
            onChange={event => setSearch(event.target.value)}
            label={GH_GROWTH_FORMS.fields.search}
            inputProps={{ 'aria-label': GH_GROWTH_FORMS.aria.filterSearch }}
            fullWidth
          />
          <ToggleButtonGroup
            exclusive
            size='small'
            value={healthFilter}
            onChange={(_, next: typeof healthFilter | null) => next && setHealthFilter(next)}
            aria-label={GH_GROWTH_FORMS.sections.readiness}
            sx={{ flex: '0 0 auto' }}
          >
            <ToggleButton value='all'>{GH_GROWTH_FORMS.filters.all}</ToggleButton>
            <ToggleButton value='healthy'>{GH_GROWTH_FORMS.filters.ok}</ToggleButton>
            <ToggleButton value='attention'>{GH_GROWTH_FORMS.filters.risk}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      <Box
        role='region'
        aria-label={GH_GROWTH_FORMS.aria.tableRegion}
        sx={{
          minWidth: 0,
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {isPending ? <LinearProgress aria-label={GH_GROWTH_FORMS.feedback.actionQueued} /> : null}
        <Table size='small' sx={{ minWidth: 920 }}>
          <TableHead>
            <TableRow>
              <TableCell>{GH_GROWTH_FORMS.table.form}</TableCell>
              <TableCell>{GH_GROWTH_FORMS.table.status}</TableCell>
              <TableCell>{GH_GROWTH_FORMS.table.destinations}</TableCell>
              <TableCell>{GH_GROWTH_FORMS.table.surfaces}</TableCell>
              <TableCell>{GH_GROWTH_FORMS.table.submissions}</TableCell>
              <TableCell>{GH_GROWTH_FORMS.table.lastSignal}</TableCell>
              <TableCell align='right'>{GH_GROWTH_FORMS.table.action}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredForms.map(form => {
              const selected = selectedForm?.formId === form.formId

              return (
                <TableRow
                  key={form.formId}
                  hover
                  selected={selected}
                  role='button'
                  tabIndex={0}
                  aria-label={`${GH_GROWTH_FORMS.aria.selectForm}: ${form.name}`}
                  aria-pressed={selected}
                  onClick={() => selectForm(form.formId)}
                  onKeyDown={event => handleRowKeyDown(event, form.formId)}
                  sx={{
                    cursor: 'pointer',
                    borderLeft: theme => `4px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
                    transition: theme => theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
                      duration: theme.transitions.duration.shortest,
                    }),
                    '&.Mui-selected': {
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                    },
                    '&:hover': {
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.05),
                    },
                    '&:focus-visible': {
                      outline: theme => `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: -4,
                    },
                  }}
                >
                  <TableCell>
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' sx={{ overflowWrap: 'anywhere' }}>
                        {form.name}
                      </Typography>
                      <Typography variant='caption' color='text.primary'>
                        /{form.slug} · {GH_GROWTH_FORMS.units.version}{form.latestVersion ?? 'N/A'} · {form.formKind}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.75} flexWrap='wrap'>
                      <StatusChip status={form.health} tone={HEALTH_TONE[form.health]} />
                      <StatusChip status={form.latestVersionStatus} />
                    </Stack>
                  </TableCell>
                  <TableCell>{form.destinations.length}</TableCell>
                  <TableCell>{form.surfaces.length}</TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant='body2'>{form.submissionCount}</Typography>
                      <Typography variant='caption' color='text.primary'>
                        {form.submissions24h} / {GH_GROWTH_FORMS.units.hours24}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDate(form.lastSubmissionAt ?? form.latestPublishedAt ?? form.latestVersionCreatedAt)}</TableCell>
                  <TableCell align='right'>
                    <Tooltip title={GH_GROWTH_FORMS.actions.inspect}>
                      <IconButton
                        size='small'
                        aria-label={`${GH_GROWTH_FORMS.actions.inspect} ${form.name}`}
                        onClick={event => {
                          event.stopPropagation()
                          selectForm(form.formId)
                        }}
                      >
                        <i className='tabler-layout-sidebar-right-expand' />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredForms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Alert severity='info' icon={<i className='tabler-filter-search' />}>
                    {GH_GROWTH_FORMS.helper.noResults}
                  </Alert>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )

  const inspector = selectedForm ? (
    <Box data-capture='growth-forms-inspector' sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <Stack direction='row' spacing={1} flexWrap='wrap'>
        <GreenhouseButton
          size='small'
          kind='custom'
          variant='label'
          leadingIconClassName='tabler-plus'
          dataCapture='growth-forms-new-draft-sidecar'
          onClick={() => setSidecarMode('composer')}
        >
          {GH_GROWTH_FORMS.actions.openComposer}
        </GreenhouseButton>
        <GreenhouseButton
          size='small'
          kind='custom'
          variant='outlined'
          leadingIconClassName='tabler-checkup-list'
          disabled={isPending || !selectedForm.latestVersionId}
          onClick={() => runLifecycle('review')}
        >
          {GH_GROWTH_FORMS.actions.review}
        </GreenhouseButton>
        <GreenhouseButton
          size='small'
          kind='custom'
          variant='solid'
          tone='primary'
          leadingIconClassName='tabler-send'
          disabled={isPending || !selectedForm.latestVersionId}
          onClick={() => runLifecycle('publish')}
        >
          {GH_GROWTH_FORMS.actions.publish}
        </GreenhouseButton>
      </Stack>

      <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
          <Typography variant='subtitle2' gutterBottom sx={sectionTitleSx}>
          {GH_GROWTH_FORMS.sections.readiness}
        </Typography>
        <Stack direction='row' spacing={1} flexWrap='wrap'>
          <StatusChip status={selectedForm.latestVersionStatus} />
          <GreenhouseChip kind='metric' size='small' variant='label' tone='info' label={`${selectedForm.destinations.length} ${GH_GROWTH_FORMS.table.destinations}`} />
          <GreenhouseChip kind='metric' size='small' variant='label' tone='info' label={`${selectedForm.surfaces.length} ${GH_GROWTH_FORMS.table.surfaces}`} />
          <GreenhouseChip kind='metric' size='small' variant='label' tone={selectedForm.deadLetterCount > 0 ? 'error' : 'success'} label={`${selectedForm.retryQueueCount} ${GH_GROWTH_FORMS.units.retry}`} />
        </Stack>
      </Box>

      <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
        <Typography variant='subtitle2' gutterBottom sx={sectionTitleSx}>
          {GH_GROWTH_FORMS.sections.destinations}
        </Typography>
        <DestinationList destinations={selectedForm.destinations} />
      </Box>

      <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
        <Typography variant='subtitle2' gutterBottom sx={sectionTitleSx}>
          {GH_GROWTH_FORMS.sections.surfaces}
        </Typography>
        <SurfaceList surfaces={selectedForm.surfaces} />
      </Box>

      <Box sx={{ ...sectionSurfaceSx, p: 2 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant='subtitle2' sx={sectionTitleSx}>{GH_GROWTH_FORMS.sections.recentSubmissions}</Typography>
          <GreenhouseButton size='small' variant='text' kind='custom' onClick={() => setSidecarMode('evidence')}>
            {GH_GROWTH_FORMS.actions.openEvidence}
          </GreenhouseButton>
        </Stack>
        <SubmissionsList submissions={selectedSubmissions} onOpenEvidence={() => setSidecarMode('evidence')} />
      </Box>

      <Divider />

      <Alert
        severity='warning'
        icon={<i className='tabler-archive' />}
        sx={theme => ({
          bgcolor: alpha(theme.palette.warning.main, 0.08),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.32)}`,
          color: 'text.primary',
          '& .MuiAlert-icon': { color: 'warning.dark' },
          '& .MuiAlert-message': { minWidth: 0, overflowWrap: 'anywhere' },
        })}
      >
        <Typography variant='body2' color='inherit'>
          {GH_GROWTH_FORMS.helper.archiveWarning}
        </Typography>
      </Alert>

      <Stack direction='row' spacing={1} flexWrap='wrap'>
        <GreenhouseButton
          size='small'
          variant='outlined'
          kind='custom'
          leadingIconClassName='tabler-rotate-clockwise'
          disabled={isPending}
          onClick={runDispatch}
        >
          {GH_GROWTH_FORMS.actions.dispatch}
        </GreenhouseButton>
        <GreenhouseButton
          size='small'
          variant='outlined'
          kind='custom'
          leadingIconClassName='tabler-archive'
          disabled={isPending || !selectedForm.latestVersionId}
          onClick={() => runLifecycle('deprecate')}
        >
          {GH_GROWTH_FORMS.actions.deprecate}
        </GreenhouseButton>
        <GreenhouseButton
          size='small'
          variant='outlined'
          kind='custom'
          leadingIconClassName='tabler-archive-off'
          disabled={isPending || !selectedForm.latestVersionId}
          onClick={() => runLifecycle('archive')}
        >
          {GH_GROWTH_FORMS.actions.archive}
        </GreenhouseButton>
      </Stack>
    </Box>
  ) : (
    <Typography variant='body2' color='text.primary'>
      {GH_GROWTH_FORMS.helper.noFormSelected}
    </Typography>
  )

  const sidecarMeta = {
    eyebrow:
      sidecarMode === 'composer'
        ? GH_GROWTH_FORMS.sidecar.composerEyebrow
        : sidecarMode === 'evidence'
          ? GH_GROWTH_FORMS.sidecar.evidenceEyebrow
          : GH_GROWTH_FORMS.sidecar.inspectorEyebrow,
    title:
      sidecarMode === 'composer'
        ? GH_GROWTH_FORMS.sidecar.composerTitle
        : sidecarMode === 'evidence'
          ? GH_GROWTH_FORMS.sidecar.evidenceTitle
          : selectedForm?.name ?? GH_GROWTH_FORMS.sections.readiness,
    subtitle:
      sidecarMode === 'composer'
        ? GH_GROWTH_FORMS.sidecar.composerSubtitle
        : sidecarMode === 'evidence'
          ? GH_GROWTH_FORMS.sidecar.evidenceSubtitle
          : GH_GROWTH_FORMS.sidecar.inspectorSubtitle,
    icon:
      sidecarMode === 'composer'
        ? 'tabler-pencil-plus'
        : sidecarMode === 'evidence'
          ? 'tabler-history'
          : 'tabler-layout-sidebar-right-expand',
  }

  const sidecar = (
    <Paper
      data-capture='growth-forms-sidecar-panel'
      elevation={0}
      sx={{
        ...sectionSurfaceSx,
        p: 2,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        minHeight: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <Box
        sx={theme => ({
          mx: -2,
          mt: -2,
          mb: 2,
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        })}
      >
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              aria-hidden='true'
              sx={theme => ({
                display: 'inline-grid',
                placeItems: 'center',
                inlineSize: 44,
                blockSize: 44,
                borderRadius: `${theme.shape.customBorderRadius?.md ?? theme.shape.borderRadius}px`,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                flex: '0 0 auto',
              })}
            >
              <i className={sidecarMeta.icon} />
            </Box>
            {sidecarMode !== 'inspector' ? (
              <GreenhouseButton
                size='small'
                variant='text'
                kind='custom'
                leadingIconClassName='tabler-arrow-left'
                onClick={() => setSidecarMode('inspector')}
              >
                {GH_GROWTH_FORMS.actions.backToInspector}
              </GreenhouseButton>
            ) : null}
          </Stack>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='overline' color='text.primary' sx={{ display: 'block' }}>
              {sidecarMeta.eyebrow}
            </Typography>
            <Typography variant='surfaceHeroTitle' sx={{ display: 'block', mt: 0.5, overflowWrap: 'anywhere' }}>
              {sidecarMeta.title}
            </Typography>
            <Typography variant='body2' color='text.primary' sx={{ mt: 1 }}>
              {sidecarMeta.subtitle}
            </Typography>
            {selectedForm && sidecarMode === 'inspector' ? (
              <Typography variant='monoId' color='text.primary' sx={{ display: 'block', mt: 1 }}>
                /{selectedForm.slug} · {compactId(selectedForm.formId)}
              </Typography>
            ) : null}
          </Box>
          {selectedForm && sidecarMode === 'inspector' ? (
            <Stack direction='row' spacing={1} flexWrap='wrap'>
              <StatusChip status={selectedForm.health} tone={HEALTH_TONE[selectedForm.health]} />
              <StatusChip status={selectedForm.latestVersionStatus} />
            </Stack>
          ) : null}
        </Stack>
      </Box>
      {sidecarMode === 'composer' ? (
        <Composer onCancel={() => setSidecarMode('inspector')} onSubmit={createDraft} pending={isPending} />
      ) : sidecarMode === 'evidence' ? (
        <EvidenceLedger submissions={selectedSubmissions} />
      ) : (
        inspector
      )}
    </Paper>
  )

  return (
    <Box data-capture='growth-forms-shell' sx={{ position: 'relative', display: 'grid', gap: 3, minWidth: 0, overflowX: 'clip' }}>
      <Motion kind='sectionReveal' distance={10}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            dataCapture='growth-forms-breadcrumbs'
            items={[
              { label: GH_GROWTH_FORMS.breadcrumbs.admin, href: '/admin', iconClassName: 'tabler-shield-lock' },
              { label: GH_GROWTH_FORMS.breadcrumbs.growth, iconClassName: 'tabler-growth' },
              { label: GH_GROWTH_FORMS.breadcrumbs.forms, iconClassName: 'tabler-forms' },
            ]}
          />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            justifyContent='space-between'
            spacing={2}
            sx={{ minWidth: 0 }}
          >
            <Box sx={{ minWidth: 0, maxWidth: 860 }}>
              <Typography variant='surfaceHeroTitle' sx={{ overflowWrap: 'anywhere' }}>
                {GH_GROWTH_FORMS.pageTitle}
              </Typography>
              <Typography variant='body1' color='text.primary' sx={{ mt: 1, maxWidth: '66ch' }}>
                {GH_GROWTH_FORMS.pageSubtitle}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <GreenhouseButton
                kind='custom'
                variant='outlined'
                leadingIconClassName='tabler-refresh'
                onClick={() => {
                  setLiveStatus(GH_GROWTH_FORMS.feedback.refreshing)
                  router.refresh()
                }}
                disabled={isPending}
              >
                {GH_GROWTH_FORMS.actions.refresh}
              </GreenhouseButton>
              <GreenhouseButton
                kind='custom'
                variant='solid'
                tone='primary'
                leadingIconClassName='tabler-plus'
                dataCapture='growth-forms-new-draft'
                onClick={() => setSidecarMode('composer')}
              >
                {GH_GROWTH_FORMS.actions.openComposer}
              </GreenhouseButton>
            </Stack>
          </Stack>
        </Stack>
      </Motion>

      <Box
        data-capture='growth-forms-summary'
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' },
          gap: 1.5,
          minWidth: 0,
          '& > *': { minWidth: 0 },
        }}
      >
        <MetricTile icon='tabler-forms' label={GH_GROWTH_FORMS.metrics.forms} value={data.summary.totalForms} />
        <MetricTile icon='tabler-world-check' label={GH_GROWTH_FORMS.metrics.published} value={data.summary.publishedForms} tone='success' />
        <MetricTile icon='tabler-browser-check' label={GH_GROWTH_FORMS.metrics.activeSurfaces} value={data.summary.activeSurfaces} tone='info' />
        <MetricTile icon='tabler-inbox' label={GH_GROWTH_FORMS.metrics.submissions24h} value={data.summary.submissions24h} tone='info' />
        <MetricTile icon='tabler-rotate-clockwise' label={GH_GROWTH_FORMS.metrics.retryQueue} value={data.summary.retryQueue} tone={data.summary.retryQueue > 0 ? 'warning' : 'success'} />
        <MetricTile icon='tabler-alert-octagon' label={GH_GROWTH_FORMS.metrics.deadLetters} value={data.summary.deadLetters} tone={data.summary.deadLetters > 0 ? 'error' : 'success'} />
      </Box>

      <OperationalPulse data={data} />

      <Box
        role='status'
        aria-live='polite'
        sx={{
          position: 'absolute',
          inlineSize: 1,
          blockSize: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {liveStatus}
      </Box>

      <CompositionShell
        composition='single'
        fluidity='rich'
        instanceId='growth-forms-admin-cockpit'
        regions={{
          primary: (
            <AdaptiveSidecarLayout
              open
              onOpenChange={() => undefined}
              kind={sidecarMode === 'composer' ? 'composer' : sidecarMode === 'evidence' ? 'evidence' : 'inspector'}
              preferredMode='push'
              sidecar={sidecar}
              sidecarWidth={440}
              sidecarMinWidth={360}
              sidecarMaxWidth={560}
              mainMinWidth={680}
              panelEntrance='slide'
              dataCapture='growth-forms-adaptive-sidecar'
              source='task-1232-growth-forms-admin-cockpit'
              inlineMainPadding={{ xs: 0, md: 1 }}
            >
              <Box sx={{ minWidth: 0, overflowX: 'clip' }}>{table}</Box>
            </AdaptiveSidecarLayout>
          ),
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={2400}
        onClose={() => setToast(current => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          icon={<i className={toast.severity === 'success' ? 'tabler-check' : 'tabler-alert-circle'} />}
          onClose={() => setToast(current => ({ ...current, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default GrowthFormsAdminCockpitView
