# TASK-1248 — AI Visibility Client Report UI Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1248 — Growth AI Visibility: Client Report UI`
- Related wireframe: [TASK-1248-growth-ai-visibility-client-report-ui.md](../wireframes/TASK-1248-growth-ai-visibility-client-report-ui.md)
- Intended route / surface: authenticated client portal AI Visibility report route.
- Flow type: `multi-surface`
- Primary primitives: `CompositionShell`, `ContextualSidecar`, mobile drawer behavior from Adaptive Sidecar, `GreenhouseBreadcrumbs`, `GreenhouseButton`, report artifact sections from `TASK-1252`.
- Copy source: planned extension of `src/lib/copy/growth.ts`.

## Flow Brief

- Primary user: authenticated client executive, manager or specialist reading their own organization's AI Visibility snapshot.
- Entry moment: user opens the client report route from the portal, a deep link, or a future Account 360 entry point.
- Successful outcome: user understands the score, selects a recommendation, reviews safe supporting signals, and knows the next step.
- Primary decision/action: review recommended priority and optionally start the governed conversation/contact path.
- Non-goals: raw evidence browsing, admin approval/rejection, provider execution, recurring monitor setup, direct commercial mutation.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Client report page | Entry, score context and report overview | `CompositionShell leadPlusContext` with primary report content and right-side context region | Single-column report with contextual detail opened as temporary drawer | `CompositionShell` |
| Recommendation detail | Explain selected recommendation and safe aggregate signals | Non-modal in-flow sidecar, `role='complementary'`; main report remains readable | Temporary drawer with focus trap and restore | `ContextualSidecar` / Adaptive Sidecar |
| Recommendation list | Select between prioritized recommendations | Row/card selection updates sidecar without navigation | Tap opens drawer with selected recommendation | Adaptive report/recommendation cards |
| Contact / plan action | Optional next-step action | CTA invokes governed contact/handoff route or command if available | Same action; never hidden behind hover | `GreenhouseButton` |
| Portal fallback | Recovery when report is denied/unavailable | Breadcrumb/CTA returns to client portal | Same | `GreenhouseBreadcrumbs` |

## Flow Map

1. Entry: user lands on the report route; app shell confirms authenticated client context and organization.
2. Load: report skeleton matches the final layout while `GET /api/client-portal/growth/ai-visibility/report[?runId=...]` resolves.
3. Ready: score, dimensions and recommendations render; first recommendation is selected by default in desktop sidecar.
4. Select recommendation: click/tap on a recommendation updates the selected detail; desktop sidecar swaps content in place, mobile opens/updates the drawer.
5. Inspect safe signals: user reviews citation share, sentiment, position and explanation copy; no raw provider text or internal IDs appear.
6. Act: "Agendar conversación" uses a governed contact/handoff path when available; otherwise it is omitted or disabled with public-safe explanation.
7. Exit: closing sidecar/drawer restores focus to the recommendation control that opened it; breadcrumbs return to the portal hierarchy.
8. Recovery: denied, empty, pending, partial and error states render structural state surfaces instead of leaking internal review/provider reasons.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Open report | Portal nav, deep link, Account 360 future link | report `loading` then `ready` or state surface | link activation | Deep link must not bypass tenant boundary. |
| Select recommendation | Recommendation row/card | selected recommendation sidecar/drawer | Enter/Space on selected control | Use `aria-pressed` or equivalent selected state. |
| Close detail | Sidecar/drawer close control | detail closed on mobile, desktop returns to default sidecar summary if designed | Escape and close button | Desktop sidecar is non-modal; Escape should not trap the page. |
| View plan recommended | Sidecar secondary CTA | local anchor to recommendations or governed plan route | Enter/Space | Do not imply paid recurring monitor. |
| Schedule conversation | Sidecar primary CTA | governed contact/handoff flow | Enter/Space | If mutative, backend command owns the business action. |
| Return to portal | Breadcrumb/empty state CTA | client portal home or parent reports route | link activation | Tenant-safe recovery. |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| loading | Report request in flight | route entry or run switch | success/error/empty | Skeleton mirrors score, dimensions and sidecar positions. |
| ready | Report available and safe to show | API success | recommendation select, route exit | First recommendation selected by default on desktop. |
| detailOpen | Recommendation detail is visible | recommendation select | close, select another, route exit | Desktop non-modal sidecar; mobile temporary drawer. |
| partial | Report has incomplete provider/sample coverage | API returns partial gate/provenance | user continues or exits | Show coverage disclosure; do not show provider internals. |
| pending | Snapshot not client-ready | review-required/unfinished state | route exit | No retry loop; explain that report is being prepared. |
| empty | No reportable run for org | `grader_run_not_found` / no data | request diagnostic if governed | Structural empty state; no existence leak. |
| denied | User/org cannot access report | forbidden/client tenant missing | route exit | Tenant-safe unavailable message. |
| error | Runtime/API failure | timeout or unexpected error | retry | Retry only for runtime failure, not structural no-data. |

