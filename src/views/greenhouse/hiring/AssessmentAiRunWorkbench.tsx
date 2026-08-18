'use client'

// TASK-1738 — Workbench operator-only de revisión del run de scoring IA (consumer UI del
// run aggregate de TASK-1734). Cliente DELGADO de los contratos existentes:
//   GET  /api/hiring/assessments/ai/scoring-runs?assessmentId=   (colección, Slice 1)
//   GET  /api/hiring/assessments/ai/scoring-runs/[runId]         (review reader)
//   POST /api/hiring/assessments/ai/scoring-runs/[runId]         (resolve/confirm/cancel)
//
// Invariantes de UI que este componente garantiza (wireframe + flow TASK-1738):
// - Cobertura HONESTA siempre visible (herencia ISSUE-159): un run parcial jamás se
//   presenta como completo; el confirm queda disabled con la causa por gate visible.
// - Muestra ciega ESTRUCTURAL: el reader omite `proposal` en `quality_sample` sin
//   resolver — acá solo se declara la ausencia con honestidad (`sampleHint`).
// - `sawProposalBeforeScoring` se deriva de un GESTO REAL: expandir la propuesta
//   (Collapse) lo marca `true` de forma irreversible hasta resolver; puntuar sin
//   expandir envía `false`. "Confirmar propuesta" NO existe sin haber expandido (DDL-4).
// - `cancel_run` NUNCA se gatea por flag (camino de rollback del contrato de 1734).
// - El workbench no rankea, no decide, no mueve etapa, no asigna tests ni envía email.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import CustomTextField from '@core/components/mui/TextField'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { GreenhouseChipTone } from '@/components/greenhouse/primitives'
import { parseApiErrorPayload } from '@/lib/api/parse-error-response'
import type { HiringAssessmentCopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type {
  AiScoringRun,
  AiScoringRunStatus,
  AssessmentAiReviewItem,
  AssessmentAiRunReview,
} from '@/types/hiring-assessment-ai-run'

type ScoringRunCopy = HiringAssessmentCopy['scoringRun']

const COLLECTION_PATH = '/api/hiring/assessments/ai/scoring-runs'

const RUN_TERMINAL: readonly AiScoringRunStatus[] = ['confirmed', 'cancelled', 'failed']

const ANSWER_CLAMP_CHARS = 280

/**
 * Afordancia de texto en línea con el párrafo que la precede: sin esto, el padding
 * horizontal del botón MUI la desalinea ~16px respecto de la columna de texto (hallazgo
 * del frame real: "Ver más" y "Ver propuesta IA" quedaban sangrados contra su propio bloque).
 */
const INLINE_TEXT_AFFORDANCE_SX = {
  alignSelf: 'flex-start',
  paddingInline: 0,
  minInlineSize: 0,
} as const

/**
 * Tinta AA del rol `warning` (`theme.greenhouseSemantic.warning.ink`). `warning.main` es el
 * RELLENO, no la tinta: como texto sobre blanco da 1.74:1 (axe lo marcó `serious` en el GVC
 * real sobre las dos frases más load-bearing de la superficie — el registro del manifest y
 * las causas por gate). El token canónico ya existe justamente para esto.
 */
const warningInkSx: SxProps<Theme> = theme => ({ color: theme.greenhouseSemantic.warning.ink })

/** Interpolación literal de placeholders `{key}` del copy ledger (patrón hiring existente). */
const fmt = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)), template)

const runStatusTone = (status: AiScoringRunStatus): GreenhouseChipTone => {
  if (status === 'confirmed' || status === 'confirmable') return 'success'
  if (status === 'awaiting_review') return 'warning'
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'default'

  return 'info'
}

/** Label legible de un reason code del risk router; fallback HONESTO al code crudo. */
const reasonLabel = (copy: ScoringRunCopy, code: string): string => {
  const map = copy.reasons as Record<string, string | undefined>

  return map[code] ?? code
}

interface ApiErrorState {
  message: string
  code: string | null
  actionable: boolean
}

const requestJson = async <T,>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init)

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const parsed = parseApiErrorPayload(payload)

    throw Object.assign(new Error(parsed.message), {
      code: parsed.code,
      actionable: res.status === 403 ? false : parsed.actionable,
      status: res.status,
    })
  }

  return (await res.json()) as T
}

