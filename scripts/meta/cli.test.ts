import { describe, expect, it, vi } from 'vitest'

import type { MetaReadClient} from './client';
import { MetaReadError } from './client'
import { discoverMeta, parseMetaArguments, runMetaCli } from './cli'

const now = () => new Date('2026-10-18T01:30:00Z') // 17 October in Chile.
const complete = { pages: 1, hasMore: false, complete: true, limitReached: false }

const fakeClient = () => {
  const calls = {
    verifyIdentity: vi.fn().mockResolvedValue({ principal: { id: 'expected' }, businessMembership: { matched: true } }),
    get: vi.fn().mockResolvedValue({ id: 'safe' }),
    list: vi.fn().mockResolvedValue({ data: [{ id: 'safe' }], pagination: complete }),
  }


return { calls, client: calls as unknown as MetaReadClient }
}

describe('Meta agent CLI contract', () => {
  it('discovers without resolving a credential or making requests', async () => {
    const tokenProvider = vi.fn(() => { throw Error('must not run') })
    const result = await runMetaCli(['discover'], { tokenProvider, now })

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({ ok: true, contractVersion: 'meta-agent.v2', command: 'discover' })
    expect(tokenProvider).not.toHaveBeenCalled()
    expect(discoverMeta().readOnly).toBe(false)
    expect(discoverMeta().readCommands.some(x => /POST|DELETE|create|publish/.test(x))).toBe(false)
    expect(discoverMeta().writes).toBeDefined()
  })

  it.each([
    ['ads', 'create'], ['toString'], ['request', 'GET', '/me'], ['posts', 'list', '--token', 'secret'],
    ['account', 'get', '--content'], ['events', 'stats', '--days', '8'],
    ['campaigns', 'list', '--pages', '11'], ['campaigns', 'list', '--limit', '0'],
    ['comments', 'list', '--post-id', 'other_123'], ['instagram', 'media', '--fields', 'access_token'],
    ['events', 'stats', '--source', 'unknown'], ['events', 'stats', '--event', '../events'],
    ['campaigns', 'list', '--cursor', 'unsafe\ntext'],
  ])('rejects invalid or write-like arguments before auth: %j', async (...args) => {
    const { client, calls } = fakeClient()
    const result = await runMetaCli(args, { client, now })

    expect(result.exitCode).toBe(2)
    expect(result.output.ok).toBe(false)
    expect(calls.verifyIdentity).not.toHaveBeenCalled()
  })

  it('uses the Chile calendar date and includes exactly the requested days', () => {
    const { plan } = parseMetaArguments(['insights', 'get', '--days', '7'], now())

    expect(JSON.parse(String(plan?.params.time_range))).toEqual({ since: '2026-10-11', until: '2026-10-17' })
  })

  it('keeps stats a seven-day mobile UTC window and selects the documented source', () => {
    const { plan } = parseMetaArguments(['events', 'stats', '--source', 'server', '--event', 'Lead'], now())

    expect(plan?.params.event_source).toBe('SERVER_ONLY')
    expect(plan?.params.event).toBe('Lead')
    expect(Number(plan?.params.end_time) - Number(plan?.params.start_time)).toBe(7 * 86400)
  })

  it('makes content explicit and never requests conversation participants or messages', () => {
    expect(parseMetaArguments(['posts', 'list']).plan?.params.fields).not.toContain('message')
    expect(parseMetaArguments(['posts', 'list', '--content']).plan?.params.fields).toContain('message')
    const { plan } = parseMetaArguments(['conversations', 'list', '--platform', 'instagram'])

    expect(plan?.path).toBe('/17841437175569224/conversations')
    expect(plan?.params.fields).toBe('id,updated_time')
    expect(plan?.credential).toBe('page')
  })

  it('checks identity before reading and preserves partial coverage with exit 6', async () => {
    const { client, calls } = fakeClient()

    calls.list.mockResolvedValue({ data: [{ id: 'safe' }], pagination: { pages: 1, hasMore: true, nextCursor: 'next', complete: false, limitReached: true } })
    const result = await runMetaCli(['campaigns', 'list', '--pages', '1', '--limit', '25'], { client, now })

    expect(calls.verifyIdentity.mock.invocationCallOrder[0]).toBeLessThan(calls.list.mock.invocationCallOrder[0])
    expect(result.exitCode).toBe(6)
    expect(result.output).toMatchObject({ ok: true, pagination: { complete: false, hasMore: true, nextCursor: 'next' } })
  })

  it('stops after a denied identity gate and omits raw errors', async () => {
    const { client, calls } = fakeClient()

    calls.verifyIdentity.mockRejectedValue(new MetaReadError('principal_mismatch', 4))
    const result = await runMetaCli(['account', 'get'], { client, now })

    expect(result.exitCode).toBe(4)
    expect(calls.get).not.toHaveBeenCalled()
    calls.verifyIdentity.mockRejectedValue(new Error('raw provider message with private-token-value'))
    const failed = await runMetaCli(['account', 'get'], { client, now })

    expect(JSON.stringify(failed)).not.toContain('private-token-value')
    expect(failed.output).toMatchObject({ ok: false, error: { code: 'local_operation_failed' } })
  })
  it('lists all metric names without resolving a token', async () => {
    const tokenProvider = vi.fn(() => { throw Error('must not run') })
    const result = await runMetaCli(['metrics', 'list', '--surface', 'ads'], { tokenProvider, now })

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({ contractVersion: 'meta-agent.v2', command: 'metrics list' })
    expect(tokenProvider).not.toHaveBeenCalled()
  })

  it('validates custom advertising fields and extended pixel aggregations before reading', () => {
    expect(parseMetaArguments(['insights', 'get', '--fields', 'ctr,cpc', '--breakdowns', 'age']).plan?.params)
      .toMatchObject({ fields: 'ctr,cpc', breakdowns: '["age"]' })
    expect(() => parseMetaArguments(['insights', 'get', '--fields', 'secret_unknown'])).toThrow(MetaReadError)
    expect(discoverMeta().metrics.pixelAggregations).toHaveLength(16)
  })

  it('checks Instagram media ownership before requesting comment text', async () => {
    const { client, calls } = fakeClient()
    const inspectInstagramMedia = vi.fn().mockRejectedValue(new MetaReadError('META_INSTAGRAM_MEDIA_OWNERSHIP_MISMATCH', 4))

    Object.assign(client, { inspectInstagramMedia })
    const result = await runMetaCli(['instagram', 'comments', 'list', '--media-id', '123', '--content'], { client, now })

    expect(result.exitCode).toBe(4)
    expect(inspectInstagramMedia).toHaveBeenCalledWith('123')
    expect(calls.list).not.toHaveBeenCalled()
  })

})
