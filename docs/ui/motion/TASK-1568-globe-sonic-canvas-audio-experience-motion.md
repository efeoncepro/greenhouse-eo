# TASK-1568 — Sonic Canvas motion contract

## Motion principles

- Motion communicates playback, ownership and transitions; it is not ambient decoration.
- Motion is localized to the active stage, playhead, dock and selection transition.
- Use existing Globe/Greenhouse motion tokens and CSS/compositor-safe transforms where possible.

## Sequences

- Enter: stage and active metadata settle in with a short opacity/translate transition; content remains readable throughout.
- Playing: waveform/playhead advances from actual audio time; no synthetic animation may imply progress.
- Selection: active card and dock update as one ownership transition; previous card loses emphasis without layout jump.
- Loading/error: use a restrained progress or status treatment; no bounce/shake.
- Dock: appears when playback begins and remains stable while switching tracks.

## Reduced motion

- Freeze decorative waveform motion and ambient transitions.
- Keep the playhead, elapsed time, selected state and status text updating without animation.
- Preserve focus and final layout; no information may depend on motion.

## Verification

- Capture playing, switching, loading, error and reduced-motion states at desktop and 390px.
- Confirm no transition lowers live status text below AA and no animation changes page width.
