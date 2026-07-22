# Architecture Fitness Functions: [Entity]

> Protect critical architecture characteristics with the cheapest credible feedback. Automation is preferred when reliable; a manual function must still have evidence, cadence, ownership, and a recorded outcome.

## Portfolio

| ID | Characteristic / scenario | Scope | Mechanism | Measure and threshold | When run | Type | Owner | Failure action | Exception / expiry | Evidence | Review trigger |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FF-001 | [quality; QS/ADR link] | [repo/runtime/domain] | [test/query/drill/review] | [objective result + threshold] | [PR/deploy/hourly/quarterly] | leading / lagging; automated / manual | [team] | [block/rollback/page/review] | [approver, reason, expiry] | [artifact/link] | [event] |

## Function detail

### FF-001 — [Imperative name]

- **Intent**: [architecture characteristic protected and why]
- **Inputs / observation window**: [data, environment, duration]
- **Evaluation**: [deterministic rule or governed review procedure]
- **Pass / warn / fail semantics**: [explicit thresholds]
- **False-positive / false-negative risk**: [known limitations]
- **Execution and evidence**: [pipeline, monitor, drill, reviewer; durable result]
- **Owner and response**: [who acts and within what time]
- **Exceptions**: [authority, compensating control, expiry]
- **Change trigger**: [when threshold, scope, or function must be revised]
- **Retirement criterion**: [when this no longer protects a live concern]

## Coverage and balance

| Critical scenario / rule | Fitness function IDs | Coverage | Residual gap / accepted risk | Owner |
|---|---|---|---|---|
| [QS/ADR/correspondence] | FF-001 | preventive / detective / recovery | [gap] | [team] |

> Check the portfolio for conflicting dimensions (for example latency, resilience, cost, security, and delivery speed). Do not optimize a proxy while degrading the business outcome it was meant to protect.
