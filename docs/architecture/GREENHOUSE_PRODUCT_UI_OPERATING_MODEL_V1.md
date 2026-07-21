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

### Canonical orchestrator

- `greenhouse-ai-design-studio` owns the end-to-end sequence, artifacts,
  checkpoints and acceptance gate.

### Available specialist lanes

- `ai-ui-generation-director`: controlled visual directions.
- `greenhouse-product-ui-architect`: pattern, recipe, shell and primitives.
- `modern-ui-greenhouse-overlay`: tokens, typography and current craft.
- `greenhouse-portal-ui-implementer`: repo implementation.
- `greenhouse-vuexy-ui-expert`: Vuexy/MUI reference and reuse.
- `greenhouse-ux-content-accessibility`: copy, states and accessibility.
- `greenhouse-microinteractions-auditor`: motion and feedback.
- `greenhouse-ui-review`: implementation/pattern compliance.
- `greenhouse-ui-enterprise-review`: final evidence-backed gate.
- `greenhouse-browser-diagnostics`: browser/runtime evidence.

Do not require missing global skills. The orchestrator handles an unavailable
specialty using canonical docs and records the fallback.

## Canonical Flow

1. Classify rigor and persist an external or repo-native direction.
2. Compare two or three directions; select one and record rejections.
3. Choose surface recipe and first-fold reading/action model.
4. Define state, responsive, accessibility and motion models.
5. Map to Shell, primitives, variants/kinds and tokens.
6. Pass substantive readiness.
7. Implement/review desktop/mobile first fold.
8. Complete behavior, states, access and data integration.
9. Capture/review GVC premium evidence.
10. Score fourteen dimensions, including surface economy and visual impact, and iterate to threshold.
11. Run implementation + enterprise reviews and verification.

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
- Error and misc states (404, 401, access denied, coming soon, maintenance, unavailable route) as compact brand-and-recovery surfaces: creative enough to feel owned by Greenhouse, structured enough to preserve cause, next action, accessibility and stable CTAs.
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
- high-friction error surfaces use generic template copy, or creative variants obscure cause/recovery, rotate while reading, or hardcode reusable JSX copy;
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
