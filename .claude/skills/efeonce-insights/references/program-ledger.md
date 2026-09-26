# Efeonce Insights — program ledger (EPIC-045)

The single place where a session learns **what exists, where it runs and what the next task inherits**.
One section per task. Update yours at closure (Skill Maintenance Contract); append to "Sessions" as you go.

| Task | Scope | Lifecycle | Live where | Closed on |
| --- | --- | --- | --- | --- |
| TASK-1845 | Domain, evidence, adapters, lanes, MCP, gateway federation | **complete** | Cloud SQL (single instance), Vercel staging + Production (generation ON), gateway v1.5.0, Entra scope | 2026-09-16 |
| TASK-1846 | Durable rendering + Artifact Worker (RenderRun / InsightOutput), outputs port | **complete** | Cloud SQL (migrations applied), Vercel staging + Production (render ON), Cloud Run Job `artifact-worker` (first productive deploy in release `917491fd02e4`) + `ops-worker` dispatcher (flag ON, shared by staging/prod), gateway v1.6.0 deployed | 2026-09-16 |
| TASK-1847 | Analytical charts and editorial catalogs (deck / A4) | **complete** (in production since 2026-09-24, release `ebb9212a32ce`; first productive A4 + deck render 2026-09-25) | Job `artifact-worker` in staging and production: `report_pdf` on `insights-report`, `deck_pdf` on `insights-deck` (cutover 2026-09-22 staging, 2026-09-24 production) | 2026-09-25 |
| TASK-1848 | Sharing, delivery (email), schedules; web-model resolver/proxy for Think | **in-progress — in production with flags OFF** | Cloud SQL (4 migrations applied); release `bda1cf2cd938` (2026-09-18, Vercel + 6 Cloud Run); staging flags ON (sharing/delivery/schedules/issuance), production OFF until TASK-1875; gateway `efeonce-mcp` 1.7.0 (rev `00055-gk6`, 58 tools); open: in-app/Teams channels, portal route (1849), ISSUE-174 → TASK-1876 | 2026-09-18 |
| TASK-1849 | Library, builder and shared-web experience in the portal | to-do (blocked by 1847/1848) | — | — |
| TASK-1875 | Shared web report rendered in `efeonce-think` from `InsightWebModelV1` | to-do (blocked by 1848) | — | — |
| TASK-1888 | Editorial contract v2: `ChartSpec` 7 → 15 families, per-figure reading and hero figure in the plan, `channelId`, per-org cover preference + sealed cover, flag `INSIGHTS_EDITORIAL_V2_ENABLED` | **complete 2026-09-26** — in production | releases `0e87c7a443a2` + `f9257b9c94af`; gateway efeonce-mcp v1.9.0 (rev `00062-ct5`); flag ON in Vercel staging (`greenhouse-9t9fwhrvz`), Vercel Production (`greenhouse-8hl5hf54w`) and ops-worker (`00719-gbm`) | staging internal editions Berel `insed-56226fa1…` / Sky `insed-1e003760…` with sealed v2 plan; Production synthetic canary `insed-f5768172…` sealed 3 scope lines + cover (first canary `insed-356e948c…` sealed v1 before the env value fix) |
| TASK-1889 | Premium catalogs from the approved canvas (A4 + deck), canvas-fidelity gate, internal Berel/Sky editions, release together with the 1888 flag | **complete 2026-09-26** — in production | releases `0e87c7a443a2` + `f9257b9c94af` (Job `artifact-worker` deployed); first internal editions rendered in Production with the new design on 2026-09-26 — Berel `insed-7d470d9f…` (run `irun-dcd1fbed…`: A4 16 pages + deck 15 slides) and Sky `insed-9370d0cc…` (run `irun-e5882459…`: A4 12 + deck 10), all four PDFs on the first attempt | local real editions Berel `EO-INS-000019` (16 pp / 13 slides) and Sky `EO-INS-000022` (12 / 9); fidelity 20/21 + 1 approved exception; visual gate 27 frames at 0 px |

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

## TASK-1846 — durable rendering (complete 2026-09-16; live in staging and production)

**Delta 2026-09-16 (production) — supersedes every "production pending / not deployed / Production OFF" below.**

- Release develop→main PR #237 squash `917491fd02e4e2dac5ec1668192de59bdd6b20dd`, orchestrator run `35154555317`,
  manifest `917491fd02e4-9231b87b-20da-43c3-abce-4348dccdda99` `released` 22:02:41Z in one attempt (planned
  break-glass: Insights migrations already applied; `cloud_release`). First productive deploy of the Cloud Run Job
  `artifact-worker` via `deploy-artifact-worker`, change-gated (serves `f6551157e`; tree differs from the target only in
  `Handoff.md`/`project_context.md`). Watchdog `ok` 6/6 synced.
- `INSIGHTS_RENDER_ENABLED=true` in Vercel Production (read back with `vercel env pull`) + redeploy
  `greenhouse-d6l33zils` aliased to `greenhouse.efeoncepro.com`. Job and ops-worker already ON ⇒ ON in the three reader
  runtimes, staging and production. `pnpm flags:audit --strict`: 0 flags ON without code on main, 0 with a different reader.
