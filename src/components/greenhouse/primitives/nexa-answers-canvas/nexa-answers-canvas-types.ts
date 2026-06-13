import type { ReactNode } from 'react'

import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

import type {
  NexaAnswerAction,
  NexaAnswerActionPlanSpec,
  NexaAnswerBubbleKind,
  NexaAnswerBubbleVariant,
  NexaAnswerChartSpec,
  NexaAnswerMetricSummarySpec,
  NexaAnswerPoint,
  NexaAnswerTrustCue
} from '../nexa-answer-bubble/nexa-answer-bubble-types'
import type {
  NexaConversationBubbleKind,
  NexaConversationBubbleTone,
  NexaConversationBubbleVariant
} from '../nexa-conversation-bubble/nexa-conversation-bubble-types'
import type { NexaExpressiveTextValue } from '../nexa-expressive-text/nexa-expressive-text-types'

export type NexaAnswersCanvasMode = 'renderPlan' | 'runtime'

export type NexaAnswersCanvasVariant = 'embedded' | 'sidecar' | 'inline'

export type NexaAnswersCanvasKind =
  | 'knowledgeEmbedded'
  | 'financeChartEmbedded'
  | 'agencyInsightEmbedded'
  | 'peopleInsightEmbedded'
  | 'commercialInsightEmbedded'
  | 'custom'

export type NexaAnswersCanvasDensity = 'inlineCompact' | 'embeddedStandard' | 'wideAnalytical' | 'sidecar' | 'mobileStack'

export type NexaAnswersCanvasState =
  | 'idle'
  | 'submitted'
  | 'thinking'
  | 'streaming'
  | 'answered'
  | 'proofOpen'
  | 'followup'
  | 'compacted'
  | 'degraded'
  | 'error'

export type NexaAnswersIntent = 'explain' | 'compare' | 'diagnose' | 'recommend' | 'summarize'

export type NexaAnswersAutonomyTier = 'observeOnly' | 'recommendWithApproval' | 'executeWithApproval' | 'executeWithLogging'

export type NexaAnswersActionRiskLevel = 'low' | 'medium' | 'high'

export interface NexaAnswersSurfaceContext {
  surfaceId: string
  domain: 'knowledge' | 'finance' | 'agency' | 'people' | 'commercial' | 'home' | 'custom'
  placement: 'embedded' | 'chart' | 'sidecar' | 'floating' | 'inline'
  density?: NexaAnswersCanvasDensity
  dataReality: 'mock' | 'synthetic' | 'partial' | 'strong'
  sensitivity: 'public' | 'tenant_internal' | 'confidential' | 'restricted'
  allowedRenderers: NexaAnswersRendererKind[]
  allowedActions: string[]
}

export interface NexaAnswersAction extends NexaAnswerAction {
  id: string
  intent: 'openSource' | 'explain' | 'convertToPlan' | 'flagGap' | 'drillDown' | 'createTask' | 'comparePeriod' | 'custom'
  riskLevel: NexaAnswersActionRiskLevel
  capability?: string
  requiresConfirmation?: boolean
  disabledReason?: string
}

export interface NexaAnswersProofSpec {
  id: string
  label: string
  collapsedLabel: string
  expandedLabel: string
  evidence?: ConversationalEvidencePacket
  unavailableReason?: string
}

export type NexaAnswersRendererKind = 'answerBubble' | 'compactAnswer' | 'conversationBubble'

export interface NexaAnswersBlockBase {
  id: string
  renderer: NexaAnswersRendererKind
  rendererVersion: 'v1'
}

export interface NexaAnswersBubbleBlock extends NexaAnswersBlockBase {
  renderer: 'answerBubble'
  variant?: NexaAnswerBubbleVariant
  kind?: NexaAnswerBubbleKind
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  metaLabel: NexaExpressiveTextValue
  points: NexaAnswerPoint[]
  actions?: NexaAnswersAction[]
  trustCue?: NexaAnswerTrustCue
  chart?: NexaAnswerChartSpec
  metricSummary?: NexaAnswerMetricSummarySpec
  actionPlan?: NexaAnswerActionPlanSpec
}

export interface NexaAnswersCompactAnswerBlock extends NexaAnswersBlockBase {
  renderer: 'compactAnswer'
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  trustLabel?: string
}

export interface NexaAnswersConversationBubbleBlock extends NexaAnswersBlockBase {
  renderer: 'conversationBubble'
  variant?: NexaConversationBubbleVariant
  kind?: NexaConversationBubbleKind
  title?: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  metaLabel?: NexaExpressiveTextValue
  assistantName?: string
  senderLabel?: string
  tone?: NexaConversationBubbleTone
  thinkingLabel?: string
  actions?: NexaAnswersAction[]
}

export type NexaAnswersRenderBlock =
  | NexaAnswersBubbleBlock
  | NexaAnswersCompactAnswerBlock
  | NexaAnswersConversationBubbleBlock

export interface NexaAnswersRenderPlan {
  id: string
  version: 'nexa-answer-render-plan.v1'
  intent: NexaAnswersIntent
  autonomyTier: NexaAnswersAutonomyTier
  primaryBlockId: string
  blocks: NexaAnswersRenderBlock[]
  trustCue: NexaAnswerTrustCue
  actions: NexaAnswersAction[]
  proof: NexaAnswersProofSpec
}

export interface NexaAnswersSuggestedFollowUp {
  id: string
  label: string
}

export interface NexaAnswersCanvasCopy {
  assistantName: string
  idleTitle: string
  idleBody: string
  idlePlaceholder: string
  followUpPlaceholder: string
  submitLabel: string
  followUpLabel: string
  thinkingLabel: string
  /** Status del live region mientras la respuesta llega (streaming). */
  streamingLabel: string
  readyLabel: string
  /** Encabezado compacto sobre los chips de follow-up sugeridos. */
  suggestedFollowUpsLabel: string
  degradedTitle: string
  degradedBody: string
  errorTitle: string
  errorBody: string
}

export interface NexaAnswersCanvasSlots {
  header?: ReactNode
  context?: ReactNode
  question?: ReactNode
  identity?: ReactNode
  answer?: ReactNode
  trust?: ReactNode
  proof?: ReactNode
  composer?: ReactNode
  footer?: ReactNode
  sidecar?: ReactNode
}

export interface NexaAnswersCanvasProps {
  mode?: NexaAnswersCanvasMode
  variant?: NexaAnswersCanvasVariant
  kind?: NexaAnswersCanvasKind
  density?: NexaAnswersCanvasDensity
  state: NexaAnswersCanvasState
  surfaceContext: NexaAnswersSurfaceContext
  renderPlan?: NexaAnswersRenderPlan
  question?: string
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  proofOpen?: boolean
  onProofToggle?: () => void
  previousTurns?: NexaAnswersCompactAnswerBlock[]
  followUpQuestion?: string | null
  /** Próximas preguntas sugeridas; aparecen al terminar la respuesta (answered/followup). */
  suggestedFollowUps?: NexaAnswersSuggestedFollowUp[]
  onSuggestedFollowUp?: (followUp: NexaAnswersSuggestedFollowUp) => void
  slots?: NexaAnswersCanvasSlots
  copy: NexaAnswersCanvasCopy
  runtimeSlot?: ReactNode
  onAction?: (action: NexaAnswersAction) => void
}
