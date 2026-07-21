# Efeonce Globe — Platform Foundation V1

- Status: Accepted and bootstrapped
- Validated: 2026-07-19
- Product name: Efeonce Globe
- Functional descriptor: Creative Studio
- GCP project: **efeonce-globe**
- GitHub repository: **efeoncepro/efeonce-globe**

## Decision

Efeonce Globe is a separate sister platform governed by Greenhouse. It starts in one isolated GCP project and one private repository. The initial runtime shape is a modular TypeScript monorepo with a synchronous control plane and bounded asynchronous creative runners.

The single-project posture is an intentional two-way door for foundation work. Resource naming, tenancy, configuration and deployment contracts must remain environment-ready. A dedicated production project is introduced only when the first release and its budget/security gates justify it.

## System context

~~~mermaid
flowchart LR
  Users[Creative operators and clients] --> Globe[Efeonce Globe]
  Agents[Governed agents] --> Globe
  Greenhouse[Greenhouse control plane] <-->|versioned API, events and identity broker| Globe
  Globe --> Google[Google Cloud and Vertex AI]
  Globe --> Fal[fal.ai provider boundary]
  Globe --> Other[Other governed creative providers]
~~~

## Container direction

~~~mermaid
flowchart TB
  Web[studio-web: UI, BFF/API and MCP transport] --> Domain[domain commands and policies]
  Domain --> DB[(PostgreSQL)]
  Domain --> Dispatch[Cloud Tasks dispatcher]
  Dispatch --> Runner[creative-runner: Cloud Run Job]
  Runner --> Provider[provider adapters]
  Runner --> Assets[(Cloud Storage)]
  Runner --> Evidence[media QC and run evidence]
~~~

## Ownership

| Capability | Canonical owner |
| --- | --- |
| Ecosystem identity and desired access | Greenhouse |
| Client/account context and sister-platform bindings | Greenhouse |
| Creative workspaces and local entitlements | Globe, converging with Greenhouse desired state |
| Assets, rights, provenance and versions | Globe |
| Compositions, runs, provider routing and evidence | Globe |
| Creative credits, reservations and settlements | Globe |
| Provider credentials | Globe Secret Manager boundary |

## Foundation invariants

1. Tenant/workspace scope is explicit in every command and stored object.
2. Mutations are idempotent, authorized and audited.
3. Provider adapters expose capabilities, estimates, evidence and output bytes for content-addressed
   retention, and they certify what only they can judge about their own surfaces (such as whether a
   provider-side run reference is chainable); domain code does not depend on vendor model names or on
   vendor edit mechanisms.
4. Long media work does not hold synchronous web requests.
5. A run reserves credits only after explicit approval.
6. Generated media remains a candidate until professional review approves it.
7. Every deliverable has an immutable manifest, hash, lineage and rights posture.
8. UI and MCP invoke the same command/read model.
9. Model Lab execution and production route promotion are distinct gates: real model testing begins early under
   hard budget/private-ingest controls, while UI/MCP exposure requires tenant, ledger, idempotency, eval and
   rollback evidence.
10. Full API Parity exists at capability birth, not at UI/MCP rollout. Every capability owns versioned schemas,
    a canonical command/reader, trusted context, a private API/SDK path and conformance evidence; disabled
    surfaces are explicit `policy-blocked` states.
11. Actor/workspace authority is derived server-side. Caller payloads and headers never populate or override
    trusted command context.
12. The first billable Model Lab call uses the same API/SDK → command → adapter → runner seam intended for later
    surfaces. Direct provider calls from UI, MCP, CLI, task scripts or E2E are forbidden.

The delivery topology and the complete task graph are defined in
[`EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`](../../operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md).

## Durable persistence (TASK-1465)

Globe's first durable datastore is live (deployed + live-verified 2026-07-21). Sessions, OAuth transactions, experiments, evaluation reports and the spend fence are **no longer in-memory / per-process**: they persist in a Globe-owned Cloud SQL instance reached keyless over the Cloud SQL connector with IAM database authentication. Both Cloud Run services now run durable, which **removes the in-memory / `maxScale=1` HA ceiling** that ADR-004 hard-gated on this task — `maxScale > 1` is unblocked.

- **Instance:** Cloud SQL `globe-pg` — Postgres 16, `db-g1-small`, ZONAL, keyless IAM auth, connector-only (no authorized networks), PITR + backups, deletion protection. Provisioned in Terraform (`infra/terraform/cloud_sql.tf`). Globe-owned; never shared with Greenhouse.
- **Client:** `packages/database` — `createGlobePool` (Cloud SQL connector + pg pool + transaction), keyless IAM (a password exists only for the one-time bootstrap), migration runner against `globe._migrations` under `SET ROLE globe_owner`.
- **Role model:** `globe_owner` (NOLOGIN) owns every object; migrators are members; runtime service accounts get DML through default privileges. No standing superuser credential survives bootstrap.
- **Stores:** five durable stores behind the existing ports (experiments, evaluation reports, spend fence, sessions/OAuth) plus an append-only audit log, over six tenant-scoped tables and `audit_log`. The spend fence is a **safety** fence, not the deferred commercial credit ledger.
- **Still deferred:** the rich workspace / members / grants tenancy model, and persisting `maxScale` through Terraform (`TASK-1508`, which also brings the Cloud Run services into IaC).

Canonical spec: [`EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md).

## Deferred one-way doors

The bootstrap deliberately does not choose or provision the identity issuer, storage lifecycle, credit currency, provider credential set or production environment. Each requires an approved implementation task, threat model and runtime evidence. The **database itself is no longer deferred** — durable persistence landed in `TASK-1465` (see [Durable persistence](#durable-persistence-task-1465)); what remains deferred is the **rich workspace/members/grants tenancy model** layered on top of it.

The connectivity contract with Greenhouse is now defined in
[`GREENHOUSE_CONNECTIVITY_V1.md`](GREENHOUSE_CONNECTIVITY_V1.md). Its SDK foundation is implemented,
but human SSO, workload federation and Cloud Run IAM remain unprovisioned until the Greenhouse
identity task and runtime rollout gates are approved.

## Evolution gate for a production project

Create a separate production project when all are true:

- the first internal vertical slice is release-ready;
- infrastructure is reproducible through IaC;
- service identities and workload federation are proven;
- budget alerts and cost ceilings are approved;
- backup, retention, rollback and incident ownership are defined;
- provider secrets can be promoted without copying values through humans or logs.
