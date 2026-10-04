# Efeonce Marketing Studio — program ledger (EPIC-049)

The single place where a session learns **what exists, where it runs and what the next task inherits**. One section
per task. Update yours at closure (Skill Maintenance Contract); append to "Sessions" as you go.

EPIC: `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`. Execution order (operator, 2026-09-25):
**1890 → 1891 · 1893 · 1896 → 1892 → 1894 → 1895 · 1899 → 1897 → 1898** (login last). TASK-1888/1889 are
Insights (EPIC-045), not Studio.

| Task | Scope | Lifecycle (2026-10-02) | Live where |
|---|---|---|---|
| TASK-1887 | Foundation: repo, DBs/roles, domain model, API v1, catalog import, private renditions, approved UI, Vercel + domain (open mode) | **complete** | `studio.efeonce.org` |
| TASK-1890 | Agent-ready contract: operations registry + tool manifest, semantics, service bearer, canonical org, capability, served manual | **complete** | Studio prod; Greenhouse release `0e87c7a443a2` serves the manual |
| TASK-1891 | Federation of every manifest tool in Efeonce MCP | **complete** | Gateway provider **ON** in production |
| TASK-1892 | Marketing metrics from Greenhouse (Search Console, GA4, SEO) via ecosystem lane `/api/platform/ecosystem/growth/*`, never SQL; paid (Meta/LinkedIn) and organic social (Metricool) as Studio adapters | to-do (GA4 not in production yet: TASK-1284) | — |
| TASK-1893 | Original asset store in GCS (approved finals, sha256, versioning, rights) + Cloud Run media worker (auto renditions, video covers, crops, Metricool readback; Metricool API confirmed) | **complete 2026-09-26** | Studio prod + staging (worker `00001-sgb` / `00002-svt`); Greenhouse release `92002873ced9` |
| TASK-1894 | Write commands (idempotency, `If-Match`, audit), brief as entity, dated per-campaign authority cutover from OneDrive; `createAssetVersion` + signed upload + CLI `studio:upload` + rights at upload + signal «pieza aprobada sin original en Studio» (ADR 2026-09-26); `.write`/`.approve` capabilities | **in progress** — Entregable A (ingest door) **in production 2026-10-02**; Entregable B (Slices 4–7) **code complete, verified in staging, NOT in production** (Studio `main` not pushed); C (Slices 8–10) deferred by the operator | Studio prod (API 1.3.0, 15 tools; worker `00002-hzn`) · staging preview of branch `task-1894-entregable-b` (API 1.4.0, 44 tools) |
| TASK-1895 | Editing/review/version upload/metrics UI (wireframe + flow), consumer of 1892–1894 | to-do | — |
| TASK-1896 | Observability (Sentry, request id + JSON logs, deep health, `ops_run`), alerts (uptime + Sentry email; Greenhouse signal + Teams «EO - Admin»), verified logical restore of `marketing_studio` (30-day rehearsal dump); before writes reach production | **complete 2026-09-26** | Studio prod (Sentry, uptime, rehearsal job + scheduler); Greenhouse release `92002873ced9` (signal + Teams) |
| TASK-1897 | (Greenhouse) revoke `CONNECT` from PUBLIC on `greenhouse_app` and Studio DBs | to-do | — |
| TASK-1898 | Login with Efeonce ID (`auth.efeonce.org`), `STUDIO_ACCESS_MODE=efeonce_id`; last; also depends on TASK-1834 | to-do | — |
| TASK-1998 | Video playback rendition: MP4 H.264 ≤ 720 px faststart in the media worker (flag `MEDIA_WORKER_PLAYBACK_ENABLED`, backfill by the sweep), `/api/v1/media/{token}` → 302 to a 1 h V4 URL (Range by GCS), `Asset.playback` / `AssetVersionDetail.playback`, API 1.5.0 | **in progress — code complete 2026-10-04, rollout pending** | Studio local `main` (`f5ae10a`, `995bb73`); migration on staging only; 4 staging videos with `playback` |
| TASK-1999 | Video player in the piece inspector (feed + 9:16 story, native controls, no autoplay), every piece per format in the board, duration, ghost cell → other kind | **in progress — code complete 2026-10-04, rollout pending** | Studio local `main` (`35093c3`); verified on localhost against staging |
| TASK-1899 | MCP writes and approvals: write-class tools with own scopes (`.write`/`.approve`), delegated person identity (RFC 8693, Studio audience), `dryRun` → explicit confirm, `proposalDigest`; blocked by 1891 + 1894 | to-do | — |

## TASK-1887 — foundation (complete)

**Built (Studio commits):** `accdc89` foundation · `45d9fef` DATE as ISO text, ESM root for the import CLI ·
`d2aed8d` private renditions, attention, calendar, search · `91cef62` approved UI light/dark (AXIS, Hoy, campaigns,
pieces with feed view, calendar, media, ⌘K) · `7e5fbcb`/`f8c0e44`/`ea32ee6` Vercel pin + first deploy with a team
author · `5a5cd76` agent router commands.

