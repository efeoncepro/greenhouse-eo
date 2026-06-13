'use client'

import { useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  NexaAnswerBubble,
  NexaAnswersCanvas,
  NexaComposer,
  NexaComposerInput,
  NexaComposerActionButton,
  NexaFace,
  NexaKnowledgeAnswerSurface,
  NexaPresenceMark,
  NexaSenderMark
} from '@/components/greenhouse/primitives'
import type {
  NexaAnswerAction,
  NexaAnswerActionPlanSpec,
  NexaAnswerChartSpec,
  NexaAnswerMetricSummarySpec,
  NexaAnswerPoint,
  NexaAnswerTrustCue,
  NexaAnswersCanvasCopy,
  NexaAnswersRenderPlan,
  NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import type { NexaToolResult } from '@/lib/nexa/nexa-contract'
import { nexaToolResultToConversationalEvidence } from '@/lib/nexa/conversational-evidence'
import { NexaKnowledgeToolTraceCard } from '@/views/greenhouse/home/components/NexaToolRenderers'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const MOCKUP_ROUTE = '/nexa/floating-chat/mockup'
const TASK_REF = 'TASK-1078'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const Section = ({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) => (
  <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline}>
      <Typography variant='overline' color='primary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
    </Stack>
    {children}
  </Stack>
)

const Card = ({ children }: { children: ReactNode }) => (
  <Box
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper'
    })}
  >
    {children}
  </Box>
)

// Anatomía: las 5 regiones del patrón (de arriba a abajo / izquierda a derecha).
const ANATOMY: { region: string; detail: string }[] = [
  { region: 'Header de presencia', detail: 'Cara real de Nexa + wordmark en Poppins + estado "En línea" con ping vivo + controles circulares (nueva conversación / expandir / cerrar).' },
  { region: 'Rail de conversaciones (glass)', detail: 'Glassmorfismo blanco (backdrop-filter); buscador con filtro, grupos temporales con jerarquía, item activo = píldora, kebab de acciones, estados empty / filtered-empty.' },
  { region: 'Cuerpo de conversación', detail: 'Thread headless (SDK) con avatar por-mensaje (NexaSenderMark) + runtime propio keyed → nueva conversación limpia y fluida.' },
  { region: 'Empty hero', detail: 'Saludo rotativo por nombre + chip de contexto + grilla de prompts contextuales (por pantalla/entidad) + firma de marca Efeonce sutil (solo aquí).' },
  { region: 'Composer', detail: 'Input sobre blanco (sin box propio) envuelto en NexaGlowBorder + botón enviar navy↔teal compacto. Disclaimer de confianza.' }
]

// Primitives / piezas que lo COMPONEN (es un organismo, no una primitive).
const COMPOSED_OF: { name: string; role: string; status: string }[] = [
  { name: 'NexaGlowBorder', role: 'Borde "línea de luz" del composer (dos capas + máscara + beam).', status: 'Primitive canónica ✅' },
  { name: 'NexaComposer', role: 'Input (caja Vuexy anulada → el glow pinta todo) + botón send/stop + glow + disclaimer, como unidad reusable. Partes: NexaComposerInput / NexaComposerActionButton.', status: 'Primitive canónica ✅' },
  { name: 'NexaKnowledgeAnswerSurface', role: 'Superficie de respuesta trazable: pregunta-burbuja + respuesta Nexa + composer descendido + proof panel lateral.', status: 'Composition primitive ✅' },
  { name: 'NexaAnswersCanvas', role: 'Canvas transversal para render plans: surfaceContext + estados + registry de renderers + composer/proof/choreography.', status: 'Primitive canónica ✅' },
  { name: 'NexaAnswerBubble', role: 'Bubble answer-turn canónica: variante chart con Recharts trend/comparison/composition y variante explanation para respuesta textual enriquecida.', status: 'Primitive canónica ✅' },
  { name: 'NexaEvidencePanel', role: 'Renderer compartido de evidencia versionada: trace, fuentes, freshness, confidence y feedback desde ConversationalEvidencePacket.', status: 'Primitive canónica ✅' },
  { name: 'NexaPresenceMark', role: 'Header: crossfade "En línea" ↔ "Pensando…" con elipsis animada (reduced-motion horneado).', status: 'Primitive canónica ✅' },
  { name: 'NexaFace', role: 'Avatar cara real de Nexa con variants hero (76) / header (44, borde teal) / message (32). Single source del asset.', status: 'Primitive canónica ✅' },
  { name: 'NexaSenderMark', role: 'Avatar por-mensaje (disco navy + anillo teal + glyph arco teal/sparkle blanco inline).', status: 'Primitive canónica ✅' },
  { name: 'NexaConversationRail', role: 'Rail de historial glass (search + grupos + items + estados).', status: 'Parte del patrón' },
  { name: 'NexaEmptyHero', role: 'Saludo + chip de contexto + prompts + firma.', status: 'Parte del patrón' },
  { name: 'GreenhouseFloatingSurface / AdaptiveSidecar', role: 'Anclaje del panel (modo expandible) / lane (modo C).', status: 'Primitives reusadas' }
]

