# Efeonce Marketing Studio — operations

Verified 2026-09-25. Commands run from `~/Documents/efeonce-marketing-studio` unless stated. Never print secret
values; pipe them.

## Local setup and gates

```bash
NODE_AUTH_TOKEN="$(gh auth token)" pnpm install   # AXIS registry requires a token
pnpm check          # gates (absolute-path, domain-boundary, dependency-catalog) + mcp:manifest:check + typecheck (incl. theme:check) + tests
pnpm build          # production build of apps/web (TS 7 type check runs inside next build)
pnpm dev            # http://localhost:3100 — apps/web/.env.local with STUDIO_PG_* pointing to the 15433 proxy (staging DB)
```

Toolchain: Node 24 LTS, pnpm 10.32, Next.js 16.3.6 (Turbopack), React 19.3, TypeScript 7.0.2, Vitest 5, Kysely 0.29,
Zod 4.6.5 (single copy via `overrides`), node-pg-migrate 9. Upgrades: change the `catalog:` in `pnpm-workspace.yaml`
→ `pnpm install` → `pnpm check` → `pnpm build` → compare `localhost:3100` against staging. pnpm 12 not adopted
(verify Vercel support first).

## Database access (CLI)

```bash
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15433     # own port, never Greenhouse's
# migrations (migrator credential; table studio_pgmigrations, --check-order)
DATABASE_URL="postgres://marketing_studio_migrator:<secret>@127.0.0.1:15433/<db>" pnpm migrate up
# app-role env for CLIs
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_DATABASE=<db> STUDIO_PG_USER=<app role> \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=<app password secret>)" <command>
```

Migrations: `-- Up Migration` / `-- Down Migration` + `DO … RAISE EXCEPTION` verification block. Roles only by SQL
under `SET ROLE cloudsqlsuperuser`.

## Import and renditions

```bash
pnpm import:catalog --catalog "<…>/Campaign Manager/CATALOGO-DATOS.json" \
  [--registry scripts/seeds/campaign-registry.json] \
  [--readback "CMP-003=<…>/metricool-readback.json"] [--apply]          # dry-run executes and rolls back
pnpm media:renditions --root "<…>/Alineación/5. Contenidos" --bucket <bucket> [--apply] [--force]
```

- Import is idempotent (re-import inserts 0). Since TASK-1893 it never degrades a `gcs` version and adopts a
  catalog sha256 into the same null-sha version (same path) instead of inserting a new version. Renditions: thumb 640 px / preview 1600 px WebP (quality 78/82),
  videos framed at 1 s with `ffmpeg`, object named by version + sha, upload with `ifGenerationMatch=0`, row upsert.
  Requires ADC with write on the bucket. Order: staging DB/bucket first, then production.

## API clients

```bash
<app-role env for target DB> pnpm api-client:create --label "<who>" --org org-… [--org …] --scope studio:read --token-only \
  | gcloud secrets versions add <secret-id> --data-file=-
gcloud secrets add-iam-policy-binding <secret-id> --member=serviceAccount:<consumer SA> --role=roles/secretmanager.secretAccessor
<app-role env> pnpm api-client:revoke --id <api_client_id> --reason "<why>"
```

Only `operator_cli` actors can create/revoke; both write `studio.audit_event`. The gateway's production client lives
in `marketing-studio-mcp-gateway-token` (v1, org Efeonce).

## Tool manifest

```bash
pnpm mcp:manifest:generate   # after any change to operations.ts / semantics.ts / DTOs used by tools; commit the artifact
pnpm mcp:manifest:check      # part of pnpm check
```

## Deploy (Studio)

- Deploy = **push to `main`** (Vercel production, automatic). Commit author email must be `jreyes@efeonce.cl`.
- Before any `vercel` command: `cat .vercel/project.json` → `prj_dztLezZkYxAJikDuPSdT9QROEJRS`; pass
  `--scope efeonce-7670142f` for ad-hoc commands.
- Env vars: `vercel api` env POST takes **one object per request** with `--input`; `vercel env add NAME preview ""`
  applies to all preview branches. A deployment only sees vars that existed when it was built: redeploy after adding.
- Protected preview: `vercel curl /api/v1/health --deployment <url> --scope efeonce-7670142f`.
- Certificate stuck after DNS: `vercel certs issue studio.efeonce.org --scope efeonce-7670142f`.

