# Efeonce Insights — program ledger (EPIC-045)

The single place where a session learns **what exists, where it runs and what the next task inherits**.
One section per task. Update yours at closure (Skill Maintenance Contract); append to "Sessions" as you go.

| Task | Scope | Lifecycle | Live where | Closed on |
| --- | --- | --- | --- | --- |
| TASK-1845 | Domain, evidence, adapters, lanes, MCP, gateway federation | **complete** | Cloud SQL (single instance), Vercel staging + Production (generation ON), gateway v1.5.0, Entra scope | 2026-09-16 |
| TASK-1846 | Durable rendering + Artifact Worker (RenderRun / InsightOutput), outputs port | in-progress | Cloud SQL (migrations applied), Vercel staging (render ON), Cloud Run Job `artifact-worker` + `ops-worker` dispatcher (flag ON, shared by staging/prod); Production pending | — |
| TASK-1847 | Analytical charts and editorial catalogs (deck / A4) | to-do | — | — |
| TASK-1848 | Sharing, delivery (email), schedules; web-model resolver/proxy for Think | to-do (blocked by 1846) | — | — |
| TASK-1849 | Library, builder and shared-web experience in the portal | to-do (blocked by 1846/1847/1848) | — | — |
| TASK-1875 | Shared web report rendered in `efeonce-think` from `InsightWebModelV1` | to-do (blocked by 1848) | — | — |

## TASK-1845 — foundation (complete 2026-09-16)

**Built (develop → main `9c094688309d`, release manifest `9c094688309d-500ec9e7`, released 2026-09-15 22:55Z):**
- Schema `greenhouse_insights` (migration `20260915100154428`): `insight_retention_classes` (3, 1095 days),
  `insight_reports` (public code `EO-INS-` + `lpad(n, GREATEST(6, len), '0')` via `next_insight_report_code()`),
  `insight_edition_state_matrix` (14 transitions), `insight_editions`, `insight_edition_transitions`
  (append-only), `insight_evidence_snapshots` (sealed, immutable), `insight_editorial_plans` (frozen, immutable);
  13 triggers; seeds: module `insights_v1`, capabilities `insights.report.read|edition.create|edition.review|edition.issue`.
- Domain `src/lib/efeonce-insights/` (51 files): contracts, state machine (TS↔DB parity), windows, adapters
  SEO/AEO/ICO over owner readers, deterministic planner + bounded Gemini authoring, authz (three planes),
  commands (validate/create/generation/lifecycle), projection by audience, ports for outputs/share (not connected).
- Lanes `/api/platform/app/insights/**` (9 routes) and `/api/platform/ecosystem/insights/**` (7 routes; no
  issue/withdraw) with one error table. MCP internal domain `insights` (4 tools; manifest 51 tools, hash
  `408928347799…`), served manual `efeonce-insights` (audience internal).
