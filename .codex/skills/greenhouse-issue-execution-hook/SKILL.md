---
name: greenhouse-issue-execution-hook
description: Codex-only pre-execution hook for Greenhouse ISSUE-### diagnosis and fixes. Use when the operator asks Codex to fix, resolve, continue, or review an ISSUE-###, uses slash-style aliases such as /fix-issue or /issue, references [ISSUE-###], or points to docs/issues/**/ISSUE-###-*.md.
---

# Greenhouse Issue Execution Hook

This skill is **Codex-only**. It does not define behavior for Claude, Cursor, or
other agents.

Use this skill before implementing any formal Greenhouse `ISSUE-###`.

## Trigger

Run this skill when the operator message includes any of:

- `/fix-issue ISSUE-###`
- `/fix-issue ###`
- `/issue ISSUE-###`
- `/issue ###`
- `fix issue ISSUE-###`
- `resolve issue ISSUE-###`
- `ISSUE-###`
- `[ISSUE-###]`
- `docs/issues/**/ISSUE-###-*.md`

Do not run it for general questions, brainstorming, tasks, mini-tasks, audits, or
local changes unless the operator explicitly asks to use the ISSUE hook.

## Required Command

Before writing code for an active issue, run:

```bash
pnpm codex:issue-hook ISSUE-###
```

Bare numeric issue ids are accepted too:

```bash
pnpm codex:issue-hook ###
```

If the operator says `mantente en develop`, `stay on develop`, or equivalent,
run:

```bash
pnpm codex:issue-hook ISSUE-### --develop
```

For read-only review of a resolved issue, run:

```bash
pnpm codex:issue-hook ISSUE-### --review-resolved
```

Apply the prompt printed by the command before implementation.

## Issue vs Task Rule

The hook forces a first decision:

- `issue-only fix`: localized regression, low ambiguity, narrow verification.
- `issue + TASK`: remediation requires migration/schema, broad refactor,
  capabilities/access program, UI flow, sync/cron/worker rollout, integration
  work, architecture change, or multi-slice coordination.
- `blocked`: evidence or runtime access is insufficient to close honestly.

Do not smuggle a large remediation program into an issue. If the issue needs a
task, create or propose `TASK-###`, link it, and only apply a temporary mitigation
when it is safe, reversible, documented, and has a retirement condition.

## Regression Guard

An issue fix must not trade one broken path for another.

Before changing code, identify the direct and indirect consumers of the touched
module, route, reader, command, helper, or UI surface. The prompt requires at
least one no-regression target whenever the fix touches shared code or a
business contract.

Before marking an issue resolved, capture no-regression evidence:

- the test or smoke that covers the original issue;
- a test or smoke for a neighboring sensitive flow, or a clear reason why none
  applies;
- the contract that remained unchanged, or the doc/task that records the
  intentional contract change;
- residual risks and follow-ups.

If the no-regression surface is too broad for an issue-only fix, escalate to
`issue + TASK`.

## Filesystem / Worktree Rule

Do not create `git worktree` folders or cloned repo folders by default when this
hook runs.

Use a worktree only if the operator explicitly asks for it or approves it in the
current session. If the checkout is dirty, report the relevant dirty state and
work around it in the current checkout, or ask for confirmation if the dirty
state blocks the issue. If an approved worktree is created, remove it and delete
its temporary branch before closing unless the operator asks to keep it.

## Notes

- The command resolves the issue file under `docs/issues/{open,resolved}`.
- It blocks resolved issues by default.
- It substitutes the canonical issue prompt from
  `docs/operations/CODEX_ISSUE_EXECUTION_PROMPT_V1.md`.
- Closing an issue requires evidence and lifecycle sync:
  `docs/issues/open -> docs/issues/resolved`, `docs/issues/README.md`, and
  handoff/changelog/context docs when the fix changes runtime contracts or leaves
  residual risk.
- `pnpm codex:issue-hook:check` verifies the hook, prompt, aliases, entrypoint
  references, and a live open-issue smoke.
- This is not a Git hook or runtime listener; Codex must execute the command when
  this trigger matches.

## Maintenance

The versioning policy lives in `docs/operations/CODEX_ISSUE_EXECUTION_PROMPT_V1.md`.

When that prompt changes in a way that affects the trigger, command, branch
override, issue-vs-task triage, or expected pre-execution behavior, update this
skill in the same change.

After changing this skill, run:

```bash
pnpm codex:issue-hook:check
pnpm docs:closure-check
pnpm docs:context-check
```
