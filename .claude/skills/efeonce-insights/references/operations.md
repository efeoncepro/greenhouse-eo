# Efeonce Insights — operations (flags, assignment, canaries, rollback)

## TASK-1847 production status (complete 2026-09-25)

In production since release `ebb9212a32ce` (2026-09-24): `deck_pdf` → `insights-deck`, `report_pdf` →
`insights-report`. First productive renders verified 2026-09-25: sandbox deck (`irun-cc329478…`) and a real-data
internal edition for Sky Airlines (`EO-INS-000022`, run `irun-166f4ed0…`: deck 5 slides + A4 8 pages, first attempt).

Production render canary with data: the sandbox org has NO ICO snapshots (`ico_engine.metric_snapshots_monthly`
returns zero rows for its two spaces), so a new sandbox edition fails in `validating` with `evidence_rejected` — that
is correct. Use an `internal` edition of a real client with data, only with explicit operator authorization
(issuance is OFF in production and sharing needs an issued edition, so the client sees nothing). Render is idempotent per live output: an
edition whose outputs already exist returns the old run (`200 idempotent:true`).

The Composer's historical global visual set also drifts on clean, unrelated frames (ISSUE-122). Use
`pnpm composer:visual-gate --catalog=insights --selftest`, then the declared scoped freeze and scoped gate for
Insights templates. This scope preserves existing `deck-axis`/SKY baseline images and hashes.

## TASK-1889 premium catalogs — how to operate (complete 2026-09-26, in production)

In production since releases `0e87c7a443a2` + `f9257b9c94af` (2026-09-26); first internal editions rendered in Production with the new design on 2026-09-26 — Berel `insed-7d470d9f…` (run `irun-dcd1fbed…`: A4 16 pages + deck 15 slides) and Sky `insed-9370d0cc…` (run `irun-e5882459…`: A4 12 + deck 10), all four PDFs on the first attempt. Recipe for a
production render check: create an `internal` edition of a real client with data through the ecosystem lane (gateway
consumer token, `externalScopeType=other&externalScopeId=efeonce-mcp-gateway&organizationId=<org>`), `POST
…/editions/<id>/render`, wait for the dispatcher (1 output per 2-min tick) and read the PDFs from the asset store. It
writes to Production, so it needs the operator's explicit authorization (the permission classifier blocks it
otherwise). No own flag;
the v2 content (readings, essentials, cover, bands) only exists in plans generated with `INSIGHTS_EDITORIAL_V2_ENABLED`
(TASK-1888). A v1 plan composes on the v2 templates with the documented fallbacks.

- **Canvas fidelity**: `pnpm insights:canvas-fidelity` (`--only=<name>` to filter, `--gray` for the grayscale sheet).
  Criterion ≤ 1 % differing pixels per page against `docs/ui/visual-directions/TASK-1889-…/paginas/`. State: 20/21
  inside; `Deck-Agrupadas` 2,2 % is an operator-APPROVED exception (2026-09-25, `approvedException` in its fixture,
  ceiling 2,5 %, reported with ⚠). A new exception needs the operator's approval, never a silent threshold bump.
- **Visual gate**: `pnpm composer:visual-gate --catalog=insights` (27 frames at 0 px; deltas g–k). A figure contract
  may declare `example` so the probe exercises real geometry — changing it moves the frame (declare + scoped freeze;
  runbook `docs/operations/runbooks/composer-visual-gate.md`).
- **Real-data preview (local, before any release)**: `preview-edition.ts --edition=<insed-…> --org=<org-…>
  --editorial-v2 [--output=report_pdf|deck_pdf|both]` (same env prefix as the `--plan-only` recipe below) leaves the PDF
  in `.captures/insights-preview/`. It delivers the client logo with the worker's own reader
  (`readOrganizationLogoForRender`); its only write is that reader's access log. Reference runs 2026-09-25: Berel
  `EO-INS-000019` (16 pages / 13 slides), Sky `EO-INS-000022` (12 / 9).
