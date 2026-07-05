---
name: motion-design-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global motion-design skill defaults. Load this first whenever motion-design is invoked inside this repo. Binds the skill to the REAL Greenhouse motion system (src/components/greenhouse/motion/**), its token SoT + drift-guard, the GSAP orchestration tier, ViewTransitionLink, the docs/ui/motion governance contract, and the GVC verification loop.
type: overlay
overrides: motion-design
---

# motion-design — Greenhouse Overlay

Load global `motion-design/SKILL.md` first → read this overlay → apply rules. When the global skill and this overlay disagree, **this overlay wins**. The global skill is portable doctrine; this overlay is *what to import, from where, and how to verify it in THIS repo*.

> **Boundary (scope of this skill).** `motion-design` is **UI/interface motion**: transitions, scroll-driven, view transitions, micro-interactions, duration/easing tokens, `prefers-reduced-motion` — output is **code that runs in the browser**. For **cinematic / broadcast video production** (brand film, spot, explainer, title sequence, motion graphics, logo animation, AI video — output is a **rendered video file**), use `motion-design-studio` instead.

> **⚠️ Anti-drift primer.** The repo already has a **complete, governed motion system**. Do NOT hand-roll `cubic-bezier(…)`, raw `250ms`, MUI `<Fade>` with ad-hoc timings, or a direct `import { gsap }` in a view. Everything below routes you to the canonical primitive. If you write a magic number for motion, you are doing it wrong — there is a token for it.

---

## 0. The real motion system — where everything lives

Single import barrel: **`@/components/greenhouse/motion`** (`src/components/greenhouse/motion/index.ts`).

| You need… | Import / file | Notes |
|---|---|---|
| Duration/easing **values** (SoT) | `MOTION_DURATION_MS`, `MOTION_DURATION_S`, `MOTION_EASE`, `motionCss`, `motionGsap`, `cssCubicBezier` from `@/components/greenhouse/motion` | Portable SoT: `motion/core/tokens.ts`. DS binding mirror: `src/components/theme/motion-tokens.ts` (like `typography-tokens.ts`). |
| A **declarative** entrance / stagger / scroll-reveal / timeline | `<Motion kind='…' \| variant='…'>` from `@/components/greenhouse/motion` | The cinematic/orchestration primitive. GSAP under the hood. |
| An **imperative** GSAP escape hatch | `useGreenhouseGSAP(build, { scope, dependencies })` | The ONLY sanctioned way product code touches GSAP. Reduced-motion baked in via `gsap.matchMedia`. |
| **Same-document route** transition | `ViewTransitionLink` from `@/components/greenhouse/motion` (drop-in `next/link`) | Wraps `document.startViewTransition`. TASK-525. |
| The raw VT helper (non-link swaps) | `startViewTransition`, `supportsViewTransitions` from `@/lib/motion/view-transition` | Falls back to synchronous update when unsupported. |
| **Reduced-motion** (React state, live) | `useReducedMotion` from `@/hooks/useReducedMotion` | Use in components choosing a CSS class / conditional render. |
| **Reduced-motion** (sync read / conditions) | `prefersReducedMotion()`, `MOTION_MEDIA_CONDITIONS` from `@/components/greenhouse/motion` | Non-GSAP code paths + matchMedia strings. GSAP paths get `reduced` for free from `useGreenhouseGSAP`. |
| **Composition Shell** region reveal / layout morph | `compositionRegionReveal`, `compositionInterruptibleLayoutTransition`, `COMPOSITION_STAGGER_STEP_S` from `…/primitives/composition-shell/composition-shell-motion` | Don't reinvent the shell's morph. |
| **Adaptive Card / density** transitions | `cardDensityLayoutTransition`, `cardDensityRevealTransition`, `cardAssembleTransition`, `CardEntrance` from `…/primitives/card-density/card-density-motion` | Density change itself is instant — see §7. |
| **Nexa "thinking" beat** | `GreenhouseThinkingBeat` (`…/primitives/GreenhouseThinkingBeat`) | AI/streaming state — see §8. |

**Variants** (functional modes, `variants.ts`): `entrance` · `stagger` · `scrollReveal` · `timeline`.
**Kinds** (semantic → variant, `kinds.ts`): `heroIntro` · `listMount` · `sectionReveal` · `kpiCountUp` · `panelEnter` · `cardReveal`. Add a domain kind in `kinds.ts` — **never branch on a raw kind string in a surface** (Primitive + Variants + Kinds contract).

```tsx
// Canonical usage — the 90% cases
<Motion kind='panelEnter'>{panel}</Motion>
<Motion kind='listMount'>{rows}</Motion>            // stagger
<Motion kind='sectionReveal'>{section}</Motion>     // scroll-triggered
<Motion variant='timeline' build={(ctx, tl) => tl.from('.eyebrow', { y: 12 }).from('.headline', { y: 12 }, '<0.08')}>
  {hero}
</Motion>
```

---

## 1. Tokens — import them, never type them

Duration scale (ms, fixed by DS governance): **75 / 150 / 200 / 300 / 400 / 600** → `instant / short / standard / medium / long / extended`.
Easing set: **`emphasized`** `cubic-bezier(0.2,0,0,1)` (default) · **`standard`** `cubic-bezier(0.4,0,0.2,1)` · **`emphasizedAccelerate`** `cubic-bezier(0.3,0,0.8,0.15)` (exits) · **`linear`** (loaders).

- **CSS / `sx`:** consume `motionCss.duration.medium` + `motionCss.ease.emphasized`, or the CSS custom properties emitted in `src/app/globals.css`.
- **GSAP:** `<Motion>` / `useGreenhouseGSAP` resolve `motionGsap` (seconds + registered `CustomEase` ids `gh-emphasized` etc.) for you — you rarely touch these directly.
- **Seconds + CSS strings are DERIVED** from the ms SoT, never declared in parallel → cannot drift.

**Anti-patterns (all lint/GVC-detectable):** `transition: 0.3s` · `250ms`/`350ms`/`500ms` (off-scale) · `transition: all` · `ease-in-out` as default · any inline `cubic-bezier(...)` that isn't sourced from `MOTION_EASE`.

---

## 2. Library tiers — the REAL stack (this corrects the old overlay)

Reach for the lowest tier that solves the problem.

1. **CSS transitions (theme)** — hover, focus, active, color, small state toggles. 90% of motion. Tokens via `motionCss` / CSS vars. Zero JS.
2. **`<Motion>` / `useGreenhouseGSAP` (GSAP)** — the **canonical orchestration tier**: entrances, staggered list/grid mounts, scroll reveals, KPI count-ups, choreographed hero timelines. **GSAP is the sanctioned engine here** (16+ callsites), gated by lint `greenhouse/no-direct-gsap-in-views` — **only `motion/**` may import `gsap`; views consume the primitive.**
3. **`ViewTransitionLink` / `startViewTransition`** — same-document route/state swaps, shared-element morphs via `view-transition-name`.
4. **Pattern primitives** — `composition-shell-motion` + `card-density-motion` for shell/card motion (already token-bound + reduced-motion-aware).
5. **Vector runtimes (Lottie/Rive)** — set pieces only (onboarding hero, empty-state art). Never UI chrome.

> **Correction vs the pre-2026-07 overlay:** the old text said *"MUI transitions first, framer-motion for orchestration, NEVER GSAP for product UI."* That is **wrong for this repo.** The orchestration tier **is GSAP** via the governed primitive. `framer-motion` is effectively legacy here (≈1 callsite). MUI `<Fade>/<Slide>/<Grow>/<Collapse>/<Zoom>` are fine for trivial mount/unmount **only when fed token durations/easing** — but for anything staged, prefer `<Motion>`.

---

## 3. Honest degradation is built in — don't fight it

The `<Motion>` variant builders use `gsap.fromTo(hidden → visible)` with `clearProps: 'opacity,visibility,transform'` + `overwrite: 'auto'`. Consequences you must respect:

- If JS never runs, content stays in its **natural (visible) CSS state** — never author a component that is `opacity:0` by default waiting for JS. The animation reveals *from* hidden and clears itself on complete.
- An interrupted entrance can never orphan an element at `visibility:hidden` (the classic `gsap.from` + re-render hazard is already closed).
- **NUNCA** ship a surface whose resting/no-JS state is invisible. Reduced-motion for `scrollReveal` = element already visible, do nothing.

---

## 4. View transitions — `ViewTransitionLink`, not a framework component

For internal nav that should morph: swap `next/link` → `ViewTransitionLink` (preserves prefetch, hover, ref forwarding; skips modifier/middle clicks). For non-link DOM swaps (tab content, drawer-driven detail): wrap the state mutation in `startViewTransition(() => setState(...))`. Cross-fade is the default; directional slide only when forward/back semantics are unambiguous (wizard steps). Style via `::view-transition-old(root)` / `::view-transition-new(root)` with token durations.

> The old overlay claimed "Next.js 16 native `<ViewTransition>` in layout.tsx." The real, shipped mechanism is `ViewTransitionLink` + the `@/lib/motion/view-transition` helper. Use those.

---

## 5. Reduced-motion contract — non-negotiable, and mostly automatic

- GSAP paths (`<Motion>`, `useGreenhouseGSAP`): reduced-motion is **baked in** via `gsap.matchMedia` — the build callback receives `reduced`; branch to snap/cross-fade. It auto-reverts when the query stops matching.
- CSS / conditional-render paths: gate with `useReducedMotion()` (live React hook) or `prefersReducedMotion()` (sync).
- 4-state contract: **Disable** (parallax, autoplay, decorative scroll motion, large translates, hero entrances) · **Reduce** (hover snap 0–50 ms) · **Keep** (spinners, focus rings, state-conveying toggles) · **Replace** (slide → cross-fade).
- **Test every motion change** with OS Reduce Motion ON (macOS: Accessibility → Display → Reduce Motion) AND capture it under GVC (§10).

---

## 6. Compositor-only — `transform` + `opacity` (+ `filter`/`clip-path`)

NEVER animate `width`, `height`, `top`, `left`, `margin`, `padding` (layout thrash → INP). For "0 → auto height": `grid-template-rows: 0fr → 1fr` or capped `max-height`. Remove `will-change` after the animation.

---

## 7. The 7 canonical Greenhouse motion patterns

1. **Tap ack** — scale `0.98`, 75 ms (`instant`). MUI handles most; verify on `CustomIconButton`.
2. **Hover lift** — `translateY(-2px)` + shadow grow, 150 ms (`short`), desktop only, disabled on touch.
3. **Focus ring** — instant on `:focus-visible`, no fade-in.
4. **Modal enter** — backdrop fade 200 ms; modal scale `0.96 → 1` + opacity `0 → 1`, 300 ms (`medium`) `emphasized`. Exit 200 ms `emphasizedAccelerate`. Esc + backdrop close (a11y).
5. **Drawer slide** — from anchor edge, 300 ms `emphasized`. Exit 200 ms accel.
6. **Toast/snackbar** — slide up + fade, 200 ms `emphasized`. 4–6 s info / indefinite for error.
7. **Skeleton shimmer** — linear-gradient sweep, 1.5 s linear infinite; **stops** on reduced-motion; skeleton sized to final content (no CLS).

**Density change is INSTANT** (TASK-743): `compact/comfortable/expanded` toggles apply with no transition — animating the density change slows the feedback and is an anti-pattern. Reveal *content* with `cardDensityRevealTransition`, but the density switch itself is immediate.

Enforced/audited by **`greenhouse-microinteractions-auditor`**.

---

## 8. Motion for AI / streaming / Nexa (the signature moments)

Greenhouse's conversational experience has motion the global skill doesn't cover — these are first-class here:

- **Thinking beat** — use `GreenhouseThinkingBeat` for Nexa "processing" states (token-bound, reduced-motion aware, navy Nexa palette). Do NOT hand-roll a three-dot loader.
- **In-place transformation (TASK-1110)** — when the user asks Nexa about a surface, the **existing UI transforms in place** rather than navigating away (see `project_conversational_experience_vision_task1110`). Motion job = *continuity*: cross-fade/morph the current card into the answer surface (`NexaKnowledgeAnswerSurface`), never a hard route jump.
- **Streaming reveal** — token/answer text appears progressively; pair with a shimmer→content cross-fade (150 ms), not a spinner-then-dump.
- **Nexa CTAs** are brand motion too: the Shiny Button (`GreenhouseShinyBorder asButton palette='nexa'` + `GreenhouseNexaBrandMark`) — the navy comes from `palette='nexa'`, never hardcoded (see CLAUDE.md "Botones de Nexa").

---

## 9. Charts — ECharts entrance ≤400 ms

ECharts (canonical per CLAUDE.md) → cap `animationDuration: 400`, `animationEasing` mapped to `emphasized`, disable on reduced-motion. No per-series cascade beyond one stagger pass.

---

## 10. Verification is a LOOP, not a claim — GVC + governance

Motion is exactly what you must *watch*, not describe. Before declaring any motion work done:

1. **Capture it:** `pnpm fe:capture:micro <scenario>` (microinteraction-tuned) or `pnpm fe:capture --route=/path --env=staging --hold=3000`. Before/after: `pnpm fe:capture:diff <prev> <curr>`. Review dossier: `pnpm fe:capture:review`.
2. **Look at the frames** (desktop + mobile) — is the easing right, the duration on-scale, the reduced-motion path correct? Adjust → re-capture until enterprise. Never ship motion you haven't watched.
3. **Governance contract (`docs/ui/motion/`)**: if a task's `UI impact: motion` (or it introduces non-trivial motion/microinteractions), declare `Motion: docs/ui/motion/TASK-###-short-slug-motion.md` pointing to a **real, robust** doc (use `docs/ui/motion/MOTION_TEMPLATE.md`; never a stub to pass the gate). Validate with `pnpm ui:motion-check --task TASK-###` + `pnpm task:lint --task TASK-###`.
4. **Token parity (3 layers) + drift-guard:** any new/changed token → update `DESIGN.md §Motion` (line ~543) + `GREENHOUSE_DESIGN_TOKENS_V1.md §Motion` + the SoT `motion/core/tokens.ts`; the drift-guard `motion/core/tokens.test.ts` pins the scale. Extend the scale **only** via design-system governance.

---

## 11. Enforcement inventory (what CI/lint already blocks)

- `greenhouse/no-direct-gsap-in-views` — `import { gsap }` outside `motion/**` is an error. Consume `<Motion>` / `useGreenhouseGSAP`.
- `motion/core/tokens.test.ts` — drift-guard on the duration/easing scale.
- `pnpm ui:motion-check` / `pnpm task:lint` — the `docs/ui/motion/` Motion-doc contract.
- `greenhouse-microinteractions-auditor` — audits the 7 patterns + reduced-motion.
- GVC triple-gate — visual proof before production.

---

## 12. Hard NUNCA (repo-bound anti-regression)

- **NUNCA** `import { gsap }` (or a plugin) directly in a view/component outside `src/components/greenhouse/motion/**`. Lint blocks it; use the primitive.
- **NUNCA** type a raw duration (`250ms`, `0.3s`) or a raw `cubic-bezier(...)` for motion. Import from `MOTION_DURATION_*` / `MOTION_EASE` / `motionCss` / `motionGsap`.
- **NUNCA** author a component whose resting/no-JS state is invisible (`opacity:0` waiting for JS). Honest degradation requires the natural state to be visible.
- **NUNCA** animate `width/height/top/left/margin/padding`. Compositor-only.
- **NUNCA** reintroduce `framer-motion` page wrappers or a parallel motion engine — the orchestration tier is the GSAP primitive; VT is `ViewTransitionLink`.
- **NUNCA** animate a density change (TASK-743) — it's instant.
- **NUNCA** ship a Nexa/AI state with a generic spinner when `GreenhouseThinkingBeat` / streaming-reveal is the pattern; **NUNCA** hardcode the Nexa navy.
- **NUNCA** declare a `Motion:` doc as a stub to pass `ui:motion-check` — robust or nothing (repo rule: "Docs UI robustos, no para el lint").
- **NUNCA** say "motion done" without a GVC capture you actually looked at (desktop + mobile + reduced-motion).
- **SIEMPRE** branch on `reduced` (GSAP) or `useReducedMotion()`/`prefersReducedMotion()` (CSS) for every animation.
- **SIEMPRE** add a new semantic case as a `kind` in `kinds.ts`, never a raw-string branch in a surface.

## Compose with (Greenhouse skills)

- `greenhouse-microinteractions-auditor` — audits implementations.
- `a11y-architect` (+ overlay) — reduced-motion contract.
- `web-perf-design` — INP/CLS budgets for JS-driven motion.
- `dataviz-design` (+ overlay) — chart motion tokens.
- `greenhouse-nexa-conversational` — for the conversational-experience motion (§8).
- `greenhouse-gvc-playwright` — the capture loop (§10).

## Version

- **v2.0** — 2026-07-05 — **Rebind to the real motion system.** Replaced the aspirational "MUI-first / framer-motion / NEVER GSAP" library section with the actual governed stack (`@/components/greenhouse/motion`: `<Motion>`/`useGreenhouseGSAP` GSAP tier + `ViewTransitionLink`), the token SoT + 3-layer parity + drift-guard, the `no-direct-gsap-in-views` lint gate, pattern primitives (composition-shell / card-density), the `docs/ui/motion` governance contract, the GVC verification loop, and AI/Nexa motion (thinking beat, TASK-1110 in-place transform, streaming reveal).
- **v1.0** — 2026-05-11 — Initial overlay (10 pinned decisions; now superseded by the repo-bound v2.0).
