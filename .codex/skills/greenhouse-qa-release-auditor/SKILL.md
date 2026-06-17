---
name: greenhouse-qa-release-auditor
description: Risk-based QA and closure gate for Greenhouse implementations. Use after any non-trivial code, UI, schema, integration, workflow, release, local skill, incident, or docs-affecting change; before saying "listo", moving a task to complete, committing a risky slice, pushing, opening a PR, or approving work where tests may be green but runtime, rollout, UX, security, data, docs, or observability evidence is not proven. Also use when the operator asks for QA, robust validation, regression review, release readiness, "tests verdes pero no confio", or cross-agent closure audit.
---

# Greenhouse QA Release Auditor

This is the final implementation QA judge. It does not replace domain skills,
tests, GVC, Sentry, release tooling, or documentation governance. It routes to
them, requires evidence, and blocks false closure.

Core rule: **tests passing is evidence, not a verdict**. A change is not
complete until the relevant runtime, rollout, UX, data, security, observability,
and documentation gates are satisfied or explicitly reported as pending.

## First Reads

Read only what the change needs:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- the active `TASK-###`, `MINI-###`, `EPIC-###`, issue, audit, or spec
- `references/risk-matrix.md`
- `references/verification-matrix.md`
- `references/ui-qa.md` when UI is touched
- `references/runtime-rollout.md` when runtime/rollout can differ from code
- `references/security-qa.md` when auth, access, input, secrets, webhooks, or external APIs are touched
- `references/observability-qa.md` when incidents, Sentry, logs, health, or production reliability are involved
- `references/evidence-format.md`
- `references/skill-injection-map.md`
- `references/verdict-format.md`

If the change touches UI, release, finance, payroll, auth/access, cloud,
integrations, data/schema, AI/agent workflows, documents, or security, load the
agent-specific specialized skill(s) from the injection map before issuing a
verdict. Codex and Claude skill names are not assumed to match.

## QA Workflow

1. Identify the real diff.
   - Run `git status --short`.
   - Run `pnpm qa:gates --changed --agent codex` as the mechanical first pass.
     Always pass `--agent codex` when running as Codex: the CLI defaults to
     `both` and would print Claude-only skill names (e.g. `arch-architect`,
     `modern-ui`, `state-design`, `forms-ux`, `design-system-governance`) that
     do not exist as Codex skills.
   - Add explicit flags when the diff is incomplete or intent matters:
     `--ui`, `--runtime`, `--auth`, `--data`, `--finance`, `--payroll`,
     `--integration`, `--release`, `--security`, `--docs`, `--production`.
   - If there is an active task, include `--task TASK-###`.

2. Classify risk.
   - Use `risk-matrix.md`.
   - Treat the highest-risk touched domain as the closure bar.
   - If code paths are shared, tenant-sensitive, finance/payroll/auth/data, or
     production-facing, do not downgrade the risk because the diff is small.
   - If the worktree contains unrelated changes, scope QA to owned files and
     call out the coordination boundary.

3. Inject domain skills on demand.
   - For every triggered domain in `skill-injection-map.md`, read the relevant
     Codex, Claude, or both-agent skill column before judging that domain.
   - Record the injected skills in the QA report by agent namespace when both
     agents are in scope.
   - If a needed same-name skill is missing in one agent, say so, name the
     documented fallback, and treat missing auditor coverage as a blocker
     unless equivalent evidence exists.
   - Never copy the Codex skill list into Claude by assumption, or vice versa.

4. Build the evidence plan.
   - Use `verification-matrix.md` to choose required commands and live/runtime
     checks.
   - Prefer existing scripts and canonical CLIs over ad-hoc probes.
   - UI evidence must come from GVC or an explained GVC blocker.
   - Runtime evidence must use the active runtime, not only mocks or local unit
     tests, when rollout behavior depends on env, flags, migrations, workers,
     webhooks, external systems, or deployed services.

5. Run or require gates.
   - Run lightweight checks directly when safe.
   - Do not perform destructive, mutating, production, or push/release actions
     without explicit operator approval and the relevant skill.
   - If a gate cannot be run, explain the exact blocker and what would satisfy
     it.

6. Adversarial review.
   Ask:
   - What would make an agent falsely believe this is done?
   - What passed locally but might fail in Vercel, Cloud Run, Cloud SQL, Sentry,
     Entra, HubSpot, Notion, Teams, or a real browser?
   - Are there flags/env vars/redeploys/backfills/migrations/webhooks/secrets
     still missing?
   - Are docs/task lifecycle/handoff synced with the actual runtime state?

7. Verdict.
   - Use `evidence-format.md` and `verdict-format.md`.
   - Verdicts are `PASS`, `CONDITIONAL PASS`, or `BLOCK`.
   - Use `code complete, rollout pendiente` when code is correct but runtime
     activation is not done.
   - Use `operativamente bloqueado` when the behavior cannot exist until an
     external action or missing dependency is resolved.

## Non-Negotiable Blockers

- No GVC/screenshot evidence for visible UI changes.
- Runtime-dependent change validated only by unit tests.
- Flags, env vars, migrations, backfills, secrets, webhooks, worker deploys, or
  redeploys required but not applied or explicitly left pending.
- Auth/access change without both visible surface (`views`) and fine-grained
  capability/entitlement reasoning.
- Finance/payroll/accounting change without the domain auditor skill.
- Production release/promotion/rollback without `greenhouse-production-release`.
- Documentation closure missing for behavior/runtime/shared-contract changes.
- Sentry/runtime issue declared resolved without live evidence or issue-state
  follow-through.
- Hardcoded visible reusable copy, tokens, secrets, tenant ids, or ad-hoc API
  endpoints where canonical primitives/contracts exist.
- Cross-agent QA that reports only Codex injected skills when Claude also needs
  a different skill or an explicit fallback.

## CLI

Use the repo helper. Running as Codex, always scope skill output with
`--agent codex` (the CLI default is `both`):

```bash
pnpm qa:gates --changed --agent codex
pnpm qa:gates --changed --agent codex --task TASK-1107 --ui --runtime
pnpm qa:gates --staged --agent codex --json
```

The CLI is advisory. This skill owns the final verdict.

Note: the Stop hook (`.codex/hooks/qa-release-stop-hook.mjs`) is a Codex-only
guardrail that is opt-in/deregistered by default to avoid out-of-band prompts.
It does not replace the manual QA Release Auditor Gate rule in `AGENTS.md` /
`CLAUDE.md`; invoke this skill explicitly for non-trivial closures.
