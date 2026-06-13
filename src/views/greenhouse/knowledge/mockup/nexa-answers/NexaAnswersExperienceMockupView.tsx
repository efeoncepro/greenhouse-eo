'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import GlobalStyles from '@mui/material/GlobalStyles'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import {
  GreenhouseBreadcrumbs,
  GreenhouseButton,
  GreenhouseChip,
  NexaAnswersCanvas,
  type NexaAnswersCanvasCopy,
  type NexaAnswersCanvasState,
  type NexaAnswersCompactAnswerBlock,
  type NexaAnswersReasoningStep,
  type NexaAnswersRenderPlan,
  type NexaAnswersResponseControl,
  type NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

import { answerActions, answerPoints, icoChartSpec, trustCue } from './nexa-answer-bubble-fixtures'
import {
  financeRenderPlan,
  financeSurfaceContext,
  insightRenderPlan,
  insightSurfaceContext
} from './nexa-answers-portability-fixtures'

type VisualStage = 'idle' | 'thinking' | 'reasoning' | 'streaming' | 'answered' | 'proof' | 'followup' | 'degraded' | 'error'

const stageOptions: Array<{ value: VisualStage; label: string }> = [
  { value: 'idle', label: 'Idle' },
  { value: 'thinking', label: 'Pensando' },
  { value: 'reasoning', label: 'Razonando' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'answered', label: 'Respuesta' },
  { value: 'proof', label: 'Proof' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'degraded', label: 'Degradado' },
  { value: 'error', label: 'Error' }
]

const NEXA_ANSWERS_VISUAL_COPY = {
  aria: {
    stageSelector: 'Estado visual de Nexa Answers',
    askNexa: 'Pregúntale a Nexa',
    ask: 'Preguntar',
    continueWithNexa: 'Continúa con Nexa',
    sendFollowUp: 'Enviar follow-up',
    visualContract: 'Contrato visual primero'
  },
  composer: {
    askNexa: 'Pregúntale a Nexa',
    continueWithNexa: 'Continúa con Nexa'
  },
  breadcrumbs: {
    home: 'Inicio',
    knowledge: 'Knowledge',
    nexaAnswers: 'Nexa Answers'
  }
} as const

const surfaceContext: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.answers',
  domain: 'knowledge',
  placement: 'embedded',
  dataReality: 'strong',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble', 'compactAnswer'],
  allowedActions: ['read', 'explain', 'suggest_followup']
}

const evidencePacket: ConversationalEvidencePacket = {
  contractVersion: 'nexa-evidence.v1',
  kind: 'knowledge',
  sourceContractVersion: 'knowledge-search.v1',
  query: '¿Cómo se interpreta Impacto dentro de las métricas ICO?',
  generatedAt: '2026-06-12T20:45:00.000Z',
  confidence: 'high',
  freshness: 'current',
  deniedOrFilteredCount: 0,
  maxScore: 0.92,
  citedDocumentCount: 3,
  primaryFeedbackTarget: {
    documentId: 'knowledge-doc-ico-metrics',
    chunkId: 'chunk-impacto-01'
  },
  sources: [
    {
      id: 'chunk-impacto-01',
      documentId: 'knowledge-doc-ico-metrics',
      documentVersionId: 'v4',
      title: 'Manual: Métricas ICO',
      citationLabel: '[1]',
      headingPath: ['Métricas ICO', 'Impacto'],
      excerpt:
        'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, no solo la cantidad de actividad realizada.',
      humanUrl: '/knowledge/documents/knowledge-doc-ico-metrics',
      sourceUrl: 'greenhouse://knowledge/document/knowledge-doc-ico-metrics',
      score: 0.92,
      freshness: 'current',
      updatedAt: '2026-06-10T14:30:00.000Z',
      sensitivity: 'internal'
    },
    {
      id: 'chunk-colaboracion-01',
      documentId: 'knowledge-doc-ico-collaboration',
      documentVersionId: 'v2',
      title: 'Guía: Lectura de desempeño',
      citationLabel: '[2]',
      headingPath: ['Lectura de desempeño', 'ICO'],
      excerpt:
        'Las métricas ICO deben leerse como señales complementarias: Impacto, Colaboración y Orientación al Cliente se explican mejor juntas.',
      humanUrl: '/knowledge/documents/knowledge-doc-ico-collaboration',
      sourceUrl: 'greenhouse://knowledge/document/knowledge-doc-ico-collaboration',
      score: 0.86,
      freshness: 'current',
      updatedAt: '2026-06-08T09:10:00.000Z',
      sensitivity: 'internal'
    },
    {
      id: 'chunk-calibration-01',
      documentId: 'knowledge-doc-ico-calibration',
      documentVersionId: 'v1',
      title: 'SOP: Calibración ICO',
      citationLabel: '[3]',
      headingPath: ['Calibración', 'Escala'],
      excerpt:
        'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución, especialmente cuando la señal se usa para decisiones operativas.',
      humanUrl: '/knowledge/documents/knowledge-doc-ico-calibration',
      sourceUrl: 'greenhouse://knowledge/document/knowledge-doc-ico-calibration',
      score: 0.81,
      freshness: 'current',
      updatedAt: '2026-06-05T16:25:00.000Z',
      sensitivity: 'internal'
    }
  ],
  traceSteps: [
    {
      id: 'intent',
      label: 'Intención',
      description: 'Pregunta de lectura conceptual sobre Knowledge',
      metadata: 'scope: knowledge · action: explain',
      state: 'complete'
    },
    {
      id: 'retrieval',
      label: 'Fuentes',
      description: '3 fragmentos actuales seleccionados',
      metadata: 'maxScore 0.92 · filtered 0',
      state: 'complete'
    },
    {
      id: 'answer',
      label: 'Respuesta',
      description: 'Síntesis answer-first con citas disponibles',
      metadata: 'trustCue: sourced_current',
      state: 'active'
    },
    {
      id: 'feedback',
      label: 'Feedback',
      description: 'Respuesta lista para evaluación humana',
      metadata: 'target: chunk-impacto-01',
      state: 'pending'
    }
  ]
}

