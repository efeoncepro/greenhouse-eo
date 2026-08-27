import * as z from 'zod/v4'

import { GreenhouseMcpApiError, type GreenhouseApiPlatformClient } from './http-client'
import type { GreenhouseMcpErrorResult, GreenhouseMcpSuccessResult, GreenhouseMcpToolResult } from './types'

const platformHealthIssueSchema = z.object({
  moduleKey: z.string(),
  severity: z.enum(['ok', 'warning', 'error', 'unknown']),
  source: z.string(),
  summary: z.string(),
  evidenceRefs: z.array(z.string()),
  ownerDomain: z.string(),
  observedAt: z.string().nullable()
})

const platformHealthModuleSchema = z.object({
  moduleKey: z.string(),
  label: z.string(),
  domain: z.string(),
  status: z.enum(['healthy', 'degraded', 'blocked', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low', 'unknown']),
  summary: z.string(),
  topIssues: z.array(platformHealthIssueSchema),
  sourceFreshness: z.record(z.string(), z.string().nullable())
})

const platformHealthRecommendedCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  command: z.string().optional(),
  docs: z.string().optional(),
  appliesWhen: z.array(z.string())
})

const platformHealthDegradedSourceSchema = z.object({
  source: z.string(),
  status: z.enum(['ok', 'timeout', 'error', 'unavailable', 'not_configured']),
  observedAt: z.string(),
  summary: z.string()
})

const platformHealthDataSchema = z.object({
  contractVersion: z.literal('platform-health.v1'),
  generatedAt: z.string(),
  environment: z.enum(['development', 'preview', 'staging', 'production', 'unknown']),
  overallStatus: z.enum(['healthy', 'degraded', 'blocked', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low', 'unknown']),
  safeModes: z.object({
    readSafe: z.boolean(),
    writeSafe: z.boolean(),
    deploySafe: z.boolean(),
    backfillSafe: z.boolean(),
    notifySafe: z.boolean(),
    agentAutomationSafe: z.boolean()
  }),
  modules: z.array(platformHealthModuleSchema),
  blockingIssues: z.array(platformHealthIssueSchema),
  warnings: z.array(platformHealthIssueSchema),
  recommendedChecks: z.array(platformHealthRecommendedCheckSchema),
  degradedSources: z.array(platformHealthDegradedSourceSchema)
})

export const greenhouseMcpToolOutputSchema = {
  ok: z.boolean(),
  requestId: z.string().nullable(),
  apiVersion: z.string().nullable(),
  status: z.number(),
  data: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).nullable()
    })
    .optional()
}

const buildToolResponse = (summary: string, result: GreenhouseMcpToolResult) => ({
  content: [
    {
      type: 'text' as const,
      text: summary
    }
  ],
  structuredContent: result,
  isError: result.ok === false
})

