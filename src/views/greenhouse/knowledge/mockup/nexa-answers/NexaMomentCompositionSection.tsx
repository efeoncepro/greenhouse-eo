'use client'

import { useState, type ChangeEvent } from 'react'

import { flushSync } from 'react-dom'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import {
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseSpectrumBeam,
  NexaAnswersCanvas,
  NexaComposerActionButton,
  NexaComposerInput,
  NexaMomentComposition,
  type NexaAnswersCanvasCopy
} from '@/components/greenhouse/primitives'
import { startViewTransition } from '@/lib/motion/view-transition'

import {
  COMPOSITION_QUESTION,
  COMPOSITION_RENDER_PLAN,
  COMPOSITION_SOURCE_ANCHORS,
  COMPOSITION_SURFACE_CONTEXT,
  HOST_KNOWLEDGE_DOCS,
  type HostKnowledgeDoc
} from './nexa-composition-fixtures'

/**
 * Demo de `NexaMomentComposition` (GAP A) DENTRO del mockup de Nexa Answers — un solo espacio (decisión
 * del operador: no proliferar rutas). Patrón propio de Greenhouse (AI Overviews/AI Mode como norte, no
 * copia): el Momento Nexa COMPONE con la superficie operativa (host) sin reemplazarla. Diferenciadores
 * propios que se ven acá: (1) las fuentes ANCLAN al documento real del host (al pasar el cursor se resalta
 * la card de abajo), (2) next-step GOBERNADO (action boundary), (3) puente "Seguir con Nexa" a la lente.
 */

const COPY = {
  aria: { mode: 'Modo de la superficie' },
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
  hostSubtitleComposed: 'Relacionados con tu pregunta — siguen vivos bajo la respuesta'
} as const

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

const NexaMomentCompositionSection = () => {
  const theme = useTheme()
  const [mode, setMode] = useState<'host' | 'composed'>('composed')
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(COMPOSITION_SOURCE_ANCHORS[0]?.anchorId ?? null)
  const [prompt, setPrompt] = useState(COMPOSITION_QUESTION)
  const composed = mode === 'composed'
  const hasText = prompt.trim().length > 0
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPrompt(event.target.value)

  const setComposed = (next: boolean) => {
    if (next === composed) return
    void startViewTransition(() => flushSync(() => setMode(next ? 'composed' : 'host')))
  }

  // Caja "spectrum" idéntica al specimen canónico del lab nexa-chat (NexaMessageComposerSpectrumSpecimen):
  // estados con/sin texto ya resueltos (intensity/durationSec/active + boxShadow + color del texto por
  // hasText). Una sola marca de Nexa (la interna de 'knowledgeAsk'). El send se habilita con texto.
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

  // El Momento: el NexaAnswersCanvas REUSADO + las fuentes ancladas (al host real). El composer vive en la
  // ask bar (arriba), por eso se suprime el del canvas.
  const moment = (
    <Stack spacing={4}>
      <NexaAnswersCanvas
        mode='renderPlan'
        variant='embedded'
        kind='knowledgeEmbedded'
        state='answered'
        surfaceContext={COMPOSITION_SURFACE_CONTEXT}
        renderPlan={COMPOSITION_RENDER_PLAN}
        question={COMPOSITION_QUESTION}
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
          {COMPOSITION_SOURCE_ANCHORS.map(anchor => (
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

  // Next-step gobernado (action boundary) — el diferenciador propio: Nexa propone una acción operativa.
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
      <GreenhouseButton variant='outlined' tone='primary' size='small' trailingIconClassName='tabler-arrow-right'>
        {COPY.bridgeCta}
      </GreenhouseButton>
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
          <GreenhouseChip size='small' variant='label' tone={composed ? 'info' : 'default'} iconClassName='tabler-files' label={`${HOST_KNOWLEDGE_DOCS.length} documentos`} />
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
          {HOST_KNOWLEDGE_DOCS.map(doc => (
            <DocCard key={doc.id} doc={doc} condensed={composed} />
          ))}
        </Box>
      </Stack>
    </Box>
  )

  return (
    <Box data-capture='nexa-moment-composition-section' sx={{ ...panelSx(theme), p: { xs: 4, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ md: 'flex-start' }}>
          <Stack spacing={1.5}>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
              <GreenhouseChip size='small' variant='label' tone='primary' iconClassName='tabler-layers-subtract' label='Composición con host' />
              <GreenhouseChip size='small' variant='outlined' tone='default' iconClassName='tabler-eye' label='El host persiste' />
            </Stack>
            <Typography variant='h5'>Nexa compone con la superficie (no la reemplaza)</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
              {COPY.hint}
            </Typography>
          </Stack>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, next: 'host' | 'composed' | null) => next && setComposed(next === 'composed')}
            aria-label={COPY.aria.mode}
            size='small'
          >
            <ToggleButton value='host'>{COPY.modeHost}</ToggleButton>
            <ToggleButton value='composed'>{COPY.modeComposed}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <NexaMomentComposition
          kind='knowledgeOverview'
          state={composed ? 'composed' : 'dormant'}
          composer={composer}
          moment={moment}
          nextStep={nextStep}
          bridge={bridge}
          host={host}
          activeAnchorId={composed ? activeAnchorId : null}
        />
      </Stack>
    </Box>
  )
}

export default NexaMomentCompositionSection
