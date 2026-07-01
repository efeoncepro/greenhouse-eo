# TASK-1309 / `/admin/growth/seo/audit` — Site Audit

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1309 — Growth SEO: Site Audit UI`
- Product Design asset: sin PNG dedicado — dirección derivada del contrato de dataviz arch §10.4 (salud sitio = radialBar) + cockpit operador del master flow EPIC-022 (S4) + doctrina "issues por impacto×esfuerzo, lista NO tabla plana".
- Intended consumers: operador Efeonce (Growth/AM). Site audit es **soporte, no lidera el pitch** (arch §11), pero es donde el operador diagnostica salud técnica del ecommerce del cliente (caso Berel).
- Copy source: `src/lib/copy/growth.ts` (namespace nuevo `GH_GROWTH_SEO_AUDIT`, es-CL) + `getMicrocopy()` estados/aria.
- Primitive decision: `reuse` — CompositionShell `single`, `GreenhouseKpiDelta`/KPI cards, `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseAsyncActionButton`, `GreenhouseChip`; lista de issues como cards/rows priorizadas (NO `DataTableShell` — es lista jerárquica por impacto, no tabla densa multi-col); `new` acotado: radialBar de health (ApexCharts, arch §10.4 lo especifica para el gauge de salud).
- UI ready target: `no`

## Brief

- Primary user: operador Growth diagnosticando la salud técnica de un dominio antes de proponer trabajo (site audit del ecommerce, arch §11 caso Berel).
- User moment: revisando el último crawl semanal de un target; decide qué issues atacar primero.
- Job to be done: leer health score + volumen de issues, escanear los issues **priorizados por impacto×esfuerzo** (no una tabla plana), y drill al grupo de un issue para ver las URLs afectadas.
- Primary decision signal: severidad (⛔ Crítico / ⚠ Atención / ⓘ Info) **con icono + label + color** (nunca solo color) × #páginas afectadas → el issue con más impacto y más páginas es la prioridad; el **freshness explícito** ("Último crawl: hace 2 días") dice si el diagnóstico es confiable.
- Non-goals: arreglar issues (es un diagnóstico, no un editor), configurar reglas de crawl, correr auditorías ad-hoc ilimitadas (costo DataForSEO — "Correr auditoría" es gobernado + gateado por cuota).

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Breadcrumb `Growth / Search Visibility / SEO / Auditoría` + título "Auditoría del sitio" + `Space ▾` + **freshness** "Último crawl: hace {n} días" + `[Correr auditoría]` (gobernado) | `GreenhouseBreadcrumbs` + Space picker + `GreenhouseAsyncActionButton` | `readSiteAuditReport(targetId)` `crawled_at` |
| 1 | Health summary | KPI strip: **Health {score}** (radialBar gauge) · **Críticos {n}** · **Warnings {n}** · **Páginas {count}** | `GreenhouseKpiDelta` cards + radialBar (ApexCharts) | `readSiteAuditReport` health |
| 2 | Prioritized issues list | Lista (NO tabla plana) de grupos de issues ordenados por **impacto×esfuerzo**: cada fila = severidad (icono ⛔/⚠/ⓘ + label + color) · nombre del issue · **#págs afectadas** · `[Ver →]` | lista de cards/rows priorizadas + `GreenhouseChip` severidad | `readSiteAuditReport` findings agrupados por `issue_type` |
| 3 | Issue group drill | `?issueGroup=<type>` → panel/página con las URLs afectadas por ese grupo + `detail` bounded por URL | tabla de URLs (`DataTableShell` acá SÍ — es lista de URLs, ≤ pocas cols) | findings del grupo |

**Drill (arch §10.1 + info-architecture):** `[Ver →]` en un grupo → `?issueGroup=indexability` (query param, no segmento dinámico paralelo — back button + share simples). El drill muestra las URLs afectadas por ese grupo. En desktop puede ser panel lateral/expand in-flow; en mobile, navegación a la vista del grupo con back.

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.audit.header.title` | 0 | Auditoría del sitio | — | |
| `growth.seo.audit.header.subtitle` | 0 | Salud técnica de {domain} para búsqueda | `{domain}` | |
| `growth.seo.audit.header.freshness` | 0 | Último crawl: hace {n} días | `{n}` | freshness explícito (state-design) |
| `growth.seo.audit.header.freshnessNever` | 0 | Sin crawl reciente | — | cuando no hay audit run |
| `growth.seo.audit.action.run` | 0 | Correr auditoría | — | command gobernado |
| `growth.seo.audit.kpi.health` | 1 | Salud | — | KPI title |
| `growth.seo.audit.kpi.critical` | 1 | Críticos | — | |
| `growth.seo.audit.kpi.warnings` | 1 | Atención | — | (warnings → "Atención" tono es-CL) |
| `growth.seo.audit.kpi.pages` | 1 | Páginas revisadas | — | |
| `growth.seo.audit.issues.title` | 2 | Issues priorizados | — | |
| `growth.seo.audit.issues.subtitle` | 2 | Ordenados por impacto y esfuerzo | — | |
| `growth.seo.audit.severity.critical` | 2 | Crítico | — | label + icono ⛔ |
| `growth.seo.audit.severity.warning` | 2 | Atención | — | label + icono ⚠ |
| `growth.seo.audit.severity.notice` | 2 | Info | — | label + icono ⓘ |
| `growth.seo.audit.issues.affected` | 2 | {n} páginas afectadas | `{n}` | |
| `growth.seo.audit.issues.view` | 2 | Ver | — | drill CTA |
| `growth.seo.audit.drill.title` | 3 | {issueName} — {n} páginas | `{issueName}`, `{n}` | header del drill |
| `growth.seo.audit.drill.col.url` | 3 | URL | — | col |
| `growth.seo.audit.drill.col.detail` | 3 | Detalle | — | col (detail bounded) |
| `growth.seo.audit.running` | — | Auditoría en curso… | — | audit run `status='running'` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | health + issues poblados | — | default |
| loading | — | KPI + lista skeleton | — | |
| empty (sin auditoría) | Sin auditoría reciente | Aún no corrimos un crawl para {domain}. Corre una auditoría para ver la salud técnica. | Correr auditoría | target sin `seo_site_audit_runs` |
| running | Auditoría en curso | Estamos revisando {domain}. Esto puede tardar unos minutos. | — | `status='running'` (OnPage async, poll idempotente) |
| succeeded-0-findings | Sin issues detectados | El crawl terminó y no encontró problemas. | — | `succeeded` con 0 findings ≠ `failed` (arch §6 honest degradation) |
| degraded | — | banner "El crawl terminó parcialmente — algunos datos no están disponibles" | — | audit `degraded`; nunca fabricar snapshot |
| error (crawl failed) | La auditoría falló | No pudimos completar el crawl. Intenta correrla de nuevo. | Reintentar | `status='failed'` (actionable) |
| error (reader) | No pudimos cargar la auditoría | Hubo un problema al leer el reporte. Intenta de nuevo. | Reintentar | reader falla |
| denied | Sin acceso | No tienes permiso para ver la auditoría de este Space. | — | sin `observation.read`; NO reintentar |

