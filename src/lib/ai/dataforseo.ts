import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

const DATAFORSEO_API_BASE_URL = 'https://api.dataforseo.com'

export const DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT = '/v3/serp/google/ai_mode/live/advanced'
export const DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT = '/v3/serp/google/organic/live/advanced'

export interface DataForSeoSerpTask {
  keyword: string
  location_name?: string
  location_code?: number
  language_code?: string
  device?: 'desktop' | 'mobile'
  os?: string
  depth?: number
  [key: string]: unknown
}

export interface DataForSeoSerpResult {
  ok: boolean
  httpStatus: number
  endpoint: string
  tasks: unknown[]
  cost: number | null
  latencyMs: number
  secretSource: SecretResolutionSource
}

export interface DataForSeoConnectionCheck {
  ok: boolean
  httpStatus: number
  secretSource: SecretResolutionSource
  latencyMs: number
}

export const isDataForSeoConfigured = async (): Promise<boolean> => {
  try {
    const login = process.env.DATAFORSEO_API_LOGIN?.trim()
    const password = await resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })

    return Boolean(login && password.value)
  } catch {
    return false
  }
}

const resolveDataForSeoCredentials = async () => {
  const login = process.env.DATAFORSEO_API_LOGIN?.trim()
  const password = await resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })

  if (!login || !password.value) {
    throw new Error(
      'DataForSEO no esta configurado. Define DATAFORSEO_API_LOGIN y DATAFORSEO_API_PASSWORD o DATAFORSEO_API_PASSWORD_SECRET_REF.'
    )
  }

  return {
    login,
    password: password.value,
    source: password.source
  }
}

const normalizeEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim()

  if (!trimmed.startsWith('/v3/serp/')) {
    throw new Error('Endpoint DataForSEO no permitido para este cliente.')
  }

  return trimmed
}

const readCost = (json: Record<string, unknown>): number | null => {
  const cost = json.cost

  return typeof cost === 'number' && Number.isFinite(cost) ? cost : null
}

export const postDataForSeoSerpLiveAdvanced = async (input: {
  endpoint: string
  tasks: DataForSeoSerpTask[]
  timeoutMs?: number
}): Promise<DataForSeoSerpResult> => {
  const credentials = await resolveDataForSeoCredentials()
  const endpoint = normalizeEndpoint(input.endpoint)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 35_000)
  const started = Date.now()
  const auth = Buffer.from(`${credentials.login}:${credentials.password}`, 'utf8').toString('base64')

  try {
    const response = await fetch(`${DATAFORSEO_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input.tasks),
      signal: controller.signal
    })

    const latencyMs = Date.now() - started

    if (!response.ok) {
      await response.text().catch(() => undefined)

      return {
        ok: false,
        httpStatus: response.status,
        endpoint,
        tasks: [],
        cost: null,
        latencyMs,
        secretSource: credentials.source
      }
    }

    const json = (await response.json()) as Record<string, unknown>
    const tasks = Array.isArray(json.tasks) ? json.tasks : []

    return {
      ok: true,
      httpStatus: response.status,
      endpoint,
      tasks,
      cost: readCost(json),
      latencyMs,
      secretSource: credentials.source
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const checkDataForSeoConnection = async (input: { timeoutMs?: number } = {}): Promise<DataForSeoConnectionCheck> => {
  const credentials = await resolveDataForSeoCredentials()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15_000)
  const started = Date.now()
  const auth = Buffer.from(`${credentials.login}:${credentials.password}`, 'utf8').toString('base64')

  try {
    const response = await fetch(`${DATAFORSEO_API_BASE_URL}/v3/appendix/user_data`, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
      signal: controller.signal
    })

    if (!response.ok) {
      await response.text().catch(() => undefined)
    } else {
      await response.json().catch(() => undefined)
    }

    return {
      ok: response.ok,
      httpStatus: response.status,
      secretSource: credentials.source,
      latencyMs: Date.now() - started
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const runDataForSeoGoogleAiModeSerp = async (input: {
  keyword: string
  locationName?: string
  languageCode?: string
  device?: 'desktop' | 'mobile'
  timeoutMs?: number
}): Promise<DataForSeoSerpResult> =>
  postDataForSeoSerpLiveAdvanced({
    endpoint: DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
    timeoutMs: input.timeoutMs,
    tasks: [
      {
        keyword: input.keyword,
        location_name: input.locationName ?? 'Chile',
        language_code: input.languageCode ?? 'es',
        device: input.device ?? 'desktop'
      }
    ]
  })
