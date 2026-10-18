import { describe, expect, it, vi } from 'vitest'

import { GoogleAdsClient } from './client'
import { GOOGLE_ADS_PROFILE } from './contracts'
import { buildReadQuery, reportRange } from './queries'
import { buildWritePlan } from './writes'

const identity = { results: [{ customer: { id: '6862539491', timeZone: 'America/Santiago', currencyCode: 'CLP' } }] }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'request-id': 'safe-request-123' } })

const setup = (pages: Response[]) => {
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => { void input; void init;

return pages.shift()! })

  const tokenProvider = vi.fn(async () => 'private-access-token')

  return { client: new GoogleAdsClient({ tokenProvider, fetchImpl }), fetchImpl, tokenProvider }
}

describe('Google Ads bounded reader', () => {
  it('only dispatches the authorized account and manager, without developer-token or pageSize', async () => {
    const { client, fetchImpl } = setup([response(identity), response({ results: [{ campaign: { id: '1', name: 'safe', finalUrls: ['private'], secret: 'private' } }], credential: 'discard' })])
    const result = await client.read('campaigns list')

    expect(result.rows).toEqual([{ campaign: { id: '1', name: 'safe' } }])

    for (const [url, init] of fetchImpl.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toBe('https://googleads.googleapis.com/v26/customers/6862539491/googleAds:search')
      expect(init.headers).toMatchObject({ 'login-customer-id': '9531478329' })
      expect(init.headers).not.toHaveProperty('developer-token')
      expect(JSON.parse(String(init.body))).not.toHaveProperty('pageSize')
    }
  })

  it('rejects a different returned account before any inventory or mutation', async () => {
    const { client, fetchImpl } = setup([response({ results: [{ customer: { id: '123', timeZone: 'America/Santiago' } }] })])

    await expect(client.read('campaigns list')).rejects.toMatchObject({ code: 'CUSTOMER_BINDING_MISMATCH' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('preserves partial rows and a resumable cursor after the second page fails', async () => {
    const { client } = setup([response(identity), response({ results: [{ campaign: { id: '1' } }], nextPageToken: 'next-safe' }), response({ error: { message: 'private-access-token', details: [{ errors: [{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' }, message: 'private' }] }] } }, 429)])
    const result = await client.read('campaigns list', { pages: 2 })

    expect(result.rows).toHaveLength(1)
    expect(result.coverage).toMatchObject({ partial: true, complete: false, pages: 1 })
    expect(result.coverage.nextCursor).toBeTruthy()
    expect(JSON.stringify(result)).not.toContain('private-access-token')
    expect(result.coverage.error?.details.providerCodes).toEqual(['quotaError:RESOURCE_EXHAUSTED'])
  })

  it('rejects a cursor bound to another query before authentication', async () => {
    const { client, tokenProvider } = setup([])

    await expect(client.read('campaigns list', { cursor: Buffer.from(JSON.stringify({ hash: buildReadQuery('ads list').hash, token: 'safe' })).toString('base64url') })).rejects.toMatchObject({ code: 'INVALID_OR_MISMATCHED_CURSOR' })
    expect(tokenProvider).not.toHaveBeenCalled()
  })

  it('does not claim completion when a provider cursor cycles', async () => {
    const { client } = setup([response(identity), response({ results: [{ campaign: { id: '1' } }], nextPageToken: 'cycle' }), response({ results: [{ campaign: { id: '2' } }], nextPageToken: 'cycle' })])
    const result = await client.read('campaigns list', { pages: 3 })

    expect(result.coverage.complete).toBe(false)
    expect(result.coverage.error?.code).toBe('INVALID_OR_REPEATED_PROVIDER_CURSOR')
    expect(result.rows).toHaveLength(1)
  })

  it('keeps empty inventory distinct from a provider error', async () => {
    const { client } = setup([response(identity), response({})])

    expect(await client.read('campaigns list')).toMatchObject({ rows: [], coverage: { complete: true, partial: false } })
  })

  it('never follows a provider URL cursor or redirect', async () => {
    const { client, fetchImpl } = setup([response(identity), response({ nextPageToken: 'https://evil.invalid/secret' })])

    await client.read('campaigns list')
    expect(fetchImpl.mock.calls.every(call => String(call[0]).startsWith('https://googleads.googleapis.com/'))).toBe(true)
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].redirect).toBe('error')
  })

  it('redacts the active token even in a selected metadata field', async () => {
    const { client } = setup([response(identity), response({ results: [{ campaign: { name: 'private-access-token' } }] })])

    expect(JSON.stringify(await client.read('campaigns list'))).not.toContain('private-access-token')
  })
})

describe('Closed native measurement action bindings', () => {
  const trackingIdentity = { results: [{ customer: {
    id: '6862539491', timeZone: 'America/Santiago', currencyCode: 'CLP',
    conversionTrackingSetting: { conversionTrackingId: '18432951465', googleAdsConversionCustomer: 'customers/6862539491' },
  } }] }

  const action = (meeting = false) => ({ conversionAction: {
    name: meeting ? 'Efeonce - Agenda confirmada' : 'Efeonce - Solicitud comercial aceptada',
    resourceName: `customers/6862539491/conversionActions/${meeting ? '124' : '123'}`, ownerCustomer: 'customers/6862539491',
    status: 'ENABLED', type: 'WEBPAGE', category: meeting ? 'BOOK_APPOINTMENT' : 'SUBMIT_LEAD_FORM',
    countingType: 'ONE_PER_CLICK', primaryForGoal: false,
    tagSnippets: [{ type: 'WEBPAGE', pageFormat: 'HTML', eventSnippet: `{'send_to':'AW-18432951465/${meeting ? 'meeting' : 'lead'}'}; unexpectedPrivateMarkup()` }],
  } })

  it('paginates the two exact names and emits only verified binding fields', async () => {
    const { client, fetchImpl } = setup([response(trackingIdentity), response({ results: [action()], nextPageToken: 'next-bindings' }), response({ results: [action(true)] })])
    const result = await client.readMeasurementActionBindings({ pages: 3 })

    expect(result).toMatchObject({ ready: true, blockers: [], coverage: { pages: 2, complete: true, partial: false } })
    expect(result.bindings).toHaveLength(2)
    expect(result.bindings[0]).toEqual({ actionKey: 'commercial_lead', customerId: '6862539491', resourceName: 'customers/6862539491/conversionActions/123', conversionId: 'AW-18432951465', conversionLabel: 'lead' })
    expect(JSON.stringify(result)).not.toContain('unexpectedPrivateMarkup')
    expect(JSON.stringify(result)).not.toContain('tagSnippets')
    const query = JSON.parse(String((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body)).query

    expect(query).toContain("conversion_action.name IN ('Efeonce - Solicitud comercial aceptada', 'Efeonce - Agenda confirmada')")
    expect(query).toContain('conversion_action.tag_snippets')
    expect(fetchImpl.mock.calls.every(([url]) => String(url).endsWith('/googleAds:search'))).toBe(true)
  })

  it('preserves a verified first-page binding while blocking readiness on incomplete inventory', async () => {
    const { client } = setup([response(trackingIdentity), response({ results: [action()], nextPageToken: 'next' }), response({ error: { message: 'private-access-token' } }, 500)])
    const result = await client.readMeasurementActionBindings({ pages: 2 })

    expect(result).toMatchObject({ ready: false, coverage: { pages: 1, partial: true, complete: false } })
    expect(result.bindings).toHaveLength(1)
    expect(result.blockers).toContain('binding_inventory_incomplete')
    expect(JSON.stringify(result)).not.toContain('private-access-token')
  })

  it('does not assume completion after observing two rows if there is another page', async () => {
    const { client } = setup([response(trackingIdentity), response({ results: [action(), action(true)], nextPageToken: 'next' })])

    expect(await client.readMeasurementActionBindings()).toMatchObject({ ready: false, coverage: { partial: true } })
  })

  it('rejects duplicate same-name native actions across pages rather than choosing one', async () => {
    const duplicate = action()

    duplicate.conversionAction.resourceName = 'customers/6862539491/conversionActions/999'
    const { client } = setup([response(trackingIdentity), response({ results: [action(), action(true)], nextPageToken: 'next' }), response({ results: [duplicate] })])
    const result = await client.readMeasurementActionBindings({ pages: 2 })

    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('native_action_duplicate:commercial_lead')
    expect(result.bindings.map(item => item.actionKey)).toEqual(['meeting_booking'])
  })

  it.each([
    { ownerCustomer: 'customers/9531478329' }, { type: 'GOOGLE_ANALYTICS_4_GENERATE_LEAD' },
    { status: 'HIDDEN' }, { primaryForGoal: true }, { category: 'BOOK_APPOINTMENT' },
    { tagSnippets: [{ type: 'WEBPAGE', pageFormat: 'HTML', eventSnippet: "{'send_to':'AW-999/wrong'}" }] },
    { tagSnippets: [{ type: 'WEBPAGE', pageFormat: 'HTML', eventSnippet: "{'send_to':'AW-18432951465/lead','send_to':'AW-18432951465/other'}" }] },
  ])('blocks incompatible provider readback without exposing snippet details %j', async change => {
    const bad = { conversionAction: { ...action().conversionAction, ...change } }
    const { client } = setup([response(trackingIdentity), response({ results: [bad, action(true)] })])
    const result = await client.readMeasurementActionBindings()

    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('invalid_native_action_binding:commercial_lead')
    expect(result.bindings.map(item => item.actionKey)).not.toContain('commercial_lead')
    expect(JSON.stringify(result)).not.toContain('send_to')
  })

  it('reports missing native actions as blocked, not a ready empty inventory', async () => {
    const { client } = setup([response(trackingIdentity), response({ results: [] })])
    const result = await client.readMeasurementActionBindings()

    expect(result).toMatchObject({ ready: false, bindings: [], coverage: { complete: true } })
    expect(result.blockers).toContain('native_action_missing:commercial_lead')
    expect(result.blockers).toContain('native_action_missing:meeting_booking')
  })

  it('never leaks an active credential accidentally returned inside an otherwise valid label', async () => {
    const row = action()

    row.conversionAction.tagSnippets[0].eventSnippet = "{'send_to':'AW-18432951465/private-access-token'}"
    const { client } = setup([response(trackingIdentity), response({ results: [row, action(true)] })])
    const result = await client.readMeasurementActionBindings()

    expect(result.ready).toBe(false)
    expect(JSON.stringify(result)).not.toContain('private-access-token')
  })

  it('requires account tracking identity before querying action snippets', async () => {
    const { client, fetchImpl } = setup([response(identity)])

    await expect(client.readMeasurementActionBindings()).rejects.toMatchObject({ code: 'CONVERSION_TRACKING_BINDING_UNAVAILABLE' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects arbitrary IDs, fields or cursors before resolving credentials', async () => {
    const { client, tokenProvider } = setup([])

    await expect(client.readMeasurementActionBindings({ cursor: 'override' } as never)).rejects.toMatchObject({ code: 'BINDINGS_OPTION_NOT_ALLOWED' })
    expect(tokenProvider).not.toHaveBeenCalled()
  })
})

describe('Dates and query safety', () => {
  it('resolves completed days in Santiago, independent of host UTC date', () => {
    expect(reportRange({}, new Date('2026-10-18T01:30:00Z'))).toMatchObject({ since: '2026-10-10', until: '2026-10-16', timeZone: GOOGLE_ADS_PROFILE.timeZone })
  })

  it.each([{ since: '', until: '' }, { since: '2026-02-30', until: '2026-03-01' }, { since: '2026-01-01' }, { since: "2026-01-01' OR true", until: '2026-01-03' }, { days: 91 }, { since: '2026-10-18', until: '2026-10-17' }, { since: '2026-10-01', until: '2026-10-17', days: 7 }])('rejects invalid dates or injection %j', options => {
    expect(() => reportRange(options)).toThrow()
  })

  it('only permits known reporting grains', () => {
    expect(() => buildReadQuery('report get', { level: 'toString' as never })).toThrow()
    expect(buildReadQuery('report get', { daily: true }).query).toContain('segments.date')
  })
})

describe('Write transport authorization', () => {
  const input = { operation: 'campaignBudget.create', fields: { name: 'Budget', amountMicros: '1000000' } }

  it('rejects a mismatched confirmation before resolving any token', async () => {
    const { client, tokenProvider } = setup([])

    await expect(client.executeWrite(input, { validateOnly: false, confirmDigest: 'wrong' })).rejects.toMatchObject({ code: 'WRITE_CONFIRMATION_DIGEST_REQUIRED' })
    expect(tokenProvider).not.toHaveBeenCalled()
  })

  it('uses Google validateOnly and requires native result for committed writes', async () => {
    const { client, fetchImpl } = setup([response(identity), response({}), response({ results: [{ resourceName: 'customers/6862539491/campaignBudgets/123' }] })])

    expect(await client.executeWrite(input, { validateOnly: true })).toMatchObject({ validated: true })
    expect(await client.executeWrite(input, { validateOnly: false, confirmDigest: buildWritePlan(input).digest })).toMatchObject({ resourceName: 'customers/6862539491/campaignBudgets/123' })
    expect(JSON.parse(String((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body)).validateOnly).toBe(true)
    expect(JSON.parse(String((fetchImpl.mock.calls[2] as unknown as [string, RequestInit])[1].body)).validateOnly).toBe(false)
  })

  it('records uncertainty when a successful response has no native resource', async () => {
    const { client } = setup([response(identity), response({})])

    await expect(client.executeWrite(input, { validateOnly: false, confirmDigest: buildWritePlan(input).digest })).rejects.toMatchObject({ code: 'WRITE_RESULT_UNKNOWN', exitCode: 7 })
  })

  it('selects and compares the actual field updated, rather than just resource existence', async () => {
    const input = { operation: 'adGroup.update', resourceName: 'customers/6862539491/adGroups/1', fields: { cpcBidMicros: '2000000' } }
    const { client, fetchImpl } = setup([response(identity), response({ results: [{ adGroup: { cpcBidMicros: '1000000' } }] })])
    const result = await client.readback(input, input.resourceName)

    expect(result.verification).toMatchObject({ complete: true, matched: false })
    expect(String((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body)).toContain('ad_group.cpc_bid_micros')
  })

  it('marks missing fields as verification pending', async () => {
    const input = { operation: 'adGroup.update', resourceName: 'customers/6862539491/adGroups/1', fields: { cpcBidMicros: '2000000' } }
    const { client } = setup([response(identity), response({ results: [{ adGroup: {} }] })])

    expect((await client.readback(input, input.resourceName)).verification).toMatchObject({ complete: false, matched: false })
  })

  it('rejects a receipt crossed with another resource in the same account before auth', async () => {
    const input = { operation: 'campaignBudget.update', resourceName: 'customers/6862539491/campaignBudgets/1', fields: { amountMicros: '1000000' } }
    const { client, tokenProvider } = setup([])

    await expect(client.readback(input, 'customers/6862539491/campaignBudgets/2')).rejects.toMatchObject({ code: 'READBACK_RESOURCE_MISMATCH' })
    expect(tokenProvider).not.toHaveBeenCalled()
  })

  it('never accepts an update result for another native resource', async () => {
    const input = { operation: 'campaignBudget.update', resourceName: 'customers/6862539491/campaignBudgets/1', fields: { amountMicros: '1000000' } }
    const { client } = setup([response(identity), response({ results: [{ resourceName: 'customers/6862539491/campaignBudgets/2' }] })])

    await expect(client.executeWrite(input, { validateOnly: false, confirmDigest: buildWritePlan(input).digest })).rejects.toMatchObject({ code: 'WRITE_RESULT_RESOURCE_MISMATCH', exitCode: 7 })
  })
})
