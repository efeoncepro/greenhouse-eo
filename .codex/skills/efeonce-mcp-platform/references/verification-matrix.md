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

For TASK-1836/TASK-1831 changes, apply [native-authority.md](native-authority.md): direct anonymous
`/login` visibility/click/session and the client OAuth/MCP canary are distinct rows. Require context-bound
allow/deny, refresh, token-family and grant revocation with an unexpired token, bounded OFF/restore and
separate legacy/external regression evidence. Never substitute flags ON or metadata for authenticated dispatch.

## External invitation delivery and delegated authority (TASK-1837)

Migration applied to the shared instance 2026-09-06; verified end-to-end in staging 2026-09-06 with both flags
ON in Vercel staging (Production NOT SET — the code is not in `main` yet, pending release). Status column as of
2026-09-06 (smoke = `pnpm identity:external-access:smoke -- --apply` against real PG on the smoke fixture org;
staging = live run through the admin routes on `dev` with a test external binding on the same fixture org,
revoked at the end; evidence in `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`).

| Row | Minimum evidence | Status |
| --- | --- | --- |
| Invitation delivered by the system | `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` ON in staging, an external binding + controlled mailbox, email received from the Efeonce sender, `/i/<token>` on the issuer accepted → `linked` → magic link → session; admin response carries `delivery` and no `token` | staging ✔ 2026-09-06 — real email from `Efeonce <greenhouse@efeoncepro.com>` to a controlled mailbox, `/i/<token>` accept → `linked` → magic link → `/auth/session` 200; 201 response carried `delivery` and no `token`. Production flags NOT SET pending release |
| Resend rotates | new row, previous one `revoked` (`resent`), old token rejected with `invitation_not_open`, cap 3 per chain → 429 | smoke live ✔ · staging ✔ (`…/resend` 201, new row `deliveryAttempts=2`, previous `revoked` `resent`) |
| Reveal exception | capability `identity.external_invitation.reveal_token`, reason ≥10 chars, 1 h row without email, audit `invitation_token_revealed` with actor + reason and no token, signal `identity.external_invitation.token_revealed` ok → warning | smoke live ✔ · staging ✔ (`…/reveal` 201, 1 h row, `acceptanceUrl` on the issuer; signal seen lighting) |
| Delivery failure / bounce | `delivery_status` `failed`/`bounced` + audit + outbox `delivery_failed`; signal `undelivered` lights while the row stays open | smoke live ✔ for `failed` · staging ✔ forced bounce (`bounced@resend.dev` → Resend webhook → projection → `bounced`, `bounce:Permanent`; signal `undelivered` seen ok → warning). Caveat: the reactive drain ran locally, scoped to the `notifications` handler, because the ops-worker still runs `main`; the worker picks the projection up on its next deploy |
| Delegated lane, 4 negatives | via the gateway: flag OFF / consumer not internal → 404; foreign or unbound binding / non-admin subject → 403; `designatedAdmin: true` → 422; seat cap → 422; hourly cap → 429; response never carries the token | smoke live ✔ in-process · staging ✔ through the gateway consumer token + `environment`/`subject` (200 own list only, 403 foreign binding, 422 self-elevation, 201 delegated issue with real email, no token); MCP tool federation still pending (`TASK-1831`/`TASK-1832`) |
| Designated admin clearing | revoking the admin member sets `designated_admin_profile_id = NULL` + audit `designated_admin_cleared`; a second `designated_admin` accept while one is `linked` → `conflict`, token not consumed | smoke live ✔ |
| Consent shows redirect host | consent page renders the host of the validated `redirect_uri` (`data-capture="id-redirect-host"`) | render test ✔ · dev-UI screenshots ✔ (1440/390, `docs/audits/evidence/2026-09-06-task-1837/`); live issuer pending release (`auth.efeonce.org` still runs `main`) |
