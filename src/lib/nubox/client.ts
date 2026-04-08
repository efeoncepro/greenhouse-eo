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

const getBaseUrl = () => {
  const url = process.env.NUBOX_API_BASE_URL?.trim()

  if (!url) throw new Error('NUBOX_API_BASE_URL is not configured')

  return url.replace(/\/+$/, '')
}

const getBearerToken = async () => {
  const { value: token } = await resolveSecret({
    envVarName: 'NUBOX_BEARER_TOKEN'
  })

  if (!token) throw new Error('NUBOX_BEARER_TOKEN is not configured')

  return token
}

const getApiKey = () => {
  const key = process.env.NUBOX_X_API_KEY?.trim()

  if (!key) throw new Error('NUBOX_X_API_KEY is not configured')

  return key
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

const isRetryable = (status: number) => status === 429 || status >= 500

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
    'x-api-key': getApiKey(),
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

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    })

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
      lastError = new Error(`Nubox API ${method} ${path} returned ${response.status}`)
      continue
    }

    const errorBody = await response.text().catch(() => '')

    throw new Error(
      `Nubox API ${method} ${path} failed with ${response.status}: ${errorBody.slice(0, 500)}`
    )
  }

  throw lastError || new Error(`Nubox API ${method} ${path} failed after retries`)
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
    params: { period, page: String(page), size: String(size) }
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
      'x-api-key': getApiKey(),
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
      'x-api-key': getApiKey(),
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
      'x-api-key': getApiKey(),
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetcher(period, page, size)

    if (response.data && response.data.length > 0) {
      all.push(...response.data)
    }

    // Nubox returns total record count in x-total-count header (captured as totalCount)
    const totalPages = Math.ceil((response.totalCount || all.length) / size)

    if (page >= totalPages || response.data.length < size) break

    page++
  }

  return all
}
