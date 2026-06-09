import { describe, expect, it } from 'vitest'

import { mapSignatureStatusToContractingTransition } from './signature-status-map'

describe('mapSignatureStatusToContractingTransition', () => {
  it('completed → fully_signed + signature_completed event', () => {
    expect(mapSignatureStatusToContractingTransition('completed')).toEqual({
      caseStatus: 'fully_signed',
      outboxEvent: 'signature_completed'
    })
  })

  it('failed → signature_failed + signature_failed event', () => {
    expect(mapSignatureStatusToContractingTransition('failed')).toEqual({
      caseStatus: 'signature_failed',
      outboxEvent: 'signature_failed'
    })
  })

  it('expired → expired (case) + signature_failed event (attention needed)', () => {
    expect(mapSignatureStatusToContractingTransition('expired')).toEqual({
      caseStatus: 'expired',
      outboxEvent: 'signature_failed'
    })
  })

  it('partially_signed → partially_signed, audit-only (no outbox)', () => {
    expect(mapSignatureStatusToContractingTransition('partially_signed')).toEqual({
      caseStatus: 'partially_signed',
      outboxEvent: null
    })
  })

  it('non-terminal provider states drive no contracting transition', () => {
    expect(mapSignatureStatusToContractingTransition('draft')).toBeNull()
    expect(mapSignatureStatusToContractingTransition('sent')).toBeNull()
    expect(mapSignatureStatusToContractingTransition('cancelled')).toBeNull()
  })
})
