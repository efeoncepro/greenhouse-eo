# TASK-1306 / `/admin/growth/seo` — SEO Overview Cockpit

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1306`
- Product Design asset: sin PNG aprobado todavía — dirección aterrizada en el arch doc §10 (IA/superficies) + §10.4 (dataviz) + §10.5 (estados). Se mantiene `UI ready: no` hasta correr `product-design-loop` (3 conceptos) o aprobación explícita del operador. Este wireframe es el contrato de arquitectura de la superficie, no un stub para pasar el gate.
- Intended consumers: operador Efeonce Growth/Marketing Ops (surface interna densa, multi-Space). Mismo `ReportArtifactModel`/entitlement model del AEO no aplica acá (Overview es cockpit interno, no artefacto cliente).
- Copy source: `src/lib/copy/growth.ts` (nuevo bloque `GH_GROWTH_SEO_OVERVIEW`); nomenclatura de menú en `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV.growthSeo`).
- Primitive decision: `reuse` — CompositionShell (`composition='single'`), `MetricTrendCard`, `GreenhouseChartCard` (Apex area), `AppReactApexCharts` (radialBar salud), `GreenhouseChip`, `@core/components/mui/Autocomplete` (Space picker), `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `EmptyState`. **Ninguna primitive nueva.**
- UI ready target: `no`

## Brief

- Primary user: operador interno Efeonce que administra el SEO de N Spaces (clientes) y necesita, en una mirada, decidir **qué Space/qué señal demanda atención hoy**.
- User moment: entra a `Growth → SEO` para el chequeo diario/semanal de salud de búsqueda orgánica de un Space, o para preparar la conversación de renovación (caso Berel).
- Job to be done: "¿Cómo está la salud SEO de este Space y qué demanda atención?" — responder con los 4 KPIs norte (clicks/impresiones/posición/CTR con tendencia), la evolución de visibilidad, la salud técnica del sitio, los movers de la semana, y el cross-link honesto SEO↔AEO.
- Primary decision signal: la combinación **tendencia de visibilidad + movers negativos + site health gauge** — si algo cae, el operador entra al detalle (`/performance`, `/audit`) desde acá.
- Non-goals: NO es la película temporal de URLs (esa es TASK-1307, se llega desde acá vía el tab **Rendimiento**). NO edita keywords/targets (config vive en las tasks backend + follow-ups). NO recomputa scoring AEO. NO muestra datos de otro Space que el seleccionado.

## Layout Skeleton

Composición: `CompositionShell composition='single'` (una región canvas). Dentro, layout de 2 columnas responsivo (main + sidebar) que colapsa a stack en `<960px`. La sección local **"Search Visibility"** vive como `CustomTabList` (Overview·Rendimiento·Keywords·Auditoría) — 4 tabs que enrutan a las 4 páginas hermanas del arch doc §10.1; **Overview** es la tab activa acá.

