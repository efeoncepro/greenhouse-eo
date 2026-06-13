'use client'

import { useState, type ChangeEvent } from 'react'

import { flushSync } from 'react-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import {
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseNexaBrandMark,
  GreenhouseShinyBorder,
  GreenhouseSpectrumBeam,
  NexaAnswersCanvas,
  NexaComposerActionButton,
  NexaComposerInput,
  NexaMomentComposition,
  type NexaAnswersCanvasCopy,
  type NexaAnswersRenderPlan,
  type NexaAnswersSurfaceContext,
  type NexaMomentCompositionVariant
} from '@/components/greenhouse/primitives'
import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * Lab interno de `NexaMomentComposition` (GAP A — runtime del Nexa Moment Fabric). INTERNO ONLY.
 *
 * La Composition es una capacidad TRANSVERSAL de Nexa Answers (no de Knowledge): el Momento Nexa COMPONE
 * con una superficie operativa (host) sin reemplazarla. Reusa `NexaAnswersCanvas` por slot — el canvas
 * NO cambia. Este lab demuestra: el morph dormant↔composed (View Transitions, reduced-motion horneado),
 * las 3 variants funcionales (leadOverlay/anchoredAside/inlineExpand) y los 3 diferenciadores propios vs
 * Google: (1) las fuentes ANCLAN al ítem real del host, (2) next-step gobernado, (3) el host queda vivo.
 *
 * Los datos son SINTÉTICOS (placement `composed`). El consumer de dominio real se cose por
 * `surfaceContext` + `renderPlan` (joint con el Moment Fabric, Codex).
 */

const COPY = {
  ariaMode: 'Modo de la superficie',
  ariaVariant: 'Variant de composición',
  modeHost: 'Host',
  modeComposed: 'Con Nexa',
  hint: 'Pasa el cursor por una fuente: se resalta el documento real abajo. La respuesta lidera, el host sigue vivo.',
  composerPlaceholder: 'Pregúntale a Nexa sobre el corpus…',
  composerSubmit: 'Preguntar',
  sourcesLabel: 'Fuentes ancladas',
  nextStepKicker: 'Acción sugerida',
  nextStepTitle: 'Preparar borrador: nota de calibración de Impacto para el equipo',
  nextStepGate: 'Requiere aprobación',
  nextStepCta: 'Preparar borrador',
  bridgeCta: 'Seguir con Nexa',
  hostTitle: 'Documentos del corpus',
  hostSubtitleHost: 'Explora el conocimiento publicado de tu equipo',
  hostSubtitleComposed: 'Relacionados con tu pregunta — siguen vivos bajo la respuesta',
  reducedMotion: 'El morph host↔composed usa View Transitions same-document. Con prefers-reduced-motion el swap es instantáneo (sin animación) — horneado en startViewTransition.'
} as const

const QUESTION = '¿Cómo se interpreta Impacto dentro de las métricas ICO?'

interface HostDoc {
  id: string
  title: string
  kind: string
  kindTone: 'primary' | 'success' | 'info' | 'warning' | 'default'
  kindIcon: string
  updatedLabel: string
  excerpt: string
}

const HOST_DOCS: HostDoc[] = [
  {
    id: 'ico-metrics',
    title: 'Manual: Métricas ICO',
    kind: 'Manual',
    kindTone: 'primary',
    kindIcon: 'tabler-book-2',
    updatedLabel: 'Actualizado hace 3 días',
    excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, no el volumen de actividad.'
  },
  {
    id: 'ico-collaboration',
    title: 'Guía: Lectura de desempeño',
    kind: 'Guía',
    kindTone: 'info',
    kindIcon: 'tabler-compass',
    updatedLabel: 'Actualizado hace 5 días',
    excerpt: 'Las métricas ICO se leen como señales complementarias: Impacto, Colaboración y Orientación al Cliente se explican mejor juntas.'
  },
  {
    id: 'ico-calibration',
    title: 'SOP: Calibración ICO',
    kind: 'SOP',
    kindTone: 'success',
    kindIcon: 'tabler-adjustments',
    updatedLabel: 'Actualizado hace 8 días',
    excerpt: 'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución para decisiones operativas.'
  },
  {
    id: 'ico-glossary',
    title: 'Glosario de métricas operativas',
    kind: 'Glosario',
    kindTone: 'default',
    kindIcon: 'tabler-list-details',
    updatedLabel: 'Actualizado hace 20 días',
    excerpt: 'Definiciones canónicas: RpA, OTD, FTR, Cumplimiento, Impacto, Colaboración y Orientación al Cliente.'
  }
]

