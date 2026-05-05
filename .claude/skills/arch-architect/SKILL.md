---
name: arch-architect-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global arch-architect skill defaults. Load this first whenever arch-architect is invoked inside this repo. Specializes in canonical 360 extension, Greenhouse domain boundaries, dual-store (PG+BQ), outbox + reactive consumer patterns, defense-in-depth (TASK-742 7-layer), and the canonized patterns from TASK-571/699/700/703/708/720/721/728/742/758/765/766/768/771/773/774.
type: overlay
overrides: arch-architect
user-invocable: true
argument-hint: "[area or question]"
---

# arch-architect — Greenhouse Overlay

This file **overrides** the global `arch-architect` skill's defaults when working inside the `greenhouse-eo` repository. When there's a conflict between the global skill and this overlay, **this overlay wins**.

**Load order**: read global `arch-architect/SKILL.md` first → then read this overlay → then apply rules.

## Why this overlay exists

The global arch-architect is good for greenfield decisions. Greenhouse is not greenfield: it's a Next.js 16 + MUI 7.x + PostgreSQL + BigQuery + Cloud Run platform with ~80 architecture specs in `docs/architecture/` and a strict canonical 360 model. Most architectural questions in this repo have a precedent — and the precedent is enforced.

This overlay pins the Greenhouse decisions so the global skill's "boring tech preference" lands on **the specific boring tech this repo uses**.

## Canonical authoritative sources (read first when relevant)

- **`CLAUDE.md`** at repo root — the operative contract for all agents. Contains hard rules.
- **`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`** — the 6 canonical objects. Extension pattern is mandatory.
- **`docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`** — master architecture document.
- **`docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`** — PG + BQ dual-store strategy.
- **`docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`** — Commercial vs Finance ownership.
- **`docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`** — reliability registry.
- **`docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`** + Platform Health V1.
- **`docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`** — TASK-742 7-layer defense template.

## Pinned decisions (OVERRIDES global arch-architect)

### 1. Canonical 360 extension is mandatory

Greenhouse has 6 canonical objects. **NEVER** create parallel identities for them.

- `Cliente` → `greenhouse.clients.client_id`
- `Colaborador` → `greenhouse.team_members.member_id`
- `Persona` → `greenhouse_core.identity_profiles.identity_profile_id`
- `Proveedor` → `greenhouse_core.providers.provider_id`
- `Space` → `greenhouse_core.spaces.space_id`
- `Servicio` → `greenhouse.service_modules.module_id`

Domain modules **extend** these via FK + supplementary tables. They never paralelize.

### 2. PostgreSQL first, BigQuery fallback

- **Postgres** = OLTP, runtime-first, mutations. Cloud SQL `greenhouse-pg-dev`, `us-east4`.
- **BigQuery** = analytical OLAP, raw snapshots, conformed marts.
- New write paths land on Postgres. BigQuery is downstream.
- Reads default Postgres; BQ fallback is explicit and degraded.

### 3. Outbox + reactive consumer is the canonical async path

Any state change that must propagate to projections / BQ / external systems goes through:
1. INSERT into `greenhouse_sync.outbox_events` in the same transaction as the state change.
2. Cloud Scheduler → ops-worker drains pending → publishes to BQ + reactive projection consumers.
3. State machine: `pending → publishing → published | failed → dead_letter`.

**Vercel cron is reserved for prod-only / tooling tasks** (see `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`). Async-critical paths run in Cloud Scheduler + ops-worker.

