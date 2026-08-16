# Greenhouse Candidate Self-Service and Longitudinal `/my` Architecture V1

## Status

- Lifecycle: `accepted direction; runtime implementation pending TASK-1727–TASK-1733`
- Accepted: `2026-08-16`
- Owners: `People / Talent`, `Identity / Platform`, `People 360`
- Parent decision: `GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- Program: `EPIC-011`

## 1. Purpose

Define the brownfield architecture that lets an applicant authenticate, inspect and enrich their own Hiring
relationship through `/my`, then continue with the same person, account, history and professional profile if a
workforce relationship is activated.

This is an evolution inside the current Greenhouse deployable. It does not create a new service, root person,
candidate database, credential store or public Hiring pipeline.

## 2. Architectural invariants

1. `identity_profile_id` is the permanent human anchor.
2. The portal `user_id` is stable after verified account claim; selection does not replace it.
3. `candidate_facet` and `member` are additive relationships that may coexist.
4. `hiring_application` remains the application/evidence grain.
5. Candidate access is explicit and own-resource only; it never inherits client/internal defaults.
6. Professional declarations are person-scoped; workforce truth is member/workforce-scoped.
7. Current CV and submitted CV snapshot are distinct, versioned concepts.
8. Candidate-facing status is a publication projection, never a raw stage mapping in the browser.
9. Profile completeness never becomes automated selection evidence.
10. UI, Product API, App API and future agents consume canonical readers/commands rather than recreating rules.

## 3. Current-state constraints

| Current contract                                                            | Constraint                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/my/layout.tsx`                                         | `/my` is guarded by current internal views/route groups.                                                         |
| `src/lib/tenant/authorization.ts::requireMyTenantContext`                   | Requires `efeonce_internal` and `memberId`.                                                                      |
| `src/app/api/my/{skills,tools,languages,certifications,professional-links}` | Most CRUD is member-scoped.                                                                                      |
| `src/lib/auth.ts` and `src/lib/tenant/access.ts`                            | Session/access recognizes internal/client shapes; unknown types must not degrade to client defaults.             |
| `src/lib/auth/magic-link.ts`                                                | Reusable passwordless primitive exists, but current account provisioning and atomicity need candidate hardening. |
| `src/lib/workforce/hiring-activation/*`                                     | Activation preserves person identity but does not yet guarantee account/capability continuity.                   |
| `src/lib/hiring/handoff/journey.ts`                                         | Longitudinal Hiring reader exists, but some People 360 entry paths still require `member`.                       |

Opening the current `/my` route group is therefore not an implementation strategy. The target is a new actor
context and shared domain contracts underneath a progressively composed shell.

## 4. Target logical model

```text
IdentityProfile
├── PortalPrincipal (stable user_id, verified login methods, session version)
├── ProfessionalProfile
│   ├── ProfessionalClaim[] (skill, tool, language)
│   ├── Certification[] + evidence
│   ├── ProfessionalLink[]
│   └── CvVersion[] → current_cv_version_id
├── CandidateFacet
│   ├── availability and process/future-opportunity consent
│   └── HiringApplication[]
│       ├── CandidateStatusProjection
│       ├── ApplicationCvSnapshot[]
│       ├── RoleQuestionAnswer[]
│       ├── EconomicExpectation
│       └── CandidateActionEvent[]
└── MemberFacet[]
    ├── employment/work relationships
    ├── assignments and performance
    └── contracts, legal intake and payroll gates
```

Physical names are finalized by each implementation task after schema audit. The ownership boundaries above are
normative even if legacy tables remain during migration.

## 5. Source-of-truth matrix

| Data                                                 | Canonical owner            | History/projection rule                                                |
| ---------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Person, verified contact anchors                     | Identity                   | One `identity_profile`; conflicts block auto-linking.                  |
| Portal account and login methods                     | Identity / Access          | Stable principal; methods and audiences are replaceable bindings.      |
| Skills, tools, languages, certifications, links, bio | Professional Profile       | Person-scoped declarations with provenance and verification lifecycle. |
| Current professional CV                              | Professional Profile       | Version library plus explicit current pointer.                         |
| Submitted CV                                         | Hiring Application         | Immutable snapshot/reference to the exact version evaluated.           |
| Application stage/decision                           | Hiring                     | Internal truth; candidate projection publishes only allowed state.     |
| Role answers and economic expectation                | Hiring Application         | Versioned/application-scoped; never copied to payroll truth.           |
| Talent Pool future contact                           | Talent Pool                | Independent purpose grant and withdrawal lifecycle.                    |
| Member, employment, assignments, payroll             | HRIS / Workforce / Payroll | Created only through approved downstream activation.                   |
| Longitudinal People 360 journey                      | Person 360 reader          | Composition by `identity_profile_id`; no duplicated write model.       |

