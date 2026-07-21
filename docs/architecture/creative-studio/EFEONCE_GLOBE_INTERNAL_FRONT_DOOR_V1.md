# Efeonce Globe — Internal Front Door V1

- Decision: SPEC-009
- Status: Accepted and implemented — applied + live-verified internal-only (TASK-1507)
- Validated: 2026-07-21 (live: `http://globe.efeoncepro.com/` → `301`; `https://globe.efeoncepro.com/` → `200` with valid TLS over HTTP/2 serving the real Globe shell; SSO federation smoke `human_federation_ok` before and after the ingress hardening)
- Confidence: High for the ALB topology, the `globe-api-internal` boundary, the cutover ordering and the cost model; the ingress value was applied out-of-band by this slice and is governed by IaC since TASK-1508, which also corrected the service-level `maxScale` ceiling to 3 and put both ceiling levels under Terraform
- Reversibility: Two-way and **sliced** — ingress, `GLOBE_PUBLIC_BASE_URL`, DNS and the ALB revert in an ordered sequence (ingress → env var → DNS → ALB), stopping at the first slice that resolves; recovering access does not require dismantling the load balancer
- Owners: Efeonce Globe platform (Terraform, Cloud Run runtime, smokes) + Greenhouse control plane (OAuth broker + redirect allowlist primitive, governance). Out-of-band: DNS `efeoncepro.com` on HostGator
- Related: `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (ADR-004 — the decision this implements), `GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001 — human vs workload federation), `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007), `PLATFORM_FOUNDATION_V1.md`, `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` (§ Front door internal-only — the operable procedure), `docs/manual-de-uso/creative-studio/operar-front-door-globe.md` (manual — cómo operarlo, verificarlo y diagnosticarlo), `docs/documentation/creative-studio/dominio-interno-globe.md` (documentación funcional — qué es el dominio interno en lenguaje simple), `TASK-1507`, `TASK-1508` (Cloud Run services into Terraform), `TASK-1480` (external readiness gate), `TASK-1505` (Producer surface)

## Decision

Efeonce Globe gets an **internal-only front door**: `globe.efeoncepro.com` terminates on a **Global External
Application Load Balancer** with a Google-managed certificate and an HTTP→HTTPS redirect, and forwards through a
**serverless network endpoint group** in `southamerica-west1` to the Cloud Run service `globe-studio-internal`. This
is the implementation of ADR-004 item 4, delivered by its named successor task with no change to the ADR's decision.

The front door is **additive network plumbing**. It creates no new runtime, no new trust boundary and no new identity:
the SSO shell keeps authenticating by its own session cookie against the Greenhouse broker (ADR-001), the private API
keeps its own perimeter, and the Cloud Run services were outside this Terraform state when this slice shipped —
TASK-1508 later adopted them into the same root module; the NEG still targets the web service by name, not by resource
reference. What changed for the runtime is exactly one value — the public base URL the shell announces as its OAuth
callback — plus the service's ingress, which now only accepts traffic from the load balancer.

An internal-only domain is **not** Production, **not** HA and **not** external client access. It resolves a stable
hostname for internal humans ahead of the TASK-1505 rollout; the Production/external gate stays with TASK-1480.

## System topology

~~~mermaid
flowchart TB
  B[Browser interno<br/>sesión SSO de Globe]
  subgraph GFE[Google Front End — global · PREMIUM · EXTERNAL_MANAGED]
    FR80[":80 · globe-studio-front-door-http"] --> HP[target http proxy] --> UMR[url map redirect<br/>301 MOVED_PERMANENTLY_DEFAULT<br/>strip_query = false]
    FR443[":443 · globe-studio-front-door-https"] --> SP[target https proxy<br/>managed cert] --> UM[url map globe-studio-front-door]
    UM --> BS[backend service<br/>enable_cdn = false]
    BS --> NEG[serverless NEG<br/>southamerica-west1]
  end
  B -->|http| FR80
  UMR -.->|redirige a https| FR443
  B -->|https| FR443
  NEG --> CR[Cloud Run globe-studio-internal<br/>ingress internal-and-cloud-load-balancing<br/>SA web_runtime]
  API[Cloud Run globe-api-internal<br/>IAM-private · anónimo 403]
  CR -->|ID token · federación workload| API
~~~

`globe-api-internal` is drawn deliberately **outside** the front door: it is reachable only service-to-service and
never appears in the NEG, in the url map or behind any custom domain.

## Why a serverless NEG and not a Cloud Run domain mapping

Cloud Run's direct domain mapping is the shorter path on paper and was rejected on two independent grounds, both of
which ADR-004 recorded and this implementation confirmed:

1. **Maturity and region coverage.** Domain mappings are Preview and region-limited; `southamerica-west1` — the region
   where both Globe services run — is not in their supported list. A GA front door for that region has to be the ALB.
2. **It buys the perimeter, not just the name.** Terminating on the ALB is what makes
   `--ingress internal-and-cloud-load-balancing` possible: with a domain mapping the service must stay reachable
   directly. The load balancer is therefore the enabling condition for closing the `ingress=all` soft spot ADR-004
   flagged, not an incidental cost. This is why the fixed monthly cost is worth paying for an internal pilot.

The trade-off accepted is a fixed forwarding-rule charge (see [Cost model](#cost-model)) and one more layer to reason
about during incidents. It is bounded: the load balancer holds no state and no policy beyond host→backend routing.

## The ALB in Terraform

**Ten** resources in `infra/terraform/front_door.tf` (Globe repo), applied with OpenTofu v1.12.4 and provider
`hashicorp/google` 6.50.0. The plan read `11 to add, 0 to change, 0 to destroy`: ten of those additions are the
resources tabulated below and the eleventh is the enablement of `compute.googleapis.com`, which lives in `locals.tf`
and **not** in `front_door.tf`. The plan carried 65 no-op resources, **zero** destroy/replace and **zero** Cloud Run
resources in the diff (verified over the plan JSON).

| Resource | Name in GCP | Architectural note |
| --- | --- | --- |
| `google_compute_global_address.front_door` | `globe-studio-front-door-ip` | `EXTERNAL`, `IPV4`. Assigned `8.233.189.79`. |
| `google_compute_region_network_endpoint_group.studio_web` | `globe-studio-internal-neg` | `SERVERLESS`, `southamerica-west1`. `cloud_run.service` is the **string literal** `"globe-studio-internal"` — referencing the service as a resource would pull it into this file's graph. The services are governed by their own Terraform resources since TASK-1508; the literal is kept on purpose so a front-door plan never touches them. |
| `google_compute_backend_service.studio_web` | `globe-studio-front-door-backend` | `EXTERNAL_MANAGED`, `enable_cdn = false`. |
| `google_compute_url_map.front_door` | `globe-studio-front-door` | One host, one backend, no path rules. |
| `google_compute_managed_ssl_certificate.front_door` | `globe-studio-front-door-cert` | `lifecycle { create_before_destroy = true }` — a managed certificate is not editable in place; changing its domain list forces replacement. |
| `google_compute_target_https_proxy.front_door` | `globe-studio-front-door-https-proxy` | TLS termination. |
| `google_compute_global_forwarding_rule.front_door_https` | `globe-studio-front-door-https` | `:443`, `PREMIUM`, `EXTERNAL_MANAGED`. |
| `google_compute_url_map.front_door_http_redirect` | `globe-studio-front-door-http-redirect` | `https_redirect = true`, `MOVED_PERMANENTLY_DEFAULT`, `strip_query = false`. Carries an explicit `depends_on` (below). |
| `google_compute_target_http_proxy.front_door_http_redirect` | `globe-studio-front-door-http-proxy` | Serves only the redirect; `:80` never reaches the backend. |
| `google_compute_global_forwarding_rule.front_door_http` | `globe-studio-front-door-http` | `:80`, `PREMIUM`, `EXTERNAL_MANAGED`. |

Supporting files in the same apply: `locals.tf` (adds `compute.googleapis.com` to `local.enabled_services` — it was
**not** enabled on the project, verified by `PERMISSION_DENIED` before the change), `variables.tf` (`front_door_domain`,
default `globe.efeoncepro.com`) and `outputs.tf` (`front_door_ip_address`, `front_door_domain`,
`front_door_certificate_name`). The DNS `A` record lives **outside** Terraform, on HostGator: a clean plan never proves
the name resolves.

**CDN is off on purpose.** The front door serves an SSO shell whose responses are per-session; caching them at the edge
would be a correctness bug, not an optimization. `enable_cdn = false` is a contract, not a default left unset.

**Graph-root rule (derived from a real partial apply).** The first apply created 8 of the 11 planned additions and
failed on the three of the HTTP-redirect lane with `SERVICE_DISABLED` on `compute.googleapis.com`: the API was enabled in that same
apply and had not propagated. `google_compute_url_map.front_door_http_redirect` was the only graph root **without an
implicit edge** to the enablement — the HTTPS lane reaches it transitively (forwarding rule → proxy → url map → backend
service → NEG, and the NEG does depend on `google_project_service`). The race was fixed **in the HCL** with an explicit
`depends_on`, not by blind retry. The general rule: in a project where an API is enabled in the same apply that consumes
it, every resource that references no other resource of that service needs an explicit `depends_on` to its
`google_project_service`. The defect is deterministic on a fresh project and a second apply *hides* it rather than
fixing it. Procedure and commands: runbook [§ Front door internal-only](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#front-door-internal-only-task-1507).

## Hard boundary: `globe-api-internal` is not behind the front door

This is the invariant most likely to be eroded by a future convenience, so it is stated as a boundary and not as a
preference. The private API never becomes browser-reachable:

- **Never in the NEG, never a custom domain.** The NEG points at `globe-studio-internal` only. Domain mappings in the
  project: **0**, before and after.
- **Perimeter unchanged.** Anonymous access to `globe-api-internal` returned `403` before and after the cutover; the
  service stays IAM-private with in-app ID-token verification on top.
- **Its ingress was not touched, and must not be hardened by analogy with the web service.** `globe-api-internal` stays
  on **`ingress=all`** deliberately: its perimeter is **exclusively IAM plus in-app verification of the ID token**, not
  ingress. Its caller is Greenhouse running on Vercel, which reaches it over the public internet and not from a VPC, so
  restricting ingress to internal/load-balancer traffic would cut the workload federation. The web service and the API
  close their perimeter by different instruments on purpose; copying one onto the other breaks the lane that works.
- **Audience is derived from `run.app`, never from the browser domain.** `GLOBE_API_EXPECTED_AUDIENCE` holds the two
  `run.app` URL formats and **never** `globe.efeoncepro.com`. Its own `GLOBE_PUBLIC_BASE_URL` is the placeholder
  `https://globe-api-internal.invalid` — a value chosen so that any code path that tries to build a public URL for the
  API fails loudly instead of quietly minting one.

