'use client'

import { useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import NexaComposer, { NexaComposerActionButton, NexaComposerInput } from '../NexaComposer'
import NexaEvidencePanel from '../NexaEvidencePanel'
import GreenhouseStatusDot from '../GreenhouseStatusDot'
import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import NexaSenderMark from '../NexaSenderMark'
import {
  assertNexaAnswersRenderPlanAllowed,
  NEXA_ANSWERS_CANVAS_VARIANT_CONFIG,
  resolveNexaAnswersCanvasDensity,
  resolveNexaAnswersCanvasVariant
} from './nexa-answers-canvas-controller'
import { renderNexaAnswersBlock } from './nexa-answers-canvas-renderers'
import type {
  NexaAnswersCanvasProps,
  NexaAnswersCanvasState,
  NexaAnswersCompactAnswerBlock,
  NexaAnswersRenderPlan
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

const NexaIdentity = ({ thinking, label, assistantName }: { thinking: boolean; label: string; assistantName: string }) => (
  <Stack spacing={1.25} data-capture='nexa-answers-canvas-identity'>
    <Stack direction='row' spacing={1.25} alignItems='center'>
      <NexaSenderMark />
      <Typography variant='h4' component='span' sx={{ lineHeight: 1.2, color: 'text.secondary' }}>
        {assistantName}
      </Typography>
    </Stack>
    {thinking ? (
      <Stack direction='row' spacing={1.25} alignItems='center' role='status' aria-live='polite' data-capture='nexa-answers-canvas-thinking'>
        <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
        <GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={5} dotSize={7} />
        <Box component='span' sx={visuallyHidden}>
          {label}
        </Box>
      </Stack>
    ) : (
      <Stack direction='row' spacing={1.25} alignItems='center' role='status' aria-live='polite'>
        <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
        <GreenhouseStatusDot tone='success' ariaLabel={label} />
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
      </Stack>
    )}
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

const renderPreviousTurn = (turn: NexaAnswersCompactAnswerBlock, renderPlan: NexaAnswersRenderPlan) =>
  renderNexaAnswersBlock(turn, {
    proofOpen: false,
    thinking: false,
    renderPlan,
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
  slots,
  copy,
  runtimeSlot,
  onAction
}: NexaAnswersCanvasProps) => {
  const theme = useTheme()
  const [internalProofOpen, setInternalProofOpen] = useState(false)
  const resolvedVariant = resolveNexaAnswersCanvasVariant({ kind, variant })
  const resolvedDensity = resolveNexaAnswersCanvasDensity({ density, kind, surfaceContext, variant: resolvedVariant })
  const variantConfig = NEXA_ANSWERS_CANVAS_VARIANT_CONFIG[resolvedVariant]
  const isProofOpen = proofOpen ?? internalProofOpen
  const proofId = `${surfaceContext.surfaceId.replace(/[^a-zA-Z0-9_-]/g, '-')}-proof`
  const thinking = isThinkingState(state)
  const primaryBlock = renderPlan?.blocks.find(block => block.id === renderPlan.primaryBlockId) ?? renderPlan?.blocks[0]

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
            {renderPlan && previousTurns.map(turn => <Box key={turn.id}>{renderPreviousTurn(turn, renderPlan)}</Box>)}
            {slots?.question ?? (question ? <QuestionBubble compact={state === 'followup'}>{question}</QuestionBubble> : null)}
            {slots?.identity ?? <NexaIdentity assistantName={copy.assistantName} thinking={thinking} label={thinking ? copy.thinkingLabel : copy.readyLabel} />}
            {isErrorState(state) ? (
              <CanvasErrorState state={state} copy={copy} />
            ) : slots?.answer ? (
              slots.answer
            ) : primaryBlock && renderPlan ? (
              renderNexaAnswersBlock(primaryBlock, {
                proofOpen: isProofOpen,
                thinking,
                renderPlan,
                onProofToggle: toggleProof,
                onAction
              })
            ) : null}
            <CanvasProof id={proofId} open={isProofOpen} renderPlan={renderPlan} slot={slots?.proof} />
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
