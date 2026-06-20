# TASK-1176 — Design Handoff Operations Cockpit UI

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
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `TASK-1175`
- Branch: `task/TASK-1176-design-handoff-operations-cockpit-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte `/design-system/handoff` en un cockpit operativo enterprise: lanes/Kanban por estado, filtros, inspector, allowlist management UI, owners, prioridad, target route, links a task/PR/deploy, evidencia GVC y cierre con evidencia. La UI es solo cliente de los readers/commands de TASK-1175.

## Why This Task Exists

La UI de TASK-1120 fue una primera cola con inspector. Tras mover el acceso fuera del catalogo, queda claro que el handoff es un workflow operativo, no un specimen del Design System. Para operar diseño -> DEV con calidad enterprise, la pantalla necesita representar el ciclo completo: propuesta, implementacion, review, evidencia, cierre y drift.

Pero no debe inventar logica propia. La task UI nace bloqueada por TASK-1175 para asegurar Full API Parity: todo boton o transicion visible debe llamar un command/reader server-side gobernado.

## Goal

- Reemplazar la cola basica por un cockpit con lanes: `Propuestos`, `En implementacion`, `En review`, `Implementados`, `Archivados`.
- Agregar inspector con owners, priority, target surface, links, evidencia, preview Figma y node health.
- Agregar UI para administrar allowlist de archivos producto, usando commands de TASK-1175.
- Exigir evidencia visual/runtime antes de cerrar como implementado.
- Validar desktop + mobile con GVC y check de scroll horizontal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1175-design-handoff-control-plane-full-api-parity.md`
- `docs/tasks/to-do/TASK-1168-design-system-mobile-shell-overflow-containment.md`

Reglas obligatorias:

- No crear logica de negocio en JSX. Cada accion visible consume command/reader de TASK-1175.
- Usar `CompositionShell` como substrate y `AdaptiveSidecarLayout`/`ContextualSidecar` para inspector.
- No reubicar la UI en el catalogo de primitives/labs. El acceso vive en el sidebar `Design System -> Design handoff`.
- GVC desktop + mobile obligatorio; si el shell DS mantiene overflow global, documentarlo y coordinar con TASK-1168.
- Copy reusable en `src/lib/copy/*` o nomenclatura; no hardcodear strings reusables en componentes.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1175 for backend/data contract, commands/readers/capabilities/errors.
- TASK-1120 for base route and V1 UI.

### Blocks / Impacts

- Improves Design System sidebar workflow and design->DEV operating loop.
- Feeds future Nexa action UX once commands are available.

### Files owned

- `src/views/greenhouse/admin/design-system/DesignHandoffLaneView.tsx`
- `src/app/(dashboard)/design-system/handoff/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` only if navigation copy/placement needs refinement
- `src/lib/copy/*` or `src/config/greenhouse-nomenclature.ts`
- `scripts/frontend/scenarios/**`
- `docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md`

## Current Repo State

### Already exists

- `/design-system/handoff` page and `DesignHandoffLaneView`.
- Sidebar child under `Design System -> Design handoff`.
- Basic queue + create form + preview + inspector.
- GVC markers from TASK-1120.

### Gap

- The view is not yet a complete operations cockpit.
- No lanes, owner/priority/target/link/evidence surfaces.
- No allowlist management UI.
- No close-with-evidence interaction.
- Mobile shell overflow debt may affect visual verification (TASK-1168).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: internal designer, product owner, DEV/operator with `design_system.handoff.*` capabilities.
- Momento del flujo: convertir intencion de diseno Figma en implementacion DEV con evidencia y cierre.
- Resultado perceptible esperado: saber que disenos estan propuestos, en implementacion, en review o cerrados, y que falta para cerrar.
- Friccion que debe reducir: handoffs perdidos en Figma, cierre sin evidencia, links manuales fuera del sistema.
- No-goals UX: no es un nuevo catalogo de primitives; no reemplaza Jira/GitHub/Tasks; no edita Figma.

### Surface & system decision

