# Efeonce Insights — architecture map (where things live)

Verified against develop on 2026-09-16 (TASK-1848 section 2026-09-18; TASK-1888/1889 section 2026-09-25). The exhaustive, line-referenced version is
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
| Domain | `render/insights-deck-mapper.ts` · `render/report-mapper.ts` · `render/figure-pages.ts` · `render/composition-helpers.ts` · `render/labels.ts` · `render/plan-limits.ts` | frozen plan → `insights-deck` slides (deck_pdf, since 2026-09-22; the deck-axis mapper was retired) and `insights-report` pages (report_pdf); also line/pie/donut/scatter and a paginated A4 index; in production since release `ebb9212a32ce` (2026-09-24), first productive A4 + deck render 2026-09-25 |
| Composer | `src/lib/artifact-composer/manifest-hash.ts` | `hashResolvedManifest` domain-free (re-exported by Proposal `render-jobs.ts`) |
| Worker | `services/artifact-worker/consumer-contract.ts`, `consumers/{proposal,insights,index}.ts`, `main.ts` | registry dispatch; `INSIGHTS_RENDER_ENABLED` in `deploy.sh` (+ `deploy-contract.test.ts`) |
| Lanes | `src/lib/api-platform/resources/{app,ecosystem}-insights.ts` + routes `…/insights/editions/[editionId]/render`, `…/insights/render-runs/[renderRunId]{,/retry,/cancel}` | request/list/get/retry/cancel |
| MCP | `src/mcp/greenhouse/{tool-manifest,server,tools,http-client}.ts` | 4 render tools (federated in gateway v1.6.0, deployed 2026-09-16) |
| Reliability | `src/lib/reliability/queries/insights-render-orphaned.ts` (`insights.render.orphaned_output`) | orphan detection, steady 0 |
| Asset context | `insight_output` (`src/types/assets.ts`, retention `commercial_engagement_report`) | system-generated, not a draft upload |
| Dispatcher | `src/lib/efeonce-insights/render/dispatch.ts` | decides whether Insights launches the Job this tick (after Proposal); reads `INSIGHTS_RENDER_ENABLED` |
| Dispatch runtime | `ops-worker` route `/artifact-render/dispatch` + Cloud Scheduler `ops-artifact-render-dispatch` (every 2 min) | one Job execution per tick; Proposal has priority in the tick |
| Job launcher | `src/lib/render-dispatch/job-runner.ts` | domain-free Cloud Run Job execution launcher |
| Worker consumer | `services/artifact-worker/consumers/insights.ts` | claim + render + upload for Insights outputs; Job `parallelism=1`; assets bucket fixed to staging bucket, `bucket_name` per row |
| Migration | `20260916201127095_task-1846-insights-render-client-user-actor` | runs/events accept `client_user`; human actor on run, enqueue event, retry, cancel |
| Gateway | `efeonce-mcp` v1.6.0 (PR #14 `da8295a`, 51 tools) | 4 render tools federated; writes need `efeonce.mcp.insights.write`; deployed 2026-09-16 (revision `00054-n78`) |
| Release plane | artifact-worker Job in the production release control plane | first productive deploy in release `917491fd02e4` (2026-09-16, change-gated) |

## TASK-1848 — sharing, delivery, schedules (2026-09-18)

Slices in commits `75715589d`, `83d57380a`, `1c109fc8e`; in production since release `bda1cf2cd938` (2026-09-18) with the
sharing/delivery/schedules flags OFF there (ON in staging); the four migrations are applied on the shared instance.

| Piece | Where | Responsibility |
| --- | --- | --- |
| Migration | `20260918094614053_task-1848-insights-share-grants` | `insight_share_grants`, `insight_share_access_events`, `insight_share_rate_buckets`, capability `insights.share.manage` |
| Migration | `20260918100238745_task-1848-insights-delivery-intents` + `20260918100811735_…-skip-reason-edition` | delivery intents/recipients/events, `email_type_config` rows `enabled=false`, capability `insights.delivery.send`, skip reason `edition_unavailable` |
| Migration | `20260918101834425_task-1848-insights-schedules` | `insight_schedules`, `insight_schedule_occurrences`, capability `insights.schedule.manage` |
| Table | `greenhouse_insights.insight_share_grants` (`ishr-…`) | one grant per link: `token_digest` sha256 UNIQUE, audience `client`, `download_outputs`, mandatory expiry ≤ 90 d; immutable except one revocation; no delete |
| Table | `insight_share_access_events` | append-only access log (hashed subject, `client_hint`, outcome); no token, no raw IP |
| Table | `insight_share_rate_buckets` | per-minute window per hashed subject, atomic UPSERT |
| Table | `insight_delivery_intents` (`idlv-…`) | authorized email delivery of one issued edition; immutable authorized content; idempotency `(org, key)` + hash |
| Table | `insight_delivery_recipients` (`idlr-…`) | per-person state + skip reason; partial unique dedupe across intents |
| Table | `insight_delivery_events` | append-only delivery history |
| Table | `insight_schedules` (`isch-…`) · `insight_schedule_occurrences` (`isco-…`) | versioned recurrence, `review_policy = 'draft_for_review'` CHECK; one occurrence per (schedule, version, period_start) |
| Domain | `src/lib/efeonce-insights/sharing/token.ts` | `isg_` + 32 random bytes base64url, sha256 digest (pure primitives of `auth-server/oauth/primitives.ts`) |
| Domain | `sharing/commands.ts` · `sharing/store.ts` · `sharing/contracts.ts` | `createInsightShare` (token returned once), `revokeInsightShare` (works with flag OFF), `readInsightShares`; DTO without token/digest |
| Domain | `sharing/public.ts` · `sharing/http.ts` | public resolve of a token (grant, edition, org, module, rate limit) + anti-cache/anti-index headers |
| Domain | `sharing/web-model.ts` + `contracts/web-model.ts` | `InsightWebModelV1` resolver and `InsightSharedEditionResponseV1` DTO for Think |
| Domain | `delivery/contracts.ts` | modalities, states, skip reasons, transport statuses, honest rollup, per-attempt correlation, `INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE = false` |
| Domain | `delivery/commands.ts` · `delivery/store.ts` | request / cancel / retry / reconcile / read deliveries |
| Domain | `delivery/dispatch.ts` | `dispatchInsightDeliveryIntent`: atomic claim, revalidation, share_link or attachment send, accepted/failed/ambiguous |
| Domain | `schedules/contracts.ts` · `schedules/commands.ts` · `schedules/store.ts` | create/activate/pause/retire/read schedules; DTO hides the authority user id |
| Domain | `schedules/tick.ts` | `runInsightSchedulesTick`: authority revalidation via `session_360`, closed periods, occurrence claim, create edition + render, retention purge |
| Domain | `window.ts` (extended) | `civilToday`, `resolveClosedInsightPeriods` (calendar month, ISO week, civil day in the zone) |
| Domain | `commands/lifecycle.ts` (withdraw) | withdrawing an edition revokes live grants (`edition_withdrawn`) and cancels pending deliveries in the same transaction |
| Domain | `flags.ts` · `errors.ts` · `events.ts` · `authz.ts` · `ports.ts` | new flags, errors (`InsightsQuotaExceededError`, `*DisabledError`), events, needs `share_*`/`delivery_*`/`schedule_*` |
| Public route | `src/app/api/public/insights/shared/[token]/route.ts` | JSON `InsightSharedEditionResponseV1` (404/410/429/503, `no-store`) |
| Public route | `src/app/api/public/insights/shared/[token]/outputs/[output]/route.ts` | download proxy through `downloadPrivateAsset` with actor `null` + `insights_share_grant` channel, grant revalidated before bytes |
| App lane | `…/app/insights/editions/[editionId]/shares`, `…/insights/shares/[shareGrantId]/revoke` | create/list/revoke links |
| App lane | `…/app/insights/editions/[editionId]/deliveries`, `…/deliveries/[deliveryIntentId]{,/cancel,/retry}`, `…/delivery-recipients/[deliveryRecipientId]/reconcile` | request/list/read/cancel/retry/reconcile deliveries (human only) |
| App lane | `…/app/insights/schedules{,/[scheduleId]{,/activate,/pause,/retire}}` | define/activate/pause/retire/read schedules (human only) |
| Ecosystem lane | same share routes (create/revoke need internal binding); `GET` deliveries (by edition, by id); `GET` schedules (list, by id) | read-mostly surface, via `ecosystem-insights.ts` |
| Errors | `src/lib/api-platform/resources/insights-errors.ts` | `sharing_disabled`, `delivery_disabled`, `schedules_disabled` 503; `quota_exceeded` 429 |
| Email | `src/lib/email/types.ts` · `templates.ts` · `delivery.ts` + `src/emails/InsightsEditionDeliveryEmail.tsx` | EmailTypes `insights_edition_delivery` (token-sensitive) and `insights_edition_delivery_attachment`; domain `insights`; index `uq_email_deliveries_token_intent_v3` |
| Storage | `src/lib/storage/greenhouse-assets.ts` | `downloadPrivateAsset` accepts `actorUserId: string \| null` |
| Projection | `src/lib/sync/projections/insights-delivery-dispatch.ts` (registered in `projections/index.ts`) | `insights_delivery_dispatch`, domain `notifications`, lane ops-reactive-notifications |
| Worker | `services/ops-worker/server.ts` `POST /insights/schedules/tick` + `deploy.sh` | schedules tick; declares `INSIGHTS_DELIVERY_ENABLED`, `INSIGHTS_SCHEDULES_ENABLED`, `INSIGHTS_GENERATION_ENABLED` (default true) |
| Scheduler | Cloud Scheduler `ops-insights-schedules-tick` `20 * * * *` | one job for all organizations (ENABLED 2026-09-18) |
| Reliability | `src/lib/reliability/queries/insights-delivery-ambiguous.ts` (`insights.delivery.ambiguous`) wired in `get-reliability-overview.ts` | steady 0; warning 1–3, error >3; ambiguous + claimed >30 min |
| Observability | `src/lib/observability/redact.ts` (`insights_share_path`, `insights_share_token`) + `sentry-server-event-scrub.ts` in `sentry.server.config.ts`/`sentry.edge.config.ts` | scrub share paths/tokens from url, query, transaction, breadcrumbs, spans |
| Events | `src/lib/sync/event-catalog.ts` | `insights.share.created`, `insights.share.revoked`, `insights.delivery.requested`, `insights.schedule.changed`, `insights.schedule.occurrence_generated` |
| Entitlements | `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` | share: ADMIN + ACCOUNT (tenant), CLIENT_EXECUTIVE (own); delivery + schedule: ADMIN + ACCOUNT |
| MCP | `src/mcp/greenhouse/{tool-manifest,server,tools,http-client}.ts` | 7 tools (62 total, hash `9fc46c8d90d3`) |
| Gateway | `efeonce-mcp` 1.7.0 (PR #16 `4c9d7c44`, revision `00055-gk6`, 58 tools), provider `greenhouse-insights` contract `task-1848-v1` | federates the 7 tools; share create/revoke on `efeonce.mcp.insights.write` (fail-closed: no client carries it), 5 reads on the base scope; native authority `unsupported` per tool with the surface's real capability |

## TASK-1888 / TASK-1889 — approved redesign (2026-09-25): code complete, rollout pending

Status legend: **exists** = committed and verified in the repo; **planificado (TASK-18xx)** = named by the task, not built.
Production still renders with the TASK-1847 v1 catalogs and the v1 contract until the 1888/1889 release.

### Design references (exist, committed in `1ae82624d` and `568bfa669`)

| Piece | Where | Responsibility |
| --- | --- | --- |
| Visual direction | `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md` | source-led direction approved by the operator: alternatives, visual thesis, color roles, token mapping, anti-patterns, acceptance signature |
| Sheets | `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/{a4-estructura,a4-graficos,deck-graficos-y-prosa,a4-escala-de-grises}.png` | durable copy of the canvas (structure, chart pages, deck, grayscale print test) |
| Reference pages | `…/TASK-1889-efeonce-insights-premium-catalogs/paginas/` (41 PNG: `Premium-*` A4 794×1123, `Deck-*` 1280×720) | what the fidelity gate compares against, page by page |
| Source package | `…/TASK-1889-efeonce-insights-premium-catalogs/fuente-canvas-2026-09-25.tar.gz` | canvas `.dc.html` sources (example data, exact values) + `render-referencia.mjs`, which regenerates `paginas/` (40/41 byte-identical); packed so Tailwind's content scan does not read its markup |
| Wireframe | `docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md` | region-by-region spec of every A4 page and slide, with data, states and rules |
| Editable source | canvas «Gráficos de Efeonce Insights» (private Artifact of the operator, version 36) | editable origin; the repo copies above are the durable contract |

### Pieces the redesign built on (TASK-1847; v1 templates replaced by TASK-1889 in `develop`)

| Piece | Where |
| --- | --- |
| A4 catalog v1 | `src/lib/artifact-composer/catalogs/insights-report/` (`report-cover`, `report-index`, `report-narrative`, `report-analysis`, `report-table`, `report-limits`) |
| Deck catalog v1 | `src/lib/artifact-composer/catalogs/insights-deck/` (`insights-cover`, `insights-narrative`, `insights-evidence`, `insights-limits`) |
| Geometry of 15 families | `src/lib/artifact-composer/chart-geometry.ts` (Vercel-safe values via `@/lib/artifact-composer/pure`) |
| Local preview over real data | `scripts/insights/preview-edition.ts` |

### Built by TASK-1888 (backend-data) — complete 2026-09-26, in production, flag ON

| Piece | Where | Responsibility |
| --- | --- | --- |
| Chart contract | `contracts/chart-spec.ts` | 15 families, per-family `data`, structural validation, `chartSpecFactIds` |
| Value invariants | `editorial/chart-values.ts` | `validateChartSpecValues` over `chart-geometry` (via `artifact-composer/pure`) |
| Channel registry | `contracts/channels.ts` | `INSIGHT_CHANNEL_IDS`, `channelForAeoProvider`, `SEO_SEARCH_CHANNEL` |
| Family × evidence matrix | `editorial/family-evidence-matrix.ts` | `family_evidence_matrix_v1`, `canProduceFamily` |
| v2 producers | `editorial/editorial-v2.ts` | bullet ICO, monthly line, readings, opening, essentials, scope lines, `assertChartsAllowed` |
| Planner / authoring | `editorial/deterministic-planner.ts` (`editorialV2`, `cover`), `editorial/ai-authoring.ts` (`insights-authoring-v2`), `editorial/author-plan.ts` | v2 only with the flag |
| Validator | `editorial/plan-validation.ts` | same figure rule on every v2 field; masks the cited fact's dimension values |
| Adapters | `adapters/ico-adapter.ts` (`ftr_pct`, `icoOfficialTarget`, reference facts), `aeo-adapter.ts` / `seo-adapter.ts` (`channelId`) | FTR/targets only with `editorialV2` |
| Cover | `contracts/cover.ts`, `commands/cover-preference.ts`, `stores/cover-preference-store.ts` | resolver, command + reader, `resolveInsightCoverForEdition` (called in `generation.ts` composing) |
| Table | `greenhouse_insights.insight_cover_preferences` (migration `20260925183531322_task-1888-insights-cover-preference`, applied) | one row per org, last write wins |
| Dark logo | `greenhouse_core.organizations.logo_on_dark_asset_id`; `account-360/organization-brand-assets.ts` (`attachOrganizationLogoAsset({ variant })`); `account-360/organization-logo-variants-reader.ts` | write only via account-360; light reader safe for ops-worker |
| Lanes | `app/api/platform/{app,ecosystem}/insights/cover-preference/route.ts` + `api-platform/resources/{app,ecosystem}-insights(-read).ts` | GET/POST |
| MCP | `src/mcp/greenhouse/{tool-manifest,tools,http-client,server}.ts` | `get/set_insight_cover_preference`; manifest 64 tools `a08f649aab8f` |
| Flag | `flags.ts` `isInsightsEditorialV2Enabled` (`=== 'true'`); `services/ops-worker/deploy.sh` (`:-true`) | Vercel + ops-worker; ON in staging, Production and ops-worker since 2026-09-26 (render Job does not read it) |
| Copy | `src/lib/copy/insights.ts` (`scopeLines`, `chapterOpenings`, `channels`, `targets`, `figures`, `reading`) | TASK-1889 owns `GH_INSIGHTS.catalog` |
| Preview | `scripts/insights/preview-edition.ts --editorial-v2 --plan-only` | read-only v2 plan over real data |

### Built by TASK-1889 (ui-ux) — code shipped in release `0e87c7a443a2` (runtime state owned by TASK-1889)

Detail: architecture §14.9, implementation record §8.z.

| Piece | Where | Responsibility |
| --- | --- | --- |
| A4 catalog v2 (794×1123) | `src/lib/artifact-composer/catalogs/insights-report/` | navy + white cover (`ReportCoverLightPage`), index, chapter, narrative, summary, reading, plan, table, limits, back cover, `report-figure-{comparison,columns,targets,trend}` → `ReportFigure*Page` |
| Deck catalog v2 (1280×720) | `src/lib/artifact-composer/catalogs/insights-deck/` | cover (always navy), chapter, summary, reading, plan, narrative, limits, back cover, `insights-figure-{comparison,columns,targets,trend}` → `InsightsFigure*Slide` |
| v2-only guard | `src/lib/artifact-composer/__tests__/insights-catalogs-v2-only.test.ts` | fails if a legacy template comes back |
| Figure geometry (pure) | `catalogs/insights-shared/figure-svg.ts` | `niceAxis`, `groupedColumnsSvg`, `lineChartSvg`, `wrapLabel` (≤ 3 lines), `REPORT_/DECK_COLUMNS_BOX`, `REPORT_/DECK_LINES_BOX` |
| Drawing hooks | `catalogs/insights-shared/figure-hooks.ts` (`makeColumnsHook`, `makeLinesHook`, `withDeckFigureSize` 132/112/104 px), `layout-hooks.ts` (`narrativeDropCapHook`) | hooks draw; templates do not compute |
| Editorial resolvers | `catalogs/insights-shared/editorial-resolvers.ts` (`report-`/`deck-` × `icon`, `delta-tone`, `pair-bars`, `bullet-row`, `line-role`) | color only via `fig-*` classes painted per catalog |
| Family rule | `src/lib/efeonce-insights/render/figure-slots.ts` (`FIGURE_CAPACITY`, `FIGURE_CONTENT_TYPE`, `balancedPages`, `buildFigureSlides`) | shared by `report-mapper.ts` and `insights-deck-mapper.ts`; replaced the deleted `figure-pages.ts` |
| Mappers | `render/report-mapper.ts`, `render/insights-deck-mapper.ts` | readings, «Lo esencial» with real folios, cover per `plan.cover` |
| Cover + client logo | `render/cover.ts` (`orgLogoRef`), `src/lib/storage/greenhouse-assets.ts` (`readOrganizationLogoForRender`), `services/artifact-worker/consumers/insights.ts`, `classify-failure.ts` | sealed `asset-ref:org-logo:<id>`; bytes via `ComposeOptions.externalAssets`; fails closed |
| Shared engine | `artifact-composer/render.ts` (`img.decode()` before capture), `contracts.ts` + `synthesize.ts` (`example?`) | probe uses the contract's sample value |
| Fidelity gate | `pnpm insights:canvas-fidelity [--gray]` → `scripts/insights/canvas-fidelity.ts` + `canvas-fixtures/{report,deck}` | ≤ 1 % per page; `approvedException` only with operator approval |
| Review dossier | `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/` | fidelity table, gray sheets, scorecard (`ui:quality` 4,59) |
| Visual baseline | Insights frames of `pnpm composer:visual-gate --catalog=insights` | 27 frames at 0 px; deltas g–j in `BASELINE_DELTAS.md` |

Removed: `ReportAnalysisPage`, `InsightsEvidenceSlide`, `report-mold.css`, `deck-mold.css`, `render/figure-pages.ts`, v1
bar/family/path resolvers. `artifact-composer/chart-figure.ts` and its test were retired on 2026-09-26 (no consumers).
