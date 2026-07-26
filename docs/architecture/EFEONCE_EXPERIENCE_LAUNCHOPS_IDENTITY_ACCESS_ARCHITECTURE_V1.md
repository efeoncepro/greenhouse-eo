# Efeonce Experience LaunchOps — Identity & Access Architecture V1

## Status

Proposed — enterprise access architecture for discovery and pilot.

## Date

2026-07-26

## Owner

Wave + Product/Architecture + Security/Privacy + Client IT/Identity

## Decision

Experience LaunchOps will use a provider-neutral **federated identity boundary**. It will support standard-based
OIDC and SAML authentication, SCIM 2.0 provisioning, JIT provisioning for lighter pilots and explicit group/claim
mapping into LaunchOps roles and entitlements.

The product will provide preconfigured paths for Microsoft Entra ID and Google Workspace, plus generic OIDC/SAML
configuration for Okta, Auth0, Ping, OneLogin, Keycloak and other compatible identity providers. “Custom SSO” means
configuration of the standard adapter and mapping contract, not a bespoke authentication implementation per client.

## Identity flow

```text
Client IdP
  OIDC / SAML authentication
  SCIM 2.0 lifecycle provisioning
        ↓
LaunchOps Identity Boundary
  issuer/subject · tenant connection · claims · groups · session
        ↓
LaunchOps Authorization
  workspace membership · roles · entitlements · policies · approvals
        ↓
Control Plane / Agent Fabric / Execution Runner
```

## Protocols

| Protocol | Use |
| --- | --- |
| OIDC | Default modern authentication and discovery path |
| SAML 2.0 | Enterprise compatibility and legacy federation |
| SCIM 2.0 | User/group provisioning, updates and deprovisioning |
| JIT | Optional first-login account creation for low-friction pilots |
| OAuth 2.0 | Provider/API delegated access where required; not a replacement for user federation |

OIDC/SAML authenticate. SCIM manages lifecycle. LaunchOps authorization remains separate from both.

## Source-of-truth boundaries

| Concern | Authority |
| --- | --- |
| Person identity at the IdP | Client IdP |
| Active/inactive lifecycle | Client IdP, received through SCIM or verified federation state |
| Client MFA and conditional access | Client IdP |
| LaunchOps workspace membership | LaunchOps |
| LaunchOps roles and entitlements | LaunchOps |
| Launch approval authority | LaunchOps policy + client-authorized roles |
| Launch risk/exception acceptance | Client authority recorded by LaunchOps |
| Session and revocation enforcement | LaunchOps runtime, respecting IdP state |

The IdP answers “who is this person and are they active?”. LaunchOps answers “what may they do here?”.

## Stable identity and account linking

The stable external identity key is `(issuer, subject)`. Email is an attribute, not the primary identity key. Email
changes must not orphan memberships, approvals, launch history or evidence.

Account linking requires verified issuer/domain policy, explicit tenant context and anti-account-takeover controls.
Automatic linking by normalized email alone is not allowed for enterprise accounts.

## Provisioning modes

### SCIM-managed

The client IdP provisions and deprovisions users/groups. LaunchOps validates schema, tenant binding, mapping,
idempotency, replay protection, audit and deactivation behavior. Deprovisioning revokes sessions and entitlements;
it does not erase historical launch evidence.

### JIT

First successful federation login creates a pending or active user according to tenant policy. JIT must not infer
privileged roles from arbitrary claims. It is appropriate for pilots and low-complexity tenants, not a substitute for
SCIM where enterprise lifecycle control is required.

### Invite/manual fallback

Only for explicitly approved tenants or break-glass operations. It must not become the default enterprise lifecycle.

## Group and claim mapping

Mappings are tenant-scoped, versioned, reviewable and auditable:

```text
IdP group/claim
  → mapping rule
  → LaunchOps role/entitlement
  → workspace/site/market/environment scope
```

Example:

```text
LaunchOps-Operators  → launch_operator
LaunchOps-Approvers  → launch.approve
LaunchOps-Release    → launch.release
```

Group names are not authority by themselves. A mapping requires owner, scope, effective date, expiry/review and
revocation path. High-risk entitlements require explicit approval and may require dual authorization regardless of
IdP group membership.

## Authorization model

Every request evaluates both:

- **Views:** whether the actor may see a launch, artifact, policy or evidence.
- **Entitlements:** whether the actor may propose, review, approve, publish, rollback, configure policy or export.

Scope includes tenant, workspace, client, site, market, environment, launch class, worker and action. Revoked or
expired authority never grants access. A client approval role does not automatically grant Wave operator access, and
Wave delivery access does not grant client risk acceptance.

## Critical access actions

Publishing, rollback, policy changes, exception acceptance, credential changes, worker enablement and evidence export
require capability-specific authorization, audit, current session and risk-appropriate approval. Reauthentication or
step-up may be required. Agents cannot approve their own proposals or derive approval from a token claim.

## Deployment and cloud modes

The identity boundary works across the Cloud Placement modes:

- **Managed Wave:** client IdP federates into Wave Control Plane; sensitive execution credentials stay in approved
  adapter/runner scope.
- **Hybrid enterprise:** Wave identity and authorization correlate with a Client Execution Runner identity inside the
  client's cloud/network.
- **Client-controlled:** client operates the runtime but consumes the same identity, entitlement and audit contracts.

No client passwords or complete client directories are replicated into LaunchOps. Tokens are short-lived where
possible, scoped, encrypted in transit and never exposed to models or browser code beyond the intended session.

## Security and recovery requirements

- issuer metadata/certificates rotated through a governed process;
- SAML signature, audience, recipient and replay validation;
- OIDC issuer, audience, nonce, state and PKCE validation;
- SCIM bearer/OAuth authentication, idempotency and audit;
- session revocation after deprovisioning or high-risk role removal;
- break-glass path isolated, time-bound and fully audited;
- IdP outage behavior documented: existing safe sessions may degrade according to policy, new privileged actions fail closed;
- tenant connection disable/rollback without deleting historical evidence.

## Pilot acceptance criteria

- Microsoft Entra OIDC/SAML path verified with one enterprise-like tenant.
- Google Workspace OIDC path verified with one tenant.
- Generic OIDC or SAML connection configured without custom code.
- SCIM lifecycle or JIT path tested, including deprovisioning and session revocation.
- Group mapping grants a low-risk role and refuses an unauthorized release entitlement.
- Stable `(issuer, subject)` identity survives email change.
- Launch approval and agent execution remain separate entitlements.

## External references

Protocol/provider capabilities are time-sensitive and must be revalidated before implementation:

- [Google OpenID Connect reference](https://developers.google.com/identity/openid-connect/reference)
- [OASIS SAML technical overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0-cd-02.html)
- [Microsoft Entra SCIM support](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/scim-support-in-entra-id)
- [Microsoft Entra provisioning lifecycle](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works)
