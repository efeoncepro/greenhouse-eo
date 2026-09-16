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
