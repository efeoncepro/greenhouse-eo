# TASK-1724 — Talent Pool Consent and Self-Service Flow

## Purpose

Make current-process consent, future-opportunity consent, availability and withdrawal independently understandable,
recoverable and auditable without creating a candidate account.

## Actors and boundaries

- Candidate: controls optional membership and availability through the public form or a scoped token.
- Public UI: renders allowlisted status and submits commands; never decides eligibility or token validity client-side.
- TASK-1723: owns lifecycle, policy, idempotency, anti-oracle errors, audit and outbox.
- People: may request repermission only through an approved, auditable operation; no bulk campaign in this task.

## Flow A — new application

```text
open application
  → mandatory current-process consent unchecked
  → optional Talent Pool consent independently unchecked
  → candidate submits
      ├─ invalid current-process consent → field/error summary
      ├─ accepted + pool unchecked → application created; membership=active_process/needs_reconsent
      └─ accepted + pool checked → record versioned pool consent; application receipt remains generic
```

## Flow B — self-service token

```text
open /public/careers/talent-profile/[token]
  → server validates purpose, expiry, replay and candidate binding
      ├─ invalid/expired/replayed → generic unavailable + safe recovery
      └─ valid → allowlisted status/purpose/expiry/availability
          ├─ join/renew → confirm → command → receipt/readback
          ├─ update availability → command → inline receipt/readback
          └─ withdraw → dialog → command → withdrawn readback + token invalidation
```

## Flow C — legacy cohort

```text
backfill classifies historical candidate as needs_reconsent
  → profile may be visible internally with allowedActions excluding contact/invite
  → People proposes approved repermission request
  → candidate receives scoped token only after Legal/Privacy gate
  → no response = remains needs_reconsent until retention expiry; never auto-opt-in
```

## Failure and recovery

- Duplicate submit returns prior receipt; no duplicate consent event.
- Withdrawal wins against concurrent availability/renewal; UI refreshes authoritative state.
- Dependency unavailable preserves the prior state and offers retry; no optimistic legal-state mutation.
- Token responses never reveal whether an email/person/application exists.

## Focus, keyboard and mobile

- Route entry focuses `<h1>`; validation focuses first error; dialogs trap and restore focus.
- On 390px actions stack in semantic order; destructive withdrawal remains visible but secondary.
- Reduced motion removes transitions, not receipts or state explanation.

## GVC Scenario Plan

Capture apply unchecked → validation → accepted with optional checked; then active self-service → availability update →
withdraw confirm → withdrawn receipt; separately capture invalid/expired token and 390px reflow.

- Quality profile: `premium`.
- Viewports: 1440×1000 and 390×844.
- Assertions: no existence leak, focus restore, canonical receipt, reduced-motion equivalence and no overflow.
- Baseline decision: new self-service baseline only after the review dossier is Apto.

## Design Decision Log

- Selected two-moment flow because checkbox-only cannot support withdrawal and a full account is premature.
- Public UI remains a thin consumer of TASK-1723; no lifecycle or token policy is duplicated client-side.
- Withdrawal uses confirmation; availability update remains inline and recoverable.
