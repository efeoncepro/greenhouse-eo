/**
 * Client ID Metadata Documents — registro primario de clientes del emisor (TASK-1829).
 *
 * `client_id` ES la URL https del documento; el documento se busca, se valida contra el esquema y se
 * cachea con TTL ≤ 24 h + `etag`. Anti-SSRF: sólo https, sin IP literal, sin redirects, DNS resuelto
 * y rechazado si cae en rangos privados/loopback/link-local/metadata, timeout 3 s y tamaño máximo.
 * Un documento hostil o inalcanzable produce `invalid_client` y un audit `cimd_fetch rejected`
 * (señal `auth.oauth.cimd_rejected`).
 */

import { BlockList, isIP } from 'node:net'
import type { LookupFunction } from 'node:net'
import { request as httpsRequest } from 'node:https'
import { lookup } from 'node:dns/promises'

import { OAuthProtocolError } from './errors'
import { normalizeRegisteredRedirectUris } from './primitives'
import type { OAuthClientRecord, OAuthStorePort } from './store/port'

export const CIMD_FETCH_TIMEOUT_MS = 3_000
export const CIMD_MAX_BYTES = 64 * 1024

export type CimdDocument = {
  client_id: string
  client_name?: string
  client_uri?: string
  logo_uri?: string
  redirect_uris: string[]
  token_endpoint_auth_method: 'none'
  grant_types: string[]
  response_types: string[]
  scope?: string
  software_id?: string
  software_version?: string
}

export type CimdFetchResult = {
  status: number
  body: string
  etag: string | null
  contentType: string | null
}

export type CimdFetcher = (
  url: string,
  options: { etag: string | null; signal: AbortSignal; addresses: readonly string[] }
) => Promise<CimdFetchResult>

export type CimdResolver = (input: { hostname: string }) => Promise<string[]>

export type CimdDeps = {
  store: OAuthStorePort
  fetcher?: CimdFetcher
  resolveAddresses?: CimdResolver
  now?: () => Date
  cacheTtlSeconds: number
}

// ─── URL del client_id ──────────────────────────────────────────────────────

export type CimdClientIdCheck = { ok: true; url: URL } | { ok: false; reason: string }

/** Forma exigida a un `client_id` CIMD: https, host con nombre (no IP), path no vacío, sin fragmento ni userinfo. */
export const checkCimdClientId = (clientId: string): CimdClientIdCheck => {
  let url: URL

  try {
    url = new URL(clientId)
  } catch {
    return { ok: false, reason: 'unparseable' }
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'scheme' }
  if (url.username || url.password) return { ok: false, reason: 'userinfo' }
  if (url.hash) return { ok: false, reason: 'fragment' }
  if (!url.pathname || url.pathname === '/') return { ok: false, reason: 'path' }
  if (isIP(url.hostname.replace(/^\[|\]$/g, '')) !== 0) return { ok: false, reason: 'ip_literal' }

  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) {
    return { ok: false, reason: 'local_host' }
  }

  if (url.href !== clientId) return { ok: false, reason: 'not_normalized' }

  return { ok: true, url }
}

export const looksLikeCimdClientId = (clientId: string): boolean => clientId.startsWith('https://')

// ─── Anti-SSRF ──────────────────────────────────────────────────────────────

// Node's address parser compares binary addresses, including expanded IPv6 forms.
const deniedV4 = new BlockList()

for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) deniedV4.addSubnet(address, prefix, 'ipv4')

const globalV6 = new BlockList()
const deniedV6 = new BlockList()

globalV6.addSubnet('2000::', 3, 'ipv6')
// Special-purpose, documentation and transition ranges are not CIMD destinations.
deniedV6.addSubnet('2001::', 23, 'ipv6')
deniedV6.addSubnet('2001:db8::', 32, 'ipv6')
deniedV6.addSubnet('2002::', 16, 'ipv6')
deniedV6.addSubnet('3fff::', 20, 'ipv6')

/** Reject private/local/shared/multicast/reserved IPv4 and non-global/special IPv6.
 * Documentation IPv4 ranges remain usable by injected test fixtures. Mapped/scoped IPv6 fail closed. */
export const isDisallowedAddress = (address: string): boolean => {
  if (address.includes('%')) return true
  const family = isIP(address)

  if (family === 4) return deniedV4.check(address, 'ipv4')
  if (family === 6) return !globalV6.check(address, 'ipv6') || deniedV6.check(address, 'ipv6')

  return true
}

const defaultResolver: CimdResolver = async ({ hostname }) => {
  const results = await lookup(hostname, { all: true, verbatim: true })

  return results.map(entry => entry.address)
}

