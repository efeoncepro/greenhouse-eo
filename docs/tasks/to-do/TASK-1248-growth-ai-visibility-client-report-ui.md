# TASK-1248 — Growth AI Visibility: Client Report UI

## Delta 2026-06-27 (PM) — reconciliación reuse-del-artifact (NO reconstruir, NO ECharts)

Pre-toma, review con product-design + arch + SEO detectó inconsistencia interna: el Delta de abajo manda **consumir** el artifact de TASK-1252, pero el Scope/Detailed Spec/risk-matrix/acceptance todavía decían "construir dimension matrix + **ECharts** + cards a mano". El artifact (`AiVisibilityReportArtifact` web) **ya renderiza** score gauge, dimensiones (barras), tendencia y recomendaciones, y lo hace en **Recharts** (`AppRecharts`), **no ECharts**. Reconciliación aplicada:

- **NO introducir ECharts.** El render del reporte es SSOT del artifact (Recharts). Esta task lo consume; cualquier mini-chart adicional (señales del sidecar) reusa el mismo enfoque del artifact, sin una 2.ª lib de charts.
- **El trabajo neto real es:** (1) BFF route + page shell cliente, (2) consumir `AiVisibilityReportArtifact` con `modelFromClientReport(clientReport)` (variant `clientPortal`), (3) **estados cliente** (loading/empty/pending/partial/denied/error) — net-new, (4) **`ContextualSidecar` inspector de recomendación** — net-new (el artifact lista recomendaciones inline, NO tiene sidecar por-recomendación), (5) GVC + a11y.
- Componentes "candidatos" `AiVisibilityScoreHero`/`AiVisibilityDimensionBreakdown` del wireframe **no existen como componentes**: el artifact los renderiza internamente (solo `MetricSummaryCard` existe como primitive, útil para las cards de señal del sidecar). No crearlos como fork del artifact.

## Delta 2026-06-27 — Report Artifact Design System implementado (TASK-1252)

El render del reporte YA existe como sistema reusable feature-local: consumir `AiVisibilityReportArtifact` (web) desde `@/components/growth/ai-visibility/report-artifact` con `model={modelFromClientReport(clientReport)}` (variant `clientPortal`: set completo de recomendaciones, sin internals). NO reimplementar componentes de reporte. Esta task aporta el BFF client-scoped (TASK-1243) + estados/acceso del portal cliente.

## Delta 2026-06-26

- **Dependencia reader DESBLOQUEADA por TASK-1243 (complete).** El reader client-scoped + el contrato programático ya existen: esta UI es cliente puro. Consumir: endpoint BFF `GET /api/client-portal/growth/ai-visibility/report[?runId=...]` → `{ report: ClientGraderReport }` (DTO leak-safe, sin evidencia cruda; recommendations sin cap). Auth ya resuelta server-side (`requireClientTenantContext` + capability `growth.ai_visibility.report.read_client` + org de sesión); la UI no agrega lógica de acceso. Errores canónicos: `grader_run_not_found` (sin reporte / org sin run reportable / score aún no listo — NO mostrar "Reintentar", es estructural) + `forbidden`/`client_tenant_required`. Sigue bloqueada por **TASK-1252** (artifact design system). Reader: `src/lib/growth/ai-visibility/client/command.ts` (vía curated `src/lib/client-portal/readers/curated/growth-ai-visibility.ts`).

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
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1248-growth-ai-visibility-client-report-ui.md`
- Flow: `docs/ui/flows/TASK-1248-growth-ai-visibility-client-report-ui-flow.md`
- Motion: `docs/ui/motion/TASK-1248-growth-ai-visibility-client-report-ui-motion.md`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|client|ui`
- Blocked by: `TASK-1243, TASK-1252`
- Branch: `task/TASK-1248-growth-ai-visibility-client-report-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la superficie del portal cliente para ver reportes AI Visibility del propio cliente usando el reader client-scoped de `TASK-1243`. Completa el tercer consumer de Full API Parity: publico, admin y cliente sobre el mismo `buildGraderReport`.

## Why This Task Exists

`TASK-1243` entrega el reader client-scoped pero declara la UI del portal como follow-up. Sin esta task, la parity cliente queda solo programatica: el cliente no tiene una experiencia visible dentro de Greenhouse para revisar su snapshot/monitor.

## Goal

- Agregar una vista client-scoped de AI Visibility con boundary duro tenant/cliente.
- Renderizar el reporte publico/cliente sin evidencia cruda ni builders paralelos.
- Cubrir estados de no-data, pending, partial, review_required y report disponible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — consumer cliente/futuro monitor.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1243-growth-ai-visibility-client-scoped-report-access.md`