- Schema `studio` (14 tables), roles by SQL, DBs `marketing_studio` / `marketing_studio_staging`, WIF, 2 private buckets.
- Import of 5 campaigns CMP-001..005 (21 concepts, 54 pieces, 48 copies, 72 ads, 4 audiences, 1 flight, 7 budget
  lines, 6 posts), 108 renditions per bucket.
- UI approved by the operator: Claude Design artifact «v2 · Claro y oscuro»
  (`https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi`); theme from `@efeoncepro/axis-tokens@0.2.5`, cookie
  `studio-theme`, Poppins + Geist, ⌘K.
- Domain CNAME in HostGator; certificate unblocked with `vercel certs issue`.

## Post-foundation fixes (outside a task, 2026-09-25)

- `77e58e4` toolchain: TS 7, React 19.3, Vitest 5, Kysely 0.29, single version catalog + `dependency-catalog-gate`.
- `c949d3f` images without a DB query per image (HMAC-signed `/api/v1/media/{token}`), per-format preview (9:16 as
  story; 1:1/4:5/16:9 as feed card with real ratio). Verified 108/108 concurrent OK in production.

## TASK-1890 — agent-ready contract (in-progress, code complete)

**Studio commits:** `5418808` Slice 1 canonical Greenhouse organization · `bbd60fc` Slice 2 service bearer + org
filter · `f451af0` Slice 3 semantics in contracts + asset detail · `d08387f` Slice 4 operations registry + tool
manifest · `d3ab68e` (TASK-1891) preview default thumb 640 px. Production = `d3ab68e`.

- API 1.1.0, 17 operations (12 tools, 5 exclusions), manifest `studio-tool-manifest.v1` hash `96d1f0caf6e5…`.
- New routes: `GET /api/v1/assets/{assetId}`, `/assets/{assetId}/preview`, `/tool-manifest`.
- `api_client` bearer `mst_…`; gateway client secret `marketing-studio-mcp-gateway-token` (v1, org Efeonce).
  Verified in production: 200 / foreign org 404 / invalid token 401 / web without bearer 200.
- Greenhouse: capability `marketing_studio.campaign.read` (migration applied; grants `efeonce_admin`,
  `efeonce_account`, `efeonce_operations`); served manual `docs/mcp/skills/marketing-studio/SKILL.md` + entry with
  `provider: 'marketing-studio'` in `skill-manifest.ts`; drift fix `678d5e855` seeding 4 catalog-only capabilities
  (`identity.internal_access.{enroll,grant,revoke}`, `growth.ga4.connect`) into `capabilities_registry` (parity.live passes).
- **Pending to close:** Greenhouse push + production release (serves the manual). Local `develop` not pushed because
  a remote commit collides with foreign WIP in `scripts/foto`.

## TASK-1891 — MCP federation (in-progress)

- Greenhouse (Slice 1): exchange client `efeonce-mcp-marketing-studio` (migration applied), scope
  `marketing_studio.campaign.read`, input scope `efeonce.mcp.read`, `authorizeMarketingStudio` in
  `mcp-token-exchange.ts`; `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` includes the client in Vercel
  production and staging (effective on the next deploy).