// Modos de interacción (la preferencia user-facing futura).
const MODES: { mode: string; detail: string }[] = [
  { mode: 'Dock compacto (A)', detail: 'El más liviano. Panel chico anclado. [deferred]' },
  { mode: 'Panel expandible (B)', detail: 'Compacto ↔ ancho con rail de historial. Concepto vigente de esta task.' },
  { mode: 'Lane sidecar (C)', detail: 'Full-height in-flow (AdaptiveSidecarLayout), el contexto principal sigue visible. [deferred-but-committed]' }
]

const KNOWLEDGE_TOOL_TRACE_SPECIMEN: NexaToolResult = {
  available: true,
  summary: 'Fragmentos recuperados del corpus de conocimiento.',
  source: 'postgres',
  scopeLabel: 'Base de conocimientos',
  generatedAt: '2026-06-12T10:00:00.000Z',
  metrics: [],
  raw: {
    packet: {
      contractVersion: 'knowledge-search.v1',
      query: '¿Qué significa Impacto en mis métricas ICO?',
      generatedAt: '2026-06-12T10:00:00.000Z',
      mode: 'agentic',
      accessScope: {
        tenantType: 'efeonce_internal',
        tenantId: null,
        userId: 'design-system',
        roleCodes: ['EFEONCE_ADMIN'],
        routeGroups: ['internal'],
        capabilities: ['knowledge.agentic.retrieve']
      },
      confidence: 'high',
      freshness: 'current',
      deniedOrFilteredCount: 1,
      notes: [],
      chunks: [
        {
          chunkId: 'kch-design-1',
          documentId: 'kdoc-design-1',
          documentVersionId: 'kdv-design-1',
          title: 'Manual: Cómo usar Mi Desempeño',
          headingPath: ['Mi Desempeño', 'Propósito'],
          text: 'Mi Desempeño te permite revisar objetivos, ver feedback y dar seguimiento a tu crecimiento profesional.',
          sourceUrl: null,
          humanUrl: '/knowledge/documents/kdoc-design-1',
          citationLabel: 'Manual: Cómo usar Mi Desempeño',
          score: 0.93,
          updatedAt: '2026-05-07T00:00:00.000Z',
          freshness: 'current',
          sensitivity: 'internal'
        },
        {
          chunkId: 'kch-design-2',
          documentId: 'kdoc-design-2',
          documentVersionId: 'kdv-design-2',
          title: 'Glosario: Métricas ICO personales',
          headingPath: ['Impacto'],
          text: 'Impacto mide la contribución al logro de objetivos clave con foco en resultados.',
          sourceUrl: null,
          humanUrl: '/knowledge/documents/kdoc-design-2',
          citationLabel: 'Glosario: Métricas ICO personales',
          score: 0.87,
          updatedAt: '2026-05-02T00:00:00.000Z',
          freshness: 'current',
          sensitivity: 'internal'
        }
      ]
    }
  }
}

const ANSWER_BUBBLE_POINTS: NexaAnswerPoint[] = [
  {
    title: 'Resultado antes que actividad',
    body: 'Lee primero qué cambió para cliente, equipo u operación; después mira la actividad que lo produjo.'
  },
  {
    title: 'Se interpreta en conjunto',
    body: 'Contrasta la señal principal con sus señales hermanas para evitar una lectura aislada.'
  },
  {
    title: 'Validación si decide algo sensible',
    body: 'Si la respuesta sostiene una decisión operativa, abre la base y revisa freshness, citas y gaps.'
  }
]

