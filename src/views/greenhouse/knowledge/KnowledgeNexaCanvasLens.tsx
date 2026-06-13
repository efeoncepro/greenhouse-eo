'use client'

import { useEffect, useRef, useState } from 'react'

import { flushSync } from 'react-dom'

import Box from '@mui/material/Box'

import { NexaAnswersCanvas } from '@/components/greenhouse/primitives'
import type {
  NexaAnswersCanvasCopy,
  NexaAnswersCanvasState,
  NexaAnswersCompactAnswerBlock,
  NexaAnswersReasoningStep,
  NexaAnswersRenderPlan,
  NexaAnswersResponseControl,
  NexaAnswersSuggestedFollowUp,
  NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import { buildKnowledgeAnswerRenderPlan } from '@/lib/knowledge/nexa/knowledge-answer-render-plan'
import type { KnowledgeRetrievalPacket } from '@/lib/knowledge/search'
import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * Lente Nexa runtime de `/knowledge` — el `NexaAnswersCanvas` RICO (coreografía, citas inline, proof,
 * response toolbar) cableado al retrieval REAL (`knowledge-search.v1`). TASK-1101 Slice 3 + TASK-1102
 * (hilo multi-turno, GAP B).
 *
 * Self-contained: posee su conversación (turnos/draft/estado) y su fetch; el host (KnowledgeCenterView)
 * solo lo monta detrás del flag. La traducción dominio→canvas vive en `buildKnowledgeAnswerRenderPlan`
 * (consumer adapter, TASK-1101 Slice 1) — la primitive NUNCA conoce el packet.
 *
 * Multi-turno (GAP B): el host mantiene `turns[]` (pregunta + renderPlan + packet + blockId por turno).
 * El turno vivo es el último respondido; los anteriores se pasan a `previousTurns` compactados. Al enviar
 * un follow-up, la compactación del turno vivo morfea con View Transitions (TASK-1102): el answerBubble
 * grande se encoge hacia su `compactAnswer` en el historial (mismo `view-transition-name` por turno).
 * La primitive NO cambia; es wiring de estado en el host.
 *
 * Honestidad (state-design): thinking (retrieval en vuelo) → reasoning (traza real) → answered; abort
 * real con `onStopGeneration` (vuelve al último turno respondido, no descarta el hilo); degraded si el
 * retrieval no responde; gap honesto si `confidence='none'`.
 */

const SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.lens',
  domain: 'knowledge',
  placement: 'embedded',
  density: 'embeddedStandard',
  dataReality: 'strong',
  sensitivity: 'tenant_internal',
  // El adapter emite `answerBubble`; los turnos previos se compactan a `compactAnswer` (historial).
  allowedRenderers: ['answerBubble', 'compactAnswer'],
  allowedActions: ['read', 'explain', 'suggest_followup']
}

const CANVAS_COPY: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: 'Pregúntale a Nexa sobre el conocimiento publicado',
  idleBody: 'Lectura segura sobre el corpus gobernado: respuestas con fuentes citadas y proof disponible cuando lo necesites.',
  idlePlaceholder: 'Escribe tu pregunta…',
  followUpPlaceholder: 'Sigue preguntando…',
  submitLabel: 'Preguntar a Nexa',
  followUpLabel: 'Enviar pregunta',
  thinkingLabel: 'Nexa está buscando en el conocimiento.',
  streamingLabel: 'Nexa está preparando la respuesta.',
  readyLabel: 'Respuesta con respaldo en Knowledge',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: 'No pude completar la búsqueda en el corpus. Probá de nuevo o consultá la base directamente.',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: 'Intentá de nuevo o revisá la base de Knowledge directamente.'
}

const SUGGESTED_FOLLOW_UPS: NexaAnswersSuggestedFollowUp[] = [
  { id: 'breakdown', label: 'Desglósalo en pasos' },
  { id: 'simple', label: 'Explícalo más simple' },
  { id: 'gaps', label: '¿Dónde hay vacíos de evidencia?' }
]

