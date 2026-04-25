import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { recordQuoteAcceptance } from '../accept-quote'

describe('recordQuoteAcceptance — input validation', () => {
  it('throws when acceptedByName is empty', async () => {
    await expect(
      recordQuoteAcceptance({
        quotationId: 'quo-1',
        versionNumber: 1,
        acceptedByName: ''
      })
    ).rejects.toThrow(/required/)
  })

  it('throws when acceptedByName is only whitespace', async () => {
    await expect(
      recordQuoteAcceptance({
        quotationId: 'quo-1',
        versionNumber: 1,
        acceptedByName: '   '
      })
    ).rejects.toThrow(/required/)
  })
})
