# Efeonce Insights — program ledger (EPIC-045)

The single place where a session learns **what exists, where it runs and what the next task inherits**.
One section per task. Update yours at closure (Skill Maintenance Contract); append to "Sessions" as you go.

| Task | Scope | Lifecycle | Live where | Closed on |
| --- | --- | --- | --- | --- |
| TASK-1845 | Domain, evidence, adapters, lanes, MCP, gateway federation | **complete** | Cloud SQL (single instance), Vercel staging + Production (generation ON), gateway v1.5.0, Entra scope | 2026-09-16 |
| TASK-1846 | Durable rendering + Artifact Worker (RenderRun / InsightOutput), outputs port | in-progress (session greenhouse-eo-0d) | — | — |
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

## TASK-1846 — durable rendering (in-progress)
_Fill at closure: RenderRun/InsightOutput tables, worker jobs, outputs port wiring, flags (which runtime), canaries,
what stays for 1847/1848._

## TASK-1847 — charts and catalogs (to-do)
_Fill at closure._

## TASK-1848 — sharing, delivery, schedules (to-do)
_Fill at closure: web-model resolver/proxy for Think, tokens, email path, schedules._

## TASK-1849 — portal library/builder/shared web (to-do)
_Fill at closure._

## TASK-1875 — Think shared web render (to-do)
_Fill at closure: Astro route, token handling, `no-store`, GVC evidence._

## Sessions (append as you go; newest first)

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
