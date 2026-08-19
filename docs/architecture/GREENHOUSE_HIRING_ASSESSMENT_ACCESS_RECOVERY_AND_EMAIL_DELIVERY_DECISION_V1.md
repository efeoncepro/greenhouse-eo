# GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1

- **Status:** Proposed
- **Date:** 2026-08-18
- **Owner:** Hiring / Notifications Platform
- **Scope:** assessment candidate-test access recovery, Resend delivery lifecycle, Application 360 consumers, capabilities, audit and outbox.
- **Reversibility:** Two-way but slow
- **Confidence:** High for the observed failure; medium for the temporary-link policy pending Privacy/Security sign-off.
- **Validated as of:** 2026-08-18 — production DB, Vercel runtime, Resend API, code and official Resend documentation.

## Context

Greenhouse successfully dispatches transactional email through Resend, but it does not currently capture provider delivery events. The historical UI link is a transient React state and is invalidated when the lifecycle email consumer rotates the assessment token. Once a candidate reports non-delivery, the operator has no governed resend or alternate-channel recovery path.

The result is an operational dead end: `sent` means only that Resend accepted the request, while a real candidate may never receive a usable access link. Existing direct assignment UI also bypasses the stage-policy path introduced by TASK-1719.

## Decision

### 1. Delivery lifecycle is provider-confirmed, not inferred from dispatch

`sent` is renamed in product semantics to **accepted for dispatch**. Only an authenticated provider event may establish delivery, bounce, complaint, delay, failure or suppression. Resend is the provider-native source of those events; its signed, at-least-once webhooks are deduplicated by `svix-id` and may arrive out of order. The handler must await secret resolution and return a retryable failure when its signing secret is unavailable; it must never acknowledge an event as ignored because of a missing runtime prerequisite.

### 2. Recovery is a capability, not a token lookup

Greenhouse adds the governed capability `hiring.assessment.recover_access`. It is valid only for an unstarted candidate test in `assigned` or `sent`. It creates one fresh token, invalidates the previous token atomically and records actor, reason code, channel and outcome without retaining the raw token in database, outbox, logs or audit payloads.

It supports exactly one chosen channel per recovery:

- **email:** a distinct recovery delivery is dispatched through the canonical email layer with its own idempotency key; replaying the original assignment event is forbidden.
- **secure_link:** the fresh URL is returned to the authorized operator only once, explicitly labelled as a bearer link for a manual channel such as WhatsApp, with a bounded expiry set by the accepted recovery policy.

Neither channel creates a second assessment, recovers an old token, moves the application, changes a score or decides a candidate. A later recovery invalidates the prior recovery link by design.

### 3. One canonical assignment path for operators and automation

Application 360 becomes a consumer of the TASK-1719 policy/command path. Its legacy direct assignment route ceases to be an operator flow. The automatic trigger remains `shortlisted` by default; it is deterministic and never derives eligibility from score, match or inferred traits.

## Alternatives considered

1. **Copy the legacy link or recover the stored token.** Rejected: the raw token is intentionally not a reader value, may be rotated and is not a safe operational credential.
2. **Cancel then assign a second test.** Rejected: it damages candidate continuity, creates unnecessary lifecycle history and does not prove email delivery.
3. **Replay `hiring.assessment.assigned`.** Rejected: delivery dedupe prevents a reliable resend and a replay can conflict with token rotation.
4. **Use only Resend’s provider API polling.** Rejected as the primary model: polling is useful for bounded reconciliation, but signed webhooks are the real-time lifecycle integration. A short reconciliation window remains the recovery control.
5. **Let any operator share a permanent URL.** Rejected: a bearer URL needs explicit authorization, one-time reveal, bounded expiry and audit.

## Runtime contract

- `src/app/api/webhooks/resend/route.ts` authenticates Resend/Svix requests, awaits secret resolution, deduplicates by `svix-id`, processes supported lifecycle events idempotently and leaves an auditable delivery state.
- `greenhouse_notifications.email_deliveries` remains the Greenhouse delivery record; it records accepted-for-dispatch separately from provider-confirmed lifecycle facts.
- The recovery command lives under `src/lib/hiring/assessment/**`; Product API, Application 360, workers, CLI and future governed-action consumers delegate to it.
- Raw test tokens never enter outbox/event payloads. Any token-bearing email rendering context must be redacted from durable generic delivery payloads.
- The candidate-facing public assessment boundary remains `/assessment/[token]`; no internal state, score, reason or recovery history is exposed.

### Outbound non-disruption invariant

The Resend webhook is an inbound, observer-only integration. It never sits on
the `emails.send` request path, blocks a transactional email, or changes the
sender/ops-worker delivery contract. A failure to receive or process a webhook
may affect lifecycle visibility only; Resend retries the notification and the
outbound email keeps its existing behavior. Activation is staged as handler
deploy without subscription → signed staging smoke → one consented production
canary → full event subscription. The immediate rollback is to disable/delete
the Resend webhook, which leaves outbound sending intact.

## Required authorization and privacy gate

The new capability is role-only for `EFEONCE_ADMIN`, `HR_MANAGER` and `EFEONCE_OPERATIONS` unless a later entitlement decision narrows or expands it. The secure-link channel requires Privacy/Security sign-off on TTL, audit retention and operator guidance before this ADR can be accepted. Reasons are enumerated operational codes; no candidate diagnosis or sensitive circumstance is persisted.

## Rollout and evidence

1. Repair and deploy the webhook handler with no subscription enabled; test signed verification and missing-secret failure behavior. Verify that an outbound email dispatch succeeds independently from the webhook route.
2. Register the Resend webhook, store its secret, then perform one consented production canary that proves event → DB transition before subscribing to the full lifecycle event set.
3. Reconcile recent dispatches through Resend’s email retrieval API, preserving `unknown` where a terminal event cannot be verified.
4. Ship the recovery primitive behind its capability and verify rotation, audit, email dispatch and no raw-token persistence.
5. Ship the Desk consumer and train operators on email resend versus explicit manual-link sharing.

## Revisit when

- Privacy/Security rejects the manual bearer-link channel or changes TTL/retention requirements.
- Resend changes webhook signing, event semantics or retry guarantees.
- Delivery events show persistent provider delay/failure beyond the operational SLA.
- A future candidate self-service account provides a safer authenticated recovery channel.

## Sources

- [Resend — Send email](https://resend.com/docs/api-reference/emails/send-email)
- [Resend — Managing webhooks](https://resend.com/docs/webhooks/introduction)
- [Resend — Event types](https://resend.com/docs/webhooks/event-types)
- [Resend — Retries and replays](https://resend.com/docs/webhooks/retries-and-replays)
