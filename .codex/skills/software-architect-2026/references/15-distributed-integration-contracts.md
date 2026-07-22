# Distributed systems and integration contracts

Use this reference when a design crosses process, trust, datastore, team, tenant, or vendor boundaries. Distribution spends consistency, latency, operability, and organizational coordination; require a concrete reason for it.

## Table of contents

- [Boundary decision](#boundary-decision)
- [End-to-end contract](#end-to-end-contract)
- [Consistency and failure semantics](#consistency-and-failure-semantics)
- [Synchronous APIs](#synchronous-apis)
- [Events and messaging](#events-and-messaging)
- [Webhooks](#webhooks)
- [Data contracts](#data-contracts)
- [Multi-tenancy across boundaries](#multi-tenancy-across-boundaries)
- [Evolution and verification](#evolution-and-verification)
- [Architecture output](#architecture-output)
- [Official sources](#official-sources)

## Boundary decision

Before splitting a system, name:

- business capability and owner on each side;
- source of truth and invariant owner;
- independent scaling, security, lifecycle, or team need that justifies the boundary;
- additional latency, partial failure, data duplication, support, and cost accepted;
- merge/extraction path and blast radius.

Prefer an in-process module when independent deployment is not required. Never share writable tables, hidden session state, filesystem assumptions, or private implementation types across an intended service boundary.

Choose interaction by semantics:

| Need | Default shape | Principal cost |
|---|---|---|
| Immediate answer/validation | Synchronous request-response | temporal coupling and cascading latency |
| Durable command accepted now | Async command + receipt/status | eventual completion and reconciliation |
| Publish a fact to unknown consumers | Versioned event | consumer lag, duplication, schema evolution |
| Notify an external subscriber | Signed webhook + retries | public delivery security and uncertain outcomes |
| Bulk analytical exchange | Versioned dataset/data product | freshness, lineage, and compatibility |

Do not disguise commands as past-tense events or use a queue to avoid defining an API.

## End-to-end contract

For every integration define:

- producer/provider and consumer/subscriber owners;
- operation/event/dataset name, semantic version, schema, examples, and source of truth;
- authentication, authorization, tenant/workspace scope, and purpose limitation;
- timeout/deadline, size, rate, quota, ordering, concurrency, and freshness constraints;
- delivery guarantee and what duplicates, gaps, delay, and reordering mean;
- idempotency/deduplication key, uniqueness scope, retention, and replay behavior;
- success, rejection, retryable failure, permanent failure, and uncertain outcome;
- observability/correlation, audit requirements, and safe error contract;
- compatibility window, deprecation notice, consumer migration, and retirement owner;
- test fixtures, conformance checks, SLO/support route, and incident responsibility.

Document semantics separately from transport. “Exactly once” is not an end-to-end guarantee unless every state transition and side effect proves it; design consumers for at-least-once delivery and reconciliation when doubt exists.

## Consistency and failure semantics

State the invariant and consistency scope explicitly:

- strong consistency for invariants that cannot tolerate concurrent conflict;
- causal/session guarantees when a user must observe their own prior change;
- eventual consistency when delay is acceptable and convergence is defined;
- compensating action only when it is a valid business operation, not a technical undo fantasy.

For multi-resource workflows, prefer a local transaction plus durable outbox; consumers use inbox/deduplication and idempotent handlers. Define saga state, timeout, compensation, and human resolution for stuck/irreversible steps. Keep the original business command, resulting facts, and audit evidence distinguishable.

Bound retries by deadline and budget. Use exponential backoff with jitter for transient failures. Route poison messages to quarantine/dead-letter handling with an owner, access controls, retention, redrive rules, and a fix/replay procedure. Backpressure and load shedding must protect the source of truth.

## Synchronous APIs

For HTTP APIs, use resource/operation semantics intentionally, standard method/status behavior, explicit media types, pagination/cursors, concurrency control, and RFC 9457 problem details where a machine-readable error format is useful. Problem details must not expose stack traces, secrets, tenant existence, or internal identifiers.

Specify:

- idempotency for retried creates/commands, including key scope and response replay;
- conditional operations/version tokens where lost updates matter;
- request deadlines propagated but capped by each service;
- client retry policy and `Retry-After` where applicable;
- compatible additive evolution and an explicit breaking-change path;
- OpenAPI conformance when HTTP contract tooling adds value.

Treat GraphQL/gRPC similarly: schema/proto is necessary but does not replace authorization, quotas, errors, compatibility, or failure semantics.

## Events and messaging

An event is an immutable fact with stable business meaning. Include:

- unique event ID, type, schema version, occurrence time, source, subject/aggregate reference;
- opaque tenant/workspace scope when needed and authorized;
- correlation/causation metadata that contains no credential or authorization grant;
- payload classification, retention, replay permission, and deletion implications.

Keep transport envelope separate from domain payload. CloudEvents may standardize the envelope; AsyncAPI may describe channels, operations, messages, security, and bindings. Neither decides domain semantics.

Publish only after the source transaction is durable. Define ordering scope—usually per aggregate/key, not global—and how consumers detect gaps or stale versions. Replays must not resend external side effects accidentally. Schema registries and compatibility gates are useful only with clear owner and policy.

## Webhooks

Treat webhooks as hostile public ingress/egress:

- deliver over TLS to allowlisted destinations; prevent SSRF during registration and delivery;
- sign the raw payload with a versioned scheme and secret/key identifier;
- include event ID and timestamp/nonce; enforce a bounded replay window;
- rotate secrets/keys without downtime and provide verification guidance;
- acknowledge quickly, persist before processing, and process asynchronously;
- retry only retryable outcomes with backoff/jitter and a documented schedule;
- expose delivery status/redelivery where appropriate; quarantine terminal failures;
- preserve ordering only if promised, and state the scope;
- minimize payload, avoid secrets, and support fetch-by-ID when current authorization must be rechecked.

Signature verification authenticates the delivery, not the authority to perform an unrelated action. Re-evaluate current resource authorization and tenant scope on follow-up fetch/command paths.

## Data contracts

A data contract governs a produced dataset/stream beyond syntax. Define:

- business meaning, grain, keys, owner/steward, authoritative source;
- schema, types, nullability, units, time/timezone semantics, classifications;
- freshness, completeness, uniqueness, validity, distribution/drift, and reconciliation rules;
- lineage, allowed purposes/consumers, residency, retention, deletion, and access;
- partitioning, late data, correction/backfill, replay, and effective-time semantics;
- SLO, incident/support route, compatibility, deprecation, and change notification.

Version transformations and preserve raw immutable input only when lawful and bounded. A warehouse copy does not become a source of truth by convenience. Consumers must not infer semantics from undocumented column names.

## Multi-tenancy across boundaries

Tenant context is data with trust semantics, not a convenient header:

- derive it from verified identity/resource ownership at ingress;
- authorize every operation against the target tenant/workspace and capability;
- pass only an opaque scoped identifier downstream; never trust arbitrary client-supplied tenant context;
- enforce isolation in storage, cache keys, queues/topics, object paths, search/vector indexes, exports, and telemetry;
- scope idempotency, dedupe, quotas, encryption keys, and admin operations;
- design cross-tenant operations as explicit privileged capabilities with audit and purpose controls;
- test tenant A acting on tenant B through direct, async, replay, support, and failure paths.

OpenTelemetry Baggage is not an authorization channel. If used for correlation, apply the opaque/non-PII and trust-boundary rules in `08-observability.md`.

## Evolution and verification

Use consumer-aware compatibility:

- additive changes are not automatically safe—required behavior, enum expansion, constraints, and semantic changes can break consumers;
- validate provider and consumer contracts in CI with representative fixtures;
- run integration tests against real protocol/broker/database behavior where emulators differ materially;
- test duplicate, delayed, reordered, missing, oversized, malformed, unauthorized, and poison inputs;
- test dependency slowness, quota exhaustion, partial rollout, schema skew, replay, and rollback;
- observe contract version/adoption and remove old paths only after evidence shows no supported consumer remains.

Prefer expand → migrate/backfill → verify → contract. Dual writes require a reconciliation owner and bounded retirement date.

## Architecture output

Produce one contract record per boundary:

1. owners, capability boundary, source of truth, and invariant;
2. interaction type and why;
3. schema/envelope and security/tenant context;
4. consistency, transaction, idempotency, delivery, ordering, retry, and replay semantics;
5. error/uncertain-outcome and reconciliation paths;
6. SLOs, quotas, observability, audit, and support;
7. compatibility/deprecation and conformance tests;
8. data lifecycle, privacy, residency, and cost;
9. residual risks and explicit non-goals.

Use `templates/distributed-contract.md` for the handoff.

## Official sources

Validated 2026-07-22:

- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [AsyncAPI Specification 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [CloudEvents specification](https://cloudevents.io/)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)
