# Official Vercel Reference

Use this file when the task needs exact command behavior or current official guidance.

## Highest-value docs

- Vercel CLI Overview
  - https://vercel.com/docs/cli
  - install/update CLI, auth model, command inventory, `--scope`, `--token`

- Project Linking
  - https://vercel.com/docs/cli/project-linking
  - how `vercel link` works, `.vercel/` state, linking an existing project

- Deploy from CLI
  - https://vercel.com/docs/cli/deploying-from-cli
  - default deploys, staged production via `vercel --prod --skip-domain`, promote path

- `vercel env`
  - https://vercel.com/docs/cli/env
  - env CRUD, branch-specific preview vars, `env pull`, `env run`

- `vercel logs`
  - https://vercel.com/docs/cli/logs
  - request/runtime logs, `--branch`, `--environment`, `--deployment`, `--follow`, `--expand`, `--json`

- `vercel promote`
  - https://vercel.com/docs/cli/promote
  - promotion flow and `promote status`

- Preview to production workflow
  - https://vercel.com/docs/deployments/promote-preview-to-production
  - recommended pre-promotion checks and production verification

- `vercel rollback`
  - https://vercel.com/docs/cli/rollback
  - rollback behavior and `rollback status`

- Production rollback workflow
  - https://vercel.com/docs/deployments/rollback-production-deployment
  - incident recovery flow

- `vercel alias`
  - https://vercel.com/docs/cli/alias
  - use for explicit domain assignment, not as the default prod promotion path

- Custom environments and targets
  - https://vercel.com/docs/deployments/environments
  - https://vercel.com/docs/cli/target
  - `vercel deploy --target=<env>`, `vercel pull --environment=<env>`, `vercel env add <key> <env>`

- Deployment protection
  - https://vercel.com/docs/deployment-protection
  - explains why preview/custom domains can return auth pages

- Protection Bypass for Automation
  - https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
  - header/query-based bypass and cookie setting

- Vercel MCP
  - https://vercel.com/docs/agent-resources/vercel-mcp
  - official MCP endpoint, supported clients, Codex setup, project-specific URLs

- CLI Workflows
  - https://vercel.com/docs/agent-resources/workflows
  - official end-to-end CLI workflows for debugging, deploy, promote, rollback, env management

## Practical rules distilled from docs

- Use `vercel env pull` for `.env`-style local files.
- Use `vercel pull` when `vercel build` or `vercel dev` needs linked project settings under `.vercel/`.
- Use `vercel promote` for staged production or preview-to-production workflows.
- Use `vercel rollback` for incidents; it is faster than rebuilding.
- Use `vercel alias` mainly for explicit domain assignment heuristics, not as the normal production promotion path.
- Use `vercel logs --branch <branch>` or `--deployment <url>` to avoid reading the wrong deployment.
- Use `--scope <team-slug>` whenever there is any doubt about which team is active.
- Protected deployments require auth, `vercel curl`, Vercel MCP, or a bypass secret. A plain `curl` returning `401` is not enough evidence about the app itself.
