# Editorial recovery — Glitch tap tap + ON AIR

This is a deterministic edit of the already generated five-second Omni video. It does not request new pixels from a model.

## Motion construction

- 0.00–0.20: quiet hover.
- 0.20–0.85: first downward touch, ending before the blue signal animation.
- 0.85–1.30: natural lift.
- 1.30–1.88: second downward touch, ending on the source's blue response.
- 1.88–2.48: lift and release.
- 2.48–5.00: held release pose for the handoff to the Glitch intro.

The second touch is the one that activates the blue signal. The edit retimes contiguous source frames and their reverse only; it never invents a second hand, changes anatomy, or changes the camera.

## Exact typography repair

The model-adapted input had intentionally neutralised the sign to make image generation possible. The 4K supplied key visual is therefore used as the source of truth for the  `ON AIR` sign. Its sign panel is composited over the generated blur; no AI text generation is used.
