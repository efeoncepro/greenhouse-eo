---
name: greenhouse-ux-content-accessibility
description: Review and improve Greenhouse UI work through UX writing, accessibility, and modern interaction quality. Use when a human or another agent wants better labels, CTAs, empty states, error messages, form guidance, content hierarchy, accessibility checks, or stronger UX polish grounded in Greenhouse and modern product patterns.
---

# Greenhouse UX Content Accessibility

Use this skill when the problem is not "which card from Vuexy should I use" but:

- why the interface feels flat
- why the copy feels generic
- why the flow is hard to scan
- why the states are weak
- why the screen is not accessible enough

This skill complements:

- `greenhouse-ui-orchestrator`
- `greenhouse-vuexy-ui-expert`
- `greenhouse-portal-ui-implementer`

It should be used for:

- UX writing
- content hierarchy
- empty, loading, warning, partial, error, and success states
- form guidance and validation copy
- accessibility review and hardening
- final UX polish before or after implementation

## First reads

Read only what the task needs, in this order:

- `<repo>/AGENTS.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `<repo>/docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` when the UI is client-facing
- `<repo>/docs/architecture/ui-platform/README.md`
- `<repo>/docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- `<repo>/docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Use `GREENHOUSE_UI_ORCHESTRATION_V1.md` only if pattern selection is still unresolved.

## What this skill optimizes

### UX writing

- task-based titles
- precise CTA labels
- honest helper text
- empty states with next step
- error messages that explain cause and recovery

### Accessibility

- headings and information structure
- explicit labels and instructions
- color-independent state communication
- focus visibility and keyboard path
- chart and table readability

### Interaction quality

- first-fold clarity
- stronger hierarchy
- better progressive disclosure
- action placement near the relevant decision

## Workflow

1. Identify the user task and the dominant decision on the screen.
2. Audit the first fold:
   - what is the primary signal
   - what the user should do next
   - what feels visually equal but should not
3. Audit every state:
   - loading
   - empty
   - partial
   - warning
   - error
   - success if relevant
4. Rewrite labels, helper text, CTAs, and feedback copy.
5. Check accessibility basics before finishing.

## UX writing rules

- Prefer verb-led CTAs.
- Prefer specific nouns over vague placeholders.
- Keep subtitles to one useful idea.
- Do not use decorative optimism where the user needs operational clarity.
- If data is partial, say it.
- If the system depends on sync, imports, or overrides, do not imply real-time truth.

## Error surface microcopy rules

- Treat unavoidable error surfaces such as 404, 401, access denied, maintenance, empty launch states, and unavailable routes as brand-and-recovery moments, not throwaway generic errors.
- Use creative microcopy when it improves recall or reduces friction, but never at the expense of task clarity: every variant must still communicate what happened, likely cause, and the next safe action.
- Prefer a small set of curated variants (for example, 5) selected once on page entry. Do not rotate copy while the user is reading unless the interaction explicitly asks for rotation.
- Keep the functional recovery path stable across variants: primary CTA, secondary CTA, aria labels, and error semantics should not change randomly.
- Keep reusable variants in `src/lib/copy/*`; do not hardcode reusable 404/401/empty/error strings in JSX.
- For scan-heavy error copy, split content into short signals such as status, reason, and recovery instead of forcing a paragraph when the user needs quick orientation.

## Animation copy rules

- Animated empty states keep the same copy discipline as static ones: title, description, and CTA must stand on their own without mentioning the animation.
- Use animated empty states for first-use or no-results moments; keep error-state copy calm and static.
- When a KPI uses `AnimatedCounter`, keep any text suffix outside the counter, for example `<AnimatedCounter value={42} format='integer' /> días`.
- Null KPI values must stay as static fallback text such as `Sin datos`; do not animate placeholder zeroes.
- Reduced-motion users must receive equivalent meaning with no motion dependency; never put essential guidance only in animated affordances.

## Accessibility rules

- Never rely on color alone.
- Inputs need explicit labels or accessible names.
- Long forms need local field errors and, when needed, a summary.
- Dense admin tables still need understandable column names and row actions.
- Charts need textual framing when the visual alone is not enough.
- Hover-only affordances are not sufficient.
- When copy creates or changes visible states (`empty`, `error`, `degraded`, `success`, `loading`), ensure the wrapper can receive a semantic `data-capture` marker so GVC scenarios do not depend on translated text.

## Output contract

For review tasks, return findings first, ordered by severity, with file references when possible.

For rewrite tasks, return:

- improved copy
- reason for the change
- accessibility or usability issue addressed

For implementation tasks, also:

- update the UI code
- keep copy consistent with Greenhouse naming
- leave validation notes
