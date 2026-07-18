# TASK-1429 — Interruptive placement motion

## Meta

- Task: `TASK-1429`
- Scope: entrance, exit and action feedback for the single interruptive CTA placement

## Motion Brief

Motion announces a contextual surface without manufacturing urgency. It is short, interruptible and owned by the renderer; eligibility and suppression never depend on animation completion.

## Motion Inventory

- Entrance: edge/bottom translation plus opacity using canonical public renderer tokens.
- Exit: reverse transition, then unmount and restore focus.
- Controls: existing hover/focus/press feedback from the CTA renderer.
- No stagger, bounce, autoplay loop or background choreography.

## Primitive and Token Mapping

- Extend the CSS motion layer established by TASK-1340.
- Use canonical duration/easing/distance tokens; no component-local raw timing or curves.
- Animate compositor-friendly properties only and keep the host layout stable.

## Reduced Motion Contract

- `prefers-reduced-motion: reduce` removes travel and uses an immediate final state or minimal opacity change from the canonical token set.
- Opening, closing, focus transfer and suppression remain identical semantically.

## Accessibility and Performance

- Focus-visible never depends on motion.
- Exit completes before unmount in normal mode; reduced motion unmounts immediately after state/focus handling.
- No layout shift, page scroll jump or delayed LCP.

## GVC / Micro Evidence

- Capture normal entrance/open/exit and reduced-motion open/close at `1440` and `390`.
- Verify animation cannot replay after dismissal/cap and is interrupted safely by kill switch/navigation.

## Design Decision Log

- Decision: extend the renderer's CSS motion contract instead of adding GSAP/framer choreography.
- Why: the placement needs predictable public-host behavior, small payload and explicit reduced-motion support.
