# Pre-build gate

Run before handing architecture to implementers. Apply each relevant item as `pass | gap | deferred | N/A` with evidence. The design is implementable only when no build-blocking decision is delegated accidentally to the implementation team.

## 1. Shape and ownership — blocking

- [ ] Architecture/spec identifies scope, non-goals, current/target state, boundaries, sources of truth, and owners.
- [ ] Critical flows have the smallest useful diagrams (context/container, sequence/state/data as applicable).
- [ ] Major decisions have ADRs with alternatives, consequences, reversibility, confidence, validation date, and revisit triggers.
- [ ] Each substantive component has purpose, inputs/outputs, behaviors, edge cases, NFRs, dependencies, and acceptance evidence.
- [ ] Open questions have owner/date and cannot change the implementation shape after work starts.
- [ ] Build order, blockers, migration sequencing, rollout units, and rollback boundaries are explicit.

## 2. Contracts and data — blocking when applicable

- [ ] API/event/webhook/data contracts define schemas, examples, security, versioning, compatibility, and deprecation.
- [ ] Consistency, transaction, concurrency, timeout, retry, idempotency, deduplication, ordering, replay, and uncertain-outcome semantics are explicit.
- [ ] Data ownership, model, migrations, backfill, validation, retention, deletion, and reconciliation are specified.
- [ ] Tenant scope and isolation cover storage, cache, queue, object, index, telemetry, admin, replay, and export paths.
- [ ] Contract tests and fixtures include duplicates, delay, reordering, malformed/unauthorized input, version skew, and dependency failure where relevant.
- [ ] Use `templates/distributed-contract.md` for every material distributed boundary.

## 3. Security and supply chain — proportional blocking

- [ ] Threat model covers trust boundaries, abuse cases, authentication, authorization, least privilege, and audit.
- [ ] Data classification drives encryption, secrets, logging/redaction, access, retention, residency, and vendor handling.
- [ ] Emergency/support access is scoped, time-bounded, auditable, and revocable.
- [ ] Dependency/SBOM, source/build provenance, artifact identity/signing/verification, vulnerability/license policy, and patch owner match the risk.
- [ ] CI/CD identities, third-party build actions, registries, and deployment approvals have explicit trust and rollback controls.

## 4. Quality, reliability, and operations — blocking for production paths

- [ ] Measurable quality scenarios and fitness functions cover critical correctness, latency, availability, durability, freshness, and accessibility needs.
- [ ] SLOs, measurement points, error-budget policy, capacity assumptions, quotas, and overload behavior are specified.
- [ ] Failure modes cover dependency loss/slowness, correlated failure, resource exhaustion, poison work, stale/partial data, and recovery.
- [ ] RTO/RPO, backup/restore, restoration order, failover/failback, reconciliation, and exercise plan match criticality.
- [ ] Deployment, progressive delivery if used, rollback/roll-forward, config/secret changes, runbooks, on-call/support, and incident ownership are defined.
- [ ] `templates/operational-readiness.md` is complete for critical or externally operated workloads.

## 5. Observability, cost, and sustainability — proportional

- [ ] User-centered SLIs map to traces, metrics, logs, dashboards, alerts, owners, and runbooks.
- [ ] Context propagation uses allowlisted opaque/non-PII values; Baggage is never authorization and is scrubbed at trust boundaries.
- [ ] Telemetry access, redaction, sampling, cardinality, retention, deletion, residency, and cost budgets are specified.
- [ ] Cost model includes useful unit, fixed/variable/step costs, allocation, budget/forecast, anomaly response, and exit costs.
- [ ] Unnecessary compute/storage/transfer and idle environments are addressed; sustainability claims have boundary, metric, and uncertainty.

## 6. Implementer-ready verification — blocking

- [ ] Repository/runtime conventions and reuse candidates are linked, not paraphrased from memory.
- [ ] Acceptance criteria and test strategy cover unit, contract, integration, end-to-end, performance, recovery, security, accessibility, and operational evidence proportionally.
- [ ] Environment, feature flag, migration, secret/config, dependency, worker/cron/webhook, and test-data prerequisites are explicit.
- [ ] Each “done” claim distinguishes code complete, deployed, migrated, exercised, and live-verified.
- [ ] Self-critique covers next scale, 36-month assumptions, cognitive debt, lock-in, blind spots, AI/regional gaps, and retirement.

## Exit rule

Block handoff for unresolved source-of-truth, security/isolation, destructive migration, contract, irreversible decision, or production recovery gaps. Defer only bounded work that cannot invalidate the shape; record owner, date, trigger, and rollout restriction.
