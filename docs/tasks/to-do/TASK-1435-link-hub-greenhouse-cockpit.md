# TASK-1435 — Link Hub Greenhouse cockpit

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1435-link-hub-greenhouse-cockpit.md`
- Flow: `docs/ui/flows/TASK-1435-link-hub-greenhouse-cockpit-flow.md`
- Motion: `docs/ui/motion/TASK-1435-link-hub-greenhouse-cockpit-motion.md`
- Backend impact: `none`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|agency`
- Blocked by: `TASK-1433`
- Branch: `task/TASK-1435-link-hub-greenhouse-cockpit`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Construye `/growth/link-hubs` como control plane humano completo: queue multi-marca, editor de draft/bloques/theme, preview canónico, validation, publish/rollback, estados de dominio, analytics e historial. Toda acción consume los primitives de `TASK-1433/1436/1437`; la UI no posee reglas de negocio.

## Why This Task Exists

“Todo controlado desde Greenhouse” exige una superficie operator-facing que sustituya operación manual en DB/Vercel/GA4. La experiencia debe hacer visible qué está draft, qué está publicado, qué dominio sirve tráfico y qué evidencia es confiable, sin convertirse en page builder ni duplicar paneles por marca.

## Goal

- Operar Efeonce y clientes desde la misma queue/workbench con access tenant-scoped.
- Comparar draft/published mediante el renderer canónico antes de confirmar.
- Publicar/rollback sin perder la última versión live.
- Integrar dominio/analytics como estados del mismo aggregate, no dashboards separados.

