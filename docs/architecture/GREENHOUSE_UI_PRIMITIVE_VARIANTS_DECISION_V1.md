# Greenhouse UI Primitive Variants Decision V1

> **Status:** Accepted
> **Accepted:** 2026-06-06
> **Scope:** UI platform / Product Design / Agent methodology / Greenhouse primitives
> **Owner:** Platform UI + Product Design Agents

## Context

Greenhouse agents were repeatedly improving contextual UI surfaces by creating one-off visual treatments: drawers, cards, inspectors, assistant panels and forms. The Adaptive Sidecar work showed a better method: build one stable primitive, then expose a small set of official functional variants and allow domain-specific kinds to map into those variants.

This decision generalizes that method beyond Adaptive Sidecar.

## Decision

Greenhouse adopts **Primitive + Variants + Kinds** as the canonical product UI development method for reusable interface patterns.

- **Primitive**: the stable implementation contract. It owns layout, accessibility, responsive behavior, motion, shell integration, state plumbing and verification hooks.
- **Variant**: an official functional mode of the primitive. Variants change behavior, density, state model, action placement and microinteraction contract. Variants are not skins.
- **Kind**: the semantic consumer use case. Kinds may be domain/product labels such as `contractReview`, `paymentInspector`, `assistant`, `preview`, or legacy aliases such as `form`. Kinds must resolve to an official variant before styling/behavior decisions are made.

The canonical API shape is:

```tsx
<Primitive variant='inspector' kind='contractReview' />
```

or, when the primitive owns kind resolution:

```tsx
<ContextualSidecar variant='composer' kind='form' />
```

## Canonical Method

When agents design or implement a reusable UI surface:

1. Identify the **job to be done**, not the visual container.
2. Check whether an existing primitive already covers the interaction.
3. If the pattern recurs or is platform-level, create or extend a primitive.
4. Define a small set of official variants, each with a distinct functional contract. Prefer 3-5; allow 6 only when an ADR/runtime primitive proves the jobs are materially different.
5. Map domain-specific kinds into those variants.
6. Document the state model, action model, responsive model, accessibility model and verification evidence per variant.
7. Validate with GVC for each official variant before declaring the primitive enterprise-ready.

## Variant Rules

Variants must be functional:

- They can change footer action model, dirty-state behavior, density, reading order, state coverage, accessibility semantics and microinteraction timing.
- They should not merely change color, radius, shadow, icon or label.
- They should share primitive-level shell behavior, focus rules, reduced-motion handling and responsive fallback.
- They should preserve Full API parity: a UI variant must not become the only execution path for business logic.

Kinds are semantic:

- A kind may be domain-specific or workflow-specific.
- A kind may have copy, telemetry source, icon, badge, or content affordances.
- A kind must not bypass the official variant behavior.
- Legacy or narrower kind names may remain as aliases if they resolve to an official variant.

## Adaptive Sidecar Application

Adaptive Sidecar V1 establishes six official variants. The first three cover the original contextual jobs; the next three are accepted because Greenhouse needs enterprise-grade operational sidecars for reconciliation, provenance/evidence, and guided runbook execution without creating parallel drawers.

| Variant | Primary job | Typical kinds | Action model |
| --- | --- | --- | --- |
| `inspector` | Read, diagnose and decide without losing the queue/context | `inspector`, `review`, `preview`, domain entity detail kinds | One primary contextual action plus secondary inspect/escalate actions |
| `composer` | Create or edit contextual data without abandoning the workbench | `composer`, `form`, edit/create kinds | Dirty-state guard, save/discard/cancel, validation feedback |
| `assistant` | Explain, summarize and suggest using current context | `assistant`, `nexa`, AI copilots | Advisory-only suggestions with evidence/context chips; never the only execution path |
| `reconciler` | Compare sources, expose drift and resolve differences with audit trail | offer-vs-contract, bank/accounting, identity/data drift kinds | One correction/apply action plus exception/escalation path; no silent auto-merge |
| `evidence` | Inspect provenance, confidence and source freshness before accepting evidence | uploads, onboarding evidence, finance reconciliation evidence, audit packets | Accept/copy/link evidence with traceability and honest incomplete-source states |
| `runbook` | Guide an operator through reversible, checkpointed execution | release/preflight, recovery, operational remediation kinds | Step gating, rollback/pause affordance, checkpoint status and execution guardrails |

`ContextualSidecar` may expose both:

```tsx
variant='inspector' | 'composer' | 'assistant' | 'reconciler' | 'evidence' | 'runbook'
kind={domainSpecificKind}
```

When `variant` is omitted, `ContextualSidecar` resolves a safe default from `kind`.

## Accessibility

- The primitive owns role, focus, keyboard and reduced-motion behavior.
- A variant may add ARIA labels, live regions or status semantics only when the state model requires it.
- Color or motion must never be the only signal that a variant changed.
- Variant switches in mockups must be keyboard reachable and named.

## Verification

For every official variant, capture:

- desktop open state;
- mobile/tablet fallback when applicable;
- close/reopen behavior;
- dirty-state or advisory-state behavior when applicable;
- one keyboard/focus frame or assertion;
- a GVC frame that proves the variant is not just a visual skin.

## Anti-Patterns

- Creating `FooDrawer`, `FooSidePanel`, `FooInspector`, and `FooAssistant` as separate components when one primitive plus variants can cover them.
- Adding a `variant` prop that only changes colors.
- Encoding business workflow as visual variant.
- Letting `kind` drive layout directly without resolving into a documented variant.
- Creating a new primitive before checking existing Greenhouse primitives.

## Reversibility

This decision is additive. Existing components can migrate gradually by wrapping them in primitives or mapping old names to official variants. No runtime behavior must be removed solely to comply with this ADR unless the component is being actively touched or promoted.

## References

- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/tasks/in-progress/TASK-1028-adaptive-sidecar-ui-platform.md`
