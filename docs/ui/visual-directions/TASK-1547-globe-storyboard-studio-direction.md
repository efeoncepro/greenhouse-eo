# TASK-1547 — Globe Storyboard Studio Visual Direction

## Source and rigor

- Direction mode: `repo-native-benchmark`
- Rigor: `ui-platform`
- Product thesis: **Editorial Sequence Desk**
- Runtime: Globe-owned UI; Greenhouse design code is not imported.
- Architecture: ADR-012 / SPEC-012.

## Alternatives

| Direction | First fold | Strength | Risk | Decision |
| --- | --- | --- | --- | --- |
| Infinite Story Wall | free spatial board, floating tools | ideation freedom | weak sequence/export/mobile semantics | rejected |
| Screenplay First | document with inline thumbnails | excellent writing focus | visual continuity becomes secondary | rejected |
| Editorial Sequence Desk | ordered scene canvas, outline rail, inspector | script-to-shot clarity and review precision | requires careful density/virtualization | selected |

## Selected thesis

The sequence is the hero. The first fold reads: project/revision status → scene/shot sequence → selected panel →
contextual inspector/action. It should feel like a director's desk, not a dashboard of cards and not a generic
whiteboard.

## Decision

Select **Editorial Sequence Desk** as the only implementation direction for V1. It best preserves finite narrative
order, exact revision/review semantics, keyboard accessibility, deterministic export and a meaningful 390px
recomposition. Infinite Story Wall and Screenplay First remain rejected unless future evidence changes the product
envelope and triggers a new design decision.

## Desktop target

- Stable Globe shell and project/revision header.
- Left outline rail for scenes, duration and review state.
- Center stage with horizontal shot sequence grouped by scene; panels retain ordered semantics.
- Right inspector for shot intent, script excerpt, realization plan, comments and versions.
- Floating/contextual action dock appears only for selection, markup or proposal work.
- Review mode overlays exact pins/strokes without changing the underlying panel.

## Mobile target

- Project/revision header remains compact and authoritative.
- Scene navigator becomes a vertical selector.
- Selected scene exposes a swipeable/scrollable filmstrip; one panel remains primary.
- Inspector, comments, markup tools and handoffs open as full-height sheets with focus restoration.
- No compressed three-column desktop and no page-level horizontal overflow.

## Visual system mapping

- Extend Globe's existing Editorial Creative Desk shell, stage/viewer, inspector and floating surface grammar.
- Use existing Globe typography/color/radius/motion tokens; exact token names are confirmed in runtime Discovery.
- Use DOM/SVG for panels, vector annotations and focusable controls; virtualization is an implementation tactic.
- Depth distinguishes stable sequence, transient selection and focused review—not decorative card stacking.
- Status uses text/icon/shape, never color alone.

## Token mapping

- Typography: Globe display/product roles for project/revision hierarchy; editorial body roles for script and
  shot intent; no imported fonts.
- Color: existing Globe semantic canvas, stage, selected, review, warning, denied and approved roles; no literal
  HEX values in the implementation contract.
- Spacing/radius: existing shell, inspector, sheet and control tokens; scene bands use spacing to group sequence
  rather than nested borders/cards.
- Elevation: existing stable/floating/overlay roles; only the context dock and focus-managed sheets float.
- Motion: existing semantic duration/easing tokens and wrappers; reduced motion reaches the same terminal state.
- Exact runtime token identifiers are mapped during primitive lookup; missing names cause an extend decision, not
  ad-hoc values.

## Signature details

- Scene bands act as editorial chapters rather than containers of cards.
- A shot spine connects number, duration, panel and realization state.
- Script excerpt and panel selection share a visible revision link.
- Markup mode uses a restrained review tint and anchored comment pins.
- Mixed-origin realization appears as an ordered contribution strip, not a human-versus-AI toggle.
- Proposal diffs show before/after structure and exact base revision.

## Anti-patterns

- card dashboard, kanban board or node graph;
- pulsing AI orb, ambient animation or fake generation progress;
- irreversible direct edits from review comments;
- mixing visual markup and inpainting execution;
- exposing provider/model slug, bucket URL or storage identity;
- tiny desktop inspector squeezed into mobile;
- novelty canvas controls that are not keyboard/focus addressable.

## Primitive decision

- `reuse`: Globe shell, stage/viewer, tabs, sheets/dialogs, status, comment/review patterns.
- `extend`: sequence rail, revision badge, selection inspector and floating action dock variants.
- `new composition`: `StoryboardSequenceCanvas`, assembled from existing foundations.
- `new primitive` only if runtime lookup proves annotation overlay or ordered shot spine cannot be expressed by
  existing patterns. Any platform-level primitive requires its own registry/Lab documentation.

## State palette

Cover: loading, empty project, empty scene, draft, selected, markup active, mask active, proposal pending,
conflict, degraded asset, permission denied, client-review, approved, out-of-sync Script revision, offline/retry,
mobile sheet and reduced motion.

## GVC target

- Scenarios: authoring, Script/Board split, internal review/markup, masked edit handoff, agent proposal,
  Producer return, Video Effectiveness findings, conflict/degraded/denied and client approval.
- Viewports: `1440×1000` and `390×844`.
- Quality profile: `premium`.
- Baseline candidate: `globe.storyboard.editorial-sequence-desk` after human first-fold acceptance.
- Acceptance follows the Greenhouse AI Design Studio premium scorecard; design artifacts alone do not satisfy GVC.
