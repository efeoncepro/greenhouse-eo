---
name: greenhouse-documentation-governor
description: Use after any Greenhouse implementation, task closure, incident fix, rollout, architecture change, workflow change, local skill change, or documentation audit to verify whether the work was documented correctly and to update or require updates to architecture, ADRs, changelog, handoff, AGENTS.md, CLAUDE.md, project_context.md, task lifecycle, functional docs, manuals, audits, and related docs. Mandatory before saying an implementation is complete when the change affects behavior, runtime, agents, operations, releases, access, data, UI, integrations, or shared contracts.
---

# Greenhouse Documentation Governor

Use this skill at the end of implementation work, before moving a task to
`complete/`, before saying "listo", or whenever the user asks whether a change
was documented.

This skill is a closure gate, not a writing dump. Update only the documents that
own the changed contract, keep deltas short, and leave links to the canonical
source instead of repeating the same story everywhere.

## First Reads

Read only what the change needs, in this order:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- the active `TASK-###`, `MINI-###`, `EPIC-###`, issue, audit, or spec
- relevant docs in `docs/architecture/`, `docs/documentation/`, `docs/manual-de-uso/`, `docs/api/`, `docs/changelog/`, or `docs/operations/`

If the work touched UI, release, cloud, finance, payroll, auth, data, access,
webhooks, APIs, skills, or integrations, also read the specialized architecture
or operational doc for that domain.

## Closure Workflow

1. Identify the actual change.
   - Use `git status --short` and, when useful, `git diff --stat`.
   - Prefer `pnpm docs:closure-check` for an executable first pass.
     Scope it with pathspecs after `--` when unrelated user/agent changes are
     present in the worktree.
   - Separate user/other-agent changes from your own.
   - Classify the change: code, schema, runtime config, rollout, docs-only,
     skill, task/spec, audit, integration, UI, API, release, or operations.

2. Check runtime completeness.
   - If flags, env vars, secrets, deploys, migrations, backfills, external
     provisioning, cron/webhook setup, GVC evidence, or live verification are
     still required, do not call it complete.
   - Report `code complete, rollout pendiente` or `operativamente bloqueado`
     and document owner + next step in `Handoff.md`.

3. Decide documentation owners.
   - Update the canonical source once.
   - Add short deltas or links in secondary docs.
   - Avoid duplicating architecture, runbooks, or task narrative.

4. Apply the ADR gate.
   - If the change affects source of truth, shared schema/projections, access,
     auth/session, finance/payroll/accounting semantics, events/outbox/webhooks,
     external APIs, cloud/deploy/secrets, UI platform, shared runtime, or
     AI/agent workflows, identify an existing ADR or create/propose one before
     closing.
   - Accepted ADRs must be indexed in `docs/architecture/DECISIONS_INDEX.md`.

5. Synchronize lifecycle.
   - For `TASK-###`, `MINI-###`, and `EPIC-###`, update status, progress log,
     acceptance evidence, open questions, and folder location only when the
     runtime state justifies it.
   - Sync the corresponding `README.md` / registry index.

6. Validate proportionally.
   - Closure heuristic: run `pnpm docs:closure-check` on the relevant diff; use
     `--strict` only when the team wants warnings to fail the command.
   - Docs-only: run `pnpm docs:context-check` when handoff/context changed.
   - Task docs: run `pnpm task:lint --changed` or the focal task command.
   - UI docs with visible runtime: include GVC evidence or state the exact
     blocker.
   - Architecture/ADR changes: verify links/indexes and affected source docs.

7. Report the documentation result.
   - Say which docs were updated.
   - Say which docs were intentionally not updated and why.
   - Say what was not validated.

## Documentation Decision Matrix

Use this matrix to choose the smallest complete update set.

