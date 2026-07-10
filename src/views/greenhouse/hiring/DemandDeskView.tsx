'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import {
  GreenhouseButton,
  GreenhouseChip,
  MetricSummaryCard,
} from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import type {
  HiringDeskSnapshot,
  HiringOpening,
  HiringPublicWorkMode,
  TalentDemand,
} from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import { hiringRequest } from './hiring-client'

type CreateMode = 'create' | 'publish' | 'another'

type DemandForm = {
  role: string
  area: string
  seniority: string
  skills: string
  businessUnit: string
  seats: string
  workMode: HiringPublicWorkMode
  targetDate: string
  summary: string
  compensationMin: string
  compensationMax: string
}

const EMPTY_FORM: DemandForm = {
  role: '',
  area: 'Growth',
  seniority: 'Semi Senior',
  skills: '',
  businessUnit: 'Chile',
  seats: '1',
  workMode: 'hybrid',
  targetDate: '',
  summary: '',
  compensationMin: '',
  compensationMax: '',
}

const AREAS = ['Growth', 'Marketing', 'Creative', 'Technology', 'Operations', 'People', 'Finance', 'Sales', 'Strategy']
const SENIORITIES = ['Junior', 'Semi Senior', 'Senior', 'Lead']

const formForTemplate = (value: string): DemandForm => {
  if (value === 'account-manager') {
    return { ...EMPTY_FORM, role: 'Account Manager', area: 'Sales', seniority: 'Senior', skills: 'Gestión de clientes, CRM, Inglés', summary: 'Lidera relaciones de largo plazo y convierte estrategia en crecimiento medible.' }
  }

  if (value === 'growth-designer') {
    return { ...EMPTY_FORM, role: 'Growth Designer', area: 'Growth', seniority: 'Senior', skills: 'Figma, Experimentación, CRO', summary: 'Diseña experiencias digitales que combinan craft, datos y velocidad de aprendizaje.' }
  }

  if (value === 'data-engineer') {
    return { ...EMPTY_FORM, role: 'Data Engineer', area: 'Technology', seniority: 'Senior', skills: 'SQL, Python, BigQuery', summary: 'Construye productos de datos confiables para acelerar decisiones y automatización.' }
  }

  return EMPTY_FORM
}

const STATUS_TONE = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  filled: 'info',
  cancelled: 'error',
  closed: 'default',
} as const

interface DemandDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
  currentUserId: string
  simulateLoadFailure?: boolean
  initialDrawerTemplate?: string
  initialQuery?: string
}

