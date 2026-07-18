# TASK-1447 — Glitch Editorial Operations Desk

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1447-glitch-editorial-operations-desk.md`
- Flow: `docs/ui/flows/TASK-1447-glitch-editorial-operations-desk-flow.md`
- Motion: `docs/ui/motion/TASK-1447-glitch-editorial-operations-desk-motion.md`
- Backend impact: `none`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-1442, TASK-1444, TASK-1448`
- Branch: `task/TASK-1447-glitch-editorial-operations-desk`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea Glitch Desk dentro de Greenhouse: workbench queue + evidence inspector para supervisar Weekly, candidatas Daily/Flash, promociones Glitch Flash y runs/recovery consumiendo únicamente primitives backend gobernadas.

## Why This Task Exists

Notion funciona como calendario, pero no explica locks, evidence completeness, decisiones del agente, writes parciales, retries ni promoción gobernada. Sin una UI operativa, la autonomía sería difícil de supervisar y recuperar.

## Goal

- Mostrar edición, candidatas, evidencia y runs con excepciones primero.
- Permitir acciones gobernadas sin duplicar state machines en React.
- Hacer visible que Daily/Flash son internos y que promover no equivale a publicar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`

Reglas obligatorias:

- CompositionShell es el substrato y ContextualSidecar el inspector; no crear layout/drawer paralelo.
- UI es cliente del mismo reader/command que agentes/CLI; no accede DB, Notion o WordPress directamente.
- Ningún control representa Daily/Flash como publicación ni ofrece auto-publish.

## Normative Docs

- `DESIGN.md`
- `docs/ui/wireframes/TASK-1447-glitch-editorial-operations-desk.md`
- `docs/ui/flows/TASK-1447-glitch-editorial-operations-desk-flow.md`
- `docs/ui/motion/TASK-1447-glitch-editorial-operations-desk-motion.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1442` readers/domain, `TASK-1444` mappings/adapters y `TASK-1448` promotion commands.

### Blocks / Impacts

- `TASK-1446` rollout/closure; futuras surfaces Nexa/MCP consumen contracts, no esta UI.

### Files owned

- `src/app/(dashboard)/growth/glitch/`
- `src/views/growth/glitch/`
- `src/lib/copy/glitch.ts`
- `scripts/frontend/scenarios/glitch-editorial-operations-desk.scenario.ts`
- `docs/ui/wireframes/TASK-1447-glitch-editorial-operations-desk.md`
- `docs/ui/flows/TASK-1447-glitch-editorial-operations-desk-flow.md`
- `docs/ui/motion/TASK-1447-glitch-editorial-operations-desk-motion.md`

## Current Repo State

### Already exists

- CompositionShell, ContextualSidecar, OperationalPanel, table/list patterns, breadcrumbs, chips, buttons y GVC.

### Gap

- No existe route/view Glitch ni copy/access/scenario; backend contracts aún deben cerrar antes de `UI ready: yes`.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/growth/glitch/ + src/views/growth/glitch/`
- Future candidate home: `portal`
- Boundary: `thin consumer de Glitch readers/commands; sin lógica editorial o provider SDK`
- Server/browser split: `page/server adapters resuelven acceso/DTO; client maneja selección, foco y commands tipados`
- Build impact: `route y scenario GVC; sin dependencia pesada`
- Extraction blocker: `view/capabilities y API contracts de TASK-1442/1448`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: content strategist/editor y approver Efeonce.
- Momento del flujo: supervisión de Weekly, triage de candidatas, promotion y recovery.
- Resultado perceptible esperado: entender en segundos qué está listo, qué falta y qué consecuencia tiene cada acción.
- Friccion que debe reducir: saltar entre Notion, logs, Markdown y WordPress para reconstruir una decisión.
- No-goals UX: editor Gutenberg, prompt playground, analytics de audiencia, page builder o publish automático.

### Surface & system decision