- Gateway: PR efeoncepro/efeonce-mcp#19 merged (`9b93d6a`), version **1.8.0**, deploy run `36183601792`, revision
  `efeonce-mcp-gateway-00057-w8h` (southamerica-west1) at 100 %, `MARKETING_STUDIO_PROVIDER_ENABLED=false`.
  Surface 70 tools at 1.8.0 (the Insights PR #18 of TASK-1888 moves to 1.9.0).
- **Live 2026-09-26:** Greenhouse release `0e87c7a443a2` (PR #240) published the exchange client and the manual (TASK-1890
  complete). Forward-fix migration `20260926071321910`: the client policy had `requireOnPrivilegedAction=false`; the V1
  schema requires `true`, so the exchange answered 503. Gateway fix PR #20 (`958c9de30`, secret mounted in the deploy step)
  now serves `efeonce-mcp-gateway-00061-sbc` at 100 % with the flag ON. A real MCP session (public client PKCE token)
  returned: attention, 5 campaigns, CMP-001 detail, asset detail, WebP preview 640×360, and `not_found` for a foreign org.
  Not exercised live: denial for a person without the capability (needs a second login; covered by tests).

## TASK-1896 — observability, alerts and verified restore (complete 2026-09-26)

**Production closure (2026-09-26):** Sentry project `efeonce-marketing-studio` (org `efeonce-group-spa`, id
`4512153019809792`) created **in the UI** (the API answers «Your organization has disabled this feature for members»);
server-side scrubbing via `sentry.sh`; DSN secret `marketing-studio-sentry-dsn` v1; Vercel `SENTRY_DSN` +
`NEXT_PUBLIC_SENTRY_DSN` in production and preview. Uptime check `studio-api-v1-health-A2vbXH5AjzI` (4 regions, 5 min,
matcher `"database":"reachable"`), policy `17467591732187545239`, email channel `11422563510758505577` →
`jreyes@efeoncepro.com`. `studio.ops_run` in prod (migration `1790409464603`). Role `marketing_studio_restore`
(limit 3); CONNECT granted by the DB owner `marketing_studio_migrator` (Studio `f9e6cbb`). Job
`marketing-studio-restore-rehearsal` + bucket `efeonce-marketing-studio-restore-dumps`: staging succeeded (18 tables,
restore 2 s, job 64 s), forced failure `parity_mismatch` exit 1 (90 s), production succeeded (18 tables, restore 2 s,
job 49 s); scheduler ENABLED (Tue 05:30 Santiago, first run 2026-09-29). Deep health in prod with the Greenhouse
`studio:health` token: all `ok` except `greenhouse_metrics` `not_configured` and `overdue_unverified_posts` `degraded`
(3 real overdue posts). Greenhouse release `92002873ced9` (PR #243): signal, Teams destination, ops-worker endpoint;
`ops-worker-00719-gbm`; canary 200 `warning`, `alerted: false`; scheduler `ops-marketing-studio-health-watch` ENABLED.
**Follow-ups (non-blocking):** port `sentry.sh` step 4 to the Workflows API (3 custom rules not created; default
high-priority workflow active), source-map token, forced prod error, simulated uptime outage, real Teams message on
`error`, first scheduled rehearsal, requestId vs Vercel logs in prod, first-month cost.

### Code-complete record

**Studio commits (local `main`, not pushed):** `3d9a497` `@studio/observability` + Sentry 11 catalog · `978c414`
`studio.ops_run` · `cf109e6` web Sentry, request id + JSON logs, deep health, `studio:health`, run registry in
import/renditions · `ae40780` `withSentryConfig` import · `fc69c5e` restore rehearsal · `923762f` infra scripts ·
`a4cdc75` AGENTS rules · `7f348b2` warm DB latency. **Greenhouse (`develop`, not pushed):** `0498c7964` signal +
Teams alert + ops-worker endpoint · `e757aaba5` paused scheduler + secret ref in `deploy.sh`.

| Runtime | Component | State | Evidence |
|---|---|---|---|
| Studio code | observability, deep health, ops_run, rehearsal | code complete | `pnpm check` exit 0 + `pnpm build` OK in an isolated copy of HEAD (other agent's partial `asset.kind` type neutralized only in the copy) |
| Staging DB | `studio.ops_run` | applied 2026-09-26 | table, 3 indexes, trigger, runtime grants (INSERT/SELECT/UPDATE) verified |
| Staging DB | deep health reader | exercised read-only | `overdue_unverified_posts=3`, `metricool_readback=never_ran`, `restore_rehearsal=never_ran`, worker/metrics `not_configured` |
| Local throwaway PG | rehearsal | verified | success (18 tables parity), forced failure exit 1, lock exit 3, temp DB dropped, down/up of ops_run |
| Local `next start` | request id + deep health | verified | `X-Correlation-Id` = `requestId` of `studio_request`; deep 200 with `studio:health`; 401 bad token; 403 on `/campaigns` |
| Production DB | `studio.ops_run` | **pending** | `pnpm migrate up` with the migrator against `marketing_studio` |
| Sentry / Vercel / Monitoring / Job / Scheduler / secrets | — | **pending** | scripts in `scripts/ops/infra/` (dry-run printed OK) |
| Greenhouse | signal + alert | code complete | focal tests (`src/lib/reliability` 675 passed; alert + contract tests), `pnpm typecheck` exit 0; needs release + Vercel env + secret |

Flags: none new. Teams destination `marketing-studio-reliability-alerts` («EO - Admin», operator decision 2026-09-26).
Not done: Sentry project, uptime check, production migration, rehearsals in Cloud SQL, scheduler activation, Greenhouse
release. Hand-off: run the scripts in the order of the restore runbook; TASK-1893's worker should `initSentry` from
`@studio/observability/node` and report with `captureWithDomain(…, 'media_worker')`.

## TASK-1893 — original asset store + media worker (complete 2026-09-26)

**Production closure (2026-09-26):** buckets `efeonce-marketing-studio-originals[-staging]` verified (PAP, UBLA,
versioning, soft delete 30 d, lifecycle, no public bindings); SAs, custom role, topics + DLQ, OIDC push (ack 600 s, DLQ
after 5), `OBJECT_FINALIZE` notification on `originals/`. Migration `1790409193629` on staging + prod; PG worker roles
(CONNECT by owner, Studio `82aeab6`). Worker prod `00001-sgb`, staging `00002-svt`. Ingest dry-run both envs
`to_upload 30, unverifiable 24`; apply both envs 30/30, re-run staging `already_gcs 30`. Worker 30 `original_finalized`
per env (+ expected `media_object_pending` retries 25/27), DLQ 0; renditions thumb 54, preview 54, poster 4, crop_1x1
11, crop_16x9 5, crop_4x5 2; sweep repaired a wiped version in staging. Download canary prod
(`STUDIO_ORIGINAL_DOWNLOADS_ENABLED=true` prod only): 200 + 10-min V4 URL (GET 200, 3.1 MB), anonymous 403, foreign org
404, OneDrive-only 404 `original_not_stored`, audit recorded, temp client revoked. Metricool token v1, userId 3116862,
blogs verified; readback 6 candidates / 5 observed / 2 published / 1 not_found. Capability shipped in `92002873ced9`.
**Follow-ups (non-blocking):** 24 CMP-002 images without sha256, gateway federation of `studio.asset.download`
(manifest sync + exchange scope + new client with `studio:assets:download` + rotated gateway token), preview download
flag, first-month cost.

### Code-complete record

**Studio commits (local `main`, not pushed):** `ef2d253` migration `1790409193629_media-originals` · `4884fb9` domain
(ingest, download, rights, derivatives, tiering, worker_run, Metricool readback) + contracts (API 1.2.0, tool
`studio.asset.download`, 13 tools / 5 exclusions, hash `02db316d2d2e…`) + web route + `apps/worker` + CLIs ·
`0c8b164` infra scripts · `697c97c` AGENTS router. **Greenhouse (`develop`, not pushed):** `f98c63bff` capability
`marketing_studio.asset.download` (catalog + seed migration `20260926075619118_…` NOT applied + grant admin/account/
operations).

| Runtime | Component | State | Evidence |
|---|---|---|---|
| Studio code | all slices | code complete | `pnpm check` green, `pnpm build` OK; V4 signature identical byte by byte to `@google-cloud/storage` 7 |
| Staging DB | migration `1790409193629_media-originals` | applied 2026-09-26 | up → down → up; constraints validated; runtime grants |
| Staging DB | domain end to end | verified (rolled back) | `media.integration.test.ts` with the app role: ingest dry/apply/idempotent, dedup, rejected, drift, download gates + audit, rights `expired`, import guard + sha adoption, derivatives + sweep, readback published |
| Staging data | `media:ingest` dry-run | run 2026-09-26 | 54 versions: `to_upload` 30, `unverifiable` 24 (CMP-002 images without sha in the catalog), rest 0 |
| Local | worker boot + `/healthz`; toolkit on real OneDrive files | verified | poster 1080×1350 JPEG, crop 1080×1080, probe duration 15 104 ms |
| Local `next start` (staging) | download route + DTOs | verified | anonymous 403 `download_disabled`, bad bearer 401, `rights.status` + `storage.available` in `/assets/{id}`, API 1.2.0 |
| Production DB / GCP / Vercel / gateway / Greenhouse release | — | **pending** | exact commands in the runtime handoff §Originales y worker |

Flags at code complete (all off; mirrored in the Greenhouse ledger since closure): `STUDIO_ORIGINAL_DOWNLOADS_ENABLED`
(Vercel), `MEDIA_WORKER_DERIVATIVES_ENABLED` / `_METRICOOL_READBACK_ENABLED` / `_ARCHIVE_TIERING_ENABLED` (SoT
`apps/worker/deploy.sh`). Hand-off: **apply the production migration before pushing Studio `main`** (readers now select `media_object` and
rights columns); gateway federation of `studio.asset.download` needs its own capability in the exchange and a new
`api_client` with `studio:assets:download` (scopes are immutable). Metricool: `marketing-studio-metricool-api-token`
(the `userToken`) + `METRICOOL_USER_ID` in `deploy.sh`; blogs `3961547` (Efeonce Group) and `5105024` (personal).

## TASK-1894 — write commands; Entregable A = ingest door (in production 2026-10-02)

**Studio commits (`main`, pushed = Vercel prod):** `a450a3c` ingest door · `3fe85a2` CMP-004 seed (concepts S01–S08,
BF1–BF3; `creativeState approved`; CDR-012) · `aa91ce3` anonymous gets `write_not_allowed` before body validation ·
`43e4711` CLI header: where the `studio:upload` token comes from · `23e5787` the pieces grid shows every ratio the
campaign has (1,91:1). `GET https://studio.efeonce.org/api/v1/health` →
`version 1.3.0`.

- **Migration** `1790956839977_asset-ingest-door.sql` applied 2026-10-02 (migrator) on `marketing_studio_staging` and
  `marketing_studio`: `asset.revision`; `asset_version.{origin, review_state, created_by, original_filename,
  reviewed_by, reviewed_at, review_note}` + CHECKs `asset_version_origin_review_chk` / `asset_version_reviewed_chk`;
  tables `studio.asset_upload` (24 h) and `studio.idempotency_record` (24 h).
- **Kernel** `packages/domain/src/commands/kernel.ts` (`runCommand`, `authorize`, `requestDigest`,
  `sweepIdempotencyRecords`); **upload** `packages/domain/src/media/upload.ts` (`requestAssetVersionUploadCommand`,
  `createAssetVersionCommand`, `completeAssetVersionFromUpload`, `verifyUploadedOriginal`, `sweepUploads`);
  `filename-convention.ts`; `commands/review.ts` + CLI `pnpm studio:review` (operator only — early Slice 4 for the
  operator). Importer guard: no catalog versions on pieces with `origin='studio'` versions (`skipped_studio_owned_asset`).
- **Contracts:** 20 operations with explicit `riskTier` (18 reads T0 + 2 writes T1); new tools
  `studio.asset.upload.request` and `studio.asset.version.create` (capability `marketing_studio.asset.write`, scope
  `studio:assets:write`); manifest 15 tools (hash regenerated). New `api_client` scopes `studio:assets:write`,
  `studio:write`. Details: `contracts.md` §Writes.
- **Infra:** `media-originals.sh --upload-door --apply` on staging + production (runtime `objectCreator` and worker
  custom role `marketingStudioOriginalsDeleter`, both conditioned to `originals/sha256/`; CORS PUT/POST).
- **Flags:** `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED=true` staging (`marketing-studio-media-worker-staging-00003-2h9`) and
  prod (`marketing-studio-media-worker-00002-hzn`, image `3fe85a228e0d`); `STUDIO_UPLOADS_ENABLED=true` Vercel
  Production (2026-10-02) and Preview only for branch `task-1894-upload-door`. Order: worker before web. Derivatives
  and readback untouched.
- **CLI deviation from the spec:** the spec had `studio:upload` as `operator_cli` impersonating the ingest SA; it was
  built over HTTP as an `api_client` with `studio:assets:write` (one door, no signing from the CLI). Token secrets
  `marketing-studio-upload-cli-token` (prod) / `marketing-studio-upload-cli-token-staging`.

| Runtime | Component | State | Evidence |
|---|---|---|---|
| Studio code | door, kernel, review, contracts | shipped | unit (kernel, inference, rights, V4 signing) + `upload.integration.test.ts` against staging (rolled back) green; `pnpm check` green |
| Staging | end-to-end canary (via `vercel curl`, previews have no bypass) | verified | anonymous 403 `write_not_allowed`; dry-run no writes; signed PUT 200; confirm 202→202→201 (`CMP004-S01-imagen-4x5` v1 `pending_review`); `worker_run` `versions_created 1, generated 5`; `studio:review approve` → `currentVersion` approved, `pendingVersionNo` null |
| Production | seed import | applied | 11 new concepts; second apply 0 rows |
| Production | 33 CMP-004 pieces via `studio:upload --new-asset`, license `ai_generated`, note «Aprobada por el operador el 2026-10-02 (CDR-012)» | done | 33 versions `origin=studio`, 33 unique sha256 = `CONTROL-DE-PIEZAS.csv` (OneDrive), 33 `pending_review`, 132 derivatives, 33 uploads `completed`; pieces `CMP004-<S01..S08\|BF1..BF3>-imagen-<4x5\|9x16\|1x1>` |
| Production | 33 CMP-004 versions approved (`studio:review approve`) | done | the operator approved `S01` 4:5 himself; the other 32 were recorded in his name at his request |
| Production | 11 horizontals 1,91:1 (S01–S08, BF1–BF3) via `studio:upload … --new-asset --concept CMP004-<key> --title "<title> · 1,91:1" --ratio 191x100`, approved with `studio:review approve` (reviewer «Julio Reyes», note «Aprobada por el operador en el canvas el 2026-10-02 (CDR-012)») | done | ratio stored as `191x100` (API demands `^\d+x\d+$`); worker ratio check accepts 2048/1072 = 1,9104 within 1 %. **CMP-004: 44 pieces approved, 0 pending review** |
| Studio prod | grid of pieces showed fixed columns (16:9, 1:1, 4:5, 9:16): the 1,91:1 were loaded and approved but invisible | fixed `23e5787` | `PiecesWorkspace.tsx` adds the ratios present in the campaign, widest to tallest; `ratioLabel('191x100')` → «1,91:1» (`copy.ts`, test in `copy.test.ts`); `pnpm check` + `pnpm build` green; verified in browser at `studio.efeonce.org/campaigns/CMP-004` (column «1,91:1» first, with thumbnails) |

Uploaded versions stay `pending_review` (not current) until `pnpm studio:review approve …` runs; all 44 CMP-004 pieces
are approved as of 2026-10-02. Approving does not authorize media (`media_authorization` stays `pending`).

**Pending (not done):**

- Greenhouse: capability `marketing_studio.asset.write` in `entitlements-catalog.ts` + `capabilities_registry` seed +
  grants (`efeonce_admin`, `efeonce_account`, `efeonce_operations`, `designer`) + release — **not authorized by the
  operator this session**. Not blocking today: the kernel refuses session persons (TASK-1898) and API clients use scope.
  *Update 2026-10-02 (night): catalog + seed + grants landed on `develop` (`9d0d698d4`) with Entregable B; production
  release still not authorized.*
- Gateway: `pnpm studio:manifest:sync` not run; the write tools would be dropped by `write_tool_without_scope_class`
  until TASK-1899.
- Spec of Entregable A not yet built: `ChannelValidator` port and `CommandResult.warnings` (TASK-1905 plugs them);
  `operations.ts` has no entry for `studio:review` (operator CLI; exclusion still to decide).
- Entregables B and C (Slices 4–10). API approval (`approveAssetVersion`) = Slice 4 + TASK-1899.
- Browser upload from previews: GCS CORS has no partial wildcards (`https://*.vercel.app`); validate in TASK-1895.

### Entregable B — catalog commands (code complete 2026-10-02, verified in staging, NOT in production)

Operator decisions (2026-10-02): scope "close A + Entregable B"; Entregable C (campaign cutover, OneDrive retirement)
later; Greenhouse only up to `develop`/staging; media authorization is a person's decision — Claude does not run it.

**Studio:** commit `a8c7886` on **local** `main`, **not pushed** (pushing `main` = Studio production deploy; the session
permission classifier blocked it as «Production Deploy»; the operator runs `git push origin main`). Branch
`task-1894-entregable-b` (same commit) is on origin; its preview `efeonce-marketing-studio-62vtv3yrm…` (staging DB)
was verified.

- **Migration** `packages/database/migrations/1790967435017_catalog-write-commands.sql` (additive) applied 2026-10-02
  on `marketing_studio_staging` AND `marketing_studio` (prod): `campaign.source_of_truth` (`onedrive` default |
  `studio`) + `cutover_on` + `cutover_by` + CHECK `campaign_cutover_chk` (studio ⇔ cutover_on); `revision` on
  `concept`, `ad_configuration`, `media_flight`, `scheduled_post`; `budget_line.updated_at/approval_ref/approved_by/
  approved_at`; tables `campaign_brief`, `campaign_brief_audience`, `campaign_brief_kpi`. The 5 real campaigns stay
  `onedrive`.
- **Slice 4:** table-driven state machines (`packages/domain/src/state-machines`) + review/transition/approval
  commands (`contracts.md` §Catalog commands).
- **Slice 5:** campaign, brief, concept, asset and rights commands. **Slice 6:** copy, ads, flight, budget lines,
  scheduled posts (Studio plans `PLANNED`, cancels `CANCELLED`, never publishes).
- **Slice 7:** 29 write routes + `GET /api/v1/campaigns/{id}/brief` (`studio.campaign.brief.get`); registry split by
  slice; `CampaignDetail.permissions`; `revision`/`ETag`; API 1.4.0; manifest 44 tools (hash `6478cab73538`); CLI
  `pnpm studio:write`; `ChannelValidator` port (default adapter, no validation) + `warnings` on every write result.
- **Greenhouse** (`develop` `9d0d698d4`, on `origin/develop`): capabilities `marketing_studio.asset.write` +
  `marketing_studio.campaign.write` (`create`/`update`, scope `tenant`) in `entitlements-catalog.ts`; migration
  `20261002185625608_task-1894-marketing-studio-write-capabilities.sql` applied on the shared instance (SELECT: both
  live); grants `efeonce_admin`, `efeonce_account`, `efeonce_operations`, `designer`; coverage test green. **No
  production release** (operator decision pending).
- **Gateway** (`efeonce-mcp`): change **prepared, not synced, not committed** (isolated scratchpad copy, branch
  `task-1894-studio-write-manifest` from `origin/main` `8ff029d`). The classifier blocked `studio:manifest:sync`
  («Merge Without Review»). See `contracts.md` §Gateway contract and `lessons.md`.

| Runtime | Component | State | Evidence |
|---|---|---|---|
| Studio code | commands, state machines, permissions, CLI | code complete | gates, lint of the changed files, `mcp:manifest:check`, typecheck, 134 tests (contracts 9, domain 118 + 4 skipped, web 7); catalog/plan/upload integrations against staging (rolled back). Full `pnpm check` fails ONLY on 2 lint errors in `StatusBar.tsx`/`StatusLive.tsx` from another session (`aaed507`/`5756d2b`) |
| Staging | sandbox `CMP-900` via `createCampaign` (org Efeonce, synthetic) + CLI | verified | creative `unknown→in_production→final_available→approved` (`approveCreative --confirm`); media `unknown→pending→authorized` (`authorizeMedia`); guards seen: `precondition_required`, `invalid_state_transition`, `approval_requires_dedicated_command`, T2 without `--confirm`, `revision_conflict`, `campaign_not_studio_owned` on CMP-004 |
| Staging preview | HTTP with the test `api_client` | verified | permissions + `ETag`; anonymous 403 `write_not_allowed`; concept 201 + replay `Idempotent-Replayed: true`; bearer approval → `approval_requires_person`; CMP-004 → 409; literal brief (curly quotes, `\n\n`, trailing space) with `ETag`; copy byte-for-byte; flight + plan with `flightId`/`revision` |
| Staging | test `api_client` «Pruebas de escritura TASK-1894 B (staging)» | created | scopes `studio:read` + `studio:write` + `studio:assets:write`, org Efeonce; token in `marketing-studio-write-tests-token-staging` (never printed) |
| Production | migration `1790967435017` | applied | additive; 5 real campaigns `onedrive`. **Code not deployed** |
| Greenhouse | two write capabilities | `develop` only | coverage test green; no prod release |
| Gateway | read-only federation filter | prepared | not committed, not synced |

**Gateway synced 2026-10-02** (efeonce-mcp#23 merged `1ddc7db`, v1.10.0, writes in the manifest but never
federated — `MARKETING_STUDIO_FEDERATED_TOOLS`). Deployed by the operator (revision `efeonce-mcp-gateway-00064-q6w`).
**Pending (operator):** Greenhouse production release. Deferred: Entregable C (Slices 8–10); TASK-1898/1899 (session person, T2 confirmation by API,
write federation). CMP-004 media authorization stays in the OneDrive catalog until its cutover (C); in Studio it can
only be authorized on Studio-governed campaigns, by a person, with `pnpm studio:write authorizeMedia … --apply --confirm`.

## Sessions

- 2026-09-25 — Skill created from the verified facts inventory (Studio `d3ab68e`, gateway `9b93d6a`).
- 2026-09-26 — TASK-1896 implemented in code (parallel with TASK-1893 in the same checkouts); rollout pending.
- 2026-09-26 — TASK-1893 implemented in code (Studio `ef2d253`…`697c97c`, Greenhouse `f98c63bff`); rollout pending.
- 2026-09-26 — TASK-1893 and TASK-1896 rolled out to production and closed (Greenhouse release `92002873ced9`).
- 2026-09-26 — ADR accepted by the operator: Studio + GCS as single source of truth, OneDrive as workshop, one command
  (`createAssetVersion`) with three doors (CLI, MCP, UI), human approval, dated per-campaign cutover; Graph mirror not
  planned (`docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`). Docs only.
- 2026-10-02 — TASK-1894 Entregable A (ingest door) shipped and rolled out to staging + production (Studio `a450a3c`,
  `3fe85a2`, `aa91ce3`, `43e4711`; API 1.3.0, 15 tools); 33 CMP-004 finals uploaded, pending operator review.
- 2026-10-02 (later) — the 33 CMP-004 versions approved; 11 horizontals 1,91:1 uploaded (`--ratio 191x100`) and
  approved: CMP-004 = 44 pieces approved, 0 pending. Studio grid bug (fixed ratio columns hid 1,91:1) fixed in `23e5787`.
- 2026-10-02 (night) — TASK-1894 Entregable B code complete and verified in staging (Studio `a8c7886` on local `main`,
  not pushed; branch `task-1894-entregable-b` preview; API 1.4.0, 44 tools; migration `1790967435017` on both DBs;
  sandbox `CMP-900`). Greenhouse `9d0d698d4` (two write capabilities, `develop` only). Gateway change prepared, not
  synced. Entregable C deferred.
- 2026-10-03 — Data operation (outside a task): spot «Los Sparks» (49,6 s, 16:9) loaded to CMP-001 «Lo que la IA dice de
  ti» as concept CMP001-08 by the TASK-1893 regime (CMP-001 is `onedrive`): OneDrive finals → `CATALOGO-DATOS.json` →
  `import:catalog --apply` (concept +1, assets +5, versions +5, copies +2) → `media:ingest --campaign CMP-001 --apply`
  → worker renditions → `ASSETS.md`. CMP-001 now 8 concepts, 33 assets (28 images, 5 videos), 50 copies; the 5 versions
  `gcs`, `imported` (approval pending, human). Organic piece (paid not authorized until the music license); organic
  destination `https://think.efeoncepro.com/brand-visibility`; copies «propuesta». Recipe: `operations.md` §New concept
  with finals in an OneDrive-governed campaign.

## TASK-1998 / TASK-1999 — video playback (code complete 2026-10-04, rollout pending)

Problem (verified 2026-10-04): videos had only `thumb`/`preview`/`poster`; no `<video>` in the web; `/api/v1/media/{token}`
buffered whole objects through the function (no Range, Vercel 4.5 MB response cap); `asset_rendition` CHECK admitted
image mimes only; the board drew ONE piece per concept × kind × ratio (`CMP001-08-video-16x9-instagram` was
unreachable) and the ghost cell said «solo video» even in the Videos tab.

**Studio commits (local `main`, NOT pushed — push = production deploy, needs the operator):** `f5ae10a` migration +
worker + transport + contract · `995bb73` Range proxy for `next dev` without signer · `35093c3` player UI.

- Migration `1791129772182_video-playback-rendition.sql`: `kind` + `playback`, `mime_type` + `video/mp4`, CHECK
  `asset_rendition_playback_mime_chk` (`kind = 'playback'` ⇔ `video/mp4`); Down aborts with playback rows.
- Worker: `MediaToolkit.transcodePlayback` (`playbackArgs`: libx264 faster CRF 23 ≤ 2.5 Mbps, yuv420p, short edge
  ≤ 720 never upscaled, AAC 128k if audio, `+faststart`, no metadata); frame extracted lazily; flag
  `MEDIA_WORKER_PLAYBACK_ENABLED` (`deploy.sh`: staging `true`, production `false`). Real file: «Los Sparks» 36.4 MB →
  7.7 MB 1280×720 in ~20 s CPU.
- Transport: `getMedia` for `video/*` → 302 to V4 (1 h, `response-content-type`), redirect cached 5 min; signer
  `STUDIO_MEDIA_SIGNER_EMAIL` → `STUDIO_DOWNLOAD_SIGNER_EMAIL` → `GCP_SERVICE_ACCOUNT_EMAIL`; none → 503
  `playback_unavailable`; `next dev` without signer → Range proxy (never on Vercel).
- Contract: `PlaybackRendition { url, posterUrl (= preview), mimeType 'video/mp4', widthPx, heightPx, byteSize }`;
  `Asset.playback`, `AssetVersionDetail.playback` (null = not video / not generated); glossary `playback`; API 1.5.0;
  manifest 44 tools hash `60dfac7524ee`.
- UI: `MediaVideo` (native controls, `preload=metadata`, `playsInline`, no autoplay/loop, one retry, not-ready and
  error states); story layers `pointer-events: none` + 76 px free band; board shows every piece per cell with a
  variant label, duration on video thumbs, ghost cell → «Ver video» / «Ver imagen».

| Runtime | Component | State | Evidence |
|---|---|---|---|
| Studio code | all of the above | code complete | `pnpm check` exit 0 (domain 124 + 4 skipped, worker 6, web 8, contracts 9, gates, manifest), `pnpm build` OK; real ffmpeg transcode tests (h264/aac, moov before mdat, 1920×1080→1280×720, 1080×1920→720×1280, 640×360 kept) |
| Staging DB | migration `1791129772182` | applied 2026-10-04 | up → down → up; 3 constraints in `pg_constraint` |
| Staging data | 4 `playback` rows + objects | generated from local with `generateDerivatives` (same primitive, ADC) | second run `up_to_date`; delete-one + rerun → row back with `uploaded 0` |
| Local `next dev` (staging DB) | contract + transport + UI | verified | `playback` present for video, null for image; Range `206`; tampered token `not_found`; Playwright (Chrome) desktop 1440, mobile 390, story, dark + reduced motion: paused on load, `readyState 4`, duration = `durationMs`, seek OK, `error null`, scrollWidth = clientWidth; ghost «Ver video» opens the video piece |
| V4 read signing | `signReadUrlV4` + `response-content-type` | verified | signed as `marketing-studio-ingest-stg@` on a staging original → GCS `206 video/mp4`; on the media bucket → `AccessDenied` (permissions, not signature) |
| Staging worker | flag ON | **not redeployed** | — |
| Production | migration, worker, web, gateway sync | **pending (operator authorization)** | — |

**Hand-off (exact order):** (1) redeploy staging worker (`bash apps/worker/deploy.sh --env staging --apply`); (2)
migration `1791129772182` on `marketing_studio`; (3) `PLAYBACK_ENABLED="true"` for production in `deploy.sh` →
commit → `deploy.sh --env production --apply` → `gcloud scheduler jobs run marketing-studio-reconcile-derivatives`
(6 videos; check `worker_run` and `studio.asset_rendition` kind `playback` = 6); (4) `git push origin main` (Studio) →
health `1.5.0` → `curl -I` media link of `CMP001-08-video-16x9` → 302 → final `206`; (5) gateway `studio:manifest:sync`
+ version bump + PR + dispatch (descriptions only; the gateway does not validate output schemas). «Los Sparks»
(CMP001-08) only exists in production: staging was never imported/ingested for it.
- 2026-10-04 — TASK-1998/1999 (video playback) code complete; migration on staging; 4 staging `playback` derivatives; localhost verified; production rollout pending authorization.
