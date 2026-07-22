# TASK-1521 — Globe Commercial Runtime Enablement

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseño gobernado; runtime no-internal continúa bloqueado por contrato y readiness`
- Rank: `TBD`
- Domain: `creative|platform|identity|finance|ops`
- Blocked by: `none`
- Branch: `task/TASK-1521-globe-commercial-runtime-enablement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir Globe de runtime `internal_smoke` a una plataforma capaz de operar una etapa comercial explícita y
aislada. Esta task integra environment/config, identity/tenant, ledger, providers, IAM/secrets, migrations,
observability y promotion/rollback gates; no reimplementa ninguno de esos dominios.

## Why This Task Exists

La configuración actual rechaza ambientes distintos de `internal_smoke` y la decisión de hosting comercial sigue
diferida. Cambiar una env var no crea aislamiento, identidad, tenancy, contabilidad, provider credentials ni
evidencia operacional. Sin un owner de integración, código completo podría confundirse con producto comercial
operativo.

## Goal

- Contrato versionado de etapas/runtime no-internal con validación fail-closed y configuración aislada.
- Integrar evidencia de identity/tenant, ledger y providers sin duplicar sus sources of truth.
- Promotion preflight, canary, rollback y live verification que mantengan `internal ready` separado de `commercial ready`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`

Reglas obligatorias:

- La etapa comercial y su host/front door se resuelven mediante la decisión/ADR aplicable antes del cutover.
- Ambientes no comparten DB, buckets, sessions, service identities, provider credentials ni secrets por comodidad.
- Esta task consume tenancy `TASK-1511`, ledger `TASK-1468`/`TASK-1482` y provider routes; no redefine sus modelos.
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

### Gap

- `readStudioRuntimeConfig` hard-blockea todo ambiente no `internal_smoke`.
- No hay matriz comercial aceptada de config/isolation/secrets/IAM/migrations/providers/ledger ni promotion evidence.
- El host/framework/front door comercial sigue siendo decisión diferida.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `config/runtime/infra/workflows en efeonce-globe; gates de identidad/ledger/providers por contrato`
- Future candidate home: `remain-shared`
- Boundary: `commercial runtime profile + readiness preflight; sources of truth permanecen en sus domains dueños`
- Server/browser split: `config, secrets, IAM, ledger/provider wiring server-only; browser recibe capabilities públicas`
- Build impact: `infra/workflows/migrations/runtime config; no provider SDK en transports`
- Extraction blocker: `hosting decision, environment isolation y gates coordinados identity/tenant/ledger/provider`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `runtime environment/config and promotion evidence; no reemplaza domain SoTs`
- Consumidores afectados: `web/BFF, private API, runner, DB/storage, identity, ledger, providers, operations`
- Runtime target: `staging/commercial stage definidos por decisión aceptada; internal_smoke preservado`

### Contract surface

- Contrato existente a respetar: `readStudioRuntimeConfig`, Cloud Run/IaC/deploy, broker/tenancy, ledger y provider registry.
- Contrato nuevo o modificado: `versioned commercial runtime profile + readiness/preflight result + promotion state`.
- Backward compatibility: `gated; internal_smoke no cambia y commercial falla cerrado si falta un gate`.
- Full API parity: `runtime readiness es reader/operator command gobernado; no un hidden UI switch`.

### Data model and invariants

- Entidades/tablas/views afectadas: `environment/promotion evidence y migrations de domains dueños [confirmar]`.
- Invariantes que no se pueden romper:
  - `cada ambiente tiene identities, secrets, storage/data y provider config aislados`.
  - `commercial spend requiere ledger authority; spend fence nunca se presenta como balance`.
  - `tenant/actor vienen de identity/tenancy canónicos; no modo single-tenant oculto`.
- Tenant/space boundary: `broker + TASK-1511; preflight exige evidencia de aislamiento`.
- Idempotency/concurrency: `promotion/cutover con operation id, compare-and-set y lock de ambiente`.
- Audit/outbox/history: `append-only de preflight, approvals, config version, deploy, rollback y live checks`.

### Migration, backfill and rollout

- Migration posture: `coordinada/aditiva; cada domain conserva ownership de sus migrations`.
- Default state: `commercial disabled/fail-closed`.
- Backfill plan: `por domain, dry-run/allowlist según task dueña; esta task sólo orquesta evidencia`.
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
- Integration checks: `identity→tenant→estimate→ledger reserve→provider→asset→settle happy/negative/cancel`.
- Reliability signals/logs: `environment readiness, gate outcomes, queue/provider/ledger health, correlation`.
- Production verification sequence: `decision → isolated stage → migrations/secrets/IAM → canary → rollback rehearsal → promotion approval → live verify`.

### Acceptance criteria additions

- [ ] `internal_smoke` y commercial profiles son explícitos; un gate faltante bloquea boot/promotion.
- [ ] Identity/tenant/ledger/provider evidence viene de owners canónicos, no mocks ni duplicados.
- [ ] Recovery/rollback y live canary se ejercitan antes de declarar commercial ready.

## Capability Definition of Done — Full API Parity gate

- [ ] Readiness/preflight es reader canónico y promotion es operator command autorizado/auditado/idempotente.
- [ ] Ningún consumer puede saltar gates mediante env/UI payload.
- [ ] Coverage/grants y errores sanitizados tienen conformance.
- [ ] Estado ready referencia evidencia verificable, no boolean manual sin provenance.

<!-- ZONE 2 — PLAN MODE: Discovery produce plan.md; no se llena al crear. -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — ADR/gate del commercial surface

- Resolver/revalidar host, framework, front door, origin/session y environment vocabulary por decisión aceptada.
- Congelar matriz de aislamiento y owners; no provisionar antes de cerrar el boundary.

### Slice 1 — Runtime profile and isolated foundations

- Hacer config versionada capaz de representar la etapa elegida y fallar cerrado por campo/gate faltante.
- Provisionar/configurar identities, IAM, secrets, data/storage, observability y deploy sin compartir con internal.

### Slice 2 — Domain gate integration

- Integrar broker/tenancy de `TASK-1511`, ledger de `TASK-1468`/`TASK-1482` y provider routes/credentials de sus owners.
- Ejecutar migrations/backfills por owner y registrar evidencia; no redefinir schemas o pricing.

### Slice 3 — Promotion, canary and recovery

- Reader/preflight y operator promotion command con lock, approvals, canary, kill switches y rollback.
- Live E2E, backup/restore rehearsal y handoff a `TASK-1480`.

## Out of Scope

- Implementar ledger, balance, pricing o settlement (`TASK-1468`/`TASK-1482`).
- Implementar members/grants/tenancy (`TASK-1511`) o nuevos provider/modalities (`TASK-1504` y owners de provider).
- Asumir que internal rollout, una env var o code complete equivalen a commercial ready.

## Detailed Spec

El preflight devuelve por gate `pass|fail|not-ready`, evidence reference y config version. Promotion sólo procede
si todos los gates obligatorios pasan sobre el mismo deployment/config; la evidencia stale o de otro ambiente no
sirve. Rollback corta tráfico/capabilities/spend antes de revertir código y nunca borra ledger/audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 → Slice 1 → Slice 2 → Slice 3. `TASK-1480` recibe evidencia sólo después del live canary y rollback rehearsal.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ambiente comparte identidad/data/secrets | infra/security | medium | isolation matrix + IaC/readback | resource principal aparece en dos stages |
| Spend sin ledger | finance/provider | high | ledger gate + deny pre-submit | provider submit sin reservation |
| Tenant/identity fallback interno | identity/data | medium | no fallback + cross-tenant E2E | internal binding en commercial |
| Promotion parcial | release/ops | medium | preflight snapshot + lock + canary/rollback | config/deploy evidence mismatch |

### Feature flags / cutover

Commercial runtime disabled por defecto; flags/capability grants/provider routes y traffic se promueven por etapas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | mantener internal y no provisionar/cutover | n/a | sí |
| 1 | disable stage; revert config/IaC additive según plan aprobado | medido en rehearsal | sí/parcial |
| 2 | grants/routes OFF; preservar ledger/audit y reconciliar jobs | medido en rehearsal | parcial |
| 3 | traffic/capabilities OFF + rollback deploy/config | medido en rehearsal | sí con data reconciliation |

### Production verification sequence

1. Cerrar decisión y validar matriz de aislamiento/config local.
2. Provisionar stage aislado; readback de IAM/secrets references/data/storage y migrations.
3. Ejecutar E2E identity/tenant/ledger/provider y negativos de cross-tenant/spend/no-gate.
4. Rehearsal de backup/restore, provider kill switch y rollback.
5. Canary allowlisted; revisar signals y entregar evidence pack a `TASK-1480`.
6. Promover sólo con sign-off; stop/escalate ante cualquier gate no-pass.

### Out-of-band coordination required

Decisión de hosting/front door, GCP/IAM/DNS, OAuth, provider credentials/accounts, Finance/ledger, Security y Release.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Globe arranca en la etapa comercial aceptada sólo con config completa/aislada y falla cerrado si falta un gate.
- [ ] E2E prueba identity→tenant→ledger→provider→asset→settlement/cancel sin usar spend fence como ledger.
- [ ] IAM/secrets/data/storage/providers están aislados y verificados sin exponer valores.
- [ ] Canary, recovery/restore y rollback tienen evidencia live; `TASK-1480` consume el pack antes del readiness final.

## Verification

- `pnpm task:lint --task TASK-1521`
- `pnpm check` y config/IaC validation en `../efeonce-globe`.
- E2E staging/commercial canary, negative gates, backup/restore y rollback rehearsal.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog y architecture/decision index se sincronizaron al cerrar.
- [ ] Evidence pack de config/IAM/secrets/migrations/identity/tenant/ledger/provider/recovery quedó referenciado.
- [ ] Estado reportado honestamente: internal ready, code complete/rollout pending o commercial ready.

## Follow-ups

- `TASK-1480` mantiene el gate de readiness externo y recibe la evidencia, no se duplica.

## Open Questions

- Slice 0 debe resolver el host/front door y vocabulario exacto de etapas; esta task no inventa esa decisión.
