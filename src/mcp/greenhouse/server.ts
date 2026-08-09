import * as z from 'zod/v4'
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { GreenhouseApiPlatformClient } from './http-client'
import { resolveGreenhouseMcpConfig } from './config'
import { createGreenhouseMcpHandlers, greenhouseMcpToolOutputSchema } from './tools'
import type { GreenhouseMcpConfig } from './types'

export const createGreenhouseMcpServer = (
  config: GreenhouseMcpConfig,
  deps?: { fetch?: typeof fetch }
) => {
  const server = new McpServer(
    {
      name: 'greenhouse-read-only',
      version: '1.0.0'
    },
    {
      instructions:
        'Greenhouse MCP V1 is read-only. It is downstream of api/platform/ecosystem/*, uses a fixed external scope from server configuration, preserves Greenhouse request IDs, and must not be used for writes, SQL access, or tenancy inference from free text.'
    }
  )

  const client = new GreenhouseApiPlatformClient(config, deps?.fetch)
  const handlers = createGreenhouseMcpHandlers(client)

  server.registerTool(
    'get_context',
    {
      title: 'Get Context',
      description: 'Resolve the effective Greenhouse consumer and binding context for the configured external scope.',
      inputSchema: {},
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async () => handlers.getContext()
  )

  server.registerTool(
    'list_organizations',
    {
      title: 'List Organizations',
      description: 'List organizations accessible to the configured Greenhouse scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listOrganizations(args)
  )

  server.registerTool(
    'get_organization',
    {
      title: 'Get Organization',
      description: 'Load one organization by canonical identifier or public ID within the configured scope.',
      inputSchema: {
        id: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getOrganization(args)
  )

  server.registerTool(
    'list_capabilities',
    {
      title: 'List Capabilities',
      description: 'List client capability assignments visible from the configured Greenhouse scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listCapabilities(args)
  )

  server.registerTool(
    'get_integration_readiness',
    {
      title: 'Get Integration Readiness',
      description: 'Read operational readiness for one or more Greenhouse integrations through the ecosystem lane.',
      inputSchema: {
        keys: z.array(z.string().trim().min(1)).max(25).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getIntegrationReadiness(args)
  )

  server.registerTool(
    'get_platform_health',
    {
      title: 'Get Platform Health',
      description:
        'Read the ecosystem-facing platform health snapshot for the configured scope, including overall status, safe modes, degraded sources and recommended checks.',
      inputSchema: {},
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async () => handlers.getPlatformHealth()
  )

  server.registerTool(
    'list_event_types',
    {
      title: 'List Event Types',
      description: 'List event types exposed by the ecosystem-facing webhook control plane.',
      inputSchema: {
        search: z.string().trim().min(1).optional(),
        namespace: z.string().trim().min(1).optional(),
        aggregateType: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listEventTypes(args)
  )

  server.registerTool(
    'list_webhook_subscriptions',
    {
      title: 'List Webhook Subscriptions',
      description: 'List webhook subscriptions owned by the configured consumer and binding scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        active: z.boolean().optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listWebhookSubscriptions(args)
  )

  server.registerTool(
    'get_webhook_subscription',
    {
      title: 'Get Webhook Subscription',
      description: 'Load one webhook subscription detail by subscription ID within the configured scope.',
      inputSchema: {
        id: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getWebhookSubscription(args)
  )

  server.registerTool(
    'list_webhook_deliveries',
    {
      title: 'List Webhook Deliveries',
      description: 'List webhook deliveries owned by the configured consumer and binding scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        status: z.string().trim().min(1).optional(),
        eventType: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listWebhookDeliveries(args)
  )

  server.registerTool(
    'get_webhook_delivery',
    {
      title: 'Get Webhook Delivery',
      description: 'Load one webhook delivery detail by delivery ID within the configured scope.',
      inputSchema: {
        id: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getWebhookDelivery(args)
  )

  // TASK-1086 — Knowledge (read-only). El reader agéntico ya filtra a `agent_allowed`
  // interno y excluye sensibles/cuarentena; si confidence='none' el agente NO debe inventar.
  server.registerTool(
    'search_knowledge',
    {
      title: 'Search Knowledge',
      description:
        'Search the governed Greenhouse knowledge corpus (published, agent-allowed, internal). Returns a citation packet (chunks with citationLabel, humanUrl, freshness, confidence). When confidence is "none", report that no published guidance was found instead of inventing an answer.',
      inputSchema: {
        query: z.string().trim().min(1),
        limit: z.number().int().positive().max(20).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.searchKnowledge(args)
  )

  server.registerTool(
    'get_knowledge_document',
    {
      title: 'Get Knowledge Document',
      description:
        'Load one published, agent-allowed knowledge document by id, with its sections (heading path + citation anchor + body). Documents that are draft, deprecated, agent-excluded, restricted or non-internal are not found.',
      inputSchema: {
        id: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getKnowledgeDocument(args)
  )

  // TASK-1211 — Cotizador (read-only, consultar-first). Resolver de servicios +
  // simulación de precio. El estimate es referencial, NO vinculante; el cost
  // stack/margen no cruza a un scope cliente (redacción server-side en el lane).
  server.registerTool(
    'search_services',
    {
      title: 'Search Services',
      description:
        'List sellable Greenhouse services available for quoting within the configured scope. Returns each service with its serviceSku and name. Use this to resolve a free-text service name before quote_price.',
      inputSchema: {
        query: z.string().trim().min(1).optional(),
        limit: z.number().int().positive().max(50).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.searchServices(args)
  )

  server.registerTool(
    'quote_price',
    {
      title: 'Quote Price',
      description:
        'Simulate a read-only price estimate for a Greenhouse service by its serviceSku (resolve it first with search_services). Returns a REFERENTIAL, non-binding estimate with currency. Cost and margin are never exposed to a client scope. Does not persist anything.',
      inputSchema: {
        serviceSku: z.string().trim().min(1),
        currency: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.quotePrice(args)
  )

  // TASK-1645 — Growth SEO (read-only, mandato MCP-first del operador 2026-08-05).
  // Los tres tools delegan en el lane ecosystem: entitlement per-org `seo_v1` +
  // anti-oracle + resolución de org por binding se aplican SERVER-SIDE. Para bindings
  // internos, `organizationId` es requerido; para bindings org-scoped se omite.
  server.registerTool(
    'get_seo_keyword_opportunities',
    {
      title: 'Get SEO Keyword Opportunities',
      description:
        'List measured striking-distance SEO keyword opportunities for an organization (Google Search Console data: weighted position, impressions, estimated click gain, quick wins, cannibalization). Requires the organization to have the SEO module (seo_v1) assigned. When data.ok is false, report the errorCode (disabled, target_not_configured, no_data) honestly instead of inventing results.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        limit: z.number().int().positive().max(50).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoKeywordOpportunities(args)
  )

  server.registerTool(
    'get_seo_visibility_360',
    {
      title: 'Get Search Visibility 360',
      description:
        'Cross the two search internets for an organization: measured organic rank (GSC) vs AI citability (AEO grader score). Returns a 2x2 quadrant per keyword and for the domain — dominante (ranks + cited), riesgo (ranks but NOT cited by AI: organic authority without citability, cross-sell AEO), oportunidad (cited but not ranking), invisible (neither). The two axes are orthogonal and never averaged. When data.ok is false, report the errorCode (no_seo_data, no_aeo_data, target_not_configured, disabled) honestly — a missing lens is a state, not a zero.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoVisibility360(args)
  )

  server.registerTool(
    'get_seo_entitlement',
    {
      title: 'Get SEO Entitlement',
      description:
        'Read the SEO module entitlement state for an organization: whether seo_v1 is assigned, tier (contracted/trial/pilot), remaining monthly site-audit allowance and remaining provider budget (USD). Use this BEFORE proposing SEO operations to know if the organization is enabled and has quota. hasModule=false means the module is not assigned — do not infer anything else about the organization.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoEntitlement(args)
  )

  // TASK-1303 — rank evolution: la película de posiciones en el tiempo (pantalla ancla).
  server.registerTool(
    'get_seo_rank_evolution',
    {
      title: 'Get SEO Rank Evolution',
      description:
        'Time series of exact organic positions (DataForSEO SERP, market truth: includes SERP features like AI Overview presence) for the tracked keywords of an organization. Returns { series: [{ keyword, points: [{date, position, url}] }] }; position=null on a date means the domain did not rank that day (a valid measurement, not an error). Served from the hot window (~180 days, Postgres) or long history (BigQuery) depending on rangeDays. This series is NEVER averaged with GSC data — they are different sources. When data.ok is false, report the errorCode (disabled, target_not_configured, no_data, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        rangeDays: z.number().int().positive().max(1825).optional(),
        engine: z.string().trim().min(1).optional(),
        device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
        keywords: z.array(z.string().trim().min(1)).max(100).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoRankEvolution(args)
  )

  // TASK-1307 — rendimiento en el tiempo de un SET elegido (la pantalla ancla, por MCP).
  server.registerTool(
    'get_seo_performance',
    {
      title: 'Get SEO Performance Over Time',
      description:
        'Performance over time of a CHOSEN SET of keywords or URLs for an organization: the daily series for the chart plus the standings for the table (current position, 30-day position delta, clicks, impressions, CTR) in a single read. Pass items as the exact keywords (mode=keyword) or page URLs (mode=url) to compare; use get_seo_performance_catalog to discover valid items. SOURCE RULE (never mixed, never averaged): mode=keyword with metric=position is INTENDED to be served from DataForSEO (exact market position, "estimated"), but the reader FALLS BACK to the measured Google Search Console position series when the exact-rank series is younger than the measured one (rank capture recently started); every other combination is served from Search Console ("measured"). The resolved source is returned in data.source and MUST be stated when reporting numbers. POSITION IS INVERTED: a lower number is better, so a NEGATIVE positionDelta30d is an IMPROVEMENT (8 to 3 is -5). A point with value=null means no measurement that day — report it as a gap, NEVER as zero (position zero does not exist and zero clicks would claim "you appeared and nobody clicked"). ctr=null means there were no impressions, which is "not measured", not 0%. positionDelta30d=null means there is nothing to compare against — never invent a change. itemsWithoutData lists requested items with no data at all in the window: name them instead of silently dropping them. When data.ok is false, report the errorCode (disabled, not_connected, no_items, no_data, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        mode: z.enum(['keyword', 'url']).optional(),
        items: z.array(z.string().trim().min(1)).min(1).max(25),
        metric: z.enum(['position', 'clicks', 'impressions', 'ctr']).optional(),
        rangeDays: z.number().int().positive().max(365).optional(),
        device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
        engine: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoPerformance(args)
  )

  // TASK-1307 — catálogo de ítems elegibles (qué se le puede pedir a get_seo_performance).
  server.registerTool(
    'get_seo_performance_catalog',
    {
      title: 'Get SEO Performance Catalog',
      description:
        'List the keywords (mode=keyword) or page URLs (mode=url) that can be compared with get_seo_performance for an organization, ordered by measured impressions. In keyword mode the list is the UNION of two universes: keywords with measured Search Console volume AND keywords tracked by rank capture. tracked=true means the keyword has an exact DataForSEO position series; impressions=0 on a tracked keyword means "no impressions recorded yet", NOT a measurement of zero. Use this before get_seo_performance instead of guessing item strings — items must match exactly. In keyword mode the result may also include data.sets: the NAMED keyword sets the operator configured on the active target (e.g. a brand set) with their exact member keywords — prefer offering these curated groups as comparison presets over inventing groupings. When data.ok is false, report the errorCode (disabled, no_data, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        mode: z.enum(['keyword', 'url']).optional(),
        windowDays: z.number().int().positive().max(365).optional(),
        limit: z.number().int().positive().max(500).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoPerformanceCatalog(args)
  )

  // TASK-1306 — KPIs norte del cockpit Overview (la foto medida del período).
  server.registerTool(
    'get_seo_overview_kpis',
    {
      title: 'Get SEO Overview KPIs',
      description:
        'North-star KPIs of the SEO Overview cockpit for an organization, from MEASURED Google Search Console data (first-party truth, never estimated): clicks, impressions, average position and CTR aggregated over the period, plus the daily series and the equivalent previous window for comparison. Average position is weighted BY IMPRESSIONS (never a flat average of daily positions) and CTR is total clicks over total impressions (never an average of daily ratios). Position semantics are INVERTED: a lower number is better, so a negative delta is an improvement. previous=null means there is no comparable previous window — report it as "no comparison available", never as a 100% change. position/ctr are null when there were no impressions; that is "not measured", never zero. When data.ok is false, report the errorCode (disabled, target_not_configured) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        rangeDays: z.number().int().positive().max(365).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoOverviewKpis(args)
  )

  // TASK-1304 — site audit report: salud técnica del sitio (OnPage async queue+poll).
  server.registerTool(
    'get_seo_site_audit_report',
    {
      title: 'Get SEO Site Audit Report',
      description:
        'Technical site audit report (DataForSEO OnPage crawl) for the SEO target of an organization: sitewide health score (0-100), crawled pages, and findings grouped by severity (critical/warning/notice) with stable issue types (e.g. is_4xx_code, no_description, has_micromarkup_errors). A run with status=running means the crawl is still in progress (a fact, not an error); a succeeded run with zero findings means the site is technically clean. Pass auditRunId to read a specific historical run. When data.ok is false, report the errorCode (disabled, target_not_configured, no_data, run_not_found, query_failed) honestly — never fabricate findings.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        auditRunId: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoSiteAuditReport(args)
  )

  // TASK-1304 — backlink profile: la serie semanal del perfil de enlaces.
  server.registerTool(
    'get_seo_backlink_profile',
    {
      title: 'Get SEO Backlink Profile',
      description:
        'Weekly time series of the backlink profile (DataForSEO Backlinks) for the SEO target of an organization: referring domains, total backlinks, domain rank on a 0-100 scale (comparable to DR/DA), toxic share (0-1 proxy derived from the average spam score of the incoming profile), and new/lost deltas over the provider 30-day window. Points are weekly snapshots; use rangeDays to widen the window (default 365). When data.ok is false, report the errorCode (disabled, target_not_configured, no_data, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        rangeDays: z.number().int().positive().max(1825).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoBacklinkProfile(args)
  )

  // TASK-1308 — el PRIMER tool SEO que ESCRIBE. Los 9 anteriores son lecturas; éste
  // compromete gasto recurrente del proveedor, así que el lane lo acepta sólo desde
  // bindings de scope `internal` y el command aplica techo + entitlement + idempotencia.
  server.registerTool(
    'track_seo_keywords',
    {
      title: 'Track SEO Keywords',
      description:
        'Add keywords to the monitored set of an organization so they enter daily rank tracking. THIS WRITES AND COMMITS RECURRING SPEND: every tracked keyword is billed to the provider on every rank-capture cycle until it is untracked, so propose the exact list to the human and get confirmation BEFORE calling this — never call it speculatively or to "see what happens". Idempotent: a keyword already tracked returns already_tracked and costs nothing. The set has a governed capacity ceiling; keywords beyond it return capacity_exceeded and are NOT tracked — report those back verbatim instead of implying they were added. Read the per-keyword outcomes array (tracked | already_tracked | capacity_exceeded | invalid), never just data.ok. Discover candidates with get_seo_keyword_opportunities first. When data.ok is false, report the errorCode (disabled, target_not_found, target_not_active, no_entitlement, no_keywords, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        keywords: z.array(z.string().trim().min(1)).min(1).max(50)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.trackSeoKeywords(args)
  )

  // TASK-1308 — el reverso del write: lo que hace reversible el compromiso de gasto.
  server.registerTool(
    'untrack_seo_keywords',
    {
      title: 'Untrack SEO Keywords',
      description:
        'Stop tracking keywords for an organization so they leave daily rank tracking and stop consuming provider budget. THIS WRITES. It does NOT delete history: the measurement window is closed, past measurements are preserved, and the keyword can be tracked again later (a new window starts — the days in between are NOT recovered, so do not untrack to "pause" something you intend to resume soon). Idempotent: a keyword that was not tracked returns not_tracked and changes nothing. Read the per-keyword outcomes array (untracked | not_tracked | invalid), never just data.ok — reporting success when half the list was never tracked describes a change that did not happen. Use this to free capacity when the set is full. When data.ok is false, report the errorCode (disabled, target_not_found, no_entitlement, no_keywords, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        keywords: z.array(z.string().trim().min(1)).min(1).max(50)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.untrackSeoKeywords(args)
  )

  // Resource addressable: el mismo documento read-only por URI estable.
  server.registerResource(
    'knowledge_document',
    new ResourceTemplate('greenhouse://knowledge/document/{id}', { list: undefined }),
    {
      title: 'Greenhouse Knowledge Document',
      description: 'A published, agent-allowed knowledge document (read-only) addressable by id.',
      mimeType: 'application/json'
    },
    async (uri, variables) => {
      const id = Array.isArray(variables.id) ? variables.id[0] : variables.id
      const result = await client.getKnowledgeDocument({ id: String(id) })

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(result.data)
          }
        ]
      }
    }
  )

  return server
}

export const runGreenhouseMcpServer = async (
  config: GreenhouseMcpConfig = resolveGreenhouseMcpConfig()
) => {
  const server = createGreenhouseMcpServer(config)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  return server
}