- Gateway `efeonce-mcp` v1.6.0 deployed: run `35156353046`, revision `efeonce-mcp-gateway-00054-n78` 100 %, `/health` ok, 51 tools.
- Production canary (ecosystem lane, gateway consumer token, sandbox org `Greenhouse Demo`): create `202`
  (`insed-83c23534…`) → `POST …/render` `202` (run `irun-e275767b-a6a8-4587-9579-d9bbba713181`, `requestedByKind: member`)
  → ops-worker dispatcher launched the Job on its own (ticks 22:12 and 22:14) → `deck_pdf` `completed` first attempt,
  render 22:14:46→22:14:52Z, asset `asset-acf726a0-3c02-4172-b0cd-1141468a8a97`; `web` → `422 render_rejected`.
  Provider canary in `efeonce-mcp` (`scripts/greenhouse-insights-canary.mjs --render-run`): catalog (renderable=1), list,
  render run `completed`, deny `404`.
- Known behaviour: cold Job start (~2 min) ⇒ two executions for one output; one finalized, the other found no work.
- Still OFF / elsewhere: `INSIGHTS_ISSUANCE_ENABLED` (product step); `report_pdf` → TASK-1847; `web` → TASK-1848.


**Delta 2026-09-16 (late) — rollout in staging, Cloud Run benchmark, actor audit.** Supersedes the "not deployed /
flag OFF / no Cloud Run measurement" statements below, which describe the earlier state.

- Code on `origin/develop` (session commits `45ae955b4…9407df2d6`, plus `d9da99df8` release-plane integration and
  `1875fdd32` client_user actor). Dispatcher `src/lib/efeonce-insights/render/dispatch.ts` invoked by `ops-worker`
  `/artifact-render/dispatch` (Cloud Scheduler `ops-artifact-render-dispatch`, every 2 min; Proposal wins the tick);
  domain-free launcher `src/lib/render-dispatch/job-runner.ts`; consumer `services/artifact-worker/consumers/insights.ts`.
- Gateway `efeonce-mcp` PR #14 merged (`da8295a`), v1.6.0, 51 tools, render writes on `efeonce.mcp.insights.write`.
  ~~NOT deployed~~ → **deployed 2026-09-16** after release `917491fd02e4` (revision `efeonce-mcp-gateway-00054-n78`, provider canary green).
- Migration `20260916201127095_task-1846-insights-render-client-user-actor` (expand, applied): runs/events accept
  `client_user`; the human actor travels to run, enqueue event, retry and cancel (before: always `system`).

| Runtime | Component | State 2026-09-16 | Evidence |
| --- | --- | --- | --- |
| Vercel `staging` | enqueue + `INSIGHTS_RENDER_ENABLED` | ON | burst of 5 renders, retry, cancel, audience deny |
| Vercel Production | enqueue | ON since 2026-09-16 (post-release) | production canary `deck_pdf` completed |
| Cloud Run Job `artifact-worker` | claim/render | ON (default `true` in `deploy.sh`); integrated in the production release control plane, first productive deploy in release `917491fd02e4` (2026-09-16); assets bucket fixed to `efeonce-group-greenhouse-private-assets-staging` (`bucket_name` stored per row) | 5/5 `completed` |
| Cloud Run `ops-worker` | dispatcher | ON since revision `ops-worker-00690-xhl` (default `true` in `deploy.sh`). Before that day it lacked the flag | logs 13:02Z `insightsQueued=0` with a queued output |
| Gateway `mcp.efeonce.org` | 4 render tools | deployed 2026-09-16 (revision `00054-n78`) | provider canary `--render-run` green |

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

**Pending at the time (done — see production delta above):** Greenhouse release → `vercel env add INSIGHTS_RENDER_ENABLED production` + redeploy →
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
`INSIGHTS_RENDER_ENABLED` is now read in TWO runtimes (Vercel + artifact-worker) — superseded: THREE, the `ops-worker` dispatcher too (found in staging, fixed `d9da99df8`).

**Deliberately NOT done (needs operator authorization):** worker deploy, flag flip (both runtimes), staging or
production canary, gateway federation of the 4 tools in `efeonce-mcp`, and any `git push`. Status:
`code complete, rollout pendiente`. Slice 4 ran a bounded LOCAL benchmark (see task file); no Cloud Run measurement.

**Hand-off for 1847/1848:** staging and production (since 2026-09-24, release `ebb9212a32ce`) have the
`report_pdf` and `deck_pdf` catalogs. `web` remains outside the renderable output set until its model/runtime owner ships it. The asset
id returned by a run is not a download — authorized download/share is TASK-1848. The `MetricsSplit` `unit` slot has a
pre-existing visual defect (glued/wrapped) visible in delivered tender decks: separate issue for the catalog owner.

## TASK-1847 — charts and catalogs (complete 2026-09-25)

**Cierre (2026-09-25):** primer render productivo de los dos catálogos con datos reales — edición interna de Sky
Airlines `EO-INS-000022` (ICO, agosto vs julio 2026), run `irun-166f4ed0-f3b9-4d31-8837-26035ec46db5`: `deck_pdf`
5 láminas (`insights-deck`) y `report_pdf` 8 páginas A4 (`insights-report`), primer intento, cifras = BigQuery.
Gate de cierre: `pnpm test` completo (1821 archivos, 15 303 tests) y `pnpm build` verdes sobre `e22ccf17e` (antes `35f208553`). La
edición queda interna y sin emitir. **Hand-off:** el rediseño premium aprobado por el operador vive en TASK-1888
(contrato v2: 15 familias, lectura por figura, `channelId`, portada sellada) y TASK-1889 (catálogos premium +
verificación Berel/Sky + release); el gap «13 de 15 familias sin productor» pasa a TASK-1888.

