# TASK-1306 — Growth SEO: Overview Cockpit UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1306-growth-seo-overview-cockpit-ui.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|seo|ui`
- Blocked by: `TASK-1302`
- Branch: `task/TASK-1306-growth-seo-overview-cockpit-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la superficie operador `/admin/growth/seo` — el **cockpit Overview** del módulo SEO (Search Visibility 360). Responde en una mirada "¿cómo está la salud SEO de este Space y qué demanda atención?": 4 KPIs norte con tendencia (clics/impresiones/posición/CTR), la curva de evolución de visibilidad, el gauge de salud del sitio, los movers de la semana y el cross-link honesto SEO↔AEO. Introduce la sección local **"Search Visibility"** (tabs Overview·Rendimiento·Keywords·Auditoría) que agrupa los dos motores hermanos (SEO nuevo + AEO existente). Es cliente puro de readers gobernados (Full API Parity), sin lógica de negocio local.

## Why This Task Exists

El arch doc `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.1/§10.2 define el Overview operador como la puerta de entrada al módulo SEO y la casa de la sección "Search Visibility". El camino de mínimo costo / máximo valor del EPIC-022 es `TASK-1302 → TASK-1306 → TASK-1307`: con GSC ya conectado (TASK-1282) y el materializer de oportunidades (TASK-1302), el Overview entrega valor casi sin gasto DataForSEO. Sin esta surface, los readers backend existen pero el operador no tiene dónde ver la salud SEO de un Space ni navegar a la película temporal (TASK-1307) o la auditoría (TASK-1309).

## Goal

- Crear `/admin/growth/seo` como Overview operador, alcanzable desde **Growth → SEO** (`GH_INTERNAL_NAV.growthSeo`), gateada por viewCode `administracion.growth_seo` + capability `growth.seo.observation.read` + `module_assignment` del Space.
- Renderizar los 4 KPIs norte con tendencia (posición con semántica invertida documentada), la evolución de visibilidad, la salud del sitio, los movers y el cross-link AEO.
- Introducir la `CustomTabList` "Search Visibility" (Overview activa; tabs enrutan a las páginas hermanas).
- Cubrir los estados honestos: sin GSC (CTA OAuth), degraded solo-GSC (DataForSEO caído), empty, error, denied — nunca ceros fantasma.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §10 (IA/superficies/pantallas), §10.4 (dataviz política), §10.5 (estados/honestidad), §1.1 (boundary duro SEO↔AEO), §7 (readers canónicos).
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — viewCode + capability + `module_assignments` per-org.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es cliente del reader, no source of truth.
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`

Reglas obligatorias:

- **Boundary duro (§1.1):** NUNCA fundir SEO y AEO en un score único ni promediar. El cross-link 4c es un derived read (`readSeoAeoGap`), nunca un merge de tablas. Rankear #1 y no ser citado por la IA es una señal, no un bug.
- **Honestidad medido vs estimado (§10.5):** GSC = medido (●), DataForSEO = estimado (◑), con leyenda persistente + latencia explícita. Sin GSC → `EmptyState` accionable, NUNCA ceros fantasma. Degradación honesta por región (`observeAndDegrade`): un slot que no resuelve muestra "Pendiente" + razón, nunca `0`/`NaN`.
- **Read-only:** esta surface NO ejecuta commands. "Actualizar" relee snapshots materializados, NO dispara re-crawl DataForSEO.
- **Charts:** ECharts NO está instalado hoy (repo = ApexCharts + Recharts). Overview NO instala una segunda librería por su cuenta — hereda la decisión de librería de TASK-1307. El gauge (radialBar) + KPIs se resuelven con ApexCharts/Recharts sin instalar nada.
- Ruta admin interna → viewCode routeGroup `internal`, NUNCA `client_*` + redirect defensivo si `tenantType==='client'`.
- Copy visible en `src/lib/copy/growth.ts`; nav en `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV` — la SoT que consume `VerticalMenu`, lección TASK-1247).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-1302` — GSC daily snapshot materializer + `readKeywordOpportunities` (fuente de los KPIs medidos y del cross-link de oportunidades). **Bloqueador.**
- `TASK-1301` — capabilities `growth.seo.*` + `module_assignments` per-org (gate de la surface).
- `TASK-1303` — `readRankSnapshotLatest`/`readRankEvolution` (movers + curva). Si aún no está, la surface degrada esas regiones honestamente.
- `TASK-1304` — `readSiteAuditReport` (gauge de salud). Idem, degrada si no está.
- `TASK-1305` — `readSeoAeoGap` (card cross-link 4c). Si no está, la card se oculta (no placeholder falso).

