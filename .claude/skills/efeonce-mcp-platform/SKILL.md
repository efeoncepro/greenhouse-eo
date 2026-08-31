---
name: efeonce-mcp-platform
description: Design, expose, secure, deploy, troubleshoot, or verify Efeonce MCP capabilities and providers. Use for requests involving mcp.efeonce.org, Streamable HTTP, MCP tools/resources/prompts, OAuth resource servers, provider federation, MCP client interoperability, MCP Cloud Run/front-door/TLS incidents, or adding an Efeonce product capability to MCP. Route each domain concern to its owner skill; do not use for browser-only WebMCP work.
---

# Efeonce MCP Platform

Use this skill as the control-plane router for Efeonce MCP. The gateway is a neutral adapter: it owns transport,
OAuth validation, discovery, routing, redaction and operational isolation. Products own business logic, data,
entitlements, providers and their canonical readers/commands.

🔴 **La ausencia de una tool en el gateway NO es evidencia de olvido — búscala en las exclusiones antes de reportar un hueco.**
El guard de paridad (`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`, `TASK-1653`/`TASK-1658`) es **bidireccional** y su regla es explícita: *«si una tool interna NO debe federarse, va en `EXCLUSIONS` con razón — nunca simplemente ausente»*. Así que "está en el registry interno y no en el gateway" tiene **dos** explicaciones —olvido de federación, o exclusión deliberada— y el sistema está construido para que las distingas con un `grep` a `GREENHOUSE_SEO_TOOL_EXCLUSIONS`. Caso fuente (2026-08-29): se reportó `get_seo_work_queue` como hueco de federación; estaba excluida a propósito, con razón sustantiva (§7 prohíbe exponer su cruce de citabilidad client-facing, y su `priority_score_version` no ha rodado un ciclo) y hasta con disparador de revisión declarado. ✅ **Desde `TASK-1780` el espejo a mano ya no existe.** El inventario del guard se **deriva** del manifiesto canónico `src/mcp/greenhouse/tool-manifest.ts`, que viaja al gateway como artefacto generado (`pnpm mcp:manifest:generate` acá → `pnpm greenhouse:manifest:sync` allá) con `manifestHash` verificado al cargar: editarlo a mano lanza. El CI del repo hermano sigue leyendo un archivo, nunca una URL, porque un gate de merge no debe depender de un deployment vivo. **NUNCA** edites `greenhouse-tool-manifest.generated.ts`: el paso 1 del protocolo de federación ahora es agregar la entrada al manifiesto en Greenhouse. Y una capacidad federada **sin contraparte interna** (el gateway resuelve contra rutas del lane) se declara en `GREENHOUSE_GATEWAY_NATIVE_TOOLS` con razón — caso vivo `get_seo_provider_spend`—, nunca ausente.

## First reads

Read, in order:

1. `AGENTS.md`, `project_context.md` and `Handoff.md`.
2. [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../../../docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md),
   [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../../docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) and active
   [`TASK-1626`](../../../docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md).
3. The provider's canonical architecture, task and live runtime handoff.
4. The smallest reference below that matches the work.

If a source conflicts with remembered behavior, the verified runtime and its canonical architecture win.

## Hard rules

- Keep `https://mcp.efeonce.org/mcp` as the single canonical resource. Do not create a second OAuth resource for an alias.
- Default every provider or capability to disabled, read-only and fail-closed. The only enabled initial exception is
  internal `globe.producer.fleet.list`; it is not a customer-access precedent. An absent or degraded provider must
  not expose data, execute a tool or make discovery fail for healthy providers.
- A tool delegates only to a provider's canonical API, reader or command. Never add domain business logic, direct DB,
  storage or creative-provider SDK access to the gateway.
- Keep human OAuth separate from the gateway's downstream service identity. Validate issuer, audience, expiry and
  scopes before MCP dispatch; never log tokens, auth codes, raw bodies or secrets.
