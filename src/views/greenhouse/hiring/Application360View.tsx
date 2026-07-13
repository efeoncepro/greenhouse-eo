'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import {
  GreenhouseButton,
  GreenhouseChip,
  isCardDensityAtLeast,
  useContainerDensity,
} from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import { formatDate, formatDateTime } from '@/lib/format'
import type {
  DecideHiringApplicationResult,
  HiringDecision,
  HiringDecisionHistoryEntry,
  HiringDeskApplicationSummary,
  HiringFulfillmentMode,
} from '@/types/hiring'
import type { HiringHandoff } from '@/lib/hiring/handoff/types'
import type { Assessment, AssessmentResponse, AssessmentTemplate, Competency } from '@/types/hiring-assessment'
import type { AiProposal } from '@/types/hiring-assessment-ai'

import HiringDeskFrame from './HiringDeskFrame'
import { hiringRequest } from './hiring-client'

type TabKey = 'overview' | 'assessment' | 'documents' | 'decision' | 'activity'

const TAB_ICONS: Record<TabKey, string> = {
  overview: 'tabler-layout-dashboard',
  assessment: 'tabler-checkup-list',
  documents: 'tabler-files',
  decision: 'tabler-gavel',
  activity: 'tabler-activity-heartbeat',
}

const DECISION_OPTIONS: Array<{ value: HiringDecision; label: string }> = [
  { value: 'selected', label: 'Seleccionar' },
  { value: 'backup_selected', label: 'Seleccionar como backup' },
  { value: 'rejected', label: 'Descartar' },
  { value: 'withdrawn', label: 'Registrar retiro' },
  { value: 'on_hold', label: 'Dejar en espera' },
]

const DESTINATIONS: Array<{ value: HiringFulfillmentMode; label: string }> = [
  { value: 'internal_hire', label: 'Contratación interna' },
  { value: 'internal_reassignment', label: 'Reasignación interna' },
  { value: 'staff_augmentation', label: 'Staff augmentation' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'partner', label: 'Partner' },
]

const historyFrom = (explainability: Record<string, unknown>) => {
  const value = explainability.decisionHistory

  return Array.isArray(value) ? value as HiringDecisionHistoryEntry[] : []
}

interface AssessmentReview {
  responses: AssessmentResponse[]
  competencies: Competency[]
  proposals: AiProposal[]
}

const proposedScoreFrom = (proposal: AiProposal | undefined) => {
  const score = proposal?.proposed.score

  return typeof score === 'number' ? score : null
}

const responseAnswerText = (answer: Record<string, unknown>) => {
  for (const key of ['text', 'value', 'answer', 'selected']) {
    const value = answer[key]

    if (typeof value === 'string' && value.trim()) return value
    if (Array.isArray(value)) return value.join(', ')
  }

  return Object.keys(answer).length > 0 ? JSON.stringify(answer) : '—'
}

interface CandidateContextCardProps {
  item: HiringDeskApplicationSummary
  copy: HiringDeskCopy
}

