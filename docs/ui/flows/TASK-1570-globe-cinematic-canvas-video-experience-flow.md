# TASK-1570 — Cinematic Canvas interaction flow

## Feed to viewer

1. User lands on `/producer`; videos show governed posters and no video starts automatically.
2. User activates play on the hero/card or opens the viewer explicitly.
3. The shared media context makes the video the only active media and transitions poster to real preview playback.
4. User pauses, seeks, mutes, changes volume or opens fullscreen.
5. User opens the viewer; the same track and time continue in the Cinematic Stage.
6. User closes the viewer; video pauses unless the user explicitly continues through the contextual MediaDock.

## Exceptional branches

- Poster ready / preview pending: show poster and honest processing state; do not expose a dead play affordance.
- Preview unavailable: preserve poster and expose a legible unavailable state.
- Buffering: keep stage stable, show localized buffering and preserve current time.
- Forbidden/not found: stop playback, explain access state and keep the feed usable.
- No audio track: hide volume affordance or label the video as silent; do not show a broken control.
- Reduced motion: remove poster-to-stage animation and preview hover behavior while preserving state and controls.
- Keyboard: Space/Enter play, arrows seek, M mute, F fullscreen where supported, Escape closes expanded UI.

## Ownership rules

- One active media item per Producer session; starting video pauses audio and vice versa.
- Feed cards, hero, stage and dock are views of one playback context.
- No card owns a hidden competing `<video>` element or a private retrieval flow.
