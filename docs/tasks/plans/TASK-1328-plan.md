# TASK-1328 Plan — AI Visibility Report Signal Completeness

## Context

- Goal: execute TASK-1328 local-first, no push, no production deploy.
- Current branch: `develop`.
- Task file: `docs/tasks/in-progress/TASK-1328-ai-visibility-report-signal-completeness.md`.
- External render repo: `/Users/jreye/Documents/efeonce-think`.
- Existing snapshot recovery policy for this execution: `new-runs-only` unless a governed republish path is explicitly introduced later.

## Audit Summary

- `TASK-1325` is complete/live; `TASK-1324` is code-complete with rollout pending and is not a code blocker for this task.
- `executeClaimedGraderRun` currently calls `finalizeRunDelivery()` before `gatherRunProbes()`, so new immutable snapshots can freeze `readiness: null`.
- `PublicGraderReport` already carries public-safe `providerPresence`, `citationSourceBreakdown`, `categoryTaxonomySummary`, `readiness`, and `provenance`.
- `ReportArtifactModel` still sets `agenticAxisScore: null`, so `Be Actionable` remains coverage even when readiness exists.
- `efeonce-think` renders `engineSnapshot.present` but not `resolved` denominators, and it does not render source-domain, category, or readiness evidence sections yet.

## Execution Mode

Sequential. The backend/model slices are causal prerequisites for the hub render. Subagents were not explicitly authorized for this run.

## Slices

### Slice 1 — Run Lifecycle Ordering

- Move probe gathering before delivery finalization for terminal runs with data.
- Keep probe gathering best-effort; readiness must never turn a perception run into failed.
- Preserve failed/skipped delivery behavior.
- Add focused test coverage proving probes are gathered before delivery publish/finalize.

### Slice 2 — ReportArtifactModel Enrichment

- Extend the model additively with public-safe fields:
  - `readiness`
  - `citationSourceBreakdown`
  - `categoryTaxonomySummary`
  - optional source/method/provenance helpers if needed by render
- Map `agenticAxisScore` from `report.readiness.agentic.overallScore`.
- Map `actionable` level from the same readiness score without blending it into perception/overall score.
- Keep `null` as coverage/sin dato, never `0`.

### Slice 3 — Greenhouse Tests

- Extend model/no-leak tests for:
  - `agenticAxisScore` from readiness
  - `actionable` level measured only when readiness exists
  - public model includes additive evidence fields
  - no internal reasons/raw evidence leak
- Run focal test suites for `run-engine`, report builder/readiness, report artifact model, and public route contract.

### Slice 4 — efeonce-think Render

- Render from `model` only; do not derive scoring or read raw `report` for semantics.
- Update engine coverage to display `present/resolved`.
- Add conditional enterprise sections:
  - method/provenance band
  - source-domain evidence
  - category association when measured and non-empty
  - readiness/operability when measured
- Add required `data-capture` markers.
- Preserve `MaturityLadder` primitive and existing motion; no new animation system.

### Slice 5 — Verification And Closure

- Greenhouse: `pnpm task:lint --task TASK-1328`, UI contract checks, focal tests, type/lint as feasible.
- External hub: `pnpm build` and Playwright/capture with desktop and mobile scroll-width checks.
- Update `Handoff.md`, `changelog.md`, task state, and snapshot recovery decision.

## Open Questions Resolved

- Existing snapshots: `new-runs-only` by default.
- Entity readiness: follow-up; not exposed in public report V1.
- Source domains: bounded top-N domain-only evidence, no full URLs.

