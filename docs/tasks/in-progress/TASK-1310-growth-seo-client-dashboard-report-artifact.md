# TASK-1310 — Growth SEO: Client Dashboard + Report Artifact + 360 Quadrant

## Delta 2026-08-09

- **El criterio de alcanzabilidad por nav cliente quedó cerrado** por `TASK-1675`, que cableó el menú
  module-driven del portal. Verificado con la sesión real de Grupo Berel: `/growth/seo` aparece como
  ítem en su menú lateral, y `/growth/seo/report` **no** aparece como ítem propio (es ruta hija, se
  alcanza por el CTA "Ver informe" del header, como esta task declara). Evidencia:
  `scripts/frontend/baselines/client-portal-menu-with-module/desktop__menu-with-module.png`.
- Consecuencia en el manifest: `/growth/seo` **salió** de `DECLARED_CHILD_ROUTES` — declaraba
  `parent:'/home', via:'inline-link'` para un enlace que nunca existió — y pasó a
  `MODULE_COMPOSED_NAV_ROUTES`, la categoría de rutas que SÍ son ítem de menú pero cuyo `href` se
  compone en runtime. `/growth/seo/report` se queda como child route `header-cta`, que sí es correcto.
- El rollout productivo de ambas sigue gated por la misma promoción `develop → main`.
- **Queda desactualizada la atribución del hermano AEO que hace el Delta 2026-08-08.** Ahí dice que
  `cliente.ai_visibility_report` «cae al fallback y sí figura en `authorizedViews`, emitiendo
  `role_view_fallback_used`». Eso dejó de ser cierto el 2026-08-09: `TASK-1678` invirtió el default del
  fallback para `view.routeGroup === 'client'` — `computeRoleCanAccessViewFallback`
  ([src/lib/admin/view-access-store.ts](../../../src/lib/admin/view-access-store.ts)) retorna `false`
  antes de emitir telemetría — y la medición de esa task registra que **el único** viewCode que apagó por
  rol cliente fue exactamente `cliente.ai_visibility_report`. Hoy no está en `authorizedViews` de ningún
  rol cliente sin fila explícita, y ya no emite `role_view_fallback_used`. La referencia sigue siendo
  válida como precedente de **alcanzabilidad** (deep-link declarado a propósito), no como descripción del
  carril de views.
- **Lo que esta task declara sobre el gate quedó literalmente cierto, no sólo recomendado.** El criterio
  «gate per-org via `module_assignments`, NUNCA por rol» es ahora el único carril de punta a punta:
  `requireViewCodeAccess` pasó a llavear por `organizationId` (`TASK-1679`) y resuelve por módulo
  contratado. No hay que cambiar nada del diseño de esta task por eso.
- **Ojo si el dashboard o el report usan `authorizedViews` / `canSeeView` para decidir algo:** en una
  sesión cliente ese claim ya no describe lo que la persona puede abrir, y el camino degradado del
  resolver (`SCHEMA_NOT_READY`) ahora devuelve **lista vacía** para tenants `client`. La señal
  `identity.view_access.client_role_without_grants` es el detector de vistas cliente sin grant.


## Delta 2026-08-08

### Auditoría vigente — reset de implementación

La afirmación anterior de “implementación completa” y las capturas de las 09:15–09:17 quedan supersedidas
por la auditoría visual de las 10:25–10:26. La UI funciona, pero no cumple el estándar premium: el dashboard
falló axe por contraste, la leyenda tiene targets de 23 px y la composición todavía presenta card soup,
charts con lectura débil y provenance de fechas inconsistente. El estado real vuelve a **in-progress / UI
ready: no** hasta completar los lotes definidos en la
[`auditoría premium de TASK-1310`](../../ui/reviews/TASK-1310-growth-seo-client-dashboard-report-artifact-audit-2026-08-08.md).

La decisión vigente del dashboard es `CompositionShell composition='single'` con tabs SEO horizontales. No
se reintroduce un `masterDetail` ni un rail lateral SEO: el menú vertical principal mantiene su ownership.
La dirección es **Editorial Evidence Canvas** y AEO usa una estrella única (`tabler-star`/`tabler-star-off`),
nunca `tabler-sparkles`, en las superficies de esta task.

- Preflight reconciled: `TASK-1305` and `TASK-1307` are complete and their runtime contracts are
  present in `src/lib/growth/seo/**`; this task is executable. The dependency notes below remain as
  implementation context, not active blockers.
- Implementación cliente disponible en local, pendiente de la ronda premium: `/growth/seo` (dashboard `single` + tabs), `/growth/seo/report`
  (web + `?print=1`) y el cruce recíproco SEO↔AEO. Se construyeron las tres direcciones aprobadas como
  una familia: Evidence Narrative, Visibility Map y Trust Report Artifact.
- **Acceso/catálogo (corrección 2026-08-08):** la UI había agregado los viewCodes al catálogo TS, pero
  `seo_v1` seguía con `view_codes=[]`; la navegación por módulos no era construible. La migración
  `20260808131441444_task-1310-seo-client-view-codes.sql` crea `seo_v2`, supersede asignaciones
  activas —incluida Grupo Berel— y registra denials explícitos por rol. El acceso efectivo permanece
  `growth.seo.report.read_client` + tenant client + assignment per-org. **Pendiente:** aplicar la
  migración y validar la navegación con sesión client-scoped; no se abre acceso interno ni role-wide.
