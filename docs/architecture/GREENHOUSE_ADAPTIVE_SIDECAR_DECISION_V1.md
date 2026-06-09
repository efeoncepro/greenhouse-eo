# Greenhouse Adaptive Sidecar Decision V1

## ADR Metadata

- Status: `Accepted`
- Date: `2026-06-05`
- Owner: UI Platform / Product Design
- Scope: UI platform shared patterns, Nexa assistant host, operational workbenches, contextual inspectors, MUI Drawer/Dialog usage, GVC visual verification
- Reversibility: `Two-way`
- Confidence: `High`
- Validated as of: `2026-06-05`
- Companion architecture: `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- Implementation task: `docs/tasks/in-progress/TASK-1028-adaptive-sidecar-ui-platform.md`

## Context

The operator asked for the modern interaction pattern visible in products such as HubSpot and contemporary AI-assisted workspaces: when an assistant, inspector, review panel, or contextual modal appears, the main UI does not simply get covered by an overlay. Instead, the product makes room for the contextual surface and keeps the user's working context visible.

This is not only a visual trend. It is a product architecture shift:

- from interruption-first modals to assistance-in-the-flow;
- from global floating widgets to route-aware contextual sidecars;
- from isolated drawers to layout-aware surfaces with explicit responsive and accessibility contracts;
- from "assistant as overlay" to "assistant as companion panel" that can inspect, explain, draft, and act only through canonical Greenhouse primitives.

External research confirms the direction:

- Google Workspace Gemini documents a side panel that lets users work with Gemini without leaving the app/tab context: <https://support.google.com/a/users/answer/15146419?hl=en>.
- HubSpot Breeze positions AI assistance inside the CRM/customer platform workflow, with CRM context rather than an external chat-only surface: <https://www.hubspot.com/products/artificial-intelligence?product=crm>.
- MUI distinguishes temporary drawers from persistent drawers; persistent drawers are specifically meant to coexist with and resize/adapt app content: <https://mui.com/material-ui/react-drawer/>.
- Equinor Design System's side sheet pattern explicitly includes a standard variant that pushes primary content and persistent variants for longer-lived workflows: <https://eds.equinor.com/docs/components/surfaces/side_sheet/>.
- MDN/WAI accessibility guidance distinguishes modal dialog semantics from non-modal complementary regions; `aria-modal` must only be used for truly modal/inert background behavior: <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-modal> and <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role>.

Greenhouse already has partial local evidence:

- `src/components/greenhouse/NexaFloatingButton.tsx` still renders Nexa desktop as a fixed overlay card. This is the clearest first pilot candidate.
- `src/views/greenhouse/hr/workforce-contracting/WorkforceContractingStudioView.tsx` already uses a queue + sticky rail shape for contract operations.
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` already combines an operational panel with a mobile Drawer fallback.
- `src/components/greenhouse/primitives/OperationalPanel.tsx` provides Greenhouse-native surface styling that a sidecar primitive should compose rather than replace.
- `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx` already has a shell/content boundary and a `drawerSlot`, which suggests shell-level hosting is possible later but should not be introduced as a global rewrite in V1.

## Decision

Greenhouse adopts **Adaptive Sidecar** as a **platform UI capability** and the canonical UI pattern for contextual assistance, inspection, review, preview, and low-risk contextual editing when the user's primary work context must remain visible.

This capability is not owned by Nexa. Nexa is one important consumer because assistant UX exposes the problem clearly, but the primitive must work for multiple Greenhouse use cases: operational inspectors, HR/legal review desks, finance evidence previews, contextual forms, command-center detail rails, and future AI companions.

The pattern is canonical, but not universal:

- Desktop/laptop: the preferred behavior is an in-flow sidecar that reserves space and causes the main content to adapt.
- Tablet/mobile: the preferred behavior is a temporary Drawer or bottom sheet with modal focus management.
- Dense operational surfaces may choose an inline inspector rail if it is always part of the surface.
- Blocking, destructive, irreversible, legal, or maker-checker decisions remain modal Dialogs.

In short: Greenhouse will stop treating every contextual surface as an overlay, but it will not convert every modal into a sidecar.

## Runtime Contract

V1 introduces a shared UI primitive family for multiple consumers:

- `AdaptiveSidecarLayout`: owns layout adaptation, sidecar width, responsive mode, focus restore, and closed/open state shape.
- `ContextualSidecar`: owns the sidecar chrome: header, title, subtitle, status, actions, close/pin controls, loading/degraded/empty states, and body slots.
- Optional controller/hook: route-local state first; shell-level/global state only for the Nexa assistant pilot after the primitive is stable.

Canonical modes:

- `push`: sidecar is in normal layout flow and the main region reflows.
- `inline`: sidecar is a persistent rail that belongs to the page information architecture.
- `overlay`: exceptional desktop fallback when content cannot safely reflow.
- `temporary`: mobile/tablet Drawer semantics with focus trap and backdrop.

Canonical kinds:

- `assistant`
- `inspector`
- `form`
- `preview`
- `review`

Accessibility contract:

- In-flow desktop sidecars are `aside` / `role="complementary"` or a labelled region. They are not `role="dialog"` and never set `aria-modal="true"`.
- Temporary mobile/tablet drawers may use MUI Drawer/Dialog semantics with trapped focus and inert background behavior.
- The trigger must expose `aria-expanded` and `aria-controls` when practical.
- Opening a sidecar moves focus to the sidecar heading or first meaningful control only when the user invoked an explicit open action.
- Closing restores focus to the invoking control or a deterministic fallback.
- Escape closes only non-dirty sidecars; dirty forms must require explicit confirmation.

Action and data contract:

- Sidecars never become sources of truth for business logic.
- Any write action inside a sidecar must call existing Greenhouse commands/readers/API primitives and preserve full API parity.
- Nexa/AI sidecars remain advisory-only unless an explicit command primitive exists, with authorization, audit/outbox, idempotency, sanitized errors, and observability as required by domain architecture.

Platform acceptance:

- The primitive must demonstrate at least assistant, inspector, contextual form, and review/preview variants.
- The first implementation must include a non-Nexa operational validation path, not only a Nexa assistant pilot.
- V1 must not introduce a new animation library by default. Use CSS/MUI transitions, Greenhouse Framer Motion wrapper, existing View Transition helpers, and optional existing auto-animate/GSAP only under their established contracts.
- V1 must define URL/history behavior, collision model, scroll containment, dirty-state guard, and optional instrumentation hooks before runtime adoption.

## Alternatives Considered

### Keep all modals/drawers as overlays

Rejected. This preserves today's simple implementation, but continues to interrupt work, hides context, and makes AI assistance feel bolted on instead of embedded.

### Replace every modal with a sidecar

Rejected. Critical confirmations, destructive actions, irreversible legal/finance decisions, and maker-checker approvals need blocking semantics. A sidecar should not make dangerous actions feel casual.

### Create one global assistant overlay

Rejected for V1. Greenhouse needs contextual surfaces that understand route, data ownership, access, and workbench density. A global overlay would repeat the current Nexa desktop limitation with nicer chrome.

### Use a third-party side panel framework

Rejected for V1. MUI Drawer, CSS grid, existing primitives, Framer Motion/CSS, and GVC already cover the need. Adding a framework would increase design-system drift without solving the hard product constraints.

### Add a new motion library for sidecar fluidity

Rejected for V1. Greenhouse already ships Framer Motion, MUI transitions, native View Transition helpers, `@formkit/auto-animate`, and GSAP under existing architecture decisions. The sidecar needs disciplined composition and GVC verification more than another animation dependency.

### Route-level inspectors only

Partially accepted as a local pattern, but insufficient for platform-level assistant and reusable sidecar behavior. Workbenches can keep inline rails, but Greenhouse still needs a shared primitive for consistent behavior and accessibility.

## Consequences

Positive:

- Nexa can move from floating overlay to an embedded companion in the user's current flow.
- Operational pages can reuse a coherent pattern instead of hand-building rails/drawers.
- GVC can verify open/closed/adaptive states consistently across desktop and mobile.
- Accessibility semantics become explicit instead of depending on visual appearance.

Tradeoffs:

- Layouts must define minimum viable main-content widths.
- Some pages will need route-local adoption rather than a global switch.
- The first implementation needs careful visual QA to avoid cramped enterprise surfaces.
- The pattern introduces a distinction between sidecar and modal that implementers must learn.

## Hard Rules

- Do not use adaptive sidecars for destructive confirmations, irreversible submission, legal approval, or payment execution.
- Do not mark an in-flow sidecar as modal.
- Do not open multiple primary sidecars in the same surface. Nested confirmation Dialogs are allowed for dirty/destructive exits.
- Do not hide critical page content behind a desktop overlay when the sidecar can safely reflow the layout.
- Do not introduce a new design system; compose MUI, Vuexy, and Greenhouse primitives.
- Do not duplicate business logic in the sidecar. Use canonical primitives and APIs.
- Do not declare a sidecar implementation complete without GVC evidence for desktop open/closed and mobile temporary modes.
- Do not let a dirty sidecar close, navigate, replace, or change selected entity without an explicit guard.
- Do not make sidecar URL/query state a bypass around authorization or source-of-truth readers.
- Do not ship user-resizable/pinned sidecars in V1 unless a separate ADR covers persistence, collision, keyboard, and GVC matrix.
- Do not let sidecar footers/actions scroll out of reach in long forms or reviews.

## Revisit When

- Nexa becomes a multi-surface assistant with persistent route-to-route continuity.
- A shell-level sidecar host is needed by more than two domains.
- Mobile usage patterns show that bottom sheets outperform right drawers for Greenhouse's target workflows.
- GVC adds stronger layout-integrity and visual-diff gates from `TASK-1018`.
- A domain needs two concurrent sidecars; that should trigger a new ADR rather than local improvisation.
