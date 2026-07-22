# Efeonce Globe — Persisted Tenancy Projection Decision V1

- Decision: ADR-006
- Status: Accepted for internal shadow implementation; rollout gated
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
