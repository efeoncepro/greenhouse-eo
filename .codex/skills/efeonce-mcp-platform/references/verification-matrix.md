# MCP verification matrix

Run the smallest complete row for the change. Never record secrets, bearer tokens, authorization codes or raw
customer payloads as evidence.

| Change | Minimum evidence |
| --- | --- |
| Gateway code or protocol | formatting, types, unit/contract tests, Streamable HTTP initialize and malformed request rejection |
| OAuth/resource metadata | root and path metadata, missing/expired/wrong issuer/audience token rejection, insufficient-scope rejection before downstream dispatch, authenticated initialize |
| Provider adapter | disabled default, capability listing, allow, deny before dispatch, timeout/fault sanitization, correlation and provider isolation |
| Globe/creative capability | all provider evidence plus workspace/rights/credit/approval gates from Globe; for the active fleet reader, verify no house/provider cost or margin leaks; never test with a real paid generation unless authorized |
| Internal multi-organization v2 | fresh versioned consent, v1 refresh non-upgrade, paginated discovery/cursor revoke, A/B allow and C/missing deny, selective/global/family revocation, concurrent isolation, native client events, OFF/restore and fixture retirement; [client-certification.md](client-certification.md) |
| Customer/B2B MCP access | all OAuth and provider evidence plus a real client that receives only its granted tenant/capability entitlements, revocation evidence and an external-access decision; an internal client that receives both the base (`efeonce.mcp.read`) and Globe reader (`efeonce.mcp.globe.read`) scopes is insufficient |
| Cloud Run/edge | deployed revision/image, ingress, service identity, rollback revision, DNS from independent resolvers, TLS, public unauthorized `401` |
| Managed TLS incident | A/AAAA/CNAME answers from authoritative and independent public resolvers, forwarding-rule IP/443, HTTPS-proxy certificate attachment, certificate-map absence/precedence, managed/domain status and retry timestamp |
| Auth host on the shared front door (`auth.efeonce.org`, TASK-1828) | Terraform plan for `enable_auth_host` with 0 destroy and the gateway cert's `managed.domains` untouched, own cert `efeonce-auth-server-cert` `ACTIVE`, host rule → `efeonce-auth-server-backend`, `mcp.efeonce.org` health/`401` unchanged, `/healthz` + `/.well-known/jwks.json` through the front door, wrong `Host` → `421`; runbook `docs/operations/runbooks/auth-server.md` |
| New write or approval | all above plus ADR/task, preview/confirmation, idempotency, audit/redaction, entitlement revocation and reversible rollback |

## Public completion sequence

1. Certificate and domain status are `ACTIVE`; wait for the edge to serve it.
2. `https://mcp.efeonce.org/health` succeeds without leaking configuration.
3. Protected-resource discovery succeeds at root and endpoint paths.
4. An unauthenticated `POST /mcp` returns `401` with the expected challenge.
5. A real authorized client completes MCP `initialize`; a dispatch-level missing-provider-scope test denies before
   downstream dispatch. Before customer access, repeat it with a client that can actually receive base-only access.
6. Record revision/digest, auth result, DNS/TLS outcome, provider state and rollback target in the runbook/task.

## Native issuer and corporate session

For TASK-1836/TASK-1831/TASK-1844 changes, apply [native-authority.md](native-authority.md): direct anonymous
`/login` visibility/click/session and the client OAuth/MCP canary are distinct rows. Require context-bound
allow/deny, refresh, token-family and grant revocation with an unexpired token, bounded OFF/restore and
separate legacy/external regression evidence. V2 separates actor anchor and target; target changes under the
same consented authority do not require reconnecting. Track client recovery after OFF separately, preserve
final OAuth families during cleanup and limit a verdict to the tested cohort. Never substitute flags ON,
metadata, model prose or a process with zero tool calls for authenticated dispatch.

## External invitation delivery and delegated authority (TASK-1837)

Migration and release applied 2026-09-06. The staging contract evidence remains in
`docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`; TASK-1832 later verified the
production invitation/login path and the gateway federation with a synthetic organization. Read mutable flags,
revisions and SHAs live and record the exact snapshot in the active canary manifest.