/** A fresh socket uses only a previously validated address; TLS still verifies the URL hostname. */
const defaultFetcher: CimdFetcher = async (url, { etag, signal, addresses }) => {
  if (!addresses.length || addresses.some(isDisallowedAddress)) throw new Error('cimd_address_invalid')
  // One approved destination per request: a failed connection fails closed, with no fresh DNS fallback.
  const address = addresses[0]
  const family = isIP(address)
  const hostname = new URL(url).hostname

  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (_hostname !== hostname) return callback(new Error('cimd_hostname_mismatch'), '')
    if (options.all) callback(null, [{ address, family }])
    else callback(null, address, family)
  }

  return new Promise<CimdFetchResult>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: 'GET',
      agent: false,
      lookup: pinnedLookup,
      servername: hostname,
      rejectUnauthorized: true,
      signal,
      headers: { accept: 'application/json', ...(etag ? { 'if-none-match': etag } : {}) }
    }, response => {
      // node:https never follows redirects. Do not read an unneeded redirect/error body.
      const status = response.statusCode ?? 0
      const etag = response.headers.etag ?? null
      const contentType = response.headers['content-type'] ?? null

      response.on('error', reject)

      if (status !== 200) {
        response.destroy()
        resolve({ status, body: '', etag, contentType })

        return
      }

      let received = 0
      const chunks: Buffer[] = []

      response.on('aborted', () => reject(new Error('cimd_response_aborted')))
      response.on('data', (value: Buffer) => {
        received += value.byteLength

        if (received > CIMD_MAX_BYTES) {
          const error = new Error('cimd_document_too_large')

          response.destroy(error)
          request.destroy(error)
          reject(error)

          return
        }

        chunks.push(value)
      })
      response.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8'), etag, contentType }))
    })

    request.on('error', reject)
    request.end()
  })
}

// Bound even an injected resolver/transport that does not implement cancellation. The production
// HTTPS request also receives the signal to destroy its socket; DNS lookup itself is not cancellable.
const withinDeadline = async <T>(work: Promise<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) throw new Error('cimd_deadline')
  let onAbort: () => void = () => {}

  const expired = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new Error('cimd_deadline'))
    signal.addEventListener('abort', onAbort, { once: true })
  })

  try {
    return await Promise.race([work, expired])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

// ─── Validación del documento ───────────────────────────────────────────────

export type CimdValidation = { ok: true; document: CimdDocument } | { ok: false; reason: string }

const asStringArray = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null

export const validateCimdDocument = (clientId: string, raw: unknown): CimdValidation => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, reason: 'not_object' }

  const doc = raw as Record<string, unknown>

  if (doc.client_id !== clientId) return { ok: false, reason: 'client_id_mismatch' }

  const redirectUris = asStringArray(doc.redirect_uris)

  if (!redirectUris || redirectUris.length === 0) return { ok: false, reason: 'redirect_uris_missing' }

  const normalized = normalizeRegisteredRedirectUris(redirectUris)

  if (!normalized.ok) return { ok: false, reason: `redirect_uris_${normalized.reason}` }

  const authMethod = doc.token_endpoint_auth_method ?? 'none'

  if (authMethod !== 'none') return { ok: false, reason: 'auth_method_not_none' }

  const grantTypes = doc.grant_types === undefined ? ['authorization_code'] : asStringArray(doc.grant_types)

  if (
    !grantTypes ||
    !grantTypes.includes('authorization_code') ||
    grantTypes.some(grant => !grant || /\s/.test(grant))
  ) {
    return { ok: false, reason: 'grant_types' }
  }

  // A vendor document describes every AS it can use. Register only our supported intersection;
  // advertising another grant never enables its exchange at /oauth/token (TASK-1844).
  const supportedGrantTypes = [
    ...new Set(grantTypes.filter(grant => grant === 'authorization_code' || grant === 'refresh_token'))
  ]

  const responseTypes = doc.response_types === undefined ? ['code'] : asStringArray(doc.response_types)

  if (!responseTypes || !responseTypes.includes('code')) return { ok: false, reason: 'response_types' }

  for (const field of ['client_name', 'client_uri', 'logo_uri', 'scope', 'software_id', 'software_version'] as const) {
    if (doc[field] !== undefined && typeof doc[field] !== 'string') return { ok: false, reason: `${field}_type` }
  }

  if (typeof doc.client_name === 'string' && doc.client_name.length > 200)
    return { ok: false, reason: 'client_name_length' }

  return {
    ok: true,
    document: {
      client_id: clientId,
      client_name: doc.client_name as string | undefined,
      client_uri: doc.client_uri as string | undefined,
      logo_uri: doc.logo_uri as string | undefined,
      redirect_uris: normalized.uris,
      token_endpoint_auth_method: 'none',
      grant_types: supportedGrantTypes,
      response_types: responseTypes,
      scope: doc.scope as string | undefined,
      software_id: doc.software_id as string | undefined,
      software_version: doc.software_version as string | undefined
    }
  }
}