- **Logo failures**: missing bytes fail closed; a non-embeddable logo is `semantic_rejected` (no retry helps — fix the
  org's attached logo).
- **Rollout order**: push → staging with `INSIGHTS_EDITORIAL_V2_ENABLED` ON only in Vercel staging (the `ops-worker`
  is shared with production) → internal Berel/Sky editions → release through the control plane (the Job
  `artifact-worker` is ONE for staging and production, so the release switches both) → operator approves derived
  pieces and real PDFs → one internal edition in production before sharing with a client.
- **Rollback**: revert the release; sealed plans are unaffected (render reads the frozen plan).

## Flags (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

| Flag | Gates | Read in | State 2026-09-16 |
| --- | --- | --- | --- |
| `INSIGHTS_GENERATION_ENABLED` | create / revise / evidence collection | Vercel only (`flags.ts`) | ON staging + Production; Preview OFF |
| `INSIGHTS_ISSUANCE_ENABLED` | issue (plus human gate and validated outputs) | Vercel | Production OFF (product decision); staging ON since 2026-09-18, operator-authorized for the TASK-1848 canary |
| `INSIGHTS_AUTHORING_AI_ENABLED` | Gemini rewrite of the plan | Vercel only (ops-worker never reads it: scheduled editions stay deterministic) | ON in Production since 2026-09-26 (canary `EO-INS-000029`, `ai_bounded`, gemini-2.5-flash-lite); staging OFF |
| `INSIGHTS_SHARING_ENABLED` (TASK-1848) | create share links + public reader (OFF ⇒ create 503 `sharing_disabled`, reader 404) | Vercel | staging ON since 2026-09-18 · Production ON since 2026-09-28 (`greenhouse-cssemzyzb`; TASK-1875 canary green) |
| `INSIGHTS_DELIVERY_ENABLED` (TASK-1848) | create delivery intent (Vercel, OFF ⇒ 503 `delivery_disabled`) + dispatch (ops-worker) | Vercel + `ops-worker` (default `true` in `deploy.sh`, guarded by `deploy-contract.test.ts`) | 2026-09-18: Vercel staging ON · Production OFF; ops-worker ON (`ops-worker-00695-hrw`, then release `bda1cf2cd938`) |
| `INSIGHTS_SCHEDULES_ENABLED` (TASK-1848) | schedule writes (Vercel) + tick (ops-worker) | Vercel + `ops-worker` (default `true`) | 2026-09-18: Vercel staging ON · Production OFF; ops-worker ON |
| `INSIGHTS_GENERATION_ENABLED` in the worker (TASK-1848) | the schedules tick creates editions | now ALSO `ops-worker` (default `true` in `deploy.sh`) | ops-worker ON; `INSIGHTS_AUTHORING_AI_ENABLED` is NOT declared in the worker |
| `INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888) | v2 evidence + v2 plan when an edition is generated (create/revise/recover; schedules tick) | Vercel + `ops-worker` (default `:-true` in `deploy.sh`, pinned by `deploy-contract.test.ts`); the render Job does NOT read it | 2026-09-26: Vercel staging ON (`greenhouse-9t9fwhrvz`) · Vercel Production ON (exact `true`, deployment `greenhouse-8hl5hf54w`) · ops-worker ON (`ops-worker-00719-gbm`) |

`INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888, 2026-09-25): read where editions are GENERATED — Vercel (create/revise/
recover) and the `ops-worker` schedules tick. Since the 2026-09-26 rollout, Vercel staging, Vercel Production and the `ops-worker` are ON. The
first Production canary revealed a trailing newline in Vercel's encrypted Production value: the reader compares
exactly to `true`, so `true\n` left the flag OFF. Corrected it to the exact four-character value and redeployed
`greenhouse-8hl5hf54w` (`dpl_5sJdifoXZiXhQXfRSmW4zXFtQgGf`, Ready, alias `greenhouse.efeoncepro.com`). A second
synthetic canary froze three `scopeLines` and a cover (`frozenAt` + `planHash`); its empty snapshot still correctly
failed validation with `evidence_rejected` (0 facts, 9 rejections). The render Job does NOT read the flag (it
composes the frozen plan). Always verify a flag's exact stored string when its reader uses strict equality. To test
in staging, flip it only in **Vercel staging**: the `ops-worker` is shared with production. Before flipping, preview
real data read-only:
`GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts --edition=<insed-…> --org=<org-…> --editorial-v2 --plan-only`
(2026-09-25: Sky `EO-INS-000022` and Berel `EO-INS-000019`, 0 violations). Cover preference: set per org with
`POST /api/platform/app/insights/cover-preference` `{ organizationId, coverTheme }` (Admin/Account) — works with the
flag OFF; the dark logo variant is loaded with `POST /api/organizations/<id>/brand-assets/logo` `{ assetId, variant: 'on_dark' }`.

Flip = `printf %s true | vercel env add <FLAG> <env>` (`production` lowercase for the standard env; custom `staging`
literal; NEVER `echo`, whose trailing newline stores `true\n` and leaves a strict `=== 'true'` reader OFF) **+ a new
deployment created AFTER the variable** (`vercel redeploy <url>`): a deployment built before the env var never sees it.
Verify the flip by BEHAVIOR (a canary), never by the env listing — an API read did not show the newline. If a worker
starts reading a flag, declare it in `services/<worker>/deploy.sh` (destructive `--set-env-vars`) and apply live with
`--update-env-vars`.

