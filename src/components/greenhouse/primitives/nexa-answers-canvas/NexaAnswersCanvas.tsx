'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import { Motion } from '@/components/greenhouse/motion'

import NexaComposer, { NexaComposerActionButton, NexaComposerInput } from '../NexaComposer'
import NexaEvidencePanel from '../NexaEvidencePanel'
import NexaProvenanceTrace from '../nexa-provenance-trace/NexaProvenanceTrace'
import GreenhouseButton from '../GreenhouseButton'
import GreenhouseStatusDot from '../GreenhouseStatusDot'
import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import NexaSenderMark from '../NexaSenderMark'
import NexaExpressiveText, { getNexaExpressiveTextPlainText } from '../nexa-expressive-text/NexaExpressiveText'
import {
  assertNexaAnswersRenderPlanAllowed,
  NEXA_ANSWERS_CANVAS_VARIANT_CONFIG,
  resolveNexaAnswersCanvasDensity,
  resolveNexaAnswersCanvasVariant
} from './nexa-answers-canvas-controller'
import { renderNexaAnswersBlock } from './nexa-answers-canvas-renderers'
import type {
  NexaAnswersBubbleBlock,
  NexaAnswersCanvasProps,
  NexaAnswersCanvasState,
  NexaAnswersCompactAnswerBlock,
  NexaAnswersRenderPlan,
  NexaAnswersResponseControl,
  NexaAnswersSuggestedFollowUp
} from './nexa-answers-canvas-types'

const isThinkingState = (state: NexaAnswersCanvasState) => state === 'submitted' || state === 'thinking' || state === 'streaming'
const isErrorState = (state: NexaAnswersCanvasState) => state === 'error' || state === 'degraded'

const motionSx = {
  '@keyframes nexa-answers-canvas-in': {
    '0%': { opacity: 0, transform: 'translateY(8px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-answers-canvas-in 200ms cubic-bezier(0.2, 0, 0, 1) both',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}

const canvasFrameSx = (theme: Theme, ownsScroll: boolean) => ({
  minInlineSize: 0,
  minBlockSize: 0,
  overflow: ownsScroll ? 'auto' : 'visible',
  ...(ownsScroll ? { scrollbarGutter: 'stable' } : {}),
  scrollBehavior: 'auto',
  '@media (prefers-reduced-motion: reduce)': {
    scrollBehavior: 'auto'
  },
  '--nexa-answers-composer-reserve': '76px',
  '--nexa-answers-chart-max-block': '260px',
  color: theme.palette.text.primary
})

const QuestionBubble = ({ children, compact = false }: { children: string; compact?: boolean }) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', minInlineSize: 0, ...motionSx }} data-capture='nexa-answers-canvas-question'>
      <Box
        sx={{
          maxInlineSize: compact ? { xs: '100%', md: '72%' } : { xs: '100%', md: '80%' },
          px: 4,
          py: compact ? 2.5 : 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: `${theme.shape.customBorderRadius.xl}px ${theme.shape.customBorderRadius.xl}px ${theme.shape.customBorderRadius.xs}px ${theme.shape.customBorderRadius.xl}px`,
          backgroundColor: alpha(theme.palette.primary.main, 0.06)
        }}
      >
        <Typography variant='body2'>{children}</Typography>
      </Box>
    </Box>
  )
}

type NexaIdentityStatus = 'thinking' | 'ready' | 'silent'

const NexaIdentity = ({ status, label, assistantName }: { status: NexaIdentityStatus; label: string; assistantName: string }) => (
  <Stack spacing={1.25} data-capture='nexa-answers-canvas-identity'>
    <Stack direction='row' spacing={1.25} alignItems='center'>
      <NexaSenderMark />
      <Typography variant='h4' component='span' sx={{ lineHeight: 1.2, color: 'text.secondary' }}>
        {assistantName}
      </Typography>
    </Stack>
    {status === 'thinking' ? (
      <Stack direction='row' spacing={1.25} alignItems='center' role='status' aria-live='polite' data-capture='nexa-answers-canvas-thinking'>
        <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
        <GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={5} dotSize={7} />
        {/* Anuncio sr-only del status de "pensando": contenido real del live region (lo que
            anuncia el lector de pantalla). Es un patrón canónico de loading-status — NO pasarlo
            a aria-hidden ni borrarlo. El marcador data-gvc-ignore-layout lo exime del layout gate
            (visuallyHidden siempre "clipea" por diseño; flagearlo es falso positivo). */}
        <Box component='span' data-gvc-ignore-layout='true' sx={visuallyHidden}>
          {label}
        </Box>
      </Stack>
    ) : status === 'ready' ? (
      <Stack direction='row' spacing={1.25} alignItems='center' role='status' aria-live='polite'>
        <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
        <GreenhouseStatusDot tone='success' ariaLabel={label} />
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
      </Stack>
    ) : null}
  </Stack>
)

