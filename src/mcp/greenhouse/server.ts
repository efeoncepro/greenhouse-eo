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
  // Los tres tools delegan en el lane ecosystem: entitlement per-org `seo_v2` +
  // anti-oracle + resolución de org por binding se aplican SERVER-SIDE. Para bindings
  // internos, `organizationId` es requerido; para bindings org-scoped se omite.
  server.registerTool(
    'get_seo_keyword_opportunities',
    {
      title: 'Get SEO Keyword Opportunities',
      description:
        'List measured striking-distance SEO keyword opportunities for an organization (Google Search Console data: weighted position, impressions, estimated click gain, quick wins, cannibalization). Requires the organization to have the SEO module (seo_v2) assigned. TASK-1661: searchVolume and difficulty are OPTIONAL enrichment from the DataForSEO Labs monthly snapshot — an ESTIMATE of the wider market, not measured demand for this site. A null value means it was never queried; NEVER report it as zero, and never rank by it as if it were measured. The market field says whether that enrichment is available at all. TASK-1792: every response also declares HOW the estimated click gain was produced and WHAT actually ordered the list, and you must report both — the number alone is not interpretable. ctrCurveSource has four states: org_measured (the CTR curve came from this site\'s own Search Console data at the target position), org_level_reference_shape (the site had enough data to estimate its overall CTR LEVEL but not the per-position curve, so the reference SHAPE was scaled to that level — correct by construction but NOT yet observed in production), unusable (there was not enough sample to estimate a target CTR at all, so no gain could be computed), and fallback (the reference curve was used outright). curveSampleSize carries the impressions and clicks behind that verdict. orderedBy declares the criterion that actually sorted the rows: estimated_click_gain when the ceiling discriminates, or measured_demand (impressions x proximity to page 1, all measured) when it does not — a field with zero variance cannot order anything, and presenting a measured_demand list as if it were ranked by projected gain misreports what the user is looking at. The gain is a CEILING under the assumption that the CTR observed at that position repeats; it is not a forecast that the page will reach that position. When data.ok is false, report the errorCode (disabled, target_not_configured, no_data) honestly instead of inventing results.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        limit: z.number().int().positive().max(50).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoKeywordOpportunities(args)
  )

  // TASK-1661 — lente ◑ ESTIMADA de mercado (Labs), complementaria a la demanda MEDIDA ● de
  // GSC. La description es parte del contrato: le dice al agente que un dato ausente NO es cero
  // y que la cifra siempre viaja con su as-of.
  server.registerTool(
    'get_seo_keyword_market_data',
    {
      title: 'Get SEO Keyword Market Data',
      description:
        'Look up ESTIMATED market data (monthly search volume, organic keyword difficulty 0-100, paid competition, core keyword) for an explicit list of keywords, from the DataForSEO Labs snapshot. This is an ESTIMATE of the wider market refreshed monthly, NOT the measured Search Console demand of this site: never average it with, or substitute it for, get_seo_keyword_opportunities data. The market (country + language) comes from the organization SEO target, because search volume is not global. Every value carries capturedAt/providerLastUpdatedAt: always report the as-of date. A keyword returned with found=false was never queried — report it as unknown, NEVER as zero. Also note competition is PAID competition, and keywordDifficulty is a PURE link-competition metric (90% weighted on URL-level backlinks of the top-10, hard-floored at 0): 0 means entry is not gated by links — an opportunity for a strong domain — NOT that ranking is trivial. Present it as a link-barrier level (low 0-14 / medium 15-49 / high 50+), never as raw difficulty.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        keywords: z.array(z.string().trim().min(1)).min(1).max(100)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoKeywordMarketData(args)
  )

  // TASK-1775 — foto de dominio ◑: la pregunta que abre toda reunión de SEO ("¿cómo estamos
  // contra ellos?" / "¿venimos subiendo o bajando?"), del target O de un competidor.
  server.registerTool(
    'get_seo_domain_overview',
    {
      title: 'Get SEO Domain Overview',
      description:
        'Get the domain-level photo + monthly trajectory of the organization SEO target domain (default) or one of its declared competitors (pass subject=<domain>): total ranked keywords in the top-100, estimated monthly organic traffic volume (etv), estimated USD cost of buying that traffic in Ads, top-100 position distribution, rank momentum, and up to 72 months of history. All figures are market ESTIMATES from the DataForSEO Labs snapshot (lens=estimated, refreshed monthly), NOT measured Search Console data: never average or mix them with GSC series. etv is estimated traffic VOLUME, not dollars and not measured visits. Every figure carries capturedAt — always report the as-of date. When data.ok is false report the errorCode honestly (no_market_data means the subject has no snapshot yet — a state, not a zero). The market (country+language) comes from the organization SEO target; pass market=<ISO-2|location_code> when the organization has more than one.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        subject: z.string().trim().min(3).max(255).optional(),
        months: z.number().int().positive().max(72).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoDomainOverview(args)
  )

  // TASK-1776 — el sujeto PÁGINA: qué ranquea una URL/subcarpeta/subdominio (propio o de un
  // competidor) y qué páginas concentran el tráfico de un host.
  server.registerTool(
    'get_seo_url_visibility',
    {
      title: 'Get SEO URL Visibility',
      description:
        'Get what a specific page, subfolder, subdomain or domain ranks for in the market snapshot (DataForSEO Labs ranked_keywords): total ranked keywords, top-100 position distribution, estimated traffic volume (etv), momentum, and the purchased top-N keyword detail. Pass subject=<value> plus kind=domain|subdomain|subfolder|url (the kind is DECLARED, never inferred; defaults to the organization SEO target domain). Alternative mode: concentration=url|subdomain (optional domain=<host>) returns which pages or subdomains concentrate the estimated traffic of a host. All figures are market ESTIMATES (lens=estimated, monthly refresh) with capturedAt — always report the as-of date, never mix or average with measured GSC data, and a no_market_data answer means the subject has no snapshot yet (a state, not a zero). The market comes from the organization SEO target; pass market=<ISO-2|location_code> when the organization has more than one.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        subject: z.string().trim().min(3).max(512).optional(),
        kind: z.enum(['domain', 'subdomain', 'subfolder', 'url']).optional(),
        months: z.number().int().positive().max(36).optional(),
        concentration: z.enum(['url', 'subdomain']).optional(),
        domain: z.string().trim().min(3).max(255).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoUrlVisibility(args)
  )

  // TASK-1777 — el detalle que hace accionable el snapshot de enlaces: nombres, no conteos.
  server.registerTool(
    'get_seo_backlink_detail',
    {
      title: 'Get SEO Backlink Detail',
      description:
        'Get the actionable backlink detail behind the weekly aggregate snapshot: WHICH referring domains link to the organization SEO target (with rank 0-100 and per-domain spam score), which domains are NEW or LOST in the window (with a sample link and anchor — enough to write a recovery email), the anchor-text profile, and a server-derived anchor over-optimization reading (dominant anchor share + brand/generic/url/exact mix). CRITICAL: the response has THREE distinct states — "available" (detail exists), "skipped_no_movement" (the profile was STABLE that week, so no detail was purchased: report it as a positive finding, NEVER as missing data), and "drilldown_failed" (we tried and do not know what moved: report honestly). The anchor over-optimization metric is SEPARATE from toxic_share (spam-score proxy) — they answer different questions and are never interchangeable. Pass captureDate=YYYY-MM-DD for a specific week; default is the latest evaluated snapshot.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        captureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoBacklinkDetail(args)
  )

  server.registerTool(
    'get_seo_visibility_360',
    {
      title: 'Get Search Visibility 360',
      description:
        'Cross the two search internets for an organization: measured organic rank (GSC) vs AI citability (AEO grader score). Returns a 2x2 quadrant per keyword and for the domain — dominante (ranks + cited), riesgo (ranks but NOT cited by AI: organic authority without citability, cross-sell AEO), oportunidad (cited but not ranking), invisible (neither). The two axes are orthogonal and never averaged. When data.ok is false, report the errorCode (no_seo_data, no_aeo_data, target_not_configured, disabled) honestly — a missing lens is a state, not a zero.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional()
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
        'Read the SEO module entitlement state for an organization: whether seo_v2 is assigned, tier (contracted/trial/pilot), remaining monthly site-audit allowance and remaining provider budget (USD). Use this BEFORE proposing SEO operations to know if the organization is enabled and has quota. hasModule=false means the module is not assigned — do not infer anything else about the organization.',
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
        market: z.string().trim().min(2).max(12).optional(),
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
        market: z.string().trim().min(2).max(12).optional(),
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
        market: z.string().trim().min(2).max(12).optional(),
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
        market: z.string().trim().min(2).max(12).optional(),
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
        market: z.string().trim().min(2).max(12).optional(),
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
        market: z.string().trim().min(2).max(12).optional(),
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
        'Add keywords to the monitored set of an organization so they enter daily rank tracking. THIS WRITES AND COMMITS RECURRING SPEND: every tracked keyword is billed to the provider on every rank-capture cycle until it is untracked, so propose the exact list to the human and get confirmation BEFORE calling this — never call it speculatively or to "see what happens". Idempotent: a keyword already tracked with the same intent returns already_tracked and costs nothing. The set has a governed capacity ceiling; keywords beyond it return capacity_exceeded and are NOT tracked — report those back verbatim instead of implying they were added. Optional intent declares WHY the keyword is in the set: target (a commitment agreed with the client — it may sit at position 60 and that is the distance left, NOT a failure) or opportunity (measured demand being pushed). Omit intent unless a human actually declared one: guessing it fabricates a classification nobody made, and the two are never averaged in reporting. Changing the intent of an already-tracked keyword closes the current membership and opens a new one (outcome intent_changed) — it consumes no capacity and preserves the history of when it became a target. Read the per-keyword outcomes array (tracked | already_tracked | intent_changed | capacity_exceeded | invalid), never just data.ok. Discover candidates with get_seo_keyword_opportunities first. When data.ok is false, report the errorCode (disabled, target_not_found, target_not_active, no_entitlement, no_keywords, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        keywords: z.array(z.string().trim().min(1)).min(1).max(50),
        intent: z.enum(['target', 'opportunity']).optional(),
        intentDeclaredBy: z.string().trim().min(1).optional()
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

  // TASK-1662 — competidores declarados: el gap competitivo parte de acá.
  server.registerTool(
    'declare_seo_competitors',
    {
      title: 'Declare SEO Competitors',
      description:
        'Declare competitor domains for an organization so they enter the competitor keyword-gap coverage cycle. THIS WRITES AND COMMITS RECURRING SPEND: every active competitor is billed to the provider on every coverage cycle (once the coverage flag is ON) until it is retired, so propose the exact domains to the human and get confirmation BEFORE calling this — a competitor is a DECLARED classification with a human author, never an inference, and a wrongly chosen competitor invalidates every downstream gap analysis. If the candidates came from a machine proposal (SERP top-N, prospect diagnostic), pass proposalRef with the opaque evidence reference; leave it out for direct declarations. Idempotent: an already-declared domain returns already_declared and costs nothing. There is a governed per-target ceiling; domains beyond it return capacity_exceeded and are NOT declared — report those back verbatim. Read the per-domain outcomes array (declared | already_declared | capacity_exceeded | invalid), never just data.ok. When data.ok is false, report the errorCode (disabled, target_not_found, target_not_active, no_entitlement, no_domains, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        domains: z.array(z.string().trim().min(1)).min(1).max(10),
        proposalRef: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.declareSeoCompetitors(args)
  )

  // TASK-1662 — el reverso del write: lo que hace reversible el gasto de cobertura.
  server.registerTool(
    'retire_seo_competitors',
    {
      title: 'Retire SEO Competitors',
      description:
        'Retire declared competitor domains for an organization so they leave the keyword-gap coverage cycle and stop consuming provider budget. THIS WRITES. It does NOT delete history: the validity window is closed with the retiring actor recorded, captured coverage is preserved, and the same domain can be declared again later (a new window starts). Idempotent: a domain that was not declared returns not_declared and changes nothing. Pass an optional reason for the audit trail. Read the per-domain outcomes array (retired | not_declared | invalid), never just data.ok. When data.ok is false, report the errorCode (disabled, target_not_found, no_entitlement, no_domains, query_failed) honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        domains: z.array(z.string().trim().min(1)).min(1).max(10),
        reason: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.retireSeoCompetitors(args)
  )

  // TASK-1662 — lectura del gap competitivo derivado.
  server.registerTool(
    'get_seo_keyword_gap',
    {
      title: 'Get SEO Keyword Gap',
      description:
        'Read the competitor keyword gap for an organization: keywords a DECLARED competitor ranks for, derived at read time from dated coverage inputs (ESTIMATED provider lens, ◑). The contract separates three things that must never be merged: content_gap (client absent from the provider SERP — new-content opportunity), ranks_worse (client ranks but below the competitor — optimization, already covered by the opportunities surface), and declaredTargets (keywords a human declared as client commitments — report them as commitments in progress with their declaration date, NEVER as new findings). Keywords with measured GSC impressions in the window are EXCLUDED by design (the measured lens wins; their count travels in excluded.measuredInGsc). Every row carries factors with provenance (estimated volume, cpcUsd, link barrier, SERP features, attainable position band) and a missing factor is declared sin_dato/null — never zero, never "low". 🔴 THIS READER DOES NOT RANK: rows come in neutral alphabetical order; do not present them as a priority list or coin a score — prioritization is owned by the SEO work queue. Coverage may be no_coverage (competitor declared but never captured) or stale — say so honestly. Optional seoCompetitorId narrows to one competitor; market (ISO-2 or location_code) for multi-market organizations.',
      inputSchema: {
        organizationId: z.string().trim().min(1),
        market: z.string().trim().min(1).optional(),
        seoCompetitorId: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(1000).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoKeywordGap(args)
  )

  // TASK-1700 — la cola priorizada de trabajo: la ÚNICA autoridad de orden del módulo.
  server.registerTool(
    'get_seo_work_queue',
    {
      title: 'Get SEO Work Queue',
      description:
        'Read the prioritized SEO work queue for an organization: the SINGLE source of ordering for the module, served from an immutable append-only snapshot. Each item carries an origin (gsc_striking_distance, discovery_candidate, declared_target, aeo_gap, competitor_gap, consolidation), a recommended verb (optimize, create, consolidate, measure) and a score BAND. 🔴 The score is estimated INCREMENTAL CLICKS over MEASURED demand — Search Console impressions × the gap between the CTR expected at the target position and the current CTR, using a CTR curve derived from the client\'s own site. It is a CEILING, never a forecast: it assumes the CTR observed at that position repeats, it does NOT say the page will get there. 🔴 THE BANDS ARE NOT COMPARABLE BY NUMBER AND NEVER AVERAGE: band 1 has measured demand and a usable curve (priorityScore in clicks); band 2 has measured demand but the site\'s own CTR curve lacks the sample to estimate a target CTR (priorityScore NULL, ordered by impressions); band 3 has NO measured demand at all (priorityScore NULL, verb "measure", ordered alphabetically). A null priorityScore is NOT zero — it means the queue refuses to fabricate a number, and reporting it as 0 inverts the meaning. Estimated provider search volume is NEVER used to order anything. Always report staleness (fresh | stale | absent) and originHealth: a degraded or down origin means work is MISSING from the list, not that there is none. Filter with origin (repeatable) and paginate with cursor — the keyset is stable because the snapshot is immutable. Internal Efeonce use only.',
      inputSchema: {
        organizationId: z.string().trim().min(1),
        market: z.string().trim().min(1).optional(),
        origin: z.array(z.string().trim().min(1)).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoWorkQueue(args)
  )

  // TASK-1699 — el top-N del SERP ya pagado + descubrimiento de competidores (lecturas).
  server.registerTool(
    'get_seo_serp_top_results',
    {
      title: 'Get SEO SERP Top Results',
      description:
        'Read the persisted top-N of the SERP for the tracked keywords of an organization: every dated SERP slot (rank_absolute) with its item type (organic, ai_overview, people_also_ask, video, local_pack, …), domain, URL and title — the ~20 rows per keyword the daily rank capture already PAYS for and used to discard. Marginal cost zero: this reads a persisted series, it never calls the provider. The slot key is rank_absolute (rank_group repeats across blocks and is also included). The series starts the day the persistence flag went live — earlier days do not exist and CANNOT be backfilled (yesterday’s SERP cannot be re-bought), so absence of old dates is structural, not an error. This is COMPETITIVE data about who ranks in the client’s intent: Efeonce internal use only, never client-facing. Filters: keyword, from/to (YYYY-MM-DD), limit (max 1000; hasMore declares truncation). market for multi-market organizations.',
      inputSchema: {
        organizationId: z.string().trim().min(1),
        market: z.string().trim().min(1).optional(),
        keyword: z.string().trim().min(1).optional(),
        from: z.string().trim().min(1).optional(),
        to: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(1000).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoSerpTopResults(args)
  )

  server.registerTool(
    'get_seo_competitor_candidates',
    {
      title: 'Get SEO Competitor Candidates',
      description:
        'Discover competitor CANDIDATES for an organization by measured recurrence in the persisted SERP top-N: domains that appear organically in at least N distinct keywords across at least M distinct days (versioned thresholds, defaults 3 keywords / 5 days over a 30-day window), excluding the client’s own domain and non-organic blocks (a domain cited in PAA is not an organic competitor). Each candidate carries its evidence (keywordsCount, daysCount, medianPosition, bestPosition, lastSeen), whether it is alreadyDeclared, and a suggested proposalRef. 🔴 THIS IS THE PROPOSE STEP OF A GOVERNED LOOP: a domain in the top-N is an observation; "X is a competitor" is a human classification that commits recurring coverage spend (TASK-1662). Present candidates with their evidence to the human and ONLY after explicit confirmation call declare_seo_competitors passing the candidate’s proposalRef verbatim — never declare on your own initiative. Platform domains (marketplaces, Wikipedia, YouTube) are NOT filtered in V1 by design: report them with their evidence instead of hiding them. An empty list while the series is young (<5 capture days) is expected, not an error.',
      inputSchema: {
        organizationId: z.string().trim().min(1),
        market: z.string().trim().min(1).optional(),
        windowDays: z.number().int().min(1).max(120).optional(),
        minKeywords: z.number().int().min(1).max(50).optional(),
        minDays: z.number().int().min(1).max(60).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoCompetitorCandidates(args)
  )

  // TASK-1664 — keyword discovery: lectura de corridas/candidatos.
  server.registerTool(
    'get_seo_keyword_discovery',
    {
      title: 'Get SEO Keyword Discovery',
      description:
        'Read keyword-discovery runs and their candidates for an organization. Without runId it lists recent runs (with status: pending | running | succeeded | partial | no_results | failed | budget_blocked); with runId it returns the composed candidates. A CANDIDATE IS ONE NORMALIZED KEYWORD, not one provenance row: when several methods found the same keyword it is ONE candidate whose candidateIds/provenance list every source, and totalCandidates counts distinct keywords — never treat a provenance entry as its own candidate, and never propose spending on the same keyword twice. clusterConflict warns about cannibalization: status=conflict means another keyword the target ALREADY tracks shares this candidate coreKeyword (trackedMembers names up to 5 of them), so the sound move is to consolidate rather than add a second bet on the same intent; it is SEPARATE from alreadyTracked (exact match) and status=unknown honestly means it could not be determined — never read it as clear. Candidate volumes/difficulty/intent are ESTIMATED market data from the provider (monthly refresh, ◑); measuredGsc carries the measured demand of the client itself (●) as a SEPARATE lens — never merge or average them, and never present competition (paid) as difficulty (organic). A candidate is a suggestion, NOT a tracked keyword: promoting one to tracking is a separate explicit command (track_seo_keywords) with its own recurring-spend disclosure. Accepts optional market (ISO-2 or location_code) for multi-market organizations. Filters: status, sourceEndpoint, query, intent, minSearchVolume, maxLinkBarrier, includeUnknownBarrier, excludeTracked, limit (max 200), cursor. To filter by difficulty use maxLinkBarrier — maxDifficulty is DEPRECATED and ignored, and any ignored filter is reported back in ignoredFilters.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(1).optional(),
        runId: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
        sourceEndpoint: z.string().trim().min(1).optional(),
        query: z.string().trim().min(1).optional(),
        intent: z.string().trim().min(1).optional(),
        minSearchVolume: z.number().int().min(0).optional(),
        maxDifficulty: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe(
            'DEPRECATED — accepted but IGNORED, use maxLinkBarrier. The provider keyword_difficulty has a hard floor in its formula and collapses to 0 on es-LATAM SERPs, so filtering by it hands back high-barrier keywords to a caller who asked for easy ones. Sending it is never an error: the response declares it in ignoredFilters.'
          ),
        maxLinkBarrier: z
          .enum(['low', 'medium', 'high'])
          .optional()
          .describe(
            'Canonical difficulty filter: maximum LINK BARRIER, derived from the real backlink profile of the top-10 (referring-domain diversity + page rank). Candidates whose barrier was never measured do NOT pass unless includeUnknownBarrier is true — "no data" is not "low".'
          ),
        includeUnknownBarrier: z
          .boolean()
          .optional()
          .describe('Include candidates with no measured link barrier when filtering by maxLinkBarrier. Default false.'),
        excludeTracked: z.boolean().optional().describe('Exclude candidates the target already tracks (actionable-only review).'),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoKeywordDiscovery(args)
  )

  // TASK-1664 — el write de discovery: encolar una corrida que GASTA presupuesto DataForSEO.
  server.registerTool(
    'discover_seo_keywords',
    {
      title: 'Discover SEO Keywords',
      description:
        'Queue a keyword-discovery run: expands up to 10 seeds via DataForSEO Labs (keyword_suggestions | related_keywords | keyword_ideas | keywords_for_site) and enriches candidates with market data. THIS WRITES AND SPENDS PROVIDER BUDGET (each Live call and each returned row is billed), so ALWAYS call it first with preview: true, show the human the estimated cost formula and get explicit confirmation BEFORE queueing — never queue speculatively. The run executes ASYNC in the ops worker: the 202 response only means it was durably queued; poll get_seo_keyword_discovery with the returned runId for candidates, and never claim results exist right after queueing. Idempotent within the provider monthly refresh cycle: the same intent (org + target + seeds + market + methods + actor) returns the existing run of the CURRENT month without spending again; a new month allows a fresh run (market metrics refresh monthly). seedSource: manual (provide manualSeeds) | gsc_queries (top measured queries, no provider cost to resolve) | tracked_keywords | target_domain (keywords_for_site only) | mixed. Queueing NEVER auto-tracks: candidates enter the monitored set only through track_seo_keywords after human review. When data.ok is false, report the errorCode honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(1).optional(),
        seedSource: z.enum(['manual', 'gsc_queries', 'tracked_keywords', 'target_domain', 'mixed']),
        manualSeeds: z.array(z.string().trim().min(1)).max(10).optional(),
        mixedMeasuredSource: z.enum(['gsc_queries', 'tracked_keywords']).optional(),
        methods: z
          .array(z.enum(['keyword_suggestions', 'related_keywords', 'keyword_ideas', 'keywords_for_site']))
          .max(4)
          .optional(),
        idempotencyKey: z.string().trim().min(1).optional(),
        preview: z.boolean().optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.discoverSeoKeywords({ ...args, methods: args.methods ?? [] })
  )

  // TASK-1666 — lectura del draft grounded (prompts AEO con provenance SEO).
  server.registerTool(
    'get_seo_grounded_query_draft',
    {
      title: 'Get SEO Grounded Query Draft',
      description:
        'Read an AEO grounded-query DRAFT created from SEO keyword-discovery candidates, with its provenance (opaque seo.discovery.* source refs and per-prompt groundingRef). groundingMode tells the truth: grounded_llm means the questions were authored WITH the SEO context; baseline_fallback means a generic archetype baseline was used and the questions are NOT candidate-specific — always surface the fallbackNotice when present. A draft is NEVER active: approval happens only through the existing AEO review flow. When data.ok is false, report the errorCode honestly.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        profileId: z.string().trim().min(1),
        setId: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoGroundedQueryDraft(args)
  )

  // TASK-1666 — el write del puente SEO → AEO: crea un DRAFT, jamás activa ni ejecuta.
  server.registerTool(
    'prepare_seo_grounded_queries',
    {
      title: 'Prepare SEO Grounded Queries',
      description:
        'Create an AEO grounded-query DRAFT from up to 20 selected keyword-discovery candidates. THIS WRITES a draft prompt set (it never approves, never activates, never runs the grader — a keyword is research context, not a measured prompt). Propose the exact candidate selection to the human and get confirmation BEFORE calling. Idempotent per context: repeating the same selection returns the existing draft without a second authoring call. The response says groundingMode honestly (grounded_llm vs baseline_fallback + mandatory warning). NOTE: with the shared machine identity this command is FAIL-CLOSED (aeo_forbidden) until per-user client grants exist (TASK-1631) — report that state honestly instead of retrying.',
      inputSchema: {
        organizationId: z.string().trim().min(1).optional(),
        market: z.string().trim().min(2).max(12).optional(),
        profileId: z.string().trim().min(1),
        seoTargetId: z.string().trim().min(1),
        discoveryRunId: z.string().trim().min(1),
        candidateIds: z.array(z.string().trim().min(1)).min(1).max(20)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.prepareSeoGroundedQueries(args)
  )

  // TASK-1709 — diagnóstico de prospecto (lectura + disparo). Sólo bindings `internal`.
  server.registerTool(
    'get_seo_prospect_diagnostic',
    {
      title: 'Get SEO Prospect Diagnostic',
      description:
        'Read SEO prospect diagnostics (a one-shot, provider-only diagnostic of a domain WITHOUT client access). Pass diagnosticId for full facts, or rootDomain/limit to list. Every figure is ESTIMATED (external provider, with capturedAt) — always report the lens and the as-of date, NEVER present a figure as measured, and NEVER assert the site is healthy: the diagnostic enumerates quantified loss, it does not certify health.',
      inputSchema: {
        diagnosticId: z.string().trim().min(1).optional(),
        rootDomain: z.string().trim().min(4).optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getSeoProspectDiagnostic(args)
  )

  server.registerTool(
    'run_seo_prospect_diagnostic',
    {
      title: 'Run SEO Prospect Diagnostic',
      description:
        'Run a ONE-SHOT SEO diagnostic of a prospect domain (no client access needed). THIS SPENDS REAL MONEY (~USD 0.25 per run, hard per-diagnostic ceiling + daily per-actor cap enforced server-side). Propose the exact domain and market to the human and get explicit confirmation BEFORE calling — never trigger this on your own initiative. Idempotent per domain/market/day: repeating the same subject the same day returns the existing diagnostic with USD 0 spent. There is NO recurring capture on prospects: re-running another day is a new human decision that passes every ceiling again.',
      inputSchema: {
        rootDomain: z.string().trim().min(4),
        market: z.string().trim().min(2).max(2),
        competitorDomains: z.array(z.string().trim().min(4)).max(5).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.runSeoProspectDiagnostic(args)
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