- Surface: `/design-system/handoff`.
- Composition Shell: `aplica` — `leadPlusContext` or `split` with primary lanes and inspector sidecar.
- Primitive decision: `reuse` — `CompositionShell`, `AdaptiveSidecarLayout`, `ContextualSidecar`, `GreenhouseButton`, `GreenhouseChip`, card density contract where cards condense.
- Adaptive density / The Seam: `aplica` — lane cards must adapt to lane width.
- Floating/Sidecar/Dialog decision: inspector in sidecar; destructive/archive confirmations in dialog; transient metadata actions may use `GreenhouseFloatingSurface` if needed.
- Copy source: `src/lib/copy/*` for reusable handoff states/actions; `src/config/greenhouse-nomenclature.ts` for nav labels.
- Access impact: `entitlements`; UI reflects capabilities but backend remains source of truth.

### State inventory

- Default: lanes with entries grouped by status.
- Loading: lane skeletons and inspector loading state.
- Empty: no handoffs yet; no entries in a filtered lane.
- Error: failed reader/action, with canonical recovery copy.
- Degraded / partial: Figma preview unavailable, node stale/deleted, evidence missing.
- Permission denied: read denied route guard; action disabled/hidden if missing capability.
- Long content: many entries, lane scroll contained; no page horizontal scroll.
- Mobile / compact: lanes become segmented/list view or stacked sections; inspector becomes drawer.
- Keyboard / focus: lane cards selectable, actions reachable, focus restore after sidecar/dialog.
- Reduced motion: no motion-essential state; layout changes degrade honestly.

### Interaction contract

- Primary interaction: select handoff -> inspect -> assign/link/evidence/transition.
- Hover / focus / active: cards and actions use canonical primitive states.
- Pending / disabled: every command button shows pending and disables duplicate submits.
- Escape / click-away: sidecar/dialog behavior follows primitives.
- Focus restore: after dialog/sidecar action, focus returns to origin card/action.
- Latency feedback: inline pending state + toast/alert on command completion.
- Toast / alert behavior: success toast; canonical error banner for failed command.

### Motion & microinteractions

- Motion primitive: `framer layout` via Composition Shell / sidecar primitives; CSS for simple state.
- Enter / exit: lane/card mount with restrained motion.
- Layout morph: sidecar/card selection if supported by shell.
- Stagger: optional for lanes, not required.
- Timing / easing token: motion tokens only.
- Reduced-motion fallback: instant state changes.
- Non-goal motion: no decorative animation.

### Visual verification

- GVC scenario: `design-system-handoff-cockpit`.
- Viewports: desktop 1440x900 and mobile 390px.
- Required captures: default lanes, selected inspector, empty/filter state, allowlist management, missing evidence close attempt.
- Required `data-capture` markers: `design-system-handoff-page`, `design-system-handoff-lanes`, `design-system-handoff-card`, `design-system-handoff-inspector`, `design-system-handoff-allowlist`, `design-system-handoff-evidence`.
- Scroll-width check: desktop and mobile `scrollWidth <= clientWidth`; if global DS shell fails, document as inherited TASK-1168 blocker.
- Accessibility/focus checks: keyboard selection, dialog close/confirm, focus restore.
- Before/after evidence: compare against TASK-1120 capture if available.
- Known visual debt: DS child mobile overflow tracked in TASK-1168.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Data contract integration

- Replace V1 UI assumptions with TASK-1175 enriched reader DTOs.
- Map capabilities to visible affordances without duplicating backend checks.
- Add copy tokens for handoff states, missing evidence, stale node and allowlist actions.

### Slice 2 — Lanes and adaptive cards

- Render status lanes: proposed, in implementation, in review, implemented, archived.
- Add filters for status, owner, priority, target surface and stale/evidence flags.
- Make lane cards adaptive via container density.

### Slice 3 — Inspector actions

- Inspector shows Figma preview/node health, owners, priority, target route, TASK/PR/deploy links and evidence list.
- Actions call TASK-1175 commands: assign, update priority/target, link work item, attach evidence, transition.
- Implemented transition blocks visually when evidence is missing.

### Slice 4 — Allowlist management UI

- Provide an internal allowlist panel for approved product Figma files.
- Upsert/deprecate files via TASK-1175 commands, with audit-friendly copy.
- Never allow AXIS master file as product handoff file.

