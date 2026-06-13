# Skill Injection Map

Use this map after `pnpm qa:gates` or manual risk classification. Load every
agent-specific skill that matches the touched risk before judging that risk.

Do not assume Codex and Claude share skill names. If a column says "fallback",
name that limitation in the QA report and raise the closure bar instead of
pretending the missing domain auditor ran.

| Risk | Trigger examples | Codex skills | Claude skills |
|---|---|---|---|
| UI / visual / responsive / copy | `src/views`, `src/components`, `src/app/**/page.tsx`, visible copy, states, motion, screenshots | `greenhouse-gvc-playwright`, `greenhouse-ui-enterprise-review`, `greenhouse-product-ui-architect`, `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`, `greenhouse-ux-content-accessibility`, `greenhouse-typography-accessibility`, `greenhouse-microinteractions-auditor` | `greenhouse-gvc-playwright`, `greenhouse-ui-enterprise-review`, `greenhouse-product-ui-architect`, `greenhouse-ui-orchestrator`, `greenhouse-ui-review`, `modern-ui`, `state-design`, `forms-ux`, `a11y-architect`, `typography-design`, `greenhouse-microinteractions-auditor` |
| Design-system primitive | `src/components/greenhouse/primitives`, `/admin/design-system`, tokens, motion/elevation/color/radius | UI skills plus `greenhouse-ui-orchestrator` | UI skills plus `design-system-governance` |
| Browser diagnostics | route open/review/test, localhost, staging, screenshots, `Compiling...`, auth redirects | `greenhouse-browser-diagnostics`, `greenhouse-gvc-playwright` | `greenhouse-gvc-playwright` |
| Finance/accounting | `src/lib/finance`, finance APIs, P&L, cashflow, settlements, payment orders, accounting docs | `greenhouse-finance-accounting-operator` | fallback: `commercial-expert`, `arch-architect`; no same-name finance/accounting auditor exists in Claude yet |
| Payroll/HR legal | payroll, final settlement, contracts, compensation, Chile labor/tax, contractor closure | `greenhouse-payroll-auditor` | `greenhouse-payroll-auditor` |
| Secrets / env / credentials | `.env`, Secret Manager, Vercel env, API keys, tokens, OAuth secrets | `greenhouse-secret-hygiene`, `vercel-operations` when Vercel is involved | `greenhouse-secret-hygiene`; Vercel-specific closure needs Codex `vercel-operations` or explicit Vercel runbook evidence |
| Production release / rollback | `main`, production, release orchestrator, watchdog, Cloud Run worker deploys, Vercel production | `greenhouse-production-release` | `greenhouse-production-release` |
| Vercel / deploy / runtime config | `vercel.json`, Vercel env, deployment protection, preview/staging drift | `vercel-operations`; production paths also require `greenhouse-production-release` | fallback: `arch-architect` plus Vercel runbooks; production paths also require `greenhouse-production-release` |
| HubSpot / CRM lifecycle | HubSpot bridge, Bow-tie, Account 360 sync, lifecycle/deal/contact/company mapping | `hubspot-greenhouse-bridge`; also `efeonce-agency` for GTM/terminology | `hubspot-greenhouse-bridge`; also `efeonce-agency` for GTM/terminology |
| Teams / bot messaging | Teams bot, announcements, Adaptive Cards, mentions, Logic Apps | `greenhouse-teams-message-operator`, `teams-bot-platform` | `greenhouse-teams-message-operator`, `teams-bot-platform` |
| Architecture / ADR / shared contract | source of truth, schema, auth/access, API platform, events/outbox, runtime projection, AI workflow | `software-architect-2026`, then `greenhouse-documentation-governor` for closure | `arch-architect`, then `greenhouse-documentation-governor` for closure |
| Documentation closure | behavior change, local skill change, task closure, incident, rollout, architecture/workflow change | `greenhouse-documentation-governor` | `greenhouse-documentation-governor` |
| Business/product/naming/copy/GTM | product surface, naming, KPIs, HubSpot Bow-tie, onboarding, client experience, brand | `efeonce-agency` | `efeonce-agency` |
| Tooling / QA helper / local skill | `scripts/`, `package.json`, `.codex/skills`, `.claude/skills` | `greenhouse-documentation-governor`; use this QA skill itself for final verdict | `greenhouse-documentation-governor`; use this QA skill itself for final verdict |

Injection protocol:

1. Identify the executing agent: Codex, Claude, or both.
2. Name the agent-specific skill list in the QA report under `Injected skills`.
3. Read each selected skill's `SKILL.md` before judging that domain.
4. If a same-name skill is unavailable, record the fallback path and make any
   missing domain auditor a blocker unless equivalent evidence exists.
5. Apply specialized hard rules even when the generic QA matrix looks
   satisfied.
6. If skills conflict, prefer verified architecture/runtime and document the
   drift.