- Since 2026-08-06 the gateway ships a DCR compatibility shim so **standard MCP clients** (Claude Code, claude.ai
  custom connectors, Claude Desktop) can authenticate with end-user Entra OAuth. Entra does not support RFC 7591
  dynamic client registration, which those clients require, so: the protected-resource metadata announces the
  gateway itself as authorization server; the gateway publishes `/.well-known/oauth-authorization-server`
  mirroring Entra's real authorize/token/jwks endpoints (cached from its OIDC config) plus its own
  `registration_endpoint`; and `POST /register` never creates apps — it always returns the pre-registered public
  PKCE client `32617b87-e7ef-493a-838f-1ff3f0213b93` (`token_endpoint_auth_method: none`), gated by env
  `OAUTH_PUBLIC_CLIENT_ID` (declared in `deploy.yml` with a default). Scopes are announced qualified as
  `https://mcp.efeonce.org/mcp/<scope>` because Entra v2 resolves bare scopes against Microsoft Graph
  (`AADSTS650053`); the token's `scp` claim still arrives bare, so the verifier and per-tool checks did not
  change. The shim does **not** turn the gateway into an authorization authority — it only re-announces discovery
  metadata and one fixed client; Entra keeps issuing and validating every token, so the gateway remains a neutral
  adapter. Verified live with the real client: Claude Code authenticated and connected. This broadens internal
  tenant connectivity only; external/B2B access stays gated. Formalization pending as `TASK-1654`.
- Derive tenant/workspace from verified identity and provider policy. Never accept a free-form tenant boundary.
- Treat `auth.efeonce.org` as session/runtime-isolated, not identity-isolated. Greenhouse, auth and MCP keep separate
  cookies, session secrets and token audiences, but an existing customer must resolve to one canonical
  `identity_profile` and Account 360 membership through audited source links. Never share the Greenhouse cookie or
  create a permanent second customer credential; preserve the gated customer-login convergence contract in
  `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` / `TASK-1631`.
- Greenhouse's existing NextAuth + sister-platform OAuth broker is a reusable identity foundation, not automatically
  a public MCP authorization server. Before customer access, `TASK-1631` must compare WorkOS, an independently
  extracted broker at `auth.efeonce.org`, and the hybrid; native extraction must close OAuth metadata, CIMD/DCR,
  hosted callbacks, consent/grants and token-verification gaps. Never make the gateway own browser login or share a
  Greenhouse cookie/`NEXTAUTH_SECRET`, and never make a Greenhouse release the rollback boundary for external OAuth.
- Before customer access, require B2B/multitenant entitlements that can issue and revoke access per tenant and
  capability. Entra is the internal canary only. Follow the proposed Account 360 binding and customer identity
  gate in `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` / `TASK-1631`; do not provision its leading
  vendor candidate without explicit approval. The gateway declares five scopes when all gated providers are active: base `efeonce.mcp.read`,
  Globe reader `efeonce.mcp.globe.read`, the flag-gated internal write
  `efeonce.mcp.globe.credits.funding.ensure`, the flag-gated SEO write `efeonce.mcp.seo.write` (TASK-1308), and
  the flag-gated Hiring reader `efeonce.mcp.hiring.read`.
  Scope granularity is **one scope per blast-radius class, never one per capability**: a per-capability list turns
  Entra into a hand-edited mirror of Greenhouse's `capabilities_registry`, the two drift, and a drifted
  authorization mirror is worse than none — it also makes the gateway an authorization authority, which rule 1
  forbids. The scope answers "may this client perform this CLASS of action?"; the capability answers "may this
  actor, on this org?" and is enforced downstream in the canonical lane and command. `globe.credits.funding.ensure`
  is the rule applied, not an exception: it owns a scope because it MOVES MONEY under a one-shot authorityId.
  Consequence: federating a domain's N+1 write needs no Entra change and must never be blocked on one.
  The shared Entra client receives base + Globe read + Hiring read. A separate base-only canary client
  (`66985833-14e9-438e-add4-b740e84e9a64`) carries only base + Globe read and verified the real Hiring deny (`403`)
  on 2026-08-16; it is not returned by the DCR shim.
