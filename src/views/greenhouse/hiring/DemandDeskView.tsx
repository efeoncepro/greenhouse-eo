'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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
  manager: string
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
  manager: 'mp',
  targetDate: '',
  summary: '',
  compensationMin: '',
  compensationMax: '',
}

const AREAS = ['Growth', 'Marketing', 'Creative', 'Technology', 'Operations', 'People', 'Finance', 'Sales', 'Strategy']
const SENIORITIES = ['Junior', 'Semi Senior', 'Senior', 'Lead']

const MANAGERS = [
  ['mp', 'María José Peña'],
  ['jr', 'Julio Reyes'],
  ['cm', 'Carla Muñoz'],
] as const

const formForTemplate = (value: string): DemandForm => {
  if (value === 'account-manager') {
    return { ...EMPTY_FORM, role: 'Account Manager', area: 'Growth', seniority: 'Junior', skills: 'Account mgmt, Upsell, QBR', summary: 'Lidera las cuentas clave de Growth y su expansión.' }
  }

  if (value === 'growth-designer') {
    return { ...EMPTY_FORM, role: 'Growth Designer', area: 'Growth', seniority: 'Semi Senior', skills: 'Figma, CRO, Experimentación', summary: 'Diseña experiencias digitales que combinan craft, datos y velocidad de aprendizaje.' }
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

const DemandKpi = ({
  label,
  value,
  delta,
  icon,
  tone,
}: {
  label: string
  value: number
  delta: string
  icon: string
  tone: 'primary' | 'success' | 'secondary' | 'info'
}) => (
  <Paper
    variant='outlined'
    sx={(theme) => ({
      position: 'relative',
      minBlockSize: 128,
      p: 6,
      overflow: 'hidden',
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      containerType: 'inline-size',
      backgroundColor: 'background.paper',
    })}
  >
    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='caption' color='text.secondary' fontWeight={650}>{label}</Typography>
        <Typography variant='h3' sx={{ mt: 4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>{delta}</Typography>
      </Box>
      <Box sx={(theme) => ({ display: 'grid', placeItems: 'center', flex: '0 0 auto', inlineSize: 34, blockSize: 34, borderRadius: `${theme.shape.customBorderRadius.md}px`, color: `${tone}.dark`, backgroundColor: `${tone}.lightOpacity` })}>
        <i aria-hidden='true' className={icon} />
      </Box>
    </Stack>
  </Paper>
)

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
  const [demandView, setDemandView] = useState<'data' | 'empty' | 'error'>('data')
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

  const effectiveLoadError = loadError || (demandView === 'error' ? 'Verifica tu conexión e intenta de nuevo. Si persiste, el equipo ya fue notificado.' : null)
  const rowsForView = demandView === 'empty' || demandView === 'error' ? [] : visibleOpenings

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
      onClick={() => { setDiscardOpen(false); setDrawerOpen(true) }}
      dataCapture='hiring-new-demand'
    >
      {copy.demand.newDemand}
    </GreenhouseButton>
  )

  const content = (
    <Stack spacing={5} sx={{ minWidth: 0 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <DemandKpi label={copy.demand.activeDemands} value={pipelineMetrics.active} delta='+4 vs. semana anterior' icon='tabler-users' tone='primary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <DemandKpi label={copy.demand.openPositions} value={pipelineMetrics.evaluation} delta='+2 vs. semana anterior' icon='tabler-clipboard-check' tone='success' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <DemandKpi label={copy.demand.applicants} value={pipelineMetrics.pendingDecision} delta='+1 esperando decisión' icon='tabler-gavel' tone='secondary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <DemandKpi label={copy.demand.published} value={pipelineMetrics.selectedThisMonth} delta='+1 vs. mes anterior' icon='tabler-user-check' tone='info' />
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={3} useFlexGap flexWrap='wrap'>
          <Box sx={{ inlineSize: { xs: '100%', md: 320 } }}>
            <TextField
              data-capture='hiring-demand-search'
              size='small'
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
          </Box>
          <FormControl size='small' sx={{ inlineSize: { xs: '100%', sm: 150 } }}><InputLabel id='demand-status-filter'>Estado</InputLabel><Select labelId='demand-status-filter' label='Estado' value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><MenuItem value=''>Todos</MenuItem><MenuItem value='active'>Abierta</MenuItem><MenuItem value='paused'>Pausada</MenuItem><MenuItem value='closed'>Cerrada</MenuItem><MenuItem value='draft'>Borrador</MenuItem></Select></FormControl>
          <FormControl size='small' sx={{ inlineSize: { xs: '100%', sm: 140 } }}><InputLabel id='demand-area-filter'>Área</InputLabel><Select labelId='demand-area-filter' label='Área' value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><MenuItem value=''>Todas</MenuItem>{availableAreas.map((area) => <MenuItem key={area} value={area}>{area}</MenuItem>)}</Select></FormControl>
          <Box sx={{ flex: 1 }} />
          <Stack direction='row' alignItems='center' spacing={2}>
            <Typography variant='caption' color='text.disabled'>Vista (demo)</Typography>
            <Box
              role='group'
              aria-label={copy.demand.title}
              sx={(theme) => ({
                display: 'inline-flex',
                blockSize: 34,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
              })}
            >
              {([
                ['data', 'Datos'],
                ['empty', 'Vacío'],
                ['error', 'Error'],
              ] as const).map(([value, label]) => (
                <Box
                  key={value}
                  component='button'
                  type='button'
                  onClick={() => setDemandView(value)}
                  sx={(theme) => ({
                    border: 0,
                    borderInlineStart: value === 'data' ? 0 : `1px solid ${theme.palette.divider}`,
                    px: 2.75,
                    cursor: 'pointer',
                    backgroundColor: demandView === value ? 'primary.main' : 'background.paper',
                    color: demandView === value ? 'primary.contrastText' : 'text.secondary',
                    fontSize: theme.typography.caption.fontSize,
                    fontWeight: 650,
                  })}
                >
                  {label}
                </Box>
              ))}
            </Box>
          </Stack>
          {action}
      </Stack>

      <Paper variant='outlined' sx={(theme) => ({ minWidth: 0, overflow: 'hidden', borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1} sx={{ px: 6, py: 4, borderBlockEnd: 1, borderColor: 'divider' }}><Box><Typography variant='h6'>{copy.demand.openingsTitle}</Typography><Typography variant='body2' color='text.secondary'>1 opening activo · foco del programa</Typography></Box></Stack>
        {effectiveLoadError ? (
          <Stack spacing={3.5} sx={{ px: 6, py: 8 }}>
            <Alert severity='error'>{effectiveLoadError}</Alert>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}><Button variant='outlined' size='small' startIcon={<i className='tabler-refresh' />} onClick={() => { setDemandView('data'); void refresh() }}>{copy.common.retry}</Button></Box>
          </Stack>
        ) : rowsForView.length === 0 && !loading ? (
          <Stack alignItems='center' spacing={3} sx={{ px: 6, py: 13, textAlign: 'center' }}>
            <Box sx={(theme) => ({ display: 'grid', placeItems: 'center', inlineSize: 56, blockSize: 56, borderRadius: '50%', color: theme.palette.primary.main, backgroundColor: theme.palette.primary.lightOpacity })}>
              <i aria-hidden='true' className={query ? 'tabler-search-off' : 'tabler-briefcase-off'} />
            </Box>
            <Typography variant='h5'>{query ? copy.common.noResults : copy.demand.emptyTitle}</Typography>
            <Typography color='text.secondary'>{query ? copy.demand.filteredEmptyBody : copy.demand.emptyBody}</Typography>
          </Stack>
        ) : (
          <TableContainer role='region' aria-label={copy.demand.title} tabIndex={0} sx={{ overflowX: 'auto' }}>
            <Table
              size='small'
              sx={{
                minWidth: 860,
                '& .MuiTableCell-head': {
                  px: 4,
                  py: 2.75,
                  color: 'text.disabled',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                },
                '& .MuiTableCell-body': {
                  px: 4,
                  py: 3.25,
                  borderColor: 'divider',
                },
                '& .MuiTableRow-root:hover': { backgroundColor: 'action.hover' },
              }}
            >
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
                {rowsForView.map(({ opening, demand, applicationCount }) => (
                  <TableRow key={opening.openingId} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant='body2' color='text.primary' fontWeight={650}>{opening.internalTitle}</Typography>
                        <Typography variant='caption' color='text.secondary'>{opening.publicId} · {opening.seniority ?? '—'}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{opening.publicArea ?? demand.businessUnit ?? '—'}</TableCell>
                    <TableCell align='center'>{opening.requestedSeats}</TableCell>
                    <TableCell>
                      <GreenhouseChip size='small' kind='status' variant='label' tone={STATUS_TONE[opening.status]} label={opening.status === 'active' ? 'Abierta' : opening.status} />
                    </TableCell>
                    <TableCell><GreenhouseChip size='small' kind='status' variant='label' tone={opening.publicationStatus === 'published' ? 'success' : opening.publicationStatus === 'paused' ? 'warning' : 'default'} label={opening.publicationStatus} /></TableCell>
                    <TableCell align='center'>
                      <Stack direction='row' alignItems='center' justifyContent='center' spacing={1.5}>
                        <i aria-hidden='true' className='tabler-users text-disabled' />
                        <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{applicationCount}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align='right'>
                      <Button
                        component={NextLink}
                        href={`/agency/hiring/pipeline?openingId=${opening.openingId}`}
                        size='small'
                        variant='tonal'
                        endIcon={<i aria-hidden='true' className='tabler-arrow-right' />}
                        aria-label={`${copy.pipeline.title}: ${opening.internalTitle}`}
                      >
                        Ver pipeline
                      </Button>
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
      <HiringDeskFrame surface='demand' copy={copy} primary={content} />

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
          sx: (theme) => ({
            inlineSize: 'min(520px, 100vw)',
            maxInlineSize: '100%',
            boxShadow: theme.shadows[16],
          }),
        }}
      >
        <Stack sx={{ minBlockSize: '100%' }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3} sx={{ px: 6, py: 4.5 }}>
            <Box>
              <Typography variant='h4'>{copy.demand.drawerTitle}</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.5 }}>{copy.demand.drawerSubtitle}</Typography>
            </Box>
            <IconButton aria-label={copy.common.close} onClick={requestClose}><i aria-hidden='true' className='tabler-x' /></IconButton>
          </Stack>
          <Divider />

          <Stack component='section' role='region' aria-label={copy.common.demandFormRegion} tabIndex={0} spacing={4.5} sx={{ flex: 1, px: 6, py: 4.5, overflowY: 'auto' }}>
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
            <Grid container spacing={3.5}>
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
            <Grid container spacing={3.5}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label={copy.demand.businessUnitLabel} value={form.businessUnit} onChange={(event) => updateForm('businessUnit', event.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth type='number' label={copy.demand.seatsLabel} value={form.seats} onChange={(event) => updateForm('seats', event.target.value)} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
              </Grid>
            </Grid>
            <Grid container spacing={3.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='hiring-mode-label'>{copy.demand.modeLabel}</InputLabel>
                  <Select labelId='hiring-mode-label' label={copy.demand.modeLabel} value={form.workMode} onChange={(event) => updateForm('workMode', event.target.value as HiringPublicWorkMode)}>
                    <MenuItem value='remote'>Remoto</MenuItem>
                    <MenuItem value='hybrid'>Híbrido</MenuItem>
                    <MenuItem value='onsite'>Presencial</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id='hiring-manager-label'>{copy.demand.owner}</InputLabel>
                  <Select labelId='hiring-manager-label' label={copy.demand.owner} value={form.manager} onChange={(event) => updateForm('manager', event.target.value)}>
                    {MANAGERS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField type='date' label={copy.demand.targetDateLabel} value={form.targetDate} onChange={(event) => updateForm('targetDate', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />

            <Paper variant='outlined' sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant='subtitle1' fontWeight={650}>{copy.demand.internalCompensation}</Typography>
                  <Typography variant='caption' color='text.secondary'>{copy.demand.compensationHint}</Typography>
                </Box>
                <Grid container spacing={3.5}>
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

            <Paper variant='outlined' sx={(theme) => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px`, overflow: 'hidden' })}>
              <Stack direction='row' alignItems='center' spacing={1.75} sx={{ px: 3.5, py: 2.25, backgroundColor: 'action.hover', borderBlockEnd: 1, borderColor: 'divider' }}>
                <i aria-hidden='true' className='tabler-eye text-success' />
                <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: '.05em' }}>Vista previa · público</Typography>
              </Stack>
              <Stack spacing={2} sx={{ p: 3.5 }}>
                <Typography variant='h6'>{form.role || 'Nuevo cargo'}</Typography>
                <Typography variant='caption' color='text.secondary'>{form.area || 'Growth'} · {form.businessUnit || 'Chile'} · {form.workMode === 'remote' ? 'Remoto' : form.workMode === 'hybrid' ? 'Híbrido' : 'Presencial'} · {form.seniority}</Typography>
                <Typography color='text.primary'>{form.summary || 'Sin resumen aún.'}</Typography>
                {skillTokens.length > 0 ? (
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    {skillTokens.map((skill) => <GreenhouseChip key={skill} size='small' kind='attribute' label={skill} />)}
                  </Stack>
                ) : null}
              </Stack>
            </Paper>
            <Alert severity='info'>{copy.demand.drawerHint}</Alert>
          </Stack>

          <Divider />
          <Stack sx={{ position: 'sticky', insetBlockEnd: 0, px: 6, py: 3.5, backgroundColor: 'background.paper' }}>
            {discardOpen ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent='space-between' spacing={3}>
                <Typography color='text.primary'>{copy.demand.discardBody}</Typography>
                <Stack direction='row' justifyContent='flex-end' spacing={2}>
                  <Button variant='text' onClick={() => setDiscardOpen(false)}>{copy.demand.discardContinue}</Button>
                  <Button color='error' variant='contained' onClick={() => { setDiscardOpen(false); setDrawerOpen(false); resetForm() }}>{copy.demand.discard}</Button>
                </Stack>
              </Stack>
            ) : (
              <Stack direction='row' justifyContent='flex-end' alignItems='center' spacing={2.5}>
                <Button variant='outlined' onClick={requestClose} disabled={submitting}>{copy.common.cancel}</Button>
                <Stack direction='row' justifyContent='flex-end'>
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : <i aria-hidden='true' className='tabler-plus' />}
                    sx={(theme) => ({
                      minBlockSize: 38,
                      borderStartEndRadius: 0,
                      borderEndEndRadius: 0,
                      color: theme.palette.primary.contrastText,
                      boxShadow: 'none',
                      fontWeight: 700,
                      '&:hover': {
                        boxShadow: 'none',
                        backgroundColor: theme.palette.primary.dark,
                      },
                    })}
                  >
                    {copy.demand.create}
                  </Button>
                  <IconButton
                    aria-label={copy.common.createOptions}
                    aria-haspopup='menu'
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                    disabled={submitting}
                    sx={(theme) => ({ ml: 0.5, border: `1px solid ${theme.palette.primary.main}`, borderRadius: `${theme.shape.customBorderRadius.md}px`, color: theme.palette.primary.contrastText, backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } })}
                  >
                    <i aria-hidden='true' className='tabler-chevron-up' />
                  </IconButton>
                  <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                    <MenuItem onClick={() => { setMenuAnchor(null); void createDemand('publish') }}>
                      <i aria-hidden='true' className='tabler-world-upload mie-2 text-success' /> {copy.demand.createAndPublish}
                    </MenuItem>
                    <MenuItem onClick={() => { setMenuAnchor(null); void createDemand('another') }}>
                      <i aria-hidden='true' className='tabler-copy-plus mie-2' /> {copy.demand.createAnother}
                    </MenuItem>
                  </Menu>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Drawer>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  )
}

export default DemandDeskView
