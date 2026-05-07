'use client'

import { useEffect, useState, useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import SampleSprintsMockupView, {
  type HealthSeverity,
  type RuntimeSampleSprintOptions,
  type Signal,
  type Sprint,
  type SprintKind,
  type SprintStatus,
  type TeamMember
} from './mockup/SampleSprintsMockupView'

type WorkspaceMode = 'list' | 'declare' | 'detail' | 'approve' | 'progress' | 'outcome'

type EngagementKind = 'pilot' | 'trial' | 'poc' | 'discovery'

type SampleSprintItem = {
  serviceId: string
  publicId: string | null
  name: string
  engagementKind: EngagementKind
  status: string
  pipelineStage: string
  spaceId: string
  spaceName: string
  clientName: string | null
  organizationName: string | null
  startDate: string | null
  targetEndDate: string | null
  expectedInternalCostClp: number
  decisionDeadline: string | null
  approvalStatus: string | null
  latestSnapshotDate: string | null
  outcomeKind: string | null
  createdAt: string | null
}

type SampleSprintDetail = SampleSprintItem & {
  successCriteria: Record<string, unknown>
  proposedTeam: Array<{ memberId: string; proposedFte: number; role?: string | null }>
  approval: {
    approvalId: string
    status: string
    capacityWarning: { hasWarning: boolean } | null
  } | null
  latestSnapshots: Array<{
    snapshotId: string
    snapshotDate: string
    metrics: Record<string, unknown>
    qualitativeNotes: string | null
  }>
  outcome: { outcomeId: string; outcomeKind: string; decisionDate: string } | null
  auditEvents: Array<{
    auditId: string
    eventKind: string
    reason: string | null
    createdAt: string | null
  }>
}

type Options = {
  spaces: Array<{
    spaceId: string
    spaceName: string
    clientName: string | null
    organizationId: string | null
    organizationName: string | null
  }>
  members: Array<{
    memberId: string
    displayName: string
    roleTitle: string | null
  }>
  conversionTargets: Array<{
    serviceId: string
    publicId: string | null
    name: string
    spaceName: string | null
  }>
  quotations: Array<{
    quotationId: string
    quotationNumber: string
    clientName: string | null
    status: string
    totalAmountClp: number | null
  }>
}

type Props = {
  mode: WorkspaceMode
  serviceId?: string
}

const ENGAGEMENT_KIND_LABEL: Record<EngagementKind, string> = {
  pilot: 'Operations Sprint',
  trial: 'Extension Sprint',
  poc: 'Validation Sprint',
  discovery: 'Discovery Sprint'
}

const STATUS_TONE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending_approval: 'warning',
  active: 'success',
  adjusted: 'primary',
  converted: 'success',
  cancelled: 'error',
  closed: 'default'
}

const getClientLabel = (item: SampleSprintItem) => item.organizationName || item.clientName || item.spaceName || 'Cliente sin nombre'

const getSprintStatus = (item: SampleSprintItem): SprintStatus => {
  if (item.outcomeKind === 'converted') return 'converted'
  if (['cancelled', 'cancelled_by_client', 'cancelled_by_provider'].includes(item.outcomeKind ?? '')) return 'cancelled'
  if (item.outcomeKind === 'dropped') return 'dropped'
  if (item.status === 'pending_approval') return 'pending_approval'
  if (item.status === 'active' && item.latestSnapshotDate) return 'reporting'
  if (item.status === 'active') return 'active'
  if (item.status === 'converted') return 'converted'
  if (item.status === 'cancelled') return 'cancelled'

  return 'active'
}

const getPhase = (item: SampleSprintItem): Sprint['phase'] => {
  if (item.outcomeKind) return 'Decisión'
  if (item.latestSnapshotDate) return 'Reporte'
  if (item.status === 'active') return 'Operación'

  return 'Kickoff'
}

const getDaysSince = (value: string | null) => {
  if (!value) return 0

  const target = new Date(value)

  if (Number.isNaN(target.getTime())) return 0

  return Math.max(0, Math.floor((Date.now() - target.getTime()) / 86400000))
}

const getProgressPct = (item: SampleSprintItem) => {
  if (item.outcomeKind) return 100
  if (item.latestSnapshotDate) return 72
  if (item.status === 'active') return 42
  if (item.status === 'pending_approval') return 8

  return 20
}

