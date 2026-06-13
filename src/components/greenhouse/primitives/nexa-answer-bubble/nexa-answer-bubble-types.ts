import type { ReactNode } from 'react'

import type { GreenhouseButtonKind, GreenhouseButtonTone, GreenhouseButtonVariant } from '../greenhouse-button-controller'

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
  title: string
  body: string
}

export interface NexaAnswerTrustCue {
  tone: 'success' | 'warning' | 'info'
  label: string
  detail: string
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
  title: string
  helper: string
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
  label: string
  value: string
  helper?: string
  deltaLabel: string
  deltaTone: NexaAnswerMetricDeltaTone
  trend: NexaAnswerMetricTrendPoint[]
  emphasis?: boolean
}

export interface NexaAnswerMetricSummarySpec {
  title: string
  helper: string
  interpretation: string
  metrics: NexaAnswerMetricSummaryItem[]
}

export type NexaAnswerActionPlanTradeOffTone = 'positive' | 'caution' | 'neutral'

export type NexaAnswerActionPlanRiskSeverity = 'low' | 'medium' | 'high'

export interface NexaAnswerActionPlanStep {
  id: string
  title: string
  body: string
}

export interface NexaAnswerActionPlanTradeOff {
  id: string
  label: string
  body: string
  tone: NexaAnswerActionPlanTradeOffTone
}

export interface NexaAnswerActionPlanRisk {
  id: string
  label: string
  body: string
  severity: NexaAnswerActionPlanRiskSeverity
}

export interface NexaAnswerActionPlanSpec {
  decisionLabel: string
  decisionTitle: string
  decisionBody: string
  steps: NexaAnswerActionPlanStep[]
  tradeOffs: NexaAnswerActionPlanTradeOff[]
  risks: NexaAnswerActionPlanRisk[]
}

export interface NexaAnswerBubbleProps {
  variant?: NexaAnswerBubbleVariant
  kind?: NexaAnswerBubbleKind
  title: string
  body: string
  metaLabel: string
  points: NexaAnswerPoint[]
  actions: NexaAnswerAction[]
  trustCue: NexaAnswerTrustCue
  proofOpen: boolean
  onProofToggle: () => void
  thinking?: boolean
  chart?: NexaAnswerChartSpec
  metricSummary?: NexaAnswerMetricSummarySpec
  actionPlan?: NexaAnswerActionPlanSpec
}

export interface NexaCompactAnswerBubbleProps {
  title: string
  body: string
  endSlot?: ReactNode
}
