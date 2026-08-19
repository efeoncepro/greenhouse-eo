# TASK-1746 implementation plan

- **Status:** auto-approved — P0, effort Medio, explicit operator goal and ADR accepted 2026-08-19.
- **Execution:** sequential slices in the shared `develop` checkout; no worktrees.
- **Issue:** ISSUE-160.

## Discovery

- The legacy assignment consumer rotates the assessment token and passes `assessmentUrl` inside
  `sendEmail.context`; the generic delivery ledger persists that context and can replay it.
- New bearer URLs in a path would be visible to ingress telemetry before application-level
  redaction. New links therefore require a fragment-to-HttpOnly-session boundary.
- `token_expires_at` currently governs both pre-start access and `in_progress`; a 24h manual link
  needs a start-by deadline plus a separate started-session deadline so it cannot cut off a test.
- No recovery ledger, rate limit, capability, route or resend command exists. Application 360 is
  the first consumer in TASK-1747.

## Decisions bound from the accepted ADR

- Channels are mutually exclusive: `email` or `secure_link`.
- Email start-by TTL 14d; secure-link start-by TTL 24h. On start, access remains valid through the
  effective time limit plus 30m grace; recovering `in_progress` never extends that deadline.
- Two role-only capabilities separate email dispatch from human bearer reveal.
- One global 60s cooldown and maximum 3 successful rotations/assessment/24h.
- Idempotency replay never re-reveals a link. Audit/outbox/delivery payloads are IDs-only and token-free.

## Slices

1. **Data/access contract** — additive recovery/session schema, two capabilities + grants, event
   catalog, reason/outcome/error types, migration and boundary tests.
2. **Sensitive delivery + command** — explicit token-sensitive `sendEmail` persistence mode,
   historical payload sanitizer, locked/idempotent recovery command, provider lifecycle guard and
   email delivery outcome.
3. **Candidate session boundary** — fragment exchange, secure HttpOnly cookie, token-free public
   page/API adapter, start/session expiry semantics and legacy-path compatibility.
4. **API/evidence** — Product API with same-origin and anti-oracle guards, live/focused tests,
   reliability signal, technical/functional/operator docs and controlled smoke plan.

## Progress

- 2026-08-19 — Slice 1 code complete and independently validated. Schema/capabilities/contracts
  remain unapplied until Slice 2 provides the only governed writer and the PostgreSQL smoke can
  exercise deferred constraints, effective ACLs, automatic events and retention transitions.

## Skills

- `greenhouse-talent-people-operator`: Hiring state, candidate continuity and operator outcomes.
- `software-architect-2026`: command/idempotency, API parity, transaction and session boundaries.
- `greenhouse-secret-hygiene`: token/URL persistence and telemetry controls.
- `greenhouse-documentation-governor`: ADR/task/runbook lifecycle.
- UI skills are deferred to TASK-1747; the TASK-1746 access page is a minimal security adapter,
  not a visual redesign.

## Subagent strategy

- After each implementation slice, independent Architecture and Talent audits run read-only.
- Security re-audits every slice that emits/transports a bearer or changes session/persistence.
- The root agent corrects blockers and requests a second pass before advancing.

## Verification gates

- Focused unit/contract/live tests, ESLint, TypeScript and migration marker gate.
- Sentinel scan proves token absence from delivery payload, audit, outbox, logs and DTOs.
- Concurrency/idempotency tests prove one rotation; replay proves no second reveal.
- Session tests cover 24h start-by, in-progress deadline, terminal states, Origin/auth and cookie flags.
- Staging and production smokes remain rollout gates; code completion is not operational completion.

## Rollback

- Revoke both capabilities and disable route consumers; preserve append-only audit.
- Candidate session adapter is additive; legacy path remains available during rollback.
- A deliberate rotation cannot be undone; a fresh governed recovery is the only restoration path.
