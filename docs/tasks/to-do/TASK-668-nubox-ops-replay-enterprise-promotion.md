# TASK-668 — Nubox Ops Replay & Enterprise Promotion

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`, `finance`, `data`
- Blocked by: `TASK-399`
- Branch: `task/TASK-668-nubox-ops-replay-enterprise-promotion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Definir runbooks, replay/backfill protocol, health gates y criterios de
promotion para declarar Nubox V2 como enterprise-grade.

## Why This Task Exists

Nubox V2 no se cierra por tener más endpoints. Se cierra cuando cada stage
puede re-ejecutarse, auditarse, observarse y recuperarse sin cirugía manual.

## Goal

- Runbooks de replay por periodo, objeto y stage.
- Promotion checklist enterprise-grade.
- Decisión de workload placement para lanes pesadas.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

## Normative Docs

- `docs/tasks/to-do/TASK-399-native-integrations-runtime-hardening-source-adapters-control-plane-replay.md`
- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `TASK-399`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.source_sync_failures`
- `greenhouse_sync.source_sync_watermarks`
- `services/ops-worker/**`

### Blocks / Impacts

- enterprise promotion of Nubox V2.
- ops handoff and incident response.
- future native integration hardening.

### Files owned

- `docs/operations/**`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/documentation/operations/**`
- `services/ops-worker/**` if promotion requires runtime endpoints.

## Current Repo State

### Already exists

- source sync run/failure/watermark tables.
- manual scripts for full and quotes hot sync.
- ops-worker pattern for heavy materialization.

### Gap

- no Nubox V2 promotion checklist.
- no complete replay/runbook matrix.
- error taxonomy and leases are not yet shared via TASK-399.

## Scope

### Slice 1 — Runbook matrix

- Define replay/backfill per stage and source object.

### Slice 2 — Promotion gates

- Define enterprise-grade criteria and rollback.

### Slice 3 — Workload placement

- Decide what stays Vercel cron vs moves to ops-worker.

## Out of Scope

- Implementing all Nubox runtime slices.
- Replacing `TASK-399`.

## Acceptance Criteria

- [ ] Nubox has a stage-by-stage replay runbook.
- [ ] Enterprise-grade promotion criteria are explicit.
- [ ] Workload placement decisions are documented.

## Verification

- Manual architecture review.
- Handoff/runbook review against `TASK-399`.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Ops docs and architecture updated.
