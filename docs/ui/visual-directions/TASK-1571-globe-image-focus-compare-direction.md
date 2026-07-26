# TASK-1571 — Globe Image Focus + Compare Canvas visual direction

## Contract

- Mode: `repo-native-benchmark`.
- Source of truth: live `/producer` audit, current React Producer shell, existing `ProducerViewer`, `MediaStage`, governed media resolver and Greenhouse premium UI standard.
- Thesis: **Focused Artboard** — an image becomes a reviewable creative artifact without turning Globe into a gallery editor.
- Desktop target: preserve the current composer/feed split; make the existing viewer dialog feel intentional through a dominant image stage and a quiet inspector.
- Mobile target: preserve the long composer-first flow and compact feed; controls collapse into a short, thumb-reachable toolbar without horizontal overflow.

## Alternatives considered

1. **Focused Artboard — selected.** Extends the current dialog and stage, adds causal image review controls, and keeps context in the inspector.
2. **Compare Desk — rejected as default.** A two-up workspace would imply that every image has a comparable sibling, which is false for unlinked generations.
3. **Gallery Atlas — rejected.** A new masonry/gallery shell would duplicate the current feed and consume the mobile first fold without improving the review decision.

## Visual grammar

- Stage first: image owns the visual weight; controls are quiet and appear in a stable bottom rail.
- Inspector second: metadata, provenance and actions remain in the current complementary panel.
- Compare is a state, not a permanent layout: enter it only when a real lineage relation exists.
- Use existing spacing, surface, border, focus and motion tokens. No glass layer, gradient wallpaper, decorative particles or fake filmstrip.
- Typography: Poppins only for page-level display headings; Geist for metadata, controls, labels and captions. Sentence case; no all-caps control labels; tabular numerals for position and dimensions.

## Signature details

- Fit/actual-size state is always legible; zoom level is never communicated only through scale.
- Opening the canvas preserves the card’s image position and returns focus to the originating card on close.
- Compare uses a clear “Imagen A / Imagen B” relationship and keeps each image independently inspectable.
- Loading and unavailable derivatives retain the same stage frame and explain the state without exposing raw retrieval errors.

## Anti-patterns

- No auto-download of original assets for feed or viewer.
- No hover-only actions, autoplay, synthetic lineage, or custom focus trap.
- No new parallel media stage when the existing primitive can be extended.
- No mobile canvas that hides the close action or requires precision drag to exit.

## Approval signature

The implementation is visually acceptable only when the existing `/producer` shell remains recognizable, the stage gains a premium review moment, and the new controls do not add overflow at 390px.