const ANSWER_BUBBLE_TRUST_CUE: NexaAnswerTrustCue = {
  tone: 'success',
  label: 'Basado en 3 fuentes actuales',
  detail: 'confianza alta · 0 filtradas por política'
}

const ANSWER_BUBBLE_ACTIONS: NexaAnswerAction[] = [
  { label: 'Abrir guía', iconClassName: 'tabler-book', kind: 'secondaryAction', variant: 'outlined', tone: 'primary' },
  { label: 'Ver base', iconClassName: 'tabler-database-search', kind: 'inlineAction', variant: 'text', tone: 'secondary' }
]

const ANSWER_BUBBLE_ACTION_PLAN_ACTIONS: NexaAnswerAction[] = [
  { label: 'Crear plan', iconClassName: 'tabler-checklist', kind: 'primaryAction' },
  { label: 'Simular escenario', iconClassName: 'tabler-arrows-diff', kind: 'secondaryAction', variant: 'outlined', tone: 'primary' }
]

const ANSWER_BUBBLE_CHART_SPEC: NexaAnswerChartSpec = {
  title: 'Señales operativas',
  helper: 'Último corte · Agosto',
  valueSuffix: 'pts',
  modes: [
    { mode: 'trend', label: 'Tendencia', ariaLabel: 'Ver tendencia de señales operativas' },
    { mode: 'comparison', label: 'Comparativo', ariaLabel: 'Ver comparativo de señales operativas' },
    { mode: 'composition', label: 'Composición', ariaLabel: 'Ver composición de señales operativas' }
  ],
  series: [
    { key: 'primarySignal', label: 'Señal principal', compactLabel: 'Principal', tone: 'primary' },
    { key: 'supportSignal', label: 'Soporte', compactLabel: 'Soporte', tone: 'secondary' },
    { key: 'qualitySignal', label: 'Calidad', compactLabel: 'Calidad', tone: 'success' }
  ],
  trend: [
    { label: 'Abr', primarySignal: 61, supportSignal: 68, qualitySignal: 64 },
    { label: 'May', primarySignal: 66, supportSignal: 70, qualitySignal: 67 },
    { label: 'Jun', primarySignal: 72, supportSignal: 73, qualitySignal: 71 },
    { label: 'Jul', primarySignal: 75, supportSignal: 76, qualitySignal: 74 },
    { label: 'Ago', primarySignal: 81, supportSignal: 78, qualitySignal: 77 }
  ],
  composition: [
    { label: 'Señal principal', value: 43, tone: 'primary' },
    { label: 'Soporte', value: 31, tone: 'secondary' },
    { label: 'Calidad', value: 26, tone: 'success' }
  ]
}

const ANSWER_BUBBLE_METRIC_SUMMARY_SPEC: NexaAnswerMetricSummarySpec = {
  title: 'Resumen ejecutivo',
  helper: 'Corte actual · comparado con el periodo anterior',
  interpretation: 'La mejora es real, pero todavía depende de sostener margen y bajar el riesgo de conversión.',
  metrics: [
    {
      id: 'revenue',
      label: 'Revenue',
      value: '$128k',
      helper: 'run-rate mensual',
      deltaLabel: '+12%',
      deltaTone: 'success',
      emphasis: true,
      trend: [
        { label: 'Abr', value: 91 },
        { label: 'May', value: 98 },
        { label: 'Jun', value: 104 },
        { label: 'Jul', value: 116 },
        { label: 'Ago', value: 128 }
      ]
    },
    {
      id: 'margin',
      label: 'Margen',
      value: '34%',
      helper: 'después de delivery',
      deltaLabel: '+3 pts',
      deltaTone: 'success',
      trend: [
        { label: 'Abr', value: 27 },
        { label: 'May', value: 29 },
        { label: 'Jun', value: 31 },
        { label: 'Jul', value: 32 },
        { label: 'Ago', value: 34 }
      ]
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      value: '$420k',
      helper: 'ponderado',
      deltaLabel: '-6%',
      deltaTone: 'warning',
      trend: [
        { label: 'Abr', value: 390 },
        { label: 'May', value: 438 },
        { label: 'Jun', value: 452 },
        { label: 'Jul', value: 447 },
        { label: 'Ago', value: 420 }
      ]
    },
    {
      id: 'risk',
      label: 'Riesgo',
      value: 'Medio',
      helper: '2 cuentas sensibles',
      deltaLabel: 'estable',
      deltaTone: 'info',
      trend: [
        { label: 'Abr', value: 42 },
        { label: 'May', value: 38 },
        { label: 'Jun', value: 44 },
        { label: 'Jul', value: 43 },
        { label: 'Ago', value: 41 }
      ]
    }
  ]
}

