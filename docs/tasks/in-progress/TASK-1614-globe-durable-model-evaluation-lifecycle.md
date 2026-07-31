# TASK-1614 — Globe durable model evaluation lifecycle

- Status: `in-progress`
- Domain: `EPIC-028 / Globe / Model Lab / evaluation / worker`
- Type: implementation + architecture
- Priority: P0
- Owner: Efeonce Globe runtime
- ADR: [Async evaluation lifecycle](../../architecture/creative-studio/EFEONCE_GLOBE_ASYNC_EVALUATION_LIFECYCLE_DECISION_V1.md)

## Objective

Make long-running model evaluations durable and provider-neutral so an upstream HTTP timeout cannot be mistaken for a model verdict or leave an operator without a recoverable evidence path.

## Scope

- Add a receipt tied to deterministic experiment/report identity.
- Compile evaluation routes through an explicit server-owned binding lane.
- Reuse the spend fence, governed run, outbox, worker and manifest finalizer.
- Create reports only after manifest checkpoint and make creation idempotent.
- Poll report and terminal experiment state in the operator lane.
- Validate Seedance R2V through the real UI only after objective report evidence exists.

## Acceptance evidence

- Domain and creative-runner typechecks pass.
- Unit coverage proves durable acceptance, stable idempotency and scheduler route binding.
- Live evaluation returns a terminal objective report or a terminal classified failure.
- Playwright UI evidence proves attestation and promotion for the exact route/model/version.
- Producer UI proves availability, estimate, generation, playback/download and one retained asset per model tested.

## Explicit exclusions

Do not alter already promoted Omni, Seed Audio or Seedance Loop; do not bypass the daily spend cap; do not add provider-specific timeout patches; do not write direct SQL or create a second ledger/catalog.

