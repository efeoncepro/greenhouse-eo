import 'server-only'

import { randomUUID } from 'node:crypto'

import type {
  NuboxSale,
  NuboxPurchase,
  NuboxExpense,
  NuboxIncome,
  NuboxSaleDetail,
  NuboxPaginatedResponse,
  NuboxIssuanceRequest,
  NuboxIssuanceResponse
} from '@/lib/nubox/types'
import { resolveSecret } from '@/lib/secrets/secret-manager'

// ─── Configuration ──────────────────────────────────────────────────────────

const sanitizeNuboxConfigValue = (value: string | null | undefined) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const withoutQuotes = trimmed.replace(/^['"]+|['"]+$/g, '').trim()
  const withoutLiteralLineEndings = withoutQuotes.replace(/(?:\\r|\\n)+$/g, '').trim()

  return withoutLiteralLineEndings ? withoutLiteralLineEndings : null
}

const getBaseUrl = () => {
  const url = sanitizeNuboxConfigValue(process.env.NUBOX_API_BASE_URL)

  if (!url) throw new Error('NUBOX_API_BASE_URL is not configured')

  return url.replace(/\/+$/, '')
}

const getBearerToken = async () => {
  const { value: token } = await resolveSecret({
    envVarName: 'NUBOX_BEARER_TOKEN'
  })

  const normalizedToken = sanitizeNuboxConfigValue(token)

  if (!normalizedToken) throw new Error('NUBOX_BEARER_TOKEN is not configured')

  return normalizedToken
}

const getApiKey = async () => {
  const { value: key } = await resolveSecret({
    envVarName: 'NUBOX_X_API_KEY'
  })

  const normalizedKey = sanitizeNuboxConfigValue(key)

  if (!normalizedKey) throw new Error('NUBOX_X_API_KEY is not configured')

  return normalizedKey
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

const isRetryable = (status: number) => status === 429 || status >= 500

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isRetryableFetchError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { name?: unknown; code?: unknown; cause?: unknown }
  const name = typeof maybeError.name === 'string' ? maybeError.name : ''
  const code = typeof maybeError.code === 'string' ? maybeError.code : ''

  const causeCode =
    maybeError.cause && typeof maybeError.cause === 'object' && 'code' in maybeError.cause
      ? String((maybeError.cause as { code?: unknown }).code || '')
      : ''

  return (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    name === 'TypeError' ||
    code.startsWith('UND_ERR_') ||
    causeCode.startsWith('UND_ERR_') ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'ETIMEDOUT' ||
    causeCode === 'EAI_AGAIN'
  )
}

const formatFetchError = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error)
}

/** Classifies the failure mode of a thrown fetch error for typed handling. */
const classifyFetchErrorKind = (error: unknown): NuboxApiErrorKind => {
  if (!error || typeof error !== 'object') return 'unknown'

  const name = typeof (error as { name?: unknown }).name === 'string' ? (error as { name: string }).name : ''

  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'

  // Anything else the retry classifier considers retryable is a connectivity
  // blip (UND_ERR_*, ECONNRESET, ETIMEDOUT, EAI_AGAIN, TypeError from undici).
  if (isRetryableFetchError(error)) return 'connectivity'

  return 'unknown'
}

export type NuboxApiErrorKind = 'timeout' | 'connectivity' | 'http' | 'unknown'

/**
 * Typed error thrown by `nuboxFetch` so consumers can distinguish a **transient**
 * external failure (Nubox slow/unreachable — recoverable on the next cycle) from
 * a **real** failure (auth, 4xx, schema). Periodic idempotent syncs degrade
 * honestly on transient errors instead of paging; persistent failure surfaces
 * via the Nubox source freshness signal (TASK-841). `message` is preserved
 * verbatim so Sentry grouping and existing assertions are unaffected.
 */
export class NuboxApiError extends Error {
  readonly kind: NuboxApiErrorKind
  readonly transient: boolean
  readonly status?: number

