# TASK-1521 — Globe Commercial Runtime Enablement

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Producer interno multimodal con sesión/viewer, outbox/queue age y severidades cerrados; runtime comercial externo bloqueado por 7 rutas, gate 0B y build units ADR-008`
- Rank: `TBD`
- Domain: `creative|platform|identity|finance|ops`
- Blocked by: `none`
- Branch: `task/TASK-1521-globe-commercial-runtime-enablement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir Globe de runtime `internal_smoke` a una plataforma capaz de operar una etapa comercial explícita y
aislada. Esta task integra environment/config, identity/tenant, ledger, providers, IAM/secrets, migrations,
observability, media delivery y promotion/rollback gates; no reimplementa ninguno de esos dominios ni concentra
sus workers en un solo runtime.

## Why This Task Exists

La configuración actual rechaza ambientes distintos de `internal_smoke` y la decisión de hosting comercial sigue
diferida. Cambiar una env var no crea aislamiento, identidad, tenancy, contabilidad, provider credentials ni
evidencia operacional. Sin un owner de integración, código completo podría confundirse con producto comercial
operativo.

## Goal

- Contrato versionado de etapas/runtime no-internal con validación fail-closed y configuración aislada.
- Integrar evidencia de identity/tenant, ledger y providers sin duplicar sus sources of truth.
- Promotion preflight, canary, rollback y live verification que mantengan `internal ready` separado de `commercial ready`.

## Checkpoint 2026-07-23 — internal-only operativo, comercial todavía cerrado

- Image, Video y Audio generaron/recuperaron outputs desde la UI en tres rutas promovidas. Esto valida el camino
  interno, no un ambiente comercial.
- Permanecen abiertas siete promociones exactas, UX de reautenticación por sesión expirada, cinco reconciles stale,
  severidad/diagnóstico de alertas y la implementación del delivery multimedia a escala.
- ADR-008 ya decide el boundary: original privado inmutable, derivados versionados, Range real, feed
  governance-aware y GC mark-and-sweep. La decisión está aceptada; sus build units, canaries y rollout no están
  implementados ni verificados.
- `TASK-1480` y sus dependencias continúan siendo el gate externo. No ampliar audiencia, clientes ni Production por
  el éxito del canario interno.

### Checkpoint histórico: intake y defecto estructural de tenancy

- El flujo humano autenticado alcanzó `estimate → generate → candidate_ready` con un output PNG real y gasto
  liquidado por el carril gobernado. Esto demuestra el seam de Producer, pero **no** habilita por sí solo un
  runtime comercial ni satisface los gates de promoción de esta task.
- La finalización automática del asset quedó detenida porque el worker de governance no descubre un workspace
  elegible: la proyección existente tiene lease expirado y el contrato de ADR-006 V1 no puede reconciliar de forma
  segura un workspace multi-member completo.
- ADR-006 adopta un delta V2: snapshots workspace-complete con `members[]`, revisión semántica separada de la
  freshness del lease, suspensión fail-closed de miembros omitidos y grants/revocaciones append-only acotados por
  el desired access del broker.
- Ese era el bloqueo observado en ese checkpoint. El runtime vigente ya procesó governance
  (`claimed=3`, `applied=3`, `promoted=1`, `failed=0`) y llevó las tres modalidades al feed. Las invariantes V2
  siguen vigentes, pero “desbloquear el primer asset” ya no es el siguiente paso.
- Plan activo: [`docs/tasks/plans/TASK-1521-plan.md`](../plans/TASK-1521-plan.md).

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`

Reglas obligatorias:

- La etapa comercial y su host/front door se resuelven mediante la decisión/ADR aplicable antes del cutover.
- Ambientes no comparten DB, buckets, sessions, service identities, provider credentials ni secrets por comodidad.
- Esta task consume tenancy `TASK-1511`, ledger `TASK-1468`/`TASK-1482` y provider routes; no redefine sus modelos.
- `candidate_ready` no equivale a governance eligible. El feed puede proyectar un placeholder owner-only mientras
  pending, pero no sirve bytes hasta eligibility; shared/client requiere además su policy de review/share.
- Originales, derivados, Range gateway, feed projector y GC conservan boundaries separados según ADR-008.
- Ningún estado `ready` se declara sin evidencia live de config, migration, IAM, secrets, data recovery y rollback.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Build puede avanzar sobre la foundation actual; promotion depende de `TASK-1468`, `TASK-1477`, `TASK-1478`,
  `TASK-1479`, `TASK-1482`, `TASK-1511` y del gate de hosting/front door aceptado.
- `TASK-1480` consume la evidencia final de readiness; no es reemplazada por esta task.

### Blocks / Impacts

- Bloquea el estado comercial operativo de Producer y entrega evidencia a `TASK-1480`.
- No bloquea el rollout humano interno gobernado de `TASK-1519`.

### Files owned

- `../efeonce-globe/packages/config/` `[verificar en Discovery]`
- `../efeonce-globe/apps/studio-web/`
- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/infra/`
- `../efeonce-globe/.github/workflows/`
- Runbooks gobernantes en `docs/operations/creative-studio/` y checks ejecutables junto al runtime en
  `../efeonce-globe/` sin crear un segundo control plane documental.

