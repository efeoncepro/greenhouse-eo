# MCP capability intake

Use this before adding or enabling a provider capability. Keep the record in its owning task or provider contract;
this file is a checklist, not a second registry.

## Required contract

| Field | Decide and record |
| --- | --- |
| Owner | Product/runtime that owns the source of truth and policy |
| Capability | Stable MCP tool/resource/prompt name and concise purpose |
| Class | `read`, `write`, `approval`, `spend`, `rights-sensitive` or `admin` |
| Downstream | Canonical API, reader or command; exact package/version if applicable |
| Authorization | Required human scope, provider entitlement and downstream identity/audience |
| Tenancy | Versioned actor context, exact target per call and canonical reader/provider revalidation; never infer all targets from an anchor claim |
| Input/output | Typed schema, pagination/idempotency if relevant, redacted error contract |
| Reliability | Timeout, concurrency/rate limit, circuit behavior, correlation ID and rollback flag |
| Evidence | Local/contract, auth allow/deny, provider fault, public-edge and client smoke |

## Gate by capability class

- `read`: start disabled and allowlist only after scope, tenancy, redaction and provider canary pass.
- `write`, `approval`, `spend` or `rights-sensitive`: create or extend the owning ADR/task first. Require a preview,
  explicit confirmation/idempotency, audit evidence, rollback and domain-owner approval.
  - 🔴 **Classify `spend` by downstream effect, not by whether THIS tool bills anything.** `track_seo_keywords`
    (TASK-1308) calls no paid API and writes no cost ledger row, yet every keyword it adds is billed to the provider
    on every daily rank-capture cycle until someone untracks it — a **deferred spend commitment**. If the action
    enlarges a recurring job's workload, it is `spend`. Such a capability ships with a governed ceiling, a **typed
    per-item outcome** (never a bare boolean, never silence on rejection), a per-tenant entitlement, idempotency, and
    **its reverse in the same PR** — without the reverse the commitment is permanent.
  - **Reuse the domain's existing write scope.** Scopes are per blast-radius class, so an N+1 write in a domain that
    already has one needs no issuer change. A new scope belongs to the owning issuer/resource contract and
    needs consent/step-up proportional to its class; native bootstrap stays base-only. Do not assume it requires
    Entra. If a separately authorized Entra change applies, `az ad app update` replaces the whole array:
    verify the round-trip or it wipes the live scopes.
  - **A write scope is never wired into the shared public PKCE client** (see the SKILL hard rule). Expect the tool to
    remain fail-closed for any population that lacks a token carrying its grant. The revocable per-organization /
    per-person grant exists (`greenhouse_core.external_capability_grants`, `TASK-1631`, 2026-09-04), and the native
    issuer plus multi-issuer gateway can mint and verify `gv`. Customer use still requires its own eligible grant,
    consent and governed pilot (`TASK-1841`). TASK-1844 internal v2 currently delegates only
    `growth.seo.observation.read`; it does not confer new writes or make another provider v2-compatible.
    Neither gate is solved by widening the shared client or bootstrap scopes.
- `admin`: do not expose until an entitlement model, named operators, high-signal audit trail and incident runbook exist.

## Provider boundary

The gateway may translate MCP transport and verified identity into a narrow provider request. It must not calculate
domain policy, pick a creative provider, reserve credits, access storage or bypass a product API. If those seams do
not exist, stop and create the provider task rather than widening the gateway.

For an internal v2 provider, load [native-authority.md](native-authority.md) and declare the supported capability
class, target contract and fresh authorization path. Adding an organization under existing permissions uses
`efeonce.organizations.list` and the canonical reader; it does not require another OAuth client. Adding a new
provider/capability class requires its own contract, adapter, allow/deny/fault matrix and rollout evidence.
