# Social Includes Assets — Redes Sociales Landing

## Objective

Replace the remaining visual placeholders inside the `Qué incluye` explorer on:

```text
https://efeoncepro.com/servicios/redes-sociales/
```

This package is scoped to three scenes:

- `Estudio de contenido`: short production-studio video inside the video preview.
- `Generación con AI`: real generated thumbnails inside the variant grid.
- `UGC que se siente real`: simple UGC video inside the UGC card.

## Direction

Keep the existing fictional macaw/mural campaign universe, but let each scene
speak from its own service context:

- production studio = crew, camera, monitor, lighting, on-set craft;
- AI variants = diverse output thumbnails, not empty shimmer blocks;
- UGC = human, simple, handheld, believable.

No real client logos, no readable text, no watermarks, no fake app UI.

## Generation

Images:

```bash
pnpm ai:image --batch ai-generations/2026-07-08_social-includes-assets/stills-landscape-batch.json --out-dir ai-generations/2026-07-08_social-includes-assets --size 1536x1024 --quality high --model gpt-image-2 --timeout 420000
pnpm ai:image --batch ai-generations/2026-07-08_social-includes-assets/ai-variant-thumbnails-batch.json --out-dir ai-generations/2026-07-08_social-includes-assets --size 1024x1024 --quality high --model gpt-image-2 --timeout 420000
```

Video:

```bash
node ai-generations/2026-07-08_social-includes-assets/render-omni-includes-v1.mjs
```

Web delivery packaging should use the shared repo helpers, not ad hoc commands:

```bash
pnpm media:web-video -- \
  --input ai-generations/2026-07-08_social-includes-assets/motion-v1/masters/includes-studio-production-v1-omni-master.mp4 \
  --out-dir ai-generations/2026-07-08_social-includes-assets/motion-v1/exports \
  --stem includes-studio-production-v1 \
  --width 640 \
  --height 360 \
  --trim-start 0.35 \
  --duration 5 \
  --copy-to /Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/includes/v1

pnpm media:webp -- \
  --input ai-generations/2026-07-08_social-includes-assets/include-ai-variant-01-photo.png \
  --out /Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/social/includes/v1/include-ai-generating-01.webp \
  --width 420 \
  --height 420 \
  --quality 78
```

Canonical tooling reference:

```text
docs/operations/web-media-delivery-tooling.md
```

## Runtime destinations

```text
assets/img/social/includes/v1/
assets/video/social/includes/v1/
```
