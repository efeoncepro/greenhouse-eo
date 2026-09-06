# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (flow)

## Meta

- Status: `draft`
- Owner task: `TASK-1834`
- Related wireframe: `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Surfaces: Greenhouse `/login`, `auth.efeonce.org` login, NextAuth callback and authorized Greenhouse destination.
- Flow type: `authentication`; authorization remains server-side in Greenhouse.

## Flow Brief

The person starts on the existing Greenhouse login, selects Efeonce ID, authenticates on the separate issuer,
returns with an OIDC identity assertion for the Greenhouse audience and is resolved to one current portal
principal. The browser never selects population or organization. Failure returns to a sanitized Greenhouse state
where all classic methods remain usable.

## Flow Map

1. `GET /login`: server exposes provider readiness/flag; no email or organization lookup occurs.
2. Select `Continuar con Efeonce ID`: NextAuth creates state/nonce/PKCE and redirects to the issuer.
3. Issuer authenticates through the method available to that person; authentication alone grants no portal role.
4. Issuer returns an authorization code; NextAuth exchanges it and validates `iss`, `aud`, signature, expiry,
   state, nonce and PKCE. An MCP access token is invalid for this flow.
5. Server resolves opaque `(environment, subject)` through exactly one population-specific reader:
   - external -> source link, external membership/binding, canonical organization, active `client_users`, `session_360`;
   - internal -> TASK-1836 enrollment/context, profile, principal, member, organization, workforce relationship, `session_360`.
6. `resolved`: Greenhouse emits its own NextAuth session and redirects to the authorized home.
7. Any closed deny outcome: no session is created; return to `/login` with one anti-enumeration error and all
   existing methods available.

## State Machine

| State | Entry | Exit | Required behavior |
|---|---|---|---|
| ready | `/login` with provider healthy | select method | no tenant discovery |
| redirecting | Efeonce ID selected | issuer or local error | prevent double redirect |
| authenticating | issuer receives request | callback or issuer denial | issuer owns its own cookie/session |
| validating | callback receives code | resolving or denied | validate protocol before claims |
| resolving | valid OIDC subject | session or denied | population explicit; zero/one/many handled |
| session_created | one eligible record | authorized home | portal session only |
| denied | unlinked/inactive/ambiguous/mismatch/revoked | choose another method | no enumeration; no identity write |
| degraded | issuer unavailable | retry/other method | classic methods unaffected |

## Population Routing

- Issuer class is never the population discriminator.
- Internal routing requires the TASK-1836 canonical enrollment/context; external routing requires TASK-1631
  source link and binding. A miss in one path does not try the other.
- A subject eligible for multiple portal principals is `ambiguous`; V1 does not choose one or accept a browser
  organization parameter.

## Interaction & Focus

- Initial focus follows the current `/login` contract.
- Selecting Efeonce ID makes only that action pending.
- Callback error focuses the inline error summary; subsequent Tab reaches the first available method.
- There is no modal, click-away behavior or new motion. Reduced motion preserves every terminal state.

## Data & Security Boundaries

- The issuer emits only the OIDC identity assertion required by the Greenhouse audience; no roles/org claims
  become authority.
- The portal stores no issuer access/refresh/id token in the browser-visible session.
- Callback is read-only for identity/access; only the declared attempt ledger may be written.
- Error URL/copy contains no email, raw subject, profile, organization, token or provider error.

## Failure Paths

| Failure | Public result | Diagnostic |
|---|---|---|
| discovery/issuer unavailable | temporary provider error | sanitized availability signal |
| token for MCP audience | generic sign-in failure | audience mismatch enum |
| no link/principal or inactive | same denied message | closed outcome, no PII |
| multiple principals/populations | same denied message | ambiguous/population mismatch |
| organization mismatch | same denied message | binding mismatch |
| revocation during session | session denied within defined SLA | authority type + latency only |

## Rollback Flow

1. Turn the Greenhouse provider flag OFF and redeploy.
2. Turn the issuer OIDC lane OFF if needed without changing MCP OAuth.
3. Revoke/invalidate Efeonce-ID-derived portal sessions according to the session contract.
4. Verify Microsoft, Google, credentials and magic link with positive controls.
5. Confirm identity links, principals and organizations were not modified by rollback.

## GVC Scenario Plan

- Scenario: `task1834-greenhouse-login-convergence`.
- Captures: ready, focus, pending, degraded and denied at 1440 and 390.
- Assertions: classic methods reachable, focus recovery, no raw identifiers and no page horizontal scroll.
- Runtime protocol and session canaries are separate from visual evidence and both are required.

## Acceptance Checklist

- [ ] Allow path ends in the same portal principal/claims as a preserved classic method.
- [ ] Every deny path creates no session and writes no identity/access record.
- [ ] Internal and external populations cannot fall through into each other.
- [ ] Provider failure and rollback leave all classic methods usable.
