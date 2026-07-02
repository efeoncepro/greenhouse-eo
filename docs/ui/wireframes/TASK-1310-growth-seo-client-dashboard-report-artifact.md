# TASK-1310 / `/growth/seo` + `/growth/seo/report` — Client Dashboard + Report Artifact + 360 Quadrant

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1310 — Growth SEO: Client Dashboard + Report Artifact + 360 Quadrant`
- Product Design asset: sin PNG dedicado — dirección derivada del **report artifact aprobado del AEO** (`src/components/growth/ai-visibility/report-artifact/**`, TASK-1252, baseline GVC `ai-visibility-report-artifact-approved-v1`) que este surface **mirror-ea (mismo model, 3.er render adapter)** + master flow EPIC-022 (S5/S6/S7) + matriz mental 360 (arch §2.1/§10.4 quadrant 2×2).
- Intended consumers: cliente contratado (Grupo Berel) en el portal; el report artifact es imprimible/PDF (adjunto). Nexa como consumer del mismo model.
- Copy source: `src/lib/copy/growth.ts` (namespace nuevo `GH_GROWTH_SEO_CLIENT`, es-CL, tono cliente) — el report artifact reusa el copy del model compartido donde aplica.
- Primitive decision: `reuse` — CompositionShell `masterDetail` (ya existe, TASK-1248), `report-artifact/model.ts` + adapters (TASK-1252, **NO forkear**), `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseChip`; `new` acotado: quadrant scatter 2×2 (ECharts) + un **3.er render adapter** `report-artifact/*` para SEO (mirror del web/print del AEO, mismo `ReportArtifactModel`).
- UI ready target: `no`

## Brief

- Primary user: cliente contratado (marketing lead de un Globe client, ej. Berel) auto-atendiéndose en el portal.
- User moment: entra al portal a ver el estado de su visibilidad en búsqueda; quiere entender dónde rankea, descargar un informe presentable, y ver la foto 360 (SEO × AEO).
- Job to be done: leer un dashboard **curado, honesto, mono-Space** de SU dominio → ver el **quadrant 360** (dominante/riesgo/oportunidad/invisible) → cross-link a AEO → descargar el **report artifact** (web/PDF) para compartir internamente.
- Primary decision signal: el **cuadrante** donde cae la marca (SEO×AEO) + la **evolución de posición** de sus URLs clave (la película, arch §11 = conversación de renovación). El report es la síntesis presentable.
- Non-goals: datos crudos de operador (provider_cost, competidores por nombre fuera de lo público-safe, acciones de configuración/re-crawl), editar keywords, ver el histórico completo de otros Spaces.

## Layout Skeleton

### Superficie A — Dashboard `/growth/seo` (CompositionShell `masterDetail`)

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Breadcrumb `Inicio / SEO` + título "SEO — Visibilidad en búsqueda" + leyenda medido ●/estimado ◑ + `[Ver informe]` (→ `/growth/seo/report`) | `GreenhouseBreadcrumbs` | org del portal (mono-Space) |
| 1 | Navigator (aside, IZQ angosto) | Secciones: **Resumen** · **Evolución** · **Quadrant 360** — active state | `masterDetail` navigator | — |
| 2 | Detail — Resumen | Visibility score + top-3/top-10 + top URLs (curado) | KPI cards + `DataTableShell` (URLs) | `readRankSnapshotLatest` (curado) |
| 2 | Detail — Evolución | Line multi-serie (Y invertido = posición) de URLs clave + Δ30d | ECharts line (lazy) | `readRankEvolution(targetId, {range})` |
| 2 | Detail — Quadrant 360 | Quadrant scatter 2×2 SEO×AEO + cross-link a AEO | ECharts scatter (lazy) | `readSeoAeoGap(targetId)` |

### Superficie B — Report artifact `/growth/seo/report`

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Report header/masthead | Marca Efeonce + dominio + fecha + `[Descargar PDF]` / print | `report-artifact/web` (SEO adapter) | `ReportArtifactModel` (SEO) |
| 1 | Report body | Secciones del model (verdict/dimensiones/quadrant/tendencia/recomendaciones/provenance/disclaimer) según disclosure `clientPortal`/`attachment` | `report-artifact/web` + `report-artifact/print` (SEO adapters) | `ReportArtifactModel` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.client.header.title` | A0 | SEO — Visibilidad en búsqueda | — | title cliente |
| `growth.seo.client.header.subtitle` | A0 | Dónde rankea {domain} y cómo evoluciona | `{domain}` | |
| `growth.seo.client.action.viewReport` | A0 | Ver informe | — | → `/growth/seo/report` |
| `growth.seo.client.nav.summary` | A1 | Resumen | — | navigator |
| `growth.seo.client.nav.evolution` | A1 | Evolución | — | |
| `growth.seo.client.nav.quadrant` | A1 | Search Visibility 360 | — | |
| `growth.seo.client.summary.visibility` | A2 | Visibilidad | — | KPI |
| `growth.seo.client.summary.top3` | A2 | Keywords en top 3 | — | |
| `growth.seo.client.summary.top10` | A2 | Keywords en top 10 | — | |
| `growth.seo.client.evolution.title` | A2 | Evolución de posición | — | |
| `growth.seo.client.evolution.aria` | A2 | Evolución de la posición de {count} URLs en el tiempo; más arriba es mejor | `{count}` | Y invertido documentado |
| `growth.seo.client.evolution.yAxisNote` | A2 | Posición 1 = arriba = mejor | — | leyenda del eje invertido |
| `growth.seo.client.quadrant.title` | A2 | Search Visibility 360 | — | |
| `growth.seo.client.quadrant.subtitle` | A2 | Cómo te ve la búsqueda clásica (SEO) y la búsqueda con IA (AEO) | — | |
| `growth.seo.client.quadrant.q.dominant` | A2 | Dominante | — | rankeas + te citan |
| `growth.seo.client.quadrant.q.risk` | A2 | En riesgo | — | rankeas, IA no te cita |
| `growth.seo.client.quadrant.q.opportunity` | A2 | Oportunidad | — | IA te cita, no rankeas |
| `growth.seo.client.quadrant.q.invisible` | A2 | Invisible | — | ambos bajos |
| `growth.seo.client.quadrant.crosslink` | A2 | ¿Te cita la IA? Ver AEO | — | cross-link → `/aeo` |
| `growth.seo.client.quadrant.aria` | A2 | Posición de la marca en cuatro cuadrantes según citabilidad en IA (eje X) y posición SEO (eje Y) | — | aria del `role=img` |
| `growth.seo.report.action.downloadPdf` | B0 | Descargar PDF | — | |
| `growth.seo.report.masthead.subtitle` | B0 | Informe de visibilidad en búsqueda | — | |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | dashboard/report poblados | — | default |
| loading | — | navigator + detail skeleton; report skeleton | — | |
| empty (sin datos) | Aún no hay datos de tu visibilidad | Cuando registremos tus primeros snapshots de búsqueda, aparecerán aquí. | — | target sin snapshots |
| sin conexión GSC | Conecta Search Console | Para ver tus clicks y posición reales, tu equipo debe conectar Google Search Console. | Solicitar conexión | arch §10.5 — nunca ceros fantasma |
| quadrant sin AEO | Falta la mitad IA | Aún no tenemos tu diagnóstico de citabilidad en IA. Con él completamos tu foto 360. | Ver AEO | `readSeoAeoGap` con lado AEO vacío → `sin_dato`, NO 0 |
| partial / degraded | — | "Estamos mostrando datos medidos (Search Console); los estimados de mercado no están disponibles ahora." | — | cuota/fallo parcial, `observeAndDegrade` |
| error | No pudimos cargar tu SEO | Hubo un problema. Intenta de nuevo. | Reintentar | reader falla |
| denied / locked | SEO no está activo en tu plan | Habla con tu equipo de Efeonce para activar Search Visibility 360. | — | sin `module_assignment=active`; teaser/upsell (patrón EPIC-020 S6, diferido) |

## Accessibility Contract

- Heading order: `h1` "SEO — Visibilidad en búsqueda" → `h2` por sección del navigator; en report, `h1` masthead → `h2` por sección del model.
- Chart/table alternatives: line de evolución con `role="img"` + aria (`evolution.aria`) + **posición invertida documentada** ("Posición 1 = arriba = mejor", flecha abajo verde = mejora); quadrant con `role="img"` + aria; ambos con tabla/texto alternativo (URLs con Δ; cuadrante con label textual del cuadrante donde cae la marca).
- Aria labels: cross-link a AEO como `<a>` con nombre accesible; `[Descargar PDF]` con `aria-label`.
- Focus notes: navegar secciones del navigator mantiene foco; cross-link a `/aeo` = navegación normal (back restaura).
- Color-independent state labels: cuadrantes = color + **label textual** (Dominante/En riesgo/Oportunidad/Invisible); medido ● / estimado ◑ con texto; nunca color solo.

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/growth/seo/page.tsx` (dashboard) + `src/app/(dashboard)/growth/seo/report/page.tsx` (report). **routeGroup `client`** — server guard: `module_assignment` activo per-org + capability `growth.seo.report.read_client` (report) / `growth.seo.observation.read` (dashboard); redirect defensivo si el tenant no tiene el módulo. [verificar viewCode cliente canónico].
- Primitives: CompositionShell `masterDetail` (TASK-1248, ya existe), `report-artifact/model.ts` + adapters (TASK-1252, reuse — **no forkea scoring ni ECharts del AEO**), `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseChip`, `DataTableShell` (top URLs).
- Variants / kinds: `masterDetail` (navigator IZQ + detail DER; drawer del detail en compact). Report artifact SEO = **3.er render adapter** que consume el MISMO `ReportArtifactModel` vía un nuevo `modelFromSeoReport(...)` que mapea el DTO SEO (arch §7 `readSeoAeoGap`/`readRankEvolution`) a la shape del model — **el boundary es: reusa el model, no lo forkea** (mirror de `modelFromClientReport`).
- Component candidates: `src/views/greenhouse/growth/seo/client/SeoClientDashboardView.tsx` + `SeoRankEvolutionChart.tsx` + `SeoAeoQuadrant.tsx`; report: `src/components/growth/seo/report-artifact/**` (web + print adapters) espejo de `ai-visibility/report-artifact/**`.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_CLIENT` (nuevo, es-CL, tono cliente); report reusa el copy del model compartido.
- Data reader / command: `readSeoAeoGap(targetId)` (TASK-1305 `[verificar]`) + `readRankEvolution(targetId, {range})` (TASK-1303 `[verificar]`) + `readRankSnapshotLatest` (curado). Sin commands (read-only cliente).
- API parity: la UI es cliente de readers gobernados; el report deriva del MISMO model que el AEO (Full API Parity → Nexa por construcción). El quadrant NO reconcilia SEO×AEO en un número — los muestra ortogonales (arch §1.1).
- Access / capability: `growth.seo.observation.read` (dashboard) + `growth.seo.report.read_client` (report); Locked/teaser sin `module_assignment=active`.
- Runtime consumers: view runtime (dashboard) + report artifact (web + print/PDF).
- Print/email/PDF considerations: el report artifact SEO = 3.er render adapter (web `clientPortal` + print/`attachment`); el PDF sigue el patrón `renderAiVisibilityReportPdf` (TASK-1273) — mismo `ReportArtifactModel`, misma infra PDF `finance/pdf`-like. Disclosure `clientPortal`/`attachment` (público-safe; sin engine snapshot crudo, sin provider_cost).
- GVC markers: `seo-client-dashboard`, `seo-client-evolution`, `seo-client-quadrant`, `seo-client-report`, `seo-client-locked`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-client.scenario.ts` (+ `.mobile`) + `growth-seo-report.scenario.ts` [verificar DSL].
- Route: `/growth/seo` (dashboard, secciones Resumen/Evolución/Quadrant) + `/growth/seo/report` (report).
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar `/growth/seo` (agent auth **client** persona) → navegar Resumen → Evolución → Quadrant 360 → click cross-link AEO (verificar navegación) → volver → `[Ver informe]` → mirar report → estado print.
- Required captures: dashboard resumen, evolución (line Y invertido), quadrant 360, report web, locked (persona sin assignment), empty (sin GSC).
- Required `data-capture` markers: `seo-client-dashboard`, `seo-client-evolution`, `seo-client-quadrant`, `seo-client-report`, `seo-client-locked`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, charts `role=img`, cuadrante con label textual, masterDetail navigator con active state.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px (masterDetail colapsa a drawer en compact; report A4 no desborda).
- Accessibility/focus checks: navigator active state, Y invertido documentado, cross-link accesible, cuadrante label textual.
- Reduced-motion evidence: charts sin animación de entrada con `prefers-reduced-motion`; report estático.

## Design Decision Log

- Decision: el report artifact SEO es un **3.er render adapter del MISMO `ReportArtifactModel`** (mirror TASK-1252), NO un artefacto nuevo. Alternatives considered: un report SEO independiente (rechazado — duplica scoring, disclosure y charts, drift garantizado). Why this pattern: regla de oro EPIC-020 §1 / EPIC-022 §7 — un modelo, muchos renders; la diferencia es disclosure + chrome, nunca el contenido base. **Boundary duro: reusa el model, no lo forkea** — se agrega un `modelFromSeoReport(...)` adapter (espejo de `modelFromClientReport`), no se toca el scoring del AEO.
- Decision: quadrant scatter 2×2 SEO×AEO con ejes ortogonales, NUNCA un score fusionado. Why: arch §1.1 boundary duro — "rankeas pero no te citan" es una señal; fusionarla en un número la destruye. X = citabilidad IA, Y = posición SEO; cada cuadrante con label textual (dataviz-design quadrant pattern).
- Decision: dashboard = CompositionShell `masterDetail` (reuse de TASK-1248). Why: el navigator (Resumen/Evolución/Quadrant) + detail canvas es exactamente el patrón masterDetail ya validado; en compact colapsa a drawer (no reinventar regiones).
- Decision: cliente = curado, honesto, mono-Space (arch §10.2). Why: el cliente no ve datos crudos de operador; ve SU dominio con honest degradation (medido ●/estimado ◑, sin GSC → empty accionable, sin AEO → "falta la mitad IA" con `sin_dato` NO 0).
- Decision: cross-link recíproco a `/aeo`. Why: Search Visibility 360 (arch §2) — los dos internets de búsqueda conectados; el cliente salta entre "¿rankeo?" (SEO) y "¿me citan?" (AEO). El `/aeo` cliente ya existe (EPIC-020).
- Decision: line de evolución con **Y invertido** (1=arriba=mejor) documentado. Why: arch §10.3/§10.4 — posición baja = mejor; sin documentarlo el chart miente. Flecha abajo verde = mejora.
- Reuse / extend / new primitive: reuse (masterDetail + report model); new acotado (quadrant + line ECharts lazy + adapter SEO del model). Open risks: `readSeoAeoGap` necesita ambos lados poblados (org con grader_run + seo target enlazados por `organization_id`) — si el lado AEO falta, el quadrant muestra "falta la mitad IA" (`sin_dato`), no 0. `modelFromSeoReport` debe mapear el DTO SEO a la shape del model sin romper el leak boundary (variant `clientPortal`/`attachment`).
- Follow-up: PDF del report SEO vía `renderSeoReportPdf` (espejo TASK-1273) si se difiere del V1; público "SEO quick check" (arch §10.2, diferido).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{domain}`, `{count}`).
- [ ] Partial/degraded states are explicit (sin GSC / quadrant sin AEO / cuota degradada).
- [ ] No copy implies a guarantee when data is estimated (◑ marcado; `sin_dato` ≠ 0 en quadrant).
- [ ] Charts have table/text alternatives (line + quadrant `role=img` + label textual del cuadrante).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts (report reusa el model, NO forkea).
