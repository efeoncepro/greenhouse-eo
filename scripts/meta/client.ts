import { createHash } from 'node:crypto'

/** Bounded Graph reader. Credentials and the protected write transport remain internal. */
export type JsonObject = Record<string, unknown>

export const EFEONCE_META_PROFILE = {
  businessId: '2764962567067087',
  appId: '1665579481811196',
  principalId: '122100132867513483',
  principalName: 'Greenhouse',
  adAccountId: '660841415768357',
  pixelId: '708931297255942',
  pageId: '106570685420996',
  instagramId: '17841437175569224',
  apiVersion: 'v25.0'
}

type ErrorDetails = { httpStatus?: number; metaCode?: number; metaSubcode?: number }

export class MetaReadError extends Error {
  readonly code: string
  readonly exitCode: number
  readonly httpStatus?: number
  readonly metaCode?: number
  readonly metaSubcode?: number

  constructor(code: string, exitCode = 2, details: ErrorDetails = {}) {
    super(code)
    this.name = 'MetaReadError'
    this.code = code
    this.exitCode = exitCode
    this.httpStatus = details.httpStatus
    this.metaCode = details.metaCode
    this.metaSubcode = details.metaSubcode
  }
}

type Params = Record<string, string | number>
type Credential = 'system' | 'page'
type Identity = {
  principal: { id: string; name: string }
  businessMembership: { businessId: string; matched: true }
  appBinding: 'observed_in_token_generation_ui; not_introspected'
}
type ListOptions = { maxPages: number; pageSize: number; cursor?: string; credential?: Credential }
type ListResult = {
  data: unknown[]
  pagination: {
    pages: number
    hasMore: boolean
    nextCursor?: string
    complete: boolean
    limitReached: boolean
    returnedLinkApiVersion?: string
    error?: { code: string; httpStatus?: number; metaCode?: number; metaSubcode?: number }
  }
}

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const TOKEN_PATTERN = /^[A-Za-z0-9._|=-]{40,8192}$/
const CREDENTIAL_KEY = /token|secret|authorization|password/i

const FORBIDDEN_FIELD =
  /\b(?:access_?token|refresh_?token|app_?secret|appsecret_?proof|client_?secret|authorization|password|secret)\b/i

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** No raw provider messages, URLs, exception causes, or token values escape as errors. */
export class MetaReadClient {
  protected readonly profile: typeof EFEONCE_META_PROFILE
  private readonly fetchImpl: typeof fetch
  readonly #tokenProvider: () => Promise<string>
  #tokenPromise?: Promise<string>
  #pageTokenPromise?: Promise<string>
  private identityPromise?: Promise<Identity>
  readonly #tokens = new Set<string>()
  readonly #instagramMediaIds = new Set<string>()
  readonly #replyPaths = new Set<string>()

  constructor(options: {
    tokenProvider: () => Promise<string>
    fetchImpl?: typeof fetch
    profile?: typeof EFEONCE_META_PROFILE
  }) {
    this.profile = { ...(options.profile ?? EFEONCE_META_PROFILE) }
    this.fetchImpl = options.fetchImpl ?? fetch
    this.#tokenProvider = options.tokenProvider

    if (
      this.profile.apiVersion !== 'v25.0' ||
      Object.entries(this.profile).some(([key, value]) => key.endsWith('Id') && !/^\d+$/.test(value))
    ) {
      throw new MetaReadError('INVALID_PROFILE')
    }
  }

  private systemToken(): Promise<string> {
    this.#tokenPromise ??= (async () => {
      let value: string

      try {
        value = await this.#tokenProvider()
      } catch {
        throw new MetaReadError('TOKEN_UNAVAILABLE', 3)
      }

      if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) throw new MetaReadError('INVALID_TOKEN', 3)
      this.#tokens.add(value)