### Blocks / Impacts

- Puerta de entrada de las páginas hermanas: TASK-1307 (Rendimiento), TASK-1308 (Keywords), TASK-1309 (Auditoría) cuelgan de la `CustomTabList` que nace acá.
- Introduce `SeoSearchVisibilityTabs` (candidato a componente compartido) y las keys `GH_INTERNAL_NAV.growthSeo` que reusan las hermanas.

### Files owned

- `src/app/(dashboard)/admin/growth/seo/page.tsx` [verificar route group `(dashboard)` vigente]
- `src/views/greenhouse/admin/growth/seo/overview/SeoOverviewView.tsx`
- `src/views/greenhouse/admin/growth/seo/overview/**` (componentes locales: `SeoKpiRow`, `SeoVisibilityEvolutionChart`, `SeoSiteHealthGauge`, `SeoMoversList`, `SeoAeoGapCard`, `SeoSearchVisibilityTabs`)
- `migrations/*_task-1306-*.sql` — seed viewCode `administracion.growth_seo` en `VIEW_REGISTRY` + `role_view_assignments` a roles internos
- `src/lib/admin/view-access-catalog.ts` — registrar el viewCode en el catálogo TS (mismo PR que la migración, TASK-827)
- `src/config/greenhouse-nomenclature.ts` — `GH_INTERNAL_NAV.growthSeo` (+ `growthSeoPerformance`/`growthSeoKeywords`/`growthSeoAudit` si se siembran acá)
- `route-reachability-manifest.ts` (bajo `src/lib/`) — entrada de la ruta + child routes hermanas (registro de alcanzabilidad, TASK-982)
- `src/lib/copy/growth.ts` — `GH_GROWTH_SEO_OVERVIEW`
- `scripts/frontend/scenarios/growth-seo-overview.scenario.ts` + `growth-seo-overview-mobile.scenario.ts` [verificar extensión DSL]

## Current Repo State

### Already exists