## Verification curl set (production)

```bash
B=https://studio.efeonce.org
curl -s $B/api/v1/health                                          # 200, database: reachable, accessMode: open
curl -s -o /dev/null -w '%{http_code}\n' $B/api/v1/campaigns      # 200 (open mode, no bearer)
T="$(gcloud secrets versions access latest --secret=marketing-studio-mcp-gateway-token)"
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $T" $B/api/v1/attention                                   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $T" "$B/api/v1/campaigns?organizationId=org-foreign-x"    # 404
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer mst_invalid" $B/api/v1/campaigns                          # 401
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -H "Authorization: Bearer $T" "$B/api/v1/assets/<assetId>/preview" # 200 image/webp
curl -s $B/api/v1/tool-manifest | jq -r '.manifestHash, (.tools|length), (.exclusions|length)'                            # hash, 12, 5
```

Image load check (the 2026-09-25 regression): request the signed `thumbUrl`s of a full grid concurrently — expected
108/108 OK. Never keep the token in shell history longer than needed (`unset T`).

## Rollback (Studio)

| What | How |
|---|---|
| Deploy | `vercel rollback` to the previous deployment, or redeploy a previous commit |
| Data | Re-import the source (idempotent). Full undo: `DROP DATABASE marketing_studio` (does not touch Greenhouse) |
| Renditions migration | `pnpm migrate down` |
| Media secret | Rotating `STUDIO_MEDIA_URL_SECRET` invalidates live links; pages regenerate them on reload |
| API client | `pnpm api-client:revoke` (immediate 401) |
| Domain | Remove the CNAME or the project domain |

## Gateway provider (`efeonce-mcp`)

Preconditions for turning the provider ON: Greenhouse release in production that contains the exchange client
`efeonce-mcp-marketing-studio`, the capability grants and the served manual; `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`
includes the client in that deployment; secret `marketing-studio-mcp-gateway-token` readable by
`efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com`.

GitHub repo variables (production environment): `MARKETING_STUDIO_PROVIDER_ENABLED` (`true` since 2026-09-26, revision `00061-sbc`),
`MARKETING_STUDIO_API_URL=https://studio.efeonce.org`,
`MARKETING_STUDIO_TOKEN_EXCHANGE_URL=https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/oauth/token`.
The token secret is mounted only when the flag is `true` (the workflow checks the secret exists first).

Flag ON:
```bash
gh variable set MARKETING_STUDIO_PROVIDER_ENABLED --body true -R efeoncepro/efeonce-mcp   # repo-level variable (verified 2026-09-25: deploy 36183601792 read the repo-level MARKETING_STUDIO_* vars)
gh workflow run deploy.yml -R efeoncepro/efeonce-mcp -f exposure=public-oauth -f ingress=internal-and-cloud-load-balancing
gh run watch <run-id> -R efeoncepro/efeonce-mcp
```
Then verify the new revision (Cloud Run `efeonce-mcp-gateway`, `southamerica-west1`) at 100 % with the env var, and run
the canary. Deploys are **manual dispatch only**, never on merge.

Canary (from `~/Documents/efeonce-mcp`, after `pnpm build`):
```bash
MARKETING_STUDIO_API_URL=https://studio.efeonce.org \
MARKETING_STUDIO_TOKEN_EXCHANGE_URL=https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/oauth/token \
MARKETING_STUDIO_API_TOKEN="$(gcloud secrets versions access latest --secret=marketing-studio-mcp-gateway-token)" \
MCP_STUDIO_CANARY_ACCESS_TOKEN=<short-lived Entra delegated token, efeonce.mcp.read, person WITH the capability> \
[MCP_STUDIO_CANARY_DENY_ACCESS_TOKEN=<token of a person WITHOUT it>] pnpm studio:canary
```
Cases: allow (attention + campaign detail + asset detail), preview image, foreign org ⇒ `not_found`, person without
capability ⇒ `forbidden`, unreachable Studio ⇒ `upstream_unavailable`. No token is printed.

⚠️ **The local canary only works if the Google ID token it mints comes from the gateway service account.** From a laptop,
ADC is the operator, and the exchange rejects that actor. An `az account get-access-token` token is also rejected: its
`azp` is Azure CLI, not the MCP client (`GREENHOUSE_MCP_ENTRA_AZP`). **The canonical live canary is a real MCP session:**
1. Run PKCE with the public client `32617b87-e7ef-493a-838f-1ff3f0213b93` (callback `http://localhost:8765/callback`, scope
   `https://mcp.efeonce.org/mcp/efeonce.mcp.read`).