- Surface: nueva route operacional `/growth/glitch`.
- Composition Shell: `aplica` — composición `leadPlusContext`, regiones lead/primary/aside/dock y `fluidity='rich'`.
- Primitive decision: `reuse` — CompositionShell, DataTableShell/list patterns, OperationalPanel, ContextualSidecar inspector, GreenhouseButton/Chip/Breadcrumbs.
- Adaptive density / The Seam: `aplica` — summary/run cards nacen full/condensed/peek por ancho propio.
- Floating/Sidecar/Dialog decision: ContextualSidecar no modal desktop/Drawer mobile; Dialog sólo si confirm policy exige consecuencia bloqueante.
- Copy source: `src/lib/copy/glitch.ts`.
- Access impact: `views|entitlements` — nombres finales/grants deben congelarse con backend antes de readiness.

### State inventory

- Default: Weekly activa, Top 8/readiness y excepciones; candidate/run tabs disponibles.
- Loading: skeleton por región sin bloquear shell completo.
- Empty: distingue “Daily sin señal” de “filtro sin resultados”.
- Error: preserva última selección confiable y ofrece retry sin raw error.
- Degraded / partial: marca evidence/mapping/run faltante y bloquea sólo la acción insegura.
- Permission denied: surface fail-closed sin filtrar candidatas/evidencia.
- Long content: inspector scrollea internamente con heading/fuentes persistentes.
- Mobile / compact: regions stack; inspector como Drawer temporal; run dock no tapa primary.
- Keyboard / focus: queue navegable, Enter abre, Escape cierra, foco vuelve a row; Dialog trap sólo en confirm.
- Reduced motion: shell/sidecar instantáneos con significado intacto.

### Interaction contract

- Primary interaction: seleccionar historia/candidata/run y decidir desde evidencia contextual.
- Hover / focus / active: estados canónicos, selection no sólo color.
- Pending / disabled: commands bloquean sólo conflictos; no optimistic business transition.
- Escape / click-away: sidecar desktop Escape; mobile Drawer click-away salvo command pending; Dialog sólo Escape si policy permite.
- Focus restore: row/action originaria.
- Latency feedback: pending inmediato + terminal live status + audit reference cuando exista.
- Toast / alert behavior: estado local inline para resultado; toast sólo para confirmation global no visible.

### Motion & microinteractions

- Motion primitive: `framer layout` mediante primitives existentes + CSS tokenizado.
- Enter / exit: CompositionShell rich y ContextualSidecar defaults.
- Layout morph: sólo primitives; no hand-wire de `gh-region-*`.
- Stagger: first load de regions, no rows en cada refresh.
- Timing / easing token: `short|standard` y `standard|emphasized` canónicos.
- Reduced-motion fallback: aparecer/cambiar instantáneo con focus/status preservados.
- Non-goal motion: GSAP, scroll reveals, animated scores o celebración.

### Implementation mapping

