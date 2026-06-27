# TASK-1248 — Growth AI Visibility: Client Report UI

## Cierre 2026-06-27 — implementado (Split Workbench, concepto C) · local-first, sin push

Entregado en 5 slices (commits en `develop`, sin push):

- **Slice 0 — primitive `masterDetail` en CompositionShell** (`a1fa547a6`): 4.º variant (navigator angosto IZQ + detail canvas ancho DER, inverso de `split`), data-driven (`splitTemplateColumns`/`compactDrawerRegion`/`regionMinInlineSize`), kind `workbench`; no-regresión de los 4 consumers de `split` (data-capture `aside-drawer` + ancho 420/88vw preservados); Lab + `PRIMITIVES.md`; 39 tests verdes.
- **Slices 1-3 — ruta cliente + view + governance** (`276ce2f04`): `/growth/ai-visibility/report` (routeGroup `client`), 3.er consumer de Full API Parity; server-side `requireClientTenantContext` + capability `growth.ai_visibility.report.read_client` + org de sesión; consume el reader client-scoped vía boundary del portal cliente (TASK-1243); Split Workbench = 4.º view-adapter de `modelFromClientReport` (no forkea scoring, no embebe el render vertical, no ECharts — charts Recharts/`MetricTrendCard` + barras `LinearProgress` accesibles); estados empty/preparing/error/permission (preparing NUNCA expone `review_required`); CTA read-only V1 (contacto Efeonce, sin prometer monitor); viewCode `cliente.ai_visibility_report` (VIEW_REGISTRY TS + migration seed `20260627204627526`, 3 client roles + efeonce_admin) + route-reachability (deep-link).
- **Slice 4 — GVC + polish** (`7a38dcd43`): mockup harness `/growth/ai-visibility/report/mockup` (fixture `SAMPLE_CLIENT_REPORT`) + scenario `growth-ai-visibility-client-report`; **GVC mirado en loop** desktop 1440 + mobile 390 (split desktop, drawer "Ver detalle" mobile, sin overflow, sin error boundary); polish: labels de dimensión es-CL (`dimension_label` — el label del contrato es inglés, defecto en superficie cliente), detail de recomendación enriquecido con su dimensión origen.

**Gates:** `pnpm local:check` (lint+tsc) verde · `pnpm build` (Turbopack) verde · `pnpm test` 8245 pass (3 flakes de timeout en `HrLeaveView`, verdes en aislado, ajenos a TASK-1248) · composition-shell 39/39 · `route-reachability-gate` 0 orphans · `task:lint`/`ui:*-check` errors=0 · `docs:closure-check` clean (sin flags nuevos). **Migration aplicada** a `greenhouse-pg-dev` (viewCode=1, grants=4).

**Rollout:** la ruta real es client-scoped y muestra `empty` sin un grader run reportable por-org (los `grader_profiles` tienen `organization_id` NULL hoy; la persona `agent-client` no resuelve org). La verificación visual con datos se hizo contra el mockup harness (fixture canónico). Cuando un cliente real tenga un grader run con su org enlazada, el workbench renderiza el reporte por construcción (mismo reader/modelo). Estado: **code complete + GVC verificado en harness; el render con datos reales en la ruta productiva queda pendiente de tener un grader run client-scoped (data), no de código.**

## Delta 2026-06-27 (PM·2) — dirección elegida vía product-design-loop: **Split Workbench (concepto C)**

El operador corrió `/product-design-loop` (3 conceptos IA) y eligió el **concepto C — Split Workbench (master-detail)** sobre la dirección previa A (Executive Signal Command/sidecar), con el rationale explícito: **esta superficie es para CLIENTES autenticados, no prospectos** → una vista rica/data-dense es lo correcto; A se queda pobre. Asset durable: `docs/assets/product-design/task-1248-ai-visibility-client-report/split-workbench-final-target.png`.

**Patrón C (master-detail workbench):**
- **Top strip:** breadcrumb + 'AI Visibility Snapshot' + org chip + fecha.
- **Left rail (~38%):** lista navegable en 2 secciones — `Dimensiones` (7 filas seleccionables con score + status dot) y `Recomendaciones` (filas priorizadas con impact chip); una seleccionada.
- **Right detail canvas (~62%):** detalle del ítem seleccionado — header con contexto de score, charts (tendencia del snapshot + presencia por motor), `¿Por qué importa?`, tiles de señal segura, CTA `Agendar conversación`.

