# Pre-launch gate

Run before first production exposure or a material change. Evaluate every applicable item as `pass | conditional pass | fail | N/A`, link dated evidence, and name the approver. Scale depth by criticality and blast radius; never waive isolation, authorization, data integrity, rollback, or recoverability merely because traffic is small.

## 1. Scope and release integrity — blocking

- [ ] Exact artifact, configuration, schema, data, flags, dependencies, workers/jobs/webhooks, and target environments are identified.
- [ ] Acceptance criteria and critical journeys pass in a production-like environment; known limitations match approved scope.
- [ ] Artifact provenance, dependency/vulnerability/license policy, approvals, and deployment identity meet the assurance target.
- [ ] Migration/backfill is compatible with old/new versions; expand/contract and reconciliation evidence are present.
- [ ] Rollout stages, health signals, abort thresholds, approver, and rollback/roll-forward procedure are rehearsed.

## 2. Security, privacy, and tenancy — blocking

- [ ] Authentication and server-side authorization pass positive/negative tests, including revoked/expired access.
- [ ] Tenant isolation passes direct, async, cache, object/index, export, admin/support, replay, and failure-path tests as applicable.
- [ ] Secrets/config are governed, scoped, rotated/revocable, redacted, and absent from artifacts/logs/errors.
- [ ] Input/output, rate/abuse, egress, encryption, audit, retention/deletion, residency, and subprocessors satisfy the approved model.
- [ ] High/critical vulnerabilities or threat-model findings are fixed or explicitly risk-accepted by the accountable authority.

## 3. Contracts and data — blocking

- [ ] API/event/webhook/data conformance tests pass for supported versions and current consumers.
- [ ] Duplicate, delayed, reordered, missing, malformed, oversized, unauthorized, poison, and quota-exhaustion cases behave as contracted.
- [ ] Idempotency, retry/deadline, dead-letter/quarantine, replay/redrive, and uncertain-outcome reconciliation are exercised.
- [ ] Data correctness, freshness, lineage, migration/backfill counts, and source-of-truth reconciliation pass.
- [ ] Contract adoption is observable and deprecation/consumer communication is active.

## 4. Performance and reliability — criticality-driven

- [ ] Load/capacity test covers expected peak, burst, scaling lag, connection/queue limits, and a documented safety margin.
- [ ] Critical latency, throughput, correctness, availability, durability, and freshness objectives pass at the user-visible measurement point.
- [ ] Timeouts, bounded retries with jitter, backpressure, load shedding, bulkheads/circuit behavior, and graceful degradation are tested where designed.
- [ ] Dependency loss/slowness, control-plane/quota failure, regional/zonal failure, and recovery behavior are exercised proportionally.
- [ ] No single/correlated failure contradicts the approved criticality or residual-risk statement.

## 5. Observability and incident response — blocking for operated workloads

- [ ] Traces, metrics, logs, release markers, and business correctness signals arrive with approved redaction, sampling, retention, and cardinality.
- [ ] Baggage/context propagation uses opaque non-PII values, is scrubbed at untrusted egress, and is never used for authorization.
- [ ] SLO/error-budget dashboards and symptom/burn-rate alerts work; pages/tickets route to an available owner.
- [ ] Each actionable alert links a current runbook; alert and escalation paths have been tested.
- [ ] Incident command, communications/status, vendor escalation, evidence preservation, and post-incident action ownership are ready.
- [ ] The five current DORA measures are collectible at service/application scope: change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate.

## 6. Recovery and continuity — blocking by impact

- [ ] Backups are isolated/encrypted, monitored, retained, and protected from the production deletion path.
- [ ] A representative restore proves data integrity and achieved RTO/RPO; replication alone is not accepted as backup evidence.
- [ ] Restoration order, failover/failback, consistency groups, reconciliation, alternate access, and minimum viable service are exercised as applicable.
- [ ] Business/operations participants know declaration authority, manual workaround, customer obligations, and exercise cadence.

## 7. Cost, platform, and sustainability — proportional

- [ ] Budget, forecast, allocation/owner metadata, anomaly thresholds, quotas, and spend response are active.
- [ ] Cost per useful unit and major step-function/egress/support costs are measurable where material.
- [ ] Shared platform dependencies meet support/SLO expectations and have an owned fallback or accepted risk.
- [ ] Idle/temporary resources have teardown; retention, compute, storage, and transfer match real demand.
- [ ] Sustainability claims state system boundary, functional unit, method, data quality, and uncertainty.

## 8. Launch decision and follow-through — blocking

- [ ] Every gap is classified: block, conditional with owner/date/guardrail, or N/A with rationale.
- [ ] Residual risks and customer/operator impacts are accepted by accountable owners—not silently by the delivery team.
- [ ] Launch window, watchers, rollback authority, success/pause/rollback thresholds, and first-week review are scheduled.
- [ ] Documentation, service catalog, ownership, support/training, consumer notices, and retirement of replaced paths are current.

## Exit rule

Launch only with no unexplained failures. A conditional pass requires bounded exposure, named owner, due date, compensating control, and explicit rollback/pause threshold. Evidence must distinguish “configured” from “tested” and “deployed” from “operationally verified.”