**Estado (2026-09-22): desplegado en staging, sin release a producción.** Canary con datos reales
(Berel SEO+AEO `EO-INS-000019`, Sky ICO `EO-INS-000020`, audiencia interna, sin emitir) y módulo `insights_v1`
asignado a ambas orgs. El canary encontró y cerró: validador de cifras con falsos positivos (fecha partida, cifras de
la etiqueta), OTD que nunca llegó (`otd` vs `otd_pct`), ids internos en límites/metodología, dimensiones AEO en inglés,
figuras del A4 (formato propio, nombres, recortes, barra destacada invisible), rótulo de período y el deck productivo
sobre `deck-axis`, reemplazado por `insights-deck` (`insights-deck-mapper.ts`). Vista previa local sobre datos reales:
Berel A4 15 págs / deck 13 láminas, Sky A4 7 / deck 5, 0 violaciones. **Runtime de staging verificado**: Berel v2
(`EO-INS-000019 v2`) y Sky v2 (`EO-INS-000020 v2`, con OTD) renderizaron deck + A4 al primer intento. Rechazos con
`scope` (`b6e32a09e`). El 2026-09-24 se compusieron localmente PDFs de prueba de 30 páginas A4 y 25 láminas, con
line/pie/donut/scatter en ambos catálogos; el scatter vacío ahora conserva su path SVG. Falta promover el baseline
visual, inspeccionar el PDF multipágina completo y liberar a producción.

**Módulos compartidos nuevos:** `artifact-composer/bar-figure.ts` (guarda barra↔etiqueta con tolerancia de redondeo,
escala por `scaleGroup`, tono `tone-*`), `render/figure-pages.ts`, `render/composition-helpers.ts`, `render/labels.ts`.

**Lo que existe:**
- ADR `GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md` (`Accepted`, indexado): el motor no pagina pero
  ya sabe medir. `measureSlideFit()` expone la medición que `assertSlideFitsCanvas` hacía; `paginateFlow()` es
  PURO (recibe alturas, no toca el navegador) y vive domain-free en el composer, no dentro del catálogo.
- Dirección visual sellada: ficha de evidencia (deck) + cuaderno analítico (A4); tablero impreso rechazado.
- `chart-geometry.ts`: **15 familias** con geometría probada — bar/grouped/stacked, line, pie/donut (techo 3),
  scatter, bullet, funnel, waterfall, gauge, heatmap, waffle, Venn-2 (áreas proporcionales reales, por bisección)
  y UpSet. Sankey y Venn-3 deliberadamente fuera (ver `lessons.md`).
- `compile-catalog-tokens.ts`: la marca se compila UNA vez y se materializa por catálogo. `deck-axis` recompila
  byte-idéntico.
- Catálogo `insights-report` (A4 794×1123): registry, resolvers, tokens, fuentes, assets y la plantilla
  `ReportAnalysisPage`, que **renderiza** a PDF/PNG.

**Cerrado después (mismo día):** las plantillas A4 (5 con molde compartido), el catálogo `insights-deck` (16:9, 4
composiciones), `src/lib/copy/insights.ts` como SSOT del copy, el `report-mapper` con figuras/tablas paginadas/límites,
y `report_pdf` admitido en sus 4 puntos (contrato, command por output, mapper, worker). Triple documentación
actualizada: arquitectura §14.7, funcional v1.7 y manual.

**Superado el 2026-09-22 (ver Estado arriba):** el rollout a staging, el canary y el cutover de `deck_pdf`.
El índice A4 y las cuatro familias de gráfico se verificaron localmente el 2026-09-24; la disponibilidad productiva
no se infiere del staging ni del render local.

**Gap heredado que esta task NO cierra:** el planner determinista emite **2 de 15** familias (`bar`,
`bar_grouped`). Las otras 13 tienen geometría probada con fixtures y **ningún productor**. Ampliar el planner es
trabajo nuevo del dominio Insights — TASK-1845 lo entregó y ya está cerrada, así que no se le "devuelve" nada; los
Follow-ups de TASK-1847 dicen que los gráficos adicionales se evalúan por demanda y **no se abren tasks
preventivas**. Queda acá como gap conocido, no como deuda silenciosa.

**Drift de documentación corregido en la spec:** `SeoReportPrint.tsx` NO es precedente de A4 paginado (trunca y no
tiene pipeline PDF); la dedupe de `plan.limits` ya la entregó TASK-1846; los umbrales de calidad declarados
(4,2/3) eran inoperantes frente a los que el gate tiene fijos (4,5/4).

## TASK-1848 — sharing, delivery, schedules (in-progress; in production with flags OFF since 2026-09-18)

**Delta 2026-09-18 (production) — supersedes the staging delta's "production and gateway out of frontier" and the
"Deployed where" table below.** Release `bda1cf2cd938` (PR #238, orchestrator `35349506106`, `released` 13:41Z, no retry;
Vercel + 6 Cloud Run workers). Production flags OFF (sharing/delivery/schedules; issuance OFF) until the Think reader
(TASK-1875) exists. Sequential contract canary: create share ⇒ 503 `sharing_disabled`; public reader unknown token ⇒ 404,
no token ⇒ 401. Gateway `efeonce-mcp` 1.7.0 (PR #16 `4c9d7c44`, deploy run `35351850324`, revision
`efeonce-mcp-gateway-00055-gk6` 100 %, 51 → 58 tools, provider contract `task-1848-v1`); provider canary against production
green (schedules 1, shares 3, deliveries 3). The operator confirmed both canary emails reached the inbox (human evidence;
Resend reports no `delivered`, ISSUE-160). Still open: in-app/Teams channels (TASK-690–693/1849), portal route
(`portal_link` `not_ready`, TASK-1849), Think render (TASK-1875, now unblocked), ISSUE-174 → TASK-1876.