- Evidencia GVC local con datos reales de Berel, desktop + 390px: dashboard
  `.captures/2026-08-08T09-15-23_growth-seo-client`, report web
  `.captures/2026-08-08T09-16-33_growth-seo-report` y attachment
  `.captures/2026-08-08T09-17-46_growth-seo-report-print`. Las capturas no registran errores de
  consola, página, hidratación ni HTTP; el desktop queda sin findings axe. Mobile conserva únicamente
  warnings del shell global oculto fuera de viewport, no del contenido SEO. Se corrigieron en código
  los contrastes de breadcrumbs/navigator, roles ARIA de tablas/leyendas y el overflow de la tabla 360.
- GCloud/ADC se renovaron y el proxy de conexión PostgreSQL se verificó durante la comprobación de
  entitlement/runtime. No se ejecutó un build completo: se mantuvo el límite de recursos solicitado y
  se usaron lint, tests, gates focales y capturas canónicas acotadas.

## Delta 2026-08-05

- `readSeoAeoGap` YA existe (TASK-1305 complete): contrato `SeoAeoGapResult` en `src/lib/growth/seo/contracts.ts` + reader en `src/lib/growth/seo/gap/read-seo-aeo-gap.ts` + clasificador `classifyQuadrant` importable por la UI (leyendas). El quadrant 360 de esta task CONSUME ese contrato — no re-implementa el cruce. V1 con `aeoAxisGranularity='domain'`; degradaciones `no_seo_data`/`no_aeo_data` requieren empty states accionables.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md`
- Flow: `docs/ui/flows/TASK-1310-growth-seo-client-dashboard-report-artifact-flow.md`
- Motion: `none`
- Backend impact: `access catalog migration`
- Epic: `EPIC-022`
- Status real: `Avanzada, premium rework en progreso` — baseline funcional local; rollout bloqueado por auditoría visual/GVC
- Rank: `TBD`
- Domain: `growth|ui|ai`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Hybrid Execution Justification

La task sigue siendo principalmente `ui-ux`, pero la navegación cliente depende de un catálogo
append-only de módulos. El viewCode y su `module_assignment` son un único contrato de acceso: sin la
migración `seo_v1 → seo_v2`, la UI queda alcanzable por deep-link pero no compuesta por el portal.
El slice de datos se limita a registrar/superseder ese catálogo y a su paridad; no agrega reader,
API, dato de negocio ni superficie interna nuevos.

## Summary

Construye la cara cliente del módulo SEO: un **dashboard self-service mono-Space** (`/growth/seo`, curado + honesto), un **report artifact** (`/growth/seo/report`, imprimible/PDF) que es el **3.er render adapter del MISMO `ReportArtifactModel`** que el AEO (mirror TASK-1252, **NO forkea** scoring ni charts), y un **quadrant scatter 2×2 SEO×AEO** ("Search Visibility 360": dominante/riesgo/oportunidad/invisible) con cross-link recíproco al AEO. Cliente puro de `readSeoAeoGap` + `readRankEvolution`.

## Why This Task Exists

El módulo SEO (EPIC-022) es "una capacidad interna + una puerta contratada client-facing" (arch §11) — sin la cara cliente, el valor del retainer no se materializa para el cliente contratado (Grupo Berel). El diferenciador de categoría (arch §2) es **Search Visibility 360**: los dos internets de búsqueda (SEO orgánico + IA generativa) en un panel. Ese cruce SEO×AEO no existe todavía como superficie; y el entregable presentable (report) debe reusar el model del AEO, no duplicarlo (regla de oro: un modelo, muchos renders).

## Goal

- Crear `/growth/seo` (dashboard mono-Space, routeGroup `client`) con Resumen + Evolución + Quadrant 360, gateado por `module_assignment=active` (per-org, NUNCA por rol).
- Crear `/growth/seo/report` como **3.er render adapter** del `ReportArtifactModel` (web `clientPortal` + print/`attachment`), reusando el model del AEO sin forkearlo.
- Renderizar el **quadrant SEO×AEO** (`readSeoAeoGap`, ejes ortogonales, cross-link recíproco a `/aeo`) con honest degradation (`sin_dato` ≠ 0).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary: nunca fusionar SEO×AEO en un número), §2 (Search Visibility 360 / matriz mental 360), §7 (`readSeoAeoGap`, `readRankEvolution`), §9 (entitlement per-org via `module_assignments`), §10.2 (cliente curado/honesto/mono-Space), §10.3/§10.4 (Y invertido de posición, quadrant 2×2), §10.5 (estados / medido ●-estimado ◑ / sin GSC), §11 (packaging: histórico solo detrás de la puerta contratada).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — el motor hermano (report artifact TASK-1252 que este surface mirror-ea).
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` — nodos **S5/S6/S7** del master flow + §7 (el cruce).
- `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` — §1 regla de oro (un modelo, muchos renders) + el `/aeo` cliente (cross-link target).
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` — variant `masterDetail` (TASK-1248).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — `module_assignments` per-org.

Reglas obligatorias:

- **NUNCA** fusionar SEO y AEO en un número (arch §1.1); el quadrant los muestra ortogonales (X citabilidad IA, Y posición SEO). El cruce es derived read (`readSeoAeoGap`), NUNCA merge de tablas.
- **El report artifact SEO reusa el `ReportArtifactModel` (TASK-1252), NO lo forkea** — se agrega un adapter `modelFromSeoReport(...)` (espejo de `modelFromClientReport`); no se toca el scoring del AEO ni sus ECharts. La diferencia es disclosure + chrome, nunca el contenido base.
- Gate **per-org via `module_assignments`** (arch §9, lección TASK-1248), NUNCA por rol. Sin assignment → Locked/teaser.
- Cliente = curado, honesto, mono-Space (arch §10.2): sin datos crudos de operador (provider_cost, competidores fuera de lo público-safe, config).
- Honest degradation (arch §10.5): sin GSC → empty accionable (nunca ceros); quadrant sin lado AEO → "falta la mitad IA" (`sin_dato`, NO 0); cuota → degrada a medido.
- Line de evolución con **Y invertido** (1=arriba=mejor) documentado (arch §10.3/§10.4); flecha abajo verde = mejora.
- Disclosure del report = `clientPortal`/`attachment` (público-safe; sin engine snapshot crudo, sin razón interna).
- Toda `page.tsx` nueva → `route-reachability-manifest.ts` + nav cliente; redirect defensivo si el tenant no tiene el módulo.
- Copy en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_CLIENT`, es-CL, tono cliente, `greenhouse-ux-writing`).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/ui/wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md`
- `docs/ui/flows/TASK-1310-growth-seo-client-dashboard-report-artifact-flow.md`
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` (master)

