---
name: greenhouse-task-execution-hook
description: Codex-only pre-execution hook for Greenhouse TASK-### implementation requests. Use when the operator asks Codex to implement or continue a TASK-###, uses slash-style aliases such as /implement-task or /task, references [TASK-###], or points to docs/tasks/**/TASK-###-*.md.
---

# Greenhouse Task Execution Hook

This skill is **Codex-only**. It does not define behavior for Claude, Cursor, or
other agents.

Use this skill before implementing any formal Greenhouse `TASK-###`.

## Trigger

Run this skill when the operator message includes any of:

- `/implement-task TASK-###`
- `/implement-task ###`
- `/task TASK-###`
- `/task ###`
- `implement task TASK-###`
- `TASK-###`
- `[TASK-###]`
- `docs/tasks/**/TASK-###-*.md`

Do not run it for general questions, brainstorming, mini-tasks, issues, or local
changes unless the operator explicitly asks to use the TASK hook.

## Required Command

Before writing code, run:

```bash
pnpm codex:task-hook TASK-###
```

Bare numeric task ids are accepted too:

```bash
pnpm codex:task-hook ###
```

If the operator says `mantente en develop`, `stay on develop`, or equivalent,
run:

```bash
pnpm codex:task-hook TASK-### --develop
```

Apply the prompt printed by the command before implementation.

## Filesystem / Worktree Rule

Do not create `git worktree` folders or cloned repo folders by default when this
hook runs.

Use a worktree only if the operator explicitly asks for it or approves it in the
current session. If the checkout is dirty, report the relevant dirty state and
work around it in the current checkout, or ask for confirmation if the dirty
state blocks the task. If an approved worktree is created, remove it and delete
its temporary branch before closing unless the operator asks to keep it.

## Notes

- The command resolves the active task file under `docs/tasks/{to-do,in-progress}`.
- It blocks completed tasks and tasks with declared blockers.
- It substitutes the canonical execution prompt from
  `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`.
- `pnpm codex:task-hook:check` verifies the hook, prompt, aliases, entrypoint
  references, and a live active-task smoke.
- This is not a Git hook or runtime listener; Codex must execute the command when
  this trigger matches.

## Maintenance

The versioning policy lives in `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`.

When that prompt changes in a way that affects the trigger, command, branch
override, or expected pre-execution behavior, update this skill in the same
change. Do not create a Claude/Cursor counterpart for this hook unless the
operator explicitly decides to make it cross-agent.

After changing this skill, run:

```bash
pnpm codex:task-hook:check
pnpm docs:closure-check
pnpm docs:context-check
```
