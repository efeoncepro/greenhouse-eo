# TASK-1834 — Greenhouse Login Convergence on Efeonce ID (wireframe)

## Meta

- Status: `selected direction v2 — first-fold pending`
- Owner task: `TASK-1834`
- Visual direction: `docs/ui/visual-directions/TASK-1834-greenhouse-login-convergence-native-issuer.md`
- Visual direction mode: `repo-native-benchmark`
- Durable sources: current `src/views/Login.tsx`, auth-server person pages and validated OIDC client context.
- UI ready target: `no` until implementation mapping, runtime baselines, first fold, GVC and scorecard pass.
- Primitive decision: `reuse/extend` — issuer auth composition and trusted OAuth `clientContext`; no new shell.

## Brief

Greenhouse remains the product entry and authorization destination, but it does not add a visible screen before
authentication. For an enabled cohort, `GET /login` creates the protected first-party OIDC transaction and returns
an immediate server redirect. The only visible authentication screen is hosted by Efeonce ID and identifies the
destination as Greenhouse. A person with a sufficient active Efeonce ID session may return without seeing even that
screen. A legacy cohort sees only the current Greenhouse login; a recovery request sees a stable recovery surface.

## Entry-routing contract

| Server-side condition | Browser result | Visible login surfaces |
|---|---|---:|
| New flow enabled, issuer healthy, no recovery marker | immediate `302` into the registered authorization transaction | `0` before issuer |
| New flow enabled and sufficient Efeonce ID session exists | issuer completes silently and returns to callback | `0` |
| New flow enabled and authentication is required | contextual Efeonce ID login | `1` |
| Cohort not enabled | current Greenhouse login only | `1` |
| Recovery route/state | stable Greenhouse recovery, without automatic redirect | `1` |
| Issuer/orchestration unavailable before cutover | governed fallback or recovery | `1`; never a loop |

The browser never renders a Greenhouse `Continuar` vestibule for the enabled flow. Cohort and recovery decisions are
server-side; a client-rendered flash of the legacy form is a defect.

## Desktop target — contextual Efeonce ID, 1440x900

