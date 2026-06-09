# Greenhouse Adaptive Sidecar UI Platform V1

> **Version:** 1.5
> **Created:** 2026-06-05
> **Updated:** 2026-06-06 — v1.5: Adaptive Sidecar extends official variants to `inspector`, `composer`, `assistant`, `reconciler`, `evidence`, and `runbook`; reusable content blocks live in `ContextualSidecarBlocks` for comparison, provenance, metrics, signals, progress, and runbook steps.
> **Updated:** 2026-06-06 — v1.4: Adaptive Sidecar adopts `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`; domain/legacy kinds resolve into official variants before behavior/chrome is chosen.
> **Updated:** 2026-06-06 — v1.3: viewport-height sidecars can publish shell reservations through `AdaptiveSidecarShellProvider`; the Greenhouse vertical navbar consumes that reservation and reflows without global CSS patches or `!important`.
> **Updated:** 2026-06-06 — v1.2: optional bounded resize and viewport-height shell lanes are accepted in V1 for desktop in-flow sidecars. `AdaptiveSidecarLayout` exposes `resizable`, `sidecarMinWidth`, `sidecarMaxWidth`, `onSidecarWidthChange`, `sidecarExtent`, `viewportOffsetTop`, and an accessible `role="separator"` splitter.
> **Updated:** 2026-06-06 — Runtime primitive promoted: `AdaptiveSidecarLayout`, `ContextualSidecar`, and `adaptive-sidecar-controller` are the canonical reusable implementation under `src/components/greenhouse/primitives/`.
> **Status:** Accepted target architecture
> **Decision:** `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
> **Implementation:** `docs/tasks/in-progress/TASK-1028-adaptive-sidecar-ui-platform.md`
> **Audience:** Product Design, frontend engineers, UI platform agents, Nexa implementers

---

## 1. Purpose

This document defines how Greenhouse builds the modern "UI makes room for a contextual panel" pattern at enterprise quality.

The goal is not to rename drawers or create a Nexa-only shell. The goal is to formalize a platform capability that lets assistants, inspectors, preview/review panels, and low-risk contextual forms sit beside the work instead of covering it.

## 2. Research Synthesis

### 2.1 Market pattern

Current enterprise products are converging on contextual assistance inside the workspace:

- **Google Workspace Gemini** uses a side panel so users can ask, summarize, draft, and analyze without leaving the active app or tab. Source: <https://support.google.com/a/users/answer/15146419?hl=en>.
- **HubSpot Breeze** positions AI assistance inside CRM workflows, using customer-platform context rather than a detached chatbot-only model. Source: <https://www.hubspot.com/products/artificial-intelligence?product=crm>.
- **MUI Drawer** separates temporary drawers from persistent drawers. Persistent drawers coexist with app content and are appropriate when the panel is part of the working layout. Source: <https://mui.com/material-ui/react-drawer/>.
- **Equinor Side Sheet** distinguishes push-side sheets and persistent flows, showing that "side panel that pushes content" is already a mature design-system primitive in enterprise design systems. Source: <https://eds.equinor.com/docs/components/surfaces/side_sheet/>.
- **MDN/WAI accessibility guidance** makes the semantic boundary important: a modal dialog requires inert background behavior and correct dialog semantics; non-modal side panels should not pretend to be modal. Sources: <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role> and <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-modal>.
- **Microsoft Fluent 2 Drawer** explicitly distinguishes inline drawers that sit side-by-side with main content from overlay drawers that cover it; inline is preferred when users benefit from interacting with both regions at once. Source: <https://fluent2.microsoft.design/components/web/react/core/drawer/usage>.
- **Material side sheet guidance** distinguishes standard side sheets that coexist with the main UI from modal side sheets that block the page with a scrim; coplanar side sheets can reflow/squash sibling content on sufficiently wide layouts. Source: <https://super12138.github.io/material-components-android/components/SideSheet.html>.
- **OpenUI Copilot** and `assistant-ui` both treat assistant sidebars as side-by-side layouts that keep the main application visible; `assistant-ui` demonstrates a resizable panel group for assistant surfaces. Sources: <https://www.openui.com/docs/chat/copilot> and <https://www.assistant-ui.com/docs/ui/assistant-sidebar>.
- **Shopify Polaris Contextual Save Bar** reinforces the dirty-state pattern: save/discard actions should stay contextual and explain what changed. Source: <https://polaris-react.shopify.com/components/internal-only/contextual-save-bar>.
- **Atlassian Design System** cautions against Drawer in its newer navigation context, reinforcing that Greenhouse should not treat the pattern as a generic navigation drawer. Source: <https://atlassian.design/components/drawer/>.

### 2.2 Product interpretation for Greenhouse

The trend matters because Greenhouse is operational software. Users compare, triage, review, approve, draft, inspect evidence, and ask Nexa for context. If a contextual surface covers the queue/table/person/work item, it breaks the work loop.

The enterprise interpretation:

- Assistant = companion, not floating toy.
- Inspector = workspace region, not surprise overlay.
- Review/preview = adjacent evidence, not route escape when the primary list still matters.
- Destructive decision = still a modal.

## 3. Greenhouse Current State

Relevant runtime evidence:

- `src/components/greenhouse/NexaFloatingButton.tsx` renders a desktop fixed-position card overlay and a mobile Drawer. This should become the V1 pilot.
- `src/views/greenhouse/hr/workforce-contracting/WorkforceContractingStudioView.tsx` already uses command-center + sticky rail behavior.
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` already combines a desktop operational panel with mobile Drawer fallback.
- `src/components/greenhouse/primitives/OperationalPanel.tsx` is the existing Greenhouse primitive for contained operational surfaces.
- `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx` already separates shared shell from facet content and exposes `drawerSlot`.

