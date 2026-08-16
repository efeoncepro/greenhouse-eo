# Greenhouse Candidate Account and Longitudinal `/my` Decision V1

> **Status:** `Accepted for implementation`
> **Date:** 2026-08-16
> **Owner:** People / Talent + Identity / Platform
> **Scope:** candidate login, longitudinal person identity, professional profile, application self-service, `/my`, People 360 and selected-candidate activation
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `high`
> **Implementation:** `EPIC-011`, `TASK-1727`–`TASK-1733`

## Context

Greenhouse already models Hiring person-first: `identity_profile` is the human root, `candidate_facet` is the
recruiting facet and `hiring_application` is the pipeline and evidence grain. `TASK-770` is responsible for adding
the workforce `member` facet after an approved `internal_hire` handoff. The Hiring journey reader can reconnect
applications, handoffs and the eventual collaborator by identity.

The experience is not yet longitudinal. A public applicant cannot authenticate to inspect their applications,
understand a candidate-safe status, update their CV, answer role-specific questions or maintain a reusable
professional profile. `/my` already offers rich CRUD for skills, tools, languages, certifications, links and other
data, but its access contract requires an internal tenant and `memberId`; much of its persistence is also
`member_*`-scoped. Opening those routes to a candidate would create access leakage. Creating a `member` at apply
time, or copying candidate data into a new member profile after selection, would violate the person-first model.

The operator has accepted the product direction that the person should have login and use `/my` before selection,
then retain that account and history if selected.

## Decision

### 1. One person and one portal principal across the lifecycle

The authenticated relationship is longitudinal. A candidate who verifies control of their email receives or
claims one portal principal linked to the existing `identity_profile_id`. The stable `user_id` and
`identity_profile_id` survive selection, onboarding, active employment, offboarding and later reapplication.

Selection never creates a second account or a second person. Workforce activation adds or links `member_id` to
the existing principal and refreshes its capabilities. Authentication methods may evolve—for example from magic
link to Entra—without changing the canonical person or principal.

Email equality alone is not account ownership. Account claim, linking and recovery require a verified ceremony,
anti-oracle responses, collision handling and audit. Ambiguous identity matches fail closed for human resolution.

### 2. Facets and audiences are additive, not a destructive `user_type`

`candidate_facet` and `member` may coexist. A collaborator may apply to another role; a former collaborator may
remain in an active application; Talent Pool permission may expire independently. Authorization therefore derives
from current relationships, purpose grants, audiences and capabilities, not from one mutually exclusive
`candidate | employee | client` enum.

The existing `client_users` physical table may be generalized additively for compatibility, but the authorization
model must not coerce an unknown candidate into `tenant_type='client'`, grant a default client role or require a
fake organization/member. Candidate self-service receives an explicit audience and narrow `*.self.*`
capabilities. Every resource operation resolves ownership from the authenticated identity, never from a caller-
supplied `identityProfileId` or `candidateFacetId`.

### 3. `/my` becomes a capability-composed lifecycle surface

The stable product route is `/my`. Its shell, navigation, components and interaction patterns are reused, while
content is composed from capabilities and lifecycle state:

- Candidate: applications, pending actions, professional profile, CV/documents, availability and privacy.
- Selected/preboarding: the candidate surface plus governed offer/onboarding-readiness actions.
- Active collaborator: workforce sections such as assignments, leave, contracts and payroll, only after their
  existing domain gates allow them.

This decision does not authorize existing member-scoped `/api/my/*` routes for candidates. New shared
person/application primitives sit behind adapters; current member endpoints migrate incrementally.

### 4. Professional profile is person-scoped; workforce truth remains member-scoped

Reusable professional declarations belong to the person: headline, biography, professional links, portfolio,
skills, tools, languages, certifications, evidence and CV versions. They retain provenance, timestamps,
verification state and visibility. Editing verified evidence invalidates or supersedes the prior verification; it
does not silently inherit trust.

Job, assignment, contract, payroll, performance and workforce-title truth remain member/workforce-owned. Legal
identity data may remain person-scoped physically but is capability- and lifecycle-gated; it is not requested or
opened simply because a candidate has `/my` access.

Existing `member_*` professional data migrates through expand → dual-read/shadow → reconcile → cutover. It may
remain as a temporary projection for staffing consumers. Candidate-only duplicates followed by copy-on-hire are
prohibited.