| Change type | Required documentation action |
|---|---|
| Any implementation with behavior change | `changelog.md` short delta + task/spec progress or completion evidence |
| User/client-visible feature or changed workflow | `docs/documentation/<domain>/...` and, if step-by-step operation matters, `docs/manual-de-uso/<domain>/...`; consider `docs/changelog/CLIENT_CHANGELOG.md` when channel/availability changes |
| Shared architecture, source of truth, schema, access, API, runtime projection, UI platform, cloud/deploy/secrets, auth, finance/payroll/accounting, events/webhooks, AI/agent workflow | Architecture doc or ADR + `DECISIONS_INDEX.md` when accepted + short `project_context.md` delta if it changes agent operating contract |
| Runtime rollout, env vars, flags, migrations, backfill, external integration, cron, webhook, worker, release | `Handoff.md` with what was applied, verified, pending, owner, next step; update runbook/manual if operator steps changed |
| Production release or release control-plane change | Use `greenhouse-production-release`; update release architecture/runbooks/manuals/skills as that skill requires |
| UI visible change | `DESIGN.md` or UI architecture only if visual contract changed; functional/manual docs if user workflow changed; GVC evidence required before closure |
| Access, roles, views, entitlements, capabilities, route groups | Access architecture/task/spec + both planes (`views` and `entitlements`) documented; migrations/grants/audit if applicable |
| New or changed local skill | Update both `.codex/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md` when the behavior must be shared; register in `project_context.md`, `Handoff.md`, `changelog.md`, and only update `AGENTS.md` / `CLAUDE.md` if it changes a standing agent rule |
| Audit performed | Create/update dated `docs/audits/...`; link from task, handoff, or architecture only if it remains operationally relevant |
| Docs-only clarification with no behavior change | Update the canonical doc; changelog only if workflow/contract changed |

## Root Files

- `AGENTS.md`: standing rules for Codex/generic agents. Update only for
  cross-agent mandatory rules, tool/skill triggers, repo contracts, or safety
  guardrails.
- `CLAUDE.md`: standing rules for Claude Code. Keep aligned with `AGENTS.md`
  when the rule is cross-agent. If a request says `claude.mc`, treat it as
  `CLAUDE.md` unless a real `claude.mc` file exists.
- `project_context.md`: current repo state and durable operating contracts.
  Add short entries for new skills, architecture decisions, active tooling,
  runtime constraints, or changed deployment/source-of-truth assumptions.
- `Handoff.md`: active continuity only. Include what changed, evidence, risks,
  pending rollout, and next step. Do not paste full specs or old history.
- `Handoff.archive.md`: historical session memory. Move, do not delete, when
  handoff cleanup is required.
- `changelog.md`: behavior, structure, workflow, rollout, or operating
  capability deltas. One concise entry is usually enough.

## Hard Rules

- Never claim a task is complete if the docs/task lifecycle are not synced.
- Never hide missing rollout behind "implemented in code".
- Never create an ADR for every small change; do create or identify one for
  shared contracts and irreversible decisions.
- Never duplicate a full decision in `AGENTS.md`, `CLAUDE.md`,
  `project_context.md`, and `Handoff.md`; one canonical doc plus links/deltas.
- Never use `Handoff.md` as the canonical architecture source.
- Never move a task to `complete/` without acceptance evidence and proportional
  verification.
- Never update docs based only on stale audit/handoff memory; re-check code,
  runtime, or architecture when the conclusion matters.
- Never overwrite unrelated user/agent edits while synchronizing docs.
- Never let an architecture doc grow into an append-only monolith (a large file that is mostly `## Delta YYYY-MM-DD` sections). Separate **estado vigente** (docs temáticos) from **cronología** (`HISTORIAL.md` append-only): a vigente change edits the topic doc; the dated entry goes to `HISTORIAL.md`; a shared contract goes to its ADR + `DECISIONS_INDEX.md`. Precedent + regla: `docs/architecture/ui-platform/` (start at `README.md`) + ADR `GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md`. The docs lint flags regressions (`architecture_doc_monolith`, `ui_platform_stub_regrowth`). `GREENHOUSE_UI_PLATFORM_V1.md` is a **router stub** — never re-add content to it; the UI platform reference lives under `docs/architecture/ui-platform/`.

## Executable Helper

Use `pnpm docs:closure-check` as the mechanical companion to this skill. It
inspects changed files and emits advisory findings for likely missing
documentation owners.

Useful forms:

```bash
pnpm docs:closure-check
pnpm docs:closure-check -- scripts/check-documentation-closure.mjs package.json
pnpm docs:closure-check --staged
pnpm docs:closure-check --base origin/develop --strict
pnpm docs:closure-check --json
```

The helper is advisory. This skill remains the decision owner for whether a doc
is truly required, intentionally not required, or blocked by rollout/runtime
state.

## Output Contract

When closing, report in this shape:

```text
Documentation closure:
- Updated: <files>
- Checked/no update needed: <files or doc families + reason>
- Required but pending: <owner + next step>, or "none"
- Verification: <commands/evidence>
- Closure state: complete | code complete, rollout pendiente | operativamente bloqueado
```