## 6. Identity, session and authorization

### 6.1 Principal claim

1. Public apply writes/reconciles person, candidate facet and application without creating a browser session.
2. Greenhouse emits an account-claim invitation to the verified application email.
3. Generic request/consume responses prevent account enumeration.
4. Successful single-use consumption atomically verifies the claim and creates or links the stable portal
   principal to the exact identity.
5. Existing principals enter account-linking/recovery policy; email equality does not silently merge principals.

### 6.2 Session shape

The server-side session context needs, conceptually:

```ts
type LongitudinalPersonSession = {
  userId: string
  identityProfileId: string
  audiences: string[]
  capabilities: string[]
  candidateFacetId?: string
  memberId?: string
  sessionVersion: number
  emailVerifiedAt: string
  authStrength: 'magic_link' | 'password' | 'sso' | 'passkey'
}
```

Applications, salaries, answers, document identifiers and other sensitive resource IDs do not live in JWT/session
claims. They are resolved server-side under the session identity.

### 6.3 Capabilities

Initial capability family:

```text
hiring.self.applications.read
hiring.self.application.withdraw
hiring.self.application_packet.read
hiring.self.application_packet.update
hiring.self.cv.version.create
hiring.self.role_questions.answer
person.self.professional_profile.read
person.self.professional_profile.update
person.self.contact.update
person.self.consent.manage
```

Workforce/legal/payroll capabilities remain absent until their existing lifecycle gates grant them. A selected
decision alone does not grant active-member capability.

### 6.4 Resource authorization

Candidate endpoints resolve `identityProfileId` and `candidateFacetId` from the server session. A resource read is
valid only when the application joins to that identity. Foreign and nonexistent resources produce the same 404
shape. Writes additionally validate lifecycle, deadline, version and idempotency.

## 7. Professional Profile migration

The migration follows expand/contract:

1. Add person-scoped professional aggregates and append-only provenance/verification events.
2. Backfill existing `member_*` records by `member.identity_profile_id` in dry-run and allowlisted batches.
3. Reconcile duplicates/conflicts without overwriting verified evidence.
4. Introduce dual readers or person-first readers with a legacy fallback; compare shadow outputs.
5. Switch `/my` and staffing consumers independently behind flags.
6. Stop legacy writes only after parity and rollback rehearsal; retain projections while any consumer needs them.

No candidate-to-member copy job exists. A profile edited before selection is already the same profile read after
activation.

## 8. Application self-service aggregate

### 8.1 Candidate status projection

Candidate status is derived from candidate-facing events/communications and bounded policy:

| Public status                | Meaning                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `received`                   | Application accepted.                                          |
| `under_review`               | Review is active; no internal substage disclosed.              |
| `action_required`            | A candidate-visible action with deadline exists.               |
| `conversation_or_evaluation` | Interview/test step communicated.                              |
| `decision_communicated`      | Final decision was explicitly published.                       |
| `withdrawn`                  | Candidate withdrawal accepted.                                 |
| `closed`                     | Process closed without disclosing internal operational detail. |

`selected`, `rejected` or richer outcome copy may be included inside `decision_communicated` only after the
communication ledger confirms publication. Preparing an internal decision never changes the public projection.

### 8.2 CV versioning

- `CvVersion` belongs to the person and is immutable after creation.
- `current_cv_version_id` indicates the reusable current version.
- `ApplicationCvSnapshot` binds one application to the exact asset/version used at a point in time.
- Replacing a CV creates a version and snapshot event; it never reassigns an old asset owner or overwrites closed
  application evidence.
- Malware scan/lifecycle policy is rechecked on every eligible read.

### 8.3 Role questions and expectation

Questionnaire definitions are versioned by opening. Answers reference question/version and preserve correction
history. Required/optional purpose and edit deadline are server-owned. Assessment questions/answer keys remain a
separate Assessment Engine contract.

Economic expectation is application-scoped and supports amount/range, currency, period and engagement context.
It is not salary history, payroll truth or an automatic rejection signal.

## 9. `/my` composition

The server resolves a `MyExperienceManifest` from current audiences/capabilities. Navigation and server components
consume the manifest; browser code does not infer access from route names.

```text
candidate_self_service
├── /my                    overview + pending actions
├── /my/applications       application list/history
├── /my/profile            shared professional profile
├── /my/documents          CV versions and allowed documents
└── /my/privacy            purpose/consent/preferences

workforce_self_service (additive after activation)
├── existing profile/workforce sections
├── onboarding/contracts when entitled
└── leave/performance/payroll when entitled
```

