import type { ReactNode } from 'react'

import type { GreenhouseButtonKind, GreenhouseButtonTone, GreenhouseButtonVariant } from '../greenhouse-button-controller'
import type { NexaExpressiveTextValue } from '../nexa-expressive-text/nexa-expressive-text-types'

export type NexaAnswerBubbleVariant = 'explanation' | 'chart' | 'metricSummary' | 'actionPlan'

export type NexaAnswerBubbleKind =
  | 'knowledgeChartAnswer'
  | 'knowledgeExplanationAnswer'
  | 'financeChartAnswer'
  | 'financeMetricSummary'
  | 'commercialMetricSummary'
  | 'agencyMetricSummary'
  | 'peopleMetricSummary'
  | 'surfaceMetricSummary'
  | 'financeActionPlan'
  | 'commercialActionPlan'
  | 'agencyActionPlan'
  | 'peopleActionPlan'
  | 'surfaceActionPlan'
  | 'surfaceChartInsight'
  | 'custom'

export type NexaAnswerChartMode = 'trend' | 'comparison' | 'composition'

export type NexaAnswerChartTone = 'primary' | 'secondary' | 'success'

export interface NexaAnswerPoint {
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
}

export interface NexaAnswerTrustCue {
  tone: 'success' | 'warning' | 'info'
  label: NexaExpressiveTextValue
  detail: NexaExpressiveTextValue
}

export interface NexaAnswerAction {
  label: string
  iconClassName: string
  kind?: GreenhouseButtonKind
  variant?: GreenhouseButtonVariant
  tone?: Extract<GreenhouseButtonTone, 'primary' | 'secondary'>
  onClick?: () => void
  disabled?: boolean
  disabledReason?: string
}

export interface NexaAnswerChartSeriesPoint {
  label: string
  [key: string]: string | number
}

export interface NexaAnswerChartSeries {
  key: string
  label: string
  compactLabel?: string
  tone: NexaAnswerChartTone
}

export interface NexaAnswerChartCompositionPoint {
  label: string
  value: number
  tone: NexaAnswerChartTone
}

export interface NexaAnswerChartSpec {
  title: NexaExpressiveTextValue
  helper: NexaExpressiveTextValue
  valueSuffix?: string
  modes: Array<{
    mode: NexaAnswerChartMode
    label: string
    ariaLabel: string
  }>
  series: NexaAnswerChartSeries[]
  trend: NexaAnswerChartSeriesPoint[]
  composition: NexaAnswerChartCompositionPoint[]
}

export type NexaAnswerMetricDeltaTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface NexaAnswerMetricTrendPoint {
  label: string
  value: number
}

export interface NexaAnswerMetricSummaryItem {
  id: string
  label: NexaExpressiveTextValue
  value: NexaExpressiveTextValue
  helper?: NexaExpressiveTextValue
  deltaLabel: NexaExpressiveTextValue
  deltaTone: NexaAnswerMetricDeltaTone
  trend: NexaAnswerMetricTrendPoint[]
  emphasis?: boolean
}

export interface NexaAnswerMetricSummarySpec {
  title: NexaExpressiveTextValue
  helper: NexaExpressiveTextValue
  interpretation: NexaExpressiveTextValue
  metrics: NexaAnswerMetricSummaryItem[]
}

export type NexaAnswerActionPlanTradeOffTone = 'positive' | 'caution' | 'neutral'

export type NexaAnswerActionPlanRiskSeverity = 'low' | 'medium' | 'high'

export interface NexaAnswerActionPlanStep {
  id: string
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
}

export interface NexaAnswerActionPlanTradeOff {
  id: string
  label: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  tone: NexaAnswerActionPlanTradeOffTone
}

export interface NexaAnswerActionPlanRisk {
  id: string
  label: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  severity: NexaAnswerActionPlanRiskSeverity
}

export interface NexaAnswerActionPlanSpec {
  decisionLabel: NexaExpressiveTextValue
  decisionTitle: NexaExpressiveTextValue
  decisionBody: NexaExpressiveTextValue
  steps: NexaAnswerActionPlanStep[]
  tradeOffs: NexaAnswerActionPlanTradeOff[]
  risks: NexaAnswerActionPlanRisk[]
}

export interface NexaAnswerBubbleProps {
  variant?: NexaAnswerBubbleVariant
  kind?: NexaAnswerBubbleKind
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  metaLabel: NexaExpressiveTextValue
  points: NexaAnswerPoint[]
  actions: NexaAnswerAction[]
  trustCue: NexaAnswerTrustCue
  proofOpen: boolean
  onProofToggle: () => void
  /** Id del panel de proof (owned por el canvas) al que apunta aria-controls del toggle. */
  proofPanelId?: string
  thinking?: boolean
  chart?: NexaAnswerChartSpec
  metricSummary?: NexaAnswerMetricSummarySpec
  actionPlan?: NexaAnswerActionPlanSpec
}

export interface NexaCompactAnswerBubbleProps {
  title: NexaExpressiveTextValue
  body: NexaExpressiveTextValue
  endSlot?: ReactNode
}