### Editorial v2 — Production canary recipe (EXECUTED 2026-09-26)

Ecosystem lane with the gateway consumer token (recipe in § Canaries), synthetic org "Greenhouse Demo" only.
`POST …/insights/editions` → 202, then `GET` the detail with `?include=evidence`. Proof of v2 = the frozen plan
carries `plan.scopeLines` (3) and `plan.cover` (with `frozenAt` + `planHash`); a plan without them was generated with
the flag OFF (first canary `insed-356e948c…`, value `true\n`). The sandbox snapshot has no facts, so the edition ends
`failed` in `validating`/`evidence_rejected` — expected; readings/essentials need an organization with data. Do not
issue, share nor request a render. Passing canary: `insed-f5768172…` on `greenhouse-8hl5hf54w`.

### Editorial v2 — rollback

Flag OFF in BOTH runtimes: `vercel env rm INSIGHTS_EDITORIAL_V2_ENABLED production` (and staging) **+ redeploy**; in
the `ops-worker`, apply `--update-env-vars INSIGHTS_EDITORIAL_V2_ENABLED=false` on the live service **and**
change the `deploy.sh` default to `:-false` (otherwise the next deploy turns it back ON). New editions seal v1 plans;
sealed v2 editions keep composing (render reads the frozen plan). Update the flag ledger.

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

## Sharing, delivery, schedules (TASK-1848) — sharing ON; delivery/schedules OFF in production

`INSIGHTS_SHARING_ENABLED` is ON in Vercel Production since 2026-09-28 after the TASK-1875 behavior canary. Delivery
and schedules remain OFF. ISSUE-174 (connection exhaustion by a concurrent burst on a public DB-backed route) remains
governed by TASK-1876; all probes against the public reader stay sequential.

