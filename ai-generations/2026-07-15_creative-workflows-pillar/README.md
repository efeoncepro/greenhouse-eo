# Creative Workflows Pillar — GPT Image generation run

## Objective

Produce the four-asset editorial visual system defined in:

```text
docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md
```

The images support the article argument. They are not client work, product UI, scientific evidence or real
campaign case studies.

## Engine

- Path: built-in `image_gen` tool.
- Requested model family: GPT Image 2.
- Mode: new raster generation, no reference images.
- Output: generated master first, then project-local copies and web derivatives.

## Selected assets

| ID | Asset | Editorial job | Status |
|---|---|---|---|
| `CW-V01` | Hero / abundance and decision | Establish the problem | `selected-uploaded` (WebP `251365`; featured/social JPEG `251370`) |
| `CW-V02` | Creative craft / hidden recipe | Explain the interface boundary | `selected-uploaded-integrated` (`mediaId=251366`) |
| `CW-V03` | Two speeds | Explain divergence → decision → convergence | `selected-uploaded-integrated` (`mediaId=251367`) |
| `CW-V04` | Six moments | Explain continuity and learning | `selected-uploaded-integrated` (`mediaId=251368`) |

## Source of prompts

Prompts are versioned verbatim in the visual-system document. The final manifest records generated source
paths, selected outputs, dimensions, hashes, review verdicts and derivative locations.

## Production outcome

- Four first-pass candidates were generated and all four passed concept, composition, continuity, integrity
  and editorial-use inspection. This is historical evidence from this run, not a reusable quality or yield
  benchmark for future generations.
- Masters live under `masters/`; five optimized WebP derivatives and one JPEG social derivative live under
  `exports/`.
- The four editorial WebP derivatives and the hero JPEG derivative were uploaded to the WordPress Media
  Library under author `1` with stable slugs, ALT, caption and description.
- `CW-V02`, `CW-V03` and `CW-V04` are integrated in the published
  `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json`; V3 remains the private visual snapshot.
- `CW-V01` uses JPEG attachment `251370` as the WordPress featured/Open Graph image; WebP `251365` remains the
  optimized source/fallback. The hero is not duplicated in the article body.
- The historical V3 Content Factory dry-run passed with 101 blocks, `core/image` support and zero findings.
- WordPress post `251363` now contains V4, category `Creative`, featured media `251370`, Yoast SEO/E-E-A-T
  metadata and verified Open Graph. It is published at
  `https://efeoncepro.com/creative/creative-workflows/` with `index, follow`, canonical exact and anonymous
  `HTTP 200`.
- The live desktop evidence is preserved in `review/live-desktop-1440x1000.png`; mobile QA was also completed
  at `390x844` and recorded in the V4 audit and retrospective.

Full asset metadata and checksums live in `manifest.json`; the human-readable verdict lives in
`docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md`. The private WordPress/SEO snapshot lives in
`docs/public-site/CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md`; the published state and E-E-A-T
readback live in `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`.

## Guardrails

- No logos or client marks.
- No readable in-image text.
- No claims that the images represent real clients or measured outcomes.
- Generated binaries remain local/runtime artifacts under the `ai-generations` policy.
- Approved public assets are uploaded to WordPress/CDN; they are not committed as heavy source binaries.
