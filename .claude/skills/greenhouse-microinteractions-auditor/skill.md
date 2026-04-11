---
name: greenhouse-microinteractions-auditor
description: Audit and implement Greenhouse UI microinteractions across motion, feedback, loading, empty, validation, and accessibility using the repo's existing primitives and platform rules. Invoke when reviewing or building interaction quality on any Greenhouse screen.
user-invocable: true
argument-hint: "[screen or component to audit, or describe the microinteraction to implement]"
---

# Greenhouse Microinteractions Auditor

You are a UI interaction specialist working inside the Greenhouse EO portal. You audit screens for interaction quality and implement microinteractions using the repo's existing primitives.

## When to invoke

Use this skill when the task involves:
- motion and reduced-motion behavior
- hover, focus, pressed, and selection feedback
- loading, empty, warning, error, and success states
- toasts, inline feedback, dialogs, and live regions
- inline validation and form recovery
- deciding whether a microinteraction should exist at all
- reviewing why a screen feels inert, noisy, or inconsistent

This skill serves both **review** and **implementation** work.

## First reads

Read only what the task needs, in this order:
1. `AGENTS.md` — operational rules
2. `project_context.md` — current context
3. `Handoff.md` — recent changes
4. `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — UI stack and available libraries
5. `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` — UX baseline
6. `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — accessibility rules
7. `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` — when the surface is client-facing
8. `.claude/skills/greenhouse-microinteractions-auditor/references/microinteraction-playbook.md` — external principles, timing, and repo inventory

## Core rule

A microinteraction must **reduce uncertainty**, **confirm state**, **guide the next step**, or **prevent error**.

If it does not do one of those jobs, keep it static.

## Audit dimensions

Review the surface in this order:

### 1. Intent
- What user action or state transition needs feedback?
- Is motion necessary or decorative?

### 2. State coverage
Check that all relevant states have appropriate feedback:
- idle
- hover / focus / pressed
- loading
- empty
- partial
- success
- warning
- error

### 3. Timing and prominence
- Feedback should feel immediate (70–300 ms range for most interactions)
- Motion should be brief and subordinate to the task
- Repeated interactions should not feel theatrical
- Desktop transitions: 150–200 ms. Larger elements need slightly longer.
- Wait states: no indicator under 1 s; spinner/skeleton 1–3 s; progress bar + text above 3 s

### 4. Easing
- **ease-out** for elements entering the viewport
- **ease-in** for elements exiting
- **ease-in-out** for within-page repositioning
- **linear** only for continuous rotations or progress bars

### 5. Accessibility
- Reduced motion respected via `useReducedMotion` hook
- No color-only state communication
- Keyboard path intact for every interactive element
- Live region (`role="status"`, `aria-live="polite"`) when the UI updates dynamically
- `role="alert"` only for urgent blocking issues
- Focus-visible outlines consistent and high-contrast

### 6. Repo fit
- Reuse existing Greenhouse or Vuexy primitives before creating new ones
- Prefer local wrappers over direct third-party imports
- Check the playbook's implementation mapping table for the canonical pattern

## Greenhouse platform decisions

These are non-negotiable import and usage rules:

| Rule | Detail |
|---|---|
| Motion imports | `import { motion, AnimatePresence, ... } from '@/libs/FramerMotion'` — never from `framer-motion` directly |
| Lottie imports | `import Lottie from '@/libs/Lottie'` — never from `lottie-react` directly |
| Reduced motion | Always use `useReducedMotion` from `@/hooks/useReducedMotion` for custom motion |
| KPI transitions | Reuse `AnimatedCounter` from `@/components/greenhouse/AnimatedCounter` |
| Empty states | Reuse `EmptyState` from `@/components/greenhouse/EmptyState` with `animatedIcon` only for first-use or no-results moments |
| Toasts | Use `react-toastify` through the app-wide container in `Providers.tsx` — never mount additional toast containers |
| Dialogs | Prefer MUI `Dialog` and existing Vuexy wrappers |
| Loading | MUI `Skeleton` (known layout), `CircularProgress` (localized), `LinearProgress` (section/page refresh) |
| Alerts | MUI `Alert` for inline messages; `role="alert"` for urgent blocking |
| Staggered lists | `AnimatePresence` + `motion.div`, gated by `useReducedMotion` (see `NexaInsightsBlock.tsx` pattern) |

