# TASK-1515 — Embed Runtime Delivery-Plane Selection and Keyless Provisioning

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Discovery read-only ejecutable; provisioning bloqueado por TASK-1514 y checkpoint de decisión`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1514 para provisioning; discovery read-only sin bloqueo`
- Branch: `task/TASK-1515-embed-runtime-delivery-plane-selection`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Compara con evidencia el Vercel existente endurecido y Firebase Hosting en un proyecto GCP dedicado bajo la misma
organización/facturación. Tras un checkpoint humano registra el provider seleccionado y provisiona sólo ese plano con
identidad keyless, promoción single-writer, dominio neutral, costo observable y rollback probado. No habilita Firebase
en `efeonce-group`.

## Why This Task Exists

El problema es desacoplar releases visuales de Greenhouse, no adoptar Firebase por sí mismo. Vercel ya opera Meetings
y puede resolver el objetivo al corregir retención, promoción y gobernanza. Firebase ofrece preview/clone y una
frontera GCP explícita, pero dentro de `efeonce-group` compartiría IAM, cuotas, side effects y billing; además no está
demostrado que el publisher pueda limitarse a un único Hosting site. La selección debe medir ambos finalistas sobre el
mismo fleet y separar discovery reversible de provisioning.

## Goal

- Producir una comparación reproducible Vercel vs Firebase dedicado sobre seguridad, promoción, rollback, costo y
  operación.
- Obtener un go/no-go humano y registrar el provider elegido antes de cualquier mutación irreversible.
- Provisionar el plano ganador sin llaves persistentes, sin provider URLs en consumers y sin consumer cutover.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `TASK-1514` congela el protocolo/fleet composer antes de provisioning; sólo discovery read-only corre en paralelo.
- Mismo artifact, traffic model y acceptance matrix para ambos finalistas.
- Firebase en `efeonce-group` no está autorizado. Si Firebase gana, usa proyecto dedicado bajo la organización y
  billing account existentes; no requiere otra cuenta Google.
- Un solo ambiente GitHub de producción protegido y una sola concurrency group del fleet.
- Identidad exacta por repo + workflow + environment/ref; no reutilizar `github-actions-deployer@efeonce-group`.
- Provider seleccionado sirve sólo assets públicos; APIs, consent, submissions, bookings y PII permanecen fuera.
- No DNS/consumer cutover ni retiro Vercel en esta task.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`

## Dependencies & Impact

### Depends on

- Discovery: inventario read-only del Vercel project, GCP org/billing/WIF/IAM y GitHub environments.
- Provisioning: `TASK-1514` completa + provider checkpoint aprobado.

### Blocks / Impacts

- Bloquea `TASK-1516` y los cutovers productivos de `TASK-1517`/`TASK-1518`.
- No bloquea inventario de host compatibility/deep selectors de Forms/CTA.

### Files owned

- `.github/workflows/embed-runtime-release.yml`
- `scripts/embed-runtime/` provider adapters, comparison and receipts
- provider configuration/IaC path resolved in Discovery
- DNS candidate configuration for `assets.efeoncepro.com` without consumer cutover
- runbook de publish/promote/rollback

## Current Repo State

### Already exists

- Vercel project `efeonce-public-renderers` y release Meetings live.
- GCP organization/project `efeonce-group`, billing y WIF repository provider.
- GitHub production environments, aunque sólo uno tiene reviewers y el binding exacto debe resolverse.

### Gap

- Vercel promotion es local y su security/provenance/retention lane no está cerrada.
- Firebase APIs/Hosting no están habilitados y no existe publisher dedicado.
- El WIF provider actual restringe repo, no basta por sí solo para workflow/environment/ref.
- No existe provider scorecard, cost model comparable ni decisión posterior al spike.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `greenhouse-eo release tooling + existing Vercel project`
- Future candidate home: `remain-shared`
- Boundary: `static delivery only; no product state or server runtime`
- Server/browser split: `CI/IaC server-side; provider sirve JS/CSS/JSON públicos`
- Build impact: `provider adapters consumen el mismo fleet artifact; no entran al build Next.js`
- Extraction blocker: `none beyond governed project/workflow ownership`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `delivery provider config + release receipts; product data no cambia`
- Consumidores afectados: `release operators, WordPress/Think adapters in later tasks`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `Embed Runtime protocol V1 + fleet composer + cloud identity posture`
- Contrato nuevo o modificado: `provider adapter, exact promotion, single-writer receipt and neutral-domain config`
- Backward compatibility: `compatible; current stable URLs remain authoritative`
- Full API parity: `N/A — static publication tooling`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; cloud/provider configuration and public artifacts`
- Invariantes que no se pueden romper:
  - `production no rebuild; candidate/live hashes are equal`
  - `live promotion is serialized; live digest is re-read immediately under lock`
  - `baseFleetDigest stale rejects and recomposes; it is not an atomic CAS claim`
  - `publisher cannot mutate unrelated runtime/cloud resources`
  - `no secret, credential, PII or product state in provider artifacts/receipts`
