# Verification Matrix

Choose the smallest set of gates that proves the behavior. Escalate for high
risk or shared contracts.

| Domain | Minimum evidence candidates |
|---|---|
| Generic code | `pnpm lint`, `pnpm exec tsc --noEmit`, focal Vitest |
| Build/runtime bundling | `pnpm build`, route smoke, no server-only/client boundary drift |
| UI | `pnpm design:lint`, GVC desktop+mobile, `greenhouse-ui-enterprise-review` |
| GVC/scenario authoring | `pnpm fe:capture:explore`, `pnpm fe:capture`, read `.aria.txt`, `pnpm fe:capture:review` |
| API/server action | focal tests, request smoke, auth failure smoke, tenant-safety/idempotency/audit evidence |
| Data/schema | `pnpm migrate:status`, migration applied state, generated types, DB smoke using canonical script/reader |
| Worker/cron/outbox | `pnpm worker:runtime-deps-gate`, `pnpm vercel-cron-gate`, worker env/dead-letter/health evidence |
| Auth/access | route reachability, least-privilege persona smoke, grants/denials/capabilities checked |
| Finance/payroll | domain auditor, real/representative data smoke, reconciliation/readiness checks |
| External integration | provisioning/config checked with authenticated CLI, webhook/subscription/health evidence |
| Env/flags/secrets | secret hygiene, target env var exists, restart/redeploy status, rollback path |
| Observability/Sentry | issue/event freshness, health endpoint/log/signal evidence, issue closure state |
| Docs/task lifecycle | `pnpm docs:closure-check`, `pnpm ops:lint --changed`, task lint, handoff/changelog/context sync |
| Production release | `pnpm release:preflight`, orchestrator/watchdog/manifest/Vercel/Cloud Run evidence |

Do not run destructive, production, push, release, or mutating external actions
without explicit operator approval and the relevant skill.
