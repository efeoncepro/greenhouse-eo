# GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1

## Purpose

This document tells agents how to evolve `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` without creating drift between architecture, runtime and data migrations.

Use it whenever a change touches:
- PostgreSQL schemas
- BigQuery datasets
- source sync
- canonical IDs
- cross-module object relationships
- HubSpot or Notion bindings

## Source Of Truth Rule

For the Greenhouse data model:
- structural truth lives in `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- platform principles still live in:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Rule:
- do not duplicate full model inventories across many docs
- update the master model doc first
- update the specialized architecture doc only if the architectural rule itself changed

## When Agents Must Update The Master Data Model Doc

Update `GREENHOUSE_DATA_MODEL_MASTER_V1.md` when any of these happens:

1. A new canonical object is introduced.
2. A new schema or dataset is created.
3. A source projection becomes runtime-critical.
4. A source-to-canonical mapping rule changes.
5. A relationship between modules becomes explicit for the first time.
6. A transitional bridge becomes deprecated or is replaced by a canonical one.
7. A new external source becomes part of the 360 graph.

Examples:
- adding `greenhouse_crm.contacts`
- turning `project_database_source_id` into the tenant delivery binding
- changing how `HubSpot Contact -> client_user` reconciliation works
- adding `greenhouse_finance.reconciliation_periods`

## Update Order

When a data-model change is real, update docs in this order:

1. If the architectural rule changed, update the relevant specialized architecture doc first.
2. Update `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`.
3. Update the implementation:
   - SQL
   - migrations
   - source-sync jobs
   - repositories
4. Update `project_context.md` with a short delta.
5. Update `Handoff.md` with operational status and risks.
6. Update `changelog.md` with one short impact note.

## Required Sections To Maintain In The Master Doc

Agents must keep these sections current:
- physical model
- canonical object graph
- transitional rules
- non-negotiable modeling rules
- immediate follow-ups

If a new concept does not fit one of those sections, the agent should add the smallest new section that preserves clarity.

## How To Document Reality Versus Target

Every meaningful data-model note must be labeled as one of:
- current state
- transitional state
- target state

Do not blur them together.

Good:
- "Current state: tenant mapping still relies on `notion_project_ids`."
- "Target: tenant binding must move to `project_database_source_id`."

Bad:
- "Notion maps to tenant." without saying whether this is already true in data or only the desired model.

## Canonical Anchor Rule

Before documenting a new object, agents must answer:
- what is the canonical anchor
- what are the source references
- which module owns the mutable workflow
- whether the object is:
  - canonical
  - extension
  - projection
  - serving view
  - mart

If that is not clear yet, the change is not architecturally closed.

## Relationship Documentation Rule

Whenever a cross-system bridge matters for runtime, the master doc must say it explicitly.

Examples that must always stay explicit:
- `HubSpot Company -> Greenhouse Client`
- `HubSpot Contact -> Greenhouse User / Identity Profile`
- `Notion project database -> tenant delivery workspace`
- `Notion project/task/sprint -> greenhouse_delivery.*`
- `Provider -> Finance Supplier -> AI Tooling vendor`

## How To Document Legacy Bridges

Legacy bridges are allowed, but they must be marked as transitional.

Template:
- current practical bridge
- why it exists
- why it is not the target
- what will replace it

Example:
- `greenhouse.clients.notion_project_ids` is still used today
- it works as project-page scope
- it is not yet a clean tenant delivery workspace binding
- target replacement is explicit `project_database_source_id` binding

## Required Validation Before Declaring A Data Model Change Closed

At least one of these must be true:
- SQL setup or migration executed successfully
- source-sync run executed successfully
- `pnpm build` or `pnpm lint` passed for touched runtime/tooling files
- data counts were verified against the affected store

If validation is partial:
- say exactly what ran
- say exactly what is still pending

## No-Drift Rules For Agents

Agents must not:
- add a runtime table without declaring its canonical anchor
- invent new source-to-tenant joins only in code
- update `project_context.md` without updating the master doc when the model actually changed
- document "contact", "client", "user", "member", "provider" or "project" differently in separate docs

## Review Checklist For Future Agents

Before closing a data-model turn, verify:
- the master doc reflects the new object or relationship
- specialized architecture docs still agree with it
- source references and canonical IDs are both clear
- `Handoff.md` explains the operational state
- `changelog.md` captures the behavior or platform impact

## Short Rule

If runtime, sync or migrations changed the shape of the Greenhouse graph, the master data model doc must change in the same turn.
