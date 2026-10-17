import { describe, expect, it } from 'vitest'

import { createHubSpotFormReceipt, parseHubSpotFormReceipt, HUBSPOT_SUBMISSION_ID_PROPERTY } from '../receipts'

const SOURCE = 'fsub-b2222222-2222-4222-8222-222222222222'
const mapping = { portalId: '48713323', formGuid: 'd4444444-4444-4444-8444-444444444444', submissionIdProperty: HUBSPOT_SUBMISSION_ID_PROPERTY }

describe('native form receipt contract', () => {
  it('starts pending with a source occurrence ID and delayed GET check', () => {
    expect(createHubSpotFormReceipt(mapping, SOURCE, new Date('2026-10-17T20:00:00Z'))).toMatchObject({
      status: 'pending', markerValue: SOURCE, checks: 0, nextCheckAt: '2026-10-17T20:00:30.000Z'
    })
  })
  it.each([
    [{ ...mapping, portalId: '19893546' }, SOURCE], [{ ...mapping, submissionIdProperty: 'email' }, SOURCE],
    [{ ...mapping, formGuid: 'invalid' }, SOURCE], [mapping, 'private@example.test'],
    [{ ...mapping, submissionIdProperty: undefined }, SOURCE],
  ])('does not silently turn identity or missing configuration into a marker', (input, source) => {
    expect(createHubSpotFormReceipt(input, source)).toBeNull()
  })
  it('drops unexpected payload values, including PII', () => {
    const parsed = parseHubSpotFormReceipt({ ...createHubSpotFormReceipt(mapping, SOURCE), email: 'private@example.test', rawResponse: 'secret' })

    expect(parsed).not.toBeNull()
    expect(JSON.stringify(parsed)).not.toMatch(/private|secret|rawResponse|email/)
  })
  it.each([{ checks: 9 }, { checks: -1 }, { nextCheckAt: 'invalid' }, { safeErrorCode: 'raw private@example.test' }, { paginationComplete: 'true' }])('rejects malformed durable evidence', extra => {
    expect(parseHubSpotFormReceipt({ ...createHubSpotFormReceipt(mapping, SOURCE), ...extra })).toBeNull()
  })
})
