# Efeonce Customer Identity and MCP Federation Decision V1

> **Status:** `Proposed`
> **Date:** 2026-08-01
> **Owner:** Efeonce Platform / Identity
> **Scope:** customer identity, B2B federation, MCP OAuth, Account 360 organization binding and Globe access
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `medium`
> **Validated as of:** 2026-08-02 — gateway MCP, Entra canary, current Greenhouse NextAuth/session resolution and Account 360 contracts verified; WorkOS has a staging project with MCP discovery configuration only. There is no external customer binding, public login, production domain, production secret, Greenhouse customer-login convergence or customer access.
> **Implementation:** [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md)

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

**Pre-signature verification checklist (blocking):** confirm against live WorkOS discovery that it publishes
`client_id_metadata_document_supported` (CIMD is the primary MCP registration mechanism; DCR alone fails the
invariant), confirm `subject_types_supported: public` on the actual tenant, and obtain the current DPA +
subprocessor list for the privacy review below.

**Slice 0 recommendation (pending operator approval, not self-executing):** adopt **WorkOS** for the first
external cohort with the provider-neutral binding and the exit contract above, and **defer native/hybrid** to the
explicit revisit trigger (≥5 enterprise SSO connections or a WorkOS pricing/term change). Rationale: the cohort
is small and allowlisted, speed matters for the B2B MCP program, the marginal money cost is trivial against
7–10.5 build weeks plus permanent security operations, and the binding design keeps the exit reversible. The
privacy/subprocessor gate remains independent: see
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
- [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md)
