# Images & assets (`astro:assets`)

Astro has built-in image optimization. Use `<Image>` / `<Picture>` from
`astro:assets` for anything that should be optimized (resized, format-converted,
lazy). Optimization runs at build for static, or on-demand with an adapter.

## Local images

Import the asset (gets width/height/format metadata) and pass it to `<Image>`.

```astro
---
import { Image } from 'astro:assets'
import hero from '../assets/hero.png'   // in src/, not public/
---
<Image src={hero} alt="Brand grader hero" width={800} height={600} />
```

- Import from **`src/`** (processed) — not `public/` (served as-is, unoptimized).
- `alt` is **required** — build errors without it.
- Astro infers dimensions from the imported asset; override with `width`/`height`
  (keep the aspect ratio or the image distorts).
- Output is lazy-loaded and `decoding=async` by default.

## Remote images

Remote sources must be allow-listed, and you should pass explicit dimensions
(Astro can't infer them without downloading).

```js
// astro.config.mjs
export default defineConfig({
  image: {
    domains: ['cdn.efeoncepro.com'],
    remotePatterns: [{ protocol: 'https', hostname: '**.efeoncepro.com' }],
  },
})
```

```astro
<Image src="https://cdn.efeoncepro.com/x.jpg" alt="…" width={1200} height={630} inferSize />
```

`inferSize` lets Astro fetch dimensions at build (costs a request); prefer
explicit `width`/`height`.

## `<Picture>` for art direction / multiple formats

```astro
---
import { Picture } from 'astro:assets'
import hero from '../assets/hero.png'
---
<Picture src={hero} formats={['avif', 'webp']} alt="…" width={1200} height={630} />
```

Emits `<picture>` with `avif`/`webp` sources + a fallback `<img>`.

## `getImage()` for non-`<img>` use

For CSS backgrounds, `<meta>` OG images, or manual markup, use `getImage()` to
get the optimized URL:

```astro
---
import { getImage } from 'astro:assets'
import bg from '../assets/bg.png'
const optimized = await getImage({ src: bg, width: 1600 })
---
<div style={`background-image:url(${optimized.src})`}></div>
```

## `src/` vs `public/`

| Put in `src/assets/` when | Put in `public/` when |
|---|---|
| You want optimization / hashing / responsive | It must keep its exact path/name (favicon, robots.txt, OG image referenced by absolute URL, fonts) |
| Referenced via import in components | Referenced by a stable public URL |

## SVGs

Import SVGs as components (`import Logo from '../assets/logo.svg'` →
`<Logo />`) — inlined, stylable via `currentColor`. For the efeonce/AXIS brand,
follow the repo's brand-asset rules (proprietary illustrations, isotypes) — see
`efeonce-overlay.md`; don't hand-transcribe third-party marks.

## Performance / SEO tie-in

- The hero (LCP) image should have explicit dimensions and, if above the fold,
  `loading="eager"` + `fetchpriority="high"`.
- Serve OG/social images from `public/` (stable URL) or generate at build.
- Compose CWV/perf budgets with `web-perf-design`; AEO crawlability with
  `seo-aeo`.

## Hard rules

- **SIEMPRE** provide `alt` (required) and explicit dimensions (avoid CLS).
- **NEVER** put images that need optimization in `public/`.
- **NEVER** load a remote image without allow-listing its host.
- Import brand assets per repo rules; don't re-transcribe SVG marks.
