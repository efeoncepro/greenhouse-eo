---
name: efeonce-marketing-studio
description: Operate and extend Efeonce Marketing Studio (studio.efeonce.org, repo efeoncepro/efeonce-marketing-studio, EPIC-049) — the API-first system of record for campaigns CMP-### (brief, concepts, pieces with versions and renditions, literal copy per channel, ad configurations, media plan, calendar, attention), the evolution of the Codex "Campaign Manager" HTML prototype in OneDrive. Use when touching the efeonce-marketing-studio repo, its /api/v1 contract or operations registry (packages/contracts/src/operations.ts), the studio.* MCP tools and their federation in efeonce-mcp (provider marketing-studio, MARKETING_STUDIO_PROVIDER_ENABLED), api_client bearer tokens (mst_…), the marketing_studio.campaign.* capabilities or the RFC 8693 exchange in Greenhouse, importing the catalog from OneDrive, generating renditions, adding an operation/tool, rolling out or rolling back Studio or its gateway provider, the API-only Greenhouse CLI `pnpm studio` (upload/download, copy and catalog operations), or any EPIC-049 task. NOT for Efeonce Creative Studio (= Globe, use greenhouse-globe). Every EPIC-049 task MUST update this skill at closure (see Skill Maintenance Contract).
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

## Decisión vigente 2026-10-04 — TASK-1899 retirada

El operador retira TASK-1899 para preservar libertad de implementación en la etapa actual de Studio. Se anula
su condición de requisito previo y la obligación de cerrar cada entrega API/CLI/UI con escrituras MCP operativas.
La ruta de desarrollo de activaciones pasa a **TASK-1905 → TASK-2001 → TASK-2002**, respetando sus dependencias
funcionales. TASK-2003 ya registra la decisión posterior de T1 delegado en paralelo; su implementación, rollout
y canary siguen pendientes. TASK-1899 y su protocolo T2/proposalDigest permanecen retirados, no se restauran
como requisito. Se mantienen API-first y controles existentes; la retirada revirtió la implementación local
sin rollout y no habilitó escrituras MCP ni modificó producción.

## Where everything lives

| What | Where |
|---|---|
| Code (only code + `AGENTS.md`/`CLAUDE.md`/`README.md`) | `efeoncepro/efeonce-marketing-studio` (private, branch `main`), local `~/Documents/efeonce-marketing-studio` |
| **All governance docs** (ADR, architecture, EPIC, tasks, runbooks, handoff, changelog, functional docs, manuals) | **`greenhouse-eo`** — never create governance docs in the Studio repo |
| MCP federation (provider, sync, policy, canary) | `efeoncepro/efeonce-mcp` (`mcp.efeonce.org`), `src/providers/marketing-studio*.ts` |
| Person authority for MCP (RFC 8693 exchange, capability) | Greenhouse `src/lib/sister-platforms/mcp-token-exchange.ts` + `capabilities_registry` |
| MCP-served manual for external agents | Greenhouse `docs/mcp/skills/marketing-studio/SKILL.md` (entry `provider: 'marketing-studio'` in `src/mcp/greenhouse/skill-manifest.ts`) |

## Editorial SEO: frontera ratificada y alcance pendiente

La precisión Accepted del 2026-10-04 en el ADR de estrategia §14 coloca el flujo editorial en
**Marketing Studio**: brief, trabajo/producción, QA/aprobación, calendario, publicación observada
e iteraciones. TASK-1667 y TASK-1669 pertenecen a EPIC-049 y siguen to-do; TASK-1668 queda en
EPIC-022 para indexación/outcome. No presentar las primitives actuales de brief/copy/calendar
como el circuito editorial completo.

Reusar work items TASK-1913, roles TASK-1914 y dispatcher TASK-1915; no crear otra tabla/lifecycle,
cola/feedback ni runtime Nexa/Greenhouse. SV360 entrega evidencia/orden/método por lanes; el plan
es subsecuencia en orden de readSeoWorkQueue. CMS conserva write/readback: draft privado, QA,
aprobación, publicación observada e indexación son estados distintos. El brief conserva los cinco
insumos SEO con fuente/as-of y null/[]+razón; refresh/fix sin owner URL bloquea handoff. Insights
conserva informes/render/grants/distribución. No spend/publish implícito ni copia de series SEO.

## Read order

1. This file (rules + workflows).
2. [`references/program-ledger.md`](references/program-ledger.md) — what each task built, what is live, what is
   pending. **Start here to know the current state.**
