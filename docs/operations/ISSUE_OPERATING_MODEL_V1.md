# Greenhouse EO — Issue Operating Model V1

> Version: 1.0
> Created: 2026-04-05
> Audience: agents, developers, maintainers resolving incidents and regressions

## Purpose

Formalize how Greenhouse handles runtime incidents and code-level regressions through `ISSUE-###` documents.

Issues are not small tasks with another name.

- An issue documents a problem that exists in runtime behavior, data integrity, security, availability, or user-facing output.
- A task documents planned implementation work.

An issue may be solved directly without a task when the fix is localized and low-ambiguity.
An issue should spawn one or more tasks when the remediation needs broader hardening, migrations, refactors, or coordinated rollout.

## Canonical Locations

- Tracker: `docs/issues/README.md`
- Open issues: `docs/issues/open/`
- Resolved issues: `docs/issues/resolved/`

## When To Create An Issue

Create an `ISSUE-###` when at least one of these is true:

- a route or module is failing in runtime
- data can be corrupted, duplicated, or silently degraded
- authorization or tenant isolation is broken
- a visible surface lies about system health or completeness
- a deployment/migration/runtime contract regressed in a way users or operators can feel
- a secret, env var, `*_SECRET_REF`, webhook signing secret, auth secret, or password was published/rotated incorrectly and the runtime consumer now fails or degrades

Do not create an issue just because implementation work is pending.
If there is no current malfunction or regression, use a task instead.

## Minimum Contents Of An Issue

Every issue must capture:

- ambiente afectado
- fecha y canal de detección
- síntoma observable
- causa raíz técnica confirmada o current best root-cause hypothesis
- impacto real
- solución esperada o aplicada
- verificación
- estado (`open` or `resolved`)
- relacionados: código, docs, tasks, commits, incidents linked

## Lifecycle

### 1. Open

Create the issue under `docs/issues/open/` and register it in `docs/issues/README.md`.

At this stage the issue should answer:

- what is broken
- how bad it is
- where it lives
- what evidence exists so far

### 2. Diagnose

Validate the bug in code, tests, logs, preview, or production evidence.

Rules:

- promote only high-confidence findings to formal issue status
- if the first diagnosis is wrong, update the issue instead of leaving stale assumptions in place
- if the remediation path needs planning beyond a localized fix, create a linked `TASK-###`

### 3. Resolve

When a fix lands:

- update the issue content from proposal language to applied-resolution language
- move the file from `open/` to `resolved/`
- update `docs/issues/README.md`
- add the verification actually executed
- link the relevant commit or task when applicable
- if the incident involved secrets or env publication, verify both:
  - the source was corrected
  - the affected endpoint or runtime flow recovered in the target environment

### 4. Close-Out Documentation

When resolving an issue, update the docs that changed contractually:

- `changelog.md` when runtime behavior or repo workflow changed
- `Handoff.md` when the fix or residual risk matters to the next agent
- `project_context.md` when architecture, contracts, or operational rules changed
- architecture docs when the fix changes a module contract or operating assumption

## Relationship Between Issues And Tasks

Use this rule:

- issue first when the primary artifact is the problem statement
- task first when the primary artifact is planned implementation work

Typical patterns:

- localized regression fix: issue only is acceptable
- regression + follow-up hardening: issue + task
- large remediation program: issue + one or more tasks

An issue should not be kept open just because a related hardening task still exists.
If the original incident is solved and verified, resolve the issue and link the remaining task separately.

## Agent Closure Checklist

Before marking an issue resolved, confirm:

- the bug was reproduced or validated with high confidence
- the code fix addresses the root cause, not only the symptom
- the affected module has at least one focused verification step executed
- the issue file was moved to `resolved/`
- the tracker in `docs/issues/README.md` was updated
- handoff/changelog/context docs were updated when relevant

## Initial Policy Decisions Locked By This Document

1. `ISSUE-###` is the canonical vehicle for runtime problems and confirmed regressions.
2. Issues can be resolved directly without creating a task when the remediation is narrow and well-bounded.
3. A resolved issue must be moved physically to `docs/issues/resolved/`.
4. Closing an issue requires real verification evidence, not only code changes.
5. If a fix changes module behavior or operational contracts, the corresponding docs must be updated in the same batch.