- `readSearchConsoleAnalytics(orgId, params)` (TASK-1282), live en staging con Grupo Berel conectado.
- Primitives: `CompositionShell`, `MetricTrendCard`, `GreenhouseChartCard`, `AppReactApexCharts`, `GreenhouseChip`, `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `@core/components/mui/Autocomplete`.
- `GH_INTERNAL_NAV.growth` (root "Growth") ya existe; `growthAiVisibility` (AEO Grader) es el sibling ya vivo (TASK-1247).
- Patrón de página admin gateada por viewCode + capability + redirect defensivo (referencia: `/admin/growth/ai-visibility`, TASK-1247).

### Gap

- No existe `/admin/growth/seo` ni la sección local "Search Visibility".
- No existe `GH_INTERNAL_NAV.growthSeo` ni el viewCode `administracion.growth_seo`.
- Los readers `readRankSnapshotLatest`/`readSiteAuditReport`/`readSeoAeoGap` pueden no estar (dependencias 1303/1304/1305) — la surface debe degradar por región, no romper.
- **ECharts no instalado** — decisión de librería se toma en TASK-1307.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Efeonce Growth/Marketing Ops o admin (multi-Space).
- Momento del flujo: chequeo diario/semanal de salud SEO de un Space, o preparación de renovación (caso Berel).
- Resultado perceptible esperado: el operador entiende en una mirada la salud SEO del Space, ve qué cae (movers/salud) y navega al detalle (Rendimiento/Auditoría/AEO).
- Friccion que debe reducir: saltar entre GSC, DataForSEO y hojas de cálculo para armar una foto de salud.
- No-goals UX: editar keywords/targets, recomputar scoring AEO, ver más de un Space a la vez, la película temporal de URLs (es TASK-1307).

### Surface & system decision

- Surface: `/admin/growth/seo` (Overview), tab activa de la `CustomTabList` "Search Visibility". Ruta admin interna → viewCode routeGroup `internal`, NUNCA `client_*`.
- Composition Shell: `aplica` — `composition='single'` (una región canvas); dentro, layout main+sidebar responsivo que apila en `<960px`. Sin grid/morph ad-hoc.
- Primitive decision: `reuse` — CompositionShell, MetricTrendCard, GreenhouseChartCard, AppReactApexCharts (radialBar), GreenhouseChip, `@core/.../Autocomplete`, GreenhouseBreadcrumbs, GreenhouseLoadingSurface, EmptyState. **Ninguna primitive nueva.** Único candidato a extraer: `SeoSearchVisibilityTabs` (composición local del módulo, no primitive de Design System).
- Adaptive density / The Seam: `aplica` — KPI cards y las cards del sidebar condensan honestamente en anchos angostos (`card-density`); el dato clave nunca desaparece.
- Floating/Sidecar/Dialog decision: N/A — la surface no abre superficies flotantes ni capas superpuestas (por eso `Flow: none`). El detalle vive en las páginas hermanas del conmutador por tabs, resueltas como rutas propias.
- Copy source: `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV.growthSeo` label/subtitle de menú) + `src/lib/copy/growth.ts::GH_GROWTH_SEO_OVERVIEW` (copy funcional; invocar `greenhouse-ux-writing`, es-CL tuteo).
- Access impact: `views|entitlements` — seed viewCode `administracion.growth_seo` (routeGroup `internal`, grants a roles internos, redirect defensivo si `client`) + capability `growth.seo.observation.read` + `module_assignment` del Space (TASK-1301). Nueva ruta `(dashboard)` → entrada en `route-reachability-manifest.ts` (TASK-982) + seed viewCode en `VIEW_REGISTRY` mismo PR (TASK-827).

### State inventory

- Default: cockpit poblado — KPIs + evolución + salud + movers + cross-link.
- Loading: skeleton **por región** (KPIs, chart, sidebar independientes vía Suspense; no spinner de página).
- Empty (sin GSC): `EmptyState` accionable + CTA OAuth `Conectar Search Console` — NUNCA ceros fantasma.
- Empty (GSC ok, sin snapshots): "Aún no hay datos históricos" + link a estado de sync (distinto de "sin conexión").
- Error: reader base falla → "No pudimos cargar el panel SEO" + Reintentar (actionable=true).
- Degraded / partial: DataForSEO caído → banner "solo datos GSC medidos"; el gauge de salud muestra "Pendiente" con razón (NO 0/100). Falla por región → slot "— Pendiente" + tooltip razón (`observeAndDegrade`).
- Permission denied: sin `growth.seo.observation.read` o sin `module_assignment` → "No tienes acceso al módulo SEO" sin botón Reintentar (actionable=false).
- Long content: movers/findings scroll interno; el chart y la fila de KPIs condensan, nunca scroll horizontal de página.
- Mobile / compact: main + sidebar apilan; tabs scrollables; KPIs 2×2.
- Keyboard / focus: orden toolbar→tabs→KPIs→chart→sidebar; al cambiar de Space, foco al toolbar + `aria-live` "Panel de {Space} actualizado".
- Reduced motion: `AnimatedCounter` y entrada de charts renderizan el valor final directo, sin efecto cinemático, bajo `prefers-reduced-motion` (WCAG 2.3.3).

### Interaction contract

- Primary interaction: elegir Space + rango → leer la foto de salud → abrir el detalle vía las tabs o los CTAs (rutas propias).
- Hover / focus / active: filas de movers y CTAs con estados visibles; chips de leyenda no interactivos.
- Pending / disabled: "Actualizar"/"Exportar" con pending mientras releen; anti doble submit.
- Escape / click-away: N/A (sin capa superpuesta que cerrar).
- Focus restore: al volver de una tab hermana, foco al `h1`/tab activa.
- Latency feedback: freshness chip explícito ("GSC: datos hasta {as_of}"); "Actualizar" con feedback de pending.
- Toast / alert behavior: degradación como banner persistente (no toast efímero); export exitoso = feedback breve.

### Motion & microinteractions

- Motion primitive: `CSS` + `AnimatedCounter` (KPIs) + `card-density` reveal (tokens del design system). Todo trivial → `Motion: none`.
- Enter / exit: entrada ligera de cards; sin morph (composición singleton).
- Layout morph: `card-density` condensa cards en anchos angostos (efecto trivial → `Motion: none`).
- Stagger: opcional leve en la fila de KPIs.
- Timing / easing token: tokens del design system (`card-density` reveal).
- Reduced-motion fallback: KPIs y cards renderizan el valor/estado final directo, sin efecto cinemático (WCAG 2.3.3).
- Non-goal motion: efecto decorativo, parallax, orbs.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/page.tsx` (server: `getTenantContext` + `hasAuthorizedViewCode('administracion.growth_seo')` + `can(tenant,'growth.seo.observation.read','read','tenant')` + `module_assignment`; redirect `/login`|`/401`; defensivo si `client`). View: `src/views/greenhouse/admin/growth/seo/overview/SeoOverviewView.tsx` (`'use client'`).
- Primitive / variant / kind: CompositionShell `composition='single'`; GreenhouseChip leyenda `variant='label'`/severidad `kind='signal'`/movers tono success|error; AppReactApexCharts radialBar (gauge).
- Component candidates: `SeoSearchVisibilityTabs`, `SeoKpiRow` (4× MetricTrendCard), `SeoVisibilityEvolutionChart` (GreenhouseChartCard + Apex), `SeoSiteHealthGauge` (Apex radialBar), `SeoMoversList`, `SeoAeoGapCard`.
- Copy source: `GH_GROWTH_SEO_OVERVIEW` + `GH_INTERNAL_NAV.growthSeo`.
- Data reader / command: `readSearchConsoleAnalytics` (1282), `readRankEvolution`/`readRankSnapshotLatest` (1303), `readSiteAuditReport` (1304), `readKeywordOpportunities` (1302), `readSeoAeoGap` (1305, opcional). Read-only.
- API parity: cliente puro de readers `src/lib/growth/seo/**`; Nexa/MCP consumen los mismos por construcción; cero lógica de negocio en el componente.
- Access / capability: viewCode `administracion.growth_seo` + `growth.seo.observation.read` + `module_assignment`; seed + reachability + nav mismo PR.
- States to implement: default, loading (por región), empty (sin GSC / sin snapshots), error, degraded (banner + slot Pendiente), denied, mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-overview.scenario.ts` + `growth-seo-overview-mobile.scenario.ts`.
- Route: `/admin/growth/seo` (agent auth superadmin; Grupo Berel en staging).
- Viewports: desktop 1440×900 + mobile 390×844.
- Required steps: cargar → esperar `[data-capture="seo-overview-kpis"]` → capturar default → scenario aparte Space sin GSC → empty → forzar degraded.
- Required captures: default, empty (sin GSC + CTA OAuth), degraded (banner solo-GSC), denied, mobile.
- Required `data-capture` markers: `seo-overview-toolbar`, `seo-overview-tabs`, `seo-overview-kpis`, `seo-overview-evolution`, `seo-overview-sidebar`, `seo-overview-empty`, `seo-overview-degraded`, `seo-overview-denied`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, leyenda ●medido/◑estimado presente, KPI posición con aria-label invertido.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px.
- Reduced-motion / focus evidence: counters/charts renderizan el valor final directo bajo `prefers-reduced-motion` (WCAG 2.3.3); orden de foco + toggle "Ver tabla de datos" alcanzable.

### Design decision log

- Decision: Overview = cockpit denso de 1 Space con tabs "Search Visibility"; KPIs medidos al frente, estimados en salud/movers.
- Alternatives considered: dashboard multi-Space (diluye el foco + multiplica gasto DataForSEO); score único SEO+AEO (prohibido por boundary §1.1).
- Why this pattern: responde "salud + qué atender" con jerarquía clara, reusa primitives, respeta honestidad medido/estimado.
- Reuse / extend / new primitive: reuse total; único candidato a extraer `SeoSearchVisibilityTabs` (composición local).
- Open risks: `readSeoAeoGap` puede no estar (oculta card 4c); Space picker respeta `module_assignments` (0 Spaces → denied/empty institucional); decisión de librería de charts diferida a TASK-1307.

### Visual verification

- GVC scenario: `growth-seo-overview`
- Viewports: desktop + 390px.
- Required captures: default, empty (sin GSC), degraded (solo-GSC), denied, mobile.
- Required `data-capture` markers: los 8 del GVC scenario plan.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: orden de foco, aria-current en Overview, aria-label invertido en KPI posición, toggle tabla de datos.
- Before/after evidence: N/A página nueva.
- Known visual debt: hereda el route shell admin existente + decisión de charts pendiente.

## Backend/Data Contract

> `Backend impact: none` real — esta task NO crea contrato backend. La única migración es el **seed del viewCode** (`administracion.growth_seo` en `VIEW_REGISTRY`) — plumbing de UI-access, no contrato de negocio (mismo patrón que TASK-1247). Se documenta acá por completitud del gate.

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader` (consumo, no creación)
- Source of truth afectado: ninguno nuevo; consume readers de TASK-1282/1302/1303/1304/1305.
- Consumidores afectados: UI Overview SEO.
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: `readSearchConsoleAnalytics` + los readers `growth.seo.*` (shape `{ ok, ... } | { ok:false, errorCode, status }`).
- Contrato nuevo o modificado: ninguno.
- Backward compatibility: `not applicable`
- Full API parity: la UI es cliente del reader server-side; Nexa/MCP consumen los mismos.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (solo seed viewCode en `view_registry`/`role_view_assignments`, append-only).
- Invariantes que no se pueden romper: NO fundir SEO↔AEO; NO ceros fantasma sin GSC; degradación honesta por región; read-only (sin commands).
- Tenant/space boundary: interno/admin + `module_assignment` del Space; NUNCA `client_*`.
- Idempotency/concurrency: N/A (read-only).
- Audit/outbox/history: N/A (read-only); el seed de viewCode es append-only.

