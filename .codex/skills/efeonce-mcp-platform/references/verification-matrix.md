# MCP verification matrix

Run the smallest complete row for the change. Never record secrets, bearer tokens, authorization codes or raw
customer payloads as evidence.

| Change | Minimum evidence |
| --- | --- |
| Gateway code or protocol | formatting, types, unit/contract tests, Streamable HTTP initialize and malformed request rejection |
| OAuth/resource metadata | root and path metadata, missing/expired/wrong issuer/audience token rejection, insufficient-scope rejection before downstream dispatch, authenticated initialize |
| Provider adapter | disabled default, capability listing, allow, deny before dispatch, timeout/fault sanitization, correlation and provider isolation |
| Globe/creative capability | all provider evidence plus workspace/rights/credit/approval gates from Globe; for the active fleet reader, verify no house/provider cost or margin leaks; never test with a real paid generation unless authorized |
| Customer/B2B MCP access | all OAuth and provider evidence plus a real client that receives only its granted tenant/capability entitlements, revocation evidence and an external-access decision; an internal client that receives both the base (`efeonce.mcp.read`) and Globe reader (`efeonce.mcp.globe.read`) scopes is insufficient |
| Cloud Run/edge | deployed revision/image, ingress, service identity, rollback revision, DNS from independent resolvers, TLS, public unauthorized `401` |
| Managed TLS incident | A/AAAA/CNAME answers from authoritative and independent public resolvers, forwarding-rule IP/443, HTTPS-proxy certificate attachment, certificate-map absence/precedence, managed/domain status and retry timestamp |
| New write or approval | all above plus ADR/task, preview/confirmation, idempotency, audit/redaction, entitlement revocation and reversible rollback |

## Public completion sequence

1. Certificate and domain status are `ACTIVE`; wait for the edge to serve it.
2. `https://mcp.efeonce.org/health` succeeds without leaking configuration.
3. Protected-resource discovery succeeds at root and endpoint paths.
4. An unauthenticated `POST /mcp` returns `401` with the expected challenge.
5. A real authorized client completes MCP `initialize`; a dispatch-level missing-provider-scope test denies before
   downstream dispatch. Before customer access, repeat it with a client that can actually receive base-only access.
6. Record revision/digest, auth result, DNS/TLS outcome, provider state and rollback target in the runbook/task.
