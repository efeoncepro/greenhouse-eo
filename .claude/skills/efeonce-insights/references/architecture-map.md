# Efeonce Insights — architecture map (where things live)

Verified against develop on 2026-09-16. The exhaustive, line-referenced version is
`docs/architecture/EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md`; keep this map short and current.

## Domain `src/lib/efeonce-insights/`

| Path | Responsibility |
| --- | --- |
| `contracts/{request,states,evidence,chart-spec,plan,retention,index}.ts` | Browser-safe DTOs: `InsightRequestV1`, states, `EvidenceFactV1`, `ChartSpecV1`, `EditorialPlanV1`, retention classes |
| `edition-state-machine.ts` | 14 transitions; parity test against `insight_edition_state_matrix` |
| `window.ts` | `[start,end)` civil windows in IANA zones, comparisons, DST, max 400 days, no future start |
| `request-hash.ts`, `errors.ts`, `events.ts`, `flags.ts` | canonical hash, domain errors, outbox payload types, `INSIGHTS_*` readers |
| `adapters/{contract,registry,seo-adapter,aeo-adapter,ico-adapter,collect-evidence}.ts` | evidence collection over owner readers; a 4th adapter registers without touching the orchestrator |
| `editorial/{format,deterministic-planner,plan-validation,ai-authoring,author-plan}.ts` | deterministic plan, figure validation, bounded Gemini rewrite (1 repair, fallback) |
| `authz.ts` | `assertInsightsAccess`: module `insights_v1` + capability + audience; 404 anti-oracle |
| `catalog.ts` | what each module can produce for an org and why not |
| `ports.ts` | `InsightOutputsPort` / `setInsightOutputsPort` (TASK-1846), share port (TASK-1848) |
| `commands/{validate-request,create-edition,generation,lifecycle,index}.ts` | create (idempotent), phased generation, revise/issue/withdraw/recover |
| `readers/projection.ts` | audience projection: clients see evidence/plan only when issued |
| `stores/*` | Kysely/pg access to `greenhouse_insights.*` only |

## Data: schema `greenhouse_insights` (migration `migrations/20260915100154428_task-1845-insights-foundation.sql`)

7 tables, 13 triggers, `next_insight_report_code()`, sequence `insight_report_code_seq`; seeds for module and
capabilities; Down = drop schema + deprecate capabilities (module/assignments/audit survive; see operations).

## Surfaces

- App lane `src/app/api/platform/app/insights/{catalog,reports,reports/[id],editions,editions/[id],editions/[id]/{issue,revise,withdraw,recover}}` via `src/lib/api-platform/resources/app-insights.ts`.
- Ecosystem lane `src/app/api/platform/ecosystem/insights/{catalog,reports,reports/[id],editions,editions/[id],editions/[id]/{revise,recover}}` via `ecosystem-insights.ts` (needs `externalScopeType/externalScopeId` + `organizationId`).
- Error table `src/lib/api-platform/resources/insights-errors.ts` (shared by both lanes).
- MCP internal `src/mcp/greenhouse/{tool-manifest.ts,tools.ts,server.ts,http-client.ts}` domain `insights`; skill `docs/mcp/skills/efeonce-insights/SKILL.md` + `skill-manifest.ts` (artifact `skill-catalog.generated.json`).
- Gateway `efeonce-mcp`: `src/providers/greenhouse-insights.ts`, `src/auth/tool-policy.ts` (4 `unsupported`), `src/config.ts` (`INSIGHTS_WRITE_SCOPE`), parity `greenhouse-seo-tool-parity.ts`, canary `scripts/greenhouse-insights-canary.mjs`.

## Cross-cutting registrations

`src/config/entitlements-catalog.ts` (module `insights`), `src/lib/entitlements/runtime.ts` (grants),
`src/lib/sync/event-catalog.ts` (5 events), `src/lib/observability/capture.ts` (domain), `src/types/reliability.ts`
+ `src/lib/reliability/{registry,incident-mapping,get-reliability-overview}.ts` + `queries/insights-edition-signals.ts`,
`src/lib/client-portal/dto/reader-meta.ts` + `data-sources/parity.ts` (cardinality 21),
`src/lib/growth/seo/overview/read-overview-kpis.ts` (`readSeoOverviewKpisForWindow`), `src/lib/auth-server/oauth/scopes.ts`
(`efeonce.mcp.insights.write`), `scripts/insights/assign-insights-module.ts`, `.claude/rules/efeonce-insights.md`.