const mainQuestion = '¿Cómo se interpreta Impacto dentro de las métricas ICO?'
const followUpQuestion = '¿Y cómo lo explicaría a un manager sin hablar de scoring técnico?'

const suggestedFollowUps = [
  { id: 'by-signal', label: 'Desglósalo por señal' },
  { id: 'to-manager', label: 'Explícalo para un manager' },
  { id: 'flag-gaps', label: '¿Dónde hay vacíos de evidencia?' }
]

const reasoningStepLabels = ['Entendiendo la pregunta', 'Leyendo 3 fuentes de Knowledge', 'Redactando la respuesta']

const buildReasoningSteps = (activeIndex: number): NexaAnswersReasoningStep[] =>
  reasoningStepLabels.map((label, index) => ({
    id: `reasoning-${index}`,
    label,
    status: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
  }))

const canvasCopy: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: 'Pregúntale a Nexa sobre este corpus',
  idleBody: 'Knowledge es la primera surface real: lectura segura, fuentes gobernadas y proof disponible cuando hace falta.',
  idlePlaceholder: NEXA_ANSWERS_VISUAL_COPY.composer.askNexa,
  followUpPlaceholder: NEXA_ANSWERS_VISUAL_COPY.composer.continueWithNexa,
  submitLabel: NEXA_ANSWERS_VISUAL_COPY.aria.ask,
  followUpLabel: NEXA_ANSWERS_VISUAL_COPY.aria.sendFollowUp,
  thinkingLabel: 'Nexa está preparando la respuesta.',
  streamingLabel: 'Nexa está escribiendo la respuesta.',
  readyLabel: 'Respuesta grounded en Knowledge',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: 'Nexa puede responder, pero la evidencia disponible no alcanza para tratar esto como base decisional.',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: 'Intenta de nuevo o revisa la base de Knowledge directamente.'
}

