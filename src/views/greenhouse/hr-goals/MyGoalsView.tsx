'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
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
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { GoalCycle, GoalKeyResult, GoalStatus, GoalWithDetails } from '@/types/hr-goals'

const TASK407_ARIA_SELECCIONAR_CICLO = "Seleccionar ciclo"


const GREENHOUSE_COPY = getMicrocopy()
// ── Status display config ──

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: string }> = {
  on_track: { label: GREENHOUSE_COPY.states.inProgress, color: 'success', icon: 'tabler-circle-check' },
  at_risk: { label: 'En riesgo', color: 'warning', icon: 'tabler-alert-triangle' },
  behind: { label: GREENHOUSE_COPY.states.overdue, color: 'error', icon: 'tabler-alert-circle' },
  completed: { label: GREENHOUSE_COPY.states.completed, color: 'info', icon: 'tabler-trophy' },
  cancelled: { label: GREENHOUSE_COPY.states.cancelled, color: 'default', icon: 'tabler-circle-x' }
}

const pct = (v: number) => `${Math.round(v)}%`

const progressColor = (percent: number): 'success' | 'warning' | 'error' | 'info' => {
  if (percent >= 75) return 'success'
  if (percent >= 50) return 'info'
  if (percent >= 25) return 'warning'

  return 'error'
}

const formatKrValue = (kr: GoalKeyResult): string => {
  const current = kr.currentValue ?? 0
  const target = kr.targetValue

  if (target == null) return String(current)

  switch (kr.unit) {
    case 'percent':
      return `${current}% / ${target}%`
    case 'currency':
      return `$${current.toLocaleString('es-CL')} / $${target.toLocaleString('es-CL')}`
    default:
      return `${current} / ${target}`
  }
}

const krProgress = (kr: GoalKeyResult): number => {
  if (!kr.targetValue || kr.targetValue === 0) return 0

  return Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
}

// ── Main component ──