Spec: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`.

### 4. Canonical "VIEW + helper + reliability signal" pattern

When an aggregation has drift risk (FX, settlement, payments, projections):

- **One canonical VIEW** owns the calculation.
- **One canonical TS helper** wraps the VIEW.
- **One reliability signal** detects drift (steady = 0).
- **Lint rule** (when regression-prone) forbids re-derivation.

Established by TASK-571 (income settlement reconciliation), TASK-699 (FX P&L breakdown), TASK-766 (CLP reader), TASK-774 (account_balances FX). Replicate, don't deviate.

### 5. Defense-in-depth = 7-layer template (TASK-742)

For any safety-critical surface (auth, payment writes, reveal-sensitive, irreversible mutations):

- DB constraint (CHECK / UNIQUE / FK / EXCLUSION).
- Application guard (capability check, validators).
- UI affordance (disable / hide).
- Reliability signal (steady = 0 detection).
- Audit log (append-only, anti-UPDATE/DELETE trigger).
- Approval workflow (when applicable).
- Outbox event versioned v1 (when applicable).

No critical decision lives on a single layer.

### 6. State machine + CHECK + audit trio

For any transition-heavy entity (payment_orders, expenses, services, approvals):

- Allowed transitions enumerated in code + DB.
- CHECK constraint forbids invalid states.
- Anti-zombie CHECK forbids "active" without progress beyond N days.
- Append-only audit table with anti-UPDATE / anti-DELETE triggers.
- Outbox event per transition.

Established by TASK-700 (account number registry) + TASK-765 (payment order state machine). Replicate.

### 7. Capabilities granular, not coarse

Any new write surface gets a **dedicated capability** (`<module>.<entity>.<action>`). NEVER reuse `<module>.admin` as a catch-all.

Exception path requires explicit ADR.

### 8. Reliability signals everywhere

Every async path (cron, projection, sync, materializer) ships with a reliability signal in `src/lib/reliability/queries/`. Signal is wired to `getReliabilityOverview` and shows on `/admin/operations`.

Subsystem rollups: `Finance Data Quality`, `Identity & Access`, `Event Bus & Sync Infrastructure`, `Commercial Health`, `Notion Sync`.

### 9. Canonical asset uploader for evidence (TASK-721)

Any evidence upload (reconciliation snapshot, finiquito attachment, audit screenshot) goes through `<GreenhouseFileUploader contextType=...>` + `/api/assets/private`. **NEVER** ad-hoc uploads.

### 10. Domain boundaries

- **Commercial** owns: quotes, deals, services (catalog + instances), agreements. UI in `/agency/*`.
- **Finance** owns: income, expenses, payments, reconciliation, FX, P&L. UI in `/finance/*`.
- **HR** owns: payroll, contracts, benefits. UI in `/hr/*`.
- **Identity** owns: auth, capabilities, organizations lifecycle. UI in `/admin/*`.
- **Delivery** owns: tasks, projects, sprints, ICO. UI in `/agency/*` for delivery views.

`docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` is canonical for commercial vs finance.

### 11. Tasks pipeline + lifecycle

New tasks live in `docs/tasks/to-do/TASK-###-*.md` following `docs/tasks/TASK_TEMPLATE.md`. Move to `in-progress/` and `complete/` per `docs/tasks/TASK_PROCESS.md`.

Any architecture spec from this skill that requires implementation creates a TASK-### file via the `greenhouse-task-planner` skill.

### 12. Migration discipline

- **node-pg-migrate** is canonical. `pnpm migrate:create <slug>` ALWAYS (never hand-edit timestamps).
- Every migration starts with `-- Up Migration` marker.
- `NOT VALID + VALIDATE` two-step for constraints on populated tables.
- `CREATE INDEX CONCURRENTLY` in production.
- Verify DDL applied via `information_schema` after `pnpm migrate:up` (silent failures detected in TASK-768 Slice 1).

### 13. Secret hygiene (TASK-742 layer)

- `*_SECRET_REF` resolves from GCP Secret Manager.
- `validateSecretFormat` for critical secrets before publishing.
- `pnpm secrets:rotate` for rotation (verify-before-cutover).
- Never raw `process.env.X_SECRET` for critical secrets in production paths.

### 14. Sentry + reliability rollup

- `captureWithDomain(err, '<domain>', { extra })` instead of `Sentry.captureException` directly.
- Domains: `finance`, `identity`, `commercial`, `delivery`, `integrations.notion`, `integrations.hubspot`, `home`.
- Each module's incidents tagged → roll up in registry → visible at `/admin/operations`.

### 15. Output redaction

`redactErrorForResponse` and `redactSensitive` from `src/lib/observability/redact.ts` for any error / response that crosses a security boundary. NEVER raw `error.message` or `error.stack` in HTTP responses.

## Greenhouse-canonical patterns inventory

When designing in this repo, the 3-most-relevant-patterns step (from the global skill's investigation protocol) starts with this set:

| Need | Reference task | Pattern |
|---|---|---|
| Aggregation with drift risk | TASK-571, TASK-699, TASK-766, TASK-774 | VIEW canónica + helper + reliability signal + lint rule |
| State machine entity | TASK-700, TASK-765 | enumerated transitions + CHECK + audit log + outbox events v1 |
| Defense in depth | TASK-742 | 7-layer pattern (DB + app + UI + signal + audit + workflow + outbox) |
| Async projection | TASK-771, TASK-773 | outbox + reactive consumer + dead_letter + reliability lag signal |
| Decoupling Vercel cron from infra-critical work | TASK-775 | Cloud Scheduler + ops-worker + 3 cron categories (async_critical / prod_only / tooling) |
| Evidence upload | TASK-721 | canonical asset uploader + dedup + retention class |
| Analytical dimension separate from fiscal | TASK-768 | dimension column + resolver + reclassification endpoint + manual queue + audit log |
| Health contract for agents/tools | TASK-672 | Platform Health V1 + 4-pillar safe-modes + recommended checks |
| Time-versioned terms | TASK-700 | terms table with `effective_from/to` + UNIQUE active partial index |
| Canonical helper enforcement | TASK-721 | lint rule + helper module + override block for legitimate exceptions |
| Declarative flag platform | TASK-780 | scope precedence (user > role > tenant > global) + reliability signal for drift |

## Hard rules (Greenhouse-specific)

- **NEVER** create a parallel identity for a 360 object.
- **NEVER** read or write canonical aggregations (FX, settlement, P&L, ICO) outside their canonical VIEW + helper.
- **NEVER** put async-critical work on Vercel cron. Use Cloud Scheduler + ops-worker.
- **NEVER** ship a write surface without: capability + DB constraint + reliability signal + audit log.
- **NEVER** mix orthogonal dimensions in a single enum (e.g. engagement_kind + commercial_terms).
- **NEVER** delete data. Use supersede / archive / soft-tombstone with explicit retention.
- **NEVER** invoke Sentry directly when a domain rollup exists. Use `captureWithDomain`.
- **NEVER** invent primitives the canonized patterns inventory already covers.
- **SIEMPRE** crear el TASK-### file (via `greenhouse-task-planner`) cuando un spec requiere implementación.
- **SIEMPRE** declarar `Domain boundary` en el spec.
- **SIEMPRE** scoring 4-pilar explícito.
- **SIEMPRE** citar 3 patrones canonizados existentes que el diseño extiende o de los que diverge.

## Synergies with other skills

- `greenhouse-postgres` — when designing Postgres schemas, this skill decides the shape; `greenhouse-postgres` validates the migration mechanics.
- `greenhouse-finance-accounting-operator` — when the design touches accounting/finance, invoke this for tax/regulatory/IFRS correctness.
- `greenhouse-task-planner` — once a spec is written here, generate the TASK-### file.
- `greenhouse-cron-sync-ops` — for async cron / outbox / projection design.
- `greenhouse-secret-hygiene` — for any design touching secrets.
- `claude-api` — for prompt + agent SDK implementation after this skill decides the agent topology.
- `modern-ui` (Greenhouse overlay) — for UI architecture + token discipline.

## Output convention

All architecture specs go in `docs/architecture/GREENHOUSE_<TOPIC>_V<N>.md`. Numbering and template follow existing specs there.

ADRs (if/when adopted) go in `docs/adr/ADR-NNNN-*.md`. (Greenhouse currently embeds decisions in V1 specs rather than separate ADRs; consult with user before introducing the ADR pattern broadly.)

Reading order in `docs/architecture/` is documented in `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.
