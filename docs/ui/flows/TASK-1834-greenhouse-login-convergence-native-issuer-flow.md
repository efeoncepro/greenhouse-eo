# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (flow)

## Meta

- Status: `selected direction v2 — implementation pending`
- Owner task: `TASK-1834`
- Visual direction: `docs/ui/visual-directions/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Related wireframe: `docs/ui/wireframes/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Surfaces: Greenhouse `/login`, contextual `auth.efeonce.org` login, OIDC callback, recovery, context selection and
  authorized home.
- Flow type: direct first-party OIDC orchestration; authentication is centralized and product authorization remains
  server-side in Greenhouse.

## Flow brief

The person enters through Greenhouse, but an enabled `/login` is a nonvisual orchestrator rather than a login page.
It creates a protected OIDC transaction and redirects immediately to Efeonce ID. If an issuer session already
satisfies the required assurance, Efeonce ID returns immediately; otherwise it renders the single contextual login
screen. After authentication, first-party Greenhouse sign-in skips delegated-consent UI, returns an authorization
code, and lets Greenhouse validate the protocol and resolve current local authority before creating its own session.

## Main flow map

1. `GET /login`: Greenhouse resolves server-side rollout cohort, issuer readiness, recovery state and a safe return
   destination. It performs no anonymous email, organization or population discovery.
2. Routing branches before rendering:
   - enabled + healthy + normal entry → create `state`, `nonce` and PKCE, bind the registered Greenhouse client and
     exact callback, then return an immediate `302` to the issuer;
   - cohort not enabled → render only the current Greenhouse login;
   - explicit recovery → render a stable recovery surface that does not auto-redirect.
3. The issuer validates the transaction/client before using any product name, asset, sign-in mode or return route.
4. If the browser has a sufficient active Efeonce ID session, the issuer completes the first-party authorization
   without showing login or consent.
5. Otherwise the issuer renders `Greenhouse` / `Entra a Greenhouse` and the eligible authentication methods. A
   direct issuer visit without a transaction remains the neutral Efeonce ID account variant.
6. The person authenticates. Microsoft may render its own upstream authentication UI when Microsoft needs fresh
   credentials or assurance; that is an external identity-provider step, not another Efeonce/Greenhouse login.
7. For the registered `first_party_sign_in` client/transaction class, the issuer does not render delegated OAuth
   consent. MCP and third-party client consent remains unchanged.
8. The issuer returns an authorization code to the exact allowlisted callback.
9. Greenhouse exchanges the code and validates `iss`, `aud`, signature, expiry, state, nonce and PKCE. An MCP token
   or a token for another relying party is invalid.
10. The server resolves opaque `(environment, subject)` through one explicit population path and derives eligible
    Greenhouse contexts from canonical current authority.
11. Resolution outcome:
    - exactly one eligible context → create Greenhouse session and redirect to authorized home;
    - more than one eligible context → render a Greenhouse-owned selector and bind the chosen eligible context;
    - zero, mismatched or ambiguous population → create no session and return one closed denial.
12. Greenhouse records sanitized stage/outcome evidence without raw subject, email, token or organization in the URL.

## State machine

| State | Entry | Exit | Required behavior |
|---|---|---|---|
| `entry_routing` | Greenhouse `/login` | redirect / legacy / recovery | server-side only; no client flash or tenant discovery |
| `entry_legacy` | cohort not enabled | preserved method / denial | only the current Greenhouse login is visible |
| `entry_redirect` | enabled, healthy normal entry | issuer / recovery | immediate redirect; no actionable intermediate document |
| `issuer_session_fast_path` | valid transaction + sufficient session | callback | no login and no delegated-consent screen |
| `issuer_authentication` | authentication required | callback / cancel / deny | issuer owns methods; trusted Greenhouse context is visible |
| `issuer_method_pending` | method invoked | authenticated / retry / deny | method-specific honest status; no optimistic success |
| `returning` | callback receives code | validating / denied | no success claim before protocol validation |
| `validating` | code exchange completes | resolving / denied | validate protocol before claims or identity lookup |
| `resolving` | valid OIDC subject | one / many / zero | population explicit; no browser-selected organization |
| `context_required` | more than one eligible context | selected / cancel | list only server-authorized contexts |
| `session_created` | one chosen eligible context | authorized home | Greenhouse session only; product audience/context |
| `denied` | closed protocol/identity/authority outcome | retry / recovery | no enumeration and no identity write |
| `recovery` | explicit marker or orchestration failure | retry / governed fallback | stable route; bypass automatic redirect to break loops |

## Population and context routing

- Issuer class and authentication method are never population discriminators.
- Internal routing requires the canonical TASK-1836 enrollment/context path. External routing requires the
  TASK-1631 source link, binding and active portal principal path.
- A miss in one population never falls through to another.
- A browser-provided email, organization ID, context ID or application label never selects authority.
- The resolver may return `0 | 1 | many` eligible contexts; `many` becomes a Greenhouse selector, not an arbitrary
  denial or first-row default.
- The selected context is revalidated server-side before session issuance.

## Interaction and focus

