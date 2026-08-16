'use client'

/**
 * TASK-1737 — Application 360 · tab Expediente (consumer UI del Evaluation Dossier de
 * TASK-1735). Timeline de notas persistidas intercaladas con eventos sintéticos de etapa,
 * composer de nota manual y el flujo gobernado propose → editar → confirmar/rechazar.
 *
 * Cliente DELGADO por contrato: cero lógica de negocio acá. El gate anti-anclaje vive en
 * el reader server-side (`listHiringApplicationNotes` viewer-aware + GET /dossier); este
 * componente solo renderiza el estado honesto (`blind-locked`) con la salida al scorecard.
 * Append-only visible: no hay editar/borrar notas — corrección = nota nueva.
 * Sin optimistic UI en writes (DDL-6): lo que se ve es lo que el server persistió.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { motionCss } from '@/components/greenhouse/motion/core/tokens'
import { CanonicalApiError, parseApiErrorPayload, type ParsedApiError } from '@/lib/api/parse-error-response'
import type { HiringDeskCopy } from '@/lib/copy'
import { formatDateTime } from '@/lib/format'
import {
  HIRING_APPLICATION_NOTE_BODY_MAX,
  HIRING_APPLICATION_NOTE_KINDS,
  type HiringApplicationNote,
  type HiringApplicationNoteKind
} from '@/types/hiring-application-notes'
import type { HiringDecisionHistoryEntry } from '@/types/hiring'
import type { DossierProposal, EvaluationDossierDraft } from '@/types/hiring-dossier-ai'

import { scoreTone } from './hiring-client'

// ── Contratos locales ──

interface DossierGetPayload {
  aiEnabled: boolean
  proposal: DossierProposal | null
  proposalBodyMd?: string | null
  proposalStale?: boolean | null
  viewerBlindUntilScorecardSubmitted?: boolean
  hiddenNoteCount?: number
}

interface NotesGetPayload {
  notes: HiringApplicationNote[]
  hiddenNoteCount: number
  viewerBlindUntilScorecardSubmitted: boolean
}

type ExpedienteCopy = HiringDeskCopy['application']['expediente']

export interface ApplicationDossierPanelProps {
  copy: HiringDeskCopy
  applicationId: string
  /** Etiqueta de la etapa actual (copy.pipeline.stages resuelto por el host). */
  stageLabel: string
  appliedAt: string
  stageUpdatedAt: string
  decisionHistory: HiringDecisionHistoryEntry[]
  /** Notas server-fed (viewer-aware). `null` = el reader FALLÓ (≠ expediente vacío). */
  initialNotes: HiringApplicationNote[] | null
  initialHiddenNoteCount: number
  initialViewerBlind: boolean
  canAnnotate: boolean
  /** user_id → display name; fallback honesto al id cuando no resuelve. */
  noteAuthorNames: Record<string, string>
  onGoToScorecard: () => void
  onToast: (message: string) => void
}

const NOTE_COLLAPSE_THRESHOLD = 600

const formatCopy = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)

const kindChipTone = (kind: HiringApplicationNoteKind): 'info' | 'primary' | 'warning' | 'default' => {
  if (kind === 'cv_analysis') return 'info'
  if (kind === 'assessment_review') return 'primary'
  if (kind === 'interview_note') return 'warning'

  return 'default'
}

const kindLabel = (expediente: ExpedienteCopy, kind: HiringApplicationNoteKind): string => {
  if (kind === 'cv_analysis') return expediente.kindCvAnalysis
  if (kind === 'assessment_review') return expediente.kindAssessmentReview
  if (kind === 'interview_note') return expediente.kindInterviewNote

  return expediente.kindGeneral
}

const parseUnknownError = (error: unknown, fallback: string): ParsedApiError => {
  if (error instanceof CanonicalApiError) {
    return { message: error.message, code: error.code, actionable: error.actionable }
  }

  return parseApiErrorPayload(null, fallback)
}

const fetchJsonOrThrow = async <T,>(input: string, fallbackMessage: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  })

  const payload = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    throw new CanonicalApiError(parseApiErrorPayload(payload, fallbackMessage), response.status)
  }

  return payload as T
}

/** Render markdown sanitizado (react-markdown SIN rehype-raw: el HTML crudo no se interpreta). */
const NoteMarkdown = ({ text }: { text: string }) => (
  <Box
    sx={{
      minWidth: 0,
      overflowWrap: 'anywhere',
      '& > :first-of-type': { mt: 0 },
      '& > :last-child': { mb: 0 },
      '& h1, & h2, & h3, & h4, & h5, & h6': theme => ({
        ...theme.typography.subtitle2,
        color: 'text.primary',
        mt: 3,
        mb: 1
      }),
      '& p': theme => ({ ...theme.typography.body2, color: 'text.primary', my: 1 }),
      '& ul, & ol': theme => ({ ...theme.typography.body2, color: 'text.primary', my: 1, ps: 5 }),
      '& li': { my: 0.5 },
      '& a': { color: 'primary.main' },
      '& blockquote': {
        my: 1,
        ms: 0,
        ps: 3,
        borderInlineStart: '3px solid',
        borderColor: 'divider',
        color: 'text.secondary'
      },
      '& code': theme => ({
        ...theme.typography.caption,
        bgcolor: 'action.hover',
        px: 0.5,
        py: 0.125,
        borderRadius: `${theme.shape.customBorderRadius.xs}px`
      })
    }}
  >
    <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
  </Box>
)

