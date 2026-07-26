# EPIC-028 — Globe Creative Studio Master UI Flow

## Meta

- Epic: `EPIC-028`
- Status: `draft`
- Flow type: `program-level multi-surface`
- Primary surface: `/producer`
- Related policy owner: `TASK-1523`
- Related implementation owners: `TASK-1505`, `TASK-1520`, `TASK-1526`, `TASK-1552`, `TASK-1559`
- New consumer tasks: `TASK-1581`, `TASK-1582`, `TASK-1583`
- Audience: authorized creative operator, reviewer and delivery owner

## Product thesis

Globe is not a gallery of generations. It is a governed creative production workspace in which every generation has context, every decision leaves evidence and every asset can continue into the next production step.

```text
Creative Entry Hub
  → Workspace / Project / Collection
  → Session
  → Generate
  → Asset Workspace
  → Lineage / Compare
  → Review / Approval
  → Element / Reuse
  ↺ New Session
```

The flow preserves the existing source of truth. It does not create a second feed, viewer, library, project store or spend engine.

## Mental model

| Object | User meaning | Existing owner |
|---|---|---|
| Workspace | where authority, members, credits and capabilities apply | `TASK-1511` |
| Project | what is being produced and for whom | `TASK-1580` contract / `TASK-1581` consumer |
| Collection | intentional editorial grouping of assets | `TASK-1520` |
| Session | bounded creative exploration with prompt, references and estimate | `TASK-1580` contract / `TASK-1581` consumer |
| Candidate | output still being explored | `TASK-1498` |
| Asset | retained, retrievable output | `TASK-1503` |
| Element | named, rights-valid reusable asset | `TASK-1580` contract / `TASK-1583` consumer |
| Lineage | authoritative parent/child relationship | `TASK-1498` |
| Review | human feedback, decision and approval | `TASK-1522` |

## Route map

```text
/producer
/producer/project/:projectId
/producer/project/:projectId/collection/:collectionId
/producer/project/:projectId/session/:sessionId
/producer/asset/:experimentId/:sha256
/producer/asset/:experimentId/:sha256/lineage
/producer/asset/:experimentId/:sha256/review
/producer/asset/:experimentId/:sha256/reuse
```

Deep links resolve in this order: `auth → workspace → project → collection/session → asset → capability`. A client-provided ID never grants access. Cross-workspace absence resolves as `not_found` without existence leakage.

## Master flow

### A. Creative Entry Hub

The first decision is intention, not provider or model:

```text
Crear · Editar · Variar · Mejorar · Animar · Convertir · Revisar
```

The hub then exposes compatible Creative Recipes, references, output shapes, routes, estimates and constraints. Recent sessions, projects and review requests are continuation points rather than decorative cards.

### B. Project and Collection context

The user may enter from a project, collection, recipe, asset, review comment or recreate link. The active context remains visible while composing. Collection membership is additive and does not remove an asset from the current view.

### C. Session and generation

```text
Session
  → prompt / references / recipe
  → estimate current
  → prepare
  → explicit spend approval
  → execute
  → durable run states
  → session result
```

The CTA is unavailable while the estimate is stale, the route is unavailable, a reference is unresolved, the workspace changed or policy denies the operation. No percentage is derived from elapsed time.

### D. Asset Workspace

The asset workspace is the convergence point for media, metadata and decisions:

```text
Media Stage | Inspector | Action Rail | Lineage | Review | Related Candidates
```

Media-specific owners remain `TASK-1571` (image), `TASK-1570` (video) and `TASK-1568` (audio). The workspace adds context and actions; it does not reimplement their players/canvases.

Primary actions are contextual: `Continuar editando`, `Recrear`, `Usar como referencia`, `Crear Element`, `Comparar`, `Enviar a revisión`, `Descargar`, `Compartir`.

### E. Lineage and compare

Compare is enabled only when the authoritative lineage reader confirms a relationship. Temporal proximity, similar prompts or visual similarity never create lineage.

### F. Review and approval

```text
candidate → in-review → changes-requested → candidate → approved
```

Feedback may create a new child session with parent, comment and media context preloaded. A comment never executes spend directly. Approval is a human decision and remains distinct from selection.

### G. Element and reuse

```text
eligible asset → create Element → name/type/scope → confirm rights → reusable reference
```

Elements are named reusable assets, not automatic aliases for every generation. The server revalidates ownership, rights, compatibility and lineage each time they are used.

## State inventory

| Plane | Required states |
|---|---|
| Context | loading, ready, empty, denied, unavailable, switched |
| Session | empty, dirty, estimating, estimate-stale, ready, blocked, preparing, running, completed, failed |
| Asset | candidate, preview-pending, ready, degraded, trashed, superseded |
| Review | not-submitted, in-review, changes-requested, approved, rejected |
| Element | eligible, creating, active, superseded, rights-blocked |

Every state has an explicit reason and recovery. Partial data must be labelled partial; it must not look authoritative.

## Focus, keyboard and mobile

- Entry from a card restores focus to that card or a documented heading fallback.
- Async completion announces a polite actionable result and never steals focus.
- Dialogs/sheets trap focus, inert the background and restore the trigger.
- Dirty sessions require an explicit stay/save/discard decision.
- At `390px`, project and collection navigation become sheets/rails, the Composer keeps estimate and primary action reachable, and the Asset Workspace becomes media-first with an action dock.
- Document, stage, inspector and overlays must satisfy `scrollWidth === clientWidth`.

## Failure paths

| Failure | Result |
|---|---|
| Invalid deep link | specific not-found/access-denied state with safe return path |
| Stale estimate | block execution and request recalculation |
| Provider failure | preserve session and offer safe retry/edit/route choice |
| Partial derivative | allow available preview and label pending derivative |
| Partial bulk result | retain failed selection and report item-level results |
| Review request changes | open child session with parent context preserved |
| Workspace switch | dirty guard, clear scoped cache/selection, load destination |

## Ownership boundary

`TASK-1523` owns the cross-surface Creative Loop language, information architecture and shared interaction rules. `TASK-1526`/`TASK-1559` own feed/viewer transport and reconciliation. `TASK-1520` owns durable library/collections/bulk. `TASK-1580` owns the missing project/session/element contract. `TASK-1581` owns the Entry Hub and session-oriented feed consumer. `TASK-1582` owns the Asset Workspace context/reuse consumer. `TASK-1583` owns the review-to-reuse/Element consumer. Existing media tasks keep their modality-specific stage ownership.

## GVC scenario plan

- `globe-epic-028-creative-studio-master-flow`
- `1440×1000`, `390×844`
- entry → project → collection → session → estimate → run → asset workspace → lineage → review → Element
- negative fixtures: denied context, stale estimate, partial derivative, partial bulk, failed review and reduced motion
- assertions: focus restoration, no fabricated progress, no cross-workspace flash, no horizontal overflow and server-backed state labels

## Design decision log

- Projects provide production context; collections provide editorial grouping; sessions preserve exploration; Elements provide reuse.
- The feed becomes session-aware without becoming a second source of truth.
- The Asset Workspace is the primary continuity surface; the Composer and feed remain entry/overview planes.
- Boards are deferred until project/session/asset/review continuity is operational.
- No public community feed is part of the Producer core.