2. Keep the token in a `0600` file.
3. Call `initialize` → `tools/list` → `tools/call` on `https://mcp.efeonce.org/mcp`.
4. Delete the file.

Rollback: set `MARKETING_STUDIO_PROVIDER_ENABLED=false` + dispatch (provider `policy-blocked`, tools not registered);
or `gcloud run services update-traffic efeonce-mcp-gateway --project efeonce-group --region southamerica-west1 --to-revisions <prev>=100` (standard Cloud Run rollback, not yet exercised for this provider; the gateway runbook §Rollback is the canonical procedure).
Revoking the Studio `api_client` cuts the gateway immediately (gateway maps Studio 401 to `upstream_unavailable`).

Manifest change in the gateway: `STUDIO_REPO=… GREENHOUSE_REPO=… pnpm studio:manifest:sync` → tests
(`test/marketing-studio*.test.ts`, `test/authorized-tools.test.ts`, version gate) → `pnpm surface:baseline` →
bump `version` in `package.json` → PR → merge → dispatch. A description change is a breaking surface change (bump).

## Observability and restore (TASK-1896, in production since 2026-09-26)

Live: Sentry project `efeonce-marketing-studio` (id `4512153019809792`), uptime check `studio-api-v1-health-A2vbXH5AjzI`
+ policy `17467591732187545239` (email `jreyes@efeoncepro.com`), rehearsal job + scheduler ENABLED, Greenhouse
scheduler `ops-marketing-studio-health-watch` ENABLED. Two known limits of the scripts: Sentry **project creation**
must be done in the UI (the org disables it for members via API), and `sentry.sh` step 4 (alert rules) is stale —
`/projects/.../rules/` returns 404 because Sentry moved issue alerts to **Workflows**; the default «Send a notification
for high priority issues» workflow is what alerts today.

All infra is idempotent shell in the Studio repo, **dry-run by default** (`--apply` executes; secrets always piped):

```bash
SENTRY_ADMIN_TOKEN=… SENTRY_TEAM=… SENTRY_ALERT_MEMBER_ID=… bash scripts/ops/infra/sentry.sh [--apply]
bash scripts/ops/infra/vercel-env.sh [--apply]                 # then redeploy production + preview
ALERT_EMAIL=<Efeonce work email> bash scripts/ops/infra/monitoring.sh [--apply]   # rejects @gmail.com
bash scripts/ops/infra/restore-rehearsal-job.sh [--apply] [--activate]            # scheduler born paused
bash scripts/ops/infra/greenhouse-health-client.sh [--apply]   # studio:health client → Greenhouse secret
```

Restore rehearsal (details: `docs/operations/marketing-studio/MARKETING_STUDIO_RESTORE_RUNBOOK.md`):

```bash
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_USER=marketing_studio_restore \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-restore-password)" \
  pnpm ops:restore-rehearsal --source marketing_studio_staging [--apply] [--simulate-parity-failure] [--skip-if-recent-days 28] [--dump-bucket <b>]
# exit 0 ok/skipped · 1 failed · 2 guard (source/role) · 3 locked
gcloud run jobs execute marketing-studio-restore-rehearsal --region us-east4 --wait --args=--source,marketing_studio_staging,--apply
```

Order: role by SQL (`scripts/ops/sql/restore-role.sql` as instance admin + `restore-role-grants.sql` as migrator per
DB; `GRANT CONNECT` must come from the DB owner `marketing_studio_migrator`, Studio `f9e6cbb`) → job `--apply` → staging rehearsal → forced failure → production rehearsal (record times in the runbook) →
`--activate`. Local testing of the rehearsal works against a throwaway cluster (see lessons: socket path limit).

Deep health (with a `studio:health` token, never `studio:read`):

```bash
T="$(gcloud secrets versions access latest --secret=greenhouse-marketing-studio-health-token)"
curl -s -H "Authorization: Bearer $T" "https://studio.efeonce.org/api/v1/health?deep=1" | jq '.status, .components, .freshness'
unset T
```