3. [`references/architecture-map.md`](references/architecture-map.md) — code layout, runtime resources, env vars,
   secrets (names only).
4. [`references/contracts.md`](references/contracts.md) — the versioned operations inventory, semantics, error contract,
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
  before creating the version. Doors: Greenhouse `pnpm studio upload` (API-only), sibling CLI `pnpm studio:upload`,
  MCP tools with delegated identity (`studio.asset.upload.request` + `studio.asset.version.create`, TASK-2003 pending),
  UI (TASK-1895 pending).
- **Inference**: CLI and agents infer campaign, concept, format and version from the canonical filename
  (`CMP001-02 - <título> - 4x5.png`) and the catalog, and only ask for what they cannot infer.
- **Approval stays human**: a new version lands pending review; a person approves (or an agent with that person's
  delegated identity, `dryRun` → `confirm`) with `marketing_studio.campaign.approve`. Uploading needs
  `marketing_studio.asset.write` (admin, operations, account, designer).
- **Cutover per campaign, dated** (new campaigns first). After it, `import:catalog`/`media:ingest` never create finals
  for that campaign; `media:ingest` stays only as history backfill and is retired afterwards. Signal: «pieza aprobada
  sin original en Studio». A Microsoft Graph mirror of SharePoint is **not planned** (a Graph read is only for
  one-off backfill/reconciliation).
- The ingest door and dated campaign authority are deployed. Existing `onedrive` campaigns retain their master-data
  restrictions until explicit cutover; new `studio` campaigns use Studio authority. Upload is the separate ingest door.

## Strategy layer (ADR accepted 2026-09-26)

Canon: `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (architecture §3.1).
The channel catalog and validation slice is deployed (TASK-1905); real ICP and the remaining strategy themes are
separate deliveries. Never present the entire strategy layer as already operational.

- **Full API parity with agent-ready contracts**: every capability, read AND write, is born with a command/reader,
  `/api/v1` route, registry entry and tool or reasoned exclusion. The HTTP CLI consumes that contract; MCP exposure
  requires its own authority and canary. Tiers are declared by the registry: **T0** read · **T1** reversible draft/edit
  (idempotent, `If-Match`, audited) · **T2** approval/publication/spend/destruction (person/operator lane). TASK-2003
  owns delegated T1 federation in parallel; the retired proposalDigest protocol must not be restored by inference.
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

## Hybrid operation with agents (ADR accepted 2026-09-26)

Canon: `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (architecture §4.2).
Nothing of it is in runtime yet; interactive mode (person + role skill + Efeonce MCP) already works for reads.
Provider update (2026-09-29): load `docs/audits/platform/OPENAI_DEVDAY_2026_09_29_LAUNCH_INVENTORY.md`
before selecting an OpenAI runtime/model. Agents API + computer use is an evaluation candidate, not an approved
fifth adapter: its managed sessions currently lack ZDR and support US data residency only. GPT-6.1 Sol is
available in API/Codex/Work but not Chat; its public benchmarks and prices require role-specific evals and
cost-per-accepted-output measurement before routing. Dots, Space and Team Tasks are OpenAI products, not Studio
runtime, memory or delegated authority.

- **Work items** are the unit of hybrid work per campaign: assignee = person **or** agent role@version, requester,
  state machine, versioned inputs by reference, deliverable = draft with provenance (TASK-1909), review, handoff =
  a **new work item** (never a provider handoff). Assigning to an agent is `T1` within the cost cap, `T2` above it.
- **MCP is the only action path** for delegated or scheduled product agents (`mcp.efeonce.org`); per-role tool allowlist enforced in the runtime
  and again in Studio/gateway. Never the `mst_` bearer, SQL or internal APIs. Explicit operator work in this local repo may use the
  authorized HTTP CLI and its service scopes; it is not the product-agent delegation path.
- **Agent role registry** (versioned data, portable Claude ↔ OpenAI): mission, skills@version, tools with tier
  (`T0`/`T1` direct, `T2` proposal only), cost/turn caps, preferred runtime/model, eval set, enabled modes, kill switch.
  Interactive role skills: `efeonce-agent-media-planner`, `efeonce-agent-seo-aeo` (+ `efeonce-campaign-planning`).
- **Identity**: delegated run = assigning person ∩ role allowlist; background delegation minted only by Efeonce ID
  (`act` claim, short, revocable — design pending); scheduled run = per-role service identity, `T0`/`T1` drafts only;
  a `T2` confirmation is valid only from a token **without** `act`.