- Gateway `efeonce-mcp` v1.5.0 (PR #12 `cad57b31d`, revision `efeonce-mcp-gateway-00053-dsk`, 47 tools): provider
  `greenhouse-insights` riding the SEO config; scope class `efeonce.mcp.insights.write` (create only), created in the
  Entra resource app 2026-09-15 (7 scopes; no client carries it yet ⇒ `insufficient_scope`).
- Reliability module `insights` (signals `insights.editions.failed_recent` 7 d / `stuck_generation` 30 min),
  5 outbox events `insights.*`, observability domain `insights`, client-portal data source `insights`.
- Script `scripts/insights/assign-insights-module.ts --org=<id> [--apply]`.

**Deployed where (as of 2026-09-16):**

| Runtime | Component | State | Evidence |
| --- | --- | --- | --- |
| Cloud SQL `greenhouse-pg-dev` (single instance dev/staging/prod) | schema + seeds | applied; rollback rehearsed 2026-09-16 (down/up with readbacks) | `pgmigrations.run_on` 2026-09-16 00:25:31Z |
| Vercel `staging` | code + `INSIGHTS_GENERATION_ENABLED=true` | ON since 2026-09-15 (redeploy needed) | create 202, replay 200, 409, deny 404 |
| Vercel Production | code (release `9c094688309d`) + `INSIGHTS_GENERATION_ENABLED=true` | ON since 2026-09-15 ~23:10Z (deployment `greenhouse-h2030d3bz`) | create 202 `EO-INS-000003` (post-rollback) |
| Cloud Run workers | — | do not read the flag; retained SHA with docs-only diff | watchdog ok |
| Gateway `mcp.efeonce.org` | 4 tools federated | revision `00053-dsk`, front door 200/200/401 | provider canary ✓ |
| Entra "Efeonce MCP Resource" | scope `efeonce.mcp.insights.write` | exists, granted to nobody | readback 7 scopes |
| Org sandbox `Greenhouse Demo` (`org-6c09b3a7…`) | `insights_v1` assignment | active (`cpma-805e1a0c…`) | only org with the module |

**Synthetic editions alive:** `EO-INS-000002` (staging), `EO-INS-000003` (production). All created for the sandbox
org; earlier `000012..15` were deleted by the rollback rehearsal on purpose.

**Deliberately not built:** outputs (PDF/deck/web), issuing (flag OFF + port `not_ready`), AI authoring ON, portal
UI, client grants of the write scope, real-client integration (Berel/Sky — deferred to EPIC-046 P01).

**Hand-off to TASK-1846:** connect `InsightOutputsPort` (`setInsightOutputsPort`) so `issue` can pass; dedupe
`plan.limits` (repeats "ico: sin datos." per rejection); any worker reading `INSIGHTS_*` must declare it in its
`deploy.sh`; `issuance` stays OFF until outputs are validated; keep Proposal untouched in the Artifact Worker.

## TASK-1846 — durable rendering (in-progress; live in staging, production pending)

**Delta 2026-09-16 (late) — rollout in staging, Cloud Run benchmark, actor audit.** Supersedes the "not deployed /
flag OFF / no Cloud Run measurement" statements below, which describe the earlier state.

- Code on `origin/develop` (session commits `45ae955b4…9407df2d6`, plus `d9da99df8` release-plane integration and
  `1875fdd32` client_user actor). Dispatcher `src/lib/efeonce-insights/render/dispatch.ts` invoked by `ops-worker`
  `/artifact-render/dispatch` (Cloud Scheduler `ops-artifact-render-dispatch`, every 2 min; Proposal wins the tick);
  domain-free launcher `src/lib/render-dispatch/job-runner.ts`; consumer `services/artifact-worker/consumers/insights.ts`.
- Gateway `efeonce-mcp` PR #14 merged (`da8295a`), v1.6.0, 51 tools, render writes on `efeonce.mcp.insights.write`.
  **NOT deployed**: gateway deploy goes after the Greenhouse release (render routes are not in production).
- Migration `20260916201127095_task-1846-insights-render-client-user-actor` (expand, applied): runs/events accept
  `client_user`; the human actor travels to run, enqueue event, retry and cancel (before: always `system`).

| Runtime | Component | State 2026-09-16 | Evidence |
| --- | --- | --- | --- |
| Vercel `staging` | enqueue + `INSIGHTS_RENDER_ENABLED` | ON | burst of 5 renders, retry, cancel, audience deny |
| Vercel Production | enqueue | OFF (variable absent) | — |
| Cloud Run Job `artifact-worker` | claim/render | ON (default `true` in `deploy.sh`); integrated in the production release control plane, first productive deploy on the next release; assets bucket fixed to `efeonce-group-greenhouse-private-assets-staging` (`bucket_name` stored per row) | 5/5 `completed` |
| Cloud Run `ops-worker` | dispatcher | ON since revision `ops-worker-00690-xhl` (default `true` in `deploy.sh`). Before that day it lacked the flag | logs 13:02Z `insightsQueued=0` with a queued output |
| Gateway `mcp.efeonce.org` | 4 render tools | merged, not deployed | — |

**Cloud Run staging benchmark (org sandbox `Greenhouse Demo`, persona `agent-client`):** 5 seo+ico `deck_pdf` queued
20:09:33–20:09:41Z; starts 20:12:51 / 20:14:49 / 20:16:46 / 20:18:45 / 20:20:51; all `completed` first attempt; render
6.3–7.3 s; PDF ~330 KB; queue age 3m18s → 11m10s ⇒ **1 output per 2-min tick** (one execution per tick, Job
`parallelism=1`): a burst of N outputs takes ≈ 2·N min. Execution start 3.9 s warm, 42 s first after deploy, 154 s
cold; task total 50–58 s. Real retry: a failed output with a pre-fix sealed manifest was relaunched by the dispatcher
(20:10 tick), failed honestly `render_error` (`sectionItems` slot validation), attempts 1→2 of 3, completed outputs
untouched. Real cancel: queued run → `cancel` 200 → run + output `cancelled`, 0 attempts; `retry` on cancelled →
200 without re-queue (terminal). Audience negative: `internal` edition by superadmin, `agent-client` render → 404,
GET → 404, 0 outputs. Live tests `pnpm test:live src/lib/efeonce-insights/render` 4/4.
Earlier LOCAL benchmark: 15 slides 4.44–4.72 s RSS 300–328 MB PDF 5.4 MB; 25 slides 7.07–7.42 s RSS 355–365 MB PDF
12.6 MB; burst 5×15 23.3 s. Not measured: A4 10/30 pages (TASK-1847), queue contention with Proposal active.

**Pending (not verified):** Greenhouse release → `vercel env add INSIGHTS_RENDER_ENABLED production` + redeploy →
gateway v1.6.0 deploy → production canary. `INSIGHTS_ISSUANCE_ENABLED` stays OFF. Orphans `running` without lease
need a human decision (signal `insights.render.orphaned_output`, steady 0).


**Built so far (local on `develop`, NOT pushed by this session, NOT deployed):**
- Migrations `20260916004647239` (runs/outputs/events) and `20260916012422819` (lease + fence on BOTH
  `insight_outputs` and `proposal_render_jobs`, additive/nullable). Applied to the shared instance and verified
  against `information_schema`. **Their `down` is destructive on production** (`greenhouse-pg-dev` serves prod).
- `src/lib/efeonce-insights/render/`: `contracts.ts` (states, failure taxonomy, transition matrix,
  `InsightRenderFenceLostError`), `store.ts` (claim with lease+fence, reclaim of expired leases, per-org
  concurrency quota, governed retry/cancel, run-state rollup incl. `partial_failed`), `plan-limits.ts` (dedupe
  at RENDER, not planner — frozen plans feed `issued_hash`).
- `services/artifact-worker/`: `consumer-contract.ts` + `consumers/{proposal,insights,index}.ts`. `main.ts` no
  longer knows Proposal; it dispatches through the registry. Proposal behaviour unchanged (11 contract tests green).
- Asset context `insight_output` (retention `commercial_engagement_report`, same class as `sample_sprint_report`
  — an edition is a REPORT, not a contract like `quote_pdf`). System-generated: not in `DraftUploadContext`.
- Reliability signal `insights.render.orphaned_output` (steady 0) wired into the overview under module `insights`.
- Flag `INSIGHTS_RENDER_ENABLED` — **runtime: artifact-worker Cloud Run Job ONLY, verified by grep; NOT Vercel**.
  Declared in `deploy.sh` (default `false`) and guarded by `deploy-contract.test.ts`. Ledger rows in all three sections.

**Verified:** 3 live tests against real PostgreSQL — stale lease reclaim + fencing rejects the late finalization
without writing (THE acceptance criterion), retry re-queues only failed without duplicating, cancel does not lie
about what is already running, and the signal's SQL executes. 731 unit tests green; `local:check` 0 errors.
A peer ran the full suite (14164 passed) and a production `pnpm build` with these changes in the tree.

**Added 2026-09-16 (second pass, commit after `804b3295f`/`6d438905f`):** the engine is now plugged at both ends —
`requestInsightRender` (+ retry/cancel, run readers) queues outputs for a `ready_for_review` edition with the
manifest resolved by `resolvePlan(deckAxisCatalog, …)` and hashed with the composer's `hashResolvedManifest`
(moved verbatim, domain-free); the real `InsightOutputsPort` is wired when the commands barrel loads. Lanes app +
ecosystem (`…/editions/{id}/render`, `…/render-runs/{id}[/retry|/cancel]`), 4 MCP tools (manifest 55 tools:
`request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render`), events
`insights.render.*`, errors `render_disabled`/`render_rejected`, catalog `renderableOutputs: ['deck_pdf']`.
Mapper V1 `render/deck-mapper.ts` (plan → deck-axis slides; no CoverFull; never truncates figures/claims).
`INSIGHTS_RENDER_ENABLED` is now read in TWO runtimes (Vercel + artifact-worker).

**Deliberately NOT done (needs operator authorization):** worker deploy, flag flip (both runtimes), staging or
production canary, gateway federation of the 4 tools in `efeonce-mcp`, and any `git push`. Status:
`code complete, rollout pendiente`. Slice 4 ran a bounded LOCAL benchmark (see task file); no Cloud Run measurement.

**Hand-off pending for 1847/1848:** `report_pdf`/`web` are rejected at request time (`render_rejected`) until
their catalogs/model exist; the asset id returned by the run is not a download — authorized download/share is
TASK-1848. The `MetricsSplit` `unit` slot has a pre-existing visual defect (glued/wrapped) visible in delivered
tender decks: separate issue for the catalog owner.

## TASK-1847 — charts and catalogs (to-do)
_Fill at closure._

## TASK-1848 — sharing, delivery, schedules (to-do)
_Fill at closure: web-model resolver/proxy for Think, tokens, email path, schedules._

## TASK-1849 — portal library/builder/shared web (to-do)
_Fill at closure._

## TASK-1875 — Think shared web render (to-do)
_Fill at closure: Astro route, token handling, `no-store`, GVC evidence._

## Sessions (append as you go; newest first)

- **2026-09-16 · TASK-1846 staging rollout + Cloud Run benchmark.** Flag ON in Vercel staging, Job and ops-worker;
  found the ops-worker lacked the flag (hidden by a hand-launched canary); client_user actor migration; burst of 5,
  real retry, real cancel, audience deny; gateway v1.6.0 merged (not deployed). Production still pending.

- **2026-09-16 · greenhouse-eo-0d · TASK-1846 Slices 1-3 implemented (no rollout).** Commits `657591d6c`,
  `a35fc708e`, `b4aa8f03e`, `50f17e4d4`, `804b3295f`, `6d438905f`. Key decision recorded in the task: lease and
  fencing are ONE shared, additive mechanism with Proposal's reclaim left OFF — "keep Proposal untouched" is
  honoured as behaviour, not as file ownership. The hazard the acceptance describes is introduced BY this task,
  so the two can never ship in different slices. Three repo guardrails caught real mistakes (domain write-target
  allowlist, exhaustive asset-context Records, and a silent `replace` no-op that typecheck exposed) — all in
  `lessons.md`.

- **2026-09-16 · greenhouse-eo-0d · TASK-1846 discovery + design decision (no code yet).** Audited the render engine
  against the real runtime: six Proposal seams in `services/artifact-worker/main.ts` (all replaceable by a typed
  consumer registry, none of them business logic), and the missing lease/fencing described in `lessons.md`. Decision
  recorded in the task: the lease/fencing mechanism is SHARED and additive, with Proposal's reclaim behind a flag
  left OFF — "keep Proposal untouched" is honoured as behaviour, not as file ownership, which is what the task's own
  `Files owned` ("adapter compatible") already authorises. `plan.limits` dedupe resolved to the RENDERER, not the
  planner: plans are frozen and feed `issued_hash`, so a planner fix neither cleans frozen plans nor leaves the hash
  stable. Inherited deploy trap confirmed: `deploy.sh` uses destructive `--set-env-vars` and `deploy-contract.test.ts:53`
  already guards `ARTIFACT_RENDER_JOBS_ENABLED`; `INSIGHTS_RENDER_ENABLED` must be added to BOTH.
  Also halted a peer's rollback rehearsal on a misreading of "real editions in production" — the rehearsal was safe;
  the wording was not. Both outcomes are now rules.

- 2026-09-15/16 · Claude (greenhouse-eo-96) · TASK-1845 build, staging canary, gateway federation, Entra scope,
  production release, flag flip, doc sweep (5 agents), rollback rehearsal, closure. Codex executed the mutations
  the permission classifier blocked until the operator added allow rules.
- 2026-09-16 · Claude (greenhouse-eo-0d) · TASK-1846 discovery started; verified the rollback aftermath against the DB.
