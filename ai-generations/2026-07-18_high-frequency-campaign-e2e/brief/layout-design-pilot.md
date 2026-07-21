# Layout Design & Finishing Pilot

## Objective

Prove a controlled static-production method on the approved **Alta frecuencia** campaign in three ratios: `16:9`, `4:5` and `9:16`.

The pilot does not ask an image model to design the final ad. It separates the work into:

1. approved campaign anchor;
2. ratio-specific clean plate;
3. one generative finishing delta on the clean plate;
4. deterministic layout, copy and official brand asset;
5. technical and visual release gates.

## Model routing

The ratio plates were already organized from the Seedream-developed anchor with GPT Image 2. The remaining generative need is material and atmospheric integration, so this pilot routes the clean plates through `bytedance/seedream/v5/pro/edit`.

Seedream receives no copy or logo. Its only delta is to refine feather micro-contrast, translucent tile material, directional light and depth while preserving subject geometry and the copy field. Any output that moves the bird, adds anatomy or contaminates the copy field is rejected in favor of the approved source plate.

## Layer stack

| Order | Layer | Authority |
| --- | --- | --- |
| 1 | Finished clean plate | Seedream Pro output after human gate |
| 2 | Copy-field scrim and optical vignette | Deterministic SVG |
| 3 | Frequency rail / campaign accent | Deterministic SVG |
| 4 | Kicker, headline, support and URL | Poppins outlines via fontkit |
| 5 | Efeonce wordmark | `public/branding/logo-negative.svg` |

## Layout grammar

- A single left alignment axis controls kicker, headline, support and URL.
- A narrow vertical frequency rail replaces the previous floating horizontal dash and creates a repeatable campaign hook.
- Headline and subject remain separate at release; no text crosses the bird.
- The subject keeps the rightward flight direction and the chromatic wake remains the scale metaphor.
- The copy field is protected with an optical scrim, not a visible card or glass panel.
- Logo and URL occupy separate brand and closure positions; neither is generated.

## Ratio-specific behavior

### 16:9

Twelve-column editorial split. Copy occupies the left five columns; the bird owns the right half. The support line is kept compact and the lower-left URL closes the Z path.

### 4:5

Eight-column poster composition. The headline moves above the wing line, while the subject and wake create the descending diagonal through the lower two-thirds.

### 9:16

Six-column story composition with explicit top and bottom interface reserves. Copy sits above the bird; the URL closes before the bottom UI zone.

## Acceptance gates

- Exactly one bird with complete head, torso, beak, wings and tail.
- Layout geometry and copy-safe field match `layout-design-pilot.json`.
- No generated text, logo, watermark, UI or additional object.
- Headline reads at thumbnail size and does not touch the subject.
- Official logo and exact Spanish copy are composed deterministically.
- Final outputs are sRGB JPEG, correct dimensions and within the digital weight budget.
- Master and two derivatives score at least 43/50 in the KV rubric, with no dimension below 4/5.
