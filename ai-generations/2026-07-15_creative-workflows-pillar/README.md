# Creative Workflows Pillar — editorial visual production run

## Objective

Produce and extend the editorial visual system defined in:

```text
docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md
```

The images support the article argument. They are not client work, product UI, scientific evidence or real
campaign case studies.

## Engine

- `CW-V01–V04`: built-in `image_gen`, GPT Image 2, new raster generation without reference images.
- `CW-V05–V06`: deterministic HTML/CSS composition with local Poppins/Geist and Playwright raster capture.
- Output: inspected master first, then project-local WebP derivatives and WordPress Media Library attachments.

## Selected assets

| ID | Asset | Editorial job | Status |
|---|---|---|---|
| `CW-V01` | Hero / abundance and decision | Establish the problem | `selected-uploaded` (WebP `251365`; featured/social JPEG `251370`) |
| `CW-V02` | Creative craft / hidden recipe | Explain the interface boundary | `selected-uploaded-integrated` (`mediaId=251366`) |
| `CW-V03` | Two speeds | Explain divergence → decision → convergence | `selected-uploaded-integrated` (`mediaId=251367`) |
| `CW-V04` | Six moments | Explain continuity and learning | `selected-uploaded-integrated` (`mediaId=251368`) |
| `CW-V05` | Decision boundary | Explain what the system executes, what AI expands and what people decide | `selected-uploaded-integrated` (`mediaId=251393`, V3) |
| `CW-V06` | Autonomy ladder | Explain managed, co-operated and client-operated modes | `selected-uploaded-integrated` (`mediaId=251392`, V3) |

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
- Two deterministic explanatory diagrams were added in V5. Their text is typeset, not generated, and their
  lower-right safe area accounts for Ohio's floating Next Post widget. A human reread invalidated V2 after
  finding internal line/text crossings, a clipped evidence label and a punctuation collision; V3 corrected
  those defects and was inspected both at original resolution and in the live theme. The diagrams link to
  their full-size WebP on mobile.
- `CW-V02–V06` are integrated in the published
  `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json`; V3 remains the private visual snapshot
  and V4 the first public snapshot.
- `CW-V01` uses JPEG attachment `251370` as the WordPress featured/Open Graph image; WebP `251365` remains the
  optimized source/fallback. The hero is not duplicated in the article body.
- The historical V3 Content Factory dry-run passed with 101 blocks, `core/image` support and zero findings.
- WordPress post `251363` now contains V5, category `Creative`, featured media `251370`, Yoast SEO/E-E-A-T
  metadata and verified Open Graph. It is published at
  `https://efeoncepro.com/creative/creative-workflows/` with `index, follow`, canonical exact and anonymous
  `HTTP 200`.
- Final V3 desktop/mobile evidence and the machine-readable QA report live in `review/v5-diagrams-v3/`. QA covered five loaded
  body images, six visible captions, one native table, full-size diagram links, canonical/robots/OG and
  horizontal overflow at `1440x1000` and `390x844`.

Full asset metadata and checksums live in `manifest.json`; the human-readable verdict lives in
`docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md`. The private WordPress/SEO snapshot lives in
`docs/public-site/CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md`; the published state and E-E-A-T
readback live in `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`.

## Guardrails

- No logos or client marks.
- GPT Image rasters contain no readable text; explanatory diagrams use deterministic typography only.
- No claims that the images represent real clients or measured outcomes.
- Generated binaries remain local/runtime artifacts under the `ai-generations` policy.
- Approved public assets are uploaded to WordPress/CDN; they are not committed as heavy source binaries.
