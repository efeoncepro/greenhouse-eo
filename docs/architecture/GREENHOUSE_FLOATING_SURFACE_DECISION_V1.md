# GREENHOUSE_FLOATING_SURFACE_DECISION_V1

> **Status:** Accepted  
> **Date:** 2026-06-06  
> **Owner:** UI Platform / Product Design  
> **Scope:** Anchored contextual UI, popovers, menus, rich tooltips, inline editors, evidence peeks, validation bubbles, command previews  
> **Reversibility:** two-way  
> **Confidence:** high  
> **Validated as of:** 2026-06-06 against repo runtime (`@floating-ui/react` 0.27.16, `@floating-ui/dom` 1.7.4) and current Floating UI React docs

## Context

Greenhouse already ships Floating UI:

- `@floating-ui/react` `0.27.16`
- `@floating-ui/dom` `1.7.4`

Runtime usage exists but is narrow:

- Vuexy vertical/horizontal menus use `FloatingTree`, `useFloating`, `FloatingPortal`, `offset`, `flip`, `shift`, and `autoUpdate`.
- `CostProvenancePopover` and `TotalsLadder` use a canonical popover pattern with `autoUpdate`, `offset(8)`, `flip`, `shift({ padding: 16 })`, `FloatingPortal`, `FloatingFocusManager modal={false}`, `useDismiss`, `useRole`, and `useInteractions`.

The platform now has a strong full-height contextual primitive (`AdaptiveSidecar`) for inspectors, assistants, review, reconciliation, evidence, and runbooks. That does not replace smaller anchored surfaces. Greenhouse still needs a governed way to show local, transient context without shipping bespoke `Popover`, `Menu`, `Tooltip`, and inline-editor variants in every domain.

## Decision

Greenhouse adopts **Floating UI as the canonical positioning engine for anchored contextual surfaces**, exposed through a Greenhouse-owned primitive family instead of direct ad-hoc imports from product views.

The future primitive family is named **Greenhouse Floating Surface**. Its canonical implementation path is `src/components/greenhouse/primitives/`, exported from `@/components/greenhouse/primitives`, and governed by the existing **Primitive + Variants + Kinds** methodology.

Canonical shape:

```tsx
<GreenhouseFloatingSurface variant='evidencePeek' kind='costProvenance' />
```

Official V1 variants to implement:

- `richTooltip`: richer than native tooltip, read-only, short-lived, no actions beyond links/help.
- `actionMenu`: anchored row/header actions, keyboard navigable, collision-safe.
- `evidencePeek`: compact provenance/evidence preview with source, freshness, quality, and open-deeper action.
- `inlineEditor`: transient editor anchored to a field/cell for low-risk local edits.
- `validationBubble`: form validation or guidance anchored to an input/control.
- `commandPreview`: contextual preview anchored to command palette/search result rows.

Greenhouse Floating Surface is for **anchored, transient, contextual UI**. It is not a replacement for:

- `AdaptiveSidecar` for full-height work lanes, inspectors, assistants, reconciliation, evidence deep dives, or guided runbooks.
- MUI `Dialog` for destructive, legal, financial, irreversible, or maker-checker decisions.
- Long multi-step workflows.
- Primary navigation chrome already governed by Vuexy.

## Runtime Contract

All product-facing Floating UI usage must eventually route through Greenhouse primitives unless it is legacy Vuexy menu infrastructure.

Default positioning contract:

- `whileElementsMounted: autoUpdate`
- `offset(8)` unless the variant has a documented reason
- `flip({ fallbackAxisSideDirection: 'end' })`
- `shift({ padding: 16 })`
- `FloatingPortal`
- `FloatingFocusManager` with `modal={false}` by default
- `useDismiss`, `useRole`, `useInteractions`
- stable `data-*` hooks for GVC

Accessibility contract:

- Non-modal surfaces must not claim `aria-modal`.
- `role` must match variant (`tooltip`, `menu`, `dialog` only for interactive non-modal popover semantics when justified, etc.).
- Escape and outside-click dismissal must be supported where safe.
- Keyboard open/close/focus return must be tested.
- Reduced-motion and high-contrast behavior must be considered.

Copy contract:

- Labels, aria labels, empty/error text, and action text come from `src/lib/copy/*` when reusable.
- Product views should not hardcode reusable floating-surface copy in JSX.

Verification contract:

- Runtime adoption requires focused tests for state/a11y behavior.
- Visible adoption requires GVC desktop + mobile evidence.
- Collision cases must include at least one scroll/clipped-container scenario when used inside tables, cards, or dense workbenches.

## Alternatives Considered

### Use MUI Popover/Menu/Tooltip directly everywhere

Rejected as the platform default. MUI remains useful, but direct adoption creates inconsistent collision behavior, focus handling, placement defaults, styling, and test hooks. Greenhouse needs one governed primitive family for enterprise reuse.

### Use Floating UI directly in each product component

Rejected except for low-level primitives. Direct imports are acceptable inside Greenhouse primitives and legacy Vuexy menu infrastructure, but product views should consume Greenhouse wrappers to avoid fragmentation.

### Use Adaptive Sidecar for all contextual content

Rejected. Sidecar is better for durable or deep context. It is too heavy for row actions, validation hints, provenance peeks, small inline edits, and command previews.

### Add a new overlay library

Rejected. The repo already has Floating UI installed and working. Adding another positioning stack would increase complexity without a clear benefit.

## Consequences

Benefits:

- Reuses a capable positioning engine already present in the repo.
- Reduces clipping and z-index bugs in dense operational UI.
- Gives Greenhouse a consistent enterprise pattern for anchored context.
- Enables richer microinteractions without overusing drawers or sidecars.
- Improves keyboard and focus consistency across menus, popovers, and peeks.

Costs:

- Requires a wrapper primitive instead of one-off product usage.
- Requires variant discipline: Floating UI is an engine, not a design system.
- Some existing popovers may need migration to align with the new contract.

Risks:

- Overuse could create UI noise if every metric/control grows a popover.
- Interactive floating surfaces can become inaccessible if they skip focus/dismissal contracts.
- Nested surfaces can conflict with sidecars, dialogs, or table virtualization unless governed.

Mitigations:

- Use variant/kind governance.
- Keep Floating Surface out of destructive/legal/financial confirmations.
- Add collision + keyboard GVC scenarios for pilot surfaces.
- Document allowed and forbidden use cases in UI Platform docs.

## Revisit When

Reopen this decision if:

- Floating UI is removed, deprecated, or incompatible with the current React/Next runtime.
- MUI/Base UI provides a superior governed primitive that reduces custom ownership.
- Product teams start using floating surfaces for deep workflows better served by `AdaptiveSidecar`.
- Accessibility regressions appear repeatedly in anchored surfaces.

