# Public Site Social Wall Media Production — 2026-07-08

## Scope

This note documents the end-to-end production pass that replaced the empty
visual placeholders in the `Muestra de trabajo` wall on:

- URL: `https://efeoncepro.com/servicios/redes-sociales/`
- WordPress page: `251300`
- Runtime repo: `/Users/jreye/Documents/efeonce-public-site-runtime`
- Widget file: `wp-content/plugins/eo-elementor-widgets/includes/widgets/class-eo-social-landing-base.php`
- CSS file: `wp-content/plugins/eo-elementor-widgets/assets/css/social-landing.css`
- Public asset directory: `wp-content/plugins/eo-elementor-widgets/assets/img/social/wall/v1/`

The request was to decide what videos/images belonged in each placeholder,
produce them at a premium level, deploy them to the public landing, and
document the learning.

## Creative Intent

The wall should read as a produced social portfolio, not as a gallery of
generic images. The final direction is a fictional, premium social-first
campaign connected to the hero's macaw mural art direction:

- blue/green macaws;
- urban mural craft;
- creator production;
- coastal Brazil/tropical light as atmosphere, not airline literalism;
- editorial social formats;
- no real clients, logos, readable copy, watermarks or fake UI chrome.

The decision was to make the wall a coherent family of campaign artifacts,
not eight unrelated images. Each slot maps to a real social format:

| Slot | Format | Final asset | Role |
| --- | --- | --- | --- |
| `muro-a1` | Reel | `muro-a1-reel-cover.webp` | Hero reel cover with macaw mural burst |
| `muro-a3` | Carrusel | `muro-a3-carousel-piece.webp` | Editorial carousel piece |
| `muro-a4` | Creador | `muro-a4-creator-collaboration.webp` | Behind-the-scenes creator collaboration |
| `muro-b2` | Historia | `muro-b2-story-frame.webp` | Vertical story frame with phone/mural capture |
| `muro-b3` | Reel | `muro-b3-trend-reel-cover.webp` | Fast trend/reel transition visual |
| `muro-c1` | UGC | `muro-c1-ugc-clip-still.webp` | Premium handheld UGC still |
| `muro-c2` | Post | `muro-c2-editorial-post.webp` | Editorial saved-post still |
| `muro-c4` | Reel | `muro-c4-reel-finale-cover.webp` | Cinematic reel finale cover |

## Video vs Image Decision

The placeholders mention formats such as Reel/Historia/UGC, but the wall
itself already moves through the `data-muro-col` rail animation. Multiple
autoplaying videos inside a moving wall would add:

- extra transfer weight;
- decode/autoplay risk on mobile;
- visual noise against the existing rail motion;
- harder reduced-motion behavior;
- more QA surface for lazy-loading and viewport paint.

The better first production choice was eight still images that look like
finished covers/frames from social videos. This keeps the wall light while
preserving premium craft. If a later iteration adds video, it should be one or
two intentionally selected micro-loops, not eight simultaneous clips.

### 2026-07-08 Update: Living Motion V3

The first still-only package solved the empty placeholder problem, but the
operator correctly flagged a deeper creative issue once short clips were added:
the first motion pass moved the images, but the images did not feel alive in
their context. That distinction is now canonical for this wall.

Rejected pattern:

- camera pan/zoom over a still;
- glints, scanlines, blur or particle overlays that do not change the scene;
- "animated cover" where nothing in the social format behaves as footage;
- motion that reads as a moving poster instead of a Reel/Story/UGC moment.

Accepted pattern:

- each animated slot must have contextual action native to the format;
- UGC needs a living person: blink, laugh, breathing, shoulder/arm sway, phone
  lens imperfection, handheld parallax;
- Story needs a hand/phone/reflection/recording context, not just a framed
  image;
- creator collaboration needs a production micro-beat: checking framing,
  adjusting a phone/gimbal, nodding, background subject movement;
- Reel/trend needs body mechanics or an art/action beat with anticipation,
  arcs, follow-through and a visual settle;
- cinematic finale can be more VFX/artistic, but still needs directional
  movement, depth, particles and a final readable pose.

The current live wall therefore uses a hybrid package:

| Slot | Type live | Public source | Reason |
| --- | --- | --- | --- |
| `muro-a1` | Video | `assets/video/social/wall/v3/muro-a1-reel-living.webm` + MP4/poster | Reel cover becomes a living mural/macaw beat |
| `muro-a3` | Image | `assets/img/social/wall/v1/muro-a3-carousel-piece.webp` | Carrusel is a designed static editorial piece |
| `muro-a4` | Video | `assets/video/social/wall/v3/muro-a4-creator-living.webm` + MP4/poster | Creator collaboration should show BTS motion |
| `muro-b2` | Video | `assets/video/social/wall/v3/muro-b2-story-living.webm` + MP4/poster | Story frame should feel handheld/recorded |
| `muro-b3` | Video | `assets/video/social/wall/v3/muro-b3-trend-living.webm` + MP4/poster | Trend/Reel needs human movement and contact |
| `muro-c1` | Video | `assets/video/social/wall/v3/muro-c1-ugc-living.webm` + MP4/poster | UGC needs a real-feeling creator moment |
| `muro-c2` | Image | `assets/img/social/wall/v1/muro-c2-editorial-post.webp` | Post is an editorial saved asset |
| `muro-c4` | Video | `assets/video/social/wall/v3/muro-c4-finale-living.webm` + MP4/poster | Reel finale benefits from cinematic VFX motion |

Key creative learning: for social proof, "alive" is not equal to "moving".
Alive means the subject, camera, environment and format grammar all participate
in the beat.

## Asset Generation

Source folder:

```text
ai-generations/2026-07-08_social-wall-assets/
```

Generated files:

- `portrait-batch.json`: six 9:16 prompts for Reel/Historia/Creador/UGC.
- `landscape-batch.json`: two 3:2 prompts for Carrusel/Post.
- `muro-*.png`: high-quality source renders.
- `contact-sheet.jpg`: first system review.
- `README.md`: run-specific asset map.

Commands used:

```bash
gtimeout 1200s pnpm ai:image \
  --batch ai-generations/2026-07-08_social-wall-assets/portrait-batch.json \
  --out-dir ai-generations/2026-07-08_social-wall-assets \
  --size 1024x1536 \
  --quality high \
  --model gpt-image-2 \
  --timeout 420000

gtimeout 900s pnpm ai:image \
  --batch ai-generations/2026-07-08_social-wall-assets/landscape-batch.json \
  --out-dir ai-generations/2026-07-08_social-wall-assets \
  --size 1536x1024 \
  --quality high \
  --model gpt-image-2 \
  --timeout 420000
```

The contact sheet was generated with `ffmpeg` for visual review. `ffmpeg` in
this local environment can read PNG/JPEG and compose sheets, but it does not
include the `libwebp` encoder. For reusable web packaging, use the shared
helpers documented in `docs/operations/web-media-delivery-tooling.md`.

## Living Motion V3 Production

The living motion package was generated after the still package from the same
slot art direction.

Source and outputs:

```text
ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs
ai-generations/2026-07-08_social-wall-assets/motion-v3/refs/
ai-generations/2026-07-08_social-wall-assets/motion-v3/prompts/
ai-generations/2026-07-08_social-wall-assets/motion-v3/masters/
ai-generations/2026-07-08_social-wall-assets/motion-v3/exports/
/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v3/
```

Pipeline:

1. Create a 720x1280 PNG reference per animated slot from the still source.
2. Call Vertex AI `gemini-omni-flash-preview` in project `efeonce-group`,
   region `global`, using `generationConfig.responseModalities:
   ["TEXT","VIDEO"]`.
3. Prompt each slot with specific action, camera, timing and failure modes.
4. Receive a 10s vertical MP4 master.
5. Trim the strongest first beat to 4s.
6. Transcode to lightweight web delivery:
   - WebM VP9: 432x648, 24fps, no audio, `crf 34`;
   - MP4 H.264 fallback: 432x648, 24fps, no audio, `crf 23`;
   - JPG poster from the clip.

Command used:

```bash
node ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs --only=muro-c1
node ai-generations/2026-07-08_social-wall-assets/render-omni-motion-v3.mjs --only=muro-a1,muro-a4,muro-b2,muro-b3,muro-c4
```

Authentication note: both GCP auth planes had expired and had to be relaunched:

```bash
gcloud auth login
gcloud auth application-default login
```

This matches the repo operating contract: local GCP work must keep `gcloud`
and ADC aligned.

Review artifact:

```text
ai-generations/2026-07-08_social-wall-assets/motion-v3/review/wall-motion-v3-living-contact-sheet.jpg
```

The sample `muro-c1` was generated first and reviewed before spending the full
batch. It passed the "living" bar because the creator laughs, blinks, shifts
shoulder/arm, keeps phone/selfie parallax and sits in a moving real-world
environment. Only after that did the rest of the batch run.

Cost footprint: each Omni master reported `57920` video output tokens, matching
the 10s 720p preview contract. Six masters were generated for this wall pass.

## Web Optimization

Attempted conversion paths:

- `ffmpeg -c:v libwebp`: failed because this local ffmpeg build lacks the
  `libwebp` encoder.
- `sips -s format webp`: failed with `Can't write format`.
- `cwebp`: succeeded and is the local canonical converter for this workflow.

Current reusable conversion:

```bash
pnpm media:webp -- --input <source.png> --out <runtime.webp> --width 800 --quality 82
pnpm media:web-video -- --input <master.mp4> --out-dir <exports> --stem <name> --width 432 --height 648 --duration 4 --copy-to <runtime-video-dir>
```

Original one-off conversion used during the first pass:

```bash
for f in muro-a1-reel-cover muro-a4-creator-collaboration muro-b2-story-frame muro-b3-trend-reel-cover muro-c1-ugc-clip-still muro-c4-reel-finale-cover; do
  cwebp -quiet -q 82 -m 6 -resize 800 0 \
    "ai-generations/2026-07-08_social-wall-assets/${f}.png" \
    -o "/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/social/wall/v1/${f}.webp"
done

for f in muro-a3-carousel-piece muro-c2-editorial-post; do
  cwebp -quiet -q 82 -m 6 -resize 960 0 \
    "ai-generations/2026-07-08_social-wall-assets/${f}.png" \
    -o "/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/social/wall/v1/${f}.webp"
done
```

Final public package size:

```text
~940 KiB total for eight WebP files.
```

## Runtime Implementation

The widget gained a slot asset registry:

```php
private function get_wall_tile_asset( $slot_id ) { ... }
```

`render_wall_tile()` now:

- resolves the asset by slot id;
- renders `<img class="ghs-image-slot-media">` when the asset exists;
- keeps the original upload-style placeholder only as fallback;
- keeps the semantic slot labels and format/platform pills;
- uses decorative images with `alt=""` and an `aria-label` on the slot.

The CSS adds:

- `.ghs-image-slot-filled`;
- `.ghs-image-slot-media`;
- slot-specific `object-position` variables;
- a subtle hover scale/filter;
- reduced-motion guard so image hover transforms stop for users who prefer
  reduced motion.

Important implementation learning: keep the slot structure and labels from the
HTML contract even when images are loaded. The wall remains a content-system
mock, not a raw image gallery.

### Video Runtime

`render_wall_tile()` now renders a `<video>` when a slot has WebM/MP4 sources.
The video contract is:

- `muted`;
- `loop`;
- `playsinline`;
- `autoplay`;
- `preload="metadata"`;
- WebM primary, MP4 fallback;
- JPG poster;
- decorative video with the accessible description on the slot wrapper.

`social-landing.js` owns video behavior:

- only visible videos play, through `IntersectionObserver`;
- hover/focus on the wall pauses all videos;
- leaving/blur resumes visible videos without resetting time;
- `prefers-reduced-motion` removes autoplay, pauses videos and resets
  `currentTime` to `0`.

Testing caveat: Playwright can leave its virtual mouse over `.ghs-wall-mask`,
which intentionally pauses the wall. The v3 verifier calls `play()` after a
synthetic `mouseleave` when measuring raw playback, then separately verifies
the hover pause contract.

## Deploy

Deployment script:

```text
tmp/deploy-social-wall-assets-v1.mjs
```

Actions:

1. Load Kinsta SSH environment from `.env.local` / `.env`.
2. Create remote backup.
3. Upload:
   - `class-eo-social-landing-base.php`;
   - `social-landing.css`;
   - eight `assets/img/social/wall/v1/*.webp`.
4. Run remote PHP lint.
5. Print backup path and remote asset listing.

Remote backup:

```text
/tmp/eo-social-wall-assets-before-20260708T011949Z.tar.gz
```

Living motion v3 scoped release:

```text
Local release: /tmp/eo-social-wall-living-v3-release-20260708T044424Z.tar.gz
Remote backup: /tmp/eo-social-wall-living-v3-before-20260708T044424Z.tar.gz
Remote public directory: wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v3/
```

Only the focal widget PHP and `assets/video/social/wall/v3/` were deployed.
`pnpm public-website:runtime-status` and `pnpm public-website:diff-runtime`
reported `fullRepoDeploySafe=false`, so no full runtime deploy was attempted.

The initial tar extraction created macOS AppleDouble `._*` metadata files; they
were removed remotely with:

```bash
find wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v3 -maxdepth 1 -type f -name '._*' -delete
```

Post-deploy cache:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/public-site-social-hero-video-postdeploy.php --wp-user 12
pnpm public-website:wpcli -- --eval-file ./tmp/purge_kinsta_cache.php --wp-user 12
```

The first command reset OPcache and flushed WordPress cache. The second purged
Kinsta.

## Verification

Verifier:

```text
tmp/verify-social-wall-assets-v1.mjs
```

Checks:

- page loads public URL with cache-bust;
- `.ghs-image-slot-media` count is `8`;
- all 8 images are complete and have `naturalWidth > 0`;
- every image source includes `/assets/img/social/wall/v1/`;
- no horizontal overflow on desktop `1440` or mobile `390`;
- no console errors;
- screenshots saved for desktop and mobile.

Evidence:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/desktop-1440-wall.png
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/mobile-390-wall.png
```