### Slice 5 — GVC, accessibility and docs

- Add/adjust GVC scenario and markers.
- Capture desktop + mobile and inspect frames.
- Update manual docs and handoff.

## Out of Scope

- Backend schema/commands/readers/capabilities (TASK-1175).
- Fixing global Design System mobile shell overflow (TASK-1168), except documenting evidence.
- Automatic task/PR creation.
- Figma editing or comments writeback.

## Detailed Spec

The cockpit must be a consumer of TASK-1175 only. A visible action is allowed only if there is a corresponding command/reader in TASK-1175:

- allowlist file -> `upsertDesignHandoffAllowedFile`;
- assign owner -> `assignDesignHandoffOwner`;
- planning update -> `setDesignHandoffPlanningFields`;
- link task/PR/deploy -> `linkDesignHandoffWorkItem`;
- evidence attach -> `attachDesignHandoffEvidence`;
- node health refresh -> `verifyDesignHandoffFigmaNode`;
- lifecycle transition -> `transitionDesignHandoffEntry`.

The card/inspector should present blockers as operational facts:

- missing evidence;
- stale/deleted/renamed Figma node;
- no target route;
- no DEV owner;
- due date exceeded.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract integration) -> Slice 2 (lanes/cards) -> Slice 3 (inspector actions) -> Slice 4 (allowlist UI) -> Slice 5 (GVC/docs).
- Do not merge any UI action that lacks a TASK-1175 command.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI recreates business logic | UI/API | medium | command-only action rule + code review | task acceptance |
| Overloaded cockpit becomes hard to scan | UI | medium | lanes + inspector, progressive disclosure | GVC review |
| Mobile overflow persists | UI | high | measure `scrollWidth`, coordinate with TASK-1168 | GVC/layout finding |
| User can attempt forbidden action | auth/UI | low | capability flags in VM + backend command checks | canonical 403 |

### Feature flags / cutover

- No flag required if TASK-1175 commands are capability-gated. Route already exists.
- Revert path: revert PR to TASK-1120 V1 UI if necessary.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert UI contract integration | <10 min | si |
| Slice 2 | revert lanes to V1 queue | <15 min | si |
| Slice 3 | hide action affordances/revert inspector action panel | <15 min | si |
| Slice 4 | hide allowlist panel/revert panel | <10 min | si |
| Slice 5 | revert docs/scenario changes | <10 min | si |

### Production verification sequence

1. Local with TASK-1175 seeded data: default lanes render.
2. Execute one command per action in staging with a test handoff.
3. GVC desktop + mobile + scroll-width check.
4. Verify sidebar path `Design System -> Design handoff`.
5. Production after TASK-1175 runtime rollout is complete or explicitly marked `code complete, rollout pendiente`.

### Out-of-band coordination required

- Approved product Figma `file_key` and token access from TASK-1175.
- If no real product node exists, use seeded test data only and mark runtime smoke pending.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/design-system/handoff` renders lanes for proposed, in implementation, in review, implemented and archived.
- [ ] Inspector shows owners, priority, target surface, Figma node health, links and evidence.
- [ ] Allowlist management UI calls TASK-1175 commands and blocks AXIS master file.
- [ ] Every visible action maps to a TASK-1175 command; no UI-only business logic.
- [ ] Implemented transition is visually blocked until evidence/route requirements are satisfied.
- [ ] States loading/empty/error/degraded/permission/mobile are covered.
- [ ] GVC desktop + mobile captured and reviewed; scroll-width measured.
- [ ] Manual docs explain where to enter and how to operate the cockpit.

## Verification

- `pnpm lint`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
- `pnpm task:lint --task TASK-1176`
- `pnpm route-reachability-gate`
- `pnpm fe:capture design-system-handoff-cockpit --env=staging` or documented local/staging equivalent.
- Manual keyboard/focus review for lanes, inspector and dialogs.

## Closing Protocol

- [ ] `Lifecycle` synchronized with folder.
- [ ] `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [ ] `Handoff.md`, `project_context.md`, `changelog.md` updated.
- [ ] GVC evidence paths recorded in task/handoff.
- [ ] Any inherited TASK-1168 overflow remains documented if unresolved.