## Accessibility Contract

- Heading order: `h1` "Auditoría del sitio" → `h2` health summary → `h2` "Issues priorizados" → (drill) `h2`/`h3` del grupo.
- Chart/table alternatives: radialBar de health tiene `role="img"` + `aria-label` "Salud del sitio: {score} de 100"; el número también se muestra como texto en el KPI card (no solo el gauge).
- Aria labels: `[Correr auditoría]` con estado pending (`aria-busy`); severidad con `aria-label` incluyendo el label ("Crítico", "Atención", "Info") — no solo el color/icono.
- Focus notes: al drill (`[Ver →]`), foco al header del grupo; al cerrar drill/back, foco vuelve a la fila del grupo.
- Color-independent state labels: severidad = **icono + label + color** (⛔ Crítico / ⚠ Atención / ⓘ Info) — hard rule del brief; nunca color solo (dataviz-design + modern-ui a11y floor).

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/audit/page.tsx` + drill vía `?issueGroup=` (searchParams) en la misma page (server guard: viewCode SEO `internal` + capability `growth.seo.observation.read`). [verificar viewCode canónico].
- Primitives: CompositionShell `single`, `GreenhouseKpiDelta`, `GreenhouseBreadcrumbs`, `GreenhouseChip` (severidad), `EmptyState`, `GreenhouseAsyncActionButton`, `DataTableShell` (solo para el drill de URLs).
- Variants / kinds: radialBar = ApexCharts config (arch §10.4 especifica ApexCharts para el health gauge). Lista de issues = cards/rows priorizadas, NO `DataTableShell` (es jerárquica por impacto, no tabla densa).
- Component candidates: `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx` (client) + `SiteAuditHealthGauge.tsx` + `SiteAuditIssueGroupDrill.tsx`.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_AUDIT` (nuevo, es-CL).
- Data reader / command: reader `readSiteAuditReport(targetId, auditRunId?)` (TASK-1304 `[verificar]` — dependencia backend); command `queueSiteAudit(targetId, actor)` (async OnPage, arch §6 task-based → ops-worker; la UI dispara el enqueue, poll idempotente por `provider_task_id`).
- API parity: la UI es cliente del reader/command; "Correr auditoría" = command gobernado (gateado por `growth.seo.audit.run` + quota cap `enforceSeoRunEntitlement` = gate de costo). Nexa opera el mismo `queueSiteAudit`.
- Access / capability: `growth.seo.observation.read` (ver) + `growth.seo.audit.run` (correr); ocultar "Correr auditoría" sin la capability.
- Runtime consumers: view runtime.
- Print/email/PDF considerations: N/A (surface operador; el diagnóstico exportable al cliente va por el report artifact de TASK-1310, no acá).
- GVC markers: `seo-audit-health`, `seo-audit-issues`, `seo-audit-drill`, `seo-audit-empty`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-audit.scenario.ts` (+ `.mobile`) [verificar DSL].
- Route: `/admin/growth/seo/audit` (+ un capture con `?issueGroup=indexability`).
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar ruta (agent auth operador) → mirar health + lista → click `[Ver →]` en un grupo → mirar drill de URLs → back.
- Required captures: default (health+lista), drill (URLs del grupo), empty (sin crawl), running (audit en curso), succeeded-0-findings.
- Required `data-capture` markers: `seo-audit-health`, `seo-audit-issues`, `seo-audit-drill`, `seo-audit-empty`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, health gauge `role=img`, severidad con label textual presente.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px (la lista de issues condensa en mobile; el drill de URLs usa `DataTableShell` card-density).
- Accessibility/focus checks: foco al drill + back, severidad label textual, freshness visible.
- Reduced-motion evidence: gauge sin animación de entrada con `prefers-reduced-motion`; drill sin transición obligatoria.

## Design Decision Log

- Decision: issues como **lista priorizada por impacto×esfuerzo**, NO tabla plana. Alternatives considered: `DataTableShell` con columnas ordenables (rechazado — invita a leer por columna, no por prioridad; una tabla plana esconde la señal "ataca esto primero"). Why this pattern: state-design + info-architecture — el operador necesita *priorización*, no *exploración*; la lista jerárquica con severidad+#páginas es la decisión, la tabla es para el drill de URLs (donde sí hay una lista homogénea).
- Decision: severidad = icono + label + color (nunca solo color). Why: modern-ui a11y floor + dataviz-design hard rule + 8% daltonismo; el brief lo exige explícito.
- Decision: freshness explícito en el header. Why: state-design — un diagnóstico técnico viejo es engañoso; "Último crawl: hace 2 días" dice si confiar. Sin crawl → "Sin auditoría reciente" + CTA (empty accionable, nunca ceros).
- Decision: `succeeded` con 0 findings ≠ `failed`. Why: arch §6 honest degradation — un crawl que terminó sin issues es una buena noticia, no un error; NUNCA fabricar snapshot ni confundir 0 findings con crawl fallido.
- Decision: drill vía `?issueGroup=` query param, no segmento dinámico paralelo. Why: info-architecture — back button + share + reachability simples; la task registry ya lo describe como "query/segmento".
- Decision: radialBar ApexCharts (no ECharts) para el health gauge. Why: arch §10.4 lo especifica (ApexCharts es 2.º tier oficial válido, CLAUDE.md); un gauge simple no justifica traer ECharts si ApexCharts ya lo cubre.
- Reuse / extend / new primitive: reuse total; radialBar ApexCharts es config, no primitive nueva. Open risks: `readSiteAuditReport` (TASK-1304) debe existir antes de datos reales; OnPage async puede stall (poll idempotente + estado `running`/`degraded` honesto).
- Follow-up: notificación al operador cuando un audit run termina (fuera de scope; el estado `running` cubre el interino).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{domain}`, `{n}`, `{issueName}`, `{score}`).
- [ ] Partial/degraded states are explicit (running / succeeded-0 / degraded / failed distintos).
- [ ] No copy implies a guarantee when data is estimated/stale (freshness explícito).
- [ ] Charts have table/text alternatives (health = número textual + gauge `role=img`; issues = lista textual).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