const answerRenderPlan: NexaAnswersRenderPlan = {
  id: 'knowledge-impact-chart-answer',
  version: 'nexa-answer-render-plan.v1',
  intent: 'explain',
  autonomyTier: 'observeOnly',
  primaryBlockId: 'impact-chart',
  trustCue,
  actions: answerActions.map((action, index) => ({
    ...action,
    id: `knowledge-action-${index + 1}`,
    intent: index === 0 ? 'openSource' : index === 1 ? 'explain' : 'flagGap',
    riskLevel: 'low'
  })),
  proof: {
    id: 'knowledge-impact-proof',
    label: 'Base',
    collapsedLabel: 'Ver base',
    expandedLabel: 'Ocultar base',
    evidence: evidencePacket
  },
  blocks: [
    {
      id: 'impact-chart',
      renderer: 'answerBubble',
      rendererVersion: 'v1',
      kind: 'knowledgeChartAnswer',
      title: 'Impacto sube sin aislarse de Colaboración y Cliente.',
      body: [
        { text: 'La lectura útil está en la relación entre señales' },
        {
          type: 'citation',
          source: {
            id: 'chunk-impacto-01',
            label: '1',
            title: 'Manual: Métricas ICO',
            headingPath: ['Métricas ICO', 'Impacto'],
            excerpt:
              'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, no solo la cantidad de actividad realizada.',
            score: 0.92,
            freshness: 'current',
            href: '/knowledge/documents/knowledge-doc-ico-metrics'
          }
        },
        { text: '; abre la base solo si esta gráfica sostiene una decisión sensible' },
        {
          type: 'citation',
          source: {
            id: 'chunk-calibration-01',
            label: '3',
            title: 'SOP: Calibración ICO',
            headingPath: ['Calibración', 'Escala'],
            excerpt:
              'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución, especialmente cuando la señal se usa para decisiones operativas.',
            score: 0.81,
            freshness: 'current',
            href: '/knowledge/documents/knowledge-doc-ico-calibration'
          }
        },
        { text: '.' }
      ],
      metaLabel: 'Answer-first · proof bajo demanda',
      points: answerPoints,
      chart: icoChartSpec
    }
  ]
}

const previousImpactTurn: NexaAnswersCompactAnswerBlock = {
  id: 'previous-impact-turn',
  renderer: 'compactAnswer',
  rendererVersion: 'v1',
  title: 'Respuesta anterior: Impacto en ICO',
  body: 'Impacto mide resultado observable, no volumen de actividad.',
  trustLabel: '3 fuentes'
}

const panelSx = (theme: Theme) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: theme.palette.background.paper,
  minInlineSize: 0,
  overflow: 'hidden'
})

const softPanelSx = (theme: Theme) => ({
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: alpha(theme.palette.primary.main, 0.035),
  minInlineSize: 0
})