## Current Repo State

### Already exists

- Runtime interno Cloud Run, Cloud SQL durable/keyless, WIF/IAM identities, provider seams, spend fence y deploy interno.
- Identidad broker y API spine; tasks dueñas para ledger, providers, tenancy y readiness.
- Cinco runs completos, nueve outputs reales y reproducción/descarga internal-only de Image, Video y Audio en tres
  rutas exactas.

### Gap

- `readStudioRuntimeConfig` hard-blockea todo ambiente no `internal_smoke`.
- No hay matriz comercial aceptada de config/isolation/secrets/IAM/migrations/providers/ledger ni promotion evidence.
- El host/framework/front door comercial sigue siendo decisión diferida.
- No hay thumbnails/posters/transcodes/waveforms gobernados, Range extremo-a-extremo, orphan GC ni política
  implementada de visibilidad pending/eligible.
- Quedan siete rutas sin promotion/canary exacto, cinco reconcile stale, recuperación explícita de sesión expirada
  y severidad de `globe_worker_failed`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `config/runtime/infra/workflows en efeonce-globe; gates de identidad/ledger/providers por contrato`
- Future candidate home: `remain-shared`
- Boundary: `commercial runtime profile + readiness preflight + integración de evidencia ADR-008; sources of truth permanecen en sus domains dueños`
- Server/browser split: `config, secrets, IAM, ledger/provider wiring server-only; browser recibe capabilities públicas`
- Build impact: `infra/workflows/migrations/runtime config + media workers/gateway; no provider SDK ni transforms en transports`
- Extraction blocker: `hosting decision, environment isolation y gates coordinados identity/tenant/ledger/provider/media delivery`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `runtime environment/config and promotion evidence; media authority permanece en domain/Postgres`
- Consumidores afectados: `web/BFF, private API, runners, DB/storage, identity, ledger, providers, feed y operations`
- Runtime target: `staging/commercial stage definidos por decisión aceptada; internal_smoke preservado`

### Contract surface

- Contrato existente a respetar: `readStudioRuntimeConfig`, Cloud Run/IaC/deploy, broker/tenancy, ledger y provider registry.
- Contrato nuevo o modificado: `versioned commercial runtime profile + readiness/preflight result + promotion state + ADR-008 evidence gates`.
- Backward compatibility: `gated; internal_smoke no cambia y commercial falla cerrado si falta un gate`.
- Full API parity: `runtime readiness es reader/operator command gobernado; no un hidden UI switch`.

### Data model and invariants

- Entidades/tablas/views afectadas: `environment/promotion evidence; derivative intents/records, feed projection y lifecycle marks en migrations de sus build units`.
- Invariantes que no se pueden romper:
  - `cada ambiente tiene identities, secrets, storage/data y provider config aislados`.
  - `commercial spend requiere ledger authority; spend fence nunca se presenta como balance`.
  - `tenant/actor vienen de identity/tenancy canónicos; no modo single-tenant oculto`.
  - `GCS guarda bytes privados; ownership, governance, visibility y retention viven en domain/Postgres`.
  - `original inmutable; derivado versionado; same-key 412 se reconcilia por metadata/hash y nunca overwrite`.
- Tenant/space boundary: `broker + TASK-1511; preflight exige evidencia de aislamiento`.
- Idempotency/concurrency: `promotion/cutover con operation id, compare-and-set y lock de ambiente`.
- Audit/outbox/history: `append-only de preflight, approvals, config version, deploy, rollback y live checks`.

### Migration, backfill and rollout

