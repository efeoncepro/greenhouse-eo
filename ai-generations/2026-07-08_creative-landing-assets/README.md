# Creative Landing Assets — Agencia Creativa V2

## Objective

Replace placeholder-like visual slots in:

```text
https://efeoncepro.com/agencia-creativa-v2/
```

Scope:

- `Motor de producción`: final output preview.
- `Trabajo seleccionado`: 1 video slot + 4 image slots.
- `Casos`: 3 case-study image covers.

Hero, workflow/FAB, metrics and Greenhouse panel are intentionally runtime
motion/UI systems and are not treated as placeholder media in this pass.

## Delivery Plan

| Slot | Delivery | Reason |
| --- | --- | --- |
| `Spot TV · Video` | 5s WebM + MP4 + poster | The card explicitly promises video/spot work. |
| `Key visual · Concepto` | WebP | Needs immediate inspection and art-direction credibility. |
| `UI/UX · Figma` | WebP | Should read as a polished product prototype, not a moving clip. |
| `Campaña · full-funnel` | WebP | Multi-format campaign board is clearer as a static overview. |
| `Key visual · Sistema social` | WebP | A modular social system benefits from crisp cover art. |
| `Pieza terminada` | WebP | The AI engine output needs a finished visual artifact. |
| `Sky Airlines` | WebP | Case cover, no real logo. |
| `Bresler` | WebP | Case cover, no real logo. |
| `Pinturas Berel` | WebP | Case cover, no real logo. |

## Generation

```bash
pnpm ai:image --batch ai-generations/2026-07-08_creative-landing-assets/creative-placeholders-batch.json --out-dir ai-generations/2026-07-08_creative-landing-assets --size 1536x1024 --quality high --model gpt-image-2 --timeout 420000
```

Use the reusable web delivery helpers:

```bash
pnpm media:webp -- --input <source.png> --out <runtime.webp> --width 900 --quality 82
pnpm media:web-video -- --input <master.mp4> --out-dir <exports> --stem creative-work-spot-v1 --width 720 --height 484 --duration 5 --copy-to <runtime-video-dir>
```

Canonical helper runbook:

```text
docs/operations/web-media-delivery-tooling.md
```

## Published Runtime Package

Runtime plugin:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets
```

Live URL:

```text
https://efeoncepro.com/agencia-creativa-v2/
```

Published assets:

- `assets/video/creative/portfolio/v1/creative-work-spot-v1.webm`
- `assets/video/creative/portfolio/v1/creative-work-spot-v1.mp4`
- `assets/video/creative/portfolio/v1/creative-work-spot-v1-poster.jpg`
- `assets/img/creative/portfolio/v1/creative-engine-final-output-v1.webp`
- `assets/img/creative/portfolio/v1/creative-work-key-visual-campaign-v1.webp`
- `assets/img/creative/portfolio/v1/creative-work-product-prototype-v1.webp`
- `assets/img/creative/portfolio/v1/creative-work-full-funnel-campaign-v1.webp`
- `assets/img/creative/portfolio/v1/creative-work-social-system-v1.webp`
- `assets/img/creative/portfolio/v1/creative-case-sky-airlines-v1.webp`
- `assets/img/creative/portfolio/v1/creative-case-bresler-commerce-v1.webp`
- `assets/img/creative/portfolio/v1/creative-case-berel-content-v1.webp`

Runtime integration points:

- `class-eo-creative-landing-module-widget.php`: `get_portfolio_assets()`, `render_image_asset()`, `render_video_asset()`.
- `creative-landing.css`: media cover/overlay styles for `.ghc-output-art`, `.ghc-work-art`, `.ghc-case-art`.
- `creative-landing.js`: `[data-ghc-inline-video]` viewport playback and reduced-motion hard pause.

Rollback:

```text
/tmp/eo-creative-portfolio-media-v1-before-20260708T062208Z.tar.gz
```

The backup contains the pre-change PHP/CSS/JS. The `portfolio` media directories did not exist before this pass.

## Verification

Live verification script:

```text
tmp/verify-creative-portfolio-media-v1.mjs
```

Evidence:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/creative-portfolio-media-v1/
```

Result summary:

- Desktop `1440`: `imageCount=8`, `videoCount=1`, video `currentSrc` uses WebM, `readyState=4`, `scrollWidth==clientWidth`.
- Mobile `390`: `imageCount=8`, `videoCount=1`, video advances, `scrollWidth==clientWidth`.
- Reduced motion: `pageMotion=off`, `hasAutoplay=false`, `paused=true`, `currentTime=0`.
- Console: only Chrome headless WebGL `ReadPixels` performance warnings observed.
