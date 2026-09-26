# Efeonce Marketing Studio — contracts

Verified against `packages/contracts/src/{operations,semantics,tool-manifest,errors,dto,openapi}.ts` on 2026-09-25
(Studio `d3ab68e`, API `1.1.0`, manifest hash `96d1f0caf6e5571d1d51a93dd8824cb69f578f514945c563b7c6bd5bb39326bb`).

## Operations registry (17: 12 tools + 5 exclusions)

All are `GET`. Tools: capability `marketing_studio.campaign.read`, API scope `studio:read`, `writes: false`.

| # | Path | operationId | Exposure | Notes |
|---|---|---|---|---|
| 1 | `/api/v1/attention` | `getAttention` | tool `studio.attention.get` | Recommended starting point |
| 2 | `/api/v1/campaigns` | `listCampaigns` | tool `studio.campaigns.list` | Three states, counts, cover |
| 3 | `/api/v1/campaigns/{campaignId}` | `getCampaign` | tool `studio.campaign.get` | States + notes, concepts, decisions, brief ref |
| 4 | `/api/v1/campaigns/{campaignId}/assets` | `listCampaignAssets` | tool `studio.campaign.assets.list` | Filters `kind`, `ratio`, `conceptId`, `cursor`, `limit` (1–200); paginated |
| 5 | `/api/v1/assets/{assetId}` | `getAsset` | tool `studio.asset.get` | Piece + all versions + renditions + ads using it + concept copies |
| 6 | `/api/v1/assets/{assetId}/preview` | `getAssetPreview` | tool `studio.asset.preview` | Image; `size=thumb` (default, 640 px) \| `preview` (1600 px); video = frame |
| 7 | `/api/v1/campaigns/{campaignId}/copies` | `listCampaignCopies` | tool `studio.campaign.copies.list` | Filters `channel`, `conceptId`, `cursor`, `limit`; literal copy |
| 8 | `/api/v1/campaigns/{campaignId}/ads` | `listCampaignAds` | tool `studio.campaign.ads.list` | Filters `channel`, `cursor`, `limit` |
| 9 | `/api/v1/campaigns/{campaignId}/plan` | `getCampaignPlan` | tool `studio.campaign.media_plan.get` | Flight, budget, audiences, channels |
| 10 | `/api/v1/campaigns/{campaignId}/posts` | `listCampaignPosts` | tool `studio.campaign.posts.list` | Organic posts + observation |
| 11 | `/api/v1/calendar` | `getCalendarRange` | tool `studio.calendar.get` | Required `from`, `to` (`YYYY-MM-DD`, `[from, to)`); `undated` with reason |
| 12 | `/api/v1/search` | `search` | tool `studio.search` | Required `q` (2–80 chars); up to 5 campaigns, 6 pieces, 5 copies |
| 13 | `/api/v1/renditions/{renditionId}` | `getRendition` | **exclusion** | Compat transport by internal rendition id (agent cannot know it); hits DB |
| 14 | `/api/v1/media/{token}` | `getMedia` | **exclusion** | Signed temporary links from readers; already authorized, no identity; no DB |
| 15 | `/api/v1/health` | `getHealth` | **exclusion** | Operational; gateway reports provider health itself |
| 16 | `/api/v1/openapi.json` | `getOpenApi` | **exclusion** | Contract metadata for integrators |
| 17 | `/api/v1/tool-manifest` | `getToolManifest` | **exclusion** | Metadata consumed by the gateway to federate |

`organizationFilter: true` on the 12 tool operations (accept `organizationId`), `false` on the 5 exclusions.
Routes added by TASK-1890: `/assets/{assetId}`, `/assets/{assetId}/preview`, `/tool-manifest`.

## Request conventions

- `organizationId` (optional, canonical `org-…`): intersects, never widens. Non-canonical ⇒ 400 `invalid_request`;
  outside an `api_client`'s allowed list ⇒ 404; open/operator mode ⇒ restricts to that org.
- `X-Correlation-Id`: echoed if it matches `^[A-Za-z0-9._:-]{8,128}$`, else a new UUID. The gateway sends it.
- JSON responses `Cache-Control: no-store`; preview images `private, max-age=300`.
- Pagination: `{ items, nextCursor }`; the cursor is opaque (never built by hand).
- Auth: no header ⇒ mode actor; `Authorization: Bearer mst_…` ⇒ `api_client` requiring `studio:read`; malformed,
  unknown or revoked ⇒ 401 even in open mode.

## Semantics glossary keys (`semantics.ts`, reused verbatim)