  constructor(
    message: string,
    options: { kind: NuboxApiErrorKind; transient: boolean; status?: number; cause?: unknown }
  ) {
    super(message)
    this.name = 'NuboxApiError'
    this.kind = options.kind
    this.transient = options.transient
    this.status = options.status

    if (options.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

/**
 * Per-request timeout for the `/sales` list endpoint. It is heavier than the
 * generic 15s default (returns up to `size` full sale records and is the most
 * frequently paginated call), so it gets its own env-tunable budget. Clamped to
 * a sane range so a misconfig can't set it to 0 or an unbounded value.
 */
const SALES_LIST_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt((process.env.NUBOX_SALES_LIST_TIMEOUT_MS ?? '').trim(), 10)

  if (!Number.isFinite(parsed)) return 30_000

  return Math.max(5_000, Math.min(parsed, 120_000))
})()

// ─── Core Fetch ─────────────────────────────────────────────────────────────

type NuboxRequestOptions = {
  method?: 'GET' | 'POST'
  path: string
  params?: Record<string, string>
  body?: unknown
  idempotenceId?: string
  timeoutMs?: number
}

const nuboxFetch = async <T>(options: NuboxRequestOptions): Promise<T> => {
  const { method = 'GET', path, params, body, idempotenceId, timeoutMs = 15_000 } = options
  const baseUrl = getBaseUrl()

  const url = new URL(`${baseUrl}${path}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getBearerToken()}`,
    'x-api-key': await getApiKey(),
    Accept: 'application/json'
  }

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  if (idempotenceId) {
    headers['x-idempotence-id'] = idempotenceId
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)

      await sleep(backoff)
    }

    let response: Response

    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      })
    } catch (error) {
      const message = formatFetchError(error)
      const transient = isRetryableFetchError(error)

      lastError = new NuboxApiError(`Nubox API ${method} ${path} request failed: ${message}`, {
        kind: classifyFetchErrorKind(error),
        transient,
        cause: error
      })

      if (transient && attempt < MAX_RETRIES) {
        continue
      }

      throw lastError
    }

    // 204 No Content — valid empty response
    if (response.status === 204) {
      return { data: [], totalCount: 0 } as unknown as T
    }

    // 207 Multi-Status — issuance response
    if (response.status === 207) {
      return (await response.json()) as T
    }

    if (response.ok) {
      const json = await response.json()

      // Nubox list endpoints return a plain array with pagination in x-total-count header
      if (Array.isArray(json)) {
        const totalCount = parseInt(response.headers.get('x-total-count') || '0', 10)

        return { data: json, totalCount } as unknown as T
      }

      return json as T
    }

    if (isRetryable(response.status) && attempt < MAX_RETRIES) {
      lastError = new NuboxApiError(`Nubox API ${method} ${path} returned ${response.status}`, {
        kind: 'http',
        transient: true,
        status: response.status
      })
      continue
    }

    const errorBody = await response.text().catch(() => '')

    throw new NuboxApiError(
      `Nubox API ${method} ${path} failed with ${response.status}: ${errorBody.slice(0, 500)}`,
      // 429/5xx are transient even after exhausting retries; 4xx are real (auth,
      // bad request, not found) and must page.
      { kind: 'http', transient: isRetryable(response.status), status: response.status }
    )
  }

  throw lastError || new NuboxApiError(`Nubox API ${method} ${path} failed after retries`, { kind: 'unknown', transient: true })
}

export const decodeNuboxXmlPayload = (body: string): string => {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    return ''
  }

  if (trimmedBody.startsWith('<')) {
    return body
  }

  try {
    const parsed = JSON.parse(trimmedBody) as { xml?: string }

    if (typeof parsed.xml === 'string' && parsed.xml) {
      return Buffer.from(parsed.xml, 'base64').toString('utf8')
    }

  } catch {
    // Fall back to the raw body if Nubox changes the response shape.
  }

  return body
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export const listNuboxSales = async (period: string, page = 1, size = 100) =>
  nuboxFetch<NuboxPaginatedResponse<NuboxSale>>({
    path: '/sales',
    params: { period, page: String(page), size: String(size) },
    timeoutMs: SALES_LIST_TIMEOUT_MS
  })