## Dependencies & Impact

### Depends on

- `TASK-1305` — reader `readSeoAeoGap(targetId)` (derived read cross-módulo `seo_rank_snapshots` × `grader_scores`). **[verificar]** existencia en `src/lib/growth/seo/`.
- `TASK-1307` — ★ Rank & URL performance (establece el patrón line multi-serie Y invertido + `readRankEvolution` que el dashboard cliente reusa curado). **[verificar]**.
- `TASK-1252` — `ReportArtifactModel` + adapters (`src/components/growth/ai-visibility/report-artifact/**`) — **existe**, este surface lo reusa vía un nuevo adapter SEO.
- `TASK-1301` — capabilities `growth.seo.*` (`observation.read`, `report.read_client`) + `module_assignments`.

### Blocks / Impacts

- Materializa el valor del retainer para el cliente contratado (arch §11) + el diferenciador Search Visibility 360.
- Alimenta `is_at_risk`/ICO: visibilidad cayendo = riesgo churn (arch §11).

### Files owned

- `src/app/(dashboard)/growth/seo/page.tsx` [verificar route group] (dashboard, routeGroup `client`)
- `src/app/(dashboard)/growth/seo/report/page.tsx` (report)
- `src/views/greenhouse/growth/seo/client/SeoClientDashboardView.tsx`
- `src/views/greenhouse/growth/seo/client/SeoRankEvolutionChart.tsx`
- `src/views/greenhouse/growth/seo/client/SeoAeoQuadrant.tsx`
- `src/components/growth/seo/report-artifact/**` (web + print adapters, espejo de `ai-visibility/report-artifact/**`) + adapter `modelFromSeoReport`
- `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_CLIENT`)
- `src/lib/navigation/route-reachability-manifest.ts`
- `scripts/frontend/scenarios/growth-seo-client.*` + `growth-seo-report.*` [verificar DSL]

## Current Repo State

### Already exists

- `report-artifact/model.ts` (`ReportArtifactModel`, `modelFromClientReport`, disclosure matrix) + web/print/pdf adapters (`src/components/growth/ai-visibility/report-artifact/**`, TASK-1252/1273).
- CompositionShell variant `masterDetail` (TASK-1248), `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseChip`, `DataTableShell`.
- `/aeo` cliente (cross-link target, EPIC-020).
- `readSeoAeoGap` + `classifyQuadrant` (TASK-1305) y `readRankEvolution` (TASK-1303/1307), además del stack ECharts lazy de la pantalla ancla de TASK-1307.

### Gap