const ANSWER_BUBBLE_ACTION_PLAN_SPEC: NexaAnswerActionPlanSpec = {
  decisionLabel: 'Decisión sugerida',
  decisionTitle: 'Abre un plan de recuperación de 7 días.',
  decisionBody:
    'Dos cuentas sensibles explican la caída del pipeline ponderado. Valídalas antes de mover presupuesto adicional.',
  steps: [
    {
      id: 'qualify-risk',
      title: 'Valida las dos cuentas sensibles',
      body: 'Confirma stage, sponsor, bloqueo y próximo compromiso antes de mover presupuesto.'
    },
    {
      id: 'rebalance-spend',
      title: 'Reasigna gasto a oportunidades activas',
      body: 'Mantén gasto fijo bajo control y empuja solo canales con conversión reciente.'
    },
    {
      id: 'manager-check',
      title: 'Agenda revisión en 7 días',
      body: 'Si el pipeline no recupera al menos 4 pts, escala un plan con owner comercial.'
    }
  ],
  tradeOffs: [
    {
      id: 'speed',
      label: 'Se pausa expansión agresiva',
      body: 'La inversión espera hasta confirmar que el pipeline sostiene el crecimiento.',
      tone: 'caution'
    },
    {
      id: 'margin',
      label: 'Margen protegido',
      body: 'Reduce el riesgo de crecer revenue con delivery poco rentable o mal priorizado.',
      tone: 'positive'
    }
  ],
  risks: [
    {
      id: 'stale-pipeline',
      label: 'Pipeline desactualizado',
      body: 'Si los stages no están frescos, la recomendación puede subestimar riesgo.',
      severity: 'medium'
    },
    {
      id: 'sponsor-loss',
      label: 'Sponsor débil',
      body: 'Una cuenta sensible sin sponsor puede necesitar intervención ejecutiva.',
      severity: 'high'
    }
  ]
}

const ANSWERS_CANVAS_SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'design-system.nexa-answers.canvas',
  domain: 'knowledge',
  placement: 'embedded',
  dataReality: 'synthetic',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble', 'compactAnswer'],
  allowedActions: ['read', 'explain', 'drill_down']
}

const ANSWERS_CANVAS_COPY: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: 'Pregúntale a Nexa',
  idleBody: 'El canvas recibe el contexto de la surface y renderiza la respuesta sin pelear con el shell conversacional.',
  idlePlaceholder: 'Pregúntale a Nexa',
  followUpPlaceholder: 'Continúa con Nexa',
  submitLabel: 'Preguntar',
  followUpLabel: 'Enviar follow-up',
  thinkingLabel: 'Nexa está preparando la respuesta.',
  readyLabel: 'Respuesta lista',
  degradedTitle: 'Respuesta parcial',
  degradedBody: 'La evidencia no alcanza para una decisión sensible.',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: 'Intenta de nuevo o revisa la base directamente.'
}