const SOURCE_ANCHORS = [
  { label: '1', title: 'Manual: Métricas ICO', anchorId: 'ico-metrics' },
  { label: '2', title: 'Guía: Lectura de desempeño', anchorId: 'ico-collaboration' },
  { label: '3', title: 'SOP: Calibración ICO', anchorId: 'ico-calibration' }
]

const SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'design-system.nexa.moment-composition',
  domain: 'knowledge',
  // GAP A: placement de composición-con-host (distinto de `embedded` = takeover). Contrato TASK-1102.
  placement: 'composed',
  dataReality: 'synthetic',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble'],
  allowedActions: ['read', 'explain', 'suggest_followup']
}

const RENDER_PLAN: NexaAnswersRenderPlan = {
  id: 'moment-composition-answer',
  version: 'nexa-answer-render-plan.v1',
  intent: 'explain',
  autonomyTier: 'observeOnly',
  primaryBlockId: 'composition-answer',
  trustCue: { tone: 'success', label: 'Respuesta con respaldo', detail: '3 fuentes citadas · vigentes' },
  actions: [],
  proof: {
    id: 'moment-composition-proof',
    label: 'Cómo lo sé',
    collapsedLabel: 'Ver fuentes y traza',
    expandedLabel: 'Ocultar fuentes y traza',
    evidence: {
      contractVersion: 'nexa-evidence.v1',
      kind: 'knowledge',
      sourceContractVersion: 'knowledge-search.v1',
      query: QUESTION,
      confidence: 'high',
      freshness: 'current',
      deniedOrFilteredCount: 0,
      maxScore: 0.92,
      citedDocumentCount: 3,
      primaryFeedbackTarget: { documentId: 'ico-metrics', chunkId: 'chunk-impacto-01' },
      sources: [
        {
          id: 'chunk-impacto-01',
          documentId: 'ico-metrics',
          title: 'Manual: Métricas ICO',
          citationLabel: '[1]',
          headingPath: ['Métricas ICO', 'Impacto'],
          excerpt: 'Impacto mide el efecto observable sobre el resultado, no la cantidad de actividad.',
          humanUrl: '/knowledge/documents/ico-metrics',
          score: 0.92,
          freshness: 'current'
        },
        {
          id: 'chunk-colaboracion-01',
          documentId: 'ico-collaboration',
          title: 'Guía: Lectura de desempeño',
          citationLabel: '[2]',
          headingPath: ['Lectura de desempeño', 'ICO'],
          excerpt: 'Las métricas ICO se explican mejor juntas.',
          humanUrl: '/knowledge/documents/ico-collaboration',
          score: 0.86,
          freshness: 'current'
        }
      ],
      traceSteps: [
        { id: 'intent', label: 'Intención', description: 'Lectura conceptual sobre Knowledge', metadata: 'scope: knowledge', state: 'complete' },
        { id: 'retrieval', label: 'Fuentes', description: '3 fragmentos actuales', metadata: 'maxScore 0.92', state: 'complete' },
        { id: 'answer', label: 'Respuesta', description: 'Síntesis answer-first con citas', metadata: 'trustCue: sourced_current', state: 'active' }
      ]
    }
  },
  blocks: [
    {
      id: 'composition-answer',
      renderer: 'answerBubble',
      rendererVersion: 'v1',
      variant: 'explanation',
      kind: 'knowledgeExplanationAnswer',
      title: [{ text: 'Impacto se lee por su resultado, no por el volumen de actividad.' }],
      body: [
        { text: 'La lectura útil mira el efecto observable sobre el cliente o el equipo' },
        {
          type: 'citation',
          source: {
            id: 'chunk-impacto-01',
            label: '1',
            title: 'Manual: Métricas ICO',
            headingPath: ['Métricas ICO', 'Impacto'],
            excerpt: 'Impacto mide el efecto observable sobre el resultado, no la cantidad de actividad.',
            score: 0.92,
            freshness: 'current',
            href: '/knowledge/documents/ico-metrics'
          }
        },
        { text: ', y se interpreta junto a Colaboración y Orientación al Cliente' },
        {
          type: 'citation',
          source: {
            id: 'chunk-colaboracion-01',
            label: '2',
            title: 'Guía: Lectura de desempeño',
            headingPath: ['Lectura de desempeño', 'ICO'],
            excerpt: 'Las métricas ICO se explican mejor juntas.',
            score: 0.86,
            freshness: 'current',
            href: '/knowledge/documents/ico-collaboration'
          }
        },
        { text: '.' }
      ],
      metaLabel: [{ text: '3 fuentes · vigentes' }],
      points: [
        {
          title: [{ text: 'Resultado, no actividad', style: 'strong' }],
          body: [{ text: 'Impacto mide el efecto observable sobre el resultado del cliente o del equipo.' }]
        },
        {
          title: [{ text: 'Se lee con sus señales hermanas', style: 'strong' }],
          body: [{ text: 'Colaboración y Orientación al Cliente lo contextualizan; aisladas pierden sentido.' }]
        }
      ],
      trustCue: { tone: 'success', label: 'Respuesta con respaldo', detail: '3 fuentes citadas · vigentes' }
    }
  ]
}