| Row | Minimum evidence | Status |
| --- | --- | --- |
| Invitation delivered by the system | `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` ON, an external binding + controlled mailbox, email received from the Efeonce sender, `/i/<token>` on the issuer accepted → `linked` → magic link → session; admin response carries `delivery` and no `token` | staging ✔; producción TASK-1832 ✔ con alias M365 controlado, aceptación POST scanner-safe, magic link y sesión; Gmail personal autorizado se conserva como infraestructura separada, no como correo corporativo |
| Resend rotates | new row, previous one `revoked` (`resent`), old token rejected with `invitation_not_open`, cap 3 per chain → 429 | smoke live ✔ · staging ✔ (`…/resend` 201, new row `deliveryAttempts=2`, previous `revoked` `resent`) |
| Reveal exception | capability `identity.external_invitation.reveal_token`, reason ≥10 chars, 1 h row without email, audit `invitation_token_revealed` with actor + reason and no token, signal `identity.external_invitation.token_revealed` ok → warning | smoke live ✔ · staging ✔ (`…/reveal` 201, 1 h row, `acceptanceUrl` on the issuer; signal seen lighting) |
| Delivery failure / bounce | `delivery_status` `failed`/`bounced` + audit + outbox `delivery_failed`; signal `undelivered` lights while the row stays open | smoke live ✔ for `failed` · staging ✔ forced bounce (`bounced@resend.dev` → Resend webhook → projection → `bounced`, `bounce:Permanent`; signal `undelivered` seen ok → warning). Caveat: the reactive drain ran locally, scoped to the `notifications` handler, because the ops-worker still runs `main`; the worker picks the projection up on its next deploy |
| Delegated lane, 4 negatives | via the gateway: flag OFF / consumer not internal → 404; foreign or unbound binding / non-admin subject → 403; `designatedAdmin: true` → 422; seat cap → 422; hourly cap → 429; response never carries the token | smoke live ✔ · staging ✔; PR #3 mergeado y desplegado. TASK-1832 confirma que el canary no-admin/base-only no adquiere la escritura ni authority delegada |
| Delegated resend / revoke | Greenhouse lane `POST …/identity/invitations/[invitationId]/resend` (201) and `…/revoke` (200) with `Idempotency-Key`: resend rotates only within the own binding (foreign invitation → `not_found`); revoke takes scope `invitation` (open) or `member` (linked, `grants_version` bump); a delegated admin revoking themself → `invalid_request` | Greenhouse lane ✔ tests (focal suite 62 ✔, typecheck ✔); gateway federation pending (not in PR #3) |
| Gateway tools `identity.invitations.list` / `identity.invitation.create` | read on the base scope, write on `efeonce.mcp.identity.write` (403 challenge naming the scope); policies native issuer + `native-external` population only, `organizationId` by membership; `token` never forwarded; live canary through `mcp.efeonce.org` | PR #3 mergeado y producción activa. TASK-1832 importó sólo las dos tools read-only autorizadas en clientes externos; `identity.invitation.create` permaneció oculta/fail-closed sin ampliar scope |
| Designated admin clearing | revoking the admin member sets `designated_admin_profile_id = NULL` + audit `designated_admin_cleared`; a second `designated_admin` accept while one is `linked` → `conflict`, token not consumed | smoke live ✔ |
| Consent shows redirect host | consent page renders the host of the validated `redirect_uri` (`data-capture="id-redirect-host"`) | render test ✔ · dev-UI screenshots ✔ · producción TASK-1832 ✔ en loopback y callback hospedado |

## Client service enablement with delegated human authority (TASK-1852, live 2026-09-10)

Migration `20260910005222927` applied; release `f69b9d326a6f` (PR #232) in production with
`CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED=true` (release contract canary 5/5, watchdog 5/5); gateway `efeonce-mcp`
`1.4.0` serving on `efeonce-mcp-gateway-00052-slt`. Read flags, the Ready revision and `efeonce.gateway.status` live
before citing them.

| Row | Minimum evidence | Status |
| --- | --- | --- |
| Scope gate | `403 insufficient_scope` naming `efeonce.mcp.client_services.write` on all three tools, preview included; never in bootstrap `scopes_supported` | policy + surface tests ✔ (PR #9) |
| Exchange client | `efeonce-mcp-client-services` confidential, exactly one scope `client_services.enablement.write`, `metadata.resourceFamily=client_services`, listed in `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`; anything else `401 invalid_client` | migration + Production allowlist ✔ |
| App-lane authority | exchanged bearer accepted only for an Entra-verified internal human with the operation's capability; tenant agent denied for writes; receipt `authority.kind=delegated_oauth` | contract tests ✔ |
| Ecosystem lane | writes answer `403 invalid_delegated_context` by design | ✔ |
| Native issuer | `unsupported` (`provider_delegation_required`); never "fixed" by widening v2 | policy ✔ |
| Gateway status | `efeonce.gateway.status` lists `greenhouse-client-services` `enabled` (it did not until PR #10) | production readback ✔ |
| Human write canary | `pnpm client-services:canary` with a person's Entra bearer (preview only), then a governed `apply` confirmed by a human | **done 2026-09-10** — `apply_client_service_enablement` for Sky through production (`EO-APC-ECD63852`, `authority.kind=delegated_oauth`, replay `replayed=true`); recipe: person mints the bearer via the public PKCE client, stores it `0600`, the agent calls `tools/call` without `MCP-Protocol-Version` (legacy handshake) |
