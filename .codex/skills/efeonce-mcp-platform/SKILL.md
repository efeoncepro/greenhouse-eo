---
name: efeonce-mcp-platform
description: Design, expose, secure, deploy, troubleshoot, or verify Efeonce MCP capabilities and providers. Use for requests involving mcp.efeonce.org, Streamable HTTP, MCP tools/resources/prompts, OAuth resource servers, provider federation, MCP client interoperability, MCP Cloud Run/front-door/TLS incidents, or adding an Efeonce product capability to MCP. Route each domain concern to its owner skill; do not use for browser-only WebMCP work.
---

# Efeonce MCP Platform

Use this skill as the control-plane router for Efeonce MCP. The gateway is a neutral adapter: it owns transport,
OAuth validation, discovery, routing, redaction and operational isolation. Products own business logic, data,
entitlements, providers and their canonical readers/commands.

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
  vendor candidate without explicit approval. The gateway declares four scopes: base `efeonce.mcp.read`,
  Globe reader `efeonce.mcp.globe.read`, the flag-gated internal write
  `efeonce.mcp.globe.credits.funding.ensure` and the flag-gated SEO write `efeonce.mcp.seo.write` (TASK-1308).
  Scope granularity is **one scope per blast-radius class, never one per capability**: a per-capability list turns
  Entra into a hand-edited mirror of Greenhouse's `capabilities_registry`, the two drift, and a drifted
  authorization mirror is worse than none — it also makes the gateway an authorization authority, which rule 1
  forbids. The scope answers "may this client perform this CLASS of action?"; the capability answers "may this
  actor, on this org?" and is enforced downstream in the canonical lane and command. `globe.credits.funding.ensure`
  is the rule applied, not an exception: it owns a scope because it MOVES MONEY under a one-shot authorityId.
  Consequence: federating a domain's N+1 write needs no Entra change and must never be blocked on one.
  The current Entra client receives base + reader even when it requests
  only the base, so it cannot prove base-only persona denial; retain a dispatch-level deny test and add a real
  base-only client before that rollout.
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
- The current Hiring portal routes are **not** MCP contracts: the Application 360 document reader is internal UI
  parity, and the direct assessment route has a one-shot raw token response. Never forward either through the
  gateway. `TASK-1718`–`TASK-1722` describe a separately redacted reader and proposal/confirm adapters; no
  `greenhouse-hiring` provider or Hiring tool is registered today. Keep the entire lane disabled and write scopes
  fail-closed until its canonical command/policy, delegated grant (`TASK-1631`) and front-door allow/deny canary pass.
- Do not call a product deployment successful because its MCP adapter compiled. Require provider allow/deny/fault
  evidence and a public gateway smoke.
- Keep the Codex and Claude bundles byte-identical. Update both in the same change and verify the diff.

## Choose the route