<!-- ZONE 1 -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`

Reglas obligatorias:

- Composition Shell es la base; queue/workbench + preview sidecar reuse primitives existentes.
- UI es thin client; no direct DB/provider/analytics calculations.
- Copy reusable vive en `src/lib/copy/growth.ts`; nomenclatura nav en config canónica.
- Publish/rollback/domain writes usan confirmación, capability y errores canónicos.
- Reorder tiene alternativa keyboard; drag nunca es único método.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- wireframe/flow declarados en Status
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- `TASK-1433` commands/readers/preview/version history.
- `TASK-1434` renderer compartido para preview parity.
- Integra incrementalmente `TASK-1436/1437`; puede entregar placeholders honestos hasta que cierren.

### Blocks / Impacts

- Bloquea operación del piloto `TASK-1438` sin paneles manuales.

### Files owned

- `src/app/**/growth/link-hubs/**`
- `src/views/growth/link-hubs/**`
- `src/lib/copy/growth.ts`
- `src/config/greenhouse-nomenclature.ts`
- nav/route/access registries aplicables
- `scripts/frontend/scenarios/link-hub-cockpit.scenario.ts`

## Current Repo State

### Already exists

- CompositionShell, DataTableShell, OperationalPanel, ContextualSidecar, GreenhouseBreadcrumbs, access/navigation patterns y GVC.

### Gap

- No existe route/nav/cockpit Link Hub ni UI para versioning/publish/domain/analytics.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/**/growth/link-hubs/**` + `src/views/growth/link-hubs/**`.
- Future candidate home: `portal`
- Boundary: DTO/readers/commands de `growth.link_hub`; UI no importa stores/providers.
- Server/browser split: Server Components leen DTOs; Client Components reciben datos/callbacks browser-safe.
- Build impact: `none`; reusa primitives y dependencies vigentes.
- Extraction blocker: session/access/nav y Composition Shell del portal.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Growth/Social; futuro usuario cliente autorizado.
- Momento del flujo: crear/editar/publicar/medir una bio link.
- Resultado perceptible esperado: sabe exactamente qué versión está live y puede cambiarla con recuperación.
- Friccion que debe reducir: saltar entre DB, Vercel, Analytics y hojas/manuales.
- No-goals UX: page builder, freeform CSS, publicación social.

### Surface & system decision

- Surface: `/growth/link-hubs` + detail.
- Composition Shell: `aplica` — `leadPlusContext`, primary editor + aside preview + dock publish.
- Primitive decision: `reuse` — DataTableShell/OperationalPanel/ContextualSidecar/GreenhouseBreadcrumbs.
- Adaptive density / The Seam: `aplica` — status/analytics cards nuevas nacen density-aware.
- Floating/Sidecar/Dialog decision: ContextualSidecar preview; canonical confirm for publish/rollback.
- Copy source: `src/lib/copy/growth.ts|src/config/greenhouse-nomenclature.ts`.
- Access impact: `routeGroups|views|entitlements`.

### State inventory

- Default: queue/detail con published status.
- Loading: table/detail skeleton.
- Empty: first Link Hub CTA.
- Error: retry preserving draft.
- Degraded / partial: analytics/domain unavailable; content editing remains explicit.
- Permission denied: no brand data/oracle.
- Long content: block limits and preview scroll.
- Mobile / compact: stack; preview temporary drawer.
- Keyboard / focus: queue/detail/reorder/confirm complete.
- Reduced motion: rich shell respects preference.

### Interaction contract

- Primary interaction: edit -> validate -> confirm publish.
- Hover / focus / active: canonical primitives.
- Pending / disabled: duplicate publish disabled; exact reason visible.
- Escape / click-away: preview/confirm restore focus; never discard dirty state.
- Focus restore: originating button/block.
- Latency feedback: pending + server outcome/version ID.
- Toast / alert behavior: success concise; error actionable and inline summary.

### Motion & microinteractions

- Motion primitive: `framer layout`
- Enter / exit: inherited Composition Shell only.
- Layout morph: standard shell compact behavior.
- Stagger: shell default rich.
- Timing / easing token: canonical motion tokens.
- Reduced-motion fallback: no stagger/morph dependency.
- Non-goal motion: custom animated editor/page preview effects.

### Implementation mapping

- Route / surface: paths owned.
- Primitive / variant / kind: CompositionShell leadPlusContext; ContextualSidecar evidence/preview.
- Component candidates: paths owned.
- Copy source: canonical files.
- Data reader / command: TASK-1433 + domain/analytics children.
- API parity: Product API over same primitives; Nexa/MCP planned in foundation.
- Access / capability: `growth.link_hub.*` + brand scope.
- States to implement: inventory completo.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/link-hub-cockpit.scenario.ts`
- Route: list/detail fixtures.
- Viewports: 1440/390.
- Required steps: queue, edit/reorder, preview, blocked/success publish, domain, analytics/history.
- Required captures: wireframe flow.
- Required `data-capture` markers: wireframe mapping.
- Assertions: dirty-state, access, canonical preview, no overflow/raw errors.
- Scroll-width checks: 1440/390.
- Reduced-motion / focus evidence: keyboard route + confirm/sidecar restore.

### Design decision log

- Decision: queue + workbench/preview; publish lifecycle is primary axis.
- Alternatives considered: wizard-only, modal editor, page builder.
- Why this pattern: repeat use and cross-brand operation demand context and safe comparison.
- Reuse / extend / new primitive: reuse; domain components only.
- Open risks: concurrent edits and domain polling depend on backend contracts.

### Visual verification

- GVC scenario: `link-hub-cockpit`.
- Viewports: 1440/390.
- Required captures: queue/editor/preview/validation/published/domain/analytics/history.
- Required `data-capture` markers: declared.
- Scroll-width check: mandatory.
- Accessibility/focus checks: keyboard reorder, dialog/drawer, live status.
- Before/after evidence: new surface baseline after approval.
- Known visual debt: none accepted for pilot.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Route, access and queue

- Register route/nav/view/capabilities and tenant-scoped list/create entry.
- Implement empty/loading/error/denied states.

### Slice 2 — Editor and canonical preview

- Build typed block/theme editor, accessible reorder and shared renderer preview.
- Preserve draft/dirty/revision conflict semantics from backend.

### Slice 3 — Lifecycle and operational facets

- Validate/confirm publish, history/rollback and published URL status.
- Integrate domain and analytics readers/actions when child contracts are ready.

## Out of Scope

- Backend logic/schema, public renderer implementation, provider APIs, social profile mutation, WYSIWYG/custom code.

## Detailed Spec

No local DTO mirrors beyond browser-safe contract. Domain/analytics sections may be feature-gated until their tasks close, but must not display fabricated zeros or “active” before runtime evidence.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Access/queue -> editor/preview -> publish/operational facets.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI publica stale revision | UI/API | medium | revision conflict/rehydrate | canonical error |
| cross-brand selection leak | access | low | server-scoped list/detail | denied/not-found tests |
| drag inaccessible | UI | medium | buttons/keyboard first | keyboard GVC |
| status false green | UI | medium | freshness + exact backend state | partial/degraded fixture |

### Feature flags / cutover

- `GROWTH_LINK_HUB_ENABLED` gates nav/route; no production visibility before pilot.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag OFF/nav hidden | <10 min | sí |
| 2 | revert view; API intact | <1 h | sí |
| 3 | flag facets/actions OFF; published stays | <15 min | sí |

### Production verification sequence

1. GVC local fixtures.
2. Staging auth/access two roles/two tenants.
3. End-to-end draft/publish/rollback with public page.
4. Deploy prod flag OFF; activate in TASK-1438.

### Out-of-band coordination required

N/A until pilot; operator approval for nav/capability grants.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Wireframe/flow exist and focal checks pass.
- [ ] UI ready remains `no` until implementation mapping/GVC/decision log and lint are green.
- [ ] Queue/detail reveal only authorized brands and anti-oracle states.
- [ ] Editor/preview use TASK-1433/1434 contracts and contain no business/provider logic.
- [ ] Publish/rollback survive retry/conflict and previous published remains live on failure.
- [ ] Keyboard reorder, focus restore, reduced motion, desktop/mobile GVC and no horizontal scroll pass.
- [ ] Copy resides in canonical source and all operational states are honest.

## Verification

- `pnpm task:lint --task TASK-1435`
- `pnpm ui:wireframe-check --task TASK-1435`
- `pnpm ui:flow-check --task TASK-1435`
- `pnpm ui:readiness-check --task TASK-1435`
- `pnpm fe:capture link-hub-cockpit --env=staging`
- access/route/reachability/unit/E2E tests

## Closing Protocol

- [ ] Lifecycle/carpeta/index/Handoff/changelog synchronized.
- [ ] GVC reviewed; nav/access reachability proven.
- [ ] `pnpm qa:gates --changed` and `pnpm docs:closure-check` executed.

## Follow-ups

- `TASK-1436`, `TASK-1437`, `TASK-1438`, `TASK-1439`.

## Open Questions

- None blocking; capability grant matrix is finalized during TASK-1433 implementation and consumed here.