- Normal enabled entry has no Greenhouse focus target because no intermediate page renders.
- The issuer focuses the contextual H1 according to the existing TASK-1835 page contract.
- Only the invoked authentication method enters pending state.
- `Volver a Greenhouse` targets a registered safe return/recovery route; it does not rely on browser history.
- Callback denial focuses the error summary. Multicontext focuses its heading, then the first eligible option.
- Reduced motion preserves every terminal state and never delays protocol navigation.

## Data and security boundaries

- Registered server-side client/transaction metadata is the only source for application name, brand, first-party
  mode and return destination.
- The entry uses Authorization Code + PKCE and an exact registered redirect URI; `state` and `nonce` are single-use
  and server-bound. No open redirect or raw `returnTo` is accepted.
- A pilot/deep link may select only a signed or server-resolved rollout lane. It cannot carry raw organization,
  email, product label or authority selectors.
- The issuer emits only the identity assertion required by the Greenhouse audience; no role/org claim becomes
  Greenhouse authority.
- Greenhouse stores no issuer access/refresh/id token in its browser-visible session.
- Callback identity/access resolution is read-only; only declared attempt/session ledgers may be written.
- Errors and URLs contain no email, raw subject, profile, principal, organization, token or upstream provider error.
- Greenhouse authorization revalidates revocation/expiry under the task SLA after session creation.

## Failure paths

| Failure | Public result | Recovery / diagnostic boundary |
|---|---|---|
| orchestration unavailable before redirect | stable Greenhouse access error/recovery | retry or governed fallback; no redirect loop |
| failure after redirect | closed issuer or callback error | safe registered recovery route |
| unknown/untrusted client context | generic issuer error without product branding | no browser-supplied fallback branding |
| MCP/other audience token | generic sign-in failure | audience mismatch enum |
| no link, inactive principal or zero contexts | same closed denial | no PII; support/recovery |
| multiple contexts | Greenhouse selector | choose an eligible context; never first-row default |
| multiple populations or binding mismatch | same closed denial | ambiguous/mismatch enum |
| revocation during session | scoped Greenhouse session ends within SLA | authority type and latency only |
| recovery route revisited | recovery remains stable | never auto-redirect until explicit retry |

## Migration and rollback flow

1. Dark-deploy OIDC client, callback validation, resolver, issuer RP context and first-party mode with every visible
   flag OFF.
2. Enable direct `/login` orchestration for an internal allowlist. Non-enabled cohorts continue to see only the
   current Greenhouse login; recovery uses a separate no-redirect route/state.
3. Exercise the synthetic external canary, then a separately consented real-customer pilot.
4. Expand the direct cohort only after upstream/recovery, invitation, credential, assurance and logout gates.
5. Measure routing, issuer method, callback, recovery and failure outcomes before retiring current methods.
6. Rollback: disable direct orchestration for the affected cohort, restore the current Greenhouse login, revoke or
   invalidate only Efeonce-ID-derived Greenhouse sessions as the contract requires, and leave identity links and
   authority intact.

Permanent removal of legacy methods or ecosystem-wide cutover requires later explicit evidence and decision. The
selected cohort flow itself is direct; it never uses a visible `Continuar` vestibule.

## Evidence and measurements

- Funnel stages: Greenhouse entry routed → issuer session reused or login rendered → method completed → callback
  validated → context resolved → Greenhouse session created.
- Segment by controlled cohort, population, method class, result and latency; never emit raw identifiers.
- Measure unexpected legacy-form render, intermediate HTML/flash, issuer return/cancel, recovery-loop prevention,
  zero/multiple contexts and rollback latency.
- GVC: legacy, recovery, issuer direct/contextual, pending, denied and multicontext at 1440 and 390, including
  keyboard and reduced motion.
- Protocol/session canaries and GVC are independent evidence and both are required.

## Acceptance checklist

- [ ] Enabled normal entry reaches issuer/callback without an intermediate Greenhouse login document or form flash.
- [ ] A sufficient issuer session can complete the flow without visible login or consent.
- [ ] First-party sign-in omits delegated-consent UI; MCP/third-party consent is unchanged.
- [ ] Allow path ends in the same canonical Greenhouse principal/context as a preserved current method.
- [ ] Application context cannot be forged from browser input and direct issuer login remains neutral.
- [ ] Every deny path creates no Greenhouse session and writes no identity/access authority.
- [ ] Internal and external populations cannot fall through into each other.
- [ ] Multiple eligible contexts require an explicit, server-revalidated Greenhouse choice.
- [ ] Recovery and rollback preserve a usable path without a redirect loop.

## Delta 2026-09-09 — destinos de EPIC-046

TASK-1852 aporta matriz de cohorte y casos de retorno desde email/in-app/Teamsbot. Conservar destino
interno permitido de servicio/solicitud/edición Insights a través de login y selección 0/1/múltiples
contextos. El selector sólo presenta opciones autorizadas; otra cuenta, revocación o retirada no abre
un objeto sustituto ni filtra título. GET/scanner no muta. Canaries técnicos y piloto cliente se separan.
El login vigente comprobado permite trabajo independiente; el nuevo camino espera gates de TASK-1834.
