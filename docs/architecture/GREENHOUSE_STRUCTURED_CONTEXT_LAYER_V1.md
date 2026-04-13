# Greenhouse Structured Context Layer V1

## Delta 2026-04-13 — Runtime foundation materialized in repo

- La foundation ya no es solo intención arquitectónica.
- Implementación materializada:
  - migración `migrations/20260413113902271_structured-context-layer-foundation.sql`
  - runtime `src/lib/structured-context/`
  - piloto real de lectura/escritura sobre `src/lib/sync/reactive-run-tracker.ts`
- La migration crea:
  - `greenhouse_context.context_documents`
  - `greenhouse_context.context_document_versions`
  - `greenhouse_context.context_document_quarantine`
  - secuencia `greenhouse_context.seq_context_document_public_id`
- La primera taxonomía runtime queda conectada a validadores reales para:
  - `event.replay_context`
  - `agent.audit_report`
  - `agent.execution_plan`
- Primer piloto activo:
  - el tracking de runs reactivos ahora puede persistir y releer `event.replay_context` como sidecar de `greenhouse_sync.source_sync_runs`
- Nota operativa:
  - la aplicación local de la migración en shared dev DB quedó bloqueada por drift de historial con una migración ya aplicada de `TASK-379`; el contrato de la capa y el runtime sí quedaron cerrados en repo

## Delta 2026-04-13 — Structured Context Layer proposed as canonical sidecar for flexible, typed, governable JSON

- Greenhouse ya usa `jsonb` en múltiples dominios (`payload_json`, `metadata_json`, `snapshot_payload`, `source_payload_json`, `metric_trust_json`), pero todavía no tiene una capa canónica que gobierne cuándo usarlo, cómo tiparlo y dónde ubicarlo en el modelo.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- Regla arquitectónica propuesta:
  - el contexto flexible debe modelarse como una sidecar layer explícita y no como `jsonb` genérico disperso en cualquier tabla core
  - la verdad principal de negocio sigue en el modelo relacional canónico
  - la nueva layer debe servir tanto a integraciones y automatizaciones como al desarrollo asistido por agentes

## Purpose

This document defines the canonical architecture for storing flexible, typed, governable structured context around Greenhouse canonical objects.

It exists to answer:

- where JSON belongs in the platform
- where JSON must not replace relational truth
- how flexible context should be attached to canonical aggregates
- how agents, integrations, outbox consumers, projections, and debugging flows can reuse the same memory layer
- how to evolve from the current scattered `jsonb` usage toward a governed pattern

Read together with:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

## Status

This is now both an architecture contract and a runtime foundation already materialized in the repo.

Current reality:

- Greenhouse already stores many JSON payloads across runtime, integrations, audit trails, and serving caches
- those fields are locally useful but not yet governed as a shared capability
- agents and humans still depend too much on markdown handoff, logs, and source-specific payloads to recover context

Target direction:

- keep relational truth canonical
- introduce a dedicated **Structured Context Layer** as a governed sidecar
- let future modules consume flexible context through a typed, versioned contract instead of inventing ad hoc `jsonb` blobs

## Core Thesis

Greenhouse should treat structured context as a platform capability, not as an accidental byproduct of whichever module first needed a JSON field.

That means:

- canonical relational objects still own business truth
- structured context is attached to those objects as sidecar memory
- sidecar memory is typed, versioned, queryable, and attributable
- agents, integrations, and reactive pipelines can reuse this memory instead of reconstructing context from scratch

Greenhouse should not become:

- a platform where every core table grows a catch-all `metadata_jsonb`
- a platform where payloads, assumptions, and debug evidence live only in logs or chat
- a platform where agents must re-discover the same context because prior runs left no machine-readable trace

## Why This Matters

Without a governed structured context layer:

- modules keep introducing local `jsonb` fields with inconsistent semantics
- integrations preserve raw payloads but not a reusable normalized context contract
- agents depend on chat history, ad hoc docs, and log spelunking to understand prior work
- replay, audit, and debugging flows reconstruct the same missing context repeatedly
- consumers cannot tell whether a JSON document is metadata, raw source, audit evidence, or serving cache

With a governed structured context layer:

- the relational model remains clean
- flexible data gets a formal home
- agents gain a machine-readable memory surface for audits, assumptions, and execution traces
- integrations and reactive projections share the same contract for raw context, normalized context, and replay context
- future readers can query context by aggregate, kind, producer, tenant, and version

