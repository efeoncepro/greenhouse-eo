# Greenhouse My Performance Self-Service Activity V1

## Status

`Accepted`

## Date

2026-06-05

## Owner

Product / People / Delivery Intelligence / Identity Access

## Scope

- Collaborator-facing surface `/my/performance`.
- Product API route `/api/my/performance`.
- View code `mi_ficha.mi_desempeno`.
- Person 360 Activity reusable UI patterns.
- ICO Engine member metrics and Nexa member-scoped insights.
- Self-service redaction, mention navigation and advisory copy.

## Reversibility

`two-way-but-slow`

The UI composition can be changed later, but once collaborators rely on a richer self-service performance view, removing or weakening it would require product communication, access review and follow-up tasks.

## Confidence

`high`

## Validated As Of

2026-06-05 — validated against current runtime files:

- `src/app/(dashboard)/my/performance/page.tsx`
- `src/app/api/my/performance/route.ts`
- `src/views/greenhouse/my/MyPerformanceView.tsx`
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- `src/app/api/people/[memberId]/intelligence/route.ts`
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/lib/person-intelligence/store.ts`
- `src/components/greenhouse/NexaInsightsBlock.tsx`
- `src/components/greenhouse/NexaMentionText.tsx`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Context

People / Person 360 already has a rich Activity tab for internal operators. It combines:

- Nexa member-scoped insights via `readMemberAiLlmSummary`.
- ICO member metrics for the selected period.
- OTD/FTR trend cards.
- KPI cards.
- task summary chips.
- radar health chart.
- CSC distribution / pipeline velocity charts.
- honest empty and pending-closure states.

Collaborators also have a self-service route, `/my/performance`, gated by `mi_ficha.mi_desempeno` and backed by `/api/my/performance`. That API correctly resolves `memberId` from the authenticated session via `requireMyTenantContext()`, which prevents IDOR by construction. However, the current self-service UI is materially less capable than Person 360 Activity and does not expose the same Nexa advisory layer or richer activity composition.

This creates a product mismatch:

- Admins can see a high-signal operational reading of a collaborator.
- The collaborator cannot see the same quality of their own operational metrics.
- The existing self-service view risks becoming stale because Person 360 Activity keeps receiving richer Nexa/ICO improvements.

The solution must not simply copy the admin tab. `/my/performance` has a different audience and risk profile: collaborators need coaching, transparency and focus; admins need supervision and operational diagnosis.

## Decision

Greenhouse will treat `/my/performance` as the canonical collaborator-facing self-service activity view for personal ICO metrics and Nexa advisory insights.

The surface will reuse the same canonical data sources and UI primitives as Person 360 Activity where appropriate, but it must expose them through a self-service contract:

1. `memberId` is always resolved server-side from the session. `/my/performance` and `/api/my/performance` must never accept a target member identifier from URL, query string or request body.
2. `/api/my/performance` returns an explicit self-service DTO. It must not pass through raw `PersonIntelligenceSnapshot` or internal Person 360 payloads that may include cost, compensation, bill-rate, cost-per-hour or admin-only context.
3. Nexa insights shown in `/my/performance` remain advisory-only. They explain operational signals and suggested focus areas; they are not HR performance evaluations, disciplinary feedback, payroll inputs or formal review records.
4. Mention rendering in `/my/performance` must be access-aware. Mentions to `member`, `space` and `project` may render as chips, but they must not create links to admin/agency surfaces unless the authenticated user already has the required access.
5. The UI must distinguish live/in-progress periods from closed/materialized periods and must not present small in-progress samples as final performance truth.
6. The visual pattern is self-service coaching dashboard, not admin inspection: clear period context, KPIs, Nexa guidance, trends and charts, with plain-language explanations and honest states.

## Alternatives Considered

### Alternative 1: Copy `PersonActivityTab` into `/my/performance`

Rejected. It would duplicate UI and data-fetch behavior, preserve admin navigation assumptions, and risk leaking links or context that belongs to People / Agency surfaces.

### Alternative 2: Open the admin ICO context endpoint to collaborators

Rejected. `GET /api/ico-engine/context?dimension=member&value=...` is guarded by agency context and accepts a member value. That is structurally wrong for self-service because it asks the client to supply the target member.

### Alternative 3: Keep `/my/performance` lightweight

Rejected. The route already exists, the collaborator owns the data subject relationship to their metrics, and the richer Person 360 Activity view demonstrates that Greenhouse has enough canonical data to provide a better self-service experience.

### Alternative 4: Create a new `/my/activity` route

Rejected for V1. `GH_MY_NAV.performance` and view code `mi_ficha.mi_desempeno` already establish the audience mental model. A new route would create navigation and documentation drift without adding a new capability.

## Product UI Architecture

### Surface Classification

- Primary archetype: self-service analytical dashboard.
- Secondary archetypes: data platform / analytical, B2B SaaS multi-tenant, AI advisory surface.
- Pattern family: dashboard with progressive disclosure, not work queue or admin inspector.

### First-Fold Reading Order

1. Current period context and health summary.
2. Core metrics the collaborator can act on: OTD, FTR, RpA, throughput/cycle-time.
3. Nexa advisory block with current/historical toggle when data exists.
4. Trend cards and deeper charts.

### Information Architecture

V1 should structure the view as:

1. Header / period selector:
   - title: "Mi Desempeno" or approved canonical copy.
   - selected period.
   - status chip for `current_period_partial`, `closed_snapshot`, `no_data` or `degraded`.
2. Nexa guidance:
   - `NexaInsightsBlock` using member-scoped payload.
   - advisory framing and self-service-safe mentions.
3. Metric summary:
   - KPI cards for RpA, OTD, FTR, throughput, cycle time and stuck assets as data permits.
4. Trends:
   - OTD/FTR trend cards aligned to closed month semantics.
5. Operational context:
   - task summary chips and pending-closures alert.
6. Deep charts:
   - radar health.
   - CSC distribution or pipeline velocity when data exists.

### State Model

The surface must represent these states distinctly:

- `loading`
- `ready`
- `empty_no_assignments`
- `empty_no_period_metrics`
- `partial_current_period`
- `pending_closures`
- `nexa_empty_pending`
- `nexa_empty_positive`
- `stale_degraded`
- `source_error`
- `permission_denied`
- `identity_not_linked`

Important rule: null metric values must not animate as zero and must not be colored as if they were measured.

### Action Model

V1 is read-only. Allowed actions:

- Change period.
- Refresh current data.
- Expand/collapse Nexa root-cause details.
- Switch Nexa recent/timeline mode when data exists.
- Navigate only to permitted contextual resources.

No mutation, writeback, review acknowledgement, goal creation, HR feedback, payroll adjustment or task reassignment belongs in V1.

### Responsive Model

- Desktop/laptop: header + KPIs + charts can use two-column composition.
- Mobile: single-column stack; period controls stay reachable; charts must keep stable height and textual framing.
- Charts require accessible labels and nearby textual context because color and shape alone are insufficient.

### UX Writing Model

Copy must frame the experience as personal operational guidance:

- Prefer: "senal operativa", "foco sugerido", "actividad del periodo", "datos parciales".
- Avoid: "evaluacion", "calificacion", "sancion", "bajo rendimiento" unless the domain is formal HR evaluation.
- Explain delayed/partial data without blame: "Este periodo aun esta en curso" instead of "sin resultados".

Reusable copy should live in `src/lib/copy/` when introduced.

## Runtime Contract

### Data Contract

`/api/my/performance` is the canonical product API for the web self-service surface. It composes server-side primitives and returns a redacted DTO shaped for collaborators.

Required V1 payload families:

- `period`: selected period, current Santiago period marker and closed/partial status.
- `ico`: safe member metrics and task context.
- `nexaInsights`: `MemberNexaInsightsPayload` or a self-service-safe subset.
- `trend`: safe OTD/FTR trend values with period labels.
- `operational`: task counts and chart inputs safe for self-service.
- `meta`: freshness, source, degraded sources and materialized timestamps.

Forbidden in the self-service DTO:

- compensation version IDs.
- monthly base salary / total comp.
- cost per hour, loaded cost, bill rate or suggested bill rate.
- admin-only capability decisions.
- arbitrary target `memberId` supplied by the browser.
- raw stack traces or unsanitized source errors.

### Access Contract

- Page guard: `mi_ficha.mi_desempeno` with existing route group fallback `my`.
- API guard: `requireMyTenantContext()`.
- Subject: session `tenant.memberId`.
- No broad People permission is implied by seeing `/my/performance`.
- Self-view does not grant access to `/people/[memberId]`, `/agency/spaces/[id]` or Nexa detail routes unless those surfaces authorize the user independently.

### Nexa Contract

The self-service view consumes materialized Nexa enrichments only. It does not:

- generate signals inline.
- call LLMs inline.
- mutate signal lifecycle.
- write reviews or acknowledgements.
- change payroll or HR evaluation state.

### Mention Contract

`NexaMentionText` must gain or be wrapped by a self-service rendering mode before use in `/my/performance`. In that mode:

- `project` remains non-clickable unless a collaborator-safe project route exists.
- `space` and `member` links require explicit access or render as non-clickable chips.
- labels remain visible and sanitized; IDs never become visible fallback labels.

### Observability Contract

The implementation should not add noisy alerts for ordinary no-data states. It should surface:

- API errors through existing logs/Sentry with sanitized messages.
- degraded source metadata in the response.
- optional follow-up reliability signal only if a recurring stale-data pattern is found during implementation.

## Implementation Implications

- Prefer extracting reusable presentation pieces from `PersonActivityTab` instead of duplicating the whole component.
- Keep the self-service DTO server-side and typed.
- Add focused tests for:
  - no user-supplied `memberId`.
  - redaction of restricted fields.
  - Nexa payload propagation.
  - mention navigation disabled/allowed behavior.
  - partial current-period state.
- Use Greenhouse Visual Capture with collaborator agent auth before declaring UI complete.

## Consequences

### Positive

- Gives collaborators parity of visibility into their own operational signals.
- Reduces drift between Person 360 Activity and `/my/performance`.
- Preserves anti-IDOR posture by keeping subject resolution server-side.
- Creates a reusable self-service redaction pattern for future personal analytics surfaces.

### Negative

- Requires additional DTO and UI extraction work.
- Requires careful copy to prevent Nexa advisory text from being interpreted as formal HR evaluation.
- Requires access-aware mention rendering before the existing `NexaInsightsBlock` can be used safely in `/my`.

### Neutral

- This decision does not create new storage.
- This decision does not change ICO metric definitions.
- This decision does not grant new People, Agency or Nexa detail permissions.

## Self-Critique

### What breaks in 12 months?

If Person 360 Activity keeps evolving independently, `/my/performance` can drift again. Mitigation: shared primitives/components and tests over DTO shape.

### What breaks in 36 months?

If Greenhouse ships a mobile app, the web-internal `/api/my/performance` may not be the right long-term contract. Mitigation: keep the business reader in `src/lib/**` so `api/platform/app/*` can expose a compact version later.

### Cognitive debt risk

Medium if the implementation copies chart logic into another large component. Low if the task extracts named reusable pieces and documents the self-service DTO.

### Lock-in

Low. The decision relies on existing Greenhouse primitives, MUI/Apex/Recharts already used in the repo, and existing ICO/Nexa readers.

### Observability gap

Current no-data states can hide stale pipelines if rendered too optimistically. TASK-1027 must preserve Nexa honest-degradation and period partiality.

### AI-specific risk

Nexa narratives can overstate causality or include context that reads like evaluation. The UI must label them advisory-only and avoid mutation pathways.

### Regional / compliance gap

The view handles collaborator operational data and may process Chilean personal data. Redaction and self-scoping are required; no compensation/cost fields should leak through the self-service DTO.

## Revisit When

Reopen this decision if:

- `/my/performance` needs to support formal HR performance evaluation workflows.
- first-party mobile app parity requires moving this contract to `api/platform/app/*`.
- Nexa starts emitting collaborator-facing recommendations that can mutate tasks, goals or reviews.
- self-service consumers need client/space/project drill-downs with new collaborator-safe routes.
- a security review finds mentions or DTO fields expose admin-only context.

## Delta 2026-06-10 — TASK-1027 implementation

Contract implemented faithfully (no material contract change). Implementation links + one finding worth recording:

- **Live PII leak closed (not just enrichment).** Pre-implementation, `/api/my/performance` returned raw `intelligence`/`intelligenceTrend` (= `PersonIntelligenceSnapshot` with `cost.{monthlyBaseSalary, monthlyTotalComp, compensationVersionId, loadedCostTarget, costPerHourTarget, suggestedBillRateTarget}`, populated unconditionally in `person-intelligence/store.ts`). The DTO rebuild **redacts by construction**: the composer `src/lib/my-performance/dto.ts` never imports the cost-bearing readers; it composes only `readMemberMetrics`/`computeMetricsByContext('member')`, `getPersonIcoProfile` (trend), `getPersonOperationalServing`, `readMemberAiLlmSummary`. A test forbids the cost keys. Tracked as `ISSUE-091` (resolved by this task).
- **Canonical files**: DTO + composer `src/lib/my-performance/dto.ts`; shared types `src/lib/my-performance/types.ts` (no `server-only`, so the client view imports them safely — TASK-827 bug class); route `src/app/api/my/performance/route.ts` (anti-IDOR, `invalid_period` validation, sanitized `internal_error`); safe mentions `NexaMentionText.safeMode` threaded through `NexaInsightsBlock`/`InsightCard`/`NexaInsightRootCauseSection`/`NexaInsightsTimeline`; shared presentation `src/lib/ico-engine/activity-presentation.ts`; view `src/views/greenhouse/my/MyPerformanceView.tsx`; coaching copy `src/lib/copy/my-performance.ts` (`GH_MY_PERFORMANCE`).
- **Period status state machine**: `current_partial | closed_snapshot | no_data | degraded`, plus `meta.degradedSources[]` for honest degradation. UI states covered: loading skeleton, no-data, current-partial, pending-closures, degraded, Nexa empty (block-owned).
- **Reviewable without personal metrics**: `/my/performance/mockup/runtime` renders the real `MyPerformanceView` with a rich fixture (`src/views/greenhouse/my/my-performance-mock.ts`) so admins (no personal ICO data) can review the full dashboard. GVC scenario `task-1027-my-performance` (desktop + mobile, fullPage).
- **No new storage / no new capability**: page guard `mi_ficha.mi_desempeno` + API `requireMyTenantContext()` (both pre-existing).

## Related Tasks

- `TASK-1027` — My Performance rich self-service activity runtime.
- `TASK-080` — ICO Person Intelligence frontend integration (historical debt).
- `TASK-243` — Nexa Insights in Person 360 Activity.
- `TASK-945` / `TASK-946` — Nexa lifecycle timeline and honest degradation states.
