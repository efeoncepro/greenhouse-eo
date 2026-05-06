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
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type {
  AssignmentStatus,
  EvalAssignmentWithResponses,
  EvalCompetency,
  EvalSummary,
  EvalType,
  MyEvalPendingResponse,
  Rating as RatingType,
  SubmitResponseInput
} from '@/types/hr-evals'

const GREENHOUSE_COPY = getMicrocopy()

// ── Constants ──

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

const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  submitted: 'Enviada',
  skipped: 'Omitida'
}

const ASSIGNMENT_STATUS_CHIP_COLOR: Record<AssignmentStatus, 'default' | 'info' | 'success' | 'warning'> = {
  pending: 'default',
  in_progress: 'info',
  submitted: 'success',
  skipped: 'warning'
}

// ── Helpers ──

const formatRating = (val: number | null): string => {
  if (val == null) return '-'

  return val.toFixed(1)
}

const formatPercent = (val: number | null): string => {
  if (val == null) return '-'

  return `${Math.round(val)}%`
}

// ── Response form state ──

interface ResponseFormEntry {
  competencyId: string
  rating: RatingType | 0
  comments: string
}

// ── Component ──

const MyEvalsView = () => {
  const [pending, setPending] = useState<EvalAssignmentWithResponses[]>([])
  const [completed, setCompleted] = useState<EvalAssignmentWithResponses[]>([])
  const [summaries, setSummaries] = useState<EvalSummary[]>([])
  const [competencies, setCompetencies] = useState<EvalCompetency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [evalAssignment, setEvalAssignment] = useState<EvalAssignmentWithResponses | null>(null)
  const [responseForm, setResponseForm] = useState<ResponseFormEntry[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [evalRes, compRes] = await Promise.all([
        fetch('/api/my/evaluations'),
        fetch('/api/hr/evaluations/competencies')
      ])

      if (!evalRes.ok) {
        const payload = await evalRes.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar tus evaluaciones.')
      }

      const evalData: MyEvalPendingResponse = await evalRes.json()

      setPending(evalData.pending ?? [])
      setCompleted(evalData.completed ?? [])
      setSummaries(evalData.summaries ?? [])

      if (compRes.ok) {
        const compData = await compRes.json()

        setCompetencies(compData.competencies ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Summary stats ──

  const stats = useMemo(() => {
    const totalPending = pending.length
    const totalCompleted = completed.length
    const latestSummary = summaries.length > 0 ? summaries[0] : null

    return { totalPending, totalCompleted, latestSummary }
  }, [pending, completed, summaries])

  // ── Eval dialog handlers ──

  const openEvalDialog = (assignment: EvalAssignmentWithResponses) => {
    setEvalAssignment(assignment)

    // Build form entries from competencies or existing responses
    const entries: ResponseFormEntry[] = competencies.map(comp => {
      const existing = assignment.responses?.find(r => r.competencyId === comp.competencyId)

      return {
        competencyId: comp.competencyId,
        rating: (existing?.rating ?? 0) as RatingType | 0,
        comments: existing?.comments ?? ''
      }
    })

    setResponseForm(entries.length > 0 ? entries : [])
  }

  const closeEvalDialog = () => {
    setEvalAssignment(null)
    setResponseForm([])
  }

  const updateResponseEntry = (competencyId: string, field: 'rating' | 'comments', value: number | string) => {
    setResponseForm(prev =>
      prev.map(entry =>
        entry.competencyId === competencyId ? { ...entry, [field]: value } : entry
      )
    )
  }

  const handleSubmitEval = async () => {
    if (!evalAssignment) return

    const validResponses = responseForm.filter(e => e.rating > 0)

    if (validResponses.length === 0) return

    setSubmitting(true)

    try {
      // Submit responses
      const payload: SubmitResponseInput = {
        assignmentId: evalAssignment.assignmentId,
        responses: validResponses.map(e => ({
          competencyId: e.competencyId,
          rating: e.rating as RatingType,
          comments: e.comments || null
        }))
      }

      const resResponses = await fetch('/api/hr/evaluations/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resResponses.ok) throw new Error('Error al guardar respuestas')

      // Mark assignment as submitted
      const resSubmit = await fetch(`/api/hr/evaluations/assignments/${evalAssignment.assignmentId}/submit`, {
        method: 'POST'
      })

      if (!resSubmit.ok) throw new Error('Error al enviar evaluacion')

      closeEvalDialog()
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar evaluacion.')
    } finally {
      setSubmitting(false)
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

  return (
    <Grid container spacing={6}>
      {/* Page header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mis evaluaciones'
            subheader='Evaluaciones pendientes y resultados de desempeno'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-chart-dots-3' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
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

      {/* Summary KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Pendientes'
          stats={String(stats.totalPending)}
          avatarIcon='tabler-clipboard-list'
          avatarColor='warning'
          subtitle='Evaluaciones por completar'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Completadas'
          stats={String(stats.totalCompleted)}
          avatarIcon='tabler-circle-check'
          avatarColor='success'
          subtitle='Evaluaciones enviadas'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Calificacion general'
          stats={stats.latestSummary ? formatRating(stats.latestSummary.overallRating) : '-'}
          avatarIcon='tabler-star'
          avatarColor='primary'
          subtitle='Ultima evaluacion'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Objetivos'
          stats={stats.latestSummary ? formatPercent(stats.latestSummary.goalCompletionPct) : '-'}
          avatarIcon='tabler-target'
          avatarColor='info'
          subtitle='Porcentaje de cumplimiento'
        />
      </Grid>

      {/* Pending evaluations */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title='Evaluaciones pendientes'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-clipboard-list' style={{ fontSize: 20, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {pending.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color='text.secondary'>Aun no tienes evaluaciones pendientes.</Typography>
              </Box>
            ) : (
              <Grid container spacing={4}>
                {pending.map(assignment => (
                  <Grid key={assignment.assignmentId} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      elevation={0}
                      sx={{
                        border: theme => `1px solid ${theme.palette.divider}`,
                        borderLeft: '4px solid',
                        borderLeftColor: 'warning.main',
                        '&:hover': { boxShadow: theme => theme.shadows[4] }
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant='subtitle1' fontWeight={600}>
                              {assignment.evalType === 'self'
                                ? 'Autoevaluacion'
                                : `Evaluar a ${assignment.evaluateeName ?? 'colaborador'}`}
                            </Typography>
                            <CustomChip
                              round='true'
                              size='small'
                              label={EVAL_TYPE_LABELS[assignment.evalType]}
                              color={EVAL_TYPE_CHIP_COLOR[assignment.evalType]}
                              variant='tonal'
                            />
                          </Box>
                          <CustomChip
                            round='true'
                            size='small'
                            label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                            color={ASSIGNMENT_STATUS_CHIP_COLOR[assignment.status]}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                          <Button
                            variant='contained'
                            color='primary'
                            size='small'
                            startIcon={<i className='tabler-pencil' />}
                            onClick={() => openEvalDialog(assignment)}
                            fullWidth
                          >
                            Evaluar
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* My results */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title='Mis resultados'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-chart-bar' style={{ fontSize: 20, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {summaries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color='text.secondary'>Aun no tienes resultados de evaluacion.</Typography>
              </Box>
            ) : (
              <Stack spacing={4}>
                {summaries.map(summary => (
                  <Card
                    key={summary.summaryId}
                    elevation={0}
                    sx={{
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderLeft: '4px solid',
                      borderLeftColor: summary.finalizedAt ? 'success.main' : 'info.main'
                    }}
                  >
                    <CardContent>
                      <Grid container spacing={4}>
                        {/* Rating breakdown */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>Calificaciones</Typography>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='body2'>General</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Rating value={summary.overallRating ?? 0} precision={0.5} readOnly size='small' />
                                <Typography variant='body2' fontWeight={600}>{formatRating(summary.overallRating)}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='body2'>Autoevaluacion</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Rating value={summary.selfRating ?? 0} precision={0.5} readOnly size='small' />
                                <Typography variant='body2'>{formatRating(summary.selfRating)}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='body2'>Pares</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Rating value={summary.peerRating ?? 0} precision={0.5} readOnly size='small' />
                                <Typography variant='body2'>{formatRating(summary.peerRating)}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant='body2'>Gerente</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Rating value={summary.managerRating ?? 0} precision={0.5} readOnly size='small' />
                                <Typography variant='body2'>{formatRating(summary.managerRating)}</Typography>
                              </Box>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* ICO & Goals */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>Metricas operativas</Typography>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='body2'>ICO RPA</Typography>
                              <Typography variant='body2' fontWeight={600}>{formatRating(summary.icoRpaAvg)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='body2'>ICO OTD</Typography>
                              <Typography variant='body2' fontWeight={600}>{formatPercent(summary.icoOtdPercent)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='body2'>Cumplimiento de objetivos</Typography>
                              <Typography variant='body2' fontWeight={600}>{formatPercent(summary.goalCompletionPct)}</Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Strengths & Development areas */}
                        {(summary.strengths || summary.developmentAreas) && (
                          <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                            <Grid container spacing={4}>
                              {summary.strengths && (
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='subtitle2' color='success.main' sx={{ mb: 1 }}>
                                    <i className='tabler-thumb-up' style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                                    Fortalezas
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary'>{summary.strengths}</Typography>
                                </Grid>
                              )}
                              {summary.developmentAreas && (
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='subtitle2' color='warning.main' sx={{ mb: 1 }}>
                                    <i className='tabler-trending-up' style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                                    Areas de desarrollo
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary'>{summary.developmentAreas}</Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Evaluation form dialog */}
      <Dialog
        open={evalAssignment !== null}
        onClose={closeEvalDialog}
        maxWidth='sm'
        fullWidth
        aria-labelledby='eval-dialog-title'
      >
        <DialogTitle id='eval-dialog-title'>
          {evalAssignment?.evalType === 'self'
            ? 'Autoevaluacion'
            : `Evaluar a ${evalAssignment?.evaluateeName ?? 'colaborador'}`}
        </DialogTitle>
        <DialogContent>
          {responseForm.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color='text.secondary'>No hay competencias configuradas para este ciclo.</Typography>
            </Box>
          ) : (
            <Stack spacing={4} sx={{ mt: 1 }}>
              {responseForm.map(entry => {
                const comp = competencies.find(c => c.competencyId === entry.competencyId)

                return (
                  <Card
                    key={entry.competencyId}
                    elevation={0}
                    sx={{ border: theme => `1px solid ${theme.palette.divider}`, p: 2 }}
                  >
                    <Typography variant='subtitle2' fontWeight={600}>
                      {comp?.competencyName ?? 'Competencia'}
                    </Typography>
                    {comp?.description && (
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
                        {comp.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant='body2' color='text.secondary'>Calificacion:</Typography>
                      <Rating
                        value={entry.rating}
                        onChange={(_, newValue) => updateResponseEntry(entry.competencyId, 'rating', newValue ?? 0)}
                        max={5}
                        aria-label={`Calificacion para ${comp?.competencyName ?? 'competencia'}`}
                      />
                      {entry.rating > 0 && (
                        <Typography variant='body2' fontWeight={600}>{entry.rating}/5</Typography>
                      )}
                    </Box>
                    <CustomTextField
                      label='Comentarios'
                      value={entry.comments}
                      onChange={e => updateResponseEntry(entry.competencyId, 'comments', e.target.value)}
                      multiline
                      rows={2}
                      fullWidth
                    />
                  </Card>
                )
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEvalDialog} color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleSubmitEval}
            disabled={submitting || responseForm.every(e => e.rating === 0)}
            startIcon={submitting ? <CircularProgress size={16} /> : <i className='tabler-send' />}
          >
            {submitting ? 'Enviando...' : 'Enviar evaluacion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default MyEvalsView