```
┌ Header ─────────────────────────────────────────────────────────────────────┐
│ Growth › SEO            [Space ▾ Grupo Berel] [Feb–Jul ▾]   [↻ Actualizar][⤓ Exportar] │
│ ●medido (GSC)  ◑estimado (DataForSEO)   · GSC: datos hasta hace 2 días        │  ← leyenda persistente + latencia
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Overview ] Rendimiento  Keywords  Auditoría                                  │  ← CustomTabList (Search Visibility)
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌KPI─────────┐ ┌KPI─────────┐ ┌KPI─────────┐ ┌KPI─────────┐                    │
│ │ Clics      │ │ Impresiones│ │ Posición   │ │ CTR        │  ← 4× MetricTrendCard│
│ │ 48.2K ↑12% │ │ 1.9M ↑8%   │ │ 14.3 ↓1.2  │ │ 2.5% ↑0.3  │     sparkline c/u    │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘                    │
├──────────────────────────── main ──────────────────┬──────── sidebar ─────────┤
│ ┌ Evolución de visibilidad ───────────────────────┐ │ ┌ Salud del sitio ─────┐ │
│ │ area (clics) + line (posición Y invertido)      │ │ │ radialBar 82/100     │ │
│ │ eje Y izq clics desde 0 · Y der posición invert │ │ │ ● 3 críticos ◑ 12 avis│ │
│ │ NO dual-axis engañoso: charts apilados/leyenda  │ │ │ [Ver auditoría →]    │ │
│ └─────────────────────────────────────────────────┘ │ └──────────────────────┘ │
│                                                      │ ┌ Movers de la semana ─┐ │
│                                                      │ │ ↑ /latex  #8→#3  +5  │ │  ← chip+flecha, Δpos
│                                                      │ │ ↓ /esmalte #4→#9 −5  │ │     umbral ≥5
│                                                      │ │ [Ver en Rendimiento →]│ │
│                                                      │ └──────────────────────┘ │
│                                                      │ ┌ Cruce con AEO Grader ┐ │
│                                                      │ │ 7 keywords rankean   │ │  ← readSeoAeoGap (si existe)
│                                                      │ │ pero la IA no cita   │ │     o placeholder honesto
│                                                      │ │ [Ver en AEO Grader →]│ │
│                                                      │ └──────────────────────┘ │
└──────────────────────────────────────────────────────┴──────────────────────────┘
```

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header + toolbar | Contexto de Space + rango + acciones + leyenda medido/estimado + latencia | `GreenhouseBreadcrumbs` + `@core/.../Autocomplete` (Space) + date-range control + `GreenhouseButton` (Actualizar/Exportar) + `GreenhouseChip` (leyenda ●/◑) | `readSearchConsoleAnalytics` metadata (`as_of`) |
| 1 | Search Visibility tabs | Navegación local entre los 4 motores (Overview/Rendimiento/Keywords/Auditoría) | `CustomTabList` (Vuexy) con `aria-current` en Overview; cada tab = link a la ruta hermana | rutas `route-reachability-manifest.ts` |
| 2 | KPI row | 4 métricas norte con tendencia vs período anterior | 4× `MetricTrendCard` (sparkline Recharts, `AnimatedCounter`) | `readSearchConsoleAnalytics(orgId,{range})` agregado |
| 3 | Evolución de visibilidad | Serie temporal clics (area, Y desde 0) + posición (line, Y invertido) | `GreenhouseChartCard` envolviendo `AppReactApexCharts` (dos charts apilados o combo con leyenda explícita — NO dual-axis) | `readRankEvolution` agregado + `seo_gsc_daily` |
| 4a | Salud del sitio | Gauge de health score + conteo de findings por severidad + drill a auditoría | `AppReactApexCharts` radialBar dentro de `GreenhouseChartCard` + `GreenhouseChip` (críticos/avisos) | `readSiteAuditReport(targetId)` |
| 4b | Movers de la semana | Top ±5 URLs por Δposición ponderado por volumen | lista de filas con `GreenhouseChip` (tono success/error) + flecha + Δ | `readRankSnapshotLatest(targetId)` (WoW delta) |
| 4c | Cruce con AEO | Cross-link honesto SEO↔AEO (rankeas pero no te citan) | card con `GreenhouseChip` + `GreenhouseButton` link a `/admin/growth/ai-visibility` | `readSeoAeoGap(targetId)` si TASK-1305 disponible; si no, card oculta (no placeholder falso) |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.overview.header.title` | 0 | `SEO` | — | breadcrumb `Growth › SEO`; título de página `Search Visibility · SEO` |
| `growth.seo.overview.header.spacePicker.label` | 0 | `Space` | — | label del Autocomplete; placeholder `Elegir Space` |
| `growth.seo.overview.header.range.label` | 0 | `Período` | rango (`Feb–Jul`) | date-range; default últimos ~6 meses |
| `growth.seo.overview.header.refresh` | 0 | `Actualizar` | — | re-fetch (no re-crawl DataForSEO; solo relee snapshots) |
| `growth.seo.overview.header.export` | 0 | `Exportar` | — | CSV del snapshot vigente |
| `growth.seo.overview.legend.measured` | 0 | `Medido · GSC` | — | `GreenhouseChip` con ● (verde) — verdad de primera parte |
| `growth.seo.overview.legend.estimated` | 0 | `Estimado · DataForSEO` | — | `GreenhouseChip` con ◑ (neutro) — estimado de mercado |
| `growth.seo.overview.freshness` | 0 | `GSC: datos hasta {as_of}` | `as_of` (fecha) | latencia explícita; nunca ocultar el lag de 2-3 días |
| `growth.seo.overview.tabs.overview` | 1 | `Overview` | — | tab activa |
| `growth.seo.overview.tabs.performance` | 1 | `Rendimiento` | — | → `/admin/growth/seo/performance` (TASK-1307) |
| `growth.seo.overview.tabs.keywords` | 1 | `Keywords` | — | → `/admin/growth/seo/keywords` (TASK-1308) |
| `growth.seo.overview.tabs.audit` | 1 | `Auditoría` | — | → `/admin/growth/seo/audit` (TASK-1309) |
| `growth.seo.overview.kpi.clicks.title` | 2 | `Clics` | valor, Δ%, período | ↑ = bueno (verde) |
| `growth.seo.overview.kpi.impressions.title` | 2 | `Impresiones` | valor, Δ%, período | ↑ = bueno (verde) |
| `growth.seo.overview.kpi.position.title` | 2 | `Posición promedio` | valor, Δ, período | **↓ = bueno**: baja de posición pinta flecha abajo **verde** (semántica invertida documentada) |
| `growth.seo.overview.kpi.ctr.title` | 2 | `CTR` | valor%, Δ, período | ↑ = bueno (verde) |
| `growth.seo.overview.kpi.tooltip.position` | 2 | `Posición 1 es lo mejor. Bajar de posición sube tu visibilidad.` | — | aclara la inversión al usuario |
| `growth.seo.overview.evolution.title` | 3 | `Evolución de visibilidad` | — | subtítulo `Clics e impresiones vs posición promedio` |
| `growth.seo.overview.health.title` | 4a | `Salud del sitio` | health_score /100 | radialBar |
| `growth.seo.overview.health.findings` | 4a | `{critical} críticos · {warning} avisos` | conteos | chips severidad |
| `growth.seo.overview.health.cta` | 4a | `Ver auditoría` | — | → `/audit` |
| `growth.seo.overview.movers.title` | 4b | `Movers de la semana` | — | subtítulo `Cambios de posición ≥ 5 vs semana anterior` |
| `growth.seo.overview.movers.cta` | 4b | `Ver en Rendimiento` | — | → `/performance` (deep-link con la URL preseleccionada) |
| `growth.seo.overview.aeoGap.title` | 4c | `Cruce con AEO Grader` | — | — |
| `growth.seo.overview.aeoGap.body` | 4c | `{n} keywords rankean en Google pero la IA no las cita.` | n | oportunidad; NUNCA promediar SEO y AEO |
| `growth.seo.overview.aeoGap.cta` | 4c | `Ver en AEO Grader` | — | → `/admin/growth/ai-visibility` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | — | — | cockpit poblado con KPIs + charts + sidebar |
| loading | — | — | — | `GreenhouseLoadingSurface`/skeleton **por región** (KPIs, chart, sidebar independientes vía Suspense boundaries — progressive disclosure, no spinner de página) |
| empty (sin GSC conectado) | `Conecta Google Search Console` | `Necesitamos GSC para medir clics, impresiones y posición reales de este Space.` | `Conectar Search Console` (CTA OAuth, TASK-1282) | `EmptyState` accionable — **NUNCA ceros fantasma**; sin GSC no hay verdad de primera parte |
| empty (GSC ok, sin snapshots aún) | `Aún no hay datos históricos` | `El primer snapshot se materializa en la próxima corrida programada.` | `Ver estado de sincronización` | no confundir con "sin conexión" |
| partial / degraded (DataForSEO caído) | banner | `Mostrando solo datos medidos por GSC. Los estimados de mercado (competidores, salud) no están disponibles ahora.` | dismissible; el resto del cockpit rinde con GSC | `observeAndDegrade` — el gauge de salud muestra "Pendiente" con razón, NO 0/100 falso |
| partial (una región falla) | por-slot | slot muestra `— Pendiente` + tooltip razón | — | honest degradation por región; nunca `NaN`/`$0` |
| error (reader base falla) | `No pudimos cargar el panel SEO` | `Hubo un problema al leer los datos de este Space. Intenta de nuevo.` | `Reintentar` (actionable=true) | error retriable; mapear canonical error |
| denied | `No tienes acceso al módulo SEO` | `Pídele a un administrador que active SEO para este Space.` | — sin botón Reintentar | `actionable=false`; sin capability `growth.seo.observation.read` o sin `module_assignment` del Space |

## Accessibility Contract

- Heading order: `h1` "Search Visibility · SEO" → `h2` por región (KPIs implícitos, "Evolución de visibilidad", "Salud del sitio", "Movers", "Cruce con AEO"). Sin saltos de nivel.
- Chart/table alternatives: cada chart (`role="img"` + `aria-label` con el insight; ej. gauge → "Salud del sitio: 82 de 100, 3 hallazgos críticos"). Toggle **"Ver tabla de datos"** en el chart de evolución (expone la serie subyacente como `<table>`).
- Aria labels: Autocomplete de Space con `aria-label="Elegir Space"`; tabs con `role="tablist"` + `aria-current="page"` en Overview; KPI de posición con `aria-label` que explicita la inversión ("Posición promedio 14.3, mejoró 1.2 posiciones — 1 es lo mejor").
- Focus notes: al cambiar de Space, foco vuelve al toolbar y `aria-live="polite"` anuncia "Panel de {Space} actualizado". Tabs navegables con flechas.
- Color-independent state labels: leyenda medido/estimado usa **●/◑ + texto**, no solo color. Movers usan **flecha + signo + color** (↑/↓ +5/−5), nunca color solo. Severidad de salud con chip etiquetado (críticos/avisos), no solo rojo/amarillo.

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/page.tsx` (server component: `getTenantContext` + `hasAuthorizedViewCode('administracion.growth_seo')` + `can(tenant,'growth.seo.observation.read','read','tenant')` + `module_assignment` del Space; redirect `/login` sin sesión, `/401` sin acceso, redirect defensivo si `tenantType==='client'`). View runtime: `src/views/greenhouse/admin/growth/seo/overview/SeoOverviewView.tsx` (`'use client'`).
- Primitives: `CompositionShell` (`composition='single'`), `MetricTrendCard`, `GreenhouseChartCard`, `AppReactApexCharts`, `GreenhouseChip`, `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `EmptyState`, `GreenhouseButton`, `@core/components/mui/Autocomplete`.
- Variants / kinds: CompositionShell región singleton (no grid ad-hoc). Chips: leyenda = `variant='label'`; severidad = `kind='signal'`; movers = tono `success`/`error`.
- Component candidates: `SeoSearchVisibilityTabs` (wrapper de `CustomTabList` reusable por las 4 páginas — candidato a extraer como shared, decisión en Discovery), `SeoKpiRow`, `SeoVisibilityEvolutionChart`, `SeoSiteHealthGauge`, `SeoMoversList`, `SeoAeoGapCard`.
- Copy source: `src/lib/copy/growth.ts::GH_GROWTH_SEO_OVERVIEW` + `GH_INTERNAL_NAV.growthSeo`.
- Data reader / command: `readSearchConsoleAnalytics` (TASK-1282), `readRankEvolution`/`readRankSnapshotLatest` (TASK-1303), `readSiteAuditReport` (TASK-1304), `readKeywordOpportunities` (TASK-1302), `readSeoAeoGap` (TASK-1305, opcional). **Todos read-only** — esta surface no ejecuta commands.
- API parity: la surface es cliente puro de readers gobernados `src/lib/growth/seo/**`; Nexa/MCP consumen los mismos readers por construcción. Cero lógica de negocio en el componente.
- Access / capability: viewCode `administracion.growth_seo` (routeGroup `internal`, grants a roles internos, NUNCA `client_*`) + capability `growth.seo.observation.read` + `module_assignment` del Space (TASK-1301). Seed viewCode en `VIEW_REGISTRY` mismo PR (TASK-827) + entrada en `route-reachability-manifest.ts` (TASK-982) + key en `GH_INTERNAL_NAV` (`greenhouse-nomenclature.ts`, SoT que consume `VerticalMenu` — lección TASK-1247).
- Runtime consumers: operador interno. Sin render cliente/público de esta ruta.
- Print/email/PDF considerations: N/A (Overview es interno on-screen; el artefacto imprimible es TASK-1310).
- GVC markers: `seo-overview-toolbar`, `seo-overview-tabs`, `seo-overview-kpis`, `seo-overview-evolution`, `seo-overview-sidebar`, `seo-overview-empty`, `seo-overview-degraded`, `seo-overview-denied`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-overview.scenario.ts` (desktop 1440×900) + `growth-seo-overview-mobile.scenario.ts` (390×844).
- Route: `/admin/growth/seo` (agent auth superadmin; Space con GSC conectado = Grupo Berel en staging).
- Viewports: desktop 1440×900 + mobile 390×844.
- Required steps: cargar ruta → esperar `[data-capture="seo-overview-kpis"]` → capturar default → (scenario aparte) simular Space sin GSC → capturar empty → (scenario aparte) forzar degraded.
- Required captures: default poblado, empty (sin GSC + CTA OAuth), degraded (banner solo-GSC), denied, mobile stack.
- Required `data-capture` markers: los 8 listados en Implementation Mapping.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, leyenda medido/estimado presente, KPI de posición con aria-label invertido.
- Scroll-width checks: `scrollWidth==clientWidth` en desktop **y** 390px (contención de scroll horizontal — el chart y la fila de KPIs deben condensar, no desbordar).
- Accessibility/focus checks: orden de foco toolbar→tabs→KPIs→chart→sidebar; toggle "Ver tabla de datos" alcanzable; `aria-current` en Overview.
- Reduced-motion evidence: con `prefers-reduced-motion` los `AnimatedCounter` y la entrada de charts se resuelven sin animación (valor final directo).

## Design Decision Log

- Decision: **Overview = cockpit denso de 1 Space** con tabs "Search Visibility" que agrupan SEO+AEO; KPIs medidos (GSC) al frente, estimados (DataForSEO) en salud/movers.
- Alternatives considered: (a) dashboard multi-Space en grilla — rechazado: diluye el "qué demanda atención" de un Space concreto y multiplica el gasto DataForSEO; (b) fundir SEO y AEO en un score único — **prohibido por el boundary duro** (§1.1): rankear #1 y ser citado 0× por IA es una señal, no un promedio.
- Why this pattern: responde la pregunta de negocio ("salud + qué atender") con jerarquía visual clara (KPI norte → evolución → salud/movers → cross-link), reusa primitives existentes y respeta la política de honestidad medido/estimado (§10.5).
- Reuse / extend / new primitive: **reuse total.** Ninguna primitive nueva. Único candidato a extraer: `SeoSearchVisibilityTabs` como componente compartido por las 4 páginas hermanas (no es primitive de Design System, es composición local del módulo).
- **Charts — decisión honesta pendiente de Discovery:** el arch doc §10.4 recomienda **ECharts** para alto impacto, pero **ECharts NO está instalado** (el repo tiene ApexCharts + Recharts; política de charts CLAUDE.md permite ECharts para vistas nuevas de alto impacto vía lazy-load). El gauge de salud (radialBar) y la fila de KPIs se resuelven **hoy con ApexCharts/Recharts sin instalar nada**. La curva de evolución es viable en ambos. La decisión ECharts-vs-Apex para el módulo SEO se **coordina con TASK-1307** (donde el chart ancla — line multi-serie Y invertido + dataZoom — es más exigente y sí justifica ECharts). Overview NO debe instalar una segunda librería por su cuenta; hereda la decisión de 1307.
- Open risks: (1) `readSeoAeoGap` (TASK-1305) puede no estar listo → la card 4c se oculta (no placeholder falso); (2) el Space picker debe respetar `module_assignments` (solo Spaces con SEO activo) — si el operador tiene 0 Spaces asignados, la ruta cae a `denied`/empty institucional.
- Follow-up: cuando exista PNG aprobado del `product-design-loop`, referenciarlo en Meta y subir `UI ready` a `yes` si el gate task-lint queda limpio.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit (banner solo-GSC + slot "Pendiente" con razón).
- [ ] No copy implies a guarantee when data is estimated (leyenda ●medido/◑estimado + latencia).
- [ ] Charts have table/text alternatives (`role="img"` + aria-label + toggle "Ver tabla de datos").
- [ ] State and aria copy is ready for implementation (incluye semántica invertida de posición).
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts (incl. decisión ECharts-vs-Apex diferida a 1307).