Existing `/my` URLs should remain stable where semantics match. Candidate-only content may start under
`/my/applications` while the shell gate is generalized. No client or internal navigation item is rendered or
reachable merely because the principal can access `/my`.

## 10. Selection and activation continuity

The selection journey and TASK-770 activation remain separate domain boundaries. On successful workforce
activation, one governed transaction/saga checkpoint must:

1. resolve the same `identity_profile_id`;
2. create or reuse the canonical `member`;
3. bind the existing portal principal to the member relationship;
4. refresh derived audiences/views/capabilities;
5. increment `sessionVersion` or revoke stale sessions;
6. publish audit/outbox evidence and reconcile the journey reader.

Failure after member creation is recoverable and idempotent. It never creates a second principal. Selection without
activation keeps the candidate account and exposes only preboarding capabilities explicitly granted.

## 11. People 360 projection

People 360 resolves by identity first and composes:

- all Hiring applications and communicated/internal states according to viewer capability;
- handoffs and activation results;
- current/historical member relationships;
- professional profile with source and verification status.

The reader must work before `member` exists. Internal UI may summarize by default but offers complete paginated
history; candidate `/my` receives a separately allowlisted DTO.

## 12. Security, privacy and fairness controls

- Candidate surfaces start fail-closed and receive separate flags from internal `/my`.
- Magic-link consumption is atomic, single-use, short-lived and rate-limited by IP and normalized-email hash.
- Account recovery invalidates prior sessions through `sessionVersion`.
- Audit stores actor, purpose, resource, decision and policy version without CV/answers/token/PII payloads.
- Candidate, Talent Pool and employment purposes are independent; withdrawal propagates to each applicable
  projection without inventing deletion of mandatory audit evidence.
- Legal identity, bank, payroll and full-address intake is unavailable during early candidacy.
- Profile completeness, salary and missing optional fields cannot drive automated adverse decisions.
- Accessibility/accommodation is a confidential purpose-specific lane, not an assessment feature.

## 13. Reliability and observability

Required signals include:

- account claim requested/consumed/denied/collision/rate-limited;
- candidate resource allow/deny/foreign-resource probe;
- public-status projection lag or impossible transition;
- CV snapshot/version mismatch or stale/quarantined asset;
- professional-profile backfill/reconciliation drift;
- activation principal/member binding pending or inconsistent;
- stale session used after capability/version change.

No signal includes candidate content or sensitive values.

## 14. Rollout sequence

```text
TASK-1727 identity/account foundation
   ├── TASK-1728 professional profile foundation
   └── TASK-1729 application self-service contracts
          └── TASK-1730 candidate /my experience

TASK-1727 + TASK-770/TASK-1721
   └── TASK-1731 selection-to-workforce account continuity
          └── TASK-1732 identity-first People 360 journey reader
                 └── TASK-1733 People 360 longitudinal history UI
```

`TASK-1728` and `TASK-1729` may proceed in parallel after the session/ownership contract of `TASK-1727` is frozen.
`TASK-1730` ships only against real readers/commands. `TASK-1731` must close before claiming end-to-end account
continuity. Each flag can roll back independently.

## 15. Acceptance scenarios

1. A new applicant applies without login, claims the account and sees only their own application.
2. The same person has two applications with different CV snapshots and expectations; neither leaks into the other.
3. Updating the current CV/profile does not alter a closed application's evidence.
4. A foreign application ID returns the same not-found result as an unknown ID.
5. An internal collaborator applies to another role and retains both candidate and workforce capabilities.
6. A selected candidate enters preboarding but does not see payroll/leave/performance before activation.
7. TASK-770 activates the same identity and principal, refreshes sessions and exposes workforce `/my` sections.
8. People 360 shows the full journey without duplicating the person or depending on `candidate_facet.member_id`
   dual-write drift.
9. Offboarding removes workforce access while retention-governed Hiring history remains intact.
10. Disabling candidate flags leaves existing internal `/my` fully functional.

## 16. Known brownfield findings to verify during implementation

- Audit the activation query naming around `handoff_id` versus `hiring_handoff_id` against the live schema before
  changing TASK-770; documentation evidence alone is not runtime proof.
- Audit whether `candidate_facet.member_id` is maintained. Prefer identity-derived/projection linkage over a mutable
  dual write if it is not authoritative.
- Harden magic-link atomic consumption, rate limiting and human-session signing boundaries before candidate rollout.
- Verify session refresh removes stale privileges when access is revoked rather than preserving old claims.

These are implementation gates, not claims that production is currently failing.