### Migration, backfill and rollout

- Migration posture: `seed-only` — viewCode `administracion.growth_seo` + `role_view_assignments` a roles internos (DO block de verificación post-DDL, marcador `-- Up Migration`).
- Default state: ruta oculta / permission denied hasta grant + `module_assignment`; flag `GROWTH_SEO_ENABLED` (EPIC-022) default OFF.
- Backfill plan: none.
- Rollback path: revert route/nav + revocar assignment; el seed viewCode es reversible (no borra filas de `role_view_assignments` — append-only, se desactiva).
- External coordination: rol interno con capability + Space con `module_assignment` para probar.

### Security and access

- Auth/access gate: session interna + viewCode + `growth.seo.observation.read` + `module_assignment`.
- Sensitive data posture: datos SEO del Space (no PII); interno.
- Error contract: mapear canonical error a estados UI sanitizados (retriable vs estructural con `actionable`).
- Abuse/rate-limit posture: interno autenticado; "Actualizar" relee snapshots (no dispara DataForSEO), sin superficie de abuso.

### Runtime evidence

- Local checks: UI/focal tests + `pnpm local:check:ui`.
- DB/runtime checks: seed viewCode verificado live (registry active + grants); Space con GSC conectado (Berel staging).
- Integration checks: readers responden shape esperado; degradación honesta con un reader caído.
- Reliability signals/logs: revisar signals `seo.*` del EPIC si existen.
- Production verification sequence: staging con Berel primero; prod vía rollout EPIC-022 (flag `GROWTH_SEO_ENABLED`).

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants (no fusión SEO↔AEO, no ceros fantasma, degradación honesta), tenant/access boundary and read-only posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit (seed viewCode reversible, flag OFF).
- [ ] Runtime or DB evidence is listed (seed verificado live + reader shape en staging).
- [ ] No raw data leaks; internal surface, canonical errors mapped.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ruta + shell + tabs Search Visibility + estados base