const REASONING_LABELS = ['Entendiendo tu pregunta', 'Leyendo el conocimiento publicado', 'Redactando la respuesta con citas']

const buildReasoningSteps = (activeIndex: number): NexaAnswersReasoningStep[] =>
  REASONING_LABELS.map((label, index) => ({
    id: `reasoning-${index}`,
    label,
    status: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
  }))

/** Un turno respondido del hilo: lo que se necesita para mostrarlo vivo o compactarlo al historial. */
interface KnowledgeTurn {
  id: string
  /** == `renderPlan.primaryBlockId`; el `compactAnswer` conserva este id para que el morph VT conecte. */
  blockId: string
  question: string
  renderPlan: NexaAnswersRenderPlan
  packet: KnowledgeRetrievalPacket
}

const citedDocumentCount = (packet: KnowledgeRetrievalPacket): number =>
  new Set(packet.chunks.map(chunk => chunk.documentId)).size

const isGroundedPacket = (packet: KnowledgeRetrievalPacket): boolean =>
  packet.confidence !== 'none' && packet.chunks.length > 0

/**
 * Comprime un turno respondido a su `compactAnswer` para el historial. La pregunta es el ancla de
 * continuidad ("esto preguntaste"); el cuerpo es un gist honesto (mejor fuente / sin fuentes). El `id`
 * == `blockId` del turno vivo → mismo `view-transition-name` → el answerBubble morfea hacia este compacto.
 */
const turnToCompactAnswer = (turn: KnowledgeTurn): NexaAnswersCompactAnswerBlock => {
  const grounded = isGroundedPacket(turn.packet)
  const cited = citedDocumentCount(turn.packet)

  return {
    id: turn.blockId,
    renderer: 'compactAnswer',
    rendererVersion: 'v1',
    title: turn.question,
    body: grounded
      ? turn.packet.chunks[0]?.title ?? 'Respuesta con respaldo en Knowledge'
      : 'Sin fuentes publicadas para esta pregunta.',
    trustLabel: grounded ? (cited === 1 ? '1 fuente' : `${cited} fuentes`) : undefined
  }
}

type Stage = 'idle' | 'thinking' | 'reasoning' | 'answered' | 'degraded' | 'error'

type ApiEnvelope<T> = { data?: T; error?: { message?: string } }

