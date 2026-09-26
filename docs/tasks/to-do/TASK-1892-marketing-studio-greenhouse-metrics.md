# TASK-1892 — Marketing Studio: métricas de marketing desde Greenhouse

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop (lecturas ecosystem, consumer, docs) · efeonce-marketing-studio main (adapter, mapeo, reader, API, manifiesto); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Studio empieza a mostrar cómo le va a cada campaña con las métricas que Greenhouse ya posee: Search Console,
GA4 y la visibilidad SEO (Search Visibility 360). Las consume como plataforma hermana por el lane
`/api/platform/ecosystem/growth/*`, con un token de consumer y un binding por organización, **nunca** con SQL
contra la base de Greenhouse. Studio persiste qué UTM, landings y ventana corresponden a cada campaña, las lee con
un adapter tolerante a fallas (métrica ausente ≠ cero), y expone `GET /api/v1/campaigns/{id}/metrics` con su tool
`studio.campaign.metrics.get` en el manifiesto. El panel visible es `TASK-1895`.

## Why This Task Exists

Studio es hoy el registro de lo que se planificó y se produjo (piezas, copys, anuncios, plan de medios, posts),
pero no dice nada de lo que pasó después. Esa medición ya existe en Greenhouse y tiene dueño:

- Search Console se materializa por organización en la serie propia `greenhouse_growth.seo_gsc_daily`
  (TASK-1302) y se sirve por el lane ecosystem SEO (`performance`, `performance-catalog`, `overview-kpis`,
  `url-visibility`, `visibility-360`), gateado por el entitlement per-org `seo_v2` con 404 anti-oráculo.
- GA4 tiene reader gobernado por organización (`readGa4Analytics`, TASK-1284), pero **ninguna** ruta del lane
  ecosystem lo expone, el reader no conoce la dimensión de campaña (`sessionCampaignName`) y su rollout sigue
  pendiente (migración en `docs/tasks/pending-migrations/TASK-1284-ga4-connections.sql.pending`,
  `GROWTH_GA4_ENABLED` OFF).
- Los readers SEO trabajan con ventanas relativas (`rangeDays`) y no con la ventana fija de un flight de campaña.

Si Studio leyera la base de Greenhouse, duplicaría autoridad (entitlements, anti-oráculo, mercado declarado) y
rompería la frontera del ADR API-first. Si cada consumer recalculara las métricas, la posición ponderada o el CTR
divergirían entre Greenhouse, Studio y el MCP. La regla es una sola lectura canónica y muchos consumers.

## Goal

- Studio muestra por campaña las métricas de Search Console (por landing), GA4 (por `utm_campaign` y landing) y
  visibilidad SEO (por landing) leídas del lane ecosystem de Greenhouse con un consumer propio y bindings por
  organización.
- Greenhouse expone por el lane ecosystem lo que falta, con Full API Parity: la lectura GA4 de campaña y la
  ventana fija de fechas sobre la lectura SEO por URL.
- Una métrica que no se pudo leer se declara como ausente con su causa; nunca se muestra como cero ni se suma con
  otra fuente.