| Work | Load in addition to this skill | Canonical boundary |
| --- | --- | --- |
| Gateway, provider registry, API boundary or shared contract | `software-architect-2026` | Architecture + ADR/task before code |
| Cloud Run, ALB, DNS, TLS, WIF, OAuth config or secrets | `cloud-run-basics`, `greenhouse-secret-hygiene` | Runbook; no keys or unsafe bypasses |
| Globe capability, creative asset, model or workspace policy | `greenhouse-globe`, `greenhouse-ai-creative-rights-governance` | Globe owns API/SDK/policy; `TASK-1473` gates federation. Only the internal fleet reader is currently enabled. |
| Growth SEO capability (Search Visibility 360, EPIC-022) | `seo-aeo-practice` plus `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` | MCP-first per operator directive (2026-08-05). **LIVE IN PRODUCTION since 2026-08-06: `TASK-1645` and `TASK-1647` are both `complete`.** The ecosystem lane `/api/platform/ecosystem/growth/seo/*` plus its MCP tools serve production behind `GROWTH_SEO_ENABLED` (multi-runtime: Vercel for the lane, `ops-worker` for the GSC materializer — turning it on in one runtime leaves the other path dead). The gateway provider `greenhouse-seo` is ENABLED on `mcp.efeonce.org`: revision `efeonce-mcp-gateway-00012-dkj`, `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`, `GREENHOUSE_ECOSYSTEM_TOKEN` as a Cloud Run **secret ref** (`efeonce-mcp-gateway-greenhouse-token:latest`, never a plain value), consumer `EO-SPK-0004` + binding `EO-SPB-0004`. **Gotcha when wiring a secret ref:** that secret was created with zero IAM bindings — the gateway runtime SA `efeonce-mcp-gateway@efeonce-group` needs a scoped `secretAccessor` or the deploy fails; and `--set-secrets` is destructive exactly like `--set-env-vars`, so every secret must be declared in the same flag in `deploy.yml`. Production canary (`scripts/greenhouse-seo-canary.mjs` against `https://greenhouse.efeoncepro.com`): Berel `domainQuadrant=riesgo` with 50 keywords and AEO 44.5; Efeonce entitlement ok + honest `no_seo_data`; deny anti-oracle 404. The authenticated front-door smoke lives in `scripts/oauth-canary.mjs` (`MCP_CANARY_SEO_ORGANIZATION_ID` + `MCP_CANARY_SEO_DENY_ORGANIZATION_ID`) and passed 2026-08-06 with a real Entra token on the base scope: `initialize 200`, `seoEntitlementStatus 200`, `seoVisibility360Status 200`, `seoDomainQuadrant="riesgo"` (Berel's real quadrant through the public front door), `seoDenyFailedClosed=true`. It needs an interactive Entra login — human-assisted, not CI-automatable — but since 2026-08-06 the script is no longer the only authenticated path: any tenant Entra user can connect a standard MCP client (Claude Code, claude.ai, Claude Desktop) through the gateway's DCR shim. Foundation is live (`TASK-1299` schema, `TASK-1301` per-org `seo_v1` entitlement, `TASK-1300` DataForSEO registry + cost ledger, `TASK-1302` GSC materializer live, `TASK-1305` SEO↔AEO quadrant reader); every provider-facing SEO write passes `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`), and every future SEO/E-E-A-T reader ships its MCP tool in the same PR. Eventual home is Wave (`wave.efeonce.org`, EPIC-037).<br><br>**Tool inventory as-of 2026-08-07 — 9 reads + 2 writes** (`src/mcp/greenhouse/server.ts`): reads `get_seo_keyword_opportunities`, `get_seo_visibility_360`, `get_seo_entitlement`, `get_seo_rank_evolution`, `get_seo_performance`, `get_seo_performance_catalog`, `get_seo_overview_kpis`, `get_seo_site_audit_report`, `get_seo_backlink_profile`; writes **`track_seo_keywords` / `untrack_seo_keywords`** (TASK-1308, federated). 🔴 **The write is a DEFERRED SPEND COMMITMENT, not an insert**: daily rank capture bills the provider for every keyword still tracked, on every cycle, until someone untracks it — so the tool description tells the agent to propose the exact list and get human confirmation BEFORE calling, and to read the **per-keyword** outcomes array (`tracked\|already_tracked\|intent_changed\|capacity_exceeded\|invalid`), never just `data.ok`. The command owns the defenses: governed per-target ceiling (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`, default 200), per-ORG `seo_v2` entitlement (canonical key since `TASK-1677`; `seo_v1` is no longer read), idempotency, and an append-only reverse (`untrack` closes `effective_to`, never deletes). 🔴 **`TASK-1659` — the optional `intent` (`target\|opportunity`) is a declared fact with an author, not an editable attribute.** It has **no default**: a caller that does not declare writes `NULL`, and guessing `opportunity` fabricates a classification nobody made (that is also why the column was never backfilled). It is **orthogonal to `source`** (who executed the write) and is NOT the provider-estimated search intent carried by discovery candidates; `intentDeclaredBy` differs from the actor when an agent declares on someone's behalf. Changing it is **never an `UPDATE`** — the current membership is closed and a new one opened, so the history "it became a target in March, when it sat at 45" survives; that transition consumes **no capacity** (the active count does not move) and surfaces as its own outcome `intent_changed`, so an agent must not report it as `already_tracked`. It needs no new capability and no new Entra scope. The ecosystem lane accepts both writes **only from `internal`-scope bindings** — a client binding reads its own opportunities but cannot grow its own invoice; the Greenhouse app-lane (`POST /api/admin/growth/seo/keywords/{track,untrack}`) is the one that requires a per-human capability (`growth.seo.target.configure`). Both writes share the domain scope `efeonce.mcp.seo.write` — see the write-scope hard rule above: it is **not** wired to the shared public PKCE client and must not be, so the tools are live-but-fail-closed until `TASK-1631`. ⚠️ The gateway's parity guard did NOT see these tools: its regex was pinned to `get_seo_*` back when every tool was a read (widened to the domain in TASK-1653) — when adding a write to any domain, check the guard's pattern before trusting a green parity run. |
| Hiring/ATS candidate review, candidate-test assignment or selection journey | `greenhouse-talent-people-operator` + identity/integrations owners | No provider is registered. Portal document reader and direct Hiring routes stay private; `TASK-1718`–`TASK-1722` own a redacted reader/proposal path and remain fail-closed pending `TASK-1631`. |
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
