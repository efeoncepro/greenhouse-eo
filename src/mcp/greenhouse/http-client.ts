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
  async getSeoKeywordOpportunities(input: { organizationId?: string; market?: string; limit?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/keyword-opportunities', {
      organizationId: input.organizationId,
      market: input.market,
      limit: input.limit
    })
  }

  // TASK-1661 — lente ◑ ESTIMADA de mercado. Exige selección explícita de keywords: el lane
  // no ofrece "todas las de la org" a propósito.
  async getSeoKeywordMarketData(input: { organizationId?: string; market?: string; keywords: string[] }) {
    return this.request('/api/platform/ecosystem/growth/seo/keyword-market-data', {
      organizationId: input.organizationId,
      market: input.market,
      keywords: input.keywords.join(',')
    })
  }

  // TASK-1775 — foto de dominio ◑ (target o competidor) + trayectoria mensual.
  async getSeoDomainOverview(input: { organizationId?: string; market?: string; subject?: string; months?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/domain-overview', {
      organizationId: input.organizationId,
      market: input.market,
      subject: input.subject,
      months: input.months
    })
  }

  // TASK-1776 — visibilidad ◑ por sujeto-página (URL/subdominio/subcarpeta/dominio) o
  // concentración de tráfico de un host.
  async getSeoUrlVisibility(input: {
    organizationId?: string
    market?: string
    subject?: string
    kind?: string
    months?: number
    concentration?: string
    domain?: string
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/url-visibility', {
      organizationId: input.organizationId,
      market: input.market,
      subject: input.subject,
      kind: input.kind,
      months: input.months,
      concentration: input.concentration,
      domain: input.domain
    })
  }

  // TASK-1777 — detalle nominal de enlaces (tres estados; el skip es información).
  async getSeoBacklinkDetail(input: { organizationId?: string; market?: string; captureDate?: string }) {
    return this.request('/api/platform/ecosystem/growth/seo/backlink-detail', {
      organizationId: input.organizationId,
      market: input.market,
      captureDate: input.captureDate
    })
  }

  async getSeoVisibility360(input: { organizationId?: string; market?: string }) {
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
    market?: string
    rangeDays?: number
    engine?: string
    device?: string
    keywords?: string[]
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/rank-evolution', {
      organizationId: input.organizationId,
      market: input.market,
      rangeDays: input.rangeDays,
      engine: input.engine,
      device: input.device,
      keywords: input.keywords && input.keywords.length > 0 ? input.keywords.join(',') : undefined
    })
  }

  // TASK-1307 — rendimiento en el tiempo de un SET de keywords/URLs (pantalla ancla).
  async getSeoPerformance(input: {
    organizationId?: string
    market?: string
    mode?: string
    items?: string[]
    metric?: string
    rangeDays?: number
    device?: string
    engine?: string
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/performance', {
      organizationId: input.organizationId,
      market: input.market,
      mode: input.mode,
      items: input.items && input.items.length > 0 ? input.items.join(',') : undefined,
      metric: input.metric,
      rangeDays: input.rangeDays,
      device: input.device,
      engine: input.engine
    })
  }

  // TASK-1307 — qué keywords/URLs se pueden elegir para comparar.
  async getSeoPerformanceCatalog(input: { organizationId?: string; market?: string; mode?: string; windowDays?: number; limit?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/performance-catalog', {
      organizationId: input.organizationId,
      market: input.market,
      mode: input.mode,
      windowDays: input.windowDays,
      limit: input.limit
    })
  }

  // TASK-1306 — KPIs norte del cockpit Overview (GSC medido, agregado del período).
  async getSeoOverviewKpis(input: { organizationId?: string; market?: string; rangeDays?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/overview-kpis', {
      organizationId: input.organizationId,
      market: input.market,
      rangeDays: input.rangeDays
    })
  }

  // TASK-1304 — reporte del site audit técnico (OnPage, health + findings por severidad).
  async getSeoSiteAuditReport(input: { organizationId?: string; market?: string; auditRunId?: string }) {
    return this.request('/api/platform/ecosystem/growth/seo/site-audit-report', {
      organizationId: input.organizationId,
      market: input.market,
      auditRunId: input.auditRunId
    })
  }

  // TASK-1304 — serie semanal del perfil de enlaces (referring domains, rank, toxicidad).
  async getSeoBacklinkProfile(input: { organizationId?: string; market?: string; rangeDays?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/backlink-profile', {
      organizationId: input.organizationId,
      market: input.market,
      rangeDays: input.rangeDays
    })
  }

  /**
   * TASK-1308 — el PRIMER write del lane SEO (los 9 anteriores son lecturas).
   *
   * POST porque persiste: agrega keywords al set monitoreado, y eso compromete gasto
   * DataForSEO recurrente. El lane sólo lo acepta desde bindings de scope `internal`.
   */
  async trackSeoKeywords(input: {
    organizationId?: string
    keywords: string[]
    /** TASK-1659 — `target` | `opportunity`; se omite del body si el agente no la declaró. */
    intent?: 'target' | 'opportunity'
    intentDeclaredBy?: string
  }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/keywords/track',
      {},
      {
        method: 'POST',
        body: {
          organizationId: input.organizationId,
          keywords: input.keywords,
          // Se omite en vez de mandar `undefined`/`null`: el lane distingue "no declaró" de
          // un valor inválido, y mandar la llave vacía convertiría lo primero en lo segundo.
          ...(input.intent ? { intent: input.intent } : {}),
          ...(input.intent && input.intentDeclaredBy ? { intentDeclaredBy: input.intentDeclaredBy } : {})
        }
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

  /**
   * TASK-1664 — lectura de corridas y candidatos de keyword discovery. Con `runId` incluye
   * los candidatos compuestos (mercado ◑ + GSC ● + tracking + última acción).
   */
  async getSeoKeywordDiscovery(input: {
    organizationId?: string
    market?: string
    runId?: string
    status?: string
    sourceEndpoint?: string
    query?: string
    intent?: string
    minSearchVolume?: number
    maxDifficulty?: number
    excludeTracked?: boolean
    limit?: number
    cursor?: string
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/keyword-discovery', {
      organizationId: input.organizationId,
      market: input.market,
      runId: input.runId,
      status: input.status,
      sourceEndpoint: input.sourceEndpoint,
      query: input.query,
      intent: input.intent,
      minSearchVolume: input.minSearchVolume,
      maxDifficulty: input.maxDifficulty,
      excludeTracked: input.excludeTracked ? 'true' : undefined,
      limit: input.limit,
      cursor: input.cursor
    })
  }

  /**
   * TASK-1664 — encola (o previsualiza con `preview: true`) una corrida de discovery.
   *
   * POST porque GASTA: cada corrida paga a DataForSEO por request y por fila. El lane sólo
   * lo acepta desde bindings de scope `internal`.
   */
  async discoverSeoKeywords(input: {
    organizationId?: string
    market?: string
    seedSource: string
    manualSeeds?: string[]
    mixedMeasuredSource?: string
    methods?: Array<string | { method: string; resultsPerCall?: number }>
    idempotencyKey?: string
    preview?: boolean
  }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/keyword-discovery',
      { market: input.market },
      {
        method: 'POST',
        body: {
          organizationId: input.organizationId,
          seedSource: input.seedSource,
          manualSeeds: input.manualSeeds,
          mixedMeasuredSource: input.mixedMeasuredSource,
          methods: input.methods,
          idempotencyKey: input.idempotencyKey,
          preview: input.preview
        }
      }
    )
  }

  /**
   * TASK-1709 — lectura de diagnósticos de prospecto. Sólo bindings `internal` en el lane
   * (inteligencia de adquisición de Efeonce, jamás client-facing).
   */
  async getSeoProspectDiagnostic(input: { diagnosticId?: string; rootDomain?: string; limit?: number }) {
    return this.request('/api/platform/ecosystem/growth/seo/prospect-diagnostic', {
      diagnosticId: input.diagnosticId,
      rootDomain: input.rootDomain,
      limit: input.limit
    })
  }

  /**
   * TASK-1709 — disparar un diagnóstico de prospecto (COMMAND: compromete gasto real con
   * tope duro por diagnóstico). Sólo bindings `internal`.
   */
  async runSeoProspectDiagnostic(input: { rootDomain: string; market: string; competitorDomains?: string[] }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/prospect-diagnostic',
      {},
      {
        method: 'POST',
        body: {
          rootDomain: input.rootDomain,
          market: input.market,
          competitorDomains: input.competitorDomains
        }
      }
    )
  }

  /**
   * TASK-1666 — lectura del draft grounded (prompts AEO con provenance SEO). Sólo bindings
   * `internal` en el lane.
   */
  async getSeoGroundedQueryDraft(input: {
    organizationId?: string
    market?: string
    profileId: string
    setId: string
  }) {
    return this.request('/api/platform/ecosystem/growth/seo/grounded-queries', {
      organizationId: input.organizationId,
      market: input.market,
      profileId: input.profileId,
      setId: input.setId
    })
  }

  /**
   * TASK-1666 — preparar un DRAFT de grounded queries desde candidatos de discovery.
   *
   * POST porque persiste un draft AEO. ⚠️ Con la identidad máquina compartida el command
   * responde `aeo_forbidden` fail-closed (capability humana requerida; TASK-1631 lo abre).
   */
  async prepareSeoGroundedQueries(input: {
    organizationId?: string
    market?: string
    profileId: string
    seoTargetId: string
    discoveryRunId: string
    candidateIds: string[]
  }) {
    return this.request(
      '/api/platform/ecosystem/growth/seo/grounded-queries',
      { market: input.market },
      {
        method: 'POST',
        body: {
          organizationId: input.organizationId,
          profileId: input.profileId,
          seoTargetId: input.seoTargetId,
          discoveryRunId: input.discoveryRunId,
          candidateIds: input.candidateIds
        }
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
