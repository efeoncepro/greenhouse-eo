# Efeonce Marketing Studio — architecture map

Verified against code on 2026-09-25 (Studio `d3ab68e`, gateway `efeonce-mcp` `9b93d6a` / v1.8.0); TASK-1896 rows
verified 2026-09-26 (Studio `7f348b2`, Greenhouse `e757aaba5`). Secret **names**
only; never write values here.

## Repositories

| Repo | Role | Local path |
|---|---|---|
| `efeoncepro/efeonce-marketing-studio` | Studio code (private, `main` = production) | `~/Documents/efeonce-marketing-studio` |
| `efeoncepro/efeonce-mcp` | Gateway `mcp.efeonce.org`; provider `marketing-studio` | `~/Documents/efeonce-mcp` |
| `efeoncepro/greenhouse-eo` | All docs + capability + RFC 8693 exchange + MCP-served manual | `~/Documents/greenhouse-eo` |

## Studio monorepo layout (pnpm workspace `apps/*`, `packages/*`)

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js 16.3 app (Vercel root). Pages + `/api/v1/**` in the same deployment |
| `apps/web/src/app/page.tsx` | "Hoy" (attention) |
| `apps/web/src/app/campaigns/page.tsx`, `campaigns/[campaignId]/page.tsx` | Campaign list; detail with tabs pieces / copies / ads / media / calendar |
| `apps/web/src/app/{calendar,media,library}/page.tsx` | Cross-campaign calendar, media, library |
| `apps/web/src/app/robots.ts` + `layout.tsx` `robots:{index:false}` | Disallow all + noindex (open mode) |
| `apps/web/src/app/api/v1/**/route.ts` | 17 route handlers, one per registry operation (see `contracts.md`) |
| `apps/web/src/server/api.ts` | `handle()` adapter: correlation id, actor, `organizationId` narrowing, error classification, `Cache-Control: no-store` |
| `apps/web/src/server/runtime.ts` | One DB handle per function instance, Google auth client, `accessMode()`, `resolveRequestActor()` (bearer → api_client; no header → mode actor), `configureMediaUrls(STUDIO_MEDIA_URL_SECRET)` |
| `apps/web/src/server/collect.ts` | Server-side collection helpers for pages |
| `apps/web/src/server/operations-parity.test.ts` | Route handlers ↔ registry parity (both directions) |
| `apps/web/src/components/*` | `Shell`, `Nav`, `CommandPalette` (⌘K), `PiecesWorkspace`, `MediaImage` (one retry, then «Vista previa no disponible»), `MediaPlanView`, `Pipeline`, `ThemeToggle`, `theme.ts` (cookie `studio-theme`) |
| `apps/web/src/styles/theme.generated.css` | Generated from `@efeoncepro/axis-tokens@0.2.5` (`theme:generate` / `theme:check`) |
| `apps/web/src/copy.ts` | Visible copy (neutral Spanish) |
| `packages/contracts/src/operations.ts` | **Single operations registry** (tool or exclusion per operation) |
| `packages/contracts/src/semantics.ts` | Canonical glossary reused by OpenAPI + tool descriptions |
| `packages/contracts/src/dto.ts` | zod DTOs and filters (→ OpenAPI 3.1) |
| `packages/contracts/src/openapi.ts` | OpenAPI builder, `API_VERSION = '1.2.0'` (TASK-1893) |
| `packages/contracts/src/tool-manifest.ts` (+ `.test.ts`) | Derives `studio-tool-manifest.v1`, inlines `$ref`, sha256 `manifestHash`; tests: coverage, names, annotations, self-contained schemas, leak, determinism |
| `packages/contracts/generated/tool-manifest.json` | Committed artifact (never hand-edited) |
| `packages/contracts/src/errors.ts` | Closed `ERROR_CATALOG` |
| `packages/domain/src/actor.ts` | `Actor` union (`anonymous_open`, `api_client`, `user`, `operator_cli`), `ORGANIZATION_ID`, visibility |
| `packages/domain/src/auth/api-client.ts` | `mst_` tokens: generate, sha256, resolve, `requireScope`, `narrowToOrganization`, create/revoke with `audit_event` |
| `packages/domain/src/media-url.ts` | HMAC-signed media links (week-rounded expiry), `verifyMediaToken` |
| `packages/domain/src/readers/campaigns.ts` | Campaign, assets, asset detail + preview location, copies, ads (`buildUrlWithUtm`), plan, posts, `checkDatabase` |
| `packages/domain/src/readers/overview.ts` | Attention, calendar range, search, rendition location |
| `packages/domain/src/import/catalog.ts` | Catalog/registry/readback schemas, `buildImportPlan`, `applyImportPlan` (idempotent) |
| `packages/domain/src/cursor.ts`, `errors.ts` | Opaque cursors; `StudioDomainError` |
| `packages/database/src/connection.ts` | **Only place a Pool is created**; Cloud SQL connector or direct host; WIF via Vercel OIDC; password or Secret Manager ref; DATE parser `1082` → string |
| `packages/database/src/schema.ts` | Kysely types |
| `packages/database/src/storage.ts` | GCS JSON API: `readObject`, `uploadObjectIfAbsent` (`ifGenerationMatch=0`) |
| `packages/database/migrations/*.sql` | `1758800000000_studio-foundation`, `1758830000000_asset-renditions`, `1790362617534_organization-canonical` (table `studio_pgmigrations`, `--check-order`) |
| `scripts/import-catalog.ts` | `pnpm import:catalog` |
| `scripts/media-renditions.ts` | `pnpm media:renditions` (sharp + ffmpeg) |
| `scripts/api-client.ts` | `pnpm api-client:create|revoke` |
| `scripts/tool-manifest.ts` | `pnpm mcp:manifest:generate|check` |
| `scripts/seeds/campaign-registry.json` | Campaign registry for the import |
| `scripts/gates/*.mjs` | `absolute-path-gate`, `domain-boundary-gate`, `dependency-catalog-gate` (+ `gates.test.mjs`) |
| `packages/observability` (TASK-1896) | `scrub.ts` (event/value/URL scrubbing), `capture.ts` (`captureWithDomain` on `@sentry/core`), `node.ts` (`initSentry(service)`, `flushSentry`), `log.ts` (`logEvent` JSON), `sentry-options.ts` (shared options, traces 5 %); `sentry-e2e.test.ts` inspects the real SDK envelope |
| `apps/web/src/instrumentation.ts`, `instrumentation-client.ts`, `sentry.{server,edge}.config.ts` | Sentry for Next (no DSN ⇒ no init); `next.config.ts` wraps with `withSentryConfig` from `@sentry/nextjs/config` |
| `apps/web/src/server/observe.ts` | `requestIdOf`, `logRequest`, `reportRouteError`, `withObservability(route, domain, handler)` for routes outside `handle()` |
| `apps/web/src/server/health-probes.ts` | Bucket probe (list 1 object with the env SA) for the deep health |
| `packages/contracts/src/health.ts` | `HealthDeep`, `HealthComponent`, `HealthFreshness`, `HealthFilters` |
| `packages/domain/src/health/{thresholds,health-deep}.ts` | Thresholds (single place) + `collectHealthInputs` / pure `evaluateHealth` / `getHealthDeep` |
| `packages/domain/src/ops/ops-run.ts` | `startOpsRun` (stale-lock release 6 h), `finishOpsRun`, `recordOpsRun` (never breaks the process), `opsErrorCode` |
| `packages/domain/src/ops/restore-rehearsal.ts` | Pure guards (`assertRehearsalSource`, `tempDatabaseName`, `assertRehearsalTarget`) + `compareParity` |
| `scripts/ops/restore-rehearsal.ts` | `pnpm ops:restore-rehearsal` (exit 0/1/2/3) |
| `scripts/ops/infra/*.sh` | Idempotent infra, dry-run by default: `sentry.sh`, `vercel-env.sh`, `monitoring.sh`, `restore-rehearsal-job.sh`, `greenhouse-health-client.sh` (+ `lib.sh`) |
| `scripts/ops/sql/restore-role{,-grants}.sql` | Role `marketing_studio_restore` by SQL + grants on `public.studio_pgmigrations` |
| `infra/restore-rehearsal/` | `Dockerfile` (Node 24 + PG 16 client, filtered install), `Dockerfile.dockerignore`, `cloudbuild.yaml` |
| `packages/domain/src/media/` (TASK-1893) | `originals.ts` (allowlist, byte sniffing, `originalObjectName`, `downloadFilename`, `pdfPageCount`), `crc32c.ts`, `ports.ts`, `ingest.ts` (`ingestOriginals`, `revertOriginalProvider`), `download.ts` (`issueOriginalDownload`), `derivatives.ts` (`generateDerivatives`, `generateDerivativesForObject`, `reconcileDerivatives`), `tiering.ts`, `worker-run.ts`, `toolkit-node.ts` (sharp + ffmpeg/ffprobe) |
| `packages/domain/src/rights/rights.ts` | `rightsStatusOf` (America/Santiago), `setAssetVersionRights` (operator CLI + audit) |
| `packages/domain/src/posts/observation.ts`, `providers/metricool/client.ts` | `recordPostObservation`, `runMetricoolReadback`; Metricool adapter (`X-Mc-Auth`, retry on 429/5xx, `not_configured`) |
| `packages/domain/src/{worker,media-toolkit}.ts` | Subpaths `@studio/domain/worker` and `@studio/domain/media-toolkit` (never imported by the web — gate) |
| `packages/domain/src/tx.ts` | `inTransaction` (composes with an outer transaction) |
| `packages/database/src/storage-write.ts` | `uploadOriginalIfAbsent` (resumable, `ifGenerationMatch=0`, crc32c), `setObjectCustomTime` (never imported by the web — gate) |
| `packages/database/src/storage.ts` (+ TASK-1893) | `getObjectMetadata`, `iamBlobSigner`, `signReadUrlV4` |
| `apps/web/src/app/api/v1/assets/[assetId]/versions/[versionNo]/download/route.ts` + `src/server/downloads.ts` | Download route + signer wiring (`STUDIO_ORIGINAL_DOWNLOADS_ENABLED`, `STUDIO_ORIGINALS_BUCKET`) |
| `apps/worker/` | `src/{config,handlers,server}.ts` (`node:http`), `Dockerfile` (+ ffmpeg), `cloudbuild.yaml`, `deploy.sh` (SoT of env vars) |
| `scripts/media-ingest.ts`, `scripts/media-rights.ts` | `pnpm media:ingest`, `pnpm media:rights`; `media-renditions.ts` now uses the domain toolkit |
| `scripts/ops/infra/media-originals.sh`, `scripts/ops/sql/media-worker-roles.sql` | Buckets/SA/IAM/Pub/Sub/Scheduler (`--env`, `--wiring`, dry-run default); worker PG roles |

