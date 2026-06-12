import type { NexaAnswerBubbleKind, NexaAnswerBubbleVariant } from './nexa-answer-bubble-types'

export interface NexaAnswerBubbleVariantConfig {
  variant: NexaAnswerBubbleVariant
  density: 'rich' | 'compact'
  chartFirst: boolean
}

export interface NexaAnswerBubbleKindConfig {
  kind: NexaAnswerBubbleKind
  variant: NexaAnswerBubbleVariant
}

export const NEXA_ANSWER_BUBBLE_VARIANT_CONFIG = {
  explanation: {
    variant: 'explanation',
    density: 'rich',
    chartFirst: false
  },
  chart: {
    variant: 'chart',
    density: 'compact',
    chartFirst: true
  },
  metricSummary: {
    variant: 'metricSummary',
    density: 'compact',
    chartFirst: false
  }
} as const satisfies Record<NexaAnswerBubbleVariant, NexaAnswerBubbleVariantConfig>

export const NEXA_ANSWER_BUBBLE_KIND_CONFIG = {
  knowledgeExplanationAnswer: {
    kind: 'knowledgeExplanationAnswer',
    variant: 'explanation'
  },
  knowledgeChartAnswer: {
    kind: 'knowledgeChartAnswer',
    variant: 'chart'
  },
  financeChartAnswer: {
    kind: 'financeChartAnswer',
    variant: 'chart'
  },
  financeMetricSummary: {
    kind: 'financeMetricSummary',
    variant: 'metricSummary'
  },
  commercialMetricSummary: {
    kind: 'commercialMetricSummary',
    variant: 'metricSummary'
  },
  agencyMetricSummary: {
    kind: 'agencyMetricSummary',
    variant: 'metricSummary'
  },
  peopleMetricSummary: {
    kind: 'peopleMetricSummary',
    variant: 'metricSummary'
  },
  surfaceMetricSummary: {
    kind: 'surfaceMetricSummary',
    variant: 'metricSummary'
  },
  surfaceChartInsight: {
    kind: 'surfaceChartInsight',
    variant: 'chart'
  },
  custom: {
    kind: 'custom',
    variant: 'explanation'
  }
} as const satisfies Record<NexaAnswerBubbleKind, NexaAnswerBubbleKindConfig>

export const resolveNexaAnswerBubbleVariant = ({
  kind,
  variant
}: {
  kind?: NexaAnswerBubbleKind
  variant?: NexaAnswerBubbleVariant
}): NexaAnswerBubbleVariant => variant ?? NEXA_ANSWER_BUBBLE_KIND_CONFIG[kind ?? 'custom'].variant