const EmptyCanvas = ({ copy, draft, onDraftChange, onSubmit }: Pick<NexaAnswersCanvasProps, 'copy' | 'draft' | 'onDraftChange' | 'onSubmit'>) => (
  <Stack spacing={4} data-capture='nexa-answers-canvas-idle'>
    <Stack spacing={1.5} alignItems='center' textAlign='center'>
      <NexaSenderMark size={40} />
      <Typography variant='h4'>{copy.idleTitle}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 640 }}>
        {copy.idleBody}
      </Typography>
    </Stack>
    <CanvasComposer
      draft={draft}
      onDraftChange={onDraftChange}
      onSubmit={onSubmit}
      placeholder={copy.idlePlaceholder}
      submitLabel={copy.submitLabel}
      searchIcon
    />
  </Stack>
)

const CanvasComposer = ({
  draft,
  onDraftChange,
  onSubmit,
  placeholder,
  submitLabel,
  searchIcon = false
}: {
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  submitLabel: string
  searchIcon?: boolean
}) => {
  const hasText = draft.trim().length > 0

  return (
    <Box data-capture='nexa-answers-canvas-composer'>
      <NexaComposer kind='knowledgeAsk'>
        <NexaComposerInput
          kind='knowledgeAsk'
          fullWidth
          value={draft}
          placeholder={placeholder}
          onChange={event => onDraftChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (hasText) onSubmit()
            }
          }}
          inputProps={{ 'aria-label': placeholder }}
          actionAdornment={
            <NexaComposerActionButton
              variant='send'
              icon={searchIcon ? 'search' : 'send'}
              aria-label={submitLabel}
              disabled={!hasText}
              onClick={onSubmit}
            />
          }
        />
      </NexaComposer>
    </Box>
  )
}

const CanvasProof = ({
  id,
  open,
  renderPlan,
  slot
}: {
  id: string
  open: boolean
  renderPlan?: NexaAnswersRenderPlan
  slot?: ReactNode
}) => {
  const proof = renderPlan?.proof

  return (
    <Collapse in={open} timeout={300} mountOnEnter unmountOnExit>
      <Box id={id} data-capture='nexa-answers-canvas-proof' sx={{ mt: 4 }}>
        {slot ?? (proof?.evidence ? <NexaEvidencePanel evidence={proof.evidence} variant='proofPanel' feedbackEnabled={false} /> : null)}
      </Box>
    </Collapse>
  )
}