Publishing a browser hostname and accepting a token audience are two different authorities. Conflating them would let a
public name become a token audience, which is how a private workload lane silently turns into a public one.

## Cutover contract — allowlist strictly before env var

The published sequence in the original spec was "change `GLOBE_PUBLIC_BASE_URL`, then extend the redirect allowlist".
It was **inverted deliberately**, and the inversion is the contract, not a preference:

> Adding a redirect URI is **inert** until something uses it. Flipping `GLOBE_PUBLIC_BASE_URL` first opens a window in
> which `/auth/start` announces a callback that the broker does not yet permit — and SSO is broken for the duration of
> that window.

The asymmetry is the whole argument: one order has a strictly additive, unobservable first step; the other has a
first step that breaks login. The executed order was therefore:

1. **ALB** — `tofu plan` read (zero destroy/replace, zero Cloud Run in the diff) → `tofu apply`; take
   `front_door_ip_address`.
2. **DNS** — `A` record `globe.efeoncepro.com` → `8.233.189.79` on HostGator (out-of-band).
3. **Additive allowlist** — add `https://globe.efeoncepro.com/auth/callback` **without** removing the `run.app` URI.
4. **Three-way verification against the broker, before touching the runtime** — the broker validates `redirect_uri`
   *before* it looks at the session, so `GET /api/auth/sister-platforms/authorize` discriminates without a login.
   Before: domain → `400 invalid_redirect_uri`, `run.app` → `303`. After: domain → `303`, `run.app` → `303`, and the
   wildcard `https://*.efeoncepro.com/auth/callback` still → `400 invalid_redirect_uri` (the allowlist is exact; the
   broker rejects wildcards by design).
