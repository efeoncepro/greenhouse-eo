# Creative Studio accounting boundary

Read this reference when a HyperFrames composition is part of an Efeonce Creative Studio/Globe run or when
someone asks how many Studio Credits a rendered video, cutdown, caption pass, TTS track, block, or component
uses.

## The rule

Studio Credits represent **governed generative operations**, not finished pieces, hours, renders, timelines,
components, frames, codecs, or exports. HyperFrames is deterministic composition/finishing tooling. Authoring,
preview, lint, inspect, validation, rendering, re-rendering, transcode, captions, deterministic animation,
layout, overlays and cutdowns from approved assets therefore use **0 Studio Credits**.

Zero credits does not mean zero cost. Human/agent authoring, review, compute and support are funded through
governance/platform, capacity or implementation/IP. Do not convert CLI CPU/render time into credits.

## When credits do apply

Record only a separate generative capability invoked upstream or alongside the composition, for example:

- image/video generation or transformation used as a plate;
- generative upscale or reframe;
- generative VO/TTS, music or SFX;
- lip-sync or another specialist inference.

The estimate belongs to that capability/run, with duration/tier/attempt drivers. Installing a registry block,
reusing an asset, composing it, or exporting additional aspect ratios does not duplicate that charge.

The local `hyperframes tts` command uses a local model and produces a synthetic voice asset, but this CLI does
not implement the Globe credit ledger. In a governed client run, route the voice operation through the Studio
estimate/reservation contract and preserve consent/license evidence; never invent credits from command count.

## Examples

| Work | Studio Credits |
|---|---:|
| Build and render a 15 s title sequence entirely in HTML/CSS/GSAP | 0 |
| Add captions/end card and export 16:9 + 9:16 from approved media | 0 |
| Produce 30/15/6 cutdowns by deterministic editing | 0 |
| Install/wire a registry transition and re-render | 0 |
| Generate a 15 s video plate, then compose exact copy/logo in HyperFrames | credits for video generation only |
| Generate VO, then mix and caption it | credits for VO operation only; mix/captions 0 |

## Governance

For a Studio run use:

```text
allocation → estimate → reservation → approval → execution
  → candidate/review → settlement | release | refund adjustment
```

Do not let HyperFrames authoring or CLI rendering reserve, settle, refund or approve credits. Those commands
belong to the Creative Studio runtime and append-only ledger. A technical provider failure is not silently
double-charged; a valid output followed by a changed creative direction requires a new estimate/branch.

Rights remain outside credits: voice/likeness consent, music/sync/master rights, stock, talent, territory,
term, exclusivity and buyout must be cleared separately.

Canonical policy:
`docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.
