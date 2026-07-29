# TASK-1570 — Cinematic Canvas motion contract

## Motion principles

- Motion communicates ownership, playback and transition; it is not decorative ambience.
- Poster, stage, controls and dock maintain a stable spatial relationship.
- Use existing Globe/Greenhouse motion tokens and compositor-safe properties.

## Sequences

- Poster → playback: preserve frame/scale, reveal real video and controls without layout jump.
- Card → viewer: selected card becomes the visual source for the stage; inspector enters without stealing focus.
- Playing: timeline follows actual media time; no synthetic progress or ornamental visualizer.
- Buffering: localized indicator over the stage; preserve poster/video frame and metadata.
- Dock: appears after explicit playback and remains stable while navigating within Producer.
- Ended: retain final frame, expose replay and do not auto-advance.

## Reduced motion

- Disable hover previews, poster morphs and ambient transitions.
- Preserve poster, final frame, progress, status and focus synchronously.
- No information or control availability depends on animation.

## Verification

- Capture poster → playing, buffering, ended, error and reduced-motion states at desktop and 390px.
- Confirm no transition changes page width or drops live status text below AA.