- 🔴 **A write scope is NEVER wired into the shared public PKCE client.** Both write scopes
  (`efeonce.mcp.globe.credits.funding.ensure`, `efeonce.mcp.seo.write`) exist in the `Efeonce MCP Resource` app
  (`c5363215-b9a6-4bf1-bb1c-e61963b37dac`; the SEO one is `type: Admin`, `isEnabled: true`, id
  `17f923ad-537a-4c2f-ab5b-2a14ed650183`) but are deliberately absent from the `requiredResourceAccess` of
  `32617b87-e7ef-493a-838f-1ff3f0213b93` — the client the DCR shim hands to Claude Code / claude.ai / Claude Desktop.
  This is load-bearing, not an oversight: on the ecosystem lane the actor is `mcp:<consumer>` — the MACHINE — so there
  is **no per-human capability check** there (the Greenhouse app-lane does require one, e.g.
  `growth.seo.target.configure`), and the gateway→Greenhouse hop travels on a fixed `internal`-binding consumer token.
  The OAuth scope is therefore **the only gate in the whole chain that depends on WHO the person is**. Wiring it into a
  secretless client available to every tenant user would hand recurring-spend authority to anyone who authenticates,
  silently — nothing fails, it just starts working for everybody. **NEVER close an `insufficient_scope` on a write tool
  by adding the scope to the shared public client.** The correct path is a client with a revocable, per-tenant,
  per-capability grant — exactly the gate deferred to `TASK-1631`. Until then write tools stay federated and
  **fail-closed**: registered, verifiable, with no token that opens them. Verbatim rationale in the gateway ADR,
  §"El scope de escritura NO se cablea al cliente público compartido".
  ⚠️ `az ad app update` **replaces** the whole scope array: any Entra scope change goes with a verified round-trip or
  it wipes the live ones.
- Treat writes, approvals, spending, rights-sensitive creative work, webhooks and new public auth surfaces as new
  ADR/task work. Do not infer permission from a read-only MCP capability.
- The certified internal Studio Credits write is `globe.credits.funding.ensure`. It accepts only a Greenhouse-issued
  one-shot `authorityId`, requires its dedicated Entra scope, exchanges identity through RFC 8693, and calls the
  canonical Greenhouse command. Never add workspace, amount, period, cap, actor or free-form instruction inputs.
  For Vercel-protected Greenhouse environments, inject the system-managed automation bypass from Secret Manager
  and send it only to the exact token-exchange and command URLs; never store it in GitHub variables or forward it.
  It is a transport bypass, never caller identity, tenant authorization or a substitute for a Greenhouse capability.
- The live runtime federates the internal read-only Hiring provider from `TASK-1726` and `TASK-1718`:
  `hiring.talent_pool.search`, `hiring.talent_pool.profile.get`, `hiring.applications.review.list` and
  `hiring.application.review_packet.get` through the `greenhouse-hiring` adapter. They use
  delegated internal identity, exact `efeonce.mcp.hiring.read`, downstream `hiring.talent_pool.read`, purpose/audit
  headers and strict allowlisted DTOs. Production allow search/profile `200` and base-only deny `403` passed on
  2026-08-16. Exact candidate review was activated internal-only on 2026-08-18: exact `applicationId`, minimized
  redacted chunks, hash binding, explicit purpose and append-only audit; no raw PDF/contact/notes/ranking. Assessment
  tokens, every Hiring write and B2B access remain outside this provider and keep `TASK-1719`–`TASK-1722` /
  `TASK-1631` gates. TASK-1718 remains open for formal sign-offs and revocation/rollback evidence.
- The related Greenhouse public consent flow and operator invitation flow are enabled independently in production
  (`HIRING_TALENT_POOL_SELF_SERVICE_ENABLED=true`, `HIRING_TALENT_POOL_INVITE_ENABLED=true`). They are not MCP
  writes: future-opportunity consent requires the candidate's tokenized confirmation, and invitation is a human-
  confirmed, exact-opening command that never advances a stage or assigns an assessment on its own. The MCP provider
  remains read-only and must not be expanded to expose CV/contact data or execute invitation, assessment or selection
  actions. Activation evidence: orchestrator `31953851353` released, Vercel deployment
  `dpl_CTxG3tx66S159tazMSyNiGSmqzHJ` READY, `ops-worker-00563-ghv` Ready, and watchdog `ok`/`drift_count=0`.
- Do not call a product deployment successful because its MCP adapter compiled. Require provider allow/deny/fault
  evidence and a public gateway smoke.
- Keep the Codex and Claude bundles byte-identical. Update both in the same change and verify the diff.

## Choose the route

