'use client'

import { useRef, useState } from 'react'

import { flushSync } from 'react-dom'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import {
  GreenhouseBreadcrumbs,
  GreenhouseChip,
  NexaAnswersCanvas,
  NexaComposer,
  NexaComposerActionButton,
  NexaComposerInput,
  NexaSenderMark,
  type NexaAnswersCanvasCopy,
  type NexaAnswersCanvasState,
  type NexaAnswersResponseControl
} from '@/components/greenhouse/primitives'
import { startViewTransition } from '@/lib/motion/view-transition'

import {
  COMPOSITION_QUESTION,
  COMPOSITION_RENDER_PLAN,
  COMPOSITION_SURFACE_CONTEXT,
  HOST_KNOWLEDGE_DOCS,
  type HostKnowledgeDoc
} from './nexa-composition-fixtures'

/**
 * GAP A (mockup) — Nexa "composición con host" (runtime del Nexa Moment Fabric). Estilo Google AI Mode /
 * AI Overviews: un composer "con Nexa adentro" embebido en una superficie de Knowledge que, al activarse,
 * transforma la superficie en conversacional SIN hacer desaparecer el resto — el contenido del host
 * (lista de documentos del corpus) PERSISTE y reflowea, y la respuesta de Nexa se inyecta como bloque
 * PROTAGONISTA entre el composer y el host. NO es el takeover de la lente actual (`embedded`).
 *
 * Decisión P+V+K (a validar por el operador con este mockup): es una **layout primitive de composición**
 * (hermana de `AdaptiveSidecarLayout`) que posee el GRID + el morph; el host aporta su contenido por slot;
 * el `NexaAnswersCanvas` se REUSA tal cual para el bloque conversacional. El contrato suma UN placement
 * `composed` a `surfaceContext` (aditivo). La primitive del canvas NO cambia.
 *
 * Web (Chrome guidance): View Transitions same-document (Baseline 2025-10) para el morph — el composer y
 * el host persisten con `view-transition-name` y el browser morfea su posición/tamaño; el helper canónico
 * `startViewTransition` degrada honesto (sin soporte / reduced-motion → swap instantáneo). El foco se rutea
 * al heading de la respuesta tras el morph (a11y mandatory de la guía). El reflow del host usaría container
 * queries en runtime; en el mockup se modela por modo + breakpoints.
 */

type Mode = 'host' | 'conversational'

// Mockup copy local (es-CL). En runtime esto vive en `src/lib/copy/*`; acá es ilustrativo del concepto.
const COPY = {
  breadcrumbs: { home: 'Inicio', knowledge: 'Knowledge', composition: 'Composición con host' },
  aria: { surfaceMode: 'Modo de la superficie' }
} as const

const CANVAS_COPY: NexaAnswersCanvasCopy = {
  assistantName: 'Nexa',
  idleTitle: 'Pregúntale a Nexa',
  idleBody: '',
  idlePlaceholder: 'Pregúntale a Nexa sobre el corpus…',
  followUpPlaceholder: 'Sigue preguntando…',
  submitLabel: 'Preguntar',
  followUpLabel: 'Enviar',
  thinkingLabel: 'Nexa está buscando en el conocimiento.',
  streamingLabel: 'Nexa está preparando la respuesta.',
  readyLabel: 'Respuesta con respaldo en Knowledge',
  suggestedFollowUpsLabel: 'Preguntas sugeridas',
  degradedTitle: 'Respuesta parcial',
  degradedBody: '',
  errorTitle: 'No pudimos completar la respuesta',
  errorBody: ''
}

const ASK_BAR_VT = { viewTransitionName: 'nexa-composition-ask-bar' }
const HOST_VT = { viewTransitionName: 'nexa-composition-host' }

const panelSx = (theme: Theme) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: theme.palette.background.paper,
  minInlineSize: 0
})

const DocCard = ({ doc, condensed }: { doc: HostKnowledgeDoc; condensed: boolean }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        ...panelSx(theme),
        p: condensed ? 3 : 4,
        display: 'flex',
        flexDirection: 'column',
        gap: condensed ? 1.5 : 2,
        transition: theme.transitions.create(['padding'], { duration: theme.transitions.duration.short })
      }}
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

