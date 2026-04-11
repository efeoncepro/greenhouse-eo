---
name: greenhouse-microinteractions-auditor
description: Audit and improve Greenhouse UI microinteractions across motion, feedback, loading, empty, validation, and accessibility using the repo's existing primitives and platform rules.
---

# Greenhouse Microinteractions Auditor

Use this skill when the task is about the feel and responsiveness of a Greenhouse interface, especially:
- motion and reduced-motion behavior
- hover, focus, pressed, and selection feedback
- loading, empty, warning, error, and success states
- toasts, inline feedback, dialogs, and live regions
- inline validation and form recovery
- choosing whether a microinteraction should exist at all

This skill is for both review and implementation work. It should help answer:
- why a screen feels inert, noisy, or inconsistent
- which microinteractions are missing
- which existing repo primitives should be reused
- what should stay static for clarity or accessibility

It complements:
- `greenhouse-agent`
- `greenhouse-ui-orchestrator`
- `greenhouse-ux-content-accessibility`

## First reads

Read only what the task needs, in this order:
- `<repo>/AGENTS.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `<repo>/docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `<repo>/docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `<repo>/docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`
- `<repo>/docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` when the surface is client-facing
- `<repo>/docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` when pattern choice is still unresolved
- `<skill>/references/microinteraction-playbook.md` for the external principles and repo inventory

## Core rule

A microinteraction must reduce uncertainty, confirm state, guide the next step, or prevent error.

If it does not do one of those jobs, keep it static.

## Audit dimensions

Review the surface in this order:

1. **Intent**
   - what user action or state transition needs feedback
   - whether motion is necessary or decorative

2. **State coverage**
   - idle
   - hover / focus / pressed
   - loading
   - empty
   - partial
   - success
   - warning
   - error

3. **Timing and prominence**
   - feedback should feel immediate
   - motion should be brief and subordinate to the task
   - repeated interactions should not feel theatrical

4. **Accessibility**
   - reduced motion respected
   - no color-only state communication
   - keyboard path intact
   - live region or alert semantics when the UI changes dynamically

5. **Repo fit**
   - reuse existing Greenhouse or Vuexy primitives before creating new ones
   - prefer local wrappers over direct third-party imports

## Greenhouse platform decisions

- Import motion primitives from `@/libs/FramerMotion`, not directly from `framer-motion`.
- Import Lottie from `@/libs/Lottie`, not directly from `lottie-react`.
- Use `useReducedMotion` for any custom motion.
- Reuse `AnimatedCounter` for KPI value transitions.
- Reuse `EmptyState` with `animatedIcon` only for first-use or no-results moments where calm motion helps orientation.
- Keep error states and destructive confirmations visually stable.
- Reuse `react-toastify` through the app-wide container already mounted in Providers.
- Prefer MUI `Alert`, `LinearProgress`, `CircularProgress`, `Skeleton`, `Dialog`, and Vuexy wrappers before inventing a custom feedback layer.

## Implementation heuristics

### Motion
- Keep microinteraction durations short.
- Prefer opacity, transform, and small positional changes over large-screen motion.
- Use the same motion style for the same meaning across the product.
- When reduced motion is requested, remove decorative motion and replace meaningful motion with a quieter alternative.

### Loading
- Use `Skeleton` when layout is known and content is incoming.
- Use `CircularProgress` for localized wait states.
- Use `LinearProgress` for page-level or section-level loading when it helps orientation.
- Add text or accessible naming to long waits; do not rely on a spinner alone for meaning.

### Empty / partial / error
- Empty states should explain what is missing, why it matters, and what the next action is.
- Partial states should say what is available and what is still missing.
- Errors should explain the failure and the next recovery step.
- Do not use animated empty states for error handling just because animation is available.

### Forms and validation
- Avoid premature validation.
- Clear errors as soon as the field becomes valid.
- Use positive validation only when it reduces uncertainty, not as confetti.
- Keep field-level feedback close to the field and add summary feedback only when the form is long or blocking.

### Hover and focus
- Do not hide essential actions only on hover.
- Every clickable card or custom interactive container must support keyboard activation and visible focus.
- Hover feedback should reinforce affordance, not be the only clue that something is interactive.

## Output contract

### For review tasks

Return:
- findings first, ordered by severity
- each finding tied to a user impact
- the missing or misused microinteraction
- the repo primitive or pattern that should replace it
- file references when possible

### For implementation tasks

Return:
- the chosen primitives and why
- any reduced-motion behavior added
- any accessibility semantics added
- validation notes

## Anti-patterns

- importing animation libraries directly in new code
- adding motion where copy or structure would solve the real problem
- using zero or fake values as animated placeholders
- relying on color or motion alone to communicate a state
- stacking multiple loaders for the same wait state
- hover-only reveals for important actions
- leaving success/error feedback without screen-reader consideration when the state changes dynamically

## Fast mapping

Use this quick mapping unless the surface has a stronger local pattern:

- KPI number transition -> `AnimatedCounter`
- first-use / no-results empty -> `EmptyState` with optional `animatedIcon`
- section loading with fixed layout -> `Skeleton`
- localized async action -> button spinner or `CircularProgress`
- section refresh / search refresh -> `LinearProgress`
- successful save / mutation -> toast + stable inline state if relevant
- urgent blocking issue -> `Alert` or dialog, not toast-only
- dynamic result count / async status -> persistent live region or `role="status"`