## Docs

Architecture `EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`, ADR `EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`, record
`EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md`, functional `docs/documentation/insights/efeonce-insights-dominio-ediciones.md`,
runbook `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md`, EPIC-045 + master UI flow
`docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`, Think decision `docs/think/README.md`, flag ledger rows.

## TASK-1846 — durable rendering (2026-09-16)

| Piece | Where | Responsibility |
| --- | --- | --- |
| Tables | `greenhouse_insights.insight_render_runs`, `insight_outputs` (UNIQUE org+edition+output+audience; `lease_expires_at`, `fence_token`), `insight_render_events` | request per edition; claimable unit per target; append-only history |
| Proposal columns | `greenhouse_commercial.proposal_render_jobs.lease_expires_at/fence_token` | additive, unused by Proposal (reclaim OFF) |
| Domain | `src/lib/efeonce-insights/render/contracts.ts` | states, failure codes, transitions, `INSIGHT_RENDERABLE_OUTPUTS`, `InsightRenderFenceLostError` |
| Domain | `render/store.ts` | claim (lease+fence+reclaim+org quota), transitions (+events), retry, cancel, inserts, readers by edition/run |
| Domain | `render/commands.ts` · `render/readers.ts` | `requestInsightRender`, `retryInsightRender`, `cancelInsightRender`; `readInsightRenderRun(s)` |
| Domain | `render/outputs-port.ts` | real `InsightOutputsPort` + `wireInsightOutputsPort()` (called from `commands/index.ts`) |
| Domain | `render/deck-mapper.ts` · `render/plan-limits.ts` | frozen plan → deck-axis slides (V1); limits dedupe at render |
| Composer | `src/lib/artifact-composer/manifest-hash.ts` | `hashResolvedManifest` domain-free (re-exported by Proposal `render-jobs.ts`) |
| Worker | `services/artifact-worker/consumer-contract.ts`, `consumers/{proposal,insights,index}.ts`, `main.ts` | registry dispatch; `INSIGHTS_RENDER_ENABLED` in `deploy.sh` (+ `deploy-contract.test.ts`) |
| Lanes | `src/lib/api-platform/resources/{app,ecosystem}-insights.ts` + routes `…/insights/editions/[editionId]/render`, `…/insights/render-runs/[renderRunId]{,/retry,/cancel}` | request/list/get/retry/cancel |
| MCP | `src/mcp/greenhouse/{tool-manifest,server,tools,http-client}.ts` | 4 render tools (federated in gateway v1.6.0, not deployed) |
| Reliability | `src/lib/reliability/queries/insights-render-orphaned.ts` (`insights.render.orphaned_output`) | orphan detection, steady 0 |
| Asset context | `insight_output` (`src/types/assets.ts`, retention `commercial_engagement_report`) | system-generated, not a draft upload |
| Dispatcher | `src/lib/efeonce-insights/render/dispatch.ts` | decides whether Insights launches the Job this tick (after Proposal); reads `INSIGHTS_RENDER_ENABLED` |
| Dispatch runtime | `ops-worker` route `/artifact-render/dispatch` + Cloud Scheduler `ops-artifact-render-dispatch` (every 2 min) | one Job execution per tick; Proposal has priority in the tick |
| Job launcher | `src/lib/render-dispatch/job-runner.ts` | domain-free Cloud Run Job execution launcher |
| Worker consumer | `services/artifact-worker/consumers/insights.ts` | claim + render + upload for Insights outputs; Job `parallelism=1`; assets bucket fixed to staging bucket, `bucket_name` per row |
| Migration | `20260916201127095_task-1846-insights-render-client-user-actor` | runs/events accept `client_user`; human actor on run, enqueue event, retry, cancel |
| Gateway | `efeonce-mcp` v1.6.0 (PR #14 `da8295a`, 51 tools) | 4 render tools federated; writes need `efeonce.mcp.insights.write`; merged, not deployed |
| Release plane | artifact-worker Job in the production release control plane | first productive deploy on the next release |