5. **Runtime cutover** — `GLOBE_PUBLIC_BASE_URL` → `https://globe.efeoncepro.com` with `--update-env-vars` (never
   `--set-env-vars`, which is destructive). The value is load-bearing: `apps/studio-web/src/app.ts` builds the callback
   as `new URL('/auth/callback', config.publicBaseUrl)` in `/auth/start`. Produced revision
   `globe-studio-internal-00018-zkx` at 100% traffic.
6. **SSO smoke against the domain** — `human_federation_ok`.
7. **Ingress hardening** — `--ingress internal-and-cloud-load-balancing`. Direct `run.app` access → `404` (blocked);
   the domain through the ALB → `200`.
8. **Re-smoke after hardening** — same command, no env var changed: `human_federation_ok` again.

Steps 3–4 are a Greenhouse write; steps 5 and 7 are Globe runtime. Keeping them ordered across two repositories is
precisely why this sequence is documented as a contract instead of being left to the operator's judgement.

### The redirect allowlist is a primitive, not a script

ADR-004's open question — how the allowlist is administered — resolved as: **by seed script**, with no admin route for
OAuth clients. That mechanism does not survive a cutover. The existing `scripts/seed-globe-internal-pilot.ts` passes
`redirectUris: [uri]` (it **replaces** the array, deleting the `run.app` rollback path) and `rotateToken: true` (it
**rotates** the client secret, breaking live SSO). Using it for a cutover is a double outage.