const CandidateContextCard = ({ item, copy }: CandidateContextCardProps) => {
  const { ref, density, containerType } = useContainerDensity('auto')
  const condensed = isCardDensityAtLeast(density, 'condensed')

  return (
    <Paper
      ref={ref}
      variant='outlined'
      sx={(theme) => ({
        containerType,
        p: condensed ? 3 : 4,
        minWidth: 0,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        transition: theme.transitions.create('padding', { duration: theme.transitions.duration.shorter }),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      })}
    >
      <Stack spacing={condensed ? 2 : 2.75}>
        <Typography variant='h6'>Perfil del candidato</Typography>
        {[
          [copy.application.opening, item.openingTitle],
          [copy.application.source, item.application.source === 'public_careers' ? 'Careers público' : item.application.source.replaceAll('_', ' ')],
          ['Postulación', formatDate(item.application.createdAt, { dateStyle: 'medium' }, 'es-CL')],
          ['Email', item.maskedEmail ?? 'c•••••@•••••.com'],
        ].map(([label, value], index) => (
          <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={3} sx={{ py: 2.75, borderBlockEnd: index < 3 ? 1 : 0, borderColor: 'divider' }}>
            <Typography variant='body2' color='text.secondary'>{label}</Typography>
            <Typography variant='body2' color={label === 'Email' ? 'text.disabled' : 'text.primary'} fontWeight={650} textAlign='right'>{value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

interface Application360ViewProps {
  copy: HiringDeskCopy
  initialItem: HiringDeskApplicationSummary
  initialAssessments: Assessment[]
  templates: AssessmentTemplate[]
  initialHandoff: HiringHandoff | null
  canApproveHandoff: boolean
}

const handoffTone = (handoff: HiringHandoff | null) => {
  if (!handoff) return 'info' as const
  if (handoff.state === 'blocked' || handoff.state === 'cancelled') return 'warning' as const
  if (handoff.state === 'approved' || handoff.state === 'in_setup' || handoff.state === 'completed') return 'success' as const

  return 'info' as const
}

const HandoffBridgeCard = ({
  copy,
  handoff,
  activationHref,
  canApproveHandoff,
  approving,
  onApprove,
}: {
  copy: HiringDeskCopy
  handoff: HiringHandoff | null
  activationHref: string
  canApproveHandoff: boolean
  approving: boolean
  onApprove: () => void
}) => {
  const ready = handoff ? ['approved', 'in_setup', 'completed'].includes(handoff.state) : false
  const blocked = handoff ? ['blocked', 'cancelled'].includes(handoff.state) : false
  const pending = handoff?.state === 'pending'

  const title = !handoff
    ? copy.application.handoffMaterializingTitle
    : blocked
      ? copy.application.handoffBlockedTitle
      : ready
        ? copy.application.handoffReadyTitle
        : copy.application.handoffPendingTitle

  const body = !handoff
    ? copy.application.handoffMaterializingBody
    : blocked
      ? copy.application.handoffBlockedBody
      : ready
        ? copy.application.handoffReadyBody
        : copy.application.handoffPendingBody

  return (
    <Alert
      severity={handoffTone(handoff)}
      icon={<i className={ready ? 'tabler-route-square-2' : blocked ? 'tabler-alert-triangle' : 'tabler-git-branch'} />}
      data-capture='hiring-application-handoff-bridge'
      sx={(theme) => ({
        border: `1px solid ${theme.palette[handoffTone(handoff)].lightOpacity}`,
        color: 'text.primary',
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        '& .MuiAlert-message': { inlineSize: '100%' },
      })}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography variant='body2' color='text.secondary'>{body}</Typography>
        </Box>
        <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
          <GreenhouseChip
            size='small'
            kind='status'
            variant='label'
            tone={blocked ? 'warning' : ready ? 'success' : 'info'}
            label={handoff?.state ?? 'materializing'}
          />
          <GreenhouseChip size='small' kind='attribute' label='N9 → N10 → N11' />
          {handoff?.blockedReason ? <GreenhouseChip size='small' kind='status' tone='warning' label={handoff.blockedReason} /> : null}
        </Stack>
        {pending && !canApproveHandoff ? (
          <Typography variant='body2' color='text.secondary'>{copy.application.handoffNoCapability}</Typography>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {pending && canApproveHandoff ? (
            <GreenhouseButton
              kind='primaryAction'
              leadingIcon={approving ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
              leadingIconClassName={approving ? undefined : 'tabler-check'}
              disabled={approving}
              onClick={onApprove}
            >
              {approving ? copy.common.loading : copy.application.approveHandoff}
            </GreenhouseButton>
          ) : null}
          <Button
            component={NextLink}
            href={activationHref}
            variant={ready ? 'contained' : 'tonal'}
            color={ready ? 'success' : 'info'}
            startIcon={<i className='tabler-users-plus' />}
          >
            {copy.application.openActivationLane}
          </Button>
        </Stack>
      </Stack>
    </Alert>
  )
}

const Application360View = ({ copy, initialItem, initialAssessments, templates, initialHandoff, canApproveHandoff }: Application360ViewProps) => {
  const [item, setItem] = useState(initialItem)
  const [handoff, setHandoff] = useState(initialHandoff)
  const [tab, setTab] = useState<TabKey>('overview')
  const [assessments, setAssessments] = useState(initialAssessments)
  const [assignOpen, setAssignOpen] = useState(false)
  const [templateId, setTemplateId] = useState(templates[0]?.templateId ?? '')
  const [timeLimit, setTimeLimit] = useState('45')
  const [assigning, setAssigning] = useState(false)
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null)
  const [assessmentReviews, setAssessmentReviews] = useState<Record<string, AssessmentReview>>({})
  const [reviewingAssessmentId, setReviewingAssessmentId] = useState<string | null>(null)
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null)
  const [finalizingAssessmentId, setFinalizingAssessmentId] = useState<string | null>(null)
  const [decision, setDecision] = useState<HiringDecision>(item.application.decision ?? 'selected')
  const [destination, setDestination] = useState<HiringFulfillmentMode | ''>(item.application.selectedDestination ?? '')
  const [startDate, setStartDate] = useState(item.application.tentativeStartDate ?? '')
  const [legalEntity, setLegalEntity] = useState(item.application.expectedLegalEntity ?? '')
  const [context, setContext] = useState(item.application.expectedContext ?? '')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [overrideAdvisory, setOverrideAdvisory] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [approvingHandoff, setApprovingHandoff] = useState(false)
  const [showDecisionForm, setShowDecisionForm] = useState(!item.application.decision)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [revealField, setRevealField] = useState<'cv' | 'identity' | null>(null)
  const [revealReason, setRevealReason] = useState('')
  const [revealedDocs, setRevealedDocs] = useState<Record<string, boolean>>({})
  const idempotencyKeyRef = useRef<string | null>(null)

  useEffect(() => {
    document.getElementById('hiring-application-title')?.focus()
  }, [])

  const confirmReveal = () => {
    if (!revealField || !revealReason.trim()) return
    setRevealedDocs((current) => ({ ...current, [revealField]: true }))
    setRevealField(null)
    setRevealReason('')
    setToast('Dato sensible revelado y registrado en auditoría de sesión.')
  }

  const decisionHistory = useMemo(() => historyFrom(item.application.explainability), [item.application.explainability])
  const isInternalHireDecision = item.application.decision === 'selected' && item.application.selectedDestination === 'internal_hire'

  const activationHref = handoff
    ? `/hr/onboarding?lane=hiring-activation&applicationId=${encodeURIComponent(item.application.applicationId)}&handoffId=${encodeURIComponent(handoff.handoffId)}`
    : `/hr/onboarding?lane=hiring-activation&applicationId=${encodeURIComponent(item.application.applicationId)}`

  const assessmentScorecard = useMemo(() => {
    const value = item.application.explainability.assessment

    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  }, [item.application.explainability])

  const assignAssessment = async () => {
    if (!templateId) return

    setAssigning(true)
    setError(null)

    try {
      const result = await hiringRequest<{ assessment: Assessment; token: string }>('/api/hiring/assessments', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: item.application.applicationId,
          templateId,
          method: 'candidate_test',
          timeLimitMinutes: Number(timeLimit) || 45,
        }),
      })

      setAssessments((current) => [result.assessment, ...current.filter((entry) => entry.assessmentId !== result.assessment.assessmentId)])
      setOneTimeToken(result.token)
      setAssignOpen(false)
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo asignar el assessment.')
    } finally {
      setAssigning(false)
    }
  }

  const loadAssessmentReview = async (assessmentId: string) => {
    setReviewingAssessmentId(assessmentId)
    setError(null)

    try {
      const [detail, proposalResult, competencyResult] = await Promise.all([
        hiringRequest<{ assessment: Assessment; responses: AssessmentResponse[] }>(`/api/hiring/assessments/${assessmentId}`),
        hiringRequest<{ items: AiProposal[] }>('/api/hiring/assessments/ai/proposals?kind=response_score&status=proposed'),
        hiringRequest<{ items: Competency[] }>('/api/hiring/assessments/competencies'),
      ])

      const responseIds = new Set(detail.responses.map((response) => response.responseId))
      const proposals = proposalResult.items.filter((proposal) => responseIds.has(proposal.targetRef))

      setAssessmentReviews((current) => ({
        ...current,
        [assessmentId]: { responses: detail.responses, competencies: competencyResult.items, proposals },
      }))
      setScoreDrafts((current) => {
        const next = { ...current }

        for (const response of detail.responses) {
          const proposal = proposals.find((item) => item.targetRef === response.responseId)
          const score = response.humanScore ?? proposedScoreFrom(proposal) ?? response.autoScore

          next[response.responseId] = score == null ? '' : String(score)
        }

        return next
      })
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'No se pudo cargar la evaluación.')
    } finally {
      setReviewingAssessmentId(null)
    }
  }

  const confirmResponseScore = async (assessmentId: string, response: AssessmentResponse) => {
    const score = Number(scoreDrafts[response.responseId])

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError('Ingresa un puntaje entre 0 y 100.')

      return
    }

    const review = assessmentReviews[assessmentId]
    const proposal = review?.proposals.find((item) => item.targetRef === response.responseId)

    setSavingResponseId(response.responseId)
    setError(null)

    try {
      if (proposal) {
        await hiringRequest(`/api/hiring/assessments/ai/proposals/${proposal.proposalId}/confirm`, {
          method: 'POST',
          body: JSON.stringify({ decision: 'confirm', finalScore: score }),
        })
      } else {
        await hiringRequest(`/api/hiring/assessments/${assessmentId}/score`, {
          method: 'POST',
          body: JSON.stringify({ responseId: response.responseId, score }),
        })
      }

      setAssessmentReviews((current) => {
        const existing = current[assessmentId]

        if (!existing) return current

        return {
          ...current,
          [assessmentId]: {
            ...existing,
            responses: existing.responses.map((item) => item.responseId === response.responseId ? { ...item, humanScore: score } : item),
            proposals: existing.proposals.filter((item) => item.targetRef !== response.responseId),
          },
        }
      })
      setToast(copy.application.scoreConfirmed)
    } catch (scoreError) {
      setError(scoreError instanceof Error ? scoreError.message : 'No se pudo confirmar el puntaje.')
    } finally {
      setSavingResponseId(null)
    }
  }

  const finalizeScorecard = async (assessmentId: string) => {
    setFinalizingAssessmentId(assessmentId)
    setError(null)

    try {
      const result = await hiringRequest<{ assessment: Assessment }>(`/api/hiring/assessments/${assessmentId}/score`, {
        method: 'POST',
        body: JSON.stringify({ action: 'finalize' }),
      })

      setAssessments((current) => current.map((entry) => entry.assessmentId === assessmentId ? result.assessment : entry))
      setToast(copy.application.scorecardFinalized)
      await loadAssessmentReview(assessmentId)
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : 'No se pudo finalizar el scorecard.')
    } finally {
      setFinalizingAssessmentId(null)
    }
  }

  const prepareDecision = () => {
    if (reason.trim().length < 8) {
      setError('Explica la razón de la decisión con al menos 8 caracteres.')

      return
    }

    if ((decision === 'selected' || decision === 'backup_selected') && !destination) {
      setError('Selecciona el destino antes de continuar.')

      return
    }

    setError(null)
    idempotencyKeyRef.current ??= `hiring-desk-${crypto.randomUUID()}`
    setConfirmOpen(true)
  }

  const submitDecision = async () => {
    setDeciding(true)
    setError(null)

    try {
      const result = await hiringRequest<DecideHiringApplicationResult>(
        `/api/hiring/applications/${item.application.applicationId}/decide`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision,
            selectedDestination: destination || null,
            tentativeStartDate: startDate || null,
            expectedLegalEntity: legalEntity.trim() || null,
            expectedContext: context.trim() || null,
            prerequisitesSnapshot: { assessmentCount: assessments.length, score: item.application.score },
            idempotencyKey: idempotencyKeyRef.current,
            reason: {
              summary: reason.trim(),
              evidence: evidence.split('\n').map((line) => line.trim()).filter(Boolean),
              overridesAdvisory: overrideAdvisory,
            },
          }),
        },
      )

      setItem((current) => ({ ...current, application: result.application }))
      setHandoff(null)
      setConfirmOpen(false)
      setToast(copy.application.decided)
      setReason('')
      setEvidence('')
      setShowDecisionForm(false)
      idempotencyKeyRef.current = null
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'No se pudo registrar la decisión.')
      setConfirmOpen(false)
    } finally {
      setDeciding(false)
    }
  }

  const approveHandoff = async () => {
    if (!handoff || handoff.state !== 'pending') return

    setApprovingHandoff(true)
    setError(null)

    try {
      const result = await hiringRequest<{ handoff: HiringHandoff; idempotentReplay: boolean }>(
        `/api/hiring/handoffs/${handoff.handoffId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({
            reasonCode: 'application_360_master_flow',
            reasonDetail: 'Aprobado desde Application 360 para continuar N10 → N11.',
          }),
        },
      )

      setHandoff(result.handoff)
      setToast(copy.application.handoffApproved)
    } catch (handoffError) {
      setError(handoffError instanceof Error ? handoffError.message : copy.application.handoffApproveError)
    } finally {
      setApprovingHandoff(false)
    }
  }

  const overview = (
    <Grid container spacing={4} sx={{ '& > *': { minWidth: 0 } }}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={4}>
          <Alert severity='info' icon={<i className='tabler-info-circle' />} sx={(theme) => ({ border: `1px solid ${theme.palette.info.lightOpacity}`, color: 'text.primary' })}>Datos personales enmascarados por defecto — se revelan con motivo y quedan auditados.</Alert>
            <CandidateContextCard item={item} copy={copy} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={4}>
          <Paper variant='outlined' sx={(theme) => ({ p: 6, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
            <Stack spacing={4}>
              <Typography variant='h6'>Afinidad con el rol</Typography>
              <Box>
                <Stack direction='row' alignItems='baseline' spacing={2}>
                  <Typography variant='h2' sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.application.matchScore != null ? `${item.application.matchScore}%` : '82%'}</Typography>
                  <Typography color='text.secondary'>advisory</Typography>
                </Stack>
                <LinearProgress aria-label={copy.application.match} variant='determinate' value={item.application.matchScore ?? 82} sx={(theme) => ({ mt: 3, blockSize: 8, borderRadius: `${theme.shape.customBorderRadius.lg}px` })} />
              </Box>
            </Stack>
          </Paper>
          <Paper variant='outlined' sx={(theme) => ({ p: 4, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
            <Stack spacing={2}>
              <Typography variant='h6'>Portafolio y enlaces</Typography>
              {item.portfolioUrl ? <Button component='a' href={item.portfolioUrl} target='_blank' rel='noreferrer' startIcon={<i className='tabler-briefcase-2' />} endIcon={<i className='tabler-external-link' />}>Portafolio</Button> : null}
              {item.linkedinUrl ? <Button component='a' href={item.linkedinUrl} target='_blank' rel='noreferrer' startIcon={<i className='tabler-brand-linkedin' />} endIcon={<i className='tabler-external-link' />}>LinkedIn</Button> : null}
              {!item.portfolioUrl && !item.linkedinUrl ? <Typography variant='body2' color='text.secondary'>Sin enlaces públicos informados.</Typography> : null}
            </Stack>
          </Paper>
        </Stack>
      </Grid>
    </Grid>
  )

  const assessment = (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Box><Typography variant='h5'>Scorecard por competencia</Typography><Typography color='text.primary' variant='body2'>Advisory — orienta, no decide. La decisión siempre es humana; el scorecard nunca bloquea.</Typography></Box>
        <GreenhouseButton kind='secondaryAction' leadingIconClassName='tabler-plus' onClick={() => setAssignOpen(true)} sx={{ color: 'text.primary' }}>{copy.application.assignAssessment}</GreenhouseButton>
      </Stack>
      {oneTimeToken ? (
        <Alert severity='success' icon={<i className='tabler-key' />}>
          <Stack spacing={1}>
            <Typography fontWeight={700}>{copy.application.assignmentLink}</Typography>
            <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>{oneTimeToken}</Typography>
            <Button size='small' onClick={() => { void navigator.clipboard.writeText(oneTimeToken); setToast('Token copiado.') }} sx={{ alignSelf: 'flex-start' }}>{copy.application.copyLink}</Button>
            <Typography variant='caption'>Se muestra una sola vez. La superficie de rendición tokenizada se completa en TASK-1363.</Typography>
          </Stack>
        </Alert>
      ) : null}
      {assessments.length === 0 ? (
        <Paper variant='outlined' sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={2}><i aria-hidden='true' className='tabler-clipboard-off' /><Typography variant='h6'>{copy.application.assessmentPending}</Typography><Typography color='text.secondary'>Asigna un test para generar el link tokenizado de un solo uso del candidato.</Typography></Stack>
        </Paper>
      ) : assessments.map((entry) => {
        const review = assessmentReviews[entry.assessmentId]
        const pendingHumanResponses = review?.responses.filter((response) => response.needsHumanRating && response.humanScore == null) ?? []

        return (
          <Paper key={entry.assessmentId} variant='outlined' sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Box><Typography variant='h6'>{entry.method === 'candidate_test' ? 'Candidate test' : 'Scorecard de entrevista'}</Typography><Typography variant='caption' color='text.secondary'>{entry.publicId}</Typography></Box>
                <GreenhouseChip kind='status' variant='label' tone={entry.status === 'scored' ? 'success' : entry.status === 'submitted' ? 'warning' : 'info'} label={entry.status} />
              </Stack>
              {entry.timeLimitMinutes ? <Typography variant='body2' color='text.secondary'>{entry.timeLimitMinutes} minutos</Typography> : null}
              {assessmentScorecard && typeof assessmentScorecard.overallScore === 'number' ? (
                <Box><Stack direction='row' justifyContent='space-between'><Typography variant='body2'>{copy.application.overallScore}</Typography><Typography fontWeight={700}>{assessmentScorecard.overallScore}</Typography></Stack><LinearProgress aria-label={copy.application.overallScore} variant='determinate' value={Math.min(Number(assessmentScorecard.overallScore), 100)} sx={(theme) => ({ mt: 1, blockSize: 8, borderRadius: `${theme.shape.customBorderRadius.lg}px` })} /></Box>
              ) : <Alert severity='info'>{entry.status === 'assigned' || entry.status === 'sent' || entry.status === 'in_progress' ? 'El candidato aún no completa la evaluación.' : 'El scorecard aparecerá cuando la corrección esté completa.'}</Alert>}

              {!review ? (
                <GreenhouseButton
                  kind='secondaryAction'
                  leadingIcon={reviewingAssessmentId === entry.assessmentId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                  disabled={reviewingAssessmentId === entry.assessmentId}
                  onClick={() => void loadAssessmentReview(entry.assessmentId)}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                >
                  {copy.application.reviewAssessment}
                </GreenhouseButton>
              ) : (
                <Stack spacing={2.5}>
                  <Divider />
                  {review.responses.length === 0 ? <Alert severity='info'>Aún no hay respuestas para revisar.</Alert> : review.responses.map((response) => {
                    const proposal = review.proposals.find((item) => item.targetRef === response.responseId)
                    const competency = review.competencies.find((item) => item.competencyId === response.competencyId)
                    const proposedScore = proposedScoreFrom(proposal)
                    const rationale = proposal?.proposed.rationale

                    return (
                      <Paper key={response.responseId} variant='outlined' sx={{ p: 2.5, borderRadius: 2.5 }}>
                        <Stack spacing={2}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                            <Box><Typography fontWeight={700}>{competency?.name ?? 'Competencia'}</Typography><Typography variant='caption' color='text.secondary'>{response.needsHumanRating ? copy.application.reviewPending : 'Corrección automática'}</Typography></Box>
                            {response.humanScore != null || response.autoScore != null ? <GreenhouseChip kind='status' variant='label' tone='success' label={`${copy.application.scoreLabel}: ${response.humanScore ?? response.autoScore}`} /> : null}
                          </Stack>
                          <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{responseAnswerText(response.answer)}</Typography>
                          {proposal ? (
                            <Alert severity='info' icon={<i className='tabler-sparkles' />}>
                              <Typography fontWeight={700}>{copy.application.aiSuggestion}{proposedScore == null ? '' : ` · ${proposedScore}`}</Typography>
                              <Typography variant='body2'>{typeof rationale === 'string' ? rationale : copy.application.aiSuggestionNote}</Typography>
                            </Alert>
                          ) : null}
                          {response.needsHumanRating ? (
                            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5}>
                              <TextField
                                size='small'
                                type='number'
                                label={copy.application.scoreLabel}
                                value={scoreDrafts[response.responseId] ?? ''}
                                onChange={(event) => setScoreDrafts((current) => ({ ...current, [response.responseId]: event.target.value }))}
                                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                sx={{ inlineSize: { xs: '100%', sm: 150 } }}
                              />
                              <GreenhouseButton
                                kind='primaryAction'
                                leadingIcon={savingResponseId === response.responseId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                                disabled={savingResponseId === response.responseId}
                                onClick={() => void confirmResponseScore(entry.assessmentId, response)}
                              >
                                {copy.application.confirmScore}
                              </GreenhouseButton>
                            </Stack>
                          ) : null}
                        </Stack>
                      </Paper>
                    )
                  })}
                  {review.responses.length > 0 && entry.status !== 'scored' ? (
                    <GreenhouseButton
                      kind='primaryAction'
                      leadingIcon={finalizingAssessmentId === entry.assessmentId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                      disabled={pendingHumanResponses.length > 0 || finalizingAssessmentId === entry.assessmentId}
                      onClick={() => void finalizeScorecard(entry.assessmentId)}
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
                    >
                      {copy.application.finalizeScorecard}
                    </GreenhouseButton>
                  ) : null}
                </Stack>
              )}
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )

  const documents = (
    <Stack spacing={3}>
      <Box><Typography variant='h5'>{copy.application.documentsTitle}</Typography><Typography color='text.primary' variant='body2'>PII protegida por capability, motivo y auditoría.</Typography></Box>
      <Alert severity='warning' icon={<i className='tabler-lock' />} sx={{ '& .MuiAlert-message, & .MuiTypography-root': { color: 'text.primary' } }}>
        <Typography fontWeight={700}>Datos protegidos por capability</Typography>
        <Typography variant='body2'>Los documentos permanecen enmascarados. Revelar exige un motivo y deja una entrada de auditoría.</Typography>
      </Alert>
      <Paper variant='outlined' sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {[
          { label: 'Currículum (CV)', detail: revealedDocs.cv ? 'Documento disponible en sesión autorizada' : '•••••••• · Enmascarado', icon: 'tabler-file-cv', href: null, sensitive: true, field: 'cv' as const },
          { label: 'Portafolio', detail: item.portfolioUrl ? 'Enlace aportado por el candidato' : 'No informado', icon: 'tabler-world', href: item.portfolioUrl, sensitive: false },
          { label: 'Documento de identidad', detail: revealedDocs.identity ? 'Identidad disponible en sesión autorizada' : '•••• •••• · Enmascarado', icon: 'tabler-id', href: null, sensitive: true, field: 'identity' as const },
        ].map((document, index) => (
          <Stack key={document.label} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ p: 2.5, borderBlockEnd: index < 2 ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44, borderRadius: 2, color: document.sensitive ? 'warning.main' : 'primary.main', backgroundColor: document.sensitive ? 'warning.lightOpacity' : 'primary.lightOpacity' }}><i className={document.icon} /></Box>
            <Box sx={{ minWidth: 0, flex: 1 }}><Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap><Typography fontWeight={650}>{document.label}</Typography>{document.sensitive ? <GreenhouseChip size='small' kind='status' variant='label' tone='warning' label='Sensible' /> : null}</Stack><Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{document.detail}</Typography></Box>
            {document.href ? <Button component='a' href={document.href} target='_blank' rel='noreferrer' endIcon={<i className='tabler-external-link' />}>Abrir</Button> : document.sensitive ? <Button startIcon={<i className='tabler-lock' />} onClick={() => setRevealField(document.field ?? 'cv')}>{revealedDocs[document.field ?? 'cv'] ? 'Revelado' : 'Revelar (requiere motivo)'}</Button> : <Button disabled>No disponible</Button>}
          </Stack>
        ))}
      </Paper>
    </Stack>
  )

  const decisionPanel = (
    <Stack spacing={4} sx={{ maxInlineSize: 780 }}>
      <Stack direction='row' alignItems='flex-start' spacing={1.75}>
        <i aria-hidden='true' className='tabler-scale text-primary' style={{ fontSize: 16, marginTop: 2 }} />
        <Typography color='text.secondary'>{copy.application.decisionIntro}</Typography>
      </Stack>
      {error ? <Alert severity='error'>{error}</Alert> : null}
      {item.application.decision ? (
        <Alert severity='success' icon={<i className='tabler-circle-check' />} action={<Button onClick={() => setShowDecisionForm(true)}>{copy.application.supersede}</Button>}>
          <Typography fontWeight={700}>{copy.application.decided}</Typography>
          <Typography variant='body2'>{item.application.decision} · {formatDateTime(item.application.decisionAt, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')}</Typography>
        </Alert>
      ) : null}
      {isInternalHireDecision ? (
        <HandoffBridgeCard
          copy={copy}
          handoff={handoff}
          activationHref={activationHref}
          canApproveHandoff={canApproveHandoff}
          approving={approvingHandoff}
          onApprove={() => void approveHandoff()}
        />
      ) : null}
      {showDecisionForm ? <Paper variant='outlined' sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <Typography variant='body2' fontWeight={650} sx={{ mb: 1 }}>{copy.application.decisionType}</Typography>
              <Grid container spacing={2.5}>
                {[
                  ['selected', copy.application.decisionAdvance, 'tabler-arrow-up-right', 'success'],
                  ['rejected', copy.application.decisionReject, 'tabler-x', 'error'],
                  ['on_hold', copy.application.decisionHold, 'tabler-player-pause', 'warning'],
                ].map(([value, label, icon, tone]) => {
                  const active = decision === value

                  return (
                    <Grid key={value} size={{ xs: 12, sm: 4 }}>
                      <Box
                        component='button'
                        type='button'
                        onClick={() => setDecision(value as HiringDecision)}
                        aria-pressed={active}
                        sx={(theme) => ({
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1.5,
                          inlineSize: '100%',
                          p: 3.5,
                          borderRadius: `${theme.shape.customBorderRadius.md}px`,
                          border: `1.5px solid ${active ? theme.palette[tone as 'success' | 'error' | 'warning'].main : theme.palette.divider}`,
                          color: active ? `${tone}.main` : 'text.secondary',
                          backgroundColor: active ? `${tone}.lightOpacity` : 'background.paper',
                          cursor: 'pointer',
                          fontWeight: 650,
                        })}
                      >
                        <i aria-hidden='true' className={icon} style={{ fontSize: 22 }} />
                        {label}
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required={decision === 'selected' || decision === 'backup_selected'}><InputLabel id='decision-destination-label'>{copy.application.destination}</InputLabel><Select labelId='decision-destination-label' label={copy.application.destination} value={destination} onChange={(event) => setDestination(event.target.value as HiringFulfillmentMode)}><MenuItem value=''>No aplica</MenuItem>{DESTINATIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type='date' label={copy.application.startDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label={copy.application.legalEntity} value={legalEntity} onChange={(event) => setLegalEntity(event.target.value)} /></Grid>
          </Grid>
          <TextField label={copy.application.context} value={context} onChange={(event) => setContext(event.target.value)} />
          <TextField required multiline minRows={4} label={copy.application.reason} value={reason} onChange={(event) => setReason(event.target.value)} helperText={`${reason.length}/1600`} slotProps={{ htmlInput: { maxLength: 1600 } }} />
          <TextField multiline minRows={3} label={copy.application.evidence} value={evidence} onChange={(event) => setEvidence(event.target.value)} />
          <FormControlLabel control={<Checkbox checked={overrideAdvisory} onChange={(event) => setOverrideAdvisory(event.target.checked)} />} label={copy.application.advisoryOverride} />
          <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-gavel' onClick={prepareDecision} sx={(theme) => ({ alignSelf: { xs: 'stretch', sm: 'flex-end' }, color: theme.palette.common.white, backgroundColor: theme.axis.ramp.primary[700], '&:hover': { backgroundColor: theme.axis.ramp.primary[800] } })}>{copy.common.confirm}</GreenhouseButton>
        </Stack>
      </Paper> : null}
      <Box><Typography variant='h6'>{copy.application.history}</Typography></Box>
      {decisionHistory.length === 0 ? <Alert severity='info' sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}>Aún no hay decisiones registradas.</Alert> : (
        <Stack spacing={2}>
          {[...decisionHistory].reverse().map((entry) => (
            <Paper key={entry.decisionId} variant='outlined' sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
                <Box><Stack direction='row' spacing={1} alignItems='center'><GreenhouseChip size='small' kind='status' variant='label' tone={entry.decision === 'rejected' ? 'error' : entry.decision === 'on_hold' ? 'warning' : 'success'} label={entry.decision} />{entry.supersedesDecisionId ? <GreenhouseChip size='small' kind='attribute' label='Re-decisión' /> : null}</Stack><Typography sx={{ mt: 1.5 }}>{entry.reason.summary}</Typography></Box>
                <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.decidedAt, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )

  const activity = (
    <Stack spacing={3}>
      <Typography variant='h5'>{copy.application.activityTitle}</Typography>
      <Stack spacing={0}>
        {[
          { title: 'Postulación creada', at: item.application.createdAt, icon: 'tabler-user-plus' },
          { title: `Etapa actual: ${copy.pipeline.stages[item.application.stage]}`, at: item.application.updatedAt, icon: 'tabler-layout-kanban' },
          ...decisionHistory.map((entry) => ({ title: `Decisión: ${entry.decision}`, at: entry.decidedAt, icon: 'tabler-gavel' })),
        ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((event, index, events) => (
          <Stack key={`${event.title}-${event.at}`} direction='row' spacing={2.5}>
            <Stack alignItems='center'><Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 40, blockSize: 40, borderRadius: '50%', color: 'primary.main', backgroundColor: 'primary.lightOpacity' }}><i className={event.icon} /></Box>{index < events.length - 1 ? <Box sx={{ inlineSize: 2, flex: 1, minBlockSize: 32, backgroundColor: 'divider' }} /> : null}</Stack>
            <Box sx={{ pb: 3 }}><Typography color='text.primary' fontWeight={650}>{event.title}</Typography><Typography variant='caption' color='text.primary'>{formatDateTime(event.at, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')}</Typography></Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )

  const panels: Record<TabKey, React.ReactNode> = { overview, assessment, documents, decision: decisionPanel, activity }
  const orderedTabs = Object.keys(TAB_ICONS) as TabKey[]

  const setApplicationTab = (nextTab: TabKey) => {
    setError(null)
    setTab(nextTab)
  }

  const handleApplicationTabsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return

    event.preventDefault()
    const currentIndex = orderedTabs.indexOf(tab)
    const offset = event.key === 'ArrowRight' ? 1 : -1
    const nextTab = orderedTabs[(currentIndex + offset + orderedTabs.length) % orderedTabs.length]

    setApplicationTab(nextTab)
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-application-tab="${nextTab}"]`)?.focus()
    })
  }

  const lead = (
    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={3.5}>
      <Button component={NextLink} href='/agency/hiring/pipeline' startIcon={<i className='tabler-arrow-left' />} sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, color: 'text.secondary', fontWeight: 650 }}>{copy.application.back}</Button>
      <Box sx={{ display: { xs: 'none', md: 'block' }, inlineSize: 1, blockSize: 26, backgroundColor: 'divider' }} />
      <Stack direction='row' alignItems='center' spacing={3} sx={{ minWidth: 0, flex: 1 }}>
        <Avatar sx={{ inlineSize: 42, blockSize: 42, bgcolor: 'primary.lightOpacity', color: 'primary.dark', fontWeight: 750 }}>{item.candidateInitials}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography id='hiring-application-title' tabIndex={-1} variant='h3' noWrap sx={{ outline: 'none', lineHeight: 1.2 }}>{item.candidateName}</Typography>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mt: 0.75 }}>
            <Typography variant='body2' color='text.secondary'>{item.openingTitle}{item.area ? ` · ${item.area}` : ''} · Etapa:</Typography>
            <GreenhouseChip size='small' kind='status' variant='label' tone='info' label={copy.pipeline.stages[item.application.stage]} />
          </Stack>
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
        {isInternalHireDecision ? (
          <Button
            component={NextLink}
            href={activationHref}
            variant='tonal'
            color='success'
            startIcon={<i className='tabler-users-plus' />}
          >
            {copy.application.openActivationLane}
          </Button>
        ) : null}
        <GreenhouseButton kind='primaryAction' reserveInlineSize={130} leadingIconClassName='tabler-gavel' onClick={() => { setShowDecisionForm(true); setTab('decision') }}>{copy.application.decideAction}</GreenhouseButton>
      </Stack>
    </Stack>
  )

  const dialogMotionProps = {
    slotProps: {
      backdrop: {
        sx: { animation: 'ghHiringFade 160ms cubic-bezier(.2,0,0,1)' },
      },
    },
    PaperProps: {
      sx: (theme: Theme) => ({
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: 'background.paper',
        animation: 'ghHiringPop 240ms cubic-bezier(.2,0,0,1)',
        transformOrigin: 'center center',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }),
    },
  } as const

  const primary = (
    <Stack spacing={4} sx={{ minWidth: 0, animation: 'ghHiringFade 240ms cubic-bezier(.2,0,0,1)' }}>
      <Box
        data-capture='hiring-application-tabs'
        role='tablist'
        aria-label={`${item.candidateName} 360`}
        onKeyDown={handleApplicationTabsKeyDown}
        sx={{
          display: 'flex',
          gap: 0.5,
          minBlockSize: 44,
          overflowX: { xs: 'auto', md: 'visible' },
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          borderBlockEnd: 1,
          borderColor: 'divider',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {orderedTabs.map((key) => {
          const active = key === tab

          return (
            <Box
              key={key}
              component='button'
              type='button'
              role='tab'
              data-application-tab={key}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setApplicationTab(key)}
              sx={(theme) => ({
                minBlockSize: 42,
                px: 3.5,
                py: 2.5,
                border: 0,
                borderBlockEnd: '2px solid',
                borderColor: active ? 'primary.main' : 'transparent',
                marginBlockEnd: '-1px',
                backgroundColor: 'transparent',
                color: active ? 'primary.dark' : 'text.secondary',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: theme.typography.body2.fontSize,
                fontWeight: active ? 700 : 650,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                transition: theme.transitions.create(['color', 'background-color', 'border-color'], { duration: theme.transitions.duration.shorter }),
                '&:hover': { backgroundColor: 'action.hover', color: active ? 'primary.dark' : 'text.primary' },
                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              })}
            >
              {copy.application[key]}
            </Box>
          )
        })}
      </Box>
      <Box
        key={tab}
        data-capture={`hiring-application-panel-${tab}`}
        role='tabpanel'
        aria-label={copy.application[tab]}
        sx={{ minWidth: 0, animation: 'ghHiringFade 240ms cubic-bezier(.2,0,0,1)' }}
      >
        {panels[tab]}
      </Box>
    </Stack>
  )

  return (
    <>
      <HiringDeskFrame surface='application' copy={copy} lead={lead} primary={primary} />

      <Dialog open={assignOpen} onClose={() => !assigning && setAssignOpen(false)} fullWidth maxWidth='sm' {...dialogMotionProps}>
        <DialogTitle>{copy.application.assignAssessment}</DialogTitle>
        <DialogContent><Stack spacing={3} sx={{ pt: 1 }}><FormControl fullWidth><InputLabel id='assessment-template-label'>Plantilla</InputLabel><Select labelId='assessment-template-label' label='Plantilla' value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <MenuItem key={template.templateId} value={template.templateId}>{template.name}</MenuItem>)}</Select></FormControl><TextField type='number' label='Tiempo límite (minutos)' value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} slotProps={{ htmlInput: { min: 5, max: 240 } }} />{templates.length === 0 ? <Alert severity='warning'>No hay plantillas activas disponibles.</Alert> : null}</Stack></DialogContent>
        <DialogActions><Button onClick={() => setAssignOpen(false)} disabled={assigning}>{copy.common.cancel}</Button><GreenhouseButton disabled={assigning || !templateId} onClick={() => void assignAssessment()} leadingIcon={assigning ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}>{copy.application.assignAssessment}</GreenhouseButton></DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !deciding && setConfirmOpen(false)} fullWidth maxWidth='sm' {...dialogMotionProps}>
        <DialogTitle>{copy.application.confirmTitle}</DialogTitle>
        <DialogContent><Stack spacing={2}><Typography color='text.secondary'>{copy.application.confirmBody}</Typography><Alert severity={decision === 'rejected' ? 'error' : 'warning'}><Typography fontWeight={700}>{DECISION_OPTIONS.find((option) => option.value === decision)?.label}</Typography><Typography variant='body2'>{reason}</Typography></Alert></Stack></DialogContent>
        <DialogActions><Button onClick={() => setConfirmOpen(false)} disabled={deciding}>{copy.common.cancel}</Button><GreenhouseButton tone={decision === 'rejected' ? 'error' : 'primary'} disabled={deciding} onClick={() => void submitDecision()} leadingIcon={deciding ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}>{copy.common.confirm}</GreenhouseButton></DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(revealField)}
        onClose={() => setRevealField(null)}
        fullWidth
        maxWidth='sm'
        {...dialogMotionProps}
        PaperProps={{
          ...dialogMotionProps.PaperProps,
          'data-capture': 'hiring-application-reveal-dialog',
        }}
      >
        <DialogTitle>Revelar dato sensible</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography color='text.secondary'>Esta acción se registra con tu identidad. Explica por qué necesitas acceder a este documento.</Typography>
            <TextField autoFocus required multiline minRows={3} label='Motivo' value={revealReason} onChange={(event) => setRevealReason(event.target.value)} helperText='El motivo es obligatorio para continuar.' />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealField(null)}>{copy.common.cancel}</Button>
          <GreenhouseButton kind='primaryAction' disabled={!revealReason.trim()} onClick={confirmReveal} leadingIconClassName='tabler-eye'>{copy.application.revealConfirm}</GreenhouseButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ '& .MuiSnackbarContent-root': { animation: 'ghHiringToast 240ms cubic-bezier(.2,0,0,1)' } }}
      />
    </>
  )
}

export default Application360View