- No existe `readRankSnapshotLatest`; el resumen debe derivar la última observación honesta desde `readRankEvolution` o un reader existente, sin inventar un reader paralelo.
- No existe un adapter SEO del `ReportArtifactModel` (`modelFromSeoReport`) ni `src/components/growth/seo/report-artifact/**`.
- No existen las rutas cliente `/growth/seo` + `/growth/seo/report` ni el quadrant SEO×AEO.
- No existe aún el copy `GH_GROWTH_SEO_CLIENT`, los escenarios GVC ni la dirección visual dedicada de esta surface.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/**`, `src/views/greenhouse/growth/**` y `src/components/growth/**` del portal Greenhouse.
- Future candidate home: `portal` (la superficie es client-facing; los primitives compartidos permanecen en Greenhouse hasta evidencia de extracción).
- Boundary: `readSeoAeoGap`/`readRankEvolution` + `ReportArtifactModel`; las rutas y views son adapters de lectura y render, sin recalcular SEO×AEO ni duplicar scoring.
- Server/browser split: readers, entitlement/capability guards y resolución de tenant permanecen server-side; charts y render adapters reciben DTOs browser-safe sin DB, secretos ni SDKs de provider.
- Build impact: ECharts se reutiliza desde la instalación lazy existente de TASK-1307; el report agrega adapters y no crea un segundo runtime de PDF.
- Extraction blocker: `none`.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente contratado (marketing lead de Globe client) en el portal.
- Momento del flujo: entra a ver su visibilidad en búsqueda self-service.
- Resultado perceptible esperado: entiende dónde rankea (Resumen) → cómo evoluciona (Evolución) → dónde cae en la foto 360 (Quadrant) → descarga el informe; o salta al AEO.
- Friccion que debe reducir: pedirle el reporte al AM; leer SEO y AEO en herramientas separadas.
- No-goals UX: datos crudos de operador, editar keywords/config, correr runs, ver otros Spaces.

### Surface & system decision

- Surface: `/growth/seo` (dashboard) + `/growth/seo/report` (report) — **routeGroup `client`** → gate `module_assignment=active` per-org, redirect defensivo si el tenant no tiene el módulo.
- Composition Shell: `aplica` — dashboard usa `masterDetail` (navigator Resumen/Evolución/Quadrant + detail canvas); report es un render adapter del model.
- Primitive decision: `reuse` (CompositionShell `masterDetail`, `report-artifact/model.ts` + adapters, GreenhouseBreadcrumbs, EmptyState, GreenhouseChip, DataTableShell) + `new` acotado (quadrant scatter 2×2 + line ECharts lazy + adapter SEO del model `modelFromSeoReport` + `src/components/growth/seo/report-artifact/**`).
- Adaptive density / The Seam: `aplica` — masterDetail colapsa a drawer en compact; report A4 no desborda; top URLs condensan.
- Floating/Sidecar/Dialog decision: masterDetail detail = drawer en compact (no-modal); sin dialog (read-only).
- Copy source: `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_CLIENT`) + copy del model compartido en el report.
- Access impact: `views|entitlements` — routeGroup `client`, `module_assignment=active` + capability `growth.seo.report.read_client` (dashboard + report, scope `own`). `growth.seo.observation.read` queda reservado al cockpit operador. **NUNCA** `client_*` gate por rol (lección TASK-1248).

### State inventory

- Default: dashboard/report poblados.
- Loading: navigator + detail skeleton; report skeleton.
- Empty: sin snapshots ("Aún no hay datos de tu visibilidad").
- Sin conexión GSC: "Conecta Search Console" + CTA (nunca ceros fantasma).
- Quadrant sin AEO: "Falta la mitad IA" + cross-link AEO (`sin_dato`, NO 0).
- Error: reader falla → "No pudimos cargar tu SEO" + Reintentar.
- Degraded / partial: cuota → "mostrando datos medidos; estimados no disponibles" (`observeAndDegrade`).
- Permission denied / locked: sin `module_assignment=active` → "SEO no está activo en tu plan" + teaser/upsell (patrón EPIC-020 S6, diferido).
- Long content: report scroll interno; sin scroll horizontal.
- Mobile / compact: masterDetail → drawer; report apilado.
- Keyboard / focus: navigator con active state + foco; cross-link accesible; back restaura.
- Reduced motion: charts sin animación de entrada; report estático.

### Interaction contract

- Primary interaction: navegar secciones (Resumen/Evolución/Quadrant) → cross-link AEO → "Ver informe" → descargar PDF/print.
- Hover / focus / active: navigator active state (`aria-current`); hover en charts → tooltip.
- Pending / disabled: N/A (read-only); descargar PDF con feedback de generación.
- Escape / click-away: drawer compact cierra con Escape restaurando foco al navigator.
- Focus restore: back desde report/AEO restaura foco a la sección/cross-link de origen.
- Latency feedback: skeleton por sección; descargar PDF muestra estado de generación.
- Toast / alert behavior: feedback de descarga; degradación como banner honesto (no toast efímero).

### Motion & microinteractions

- Motion primitive: `CSS` + entrada nativa de ECharts (≤400ms)
- Enter / exit: entrada ligera de charts; masterDetail sin morph pesado.
- Layout morph: Composition Shell `masterDetail` (navigator↔detail); drawer compact.
- Stagger: N/A.
- Timing / easing token: tokens del design system; chart ≤400ms.
- Reduced-motion fallback: charts sin animación; report estático.
- Non-goal motion: animación decorativa en el report (es un entregable, no una demo).

### Implementation mapping

- Route / surface: `src/app/(dashboard)/growth/seo/page.tsx` + `src/app/(dashboard)/growth/seo/report/page.tsx` (routeGroup `client`; server guard: `module_assignment` activo + capability por ruta; redirect defensivo).
- Primitive / variant / kind: CompositionShell `masterDetail`; `report-artifact/model.ts` + nuevo adapter `modelFromSeoReport`; web (`clientPortal`) + print (`attachment`) adapters SEO; quadrant + line = ECharts config (lazy `ssr:false`).
- Component candidates: `SeoClientDashboardView.tsx` + `SeoRankEvolutionChart.tsx` + `SeoAeoQuadrant.tsx` + `src/components/growth/seo/report-artifact/**`.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_CLIENT`; report reusa copy del model.
- Data reader / command: `readSeoAeoGap(targetId)` (TASK-1305) + `readRankEvolution(targetId, {range})` (TASK-1307). El resumen deriva la última observación desde la evolución; no se crea un reader paralelo. Sin commands (read-only cliente).
- API parity: UI cliente de readers gobernados; el report deriva del MISMO model que el AEO (Nexa por construcción). El quadrant NO reconcilia SEO×AEO en un número.
- Access / capability: `growth.seo.report.read_client` (dashboard + report); Locked/teaser sin `module_assignment=active`.
- States to implement: default, loading, empty, sin-GSC, quadrant-sin-AEO, error, degraded, locked, mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-client.scenario.ts` (+ `.mobile`) + `growth-seo-report.scenario.ts` [verificar DSL].
- Route: `/growth/seo` (+ `?view=quadrant`) + `/growth/seo/report`.
- Viewports: desktop 1440×900 + 390×844.
- Required steps: agent auth **client** persona → `/growth/seo` → Resumen → Evolución → Quadrant → cross-link AEO (navegación) → back → "Ver informe" → report → print.
- Required captures: dashboard resumen, evolución (Y invertido), quadrant 360, report web, locked (sin assignment), empty (sin GSC).
- Required `data-capture` markers: `seo-client-dashboard`, `seo-client-evolution`, `seo-client-quadrant`, `seo-client-report`, `seo-client-locked`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, charts `role=img`, cuadrante label textual, masterDetail active state.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px.
- Reduced-motion / focus evidence: charts sin animación; navigator active state + foco; Y invertido documentado.

### Design decision log

- Decision: report SEO = 3.er render adapter del MISMO `ReportArtifactModel`, NO forkea. Alternatives considered: report SEO independiente (rechazado — duplica scoring/disclosure/charts, drift). Why this pattern: regla de oro EPIC-020 §1 / EPIC-022 §7. Boundary: `modelFromSeoReport` adapter (espejo `modelFromClientReport`); no toca scoring del AEO.
- Decision: quadrant 2×2 con ejes ortogonales SEO×AEO, cross-link recíproco. Why: arch §1.1 (nunca fusionar); cruce = derived read + navegación.
- Decision: dashboard = `masterDetail` (reuse TASK-1248). Why: navigator + detail ya validado; compact → drawer.
- Decision: cliente curado/honesto/mono-Space; gate per-org (`module_assignments`), NUNCA por rol. Why: arch §10.2/§9 + lección TASK-1248.
- Decision: line Y invertido documentado. Why: arch §10.3/§10.4 (posición baja = mejor).
- Reuse / extend / new primitive: reuse (masterDetail + report model); new acotado (quadrant/line ECharts + adapter SEO). Open risks: `readSeoAeoGap` necesita ambos lados poblados (org con grader_run + seo target por `organization_id`); `modelFromSeoReport` no debe romper el leak boundary (`clientPortal`/`attachment`).

### Visual verification

- GVC scenario: `growth-seo-client` + `growth-seo-report`
- Viewports: desktop + 390px.
- Required captures: dashboard resumen, evolución, quadrant, report web, locked, empty.
- Required `data-capture` markers: `seo-client-dashboard`, `seo-client-evolution`, `seo-client-quadrant`, `seo-client-report`, `seo-client-locked`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: charts `role=img`; cuadrante label textual; Y invertido documentado; cross-link accesible.
- Before/after evidence: N/A páginas nuevas; baseline diff del report vs el artifact AEO aprobado (mismo model).
- Known visual debt: primer ECharts del repo (bundle lazy); depende de `readSeoAeoGap`/`readRankEvolution`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader` (consumer; nuevo adapter puro `modelFromSeoReport`, sin IO)
- Source of truth afectado: ninguno nuevo; consume `readSeoAeoGap`/`readRankEvolution` (TASK-1305/1303) + `ReportArtifactModel` (TASK-1252).
- Consumidores afectados: UI cliente SEO + report artifact.
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: `ReportArtifactModel` + disclosure matrix (TASK-1252, leak-safe por tipo); readers SEO (arch §7).
- Contrato nuevo o modificado: `modelFromSeoReport(seoReportDto, variant)` — adapter PURO (sin IO, sin JSX) que mapea el DTO SEO a la shape del model, espejo de `modelFromClientReport`. NO modifica el model ni el scoring del AEO.
- Backward compatibility: `applicable` — el nuevo adapter no toca los adapters existentes del AEO (aditivo).
- Full API parity: la UI es cliente de readers gobernados; el report deriva del model compartido, operable por Nexa por construcción.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva por esta task (consume readers).
- Invariantes que no se pueden romper:
  - **NO forkear el `ReportArtifactModel`** — solo agregar adapter DTO→model.
  - El leak boundary del report (`clientPortal`/`attachment` = público-safe) se preserva por tipo; NUNCA exponer engine snapshot crudo / provider_cost / competidores no público-safe al cliente.
  - El quadrant NO fusiona SEO×AEO en un número (arch §1.1).
- Tenant/space boundary: mono-Space del cliente; gate per-org via `module_assignments` (NUNCA por rol).
- Idempotency/concurrency: N/A (read-only).
- Audit/outbox/history: N/A (reads).

### Migration, backfill and rollout

- Migration posture: `pending` — `20260808131441444_task-1310-seo-client-view-codes.sql` debe crear
  `seo_v2`, superseder assignments `seo_v1` y registrar los dos viewCodes antes del rollout.
- Default state: `GROWTH_SEO_ENABLED` OFF + sin `module_assignment` → Locked/teaser.
- Backfill plan: none.
- Rollback path: revert rutas/nav + flag OFF; revocar `module_assignment` (arch §13 reversibilidad).
- External coordination: grant de `module_assignment` per-org al cliente contratado (Grupo Berel) — operador via `entitlement.manage`.

### Security and access

- Auth/access gate: sesión cliente + `module_assignment=active` + capability por ruta.
- Sensitive data posture: disclosure `clientPortal`/`attachment` (público-safe); NUNCA raw provider / razón interna / costo.
- Error contract: mapear errores canónicos a estados UI sanitizados; sin GSC / quadrant sin AEO como estados honestos (no error genérico).
- Abuse/rate-limit posture: cliente autenticado; sin superficie de abuso pública (el público "quick check" es diferido).

### Runtime evidence

- Hook y gates estructurales: `pnpm codex:task-hook TASK-1310 --json`, `pnpm task:lint --task TASK-1310`
  y `pnpm route-reachability-gate` pasan; el catálogo client, menú y reachability registran ambas rutas.
- Tests focales: 3 archivos, 28 tests verdes, incluyendo `modelFromSeoReport`, no-leak y boundary de
  `readSeoAeoGap`; ESLint focal de las superficies y primitives modificadas pasa.
- Runtime client-scoped: `/growth/seo` responde con Grupo Berel, 31 keywords y corte 2026-08-05;
  `/growth/seo/report` renderiza web y attachment con disclosure público-safe. El report no expone
  `providerCostUsd`, engine snapshot crudo ni razón interna.
- GVC local con datos reales de Berel, desktop + 390px: dashboard
  `.captures/2026-08-08T09-15-23_growth-seo-client`, report web
  `.captures/2026-08-08T09-16-33_growth-seo-report` y attachment
  `.captures/2026-08-08T09-17-46_growth-seo-report-print`. Las capturas canónicas terminaron sin
  errores de consola, página, hidratación ni HTTP; el contenido SEO desktop queda sin findings axe.
  Mobile report conserva warnings de layout del nav global cerrado y el print trigger puede activar un
  control global sin nombre; quedan como deuda de shell, no como fallo del artefacto SEO.
- GCloud/ADC renovados con `pnpm gcloud:auth:playwright -- --force`; proxy PostgreSQL verificado en
  la misma sesión de consulta. No se ejecutó el build completo por el guard de recursos; el typecheck
  global tampoco se repite porque su baseline ya agotó memoria en este checkout.
- Pendiente de rollout: captura canónica en staging con el deployment vigente, baseline diff contra el
  artifact AEO aprobado y promoción develop→main. La frescura continúa enlazada a
  `seo.rank.capture_lag`; el cliente no calcula salud.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths (`readSeoAeoGap`, `readRankEvolution`, `ReportArtifactModel`, `modelFromSeoReport`).
- [x] Data invariants explicit: NO forkear el model; leak boundary preservado; quadrant no fusiona SEO×AEO.
- [x] Migration/backfill/rollback posture explicit (none; flag OFF + revoke assignment).
- [x] Runtime evidence listed (no-leak test del adapter SEO + staging pendiente explícitamente).
- [x] Sensitive posture: report `clientPortal`/`attachment` público-safe, sin raw provider / razón interna / costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dashboard shell (`/growth/seo`) + gate + estados

- Crear `/growth/seo` (routeGroup `client`) con gate `module_assignment=active` + `report.read_client`; redirect defensivo si el tenant no tiene el módulo.
- CompositionShell `masterDetail` (navigator Resumen/Evolución/Quadrant + detail canvas); breadcrumb + leyenda ●/◑.
- Estados loading/empty/sin-GSC/error/degraded/locked honestos.
- Registrar en `route-reachability-manifest.ts` + nav cliente.

### Slice 2 — Resumen + Evolución (line Y invertido)

- Detail Resumen: visibilidad + posición media + top-3/top-10 derivados de la última observación disponible en `readRankEvolution`.
- Detail Evolución: line multi-serie ECharts (Y invertido documentado) de URLs clave + Δ30d (`readRankEvolution`, reuse del patrón TASK-1307 curado).

### Slice 3 — Quadrant 360 (`readSeoAeoGap`) + cross-link

- `SeoAeoQuadrant.tsx`: scatter 2×2 (X citabilidad IA, Y posición SEO), 4 cuadrantes con label textual; `role=img` + aria.
- Estado quadrant-sin-AEO ("falta la mitad IA", `sin_dato` ≠ 0); cross-link recíproco a `/aeo`.

### Slice 4 — Report artifact SEO (3.er render adapter)

- `modelFromSeoReport(dto, variant)` adapter puro (espejo `modelFromClientReport`) + no-leak test.
- `src/components/growth/seo/report-artifact/**` web (`clientPortal`) + print (`attachment`), reusando el model — NO forkear.
- `/growth/seo/report` con `[Descargar PDF]`/print.

### Slice 5 — GVC + a11y

- Scenarios GVC dashboard + report, desktop/mobile; scroll-width; foco; respeto a movimiento reducido (WCAG 2.3.3; charts sin entrada); Y invertido + cuadrante label textual.

## Out of Scope

- Backend del SEO (readers: TASK-1305/1303/1307).
- Overview/rank/keywords/audit operador (TASK-1306/1307/1308/1309).
- Público "SEO quick check" (arch §10.2, diferido).
- Trial/PLG upsell completo (teaser/Locked se muestra; el flujo trial es follow-up, patrón EPIC-020 S6).
- PDF `renderSeoReportPdf` si se difiere del V1 (follow-up, espejo TASK-1273).

## Detailed Spec

La cara cliente materializa **Search Visibility 360** (arch §2). El dashboard (S5) es self-service, curado, honesto, mono-Space (arch §10.2): el cliente ve SU dominio, sin datos crudos de operador. El quadrant (S6) es el diferenciador — muestra SEO (rankeo) y AEO (citabilidad IA) como **ejes ortogonales** (nunca fusionados, arch §1.1) y cruza a `/aeo` recíprocamente. El report (S7) es el entregable presentable: un **3.er render adapter del MISMO `ReportArtifactModel`** que el AEO (TASK-1252) — se agrega un `modelFromSeoReport(...)` que mapea el DTO SEO a la shape del model, NO se forkea el scoring ni las ECharts del AEO. El boundary duro: **reusa el model, no lo forkea**; la diferencia entre el report AEO y el SEO es disclosure + chrome, nunca el contenido base. Honest degradation en todo: sin GSC → empty accionable, quadrant sin AEO → "falta la mitad IA" (`sin_dato` ≠ 0), cuota → degrada a medido.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (shell+gate+estados) → Slice 2 (Resumen+Evolución) → Slice 3 (Quadrant+cross-link) → Slice 4 (Report adapter) → Slice 5 (GVC). El gate per-org (Slice 1) DEBE existir antes de cualquier render de datos del cliente. El adapter del report (Slice 4) reusa el model — verificar no-leak ANTES de exponerlo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate por rol en vez de per-org (over-exposure) | access/security | medium | `module_assignment=active` per-org (arch §9), NUNCA `client_*` por rol (lección TASK-1248) | code review + capability audit |
| Forkear el `ReportArtifactModel` (drift + leak) | architecture/privacy | medium | solo `modelFromSeoReport` adapter; no-leak test espejo del AEO; disclosure por tipo | no-leak test + code review |
| Fusionar SEO×AEO en un número (destruye la señal) | data quality | medium | quadrant ejes ortogonales; derived read, no merge (arch §1.1) | code review/GVC |
| Ceros fantasma (sin GSC / quadrant sin AEO) | data quality/trust | medium | empty accionable + `sin_dato` ≠ 0 (arch §10.5) | GVC |
| Leak de datos de operador al cliente | privacy | medium | disclosure `clientPortal`/`attachment`; curado mono-Space | no-leak test/GVC |
| ECharts infla bundle | UI/perf | medium | lazy `ssr:false`; primer ECharts del repo | build/bundle-analyzer |
| Overflow mobile (masterDetail + report A4) | UI | medium | drawer compact + scroll-width check | GVC |

### Feature flags / cutover

- Gated por `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) + `module_assignment=active` per-org. Rollback = flag OFF o revocar assignment (arch §13). Cutover graduado: primero Berel (Fase 0, arch §11).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert rutas/nav + flag OFF | <5 min | si |
| Slice 2 | revert Resumen/Evolución | <5 min | si |
| Slice 3 | revert Quadrant/cross-link | <5 min | si |
| Slice 4 | revert report adapter (el model AEO intacto) | <5 min | si |
| Slice 5 | revert visual polish | <5 min | si |

### Production verification sequence

1. Staging con `GROWTH_SEO_ENABLED=true` + un `module_assignment` de prueba + un target SEO enlazado a una org con grader_run (para poblar `readSeoAeoGap` ambos lados).
2. Cliente (agent auth persona client) ve dashboard mono-Space; navigator funciona; sin datos de operador.
3. Quadrant muestra ambos lados; sin AEO → "falta la mitad IA" (`sin_dato`, no 0); cross-link a `/aeo` navega.
4. Report render (web + print) sin leak; disclosure `clientPortal`/`attachment` (no-leak test verde).
5. GVC desktop/mobile mirado; baseline diff del report vs el artifact AEO aprobado (mismo model).
6. Prod con grant a Berel (Fase 0).

### Out-of-band coordination required

- Grant de `module_assignment` per-org al cliente contratado (Grupo Berel) via operador `entitlement.manage`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, `Flow` apuntando al contrato existente.
- [x] Rutas cliente `/growth/seo` + `/growth/seo/report` (routeGroup `client`) alcanzables por nav cliente + en `route-reachability-manifest.ts`; gate **per-org via `module_assignment`** (NUNCA por rol); redirect defensivo sin módulo.

  **Verificado 2026-08-08 con sesión de cliente real (Grupo Berel) — el gate per-org PASA, la
  alcanzabilidad NO.** La migración está aplicada y la superficie renderiza con datos medidos
  (posición media 1.5, 31 keywords, cobertura 61%, procedencia declarada). Pero el **menú del portal
  cliente no compone SEO**, y no es un problema de catálogo:

  1. El menú vertical del cliente (`VerticalMenu.tsx`) es una **lista hardcodeada de 7 ítems**
     filtrada por `canSeeView('cliente.*')`. SEO no está en esa lista, así que ningún seed la agrega.
  2. Su único bloque dinámico (`capabilityModules`) se alimenta de `businessLines`/`serviceModules`
     de la sesión — **otro sistema**, no `module_assignments`.
  3. El resolver canónico module-based (`composeNavItemsFromModules` / `<ClientPortalNavigation>`)
     existe pero **sólo lo consume el mockup** `/mockup/cliente-portal-legacy`. Cablearlo al menú real
     es la task derivada de TASK-827 que quedó pendiente ("V1.0 acepta path híbrido").
  4. Los denials por rol de esta migración (`granted=FALSE`) sacan los dos viewCodes de
     `authorizedViews`, pero **no son la causa**: aunque no existieran, el ítem seguiría sin aparecer
     porque no está en la lista.

  **Confirmado con subagentes (traza de código + dato en PG), y corrige una atribución errónea:**
  `session.user.authorizedViews` se deriva **sólo** de `role_view_assignments` + un fallback
  heurístico por `routeGroup` + permission sets + overrides — **nunca de `module_assignments`**
  (`view-access-store.ts:1024-1077`). Los `view_codes[]` de los módulos viven en un carril paralelo
  (`module-resolver.ts:142`) que consumen `requireViewCodeAccess` y `composeNavItemsFromModules`, no
  la sesión.

  **El hermano AEO está exactamente igual y eso es la referencia:** `cliente.ai_visibility_report`
  tampoco aparece en el menú lateral; su migración borró las filas de rol (por eso cae al fallback y
  sí figura en `authorizedViews`, emitiendo `role_view_fallback_used`), y su alcanzabilidad está
  declarada como deep-link a propósito en el manifest: *"no como item de nav principal hasta que
  exista el monitor recurrente"*. O sea: **el estado de SEO no es una regresión, es el diseño vigente
  del portal cliente** — lo que falta es la task derivada de TASK-827 que monta el nav module-driven.

  Descartado con dato: no es sesión desactualizada. Los claims se auto-refrescan cada ≤5 min
  (`auth.ts:70` + `:787-802`) y una sesión emitida después de la migración tampoco los trae.

  **Y el manifest declara un enlace que no existe:** `/growth/seo` figura con `parent: '/home'` y
  `via: 'inline-link'`, pero no hay ningún enlace desde `/home`. El gate pasa (`0 orphans`) porque
  verifica que la ruta esté declarada, **no que el enlace declarado exista**. El único camino real hoy
  es el cross-link desde el informe AEO, que sólo sirve a clientes que además tengan AEO.

  Evidencia: `.captures/2026-08-08T19-29-36_growth-seo-client` (superficie) y
  `.captures/2026-08-08T19-30-53_inline-growth-seo` (shell completo, donde se ve el menú sin SEO).
- [x] Dashboard `CompositionShell composition='single'` + tabs SEO horizontales (Resumen/Evolución/Quadrant), curado, honesto, mono-Space; sin datos crudos de operador. **Corrección 2026-08-08:** el criterio original decía `masterDetail`; la decisión vigente (Delta de esta task) descarta el rail lateral porque el menú vertical principal ya tiene ese ownership.
- [x] Evolución = line ECharts multi-serie con **Y invertido documentado** (1=arriba=mejor); `role=img` + aria.
- [x] Quadrant 2×2 SEO×AEO (X citabilidad IA, Y posición SEO), 4 cuadrantes con **label textual**, `readSeoAeoGap` (derived read, NUNCA merge); cross-link recíproco a `/aeo`.
- [x] Report artifact SEO = **3.er render adapter del MISMO `ReportArtifactModel`** (adapter `modelFromSeoReport`, NO forkea scoring/ECharts del AEO); web `clientPortal` + print `attachment`; no-leak test verde.
- [x] Honest degradation: sin GSC → empty accionable (nunca ceros); quadrant sin AEO → "falta la mitad IA" (`sin_dato` ≠ 0); cuota → degrada a medido; medido ● / estimado ◑ con leyenda.
- [x] Disclosure `clientPortal`/`attachment` (público-safe): sin engine snapshot crudo, sin razón interna, sin costo.
- [x] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_CLIENT`, es-CL tono cliente, `greenhouse-ux-writing`).
- [ ] GVC desktop+mobile capturado y mirado **en loop** (dashboard + report); `scrollWidth==clientWidth`; gate axe verde. Código y capturas locales están completas; staging y los warnings del shell global siguen pendientes.
- [ ] Focus/keyboard validados; navigator active state; charts sin entrada bajo movimiento reducido (WCAG 2.3.3). El contrato y atributos están implementados; falta la pasada manual/final en staging.
- [x] El flow doc referencia el master `EPIC-022-search-visibility-360-UI-FLOW.md` y declara sus nodos (S5/S6/S7).
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1310` queda sin findings. Hoy sigue en `no` por la auditoría premium abierta — este criterio no puede marcarse antes que los criterios 2/10/11.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-client --env=staging`
- `pnpm fe:capture growth-seo-report --env=staging`
- `pnpm task:lint --task TASK-1310`
- `pnpm ui:wireframe-check --task TASK-1310`
- `pnpm ui:flow-check --task TASK-1310`
- `pnpm ui:readiness-check --task TASK-1310`
- `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] route/nav/reachability actualizados
- [x] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si la task lo toca (delta cliente agregado 2026-08-08)

> **Nota de honestidad (2026-08-08):** el Closing Protocol está completo porque son ítems de higiene
> documental que sí ocurrieron. **No implica cierre de la task**: los criterios 2, 10, 11 y 13 siguen
> abiertos y el `Lifecycle` correcto es `in-progress`. Cerrar esta task exige la ronda premium + el
> rollout (aplicar la migración de catálogo y verificar con sesión cliente real).

## Follow-ups

- PDF `renderSeoReportPdf` (espejo TASK-1273) si se difiere del V1.
- Flujo trial/PLG completo (teaser/Locked → trial run → upsell, patrón EPIC-020 S6).
- Público "SEO quick check" de 1 dominio (arch §10.2, diferido).
- Rollout staging → producción, baseline diff con el artifact AEO aprobado y revisión final de shell
  mobile (warnings del nav colapsado/print trigger).

## Delta 2026-07-01 — conectada al Master UI Flow del programa Search Visibility 360

- Esta task son los nodos **S5 (Cliente dashboard) + S6 (Quadrant 360) + S7 (Report artifact)** del flujo cross-surface del módulo SEO, y el punto de **cruce recíproco SEO↔AEO** (§7 del master). Su flow doc (`docs/ui/flows/TASK-1310-…-flow.md`) referencia el maestro **`docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui + dataviz-design). El report renderiza el `ReportArtifactModel` compartido (TASK-1252, mirror del AEO), NO lo forkea; toda visibilidad deriva del entitlement per-org, nunca del rol (Full API Parity → Nexa por construcción).

## Open Questions

1. ¿El PDF del report SEO entra en el V1 o se difiere a un follow-up (espejo TASK-1273)? Propuesta: web + print `attachment` en V1; PDF `renderSeoReportPdf` como follow-up si el adjunto por email lo requiere.
2. ¿`readRankEvolution` para el dashboard cliente lo expone TASK-1303 o TASK-1307? Propuesta: reader de TASK-1303, patrón de render curado de TASK-1307.
