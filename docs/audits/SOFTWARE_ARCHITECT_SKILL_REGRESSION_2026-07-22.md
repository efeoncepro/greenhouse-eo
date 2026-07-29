# Software Architect Skill — Blind Regression Smoke

> **Date:** 2026-07-22
> **Scope:** Codex skill `software-architect-2026`
> **Evidence class:** local code/docs plus fresh-agent final outputs; no runtime deployment
> **Verdict:** PASS for representative smoke; full 16-scenario acceptance suite not executed

## Method

The prior skill was frozen outside the repository working tree. Fresh agents received only one
skill revision and an equivalent scenario prompt. Candidate agents could not read
`evals/software-architect-2026/`; baseline agents could not inspect the candidate. Raw outputs were
kept out of the eval package. This run used one trial and one reviewer per scenario, so it is a
regression smoke rather than the two-reviewer, three-trial release protocol.

## Results

| Scenario | Candidate | Baseline | Observable conclusion |
| --- | --- | --- | --- |
| `ARCH-RESTRAINT-10` — two-person approval tracker | 4/4 | 4/4 | Both rejected unjustified Kubernetes/Kafka/microservices/event sourcing/vector/agent topology and retained access, audit, backup and evolution gates. Candidate was materially shorter. |
| `ARCH-AGENTIC-07` — multi-entity invoice operations | 4/4 | 3/4 | Both established deterministic financial control, hostile-input isolation, approvals, idempotency and reconciliation. Candidate added a clearer autonomy ladder and avoided putting tenant/entity identifiers in OpenTelemetry Baggage; baseline did not satisfy the privacy-safe telemetry criterion cleanly. |
| `ARCH-EFEONCE-13` — Client Portal Account 360 | 4/4 | 4/4 | Both rejected an unauthorized `apps/client-portal` and shared session/database. Candidate additionally surfaced stale-prose risk, current code placement and explicit fitness functions while preserving the current-runtime/extraction-ready rule. |

Candidate representative score: **12/12**. Baseline representative score: **11/12**. No critical
candidate regression or unsupported irreversible action was observed.

## Limits and follow-up

- This does not satisfy the full promotion protocol in `evals/software-architect-2026/protocol.md`.
- The remaining 13 scenarios, three-trial probabilistic runs, blinded dual review, cost measurement,
  and held-out rotations remain the correct bar before a future high-impact rewrite.
- Deterministic validation, source-network validation, repository gates, and this smoke cover the
  current refactor proportionally because it changes local agent guidance and no product runtime.
