'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'

import { NexaAnswersCanvas } from '@/components/greenhouse/primitives'
import type {
  NexaAnswersCanvasCopy,
  NexaAnswersCanvasState,
  NexaAnswersReasoningStep,
  NexaAnswersRenderPlan,
  NexaAnswersResponseControl,
  NexaAnswersSuggestedFollowUp,
  NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import { buildKnowledgeAnswerRenderPlan } from '@/lib/knowledge/nexa/knowledge-answer-render-plan'
import type { KnowledgeRetrievalPacket } from '@/lib/knowledge/search'

/**
 * Lente Nexa runtime de `/knowledge` — el `NexaAnswersCanvas` RICO (coreografía, citas inline, proof,
 * response toolbar) cableado al retrieval REAL (`knowledge-search.v1`). TASK-1101 Slice 3.
 *
 * Self-contained: posee su conversación (draft/estado/packet) y su fetch; el host (KnowledgeCenterView)
 * solo lo monta detrás del flag. La traducción dominio→canvas vive en `buildKnowledgeAnswerRenderPlan`
 * (consumer adapter, TASK-1101 Slice 1) — la primitive NUNCA conoce el packet.
 *
 * Honestidad (state-design): thinking (retrieval en vuelo) → reasoning (traza real) → answered; abort
 * real con `onStopGeneration`; degraded si el retrieval no responde; gap honesto si `confidence='none'`.
 */

const SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.lens',
  domain: 'knowledge',
  placement: 'embedded',
  density: 'embeddedStandard',
  dataReality: 'strong',
  sensitivity: 'tenant_internal',
  // El adapter solo emite `answerBubble`; declararlo acota la allowlist de seguridad de la surface.
  allowedRenderers: ['answerBubble'],
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

type Stage = 'idle' | 'thinking' | 'reasoning' | 'answered' | 'degraded' | 'error'

type ApiEnvelope<T> = { data?: T; error?: { message?: string } }

const KnowledgeNexaCanvasLens = () => {
  const [draft, setDraft] = useState('')
  const [question, setQuestion] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [renderPlan, setRenderPlan] = useState<NexaAnswersRenderPlan | undefined>(undefined)
  const [packet, setPacket] = useState<KnowledgeRetrievalPacket | null>(null)
  const [proofOpen, setProofOpen] = useState(false)
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<number[]>([])

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

  // Anima la traza de razonamiento sobre datos REALES (los pasos ya ocurrieron) y asienta en answered.
  const playReasoning = () => {
    clearTimers()
    setReasoningStepIndex(0)
    setStage('reasoning')
    timersRef.current.push(window.setTimeout(() => setReasoningStepIndex(1), 220))
    timersRef.current.push(window.setTimeout(() => setReasoningStepIndex(2), 440))
    timersRef.current.push(window.setTimeout(() => setStage('answered'), 720))
  }

  const runQuery = async (raw: string) => {
    const trimmed = raw.trim()

    if (!trimmed) return

    clearTimers()
    abortRef.current?.abort()
    const controller = new AbortController()

    abortRef.current = controller

    setQuestion(trimmed)
    setDraft('')
    setProofOpen(false)
    setRenderPlan(undefined)
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

      setPacket(payload.data)
      setRenderPlan(buildKnowledgeAnswerRenderPlan(payload.data))
      playReasoning()
    } catch {
      if (controller.signal.aborted) return
      setStage('degraded')
    }
  }

  const handleStop = () => {
    clearTimers()
    abortRef.current?.abort()
    // Asienta honesto: si ya hay respuesta, la mostramos; si no, volvemos al composer.
    setStage(renderPlan ? 'answered' : 'idle')
  }

  const submitFeedback = (kind: 'useful' | 'wrong_source') => {
    const target = packet?.chunks[0]

    if (!target) return

    void fetch('/api/platform/app/knowledge/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackKind: kind, documentId: target.documentId, chunkId: target.chunkId })
    }).catch(() => {})
  }

  const handleResponseControl = (control: NexaAnswersResponseControl) => {
    if (control === 'regenerate') {
      void runQuery(question)

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
