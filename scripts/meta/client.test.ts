import { inspect } from 'node:util'

import { describe, expect, it, vi } from 'vitest'

import { EFEONCE_META_PROFILE as p, MetaReadClient, MetaReadError } from './client'

const SYSTEM = 'TEST_SYSTEM_' + 's'.repeat(64)
const PAGE = 'TEST_PAGE_' + 'p'.repeat(64)
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
    if (url.pathname === '/v25.0/' + p.pageId && url.searchParams.get('fields') === 'access_token')
      return json({ access_token: PAGE })

    return json({ data: [] })
  }) as typeof fetch

  const provider = vi.fn(async () => SYSTEM)


  return { client: new MetaReadClient({ tokenProvider: provider, fetchImpl }), calls, provider }
}

describe('MetaReadClient read boundary', () => {
  it('verifies exact identity and Business membership once before asset reads', async () => {
    const { client, calls, provider } = fixture()
    const identity = await client.verifyIdentity()

    expect(identity).toEqual({
      principal,
      businessMembership: { businessId: p.businessId, matched: true },
      appBinding: 'observed_in_token_generation_ui; not_introspected'
    })
    identity.principal.id = 'caller mutation'
    await client.get('/' + p.pixelId, { fields: 'id,name' })
    await client.get('/' + p.pageId + '/posts', { fields: 'id', limit: 1 })
    expect(calls.map(call => call.url.pathname)).toEqual([
      '/v25.0/me',
      '/v25.0/' + p.businessId + '/system_users',
      '/v25.0/' + p.pixelId,
      '/v25.0/' + p.pageId + '/posts'
    ])
    expect(provider).toHaveBeenCalledOnce()

    for (const call of calls) {
      expect(call.url.origin).toBe('https://graph.facebook.com')
      expect(call.url.toString()).not.toContain(SYSTEM)
      expect(call.init?.method).toBe('GET')
      expect(call.init?.redirect).toBe('error')
      expect(call.init?.signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('rejects a same-name principal with another ID before asset access', async () => {
    const { client, calls } = fixture(url =>
      url.pathname === '/v25.0/me' ? json({ ...principal, id: '61595404505049' }) : undefined
    )

    await expect(client.get('/' + p.pixelId, {})).rejects.toMatchObject({
      code: 'META_PRINCIPAL_MISMATCH',
      exitCode: 4
    })
    expect(calls).toHaveLength(1)
  })

  it('rejects missing exact Business membership before asset access', async () => {
    const { client, calls } = fixture(url =>
      url.pathname.endsWith('/system_users') ? json({ data: [{ id: 'other', name: principal.name }] }) : undefined
    )

    await expect(client.get('/' + p.pixelId, {})).rejects.toMatchObject({ code: 'META_BUSINESS_MEMBERSHIP_MISMATCH' })
    expect(calls).toHaveLength(2)
  })

  it('rejects generic URLs, paths outside the profile, token fields, and nested parameter objects', async () => {
    const { client, calls } = fixture()

    for (const path of [
      'https://graph.facebook.com/v25.0/me',
      '//me',
      '/me?fields=id',
      '/unowned/posts',
      '/123/comments',
      '/' + p.pageId + '_123/likes',
      '/me/accounts',
      '/' + p.pixelId + '/events'
    ]) {
      await expect(client.get(path, {})).rejects.toBeInstanceOf(MetaReadError)
    }

    await expect(client.get('/dataset_quality', { dataset_id: 'other' })).rejects.toMatchObject({
      code: 'ASSET_OUT_OF_SCOPE'
    })
    await expect(client.get('/' + p.pageId, { fields: 'id,access_token' })).rejects.toMatchObject({
      code: 'FORBIDDEN_PARAMETER'
    })
    await expect(client.get('/' + p.pageId, { access_token: SYSTEM })).rejects.toMatchObject({
      code: 'FORBIDDEN_PARAMETER'
    })

    for (const key of ['method', '_method', 'http_method', 'batch']) {
      await expect(client.get('/' + p.pageId, { [key]: 'DELETE' })).rejects.toMatchObject({ code: 'FORBIDDEN_PARAMETER' })
    }

    await expect(client.get('/' + p.pageId, { nested: { access_token: SYSTEM } } as never)).rejects.toMatchObject({
      code: 'INVALID_PARAMS'
    })
    expect(calls).toHaveLength(0)
    await client.get('/' + p.pageId + '_123/comments', { fields: 'id', limit: 1 })
    expect(calls.at(-1)?.url.pathname).toBe('/v25.0/' + p.pageId + '_123/comments')
  })

  it('resolves Page credentials privately, strips credential keys and paging URLs, and redacts both tokens recursively', async () => {
    const { client, calls } = fixture(url =>
      url.pathname.endsWith('/posts')
        ? json({
            data: [
              {
                id: '1',
                message: 'System ' + SYSTEM + ' Page ' + PAGE,
                access_token: SYSTEM,
                pageAccessToken: PAGE,
                nested: { client_secret: 'hidden', more: [PAGE] },
                url: 'https://example.test/path?email=person@example.test&access_token=' + SYSTEM + '#private'
              }
            ],
            paging: {
              next: 'https://evil.test/?access_token=' + PAGE,
              previous: 'https://evil.test/',
              cursors: { after: 'CURSOR' }
            }
          })
        : undefined
    )

    const result = await client.get('/' + p.pageId + '/posts', {}, 'page')
    const output = JSON.stringify(result)

    expect(output).not.toContain(SYSTEM)
    expect(output).not.toContain(PAGE)
    expect(output).not.toContain('hidden')
    expect(output).not.toContain('person@example.test')
    expect(output).not.toContain('evil.test')
    expect(output).not.toContain('private')
    expect(output).toContain('https://example.test/path')
    expect(new Headers(calls.at(-1)?.init?.headers).get('authorization')).toBe('Bearer ' + PAGE)
    await client.get('/' + p.pageId + '/posts', {}, 'page')
    expect(calls.filter(call => call.url.searchParams.get('fields') === 'access_token')).toHaveLength(1)
    expect(inspect(client)).not.toContain(SYSTEM)
    expect(inspect(client)).not.toContain(PAGE)
  })

  it('reconstructs bounded pagination from cursors and never follows provider next URLs', async () => {
    const { client, calls } = fixture(url =>
      url.pathname.endsWith('/campaigns')
        ? json({
            data: [{ id: url.searchParams.get('after') ?? 'first' }],
            paging: {
              next: 'https://evil.test/steal?access_token=' + SYSTEM,
              cursors: { after: url.searchParams.get('after') ? 'CURSOR_TWO' : 'CURSOR_ONE' }
            }
          })
        : undefined
    )

    const result = await client.list(
      '/act_' + p.adAccountId + '/campaigns',
      { fields: 'id' },
      { maxPages: 2, pageSize: 1 }
    )

    expect(result.pagination).toEqual({
      pages: 2,
      hasMore: true,
      nextCursor: 'CURSOR_TWO',
      complete: false,
      limitReached: true
    })
    expect(result.data).toHaveLength(2)
    expect(calls.at(-1)?.url.searchParams.get('after')).toBe('CURSOR_ONE')
    expect(calls.every(call => call.url.hostname === 'graph.facebook.com')).toBe(true)
    expect(calls.every(call => !call.url.toString().includes(SYSTEM))).toBe(true)
  })

  it('marks exhausted lists complete and supports explicit resumption', async () => {
    const { client, calls } = fixture()

    const result = await client.list(
      '/' + p.pageId + '/posts',
      {},
      { maxPages: 2, pageSize: 3, cursor: 'RESUME_CURSOR' }
    )

    expect(result.pagination).toEqual({ pages: 1, hasMore: false, complete: true, limitReached: false })
    expect(calls.at(-1)?.url.searchParams.get('after')).toBe('RESUME_CURSOR')
  })

  it('stops on repeated or missing cursors and rejects invalid limits', async () => {
    for (const paging of [
      { next: 'https://evil.test/', cursors: { after: 'REPEAT' } },
      { next: 'https://evil.test/' }
    ]) {
      const { client } = fixture(url => (url.pathname.endsWith('/posts') ? json({ data: [], paging }) : undefined))
      const result = await client.list('/' + p.pageId + '/posts', {}, { maxPages: 3, pageSize: 1, cursor: 'REPEAT' })

      expect(result.pagination.complete).toBe(false)
      expect(result.pagination.hasMore).toBe(true)
      expect(result.pagination.error?.code).toMatch(/^META_(REPEATED_CURSOR|PAGINATION_CURSOR_MISSING)$/)
    }

    const { client, calls } = fixture()

    await expect(client.list('/' + p.pageId + '/posts', {}, { maxPages: 0, pageSize: 1 })).rejects.toMatchObject({
      code: 'INVALID_PAGINATION_LIMITS'
    })
    expect(calls).toHaveLength(0)
    await expect(client.list('/' + p.pageId + '/posts', {}, { maxPages: 11, pageSize: 1 })).rejects.toMatchObject({
      code: 'INVALID_PAGINATION_LIMITS'
    })
  })

  it('emits only safe status/code/subcode for provider scope errors', async () => {
    const { client } = fixture(url =>
      url.pathname.endsWith('/posts')
        ? json(
            {
              error: {
                message: 'Permission denied ' + SYSTEM,
                code: 200,
                error_subcode: 10,
                fbtrace_id: 'private'
              }
            },
            403
          )
        : undefined
    )

    const error = await client.get('/' + p.pageId + '/posts', {}).catch(value => value)

    expect(error).toMatchObject({
      code: 'META_API_ERROR',
      exitCode: 4,
      httpStatus: 403,
      metaCode: 200,
      metaSubcode: 10
    })
    expect(String(error)).not.toContain(SYSTEM)
    expect(String(error)).not.toContain('Permission denied')
    expect(JSON.stringify(error)).not.toContain('private')
  })

  it('rejects redirects, malformed JSON, arrays, malformed lists, oversized bodies, and timeout exceptions safely', async () => {
    const cases: [() => Response, string][] = [
      [
        () => new Response('', { status: 302, headers: { location: 'https://evil.test/?token=' + SYSTEM } }),
        'META_REDIRECT_BLOCKED'
      ],
      [() => new Response('raw private ' + SYSTEM), 'META_INVALID_JSON'],
      [() => json([]), 'META_INVALID_JSON'],
      [() => new Response('{}', { headers: { 'content-length': String(5 * 1024 * 1024) } }), 'META_RESPONSE_TOO_LARGE']
    ]

    for (const [response, code] of cases) {
      const { client } = fixture(url => (url.pathname.endsWith('/posts') ? response() : undefined))

      await expect(client.get('/' + p.pageId + '/posts', {})).rejects.toMatchObject({ code })
    }

    const invalidList = fixture(url => (url.pathname.endsWith('/posts') ? json({ data: {} }) : undefined))

    await expect(
      invalidList.client.list('/' + p.pageId + '/posts', {}, { maxPages: 1, pageSize: 1 })
    ).rejects.toMatchObject({ code: 'META_INVALID_LIST' })

    const timeout = fixture(url => {
      if (url.pathname.endsWith('/posts')) throw new DOMException(SYSTEM, 'AbortError')

      return undefined
    })

    await expect(timeout.client.get('/' + p.pageId + '/posts', {})).rejects.toMatchObject({ code: 'META_TIMEOUT' })
  })

  it('sanitizes token-provider failures without exposing original errors', async () => {
    const client = new MetaReadClient({
      tokenProvider: async () => {
        throw new Error(SYSTEM)
      },
      fetchImpl: vi.fn() as typeof fetch
    })

    await expect(client.verifyIdentity()).rejects.toMatchObject({ code: 'TOKEN_UNAVAILABLE' })
  })

  it('preserves earlier pages and a resumable cursor after a later provider error', async () => {
    const { client } = fixture(url =>
      url.pathname.endsWith('/posts')
        ? url.searchParams.has('after')
          ? json({ error: { code: 200, message: SYSTEM } }, 403)
          : json({ data: [{ id: 'kept' }], paging: { next: 'https://evil.test/', cursors: { after: 'RESUME' } } })
        : undefined
    )

    const result = await client.list('/' + p.pageId + '/posts', {}, { maxPages: 3, pageSize: 1 })

    expect(result).toEqual({
      data: [{ id: 'kept' }],
      pagination: {
        pages: 1,
        hasMore: true,
        nextCursor: 'RESUME',
        complete: false,
        limitReached: false,
        error: { code: 'META_API_ERROR', httpStatus: 403, metaCode: 200 }
      }
    })
    expect(JSON.stringify(result)).not.toContain(SYSTEM)
  })

  it('omits resumption when the next cursor repeats an accepted resumed page', async () => {
    const { client } = fixture(url =>
      url.pathname.endsWith('/posts')
        ? json({ data: [{ id: 'accepted-A' }], paging: { next: 'https://evil.test/', cursors: { after: 'A' } } })
        : undefined
    )

    const result = await client.list('/' + p.pageId + '/posts', {}, { maxPages: 3, pageSize: 1, cursor: 'A' })

    expect(result.data).toEqual([{ id: 'accepted-A' }])
    expect(result.pagination).toMatchObject({ pages: 1, hasMore: true, complete: false,
      limitReached: false, error: { code: 'META_REPEATED_CURSOR' } })
    expect(result.pagination).not.toHaveProperty('nextCursor')
  })

  it('omits resumption when a second accepted page lacks its next cursor', async () => {
    const { client } = fixture(url =>
      url.pathname.endsWith('/posts')
        ? url.searchParams.get('after') === 'B'
          ? json({ data: [{ id: 'accepted-B' }], paging: { next: 'https://evil.test/' } })
          : json({ data: [{ id: 'accepted-first' }], paging: { next: 'https://evil.test/', cursors: { after: 'B' } } })
        : undefined
    )

    const result = await client.list('/' + p.pageId + '/posts', {}, { maxPages: 3, pageSize: 1 })

    expect(result.data).toEqual([{ id: 'accepted-first' }, { id: 'accepted-B' }])
    expect(result.pagination).toMatchObject({ pages: 2, hasMore: true, complete: false,
      limitReached: false, error: { code: 'META_PAGINATION_CURSOR_MISSING' } })
    expect(result.pagination).not.toHaveProperty('nextCursor')
  })

  it('classifies authentication, denial, and provider failures without losing safe numeric details', async () => {
    for (const [status, metaCode, exitCode] of [
      [401, 1, 3],
      [400, 190, 3],
      [400, 10, 4],
      [400, 294, 4],
      [400, 368, 4],
      [400, 100, 5]
    ]) {
      const { client } = fixture(url =>
        url.pathname.endsWith('/posts') ? json({ error: { code: metaCode, message: SYSTEM } }, status) : undefined
      )

      await expect(client.get('/' + p.pageId + '/posts', {})).rejects.toMatchObject({
        code: 'META_API_ERROR',
        exitCode,
        metaCode
      })
    }

    const { client } = fixture(url =>
      url.pathname.endsWith('/posts') ? new Response(SYSTEM, { status: 401 }) : undefined
    )

    await expect(client.get('/' + p.pageId + '/posts', {})).rejects.toMatchObject({
      code: 'META_API_ERROR',
      exitCode: 3,
      httpStatus: 401
    })
  })

  it('allows media insights only after a fresh exact Instagram owner proof', async () => {
    const { client, calls } = fixture(url => url.pathname === '/v25.0/700'
      ? json({ id: '700', owner: { id: p.instagramId }, media_type: 'IMAGE' }) : undefined)

    await expect(client.get('/700/insights', {})).rejects.toMatchObject({ code: 'ASSET_OUT_OF_SCOPE' })
    await expect(client.get('/700/comments', {})).rejects.toMatchObject({ code: 'ASSET_OUT_OF_SCOPE' })
    expect(calls).toHaveLength(0)
    expect(await client.inspectInstagramMedia('700')).toMatchObject({ id: '700', owner: { id: p.instagramId } })
    await client.list('/700/insights', { metric: 'reach' }, { pageSize: 1, maxPages: 1, credential: 'page' })
    await client.list('/700/comments', { fields: 'id,text' }, { pageSize: 1, maxPages: 1, credential: 'page' })
    expect(new Headers(calls.at(-1)?.init?.headers).get('authorization')).toBe('Bearer ' + PAGE)

    const hostile = fixture(url => url.pathname === '/v25.0/700'
      ? json({ id: '700', owner: { id: 'foreign' } }) : undefined)

    await expect(hostile.client.inspectInstagramMedia('700')).rejects.toMatchObject({ code: 'META_INSTAGRAM_MEDIA_OWNERSHIP_MISMATCH' })
    await expect(hostile.client.get('/700/insights', {})).rejects.toMatchObject({ code: 'ASSET_OUT_OF_SCOPE' })
  })

  it('reconstructs time-based social insight pagination with an opaque cursor bound to path and original params', async () => {
    const path = '/' + p.pageId + '/insights'
    const params = { metric: 'page_impressions', period: 'day', since: '2026-10-11', until: '2026-10-17' }
    const nextUrl = 'https://graph.facebook.com/v26.0' + path + '?since=1791000000&until=1791600000&access_token=' + PAGE

    const { client, calls } = fixture(url => url.pathname === '/v25.0' + path
      ? url.searchParams.get('since') === '1791000000' ? json({ data: [{ name: 'second' }] })
        : json({ data: [{ name: 'first' }], paging: { next: nextUrl } }) : undefined)

    const first = await client.list(path, params, { maxPages: 1, pageSize: 1, credential: 'page' })

    expect(first.pagination.nextCursor).toMatch(/^meta-date-v1\./)
    expect(first.pagination.returnedLinkApiVersion).toBe('v26.0')
    expect(JSON.stringify(first)).not.toContain(PAGE)
    expect(JSON.stringify(first)).not.toContain('graph.facebook.com')
    const complete = await client.list(path, params, { maxPages: 2, pageSize: 1, credential: 'page', cursor: first.pagination.nextCursor })

    expect(complete).toMatchObject({ data: [{ name: 'second' }], pagination: { complete: true, hasMore: false } })
    const last = calls.at(-1)!.url

    expect(last.origin).toBe('https://graph.facebook.com')
    expect(last.searchParams.get('since')).toBe('1791000000')
    expect(last.searchParams.get('until')).toBe('1791600000')
    expect(last.searchParams.has('after')).toBe(false)
    expect(last.searchParams.has('access_token')).toBe(false)
    expect(calls.every(call => call.url.pathname.startsWith('/v25.0/'))).toBe(true)
    await expect(client.list(path, { ...params, metric: 'page_post_engagements' }, { maxPages: 1, pageSize: 1, cursor: first.pagination.nextCursor }))
      .rejects.toMatchObject({ code: 'META_CURSOR_SCOPE_MISMATCH' })
    await expect(client.list('/' + p.instagramId + '/insights', params, { maxPages: 1, pageSize: 1, cursor: first.pagination.nextCursor }))
      .rejects.toMatchObject({ code: 'META_CURSOR_SCOPE_MISMATCH' })
  })

  it('rejects foreign time-paging URLs and preserves no duplicate resume cursor after repeated time windows', async () => {
    const path = '/' + p.instagramId + '/insights'

    for (const next of ['https://evil.test/v25.0' + path + '?since=1&until=2',
      'https://graph.facebook.com/v26.0/foreign/insights?since=1&until=2']) {
      const { client } = fixture(url => url.pathname === '/v25.0' + path ? json({ data: [{ name: 'kept' }], paging: { next } }) : undefined)
      const result = await client.list(path, { metric: 'reach' }, { maxPages: 2, pageSize: 1 })

      expect(result.pagination).toMatchObject({ complete: false, error: { code: 'META_PAGINATION_CURSOR_MISSING' } })
      expect(result.pagination).not.toHaveProperty('nextCursor')
    }

    const { client } = fixture(url => url.pathname === '/v25.0' + path ? json({ data: [{ name: 'kept' }],
      paging: { next: 'https://graph.facebook.com/v25.0' + path + '?since=1&until=2' } }) : undefined)

    const first = await client.list(path, { metric: 'reach' }, { maxPages: 1, pageSize: 1 })
    const repeated = await client.list(path, { metric: 'reach' }, { maxPages: 2, pageSize: 1, cursor: first.pagination.nextCursor })

    expect(repeated.pagination).toMatchObject({ complete: false, error: { code: 'META_REPEATED_CURSOR' } })
    expect(repeated.pagination).not.toHaveProperty('nextCursor')
  })
})
