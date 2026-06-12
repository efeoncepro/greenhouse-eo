import type { ReactNode } from 'react'

export type NexaAnswerBubbleVariant = 'explanation' | 'chart' | 'metricSummary'

export type NexaAnswerBubbleKind =
  | 'knowledgeChartAnswer'
  | 'knowledgeExplanationAnswer'
  | 'financeChartAnswer'
  | 'financeMetricSummary'
  | 'commercialMetricSummary'
  | 'agencyMetricSummary'
  | 'peopleMetricSummary'
  | 'surfaceMetricSummary'
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
  variant: 'outlined' | 'text'
  tone: 'primary' | 'secondary'
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
}

export interface NexaCompactAnswerBubbleProps {
  title: string
  body: string
  endSlot?: ReactNode
}
