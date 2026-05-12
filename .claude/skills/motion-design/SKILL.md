---
name: motion-design-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global motion-design skill defaults. Load this first whenever motion-design is invoked inside this repo.
type: overlay
overrides: motion-design
---

# motion-design — Greenhouse Overlay

Load global `motion-design/SKILL.md` first → then read this overlay → then apply rules. When the global skill and this overlay disagree, **this overlay wins**.

## Pinned decisions

### 1. Duration tokens (canonical scale)

| Token | Value | Where |
|---|---|---|
| `--motion-instant` | 75 ms | Tap ack |
| `--motion-short` | 150 ms | Hover, focus ring, color swap |
| `--motion-standard` | 200 ms | Tooltip, menu open, accordion |
| `--motion-medium` | 300 ms | Modal scale-up, drawer slide |
| `--motion-long` | 400 ms | Same-doc view transition |
| `--motion-extended` | 600 ms | Hero entrance (rare in product UI) |

**Anti-patterns** (lint-detectable, modern-ui overlay also blocks):
- `transition: 0.3s` (300ms default) — pick from scale
- `250ms` / `350ms` / `500ms` — off-scale
- `transition: all` — be specific

### 2. Easing — `cubic-bezier(0.2, 0, 0, 1)` (Material 3 emphasized) is default

`ease-in-out` is BANNED as default. Use:

- Entrances: `cubic-bezier(0.2, 0, 0, 1)` (emphasized decel)
- Exits: `cubic-bezier(0.3, 0, 0.8, 0.15)` (emphasized accel)
- Linear: spinners, loading bars

### 3. Library — MUI transitions first, Motion only for orchestration

Default = MUI's built-in transitions (`<Fade>`, `<Slide>`, `<Grow>`, `<Collapse>`, `<Zoom>`). Apply duration + easing from tokens.

`framer-motion` / `motion` allowed when:
- Layout animations (`<motion.div layout>` — FLIP for free)
- Orchestrated sequences (>3 elements with stagger)
- Gestures (drag/swipe)
- Page transitions via View Transitions API

NEVER ship GSAP for routine product UI. GSAP is a set-piece tool. The dashboards / forms / drawers / modals do NOT need GSAP.

### 4. View Transitions — Next.js 16 native

For route → route transitions in `(dashboard)/`, use Next.js 16's View Transitions integration. Cross-fade is the default; slide direction only when forward/back semantics are clear (e.g., wizard steps).

Implementation pattern: `<ViewTransition>` in `layout.tsx` of the segment.

### 5. Reduced motion contract — `useReducedMotion` hook

EVERY animation passes through `useReducedMotion`. The 4-state contract:

- **Disable**: parallax, autoplay video, decorative scroll-driven motion, large translates, hero entrance animations.
- **Reduce**: hover snap (0–50 ms instead of 150 ms).
- **Keep**: spinners, focus rings, state-conveying microinteractions.
- **Replace**: slide → cross-fade.

### 6. Compositor-only properties — `transform` + `opacity` ONLY

NEVER animate `width`, `height`, `top`, `left`, `margin`, `padding`. INP killers.

For "expand from 0 to auto height": use `grid-template-rows: 0fr → 1fr` (CSS-only trick) or animate `max-height` with a known cap.

### 7. The 7 canonical Greenhouse motion patterns

1. **Tap ack** — button scale `0.98`, 75 ms (every clickable in MUI handles this; verify on `CustomIconButton`).
2. **Hover lift** — `translateY(-2px)` + shadow grow, 150 ms (desktop only, disabled on touch).
3. **Focus ring** — instant on `:focus-visible`, no fade-in.
4. **Modal enter** — backdrop fade 200 ms; modal scale `0.96 → 1` + opacity `0 → 1` over 300 ms emphasized.
5. **Drawer slide** — slide from anchor edge 300 ms emphasized. Exit 200 ms accel.
6. **Toast/snackbar** — slide up + fade, 200 ms emphasized. 4-6 s info / indefinite for error.
7. **Skeleton shimmer** — linear-gradient sweep, 1.5 s linear, infinite. Stops on `prefers-reduced-motion`.

These are documented + enforced by `greenhouse-microinteractions-auditor`.

### 8. Page transition — same-doc, decel, ≤400 ms

For SPA-style nav (sub-tab swaps, drawer-driven detail views): View Transitions API with `::view-transition-old(root)` fade out 150 ms + `::view-transition-new(root)` fade in 250 ms.

For full route changes (Next.js router push): Next.js 16 native View Transitions integration. NO manual `framer-motion` page wrappers — bloats bundle, fights Next.js cache.

### 9. Reactive motion (TASK-743 density)

Operational tables ship 3 densities (`compact` / `comfortable` / `expanded`). Density changes are **instant** (no transition) — the user expects immediate effect on click. Animating density change is a UX anti-pattern (slows the feedback).

### 10. Charts — entrance ≤400 ms, no excessive choreography

ECharts (canonical chart lib per CLAUDE.md) ships rich entrance animations by default. Cap to `animationDuration: 400`. Disable on `prefers-reduced-motion`.

## Compose with (Greenhouse skills)

- `greenhouse-microinteractions-auditor` — audits implementations.
- `a11y-architect-greenhouse-overlay` — reduced motion contract.
- `web-perf-design-greenhouse-overlay` — INP budgets when motion is JS-driven.
- `dataviz-design-greenhouse-overlay` — chart-specific motion tokens.

## Version

- **v1.0** — 2026-05-11 — Initial overlay. Pins 10 Greenhouse-specific motion decisions.
