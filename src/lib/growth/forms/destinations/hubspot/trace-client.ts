/** Read-only HubSpot correlation. Raw submissions and emails never leave this adapter. */
import 'server-only'

export type HubSpotTraceStatus = 'exact_submission' | 'candidate' | 'ambiguous' | 'not_found' | 'partial' | 'denied' | 'unavailable'
export type HubSpotTraceError = { code: string; httpStatus?: number }
export type HubSpotSubmissionQuery = {
  formGuid: string; nativeSubmissionId?: string; occurrenceMarker?: { name: string; value: string }; email?: string
  fromMs: number; toMs: number; maxPages?: number; pageSize?: number
}
export type HubSpotSubmissionEvidence = {
  status: HubSpotTraceStatus; portalId: string; formGuid: string
  conversionId?: string; candidateIds?: string[]; matchedCount: number; safeErrorCode?: string
  matches: Array<{ nativeSubmissionId?: string; submittedAtMs: number; emailMatched: boolean; matchedBy: 'conversion_id' | 'occurrence_marker' | 'email_and_time' }>
  pagination: { pages: number; complete: boolean; hasMore: boolean; nextCursor?: string; rowsInspected: number }
  error?: HubSpotTraceError
}
export type HubSpotContactEvidence = {
  status: 'found' | 'not_found' | 'denied' | 'unavailable'; portalId: string
  contactId?: string; safeErrorCode?: string
  id?: string; createdAt?: string; updatedAt?: string; emailMatches?: boolean; createdBeforeWindow?: boolean
  submissionProof: false; error?: HubSpotTraceError
}

class SafeHubSpotError extends Error {
  constructor(readonly code: string, readonly httpStatus?: number) { super(code); this.name = 'SafeHubSpotError' }
}

type Json = Record<string, unknown>
const object = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value)
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const nativeId = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[0-9]{1,40})$/i
const markerName = /^[a-z][a-z0-9_]{0,99}$/
const markerValue = /^(?:fsub-)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const cursorPattern = /^[A-Za-z0-9._~+/=-]{1,4096}$/
const LIMIT_BYTES = 4 * 1024 * 1024

function safeError(error: unknown): HubSpotTraceError {
  return error instanceof SafeHubSpotError
    ? { code: error.code, ...(error.httpStatus !== undefined ? { httpStatus: error.httpStatus } : {}) }
    : { code: 'hubspot_read_failed' }
}

function statusFor(error: unknown): 'denied' | 'unavailable' {
  return error instanceof SafeHubSpotError && (error.httpStatus === 401 || error.httpStatus === 403 || error.code === 'hubspot_portal_mismatch')
    ? 'denied' : 'unavailable'
}

function normalizedEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const email = value.trim().toLowerCase()

  return email.length <= 254 && /^[^\s@/\\?#\x00-\x1f]+@[^\s@/\\?#\x00-\x1f]+\.[^\s@/\\?#\x00-\x1f]+$/.test(email) ? email : undefined
}

function iso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return undefined
  const time = Date.parse(value)

  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

/** tokenProvider must call the existing canonical HubSpot resolver; no extra token source. */
export class HubSpotLeadTraceClient {
  readonly #tokenProvider: () => Promise<string>
  readonly #fetch: typeof fetch
  readonly #portal: string
  #token?: Promise<string>
  #portalVerified?: Promise<{ portalId: string }>

  constructor(options: { tokenProvider: () => Promise<string>; fetchImpl?: typeof fetch; expectedPortalId?: string }) {
    this.#tokenProvider = options.tokenProvider
    this.#fetch = options.fetchImpl ?? fetch
    this.#portal = options.expectedPortalId ?? '48713323'
    if (this.#portal !== '48713323') throw new SafeHubSpotError('hubspot_profile_not_authorized')
  }

  private token(): Promise<string> {
    this.#token ??= (async () => {
      try {
        const token = await this.#tokenProvider()

        if (typeof token !== 'string' || !/^[^\s\x00-\x1f]{20,8192}$/.test(token)) throw new Error()

        return token
      } catch { throw new SafeHubSpotError('hubspot_token_unavailable') }
    })()

