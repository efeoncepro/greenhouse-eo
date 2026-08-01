# ADR-019 — Efeonce Globe: ciclo durable de evaluación asíncrona

## Status

- Status: Accepted
- ID: ADR-019
- Date: 2026-07-31
- Owner: Efeonce Globe / Creative Studio runtime
- Scope: Model Lab evaluation command, governed evaluation scheduler, worker finalizer, evaluation reports and operator lane
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: 2026-07-31
- Governing task: [`TASK-1614`](../../tasks/in-progress/TASK-1614-globe-durable-model-evaluation-lifecycle.md)
- Extends: [`EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md)

## Context

The evaluation command previously executed the provider synchronously inside the HTTP request. A long-running reference-to-video evaluation could therefore terminate as an upstream `504`, even though the durable governed-run lifecycle already existed for production work. Evaluation also cannot use the production scheduler directly: production compilation depends on promoted readiness and commercial quote authority, while evaluation is the evidence that precedes those gates.

## Decision

Evaluations use a dedicated, explicitly bound durable scheduler lane:

`evaluate → durable receipt → outbox/worker → manifest checkpoint → idempotent evaluation report`.

The lane reuses the Model Lab, provider adapters, spend fence, outbox, worker and finalizer. It does not reuse production readiness or commercial quote authority. Each route is admitted only by a server-owned binding containing the exact route, provider, model, version, endpoint, region and completion driver. Evaluation intent (fixture, rubric, route and deterministic report ID) is persisted with the experiment and is never accepted from the client as provider wiring.

Reports are created only after the output manifest is checkpointed and use a workspace/report uniqueness fence so worker retries cannot duplicate evidence. The operator client polls the report and experiment status, returning terminal failure evidence instead of holding an HTTP request open.

## Alternatives Considered

1. Keep synchronous polling and raise the HTTP timeout. Rejected: it remains bounded by infrastructure timeouts and has no durable crash/retry semantics.
2. Pass the production scheduler into evaluation. Rejected: it creates a circular dependency on readiness and commercial approval, and mixes authorities.
3. Add a Seedance-specific timeout/retry patch. Rejected: it fixes one provider symptom and does not scale to other long-running models.
4. Create a second evaluation execution engine. Rejected: it duplicates guardrails, provider identity, spend settlement and worker behavior.

## Consequences

Long-running evaluations survive HTTP deadlines, retry through the durable worker, preserve exact route identity, and produce one auditable report per evaluation intent. Additional routes are onboarded by adding an explicit binding and fixture/rubric evidence, not by changing the execution algorithm. Evaluation completion is asynchronous and requires worker health and durable stores; a terminal provider failure is not promotion evidence.

## Runtime Contract

- `EvaluationRunHandleV1` is the receipt for accepted/running evaluations.
- `StoredExperimentRequestV1.evaluation` is server-owned intent consumed by `ModelLabRunFinalizer`.
- `GovernedEvaluationRouteCompiler` is the evaluation-only, secret-free route compiler.
- `EvaluationReportStorePort.create` is idempotent by `(workspace_id, report_id)`.
- `scripts/globe-operator-lane.mjs evaluate` is the bounded operator poller.
- No attestation or promotion is valid without a terminal report, exact route/model/provider/version, and existing UI evidence gates.

## Implementation and evidence

The accepted path is implemented on Globe `main` through PRs `#74…#82` (merge
`90d0d48861d03e17ef95e2b7cbabdb14b7c1af47`) and migrations `0040`, `0041` and `0042`. API, Producer worker
and Asset Governance were deployed and read back as documented in the
[runtime handoff](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md#task-1614--seedance-r2v-durable-evaluation-2026-08-01).

The durable evaluation `eval_16272c31b11f75be3e0369870f89746b`, attempt
`9361550f-6ce3-456d-b710-d5cd3ded6217`, reached a terminal `candidate_ready` report without invoking Fal a
second time. The exact retained output, its hash, rights projection and report evidence remain in the task and
runtime handoff rather than being duplicated in this decision.

`TASK-1614` remains `in-progress` only for a new post-funding Producer canary. That remaining UI evidence does
not roll back this accepted lifecycle decision and must not be represented as missing durable execution.

## Revisit When

Reopen this decision if evaluation requires fan-out/batch semantics, external-client evaluation, a new completion driver, a separate evaluation tenancy boundary, or a readiness-free production compiler can be governed without authority conflation.