- Migration posture: `coordinada/aditiva; cada domain conserva ownership de sus migrations`.
- Default state: `commercial disabled/fail-closed`.
- Backfill plan: `por domain, dry-run/allowlist según task dueña; reconcile stale y GC jamás usan SQL/borrado manual`.
- Rollback path: `traffic/flag OFF, revoke grants/provider routes, rollback deploy/config; preservar ledger/audit`.
- External coordination: `GCP/IAM/DNS/host, OAuth, secrets, provider accounts, Finance/ledger y operator sign-off`.

### Security and access

- Auth/access gate: `federated identity + tenancy grants + capability + workload IAM; operator promotion grant separado`.
- Sensitive data posture: `secrets, credentials, financial/identity/tenant config; no values en docs/logs`.
- Error contract: `sanitized readiness codes con correlation/evidence refs; no raw secret/provider errors`.
- Abuse/rate-limit posture: `quotas, ledger reservation, spend fence, provider circuit breakers y kill switches`.

### Runtime evidence

- Local checks: `config matrix/schema tests y fail-closed para cada gate ausente`.
- DB/runtime checks: `migrations/readback/backups/restore rehearsal por ambiente`.
- Integration checks: `identity→tenant→estimate→ledger reserve→provider→governance→derivatives→feed/stream→settle happy/negative/cancel`.
- Reliability signals/logs: `environment readiness, gate outcomes, reclaimable queue age, derivative/Range/GC/provider/ledger health, correlation`.
- Production verification sequence: `decision → isolated stage → migrations/secrets/IAM → canary → rollback rehearsal → promotion approval → live verify`.

### Acceptance criteria additions

- [ ] `internal_smoke` y commercial profiles son explícitos; un gate faltante bloquea boot/promotion.
- [ ] Identity/tenant/ledger/provider evidence viene de owners canónicos, no mocks ni duplicados.
- [ ] Media delivery prueba derivados y Range de Image/Video/Audio, memoria acotada y autoridad fail-closed.
- [ ] Feed y GC cumplen ADR-008 con pending owner-only, bytes eligible y mark-and-sweep auditable.
- [ ] Recovery/rollback y live canary se ejercitan antes de declarar commercial ready.

## Capability Definition of Done — Full API Parity gate

- [ ] Readiness/preflight es reader canónico y promotion es operator command autorizado/auditado/idempotente.
- [ ] Ningún consumer puede saltar gates mediante env/UI payload.
- [ ] Coverage/grants y errores sanitizados tienen conformance.
- [ ] Estado ready referencia evidencia verificable, no boolean manual sin provenance.

<!-- ZONE 2 — PLAN MODE: Discovery produce plan.md; no se llena al crear. -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0A — ADR de media delivery

- ADR-008 está aceptado y descompone original, derivados, serving, feed y GC en responsabilidades independientes.
- Crear unidades de implementación con ownership exclusivo; aceptar el ADR no equivale a implementar ni promover.
- Gate: canaries Image/Video/Audio, Range/load, negativos de acceso y GC dry-run/apply sobre el deployment exacto.

### Slice 0B — ADR/gate del commercial surface

- Resolver/revalidar host, framework, front door, origin/session y environment vocabulary por decisión aceptada.
- Congelar matriz de aislamiento y owners; no provisionar antes de cerrar el boundary.
- Este gate sigue abierto; el front door internal-only no lo resuelve.

### Slice 1 — Runtime profile, identity/session and isolated foundations

- Hacer config versionada capaz de representar la etapa elegida y fallar cerrado por campo/gate faltante.
- Provisionar/configurar identities, IAM, secrets, data/storage, observability y deploy sin compartir con internal.
- Verificar tenancy V2 en el perfil promovido y recuperación humana
  `401/403 → reautenticación → session/reader/output 200` sin repetir commands de gasto.

### Slice 2 — Domain gates, queue truth and media delivery

- Integrar broker/tenancy de `TASK-1511`, ledger de `TASK-1468`/`TASK-1482` y provider routes/credentials de sus owners.
- Ejecutar migrations/backfills por owner y registrar evidencia; no redefinir schemas o pricing.
- Terminalizar/superseder los cinco reconcile stale por primitive gobernada y medir queue age sólo sobre trabajo
  reclamable.
- Implementar por build units ADR-008: derivative contract/workers, Range gateway, feed projection y
  lifecycle reconciler/GC. El worker de governance y el web/BFF no absorben transforms.

### Slice 3 — Promotion, canary and recovery

- Reader/preflight y operator promotion command con lock, approvals, canary, kill switches y rollback.
- Promover las siete rutas restantes con review/proposal/binding/circuit/canary exacto e independiente.
- Fijar severidad/condición accionable de `globe_worker_failed` y verificar su runbook/payload saneado.
- Live E2E, backup/restore rehearsal y handoff a `TASK-1480`.

