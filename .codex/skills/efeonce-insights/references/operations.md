# Efeonce Insights — operations (flags, assignment, canaries, rollback)

## Flags (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

| Flag | Gates | Read in | State 2026-09-16 |
| --- | --- | --- | --- |
| `INSIGHTS_GENERATION_ENABLED` | create / revise / evidence collection | Vercel only (`flags.ts`) | ON staging + Production; Preview OFF |
| `INSIGHTS_ISSUANCE_ENABLED` | issue (plus human gate and validated outputs) | Vercel | OFF everywhere (until TASK-1846) |
| `INSIGHTS_AUTHORING_AI_ENABLED` | Gemini rewrite of the plan | Vercel | OFF everywhere |

Flip = `vercel env add <FLAG> <env>` (`production` lowercase for the standard env; custom `staging` literal) **+
`vercel redeploy <url>`**: a deployment built before the env var never sees it. If a worker starts reading a flag,
declare it in `services/<worker>/deploy.sh` (destructive `--set-env-vars`) and apply live with `--update-env-vars`.

## Assigning the module

`npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/assign-insights-module.ts --org=<organization_id> [--apply]`
— dry-run by default; goes through `enableClientPortalModule` (audit + outbox + cache invalidation). Synthetic org for
canaries: `org-6c09b3a7-cbab-48a9-869e-61d03d1c6291` ("Greenhouse Demo", persona `agent-client@greenhouse.efeonce.org`,
role `client_executive`). Deny org (no module): `org-7e4b9883-bde2-46e4-8848-f54b3ecf9255`.

## Canaries

- App lane (staging): `AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org pnpm staging:request POST /api/platform/app/insights/editions '<InsightRequestV1 json>'`
  → 202; repeat → 200 `idempotent:true`; change `depth` with same key → 409; `GET .../catalog` → 200.
- Ecosystem lane (staging or production): bearer = gateway consumer token (Secret Manager
  `efeonce-mcp-gateway-greenhouse-token`), query `externalScopeType=other&externalScopeId=efeonce-mcp-gateway&organizationId=<org>`,
  header `idempotency-key`, body `InsightRequestV1`; staging additionally needs `x-vercel-protection-bypass`.
  Assert: catalog 200, list 200, detail `?include=evidence` 200 with sealed snapshot + frozen plan, create 202,
  deny org 404. Production create is a real write on the single instance: use the synthetic org only.
- Gateway provider: in `efeonce-mcp`, `GREENHOUSE_ECOSYSTEM_API_URL=… GREENHOUSE_ECOSYSTEM_TOKEN=… [GREENHOUSE_ECOSYSTEM_VERCEL_BYPASS_SECRET=…] node scripts/greenhouse-insights-canary.mjs <org> --deny <org> [--edition <id>]` (reads only).
- Served skill: `GET /api/platform/ecosystem/mcp/skills[/efeonce-insights]` with the consumer token; compare the body
  hash with `docs/mcp/skills/efeonce-insights/SKILL.md` of the deployed SHA; unknown name ⇒ 404.

## Rollback

- Code: revert the PR; flags OFF (`vercel env rm` + redeploy) make the domain answer 503 without touching data.
- Schema: `pnpm migrate:down` on the Insights migration drops the schema and deprecates the four capabilities, and
  **does not touch** the module row, its assignments or `module_assignment_events` (append-only): they are governed
  data and the Up re-seeds capabilities and leaves the module (`DO NOTHING`), so down/up returns to the live state.
  Rehearsed 2026-09-16 00:24–00:25Z on the single shared instance with only synthetic editions. Before any future
  down: announce to peer sessions and WAIT for a reply; confirm every edition's org is synthetic; expect the code
  sequence to restart at `EO-INS-000001`.

## Release specifics