```text
┌────────────────────────────────── auth shell ──────────────────────────────────┐
│ Efeonce ID                                                                     │
│                                                                                │
│ Greenhouse                                                                     │
│                                                                                │
│ Entra a Greenhouse                                                             │
│ Elige cómo quieres verificar tu identidad.                                     │
│                                                                                │
│ [ Continuar con Microsoft ]                                                    │
│ [ Usar mi passkey ]                                                            │
│ [ Recibir un enlace por correo ]                                               │
│                                                                                │
│ Identidad protegida por Efeonce ID                                             │
│ Volver a Greenhouse                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

- The application name and presentation profile come from the validated registered relying party/transaction.
- `Greenhouse` is destination context, not an authentication method or a browser-supplied organization.
- The issuer owns authentication; Greenhouse resolves product authority after the callback.
- A direct issuer visit without a relying-party transaction retains the neutral Efeonce ID account variant.
- First-party Greenhouse sign-in does not render delegated OAuth consent.

## Mobile target — 390x844

```text
┌──────────────────────────────────────┐
│ Efeonce ID                           │
│                                      │
│ Greenhouse                           │
│ Entra a Greenhouse                   │
│ Elige cómo quieres verificar tu      │
│ identidad.                           │
│                                      │
│ [ Continuar con Microsoft ]          │
│ [ Usar mi passkey ]                  │
│ [ Recibir un enlace por correo ]     │
│                                      │
│ Identidad protegida por Efeonce ID   │
│ Volver a Greenhouse                  │
└──────────────────────────────────────┘
```

- One column and one semantic task; controls never shrink below the canonical touch target.
- Context remains visible before the method choices and is not repeated as promotional chrome.
- Labels may wrap without truncating the method or causing horizontal scroll.
- Error and status headings precede actions in DOM and focus order.

## Action hierarchy

- Primary choices: the eligible issuer authentication methods.
- Trust cue: `Identidad protegida por Efeonce ID`.
- Safe exit: `Volver a Greenhouse` using a registered server-derived return route.
- Context resolution: choose one eligible Greenhouse space only after authentication, and only if more than one
  exists.
- Pending: only the invoked method is marked busy; other controls follow the canonical method policy.

## Layout and implementation mapping

| Region / behavior | Purpose | Decision | Source / authority |
|---|---|---|---|
| Greenhouse `/login` entry | Create transaction and redirect enabled cohorts | extend | server-side cohort/readiness/recovery policy |
| Legacy/recovery Greenhouse view | Preserve rollback and break loops | reuse/extend | current login composition + explicit recovery contract |
| Issuer auth shell | Render the sole visible new-flow login | reuse | TASK-1835 person-page composition |
| Issuer product context | Explain the Greenhouse destination | extend | validated RP presentation profile |
| Issuer methods | Verify the person | reuse | auth-server method and assurance policy |
| First-party mode | Suppress delegated-consent UI for product sign-in | extend | registered client/transaction class, never query input |
| Error summary | Closed, actionable recovery | reuse | sanitized outcome enum |
| Context selector | Resolve more than one eligible Greenhouse context | reuse/extend | canonical Greenhouse resolver result |

Candidate implementation boundaries:

- `src/views/Login.tsx` remains the legacy/recovery composition; it is not the first fold for enabled cohorts.
- The Greenhouse server entry owns cohort selection, transaction creation and the no-flash redirect.
- `src/lib/auth-server/persons/pages.ts` extends the existing TASK-1835 login with trusted RP presentation.
- Existing OAuth `clientContext` is extended with a typed, server-derived presentation/mode DTO.

No application name, logo, organization, sign-in mode or return destination is trusted from browser-supplied
labels. The UI consumes a server-derived DTO and never queries identity stores directly.

## State and copy inventory

| State | Visible result | Recovery |
|---|---|---|
| `entry_legacy` | current Greenhouse login only | current configured methods |
| `entry_redirect` | no HTML first fold; immediate server redirect | stable recovery route on failure |
| `issuer_session_fast_path` | no login UI; immediate protected return | callback denial if validation fails |
| `issuer_authentication` | contextual `Entra a Greenhouse` + eligible methods | safe return to Greenhouse |
| `issuer_method_pending` | invoked method pending/status state | retry or choose another eligible method |
| `issuer_direct` | neutral Efeonce ID account login | issuer recovery/account path |
| `returning` | Greenhouse validates protocol and authority | closed error on failure |
| `one_context` | authorized home | local product logout |
| `many_contexts` | `Elige el espacio que quieres abrir` | choose one eligible context |
| `zero_contexts` | one non-enumerating denial | recovery or support |
| `recovery` | stable Greenhouse recovery with no auto-redirect | retry new flow or use governed fallback |

Reusable copy lives in `src/lib/copy/*`; raw provider errors and identity attributes never belong in the view.

## Accessibility contract

- One H1 and stable landmarks on every actually rendered surface.
- Visible labels and accessible names match.
- Pending uses text plus `aria-busy`; it never depends on motion alone.
- Callback errors and context-required states receive focus at their summary/heading.
- Keyboard order follows visual order and all eligible methods remain reachable.
- Reduced motion preserves the same outcome; no timer controls redirect or focus.
- A server redirect produces no focusable intermediate document and no screen-reader announcement of a screen that
  immediately disappears.

## GVC scenario plan

- Scenario: `scripts/frontend/scenarios/task1834-greenhouse-login-convergence.scenario.ts`.
- Routes: enabled Greenhouse `/login`; legacy cohort `/login`; recovery route; direct issuer `/login`; issuer login
  with a valid Greenhouse transaction.
- Viewports: `1440x900`, `390x844`; quality profile `premium`.
- Captures: legacy, recovery, issuer direct/contextual, method pending, callback denied and zero/one/multiple contexts.
- Navigation assertion: enabled `/login` reaches the issuer or callback without intermediate Greenhouse HTML, form
  flash or actionable `Continuar` screen.
- Assertions: trusted destination continuity, no delegated-consent screen in first-party sign-in, no raw error/PII,
  no double submit, correct focus, reduced-motion equivalence and `scrollWidth === clientWidth`.
- Runtime protocol/session canaries remain separate from visual evidence; both are required.

## Design decision log

- Selected v2: direct, contextual first-party sign-in; one visible authentication screen at most.
- Superseded v1: visible Greenhouse `Continuar` handoff vestibule.
- Rejected: Efeonce ID as a peer provider next to Microsoft/Google.
- Rejected: embedding the issuer in an iframe/widget.
- Reuse / extend / new primitive: `reuse/extend`; no new primitive approved yet.
- Open execution risk: exact primitive/token mapping requires first-fold lookup; `UI ready: no`.

## Acceptance checklist

- [ ] Runtime baselines and exact primitives are confirmed before JSX changes.
- [ ] Enabled `/login` produces no intermediate Greenhouse login screen or legacy-form flash.
- [ ] The issuer context is derived from a validated relying party and direct login remains neutral.
- [ ] First-party Greenhouse sign-in omits delegated-consent UI without changing MCP/third-party consent.
- [ ] Legacy cohorts see only the legacy screen; recovery cannot enter an automatic redirect loop.
- [ ] Desktop/mobile, keyboard, reduced-motion, zoom and scroll-width evidence pass.
- [ ] Errors and context selection remain closed, anti-enumeration and recoverable.