- Crear `/admin/growth/seo` (page server con guard doble puerta + redirect defensivo si `client`).
- Seed viewCode `administracion.growth_seo` en `VIEW_REGISTRY` (migración) + `view-access-catalog.ts` + `GH_INTERNAL_NAV.growthSeo` + `route-reachability-manifest.ts` (mismo PR).
- `CompositionShell composition='single'` + `SeoSearchVisibilityTabs` (Overview activa; tabs enrutan a las rutas hermanas — placeholders si aún no existen).
- Space picker (`@core/.../Autocomplete` sobre Spaces con `module_assignment`) + date-range + leyenda ●/◑ + freshness chip.
- Estados loading (por región) / empty (sin GSC + CTA OAuth) / error / denied.

### Slice 2 — KPI row + evolución de visibilidad

- 4× `MetricTrendCard` (clics/impresiones/posición/CTR) desde `readSearchConsoleAnalytics` agregado; **posición con semántica invertida** (↓ = verde) + tooltip aclaratorio.
- `SeoVisibilityEvolutionChart` (`GreenhouseChartCard` + AppReactApexCharts): clics area (Y desde 0) + posición line (Y invertido), sin dual-axis engañoso; toggle "Ver tabla de datos".

### Slice 3 — Sidebar: salud + movers + cross-link AEO