**Reuse / arquitectura (resuelve el reabrir de C):** C es un **4.º view-adapter del MISMO `ReportArtifactModel`** (consistente con los adapters web/print/PDF que ya tiene el artifact). Consume `modelFromClientReport(clientReport)` (el modelo es SSOT) y **recompone** con primitives existentes (trend Recharts del artifact, `MetricSummaryCard`, chart cards) — **NO** forkea el scoring, **NO** inventa un render paralelo del reporte, **NO** introduce ECharts (charts = Recharts, una sola lib). El render vertical del artifact (`AiVisibilityReportArtifact`) NO se embebe tal cual acá (C es otra composición); lo que se reusa es su **modelo + primitives de chart/card**.

**V1-honest (guardrail de monitor):** los charts muestran el **trend que el snapshot YA trae + `providerPresence`** (presencia por motor) — NO una serie "12 semanas" fabricada ni monitoreo continuo. El copy NUNCA promete una suscripción de monitoreo recurrente (ese SKU no existe aún).

**Pendiente de realineación (en esta misma sesión):** wireframe/flow/motion estaban construidos sobre A/sidecar; se realinean al master-detail de C abajo. La matriz de estados, copy ledger, a11y de charts y los gates siguen vigentes.

## Delta 2026-06-27 — Report Artifact Design System implementado (TASK-1252)

El render del reporte YA existe como sistema reusable feature-local: consumir `AiVisibilityReportArtifact` (web) desde `@/components/growth/ai-visibility/report-artifact` con `model={modelFromClientReport(clientReport)}` (variant `clientPortal`: set completo de recomendaciones, sin internals). NO reimplementar componentes de reporte. Esta task aporta el BFF client-scoped (TASK-1243) + estados/acceso del portal cliente.

## Delta 2026-06-26

