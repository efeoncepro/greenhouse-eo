'use client'

import { useState, type ChangeEvent, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  GreenhouseButton,
  GreenhouseSpectrumBeam,
  NexaAnswerBubble,
  NexaAnswersCanvas,
  NexaComposer,
  NexaComposerInput,
  NexaComposerActionButton,
  NexaConversationBubble,
  NexaFace,
  NexaKnowledgeAnswerSurface,
  NexaPresenceMark,
  NexaPromptDock,
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
  NexaAnswersSurfaceContext,
  NexaExpressiveTextValue
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

const Section = ({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) => (
  <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup}>
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline}>
      <Typography variant='overline' color='primary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
      {description ? (
        <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
          {description}
        </Typography>
      ) : null}
    </Stack>
    {children}
  </Stack>
)

const Card = ({ children, density = 'normal' }: { children: ReactNode; density?: 'normal' | 'compact' }) => (
  <MuiCard
    variant='outlined'
    sx={theme => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper',
      boxShadow: 'none'
    })}
  >
    <CardContent
      sx={{
        p: density === 'compact' ? DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup : DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
        '&:last-child': {
          pb: density === 'compact' ? DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup : DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset
        }
      }}
    >
      {children}
    </CardContent>
  </MuiCard>
)

const SpecimenFrame = ({
  capture,
  eyebrow,
  title,
  description,
  children
}: {
  capture: string
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) => (
  <Box
    data-capture={capture}
    sx={theme => ({
      overflow: 'hidden',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper',
      scrollMarginBlockStart: { xs: 19, md: 13 }
    })}
  >
    <Box
      sx={theme => ({
        px: { xs: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset, md: 5 },
        py: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
        borderBlockEnd: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleFill)
      })}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent='space-between'>
        <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
          <Typography variant='caption' color='text.secondary'>
            {eyebrow}
          </Typography>
          <Typography variant='h5'>{title}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 760 }}>
            {description}
          </Typography>
        </Stack>
        <CustomChip label='Specimen vivo' size='small' variant='tonal' color='primary' round='true' />
      </Stack>
    </Box>
    <Box sx={{ p: { xs: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset } }}>
      {children}
    </Box>
  </Box>
)