The migration is already applied on the single instance, so `release_batch_policy` reports `db_migrations` as
irreversible: dispatch with a factual `bypass_preflight_reason` (applied migration + `auth_access` = scope parity).
Contract canary on production after release: catalog 200 / deny 404 / create 503 `generation_disabled` before the
flag, 202 after.

## Rendering (TASK-1846)

- Flag `INSIGHTS_RENDER_ENABLED` — THREE runtimes: Vercel (queue via API/MCP), `ops-worker` (dispatcher
  `/artifact-render/dispatch`, called by Cloud Scheduler `ops-artifact-render-dispatch` every 2 min, launches the Job)
  and the `artifact-worker` Cloud Run Job (claim/render). Cloud Run SoT is each service's `deploy.sh` (destructive
  `--set-env-vars`; both default `true`); apply live with `gcloud run jobs update …`/`gcloud run services update …
  --update-env-vars` AND keep it in `deploy.sh`. Vercel: `vercel env add` + redeploy.
- Job and ops-worker are SINGLE for staging and production. The per-environment product gate is the Vercel enqueue.
  The Job's assets bucket is fixed to `efeonce-group-greenhouse-private-assets-staging` (assets store `bucket_name` per row).
- State 2026-09-16: Vercel staging ON · Vercel Production OFF (absent) · Job ON · ops-worker ON (revision
  `ops-worker-00690-xhl`). The Job is in the production release control plane; first productive deploy on next release.
- Production rollout order (NOT executed): Greenhouse release → `vercel env add INSIGHTS_RENDER_ENABLED production` +
  `vercel redeploy` → deploy gateway `efeonce-mcp` v1.6.0 (merged, PR #14) → production canary on the synthetic org →
  only then consider `INSIGHTS_ISSUANCE_ENABLED` (OFF).
- Throughput (Cloud Run staging 2026-09-16): 1 output per 2-min tick (one execution per tick, `parallelism=1`; Proposal
  wins the tick). A burst of N ≈ 2·N min. Render 6.3–7.3 s, PDF ~330 KB; execution start 3.9 s warm / 42 s first after
  deploy / 154 s cold; task total 50–58 s. Local: 15 slides ~4.6 s, 25 slides ~7.2 s, RSS ≤ 365 MB.
- Semantics seen live: `retry` re-queues only failed (completed untouched; content failures fail again, attempts →3 →
  `dead_letter`); `cancel` on a queued run ⇒ `cancelled`, 0 attempts; `retry` on cancelled ⇒ 200, no re-queue.
- Staging canary (recipe used 2026-09-16; synthetic org "Greenhouse Demo", persona `agent-client`):
  1. `AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org pnpm staging:request POST /api/platform/app/insights/editions '<InsightRequestV1, outputs ["deck_pdf"]>'` → 202 `ready_for_review`.
  2. `… pnpm staging:request POST /api/platform/app/insights/editions/<editionId>/render '{}'` → 202, output `queued`.
  3. Do NOT execute the Job by hand. Wait for the dispatcher tick and poll `GET /api/platform/app/insights/render-runs/<id>`
     until `completed` + `outputAssetId`. Queue age > ~2·position min ⇒ check ops-worker logs (`insightsQueued`).
  4. Negatives: cancel a still-queued run (→ `cancelled`, 0 attempts) then retry it (→ 200, no re-queue); an `internal`
     edition created by a superadmin, rendered/read by `agent-client` → 404, 0 outputs.
  5. `pnpm test:live src/lib/efeonce-insights/render` (4/4 on 2026-09-16).
- Orphans: signal `insights.render.orphaned_output` (steady 0). Rows `running` with `lease_expires_at IS NULL` are
  pre-fencing legacies and need a human decision; expired leases beyond 60 min mean the worker is not draining.
- Live tests: `pnpm test:live src/lib/efeonce-insights/render` (rollback transaction; needs the proxy).
- Rollback: disable the flag in both runtimes; keep tables and assets; never `migrate:down` on the shared instance
  without explicit operator authorization (it serves production).
