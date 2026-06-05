import { describe, expect, it } from 'vitest'

import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import { contractingSignatureBridgeProjection } from './contracting-signature-bridge'

describe('contractingSignatureBridgeProjection', () => {
  it('triggers on the 4 terminal/progress signature events', () => {
    expect(contractingSignatureBridgeProjection.triggerEvents).toEqual([
      EVENT_TYPES.signatureRequestCompleted,
      EVENT_TYPES.signatureRequestPartiallySigned,
      EVENT_TYPES.signatureRequestFailed,
      EVENT_TYPES.signatureRequestExpired
    ])
  })

  describe('extractScope — filters to contracting-sourced requests only', () => {
    it('returns the case scope for a contracting_case request', () => {
      expect(
        contractingSignatureBridgeProjection.extractScope({
          sourceKind: 'contracting_case',
          sourceRef: 'wcc-1',
          signatureRequestId: 'sig-1'
        })
      ).toEqual({ entityType: 'workforce_contracting_case', entityId: 'wcc-1' })
    })

    it('skips a master_agreement request (coexistence — handled by its own lane)', () => {
      expect(
        contractingSignatureBridgeProjection.extractScope({
          sourceKind: 'master_agreement',
          sourceRef: 'msa-1'
        })
      ).toBeNull()
    })

    it('skips when sourceRef is missing', () => {
      expect(
        contractingSignatureBridgeProjection.extractScope({ sourceKind: 'contracting_case' })
      ).toBeNull()
    })
  })

  it('retries up to 5 times before dead-letter', () => {
    expect(contractingSignatureBridgeProjection.maxRetries).toBe(5)
  })
})
