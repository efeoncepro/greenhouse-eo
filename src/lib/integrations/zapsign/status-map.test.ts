import { describe, expect, it } from 'vitest'

import { mapZapSignDocumentStatus, mapZapSignSignerStatus } from './status-map'

describe('mapZapSignSignerStatus', () => {
  it('maps signed → signed, refused → declined, everything else → pending', () => {
    expect(mapZapSignSignerStatus('signed')).toBe('signed')
    expect(mapZapSignSignerStatus('SIGNED')).toBe('signed')
    expect(mapZapSignSignerStatus('refused')).toBe('declined')
    expect(mapZapSignSignerStatus('new')).toBe('pending')
    expect(mapZapSignSignerStatus('link-opened')).toBe('pending')
    expect(mapZapSignSignerStatus(null)).toBe('pending')
    expect(mapZapSignSignerStatus(undefined)).toBe('pending')
  })
})

describe('mapZapSignDocumentStatus', () => {
  it('signed → completed', () => {
    expect(mapZapSignDocumentStatus({ status: 'signed', signers: [] })).toBe('completed')
  })

  it('refused → failed', () => {
    expect(mapZapSignDocumentStatus({ status: 'refused', signers: [] })).toBe('failed')
  })

  it('defensive expired / cancelled mapping', () => {
    expect(mapZapSignDocumentStatus({ status: 'expired', signers: [] })).toBe('expired')
    expect(mapZapSignDocumentStatus({ status: 'cancelled', signers: [] })).toBe('cancelled')
    expect(mapZapSignDocumentStatus({ status: 'canceled', signers: [] })).toBe('cancelled')
  })

  it('pending with no signer signed → sent', () => {
    expect(
      mapZapSignDocumentStatus({ status: 'pending', signers: [{ token: 'a', status: 'new' }] })
    ).toBe('sent')
  })

  it('pending with some signer signed → partially_signed', () => {
    expect(
      mapZapSignDocumentStatus({
        status: 'pending',
        signers: [
          { token: 'a', status: 'signed' },
          { token: 'b', status: 'new' }
        ]
      })
    ).toBe('partially_signed')
  })

  it('unknown status falls back conservatively (sent / partially_signed)', () => {
    expect(mapZapSignDocumentStatus({ status: 'whatever', signers: [] })).toBe('sent')
    expect(
      mapZapSignDocumentStatus({ status: 'whatever', signers: [{ token: 'a', status: 'signed' }] })
    ).toBe('partially_signed')
  })
})
