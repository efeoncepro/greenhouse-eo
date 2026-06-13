'use client'

import type { ReactNode } from 'react'

import GreenhouseChip from '../GreenhouseChip'
import NexaAnswerBubble, { NexaCompactAnswerBubble } from '../nexa-answer-bubble/NexaAnswerBubble'
import NexaConversationBubble from '../nexa-conversation-bubble/NexaConversationBubble'
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
  proofPanelId: string
  onProofToggle: () => void
  onAction?: (action: NexaAnswersAction) => void
}

type NexaAnswersBlockRenderer = (block: NexaAnswersRenderBlock, context: NexaAnswersBlockRenderContext) => ReactNode

const toAnswerAction = (action: NexaAnswersAction, onAction?: (action: NexaAnswersAction) => void) => ({
  label: action.label,
  iconClassName: action.iconClassName,
  kind: action.kind,
  variant: action.disabledReason ? ('text' as const) : action.variant,
  tone: action.tone,
  disabled: action.disabled || Boolean(action.disabledReason),
  disabledReason: action.disabledReason,
  onClick: action.disabled || action.disabledReason ? undefined : () => onAction?.(action)
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
      proofPanelId={context.proofPanelId}
      thinking={context.thinking}
      chart={block.chart}
      metricSummary={block.metricSummary}
      actionPlan={block.actionPlan}
    />
  )
}

const renderConversationBubble: NexaAnswersBlockRenderer = (block, context) => {
  if (block.renderer !== 'conversationBubble') return null

  const actions = block.actions ?? []

  return (
    <NexaConversationBubble
      variant={block.variant}
      kind={block.kind}
      title={block.title}
      body={block.body}
      metaLabel={block.metaLabel}
      assistantName={block.assistantName}
      senderLabel={block.senderLabel}
      tone={block.tone}
      thinkingLabel={block.thinkingLabel}
      actions={actions.map(action => toAnswerAction(action, context.onAction))}
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
  conversationBubble: renderConversationBubble,
  compactAnswer: renderCompactAnswer
} as const satisfies Record<NexaAnswersRendererKind, NexaAnswersBlockRenderer>

export const renderNexaAnswersBlock = (block: NexaAnswersRenderBlock, context: NexaAnswersBlockRenderContext) =>
  NEXA_ANSWERS_RENDERER_REGISTRY[block.renderer](block, context)
