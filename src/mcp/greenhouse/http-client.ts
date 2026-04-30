import type {
  GreenhouseApiErrorEnvelope,
  GreenhouseApiSuccessEnvelope,
  GreenhouseMcpConfig,
  GreenhouseMcpSuccessResult
} from './types'

type FetchLike = typeof fetch

type QueryValue = string | number | boolean | null | undefined

type QueryParams = Record<string, QueryValue>

export class GreenhouseMcpApiError extends Error {
  status: number
  code: string
  requestId: string | null
  apiVersion: string | null
  details: Record<string, unknown> | null

  constructor(
    message: string,
    options?: {
      status?: number
      code?: string
      requestId?: string | null
      apiVersion?: string | null
      details?: Record<string, unknown> | null
    }
  ) {
    super(message)
    this.name = 'GreenhouseMcpApiError'
    this.status = options?.status ?? 500
    this.code = options?.code ?? 'internal_error'
    this.requestId = options?.requestId ?? null
    this.apiVersion = options?.apiVersion ?? null
    this.details = options?.details ?? null
  }
}

const tryParseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

const appendQueryParams = (url: URL, query: QueryParams) => {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    url.searchParams.set(key, String(value))
  }
}

export class GreenhouseApiPlatformClient {
  private readonly config: GreenhouseMcpConfig
  private readonly fetchImpl: FetchLike

  constructor(config: GreenhouseMcpConfig, fetchImpl: FetchLike = fetch) {
    this.config = config
    this.fetchImpl = fetchImpl
  }

  async getContext() {
    return this.request('/api/platform/ecosystem/context')
  }

  async listOrganizations(input: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    type?: string
  }) {
    return this.request('/api/platform/ecosystem/organizations', input)
  }

  async getOrganization(input: { id: string }) {
    const encodedId = encodeURIComponent(input.id)

    return this.request(`/api/platform/ecosystem/organizations/${encodedId}`)
  }

  async listCapabilities(input: {
    page?: number
    pageSize?: number
    search?: string
  }) {
    return this.request('/api/platform/ecosystem/capabilities', input)
  }

  async getIntegrationReadiness(input: { keys?: string[] }) {
    return this.request('/api/platform/ecosystem/integration-readiness', {
      keys: input.keys?.length ? input.keys.join(',') : undefined
    })
  }

  private async request<TData>(
    path: string,
    query: QueryParams = {}
  ): Promise<GreenhouseMcpSuccessResult<TData>> {
    const url = new URL(path, this.config.apiBaseUrl)

    appendQueryParams(url, {
      externalScopeType: this.config.externalScopeType,
      externalScopeId: this.config.externalScopeId,
      ...query
    })

    const response = await this.fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.config.consumerToken}`,
        'x-greenhouse-api-version': this.config.apiVersion
      }
    })

    const payload = await tryParseJson(response)

    if (!response.ok) {
      const apiError = payload as GreenhouseApiErrorEnvelope | null
      const firstError = apiError?.errors?.[0]

      throw new GreenhouseMcpApiError(firstError?.message ?? response.statusText ?? 'API request failed.', {
        status: response.status,
        code: firstError?.code ?? 'internal_error',
        requestId: typeof apiError?.requestId === 'string' ? apiError.requestId : null,
        apiVersion: typeof apiError?.version === 'string' ? apiError.version : null,
        details: firstError?.details ?? null
      })
    }

    const success = payload as GreenhouseApiSuccessEnvelope<TData> | null

    if (!success || typeof success.requestId !== 'string' || typeof success.version !== 'string') {
      throw new GreenhouseMcpApiError('Greenhouse API returned an invalid success envelope.', {
        status: response.status,
        code: 'invalid_success_envelope'
      })
    }

    return {
      ok: true,
      requestId: success.requestId,
      apiVersion: success.version,
      status: response.status,
      data: success.data,
      meta: success.meta ?? {}
    }
  }
}
