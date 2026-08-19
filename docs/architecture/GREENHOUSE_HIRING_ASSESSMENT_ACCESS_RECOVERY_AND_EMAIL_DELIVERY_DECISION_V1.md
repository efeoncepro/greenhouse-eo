# GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1

- **Status:** Accepted
- **Date:** 2026-08-18
- **Owner:** Hiring / Notifications Platform
- **Scope:** assessment candidate-test access recovery, Resend delivery lifecycle, Application 360 consumers, capabilities, audit and outbox.
- **Reversibility:** Two-way but slow
- **Confidence:** High.
- **Validated as of:** 2026-08-18 — production DB, Vercel runtime, Resend API, code and official Resend documentation.
- **Accepted:** 2026-08-19. Product/Privacy approval: Julio Reyes, explicit operator approval in the ISSUE-160 execution session. Security review: Codex threat-model audit `audit_1746_security`; Architecture and Talent reviews: `audit_1745_architecture` and `audit_1745_talent`.

## Context

Greenhouse successfully dispatches transactional email through Resend, but it does not currently capture provider delivery events. The historical UI link is a transient React state and is invalidated when the lifecycle email consumer rotates the assessment token. Once a candidate reports non-delivery, the operator has no governed resend or alternate-channel recovery path.

The result is an operational dead end: `sent` means only that Resend accepted the request, while a real candidate may never receive a usable access link. Existing direct assignment UI also bypasses the stage-policy path introduced by TASK-1719.

## Decision

### 1. Delivery lifecycle is provider-confirmed, not inferred from dispatch

`sent` is renamed in product semantics to **accepted for dispatch**. Only an authenticated provider event may establish delivery, bounce, complaint, delay, failure or suppression. Resend is the provider-native source of those events; its signed, at-least-once webhooks are deduplicated by `svix-id` and may arrive out of order. The handler must await secret resolution and return a retryable failure when its signing secret is unavailable; it must never acknowledge an event as ignored because of a missing runtime prerequisite.

### 2. Recovery is a capability, not a token lookup

Greenhouse adds two governed capabilities: `hiring.assessment.recover_access_email` and
`hiring.assessment.reveal_access_link`. They are valid for the exact candidate-test lineage
assessment → application → opening when the assessment is `assigned`, `sent` or `in_progress`.
An `expired` assessment is recoverable only when it never started and the token lifetime was the
reason it expired. A recovery creates one fresh token, invalidates the previous token atomically
and records actor, reason code, channel and outcome without retaining the raw token in database,
outbox, logs, analytics, Sentry or audit payloads. It never restarts or extends an assessment
timer, changes stage/score or creates a second assessment.

It supports exactly one chosen channel per recovery:

- **email:** a distinct recovery delivery is dispatched through the canonical email layer with its
  own idempotency key; replaying the original assignment event is forbidden. The start-by lifetime
  is 14 days. Provider `bounced`, `complained` or `suppressed` evidence for the same recipient
  blocks this channel and leaves the manual channel available.
- **secure_link:** the fresh URL is returned to the authorized human operator only once, explicitly
  labelled as a bearer link for a verified manual conversation such as WhatsApp. Its start-by
  lifetime is 24 hours. It is not exposed to MCP, workers, apps or service principals.

“One-time” means one reveal to the operator, not one HTTP use by the candidate. The candidate may
reload, save and submit while the assessment remains valid. When the test starts, the same access
session remains valid until `started_at + effective_time_limit + 30 minutes`; a test without a
time limit gets 24 hours from `started_at`. A recovery of an `in_progress` test uses the existing
deadline and never extends it. A later recovery invalidates the prior recovery link by design.

### 2.1 Idempotency, rate limits and outcomes

- Rotation is serialized with the assessment row locked. The token has at least 192 bits of
  entropy and only its SHA-256 hash is durable.