## Routing Contract

- Route changes: `none` for recommendation selection in V1.
- Canonical URL: verify final client portal path during implementation.
- Deep-link behavior: optional future `runId` query selects a specific run; recommendation selection is local state unless future product requires sharable recommendation anchors.
- Back button behavior: browser back leaves the report route; selecting a recommendation must not add history entries in V1.
- Reload behavior: reload re-fetches the report and selects the first recommendation/default priority.
- Shareability: route is tenant-scoped and not public-shareable; do not expose snapshot token URLs from this client view.

## Focus & Accessibility

- Initial focus: normal page focus starts at h1/breadcrumb flow; no auto-focus into sidecar on desktop.
- Escape behavior: closes mobile drawer; desktop sidecar may clear selected detail or keep focus unchanged, but must not trap keyboard.
- Click-away behavior: mobile drawer may close on backdrop; desktop sidecar stays in-flow and does not click-away close.
- Focus restore: after mobile drawer close, return focus to the recommendation card/button that opened it.
- Modal vs non-modal semantics: desktop uses complementary/non-modal semantics; mobile uses the primitive's temporary drawer with focus trap.
- Screen reader announcement: selected recommendation detail title updates with an accessible region label.
- Keyboard traversal: recommendations are reachable as controls; selected state is announced.
- Reduced motion: detail swaps and drawer transitions degrade to instant state changes.

## Data & Command Boundaries

- Readers: `GET /api/client-portal/growth/ai-visibility/report[?runId=...]`.
- Commands: none required for read-only report; contact/scheduling CTA must use an existing governed command or route if it mutates state.
- API routes: no direct public token report route for authenticated client data.
- Optimistic updates: none.
- Cache / invalidation: report may use client cache keyed by org/run; never cache across tenant/org boundary.
- Audit / signals: access and CTA command auditing belongs to server-side primitives, not UI-only code.
- Tenant / access boundary: server session org + capability `growth.ai_visibility.report.read_client`; browser never computes org scope.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | "Este reporte no está disponible para tu espacio" | Volver al portal | No existence leak. |
| not found / empty | Structural empty state | Solicitar diagnóstico only if governed path exists | `grader_run_not_found` is not a retryable error. |
| pending review | "Tu reporte se está preparando" | Volver al portal | No internal review reason. |
| partial data | Partial disclosure and coverage card | Continue reading available coverage | No provider internals. |
| stale/no trend | "Sin histórico comparable" | none | Null trend is not zero. |
| timeout / API error | Runtime error state with retry | Reintentar | Only for actual API/runtime failure. |
| CTA unavailable | Hide or disabled CTA with safe explanation | Continue reading report | Do not promise recurring monitoring. |

## GVC Scenario Plan

- Scenario: `growth-ai-visibility-client-report` under `scripts/frontend/scenarios/` if implementation makes the flow repeatable.
- Viewports: desktop and mobile 390px.
- Required steps: load report, select second recommendation, open mobile drawer, close via Escape/close, trigger safe CTA disabled/available state.
- Required `data-capture` markers: `client-ai-visibility-report`, `client-ai-visibility-score`, `client-ai-visibility-dimensions`, `client-ai-visibility-recommendation-detail`, `client-ai-visibility-actions`, `client-ai-visibility-signals`.
- Assertions: no raw provider text, no internal IDs, selected state visible, drawer focus restore, state copy present.
- Scroll-width checks: `scrollWidth == clientWidth` on desktop and mobile 390px.
- Accessibility/focus checks: keyboard selection, Escape behavior, focus restore after drawer close, complementary vs modal semantics.

## Design Decision Log

- Decision: base report remains a single client page; recommendation details open in a contextual sidecar on desktop and drawer on compact.
- Alternatives considered: route-per-recommendation, modal detail, permanently visible right rail.
- Why this pattern: the user compares score, gaps and recommendation detail without losing report context; compact still gets a focused drawer.
- Reuse / extend / new primitive: reuse `ContextualSidecar`/Adaptive Sidecar behavior; no custom drawer/modal.
- Open risks: final route/query behavior must be confirmed once the client portal route exists.
- Follow-up: if recommendation deep-linking becomes required, extend this flow with query/hash behavior instead of adding ad hoc state.

## Acceptance Checklist

- [ ] `TASK-1248` declares this file in `Flow`.
- [ ] Recommendation detail behavior is desktop sidecar and mobile drawer, not a custom modal clone.
- [ ] Recommendation selection does not create route history entries in V1.
- [ ] Focus restore works after drawer close.
- [ ] `grader_run_not_found` maps to empty/not-available, not retry.
- [ ] The CTA does not mutate business state without a governed command/route.
- [ ] Failure paths do not expose provider internals, review reasons or tenant existence.
- [ ] GVC sequence captures prove desktop and mobile interaction, not only the static report.
- [ ] Design decision log remains aligned with the implemented surface behavior.
