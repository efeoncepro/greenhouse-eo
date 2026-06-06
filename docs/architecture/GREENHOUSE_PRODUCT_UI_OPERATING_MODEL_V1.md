# Greenhouse Product UI Operating Model V1

Status: accepted
Last updated: 2026-06-06
Owner: Platform / Product Design Agents

## Purpose

Greenhouse UI work must be more than component assembly. For visible product surfaces, agents must decide the right product pattern, model states, preserve accessibility, implement within Vuexy/MUI constraints, and verify screenshots before shipping.

This operating model establishes the AI Product Design Studio stack for Greenhouse.

## Source of Truth

- `DESIGN.md` remains the visual contract.
- Greenhouse primitives remain the implementation contract.
- Domain copy lives in `src/lib/copy/*` when reusable.
- Access remains dual-plane where applicable:
  - `routeGroups` for broad routing/navigation.
  - `views` / `authorizedViews` / `view_code` for visible surfaces.
  - `entitlements` for granular authorization.
  - startup policy remains separate.

## Skill Stack

### Global Skills

- `product-design-architect-2026`: product pattern, Product UI ADR, state/action/responsive model.
- `ai-ui-generation-director`: Lovable/Stitch-like generation directions and structured prompts.
- `microinteraction-systems-architect`: motion, feedback, async, reduced-motion and state transitions.
- `frontend-product-implementation-reviewer`: React/Next/frontend implementation fit.
- `visual-regression-product-critic`: screenshot critique and score-based iteration.

### Greenhouse Overlays

- `greenhouse-product-ui-architect`: maps global decisions to Greenhouse primitives and rules.
- `greenhouse-ai-design-studio`: orchestrates the end-to-end design/build/screenshot loop.
- `greenhouse-ui-enterprise-review`: final product-quality gate.

## Canonical Flow

1. Capture product intent and user job.
2. Classify the surface.
3. Choose pattern family.
4. Define first-fold reading order.
5. Define state model.
6. Define action model.
7. Define responsive model.
8. Define microinteraction model.
9. Map to Greenhouse primitives.
10. If the primitive is reusable, define official variants and domain kinds.
11. Implement or mock up.
12. Capture screenshots.
13. Run enterprise review.
14. Verify and commit.

## Primitive + Variants + Kinds Method

Reusable UI work must use the **Primitive + Variants + Kinds** method from `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`.

- **Primitive**: owns layout, accessibility, responsive behavior, motion, shell integration, state plumbing and verification hooks.
- **Variant**: official functional mode. It changes behavior, density, state model, action placement and microinteraction contract. It is not a skin.
- **Kind**: semantic consumer use case. It may be domain-specific, workflow-specific or a legacy alias, but it must resolve to an official variant before layout/styling behavior is chosen.

Canonical shape:

```tsx
<Primitive variant='inspector' kind='contractReview' />
```

Rules:

- Do not create separate `FooDrawer`, `FooInspector`, `FooAssistant` components when one primitive plus variants can cover the family.
- Do not add variants that only change color, radius, shadow or icon.
- Define at most 3-5 official variants per primitive unless an ADR/runtime primitive justifies more. Adaptive Sidecar is the accepted exception with 6 functional variants: `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, `runbook`.
- Validate each official variant with GVC before calling the primitive enterprise-ready.
- Preserve Full API parity: variants may change UI workflow, not business source of truth.

## Pattern Decisions

Use the pattern that fits the task:

- Work queue + inspector for operational triage and contextual actions.
- Command center for subsystem monitoring and exception-first workflows.
- List-detail for entity browsing and comparison.
- Wizard for low-frequency, high-risk creation.
- Adaptive sidecar for contextual assistance, inspection, review, preview, and low-risk contextual editing where the main work context must remain visible.
- AI drawer only as mobile/tablet temporary behavior or legacy escape hatch; desktop assistant surfaces should prefer adaptive sidecar when density allows.
- Modal Dialog for destructive, irreversible, legal, financial, or maker-checker decisions.

### Adaptive sidecar runtime primitive

When the selected pattern is adaptive sidecar, the canonical implementation is `AdaptiveSidecarLayout` + `ContextualSidecar` + `adaptive-sidecar-controller` from `@/components/greenhouse/primitives`.

Official variants:

- `inspector`: read, diagnose and decide without losing the queue/context.
- `composer`: create or edit contextual data with dirty-state guard.
- `assistant`: explain, summarize and suggest using current context; advisory-only and never the only execution path.

Rules:

- Do not implement a new desktop Drawer/card-overlay to imitate the pattern.
- Desktop sidecar lanes must be in-flow, full-height within the work canvas, and structurally separated from main content.
- Use the idempotent controller reducer for local state machines that can open, close, replace, or become dirty.
- Use `ContextualSidecar` with `chrome='adaptive'` for desktop lanes; reserve contained chrome for explicitly framed local surfaces.
- Use GVC desktop + mobile evidence before declaring a consumer enterprise-ready.

## Enterprise Quality Bar

A UI is not Greenhouse-enterprise-ready if:

- it looks like a generic template;
- the primary action is ambiguous;
- action placement competes across regions;
- partial data looks complete;
- mobile is just a compressed desktop;
- important state is conveyed only by color;
- screenshots were not reviewed for a visual-quality request.

## Product UI ADR

Create or embed a Product UI ADR when the decision changes a reusable pattern, high-impact workflow, or user-facing operating model.

Required fields:

- context
- decision
- alternatives considered
- information architecture
- state model
- action model
- responsive model
- accessibility model
- implementation implications
- reversibility
- confidence
- self-critique

## Verification

For meaningful UI:

- `pnpm design:lint`
- relevant lint/type/test commands
- Playwright screenshots for desktop/laptop/mobile
- manual screenshot critique using `greenhouse-ui-enterprise-review`

## Relationship to Existing Docs

This document does not replace:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` if present
- domain architecture documents
- task-specific specs

It governs how agents make and verify product UI decisions before those implementation contracts are applied.
