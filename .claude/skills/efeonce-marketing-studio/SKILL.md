---
name: efeonce-marketing-studio
description: Operate and extend Efeonce Marketing Studio (studio.efeonce.org, repo efeoncepro/efeonce-marketing-studio, EPIC-049) — the API-first system of record for campaigns CMP-### (brief, concepts, pieces with versions and renditions, literal copy per channel, ad configurations, media plan, calendar, attention), the evolution of the Codex "Campaign Manager" HTML prototype in OneDrive. Use when touching the efeonce-marketing-studio repo, its /api/v1 contract or operations registry (packages/contracts/src/operations.ts), the studio.* MCP tools and their federation in efeonce-mcp (provider marketing-studio, MARKETING_STUDIO_PROVIDER_ENABLED), api_client bearer tokens (mst_…), the marketing_studio.campaign.* capabilities or the RFC 8693 exchange in Greenhouse, importing the catalog from OneDrive, generating renditions, adding an operation/tool, rolling out or rolling back Studio or its gateway provider, or any EPIC-049 task (TASK-1887, 1890–1899). NOT for Efeonce Creative Studio (= Globe, use greenhouse-globe). Every EPIC-049 task MUST update this skill at closure (see Skill Maintenance Contract).
---

# Efeonce Marketing Studio (living skill)

**Efeonce Marketing Studio** (`https://studio.efeonce.org`) is the system of record for Efeonce campaigns: brief,
concepts, pieces (images/videos) with versions and private renditions, literal copy per channel and variant, ad
configurations, media plan (flight, budget lines, audiences), organic post calendar and "attention" (pending
decisions). It is the productized evolution of the Codex "Campaign Manager" HTML prototype that lives in OneDrive
(`…/5. Contenidos/15. Paid Media/ABRIR CAMPAIGN MANAGER.html` + `01. Recursos/Campaign Manager/`).

> **Studio ≠ Efeonce Creative Studio.** "Efeonce Creative Studio" is the functional descriptor of **Globe**
> (repo `efeonce-globe`, skill `greenhouse-globe`, `globe.efeoncepro.com`), a different commercial product that
> generates creative assets. Marketing Studio *records and governs* campaigns; it does not generate media. Never
> route Studio work to the Globe skill or vice versa. Also distinct from the Higgsfield "marketing studio" MCP tools.

This skill is the **accumulated operating knowledge of the program**, not a copy of the docs. The ADR and the
architecture say what Studio *is*; this skill says what an agent must know to *work on it without repeating what
already cost a day*. It grows with every task (see the maintenance contract).

## Where everything lives

| What | Where |
|---|---|
| Code (only code + `AGENTS.md`/`CLAUDE.md`/`README.md`) | `efeoncepro/efeonce-marketing-studio` (private, branch `main`), local `~/Documents/efeonce-marketing-studio` |
| **All governance docs** (ADR, architecture, EPIC, tasks, runbooks, handoff, changelog, functional docs, manuals) | **`greenhouse-eo`** — never create governance docs in the Studio repo |
| MCP federation (provider, sync, policy, canary) | `efeoncepro/efeonce-mcp` (`mcp.efeonce.org`), `src/providers/marketing-studio*.ts` |
| Person authority for MCP (RFC 8693 exchange, capability) | Greenhouse `src/lib/sister-platforms/mcp-token-exchange.ts` + `capabilities_registry` |
| MCP-served manual for external agents | Greenhouse `docs/mcp/skills/marketing-studio/SKILL.md` (entry `provider: 'marketing-studio'` in `src/mcp/greenhouse/skill-manifest.ts`) |

## Read order

1. This file (rules + workflows).
2. [`references/program-ledger.md`](references/program-ledger.md) — what each task built, what is live, what is
   pending. **Start here to know the current state.**
3. [`references/architecture-map.md`](references/architecture-map.md) — code layout, runtime resources, env vars,
   secrets (names only).
4. [`references/contracts.md`](references/contracts.md) — the 17 operations, semantics glossary, error contract,
   tool manifest shape and hash.
5. [`references/operations.md`](references/operations.md) — commands, deploy, verification curls, rollback,
   gateway flag procedure and canary.
