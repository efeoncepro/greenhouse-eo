'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

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
import { formatCurrency } from '@/lib/format/currency'

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

const formatClp = (value: number | null | undefined) => formatCurrency(value ?? 0, 'CLP', 'es-CL')

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

const ListView = ({ items }: { items: SampleSprintItem[] }) => {
  const metrics = useMemo(() => ({
    total: items.length,
    pending: items.filter(item => item.status === 'pending_approval').length,
    active: items.filter(item => item.status === 'active').length,
    converted: items.filter(item => item.outcomeKind === 'converted').length
  }), [items])

  return (
    <Stack spacing={4}>
      <Grid container spacing={3}>
        {[
          ['Total', metrics.total],
          ['Pending approval', metrics.pending],
          ['Active', metrics.active],
          ['Converted', metrics.converted]
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='overline' color='text.secondary'>{label}</Typography>
                <Typography variant='h4'>{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Stack spacing={2}>
        {items.length === 0 ? (
          <Alert severity='info'>No Sample Sprints found yet.</Alert>
        ) : items.map(item => (
          <Card key={item.serviceId}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                <Stack spacing={1}>
                  <Stack direction='row' spacing={1} flexWrap='wrap' alignItems='center'>
                    <Typography variant='h6'>{item.name}</Typography>
                    <Chip size='small' label={ENGAGEMENT_KIND_LABEL[item.engagementKind]} />
                    <Chip size='small' color={STATUS_TONE[item.status] ?? 'default'} label={item.status} />
                  </Stack>
                  <Typography color='text.secondary'>
                    {item.spaceName} {item.clientName ? `- ${item.clientName}` : ''} - deadline {item.decisionDeadline ?? 'sin fecha'}
                  </Typography>
                  <Typography variant='body2'>{formatClp(item.expectedInternalCostClp)} expected internal cost</Typography>
                </Stack>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Button component={Link} href={`/agency/sample-sprints/${item.serviceId}`} variant='outlined'>Open</Button>
                  {item.status === 'pending_approval' ? (
                    <Button component={Link} href={`/agency/sample-sprints/${item.serviceId}/approve`} variant='contained'>Approve</Button>
                  ) : null}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}

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
      <Header mode={mode} />
      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}
      {!loading && !error && mode === 'list' ? <ListView items={items} /> : null}
      {!loading && !error && mode === 'declare' ? <DeclareView options={options} /> : null}
      {!loading && !error && detail && mode === 'detail' ? <DetailSummary detail={detail} /> : null}
      {!loading && !error && detail && mode === 'approve' ? <ApproveView detail={detail} /> : null}
      {!loading && !error && detail && mode === 'progress' ? <ProgressView detail={detail} /> : null}
      {!loading && !error && detail && mode === 'outcome' ? <OutcomeView detail={detail} options={options} /> : null}
    </Stack>
  )
}

export default SampleSprintsWorkspace
