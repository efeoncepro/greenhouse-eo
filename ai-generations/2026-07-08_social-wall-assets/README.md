# Social Wall Assets — Redes Sociales Landing

## Objective

Replace the visual placeholders in the `Muestra de trabajo` wall on the public
landing:

```text
https://efeoncepro.com/servicios/redes-sociales/
```

The output is a premium fictional social campaign package, not real client work
and not stock imagery.

## Direction

Creative system:

- social-first craft wall;
- artistic blue/green macaws;
- urban mural energy;
- creator production;
- editorial social formats;
- coastal/tropical Brazil atmosphere as texture;
- no real logos, no readable copy, no watermarks, no fake platform UI.

Rationale, updated after live review:

The first solution was eight premium WebP stills inside the moving wall. That
solved the empty placeholder problem, but a later motion pass proved that
camera movement over stills was not enough: UGC/Reel/Historia slots need to
feel alive in context. The current live solution keeps static social formats as
WebP (`Carrusel`, `Post`) and uses short living WebM/MP4 clips for the formats
that naturally imply footage (`Reel`, `Historia`, `UGC`, `Creador`).

## Slot Map

| Slot | Prompt source | Public file | Purpose |
| --- | --- | --- | --- |
| `muro-a1` | `portrait-batch.json` | `muro-a1-reel-cover.webp` | high-impact Reel cover |
| `muro-a3` | `landscape-batch.json` | `muro-a3-carousel-piece.webp` | editorial carousel slide |
| `muro-a4` | `portrait-batch.json` | `muro-a4-creator-collaboration.webp` | creator collaboration BTS |
| `muro-b2` | `portrait-batch.json` | `muro-b2-story-frame.webp` | vertical Story frame |
| `muro-b3` | `portrait-batch.json` | `muro-b3-trend-reel-cover.webp` | trend/reel transition cover |
| `muro-c1` | `portrait-batch.json` | `muro-c1-ugc-clip-still.webp` | premium UGC still |
| `muro-c2` | `landscape-batch.json` | `muro-c2-editorial-post.webp` | editorial Post asset |
| `muro-c4` | `portrait-batch.json` | `muro-c4-reel-finale-cover.webp` | cinematic Reel finale |

## Living Motion V3

Script:

```text
render-omni-motion-v3.mjs
```

Generated package:

```text
motion-v3/refs/
motion-v3/prompts/
motion-v3/masters/
motion-v3/exports/
motion-v3/review/wall-motion-v3-living-contact-sheet.jpg
```

Live video destination:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v3/
```

Animated live slots:

| Slot | Live video stem | Creative beat |
| --- | --- | --- |
| `muro-a1` | `muro-a1-reel-living` | mural/macaw reel cover becomes alive |
| `muro-a4` | `muro-a4-creator-living` | creator BTS adjusts framing/gimbal |
| `muro-b2` | `muro-b2-story-living` | hand/phone/reflection story capture |
| `muro-b3` | `muro-b3-trend-living` | human trend movement with mural wing |
| `muro-c1` | `muro-c1-ugc-living` | creator selfie laugh/blink/handheld sway |
| `muro-c4` | `muro-c4-finale-living` | cinematic macaw VFX finale |

Generation:

```bash
node ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs --only=muro-c1
node ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs --only=muro-a1,muro-a4,muro-b2,muro-b3,muro-c4
```

The key learning: "alive" means contextual action, not movement over a still.
Prompts must name human/format behaviors: blink, laugh, shoulder shift, camera
sway, phone reflection, rack focus, contact shadows, environmental response,
anticipation, arcs, follow-through and a readable settle.

## Generation Commands

Portrait batch:

```bash
gtimeout 1200s pnpm ai:image \
  --batch ai-generations/2026-07-08_social-wall-assets/portrait-batch.json \
  --out-dir ai-generations/2026-07-08_social-wall-assets \
  --size 1024x1536 \
  --quality high \
  --model gpt-image-2 \
  --timeout 420000
```

Landscape batch:

```bash
gtimeout 900s pnpm ai:image \
  --batch ai-generations/2026-07-08_social-wall-assets/landscape-batch.json \
  --out-dir ai-generations/2026-07-08_social-wall-assets \
  --size 1536x1024 \
  --quality high \
  --model gpt-image-2 \
  --timeout 420000
```

## Review

The first system review used:

```text
contact-sheet.jpg
```

The sheet showed the 8 pieces work as a coherent campaign system:

- strong macaw/mural signature;
- enough format variety;
- no real brand marks;
- no visible generated fake copy;
- usable crops under the wall overlay.

## Conversion

Use `cwebp` in this environment. Do not assume ffmpeg can write WebP; the local
ffmpeg build lacks `libwebp`, and `sips` failed to write WebP.

Vertical assets:

```bash
cwebp -quiet -q 82 -m 6 -resize 800 0 source.png -o output.webp
```

Horizontal assets:

```bash
cwebp -quiet -q 82 -m 6 -resize 960 0 source.png -o output.webp
```

Public destination:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/social/wall/v1/
```

Final total size: approximately `940 KiB` for all 8 WebP files.

## Runtime Integration

The WordPress widget maps the files by slot in:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/includes/widgets/class-eo-social-landing-base.php
```

Method:

```php
get_wall_tile_asset()
```

CSS support lives in:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/css/social-landing.css
```

Important: placeholders remain fallback-only. The slot structure, data
attributes, labels and platform pills stay in place.

## Deploy Evidence

Remote backup:

```text
/tmp/eo-social-wall-assets-before-20260708T011949Z.tar.gz
```

Verifier:

```text
tmp/verify-social-wall-assets-v1.mjs
tmp/inspect-social-wall-slots-v1.mjs
```

Captures:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/desktop-1440-wall.png
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/mobile-390-wall.png
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/slots/
```

Result:

- desktop `1440`: 8/8 images loaded, no console errors, no horizontal overflow;
- mobile `390`: 8/8 images loaded, no console errors, no horizontal overflow;
- slot-by-slot mobile scroll/decode probe confirmed lazy-loaded paint.

## Operational Learning

For animated portfolio walls, premium stills can outperform multiple videos
because the container already creates motion. Video should be reserved for
selected hero moments or one/two intentional micro-loops. For all AI-generated
public portfolio samples, keep them fictional unless the real client case and
rights are explicitly approved.

Updated learning after v3: once the placeholder itself says `UGC`, `Reel`,
`Historia` or `Creador`, short clips are justified because the format promises
footage. The wrong move is animating the still; the right move is generating a
small living beat native to that format.

Full operational note:

```text
docs/operations/public-site-social-wall-media-production-20260708.md
```