### 5. Application evidence remains application-scoped and versioned

A person can hold multiple concurrent or historical applications. Therefore:

- candidate-facing status is a public projection, not the raw internal Hiring stage;
- the CV submitted to an application is an immutable/versioned snapshot, distinct from the person's current CV;
- role-question definitions are versioned by opening and answers belong to the application;
- economic expectation belongs to the application, with currency, period and engagement context;
- withdrawal and corrections are auditable commands with stage/deadline policy;
- referral, recommendation and professional reference are separate concepts and purposes.

Updating a person profile never rewrites the evidence used for a past decision.

### 6. Candidate-facing history is a bounded projection

The candidate sees only communicated states and actions: received, under review, action required,
conversation/evaluation, decision communicated, withdrawn or closed. Internal notes, scorecards, rankings,
answer keys, evaluator identity/comments, handoff states and uncommunicated decisions are excluded.

People 360 composes the full authorized longitudinal journey by `identity_profile_id`, including all applications,
handoffs and member relationships. It must not require a pre-existing `member` merely to resolve Hiring history.

### 7. Login follows apply; it does not block first conversion

Public apply remains possible without an account. After accepting the application, Greenhouse offers account
claim through verified passwordless login. This preserves funnel accessibility while making every subsequent
self-service action authenticated. A future pre-authenticated apply may reuse the same principal, but public apply
must not silently create an authenticated session from an unverified email.

### 8. Fairness, privacy and security are release gates

Profile completeness is never a fit score, ranking signal or auto-reject condition. Candidate-declared evidence
has provenance and does not become verified workforce truth by assertion. AI does not hire or reject.

Candidate routes are own-resource only, anti-IDOR and anti-oracle. Unknown and foreign resources return the same
bounded not-found response. Tokens, raw CV text, salary, answers and PII do not enter sessions or logs. Candidate,
Talent Pool and employment/onboarding purposes remain independently consented and retained.

## Consequences

- The desired selected-candidate continuity becomes explicit: same identity, same account, same profile and same
  application history; only relationships and capabilities expand.
- `/my` becomes a lifecycle shell instead of a synonym for `member`.
- Auth/session and professional-profile SSOT require additive migration and a controlled cutover.
- Hiring continues to own applications and decisions; People/HRIS continues to own workforce activation.
- Talent Pool tokenized self-service remains valid as a transitional narrow flow and can later bootstrap account
  claim; it does not become a second identity system.

## Rejected alternatives

1. **Create `member` when a person applies.** Rejected because it grants workforce semantics prematurely and
   contaminates HRIS, entitlements and People 360.
2. **Build a separate candidate portal/account and migrate on hire.** Rejected because it duplicates identity,
   credentials and history.
3. **Copy candidate skills/CV into `member_*` on selection.** Rejected because copy-on-hire drifts, loses
   provenance and rewrites the lifecycle.
4. **Open the current `/api/my/*` routes to candidates.** Rejected because they assume internal tenant/member
   authorization and include legal/workforce surfaces.
5. **Expose raw Hiring stages.** Rejected because internal workflow and uncommunicated decisions are not a
   candidate-facing contract.
6. **Require registration before initial apply.** Rejected for V1 because it adds conversion and accessibility
   friction without improving ownership beyond the post-apply verification ceremony.

## Rollout and rollback

Implementation follows the dependency chain in `EPIC-011`: identity foundation and account claim; person-scoped
professional profile; application self-service contracts; candidate `/my`; activation continuity; People 360
reader and UI. Every runtime surface starts OFF or read-only. Existing internal `/my` remains the fallback until
shadow reconciliation and negative authorization tests pass.

Rollback disables candidate login/surfaces and new writers while preserving additive schema, application evidence
and audit. No rollback copies person data back into candidate/member duplicates.

## Revisit triggers

- A shared external identity plane is accepted for Greenhouse browser login.
- `client_users` can no longer evolve without a new canonical principal store.
- A legal/privacy review changes purpose, retention or candidate data-subject requirements.
- An external client is proposed as a reader of candidate self-service data.
- Professional evidence becomes portable across Efeonce products or requires a separate credential standard.

## Related contracts

- `GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