## Placement in the Model

The Structured Context Layer sits between canonical runtime truth and downstream serving/projections.

```text
Canonical Core
  -> Structured Context Layer
    -> Serving / Projections / Agent Surfaces / Ops Observability
```

### Canonical Core

Relational truth:

- IDs
- statuses
- financial amounts
- dates
- ownership
- foreign keys
- tenant isolation

### Structured Context Layer

Flexible but governed sidecar documents:

- metadata
- snapshots
- raw payloads
- normalized context
- audit evidence
- agent execution traces
- replay context
- UI display context

### Serving / Projections

Read-optimized consumers that may compose canonical fields plus structured context, but must not treat the context document as the only source of truth.

## Canonical Name

The canonical architectural name is:

- **Structured Context Layer**

Recommended runtime abbreviation:

- **SCL**

Recommended PostgreSQL schema:

- `greenhouse_context`

Recommended TypeScript module root:

- `src/lib/structured-context/`

## Design Principles

### 1. Relational truth stays relational

Do not move canonical business truth into JSON.

Never use the Structured Context Layer as the primary home for:

- canonical status
- amounts and balances
- contractual dates
- tenant ownership
- authoritative foreign keys
- permission state

### 2. Context is sidecar, not shadow truth

Context documents enrich an aggregate but do not replace its canonical fields.

### 3. Typed over arbitrary

`jsonb` in the database must still map to domain-specific runtime schemas.

In TypeScript, context documents should resolve to explicit types or validators, not `any`.

### 4. Versioned from day one

Every context document needs `schema_version`.

This allows:

- future migrations
- backward-compatible readers
- producer evolution without blind breakage

### 5. Queryable by intent

The layer must support stable querying by:

- aggregate owner
- context kind
- producer type
- source system
- tenant scope

### 6. Useful for agents, not only for integrations

The layer is intentionally designed to support AI and multi-agent development workflows, not just webhook payload storage.

## Agent Decision Rules — When To Use Relational Columns, JSONB, JSON, Or Neither

This section is normative for agents and developers working on Greenhouse.

### Rule 1 — Use relational modeling first

Use normal columns and tables when the data is part of canonical business truth.

That includes:

- IDs and foreign keys
- lifecycle states
- balances, amounts, and accounting truth
- contractual dates
- permission and access state
- ownership and tenant isolation
- fields that are filtered, joined, grouped, or enforced regularly

If the answer to "is this part of the canonical object model?" is yes, then the answer is **not JSON** and **not JSONB**.

### Rule 2 — Use JSONB inside PostgreSQL when the context is structured, flexible, and operationally useful

Use `jsonb` when all of these are true:

- the data is not the canonical truth of the aggregate
- the structure can evolve over time
- the value is still machine-readable and worth validating
- Greenhouse may query, merge, replay, or inspect it later

Good fits in Greenhouse:

- normalized integration payloads
- replay context for reactive runs
- audit evidence bundles
- snapshots used for explanation or debugging
- agent assumption sets, audit reports, execution plans, and result summaries
- local metadata that is narrow and clearly bounded

### Rule 3 — Use JSON only when exact raw representation matters more than database behavior

Inside Greenhouse, plain `json` should be rare.

Use `json` only when you must preserve the incoming representation as-is and do **not** need the normal PostgreSQL `jsonb` advantages such as:

- indexing
- containment queries
- patch/merge operations
- normalized binary storage

Typical examples are limited to:

- pass-through raw payload preservation where exact ordering/format matters
- artifacts outside the canonical DB model
- transient serialization boundaries in app/runtime code

If the data is being stored in PostgreSQL and Greenhouse may inspect it later, default to `jsonb`, not `json`.

### Rule 4 — Do not add catch-all JSONB to core aggregates by default

Do not solve uncertainty by adding:

- `metadata_jsonb`
- `extra_json`
- `payload`
- `data`

to every aggregate "just in case".

That pattern creates shadow truth and weakens the data model.

If the context is broad, cross-cutting, or likely to grow, put it in the Structured Context Layer instead of bolting a generic `jsonb` field onto the core table.

### Rule 5 — Inline JSONB is acceptable only for narrow, local extension areas

Inline `jsonb` in a domain table is still acceptable when:

- the scope is local to that table
- the document is small
- the shape is well understood
- the field is not becoming a second schema
- there is no cross-aggregate reuse need

Examples already present in Greenhouse:

- narrow `metadata_json` in assets or bindings
- trust or evidence payloads tied to one serving row
- source payload snapshots tied to one import/reconciliation row

If multiple modules start depending on that document, it has outgrown inline `jsonb` and should be promoted to the Structured Context Layer or to relational tables, depending on the use case.

### Rule 6 — If it is queried by business keys repeatedly, promote it

When a JSONB key starts becoming:

- a repeated filter
- a join target
- part of reporting
- part of access control
- part of reconciliation truth

it should stop being "just context".

Promote it into explicit relational columns or child tables.

### Rule 7 — Agent shortcut

Agents should apply this fast decision tree:

1. Is it canonical business truth?
   -> Relational
2. Is it flexible context worth persisting and reusing inside PostgreSQL?
   -> JSONB
3. Is exact raw representation the main concern and DB semantics do not matter?
   -> JSON, but only exceptionally
4. Is it just uncertainty about the model?
   -> Neither; model it properly first

## Recommended Physical Model

### Schema

- `greenhouse_context`

### Core table

- `greenhouse_context.context_documents`

Recommended fields:

- `context_id`
- `owner_aggregate_type`
- `owner_aggregate_id`
- `context_kind`
- `schema_version`
- `source_system`
- `producer_type`
- `producer_id`
- `space_id`
- `organization_id`
- `client_id`
- `document_jsonb`
- `created_at`
- `updated_at`

### Optional version history

- `greenhouse_context.context_document_versions`

Recommended fields:

- `version_id`
- `context_id`
- `version_number`
- `schema_version`
- `changed_by_type`
- `changed_by_id`
- `document_jsonb`
- `change_reason`
- `created_at`

### Why sidecar tables instead of inline `jsonb` everywhere

The sidecar model gives Greenhouse:

- one place to govern flexible context
- explicit ownership by aggregate
- separate lifecycle when the context changes more often than the aggregate
- safer indexing and retention policies
- less pollution in core transactional tables

## Enterprise Hardening Requirements

To be truly enterprise-grade, the Structured Context Layer needs more than typed `jsonb`.

It also needs explicit rules for:

- data classification
- retention and expiration
- idempotent writes and document lineage
- access control and redaction
- storage budgets and document size limits
- observability, validation failure handling, and quarantine

Without these controls, the layer would still be useful, but it would not yet be robust enough for high-scale, multi-agent, multi-integration operation.

### 1. Data classification is mandatory

Every context kind should declare its sensitivity profile.

Recommended envelope fields:

- `data_classification` — example values: `public`, `internal`, `confidential`, `restricted`
- `contains_pii` — boolean
- `contains_financial_context` — boolean
- `contains_secrets` — boolean, expected to be `false` in normal operation
- `redaction_status` — example values: `not_needed`, `redacted`, `restricted`

Hard rule:

- secrets, tokens, credentials, raw session cookies, signed auth material, and private keys must **not** be stored in the Structured Context Layer

If a producer receives that material, it must:

- redact it
- replace it with references
- or drop it entirely

### 2. Retention and lifecycle must be explicit

Not all context should live forever.

Each context kind should define:

- `retention_policy_code`
- `expires_at` when applicable
- whether the document is:
  - ephemeral
  - operational
  - audit-grade
  - historical

Examples:

- raw integration payloads may need shorter retention
- replay context may expire after operational windows close
- audit evidence may need longer retention
- agent execution traces may need aggressive retention and redaction

### 3. Writes must be idempotent and traceable

The layer should support repeat-safe production.

Recommended fields:

- `idempotency_key`
- `content_hash`
- `supersedes_context_id`
- `created_by_type`
- `created_by_id`

This matters because integrations, retries, reactive reprocessing, and agents may attempt to emit equivalent context more than once.

Enterprise rule:

- duplicate writes should be detectable
- replacements should preserve lineage
- append-only history should be available where auditability matters

### 4. Access control must be narrower than base table visibility

Tenant scoping alone is not enough.

Some context documents may be:

- internal only
- ops-only
- finance-restricted
- safe for client-facing readers after redaction

Recommended envelope field:

- `access_scope`

Example values:

- `internal`
- `restricted_ops`
- `restricted_finance`
- `client_safe`

Read APIs should be able to enforce these scopes instead of assuming that every consumer of an aggregate can also read all of its context documents.

### 5. Storage budgets and size limits are required

This layer should store structured context, not binary payload abuse.

Hard rules:

- do not store files, PDFs, images, or large base64 blobs in `document_jsonb`
- store binary objects in Greenhouse Assets and reference them from context
- set maximum document size budgets per `context_kind`

Operational recommendation:

- keep documents small and purposeful
- split giant compound documents into separate context records when lifecycle or ownership differs

### 6. Validation failures need quarantine, not silent loss

If a producer emits an invalid context document, Greenhouse should not silently accept garbage and should not silently drop it either.

Enterprise-safe handling means:

- fail validation explicitly
- log producer and aggregate metadata
- send invalid payloads to a quarantine or dead-letter path when loss would be operationally dangerous

The layer should expose enough metadata to answer:

- what producer emitted the invalid document
- for which aggregate
- under which schema version
- whether it was retried, rejected, or quarantined

### 7. Observability must treat context as a platform capability

The platform should measure:

- documents written by `context_kind`
- validation failures
- average and p95 document size
- duplicate/idempotency collisions
- redaction-required incidents
- reads by consumer type
- expired documents awaiting cleanup

If the layer becomes important to agents, replay, or integrations, then it needs platform-level telemetry, not module-local guesswork.

### 8. Promotion to relational must remain part of the contract

Enterprise maturity does not mean "more JSONB forever".

It means Greenhouse can use flexible context safely while still promoting stable, repeated, contractual fields into relational modeling at the right time.

If a JSONB key becomes:

- operationally critical
- heavily queried
- cross-module contractual
- part of compliance or finance truth

that is a signal to promote it, not to index deeper forever.

## Recommended Enterprise Envelope Additions

Beyond the base fields, enterprise implementations should strongly consider:

- `data_classification`
- `contains_pii`
- `redaction_status`
- `retention_policy_code`
- `expires_at`
- `idempotency_key`
- `content_hash`
- `supersedes_context_id`
- `access_scope`

Not every context kind needs every field populated, but the model should have a place for them.

## Recommended Key Fields

### `owner_aggregate_type`

Examples:

- `purchase_order`
- `service_entry_sheet`
- `identity_profile`
- `organization`
- `space`
- `outbox_event`
- `source_sync_run`
- `sister_platform_binding`

### `context_kind`

This is the main semantic classifier.

Examples:

- `integration.raw_payload`
- `integration.normalized_payload`
- `integration.sync_context`
- `event.audit_context`
- `event.replay_context`
- `finance.document_metadata`
- `finance.workflow_snapshot`
- `agent.audit_report`
- `agent.execution_plan`
- `agent.assumption_set`
- `agent.result_summary`
- `ui.display_context`

### `producer_type`

Recommended enum-like values:

- `human`
- `system`
- `agent`
- `integration`

### `source_system`

Examples:

- `hubspot`
- `nubox`
- `notion`
- `microsoft_entra`
- `greenhouse_portal`
- `kortex`

## Context Taxonomy

### A. Integration Context

Use for:

- raw upstream payloads
- normalized payloads
- sync metadata
- source-specific diagnostics

Examples:

- last raw HubSpot deal payload attached to a `quote`
- normalized Notion task context attached to a `source_sync_run`
- SCIM request summary attached to provisioning objects

### B. Event and Reactive Context

Use for:

- replay metadata
- fan-out context
- projection failure evidence
- coalescing hints
- idempotency traces

Examples:

- outbox event replay context
- projection failure envelope
- dead-letter payload with classifier metadata

### C. Finance Workflow Context

Use for:

- document metadata
- workflow snapshots
- non-authoritative evidence
- structured reasons and observations

Examples:

- OC/HES attachment inheritance metadata
- validation snapshot for a HES
- reconciliation matching evidence

### D. Agent Execution Context

Use for:

- machine-readable audits
- execution plans
- assumptions used during a run
- structured results
- downstream handoff memory

Examples:

- audit report for a task or issue
- assumptions used during a data repair
- result summary from an agent-assisted backfill
- execution trace for a reactive incident investigation

### E. UI / Display Context

Use sparingly for:

- layout hints
- display grouping
- user-facing composition metadata

Do not use this as the only source for visible status or business logic.

## What This Layer Is Especially Good For in Agent-Heavy Development

This is one of the strongest arguments for creating the layer.

### 1. Machine-readable handoff memory

Today, multi-agent context often lives in:

- chat history
- markdown handoffs
- logs
- screenshots
- local reasoning that disappears after the run

The Structured Context Layer can preserve structured artifacts such as:

- audit findings
- assumption sets
- execution decisions
- remediation summaries
- downstream risks

This lets future agents resume work from data, not from vague narrative alone.

### 2. Safer autonomous debugging

Agents can attach structured context to aggregates like:

- `source_sync_run`
- `outbox_event`
- `projection_failure`
- `purchase_order`
- `service_entry_sheet`

This makes it much easier to answer:

- what did the agent inspect
- what did it conclude
- what data did it rely on
- what exact remediation was attempted

### 3. Better replayability

Reactive and integration flows benefit from a stable context contract for:

- raw input
- normalized input
- replay parameters
- prior run evidence

That reduces the need to reconstruct the world from logs every time something fails.

### 4. Less prompt bloat

Agents work better when reusable context is queryable from the system rather than re-pasted into every prompt.

The layer becomes a structured memory substrate that complements docs and chat without replacing either.

### 5. Better separation between human docs and runtime memory

`Handoff.md`, tasks, and architecture docs remain human-readable governance.

The Structured Context Layer becomes runtime-readable memory.

Both are useful; they serve different jobs.

## Query and Indexing Guidance

Recommended baseline indexes:

- `(owner_aggregate_type, owner_aggregate_id)`
- `(context_kind)`
- `(producer_type, source_system)`
- tenant-scoped composites where needed:
  - `(space_id, context_kind)`
  - `(organization_id, context_kind)`
  - `(client_id, context_kind)`

Recommended JSONB index:

- GIN on `document_jsonb` only when a context kind is expected to be queried by internal keys repeatedly

Do not create broad GIN indexes on every context document table without a query-driven reason.

## Governance Rules

### Rule 1 — Prefer sidecar over inline for large or evolving documents

If the flexible payload:

- is large
- changes often
- needs version history
- belongs to integrations, agents, or replay/debug flows

then it belongs in the Structured Context Layer, not as a random `jsonb` field in the core table.

### Rule 2 — Inline `jsonb` is allowed only for narrow local metadata

Inline `jsonb` may still be acceptable when:

- the document is small
- the ownership is obvious
- the lifecycle is identical to the aggregate
- version history is unnecessary

Examples:

- tiny display metadata
- lightweight document annotations

### Rule 3 — Every context kind must have a typed reader/writer contract

The database may store JSONB, but the application must read and write it through typed helpers or validators.

### Rule 4 — Promote to relational when the shape becomes canonical

If the same JSON keys become:

- frequently filtered
- frequently joined
- operationally critical
- central to business invariants

then the shape has matured and should be promoted into relational columns or tables.

## Anti-Patterns

Do not:

- add `metadata_jsonb` to every aggregate by default
- treat raw payload JSON as the serving contract for downstream modules
- store canonical status only inside JSON
- use the layer as a substitute for migrations
- rely on opaque JSON for cross-module joins
- leave agent decisions only in chat when they materially affect runtime investigation or replay

## Relationship to Existing JSON Usage

This layer does not mean all current JSON fields are wrong.

Current examples that remain valid in context:

- `payload_json` in outbox and source sync
- `metadata_json` in assets and bindings
- `snapshot_payload` in approval workflows
- `source_payload_json` in reconciliation imports
- `metric_trust_json` in serving caches

What changes is the governance:

- future flexible context should prefer the Structured Context Layer when the document is cross-cutting, evolving, or useful beyond one local table
- existing scattered JSON can gradually converge toward the new contract when touched by future tasks

## Adoption Strategy

### Phase 1 — Architecture and taxonomy

- define the layer
- define `context_kind`
- define governance and anti-patterns

### Phase 2 — Postgres foundation

- create `greenhouse_context`
- create `context_documents`
- create optional `context_document_versions`

### Phase 3 — Runtime library

- typed readers/writers
- validators
- helper APIs
- version handling

### Phase 4 — First consumers

Recommended first consumers:

- reactive projection failures and replay context
- integration sync runs
- agent audit reports and execution summaries

### Phase 5 — Selective convergence

- gradually move high-value ad hoc JSON patterns toward the layer where it improves governance

## Decision Summary

Greenhouse should adopt a **Structured Context Layer** as a canonical sidecar capability for flexible JSON-based context.

Its main value is not “Postgres supports JSONB”.

Its main value is:

- keeping core truth relational
- giving integrations and reactive flows a governed context home
- giving agents a machine-readable memory substrate for audits, assumptions, traces, and replay context
- reducing drift between runtime evidence, debugging, and human documentation