const CanvasErrorState = ({ state, copy }: { state: NexaAnswersCanvasState; copy: NexaAnswersCanvasProps['copy'] }) => {
  const theme = useTheme()
  const degraded = state === 'degraded'

  return (
    <Box
      data-capture={degraded ? 'nexa-answers-canvas-degraded' : 'nexa-answers-canvas-error'}
      role='status'
      sx={{
        border: `1px solid ${alpha(degraded ? theme.palette.warning.main : theme.palette.error.main, 0.28)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: alpha(degraded ? theme.palette.warning.main : theme.palette.error.main, 0.055),
        p: 4
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <i className={degraded ? 'tabler-alert-triangle' : 'tabler-cloud-off'} aria-hidden='true' />
          <Typography variant='h6'>{degraded ? copy.degradedTitle : copy.errorTitle}</Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          {degraded ? copy.degradedBody : copy.errorBody}
        </Typography>
      </Stack>
    </Box>
  )
}

// Caret de redacción: barra que parpadea al final del texto que está llegando.
// Reduced-motion → caret fijo (sin parpadeo), sigue comunicando "escribiendo".
const StreamingCaret = () => (
  <Box
    component='span'
    aria-hidden='true'
    sx={theme => ({
      display: 'inline-block',
      inlineSize: '2px',
      blockSize: '1.05em',
      marginInlineStart: '3px',
      verticalAlign: 'text-bottom',
      borderRadius: '1px',
      backgroundColor: theme.palette.primary.main,
      '@keyframes nexa-stream-caret': { '0%,48%': { opacity: 1 }, '50%,100%': { opacity: 0 } },
      animation: 'nexa-stream-caret 1.05s steps(1) infinite',
      '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 }
    })}
  />
)

// Respuesta llegando: titular ya redactado + cuerpo a mitad con caret + (si es chart) el
// gráfico todavía armándose. SIN trust cue ni acciones (llegan al cerrar). El live region
// del status lo lleva la identidad Nexa (no duplicar aquí) → un solo anuncio.
const StreamingAnswerDraft = ({
  block,
  onStop,
  stopLabel
}: {
  block: NexaAnswersBubbleBlock
  onStop?: () => void
  stopLabel?: string
}) => {
  const theme = useTheme()
  const bodyFull = getNexaExpressiveTextPlainText(block.body)
  const bodyPartial = bodyFull.slice(0, Math.max(24, Math.ceil(bodyFull.length * 0.6))).trimEnd()
  const showChart = Boolean(block.chart)

  return (
    <Box
      data-capture='nexa-answers-canvas-streaming'
      aria-busy='true'
      sx={{
        ml: { xs: 1.5, md: 2 },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.34)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.xs}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.greenhouseElevation.floating.boxShadow,
        px: { xs: 4, md: 5 },
        py: { xs: 4, md: 4.5 }
      }}
    >
      <Stack spacing={2.5} sx={{ minInlineSize: 0 }}>
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.12)
            }}
          >
            <i className='tabler-sparkles' aria-hidden='true' />
            <Typography variant='body2' sx={{ fontWeight: 600, color: 'inherit' }}>
              Redactando respuesta
            </Typography>
          </Box>
          {/* Control de generación (estilo AI Mode/ChatGPT): permite detener mientras llega. */}
          {onStop ? (
            <GreenhouseButton
              variant='outlined'
              tone='secondary'
              size='small'
              leadingIconClassName='tabler-player-stop'
              aria-label={stopLabel ?? 'Detener'}
              dataCapture='nexa-answers-stop-generation'
              onClick={onStop}
            >
              {stopLabel ?? 'Detener'}
            </GreenhouseButton>
          ) : null}
        </Stack>
        <NexaExpressiveText value={block.title} variant='h5' />
        <Typography variant='body2' color='text.secondary'>
          {bodyPartial}
          <StreamingCaret />
        </Typography>
        {showChart ? (
          <Box
            aria-hidden='true'
            sx={{
              blockSize: 168,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.22)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Typography variant='caption' color='text.secondary'>
              Armando la gráfica…
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
}

// Próximas preguntas sugeridas: pills tappables que promueven la pregunta al turno siguiente.
// Mata la parálisis del composer en blanco y vuelve la respuesta una conversación.
const SuggestedFollowUps = ({
  items,
  label,
  onSelect
}: {
  items: NexaAnswersSuggestedFollowUp[]
  label: string
  onSelect: (followUp: NexaAnswersSuggestedFollowUp) => void
}) => (
  <Stack spacing={1.5} data-capture='nexa-answers-canvas-suggested-followups'>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
      {items.map(item => (
        <GreenhouseButton
          key={item.id}
          variant='outlined'
          tone='secondary'
          size='small'
          trailingIconClassName='tabler-arrow-up-right'
          onClick={() => onSelect(item)}
        >
          {item.label}
        </GreenhouseButton>
      ))}
    </Stack>
  </Stack>
)

const RESPONSE_TOOLBAR_DEFAULTS = {
  helpfulPrompt: '¿Te sirvió esta respuesta?',
  helpfulYesLabel: 'Sí, me sirvió',
  helpfulNoLabel: 'No me sirvió',
  helpfulThanksLabel: '¡Gracias por tu feedback!',
  copyLabel: 'Copiar',
  copiedLabel: 'Copiado',
  shareLabel: 'Compartir',
  regenerateLabel: 'Regenerar'
} as const

/**
 * Response toolbar — fase "settle" del despliegue (estilo AI Overview): chrome meta de confianza
 * que asienta DESPUÉS de la respuesta. Feedback ¿útil? (colapsa a acuse tras votar, como AI Overview)
 * + copiar (clipboard self-contained, estado optimista) / compartir / regenerar. Opt-in vía
 * onResponseControl; labels con defaults es-CL. reduced-motion horneado en GreenhouseButton.
 */
const NexaResponseToolbar = ({
  copy,
  plainText,
  onControl
}: {
  copy: NexaAnswersCanvasProps['copy']
  plainText: string
  onControl: (control: NexaAnswersResponseControl) => void
}) => {
  const [feedback, setFeedback] = useState<'helpful' | 'unhelpful' | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    []
  )

  const labels = {
    helpfulPrompt: copy.helpfulPrompt ?? RESPONSE_TOOLBAR_DEFAULTS.helpfulPrompt,
    helpfulYesLabel: copy.helpfulYesLabel ?? RESPONSE_TOOLBAR_DEFAULTS.helpfulYesLabel,
    helpfulNoLabel: copy.helpfulNoLabel ?? RESPONSE_TOOLBAR_DEFAULTS.helpfulNoLabel,
    helpfulThanksLabel: copy.helpfulThanksLabel ?? RESPONSE_TOOLBAR_DEFAULTS.helpfulThanksLabel,
    copyLabel: copy.copyLabel ?? RESPONSE_TOOLBAR_DEFAULTS.copyLabel,
    copiedLabel: copy.copiedLabel ?? RESPONSE_TOOLBAR_DEFAULTS.copiedLabel,
    shareLabel: copy.shareLabel ?? RESPONSE_TOOLBAR_DEFAULTS.shareLabel,
    regenerateLabel: copy.regenerateLabel ?? RESPONSE_TOOLBAR_DEFAULTS.regenerateLabel
  }

  const handleCopy = () => {
    // Optimista (state-design): en headless/GVC el clipboard puede estar restringido; mostramos
    // "Copiado" igual y emitimos el control. El write real va best-effort.
    void navigator.clipboard?.writeText?.(plainText).catch(() => undefined)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1800)
    onControl('copy')
  }

  const handleFeedback = (value: 'helpful' | 'unhelpful') => {
    setFeedback(value)
    onControl(value)
  }

  return (
    <Stack
      direction='row'
      data-capture='nexa-answers-response-toolbar'
      flexWrap='wrap'
      useFlexGap
      sx={theme => ({
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing(1.5),
        pt: 2,
        borderTop: `1px solid ${theme.palette.divider}`
      })}
    >
      {feedback ? (
        <Stack direction='row' spacing={0.75} alignItems='center' data-capture='nexa-answers-response-feedback-ack'>
          <Box
            component='i'
            className='tabler-circle-check'
            aria-hidden
            sx={theme => ({ fontSize: 18, color: theme.greenhouseSemantic.success.tonalText })}
          />
          <Typography variant='caption' sx={theme => ({ color: theme.greenhouseSemantic.success.tonalText, fontWeight: 600 })}>
            {labels.helpfulThanksLabel}
          </Typography>
        </Stack>
      ) : (
        <Stack direction='row' spacing={0.5} alignItems='center' flexWrap='wrap' useFlexGap data-capture='nexa-answers-response-feedback'>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5 }}>
            {labels.helpfulPrompt}
          </Typography>
          <GreenhouseButton
            variant='text'
            tone='secondary'
            size='small'
            leadingIconClassName='tabler-thumb-up'
            aria-label={labels.helpfulYesLabel}
            dataCapture='nexa-answers-response-helpful'
            onClick={() => handleFeedback('helpful')}
          >
            {labels.helpfulYesLabel}
          </GreenhouseButton>
          <GreenhouseButton
            variant='text'
            tone='secondary'
            size='small'
            leadingIconClassName='tabler-thumb-down'
            aria-label={labels.helpfulNoLabel}
            dataCapture='nexa-answers-response-unhelpful'
            onClick={() => handleFeedback('unhelpful')}
          >
            {labels.helpfulNoLabel}
          </GreenhouseButton>
        </Stack>
      )}

      <Stack direction='row' spacing={0.25} alignItems='center' flexWrap='wrap' useFlexGap>
        <GreenhouseButton
          variant='text'
          tone='secondary'
          size='small'
          leadingIconClassName={copied ? 'tabler-check' : 'tabler-copy'}
          aria-label={copied ? labels.copiedLabel : labels.copyLabel}
          dataCapture='nexa-answers-response-copy'
          onClick={handleCopy}
        >
          {copied ? labels.copiedLabel : labels.copyLabel}
        </GreenhouseButton>
        <GreenhouseButton
          variant='text'
          tone='secondary'
          size='small'
          leadingIconClassName='tabler-share-3'
          aria-label={labels.shareLabel}
          dataCapture='nexa-answers-response-share'
          onClick={() => onControl('share')}
        >
          {labels.shareLabel}
        </GreenhouseButton>
        <GreenhouseButton
          variant='text'
          tone='secondary'
          size='small'
          leadingIconClassName='tabler-refresh'
          aria-label={labels.regenerateLabel}
          dataCapture='nexa-answers-response-regenerate'
          onClick={() => onControl('regenerate')}
        >
          {labels.regenerateLabel}
        </GreenhouseButton>
      </Stack>
    </Stack>
  )
}

const renderPreviousTurn = (turn: NexaAnswersCompactAnswerBlock, renderPlan: NexaAnswersRenderPlan, proofPanelId: string) =>
  renderNexaAnswersBlock(turn, {
    proofOpen: false,
    thinking: false,
    renderPlan,
    proofPanelId,
    onProofToggle: () => undefined
  })

const NexaAnswersCanvas = ({
  mode = 'renderPlan',
  variant,
  kind,
  density,
  state,
  surfaceContext,
  renderPlan,
  question,
  draft,
  onDraftChange,
  onSubmit,
  proofOpen,
  onProofToggle,
  previousTurns = [],
  followUpQuestion,
  reasoningSteps,
  suggestedFollowUps,
  onSuggestedFollowUp,
  slots,
  copy,
  runtimeSlot,
  onAction,
  onResponseControl,
  onStopGeneration
}: NexaAnswersCanvasProps) => {
  const theme = useTheme()
  const [internalProofOpen, setInternalProofOpen] = useState(false)
  const resolvedVariant = resolveNexaAnswersCanvasVariant({ kind, variant })
  const resolvedDensity = resolveNexaAnswersCanvasDensity({ density, kind, surfaceContext, variant: resolvedVariant })
  const variantConfig = NEXA_ANSWERS_CANVAS_VARIANT_CONFIG[resolvedVariant]
  const isProofOpen = proofOpen ?? internalProofOpen
  const proofId = `${surfaceContext.surfaceId.replace(/[^a-zA-Z0-9_-]/g, '-')}-proof`
  const thinking = isThinkingState(state)
  const isReasoning = state === 'reasoning'
  // Pre-answer (submitted/thinking/reasoning): aún no se pinta la respuesta. `reasoning` muestra
  // los pasos progresivos + shimmer; `streaming` la respuesta llegando con caret.
  const preAnswer = state === 'submitted' || state === 'thinking' || isReasoning
  const isStreaming = state === 'streaming'
  const primaryBlock = renderPlan?.blocks.find(block => block.id === renderPlan.primaryBlockId) ?? renderPlan?.blocks[0]
  const streamingBlock = primaryBlock?.renderer === 'answerBubble' ? (primaryBlock as NexaAnswersBubbleBlock) : null

  // Texto plano de la respuesta para "Copiar" de la response toolbar (título + cuerpo).
  const answerPlainText = streamingBlock
    ? `${getNexaExpressiveTextPlainText(streamingBlock.title)}\n\n${getNexaExpressiveTextPlainText(streamingBlock.body)}`.trim()
    : ''

  const identityLabel = isStreaming ? copy.streamingLabel : thinking ? copy.thinkingLabel : copy.readyLabel
  // Durante reasoning la identidad solo muestra el wordmark: el status vivo lo lleva el trace.
  const identityStatus: 'thinking' | 'ready' | 'silent' = isReasoning ? 'silent' : thinking ? 'thinking' : isErrorState(state) ? 'silent' : 'ready'

  assertNexaAnswersRenderPlanAllowed({ renderPlan, allowedRenderers: surfaceContext.allowedRenderers })

  const toggleProof = () => {
    if (onProofToggle) {
      onProofToggle()

      return
    }

    setInternalProofOpen(current => !current)
  }

  if (mode === 'runtime' && runtimeSlot) {
    return (
      <Box
        data-capture='nexa-answers-canvas'
        data-mode={mode}
        data-variant={resolvedVariant}
        data-density={resolvedDensity}
        sx={canvasFrameSx(theme, variantConfig.ownsScroll)}
      >
        {runtimeSlot}
      </Box>
    )
  }

  return (
    <Box
      data-capture='nexa-answers-canvas'
      data-mode={mode}
      data-state={state}
      data-variant={resolvedVariant}
      data-kind={kind}
      data-density={resolvedDensity}
      sx={canvasFrameSx(theme, variantConfig.ownsScroll)}
    >
      <Stack spacing={4} sx={{ minInlineSize: 0 }}>
        {slots?.header}
        {slots?.context}

        {state === 'idle' ? (
          <EmptyCanvas copy={copy} draft={draft} onDraftChange={onDraftChange} onSubmit={onSubmit} />
        ) : (
          <Stack spacing={4} data-capture='nexa-answers-canvas-conversation' sx={motionSx}>
            {renderPlan && previousTurns.map(turn => <Box key={turn.id}>{renderPreviousTurn(turn, renderPlan, proofId)}</Box>)}
            {slots?.question ?? (question ? <QuestionBubble compact={state === 'followup'}>{question}</QuestionBubble> : null)}
            {slots?.identity ?? <NexaIdentity assistantName={copy.assistantName} status={identityStatus} label={identityLabel} />}
            {isErrorState(state) ? (
              <CanvasErrorState state={state} copy={copy} />
            ) : preAnswer ? (
              isReasoning && reasoningSteps && reasoningSteps.length > 0 ? (
                <NexaProvenanceTrace variant='expandable' steps={reasoningSteps} showFootprint />
              ) : null
            ) : isStreaming ? (
              streamingBlock ? <StreamingAnswerDraft block={streamingBlock} onStop={onStopGeneration} stopLabel={copy.stopLabel} /> : null
            ) : (
              // Settle: la respuesta + proof + sugeridos asientan con stagger orquestado del
              // Motion primitive (fromTo + clearProps → nunca deja el contenido oculto aunque
              // un hijo re-renderice; reduced-motion horneado).
              <Motion variant='stagger' as='div' style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minInlineSize: 0 }}>
                {slots?.answer ??
                  (primaryBlock && renderPlan
                    ? renderNexaAnswersBlock(primaryBlock, {
                        proofOpen: isProofOpen,
                        thinking,
                        renderPlan,
                        proofPanelId: proofId,
                        onProofToggle: toggleProof,
                        onAction
                      })
                    : null)}
                {onResponseControl ? (
                  <NexaResponseToolbar copy={copy} plainText={answerPlainText} onControl={onResponseControl} />
                ) : null}
                <CanvasProof id={proofId} open={isProofOpen} renderPlan={renderPlan} slot={slots?.proof} />
                {onSuggestedFollowUp && suggestedFollowUps && suggestedFollowUps.length > 0 ? (
                  <SuggestedFollowUps items={suggestedFollowUps} label={copy.suggestedFollowUpsLabel} onSelect={onSuggestedFollowUp} />
                ) : null}
              </Motion>
            )}
            {followUpQuestion ? <QuestionBubble compact>{followUpQuestion}</QuestionBubble> : null}
            {slots?.composer ?? (
              <CanvasComposer
                draft={draft}
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
                placeholder={copy.followUpPlaceholder}
                submitLabel={copy.followUpLabel}
              />
            )}
          </Stack>
        )}

        {slots?.footer}
        {slots?.sidecar}
      </Stack>
    </Box>
  )
}

export default NexaAnswersCanvas