6. [`references/lessons.md`](references/lessons.md) — the traps that already bit someone.
7. Canon docs in `greenhouse-eo` when you need the full contract:
   `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (ADR, delta 2026-09-25),
   `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (ADR 2026-09-26:
   Studio + GCS as single source of truth; one command, three entry doors),
   `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (v1.6),
   `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (live runtime),
   `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`, the flow
   `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md`, functional doc
   `docs/documentation/marketing-studio/efeonce-marketing-studio.md`, manual
   `docs/manual-de-uso/marketing-studio/operar-marketing-studio.md`, and the gateway runbook
   `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` § Provider Marketing Studio.

Note: TASK-1888 and TASK-1889 are **not** Studio tasks (they belong to Efeonce Insights, EPIC-045). EPIC-049 is
TASK-1887 and TASK-1890…1899.

## Domain invariants (verified in code)

- **Three independent states** per campaign: creative (`unknown|in_production|final_available|approved`), media
  authorization (`unknown|pending|authorized|blocked|not_applicable`) and launch
  (`not_launched|launch_unverified|live_observed|paused|ended`). There is **no global "approved"**; only
  `live_observed` proves a campaign is live.
- **Budget by nature**: `proposed`, `approved`, `actual` lines are never summed nor converted into each other. An
  empty `actual` list means "no spend data", never "spend = 0".
- **Copy is literal**: never rewritten, summarized or corrected (mentions, emojis, line breaks are intentional).
- **Scheduled ≠ published**: only the observation (with its date) says what happened; a past scheduled date
  without published observation is `overdue` = needs verification.
- **`null` = absent** in the source; never 0, never empty, never inferred.
- **Configured ad ≠ active ad** (`status` + `checksPending`).
- **Import is idempotent**: re-importing the same source inserts 0 rows. Ordering uses `COLLATE "C"`.
- **Organization is the canonical Greenhouse id** (`org-…`, regex `^org-[a-z0-9][a-z0-9-]*$`); `EO-ORG-####` is
  presentation only. All imported data belongs to Efeonce `org-2df565fb-98aa-42f7-b324-ea9a2209017f`.
- **`packages/domain` is framework-free** (no `next`, `react`, `@vercel/*`, MCP SDKs — `domain-boundary-gate`);
  every visible web read has its `/api/v1` endpoint and both consume the same domain readers with an `Actor`.
- **Never SQL against Greenhouse's database**; Greenhouse data arrives by API (e.g. TASK-1892 via the ecosystem lane).

## Source of truth and ingest (ADR accepted 2026-09-26)

Canon: `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`.

- **SSOT**: the `marketing_studio` database (schema `studio`) owns campaigns, concepts, pieces, versions, rights,
  approvals and publication evidence; the private bucket `efeonce-marketing-studio-originals` owns the final bytes
  (`originals/sha256/<2>/<sha256>`, versioned, 30-day soft delete, never overwritten). OneDrive/SharePoint is the
  team's **workshop** (editables, drafts, exploration): a final exists for the platform only once it entered Studio.
- **One command, three doors**: `createAssetVersion` (working name; route under `/api/v1`, tool
  `studio.asset.version.create`) is the only way a version is born — idempotent by sha256 + `Idempotency-Key`,
  `If-Match`, the person as actor, `audit_event`, minimal rights (license kind) required, derivatives via the existing
  worker. Upload is two-step: signed V4 URL scoped to one object (resumable for big video; skipped if the sha256 is
  already stored) → client uploads straight to GCS → confirm; Studio verifies size, mime and the **recomputed** sha256
  before creating the version. Doors: CLI `pnpm studio:upload` (TASK-1894), MCP write tools with delegated identity
  (`studio.asset.upload.request` + `studio.asset.version.create`, TASK-1899), UI (TASK-1895).
- **Inference**: CLI and agents infer campaign, concept, format and version from the canonical filename
  (`CMP001-02 - <título> - 4x5.png`) and the catalog, and only ask for what they cannot infer.
- **Approval stays human**: a new version lands pending review; a person approves (or an agent with that person's
  delegated identity, `dryRun` → `confirm`) with `marketing_studio.campaign.approve`. Uploading needs
  `marketing_studio.asset.write` (admin, operations, account, designer).