- La capacidad nace con su entrada en el manifiesto de tools de Studio (`studio.campaign.metrics.get`), lista para
  que `TASK-1891` la federe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (Studio como producto API-first; Greenhouse sólo por contrato)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§0 dónde vive cada cosa, §2 topología)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane `ecosystem`, `sister_platform_consumers` + `sister_platform_bindings`, request logs)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` y la spec SEO/Search Visibility 360 vigente de EPIC-022 [verificar path exacto en Discovery]
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (toda lectura ecosystem nueva tiene tool o exclusión razonada en el manifiesto de Greenhouse, TASK-1780)

Reglas obligatorias:

- Studio lee Greenhouse **sólo** por `/api/platform/ecosystem/growth/*` con `x-greenhouse-sister-platform-key` (o `Authorization: Bearer`) + `externalScopeType` + `externalScopeId`. **Nunca** conexión a `greenhouse_app` ni a ningún schema de Greenhouse, aunque ambos vivan en la misma instancia Cloud SQL.
- Greenhouse decide la autoridad: el binding resuelve la organización y un `organizationId` enviado por Studio nunca amplía ese alcance (404 anti-oráculo del lane, igual que el lane SEO).
- Una lectura nueva en Greenhouse es un passthrough de un reader canónico en `src/lib/growth/**`. Nunca lógica de negocio en el route handler ni un reader paralelo "para Studio".
- Métrica ausente ≠ cero: `null` significa "no se pudo leer o no existe", con causa explícita por fuente.
- Nunca sumar métricas de fuentes distintas (clics de Search Console + sesiones de GA4) ni mezclarlas con presupuesto (propuesto, aprobado y real tampoco se suman entre sí).
- Search Console mide tráfico orgánico a la landing: es contexto de la landing, **nunca** resultado atribuido a la campaña. Sólo GA4 filtrado por `utm_campaign` se puede describir como tráfico de la campaña.
- Copy literal: nombres de campaña, UTM y URLs se muestran tal cual vienen; sin normalizar texto visible.

## Normative Docs

- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (runtime, Vercel `prj_dztLezZkYxAJikDuPSdT9QROEJRS`, base `marketing_studio`)
- `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`
- `docs/tasks/complete/TASK-1890-marketing-studio-agent-ready-contract.md` (manifiesto, semántica, bearer de servicio, organización canónica)
- `docs/tasks/to-do/TASK-1284-growth-ga4-multitenant-connection-signal.md` (dueña de la conexión GA4 y de `readGa4Analytics`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (filas `GROWTH_GA4_ENABLED`, `GROWTH_SEO_ENABLED`, `GROWTH_SEARCH_CONSOLE_ENABLED`)
- Skill `mcp-craft` para la descripción de la tool; `greenhouse-secret-hygiene` para el token del consumer.

## Dependencies & Impact

### Depends on

- `TASK-1890`: organización canónica de Greenhouse en `studio.campaign.organization_id` (EO-ORG-0007 → `org-2df565fb-98aa-42f7-b324-ea9a2209017f`), manifiesto de tools con guard de paridad y semántica por campo. Sin el id canónico no hay binding por organización.
- Lane ecosystem SEO en producción (TASK-1306/1307/1645) con `GROWTH_SEO_ENABLED` ON en Vercel y ops-worker.
- Entitlement `seo_v2` vigente para la organización de cada campaña [verificar para Efeonce `org-2df565fb-98aa-42f7-b324-ea9a2209017f`; el canary del 2026-08-06 respondió `entitlement ok` con `no_seo_data`].
- `TASK-1284` (dependencia **blanda**): la fuente GA4 sólo entrega datos cuando la conexión GA4 esté en producción (migración aplicada, `GROWTH_GA4_ENABLED` ON, propiedad conectada). Esta task no la bloquea: GA4 degrada a `not_connected`/`disabled` hasta entonces.

### Blocks / Impacts

- `TASK-1895` (panel de métricas visible) consume `GET /api/v1/campaigns/{id}/metrics`.
- `TASK-1891` federa `studio.campaign.metrics.get` desde el manifiesto; si 1891 ya cerró, el guard bidireccional del gateway exige sincronizar el artefacto.
- `TASK-1284`: esta task extiende `readGa4Analytics` (dimensión de campaña y filtro). Coordinar con quien la tenga en curso para no pisar su superficie.
- Follow-ups de adapters propios de Studio para pauta (Meta Ads, LinkedIn Ads) y social orgánico (Metricool).

### Files owned

- Greenhouse:
  - `src/lib/growth/analytics-ga4/reader.ts` (extensión aditiva: dimensión `sessionCampaignName`, filtro por campaña, métrica de eventos clave [verificar nombre en Data API])
  - `src/lib/growth/analytics-ga4/campaign-performance.ts` (reader nuevo de rendimiento de campaña sobre `readGa4Analytics`)
  - `src/lib/api-platform/resources/ecosystem-growth-analytics.ts` (payload del lane)
  - `src/app/api/platform/ecosystem/growth/analytics/campaign-performance/route.ts`
  - `src/lib/growth/seo/performance/read-performance.ts` y `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (ventana fija `startDate`/`endDate`, aditiva)
  - `src/mcp/greenhouse/tool-manifest.ts` + `src/mcp/greenhouse/tool-manifest.generated.json`
  - `scripts/marketing-studio/provision-ecosystem-consumer.ts`
  - `docs/architecture/marketing-studio/**`, `docs/operations/marketing-studio/**`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila nueva)
- Repo Studio (`/Users/jreye/Documents/efeonce-marketing-studio`):
  - `packages/database/migrations/*campaign-metrics-mapping*`
  - `packages/domain/src/metrics/**` (adapter Greenhouse, caché, mapeo, reader)
  - `packages/contracts/src/metrics.ts`, `packages/contracts/src/openapi.ts`, `packages/contracts/src/tool-manifest.ts`, `packages/contracts/generated/**`
  - `apps/web/src/app/api/v1/campaigns/[campaignId]/metrics/route.ts` [verificar nombre del segmento dinámico vigente]
  - `apps/web/src/server/runtime.ts` (configuración del adapter)
  - `scripts/metrics-mapping.ts`

## Current Repo State

### Already exists

- Lane ecosystem SEO con 27 rutas en `src/app/api/platform/ecosystem/growth/seo/**`, todas vía `runEcosystemReadRoute` + resolución de sujeto `resolveSeoLaneSubject` (binding org-scoped manda; binding `internal` exige `organizationId`; `seo_v2` o 404) en `src/lib/api-platform/resources/ecosystem-growth-seo.ts`.
- `GET .../seo/performance` (`mode=url|keyword`, `metric`, `items`, `rangeDays`, `device`, `engine`) sobre `readSeoPerformance`, que lee `greenhouse_growth.seo_gsc_daily`; `GET .../seo/url-visibility` (`subject`, `kind=url`) y `GET .../seo/overview-kpis` (`rangeDays`).
- `readGa4Analytics(organizationId, { startDate, endDate, dimensions, metrics, landingPrefix })` en `src/lib/growth/analytics-ga4/reader.ts`, con degradación honesta (`disabled | not_connected | token_unhealthy | query_failed`). Dimensiones actuales: `date`, `yearMonth`, `landingPagePlusQueryString`, `sessionDefaultChannelGroup`, `sessionSourceMedium`, `country`, `deviceCategory`. Métricas: `sessions`, `engagedSessions`, `averageSessionDuration`, `userEngagementDuration`, `totalUsers`.
- Consumers y bindings de plataformas hermanas: `src/lib/sister-platforms/consumers.ts` (`createSisterPlatformConsumer`, token `ghspk_*` guardado como sha256) y `src/lib/sister-platforms/bindings.ts` (`createSisterPlatformBinding`, scopes `organization|client|space|internal`).
- Manifiesto de tools de Greenhouse con artefacto hash-verificado (`src/mcp/greenhouse/tool-manifest.ts`, `pnpm mcp:manifest:check` dentro de `pnpm local:check`).
- Studio: `studio.ad_configuration.destination_url` + `utm jsonb`, `studio.campaign.destination_url`, `studio.media_flight.starts_on/ends_on` (fuente para derivar el mapeo); readers en `packages/domain/src/readers/`, API `/api/v1` con OpenAPI en `packages/contracts`.

### Gap

- Ninguna ruta ecosystem expone GA4; el reader GA4 no filtra ni agrupa por campaña.
- Las lecturas SEO por URL no aceptan una ventana fija de fechas (sólo `rangeDays` relativo a hoy).
- Studio no tiene consumer ni bindings en Greenhouse, ni secreto del token.
- Studio no guarda qué UTM, landings y ventana medir por campaña.
- No hay adapter, caché, reader, ruta `/api/v1/campaigns/{id}/metrics` ni tool `studio.campaign.metrics.get`.
- Search Console y GA4 de la organización Efeonce pueden no estar conectados o sin datos [verificar en Discovery con el lane `entitlement` y un `performance` real].

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse: src/lib/growth/analytics-ga4/** y src/lib/growth/seo/performance/** + lane src/app/api/platform/ecosystem/growth/** (Vercel greenhouse-eo). Studio: packages/domain/src/metrics/**, packages/contracts, apps/web/src/app/api/v1/** (Vercel de Studio)`
- Future candidate home: `api`
- Boundary: `Greenhouse es dueño de las métricas y las publica sólo como readers canónicos detrás del lane ecosystem; Studio las consume únicamente por su adapter de packages/domain, y web, CLI y MCP de Studio leen el mismo reader getCampaignMetrics`
- Server/browser split: `token del consumer, adapter, caché y mapeo sólo server-side en Studio; el navegador recibe el DTO de /api/v1 ya degradado por fuente; en Greenhouse la lectura completa es server-only (el reader GA4 importa server-only)`
- Build impact: `none: sin SDK nuevo; el adapter usa fetch nativo con AbortSignal.timeout; Greenhouse agrega una ruta y un reader`
- Extraction blocker: `none: la frontera ya es HTTP gobernado; el único acoplamiento es el contrato del lane ecosystem, versionado por routeKey`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `Greenhouse: greenhouse_growth.seo_gsc_daily (vía readSeoPerformance), visibilidad por URL (url-visibility), GA4 Data API por organización (vía readGa4Analytics). Studio: studio.campaign_metrics_mapping (nueva, dueña de qué medir por campaña)`
- Consumidores afectados: `web de Studio (TASK-1895), CLI de Studio, gateway Efeonce MCP (TASK-1891), manifiesto de tools de Greenhouse`
- Runtime target: `production (Vercel greenhouse-eo y Vercel de Studio)`

### Contract surface

- Contrato existente a respetar: `lane ecosystem (runEcosystemReadRoute, externalScopeType/externalScopeId obligatorios, 404 anti-oráculo); contratos de readSeoPerformance y readGa4Analytics; OpenAPI v1 y manifiesto de Studio (TASK-1890)`
- Contrato nuevo o modificado:
  - Greenhouse `GET /api/platform/ecosystem/growth/analytics/campaign-performance?organizationId&startDate&endDate&utmCampaign=&landing=` (routeKey `platform.ecosystem.growth.analytics.campaign_performance`), passthrough de un reader canónico sobre `readGa4Analytics`.
  - Greenhouse: parámetros opcionales `startDate`/`endDate` en `GET .../seo/performance` (y en `url-visibility` si Discovery confirma que aplica) que, si vienen, reemplazan a `rangeDays`. Sin ellos, respuesta idéntica a la actual.
  - Studio `GET /api/v1/campaigns/{id}/metrics?from=&to=` con DTO por fuente y tool `studio.campaign.metrics.get`.
- Backward compatibility: `compatible: rutas nuevas y parámetros opcionales; readers existentes sin cambio de forma cuando no se usan los parámetros nuevos`
- Full API parity: `la lectura GA4 de campaña nace como reader en src/lib/growth/** + ruta ecosystem + entrada en el manifiesto de Greenhouse (tool o exclusión razonada); en Studio, reader de dominio + /api/v1 + tool del manifiesto; UI (TASK-1895), CLI y MCP consumen el mismo reader`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.campaign_metrics_mapping (nueva), studio.audit_event (alta/edición del mapeo); en Greenhouse greenhouse_core.sister_platform_consumers y greenhouse_core.sister_platform_bindings (filas nuevas vía primitives existentes), sin DDL`
- Invariantes que no se pueden romper:
  - Ausente ≠ cero: cada fuente devuelve `status` (`ok | no_data | not_connected | not_entitled | disabled | timeout | unavailable`) y sus métricas son `null` salvo `ok`; `no_data` (la fuente respondió sin filas) se distingue de las fallas.
  - Nunca se suman métricas de fuentes distintas ni se combinan con presupuesto; el DTO no tiene totales cruzados.
  - Search Console y visibilidad SEO se reportan por landing y se etiquetan como contexto orgánico; sólo GA4 con `utm_campaign` se describe como tráfico de la campaña.
  - Toda respuesta declara la ventana efectiva (`from`, `to`), el mercado servido que reporta el lane SEO (`servedMarket`) y hasta qué fecha llegan los datos (`dataThrough`), porque Search Console tiene rezago de días.
  - El mapeo es explícito y persistido: la derivación desde anuncios y flight sólo propone; lo que se mide es lo guardado.
  - Una campaña sin mapeo devuelve `status: not_mapped` en todas las fuentes, nunca una consulta a toda la propiedad.
  - La organización de la consulta sale de `campaign.organization_id` (canónica) y la aplica el binding de Greenhouse; Studio no envía otra.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura; Greenhouse no escribe tablas nuevas`
- Tenant/space boundary: `un binding org-scoped por organización servida (greenhouseScopeType=organization, externalScopeType=organization, externalScopeId=<id canónico>); Greenhouse resuelve la organización desde el binding; en Studio, el actor ve sólo campañas de sus organizaciones (TASK-1890)`
- Idempotency/concurrency: `lecturas puras; el mapeo se escribe por CLI con upsert por campaign_id y audit_event; caché de lectura sin efectos`
- Audit/outbox/history: `sister_platform_request_logs en Greenhouse por cada llamada; audit_event en Studio por cambio de mapeo; sin outbox (no hay eventos de dominio)`

### Migration, backfill and rollout

- Migration posture: `additive (tabla studio.campaign_metrics_mapping en Studio); Greenhouse sin migración`
- Default state: `flag STUDIO_GREENHOUSE_METRICS_ENABLED OFF: la ruta existe y responde todas las fuentes en disabled; lecturas nuevas de Greenhouse sin consumidores hasta el flip`
- Backfill plan: `CLI pnpm metrics-mapping:derive --campaign <id> (dry-run por defecto) propone UTM, landings y ventana desde ad_configuration y media_flight; --apply persiste tras revisión humana, campaña por campaña`
- Rollback path: `flag OFF en Vercel de Studio + redeploy; revocar el consumer en Greenhouse (status inactive); revert de las rutas nuevas; migración down de la tabla de mapeo`
- External coordination: `secreto del token del consumer en Secret Manager (efeonce-group) + env sensible en el proyecto Vercel de Studio; release de Greenhouse por el control plane para las lecturas nuevas; rollout de TASK-1284 para que GA4 entregue datos`

### Security and access

- Auth/access gate: `Greenhouse: token de sister platform consumer + binding org-scoped + seo_v2 (lecturas SEO) o conexión GA4 activa (lectura GA4); Studio: actor de la sesión o api_client con la organización de la campaña (TASK-1890)`
- Sensitive data posture: `métricas de tráfico agregadas por página y campaña, sin PII; el token del consumer es secreto y nunca se loggea ni vuelve al navegador`
- Error contract: `Greenhouse: errores canónicos del lane (400 scope faltante, 401 token, 404 anti-oráculo); Studio: { error, code, actionable } y degradación por fuente en un 200; un fallo de Greenhouse nunca convierte la respuesta de Studio en 5xx`
- Abuse/rate-limit posture: `caché corta en Studio (TTL 5 min con datos, 60 s degradado) + una sola llamada por fuente por request; GA4 respeta la cuota de la Data API de la propiedad; timeout duro por fuente (4 s, ajustable en Discovery)`

### Runtime evidence

- Local checks: `Greenhouse: pnpm local:check (incluye mcp:manifest:check), tests focales del reader GA4 de campaña, del payload ecosystem y de la ventana fija de performance. Studio: pnpm check (paridad del manifiesto, leak test), tests del adapter con fetch simulado (ok, 404, 401, timeout, 5xx, JSON inválido)`
- DB/runtime checks: `SELECT de studio.campaign_metrics_mapping tras la migración en staging y producción; lectura de sister_platform_request_logs del consumer tras el canary`
- Integration checks: `canary del lane ecosystem de producción con el token del consumer de Studio (receta de canary de lane: token + externalScopeType/externalScopeId); canary de /api/v1/campaigns/{id}/metrics en producción de Studio`
- Reliability signals/logs: `logs de Vercel de Studio con correlationId y status por fuente; sister_platform_request_logs en Greenhouse`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La lectura GA4 de campaña y la ventana fija viven en readers de `src/lib/growth/**`; la ruta ecosystem es passthrough.
- [ ] En Studio, la lógica de fuentes, degradación y mapeo vive en `packages/domain/src/metrics/**`; el handler sólo valida transporte y delega.
- [ ] Reads expuestos como readers canónicos con contrato: `campaign-performance` en Greenhouse y `GET /api/v1/campaigns/{id}/metrics` en Studio.
- [ ] La lectura nueva de Greenhouse tiene tool o exclusión razonada en `src/mcp/greenhouse/tool-manifest.ts` en el mismo PR.
- [ ] `studio.campaign.metrics.get` existe en el manifiesto de Studio y el guard de paridad pasa.
- [ ] Un primitive, muchos consumers: web (TASK-1895), CLI y MCP (TASK-1891) usan `getCampaignMetrics`, sin cálculo propio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Greenhouse: ventana fija en la lectura SEO por URL

- `readSeoPerformance` acepta `startDate`/`endDate` (ISO `YYYY-MM-DD`, `startDate <= endDate`, tope de rango definido en Discovery) que reemplazan a `rangeDays` cuando vienen; sin ellos, comportamiento idéntico.
- `getEcosystemSeoPerformancePayload` lee y valida los parámetros; fechas inválidas responden el error canónico del lane, nunca una ventana por defecto silenciosa.
- La respuesta declara la ventana efectiva y `dataThrough` (última fecha con datos en `seo_gsc_daily` para la org).
- Si Discovery confirma que `url-visibility` necesita ventana para servir a una campaña, se aplica el mismo patrón; si no, se documenta que se usa su foto vigente.
- Tests: compatibilidad sin parámetros, ventana fija, fechas inválidas.

### Slice 2 — Greenhouse: lectura GA4 de campaña por el lane ecosystem

- Extensión aditiva de `readGa4Analytics`: dimensión `sessionCampaignName`, filtro por nombre de campaña exacto (`utmCampaign`) combinable con `landingPrefix`, y la métrica de eventos clave [verificar nombre vigente en la Data API y si la propiedad los define].
- Reader `readGa4CampaignPerformance(organizationId, { startDate, endDate, utmCampaigns, landings })` en `src/lib/growth/analytics-ga4/campaign-performance.ts`: totales de la ventana y serie diaria por campaña y por landing, conservando la degradación honesta del reader base.
- Payload `src/lib/api-platform/resources/ecosystem-growth-analytics.ts` + ruta `src/app/api/platform/ecosystem/growth/analytics/campaign-performance/route.ts` con `runEcosystemReadRoute`, resolución de organización por binding (misma regla del lane SEO: org-scoped manda, `internal` exige `organizationId`, 404 anti-oráculo).
- Entrada en `src/mcp/greenhouse/tool-manifest.ts` (tool o exclusión con razón) y `pnpm mcp:manifest:generate`.
- Tests: binding org-scoped, organización ajena (404), flag OFF (`disabled`), sin conexión (`not_connected`), filtro por campaña.

### Slice 3 — Greenhouse: consumer y bindings de Studio

- `scripts/marketing-studio/provision-ecosystem-consumer.ts` sobre `createSisterPlatformConsumer` + `createSisterPlatformBinding` (sin SQL a mano): consumer `efeonce-marketing-studio` y un binding org-scoped por organización servida (primero Efeonce `org-2df565fb-98aa-42f7-b324-ea9a2209017f`); `--dry-run` por defecto; muestra el token una sola vez.
- Token publicado como scalar crudo en Secret Manager (`marketing-studio-greenhouse-ecosystem-token` en `efeonce-group`) y como env sensible del proyecto Vercel de Studio (`vercel env add … --scope efeonce-7670142f` contra `prj_dztLezZkYxAJikDuPSdT9QROEJRS`, verificado antes con `vercel project inspect`; nunca contra el proyecto `greenhouse-eo`).

### Slice 4 — Studio: mapeo campaña → métricas

- Migración `studio.campaign_metrics_mapping`: `campaign_id` (PK, FK), `utm_campaigns text[]`, `landing_urls text[]`, `window_starts_on`/`window_ends_on date` (null = usar el flight), `sources text[]` habilitadas, `updated_at`, `updated_by`; CHECK de fechas y de URLs absolutas `https://`.
- CLI `pnpm metrics-mapping:derive --campaign <id> [--apply]`: propone desde `ad_configuration.utm->>'utm_campaign'`, `destination_url` (sin query string para Search Console) y `media_flight.starts_on/ends_on`; `--apply` hace upsert y escribe `audit_event`.
- Registro semilla actualizado para que un reimport no borre el mapeo.

### Slice 5 — Studio: adapter, caché y reader

- `packages/domain/src/metrics/greenhouse-adapter.ts`: `fetch` con `AbortSignal.timeout`, headers de consumer y `externalScopeType=organization&externalScopeId=<org canónica>`, `X-Correlation-Id`; mapea 401 → `unavailable` (y log de alerta), 404 → `not_entitled`, timeout → `timeout`, 5xx y JSON inválido → `unavailable`; valida la respuesta con zod antes de usarla.
- Caché en memoria por instancia con TTL 5 min para `ok`/`no_data` y 60 s para estados degradados, clave `org + campaña + ventana + fuente`.
- Reader `getCampaignMetrics(actor, campaignId, { from?, to? })`: aplica visibilidad del actor, lee el mapeo (`not_mapped` si falta), llama las tres fuentes en paralelo y arma el DTO por fuente sin totales cruzados.
- Flag `STUDIO_GREENHOUSE_METRICS_ENABLED` leído en `apps/web/src/server/runtime.ts`; OFF ⇒ todas las fuentes `disabled` sin llamar a Greenhouse.

### Slice 6 — Studio: API, contrato y manifiesto

- `packages/contracts/src/metrics.ts` con schemas zod y descripciones semánticas (ausente ≠ cero, orgánico ≠ campaña, `dataThrough`, `servedMarket`), reutilizando el glosario de `semantics.ts` de TASK-1890.
- Ruta `GET /api/v1/campaigns/{id}/metrics` en el OpenAPI.
- Entrada `studio.campaign.metrics.get` en `packages/contracts/src/tool-manifest.ts` (clase `read`, capability de Greenhouse `marketing_studio.campaign.read`), `pnpm mcp:manifest:generate`; guard de paridad y leak test verdes.

### Slice 7 — Rollout, canary y documentación

- Staging/preview de Studio con el flag ON y canary; producción con el flag OFF, luego ON tras el canary.
- Fila `STUDIO_GREENHOUSE_METRICS_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime (Vercel de Studio únicamente).
- Arquitectura de Studio (nueva sección de métricas), runbook `MARKETING_STUDIO_RUNTIME_HANDOFF.md` (consumer, secreto, bindings, rotación, alta de una organización nueva), Handoff y changelog; EPIC-049 actualizado.

## Out of Scope

- Panel visible de métricas en la web de Studio (`TASK-1895`).
- Pauta pagada (Meta Ads, LinkedIn Ads): adapters propios de Studio en tasks futuras.
- Social orgánico (Metricool): adapter propio de Studio en task futura.
- Rollout de la conexión GA4 (migración, OAuth, IAM, consent): es de `TASK-1284`.
- Escrituras del mapeo desde la web o por MCP (task de commands de EPIC-049; nacerán en el manifiesto).
- Federar la tool en el gateway (`TASK-1891`).
- Atribución multi-touch o conversión a ingresos: esta task muestra métricas por fuente, no modela atribución.
- Login de personas en la web (`auth.efeonce.org`), último del programa.

## Detailed Spec

Forma propuesta del DTO de Studio (confirmar nombres en Discovery con la semántica de TASK-1890):

```ts
type SourceStatus = 'ok' | 'no_data' | 'not_mapped' | 'not_connected' | 'not_entitled' | 'disabled' | 'timeout' | 'unavailable'

interface CampaignMetrics {
  campaignId: string
  window: { from: string; to: string; origin: 'flight' | 'mapping' | 'request' }
  mapping: { utmCampaigns: string[]; landingUrls: string[] } | null
  searchConsole: {            // contexto orgánico por landing, no atribuible a la campaña
    status: SourceStatus
    dataThrough: string | null
    servedMarket: { market: string | null; locationCode: string; languageCode: string } | null
    byLanding: Array<{ url: string; clicks: number | null; impressions: number | null; ctr: number | null; position: number | null }>
  }
  ga4: {                      // tráfico etiquetado con utm_campaign
    status: SourceStatus
    byCampaign: Array<{ utmCampaign: string; sessions: number | null; engagedSessions: number | null; totalUsers: number | null; keyEvents: number | null }>
    byLanding: Array<{ url: string; sessions: number | null; engagedSessions: number | null }>
  }
  seoVisibility: {            // foto de visibilidad SEO de la landing
    status: SourceStatus
    byLanding: Array<{ url: string; /* campos de url-visibility tal cual */ }>
  }
  generatedAt: string
}
```

Reglas de la ventana: `from`/`to` del request si vienen; si no, la ventana del mapeo; si no, el flight; si el flight no tiene fechas, `not_mapped`. Rango máximo definido en Discovery (propuesta: 180 días). La posición de Search Console se toma tal cual la calcula el reader de Greenhouse (ponderada por impresiones); Studio nunca la recalcula.

Llamadas de Studio a Greenhouse por campaña: `seo/performance?mode=url&items=<landings>&startDate&endDate`, `seo/url-visibility?subject=<landing>&kind=url` (una por landing, máximo definido en Discovery), `analytics/campaign-performance?startDate&endDate&utmCampaign=…&landing=…`; todas con `externalScopeType=organization&externalScopeId=<org canónica>`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 y Slice 2 (Greenhouse) pueden correr en paralelo; ambos requieren release de Greenhouse antes del canary de producción.
- Slice 3 requiere que las rutas de Slice 1–2 estén desplegadas en el ambiente donde se prueba.
- Slice 4 → Slice 5 → Slice 6 (el reader necesita el mapeo; el contrato y el manifiesto describen el reader).
- Slice 7 sólo con Slices 1–6 verdes; el flag de producción se prende después del canary, nunca antes.
- No se prende el flag en producción si `TASK-1890` no dejó la organización canónica aplicada en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Studio muestra `0` cuando la fuente falló | Studio API | medium | status por fuente + `null` salvo `ok`; test del adapter por cada falla | test rojo; revisión del canary |
| Binding mal configurado deja ver otra organización | identity | low | bindings org-scoped por organización; test de organización ajena (404) en el lane | `sister_platform_request_logs` con org inesperada |
| Token del consumer filtrado en logs o al navegador | secretos | low | sólo server-side; leak test de logs; env sensible en Vercel | revisión de logs del canary |
| Cambio en `readSeoPerformance` altera respuestas actuales de UI/MCP | Greenhouse SEO | medium | parámetros opcionales; test de compatibilidad byte a byte sin ellos | tests del lane y `seo-tools.test.ts` |
| Extensión de `readGa4Analytics` choca con el trabajo en curso de TASK-1284 | Greenhouse GA4 | medium | cambio aditivo; coordinación con la sesión dueña antes de tocar el archivo | conflicto en el checkout compartido |
| Cuota de GA4 Data API agotada por llamadas repetidas | GA4 | low | caché 5 min; una llamada por campaña y request | `query_failed` recurrente |
| Latencia de Greenhouse bloquea `/api/v1` de Studio | Studio runtime | medium | timeout por fuente + llamadas en paralelo + degradación | `timeout` en logs por correlationId |
| Search Console presentado como resultado de la campaña | semántica | medium | etiqueta y descripción de campo "contexto orgánico de la landing"; leak/semantic test de la tool | revisión de la descripción en el manifiesto |

### Feature flags / cutover

- `STUDIO_GREENHOUSE_METRICS_ENABLED` (Vercel de Studio, default `false`): OFF ⇒ la ruta responde todas las fuentes en `disabled` sin llamar a Greenhouse. Se prende en preview/staging para el canary y en producción tras canary verde. Revert: `false` + redeploy (< 5 min). Se registra en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` al implementarlo, con runtime "Vercel de Studio únicamente".
- Greenhouse no agrega flag: las lecturas nuevas heredan `GROWTH_SEO_ENABLED` (SEO) y `GROWTH_GA4_ENABLED` (GA4), ya registrados. La lectura GA4 queda sin datos hasta el rollout de TASK-1284.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR de Greenhouse (parámetros opcionales; nadie depende de ellos hasta el flip) | < 30 min vía release | sí |
| Slice 2 | revert del PR + regenerar manifiesto de Greenhouse | < 30 min vía release | sí |
| Slice 3 | consumer a `inactive` con los primitives existentes + borrar versión del secreto + quitar env de Vercel de Studio | minutos | sí |
| Slice 4 | migración down de `studio.campaign_metrics_mapping` (el mapeo se re-deriva por CLI) | minutos | sí |
| Slice 5–6 | flag OFF + revert del deploy de Studio | < 5 min | sí |
| Slice 7 | flag OFF; revert de docs | < 5 min | sí |

