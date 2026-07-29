# Observability and delivery performance

Use this reference for any production workload. Design telemetry from user-visible outcomes backward; do not treat a vendor dashboard as an observability strategy.

## Table of contents

- [Outcomes and signals](#outcomes-and-signals)
- [OpenTelemetry contract](#opentelemetry-contract)
- [Context and Baggage safety](#context-and-baggage-safety)
- [SLIs, SLOs, and alerts](#slis-slos-and-alerts)
- [Telemetry by boundary](#telemetry-by-boundary)
- [Delivery performance: current DORA model](#delivery-performance-current-dora-model)
- [Cost, retention, and validation](#cost-retention-and-validation)
- [Architecture output](#architecture-output)
- [Official sources](#official-sources)

## Outcomes and signals

Start with the critical user journeys and business invariants. For each, define:

1. observable success and correctness;
2. acceptable latency, availability, freshness, and durability;
3. the owner and response when the objective is missed;
4. the telemetry required to distinguish dependency, capacity, code, data, and policy failures.

Use traces, metrics, and logs as complementary signals. Profiles and events may add diagnostic depth. AI or agent runs are distributed workflows: model, retrieval, policy, tool, and human-approval operations should be spans/events in the same causal trace, subject to privacy and retention controls.

Prefer semantic conventions and stable business operation names. Never use high-cardinality dimensions blindly. Separate operational health from product analytics and audit evidence; they have different access, retention, and integrity requirements.

## OpenTelemetry contract

Use OpenTelemetry APIs/SDKs and W3C trace context where supported. A Collector is useful when central processing, redaction, sampling, routing, or tenancy boundaries justify it; it is not mandatory for a small workload.

Specify:

- resource identity: service, version, environment, region, workload owner;
- propagation across every supported protocol and async boundary;
- automatic versus manual instrumentation and meaningful span boundaries;
- sampling policy, including preservation of errors and critical workflows;
- redaction before export, destinations, retention, access, and deletion;
- behavior when telemetry transport is slow or unavailable—telemetry must not take down the workload;
- cardinality budgets and aggregation rules.

The Collector is a policy enforcement point, not a substitute for preventing sensitive data at source.

## Context and Baggage safety

OpenTelemetry Baggage is an untrusted key-value propagation mechanism. It is separate from span attributes and has no built-in integrity guarantee. Automatic propagation can send it to unintended downstream or third-party services.

Apply these rules:

- propagate only opaque, non-PII identifiers when a downstream operation truly needs them;
- never put credentials, session material, email addresses, raw user input, regulated data, or secrets in Baggage;
- never use Baggage as an authorization source; derive authorization from verified identity and server-side policy;
- validate/replace inbound values at the trust boundary and allowlist keys and destinations;
- stop or scrub propagation before untrusted egress;
- use a keyed pseudonymous tenant reference if tenant correlation is necessary;
- copy only approved keys to telemetry attributes, then apply access, retention, and cardinality controls.

Prefer locally derived attributes when cross-process propagation is unnecessary. A trace ID is support correlation, not identity or authorization.

## SLIs, SLOs, and alerts

Define a small set of user-centered SLIs. Common examples:

- request/workflow success and correctness;
- latency distribution, including end-to-end async completion;
- availability and durable acceptance;
- data durability and freshness;
- queue age/backlog and job success;
- dependency health where it explains user impact.

An SLO states the SLI, target, population, exclusions, measurement point, and window. The error budget is the allowed miss rate. Agree an error-budget policy before launch: who can slow or stop risky change, what exceptions exist, and how recovery work is prioritized.

Alert primarily on user-impacting symptoms and burn rate. Route:

- **page**: immediate human action can reduce material impact;
- **ticket**: actionable degradation within a bounded business window;
- **dashboard/report**: trend or diagnostic context without immediate action.

Every actionable alert needs an owner, severity rationale, runbook, deduplication, auto-resolution, and a tested notification path. Avoid alerts on every low-level failure or on self-healing conditions without user impact.

## Telemetry by boundary

| Boundary | Minimum useful evidence |
|---|---|
| Request/RPC | operation, outcome, duration, status/error class, trace correlation |
| Database | logical operation, datastore, duration, outcome; omit raw queries and values by default |
| External dependency | peer/service, operation, timeout, retry count, duration, outcome |
| Queue/event | message/event type and version, producer/consumer, attempt, queue age, outcome, correlation |
| Background workflow | workflow/version, stage, duration, retries, terminal outcome |
| Release | artifact/provenance identity, environment, rollout stage, start/end, outcome |
| AI/agent | model route/version, prompt/policy version, token/cost measures, tool spans, approvals, budget/terminal outcome; redact content by default |

Record stable error classes, not raw exception text as a metric dimension. Preserve causality across async work with trace links or explicit correlation when a parent/child relationship is inaccurate.

## Delivery performance: current DORA model

As of 2026, DORA defines **five** software delivery performance metrics for one application or service at a time:

**Throughput**

1. **Change lead time** — commit in version control to production deployment.
2. **Deployment frequency** — deployments per period or time between deployments.
3. **Failed deployment recovery time** — time to recover from a deployment failure requiring immediate intervention.

**Instability**

4. **Change fail rate** — proportion of deployments requiring immediate intervention.
5. **Deployment rework rate** — proportion of unplanned deployments caused by a production incident.

Do not label a broad incident MTTR as the third DORA metric. Keep operational recovery measures (for example time to detect, mitigate, restore, or learn) where useful, but distinguish them from Failed Deployment Recovery Time. Do not aggregate unlike services, rank teams, or turn a metric into a target; baseline in context and improve the delivery constraint.

## Cost, retention, and validation

Treat telemetry as production data:

- assign ingestion/cardinality and retention budgets;
- tier or sample low-value data while preserving security, audit, error, and critical-journey evidence;
- allocate observability cost to workload and environment; add tenant attribution only when lawful and useful;
- test instrumentation, propagation, redaction, dashboards, alert delivery, and runbooks;
- use synthetic probes for critical low-traffic journeys and real-user/client signals where server-only measures hide impact;
- validate that backup/restore, failover, and rollback exercises emit evidence sufficient to prove objectives.

## Architecture output

The architecture must state:

- critical journeys, SLIs/SLOs, measurement points, and error-budget policy;
- signal/propagation model, approved context keys, trust-boundary scrubbing, and sampling;
- telemetry destinations, residency, access, retention, deletion, and cost budget;
- dashboards, alert routes, owners, runbooks, and validation cadence;
- release markers and the five DORA metrics at service/application scope;
- known blind spots and the failure modes they could conceal.

## Official sources

Validated 2026-07-22:

- [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/)
- [OpenTelemetry Baggage and security considerations](https://opentelemetry.io/docs/concepts/signals/baggage/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
