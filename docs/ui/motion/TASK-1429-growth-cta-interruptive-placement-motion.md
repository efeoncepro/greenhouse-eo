# TASK-1429 — Interruptive placement motion

## Meta

- Task: `TASK-1429`
- Scope: entrance, exit and action feedback for the single interruptive CTA placement

## Motion Brief

Motion announces a contextual surface without manufacturing urgency. It is short, interruptible and owned by the renderer; eligibility and suppression never depend on animation completion.

## Motion Principles

- Motion explains where the surface came from, confirms one activation and connects CTA → destination state.
- Motion never decides eligibility, suppression, persistence, focus or completion.
- Every transition is interruptible by Escape, navigation, kill switch, action completion and reduced-motion preference.
- The first meaningful CTA paint is not delayed to stage choreography.

## Motion Inventory

- Entrance wide: short logical-edge translation plus opacity; the endpoint is stable before focus can enter.
- Entrance compact: short bottom/safe-area translation plus opacity; never scale from the center like a modal.
- Exit: shorter reverse transition; persistence is committed before/independently from animation completion, then unmount/focus recovery.
- Density change: interruptible layout continuity using compositor-safe child transitions where possible; semantic DOM order remains fixed.
- Controls: contained hover/focus/press; press acknowledges receipt, pending disables duplicate dispatch without pulsing.
- CTA → Growth Form: preserve the shell/context, crossfade or reveal the governed form only after ready, then transfer focus.
- Form → success/error: bounded state replacement; error recovery restores the relevant control and context.
- Optional perceptual sequence: eyebrow/headline/body/action may use a very small tokenized offset only if it does not delay first paint; absent in compact/reduced-motion.
- No bounce, autoplay loop, pulse, background choreography, scroll reveal replay or animated urgency.

## Primitive and Token Mapping

- Extend the CSS motion layer established by TASK-1340.
- Use canonical duration/easing/distance tokens; no component-local raw timing or curves.
- Animate compositor-friendly properties only and keep the host layout stable.
- Never wait on `animationend` to persist dismiss/suppression, resolve action state or restore accessibility state.
- Unknown/interrupted transition resolves to the current deterministic state, not to a half-visible card.

## Reduced Motion Contract

- `prefers-reduced-motion: reduce` removes travel, density morph and stagger; uses immediate final state or minimal opacity change from the canonical token set.
- Opening, closing, focus transfer and suppression remain identical semantically.

## Accessibility and Performance

- Focus-visible never depends on motion.
- Exit completes before unmount in normal mode; reduced motion unmounts immediately after state/focus handling.
- No layout shift, page scroll jump or delayed LCP.

## GVC / Micro Evidence

- Capture wide-edge and compact-bottom entrance/open/exit, pending, CTA→form, error recovery, density change and their reduced-motion equivalents at `1440` and `390`.
- Use marker-based frames before/during/after transition; verify no scroll jump/CLS, no replay after dismissal/cap and safe interruption by kill switch/navigation.

## Design Decision Log

- Decision: extend the renderer's CSS motion contract instead of adding GSAP/framer choreography.
- Why: the placement needs predictable public-host behavior, small payload and explicit reduced-motion support.

## Delta 2026-07-18 — review Claude (modern-ui 2026)

- Mecánica de enter/exit: `@starting-style` + `transition-behavior: allow-discrete` (animar desde/
  hacia `display:none` sin JS ni `animationend`; el estado persiste independiente de la animación).
- Morph card→form: same-document **View Transition API** como enhancement progresivo (fallback
  crossfade; bypass total en reduced-motion). Nunca dependencia dura.
- Press/settle: curvas `linear()` de sensación física como token opcional, solo en `transform`.
- `greenhouse_cta_viewed` pasa a visibility-gated (IO ≥50%) — la entrada del embedded puede ligarse
  a visibilidad; `animation-timeline: view()` solo como enhancement. Corte de semántica registrado
  en TRACKING-PLAN (baseline en TASK-1427).
- Tokens: `light-dark()` para pares dark + ramps `color-mix(in oklch, …)`; nombres `--gh-cta-*`
  inmutables (contrato público con hosts).
