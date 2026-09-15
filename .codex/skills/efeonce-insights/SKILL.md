---
name: efeonce-insights
description: Operate and extend Efeonce Insights (EPIC-045) — the frozen-edition library (deck/A4/web) over SEO/AEO/ICO evidence. Use when creating or reading Insights editions through API/MCP, when adding a module adapter, when wiring rendering (TASK-1846), sharing/delivery (TASK-1848) or the portal UI (TASK-1849), or when a human asks how an Insights figure was produced. Routes rendering to artifact-composer, metrics to their owner modules and MCP exposure to efeonce-mcp-platform.
---

# Efeonce Insights (harness skill)

Efeonce Insights is a **commercial capability inside Greenhouse**: one request per organization and
window produces a versioned, immutable edition whose evidence, plan and (later) outputs share the same
facts. Greenhouse owns library, request, permissions and lifecycle; the Composer owns composition; the
producer modules (SEO, AEO, ICO) own their metrics; Email owns transport.

Canon: `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (+ ADR
`EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`, `EPIC-045`). Runtime built by TASK-1845 (foundation).
Served MCP manual (same operating recipes, machine audience): `docs/mcp/skills/efeonce-insights/SKILL.md`.

## Where things live

| Concern | Path |
| --- | --- |
| Browser-safe contracts (request, evidence facts, ChartSpecV1, plan, states, retention) | `src/lib/efeonce-insights/contracts/**` |
| Window resolution (IANA, DST, calendar comparison rules) | `src/lib/efeonce-insights/window.ts` |
| Module adapters + registry + orchestrator | `src/lib/efeonce-insights/adapters/**` |
| Editorial plan (deterministic planner, figure validation, bounded AI) | `src/lib/efeonce-insights/editorial/**` |
| Authorization (capability × target × per-org module) and eligible catalog | `authz.ts`, `catalog.ts` |
| Commands (validate/create/revise/issue/withdraw/recover + phased generation) | `src/lib/efeonce-insights/commands/**` |
| Readers with audience projection | `src/lib/efeonce-insights/readers/**` |
| Stores (raw SQL, tx-composable) and outbox events | `stores/**`, `events.ts` |
| Ports to later units (outputs → TASK-1846, share → TASK-1848) | `ports.ts` |
| API Platform lanes | `src/app/api/platform/{app,ecosystem}/insights/**`, `src/lib/api-platform/resources/{app,ecosystem}-insights.ts` |
| MCP tools | `src/mcp/greenhouse/{tool-manifest,server,tools,http-client}.ts` (`get_insights_catalog`, `list_insight_editions`, `get_insight_edition`, `create_insight_edition`) |
| Schema | `greenhouse_insights` (migration `20260915100154428_task-1845-insights-foundation.sql`) |
| Flags (all default OFF) | `INSIGHTS_GENERATION_ENABLED`, `INSIGHTS_ISSUANCE_ENABLED`, `INSIGHTS_AUTHORING_AI_ENABLED` (`flags.ts`, ledger) |
| Reliability | module `insights`; signals `insights.editions.failed_recent`, `insights.editions.stuck_generation` |

## Invariants you must keep

- **Metrics stay with their owner.** Adapters consume public readers of `growth/seo`,
  `growth/ai-visibility` and `ico-engine`; they never recompute formulas, never import
  `client-portal` (DAG leaf) nor AEO `probes/**`. If an owner reader cannot serve a window exactly,
  the adapter declares `unsupported_window` (with an alternative granularity when one exists) — it
  never uses the current value as history. Absence ≠ zero: declare a `rejection`.
- **One snapshot per edition, sealed and hashed; one plan, frozen and hashed.** Correcting means a
  new version (`reviseInsightEdition`), never mutating. Issued editions can only be withdrawn. DB
  triggers enforce it; the TS state machine (`edition-state-machine.ts`) mirrors the DB matrix and the
  parity test parses the migration — change both together, with a new migration.
- **Every figure in the plan references a fact.** `validateEditorialPlan` rejects any number in a
  claim that is not derived from a referenced fact (value, numerator/denominator, delta). Bounded AI
  may only rewrite claim text and is discarded on any violation (one repair max); it never computes,
  issues or sends.
- **Three authorization planes, one door** (`assertInsightsAccess`): capability by action
  (`insights.report.read`, `insights.edition.create`, `insights.edition.review`,
  `insights.edition.issue` — grants in `runtime.ts`), target by actor (client = own organization,
  anti-oracle 404 elsewhere; internal = target revalidated per command), and per-org module
  `insights_v1`. `audience` is a dimension separate from the actor; a client never gets `internal`.
- **Idempotency at the domain**: `(organization_id, idempotency_key)` unique + `request_hash`; same
  key + different payload ⇒ `idempotency_conflict`. Lanes add transport idempotency on top.
- **Issuing is a human gate with validated outputs.** The outputs port is not connected until
  TASK-1846; `issueInsightEdition` fails closed with `not_ready`. Machine consumers (MCP internal
  bindings) create but never issue.
- **Write allowlist**: `boundary-domain.test.ts` lists the only tables this domain writes. New stores
  are declared there in the same PR.

## Extending

- **New module**: implement `ModuleReportAdapterV1` (`adapters/contract.ts`), register it in
  `adapters/registry.ts`, declare its availability rule in `catalog.ts`. The orchestrator and the
  Composer are not touched. Cover: unsupported window, absence reasons, comparison linkage.
- **New verb / lane**: add the command in `commands/**` first (Full API Parity), then thin adapters in
  both lanes and the MCP trio; map errors through `resources/insights-errors.ts`.
- **Rendering (TASK-1846)**: implement `InsightOutputsPort` and register it with
  `setInsightOutputsPort`; move `runInsightGeneration` phases to the worker; declare the worker's
  reading of the flags in the ledger.
- **Federation**: registering an MCP tool here is not enough — the gateway in `efeonce-mcp` needs its
  pieces (and a scope for writes). Skill: `efeonce-mcp-platform`.

## Operating state (as of 2026-09-15) — what is live and what is not

- **In production.** Foundation released 2026-09-15 through the release control plane (PR #236 → `main`).
  Schema applied on the single shared Cloud SQL instance (dev/staging/prod). Editions created:
  `EO-INS-000012` (app lane, staging), `EO-INS-000013` (ecosystem lane, staging), `EO-INS-000014`
  (ecosystem lane, production) — all `ready_for_review` on the synthetic Greenhouse Demo organization.
- **Flags (read only in Vercel; ledger `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`):**
  `INSIGHTS_GENERATION_ENABLED` **ON** in `staging` and `production`, OFF in Preview;
  `INSIGHTS_ISSUANCE_ENABLED` and `INSIGHTS_AUTHORING_AI_ENABLED` **OFF everywhere**. Without generation the
  create path answers `503 service_unavailable` with `details.code = generation_disabled`.
- **Vercel trap:** a deployment built before the env var existed does not see it — after `vercel env add`
  you must `vercel redeploy` the target (it happened in both staging and production). Verify with
  `vercel env pull --environment=<target>`, then exercise the real create path.
- **Module assignment** is the per-org gate: `npx tsx --require ./scripts/lib/server-only-shim.cjs
  scripts/insights/assign-insights-module.ts --org=<organization_id> [--apply]` (dry-run by default; goes
  through `enableClientPortalModule`, audit + outbox, idempotent). Without `insights_v1` the org is `404`
  for everyone, internal actors included.
- **Canary by lane (no secrets in docs):** with the gateway consumer's token (internal binding riding the
  SEO provider config), call ecosystem `catalog` → `editions` (create, `202`) → same request again (`202`,
  `idempotent: true`) → same key with another `depth` (`409 idempotency_conflict`) → `editions/<id>?include=evidence`
  → an org without the module (`404`). The app lane was exercised with the `agent-client` persona
  (`client_executive`): the client sees `evidence`/`plan` as `null` until issued — by design.
- **Gateway `efeonce-mcp`:** version 1.5.0, 47 tools, 8 scope classes (`read`, `globe.read`, `hiring.read`,
  `globe.credits.funding.ensure`, `seo.write`, `identity.write`, `client_services.write`, `insights.write`).
  Provider `greenhouse-insights` federates the 4 tools; reads use `efeonce.mcp.read`, `create_insight_edition`
  requires `efeonce.mcp.insights.write` (created in Entra 2026-09-15 on the MCP resource app; **no client
  carries it yet ⇒ `insufficient_scope`** until a governed grant). Native-authority policies for the 4 tools are
  `unsupported` (fail-closed). Read-only canary: `scripts/greenhouse-insights-canary.mjs` in that repo.
- **Known limits:** canary evidence has **0 facts** (synthetic org has no ICO snapshots in 2026-07/08 → 4
  `no_data` rejections; the honest-absence path is what got verified, not a report with real figures);
  `issue` fails closed `not_ready` until TASK-1846; `renderableOutputs` is `[]`; `plan.limits` repeats
  «ico: sin datos.» once per rejection (dedupe owed by TASK-1846); no PDF/web/share/email/schedule exists.
- **Still missing to move TASK-1845 to `complete`:** a `migrate:down` rehearsal on the shared instance
  (keep `pgmigrations.run_on` and the editions intact) and a `tools/list` through a served MCP session with a
  human token (evidence of 47 tools + the `efeonce-insights` skill from a real client). Until then the honest
  state is *code complete + in production, closure pending*.

## Verification that counts

`pnpm vitest run --project unit src/lib/efeonce-insights src/lib/api-platform/resources/insights-lanes.test.ts src/mcp`
(contracts, windows, adapters with mocked readers, planner + validation + AI fallback, commands
allow/deny/idempotency, lanes, manifest) and `pnpm test:live src/lib/efeonce-insights` (stores against
real PostgreSQL inside a rolled-back transaction: ownership, immutability triggers, state matrix,
idempotency). New embedded SQL is exercised once against real PG before commit. Flags stay OFF until
a staging canary with two synthetic organizations and a release authorization.