The full mobile wall screenshot initially made some lazy-loaded images look
dark/blank. The verifier still showed `complete=true`, so a second probe was
created:

```text
tmp/inspect-social-wall-slots-v1.mjs
```

That script scrolls each slot into view, decodes the image, captures the slot,
and confirms viewport paint. Evidence:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/slots/
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-assets-v1/mobile-slots-contact.jpg
```

Lesson: for long mobile captures with lazy media, do not trust the composite
full-wall screenshot alone. Confirm slot-by-slot after scrolling each lazy
image into the viewport.

Final curl smoke:

```bash
curl -L -s 'https://efeoncepro.com/servicios/redes-sociales/?final_wall_probe=1' \
  | rg -o 'assets/img/social/wall/v1/[^"?]+' | sort | uniq -c
```

Each of the 8 assets appeared exactly once in HTML. Direct asset requests
returned `200 image/webp`.

### Living Motion V3 Verification

Verifier:

```text
tmp/verify-social-wall-motion-v3.mjs
```

Checks:

- live HTML references `assets/video/social/wall/v3/`;
- six videos render with WebM + MP4 sources and JPG posters;
- two static images remain from `assets/img/social/wall/v1/`;
- each video is muted, looping, plays inline and preloads metadata;
- all videos decode at `432x648`, `4s`, `24fps`;
- playback advances on desktop and mobile, including loop wrap handling;
- desktop hover pause holds time;
- reduced-motion pauses all videos, removes autoplay and keeps time near `0`;
- no horizontal overflow on desktop `1440` or mobile `390`;
- no blocking console errors.

Evidence:

```text
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-motion-v3/desktop-1440-wall-motion-v3.png
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-motion-v3/mobile-390-wall-motion-v3.png
/Users/jreye/Documents/efeonce-public-site-runtime/.captures/social-wall-motion-v3/summary.json
```

Final result: `ok=true`.

## Documentation Updates

Updated/created:

- `ai-generations/2026-07-08_social-wall-assets/README.md`
- `ai-generations/INDEX.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/redes-sociales.md`
- `.claude/skills/efeonce-public-site-wordpress/references/landings/redes-sociales.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`
- `docs/operations/public-site-social-wall-media-production-20260708.md`

Follow-up documentation pass added references from:

- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/operations/discovery-public-website-wordpress-20260614.md`

## Reusable Lessons

1. Treat a visual placeholder by its job, not by its literal label. A `Reel`
   placeholder can be represented by a premium cover/frame when the parent
   component already supplies motion.
2. Build a cohesive art family before generating assets. The wall must read as
   one campaign system, not as unrelated generations.
3. Avoid readable text/logos in AI-generated social samples unless typography
   is separately designed. Bad fake text makes the work feel less premium.
4. For UGC/Reel/Historia slots, do not stop at still motion. The prompt must
   direct living behaviors: blink, breath, gesture, camera sway, parallax,
   contact shadows, phone/reflection movement, environmental response and a
   readable settle.
5. Generate one representative living clip first before spending the full
   batch. In this pass, `muro-c1` was the creative gate because UGC exposes
   fake motion fastest.
6. Keep static formats static when their social job is static. A carrusel/post
   can remain an editorial WebP while UGC/Reel/Story carry video.
4. Use fictitious campaign assets for public portfolio samples unless a real
   client case and rights are approved.
5. Optimize for the wall context: object-fit/crop, pill overlay legibility,
   mobile stack, reduced motion and transfer weight matter more than the source
   render's standalone beauty.
6. Use `cwebp` for WebP conversion in this environment. Do not assume ffmpeg
   has `libwebp`, and do not assume `sips` can write WebP.
7. When deploying public-site runtime files directly to Kinsta, always create a
   remote tar backup, upload only scoped files, run remote PHP lint, reset
   OPcache, purge Kinsta, then verify live desktop/mobile.
8. Full-page mobile screenshots can underrepresent lazy-loaded images. Add a
   slot-by-slot scroll/decode probe before calling UI evidence final.
9. The widget should own asset mapping through a small registry/fallback,
   rather than hardcoding `background-image` in CSS only. This keeps the DOM
   inspectable, load state measurable and fallback honest.
10. Multiple simultaneous videos in a moving wall should be a later, explicit
    creative decision, not the default. Weight and decode risk can lower the
    perceived quality more than subtle stills.

## No ADR Required

This did not change Greenhouse source of truth, schema, auth/access, shared API
contracts, release control plane, event semantics, or UI platform primitives.
It was a scoped public-site runtime/content asset rollout with documented
backup, verification and rollback.
