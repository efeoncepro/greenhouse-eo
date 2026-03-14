---
name: vercel-operations
description: Operate Vercel safely across teams, projects, preview, staging, production, protected domains, environment variables, logs, promotions, rollbacks, and MCP setup. Use when a human or another agent needs to inspect, debug, deploy, promote, roll back, or validate a Vercel environment from this repo.
---

# Vercel Operations

Use this skill when the task touches Vercel CLI, Vercel MCP, deployments, domains, logs, environments, or deployment protection.

## First reads

Read only what the task needs, in this order:
- `<repo>/AGENTS.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `references/greenhouse-vercel-map.md`
- `references/official-vercel-reference.md`

If the task is time-sensitive or blocked by auth/protection, verify against official Vercel docs again before acting.

## What this skill covers

- team and scope selection
- project linking
- preview, staging, production, and custom environments
- env vars and local sync
- deployment inspection and logs
- protected preview access
- staged production deploys, promote, and rollback
- Vercel MCP setup for agent workflows

## Core rules

- Prefer explicit `--scope` when there is any ambiguity about which Vercel team you are operating in.
- Treat `.vercel/` as project state. Re-link deliberately; do not casually overwrite it.
- Do not use `vercel alias` as the default production promotion mechanism. Prefer `vercel --prod --skip-domain`, `vercel promote`, and `vercel rollback`.
- If a protected deployment returns `401` or a Vercel auth page, do not guess. Use `vercel curl`, Vercel MCP, or a valid protection bypass secret.
- When reporting results, always include the exact branch, project, environment, deployment URL, domain alias, and whether protection/auth blocked validation.

## Workflow

1. Detect local capability
- Check `which vercel`, `vercel --version`, `which node`, `which pnpm`, `which npm`.
- If `vercel` is missing and Node is available, install/update with `pnpm i -g vercel@latest`.
- If CLI cannot be installed, fall back to Vercel MCP if available.

2. Confirm account, scope, and project
- Use `vercel whoami` if available.
- List teams with `vercel teams list`.
- If needed, use `vercel switch <team>` or prefer `--scope <team-slug>` on commands.
- Confirm the linked project with `vercel project inspect` or inspect `.vercel/project.json`.
- If the repo is not linked, run `vercel link` and link the existing project rather than creating a new one.

3. Choose the environment path
- `Preview`: branch previews and ad hoc validations.
- `Staging`: custom environment, typically via `--target=<custom-environment>`.
- `Production`: `main` or explicitly promoted production deployments.
- `Development`: local-only env sync and `vercel dev`/`vercel build` support.

4. Use the right command family
- Deploy:
  - preview or default deploy: `vercel`
  - custom environment deploy: `vercel deploy --target=staging`
  - staged production build: `vercel --prod --skip-domain`
- Inspect:
  - `vercel inspect <deployment-url>`
  - `vercel inspect <deployment-url> --logs`
- Logs:
  - `vercel logs`
  - add filters with `--project`, `--deployment`, `--environment`, `--branch`, `--since`, `--level`, `--expand`, `--json`
- Environment variables:
  - `vercel env ls`
  - `vercel env add/update/rm`
  - `vercel env pull --environment=preview --git-branch=<branch>`
  - `vercel env run -e preview -- <command>`
  - use `vercel pull` instead of `vercel env pull` when you need `.vercel/` settings for `vercel build` or `vercel dev`
- Promotion and rollback:
  - promote: `vercel promote <deployment-url>`
  - promotion status: `vercel promote status`
  - rollback: `vercel rollback [deployment-url]`
  - rollback status: `vercel rollback status`
- Domains:
  - list aliases: `vercel alias ls`
  - set alias only when intentionally assigning a domain to a deployment: `vercel alias set <deployment-url> <domain>`

5. Handle protected deployments correctly
- First choice: `vercel curl <url>` if CLI is installed and authenticated.
- Second choice: Vercel MCP when available.
- Third choice: protection bypass secret using:
  - header `x-vercel-protection-bypass: <secret>`
  - optional `x-vercel-set-bypass-cookie: true`
- If none are available, stop and report that the deployment is reachable but protected.

6. Validate before changing traffic
- For preview to production:
  - inspect deployment
  - check error logs
  - verify domain or deployment URL response
  - only then promote
- For rollback:
  - confirm production issue
  - rollback
  - verify logs and response
  - report whether auto-assignment of production domains must be restored later via `vercel promote`

## Fast playbooks

### Check what preview a branch has
- `git branch --show-current`
- `vercel logs --branch <branch> --environment preview --since 24h`
- `vercel inspect <deployment-url>` once the candidate deployment is identified

### Validate a protected preview domain
- try `vercel curl https://preview-domain`
- if blocked and CLI is unavailable, use MCP or a bypass secret
- report whether the domain is serving the expected branch or if that cannot be proven

### Sync branch-specific preview env vars
- `vercel env pull --environment=preview --git-branch=<branch>`
- if local Vercel build/dev is needed, also run `vercel pull --environment=preview`

### Stage production without sending traffic
- `vercel --prod --skip-domain`
- save the resulting deployment URL
- inspect and test it
- `vercel promote <deployment-url>` only after verification

### Roll back a broken production
- `vercel logs --environment production --status-code 5xx --since 30m`
- `vercel rollback`
- `vercel rollback status`
- `vercel logs --environment production --since 5m`

## MCP guidance

If the team wants agent-native Vercel access, use the official endpoint:
- `https://mcp.vercel.com`

For Codex CLI:
- `codex mcp add vercel --url https://mcp.vercel.com`

If a single project is used repeatedly, prefer the project-scoped URL:
- `https://mcp.vercel.com/<teamSlug>/<projectSlug>`

This reduces parameter errors and makes deployment/log workflows faster.

## Output contract

When finishing a Vercel task, report:
- active branch
- Vercel team/scope
- project
- environment or target
- deployment URL
- custom domain or alias involved
- validation performed
- protection/auth blockers
- next safe action
