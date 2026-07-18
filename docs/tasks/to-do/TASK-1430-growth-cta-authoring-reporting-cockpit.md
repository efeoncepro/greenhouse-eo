# TASK-1430 — Growth CTA authoring and reporting cockpit

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1430-growth-cta-authoring-reporting-cockpit.md`
- Flow: `docs/ui/flows/TASK-1430-growth-cta-authoring-reporting-cockpit-flow.md`
- Motion: `docs/ui/motion/TASK-1430-growth-cta-authoring-reporting-cockpit-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `4`
- Domain: `ui|growth`
- Blocked by: `TASK-1428`
- Branch: `task/TASK-1430-growth-cta-authoring-reporting-cockpit`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Completa `/growth/ctas` como cockpit operator: inventario + detalle, author/review/publish/pause, surfaces/kill switches y reporting básico. Reutiliza commands/readers/APIs existentes y los deltas de TASK-1428; la UI no crea endpoints, reglas ni agregaciones paralelas.

## Why This Task Exists

La vista actual de TASK-1340 permite inventario, lifecycle mínimo y preview, pero no resuelve el flujo completo de authoring/review ni presenta detalle/versiones/conversion summary/controles de surface. El backend ya expone list, detail, author y lifecycle; crear otra foundation sería duplicación.

## Goal

- Workbench operator end-to-end sobre `/growth/ctas` y `gestion.growth_ctas`.
- Authoring/review/publish/pause con estado honesto y confirmaciones.
- Reporting básico y kill switches desde readers/commands canónicos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- Composition Shell como base y primitive reuse antes de crear UI.
- UI cliente del primitive/API; cero SQL, agregación o state machine local.
- Conversión reportada distingue `browser_reported` de `server_confirmed`.
- Copy reusable en `src/lib/copy/growth.ts` y acceso fino por capability.

## Normative Docs

- `src/views/greenhouse/growth/ctas/GrowthCtasGovernanceView.tsx`
- `src/app/(dashboard)/growth/ctas/page.tsx`
- `src/app/api/admin/growth/ctas/**`
- `src/lib/growth/ctas/readers.ts`
- `src/lib/growth/ctas/commands.ts`
- docs UI de esta task

## Dependencies & Impact

### Depends on

- TASK-1428 para kill switches/suppression status.
- APIs/readers/commands TASK-1339 y preview TASK-1340.

### Blocks / Impacts

- Cumple el criterio V1 del cockpit operable; no bloquea runtime público actual.

### Files owned

- `src/views/greenhouse/growth/ctas/**`
- `src/app/(dashboard)/growth/ctas/page.tsx`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/task-1430-growth-cta-cockpit.scenario.ts`
- docs UI de esta task

## Current Repo State

### Already exists

- Route/nav/viewCode, inventario, surfaces, preview y lifecycle básico.
- GET list/detail, POST author, lifecycle endpoint y conversion summary reader.

### Gap

- Sin master-detail operator, editor/review completo, version history/reporting y control visible de kill switches.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: route/view Growth CTA en `src/app` + `src/views`
- Future candidate home: `portal`
- Boundary: UI consume `CtaSummaryVm/CtaDetailVm` y commands/API `growth.cta.*`
- Server/browser split: page/route resuelven auth/data; client maneja interacción, nunca DB/secrets
- Build impact: none
- Extraction blocker: session/capability y Composition Shell del portal

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Growth/Marketing autorizado
- Momento del flujo: crear, revisar, publicar, pausar y leer resultado de CTAs
- Resultado perceptible esperado: una cola y detalle claros con estado/acción confiables
- Friccion que debe reducir: operar por payload/API o vista parcial sin contexto
- No-goals UX: editor visual libre, experimentación o analytics avanzado

### Surface & system decision

- Surface: `/growth/ctas`
- Composition Shell: `aplica` — `leadPlusContext`/`split` según mapping
- Primitive decision: `reuse` — CompositionShell, OperationalPanel, DataTableShell, ContextualSidecar/fields existentes
- Adaptive density / The Seam: aplica en cards/resumen del detalle
- Floating/Sidecar/Dialog decision: sidecar/context region para detalle/editor; confirmación gobernada para publish/pause
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `views|entitlements` existentes, sin nuevo viewCode

### State inventory

- Default: inventario + selección/detalle
- Loading: skeleton por región
- Empty: sin CTAs + CTA author si capability
- Error: retry y causa sanitizada
- Degraded / partial: engine/kill switch/surface o métricas parciales explícitas
- Permission denied: route/view/capability
- Long content: políticas/versiones con wrapping y disclosure
- Mobile / compact: lista→detalle secuencial; no tabla aplastada
- Keyboard / focus: selección, sidecar/dialog, confirmación y restore
- Reduced motion: primitives existentes

### Interaction contract

- Primary interaction: seleccionar → revisar/editar draft → submit review/publish/pause
- Hover / focus / active: filas/acciones con foco visible
- Pending / disabled: acciones bloqueadas durante mutation y por transition/capability
- Escape / click-away: no perder dirty draft; confirmación si aplica
- Focus restore: fila/acción origen
- Latency feedback: inline pending + refresh de detail
- Toast / alert behavior: toast de éxito; Alert persistente para bloqueo/error

### Motion & microinteractions

- Motion primitive: `none` nuevo; reuso de Composition Shell/Sidecar
- Enter / exit: existente en primitives
- Layout morph: Composition Shell existente
- Stagger: none nuevo
- Timing / easing token: existente
- Reduced-motion fallback: primitives
- Non-goal motion: charts/count-up o animaciones decorativas

### Implementation mapping

- Route / surface: `/growth/ctas`
- Primitive / variant / kind: CompositionShell + master/detail/sidecar primitives existentes
- Component candidates: refactor/extend `GrowthCtasGovernanceView`
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: list/detail/author/lifecycle + TASK-1428 kill switch
- API parity: APIs admin existentes; no UI-only business action
- Access / capability: `gestion.growth_ctas` + `growth.cta.read/author/publish/pause`
- States to implement: list/detail/draft/review/published/paused/degraded/error/permission/compact

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1430-growth-cta-cockpit.scenario.ts`
- Route: `/growth/ctas`
- Viewports: 1440 y 390
- Required steps: list/select/detail, author/review confirmation, report, kill-switch state
- Required captures: empty/populated/detail/editor/confirm/degraded/mobile
- Required `data-capture` markers: shell/list/detail/editor/report/surface
- Assertions: auth, no error, keyboard, state labels, capability denials
- Scroll-width checks: obligatorio
- Reduced-motion / focus evidence: sidecar/dialog focus restore