Greenhouse side: Vercel production needs `MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF=greenhouse-marketing-studio-health-token`;
the ops-worker declares it in `deploy.sh`. Alert scheduler `ops-marketing-studio-health-watch` was born paused and was
resumed on 2026-09-26 after the first green production rehearsal. Rollback: DSN empty + redeploy; `pnpm migrate down` (ops_run);
pause both schedulers; disable the uptime policy.

## Originals, download, rights and media worker (TASK-1893, in production since 2026-09-26)

Live flags: `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` production `true`, preview `false`; `MEDIA_WORKER_DERIVATIVES_ENABLED`
`true` staging + prod; `MEDIA_WORKER_METRICOOL_READBACK_ENABLED` `true` prod, `false` staging;
`MEDIA_WORKER_ARCHIVE_TIERING_ENABLED` `false`. Worker revisions: prod `00001-sgb`, staging `00002-svt`. Metricool
`userId` 3116862. Worker PG roles need `GRANT CONNECT` from the DB owner (Studio `82aeab6`).

Full ordered rollout: `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` §Originales y worker.

```bash
# Infra (dry-run by default; staging first). Stage 1 before the worker, --wiring after deploying it.
OPERATOR_PRINCIPAL=user:<email> bash scripts/ops/infra/media-originals.sh --env staging [--apply]
bash apps/worker/deploy.sh --env staging [--apply] [--skip-build]          # SoT of the worker env vars/flags
bash scripts/ops/infra/media-originals.sh --env staging --wiring [--apply]  # push + GCS notification + paused Scheduler
# Worker PG roles: scripts/ops/sql/media-worker-roles.sql (instance admin, passwords piped)
# Ingest (ADC impersonating marketing-studio-ingest[-stg]@; the CLI refuses a bucket that does not match the DB)
pnpm media:ingest --root "<…>/Alineación/5. Contenidos" --bucket efeonce-marketing-studio-originals-staging [--campaign CMP-004] [--apply]
pnpm media:ingest --revert-provider [--campaign …] [--apply]
# ADR 2026-09-26: media:ingest is the TRANSITIONAL door. After a campaign's dated cutover it never creates finals for that
# campaign (history backfill only, then retired); new finals enter by createAssetVersion (CLI studio:upload / MCP / UI).
pnpm media:rights --asset <assetId> --version <n> --license stock --reference "…" [--from YYYY-MM-DD] [--until YYYY-MM-DD] [--territory CL] [--channel linkedin]
# Domain integration test against staging (everything rolled back; app role)
PGPASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-staging-app-password)" \
STUDIO_IT_PG_URL="postgres://marketing_studio_staging_app@127.0.0.1:15433/marketing_studio_staging" \
  pnpm --filter @studio/domain exec vitest run src/media/media.integration.test.ts
```

- **Production migration BEFORE pushing Studio `main`** (readers select `media_object` and the rights columns).
- Flags: `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` (Vercel; preview first), worker flags in `apps/worker/deploy.sh` (change,
  commit, redeploy; never `--update-env-vars` alone). With a flag off the worker answers 2xx and logs `skipped`.
- Download canary: anonymous 403 `download_disabled` · client with both scopes 200 (`expiresAt` ≤ 10 min) · foreign org
  404 · non-ingested version 404 `original_not_stored`. The gateway client needs a NEW `api_client` with
  `--scope studio:read --scope studio:assets:download` (scopes are immutable) → new secret version → revoke the old one.
- Worker runs: `SELECT kind, status, error_code, counts, started_at FROM studio.worker_run ORDER BY started_at DESC`.
  DLQ must stay empty: `gcloud pubsub subscriptions pull marketing-studio-originals-finalized[-staging]-dlq-sub --limit 5`.
- Rollback: flags off + redeploy; pause jobs; delete the bucket notification; `media:ingest --revert-provider --apply`;
  `migrate down` only with no `gcs` version (the Down aborts otherwise).

## New concept with finals in an OneDrive-governed campaign (TASK-1893 regime; verified 2026-10-03, CMP-001)

For a campaign with `source_of_truth = 'onedrive'` a new concept does **not** enter by `createAssetVersion`: it enters
by OneDrive + catalog + import + ingest. Case: spot «Los Sparks» (49,6 s, 16:9) → concept CMP001-08 in CMP-001.