- `SeoSiteHealthGauge` (Apex radialBar) + conteo findings por severidad + CTA a `/audit`; degrada a "Pendiente" si `readSiteAuditReport` no está/falla.
- `SeoMoversList` (top ±5 por Δposición, chip+flecha) + CTA a `/performance`.
- `SeoAeoGapCard` (`readSeoAeoGap`) — se oculta si el reader no está (no placeholder falso); CTA a `/admin/growth/ai-visibility`.

### Slice 4 — Degradación honesta + GVC + a11y

- Banner solo-GSC (DataForSEO caído) + slots "Pendiente" con razón (`observeAndDegrade`).
- Scenario GVC desktop/mobile con estados clave; scroll-width, focus, respeto a la preferencia de movimiento reducido (WCAG 2.3.3), axe.

## Out of Scope

- Readers/commands backend del módulo SEO (TASK-1299…1305).
- La película temporal de URLs (TASK-1307), keyword scatter (TASK-1308), auditoría detallada (TASK-1309), cliente/report artifact (TASK-1310).
- Editar targets/keywords/competidores (config = commands backend + follow-up).
- Instalar ECharts (decisión de librería = TASK-1307).
- Recomputar/mutar scoring AEO o métricas SEO.

## Detailed Spec

La surface es un **consumer read-only** de los readers gobernados `src/lib/growth/seo/**` + `readSearchConsoleAnalytics`. Usa `CompositionShell composition='single'` como substrato y la `CustomTabList` "Search Visibility" como conmutador local por tabs entre los dos motores hermanos (SEO + AEO). La jerarquía visual sigue la pregunta de negocio: **KPI norte → evolución → salud/movers → cross-link**.

Puntos de honestidad load-bearing (§10.5):

- **Sin GSC = `EmptyState` accionable, NUNCA ceros fantasma.** Sin la verdad de primera parte no hay panel; el CTA es conectar GSC (OAuth TASK-1282).
- **Medido (●, GSC) vs estimado (◑, DataForSEO)** con leyenda persistente + latencia explícita ("GSC: datos hasta hace 2 días"). Nunca promediar las dos fuentes.
- **Degradación por región (`observeAndDegrade`):** DataForSEO caído no hunde el panel — los KPIs GSC rinden, el gauge de salud muestra "Pendiente" con razón (NO 0/100), banner honesto "solo datos GSC medidos".
- **Boundary SEO↔AEO (§1.1):** el cross-link es un derived read, nunca un merge; el copy dice "rankean pero la IA no las cita" (señal), no un score fusionado.
- **Posición invertida:** el KPI de posición y la curva pintan "bajar de posición" como mejora (flecha abajo verde), documentado en tooltip + aria-label.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No conectar KPIs/charts antes de tener estados empty/error/denied + guard. No mostrar la card AEO antes de confirmar que `readSeoAeoGap` existe (si no, ocultarla).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ceros fantasma sin GSC (mentira de dato) | trust/UX | medium | `EmptyState` accionable + CTA OAuth; nunca render de 0 | GVC empty-sin-GSC |
| DataForSEO caído hunde el panel entero | resiliencia | medium | degradación por región (`observeAndDegrade`) + banner solo-GSC | GVC degraded |
| Fusión visual SEO↔AEO (score único) | correctness/boundary | low | cross-link como derived read + copy "señal", nunca promedio | code review |
| Semántica de posición confusa (↓=malo) | UX | medium | flecha abajo verde + tooltip + aria-label invertido | GVC + a11y |
| Overflow mobile en cockpit denso | UI | medium | CompositionShell + card-density + scroll-width check | GVC 390px |
| Reader hermano ausente (1303/1304/1305) rompe render | resiliencia | medium | degradar la región / ocultar card, nunca throw de página | GVC + focal test |

### Feature flags / cutover