**Delta 2026-09-18 (staging) — supersedes "NOT pushed / NOT deployed" below.** Pushed `52562a2f9` to `develop` (CI + all
worker deploys green). Vercel staging: `INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED=true` and `INSIGHTS_ISSUANCE_ENABLED=true`
(staging only, operator-authorized) + redeploy `greenhouse-bki7l2rl9`. `ops-worker-00695-hrw` carries DELIVERY/SCHEDULES/
GENERATION/RENDER=true; Cloud Scheduler `ops-insights-schedules-tick` ENABLED. Synthetic canary (sandbox org, edition
`EO-INS-000015`): render by dispatcher → issue → share create/read/download (PDF 330 KB) with real headers → revoke A 410 while
B 200 → per-grant rate limit 60×200 + 4×429 → negatives → schedule create/activate/tick `{schedules:1,paused:0}`/pause/retire →
delivery with EmailType off ⇒ `skipped` → real email to the operator's authorized inbox (share_link + attachment `accepted`,
subject redacted, no bearer stored) → withdraw ⇒ live grants revoked `edition_withdrawn`. EmailTypes turned back OFF.
Finding: a 64-request concurrent burst nearly exhausted shared PG connections for 5 min ⇒ ISSUE-174 → TASK-1876.
Production and gateway federation (`efeonce-mcp`) remain out of this session's frontier.


**Built (local `develop`, NOT pushed, NOT deployed):** commits `75715589d` (Slice 1 — ShareGrant + public reader +
`InsightWebModelV1`), `83d57380a` (Slice 2 — durable email delivery), `1c109fc8e` (Slice 3 — governed schedules,
draft + render only).

- Slice 1: `insight_share_grants` (only the sha256 digest of the bearer is stored), append-only access events, per-minute
  rate buckets; commands create/revoke/read under `src/lib/efeonce-insights/sharing/`; public reader
  `GET /api/public/insights/shared/[token]` (+ `/outputs/[output]` download proxy); `InsightWebModelV1` +
  `InsightSharedEditionResponseV1`; Sentry scrub of share paths/tokens (server + edge); `withdrawInsightEdition` now
  revokes live grants and cancels pending deliveries in the same transaction; capability `insights.share.manage`.
- Slice 2: delivery intents/recipients/events; two EmailTypes (`insights_edition_delivery` token-sensitive,
  `insights_edition_delivery_attachment` standard) seeded `enabled=false`; projection `insights_delivery_dispatch`
  (ops-worker, lane ops-reactive-notifications); reconcile/retry/cancel; signal `insights.delivery.ambiguous`;
  capability `insights.delivery.send` (internal only).
- Slice 3: `insight_schedules` + `insight_schedule_occurrences`; `runInsightSchedulesTick` on ops-worker
  `POST /insights/schedules/tick` (Cloud Scheduler `ops-insights-schedules-tick`, `20 * * * *`); capability
  `insights.schedule.manage`; retention purge (access events >180 d, rate buckets >1 d).
- MCP: 7 new tools (manifest 62 tools, was 55; hash `9fc46c8d90d3`): `create_insight_share`, `list_insight_shares`,
  `revoke_insight_share`, `list_insight_deliveries`, `get_insight_delivery`, `list_insight_schedules`,
  `get_insight_schedule`.

**Migrations (all applied on the single Cloud SQL instance, verified by readback):**
`20260918094614053_task-1848-insights-share-grants`, `20260918100238745_task-1848-insights-delivery-intents`,
`20260918100811735_…-skip-reason-edition`, `20260918101834425_task-1848-insights-schedules`.

**Deployed where (2026-09-18, pre-push snapshot — superseded by the deltas above):**

| Runtime | Component | State | Evidence |
| --- | --- | --- | --- |
| Cloud SQL `greenhouse-pg-dev` (single instance dev/staging/prod) | 4 migrations + seeds (capabilities, `email_type_config` rows `enabled=false`) | applied | readback; live tests `sharing/delivery/schedules.live.test.ts` 3/3 (rolled-back transaction) |
| Vercel staging / Production | lanes, public reader, commands | NOT deployed (code not pushed) | — |
| Cloud Run `ops-worker` | delivery dispatch projection + schedules tick | NOT deployed | — |
| Cloud Scheduler | `ops-insights-schedules-tick` | NOT created | — |
| Gateway `efeonce-mcp` | 7 new tools | NOT federated (out of session scope) | — |

**Flags and runtimes:** `INSIGHTS_SHARING_ENABLED` (Vercel, default OFF); `INSIGHTS_DELIVERY_ENABLED` (Vercel for
intent creation, OFF ⇒ 503 `delivery_disabled`; ops-worker for dispatch, default `true` in `deploy.sh`, guarded by
`deploy-contract.test.ts`); `INSIGHTS_SCHEDULES_ENABLED` (Vercel OFF; ops-worker default `true`);
`INSIGHTS_GENERATION_ENABLED` is now ALSO read by the ops-worker (default `true` in `deploy.sh`);
`INSIGHTS_AUTHORING_AI_ENABLED` is NOT declared in the worker. Extra kill switch per EmailType in `email_type_config`.