export const cimdDocumentToClientRecord = (document: CimdDocument, now: Date): OAuthClientRecord => ({
  clientId: document.client_id,
  registrationKind: 'cimd',
  clientType: 'public',
  clientName: document.client_name?.trim() || new URL(document.client_id).hostname,
  redirectUris: document.redirect_uris,
  grantTypes: document.grant_types,
  responseTypes: document.response_types,
  tokenEndpointAuthMethod: 'none',
  clientSecretHash: null,
  allowedScopes: null,
  status: 'active',
  metadata: {
    cimd: {
      client_uri: document.client_uri ?? null,
      logo_uri: document.logo_uri ?? null,
      software_id: document.software_id ?? null,
      software_version: document.software_version ?? null
    }
  },
  createdBy: 'cimd',
  createdAt: now,
  updatedAt: now
})

// ─── Resolución (fetch + cache + validación) ────────────────────────────────

export type ResolveCimdClientResult =
  | { ok: true; client: OAuthClientRecord; fromCache: boolean }
  | { ok: false; reason: string; fromCache: boolean }

/**
 * Resuelve un cliente CIMD. Un rechazo cacheado se respeta hasta su TTL (corto) para no re-buscar un
 * documento hostil en cada authorize; un documento válido cacheado se re-valida vía `If-None-Match`
 * sólo cuando su TTL venció.
 */
export const resolveCimdClient = async (clientId: string, deps: CimdDeps): Promise<ResolveCimdClientResult> => {
  const now = (deps.now ?? (() => new Date()))()
  const check = checkCimdClientId(clientId)

  if (!check.ok) return { ok: false, reason: `client_id_${check.reason}`, fromCache: false }

  const cached = await deps.store.getCimdCache(clientId)

  if (cached && cached.expiresAt.getTime() > now.getTime()) {
    if (cached.status === 'rejected') return { ok: false, reason: cached.rejectReason ?? 'rejected', fromCache: true }

    const validation = validateCimdDocument(clientId, cached.document)

    if (validation.ok)
      return { ok: true, client: cimdDocumentToClientRecord(validation.document, cached.fetchedAt), fromCache: true }
  }

  const rejectTtlMs = Math.min(deps.cacheTtlSeconds, 15 * 60) * 1000

  const reject = async (reason: string): Promise<ResolveCimdClientResult> => {
    await deps.store.putCimdCache({
      clientIdUrl: clientId,
      document: null,
      etag: null,
      status: 'rejected',
      rejectReason: reason,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + rejectTtlMs)
    })

    return { ok: false, reason, fromCache: false }
  }

  // A single deadline covers DNS, headers and streamed body, before any socket is opened.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CIMD_FETCH_TIMEOUT_MS)
  let fetched: CimdFetchResult
  let stage: 'dns' | 'fetch' = 'dns'

  try {
    const addresses = await withinDeadline(
      (deps.resolveAddresses ?? defaultResolver)({ hostname: check.url.hostname }), controller.signal
    )

    if (addresses.length === 0) return await reject('dns_unresolvable')
    if (addresses.some(isDisallowedAddress)) return await reject('ssrf_blocked_address')
    stage = 'fetch'
    fetched = await withinDeadline((deps.fetcher ?? defaultFetcher)(clientId, {
      etag: cached?.status === 'valid' ? cached.etag : null,
      signal: controller.signal,
      addresses: Object.freeze([...addresses])
    }), controller.signal)
    // Enforce the same bound at the injected-port boundary as on the production stream.
    if (Buffer.byteLength(fetched.body, 'utf8') > CIMD_MAX_BYTES) return await reject('document_too_large')
  } catch (error) {
    const reason = error instanceof Error && error.message === 'cimd_document_too_large'
      ? 'document_too_large'
      : stage === 'dns' ? 'dns_unresolvable' : 'fetch_failed'

    return await reject(reason)
  } finally {
    clearTimeout(timer)
  }

  if (fetched.status === 304 && cached?.status === 'valid') {
    const validation = validateCimdDocument(clientId, cached.document)

    if (validation.ok) {
      await deps.store.putCimdCache({
        ...cached,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + deps.cacheTtlSeconds * 1000)
      })

      return { ok: true, client: cimdDocumentToClientRecord(validation.document, now), fromCache: true }
    }
  }

  if (fetched.status !== 200) return reject(`http_${fetched.status}`)
  if (fetched.contentType && !fetched.contentType.toLowerCase().includes('json')) return reject('content_type')

  let parsed: unknown

  try {
    parsed = JSON.parse(fetched.body)
  } catch {
    return reject('invalid_json')
  }

  const validation = validateCimdDocument(clientId, parsed)

  if (!validation.ok) return reject(validation.reason)

  await deps.store.putCimdCache({
    clientIdUrl: clientId,
    document: validation.document as unknown as Record<string, unknown>,
    etag: fetched.etag,
    status: 'valid',
    rejectReason: null,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + deps.cacheTtlSeconds * 1000)
  })

  return { ok: true, client: cimdDocumentToClientRecord(validation.document, now), fromCache: false }
}

export const assertCimdResolved = (result: ResolveCimdClientResult): OAuthClientRecord => {
  if (result.ok) return result.client

  throw new OAuthProtocolError('invalid_client', {
    description: 'client_id metadata document rejected',
    reason: result.reason
  })
}