The gap is consistency and platform semantics. Greenhouse has good local patterns, but no shared primitive that answers:

- when does the main layout reflow?
- when is the surface modal?
- what are the responsive breakpoints?
- how is focus restored?
- what states are required?
- what does GVC need to capture?

## 4. Pattern Taxonomy

| Pattern | Use when | Layout behavior | Semantics |
|---|---|---|---|
| Modal Dialog | Destructive, irreversible, legal, payment, final approval, blocking confirmation | Covers and blocks page | `role="dialog"`, modal/inert background |
| Temporary Drawer | Mobile/tablet sidecar fallback, short contextual task, limited screen width | Overlays with backdrop | Drawer/dialog-like focus trap |
| Adaptive Sidecar | Assistant, inspector, contextual form, review, preview where main context matters | Pushes/reflows main content on desktop | `aside`/labelled complementary region |
| Inline Inspector Rail | Always-on detail rail inside a workbench | Part of base page grid | Complementary region or normal section |
| Floating Companion | Legacy escape hatch or narrow utility | Fixed overlay | Avoid for core workflows |

## 5. Decision Matrix

| User need | Canonical pattern | Notes |
|---|---|---|
| Ask Nexa about the current route or selection | Adaptive Sidecar | Desktop push; mobile temporary Drawer |
| Inspect selected row/entity while queue remains visible | Inline Inspector Rail or Adaptive Sidecar | Choose inline rail if always part of workbench IA |
| Review a draft beside validation/evidence | Adaptive Sidecar or dedicated split workbench | Do not cover validation context |
| Preview generated document/evidence | Adaptive Sidecar | If full-screen inspection is required, offer explicit open route/action |
| Low-risk contextual edit | Adaptive Sidecar form | Dirty state requires explicit close confirmation |
| Bulk mutation or high-risk workflow | Wizard/page | Do not compress complex work into a sidecar |
| Destructive/irreversible/financial/legal approval | Modal Dialog | Blocking semantics remain correct |

## 6. Component Architecture

### 6.0 Runtime implementation contract

Adaptive Sidecar is now a reusable Greenhouse primitive, not a one-off mockup or a Nexa shell detail.

Canonical imports:

```tsx
import {
  AdaptiveSidecarLayout,
  ContextualSidecar,
  ContextualSidecarComparisonRows,
  ContextualSidecarMetricStrip,
  ContextualSidecarSignal,
  buildSidecarSearchParams,
  removeSidecarSearchParams,
  reduceAdaptiveSidecarState,
  resolveAdaptiveSidecarMode
} from '@/components/greenhouse/primitives'
```

Canonical files:

- `src/components/greenhouse/primitives/AdaptiveSidecarLayout.tsx`
- `src/components/greenhouse/primitives/ContextualSidecar.tsx`
- `src/components/greenhouse/primitives/ContextualSidecarBlocks.tsx`
- `src/components/greenhouse/primitives/adaptive-sidecar-controller.ts`
- `src/components/greenhouse/primitives/adaptive-sidecar-shell-context.tsx`
- `src/components/layout/vertical/Navbar.tsx`
- `src/components/greenhouse/primitives/__tests__/AdaptiveSidecarLayout.test.tsx`
- `src/components/greenhouse/primitives/__tests__/ContextualSidecar.test.tsx`
- `src/components/greenhouse/primitives/__tests__/adaptive-sidecar-controller.test.ts`

The primitive must be adopted before creating a new custom drawer/modal for contextual assistance, inspection, review, preview, or low-risk editing. Local consumers may wrap it with domain-specific composition, but must not fork the layout, mode resolver, URL helpers, dirty replacement guard, motion imports, or desktop semantics.

Idempotency contract:

- Re-opening the same `{ kind, sidecarId, mode }` target through `reduceAdaptiveSidecarState()` returns the same state object.
- Dirty sidecars block close/replacement unless the action explicitly sets `force`.
- Close/replacement attempts expose `lastAction` so consumers can trigger confirmation UI without mutating the sidecar target by accident.
- URL helpers preserve unrelated search params and remove only sidecar params on close.

Motion contract:

- Shell reflow uses stable grid dimensions and reduced-motion-aware transitions.
- Sidecar content changes use `@/libs/FramerMotion` and `useReducedMotion`; consumers must not import `framer-motion` directly.
- GSAP is not the default sidecar motion stack; it remains reserved for exceptional choreography covered by its own ADR.
- Desktop `push`/`inline` sidecars are full-height lanes inside the work canvas, separated by structure, not boxed drawers with shadow/radius chrome.
- Desktop resizable sidecars must expose a visible splitter with `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and keyboard adjustment.
- `sidecarExtent='viewport'` is the shell-level presentation: panel and splitter run top-to-bottom through the viewport, while the route content still reserves layout space so the main surface is not covered.
- If a viewport sidecar needs to occupy the global app-bar area, the implementation must use `viewportShellReflow='greenhouse-vertical-navbar'` inside `AdaptiveSidecarShellProvider`. The sidecar publishes a bounded reservation; the navbar consumes it through its `overrideStyles` contract and preserves global actions/avatar. Do not patch the navbar with route-local global CSS or `!important`.
- Viewport sidecars must not remove the global footer. Surfaces that use full-height lanes must budget header/content padding/footer height in their own canvas so `scrollHeight === clientHeight` when the workbench is intended to be non-scrolling.

Variant contract:

- `inspector`: read/diagnose/decide beside the workbench.
- `composer`: low-risk contextual editing with dirty-state guard.
- `assistant`: advisory-only explanation and suggestions with evidence context.
- `reconciler`: source comparison, drift resolution, exception path and audit trail.
- `evidence`: provenance, source freshness, confidence and acceptance traceability.
- `runbook`: checkpointed operational execution with rollback/pause affordance.

Reusable content blocks:

- `ContextualSidecarSignal` for the dominant operational signal.
- `ContextualSidecarMetricStrip` for compact KPI/state summaries.
- `ContextualSidecarComparisonRows` for reconciler source comparison.
- `ContextualSidecarProgress` and `ContextualSidecarTimeline` for evidence confidence/provenance.
- `ContextualSidecarRunbookSteps` for gated operational steps.

Verification evidence for the V1 primitive:

- Desktop GVC: `.captures/2026-06-06T02-50-18_adaptive-sidecar-platform-mockup` (14 frames: variant switch, close, reopen, inline, keyboard).
- Mobile GVC: `.captures/2026-06-06T02-40-56_adaptive-sidecar-platform-mobile-mockup` (drawer open, close, re-open).
- Navbar safety check: `/home` keeps the default navbar width/position when no sidecar reservation is active; sidecar open adapts the app bar and close restores it.
- Scroll/footer check: sidecar mockup keeps the footer visible and measures `scrollHeight=900/clientHeight=900` open and closed at 1440x900.
- Tests: focused primitive/controller tests plus TypeScript.

### 6.1 `AdaptiveSidecarLayout`

Home: `src/components/greenhouse/primitives/AdaptiveSidecarLayout.tsx`

Draft API:

```tsx
type AdaptiveSidecarMode = 'push' | 'inline' | 'overlay' | 'temporary'
type AdaptiveSidecarKind = 'assistant' | 'inspector' | 'form' | 'preview' | 'review'
type AdaptiveSidecarDensity = 'compact' | 'comfortable' | 'wide'