### Production verification sequence

1. Release de Greenhouse con Slices 1–2; canary del lane con el token del gateway existente: `performance` sin fechas idéntico al anterior y con fechas devuelve la ventana declarada; `campaign-performance` responde `disabled` o `not_connected` según el estado de TASK-1284.
2. Provisionar consumer y binding de Efeonce en producción (dry-run → apply); canary con el token de Studio: 200 en la organización del binding, 404 con `organizationId` ajeno, 401 con token inválido, 400 sin `externalScopeType`.
3. Migración de mapeo en la base de Studio de staging; derivar y aplicar el mapeo de una campaña de Efeonce; revisar la propuesta antes del `--apply`.
4. Preview de Studio con el flag ON: `GET /api/v1/campaigns/{id}/metrics` devuelve estado por fuente, ventana, `dataThrough` y cero totales cruzados; forzar timeout (URL inválida) y verificar `timeout` sin 5xx.
5. Producción de Studio: migración + mapeo de la campaña canary con el flag OFF (todas `disabled`), luego flag ON + redeploy y repetir el canary.
6. Verificar en `sister_platform_request_logs` las llamadas del consumer y que ninguna salió con otra organización.

### Out-of-band coordination required

- Secret Manager (`efeonce-group`): secreto nuevo del token del consumer, scalar crudo.
- Vercel de Studio: env sensible del token y flag, con `--scope efeonce-7670142f` y verify del project id antes de mutar.
- Release de Greenhouse por el control plane (`greenhouse-production-release`).
- Coordinación con la sesión dueña de `TASK-1284` antes de extender `readGa4Analytics`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET .../seo/performance` sin `startDate`/`endDate` responde igual que antes (test de compatibilidad) y con ellos devuelve la ventana declarada y `dataThrough`.
- [ ] `GET /api/platform/ecosystem/growth/analytics/campaign-performance` existe en producción, resuelve la organización por binding y responde 404 con una organización fuera del binding.
- [ ] La lectura GA4 nueva tiene tool o exclusión razonada en el manifiesto de Greenhouse y `pnpm mcp:manifest:check` pasa.
- [ ] El consumer `efeonce-marketing-studio` existe con binding org-scoped para `org-2df565fb-98aa-42f7-b324-ea9a2209017f`, creado por el script (no por SQL), y su token vive sólo en Secret Manager y en el env sensible de Vercel de Studio.
- [ ] Canary de producción con el token de Studio: 200 en la organización del binding, 404 fuera de ella, 401 con token inválido.
- [ ] `studio.campaign_metrics_mapping` existe en staging y producción de Studio y al menos una campaña de Efeonce tiene mapeo aplicado por la CLI con su `audit_event`.
- [ ] `GET /api/v1/campaigns/{id}/metrics` en producción de Studio devuelve estado por fuente, ventana efectiva, `dataThrough` y ninguna métrica cruzada entre fuentes.
- [ ] Con una fuente caída (timeout o 5xx simulados en test y un caso forzado en preview), la respuesta es 200, la fuente queda en su estado degradado con métricas `null` y las demás fuentes no cambian.
- [ ] Con el flag OFF, todas las fuentes responden `disabled` y no se registra ninguna llamada del consumer en Greenhouse.
- [ ] `studio.campaign.metrics.get` está en el manifiesto de Studio; guard de paridad y leak test verdes.
- [ ] Ninguna consulta de Studio toca schemas de Greenhouse: `grep` de `greenhouse_` en el repo de Studio sin conexiones ni SQL (sólo docs).
- [ ] Si TASK-1284 está en producción al cerrar, GA4 devuelve `ok` o `no_data` para la campaña canary; si no lo está, GA4 devuelve `not_connected` o `disabled`, y la task cierra con la fuente GA4 marcada como `rollout pendiente` en Handoff y en el follow-up.
- [ ] Fila `STUDIO_GREENHOUSE_METRICS_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime y estado por ambiente.
- [ ] Arquitectura de Studio, runbook, Handoff, changelog y EPIC-049 actualizados.