1. Copy the finals to OneDrive `Alineación/5. Contenidos/15. Paid Media/03. Finales/<CMP-### - Name>/` with canonical
   names, e.g. `02 - Videos/16x9/CMP001-08 - Los Sparks - 16x9.mp4`, `01 - Imagenes/{4x5,9x16,16x9}/CMP001-08 - Los
   Sparks portada - <ratio>.png`.
2. Add assets (each with sha256, bytes, dimensions) and copies (`campaigns[].copies`) to
   `01. Recursos/Campaign Manager/CATALOGO-DATOS.json`. Back it up first; keep `indent=2`, `ensure_ascii=False`. The
   concept title comes from its first asset.
3. Check that the live campaign states in the DB equal `scripts/seeds/campaign-registry.json` (else the import reverts them).
4. Import, dry-run then apply:
   ```bash
   STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=<proxy port> STUDIO_PG_DATABASE=marketing_studio \
   STUDIO_PG_USER=marketing_studio_app STUDIO_PG_SSL=false \
   STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-app-password)" \
     pnpm import:catalog --catalog "<…>/Campaign Manager/CATALOGO-DATOS.json" [--apply]
   ```
5. Ingest with ADC impersonating `marketing-studio-ingest@efeonce-group.iam.gserviceaccount.com` (temporary 0600 file in
   the scratchpad, `GOOGLE_APPLICATION_CREDENTIALS` only for this command, deleted afterwards; never touch the default
   ADC or IAM):
   ```bash
   pnpm media:ingest --root "<…>/Alineación/5. Contenidos" --bucket efeonce-marketing-studio-originals --campaign CMP-001 --apply
   ```
6. The worker generates renditions on `OBJECT_FINALIZE` (3 per image, 6 per video). A transient `media_object_pending`
   that resolves itself is not an error: check renditions by DB/API before retrying.
7. Record the rows in the campaign's `ASSETS.md` (`Alineación/2. Campañas/CMP-001_la-ia-dice-de-ti/ASSETS.md`).

Result 2026-10-03: apply concept +1, assets +5, versions +5, copies +2; readback by API CMP-001 = 8 concepts, 33 assets
(28 images, 5 videos), 50 copies; the 5 versions `gcs`, `review_state` `imported` (approval is a separate human step).
Copy fixes: edit the text in the catalog and re-run `import:catalog --apply` (upsert by `copy_id`, no duplicates);
`updated: N` counts every touched row, so verify the field with a read. Stale proxy ⇒ `ECONNRESET`: start a new
one on another port.

## Ingest door: uploads and review (TASK-1894 Entregable A, in production since 2026-10-02)

Live flags: `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` `true` staging (`…-staging-00003-2h9`) + prod (`…-00002-hzn`, image
`3fe85a228e0d`); `STUDIO_UPLOADS_ENABLED` Vercel Production `true`, Preview only branch `task-1894-upload-door`.
**Order: worker before web.** Signer: `STUDIO_UPLOAD_SIGNER_EMAIL` → `STUDIO_DOWNLOAD_SIGNER_EMAIL` →
`GCP_SERVICE_ACCOUNT_EMAIL`. Full runbook: `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` §Subidas.

```bash
# 1. Migration 1790956839977_asset-ingest-door (migrator) on the target DB before pushing main
DATABASE_URL="postgres://marketing_studio_migrator@127.0.0.1:15433/<db>" \
  PGPASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-migrator-password)" pnpm migrate up
# 2. Infra stage (dry-run without --apply): runtime objectCreator + worker custom role marketingStudioOriginalsDeleter,
#    both conditioned to originals/sha256/, and CORS PUT/POST on the originals bucket
bash scripts/ops/infra/media-originals.sh --env staging --upload-door [--apply]
# 3. Worker: UPLOAD_VERIFY_ENABLED="true" in apps/worker/deploy.sh → commit → deploy
bash apps/worker/deploy.sh --env staging --apply
# 4. Web: STUDIO_UPLOADS_ENABLED=true in Studio's Vercel → redeploy

# Upload (HTTP api_client with studio:assets:write — same door as UI/agents; never writes DB or bucket directly)
export STUDIO_API_TOKEN="$(gcloud secrets versions access latest --secret=marketing-studio-upload-cli-token)"   # staging: …-token-staging
pnpm studio:upload <file…> --campaign CMP-### --license <owned|client_supplied|stock|talent|music|ai_generated|mixed> \
  [--asset <assetId> | --new-asset --concept CMP###-<seq> --title "…" --ratio 4x5] \
  [--reference "…"] [--from YYYY-MM-DD] [--until YYYY-MM-DD] [--territory CL] [--channel <key>] [--note "…"] \
  [--dry-run] [--resume <uploadId>] [--base-url https://studio.efeonce.org]
unset STUDIO_API_TOKEN
# Review (operator_cli; STUDIO_PG_* of the target DB, like import:catalog)
pnpm studio:review pending --campaign CMP-###
pnpm studio:review approve <assetId> <versionNo> --reviewer "Nombre Apellido" [--note "…"]
pnpm studio:review request-changes <assetId> <versionNo> --reviewer "…" --note "what to change"
```

