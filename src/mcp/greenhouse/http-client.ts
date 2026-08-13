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

  async getPlatformHealth() {
    return this.request('/api/platform/ecosystem/health')
  }

  async listEventTypes(input: {
    search?: string
    namespace?: string
    aggregateType?: string
  }) {
    return this.request('/api/platform/ecosystem/event-types', input)
  }

  async listWebhookSubscriptions(input: {
    page?: number
    pageSize?: number
    active?: boolean
  }) {
    return this.request('/api/platform/ecosystem/webhook-subscriptions', input)
  }

  async getWebhookSubscription(input: { id: string }) {
    const encodedId = encodeURIComponent(input.id)

    return this.request(`/api/platform/ecosystem/webhook-subscriptions/${encodedId}`)
  }

  async listWebhookDeliveries(input: {
    page?: number
    pageSize?: number
    status?: string
    eventType?: string
  }) {
    return this.request('/api/platform/ecosystem/webhook-deliveries', input)
  }

  async getWebhookDelivery(input: { id: string }) {
    const encodedId = encodeURIComponent(input.id)

    return this.request(`/api/platform/ecosystem/webhook-deliveries/${encodedId}`)
  }

  // TASK-1086 — Knowledge (read-only, downstream del lane ecosystem). El packet
  // `knowledge-search.v1` ya trae citas/humanUrl/freshness/confidence; NO mapping paralelo.
  async searchKnowledge(input: { query: string; limit?: number }) {
    return this.request('/api/platform/ecosystem/knowledge/search', {
      query: input.query,
      limit: input.limit
    })
  }

  async getKnowledgeDocument(input: { id: string }) {
    const encodedId = encodeURIComponent(input.id)

    return this.request(`/api/platform/ecosystem/knowledge/documents/${encodedId}`)
  }

  // TASK-1645 — Growth SEO (read-only, mandato MCP-first del operador 2026-08-05).
  // El lane resuelve la org por binding: para bindings internos `organizationId` es
  // requerido; para bindings org-scoped se omite (o debe coincidir con el binding).
  async getSeoKeywordOpportunities(input: { organizationId?: string; limit?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/keyword-opportunities', {
      organizationId: input.organizationId,
      limit: input.limit
    })
  }

  // TASK-1661 — lente ◑ ESTIMADA de mercado. Exige selección explícita de keywords: el lane
  // no ofrece "todas las de la org" a propósito.
  async getSeoKeywordMarketData(input: { organizationId?: string; keywords: string[] }) {
    return this.request('/api/platform/ecosystem/growth/seo/keyword-market-data', {
      organizationId: input.organizationId,
      keywords: input.keywords.join(',')
    })
  }

  async getSeoVisibility360(input: { organizationId?: string }) {
    return this.request('/api/platform/ecosystem/growth/seo/visibility-360', {
      organizationId: input.organizationId
    })
  }

  async getSeoEntitlement(input: { organizationId?: string }) {
    return this.request('/api/platform/ecosystem/growth/seo/entitlement', {
      organizationId: input.organizationId
    })
  }

  // TASK-1303 — serie temporal de posiciones (rank evolution, DataForSEO).
  async getSeoRankEvolution(input: {
    organizationId?: string
    rangeDays?: number
    engine?: string
    device?: string
    keywords?: string[]
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/rank-evolution', {
      organizationId: input.organizationId,
      rangeDays: input.rangeDays,
      engine: input.engine,
      device: input.device,
      keywords: input.keywords && input.keywords.length > 0 ? input.keywords.join(',') : undefined
    })
  }

  // TASK-1307 — rendimiento en el tiempo de un SET de keywords/URLs (pantalla ancla).
  async getSeoPerformance(input: {
    organizationId?: string
    mode?: string
    items?: string[]
    metric?: string
    rangeDays?: number
    device?: string
    engine?: string
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/performance', {
      organizationId: input.organizationId,
      mode: input.mode,
      items: input.items && input.items.length > 0 ? input.items.join(',') : undefined,
      metric: input.metric,
      rangeDays: input.rangeDays,
      device: input.device,
      engine: input.engine
    })
  }

  // TASK-1307 — qué keywords/URLs se pueden elegir para comparar.
  async getSeoPerformanceCatalog(input: { organizationId?: string; mode?: string; windowDays?: number; limit?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/performance-catalog', {
      organizationId: input.organizationId,
      mode: input.mode,
      windowDays: input.windowDays,
      limit: input.limit
    })
  }

  // TASK-1306 — KPIs norte del cockpit Overview (GSC medido, agregado del período).
  async getSeoOverviewKpis(input: { organizationId?: string; rangeDays?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/overview-kpis', {
      organizationId: input.organizationId,
      rangeDays: input.rangeDays
    })
  }

  // TASK-1304 — reporte del site audit técnico (OnPage, health + findings por severidad).
  async getSeoSiteAuditReport(input: { organizationId?: string; auditRunId?: string }) {
    return this.request('/api/platform/ecosystem/growth/seo/site-audit-report', {
      organizationId: input.organizationId,
      auditRunId: input.auditRunId
    })
  }

  // TASK-1304 — serie semanal del perfil de enlaces (referring domains, rank, toxicidad).
  async getSeoBacklinkProfile(input: { organizationId?: string; rangeDays?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/backlink-profile', {
      organizationId: input.organizationId,
      rangeDays: input.rangeDays
    })
  }

  /**
   * TASK-1308 — el PRIMER write del lane SEO (los 9 anteriores son lecturas).
   *
   * POST porque persiste: agrega keywords al set monitoreado, y eso compromete gasto
   * DataForSEO recurrente. El lane sólo lo acepta desde bindings de scope `internal`.
   */
  async trackSeoKeywords(input: { organizationId?: string; keywords: string[] }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/keywords/track',
      {},
      {
        method: 'POST',
        body: { organizationId: input.organizationId, keywords: input.keywords }
      }
    )
  }

  /**
   * TASK-1308 — la contraparte de `trackSeoKeywords`: saca keywords del ciclo de gasto.
   *
   * Que exista es lo que hace REVERSIBLE el compromiso desde un agente. Sin ella, una tool
   * podía subir la factura del cliente y ninguna podía bajarla.
   */
  async untrackSeoKeywords(input: { organizationId?: string; keywords: string[] }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/keywords/untrack',
      {},
      {
        method: 'POST',
        body: { organizationId: input.organizationId, keywords: input.keywords }
      }
    )
  }

  // TASK-1211 — Cotizador (read-only). Resolver de servicios + simulación de precio
  // (estimado referencial NO vinculante). Lane ecosystem; scope por binding.
  async searchServices(input: { query?: string; limit?: number }) {
    return this.request('/api/platform/ecosystem/quotation/services', {
      query: input.query,
      limit: input.limit
    })
  }

  async simulateQuote(input: Record<string, unknown>) {
    return this.request('/api/platform/ecosystem/quotation/simulate', {}, { method: 'POST', body: input })
  }

  private async request<TData>(
    path: string,
    query: QueryParams = {},
    init?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
  ): Promise<GreenhouseMcpSuccessResult<TData>> {
    const url = new URL(path, this.config.apiBaseUrl)

    // Los scope params van SIEMPRE en el querystring (el auth ecosystem los lee de la
    // URL), incluso en el POST read-only de simulate.
    appendQueryParams(url, {
      externalScopeType: this.config.externalScopeType,
      externalScopeId: this.config.externalScopeId,
      ...query
    })

    const method = init?.method ?? 'GET'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    let response: Response

    try {
      response = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          accept: 'application/json',
          ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
          authorization: `Bearer ${this.config.consumerToken}`,
          'x-greenhouse-api-version': this.config.apiVersion
        },
        ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
        signal: controller.signal
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GreenhouseMcpApiError(
          `Greenhouse API request timed out after ${this.config.requestTimeoutMs}ms.`,
          {
            status: 504,
            code: 'upstream_timeout'
          }
        )
      }

      throw error
    } finally {
      clearTimeout(timeout)
    }

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
