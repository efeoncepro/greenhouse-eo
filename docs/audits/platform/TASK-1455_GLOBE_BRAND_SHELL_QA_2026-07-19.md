# QA Release Audit — TASK-1455 Globe brand shell

## Verdict

PASS

Closure state: complete for the approved internal non-production shell

## Scope and risk

- Reviewed the Globe server-rendered brand shell, callback redirect, authenticated/session/recovery states, static brand assets, CSP, Cloud Build/Run rollout and Greenhouse GVC contract.
- Highest risks were OAuth/session regression, token leakage into HTML, misleading product claims, responsive overflow and an apparently complete Studio with no real capabilities.
- Production, external clients, creative providers, projects/runs, persistence and asset storage were intentionally out of scope and remain absent.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Globe typecheck/tests/build | PASS | `pnpm check && pnpm build`; 5 Studio tests cover runtime guard, launch leak check, allow/session/revalidation/revocation and client/role denial. |
| Live rollout | PASS | Cloud Run `globe-studio-internal-00006-445`, 100% traffic, min 0/max 1; build `fd79b83e-eafc-4fb1-93c9-ddf6309c4c17`; digest `sha256:7b213f7d…c8f4a`. |
| OAuth/session | PASS | Successful callback returns `303 /studio`; live session and revalidation 200; only `globe.studio.access`; correlation preserved. |
| Deny/revoke | PASS | Client tenant callback 403/session 401/no session; TASK-1454 live revocation remains valid and focal Studio test now verifies expired HTML 401 with no secret. |
| Browser leak/CSP | PASS | Token, OAuth secret, bypass secret and raw upstream errors are absent from rendered HTML; CSP uses per-response nonce and local assets. |
| GVC premium | PASS | `.captures/2026-07-19T11-33-05_globe-internal-launch`: desktop 1440×1000 + mobile 390×844, keyboard/reduced motion/axe/layout/runtime/performance/enterprise rubric all pass. |
| Visual quality | PASS | Durable baselines under `scripts/frontend/baselines/globe.internal-launch/`; scorecard average 4.73, floor 4.5. |
| Overflow | PASS | `scrollWidth = clientWidth` at 1440 and 390. |
| UI/task contracts | PASS | task lint, readiness, full visual gate and UI quality gate pass. |
| Scope honesty | PASS | UI says internal pilot/foundation and explicitly defers projects/runs; no fake controls or provider claims. |

## Residual notes

- The Greenhouse Preview `/home` emitted a React hydration error during OAuth transit; the Globe origin produced zero console/page errors. It is unrelated to this shell and is not hidden as Globe evidence.
- GVC now creates its disposable Playwright context with `bypassCSP: true` so its own secret-mask CSS and axe injection can inspect strict-CSP targets. This does not weaken the deployed response policy; the live CSP remains unchanged.
- TASK-1454 broader-release conditions still apply: rotate the pre-existing operations DB credential in a separate checkpoint, replace vendored SDK tarballs, minimize callback query logging and complete GitHub WIF/standing-Owner hardening.

## Final call

Globe now exists as a reachable, branded, governed internal product foundation. TASK-1455 is complete without implying that the production workbench or creative execution plane exists.