type AdaptiveSidecarLayoutProps = {
  children: React.ReactNode
  sidecar: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: AdaptiveSidecarKind
  preferredMode?: AdaptiveSidecarMode
  density?: AdaptiveSidecarDensity
  side?: 'right' | 'left'
  mainMinWidth?: number
  sidecarWidth?: number | { lg?: number; xl?: number }
  temporaryBreakpoint?: 'sm' | 'md' | 'lg'
  labelledBy?: string
  restoreFocusRef?: React.RefObject<HTMLElement>
  dirty?: boolean
  dataCapture?: string
}
```

Responsibilities:

- Determine actual mode from viewport + `mainMinWidth`.
- Render desktop push/inline mode with CSS grid/flex, not fixed overlay.
- Render mobile/tablet temporary mode with MUI Drawer.
- Provide stable layout dimensions to avoid text/control jump.
- Respect reduced-motion.
- Expose deterministic `data-capture` hooks for GVC.

### 6.2 `ContextualSidecar`

Home: `src/components/greenhouse/primitives/ContextualSidecar.tsx`

Variant contract follows `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`:

| Official variant | Use when | Required behavior |
| --- | --- | --- |
| `inspector` | User must read, diagnose and decide while preserving queue/context | Read-heavy hierarchy, evidence/status/timeline, one contextual primary action |
| `composer` | User creates or edits contextual data | Dirty-state guard, validation feedback, save/discard/cancel action model |
| `assistant` | User needs advisory explanation, summary or next-best-action | Context disclosure, evidence/sources, advisory-only suggested actions |
| `reconciler` | User compares two or more sources and resolves drift | Source comparison rows, exception path, explicit apply action, audit trail |
| `evidence` | User validates provenance, confidence and source freshness | Source cards, confidence/progress, provenance timeline, accept/copy actions |
| `runbook` | User advances a guided operational procedure | Checkpoint steps, active gate, rollback/pause affordance, execution guardrails |

`kind` remains semantic and may be domain-specific (`contractReview`, `paymentInspector`) or legacy/narrow (`form`, `review`, `preview`). Kinds must map into an official variant before chrome, footer behavior or motion is decided.

Draft API:

```tsx
type ContextualSidecarProps = {
  id: string
  title: string
  subtitle?: string
  status?: React.ReactNode
  icon?: React.ReactNode
  kind: AdaptiveSidecarKind
  variant?: 'inspector' | 'composer' | 'assistant' | 'reconciler' | 'evidence' | 'runbook'
  onClose: () => void
  actions?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  state?: 'ready' | 'loading' | 'empty' | 'degraded' | 'error' | 'permission' | 'dirty' | 'saving' | 'saved'
  dataCapture?: string
}
```

Responsibilities:

- Greenhouse enterprise chrome for sidecar surfaces.
- Header with icon, title, subtitle, status, and close control.
- Body with consistent spacing, scroll behavior, and state treatment.
- Footer/action slot when the sidecar includes command actions.
- A11y labels and heading IDs.
- `chrome='adaptive'` by default for in-flow lanes; use `chrome='contained'` only when a consumer intentionally needs a framed panel.

### 6.3 Consumer model

Adaptive Sidecar is a platform primitive with multiple first-class consumer families:

- Assistant sidecar: Nexa or future AI companions that explain, draft, summarize, and suggest.
- Inspector sidecar: selected row/entity detail in operational queues.
- Review sidecar: bilingual/legal/finance/evidence review beside blockers and validation.
- Preview sidecar: document, asset, timeline, or audit artifact preview while the list remains visible.
- Contextual form sidecar: low-risk edits that preserve surrounding context.

Nexa must not be used as the architecture's only validation path. TASK-1028 must prove the primitive with a platform demo and at least one non-Nexa operational surface or compatibility adapter with GVC evidence.

### 6.4 State ownership

Route-local ownership is the V1 default:

- Open/closed state lives in the page/view that owns the work context.
- Selected entity/row remains in the domain view state.
- Sidecar business data is fetched through existing readers/API routes.

Shell/global ownership is allowed only for the Nexa pilot after V1 primitives exist:

- Nexa may need route-aware persistence across pages.
- The shell host must not leak tenant data, bypass route access, or keep stale entity context after navigation.

### 6.5 URL, history, and deep-link strategy

V1 must define the state persistence strategy per consumer. There are two valid modes:

- **Ephemeral sidecar state:** React/local state only. Use for transient assistance, lightweight inspectors, and sidecars that do not need refresh/back/deep-link behavior.
- **Addressable sidecar state:** URL query/search params or route segment. Use when the sidecar represents a selected entity, review target, preview artifact, or state the user may refresh/share/return to.

Canonical examples:

- `?panel=case-detail&caseId=...`
- `?panel=preview&assetId=...`
- `?panel=review&draftId=...`

Rules:

- If a sidecar selection is critical to the workflow, it should be addressable.
- Addressable sidecars must validate access server-side after refresh, not trust the URL.
- Back button behavior must be deterministic: if opening the sidecar pushed history, Back closes the sidecar first; if opening replaced state, Back follows normal route history.
- Closing an addressable sidecar must clean up the URL without losing unrelated query params.
- Refresh must either restore the sidecar or degrade honestly to a safe closed/permission/error state.

### 6.6 Collision model

Only one **primary sidecar** may be open per surface.

Definitions:

- Primary sidecar: the large contextual panel that changes layout or owns a Drawer slot.
- Secondary contextual UI: popover, tooltip, menu, small confirm Dialog, inline expand, or nested picker.

Rules:

- Opening a second primary sidecar must either replace the first with explicit state transition or be rejected by the controller.
- Dirty primary sidecars block replacement until the dirty guard resolves.
- Nexa/assistant does not get automatic priority over an operational inspector. The surface owner defines priority.
- Nested destructive/dirty confirmations use Dialog semantics; they do not count as a second primary sidecar.
- If a future surface genuinely needs two primary sidecars, open a new ADR. Do not improvise local stacking.

### 6.7 Scroll containment

Sidecars must not introduce incoherent double-scroll.

Rules:

- The page shell owns outer scroll.
- The sidecar body may scroll independently.
- The sidecar header and footer/action bar should remain visible when the body scrolls.
- The main work area should preserve its own scroll position when the sidecar opens/closes.
- Opening a sidecar should not jump the page to top unless the open action explicitly navigates.
- On mobile temporary mode, body scroll must be locked or managed by MUI Drawer semantics.

### 6.8 Dirty state and navigation guard

Dirty sidecars are safety-critical.

Dirty state must guard:

- close button;
- Escape key;
- backdrop close in temporary mode;
- selecting a different row/entity;
- opening another primary sidecar;
- route navigation from sidecar actions;
- browser Back behavior when the sidecar pushed history.

Dirty confirmation should be specific: keep editing, discard changes, or save when the domain supports save. Do not use vague "Are you sure?" copy.

### 6.9 Pinning, resizing, and persistence

V1 ships **optional bounded resize** for desktop in-flow sidecars and does not ship pinned persistent sidecars by default.

Rationale:

- Resize is useful for assistant/review/preview use cases where text, evidence, or generated output density varies by task.
- Resize must stay bounded; unrestricted width creates inaccessible or unusable main content.
- Pinning introduces persistence, collision, and stale context concerns.
- Enterprise density needs stable, predictable dimensions before personalization.

Allowed in V1:

- fixed width presets by `kind` and breakpoint;
- optional `density` prop;
- optional `resizable` prop with `sidecarMinWidth`, `sidecarMaxWidth`, `onSidecarWidthChange`, visual splitter, keyboard controls and GVC evidence;
- optional `sidecarExtent='viewport'` for shell-level lanes that should visually occupy top-to-bottom viewport height;
- route-local remembered open state only when the surface owner proves it is safe.

Not allowed in V1:

- persisted user pinning across routes;
- unbounded resize;
- resize on mobile temporary Drawer;
- resize that bypasses `mainMinWidth` fallback;
- resize handles without keyboard control and accessible value semantics.
- viewport-height sidecars that cover main content instead of reserving space.

Future V2 may add pinning/persistence after the shell host and collision model prove stale-context handling.

## 7. Responsive Model

Default width guidance:

- `xl` desktop: `420px` assistant/inspector, `520px` review/form, `640px` wide preview.
- `lg` desktop: push only if main content can keep a useful minimum width.
- below `lg`: temporary Drawer by default.
- mobile: full-width Drawer or bottom sheet depending on surface density; V1 can use right Drawer unless GVC shows poor ergonomics.

The main content must define a minimum viable width. If the sidecar would collapse the primary work below that width, the primitive falls back to `temporary` or `overlay` according to the surface contract.

## 8. Accessibility Model

In-flow desktop sidecars:

- Use `aside` or a labelled complementary region.
- Must have a visible title and an accessible name.
- Must not use `aria-modal="true"`.
- Must not trap focus.
- Must provide close control when user-opened.
- Trigger should expose `aria-expanded` and `aria-controls` when practical.
- Focus restore returns to the trigger or a deterministic fallback.

Temporary/mobile sidecars:

- May use MUI Drawer with modal focus trap.
- Background may be inert/backdrop-controlled.
- Escape closes if there is no dirty/unsaved state.

Dirty form behavior:

- Closing a dirty sidecar requires confirmation.
- That confirmation may use a small Dialog because the user is making a blocking decision.

## 9. Motion Model

### 9.1 Library decision

V1 does **not** need a new animation library.

Greenhouse already has the right motion stack for this capability:

- CSS grid/flex + theme transitions for the actual desktop reflow.
- MUI Drawer and MUI transitions for temporary mobile/tablet mode.
- Framer Motion via `@/libs/FramerMotion` for React layout animation, `AnimatePresence`, and small entrance/exit polish.
- Native View Transitions API via the existing Greenhouse helpers for route-to-route continuity when a sidecar action navigates to a detail/edit route.
- `@formkit/auto-animate` only for simple list mutation inside the sidecar, not for the main shell reflow.
- GSAP via `@/libs/GSAP` only for exceptional advanced timelines; it is not the default for sidecar open/close.
- `@floating-ui/react` is not needed for the sidecar shell. It remains useful for anchored popovers/tooltips/menus inside sidecar content.

External basis:

- Motion's layout animation docs state that layout changes can animate size/position through the `layout` prop, which fits sidecar content and main-region polish.
- MUI Drawer documents persistent drawers as the pattern where opening the drawer forces other content to adapt, which matches the desktop push model.
- MUI transitions cover basic UI motion such as Collapse/Fade/Slide and custom transition components where needed.
- MDN's View Transition API covers same-document transitions with browser fallback, which Greenhouse already wraps.
- GSAP's React/context docs emphasize cleanup and advanced timelines; Greenhouse should keep it for specialized choreography, not ordinary sidecar layout shifts.

### 9.2 Implementation approach

Default motion:

- CSS transitions or Framer Motion for width/opacity/transform.
- Duration should be short and functional, not theatrical.
- Respect `prefers-reduced-motion`.
- Avoid GSAP by default; GSAP remains reserved for complex timelines per `GREENHOUSE_GSAP_ADOPTION_DECISION_V1.md`.

Microinteractions:

- Open: content shifts/reserves space with low-jank transition.
- Close: reverse transition with focus restore.
- Resize must preserve stable layout, `mainMinWidth` fallback, keyboard control and GVC coverage; pinning remains deferred.

Hard rules:

- Do not add `react-spring`, `anime.js`, another drawer library, or another animation framework for V1 unless Plan Mode proves a concrete gap that CSS/MUI/Framer/View Transitions cannot cover.
- Do not animate `width`/`grid-template-columns` heavily on low-end mobile; mobile should use Drawer transform behavior.
- Do not use GSAP for ordinary hover/focus/open/close.
- Do not use View Transitions for every click; only use it when identity continuity helps the workflow.

## 10. Data, Security, and API Parity

Adaptive sidecars are UI containers. They do not change business ownership.

Rules:

- Reads use canonical readers/API routes.
- Writes use canonical commands and capabilities.
- AI content is advisory-only unless a domain command exists.
- Assistant context must be redacted to the current subject/access scope.
- No secrets, raw provider payloads, or privileged customer data are stored in client sidecar state.
- Any new write action must preserve `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` and `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`.

Assistant context contract:

- Do not pass "whatever is visible on screen" as AI context.
- Build explicit context DTOs per surface.
- Context DTOs must include tenant, subject, selected entity, allowed actions, redaction mode, and source freshness when relevant.
- Links/actions suggested by AI must be access-aware before rendering as navigable UI.

Observability contract:

- V1 primitives should expose optional instrumentation hooks rather than hardcode analytics.
- At minimum, consumers should be able to emit: `opened`, `closed`, `mode_resolved`, `kind`, `primary_action_invoked`, `dirty_close_blocked`, `fallback_temporary`, and `error/degraded`.
- No PII/raw document content should be emitted in interaction telemetry.

## 11. Required States

Every production sidecar must account for:

- closed
- opening/open
- loading
- ready
- empty
- degraded
- error
- permission denied / unavailable
- dirty
- saving
- saved
- closing
- blocked by dirty state
- replaced by another sidecar
- URL restore failed
- fallback temporary mode

Not every state needs unique UI if the domain does not support it, but the implementer must consciously map it.

## 12. Adoption Checklist

Before a Greenhouse surface adopts Adaptive Sidecar, answer:

1. Is the use case assistant, inspector, form, preview, or review?
2. Should the sidecar be ephemeral or addressable in the URL?
3. What happens on browser Back?
4. What is the minimum viable width of the main work area?
5. What is the mobile fallback: right Drawer, bottom sheet, or full-screen route?
6. Can the sidecar become dirty? If yes, what blocks close/replacement/navigation?
7. What is the collision rule if another primary sidecar is already open?
8. Which data/API primitives does it consume?
9. What context is redacted for AI/assistant usage?
10. What GVC frames prove desktop open/closed, optional resize affordance, and mobile temporary behavior?
11. Does this need telemetry hooks?
12. Why is this not a Dialog, Wizard, route, or inline rail?

## 13. GVC Verification Contract

For any runtime adoption:

1. Capture closed desktop baseline.
2. Capture open desktop sidecar with primary content still useful.
3. Capture mobile temporary Drawer.
4. Capture at least one loading/degraded or empty state when relevant.
5. Verify no obvious text overlap, clipped controls, or incoherent stacking.
6. Run axe through GVC where supported.
7. For assistant/Nexa pilot, capture route context before and after navigation if persistence is enabled.

Preferred scenario metadata:

- `data-capture="adaptive-sidecar-root"`
- `data-capture="adaptive-sidecar-main"`
- `data-capture="adaptive-sidecar-panel"`
- `data-capture="adaptive-sidecar-trigger"`

## 14. Rollout Architecture

### V1 — Primitive + platform validation

- Create `AdaptiveSidecarLayout` and `ContextualSidecar`.
- Add a mockup/demo route for design validation across assistant, inspector, form, and review/preview variants.
- Validate one assistant consumer, with Nexa as the obvious candidate.
- Validate one non-Nexa operational consumer or compatibility adapter, with Workforce Contracting or HR Offboarding as candidates.
- Preserve mobile Drawer behavior.

### V1.1 — Workbench adoption

- Normalize additional workbench rail/drawer flows against the primitive.
- Do not migrate every drawer.

### V2 — Shell-level host

- Consider shell-hosted sidecar only after at least two domains need cross-route persistence.
- Define stale-context clearing and access invalidation before enabling global persistence.

## 15. Anti-Patterns

- Sidecar used for destructive confirmation.
- In-flow sidecar with `role="dialog"` or `aria-modal="true"`.
- Multiple simultaneous primary sidecars.
- Sidecar that hides the main content on desktop when the task requires comparison.
- AI sidecar with privileged context outside current authorization.
- Sidecar that implements business mutation logic inline.
- Drawer implemented visually but never GVC-tested on mobile.
- Global assistant that ignores route, tenant, selected entity, or access scope.
- URL query sidecar that bypasses access checks after refresh.
- Dirty sidecar that can be replaced by selecting another row.
- Sidecar whose footer actions scroll out of reach during long forms.

## 16. Open Questions for TASK-1028 Plan Mode

- Should Nexa desktop rollout use an existing Greenhouse rollout flag mechanism or a UI-only env flag?
- Should a future shell host support persisted pinned sidecars, or should sidecars remain route-local?
- Should temporary mobile mode be right Drawer or bottom sheet for assistant usage?
- Which workbench should be the first non-Nexa adoption after the pilot?
- Should `OrganizationWorkspaceShell.drawerSlot` become a compatibility adapter or remain separate until V2?