`absent`, `campaignId`, `organizationId`, `states`, `creativeState`, `mediaAuthorizationState`, `launchState`,
`stateNote`, `budget`, `budgetKind`, `budgetActual`, `budgetStatus`, `copyLiteral`, `characterCounts`,
`scheduled`, `observation`, `overdue`, `thumbUrl`, `previewUrl`, `aspectRatio`, `assetVersion`, `storagePath`,
`sha256`, `adConfiguration`, `checksPending`, `urlWithUtm`, `attention`, `flight`, `searchQuery`, `cursor`,
`organizationFilter`.

Key meanings: no global "approved"; only `live_observed` proves live; budgets never summed; empty actual ≠ 0; copy
literal; scheduled ≠ published; `overdue` = past schedule without published observation; `thumbUrl`/`previewUrl`
are temporary (1–2 weeks); `storageProvider onedrive_provenance` = original lives in OneDrive; `storagePath` locates,
does not download; `null` = absent.

## Error contract (`errors.ts`)

Body `{ error: string (es-CL), code, actionable: boolean }`:

| code | HTTP | actionable |
|---|---|---|
| `not_found` | 404 | false |
| `campaign_not_found` | 404 | false |
| `invalid_request` | 400 | false |
| `unauthorized` | 401 | false |
| `forbidden` | 403 | false |
| `database_unavailable` | 503 | true |
| `internal_error` | 500 | true |

`handle()` classifies: domain error → its code; `ZodError` → `invalid_request`; pg/network codes (`ECONNREFUSED`,
`ETIMEDOUT`, `ENOTFOUND`, `57P01`, `57P03`, `53300`, `08006`, `08001`) or connect/timeout/secret/credential/`STUDIO_PG_`
messages → `database_unavailable`; else `internal_error`. Logs only code, error name, pg code and correlation id.

Health body: `{ status: ok|degraded, database: reachable|unreachable, accessMode: open|efeonce_id, … }`.

## Tool manifest (`studio-tool-manifest.v1`)

```
{ schema: 'studio-tool-manifest.v1', apiVersion: '1.1.0',
  tools: [{ name, title, description, operationId, method: 'GET', path, pathParams,
            inputSchema (self-contained JSON Schema, additionalProperties:false, path params required),
            output: { kind: 'json', schema } | { kind: 'image', mimeType: 'image/webp' },
            annotations: { readOnlyHint: !writes, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            writes, capability, apiScope }],
  exclusions: [{ operationId, path, reason }],
  manifestHash: sha256(JSON.stringify(manifest without hash)) }
```

- `$ref`s are inlined (`inlineRefs`), `definitions`/`$defs`/`$schema` removed; a cycle throws.
- Deterministic: same code ⇒ same hash. `pnpm mcp:manifest:check` fails if the committed artifact differs byte-for-byte.
- Tests (`tool-manifest.test.ts`): every operation has tool or exclusion with reason; unique dotted `studio.*` names;
  read tools readOnly + idempotent; self-contained schemas with required path params; leak test (same prohibitions
  as Greenhouse's MCP manuals: ids, repo paths, secrets, infrastructure); determinism + committed artifact identical.
- Served at `GET /api/v1/tool-manifest`.

## Gateway contract (`efeonce-mcp` provider `marketing-studio`)

- Contract version `task-1891-studio-tool-manifest.v1`. Disabled ⇒ `state: 'policy-blocked'`, **no tools registered**.
- Exchange request: `POST MARKETING_STUDIO_TOKEN_EXCHANGE_URL` with `Authorization: Bearer <Google ID token of the
  gateway SA>` (audience = exchange URL), form `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`,
  `subject_token=<person Entra token>`, `scope=marketing_studio.campaign.read`, `client_id=efeonce-mcp-marketing-studio`;
  optional `x-vercel-protection-bypass`. Response must be `bearer`, `expires_in ≤ 300`, `scope` exactly the requested one.
- Error mapping: exchange 400/401/403 ⇒ `forbidden`; Studio 400 ⇒ `invalid_request`, 403 ⇒ `forbidden`, 404 ⇒
  `not_found` (anti-oracle), 429 ⇒ `rate_limited`, **401 and 5xx ⇒ `upstream_unavailable`** (the service bearer is
  the gateway's configuration); bad payloads ⇒ `invalid_upstream_response`; timeout 15 s.
- Image tools return MCP `image` content (webp/png/jpeg, 1 byte – 2 MB).
- Parity findings: `manifest_tool_not_registered`, `registered_tool_not_in_manifest`, `write_tool_without_scope_class`,
  `skill_governs_unknown_tool`.
- Policy: exact names from the manifest (never by prefix); Entra issuer only; native = `unsupported`
  (`marketing_studio_native_policy_missing`).

## Greenhouse exchange

Client `efeonce-mcp-marketing-studio`, `resourceFamily: 'marketing_studio'`, scope `marketing_studio.campaign.read`,
input scope `efeonce.mcp.read`, authorizer `can(persona, 'marketing_studio.campaign.read', 'read', 'tenant')`.
Endpoint: `https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/oauth/token`.
