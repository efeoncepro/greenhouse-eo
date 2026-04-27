# TASK-696 — Smart Home v2 (Enterprise-grade redesign)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-Home`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-696-smart-home-v2-enterprise`
- Legacy ID: absorbe parcialmente `TASK-402` (universal-adaptive-home-orchestration) y `TASK-449` (insights interaction layer)
- GitHub Issue: TBD

## Summary

Rediseno enterprise-grade del Home (`/home`) de Greenhouse: superficie role-aware, value-dense y moderna. Se construye sobre 4 capas (Contrato versionado + Home Block Registry + Data Layer mixto pre-compute/realtime + Render consumer-agnostico), reusando ~60% del stack Vuexy full-version (cmdk command palette, ActivityTimeline, StatsWithAreaChart, SendMsgForm, Customizer) y los readers ya canonicos del repo (Platform Health V1, Reliability Control Plane, Nexa Insights, NotificationService, getHomeFinanceStatus). El home pasa de 4 chips informativos a 7 bloques accionables con observabilidad propia, kill switches per-block, multi-tenant safety y rollout escalado.

## Why This Task Exists

El home actual (`src/views/greenhouse/home/HomeView.tsx`) es un AI command bar + 1 senal Nexa + 4 botones de shortcut + chips informativos. La planeria server-side (`buildHomeEntitlementsContext`, audience, startupPolicy, moduleKeys) ya esta resuelta pero la UI no la consume — los datos para personalizar existen, la superficie no los aprovecha. Resultado: un home generico que no responde "que necesito saber hoy / que tengo que hacer hoy / donde estaba" en los primeros 3 segundos. Esto es la cara del portal a stakeholders Globe y al uso diario de 50-200 colaboradores internos. La task v3 enterprise cierra esa brecha sin reescribir nada — extiende patrones ya validados (Platform Health V1 composer, Reliability Control Plane registry).

## Goal

- Home role-aware con 7 bloques: Hero AI, Pulse Strip (KPI mini-cards), Tu Dia Inbox, AI Insight Bento, Continua Con Rail, Closing Countdown, Reliability Ribbon
- Home Block Registry declarativo con audiencias + capabilities + flags + slots (extender el home = agregar entry, no editar JSX)
- Contrato versionado `home-snapshot.v1` consumible por web + MCP + Teams bot + futuros mobile
- Observabilidad propia: metricas per-block, Sentry domain tag `home`, modulo registrado en Reliability Control Plane
- Mix pre-compute + realtime para escalar a 200+ usuarios concurrentes a las 9 AM sin reventar PG
- Multi-tenant safety con tests de regresion (Sky no ve datos de Efeonce y viceversa)
- Rollout escalado con feature flag `HOME_V2_ENABLED` + toggle de vuelta a v1 por 4 semanas
- Reuse maximo de Vuexy full-version (cmdk, ActivityTimeline, StatsWithAreaChart, SendMsgForm, Customizer)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (Platform Health V1 contract)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (token discipline)

Reglas obligatorias:

- registry-driven, no `if/else` per-rol en JSX del home
- contrato versionado con `contractVersion: "home-snapshot.v1"`
- composer pattern reusando `withSourceTimeout` de `src/lib/platform-health/with-source-timeout.ts`
- redaction obligatoria via `redactSensitive` antes de devolver payload externo
- charts: ApexCharts en sparklines (Pulse Strip), reservar ECharts para hero charts futuros
- a11y WCAG 2.2 AA + `prefers-reduced-motion`
- tenant scoping obligatorio en cada `dataLoader` (regex check en CI)
- Spanish-first microcopy, validado por skill `greenhouse-ux-writing`
- migraciones via `pnpm migrate:create` (NUNCA timestamps a mano)

## Normative Docs