const KnowledgeAnswerSurfaceSpecimen = () => {
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<'human' | 'nexa' | 'mcp'>('human')
  const [proofTab, setProofTab] = useState<'sources' | 'trace' | 'packet' | 'review'>('sources')
  const [question, setQuestion] = useState('¿Cómo reviso mis métricas ICO personales?')
  const [thinking, setThinking] = useState(false)
  const evidence = nexaToolResultToConversationalEvidence(KNOWLEDGE_TOOL_TRACE_SPECIMEN)

  const submit = () => {
    const nextQuestion = draft.trim()

    if (nextQuestion) {
      setQuestion(nextQuestion)
      setDraft('')
    }

    setThinking(true)
    window.setTimeout(() => setThinking(false), 650)
  }

  return (
    <NexaKnowledgeAnswerSurface<'human' | 'nexa' | 'mcp', 'sources' | 'trace' | 'packet' | 'review'>
      kind='knowledgeAnswerTrace'
      question={question}
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={submit}
      isThinking={thinking}
      commandPlaceholder='Pregúntale a Nexa'
      followUpPlaceholder='Haz otra pregunta a Nexa'
      sendLabel='Preguntar'
      mode={mode}
      modeOptions={[
        { value: 'human', label: 'Humano' },
        { value: 'nexa', label: 'Nexa' },
        { value: 'mcp', label: 'MCP' }
      ]}
      onModeChange={setMode}
      modeHelper='Modo humano: respuesta accionable con fuentes visibles.'
      modeSelectorAriaLabel='Modo de respuesta'
      traceSteps={[
        { id: 'intent', label: 'Intento detectado', description: 'Guía operativa', metadata: 'Dominio: Mi Desempeño', state: 'complete' },
        { id: 'retrieval', label: 'Retrieval', description: '3 chunks incluidos', metadata: 'Filtrados por policy: 1', state: 'complete' },
        { id: 'answer', label: 'Respuesta', description: 'Citas visibles', metadata: 'Confianza: 0.91', state: 'active' },
        { id: 'feedback', label: 'Feedback', description: 'Mejora continua', metadata: 'Listo para reportar', state: 'pending' }
      ]}
      responseTitle='Respuesta verificable'
      responseThinkingLabel='Nexa está refinando la respuesta'
      responseModeLabel={`Modo ${mode === 'human' ? 'Humano' : mode === 'nexa' ? 'Nexa' : 'MCP'}`}
      answerIntro='Entra a Mi Desempeño desde el menú principal. Ahí puedes revisar objetivos, avances por métrica ICO y acuerdos con tu líder.'
      answerSteps={[
        'Abre Mi Desempeño desde Home o el menú principal.',
        'Revisa tus objetivos activos y su avance por métrica.',
        'Filtra por período para separar completados, activos o atrasados.'
      ]}
      sourcesLabel='Fuentes'
      sources={[
        { id: 'manual', title: 'Manual: Cómo usar Mi Desempeño' },
        { id: 'glosario', title: 'Glosario: Métricas ICO personales' }
      ]}
      warningTitle='No consulté datos actuales'
      warningBody='Esta respuesta usa guías publicadas. Para ver tu estado real, consulta el módulo operativo.'
      proofTitle='Prueba y trazabilidad'
      proofTab={proofTab}
      proofTabs={[
        { value: 'sources', label: 'Fuentes' },
        { value: 'trace', label: 'Cómo llegó' },
        { value: 'packet', label: 'Paquete' },
        { value: 'review', label: 'Revisión' }
      ]}
      onProofTabChange={setProofTab}
      proofTabsAriaLabel='Prueba y trazabilidad'
      evidence={proofTab === 'sources' || proofTab === 'trace' ? evidence ?? undefined : undefined}
      evidenceFeedbackEnabled={false}
      proofContent={
        <Stack spacing={1.5}>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {proofTab === 'packet' ? 'knowledge-search.v1' : 'Golden question: passed'}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Specimen vivo de la primera kind transversal de respuestas Nexa para Knowledge.
          </Typography>
        </Stack>
      }
    />
  )
}

const NexaAnswerBubbleSpecimen = () => {
  const [proofOpen, setProofOpen] = useState(false)

  return (
    <NexaAnswerBubble
      kind='surfaceChartInsight'
      title='La señal principal mejora, pero debe leerse con soporte y calidad.'
      body='La variante chart prioriza el gráfico y deja la evidencia como trust cue compacto para no desplazar el composer conversacional.'
      metaLabel='Answer-first · chart bubble · proof bajo demanda'
      points={ANSWER_BUBBLE_POINTS}
      actions={ANSWER_BUBBLE_ACTIONS}
      trustCue={ANSWER_BUBBLE_TRUST_CUE}
      proofOpen={proofOpen}
      onProofToggle={() => setProofOpen(current => !current)}
      chart={ANSWER_BUBBLE_CHART_SPEC}
    />
  )
}