const NexaCompositionMockupView = () => {
  const theme = useTheme()
  const [mode, setMode] = useState<Mode>('host')
  const [draft, setDraft] = useState(COMPOSITION_QUESTION)
  const [proofOpen, setProofOpen] = useState(false)
  const answerRef = useRef<HTMLDivElement | null>(null)

  const condensed = mode === 'conversational'

  const enterConversational = async () => {
    if (mode === 'conversational') return
    // Morph in-place: el composer + el host persisten (view-transition-name), la respuesta entra como
    // protagonista. flushSync fuerza el cambio de DOM dentro del snapshot; el helper degrada honesto.
    await startViewTransition(() => flushSync(() => setMode('conversational')))
    // a11y mandatory (Chrome guidance): rutear foco al heading de la respuesta tras el morph.
    answerRef.current?.focus()
  }

  const resetToHost = () => {
    setProofOpen(false)
    void startViewTransition(() => flushSync(() => setMode('host')))
  }

  const onResponseControl = (control: NexaAnswersResponseControl) => {
    if (control === 'regenerate') void enterConversational()
  }

  const canvasState: NexaAnswersCanvasState = proofOpen ? 'proofOpen' : 'answered'

  return (
    <Stack spacing={5} data-capture='nexa-composition-page'>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={4} alignItems={{ lg: 'flex-start' }}>
        <Stack spacing={2}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            items={[
              { label: COPY.breadcrumbs.home, href: '/home' },
              { label: COPY.breadcrumbs.knowledge, href: '/knowledge' },
              { label: COPY.breadcrumbs.composition }
            ]}
          />
          <Stack spacing={1.5}>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
              <GreenhouseChip size='small' variant='label' tone='primary' iconClassName='tabler-sparkles' label='Nexa Moment Fabric' />
              <GreenhouseChip size='small' variant='label' tone='info' iconClassName='tabler-layers-subtract' label='Composición in-situ' />
              <GreenhouseChip size='small' variant='outlined' tone='default' iconClassName='tabler-eye' label='El host persiste' />
            </Stack>
            <Typography variant='surfaceHeroTitle'>La superficie entra en modo conversacional</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
              Estilo AI Mode / AI Overviews: el composer con Nexa adentro transforma esta superficie sin hacer
              desaparecer el resto. La respuesta lidera; los documentos del corpus siguen abajo, vivos.
            </Typography>
          </Stack>
        </Stack>

        {/* Toggle explícito Host ↔ Conversacional — para ver el antes/después del morph en ambas direcciones. */}
        <Stack spacing={1.5} alignItems={{ xs: 'stretch', lg: 'flex-end' }}>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, next: Mode | null) => {
              if (!next || next === mode) return
              if (next === 'conversational') void enterConversational()
              else resetToHost()
            }}
            aria-label={COPY.aria.surfaceMode}
            size='small'
          >
            <ToggleButton value='host'>Host</ToggleButton>
            <ToggleButton value='conversational'>Conversacional</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant='caption' color='text.secondary' sx={{ maxInlineSize: 280, textAlign: { lg: 'right' } }}>
            Cambia el modo o pregúntale a Nexa abajo: la respuesta entra y los documentos siguen vivos.
          </Typography>
        </Stack>
      </Stack>

      {/* Ask bar — el composer "con Nexa adentro", persistente (morfea, no desaparece). */}
      <Box style={ASK_BAR_VT} sx={{ ...panelSx(theme), p: { xs: 3, md: 4 }, backgroundColor: alpha(theme.palette.primary.main, 0.025) }}>
        <Stack direction='row' spacing={3} alignItems='center'>
          <NexaSenderMark size={40} />
          <Box sx={{ flex: 1, minInlineSize: 0 }}>
            <NexaComposer kind='knowledgeAsk'>
              <NexaComposerInput
                kind='knowledgeAsk'
                fullWidth
                value={draft}
                placeholder={CANVAS_COPY.idlePlaceholder}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    if (draft.trim()) void enterConversational()
                  }
                }}
                inputProps={{ 'aria-label': CANVAS_COPY.idlePlaceholder }}
                actionAdornment={
                  <NexaComposerActionButton
                    variant='send'
                    icon='search'
                    aria-label={CANVAS_COPY.submitLabel}
                    disabled={!draft.trim()}
                    onClick={() => void enterConversational()}
                  />
                }
              />
            </NexaComposer>
          </Box>
        </Stack>
      </Box>

      {/* Respuesta protagonista — el NexaAnswersCanvas REUSADO, inyectado entre el composer y el host. */}
      {mode === 'conversational' ? (
        <Box
          ref={answerRef}
          tabIndex={-1}
          data-capture='nexa-composition-answer'
          sx={{ ...panelSx(theme), p: { xs: 4, md: 5 }, outline: 'none', backgroundColor: alpha(theme.palette.primary.main, 0.012) }}
        >
          <NexaAnswersCanvas
            mode='renderPlan'
            variant='embedded'
            kind='knowledgeEmbedded'
            state={canvasState}
            surfaceContext={COMPOSITION_SURFACE_CONTEXT}
            renderPlan={COMPOSITION_RENDER_PLAN}
            question={COMPOSITION_QUESTION}
            draft=''
            onDraftChange={() => undefined}
            onSubmit={() => undefined}
            proofOpen={proofOpen}
            onProofToggle={() => setProofOpen(current => !current)}
            onResponseControl={onResponseControl}
            copy={CANVAS_COPY}
            // El composer vive en la ask bar (arriba), no dentro del bloque protagonista.
            slots={{ composer: <></> }}
          />
        </Box>
      ) : null}

      {/* Host — el contenido de la superficie, que PERSISTE y reflowea (no desaparece). */}
      <Box style={HOST_VT} sx={{ ...panelSx(theme), p: { xs: 4, md: 5 } }}>
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
            <Stack spacing={0.5}>
              <Typography variant='h5'>Documentos del corpus</Typography>
              <Typography variant='caption' color='text.secondary'>
                {condensed
                  ? 'Relacionados con tu pregunta — siguen disponibles bajo la respuesta'
                  : 'Explora el conocimiento publicado de tu equipo'}
              </Typography>
            </Stack>
            <GreenhouseChip
              size='small'
              variant='label'
              tone={condensed ? 'info' : 'default'}
              iconClassName='tabler-files'
              label={`${HOST_KNOWLEDGE_DOCS.length} documentos`}
            />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: condensed ? 3 : 4,
              gridTemplateColumns: condensed
                ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
                : { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              '& > *': { minInlineSize: 0 }
            }}
          >
            {HOST_KNOWLEDGE_DOCS.map(doc => (
              <DocCard key={doc.id} doc={doc} condensed={condensed} />
            ))}
          </Box>
        </Stack>
      </Box>
    </Stack>
  )
}

export default NexaCompositionMockupView
