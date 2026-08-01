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
| Tenancy | Verified identity claim and provider-side workspace revalidation |
| Input/output | Typed schema, pagination/idempotency if relevant, redacted error contract |
| Reliability | Timeout, concurrency/rate limit, circuit behavior, correlation ID and rollback flag |
| Evidence | Local/contract, auth allow/deny, provider fault, public-edge and client smoke |

## Gate by capability class

- `read`: start disabled and allowlist only after scope, tenancy, redaction and provider canary pass.
- `write`, `approval`, `spend` or `rights-sensitive`: create or extend the owning ADR/task first. Require a preview,
  explicit confirmation/idempotency, audit evidence, rollback and domain-owner approval.
- `admin`: do not expose until an entitlement model, named operators, high-signal audit trail and incident runbook exist.

## Provider boundary

The gateway may translate MCP transport and verified identity into a narrow provider request. It must not calculate
domain policy, pick a creative provider, reserve credits, access storage or bypass a product API. If those seams do
not exist, stop and create the provider task rather than widening the gateway.
