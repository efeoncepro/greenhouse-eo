'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import {
  GreenhouseChip,
  GreenhouseNexaBrandMark,
  GreenhouseShinyBorder,
  GreenhouseSpectrumBeam,
  NexaAnswersCanvas,
  NexaComposerActionButton,
  NexaComposerInput,
  NexaMomentComposition,
  type NexaAnswersCanvasCopy,
  type NexaAnswersCanvasState,
  type NexaAnswersRenderPlan,
  type NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import { buildKnowledgeAnswerRenderPlan } from '@/lib/knowledge/nexa/knowledge-answer-render-plan'
import type { KnowledgeRetrievalPacket } from '@/lib/knowledge/search'

/**
 * Consumer REAL de la composición de Nexa Answers en `/knowledge` (GAP A) — el placement `composed` con
 * datos reales, en SINERGIA con Nexa Answer (no desconectado). Reusa el MISMO retrieval
 * (`buildKnowledgeAnswerRenderPlan` + la API de search) + el MISMO `NexaAnswersCanvas` + la misma
 * coreografía que la lente takeover; la diferencia es el *placement*: la respuesta lidera y los documentos
 * reales del host PERSISTEN abajo con citas ancladas al doc real.
 *
 * Patrón canónico AI-Overviews→AI-Mode: aquí es un OVERVIEW de una respuesta (answer-leading, single-turn);
 * el puente "Seguir con Nexa" entrega la pregunta a la lente conversacional dedicada (takeover, multi-turno).
 * La capacidad de composición es transversal (`NexaMomentComposition`); este componente es el consumer de
 * Knowledge (aporta los docs + el adapter), igual que `KnowledgeNexaCanvasLens` es el consumer del takeover.
 *
 * El next-step gobernado (action boundary) + la eligibility + las señales del Moment son del Moment Fabric
 * (joint con Codex) → se cablean cuando aterricen; acá NO se inventa una acción falsa (omitido honesto).
 */

/** Documento del corpus que el host muestra (subset real de `KnowledgeDocumentSummary`). Persiste vivo. */
export interface KnowledgeCompositionHostDoc {
  documentId: string
  title: string
  kindLabel: string
  kindTone: 'primary' | 'success' | 'info' | 'warning' | 'default'
  kindIcon: string
  metaLabel?: string
}

const SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.composition',
  domain: 'knowledge',
  placement: 'composed',
  density: 'embeddedStandard',
  dataReality: 'strong',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble'],
  allowedActions: ['read', 'explain', 'suggest_followup']
}

const COPY = {
  composerPlaceholder: 'Pregúntale a Nexa sobre el corpus…',
  composerSubmit: 'Preguntar',
  sourcesLabel: 'Fuentes ancladas',
  bridgeCta: 'Seguir con Nexa',
  hostTitle: 'Documentos del corpus',
  hostSubtitleHost: 'Explora el conocimiento publicado de tu equipo',
  hostSubtitleComposed: 'Relacionados con tu pregunta — siguen vivos bajo la respuesta',
  docsCountLabel: (n: number) => `${n} ${n === 1 ? 'documento' : 'documentos'}`
} as const

const CANVAS_COPY: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: '',
  idleBody: '',
  idlePlaceholder: COPY.composerPlaceholder,
  followUpPlaceholder: COPY.composerPlaceholder,
  submitLabel: COPY.composerSubmit,
  followUpLabel: COPY.composerSubmit,
  thinkingLabel: 'Nexa está buscando en el conocimiento.',
  streamingLabel: 'Nexa está preparando la respuesta.',
  readyLabel: 'Respuesta con respaldo en Knowledge',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: 'No pude completar la búsqueda en el corpus. Probá de nuevo o consultá la base directamente.',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: 'Intentá de nuevo o revisá la base de Knowledge directamente.'
}

const REASONING_LABELS = ['Entendiendo tu pregunta', 'Leyendo el conocimiento publicado', 'Redactando la respuesta con citas']

const buildReasoningSteps = (activeIndex: number) =>
  REASONING_LABELS.map((label, index) => ({
    id: `reasoning-${index}`,
    label,
    status: (index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending') as 'done' | 'active' | 'pending'
  }))

type Stage = 'idle' | 'thinking' | 'reasoning' | 'answered' | 'degraded' | 'error'

type ApiEnvelope<T> = { data?: T; error?: { message?: string } }

const panelSx = (theme: Theme) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: theme.palette.background.paper,
  minInlineSize: 0
})