Reglas obligatorias:

- La UI solo consume el reader client-scoped; no usa endpoint publico tokenizado para datos autenticados.
- No exponer evidencia interna/raw provider text ni accuracy findings.
- Tenant boundary visible y server-side: cliente A no puede ver reportes de cliente B.
- Usar Composition Shell y cards adaptables; no crear un dashboard paralelo si hay primitives existentes.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- `TASK-1243` — `readClientGraderReport` y route/API client-scoped.
- `TASK-1235`/`TASK-1236`/`TASK-1237` — DTO de reporte con tendencia/señales.

### Blocks / Impacts

- Cierra parity del consumer cliente en EPIC-020.
- Prepara futuro `Greenhouse AI Visibility Monitor`.

### Files owned

- `src/app/(dashboard)/client/**` [verificar ruta vigente del portal cliente]
- `src/views/growth/ai-visibility/client/**`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/growth-ai-visibility-client-report.*` [verificar extension DSL]

## Current Repo State

### Already exists

- Report builder publico/interno y token reader publico.
- Portal cliente y patterns self-scoped en otras areas.

### Gap

- No hay UI cliente para consumir `TASK-1243`.
- La experiencia de cliente futura queda fuera del EPIC si no se registra este consumer visible.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente autenticado o contacto cliente con acceso al portal.
- Momento del flujo: revisar diagnostico recibido o seguimiento de visibilidad IA.
- Resultado perceptible esperado: entiende score, brecha principal, tendencia y acciones recomendadas sin ver datos internos.
- Friccion que debe reducir: interpretar un reporte tecnico sin apoyo de ventas.
- No-goals UX: admin evidence review, editar scoring, ejecutar providers.

### Surface & system decision

- Surface: ruta client-scoped bajo portal cliente [verificar convencion]. **Ruta cliente** → viewCode routeGroup `client`, sembrado SOLO a roles `client_*`.
- Composition Shell: `aplica` — composición `focused`/`single` (lectura de reporte) o `leadPlusContext` si hay sidecar de recomendación; declarar la composición, sin grid/morph ad-hoc.
- Primitive decision: `reuse` — `AiVisibilityReportArtifact` (TASK-1252, render SSOT del reporte, charts Recharts), CompositionShell, ContextualSidecar, Adaptive Card density. NO reconstruir el reporte ni introducir ECharts.
- Adaptive density / The Seam: `aplica` — reporte nace adaptable (`card-density`, condensación honesta).
- Floating/Sidecar/Dialog decision: AdaptiveSidecar variante `inspector` opcional para detalle de recomendación; no Dialog salvo accion sensible. No drawer custom.
- Copy source: `src/lib/copy/growth.ts` (invocar `greenhouse-ux-writing`, es-CL; **es un touchpoint de cliente — cuidar marca Efeonce + tono**).
- Access impact: `entitlements` — capability/scope cliente definido por `TASK-1243`. **Anti-corruption boundary:** consumir el reader client-scoped de 1243 a través del boundary del portal cliente; **NUNCA importar un reader de dominio productor (growth) directo en una vista cliente** (lint `no-cross-domain-import-from-client-portal`). Tenant boundary server-side; NUNCA computar scope/visibilidad en cliente. Nueva ruta `(dashboard)` → `route-reachability-manifest.ts` + seed viewCode en `VIEW_REGISTRY` el mismo PR (TASK-827/982).

### Approved visual direction

- Product Design exploration approved by operator on 2026-06-25: **Executive Signal Command** as the base direction, with the **Evidence-Safe Workbench** sidecar pattern merged for recommendation detail.
- Durable visual references:
  - Base target: `docs/assets/product-design/task-1248-ai-visibility-client-report/executive-signal-command.png`
  - Sidecar/detail reference: `docs/assets/product-design/task-1248-ai-visibility-client-report/evidence-safe-workbench-sidecar.png`
- Visual objective: modern, robust, attractive and highly functional, while still reading as a Greenhouse client portal surface, not a public marketing report or decorative dashboard.
- First-screen hierarchy:
  - Header with `GreenhouseBreadcrumbs`, client-safe tenant/status cues, report date/as-of and sampled/disclaimer metadata.
  - Lead region with headline + overall score + named severity + trend delta/context; the score must never appear as an isolated number.
  - Primary region with the seven report dimensions as scannable horizontal bars/table-like rows, each with score, status and severity label.
  - Context/action region with the prioritized gap, recommended motion, next step and safe CTA.
- Sidecar merge from option 3:
  - Use `ContextualSidecar` / Adaptive Sidecar `variant='inspector'` for selected recommendation detail.
  - Sidecar content: why the recommendation matters, first step, expected outcome, safe aggregate signals (`citationInsight`, `sentimentSummary`, `positionSummary`, `trend`) and CTA.
  - Desktop sidecar is in-flow/full-height; mobile becomes temporary drawer via the primitive. Focus restore required.
- Avoided directions:
  - Do not use the more editorial **Narrative Report Canvas** as the base for V1; it can inform copy rhythm, but not layout architecture.
  - Do not over-index on **AI Visibility Monitor** language; V1 is a snapshot/latest report and must not imply recurring paid monitoring until that product exists.
  - No hero/landing treatment, no nested card stack, no raw evidence table, no decorative gradient/orb background, no custom drawer.

### State inventory

- Default: reporte disponible.
- Loading: carga de reader client-scoped (skeleton dimensionado al reporte, anti-CLS).
- Empty (zero-state): cliente sin diagnóstico aún → copy + CTA honesto ("solicitar diagnóstico"), distinto de "en preparación".
- Pending / en preparación: run no terminado O esperando revisión interna → **estado neutral "tu reporte se está preparando"; NUNCA exponer la razón interna de `review_required` ni evidencia de review al cliente** (el gate de review es interno, TASK-1247).
- Error: reader/API falla.
- Degraded / partial: reporte parcial o sin historico — mostrar explícito qué falta ("sin histórico aún"), nunca número confiado sobre un slice ausente.
- Permission denied: sin scope/capability o tenant mismatch.
- Long content: plan/recomendaciones con scroll interno.
- Mobile / compact: cards apiladas, tablas fallback.
- Keyboard / focus: navegacion por secciones y tablas.
- Reduced motion: charts/motion degradan a estado final.

### Interaction contract

- Primary interaction: abrir reporte, explorar dimensiones/recomendaciones, seguir CTA a conversar/solicitar plan.
- Hover / focus / active: cards/charts accesibles.
- Pending / disabled: CTAs deshabilitados si no hay reporte.
- Escape / click-away: sidecar opcional cierra.
- Focus restore: vuelve al card que abrio detalle.
- Latency feedback: loading y partial claros.
- Toast / alert behavior: errores persistentes dentro de la pagina.

### Motion & microinteractions

- Motion primitive: `Motion|CSS`
- Enter / exit: entrada de secciones del reporte.
- Layout morph: Composition Shell si hay sidecar.
- Stagger: opcional y reducido.
- Timing / easing token: tokens del design system.
- Reduced-motion fallback: sin animacion, valores finales.
- Non-goal motion: hero/marketing decorativo.

### Visual verification

- GVC scenario: `growth-ai-visibility-client-report`
- Viewports: desktop + 390px.
- Required captures: empty, loading, reporte, partial/degraded, permission denied.
- Required `data-capture` markers: `client-ai-visibility-report`, `client-ai-visibility-actions`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: charts con table fallback, focus order, no color-only.
- Before/after evidence: N/A pagina nueva.
- Known visual debt: depende de route shell cliente vigente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Client route and data binding

- Crear ruta cliente que consume el reader/API de `TASK-1243`.
- Estados loading/empty/error/permission.

### Slice 2 — Report rendering (CONSUMIR el artifact, no reconstruir)

- **Consumir** `AiVisibilityReportArtifact` (web) con `model={modelFromClientReport(clientReport)}` (variant `clientPortal`). El artifact YA renderiza headline, score gauge, tendencia (Recharts), dimensiones (barras) y plan priorizado, con table fallback y severidad nombrada. **NO** reimplementar esas secciones ni introducir ECharts (el artifact usa Recharts; una sola lib de charts).
- **Net-new sobre el artifact** (lo que esta task sí construye):
  - `CompositionShell` `leadPlusContext` como envoltura de la página cliente (lead = artifact / context = sidecar).
  - **`ContextualSidecar` `variant='inspector'`** para detalle de la recomendación seleccionada — el artifact lista recomendaciones inline pero NO tiene sidecar por-recomendación. Desktop in-flow non-modal / mobile drawer con focus restore.
  - Cards de señal segura del sidecar (citation share, sentimiento, posición) con `MetricSummaryCard` + reuso del enfoque de charts del artifact (Recharts), con table fallback.
- Si el artifact necesita un ajuste para encajar en el shell cliente (p.ej. ocultar una sección), expandir el artifact (variant/prop) — NUNCA forkearlo.

### Slice 3 — Client actions

- CTAs seguros: solicitar conversacion, ver plan recomendado o abrir handoff comercial existente [verificar].
- Sin writes comerciales nuevos salvo que ya exista command gobernado.

### Slice 4 — GVC + a11y

- Scenario desktop/mobile, focus, scroll-width y reduced-motion.

## Out of Scope

- Reader client-scoped (`TASK-1243`).
- Public token page (`TASK-1241`).
- Admin review (`TASK-1247`).
- Monitor recurrente pagado o scheduling automatico.

## Detailed Spec

La vista cliente debe ser un consumer autenticado del mismo artefacto de reporte, no una copia del public token reader. Debe preservar redaccion de evidencia y tenant boundary. El primer release puede ser read-only; cualquier CTA que cree trabajo comercial debe consumir commands existentes o abrir follow-up.

**Data-viz (skill `dataviz-design`) — estas reglas son el CONTRATO que el artifact de TASK-1252 ya satisface; verificar al consumir, NO reconstruir.** El render del reporte es SSOT del artifact (Recharts). El cliente lo lee sin apoyo de ventas, así que al consumir el artifact (variant `clientPortal`) confirmar que se cumple:

- **Score global** → gauge con **contexto/benchmark** (no número solo): tabular-nums, banda/semáforo nombrado, comparación explícita ("vs medición anterior"). (Lo entrega el artifact; verificar.)
- **Tendencia** → line/area chart honesto; **brecha principal** anotada, no enterrada en tabla. (Artifact.)
- **Dimensiones** → barras (eje **empieza en 0**), severidad **nombrada + ícono/forma, NUNCA color-only** + **table fallback**. (Artifact.)
- **Charts = Recharts** (los que ya usa el artifact, `AppRecharts`); **NO introducir ECharts** ni una 2.ª lib. Cualquier mini-chart adicional del sidecar (citation share/sentimiento) reusa el mismo enfoque, `lazy`/`ssr:false`, respeta `prefers-reduced-motion`, `role="img"`/`aria-label` + table fallback + keyboard nav.
- Paleta **colorblind-safe** verificada en dark mode; números con `Intl.NumberFormat` es-CL. (Heredado del artifact + aplicar a las cards de señal nuevas.)

**CTA → handoff comercial gobernado:** si un CTA ("solicitar conversación/plan") crea trabajo comercial, debe consumir un **command gobernado existente** del handoff growth→commercial (explícito + auditable, NUNCA mutación silenciosa de estado comercial — domain arch §7). Si no existe, V1 es read-only/contacto y se abre follow-up. Copy honesto: NO prometer el monitor recurrente que aún no se construye.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. No agregar CTAs mutativos si no existe command gobernado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tenant leakage cliente A/B | identity/privacy | medium | reader server-side de TASK-1243 + tests | access denied mismatch |
| Duplicar builder de reporte | architecture | low | consume DTO/reader existente | code review |
| Charts inaccesibles | a11y | medium | table fallback + chart aria (Recharts del artifact) + keyboard + no color-only | axe/GVC |
| Chart engañoso (bar sin 0 / dual-axis / pie >3 / color-only) | dataviz/trust | medium | reglas duras dataviz: bar desde 0, no dual-axis, no pie>3, severidad nombrada | review dataviz |
| Cliente ve internals del gate de review | privacy | medium | estado "en preparación" neutral; nunca razón `review_required` | review de copy/DTO |
| UI promete monitor recurrente no construido | product | medium | copy honesto read-only V1 | review de copy |

### Feature flags / cutover

- Puede gatearse por route/capability cliente hasta que existan reportes reales.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav | <5 min | si |
| Slice 2 | revert report view | <5 min | si |
| Slice 3 | disable CTAs | <5 min | si |
| Slice 4 | revert visual polish | <5 min | si |

### Production verification sequence

1. Staging con cliente A y B.
2. Cliente A ve su reporte; cliente B recibe denied/not-found.
3. GVC desktop/mobile + table fallback.
4. No raw evidence en DOM/JSON.

### Out-of-band coordination required

- Definir donde vive la ruta cliente en la navegacion.
- Confirmar CTA comercial autorizado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] UI consume exclusivamente el reader/API client-scoped de `TASK-1243`.
- [ ] Tenant mismatch queda bloqueado server-side y representado como permission/not-found seguro.
- [ ] Reporte renderiza score, tendencia, dimensiones, plan y disclaimer sin raw evidence.
- [ ] La implementación sigue la dirección visual aprobada: **Executive Signal Command** como base + sidecar inspector de recomendación de **Evidence-Safe Workbench**.
- [ ] Copy reusable vive en `src/lib/copy/*`.
- [ ] GVC desktop+mobile capturado y mirado **en loop** (rubric V1.5); `scrollWidth==clientWidth`. Gate axe verde.
- [ ] Se CONSUME `AiVisibilityReportArtifact` (variant `clientPortal`), sin reconstruir el reporte ni introducir ECharts (charts = Recharts del artifact). Charts tienen table fallback, `aria`, keyboard nav y severidad no color-only; bar desde 0, sin dual-axis/pie>3/3D; paleta colorblind-safe probada en dark.
- [ ] Score con contexto/benchmark (no número solo); brecha principal anotada; comparación con período explícito; números `Intl.NumberFormat` es-CL.
- [ ] Estado "en preparación" neutral; el cliente NUNCA ve la razón interna de `review_required` ni evidencia de review.
- [ ] La vista consume el reader client-scoped vía el boundary del portal cliente (sin import directo de growth); ruta en `route-reachability-manifest.ts` + viewCode seed routeGroup `client`.
- [ ] CTA comercial (si existe) consume command gobernado del handoff growth→commercial, sin mutación silenciosa; copy no promete monitor recurrente.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-ai-visibility-client-report --env=staging`
- `pnpm task:lint --task TASK-1248`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados si aplica

## Follow-ups

- Greenhouse AI Visibility Monitor recurrente para clientes.
- Actions hacia Verk/Kortex/Nexa cuando existan contracts.

## Open Questions

1. ¿La vista entra en nav cliente principal o como deep-link desde Account 360/HubSpot handoff? Propuesta: deep-link primero, nav despues cuando haya monitor recurrente.
