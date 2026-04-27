'use client'

import type {
  HomeAiInsightsBentoData,
  HomeBlockEnvelope,
  HomeClosingCountdownData,
  HomeHeroAiData,
  HomePulseStripData,
  HomeRecentsRailData,
  HomeReliabilityRibbonData,
  HomeTodayInboxData
} from '@/lib/home/contract'

import { HomeBlockSkeleton } from './HomeBlockSkeleton'
import { HomeClosingCountdown } from './HomeClosingCountdown'
import { HomeDegradedCard } from './HomeDegradedCard'
import { HomeHeroAi } from './HomeHeroAi'
import { HomePulseStrip } from './HomePulseStrip'
import { HomeTodayInbox } from './HomeTodayInbox'

/**
 * Block id → React component mapping. Adding a new block in the registry
 * requires (1) adding the loader, (2) adding the case here, (3) creating
 * the component file. JSX never branches on audience or role — the
 * registry already filtered the eligible blocks server-side.
 */

interface HomeBlockRendererProps {
  envelope: HomeBlockEnvelope
}

export const HomeBlockRenderer = ({ envelope }: HomeBlockRendererProps) => {
  if (envelope.outcome === 'hidden') return null

  if (envelope.outcome === 'error' || (envelope.outcome === 'degraded' && envelope.data === null)) {
    return <HomeDegradedCard envelope={envelope} />
  }

  if (envelope.data === null) {
    return <HomeBlockSkeleton blockId={envelope.blockId} />
  }

  switch (envelope.blockId) {
    case 'pulse-strip':
      return <HomePulseStrip data={envelope.data as HomePulseStripData} />
    case 'hero-ai':
      return <HomeHeroAi data={envelope.data as HomeHeroAiData} />
    case 'today-inbox':
      return <HomeTodayInbox data={envelope.data as HomeTodayInboxData} />
    case 'closing-countdown':
      return <HomeClosingCountdown data={envelope.data as HomeClosingCountdownData} />
    case 'ai-insights-bento':
    case 'recents-rail':
    case 'reliability-ribbon':
      // Slice 3 lands the remaining per-block components.
      return <HomeBlockSkeleton blockId={envelope.blockId} />
    default:
      return null
  }
}

export type {
  HomeAiInsightsBentoData,
  HomeClosingCountdownData,
  HomeHeroAiData,
  HomePulseStripData,
  HomeRecentsRailData,
  HomeReliabilityRibbonData,
  HomeTodayInboxData
}
