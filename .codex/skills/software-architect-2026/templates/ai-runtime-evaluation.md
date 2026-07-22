# AI runtime evaluation: [system / workflow]

> Use for model-powered workflows and agents before autonomy or route promotion. Evals complement deterministic tests. Do not place holdout expected answers, secrets, personal data, or hidden chain-of-thought in this artifact.

## 1. Evaluation identity

| Field | Value |
|---|---|
| Evaluation ID / version | [immutable ID] |
| Owner / approver | [names or roles] |
| Date / evidence expiry | [YYYY-MM-DD / condition] |
| Decision gated | [release / model route / traffic / autonomy; one decision] |
| Workflow and autonomy tier | [name / tier] |
| Intended population | [users, tenants, tasks, language, region] |
| Explicit exclusions | [not supported / not measured] |
| Non-AI or prior-release baseline | [version and evidence] |

## 2. Frozen system configuration

| Surface | Exact version / hash / snapshot |
|---|---|
| Runtime and source revision | [value] |
| Model provider / model / route | [value] |
| System prompt / templates | [hashes] |
| Tool catalog and schemas | [version] |
| Policy / entitlement bundle | [version] |
| MCP / A2A protocol | [absolute version or N/A] |
| Retrieval corpus / index | [snapshot, freshness] |
| Memory schema / seed policy | [version] |
| OTel GenAI conventions | GenAI commit `2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b` + core `v1.43.0`, or [reviewed exact pin] |
| Eval dataset / rubric / scorer | [versions] |

## 3. Runtime contract

- **Workflow vs agent rationale:** [why code- or model-directed control is necessary]
- **Permitted effects:** [allowlist]
- **Forbidden effects:** [denylist]
- **Limits:** [steps, tokens, time, tools, fan-out, delegation depth, run/tenant/daily cost]
- **Checkpoints:** [state, pre/post-effect persistence, approval binding]
- **Identity/delegation:** [principal, workload identity, grant audience/scope/expiry/revocation]
- **Cancellation/resume:** [semantics]
- **Idempotency/reconciliation/compensation:** [semantics]
- **Kill-switch/downgrade:** [owner, mechanism, last drill]

## 4. Dataset design and integrity

| Slice | Source and sampling | Count | Critical? | Known limitations |
|---|---|---:|---|---|
| Happy path | [source] | [N] | no | [limits] |
| Edge / abstention | [source] | [N] | [yes/no] | [limits] |
| Adversarial / injection | [source] | [N] | yes | [limits] |
| Authorization / tenancy | [source] | [N] | yes | [limits] |
| Failure / recovery | [source] | [N] | yes | [limits] |
| Long horizon / cost | [source] | [N] | [yes/no] | [limits] |

- **Holdout isolation:** [where inputs and answer keys live; prove inaccessible to evaluated runtime]
- **Contamination check:** [method and result]
- **Representativeness:** [population comparison and coverage gaps]
- **Repeat policy:** [runs/case, seeds if supported, variance handling]

## 5. Scoring contract

List binary objective criteria first. Keep subjective human criteria separate.

| Criterion ID | Type (`deterministic` / `rubric` / `human`) | Slice | Critical / hard-fail | Threshold | Evidence |
|---|---|---|---|---:|---|
| [ID] | [type] | [slice] | [yes/no] | [value] | [artifact] |

- **Aggregate threshold:** [value]
- **Critical-slice threshold:** [normally 100%]
- **Hard-fail rule:** [any hard-fail criterion blocks the decision regardless of aggregate]
- **Human criteria:** [declared; never silently auto-scored]

## 6. Evaluator validity

| Measure | Method | Result | Acceptance threshold |
|---|---|---:|---:|
| Human inter-rater agreement | [method] | [value] | [value] |
| Judge vs blinded human agreement | [method] | [value] | [value] |
| False-pass rate | [method] | [value] | [value] |
| False-fail rate | [method] | [value] | [value] |
| Run-to-run variance | [method] | [value] | [value] |

Record judge prompts and versions outside the evaluated agent context. Recalibrate after any evaluator/model/rubric change.

## 7. Deterministic verification

- [ ] Unit and schema tests pass.
- [ ] Authorization, tenant isolation, approval binding, quotas, and state transitions pass negative tests.
- [ ] Tool contract, idempotency, replay, cancellation, timeout-after-effect, and reconciliation tests pass.
- [ ] Sandbox, egress, secrets, telemetry redaction, and deletion/retention controls pass.
- [ ] Kill-switch, downgrade, rollback/compensation, and recovery drills pass.

## 8. Results

| Slice | Passed / total | Rate | Threshold | Critical failures | Decision |
|---|---:|---:|---:|---|---|
| [slice] | [N/N] | [%] | [%] | [IDs or none] | [pass/fail] |

Do not record hidden chain-of-thought. Attach sanitized traces, objective outputs, policy reason codes, human labels, and run manifests.

## 9. Operations and economics

| Metric | Baseline | Candidate | Threshold |
|---|---:|---:|---:|
| Accepted task success | [value] | [value] | [value] |
| Attempts per success | [value] | [value] | [value] |
| Cost per successful task | [value] | [value] | [value] |
| Human-review minutes / success | [value] | [value] | [value] |
| p95 completion latency | [value] | [value] | [value] |
| Failed/cancelled-run cost | [value] | [value] | [value] |

## 10. Decision and evidence gate

- **Outcome:** `pass | conditional | fail`
- **Authorized change:** [exact route, traffic, or autonomy change]
- **Approver and date:** [value]
- **Conditions / residual risks:** [owner, due date, containment]
- **Automatic downgrade triggers:** [critical failure, drift, incident, cost, latency]
- **Evidence invalidation:** [model/prompt/tool/policy/corpus/memory/population/risk changes]
- **Next production sampling/review:** [date and owner]

Traffic expansion, model-route promotion, and autonomy graduation require separate decisions even when supported by the same evidence package.