- **Cutover per campaign, dated** (new campaigns first). After it, `import:catalog`/`media:ingest` never create finals
  for that campaign; `media:ingest` stays only as history backfill and is retired afterwards. Signal: «pieza aprobada
  sin original en Studio». A Microsoft Graph mirror of SharePoint is **not planned** (a Graph read is only for
  one-off backfill/reconciliation).
- None of this is in runtime yet: until a campaign's cutover, the TASK-1893 regime holds (OneDrive = source, GCS =
  verified copy of already registered finals).

## Strategy layer (ADR accepted 2026-09-26)

Canon: `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (architecture §3.1).
Nothing of it is in runtime yet; EPIC-049 tasks implement it by theme.

- **Full parity with agent execution**: every capability, read AND write, is born with command, `/api/v1` route,
  registry entry and federated MCP tool; agents (Claude, Codex, Nexa) execute every UI action with the person's
  delegated identity (TASK-1899 mechanics). Each operation declares its risk tier in the registry: **T0** read
  (direct) · **T1** reversible draft/edit (direct, idempotent, `If-Match`, audited, actor = person) · **T2** approve,
  publish, spend, external credentials or destructive (`dryRun` → proposal digest → explicit human confirm).
- **Channel catalog** (Studio, versioned `channel_key`: type, platform, placements, formats, copy limits, objectives,
  source + verified date per spec) validates copies/pieces/ads at write time and replaces free-text `channel`
  (expand → human-reviewed backfill → contract). Market is never encoded in the channel key.
- **ICP lives in Greenhouse** as a versioned catalog **per organization** (segments, personas, JTBD, buying-group roles,
  bow-tie stages) exposed by ecosystem lane + MCP; Studio references `(org, version, id)`. Bow-tie stage ≠ creative
  funnel phase.
- **Campaign plan**: strategy (objective, KPIs with target and source, hypotheses), persona × stage × channel matrix,
  message house (proof points need evidence), content plan with visible gap, SEO/AEO plan, measurement plan.
- **SEO/AEO**: references to the Search Visibility 360 subject + dated snapshot of what justified the decision; follow-up
  read live via lanes; competitive lanes are `internal`-only; tracking keywords is T2 executed by Greenhouse's owning
  command, never by Studio's service identity.
- **AI agent-first**; AI proposes, a person confirms, the command executes; every AI draft carries immutable
  provenance (model, instruction/skill version, sources, who accepted and when).

## The operations-registry rule (binding)

- **Every Studio capability is born in `packages/contracts/src/operations.ts`**, the single registry. From it derive:
  the OpenAPI 3.1 document, the tool manifest (`packages/contracts/generated/tool-manifest.json`, with
  `manifestHash`) and route-handler parity.
- Each operation declares **`tool`** (`studio.*` name + agent description: when to use, what it does NOT mean,
  what to do next) **or `exclusion` with a reason. Never absent**: a route without an entry breaks
  `apps/web/src/server/operations-parity.test.ts`; an entry without a route breaks it too.
- Descriptions reuse the glossary `semantics.ts` (never rewritten by hand elsewhere) and pass a **leak test**
  (no ids, repo paths, TASK ids, infrastructure names or secrets).
- **UI → API → MCP parity, approvals included** (operator decision 2026-09-25): everything the UI can do is doable
  through `/api/v1` and through MCP. Writes/approvals arrive with TASK-1894 (commands) and TASK-1899 (MCP writes
  with `.write`/`.approve` scopes, delegated identity, `proposalDigest`). A write tool without its own scope class is
  a parity finding in the gateway (`write_tool_without_scope_class`) and is not federated.

## Authority model

- **Access mode** `STUDIO_ACCESS_MODE`: `open` (current; reads without login, `noindex`) or `efeonce_id`, which
  **fails closed (401)** until TASK-1898 (login is last by operator decision).
- **Service bearer**: `Authorization: Bearer mst_…` (47 chars, `^mst_[A-Za-z0-9_-]{43}$`) → `api_client` actor
  (only the sha256 is stored; scope `studio:read`; `organization_ids`). A malformed/unknown/revoked token is
  **401 even in open mode** — a broken token never degrades to anonymous. No header ⇒ the actor of the current mode.
- **`organizationId` never widens**: for `api_client`/`user`, asking for an organization outside the allowed list
  is **404** (anti-oracle); in open/operator mode it only restricts the view.
- **MCP person authority**: the gateway exchanges the person's Entra token in Greenhouse (RFC 8693, confidential
  client `efeonce-mcp-marketing-studio`, requested scope `marketing_studio.campaign.read`, input scope
  `efeonce.mcp.read`; Greenhouse runs `can(persona, 'marketing_studio.campaign.read', 'read', 'tenant')`) on
  **every call**. Only if approved does it call Studio with its own service bearer. The exchanged token **never
  travels to Studio** — it is proof, not a Studio credential.
- **Native internal authority is `unsupported`** for Studio tools (`marketing_studio_native_policy_missing`): the
  native v2 grant only delegates `growth.seo.observation.read`; adding Studio needs new consent (D10), not a list edit.
- Greenhouse capabilities (module `marketing_studio`): `.campaign.read` granted to `efeonce_admin`,
  `efeonce_account`, `efeonce_operations` (live). `.write` (admin, operations, account, designer) and `.approve`
  (admin, account, operations — designer writes but never approves) are planned in TASK-1894/1899, not seeded yet.

## Hard rules

- **NUNCA** confuse Marketing Studio with Efeonce Creative Studio (Globe).
- **NUNCA** infer that a file is a «final» from its OneDrive/SharePoint folder; a final exists only once it entered
  Studio through `createAssetVersion` (ADR 2026-09-26). **NUNCA** build a scheduled Graph mirror of SharePoint.
- **NUNCA** pass binaries inside an MCP call or through a web function: bytes go straight to GCS by signed URL.
- **NUNCA** create an asset version without a sha256 recomputed over the bytes and matching the declared one.
- **NUNCA** approve without a person (an agent approves only with the person's delegated identity + explicit confirm),
  and **NUNCA** record the gateway or an agent as the actor of a write.
- **SIEMPRE** the same command for CLI, MCP and UI, and **SIEMPRE** minimal rights (license kind) at upload.
- **NUNCA** create ADRs, runbooks, handoffs or task docs inside `efeonce-marketing-studio`; they live in `greenhouse-eo`.
- **NUNCA** add a `/api/v1` route without its registry entry (tool or reasoned exclusion), and **NUNCA** hand-edit
  `generated/tool-manifest.json` or the gateway's `marketing-studio-tool-manifest.generated.ts` (hash-verified at
  load; the gateway refuses to start).
- **NUNCA** return English prose, stack traces, SQL or paths to a client: errors are `{ error (es-CL), code, actionable }`
  from the closed `ERROR_CATALOG`.
- **NUNCA** create Cloud SQL users with `gcloud sql users create` (they join `cloudsqlsuperuser` and could read
  Greenhouse). Roles are created by SQL under `SET ROLE cloudsqlsuperuser`. **NUNCA** enable IAM DB auth on the
  shared instance to "simplify" (it modifies Greenhouse's production instance).
- **NUNCA** print an API token: `--token-only` piped straight into `gcloud secrets versions add`. Secret Manager
  values are raw scalars (no quotes, no newline).
- **NUNCA** query Postgres per image: readers return HMAC-signed `/api/v1/media/{token}` links served from the bucket
  without touching the database (see lessons: the 20-connection incident).
- **NUNCA** declare a version per package: every version is in the `catalog:` of `pnpm-workspace.yaml`
  (`dependency-catalog-gate`).
- **NUNCA** run Vercel commands on Studio without checking `.vercel/project.json` → `prj_dztLezZkYxAJikDuPSdT9QROEJRS`
  (team `efeonce-7670142f`); commit author must be `jreyes@efeonce.cl` or Vercel blocks the deploy.
- **NUNCA** flip `MARKETING_STUDIO_PROVIDER_ENABLED` without the Greenhouse release that publishes the exchange client
  + manual, and never call a gateway deploy "done" without the canary with a real human Entra token.
- **NUNCA** federate a write tool without its own scope class, delegated person identity and `dryRun` → confirm loop.
- **SIEMPRE** write copy in neutral Spanish (no voseo) and keep null ≠ 0 in every reader, tool description and report.
- **NUNCA** a Studio capability only in the UI, and **NUNCA** a read-only tool when the UI writes that capability; every
  operation declares its risk tier (T0/T1/T2) in the registry and no caller can downgrade it.
- **NUNCA** a parallel ICP in Studio (local segments/personas/JTBD): reference Greenhouse's catalog by org, version and id.
- **NUNCA** read Search Visibility 360 by SQL, present a planning snapshot as current data, or spend provider budget
  (track keywords, declare competitors) with Studio's service identity.
- **NUNCA** AI that approves, publishes or spends alone; **SIEMPRE** provenance on every AI draft and a catalog
  `channel_key` on every copy, piece, ad, audience and budget line.
- **NUNCA** restore, clone or PITR the shared Cloud SQL instance to recover Studio (it rolls Greenhouse back). Recovery
  is logical per database (`pnpm ops:restore-rehearsal`, restore runbook); PITR only into a NEW temporary instance.
- **NUNCA** call `Sentry.captureException` directly or log tokens/cookies/bodies: use `captureWithDomain` and `logEvent`
  from `@studio/observability`; every operational process records its run (`ops_run`/`worker_run`) and freshness is
  computed from the run, never from the latest datum.

## Workflows

### Add an operation / tool end-to-end

1. Studio: DTO/filters in `packages/contracts/src/dto.ts` (+ glossary text in `semantics.ts` if a new concept).
2. Registry entry in `operations.ts` (`tool` with agent-grade description, or `exclusion` + reason).
3. Reader in `packages/domain/src/readers/**` taking `(db, actor, …)`; enforce organization visibility there.
4. Route `apps/web/src/app/api/v1/**/route.ts` via `handle()` (or the image pattern of `assets/[assetId]/preview`).
5. `pnpm mcp:manifest:generate` → commit the artifact; `pnpm check` (gates + `mcp:manifest:check` + typecheck + tests,
   incl. parity + leak + determinism); `pnpm build`. Push `main` (= production deploy).
6. Gateway (`efeonce-mcp`, branch + PR): `pnpm studio:manifest:sync` (reads the Studio artifact + Greenhouse
   `skill-catalog.generated.json`); policy entries derive from the manifest, but a **new provider** must also be
   declared in `src/surface.ts` and the policy coverage test; run tests, `pnpm surface:baseline`, **bump
   `version`**, PR, merge, then **manual dispatch** of `deploy.yml` (never automatic on merge).
7. If the tool changes what the served manual governs: update `docs/mcp/skills/marketing-studio/SKILL.md` in
   Greenhouse (`appliesTo`), `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, release Greenhouse.