const StageSelector = ({ value, onChange }: { value: VisualStage; onChange: (stage: VisualStage) => void }) => {
  const theme = useTheme()

  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, next: VisualStage | null) => {
        if (next) onChange(next)
      }}
      aria-label={NEXA_ANSWERS_VISUAL_COPY.aria.stageSelector}
      size='small'
      sx={{
        display: 'grid',
        // 7 specimens (suma degradado/error): xs en 2 columnas, md en 4 → envuelve a 2 filas
        // sin desbordar el header.
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        inlineSize: { xs: '100%', md: 'auto' },
        '& .MuiToggleButton-root': {
          minInlineSize: { xs: 0, md: 96 },
          borderRadius: `${theme.shape.customBorderRadius.sm}px`
        }
      }}
    >
      {stageOptions.map(option => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

const ContextStrip = () => (
  <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap data-capture='nexa-answers-context-strip'>
    <GreenhouseChip size='small' variant='label' tone='primary' iconClassName='tabler-layout-dashboard' label='Knowledge' />
    <GreenhouseChip size='small' variant='label' tone='success' iconClassName='tabler-shield-check' label='Bajo riesgo' />
    <GreenhouseChip size='small' variant='label' tone='info' iconClassName='tabler-database' label='surfaceContext listo' />
    <GreenhouseChip size='small' variant='outlined' tone='default' iconClassName='tabler-route' label='Humano | Nexa | MCP' />
  </Stack>
)

const ConversationSurface = ({
  stage,
  reasoningStepIndex,
  onResponseControl,
  onStopGeneration
}: {
  stage: VisualStage
  reasoningStepIndex: number
  onResponseControl: (control: NexaAnswersResponseControl) => void
  onStopGeneration: () => void
}) => {
  const [proofOpen, setProofOpen] = useState(stage === 'proof')
  const [followUpDraft, setFollowUpDraft] = useState('')
  const [submittedFollowUp, setSubmittedFollowUp] = useState<string | null>(null)
  const thinking = stage === 'thinking'
  const isFollowUp = stage === 'followup' || Boolean(submittedFollowUp)

  const canvasState: NexaAnswersCanvasState =
    stage === 'error'
      ? 'error'
      : stage === 'degraded'
        ? 'degraded'
        : stage === 'reasoning'
          ? 'reasoning'
          : stage === 'streaming'
            ? 'streaming'
            : thinking
              ? 'thinking'
              : proofOpen
                ? 'proofOpen'
                : isFollowUp
                  ? 'followup'
                  : 'answered'

  const submitFollowUp = () => {
    const trimmed = followUpDraft.trim()

    if (!trimmed) return

    setSubmittedFollowUp(trimmed)
    setFollowUpDraft('')
  }

  useEffect(() => {
    setProofOpen(stage === 'proof')
  }, [stage])

  useEffect(() => {
    if (stage === 'followup') {
      setSubmittedFollowUp(followUpQuestion)
      setFollowUpDraft('')

      return
    }

    setSubmittedFollowUp(null)
  }, [stage])

  return (
    <NexaAnswersCanvas
      kind='knowledgeEmbedded'
      state={canvasState}
      surfaceContext={surfaceContext}
      renderPlan={answerRenderPlan}
      question={mainQuestion}
      draft={followUpDraft}
      onDraftChange={setFollowUpDraft}
      onSubmit={submitFollowUp}
      proofOpen={proofOpen}
      onProofToggle={() => setProofOpen(current => !current)}
      previousTurns={isFollowUp ? [previousImpactTurn] : []}
      followUpQuestion={submittedFollowUp}
      reasoningSteps={buildReasoningSteps(reasoningStepIndex)}
      suggestedFollowUps={suggestedFollowUps}
      onSuggestedFollowUp={followUp => {
        setSubmittedFollowUp(followUp.label)
        setFollowUpDraft('')
      }}
      onResponseControl={onResponseControl}
      onStopGeneration={onStopGeneration}
      copy={canvasCopy}
    />
  )
}

const SurfaceContextRail = () => {
  const theme = useTheme()

  return (
    <Stack spacing={4} data-capture='nexa-answers-context-rail'>
      <Box sx={{ ...panelSx(theme), p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <i className='tabler-code-dots' aria-hidden='true' />
            <Typography variant='h6'>surfaceContext</Typography>
          </Stack>
          {[
            ['surfaceId', surfaceContext.surfaceId],
            ['domain', surfaceContext.domain],
            ['placement', surfaceContext.placement],
            ['dataReality', surfaceContext.dataReality],
            ['sensitivity', surfaceContext.sensitivity]
          ].map(([label, value]) => (
            <Stack key={label} direction='row' spacing={3} justifyContent='space-between'>
              <Typography variant='caption' color='text.secondary'>
                {label}
              </Typography>
              <Typography variant='body2' sx={{ overflowWrap: 'anywhere', textAlign: 'end' }}>
                {value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ ...panelSx(theme), p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <i className='tabler-lock-check' aria-hidden='true' />
            <Typography variant='h6'>Acciones permitidas</Typography>
          </Stack>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            {surfaceContext.allowedActions.map(action => (
              <GreenhouseChip key={action} size='small' variant='label' tone='success' label={action} />
            ))}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ ...panelSx(theme), p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <i className='tabler-sparkles' aria-hidden='true' />
            <Typography variant='h6'>AI moment</Typography>
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            Nexa Answers vive dentro de Knowledge. Nexa Chat sigue siendo el shell global; MCP conserva la inspección técnica.
          </Typography>
        </Stack>
      </Box>
    </Stack>
  )
}

const PORTABILITY_SPECIMENS = [
  {
    id: 'finance',
    canvasKind: 'financeChartEmbedded' as const,
    badge: { icon: 'tabler-report-money', tone: 'warning' as const, label: 'Finance · chart' },
    title: 'El mismo canvas, dominio Finanzas',
    question: '¿Por qué cayó el margen de contribución del cliente este trimestre?',
    surfaceContext: financeSurfaceContext,
    renderPlan: financeRenderPlan
  },
  {
    id: 'insight',
    canvasKind: 'agencyInsightEmbedded' as const,
    badge: { icon: 'tabler-bolt', tone: 'info' as const, label: 'Insight promovido' },
    title: 'Una señal de Nexa Insights, promovida a respuesta',
    question: '¿Qué pasó con la entrega del equipo este sprint?',
    surfaceContext: insightSurfaceContext,
    renderPlan: insightRenderPlan
  }
]

// Specimen de portabilidad: renderiza el MISMO NexaAnswersCanvas en otro dominio, en estado answered
// y read-only (composer suprimido con un fragment vacío). Prueba que surfaceContext + renderPlan son
// agnósticos del dominio sin re-plumbing del primitive.
const PortabilitySpecimen = ({ specimen }: { specimen: (typeof PORTABILITY_SPECIMENS)[number] }) => {
  const theme = useTheme()

  return (
    <Box
      data-capture={`nexa-answers-portability-${specimen.id}`}
      sx={{ ...panelSx(theme), p: { xs: 4, md: 5 }, display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
        <GreenhouseChip size='small' variant='label' tone={specimen.badge.tone} iconClassName={specimen.badge.icon} label={specimen.badge.label} />
        <Typography variant='caption' color='text.secondary'>
          {specimen.surfaceContext.surfaceId}
        </Typography>
      </Stack>
      <Typography variant='h6'>{specimen.title}</Typography>
      <Box sx={{ ...softPanelSx(theme), p: { xs: 3, md: 4 }, backgroundColor: alpha(theme.palette.primary.main, 0.012) }}>
        <NexaAnswersCanvas
          kind={specimen.canvasKind}
          state='answered'
          surfaceContext={specimen.surfaceContext}
          renderPlan={specimen.renderPlan}
          question={specimen.question}
          draft=''
          onDraftChange={() => undefined}
          onSubmit={() => undefined}
          // Ready label neutro: el copy compartido es de Knowledge; en otro dominio no debe decir "Knowledge".
          copy={{ ...canvasCopy, readyLabel: 'Respuesta lista' }}
          slots={{ composer: <></> }}
        />
      </Box>
    </Box>
  )
}

const PortabilityGallery = () => {
  const theme = useTheme()

  return (
    <Box data-capture='nexa-answers-portability' sx={{ ...panelSx(theme), p: { xs: 4, md: 5 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant='h5'>Portabilidad fuera de Knowledge</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
            El mismo NexaAnswersCanvas y el contrato surfaceContext/renderPlan renderizan otros dominios sin
            re-plumbing: Finanzas con gráfica y una señal de Nexa Insights promovida a respuesta. Datos sintéticos.
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: 4,
            alignItems: 'start',
            '& > *': { minInlineSize: 0 }
          }}
        >
          {PORTABILITY_SPECIMENS.map(specimen => (
            <PortabilitySpecimen key={specimen.id} specimen={specimen} />
          ))}
        </Box>
      </Stack>
    </Box>
  )
}

const NexaAnswersExperienceMockupView = () => {
  const theme = useTheme()
  const [stage, setStage] = useState<VisualStage>('answered')
  const [draft, setDraft] = useState('¿Cómo se interpreta Impacto dentro de las métricas ICO?')
  // Índice del paso de razonamiento activo. En el stage discreto "Razonando" se queda en el
  // paso central (specimen estable); el play-through lo avanza en el tiempo.
  const [reasoningStepIndex, setReasoningStepIndex] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const playTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearPlayTimers = () => {
    playTimers.current.forEach(clearTimeout)
    playTimers.current = []
  }

  // Reproduce el despliegue completo estilo AI Overview: razonar (pasos progresivos + shimmer)
  // → streaming (respuesta llegando) → answered (settle stagger). Timings deterministas.
  const playDeploy = () => {
    clearPlayTimers()
    setIsPlaying(true)
    setStage('reasoning')
    setReasoningStepIndex(0)
    playTimers.current = [
      setTimeout(() => setReasoningStepIndex(1), 800),
      setTimeout(() => setReasoningStepIndex(2), 1600),
      setTimeout(() => setStage('streaming'), 2400),
      setTimeout(() => {
        setStage('answered')
        setIsPlaying(false)
      }, 3600)
    ]
  }

  useEffect(() => clearPlayTimers, [])

  const onStageChange = (next: VisualStage) => {
    clearPlayTimers()
    setIsPlaying(false)
    setReasoningStepIndex(1)
    setStage(next)
  }

  // Fase settle — response toolbar. "Regenerar" re-dispara el despliegue completo (como AI Overview);
  // copiar/compartir/feedback dan su acuse visual en la toolbar (en runtime el host emitiría analítica).
  const onResponseControl = (control: NexaAnswersResponseControl) => {
    if (control === 'regenerate') playDeploy()
  }

  // Detener la generación durante streaming: corta el despliegue y asienta lo recibido (answered).
  const onStopGeneration = () => {
    clearPlayTimers()
    setIsPlaying(false)
    setStage('answered')
  }

  return (
    <Stack spacing={5} data-capture='nexa-answers-visual-page'>
      <GlobalStyles styles={{ '[data-nexa-floating-trigger="true"]': { display: 'none !important' } }} />

      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={4} alignItems={{ lg: 'flex-start' }}>
        <Stack spacing={2}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            items={[
              { label: NEXA_ANSWERS_VISUAL_COPY.breadcrumbs.home, href: '/home' },
              { label: NEXA_ANSWERS_VISUAL_COPY.breadcrumbs.knowledge, href: '/knowledge' },
              { label: NEXA_ANSWERS_VISUAL_COPY.breadcrumbs.nexaAnswers }
            ]}
          />
          <Stack spacing={1.5}>
            <ContextStrip />
            <Typography variant='surfaceHeroTitle'>Nexa Answers sobre Knowledge</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 780 }}>
              Primera surface real de bajo riesgo para terminar la experiencia conversacional: respuesta útil primero,
              confianza compacta y proof disponible sin romper el flujo.
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={2} alignItems={{ xs: 'stretch', lg: 'flex-end' }}>
          <StageSelector value={stage} onChange={onStageChange} />
          <Stack direction='row' spacing={2} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
            <GreenhouseButton
              variant='solid'
              tone='primary'
              size='small'
              leadingIconClassName={isPlaying ? 'tabler-loader-2' : 'tabler-player-play'}
              disabled={isPlaying}
              onClick={playDeploy}
            >
              {isPlaying ? 'Desplegando…' : 'Reproducir despliegue'}
            </GreenhouseButton>
            <GreenhouseButton variant='outlined' tone='secondary' size='small' leadingIconClassName='tabler-flask'>
              Lab visual
            </GreenhouseButton>
          </Stack>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px', xl: 'minmax(0, 1fr) 320px' },
          gap: 5,
          alignItems: 'start',
          minInlineSize: 0,
          '& > *': { minInlineSize: 0 }
        }}
      >
        <Box
          data-capture='nexa-answers-surface'
          sx={{
            ...panelSx(theme),
            backgroundColor: alpha(theme.palette.background.paper, 0.96)
          }}
        >
          <Box
            sx={{
              px: { xs: 4, md: 5 },
              py: 3,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              backgroundColor: alpha(theme.palette.primary.main, 0.025)
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant='h5'>Surface embebida</Typography>
              <Typography variant='caption' color='text.secondary'>
                Knowledge · answer-first · proof bajo demanda
              </Typography>
            </Stack>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <GreenhouseChip size='small' variant='label' tone='primary' label='Nexa' />
              <GreenhouseChip size='small' variant='label' tone='success' label='Fuentes actuales' />
              <GreenhouseChip size='small' variant='outlined' tone='default' label='MCP inspecciona aparte' />
            </Stack>
          </Box>
          <Divider />

          <Box sx={{ p: { xs: 4, md: 5 }, backgroundColor: alpha(theme.palette.primary.main, 0.012) }}>
            {stage === 'idle' ? (
              <NexaAnswersCanvas
                kind='knowledgeEmbedded'
                state='idle'
                surfaceContext={surfaceContext}
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={() => setStage('answered')}
                copy={canvasCopy}
              />
            ) : (
              <ConversationSurface
                stage={stage}
                reasoningStepIndex={reasoningStepIndex}
                onResponseControl={onResponseControl}
                onStopGeneration={onStopGeneration}
              />
            )}
          </Box>
        </Box>

        <SurfaceContextRail />
      </Box>

      <Box
        data-capture='nexa-answers-choreography'
        sx={{
          ...panelSx(theme),
          p: { xs: 4, md: 5 }
        }}
      >
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ md: 'center' }}>
            <Stack spacing={1}>
              <Typography variant='h5'>Coreografía visible</Typography>
              <Typography variant='body2' color='text.secondary'>
                La experiencia nace para Knowledge, pero la lectura de estados ya es portable a otras surfaces.
              </Typography>
            </Stack>
            <Tooltip title='El backend se cablea después sobre estos contratos visuales'>
              <IconButton aria-label={NEXA_ANSWERS_VISUAL_COPY.aria.visualContract}>
                <i className='tabler-info-circle' />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
              gap: 3
            }}
          >
            {[
              ['1', 'Composer limpio', 'Sin respuesta falsa ni proof prematuro'],
              ['2', 'Pregunta sube', 'La intención queda preservada'],
              ['3', 'Nexa aparece', 'Identidad + thinking sobrio'],
              ['4', 'Respuesta primero', 'Trust cue compacto al final'],
              ['5', 'Proof opcional', 'Evidencia disponible, no dominante']
            ].map(([step, title, body]) => (
              <Box key={step} sx={{ ...softPanelSx(theme), p: 4 }}>
                <Stack spacing={2}>
                  <GreenhouseChip size='small' variant='solid' tone='primary' label={step} />
                  <Typography variant='h6'>{title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {body}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        </Stack>
      </Box>

      <PortabilityGallery />
    </Stack>
  )
}

export default NexaAnswersExperienceMockupView
