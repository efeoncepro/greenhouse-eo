# Risk Matrix

Classify the change before choosing tests. Use the highest applicable risk as
the closure bar.

| Risk | Level | Closure bar |
|---|---:|---|
| Docs-only wording, no agent/runtime contract | Low | docs lint/checks, no runtime claim |
| Local helper or test-only tooling | Low-Medium | self-test helper, syntax/lint, docs if workflow changed |
| UI visible, copy, layout, states, motion | Medium | GVC evidence, frame review, accessibility/state checks |
| API/readers/commands/server actions | Medium-High | focal tests + smoke through canonical API/command path |
| Data/schema/projections/migrations | High | schema/runtime verification, migration/backfill state, source-of-truth confirmation |
| Auth/access/entitlements/tenant safety | High | both `views` and capabilities/entitlements, least-privilege smoke, denial path |
| Worker/cron/outbox/webhook/async | High | scheduler/worker/env/dead-letter/observability evidence |
| Env/flag/secret/deploy/redeploy | High | target environment verified, redeploy/restart state known |
| Finance/payroll/accounting/legal | High | domain auditor skill, representative data, legal/accounting invariants |
| External integration | High | real provisioning/config/health evidence or rollout pending |
| Production release/rollback | Critical | `greenhouse-production-release`, orchestrator/preflight/watchdog evidence |
| Security-sensitive change | Critical | abuse cases, authz failure paths, sanitization, secret hygiene, OWASP subset |

False downgrade traps:

- Small diff in a shared primitive can be high risk.
- Unit tests do not prove deploy/runtime behavior.
- UI code with no screenshot/GVC is not visually verified.
- An inactive flag still needs rollout documentation.
- "Sentry quiet now" is not proof unless the issue window and event freshness are checked.
