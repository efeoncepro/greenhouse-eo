# TASK-1434 — Link Hub Public Renderer Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1434 — Link Hub public renderer`
- Motion scope: interaction feedback only

## Contract

- Entry has no cinematic reveal or scroll choreography; first paint and tap readiness take priority in social in-app browsers.
- Hover, focus, pressed and pending feedback use canonical motion tokens and never alter layout or delay navigation.
- Embedded Growth Form transitions reuse its canonical contract; the Link Hub renderer adds no parallel animation state.
- `prefers-reduced-motion: reduce` removes non-essential interpolation while preserving focus, pending and success/error states.
- No animated background, parallax, auto-playing media or infinite loop is permitted in V1.

## Verification

- GVC captures normal and reduced-motion states at 390 and 1440.
- Tap latency and destination navigation remain correct when event ingest fails.
- Keyboard focus is continuously visible and no motion causes horizontal page overflow.
