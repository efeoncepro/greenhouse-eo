# Efeonce Globe — Persisted Tenancy Projection Decision V1

- Decision: ADR-006
- Status: Accepted with V2 reconciliation correction; implementation and rollout gated
- Date: 2026-07-22
- Owners: Greenhouse identity/control plane and Efeonce Globe platform
- Implements: TASK-1511
- Related: `GREENHOUSE_CONNECTIVITY_V1.md`, `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`, `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`

## Decision

Globe does **not** own ecosystem identity, organizational roles, desired access, or workspace/client bindings.
Greenhouse remains their source of truth and broker. Globe owns a durable, runtime-local **projection** of the
broker-authorized workspace boundary, its subject memberships, and only the capability grants needed to operate
Globe creative primitives.

The effective authority of a Globe request is the intersection of three server-derived facts:

1. an active Greenhouse workspace binding and active identity subject from the authenticated principal;
2. an active, non-expired Globe membership projected for that exact broker subject and binding revision; and
3. an active, non-expired Globe capability grant that is also present in the broker's desired-access snapshot.

Formally: `effective = brokerCapabilities ∩ activeProjectedGrants`. Missing, stale, revoked, expired, ambiguous,
or unreconciled state fails closed. No request payload may supply a subject, workspace authority, broker revision,
or desired capability set.

## Ownership boundary

| Concern | Authority | Globe persistence |
| --- | --- | --- |
| Ecosystem person/service identity | Greenhouse broker | Stable opaque `identity_subject`, issuer and projection evidence only; no profile or parallel user |
| Workspace/client binding | Greenhouse broker | One id-bearing workspace projection keyed by the immutable broker binding id |
| Desired access state | Greenhouse broker | Version/hash/timestamps used to bound reconciliation and detect drift |
| Organizational role | Greenhouse | Not modeled in Globe |
| Creative operation capability grant | Globe, bounded by broker desired access | Append-only grant revisions; cannot exceed broker snapshot |
| Local session | Globe | Independent and revocable per ADR-001; never authority by itself |

Globe membership is therefore not an account and not a second identity record. It is a workspace-scoped binding
to an opaque broker subject. Display name, email, HR role, client role and other PII are deliberately absent.

## Aggregate and lifecycle

The aggregate is `WorkspaceTenancyProjectionV1`:

- `workspace`: stable Globe id, immutable broker binding id, state `shadow|active|suspended`, broker revision/hash;
- `member`: immutable broker subject binding with state `active|suspended|revoked`, effective and expiry times;
- `grant`: append-only revision with capability, state `active|revoked|expired|superseded`, validity window,
  predecessor and reason code.

Mutations use optimistic `expectedVersion` and command idempotency. A grant is never updated or deleted: revocation
and replacement append a new revision and supersede the prior active revision atomically. Every accepted mutation
emits an append-only audit event without raw PII.

## Reconciliation contract

The broker sends a server-authenticated snapshot containing opaque subject, immutable binding id, binding state,
monotonic revision, issued/expiry timestamps and the bounded Globe capability set. Globe rejects rollback revisions,
expired snapshots, a subject/binding mismatch, unknown capabilities and any locally requested grant absent from the
snapshot. Replaying the same revision and fingerprint is idempotent; the same revision with another fingerprint is a
conflict.

Revocation converges fail-closed in two ways: an explicit newer broker snapshot suspends/revokes memberships and
supersedes grants; independently, snapshot/member/grant expiry removes authority even if delivery of the revocation
signal is delayed. A workspace suspension dominates all member/grant states.

## Trusted-context integration and rollout

The existing broker-derived `workspaceBindings` and `deriveTrustedContext` remain unchanged while the feature flag is
OFF. Shadow mode materializes and compares projections but never grants authority. When enabled for an internal
allowlist, a server-side tenancy authorizer intersects the already-derived trusted context with the persisted
projection before dispatch. It may only narrow authority; it cannot add a workspace or capability.

The browser and command payloads never receive a new authority field. `workspaceSelection` remains selection among
broker bindings, not authority. Production and external clients remain blocked pending their explicit rollout gate.

## Persistence and bootstrap

Globe adds tables in its own `globe-pg` database only. Every row is workspace-scoped; foreign keys are composite
with `workspace_id` where a child refers to another aggregate row. Runtime identities retain DML-only access and
migrations run under `globe_owner`.

Bootstrap is projection, not identity creation: dry-run broker inventory, materialize shadow workspaces/members with
short expiry, compare drift, then enable an internal allowlist. The synthetic legacy id
`greenhouse-org:<clientId>` may be retained as a deterministic projection id during migration, but the immutable
broker binding id is the external key. Rollback is flag OFF; additive tables remain inert and can be dropped only
after evidence retention requirements are satisfied.

## Alternatives rejected

- **Globe-owned users and organizational roles:** creates parallel identity and divergent revocation.
- **Trust only broker capabilities per request:** preserves no durable membership/grant history or drift evidence.
- **Trust only Globe grants:** can over-authorize after broker revocation or desired-state change.
- **Accept workspace/member/grants in business payloads:** promotes caller input to authority.
- **Share Greenhouse DB or sessions:** violates the sister-platform and ADR-001 isolation boundary.

## Fitness functions

