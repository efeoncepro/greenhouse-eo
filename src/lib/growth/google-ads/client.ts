import 'server-only'

import { GoogleAdsError, GOOGLE_ADS_PROFILE, type ReadCommand, type ReadOptions } from './contracts'
import { buildReadQuery, integerOption, projectRow } from './queries'
import { buildWritePlan, getWriteRequestBody } from './writes'

const MAX_BYTES = 20 * 1024 * 1024
const safeId = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(v) ? v : undefined

export class GoogleAdsClient {
  readonly #tokenProvider: () => Promise<string>
  readonly #fetch: typeof fetch
  #identity?: Promise<Record<string, unknown>>
  readonly #tokens = new Set<string>()

  constructor(options: { tokenProvider: () => Promise<string>; fetchImpl?: typeof fetch }) {
    this.#tokenProvider = options.tokenProvider
    this.#fetch = options.fetchImpl ?? fetch
  }

  private redact(value: string) {
    for (const token of this.#tokens) value = value.replaceAll(token, '[redacted]')

    return value.replace(/(?:ya29\.[A-Za-z0-9._-]+|GOCSPX-[A-Za-z0-9_-]+|1\/\/[A-Za-z0-9_-]+)/g, '[redacted]')
  }

  private async request(endpoint: string, body: unknown) {
    let token: string

    try { token = await this.#tokenProvider() } catch (e) { throw e instanceof GoogleAdsError ? e : new GoogleAdsError('AUTHENTICATION_UNAVAILABLE', 3) }
    if (!token || /\s/.test(token) || token.length > 8192) throw new GoogleAdsError('INVALID_ACCESS_TOKEN', 3)
    this.#tokens.add(token)
    let response: Response

    try {
      response = await this.#fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_PROFILE.apiVersion}/customers/${GOOGLE_ADS_PROFILE.customerId}/${endpoint}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'login-customer-id': GOOGLE_ADS_PROFILE.loginCustomerId },
        body: JSON.stringify(body)
      })
    } catch { throw new GoogleAdsError('TRANSPORT_OUTCOME_UNKNOWN', 5) }

    const requestId = safeId(response.headers.get('request-id'))

    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new GoogleAdsError('RESPONSE_TOO_LARGE', 5, { requestId })
    const chunks: Uint8Array[] = []
    let size = 0
    const reader = response.body?.getReader()

    if (!reader) throw new GoogleAdsError('EMPTY_PROVIDER_RESPONSE', 5, { requestId })

    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>

      try { chunk = await reader.read() } catch { throw new GoogleAdsError('TRANSPORT_OUTCOME_UNKNOWN', 5, { requestId }) }
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_BYTES) { await reader.cancel(); throw new GoogleAdsError('RESPONSE_TOO_LARGE', 5, { requestId }) }
      chunks.push(chunk.value)
    }

    let data: Record<string, unknown>

    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new GoogleAdsError('INVALID_PROVIDER_JSON', 5, { requestId }) }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new GoogleAdsError('INVALID_PROVIDER_RESPONSE', 5, { requestId })

    if (!response.ok) {
      const providerCodes: string[] = []
      const error = data.error as { details?: { requestId?: string; errors?: { errorCode?: Record<string, unknown> }[] }[] } | undefined

      for (const detail of Array.isArray(error?.details) ? error.details : []) {
        for (const item of Array.isArray(detail.errors) ? detail.errors : []) {
          for (const [key, value] of Object.entries(item.errorCode ?? {})) {
            if (/^[a-zA-Z]{1,80}$/.test(key) && typeof value === 'string' && /^[A-Z0-9_]{1,120}$/.test(value)) providerCodes.push(`${key}:${value}`)
          }
        }
      }

      throw new GoogleAdsError('PROVIDER_REQUEST_REJECTED', response.status === 401 ? 3 : response.status === 403 ? 4 : 5, { httpStatus: response.status, requestId: requestId ?? safeId(error?.details?.find(x => x.requestId)?.requestId), providerCodes: providerCodes.slice(0, 20) })
    }

    return { data, requestId }
  }

  verifyIdentity() {
    this.#identity ??= (async () => {
      const plan = buildReadQuery('account get')
      const { data } = await this.request('googleAds:search', { query: plan.query })
      const results = data.results as { customer?: Record<string, unknown> }[] | undefined
      const customer = results?.[0]?.customer

      if (!Array.isArray(results) || results.length !== 1 || customer?.id !== GOOGLE_ADS_PROFILE.customerId || data.nextPageToken) throw new GoogleAdsError('CUSTOMER_BINDING_MISMATCH', 4)
      if (customer.timeZone !== GOOGLE_ADS_PROFILE.timeZone) throw new GoogleAdsError('ACCOUNT_TIMEZONE_CHANGED', 4)

      return projectRow(results[0], plan.fields, s => this.redact(s))
    })()

    return this.#identity
  }

  async executeWrite(input: unknown, options: { validateOnly: boolean; confirmDigest?: string }) {
    const plan = buildWritePlan(input)

    if (!options.validateOnly && options.confirmDigest !== plan.digest) throw new GoogleAdsError('WRITE_CONFIRMATION_DIGEST_REQUIRED')
    await this.verifyIdentity()
    const { data, requestId } = await this.request(plan.endpoint, getWriteRequestBody(plan, options.validateOnly))

    if (options.validateOnly) return { validated: true, requestId }
    const results = data.results as { resourceName?: string }[] | undefined
    const resourceName = results?.[0]?.resourceName
    const collection = plan.endpoint.split(':')[0]

    if (data.partialFailureError || !Array.isArray(results) || results.length !== 1 || typeof resourceName !== 'string' || !resourceName.startsWith(`customers/${GOOGLE_ADS_PROFILE.customerId}/${collection}/`)) throw new GoogleAdsError('WRITE_RESULT_UNKNOWN', 7, { requestId })
    if (plan.summary.resourceName && resourceName !== plan.summary.resourceName) throw new GoogleAdsError('WRITE_RESULT_RESOURCE_MISMATCH', 7, { requestId })

    return { validated: false, requestId, resourceName }
  }

  async readback(input: unknown, resourceName: string) {
    const plan = buildWritePlan(input)
    const map: Record<string, ReadCommand> = { campaigns: 'campaigns list', campaignBudgets: 'budgets list', adGroups: 'adgroups list', conversionActions: 'conversions list', customerConversionGoals: 'goals account', campaignConversionGoals: 'goals campaigns' }
    const command = map[plan.endpoint.split(':')[0]]

    if (!command || !new RegExp(`^customers/${GOOGLE_ADS_PROFILE.customerId}/${plan.endpoint.split(':')[0]}/[A-Za-z0-9_~]+$`).test(resourceName)) throw new GoogleAdsError('READBACK_RESOURCE_MISMATCH')
    if (plan.summary.resourceName && resourceName !== plan.summary.resourceName) throw new GoogleAdsError('READBACK_RESOURCE_MISMATCH')
    const template = buildReadQuery(command)
    const operation = plan.body.operations[0] as { create?: Record<string, unknown>; update?: Record<string, unknown> }
    const expected: Record<string, unknown> = {}

    const flatten = (value: Record<string, unknown>, prefix = '') => {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'resourceName') continue
        const field = prefix + key.replace(/[A-Z]/g, c => '_' + c.toLowerCase())

        if (key === 'manualCpc') expected['bidding_strategy_type'] = 'MANUAL_CPC'
        else if (item && typeof item === 'object' && !Array.isArray(item)) flatten(item as Record<string, unknown>, field + '.')
        else expected[field] = item
      }
    }

    flatten(operation.create ?? operation.update!)
    const fields = Object.keys(expected).map(field => `${template.resource}.${field}`)

    await this.verifyIdentity()
    const { data, requestId } = await this.request('googleAds:search', { query: `SELECT ${fields.join(', ')} FROM ${template.resource} WHERE ${template.resource}.resource_name = '${resourceName}'` })

    if (!Array.isArray(data.results) || data.results.length !== 1 || data.nextPageToken) throw new GoogleAdsError('READBACK_NOT_UNIQUE', 8, { requestId })
    const row = projectRow(data.results[0], fields, s => this.redact(s))

    const checks = Object.entries(expected).map(([field, value]) => {
      const keys = `${template.resource}.${field}`.split('.').map(x => x.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()))
      let actual: unknown = row

      for (const key of keys) actual = actual && typeof actual === 'object' ? (actual as Record<string, unknown>)[key] : undefined

      return { field, expected: value, actual, matched: actual !== undefined && (actual === value || typeof value === 'number' && Number.isInteger(value) && actual === String(value)), available: actual !== undefined }
    })

    return { resourceName, requestId, row, verification: { matched: checks.every(x => x.matched), complete: checks.every(x => x.available), checks } }
  }

  async read(command: ReadCommand, options: ReadOptions = {}, now = new Date()) {
    const plan = buildReadQuery(command, options, now)
    const maxPages = integerOption(options.pages, 1, 1, 10)
    let pageToken: string | undefined

    if (options.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString())

        if (cursor.hash !== plan.hash || typeof cursor.token !== 'string' || !cursor.token || cursor.token.length > 16384 || /[\u0000-\u0020]/.test(cursor.token)) throw Error()
        pageToken = cursor.token
      } catch { throw new GoogleAdsError('INVALID_OR_MISMATCHED_CURSOR') }
    }

    const identity = await this.verifyIdentity()
    const rows: Record<string, unknown>[] = []
    const requestIds: string[] = []
    const seen = new Set<string>()
    let pages = 0
    let failure: { code: string; details: GoogleAdsError['details'] } | undefined

    while (pages < maxPages) {
      if (pageToken) seen.add(pageToken)

      try {
        const { data, requestId } = await this.request('googleAds:search', { query: plan.query, ...(pageToken ? { pageToken } : {}) })

        if (data.results !== undefined && !Array.isArray(data.results)) throw new GoogleAdsError('INVALID_RESULTS_PAGE', 5)
        const page = (data.results ?? []) as unknown[]

        if (page.length > 10000) throw new GoogleAdsError('PROVIDER_PAGE_EXCEEDS_CONTRACT', 5)

        for (const row of page) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) throw new GoogleAdsError('INVALID_RESULTS_PAGE', 5)
        }

        const next = data.nextPageToken

        if (next !== undefined && (typeof next !== 'string' || !next || next.length > 16384 || /[\u0000-\u0020]/.test(next) || seen.has(next))) throw new GoogleAdsError('INVALID_OR_REPEATED_PROVIDER_CURSOR', 5)
        rows.push(...page.map(row => projectRow(row, plan.fields, s => this.redact(s))))
        pages++
        if (requestId) requestIds.push(requestId)
        pageToken = next as string | undefined
        if (!pageToken) break
      } catch (e) {
        if (!pages) throw e
        const error = e instanceof GoogleAdsError ? e : new GoogleAdsError('PROVIDER_READ_FAILED', 5)

        failure = { code: error.code, details: error.details }
        break
      }
    }

    return {
      identity, resource: plan.resource, fields: plan.fields, range: plan.range, rows,
      fetchedAt: now.toISOString(), requestIds,
      coverage: { pages, complete: !failure && !pageToken, partial: Boolean(failure || pageToken), nextCursor: pageToken ? Buffer.from(JSON.stringify({ hash: plan.hash, token: pageToken })).toString('base64url') : undefined, error: failure, zeroMetricRowsMayBeOmitted: command === 'report get', adsModel: plan.resource === 'ad_group_ad' ? 'ad_group_ad; asset_groups_not_included' : undefined },
      units: { costMicros: 'integer string; divide by 1000000 for account currency', conversions: 'attributed number, potentially fractional', currency: (identity.customer as Record<string, unknown>).currencyCode, timeZone: GOOGLE_ADS_PROFILE.timeZone }
    }
  }
}