const MyGoalsView = () => {
  const [goals, setGoals] = useState<GoalWithDetails[]>([])
  const [cycles, setCycles] = useState<GoalCycle[]>([])
  const [companyGoals, setCompanyGoals] = useState<GoalWithDetails[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Progress dialog state
  const [progressGoal, setProgressGoal] = useState<GoalWithDetails | null>(null)
  const [progressPercent, setProgressPercent] = useState('')
  const [progressNotes, setProgressNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (cycleId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const cycleParam = cycleId ? `?cycleId=${cycleId}` : ''

      const [myRes, cyclesRes, companyRes] = await Promise.all([
        fetch(`/api/hr/goals/my${cycleParam}`),
        fetch('/api/hr/goals/cycles'),
        fetch(`/api/hr/goals/company${cycleParam}`)
      ])

      if (!myRes.ok) {
        const payload = await myRes.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar tus objetivos.')
      }

      const myData = await myRes.json()
      const cyclesData = cyclesRes.ok ? await cyclesRes.json() : { cycles: [] }
      const companyData = companyRes.ok ? await companyRes.json() : { goals: [] }

      setGoals(myData.goals ?? [])
      setCycles(cyclesData.cycles ?? [])
      setCompanyGoals(companyData.goals ?? [])

      // Auto-select active cycle if none selected
      if (!cycleId && cyclesData.cycles?.length) {
        const active = cyclesData.cycles.find((c: GoalCycle) => c.status === 'active')

        if (active) setSelectedCycleId(active.cycleId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId)
    void load(cycleId)
  }

  // ── Summary stats ──

  const summary = useMemo(() => {
    const total = goals.length
    const avgProgress = total > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progressPercent, 0) / total) : 0
    const onTrack = goals.filter(g => g.status === 'on_track').length
    const completed = goals.filter(g => g.status === 'completed').length

    return { total, avgProgress, onTrack, completed }
  }, [goals])

  // ── Progress dialog handlers ──

  const openProgressDialog = (goal: GoalWithDetails) => {
    setProgressGoal(goal)
    setProgressPercent(String(goal.progressPercent))
    setProgressNotes('')
  }

  const closeProgressDialog = () => {
    setProgressGoal(null)
    setProgressPercent('')
    setProgressNotes('')
  }

  const handleSaveProgress = async () => {
    if (!progressGoal) return

    const percent = Number(progressPercent)

    if (Number.isNaN(percent) || percent < 0 || percent > 100) return

    setSaving(true)

    try {
      const res = await fetch(`/api/hr/goals/${progressGoal.goalId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercent: percent, notes: progressNotes || null })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'Error al registrar avance.')
      }

      closeProgressDialog()
      void load(selectedCycleId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar avance.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ──

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  // ── Cycle selector options ──

  const visibleCycles = cycles.filter(c => c.status === 'active' || c.status === 'review' || c.status === 'closed')

  return (
    <Grid container spacing={6}>
      {/* ── Page header ── */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mis objetivos'
            subheader='Objetivos personales y key results del ciclo'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-target' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              visibleCycles.length > 1 ? (
                <CustomTextField
                  select
                  size='small'
                  value={selectedCycleId}
                  onChange={e => handleCycleChange(e.target.value)}
                  sx={{ minWidth: 180 }}
                  aria-label={TASK407_ARIA_SELECCIONAR_CICLO}
                >
                  {visibleCycles.map(c => (
                    <MenuItem key={c.cycleId} value={c.cycleId}>
                      {c.cycleName}
                    </MenuItem>
                  ))}
                </CustomTextField>
              ) : null
            }
          />
        </Card>
      </Grid>

      {/* ── Error alert ── */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>
        </Grid>
      )}

      {/* ── Summary KPIs ── */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Total objetivos'
          stats={String(summary.total)}
          avatarIcon='tabler-target'
          avatarColor='primary'
          subtitle='En este ciclo'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Progreso promedio'
          stats={pct(summary.avgProgress)}
          avatarIcon='tabler-trending-up'
          avatarColor={summary.avgProgress >= 50 ? 'success' : 'warning'}
          subtitle='Avance general'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='En curso'
          stats={String(summary.onTrack)}
          avatarIcon='tabler-circle-check'
          avatarColor='success'
          subtitle='Objetivos al dia'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Completados'
          stats={String(summary.completed)}
          avatarIcon='tabler-trophy'
          avatarColor='info'
          subtitle='Objetivos cerrados'
        />
      </Grid>

      {/* ── Goal cards ── */}
      {goals.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <i className='tabler-target-off' style={{ fontSize: 48, opacity: 0.3 }} aria-hidden='true' />
                <Typography variant='h6' sx={{ mt: 2, color: 'text.secondary' }}>
                  No tienes objetivos asignados en este ciclo.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        goals.map(goal => {
          const cfg = STATUS_CONFIG[goal.status]

          return (
            <Grid key={goal.goalId} size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  border: t => `1px solid ${t.palette.divider}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <CardHeader
                  title={
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      {goal.title}
                    </Typography>
                  }
                  action={
                    <CustomChip
                      round='true'
                      variant='tonal'
                      color={cfg.color}
                      label={cfg.label}
                      size='small'
                      icon={<i className={cfg.icon} style={{ fontSize: 14 }} />}
                    />
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {goal.description && (
                    <Typography variant='body2' color='text.secondary'>
                      {goal.description}
                    </Typography>
                  )}

                  {/* Overall progress */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant='caption' color='text.secondary'>Progreso</Typography>
                      <Typography variant='caption' fontWeight={600}>{pct(goal.progressPercent)}</Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={goal.progressPercent}
                      color={progressColor(goal.progressPercent)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {/* Key results */}
                  {goal.keyResults.length > 0 && (
                    <Box>
                      <Typography variant='caption' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 1, display: 'block' }}>
                        Key results
                      </Typography>
                      <Stack spacing={1.5}>
                        {goal.keyResults.map(kr => (
                          <Box key={kr.krId}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                              <Typography variant='body2' noWrap sx={{ maxWidth: '65%' }}>
                                {kr.title}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {formatKrValue(kr)}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant='determinate'
                              value={krProgress(kr)}
                              color={progressColor(krProgress(kr))}
                              sx={{ height: 5, borderRadius: 2 }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Action */}
                  <Box sx={{ mt: 'auto', pt: 1 }}>
                    <Button
                      size='small'
                      variant='tonal'
                      startIcon={<i className='tabler-pencil-plus' style={{ fontSize: 16 }} />}
                      onClick={() => openProgressDialog(goal)}
                      disabled={goal.status === 'completed' || goal.status === 'cancelled'}
                    >
                      Registrar avance
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })
      )}

      {/* ── Company goals (context, read-only) ── */}
      {companyGoals.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Objetivos de la empresa'
              subheader='Contexto organizacional del ciclo'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-building' style={{ fontSize: 20, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {companyGoals.map(g => {
                  const cfg = STATUS_CONFIG[g.status]

                  return (
                    <Box
                      key={g.goalId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover'
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' fontWeight={500} noWrap>
                          {g.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress
                            variant='determinate'
                            value={g.progressPercent}
                            color={progressColor(g.progressPercent)}
                            sx={{ height: 5, borderRadius: 2, flex: 1, maxWidth: 120 }}
                          />
                          <Typography variant='caption' color='text.secondary'>
                            {pct(g.progressPercent)}
                          </Typography>
                        </Box>
                      </Box>
                      <CustomChip round='true' variant='tonal' color={cfg.color} label={cfg.label} size='small' />
                    </Box>
                  )
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ── Progress dialog ── */}
      <Dialog
        open={progressGoal !== null}
        onClose={closeProgressDialog}
        maxWidth='xs'
        fullWidth
        aria-labelledby='progress-dialog-title'
      >
        <DialogTitle id='progress-dialog-title'>
          Registrar avance
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {progressGoal && (
              <Typography variant='body2' color='text.secondary'>
                {progressGoal.title}
              </Typography>
            )}
            <CustomTextField
              label='Progreso (%)'
              type='number'
              value={progressPercent}
              onChange={e => setProgressPercent(e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
              fullWidth
              required
              aria-required='true'
            />
            <CustomTextField
              label='Notas (opcional)'
              value={progressNotes}
              onChange={e => setProgressNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProgressDialog} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleSaveProgress}
            disabled={saving || !progressPercent}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default MyGoalsView
