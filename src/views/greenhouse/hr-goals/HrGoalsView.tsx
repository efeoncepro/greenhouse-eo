'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import type {
  CycleStatus,
  CycleType,
  Goal,
  GoalCycle,
  GoalCyclesResponse,
  GoalStatus,
  GoalsResponse,
  CreateGoalCycleInput
} from '@/types/hr-goals'

// ── Constants ──

const CYCLE_TYPE_LABELS: Record<CycleType, string> = {
  quarterly: 'Trimestral',
  semester: 'Semestral',
  annual: 'Anual'
}

const STATUS_CHIP_COLOR: Record<CycleStatus, 'default' | 'success' | 'warning' | 'info'> = {
  draft: 'default',
  active: 'success',
  review: 'warning',
  closed: 'info'
}

const STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  review: 'En revision',
  closed: 'Cerrado'
}

const GOAL_STATUS_CHIP_COLOR: Record<GoalStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  on_track: 'success',
  at_risk: 'warning',
  behind: 'error',
  completed: 'info',
  cancelled: 'default'
}

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  on_track: 'En curso',
  at_risk: 'En riesgo',
  behind: 'Atrasado',
  completed: 'Completado',
  cancelled: 'Cancelado'
}

const INITIAL_FORM: CreateGoalCycleInput = {
  cycleName: '',
  cycleType: 'quarterly',
  startDate: '',
  endDate: ''
}

// ── Helpers ──

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const getProgressColor = (percent: number): 'success' | 'warning' | 'error' => {
  if (percent >= 80) return 'success'
  if (percent >= 50) return 'warning'

  return 'error'
}

const getProgressBg = (percent: number): string => {
  if (percent >= 80) return 'rgba(110, 194, 7, 0.08)'
  if (percent >= 50) return 'rgba(255, 101, 0, 0.08)'

  return 'rgba(187, 25, 84, 0.08)'
}

// ── Component ──