## Out of Scope

- Implementar ledger, balance, pricing o settlement (`TASK-1468`/`TASK-1482`).
- Implementar members/grants/tenancy (`TASK-1511`) o nuevos provider/modalities (`TASK-1504` y owners de provider).
- Resolver todos los build units de ADR-008 dentro de un único worker, servicio o cambio indivisible.
- CDN, URLs públicas, adaptive streaming HLS/DASH o retención destructiva sin ADR posterior.
- Asumir que internal rollout, una env var o code complete equivalen a commercial ready.

## Detailed Spec

El preflight devuelve por gate `pass|fail|not-ready`, evidence reference y config version. Incluye identidad,
ledger/provider, rutas exactas, sesión, queue truth, alertas y las fitness functions de ADR-008. Promotion sólo
procede si todos los gates obligatorios pasan sobre el mismo deployment/config; la evidencia stale o de otro
ambiente no sirve. Rollback corta tráfico/capabilities/spend antes de revertir código y nunca borra
ledger/audit/media authority.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0A y 0B → Slice 1 → Slice 2 → Slice 3. ADR-008 permite planificar sus build units, pero ningún rollout
comercial empieza sin 0B. `TASK-1480` recibe evidencia sólo después del live canary y rollback rehearsal.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ambiente comparte identidad/data/secrets | infra/security | medium | isolation matrix + IaC/readback | resource principal aparece en dos stages |
| Spend sin ledger | finance/provider | high | ledger gate + deny pre-submit | provider submit sin reservation |
| Tenant/identity fallback interno | identity/data | medium | no fallback + cross-tenant E2E | internal binding en commercial |
| Originales saturan memoria/latencia | media/runtime | high | derivados + Range/backpressure | memoria crece con asset/concurrencia |
| Pending se expone como elegible | governance/feed | high | projection matrix ADR-008 | bytes servidos antes de eligibility |
| GC elimina media referenciada | storage/data | high | mark/sweep + grace/holds/preconditions | delete sin mark/evidence |
| Promotion parcial | release/ops | medium | preflight snapshot + lock + canary/rollback | config/deploy evidence mismatch |

### Feature flags / cutover

Commercial runtime disabled por defecto; flags/capability grants/provider routes y traffic se promueven por etapas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0A/0B | mantener internal y no provisionar/cutover; superseder ADR sólo mediante nueva decisión | n/a | sí |
| 1 | disable stage; revert config/IaC additive según plan aprobado | medido en rehearsal | sí/parcial |
| 2 | grants/routes/media workers OFF; preservar originales/ledger/audit y reconciliar jobs | medido en rehearsal | parcial |
| 3 | traffic/capabilities OFF + rollback deploy/config | medido en rehearsal | sí con data reconciliation |

### Production verification sequence

1. Cerrar el gate commercial 0B y validar matriz de aislamiento/config local; ADR-008 ya está aceptado.
2. Provisionar stage aislado; readback de IAM/secrets references/data/storage y migrations.
3. Ejecutar E2E identity/tenant/ledger/provider/governance/media delivery y negativos de
   cross-tenant/spend/session/eligibility.
4. Probar derivados Image/Video/Audio, Range `206/416`, memoria acotada, feed pending/eligible y GC
   dry-run/apply.
5. Rehearsal de backup/restore, provider/media kill switches y rollback.
6. Canary allowlisted de cada ruta exacta; revisar signals y entregar evidence pack a `TASK-1480`.
7. Promover sólo con sign-off; stop/escalate ante cualquier gate no-pass.

### Out-of-band coordination required

Decisión de hosting/front door, GCP/IAM/DNS, OAuth, provider credentials/accounts, Finance/ledger, Security y Release.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Globe arranca en la etapa comercial aceptada sólo con config completa/aislada y falla cerrado si falta un gate.
- [ ] E2E prueba identity→tenant→ledger→provider→governance→derivative→feed/stream→settlement/cancel sin usar spend fence como ledger.
- [x] Sesión expirada ofrece reautenticación visible y recupera feed/viewer sin repetir el command de gasto.
- [x] Reconcile terminal queda superseded/terminal y queue age mide sólo trabajo reclamable, con backfill gobernado.
- [ ] Thumbnail/poster/transcode/waveform, Range real y feed visibility cumplen ADR-008 para las tres modalidades.
- [ ] Orphan GC prueba inventory, dry-run, grace/holds, generation preconditions y apply auditado sin SQL manual.
- [ ] Las diez rutas tienen review/proposal/binding/circuit/canary exacto; una ruta no hereda evidencia de otra.
- [x] `globe_worker_failed` tiene severidad/condición accionable y payload/runbook verificados.
- [ ] IAM/secrets/data/storage/providers están aislados y verificados sin exponer valores.
- [ ] Canary, recovery/restore y rollback tienen evidencia live; `TASK-1480` consume el pack antes del readiness final.