8. Canary (`pnpm studio:canary`) with a human Entra token; record evidence in the ledger.

### Rollout / rollback — see `references/operations.md`
Studio: push `main` → verify curls → rollback with `vercel rollback`. Gateway: flag ON via GitHub var + dispatch →
canary; rollback = flag OFF + dispatch (tools disappear, provider `policy-blocked`).

### Give API access to a client
`pnpm api-client:create --label … --org org-… --scope studio:read --token-only | gcloud secrets versions add <secret> --data-file=-`
against the target database (proxy on 15433); grant `secretAccessor` to the consumer SA; verify 200 / foreign org 404 /
bad token 401. Revoke with `pnpm api-client:revoke --id … --reason …` (writes `audit_event`).

### Import / renditions
`pnpm import:catalog --catalog <CATALOGO-DATOS.json> [--readback CMP-###=<readback.json>] [--apply]` (dry-run by
default, idempotent). `pnpm media:renditions --root <«5. Contenidos»> --bucket <bucket> [--apply]` (thumb 640 +
preview 1600 WebP, ffmpeg frame at 1 s for videos; idempotent, no overwrite). Staging first, then production.

### Incident playbook
- **Images failing / "Vista previa no disponible" / `too many connections for role`** → check that
  `STUDIO_MEDIA_URL_SECRET` is set in that Vercel environment (without it links fall back to
  `/renditions/{id}`, which hits the DB per image); check the `marketing_studio_app` 20-connection limit.