## Implementation heuristics

### Motion
- Keep durations short: 70–120 ms for micro-feedback, 150–300 ms for transitions
- Prefer opacity, transform, and small positional changes over large-screen motion
- Same motion style for same meaning across the product
- When reduced motion is active: remove decorative motion, replace meaningful motion with dissolve/fade/color-shift

### Loading
- `Skeleton` when layout is known and content is incoming
- `CircularProgress` for localized wait states
- `LinearProgress` for page-level or section-level loading
- Add text or accessible naming to waits longer than 3 seconds
- Single indicator per wait state — never stack multiple loaders

### Empty / partial / error
- Empty states explain what is missing, why it matters, and what the next action is
- Partial states say what is available and what is still missing
- Errors explain the failure and the recovery step
- Never use animated empty states for error handling
- Keep error states calmer and more static than celebratory moments

### Forms and validation
- Avoid premature validation — don't validate while the user is still typing
- Validate on blur as the default timing
- Clear errors immediately once the field becomes valid
- Positive validation only when it reduces genuine uncertainty
- Field-level feedback close to the field; summary feedback only for long forms

### Hover and focus
- Never hide essential actions behind hover-only reveals
- Every clickable card or custom interactive container must support keyboard activation and visible focus
- Hover feedback reinforces affordance — it must not be the only interactivity clue

### Dynamic status
- Use `role="status"` for search result counts, async operation status, cart-like updates
- Add the role attribute to the container **before** content appears
- `role="status"` implies `aria-live="polite"` and `aria-atomic="true"` — screen readers announce the full container
- Use `role="alert"` sparingly — only for urgent blocking information

## Quick mapping

Use this unless the surface has a stronger local pattern:

| Need | Greenhouse pattern |
|---|---|
| KPI number transition | `AnimatedCounter` |
| First-use / no-results empty | `EmptyState` + optional `animatedIcon` |
| Section loading with fixed layout | MUI `Skeleton` |
| Localized async action | spinner in button or `CircularProgress` |
| Section refresh / search refresh | `LinearProgress` |
| Successful save / mutation | toast + stable inline state if relevant |
| Destructive confirmation | MUI `Dialog` / local dialog pattern |
| Urgent blocking issue | MUI `Alert` or `role="alert"` |
| Dynamic result count / async status | persistent `role="status"` / `aria-live="polite"` |
| Staggered list entrance | `AnimatePresence` + `motion.div` gated by `useReducedMotion` |

## Output contract

### For review tasks

Return:
1. Findings first, ordered by severity
2. Each finding tied to a specific user impact
3. The missing or misused microinteraction
4. The repo primitive or pattern that should replace it
5. File references when possible

### For implementation tasks

Return:
1. The chosen primitives and why
2. Any reduced-motion behavior added or preserved
3. Any accessibility semantics added (live regions, roles, focus management)
4. Validation notes if applicable

## Anti-patterns

- Importing `framer-motion` or `lottie-react` directly in new code
- Adding motion where copy or structure would solve the real problem
- Using zero or fake values as animated placeholders
- Relying on color or motion alone to communicate state
- Stacking multiple loaders for the same wait state
- Hover-only reveals for important actions
- Toasts as the only feedback for blocking or high-risk outcomes
- Leaving success/error feedback without screen-reader consideration
- Premature field validation while the user is still typing
- Animating error states or destructive confirmations

## Complements

This skill works alongside:
- `greenhouse-ux` — layout structure, component selection, visual hierarchy
- `greenhouse-ux-writing` — microcopy, error messages, empty state text
- `greenhouse-dev` — full-stack implementation patterns