- `studio:upload` prints one line per file (`creado <asset> vN · pendiente de revisión`, `duplicado de …`,
  `rechazado: <code>[: reason]`, `pendiente de verificación (retoma con --resume <uploadId>)`); exit 2 = missing
  arguments, 1 = some file failed. `--new-asset` takes one file per call. Idempotency key is deterministic per file and
  target (re-running does not duplicate); confirmation polls 202 → 201 up to 10 min.
- Verification runs in the worker on `OBJECT_FINALIZE` (`verifyUploadedOriginal`); the hourly
  `/jobs/reconcile-derivatives` also runs `sweepUploads` (expire, resume `pending_verification` > 15 min, delete orphans
  > 24 h) and purges idempotency records — both only with `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED`.
- Staging canary through `vercel curl … --deployment <preview> --scope efeonce-7670142f` (Studio previews have no
  bypass secret): anonymous 403 `write_not_allowed` → dry-run → signed PUT 200 → confirm 202→202→201 → `worker_run`
  `versions_created 1` → `studio:review approve` → reader `currentVersion` approved, `pendingVersionNo` null.
- Checks: `SELECT origin, review_state, count(*) FROM studio.asset_version GROUP BY 1,2;` ·
  `SELECT status, reject_code, count(*) FROM studio.asset_upload GROUP BY 1,2;`
- Rollback: flags `false` + redeploy (web → 403 `upload_disabled`; worker via `deploy.sh`); `gcloud storage buckets
  remove-iam-policy-binding … --condition "<same condition>"` for both bindings; `--clear-cors`; `pnpm migrate down` only
  if no version has `origin = 'studio'`.
- **Ratios with decimals:** `--ratio` must be `WxH` integers (`^\d+x\d+$`); a 1,91:1 horizontal (LinkedIn 1200×628,
  Meta horizontal) goes up as `--ratio 191x100` and the UI labels it «1,91:1». Example: `pnpm studio:upload <file>
  --campaign CMP-### --license <…> --new-asset --concept CMP###-<seq> --title "<title> · 1,91:1" --ratio
  191x100`. The grid shows every ratio the campaign has (since `23e5787`); after uploading, check the column in
  `studio.efeonce.org/campaigns/CMP-###`.
- Production state (2026-10-02): CMP-004 has 44 pieces (11 concepts × 4:5, 9:16, 1:1, 1,91:1) `origin=studio`, all
  approved, 0 pending review.

## Catalog commands (TASK-1894 Entregable B — deployed 2026-10-02)

The Entregable B commands are included in production API 1.6.0 (`74073de`). Migration `1790967435017_catalog-write-commands.sql` is
already applied on staging and production (additive; the 5 real campaigns stay `onedrive`). Full runbook:
`docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` §Commands del catálogo.

```bash
# operator_cli with STUDIO_PG_* of the target DB (like import:catalog / studio:review); same primitives as the API
pnpm studio:write --list                                     # operations, risk tier, method + path
pnpm studio:write <operationId> [--param k=v …] [--file body.json] [--if-match N] [--key key]        # dry-run (default)
pnpm studio:write <operationId> … --apply                    # T1 write
pnpm studio:write <operationId> … --apply --confirm          # T2 (approval or destructive): a person, after the dry-run
# e.g. staging sandbox
pnpm studio:write authorizeMedia --param campaignId=CMP-900 --file autorizacion.json --if-match 4 --apply --confirm
```

- Sandbox: `CMP-900` on staging (org Efeonce, synthetic; ids 900+ reserved for sandbox/tests). Never write to CMP-004
  or any `onedrive` campaign: 409 `campaign_not_studio_owned` (the next import would overwrite it).
