# Greenhouse UI Wireframes

## Purpose

This folder stores implementation-ready wireframes for approved Greenhouse UI
visuals. A wireframe here is a content and interaction contract, not a second
visual design source.

Use this layer when a Product Design asset is approved but implementation still
needs stable text, microcopy, states, accessibility labels and component slots.

## When To Create One

Create a wireframe before JSX when a UI has any of these traits:

- it is client-facing, public-facing or executive-facing;
- it has charts, report artifacts, email/PDF output or legal-safe disclosure;
- it will be reused by multiple surfaces;
- it has multiple states such as partial, empty, pending, denied or degraded;
- the visual target exists but copy is not yet ready for `src/lib/copy/*`.

## Naming

Use one Markdown file per target surface or artifact:

```text
docs/ui/wireframes/TASK-####-short-slug.md
```

Then link it from the owning task:

```md
- Wireframe: `docs/ui/wireframes/TASK-####-short-slug.md`
```

`pnpm task:lint --changed` and `pnpm ui:wireframe-check --task TASK-####`
require that path for tasks with `Execution profile: ui-ux` or `UI impact != none`.

If the UI opens a sidecar, drawer, modal, popover or connects screens/routes,
also create a flow contract under `docs/ui/flows/` and declare it in the task's
`Flow` field. The wireframe owns composition and copy; the flow contract owns
sequence, routing, focus, commands and recovery.

If the UI introduces non-trivial motion or microinteractions, also create a
motion contract under `docs/ui/motion/` and declare it in the task's `Motion`
field. The motion contract owns timing, feedback, reduced-motion behavior and
micro evidence.

If the work is not tied to a task, use:

```text
docs/ui/wireframes/<domain>-<surface>-<short-slug>.md
```

Product Design image assets stay in:

```text
docs/assets/product-design/<task-or-surface>/
```

Wireframes link to those assets; they do not duplicate them.

## Required Sections

Every wireframe should include:

1. **Meta** — owner task, status, visual source, intended consumers.
2. **Brief** — user, moment, job to be done and non-goals.
3. **Layout Skeleton** — numbered regions that map to the approved visual.
4. **Copy Ledger** — every visible string, aria label, chart label and helper.
5. **State Copy** — ready, loading, empty, partial, error and denied states.
6. **Accessibility Contract** — headings, chart alternatives and focus notes.
7. **Implementation Mapping** — copy source, primitives, variants and adapters.
8. **GVC Scenario Plan** — route, viewports, markers, assertions and scroll/focus checks.
9. **Design Decision Log** — pattern chosen, alternatives rejected and follow-up risk.
10. **Acceptance Checklist** — what must remain true in implementation.

## Copy ID Convention

Use stable dotted ids that can later become keys in `src/lib/copy/*`:

```text
<domain>.<capability>.<surface>.<section>.<slot>
```

Example:

```text
growth.aiVisibility.reportArtifact.executiveVerdict.title
```

Rules:

- Keep ids semantic, not visual-position based.
- Do not include customer names, dates or task ids in copy ids.
- Dynamic values use braces: `{organizationName}`, `{score}`, `{providerCount}`.
- Microcopy that repeats across surfaces belongs in `src/lib/copy/<domain>.ts`.
- Navigation/product nomenclature belongs in `src/config/greenhouse-nomenclature.ts`.

## UX Writing Rules

- Use the treatment `tú` for client-facing guidance.
- Data first, interpretation second.
- Never present an estimate as a guaranteed result.
- Partial data must say what is available and what is missing.
- CTAs use a verb plus object when the action could otherwise be ambiguous.
- Error copy says what happened, why it may have happened and what to do next.
- Charts must have a text alternative that carries the same decision signal.

## Product Design Handoff

A wireframe is ready for implementation only when:

- it links to the approved visual target;
- it names the primitive/reuse decision;
- it maps route/surface, component candidates, copy source, data reader/command, API parity and access/capability;
- it includes a GVC scenario plan with captures, markers, assertions and desktop/mobile expectations;
- it records the design decision log: selected pattern, rejected alternatives and why;
- every visible string has a copy id or a declared one-off reason;
- public/client-safe disclosure is explicit;
- GVC markers and state captures are listed.

Only after those checks pass should the owning task move `UI ready` from `no`
to `yes`.
