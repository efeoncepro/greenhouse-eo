# Verdict Format

Use this exact structure.

```md
# QA Release Audit - <surface/task/change>

## Verdict

PASS | CONDITIONAL PASS | BLOCK

Closure state: complete | code complete, rollout pendiente | operativamente bloqueado

## Scope

- Changed files reviewed:
- Runtime or environment reviewed:
- Out of scope / unrelated worktree changes:

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |

## Injected Skills

- `<skill>`: why it was loaded, or `not available` with fallback

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |

## Blockers

1. ...

## Conditional Follow-Ups

1. ...

## False-Closure Traps Checked

- tests green but runtime missing:
- UI screenshot/capture absent:
- env/flag/redeploy/backfill pending:
- docs/task lifecycle drift:
- Sentry/observability not verified:

## Final Call

One paragraph explaining why this can or cannot be called done.
```

Verdict rules:

- `PASS`: all required evidence exists, no blockers, runtime state matches the
  claim.
- `CONDITIONAL PASS`: no blocker remains, but low-risk follow-ups are acceptable
  and documented.
- `BLOCK`: any blocker, missing required evidence, unsafe domain drift, or
  runtime dependency not satisfied.
