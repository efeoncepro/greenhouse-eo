# TASK-1547 — Globe Storyboard Studio Flow

## Meta

- Status: `ready for task registration`
- Owner task: TASK-1547
- Architecture: ADR-012 / SPEC-012
- Wireframe: `docs/ui/wireframes/TASK-1547-globe-storyboard-studio.md`
- Motion: `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`
- Flow type: multi-perspective, collaborative, async-durable and cross-capability

## Primary flow

```text
create/open Narrative Project
        │
brief → outline → Script revision
        │ explicit reconcile/reference
        ▼
Storyboard revision → scenes → shots → panels → realization plans
        │
internal review → client review → changes requested ─┐
        │                                             │
        └──────────────── new revision ◀───────────────┘
        │
approved exact revision
        ├─ Producer handoff/draft/estimate → human execute → candidate → human incorporate
        ├─ Video Effectiveness handoff → findings/proposals → human apply
        └─ deterministic export/handoff package
```

## Perspective transitions

- Brief, Outline, Guion, Storyboard and Review read one Narrative Project but preserve their aggregate/revision
  identities.
- Changing perspective preserves current scene/shot selection when valid.
- A newer Script head never updates Storyboard silently; the user sees compare/reconcile choices.
- Back closes transient inspector/sheet/markup state before leaving the project.
- Reload rehydrates server truth and drops stale local preview URLs or unsaved masks after recovery warning.
- Workspace change clears project, mention, asset, proposal and presence caches before destination load.

## Collaboration flow

1. Reviewer opens an exact revision with a scoped capability.
2. Selects scene/shot/panel/asset/frame/time target.
3. Adds text, typed mentions and optional vector markup.
4. Server reauthorizes all mention targets and persists comment + annotation atomically/idempotently.
5. Mention delivery occurs only for authorized recipients and carries a safe deep link.
6. Author resolves/replies or creates a proposal/new revision.
7. Formal approval binds the exact revision; unresolved comments can warn or block according to policy.

Read-only shares never enter step 3. Client-visible and internal threads cannot leak across visibility.

## Agent iteration flow

1. Human selects scope and asks for a named outcome.
2. Runtime records base revision and creates a bounded proposal run.
3. Agent reads only authorized context and returns a structured diff.
4. Deterministic validators reject stale, malformed, forbidden or cross-scope operations.
5. Human reviews before/after and may edit, reject or apply.
6. Apply creates one new revision keyed by proposal + base revision; repeat returns the existing result.

## Producer handoff flow

```text
shot/panel selection
  → handoff intent (references/mask/invariants)
  → Producer draft + read-only estimate
  → human approve/execute in Producer
  → governed candidate assetRef
  → return to same project/shot
  → human incorporate as new Storyboard revision or reject
```

Unknown outcome after timeout always reconciles by handoff/Producer status. The agent can create the draft and
estimate but cannot cross Producer's approval/reservation/execute gate.

## Video Effectiveness flow

Animatic/video plus exact revision and shot/time map creates or reuses an analysis run. Findings return anchored
to time/shot and can become comments or proposals. Re-analysis after a new revision is explicit; no automatic
Storyboard→analysis→Storyboard loop.

## Conflict and recovery

| Condition | UI response | Recovery |
| --- | --- | --- |
| expected revision stale | conflict sheet with local intent preserved | compare/reapply as proposal |
| annotation target orphaned | show original revision and orphan label | retarget in a new revision |
| mention target denied | safe invalid-target message | remove/request access |
| asset governance pending | honest eligibility state | wait/replace |
| agent/provider unavailable | deterministic author/review stays usable | retry proposal later |
| handoff timeout | unknown state | reconcile status, never blind retry |
| approval permission revoked | revision remains readable | authorized reviewer acts |
| client invite expired | deny comment/write | renew scoped grant |

## Focus and mobile

- Initial focus: H1 for deep link, project name for fresh creation.
- Scene and shot lists expose roving keyboard navigation without trapping browser shortcuts.
- Opening inspector/tool/proposal/handoff sheet traps focus and restores the originating control.
- Markup has a non-pointer path through target selection + textual comment.
- Mobile back closes tool palette, comment, inspector and scene sheets in that order.
- Reduced motion reaches identical selected revision, shot, panel, sheet and focus state.

## GVC Scenario Plan

1. brief → Script → first Storyboard revision;
2. out-of-sync Script reconciliation;
3. internal visual markup with person/asset/project/workspace mentions;
4. client review, changes requested and exact approval;
5. masked edit → Producer draft/estimate → candidate return/incorporation;
6. agent proposal diff/apply/reject;
7. Video Effectiveness finding → Storyboard proposal;
8. conflict, denied, degraded and expired invite;
9. keyboard-only and reduced-motion desktop/mobile.

Each journey captures `1440×1000` and `390×844`, focus outcomes and page-level scroll-width equality.

## Design Decision Log

- One Narrative Project exposes perspectives without conflating Script and Storyboard revision authority.
- Client review uses scoped collaboration rather than public command-bearing share.
- Producer and Video Effectiveness are explicit round trips with human incorporation, never UI redirects that
  hide duplicate domain logic.
- Conflict recovery preserves local intent as a proposal rather than silently selecting a winner.