const MetaTile = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
      border: `1px solid ${alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleBorder)}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: alpha(theme.palette.background.paper, 0.72)
    })}
  >
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
)

const NexaMessageComposerSpectrumSpecimen = ({ dataCapture }: { dataCapture: string }) => {
  const [prompt, setPrompt] = useState('')
  const hasText = prompt.trim().length > 0
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPrompt(event.target.value)

  return (
    <Box
      data-capture={dataCapture}
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
          value={prompt}
          onChange={handlePromptChange}
          placeholder='Pregúntale a Nexa'
          inputProps={{ 'data-capture': 'nexa-composer-spectrum-input' }}
          actionAdornment={<NexaComposerActionButton variant='send' aria-label='Enviar mensaje a Nexa' disabled={!hasText} />}
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
}

const LAB_STATUS = [
  { label: 'Familia', value: 'Conversational UI' },
  { label: 'Owner', value: 'Nexa platform' },
  { label: 'Estado', value: 'Hardening' },
  { label: 'Evidencia', value: 'GVC desktop + mobile' }
]

const REVIEW_AREAS = [
  { label: 'Átomos', value: 'Face, sender, presence y composer' },
  { label: 'Answers', value: 'Trace, canvas, chart, metric y action plan' },
  { label: 'Contrato', value: 'Kinds, variants, evidence y no-forks' }
]

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
  { name: 'NexaConversationBubble', role: 'Bubble conversacional base: pregunta de usuario, thinking, texto simple, follow-up y notices de estado/confianza.', status: 'Primitive canónica ✅' },
  { name: 'NexaAnswerBubble', role: 'Bubble answer-turn enriquecida: variants explanation/chart/metricSummary/actionPlan para respuestas estructuradas.', status: 'Primitive canónica ✅' },
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

const expressiveText = (segments: Exclude<NexaExpressiveTextValue, string>) => segments

const ANSWER_BUBBLE_POINTS: NexaAnswerPoint[] = [
  {
    title: expressiveText([{ text: 'Resultado antes que actividad', style: 'strong' }]),
    body: expressiveText([
      { text: 'Lee primero ', style: 'soft' },
      { text: 'qué cambió', style: 'strong' },
      { text: ' para cliente, equipo u operación; después mira la actividad que lo produjo.' }
    ])
  },
  {
    title: 'Se interpreta en conjunto',
    body: expressiveText([
      { text: 'Contrasta la señal principal con sus señales hermanas para evitar una lectura ', style: 'soft' },
      { text: 'aislada', style: 'warning' },
      { text: '.' }
    ])
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

const CONVERSATION_FOLLOW_UP_ACTIONS: NexaAnswerAction[] = [
  { label: 'Preguntar esto', iconClassName: 'tabler-arrow-up-right', kind: 'inlineAction', variant: 'text', tone: 'primary' },
  { label: 'Abrir en chat', iconClassName: 'tabler-message-circle', kind: 'secondaryAction', variant: 'outlined', tone: 'primary' }
]

const ANSWER_BUBBLE_CHART_SPEC: NexaAnswerChartSpec = {
  title: expressiveText([{ text: 'Señales operativas', style: 'strong' }]),
  helper: expressiveText([{ text: 'Último corte', style: 'soft' }, { text: ' · ' }, { text: 'Agosto', style: 'metric' }]),
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
  allowedRenderers: ['conversationBubble', 'answerBubble', 'compactAnswer'],
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
  streamingLabel: 'Nexa está escribiendo la respuesta.',
  readyLabel: 'Respuesta lista',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: 'La evidencia no alcanza para una decisión sensible.',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: 'Intenta de nuevo o revisa la base directamente.'
}

const KnowledgeAnswerSurfaceSpecimen = () => {
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<'human' | 'nexa' | 'mcp'>('human')
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
    <NexaKnowledgeAnswerSurface<'human' | 'nexa' | 'mcp'>
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
      proofTabs={[
        { id: 'sources', label: 'Fuentes', builtin: 'sources' },
        { id: 'trace', label: 'Cómo llegó', builtin: 'trace' },
        { id: 'packet', label: 'Paquete', builtin: 'packet' },
        {
          id: 'review',
          label: 'Revisión',
          content: (
            <Stack spacing={1.5}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                Golden question: passed
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Specimen vivo de la primera kind transversal de respuestas Nexa para Knowledge.
              </Typography>
            </Stack>
          )
        }
      ]}
      proofTabsAriaLabel='Prueba y trazabilidad'
      evidence={evidence ?? undefined}
      evidenceFeedbackEnabled={false}
    />
  )
}

const NexaAnswerBubbleSpecimen = () => {
  const [proofOpen, setProofOpen] = useState(false)

  return (
    <NexaAnswerBubble
      kind='surfaceChartInsight'
      title={expressiveText([{ text: 'La señal principal mejora', style: 'positive' }, { text: ', pero debe leerse con soporte y calidad.' }])}
      body={expressiveText([
        { text: 'La variante chart prioriza el gráfico y deja la evidencia como trust cue compacto para no desplazar el composer conversacional.', style: 'soft' }
      ])}
      metaLabel={expressiveText([{ text: 'Answer-first', style: 'strong' }, { text: ' · chart bubble · proof bajo demanda', style: 'soft' }])}
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
      title={expressiveText([{ text: 'Revenue sube', style: 'positive' }, { text: ', pero el pipeline empieza a enfriarse.', style: 'warning' }])}
      body={expressiveText([
        { text: 'La lectura ejecutiva no necesita un chart grande: Nexa resume ', style: 'soft' },
        { text: 'qué cambió', style: 'strong' },
        { text: ', cuánto importa y dónde mirar después.' }
      ])}
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
      title={expressiveText([{ text: 'No aceleres gasto todavía', style: 'warning' }, { text: '.' }])}
      body={expressiveText([
        { text: 'Revenue y margen mejoran, pero el pipeline ponderado cae ', style: 'soft' },
        { text: '6%', style: 'metric' },
        { text: '. La señal pide una acción corta, medible y reversible antes de comprometer presupuesto.' }
      ])}
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

const NexaConversationBubbleSpecimen = () => (
  <Box
    sx={theme => ({
      p: { xs: 3, md: 4 },
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)}, ${alpha(theme.palette.background.default, 0.52)})`
    })}
  >
    <Stack spacing={3}>
      <NexaConversationBubble
        kind='surfaceUserQuestion'
        body='¿Qué debería revisar antes de mover presupuesto a esta campaña?'
        metaLabel='Comercial · campaña Q3'
        senderLabel='Julio'
      />
      <NexaConversationBubble
        kind='nexaThinking'
        body='Leyendo pipeline, margen y riesgo de cuentas sensibles'
        thinkingLabel='Leyendo pipeline, margen y riesgo de cuentas sensibles'
      />
      <NexaConversationBubble
        kind='nexaText'
        title={expressiveText([{ text: 'Revisa primero ', style: 'soft' }, { text: 'la calidad del pipeline', style: 'strong' }, { text: '.' }])}
        body={expressiveText([
          { text: 'La señal de revenue mejora, pero ', style: 'soft' },
          { text: 'dos cuentas sensibles', style: 'warning' },
          { text: ' concentran el riesgo. Antes de mover presupuesto, valida stage, sponsor y fecha de próximo compromiso.' }
        ])}
        metaLabel='Respuesta simple · sin rich canvas'
      />
      <NexaConversationBubble
        kind='nexaFollowUp'
        title={expressiveText([{ text: 'Puedes continuar ', style: 'strong' }, { text: 'con una pregunta más precisa.' }])}
        body={expressiveText([
          { text: 'Nexa puede comparar el riesgo por canal o convertir esta lectura en un ', style: 'soft' },
          { text: 'plan corto', style: 'metric' },
          { text: ' con aprobación.' }
        ])}
        actions={CONVERSATION_FOLLOW_UP_ACTIONS}
      />
      <NexaConversationBubble
        kind='staleData'
        title='Datos con frescura limitada'
        body='La recomendación usa el último corte disponible. Si la decisión mueve presupuesto, confirma que los stages estén actualizados.'
      />
    </Stack>
  </Box>
)

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
        title: expressiveText([{ text: 'El canvas deja que el gráfico sea protagonista', style: 'strong' }, { text: '.' }]),
        body: expressiveText([
          { text: 'La copia contextual acompaña la lectura; el proof queda bajo demanda y el composer permanece ', style: 'soft' },
          { text: 'visible', style: 'positive' },
          { text: ' para continuar.' }
        ]),
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
      gap: { xs: 4, md: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap },
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    <Box
      sx={theme => ({
        p: { xs: 4, md: 6 },
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)}, ${alpha(
          theme.palette.primary.main,
          DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface
        )})`
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)' },
          gap: { xs: 4, md: 6 },
          alignItems: 'start'
        }}
      >
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
          <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }} />
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <CustomChip label='Nexa Chat Pattern' size='small' variant='tonal' color='primary' round='true' />
            <CustomChip label={TASK_REF} size='small' variant='tonal' color='secondary' round='true' />
          </Stack>
          <Typography variant='h4'>Nexa Chat</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
            La superficie conversacional canónica de Nexa. Es un <strong>patrón compuesto</strong> (organismo), no una primitive
            suelta: compone presencia, historial, conversación, empty hero y composer. Toda surface donde aparece Nexa debe
            reusar este patrón y sus <InlineCode>primitives</InlineCode>, sin chats paralelos.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <GreenhouseButton
              kind='primaryAction'
              size='small'
              href={MOCKUP_ROUTE}
              leadingIcon={<i className='tabler-external-link' />}
            >
              Abrir specimen vivo
            </GreenhouseButton>
            <Typography variant='caption' color='text.secondary'>
              Ruta interna de revisión · captura GVC disponible para desktop y mobile.
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {LAB_STATUS.map(item => (
              <MetaTile key={item.label} label={item.label} value={item.value} />
            ))}
          </Box>
          <Card density='compact'>
            <Stack spacing={1.5}>
              <Typography variant='h5'>Mapa de revisión</Typography>
              {REVIEW_AREAS.map(item => (
                <Stack key={item.label} direction='row' spacing={1.5} alignItems='flex-start'>
                  <Box
                    sx={theme => ({
                      inlineSize: DESIGN_SYSTEM_LAB_TOKENS.icon.badgeContainer,
                      blockSize: DESIGN_SYSTEM_LAB_TOKENS.icon.badgeContainer,
                      borderRadius: '9999px',
                      bgcolor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface),
                      color: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    })}
                  >
                    <i className='tabler-check' />
                  </Box>
                  <Box sx={{ minInlineSize: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.value}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Box>
    </Box>

    {/* Clasificación */}
    <Section
      eyebrow='Clasificación'
      title='Patrón compuesto, primitives gobernadas'
      description='La página separa contrato, anatomía y specimen para que cada primitive pueda revisarse sin perder el patrón completo.'
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
        <Card>
          <Stack spacing={1.5}>
            <CustomChip label='Es' size='small' variant='tonal' color='success' round='true' sx={{ alignSelf: 'flex-start' }} />
            <Typography variant='body2'>
              Un patrón / composición platform-level, igual categoría que <InlineCode>NexaInsightsBlock</InlineCode>. Ensambla
              primitives en un organismo reusable con contrato visual y funcional.
            </Typography>
          </Stack>
        </Card>
        <Card>
          <Stack spacing={1.5}>
            <CustomChip label='No es' size='small' variant='tonal' color='warning' round='true' sx={{ alignSelf: 'flex-start' }} />
            <Typography variant='body2' color='text.secondary'>
              No es una primitive única ni un componente por-superficie. Sus átomos sí son primitives; el chat completo no se
              forkea por pantalla.
            </Typography>
          </Stack>
        </Card>
      </Box>
    </Section>

    <Section eyebrow='Anatomía' title='Las 5 regiones' description='Cada región tiene una responsabilidad visual y de interacción distinta.'>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 2 }}>
        {ANATOMY.map((item, index) => (
          <Card key={item.region} density='compact'>
            <Stack spacing={1.5}>
              <Typography variant='monoId' color='primary.main'>
                {String(index + 1).padStart(2, '0')}
              </Typography>
              <Typography variant='subtitle2'>{item.region}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {item.detail}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Box>
    </Section>

    <Section
      eyebrow='Composición'
      title='Primitives y piezas que lo forman'
      description='El grid deja visible qué ya es primitive canónica y qué sigue perteneciendo al patrón compuesto.'
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {COMPOSED_OF.map(item => (
          <Card key={item.name} density='compact'>
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                <InlineCode>{item.name}</InlineCode>
                <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0, fontWeight: 600 }}>
                  {item.status}
                </Typography>
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                {item.role}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Box>
    </Section>

    <Section
      eyebrow='Átomos base'
      title='Presencia, identidad y composer'
      description='Estos controles son los bloques chicos que deben mantenerse consistentes antes de revisar respuestas más grandes.'
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
        <Card>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant='h5'>
                <InlineCode>NexaFace</InlineCode> · variants
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                La cara real se reserva para presencia, no para cada mensaje.
              </Typography>
            </Stack>
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
          </Stack>
        </Card>

        <Card>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant='h5'>
                <InlineCode>NexaSenderMark</InlineCode> · avatar por-mensaje
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Marca compacta para mensajes y bubbles, sin duplicar la cara real.
              </Typography>
            </Stack>
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
          </Stack>
        </Card>

        <Card>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant='h5'>
                <InlineCode>NexaPresenceMark</InlineCode> · estados
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Estado vivo para header sobre navy, con reduced motion horneado.
              </Typography>
            </Stack>
            <Stack direction='row' spacing={2} flexWrap='wrap'>
              {[
                { thinking: false, label: 'reposo' },
                { thinking: true, label: 'pensando' }
              ].map(s => (
                <Stack key={s.label} spacing={0.5} alignItems='center'>
                  <Box
                    sx={theme => ({
                      px: 2,
                      py: 1,
                      borderRadius: `${theme.shape.customBorderRadius.md}px`,
                      bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
                    })}
                  >
                    <NexaPresenceMark thinking={s.thinking} />
                  </Box>
                  <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Card>

        <Card>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant='h5'>
                <InlineCode>NexaComposerActionButton</InlineCode>
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Acciones compactas para enviar, buscar o detener generación dentro del composer.
              </Typography>
            </Stack>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
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
          </Stack>
        </Card>
      </Box>
    </Section>

    <Section
      eyebrow='Composer'
      title='Glow + input + acción'
      description='El composer es una unidad: el input no pinta su propia caja y el glow gobierna el foco visual.'
    >
      <SpecimenFrame
        capture='nexa-composer-command-variant'
        eyebrow='Primitive'
        title='NexaComposer'
        description='Unidad completa para chat y command input; presenta el glow, el placeholder, el botón y el disclaimer.'
      >
        <Stack spacing={3}>
          <NexaComposer disclaimer='Nexa analiza tus datos en tiempo real. Verifica antes de una decisión crítica.'>
            <NexaComposerInput
              placeholder='Pregúntale a Nexa sobre tu operación…'
              endAdornment={<NexaComposerActionButton variant='send' aria-label='Enviar mensaje' />}
            />
          </NexaComposer>
          <Divider />
          <Stack spacing={1}>
            <Typography variant='caption' color='text.secondary'>
              <InlineCode>kind=&apos;knowledgeAsk&apos;</InlineCode> · command input con Nexa mark + shortcut ↵
            </Typography>
            <NexaComposer kind='knowledgeAsk'>
              <NexaComposerInput
                kind='knowledgeAsk'
                placeholder='Pregúntale a Nexa'
                actionAdornment={<NexaComposerActionButton variant='send' icon='search' aria-label='Preguntar' />}
              />
            </NexaComposer>
          </Stack>
          <Divider />
          <Stack spacing={2}>
            <Typography variant='caption' color='text.secondary'>
              <InlineCode>GreenhouseSpectrumBeam</InlineCode> · caja de envío lab-only con estado automático
            </Typography>
            <NexaMessageComposerSpectrumSpecimen
              dataCapture='nexa-composer-spectrum-unified'
            />
          </Stack>
        </Stack>
      </SpecimenFrame>
    </Section>

    <Section
      eyebrow='Prompt dock'
      title='Dock compacto → panel de pregunta'
      description='El patrón del prompt externo vive como primitive Nexa: apertura contextual, foco, Escape/click-outside y submit con atajo.'
    >
      <SpecimenFrame
        capture='nexa-prompt-dock-specimen'
        eyebrow='Composition primitive'
        title='NexaPromptDock'
        description='Morfología compacta para pedirle algo a Nexa sin invadir el canvas principal; reusa NexaComposer y el mark animado.'
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px, 0.72fr) minmax(320px, 1fr)' },
            gap: 4,
            alignItems: 'start'
          }}
        >
          <Stack spacing={2}>
            <Typography variant='caption' color='text.secondary'>
              <InlineCode>kind=&apos;quickAsk&apos;</InlineCode> · estado cerrado
            </Typography>
            <NexaPromptDock
              kind='quickAsk'
              helperText='Ideal para docks flotantes o entrypoints de asistencia rápida.'
            />
          </Stack>
          <Stack spacing={2}>
            <Typography variant='caption' color='text.secondary'>
              <InlineCode>kind=&apos;knowledgeAsk&apos;</InlineCode> · panel abierto
            </Typography>
            <NexaPromptDock
              kind='knowledgeAsk'
              defaultOpen
              defaultValue='¿Qué cambió en este corpus desde el último corte?'
              helperText='Cmd/Ctrl + Enter envía; Escape cierra sin perder el contrato a11y.'
              sx={{ maxInlineSize: 'none' }}
            />
          </Stack>
        </Box>
      </SpecimenFrame>
    </Section>

    <Section
      eyebrow='Surfaces de respuesta'
      title='Specimens vivos para revisar primitives'
      description='Cada specimen queda dentro de un frame con propósito explícito; así el reviewer puede mirar una primitive a la vez.'
    >
      <Stack spacing={3}>
        <SpecimenFrame
          capture='nexa-knowledge-answer-surface-specimen'
          eyebrow='Composition primitive'
          title='NexaKnowledgeAnswerSurface'
          description='Pregunta, respuesta, composer descendido y prueba verificable para Knowledge.'
        >
          <KnowledgeAnswerSurfaceSpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-conversation-bubble-specimen'
          eyebrow='Primitive'
          title='NexaConversationBubble'
          description='Bubbles base para pregunta, thinking, texto simple, follow-up y notices de confianza.'
        >
          <NexaConversationBubbleSpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-answer-bubble-chart-specimen'
          eyebrow='Primitive · answer turn'
          title='NexaAnswerBubble · chart'
          description='Respuesta enriquecida donde el gráfico es protagonista y el proof queda bajo demanda.'
        >
          <NexaAnswerBubbleSpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-answer-bubble-metric-summary-specimen'
          eyebrow='Primitive · answer turn'
          title='NexaAnswerBubble · metricSummary'
          description='Lectura ejecutiva compacta para 2 a 4 métricas con delta, mini trend e interpretación.'
        >
          <NexaAnswerMetricSummarySpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-answer-bubble-action-plan-specimen'
          eyebrow='Primitive · answer turn'
          title='NexaAnswerBubble · actionPlan'
          description='Recomendación accionable con decisión sugerida, pasos, trade-offs, riesgos y CTAs.'
        >
          <NexaAnswerActionPlanSpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-answers-canvas-specimen'
          eyebrow='Primitive · orchestration'
          title='NexaAnswersCanvas'
          description='Canvas transversal para renderPlan/runtime con proof, composer y registry de renderers.'
        >
          <NexaAnswersCanvasSpecimen />
        </SpecimenFrame>

        <SpecimenFrame
          capture='nexa-knowledge-tool-trace-specimen'
          eyebrow='Runtime renderer'
          title='search_knowledge evidence card'
          description='Renderer del packet real debajo de una respuesta Nexa, con fuentes y feedback desactivado en el lab.'
        >
          <NexaKnowledgeToolTraceCard result={KNOWLEDGE_TOOL_TRACE_SPECIMEN} feedbackEnabled={false} />
        </SpecimenFrame>
      </Stack>
    </Section>

    {/* Modos */}
    <Section eyebrow='Modos de interacción' title='Dock / Expandible / Lane'>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {MODES.map(item => (
          <Card key={item.mode} density='compact'>
            <Typography variant='subtitle2'>{item.mode}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              {item.detail}
            </Typography>
          </Card>
        ))}
      </Box>
    </Section>

    {/* Reglas */}
    <Section eyebrow='Reglas de uso' title='Hacer / No hacer'>
      <Card>
        <Stack spacing={2}>
          {[
            'Reusar este patrón + sus primitives en toda superficie donde aparezca Nexa.',
            'Para respuestas con evidencia, usar NexaKnowledgeAnswerSurface y su kind inicial knowledgeAnswerTrace.',
            'Empty hero: saludo rotativo + prompts contextuales por ruta, entidad o rol; firma Efeonce solo ahí.',
            'Composer siempre vía NexaComposer; cero hardcode fuera de tokens AXIS + brand Nexa SSOT + escala SoT.'
          ].map(rule => (
            <Stack key={rule} direction='row' spacing={1.5} alignItems='flex-start'>
              <CustomChip label='Hacer' size='small' variant='tonal' color='success' round='true' />
              <Typography variant='body2'>{rule}</Typography>
            </Stack>
          ))}
          <Divider />
          {[
            'No crear un chat de Nexa paralelo por pantalla ni reimplementar el composer o el rail.',
            'No usar la firma Efeonce fuera del empty state ni la cara real por mensaje; ahí va NexaSenderMark.'
          ].map(rule => (
            <Stack key={rule} direction='row' spacing={1.5} alignItems='flex-start'>
              <CustomChip label='Evitar' size='small' variant='tonal' color='error' round='true' />
              <Typography variant='body2' color='error.main'>
                {rule}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Section>
  </Box>
)

export default NexaChatLabView
