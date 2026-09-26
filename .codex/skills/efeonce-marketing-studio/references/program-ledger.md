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
| TASK-1896 | Observability, alerts to Teams «EO - Teams», verified restore of `marketing_studio` (30-day rehearsal dump); before writes reach production | to-do | — |
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
- **Pending:** Greenhouse release → flag ON + dispatch → `pnpm studio:canary` with a human Entra token → real MCP
  session → evidence here → close 1890 and 1891.

## Sessions

- 2026-09-25 — Skill created from the verified facts inventory (Studio `d3ab68e`, gateway `9b93d6a`).
