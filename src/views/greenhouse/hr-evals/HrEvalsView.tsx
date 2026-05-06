'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'


import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import { getMicrocopy } from '@/lib/copy'

import { DataTableShell } from '@/components/greenhouse/data-table'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import type {
  AssignmentStatus,
  CreateEvalCycleInput,
  EvalAssignmentWithResponses,
  EvalAssignmentsResponse,
  EvalCompetency,
  EvalCycle,
  EvalCycleStatus,
  EvalCycleType,
  EvalCyclesResponse,
  EvalSummariesResponse,
  EvalSummaryWithDetails,
  EvalType
} from '@/types/hr-evals'

const TASK407_ARIA_FILTRAR_POR_TIPO = "Filtrar por tipo"
const TASK407_ARIA_SECCIONES_DE_EVALUACIONES = "Secciones de evaluaciones"


const GREENHOUSE_COPY = getMicrocopy()

// ── Constants ──

const CYCLE_TYPE_LABELS: Record<EvalCycleType, string> = {
  quarterly: 'Trimestral',
  semester: 'Semestral',
  annual: 'Anual'
}

const CYCLE_STATUS_CHIP_COLOR: Record<EvalCycleStatus, 'default' | 'info' | 'primary' | 'warning' | 'secondary' | 'success'> = {
  draft: 'default',
  self_eval: 'info',
  peer_eval: 'primary',
  manager_review: 'warning',
  calibration: 'secondary',
  closed: 'success'
}

const CYCLE_STATUS_LABELS: Record<EvalCycleStatus, string> = {
  draft: 'Borrador',
  self_eval: 'Autoevaluacion',
  peer_eval: 'Evaluacion de pares',
  manager_review: 'Revision gerencial',
  calibration: 'Calibracion',
  closed: 'Cerrado'
}

const ASSIGNMENT_STATUS_CHIP_COLOR: Record<AssignmentStatus, 'default' | 'info' | 'success' | 'warning'> = {
  pending: 'default',
  in_progress: 'info',
  submitted: 'success',
  skipped: 'warning'
}

const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  submitted: 'Enviada',
  skipped: 'Omitida'
}

const EVAL_TYPE_LABELS: Record<EvalType, string> = {
  self: 'Autoevaluacion',
  peer: 'Par',
  manager: 'Gerente',
  direct_report: 'Reporte directo'
}

const EVAL_TYPE_CHIP_COLOR: Record<EvalType, 'info' | 'primary' | 'warning' | 'secondary'> = {
  self: 'info',
  peer: 'primary',
  manager: 'warning',
  direct_report: 'secondary'
}

const PHASE_ORDER: EvalCycleStatus[] = ['draft', 'self_eval', 'peer_eval', 'manager_review', 'calibration', 'closed']

const INITIAL_FORM: CreateEvalCycleInput = {
  cycleName: '',
  cycleType: 'quarterly',
  startDate: '',
  endDate: '',
  selfEvalDeadline: null,
  peerEvalDeadline: null,
  managerDeadline: null,
  competencyIds: [],
  minTenureDays: 90
}

// ── Helpers ──