- **Three modes, one run contract**; durable state only in Studio; a thin **dispatcher in Studio** (Cloud Run) with
  adapters `claude-agent-sdk`, `claude-managed-agents`, `openai-agents-sdk`, `openai-responses` behind flags; one
  idempotency key per logical run, read-back before retry. It reuses Globe/Nexa **patterns**, never their runtime;
  Nexa is a gateway client. Never build on OpenAI Agent Builder (shutdown 2026-11-30).
- **Autonomy gate**: evals per role × runtime × model before background/scheduled; cost caps per run, role and org;
  no-ZDR runtimes (Managed Agents) only with the organization's authorization.

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
  through `/api/v1` and through MCP. The command API exists; the Greenhouse HTTP CLI discovers it dynamically. MCP T1 federation is a separate
  TASK-2003 delivery with delegated identity. TASK-1899 and its proposalDigest design are retired; T2 stays in the
  operator lane. API/CLI/UI development does not wait for MCP rollout. A write tool without its own scope class is
  a parity finding in the gateway (`write_tool_without_scope_class`) and is not federated.

## Authority model

- **Access mode** `STUDIO_ACCESS_MODE`: `open` (current; reads without login, `noindex`) or `efeonce_id`, which
  **fails closed (401)** until TASK-1898 (login is last by operator decision).
- **Temporary write window in open mode** (`1f003c1`, operator decision 2026-10-05): `STUDIO_OPEN_WRITE_UNTIL` (ISO,
  ≤ 7 days ahead) + `STUDIO_OPEN_WRITE_ORGS` (`org-…`) ⇒ actor `api_client` `open-write-window` with `studio:read` +
  `studio:write` for those orgs only (T1 writes; approving still needs a person). Expired/absent ⇒ read-only without
  redeploy. Production: Efeonce org until 2026-10-12T10:00Z; anyone with the link can write and the audit shows
  `api_client:open-write-window`, not a person. Retire with TASK-1898 or on request (`operations.md`).
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
  `efeonce_account`, `efeonce_operations` (live). `.asset.write` and `.campaign.write` (`create`/`update`, scope
  `tenant`; admin, operations, account, designer) are seeded and granted on `develop` (`9d0d698d4`, 2026-10-02) but
  **not released to production**. `.approve` (admin, account, operations — designer writes but never approves) is
  not enabled by the retired TASK-1899 design. Studio enforces API scopes `studio:assets:write` / `studio:write` for API clients.
- **Authority per campaign** (Entregable B): `campaign.source_of_truth` `onedrive` (default) | `studio`. Catalog writes
  on an `onedrive` campaign ⇒ 409 `campaign_not_studio_owned`; T2 (approval/destructive) only for `operator_cli`
  (`pnpm studio:write … --apply --confirm`), via API 403 `confirmation_required`; the new HTTP CLI preserves this boundary.

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
- **NUNCA** pass video bytes through a web function: `/api/v1/media/{token}` answers `video/*` with a 302 to a short V4
  URL (GCS serves Range); a video without its `playback` derivative is `playback: null`, never the original (TASK-1998).
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

## Program status (verified 2026-10-04)

- Studio production `main` is `aa6fa0771ff0`: API **1.7.0**, **75 business tools + 5 HTTP exclusions**. Published
  catalog v1 has **52 channels**. Web and worker were verified; `STUDIO_CHANNEL_VALIDATION_MODE=warn` and
  `STUDIO_CUSTOMER_MODEL_ENABLED=false`. Evidence: `docs/audits/marketing-studio/TASK-2001-release-2026-10-04.md`.
- TASK-1894 A and B are deployed; C remains deferred. TASK-1998/1999 playback is deployed. The current worker is
  production `00005-wc5` / staging `00007-kt9`; earlier revisions in task history are deployment evidence, not the live pointer.
- **Local Greenhouse CLI:** `pnpm studio` covers the live OpenAPI/manifest by operationId or `studio.*`, with
  `list`, `describe`, `call`, `doctor`, `upload`, `download`. It is API-only, uses dryRun by default and `--apply`
  for writes, retains revisions/idempotency, streams GCS bytes without the Studio bearer and verifies downloads.
  See `references/operations.md` and `docs/manual-de-uso/marketing-studio/operar-por-cli-api.md`.
- CLI verification: 18 tests and lint pass; authenticated read and upload dryRun passed against production.
  Applied transfer/write scenarios were tested locally; this CLI delivery did not apply production writes or deploy.