- Route / surface: `/growth/glitch`.
- Primitive / variant / kind: CompositionShell `leadPlusContext`; ContextualSidecar `inspector`/`glitchEvidence`; shared adaptive card density.
- Component candidates: `GlitchOperationsView`, `GlitchCandidateQueue`, `GlitchEditionWorkbench`, `GlitchRunDock` route-local.
- Copy source: `src/lib/copy/glitch.ts`.
- Data reader / command: TASK-1442/1444 readers; TASK-1448 promotion; TASK-1445 recovery.
- API parity: no client business rules; UI/agent/CLI share server primitive.
- Access / capability: view/capability final definidos antes de readiness; route no nace sin nav/reachability/grant.
- States to implement: default/loading/empty/partial/error/denied/long/mobile/pending/success.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/glitch-editorial-operations-desk.scenario.ts`.
- Route: `/growth/glitch`.
- Viewports: 2048x1280, 1440x900 y 390x844.
- Required steps: Weekly ready/partial; candidates; inspector open/replace/close; promotion preview/confirm; run retry/error; denied.
- Required captures: first fold, Top 8, evidence, disclosure Glitch Flash, command result, degraded y mobile.
- Required `data-capture` markers: `glitch-desk`, header, queue, inspector, promotion confirm, run dock y state markers.
- Assertions: no auto-publish, Daily/Flash sólo promueven, focus restore, canonical breadcrumbs, status live.
- Scroll-width checks: `scrollWidth <= clientWidth` desktop y 390; scroll local accesible si tabla desborda.
- Reduced-motion / focus evidence: scenario con reduced-motion y keyboard-only open/close/confirm.

### Design decision log

- Decision: queue + inspector en CompositionShell; Notion permanece calendario y WordPress editor externo.
- Alternatives considered: dashboard KPI, editor WP embebido, custom three-column grid, desktop Drawer y rutas separadas.
- Why this pattern: triage/evidence/decision requieren comparación y contexto persistente.
- Reuse / extend / new primitive: reuse; cero primitive nueva.
- Open risks: densidad Top 8, final capability names y nivel modal de confirmación.

### Visual verification

- GVC scenario: `glitch-editorial-operations-desk`.
- Viewports: 2048, 1440, 390.
- Required captures: ready/partial/error/denied, inspector, promotion, run recovery y reduced motion.
- Required `data-capture` markers: contrato wireframe.
- Scroll-width check: desktop/mobile document y regiones.
- Accessibility/focus checks: queue, tabs, sidecar, Dialog, live status.
- Before/after evidence: N/A nueva surface; baseline se promueve sólo tras mockup/primer corte aprobado.
- Known visual debt: ninguno aceptado antes de GVC; open risks deben resolverse en Plan Mode.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Read-only workbench

- Route/access/navigation, copy, shell, Weekly/Candidates/Runs y evidence inspector.
- Estados completos, responsive, keyboard y GVC baseline.

### Slice 2 — Governed actions

- Promotion propose/confirm, run recovery y private-draft links mediante commands existentes.
- Pending/error/audit feedback y GVC flow completo.

## Out of Scope

- Backend/DB/API nuevos, Gutenberg editing, public publish, prompt editing, analytics de audiencia y primitive UI nueva.

## Detailed Spec

La UI nunca recibe provider credentials ni genera un publishable spec. Toda action preview proviene del backend y muestra consecuencia explícita; `Proponer como Glitch Flash` no se etiqueta “Publicar”.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Backend contracts cerrados -> readiness yes -> read-only route -> GVC -> actions behind capability -> GVC flow -> rollout operator.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI sugiere publish directo | content/UI | medium | copy/disclosure + no publish command | GVC/contract test |
| Lógica de promotion en client | UI/API | medium | commands TASK-1448 | lint/contract tests |
| Densidad/overflow | UI | medium | shell + The Seam + 390 check | GVC layout finding |

### Feature flags / cutover

Route/grants y action controls se activan después de read-only GVC; backend flags conservan writes OFF hasta rollout.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Read-only | retirar nav/view grant o revert route | <15 min | sí |
| Actions | retirar capabilities/flag; conservar read-only | <10 min | sí |

### Production verification sequence

Local fixture -> staging read-only/GVC -> staging action smoke -> prod hidden grant -> operator canary -> nav visible -> monitor signals.

### Out-of-band coordination required

Sign-off Product Design sobre GVC y operador sobre grants/confirmation consequence; no cambio WordPress directo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Task declara UI/flow/motion contracts existentes y `UI ready` permanece `no` hasta cerrar backend mapping/access.
- [ ] CompositionShell + ContextualSidecar se reutilizan; no nace grid/drawer/primitive paralelo.
- [ ] Daily/Flash aparecen como candidatas internas y sólo ofrecen promoción gobernada.
- [ ] Weekly, Glitch Flash y runs muestran evidencia, estado y recovery sin lógica client-side duplicada.
- [ ] Copy reusable vive en `src/lib/copy/glitch.ts`; estados completos y consecuencias son explícitos.
- [ ] GVC desktop/laptop/mobile/reduced-motion/focus fue capturado y mirado.
- [ ] No existe overflow de página en desktop ni 390px.
- [ ] `pnpm task:lint --task TASK-1447`, wireframe/flow/motion/readiness checks pasan sin findings antes de JSX.

## Verification

- `pnpm task:lint --task TASK-1447`
- `pnpm ui:wireframe-check --task TASK-1447`
- `pnpm ui:flow-check --task TASK-1447`
- `pnpm ui:motion-check --task TASK-1447`
- `pnpm ui:readiness-check --task TASK-1447`
- `pnpm design:lint`
- Tests focales + `pnpm fe:capture glitch-editorial-operations-desk --env=staging`.
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/carpeta/README, wireframe/flow/motion, navigation/access docs, changelog y Handoff sincronizados.
- [ ] GVC dossier mirado y QA release auditor + documentation governor ejecutados.

## Follow-ups

- Analytics/measurement o authoring inline sólo con evidencia y task separada.