## Verification

- Greenhouse: `pnpm local:check`, `pnpm test src/lib/growth/analytics-ga4 src/lib/growth/seo/performance src/lib/api-platform src/mcp/greenhouse`
- Studio: `pnpm check` (tipos, lint, tests, paridad del manifiesto, leak test)
- Canary del lane ecosystem de producción con el token del consumer de Studio
- Canary de `GET /api/v1/campaigns/{id}/metrics` en preview y producción de Studio

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado; `TASK-1895` notificada de que su fuente de datos existe
- [ ] Delta en `TASK-1284` sobre la extensión de `readGa4Analytics` y la nueva ruta ecosystem
- [ ] Si `TASK-1891` ya cerró, artefacto del manifiesto sincronizado en el gateway

## Follow-ups

- Adapter de pauta pagada (Meta Ads, LinkedIn Ads) en Studio, con su propia conexión y su tool en el manifiesto.
- Adapter de social orgánico (Metricool) en Studio.
- Edición del mapeo desde la web y por MCP (task de commands de EPIC-049).
- Activación de GA4 para la campaña canary cuando `TASK-1284` llegue a producción, si no estaba al cierre.
- Alta de bindings para organizaciones cliente (Berel, Sky) cuando Studio las sirva.

## Open Questions

- ¿La lectura GA4 de campaña exige un entitlement per-org además de la conexión GA4 activa (como `seo_v2` en SEO), o basta el binding? Resolver en Discovery con la arquitectura de API Platform; por defecto, binding + conexión.
- ¿`url-visibility` necesita ventana fija para campañas o basta su foto vigente? Resolver en el Slice 1.
- Nombre final de la tool y de los campos del DTO: confirmar con `mcp-craft` y la semántica de TASK-1890.