const DocCard = ({ doc, condensed }: { doc: KnowledgeCompositionHostDoc; condensed: boolean }) => {
  const theme = useTheme()

  return (
    <Box
      data-nexa-anchor={doc.documentId}
      sx={{ ...panelSx(theme), p: condensed ? 3 : 4, display: 'flex', flexDirection: 'column', gap: condensed ? 1.5 : 2 }}
    >
      <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
        <GreenhouseChip size='small' variant='label' tone={doc.kindTone} iconClassName={doc.kindIcon} label={doc.kindLabel} />
        {doc.metaLabel ? (
          <Typography variant='caption' color='text.secondary'>
            {doc.metaLabel}
          </Typography>
        ) : null}
      </Stack>
      <Typography variant={condensed ? 'subtitle2' : 'h6'}>{doc.title}</Typography>
    </Box>
  )
}

interface KnowledgeNexaCompositionLensProps {
  /** Índice de anclaje: qué documentos son anclables (sus `data-nexa-anchor` viven en el host). */
  documents: KnowledgeCompositionHostDoc[]
  /**
   * Contenido PROPIO de la superficie a envolver in-place (el workbench real de docs). Cuando se pasa, la
   * composición ajusta ESA UI desde donde está (no navega). El consumer DEBE marcar sus ítems anclables con
   * `data-nexa-anchor="<documentId>"` para que las citas resalten el ítem real. Si se omite, cae al grid de
   * demo derivado de `documents` (fallback). Esta es la clave de adaptabilidad cross-consumer.
   */
  host?: ReactNode
  /** Puente a la lente takeover (multi-turno): entrega la pregunta para "Seguir con Nexa". */
  onContinueInNexaLens?: (query: string) => void
}