| Work | Load in addition to this skill | Canonical boundary |
| --- | --- | --- |
| Gateway, provider registry, API boundary or shared contract | `software-architect-2026` | Architecture + ADR/task before code |
| Cloud Run, ALB, DNS, TLS, WIF, OAuth config or secrets | `cloud-run-basics`, `greenhouse-secret-hygiene` | Runbook; no keys or unsafe bypasses |
| Globe capability, creative asset, model or workspace policy | `greenhouse-globe`, `greenhouse-ai-creative-rights-governance` | Globe owns API/SDK/policy; `TASK-1473` gates federation. Only the internal fleet reader is currently enabled. |
| Growth SEO capability (Search Visibility 360, EPIC-022) | `seo-aeo-practice` plus `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` | MCP-first per operator directive (2026-08-05). **LIVE IN PRODUCTION since 2026-08-06: `TASK-1645` and `TASK-1647` are both `complete`.** The ecosystem lane `/api/platform/ecosystem/growth/seo/*` plus its MCP tools serve production behind `GROWTH_SEO_ENABLED` (multi-runtime: Vercel for the lane, `ops-worker` for the GSC materializer — turning it on in one runtime leaves the other path dead). The gateway provider `greenhouse-seo` is ENABLED on `mcp.efeonce.org` (enabled at revision `efeonce-mcp-gateway-00012-dkj`; productive revision today is `efeonce-mcp-gateway-00024-8b8`), `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`, `GREENHOUSE_ECOSYSTEM_TOKEN` as a Cloud Run **secret ref** (`efeonce-mcp-gateway-greenhouse-token:latest`, never a plain value), consumer `EO-SPK-0004` + binding `EO-SPB-0004`. **Gotcha when wiring a secret ref:** that secret was created with zero IAM bindings — the gateway runtime SA `efeonce-mcp-gateway@efeonce-group` needs a scoped `secretAccessor` or the deploy fails; and `--set-secrets` is destructive exactly like `--set-env-vars`, so every secret must be declared in the same flag in `deploy.yml`. Production canary (`scripts/greenhouse-seo-canary.mjs` against `https://greenhouse.efeoncepro.com`): Berel `domainQuadrant=riesgo` with 50 keywords and AEO 44.5; Efeonce entitlement ok + honest `no_seo_data`; deny anti-oracle 404. The authenticated front-door smoke lives in `scripts/oauth-canary.mjs` (`MCP_CANARY_SEO_ORGANIZATION_ID` + `MCP_CANARY_SEO_DENY_ORGANIZATION_ID`) and passed 2026-08-06 with a real Entra token on the base scope: `initialize 200`, `seoEntitlementStatus 200`, `seoVisibility360Status 200`, `seoDomainQuadrant="riesgo"` (Berel's real quadrant through the public front door), `seoDenyFailedClosed=true`. It needs an interactive Entra login — human-assisted, not CI-automatable — but since 2026-08-06 the script is no longer the only authenticated path: any tenant Entra user can connect a standard MCP client (Claude Code, claude.ai, Claude Desktop) through the gateway's DCR shim. Foundation is live (`TASK-1299` schema, `TASK-1301` per-org `seo_v1` entitlement, `TASK-1300` DataForSEO registry + cost ledger, `TASK-1302` GSC materializer live, `TASK-1305` SEO↔AEO quadrant reader); every provider-facing SEO write passes `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`), and every future SEO/E-E-A-T reader ships its MCP tool in the same PR. Eventual home is Wave (`wave.efeonce.org`, EPIC-037).<br><br>**Tool inventory as-of 2026-08-31 — the internal MCP registers 28 SEO tools (21 reads + 7 writes); the gateway federates 28** (`src/mcp/greenhouse/tool-manifest.ts` = the internal inventory since TASK-1780 — `server.ts` no longer holds it, it walks it; TASK-1658 closed the 8-tool federation drift). ⚠️ The two sets are NOT equal by construction: `get_seo_work_queue` exists internally and is excluded with a reason, and `get_seo_provider_spend` is federated WITHOUT an internal counterpart (declared in `GREENHOUSE_GATEWAY_NATIVE_TOOLS`): reads `get_seo_entitlement`, `get_seo_keyword_opportunities`, `get_seo_visibility_360`, `get_seo_rank_evolution`, `get_seo_site_audit_report`, `get_seo_backlink_profile`, `get_seo_backlink_detail`, `get_seo_keyword_market_data`, `get_seo_keyword_discovery`, `get_seo_grounded_query_draft`, `get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`, `get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_prospect_diagnostic`, `get_seo_provider_spend` (TASK-1696 — month-to-date provider spend cut by `(consumer, family, cost_basis)`; **`internal`-scope bindings only, client bindings get 404 anti-oracle** — the spend is what serving a client COSTS Efeonce, not something the client consumed), `get_seo_keyword_gap` (TASK-1662 — competitive gap DERIVED at read time: `content_gap` / `ranks_worse` with `declaredTargets` kept separate, exclusion by measured GSC, factors with honest `sin_dato`, and **no ordering of its own** — the TASK-1700 queue is the order authority. ⚠️ Its ecosystem lane is **`internal`-scope bindings WITHOUT an organization only, 404 anti-oracle**: the competitive comparison is never exposed to the client (audit §7) — same contract as `get_seo_provider_spend`), `get_seo_serp_top_results` (TASK-1699 — dated top-N SERP series the daily rank capture ALREADY pays for (zero marginal cost; the `rank_absolute` slot). ⚠️ The series is NOT backfillable — yesterday's SERP cannot be re-bought, so absence of old dates is structural, never a bug to fix. Competitive data: **`internal`-scope bindings WITHOUT an organization only, 404 anti-oracle (audit §7)** — never client-facing), `get_seo_competitor_candidates` (TASK-1699 — the PROPOSE half of the competitor loop: candidates by MEASURED recurrence (versioned thresholds 3kw/5days/30d) with evidence + a suggested `proposalRef`; the EXECUTE is `declare_seo_competitors` (TASK-1662) and ONLY after human confirmation carrying that `proposalRef` verbatim — an agent must never declare straight from candidates without it. An empty list with a young series (<5 days) is the expected result, not an error. Same `internal`-only lane, 404 anti-oracle); writes **`track_seo_keywords` / `untrack_seo_keywords`** (TASK-1308), **`discover_seo_keywords`** (TASK-1664), **`prepare_seo_grounded_queries`** (TASK-1666), **`run_seo_prospect_diagnostic`** (TASK-1709 — spends ~USD 0.25/run of Efeonce acquisition budget; behind `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED`, today OFF everywhere), **`declare_seo_competitors` / `retire_seo_competitors`** (TASK-1662 — declaring a competitor is a DEFERRED SPEND COMMITMENT like tracking a keyword: monthly coverage bills the provider ~USD 0.11/competitor every cycle until someone retires it; governed per-target ceiling (default 5), **per-domain** outcomes (`declared\|already_declared\|capacity_exceeded\|invalid`), mandatory human authorship + opaque `proposalRef`; `retire` is the append-only reverse — closes `effective_to` with its own retirement authorship and cuts next-cycle spend, never deletes. Both ride the EXISTING `efeonce.mcp.seo.write` scope — zero Entra changes — so they are live-but-fail-closed until `TASK-1631` like every other write. First real use of the domain: Berel MX declared `comex.com.mx` with operator authorship; first real coverage run USD 0.1076 with the exact Δ in the ledger; real gap 357 `content_gap` / 54 `ranks_worse` / 269 excluded by measured GSC). **Gateway deploy DONE 2026-08-28** — this closed the `rollout pendiente` that TASK-1658/1696/1662/1699 declared; the deploy is no longer pending. `efeonce-mcp` `origin/main` moved `8f1ae34` → `92e7197` (the two commits `8215ab5` + `92e7197` that were sitting local), CI green, workflow "Deploy Cloud Run" run `33180234265` `success` with no approval gate. Productive revision is now **`efeonce-mcp-gateway-00024-8b8`** (`Ready=True`, 100% of traffic, image tagged to the exact SHA `92e71971899c6468fc111f7614b89ea6602ac0aa`), replacing `efeonce-mcp-gateway-00023-zt2` which served 21 — the delta is exactly those 6 tools (`get_seo_provider_spend`, `get_seo_keyword_gap`, `declare_seo_competitors`, `retire_seo_competitors`, `get_seo_serp_top_results`, `get_seo_competitor_candidates`). Front door verified: `GET https://mcp.efeonce.org/.well-known/oauth-protected-resource` 200 and `POST https://mcp.efeonce.org/mcp` without a token 401 (fail-closed). Closing canary green end to end against PRODUCTION (`scripts/greenhouse-seo-canary.mjs` with `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`, org Berel `org-32333527-02a8-487b-819e-6f76a761777d`): the 20 reads ✓, every deny `404` anti-oracle ✓, the 7 writes exercised at their gate without writing or spending ✓. The 4 new internal-only lanes answered against production: `serp-top-results` `rows: []` (expected — day 1 of the series is 2026-08-29), `competitor-candidates` `candidates: []` (expected with a series <5 days), `keyword-gap` 1 declared competitor, `provider-spend` ✓. **ZERO Entra changes in the deploy**: the two new writes ride the pre-existing `efeonce.mcp.seo.write` scope, so they stay live-but-fail-closed until `TASK-1631` exactly like every other write. 🔴 **The write is a DEFERRED SPEND COMMITMENT, not an insert**: daily rank capture bills the provider for every keyword still tracked, on every cycle, until someone untracks it — so the tool description tells the agent to propose the exact list and get human confirmation BEFORE calling, and to read the **per-keyword** outcomes array (`tracked\|already_tracked\|intent_changed\|capacity_exceeded\|invalid`), never just `data.ok`. The command owns the defenses: governed per-target ceiling (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`, default 200), per-ORG `seo_v2` entitlement (canonical key since `TASK-1677`; `seo_v1` is no longer read), idempotency, and an append-only reverse (`untrack` closes `effective_to`, never deletes). 🔴 **`TASK-1659` — the optional `intent` (`target\|opportunity`) is a declared fact with an author, not an editable attribute.** It has **no default**: a caller that does not declare writes `NULL`, and guessing `opportunity` fabricates a classification nobody made (that is also why the column was never backfilled). It is **orthogonal to `source`** (who executed the write) and is NOT the provider-estimated search intent carried by discovery candidates; `intentDeclaredBy` differs from the actor when an agent declares on someone's behalf. Changing it is **never an `UPDATE`** — the current membership is closed and a new one opened, so the history "it became a target in March, when it sat at 45" survives; that transition consumes **no capacity** (the active count does not move) and surfaces as its own outcome `intent_changed`, so an agent must not report it as `already_tracked`. It needs no new capability and no new Entra scope. The ecosystem lane accepts both writes **only from `internal`-scope bindings** — a client binding reads its own opportunities but cannot grow its own invoice; the Greenhouse app-lane (`POST /api/admin/growth/seo/keywords/{track,untrack}`) is the one that requires a per-human capability (`growth.seo.target.configure`). Both writes share the domain scope `efeonce.mcp.seo.write` — see the write-scope hard rule above: it is **not** wired to the shared public PKCE client and must not be, so the tools are live-but-fail-closed until `TASK-1631`. Since TASK-1658 the parity guard is **bidirectional and runtime-introspected**: it fails NAMING the tool when a Greenhouse-internal SEO tool is neither federated nor excluded (the direction that used to be invisible — 8 tools drifted silently under a green guard), when a federated inputSchema diverges from the internal MCP without a declared reason (source case: `track_seo_keywords` federated `.strict()` without `intent`/`intentDeclaredBy`), and when a federated tool lacks `annotations` or its `readOnlyHint` contradicts its class (`readOnlyHint: false` on any tool that writes or BUYS provider data). Federation protocol now starts in GREENHOUSE, not in the gateway (TASK-1780): (1) entry in `src/mcp/greenhouse/tool-manifest.ts` + `pnpm mcp:manifest:generate` → (2) `pnpm greenhouse:manifest:sync` in the gateway → (3) provider method + types → (4) `registerTool` WITH annotations → (5) `EXPECTED_*` entry with reason → (6) canary. Step 1 is NEVER editing a list in the gateway any more; `inputKeys` come from introspection, never transcription. The HTTP scope gate derives its write list from the inventory (`GREENHOUSE_SEO_WRITE_TOOLS`), so a domain's write N+1 inherits the 403 challenge without touching app.ts. The hand-written mirror is GONE since `TASK-1780`: the guard's inventory is derived from Greenhouse's canonical manifest (`src/mcp/greenhouse/tool-manifest.ts`), shipped as a generated, hash-verified artifact (`pnpm mcp:manifest:generate` → `pnpm greenhouse:manifest:sync`). Federated capabilities with no internal counterpart are declared in `GREENHOUSE_GATEWAY_NATIVE_TOOLS` with a reason, never absent. |
| Hiring/ATS, Talent Pool, candidate review, assessment assignment or selection journey | `greenhouse-talent-people-operator` + identity/integrations owners | `TASK-1726` Talent Pool readers and `TASK-1718` exact candidate-review readers are live internal-only. Candidate review exposes only redacted hash-bound CV chunks with purpose/audit; no contact, ranking or write. `TASK-1719`–`TASK-1722` and `TASK-1631` retain write/external gates; TASK-1718 retains formal sign-off and revocation evidence. |
| HubSpot or service-intake capability | `hubspot-greenhouse-bridge` or `hubspot-as-a-service` | Provider owns CRM contract and consent |
| Teams-facing capability | `teams-bot-platform` | Teams platform owns tenant, consent and delivery |
| Product UI/agent parity | Relevant product skill plus `software-architect-2026` | UI/API/MCP consume the same command or reader |
| Release, rollback or production promotion | `greenhouse-production-release` | Release control plane owns promotion and rollback |
| New capability split, write or ADR/task scope | `greenhouse-task-planner` | Product owner keeps its task and decision |
| Tests, rollout, incident or live verification | `greenhouse-qa-release-auditor` | Evidence is proportional and runtime-honest |
| Docs, task lifecycle or skill change | `greenhouse-documentation-governor` | Update canonical docs and both skill mirrors |

For a domain not listed here, use the `AGENTS.md` router. Do not invent an adapter instead of loading the owner skill.

## Delivery loop

1. **Classify.** Identify gateway-only, provider-only or cross-runtime work. Name the product owner, source of truth,
   access model, tool class and whether the action is read or write.
2. **Contract.** Define a narrow capability name, input/output schema, scope, provider policy, canonical downstream
   reader/command, error/redaction behavior, timeout and rollback. Use
   [`capability-intake.md`](references/capability-intake.md).
3. **Gate.** For shared API/auth/cloud/workflow changes, identify or propose an ADR and task before implementation.
   For Globe, preserve the `TASK-1473` package/API/IAM gate.
4. **Implement.** Keep gateway transport and provider adapter thin. Pin downstream contracts, set explicit timeouts and
   correlation IDs, and keep providers disabled until their canary passes.
5. **Verify.** Run local contract tests, auth-negative tests and provider allow/deny/fault tests. For public exposure,
   also prove DNS, TLS, protected-resource metadata, unauthenticated rejection and an authenticated MCP initialize.
   Use [`verification-matrix.md`](references/verification-matrix.md).

   **A registered tool is not a working tool.** Tests + `registerTool` only prove wiring. Before calling a tool done,
   exercise its lane endpoint against a real deployment and confirm it returns the SAME numbers the UI shows — that
   equality IS the parity proof. Shortest path, no OAuth canary needed (TASK-1306):

   ```bash
   TOK=$(gcloud secrets versions access latest --secret=<consumer-token-secret> --project efeonce-group)
   curl -s -H "Authorization: Bearer $TOK" -H "x-vercel-protection-bypass: $BYPASS" \
     "$BASE/api/platform/ecosystem/<lane>?externalScopeType=other&externalScopeId=<consumer-key>&organizationId=<org>"
   ```

   - **`externalScopeType` + `externalScopeId` are REQUIRED** and are what you will forget first: without them the lane
     answers `400 missing_external_scope_type`, which reads like "endpoint missing" but actually means it arrived fine
     and the binding is absent.
   - ⚠️ **The ecosystem lane cannot be exercised on `localhost`**: it returns `500` from an `ENOENT` of
     `@opentelemetry/instrumentation` in `node_modules`, and fails identically for endpoints that have been healthy in
     production for months. A local `500` is NOT evidence about your new endpoint — compare against a sibling lane
     endpoint first; if both fail, it is the environment. Verify against the staging deployment.
   - Always also assert the deny path (`404` anti-oracle for an org without the module) and `401` without a token: a
     lane that only proves the happy path proves half of it.
6. **Close.** Update the architecture/runbook/task/handoff that own the change, sync both skill bundles, then run the
   proportional QA and documentation gates. State `complete`, `code complete, rollout pendiente` or
   `operativamente bloqueado` without euphemisms.

## Incident path

For TLS/DNS/OAuth/provider failure, fail closed first. Read the MCP runbook, identify the layer (DNS, certificate,
ALB, Cloud Run ingress, OAuth, registry or provider), capture redacted evidence and use the product owner's rollback.
`FAILED_NOT_VISIBLE` for a Google-managed certificate is not a reason to make `/mcp` anonymous or bypass the load
balancer; verify all A/AAAA answers, proxy attachment, port 443 and certificate-map precedence, then allow Google
to retry while the managed status remains `PROVISIONING`.

## References

- [`capability-intake.md`](references/capability-intake.md): capability and provider contract checklist.
- [`verification-matrix.md`](references/verification-matrix.md): minimum evidence by change and public-edge incident.
