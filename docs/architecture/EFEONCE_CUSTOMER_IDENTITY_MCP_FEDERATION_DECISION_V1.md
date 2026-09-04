# Efeonce Customer Identity and MCP Federation Decision V1

> **Status:** `Proposed` — **composición superseded 2026-09-03** por [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) (nativo, aceptado). Siguen vigentes: `Invariants`, `Required binding design`, `Slice 0 binding design proposal`, `Slice 0 gateway authorization-context contract`, `Slice 0 convergence contract`. La recomendación WorkOS de `Slice 0 measurement` queda como historia.
> **Date:** 2026-08-01
> **Owner:** Efeonce Platform / Identity
> **Scope:** customer identity, B2B federation, MCP OAuth, Account 360 organization binding and Globe access
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `medium`
> **Validated as of:** 2026-08-02 — gateway MCP, Entra canary, current Greenhouse NextAuth/session resolution and Account 360 contracts verified; WorkOS has a staging project with MCP discovery configuration only. There is no external customer binding, public login, production domain, production secret, Greenhouse customer-login convergence or customer access. **Slice 1 binding foundation applied 2026-09-04** (`TASK-1631`): schema, commands, gateway reader and the four reliability signals are live in `greenhouse-pg-dev`; still no external issuer registered, no real customer binding, no UI (see `Slice 1 binding foundation — applied`); the auth-server exists as runtime + JWKS only since 2026-09-04 (see the line below).
> **Implementation:** [`TASK-1631`](../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md) · programa [`EPIC-044`](../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)
> **Superseded by (composición):** `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` — 2026-09-03, decisión del operador: authorization server propio; no se compra a un tercero.
> **Runtime del emisor propio:** existe desde 2026-09-04 (`TASK-1828`) — Cloud Run `auth-server` (`us-east4`) publicado como segundo host del front door del gateway en `https://auth.efeonce.org`, con `/healthz`, `/readyz` y JWKS ES256 firmado en Cloud KMS HSM; todavía sin endpoints OAuth ni login de personas (`TASK-1829`/`TASK-1830`) y sin cambios en el login de Greenhouse. Detalle: [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` §Delta 2026-09-04](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md#delta-2026-09-04--task-1828-ejecutada-runtime-llaves-front-door).

## Context

`https://mcp.efeonce.org/mcp` is operational with an internal Entra authorization-code + PKCE canary and the
read-only Globe fleet reader. That identity is an internal validation path: it emits both the base
(`efeonce.mcp.read`) and the Globe reader (`efeonce.mcp.globe.read`) delegated scopes even when it requests only the
base, and cannot model a customer's organization, administrator, member, entitlement or revocation. It must not
become a prerequisite for Efeonce customers. The gateway declares a third scope, the flag-gated internal write
`efeonce.mcp.globe.credits.funding.ensure` (published in `scopes_supported` only when `globeCreditFunding.enabled`
is ON); whether the same internal client also receives it is **not** verified and follows its own
consent/assignment flow.

Greenhouse already creates the commercial organization in `greenhouse_core.organizations`. Account Complete 360
resolves that organization into its organization, spaces and client graph. A customer identity provider must not
create a second customer/tenant source of truth, and Globe must retain ownership of its workspace, creative policy,
credits and capability decisions.

## Proposed decision

Introduce a dedicated Efeonce customer identity plane at `auth.efeonce.org`, separate from the internal Entra
canary and from the gateway's downstream workload identity. The leading candidate is **WorkOS AuthKit + WorkOS
Connect**, because it exposes OAuth authorization-server metadata and dynamic client registration suited to remote
MCP clients while supporting B2B organization federation. A WorkOS staging project has only the compatible MCP
discovery settings enabled; it is not customer access or a production commitment. Billing/production approval,
DNS, production secrets, an external binding and customer authorization remain separately gated.

The selected experience direction is an **Efeonce-owned custom login UI**. A dedicated browser-facing identity
service at `auth.efeonce.org` will use the selected authentication adapter server-side and expose MCP OAuth;
the gateway remains a resource server, not a session/UI host. WorkOS AuthKit + Connect is one candidate, not an
approved commitment: the provider decision remains gated by the Slice 0 build-vs-buy comparison below.

### Native Greenhouse broker alternative

Greenhouse already contains a reusable authentication foundation that must be evaluated before adopting a second
identity stack. `src/lib/auth.ts` provides the current NextAuth browser session and `src/lib/auth/magic-link.ts`
provides the existing single-use recovery path. The sister-platform OAuth broker in
`src/lib/sister-platforms/oauth-broker.ts`, together with its authorization, token and userinfo routes, already
implements authorization-code + PKCE, exact redirect allowlists, public/confidential client policy, hashed opaque
access tokens, expiry/revocation and audit events while resolving the existing Greenhouse tenant/person context.

That broker is a **foundation, not yet a public MCP authorization server**. It is currently coupled to the
Greenhouse deployable and browser session, accepts loopback redirects for public clients, and does not yet expose
the complete protected-resource/authorization-server metadata, CIMD/DCR compatibility, hosted HTTPS callback
policy, MCP token-verification adapter and customer consent/grant surface required by Claude, Codex and ChatGPT.
Its opaque tokens also need an explicit gateway verification contract (introspection/userinfo or short-lived signed
tokens with revocation/version checks); the gateway must not assume that the existing Entra JWT verifier can consume
them.

If the native route wins Slice 0, extract/operate the broker as an independent runtime at `auth.efeonce.org` while
reusing Greenhouse identity and Account 360 commands/readers server-side. It must have its own deployment, cookie
namespace, session store, audience, secrets, scaling and rollback. It must never share `NEXTAUTH_SECRET`, accept a
Greenhouse browser cookie as an MCP token or make the Greenhouse release the operational boundary for customer
OAuth. WorkOS may still be used upstream for enterprise SAML/SCIM federation without becoming the customer or
Account 360 source of truth.

The provider decision is therefore explicitly three-way:

| Option | Reuses Greenhouse identity | Main benefit | Main cost/risk |
| --- | --- | --- | --- |
| WorkOS AuthKit + Connect | Through an audited binding | Managed OAuth/federation and lower security-operations burden | Vendor dependency, plan/custom-domain cost and subprocessor review |
| Native Greenhouse broker extracted to `auth.efeonce.org` | Yes, directly | One canonical identity stack and existing broker primitives | We own metadata, client compatibility, MFA/recovery, hardening and 24/7 operations |
| Hybrid: native broker + WorkOS for enterprise federation | Yes, with WorkOS upstream only where needed | Preserves ecosystem continuity while buying enterprise federation | Two adapters and two operational failure modes |

No option is approved by this ADR yet. Slice 0 must measure compatibility, security/operations, cost, privacy,
migration and exit before production provisioning.

### Slice 0 measurement — build vs buy vs hybrid (2026-08-05)

Costed comparison executed under `TASK-1631` Slice 0 (S0.2). Pricing figures come from the 2026-08-02 official-page
benchmark (eleven providers); the native estimate comes from direct inspection of the broker code on 2026-08-05.

**What the native broker actually has and lacks (measured, not assumed).** The sister-platform broker is ~6,685
lines in `src/lib/sister-platforms/**` (with tests) plus three routes (`authorize` 161, `token` 197, `userinfo` 72
lines). It implements authorization-code + PKCE, exact redirect allowlists, public/confidential client policy,
hashed opaque tokens, TTLs, revocation, audit and workspace bindings. Its `authorize` route depends on
`getOptionalServerSession()` and redirects to the Greenhouse `/login` — i.e., the person-authentication layer IS
the Greenhouse portal session. Going native for external customers therefore requires building, not extracting:

| Gap | Work | Estimate |
| --- | --- | --- |
| Independent runtime at `auth.efeonce.org` (deploy, session store, cookie namespace, secrets, CI/CD, rollback) | new Cloud Run deployable + session layer decoupled from NextAuth | 1.5–2 wk |
| External-person authentication (credentials/passkeys/magic-link, MFA/TOTP, recovery) — today the broker has none of its own | new surface + flows + abuse hardening | 2–3 wk |
| AS metadata + **CIMD** + DCR + hosted HTTPS callback policy (today loopback-oriented) | protocol work vs current MCP spec | 1–1.5 wk |
| Consent/grant surface + storage per capability | UI + primitives | 1 wk |
| Gateway verification contract for opaque tokens (introspection or short-lived signed tokens + revocation checks) | gateway + broker change | 0.5–1 wk |
| Observability, rate limiting, security review, pentest, runbooks | hardening | 1–2 wk |

Total build: **7–10.5 senior-weeks** before the first customer, plus **permanent operations**: patching, key
rotation, incident response and 24/7 accountability for a public authentication service — precisely when Chile's
Ley 21.719 (GDPR-like, with a sanctioning agency) reaches full effect on 2026-12-01. At any reasonable loaded
cost, the build alone exceeds a decade of WorkOS's published flat fee, before counting operations.

**WorkOS cost curve (the SSO unknown, closed).** Flat **USD 99/month** (custom domain; organizations and users at
cohort scale have no charge or cap — 2026-08-02 benchmark). The scaling cost is enterprise federation:
**USD 125 per SSO/SAML connection per month** when a customer demands their own IdP. Curve: 0 connections =
USD 1,188/yr; 3 = USD 5,688/yr; 5 = USD 8,688/yr; 10 = USD 16,188/yr. Two consequences: (a) at cohort start
(0–2 connections) WorkOS is an order of magnitude cheaper than building; (b) if enterprise-SSO demand
materializes at ≥5–10 connections, the native/hybrid route becomes financially competitive — that is the
**revisit trigger**, recorded here so the decision has an explicit expiry condition instead of being eternal.

**Exit/portability (the second unknown, closed by design).** The binding model already neutralizes most exit
cost: external subjects are **source links** to the canonical `identity_profile`, never the person record. A
provider change means re-linking subjects under a new issuer (a re-authentication ceremony per person, operator
re-invitation at worst), with Account 360, memberships, grants and audit untouched. Password/credential export
from WorkOS is not assumed; the exit plan is re-invitation, not credential migration. Contractual condition
before signing: no term may claim ownership of the organization/member directory.

**Pre-provisioning verification checklist (blocking):** confirm against live WorkOS discovery that it publishes
`client_id_metadata_document_supported` (CIMD is the primary MCP registration mechanism; DCR alone fails the
invariant), confirm `subject_types_supported: public` on the actual tenant, confirm the current **free-tier
terms** (MAU limits, configurable branding, and that the free tier exposes the same CIMD/DCR surface as paid),
and obtain the current DPA + subprocessor list for the privacy review below.

**Slice 0 recommendation — approved by the operator 2026-08-05 (zero-spend staging):** adopt **WorkOS without a
custom domain and without any paid plan**, staged strictly by demand:

1. **Now — USD 0, nothing provisioned.** Complete all design work (binding schema, gateway authorization-context
   and issuer-qualification contracts, token matrix). No tenant, DNS, secret or client registration is created;
   the internal Entra canary remains the only active path.
2. **First interested customer — USD 0.** Run the first external cohort on the WorkOS free tier under WorkOS's
   default domain with hosted AuthKit UI (Efeonce logo/colors; "Powered by WorkOS" accepted for an invited
   cohort). The MCP protocol is domain-indifferent: the gateway's protected-resource metadata simply points at
   whatever issuer URL the authorization server has.
3. **Paying customers justify polish — USD 99/month.** Purchase the custom domain (`auth.efeonce.org`) only when
   revenue-attached clients warrant the branded experience, ideally priced into their contracts. The SSO/SAML
   revisit trigger (≥5 enterprise connections → re-evaluate native/hybrid) is unchanged.

**Issuer-rotation resilience (hard design requirement born from this staging):** moving from the default domain
to a custom domain later **changes the issuer URL**. The binding must therefore never key durable rows on the raw
issuer string: bindings reference a **provider environment registry row** (stable environment ID → current
issuer/JWKS), so a domain cutover is one audited registry UPDATE plus a forced re-authentication — a controlled
migration, not a re-onboarding. The binding design below implements this. The privacy/subprocessor gate remains
independent and open: see
[`EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`](../operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md).

### Relationship with the Greenhouse login

`auth.efeonce.org` is operationally independent from the Greenhouse deployable, but it is not an independent
person, organization or membership system. "Independent" means separate deployment, cookie namespace, session
store, token audience, scaling and rollback. It does not authorize a second customer record, a parallel password
store or a second identity for a person who already exists in Greenhouse.

Greenhouse's current login continues to issue its own NextAuth session for the Greenhouse audience. Internal
Efeonce operators continue through the existing Entra-backed path. The external identity plane authenticates
customers and issues OAuth tokens for the MCP audience. Neither application accepts the other's browser cookie,
and `mcp.efeonce.org` never treats a Greenhouse portal session as its OAuth authorization server.

Both paths converge server-side on one canonical person and organization relationship:

```text
Internal operator ─ Greenhouse login / Entra ─┐
                                              ├─ identity_profile + Account 360 membership
External customer ─ auth.efeonce.org / IDP ──┘               │
                                                              ├─ Greenhouse customer session (current/future)
                                                              └─ MCP OAuth grant → gateway → Globe policy
```

The external subject and organization identifiers are source links/bindings to the canonical Greenhouse person
and Account 360 organization. Linking must use verified provider identifiers plus an audited invitation or
operator command; matching an email address alone is insufficient. A customer who already has Greenhouse access
must be linked to the existing `identity_profile` rather than provisioned as a new person.

The first MCP slice may coexist with the current Greenhouse customer login, but this is a transition state, not
the target architecture. `TASK-1631` must define account linking, conflict handling, recovery and revocation, and
must produce a migration path for customer-facing Greenhouse authentication to delegate to the same accepted
external identity plane. That later convergence lets the customer use one authentication relationship while each
application still issues an audience-bound session/token. Internal Greenhouse access may remain on Entra. The
full Greenhouse customer-login cutover is separately gated and is not implied by enabling the first MCP cohort.

The durable ownership model is:

```text
Greenhouse Account 360 organization ── canonical commercial/customer anchor
             │
             ├── explicit external-identity organization binding
             └── explicit person / membership / entitlement linkage
                         │
MCP client ─ OAuth + PKCE ─ auth.efeonce.org ─ token validation ─ mcp.efeonce.org
                                                                  │
                                                                  └── Globe provider policy
                                                                       (workspace, capability, credits, rights)
```

The token proves a caller authenticated through the configured issuer. It is not sufficient authorization for a
Globe capability. The gateway validates issuer, audience, expiry, authorized client and requested scopes, derives
the organization through the verified binding, and delegates to the provider. Globe revalidates the organization,
workspace and capability against its canonical policy before returning data or executing a tool.

The first external cohort is **existing Efeonce clients already represented in Account 360**. There is no public
self-signup, domain-based admission or automatic backfill. An operator must explicitly allowlist an existing
organization, establish its audited external-identity binding, designate its initial administrators and grant its
read-only Globe capability before an invitation can be issued. An email address alone never establishes customer
membership or access.

## Invariants

- `greenhouse_core.organizations` remains the canonical commercial/customer organization. An identity-provider
  organization ID is an external binding, never a replacement tenant ID.
- Account Complete 360 remains the organization graph resolver. New organization-scoped consumers use its canonical
  scope or a documented server-side binding primitive; they do not reconstruct tenant membership from a JWT claim.
- Globe owns Globe workspace membership, creative policy, credits, rights and tool/capability entitlement. The
  identity plane does not own them and the gateway does not duplicate them.
- Only an existing, explicitly allowlisted Account 360 organization may enter the first customer cohort. An
  identity-provider organization, email domain or self-registered user cannot create a commercial customer,
  membership or Globe grant.
- Invitations and revocations originate from audited canonical Account 360/identity commands. They must bind a
  person to the selected organization and never infer access from an unverified email domain or JWT field.
- One person maps to one canonical `identity_profile`. A WorkOS, native-broker or other IDP subject is an external source link;
  it must not create a parallel customer identity or permanent second credential set for an existing person.
- Greenhouse, `auth.efeonce.org` and MCP use separate cookies, sessions and token audiences. Sharing a Greenhouse
  session secret/cookie with another deployable, or accepting a portal cookie as an MCP token, is prohibited.
- Customer-facing Greenhouse authentication and MCP authentication must have an explicit convergence path through
  the same accepted external identity plane. Coexistence is allowed during rollout; permanent identity divergence
  is not.
- Entra remains available only for the internal canary during the transition. It neither onboards external customers
  nor demonstrates their deny/revocation behavior.
- External authorization uses OAuth 2.1 authorization code with PKCE. Remote MCP clients must have public
  authorization-server metadata and a deliberate client-registration compatibility path, in the normative order of
  the current MCP spec: pre-registration → **Client ID Metadata Documents (CIMD)** → Dynamic Client Registration →
  manual entry. **CIMD is the primary requirement and DCR is backwards compatibility**: the spec states verbatim
  that *"Dynamic Client Registration is deprecated. New implementations should use Client ID Metadata Documents
  instead"*, and marks CIMD `SHOULD` against DCR `MAY` (verified 2026-08-02). A provider that supports DCR but not
  CIMD does not satisfy this invariant. Target clients differ today — ChatGPT supports DCR and CIMD; Claude
  supports DCR plus manual client id/secret — so the selected provider must cover both mechanisms.
- Access is fail-closed. An unknown issuer, client, organization binding, membership, entitlement, revoked grant or
  provider policy result denies dispatch; no free-form organization/workspace supplied by the client is accepted.
- Human OAuth identity and the gateway-to-provider service identity remain separate. Tokens, authorization codes,
  client secrets and raw provider errors never enter logs.
- The customer rollout begins read-only and organization allowlisted. A base-only identity must receive a real deny;
  a granted identity must lose access after revocation; both checks are provider-backed, not merely scope-shaped.

## Required binding design

`TASK-1631` must inventory the canonical Greenhouse identity/membership primitives before it proposes a migration.
Its resulting binding must minimally relate an external identity organization to one Account 360 organization, and
relate authenticated people to an organization-scoped membership/grant without storing commercial, Globe workspace
or credit policy in the identity provider. The exact table and identifier choice remain intentionally undecided until
that discovery confirms the current schema and avoids a parallel identity model.

Discovery must also identify how the current `greenhouse_core.client_users`, `greenhouse_core.identity_profiles`,
`greenhouse_core.identity_profile_source_links` and `greenhouse_serving.session_360` contracts participate. The
resulting design must specify deterministic existing-person linking, collision/manual-review behavior, account
recovery, provider-subject rotation, deactivation and revocation propagation. It must not reuse the Greenhouse
NextAuth cookie or secret outside Greenhouse.

The initial cohort flow must additionally record the Account 360 organization, designated customer administrator,
operator authorizing the invitation, external identity subject/organization IDs, permitted capability, timestamps
and revocation state. It is an explicit, idempotent enrollment command; it is not a bulk import of existing clients.

### Slice 0 convergence contract — Greenhouse customer login (2026-08-05)

Target mechanism for the later, separately-gated cutover: Greenhouse adds the accepted external identity plane as
an **additional NextAuth OIDC provider** for customer-facing login. On sign-in, Greenhouse resolves the person
through the **same** `(environment, subject)` source link in `identity_profile_source_links` that MCP uses — one
authentication relationship, two audience-bound sessions. Greenhouse keeps issuing its own NextAuth session and
cookie for the Greenhouse audience; nothing about the MCP token flow changes; no cookie, session secret or token
crosses applications. Rollback of the cutover is removing the provider option — bindings and profiles are
untouched. Preconditions before that cutover gets its own rollout gate: the external plane is live for the MCP
cohort, recovery/conflict paths are exercised, and every affected customer person has a verified source link.
Until then, current Greenhouse customer credentials continue unchanged; coexistence is transitional by design and
never produces a second permanent credential set for the same person.

### Slice 0 binding design proposal (2026-08-05)

Discovery result: **person-level binding needs no new identity table.**
`greenhouse_core.identity_profile_source_links` already models exactly this relation (`source_system` +
`source_object_type` + `source_object_id` → `profile_id`, with `active`, `is_login_identity` and primacy flags).
An external IDP subject is registered as a source link — honoring the canonical rule that external systems extend
360 objects via links, never via parallel identities. What does not exist yet is the organization/grant layer.
Proposed additive schema (all in `greenhouse_core`, migration NOT applied until the ADR provisioning gate opens):

| Table (new) | Purpose | Key shape |
| --- | --- | --- |
| `external_identity_environments` | Provider environment registry — the issuer-rotation absorber | `environment_id` PK; `provider` (`workos`/…); `provider_environment_ref`; `issuer_url`; `jwks_uri`; `status`; audited updates |
| `external_organization_bindings` | External IDP organization ↔ canonical organization | `binding_id` PK; `organization_id` FK → `organizations`; `environment_id` FK; `external_organization_ref`; `status` (`active`/`revoked`); `grants_version` |
| `external_capability_grants` | Provider-neutral capability grant per binding | `grant_id` PK; `binding_id` FK; `capability` (namespaced string — no Globe-specific columns); `status`; granted/revoked by+at |
| `external_member_invitations` | Audited invitation lifecycle | `invitation_id` PK; `binding_id` FK; `profile_id` nullable until linked; `email`; `designated_admin`; state machine `issued → accepted → linked` / `revoked` / `expired` |

Person links produced by an accepted invitation are stored in `identity_profile_source_links` with
`source_system = 'external_idp:<environment_id>'` and `source_object_id = <subject>` — i.e. the durable person
key is `(environment, subject)`, which resolves to `(issuer, subject)` through the registry at verification time.
A domain/issuer cutover is one audited `issuer_url` UPDATE on the environment row; no binding row changes.

Operator commands (canonical server-side primitives, each with its **own dedicated capability** per the task's
granularity rule, all idempotent and audit-appending): `bindExternalOrganization`, `issueExternalInvitation`,
`revokeExternalAccess` (binding- or grant-scoped; bumps `grants_version` so gateway-side caches fail closed).
Reads: eligibility reader over existing Account 360 client organizations; binding/grant resolvers for the
gateway. The four reliability signals declared in `TASK-1631` (`unbound_dispatch_attempt`,
`revoked_still_dispatching`, `subject_collision`, `orphan_grant`) observe this schema, steady = 0.

### Slice 1 binding foundation — applied (2026-09-04)

`TASK-1631` Slices 1–5 (commits `689b56044`, `cf8f15224`) materialize the Slice 0 proposal. Two migrations are
applied to `greenhouse-pg-dev` (the single dev/staging/prod instance):
`20260904104914802_task-1631-external-identity-binding-foundation.sql` and the forward-fix
`20260904110809060_task-1631-invitation-linked-check-one-directional.sql`. No backfill, no real customer binding,
no external issuer registered — the domain is live but empty. External usage is gated by the gateway's
`OAUTH_EXTERNAL_ISSUER_ENABLED` (`TASK-1831`), not by a new Greenhouse flag.

**Schema as applied (`greenhouse_core`).** The four proposed tables landed with these deltas over the Slice 0
shape, plus two tables the proposal did not have:

| Table | As applied (delta vs. the proposal) |
| --- | --- |
| `external_identity_environments` | `environment_id` is a slug (`^[a-z0-9][a-z0-9_-]{2,63}$`); adds `audience`, `issuer_class` (`internal` \| `external`, **immutable** once created), `subject_type` (`public` \| `pairwise`), `status` (`draft` \| `active` \| `suspended` \| `retired`); partial unique index on `issuer_url WHERE status <> 'retired'`. Issuer rotation is one audited UPDATE; nothing is keyed by the raw issuer |
| `external_organization_bindings` | ids `xob-<uuid>`; `grants_version` int ≥ 1 (default 1); `designated_admin_profile_id` FK → `identity_profiles`; partial uniques (`organization_id`, `environment_id`) and (`environment_id`, `external_organization_ref`) while `active` |
| `external_capability_grants` | ids `xcg-<uuid>`; capability regex `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`; **`profile_id` nullable FK** — `NULL` = every linked member of the binding, set = only that person (per-person grants without a future migration); partial unique (`binding_id`, `capability`, `COALESCE(profile_id,'')`) while `active` |
| `external_member_invitations` | ids `xmi-<uuid>`; `email` + `email_normalized`; `token_hash` (sha256 hex, unique) — the raw token is never persisted; `expires_at`; `link_id` FK → `identity_profile_source_links`; partial uniques (`binding_id`, `email_normalized`) while `issued`/`accepted` and (`binding_id`, `profile_id`) while `linked`; CHECK `linked_consistent` is **one-directional** (`status='linked'` ⇒ `linked_at`, `profile_id`, `link_id` NOT NULL) after the forward-fix |
| `external_identity_audit_log` (**new**) | append-only (triggers block UPDATE/DELETE); `event_type` ∈ `environment_upserted`, `organization_bound`, `capability_granted`, `invitation_issued`, `invitation_linked`, `binding_revoked`, `grant_revoked`, `member_revoked`, `invitation_revoked`; `outcome` `applied` \| `noop`; `metadata_json` |
| `external_access_resolution_log` (**new**) | append-only; **denials only** from the resolver (`outcome` ∈ `unbound`, `revoked`, `environment_inactive`, `profile_inactive`; `bound` is admitted by the CHECK but never written); `subject_hash` sha256, optional `client_id`, `binding_id` / `profile_id` / `grants_version` |

Person links: partial unique index
`identity_profile_source_links_external_idp_subject_uidx (source_system, source_object_type, source_object_id) WHERE active AND source_system LIKE 'external_idp:%'`
— one active subject resolves to exactly one `identity_profile`. Links use
`source_system = 'external_idp:<environment_id>'`, `source_object_type = 'subject'`, `source_object_id = <sub>`,
`is_login_identity = TRUE`; `link_id = buildIdentitySourceLinkId(...)`. `canonical_source_system()` maps
`external_idp:%` → `external_idp`, so the link is visible in `person_360.linked_systems`. GRANTs: runtime/app
SELECT+INSERT+UPDATE on the four state tables and SELECT+INSERT on the two logs; migrator ALL.

**Membership = the `linked` invitation.** A row in `external_member_invitations` with `status='linked'` under an
active binding IS the external-access membership; `person_memberships` is not written (follow-up only if Account
360 needs that projection). Effective grants = binding-wide (`profile_id IS NULL`) ∪ per-person
(`profile_id = member`).

**Commands** — `src/lib/identity/external-access/commands.ts` (no `server-only`, no `@core`, bundleable by
`services/auth-server`). Each is idempotent and runs one transaction = state + `external_identity_audit_log` +
outbox. One dedicated capability per command (module `organization`, scope `tenant`, seeded in the registry and
the TS catalog, granted only to `efeonce_admin`):

| Command | Capability | Rule that matters |
| --- | --- | --- |
| `upsertExternalIdentityEnvironment` | `identity.external_environment.manage` | no-op when nothing changed; `issuer_class` cannot change on an existing environment (`conflict`) |
| `bindExternalOrganization` | `identity.external_binding.bind` | organization must be `organization_type ∈ client \| both`, `active`, `status='active'`, `lifecycle_stage='active_client'`; environment `draft` \| `active`; idempotent by (org, env, ref); `conflict` if the ref differs or is already used by another organization |
| `grantExternalCapability` | `identity.external_grant.issue` | binding active + environment not retired; per-person requires a `linked` member; bumps `grants_version` on create |
| `issueExternalInvitation` | `identity.external_invitation.issue` | base64url 32-byte token returned ONCE, sha256 persisted; an existing open invitation ⇒ 200 without token unless `reissue: true` (revokes the open one with reason `reissued` and issues another — the `TASK-1830` recovery path); `expiresInHours` default 72, max 720; optional `profileId` (existing person) |
| `acceptExternalInvitation({ token, environmentId, subject, verifiedEmail?, displayName? })` | — (in-process consumer: the auth-server, `TASK-1830`; **no public route in this slice**) | person resolution order: `invitation.profile_id` → already-active link (environment, subject) → single exact match on `identity_profiles.canonical_email` (0 ⇒ creates an `external_contact`; >1 ⇒ `identity_collision`); `verifiedEmail` ≠ invited email ⇒ `invalid_request`; environment must be `active`; supersedes the person's previous `linked` membership (`superseded_by_reinvitation`); `designated_admin` updates the binding's `designated_admin_profile_id` |
| `revokeExternalAccess` | `identity.external_access.revoke` | scope `binding` (revokes grants + members, deactivates orphan links, bump) \| `grant` (bump) \| `member` (its invitations + per-person grants; deactivates the link if no other active membership in the environment; bump) \| `invitation` (open ones only, no bump); `reason` mandatory; idempotent (`changed:false`) |

Reads (`identity.external_binding.read`): environments; eligibility over existing Account 360 client organizations
(`eligible=true` only for `active_client`, the rest listed with `eligible=false` and their `activeBindings`);
bindings (filters `organizationId`, `environmentId`, `status`); binding detail = binding + grants + invitations,
never `token_hash`. Admin adapters: `src/app/api/admin/identity/external-access/**` (`requireAdminTenantContext` +
`can()` with the dedicated capability). Domain errors map to canonical es-CL codes `external_access_*` in
`src/lib/api/canonical-error-response.ts` (422 / 404 / 409 / 410).

**Gateway reader contract** (consumer: the MCP gateway, `TASK-1831`):
`GET /api/platform/ecosystem/identity/binding?environment=<id>&subject=<sub>[&clientId=<azp>]&externalScopeType=other&externalScopeId=efeonce-mcp-gateway`,
routeKey `platform.ecosystem.identity.binding`, served by `runEcosystemReadRoute` with the gateway's existing
`internal`-scope sister-platform binding (`GREENHOUSE_ECOSYSTEM_TOKEN`); resource
`src/lib/api-platform/resources/ecosystem-identity-binding.ts`. A non-`internal` binding gets `404` (anti-oracle);
missing `environment`/`subject` gets `400 bad_request`. Response = the `resolveExternalAccess` result —
`{ outcome, environmentId, issuerClass, profileId, memberships[{ bindingId, organizationId, externalOrganizationRef, grantsVersion, grants[], designatedAdmin }], resolvedAt }`
— plus `cacheTtlSeconds: 60` and `Cache-Control: private, no-store`. Outcomes: `bound` \| `unbound` \| `revoked`
\| `environment_inactive` \| `profile_inactive`; only `bound` authorizes, and the gateway compares `grantsVersion`
with the token's `gv` claim by **strict equality**. Resolution order: environment `active` → active link
(environment, subject) → profile active and not merged → `linked` memberships under active bindings → grants
(binding-wide ∪ per-person). An inactive link plus a revoked membership answers `revoked`, so support can tell
"never anyone" from "was revoked". Every denial is inserted into `external_access_resolution_log`; if that INSERT
fails it is captured (`captureWithDomain('identity')`) and the denial stands. `clientId` is logged, never a
binding key. The response never carries the subject or an email.

**Outbox**: aggregate `external_identity_binding`, six v1 events without token/email/subject —
[`GREENHOUSE_EVENT_CATALOG_V1.md`](GREENHOUSE_EVENT_CATALOG_V1.md) §Identity. No reactive consumer yet; push
invalidation of `grants_version` toward the gateway is `TASK-1831`.

**Reliability**: the four Slice 0 signals are live under `moduleKey='identity'`, steady 0 —
[`GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`](GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md) (delta 2026-09-04).
Agent invariants: [`agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`](agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md)
§`External identity binding`.

**Verification.** Vitest green: `src/lib/identity/external-access/*.test.ts` (33),
`external-identity-binding-signals.test.ts` (8), `capability-grant-coverage.test.ts`, `registry-store.test.ts`;
`pnpm typecheck` exit 0; eslint clean; `pnpm migration-marker-gate` OK. Live smoke
`pnpm identity:external-access:smoke` (`scripts/identity/external-access-smoke.ts`, PG profile `runtime`):
read-only mode exercises the readers and the four signals; `-- --apply` runs the whole lifecycle against the
fixture organization `org-ddd962ae-6417-4325-92d0-f1994dc06cc5` (ZZZ Q2C Smoke Fixture, `active_client`) and the
environment `smoke-task-1631` (left `retired`): environment → binding gv1 → idempotent re-bind → grant
`globe.producer.fleet.read` gv2 → invitation → resolve `unbound` → accept (profile `data_origin='smoke_test'`,
link `external_idp:smoke-task-1631`) → resolve `bound` with grants + `designatedAdmin` → revoke member gv3 →
resolve `revoked` → revoke binding gv4 → environment retired. The first apply caught the bidirectional CHECK
(hence the forward-fix migration). Expected side effect: `unbound_dispatch_attempt` warns for 24 h after an
apply. **Not exercised in this slice**: customer OAuth canaries (Claude/Codex/ChatGPT), live tokens, multi-issuer
gateway, auth-server, UI — those live in `TASK-1828`/`1829`/`1830`/`1831`/`1832` and the ui-ux task.

**Design decisions taken in this slice (in force):**

1. External-access membership = `linked` invitation under an active binding; `person_memberships` is not
   written (follow-up if Account 360 needs the projection).
2. Per-person grants via `profile_id` on `external_capability_grants` resolve the 2026-08-26 delta
   (`growth.ai_visibility.*` per person) without a future migration. The concrete Growth grant is not issued
   here: `TASK-1831`/Growth decide it, registering Entra as an `internal` environment plus a binding for
   Efeonce's own organization (EO-ORG-0007) if this graph is to serve internal people too.
3. Resolution log stores denials only, subject hashed; growth is bounded (denials are anomalies); no automatic
   pruning yet.
4. Revocation deactivates the source link when the person keeps no other active membership in the environment
   ⇒ the auth-server session dies (`TASK-1830` contract) and the resolver answers `revoked` from the inactive link.
5. `issuer_class` is immutable per environment; `subject_type` is recorded (`public` by default; the native
   issuer emits `public` per the native ADR).
6. Strict eligibility: `active_client` only; inactive/churned organizations are listed with `eligible=false` so
   the operator sees why they do not enter.
7. The subprocessor gate (S0.3) does not block (native issuer); the security posture is audited in `TASK-1833`.
8. No new Greenhouse feature flag: commands are gated by admin capability; the gateway reader only answers
   `internal` bindings; external usage is gated by the gateway's `OAUTH_EXTERNAL_ISSUER_ENABLED` (`TASK-1831`).
   No new `*_ENABLED` ⇒ the flag ledger is unchanged.

### Slice 0 gateway authorization-context contract (2026-08-05)

The gateway's `AuthInfo` contract is replaced (current shape verified 2026-08-05: `{ token, clientId, scopes,
expiresAt }` with `clientId = azp ?? sub` and `scopes = scp ∪ scope ∪ roles`):

```text
AuthContext {
  issuer            // verbatim from the validated token; selects the verifier that ran
  subject           // sub — never dropped, never merged into clientId
  clientId          // azp/client_id if present; NO fallback to sub — absent means absent
  audience          // aud actually validated
  delegatedScopes   // scp ∪ scope ONLY (user-consented delegated authority)
  roles             // roles claim ONLY (administrative assignment) — never merged into scopes
  expiresAt
}
```

Verification becomes a **per-issuer resolver**: each configured issuer carries its own JWKS, audience and
authority policy; an unknown issuer is denied before JWKS fetch. Every tool declares `allowedIssuers` and the
**authority class** it accepts (`delegatedScopes` and/or `roles`); internal-only tools — the credit-funding write
included — declare the internal Entra issuer exclusively, so an external-issuer token carrying the same scope
string is denied at dispatch with a redacted signal. Person binding resolves exclusively by `(issuer, subject)`
through the environment registry; `clientId` is never a binding key. Regression tests required before the second
issuer ships: (a) external token + internal-only scope string → dispatch denial; (b) token with
`roles: [<write scope string>]` and no delegated scope → denial, proven inside the internal issuer as well;
(c) revoked grant with still-valid token → denial via `grants_version` recheck.

## Alternatives considered

### Keep Entra as the customer identity provider

Rejected for customer access. It is appropriate for the verified Efeonce internal canary, but requiring every
customer to be represented in Efeonce's tenant does not provide independent B2B onboarding, organization
administration or customer-owned federation.

### Put customer identity or OAuth in Globe

Rejected. Globe is the first provider, not the platform identity owner. This would couple all future MCP providers
to Globe releases and make Globe own a cross-product commercial identity.

### Let the gateway own customer organizations and entitlements

Rejected. It duplicates Account 360 and provider policy, then drifts. The gateway remains an authentication,
transport and routing adapter with a narrow verified binding lookup.

### Open public signup or infer membership from an email domain

Rejected for the first customer rollout. Existing customers must be deliberately enrolled from Account 360 so that
commercial relationship, identity, capability and Globe workspace policy remain correlated and revocable.

### Choose an identity provider before an explicit commercial approval

Rejected. WorkOS is the leading technical candidate, but an external account, plan, custom domain and production
secrets are an irreversible operational commitment and require explicit operator approval.

## Consequences

- Customers can connect from compatible MCP clients without an Efeonce Entra account.
- Customer onboarding has a clear order: select/verify an existing Account 360 organization, allowlist it,
  establish the explicit identity binding, designate/invite its administrators, grant the provider capability,
  then run organization-scoped OAuth and provider canaries.
- Existing Greenhouse customers keep one canonical person and organization membership while applications keep
  separate audience-bound sessions. The first MCP rollout may coexist with the current portal login, but it must
  leave an explicit, reversible path to a shared external authentication relationship.
- The gateway needs dual-issuer transition support and a binding/entitlement resolver; providers need an
  organization-aware revalidation contract.
- The initial login surface is a dedicated custom Efeonce UI, but customer self-service administration is not
  required for the first allowlisted rollout. Initial enrollments and grants remain operator-managed through
  audited, canonical Greenhouse primitives.

## Rollout gates

1. Accept this decision and approve the selected identity-provider/composition and any commercial plan before
   production provisioning. The selection must include the measured native Greenhouse broker vs WorkOS vs hybrid
   comparison; a WorkOS benchmark alone is not an approval.
2. Discover and implement the Account 360/person binding with migration, collision handling, recovery, audit and
   revocation semantics; approve the future Greenhouse customer-login convergence contract without coupling the
   first MCP rollout to that later cutover.
3. Implement the isolated `auth.efeonce.org` custom UI/session service with the selected server-side adapter (native
   Greenhouse broker, WorkOS or hybrid), then configure the external issuer, OAuth metadata, PKCE and supported MCP
   client registration. If the native route is selected, the broker must be extracted and operated independently;
   the Greenhouse deployable remains an identity/data dependency, not the OAuth runtime.
4. Add the gateway's gated dual-issuer validation and provider entitlement revalidation; retain the Entra internal
   canary unchanged.
5. Run Claude, Codex and ChatGPT compatibility canaries with one allowlisted customer organization, one
   base-only denial and an explicit revocation test.
6. Only after those are green, allow the first read-only Globe capability for that organization. Writes, spending,
   approvals and rights-sensitive tools each require their own ADR/task gate.

## Revisit when

- The selected provider/composition cannot meet the verified metadata/registration, B2B federation, data-residency
  or commercial requirements, or the native broker proves too costly to operate safely.
- A second MCP provider requires a materially different organization or entitlement model.
- Customer self-service administration, public signup, SCIM, enterprise SSO or contractual audit requirements
  expand the binding.
- The canonical Account 360 organization/membership model changes.

## References

- [`GREENHOUSE_360_OBJECT_MODEL_V1.md`](GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [`GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`](GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md)
- [`GREENHOUSE_MCP_ARCHITECTURE_V1.md`](GREENHOUSE_MCP_ARCHITECTURE_V1.md)
- [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
- [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
- [`TASK-1631`](../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md)