- Gated por `GROWTH_SEO_ENABLED` (EPIC-022, default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) + viewCode + capability `growth.seo.observation.read` + `module_assignment`.
- Puede ocultarse de nav hasta que TASK-1302/1301 estén desplegadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav + desactivar viewCode/assignment | <5 min | sí |
| Slice 2 | revert KPI row / chart | <5 min | sí |
| Slice 3 | revert sidebar (salud/movers/cross-link) | <5 min | sí |
| Slice 4 | revert degradación/polish | <5 min | sí |

### Production verification sequence

1. Staging con Grupo Berel (GSC conectado) + `module_assignment` activo.
2. Operador con capability ve KPIs medidos + estados honestos.
3. Simular DataForSEO caído → banner solo-GSC + gauge "Pendiente".
4. GVC desktop/mobile mirado (empty/default/degraded/denied).

### Out-of-band coordination required

- Rol interno con capability `growth.seo.observation.read` + Space con `module_assignment` (TASK-1301).
- Flag `GROWTH_SEO_ENABLED` en los targets del rollout.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] Ruta `/admin/growth/seo` alcanzable desde **Growth → SEO** (`GH_INTERNAL_NAV.growthSeo`), viewCode `administracion.growth_seo` (routeGroup `internal`, grants internos, redirect defensivo si `client`) + capability `growth.seo.observation.read` + `module_assignment`.
- [ ] `CustomTabList` "Search Visibility" con Overview activa (`aria-current`) y tabs que enrutan a las páginas hermanas.
- [ ] 4 KPIs norte (clics/impresiones/posición/CTR) con tendencia; **posición con semántica invertida** documentada (↓ = verde + tooltip + aria-label).
- [ ] Evolución de visibilidad (clics area Y-desde-0 + posición line Y-invertido, **sin dual-axis engañoso**) con toggle "Ver tabla de datos".
- [ ] Sidebar: gauge de salud + movers ±5 + cross-link AEO (derived read; card oculta si `readSeoAeoGap` no está).
- [ ] Estados sin-GSC (EmptyState + CTA OAuth, **sin ceros fantasma**), degraded solo-GSC (banner + "Pendiente" con razón), empty, error, denied, mobile — todos cubiertos.
- [ ] Leyenda persistente ●medido (GSC) / ◑estimado (DataForSEO) + latencia explícita.
- [ ] La UI es **read-only** consumer de readers gobernados; cero lógica de negocio local; "Actualizar" no dispara DataForSEO.
- [ ] Boundary §1.1 respetado: cero fusión SEO↔AEO en un score único.
- [ ] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_OVERVIEW`); nav en `GH_INTERNAL_NAV` (SoT de `VerticalMenu`).
- [ ] GVC desktop+mobile capturado y mirado **en loop**; `scrollWidth==clientWidth` desktop + 390px; axe verde.
- [ ] Focus/keyboard validados; bajo la preferencia de movimiento reducido (WCAG 2.3.3) counters/charts renderizan el valor final directo, sin efecto cinemático.
- [ ] Ruta `(dashboard)` en `route-reachability-manifest.ts` + viewCode seed en `VIEW_REGISTRY` (mismo PR); capability con grant a ROLE_CODE real.
- [ ] `UI ready` permanece `no` hasta que wireframe + `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log (ya presentes); pasar a `yes` solo con task-lint sin findings + dirección visual aprobada.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-overview --env=staging`
- `pnpm task:lint --task TASK-1306`
- `pnpm ui:wireframe-check --task TASK-1306`
- `pnpm ui:readiness-check --task TASK-1306`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si se toca

## Follow-ups

- Documentación funcional (`docs/documentation/`) + manual (`docs/manual-de-uso/`) del cockpit Overview (exit criteria EPIC-022 — triple doc).
- Multi-Space overview (grilla) si el operador lo pide — hoy fuera de scope (foco de 1 Space).

## Open Questions

1. ¿La `CustomTabList` "Search Visibility" incluye el AEO Grader como 5.ª tab, o el cross-link basta? Propuesta: cross-link (card 4c) en Overview; las tabs son solo SEO (Overview/Rendimiento/Keywords/Auditoría) para no romper el boundary de dominio.
2. ¿El Space picker recuerda el último Space seleccionado (persistencia)? Propuesta: `?space=` en la URL (compartible), default al primer Space con `module_assignment`.
