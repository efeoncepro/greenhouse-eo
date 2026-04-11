# Greenhouse Microinteraction Playbook

This reference supports `greenhouse-microinteractions-auditor` (Claude skill).

Use it when you need:
- external principles for motion, feedback, validation, and accessibility
- timing guidance with specific ranges
- repo-specific component and pattern mapping
- implementation heuristics grounded in the current Greenhouse stack

## 1. External principles

### Purpose first

Every canonical design system — Apple HIG, Microsoft Fluent, IBM Carbon, Material Design, W3C/WCAG — converges on the same core rule:

A microinteraction must do one of these jobs:
- **reduce uncertainty** — the user sees that something happened
- **confirm a state change** — success, failure, completion
- **guide the next step** — orient without requiring the user to think
- **prevent or speed up recovery from error** — inline validation, undo affordance

If the motion or feedback does not improve comprehension for one of those jobs, keep the element static.

### Timing guidance

These are practical guide rails synthesized from Carbon duration tokens, Material Design duration specs, and Fluent choreography rules:

| Situation | Useful range | Source / note |
|---|---:|---|
| button / toggle micro feedback | 70–120 ms | Carbon duration tokens |
| small expansion / short movement | ~150 ms | Carbon; Material desktop |
| common UI transitions | 150–300 ms | Material desktop/mobile |
| toast entrance / system comm | ~240 ms | Carbon |
| larger expansion / stronger notice | ~400 ms | Carbon |
| desktop transitions (general) | 150–200 ms | Material: desktop should feel faster than mobile |

Material Design 3 additionally specifies that duration should scale with the travel distance of the element — larger movement needs slightly longer duration to feel natural, but desktop animations should still feel faster overall than mobile equivalents.

Fluent adds: size matters — larger elements traveling greater distances need proportionally longer durations. Small elements should animate quickly. Unnatural durations (too fast or too slow) feel jarring.

### Easing

Fluent defines four primary easing profiles:
- **ease-out** — starts fast, decelerates; use for elements entering the viewport
- **ease-in** — starts slow, accelerates; use for elements exiting
- **ease-in-out** — slow start, fast middle, slow end; most natural for within-page transitions
- **linear** — constant speed; only for continuous rotations or progress bars

Carbon and Material follow the same pattern: ease-out for enter, ease-in for exit, ease-in-out for repositioning.

### Waiting states

Fluent's wait UX guidance provides the clearest operating thresholds:

| Wait duration | Recommended feedback |
|---|---|
| < 1 second | no explicit indicator; animation may confuse |
| 1–3 seconds | spinner or skeleton with short label |
| > 3 seconds | progress bar or status message; estimated time if available |

Additional rules:
- Users should remain in the same view during waits — don't navigate them away.
- Tie feedback to the most relevant content or action area.
- Avoid multiple competing loaders for the same wait state.
- Add text or accessible naming to long waits; a spinner alone is not enough.
- Use layout-preserving loaders (skeletons) when the page structure is known.

### Reduced motion

Apple, W3C (WCAG 2.3.3 Level AAA), and Fluent all enforce the same behavior:

**Must disable when `prefers-reduced-motion: reduce` is active:**
- Decorative animations and visual flourishes
- Parallax effects
- Auto-advancing carousels
- Multi-axis, multi-speed, spinning, or vortex motion
- Depth simulation (animated blur, 3D rotation)
- Continuous looping transitions

**Must keep or replace with quieter alternative:**
- State change feedback → dissolve, fade, color shift
- Navigation context → instant swap or cross-fade
- Loading indicators → static skeleton or spinner (no bouncing/pulsing)
- Status confirmation → color + icon, no motion

Apple's evaluation criteria: if the motion conveys meaning, replace it with dissolve/fade/color-shift. If it's decorative, remove it entirely.

W3C CSS technique: use `@media (prefers-reduced-motion: reduce) { }` to disable or simplify. Alternative approach: only enable motion inside `@media (prefers-reduced-motion: no-preference) { }`.

### Inline validation

Baymard's usability research establishes these rules:

- **Never validate prematurely** — don't show errors while the user is still typing or before they leave the field
- **Validate on blur** as the safest default timing
- **Clear errors immediately** once the field becomes valid — don't wait for resubmission
- **Use positive validation sparingly** — only when it genuinely reduces doubt (e.g., username availability, password strength)
- **Keep field-level feedback close to the field** — don't rely only on a top-of-form summary for long forms
- **Add summary feedback for long or multi-section forms** where individual field errors may scroll out of view

### Hover and focus

Across all systems:
- Never hide essential actions behind hover-only reveals
- Every interactive container must support keyboard activation and visible focus
- Hover feedback reinforces affordance; it must not be the only clue that something is interactive
- Focus-visible outlines should be high-contrast and consistent across the product

### Live regions and dynamic feedback

W3C ARIA22 technique for `role="status"`:
- Has implicit `aria-live="polite"` — screen readers announce content when idle
- Has implicit `aria-atomic="true"` — the entire container is read, not just the change
- Add the role **before** the content appears; populate it dynamically
- Use for search result counts, async operation status, cart updates

`role="alert"` is for urgent, blocking information — use sparingly.

## 2. Official sources

- Apple HIG Motion: <https://developer.apple.com/design/human-interface-guidelines/motion>
- Apple Reduced Motion criteria: <https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria>
- Fluent Motion: <https://fluent2.microsoft.design/motion>
- Fluent Wait UX: <https://fluent2.microsoft.design/wait-ux>
- Carbon Motion overview: <https://carbondesignsystem.com/elements/motion/overview/>
- Carbon choreography: <https://carbondesignsystem.com/elements/motion/choreography/>
- Material Design duration/easing: <https://m1.material.io/motion/duration-easing.html>
- Material Design 3 Motion: <https://m3.material.io/styles/motion/overview>
- W3C WCAG 2.3.3 Animation from Interactions: <https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions>
- W3C prefers-reduced-motion technique: <https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html>
- W3C ARIA22 role=status: <https://www.w3.org/WAI/WCAG20/Techniques/aria/ARIA22>
- Baymard inline validation: <https://baymard.com/blog/inline-form-validation>

## 3. Greenhouse repo inventory

### Motion and reduced motion

| File | Purpose |
|---|---|
| `src/libs/FramerMotion.tsx` | Canonical re-export of framer-motion primitives (`motion`, `AnimatePresence`, `useInView`, `useSpring`, `useTransform`, `useMotionValue`) |
| `src/libs/Lottie.tsx` | Dynamic import wrapper for `lottie-react` (SSR-safe) |
| `src/hooks/useReducedMotion.ts` | OS-level `prefers-reduced-motion` hook with listener |
| `src/components/greenhouse/AnimatedCounter.tsx` | Numeric KPI spring transition; skips animation when reduced motion is on |
| `src/components/greenhouse/EmptyState.tsx` | Static icon + optional `animatedIcon` Lottie; falls back to static icon on reduced motion or error |
| `src/components/greenhouse/NexaInsightsBlock.tsx` | Staggered `AnimatePresence` list gated by `useReducedMotion` |
| `src/components/greenhouse/PeriodNavigator.tsx` | CSS pulse on "Hoy" button with `prefers-reduced-motion` media override |

### Feedback and status

| File | Purpose |
|---|---|
| `src/libs/styles/AppReactToastify.tsx` | App-wide toast container styling |
| `src/components/Providers.tsx` | Mounts global `ToastContainer` |
| `src/@core/theme/overrides/dialog.ts` | Shared dialog spacing and radius |
| `src/@core/theme/overrides/snackbar.ts` | Shared snackbar content styling |

### Exemplary patterns already in the codebase

| File | What it demonstrates |
|---|---|
| `src/views/greenhouse/admin/permission-sets/PermissionSetsTab.tsx` | Clickable cards with `role="button"`, keyboard support, hover, focus-visible |
| `src/views/agency/AgencyWorkspace.tsx` | Skeleton + empty + retry + polite live region |
| `src/views/greenhouse/agency/TalentDiscoveryView.tsx` | Filter refresh via `LinearProgress`, error `Alert`, empty state |
| `src/views/Login.tsx` | Loading button, section-level progress, severity-aware `Alert` |
| `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx` | Animated empty states in non-error scenarios |
| `src/views/greenhouse/finance/FinanceDashboardView.tsx` | Real KPI use of `AnimatedCounter` |