const getSignalSeverity = (item: SampleSprintItem): HealthSeverity => {
  if (item.status === 'pending_approval') return 'warning'
  if (getDaysSince(item.latestSnapshotDate) > 10 && item.status === 'active') return 'warning'
  if (item.outcomeKind === 'cancelled_by_client' || item.outcomeKind === 'cancelled_by_provider') return 'error'
  if (item.outcomeKind === 'converted') return 'success'

  return 'info'
}

const initialsFrom = (value: string) => value
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'SS'

const teamFromItem = (item: SampleSprintItem): TeamMember[] => [{
  name: getClientLabel(item),
  role: 'Engagement owner',
  initials: initialsFrom(getClientLabel(item)),
  allocation: item.status === 'pending_approval' ? 0.15 : 0.35,
  availability: item.status === 'pending_approval' ? 0.85 : 0.45
}]

const toSprint = (item: SampleSprintItem): Sprint => ({
  id: item.serviceId,
  client: getClientLabel(item),
  name: item.name,
  kind: item.engagementKind as SprintKind,
  subtype: ENGAGEMENT_KIND_LABEL[item.engagementKind],
  status: getSprintStatus(item),
  owner: getClientLabel(item),
  startDate: item.startDate ?? item.createdAt ?? new Date().toISOString().slice(0, 10),
  decisionDate: item.decisionDeadline ?? item.targetEndDate ?? item.startDate ?? item.createdAt ?? new Date().toISOString().slice(0, 10),
  budgetClp: item.expectedInternalCostClp,
  actualClp: 0,
  conversionProbability: item.outcomeKind === 'converted' ? 100 : item.status === 'active' ? 55 : 0,
  progressPct: getProgressPct(item),
  lastSnapshotDays: getDaysSince(item.latestSnapshotDate),
  phase: getPhase(item),
  outcome: item.outcomeKind ?? undefined,
  signal: getSignalSeverity(item),
  team: teamFromItem(item)
})

const buildRuntimeSignals = (items: SampleSprintItem[]): Signal[] => {
  const overdueDecision = items.filter(item => item.decisionDeadline && new Date(item.decisionDeadline) < new Date() && !item.outcomeKind).length
  const pendingApproval = items.filter(item => item.status === 'pending_approval').length
  const staleProgress = items.filter(item => item.status === 'active' && getDaysSince(item.latestSnapshotDate) > 10).length
  const unapprovedActive = items.filter(item => item.status === 'active' && item.approvalStatus && item.approvalStatus !== 'approved').length
  const closed = items.filter(item => item.outcomeKind).length
  const converted = items.filter(item => item.outcomeKind === 'converted').length
  const conversionRate = closed > 0 ? converted / closed : 1

  return [
    {
      code: 'commercial.engagement.overdue_decision',
      label: 'Decisiones vencidas',
      severity: 'error',
      count: overdueDecision,
      runbook: 'Cerrar outcome o ajustar deadline con aprobación',
      description: 'Engagements sin outcome después del deadline de decisión.'
    },
    {
      code: 'commercial.engagement.pending_approval',
      label: 'Approval pendiente',
      severity: 'warning',
      count: pendingApproval,
      runbook: 'Revisar capacidad y aprobar o rechazar el Sprint',
      description: 'Sample Sprints declarados que aún no pasan a operación.'
    },
    {
      code: 'commercial.engagement.stale_progress',
      label: 'Progreso stale',
      severity: 'warning',
      count: staleProgress,
      runbook: 'Registrar snapshot semanal con contexto operacional',
      description: 'Engagement activo sin snapshot reciente.'
    },
    {
      code: 'commercial.engagement.unapproved_active',
      label: 'Activos sin approval',
      severity: 'error',
      count: unapprovedActive,
      runbook: 'Volver a pending_approval o registrar aprobación retroactiva',
      description: 'Servicios no regulares activos sin aprobación aprobada.'
    },
    {
      code: 'commercial.engagement.conversion_rate_drop',
      label: 'Conversión bajo umbral',
      severity: 'warning',
      count: conversionRate < 0.35 ? 1 : 0,
      runbook: 'Revisar outcomes trailing 6m y criterios de success',
      description: 'Conversion rate trailing bajo el threshold configurado.'
    }
  ]
}

const parseRecord = (value: string, fallback: Record<string, unknown>) => {
  try {
    const parsed = JSON.parse(value)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : fallback
  } catch {
    return fallback
  }
}

const buildCriteria = (value: string) => ({
  summary: value.trim(),
  checklist: value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
})

