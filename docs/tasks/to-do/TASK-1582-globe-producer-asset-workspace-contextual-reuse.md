# TASK-1582 — Globe Producer Asset Workspace and Contextual Reuse

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1582-globe-producer-asset-workspace-contextual-reuse.md`
- Flow: `docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md`
- Motion: `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño; bloqueada por TASK-1580 y media canvas owners`
- Rank: `TBD`
- Domain: `ui|creative`
- Blocked by: `TASK-1580`, `TASK-1503`, `TASK-1498`, `TASK-1568`, `TASK-1570`, `TASK-1571`
- Branch: `task/TASK-1582-globe-producer-asset-workspace-contextual-reuse`

## Summary

Evoluciona el viewer del Producer hacia un Asset Workspace: media stage, inspector, proyecto, colección, sesión, lineage, provenance y action rail contextual. Consume los canvases de imagen/audio/video; no crea un segundo viewer ni otro reproductor.

## Why This Task Exists

Las suites maduras hacen que editar, comparar, reutilizar y organizar comiencen desde el asset. El viewer actual inspecciona metadata, pero todavía no es el centro de continuidad entre generación, lineage, review y reuse.

## Goal

- Abrir un asset sin perder proyecto, sesión, colección ni posición del feed.
- Mostrar acciones válidas según modality, rights, lineage y capability.
- Crear entradas seguras hacia editar, variar, comparar, review, collection y reuse.

## Dependencies & Impact

### Depends on

- `TASK-1580`, `TASK-1503`, `TASK-1498`, `TASK-1526`, `TASK-1559`
- `TASK-1568`, `TASK-1570`, `TASK-1571`

### Blocks / Impacts

- `TASK-1583`, `TASK-1572`, `TASK-1574`, `TASK-1577`
- Existing `ProducerViewer` and feed action surface.

### Files owned

- `apps/studio-client/src/surfaces/producer/viewer/**`
- `apps/studio-client/src/surfaces/producer/asset-workspace/**`
- `apps/studio-client/src/copy/index.ts`
- `docs/ui/wireframes/TASK-1582-globe-producer-asset-workspace-contextual-reuse.md`

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/viewer`
- Future candidate home: `remain-shared`
- Boundary: consume governed asset, lineage, context, review and media projections; dispatch existing commands
- Server/browser split: browser renders allowlisted facts; server validates action/capability/rights and owns bytes
- Build impact: existing client bundle; media packages remain task-owned
- Extraction blocker: Globe viewer shell and modality canvas contracts

## UI/UX Contract

### Experience brief

- User: operator inspecting a candidate or approved asset.
- Dominant decision: continue, compare, review or reuse.
- Success: the next action is obvious and preserves lineage/context.
- No-goal: full NLE, DAW or free-form design canvas.

### Surface/system decision

- Extend native `ProducerViewer` into a focus-managed Asset Workspace.
- Keep modality stages delegated to `TASK-1568`, `TASK-1570`, `TASK-1571`.
- Use contextual panel/action rail; do not add icon-only no-op controls.

### State inventory

`loading`, `ready`, `preview-pending`, `degraded`, `not-found`, `access-denied`, `trashed`, `superseded`, `lineage-unavailable`, `action-gated`, `command-pending`, `command-failed`.

### Interaction contract

- Opening from card restores exact focus/scroll on close.
- Action rail orders `Continuar`, `Recrear`, `Usar como referencia`, `Crear Element`, `Comparar`, `Enviar a revisión`, `Descargar`, `Compartir`, `Más`.
- Compare is enabled only with real lineage.
- Parent remains visible when creating a child session.
- Collection placement confirms without removing the source asset from the current view.

### Motion and accessibility

- Asset expands into workspace with bounded motion; reduced motion opens directly.
- Dialog/sheet traps focus and makes background inert.
- Every action has text name, focus state and server-backed pending/result copy.
- Video/audio playback remains single-source and single-active-player.

### Implementation mapping

- `ProducerViewer` retains governed media resolver and provenance facts.
- New context inspector consumes `TASK-1580`.
- Lineage uses `TASK-1498`; actions use `TASK-1503`; review uses `TASK-1522`.
- Media stage delegates to existing modality tasks.

### GVC scenario plan

- `globe-producer-asset-workspace`, desktop/390px and reduced motion.
- Open from image/video/audio cards; inspect; compare valid/invalid lineage; action-gated; close and restore.
- Assert no raw alt text, no no-op actions, no cross-scope data and no horizontal overflow.

### Design decision log

- Viewer becomes a workspace, not a larger lightbox.
- Metadata is progressive: scan in stage, understand in inspector, act in rail.
- Contextual action hierarchy beats eight equal icon buttons.
- Parent/child continuity is visible but never inferred.

## Scope

### Slice 1 — Workspace composition

- media stage, inspector, action rail and context breadcrumb;
- focus, dialog, deep-link and recovery states.

### Slice 2 — Contextual actions

- lineage/compare entry;
- edit/reference/recreate/collection/review/share handoffs;
- pending/error/gated outcomes.

### Slice 3 — Responsive verification

- modality-specific layouts, mobile sheets/dock, reduced motion and GVC.

## Out of Scope

- backend Project/Session/Element contract;
- media playback/canvas internals;
- full timeline editor or DAW;
- new commands, provider SDKs or client-side rights decisions.

## Acceptance Criteria

- [ ] Wireframe exists and passes `pnpm ui:wireframe-check --task TASK-1582`.
- [ ] Epic flow/motion contracts are declared.
- [ ] Workspace displays authoritative project/collection/session/lineage facts.
- [ ] No visible action is a no-op; unavailable actions explain the blocking reason.
- [ ] Compare is disabled unless lineage proves a relationship.
- [ ] Image/video/audio stages preserve their existing owners and playback rules.
- [ ] Focus trap, inert background, Escape and trigger restoration pass.
- [ ] Desktop/390px/reduced-motion GVC proves no raw alt text, overflow or context loss.

## Rollout Plan & Risk Matrix

Release additively behind the existing client flag. First enable read-only workspace/context, then action handoffs. Rollback returns to the existing viewer without deleting asset data.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| viewer duplication | UI | extend existing viewer and keep one route | two competing viewers |
| action optimism | API/UI | server result required before lineage/status change | false success |
| media regressions | modality tasks | contract tests and GVC per modality | playback/focus failure |