const CANVAS_COPY: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: '',
  idleBody: '',
  idlePlaceholder: COPY.composerPlaceholder,
  followUpPlaceholder: COPY.composerPlaceholder,
  submitLabel: COPY.composerSubmit,
  followUpLabel: COPY.composerSubmit,
  thinkingLabel: 'Nexa está buscando…',
  streamingLabel: 'Nexa está preparando la respuesta.',
  readyLabel: 'Respuesta con respaldo en Knowledge',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: '',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: ''
}

const VARIANTS: { value: NexaMomentCompositionVariant; label: string; note: string }[] = [
  { value: 'leadOverlay', label: 'leadOverlay', note: 'El Momento lidera arriba; el host reflowea debajo (≈AI Overviews).' },
  { value: 'anchoredAside', label: 'anchoredAside', note: 'El Momento se acopla al lado; las citas resaltan los ítems anclados del host.' },
  { value: 'inlineExpand', label: 'inlineExpand', note: 'El composer se expande en su lugar sin relocar el host (superficies densas).' }
]

const panelSx = (theme: Theme) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: theme.palette.background.paper,
  minInlineSize: 0
})

const DocCard = ({ doc, condensed }: { doc: HostDoc; condensed: boolean }) => {
  const theme = useTheme()

  return (
    <Box
      data-nexa-anchor={doc.id}
      sx={{ ...panelSx(theme), p: condensed ? 3 : 4, display: 'flex', flexDirection: 'column', gap: condensed ? 1.5 : 2 }}
    >
      <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
        <GreenhouseChip size='small' variant='label' tone={doc.kindTone} iconClassName={doc.kindIcon} label={doc.kind} />
        <Typography variant='caption' color='text.secondary'>
          {doc.updatedLabel}
        </Typography>
      </Stack>
      <Typography variant={condensed ? 'subtitle2' : 'h6'}>{doc.title}</Typography>
      {!condensed ? (
        <Typography variant='body2' color='text.secondary'>
          {doc.excerpt}
        </Typography>
      ) : null}
    </Box>
  )
}