- The upload service client holds `studio:assets:write`, not general `studio:write`. Global catalog management still
  rejects service/user bearer calls pending delegated authority; `--apply --confirm` cannot create that authority.
- MCP remains a separately gated read federation: the existing filter includes 14 reads; new catalog tools and T1
  writes from API 1.6.0 are not certified through the gateway. TASK-2003 runs in parallel; TASK-1899 is retired.
  ICP requires TASK-1906/1892. Greenhouse catalog capability rollout and the legacy backfill remain pending.
- Backfill production dry-run found 134 unmapped rows across five aliases; review owner `efeonce_operations`.
  No mapping was guessed or applied. Publishing a catalog is not revalidation or migration of existing records.
- TASK-1905 stays in progress with these cross-runtime dependencies. Details and historical delivery evidence:
  `references/program-ledger.md`.
- **2026-10-05 — TASK-2002 (in progress):** calendario de activaciones v3 + diálogos de escritura en producción
  (Studio `d0ec7e0`), `studio.efeonce.org/calendar` en **solo lectura** (modo `open`: diálogos sin montar, API 403
  `write_not_allowed`). Escrituras web esperan TASK-1898 y por MCP TASK-2003; hojas email/landing esperan el contrato
  owned de Codex y la de blog TASK-1667/1669. Mapa, contrato de consumo, verificación local y trampas: secciones
  TASK-2002 de cada `references/*.md`.

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

## Channel catalog and ICP delta (2026-10-04, TASK-1905 Studio release)

Studio main 74073de is deployed: API 1.6.0, published catalog v1 (52 channels), web and media worker verified. Read
`references/contracts.md` and `references/operations.md` before channel writes. `warn` is the default, not a claim of
valid content. Keep original labels alongside resolved keys/version; unknown labels never become canonical keys.
`marketing_studio.catalog.manage` is admin/operations only (create/update). ICP defaults disabled; actual references
fail closed until TASK-1906 + TASK-1892 provide the authorized consumer. TASK-2003 runs in parallel; TASK-1899 is
retired. No T1 federation is claimed before real delegated
authority is verified. T2 remains operator CLI. Gateway/Greenhouse rollout and legacy backfill are pending. Evidence and limits:
`docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md` in Greenhouse.

## TASK-2001 contract and rollout (2026-10-04)

Activation plans, execution evidence, owned client CMS/Notion-link handling, deterministic tracking and reviewed legacy
backfill are deployed in Studio aa6fa07. Activations ON, production Metricool discovery ON, owned OFF; library defaults remain OFF. Six reviewed CL activations linked, real discovery/replay/scheduler and HTTP CLI PASS. Every operation has a tool: 75 tools / 80 HTTP
operations. Use Greenhouse `pnpm studio` against the chosen origin to discover schemas; input defaults are optional.
Person-only T1 operations (publication confirmation, old campaign slug, legacy backfill) reject service bearers and await
TASK-2003 for human HTTP/MCP authority. Production/MCP availability is separate; see program-ledger and runtime handoff.

### Email multiproveedor — decisión del operador 2026-10-04

Resend tendrá el mayor volumen; también deben soportarse HubSpot, Salesforce Marketing Cloud Engagement y Next.
Adapters separados con cuenta/tenant y evidencia de envío/completitud, catálogo aditivo y mismas operaciones API/MCP/CLI.
Reusar delivery/inbox/reconciliación de Greenhouse para Resend sólo con vínculo explícito a campaña; broadcast no basta.
El corte 4094da0 no implementa la ampliación; no presentar enums/fixtures como conexiones operativas. Delta email de TASK-2001 gobierna la continuación.


## Hojas de activación email/web (TASK-2001, 2026-10-05)

API 1.9.0 local: `ActivationDto.email` y `web` comparten detalle/calendario/HTTP/MCP/CLI. Contrato y rollout en
[references/contracts.md](references/contracts.md). Remitente/copy literal, límites del catálogo fijado y última
lectura de audiencias/entregados/aperturas/clics con fuente/fecha. Null no es cero. El formulario de una landing
es **Growth Forms**, `web.connectedForms[].id = form_key` público; las respuestas van a DB Greenhouse y después
al dispatcher HubSpot. Jamás exponer su GUID de destino ni inferir entrega desde un embed. TASK-2002 UI queda
con Claude; código validado local no implica reader actualizado en producción.