const NexaAnswerMetricSummarySpecimen = () => {
  const [proofOpen, setProofOpen] = useState(false)

  return (
    <NexaAnswerBubble
      kind='financeMetricSummary'
      title='Revenue sube, pero el pipeline empieza a enfriarse.'
      body='La lectura ejecutiva no necesita un chart grande: Nexa resume qué cambió, cuánto importa y dónde mirar después.'
      metaLabel='Metric summary · executive read'
      points={ANSWER_BUBBLE_POINTS}
      actions={ANSWER_BUBBLE_ACTIONS}
      trustCue={ANSWER_BUBBLE_TRUST_CUE}
      proofOpen={proofOpen}
      onProofToggle={() => setProofOpen(current => !current)}
      metricSummary={ANSWER_BUBBLE_METRIC_SUMMARY_SPEC}
    />
  )
}

const NexaAnswerActionPlanSpecimen = () => {
  const [proofOpen, setProofOpen] = useState(false)

  return (
    <NexaAnswerBubble
      kind='commercialActionPlan'
      title='No aceleres gasto todavía.'
      body='Revenue y margen mejoran, pero el pipeline ponderado cae 6%. La señal pide una acción corta, medible y reversible antes de comprometer presupuesto.'
      metaLabel='Recomendación operativa · requiere aprobación'
      points={ANSWER_BUBBLE_POINTS}
      actions={ANSWER_BUBBLE_ACTION_PLAN_ACTIONS}
      trustCue={ANSWER_BUBBLE_TRUST_CUE}
      proofOpen={proofOpen}
      onProofToggle={() => setProofOpen(current => !current)}
      actionPlan={ANSWER_BUBBLE_ACTION_PLAN_SPEC}
    />
  )
}

const NexaAnswersCanvasSpecimen = () => {
  const [draft, setDraft] = useState('')
  const [proofOpen, setProofOpen] = useState(false)
  const evidence = nexaToolResultToConversationalEvidence(KNOWLEDGE_TOOL_TRACE_SPECIMEN)

  const renderPlan: NexaAnswersRenderPlan = {
    id: 'design-system-nexa-answers-canvas-plan',
    version: 'nexa-answer-render-plan.v1',
    intent: 'diagnose',
    autonomyTier: 'observeOnly',
    primaryBlockId: 'chart-answer',
    trustCue: ANSWER_BUBBLE_TRUST_CUE,
    actions: ANSWER_BUBBLE_ACTIONS.map((action, index) => ({
      ...action,
      id: `canvas-action-${index + 1}`,
      intent: index === 0 ? 'openSource' : 'drillDown',
      riskLevel: 'low'
    })),
    proof: {
      id: 'design-system-proof',
      label: 'Base',
      collapsedLabel: 'Ver base',
      expandedLabel: 'Ocultar base',
      evidence: evidence ?? undefined
    },
    blocks: [
      {
        id: 'chart-answer',
        renderer: 'answerBubble',
        rendererVersion: 'v1',
        kind: 'surfaceChartInsight',
        title: 'El canvas deja que el gráfico sea protagonista.',
        body: 'La copia contextual acompaña la lectura; el proof queda bajo demanda y el composer permanece visible para continuar.',
        metaLabel: 'Nexa Answers Canvas · render plan v1',
        points: ANSWER_BUBBLE_POINTS,
        chart: ANSWER_BUBBLE_CHART_SPEC
      }
    ]
  }

  return (
    <NexaAnswersCanvas
      kind='knowledgeEmbedded'
      state={proofOpen ? 'proofOpen' : 'answered'}
      surfaceContext={ANSWERS_CANVAS_SURFACE_CONTEXT}
      renderPlan={renderPlan}
      question='¿Qué está pasando con estas señales operativas?'
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={() => setDraft('')}
      proofOpen={proofOpen}
      onProofToggle={() => setProofOpen(current => !current)}
      copy={ANSWERS_CANVAS_COPY}
    />
  )
}

