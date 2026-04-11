# Greenhouse Microinteraction Playbook

This reference supports `greenhouse-microinteractions-auditor`.

Use it when you need:
- external principles for motion, feedback, validation, and accessibility
- timing guidance
- repo-specific component mapping
- implementation heuristics grounded in the current Greenhouse stack

## 1. External principles

### Purpose first

Across Apple, Fluent, Carbon, Material, W3C, and Baymard, the recurring rule is:

- use microinteractions to reduce uncertainty
- confirm a state change
- guide the next step
- prevent or speed up recovery from error

If the motion or feedback does not help comprehension, remove it.

### Timing guidance

These are practical guide rails, not hard laws:

| Situation | Useful range | Source / note |
|---|---:|---|
| button / toggle microinteraction | 70-120ms | Carbon duration tokens; Carbon checklist |
| small expansion / short movement | ~150ms | Carbon |
| common UI transitions | 150-300ms | Material desktop/mobile guidance |
| toast / system communication | ~240ms | Carbon |
| larger expansion / stronger system notice | ~400ms | Carbon |

Material also states that desktop transitions should usually be faster than mobile, commonly around 150-200ms, while larger-screen and mobile motions may run longer depending on distance traveled.

### Waiting states

Fluent's wait guidance is a good operating rule:

- under about 1 second: often no explicit indicator needed
- around 1 to 3 seconds: spinner or skeleton
- above 3 seconds: stronger progress communication or explicit text

Use layout-preserving loaders when possible so the page does not jump.

### Reduced motion

W3C and Apple both reinforce the same behavior:

- disable or suppress non-essential motion when reduced motion is requested
- keep meaningful transitions understandable with quieter alternatives such as dissolve, highlight fade, or color shift
- avoid parallax, spinning, multi-axis motion, or large-screen movement for reduced-motion users

### Inline validation

Baymard's core implementation rules:

- avoid premature validation
- remove error messages as soon as the field is corrected
- use positive inline validation when it reduces doubt

Validation should help recovery while the user still remembers the field context.

## 2. Official sources

- Apple Reduced Motion evaluation criteria: <https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria>
- Apple HIG Motion: <https://developer.apple.com/design/human-interface-guidelines/motion>
- Fluent Motion: <https://fluent2.microsoft.design/motion>
- Fluent Wait UX: <https://fluent2.microsoft.design/wait-ux>
- Carbon Motion overview: <https://carbondesignsystem.com/elements/motion/overview/>
- Carbon choreography: <https://carbondesignsystem.com/elements/motion/choreography/>
- Material duration and easing: <https://m1.material.io/motion/duration-easing.html>
- W3C Animation from Interactions: <https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions>
- W3C prefers-reduced-motion technique: <https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html>
- W3C role=status technique: <https://www.w3.org/WAI/WCAG20/Techniques/aria/ARIA22>
- Baymard inline validation: <https://baymard.com/blog/inline-form-validation>

## 3. Greenhouse repo inventory

### Motion and reduced motion

- `src/libs/FramerMotion.tsx`
  - canonical motion wrapper
- `src/libs/Lottie.tsx`
  - canonical Lottie wrapper
- `src/hooks/useReducedMotion.ts`
  - OS-level reduced-motion hook
- `src/components/greenhouse/AnimatedCounter.tsx`
  - numeric KPI transition
- `src/components/greenhouse/EmptyState.tsx`
  - static icon + optional `animatedIcon` with reduced-motion fallback
- `src/components/greenhouse/NexaInsightsBlock.tsx`
  - staggered list animation gated by reduced motion
- `src/components/greenhouse/PeriodNavigator.tsx`
  - CSS pulse with `prefers-reduced-motion` override

### Feedback and status

- `src/libs/styles/AppReactToastify.tsx`
  - app-wide toast container styling
- `src/components/Providers.tsx`
  - mounts the global toast container
- `src/@core/theme/overrides/dialog.ts`
  - shared dialog spacing and radius
- `src/@core/theme/overrides/snackbar.ts`
  - shared snackbar content styling

### Existing good patterns

- `src/views/greenhouse/admin/permission-sets/PermissionSetsTab.tsx`
  - clickable cards with `role="button"`, keyboard support, hover, and focus-visible
- `src/views/agency/AgencyWorkspace.tsx`
  - skeleton + empty + retry + polite live region
- `src/views/greenhouse/agency/TalentDiscoveryView.tsx`
  - filter refresh via `LinearProgress`, error `Alert`, empty state
- `src/views/Login.tsx`
  - loading button, section-level progress, severity-aware `Alert`
- `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
  - animated empty states used in a non-error scenario
- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
  - real KPI use of `AnimatedCounter`

### Reusable MUI / Vuexy layer

- `CustomTextField`
- `CustomChip`
- `CustomAvatar`
- `CustomIconButton`
- MUI `Alert`, `Dialog`, `Skeleton`, `LinearProgress`, `CircularProgress`

## 4. Preferred implementation mapping

| Need | Preferred pattern |
|---|---|
| KPI value transition | `AnimatedCounter` |
| first-use or no-results empty state | `EmptyState`, optionally `animatedIcon` |
| full section waiting with known layout | `Skeleton` |
| localized action pending | spinner in button or `CircularProgress` |
| page or query refresh | `LinearProgress` |
| save success | toast, optionally paired with inline confirmation |
| destructive confirmation | MUI `Dialog` / local dialog pattern |
| dynamic async status | persistent `role="status"` / `aria-live="polite"` |
| urgent blocking problem | `Alert` or `role="alert"` |

## 5. Audit checklist

When reviewing a screen, ask:

1. What uncertainty exists here that the UI is not resolving?
2. Which state changes are silent?
3. Which feedback is too loud for a frequent action?
4. Is motion carrying meaning that should still exist without motion?
5. Are loaders preserving layout?
6. Are there hover-only affordances?
7. Are toasts being used for something that actually needs inline persistence?
8. Are form errors timed well and cleared quickly enough?
9. Does the screen already have a reusable primitive for this?

## 6. Greenhouse-specific guardrails

- Keep error handling calmer and more static than celebratory or first-use moments.
- Do not animate placeholder zeroes or fake KPI values.
- Do not recommend new animation libraries for portal microinteractions.
- If copy, hierarchy, or state modeling solves the issue better than motion, prefer that.
- For client-facing surfaces, keep the brand voice warm but the data labels operational.