const HrGoalsView = () => {
  const [tab, setTab] = useState('cycles')
  const [cycles, setCycles] = useState<GoalCycle[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [companyGoals, setCompanyGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateGoalCycleInput>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)

  const activeCycle = useMemo(() => cycles.find(c => c.status === 'active') ?? null, [cycles])

  // ── Fetchers ──

  const fetchCycles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/goals/cycles')

      if (!res.ok) throw new Error('Error al cargar ciclos')

      const data: GoalCyclesResponse = await res.json()

      setCycles(data.cycles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGoals = useCallback(async (cycleId: string) => {
    setGoalsLoading(true)

    try {
      const res = await fetch(`/api/hr/goals?cycleId=${cycleId}`)

      if (!res.ok) throw new Error('Error al cargar objetivos')

      const data: GoalsResponse = await res.json()

      setGoals(data.goals)
    } catch {
      setGoals([])
    } finally {
      setGoalsLoading(false)
    }
  }, [])

  const fetchCompanyGoals = useCallback(async () => {
    setCompanyLoading(true)

    try {
      const res = await fetch('/api/hr/goals/company')

      if (!res.ok) throw new Error('Error al cargar objetivos empresa')

      const data: GoalsResponse = await res.json()

      setCompanyGoals(data.goals)
    } catch {
      setCompanyGoals([])
    } finally {
      setCompanyLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  useEffect(() => {
    if (tab === 'tracking' && activeCycle) {
      fetchGoals(activeCycle.cycleId)
    }

    if (tab === 'company') {
      fetchCompanyGoals()
    }
  }, [tab, activeCycle, fetchGoals, fetchCompanyGoals])

  // ── Handlers ──

  const handleCreateCycle = async () => {
    setSubmitting(true)

    try {
      const res = await fetch('/api/hr/goals/cycles', {
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

  const handleCycleAction = async (cycleId: string, action: 'activate' | 'close') => {
    try {
      const res = await fetch(`/api/hr/goals/cycles/${cycleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'activate' ? 'active' : 'closed' })
      })

      if (!res.ok) throw new Error('Error al actualizar ciclo')

      fetchCycles()
    } catch {
      // silent
    }
  }

  // ── Derived data for Empresa tab ──

  const companyTree = useMemo(() => {
    const top = companyGoals.filter(g => g.ownerType === 'company')
    const deptGoals = companyGoals.filter(g => g.ownerType === 'department')
    const individualGoals = companyGoals.filter(g => g.ownerType === 'individual')

    return top.map(cg => ({
      ...cg,
      children: deptGoals
        .filter(dg => dg.parentGoalId === cg.goalId)
        .map(dg => ({
          ...dg,
          children: individualGoals.filter(ig => ig.parentGoalId === dg.goalId)
        }))
    }))
  }, [companyGoals])

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
            <Typography color='text.secondary'>Sin ciclos creados. Crea uno para comenzar.</Typography>
          </CardContent>
        </Card>
      )
    }

    return (
      <Stack spacing={4}>
        {cycles.map(cycle => (
          <Card
            key={cycle.cycleId}
            elevation={0}
            sx={{
              border: theme => `1px solid ${theme.palette.divider}`,
              borderLeft: '4px solid',
              borderLeftColor: cycle.status === 'active' ? 'success.main' : 'grey.300'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant='h6'>{cycle.cycleName}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
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
                      label={STATUS_LABELS[cycle.status]}
                      color={STATUS_CHIP_COLOR[cycle.status]}
                    />
                  </Box>
                  <Typography variant='caption' sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: 'text.secondary' }}>
                    <i className='tabler-calendar' style={{ fontSize: '14px' }} />
                    {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                  </Typography>
                </Box>
                <Box>
                  <CardActions sx={{ p: 0 }}>
                    {cycle.status === 'draft' && (
                      <Button size='small' variant='contained' color='success' onClick={() => handleCycleAction(cycle.cycleId, 'activate')}>
                        Activar
                      </Button>
                    )}
                    {cycle.status === 'active' && (
                      <Button size='small' variant='outlined' color='warning' onClick={() => handleCycleAction(cycle.cycleId, 'close')}>
                        Cerrar ciclo
                      </Button>
                    )}
                  </CardActions>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    )
  }

  const renderTrackingTab = () => {
    if (!activeCycle) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>No hay un ciclo activo. Activa un ciclo desde la pestana Ciclos.</Typography>
          </CardContent>
        </Card>
      )
    }

    if (goalsLoading) return renderSkeleton(4)

    if (goals.length === 0) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin objetivos en este ciclo.</Typography>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Objetivo</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Progreso</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map(goal => (
                <TableRow key={goal.goalId} sx={{ backgroundColor: getProgressBg(goal.progressPercent) }}>
                  <TableCell>
                    <Typography variant='body2'>
                      {goal.ownerMemberId ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' fontWeight={500}>{goal.title}</Typography>
                    {goal.description && (
                      <Typography variant='caption' color='text.secondary'>{goal.description}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant='determinate'
                        value={goal.progressPercent}
                        color={getProgressColor(goal.progressPercent)}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant='caption' fontWeight={600} sx={{ minWidth: 36, textAlign: 'right' }}>
                        {goal.progressPercent}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <CustomChip
                      round='true'
                      size='small'
                      label={GOAL_STATUS_LABELS[goal.status]}
                      color={GOAL_STATUS_CHIP_COLOR[goal.status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    )
  }

  const renderGoalCard = (goal: Goal, depth: number) => (
    <Card
      key={goal.goalId}
      elevation={0}
      sx={{
        ml: depth * 4,
        mb: 2,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderLeft: '3px solid',
        borderLeftColor:
          goal.ownerType === 'company' ? 'primary.main' :
          goal.ownerType === 'department' ? 'info.main' :
          'success.main'
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant='subtitle2' fontWeight={600} noWrap>{goal.title}</Typography>
            {goal.description && (
              <Typography variant='caption' color='text.secondary'>{goal.description}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
              <LinearProgress
                variant='determinate'
                value={goal.progressPercent}
                color={getProgressColor(goal.progressPercent)}
                sx={{ flex: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant='caption' fontWeight={600} sx={{ minWidth: 36, textAlign: 'right' }}>
                {goal.progressPercent}%
              </Typography>
            </Box>
            <CustomChip
              round='true'
              size='small'
              label={GOAL_STATUS_LABELS[goal.status]}
              color={GOAL_STATUS_CHIP_COLOR[goal.status]}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  const renderCompanyTab = () => {
    if (companyLoading) return renderSkeleton(3)

    if (companyTree.length === 0) {
      return (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography color='text.secondary'>Sin objetivos de empresa definidos.</Typography>
          </CardContent>
        </Card>
      )
    }

    return (
      <Stack spacing={4}>
        {companyTree.map(companyGoal => (
          <Box key={companyGoal.goalId}>
            {renderGoalCard(companyGoal, 0)}
            {companyGoal.children.map(deptGoal => (
              <Box key={deptGoal.goalId}>
                {renderGoalCard(deptGoal, 1)}
                {deptGoal.children.map(indGoal => renderGoalCard(indGoal, 2))}
              </Box>
            ))}
          </Box>
        ))}
      </Stack>
    )
  }

  // ── Main render ──

  const isFormValid = form.cycleName.trim() !== '' && form.startDate !== '' && form.endDate !== ''

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant='h4'>Objetivos</Typography>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setDialogOpen(true)}>
            Nuevo ciclo
          </Button>
        </Box>
      </Grid>

      {/* Error alert */}
      {error && (
        <Grid size={12}>
          <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>
        </Grid>
      )}

      {/* Tabs */}
      <Grid size={12}>
        <TabContext value={tab}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CustomTabList onChange={(_, v: string) => setTab(v)}>
              <Tab label='Ciclos' value='cycles' icon={<i className='tabler-refresh' />} iconPosition='start' />
              <Tab label='Seguimiento' value='tracking' icon={<i className='tabler-chart-bar' />} iconPosition='start' />
              <Tab label='Empresa' value='company' icon={<i className='tabler-building' />} iconPosition='start' />
            </CustomTabList>
          </Card>

          <TabPanel value='cycles' sx={{ px: 0 }}>
            {renderCyclesTab()}
          </TabPanel>

          <TabPanel value='tracking' sx={{ px: 0 }}>
            {renderTrackingTab()}
          </TabPanel>

          <TabPanel value='company' sx={{ px: 0 }}>
            {renderCompanyTab()}
          </TabPanel>
        </TabContext>
      </Grid>

      {/* Create Cycle Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Crear ciclo</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            <CustomTextField
              label='Nombre del ciclo'
              fullWidth
              value={form.cycleName}
              onChange={e => setForm(prev => ({ ...prev, cycleName: e.target.value }))}
            />
            <CustomTextField
              label='Tipo'
              select
              fullWidth
              value={form.cycleType}
              onChange={e => setForm(prev => ({ ...prev, cycleType: e.target.value as CycleType }))}
            >
              <MenuItem value='quarterly'>Trimestral</MenuItem>
              <MenuItem value='semester'>Semestral</MenuItem>
              <MenuItem value='annual'>Anual</MenuItem>
            </CustomTextField>
            <CustomTextField
              label='Fecha inicio'
              type='date'
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.startDate}
              onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <CustomTextField
              label='Fecha fin'
              type='date'
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.endDate}
              onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color='secondary'>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateCycle}
            disabled={!isFormValid || submitting}
          >
            Crear ciclo
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default HrGoalsView