// ── Render estructurado del borrador (TASK-1737) ──
// El `proposedJson` ya trae secciones tipadas: se renderiza como composición diseñada
// (lead + claims con evidencia citada + focos numerados + disclosure muted), no como
// prosa markdown. La nota confirmada con edición humana conserva el fallback markdown.

const SCORE_IN_TEXT_SOURCE =
  '\\b(?:score(?:\\s+efectivo)?|puntaje|promedio|nota)\\s*(?:de\\s+|:\\s*)?(\\d{1,3}(?:[.,]\\d{1,2})?)\\b|\\b(\\d{1,3}(?:[.,]\\d{1,2})?)(?=\\s*(?:\\/\\s*100\\b|\\s+(?:promedio|puntos|pts)\\b))'

const parseScoreValue = (raw: string): number | null => {
  const parsed = Number(raw.replace(',', '.'))

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null
}

/**
 * Resalta menciones de score (0–100 ancladas a vocabulario de puntaje) como chips
 * tonales del semáforo canónico de hiring. Conservador a propósito: un número sin
 * vocabulario de score alrededor se queda como texto.
 */
const renderTextWithScoreChips = (text: string): ReactNode => {
  const regex = new RegExp(SCORE_IN_TEXT_SOURCE, 'gi')
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(text)) !== null) {
    const numberText = match[1] ?? match[2] ?? ''
    const value = parseScoreValue(numberText)

    if (numberText.length === 0 || value === null) continue

    const numberStart = match.index + match[0].lastIndexOf(numberText)

    nodes.push(text.slice(cursor, numberStart))
    nodes.push(
      <GreenhouseChip
        key={`score-${numberStart}`}
        size='small'
        kind='metric'
        variant='label'
        tone={scoreTone(value)}
        label={numberText}
        sx={{ mx: 0.5, verticalAlign: 'baseline' }}
      />
    )
    cursor = numberStart + numberText.length
  }

  if (nodes.length === 0) return text

  nodes.push(text.slice(cursor))

  return nodes
}

const DossierSectionLabel = ({ icon, iconColor, title }: { icon: string; iconColor: string; title: string }) => (
  <Stack direction='row' spacing={1.5} alignItems='center'>
    <Box component='i' aria-hidden='true' className={icon} sx={{ color: iconColor, fontSize: 18 }} />
    <Typography variant='overline' component='h6' color='text.secondary'>
      {title}
    </Typography>
  </Stack>
)

interface DossierClaim {
  afirmacion: string
  evidencia: string
}

