# EPIC-028 — Globe Creative Studio Master UI Motion

## Meta

- Epic: `EPIC-028`
- Status: `draft`
- Motion type: `cross-surface transition system`
- Canonical owner: `TASK-1523`
- Consumers: `TASK-1526`, `TASK-1552`, `TASK-1559`, `TASK-1581`, `TASK-1582`, `TASK-1583`, `TASK-1568`, `TASK-1570`, `TASK-1571`
- SSOT: `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`

## Motion thesis

The signature of Globe is not glow, confetti or an animated gallery. It is the feeling that the system understood where the operator was, what changed, which asset arrived and what decision is next.

```text
intention → session → candidate → selection → refinement → approval → memory
```

Motion explains causality, preserves spatial continuity and stays subordinate to the media.

## Principles

1. **Causal:** every transition follows a visible action or server-confirmed state.
2. **Continuous:** Composer, session feed, viewer and workspace feel like regions of one desk.
3. **Localized:** live updates animate only the delta, never the entire feed.
4. **Honest:** motion never invents progress, provenance, approval or readiness.
5. **Quiet under risk:** errors, budget blocks, revoke, cancel and destructive confirmation are immediate and stable.
6. **Accessible:** reduced motion preserves order, focus, labels and final meaning.

## Signature moments

| Moment | Motion | Reduced-motion equivalent |
|---|---|---|
| Session arrival | bounded entry of the new session block and state mark | stable inserted block + persistent label |
| Candidate birth | preview resolves before secondary metadata; short bounded reveal | direct ready state |
| Branch reveal | brief parent→child lineage cue and version update | explicit parent/child labels |
| Asset Workspace open | media expands into focused stage; inspector enters contextually | direct open with focus transfer |
| Compare | state change inside the same stage | immediate compare state |
| Collection placement | contextual confirmation and badge/count update; asset stays in place | direct confirmation |
| Review approval | stable state replacement and evidence update | direct state replacement |
| Error/partial | static status and recovery affordance | same static state |

## Cross-surface transitions

```text
Composer → Session Feed: preserve composer context; insert session without scroll theft
Feed → Asset Workspace: expand the originating asset; restore exact scroll/focus on close
Asset → Lineage: reveal context, not a new unrelated page
Asset → Review: retain media and inspector context
Review → Child Session: carry parent, comment and reference context
Asset → Element: confirm membership/reuse without removing the source asset
```

Navigation changes context. Microinteractions change state. They must not be confused.

## Streaming/live behavior

- New sessions use a localized arrival pattern.
- Existing cards never reanimate on every poll.
- Newly ready candidates never steal focus.
- Running uses real phases; numeric progress appears only when the backend supplies a real metric.
- Partial results become usable immediately and remain labelled partial.
- Failed runs use stable copy and recovery, never shake or ambient red motion.

## Surface ownership

`TASK-1523` governs semantic states, tokens, reduced-motion, focus rules, causal grammar and cross-surface GVC. Consumers own their media-specific behavior: audio playback/waveform in `TASK-1568`, video timeline/poster in `TASK-1570`, image zoom/compare in `TASK-1571`, and session/feed realization in `TASK-1526`/`TASK-1559`/`TASK-1581`. No consumer creates a parallel motion engine or timing scale.

## Token and primitive rules

Final values come from the Globe motion registry governed by `TASK-1485` and the client motion SSOT. Use semantic duration/easing names and canonical wrappers. Do not introduce component-local durations, `transition: all`, direct GSAP imports, full-list staggers or ambient loops in operational surfaces.

Preferred primitives include: `SessionArrival`, `GenerationStateMark`, `CandidateBirth`, `LineageReveal`, `ContextualPanelEnter`, `ViewerExpansion`, `CompareTransition`, `ReviewStateTransition`, `FocusRestoreBoundary` and `LiveRegionAnnouncer`.

## Reduced motion contract

| Normal motion | Reduced motion |
|---|---|
| viewer expansion | direct open |
| candidate stagger | stable batch |
| arrival halo | persistent state mark |
| skeleton shimmer | static skeleton |
| composer morph | direct state change |
| ambient aurora/sparks | removed |
| spinner loop | phase text + static indicator |

The identity mark remains visible but stops animating; structural transitions become direct; ambient decoration is removed. No meaning may depend on movement.

## GVC motion evidence

Capture desktop and `390px` for: first fold, session arrival, candidate birth, viewer open/close, compare, collection placement, review, partial failure, keyboard flow and reduced motion. Record before/changed/settled frames, active element, live-region message, final state and `scrollWidth === clientWidth` for document, stage, inspector and overlays.

Acceptance target: average ≥4.5, no dimension <4, with state clarity, control, continuity, accessibility and reduced-motion equivalence ≥4.5.

## Design decision log

- Motion is editorial-operational, not cinematic decoration.
- The Asset Workspace is the main spatial continuity moment.
- Live updates animate only confirmed deltas.
- Reduced motion removes movement but keeps every decision and recovery path.
- Boards and future narrative canvases may introduce richer motion only through their own consumer contracts.