### Reusable MUI / Vuexy layer

- `CustomTextField`, `CustomChip`, `CustomAvatar`, `CustomIconButton`
- MUI `Alert`, `Dialog`, `Skeleton`, `LinearProgress`, `CircularProgress`
- MUI `Tooltip`, `Snackbar`, `Drawer`

## 4. Preferred implementation mapping

| Need | Preferred Greenhouse pattern |
|---|---|
| KPI number transition | `AnimatedCounter` |
| First-use / no-results empty | `EmptyState` with optional `animatedIcon` |
| Section waiting with known layout | MUI `Skeleton` |
| Localized action pending | spinner in button or MUI `CircularProgress` |
| Page/query refresh | MUI `LinearProgress` |
| Successful save / mutation | `react-toastify` toast + stable inline state if relevant |
| Destructive confirmation | MUI `Dialog` / local dialog pattern |
| Dynamic async result count | persistent `role="status"` / `aria-live="polite"` |
| Urgent blocking issue | MUI `Alert` or `role="alert"` |
| Staggered list entrance | `AnimatePresence` + `motion.div` from `@/libs/FramerMotion`, gated by `useReducedMotion` |

## 5. Audit checklist

When reviewing a Greenhouse screen, ask:

1. What uncertainty exists that the UI is not resolving?
2. Which state changes are silent (no visual or assistive feedback)?
3. Which feedback is too loud for a frequent or repeated action?
4. Is motion carrying meaning that must survive `prefers-reduced-motion`?
5. Are loaders preserving layout (skeletons) or causing layout shift?
6. Are there hover-only affordances hiding essential actions?
7. Are toasts being used for something that needs inline persistence?
8. Are form errors timed well (not premature) and cleared quickly?
9. Does the screen already have a reusable primitive for this need?
10. Are dynamic status changes announced via live regions for screen readers?

## 6. Greenhouse-specific guardrails

- Import motion from `@/libs/FramerMotion`, never directly from `framer-motion`.
- Import Lottie from `@/libs/Lottie`, never directly from `lottie-react`.
- Use `useReducedMotion` hook for any custom motion work.
- Keep error states calmer and more static than celebratory or first-use moments.
- Do not animate placeholder zeroes or fake KPI values.
- Do not add new animation libraries for portal microinteractions.
- If copy, hierarchy, or state modeling solves the problem better than motion, prefer that.
- For client-facing surfaces, keep the brand voice warm but data labels operational.
- Reuse `react-toastify` through the app-wide container; do not mount additional toast providers.
- Prefer MUI `Alert`, `LinearProgress`, `CircularProgress`, `Skeleton`, `Dialog`, and Vuexy wrappers before inventing custom feedback layers.

## 7. Differences from Codex research

Claude's independent research surfaced additional detail not present in the Codex playbook:

| Area | Claude addition |
|---|---|
| Easing profiles | Fluent's four-profile taxonomy (ease-out for enter, ease-in for exit, ease-in-out for reposition, linear only for rotations) — not covered by Codex |
| Apple reduced motion evaluation | Explicit prohibition categories: depth simulation, multi-axis motion, auto-advancing carousels, continuous loops. Codex summarized but did not enumerate. |
| Wait UX thresholds | Fluent's expanded guidance: single indicator per wait, user stays in same view, text mandatory after 3s. Codex captured the timing but not the behavioral rules. |
| ARIA role=status | Atomic semantics (`aria-atomic="true"` by default) and the requirement to add the role before content appears. Codex mentioned the role but not the implementation contract. |
| WCAG 2.3.3 scope | Level AAA distinction, clear essential-vs-decorative test, three sufficient techniques (CSS media query, JS implementation, user preferences). Codex referenced the standard but did not detail compliance paths. |
| Material Design 3 | Duration scales with travel distance; desktop should always feel faster than mobile. Codex referenced M1 but not M3. |
