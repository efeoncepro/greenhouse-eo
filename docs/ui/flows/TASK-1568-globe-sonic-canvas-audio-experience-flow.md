# TASK-1568 — Sonic Canvas interaction flow

## Primary flow

1. User lands on `/producer`; no audio starts automatically.
2. User activates play on the featured audio or a compact audio card.
3. `AudioPlaybackProvider` makes that item the sole active track and exposes state to the card, stage and `AudioDock`.
4. User can pause, seek through the waveform, adjust volume, or select another audio.
5. Selecting another track transfers ownership without overlapping playback; the prior item becomes paused.
6. Leaving the local feed keeps the active track available through `AudioDock` while the user remains in the Producer experience.

## Exceptional branches

- Derivative missing: retain playback if media is valid; show a restrained degraded waveform state and do not claim measured peaks.
- Media unavailable or unauthorized: disable play, explain the state, and preserve the rest of the feed.
- Loading: show a local pending state and keep the previous active item stable until the new item is ready.
- Playback error: stop safely, expose retry, and preserve focus.
- Keyboard: Space/Enter toggles, arrows seek, Escape closes expanded controls without losing playback.
- Reduced motion: remove animated waveform/ambient effects; preserve playhead and status updates.

## Ownership rules

- One active audio element per Producer client session.
- Audio card, Sonic Stage and AudioDock are views of the same playback context.
- No autoplay, hidden competing audio elements, or stateful click-handler playback logic in individual cards.
