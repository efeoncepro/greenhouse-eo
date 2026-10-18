import { inspect } from 'node:util'

import { describe, expect, it, vi } from 'vitest'

import { HubSpotLeadTraceClient } from './lead-trace-hubspot'

const TOKEN = 'pat-na1-' + 'x'.repeat(60)
const EMAIL = 'person@example.test'
const FORM = '12345678-1234-4321-abcd-123456789abc'
const NATIVE = 'abcdefab-1234-4321-abcd-123456789abc'
const OTHER = 'abcdefab-1234-4321-abcd-123456789abd'
const submittedAt = 1792251000000
const query = { formGuid: FORM, fromMs: submittedAt - 60000, toMs: submittedAt + 60000, email: EMAIL }
const row = (conversionId = NATIVE) => ({ conversionId, submittedAt, values: [{ name: 'email', value: EMAIL }, { name: 'firstname', value: 'Do not expose' }], pageUrl: 'https://example.test/private?secret=hidden' })
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

function fixture(handler?: (url: URL) => Response | undefined) {
  const calls: Array<{ url: URL; init?: RequestInit }> = []

  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))

    calls.push({ url, init })
    const response = handler?.(url)

    if (response) return response
    if (url.pathname === '/account-info/v3/details') return json({ portalId: 48713323 })
    if (url.pathname.startsWith('/form-integrations/')) return json({ results: [row()] })

    return json({ id: '123', archived: false, createdAt: '2020-01-01T00:00:00Z', updatedAt: '2026-10-17T12:00:00Z', properties: { email: EMAIL } })
  }) as typeof fetch

  const provider = vi.fn(async () => TOKEN)

  return { client: new HubSpotLeadTraceClient({ tokenProvider: provider, fetchImpl }), calls, provider }
}

