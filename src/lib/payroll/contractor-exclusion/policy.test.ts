import { describe, expect, it } from 'vitest'

import { deriveContractorExclusion } from './policy'
import type { ContractorExclusionFacts } from './types'

describe('deriveContractorExclusion (TASK-957 Slice A)', () => {
  it('excludes a member with an engaged (active) ContractorEngagement', () => {
    const facts: ContractorExclusionFacts = {
      memberId: 'm1',
      engagementPublicId: 'EO-CENG-0001',
      engagementStatus: 'active'
    }

    const verdict = deriveContractorExclusion(facts)

    expect(verdict).toEqual({
      memberId: 'm1',
      excluded: true,
      engagementPublicId: 'EO-CENG-0001',
      engagementStatus: 'active',
      reason: 'active_contractor_engagement'
    })
  })

  it.each(['active', 'paused', 'ending'] as const)('excludes for engaged status %s', status => {
    const verdict = deriveContractorExclusion({
      memberId: 'm1',
      engagementPublicId: 'EO-CENG-0002',
      engagementStatus: status
    })

    expect(verdict.excluded).toBe(true)
    expect(verdict.reason).toBe('active_contractor_engagement')
  })

  it('does NOT exclude when there is no engaged engagement (null status)', () => {
    const facts: ContractorExclusionFacts = {
      memberId: 'legacy-deel-contractor',
      engagementPublicId: null,
      engagementStatus: null
    }

    const verdict = deriveContractorExclusion(facts)

    expect(verdict).toEqual({
      memberId: 'legacy-deel-contractor',
      excluded: false,
      engagementPublicId: null,
      engagementStatus: null,
      reason: null
    })
  })

  it('clears engagement metadata when not engaged (defensive)', () => {
    // A facts object should never carry a publicId without a status, but the
    // policy must not leak metadata for a non-excluded verdict.
    const verdict = deriveContractorExclusion({
      memberId: 'm1',
      engagementPublicId: 'EO-CENG-LEAK',
      engagementStatus: null
    })

    expect(verdict.excluded).toBe(false)
    expect(verdict.engagementPublicId).toBeNull()
  })
})
