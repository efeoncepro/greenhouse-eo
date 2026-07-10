# TASK-1387 — Surround Discovery Ebook Landing Motion Contract

## Meta

- Owner task: `TASK-1387`
- Motion tier: `CSS-only, progressive enhancement`
- Purpose: orient reading through a complex system map and signal explicit state changes; never simulate data, discovery results or user agency.

## Motion Inventory

| Element | Trigger | Motion | Duration | Meaning | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Hero map | first paint | static initial composition; optional soft opacity reveal | 160–240ms | establishes a system, not live telemetry | visible immediately |
| Five surfaces | enters viewport | short opacity/translate stagger, DOM order preserved | 40ms gap, max 280ms | reading order from surface to system | all visible immediately |
| Surface hover/focus | pointer/focus | border/accent/1–2px lift via transform only | 160ms | feedback that a linked concept is actionable | focus style remains; no lift required |
| S⁴ loop | enters viewport | one subtle directional trace/pulse through ordered steps | max 500ms, once | communicates feedback loop, not an auto-running workflow | static numbered connectors |
| Form load | renderer mount | skeleton fade to ready state | 180ms | loading state only | instant swap |
| Form pending | renderer submit | renderer-owned disabled/pending feedback | renderer-owned | prevents duplicate action | textual state unchanged |
| Form success/error | server outcome | host content swap, focus after paint | 0–200ms | confirmed state transition | instant swap and focus |
| FAQ | native disclosure | CSS height/opacity only if it does not delay semantics | 160–220ms | expansion feedback | native instant disclosure |

## Rules

- Use transform/opacity only; do not animate layout dimensions, scroll position, colors that encode state, canvas, WebGL or continuously running loops.
- No GSAP, Lottie, parallax, custom cursor, counter, progress percentage, confetti or auto-advancing carousel.
- Motion must never gate a surface description, S⁴ explanation, CTA, consent, error or recovery path.
- `prefers-reduced-motion: reduce` disables reveal/stagger/trace/lift; the page remains fully composed at first paint.
- Motion is decorative/wayfinding only. The form's validation, pending state and CAPTCHA feedback remain owned by the governed renderer.

## GVC / Micro Evidence

- Focus ring is always visible and does not wait for/animate into existence.
- Success/error moves focus to a compact labelled heading, never to a large live region/card.
- Hero visual and surface map must not delay LCP; no client hydration is justified solely for animation.
- GVC must capture settled desktop, mobile and reduced-motion states; inspect that no transform causes clipping or horizontal overflow at 390px.

## Design Decision Log

- Chosen: restrained CSS motion to make the map and S⁴ reading order legible.
- Rejected: animated orbital system/dashboard—would imply real measurement, increase distraction and conflict with the ebook’s teaching purpose.
- Rejected: a dramatic success celebration—the promised result is a file delivery, so calm confirmation is more trustworthy.
