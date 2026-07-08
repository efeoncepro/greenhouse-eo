# Web Media Delivery Tooling

This repo keeps reusable media packers under `scripts/media/` so agents do not
recreate one-off `ffmpeg` or `cwebp` commands during public-site work.

## Commands

### Archive AI Generation Binaries

Use this after a generation run has useful source frames, masters, reviews or
exports that are too heavy for git. It uploads only binary files to a GCS bucket
and writes a lightweight `artifacts.remote.json` manifest in the run folder.

```bash
pnpm media:archive-ai-generation -- \
  --run ai-generations/2026-07-08_creative-landing-assets \
  --apply
```

Defaults:

- Bucket: `efeonce-group-greenhouse-private-assets-prod`.
- Prefix: `ai-generations/<run>/`.
- Dry-run by default; `--apply` is required to upload.
- Local files are not deleted.
- Manifest records `gsUri`, `sizeBytes` and `sha256` for each binary.

Use a public runtime/CDN bucket only for approved delivery assets. Use the
private bucket for prompts, masters, references, review sheets and exploratory
outputs.

### Video For Web

Use this for autoplay or inline landing videos. It emits a primary WebM, an MP4
fallback and a JPG poster from the same source clip.

```bash
pnpm media:web-video -- \
  --input ai-generations/<run>/motion/master.mp4 \
  --out-dir ai-generations/<run>/exports \
  --stem sample-clip-v1 \
  --width 640 \
  --height 360 \
  --trim-start 0.35 \
  --duration 5 \
  --copy-to /Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/example/v1
```

Outputs:

```text
sample-clip-v1.webm
sample-clip-v1.mp4
sample-clip-v1-poster.jpg
```

Defaults are tuned for landing-page delivery:

- VP9 WebM, no audio, `crf 34`, 24fps.
- H.264 MP4 fallback, no audio, `crf 23`, `+faststart`.
- Cover crop to the requested dimensions unless `--fit contain` is passed.

### Images To WebP

Use this for thumbnails, covers, frames and static visual placeholders.

```bash
pnpm media:webp -- \
  --input ai-generations/<run>/source.png \
  --out /Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/social/example/v1/source.webp \
  --width 420 \
  --height 420 \
  --quality 78
```

You can also use `--out-dir <dir> --stem <name>` when producing packages.

## Local Environment Notes

- Use `cwebp` for WebP conversion in this environment.
- Do not assume local `ffmpeg` includes the `libwebp` encoder.
- Do not assume macOS `sips` can write WebP.
- Keep landing videos muted/no-audio unless the surface has an explicit audio
  interaction contract.
- Always ship WebM + MP4 + poster for public autoplay videos.
- Do not commit generated binary outputs to this repo by default. `ai-generations`
  is for lightweight manifests, prompts, scripts and documentation; approved web
  assets should be copied to the public-site runtime/CDN or external artifact
  storage and referenced from the run README.

## Verification Checklist

After producing assets for a public-site landing:

1. Confirm file sizes are appropriate for the placement.
2. Verify asset URLs return `200` with expected content types.
3. Use Playwright/GVC to confirm desktop and mobile paint correctly.
4. For lazy-loaded image grids, scroll each slot into view and wait for
   `img.decode()` before judging a screenshot.
5. Check `scrollWidth == clientWidth` on desktop and mobile.
6. Verify reduced-motion behavior for autoplay video surfaces.