- Tenant/space boundary: `N/A — public artifacts`
- Idempotency/concurrency: `one fleet concurrency group + pre/post digest readback`
- Audit/outbox/history: `provider, source SHA, candidate/live digest, actor, approval, deployment/version and duration`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `candidate only; no consumer`
- Backfill plan: `TASK-1514 fixture/fleet only`
- Rollback path: `provider-native previous fleet; Vercel remains alternate rail`
- External coordination: `Platform, Security/Cloud, DNS owner, GitHub environment reviewer`

### Security and access

- Auth/access gate: `short-lived provider identity; exact repo/workflow/environment/ref subject`
- Sensitive data posture: `no sensitive data; logs redact claims/tokens/provider responses`
- Error contract: `sanitized deterministic workflow errors`
- Abuse/rate-limit posture: `public CDN; provider quota/cost alerts`

### Runtime evidence

- Local checks: `config/schema/provider adapter tests + deterministic fleet artifact`
- DB/runtime checks: `N/A`
- Integration checks: `candidate deploy, headers, exact promote, stale rejection, rollback, neutral TLS`
- Reliability signals/logs: `external synthetics, host loader errors, provider deployment/version, transfer/cost`
- Production verification sequence: `read-only comparison → checkpoint → candidate provisioning → promote fixture → rollback; no consumer cutover`

### Acceptance criteria additions

- [ ] Provider decision is based on comparable evidence and explicit dealbreakers.
- [ ] Provisioning happens only after TASK-1514 and operator checkpoint.
- [ ] No Firebase mutation occurs in `efeonce-group`.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Read-only provider assurance

- Inventory current Vercel project/team/deploy/alias/retention/security/cost and prove the hardening path.
- Inventory GCP org/billing/WIF and design a dedicated Firebase project/publisher without enabling APIs.
- Resolve the exact protected GitHub environment; require reviewers and exact workflow subject.
- Measure one fleet's deployment latency, rollback path, transfer cost and operational steps using previews/candidates
  only where already authorized.
- Produce scorecard and recommendation against ADR V2 dealbreakers.

### Checkpoint — Human provider decision

- Platform, Growth and Security/Cloud accept the scorecard and operator approves one provider.
- Record decision evidence in ADR V2/its dated assessment before provisioning. If neither passes, stop without cloud
  mutation and keep existing stable URLs.

### Slice 2A — Hardened Vercel provisioning (only if selected)

- Make GitHub protected workflow the routine publisher; pin action/CLI versions and retain immutable fleet releases.
- Use a dedicated project/team credential or supported short-lived integration with minimum project scope; no broad
  Greenhouse deployment token.
- Prove exact candidate-to-live promotion, single-writer stale rejection, receipt and native rollback.

### Slice 2B — Firebase dedicated-project provisioning (only if selected)

- Create/adopt a dedicated GCP project under existing org/billing; enable only required Firebase Management/Hosting
  APIs and create a dedicated Hosting site/target and publisher SA.
- Bind GitHub OIDC/WIF to exact workflow/environment/ref. Publisher cannot administer IAM, APIs, billing, sites,
  Cloud Run, Secret Manager or unrelated Storage.
- Separate bootstrap identity from routine publisher and capture before/after APIs, IAM, SAs, labels, keys and billing.
- Correct command contracts: live deploy uses `firebase deploy --only hosting:<target>`; preview uses
  `firebase hosting:channel:deploy <channel> --only <target>`; clone uses explicit
  `firebase hosting:clone <source-site>:<channel> <target-site>:<channel>` with no `--only` claim.

### Slice 3 — Neutral candidate, promotion and recovery proof

- Configure headers/cache/CORS/nosniff for the fleet and validate `assets.efeoncepro.com` without changing consumers.
- Deploy fixture candidate, run host synthetics, re-read live digest under lock, promote exact bytes, read back and
  record receipt.
- Prove stale-candidate rejection, full-fleet rollback under 15 minutes and alternate-provider fallback procedure/RTO.
- Record release lead time, cost visibility and supply-chain provenance.

## Out of Scope

