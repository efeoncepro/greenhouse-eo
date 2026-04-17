'use client'

import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'
import type { NexaInsightItem } from '@/components/greenhouse/NexaInsightsBlock'
import type { AgencyAiLlmSummary } from '@/lib/ico-engine/ai/llm-types'

type Props = {
  aiLlm: AgencyAiLlmSummary
}

const IcoAdvisoryBlock = ({ aiLlm }: Props) => {
  const insights: NexaInsightItem[] = aiLlm.recentEnrichments.map(item => ({
    id: item.enrichmentId,
    signalType: item.signalType,
    metricId: item.metricName,
    severity: item.severity,
    explanation: item.explanationSummary,
    rootCauseNarrative: item.rootCauseNarrative,
    recommendedAction: item.recommendedAction
  }))

  return (
    <NexaInsightsBlock
      insights={insights}
      totalAnalyzed={aiLlm.totals.total}
      lastAnalysis={aiLlm.lastProcessedAt}
      runStatus={aiLlm.latestRun?.status ?? null}
    />
  )
}

export default IcoAdvisoryBlock
