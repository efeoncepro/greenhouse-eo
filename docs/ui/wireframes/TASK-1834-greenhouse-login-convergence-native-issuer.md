# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (wireframe)

## Meta

- Status: `draft`
- Owner task: `TASK-1834`
- Visual direction mode: `repo-native-benchmark`
- Durable source: current `/login` implementation in `src/views/Login.tsx`; this task adds one provider without redesigning the surface.
- UI ready target: `no` until the runtime baseline, copy, GVC scenario and scorecard are completed.
- Primitive decision: `reuse` — existing provider-button pattern.

## Brief

The existing Greenhouse login remains the visual and interaction baseline. Efeonce ID appears as an additive
provider alongside Microsoft, Google, credentials and magic link. The surface must make login distinct from
invitation/signup, preserve recovery paths when the issuer is unavailable, and never reveal whether a person,
principal or organization exists.

## Desktop Target — 1440x900

- Preserve the current authentication composition, brand region, form width and provider hierarchy.
- Add one provider action using the same geometry and focus treatment as Microsoft/Google.
- Keep credentials and magic link visible according to their current configuration.
- Show callback/provider failures in the existing inline error region, followed by usable alternatives.

## Mobile Target — 390x844

- One readable column with every configured method reachable without horizontal scroll.
- Provider labels wrap or truncate accessibly without shrinking the touch target.
- Error summary precedes alternatives in DOM and focus order.

## Action Hierarchy

- Primary: unchanged from the current login policy.
- Provider action: `Continuar con Efeonce ID`, at the same hierarchy level as other federated methods.
- Recovery: Microsoft, Google, credentials and magic link remain available; an Efeonce ID failure never disables them.
- Pending: only the selected action is disabled and marked busy.

## Visual Fidelity Mapping

| Current cue | Decision | Contract |
|---|---|---|
| Existing provider list | Reuse | No new card, shell or provider-specific layout |
| Existing button states | Reuse | Hover, focus, disabled and pending remain token-driven |
| Existing inline alerts | Extend copy only | Sanitized error, no raw OAuth code or identifier |
| Existing responsive form | Preserve | `scrollWidth === clientWidth` at 1440 and 390 |

## Layout Skeleton

| Region | Purpose | Candidate | Data source |
|---|---|---|---|
| Brand/context | Existing product identity | current login composition | static/canonical copy |
| Error summary | Degraded/denied callback result | existing alert pattern | sanitized error enum |
| Provider list | Microsoft, Google, Efeonce ID | existing provider actions | server readiness/flags |
| Credentials | Existing fallback | current form | NextAuth credentials path |
| Passwordless link | Existing fallback | current magic-link link | portal magic-link route |

## State & Copy Inventory

| State | Visible result | Recovery |
|---|---|---|
| default | Efeonce ID appears only when its global flag/readiness passes | choose any configured method |
| pending | selected provider action busy; no double redirect | wait or return after failure |
| provider degraded | Efeonce ID disabled/hidden consistently with provider readiness | use a classic method |
| identity denied | one anti-enumeration message for unlinked/inactive/ambiguous/mismatch/revoked | use another method or contact support |
| callback unavailable | sanitized temporary failure | retry or use another method |

Reusable copy lives in `src/lib/copy/*`; no literal provider errors belong in `Login.tsx`.

## Accessibility Contract

- Existing heading structure and landmarks remain unchanged.
- Every provider has visible text and an accessible name.
- Inline error uses the existing alert semantics; focus moves to its summary after callback failure.
- Keyboard order follows visual order and all methods remain reachable.
- State is never communicated only by color; reduced motion preserves the same meaning.

## Implementation Mapping

- Route / surface: `src/app/(blank-layout-pages)/login/page.tsx` and `src/views/Login.tsx`.
- Provider/session: `src/lib/auth.ts` plus the canonical subject-to-`TenantAccessRecord` resolver.
- Provider readiness: extend the existing server-provided readiness model; the UI does not query identity stores.
- Primitive: reuse the current provider-button pattern; do not create a new Greenhouse primitive.
- Copy: `src/lib/copy/*`.
- Access: resolved server-side from canonical identity, organization, workforce and session readers.
- Data markers to add: login surface, provider list, Efeonce ID action and error summary.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1834-greenhouse-login-convergence.scenario.ts`.
- Route: `/login`.
- Viewports: `1440x900`, `390x844`.
- Quality profile: `premium`.
- Captures: default, keyboard focus, pending, provider degraded and callback denied.
- Assertions: classic methods remain reachable; no raw error/PII; no double submit; `scrollWidth === clientWidth`.
- Evidence: keyboard/focus and reduced-motion runs plus review dossier.
- Baseline: current `/login` runtime captured immediately before the first UI change.

## Design Decision Log

- Decision: additive provider within the existing login; global visibility is controlled by flag/readiness and authorization occurs after callback.
- Alternatives: pre-auth organization discovery, email-first discovery and tenant-scoped URL.
- Why: anonymous login has no trusted organization context and email is not authority; the chosen pattern avoids enumeration and preserves a simple rollback.
- Reuse / extend / new primitive: `reuse`.
- Open risk: exact placement and copy remain subject to first-fold review; therefore `UI ready: no`.

## Acceptance Checklist

- [ ] Runtime baseline, implementation mapping and copy are current before JSX changes.
- [ ] All configured classic methods remain visible/reachable with the new provider ON and OFF.
- [ ] Desktop/mobile, keyboard, reduced-motion and scroll-width evidence pass.
- [ ] Error states are anti-enumeration and preserve a recovery path.