const toErrorState = (error: unknown, fallback: string): ApiErrorState => {
  if (error instanceof Error) {
    const enriched = error as Error & { code?: string | null; actionable?: boolean }

    return {
      message: enriched.message || fallback,
      code: enriched.code ?? null,
      actionable: enriched.actionable ?? true,
    }
  }

  return { message: fallback, code: null, actionable: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrada — fila para la card del assessment (tab Evaluación de la Application 360)
// ─────────────────────────────────────────────────────────────────────────────

export interface AssessmentAiRunEntryProps {
  assessmentId: string
  copy: ScoringRunCopy
  /** Capability `hiring.assessment.score` resuelta server-side. Sin ella, NADA se dibuja. */
  canScore: boolean
}

interface CollectionResponse {
  runs: AiScoringRun[]
  confirmEnabled: boolean
}

/**
 * Entrada contextual del run: chip de estado + excepciones pendientes + abrir workbench.
 * Sin runs (o sin capability) la card queda EXACTAMENTE como hoy: no se dibuja nada.
 */
export const AssessmentAiRunEntry = ({ assessmentId, copy, canScore }: AssessmentAiRunEntryProps) => {
  const [run, setRun] = useState<AiScoringRun | null>(null)
  const [confirmEnabled, setConfirmEnabled] = useState(false)
  const [pendingExceptions, setPendingExceptions] = useState(0)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [workbenchOpen, setWorkbenchOpen] = useState(false)
  const openTriggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canScore) return

    let alive = true

    const load = async () => {
      try {
        const body = await requestJson<CollectionResponse>(
          `${COLLECTION_PATH}?assessmentId=${encodeURIComponent(assessmentId)}`,
        )

        if (!alive) return

        const latest = body.runs[0] ?? null

        setRun(latest)
        setConfirmEnabled(Boolean(body.confirmEnabled))
        setFailed(false)

        if (latest && !RUN_TERMINAL.includes(latest.status)) {
          try {
            const review = await requestJson<AssessmentAiRunReview>(`${COLLECTION_PATH}/${latest.runId}`)

            if (alive) {
              setPendingExceptions(review.coverage.mandatoryPending + review.coverage.samplePending)
            }
          } catch {
            // El detalle es enriquecimiento del chip: si falla, la entrada sigue operable.
            if (alive) setPendingExceptions(0)
          }
        } else {
          setPendingExceptions(0)
        }
      } catch {
        if (alive) setFailed(true)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [assessmentId, canScore, reloadKey])

  const restoreFocus = useCallback(() => {
    openTriggerRef.current?.querySelector('button')?.focus()
  }, [])

  if (!canScore) return null

  if (failed) {
    return (
      <Stack direction='row' spacing={2} alignItems='center' data-capture='assessment-run-entry'>
        <Typography variant='caption' color='text.secondary'>
          {copy.entryError}
        </Typography>
        <GreenhouseButton variant='text' size='small' onClick={() => setReloadKey(k => k + 1)}>
          {copy.retry}
        </GreenhouseButton>
      </Stack>
    )
  }

  if (!run) return null

  const chipLabel =
    pendingExceptions > 0
      ? `${fmt(copy.entryChip, { status: copy.statuses[run.status] })} · ${fmt(copy.entryExceptions, { count: pendingExceptions })}`
      : fmt(copy.entryChip, { status: copy.statuses[run.status] })

  return (
    <Stack
      direction='row'
      spacing={2}
      alignItems='center'
      flexWrap='wrap'
      useFlexGap
      data-capture='assessment-run-entry'
    >
      <GreenhouseChip kind='status' variant='label' size='small' tone={runStatusTone(run.status)} label={chipLabel} />
      <Box ref={openTriggerRef} sx={{ display: 'inline-flex' }}>
        <GreenhouseButton variant='outlined' size='small' onClick={() => setWorkbenchOpen(true)}>
          {copy.open}
        </GreenhouseButton>
      </Box>
      <AssessmentAiRunWorkbench
        open={workbenchOpen}
        runId={run.runId}
        copy={copy}
        confirmEnabled={confirmEnabled}
        onClose={() => {
          setWorkbenchOpen(false)
          setReloadKey(k => k + 1)
          restoreFocus()
        }}
      />
    </Stack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Workbench — diálogo de revisión del run
// ─────────────────────────────────────────────────────────────────────────────

export interface AssessmentAiRunWorkbenchProps {
  open: boolean
  runId: string
  copy: ScoringRunCopy
  /** Estado del flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` (envelope de la colección). */
  confirmEnabled: boolean
  onClose: () => void
}

interface ItemDraft {
  score: string
  note: string
}

const isScoreValid = (raw: string): boolean => {
  if (raw.trim() === '') return false

  const value = Number(raw)

  return Number.isFinite(value) && value >= 0 && value <= 100
}

const riskOrder = (item: AssessmentAiReviewItem): number => {
  if (item.riskClass === 'mandatory_review') return 0
  if (item.riskClass === 'quality_sample') return 1
  if (item.riskClass === 'batch_eligible') return 2

  return 3
}

const AssessmentAiRunWorkbench = ({ open, runId, copy, confirmEnabled, onClose }: AssessmentAiRunWorkbenchProps) => {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const collapseTimeout = prefersReducedMotion ? 0 : undefined

  const [review, setReview] = useState<AssessmentAiRunReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiErrorState | null>(null)

  // `sawProposalBeforeScoring` como gesto real: expandir marca true, irreversible hasta
  // resolver (DDL-3). Nunca un default ni una autodeclaración.
  const [seenProposals, setSeenProposals] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({})
  const [localHumanScores, setLocalHumanScores] = useState<Record<string, number>>({})
  const [batchExpanded, setBatchExpanded] = useState(false)

  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [confirmFlagOn, setConfirmFlagOn] = useState(confirmEnabled)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ApiErrorState | null>(null)

  const itemRefs = useRef<Record<string, HTMLElement | null>>({})
  const requestInFlight = busyItemId != null || confirming || cancelling

  useEffect(() => {
    setConfirmFlagOn(confirmEnabled)
  }, [confirmEnabled])

  const fetchReview = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const body = await requestJson<AssessmentAiRunReview>(`${COLLECTION_PATH}/${runId}`)

      setReview(body)
    } catch (err) {
      setError(toErrorState(err, copy.loadError))
    } finally {
      setLoading(false)
    }
  }, [runId, copy.loadError])

  useEffect(() => {
    if (!open) return

    void fetchReview()
  }, [open, fetchReview])

  const items = useMemo(() => {
    if (!review) return []

    return [...review.items].sort((a, b) => {
      const byRisk = riskOrder(a) - riskOrder(b)

      if (byRisk !== 0) return byRisk

      // Pendientes de trabajo primero dentro de cada grupo.
      const aPending = a.status === 'proposed' && a.resolution == null ? 0 : 1
      const bPending = b.status === 'proposed' && b.resolution == null ? 0 : 1

      return aPending - bPending
    })
  }, [review])

  const mandatoryItems = items.filter(i => i.riskClass === 'mandatory_review')
  const sampleItems = items.filter(i => i.riskClass === 'quality_sample')
  const batchItems = items.filter(i => i.riskClass === 'batch_eligible' && i.status === 'proposed')

  const otherItems = items.filter(
    i => i.riskClass !== 'mandatory_review' && i.riskClass !== 'quality_sample' && !(i.riskClass === 'batch_eligible' && i.status === 'proposed'),
  )

  const run = review?.run ?? null
  const coverage = review?.coverage ?? null
  const runTerminal = run ? RUN_TERMINAL.includes(run.status) : false
  const lineageBlocked = error?.code === 'assessment_ai_run_lineage_mismatch'

  // ── Gates del confirm: causas VISIBLES (aria-describedby), nunca disabled mudo ──
  const gateMessages = useMemo(() => {
    if (!coverage) return []

    const gates: string[] = []

    if (coverage.scoringPending > 0) gates.push(fmt(copy.gateOpenScoring, { count: coverage.scoringPending }))
    if (coverage.mandatoryPending > 0) gates.push(fmt(copy.gateOpenMandatory, { count: coverage.mandatoryPending }))
    if (coverage.samplePending > 0) gates.push(fmt(copy.gateOpenSample, { count: coverage.samplePending }))
    if (coverage.digestStale) gates.push(copy.gateStale)

    return gates
  }, [coverage, copy])

  const confirmBlocked = gateMessages.length > 0 || !confirmFlagOn || runTerminal || requestInFlight

  const draftFor = (itemId: string): ItemDraft => drafts[itemId] ?? { score: '', note: '' }

  const setDraft = (itemId: string, patch: Partial<ItemDraft>) => {
    setDrafts(prev => ({ ...prev, [itemId]: { ...draftFor(itemId), ...patch } }))
  }

  const focusNextPending = useCallback(
    (afterItemId: string, fresh: AssessmentAiRunReview | null) => {
      const source = fresh?.items ?? []

      const pending = source
        .filter(i => i.status === 'proposed' && i.resolution == null && (i.riskClass === 'mandatory_review' || i.riskClass === 'quality_sample'))
        .filter(i => i.runItemId !== afterItemId)

      const target = pending[0]

      if (target) {
        // El foco pasa al siguiente item pendiente (flujo de trabajo en serie).
        requestAnimationFrame(() => itemRefs.current[target.runItemId]?.focus())
      }
    },
    [],
  )

  const resolveItem = useCallback(
    async (item: AssessmentAiReviewItem, resolution: 'confirmed' | 'overridden' | 'rejected_to_manual') => {
      const draft = draftFor(item.runItemId)

      // Muestra ciega: la propuesta NO existe en el payload → false ESTRUCTURAL.
      // Mandatory: true solo si el gesto real de expandir ocurrió.
      const sawProposal = item.riskClass === 'quality_sample' ? false : Boolean(seenProposals[item.runItemId])

      setBusyItemId(item.runItemId)
      setActionError(null)

      try {
        await requestJson(`${COLLECTION_PATH}/${runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'resolve_item',
            runItemId: item.runItemId,
            resolution,
            ...(resolution === 'overridden' ? { finalScore: Number(draft.score) } : {}),
            ...(draft.note.trim() ? { decisionNote: draft.note.trim() } : {}),
            sawProposalBeforeScoring: sawProposal,
          }),
        })

        if (resolution === 'overridden') {
          setLocalHumanScores(prev => ({ ...prev, [item.runItemId]: Number(draft.score) }))
        }

        setSnackbar(copy.resolved)

        const fresh = await requestJson<AssessmentAiRunReview>(`${COLLECTION_PATH}/${runId}`).catch(() => null)

        if (fresh) setReview(fresh)
        focusNextPending(item.runItemId, fresh)
      } catch (err) {
        const state = toErrorState(err, copy.loadError)

        setActionError(state)

        // Terminal-once / carrera / stale: el estado real está en el server → re-fetch.
        if ((err as { status?: number }).status === 409) {
          void fetchReview()
        }
      } finally {
        setBusyItemId(null)
      }
    },
    // draftFor/seenProposals capturados por render: dependencias explícitas abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runId, copy, drafts, seenProposals, fetchReview, focusNextPending],
  )

  const confirmRun = useCallback(async () => {
    setConfirming(true)
    setActionError(null)

    try {
      await requestJson(`${COLLECTION_PATH}/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_run' }),
      })

      setSnackbar(copy.confirmed)
      await fetchReview()
    } catch (err) {
      const state = toErrorState(err, copy.loadError)

      if (state.code === 'assessment_ai_run_confirm_disabled') {
        // El flag está OFF en el runtime real: reflejarlo con honestidad.
        setConfirmFlagOn(false)
      }

      setActionError(state)

      if ((err as { status?: number }).status === 409) {
        void fetchReview()
      }
    } finally {
      setConfirming(false)
    }
  }, [runId, copy, fetchReview])

  const cancelRun = useCallback(async () => {
    setCancelling(true)
    setActionError(null)

    try {
      await requestJson(`${COLLECTION_PATH}/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_run' }),
      })

      setSnackbar(copy.cancelled)
      setCancelDialogOpen(false)
      await fetchReview()
    } catch (err) {
      setActionError(toErrorState(err, copy.loadError))
      setCancelDialogOpen(false)

      if ((err as { status?: number }).status === 409) {
        void fetchReview()
      }
    } finally {
      setCancelling(false)
    }
  }, [runId, copy, fetchReview])

  const handleClose = useCallback(() => {
    // Cerrar es inofensivo (todo lo resuelto ya persistió), salvo request en vuelo.
    if (requestInFlight) return

    onClose()
  }, [requestInFlight, onClose])

  // ── Render de un item de la cola ──

  const renderProposal = (item: AssessmentAiReviewItem) => {
    if (!item.proposal) return null

    const expanded = Boolean(seenProposals[item.runItemId]) || item.resolution != null

    return (
      <Box sx={{ borderInlineStart: '2px solid', borderInlineStartColor: 'divider', paddingInlineStart: 3, marginBlockStart: 2 }}>
        {item.resolution == null ? (
          <GreenhouseButton
            variant='text'
            size='small'
            aria-expanded={expanded}
            leadingIconClassName={expanded ? 'tabler-eye' : 'tabler-eye-off'}
            onClick={() => setSeenProposals(prev => ({ ...prev, [item.runItemId]: true }))}
            disabled={expanded}
            sx={INLINE_TEXT_AFFORDANCE_SX}
          >
            {copy.revealProposal}
          </GreenhouseButton>
        ) : null}
        {/* `unmountOnExit`: la propuesta NO existe en el DOM hasta el gesto real de expandir
            (el wireframe prohíbe el render precargado oculto con CSS — expandir = ver). */}
        <Collapse in={expanded} timeout={collapseTimeout} unmountOnExit>
          <Stack spacing={2} sx={{ paddingBlockStart: 2 }}>
            {item.resolution == null ? (
              <Typography variant='caption' role='status' sx={warningInkSx}>
                {copy.proposalSeen}
              </Typography>
            ) : null}
            <Typography variant='body2' fontWeight={600}>
              {fmt(copy.proposalScore, { score: item.proposal.score ?? '—' })}
            </Typography>
            {item.proposal.rationale ? (
              <Typography variant='body2' color='text.secondary'>
                {item.proposal.rationale}
              </Typography>
            ) : null}
            {item.proposal.perCriterion.length > 0 ? (
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  {copy.perCriterion}
                </Typography>
                <Stack component='ul' spacing={1} sx={{ m: 0, paddingInlineStart: 4 }}>
                  {item.proposal.perCriterion.map(entry => (
                    // El aporte se lee sobre su peso (`20 / 25`): sin el denominador el operador
                    // no puede saber si 20 es bueno. Proposals del prompt v1 no traen `weight`.
                    <Typography key={entry.criterion} component='li' variant='body2'>
                      {entry.criterion}: {entry.weight != null ? `${entry.score} / ${entry.weight}` : entry.score}
                      {entry.note ? ` — ${entry.note}` : ''}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
            {/* `text.disabled` (2.29:1) no es color de texto real: la procedencia del modelo
                es evidencia auditable, no decoración. */}
            <Typography variant='caption' color='text.secondary'>
              {fmt(copy.proposalProvenance, { model: item.proposal.model, promptVersion: item.proposal.promptVersion })}
            </Typography>
          </Stack>
        </Collapse>
      </Box>
    )
  }

  const renderAnswer = (item: AssessmentAiReviewItem) => {
    const expanded = Boolean(expandedAnswers[item.runItemId])
    const needsClamp = item.answerText.length > ANSWER_CLAMP_CHARS
    const text = expanded || !needsClamp ? item.answerText : `${item.answerText.slice(0, ANSWER_CLAMP_CHARS)}…`

    return (
      <Box>
        <Typography variant='caption' color='text.secondary'>
          {copy.answerLabel}
        </Typography>
        <Typography variant='body2' sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {text}
        </Typography>
        {needsClamp ? (
          <GreenhouseButton
            variant='text'
            size='small'
            aria-expanded={expanded}
            onClick={() => setExpandedAnswers(prev => ({ ...prev, [item.runItemId]: !expanded }))}
            sx={INLINE_TEXT_AFFORDANCE_SX}
          >
            {expanded ? copy.showLess : copy.showMore}
          </GreenhouseButton>
        ) : null}
      </Box>
    )
  }

  const renderResolutionInputs = (item: AssessmentAiReviewItem) => {
    const draft = draftFor(item.runItemId)
    const busy = busyItemId === item.runItemId
    const scoreValid = isScoreValid(draft.score)
    const scoreTouchedInvalid = draft.score.trim() !== '' && !scoreValid
    const isSample = item.riskClass === 'quality_sample'
    const proposalSeen = Boolean(seenProposals[item.runItemId])

    return (
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <CustomTextField
            label={copy.myScoreLabel}
            type='number'
            size='small'
            value={draft.score}
            onChange={e => setDraft(item.runItemId, { score: e.target.value })}
            slotProps={{
              htmlInput: { min: 0, max: 100, 'aria-label': copy.myScoreLabel },
              formHelperText: { role: 'alert' },
            }}
            error={scoreTouchedInvalid}
            helperText={scoreTouchedInvalid ? copy.scoreRangeError : undefined}
            disabled={busy}
            sx={{ maxInlineSize: 160 }}
          />
          <CustomTextField
            label={copy.noteLabel}
            size='small'
            value={draft.note}
            onChange={e => setDraft(item.runItemId, { note: e.target.value })}
            disabled={busy}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap flexWrap='wrap'>
          {/* Escape honesto siempre disponible (jerarquía nivel 3). */}
          <GreenhouseButton
            variant='text'
            size='small'
            disabled={busy}
            onClick={() => void resolveItem(item, 'rejected_to_manual')}
            fullWidth={fullScreen}
          >
            {copy.resolveReject}
          </GreenhouseButton>
          <GreenhouseButton
            variant='outlined'
            size='small'
            disabled={busy || !scoreValid}
            onClick={() => void resolveItem(item, 'overridden')}
            fullWidth={fullScreen}
          >
            {busy ? copy.resolving : isSample ? copy.resolveSample : copy.resolveOverride}
          </GreenhouseButton>
          {/* "Confirmar propuesta" SOLO existe con la propuesta expandida (DDL-4). */}
          {!isSample && proposalSeen ? (
            <GreenhouseButton
              variant='outlined'
              size='small'
              disabled={busy}
              onClick={() => void resolveItem(item, 'confirmed')}
              fullWidth={fullScreen}
            >
              {busy ? copy.resolving : copy.resolveConfirm}
            </GreenhouseButton>
          ) : null}
        </Stack>
      </Stack>
    )
  }

  const renderExceptionItem = (item: AssessmentAiReviewItem) => {
    const resolved = item.resolution != null
    const isSample = item.riskClass === 'quality_sample'
    const humanScore = localHumanScores[item.runItemId]

    return (
      <Paper
        key={item.runItemId}
        component='li'
        variant='outlined'
        tabIndex={-1}
        ref={(node: unknown) => {
          itemRefs.current[item.runItemId] = (node as HTMLElement | null) ?? null
        }}
        sx={{ p: 2.5, listStyle: 'none' }}
        data-capture={isSample && !resolved ? 'assessment-run-blind-item' : undefined}
      >
        <Stack spacing={3}>
          <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' alignItems='center'>
            {isSample ? (
              <GreenhouseChip
                kind='status'
                variant='label'
                size='small'
                tone='info'
                iconClassName='tabler-eye-off'
                label={resolved ? copy.sampleResolvedChip : copy.sampleChip}
              />
            ) : (
              <GreenhouseChip
                kind='status'
                variant='label'
                size='small'
                tone='warning'
                iconClassName='tabler-alert-triangle'
                label={copy.mandatoryChip}
              />
            )}
            {resolved && item.resolution ? (
              <GreenhouseChip
                kind='status'
                variant='outlined'
                size='small'
                label={copy.resolutionLabels[item.resolution]}
              />
            ) : null}
          </Stack>

          {isSample && !resolved ? (
            <Typography variant='body2' color='text.secondary'>
              {copy.sampleHint}
            </Typography>
          ) : null}

          <Box>
            <Typography variant='caption' color='text.secondary'>
              {copy.questionLabel}
            </Typography>
            <Typography variant='body2' fontWeight={500} sx={{ overflowWrap: 'anywhere' }}>
              {item.questionPrompt}
            </Typography>
          </Box>

          {renderAnswer(item)}

          {/* Las razones de routing viven BAJO su etiqueta, no sueltas en el header: antes
              la etiqueta quedaba huérfana (sin nada debajo) y los chips aparecían arriba sin
              decir qué eran. En la muestra ciega no se listan: el único reason posible es
              `blind_quality_sample`, que el chip + `sampleHint` ya explican. */}
          {!isSample && !resolved && item.routingReasons.length > 0 ? (
            <Box>
              <Typography variant='caption' color='text.secondary' component='p'>
                {copy.routingReasons}
              </Typography>
              <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' sx={{ marginBlockStart: 1 }}>
                {item.routingReasons.map(code => (
                  <GreenhouseChip
                    key={code}
                    kind='attribute'
                    variant='outlined'
                    size='small'
                    label={reasonLabel(copy, code)}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          {renderProposal(item)}

          {resolved ? (
            isSample && item.proposal ? (
              <Typography variant='body2'>
                {humanScore != null && item.proposal.score != null
                  ? fmt(copy.sampleContrast, {
                      human: humanScore,
                      ai: item.proposal.score,
                      delta: Math.abs(humanScore - item.proposal.score),
                    })
                  : fmt(copy.proposalScore, { score: item.proposal.score ?? '—' })}
              </Typography>
            ) : null
          ) : (
            renderResolutionInputs(item)
          )}
        </Stack>
      </Paper>
    )
  }

  const renderBatchGroup = () => {
    if (batchItems.length === 0) return null

    return (
      <Paper component='li' variant='outlined' sx={{ p: 2.5, listStyle: 'none' }}>
        <Stack spacing={2}>
          <GreenhouseButton
            variant='text'
            size='small'
            aria-expanded={batchExpanded}
            leadingIconClassName={batchExpanded ? 'tabler-chevron-down' : 'tabler-chevron-right'}
            onClick={() => setBatchExpanded(prev => !prev)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {fmt(copy.batchGroup, { count: batchItems.length })}
          </GreenhouseButton>
          <Collapse in={batchExpanded} timeout={collapseTimeout} unmountOnExit>
            <Stack spacing={3}>
              {batchItems.map(item => (
                <Box key={item.runItemId} sx={{ borderInlineStart: '2px solid', borderInlineStartColor: 'divider', paddingInlineStart: 3 }}>
                  <Typography variant='body2' fontWeight={500} sx={{ overflowWrap: 'anywhere' }}>
                    {item.questionPrompt}
                  </Typography>
                  {item.proposal ? (
                    <Typography variant='body2' color='text.secondary'>
                      {fmt(copy.proposalScore, { score: item.proposal.score ?? '—' })}
                      {' · '}
                      {fmt(copy.proposalProvenance, {
                        model: item.proposal.model,
                        promptVersion: item.proposal.promptVersion,
                      })}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Stack>
      </Paper>
    )
  }

  const renderOtherItems = () => {
    if (otherItems.length === 0) return null

    return otherItems.map(item => (
      <Paper key={item.runItemId} component='li' variant='outlined' sx={{ p: 2.5, listStyle: 'none' }}>
        <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' alignItems='center'>
          <GreenhouseChip kind='status' variant='outlined' size='small' label={item.status} />
          {item.reasonCode ? (
            <Typography variant='caption' color='text.secondary'>
              {reasonLabel(copy, item.reasonCode)}
            </Typography>
          ) : null}
          <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>
            {item.questionPrompt}
          </Typography>
        </Stack>
      </Paper>
    ))
  }

  // ── Región 1: cobertura honesta ──

  const renderCoverage = () => {
    if (!coverage) return null

    const chips: string[] = [
      fmt(copy.coverPending, { count: coverage.scoringPending }),
      fmt(copy.coverMandatory, {
        resolved: coverage.mandatoryResolved,
        total: coverage.mandatoryResolved + coverage.mandatoryPending,
      }),
      fmt(copy.coverSample, {
        resolved: coverage.sampleResolved,
        total: coverage.sampleResolved + coverage.samplePending,
      }),
      fmt(copy.coverBatch, { count: coverage.batchEligible }),
      fmt(copy.coverManual, { count: coverage.returnedToManual }),
      fmt(copy.coverClosed, { count: coverage.closedWithoutProposal }),
    ]

    // La cobertura es el techo permanente contra el rubber-stamp: si se va con el scroll, el
    // operador trabaja la cola sin ver cuánto queda pendiente. El frame real la mostraba
    // desapareciendo bajo el header — acá queda pegada al tope del contenedor scrolleable.
    return (
      <Box
        role='group'
        aria-label={copy.coverageLabel}
        data-capture='assessment-run-coverage'
        sx={{
          position: 'sticky',
          insetBlockStart: 0,
          zIndex: 2,
          backgroundColor: 'background.paper',
          paddingBlockEnd: 2,
        }}
      >
        <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
          {chips.map(label => (
            <GreenhouseChip key={label} kind='metric' variant='label' size='small' label={label} />
          ))}
        </Stack>
        {coverage.digestStale ? (
          <Alert severity='warning' sx={{ marginBlockStart: 3 }}>
            {copy.staleBanner}
          </Alert>
        ) : null}
      </Box>
    )
  }

  // ── Región 3: confirmación / cancelación ──

  const renderConfirmRegion = () => {
    if (!run || !coverage || runTerminal || lineageBlocked) return null

    return (
      <Paper variant='outlined' sx={{ p: 3 }} data-capture='assessment-run-confirm'>
        <Stack spacing={3}>
          {/* El tema pinta `subtitle2` a text.primary@55% (3.38:1): insuficiente para el
              encabezado de la región que gobierna la confirmación del run. */}
          <Typography variant='subtitle2' color='text.primary'>
            {copy.confirmTitle}
          </Typography>
          {!coverage.digestStale ? (
            <Typography variant='body2' color='text.secondary'>
              {fmt(copy.manifestSummary, {
                batch: coverage.batchEligible,
                a: coverage.mandatoryResolved,
                aTotal: coverage.mandatoryResolved + coverage.mandatoryPending,
                b: coverage.sampleResolved,
                bTotal: coverage.sampleResolved + coverage.samplePending,
                policyVersion: run.policyVersion,
              })}
            </Typography>
          ) : null}
          {gateMessages.length > 0 ? (
            <Stack component='ul' id='assessment-run-confirm-gates' spacing={1} sx={{ m: 0, paddingInlineStart: 4 }}>
              {gateMessages.map(message => (
                <Typography key={message} component='li' variant='body2' sx={warningInkSx}>
                  {message}
                </Typography>
              ))}
            </Stack>
          ) : null}
          {!confirmFlagOn ? (
            <Alert severity='info' id='assessment-run-confirm-flag-off'>
              {copy.confirmFlagOff}
            </Alert>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between'>
            <GreenhouseButton
              variant='text'
              tone='error'
              size='small'
              disabled={requestInFlight}
              onClick={() => setCancelDialogOpen(true)}
              fullWidth={fullScreen}
            >
              {copy.cancelRun}
            </GreenhouseButton>
            <GreenhouseButton
              variant='solid'
              size='small'
              disabled={confirmBlocked}
              aria-busy={confirming}
              aria-describedby={
                gateMessages.length > 0
                  ? 'assessment-run-confirm-gates'
                  : !confirmFlagOn
                    ? 'assessment-run-confirm-flag-off'
                    : undefined
              }
              onClick={() => void confirmRun()}
              fullWidth={fullScreen}
            >
              {confirming ? copy.confirming : copy.confirmRun}
            </GreenhouseButton>
          </Stack>
        </Stack>
      </Paper>
    )
  }

  const renderTerminal = () => {
    if (!run || !runTerminal) return null

    const message =
      run.status === 'cancelled'
        ? fmt(copy.terminalCancelled, { reason: run.statusReason ?? '—' })
        : run.status === 'failed'
          ? fmt(copy.terminalFailed, { reason: run.statusReason ?? '—' })
          : copy.confirmed

    return (
      <Alert severity={run.status === 'confirmed' ? 'success' : run.status === 'failed' ? 'error' : 'info'}>
        {message}
      </Alert>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth='lg'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='assessment-run-workbench-title'
        PaperProps={{ sx: fullScreen ? undefined : { blockSize: '90vh' } }}
      >
        <DialogTitle id='assessment-run-workbench-title' sx={{ paddingBlockEnd: 2 }}>
          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
            <Box>
              <Stack direction='row' spacing={2} alignItems='center' useFlexGap flexWrap='wrap'>
                <Typography variant='h5' component='span'>
                  {copy.title}
                </Typography>
                {run ? (
                  <GreenhouseChip
                    kind='status'
                    variant='label'
                    size='small'
                    tone={runStatusTone(run.status)}
                    label={copy.statuses[run.status]}
                  />
                ) : null}
              </Stack>
              {run ? (
                <Typography variant='caption' color='text.secondary'>
                  {fmt(copy.provenance, {
                    model: run.model,
                    policyVersion: run.policyVersion,
                    date: formatDate(run.createdAt),
                  })}
                </Typography>
              ) : null}
            </Box>
            <Stack direction='row' spacing={1} alignItems='center'>
              {run?.status === 'scoring' ? (
                <GreenhouseButton
                  variant='outlined'
                  size='small'
                  leadingIconClassName='tabler-refresh'
                  onClick={() => void fetchReview()}
                  disabled={loading}
                >
                  {copy.refresh}
                </GreenhouseButton>
              ) : null}
              <IconButton aria-label={copy.close} onClick={handleClose} disabled={requestInFlight}>
                <i className='tabler-x' aria-hidden='true' />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 4 }} data-capture='assessment-run-workbench'>
          {loading && !review ? (
            <Stack spacing={3} aria-busy='true'>
              <Skeleton variant='rounded' height={56} />
              <Skeleton variant='rounded' height={140} />
              <Skeleton variant='rounded' height={140} />
              <Skeleton variant='rounded' height={140} />
            </Stack>
          ) : null}

          {error ? (
            <Alert
              severity='error'
              action={
                error.actionable && !lineageBlocked ? (
                  <GreenhouseButton variant='text' size='small' onClick={() => void fetchReview()}>
                    {copy.retry}
                  </GreenhouseButton>
                ) : undefined
              }
            >
              {lineageBlocked ? copy.lineageError : error.code === 'forbidden' ? copy.permissionDenied : error.message}
            </Alert>
          ) : null}

          {review && !lineageBlocked ? (
            <>
              {renderTerminal()}
              {renderCoverage()}
              {actionError ? (
                <Alert severity={actionError.actionable ? 'warning' : 'error'} onClose={() => setActionError(null)}>
                  {actionError.code === 'forbidden' ? copy.permissionDenied : actionError.message}
                </Alert>
              ) : null}
              <Stack component='ol' spacing={3} sx={{ m: 0, p: 0 }} role='list'>
                {mandatoryItems.map(renderExceptionItem)}
                {sampleItems.map(renderExceptionItem)}
                {renderBatchGroup()}
                {renderOtherItems()}
              </Stack>
              {renderConfirmRegion()}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog de cancelación — NUNCA flag-gated (DDL-5). */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => {
          if (!cancelling) setCancelDialogOpen(false)
        }}
        maxWidth='sm'
        fullWidth
        aria-labelledby='assessment-run-cancel-title'
      >
        <DialogTitle id='assessment-run-cancel-title'>{copy.cancelDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>{copy.cancelDialogBody}</Typography>
        </DialogContent>
        <DialogActions>
          <GreenhouseButton
            variant='outlined'
            size='small'
            autoFocus
            disabled={cancelling}
            onClick={() => setCancelDialogOpen(false)}
          >
            {copy.cancelKeep}
          </GreenhouseButton>
          <GreenhouseButton
            variant='solid'
            tone='error'
            size='small'
            disabled={cancelling}
            aria-busy={cancelling}
            onClick={() => void cancelRun()}
          >
            {cancelling ? copy.cancelling : copy.cancelConfirm}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar != null}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

    </>
  )
}

export default AssessmentAiRunWorkbench
