# Efeonce Insights — operations (flags, assignment, canaries, rollback)

## TASK-1847 production status (complete 2026-09-25)

In production since release `ebb9212a32ce` (2026-09-24): `deck_pdf` → `insights-deck`, `report_pdf` →
`insights-report`. First productive renders verified 2026-09-25: sandbox deck (`irun-cc329478…`) and a real-data
internal edition for Sky Airlines (`EO-INS-000022`, run `irun-166f4ed0…`: deck 5 slides + A4 8 pages, first attempt).

Production render canary with data: the sandbox org has NO ICO snapshots (`ico_engine.metric_snapshots_monthly`
returns zero rows for its two spaces), so a new sandbox edition fails in `validating` with `evidence_rejected` — that
is correct. Use an `internal` edition of a real client with data, only with explicit operator authorization
(issuance and sharing are OFF in production, so the client sees nothing). Render is idempotent per live output: an
edition whose outputs already exist returns the old run (`200 idempotent:true`).

The Composer's historical global visual set also drifts on clean, unrelated frames (ISSUE-122). Use
`pnpm composer:visual-gate --catalog=insights --selftest`, then the declared scoped freeze and scoped gate for
Insights templates. This scope preserves existing `deck-axis`/SKY baseline images and hashes.

## Flags (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

| Flag | Gates | Read in | State 2026-09-16 |
| --- | --- | --- | --- |
| `INSIGHTS_GENERATION_ENABLED` | create / revise / evidence collection | Vercel only (`flags.ts`) | ON staging + Production; Preview OFF |
| `INSIGHTS_ISSUANCE_ENABLED` | issue (plus human gate and validated outputs) | Vercel | Production OFF (product decision); staging ON since 2026-09-18, operator-authorized for the TASK-1848 canary |
| `INSIGHTS_AUTHORING_AI_ENABLED` | Gemini rewrite of the plan | Vercel | OFF everywhere |
| `INSIGHTS_SHARING_ENABLED` (TASK-1848) | create share links + public reader (OFF ⇒ create 503 `sharing_disabled`, reader 404) | Vercel | 2026-09-18: staging ON · Production OFF until the Think reader (TASK-1875) |
| `INSIGHTS_DELIVERY_ENABLED` (TASK-1848) | create delivery intent (Vercel, OFF ⇒ 503 `delivery_disabled`) + dispatch (ops-worker) | Vercel + `ops-worker` (default `true` in `deploy.sh`, guarded by `deploy-contract.test.ts`) | 2026-09-18: Vercel staging ON · Production OFF; ops-worker ON (`ops-worker-00695-hrw`, then release `bda1cf2cd938`) |
| `INSIGHTS_SCHEDULES_ENABLED` (TASK-1848) | schedule writes (Vercel) + tick (ops-worker) | Vercel + `ops-worker` (default `true`) | 2026-09-18: Vercel staging ON · Production OFF; ops-worker ON |
| `INSIGHTS_GENERATION_ENABLED` in the worker (TASK-1848) | the schedules tick creates editions | now ALSO `ops-worker` (default `true` in `deploy.sh`) | ops-worker ON; `INSIGHTS_AUTHORING_AI_ENABLED` is NOT declared in the worker |

`INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888, 2026-09-25): read where editions are GENERATED — Vercel (create/revise/
recover) and the `ops-worker` schedules tick (declared `:-false` in `deploy.sh`, guarded by `deploy-contract.test.ts`).
The render Job does NOT read it (it composes the frozen plan). OFF everywhere today. Flip in production ONLY with the
TASK-1889 release, in BOTH runtimes. To test in staging, flip it only in **Vercel staging**: the `ops-worker` is shared
with production. Before flipping, preview real data read-only:
`GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts --edition=<insed-…> --org=<org-…> --editorial-v2 --plan-only`
(2026-09-25: Sky `EO-INS-000022` and Berel `EO-INS-000019`, 0 violations). Cover preference: set per org with
`POST /api/platform/app/insights/cover-preference` `{ organizationId, coverTheme }` (Admin/Account) — works with the
flag OFF; the dark logo variant is loaded with `POST /api/organizations/<id>/brand-assets/logo` `{ assetId, variant: 'on_dark' }`.

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
- State 2026-09-16 (after release `917491fd02e4`): Vercel staging ON · Vercel Production ON (redeploy
  `greenhouse-d6l33zils`) · Job ON (first productive deploy by the release control plane, change-gated) · ops-worker ON
  (revision `ops-worker-00690-xhl`) · gateway `efeonce-mcp` v1.6.0 deployed (revision `00054-n78`, 51 tools).
  `INSIGHTS_ISSUANCE_ENABLED` stays OFF.
- Production canary (executed 2026-09-16): ecosystem lane with the gateway consumer token on the synthetic org →
  create 202 → `POST …/editions/<id>/render` 202 → wait for the dispatcher (never launch the Job by hand) → poll
  `GET …/render-runs/<id>` every 30–60 s until `completed` with `outputAssetId` → negative `outputs:["web"]` → 422
  `render_rejected`. Gateway side: `scripts/greenhouse-insights-canary.mjs --render-run` in `efeonce-mcp`
  (catalog, list, render run, deny 404).
- Cold start double execution: with a cold Job (~2 min) the next dispatcher tick still sees the output `queued` and
  launches a second execution; only one claims/finalizes (atomic claim + fencing), the other exits with no work.
  Harmless; do not retry or cancel because of it.
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

## Sharing, delivery, schedules (TASK-1848) — in production with flags OFF (release `bda1cf2cd938`, 2026-09-18)

Production flags stay OFF until the Think reader (TASK-1875) exists. ISSUE-174 (connection exhaustion by a concurrent
burst on a public DB-backed route) is open → TASK-1876; weigh it before exposing the public reader to real traffic.

- **EmailType kill switch:** `email_type_config` rows for `insights_edition_delivery` and
  `insights_edition_delivery_attachment` are seeded `enabled=false`. The table FAILS OPEN when a row is missing, so the
  seed is what keeps them off. Turning email on = flag ON in Vercel + ops-worker AND flip the row(s) to `enabled=true`;
  turning off = flip the row back (recipients then skip with `email_type_paused`).
- **Cloud Scheduler:** `ops-insights-schedules-tick`, `20 * * * *`, → ops-worker `POST /insights/schedules/tick`; ONE job
  for every organization. ENABLED since 2026-09-18 (single scheduler for staging and production). The tick also purges access events >180 d and rate buckets >1 d, even with
  `INSIGHTS_SCHEDULES_ENABLED` OFF.
- **Delivery dispatch runtime:** projection `insights_delivery_dispatch` (domain `notifications`, lane
  ops-reactive-notifications) in the ops-worker — the send happens there, not in Vercel.
- **Sentry scrub:** share paths and `isg_` tokens are redacted server + edge; verify with a synthetic event after deploy.

### Staging canary recipe — EXECUTED 2026-09-18 (green; see ledger § TASK-1848 for evidence)

Lessons from the run: sequence the rate-limit probe (NEVER a concurrent burst against the shared instance —
ISSUE-174); turn the EmailTypes on with `pnpm hiring:email-type -- --type <t> --on --apply` only for the canary and
back `--off --apply` right after (the config table is shared with production); `provider_status` stays null until the
Resend lifecycle webhook works (ISSUE-160), so "delivered" is confirmed by the recipient, not the ledger.

1. Push `develop`, deploy ops-worker (declares the three flags), create the Cloud Scheduler job, then
   `vercel env add INSIGHTS_SHARING_ENABLED staging` (+ `INSIGHTS_DELIVERY_ENABLED`, `INSIGHTS_SCHEDULES_ENABLED`) +
   redeploy the staging deployment.
2. Needs an ISSUED client edition of the synthetic org "Greenhouse Demo" (`INSIGHTS_ISSUANCE_ENABLED` is OFF: issuing
   needs a human decision or a flag step in staging — decide before the canary).
3. Share: create → success with `token` returned once; public `GET /api/public/insights/shared/<token>` → 200 + `no-store`
   headers; download of an allowed output; revoke → next GET 410; unknown token → 404; burst beyond the rate limit → 429.
   Deny: an org without the module → 404.
4. Delivery: request `share_link` to the synthetic client persona with the EmailType row enabled only for the canary;
   poll `GET …/deliveries/<id>` until `accepted`; replay with the same key → `idempotent: true`. Leave no ambiguous rows
   (signal `insights.delivery.ambiguous` back to 0).
5. Schedules: define + activate a monthly schedule for the synthetic org; trigger one tick; expect one occurrence
   `render_requested` and an edition in `ready_for_review` — never issued, never emailed. Then retire it.
6. `pnpm test:live` for `sharing`, `delivery`, `schedules` live tests.

### EmailType switch (shared config table — staging and production see the same rows)

`pnpm hiring:email-type -- --type <insights_edition_delivery|insights_edition_delivery_attachment> --on --apply` only for
the duration of a canary, then `--off --apply` right away; without `--apply` it is a dry-run. A recipient hit while the row
is off is `skipped/email_type_paused` (no grant issued).

### Production contract canary — EXECUTED 2026-09-18 (flags OFF; sequential, never a burst)

1. Ecosystem lane with the gateway consumer token on the synthetic org: `POST …/editions/<id>/shares` ⇒ 503
   `sharing_disabled` (only the new code produces that code, so it proves the deployed SHA).
2. `GET` shares / deliveries / schedules ⇒ 200 (they show the staging canary's synthetic rows: single instance).
3. `GET /api/public/insights/shared/<unknown token>` ⇒ 404; the route without a token ⇒ 401.
4. Gateway: `scripts/greenhouse-insights-canary.mjs` in `efeonce-mcp` against production (verified: schedules 1,
   shares 3, deliveries 3). Deploy the gateway only AFTER the Greenhouse release publishes the routes: its `deploy.yml`
   is `workflow_dispatch`, a merge to its `main` does not deploy.

### Rollback per lane

- **Sharing:** flag OFF in Vercel (+ redeploy) ⇒ create 503 and public reader 404 for every link. To cut specific access
  now, revoke the grants (revoke works with the flag OFF). Already-downloaded files cannot be revoked.
- **Delivery:** flip the EmailType rows to `enabled=false` (immediate, both runtimes) and/or flag OFF in Vercel (no new
  intents) and ops-worker (no dispatch). Cancel pending intents. Ambiguous recipients are reconciled, never resent.
- **Schedules:** flag OFF in Vercel (no writes) and ops-worker (tick does nothing but purge); pause or retire schedules
  (both work with the flag OFF); deleting the Cloud Scheduler job stops the tick entirely.
- **Schema:** never `migrate:down` on the shared instance without explicit operator authorization (it serves production).
