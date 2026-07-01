# TASK-1310 — Client SEO Dashboard → Report Artifact → 360 Quadrant Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1310 — Growth SEO: Client Dashboard + Report Artifact + 360 Quadrant`
- Related wireframe: [docs/ui/wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md](../wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md)
- **Master program flow (nodo de este surface):** [docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md](EPIC-022-search-visibility-360-UI-FLOW.md) — este surface es los **nodos S5 (Cliente dashboard) + S6 (Quadrant 360) + S7 (Report artifact)** del programa Search Visibility 360, y el punto de **cruce recíproco SEO↔AEO** (§7 del master). El cross-link va a X1 (`/aeo`, EPIC-020).
- Intended route / surface: `/growth/seo` (dashboard) + `/growth/seo/report` (report) — routeGroup `client`.
- Flow type: `multi-surface` (dashboard ↔ report ↔ cross-link AEO; masterDetail navigator; print/PDF export)
- Primary primitives: CompositionShell `masterDetail`, `report-artifact/model.ts` (TASK-1252, reuse), ECharts (quadrant + line, lazy)
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_CLIENT` (es-CL, tono cliente)

## Flow Brief

- Primary user: cliente contratado (marketing lead de un Globe client, ej. Grupo Berel) en el portal.
- Entry moment: entra al portal a ver su visibilidad en búsqueda (self-service, mono-Space).
- Successful outcome: entiende dónde rankea (Resumen) → cómo evoluciona (Evolución) → dónde cae en la foto 360 (Quadrant SEO×AEO) → descarga un informe presentable (Report artifact) para compartir internamente; o salta al AEO por el cross-link recíproco.
- Primary decision/action: leer el cuadrante 360 + descargar el report; y el cross-link recíproco entre los dos motores.
- Non-goals: correr runs (read-only cliente), ver datos crudos de operador, editar keywords/config, ver otros Spaces.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Dashboard `/growth/seo` | Entry + context (mono-Space) | `masterDetail`: navigator (Resumen/Evolución/Quadrant) IZQ angosto + detail canvas DER ancho | navigator colapsa; detail = drawer/stack | CompositionShell `masterDetail` |
| Quadrant 360 (sección del dashboard) | Cruce SEO×AEO | scatter 2×2 in-detail + cross-link a AEO | scatter full-width apilado | ECharts scatter (lazy) |
| Report artifact `/growth/seo/report` | Síntesis presentable/imprimible | report web (`clientPortal`) + `[Descargar PDF]` | report apilado, print A4 | `report-artifact/web`+`print` (SEO adapters, mismo model) |
| `/aeo` (X1, EPIC-020) | Cross-link recíproco (motor hermano) | navegación normal a la ruta AEO cliente | idem | (existente) |

## Flow Map

1. Entry: cliente entra a `/growth/seo` (guard: `module_assignment=active` + `growth.seo.observation.read`; sin assignment → Locked/teaser).
2. Primary action: navega el navigator masterDetail — Resumen → Evolución → Quadrant 360.
3. Transition: en Quadrant 360, click cross-link "¿Te cita la IA? Ver AEO" → navega a `/aeo` (X1); back restaura el dashboard en la sección Quadrant.
4. User decision: `[Ver informe]` (header) → navega a `/growth/seo/report`.
5. Completion: en el report, `[Descargar PDF]` / print → obtiene el artefacto presentable (variant `attachment`, mismo `ReportArtifactModel`).
6. Recovery / exit: browser back / breadcrumb "Inicio / SEO" en cualquier punto; estados honestos (sin GSC, quadrant sin AEO, cuota degradada) nunca bloquean toda la vista.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Seleccionar sección navigator | click en Resumen/Evolución/Quadrant | detail canvas cambia (misma URL o `?view=`) | Tab + Enter | active state `aria-current` |
| Cross-link "Ver AEO" | click en el quadrant | navega a `/aeo` | Enter (link) | navegación normal, no modal |
| "Ver informe" | header dashboard | navega a `/growth/seo/report` | Enter | |
| "Descargar PDF" | report header | genera/descarga PDF (attachment) | Enter | `renderSeoReportPdf` (espejo 1273) |
| Volver | breadcrumb / back | dashboard | back button | breadcrumb clickable por nivel |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | fuera de la ruta | — | navegar a `/growth/seo` | — |
| opening | entrando + guard | navegación | guard resuelve | server guard per-org |
| open (dashboard) | dashboard cargado | guard OK + reader OK | navegar report/AEO | navigator + detail |
| loading | readers en vuelo | entrada / cambio de sección | data llega | skeleton (no spinner de página) |
| locked | sin `module_assignment` | guard resuelve sin assignment | — | teaser/upsell (EPIC-020 S6, diferido) |
| degraded | fuente parcial (cuota/sin GSC) | reader parcial | reintento / OAuth | banner honesto + "Pendiente" (nunca ceros) |
| quadrant-half | `readSeoAeoGap` sin lado AEO | reader | AEO se puebla | "falta la mitad IA" (`sin_dato`, NO 0) |
| report | report artifact abierto | "Ver informe" | back / descargar | render del model (clientPortal/attachment) |
| error | reader falla | reader rechaza | reintentar | error actionable + "Reintentar" |

## Routing Contract

- Route changes: `path` (`/growth/seo` ↔ `/growth/seo/report` ↔ `/aeo`) + `query` opcional (`?view=quadrant` para deep-link a la sección).
- Canonical URL: `/growth/seo` (dashboard), `/growth/seo/report` (report), `/growth/seo?view=quadrant` (quadrant en foco).
- Deep-link behavior: `?view=quadrant` abre el dashboard con la sección Quadrant activa; `/growth/seo/report` es directamente el report.
- Back button behavior: back desde report → dashboard; back desde `/aeo` (cross-link) → dashboard en la sección desde la que se saltó.
- Reload behavior: full render server-side (guard re-evaluado); el estado de sección viene del path/query, no de estado efímero.
- Shareability: URLs compartibles (el cliente puede enviar `/growth/seo/report` a su equipo; el guard protege por assignment).

## Focus & Accessibility

- Initial focus: al entrar, foco al `h1` / primer control del navigator.
- Escape behavior: N/A (no hay modal; el drawer del detail en compact cierra con Escape y restaura foco al navigator).
- Click-away behavior: N/A para el dashboard; el drawer compact cierra con click-away.
- Focus restore: back desde report/AEO restaura foco a la sección/cross-link de origen.
- Modal vs non-modal semantics: todo es navegación in-flow (no modal); el detail compact es un drawer no-modal con foco gestionado.
- Screen reader announcement: cambio de sección anuncia el `h2` de la sección; charts con `role=img` + aria (Y invertido / cuadrantes documentados).
- Keyboard traversal: navigator con Tab + Enter; cross-link y CTAs como `<a>`/`<button>` nativos.
- Reduced motion: charts sin animación de entrada; sin transición obligatoria entre secciones con `prefers-reduced-motion`.

## Data & Command Boundaries

- Readers: `readRankSnapshotLatest` (Resumen curado), `readRankEvolution(targetId, {range})` (Evolución, TASK-1303 `[verificar]`), `readSeoAeoGap(targetId)` (Quadrant, TASK-1305 `[verificar]`). Todos retornan `{ ok, ... } | { ok:false, errorCode, status }`.
- Commands: ninguno (cliente read-only).
- API routes: readers vía route handlers cliente gateados por `module_assignment` + `growth.seo.observation.read`/`report.read_client`.
- Optimistic updates: N/A (read-only).
- Cache / invalidation: snapshots materializados (no live-per-view, arch §1.1/§8); el report deriva del mismo model.
- Audit / signals: reads no auditan writes; freshness/degradación enlaza a signals `seo.rank.capture_lag` (arch §8) sin computar salud en cliente.
- Tenant / access boundary: mono-Space del cliente; **NUNCA** ve otros Spaces; disclosure `clientPortal`/`attachment` (público-safe, sin engine snapshot crudo, sin provider_cost).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | "SEO no está activo en tu plan" + teaser | Hablar con equipo Efeonce | sin `module_assignment=active`; NO botón reintentar |
| not found / empty | "Aún no hay datos de tu visibilidad" | esperar snapshots | target sin snapshots |
| partial / degraded | banner "mostrando datos medidos; estimados no disponibles" | reintento | `observeAndDegrade`, nunca ceros |
| stale data | "GSC: datos hasta hace 2 días" | — | latencia explícita (arch §10.5) |
| quadrant sin AEO | "Falta la mitad IA" + cross-link AEO | correr AEO | `sin_dato` ≠ 0 (arch §1.1) |
| sin GSC | "Conecta Search Console" + CTA | solicitar conexión | nunca ceros fantasma |
| timeout / API error | "No pudimos cargar tu SEO" + reintentar | Reintentar | actionable=true |

## GVC Scenario Plan

- Scenario: cliente recorre dashboard → quadrant → cross-link AEO → report → print.
- Scenario file: `scripts/frontend/scenarios/growth-seo-client.scenario.ts` (+ `.mobile`) + `growth-seo-report.scenario.ts` [verificar DSL].
- Route: `/growth/seo` (+ `?view=quadrant`) + `/growth/seo/report`.
- Viewports: desktop 1440×900 + 390×844.
- Required steps: agent auth **client** persona → `/growth/seo` → Resumen → Evolución → Quadrant → cross-link AEO (verificar navegación) → back → `[Ver informe]` → report → estado print.
- Required captures: dashboard resumen, evolución (Y invertido), quadrant 360, report web, locked (persona sin assignment).
- Required `data-capture` markers: `seo-client-dashboard`, `seo-client-evolution`, `seo-client-quadrant`, `seo-client-report`, `seo-client-locked`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, charts `role=img`, cuadrante label textual, masterDetail active state.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px (masterDetail → drawer compact; report A4 no desborda).
- Accessibility/focus checks: navigator active state, Y invertido documentado, cross-link accesible.
- Reduced-motion evidence: charts sin animación con `prefers-reduced-motion`.

## Design Decision Log

- Decision: este surface son 3 nodos (S5/S6/S7) de un mismo flujo, no 3 pantallas sueltas — conectados por el master flow EPIC-022. Alternatives considered: dashboard, quadrant y report como tasks/flows independientes (rechazado — el valor es la continuidad dashboard→quadrant→report + el cruce recíproco AEO). Why this pattern: info-architecture — surfaces como nodos de un sistema (Search Visibility 360), no islas.
- Decision: report = 3.er render adapter del MISMO `ReportArtifactModel`, NO forkea. Why: EPIC-022 §7 / EPIC-020 §1 (regla de oro); el boundary es reusa-el-model.
- Decision: quadrant con ejes ortogonales SEO×AEO, cross-link recíproco. Why: arch §1.1 — nunca fusionar SEO y AEO en un número; el cruce es derived read (`readSeoAeoGap`) + navegación, no merge.
- Decision: masterDetail (reuse TASK-1248). Why: navigator + detail canvas ya validado; en compact colapsa a drawer.
- Reuse / extend / new primitive: reuse (masterDetail + report model); new acotado (quadrant/line ECharts lazy + `modelFromSeoReport` adapter).
- Open risks: `readSeoAeoGap`/`readRankEvolution` (backend TASK-1305/1303) deben existir antes de datos reales; el lado AEO del quadrant puede faltar (→ "falta la mitad IA", `sin_dato`).
- Follow-up: PDF `renderSeoReportPdf` (espejo TASK-1273) si se difiere; público "SEO quick check" (diferido).

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided (read-only cliente).
- [ ] Failure paths are user-safe and do not expose internals (disclosure clientPortal/attachment).
- [ ] GVC sequence captures prove the flow (dashboard→quadrant→AEO→report), not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
- [ ] This flow references the EPIC-022 master flow and declares its nodes (S5/S6/S7).