- Idempotency is scoped to actor + assessment + channel and binds an immutable request
  fingerprint. Reusing a key with different input is a conflict. Replaying an email request
  returns its existing metadata; replaying `secure_link` never reveals the URL again.
- A fresh request is subject to one global cooldown of 60 seconds and at most three successful
  rotations per assessment in 24 hours. Switching channels does not evade the limit. Failed or
  ambiguous dispatches remain observable and permit an explicit fresh recovery without claiming
  delivery.
- Email outcomes are `dispatch_accepted`, `dispatch_failed` or `dispatch_unknown`; accepted means
  provider API acceptance, never receipt. A secure-link outcome is `link_issued` and the response
  is `private, no-store`.
- Reasons are enumerated only:
  `candidate_reports_email_not_received`, `candidate_reports_link_invalid`,
  `alternate_channel_requested`, `provider_delivery_failed` and
  `token_expired_before_start`. Free text, phone/chat identifiers and candidate diagnoses are
  forbidden.

### 2.2 Bearer transport and public-session boundary

New assessment links never put the bearer in a path or query string. They use an allowlisted
canonical origin and a fragment (`/public/assessment/access#access=<token>`), which browsers do not
send in HTTP requests. The access page removes the fragment immediately, exchanges it through a
same-origin POST body for an `HttpOnly; Secure; SameSite=Lax` session cookie and continues through
token-free page/API URLs. Responses use `Cache-Control: private, no-store`, `Pragma: no-cache` and
`Referrer-Policy: no-referrer`.

Resend and the operator-selected manual channel necessarily transport the bearer. Greenhouse's
prohibition applies to its durable stores and telemetry. Existing legacy path links remain valid
only for compatibility; every new assignment and recovery uses the fragment/session boundary.

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
- Raw test tokens never enter outbox/event payloads. Token-sensitive email renders in memory and
  persists only an allowlisted metadata payload marked non-retryable; encryption is not an
  acceptable substitute for redaction. Generic delivery retry must refuse that payload. A new
  operator recovery rotates again after a failed or unknown dispatch.
- The candidate-facing boundary for newly issued links is `/public/assessment/access` plus an
  HttpOnly session. Legacy `/assessment/[token]` remains compatibility-only; no internal state,
  score, reason or recovery history is exposed.
- Recovery audit is append-only and IDs-only: recovery/assessment/application/opening/actor IDs,
  channel, reason code, opaque token-version ID, timestamps, expiry, idempotency digest, delivery
  ID and outcome. It contains no name, email, phone, URL, token, free text or raw error. Retention
  follows an active application and then 12 months after rejection/withdrawal; consent withdrawal
  triggers the canonical purge/pseudonymization path, while selected candidates move to workforce
  retention.

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

Both capabilities are role-only for `EFEONCE_ADMIN`, `HR_MANAGER` and
`EFEONCE_OPERATIONS`, with the existing application reader and exact lineage required. Capability
is checked before lookup to avoid an existence oracle; actor identity comes only from the session.
The secure-link adapter additionally requires same-origin POST validation and is unavailable to
non-human credentials. Privacy/Security approved the 24-hour start-by TTL, the 12-month audit
retention and the guidance to share only in a verified conversation with the candidate.

## Rollout and evidence

1. Repair and deploy the webhook handler with no subscription enabled; test signed verification and missing-secret failure behavior. Verify that an outbound email dispatch succeeds independently from the webhook route.
2. Register the Resend webhook, store its secret, then perform one consented production canary that proves event → DB transition before subscribing to the full lifecycle event set.
3. Reconcile recent dispatches through Resend’s email retrieval API, preserving `unknown` where a terminal event cannot be verified.
4. Ship the recovery primitive behind its two capabilities and verify rotation, in-progress timing,
   fragment-to-session exchange, audit, email dispatch and no raw-token persistence. Sanitize
   historical `delivery_payload` rows containing `assessmentUrl`; separately rotate any still-live
   affected assessment through an explicit governed recovery.
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
