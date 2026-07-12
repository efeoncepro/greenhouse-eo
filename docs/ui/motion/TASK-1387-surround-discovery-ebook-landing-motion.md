# TASK-1387 — Surround Discovery Ebook Landing Motion Contract

## Meta

- Owner task: `TASK-1387`
- Motion tier: `CSS + native browser events, progressive enhancement`
- Source of truth: `/Users/jreye/Documents/Lead magnet/Surround Discovery - Landing/Surround Discovery.dc.html`; `support.js` is only the Design Component host/runtime support, never a production dependency in Think.
- Fidelity rule: reproduce the approved HTML’s timings, easing, triggers and feedback; only replace its DC host with native Astro/browser code and the governed Growth Form renderer.

## Source-fidelity mapping

| Approved behavior | Think mapping | Reduced motion |
| --- | --- | --- |
| Viewport reveal, rAF scroll/resize and 1900ms safety reveal | `[data-reveal]` in `src/pages/seo-surround-discovery.astro`; source delay/duration data is preserved where specified | Every item is visible immediately; no hidden content without JavaScript |
| Hero constellation | exact `--px`/`--py` mouse mapping (clamped × 7px), five float profiles (7s, 8.5s, 7.8s, 9s, 8.2s), 5s halo and 4.8s waves at 0/1.6/3.2s | Float, halo, waves and pointer displacement disabled |
| Scroll parallax | source formula `clamp((centre - viewport/2) / viewport, -1, 1) × factor × 100`; factors `0.12`, `-0.10`, `-0.12`, `-0.18`, `0.16`, `-0.06`, `0.05` | All transforms reset |
| Radial surfaces | 5s wave sequence 0/1.7/3.4s; 0.7s node ping; source node/card cross-highlight (scale 1.14, teal border, 12×28 shadow) | Waves/ping and hover scale disabled; semantic cards remain readable |
| S⁴ | `s4beat` 4.8s at 0/1.2/2.4/3.6s | Static bars at source resting opacity |
| Ebook spotlight | 74s clockwise rays, 96s reverse ring, 12s hue cycle, 9s aura breath, 6.5s shaft breath and source 3D book parallax | All light and parallax transforms disabled |
| CTAs | `translateY(-3px)`, 0.74s shine, luminous glow; outline shadow; inline arrow at +5px | No animated transform/shine; links remain native controls |
| Pointer feedback | source 16px fixed ripple, scale `.35 → 4.2`, opacity `.55 → 0`, removed at 600ms | No ripple |
| FAQ | native `<details>`, 0.34s plus rotation and 0.38s `::details-content` height transition | Native disclosure remains instant |

## Accessibility and scope rules

- Motion never gates a description, CTA, consent, renderer error, success recovery or asset delivery.
- Form pending, CAPTCHA, validation and submission feedback remain owned by `<greenhouse-form>`; the landing only handles the allowlisted accepted event and focus-safe download recovery.
- The source durations are a bounded fidelity exception to generic portal timing tokens: this is a static Think editorial build unit, not a reusable Greenhouse portal primitive. No new animation library or copied `support.js` is introduced.
- Keyboard focus, native anchors and native `<details>` remain fully usable without hover or JavaScript.

## GVC / Micro Evidence

- `scripts/verify-surround-discovery-landing.mjs` asserts the motion names, hero pointer response, source-style cross-highlight, CTA shine/ripple, all parallax layers, static reduced-motion fallback, keyboard FAQ and no overflow at 1440/390.
- Capture settled desktop, mobile and reduced-motion states; page `scrollWidth` must equal `clientWidth` in both responsive viewports.

## Design Decision Log

- Chosen: preserve the approved landing’s rich motion exactly, including decorative continuous loops, because the operator explicitly rejected a restrained reinterpretation.
- Rejected: copying `support.js`; it provides the original Design Component host/event infrastructure, while Think needs only the page-local browser behavior described above.
- Rejected: replacing the source choreography with a portal motion primitive or new animation library; it would alter timing/composition and create an unnecessary runtime dependency for a static Astro route.