      return value
    })()

    return this.#tokenPromise
  }

  private validateParams(params: Params, allowPageTokenField = false): void {
    if (!object(params)) throw new MetaReadError('INVALID_PARAMS')

    for (const [key, value] of Object.entries(params)) {
      if (CREDENTIAL_KEY.test(key) || /^_?(?:method|http_?method|batch)$/i.test(key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
        throw new MetaReadError('FORBIDDEN_PARAMETER')
      if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value)))
        throw new MetaReadError('INVALID_PARAMS')

      if (typeof value === 'string') {
        if (value.length > 16384 || /[\u0000-\u001f]/.test(value)) throw new MetaReadError('INVALID_PARAMS')
        if (FORBIDDEN_FIELD.test(value) && !(allowPageTokenField && key === 'fields' && value === 'access_token'))
          throw new MetaReadError('FORBIDDEN_PARAMETER')
      }
    }
  }

  private path(path: string, params: Params): string {
    if (!/^\/?[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+)?$/.test(path)) throw new MetaReadError('INVALID_PATH')
    const canonical = '/' + path.replace(/^\//, '')
    const [root, edge] = canonical.slice(1).split('/')
    const p = this.profile

    const edges: Record<string, string[]> = {
      me: ['permissions'],
      [p.businessId]: ['system_users'],
      [p.appId]: [],
      ['act_' + p.adAccountId]: [
        'campaigns',
        'adsets',
        'ads',
        'adcreatives',
        'insights',
        'adspixels',
        'customconversions',
        'customaudiences'
      ],
      [p.adAccountId]: ['campaigns', 'adsets', 'ads', 'insights', 'customconversions'],
      [p.pixelId]: ['stats', 'da_checks'],
      [p.pageId]: ['posts', 'feed', 'published_posts', 'conversations', 'insights'],
      [p.instagramId]: ['media', 'conversations', 'insights', 'content_publishing_limit']
    }

    if (root === 'dataset_quality') {
      if (edge || String(params.dataset_id) !== p.pixelId) throw new MetaReadError('ASSET_OUT_OF_SCOPE')
    } else if (this.#instagramMediaIds.has(root)) {
      if (edge !== 'insights' && edge !== 'comments') throw new MetaReadError('ASSET_OUT_OF_SCOPE')
    } else if (new RegExp('^' + p.pageId + '_[0-9]+$').test(root)) {
      if (edge !== 'comments') throw new MetaReadError('ASSET_OUT_OF_SCOPE')
    } else if (!Object.hasOwn(edges, root) || (edge && !edges[root].includes(edge))) {
      throw new MetaReadError('ASSET_OUT_OF_SCOPE')
    }

    return canonical
  }

  private redactString(value: string): string {
    let redacted = value

    for (const token of this.#tokens) redacted = redacted.split(token).join('[REDACTED]')
    redacted = redacted.replace(/\b(?:https?:\/\/)[^\s<>"']+/gi, raw => {
      try {
        const url = new URL(raw)

        url.username = ''
        url.password = ''
        url.search = ''
        url.hash = ''

        return url.toString()
      } catch {
        return '[REDACTED_URL]'
      }
    })

    return redacted
  }

  protected sanitize(value: unknown, depth = 0): unknown {
    if (depth > 50) throw new MetaReadError('RESPONSE_TOO_DEEP', 5)
    if (typeof value === 'string') return this.redactString(value)
    if (Array.isArray(value)) return value.map(item => this.sanitize(item, depth + 1))
    if (!object(value)) return value
    const result: JsonObject = {}

    for (const [key, item] of Object.entries(value)) {
      if (CREDENTIAL_KEY.test(key)) continue
      if ((key === 'next' || key === 'previous') && typeof item === 'string') continue
      Object.defineProperty(result, this.redactString(key), { value: this.sanitize(item, depth + 1), enumerable: true })
    }

    return result
  }

  private async request(path: string, params: Params, token: string, allowPageTokenField = false): Promise<JsonObject> {
    this.validateParams(params, allowPageTokenField)
    const canonical = this.path(path, params)


return this.transport(canonical, params, token, 'GET')
  }

  private async transport(canonical: string, params: Params, token: string, method: 'GET' | 'POST'): Promise<JsonObject> {
    const url = new URL('https://graph.facebook.com/' + this.profile.apiVersion + canonical)
    const encoded = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      if ([...this.#tokens].some(secret => String(value).includes(secret)))
        throw new MetaReadError('FORBIDDEN_PARAMETER')
      encoded.set(key, String(value))
    }

    if (method === 'GET') url.search = encoded.toString()

    let response: Response
    const signal = AbortSignal.timeout(25000)

    try {
      response = await this.fetchImpl(url, {
        method,
        redirect: 'error',
        signal,
        headers: { Authorization: 'Bearer ' + token, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(method === 'POST' ? { body: encoded.toString() } : {})
      })
    } catch (error) {
      const timeout = signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))

      throw new MetaReadError(timeout ? 'META_TIMEOUT' : 'META_TRANSPORT_ERROR', 5)
    }

    if (response.redirected || (response.status >= 300 && response.status < 400))
      throw new MetaReadError('META_REDIRECT_BLOCKED', 5)

    if (response.url) {
      try {
        if (new URL(response.url).origin !== 'https://graph.facebook.com') throw new Error()
      } catch {
        throw new MetaReadError('META_REDIRECT_BLOCKED', 5)
      }
    }

    let parsed: unknown

    try {
      const declared = Number(response.headers.get('content-length'))

      if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
        throw new MetaReadError('META_RESPONSE_TOO_LARGE', 5)
      const reader = response.body?.getReader()

      if (!reader) throw new MetaReadError('META_INVALID_JSON', 5)
      const chunks: Uint8Array[] = []
      let size = 0

      while (true) {
        const chunk = await reader.read()

        if (chunk.done) break
        size += chunk.value.byteLength

        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw new MetaReadError('META_RESPONSE_TOO_LARGE', 5)
        }

        chunks.push(chunk.value)
      }

      const bytes = new Uint8Array(size)
      let offset = 0

      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }

      parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    } catch (error) {
      if (error instanceof MetaReadError) throw error
      if (!response.ok && method === 'GET')
        throw new MetaReadError('META_API_ERROR', response.status === 401 ? 3 : response.status === 403 ? 4 : 5, {
          httpStatus: response.status
        })
      throw new MetaReadError(signal.aborted ? 'META_TIMEOUT' : 'META_INVALID_JSON', 5)
    }

    if (!object(parsed)) throw new MetaReadError('META_INVALID_JSON', 5)

    if (!response.ok || object(parsed.error)) {
      const error = object(parsed.error) ? parsed.error : {}
      const integer = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) ? value : undefined)
      const metaCode = integer(error.code)

      const exitCode =
        response.status === 401 || metaCode === 190
          ? 3
          : response.status === 403 || [10, 200, 294, 368].includes(metaCode ?? -1)
            ? 4
            : 5

      throw new MetaReadError('META_API_ERROR', exitCode, {
        httpStatus: response.status,
        metaCode,
        metaSubcode: integer(error.error_subcode)
      })
    }

    return parsed
  }

  /** Only proof readers may inspect an otherwise unregistered numeric node. No edges or URLs. */
  protected async readProof(id: string, fields: string, credential: Credential): Promise<JsonObject> {
    if (!/^[0-9]+(?:_[0-9]+)?$/.test(id)) throw new MetaReadError('INVALID_PROOF_ID')
    this.validateParams({ fields })
    await this.verifyIdentity()

return this.sanitize(await this.transport('/' + id, { fields }, await this.credential(credential), 'GET')) as JsonObject
  }

  async inspectInstagramMedia(id: string): Promise<JsonObject> {
    const media = await this.readProof(id, 'id,owner{id},media_type,media_product_type,timestamp,permalink', 'page')

    if (media.id !== id || !object(media.owner) || media.owner.id !== this.profile.instagramId)
      throw new MetaReadError('META_INSTAGRAM_MEDIA_OWNERSHIP_MISMATCH', 4)
    this.#instagramMediaIds.add(id)

return media
  }

  protected validateMutationParams(params: JsonObject): void {
    const visit = (value: unknown, depth: number): void => {
      if (depth > 30) throw new MetaReadError('INVALID_PARAMS')
      if (typeof value === 'string') {
        if (value.length > 200000 || [...this.#tokens].some(secret => value.includes(secret)))
          throw new MetaReadError('FORBIDDEN_PARAMETER')
      } else if (Array.isArray(value)) {
        for (const item of value) visit(item, depth + 1)
      } else if (object(value)) {
        for (const [key, item] of Object.entries(value)) {
          if (CREDENTIAL_KEY.test(key) || /^_?(?:method|http_?method|batch)$/i.test(key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
            throw new MetaReadError('FORBIDDEN_PARAMETER')
          visit(item, depth + 1)
        }
      } else if (value !== null && typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value)))
        throw new MetaReadError('INVALID_PARAMS')
    }

    if (!object(params)) throw new MetaReadError('INVALID_PARAMS')
    visit(params, 0)
  }

  protected async prepareMutation(params: JsonObject, credential: Credential): Promise<void> {
    this.validateMutationParams(params)
    await this.verifyIdentity()
    await this.credential(credential)
    this.validateMutationParams(params)
  }

  protected permitReplyPath(path: string): void {
    if (!/^\/[0-9]+(?:_[0-9]+)?\/(comments|replies)$/.test(path)) throw new MetaReadError('INVALID_WRITE_PATH')
    this.#replyPaths.add(path)
  }

  protected async postNative(path: string, params: JsonObject, credential: Credential): Promise<JsonObject> {
    const p = this.profile

    const fixed = new Set([
      ...['campaigns', 'adsets', 'adcreatives', 'ads'].map(edge => '/act_' + p.adAccountId + '/' + edge),
      '/' + p.pageId + '/feed', '/' + p.pageId + '/photos',
      '/' + p.instagramId + '/media', '/' + p.instagramId + '/media_publish'
    ])

    if (!fixed.has(path) && !this.#replyPaths.has(path)) throw new MetaReadError('INVALID_WRITE_PATH')
    await this.prepareMutation(params, credential)
    const encoded: Params = {}

    for (const [key, value] of Object.entries(params)) encoded[key] = typeof value === 'string' ? value : JSON.stringify(value)

return this.sanitize(await this.transport(path, encoded, await this.credential(credential), 'POST')) as JsonObject
  }

  verifyIdentity(): Promise<Identity> {
    this.identityPromise ??= (async () => {
      const token = await this.systemToken()
      const principal = await this.request('/me', { fields: 'id,name' }, token)
      const p = this.profile

      if (principal.id !== p.principalId || principal.name !== p.principalName)
        throw new MetaReadError('META_PRINCIPAL_MISMATCH', 4)

      const membership = await this.request(
        '/' + p.businessId + '/system_users',
        { fields: 'id,name', limit: 100 },
        token
      )

      const members = Array.isArray(membership.data) ? membership.data : []
      const matching = members.filter(item => object(item) && item.id === principal.id && item.name === principal.name)

      if (matching.length !== 1) throw new MetaReadError('META_BUSINESS_MEMBERSHIP_MISMATCH', 4)

      return {
        principal: { id: p.principalId, name: p.principalName },
        businessMembership: { businessId: p.businessId, matched: true },
        appBinding: 'observed_in_token_generation_ui; not_introspected'
      }
    })()

    return this.identityPromise.then(identity => ({
      ...identity,
      principal: { ...identity.principal },
      businessMembership: { ...identity.businessMembership }
    }))
  }

  private credential(kind: Credential): Promise<string> {
    if (kind !== 'system' && kind !== 'page') throw new MetaReadError('INVALID_CREDENTIAL_SELECTOR')
    if (kind === 'system') return this.systemToken()
    this.#pageTokenPromise ??= (async () => {
      const result = await this.request(
        '/' + this.profile.pageId,
        { fields: 'access_token' },
        await this.systemToken(),
        true
      )

      const token = result.access_token

      if (typeof token !== 'string' || !TOKEN_PATTERN.test(token))
        throw new MetaReadError('META_PAGE_TOKEN_UNAVAILABLE', 3)
      this.#tokens.add(token)

      return token
    })()

    return this.#pageTokenPromise
  }

  async get(path: string, params: Params, credential: Credential = 'system'): Promise<JsonObject> {
    this.validateParams(params)
    this.path(path, params)
    await this.verifyIdentity()
    const result = await this.request(path, params, await this.credential(credential))


    return this.sanitize(result) as JsonObject
  }

  async list(path: string, params: Params, options: ListOptions): Promise<ListResult> {
    this.validateParams(params)
    const canonicalPath = this.path(path, params)

    if ('after' in params || 'before' in params || 'limit' in params) throw new MetaReadError('USE_PAGINATION_OPTIONS')
    if (
      !Number.isInteger(options.maxPages) ||
      options.maxPages < 1 ||
      options.maxPages > 10 ||
      !Number.isInteger(options.pageSize) ||
      options.pageSize < 1 ||
      options.pageSize > 100
    )
      throw new MetaReadError('INVALID_PAGINATION_LIMITS')

    const validCursor = (cursor: unknown): cursor is string =>
      typeof cursor === 'string' &&
      /^[A-Za-z0-9_=.\-~+/]{1,4096}$/.test(cursor) &&
      ![...this.#tokens].some(token => cursor.includes(token))

    const datePrefix = 'meta-date-v1.'
    let returnedLinkApiVersion: string | undefined

    const supportsDatePaging = canonicalPath.endsWith('/insights') &&
      (canonicalPath === '/' + this.profile.pageId + '/insights' || canonicalPath === '/' + this.profile.instagramId + '/insights' ||
       this.#instagramMediaIds.has(canonicalPath.split('/')[1]))

    const paramsDigest = createHash('sha256').update(JSON.stringify([canonicalPath, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))])).digest('hex')

    const validDateWindow = (since: unknown, until: unknown): boolean =>
      typeof since === 'string' && typeof until === 'string' && /^\d{1,10}$/.test(since) && /^\d{1,10}$/.test(until) &&
      Number(since) < Number(until) && Number(until) <= 4102444800

    const decodeDateCursor = (cursor: string): { since: string; until: string } | undefined => {
      if (!cursor.startsWith(datePrefix)) return undefined
      if (!supportsDatePaging) throw new MetaReadError('META_CURSOR_SCOPE_MISMATCH')

      try {
        const encoded = cursor.slice(datePrefix.length)

        if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error()
        const decoded: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))

        if (!object(decoded) || Object.keys(decoded).length !== 5 || decoded.v !== 1 || decoded.path !== canonicalPath || decoded.paramsDigest !== paramsDigest ||
            !validDateWindow(decoded.since, decoded.until)) throw new Error()

return { since: String(decoded.since), until: String(decoded.until) }
      } catch { throw new MetaReadError('META_CURSOR_SCOPE_MISMATCH') }
    }

    const dateCursorFromNext = (next: unknown): string | undefined => {
      if (!supportsDatePaging || typeof next !== 'string') return undefined

      try {
        const nextUrl = new URL(next)
        const versionedPath = nextUrl.pathname.match(/^\/(v[0-9]+\.[0-9]+)(\/.*)$/)

        if (nextUrl.origin !== 'https://graph.facebook.com' || nextUrl.username || nextUrl.password || nextUrl.hash ||
            !versionedPath || versionedPath[2] !== canonicalPath) return undefined
        const since = nextUrl.searchParams.get('since'), until = nextUrl.searchParams.get('until')

        if (!validDateWindow(since, until)) return undefined
        // Only report the announced version. Every actual request still uses profile.apiVersion.
        returnedLinkApiVersion = versionedPath[1]

return datePrefix + Buffer.from(JSON.stringify({ v: 1, path: canonicalPath, paramsDigest, since, until })).toString('base64url')
      } catch { return undefined }
    }

    if (options.cursor !== undefined && !validCursor(options.cursor)) throw new MetaReadError('INVALID_CURSOR')
    if (options.cursor) decodeDateCursor(options.cursor)
    await this.verifyIdentity()
    const token = await this.credential(options.credential ?? 'system')
    const data: unknown[] = []
    const seen = new Set<string>()
    let cursor = options.cursor
    let pages = 0
    let hasMore = false
    let nextCursor: string | undefined
    let safeResumeCursor: string | undefined

    try {
      while (pages < options.maxPages) {
        if (cursor) {
          if (seen.has(cursor)) throw new MetaReadError('META_REPEATED_CURSOR', 5)
          seen.add(cursor)
        }

        safeResumeCursor = cursor
        const dateWindow = cursor ? decodeDateCursor(cursor) : undefined
        const requestParams = { ...params, limit: options.pageSize, ...(dateWindow ?? (cursor ? { after: cursor } : {})) }
        const result = await this.request(path, requestParams, token)

        if (!Array.isArray(result.data)) throw new MetaReadError('META_INVALID_LIST', 5)
        data.push(...result.data.map(item => this.sanitize(item)))
        pages++
        // This cursor would now duplicate accepted rows; only the validated next page can resume safely.
        safeResumeCursor = undefined
        if (result.paging !== undefined && !object(result.paging)) throw new MetaReadError('META_INVALID_PAGINATION', 5)
        const paging = result.paging ?? {}

        if ((paging.next !== undefined && (typeof paging.next !== 'string' || !paging.next.length)) ||
          (paging.cursors !== undefined && !object(paging.cursors))) throw new MetaReadError('META_INVALID_PAGINATION', 5)

        hasMore = typeof paging.next === 'string' && paging.next.length > 0
        const cursors = object(paging.cursors) ? paging.cursors : {}

        nextCursor = hasMore ? validCursor(cursors.after) ? cursors.after : dateCursorFromNext(paging.next) : undefined
        if (hasMore && !nextCursor) throw new MetaReadError('META_PAGINATION_CURSOR_MISSING', 5)
        if (nextCursor && seen.has(nextCursor)) throw new MetaReadError('META_REPEATED_CURSOR', 5)
        if (!hasMore) break
        safeResumeCursor = nextCursor
        cursor = nextCursor
      }
    } catch (error) {
      if (!pages) throw error
      const safe = error instanceof MetaReadError ? error : new MetaReadError('META_READ_FAILED', 5)


      return {
        data,
        pagination: {
          pages,
          hasMore: true,
          ...(safeResumeCursor ? { nextCursor: safeResumeCursor } : {}),
          complete: false,
          limitReached: false,
          ...(returnedLinkApiVersion ? { returnedLinkApiVersion } : {}),
          error: {
            code: safe.code,
            ...(safe.httpStatus !== undefined ? { httpStatus: safe.httpStatus } : {}),
            ...(safe.metaCode !== undefined ? { metaCode: safe.metaCode } : {}),
            ...(safe.metaSubcode !== undefined ? { metaSubcode: safe.metaSubcode } : {})
          }
        }
      }
    }

    return {
      data,
      pagination: {
        pages,
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
        complete: !hasMore,
        limitReached: hasMore && pages === options.maxPages,
        ...(returnedLinkApiVersion ? { returnedLinkApiVersion } : {})
      }
    }
  }
}