export const getNuboxSale = async (id: number) =>
  nuboxFetch<NuboxSale>({ path: `/sales/${id}` })

export const getNuboxSaleDetails = async (id: number) =>
  nuboxFetch<NuboxSaleDetail[]>({ path: `/sales/${id}/details` })

export const issuNuboxSales = async (request: NuboxIssuanceRequest) =>
  nuboxFetch<NuboxIssuanceResponse>({
    method: 'POST',
    path: '/sales/issuance',
    body: request,
    idempotenceId: randomUUID()
  })

export const getNuboxSalePdf = async (id: number): Promise<ArrayBuffer> => {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/sales/${id}/pdf?template=TEMPLATE_A4`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getBearerToken()}`,
      'x-api-key': await getApiKey(),
      Accept: 'application/pdf'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    throw new Error(`Nubox PDF download failed with ${response.status}`)
  }

  return response.arrayBuffer()
}

export const getNuboxSaleXml = async (id: number): Promise<string> => {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/sales/${id}/xml`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getBearerToken()}`,
      'x-api-key': await getApiKey(),
      Accept: 'application/xml,text/xml,application/json'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(`Nubox XML download failed with ${response.status}`)
  }

  return decodeNuboxXmlPayload(await response.text())
}

export const getNuboxPurchasePdf = async (id: number): Promise<ArrayBuffer> => {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/purchases/${id}/pdf?template=TEMPLATE_A4`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getBearerToken()}`,
      'x-api-key': await getApiKey(),
      Accept: 'application/pdf'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    throw new Error(`Nubox purchase PDF download failed with ${response.status}`)
  }

  return response.arrayBuffer()
}

// ─── Purchases ──────────────────────────────────────────────────────────────

export const listNuboxPurchases = async (period: string, page = 1, size = 100) =>
  nuboxFetch<NuboxPaginatedResponse<NuboxPurchase>>({
    path: '/purchases',
    params: { period, page: String(page), size: String(size) }
  })

export const getNuboxPurchase = async (id: number) =>
  nuboxFetch<NuboxPurchase>({ path: `/purchases/${id}` })

// ─── Expenses (bank payments out) ───────────────────────────────────────────

export const listNuboxExpenses = async (period: string, page = 1, size = 100) =>
  nuboxFetch<NuboxPaginatedResponse<NuboxExpense>>({
    path: '/expenses',
    params: { period, page: String(page), size: String(size) }
  })

// ─── Incomes (bank collections in) ─────────────────────────────────────────

export const listNuboxIncomes = async (period: string, page = 1, size = 100) =>
  nuboxFetch<NuboxPaginatedResponse<NuboxIncome>>({
    path: '/incomes',
    params: { period, page: String(page), size: String(size) }
  })

// ─── Pagination Helper ─────────────────────────────────────────────────────

export const fetchAllPages = async <T>(
  fetcher: (period: string, page: number, size: number) => Promise<NuboxPaginatedResponse<T>>,
  period: string,
  size = 100
): Promise<T[]> => {
  const all: T[] = []
  let page = 1

   
  while (true) {
    const response = await fetcher(period, page, size)

    if (response.data && response.data.length > 0) {
      all.push(...response.data)
    }

    if (!response.data || response.data.length === 0) break

    const totalPagesFromHeader = response.totalCount > 0 ? Math.ceil(response.totalCount / size) : null

    if (totalPagesFromHeader != null) {
      if (page >= totalPagesFromHeader) break
    } else if (response.data.length < size) {
      break
    }

    page++
  }

  return all
}
