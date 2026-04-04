import { describe, expect, it } from 'vitest'

import { buildCreativeVelocityReviewContract } from '@/lib/ico-engine/creative-velocity-review'
import {
  buildCreativeMethodologicalAcceleratorsCardData,
  buildCreativeCvrStructureCardData,
  buildCreativeCvrTierMatrixCardData,
  buildCreativeNarrativeGuardrailsCardData
} from '@/lib/capability-queries/creative-cvr'

const creativeVelocityReview = buildCreativeVelocityReviewContract({
  tasks: [
    {
      completedAt: '2026-04-01T12:00:00.000Z',
      frameVersions: 3,
      clientChangeRounds: 0,
      workflowChangeRounds: 1,
      clientReviewOpen: false,
      workflowReviewOpen: false,
      openFrameComments: 0
    }
  ],
  throughput: {
    value: 18
  }
})

describe('creative-cvr builders', () => {
  it('builds the CVR structure card as a metric list', () => {
    const card = buildCreativeCvrStructureCardData(creativeVelocityReview)

    expect(card.type).toBe('metric-list')

    if (card.type !== 'metric-list') {
      throw new Error('Unexpected card type')
    }

    expect(card.items).toHaveLength(5)
    expect(card.items[0]?.label).toBe('Resumen ejecutivo')
  })

  it('builds a tier matrix that keeps Basic without Revenue Enabled', () => {
    const card = buildCreativeCvrTierMatrixCardData(creativeVelocityReview)

    expect(card.type).toBe('tier-matrix')

    if (card.type !== 'tier-matrix') {
      throw new Error('Unexpected card type')
    }

    const revenueEnabledRow = card.rows.find(row => row.id === 'revenue-enabled')

    expect(revenueEnabledRow?.basic.label).toBe('No incluido')
    expect(revenueEnabledRow?.pro.label).toBe('Visible con policy')
    expect(card.intro).toContain('no hace hard-gating')
  })

  it('builds narrative guardrails that keep proxy signals out of observed revenue', () => {
    const card = buildCreativeNarrativeGuardrailsCardData(creativeVelocityReview)

    expect(card.type).toBe('metric-list')

    if (card.type !== 'metric-list') {
      throw new Error('Unexpected card type')
    }

    const proxyRule = card.items.find(item => item.label === 'No inflar proxies')

    expect(proxyRule?.value).toBe('Nunca')
    expect(proxyRule?.detail).toContain('revenue observado')
  })

  it('builds a methodological accelerators card without opening a parallel enterprise surface', () => {
    const card = buildCreativeMethodologicalAcceleratorsCardData(creativeVelocityReview)

    expect(card.type).toBe('metric-list')

    if (card.type !== 'metric-list') {
      throw new Error('Unexpected card type')
    }

    expect(card.items).toHaveLength(2)
    expect(card.items[0]?.label).toBe('Design System')
    expect(card.items[1]?.label).toBe('Brand Voice para AI')
  })
})
