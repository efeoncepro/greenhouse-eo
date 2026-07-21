# Efeonce Globe Frontend Hosting and Front Door Decision V1

- Decision: ADR-004
- Status: Accepted for the internal-only release; the commercial client-facing frontend host is an explicit deferred decision
- Validated: 2026-07-20 (live runtime verified read-only; Google Cloud custom-domain guidance verified as-of this date)
- Confidence: High for the internal-only Cloud Run decision; the commercial frontend host is intentionally left open with a named revisit trigger
- Reversibility: Two-way for the internal release (a Global External Application Load Balancer is additive and revertible to the `run.app` URL); the commercial-frontend host decision is kept open on purpose
- Owners: Efeonce Globe platform + Greenhouse control plane (decision/governance). Successor-task out-of-band owners: GCP/billing + infra, DNS `efeoncepro.com` (HostGator), OAuth broker/redirect allowlist (Greenhouse), Product/Security for the internal-vs-Production gate
- Related: `GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001), `PLATFORM_FOUNDATION_V1.md`, `EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`, `TASK-1506` (this decision), `TASK-1507` (domain/front-door cutover), `TASK-1508` (Cloud Run IaC/deploy ownership), `TASK-1465` (durable persistence), `TASK-1480` (external readiness), `TASK-1505` (Producer surface)

## Context (verified baseline)

Efeonce Globe's human surface + BFF + private API spine run today from a single native **Node 24 http server** (`apps/studio-web`, `createStudioApp`), deployed twice from the same artifact by the manual keyless workflow `deploy-internal.yml` (OIDC → WIF → `globe-deployer`):

- `globe-studio-internal` — `web` mode: SSO shell + BFF. Region `southamerica-west1`, ingress `all`, `maxScale=1`, `invokerIamDisabled=True` (browser-reachable; the app authenticates by its own session cookie). Runs as SA `web_runtime`.
- `globe-api-internal` — `api` mode: the Model Lab caller + private workload. Region `southamerica-west1`, ingress `all`, `maxScale=1`, IAM-private (anonymous → 403 at the perimeter) + in-app ID-token verification. Runs as SA `api_runtime`.

Verified read-only 2026-07-20 (`gcloud run services describe`): both `READY`, both `southamerica-west1`, both `maxScale=1`. Sessions, OAuth transactions, experiments, evaluations and the spend fence are **in-memory / per-process** (`InternalSmokeSessionStore`, `InMemoryExperimentStore`, `LabSpendFence`), which is why `maxScale` must stay `1`. The Cloud Run **services are not under Terraform** (only identities/WIF/buckets/IAM/budget/observability are), so `invokerIamDisabled` and ingress/env/scale are ungoverned and drift-prone (`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` §"Qué NO hace"). `globe.efeoncepro.com` does not resolve yet; `efeoncepro.com` DNS is on HostGator.

There is no ADR that decides where `globe.efeoncepro.com` terminates or which stack hosts the long-term frontend. The target Next.js architecture from the original agentic-platform doc never materialized — the running reality is the Node server. Resolving the domain without this decision would freeze an accidental pilot into architecture without ownership or reversion criteria.

## Decision

**Efeonce Globe is, and will remain, a commercial product** — so this ADR is written for two horizons, kept deliberately separate:

1. **Internal-only release (now): keep Cloud Run as the web/BFF; do NOT migrate to Vercel.** The web/BFF/SSO shell stays on `globe-studio-internal` (Cloud Run, GCP), inside one trust boundary with the private API, WIF/ADC identity, provider secrets and the Model Lab. Migrating the internal Node shell to Vercel now is rejected: it is a high-blast-radius, one-way-ish runtime/auth/WIF migration that **does not buy robustness or HA** (the real ceiling is the in-memory/`maxScale=1` state, gated by durable persistence, independent of the hosting cloud) and violates the standing rule "saving the cost of a front door never justifies silently migrating auth/BFF across clouds."

2. **Adopt the native Node http server for this release; the Next.js target is `superseded` for the internal shell.** A lean Node BFF + API spine + SSO shell is the right shape for the internal surface; rewriting it to Next.js buys nothing for an internal pilot.

3. **The commercial client-facing frontend (`TASK-1505` Producer surface and beyond) is a SEPARATE surface with a DEFERRED host + framework decision.** It does not exist yet. Because the commercial product serves international enterprise marketing teams, a client-facing **Next.js frontend on a global edge/CDN host (Vercel is a live, best-in-class candidate; Greenhouse already runs there)**, talking to the private GCP API, is an explicitly open option — to be decided **when `TASK-1505`'s client UI is built and its framework chosen, and before `TASK-1480` Production**, not by migrating the internal shell today. Choosing Cloud Run now for the internal shell does **not** foreclose this: the commercial frontend is built once, on the host chosen then, and the private API stays in GCP either way.

4. **Front door.** The internal-only stable URL is the existing `*.run.app` URL + SSO now (it is already stable HTTPS, enough for `TASK-1469`'s OAuth callback / canary base URL). The custom domain `globe.efeoncepro.com` is delivered by the successor task (`TASK-1507`) via a **Global External Application Load Balancer + serverless NEG (`southamerica-west1`) → `globe-studio-internal`** with a managed certificate and HTTP→HTTPS — the GA path for a Cloud Run custom domain (direct Cloud Run domain mappings are Preview/region-limited). `globe-api-internal` **never** receives a custom domain and stays IAM-private with its `run.app` audience. The custom domain is sequenced **before the internal rollout of `TASK-1505`**, not eagerly.

5. **Three distinct gates — never conflated:**
   - **Internal-only stable URL:** may ship after this ADR + the successor task's plan, with SSO/capabilities, `maxScale=1` and explicit rollback. **Not** Production, HA or external access.
   - **Scalability / HA:** requires durable stores (sessions, OAuth transactions, experiments, evaluations, spend fence) + async execution **before** `maxScale > 1`. Gated by `TASK-1465` (workspace tenancy/persistence), which is the home of the durable session/OAuth store under `apps/studio-web` (or an explicitly named child task); `maxScale > 1` is hard-gated on it.
   - **External access / Production:** requires `TASK-1480` + a dedicated rollout + legal/security/finance/ops evidence.

6. **Successor implementation is split by blast radius.** `TASK-1507` owns the additive ALB/TLS/DNS/OAuth/domain
   cutover and final web ingress. `TASK-1508` separately brings the Cloud Run **services into Terraform**, reconciles
   Terraform with the image-deploy workflow and pins stable service configuration. This ADR authorizes **no** apply.

## Alternatives considered

| Alternative | Decision |
| --- | --- |
| (B) Migrate the web/BFF to Vercel now (Next.js), Cloud Run API behind OIDC/WIF | **Rejected for this release:** high-blast-radius runtime/auth/WIF migration that does not fix the in-memory/`maxScale=1` ceiling (Vercel serverless is stateless too) and splits the trust boundary across two clouds for zero internal-release benefit. It is not foreclosed for the *commercial frontend* (deferred, item 3). |
| Rewrite the internal shell to Next.js on Cloud Run | Rejected: same "migrate for no internal benefit" problem; the Node server is the right shape for a BFF/SSO shell. |
| Direct Cloud Run custom domain mapping for `globe.efeoncepro.com` | Rejected as the productive path: Cloud Run domain mappings are Preview/region-limited; the Global External ALB + serverless NEG is the GA path. |
| Ship the custom domain now, before `TASK-1505` exists | Rejected: adds fixed ALB cost before any human surface needs it; the `run.app` URL suffices for the internal shell until 1505's rollout. |
| Give `globe-api-internal` a custom domain / browser exposure | Rejected: the API stays IAM-private, service-to-service, with a `run.app` audience never derived from the browser domain. |
| Lock the commercial frontend host to Cloud Run now | Rejected: over-fits an internal pilot to a commercial-product host choice; kept as a deferred two-way-door decision with a revisit trigger. |
| Keep the accidental pilot without an ADR | Rejected: freezes hosting/domain ownership with no reversion criteria (the reason this task exists). |

## Consequences

- The internal release proceeds on Cloud Run with the Node server; no cross-cloud migration, no new runtime to secure.
- The commercial-frontend host stays an **open, named decision** — future agents must not read "Cloud Run for the internal shell" as "Cloud Run for the commercial client UI."
- `TASK-1507` must govern any front-door/ALB/DNS/OAuth work; this ADR alone authorizes no apply.
- `maxScale > 1` is hard-blocked until durable stores land (`TASK-1465`); the in-memory ceiling is documented as the real HA blocker, not the hosting cloud.
- The Cloud Run services enter Terraform in `TASK-1508`, after the domain cutover, closing the
  `invokerIamDisabled`/deploy-ownership drift follow-up without coupling it to DNS.
- The `web_runtime` provider-permission concern raised in the task brief is already closed (the erroneous `aiplatform.user` grant was moved to `api_runtime`); `TASK-1507` still audits least-privilege before any broader rollout.

## Revisit triggers

- **Commercial frontend host + framework:** decide when `TASK-1505`'s client UI is built and its framework chosen, and before `TASK-1480` Production. Vercel-hosted Next.js on a global edge is a live candidate then.
- **HA / `maxScale > 1`:** revisit when `TASK-1465` durable stores land.
- **Custom domain:** implement (via `TASK-1507`) before `TASK-1505`'s internal rollout.
- Supersede this ADR with a new one if any trigger fires; never rewrite history.

## Successor task contract (TASK-1507 + TASK-1508)

`TASK-1507` (implementation, internal-only front door) must deliver, with no apply authorized by this ADR alone:
global IP, Global External ALB + serverless NEG (`southamerica-west1`) → `globe-studio-internal` only, managed
certificate, HTTP→HTTPS, DNS for `globe.efeoncepro.com` on HostGator, `GLOBE_PUBLIC_BASE_URL` update, the exact OAuth
callback + redirect-allowlist change in the Greenhouse broker, smokes (human federation + workload federation), final
web ingress `internal-and-cloud-load-balancing`, cost model and rollback. `globe-api-internal` stays IAM-private with
its `run.app` audience.

`TASK-1508` then adopts both Cloud Run services into Terraform with import/no-replace discipline and reconciles the
GitHub workflow so Terraform owns stable configuration/security while the workflow owns only image/revision deploys.

## 4-pillar scoring

- **Safety:** one trust boundary (GCP) for the internal release; the API stays IAM-private; the ALB path (successor) lets the web move to ingress `internal-and-cloud-load-balancing`, removing the `invokerIamDisabled=True` + `ingress=all` soft spot. The commercial-frontend deferral prevents a premature cross-cloud auth surface.
- **Robustness:** the decision is documental (no runtime mutation, fail-closed). It names the in-memory/`maxScale=1` ceiling explicitly and hard-gates `maxScale > 1` on durable stores, so "scalable" is never claimed of an in-memory backend.
- **Resilience:** reversion is explicit per horizon (revert the ALB to `run.app`; supersede the ADR for the commercial-frontend decision). The IaC-drift follow-up is isolated in `TASK-1508`, so importing services cannot endanger the DNS cutover.
- **Scalability:** the cheapest path to scale (Cloud Run horizontal, once stores are durable) with no premature migration; the commercial frontend host stays open so the client product can adopt a global edge/CDN when it is actually built.

## Hard rules (anti-regression)

- **NUNCA** leer "Cloud Run para el shell interno" como "Cloud Run para el frontend cliente comercial": son superficies distintas; la del comercial es una decisión diferida (revisit trigger).
- **NUNCA** migrar el web/BFF/auth entre nubes para ahorrar el costo de un front door; el host del frontend comercial se decide cuando se construye 1505, no antes.
- **NUNCA** subir `maxScale > 1` de `globe-studio-internal` mientras sesiones/OAuth/experimentos/eval/spend-fence sigan en memoria (gate `TASK-1465`).
- **NUNCA** darle a `globe-api-internal` un custom domain ni exposición browser; queda IAM-private con audience `run.app` no derivada del dominio browser.
- **NUNCA** interpretar esta ADR como autorización de apply de infra/DNS/OAuth: eso es `TASK-1507`.
- **NUNCA** interpretar un dominio internal-only como Production, HA o acceso de clientes externos (gate `TASK-1480`).
- **SIEMPRE** implementar el custom domain vía Global External ALB + serverless NEG (path GA), no un domain mapping directo de Cloud Run.

## Open questions (deliberately not decided)

- El **framework y host exactos del frontend cliente comercial** (Vercel + Next.js vs Cloud Run + framework) — decisión diferida a `TASK-1505` + pre-`TASK-1480`, con este ADR como el que la mantiene abierta.
- Si el **store durable de sesión/OAuth** vive dentro de `TASK-1465` o en una child task nombrada — **resuelto por `TASK-1465`** (ver Delta 2026-07-21): vive en `TASK-1465` bajo `packages/database`, respaldado por Cloud SQL `globe-pg`; el hard-gate de `maxScale > 1` quedó satisfecho.

## Delta 2026-07-21 — `TASK-1465` aterrizó persistencia durable; el gate de HA quedó cleared

`TASK-1465` está **complete, deployed y live-verified (2026-07-21)**. El primer datastore durable de Globe —un Cloud
SQL `globe-pg` propio (Postgres 16, `southamerica-west1`, IAM keyless sobre el Cloud SQL connector)— respalda ahora,
detrás de sus ports ya existentes, los cinco stores que este ADR describió como in-memory / per-proceso (sesiones,
transacciones OAuth, experimentos, reportes de evaluación y el spend fence de seguridad) más un audit log append-only.
Ambos servicios Cloud Run corren durable en `maxScale=3`.

**Esto satisface el gate de HA que este ADR hard-blockeaba.** El Context/Decision de arriba describe la realidad
runtime **as-of 2026-07-20** (in-memory / `maxScale=1`, con `maxScale > 1` hard-gated en `TASK-1465`). Ese gate quedó
**cleared**: el backend durable eliminó el techo in-memory y los servicios ya corren en `maxScale=3`. La **decisión**
del ADR no cambia (internal-only en Cloud Run, frontend comercial diferido, front door vía `TASK-1507`); sólo se
levantó el blocker de HA. Por la regla "never rewrite history" (Revisit triggers) el texto baseline se conserva como
su snapshot 2026-07-20 y esta Delta registra el cambio de estado.

**Sigue abierto (no lo cierra esta Delta):** el modelo rico de workspace/members/grants tenancy queda diferido;
**gobernar el valor `maxScale` por IaC es `TASK-1508`** (el `deploy-internal.yml` aún hardcodea `--max-instances=1`,
un drift-trap hasta que Terraform lo posea); y el acceso externo / Production sigue gateado por `TASK-1480`. Detalle:
[`EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md) (SPEC-007) +
`docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`.
