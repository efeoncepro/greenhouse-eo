import { describe, expect, it } from 'vitest'

import { buildDealQuoteRollup } from '@/lib/commercial-intelligence/deal-pipeline-materializer'

describe('buildDealQuoteRollup', () => {
  it('returns empty rollup for deals without quotes', () => {
    expect(buildDealQuoteRollup([])).toEqual({
      latestQuoteId: null,
      latestQuoteStatus: null,
      quoteCount: 0,
      approvedQuoteCount: 0,
      totalQuotesAmountClp: null
    })
  })

  it('counts approval evidence and excludes rejected/expired quotes from active totals', () => {
    const rollup = buildDealQuoteRollup([
      {
        quotationId: 'quo-older',
        status: 'rejected',
        totalAmountClp: 1200,
        createdAt: '2026-04-18T10:00:00.000Z',
        hasApprovalEvidence: false
      },
      {
        quotationId: 'quo-approved',
        status: 'sent',
        totalAmountClp: 2500,
        createdAt: '2026-04-18T12:00:00.000Z',
        hasApprovalEvidence: true
      },
      {
        quotationId: 'quo-latest',
        status: 'draft',
        totalAmountClp: 3200,
        createdAt: '2026-04-18T14:00:00.000Z',
        hasApprovalEvidence: false
      },
      {
        quotationId: 'quo-expired',
        status: 'expired',
        totalAmountClp: 800,
        createdAt: '2026-04-18T15:00:00.000Z',
        hasApprovalEvidence: false
      }
    ])

    expect(rollup).toEqual({
      latestQuoteId: 'quo-expired',
      latestQuoteStatus: 'expired',
      quoteCount: 4,
      approvedQuoteCount: 1,
      totalQuotesAmountClp: 5700
    })
  })
})