- **`/api/v1/health` → `database: unreachable` locally** → expired ADC: from greenhouse-eo run
  `pnpm gcloud:auth:playwright -- --force`; confirm the proxy is on port 15433 and `.env.local` points to it.
  In Vercel → WIF/SA binding, secret ref, or the connection limit.
- **401 from Studio** → malformed/revoked `mst_` token (never degrades to anonymous). In the gateway a Studio 401
  surfaces as `upstream_unavailable` (it is the gateway's service bearer, not the person's fault).
- **MCP `forbidden`** → the Greenhouse exchange denied: person lacks `marketing_studio.campaign.read`, or
  `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` lacks `efeonce-mcp-marketing-studio` in that deployment.

## Program status (2026-09-26) and pending

- Studio in production; API 1.2.0; 13 tools + 5 exclusions in the Studio manifest; the gateway federates 12 (the
  `studio.asset.download` federation is a TASK-1893 follow-up).
- Complete: TASK-1887, TASK-1890, TASK-1891, TASK-1893 and TASK-1896 (the last two rolled out on 2026-09-26 with the
  Greenhouse release `92002873ced9`). Restore is proven in production (rehearsal job 49 s, monthly scheduler).
- Open follow-ups: 24 CMP-002 images without sha256 (still only in OneDrive); gateway federation of
  `studio.asset.download`; Sentry custom rules (API moved to Workflows); forced prod error, simulated uptime outage and
  real Teams message not exercised; first scheduled rehearsal on 2026-09-29; first-month costs.
