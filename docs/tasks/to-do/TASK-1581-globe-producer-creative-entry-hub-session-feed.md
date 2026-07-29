# TASK-1581 — Globe Producer Creative Entry Hub and Session Feed

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1581-globe-producer-creative-entry-hub-session-feed.md`
- Flow: `docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md`
- Motion: `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño; bloqueada por Project/Session contract y consumer ownership de feed`
- Rank: `TBD`
- Domain: `ui|creative`
- Blocked by: `TASK-1580`, `TASK-1520`, `TASK-1498`
- Branch: `task/TASK-1581-globe-producer-creative-entry-hub-session-feed`

## Summary

Transforma la entrada del Producer desde “elige modalidad/modelo” hacia intención, contexto y sesión. Muestra proyectos y sesiones recientes y agrupa la actividad del feed sin crear un segundo feed ni reemplazar `TASK-1526`/`TASK-1559`.

## Why This Task Exists

Magnific, Higgsfield, Krea y Runway reducen la fricción al comenzar desde un objetivo y conservan el destino antes de generar. El Producer actual muestra actividad y controles, pero no explica dónde vive el trabajo ni qué continuar.

## Goal

- Entry Hub con `Crear`, `Editar`, `Variar`, `Mejorar`, `Animar`, `Convertir` y `Revisar`.
- Context switcher para Project/Collection/Session antes de ejecutar.
- Feed agrupado por Session con estados reales, nuevos resultados y continuation actions.

## Dependencies & Impact

### Depends on

- `TASK-1580`, `TASK-1520`, `TASK-1498`, `TASK-1505`, `TASK-1552`, `TASK-1555`, `TASK-1523`

### Blocks / Impacts

- `TASK-1582`, `TASK-1583`, `TASK-1560`
- Extiende `apps/studio-client/src/surfaces/producer/**` sin apropiarse del transporte del feed.

### Files owned

- `apps/studio-client/src/surfaces/producer/entry/**`
- `apps/studio-client/src/surfaces/producer/feed/**` sólo para composición session-aware
- `apps/studio-client/src/copy/index.ts`
- `docs/ui/wireframes/TASK-1581-globe-producer-creative-entry-hub-session-feed.md`

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer`
- Future candidate home: `remain-shared`
- Boundary: consume context, library, lineage, fleet and feed readers; dispatch existing commands only
- Server/browser split: browser owns presentation/session draft; BFF/API owns authority, query and spend
- Build impact: existing client bundle; no new provider SDK
- Extraction blocker: Globe-specific contracts and route shell

## UI/UX Contract

### Experience brief

- User: creative operator entering or continuing work.
- First decision: intended outcome, not provider.
- Success: user reaches a correctly scoped Session with a visible next action.
- No-goal: public discovery, social feed or free-form canvas.

### Surface/system decision

- Reuse `ProducerWorkspace`, feed/viewer transport and Globe primitives; extend the first fold with an Entry Hub and context rail.
- Recipe cards are intent entry points, not provider cards.
- Project/Collection/Session context stays visible but compact.

### State inventory

`loading`, `empty`, `ready`, `project-selected`, `session-dirty`, `estimate-stale`, `running`, `partial`, `failed`, `denied`, `session-expired`.

### Interaction contract

- Entry intent opens a compatible Session draft.
- Project/Collection switch clears scoped selection and asks before discarding dirty work.
- New live results show a “Nuevos resultados” anchor; they never steal focus or reorder silently.
- Session groups expand/collapse while preserving item-level actions.

### Motion and accessibility

- Consume epic motion contract; only the new session block enters.
- Keyboard reaches intent, context, session groups and actions in DOM order.
- Live updates use polite announcements; reduced motion removes arrival/stagger but preserves state.

### Implementation mapping

- Existing `ProducerWorkspace` remains shell.
- Existing feed reconciler remains source of item truth.
- `TASK-1580` context bundle supplies Project/Session/Element labels.
- `TASK-1520` supplies collections and membership.

### GVC scenario plan

- `globe-producer-entry-session-feed`, `1440×1000` and `390×844`.
- Intent → project → collection → session → generate → new-result anchor → expand session.
- Assert focus, no duplicate feed, no horizontal overflow, honest partial/failed states and reduced motion equivalence.

### Design decision log

- Intent precedes model selection.
- Session grouping preserves creative reasoning without replacing the feed reader.
- Recent work is continuation, not decoration.
- No community discovery in the Producer core.

## Scope

### Slice 1 — Entry Hub and context

- intent cards, recent projects/sessions and active context;
- dirty/switch/empty/error states.

### Slice 2 — Session-aware feed

- group items by authoritative session ID;
- partial/live updates and continuation actions;
- filters remain honest and server-backed where required.

### Slice 3 — Responsive and verification

- desktop/mobile, keyboard, reduced motion and GVC evidence.

## Out of Scope

- Project/Session/Element backend;
- new library/feed transport;
- media playback/canvas implementation;
- review or Element creation UI;
- public boards/community.

## Acceptance Criteria

- [ ] Wireframe exists and passes `pnpm ui:wireframe-check --task TASK-1581`.
- [ ] Epic master flow and motion contracts are declared and consumed.
- [ ] Intent is the first decision and model/provider remains a later governed choice.
- [ ] Session grouping uses authoritative context and does not duplicate feed data.
- [ ] New results never steal focus or silently reorder the user’s position.
- [ ] Dirty context, denied, partial, failed and expired states have recovery copy.
- [ ] Keyboard, reduced motion and `scrollWidth === clientWidth` pass desktop/390px GVC.
- [ ] No visible action is a no-op or an unlabelled future promise.

## Rollout Plan & Risk Matrix

Ship behind the existing client flag, first read-only with fixtures, then internal allowlist. Rollback removes the Entry Hub projection while preserving feed/session data.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| Duplicate feed | client | reuse reconciler and stable keys | item count drift |
| Cross-scope flash | context switch | clear scoped cache before render | old project visible |
| Motion noise | UI | delta-only arrival pattern | repeated list animation |
