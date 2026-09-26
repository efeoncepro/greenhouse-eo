# Efeonce Marketing Studio — program ledger (EPIC-049)

The single place where a session learns **what exists, where it runs and what the next task inherits**. One section
per task. Update yours at closure (Skill Maintenance Contract); append to "Sessions" as you go.

EPIC: `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`. Execution order (operator, 2026-09-25):
**1890 → 1891 · 1893 · 1896 → 1892 → 1894 → 1895 · 1899 → 1897 → 1898** (login last). TASK-1888/1889 are
Insights (EPIC-045), not Studio.

| Task | Scope | Lifecycle (2026-09-25) | Live where |
|---|---|---|---|
| TASK-1887 | Foundation: repo, DBs/roles, domain model, API v1, catalog import, private renditions, approved UI, Vercel + domain (open mode) | **complete** | `studio.efeonce.org` |
| TASK-1890 | Agent-ready contract: operations registry + tool manifest, semantics, service bearer, canonical org, capability, served manual | **in-progress — code complete** | Studio prod `d3ab68e`; Greenhouse pieces in local `develop`, not pushed |
| TASK-1891 | Federation of every manifest tool in Efeonce MCP | **in-progress** | Gateway 1.8.0 deployed, flag **OFF** |
| TASK-1892 | Marketing metrics from Greenhouse (Search Console, GA4, SEO) via ecosystem lane `/api/platform/ecosystem/growth/*`, never SQL; paid (Meta/LinkedIn) and organic social (Metricool) as Studio adapters | to-do (GA4 not in production yet: TASK-1284) | — |
| TASK-1893 | Original asset store in GCS (approved finals, sha256, versioning, rights) + Cloud Run media worker (auto renditions, video covers, crops, Metricool readback; Metricool API confirmed) | to-do | — |
| TASK-1894 | Write commands (idempotency, `If-Match`, audit), brief as entity, authority cutover from OneDrive; signed upload lives here; `.write`/`.approve` capabilities | to-do | — |
| TASK-1895 | Editing/review/version upload/metrics UI (wireframe + flow), consumer of 1892–1894 | to-do | — |
| TASK-1896 | Observability (Sentry, request id + JSON logs, deep health, `ops_run`), alerts (uptime + Sentry email; Greenhouse signal + Teams «EO - Admin»), verified logical restore of `marketing_studio` (30-day rehearsal dump); before writes reach production | **in-progress — code complete, rollout pending** | Studio local `7f348b2` (not pushed); `ops_run` on staging; Greenhouse `develop` `e757aaba5` (not pushed) |
| TASK-1897 | (Greenhouse) revoke `CONNECT` from PUBLIC on `greenhouse_app` and Studio DBs | to-do | — |
| TASK-1898 | Login with Efeonce ID (`auth.efeonce.org`), `STUDIO_ACCESS_MODE=efeonce_id`; last; also depends on TASK-1834 | to-do | — |
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

## TASK-1896 — observability, alerts and verified restore (in-progress, code complete, rollout pending)

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

## Sessions

- 2026-09-25 — Skill created from the verified facts inventory (Studio `d3ab68e`, gateway `9b93d6a`).
- 2026-09-26 — TASK-1896 implemented in code (parallel with TASK-1893 in the same checkouts); rollout pending.