    return this.#token
  }

  private async request(path: string, params: Record<string, string> = {}): Promise<Json> {
    const url = new URL('https://api.hubapi.com' + path)

    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    let response: Response
    const signal = AbortSignal.timeout(25000)

    try { response = await this.#fetch(url, { method: 'GET', redirect: 'error', signal, headers: { Authorization: 'Bearer ' + await this.token() } }) }
    catch (error) {
      if (error instanceof SafeHubSpotError) throw error
      throw new SafeHubSpotError(signal.aborted ? 'hubspot_timeout' : 'hubspot_transport_failed')
    }

    if (response.redirected || (response.status >= 300 && response.status < 400) ||
      (response.url && new URL(response.url).origin !== 'https://api.hubapi.com'))
      throw new SafeHubSpotError('hubspot_redirect_blocked')
    if (!response.ok) throw new SafeHubSpotError('hubspot_http_error', response.status)
    let parsed: unknown

    try {
      const length = Number(response.headers.get('content-length'))

      if (Number.isFinite(length) && length > LIMIT_BYTES) throw new SafeHubSpotError('hubspot_response_too_large')
      const reader = response.body?.getReader()

      if (!reader) throw new SafeHubSpotError('hubspot_invalid_response')
      const chunks: Uint8Array[] = []
      let size = 0

      while (true) {
        const chunk = await reader.read()

        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > LIMIT_BYTES) { await reader.cancel(); throw new SafeHubSpotError('hubspot_response_too_large') }
        chunks.push(chunk.value)
      }

      const bytes = new Uint8Array(size)
      let offset = 0

      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      parsed = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes))
    } catch (error) {
      if (error instanceof SafeHubSpotError) throw error
      throw new SafeHubSpotError(signal.aborted ? 'hubspot_timeout' : 'hubspot_invalid_response')
    }

    if (!object(parsed)) throw new SafeHubSpotError('hubspot_invalid_response')

    return parsed
  }

  verifyPortal(): Promise<{ portalId: string }> {
    this.#portalVerified ??= (async () => {
      const details = await this.request('/account-info/v3/details')

      if (String(details.portalId) !== this.#portal) throw new SafeHubSpotError('hubspot_portal_mismatch')

      return { portalId: this.#portal }
    })()

    return this.#portalVerified.then(value => ({ ...value }))
  }

  async findFormSubmission(input: HubSpotSubmissionQuery): Promise<HubSpotSubmissionEvidence> {
    const result: HubSpotSubmissionEvidence = { status: 'unavailable', portalId: this.#portal,
      formGuid: uuid.test(input.formGuid) ? input.formGuid : '', matches: [], matchedCount: 0,
      pagination: { pages: 0, complete: false, hasMore: false, rowsInspected: 0 } }

    const email = normalizedEmail(input.email)
    const hasNativeId = typeof input.nativeSubmissionId === 'string' && nativeId.test(input.nativeSubmissionId) && !/^hsforms-/i.test(input.nativeSubmissionId)
    const marker = input.occurrenceMarker
    const hasMarker = object(marker) && typeof marker.name === 'string' && markerName.test(marker.name) && typeof marker.value === 'string' && markerValue.test(marker.value)
    const hasExactIdentity = hasNativeId || hasMarker
    const maxPages = input.maxPages ?? 3, pageSize = input.pageSize ?? 50
    let after: string | undefined
    const seen = new Set<string>()

    try {
      if (!uuid.test(input.formGuid) || !Number.isSafeInteger(input.fromMs) || !Number.isSafeInteger(input.toMs) || input.fromMs < 0 || input.toMs < input.fromMs ||
        !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 ||
        (input.email !== undefined && !email) || (input.nativeSubmissionId !== undefined && !hasNativeId) ||
        (marker !== undefined && !hasMarker))
        throw new SafeHubSpotError('hubspot_correlation_input_invalid')
      if (!hasExactIdentity && !email) throw new SafeHubSpotError('correlation_identity_missing')
      await this.verifyPortal()

      while (result.pagination.pages < maxPages) {
        const page = await this.request('/form-integrations/v1/submissions/forms/' + input.formGuid, { limit: String(pageSize), ...(after ? { after } : {}) })

        if (!Array.isArray(page.results)) throw new SafeHubSpotError('hubspot_invalid_submissions_response')

        for (const row of page.results) {
          result.pagination.rowsInspected++
          if (!object(row) || typeof row.submittedAt !== 'number' || !Number.isSafeInteger(row.submittedAt))
            throw new SafeHubSpotError('hubspot_invalid_submissions_response')
          if (!hasExactIdentity && (row.submittedAt < input.fromMs || row.submittedAt > input.toMs)) continue
          const conversionId = typeof row.conversionId === 'string' && nativeId.test(row.conversionId) ? row.conversionId : undefined
          const emailValues = Array.isArray(row.values) ? row.values.filter(value => object(value) && value.name === 'email').map(value => normalizedEmail((value as Json).value)).filter(Boolean) : []
          const emailMatched = Boolean(email && emailValues.length === 1 && emailValues[0] === email)

          const markerValues = hasMarker && Array.isArray(row.values) ? row.values.filter(value => object(value) && value.name === marker.name) : []
          const markerMatched = markerValues.length === 1 && object(markerValues[0]) && markerValues[0].value === marker?.value

          if (hasNativeId && conversionId !== input.nativeSubmissionId) continue
          if (hasMarker && !markerMatched) continue
          if (!hasExactIdentity && !emailMatched) continue
          result.matches.push({ ...(conversionId ? { nativeSubmissionId: conversionId } : {}), submittedAtMs: row.submittedAt, emailMatched,
            matchedBy: hasNativeId ? 'conversion_id' : hasMarker ? 'occurrence_marker' : 'email_and_time' })
        }

        result.pagination.pages++

        if (page.paging !== undefined && !object(page.paging)) {
          result.pagination.hasMore = true
          throw new SafeHubSpotError('hubspot_invalid_pagination_response')
        }

        const paging = page.paging ?? {}

        if (paging.next !== undefined && !object(paging.next)) {
          result.pagination.hasMore = true
          throw new SafeHubSpotError('hubspot_invalid_pagination_response')
        }

        const next = paging.next

        if (!next) { result.pagination.complete = true; result.pagination.hasMore = false; break }
        result.pagination.hasMore = true
        const nextAfter = next.after

        if (typeof nextAfter !== 'string' || !cursorPattern.test(nextAfter) || nextAfter.includes(await this.token()) || seen.has(nextAfter))
          throw new SafeHubSpotError('hubspot_invalid_or_repeated_cursor')
        seen.add(nextAfter); after = nextAfter; result.pagination.nextCursor = nextAfter
      }

      if (result.pagination.complete) delete result.pagination.nextCursor
      result.status = result.matches.length > 1 ? 'ambiguous' : !result.pagination.complete ? 'partial' :
        result.matches.length === 1 && hasExactIdentity ? 'exact_submission' : result.matches.length === 1 ? 'candidate' : 'not_found'
    } catch (error) {
      result.status = statusFor(error) === 'denied' ? 'denied' : result.pagination.pages > 0 ? 'partial' : 'unavailable'
      result.pagination.complete = false
      if (error instanceof SafeHubSpotError && ['hubspot_invalid_or_repeated_cursor', 'hubspot_invalid_pagination_response'].includes(error.code)) delete result.pagination.nextCursor
      result.error = safeError(error)
    }

    result.matchedCount = result.matches.length
    if (result.status === 'exact_submission' && result.matches[0]?.nativeSubmissionId)
      result.conversionId = result.matches[0].nativeSubmissionId
    if (result.matches.length) result.candidateIds = result.matches.flatMap(v => v.nativeSubmissionId ? [v.nativeSubmissionId] : [])
    if (result.error) result.safeErrorCode = result.error.code

    return result
  }

  lookupContact(email: string): Promise<HubSpotContactEvidence> {
    return this.findContactByEmail({ email })
  }

  async findContactByEmail(input: { email: string; fromMs?: number }): Promise<HubSpotContactEvidence> {
    const result: HubSpotContactEvidence = { status: 'unavailable', portalId: this.#portal, submissionProof: false }
    let contactRequested = false

    try {
      const email = normalizedEmail(input.email)

      if (!email || (input.fromMs !== undefined && (!Number.isSafeInteger(input.fromMs) || input.fromMs < 0))) throw new SafeHubSpotError('hubspot_correlation_input_invalid')
      await this.verifyPortal()
      contactRequested = true
      const contact = await this.request('/crm/objects/2026-03/contacts/' + encodeURIComponent(email), { idProperty: 'email', properties: 'email,createdate,lastmodifieddate', archived: 'false' })

      if (typeof contact.id !== 'string' || !/^\d{1,40}$/.test(contact.id) || !object(contact.properties) || contact.archived === true)
        throw new SafeHubSpotError('hubspot_invalid_contact_response')
      const createdAt = iso(contact.createdAt) ?? iso(contact.properties.createdate)
      const updatedAt = iso(contact.updatedAt) ?? iso(contact.properties.lastmodifieddate)

      return { ...result, status: 'found', id: contact.id, contactId: contact.id, emailMatches: normalizedEmail(contact.properties.email) === email,
        ...(createdAt ? { createdAt } : {}), ...(updatedAt ? { updatedAt } : {}),
        ...(createdAt && input.fromMs !== undefined ? { createdBeforeWindow: Date.parse(createdAt) < input.fromMs } : {}) }
    } catch (error) {
      result.status = contactRequested && error instanceof SafeHubSpotError && error.httpStatus === 404 ? 'not_found' : statusFor(error)
      result.error = safeError(error)
      result.safeErrorCode = result.error.code

      return result
    }
  }
}
