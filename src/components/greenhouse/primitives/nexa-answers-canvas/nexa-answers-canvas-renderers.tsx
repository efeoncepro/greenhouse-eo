'use client'

import type { ReactNode } from 'react'

import GreenhouseChip from '../GreenhouseChip'
import NexaAnswerBubble, { NexaCompactAnswerBubble } from '../nexa-answer-bubble/NexaAnswerBubble'
import type {
  NexaAnswersAction,
  NexaAnswersRenderBlock,
  NexaAnswersRendererKind,
  NexaAnswersRenderPlan
} from './nexa-answers-canvas-types'

export interface NexaAnswersBlockRenderContext {
  proofOpen: boolean
  thinking: boolean
  renderPlan: NexaAnswersRenderPlan
  onProofToggle: () => void
  onAction?: (action: NexaAnswersAction) => void
}

type NexaAnswersBlockRenderer = (block: NexaAnswersRenderBlock, context: NexaAnswersBlockRenderContext) => ReactNode

const toAnswerAction = (action: NexaAnswersAction, onAction?: (action: NexaAnswersAction) => void) => ({
  label: action.label,
  iconClassName: action.iconClassName,
  variant: action.disabledReason ? ('text' as const) : action.variant,
  tone: action.tone,
  disabled: Boolean(action.disabledReason),
  disabledReason: action.disabledReason,
  onClick: action.disabledReason ? undefined : () => onAction?.(action)
})

const renderAnswerBubble: NexaAnswersBlockRenderer = (block, context) => {
  if (block.renderer !== 'answerBubble') return null

  const actions = block.actions ?? context.renderPlan.actions

  return (
    <NexaAnswerBubble
      variant={block.variant}
      kind={block.kind}
      title={block.title}
      body={block.body}
      metaLabel={block.metaLabel}
      points={block.points}
      actions={actions.map(action => toAnswerAction(action, context.onAction))}
      trustCue={block.trustCue ?? context.renderPlan.trustCue}
      proofOpen={context.proofOpen}
      onProofToggle={context.onProofToggle}
      thinking={context.thinking}
      chart={block.chart}
      metricSummary={block.metricSummary}
      actionPlan={block.actionPlan}
    />
  )
}

const renderCompactAnswer: NexaAnswersBlockRenderer = block => {
  if (block.renderer !== 'compactAnswer') return null

  return (
    <NexaCompactAnswerBubble
      title={block.title}
      body={block.body}
      endSlot={block.trustLabel ? <GreenhouseChip size='small' variant='label' tone='success' label={block.trustLabel} /> : undefined}
    />
  )
}

export const NEXA_ANSWERS_RENDERER_REGISTRY = {
  answerBubble: renderAnswerBubble,
  compactAnswer: renderCompactAnswer
} as const satisfies Record<NexaAnswersRendererKind, NexaAnswersBlockRenderer>

export const renderNexaAnswersBlock = (block: NexaAnswersRenderBlock, context: NexaAnswersBlockRenderContext) =>
  NEXA_ANSWERS_RENDERER_REGISTRY[block.renderer](block, context)