/** Coherencias/gaps: afirmación como texto principal + evidencia como bloque citado. */
const DossierClaimList = ({
  title,
  icon,
  tone,
  claims,
  expediente
}: {
  title: string
  icon: string
  tone: 'success' | 'warning'
  claims: DossierClaim[]
  expediente: ExpedienteCopy
}) => {
  if (claims.length === 0) return null

  return (
    <Box component='section'>
      <DossierSectionLabel icon={icon} iconColor={`${tone}.main`} title={title} />
      <Stack component='ul' role='list' spacing={3} sx={{ m: 0, mt: 2, p: 0, listStyle: 'none' }}>
        {claims.map(claim => (
          <Stack component='li' key={claim.afirmacion} spacing={1.5} sx={{ minWidth: 0 }}>
            <Typography variant='body2' color='text.primary' sx={{ fontWeight: 500, overflowWrap: 'anywhere', maxWidth: '72ch' }}>
              {claim.afirmacion}
            </Typography>
            <Box
              sx={theme => ({
                ps: 3,
                pe: 3,
                py: 2,
                maxWidth: '72ch',
                bgcolor: 'action.hover',
                borderInlineStart: '2px solid',
                borderColor: `${tone}.main`,
                borderStartEndRadius: `${theme.shape.customBorderRadius.sm}px`,
                borderEndEndRadius: `${theme.shape.customBorderRadius.sm}px`
              })}
            >
              <Typography variant='overline' component='p' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                {expediente.evidenceTitle}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                {renderTextWithScoreChips(claim.evidencia)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

/** Focos de entrevista: lista accionable con numeración visible. */
const DossierFocusList = ({ title, items }: { title: string; items: string[] }) => {
  if (items.length === 0) return null

  return (
    <Box component='section'>
      <DossierSectionLabel icon='tabler-target-arrow' iconColor='primary.main' title={title} />
      <Stack component='ol' role='list' spacing={2} sx={{ m: 0, mt: 2, p: 0, listStyle: 'none' }}>
        {items.map((item, index) => (
          <Stack component='li' key={item} direction='row' spacing={2} alignItems='flex-start' sx={{ minWidth: 0 }}>
            <Box
              sx={{
                inlineSize: 24,
                blockSize: 24,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.lightOpacity'
              }}
            >
              <Typography variant='caption' color='primary.main' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {index + 1}
              </Typography>
            </Box>
            <Typography variant='body2' sx={{ pt: 0.5, overflowWrap: 'anywhere', maxWidth: '72ch' }}>
              {item}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

/** No verificable: disclosure colapsable de tono muted (nativo `<details>`, foco incluido). */
const DossierUnverifiable = ({ items, expediente }: { items: string[]; expediente: ExpedienteCopy }) => {
  if (items.length === 0) return null

  return (
    <Box
      component='details'
      sx={theme => ({
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        '& > summary': {
          listStyle: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1.5),
          padding: theme.spacing(2, 3),
          '&::-webkit-details-marker': { display: 'none' },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
            borderRadius: `${theme.shape.customBorderRadius.md}px`
          }
        },
        '& .expediente-unverifiable-chevron': {
          marginInlineStart: 'auto',
          transition: `transform ${motionCss.duration.standard} ${motionCss.ease.standard}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        },
        '&[open] .expediente-unverifiable-chevron': { transform: 'rotate(180deg)' }
      })}
    >
      <Box component='summary'>
        <Box component='i' aria-hidden='true' className='tabler-eye-off' sx={{ color: 'text.secondary', fontSize: 18 }} />
        <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 500 }}>
          {formatCopy(expediente.unverifiableSummary, { count: items.length })}
        </Typography>
        <Box
          component='i'
          aria-hidden='true'
          className='tabler-chevron-down expediente-unverifiable-chevron'
          sx={{ color: 'text.secondary', fontSize: 18 }}
        />
      </Box>
      <Stack component='ul' spacing={1} sx={{ m: 0, ps: 9, pe: 3, pb: 3, pt: 0 }}>
        {items.map(item => (
          <Typography key={item} component='li' variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere', maxWidth: '72ch' }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

/** Composición completa del borrador estructurado (proposal vigente y nota confirmada sin editar). */
const DossierStructuredContent = ({ draft, expediente }: { draft: EvaluationDossierDraft; expediente: ExpedienteCopy }) => (
  <Stack spacing={5} sx={{ minWidth: 0 }}>
    <Box component='section'>
      <DossierSectionLabel icon='tabler-file-description' iconColor='text.secondary' title={expediente.sectionSummary} />
      {/* Lead destacado: body1 (16px) sobre el body2 del resto — jerarquía por tamaño, no por decoración. */}
      <Typography variant='body1' color='text.primary' sx={{ mt: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: '72ch' }}>
        {draft.resumenEjecutivo}
      </Typography>
    </Box>
    <DossierClaimList
      title={expediente.sectionCoherences}
      icon='tabler-circle-check'
      tone='success'
      claims={draft.coherencias}
      expediente={expediente}
    />
    <DossierClaimList title={expediente.sectionGaps} icon='tabler-alert-triangle' tone='warning' claims={draft.gaps} expediente={expediente} />
    <DossierFocusList title={expediente.sectionInterviewFocus} items={draft.focosEntrevista} />
    <DossierUnverifiable items={draft.noVerificable} expediente={expediente} />
  </Stack>
)

// ── Timeline entries (notas + eventos sintéticos) ──

interface TimelineNoteEntry {
  type: 'note'
  at: string
  note: HiringApplicationNote
}

interface TimelineEventEntry {
  type: 'event'
  at: string
  id: string
  label: string
}

type TimelineEntry = TimelineNoteEntry | TimelineEventEntry

const ApplicationDossierPanel = ({
  copy,
  applicationId,
  stageLabel,
  appliedAt,
  stageUpdatedAt,
  decisionHistory,
  initialNotes,
  initialHiddenNoteCount,
  initialViewerBlind,
  canAnnotate,
  noteAuthorNames,
  onGoToScorecard,
  onToast
}: ApplicationDossierPanelProps) => {
  const expediente = copy.application.expediente

  // ── Estado de notas (server-fed + refetch client) ──
  const [notes, setNotes] = useState<HiringApplicationNote[] | null>(initialNotes)
  const [hiddenNoteCount, setHiddenNoteCount] = useState(initialHiddenNoteCount)
  const [viewerBlind, setViewerBlind] = useState(initialViewerBlind)

  const [notesError, setNotesError] = useState<ParsedApiError | null>(
    initialNotes === null ? { message: '', code: null, actionable: true } : null
  )

  const [notesRetrying, setNotesRetrying] = useState(false)

  // ── Estado del carril dossier ──
  const [dossierLoading, setDossierLoading] = useState(true)
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [proposal, setProposal] = useState<DossierProposal | null>(null)
  const [proposalBodyMd, setProposalBodyMd] = useState<string | null>(null)
  const [proposalStale, setProposalStale] = useState<boolean | null>(null)
  const [dossierError, setDossierError] = useState<ParsedApiError | null>(null)
  const [proposing, setProposing] = useState(false)
  const [proposeAlert, setProposeAlert] = useState<{ kind: 'cv-not-ready' } | { kind: 'error'; error: ParsedApiError } | null>(null)

  // ── Edición / decisión ──
  const [editing, setEditing] = useState(false)
  const [editedBody, setEditedBody] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [deciding, setDeciding] = useState<'confirm' | 'reject' | null>(null)

  // ── Composer ──
  const [composerKind, setComposerKind] = useState<HiringApplicationNoteKind>('general')
  const [composerBody, setComposerBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [composerError, setComposerError] = useState<ParsedApiError | null>(null)

  // ── Colapsos + anuncios accesibles ──
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [statusMessage, setStatusMessage] = useState('')

  const editTriggerRef = useRef<HTMLButtonElement | null>(null)

  const notesEndpoint = `/api/hiring/applications/${encodeURIComponent(applicationId)}/notes`
  const dossierEndpoint = `/api/hiring/applications/${encodeURIComponent(applicationId)}/dossier`

  const refreshDossier = useCallback(async () => {
    try {
      const payload = await fetchJsonOrThrow<DossierGetPayload>(dossierEndpoint, expediente.loadError)

      setAiEnabled(payload.aiEnabled)
      setProposal(payload.proposal ?? null)
      setProposalBodyMd(payload.proposalBodyMd ?? null)
      setProposalStale(payload.proposalStale ?? null)

      if (payload.viewerBlindUntilScorecardSubmitted !== undefined) {
        setViewerBlind(payload.viewerBlindUntilScorecardSubmitted)
      }

      if (payload.hiddenNoteCount !== undefined) {
        setHiddenNoteCount(payload.hiddenNoteCount)
      }

      setDossierError(null)
    } catch (error) {
      setDossierError(parseUnknownError(error, expediente.loadError))
    } finally {
      setDossierLoading(false)
    }
  }, [dossierEndpoint, expediente.loadError])

  useEffect(() => {
    void refreshDossier()
  }, [refreshDossier])

  const refreshNotes = useCallback(async () => {
    setNotesRetrying(true)

    try {
      const payload = await fetchJsonOrThrow<NotesGetPayload>(notesEndpoint, expediente.loadError)

      setNotes(payload.notes)
      setHiddenNoteCount(payload.hiddenNoteCount)
      setViewerBlind(payload.viewerBlindUntilScorecardSubmitted)
      setNotesError(null)
    } catch (error) {
      setNotesError(parseUnknownError(error, expediente.loadError))
    } finally {
      setNotesRetrying(false)
    }
  }, [notesEndpoint, expediente.loadError])

  // ── Acciones del carril dossier ──

  const proposeDossier = async () => {
    setProposing(true)
    setProposeAlert(null)
    setStatusMessage(expediente.generating)

    try {
      await fetchJsonOrThrow<{ proposal: DossierProposal }>(dossierEndpoint, expediente.loadError, {
        method: 'POST',
        body: JSON.stringify({ action: 'propose' })
      })

      await refreshDossier()
      setStatusMessage(expediente.proposalTitle)
    } catch (error) {
      const parsed = parseUnknownError(error, expediente.loadError)

      if (parsed.code === 'hiring_dossier_cv_not_ready') {
        setProposeAlert({ kind: 'cv-not-ready' })
      } else if (parsed.code === 'hiring_dossier_ai_disabled') {
        // El flag cambió entre el GET y el POST: reflejar el estado honesto.
        setAiEnabled(false)
        setProposeAlert(null)
      } else {
        setProposeAlert({ kind: 'error', error: parsed })
      }

      setStatusMessage(parsed.message)
    } finally {
      setProposing(false)
    }
  }

  const decideDossier = async (decision: 'confirm' | 'reject') => {
    if (!proposal) return

    setDeciding(decision)

    try {
      await fetchJsonOrThrow<{ proposal: DossierProposal }>(dossierEndpoint, expediente.loadError, {
        method: 'POST',
        body: JSON.stringify({
          action: decision,
          proposalId: proposal.proposalId,
          ...(decision === 'confirm' && editing && editedBody.trim() ? { editedBodyMd: editedBody } : {}),
          ...(decision === 'reject' && rejectReason.trim() ? { decisionNote: rejectReason.trim() } : {})
        })
      })

      setEditing(false)
      setRejectOpen(false)
      setRejectReason('')
      await Promise.all([refreshDossier(), refreshNotes()])
      onToast(decision === 'confirm' ? expediente.confirmed : expediente.rejected)
      setStatusMessage(decision === 'confirm' ? expediente.confirmed : expediente.rejected)
    } catch (error) {
      const parsed = parseUnknownError(error, expediente.loadError)

      if (parsed.code === 'hiring_dossier_invalid_transition') {
        // Otro operador decidió primero (terminal-once): re-fetch + aviso informativo.
        setEditing(false)
        setRejectOpen(false)
        await Promise.all([refreshDossier(), refreshNotes()])
        onToast(expediente.decisionApplied)
      } else {
        setProposeAlert({ kind: 'error', error: parsed })
      }

      setStatusMessage(parsed.message)
    } finally {
      setDeciding(null)
    }
  }

  // ── Composer ──

  const composerLength = composerBody.length
  const composerBodyValid = composerBody.trim().length > 0 && composerLength <= HIRING_APPLICATION_NOTE_BODY_MAX

  const submitNote = async () => {
    if (!composerBodyValid || savingNote) return

    setSavingNote(true)
    setComposerError(null)

    try {
      await fetchJsonOrThrow<{ note: HiringApplicationNote }>(notesEndpoint, expediente.loadError, {
        method: 'POST',
        body: JSON.stringify({ kind: composerKind, bodyMd: composerBody })
      })

      // Sin optimistic UI: la nota aparece cuando el server la persistió (refetch).
      setComposerBody('')
      await refreshNotes()
      onToast(expediente.noteAdded)
      setStatusMessage(expediente.noteAdded)
    } catch (error) {
      // El texto escrito se CONSERVA en el estado local para reintentar.
      setComposerError(parseUnknownError(error, expediente.loadError))
    } finally {
      setSavingNote(false)
    }
  }

  // ── Timeline (notas + eventos sintéticos, más reciente primero) ──

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = []

    for (const note of notes ?? []) {
      entries.push({ type: 'note', at: note.createdAt, note })
    }

    entries.push({ type: 'event', at: appliedAt, id: 'event-received', label: expediente.receivedEvent })
    entries.push({
      type: 'event',
      at: stageUpdatedAt,
      id: 'event-stage',
      label: formatCopy(expediente.stageEvent, { stage: stageLabel })
    })

    for (const decision of decisionHistory) {
      entries.push({
        type: 'event',
        at: decision.decidedAt,
        id: `event-decision-${decision.decisionId}`,
        label: formatCopy(expediente.decisionEvent, { decision: decision.decision })
      })
    }

    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [notes, appliedAt, stageUpdatedAt, stageLabel, decisionHistory, expediente])

  const authorName = (userId: string) => noteAuthorNames[userId] ?? userId

  const draft = useMemo<EvaluationDossierDraft | null>(() => {
    if (proposal?.status !== 'proposed') return null

    const candidate = proposal.proposed.dossier as EvaluationDossierDraft | undefined

    return candidate && typeof candidate.resumenEjecutivo === 'string' ? candidate : null
  }, [proposal])

  /**
   * Borrador estructurado para una nota confirmada (TASK-1737): solo si su context_json
   * referencia la propuesta cargada con `proposedJson` válido Y el humano confirmó SIN
   * editar (bodyMd ≡ render canónico del server). Lo editado siempre gana como fuente →
   * fallback markdown.
   */
  const structuredNoteDraft = useCallback(
    (note: HiringApplicationNote): EvaluationDossierDraft | null => {
      if (note.source !== 'agent' || !proposal) return null
      if (note.contextJson.dossierProposalId !== proposal.proposalId) return null

      const candidate = proposal.proposed.dossier as EvaluationDossierDraft | undefined

      if (!candidate || typeof candidate.resumenEjecutivo !== 'string') return null
      if (!proposalBodyMd || note.bodyMd !== proposalBodyMd) return null

      return candidate
    },
    [proposal, proposalBodyMd]
  )

  const showProposalPanel = !viewerBlind && draft !== null
  const showGenerateCta = canAnnotate && !viewerBlind && aiEnabled === true && !showProposalPanel

  // ── Render de una nota ──

  const renderNote = (note: HiringApplicationNote) => {
    const isAgent = note.source === 'agent'
    const structuredDraft = isAgent ? structuredNoteDraft(note) : null
    const isLong = structuredDraft === null && note.bodyMd.length > NOTE_COLLAPSE_THRESHOLD
    const expanded = expandedNotes[note.noteId] ?? false
    const collapsed = isLong && !expanded
    const bodyRegionId = `expediente-note-body-${note.noteId}`
    const author = authorName(note.authorUserId)
    const noteDate = formatDateTime(note.createdAt, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')
    const model = typeof note.contextJson.model === 'string' ? note.contextJson.model : null
    const digest = typeof note.contextJson.inputDigest === 'string' ? note.contextJson.inputDigest.slice(0, 8) : null

    return (
      <Paper
        variant='outlined'
        aria-label={formatCopy(expediente.noteAriaLabel, {
          kind: kindLabel(expediente, note.kind),
          author,
          date: noteDate
        })}
        sx={theme => ({ p: 3, minWidth: 0, borderRadius: `${theme.shape.customBorderRadius.md}px` })}
      >
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Stack direction='row' spacing={1.25} useFlexGap flexWrap='wrap' alignItems='center'>
              <GreenhouseChip
                size='small'
                kind='status'
                variant='label'
                tone={kindChipTone(note.kind)}
                label={kindLabel(expediente, note.kind)}
              />
              {isAgent ? (
                <GreenhouseChip
                  size='small'
                  kind='status'
                  variant='label'
                  tone='secondary'
                  iconClassName='tabler-sparkles'
                  label={expediente.agentBadge}
                />
              ) : null}
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {author} · {noteDate}
            </Typography>
          </Stack>

          <Box id={bodyRegionId}>
            {structuredDraft ? (
              <DossierStructuredContent draft={structuredDraft} expediente={expediente} />
            ) : collapsed ? (
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {`${note.bodyMd.slice(0, NOTE_COLLAPSE_THRESHOLD).trimEnd()}…`}
              </Typography>
            ) : (
              <NoteMarkdown text={note.bodyMd} />
            )}
          </Box>

          {isLong ? (
            <Button
              size='small'
              aria-expanded={expanded}
              aria-controls={bodyRegionId}
              onClick={() => setExpandedNotes(current => ({ ...current, [note.noteId]: !expanded }))}
              sx={{ alignSelf: 'flex-start' }}
            >
              {expanded ? expediente.showLess : expediente.showMore}
            </Button>
          ) : null}

          {isAgent && model ? (
            <Typography variant='caption' color='text.secondary'>
              <i aria-hidden='true' className='tabler-info-circle' style={{ verticalAlign: 'text-bottom' }} />{' '}
              {formatCopy(expediente.agentProvenance, { model, name: author, digest: digest ?? '—' })}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    )
  }

  // ── Render del panel de propuesta (REGION 1) ──

  const proposalPanel = showProposalPanel && draft && proposal ? (
    <Paper
      variant='outlined'
      data-capture='hiring-expediente-proposal'
      sx={theme => ({
        p: { xs: 3, md: 4 },
        minWidth: 0,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        borderInlineStart: `3px solid ${theme.palette.primary.main}`
      })}
    >
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Stack direction='row' spacing={1.25} useFlexGap flexWrap='wrap' alignItems='center'>
            <GreenhouseChip
              size='small'
              kind='status'
              variant='label'
              tone='secondary'
              iconClassName='tabler-sparkles'
              label={expediente.agentBadge.split(' · ')[0] ?? 'IA'}
            />
            <Typography fontWeight={700}>{expediente.proposalTitle}</Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {formatCopy(expediente.proposalProvenance, {
              model: proposal.model,
              promptVersion: proposal.promptVersion,
              date: formatDateTime(proposal.createdAt, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')
            })}
          </Typography>
        </Stack>

        {proposalStale === true ? (
          <Alert severity='warning' icon={<i className='tabler-clock-exclamation' />}>
            {expediente.staleProposal}
          </Alert>
        ) : null}

        {editing ? (
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={10}
              label={expediente.proposalTitle}
              value={editedBody}
              onChange={event => setEditedBody(event.target.value)}
              helperText={formatCopy(expediente.composerCount, { count: editedBody.length })}
              error={editedBody.length > HIRING_APPLICATION_NOTE_BODY_MAX}
              slotProps={{ htmlInput: { maxLength: HIRING_APPLICATION_NOTE_BODY_MAX } }}
            />
            <Typography variant='caption' color='text.secondary'>{expediente.editCaption}</Typography>
          </Stack>
        ) : (
          <DossierStructuredContent draft={draft} expediente={expediente} />
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
          {editing ? (
            <Button
              disabled={deciding !== null}
              onClick={() => {
                setEditing(false)
                setEditedBody('')
                editTriggerRef.current?.focus()
              }}
            >
              {expediente.cancelEdit}
            </Button>
          ) : (
            <>
              <Button
                ref={editTriggerRef}
                variant='outlined'
                disabled={deciding !== null}
                onClick={() => {
                  setEditedBody(proposalBodyMd ?? '')
                  setEditing(true)
                }}
              >
                {expediente.edit}
              </Button>
              <Button color='error' disabled={deciding !== null} onClick={() => setRejectOpen(true)}>
                {expediente.reject}
              </Button>
            </>
          )}
          <GreenhouseButton
            kind='primaryAction'
            aria-busy={deciding === 'confirm'}
            leadingIcon={deciding === 'confirm' ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
            leadingIconClassName={deciding === 'confirm' ? undefined : 'tabler-check'}
            disabled={deciding !== null || (editing && (!editedBody.trim() || editedBody.length > HIRING_APPLICATION_NOTE_BODY_MAX))}
            onClick={() => void decideDossier('confirm')}
          >
            {deciding === 'confirm' ? expediente.confirming : expediente.confirm}
          </GreenhouseButton>
        </Stack>
      </Stack>
    </Paper>
  ) : null

  // ── Composer (REGION 2) ──

  const composer = canAnnotate ? (
    <Paper
      variant='outlined'
      data-capture='hiring-expediente-composer'
      sx={theme => ({ p: { xs: 3, md: 4 }, minWidth: 0, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}
    >
      <Stack spacing={2.5}>
        {/* Visible solo con los toggles (el Select mobile trae su propio label).
            text.primary explícito: subtitle2 hereda un gris que no pasa 4.5:1 a 13px (axe). */}
        <Typography
          id='expediente-composer-kind-label'
          variant='subtitle2'
          component='span'
          color='text.primary'
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {expediente.composerKindLabel}
        </Typography>

        {/* Desktop: toggles; mobile: Select (los toggles no caben a 390px). */}
        <ToggleButtonGroup
          exclusive
          size='small'
          value={composerKind}
          aria-labelledby='expediente-composer-kind-label'
          onChange={(_, next: HiringApplicationNoteKind | null) => {
            if (next) setComposerKind(next)
          }}
          sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap' }}
        >
          {HIRING_APPLICATION_NOTE_KINDS.map(kind => (
            <ToggleButton key={kind} value={kind}>
              {kindLabel(expediente, kind)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          select
          size='small'
          label={expediente.composerKindLabel}
          value={composerKind}
          onChange={event => setComposerKind(event.target.value as HiringApplicationNoteKind)}
          sx={{ display: { xs: 'flex', sm: 'none' } }}
        >
          {HIRING_APPLICATION_NOTE_KINDS.map(kind => (
            <MenuItem key={kind} value={kind}>
              {kindLabel(expediente, kind)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          id='expediente-composer-body'
          fullWidth
          multiline
          minRows={4}
          placeholder={expediente.composerPlaceholder}
          value={composerBody}
          onChange={event => setComposerBody(event.target.value)}
          error={composerLength > HIRING_APPLICATION_NOTE_BODY_MAX}
          slotProps={{
            htmlInput: {
              'aria-label': expediente.composerPlaceholder,
              'aria-describedby': 'expediente-composer-count'
            }
          }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent='space-between'>
          <Typography
            id='expediente-composer-count'
            variant='caption'
            color={composerLength > HIRING_APPLICATION_NOTE_BODY_MAX ? 'error.main' : 'text.secondary'}
          >
            {formatCopy(expediente.composerCount, { count: composerLength })}
          </Typography>
          <GreenhouseButton
            kind='secondaryAction'
            aria-busy={savingNote}
            leadingIcon={savingNote ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
            disabled={!composerBodyValid || savingNote}
            onClick={() => void submitNote()}
            sx={{ color: 'text.primary' }}
          >
            {savingNote ? expediente.addingNote : expediente.addNote}
          </GreenhouseButton>
        </Stack>
        {composerError ? (
          <Alert severity='error' role='alert' action={
            composerError.actionable ? (
              <Button color='inherit' size='small' onClick={() => void submitNote()}>{copy.common.retry}</Button>
            ) : undefined
          }>
            {composerError.message}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  ) : null

  // ── Timeline (REGION 3) ──

  const timelinePanel = (
    <Box data-capture='hiring-expediente-timeline'>
      {notes !== null && notes.length === 0 ? (
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          {canAnnotate ? expediente.empty : expediente.emptyReadOnly}
        </Typography>
      ) : null}
      <Stack component='ol' role='list' spacing={0} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {timeline.map((entry, index) => (
          <Stack
            component='li'
            key={entry.type === 'note' ? entry.note.noteId : entry.id}
            direction='row'
            spacing={3}
            sx={{ minWidth: 0 }}
          >
            <Stack alignItems='center' aria-hidden='true' sx={{ pt: entry.type === 'note' ? 3 : 1 }}>
              <Box
                sx={{
                  inlineSize: 8,
                  blockSize: 8,
                  borderRadius: '50%',
                  bgcolor: entry.type === 'note' ? 'primary.main' : 'divider',
                  flexShrink: 0
                }}
              />
              {index < timeline.length - 1 ? <Box sx={{ inlineSize: '1px', flex: 1, minBlockSize: 24, bgcolor: 'divider' }} /> : null}
            </Stack>
            <Box sx={{ flex: 1, minWidth: 0, pb: 4 }}>
              {entry.type === 'note' ? (
                renderNote(entry.note)
              ) : (
                <Typography variant='body2' color='text.secondary' sx={{ pt: 0.25 }}>
                  {entry.label} · {formatDateTime(entry.at, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')}
                </Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  )

  return (
    <Stack spacing={4} data-capture='hiring-expediente-tab' sx={{ minWidth: 0 }}>
      {/* Anuncios accesibles del carril propose/confirm (aria-live). */}
      <Box role='status' aria-live='polite' sx={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {statusMessage}
      </Box>

      {/* REGION 0 — header del tab */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <Box>
          {/* h4 (page-title 20px): el gate premium exige ratio heading/body >= 1.35 dentro del tab. */}
          <Typography variant='h4' component='h2'>{expediente.title}</Typography>
          <Typography variant='body2' color='text.secondary'>{expediente.subtitle}</Typography>
          {aiEnabled === false ? (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
              {expediente.aiDisabled}
            </Typography>
          ) : null}
        </Box>
        {showGenerateCta ? (
          <GreenhouseButton
            kind='primaryAction'
            aria-busy={proposing}
            leadingIcon={proposing ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
            leadingIconClassName={proposing ? undefined : 'tabler-sparkles'}
            disabled={proposing}
            onClick={() => void proposeDossier()}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, flexShrink: 0 }}
          >
            {proposing ? expediente.generating : expediente.generate}
          </GreenhouseButton>
        ) : null}
      </Stack>

      {/* REGION LOCK — anti-anclaje server-enforced: el contenido oculto NO está en el DOM. */}
      {viewerBlind ? (
        <Alert
          severity='info'
          role='status'
          icon={<i className='tabler-lock' />}
          data-capture='hiring-expediente-blind-lock'
          sx={theme => ({ border: `1px solid ${theme.palette.info.lightOpacity}`, color: 'text.primary' })}
        >
          <Stack spacing={1.5} alignItems='flex-start'>
            <Box>
              <Typography fontWeight={700}>{expediente.blindTitle}</Typography>
              <Typography variant='body2' color='text.secondary'>{expediente.blindBody}</Typography>
              {hiddenNoteCount > 0 ? (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {formatCopy(expediente.blindCount, { count: hiddenNoteCount })}
                </Typography>
              ) : null}
            </Box>
            <Button variant='outlined' size='small' onClick={onGoToScorecard} startIcon={<i className='tabler-checkup-list' />}>
              {expediente.blindCta}
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {/* Estados del carril propose (cv-not-ready / provider error). */}
      {proposeAlert?.kind === 'cv-not-ready' ? (
        <Alert severity='info' icon={<i className='tabler-file-search' />}>{expediente.cvNotReady}</Alert>
      ) : null}
      {proposeAlert?.kind === 'error' ? (
        <Alert
          severity='error'
          action={
            proposeAlert.error.actionable ? (
              <Button color='inherit' size='small' onClick={() => void proposeDossier()}>{copy.common.retry}</Button>
            ) : undefined
          }
        >
          {proposeAlert.error.message}
        </Alert>
      ) : null}
      {dossierError && !viewerBlind ? (
        <Alert
          severity='error'
          action={
            dossierError.actionable ? (
              <Button color='inherit' size='small' onClick={() => { setDossierLoading(true); void refreshDossier() }}>
                {copy.common.retry}
              </Button>
            ) : undefined
          }
        >
          {dossierError.message}
        </Alert>
      ) : null}

      {/* REGION 1 — borrador del análisis (solo con proposal `proposed` vigente y sin lock). */}
      {dossierLoading && !viewerBlind ? (
        <Skeleton variant='rounded' height={96} sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })} />
      ) : (
        proposalPanel
      )}
      {proposing ? (
        <Skeleton variant='rounded' height={180} sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })} />
      ) : null}

      {/* REGION 2 — composer manual (append-only; sin capability no se dibuja). */}
      {composer}

      {/* Error del reader de notas: NUNCA "sin notas" cuando el reader falló. */}
      {notesError ? (
        <Alert
          severity='error'
          action={
            <Button
              color='inherit'
              size='small'
              disabled={notesRetrying}
              onClick={() => void refreshNotes()}
            >
              {notesRetrying ? copy.common.loading : copy.common.retry}
            </Button>
          }
        >
          {notesError.message || expediente.loadError}
        </Alert>
      ) : (
        timelinePanel
      )}

      {/* Dialog de rechazo — decisión terminal con nota opcional. */}
      <Dialog
        open={rejectOpen}
        onClose={() => deciding === null && setRejectOpen(false)}
        fullWidth
        maxWidth='sm'
        PaperProps={{
          sx: (theme: Theme) => ({
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none' }
          })
        }}
      >
        <DialogTitle>{expediente.rejectDialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>{expediente.rejectDialogBody}</Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              label={expediente.rejectReasonLabel}
              value={rejectReason}
              onChange={event => setRejectReason(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} disabled={deciding !== null}>
            {copy.common.cancel}
          </Button>
          <GreenhouseButton
            tone='error'
            aria-busy={deciding === 'reject'}
            leadingIcon={deciding === 'reject' ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
            disabled={deciding !== null}
            onClick={() => void decideDossier('reject')}
          >
            {expediente.rejectConfirm}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default ApplicationDossierPanel
