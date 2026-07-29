# Efeonce architecture-to-work routing

Do not copy a task template into an architecture artifact.

## Route by work type

- Structural decision: follow `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` and update the decision index through the repository workflow.
- Implementable Greenhouse unit: invoke `greenhouse-task-planner`, which owns `docs/tasks/TASK_TEMPLATE.md`, `docs/tasks/TASK_PROCESS.md`, registries, lifecycle folders, addenda, and the Modular Placement Contract.
- Existing `TASK-###` execution: obey the Codex goal preflight and run `pnpm codex:task-hook TASK-###` only after the required confirmation.
- Existing `ISSUE-###` execution: run `pnpm codex:issue-hook ISSUE-###` before code and classify the execution path.
- Small local or program-level work: use the mini-task or epic model selected by the Greenhouse Operating Loop.

## Architecture handoff content

Give the work planner:

- problem, outcome, boundaries, owners, constraints, and evidence;
- decisions/ADRs and unresolved decision gates;
- source-of-truth, access, API/event/data contracts, and failure behavior;
- selected views, quality scenarios, and fitness/verification evidence;
- implementation slices, dependencies, rollout, rollback, recovery, and decommissioning;
- runtime completeness requirements and risks requiring human authority.

Use canonical repository paths. Do not prescribe branch, worktree, commit, push, PR, merge, deploy, or release behavior from this overlay; the active repository/operator contract owns those actions.