const DemandDeskView = ({ copy, initialSnapshot, currentUserId, simulateLoadFailure = false, initialDrawerTemplate, initialQuery = '' }: DemandDeskViewProps) => {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [query, setQuery] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialDrawerTemplate))
  const [form, setForm] = useState<DemandForm>(() => initialDrawerTemplate ? formForTemplate(initialDrawerTemplate) : EMPTY_FORM)
  const [template, setTemplate] = useState(initialDrawerTemplate ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(EMPTY_FORM), [form])
  const skillTokens = useMemo(() => form.skills.split(',').map((item) => item.trim()).filter(Boolean), [form.skills])

  const pipelineMetrics = useMemo(() => {
    const active = snapshot.applications.filter(({ application }) => !['rejected', 'withdrawn', 'closed'].includes(application.stage))
    const evaluation = active.filter(({ application }) => ['qualified', 'shortlisted', 'client_review'].includes(application.stage))
    const pendingDecision = active.filter(({ application }) => application.stage === 'decision_pending')
    const now = new Date()

    const selectedThisMonth = snapshot.applications.filter(({ application }) => {
      if (application.decision !== 'selected' || !application.decisionAt) return false

      const decidedAt = new Date(application.decisionAt)

      return decidedAt.getFullYear() === now.getFullYear() && decidedAt.getMonth() === now.getMonth()
    })

    return { active: active.length, evaluation: evaluation.length, pendingDecision: pendingDecision.length, selectedThisMonth: selectedThisMonth.length }
  }, [snapshot.applications])

  const availableAreas = useMemo(() => [...new Set(snapshot.openings.map(({ opening, demand }) => opening.publicArea ?? demand.businessUnit).filter(Boolean))] as string[], [snapshot.openings])

  const visibleOpenings = useMemo(() => snapshot.openings.filter(({ opening, demand }) => {
    if (statusFilter && opening.status !== statusFilter) return false
    if (areaFilter && (opening.publicArea ?? demand.businessUnit) !== areaFilter) return false

    if (query.trim()) {
      const normalizedQuery = query.trim().toLocaleLowerCase('es-CL')

      const matchesQuery = [opening.internalTitle, opening.publicTitle, demand.requestedRole, demand.businessUnit]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(normalizedQuery))

      if (!matchesQuery) return false
    }

    return true
  }), [areaFilter, query, snapshot.openings, statusFilter])

  const refresh = useCallback(async (nextQuery = query) => {
    setLoading(true)
    setLoadError(null)

    try {
      if (simulateLoadFailure) throw new Error('No pudimos cargar las demandas. Verifica tu conexión e intenta de nuevo.')

      const data = await hiringRequest<HiringDeskSnapshot>(
        `/api/hiring/desk?query=${encodeURIComponent(nextQuery)}&openingLimit=80&applicationLimit=120`,
      )

      setSnapshot(data)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar Hiring Desk.')
    } finally {
      setLoading(false)
    }
  }, [query, simulateLoadFailure])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(query), 280)

    return () => window.clearTimeout(timer)
  }, [query, refresh])

  const updateForm = <Key extends keyof DemandForm>(key: Key, value: DemandForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }

  const applyTemplate = (value: string) => {
    setTemplate(value)
    setForm(formForTemplate(value))
  }

  const requestClose = () => {
    if (isDirty) {
      setDiscardOpen(true)

      return
    }

    setDrawerOpen(false)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setTemplate('')
    setFormError(null)
  }

  const createDemand = async (mode: CreateMode) => {
    if (!form.role.trim() || !form.area || !form.seniority || !form.summary.trim()) {
      setFormError('Completa rol, área, seniority y resumen antes de continuar.')

      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const skills = form.skills.split(',').map((item) => item.trim()).filter(Boolean)

      const budgetBand = form.compensationMin || form.compensationMax
        ? `${form.compensationMin || '—'}–${form.compensationMax || '—'}`
        : null

      const demand = await hiringRequest<TalentDemand>('/api/hiring/demands', {
        method: 'POST',
        body: JSON.stringify({
          stakeholderType: 'internal',
          engagementType: 'on_demand',
          fulfillmentMode: 'internal_hire',
          demandOrigin: 'manual_internal',
          requestedRole: form.role.trim(),
          requestedSeats: Number(form.seats) || 1,
          requestedSkills: skills,
          businessUnit: form.businessUnit.trim() || form.area,
          targetStartDate: form.targetDate || null,
          priority: 'medium',
          budgetBand,
          ownerUserId: currentUserId,
          notes: form.summary.trim(),
        }),
      })

      const opening = await hiringRequest<HiringOpening>('/api/hiring/openings', {
        method: 'POST',
        body: JSON.stringify({
          demandId: demand.demandId,
          internalTitle: form.role.trim(),
          seniority: form.seniority,
          requestedSeats: Number(form.seats) || 1,
          ownerUserId: currentUserId,
          budgetBand,
          internalNotes: form.summary.trim(),
        }),
      })

      await hiringRequest(`/api/hiring/openings/${opening.openingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: mode === 'publish' ? 'active' : 'draft',
          visibility: mode === 'publish' ? 'public_listed' : 'private_sourcing',
          publicTitle: form.role.trim(),
          publicSummary: form.summary.trim(),
          publicDescription: form.summary.trim(),
          publicArea: form.area,
          publicSeniority: form.seniority,
          publicSkillTags: skills,
          publicWorkMode: form.workMode,
          publicHiringRegion: form.workMode === 'remote' ? 'LATAM' : null,
          publicLocationMode: form.workMode === 'remote' ? 'Remoto' : form.workMode === 'hybrid' ? 'Híbrido' : 'Presencial',
        }),
      })

      if (mode === 'publish') {
        await hiringRequest(`/api/hiring/demands/${demand.demandId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'open' }),
        })
        await hiringRequest(`/api/hiring/openings/${opening.openingId}/publish`, { method: 'POST' })
      }

      setToast(copy.demand.created)
      resetForm()
      await refresh('')

      if (mode !== 'another') setDrawerOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear la demanda.')
    } finally {
      setSubmitting(false)
    }
  }

  const action = (
    <GreenhouseButton
      kind='primaryAction'
      leadingIconClassName='tabler-plus'
      onClick={() => setDrawerOpen(true)}
      dataCapture='hiring-new-demand'
    >
      {copy.demand.newDemand}
    </GreenhouseButton>
  )

  const content = (
    <Stack spacing={4} sx={{ minWidth: 0 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricSummaryCard density='auto' titleEmphasis title={copy.demand.activeDemands} value={pipelineMetrics.active} subtitle='+4 vs. semana anterior' icon='tabler-users' iconColor='primary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricSummaryCard density='auto' titleEmphasis title={copy.demand.openPositions} value={pipelineMetrics.evaluation} subtitle='+2 vs. semana anterior' icon='tabler-clipboard-check' iconColor='success' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricSummaryCard density='auto' titleEmphasis title={copy.demand.applicants} value={pipelineMetrics.pendingDecision} subtitle='+1 esperando decisión' icon='tabler-gavel' iconColor='secondary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricSummaryCard density='auto' titleEmphasis title={copy.demand.published} value={pipelineMetrics.selectedThisMonth} subtitle='+1 vs. mes anterior' icon='tabler-user-check' iconColor='info' />
        </Grid>
      </Grid>

      <Paper variant='outlined' sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              data-capture='hiring-demand-search'
              fullWidth
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Buscar por rol…'
              aria-label={copy.common.search}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position='start'><i aria-hidden='true' className='tabler-search' /></InputAdornment>,
                  endAdornment: loading ? <InputAdornment position='end'><CircularProgress size={18} aria-label={copy.common.loading} /></InputAdornment> : undefined,
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth><InputLabel id='demand-status-filter'>Estado</InputLabel><Select labelId='demand-status-filter' label='Estado' value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><MenuItem value=''>Todos</MenuItem><MenuItem value='active'>Abierta</MenuItem><MenuItem value='paused'>Pausada</MenuItem><MenuItem value='closed'>Cerrada</MenuItem><MenuItem value='draft'>Borrador</MenuItem></Select></FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth><InputLabel id='demand-area-filter'>Área</InputLabel><Select labelId='demand-area-filter' label='Área' value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><MenuItem value=''>Todas</MenuItem>{availableAreas.map((area) => <MenuItem key={area} value={area}>{area}</MenuItem>)}</Select></FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loadError ? <Alert severity='error' action={<Button onClick={() => void refresh()}>{copy.common.retry}</Button>}>{loadError}</Alert> : null}

      <Paper variant='outlined' sx={{ minWidth: 0, overflow: 'hidden', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1} sx={{ px: 3, py: 2.5, borderBlockEnd: 1, borderColor: 'divider' }}><Typography variant='h6'>{copy.demand.openingsTitle}</Typography><Typography variant='body2' color='text.secondary'>{visibleOpenings.length} {copy.demand.openingsCaption}</Typography></Stack>
        {visibleOpenings.length === 0 && !loading ? (
          <Stack alignItems='center' spacing={2} sx={{ px: 3, py: 9, textAlign: 'center' }}>
            <Box sx={(theme) => ({ display: 'grid', placeItems: 'center', inlineSize: 56, blockSize: 56, borderRadius: '50%', color: theme.palette.primary.main, backgroundColor: theme.palette.primary.lightOpacity })}>
              <i aria-hidden='true' className='tabler-briefcase-off' />
            </Box>
            <Typography variant='h5'>{query ? copy.common.noResults : copy.demand.emptyTitle}</Typography>
            <Typography color='text.secondary'>{query ? copy.demand.filteredEmptyBody : copy.demand.emptyBody}</Typography>
          </Stack>
        ) : (
          <TableContainer role='region' aria-label={copy.demand.title} tabIndex={0} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{copy.demand.role}</TableCell>
                  <TableCell>{copy.demand.area}</TableCell>
                  <TableCell align='center'>{copy.demand.seats}</TableCell>
                  <TableCell>{copy.demand.status}</TableCell>
                  <TableCell>{copy.demand.publication}</TableCell>
                  <TableCell align='center'>{copy.demand.candidates}</TableCell>
                  <TableCell align='right' aria-label={copy.common.openApplication} />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleOpenings.map(({ opening, demand, applicationCount }) => (
                  <TableRow key={opening.openingId} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant='subtitle1' color='text.primary' fontWeight={650}>{opening.internalTitle}</Typography>
                        <Typography variant='caption' color='text.secondary'>{opening.publicId} · {opening.seniority ?? '—'}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{opening.publicArea ?? demand.businessUnit ?? '—'}</TableCell>
                    <TableCell align='center'>{opening.requestedSeats}</TableCell>
                    <TableCell>
                      <GreenhouseChip size='small' kind='status' variant='label' tone={STATUS_TONE[opening.status]} label={opening.status === 'active' ? 'Abierta' : opening.status} />
                    </TableCell>
                    <TableCell><GreenhouseChip size='small' kind='status' variant='label' tone={opening.publicationStatus === 'published' ? 'success' : opening.publicationStatus === 'paused' ? 'warning' : 'default'} label={opening.publicationStatus} /></TableCell>
                    <TableCell align='center'><Typography fontWeight={700}>{applicationCount}</Typography></TableCell>
                    <TableCell align='right'>
                      <IconButton component={NextLink} href={`/agency/hiring/pipeline?openingId=${opening.openingId}`} aria-label={`${copy.pipeline.title}: ${opening.internalTitle}`}>
                        <i aria-hidden='true' className='tabler-arrow-up-right' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  )

  return (
    <>
      <HiringDeskFrame surface='demand' copy={copy} action={action} primary={content} />

      <Drawer
        anchor='right'
        open={drawerOpen}
        onClose={requestClose}
        PaperProps={{
          component: 'form',
          'data-capture': 'hiring-demand-drawer',
          onSubmit: (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void createDemand('create') },
          onKeyDown: (event: KeyboardEvent<HTMLFormElement>) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              void createDemand('create')
            }
          },
          sx: { inlineSize: 'min(520px, 100vw)', maxInlineSize: '100%' },
        }}
      >
        <Stack sx={{ minBlockSize: '100%' }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2} sx={{ px: { xs: 2.5, sm: 4 }, py: 3 }}>
            <Box>
              <Typography variant='h4'>{copy.demand.drawerTitle}</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.5 }}>{copy.demand.drawerSubtitle}</Typography>
            </Box>
            <IconButton aria-label={copy.common.close} onClick={requestClose}><i aria-hidden='true' className='tabler-x' /></IconButton>
          </Stack>
          <Divider />

          <Stack component='section' role='region' aria-label={copy.common.demandFormRegion} tabIndex={0} spacing={3} sx={{ flex: 1, px: { xs: 2.5, sm: 4 }, py: 3, overflowY: 'auto' }}>
            {formError ? <Alert severity='error'>{formError}</Alert> : null}

            <Box>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>{copy.demand.templateLabel}</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {[
                  ['account-manager', 'Account Manager'],
                  ['growth-designer', 'Growth Designer'],
                  ['data-engineer', 'Data Engineer'],
                ].map(([value, label]) => (
                  <GreenhouseChip
                    key={value}
                    dataCapture={`hiring-template-${value}`}
                    clickable
                    kind='filter'
                    iconClassName='tabler-sparkles'
                    variant={template === value ? 'solid' : 'outlined'}
                    tone={template === value ? 'primary' : 'default'}
                    label={label}
                    onClick={() => applyTemplate(value)}
                  />
                ))}
              </Stack>
            </Box>

            <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: '0.08em' }}>Identidad del cargo</Typography>

            <TextField required autoFocus label={copy.demand.roleLabel} value={form.role} onChange={(event) => updateForm('role', event.target.value)} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel id='hiring-area-label'>{copy.demand.areaLabel}</InputLabel>
                  <Select labelId='hiring-area-label' label={copy.demand.areaLabel} value={form.area} onChange={(event) => updateForm('area', event.target.value)}>
                    {AREAS.map((area) => <MenuItem key={area} value={area}>{area}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel id='hiring-seniority-label'>{copy.demand.seniorityLabel}</InputLabel>
                  <Select labelId='hiring-seniority-label' label={copy.demand.seniorityLabel} value={form.seniority} onChange={(event) => updateForm('seniority', event.target.value)}>
                    {SENIORITIES.map((seniority) => <MenuItem key={seniority} value={seniority}>{seniority}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box>
              {skillTokens.length > 0 ? (
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 1.5 }}>
                  {skillTokens.map((skill) => (
                    <GreenhouseChip
                      key={skill}
                      size='small'
                      kind='input'
                      tone='primary'
                      variant='label'
                      label={skill}
                      closable
                      closeLabel={`Quitar ${skill}`}
                      onDelete={() => updateForm('skills', skillTokens.filter((item) => item !== skill).join(', '))}
                    />
                  ))}
                </Stack>
              ) : null}
              <TextField fullWidth label={copy.demand.skillsLabel} value={form.skills} onChange={(event) => updateForm('skills', event.target.value)} helperText='Escribe y separa cada skill con una coma.' />
            </Box>
            <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: '0.08em' }}>Contexto</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label={copy.demand.businessUnitLabel} value={form.businessUnit} onChange={(event) => updateForm('businessUnit', event.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth type='number' label={copy.demand.seatsLabel} value={form.seats} onChange={(event) => updateForm('seats', event.target.value)} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel id='hiring-mode-label'>{copy.demand.modeLabel}</InputLabel>
              <Select labelId='hiring-mode-label' label={copy.demand.modeLabel} value={form.workMode} onChange={(event) => updateForm('workMode', event.target.value as HiringPublicWorkMode)}>
                <MenuItem value='remote'>Remoto</MenuItem>
                <MenuItem value='hybrid'>Híbrido</MenuItem>
                <MenuItem value='onsite'>Presencial</MenuItem>
              </Select>
            </FormControl>
            <TextField type='date' label={copy.demand.targetDateLabel} value={form.targetDate} onChange={(event) => updateForm('targetDate', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField disabled label={copy.demand.owner} value={copy.demand.ownerSelf} />

            <Paper variant='outlined' sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant='subtitle1' fontWeight={650}>{copy.demand.internalCompensation}</Typography>
                  <Typography variant='caption' color='text.secondary'>{copy.demand.compensationHint}</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}><TextField fullWidth label='Mínimo' value={form.compensationMin} onChange={(event) => updateForm('compensationMin', event.target.value)} /></Grid>
                  <Grid size={{ xs: 6 }}><TextField fullWidth label='Máximo' value={form.compensationMax} onChange={(event) => updateForm('compensationMax', event.target.value)} /></Grid>
                </Grid>
              </Stack>
            </Paper>

            <TextField
              required
              multiline
              minRows={3}
              label={copy.demand.summaryLabel}
              value={form.summary}
              onChange={(event) => updateForm('summary', event.target.value.slice(0, 140))}
              helperText={`${form.summary.length}/140`}
            />

            <Paper sx={(theme) => ({ p: 3, borderRadius: 3, background: `linear-gradient(145deg, ${theme.palette.primary.lightOpacity}, ${theme.palette.background.paper})`, border: `1px solid ${theme.palette.primary.lightOpacity}` })}>
              <Typography variant='overline' color='primary.main'>{copy.demand.previewTitle}</Typography>
              <Typography variant='h5' sx={{ mt: 1 }}>{form.role || copy.demand.roleLabel}</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ my: 1.5 }}>
                {form.area ? <GreenhouseChip size='small' kind='attribute' label={form.area} /> : null}
                {form.seniority ? <GreenhouseChip size='small' kind='attribute' label={form.seniority} /> : null}
                <GreenhouseChip size='small' kind='attribute' label={form.workMode === 'remote' ? 'Remoto' : form.workMode === 'hybrid' ? 'Híbrido' : 'Presencial'} />
                <GreenhouseChip size='small' kind='attribute' label={`${form.seats || 1} ${copy.demand.seats.toLocaleLowerCase()}`} />
              </Stack>
              <Typography color='text.secondary'>{form.summary || 'El resumen público aparecerá aquí.'}</Typography>
            </Paper>
            <Alert severity='info'>{copy.demand.drawerHint}</Alert>
          </Stack>

          <Divider />
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent='space-between' spacing={2} sx={{ position: 'sticky', insetBlockEnd: 0, p: { xs: 2.5, sm: 3 }, backgroundColor: 'background.paper' }}>
            <Button onClick={requestClose} disabled={submitting}>{copy.common.cancel}</Button>
            <Stack direction='row' justifyContent='flex-end'>
              <GreenhouseButton type='submit' disabled={submitting} leadingIcon={submitting ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}>
                {copy.demand.create}
              </GreenhouseButton>
              <IconButton
                aria-label={copy.common.createOptions}
                aria-haspopup='menu'
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                disabled={submitting}
                sx={(theme) => ({ ml: 0.5, border: `1px solid ${theme.palette.primary.main}`, borderRadius: `${theme.shape.customBorderRadius.md}px`, color: theme.palette.primary.contrastText, backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } })}
              >
                <i aria-hidden='true' className='tabler-chevron-down' />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => { setMenuAnchor(null); void createDemand('publish') }}>
                  <i aria-hidden='true' className='tabler-world-upload mie-2' /> {copy.demand.createAndPublish}
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); void createDemand('another') }}>
                  <i aria-hidden='true' className='tabler-copy-plus mie-2' /> {copy.demand.createAnother}
                </MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>

      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} PaperProps={{ 'data-capture': 'hiring-demand-discard-dialog' }}>
        <DialogTitle>{copy.demand.discardTitle}</DialogTitle>
        <DialogContent><Typography color='text.secondary'>{copy.demand.discardBody}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>{copy.demand.discardContinue}</Button>
          <Button color='error' onClick={() => { setDiscardOpen(false); setDrawerOpen(false); resetForm() }}>{copy.demand.discard}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  )
}

export default DemandDeskView
