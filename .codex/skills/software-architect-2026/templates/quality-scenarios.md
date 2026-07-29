# Quality Scenarios: [Entity]

> Turn quality labels into measurable usage, change, failure, and attack scenarios. Promote a scenario to ASR when it materially shapes architecture.

## Quality goals

| Rank | Quality goal | Stakeholders / concerns | Business consequence if missed |
|---|---|---|---|
| 1 | [e.g. recoverability] | [STK/CON IDs] | [impact] |

## Scenarios

| ID | Type | Quality / ASR? | Source | Stimulus | Environment | Artifact | Expected response | Response measure | Tactics / ADRs | Evidence and cadence | Owner | Review trigger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| QS-001 | usage / change / failure / attack | [quality]; yes / no | [actor/event] | [trigger] | [normal/peak/degraded/etc.] | [affected boundary] | [observable behavior] | [threshold + window + measurement source] | [links] | [test/query/drill; when] | [team] | [event] |

## Scenario detail (use for critical ASRs)

### QS-001 — [Name]

- **Concern and stakeholder**: [CON/STK IDs]
- **Assumptions / operating envelope**: [load, data, topology, threat conditions]
- **Scenario**: Given [environment], when [source] causes [stimulus] to [artifact], the system [response], measured as [response measure].
- **Architectural significance**: [what structure/tactic/technology/ownership this shapes]
- **Verification**: [automated test, production signal, drill, or governed review]
- **Evidence location**: [link/query/run]
- **Failure action / exception policy**: [block, alert, accept temporarily; approver and expiry]
- **Owner and review trigger**: [team; date/event]

## Conflicts and trade-offs

| Scenario IDs | Tension | Chosen balance and rationale | Decision / owner |
|---|---|---|---|
| QS-001, QS-002 | [e.g. latency vs cost] | [threshold or tiering choice] | [ADR / owner] |
