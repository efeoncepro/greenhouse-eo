# TASK-1547 — Globe Storyboard Studio Wireframe

## Meta

- Status: `ready for task registration`
- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md`
- Direction: `docs/ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md`
- Flow: `docs/ui/flows/TASK-1547-globe-storyboard-studio-flow.md`
- Motion: `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`
- Rigor: `ui-platform`

## Experience brief

An authorized author or reviewer can understand the narrative, select an exact scene/shot/panel, write or review
its intent, annotate visually, request a structured proposal and hand exact work to another Globe domain without
losing revision or rights context.

## Desktop first fold

```text
┌ Globe shell ─ Storyboard Studio / Project / Revision r12 [Draft] ─ Share ─ Review ┐
├ Brief | Outline | Guion | Storyboard | Review                                   ┤
├───────────────┬───────────────────────────────────────────────┬──────────────────┤
│ OUTLINE       │ SCENE 03 · The reveal · 00:18                │ INSPECTOR        │
│ 01 Hook  ✓    │                                               │ Shot 03.2        │
│ 02 Problem !  │  [03.1]────[03.2 SELECTED]────[03.3]         │ Intent           │
│ 03 Reveal 2   │   panel      panel + pins       panel          │ Script excerpt   │
│ 04 CTA        │                                               │ Realization      │
│               │  shot spine · durations · states              │ Comments (2)     │
│ Revision map  │                                               │ Versions         │
├───────────────┴───────────────────────────────────────────────┴──────────────────┤
│ Context dock: Add shot · Draw · Comment · Mask edit · Ask agent · Send handoff │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Reading order is header/revision, perspective, outline, selected sequence, inspector and contextual action.
Inspector and dock are selection-dependent; the sequence remains stable while they change.

## Desktop Target

At `1440×1000`, the first fold must show the authoritative project/revision header, perspective switcher, at least
three scene entries, one complete selected shot/panel, its inspector and the contextual dock without page scroll
or card-wallpaper. Sequence is the dominant visual region; the inspector never competes with it.

## Guion / Storyboard split

```text
┌ Script revision r8 ───────────────┬ Storyboard revision r12 → Script r8 ────────┐
│ Scene 03                          │ Scene 03 · shots 03.1–03.3                  │
│ Action / Dialogue / VO / Text     │ selected shot and panels                    │
│ [Propose change to storyboard]    │ [Propose change to script]                  │
└───────────────────────────────────┴──────────────────────────────────────────────┘
```

An out-of-sync banner appears when the Script head is newer than the linked revision. Reconciliation is explicit.

## Review and visual markup

