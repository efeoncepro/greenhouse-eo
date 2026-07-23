# Efeonce Globe — Route Promotion Operation Decision V1

- Decision: ADR-009
- Status: Accepted; implementation and rollout gated
- Date: 2026-07-23
- Owners: Efeonce Globe platform, creative operations and security
- Implements through: `TASK-1527`
- Related: `TASK-1521`, `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`,
  `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`,
  `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`

## Context

Globe already has independent durable authorities for model readiness, generated-output rights, production route
bindings and provider circuits. The internal canary tooling can invoke those authorities in a safe order, but it
does not persist one coordinated promotion operation. A timeout or process failure between authorities can
therefore leave a route partially promoted without a canonical checkpoint or bounded recovery path.

The current generated-rights policy is also global: its contract and table do not carry `workspace_id`, and its
readers ignore trusted workspace context. Treating that record as a workspace authorization decision would let
one tenant's adoption and restrictions become evidence for another. In addition, model readiness currently
accepts a configured policy version without resolving the exact durable policy tuple and digest.

The seven remaining Producer routes cannot be promoted safely by adding another in-memory script or a principal
that combines every capability. Promotion must remain an auditable separation-of-duties workflow.

## Decision

Globe adopts a **workspace-scoped rights application authority plus a durable route-promotion saga**.

The saga coordinates existing authorities; it does not replace them and never writes their tables directly.
Each externally callable phase has a fixed capability, resolves evidence server-side, invokes the canonical child
command with a deterministic idempotency key, reads the child authority back exactly, and only then advances its
own checkpoint.

### 1. Rights application is workspace-scoped

- `GeneratedRightsPolicyV1` includes the trusted `workspaceId`.
- Publish derives workspace and actor from `TrustedCommandContextV1`; callers cannot choose either in payload.
- Get/list always scope by trusted workspace. Cross-workspace and unknown policies are indistinguishable.
- Idempotency and immutable identity are scoped by workspace.
- A policy fixes route, provider, model, model version, provider-terms reference/digest, application posture,
  restrictions and validity window. Readiness resolves and verifies that exact durable record.
- Provider terms evidence may later become a separately governed global evidence object. A workspace's adoption,
  restrictions and validity never become global by implication.
- Legacy rows are not assigned to arbitrary tenants. The expand migration permits only an explicitly configured,
  verified internal workspace backfill; commercial rollout remains blocked until no compatibility default is
  required.

### 2. Promotion is a durable saga

The operation fixes this identity at creation:

`workspace + routeId + providerId + modelId + modelVersion + capability + fidelityContract + endpointId + region + completionDriver`

The forward lifecycle is:

`planned → staging_controls → controls_staged → promoting_readiness → readiness_promoted → activating → activated → verifying_canary → canary_passed`

Rollback is:

`rolling_back → rolled_back`

`rollback_failed` remains reclaimable. A generic terminal `failed` is permitted only before external effects or
after exact readback proves the circuit open and binding disabled.

The operation stores:

- a mutable head protected by expected revision, row lock and lease/fencing;
- append-only revisions containing sanitized evidence references, actors, correlation and safe result codes;
- command receipts keyed by workspace, command and idempotency key with a request fingerprint;
- one active operation per `workspace + routeId + modelVersion`.

An advisory transaction lock serializes short claims for that identity. It is never held while invoking another
authority. Child idempotency keys are deterministic:

`promotion:{operationId}:{phase}:{step}`

After an uncertain child outcome, recovery reads the child authority before retrying. It never assumes that a
client timeout means the mutation failed.

### 3. Phase order and evidence are fail-closed

- `stage`: resolve approved terms/rights evidence → publish/read exact rights policy → append disabled binding →
  open circuit → read all three back.
- `promote`: resolve signed human review and proposal from canonical readiness authorities → promote readiness →
  exact readback.
- `activate`: verify rights, readiness, disabled binding and open circuit → enable binding → close circuit →
  exact readback.
- `canary-confirm`: resolve an exact post-activation governed run, attempt, retained output, governance decision
  and route tuple. A caller boolean, browser payload or local JSON file cannot certify success.
- `rollback`: open circuit first, then disable binding, and read both back. Immutable rights/readiness history is
  preserved; rollback removes execution authority rather than deleting evidence.

### 4. Authority remains separated

Commands use separate capabilities because the capability registry authorizes one fixed capability per command:

- `read`
- `plan-stage`
- `promote`
- `activate`
- `canary-attest`
- `rollback`
- `recover`

Normal principals are separated:

- maker/reviewer: review and proposal, with maker different from reviewer;
- readiness promoter: promote/read;
- routing operator: start/stage/activate/rollback/read;
- independent canary checker: canary-attest/read;
- recovery worker: recover/rollback/read.

No normal principal combines reviewer, promoter and routing authority. Lower-level rights/readiness/routing
commands remain available only as audited break-glass operations after the aggregate flag is enabled.

### 5. Recovery is non-expansive

The recovery worker may:

- claim expired/reclaimable operations with lease and fencing;
- reconcile a child command already applied through exact readback;
- finish an operation checkpoint whose child authority proves success;
- execute circuit-first rollback to reduce authority.

It may not review, promote readiness, enable a binding, close a circuit or attest a canary. Stalled work is
`WARNING`, partial promotion is `ERROR`, and `rollback_failed` is `CRITICAL`. Queue age counts only reclaimable
operations.

## Consequences

- Promotion survives process crashes and uncertain outcomes without SQL repair.
- Tenant scope and evidence become enforceable in schema and contracts rather than operator convention.
- More principals and transitions are required, and promotion takes multiple authorized calls.
- Existing canary scripts become clients/checkers of the aggregate rather than an alternate orchestrator.
- Creating the aggregate does not promote any route. Each exact route still requires its own terms, fixture,
  evaluation, independent review/proposal and governed canary.

## Rollout and rollback

1. Expand rights schema and contracts; backfill only a verified internal workspace.
2. Deploy operation schema/readers with `GLOBE_PRODUCTION_PROMOTION_OPERATIONS_ENABLED=false`.
3. Exercise shadow reads and stage→rollback with separated identities.
4. Enable aggregate commands for allowlisted operators/checkers and remove lower-level grants from normal callers.
5. Exercise stage→promote→activate→canary on an internal-only route with complete evidence.
6. Soak signals and recovery before using the operation for the seven-route backlog.

Rollback disables the aggregate flag, opens the affected circuit, disables its binding and preserves all
operation/authority history. Schema changes remain additive until the compatibility window has been proven empty.

## Rejected alternatives

- **One all-powerful batch command:** rejected because it concentrates authority and cannot prove which human or
  service approved each irreversible phase.
- **Distributed database transaction across authorities:** rejected because current authorities own independent
  stores/transactions and external effects; pretending atomicity would make recovery less honest.
- **Browser/local JSON evidence:** rejected because the caller could assert the result it is asking to authorize.
- **Recovery that auto-promotes or activates:** rejected because recovery would become a privilege-escalation
  path.
- **Global rights application policy:** rejected because adoption, restrictions and validity are tenant decisions,
  even when provider terms evidence is shared.

## Verification required before rollout

- Migration, tenant-isolation, immutable-history and concurrent-claim tests.
- State-machine, expected-revision, idempotency, actor-separation and failure-injection tests.
- Exact readback tests for rights, review/proposal, readiness, binding, circuit and canary.
- Worker tests proving it cannot promote, activate or attest.
- Internal stage→rollback and full canary rehearsals with distinct identities.
- Cloud SQL readback, alert/signal verification, `pnpm check`, `pnpm build` and IaC plan without destructive drift.
