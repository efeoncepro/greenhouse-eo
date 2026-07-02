# TASK-1310 — Growth SEO: Client Dashboard + Report Artifact + 360 Quadrant

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|ai`
- Blocked by: `TASK-1305, TASK-1307`
- Branch: `task/TASK-1310-growth-seo-client-dashboard-report-artifact`
- Legacy ID: `none`
- GitHub Issue: `none`

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

### Gap

- No existe `src/lib/growth/seo/**` (readers — dependencia TASK-1305/1307).
- No existe un adapter SEO del `ReportArtifactModel` (`modelFromSeoReport`) ni `src/components/growth/seo/report-artifact/**`.
- No existen las rutas cliente `/growth/seo` + `/growth/seo/report` ni el quadrant SEO×AEO.
- No existe uso de ECharts en el repo (quadrant + line lo introducen, lazy-loaded — arch §10.4).

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
- Access impact: `views|entitlements` — routeGroup `client`, `module_assignment=active` + capabilities `growth.seo.observation.read` (dashboard) / `growth.seo.report.read_client` (report). **NUNCA** `client_*` gate por rol (lección TASK-1248).

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
- Data reader / command: `readSeoAeoGap(targetId)` (TASK-1305 [verificar]) + `readRankEvolution(targetId, {range})` (TASK-1303/1307 [verificar]) + `readRankSnapshotLatest` (curado). Sin commands (read-only cliente).
- API parity: UI cliente de readers gobernados; el report deriva del MISMO model que el AEO (Nexa por construcción). El quadrant NO reconcilia SEO×AEO en un número.
- Access / capability: `growth.seo.observation.read` (dashboard) + `growth.seo.report.read_client` (report); Locked/teaser sin `module_assignment=active`.
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

- Migration posture: `none`
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

- Local checks: UI tests / focal tests del adapter `modelFromSeoReport` + no-leak test (espejo del `report-artifact-no-leak.test.tsx`).
- DB/runtime checks: staging con un target SEO enlazado a una org con grader_run (para poblar `readSeoAeoGap` ambos lados).
- Integration checks: report render (web + print) sin leak; quadrant con ambos lados; cross-link a `/aeo` navega.
- Reliability signals/logs: freshness enlaza a `seo.rank.capture_lag` (arch §8) sin computar salud en cliente.
- Production verification sequence: staging primero (con `module_assignment` de prueba); prod via rollout EPIC-022 + grant a Berel.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths (`readSeoAeoGap`, `readRankEvolution`, `ReportArtifactModel`, `modelFromSeoReport`).
- [ ] Data invariants explicit: NO forkear el model; leak boundary preservado; quadrant no fusiona SEO×AEO.
- [ ] Migration/backfill/rollback posture explicit (none; flag OFF + revoke assignment).
- [ ] Runtime evidence listed (no-leak test del adapter SEO + staging con ambos lados del gap).
- [ ] Sensitive posture: report `clientPortal`/`attachment` público-safe, sin raw provider / razón interna / costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dashboard shell (`/growth/seo`) + gate + estados

- Crear `/growth/seo` (routeGroup `client`) con gate `module_assignment=active` + `observation.read`; redirect defensivo si el tenant no tiene el módulo.
- CompositionShell `masterDetail` (navigator Resumen/Evolución/Quadrant + detail canvas); breadcrumb + leyenda ●/◑.
- Estados loading/empty/sin-GSC/error/degraded/locked honestos.
- Registrar en `route-reachability-manifest.ts` + nav cliente.

### Slice 2 — Resumen + Evolución (line Y invertido)

- Detail Resumen: visibility + top-3/top-10 + top URLs curadas (`readRankSnapshotLatest`).
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

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, `Flow` apuntando al contrato existente.
- [ ] Rutas cliente `/growth/seo` + `/growth/seo/report` (routeGroup `client`) alcanzables por nav cliente + en `route-reachability-manifest.ts`; gate **per-org via `module_assignment`** (NUNCA por rol); redirect defensivo sin módulo.
- [ ] Dashboard `masterDetail` (Resumen/Evolución/Quadrant), curado, honesto, mono-Space; sin datos crudos de operador.
- [ ] Evolución = line ECharts multi-serie con **Y invertido documentado** (1=arriba=mejor); `role=img` + aria.
- [ ] Quadrant 2×2 SEO×AEO (X citabilidad IA, Y posición SEO), 4 cuadrantes con **label textual**, `readSeoAeoGap` (derived read, NUNCA merge); cross-link recíproco a `/aeo`.
- [ ] Report artifact SEO = **3.er render adapter del MISMO `ReportArtifactModel`** (adapter `modelFromSeoReport`, NO forkea scoring/ECharts del AEO); web `clientPortal` + print `attachment`; no-leak test verde.
- [ ] Honest degradation: sin GSC → empty accionable (nunca ceros); quadrant sin AEO → "falta la mitad IA" (`sin_dato` ≠ 0); cuota → degrada a medido; medido ● / estimado ◑ con leyenda.
- [ ] Disclosure `clientPortal`/`attachment` (público-safe): sin engine snapshot crudo, sin razón interna, sin costo.
- [ ] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_CLIENT`, es-CL tono cliente, `greenhouse-ux-writing`).
- [ ] GVC desktop+mobile capturado y mirado **en loop** (dashboard + report); `scrollWidth==clientWidth`; gate axe verde.
- [ ] Focus/keyboard validados; navigator active state; charts sin entrada bajo movimiento reducido (WCAG 2.3.3).
- [ ] El flow doc referencia el master `EPIC-022-search-visibility-360-UI-FLOW.md` y declara sus nodos (S5/S6/S7).
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1310` queda sin findings.

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

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si la task lo toca

## Follow-ups

- PDF `renderSeoReportPdf` (espejo TASK-1273) si se difiere del V1.
- Flujo trial/PLG completo (teaser/Locked → trial run → upsell, patrón EPIC-020 S6).
- Público "SEO quick check" de 1 dominio (arch §10.2, diferido).

## Delta 2026-07-01 — conectada al Master UI Flow del programa Search Visibility 360

- Esta task son los nodos **S5 (Cliente dashboard) + S6 (Quadrant 360) + S7 (Report artifact)** del flujo cross-surface del módulo SEO, y el punto de **cruce recíproco SEO↔AEO** (§7 del master). Su flow doc (`docs/ui/flows/TASK-1310-…-flow.md`) referencia el maestro **`docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui + dataviz-design). El report renderiza el `ReportArtifactModel` compartido (TASK-1252, mirror del AEO), NO lo forkea; toda visibilidad deriva del entitlement per-org, nunca del rol (Full API Parity → Nexa por construcción).

## Open Questions

1. ¿El PDF del report SEO entra en el V1 o se difiere a un follow-up (espejo TASK-1273)? Propuesta: web + print `attachment` en V1; PDF `renderSeoReportPdf` como follow-up si el adjunto por email lo requiere.
2. ¿`readRankEvolution` para el dashboard cliente lo expone TASK-1303 o TASK-1307? Propuesta: reader de TASK-1303, patrón de render curado de TASK-1307.
