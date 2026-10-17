import { describe, expect, it, vi } from 'vitest'

import { EFEONCE_META_PROFILE as p, MetaReadError } from './client'
import { MetaMutationClient } from './mutation-client'
import type { MetaWritePlan } from './write-contract'

const SYSTEM = 'SYSTEM_TEST_' + 's'.repeat(64)
const PAGE = 'PAGE_TEST_' + 'p'.repeat(64)
const ownPost = p.pageId + '_900'
const principal = { id: p.principalId, name: p.principalName }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined

function fixture(handler?: Handler) {
  const calls: { url: URL; init?: RequestInit }[] = []

  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))

    calls.push({ url, init })
    const custom = await handler?.(url, init)

    if (custom) return custom
    if (url.pathname === '/v25.0/me') return json(principal)
    if (url.pathname.endsWith('/system_users')) return json({ data: [principal] })
    if (url.pathname === '/v25.0/' + p.pageId && url.searchParams.get('fields') === 'access_token') return json({ access_token: PAGE })
    if (init?.method === 'POST') return json({ id: '999' })
    if (url.pathname === '/v25.0/' + ownPost) return json({ id: ownPost, from: { id: p.pageId }, is_published: true, message: 'hello' })
    if (url.pathname === '/v25.0/100') return json({ id: '100', account_id: p.adAccountId, name: 'Campaign', status: 'PAUSED', objective: 'OUTCOME_LEADS' })
    if (url.pathname === '/v25.0/200') return json({ id: '200', account_id: p.adAccountId, campaign_id: '100', name: 'Ad set', status: 'PAUSED' })
    if (url.pathname === '/v25.0/300') return json({ id: '300', account_id: p.adAccountId, object_story_id: ownPost, name: 'Creative' })
    if (url.pathname === '/v25.0/400') return json({ id: '400', owner: { id: p.instagramId }, media_type: 'IMAGE' })

return json({ id: url.pathname.split('/').at(-1) })
  }) as typeof fetch


return { client: new MetaMutationClient({ tokenProvider: async () => SYSTEM, fetchImpl }), calls }
}

const campaign = (): MetaWritePlan => ({ operation: 'campaign_create', params: {
  name: 'Campaign', objective: 'OUTCOME_LEADS', special_ad_categories: [], status: 'PAUSED'
} })