TASK-1507 therefore added a canonical primitive in Greenhouse,
`updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`):

- **Additive/subtractive**, one transaction, `SELECT ... FOR UPDATE`, touching **exclusively** the `redirect_uris`
  column — never `policy_json`, `allowed_scopes`, TTLs, `client_status` or the consumer token.
- **One validation authority.** It reuses `normalizeRedirectUris`: no wildcards, HTTPS required except for localhost,
  never empty.
- **Idempotent on add** (`changed=false` when the URI is already present) and **loud on a spurious remove**: removing a
  URI that is not in the allowlist fails with `invalid_redirect_uri` instead of a silent no-op. During a cutover a
  silent no-op over a stale view is exactly how the wrong callback survives.
- **Never creates.** An unknown client is `404 invalid_client`.
- Returns `{ client, previousRedirectUris, redirectUris, changed }` — the previous state is part of the result so the
  operator can record what was replaced.

The entry point is the generic CLI `pnpm sister-platform:redirect` (`scripts/sister-platform-oauth-redirect-uris.ts`,
serves `globe` and `kortex`; `--client`, `--add`, `--remove`, and **dry-run unless `--apply`**). The logic lives in the
broker and not in the script **on purpose**: a route, an MCP tool or Nexa can operate the same change through the same
primitive, so the Full API Parity path stays open instead of being closed by a CLI-only capability. Covered by
`src/lib/sister-platforms/oauth-redirect-uris.test.ts` (11 cases).

Resulting state of client `globe` in `greenhouse_core.sister_platform_oauth_clients`: from 1 URI to 2. The `run.app`
callback is **kept on purpose** — it is the documented rollback path, and with ingress hardened that origin is no
longer browser-reachable anyway, so a code sent there goes nowhere. Removing it would force a second database write
under pressure during a rollback.

## Federation smoke as the acceptance instrument

The front door's acceptance criterion is not "the domain returns 200" — it is "the real login still completes". The
new `efeonce-globe/scripts/smoke-human-federation.mjs` is the human-lane counterpart of the existing
`smoke-private-api.mjs` (workload lane, service account + ID token) and walks all three legs: `/auth/start` → `303` to
the Greenhouse authorize; authorize with a Greenhouse session → `303` back to the `redirect_uri` with a `code`;
callback with Globe's transaction cookie → `303` to `/studio` with a session cookie. It asserts that the announced
`redirect_uri` belongs to the origin under test, PKCE `S256` with `code_challenge`, `state` and `nonce` present,
`state` echoed, that the authorize never redirects off-origin, and that the callback issues a cookie and lands on
`/studio`. Secrets come from the environment and are never printed; the Vercel bypass is sent **only** to the
Greenhouse origin.

**Calibration is part of the method.** The smoke was run first against the `run.app` origin **before** the cutover and
passed. That is what makes a later failure accuse the cutover instead of the instrument. An uncalibrated smoke is not
evidence.

`GLOBE_SMOKE_RESOLVE=host:ip` pins resolution for that process only (the in-process equivalent of `curl --resolve`),
so a freshly published front door can be smoked from a machine holding a negative DNS cache. It weakens no assertion:
SNI, certificate CN, `Host` header and `redirect_uri` all still travel with the real hostname; only the socket's
destination address is decided.