describe('HubSpot lead trace read-only correlation', () => {
  it.each([undefined, 'hsforms-local', ''])('cannot call a marker exact when native conversionId is missing or invalid: %j', async conversionId => {
    const occurrenceMarker = { name: 'ef_greenhouse_submission_id', value: 'fsub-11111111-1111-4111-8111-111111111111' }

    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [{
      submittedAt, conversionId, values: [occurrenceMarker],
    }] }) : undefined)

    const result = await client.findFormSubmission({ ...query, occurrenceMarker })

    expect(result).toMatchObject({ status: 'unavailable', pagination: { complete: false }, safeErrorCode: 'hubspot_native_submission_id_missing' })
    expect(result).not.toHaveProperty('conversionId')
  })
  it('gates every data read on the fixed portal and caches that verification', async () => {
    const { client, calls, provider } = fixture()

    await client.findFormSubmission(query)
    await client.findContactByEmail({ email: EMAIL })
    expect(calls[0].url.pathname).toBe('/account-info/v3/details')
    expect(calls.filter(v => v.url.pathname === '/account-info/v3/details')).toHaveLength(1)
    expect(provider).toHaveBeenCalledOnce()

    for (const call of calls) {
      expect(call.url.origin).toBe('https://api.hubapi.com')
      expect(call.init?.method).toBe('GET')
      expect(call.init?.redirect).toBe('error')
      expect(new Headers(call.init?.headers).get('Authorization')).toBe('Bearer ' + TOKEN)
      expect(call.url.toString()).not.toContain(TOKEN)
    }

    expect(inspect(client)).not.toContain(TOKEN)
  })

  it('does not fetch records when the portal is another business', async () => {
    const { client, calls } = fixture(url => url.pathname === '/account-info/v3/details' ? json({ portalId: 19893546 }) : undefined)
    const result = await client.findFormSubmission(query)

    expect(result).toMatchObject({ status: 'denied', error: { code: 'hubspot_portal_mismatch' } })
    expect(calls).toHaveLength(1)
  })

  it('matches native identity in the selected form independently of time and email', async () => {
    const { client } = fixture()
    const exact = await client.findFormSubmission({ ...query, nativeSubmissionId: NATIVE })

    expect(exact).toMatchObject({ status: 'exact_submission', conversionId: NATIVE, matchedCount: 1, matches: [{ nativeSubmissionId: NATIVE, matchedBy: 'conversion_id', emailMatched: true }] })
    expect((await client.findFormSubmission({ ...query, nativeSubmissionId: OTHER })).status).toBe('not_found')
    expect((await client.findFormSubmission({ ...query, fromMs: submittedAt + 1, email: 'different@example.test', nativeSubmissionId: NATIVE })).status).toBe('exact_submission')
  })

  it('matches an opaque occurrence field without using email/time and never exposes the marker', async () => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }

    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/')
      ? json({ results: [{ ...row(), values: [{ ...marker }], submittedAt: submittedAt - 86400000 }] }) : undefined)

    const result = await client.findFormSubmission({ ...query, email: undefined, occurrenceMarker: marker })

    expect(result).toMatchObject({ status: 'exact_submission', conversionId: NATIVE, matchedCount: 1,
      matches: [{ matchedBy: 'occurrence_marker', emailMatched: false }], pagination: { complete: true } })
    expect(JSON.stringify(result)).not.toContain(marker.value)
    expect(JSON.stringify(result)).not.toContain(marker.name)
  })

  it('requires exact marker name/value equality with one occurrence of that field', async () => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }

    for (const values of [[{ name: 'wrong_property', value: marker.value }], [{ name: marker.name, value: 'fsub-' + OTHER }], [marker, marker]]) {
      const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [{ ...row(), values }] }) : undefined)

      expect((await client.findFormSubmission({ ...query, occurrenceMarker: marker })).status).toBe('not_found')
    }
  })

  it('does not fall back to email or a different marker when both native identities were supplied', async () => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }
    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [{ ...row(), values: [marker] }] }) : undefined)

    expect((await client.findFormSubmission({ ...query, occurrenceMarker: marker, nativeSubmissionId: OTHER })).status).toBe('not_found')
  })

  it('reports duplicate native occurrences with the same marker as ambiguous', async () => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }

    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/')
      ? json({ results: [{ ...row(), values: [marker] }, { ...row(OTHER), values: [marker] }] }) : undefined)

    expect(await client.findFormSubmission({ ...query, occurrenceMarker: marker })).toMatchObject({ status: 'ambiguous', matchedCount: 2 })
  })

  it.each(['marker', 'native'])('requires complete coverage before exact %s identity is confirmed', async kind => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }

    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/')
      ? json({ results: [{ ...row(), values: [marker] }], paging: { next: { after: 'NEXT' } } }) : undefined)

    const result = await client.findFormSubmission({ ...query, maxPages: 1,
      ...(kind === 'marker' ? { occurrenceMarker: marker } : { nativeSubmissionId: NATIVE }) })

    expect(result).toMatchObject({ status: 'partial', matchedCount: 1, pagination: { complete: false } })
    expect(result.conversionId).toBeUndefined()
  })

  it('rejects marker names and nonopaque marker values before resolving credentials', async () => {
    const { client, calls } = fixture()

    for (const occurrenceMarker of [{ name: 'bad name', value: NATIVE }, { name: 'email', value: EMAIL }, { name: 'valid', value: 'https://example.test' }])
      expect(await client.findFormSubmission({ ...query, occurrenceMarker })).toMatchObject({ status: 'unavailable', safeErrorCode: 'hubspot_correlation_input_invalid' })
    expect(calls).toHaveLength(0)
  })

  it('email and time alone are a candidate and never exact submission proof', async () => {
    const { client } = fixture()

    expect(await client.findFormSubmission(query)).toMatchObject({ status: 'candidate', matches: [{ matchedBy: 'email_and_time' }] })
  })

  it('marks multiple matching submissions ambiguous', async () => {
    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [row(), row(OTHER)] }) : undefined)

    expect((await client.findFormSubmission(query)).status).toBe('ambiguous')
  })

  it('refuses uncorrelated browsing and synthetic hsforms IDs before resolving credentials', async () => {
    const { client, calls } = fixture()
    const missing = await client.findFormSubmission({ ...query, email: undefined })
    const synthetic = await client.findFormSubmission({ ...query, nativeSubmissionId: 'hsforms-' + NATIVE })

    expect(missing).toMatchObject({ status: 'unavailable', error: { code: 'correlation_identity_missing' } })
    expect(synthetic).toMatchObject({ status: 'unavailable', error: { code: 'hubspot_correlation_input_invalid' } })
    expect(calls).toHaveLength(0)
  })

  it('reconstructs pagination only from after and preserves incomplete coverage', async () => {
    const { client, calls } = fixture(url => url.pathname.startsWith('/form-integrations/') ? url.searchParams.has('after')
      ? json({ results: [row()] })
      : json({ results: [], paging: { next: { after: 'CURSOR_A', link: 'https://evil.test/?token=' + TOKEN } } }) : undefined)

    const partial = await client.findFormSubmission({ ...query, maxPages: 1 })

    expect(partial).toMatchObject({ status: 'partial', pagination: { pages: 1, complete: false, hasMore: true, nextCursor: 'CURSOR_A' } })
    const complete = await client.findFormSubmission(query)

    expect(complete).toMatchObject({ status: 'candidate', pagination: { pages: 2, complete: true, hasMore: false } })
    expect(calls.at(-1)?.url.searchParams.get('after')).toBe('CURSOR_A')
    expect(calls.every(v => v.url.hostname === 'api.hubapi.com')).toBe(true)
  })

  it.each(['unexpected', { next: 'unexpected' }, { next: [] }])('does not promote exact evidence with malformed paging %j', async paging => {
    const marker = { name: 'ef_greenhouse_submission_id', value: 'fsub-' + NATIVE }

    const { client, calls } = fixture(url => url.pathname.startsWith('/form-integrations/')
      ? json({ results: [{ ...row(), values: [marker] }], paging }) : undefined)

    const result = await client.findFormSubmission({ ...query, email: undefined, occurrenceMarker: marker })

    expect(result).toMatchObject({ status: 'partial', matchedCount: 1,
      pagination: { pages: 1, complete: false, hasMore: true }, error: { code: 'hubspot_invalid_pagination_response' } })
    expect(result).not.toHaveProperty('conversionId')
    expect(result.pagination).not.toHaveProperty('nextCursor')
    expect(calls).toHaveLength(2)
    expect(JSON.stringify(result)).not.toContain(marker.value)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })

  it('does not report absent after a page limit or a later failure', async () => {
    let formRequests = 0

    const { client } = fixture(url => {
      if (!url.pathname.startsWith('/form-integrations/')) return undefined
      formRequests++

      return formRequests === 1 ? json({ results: [], paging: { next: { after: 'NEXT' } } }) : json({ message: EMAIL + TOKEN }, 500)
    })

    const result = await client.findFormSubmission(query)

    expect(result).toMatchObject({ status: 'partial', pagination: { pages: 1, complete: false, nextCursor: 'NEXT' }, error: { httpStatus: 500 } })
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })

  it.each(['https://evil.test/', 'unsafe cursor'])('blocks invalid cursor %s', async cursor => {
    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [], paging: { next: { after: cursor } } }) : undefined)

    expect(await client.findFormSubmission(query)).toMatchObject({ status: 'partial', error: { code: 'hubspot_invalid_or_repeated_cursor' } })
  })

  it('does not return a stale cursor on repeated successful pages', async () => {
    const { client } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ results: [], paging: { next: { after: 'REPEAT' } } }) : undefined)
    const result = await client.findFormSubmission(query)

    expect(result.status).toBe('partial')
    expect(result.pagination.nextCursor).toBeUndefined()
  })

  it.each([401, 403])('reports authorization %s without provider bodies or a fallback scope change', async status => {
    const { client, calls } = fixture(url => url.pathname.startsWith('/form-integrations/') ? json({ message: EMAIL + TOKEN, correlationId: 'private' }, status) : undefined)
    const result = await client.findFormSubmission(query)

    expect(result).toMatchObject({ status: 'denied', error: { code: 'hubspot_http_error', httpStatus: status } })
    expect(calls).toHaveLength(2)
    expect(JSON.stringify(result)).not.toContain('private')
  })

  it('retains existing contact identity/timestamps without treating it as a new form submission', async () => {
    const { client, calls } = fixture()
    const result = await client.findContactByEmail({ email: EMAIL.toUpperCase(), fromMs: submittedAt })

    expect(result).toMatchObject({ status: 'found', id: '123', contactId: '123', emailMatches: true, createdBeforeWindow: true, submissionProof: false, createdAt: '2020-01-01T00:00:00.000Z' })
    expect(calls.at(-1)?.url.pathname).toBe('/crm/objects/2026-03/contacts/person%40example.test')
    expect(calls.at(-1)?.url.searchParams.get('idProperty')).toBe('email')
    expect(await client.lookupContact(EMAIL)).toMatchObject({ status: 'found', contactId: '123', submissionProof: false })
  })

  it('reports a returned alias/email mismatch instead of inventing a matching current email', async () => {
    const { client } = fixture(url => url.pathname.includes('/contacts/') ? json({ id: '123', properties: { email: 'another@example.test' } }) : undefined)

    expect(await client.findContactByEmail({ email: EMAIL })).toMatchObject({ status: 'found', emailMatches: false, submissionProof: false })
  })

  it('distinguishes a contact 404 from a portal endpoint 404', async () => {
    const missing = fixture(url => url.pathname.includes('/contacts/') ? json({}, 404) : undefined)
    const wrongEndpoint = fixture(() => json({}, 404))

    expect((await missing.client.findContactByEmail({ email: EMAIL })).status).toBe('not_found')
    expect((await wrongEndpoint.client.findContactByEmail({ email: EMAIL })).status).toBe('unavailable')
  })

  it('redacts every raw field and token from success and error evidence', async () => {
    const { client } = fixture()
    const submission = await client.findFormSubmission(query)
    const contact = await client.findContactByEmail({ email: EMAIL })
    const output = JSON.stringify({ submission, contact })

    for (const secret of [EMAIL, TOKEN, 'Do not expose', 'pageUrl', 'firstname', 'hidden']) expect(output).not.toContain(secret)
    const failing = new HubSpotLeadTraceClient({ tokenProvider: async () => { throw new Error(EMAIL + TOKEN) } })

    expect(await failing.findFormSubmission(query)).toMatchObject({ status: 'unavailable', error: { code: 'hubspot_token_unavailable' } })
  })
})