const toErrorResult = (error: unknown): GreenhouseMcpErrorResult => {
  if (error instanceof GreenhouseMcpApiError) {
    return {
      ok: false,
      requestId: error.requestId,
      apiVersion: error.apiVersion,
      status: error.status,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected MCP runtime error.'

  return {
    ok: false,
    requestId: null,
    apiVersion: null,
    status: 500,
    error: {
      code: 'internal_error',
      message,
      details: null
    }
  }
}

const validatePlatformHealthResult = (
  result: GreenhouseMcpSuccessResult<unknown>
): GreenhouseMcpSuccessResult<unknown> => {
  const parsed = platformHealthDataSchema.safeParse(result.data)

  if (!parsed.success) {
    throw new GreenhouseMcpApiError('Greenhouse API returned an invalid platform health payload.', {
      status: 502,
      code: 'invalid_platform_health_payload',
      requestId: result.requestId,
      apiVersion: result.apiVersion,
      details: {
        issues: parsed.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }
    })
  }

  return {
    ...result,
    data: parsed.data
  }
}

const callReadTool = async <TData>(
  summary: (result: GreenhouseMcpSuccessResult<TData>) => string,
  action: () => Promise<GreenhouseMcpSuccessResult<TData>>
) => {
  try {
    const result = await action()

    return buildToolResponse(summary(result), result)
  } catch (error) {
    const result = toErrorResult(error)
    const requestFragment = result.requestId ? ` Request ID: ${result.requestId}.` : ''

    return buildToolResponse(
      `Greenhouse API request failed with ${result.status} (${result.error.code}).${requestFragment}`,
      result
    )
  }
}

export const createGreenhouseMcpHandlers = (client: Pick<
  GreenhouseApiPlatformClient,
  | 'getContext'
  | 'listOrganizations'
  | 'getOrganization'
  | 'listCapabilities'
  | 'getIntegrationReadiness'
  | 'getPlatformHealth'
  | 'listEventTypes'
  | 'listWebhookSubscriptions'
  | 'getWebhookSubscription'
  | 'listWebhookDeliveries'
  | 'getWebhookDelivery'
  | 'searchKnowledge'
  | 'getKnowledgeDocument'
  | 'searchServices'
  | 'simulateQuote'
  | 'getSeoKeywordOpportunities'
  | 'getSeoVisibility360'
  | 'getSeoEntitlement'
  | 'getSeoRankEvolution'
  | 'getSeoPerformance'
  | 'getSeoPerformanceCatalog'
  | 'getSeoOverviewKpis'
  | 'getSeoSiteAuditReport'
  | 'getSeoBacklinkProfile'
  | 'trackSeoKeywords'
  | 'untrackSeoKeywords'
  | 'getSeoKeywordMarketData'
  | 'getSeoDomainOverview'
  | 'getSeoUrlVisibility'
  | 'getSeoBacklinkDetail'
  | 'getSeoKeywordDiscovery'
  | 'discoverSeoKeywords'
  | 'getSeoGroundedQueryDraft'
  | 'prepareSeoGroundedQueries'
  | 'getSeoProspectDiagnostic'
  | 'runSeoProspectDiagnostic'
>) => ({
  async getContext() {
    return callReadTool(
      result =>
        `Resolved Greenhouse context for scope ${String((result.meta.scope as { scopeType?: string } | undefined)?.scopeType ?? 'unknown')} (${result.requestId}).`,
      () => client.getContext()
    )
  },
  async listOrganizations(input: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    type?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} organizations from Greenhouse (${result.requestId}).`
      },
      () => client.listOrganizations(input)
    )
  },
  async getOrganization(input: { id: string }) {
    return callReadTool(
      result => {
        const data = result.data as { organizationName?: string; publicId?: string; organizationId?: string }
        const label = data.organizationName ?? data.publicId ?? data.organizationId ?? input.id

        return `Loaded organization ${label} from Greenhouse (${result.requestId}).`
      },
      () => client.getOrganization(input)
    )
  },
  async listCapabilities(input: {
    page?: number
    pageSize?: number
    search?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} capability assignments from Greenhouse (${result.requestId}).`
      },
      () => client.listCapabilities(input)
    )
  },
  async getIntegrationReadiness(input: { keys?: string[] }) {
    return callReadTool(
      result => {
        const data = result.data as { requestedKeys?: string[]; allReady?: boolean }
        const count = Array.isArray(data.requestedKeys) ? data.requestedKeys.length : 0

        return `Loaded readiness for ${count} integration keys; allReady=${String(Boolean(data.allReady))} (${result.requestId}).`
      },
      () => client.getIntegrationReadiness(input)
    )
  },
  async getPlatformHealth() {
    return callReadTool(
      result => {
        const data = result.data as { overallStatus?: string; confidence?: string; degradedSources?: unknown[] }
        const degradedSourceCount = Array.isArray(data.degradedSources) ? data.degradedSources.length : 0

        return `Loaded platform health status=${String(data.overallStatus ?? 'unknown')} confidence=${String(data.confidence ?? 'unknown')} degradedSources=${degradedSourceCount} (${result.requestId}).`
      },
      async () => validatePlatformHealthResult(await client.getPlatformHealth())
    )
  },
  async listEventTypes(input: {
    search?: string
    namespace?: string
    aggregateType?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} event types from Greenhouse (${result.requestId}).`
      },
      () => client.listEventTypes(input)
    )
  },
  async listWebhookSubscriptions(input: {
    page?: number
    pageSize?: number
    active?: boolean
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} webhook subscriptions from Greenhouse (${result.requestId}).`
      },
      () => client.listWebhookSubscriptions(input)
    )
  },
  async getWebhookSubscription(input: { id: string }) {
    return callReadTool(
      result => {
        const data = result.data as { subscriberCode?: string; subscriptionId?: string }
        const label = data.subscriberCode ?? data.subscriptionId ?? input.id

        return `Loaded webhook subscription ${label} from Greenhouse (${result.requestId}).`
      },
      () => client.getWebhookSubscription(input)
    )
  },
  async listWebhookDeliveries(input: {
    page?: number
    pageSize?: number
    status?: string
    eventType?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} webhook deliveries from Greenhouse (${result.requestId}).`
      },
      () => client.listWebhookDeliveries(input)
    )
  },
  async getWebhookDelivery(input: { id: string }) {
    return callReadTool(
      result => {
        const data = result.data as { deliveryId?: string; eventType?: string; status?: string }
        const label = data.deliveryId ?? input.id

        return `Loaded webhook delivery ${label} status=${String(data.status ?? 'unknown')} eventType=${String(data.eventType ?? 'unknown')} from Greenhouse (${result.requestId}).`
      },
      () => client.getWebhookDelivery(input)
    )
  },
  // TASK-1086 — Knowledge (read-only). El packet `knowledge-search.v1` ya trae citas +
  // confidence + freshness; si confidence='none' el agente NO debe inventar un documento.
  async searchKnowledge(input: { query: string; limit?: number }) {
    return callReadTool(
      result => {
        const data = result.data as { confidence?: string; chunks?: unknown[] }
        const chunkCount = Array.isArray(data.chunks) ? data.chunks.length : 0

        return `Knowledge search returned ${chunkCount} chunks (confidence=${String(data.confidence ?? 'unknown')}) (${result.requestId}).`
      },
      () => client.searchKnowledge(input)
    )
  },
  async getKnowledgeDocument(input: { id: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          document?: { title?: string; publicationStatus?: string }
          sections?: unknown[]
        }

        const label = data.document?.title ?? input.id
        const sectionCount = Array.isArray(data.sections) ? data.sections.length : 0

        return `Loaded knowledge document ${label} (status=${String(
          data.document?.publicationStatus ?? 'unknown'
        )}, ${sectionCount} sections) (${result.requestId}).`
      },
      () => client.getKnowledgeDocument(input)
    )
  },
  // TASK-1211 — Cotizador read-only. Estima precio por nombre de servicio. El
  // estimate es referencial, NO vinculante; el cost stack/margen no cruza a scope cliente.
  async searchServices(input: { query?: string; limit?: number }) {
    return callReadTool(
      result => {
        const data = result.data as { total?: number }

        return `Loaded ${Number(data.total ?? 0)} sellable services from Greenhouse (${result.requestId}).`
      },
      () => client.searchServices(input)
    )
  },
  async quotePrice(input: Record<string, unknown>) {
    return callReadTool(
      result => {
        const data = result.data as { service?: { name?: string }; estimate?: { currency?: string } }

        return `Simulated quote estimate for ${String(data.service?.name ?? 'service')} in ${String(
          data.estimate?.currency ?? 'USD'
        )} — referencial, no vinculante (${result.requestId}).`
      },
      () => client.simulateQuote(input)
    )
  },
  // TASK-1645 — Growth SEO (read-only, MCP-first). Los tres tools delegan en el lane
  // ecosystem (entitlement per-org seo_v2 + anti-oracle server-side); cero lógica de
  // dominio acá. Las degradaciones honestas del reader (disabled / target_not_configured /
  // no_seo_data / no_aeo_data) llegan en data.ok=false — el agente NO debe inventar datos.
  async getSeoKeywordOpportunities(input: { organizationId?: string; market?: string; limit?: number }) {
    return callReadTool(
      result => {
        const data = result.data as { ok?: boolean; opportunities?: unknown[]; errorCode?: string }

        if (data.ok === false) {
          return `SEO keyword opportunities unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const count = Array.isArray(data.opportunities) ? data.opportunities.length : 0

        return `Loaded ${count} SEO keyword opportunities (measured GSC striking-distance) (${result.requestId}).`
      },
      () => client.getSeoKeywordOpportunities(input)
    )
  },
  async getSeoKeywordMarketData(input: { organizationId?: string; market?: string; keywords: string[] }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          keywords?: Array<{ found?: boolean }>
          freshness?: { latestCaptureDate?: string | null }
        }

        if (data.ok === false) {
          return `SEO keyword market data unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const rows = Array.isArray(data.keywords) ? data.keywords : []
        const found = rows.filter(row => row.found).length
        const asOf = data.freshness?.latestCaptureDate ?? 'unknown'

        // El as-of viaja SIEMPRE: un volumen sin fecha se lee como vigente para siempre.
        return `Market data (estimated, DataForSEO Labs) for ${found}/${rows.length} keyword(s), as-of ${asOf}. Missing keywords were never queried — do NOT report them as zero (${result.requestId}).`
      },
      () => client.getSeoKeywordMarketData(input)
    )
  },
  async getSeoDomainOverview(input: { organizationId?: string; market?: string; subject?: string; months?: number }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          overview?: {
            subject?: string
            capturedAt?: string
            organicKeywords?: number | null
            organicEtv?: number | null
            history?: unknown[]
          }
        }

        if (data.ok === false) {
          return `SEO domain overview unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const overview = data.overview ?? {}
        const history = Array.isArray(overview.history) ? overview.history.length : 0

        // El as-of viaja SIEMPRE, y la lente es estimada: jamás presentarla como medición GSC.
        return (
          `Domain overview (estimated, DataForSEO Labs) for ${String(overview.subject ?? 'unknown')}: ` +
          `${String(overview.organicKeywords ?? 'unknown')} ranked keywords, estimated traffic volume ` +
          `${String(overview.organicEtv ?? 'unknown')}, ${history} history month(s), as-of ${String(overview.capturedAt ?? 'unknown')}. ` +
          `All figures are market ESTIMATES — never averaged with measured GSC data (${result.requestId}).`
        )
      },
      () => client.getSeoDomainOverview(input)
    )
  },
  async getSeoUrlVisibility(input: {
    organizationId?: string
    market?: string
    subject?: string
    kind?: string
    months?: number
    concentration?: string
    domain?: string
  }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          mode?: string
          visibility?: { subject?: string; kind?: string; totalRankedKeywords?: number | null; capturedAt?: string }
          concentration?: { domain?: string; items?: unknown[]; capturedAt?: string }
        }

        if (data.ok === false) {
          return `SEO URL visibility unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (data.mode === 'concentration') {
          const items = Array.isArray(data.concentration?.items) ? data.concentration.items.length : 0

          return `Traffic concentration (estimated, DataForSEO Labs) for ${String(data.concentration?.domain ?? 'unknown')}: top ${items} subject(s) by estimated traffic, as-of ${String(data.concentration?.capturedAt ?? 'unknown')}. Never mix with measured GSC data (${result.requestId}).`
        }

        const visibility = data.visibility ?? {}

        // El as-of viaja SIEMPRE y la lente es estimada — jamás presentarla como medición GSC.
        return (
          `URL visibility (estimated, DataForSEO Labs) for ${String(visibility.kind ?? '?')} ${String(visibility.subject ?? 'unknown')}: ` +
          `${String(visibility.totalRankedKeywords ?? 'unknown')} ranked keywords in the market snapshot, as-of ${String(visibility.capturedAt ?? 'unknown')}. ` +
          `Positions here are exact-SERP estimates — never average them with GSC measured positions (${result.requestId}).`
        )
      },
      () => client.getSeoUrlVisibility(input)
    )
  },
  async getSeoBacklinkDetail(input: { organizationId?: string; market?: string; captureDate?: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          state?: string
          captureDate?: string
          domains?: unknown[]
          newDomains?: number
          lostDomains?: number
          anchorProfile?: { dominantAnchor?: string | null; dominantShare?: number | null }
        }

        if (data.ok === false) {
          return `SEO backlink detail unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (data.state === 'skipped_no_movement') {
          // Afirmación POSITIVA: el perfil estuvo estable. Jamás reportarlo como "sin datos".
          return `Backlink profile was STABLE for the week of ${String(data.captureDate ?? 'unknown')} — no drill-down was purchased because nothing moved. That is a finding, not missing data (${result.requestId}).`
        }

        if (data.state === 'drilldown_failed') {
          return `Backlink detail drill-down FAILED for the week of ${String(data.captureDate ?? 'unknown')} — we do not know what moved. Report this honestly; never present it as "stable" (${result.requestId}).`
        }

        const domains = Array.isArray(data.domains) ? data.domains.length : 0

        return (
          `Backlink detail for week ${String(data.captureDate ?? 'unknown')}: ${domains} referring domain(s) ` +
          `(${String(data.newDomains ?? 0)} new, ${String(data.lostDomains ?? 0)} lost), dominant anchor ` +
          `"${String(data.anchorProfile?.dominantAnchor ?? 'n/a')}" at ${String(data.anchorProfile?.dominantShare ?? 'n/a')} share (${result.requestId}).`
        )
      },
      () => client.getSeoBacklinkDetail(input)
    )
  },
  async getSeoVisibility360(input: { organizationId?: string; market?: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          domainQuadrant?: string
          quadrants?: unknown[]
          aeoLens?: { overallScore?: number }
        }

        if (data.ok === false) {
          return `Search Visibility 360 unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const count = Array.isArray(data.quadrants) ? data.quadrants.length : 0

        return `Search Visibility 360: domainQuadrant=${String(data.domainQuadrant ?? 'unknown')} aeoScore=${String(
          data.aeoLens?.overallScore ?? 'unknown'
        )} across ${count} keywords (${result.requestId}).`
      },
      () => client.getSeoVisibility360(input)
    )
  },
  async getSeoEntitlement(input: { organizationId?: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          hasModule?: boolean
          tier?: string | null
          allowanceRemaining?: number
          budgetRemainingUsd?: number
        }

        return `SEO entitlement: hasModule=${String(Boolean(data.hasModule))} tier=${String(
          data.tier ?? 'none'
        )} auditsRemaining=${String(data.allowanceRemaining ?? 0)} budgetRemainingUsd=${String(
          data.budgetRemainingUsd ?? 0
        )} (${result.requestId}).`
      },
      () => client.getSeoEntitlement(input)
    )
  },
  // TASK-1303 — la serie temporal de posiciones (pantalla ancla de EPIC-022).
  async getSeoRankEvolution(input: {
    organizationId?: string
    market?: string
    rangeDays?: number
    engine?: string
    device?: string
    keywords?: string[]
  }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          source?: string
          series?: unknown[]
          range?: { from?: string; to?: string; days?: number }
        }

        if (data.ok === false) {
          return `SEO rank evolution unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const count = Array.isArray(data.series) ? data.series.length : 0

        return `Loaded rank evolution for ${count} keywords over ${String(data.range?.days ?? '?')} days (source=${String(
          data.source ?? 'unknown'
        )}) (${result.requestId}).`
      },
      () => client.getSeoRankEvolution(input)
    )
  },
  // TASK-1307 — rendimiento en el tiempo de un SET elegido (pantalla ancla de EPIC-022).
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
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          source?: string
          series?: unknown[]
          standings?: unknown[]
          itemsWithoutData?: string[]
        }

        if (data.ok === false) {
          return `SEO performance unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const seriesCount = Array.isArray(data.series) ? data.series.length : 0
        const missing = Array.isArray(data.itemsWithoutData) ? data.itemsWithoutData.length : 0

        // Los ítems sin dato se NOMBRAN en el resumen: un "cargué 2 series" a secas
        // escondería que se pidieron 4.
        return `Loaded ${seriesCount} performance series (source=${String(data.source ?? 'unknown')}, ${String(
          missing
        )} requested items without data) (${result.requestId}).`
      },
      () => client.getSeoPerformance(input)
    )
  },
  // TASK-1307 — qué keywords/URLs se pueden pedirle a `get_seo_performance`.
  async getSeoPerformanceCatalog(input: {
    organizationId?: string
    market?: string
    mode?: string
    windowDays?: number
    limit?: number
  }) {
    return callReadTool(
      result => {
        const data = result.data as { ok?: boolean; errorCode?: string; items?: unknown[] }

        if (data.ok === false) {
          return `SEO performance catalog unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const count = Array.isArray(data.items) ? data.items.length : 0

        return `Loaded ${count} selectable ${String(input.mode ?? 'keyword')} items (${result.requestId}).`
      },
      () => client.getSeoPerformanceCatalog(input)
    )
  },
  // TASK-1306 — KPIs norte del cockpit Overview (Search Console medido).
  async getSeoOverviewKpis(input: { organizationId?: string; market?: string; rangeDays?: number }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          current?: { clicks?: number; impressions?: number; position?: number | null; ctr?: number | null }
          previous?: unknown
          rangeDays?: number
        }

        if (data.ok === false) {
          return `SEO overview KPIs unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const position = data.current?.position
        // `previous: null` NO es cero: es "no hay ventana anterior con datos". Se dice
        // así para que el consumidor no reporte una caída del 100% inventada.
        const comparison = data.previous ? 'with previous-window comparison' : 'no comparable previous window'

        return `Loaded SEO overview KPIs over ${String(data.rangeDays ?? '?')} days: ${String(
          data.current?.clicks ?? 0
        )} clicks, ${String(data.current?.impressions ?? 0)} impressions, avg position ${
          position === null || position === undefined ? 'n/a' : position.toFixed(1)
        } (${comparison}) (${result.requestId}).`
      },
      () => client.getSeoOverviewKpis(input)
    )
  },
  // TASK-1304 — reporte del site audit técnico (OnPage: health + findings por severidad).
  async getSeoSiteAuditReport(input: { organizationId?: string; market?: string; auditRunId?: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          run?: { status?: string; healthScore?: number | null }
          totals?: { critical?: number; warning?: number; notice?: number }
        }

        if (data.ok === false) {
          return `SEO site audit report unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (data.run?.status === 'running') {
          return `Site audit still running — findings will materialize when the crawl finishes (${result.requestId}).`
        }

        const totals = data.totals ?? {}

        return `Loaded site audit report (status=${String(data.run?.status ?? 'unknown')}, health=${String(
          data.run?.healthScore ?? 'n/a'
        )}, findings: ${String(totals.critical ?? 0)} critical / ${String(totals.warning ?? 0)} warning / ${String(
          totals.notice ?? 0
        )} notice) (${result.requestId}).`
      },
      () => client.getSeoSiteAuditReport(input)
    )
  },
  // TASK-1304 — serie semanal del perfil de enlaces.
  async getSeoBacklinkProfile(input: { organizationId?: string; market?: string; rangeDays?: number }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          points?: unknown[]
          range?: { days?: number }
        }

        if (data.ok === false) {
          return `SEO backlink profile unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const count = Array.isArray(data.points) ? data.points.length : 0

        return `Loaded backlink profile with ${count} weekly snapshots over ${String(
          data.range?.days ?? '?'
        )} days (${result.requestId}).`
      },
      () => client.getSeoBacklinkProfile(input)
    )
  },
  /**
   * TASK-1308 — el único tool SEO que ESCRIBE.
   *
   * El resumen que devuelve enumera el outcome POR keyword a propósito: un agente que sólo
   * viera "ok" reportaría "listo, las seguí todas" cuando el techo rebotó la mitad. Lo que
   * se rechazó tiene que llegar al usuario con esas palabras.
   */
  async trackSeoKeywords(input: {
    organizationId?: string
    keywords: string[]
    intent?: 'target' | 'opportunity'
    intentDeclaredBy?: string
  }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          outcomes?: Array<{ keyword: string; status: string }>
          activeKeywordCount?: number
          capacity?: number
        }

        if (data.ok === false) {
          return `SEO keyword tracking rejected (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const outcomes = Array.isArray(data.outcomes) ? data.outcomes : []
        const count = (status: string) => outcomes.filter(outcome => outcome.status === status).length
        const rejected = count('capacity_exceeded')
        // TASK-1659 — el cambio de intención se enumera aparte: fundirlo en `already_tracked`
        // le diría al agente que no pasó nada, cuando se cerró una membresía y se abrió otra.
        const reclassified = count('intent_changed')

        const parts = [
          `${count('tracked')} newly tracked`,
          `${count('already_tracked')} already tracked`,
          `${reclassified} reclassified (intent changed)`,
          `${rejected} rejected (set at capacity)`,
          `${count('invalid')} invalid`
        ]

        return `SEO keyword tracking: ${parts.join(', ')}. The set now has ${String(
          data.activeKeywordCount ?? '?'
        )}/${String(data.capacity ?? '?')} tracked keywords, each billed per rank-capture cycle${
          rejected > 0 ? ' — report the rejected keywords instead of claiming they were tracked' : ''
        } (${result.requestId}).`
      },
      () => client.trackSeoKeywords(input)
    )
  },
  /**
   * TASK-1308 — el reverso. El resumen dice explícitamente cuántas NO estaban seguidas: un
   * agente que reporte "listo" cuando la mitad ni se seguía estaría describiendo un cambio
   * que no ocurrió.
   */
  async untrackSeoKeywords(input: { organizationId?: string; keywords: string[] }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          outcomes?: Array<{ keyword: string; status: string }>
          activeKeywordCount?: number
          capacity?: number
        }

        if (data.ok === false) {
          return `SEO keyword untracking rejected (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        const outcomes = Array.isArray(data.outcomes) ? data.outcomes : []
        const count = (status: string) => outcomes.filter(outcome => outcome.status === status).length

        return `SEO keyword untracking: ${count('untracked')} stopped, ${count(
          'not_tracked'
        )} were not tracked, ${count('invalid')} invalid. The set now has ${String(
          data.activeKeywordCount ?? '?'
        )}/${String(data.capacity ?? '?')} tracked keywords. Historical measurements are preserved (${
          result.requestId
        }).`
      },
      () => client.untrackSeoKeywords(input)
    )
  },
  /**
   * TASK-1664 — lectura de discovery. El summary declara la lente: candidatos = mercado
   * ESTIMADO (◑); la demanda medida GSC viaja como campo separado, nunca fusionada.
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
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          runs?: unknown[]
          run?: { runId?: string; status?: string } | null
          candidates?: unknown[]
          totalCandidates?: number
          marketAvailability?: string
          marketFreshness?: string | null
        }

        if (data.ok === false) {
          return `SEO keyword discovery unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (data.run) {
          return `SEO keyword discovery run ${String(data.run.runId ?? '?')} [${String(data.run.status ?? '?')}]: ${String(
            data.totalCandidates ?? 0
          )} candidates (market data: ${String(data.marketAvailability ?? 'unavailable')}, as-of ${String(
            data.marketFreshness ?? 'n/a'
          )}). Volumes/difficulty are ESTIMATED market data (◑); measuredGsc is the client's own measured demand (●) — never merge them (${result.requestId}).`
        }

        return `SEO keyword discovery: ${String((data.runs ?? []).length)} run(s) listed. Pass runId to inspect candidates (${result.requestId}).`
      },
      () => client.getSeoKeywordDiscovery(input)
    )
  },
  /**
   * TASK-1664 — el write. El summary reporta runId + costo estimado y deja claro que la
   * corrida es ASYNC: un agente que declare candidatos listos tras el 202 estaría
   * describiendo resultados que aún no existen.
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
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          runId?: string
          deduped?: boolean
          estimatedCostUsd?: number
          providerCalls?: number
          formula?: string
          seeds?: unknown[]
          estimate?: { estimatedCostUsd?: number; providerCalls?: number; formula?: string }
          wouldBeAllowed?: boolean
          blockedReason?: string | null
        }

        if (data.ok === false) {
          return `SEO keyword discovery rejected (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (input.preview === true || data.estimate) {
          return `SEO keyword discovery PREVIEW: ${String(data.seeds?.length ?? 0)} seed(s), estimated USD ${String(
            data.estimate?.estimatedCostUsd ?? 0
          )} across ${String(data.estimate?.providerCalls ?? 0)} provider call(s) [${String(
            data.estimate?.formula ?? ''
          )}]. Allowed: ${String(data.wouldBeAllowed ?? false)}${
            data.blockedReason ? ` (blocked: ${String(data.blockedReason)})` : ''
          }. Nothing was queued or spent (${result.requestId}).`
        }

        return `SEO keyword discovery run ${String(data.runId ?? '?')} queued${
          data.deduped ? ' (deduped: same intent already existed, nothing new will be spent)' : ''
        } — estimated USD ${String(data.estimatedCostUsd ?? 0)} across ${String(
          data.providerCalls ?? 0
        )} provider call(s). The run executes ASYNC in the ops worker; poll get_seo_keyword_discovery with this runId for candidates — do NOT claim results exist yet (${result.requestId}).`
      },
      () => client.discoverSeoKeywords(input)
    )
  },
  /**
   * TASK-1666 — lectura del draft grounded. El summary declara el modo con honestidad: un
   * baseline fallback JAMÁS se reporta como grounded en los candidates.
   */
  async getSeoGroundedQueryDraft(input: { organizationId?: string; market?: string; profileId: string; setId: string }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          setId?: string
          version?: number
          status?: string
          groundingMode?: string
          prompts?: unknown[]
          sourceRefs?: string[]
          fallbackNotice?: string | null
        }

        if (data.ok === false) {
          return `SEO grounded query draft unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        return `Grounded query draft ${String(data.setId ?? '?')} v${String(data.version ?? '?')} [${String(
          data.status ?? '?'
        )}]: ${String(data.prompts?.length ?? 0)} prompts, mode=${String(data.groundingMode ?? '?')}, ${String(
          data.sourceRefs?.length ?? 0
        )} SEO source ref(s).${
          data.fallbackNotice ? ` WARNING: ${String(data.fallbackNotice)}` : ''
        } Approval happens ONLY through the AEO review flow — never claim this draft is active (${result.requestId}).`
      },
      () => client.getSeoGroundedQueryDraft(input)
    )
  },
  /**
   * TASK-1666 — el write del puente. Reporta el draft creado y su modo; nunca lo describe como
   * aprobado/activo ni como medición ya existente.
   */
  async prepareSeoGroundedQueries(input: {
    organizationId?: string
    market?: string
    profileId: string
    seoTargetId: string
    discoveryRunId: string
    candidateIds: string[]
  }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          draft?: { setId?: string; version?: number }
          groundingMode?: string
          candidateCount?: number
          deduped?: boolean
          fallbackNotice?: string | null
          coverageNotice?: string | null
          seedCoverage?: { uncoveredCandidateIds?: string[] } | null
        }

        if (data.ok === false) {
          return `SEO grounded query preparation rejected (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        return `Grounded query DRAFT ${String(data.draft?.setId ?? '?')} v${String(data.draft?.version ?? '?')} created from ${String(
          data.candidateCount ?? 0
        )} candidate(s), mode=${String(data.groundingMode ?? '?')}${data.deduped ? ' (deduped: same context already had a draft, nothing new was authored)' : ''}.${
          data.fallbackNotice ? ` WARNING: ${String(data.fallbackNotice)}` : ''
        }${
          data.coverageNotice
            ? ` COVERAGE WARNING: ${String(data.coverageNotice)} Uncovered: ${String(
                (data.seedCoverage?.uncoveredCandidateIds ?? []).join(', ')
              )}.`
            : ''
        } It is a DRAFT pending human review; approval uses the existing AEO command and this tool never activates anything (${result.requestId}).`
      },
      () => client.prepareSeoGroundedQueries(input)
    )
  },

  // TASK-1709 — diagnóstico de prospecto: lectura + disparo (gasto real, tope duro).
  async getSeoProspectDiagnostic(input: { diagnosticId?: string; rootDomain?: string; limit?: number }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          diagnostic?: { diagnosticId?: string; facts?: unknown[] }
          diagnostics?: unknown[]
        }

        if (data.ok === false) {
          return `SEO prospect diagnostics unavailable (${String(data.errorCode ?? 'unknown')}) (${result.requestId}).`
        }

        if (data.diagnostic) {
          return `Loaded prospect diagnostic ${String(data.diagnostic.diagnosticId ?? '?')} with ${String(
            data.diagnostic.facts?.length ?? 0
          )} fact(s). Every figure is ESTIMATED (provider data, with capturedAt); this diagnostic NEVER asserts a site is healthy (${result.requestId}).`
        }

        return `Loaded ${String(data.diagnostics?.length ?? 0)} prospect diagnostic(s) (${result.requestId}).`
      },
      () => client.getSeoProspectDiagnostic(input)
    )
  },

  async runSeoProspectDiagnostic(input: { rootDomain: string; market: string; competitorDomains?: string[] }) {
    return callReadTool(
      result => {
        const data = result.data as {
          ok?: boolean
          errorCode?: string
          reused?: boolean
          forecastUsd?: number
          diagnostic?: { diagnosticId?: string; facts?: unknown[]; cost?: { actualUsd?: number | null } }
        }

        if (data.ok === false) {
          return `SEO prospect diagnostic rejected (${String(data.errorCode ?? 'unknown')}). No provider call was made and nothing was spent (${result.requestId}).`
        }

        if (data.reused) {
          return `Prospect diagnostic already existed for this domain/market today: returned diagnostic ${String(
            data.diagnostic?.diagnosticId ?? '?'
          )} with USD 0 spent (idempotency) (${result.requestId}).`
        }

        return `Prospect diagnostic ${String(data.diagnostic?.diagnosticId ?? '?')} completed with ${String(
          data.diagnostic?.facts?.length ?? 0
        )} fact(s); actual provider cost USD ${String(data.diagnostic?.cost?.actualUsd ?? '?')}. All figures are ESTIMATED and the diagnostic never asserts site health (${result.requestId}).`
      },
      () => client.runSeoProspectDiagnostic(input)
    )
  }
})
