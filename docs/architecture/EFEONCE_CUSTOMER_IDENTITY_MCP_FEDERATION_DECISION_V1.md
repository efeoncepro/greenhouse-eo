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
read-only Globe fleet reader. That identity is an internal validation path: it emits both delegated MCP scopes and
cannot model a customer's organization, administrator, member, entitlement or revocation. It must not become a
prerequisite for Efeonce customers.

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
service at `auth.efeonce.org` will use AuthKit Authentication APIs server-side and WorkOS Connect for MCP OAuth;
the gateway remains a resource server, not a session/UI host. This is not WorkOS Standalone Connect in the first
cut: Efeonce does not yet have an independent customer authentication stack to reuse. WorkOS continues to own
credential and authentication mechanics; the browser never receives a WorkOS API key.

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
- One person maps to one canonical `identity_profile`. A WorkOS or other IDP subject is an external source link;
  it must not create a parallel customer identity or permanent second credential set for an existing person.
- Greenhouse, `auth.efeonce.org` and MCP use separate cookies, sessions and token audiences. Sharing a Greenhouse
  session secret/cookie with another deployable, or accepting a portal cookie as an MCP token, is prohibited.
- Customer-facing Greenhouse authentication and MCP authentication must have an explicit convergence path through
  the same accepted external identity plane. Coexistence is allowed during rollout; permanent identity divergence
  is not.
- Entra remains available only for the internal canary during the transition. It neither onboards external customers
  nor demonstrates their deny/revocation behavior.
- External authorization uses OAuth 2.1 authorization code with PKCE. Remote MCP clients must have public
  authorization-server metadata and a deliberate dynamic-registration or pre-registration compatibility path.
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

1. Accept this decision and approve the selected identity-provider commercial plan before production provisioning.
2. Discover and implement the Account 360/person binding with migration, collision handling, recovery, audit and
   revocation semantics; approve the future Greenhouse customer-login convergence contract without coupling the
   first MCP rollout to that later cutover.
3. Implement the isolated `auth.efeonce.org` custom UI/session service with server-only AuthKit API access, then
   configure the external issuer, OAuth metadata, PKCE and supported MCP client registration.
4. Add the gateway's gated dual-issuer validation and provider entitlement revalidation; retain the Entra internal
   canary unchanged.
5. Run Claude, Codex and ChatGPT compatibility canaries with one allowlisted customer organization, one
   base-only denial and an explicit revocation test.
6. Only after those are green, allow the first read-only Globe capability for that organization. Writes, spending,
   approvals and rights-sensitive tools each require their own ADR/task gate.

## Revisit when

- WorkOS cannot meet the verified metadata/registration, B2B federation, data-residency or commercial requirements.
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