## Database (schema `studio`)

Tables: `campaign`, `concept`, `asset`, `asset_version`, `asset_rendition`, `copy_variant`, `audience`,
`ad_configuration`, `media_flight`, `budget_line`, `scheduled_post`, `import_run`, `audit_event`, `api_client`;
`media_object`, `worker_run`, `post_observation` (TASK-1893); `ops_run` (TASK-1896, migration `1790409464603_ops-run`,
staging applied 2026-09-26, production pending).
Imported data (both DBs): 5 campaigns CMP-001..005, 21 concepts, 54 pieces, 48 copies, 72 ads, 4 audiences,
1 flight, 7 budget lines, 6 posts, 108 renditions; all `organization_id = org-2df565fb-98aa-42f7-b324-ea9a2209017f`.

## Runtime resources

| Resource | Value |
|---|---|
| Vercel project | `efeonce-marketing-studio` · `prj_dztLezZkYxAJikDuPSdT9QROEJRS` · team `efeonce-7670142f` · root `apps/web` · pin `.vercel/project.json` |
| Domain | `studio.efeonce.org` (CNAME `studio` → `e33b47bdb5fb489f.vercel-dns-016.com.` in HostGator) |
| Cloud SQL | shared `efeonce-group:us-east4:greenhouse-pg-dev`; DBs `marketing_studio` (prod), `marketing_studio_staging` (preview + development) |
| PG roles | `marketing_studio_migrator` (owner, conn limit 5) · `marketing_studio_runtime` (NOLOGIN, DML) · `marketing_studio_app` (prod, conn limit **20**) · `marketing_studio_staging_app` (conn limit 10) |
| Service accounts | `marketing-studio-runtime@efeonce-group.iam.gserviceaccount.com` (prod) · `marketing-studio-runtime-stg@…` (preview/dev) |
| WIF | pool `vercel`, provider `greenhouse-eo`; subject `owner:efeonce-7670142f:project:efeonce-marketing-studio:environment:<env>` |
| Buckets | `efeonce-marketing-studio-media`, `efeonce-marketing-studio-media-staging` (us-east4, private, uniform access) |
| Local tunnel | `cloud-sql-proxy efeonce-group:us-east4:greenhouse-pg-dev --port 15433` (own port, not Greenhouse's) |
| PG role (TASK-1896, **to create by SQL**) | `marketing_studio_restore` (LOGIN CREATEDB NOCREATEROLE INHERIT, conn limit 3, member of `marketing_studio_runtime`). The migrator has NO `CREATEDB` (verified 2026-09-26) |
| Restore rehearsal (TASK-1896, **to create**) | SA `marketing-studio-restore@`, bucket `efeonce-marketing-studio-restore-dumps` (30-day delete), image `us-east4-docker.pkg.dev/efeonce-group/marketing-studio/restore-rehearsal:<sha>`, Cloud Run Job `marketing-studio-restore-rehearsal` (us-east4), Scheduler same name (Tue 05:30 Santiago, paused until first green) |
| Monitoring (TASK-1896, **to create**) | Uptime check «Studio — /api/v1/health» (4 regions, 5 min), policy «Studio — health caído en 2+ regiones», email channel «Studio — alertas por email» |
| Sentry (TASK-1896, **to create**) | Org `efeonce-group-spa`, project `efeonce-marketing-studio`, envs `production`/`preview` |
| Originals (TASK-1893, **to create**) | Buckets `efeonce-marketing-studio-originals[-staging]`; SAs `marketing-studio-ingest[-stg]@`, `marketing-studio-worker[-stg]@`, `marketing-studio-invoker@`; custom role `marketingStudioOriginalsMetadataWriter`; topics `marketing-studio-originals-finalized[-staging]` (+ `-dlq`, `-worker` push sub, `-dlq-sub`); Cloud Run `marketing-studio-media-worker[-staging]`; Scheduler `marketing-studio-reconcile-derivatives[-staging]`, `marketing-studio-metricool-readback`; PG roles `marketing_studio_worker` / `marketing_studio_staging_worker` (limit 6) |

## Environment variables (Studio)

| Var | Meaning |
|---|---|
| `STUDIO_PG_INSTANCE_CONNECTION_NAME` / `STUDIO_PG_HOST` + `STUDIO_PG_PORT` | Connector (Vercel) or direct (local proxy) |
| `STUDIO_PG_DATABASE`, `STUDIO_PG_USER` | Target DB and role |
| `STUDIO_PG_PASSWORD` / `STUDIO_PG_PASSWORD_SECRET_REF` | Password or `projects/<p>/secrets/<s>/versions/<v>` |
| `STUDIO_PG_MAX_CONNECTIONS` | Pool size (default 3 on Vercel, 5 elsewhere) |
| `STUDIO_PG_SSL` | `true` to force SSL |
| `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL` | WIF impersonation (else ADC) |
| `STUDIO_ACCESS_MODE` | unset/`open` or `efeonce_id` (fails closed until TASK-1898) |
| `STUDIO_PUBLIC_URL` | `https://studio.efeonce.org` (prod; OpenAPI `servers`) |
| `STUDIO_MEDIA_URL_SECRET` | HMAC secret for media links (≥ 32 chars, sensitive, different per environment); absent ⇒ fallback `/renditions/{id}` |
| `NODE_AUTH_TOKEN` | Read token for the AXIS package registry (only the `_authToken`) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (server / browser); absent ⇒ Sentry off (TASK-1896) |
| `SENTRY_AUTH_TOKEN` | Source-map upload at build (encrypted); absent ⇒ no upload |
| `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_ORG`, `SENTRY_PROJECT` | Optional overrides (default env from `VERCEL_ENV`, release from `VERCEL_GIT_COMMIT_SHA`/`K_REVISION`) |
| `STUDIO_MEDIA_BUCKET` | Bucket probed by the deep health (else deduced from renditions) |
| `STUDIO_ORIGINAL_DOWNLOADS_ENABLED`, `STUDIO_ORIGINALS_BUCKET`, `STUDIO_DOWNLOAD_SIGNER_EMAIL` | Original download (TASK-1893; off by default; signer defaults to `GCP_SERVICE_ACCOUNT_EMAIL`) |
| Worker (Cloud Run): `STUDIO_ORIGINALS_BUCKET`, `STUDIO_MEDIA_BUCKET`, `MEDIA_WORKER_{DERIVATIVES,METRICOOL_READBACK,ARCHIVE_TIERING}_ENABLED`, `MEDIA_WORKER_RECONCILE_BATCH`, `METRICOOL_API_TOKEN_SECRET_REF`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_IDS` | SoT `apps/worker/deploy.sh` |

## Secrets (Secret Manager, project `efeonce-group`)

`marketing-studio-pg-app-password`, `marketing-studio-pg-staging-app-password`,
`marketing-studio-pg-migrator-password`, `marketing-studio-mcp-gateway-token` (v1, raw `mst_` scalar, org Efeonce;
`secretAccessor` for `efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com`), `axis-packages-read-token`
(a full `.npmrc`). To create (TASK-1896): `marketing-studio-sentry-dsn`, `marketing-studio-sentry-auth-token`,
`marketing-studio-pg-restore-password`, `greenhouse-marketing-studio-health-token` (Greenhouse reads it; `studio:health`).
To create (TASK-1893): `marketing-studio-pg-worker-password`, `marketing-studio-pg-staging-worker-password` (generated by
`media-originals.sh`), `marketing-studio-metricool-api-token` (operator; raw `userToken`).

## Gateway (`efeonce-mcp`)

| Path | Responsibility |
|---|---|
| `src/providers/marketing-studio.ts` | Provider: per call, Google ID token → RFC 8693 exchange in Greenhouse → Studio call with service bearer; maps errors; image output (≤ 2 MB, webp/png/jpeg) |
| `src/providers/marketing-studio-tool-manifest.generated.ts` | Synced manifest + `appliesTo` of the manual (generated) |
| `src/providers/marketing-studio-tool-parity.ts` | Hash check at load + bidirectional parity finder |
| `src/auth/tool-policy.ts` | Exact inventory from the manifest; `unsupported(BASE_READ_SCOPE, [capability], 'marketing_studio_native_policy_missing')` |
| `src/surface.ts` | Declared surface built with every provider maximal (version gate) |
| `src/config.ts` | `MARKETING_STUDIO_PROVIDER_ENABLED`, `_API_URL`, `_API_TOKEN`, `_TOKEN_EXCHANGE_URL`, `_GREENHOUSE_VERCEL_BYPASS_SECRET` |
| `scripts/sync-marketing-studio-tool-manifest.mjs` | `pnpm studio:manifest:sync` (`STUDIO_REPO`, `GREENHOUSE_REPO`) |
| `scripts/marketing-studio-canary.mjs` | `pnpm studio:canary` (uses `dist/`) |
| `test/marketing-studio*.test.ts`, `test/authorized-tools.test.ts` | Provider, MCP wiring, policy coverage |
| `.github/workflows/deploy.yml` | Mounts `marketing-studio-mcp-gateway-token` only when the flag is ON |

Runtime: Cloud Run `efeonce-mcp-gateway` in `southamerica-west1`.

## Greenhouse

| Path / object | Responsibility |
|---|---|
| Capability `marketing_studio.campaign.read` (module `marketing_studio`) | Grants: `efeonce_admin`, `efeonce_account`, `efeonce_operations` |
| Capability `marketing_studio.asset.download` (TASK-1893, seed not applied) | Same grants; the exchange client does not request it yet (gateway federation pending) |
| `src/lib/sister-platforms/mcp-token-exchange.ts` | `resourceFamily: 'marketing_studio'`, `authorizeMarketingStudio` = `can(persona, …, 'read', 'tenant')` |
| OAuth client `efeonce-mcp-marketing-studio` (migration applied) | Confidential exchange client; allowed via `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` |
| `src/mcp/greenhouse/skill-manifest.ts` (`'marketing-studio': { toolPrefix: 'studio.' }`) | Served manual entry; Greenhouse validates the prefix, the gateway validates existence |
| `docs/mcp/skills/marketing-studio/SKILL.md` | MCP-served manual (internal audience, English) |
| `src/lib/reliability/queries/marketing-studio-health.ts` (TASK-1896) | Signal `platform.marketing_studio.health` (HTTP deep health, env `MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF`, optional `MARKETING_STUDIO_HEALTH_URL`) |
| `src/lib/marketing-studio/health-alert.ts` | `checkAndAlertMarketingStudioHealth` → Teams destination `marketing-studio-reliability-alerts` («EO - Admin») only on `error` |
| ops-worker `POST /marketing-studio/health-watch` + scheduler `ops-marketing-studio-health-watch` | Daily 12:20, born paused (`services/ops-worker/deploy.sh`) |
| `docs/operations/marketing-studio/MARKETING_STUDIO_RESTORE_RUNBOOK.md` | Restore + rehearsal runbook (RPO/RTO, paths A/B) |