const KnowledgeNexaCanvasLens = () => {
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<KnowledgeTurn[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [proofOpen, setProofOpen] = useState(false)
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<number[]>([])
  const turnCounterRef = useRef(0)

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

  const runQuery = async (raw: string, options?: { replaceLast?: boolean }) => {
    const trimmed = raw.trim()

    if (!trimmed) return

    const replaceLast = options?.replaceLast ?? false

    clearTimers()
    abortRef.current?.abort()
    const controller = new AbortController()

    abortRef.current = controller

    const turnId = `t${++turnCounterRef.current}`

    // Compactar el turno vivo al historial solo si hay una respuesta visible para morfear (answered/
    // proofOpen) y NO es una regeneración (que reemplaza el turno, no lo archiva). El morph necesita
    // que el cambio de DOM ocurra DENTRO de la transición → flushSync (setState async no llega a tiempo
    // al snapshot). El helper degrada honesto sin soporte / reduced-motion (swap instantáneo).
    const shouldCompact = !replaceLast && stage === 'answered'

    const begin = () => {
      if (replaceLast) setTurns(prev => prev.slice(0, -1))
      setPendingQuestion(trimmed)
      setDraft('')
      setProofOpen(false)
      setStage('thinking')
    }

    if (shouldCompact) {
      void startViewTransition(() => flushSync(begin))
    } else {
      begin()
    }

    try {
      const response = await fetch(
        `/api/platform/app/knowledge/search?mode=agentic&limit=10&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      )

      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<KnowledgeRetrievalPacket>

      if (controller.signal.aborted) return

      if (!response.ok || !payload.data) {
        setPendingQuestion(null)
        setStage('error')

        return
      }

      const renderPlan = buildKnowledgeAnswerRenderPlan(payload.data, { turnId })

      const turn: KnowledgeTurn = {
        id: turnId,
        blockId: renderPlan.primaryBlockId,
        question: trimmed,
        renderPlan,
        packet: payload.data
      }

      // Anima la traza de razonamiento sobre datos REALES (ya ocurrieron) y, al asentar, commitea el
      // turno: durante reasoning el turno aún NO está en `turns` (la pregunta sigue como pendiente +
      // el historial previo persiste); al commitear, el turno entra como vivo y la pregunta deja de ser
      // pendiente. `replaceLast` ya quitó el turno regenerado en `begin`, así que el commit lo re-agrega.
      const commit = () => {
        setTurns(prev => [...prev, turn])
        setPendingQuestion(null)
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
      setPendingQuestion(null)
      setStage('degraded')
    }
  }

  const handleStop = () => {
    clearTimers()
    abortRef.current?.abort()
    setPendingQuestion(null)
    // Asienta honesto: si hay turnos respondidos, volvemos al último (el hilo se preserva); si no, al composer.
    setStage(turns.length > 0 ? 'answered' : 'idle')
  }

  const submitFeedback = (kind: 'useful' | 'wrong_source') => {
    const target = turns[turns.length - 1]?.packet.chunks[0]

    if (!target) return

    void fetch('/api/platform/app/knowledge/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackKind: kind, documentId: target.documentId, chunkId: target.chunkId })
    }).catch(() => {})
  }

  const handleResponseControl = (control: NexaAnswersResponseControl) => {
    if (control === 'regenerate') {
      const last = turns[turns.length - 1]

      if (last) void runQuery(last.question, { replaceLast: true })

      return
    }

    if (control === 'helpful') {
      submitFeedback('useful')

      return
    }

    if (control === 'unhelpful') {
      // V1: mapeo mínimo honesto (Slice 2 agrega el selector de motivo stale/wrong_source/missing_doc).
      submitFeedback('wrong_source')
    }
    // `copy` lo resuelve el canvas self-contained; `share` → Slice 2 (permalink).
  }

  const isPending = stage === 'thinking' || stage === 'reasoning'
  // Turno vivo = el último respondido (cuando no hay uno en vuelo). Durante thinking/reasoning no hay
  // turno vivo: TODOS los respondidos van al historial y la pregunta en vuelo lidera.
  const liveTurn = isPending ? null : turns[turns.length - 1] ?? null
  const historyTurns = isPending ? turns : turns.slice(0, -1)
  const previousTurns = historyTurns.map(turnToCompactAnswer)
  // El render plan prop = el del último turno respondido en AMBOS casos: vivo (answered) o "carrier"
  // (durante pending, para que el gate de `previousTurns` del canvas tenga un renderPlan con el cual
  // pintar el historial; el primaryBlock no se muestra en preAnswer).
  const renderPlan = turns[turns.length - 1]?.renderPlan
  const question = isPending ? pendingQuestion ?? undefined : liveTurn?.question

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

  return (
    <Box data-capture='knowledge-nexa-canvas-lens'>
      <NexaAnswersCanvas
        mode='runtime'
        variant='embedded'
        kind='knowledgeEmbedded'
        state={canvasState}
        surfaceContext={SURFACE_CONTEXT}
        renderPlan={renderPlan}
        question={question || undefined}
        previousTurns={previousTurns}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void runQuery(draft)}
        proofOpen={proofOpen}
        onProofToggle={() => setProofOpen(current => !current)}
        reasoningSteps={buildReasoningSteps(reasoningStepIndex)}
        suggestedFollowUps={SUGGESTED_FOLLOW_UPS}
        onSuggestedFollowUp={(followUp: NexaAnswersSuggestedFollowUp) => void runQuery(followUp.label)}
        onResponseControl={handleResponseControl}
        onStopGeneration={handleStop}
        copy={CANVAS_COPY}
      />
    </Box>
  )
}

export default KnowledgeNexaCanvasLens
