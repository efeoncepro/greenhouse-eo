# GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1

- **Status:** Accepted
- **Date:** 2026-08-18
- **Owner:** Hiring / Notifications Platform
- **Scope:** assessment candidate-test access recovery, Resend delivery lifecycle, Application 360 consumers, capabilities, audit and outbox.
- **Reversibility:** Two-way but slow
- **Confidence:** High.
- **Validated as of:** 2026-08-18 — production DB, Vercel runtime, Resend API, code and official Resend documentation.
- **Accepted:** 2026-08-19. Product/Privacy approval: Julio Reyes, explicit operator approval in the ISSUE-160 execution session. Security review: Codex threat-model audit `audit_1746_security`; Architecture and Talent reviews: `audit_1745_architecture` and `audit_1745_talent`.
- **Amended:** 2026-08-20 (TASK-1757) — a credential-free candidate notice was added to the `secure_link` channel, which Privacy had approved without one. See `## Amendment 2026-08-20`.

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
prohibition applies to its durable stores and telemetry. Existing legacy path links remain valid only for
compatibility. Recovery always uses the fragment/session boundary; assignment switches to it only after the
default-OFF `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` cutover passes migration/index readback,
live-route, Resend `click_tracking=false` and href smoke evidence. Until then, assignment deliberately preserves
the legacy URL so deploying dormant code cannot alter outbound email behavior.

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
- Public exchange/session traffic uses two durable budgets: a high aggregate IP ceiling before lookup and a
  credential/session budget claimed only after validity is established under the same canonical locks. Raw IPs
  and bearers are never stored; valid attempts consume their functional budget even when the requested action or
  session issuance fails. Expired sessions and buckets are drained by the ops-worker retention owner with bounded
  loops, readback and a residual-backlog signal.
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

## Amendment 2026-08-20 — the candidate is told when their access is rotated (TASK-1757)

**This changes what Privacy approved.** The decision above specifies `secure_link` as a hand-delivered
credential and says nothing about notifying the candidate; the approval covered the flow *as specified*, so a
new candidate-facing outbound email is a change to it, not an implementation detail. It is recorded here so a
later reader does not read the original silence as deliberate and remove the notice.

The omission was not a decision. Notifying the candidate appears neither in the decision nor among its
non-goals. What the TASK-1747 Slice 4 adversarial audit surfaced, and two independent reviews confirmed
(Talent domain and Architecture, 2026-08-20), is that issuing a secure link **kills the candidate's previous
credential** and hands the new one to the operator. If that hand-off fails — the operator gets distracted,
copies it wrong, the person never answers — the candidate is locked out, does not know why, and their clock
keeps running: §2 is explicit that recovery never extends a deadline. Eligibility also permits recovery while
the assessment is `in_progress`, so someone can be answering in another tab and be evicted silently. A
candidate who does not sit the test because of an infrastructure failure does not enter the pool as
"not evaluated"; they enter as absence of evidence, which reads in practice as a rejection — and that lands
asymmetrically on whoever is least able to insist.

The notice is therefore added, subject to the constraints of the original decision:

- It **never** carries the link, the token, or anything derivable from them. Including it would defeat the
  identity verification that is the channel's entire reason to exist.
- It **never** uses the `token_sensitive` lane: there is no credential to bind, and the receipt CHECK forbids
  a `delivery_id` on a `secure_link` row. The recovery ledger receives no new writes; the notice's trace is
  its own `email_deliveries` row (`source_entity = recoveryId`).
- It is **fail-closed on feasibility**: the declared reason sets intent, provider state sets feasibility, and
  feasibility wins. It is skipped when the operator already declared the send failed, when there is no
  candidate email, when the provider blocked that mailbox, and when the credential is already expired or its
  expiry is unreadable.
- It hangs off the domain event `hiring.assessment.access_recovery_recorded`, not the route handler, so every
  consumer of the command notifies by construction. Dedupe is per recovery, not per assessment or per event.
- It ships disabled by seed (`email_type_config.hiring_assessment_access_rotated`), reversible with
  `SET enabled = FALSE` and no redeploy.

The "reply to this email and we will reissue it" paragraph is not a courtesy close: it is the condition that
makes a credential-free notice legitimate. It required adding `Reply-To` to the email platform, which did not
exist — a candidate reply previously landed on the provider's sending address.

Authorization: CEO sign-off on the copy, the conditionality and the flip (2026-08-20), including the commitment
that `people@efeoncepro.com` is an attended mailbox. Coverage signal:
`hiring.assessment.access_recovery.rotation_unnotified` (steady 0), which exists because
`hiring.assessment.access_never_exchanged` joins against `email_deliveries` and a `secure_link` recovery
produces no delivery row — the one channel that can fail silently was the one no signal could see.

Open, and owned by People Ops rather than by this decision: whether a failed hand-off should restore time to
the candidate. Today the system says no, which is a policy, not a defect.

### As-built — 2026-08-20

TASK-1746 is operational: migration `20260819072130586_task-1746-assessment-access-recovery.sql` and the
concurrent token-intent index were applied on 2026-08-19, both recovery capabilities are live, and the recovery
email type is enabled. TASK-1747 shipped the Application 360 consumer: the ephemeral link no longer exists in
the client, assignment goes through the TASK-1719 propose→confirm path, and the legacy
`POST /api/hiring/assessments` with `method='candidate_test'` now answers **410**
(`interviewer_scorecard` is unaffected). A read lane `GET .../access-recovery` was added for parity, gated on
at least one recovery capability plus a mandatory `applicationId` binding — deliberately stricter than
`hiring.assessment.read`, which every internal tenant carries. TASK-1757 shipped the rotation notice above and
its signal.

Still pending: `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` remains OFF in the ops-worker, so assignment
email keeps the legacy URL until the Resend `click_tracking=false` readback and href smoke are done — the apex
domain currently rewrites links, which would discard the fragment. No real rotation has yet been exercised with
the notice flag ON. Per-flag runtime detail lives in `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

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