## Managed certificate lifecycle

The certificate provisions **after** DNS, never before, so `PROVISIONING` at apply time is the expected state, not a
failure. The intermediate state observed here was `managed.domainStatus = FAILED_NOT_VISIBLE`, which is the **stored
result of Google's first validation attempt** — the one that ran before the `A` record existed. The field describes the
past, not the present; Google retries on its own and the state reached `ACTIVE` ~28 minutes after the record was
created, with no intervention and no HCL change. Recreating the certificate out of impatience only restarts the clock.

Certificate served at close: `subject CN=globe.efeoncepro.com`, `issuer C=US, O=Google Trust Services, CN=WR3`,
`notBefore Jul 21 19:42:23 2026 GMT`, `notAfter Oct 19 20:35:36 2026 GMT`.

The eight-check discard list that separates "wait" from "something is broken" (authoritative NS, public `A` on two
resolvers, no `AAAA`, no competing `CNAME`, no `CAA`, cert attached to the proxy, forwarding rule on the right IP, ALB
already answering by hostname) and the local negative-cache trap (`SOA minimum` TTL 86400 on `efeoncepro.com`; `curl`
returning `status=000` with an empty `remote_ip` is a resolution failure, not a front-door failure) live in the
runbook — this spec records only that the diagnosis exists and that `FAILED_NOT_VISIBLE` is not a configuration error.

## Cost model

Source: **Cloud Billing Catalog API**, service "Networking" `E505-1604-58F8`, prices effective **2026-07-21**, USD.

| SKU | Price | Application |
| --- | --- | --- |
| Cloud Load Balancer Forwarding Rule Minimum Global | US$0.025/hour → **~US$18.25/month** | Covers the first 5 global forwarding rules; this front door uses 2 (`:443` and `:80`). |
| Cloud Load Balancer Forwarding Rule Additional Global | US$0.010/hour | Not applicable today (2 of 5). |
| Global External ALB — Inbound Data Processing, Santiago (`southamerica-west1`) | US$0.012/GiB | Per traffic served. |
| Global External ALB — Outbound Data Processing, Santiago (`southamerica-west1`) | US$0.012/GiB | Per traffic served. |
| Google-managed certificate | no charge | — |

**Estimated fixed total: ~US$18.25/month + ~US$0.024 per GiB served** (inbound + outbound). The fixed component is why
ADR-004 refused to ship the domain eagerly: it starts accruing the moment the forwarding rules exist, whether or not a
human surface needs the hostname.

**Rollback cost trap:** destroying the load balancer while leaving the global IP **reserved and unattached** starts
billing it as an idle static IP. Destroy the address together with the rest.

## Rollback by slice

Verified as a path, **not executed**. It is a sequence, not a menu: the slices are executed in order, cheapest and
fastest first, and you stop at the first one that resolves; recovering access never requires dismantling the load
balancer.

| Order | Slice | Action | Window |
| --- | --- | --- | --- |
| 1 | **Ingress** (precondition of 2) | `gcloud run services update globe-studio-internal … --ingress all` | <10 min — restores direct `run.app` access. |
| 2 | **URL / OAuth** | `--update-env-vars GLOBE_PUBLIC_BASE_URL=<run.app>` | <15 min — the `run.app` URI is still in the allowlist, so no database write is needed. |
| 3 | **DNS** | Remove the `A` record on HostGator (out-of-band). | <60 min for propagation. |
| 4 | **ALB** | Retire the **front-door HCL** (the content of `16919d9` + `cf5e4d1`, which are one unit) → `tofu plan` → read → `tofu apply`. Destroy the **global IP** with the rest (see the cost note). **Not a blind `git revert`** — see below. | Per plan. |

**Slices 1 and 2 write fields that Terraform owns since `TASK-1508`.** Both the ingress and `GLOBE_PUBLIC_BASE_URL`
live in `cloud_run_services.tf`, and `lifecycle.ignore_changes` covers **only** `template[0].containers[0].image`,
`client` and `client_version` — not those two. The `gcloud` commands above are therefore **emergency writes over
IaC-governed fields**: they are the correct path because they are the fastest, but the rollback is not closed until the
HCL is reconciled with the state you intend to keep and applied, or the next `tofu apply` undoes it silently. A plan
showing those fields in the diff right after a rollback is **not** a state error, it is pending reconciliation. The
operable procedure — full commands included — is owned by the runbook
[§ Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice), which is
its **SoT**; this table records the ordering contract, not the recipe.

