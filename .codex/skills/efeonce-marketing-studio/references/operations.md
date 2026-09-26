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

- Import is idempotent (re-import inserts 0). Renditions: thumb 640 px / preview 1600 px WebP (quality 78/82),
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