const Header = ({ mode }: { mode: WorkspaceMode }) => (
  <Stack spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
      <Box>
        <Typography variant='h4'>Sample Sprints</Typography>
        <Typography color='text.secondary'>
          Declare, approve, track and close non-regular commercial engagements.
        </Typography>
      </Box>
      <Stack direction='row' spacing={1}>
        <Button component={Link} href='/agency/sample-sprints' variant={mode === 'list' ? 'contained' : 'outlined'} startIcon={<i className='tabler-list' />}>
          Board
        </Button>
        <Button component={Link} href='/agency/sample-sprints/new' variant={mode === 'declare' ? 'contained' : 'outlined'} startIcon={<i className='tabler-plus' />}>
          Declare
        </Button>
      </Stack>
    </Stack>
  </Stack>
)

const useSampleSprints = (mode: WorkspaceMode, serviceId?: string) => {
  const [items, setItems] = useState<SampleSprintItem[]>([])
  const [detail, setDetail] = useState<SampleSprintDetail | null>(null)
  const [options, setOptions] = useState<Options | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        if (mode === 'list' || mode === 'declare') {
          const response = await fetch('/api/agency/sample-sprints?includeOptions=true', { cache: 'no-store' })
          const payload = await response.json()

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Sample Sprints.')
          if (!mounted) return

          setItems(payload.items ?? [])
          setOptions(payload.options ?? null)
        } else if (serviceId) {
          const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(serviceId)}`, { cache: 'no-store' })
          const payload = await response.json()

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el Sample Sprint.')
          if (!mounted) return

          setDetail(payload)

          const optionsResponse = await fetch('/api/agency/sample-sprints?includeOptions=true', { cache: 'no-store' })
          const optionsPayload = await optionsResponse.json().catch(() => null)

          if (mounted && optionsResponse.ok) {
            setOptions(optionsPayload?.options ?? null)
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la informacion.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [mode, serviceId])

  return { items, detail, options, loading, error }
}

const ListView = ({ items, options }: { items: SampleSprintItem[]; options: RuntimeSampleSprintOptions | null }) => (
  <SampleSprintsMockupView
    variant='runtime'
    sprints={items.map(toSprint)}
    signals={buildRuntimeSignals(items)}
    initialSelectedSprintId={items[0]?.serviceId}
    runtimeOptions={options}
  />
)

const DeclareView = ({ options }: { options: Options | null }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    spaceId: options?.spaces[0]?.spaceId ?? '',
    engagementKind: 'pilot' as EngagementKind,
    startDate: new Date().toISOString().slice(0, 10),
    decisionDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    expectedDurationDays: 21,
    expectedInternalCostClp: 0,
    successCriteria: ''
  })

  const [memberId, setMemberId] = useState('')
  const [proposedFte, setProposedFte] = useState(0.25)

  useEffect(() => {
    if (!form.spaceId && options?.spaces[0]?.spaceId) {
      setForm(current => ({ ...current, spaceId: options.spaces[0].spaceId }))
    }
  }, [form.spaceId, options?.spaces])

  const selectedSpace = options?.spaces.find(space => space.spaceId === form.spaceId)

  const submit = () => {
    setFeedback(null)
    startTransition(async () => {
      const response = await fetch('/api/agency/sample-sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          organizationId: selectedSpace?.organizationId ?? null,
          successCriteria: buildCriteria(form.successCriteria),
          proposedTeam: memberId ? [{ memberId, proposedFte }] : []
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback(payload?.error || 'No fue posible declarar el Sample Sprint.')

        return
      }

      router.push(`/agency/sample-sprints/${payload.serviceId}`)
    })
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {feedback ? <Alert severity='error'>{feedback}</Alert> : null}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label='Name' value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Kind</InputLabel>
                <Select label='Kind' value={form.engagementKind} onChange={event => setForm({ ...form, engagementKind: event.target.value as EngagementKind })}>
                  {Object.entries(ENGAGEMENT_KIND_LABEL).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Space</InputLabel>
                <Select label='Space' value={form.spaceId} onChange={event => setForm({ ...form, spaceId: event.target.value })}>
                  {(options?.spaces ?? []).map(space => <MenuItem key={space.spaceId} value={space.spaceId}>{space.spaceName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label='Start date' type='date' value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label='Decision deadline' type='date' value={form.decisionDeadline} onChange={event => setForm({ ...form, decisionDeadline: event.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label='Duration days' type='number' value={form.expectedDurationDays} onChange={event => setForm({ ...form, expectedDurationDays: Number(event.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label='Internal cost CLP' type='number' value={form.expectedInternalCostClp} onChange={event => setForm({ ...form, expectedInternalCostClp: Number(event.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Proposed member</InputLabel>
                <Select label='Proposed member' value={memberId} onChange={event => setMemberId(event.target.value)}>
                  <MenuItem value=''>Sin asignar</MenuItem>
                  {(options?.members ?? []).map(member => <MenuItem key={member.memberId} value={member.memberId}>{member.displayName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label='Proposed FTE' type='number' value={proposedFte} onChange={event => setProposedFte(Number(event.target.value))} inputProps={{ min: 0.05, max: 1, step: 0.05 }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={5} label='Success criteria' value={form.successCriteria} onChange={event => setForm({ ...form, successCriteria: event.target.value })} />
            </Grid>
          </Grid>
          <Divider />
          <Stack direction='row' justifyContent='flex-end'>
            <Button variant='contained' onClick={submit} disabled={pending || !form.name || !form.spaceId || !form.successCriteria}>
              {pending ? 'Declaring...' : 'Declare Sample Sprint'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const DetailSummary = ({ detail }: { detail: SampleSprintDetail }) => (
  <Grid container spacing={3}>
    <Grid size={{ xs: 12, md: 8 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction='row' spacing={1} flexWrap='wrap'>
              <Chip label={ENGAGEMENT_KIND_LABEL[detail.engagementKind]} />
              <Chip color={STATUS_TONE[detail.status] ?? 'default'} label={detail.status} />
              {detail.approval ? <Chip label={`approval ${detail.approval.status}`} /> : null}
            </Stack>
            <Typography variant='h5'>{detail.name}</Typography>
            <Typography color='text.secondary'>{detail.spaceName} {detail.clientName ? `- ${detail.clientName}` : ''}</Typography>
            <Typography>{JSON.stringify(detail.successCriteria, null, 2)}</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, md: 4 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant='h6'>Next actions</Typography>
            <Button component={Link} href={`/agency/sample-sprints/${detail.serviceId}/progress`} variant='outlined' startIcon={<i className='tabler-chart-line' />}>Record progress</Button>
            <Button component={Link} href={`/agency/sample-sprints/${detail.serviceId}/outcome`} variant='outlined' startIcon={<i className='tabler-flag' />}>Record outcome</Button>
            {detail.status === 'pending_approval' ? (
              <Button component={Link} href={`/agency/sample-sprints/${detail.serviceId}/approve`} variant='contained' startIcon={<i className='tabler-check' />}>Approve</Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant='h6'>Progress</Typography>
            {detail.latestSnapshots.length === 0 ? <Typography color='text.secondary'>No snapshots yet.</Typography> : detail.latestSnapshots.slice(0, 5).map(snapshot => (
              <Box key={snapshot.snapshotId}>
                <Typography fontWeight={600}>{snapshot.snapshotDate}</Typography>
                <Typography variant='body2' color='text.secondary'>{snapshot.qualitativeNotes || JSON.stringify(snapshot.metrics)}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant='h6'>Audit</Typography>
            {detail.auditEvents.slice(0, 8).map(event => (
              <Box key={event.auditId}>
                <Typography fontWeight={600}>{event.eventKind}</Typography>
                <Typography variant='body2' color='text.secondary'>{event.createdAt ?? ''} {event.reason ? `- ${event.reason}` : ''}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

const ApproveView = ({ detail }: { detail: SampleSprintDetail }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const proposedMembers = detail.proposedTeam.map(member => ({ memberId: member.memberId, proposedFte: member.proposedFte }))

  const approve = () => {
    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(detail.serviceId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedMembers })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback(payload?.error || 'No fue posible aprobar el engagement.')

        return
      }

      router.push(`/agency/sample-sprints/${detail.serviceId}`)
    })
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {feedback ? <Alert severity='error'>{feedback}</Alert> : null}
          <Typography variant='h5'>Approve {detail.name}</Typography>
          <Typography color='text.secondary'>Capacity warning is calculated by the backend with the proposed team snapshot.</Typography>
          <Button variant='contained' onClick={approve} disabled={pending}>{pending ? 'Approving...' : 'Approve engagement'}</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

const ProgressView = ({ detail }: { detail: SampleSprintDetail }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10))
  const [metrics, setMetrics] = useState('{"deliveryProgressPct":50,"clientSignal":"healthy"}')
  const [notes, setNotes] = useState('')

  const submit = () => {
    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(detail.serviceId)}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotDate, metricsJson: parseRecord(metrics, {}), qualitativeNotes: notes || null })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback(payload?.error || 'No fue posible registrar el avance.')

        return
      }

      router.push(`/agency/sample-sprints/${detail.serviceId}`)
    })
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {feedback ? <Alert severity='error'>{feedback}</Alert> : null}
          <Typography variant='h5'>Record progress</Typography>
          <TextField label='Snapshot date' type='date' value={snapshotDate} onChange={event => setSnapshotDate(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label='Metrics JSON' multiline minRows={5} value={metrics} onChange={event => setMetrics(event.target.value)} />
          <TextField label='Notes' multiline minRows={3} value={notes} onChange={event => setNotes(event.target.value)} />
          <Button variant='contained' onClick={submit} disabled={pending}>{pending ? 'Saving...' : 'Save snapshot'}</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

const OutcomeView = ({ detail, options }: { detail: SampleSprintDetail; options: Options | null }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [file, setFile] = useState<UploadedFileValue | null>(null)

  const [form, setForm] = useState({
    outcomeKind: 'adjusted',
    decisionDate: new Date().toISOString().slice(0, 10),
    decisionRationale: '',
    cancellationReason: '',
    nextServiceId: '',
    nextQuotationId: '',
    metrics: '{"clientImpact":"documented"}'
  })

  const submit = () => {
    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(detail.serviceId)}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reportAssetId: file?.assetId ?? null,
          metrics: parseRecord(form.metrics, {})
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback(payload?.error || 'No fue posible registrar el outcome.')

        return
      }

      router.push(`/agency/sample-sprints/${detail.serviceId}`)
    })
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {feedback ? <Alert severity='error'>{feedback}</Alert> : null}
          <Typography variant='h5'>Record outcome</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Outcome</InputLabel>
                <Select label='Outcome' value={form.outcomeKind} onChange={event => setForm({ ...form, outcomeKind: event.target.value })}>
                  <MenuItem value='adjusted'>Adjusted</MenuItem>
                  <MenuItem value='dropped'>Dropped</MenuItem>
                  <MenuItem value='converted'>Converted</MenuItem>
                  <MenuItem value='cancelled_by_client'>Cancelled by client</MenuItem>
                  <MenuItem value='cancelled_by_provider'>Cancelled by provider</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label='Decision date' type='date' value={form.decisionDate} onChange={event => setForm({ ...form, decisionDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth disabled={form.outcomeKind !== 'converted'}>
                <InputLabel>Next service</InputLabel>
                <Select label='Next service' value={form.nextServiceId} onChange={event => setForm({ ...form, nextServiceId: event.target.value })}>
                  <MenuItem value=''>Sin servicio</MenuItem>
                  {(options?.conversionTargets ?? []).map(item => <MenuItem key={item.serviceId} value={item.serviceId}>{item.publicId ?? item.serviceId} - {item.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={3} label='Decision rationale' value={form.decisionRationale} onChange={event => setForm({ ...form, decisionRationale: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={3} label='Cancellation reason' disabled={!form.outcomeKind.startsWith('cancelled')} value={form.cancellationReason} onChange={event => setForm({ ...form, cancellationReason: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={4} label='Metrics JSON' value={form.metrics} onChange={event => setForm({ ...form, metrics: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <GreenhouseFileUploader
                contextType='sample_sprint_report_draft'
                value={file}
                onChange={setFile}
                title='Outcome report'
                helperText='Attach the report, evidence or summary used for the terminal decision.'
                ownerSpaceId={detail.spaceId}
                metadataLabel={`Sample Sprint ${detail.publicId ?? detail.serviceId}`}
                maxSizeBytes={25 * 1024 * 1024}
              />
            </Grid>
          </Grid>
          <Button variant='contained' onClick={submit} disabled={pending}>{pending ? 'Saving...' : 'Record outcome'}</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

const SampleSprintsWorkspace = ({ mode, serviceId }: Props) => {
  const { items, detail, options, loading, error } = useSampleSprints(mode, serviceId)

  return (
    <Stack spacing={4}>
      {mode === 'list' ? null : <Header mode={mode} />}
      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}
      {!loading && !error && mode === 'list' ? <ListView items={items} options={options} /> : null}
      {!loading && !error && mode === 'declare' ? <DeclareView options={options} /> : null}
      {!loading && !error && detail && mode === 'detail' ? <DetailSummary detail={detail} /> : null}
      {!loading && !error && detail && mode === 'approve' ? <ApproveView detail={detail} /> : null}
      {!loading && !error && detail && mode === 'progress' ? <ProgressView detail={detail} /> : null}
      {!loading && !error && detail && mode === 'outcome' ? <OutcomeView detail={detail} options={options} /> : null}
    </Stack>
  )
}

export default SampleSprintsWorkspace