const NexaChatLabView = () => (
  <Box
    data-capture='nexa-chat-lab'
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    {/* Header */}
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
      <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }} />
      <Typography variant='overline' color='primary'>
        Nexa Chat Pattern
      </Typography>
      <Typography variant='h4'>Nexa Chat</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        La superficie conversacional canónica de Nexa. Es un <strong>patrón compuesto</strong> (organismo), no una primitive
        suelta: compone un header de presencia, un rail de historial glass, el cuerpo de conversación, el empty hero y el
        composer. Las superficies donde aparece Nexa (botón flotante global, Home, futuros sidecars) deben reusar este
        patrón y sus <InlineCode>primitives</InlineCode>, sin forkear chats paralelos. Spec: <InlineCode>{TASK_REF}</InlineCode>.
      </Typography>
      <Box>
        <Button variant='contained' size='small' href={MOCKUP_ROUTE} startIcon={<i className='tabler-external-link' />}>
          Abrir el specimen vivo
        </Button>
      </Box>
    </Stack>

    {/* Clasificación */}
    <Section eyebrow='Clasificación' title='Patrón compuesto (composition)'>
      <Card>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='body2'>
            <strong>Es:</strong> un patrón / composición platform-level (igual categoría que <InlineCode>NexaInsightsBlock</InlineCode>).
            Ensambla primitives en un organismo reusable.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            <strong>No es:</strong> una primitive única (tiene 5 regiones), ni un componente por-superficie (no se forkea
            por pantalla). Sus átomos sí son primitives (<InlineCode>NexaGlowBorder</InlineCode> y los que se extraerán).
          </Typography>
        </Stack>
      </Card>
    </Section>

    {/* Anatomía */}
    <Section eyebrow='Anatomía' title='Las 5 regiones'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {ANATOMY.map(item => (
          <Card key={item.region}>
            <Typography variant='subtitle2'>{item.region}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              {item.detail}
            </Typography>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Primitives que lo componen */}
    <Section eyebrow='Composición' title='Primitives y piezas que lo forman'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {COMPOSED_OF.map(item => (
          <Card key={item.name}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} alignItems={{ sm: 'center' }} justifyContent='space-between'>
              <Box>
                <InlineCode>{item.name}</InlineCode>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  {item.role}
                </Typography>
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0, fontWeight: 600 }}>
                {item.status}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Specimen vivo — los átomos extraídos, renderizados */}
    <Section eyebrow='Specimen' title='Átomos vivos'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {/* NexaFace */}
        <Card>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaFace</InlineCode> — variants
          </Typography>
          <Stack direction='row' spacing={3} alignItems='flex-end' flexWrap='wrap'>
            <Stack spacing={0.5} alignItems='center'>
              <NexaFace variant='hero' />
              <Typography variant='caption' color='text.secondary'>hero · 76</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems='center'>
              <NexaFace variant='header' />
              <Typography variant='caption' color='text.secondary'>header · 44</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems='center'>
              <NexaFace variant='message' />
              <Typography variant='caption' color='text.secondary'>message · 32</Typography>
            </Stack>
          </Stack>
        </Card>

        {/* NexaSenderMark — avatar por-mensaje (disco navy, se ve sobre paper) */}
        <Card>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaSenderMark</InlineCode> — avatar por-mensaje
          </Typography>
          <Stack direction='row' spacing={3} alignItems='center' flexWrap='wrap'>
            <Stack spacing={0.5} alignItems='center'>
              <NexaSenderMark />
              <Typography variant='caption' color='text.secondary'>default · 28</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems='center'>
              <NexaSenderMark size={40} />
              <Typography variant='caption' color='text.secondary'>size 40</Typography>
            </Stack>
          </Stack>
        </Card>

        {/* NexaPresenceMark — sobre navy (su contexto real es el header) */}
        <Card>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaPresenceMark</InlineCode> — estados
          </Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap'>
            {[
              { thinking: false, label: 'reposo' },
              { thinking: true, label: 'pensando' }
            ].map(s => (
              <Stack key={s.label} spacing={0.5} alignItems='center'>
                <Box sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy }}>
                  <NexaPresenceMark thinking={s.thinking} />
                </Box>
                <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Card>

        {/* NexaComposer — la unidad completa (presentacional; sin runtime cableado acá) */}
        <Card>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaComposer</InlineCode> — unidad (glow + input + botón + disclaimer)
          </Typography>
          <NexaComposer disclaimer='Nexa analiza tus datos en tiempo real. Verifica antes de una decisión crítica.'>
            <NexaComposerInput
              placeholder='Pregúntale a Nexa sobre tu operación…'
              endAdornment={<NexaComposerActionButton variant='send' aria-label='Enviar mensaje' />}
            />
          </NexaComposer>
          <Box sx={{ mt: 3, maxInlineSize: 720 }} data-capture='nexa-composer-command-variant'>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
              <InlineCode>kind=&apos;knowledgeAsk&apos;</InlineCode> — command input con Nexa mark + shortcut ↵
            </Typography>
            <NexaComposer kind='knowledgeAsk'>
              <NexaComposerInput
                kind='knowledgeAsk'
                placeholder='Pregúntale a Nexa'
                actionAdornment={<NexaComposerActionButton variant='send' icon='search' aria-label='Preguntar' />}
              />
            </NexaComposer>
          </Box>
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 2 }}>
            <Typography variant='caption' color='text.secondary'>
              <InlineCode>NexaComposerActionButton</InlineCode>:
            </Typography>
            <Stack spacing={0.5} alignItems='center'>
              <NexaComposerActionButton variant='send' aria-label='Enviar mensaje' />
              <Typography variant='caption' color='text.secondary'>send</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems='center'>
              <NexaComposerActionButton variant='send' icon='search' aria-label='Preguntar' />
              <Typography variant='caption' color='text.secondary'>search</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems='center'>
              <NexaComposerActionButton variant='stop' aria-label='Detener generación' />
              <Typography variant='caption' color='text.secondary'>stop</Typography>
            </Stack>
          </Stack>
        </Card>

        <Box data-capture='nexa-knowledge-answer-surface-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaKnowledgeAnswerSurface</InlineCode> — pregunta, respuesta y prueba sin salto abrupto
          </Typography>
          <KnowledgeAnswerSurfaceSpecimen />
        </Box>

        <Box data-capture='nexa-answer-bubble-chart-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaAnswerBubble</InlineCode> — variante chart reusable
          </Typography>
          <NexaAnswerBubbleSpecimen />
        </Box>

        <Box data-capture='nexa-answer-bubble-metric-summary-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaAnswerBubble</InlineCode> — variante metricSummary
          </Typography>
          <NexaAnswerMetricSummarySpecimen />
        </Box>

        <Box data-capture='nexa-answer-bubble-action-plan-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaAnswerBubble</InlineCode> — variante actionPlan
          </Typography>
          <NexaAnswerActionPlanSpecimen />
        </Box>

        <Box data-capture='nexa-answers-canvas-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>NexaAnswersCanvas</InlineCode> — canvas transversal renderPlan/runtime
          </Typography>
          <NexaAnswersCanvasSpecimen />
        </Box>

        <Box data-capture='nexa-knowledge-tool-trace-specimen' sx={{ scrollMarginBlockStart: { xs: 19, md: 13 } }}>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            <InlineCode>search_knowledge</InlineCode> — evidence card del packet real debajo de la respuesta
          </Typography>
          <NexaKnowledgeToolTraceCard result={KNOWLEDGE_TOOL_TRACE_SPECIMEN} feedbackEnabled={false} />
        </Box>
      </Stack>
    </Section>

    {/* Modos */}
    <Section eyebrow='Modos de interacción' title='Dock / Expandible / Lane'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {MODES.map(item => (
          <Card key={item.mode}>
            <Typography variant='subtitle2'>{item.mode}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              {item.detail}
            </Typography>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Reglas */}
    <Section eyebrow='Reglas de uso' title='Hacer / No hacer'>
      <Card>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='body2'>✓ Reusar este patrón + sus primitives en toda superficie donde aparezca Nexa.</Typography>
          <Typography variant='body2'>✓ Para respuestas con evidencia, usar <InlineCode>NexaKnowledgeAnswerSurface</InlineCode> y su kind inicial <InlineCode>knowledgeAnswerTrace</InlineCode>.</Typography>
          <Typography variant='body2'>✓ Empty hero: saludo rotativo + prompts contextuales (por ruta/entidad/rol) + firma Efeonce solo aquí.</Typography>
          <Typography variant='body2'>✓ Composer siempre vía <InlineCode>NexaComposer</InlineCode> (que envuelve <InlineCode>NexaGlowBorder</InlineCode>); cero hardcode (tokens AXIS + brand Nexa SSOT + escala SoT).</Typography>
          <Typography variant='body2' color='error.main'>✗ No crear un chat de Nexa paralelo por pantalla ni reimplementar el composer/rail.</Typography>
          <Typography variant='body2' color='error.main'>✗ No usar la firma Efeonce fuera del empty state ni la cara real per-mensaje (ahí va el mark).</Typography>
        </Stack>
      </Card>
    </Section>
  </Box>
)

export default NexaChatLabView