**Verified:** focal unit suites green (last sweep 1147 tests across efeonce-insights / mcp / entitlements / reliability /
api-platform / ops-worker; plus email/emails/sync/observability for Slice 2); live 3/3; `pnpm worker:runtime-deps-gate`
OK; `pnpm mcp:manifest:check` up to date.

**Deliberately NOT done:** in-app (`NotificationService`, `report_ready`) and Teams notices (dispatch cannot restrict
channels ⇒ double email; Teams resolver only resolves members — owners TASK-690–693 and TASK-1849); `portal_link`
modality (rejected `not_ready` until the portal edition route exists, `INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE = false`);
auto-issue / auto-send from schedules (CHECK `review_policy = 'draft_for_review'`); gateway federation of the 7 tools;
full `pnpm test` + `pnpm build`; push; deploy; staging flags; staging canary.

**Hand-off:**
- **TASK-1875 (Think):** consume `GET /api/public/insights/shared/[token]` and `GET …/[token]/outputs/[output]`
  server-side; response `InsightSharedEditionResponseV1 {modelVersion, header, model: InsightWebModelV1, downloads,
  expiresAt}`; honour 404/410/429/503 and `no-store`; the token never reaches client JS, logs or analytics.
  Default public base URL `https://think.efeoncepro.com/insights/r/<token>` (override `INSIGHTS_SHARE_PUBLIC_BASE_URL`).
- **TASK-1849 (portal):** the portal edition route + deep link `insights_edition` (then flip
  `INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE` and enable `portal_link`), final presentation of
  `src/emails/InsightsEditionDeliveryEmail.tsx`, the in-app notice, and the UI for share/delivery/schedules.

## TASK-1849 — portal library/builder/shared web (to-do)
_Fill at closure._

## TASK-1875 — Think shared web render (to-do)
_Fill at closure: Astro route, token handling, `no-store`, GVC evidence._

**Sesión 2026-09-24 — índice A4, familias de gráfico y auditoría de release.** El mapper compone un índice A4 con
folios físicos; los tests locales cargan PDFs reales de 30 páginas y 25 láminas y ejercitan line/pie/donut/scatter en
ambos catálogos. `pnpm typecheck`, 349 tests dirigidos, foto (510/510) y `composer:brand-pack --check` pasan. El
  `composer:visual-gate --selftest` da 71 frames deterministas. `--freeze` no escribió baseline: además de los diez
  frames Insights declarados, el guard rechazó veinte frames `deck-axis` no declarados; sus plantillas están limpias
  en Git y se preservaron. El preflight del SHA remoto d8afbf50 falla por 12 tests de referencias de
vestuario, ausencia de Playwright smoke, `split_batch` (3.279 archivos) y autenticación de Postgres para
`greenhouse_ops`; migraciones 656/656, GCP WIF y Sentry pasan. El `develop` local está 60 commits y 1.063 archivos
por delante de `origin/develop`; no es un candidato acotado a esta task. No se dispatchó el orquestador.

## TASK-1888 — contrato editorial v2 (complete 2026-09-26 · en producción)