- Accepted 2026-09-26 (docs only): ADR Studio + GCS as SSOT and ingest by CLI/MCP/UI — implemented by 1894/1899/1895.
- Next: TASK-1892 → 1894 → 1895 · 1899 → 1897 → 1898. Details: `references/program-ledger.md`.

## Routing

- MCP exposure/federation, gateway deploys → `efeonce-mcp-platform` + `mcp-craft`.
- Greenhouse capability/entitlements, exchange, release → `greenhouse-backend`, `greenhouse-production-release`.
- Cloud SQL roles/migrations → `gcp-cloud-sql`, `greenhouse-postgres` (Studio has its own `node-pg-migrate` setup).
- Secrets → `greenhouse-secret-hygiene`. Vercel → `vercel-ops`. UI → `greenhouse-ux` / product-design loop (the
  approved design is the Claude Design artifact "v2 · Claro y oscuro", AXIS tokens).
- Campaign creative production (the pieces themselves) → `efeonce-advertising-creative`, `social-media-studio`.

## Skill Maintenance Contract (binding for every EPIC-049 task and every session that builds Studio)

An EPIC-049 task (TASK-1890…1899 and any future child) is **not closable** until this skill reflects what it built.
At closure, in the same commit as the task's lifecycle change (in `greenhouse-eo`):

1. `references/program-ledger.md`: your task's row + section — what exists, commits (Studio / gateway / Greenhouse),
   runtime × component × state × evidence, flags, what was left out, exact hand-off.
2. `references/architecture-map.md`: every new file, table, route, env var, secret, bucket, SA or flag (one line each).
3. `references/contracts.md`: every new/changed operation, tool, exclusion, field, error code, scope, manifest hash
   and API version, with the "verified against" date.
4. `references/operations.md`: new commands, deploy/rollback steps, canary recipes, flags and their runtime.
5. `references/lessons.md`: every trap that cost more than 15 minutes (date, symptom, cause, rule).
6. `SKILL.md`: update the description if the trigger surface changed; add a hard rule only for a verified invariant.
7. Mirror to `.codex/skills/efeonce-marketing-studio/`
   (`rsync -a --delete .claude/skills/efeonce-marketing-studio/ .codex/skills/efeonce-marketing-studio/`), run
   `pnpm skills:mirrors`; if external agents need the knowledge, update `docs/mcp/skills/marketing-studio/SKILL.md`
   and regenerate with `pnpm mcp:skills:generate` + `pnpm mcp:skills:check` (no TASK ids, paths, org ids, secrets).

Sessions doing partial work (a slice, an incident, a canary) append to `lessons.md` and the ledger's "Sessions" list
immediately. Claude, Codex and Cursor all own this contract; edit `.claude/` and mirror.