```text
┌ Selected panel, immutable revision r12 ─────────────────────────────────────────┐
│                        ⭕ vector highlight                                       │
│          arrow ─────────────────────────▶ [product position]                    │
│                          ③ anchored pin                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tools: Select · Pin · Pen · Arrow · Shape · Undo local · Add comment · Finish   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Markup stores vectors and normalized coordinates. `Finish` persists the annotation/comment against revision r12.
It never changes the panel image.

## Masked edit intent

Mask mode is visually and semantically separate:

1. Draw mask on exact panel/asset revision.
2. Enter instruction, invariants and optional references.
3. Preview `Enviar borrador a Producer`; display that no media has been changed and no credits spent.
4. Producer estimate/draft opens under its normal authority.
5. Candidate returns; `Incorporar en nueva revisión` requires a human confirmation.

## Agent proposal

The proposal sheet contains base revision, requested outcome, structured changes, affected scenes/shots, references,
limitations and estimate if it invokes a downstream draft. Primary action is `Aplicar como nueva revisión`;
secondary actions are edit proposal and reject. There is no `run automatically`.

## Mobile composition

```text
┌ Storyboard Studio · r12 [Draft] ┐
│ Scene 03 / 04         Review 2  │
├─────────────────────────────────┤
│       selected panel stage      │
│          pins / markup          │
├─────────────────────────────────┤
│ 03.1 │ 03.2 selected │ 03.3     │  ← local filmstrip, not page overflow
├─────────────────────────────────┤
│ Intent · Script · Realization   │
│ Comment · Draw · More           │
└─────────────────────────────────┘
```

Outline, inspector, comments, tool palette, proposal and handoff use full-height sheets. Back/Escape closes the
topmost sheet before navigating away and restores its trigger.

## Mobile Target

At `390×844`, one selected panel is primary, the filmstrip scrolls locally and scene/inspector/tool surfaces become
focus-managed sheets. Revision, review count and primary lifecycle action remain visible. Desktop columns are not
scaled down and document `scrollWidth` cannot exceed `clientWidth`.

## Action Hierarchy

- Primary per lifecycle: continue authoring, submit review, resolve changes or approve exact revision.
- Contextual: add/reorder scene/shot/panel, comment, annotate, propose, handoff.
- Destructive: archive/remove with confirmation and revision/history preservation.
- Disabled actions explain access, stale revision, ineligible asset or missing required context.

## Visual Fidelity Mapping

- Editorial depth maps to Globe shell/stage/inspector/floating surface roles rather than new shadows or card tiers.
- Scene bands, shot spine and contribution strip use existing semantic typography/color/spacing tokens.
- Review tint, pins, strokes and mask overlay are state roles, not literal external HEX values.
- Exact token/variant names are resolved from Globe runtime; visual meaning and hierarchy remain fixed.

## Copy Ledger

| Element | Visible copy | Ownership |
| --- | --- | --- |
| lifecycle primary | `Enviar a revisión`, `Solicitar cambios`, `Aprobar revisión` | Globe canonical Storyboard copy |
| markup | `Dibujar`, `Agregar comentario`, `Finalizar anotación` | Globe canonical Storyboard copy |
| masked edit | `Enviar borrador a Producer` + `Aún no se modificó ningún asset` | shared Storyboard/Producer copy |
| proposal | `Aplicar como nueva revisión`, `Editar propuesta`, `Rechazar` | Storyboard proposal copy |
| conflict | `Hay una revisión más reciente` + compare/reapply actions | shared conflict copy |

## State Copy

| State | Visible copy | Recovery |
| --- | --- | --- |
| ready | `Revisión r12 lista para editar` | continue authoring or submit review |
| loading | `Cargando la secuencia…` | retain stable shell; retry reader if it fails |
| empty | `Empieza con la primera escena` | add scene or import authorized source |
| partial | `Algunos assets aún están en revisión` | continue text work; replace or wait |
| error | `No pudimos cargar esta revisión` | retry or return to project history |
| denied | `No tienes acceso para realizar esta acción` | remain read-only or request scoped access |

## Accessibility Contract

- DOM reading order is header → perspectives → outline → sequence → inspector → actions.
- Ordered scene/shot semantics and text alternatives survive virtualization and visual repositioning.
- Drawing has a keyboard/text comment alternative; target, revision and state are never color-only.
- Sheets/dialogs trap/restore focus; live regions distinguish routine save from terminal error.
- Reduced motion preserves the same revision, selection, status and focus outcome.

## Accessibility and copy

- Semantic outline and ordered lists remain available independent of visual positioning.
- Every panel has shot number, purpose, duration, alt/description state and review label.
- Annotation tools have keyboard-operable alternatives; comments can target a panel without drawing.
- Color is never the sole state indicator.
- Live regions announce durable save, conflict, proposal and handoff outcomes.
- Visible reusable copy lives in Globe's canonical copy/nomenclature source confirmed during implementation.

## Implementation Mapping

- Route hypothesis: `/storyboards/:id` `[verificar]`.
- Composition: `StoryboardSequenceCanvas` new domain composition.
- Reuse/extend: Globe shell, stage/viewer, inspector, tabs, sheet/dialog, review/comment and status patterns.
- Data: TASK-1543–1546 governed readers/commands; no browser-local authoritative board.
- Access: project read/author/review/approve/propose/annotate/handoff capabilities.
- Rendering: structured DOM/SVG + virtualization; no Canvas/WebGL dependency in V1.

## GVC Scenario Plan

- Quality profile: `premium`
- Scenario file: `../efeonce-globe/apps/studio-web/src/gvc/storyboard-studio.scenario.ts` `[verificar]`.
- Viewports: `1440×1000`, `390×844`; quality profile `premium`.
- Captures: authoring first fold, split Guion/Board, markup, mask handoff, proposal diff, conflict, denied, degraded,
  client review, approved and reduced-motion equivalents.
- Markers: shell, revision, outline, sequence, selected panel, inspector, dock/sheet, live status.
- Assertions: exact revision visible; action hierarchy unambiguous; no hidden spend; focus restore; keyboard path;
  `scrollWidth === clientWidth` at page level.
- Review dossier: `docs/ui/captures/TASK-1547-globe-storyboard-studio/<run>/review/`.
- Baseline decision: promote `globe.storyboard.editorial-sequence-desk` only after `ACCEPT FIRST FOLD`.
- Scorecard: `docs/ui/reviews/TASK-1547-globe-storyboard-studio.scorecard.json`.

## Design Decision Log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| structured sequence | infinite whiteboard, document-only | preserves narrative order, review and export |
| sibling Script/Board | textarea in board, separate products | independent revisions with explicit reconciliation |
| vector annotation | raster mutation | exact, reversible and accessible review evidence |
| mask-to-Producer | direct inpainting | one estimate/credit/provider/governance boundary |
| mobile recomposition | compressed desktop | preserves intent and focus at 390px |
