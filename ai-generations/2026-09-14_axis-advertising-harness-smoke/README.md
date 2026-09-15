# AXIS advertising harness smoke

This technical run proves the boundary requested for future seasonal work without producing a seasonal creative:

```text
built-in image_gen clean plate
  → declared finish checkpoint
  → supportingTagline from AXIS 0.2.5
  → semantic collaboration-selection intent
  → canonical Artifact Composer URL Bubble
  → Sharp/fontkit editable SVG + PNG master
  → deterministic QA
  → human_release pending
```

The bitmap plate and generated outputs are local workspace artifacts ignored by Git. The prompt, contract, intent,
manifests and QA remain reproducible evidence. Run:

```bash
pnpm creative:collaboration:resolve -- \
  --input ai-generations/2026-09-14_axis-advertising-harness-smoke/brief/collaboration-selection-intent.json \
  --out ai-generations/2026-09-14_axis-advertising-harness-smoke/manifests/collaboration-selection.json
pnpm creative:layout -- \
  --contract ai-generations/2026-09-14_axis-advertising-harness-smoke/brief/layout-contract.yaml \
  --mode compile
pnpm creative:layout -- \
  --contract ai-generations/2026-09-14_axis-advertising-harness-smoke/brief/layout-contract.yaml \
  --mode check
```

Passing the harness demonstrates tool interoperability and deterministic rendering. It does not approve the
background, copy, art direction, publication or media activation for any campaign.

## Result 2026-09-14

- `plan`: `ready_to_compile`, with zero missing inputs;
- `compile`: `masters_compiled_human_release_pending`;
- `check`: `pass: true`;
- supporting tagline: one continuous line, `26.25 px`, rendered width equal to the `696.684 px` headline measure;
- collaboration: text target plus acting local, department and person cursors, all inside canvas and without free
  cursor coordinates;
- signature: the exact canonical `url-lum.svg` is embedded as vector geometry at `opacity: 0.72` with luminosity
  blending; QA verifies its source hash, vector marker and visible raster delta;
- measured contrast: foreground `14.13:1`, growth accent `7.74:1`;
- visual inspection: copy spacing continuous; the local cursor touches the bottom-center handle, Creative Ops
  touches the top-end handle and Camila touches the bottom-end handle while each multiplayer nameplate remains
  close to its pointer.