const formatDate = (iso: string | null) => {
  if (!iso) return '-'

  try {
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const getNextPhase = (current: EvalCycleStatus): EvalCycleStatus | null => {
  const idx = PHASE_ORDER.indexOf(current)

  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null

  return PHASE_ORDER[idx + 1]
}

const formatRating = (val: number | null): string => {
  if (val == null) return '-'

  return val.toFixed(1)
}

const formatPercent = (val: number | null): string => {
  if (val == null) return '-'

  return `${Math.round(val)}%`
}

// ── Component ──

const HrEvalsView = () => {
  const [tab, setTab] = useState('cycles')
  const [cycles, setCycles] = useState<EvalCycle[]>([])
  const [assignments, setAssignments] = useState<EvalAssignmentWithResponses[]>([])
  const [summaries, setSummaries] = useState<EvalSummaryWithDetails[]>([])
  const [competencies, setCompetencies] = useState<EvalCompetency[]>([])
  const [loading, setLoading] = useState(true)
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateEvalCycleInput>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [typeFilter, setTypeFilter] = useState<EvalType | 'all'>('all')

  const activeCycle = useMemo(
    () => cycles.find(c => c.status !== 'draft' && c.status !== 'closed') ?? cycles.find(c => c.status === 'draft') ?? null,
    [cycles]
  )

  // ── Fetchers ──

  const fetchCycles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/evaluations/cycles')

      if (!res.ok) throw new Error('Error al cargar ciclos')

      const data: EvalCyclesResponse = await res.json()

      setCycles(data.cycles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCompetencies = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/evaluations/competencies')

      if (!res.ok) return

      const data = await res.json()

      setCompetencies(data.competencies ?? [])
    } catch {
      // silent — competencies are optional for the dialog
    }
  }, [])

  const fetchAssignments = useCallback(async (cycleId: string) => {
    setAssignmentsLoading(true)

    try {
      const res = await fetch(`/api/hr/evaluations/assignments?cycleId=${cycleId}`)

      if (!res.ok) throw new Error('Error al cargar asignaciones')

      const data: EvalAssignmentsResponse = await res.json()

      setAssignments(data.assignments)
    } catch {
      setAssignments([])
    } finally {
      setAssignmentsLoading(false)
    }
  }, [])

  const fetchSummaries = useCallback(async (cycleId: string) => {
    setSummariesLoading(true)

    try {
      const res = await fetch(`/api/hr/evaluations/summaries?cycleId=${cycleId}`)

      if (!res.ok) throw new Error('Error al cargar resultados')

      const data: EvalSummariesResponse = await res.json()

      setSummaries(data.summaries)
    } catch {
      setSummaries([])
    } finally {
      setSummariesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCycles()
    fetchCompetencies()
  }, [fetchCycles, fetchCompetencies])

  useEffect(() => {
    if (tab === 'assignments' && activeCycle) {
      fetchAssignments(activeCycle.evalCycleId)
    }

    if (tab === 'results' && activeCycle) {
      fetchSummaries(activeCycle.evalCycleId)
    }
  }, [tab, activeCycle, fetchAssignments, fetchSummaries])

  // ── Handlers ──

  const handleCreateCycle = async () => {
    setSubmitting(true)

    try {
      const res = await fetch('/api/hr/evaluations/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) throw new Error('Error al crear ciclo')

      setDialogOpen(false)
      setForm(INITIAL_FORM)
      fetchCycles()
    } catch {
      // keep dialog open on error
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdvancePhase = async (cycleId: string, currentStatus: EvalCycleStatus) => {
    const nextPhase = getNextPhase(currentStatus)

    if (!nextPhase) return

    try {
      const res = await fetch(`/api/hr/evaluations/cycles/${cycleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextPhase })
      })

      if (!res.ok) throw new Error('Error al avanzar fase')

      fetchCycles()
    } catch {
      // silent
    }
  }

  const handleGenerateAssignments = async (cycleId: string) => {
    try {
      const res = await fetch(`/api/hr/evaluations/cycles/${cycleId}/generate-assignments`, {
        method: 'POST'
      })

      if (!res.ok) throw new Error('Error al generar asignaciones')

      if (activeCycle?.evalCycleId === cycleId) {
        fetchAssignments(cycleId)
      }
    } catch {
      // silent
    }
  }

  const handleFinalizeSummary = async (summaryId: string, memberId: string) => {
    if (!activeCycle) return

    try {
      const res = await fetch(`/api/hr/evaluations/summaries/${summaryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evalCycleId: activeCycle.evalCycleId, memberId })
      })

      if (!res.ok) throw new Error('Error al finalizar')

      fetchSummaries(activeCycle.evalCycleId)
    } catch {
      // silent
    }
  }

  const handleGenerateSummary = async () => {
    if (!activeCycle) return

    try {
      const res = await fetch(`/api/hr/evaluations/cycles/${activeCycle.evalCycleId}/generate-summaries`, {
        method: 'POST'
      })

      if (!res.ok) throw new Error('Error al generar resumen')

      fetchSummaries(activeCycle.evalCycleId)
    } catch {
      // silent
    }
  }

  const toggleCompetency = (id: string) => {
    setForm(prev => ({
      ...prev,
      competencyIds: prev.competencyIds?.includes(id)
        ? prev.competencyIds.filter(c => c !== id)
        : [...(prev.competencyIds ?? []), id]
    }))
  }

  // ── Filtered assignments ──

  const filteredAssignments = useMemo(() => {
    if (typeFilter === 'all') return assignments

    return assignments.filter(a => a.evalType === typeFilter)
  }, [assignments, typeFilter])

  // ── Render helpers ──

  const renderSkeleton = (rows: number) => (
    <Stack spacing={3}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant='rounded' height={72} />
      ))}
    </Stack>
  )

  const renderCyclesTab = () => {
    if (loading) return renderSkeleton(3)

    if (cycles.length === 0) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin ciclos creados.</Typography>
          </CardContent>
        </Card>
      )
    }

    return (
      <Stack spacing={4}>
        {cycles.map(cycle => {
          const nextPhase = getNextPhase(cycle.status)

          return (
            <Card
              key={cycle.evalCycleId}
              elevation={0}
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderLeft: '4px solid',
                borderLeftColor: cycle.status === 'closed' ? 'success.main' : cycle.status === 'draft' ? 'grey.300' : 'primary.main'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant='h6'>{cycle.cycleName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                      <CustomChip
                        round='true'
                        size='small'
                        label={CYCLE_TYPE_LABELS[cycle.cycleType]}
                        color='primary'
                        variant='tonal'
                      />
                      <CustomChip
                        round='true'
                        size='small'
                        label={CYCLE_STATUS_LABELS[cycle.status]}
                        color={CYCLE_STATUS_CHIP_COLOR[cycle.status]}
                      />
                    </Box>
                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                      <Typography variant='caption' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                        <i className='tabler-calendar' style={{ fontSize: '14px' }} />
                        {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                      </Typography>
                      {cycle.selfEvalDeadline && (
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          Autoevaluacion: {formatDate(cycle.selfEvalDeadline)}
                        </Typography>
                      )}
                      {cycle.peerEvalDeadline && (
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          Evaluacion de pares: {formatDate(cycle.peerEvalDeadline)}
                        </Typography>
                      )}
                      {cycle.managerDeadline && (
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          Revision gerencial: {formatDate(cycle.managerDeadline)}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  <CardActions sx={{ p: 0, flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                    {cycle.status === 'draft' && (
                      <Button
                        size='small'
                        variant='outlined'
                        color='info'
                        startIcon={<i className='tabler-users-plus' />}
                        onClick={() => handleGenerateAssignments(cycle.evalCycleId)}
                      >
                        Generar asignaciones
                      </Button>
                    )}
                    {nextPhase && (
                      <Button
                        size='small'
                        variant='contained'
                        color='primary'
                        startIcon={<i className='tabler-player-skip-forward' />}
                        onClick={() => handleAdvancePhase(cycle.evalCycleId, cycle.status)}
                      >
                        Avanzar fase
                      </Button>
                    )}
                  </CardActions>
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    )
  }

  const renderAssignmentsTab = () => {
    if (!activeCycle) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin asignaciones para este ciclo.</Typography>
          </CardContent>
        </Card>
      )
    }

    if (assignmentsLoading) return renderSkeleton(4)

    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Asignaciones'
          subheader={`Ciclo: ${activeCycle.cycleName}`}
          action={
            <CustomTextField
              select
              size='small'
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as EvalType | 'all')}
              sx={{ minWidth: 160 }}
              aria-label={TASK407_ARIA_FILTRAR_POR_TIPO}
            >
              <MenuItem value='all'>Todos los tipos</MenuItem>
              <MenuItem value='self'>Autoevaluacion</MenuItem>
              <MenuItem value='peer'>Par</MenuItem>
              <MenuItem value='manager'>Gerente</MenuItem>
              <MenuItem value='direct_report'>Reporte directo</MenuItem>
            </CustomTextField>
          }
        />
        <Divider />
        {filteredAssignments.length === 0 ? (
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin asignaciones para este ciclo.</Typography>
          </CardContent>
        ) : (
          <DataTableShell identifier='hr-evals-assignments' ariaLabel='Asignaciones de evaluacion'>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Evaluado</TableCell>
                  <TableCell>Evaluador</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Enviada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssignments.map(assignment => (
                  <TableRow key={assignment.assignmentId}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {assignment.evaluateeName ?? assignment.evaluateeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {assignment.evaluatorName ?? assignment.evaluatorId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CustomChip
                        round='true'
                        size='small'
                        label={EVAL_TYPE_LABELS[assignment.evalType]}
                        color={EVAL_TYPE_CHIP_COLOR[assignment.evalType]}
                        variant='tonal'
                      />
                    </TableCell>
                    <TableCell>
                      <CustomChip
                        round='true'
                        size='small'
                        label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        color={ASSIGNMENT_STATUS_CHIP_COLOR[assignment.status]}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {assignment.submittedAt ? formatDate(assignment.submittedAt) : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </Card>
    )
  }

  const renderResultsTab = () => {
    if (!activeCycle) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin resultados disponibles.</Typography>
          </CardContent>
        </Card>
      )
    }

    if (summariesLoading) return renderSkeleton(4)

    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Resultados'
          subheader={`Ciclo: ${activeCycle.cycleName}`}
          action={
            <Button
              size='small'
              variant='outlined'
              color='primary'
              startIcon={<i className='tabler-file-analytics' />}
              onClick={handleGenerateSummary}
            >
              Generar resumen
            </Button>
          }
        />
        <Divider />
        {summaries.length === 0 ? (
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin resultados disponibles.</Typography>
          </CardContent>
        ) : (
          <DataTableShell identifier='hr-evals-results' ariaLabel='Resultados de evaluacion'>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>General</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Auto</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Pares</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Gerente</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>ICO RPA</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>ICO OTD</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Objetivos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {summaries.map(summary => (
                  <TableRow key={summary.summaryId}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {summary.memberName ?? summary.memberId}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2' fontWeight={600} color={summary.overallRating != null && summary.overallRating >= 4 ? 'success.main' : 'text.primary'}>
                        {formatRating(summary.overallRating)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatRating(summary.selfRating)}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatRating(summary.peerRating)}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatRating(summary.managerRating)}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatRating(summary.icoRpaAvg)}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatPercent(summary.icoOtdPercent)}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant='body2'>{formatPercent(summary.goalCompletionPct)}</Typography>
                    </TableCell>
                    <TableCell>
                      {summary.finalizedAt ? (
                        <CustomChip round='true' size='small' label='Finalizado' color='success' />
                      ) : (
                        <CustomChip round='true' size='small' label='Pendiente' color='default' />
                      )}
                    </TableCell>
                    <TableCell>
                      {!summary.finalizedAt && (
                        <Button
                          size='small'
                          variant='outlined'
                          color='success'
                          onClick={() => handleFinalizeSummary(summary.summaryId, summary.memberId)}
                        >
                          Finalizar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </Card>
    )
  }

  // ── Main render ──

  return (
    <Grid container spacing={6}>
      {/* Page header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title='Evaluaciones'
            subheader='Ciclos de evaluacion de desempeno, asignaciones y resultados'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-chart-dots-3' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Button
                variant='contained'
                color='primary'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setDialogOpen(true)}
              >
                Nuevo ciclo
              </Button>
            }
          />
        </Card>
      </Grid>

      {/* Error alert */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>
        </Grid>
      )}

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <TabContext value={tab}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CustomTabList onChange={(_, v: string) => setTab(v)} aria-label={TASK407_ARIA_SECCIONES_DE_EVALUACIONES}>
              <Tab label='Ciclos' value='cycles' icon={<i className='tabler-refresh' />} iconPosition='start' />
              <Tab label='Asignaciones' value='assignments' icon={<i className='tabler-users' />} iconPosition='start' />
              <Tab label='Resultados' value='results' icon={<i className='tabler-chart-bar' />} iconPosition='start' />
            </CustomTabList>
          </Card>

          <TabPanel value='cycles' sx={{ px: 0 }}>
            {renderCyclesTab()}
          </TabPanel>

          <TabPanel value='assignments' sx={{ px: 0 }}>
            {renderAssignmentsTab()}
          </TabPanel>

          <TabPanel value='results' sx={{ px: 0 }}>
            {renderResultsTab()}
          </TabPanel>
        </TabContext>
      </Grid>

      {/* Create cycle dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        aria-labelledby='create-cycle-dialog-title'
      >
        <DialogTitle id='create-cycle-dialog-title'>Nuevo ciclo de evaluacion</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            <CustomTextField
              label='Nombre del ciclo'
              value={form.cycleName}
              onChange={e => setForm(prev => ({ ...prev, cycleName: e.target.value }))}
              fullWidth
              required
              aria-required='true'
            />
            <CustomTextField
              select
              label='Tipo de ciclo'
              value={form.cycleType}
              onChange={e => setForm(prev => ({ ...prev, cycleType: e.target.value as EvalCycleType }))}
              fullWidth
            >
              <MenuItem value='quarterly'>Trimestral</MenuItem>
              <MenuItem value='semester'>Semestral</MenuItem>
              <MenuItem value='annual'>Anual</MenuItem>
            </CustomTextField>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  label='Fecha inicio'
                  type='date'
                  value={form.startDate}
                  onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                  required
                  aria-required='true'
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  label='Fecha fin'
                  type='date'
                  value={form.endDate}
                  onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                  required
                  aria-required='true'
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Plazos por fase (opcional)</Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  label='Autoevaluacion'
                  type='date'
                  value={form.selfEvalDeadline ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, selfEvalDeadline: e.target.value || null }))}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  label='Pares'
                  type='date'
                  value={form.peerEvalDeadline ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, peerEvalDeadline: e.target.value || null }))}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  label='Gerente'
                  type='date'
                  value={form.managerDeadline ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, managerDeadline: e.target.value || null }))}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            {competencies.length > 0 && (
              <>
                <Divider />
                <Typography variant='subtitle2' color='text.secondary'>Competencias a evaluar</Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {competencies.map(comp => (
                    <FormControlLabel
                      key={comp.competencyId}
                      control={
                        <Checkbox
                          checked={form.competencyIds?.includes(comp.competencyId) ?? false}
                          onChange={() => toggleCompetency(comp.competencyId)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant='body2'>{comp.competencyName}</Typography>
                          {comp.description && (
                            <Typography variant='caption' color='text.secondary'>{comp.description}</Typography>
                          )}
                        </Box>
                      }
                      sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleCreateCycle}
            disabled={submitting || !form.cycleName || !form.startDate || !form.endDate}
          >
            {submitting ? 'Creando...' : 'Crear ciclo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default HrEvalsView