const KnowledgeNexaCompositionLens = ({ documents, host: hostSlot, onContinueInNexaLens }: KnowledgeNexaCompositionLensProps) => {
  const theme = useTheme()
  const [draft, setDraft] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [renderPlan, setRenderPlan] = useState<NexaAnswersRenderPlan | undefined>(undefined)
  const [packet, setPacket] = useState<KnowledgeRetrievalPacket | null>(null)
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null)
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<number[]>([])
  const hasText = draft.trim().length > 0
  const composed = stage !== 'idle'

  const clearTimers = () => {
    timersRef.current.forEach(id => window.clearTimeout(id))
    timersRef.current = []
  }

  useEffect(
    () => () => {
      clearTimers()
      abortRef.current?.abort()
    },
    []
  )

  const runQuery = async (raw: string) => {
    const trimmed = raw.trim()

    if (!trimmed) return

    clearTimers()
    abortRef.current?.abort()
    const controller = new AbortController()

    abortRef.current = controller

    setSubmittedQuestion(trimmed)
    setDraft('')
    setProofOpen(false)
    setStage('thinking')

    try {
      const response = await fetch(
        `/api/platform/app/knowledge/search?mode=agentic&limit=10&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      )

      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<KnowledgeRetrievalPacket>

      if (controller.signal.aborted) return

      if (!response.ok || !payload.data) {
        setStage('error')

        return
      }

      const plan = buildKnowledgeAnswerRenderPlan(payload.data, { turnId: 'composition' })

      const commit = () => {
        setRenderPlan(plan)
        setPacket(payload.data ?? null)
        // Ancla por defecto a la mejor fuente presente en el host.
        const topAnchor = payload.data?.chunks.find(chunk => documents.some(doc => doc.documentId === chunk.documentId))

        setActiveAnchorId(topAnchor?.documentId ?? null)
        setStage('answered')
      }

      clearTimers()
      setReasoningStepIndex(0)
      setStage('reasoning')
      timersRef.current.push(window.setTimeout(() => setReasoningStepIndex(1), 220))
      timersRef.current.push(window.setTimeout(() => setReasoningStepIndex(2), 440))
      timersRef.current.push(window.setTimeout(commit, 720))
    } catch {
      if (controller.signal.aborted) return
      setStage('degraded')
    }
  }

  const handleStop = () => {
    clearTimers()
    abortRef.current?.abort()
    setStage(renderPlan ? 'answered' : 'idle')
  }

  // Fuentes ancladas: chunks reales deduplicados por documento, solo los presentes en el host.
  const sourceAnchors = (() => {
    if (!packet) return [] as { label: string; title: string; anchorId: string }[]
    const seen = new Set<string>()
    const anchors: { label: string; title: string; anchorId: string }[] = []

    for (const chunk of packet.chunks) {
      if (seen.has(chunk.documentId)) continue
      if (!documents.some(doc => doc.documentId === chunk.documentId)) continue
      seen.add(chunk.documentId)
      anchors.push({ label: String(anchors.length + 1), title: chunk.title, anchorId: chunk.documentId })
    }

    return anchors
  })()

  const canvasState: NexaAnswersCanvasState =
    stage === 'error'
      ? 'error'
      : stage === 'degraded'
        ? 'degraded'
        : stage === 'thinking'
          ? 'thinking'
          : stage === 'reasoning'
            ? 'reasoning'
            : proofOpen
              ? 'proofOpen'
              : stage === 'answered'
                ? 'answered'
                : 'idle'

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value)

  const composer = (
    <Box
      sx={theme => ({
        position: 'relative',
        overflow: 'visible',
        isolation: 'isolate',
        borderRadius: `${theme.shape.customBorderRadius.xxl}px`
      })}
    >
      <GreenhouseSpectrumBeam
        kind='promptDock'
        variant='interactive'
        spectrumPalette='nexa'
        intensity={hasText ? 'strong' : 'subtle'}
        borderWidth={2.5}
        durationSec={hasText ? 18 : 24}
        active={hasText}
        contentSx={theme => ({
          p: 1,
          borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
          bgcolor: 'background.paper',
          border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          boxShadow: `0 18px 44px ${alpha(theme.axis.ramp.primary[900], hasText ? 0.2 : 0.1)}`
        })}
      >
        <NexaComposerInput
          kind='knowledgeAsk'
          value={draft}
          onChange={handleDraftChange}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && hasText) {
              event.preventDefault()
              void runQuery(draft)
            }
          }}
          placeholder={COPY.composerPlaceholder}
          inputProps={{ 'aria-label': COPY.composerPlaceholder }}
          actionAdornment={
            <NexaComposerActionButton variant='send' aria-label={COPY.composerSubmit} disabled={!hasText} onClick={() => void runQuery(draft)} />
          }
          sx={theme => ({
            '& .MuiInputBase-root, & .MuiFilledInput-root': {
              minBlockSize: 54,
              borderRadius: `${theme.shape.customBorderRadius.xl}px`,
              color: hasText ? 'text.primary' : 'text.disabled'
            }
          })}
        />
      </GreenhouseSpectrumBeam>
    </Box>
  )

  const moment = (
    <Stack spacing={4}>
      <NexaAnswersCanvas
        mode='runtime'
        variant='embedded'
        kind='knowledgeEmbedded'
        state={canvasState}
        surfaceContext={SURFACE_CONTEXT}
        renderPlan={renderPlan}
        question={submittedQuestion || undefined}
        draft=''
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
        proofOpen={proofOpen}
        onProofToggle={() => setProofOpen(current => !current)}
        reasoningSteps={buildReasoningSteps(reasoningStepIndex)}
        onStopGeneration={handleStop}
        copy={CANVAS_COPY}
        slots={{ composer: <></> }}
      />
      {sourceAnchors.length ? (
        <Box>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
            {COPY.sourcesLabel}
          </Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            {sourceAnchors.map(anchor => (
              <GreenhouseChip
                key={anchor.anchorId}
                size='small'
                variant={activeAnchorId === anchor.anchorId ? 'solid' : 'outlined'}
                tone='primary'
                clickable
                label={`[${anchor.label}] ${anchor.title}`}
                onMouseEnter={() => setActiveAnchorId(anchor.anchorId)}
                onFocus={() => setActiveAnchorId(anchor.anchorId)}
                onClick={() => setActiveAnchorId(anchor.anchorId)}
              />
            ))}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  )

  const bridge =
    stage === 'answered' && onContinueInNexaLens && submittedQuestion ? (
      <Stack direction='row' justifyContent='flex-end'>
        <GreenhouseShinyBorder
          asButton
          variant='cta'
          palette='nexa'
          ariaLabel={COPY.bridgeCta}
          dataCapture='nexa-composition-bridge-cta'
          onClick={() => onContinueInNexaLens(submittedQuestion)}
        >
          <GreenhouseNexaBrandMark kind='inlineMarkOnDark' size='small' />
          {COPY.bridgeCta}
        </GreenhouseShinyBorder>
      </Stack>
    ) : undefined

  // Fallback de demo: grid de docs derivado de `documents` cuando la superficie no pasa su propio `host`.
  const defaultHost = (
    <Box sx={{ ...panelSx(theme), p: { xs: 4, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
          <Stack spacing={0.5}>
            <Typography variant='h5'>{COPY.hostTitle}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {composed ? COPY.hostSubtitleComposed : COPY.hostSubtitleHost}
            </Typography>
          </Stack>
          <GreenhouseChip size='small' variant='label' tone={composed ? 'info' : 'default'} iconClassName='tabler-files' label={COPY.docsCountLabel(documents.length)} />
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: composed ? 3 : 4,
            gridTemplateColumns: composed
              ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
              : { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            '& > *': { minInlineSize: 0 }
          }}
        >
          {documents.map(doc => (
            <DocCard key={doc.documentId} doc={doc} condensed={composed} />
          ))}
        </Box>
      </Stack>
    </Box>
  )

  return (
    <Box data-capture='knowledge-nexa-composition-lens'>
      <NexaMomentComposition
        kind='knowledgeOverview'
        state={composed ? 'composed' : 'dormant'}
        composer={composer}
        moment={composed ? moment : undefined}
        bridge={bridge}
        host={hostSlot ?? defaultHost}
        activeAnchorId={composed ? activeAnchorId : null}
      />
    </Box>
  )
}

export default KnowledgeNexaCompositionLens