describe('MetaMutationClient guarded creation', () => {
  it('creates only on the fixed edge, keeps auth in headers, and verifies paused ownership independently', async () => {
    const { client, calls } = fixture((url, init) => init?.method === 'POST' ? json({ id: '100' }) : undefined)
    const result = await client.submit(campaign())

    expect(result).toEqual({ id: '100' })
    const write = calls.find(call => call.init?.method === 'POST')!

    expect(write.url.toString()).toBe('https://graph.facebook.com/v25.0/act_' + p.adAccountId + '/campaigns')
    expect(write.init?.redirect).toBe('error')
    expect(new Headers(write.init?.headers).get('authorization')).toBe('Bearer ' + SYSTEM)
    const body = new URLSearchParams(String(write.init?.body))

    expect(body.get('special_ad_categories')).toBe('[]')
    expect(body.get('status')).toBe('PAUSED')
    expect(String(write.init?.body)).not.toContain(SYSTEM)
    expect((await client.readBack(campaign(), result)).verified).toBe(true)
    expect(calls.filter(call => call.init?.method === 'POST')).toHaveLength(1)
  })

  it('blocks arbitrary operations, activation, parameter overrides, and private media URLs before POST', async () => {
    const { client, calls } = fixture()

    const invalid: MetaWritePlan[] = [
      { ...campaign(), operation: 'campaign_update' } as never,
      { ...campaign(), params: { ...campaign().params, status: 'ACTIVE' } },
      { ...campaign(), params: { ...campaign().params, method: 'DELETE' } },
      { operation: 'ad_create', params: { name: 'x', status: 'PAUSED', adset_spec: {}, creative: { creative_id: '300' } } },
      { operation: 'facebook_photo_publish', params: { url: 'https://127.0.0.1/photo.jpg', published: true } },
      { operation: 'instagram_container_create', params: { image_url: 'https://example.test/photo.jpg?token=private' } },
      { operation: 'instagram_container_create', params: { image_url: 'https://10.0.0.1/photo.jpg' } },
      { operation: 'instagram_container_create', params: { image_url: 'https://example.test/photo.jpg', media_type: 'STORIES' } }
    ]

    for (const plan of invalid) await expect(client.submit(plan)).rejects.toMatchObject({ outcome: 'not_sent' })
    expect(calls.filter(call => call.init?.method === 'POST')).toHaveLength(0)
  })

  it('freshly verifies campaign, ad set, creative and original Page before creating an ad', async () => {
    const plan: MetaWritePlan = { operation: 'ad_create', params: { name: 'Ad', adset_id: '200', creative: { creative_id: '300' }, status: 'PAUSED' } }
    const { client, calls } = fixture()

    await client.submit(plan)
    const paths = calls.map(call => call.url.pathname)

    expect(paths.indexOf('/v25.0/200')).toBeLessThan(paths.indexOf('/v25.0/100'))
    expect(paths).toContain('/v25.0/300')
    expect(paths).toContain('/v25.0/' + ownPost)
    expect(paths.at(-1)).toBe('/v25.0/act_' + p.adAccountId + '/ads')
    const hostile = fixture(url => url.pathname === '/v25.0/100' ? json({ id: '100', account_id: 'other' }) : undefined)

    await expect(hostile.client.submit(plan)).rejects.toMatchObject({ outcome: 'not_sent', code: 'META_AD_ACCOUNT_OWNERSHIP_MISMATCH' })
    expect(hostile.calls.some(call => call.init?.method === 'POST')).toBe(false)
  })

  it('does not allow a claimed Page-post prefix to replace from.id ownership proof', async () => {
    const { client, calls } = fixture(url => url.pathname === '/v25.0/' + ownPost ? json({ id: ownPost, from: { id: 'foreign-page' } }) : undefined)

    await expect(client.submit({ operation: 'creative_create', params: { name: 'Creative', object_story_id: ownPost } }))
      .rejects.toMatchObject({ outcome: 'not_sent', code: 'META_FACEBOOK_POST_OWNERSHIP_MISMATCH' })
    expect(calls.some(call => call.init?.method === 'POST')).toBe(false)
  })

  it('requires exactly one explicit adset budget and does not accept hidden parent creation', async () => {
    const { client, calls } = fixture()

    for (const extra of [{}, { daily_budget: 10, lifetime_budget: 20 }, { lifetime_budget: 10 }, { daily_budget: 10, campaign_spec: {} }]) {
      await expect(client.submit({ operation: 'adset_create', params: { name: 'Ad set', campaign_id: '100', status: 'PAUSED', ...extra } }))
        .rejects.toMatchObject({ outcome: 'not_sent' })
    }

    expect(calls.some(call => call.init?.method === 'POST')).toBe(false)
  })

  it('replies via /comment/comments, resolving ownership, and never overwrites the comment node', async () => {
    const { client, calls } = fixture((url, init) => {
      if (url.pathname === '/v25.0/501' && init?.method === 'GET') return json({ id: '501', parent: { id: '500' } })
      if (url.pathname === '/v25.0/500') return json({ id: '500', object: { id: ownPost } })
      if (url.pathname === '/v25.0/999') return json({ id: '999', parent: { id: '501' }, message: 'reply', from: { id: p.pageId } })

return undefined
    })

    const plan: MetaWritePlan = { operation: 'facebook_comment_reply', targetId: '501', parentId: ownPost, params: { message: 'reply' } }
    const result = await client.submit(plan)

    expect(calls.filter(call => call.init?.method === 'POST').map(call => call.url.pathname)).toEqual(['/v25.0/501/comments'])
    expect((await client.readBack(plan, result)).verified).toBe(true)
    expect(new Headers(calls.find(call => call.init?.method === 'POST')?.init?.headers).get('authorization')).toBe('Bearer ' + PAGE)
  })

  it('rejects Facebook comments that resolve to another object', async () => {
    const { client, calls } = fixture(url => url.pathname === '/v25.0/500' ? json({ id: '500', object: { id: 'foreign-post' } }) : undefined)

    await expect(client.submit({ operation: 'facebook_comment_reply', targetId: '500', parentId: ownPost, params: { message: 'reply' } }))
      .rejects.toMatchObject({ outcome: 'not_sent', code: 'META_COMMENT_OWNERSHIP_MISMATCH' })
    expect(calls.some(call => call.init?.method === 'POST')).toBe(false)
  })

  it('checks IG comment.media and media.owner before the /replies edge', async () => {
    const plan: MetaWritePlan = { operation: 'instagram_comment_reply', targetId: '600', parentId: '400', params: { message: 'reply' } }
    const { client, calls } = fixture(url => url.pathname === '/v25.0/600' ? json({ id: '600', media: { id: '400' } }) : undefined)

    await client.submit(plan)
    expect(calls.filter(call => call.init?.method === 'POST').map(call => call.url.pathname)).toEqual(['/v25.0/600/replies'])
    const hostile = fixture(url => url.pathname === '/v25.0/400' ? json({ id: '400', owner: { id: 'other' } }) : undefined)

    await expect(hostile.client.submit(plan)).rejects.toMatchObject({ outcome: 'not_sent', code: 'META_INSTAGRAM_MEDIA_OWNERSHIP_MISMATCH' })
  })

  it('preserves distinct photo and post IDs and reads both back', async () => {
    const { client } = fixture((url, init) => {
      if (init?.method === 'POST') return json({ id: '700', post_id: ownPost })
      if (url.pathname === '/v25.0/700') return json({ id: '700', from: { id: p.pageId } })

return undefined
    })

    const plan: MetaWritePlan = { operation: 'facebook_photo_publish', params: { url: 'https://cdn.example.test/photo.jpg', published: true } }
    const result = await client.submit(plan)

    expect(result).toEqual({ id: '700', postId: ownPost })
    expect((await client.readBack(plan, result)).verified).toBe(true)
  })

  it('separates IG container accepted, pending, finished, and published states', async () => {
    let state = 'IN_PROGRESS'
    const { client, calls } = fixture(url => url.pathname === '/v25.0/999' ? json({ id: '999', status_code: state }) : undefined)
    const plan: MetaWritePlan = { operation: 'instagram_container_create', params: { image_url: 'https://cdn.example.test/photo.jpg' } }
    const result = await client.submit(plan)

    expect(await client.readBack(plan, result)).toMatchObject({ verified: false, pending: true })
    const publish: MetaWritePlan = { operation: 'instagram_publish', targetId: '999', params: { creation_id: '999' } }

    await expect(client.submit(publish)).rejects.toMatchObject({ outcome: 'not_sent', code: 'META_CONTAINER_NOT_READY' })
    state = 'FINISHED'
    expect(await client.readBack(plan, result)).toMatchObject({ verified: true })
    await client.submit(publish)
    expect(calls.filter(call => call.init?.method === 'POST').map(call => call.url.pathname))
      .toEqual(['/v25.0/' + p.instagramId + '/media', '/v25.0/' + p.instagramId + '/media_publish'])
    state = 'PUBLISHED'
    expect(await client.readBack(plan, result)).toMatchObject({ verified: true, data: { status_code: 'PUBLISHED' } })
    await expect(client.submit(publish)).rejects.toMatchObject({ outcome: 'not_sent', code: 'META_CONTAINER_NOT_READY' })
    const unrelated = fixture()

    await expect(unrelated.client.submit(publish)).rejects.toMatchObject({ outcome: 'not_sent', code: 'META_CONTAINER_PROVENANCE_REQUIRED' })
  })

  it('classifies explicit provider rejection and ambiguous outcomes without retry or leaking errors', async () => {
    const variants: [() => Response, string][] = [
      [() => json({ error: { code: 200, message: SYSTEM } }, 403), 'rejected'],
      [() => json({ error: { code: 1, message: PAGE } }, 500), 'unknown'],
      [() => new Response(SYSTEM, { status: 403 }), 'unknown'],
      [() => json({ success: true }), 'unknown'],
      [() => { throw new DOMException(SYSTEM, 'AbortError') }, 'unknown']
    ]

    for (const [response, outcome] of variants) {
      const { client, calls } = fixture((url, init) => init?.method === 'POST' ? response() : undefined)
      const error = await client.submit(campaign()).catch(value => value)

      expect(error).toMatchObject({ outcome })
      expect(String(error)).not.toContain(SYSTEM)
      expect(JSON.stringify(error)).not.toContain(PAGE)
      expect(calls.filter(call => call.init?.method === 'POST')).toHaveLength(1)
    }
  })

  it('keeps generic GET incapable of writes or arbitrary node proofs', async () => {
    const { client } = fixture()

    await expect(client.get('/500', {})).rejects.toBeInstanceOf(MetaReadError)
    await expect(client.get('/' + p.pageId + '/feed', { method: 'POST' })).rejects.toBeInstanceOf(MetaReadError)
  })

  it('verifies adset budgets and requested optimization, targeting, and schedule instead of identity alone', async () => {
    const params = { name: 'Ad set', campaign_id: '100', status: 'PAUSED', daily_budget: 100,
      optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: { geo_locations: { countries: ['CL', 'PE'] }, age_min: 21 },
      start_time: '2026-11-01T00:00:00Z' }

    const plan: MetaWritePlan = { operation: 'adset_create', params }
    let overrides: Record<string, unknown> = {}

    const { client, calls } = fixture(url => url.pathname === '/v25.0/200' ? json({ ...params,
      id: '200', account_id: p.adAccountId, daily_budget: '100', start_time: '2026-10-31T21:00:00-0300',
      targeting: { geo_locations: { countries: ['PE', 'CL'] }, age_min: 21, age_max: 65 }, ...overrides }) : undefined)

    expect((await client.readBack(plan, { id: '200' })).verified).toBe(true)
    overrides = { daily_budget: '200' }
    expect((await client.readBack(plan, { id: '200' })).verified).toBe(false)
    overrides = { optimization_goal: 'OFFSITE_CONVERSIONS' }
    expect((await client.readBack(plan, { id: '200' })).verified).toBe(false)
    overrides = { targeting: { geo_locations: { countries: ['CL', 'PE', 'MX'] }, age_min: 21 } }
    expect((await client.readBack(plan, { id: '200' })).verified).toBe(false)
    expect(calls.find(call => call.url.pathname === '/v25.0/200')?.url.searchParams.get('fields')).toContain('optimization_goal')
  })
})