- Test `api_client` (staging): «Pruebas de escritura TASK-1894 B (staging)», `studio:read` + `studio:write` +
  `studio:assets:write`, org Efeonce; token in `marketing-studio-write-tests-token-staging` (never print it). HTTP
  canary through `vercel curl … --deployment <preview> --scope efeonce-7670142f`.
- Rollback: revoke clients holding `studio:write` (`pnpm api-client:revoke --id … --reason …`); revert the Studio
  deploy; `pnpm migrate down` of `1790967435017` only if no campaign is `source_of_truth = 'studio'` (staging has
  `CMP-900`).
- The Studio push and read-only gateway filter are complete. Greenhouse write capability production rollout and
  new delegated T1 federation remain separate. Prefer `pnpm studio` from Greenhouse for API operator work; the
  `studio:write` examples above are the separate privileged Studio DB operator lane, never an API-auth fallback.

## Video playback (TASK-1998/1999 — production verified 2026-10-04)

```bash
# Migration procedure (already applied to staging and production 2026-10-04)
DATABASE_URL="postgres://marketing_studio_migrator@127.0.0.1:<port>/<db>" PGPASSWORD="…" pnpm migrate up
# Worker: PLAYBACK_ENABLED in apps/worker/deploy.sh (staging and production true); future changes require governed deploy
bash apps/worker/deploy.sh --env staging --apply
# Backfill = the idempotent sweep (batch MEDIA_WORKER_RECONCILE_BATCH); run it now instead of waiting for :07
gcloud scheduler jobs run marketing-studio-reconcile-derivatives-staging --project efeonce-group --location us-east4
# Checks
SELECT a.asset_id, r.width_px, r.height_px, r.byte_size FROM studio.asset_rendition r JOIN studio.asset_version v USING (asset_version_id) JOIN studio.asset a USING (asset_id) WHERE r.kind = 'playback';
curl -s -m 10 -o /dev/null -D - "$B<playback.url>"                      # Vercel: 302 Location storage.googleapis.com
curl -s -m 10 -o /dev/null -D - -H 'Range: bytes=0-1023' "<Location>"   # 206 video/mp4
```

- Localhost: the personal ADC cannot `signBlob` as `marketing-studio-runtime-stg@` (403) — `next dev` proxies with Range
  instead (never on Vercel). The 302 path is proven by signing as an SA you can impersonate on an object it can read.
- Always cap `curl` with `-m` against local dev: a hung `next dev` blocks the call forever (2026-10-04).
- The browser pane screenshot does not capture the video layer (looks black while playing); use Playwright with
  `channel: 'chrome'` (Chromium lacks H.264) or read the frame into a canvas.
- Rollback: `PLAYBACK_ENABLED="false"` + redeploy (existing rows keep serving); revert the web deploy; `migrate down` only
  after deleting `kind = 'playback'` rows.

## TASK-1905 catalog operations (Studio production verified 2026-10-04)

Read Greenhouse `docs/manual-de-uso/marketing-studio/gobernar-catalogo-canales.md` for the full runbook. Both Studio
migrations and catalog seed v1 (52 channels) were applied in staging/production. Web and worker explicitly retain
warn / ICP false. Backfill was inventoried only: 134 unmapped rows, five aliases, review by efeonce_operations.
Do not rerun the seed or apply guessed aliases just because the following commands exist.

- `pnpm channels:seed --dry-run`: validates seed locally without DB. `--file`/`--version` select explicit inputs.
- `pnpm channels:seed --apply --actor <operator>`: governed draft/upsert/publish with deterministic idempotency and
  strict readback; never overwrite a different published seed.
- `pnpm channels:backfill --dry-run`: read-only DB inventory. `--map 'exact raw=canonical_key'` is explicit/repeatable.
- `pnpm channels:backfill --apply --actor <operator> --version <published> --map 'exact raw=canonical_key'`: exclusive
  ops_run, batches of 500, readback; unresolved/concurrent rows remain partial. Original labels/UTM are unchanged.
- `--revert-alias 'exact raw'`: inspect first with dry-run, then apply with actor and `--confirm`; whole-row snapshot
  comparison protects later edits. Cannot combine with --map.