### Design decision log

- Decision: extender la surface existente; no crear `/admin/growth/ctas` paralela
- Alternatives considered: nueva route admin; editor visual drag-drop; API-only
- Why this pattern: conserva nav/viewCode y backend ya shippeado
- Reuse / extend / new primitive: reuse/extend consumer, cero primitive nueva prevista
- Open risks: densidad del detail y edición de JSON/policies; resolver con fields gobernados, no textarea crudo

### Visual verification

- GVC scenario: `task-1430-growth-cta-cockpit`
- Viewports: 1440/390
- Required captures: definidos arriba
- Required `data-capture` markers: shell/list/detail/editor/report/surface
- Scroll-width check: 0
- Accessibility/focus checks: tab order, labels, confirmación, restore
- Before/after evidence: vista TASK-1340 vs cockpit completo
- Known visual debt: analytics avanzado fuera de scope

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

Construir una sola ruta master-detail sobre los readers/commands existentes, sumar únicamente los contratos de TASK-1428 que falten y mantener todas las mutaciones server-confirmed. Composition Shell gobierna regiones; el sidecar/dialog canónico gobierna authoring y confirmaciones; reporting degradado nunca bloquea lifecycle.

## Scope

### Slice 1 — Workbench structure

- Migrar la vista actual a Composition Shell master/detail responsive.
- Cablear list/detail/version/conversion summary sin agregación cliente.

### Slice 2 — Authoring and lifecycle

- Form gobernado para draft/review/publish/pause con capability/state guards.
- Confirmaciones, dirty-state, errores y refresh del detalle.

### Slice 3 — Surfaces, kill switches and evidence

- Mostrar bindings/estado/suppression/kill switch de TASK-1428 y reporting básico.
- GVC desktop/mobile/keyboard/reduced-motion y access matrix.

## Out of Scope

- Nuevos endpoints/schema, editor WYSIWYG, experimentación, cohorts o BI avanzado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1428 → estructura/read-only → author/lifecycle → kill switches/report → GVC/staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| UI permite transición inválida | lifecycle | medium | server result + state guard + tests | canonical error |
| Report mezcla browser/server truth | reporting | medium | DTO labels explícitos | QA/data test |
| Mobile aplasta workbench | UI | medium | Composition Shell compact + GVC 390 | scrollWidth |

### Feature flags / cutover

- Reusa `GROWTH_CTA_ENGINE_ENABLED`; route conserva acceso/flag actuales.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Workbench | revert view/page | <10 min | si |
| Mutations | UI rollback; APIs permanecen | <10 min | si |

### Production verification sequence

1. Tests component/access y GVC local.
2. Staging con datos reales y roles read/author/publish/pause.
3. Smoke lifecycle controlado con revert/restore.
4. GVC staging 1440/390 y rollout portal.

### Out-of-band coordination required

- Operador Growth valida terminology, fields de authoring y reporte mínimo.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `/growth/ctas` usa Composition Shell y conserva route/viewCode existentes.
- [ ] Inventario/detalle/versiones/reporting consumen readers/APIs canónicos sin derivar business truth en UI.
- [ ] Author/review/publish/pause y kill switches respetan capabilities, transitions y confirmación.
- [ ] `browser_reported` y `server_confirmed` se distinguen visual y semánticamente.
- [ ] Estados empty/loading/error/degraded/permission/compact/dirty quedan cubiertos.
- [ ] GVC 1440/390, keyboard/focus/reduced-motion y overflow 0 pasan.
- [ ] No nace primitive ni endpoint paralelo.
- [ ] `pnpm task:lint --task TASK-1430` y gates UI pasan.

## Verification

- `pnpm exec vitest run src/views/greenhouse/growth/ctas src/lib/growth/ctas`
- `pnpm task:lint --task TASK-1430`
- `pnpm ui:wireframe-check --task TASK-1430`
- `pnpm ui:flow-check --task TASK-1430`
- `pnpm ui:readiness-check --task TASK-1430`
- `pnpm fe:capture task-1430-growth-cta-cockpit --env=staging`
- `pnpm design:lint`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados.
- [ ] Functional/manual/Handoff/changelog actualizados según docs governor.
- [ ] QA Release Auditor + enterprise UI review sin blockers.
- [ ] Chequeo de impacto cruzado completado.

## Follow-ups

- Experimentación/advanced analytics permanecen deferred post-V1.