**Rollout 2026-09-26 (dónde corre).** Release `0e87c7a443a2` (código, flag OFF) → gateway efeonce-mcp#18 mergeado
`2cf78af91` y desplegado v1.9.0 (run `36226550358`, revisión `00062-ct5`, 100 %) → flag ON en Vercel staging
(`greenhouse-9t9fwhrvz`) verificado con ediciones internas v2 de Berel (`insed-56226fa1-0c2b-451d-88cf-158390c4073a`)
y Sky (`insed-1e003760-b622-47e1-b5ac-5ec7a2cad396`) → hallazgo en staging (empate: cifra principal «39» con «Dimensiones
evaluadas.») corregido en `baf0f908b` → Codex (con autorización del operador; el clasificador de esta sesión bloqueó
redeploy de producción y flag del worker): release `2add63c61fd6` **abortado** (ops-worker sin `DATAFORSEO_API_LOGIN`,
rollback verificado), fix de secretos del release (#242) y release `f9257b9c94af` `released` (run `36236940651`).
Estado verificado por esta sesión: la primera canary sobre `greenhouse-29b4yzhmf` Ready encontró el env Production
con salto de línea (`true\n`); como `isOn` compara exactamente con `true`, el flag quedó OFF. Se actualizó a `true`
(4 caracteres) y se redeplegó `greenhouse-8hl5hf54w` (`dpl_5sJdifoXZiXhQXfRSmW4zXFtQgGf`, Ready, alias
`greenhouse.efeoncepro.com`, SHA `f9257b9c94af`). `ops-worker-00718-c4b` Ready/100 % con
`INSIGHTS_EDITORIAL_V2_ENABLED=true` en la revisión activa `ops-worker-00719-gbm` (Ready/100 %, SHA
`3a7d09cb0dae46ad02365dce6cfc73554aac11ca`); el fix del empate (`baf0f908b`) está en `origin/main` (comparado por contenido);
issuance/sharing/delivery siguen OFF en Vercel Production. **Canary sintética Production por lane ecosystem
(2026-09-26):** la primera edición `insed-356e948c-02a2-4e53-b449-521d9757a6ce` POST 202 / GET 200 selló plan v1.
Tras la corrección, `insed-f5768172-5ef3-4105-97b6-b8b0d3135589` POST 202 / GET 200 selló un plan congelado con
3 `scopeLines` y `cover` (`frozenAt` y `planHash` presentes). Su snapshot tuvo 0 facts y 9 rejections (SEO 3, AEO 2,
ICO 4), por lo que terminó `failed` en `validating`/`evidence_rejected`; no había datos para readings/essentials.
Replay con `Idempotency-Key` HTTP devolvió 202 cacheado; replay de dominio con la clave del body y sin ese header
devolvió 200 `idempotent:true`, `generation:null`. No se emitió, compartió ni solicitó render.

**Qué construyó** (commits en `develop` local, sin push, 2026-09-25): Slice 1 `ChartSpec` 15 familias + `channels.ts`
+ matriz; Slice 2 plan v2 + pp; Slices 3–4 productores (bullet ICO, línea mensual, lectura por figura, esenciales,
alcance) + FTR/metas ICO como hechos de referencia + `channelId` en AEO/SEO; Slice 5a migración
`20260925183531322_task-1888-insights-cover-preference` (aplicada en la instancia compartida y verificada); Slice 5b
preferencia de portada (command/reader/evento/capability/lanes/MCP) + variante de logo oscuro en account-360 +
portada sellada; Slice 6a flag en `ops-worker` y ledger; fix pp < 0,05 y `preview-edition.ts --editorial-v2 --plan-only`.
Detalle en arquitectura §14.8 y en `contracts.md` § Editorial contract v2.

**Dónde corre (runtime × componente × estado × evidencia):**

| Runtime | Componente | Estado | Evidencia |
|---|---|---|---|
| Cloud SQL compartida | `insight_cover_preferences`, `organizations.logo_on_dark_asset_id`, capability | aplicado | `information_schema` + `capabilities_registry` 2026-09-25 |
| Vercel staging | contrato v2, lanes, commands; flag ON | desplegado | redeploy `greenhouse-9t9fwhrvz`; ediciones internas Berel/Sky `ready_for_review` |
| Vercel Production | contrato v2, lanes, commands; flag ON (`true` exacto) | desplegado | releases `0e87c7a443a2` + `f9257b9c94af`; deployment `greenhouse-8hl5hf54w`; canary sintética `insed-f5768172…` |
| `ops-worker` | lectura del flag (`deploy.sh` `:-true`) | ON | revisión `ops-worker-00719-gbm` al 100 %; `deploy-contract.test.ts` |
| Gateway `efeonce-mcp` | 2 tools federadas (v1.9.0) | desplegado | PR #18 mergeado `2cf78af91`, run `36226550358`, revisión `00062-ct5` al 100 % |
| Local | plan v2 sobre datos reales | verde | Sky 9 hechos/0 violaciones; Berel 24 hechos/0 violaciones |

**Decisiones de Discovery:** plan y spec conservan su versión (campos opcionales); la meta ICO es un hecho `reference`
del registro (no literal) y el registro manda aunque glosario y contrato ICO digan otra cosa; medidor, dona y el resto
quedan `sin evidencia` (el adapter AEO sólo lee el último run); `decision`/`measurement`/`ask` sin productor
determinista; la variante oscura es una columna gemela escrita sólo por el command de account-360; la preferencia se
guarda con el flag OFF; el flag en el `ops-worker` nace `false` porque es compartido con producción.

**Hand-off:** a TASK-1889, plan v2 (familias `bar`/`bar_grouped` con `dimensionChannelIds`, `bullet` con `targetFactId`
y `direction`, `line` ≤ 3 series), `readings` (keyFigure, meaning, nextStep sólo con brecha), `opening`, `essentials`,
`scopeLines` y `cover` sellada; el release de 1889 prende el flag en Vercel y `ops-worker`. A TASK-1849, la
preferencia (command/reader) y `brand.coverTheme` del encargo, sin lógica propia. A TASK-1875, los campos como
opcionales de `InsightWebModelV1`.

**Pendiente para cerrar:** release de Greenhouse con el flag OFF; ediciones internas de Berel y Sky en staging con el
flag ON sólo en Vercel staging; merge y deploy de efeonce-mcp#18 después de ese release; el operador fija la
preferencia de Berel y Sky y carga logos oscuros si los hay.

## TASK-1889 — catálogos premium (complete 2026-09-26, en producción)

**Qué es:** llevar a `insights-report` (A4) e `insights-deck` (16:9) el diseño aprobado, verificarlo con ediciones
internas reales y liberarlo. `ui-ux`, `UI impact: layout`, asignación Claude. Detalle: arquitectura §14.9 y registro de
implementación §8.z.

**Qué construyó (en `develop`; en producción desde los releases de 2026-09-26, ver «Dónde corre»).** Commits `61d1ef690` (antes `d357e0224`), `4a4c77748` (antes `b649080c7`) (Slices 1–2), `5c2bcb5a1` (antes `4ff72fe3a`) + `8075a2930` (antes `2410e5156`)
(Slice 3), `f0b0d78cc` (antes `3fa493efe`), `30c11aba7` (antes `85785e7fc`) (Slice 4), `29a54885e` (antes `1120e86e4`)/`3709d9424` (antes `5968e35e8`) (docs), `7ab466c88` (antes `289b6eca4`) (excepción aprobada),
`ae2c34b59` (antes `738ceb748`) («Lo esencial»), `198ce883a` (antes `b88fd447c`) (fixes por ediciones reales), `2f0776e0f` (antes `9529a1b25`) (dossier + scorecard).

- Catálogos **sólo v2** (A4 794×1123, deck 1280×720); la guarda `insights-catalogs-v2-only.test.ts` no admite legado.
  Retirados `ReportAnalysisPage`, `InsightsEvidenceSlide`, `report-mold.css`, `deck-mold.css`, `render/figure-pages.ts`
  y los resolvers v1 de barra/familia/path. `artifact-composer/chart-figure.ts` quedó sin consumidores y se retiró el 2026-09-26.
- Cuatro páginas A4 y cuatro láminas de figura (`report-figure-*` / `insights-figure-*`: comparación, columnas, metas,
  tendencia) con la regla de familia de `render/figure-slots.ts`, compartida por ambos mappers.
- Portada blanca o navy según `plan.cover`, logo del cliente por `asset-ref:org-logo:<id>` leído en el worker con
  `readOrganizationLogoForRender`; el deck siempre navy.
- «Lo esencial» del plan v2 en `report-summary` / `insights-summary` con folio real.
- Motor compartido: `render.ts` espera `img.decode()`; `synthesize.ts` honra `example` del contrato.

**Dónde corre:** producción desde los releases `0e87c7a443a2` + `f9257b9c94af` (2026-09-26; el código de Insights en
`main` es idéntico al de `develop`, verificado por blobs porque los releases son squash). Primeras ediciones internas
renderizadas en producción el 2026-09-26: Berel `insed-7d470d9f-7119-4a84-b8af-c3fb584ceb92` (run `irun-dcd1fbed…`,
A4 16 + deck 15) y Sky `insed-9370d0cc-eb60-43c5-a547-70f10e011309` (run `irun-e5882459…`, A4 12 + deck 10), los
cuatro PDF al primer intento; tono de variaciones verificado en el PDF de producción. Emitir y compartir siguen OFF.
Después del cierre: `373e56485`/`5ee201c0c` (tono mejor/peor por dirección de la métrica) y `8f16401b3` (retiro de
`chart-figure.ts`).

**Verificación:** `pnpm insights:canvas-fidelity` 20/21 ≤ 1 % + `Deck-Agrupadas` 2,2 % con excepción aprobada por el
operador (techo 2,5 %); `pnpm composer:visual-gate --catalog=insights` 27 frames a 0 px (deltas g–k); `ui:quality`
PASS 4,59; ediciones reales locales Berel `EO-INS-000019` y Sky `EO-INS-000022`.

**Rollout (cumplido 2026-09-26; se conserva como historial):** push; staging con `INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888); release por el control plane
(Job `artifact-worker` único para staging y producción); aprobación del operador de piezas derivadas y PDFs reales;
edición interna en producción antes de compartir.

**Hand-off:** TASK-1849 y TASK-1875 mantienen en la web los mismos roles de color y la misma lectura; `chart-figure.ts` ya se retiró el
2026-09-26 (sin consumidores).

> Lo que sigue es el plan original de la task (2026-09-25); se conserva como historia de la decisión.

**Dirección aprobada (source-led):** `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`
— canvas «Gráficos de Efeonce Insights» (Artifact privado del operador, versión 36). Alternativas: v1 (en producción),
recolor de v1 (rechazado: «sólo les estás cambiando el color»), premium editorial (seleccionada). Wireframe:
`docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md`.

**Referencias durables** (`docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/`): hojas
`a4-estructura.png`, `a4-graficos.png`, `deck-graficos-y-prosa.png`, `a4-escala-de-grises.png`; `paginas/` con las 41
páginas aprobadas a tamaño nativo (A4 794×1123, lámina 1280×720); `fuente-canvas-2026-09-25.tar.gz` con los `.dc.html`
del canvas y `render-referencia.mjs`, que regenera `paginas/` (40 de 41 byte a byte; la restante 0,008 % por
antialiasing). Commit `07eb90170` (antes `568bfa669`).

**Contrato de fidelidad:** por plantilla, un fixture con los datos de ejemplo del canvas (nunca en producción), render a
tamaño nativo y `pixelmatch` (umbral 0,1) contra `paginas/<Board>.png`: **≤ 1 % de píxeles distintos por página**. Lo
que excede se corrige o se justifica en el dossier con la región y la aprobación del operador. Evidencia: tabla por
página + hoja lado a lado en `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/`. No entran en «igual» las
cifras reales, las familias sin productor ni portada/apertura/contraportada del deck (no diseñadas en el canvas).

**Decisiones del operador (2026-09-25):** una portada con variantes por módulo (no una por servicio); navy o blanca por
cliente, con cambio opcional en el encargo; las primeras ediciones reales son internas (Berel `seo`/`aeo`, Sky `ico`)
hasta que el operador las revise. Roles de color de dato:

| Rol | En papel | En navy |
| --- | --- | --- |
| actual | navy `#023c70` | teal `#36c8bf` |
| anterior / referencia | teal profundo `#1f9e94` | periwinkle `#8aa8d8` |
| oportunidad | coral `#d97757` | `#ff7063` |
| ausencia | rayado neutro, nunca un color | rayado neutro |

Los valores son tokens AXIS existentes (tabla de la dirección); en las plantillas entran como tokens semánticos del
brand pack, nunca como HEX.

**Alcance planificado:** Slice 1 tokens de rol + isotipos de canal por `channelId`, redes y contacto (contacto al SSOT
`src/config/efeonce-brand.ts`; `deck-axis` byte-idéntico) · Slice 2 páginas de estructura y prosa · Slice 3 portada
blanca por módulo (con o sin canales) desde el tema sellado · Slice 4 páginas de gráfico premium para las familias con
productor · Slice 5 gate de fidelidad, frames en `composer:visual-gate --catalog=insights`, dossier y scorecard,
ediciones internas en staging, release por el control plane con el flag de TASK-1888 y una edición interna en
producción antes de compartir con clientes. Sin flag propio.

**Hand-off planificado:** TASK-1849 y TASK-1875 mantienen en la web los mismos roles de color y la misma lectura.

## Sessions (append as you go; newest first)

- **2026-09-25 · TASK-1889 · implementación.** Slices 1–4 + «Lo esencial» + fixes por ediciones reales en
  `develop` local (sin push, último commit `2f0776e0f` (antes `9529a1b25`)). Fidelidad 20/21 + excepción aprobada `Deck-Agrupadas`;
  visual gate Insights 27 frames a 0 px; ediciones reales Berel/Sky revelaron 5 defectos que el canvas no mostraba,
  todos corregidos. Nada desplegado; rollout pendiente junto al flag de TASK-1888.
- **2026-09-25 · TASK-1888 · implementación.** Slices 1–6 en `develop` local (sin push), migración aplicada, gateway
  PR efeonce-mcp#18 abierto; preview v2 con datos reales de Sky y Berel en 0 violaciones. Coordinado con la sesión de
  TASK-1889 (copy `GH_INSIGHTS.catalog` de ella; campos del plan acordados por mensaje).
- **2026-09-25 · TASK-1888/1889 · planificación.** Tasks creadas (`8b35925fb` (antes `1ae82624d`)), matriz de 1888 corregida con la
  evidencia real (`d1f041f4e` (antes `e845ab562`): FTR y tendencias ICO entran al alcance) y contrato de fidelidad de 1889 con las 41 páginas
  de referencia y su paquete fuente (`07eb90170` (antes `568bfa669`)). Otra sesión empezó 1889 Slices 1–2 sin commit. Nada desplegado.
- **2026-09-25 · TASK-1847 · cierre.** Canary de render productivo: deck vacío en la org sandbox (`irun-cc329478…`,
  `insights-deck`, 3 láminas) y, con autorización del operador, A4 + deck con datos reales de Sky (`EO-INS-000022`).
  La sandbox no tiene snapshots ICO: una edición nueva falla en `validating` (`evidence_rejected`). El operador aprobó
  en un canvas el rediseño premium; se registraron TASK-1888 y TASK-1889 en EPIC-045.
- **2026-09-24 · TASK-1847 · release a producción.** Codex armó una rama acotada sobre `main` (PR #239) y la
  despachó; tras ~4 h el operador lo detuvo y Claude tomó la coordinación sólo para verificar y cerrar. Manifest
  `ebb9212a32ce-388b8af7-e133-4ea3-9441-2bbf00a157b7` `released`; 6 runtimes en el SHA, Vercel READY, watchdog `ok`;
  canary de contrato productivo con `renderableOutputs` deck_pdf+report_pdf. Pendiente: primer render productivo.
  El código del release vivía sin commitear en `develop`: `6d78817bb` (antes `e15d71648`) lo trae byte a byte.
- **2026-09-24 · TASK-1847 · render A4/deck y auditoría de release.** Índice local con folios reales; PDFs de prueba
  de 30 páginas y 25 láminas; cuatro familias nuevas en ambos formatos; fix de paths SVG vacíos; contraste de acentos
  A4 ajustado con token AXIS teal-750. El freeze visual rechazó veinte frames `deck-axis` ajenos y no escribió el
  baseline. Preflight del SHA remoto bloqueado por CI, smoke ausente, batch de 3.279
  archivos y auth de Postgres. Migraciones/WIF/Sentry pasan. Sin baseline promovido ni release productivo.

- **2026-09-18 · TASK-1848 production + gateway.** Staging canary green (incl. real email to the operator inbox, confirmed
  by the operator); ISSUE-174 caused by a concurrent burst (→ TASK-1876); release `bda1cf2cd938` with flags OFF in
  production; gateway `efeonce-mcp` 1.7.0 deployed after the release (58 tools); contract + provider canaries green.

- **2026-09-18 · greenhouse-eo-91 · TASK-1848 Slices 1-3 implemented (code complete, rollout pending).** Commits
  `75715589d`, `83d57380a`, `1c109fc8e` on local `develop` (not pushed). 4 migrations applied on the shared instance.
  Operator decisions: bearer never persisted (digest only); schedules V1 = draft + render; PDF attachment opt-in with
  irrevocability ack; session frontier = staging (production, release and gateway federation out). Not done: push,
  deploy, staging flags/canary, full test/build, federation.

- **2026-09-16 · TASK-1846 production + closure.** Release `917491fd02e4` (first productive deploy of the Job),
  render flag ON in Vercel Production, gateway v1.6.0 deployed, production canary green (dispatcher-driven `deck_pdf`,
  `web` 422, provider canary). Observed two Job executions for one output on a cold start (harmless). Task moved to complete.

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
- 2026-09-26 · Claude (TASK-1888) · revisión de PDFs con TASK-1846/1889 (superlativos únicos, esenciales sólo de
  hallazgos, afirmaciones con verbo, empate, tabla, orden de lecturas, dirección por hecho), gateway v1.9.0, flag en
  staging + ediciones internas, fix del empate. Codex ejecutó merge del gateway, redeploy de producción, flag del
  ops-worker y los dos releases que el clasificador bloqueó.