- Validation default warn: findings persisted but write allowed; off: no validation metadata; enforce: unknown/no
  catalog/hard violations block. Recommended limits warn. Invalid flag values fail. Test each environment before promoting.
- ICP disabled by default. Injectable adapter timeout 5 s, success cache 300 s/failure 60 s, organization+version scoped,
  404 => not_entitled and flag-off cache clear. Default reader stays unavailable if enabled without consumer provisioning.
- Remote order: approved migrations and capability grant, seed/readback, legacy inventory/map/readback, controlled
  validation cases, explicit flag promotion. Gateway checkout reconciliation and generated manifest sync precede canary;
  T1 still needs TASK-2003 real authority. No deploy or federation is implied by tests.

- Final local verification: seed52/replay no-op, full PG suite34files216tests zero skips, build PASS, UI1440/390 PASS;
  CLIbackfill dry0/apply1/replay0/revert1 with three successful ops. These are isolated local evidence, not rollout.
- Backfill preserves ANY existing versioned nonempty canonical snapshot, including deduplicated and partially resolved
  arrays. Such arrays require explicit revalidation. Operator maintenance rejects `onlyOrganizationId` before DB access.

## CLI HTTP desde Greenhouse (local, 2026-10-04)

Manual canónico: `docs/manual-de-uso/marketing-studio/operar-por-cli-api.md`. Ejecutar desde Greenhouse, sin
checkout hermano ni acceso PostgreSQL:

```bash
pnpm studio --help
pnpm studio doctor
pnpm studio list --filter copy
pnpm studio describe studio.copy.create
pnpm studio call studio.channels.list
pnpm studio call studio.copy.create --param campaignId=CMP-900 --file copy.json
pnpm studio upload ./pieza.png --campaign CMP-004 --asset '<assetId>' --license owned
pnpm studio download --asset '<assetId>' --version 1 --output ./original.png
pnpm studio:test
```

- Descubre contrato en vivo: 59 tools / 64 operaciones HTTP en API 1.6.0. `describe` es dueño del esquema,
  no una tabla copiada. `call` acepta operationId o nombre `studio.*`; `--file -` acepta JSON desde stdin.
- Escrituras dryRun por defecto, `--apply` ejecuta; `--key` y `--if-match` conservan intención/revisión.
  T2 necesita además `--confirm`, sin conceder autoridad. Nunca cambiar llave/revisión para superar un rechazo.
- Credencial única: `STUDIO_API_TOKEN`, archivo `0600` con `--token-file` o lectura explícita de Secret Manager
  con `--token-secret <nombre> --project <proyecto>`. Nunca token en argv/salida ni credencial enviada a GCS.
  El cliente de cargas existente tiene `studio:assets:write`, no `studio:write`; gobierno global aún deniega bearer.
- `upload` calcula SHA-256 streaming, valida derechos, reserva ticket, transfiere directo a GCS y confirma.
  `--new-asset` requiere concepto/título/ratio; varios archivos sólo con pieza existente/inferencia. Duplicado no
  crea versión. `--resume <uploadId>` retoma confirmación, no bytes; pending sale con código 2.
- `download` verifica tamaño/hash y limpia original incompleto. `call ... --output` permite previews binarios;
  los archivos nunca se sobrescriben. JSON stdout, progreso stderr; recibos privados redactan URLs/tokens.
- Verificado: 18 tests + lint; doctor/catálogo/lectura autenticada y upload dryRun reales. Transferencia aplicada,
  idempotencia, errores y descarga se validaron con HTTP/GCS controlados. No se escribió producción por esta CLI.
- Esto es cliente local, no deploy ni federación MCP. Un 401/403 se reporta; no se cambia a SQL/operator_cli.

## Sonda del worker y evidencia del release (2026-10-04)

Usar `/health` en Cloud Run. `/healthz` queda sólo como compatibilidad local: el path terminado en z devolvía 404
antes de llegar al contenedor; no era un problema IAM. Imagen `74073de1188f`, digest `sha256:7e95c904dd9c01f7c023e56111f4495444220f64f162dfef8d15ce034c96b43e`,
producción `00004-j4h` / staging `00006-p8q`: Ready al 100%, health 200. Vercel Ready y API1.6.0 confirmados.
Rollback conserva esquema expand y catálogo publicado: volver código/imagen, nunca down/borrado como atajo.
Dossier completo: `docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md`.
