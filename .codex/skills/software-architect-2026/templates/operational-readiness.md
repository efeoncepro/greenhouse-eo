# Operational readiness — [workload/change]

**Owner:** [team/person]
**Criticality:** [experimental | standard | critical]
**Environment/scope:** [production surface and exclusions]
**Validated as of:** YYYY-MM-DD
**Decision:** [pass | conditional pass | fail]

## 1. Service and user outcomes

- Critical journeys/outcomes: [list]
- Sources of truth/invariants: [list]
- Dependencies and owners: [list]
- Minimum viable degraded service: [behavior]

## 2. Quality objectives

| Quality scenario / SLI | Target and window | Measurement point | Evidence | Owner |
|---|---|---|---|---|
| [scenario] | [target] | [user-visible point] | [link] | [owner] |

**Error-budget policy:** [actions, authority, exceptions]

## 3. Failure and capacity readiness

| Failure/limit | Detection | Containment/degradation | Recovery/reconciliation | Test evidence | Residual risk |
|---|---|---|---|---|---|
| [dependency/overload/data] | [signal] | [behavior] | [procedure] | [link/date] | [risk] |

- Peak/burst assumptions and safety margin: [values]
- Timeouts/retries/backpressure/load shedding: [contract]
- Quotas, pool/queue limits, and scaling lag: [values]

## 4. Recovery and continuity

| Business service/data set | RTO | RPO | Backup/replication | Restoration order | Last exercise/result |
|---|---:|---:|---|---|---|
| [item] | [time] | [time] | [mechanism] | [order] | [date/evidence] |

- Declaration/failover/failback authority: [owner]
- Minimum viable/manual operation and communications: [procedure]
- Achieved versus target RTO/RPO and gaps: [result]

## 5. Release and incident operations

- Artifact/provenance identity: [digest/attestation]
- Rollout stages and abort signals: [plan]
- Rollback/roll-forward and migration compatibility: [plan]
- On-call/support/escalation/status path: [links]
- Top incident runbooks and last test: [links/dates]

## 6. Observability and security operations

- Telemetry, redaction, Baggage/trust-boundary, retention, and cost policy: [contract]
- Dashboards/alerts/synthetics and tested routing: [links]
- Audit/evidence access and retention: [contract]
- Emergency access, secret rotation/revocation, and vulnerability response: [contract]
- DORA collection scope (five metrics): [application/service]

## 7. Economics, platform, and sustainability

- Budget/forecast/anomaly response and cost per useful unit: [values]
- Platform dependency/support/fallback: [contract]
- Resource teardown and lifecycle: [policy]
- Sustainability boundary, unit, method, uncertainty: [only if claimed/material]

## 8. Gaps and decision

| Gap | Launch impact | Compensating control | Owner | Due/review date | Trigger to stop/rollback |
|---|---|---|---|---|---|
| [gap] | [block/conditional] | [control] | [owner] | YYYY-MM-DD | [threshold] |

**Approvers:** [product/engineering/ops/security/data as applicable]
**Decision rationale:** [why evidence supports the decision]
**First review:** [date and required evidence]