- Cross-workspace reads and writes return no existence oracle.
- `effectiveCapabilities ⊆ brokerCapabilities` for every authorization decision.
- Revoked or expired binding/member/grant never authorizes.
- A lower broker revision and same-revision/different-fingerprint snapshot are rejected.
- Grant history is append-only and every mutation has correlated audit evidence.
- Flag OFF preserves the current broker string derivation exactly; shadow mode cannot change dispatch results.

## Consequences

Globe gains scalable, auditable multi-member tenancy without becoming an identity provider. Authorization now
depends on reconciliation freshness, so expiry and drift signals are operational requirements. The model intentionally
does not answer organizational-role questions; consumers needing those facts query Greenhouse through its governed
boundary rather than copying them into Globe.

## Delta 2026-07-23 — V2 workspace-complete reconciliation

### Defect discovered in V1

The V1 snapshot carries one singular `member` and treats `brokerRevision`, fingerprint and short-lived
`issuedAt`/`expiresAt` evidence as one reconciliation unit. That shape can materialize a first shadow member, but
it cannot safely operate a commercial multi-member workspace:

- refreshing a lease can be mistaken for a semantic desired-access mutation, or a stable semantic revision can
  conflict only because its timestamps changed;
- reconciling members one at a time provides no authoritative workspace-complete set, so omission cannot mean
  revocation and stale memberships may survive until an incidental expiry;
- a worker that requires a fresh active workspace can lose discovery when no continuous reconciler rewrites the
  lease, even though the broker's desired-access state did not change;
- grants cannot converge safely for every member unless removals are explicit, ordered and preserved as history.

Extending the lease or inserting a special internal workspace would hide these defects. It is rejected as a
fragile exception because it would preserve the same ambiguity for every later workspace.

### V2 decision

The broker reconciliation command accepts one authoritative, workspace-complete snapshot:

```text
WorkspaceTenancySnapshotV2
  brokerBindingId
  bindingState
  semanticRevision
  semanticFingerprint
  lease { issuedAt, renewedAt, expiresAt }
  members[] {
    identityIssuer
    identitySubject
    state
    effectiveAt
    expiresAt?
    desiredCapabilities[]
  }
```

The following rules are normative:

1. **`members[]` is a complete set, not a patch.** It contains every subject that should retain projected
   membership for the workspace at `semanticRevision`. Subjects present in the prior accepted projection and
   omitted from the new complete set are suspended atomically in the same reconciliation transaction. Omission
   never deletes history and never leaves authority active.
2. **Semantic revision and lease freshness are independent.** `semanticRevision` advances only when binding,
   membership state or desired capabilities change. `semanticFingerprint` is computed from that canonical,
   sorted semantic payload and excludes lease timestamps. An equal revision plus equal fingerprint may renew the
   lease idempotently; an equal revision plus a different fingerprint conflicts; a lower revision is rejected.
3. **Freshness remains fail-closed.** Lease renewal may extend authority only within the bounded broker policy.
   An expired workspace/member/grant authorizes nothing. The reconciler must run periodically before expiry and
   expose lag/expiry signals; a manual one-shot is diagnostic evidence, not the operating model.
4. **Omission suspension is explicit and reversible only by newer authority.** An omitted member gets a
   suspension revision and audit evidence. Reactivation requires a later semantic revision that includes the
   subject explicitly; lease renewal alone cannot reactivate it.
5. **Grants remain bounded and append-only.** For each included member, active local grants are the intersection
   with that member's `desiredCapabilities`. A capability removed or a member omitted appends a
   revoked/superseded grant revision atomically; rows are never updated in place or deleted. Operator-authored
   creative grants may narrow the set but can never exceed it.
6. **Workspace suspension dominates.** A suspended binding atomically suspends all projected members and
   supersedes their active grants regardless of the member array, while preserving append-only audit history.

### V2 transaction and concurrency contract

- One command owns one workspace transaction and takes optimistic `expectedVersion` or an equivalent
  workspace-scoped lock.
- Canonical sorting/deduplication of subjects and capabilities happens before fingerprinting; duplicate subjects,
  unknown capabilities, mixed issuers or partial snapshots are rejected.
- A successful semantic reconcile and every lease renewal use distinct idempotency keys and correlated audit
  events. Lease renewal does not manufacture grant revisions when the semantic fingerprint is unchanged.
- Readers and workers consume only the latest accepted semantic projection whose independent lease is fresh.
  They never derive authority from a display label, hard-coded tenant or scheduler configuration.

### Additional fitness functions

- A two-member snapshot followed by a complete snapshot containing one member leaves the omitted member suspended
  and with no active effective grant in the same commit.
- Repeated lease renewals at one semantic revision do not change membership/grant history or aggregate semantic
  version.
- Equal semantic revision/equal fingerprint/different lease is idempotent; equal revision/different fingerprint
  is a conflict.
- A periodic reconciler keeps an unchanged workspace discoverable without creating semantic churn.
- Removing one desired capability appends its revocation and cannot affect another member or workspace.
- No bootstrap, internal label or manual SQL path may bypass these rules.

V2 supersedes only the V1 reconciliation shape and revision/freshness semantics. The ownership boundary, effective
authority intersection, no-parallel-identity rule, tenant isolation and external promotion gates remain unchanged.