- `CLAUDE.md` (charts policy 2026-04-26, Platform Health V1 contract, redaction rules)
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/platform-health/with-source-timeout.ts` (composer pattern reusable)
- `src/lib/observability/redact.ts` (redaction helper)
- `src/lib/observability/capture.ts` (`captureWithDomain`)
- `src/lib/home/build-home-entitlements-context.ts` (audience + capabilities resolver)
- `src/lib/home/get-home-snapshot.ts` (orquestador actual — se extiende, no se reemplaza)
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` (Nexa Insights source)
- `src/lib/notifications/*` (`NotificationService`)
- Reliability Control Plane (`getReliabilityOverview`)
- Vuexy full-version vendored at `/Users/jreye/Documents/greenhouse-eo-develop-mergecheck/full-version/`

### Blocks / Impacts

- `TASK-402` (universal-adaptive-home-orchestration) — absorbida parcialmente, marcar Delta
- `TASK-449` (nexa-insights-interaction-layer) — subsumida en Slice 5, marcar Delta
- `TASK-110/115` (Nexa UI completion in-progress) — coordinar shape del Hero AI
- Todas las vistas que consuman `getHomeSnapshot` deben migrar a `getHomeSnapshotV2`

### Files owned

- `src/views/greenhouse/home/**`
- `src/components/greenhouse/home/**` (nuevo)
- `src/lib/home/**`
- `src/app/(dashboard)/home/page.tsx`
- `src/app/api/home/snapshot/route.ts`
- `src/app/api/home/inbox/**`
- `src/app/api/home/recents/**`
- `migrations/[3 nuevas]`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` (schema `HomeSnapshotV1`)
- `docs/architecture/GREENHOUSE_HOME_PLATFORM_V1.md` (nuevo, spec canonica)
- `docs/documentation/plataforma/smart-home.md` (nuevo, doc funcional)

## Current Repo State

### Already exists

- `src/views/greenhouse/home/HomeView.tsx` (orquestador chat/landing)
- `src/views/greenhouse/home/components/{NexaHero,RecommendedShortcuts,QuickAccess,OperationStatus}.tsx`
- `src/components/greenhouse/{NexaInsightsBlock,NexaInsightsTimeline,AnimatedCounter}.tsx`
- `src/lib/home/get-home-snapshot.ts` (orquestador server)
- `src/lib/home/build-home-entitlements-context.ts`
- Vuexy completo en `../greenhouse-eo-develop-mergecheck/full-version/`
- `src/lib/platform-health/*` (patron composer + timeouts + redaction)

### Gap

- No hay registry declarativo de bloques del home
- No hay observabilidad per-block
- No hay pre-compute pipeline para Pulse Strip
- No hay contrato versionado / OpenAPI
- No hay feature flags per-block
- No hay tests de tenant isolation
- No hay rollout strategy
- Solo 1 senal de Nexa visible; sin drill-in
- Sin `<HomeTodayInbox>` (Linear-Inbox shape)
- Sin `<HomeClosingCountdown>`
- Sin `<HomeRecentsRail>` (no hay tabla `user_recent_items`)
- Sin density toggle ni default surface override
- Sin command palette ⌘K

## Scope

### Slice 0 — Contrato + Registry + Observability (Foundation)

- Crear `src/lib/home/registry.ts` con `HOME_BLOCK_REGISTRY` declarativo (HomeBlock type: `blockId, audiences, requiredCapability, requiredEntitlement, priority, slot, dataLoader, fallback, cacheTtlMs, flagKey`)
- Crear contrato `home-snapshot.v1` en `src/lib/home/contract.ts` (HomeSnapshotV1 type + Zod schema)
- Schema OpenAPI `HomeSnapshotV1` en `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- Migracion 1: `greenhouse_serving.home_block_flags(block_id, scope_type, scope_id, enabled, reason, updated_at)`
- Migracion 2: `greenhouse_serving.home_pulse_snapshots(audience_key, role_code, snapshot_jsonb, computed_at, ttl_ends_at)` para pre-compute
- Migracion 3: `greenhouse_serving.user_recent_items(user_id, entity_kind, entity_id, last_seen_at, snapshot_jsonb)` con index `(user_id, last_seen_at DESC)`
- Migracion 4: `users.home_default_view varchar(64)` + `users.ui_density varchar(16)`
- Modulo Reliability Control Plane: registrar `home` en `RELIABILITY_REGISTRY` con `incidentDomainTag: 'home'`
- Helpers: `src/lib/home/observability.ts` (`recordHomeBlockMetric`, `recordHomeRender`)
- Cron Cloud Run o Vercel cron: `/api/cron/precompute-home-pulse` cada 5 min poblando `home_pulse_snapshots`

### Slice 1 — Estructura bento + Pulse Strip + ⌘K palette

- Reorganizar `HomeView` a layout bento role-resolved con `<HomeShell>` orquestando registry
- Componente `<HomePulseStrip>` consumiendo Vuexy `StatsWithAreaChart` adaptado (sparkline ApexCharts + delta + chip de trend + AnimatedCounter)
- Composer `getHomePulseStrip(audience, role, tenant)` con lookup O(1) en `home_pulse_snapshots` + fallback realtime con `withSourceTimeout`
- Copiar Vuexy `cmdk` palette de `full-version/src/components/layout/shared/search/` a `src/components/greenhouse/CommandPalette/`
- Adaptar data source de ⌘K al `VIEW_REGISTRY` + recents + acciones role-aware
- Density toggle agregado al Customizer existente (`src/@core/components/customizer/`) persistiendo en `users.ui_density`

### Slice 2 — Tu Dia Inbox + Closing Countdown + Hero AI elevado

- `<HomeTodayInbox>` Linear-Inbox shape (feed unificado + agrupacion por tipo + triage 1-click)
- API `POST /api/home/inbox/{action}` con acciones `approve/dismiss/snooze`
- Composer `getTodayInbox(userId, role, tenant)` componiendo `NotificationService + projection_refresh_queue + outbox + period_closure_status + approvals`
- `<HomeClosingCountdown>` (cierre nomina + mes financiero) con traffic light + CTA
- Hero AI elevado: ensamblar Vuexy `Congratulations` shell + Vuexy `SendMsgForm` composer + `NexaModelSelector` + `NexaHero` runtime logic + chips role-aware desde `home_prompt_registry` (config en repo)

### Slice 3 — AI Insights bento + Continuity rail + Reliability ribbon + Rollout

- `<HomeAiInsightsBento>` 2x2 desde `readTopAiLlmEnrichments` con filtro `domain` (finance/delivery/hr) — drill-in al `NexaInsightsBlock` completo (no se elimina, se mantiene como detail)
- `<HomeRecentsRail>` adaptando Vuexy `ActivityTimeline.tsx` a variante horizontal en cards con scroll
- Middleware tracking de `user_recent_items` (capa light en `src/middleware.ts` o per-route)
- `<HomeReliabilityRibbon>` admin-only consumiendo `getReliabilityOverview()` + Platform Health V1
- Default surface override en preferencias (settings panel — extender Customizer)
- Feature flag `HOME_V2_ENABLED` con scope `global | tenant | role | user`
- Toggle UI "Volver al home anterior" durante 4 semanas
- Tests de tenant isolation (Sky vs Efeonce) por bloque
- Telemetria `home_version_rendered{version, audience}` para detectar adopcion

## Out of Scope

- No se elimina `NexaInsightsBlock` actual — sigue accesible via drill-in del bento
- No se reescribe el chat de Nexa — Hero AI ensambla, no construye
- No se modifica el sidebar de navegacion
- No se rediseña el layout del dashboard fuera de `/home`
- No se construye un nuevo provider de auth — se reusa la session canonica
- No se cambia la policy de charts del repo (Apex en sparklines, ECharts reservada)

## Detailed Spec

### Capa 1 — Contract (`src/lib/home/contract.ts`)

```ts
export const HOME_SNAPSHOT_CONTRACT_VERSION = 'home-snapshot.v1' as const

export type HomeSlotKey = 'hero' | 'pulse' | 'main' | 'aside' | 'footer'
export type HomeBlockId =
  | 'hero-ai'
  | 'pulse-strip'
  | 'today-inbox'
  | 'closing-countdown'
  | 'ai-insights-bento'
  | 'recents-rail'
  | 'reliability-ribbon'

export type HomeBlockOutcome = 'ok' | 'degraded' | 'hidden' | 'error'

export interface HomeBlockEnvelope<T = unknown> {
  blockId: HomeBlockId
  slot: HomeSlotKey
  outcome: HomeBlockOutcome
  data: T | null
  degradedSources?: string[]
  fetchedAtMs: number
  ttlMs: number
  errorMessage?: string
}

export interface HomeSnapshotV1 {
  contractVersion: typeof HOME_SNAPSHOT_CONTRACT_VERSION
  audience: AudienceKey
  roleCodes: string[]
  density: 'cozy' | 'comfortable' | 'compact'
  defaultView: string | null
  blocks: HomeBlockEnvelope[]
  meta: {
    renderedAtMs: number
    composerVersion: string
    confidence: number
    cacheHits: number
    cacheMisses: number
  }
}
```

### Capa 2 — Registry (`src/lib/home/registry.ts`)

```ts
export interface HomeBlockDefinition<T = unknown> {
  blockId: HomeBlockId
  slot: HomeSlotKey
  audiences: AudienceKey[]
  requiredCapability?: { module: string; capability: string; action: string }
  requiredEntitlement?: string
  priority: number
  cacheTtlMs: number
  flagKey?: string
  dataLoader: (ctx: HomeLoaderContext) => Promise<T>
  fallback: 'skeleton' | 'hide' | 'degraded-card'
  componentKey: string
  precomputed: boolean
}

export const HOME_BLOCK_REGISTRY: HomeBlockDefinition[] = [
  { blockId: 'hero-ai', slot: 'hero', audiences: ['admin','internal','client',...], priority: 0, ... },
  { blockId: 'pulse-strip', slot: 'pulse', audiences: ['admin','internal'], priority: 10, precomputed: true, ... },
  ...
]
```

### Capa 3 — Composer (`src/lib/home/compose-home-snapshot.ts`)

- Promise.all con `withSourceTimeout` per-block
- Cache 30s in-process por audience+role+tenant
- Per-block flag check antes de invocar dataLoader
- Outcome: `ok | degraded | hidden | error` por bloque
- Total nunca devuelve 5xx — degradacion honesta
- Telemetry en cada loader: `recordHomeBlockMetric({ blockId, durationMs, outcome })`

### Capa 4 — Render (`src/views/greenhouse/home/HomeShell.tsx`)

- Mapea `snapshot.blocks` por slot
- Renderiza componente segun `componentKey` desde un map
- Skeleton-matching durante fetch
- View transitions API en navegacion
- `prefers-reduced-motion` honrado en framer-motion

### Pre-compute pipeline

Cron `/api/cron/precompute-home-pulse` cada 5 min (Vercel cron + fallback Cloud Run ops-worker):

```sql
INSERT INTO greenhouse_serving.home_pulse_snapshots (audience_key, role_code, snapshot_jsonb, computed_at, ttl_ends_at)
VALUES (...)
ON CONFLICT (audience_key, role_code) DO UPDATE SET ...;
```

Lookup read-time: `SELECT snapshot_jsonb FROM home_pulse_snapshots WHERE audience_key=$1 AND role_code=$2 AND ttl_ends_at > now()`

### Multi-tenant safety

CI check (regex sobre `src/lib/home/loaders/`):

```bash
grep -rL "tenantContext\|spaceId\|space_id" src/lib/home/loaders/ && exit 1
```

Tests Vitest: `src/lib/home/__tests__/tenant-isolation.test.ts` valida que un loader corrido con tenant Sky NO devuelve rows con `space_id` de Efeonce.

### Feature flags

```ts
async function isBlockEnabled(blockId: HomeBlockId, ctx: { userId, roleCodes, tenantId }) {
  const flag = await query<HomeBlockFlag>(`
    SELECT enabled FROM greenhouse_serving.home_block_flags
    WHERE block_id = $1
    AND ((scope_type = 'global')
      OR (scope_type = 'tenant' AND scope_id = $2)
      OR (scope_type = 'role' AND scope_id = ANY($3))
      OR (scope_type = 'user' AND scope_id = $4))
    ORDER BY scope_type DESC LIMIT 1
  `, [blockId, ctx.tenantId, ctx.roleCodes, ctx.userId])
  return flag?.enabled ?? true
}
```

### Rollout strategy

1. Deploy con `HOME_V2_ENABLED=false` global
2. Activar para 5 admins (dogfooding) — 3 dias
3. Activar para `efeonce_internal` (50 users) — 1 semana
4. Activar global — toggle de vuelta a v1 visible 4 semanas
5. Telemetry `home_version_rendered{version=v1|v2, audience}` monitoreada
6. Sunset v1 cuando uso < 2% por 7 dias

## Acceptance Criteria

- [ ] `HomeSnapshotV1` contract definido en TS + OpenAPI + Zod
- [ ] `HOME_BLOCK_REGISTRY` declarativo con 7 bloques
- [ ] 4 migraciones aditivas aplicadas via `pnpm migrate:create`
- [ ] Composer reusa `withSourceTimeout` y maneja degraded/hidden/error sin 5xx
- [ ] 7 bloques renderizando con datos reales role-resolved (admin, finance, hr, delivery, client, collaborator)
- [ ] ⌘K palette funcional con 5+ atajos role-aware
- [ ] Density toggle persiste en `users.ui_density` y se aplica en bento
- [ ] Default surface override persiste en `users.home_default_view`
- [ ] Feature flag `HOME_V2_ENABLED` funcional con scope global/tenant/role/user
- [ ] Tests de tenant isolation pasan (Sky no ve Efeonce y viceversa)
- [ ] Modulo `home` registrado en Reliability Control Plane
- [ ] Sentry incidents con `domain: 'home'` taggeados
- [ ] Pre-compute cron corriendo cada 5 min
- [ ] P95 home render < 1.5s en staging con dataset real
- [ ] WCAG 2.2 AA validado (axe-core en tests)
- [ ] `prefers-reduced-motion` respetado en todas las animaciones
- [ ] Microcopy validado por `greenhouse-ux-writing` skill
- [ ] Doc canonica `GREENHOUSE_HOME_PLATFORM_V1.md` publicada
- [ ] Doc funcional `docs/documentation/plataforma/smart-home.md` publicada

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm test src/lib/home`
- `pnpm pg:doctor` post-migracion
- Manual QA en staging con 6 roles distintos (admin, finance, hr, delivery_pm, client, collaborator)
- Smoke E2E con Playwright + Agent Auth (cargando home con cada rol)
- Verificar en cada rol: 7 bloques renderizan, sin errores en consola, sin paneles vacios sin CTA
- Lighthouse: Perf > 85, A11y > 95 en `/home`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` ahora, `complete` al cerrar)
- [ ] Archivo movido a la carpeta correcta segun lifecycle
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con aprendizajes y rollout status
- [ ] `changelog.md` con entry detallada del Smart Home v2
- [ ] Chequeo de impacto cruzado sobre `TASK-402`, `TASK-449`, `TASK-110`, `TASK-115`
- [ ] `TASK-402` y `TASK-449` reciben `## Delta YYYY-MM-DD` con absorcion parcial documentada
- [ ] Doc canonica `GREENHOUSE_HOME_PLATFORM_V1.md` linkeada en `docs/architecture/`
- [ ] Doc funcional publicada en `docs/documentation/plataforma/`

## Follow-ups

- Mobile-first version del Home (Slice 4 futuro)
- Consumer MCP del `home-snapshot.v1` (TASK derivada)
- Teams bot reading "Tu Dia Inbox" via API contract (TASK derivada)
- Migracion de `NexaInsightsBlock` standalone a `NexaInsightsDetailView` (cuando se libere espacio en sidebar)

## Open Questions

- ¿`home_default_view` se persiste por user o por (user, tenant)? — decidir en Slice 3
- ¿Vercel cron vs Cloud Run ops-worker para `precompute-home-pulse`? — decidir en Slice 0 (default Cloud Run por afinidad con readers PG)