**Edge guard (TASK-1876, applied and read back without drift 2026-09-28):** `/api/public/**` — public reader and download
proxy included — sits behind a Vercel Firewall rate limit of 20 req / 10 s per IP: `enforce` (429 at the edge, function
not invoked, no PG connection) in staging/preview, `observe` (log only) in production. Rules versioned in
`src/lib/security/public-burst-guard/firewall-rules.ts`; `pnpm security:public-burst-guard` prints the plan,
`--apply` writes and re-reads (apply is the operator's). Vercel PG sessions also request `idle_session_timeout=60s`.
The domain per-grant limit (429 + `Retry-After: 60`) stays behind the edge. The Think server-side consumer (TASK-1875)
is exempted by an explicit header condition (`x-efeonce-think-key`, applied 2026-09-28; see
§ Shared web in Think) — never by raising the limit. Diagnosis: a 429
without the domain JSON body / `Retry-After` and without a `rate_limited` access event came from the edge.

**No bursts against the shared instance.** Never measure limits with concurrent requests against a DB-backed route:
there is ONE Cloud SQL instance for dev/staging/production and ISSUE-174 was born from a TASK-1848 canary that fired
64 concurrent requests. Probe limits sequentially; the edge limit is proven in staging (enforce), not by saturating PG.

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
   headers; download of an allowed output; revoke → next GET 410; unknown token → 404; burst beyond the rate limit → 429
   (sequential requests, never concurrent; since TASK-1876 staging answers the edge 429 first at 20 req / 10 s per IP).
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

## Shared web in Think (TASK-1875) — Think and Greenhouse sharing in production; 1.1 remains in staging (2026-09-28)

State: Think `main` `544ecd4` is in production (`/insights/r/<token>` and public sample `/insights/muestra`). Greenhouse
production serves `InsightWebModelV1` 1.0, supported by Think; Greenhouse `13fd47381` keeps model 1.1 in staging. The
WAF exception is applied and read back without drift; `INSIGHTS_SHARING_ENABLED` is exact `true` in Vercel Production,
deployment `greenhouse-cssemzyzb` (`dpl_Adau69P3EwsUCoLh6J8bTNKhQqbr`) is Ready with alias
`greenhouse.efeoncepro.com`. The production ecosystem-lane canary completed sequentially and its grant was revoked.
No Greenhouse release was performed as part of this activation.

**Public sample for clients** — `think.efeoncepro.com/insights/muestra`: the same `InsightReport` render with the
fixture model, a fictitious brand («Marca de ejemplo»), a visible notice in the hero and footer, no downloads, no
client logo and no call to Greenhouse; prerendered, `noindex`, excluded from the sitemap; closes with a «Conversemos»
CTA to `sales@efeoncepro.com`. Changing the render changes the sample too (one component, never two copies).

**Key location:** Secret Manager `efeonce-think-server-key` (project `efeonce-group`) is the source; Think's Vercel
production env `GREENHOUSE_THINK_KEY` holds the same value (sensitive). The WAF apply reads it from Secret Manager:
`PUBLIC_BURST_GUARD_THINK_KEY=$(gcloud secrets versions access latest --secret=efeonce-think-server-key --project=efeonce-group) pnpm security:public-burst-guard --apply`.

**Share create body:** `{ expiresInDays?, downloadOutputs?, label? }`. A grant without `downloadOutputs` has NO
downloads (the reader returns `downloads: []` and Think shows no button): pass `["deck_pdf"]`/`["report_pdf"]`
explicitly. `ttlDays` is not a field (ignored ⇒ default 30 days).

**Local Think against staging:** `efeonce-think/.env.staging.local` (gitignored) with `GREENHOUSE_API_BASE` = staging
`.vercel.app` and `GREENHOUSE_API_BYPASS`; run `astro dev --mode staging` (launch config `think-staging`, port 4332).
Astro allows ONE dev server per project: stop the fixtures server first; `fixture-*` tokens keep working in that mode.

**Variables (none is an `*_ENABLED` flag):**

| Variable | Where | Purpose |
| --- | --- | --- |
| `PUBLIC_BURST_GUARD_THINK_KEY` | env of the script `pnpm security:public-burst-guard` (operator shell) | value of the `x-efeonce-think-key` exception in the WAF rule; never printed |
| `GREENHOUSE_THINK_KEY` | Think's Vercel project (astro server secret, default `''`) | sent as `x-efeonce-think-key` so Think's server-side reads are not counted by the edge limit |
| `GREENHOUSE_API_BYPASS` | Think's Vercel project (astro server secret, default `''`) | sent as `x-vercel-protection-bypass` when Think reads a protected Greenhouse deployment (staging) |
| `GREENHOUSE_API_BASE` | Think (local testing) | which Greenhouse Think reads; point at the staging `.vercel.app` to test staging tokens |
| `INSIGHTS_SHARE_PUBLIC_BASE_URL` | Greenhouse (Vercel) | base of `buildInsightShareUrl`; default `https://think.efeoncepro.com` |

The same key value goes to `PUBLIC_BURST_GUARD_THINK_KEY` and `GREENHOUSE_THINK_KEY`. It never goes into a log, a URL
or a commit.

**Staging vs production links.** `buildInsightShareUrl` → `https://think.efeoncepro.com/insights/r/<token>` in every
environment unless the base is overridden, and production Think reads production Greenhouse: a staging token 404s
there. Test staging with local Think (`GREENHOUSE_API_BASE` = staging `.vercel.app` + `GREENHOUSE_API_BYPASS`).

**Rollout order (executed through the production-sharing activation on 2026-09-28; do not reorder on replay):**
1. Generate the Think key; set `GREENHOUSE_THINK_KEY` in Think's Vercel **production** env; run
   `PUBLIC_BURST_GUARD_THINK_KEY=… pnpm security:public-burst-guard --apply` (the operator runs it; the permission
   classifier blocks the agent) and re-read the plan: the rule must carry the exception BEFORE Think goes live.
2. Push Greenhouse `develop` → staging. Verify model 1.1 with a synthetic share grant on the sandbox edition: create
   grant → local Think renders it → revoke → next GET 410 → download through the proxy. Sequential requests only.
3. Release Greenhouse to production through the control plane (`greenhouse-production-release`) only when separately
   authorized. The 2026-09-28 activation intentionally skipped this step because production model 1.0 is supported.
4. Push Think `main` (auto-deploys production).
5. Flip `INSIGHTS_SHARING_ENABLED` in production only with explicit operator approval, after mapping where it is read
   (`grep -rn INSIGHTS_SHARING_ENABLED src/ services/`), and register it in the flag ledger.

**Production canary 2026-09-28:** ecosystem create 201 on synthetic edition `EO-INS-000014`; Think 200 with
`Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` and no token in
HTML; `deck_pdf` returned `%PDF` (329 874 B) through the proxy; revoke returned 200; the page then returned 410 without
organization name or report code and download returned 303. Grant `ishr-df4a4ffa-20f6-475f-b0bb-2d2da51fc188` is
revoked. Never record the one-time link token.

**Think-side verification:** `pnpm test:insights`, `scripts/verify-insights-report.mjs`,
`scripts/audit-insights-a11y.mjs`, `scripts/capture-insights-report.mjs` (repo `efeonce-think`).
