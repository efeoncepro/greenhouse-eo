# Evidence Matrix

Use the smallest set that proves the behavior. Escalate when the blast radius or
domain risk is high.

## Baseline

- `git status --short`
- `pnpm qa:gates --changed`
- focal lint/type/test for touched files
- `git diff --check`

## Common Commands

| Risk | Evidence candidates |
|---|---|
| Local TypeScript/app code | `pnpm lint`, `pnpm exec tsc --noEmit`, focal Vitest, `pnpm build` when route/runtime bundling matters |
| UI visible | `pnpm design:lint`, `pnpm fe:capture <scenario> --env=local|staging`, read PNG frames and `review-dossier.md`, run `greenhouse-ui-enterprise-review` |
| GVC scenario authoring | `pnpm fe:capture:explore`, `pnpm fe:capture`, read `.aria.txt`, `pnpm fe:capture:review` |
| Access/auth | tests for guards/capabilities, route reachability, live smoke as least-privilege persona, verify both `views` and entitlements/capabilities |
| Data/schema | migration status, `pnpm migrate:status`, focal DB smoke with `pnpm pg:connect`/canonical script, generated types if schema changed |
| API/server actions | request/response smoke, auth failure smoke, tenant-safety check, idempotency/audit/outbox proof when writes exist |
| Workers/crons/webhooks | local unit/focal integration, env/secret verification, scheduler/webhook registration evidence, dead-letter/observability path |
| Finance/payroll | domain auditor skill, real or representative data smoke, reconciliation/readiness checks, accounting/legal invariants |
| Release/production | production-release skill, `pnpm release:preflight`, orchestrator/watchdog evidence, Vercel READY, Cloud Run SHA checks |
| Docs/task lifecycle | `pnpm docs:closure-check`, `pnpm ops:lint --changed`, task lint when task docs changed, handoff/changelog/project_context sync |
| Security/secrets | secret hygiene skill, no raw secrets in diff/logs, authz failure smoke, sanitized error handling |

## Runtime Completeness Checklist

Block closure or downgrade to `code complete, rollout pendiente` if any required
item is missing:

- flag/env var configured in target environment
- migration/backfill/recovery applied
- external app/webhook/cron/scheduler provisioned
- redeploy/restart performed when required
- real source-of-truth data queried
- Sentry/log/health evidence reviewed when incident-related
- docs and handoff reflect pending owner and next step

## Evidence Quality Rules

- A passing test that does not exercise the failure mode is not evidence.
- A local smoke is not deployment evidence when the behavior depends on Vercel,
  Cloud Run, Cloud SQL, Entra, HubSpot, Notion, Teams, or production env.
- A screenshot is not UI QA until the frame is looked at and assessed.
- A mock is not runtime evidence unless the task is explicitly mockup-only.
- A warning can be accepted only with owner, reason, and withdrawal condition.
