# Workforce reentry recovery — decision and operating contract

- Status: Accepted; implemented in `203fa04ec`, production tree `a824d073`. Dated runtime/recovery evidence is recorded in the incident audit, not inferred from this status.
- Date: 2026-09-03.
- Owner: Workforce / Identity. Incident: [member mutation issue](../issues/resolved/ISSUE-163-update-member-identity-source-link-null-link-id.md).
- Scope: current member availability, legal-episode projection and compensating recovery after an incorrect historical offboarding writeback.

## Context

A historical employee exit was replayed against a person who had returned as a contractor. The writeback closed current availability and assignments. A generic member update then failed after its first write because a source link lacked an ID; its event could also resurrect the ended employee relationship. An active login, an active member, and an active contractual episode are independent facts.

Existing authority remains [person–entity relationships](GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md), [contractor engagements](GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md), and [identity/workforce invariants](agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md). No new source of truth or schema is introduced.

## Decision

1. The existing offboarding writer must recognize a later current workforce episode before changing present availability. Discovery classification is advisory; the writer enforces the invariant. `reentry-predicates.ts` supplies the SQL predicates to the executor and drift detector; the recovery discovery CLI calls `findReentryAfterExit` and reports `reentry_preserved`. The executor still rejects future compensation versions and closes compensation vigency for the historical exit before its reentry check: `reentry_detected` preserves current member/assignments/legal relationship, not every historical compensation row.
2. `updateMember` commits the member, its identity links and its durable actor/before/after outbox evidence in one PostgreSQL transaction. Source-link IDs come from `buildIdentitySourceLinkId`. Compatibility BigQuery writes run after commit; their failure does not turn a committed mutation into a reported rollback.
3. `operating_entity_legal_relationship` never reopens an inactive/ended employee relationship or clears its contractual end date. Member activation is not authority to create a new legal episode. Legacy bootstrap is allowed only without explicit employee/contractor/executive history; current employee role/space synchronization remains supported.
4. Mistaken offboarding effects are corrected by `restoreOffboardingLifecycleAfterReentry`, not generic member reactivation or unguarded SQL. The command verifies an active admin, the executed case, exact member/profile, a later active workforce relationship in the same legal entity, and a reviewed snapshot/hash. It restores only explicitly selected member availability fields and assignment rows in one transaction.
5. Recovery uses an idempotency key bound to its request. A changed snapshot, different request under the same key, missing later episode, foreign assignment or failed audit/outbox write aborts. The receipt distinguishes observed pre-repair state from the explicitly desired target; desired values are not misrepresented as historical evidence.
6. Legal relationships, contracts, compensation, payables, obligations, payment orders, user identities and role grants are outside the recovery write set. Case audit plus canonical member/assignment events preserve provenance and projection convergence.
7. **Deploy and verify the corrected projection consumer before applying recovery.** Suppressing its event or invoking a test to hide an operational write is not an alternative. After repair, verify both database facts and processing by the deployed consumer; a local passing test is not proof of runtime protection.

## Episode semantics and recovery boundary

A qualifying relationship is `employee`, `contractor` or `executive`, `status=active`, starts strictly after the historical last working day and on/before the evaluation date, and has no end date or an inclusive end date on/after that date. A qualifying contractor engagement is `active`, `paused` or `ending`, linked by `profile_id` **or** `member_id`, with the same date window. Future, draft/pending, expired and non-workforce episodes do not qualify. These checks protect present availability and do not replace the payroll period resolver.

The compensating command has a narrower authority than the executor guard: it requires a current later **legal relationship in the case's same legal entity**, locked `FOR SHARE`; an engagement alone is insufficient. It checks the live admin user (`active=true`, `status=active`) and a nonexpired active `efeonce_admin` grant. The case must be an executed real exit for the exact member/profile. Case/member/selected assignments are locked `FOR UPDATE`; a transaction advisory lock serializes the idempotency key. The reviewed SHA-256 snapshot includes timestamps, not just desired booleans.

The target declares `active=true`, `status=active`, an explicit boolean `assignable`, and a real ISO date or null for the member end date. Every selected assignment must belong to that member, appear exactly once in both snapshot and desired sets, be restored active, and have an end date not before its existing start. The command neither creates assignments nor changes their start dates. Audit `offboarding_case.lifecycle_writeback_reverted` leaves the original case `executed`; it compensates availability instead of rewriting the historical exit. The same key/request returns `already_applied`; changing the request under the key fails.

## Alternatives rejected

- Re-run generic `updateMember(active=true)`: does not restore all damaged fields and previously produced partial state.
- Execute the existing person-specific SQL: lacks expected-state protection and convergent events.
- Reopen an old employment relationship: destroys the distinction between ended employment and a new contractor episode.
- Disable checks or omit outbox: conceals drift and leaves downstream views stale.
- Create another person/member: duplicates identity and disconnects history.

## Verification and rollout

Tests must exercise the real command with injected failures, not compare SQL strings as proof. Verify rejection of stale state, idempotent replay, missing reentry and foreign assignments, plus transactional participation of audit/events. Production execution uses the canonical runtime Postgres profile and the reviewed plan, followed by independent readback. Verify both Vercel routes that can run reactive consumers and the active Cloud Run worker revision/traffic before emitting recovery events. A worker-only deployment is insufficient. After publication, require completed processing for the exact recovery event IDs and compare protected objects again; a published event alone is not convergence. The ongoing incident audit records exact snapshots, identifiers, final money values, deployed revision and unresolved gates.

The correction is reversible code; data recovery is compensating and append-only audited. Revisit this decision if a governed employee rehire command needs a new episode, or if the source-of-truth split changes. No automatic batch recovery is authorized by this design.

Evidence: [Valentina incident audit](../audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md) records the applied recovery, protected-state comparison, consumer canary and released manifest. [Operational runbook](../operations/runbooks/workforce-reentry-recovery.md) owns the repeatable procedure.
