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

## Load `mcp-craft` alongside this skill

`mcp-craft` is the **domain-free craft**: tool granularity, context budget, naming, description
writing, response shaping, error design, deprecation, drift gates, surface evaluation, and a
**dated protocol radar**. This skill is its **consumer** — it owns our gateway, its scopes, its
federation and its runtime; it does not restate the craft.

🔴 **Never assert what the MCP spec says from memory.** The `2026-07-28` revision removed
`initialize` and sessions, and deprecated Roots, Sampling, Logging and DCR on a clock — but no
client implements it yet, so the handshake lane is correct TODAY. Read
`mcp-craft/protocol-radar.md`, and verify against the source when the decision is expensive.

## First reads

Read, in order:

1. `AGENTS.md`, `project_context.md` and `Handoff.md`.
2. [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../../../docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md),
   [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../../docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) and active
   [`TASK-1626`](../../../docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md).
3. The provider's canonical architecture, task and live runtime handoff.
4. The smallest reference below that matches the work.

If a source conflicts with remembered behavior, the verified runtime and its canonical architecture win.

## Native authority (TASK-1836 / TASK-1831)

For Microsoft SSO, direct `/login`, native tokens, population/context, `gv`, token revocation or multi-issuer
rollout, load [`references/native-authority.md`](references/native-authority.md). Corporate authentication,
Efeonce ID session and MCP authorization are separate proofs. Current deployment/cohort evidence belongs
to the internal rollout runbook and tasks, never to a cached revision in this skill.

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
- 🔴 **DCR is DEPRECATED as of MCP revision `2026-07-28` — the shim stays, but do NOT read it as the mechanism
  the protocol is heading toward.** Registered 2026-09-02 against the live spec. The
  [deprecated registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) lists Dynamic Client
  Registration as `Deprecated` ([PR #2858](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2858)),
  migration path **Client ID Metadata Documents (CIMD)**, **earliest removal = first revision released on or after
  2027-07-28** (a Core Maintainer decision that may land later). Normative order is pre-registration → CIMD
  (`SHOULD`, advertised via `client_id_metadata_document_supported`) → DCR (`MAY`, via `registration_endpoint`) →
  manual entry. **We keep the shim on purpose, not by inertia:** the spec retains DCR *"for backwards compatibility
  with authorization servers that do not support Client ID Metadata Documents"*, and Entra supports **neither** CIMD
  **nor** DCR — pre-registration is its only official path, which is exactly what `POST /register` returns.
  **NEVER open a task to "migrate the gateway to CIMD": it is not implementable at this layer.** CIMD is an
  *authorization server* capability — the AS resolves the URL-shaped `client_id`. The shim's AS today is Entra; the
  gateway *mirrors* `authorize`/`token`, it does not proxy them, so a URL `client_id` goes straight to Entra and is
  rejected. Supporting CIMD requires ISSUING the tokens, i.e. being a real authorization server — forbidden for the
  gateway by the neutral-adapter rule. That issuer now exists as its own deployable: Efeonce's native authorization
  server in `services/auth-server` (EPIC-044; ADR `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`,
  Accepted 2026-09-03; `TASK-1828` runtime; `TASK-1829` OAuth metadata + CIMD as the primary client
  mechanism with DCR only as compatibility fallback). Verify issuer environment, revision and flags via
  the auth runbook; contract `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`, CIMD in
  `src/lib/auth-server/oauth/cimd.ts`. CIMD work belongs to that domain; this evaluation was its input, never a
  parallel track. `TASK-1631` no longer owns CIMD — it delivered the Account 360 binding (see "External access binding" below).
- ⚠️ **The clock that matters is the client's, not the spec's — and a nearer break is already written.** 2027-07-28
  only marks when DCR becomes *eligible* for removal from the spec; what actually kills the shim is Claude Code /
  claude.ai / Claude Desktop dropping the DCR fallback, with no announced date. Worse, the same `2026-07-28`
  revision added text that did **not** exist in `2025-11-25`
  ([authorization server discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)):
  the metadata document's `issuer` **MUST** be identical to the issuer identifier used to build the well-known URL,
  and if they differ the client **MUST NOT** use the metadata. **Ours differ** (verified live 2026-09-02):
  `authorization_servers: ["https://mcp.efeonce.org"]`, but that origin's
  `/.well-known/oauth-authorization-server` returns Entra's issuer. It works today only because real clients do not
  enforce it yet — empirical, not guaranteed. **NEVER "fix" this by claiming `issuer: https://mcp.efeonce.org`**:
  that trades RFC 8414 §3.3 for a worse RFC 9207 `iss` mismatch (Entra emits its own `iss`; we pass that check today
  *precisely because* we mirror Entra's real issuer). The mismatch is the intrinsic cost of announcing as an AS
  without issuing tokens; it is not patchable below the broker. **Contingency if any client hardens first**
  (spec priority 1, no architecture change, plan B only — do not execute unprompted): point `authorization_servers`
  back at Entra's real issuer, unset `OAUTH_PUBLIC_CLIENT_ID` (the shim is already gated on it and collapses on its
  own), and have each tenant user configure client id `32617b87-e7ef-493a-838f-1ff3f0213b93` by hand. Full reasoning
  in the gateway ADR, §"Delta 2026-09-02".
- ⚠️ **Static shared `client_id` + bare `http://localhost` = confused-deputy-shaped risk, and it is NOT closable in
  the shim.** The spec's normative line (*"MCP proxy servers using static client IDs MUST obtain user consent for
  each dynamically registered client before forwarding to third-party authorization servers"*) does **not** bind us
  literally — the gateway mirrors `authorize`/`token`, it never forwards, and `POST /register` returns JSON with **no
  consent screen and no cookie** (so the "consent cookie set before approval" failure mode is **refuted** for this
  codebase, verified in `src/app.ts`). But the risk it prevents is present by construction: every tenant user shares
  ONE `client_id`, its Entra redirect URIs include bare `http://localhost` (no port — verified 2026-09-02), and Entra
  caches consent per `(user, application)`, so after the first consent there is **no second screen**. A local
  malicious process can obtain a token silently on any loopback port with its own PKCE. Blast radius is bounded by
  the write-scope rule above — the shared public client carries **no** write scope, so a stolen token is read-only;
  that rule is doing security work beyond the reason it was written for. **NEVER close this by adding a consent
  screen to the gateway** (that would make it an authorization authority) and **NEVER by narrowing `http://localhost`
  alone** (it is what Claude Code's loopback needs). Per-client consent requires per-client identities with revocable
  grants. The grant side ALREADY exists (`greenhouse_core.external_capability_grants`, revocable per organization and
  per person — `TASK-1631`, applied 2026-09-04); what closes this finding is the native issuer + multi-issuer gateway
  of EPIC-044 (`TASK-1829`/`1830`/`1831`/`1832`), where per-client identities get tokens carrying `gv` — `TASK-1829`
  (issuer surface) and `TASK-1830` (person session) own issuance and consent. The internal authority path
  is implemented by `TASK-1836` with the `TASK-1831` consumer; external eligibility and client canaries
  still require separate current evidence. The legacy shared-client finding remains under review.
  **Never infer the client's blast radius from its display name.** Identify the configured public client
  by appId and inspect `requiredResourceAccess`, `publicClient.redirectUris`, consent and assignment.
  TASK-1804 recorded a rename on 2026-09-02 because the shared production client's former name suggested
  a local canary; a rename changes neither authority nor redirect behavior. The separate base-only canary
  has its own appId and must not be confused with the client returned by the compatibility shim. Read the
  current configuration before drawing conclusions; the historical rename is not a live name/scope check.
- Derive tenant/workspace from verified identity and provider policy. Never accept a free-form tenant boundary.
- Treat `auth.efeonce.org` as session/runtime-isolated, not identity-isolated. Greenhouse, auth and MCP keep separate
  cookies, session secrets and token audiences, but an existing customer must resolve to one canonical
  `identity_profile` and Account 360 membership through audited source links. Never share the Greenhouse cookie or
  create a permanent second customer credential. The convergence contract is APPLIED (`TASK-1631`, 2026-09-04): a
  customer resolves to one `identity_profile` through the source link `external_idp:<environment_id>` + `subject`,
  and to Account 360 through a `linked` invitation under an active binding — see "External access binding" below.
  The browser login that produces that subject is the native issuer of EPIC-044 (`TASK-1830`, live since 2026-09-05).
- Greenhouse's existing NextAuth + sister-platform OAuth broker is a reusable identity foundation, not a public MCP
  authorization server. The WorkOS / native / hybrid comparison is CLOSED: ADR
  `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (Accepted 2026-09-03) picks Efeonce's own
  issuer at `auth.efeonce.org`, built as `services/auth-server` (`TASK-1828` runtime in production since 2026-09-04;
  `TASK-1829` OAuth metadata + CIMD/DCR + token issuance;
  `TASK-1830` hosted login/consent that calls `acceptExternalInvitation` in-process;
  `TASK-1836` corporate OIDC and internal authority with a separate enrollment path;
  `TASK-1831` multi-issuer gateway with `gv` verification, `TASK-1832` client canaries, `TASK-1833` security
  posture). Never make the gateway own browser login or share a Greenhouse cookie/`NEXTAUTH_SECRET`, and never make
  a Greenhouse release the rollback boundary for external OAuth.
- The gateway's front door serves a SECOND host, `auth.efeonce.org` — the native authorization server
  (`services/auth-server`, `TASK-1828` / EPIC-044; single Cloud Run service shared by staging and production,
  so verify runtime impact before treating a staging deploy as isolated). `efeonce-mcp/infra/terraform` (`6a144a5`,
  `enable_auth_host` default `true`) adds a host rule → its own backend `efeonce-auth-server-backend` (serverless NEG,
  `us-east4`) under the SAME Cloud Armor policy, plus its own managed cert `efeonce-auth-server-cert` (ACTIVE) on the
  same forwarding IP `34.111.78.237`; plan was 3 add / 2 change / 0 destroy and `mcp.efeonce.org` stayed intact. The
  gateway does NOT mint tokens; native verification belongs to `TASK-1831`.
  **NEVER add the host by editing `managed.domains` of the gateway certificate** — that field is ForceNew and
  re-provisions `mcp.efeonce.org`. Runbook `docs/operations/runbooks/auth-server.md`; the service's own env vars,
  KMS signing key and rotation belong to `.claude/rules/auth-server.md` + `greenhouse-secret-hygiene`.
- Customer access needs entitlements that issue and revoke access per tenant and capability — and those EXIST
  since `TASK-1631` (applied 2026-09-04): `greenhouse_core.external_capability_grants` under an Account 360 binding,
  revocable per organization and per person. The native issuer (`TASK-1829`/`1830`) mints tokens; the
  multi-issuer gateway (`TASK-1831`) verifies them. `TASK-1836` implements corporate internal authority,
  which does not certify external client eligibility or canaries (`TASK-1832`). Determine those from
  current canonical readers and the rollout record, not from the presence of an issuer or internal pilot.
  No vendor gets provisioned: WorkOS was discarded by the native ADR.
  The gateway declares five scopes when all gated providers are active: base `efeonce.mcp.read`,
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
  per-capability grant. The grant side EXISTS (`external_capability_grants`, `TASK-1631`, 2026-09-04); the token
  that carries it (`gv` claim minted by the native issuer, verified by the multi-issuer gateway) is EPIC-044
  (`TASK-1829`/`1830` ON in the live revision since 2026-09-05; `1831`/`1832` pending). Until that lands write
  tools stay federated and
  **fail-closed**: registered, verifiable, with no token that opens them. Verbatim rationale in the gateway ADR,
  §"El scope de escritura NO se cablea al cliente público compartido".
  ⚠️ `az ad app update` **replaces** the whole scope array: any Entra scope change goes with a verified round-trip or
  it wipes the live ones.
- **Operating manuals travel through the protocol (Greenhouse `TASK-1804`).** The internal MCP and the gateway both
  serve `get_greenhouse_skill` (domain `platform`, read-only, base scope): without `name` the catalog, with `name` the
  full manual as text; also as resource `skill://efeonce/<name>/SKILL.md`. Source of truth is the manifest
  `src/mcp/greenhouse/skill-manifest.ts` + `docs/mcp/skills/**/SKILL.md` (frontmatter `name`/`description` is the
  catalog; never transcribe it), reader `skill-catalog.ts`, lane `/api/platform/ecosystem/mcp/skills[/{name}]`. The
  gateway provider `greenhouse-skills` delegates to the lane and NEVER embeds content; it rides the SEO provider's
  config (same lane, same service identity). `audience: internal` only exists for `internal` bindings — client
  bindings get an empty catalog and 404 anti-oracle on detail, never 403. A manual that leaks a UUID, `org-` id,
  repo path, task id, secret name or GCP project breaks the build (leak test); NEVER serve `.claude/skills/**` by
  MCP. The SEO parity guard is domain-anchored, so non-SEO federated tools are declared in
  `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` (+ `computeFederatedNonSeoToolFindings`). Manuals today (read the
  count from the manifest, never from here): `seo-spend-discipline`, `seo-visibility-reading`, `competitor-loop`,
  `seo-discovery-to-tracking`, `seo-technical-health`, `seo-prospect-diagnostic` (all internal). **Gateway deployed 2026-09-02**
  (`efeonce-mcp` `c588a1b`, revision `efeonce-mcp-gateway-00028-pmx`, front door 200/200/401); the Greenhouse lane was
  released to production the same day (release `375f56e24187-546f452b-…`, target `375f56e24`) and the post-release
  contract canary was green (count=3 exact, bodies byte-identical to the artifact, 404/401, gateway provider 5/5). Runtime lesson: the catalog ships as a
  generated artifact (`pnpm mcp:skills:generate` / `mcp:skills:check`); reading `docs/mcp/skills/**` with `node:fs`
  from any route-reachable module made Turbopack include the whole project (397 MB function, 3 failed staging builds).
  **Update 2026-09-03 (`TASK-1805`, ETV methodology provenance):** tool manifest `8969c8d39c1f` —
  `get_seo_domain_overview` / `get_seo_url_visibility` / `get_seo_prospect_diagnostic` now declare `etvMethodology`
  in their descriptions and transport the `not_available_for_method` failure; no methodology argument exists on any
  tool. Gateway synced and deployed at revision `efeonce-mcp-gateway-00029-bwg` (front door verified), serving the
  manual catalog hash `a7206060a788` (`seo-visibility-reading` + `seo-prospect-diagnostic` carry the ETV contract).
  The same day `seo-spend-discipline` gained the ETV evaluator paragraph, so the regenerated repo catalog hash moved
  to `a3538411a7fd` (`pnpm mcp:skills:generate`); the provider delegates to the lane, so the new bodies reach the gateway with the next
  Greenhouse release — nothing to redeploy on the gateway side for a manual text change.
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
  tokens, every Hiring write and B2B access remain outside this provider and keep the `TASK-1719`–`TASK-1722`
  write gates plus, for B2B access, the EPIC-044 issuer/gateway gate (the per-org/per-person grant itself exists
  since `TASK-1631`). TASK-1718 remains open for formal sign-offs and revocation/rollback evidence.
- The related Greenhouse public consent flow and operator invitation flow are enabled independently in production
  (`HIRING_TALENT_POOL_SELF_SERVICE_ENABLED=true`, `HIRING_TALENT_POOL_INVITE_ENABLED=true`). They are not MCP
  writes: future-opportunity consent requires the candidate's tokenized confirmation, and invitation is a human-
  confirmed, exact-opening command that never advances a stage or assigns an assessment on its own. The MCP provider
  remains read-only and must not be expanded to expose CV/contact data or execute invitation, assessment or selection
  actions. Activation evidence: orchestrator `31953851353` released, Vercel deployment
  `dpl_CTxG3tx66S159tazMSyNiGSmqzHJ` READY, `ops-worker-00563-ghv` Ready, and watchdog `ok`/`drift_count=0`.
- Do not call a product deployment successful because its MCP adapter compiled. Require provider allow/deny/fault
  evidence and a public gateway smoke.
- **El cartel del servidor (`title`/`websiteUrl`/`icons`) vive en `efeonce-mcp:src/branding.ts`, fuente única.**
  Los `icons[].src` se **derivan** de `MCP_PUBLIC_URL` (el spec pide mismo origen y fetch sin credenciales) y
  **NUNCA** son `data:` URI: en el carril moderno el SDK estampa el `serverInfo` COMPLETO en el `_meta` de cada
  resultado, así que un base64 se repetiría en todo el tráfico. Un ícono sólo se declara **si sus bytes
  cargaron** (asset ausente ⇒ sin ícono + WARNING, jamás una promesa que da 404), y el `Dockerfile` debe copiar
  `assets/` o el ícono desaparece en producción con todos los tests verdes — `test/branding.test.ts` afirma esa
  línea y amarra declaración ↔ ruta ↔ bytes. ⚠️ **Ningún cliente Claude renderiza `icons` hoy**: claude.ai lo
  ignora ([claude-ai-mcp#152](https://github.com/anthropics/claude-ai-mcp/issues/152), abierto) y Claude Code lo
  cerró *not planned*; el reporte ya descartó empíricamente favicon, `data:` URI y `<link rel=icon>`. **NUNCA**
  abras trabajo para "hacer que se vea": no hay palanca del lado servidor. El asset es UNO —isotipo blanco sobre
  placa navy opaca, sin radio horneado (el cliente que enmascara recortaría nuestro arco)— y **NUNCA** declara
  `theme`: la placa opaca no lo necesita, el spec no define si describe el fondo del ícono o el del cliente, y
  sin cliente que renderice no hay forma de falsificar una lectura invertida. ADR §Delta 2026-09-05.
- Keep the Codex and Claude bundles byte-identical. Update both in the same change and verify the diff.

## External access binding (TASK-1631, applied 2026-09-04)

The Account 360 binding for external identities is LIVE in `greenhouse_core` (one Cloud SQL instance; both
migrations applied; no client grants issued yet). Anyone federating a tool that a customer will call must know this
graph, because the gateway will resolve the caller against it:

- `external_identity_environments` (an issuer: `issuer_class` internal|external, `status` draft|active|suspended|
  retired; `issuer_class` is immutable, issuer rotation is an audited UPDATE) → `external_organization_bindings`
  (org ↔ environment, `grants_version` ≥1) → `external_capability_grants` (namespaced capability; `profile_id` NULL =
  every linked member of the binding, set = only that person) → `external_member_invitations` (the row in status
  `linked` IS the membership; `person_memberships` is not written).
- A person is resolved by the source link `external_idp:<environment_id>` + `subject` on
  `identity_profile_source_links` — **never by `client_id`, never by email** (email only disambiguates while
  ACCEPTING an invitation; >1 match is `identity_collision`).
- Gateway contract (`TASK-1831` consumes it): `GET /api/platform/ecosystem/identity/binding?environment=<id>&subject=<sub>[&clientId=<azp>]`
  on the ecosystem lane with the existing `efeonce-mcp-gateway` consumer (`internal` binding only; anything else is
  404 anti-oracle; missing params 400). Response = `{ outcome, issuerClass, profileId, memberships[{ bindingId,
  organizationId, externalOrganizationRef, grantsVersion, grants[], designatedAdmin }] }` + `cacheTtlSeconds: 60`,
  `Cache-Control: private, no-store`. The gateway compares `grantsVersion` with the token's `gv` claim by EQUALITY;
  every revoke bumps it. Denials (`unbound|revoked|environment_inactive|profile_inactive`) are logged with a hashed
  subject and feed the `identity.external_binding.*` reliability signals.
- Writes go only through the commands in `src/lib/identity/external-access/**` (one tx: state + audit + outbox;
  admin routes under `/api/admin/identity/external-access/**`, capability-gated to `efeonce_admin`);
  `acceptExternalInvitation` has no public route — the auth-server (`TASK-1830`) imports it in-process. Smoke after
  touching any of it: `pnpm identity:external-access:smoke`. Invariants: `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
  §"External identity binding (TASK-1631)"; functional: `docs/documentation/identity/binding-identidad-externa-mcp.md`.
- Native issuer (`TASK-1829`), person session (`TASK-1830`), multi-issuer consumer (`TASK-1831`) and internal
  authority (`TASK-1836`) have separate contracts. Issuer environment activation uses
  `pnpm auth-server:register-issuer-environment`, never direct SQL. Resolve current environment, binding
  population, flags and external eligibility live; internal issuance is not evidence of an external cohort.
  The binding endpoint described above is the external contract; native internal dispatch uses the
  context/token-aware reader defined in the internal authority ADR. See `references/native-authority.md`.
- External invitation delivery & delegated authority (`TASK-1837`; migration applied 2026-09-06; verified
  end-to-end in staging 2026-09-06 — real email, accept, magic link, session, forced bounce, resend, reveal and
  delegated lane — audit `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`; both flags
  ON in Vercel staging, Production pending release):
  with `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` ON the invitation email goes out from Greenhouse itself —
  acceptance URL `<issuer origin>/i/<token>`, derived from `external_identity_environments.issuer_url` of the
  binding's environment, never from an env var — and the admin response carries `delivery` but **no token**
  (`token` exists only with `delivery.mode='manual'`, i.e. flag OFF). Resend = rotate (the open row becomes
  `revoked`, the old token answers `invitation_not_open`); reveal is a governed exception (capability
  `identity.external_invitation.reveal_token`, reason ≥10 chars, 1 h row, audit without the token). The gateway
  is the ONLY caller of the delegated lane `GET/POST /api/platform/ecosystem/identity/invitations` (consumer
  `internal`): pass `environment` + `subject` of the verified person JWT + `bindingId`; POST goes through the
  command harness with `Idempotency-Key` and body `{ environment, subject, bindingId, email, reason?,
  designatedAdmin? }`. Outcomes: 404 when `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` is OFF or the
  consumer is not internal (anti-oracle); 403 `forbidden` when the subject is not the designated admin of that
  binding (cause never distinguished); 422 on self-elevation (`designatedAdmin: true`) or seat cap; 429 on the
  hourly cap; the response never contains the token. Canonical staging recipe for the delegated lane:
  `Authorization: Bearer <gateway consumer token>` (Secret Manager `efeonce-mcp-gateway-greenhouse-token`) +
  `externalScopeType=other&externalScopeId=efeonce-mcp-gateway` + `environment` + `subject` + `bindingId`; the
  POST also needs `Idempotency-Key`. Federating it as an MCP tool in `efeonce-mcp` is pending
  (`TASK-1831`/`TASK-1832`). Signals: the `identity.external_*` group is now 9, adding
  `identity.external_invitation.{undelivered,expired_unaccepted,token_revealed}` (`token_revealed` steady 0 —
  any value must carry actor + reason in the audit).

## Choose the route

| Work | Load in addition to this skill | Canonical boundary |
| --- | --- | --- |
| Gateway, provider registry, API boundary or shared contract | `software-architect-2026` | Architecture + ADR/task before code |
| Cloud Run, ALB, DNS, TLS, WIF, OAuth config or secrets | `cloud-run-basics`, `greenhouse-secret-hygiene` | Runbook; no keys or unsafe bypasses |
| Globe capability, creative asset, model or workspace policy | `greenhouse-globe`, `greenhouse-ai-creative-rights-governance` | Globe owns API/SDK/policy; `TASK-1473` gates federation. Only the internal fleet reader is currently enabled. |
| Growth SEO capability (Search Visibility 360, EPIC-022) | `seo-aeo-practice` plus `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` | MCP-first per operator directive (2026-08-05). **LIVE IN PRODUCTION since 2026-08-06: `TASK-1645` and `TASK-1647` are both `complete`.** The ecosystem lane `/api/platform/ecosystem/growth/seo/*` plus its MCP tools serve production behind `GROWTH_SEO_ENABLED` (multi-runtime: Vercel for the lane, `ops-worker` for the GSC materializer — turning it on in one runtime leaves the other path dead). The gateway provider `greenhouse-seo` is ENABLED on `mcp.efeonce.org` (enabled at revision `efeonce-mcp-gateway-00012-dkj`; productive revision today is `efeonce-mcp-gateway-00026-ctp` (deployed 2026-09-01 with the canonical manifest of TASK-1780; canary green end to end against production); superseded 2026-09-02 by `efeonce-mcp-gateway-00028-pmx` (manuals, TASK-1804) and 2026-09-03 by `efeonce-mcp-gateway-00029-bwg` (manifest `8969c8d39c1f`, ETV methodology provenance, TASK-1805)), `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`, `GREENHOUSE_ECOSYSTEM_TOKEN` as a Cloud Run **secret ref** (`efeonce-mcp-gateway-greenhouse-token:latest`, never a plain value), consumer `EO-SPK-0004` + binding `EO-SPB-0004`. **Gotcha when wiring a secret ref:** that secret was created with zero IAM bindings — the gateway runtime SA `efeonce-mcp-gateway@efeonce-group` needs a scoped `secretAccessor` or the deploy fails; and `--set-secrets` is destructive exactly like `--set-env-vars`, so every secret must be declared in the same flag in `deploy.yml`. Production canary (`scripts/greenhouse-seo-canary.mjs` against `https://greenhouse.efeoncepro.com`): Berel `domainQuadrant=riesgo` with 50 keywords and AEO 44.5; Efeonce entitlement ok + honest `no_seo_data`; deny anti-oracle 404. The authenticated front-door smoke lives in `scripts/oauth-canary.mjs` (`MCP_CANARY_SEO_ORGANIZATION_ID` + `MCP_CANARY_SEO_DENY_ORGANIZATION_ID`) and passed 2026-08-06 with a real Entra token on the base scope: `initialize 200`, `seoEntitlementStatus 200`, `seoVisibility360Status 200`, `seoDomainQuadrant="riesgo"` (Berel's real quadrant through the public front door), `seoDenyFailedClosed=true`. It needs an interactive Entra login — human-assisted, not CI-automatable — but since 2026-08-06 the script is no longer the only authenticated path: any tenant Entra user can connect a standard MCP client (Claude Code, claude.ai, Claude Desktop) through the gateway's DCR shim. Foundation is live (`TASK-1299` schema, `TASK-1301` per-org `seo_v1` entitlement, `TASK-1300` DataForSEO registry + cost ledger, `TASK-1302` GSC materializer live, `TASK-1305` SEO↔AEO quadrant reader); every provider-facing SEO write passes `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`), and every future SEO/E-E-A-T reader ships its MCP tool in the same PR. Eventual home is Wave (`wave.efeonce.org`, EPIC-037).<br><br>**Tool inventory as-of 2026-08-31 — the internal MCP registers 28 SEO tools (21 reads + 7 writes); the gateway federates 28** (`src/mcp/greenhouse/tool-manifest.ts` = the internal inventory since TASK-1780 — `server.ts` no longer holds it, it walks it; TASK-1658 closed the 8-tool federation drift). ⚠️ The two sets are NOT equal by construction: `get_seo_work_queue` exists internally and is excluded with a reason, and `get_seo_provider_spend` is federated WITHOUT an internal counterpart (declared in `GREENHOUSE_GATEWAY_NATIVE_TOOLS`): reads `get_seo_entitlement`, `get_seo_keyword_opportunities`, `get_seo_visibility_360`, `get_seo_rank_evolution`, `get_seo_site_audit_report`, `get_seo_backlink_profile`, `get_seo_backlink_detail`, `get_seo_keyword_market_data`, `get_seo_keyword_discovery`, `get_seo_grounded_query_draft`, `get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`, `get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_prospect_diagnostic`, `get_seo_provider_spend` (TASK-1696 — month-to-date provider spend cut by `(consumer, family, cost_basis)`; **`internal`-scope bindings only, client bindings get 404 anti-oracle** — the spend is what serving a client COSTS Efeonce, not something the client consumed), `get_seo_keyword_gap` (TASK-1662 — competitive gap DERIVED at read time: `content_gap` / `ranks_worse` with `declaredTargets` kept separate, exclusion by measured GSC, factors with honest `sin_dato`, and **no ordering of its own** — the TASK-1700 queue is the order authority. ⚠️ Its ecosystem lane is **`internal`-scope bindings WITHOUT an organization only, 404 anti-oracle**: the competitive comparison is never exposed to the client (audit §7) — same contract as `get_seo_provider_spend`), `get_seo_serp_top_results` (TASK-1699 — dated top-N SERP series the daily rank capture ALREADY pays for (zero marginal cost; the `rank_absolute` slot). ⚠️ The series is NOT backfillable — yesterday's SERP cannot be re-bought, so absence of old dates is structural, never a bug to fix. Competitive data: **`internal`-scope bindings WITHOUT an organization only, 404 anti-oracle (audit §7)** — never client-facing), `get_seo_competitor_candidates` (TASK-1699 — the PROPOSE half of the competitor loop: candidates by MEASURED recurrence (versioned thresholds 3kw/5days/30d) with evidence + a suggested `proposalRef`; the EXECUTE is `declare_seo_competitors` (TASK-1662) and ONLY after human confirmation carrying that `proposalRef` verbatim — an agent must never declare straight from candidates without it. An empty list with a young series (<5 days) is the expected result, not an error. Same `internal`-only lane, 404 anti-oracle); writes **`track_seo_keywords` / `untrack_seo_keywords`** (TASK-1308), **`discover_seo_keywords`** (TASK-1664), **`prepare_seo_grounded_queries`** (TASK-1666), **`run_seo_prospect_diagnostic`** (TASK-1709 — spends ~USD 0.25/run of Efeonce acquisition budget; behind `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED`, **ON in Vercel Production since 2026-08-27** (verified with `vercel env ls`; real run on `skyairline.com`: forecast USD 0.2050 vs measured USD 0.1991). A `disabled` answer today is a REGRESSION, not a legitimate state), **`declare_seo_competitors` / `retire_seo_competitors`** (TASK-1662 — declaring a competitor is a DEFERRED SPEND COMMITMENT like tracking a keyword: monthly coverage bills the provider ~USD 0.11/competitor every cycle until someone retires it; governed per-target ceiling (default 5), **per-domain** outcomes (`declared\|already_declared\|capacity_exceeded\|invalid`), mandatory human authorship + opaque `proposalRef`; `retire` is the append-only reverse — closes `effective_to` with its own retirement authorship and cuts next-cycle spend, never deletes. Both ride the EXISTING `efeonce.mcp.seo.write` scope — zero Entra changes — so they are live-but-fail-closed until the EPIC-044 issuer/gateway (`TASK-1829`–`1832`) like every other write (the grant side exists since `TASK-1631`). First real use of the domain: Berel MX declared `comex.com.mx` with operator authorship; first real coverage run USD 0.1076 with the exact Δ in the ledger; real gap 357 `content_gap` / 54 `ranks_worse` / 269 excluded by measured GSC). **Gateway deploy DONE 2026-08-28** — this closed the `rollout pendiente` that TASK-1658/1696/1662/1699 declared; the deploy is no longer pending. `efeonce-mcp` `origin/main` moved `8f1ae34` → `92e7197` (the two commits `8215ab5` + `92e7197` that were sitting local), CI green, workflow "Deploy Cloud Run" run `33180234265` `success` with no approval gate. Productive revision at that time (HISTORICAL, deploy of 2026-08-28) was **`efeonce-mcp-gateway-00024-8b8`** (`Ready=True`, 100% of traffic, image tagged to the exact SHA `92e71971899c6468fc111f7614b89ea6602ac0aa`), replacing `efeonce-mcp-gateway-00023-zt2` which served 21 — the delta is exactly those 6 tools (`get_seo_provider_spend`, `get_seo_keyword_gap`, `declare_seo_competitors`, `retire_seo_competitors`, `get_seo_serp_top_results`, `get_seo_competitor_candidates`). Front door verified: `GET https://mcp.efeonce.org/.well-known/oauth-protected-resource` 200 and `POST https://mcp.efeonce.org/mcp` without a token 401 (fail-closed). Closing canary green end to end against PRODUCTION (`scripts/greenhouse-seo-canary.mjs` with `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`, org Berel `org-32333527-02a8-487b-819e-6f76a761777d`): the 20 reads ✓, every deny `404` anti-oracle ✓, the 7 writes exercised at their gate without writing or spending ✓. The 4 new internal-only lanes answered against production: `serp-top-results` `rows: []` (expected — day 1 of the series is 2026-08-29), `competitor-candidates` `candidates: []` (expected with a series <5 days), `keyword-gap` 1 declared competitor, `provider-spend` ✓. **ZERO Entra changes in the deploy**: the two new writes ride the pre-existing `efeonce.mcp.seo.write` scope, so they stay live-but-fail-closed until the EPIC-044 issuer/gateway (`TASK-1829`–`1832`) exactly like every other write. 🔴 **The write is a DEFERRED SPEND COMMITMENT, not an insert**: daily rank capture bills the provider for every keyword still tracked, on every cycle, until someone untracks it — so the tool description tells the agent to propose the exact list and get human confirmation BEFORE calling, and to read the **per-keyword** outcomes array (`tracked\|already_tracked\|intent_changed\|capacity_exceeded\|invalid`), never just `data.ok`. The command owns the defenses: governed per-target ceiling (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`, default 200), per-ORG `seo_v2` entitlement (canonical key since `TASK-1677`; `seo_v1` is no longer read), idempotency, and an append-only reverse (`untrack` closes `effective_to`, never deletes). 🔴 **`TASK-1659` — the optional `intent` (`target\|opportunity`) is a declared fact with an author, not an editable attribute.** It has **no default**: a caller that does not declare writes `NULL`, and guessing `opportunity` fabricates a classification nobody made (that is also why the column was never backfilled). It is **orthogonal to `source`** (who executed the write) and is NOT the provider-estimated search intent carried by discovery candidates; `intentDeclaredBy` differs from the actor when an agent declares on someone's behalf. Changing it is **never an `UPDATE`** — the current membership is closed and a new one opened, so the history "it became a target in March, when it sat at 45" survives; that transition consumes **no capacity** (the active count does not move) and surfaces as its own outcome `intent_changed`, so an agent must not report it as `already_tracked`. It needs no new capability and no new Entra scope. The ecosystem lane accepts both writes **only from `internal`-scope bindings** — a client binding reads its own opportunities but cannot grow its own invoice; the Greenhouse app-lane (`POST /api/admin/growth/seo/keywords/{track,untrack}`) is the one that requires a per-human capability (`growth.seo.target.configure`). Both writes share the domain scope `efeonce.mcp.seo.write` — see the write-scope hard rule above: it is **not** wired to the shared public PKCE client and must not be, so the tools are live-but-fail-closed until the EPIC-044 issuer/gateway (`TASK-1829`–`1832`). Since TASK-1658 the parity guard is **bidirectional and runtime-introspected**: it fails NAMING the tool when a Greenhouse-internal SEO tool is neither federated nor excluded (the direction that used to be invisible — 8 tools drifted silently under a green guard), when a federated inputSchema diverges from the internal MCP without a declared reason (source case: `track_seo_keywords` federated `.strict()` without `intent`/`intentDeclaredBy`), and when a federated tool lacks `annotations` or its `readOnlyHint` contradicts its class (`readOnlyHint: false` on any tool that writes or BUYS provider data). Federation protocol now starts in GREENHOUSE, not in the gateway (TASK-1780): (1) entry in `src/mcp/greenhouse/tool-manifest.ts` + `pnpm mcp:manifest:generate`. ⚠️ The verification gate is **`pnpm mcp:manifest:check`**, and since 2026-09-01 it runs INSIDE `pnpm local:check` (next to `nul-byte-gate` and `skills:mirrors`) — so editing the manifest without regenerating the artifact breaks YOUR pre-push, not the sibling repo's CI → (2) `pnpm greenhouse:manifest:sync` in the gateway → (3) provider method + types → (4) `registerTool` WITH annotations → (5) `EXPECTED_*` entry with reason → (6) canary. Step 1 is NEVER editing a list in the gateway any more; `inputKeys` come from introspection, never transcription. The HTTP scope gate derives its write list from the inventory (`GREENHOUSE_SEO_WRITE_TOOLS`), so a domain's write N+1 inherits the 403 challenge without touching app.ts. The hand-written mirror is GONE since `TASK-1780`: the guard's inventory is derived from Greenhouse's canonical manifest (`src/mcp/greenhouse/tool-manifest.ts`), shipped as a generated, hash-verified artifact (`pnpm mcp:manifest:generate` → `pnpm greenhouse:manifest:sync`). Federated capabilities with no internal counterpart are declared in `GREENHOUSE_GATEWAY_NATIVE_TOOLS` with a reason, never absent. |
| Hiring/ATS, Talent Pool, candidate review, assessment assignment or selection journey | `greenhouse-talent-people-operator` + identity/integrations owners | `TASK-1726` Talent Pool readers and `TASK-1718` exact candidate-review readers are live internal-only. Candidate review exposes only redacted hash-bound CV chunks with purpose/audit; no contact, ranking or write. `TASK-1719`–`TASK-1722` retain the write gates and EPIC-044 (`TASK-1829`–`1832`) the external-token gate (the per-org/per-person grant exists since `TASK-1631`); TASK-1718 retains formal sign-off and revocation evidence. |
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
