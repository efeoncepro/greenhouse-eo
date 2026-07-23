# TASK-1524 — Globe Commercial Login Cinematic Threshold Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1524 — Globe Commercial Login Cinematic Threshold`
- Related wireframe: `docs/ui/wireframes/TASK-1524-globe-commercial-login-cinematic-threshold.md`
- Intended route/surface: Globe anonymous root → existing OAuth → `/producer`.
- Flow type: `cross-route`
- Primary primitives: native link/button, inline status/error, decorative media stage.
- Copy source: `globe.login.*`

## Flow Brief

- Primary user: cliente/equipo con cuenta; visitante comercial sin cuenta only if acquisition URL exists.
- Entry moment: anonymous root, expired session or OAuth recovery.
- Successful outcome: authenticated session reaches `/producer`.
- Primary decision/action: enter Globe.
- Non-goals: signup, plan selection, onboarding, pricing or auth contract changes.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile/compact behavior | Primitive |
|---|---|---|---|---|
| Anonymous root | promise + access | full-bleed stage | vertical stage | native document |
| Auth start | existing redirect | immediate navigation | immediate navigation | anchor/link |
| Callback/error | session/recovery | safe inline state | same hierarchy | server route + alert |
| Producer | destination | direct redirect | direct redirect | existing surface |

## Flow Map

1. Entry: server checks session before rendering.
2. If valid: redirect directly to `/producer`.
3. If anonymous: render poster/copy/CTA; media enhances independently.
4. Primary action: CTA starts `/auth/start` immediately and shows pending only until navigation.
5. Callback success: existing authority creates session and redirects `/producer`.
6. Recovery: expired/denied/error renders safe message and stable action.
7. Visitor without account: acquisition link appears only with canonical commercial destination.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Enter Globe | CTA | `/auth/start` | Enter | no animation delay |
| Pause animation | media control | paused poster/frame | Enter/Space | state label flips |
| Resume animation | media control | playing from supported point | Enter/Space | one-shot remains |
| Retry | error state | auth/root | Enter | correlation retained server-side |
| Learn about Globe | utility link | approved commercial URL | Enter | absent until real |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| poster | first server render | anonymous request | media eligible | H1/CTA ready |
| playing | decorative media running | enhancement | pause/end | pause control |
| paused | user stopped media | pause | resume | static meaning |
| settled | media completed | ended | none/replay if approved | no loop |
| static | reduced/data/error/no-JS | environment | none | poster equivalence |
| connecting | auth navigation begun | CTA | navigation/error | no double submit |
| denied | authority rejected | callback | retry/exit | safe copy |
| error | typed failure | callback/runtime | retry | correlation secondary |
| complete | session valid | server/callback | `/producer` | no login flash |

## Routing Contract

- Route changes: `path`
- Canonical URL: Globe root and existing auth routes.
- Deep-link behavior: root with valid session redirects `/producer`.
- Back button behavior: returning from provider cannot resubmit a stale callback; existing semantics prevail.
- Reload behavior: session is re-evaluated server-side.
- Shareability: root is shareable; auth callback/error query material is not.

## Focus & Accessibility

- Initial focus: document/main; skip link available.
- Escape behavior: none; no modal.
- Click-away behavior: none.
- Focus restore: error heading/alert after callback; Producer heading on success.
- Modal vs non-modal semantics: no overlay.
- Screen reader announcement: auth status polite; blocking session error assertive only when required.
- Keyboard traversal: logo/utility → main CTA → pause control → footer in DOM/visual order.
- Reduced motion: static poster and no autoplay.

## Data & Command Boundaries

- Readers: existing session authority only.
- Commands: none.
- API routes: existing auth/session routes unchanged.
- Optimistic updates: none.
- Cache/invalidation: media immutable/versioned; HTML/session follows existing policy.
- Audit/signals: existing OAuth/session signals; media failure is non-blocking client telemetry if approved.
- Tenant/access boundary: server-only; browser never infers membership/capability.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | safe no-access state | retry/account support | no workspace disclosure |
| media not found | poster remains | none | silent decoration failure |
| partial/degraded auth | calm retry state | retry | no raw provider error |
| stale session | expired copy | re-enter | work preserved claim only if true |
| timeout/API error | typed error | retry | correlation only here |
| dirty exit | n/a | n/a | login owns no draft |

## GVC Scenario Plan

- Scenario: `globe-commercial-login`
- Scenario file: `scripts/frontend/scenarios/globe-commercial-login.scenario.ts`
- Route: root/auth recovery/producer redirect.
- Viewports: `1440×1000`, `390×844`.
- Required steps: poster→playing→paused→settled; reduced/static; CTA→pending; denied/error; valid session redirect.
- Required captures: temporal frames and destination/recovery states.
- Required `data-capture` markers: `globe-commercial-login`, `globe-cinematic-stage`,
  `globe-login-primary-action`, `globe-motion-control`, `globe-login-state`.
- Assertions: no login flash for session; no delayed auth; safe errors; static equivalence.
- Scroll-width checks: root/stage/footer.
- Accessibility/focus checks: tab/Enter/Space, live region and error focus.
- Reduced-motion evidence: poster only and same CTA/copy.

## Design Decision Log

- Decision: cross-route auth stays server-owned; cinematic stage is orthogonal decoration.
- Alternatives considered: animation-gated entrance; in-page credential form; modal OAuth.
- Why this pattern: preserves auth authority and immediate action.
- Reuse/extend/new primitive: reuse routes, extend only anonymous shell.
- Open risks: acquisition URL and provider back-navigation behavior.
- Follow-up: commercial signup/onboarding if product owner defines it.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, pause, recovery and focus are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Existing auth/session boundaries are named.
- [ ] Failure paths are safe and do not expose internals.
- [ ] GVC captures prove temporal and route flow.
- [ ] Decision log explains why auth is not animation-gated.
