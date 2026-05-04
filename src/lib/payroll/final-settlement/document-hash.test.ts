import { describe, expect, it } from 'vitest'

import { computeBytesSha256, computeJsonSha256, stableStringify } from './document-hash'

describe('final settlement document hashing', () => {
  it('canonicalizes object keys before hashing snapshots', () => {
    const first = {
      finalSettlement: { id: 'settlement-1', totals: { gross: 100, net: 80 } },
      breakdown: [{ code: 'vacation', amount: 100 }]
    }

    const second = {
      breakdown: [{ amount: 100, code: 'vacation' }],
      finalSettlement: { totals: { net: 80, gross: 100 }, id: 'settlement-1' }
    }

    expect(stableStringify(first)).toBe(stableStringify(second))
    expect(computeJsonSha256(first)).toBe(computeJsonSha256(second))
  })

  it('hashes PDF bytes independently from snapshot hash', () => {
    const contentHash = computeBytesSha256(Buffer.from('finiquito-pdf-v1'))

    expect(contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(contentHash).not.toBe(computeJsonSha256({ bytes: 'finiquito-pdf-v1' }))
  })
})