const NexaMomentCompositionLabView = () => {
  const theme = useTheme()
  const [mode, setMode] = useState<'host' | 'composed'>('composed')
  const [variant, setVariant] = useState<NexaMomentCompositionVariant>('leadOverlay')
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(SOURCE_ANCHORS[0]?.anchorId ?? null)
  const [prompt, setPrompt] = useState(QUESTION)
  const composed = mode === 'composed'
  const hasText = prompt.trim().length > 0
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPrompt(event.target.value)

  const setComposed = (next: boolean) => {
    if (next === composed) return
    void startViewTransition(() => flushSync(() => setMode(next ? 'composed' : 'host')))
  }

  const activeVariantNote = VARIANTS.find(item => item.value === variant)?.note ?? ''

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
          value={prompt}
          onChange={handlePromptChange}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && hasText) {
              event.preventDefault()
              setComposed(true)
            }
          }}
          placeholder={COPY.composerPlaceholder}
          inputProps={{ 'aria-label': COPY.composerPlaceholder }}
          actionAdornment={
            <NexaComposerActionButton variant='send' aria-label={COPY.composerSubmit} disabled={!hasText} onClick={() => setComposed(true)} />
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
        mode='renderPlan'
        variant='embedded'
        kind='knowledgeEmbedded'
        state='answered'
        surfaceContext={SURFACE_CONTEXT}
        renderPlan={RENDER_PLAN}
        question={QUESTION}
        draft=''
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
        copy={CANVAS_COPY}
        slots={{ composer: <></> }}
      />
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
          {COPY.sourcesLabel}
        </Typography>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          {SOURCE_ANCHORS.map(anchor => (
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
    </Stack>
  )

  const nextStep = (
    <Box sx={{ ...panelSx(theme), p: 4, borderColor: alpha(theme.palette.success.main, 0.3), backgroundColor: alpha(theme.palette.success.main, 0.04), display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
      <Stack spacing={1} sx={{ minInlineSize: 0 }}>
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
          <GreenhouseChip size='small' variant='label' tone='success' iconClassName='tabler-sparkles' label={COPY.nextStepKicker} />
          <GreenhouseChip size='small' variant='outlined' tone='warning' iconClassName='tabler-lock' label={COPY.nextStepGate} />
        </Stack>
        <Typography variant='subtitle2'>{COPY.nextStepTitle}</Typography>
      </Stack>
      <GreenhouseButton variant='solid' tone='success' size='small' leadingIconClassName='tabler-file-pencil'>
        {COPY.nextStepCta}
      </GreenhouseButton>
    </Box>
  )

  const bridge = (
    <Stack direction='row' justifyContent='flex-end'>
      <GreenhouseShinyBorder asButton variant='cta' palette='nexa' ariaLabel={COPY.bridgeCta} dataCapture='nexa-moment-bridge-cta'>
        <GreenhouseNexaBrandMark kind='inlineMarkOnDark' size='small' />
        {COPY.bridgeCta}
      </GreenhouseShinyBorder>
    </Stack>
  )

  const host = (
    <Box sx={{ ...panelSx(theme), p: { xs: 4, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
          <Stack spacing={0.5}>
            <Typography variant='h5'>{COPY.hostTitle}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {composed ? COPY.hostSubtitleComposed : COPY.hostSubtitleHost}
            </Typography>
          </Stack>
          <GreenhouseChip size='small' variant='label' tone={composed ? 'info' : 'default'} iconClassName='tabler-files' label={`${HOST_DOCS.length} documentos`} />
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
          {HOST_DOCS.map(doc => (
            <DocCard key={doc.id} doc={doc} condensed={composed} />
          ))}
        </Box>
      </Stack>
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxInlineSize: 1280, mx: 'auto' }}>
      <Stack spacing={4}>
        <Stack spacing={1.5}>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
            <GreenhouseChip size='small' variant='label' tone='primary' iconClassName='tabler-layers-subtract' label='NexaMomentComposition' />
            <GreenhouseChip size='small' variant='outlined' tone='default' iconClassName='tabler-eye' label='El host persiste' />
            <GreenhouseChip size='small' variant='outlined' tone='info' iconClassName='tabler-arrows-shuffle' label='placement: composed' />
          </Stack>
          <Typography variant='h4'>Nexa Moment — composición con host (GAP A)</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 880 }}>
            Capacidad transversal de Nexa Answers: el Momento COMPONE con una superficie operativa sin reemplazarla.
            Reusa `NexaAnswersCanvas` por slot. {COPY.hint}
          </Typography>
        </Stack>

        <Alert severity='info' icon={<i className='tabler-accessible' />}>
          {COPY.reducedMotion}
        </Alert>

        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={4}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ md: 'flex-start' }}>
                <Stack spacing={1.5} sx={{ minInlineSize: 0 }}>
                  <ToggleButtonGroup
                    exclusive
                    value={variant}
                    onChange={(_, next: NexaMomentCompositionVariant | null) => next && setVariant(next)}
                    aria-label={COPY.ariaVariant}
                    size='small'
                  >
                    {VARIANTS.map(item => (
                      <ToggleButton key={item.value} value={item.value}>
                        {item.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant='caption' color='text.secondary' sx={{ maxInlineSize: 620 }}>
                    {activeVariantNote}
                  </Typography>
                </Stack>
                <ToggleButtonGroup
                  exclusive
                  value={mode}
                  onChange={(_, next: 'host' | 'composed' | null) => next && setComposed(next === 'composed')}
                  aria-label={COPY.ariaMode}
                  size='small'
                >
                  <ToggleButton value='host'>{COPY.modeHost}</ToggleButton>
                  <ToggleButton value='composed'>{COPY.modeComposed}</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Box data-capture='nexa-moment-composition-lab'>
                <NexaMomentComposition
                  variant={variant}
                  kind='knowledgeOverview'
                  state={composed ? 'composed' : 'dormant'}
                  composer={composer}
                  moment={moment}
                  nextStep={nextStep}
                  bridge={bridge}
                  host={host}
                  activeAnchorId={composed ? activeAnchorId : null}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

export default NexaMomentCompositionLabView
