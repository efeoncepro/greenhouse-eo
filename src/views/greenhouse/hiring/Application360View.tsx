'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'

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
import Drawer from '@mui/material/Drawer'
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
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import {
  GreenhouseButton,
  GreenhouseChip,
  DetailHero,
  isCardDensityAtLeast,
  useContainerDensity,
} from '@/components/greenhouse/primitives'
import type { HiringAssessmentCopy, HiringDeskCopy } from '@/lib/copy'
import { formatDate, formatDateTime } from '@/lib/format'
import { getCountryName } from '@/lib/locale/countries'
import type {
  DecideHiringApplicationResult,
  HiringDecision,
  HiringDecisionHistoryEntry,
  HiringDeskApplicationSummary,
  HiringFulfillmentMode,
} from '@/types/hiring'
import type { CandidateDocumentsViewModel } from '@/lib/hiring/documents'
import type { HiringHandoff } from '@/lib/hiring/handoff/types'
import type { Assessment, AssessmentResponse, AssessmentTemplate, Competency } from '@/types/hiring-assessment'
import type {
  AssessmentReviewCompetencyModule,
  AssessmentReviewItem,
} from '@/lib/hiring/assessment/review'
import type { AiProposal } from '@/types/hiring-assessment-ai'
import type { HiringApplicationNote } from '@/types/hiring-application-notes'

import HiringDeskFrame from './HiringDeskFrame'
import ApplicationDossierPanel from './ApplicationDossierPanel'
import CandidateDocumentsPanel from './CandidateDocumentsPanel'
import AssessmentCompetencyRadar from './AssessmentCompetencyRadar'
import { hiringRequest, scoreTone } from './hiring-client'
import { computeScorecardSummary } from './scorecard-summary'
import { AssessmentAiRunEntry } from './AssessmentAiRunWorkbench'

type TabKey = 'overview' | 'assessment' | 'documents' | 'decision' | 'expediente'
const TAB_KEYS: TabKey[] = ['overview', 'assessment', 'documents', 'decision', 'expediente']

// TASK-1737 — `activity` se convirtió en el Expediente real; el alias preserva
// los deep-links guardados (`?tab=activity` sigue resolviendo al mismo tab).
const TAB_ALIASES: Record<string, TabKey> = { activity: 'expediente' }

const TAB_ICONS: Record<TabKey, string> = {
  overview: 'tabler-layout-dashboard',
  assessment: 'tabler-checkup-list',
  documents: 'tabler-files',
  decision: 'tabler-gavel',
  expediente: 'tabler-notes',
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
  reviewItems: AssessmentReviewItem[]
  competencyModules: AssessmentReviewCompetencyModule[]
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

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)

const effectiveResponseScore = (response: AssessmentResponse): number | null =>
  response.humanScore ?? response.autoScore ?? null

const targetScoreForLevel = (level: string | null): number => {
  if (level === 'avanzado') return 82
  if (level === 'nociones') return 62

  return 72
}

