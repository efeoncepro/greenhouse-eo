# Greenhouse UI Motion & Microinteraction Contracts

## Purpose

This folder stores implementation-ready motion and microinteraction contracts for
Greenhouse UI work. A motion contract complements wireframes and flow contracts:
the wireframe defines what appears, the flow contract defines how the user moves,
and the motion contract defines how the interface responds over time.

Use this layer when motion, feedback, loading, selection, validation or
transition behavior is material to the user experience.

## When To Create One

Create a motion contract before JSX when a UI has any of these traits:

- `UI impact: motion`;
- a new or changed primitive with interactive states;
- sidecar, drawer, modal or popover transitions beyond primitive defaults;
- selected-card/list-row feedback that changes meaning or context;
- pending/success/error feedback that affects user trust;
- animated counters, charts, empty states or skeleton choreography;
- explicit use of `Motion`, Framer layout, CSS animation/transition, GSAP or Lottie;
- a GVC scenario must prove a microinteraction sequence.

## Naming

Use one Markdown file per task motion system:

```text
docs/ui/motion/TASK-####-short-slug-motion.md
```

Then link it from the owning task:

```md
- Motion: `docs/ui/motion/TASK-####-short-slug-motion.md`
```

For UI tasks with `UI impact: motion`, `pnpm task:lint --changed` and
`pnpm ui:motion-check --task TASK-####` require that path and file. For other UI
tasks, `Motion: none` is valid unless the task text describes non-trivial
motion, animation, transitions, Framer, GSAP, Lottie or reduced-motion behavior;
then the linter warns so the agent can decide explicitly.

## Required Sections

Every motion contract should include:

1. **Meta** — owner task, related wireframe/flow and motion primitives.
2. **Motion Brief** — intent, user uncertainty reduced and non-goals.
3. **Motion Inventory** — each animated or feedback-bearing element.
4. **Microinteraction States** — idle, hover, focus, pressed, selected, pending, success, error.
5. **Transition Specs** — entry/exit, sidecar/drawer, card selection, list mutation.
6. **Primitive & Token Mapping** — `Motion`, Framer layout, CSS, GSAP escape hatch, timing/easing tokens.
7. **Reduced Motion Contract** — equivalent meaning without animation.
8. **Accessibility & Feedback** — focus, live regions, color-independent state.
9. **Performance Guardrails** — compositor-only expectations and no layout thrash.
10. **GVC/Micro Evidence** — sequence captures, frame labels and assertions.
11. **Acceptance Checklist** — binary checks for implementation.

## Relationship To Other UI Contracts

- Wireframes own composition, copy, states and visual content.
- Flow contracts own sequence, routing, focus and recovery across surfaces.
- Motion contracts own timing, responsiveness, transition semantics and feedback.
- If motion is purely the default behavior of an existing primitive and does not
  change meaning, a separate motion contract is not required; declare
  `Motion: none` and rely on the primitive contract.
