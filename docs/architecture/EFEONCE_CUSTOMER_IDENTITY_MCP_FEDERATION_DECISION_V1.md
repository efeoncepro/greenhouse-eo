# Efeonce Customer Identity and MCP Federation Decision V1

> **Status:** `Proposed`
> **Date:** 2026-08-01
> **Owner:** Efeonce Platform / Identity
> **Scope:** customer identity, B2B federation, MCP OAuth, Account 360 organization binding and Globe access
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `medium`
> **Validated as of:** 2026-08-01 — gateway MCP, Entra canary and Account 360 contracts verified; no external identity provider has been provisioned.
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
MCP clients while supporting B2B organization federation. This is a recommendation, not an accepted vendor
commitment: no tenant, billing plan, DNS record, secret or production configuration is authorized by this proposal.

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

## Invariants

- `greenhouse_core.organizations` remains the canonical commercial/customer organization. An identity-provider
  organization ID is an external binding, never a replacement tenant ID.
- Account Complete 360 remains the organization graph resolver. New organization-scoped consumers use its canonical
  scope or a documented server-side binding primitive; they do not reconstruct tenant membership from a JWT claim.
- Globe owns Globe workspace membership, creative policy, credits, rights and tool/capability entitlement. The
  identity plane does not own them and the gateway does not duplicate them.
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

### Choose an identity provider before an explicit commercial approval

Rejected. WorkOS is the leading technical candidate, but an external account, plan, custom domain and production
secrets are an irreversible operational commitment and require explicit operator approval.

## Consequences

- Customers can connect from compatible MCP clients without an Efeonce Entra account.
- Customer onboarding has a clear order: create/verify Account 360 organization, establish the explicit identity
  binding, grant the provider capability, then run organization-scoped OAuth and provider canaries.
- The gateway needs dual-issuer transition support and a binding/entitlement resolver; providers need an
  organization-aware revalidation contract.
- A customer self-service administration UI is intentionally not required for the first allowlisted rollout. Initial
  grants may be operator-managed only through audited, canonical Greenhouse primitives.

## Rollout gates

1. Accept this decision and approve the selected identity-provider commercial plan before provisioning it.
2. Discover and implement the Account 360 binding with migration, audit and revocation semantics.
3. Configure the external issuer at `auth.efeonce.org`, OAuth metadata, PKCE and supported MCP client registration.
4. Add the gateway's gated dual-issuer validation and provider entitlement revalidation; retain the Entra internal
   canary unchanged.
5. Run Claude, Codex and ChatGPT compatibility canaries with one allowlisted customer organization, one
   base-only denial and an explicit revocation test.
6. Only after those are green, allow the first read-only Globe capability for that organization. Writes, spending,
   approvals and rights-sensitive tools each require their own ADR/task gate.

## Revisit when

- WorkOS cannot meet the verified metadata/registration, B2B federation, data-residency or commercial requirements.
- A second MCP provider requires a materially different organization or entitlement model.
- Customer self-service administration, SCIM, enterprise SSO or contractual audit requirements expand the binding.
- The canonical Account 360 organization/membership model changes.

## References

- [`GREENHOUSE_360_OBJECT_MODEL_V1.md`](GREENHOUSE_360_OBJECT_MODEL_V1.md)
- [`GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`](GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md)
- [`GREENHOUSE_MCP_ARCHITECTURE_V1.md`](GREENHOUSE_MCP_ARCHITECTURE_V1.md)
- [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
- [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
- [`TASK-1631`](../tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md)