const rubricLinesFrom = (rubric: Record<string, unknown>): string[] => {
  const candidates = [rubric.criteria, rubric.levels, rubric.scale, rubric.items]

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.map((entry) => {
        if (typeof entry === 'string') return entry

        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>

          return String(record.label ?? record.title ?? record.description ?? record.criterion ?? JSON.stringify(record))
        }

        return String(entry)
      }).filter(Boolean)
    }
  }

  return Object.entries(rubric).slice(0, 4).map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
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
      <Stack spacing={condensed ? 2 : 2.75} data-capture='application-contact-summary'>
        <Typography variant='h6'>Perfil del candidato</Typography>
        {[
          [copy.application.opening, item.openingTitle],
          [copy.application.source, item.application.source === 'public_careers' ? 'Careers público' : item.application.source.replaceAll('_', ' ')],
          ['Postulación', formatDate(item.application.createdAt, { dateStyle: 'medium' }, 'es-CL')],
          ['Email', item.maskedEmail ?? 'c•••••@•••••.com'],
          // TASK-1688 — contacto durable del facet; legacy sin dato = "No informado" (nunca inferido).
          [copy.application.phoneLabel, item.phoneE164 ?? copy.application.notProvided],
          [
            copy.application.residenceCountryLabel,
            item.residenceCountryCode
              ? getCountryName(item.residenceCountryCode) ?? item.residenceCountryCode
              : copy.application.notProvided,
          ],
        ].map(([label, value], index, rows) => (
          <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={3} sx={{ py: 2.75, borderBlockEnd: index < rows.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            <Typography variant='body2' color='text.secondary'>{label}</Typography>
            <Typography variant='body2' color={label === 'Email' ? 'text.disabled' : 'text.primary'} fontWeight={650} textAlign='right' sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
          </Stack>
        ))}
        {item.application.candidateMessage ? (
          <Stack spacing={1} sx={{ pt: 2.25, borderBlockStart: 1, borderColor: 'divider' }} data-capture='application-candidate-message'>
            <Typography variant='body2' color='text.secondary'>{copy.application.candidateMessageTitle}</Typography>
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.application.candidateMessage}</Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  )
}

interface Application360ViewProps {
  copy: HiringDeskCopy
  assessmentCopy: HiringAssessmentCopy
  initialItem: HiringDeskApplicationSummary
  initialAssessments: Assessment[]
  templates: AssessmentTemplate[]
  initialHandoff: HiringHandoff | null
  canApproveHandoff: boolean
  /** TASK-1715 — paquete documental resuelto en servidor. `null` si falló o si no hay acceso. */
  documents: CandidateDocumentsViewModel | null
  /** El reader falló (≠ candidato sin documentos): el panel degrada honesto. */
  documentsFailed: boolean
  canRevealIdentity: boolean
  /** TASK-1737 — notas del expediente server-fed (viewer-aware). `null` = el reader FALLÓ. */
  notes: HiringApplicationNote[] | null
  notesFailed: boolean
  hiddenNoteCount: number
  /** Gate anti-anclaje server-enforced: el payload ya viene filtrado para este viewer. */
  viewerBlind: boolean
  canAnnotate: boolean
  canScore: boolean
  noteAuthorNames: Record<string, string>
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

const Application360View = ({
  assessmentCopy,
  canApproveHandoff,
  canRevealIdentity,
  copy,
  documents: candidateDocuments,
  documentsFailed,
  initialItem,
  initialAssessments,
  templates,
  initialHandoff,
  notes,
  notesFailed,
  hiddenNoteCount,
  viewerBlind,
  canAnnotate,
  canScore,
  noteAuthorNames,
}: Application360ViewProps) => {
  const searchParams = useSearchParams()
  const rawRequestedTab = searchParams.get('tab')
  const requestedTab = rawRequestedTab ? TAB_ALIASES[rawRequestedTab] ?? rawRequestedTab : null
  const initialTab: TabKey = TAB_KEYS.includes(requestedTab as TabKey) ? (requestedTab as TabKey) : 'overview'
  const [item, setItem] = useState(initialItem)
  const [handoff, setHandoff] = useState(initialHandoff)
  const [tab, setTab] = useState<TabKey>(initialTab)
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
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null)
  const [scorecardModes, setScorecardModes] = useState<Record<string, 'bars' | 'radar'>>({})
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
  const idempotencyKeyRef = useRef<string | null>(null)

  useEffect(() => {
    document.getElementById('hiring-application-title')?.focus()
  }, [])

  const decisionHistory = useMemo(() => historyFrom(item.application.explainability), [item.application.explainability])
  const isInternalHireDecision = item.application.decision === 'selected' && item.application.selectedDestination === 'internal_hire'

  const activationHref = handoff
    ? `/hr/onboarding?lane=hiring-activation&applicationId=${encodeURIComponent(item.application.applicationId)}&handoffId=${encodeURIComponent(handoff.handoffId)}`
    : `/hr/onboarding?lane=hiring-activation&applicationId=${encodeURIComponent(item.application.applicationId)}`

  const oneTimeAssessmentLink = useMemo(() => {
    if (!oneTimeToken) return null
    const base = typeof window === 'undefined' ? '' : window.location.origin

    return `${base}/assessment/${oneTimeToken}`
  }, [oneTimeToken])

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
        hiringRequest<{
          assessment: Assessment
          responses: AssessmentResponse[]
          reviewItems: AssessmentReviewItem[]
          competencyModules: AssessmentReviewCompetencyModule[]
        }>(`/api/hiring/assessments/${assessmentId}`),
        hiringRequest<{ items: AiProposal[] }>('/api/hiring/assessments/ai/proposals?kind=response_score&status=proposed'),
        hiringRequest<{ items: Competency[] }>('/api/hiring/assessments/competencies'),
      ])

      const responseIds = new Set(detail.responses.map((response) => response.responseId))
      const proposals = proposalResult.items.filter((proposal) => responseIds.has(proposal.targetRef))

      setAssessmentReviews((current) => ({
        ...current,
        [assessmentId]: {
          responses: detail.responses,
          competencies: competencyResult.items,
          reviewItems: detail.reviewItems,
          competencyModules: detail.competencyModules,
          proposals,
        },
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
            reviewItems: existing.reviewItems,
            competencyModules: existing.competencyModules,
            proposals: existing.proposals.filter((item) => item.targetRef !== response.responseId),
          },
        }
      })
      setSelectedResponseId(null)
      setToast(assessmentCopy.review.confirmed)
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
    <Paper
      variant='outlined'
      data-capture='assessment-work-surface'
      sx={theme => ({
        p: { xs: 2.5, md: 4 },
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        overflowX: 'clip',
      })}
    >
      <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant='h5'>{assessmentCopy.review.title}</Typography>
          <Typography color='text.secondary' variant='body2'>{assessmentCopy.review.subtitle}</Typography>
        </Box>
        <GreenhouseButton kind='secondaryAction' leadingIconClassName='tabler-plus' onClick={() => setAssignOpen(true)} sx={{ color: 'text.primary' }}>
          {copy.application.assignAssessment}
        </GreenhouseButton>
      </Stack>

      {oneTimeAssessmentLink ? (
        <Alert severity='success' icon={<i className='tabler-key' />}>
          <Stack spacing={1.25}>
            <Typography fontWeight={700}>{copy.application.assignmentLink}</Typography>
            <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>{oneTimeAssessmentLink}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                size='small'
                onClick={() => {
                  void navigator.clipboard.writeText(oneTimeAssessmentLink)
                  setToast('Enlace copiado.')
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                {copy.application.copyLink}
              </Button>
              <Button component='a' href={oneTimeAssessmentLink} size='small' target='_blank' rel='noreferrer' endIcon={<i className='tabler-external-link' />}>
                Abrir superficie
              </Button>
            </Stack>
            <Typography variant='caption'>Se muestra una sola vez; el token crudo no se guarda en claro.</Typography>
          </Stack>
        </Alert>
      ) : null}

      {assessments.length === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={2}>
            <Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 58, blockSize: 58, borderRadius: '50%', color: 'primary.main', bgcolor: 'primary.lightOpacity' }}>
              <i aria-hidden='true' className='tabler-clipboard-off' />
            </Box>
            <Typography variant='h6'>{copy.application.assessmentPending}</Typography>
            <Typography color='text.secondary'>Asigna un test para generar el link tokenizado de un solo uso del candidato.</Typography>
          </Stack>
        </Box>
      ) : assessments.map((entry) => {
        const review = assessmentReviews[entry.assessmentId]
        const scorecardMode = scorecardModes[entry.assessmentId] ?? 'bars'
        const pendingHumanResponses = review?.responses.filter((response) => response.needsHumanRating && response.humanScore == null) ?? []
        const selectedResponse = review?.responses.find((response) => response.responseId === selectedResponseId) ?? null

        const selectedReviewItem = selectedResponse
          ? review?.reviewItems.find((item) => item.responseId === selectedResponse.responseId) ?? null
          : null

        const selectedProposal = selectedResponse
          ? review?.proposals.find((proposal) => proposal.targetRef === selectedResponse.responseId)
          : undefined

        const modules = review?.competencyModules ?? []

        const scoreRows = modules.map((module) => {
          const responses = review?.responses.filter((response) => response.competencyId === module.competencyId) ?? []
          const scores = responses.map(effectiveResponseScore).filter((score): score is number => score != null)
          const score = scores.length > 0 ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null
          const target = targetScoreForLevel(module.targetLevel)
          const pending = responses.some((response) => response.needsHumanRating && response.humanScore == null) || score == null

          return { ...module, responses, score, target, pending }
        })

        // ISSUE-159: el global SOLO existe con el scorecard completo. Un promedio parcial
        // (p.ej. 2 competencias objetivas perfectas + 7 pendientes) mostraba "100/100
        // Óptimo" como si fuera resultado final. El estado partial muestra progreso, no nota.
        const scorecardSummary = computeScorecardSummary(scoreRows)
        const overall = scorecardSummary.overall

        return (
          <Box
            key={entry.assessmentId}
            data-capture='assessment-scorecard'
            sx={{
              pt: 3,
              borderBlockStart: '1px solid',
              borderColor: 'divider',
              overflowX: 'clip',
            }}
          >
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Box>
                  <Stack direction='row' spacing={1.25} alignItems='center' flexWrap='wrap' useFlexGap>
                    <Typography variant='h6'>
                      {entry.method === 'candidate_test' ? assessmentCopy.review.candidateTest : assessmentCopy.review.interviewerScorecard}
                    </Typography>
                    <GreenhouseChip
                      kind='status'
                      variant='label'
                      tone={
                        entry.status === 'scored'
                          ? 'success'
                          : entry.status === 'submitted'
                            ? 'warning'
                            : entry.status === 'expired'
                              ? 'error'
                              : // TASK-1719: `cancelled` es terminal-neutro (se retiró antes de que el
                                // candidato empezara). Sin rama propia caía al `info` por defecto y una
                                // evaluación cancelada se pintaba neutro-positiva, como una en curso.
                                entry.status === 'cancelled'
                                ? 'default'
                                : 'info'
                      }
                      label={assessmentCopy.review.assessmentStatuses[entry.status]}
                    />
                  </Stack>
                  <Typography variant='caption' color='text.secondary'>{entry.publicId}{entry.timeLimitMinutes ? ` · ${entry.timeLimitMinutes} minutos` : ''}</Typography>
                </Box>
                {!review ? (
                  <GreenhouseButton
                    kind='secondaryAction'
                    data-capture='assessment-load-review'
                    leadingIcon={reviewingAssessmentId === entry.assessmentId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                    disabled={reviewingAssessmentId === entry.assessmentId}
                    onClick={() => void loadAssessmentReview(entry.assessmentId)}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                  >
                    {copy.application.reviewAssessment}
                  </GreenhouseButton>
                ) : null}
              </Stack>

              {/* TASK-1738 — la entrada del run IA vive en la CARD, no dentro del panel de
                  revisión: una cola de excepciones pendiente no puede quedar escondida detrás
                  de "Revisar evaluación". Sin run o sin capability no dibuja nada. */}
              <AssessmentAiRunEntry assessmentId={entry.assessmentId} copy={assessmentCopy.scoringRun} canScore={canScore} />

              {!review ? (
                // TASK-1719: `cancelled` tenía que caer en su propia rama — en el `else` mostraba
                // "Carga la revisión…", un prompt sin sentido para una instancia que nunca tuvo
                // respuestas. Se retiró antes de que el candidato empezara: no hay nada que revisar.
                entry.status === 'cancelled' ? (
                  <Alert severity='warning' icon={<i className='tabler-ban' />}>
                    {assessmentCopy.review.cancelledDetail}
                  </Alert>
                ) : (
                  <Alert severity='info' sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}>
                    {entry.status === 'assigned' || entry.status === 'sent' || entry.status === 'in_progress'
                      ? assessmentCopy.review.candidateIncomplete
                      : assessmentCopy.review.loadReviewPrompt}
                  </Alert>
                )
              ) : (
                <>
                  <Grid container spacing={3} sx={{ '& > *': { minWidth: 0 } }}>
                    <Grid size={{ xs: 12, md: pendingHumanResponses.length === 0 ? 12 : 7 }}>
                      <Box
                        sx={{
                          position: 'relative',
                          overflowX: 'clip',
                        }}
                      >
                        <Stack spacing={3}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent='space-between'
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            spacing={2}
                            data-capture='assessment-effective-visualization-header'
                          >
                            <Box>
                              <Typography variant='subtitle2' color='text.secondary' textTransform='uppercase' letterSpacing='0.08em'>
                                {assessmentCopy.review.overall}
                              </Typography>
                              <Stack direction='row' alignItems='baseline' spacing={1}>
                                <Typography variant='h2' sx={{ fontVariantNumeric: 'tabular-nums' }}>{overall ?? '—'}</Typography>
                                <Typography color='text.secondary'>/100</Typography>
                              </Stack>
                              {scorecardSummary.state === 'partial' ? (
                                <Typography variant='caption' color='text.secondary'>
                                  {formatTemplate(assessmentCopy.review.partialProgress, {
                                    scored: scorecardSummary.scoredCount,
                                    total: scorecardSummary.totalCount
                                  })}
                                </Typography>
                              ) : null}
                            </Box>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                              <GreenhouseChip
                                kind='status'
                                variant='label'
                                tone={scorecardSummary.state === 'complete' ? scoreTone(overall) : 'info'}
                                label={
                                  scorecardSummary.state === 'complete' && overall != null
                                    ? overall >= 75
                                      ? assessmentCopy.review.statuses.optimal
                                      : overall >= 60
                                        ? assessmentCopy.review.statuses.attention
                                        : assessmentCopy.review.statuses.critical
                                    : scorecardSummary.state === 'partial'
                                      ? assessmentCopy.review.statuses.partial
                                      : assessmentCopy.review.statuses.pending
                                }
                              />
                              <ToggleButtonGroup
                                exclusive
                                size='small'
                                value={scorecardMode}
                                aria-label={assessmentCopy.review.title}
                                onChange={(_, nextMode: 'bars' | 'radar' | null) => {
                                  if (nextMode) {
                                    setScorecardModes(current => ({ ...current, [entry.assessmentId]: nextMode }))
                                  }
                                }}
                                sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                              >
                                <ToggleButton value='bars' data-capture='assessment-mode-bars' aria-label={assessmentCopy.review.bars} sx={{ flex: { xs: 1, sm: 'initial' } }}>
                                  <i aria-hidden='true' className='tabler-chart-bar' />
                                  <Box component='span' sx={{ marginInlineStart: 1 }}>{assessmentCopy.review.bars}</Box>
                                </ToggleButton>
                                <ToggleButton value='radar' data-capture='assessment-mode-radar' aria-label={assessmentCopy.review.radar} sx={{ flex: { xs: 1, sm: 'initial' } }}>
                                  <i aria-hidden='true' className='tabler-chart-radar' />
                                  <Box component='span' sx={{ marginInlineStart: 1 }}>{assessmentCopy.review.radar}</Box>
                                </ToggleButton>
                              </ToggleButtonGroup>
                            </Stack>
                          </Stack>

                          <Box
                            data-capture='assessment-effective-visualization'
                            sx={theme => ({
                              inlineSize: '100%',
                              maxInlineSize: theme.breakpoints.values.lg,
                              mx: 'auto',
                            })}
                          >
                            {scoreRows.length === 0 ? (
                              <Alert severity='info'>{assessmentCopy.review.noModules}</Alert>
                            ) : scorecardMode === 'radar' ? (
                              <AssessmentCompetencyRadar
                                rows={scoreRows}
                                ariaLabel={assessmentCopy.review.title}
                                copy={{
                                  scoreLegend: assessmentCopy.review.radarScoreLegend,
                                  targetLegend: assessmentCopy.review.radarTargetLegend,
                                  partialTitle: assessmentCopy.review.radarPartialTitle,
                                  partialBody: assessmentCopy.review.radarPartialBody,
                                  score: assessmentCopy.review.radarMetricScore,
                                  objective: assessmentCopy.review.objective,
                                  pending: assessmentCopy.review.pending,
                                }}
                              />
                            ) : (
                              <Stack spacing={2.25}>
                                {scoreRows.map((row) => (
                                <Box key={row.competencyId}>
                                  <Stack direction='row' justifyContent='space-between' spacing={2} sx={{ mb: 1 }}>
                                    <Stack direction='row' spacing={1.25} alignItems='center' sx={{ minWidth: 0 }}>
                                      <Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 32, blockSize: 32, borderRadius: '50%', color: 'primary.main', bgcolor: 'primary.lightOpacity' }}>
                                        <i className={row.competencyCategory === 'attitudinal' ? 'tabler-heart-handshake' : 'tabler-target-arrow'} />
                                      </Box>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography fontWeight='fontWeightBold' sx={{ overflowWrap: 'anywhere' }}>{row.competencyName}</Typography>
                                        <Typography variant='caption' color='text.secondary'>{assessmentCopy.review.objective} {row.target}% · peso {row.weight}%</Typography>
                                      </Box>
                                    </Stack>
                                    <Stack direction='row' spacing={1} alignItems='center'>
                                      <Typography fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.score ?? assessmentCopy.review.pending}</Typography>
                                      <GreenhouseChip
                                        size='small'
                                        kind='status'
                                        variant='label'
                                        tone={row.pending ? 'info' : scoreTone(row.score)}
                                        label={row.pending ? assessmentCopy.review.statuses.pending : row.score != null && row.score >= 75 ? assessmentCopy.review.statuses.optimal : row.score != null && row.score >= 60 ? assessmentCopy.review.statuses.attention : assessmentCopy.review.statuses.critical}
                                      />
                                    </Stack>
                                  </Stack>
                                  <Box sx={{ position: 'relative', minWidth: 0 }}>
                                    <LinearProgress
                                      variant='determinate'
                                      value={row.score ?? 0}
                                      color={scoreTone(row.score)}
                                      aria-label={formatTemplate(assessmentCopy.review.scoreProgressLabel, {
                                        competency: row.competencyName,
                                        score: row.score ?? assessmentCopy.review.pending,
                                        target: row.target,
                                      })}
                                      sx={(theme) => ({ blockSize: 10, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}
                                    />
                                    <Box
                                      aria-hidden='true'
                                      sx={{
                                        position: 'absolute',
                                        insetBlockStart: -4,
                                        insetInlineStart: `${row.target}%`,
                                        inlineSize: 2,
                                        blockSize: 18,
                                        borderRadius: 1,
                                        bgcolor: 'warning.main',
                                      }}
                                    />
                                  </Box>
                                </Box>
                                ))}
                              </Stack>
                            )}
                          </Box>

                          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
                            <Typography variant='body2'>{assessmentCopy.review.advisory}</Typography>
                          </Alert>

                          <Box
                            component='table'
                            data-capture='assessment-accessible-score-table'
                            sx={{
                              position: 'absolute',
                              inlineSize: 1,
                              maxInlineSize: 1,
                              blockSize: 1,
                              m: -1,
                              overflow: 'hidden',
                              clip: 'rect(0 0 0 0)',
                              tableLayout: 'fixed',
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              border: 0,
                              '& caption, & tbody, & tr, & td': {
                                inlineSize: 1,
                                maxInlineSize: 1,
                                overflow: 'hidden',
                              },
                            }}
                          >
                            <caption>{assessmentCopy.review.title}</caption>
                            <tbody>
                              {scoreRows.map((row) => (
                                <tr key={row.competencyId}>
                                  <td>{row.competencyName}</td>
                                  <td>{row.target}</td>
                                  <td>{row.score ?? assessmentCopy.review.pending}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Box>
                        </Stack>
                      </Box>
                    </Grid>

                    {pendingHumanResponses.length > 0 ? (
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box
                        data-capture='assessment-review-queue'
                        sx={{
                          ps: { xs: 0, md: 3 },
                          borderInlineStart: { xs: 0, md: '1px solid' },
                          borderColor: 'divider',
                        }}
                      >
                        <Stack spacing={2.25}>
                          <Box>
                            <Typography variant='h6'>{formatTemplate(assessmentCopy.review.queueTitle, { count: pendingHumanResponses.length })}</Typography>
                            <Typography variant='body2' color='text.secondary'>{assessmentCopy.review.subtitle}</Typography>
                          </Box>
                          {pendingHumanResponses.map((response) => {
                            const item = review.reviewItems.find((entryItem) => entryItem.responseId === response.responseId)

                            return (
                              <Box
                                key={response.responseId}
                                component='button'
                                type='button'
                                data-capture='assessment-review-row'
                                onClick={() => setSelectedResponseId(response.responseId)}
                                sx={(theme) => ({
                                  display: 'grid',
                                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                                  alignItems: 'center',
                                  gap: 2,
                                  inlineSize: '100%',
                                  p: 2,
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                                  bgcolor: 'background.paper',
                                  color: 'text.primary',
                                  textAlign: 'start',
                                  cursor: 'pointer',
                                  transition: theme.transitions.create(['border-color', 'background-color', 'transform'], { duration: theme.transitions.duration.shorter }),
                                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)' },
                                  '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
                                })}
                              >
                                <Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 34, blockSize: 34, borderRadius: '50%', color: 'warning.main', bgcolor: 'warning.lightOpacity' }}>
                                  <i className='tabler-edit-circle' />
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography fontWeight={700} noWrap>{item?.competencyName ?? 'Competencia'}</Typography>
                                  <Typography variant='body2' color='text.secondary' noWrap>{item?.questionPrompt ?? responseAnswerText(response.answer)}</Typography>
                                </Box>
                                <i className='tabler-chevron-right' aria-hidden='true' />
                              </Box>
                            )
                          })}
                        </Stack>
                      </Box>
                    </Grid>
                    ) : null}
                  </Grid>

                  {pendingHumanResponses.length === 0 ? (
                    <Alert
                      severity='success'
                      icon={<i className='tabler-circle-check' />}
                      data-capture='assessment-review-queue'
                    >
                      <Typography component='span' fontWeight='fontWeightBold'>
                        {assessmentCopy.review.queueEmptyTitle}
                      </Typography>
                      <Typography component='span' variant='body2'> · 0 respuestas pendientes</Typography>
                    </Alert>
                  ) : null}

                  {/* TASK-1719: `cancelled` seguía ofreciendo "Cerrar puntuación" — una instancia
                      retirada no se corrige nunca. El estado terminal manda sobre el conteo de
                      respuestas (que además siempre es 0 acá: sólo se cancela pre-inicio). */}
                  {review.responses.length > 0 && entry.status !== 'scored' && entry.status !== 'cancelled' ? (
                    <GreenhouseButton
                      kind='primaryAction'
                      leadingIcon={finalizingAssessmentId === entry.assessmentId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                      disabled={pendingHumanResponses.length > 0 || finalizingAssessmentId === entry.assessmentId}
                      onClick={() => void finalizeScorecard(entry.assessmentId)}
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
                    >
                      {assessmentCopy.review.finalize}
                    </GreenhouseButton>
                  ) : null}

                  <Drawer
                    anchor='right'
                    open={Boolean(selectedResponse && selectedReviewItem)}
                    onClose={() => setSelectedResponseId(null)}
                    PaperProps={{
                      'data-capture': 'assessment-review-drawer',
                      sx: (theme: Theme) => ({
                        inlineSize: { xs: '100%', sm: 520 },
                        p: 0,
                        borderStart: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.greenhouseElevation.modal.boxShadow,
                      }),
                    }}
                  >
                    {selectedResponse && selectedReviewItem ? (
                      <Stack spacing={0} sx={{ minBlockSize: '100%' }}>
                        <Box sx={{ p: 3, borderBlockEnd: 1, borderColor: 'divider' }}>
                          <Stack direction='row' justifyContent='space-between' spacing={2}>
                            <Box>
                              <Typography variant='overline' color='text.secondary'>{assessmentCopy.review.correctionTitle}</Typography>
                              <Typography variant='h5'>{selectedReviewItem.competencyName}</Typography>
                              <Typography variant='body2' color='text.secondary'>{item.candidateName}</Typography>
                            </Box>
                            <Button aria-label={copy.common.close} onClick={() => setSelectedResponseId(null)} sx={{ minInlineSize: 36, alignSelf: 'flex-start' }}>
                              <i className='tabler-x' />
                            </Button>
                          </Stack>
                        </Box>
                        <Stack spacing={3} sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                          <Box>
                            <Typography variant='subtitle2'>{assessmentCopy.review.question}</Typography>
                            <Typography color='text.secondary' sx={{ mt: 1 }}>{selectedReviewItem.questionPrompt ?? '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant='subtitle2'>{assessmentCopy.review.answer}</Typography>
                            <Paper variant='outlined' sx={(theme) => ({ mt: 1, p: 2.5, borderRadius: `${theme.shape.customBorderRadius.md}px`, bgcolor: 'action.hover' })}>
                              <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{responseAnswerText(selectedResponse.answer)}</Typography>
                            </Paper>
                          </Box>
                          <Box>
                            <Typography variant='subtitle2'>{assessmentCopy.review.rubric}</Typography>
                            <Stack spacing={1.25} sx={{ mt: 1 }}>
                              {rubricLinesFrom(selectedReviewItem.rubric).length > 0 ? rubricLinesFrom(selectedReviewItem.rubric).map((line) => (
                                <Stack key={line} direction='row' spacing={1.25}>
                                  <i className='tabler-point-filled text-primary' aria-hidden='true' />
                                  <Typography variant='body2' color='text.secondary'>{line}</Typography>
                                </Stack>
                              )) : <Typography variant='body2' color='text.secondary'>Sin rúbrica detallada disponible.</Typography>}
                            </Stack>
                          </Box>
                          <Box>
                            <Typography variant='subtitle2'>{assessmentCopy.review.score}</Typography>
                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mt: 1.5 }}>
                              {[
                                ['No cumple', 45],
                                ['Parcial', 62],
                                ['Cumple', 78],
                                ['Supera', 90],
                              ].map(([label, value]) => (
                                <Button
                                  key={label}
                                  variant={Number(scoreDrafts[selectedResponse.responseId]) === value ? 'contained' : 'tonal'}
                                  onClick={() => setScoreDrafts((current) => ({ ...current, [selectedResponse.responseId]: String(value) }))}
                                >
                                  {label} · {value}
                                </Button>
                              ))}
                            </Stack>
                            <TextField
                              fullWidth
                              sx={{ mt: 2 }}
                              type='number'
                              label={assessmentCopy.review.score}
                              value={scoreDrafts[selectedResponse.responseId] ?? ''}
                              onChange={(event) => setScoreDrafts((current) => ({ ...current, [selectedResponse.responseId]: event.target.value }))}
                              slotProps={{ htmlInput: { min: 0, max: 100 } }}
                            />
                          </Box>
                          {selectedProposal ? (
                            <Alert severity='info' icon={<i className='tabler-sparkles' />}>
                              <Stack spacing={1}>
                                <Typography fontWeight={700}>{assessmentCopy.review.aiSuggestion}</Typography>
                                <Typography variant='body2'>{typeof selectedProposal.proposed.rationale === 'string' ? selectedProposal.proposed.rationale : assessmentCopy.review.aiSuggestionBody}</Typography>
                                {proposedScoreFrom(selectedProposal) != null ? (
                                  <Button
                                    size='small'
                                    onClick={() => setScoreDrafts((current) => ({
                                      ...current,
                                      [selectedResponse.responseId]: String(proposedScoreFrom(selectedProposal)),
                                    }))}
                                    sx={{ alignSelf: 'flex-start' }}
                                  >
                                    {assessmentCopy.review.useSuggestion} · {proposedScoreFrom(selectedProposal)}
                                  </Button>
                                ) : null}
                              </Stack>
                            </Alert>
                          ) : null}
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='flex-end' spacing={1.5} sx={{ p: 3, borderBlockStart: 1, borderColor: 'divider' }}>
                          <Button onClick={() => setSelectedResponseId(null)}>{assessmentCopy.review.cancel}</Button>
                          <GreenhouseButton
                            kind='primaryAction'
                            leadingIcon={savingResponseId === selectedResponse.responseId ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                            disabled={savingResponseId === selectedResponse.responseId}
                            onClick={() => void confirmResponseScore(entry.assessmentId, selectedResponse)}
                          >
                            {assessmentCopy.review.confirmScore}
                          </GreenhouseButton>
                        </Stack>
                      </Stack>
                    ) : null}
                  </Drawer>
                </>
              )}
            </Stack>
          </Box>
        )
      })}
      </Stack>
    </Paper>
  )

  // TASK-1715 — el panel consume el reader canónico resuelto en servidor. Antes de esto
  // eran tres filas escritas a mano con un candado que no protegía nada.
  const documents = (
    <CandidateDocumentsPanel
      copy={copy}
      candidateName={item.candidateName}
      documents={candidateDocuments}
      documentsFailed={documentsFailed}
      canRevealIdentity={canRevealIdentity}
    />
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

  const setApplicationTab = (nextTab: TabKey) => {
    setError(null)
    setTab(nextTab)
  }

  // TASK-1737 — el tab sintético `activity` se convirtió en el Expediente real:
  // notas persistidas (TASK-1735, viewer-aware) + eventos de etapa como contexto +
  // flujo propose→confirm del dossier. Panel route-local (patrón TASK-1715).
  const expediente = (
    <ApplicationDossierPanel
      copy={copy}
      applicationId={item.application.applicationId}
      stageLabel={copy.pipeline.stages[item.application.stage]}
      appliedAt={item.application.createdAt}
      stageUpdatedAt={item.application.updatedAt}
      decisionHistory={decisionHistory}
      initialNotes={notesFailed ? null : notes}
      initialHiddenNoteCount={hiddenNoteCount}
      initialViewerBlind={viewerBlind}
      canAnnotate={canAnnotate}
      noteAuthorNames={noteAuthorNames}
      onGoToScorecard={() => setApplicationTab('assessment')}
      onToast={setToast}
    />
  )

  const panels: Record<TabKey, React.ReactNode> = { overview, assessment, documents, decision: decisionPanel, expediente }
  const orderedTabs = Object.keys(TAB_ICONS) as TabKey[]

  const applicationNavigation = (
    <Tabs
      value={tab}
      onChange={(_, nextTab: TabKey) => setApplicationTab(nextTab)}
      variant='scrollable'
      scrollButtons='auto'
      allowScrollButtonsMobile
      aria-label={`${item.candidateName} 360`}
      data-capture='hiring-application-tabs'
      sx={{
        minBlockSize: 44,
        '& .MuiTabs-flexContainer': { gap: 0.5 },
        '& .MuiTab-root': {
          minBlockSize: 44,
          minInlineSize: 'auto',
          px: 2,
          py: 1.5,
          alignItems: 'center',
          fontWeight: 'fontWeightMedium',
          textTransform: 'none',
        },
      }}
    >
      {orderedTabs.map(key => (
        <Tab
          key={key}
          id={`hiring-application-tab-${key}`}
          value={key}
          label={key === 'expediente' ? copy.application.expediente.tabLabel : copy.application[key]}
          aria-controls={`hiring-application-panel-${key}`}
          data-application-tab={key}
        />
      ))}
    </Tabs>
  )

  const lead = (
    <DetailHero
      kind='report'
      dataCapture='hiring-application-hero'
      title={item.candidateName}
      titleId='hiring-application-title'
      titleTabIndex={-1}
      description={`${item.openingTitle}${item.area ? ` · ${item.area}` : ''}`}
      statusLabel={copy.pipeline.stages[item.application.stage]}
      statusTone='info'
      leading={
        <Avatar
          sx={{
            inlineSize: { xs: 48, sm: 56 },
            blockSize: { xs: 48, sm: 56 },
            bgcolor: 'primary.lightOpacity',
            color: 'primary.dark',
            fontWeight: 'fontWeightBold',
          }}
        >
          {item.candidateInitials}
        </Avatar>
      }
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ inlineSize: { xs: '100%', sm: 'auto' } }}>
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
          <GreenhouseButton
            kind='primaryAction'
            reserveInlineSize={130}
            leadingIconClassName='tabler-gavel'
            onClick={() => { setShowDecisionForm(true); setTab('decision') }}
          >
            {copy.application.decideAction}
          </GreenhouseButton>
        </Stack>
      }
      supporting={applicationNavigation}
    />
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
    <Box
      key={tab}
      id={`hiring-application-panel-${tab}`}
      data-capture={`hiring-application-panel-${tab}`}
      role='tabpanel'
      aria-labelledby={`hiring-application-tab-${tab}`}
      sx={{ minWidth: 0, animation: 'ghHiringFade 240ms cubic-bezier(.2,0,0,1)' }}
    >
      {panels[tab]}
    </Box>
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