## Verification

- `pnpm task:lint --task TASK-1521`
- `pnpm check` y config/IaC validation en `../efeonce-globe`.
- E2E staging/commercial canary, Range/load/GC, negative gates, backup/restore y rollback rehearsal.

### Evidencia internal-only — 2026-07-23

- Globe `main=f9839ee4260b`; CI `30016235049` y deploy Studio `30016248480` verdes; revisión
  `globe-studio-internal-00050-m5n` al 100%.
- Worker `main=8d7ecb189185`; deploy `30015312280` verde. Primer tick: `supersededReconciles=6`,
  `queueOldestAgeSeconds=0`; siguiente tick: `0/0`. No hubo SQL manual.
- Monitoring live: `Globe Producer worker: failure=ERROR`; `queue age=WARNING`.
- Smoke humano en la pestaña Chrome autenticada del CEO: dos recuperaciones
  `sesión expirada → Entrar nuevamente → /producer`, feed de 10 piezas, viewer final con un `img`, un `video`
  visible con controles y un `audio` visible con controles; las tres descargas publicaron confirmación.
- Estado honesto: **internal ready en estos gates; TASK-1521 sigue in-progress**. No se probaron las siete rutas
  restantes, el perfil comercial/aislamiento, derivados/Range/GC, restore ni rollback comercial.

### Auditoría de promoción exacta — 2026-07-23

- Cloud SQL confirma que sólo las tres rutas base tienen `evaluation report → signed review → candidate/promoted`,
  rights exactos, binding y circuito. Para las otras siete no existen aún esos artefactos; no se fabricaron ni se
  heredaron por provider/familia.
- Seis rutas tienen adapter/endpoint/result driver durable, pero carecen de evidencia/fixture/canary exactos.
  `ref/motion/reference-v1` tiene además un bloqueo estructural: Gemini Omni no está compuesto en el worker
  gobernado, no tiene endpoint/result driver durable, secret/IAM del worker ni región `global` autorizada.
- Voice Changer y Dubbing no declaran todavía `fidelityContract`; Seed Audio es la ruta más cercana, con fixture y
  terms packet exactos, pero sus restricciones siguen `internal-evaluation-only` y `no-client-delivery`.
- El tooling Globe ahora publica una matriz machine-readable de las siete rutas y separa controles en fases
  least-privilege: `stage` (rights → binding disabled → circuit open), `promote` (checker independiente),
  `activate` (readback → binding enabled → circuit closed) y `rollback` (circuit open → binding disabled).
  El aggregate durable/recovery queda en `TASK-1527`.
- Build units registrados: `TASK-1527` promoción/recovery, `TASK-1528` derivados/Range y `TASK-1529`
  lifecycle/orphan GC. `TASK-1525`/`TASK-1526` conservan feed y UI.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog y architecture/decision index se sincronizaron al cerrar.
- [ ] Evidence pack de config/IAM/secrets/migrations/identity/tenant/ledger/provider/media/recovery quedó referenciado.
- [ ] Estado reportado honestamente: internal ready, code complete/rollout pending o commercial ready.

## Follow-ups

- `TASK-1480` mantiene el gate de readiness externo y recibe la evidencia, no se duplica.
- `TASK-1527` posee la operación durable de promoción y rollback.
- `TASK-1528` y `TASK-1529` implementan los build units separados de media delivery y GC de ADR-008.
- `TASK-1525` y `TASK-1526` poseen proyección live y feed/viewer; no se duplican aquí.

## Open Questions

- ADR-006 V2 sigue siendo el contrato de tenancy. El runtime interno ya permitió procesar las tres modalidades;
  falta evidencia del perfil comercial y negativos multi-workspace, no “desbloquear el primer asset”.
- Slice 0B aún debe resolver el host/front door y vocabulario exacto de etapas comerciales; esta task no inventa
  esa decisión ni abre clientes externos antes de `TASK-1480`.
- Los valores exactos de perfiles/SLO multimedia se fijan por canary en los build units de ADR-008, no se adivinan
  en esta task integradora.
