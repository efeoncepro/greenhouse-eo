# Efeonce Globe — Operating Responsibility Contract V1

- Decision: SPEC-008
- Status: Accepted, deployed and verified internal-only (TASK-1466)
- Validated: 2026-07-21 (local conformance + Cloud SQL migration/readback + deployed authenticated smoke)
- Confidence: High for the contract, tenant/idempotency model and internal deployed operation
- Reversibility: Two-way for capability wiring; append-only assignment history is retained once written
- Owners: Efeonce Globe (runtime, data and audit) + Greenhouse (TASK/EPIC governance)
- Related: `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001), `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007), `../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`, `TASK-1466`, `TASK-1469`, `TASK-1511`

## Decision

Globe represents `client-operated`, `co-operated` and `efeonce-managed` as an explicit, versioned
`OperatingResponsibilityAssignmentV1`. An assignment is an accountability snapshot for a workspace default or a run
override. It is never a membership, entitlement, grant, role or authorization input.

The accepted Creative Studio platform ADR already decided that one product supports three operating modes. This spec
materializes that decision on the existing API Contract Spine and durable Postgres layer; it does not introduce a new
ecosystem ADR.

## Boundary and source of truth

- Globe Postgres owns assignment versions and their audit. Greenhouse stores no copy and never reads Globe's database.
- Trusted `workspaceId`, actor and correlation context come from the authenticated spine context, never from payload.
- Actor references identify the accountable party of record only. Authorization continues to use the principal's
  capabilities and workspace bindings.
- `TASK-1511` owns the future workspace/member/grant model. `TASK-1469` owns the governed run aggregate and submission
  fence. Until that run aggregate exists, a run scope uses an opaque, workspace-scoped `runId` without an invented FK.
- Commercial context records only delivery model, engagement form and an opaque engagement reference. Price, currency,
  provider cost and margin are forbidden from this contract.

## Contract

### Scope and precedence

- `workspace`: default assignment for the authenticated workspace.
- `run`: override for one opaque run identifier within that workspace.
- Effective resolution reads the run override first and falls back to the workspace default. Absence fails closed with
  `not_found`; the system never infers an operating mode.

### Required responsibilities

Every snapshot names one `party` (`client | efeonce`) and one `actorId` for:

- brief authority;
- operator of record;
- creative approver;
- budget approver;
- template authority;
- rights authority;
- delivery owner;
- delivery approver.

Mode policy is fail-closed:

- `client-operated` requires the operator of record and delivery owner to be client-side;
- `efeonce-managed` requires both to be Efeonce-side;
- `co-operated` requires at least one responsibility on each side;
- `staff-augmentation × efeonce-managed` is invalid because it contradicts the accepted commercial model.

### Commands, readers and capabilities

| Surface | Contract | Capability |
| --- | --- | --- |
| command | `globe.responsibility.assignment.assign` | `globe.responsibility.manage` |
| command | `globe.responsibility.assignment.change` | `globe.responsibility.manage` |
| reader | `globe.responsibility.assignment.get` | `globe.responsibility.read` |
| reader | `globe.responsibility.assignment.effective` | `globe.responsibility.read` |
| reader | `globe.responsibility.assignment.history` | `globe.responsibility.read` |

HTTP, typed SDK, CLI and E2E coverage are `available`. UI and MCP remain `policy-blocked`; workers and sister-platform
access are `not-applicable`. A later surface must consume these same commands/readers and may not mutate the table or
configuration directly.

## Persistence and concurrency

Migration `0002_operating_responsibilities.sql` adds `responsibility_assignment_versions`:

- append-only snapshots keyed by `(workspace_id, scope_type, scope_id, version)`;
- monotonically increasing positive versions;
- globally stable replay per `(workspace_id, idempotency_key)`;
- a request fingerprint that rejects reuse of a key with different intent;
- optimistic concurrency through `expectedVersion` for changes;
- transaction-scoped advisory locks for idempotency and scope version allocation;
- assignment insert and `audit_log` insert in the same transaction.

The audit records trusted actor, correlation, exact scope, resulting version and operating mode. It excludes raw payload,
pricing, provider secrets and PII. The migration is additive and has no backfill: absence remains an explicit closed
state. Once writes exist, rollback disables the wiring but preserves the table and history; it never drops evidence.

## Security and failure contract

- A mode change cannot add or remove capabilities; tests prove the manage/read grants are checked independently.
- All reads and writes include the trusted workspace scope. Cross-workspace selection is denied by the spine before the
  store and every SQL query is tenant-scoped.
- Inputs are bounded and validated before persistence. Failures map to `invalid_request`, `not_found`, `conflict` or
  `access_denied`; raw database errors do not cross transport.
- Idempotent replay returns the original snapshot without a second version or audit event.

## Verification and rollout state

Local evidence on 2026-07-21:

- contracts vocabulary and coverage tests;
- domain mode-policy, replay, optimistic-concurrency, effective-resolution, tenant and denial tests;
- database seam tests for atomic assignment + audit, replay and tenant-scoped current reads;
- HTTP + typed SDK conformance for assign/change/get/effective/history, stable replay, conflicting replay=409 and
  cross-workspace denial;
- real PostgreSQL 16 ephemeral apply of migrations `0001→0002`: `globe_owner` ownership, correlated
  assignment+audit write, and fail-closed scope/idempotency constraints; the container was removed and Colima returned
  to its prior stopped state;
- full `pnpm check && pnpm build` in `efeonce-globe`.

The private-API smoke has an explicit `GLOBE_SMOKE_RESPONSIBILITY=1` lane and mints an ID token with verified service
account email. The database package exposes the read-only `verify:responsibility-migration` command for ledger,
`globe_owner`, runtime DML grants and constraints.

Internal rollout evidence on 2026-07-21:

1. migration `0002` applied through the keyless migrator; live verifier passed with `globe_owner`, both runtime users
   and seven constraints;
2. API/Studio deploy workflows `29858616172` / `29858618168` succeeded from runtime commit `00fee5d`; Ready revisions
   `00012-lcq` / `00017-4sd` run with `maxScale=3`;
3. authenticated smoke scope `task-1466-smoke-be28c266-4ff4-473d-9cec-2e286198bdc4` proved auth/audience denial,
   assign v1, stable/conflicting replay, change v2, effective/history and cross-workspace denial;
4. Cloud SQL readback confirmed the two assignment versions and the two correlated audit actions in
   `greenhouse-org:efeonce`; temporary token-creator grants were revoked.

The capability is operational **internal-only**. UI/MCP/external-client exposure and commercial production remain
blocked until their explicit tasks and access gates.

Functional and operator guidance: [`modos-operativos-responsabilidad-globe.md`](../../documentation/creative-studio/modos-operativos-responsabilidad-globe.md)
and [`operar-modos-responsabilidad-globe.md`](../../manual-de-uso/creative-studio/operar-modos-responsabilidad-globe.md).

## Invariants for agents

- Never use an assignment as authorization, membership, grant or entitlement.
- Never accept workspace or actor authority from request payload.
- Never infer a mode when no effective assignment exists.
- Never update a prior version or delete assignment/audit history after writes.
- Never expose pricing, vendor cost, margin, secrets or raw provider/database errors through this contract.
- Never bypass commands/readers with direct database or configuration writes.
