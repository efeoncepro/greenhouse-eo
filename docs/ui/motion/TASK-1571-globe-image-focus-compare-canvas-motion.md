# TASK-1571 — Globe Image Focus + Compare Canvas motion

## Motion contract

- Primitive: existing Globe/Greenhouse CSS motion tokens and native dialog lifecycle.
- Enter: a short, localized card-to-stage continuity treatment may preserve the image frame; it must fall back to an immediate dialog open when unsupported.
- Exit: close the stage without moving the feed or animating unrelated cards; restore focus after the dialog closes.
- Zoom/pan: transform only the image layer, keep toolbar and inspector stable, and avoid layout reflow.
- Compare: crossfade or immediate swap within the stage; no large page morph and no synthetic “lineage” animation.
- Loading: use a restrained progress/availability state; never pulse the full image as if it were ready.
- Reduced motion: instant state changes, preserved focus, same controls and announcements.

## Performance and accessibility guardrails

- Do not preload original media for the feed.
- Use governed derivative representations and release object URLs on replacement/close.
- Do not implement a manual focus trap; use the existing native `<dialog>` behavior and restore focus explicitly.
- A view transition is an enhancement only, behind a reusable primitive and feature detection.