- Enable Firebase in `efeonce-group` or reuse its general deployer.
- Create a second staging GCP project initially.
- Use Firebase App Hosting, Functions, Auth, Firestore, Storage, Analytics, Remote Config or Web SDK.
- Migrate Meetings, Forms or CTA consumers; change DNS authority; retire Vercel.
- Treat site deletion, project deletion or billing disablement as rollback.

## Detailed Spec

The provider adapter receives the same final fleet directory and returns a provider deployment/version plus digests.
Provider-specific commands remain in CI/IaC; manifests and host markup remain neutral. The routine publisher is
single-writer and cannot create topology. Bootstrap is explicit, reviewed and read back. External synthetics are the
availability authority because a failed loader cannot emit its own telemetry.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Read-only assurance → TASK-1514 complete → human checkpoint → one provider provisioning → fixture
  promote/rollback. Never execute both provisioning branches as production candidates by default.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Provider selected on preference | governance | medium | common scorecard + checkpoint | missing dealbreaker evidence |
| Publisher reach too broad | security | high | dedicated boundary + negative IAM tests | unexpected policy/resource mutation |
| Stale candidate overwrites live | release | medium | lock + immediate live re-read + post-read | pre/post digest mismatch |
| Manual write bypasses lock | operations | medium | routine access only through CI + drift synthetic | unknown deployment/version |
| Provider cost/latency surprises | delivery | medium | same fleet/traffic model + lead-time receipt | cost/SLO threshold breach |
| DNS/TLS impacts consumers | public | low | candidate validation only; no cutover | cert/host synthetic failure |

### Feature flags / cutover

No product flag. Provider candidate has no consumers; authority switch belongs to `TASK-1516`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | discard assessment artifacts; no cloud mutation | immediate | yes |
| 2A | freeze Vercel workflow and restore prior project settings/deployment | <1 h | yes |
| 2B | remove bindings/DNS candidate and leave dedicated project inert for audited retirement | <1 h | partial |
| 3 | restore previous verified fleet on selected provider | <15 min | yes |

### Production verification sequence

1. Verify protected environment and exact identity with positive/negative access tests.
2. Deploy fixture candidate and verify headers, hashes, provenance and host synthetics.
3. Force stale digest rejection, then recompose/retest.
4. Promote exact bytes under lock; compare pre/post receipt and lead time.
5. Roll back/restore, verify external synthetics and cost visibility; confirm zero consumers changed.

### Out-of-band coordination required

- Operator approval at provider checkpoint.
- Platform/Security acceptance of project/team, publisher and break-glass boundaries.
- DNS owner validation without authority cutover.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Scorecard compares Vercel hardened vs Firebase dedicated with one artifact/traffic model and ADR V2 dealbreakers.
- [ ] Provider checkpoint and acceptance authorities are recorded before provisioning.
- [ ] No Firebase API/site/project mutation exists in `efeonce-group`.
- [ ] Selected provider has dedicated boundary, exact protected GitHub identity and no persistent JSON/general deploy key.
- [ ] Routine publisher cannot administer topology or unrelated runtime/cloud resources; negative tests are evidenced.
- [ ] Production promotion is serialized, re-reads live under lock and rejects stale `baseFleetDigest`.
- [ ] Candidate/live bytes and fleet digest match; production does not rebuild.
- [ ] Previous fleet rollback completes under 15 minutes; alternate-provider fallback has a separate measured RTO.
- [ ] `assets.efeoncepro.com` candidate has valid TLS/headers without consumer cutover.
- [ ] Preview ≤5 min and approved live promotion ≤10 min are measurable without a Greenhouse application release.
- [ ] External synthetics, host-side loader error, transfer/cost and unknown-deployment drift are observable.
- [ ] Actions/CLI are pinned, lockfile/provenance are preserved and every live asset maps to source SHA/approval.

## Verification

- Provider adapter/config tests and deterministic fleet digest.
- Candidate/promotion/stale/rollback receipts plus positive/negative identity tests.
- `pnpm local:check`, `pnpm task:lint --task TASK-1515`, `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] ADR V2 and architecture record selected provider/evidence without rewriting V1 history.
- [ ] Runbook, ownership, break-glass and cost/SLO evidence updated.
- [ ] Handoff/changelog distinguish design, provisioned candidate and consumer-live status.
- [ ] QA release auditor, secret hygiene and documentation governor review closure.

## Follow-ups

- `TASK-1516` — Meetings pilot on selected delivery plane and neutral-domain cutover.

## Open Questions

- Final provider, Vercel identity mechanism and dedicated Firebase project/site IDs are resolved by Slice 1 + checkpoint;
  none is authorization to mutate infrastructure before that gate.