**The precondition is not optional.** Slice 1 (ingress) is a **requirement of slice 2** whenever the goal is to
recover access through `run.app`. Reverting only `GLOBE_PUBLIC_BASE_URL` while ingress is still
`internal-and-cloud-load-balancing` **makes the state worse**: `run.app` keeps answering `404` (it is the ingress
that blocks it, not the env var), and the domain — which does keep serving through the ALB — starts announcing a
`run.app` callback the browser cannot reach, so login breaks on the side that was working. Slice 2 on its own is not
a rollback, it is a second incident. Slice 4's two commits are likewise reverted **together**: reverting only
`16919d9` orphans the fix in `cf5e4d1`, and reverting only `cf5e4d1` reopens the `compute.googleapis.com` race
described in the [graph-root rule](#the-alb-in-terraform). Operable procedure and full commands: runbook
[§ Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice).

**Step 4 is NOT a blind `git revert`.** `16919d9` introduced `variable "front_door_domain"`, and since
`TASK-1508` `cloud_run_services.tf` also references it (`GLOBE_PUBLIC_BASE_URL`). Reverting that commit would
drop the variable while the reference stays alive, so `tofu plan` **aborts** with
`Reference to undeclared input variable` — it does not even produce a plan. At step 4, first **edit
`cloud_run_services.tf` so `GLOBE_PUBLIC_BASE_URL` no longer depends on `var.front_door_domain`**, then retire
the front-door HCL together with the variable. Both commits remain the unit of content; what changes is that it
is applied as a reconciled edit, not an automatic revert. If steps 1-2 were done with `gcloud`, re-read the plan
before applying: applying unreconciled with the ALB already destroyed is a full outage.

The ordering is the point: the two fastest slices restore login without touching DNS or Terraform, which is why the
`run.app` origin is preserved in the allowlist rather than cleaned up eagerly.

## What this front door does not change

- **`maxScale` was untouched by this slice, in either direction.** The TASK-1507 spec said "preserve `maxScale=1`" and
  was **stale**: TASK-1465 is complete and cleared the HA gate. What this slice read as `3` before and after was the
  **revision-level** ceiling (`template.scaling.maxInstanceCount`); the **service-level** ceiling
  (`Service.scaling.maxInstanceCount`) was still `1`, and Cloud Run enforces the **lesser** — so the effective ceiling
  was 1 while it looked like 3. `TASK-1508` corrected both levels to `3` and put both under Terraform, which closed the
  drift trap: `deploy-internal.yml` no longer passes `--max-instances` (it passes only `--image`). Beware the old
  workaround `gcloud run services update <service> --max-instances=3`: `--max-instances` writes a **different field
  depending on the subcommand** (`gcloud run deploy` → service, `gcloud run services update` → revision), so that
  command wrote the revision ceiling and left the effective ceiling at 1 while appearing to restore it.
- **Ingress is not a workflow drift trap.** `deploy-internal.yml` does not pass `--ingress`, and `gcloud run deploy`
  preserves service-level settings it is not told to change. It *was* an IaC gap — the value was applied with `gcloud`
  because the Cloud Run services were not in Terraform — and `TASK-1508` closed it by adopting both services into
  Terraform, where the ingress value now lives.
- **`invokerIamDisabled` stays `true`** on `globe-studio-internal` — correct for a web service with SSO, since a
  browser presents no ID token and the app authenticates by its own cookie.
- **No gate moves.** An internal-only hostname is not Production, not HA and not external client access (TASK-1480).
  And "Cloud Run behind this ALB" is **not** a decision about the commercial client frontend, which ADR-004 keeps
  explicitly deferred with Vercel + Next.js as a live candidate.

## 4-pillar scoring

- **Safety:** the ALB is the enabling condition for `ingress internal-and-cloud-load-balancing`, closing the
  `ingress=all` soft spot ADR-004 flagged; the private API never enters the NEG, never gets a custom domain and never
  derives its token audience from a browser hostname; the allowlist primitive touches one column in one transaction and
  cannot rotate a secret or truncate the allowlist the way the seed script could; the cutover order removes the window
  in which the shell would announce a callback the broker rejects.
- **Robustness:** the apply plan was read before applying (zero destroy/replace, zero Cloud Run in the diff); the
  partial-apply race was fixed in the HCL with an explicit `depends_on` instead of a blind retry; the acceptance
  instrument was calibrated against the previous origin before the cutover; a spurious `--remove` fails loud instead of
  no-op.
- **Resilience:** rollback is sliced and ordered by cost, with the two fastest slices restoring login without touching
  DNS or Terraform; the `run.app` callback is retained precisely so a rollback needs no database write under pressure;
  the certificate's scary intermediate state has a documented discard checklist so the correct action (wait) is
  distinguishable from intervention.
- **Scalability:** the front door is stateless and holds no policy beyond host→backend routing, so horizontal scale
  stays a Cloud Run concern (already unblocked by SPEC-007); CDN is off deliberately because the surface is
  per-session, so no cache-correctness debt is created for a future authenticated surface.

## Open items / still deferred

- **Ingress and `maxScale` under IaC — closed by `TASK-1508`, no longer open.** When this slice shipped both were
  live-applied and ungoverned (the front door was in Terraform, the Cloud Run **services** were not). `TASK-1508`
  adopted both services by brownfield import (2 imported / 2 changed / 0 destroyed), governs the ingress value and both
  ceiling levels, and reduced `deploy-internal.yml` to `--image` only.
- **DNS stays outside Terraform.** The `A` record is created by hand on HostGator; a clean plan does not prove the name
  resolves.
- **External access / Production → TASK-1480.** Unchanged by this slice.
- **Commercial client frontend host + framework → deferred by ADR-004**, to be decided when TASK-1505's client UI is
  built and before TASK-1480.
- **Retiring the `run.app` redirect URI** is available (`pnpm sister-platform:redirect --client globe --remove … --apply`)
  and deliberately not exercised while it is the documented rollback path.
- **Workload-lane smoke not re-exercised.** `globe-api-internal` was untouched and stayed `403` anonymous before and
  after, so the `200`-to-authorized-SA leg of `smoke-private-api.mjs` was not re-run; the criterion is unmarked by
  honesty, not by blockage.
- **Apply lane.** The ALB was applied with a local `tofu`; no apply through the keyless OIDC→WIF workflow lane is on
  record for this slice.

## Invariantes operativos para agentes

- **NUNCA** darle a `globe-api-internal` un custom domain, una entrada en el NEG ni exposición browser. El NEG apunta
  **sólo** a `globe-studio-internal`. Domain mappings en el proyecto: 0, y así debe seguir.
- **NUNCA** "endurecer" el `ingress` de `globe-api-internal` por analogía con el web. Su ingress es **`all`** a propósito
  y no se tocó: su perímetro es **exclusivamente IAM + verificación in-app del ID token**, NO el ingress. Su caller es
  Greenhouse en Vercel y llega por internet, no desde una VPC — restringirlo a tráfico interno/LB corta la federación
  workload.
- **NUNCA** derivar `GLOBE_API_EXPECTED_AUDIENCE` del dominio browser. La audience se deriva de los dos formatos de URL
  `run.app`; el `GLOBE_PUBLIC_BASE_URL` de la API es el placeholder `https://globe-api-internal.invalid` a propósito,
  para que cualquier path que intente construirle una URL pública falle fuerte en vez de inventarla.
- **NUNCA** cambiar `GLOBE_PUBLIC_BASE_URL` antes de ampliar el allowlist de redirect. El orden canónico es
  **allowlist → verificación de tres vías contra el broker → env var → smoke**. Agregar un redirect URI es inerte hasta
  que algo lo use; flipear la env var primero abre una ventana con el SSO roto.
- **SIEMPRE** verificar de tres vías contra `GET /api/auth/sister-platforms/authorize` (dominio, `run.app`, wildcard)
  **antes** de tocar el runtime. El broker valida el `redirect_uri` antes de mirar la sesión, así que discrimina sin
  necesitar login; el wildcard debe seguir dando `400 invalid_redirect_uri` (el allowlist es exacto por diseño).
- **NUNCA** usar `scripts/seed-globe-internal-pilot.ts` para un cutover: reemplaza el array de `redirectUris` (borra el
  `run.app`, o sea el camino de rollback) y rota el client secret (rompe el SSO vivo).
- **SIEMPRE** operar el allowlist por `updateSisterPlatformOAuthRedirectUris` (entry point
  `pnpm sister-platform:redirect`, **dry-run** mientras no se pase `--apply`). La lógica vive en el broker, no en el
  script, para que una route, un tool MCP o Nexa puedan operar el mismo cambio por la misma primitive.
- **NUNCA** convertir un `--remove` fallido en un no-op silencioso. Quitar un URI ausente falla con
  `invalid_redirect_uri` a propósito: durante un cutover, un no-op sobre una vista stale es justo cómo sobrevive el
  callback equivocado.
- **NUNCA** usar `--set-env-vars` en Cloud Run (destructivo); para cambiar una variable, `--update-env-vars`.
- **NUNCA** prender el CDN en el backend service. El front door sirve un shell SSO con respuestas por sesión:
  cachearlas en el edge es un bug de correctitud, no una optimización.
- **NUNCA** referenciar las Cloud Run services como recurso de Terraform en `front_door.tf` — el NEG usa el **string
  literal** `"globe-studio-internal"`. Si un plan de ese archivo muestra create/import/replace/destroy tocando
  `globe-studio-internal` o `globe-api-internal`, **PARAR**: desde `TASK-1508` esos servicios los gobiernan sus propios
  recursos de Terraform, nunca `front_door.tf`.
- **SIEMPRE** darle `depends_on` explícito hacia su `google_project_service` a todo recurso que sea **raíz del grafo**
  (que no referencie a otro recurso del mismo servicio) cuando la API se habilita en el mismo apply. El síntoma de la
  omisión es un primer apply parcial con `SERVICE_DISABLED`, y el segundo apply lo esconde en vez de arreglarlo.
- **NUNCA** recrear el certificado administrado por ver `FAILED_NOT_VISIBLE`: es el resultado guardado del primer
  intento de validación, anterior al registro DNS. Google reintenta solo. Correr antes la checklist de descarte del
  runbook; con todo en verde, el diagnóstico correcto es esperar.
- **NUNCA** concluir que el front door está roto por un `curl` con `status=000` y `remote_ip` vacío: eso es falla de
  resolución local (cache negativa, `SOA minimum` 86400). Confirmar con `dig @8.8.8.8` y `curl --resolve`; para el
  smoke SSO, `GLOBE_SMOKE_RESOLVE=host:ip`.
- **SIEMPRE** calibrar el smoke de federación humana contra el origen anterior **antes** del cutover. Un smoke sin
  calibrar no es evidencia: si falla después, no se puede distinguir el cutover del instrumento.
- **NUNCA** tocar `maxScale` desde este carril: `TASK-1507` no lo mueve en ninguna dirección, y desde `TASK-1508` el
  techo lo gobierna Terraform en sus **dos** niveles (servicio y revisión), con `deploy-internal.yml` pasando sólo
  `--image`. **NUNCA** "restaurar" el techo con `gcloud run services update … --max-instances=N`: ese subcomando
  escribe el nivel **revisión**, Cloud Run aplica el **menor** de los dos, y el arreglo queda inefectivo aunque parezca
  aplicado.
- **NUNCA** quitar el redirect URI `run.app` del allowlist mientras siga siendo el camino de rollback documentado.
- **NUNCA** tratar el rollback como un menú: es una **secuencia** (ingress → env var → DNS → ALB) y se detiene en el
  primero que resuelva. El paso 1 (ingress) es **requisito del paso 2**: revertir sólo `GLOBE_PUBLIC_BASE_URL` con el
  ingress todavía en `internal-and-cloud-load-balancing` empeora el estado —el `run.app` sigue en `404` porque lo
  bloquea el ingress, y el dominio pasa a anunciar un callback `run.app` inalcanzable—; eso no es un rollback, es un
  segundo incidente. Los dos commits de `front_door.tf` (`16919d9` y `cf5e4d1`) se revierten **juntos**.
- **NUNCA** destruir el ALB dejando la IP global reservada y sin adjuntar: pasa a facturar como IP estática ociosa.
  Destruir la dirección junto con el resto.
- **NUNCA** leer este dominio internal-only como Producción, HA o acceso de clientes externos (gate TASK-1480), ni leer
  "Cloud Run detrás de este ALB" como la decisión de host del frontend cliente comercial (diferida por ADR-004).
