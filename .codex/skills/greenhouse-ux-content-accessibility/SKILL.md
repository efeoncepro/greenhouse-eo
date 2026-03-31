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

## Accessibility rules

- Never rely on color alone.
- Inputs need explicit labels or accessible names.
- Long forms need local field errors and, when needed, a summary.
- Dense admin tables still need understandable column names and row actions.
- Charts need textual framing when the visual alone is not enough.
- Hover-only affordances are not sufficient.

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