- **Dependencia reader DESBLOQUEADA por TASK-1243 (complete).** El reader client-scoped + el contrato programático ya existen: esta UI es cliente puro. Consumir: endpoint BFF `GET /api/client-portal/growth/ai-visibility/report[?runId=...]` → `{ report: ClientGraderReport }` (DTO leak-safe, sin evidencia cruda; recommendations sin cap). Auth ya resuelta server-side (`requireClientTenantContext` + capability `growth.ai_visibility.report.read_client` + org de sesión); la UI no agrega lógica de acceso. Errores canónicos: `grader_run_not_found` (sin reporte / org sin run reportable / score aún no listo — NO mostrar "Reintentar", es estructural) + `forbidden`/`client_tenant_required`. Sigue bloqueada por **TASK-1252** (artifact design system). Reader: `src/lib/growth/ai-visibility/client/command.ts` (vía curated `src/lib/client-portal/readers/curated/growth-ai-visibility.ts`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
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
- Composition Shell: `aplica` — composición **master-detail** (nav rail + detail canvas) del concepto C; declarar la composición vigente que lo soporte, sin grid/morph ad-hoc.
- Primitive decision: `reuse` — el **modelo** `ReportArtifactModel` (`modelFromClientReport`, SSOT) recompuesto como 4.º view-adapter (workbench), + chart/card primitives del artifact + `MetricSummaryCard` + `GreenhouseChartCard` + CompositionShell. NO embeber el render vertical del artifact, NO forkear scoring, NO introducir ECharts (charts Recharts).
- Adaptive density / The Seam: `aplica` — reporte nace adaptable (`card-density`, condensación honesta).
- Floating/Sidecar/Dialog decision: el detalle vive en el **detail canvas** del master-detail (pane primario derecho), NO en un sidecar inspector flotante; en mobile el detalle se abre como drawer temporal del primitive o navegación in-page. No Dialog salvo acción sensible. No drawer custom.
- Copy source: `src/lib/copy/growth.ts` (invocar `greenhouse-ux-writing`, es-CL; **es un touchpoint de cliente — cuidar marca Efeonce + tono**).
- Access impact: `entitlements` — capability/scope cliente definido por `TASK-1243`. **Anti-corruption boundary:** consumir el reader client-scoped de 1243 a través del boundary del portal cliente; **NUNCA importar un reader de dominio productor (growth) directo en una vista cliente** (lint `no-cross-domain-import-from-client-portal`). Tenant boundary server-side; NUNCA computar scope/visibilidad en cliente. Nueva ruta `(dashboard)` → `route-reachability-manifest.ts` + seed viewCode en `VIEW_REGISTRY` el mismo PR (TASK-827/982).

### Approved visual direction

- **Dirección elegida (operador, 2026-06-27, vía `/product-design-loop`): Concepto C — Split Workbench (master-detail).** Reemplaza la dirección previa A (Executive Signal Command/sidecar). Rationale: superficie para **CLIENTES autenticados, no prospectos** → vista rica/data-dense; A se quedaba pobre.
- Durable visual reference:
  - Final target: `docs/assets/product-design/task-1248-ai-visibility-client-report/split-workbench-final-target.png`
  - (Histórico, dirección A descartada: `executive-signal-command-final-target.png` / `evidence-safe-workbench-sidecar.png`.)
- Visual objective: modern, robust, attractive, data-dense pero legible; lee como portal cliente Greenhouse (no marketing público).
- Arquitectura de layout (concepto C):
  - **Top strip:** `GreenhouseBreadcrumbs` + 'AI Visibility Snapshot' + org chip + fecha/as-of + sampled/disclaimer.
  - **Left rail (~38%):** navigator master — sección `Dimensiones` (7 filas seleccionables: label + score + status dot, severidad nombrada) + sección `Recomendaciones` (filas priorizadas con impact chip); una seleccionada.
  - **Right detail canvas (~62%):** detalle del ítem seleccionado — contexto de score (nunca número aislado), charts Recharts (trend del snapshot + presencia por motor), `¿Por qué importa?`, tiles de señal segura (`citationInsight`/`sentimentSummary`/`positionSummary`/`trend`), CTA gobernado.
- V1-honest / avoided:
  - Los charts muestran el **trend que el snapshot YA trae + `providerPresence`** — NO una serie multi-semana fabricada ni monitoreo continuo. El copy NUNCA promete una suscripción de monitoreo recurrente (SKU inexistente).
  - No hero/landing, no raw evidence table, no gradiente/orb decorativo, no drawer custom, no ECharts (charts = Recharts).

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
- Escape / click-away: en mobile el drawer del detalle cierra; en desktop el detail canvas no es modal (selección lo intercambia).
- Focus restore: tras cerrar el drawer mobile, foco vuelve a la fila seleccionada del navigator.
- Latency feedback: loading y partial claros.
- Toast / alert behavior: errores persistentes dentro de la pagina.

### Motion & microinteractions

- Motion primitive: `Motion|CSS`
- Enter / exit: entrada de secciones del reporte.
- Layout morph: detail canvas intercambia contenido al seleccionar una fila del navigator (master-detail).
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

### Slice 0 — Primitive: composición `masterDetail` en CompositionShell (NUEVO, decidido 2026-06-27)

Discovery del implement-task detectó que el concepto C (master-detail) **NO mapea** a ninguna composición vigente de `CompositionShell` (`single`/`leadPlusContext`/`split`/`focused`). `split` = `minmax(0,1fr)` + `clamp(320px,32%,480px)` (primary ancho + **aside angosto que colapsa a drawer**) = patrón del concepto A. El operador eligió **extender la primitive** (camino canónico, reusable). Slice 0 (Primitive+Variants+Kinds completo, ANTES de la vista):

- Agregar composición **`masterDetail`** a `composition-shell-types.ts` (`CompositionShellComposition` union) + `COMPOSITION_SHELL_COMPOSITION_CONFIG` (controller) + `KIND_TO_COMPOSITION` si aplica.
- Layout nuevo: **nav angosto IZQUIERDA + detail ancho DERECHA** (`clamp(280px,32%,400px) minmax(0,1fr)`), inverso al `split`. En compact: **el DETAIL (ancho) colapsa a drawer al seleccionar**, el nav (angosto) se queda — semántica de drawer invertida respecto a `split` (hoy colapsa el `aside`). Region min-sizes ajustadas.
- Hornear a11y (foco/teclado/SR del navigator + detail), reduced-motion, view-transition per-instance (sin romper el guard de singleton VT-name), y NO regresionar los 3 consumers vivos de `split` (RoadmapCockpitView, growth-forms-renderer preview).
- **Lab interno** en `/admin/design-system/composition-shell` (o el Lab vigente de la primitive) mostrando `masterDetail` + registrar en el catálogo del design system + route-reachability.
- **GVC** del Lab (desktop+mobile) + contrato en `docs/architecture/ui-platform/PRIMITIVES.md` (CompositionShell §masterDetail) + nodo AXIS si aplica.
- Tests: no-regresión de los consumers `split` + el morph/VT del nuevo layout.

### Slice 1 — Client route and data binding

- Crear ruta cliente que consume el reader/API de `TASK-1243`.
- Estados loading/empty/error/permission.

### Slice 2 — Report rendering (Split Workbench: 4.º view-adapter del modelo)

- **Consumir el MODELO** `modelFromClientReport(clientReport)` (`ReportArtifactModel`, SSOT) y **recomponerlo** como workbench master-detail. NO embeber el render vertical de `AiVisibilityReportArtifact` (C es otra composición); NO forkear scoring; NO introducir ECharts (charts = Recharts, una sola lib).
- **Left rail (navigator):** lista de `Dimensiones` (7 filas, score + status dot, severidad nombrada no color-only) + `Recomendaciones` (filas priorizadas con impact chip). Una seleccionada (estado `aria-pressed`/selected persistente).
- **Right detail canvas:** detalle del ítem seleccionado — header con contexto de score, **charts en Recharts** (tendencia del snapshot + presencia por motor `providerPresence`), `¿Por qué importa?`, tiles de señal segura (`MetricSummaryCard`), CTA gobernado. Charts con table fallback + `role="img"`/aria + keyboard.
- **Primitives:** reusar los chart/card primitives del artifact + `MetricSummaryCard` + `GreenhouseChartCard`. La composición master-detail se arma con `CompositionShell` (regiones nav + detail) o el primitive de layout vigente — verificar en Discovery qué composición soporta; NO inventar grid/morph ad-hoc.
- **Mobile:** el detail canvas colapsa; selección de fila abre el detalle (drawer temporal del primitive o navegación in-page), con focus restore.

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
- **Charts = Recharts** (los que ya usa el artifact, `AppRecharts`); **NO introducir ECharts** ni una 2.ª lib. Los charts del detail canvas (trend del snapshot + presencia por motor + señales) reusan el mismo enfoque, `lazy`/`ssr:false`, respeta `prefers-reduced-motion`, `role="img"`/`aria-label` + table fallback + keyboard nav.
- Paleta **colorblind-safe** verificada en dark mode; números con `Intl.NumberFormat` es-CL. (Heredado del artifact + aplicar a las cards de señal nuevas.)

**CTA → handoff comercial gobernado:** si un CTA ("solicitar conversación/plan") crea trabajo comercial, debe consumir un **command gobernado existente** del handoff growth→commercial (explícito + auditable, NUNCA mutación silenciosa de estado comercial — domain arch §7). Si no existe, V1 es read-only/contacto y se abre follow-up. Copy honesto: NO prometer el monitor recurrente que aún no se construye.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

**Slice 0 (primitive `masterDetail` en CompositionShell + Lab + GVC + no-regresión de los consumers `split`) MUST ship ANTES de Slice 1** — la vista cliente consume la composición nueva. Luego Slice 1 -> 2 -> 3 -> 4. No agregar CTAs mutativos si no existe command gobernado. La primitive toca blast radius compartido → su slice se hace con cuidado (protocolo completo + no-regresión), idealmente en sesión dedicada.

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
- [ ] La implementación sigue la dirección visual elegida: **Split Workbench (concepto C)** — navigator master-detail (left rail dimensiones+recomendaciones / right detail canvas), no el sidecar de A.
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
