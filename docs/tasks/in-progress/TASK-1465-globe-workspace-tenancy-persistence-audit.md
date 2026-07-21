# TASK-1465 — Globe Workspace, Tenancy, Persistence and Audit

## Delta 2026-07-20 — ADR-004 designa esta task como el gate durable de HA de Globe

**ADR-004** (`TASK-1506`, complete) fija que `globe-studio-internal` NO puede subir `maxScale > 1` mientras
sesiones, transacciones OAuth, experimentos, evaluaciones y spend fence sigan en memoria — y hard-gatea ese salto en
**esta task**. Dos implicancias load-bearing: (1) el **store durable de sesión/OAuth** del shell interno vive dentro
del alcance de 1465 (bajo `apps/studio-web`) o en una child task explícitamente nombrada — resolverlo al planificar;
(2) `TASK-1507` (front door) preserva `maxScale=1` a propósito y no toca este gate. HA de Globe = esta task, no el
hosting.

## Delta 2026-07-20 — recalibración de ejecución (Discovery + decisiones del operador)

Discovery en `efeonce-globe` (3 recons read-only) fijó la realidad y el operador aprobó el rumbo:

- **No existe DB alguna hoy** — 0 pg/CloudSQL/ORM/migraciones; `packages/database` es stub de 14 líneas
  solo-tipos; Terraform sólo provisiona buckets GCS. La app se niega a arrancar fuera de `internal_smoke`
  (`apps/studio-web/src/app.ts:278` → `throw 'globe_memory_store_forbidden'`). Por eso todo está en memoria:
  **no hay dónde escribir**.
- **Datastore decidido (operador):** un **Cloud SQL Postgres** propio de Globe (jamás compartido con Greenhouse),
  tier chico (`db-g1-small`, ZONAL, sin HA), **keyless** (runtime SAs autentican como usuarios IAM de Postgres vía
  el Cloud SQL connector; cero password en el path). Costo fijo aceptado (~US$15–30/mes). Alternativa Firestore
  (scale-to-zero) descartada por el fence transaccional + consistencia con el stack Postgres.
- **Alcance decidido (operador): sólo el core de HA.** Provisionar la DB + hacer durables los 5 stores detrás de
  sus ports actuales + **spend fence durable** (para que `maxScale>1` no quede además colgado de `TASK-1468`) +
  audit append-only mínimo + relajar el guard `globe_memory_store_forbidden` para el path durable. El **modelo rico
  de workspace/members/grants persistidos se DIFIERE** a una task follow-up (hoy el `workspaceId` =
  `greenhouse-org:<clientId>` derivado del broker funciona para el piloto interno).
- **Límite con TASK-1468 (registrado):** 1465 hace durable el **spend fence de seguridad** (reserve/settle/release
  cross-réplica atómico, requisito de correctitud a `maxScale>1`); 1468 construye encima el **credit ledger comercial**
  append-only. No se conflacionan.

Las slices de Zone 3 abajo quedan recalibradas a este plan concreto. Fuera de alcance explícito: la entidad
workspace + members + grants persistidos (task follow-up).

## Delta 2026-07-21 — código completo + verificado en vivo; deploy del servicio pendiente

Las 5 slices están implementadas en `efeonce-globe` (2 commits en `main`) y **verificadas contra Postgres 16.14 real**,
con el monorepo entero verde (`pnpm check` + `pnpm build`):

- **Slice 0** — Cloud SQL `globe-pg` (keyless IAM, connector-only) aplicado (`12 added / 0 destroyed`).
- **Slice 0b/0c** — cliente `packages/database` (pool + tx) + bootstrap de roles (`globe_owner`, sin credencial
  superusuario permanente) + runner de migraciones (idempotente).
- **Slice 1** — schema durable: 6 tablas tenant-scoped (`experiments`, `evaluation_reports`, `human_sessions`,
  `oauth_transactions`, `spend_fence_runs/days`, `audit_log`), owner `globe_owner`, DML keyless para las runtime SAs.
- **Slice 2** — los 5 stores durables detrás de sus ports: `DurableExperimentStore`, `DurableEvaluationReportStore`,
  `DurableSpendFence` (reserve/settle/release atómico cross-réplica), y el split del `InternalSmokeSessionStore` en
  `SessionStorePort` async (memoria + durable). Aislamiento cross-tenant, idempotencia y caps verificados en vivo.
- **Slice 3** — wiring por DI en `app.ts` (`main.ts` construye los stores durables cuando `GLOBE_POSTGRES_*` está
  seteado) + guard relajado (`in-memory` solo en `internal_smoke`; durable puede arrancar en cualquier env). 39 tests
  de studio-web verdes.
- **Slice 4** — `DurableAuditLog` append-only + suite hermética `node --test`.

**Rollout pendiente (Runtime Rollout Completion Gate).** El código está completo y verificado contra la DB viva, pero
el **servicio Cloud Run `globe-studio-internal` NO está redesplegado** con `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` /
`GLOBE_POSTGRES_DATABASE` / `GLOBE_POSTGRES_USER` (el usuario IAM `web_runtime`), así que la instancia en ejecución
sigue en memoria (`internal_smoke`). Pasos que faltan, gated y con autorización explícita del operador:
1. Redeploy de `studio-web` (`deploy-internal.yml`, workflow_dispatch) con los env `GLOBE_POSTGRES_*` → verificar en
   vivo que arranca durable (sesión/OAuth/experimentos persisten a través de un restart).
2. **Sólo después**, subir `maxScale > 1` (el objetivo de HA que ADR-004 gatea en esta task) — es una acción separada
   post-deploy-verificado, no parte de este código.

Estado correcto hoy: **`code complete, rollout pendiente`** — no marcar operativamente completo hasta el deploy.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `platform|data|identity`
- Blocked by: `TASK-1464, TASK-1481`
- Branch: `task/TASK-1465-globe-workspace-tenancy-persistence-audit`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar workspace tenancy, persistencia, commands/readers y audit append-only como base del dominio Globe.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Aislar cada workspace y disponer de primitives server-side antes de construir el workbench.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1464`, `TASK-1481`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/database/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/contracts/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Workspace, Tenancy, Persistence and Audit`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `workspace/member/grant commands and readers, tenant-scoped API schemas and capability coverage`
- Backward compatibility: `gated`
- Full API parity: `workspace/grant primitives extienden TASK-1481 y se prueban por private API/SDK antes de UI/MCP`

### Data model and invariants

- Entidades/tablas/views afectadas: `sólo agregados Globe definidos por la migración/contrato aceptado de esta task`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version explícitos y audit append-only`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `keys durables, preconditions y locks/fences proporcionales al write externo o financiero`
- Audit/outbox/history: `actor, correlation, intento, decisión, estado y error sanitizado; secretos y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno salvo plan explícito y reversible aprobado en ejecución`
- Rollback path: `kill switch, revert de adapter/consumer y reconciliación desde audit`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capability por actor, workspace y acción; WIF/ADC sin llaves persistidas`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, rate limit, concurrency cap, timeout, retry acotado y circuit breaker`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo allow/deny/replay/revoke y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, route, attempt, latency, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

Recalibrado (Delta 2026-07-20) al **core de HA**. Cada slice es un entregable committeable en `efeonce-globe`.

### Slice 0 — Datastore Cloud SQL (Terraform)

- `infra/terraform/cloud_sql.tf`: `google_sql_database_instance` Postgres 16, `southamerica-west1`, tier
  `db-g1-small`, ZONAL, `cloudsql.iam_authentication=on`, connector-only (ipv4 sin authorized networks, SSL),
  backups + PITR 7d, `deletion_protection` + `prevent_destroy`.
- `google_sql_database` `globe`; `google_sql_user` IAM (keyless) para `api_runtime`, `web_runtime`, `deployer`.
- `sqladmin.googleapis.com` en `enabled_services`; roles `cloudsql.client` + `cloudsql.instanceUser` a los 3 SAs.
- Outputs `postgres_instance_connection_name` / `postgres_database_name`. `tofu validate` + `plan` aditivo (0
  destroy/replace de identidad viva) → apply.

### Slice 0b — Cliente DB real + tooling de migración

- `packages/database`: cliente Postgres real detrás del connector Cloud SQL (IAM auth keyless), pool per-runtime,
  impl de `TransactionPort`, y un migrador SQL-first mínimo (Node nativo, sin ORM pesado). Config por env
  (`GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` / `GLOBE_POSTGRES_DATABASE`), server-only.

### Slice 1 — Schema durable tenant-scoped

- Migraciones para: `experiments`, `evaluation_reports`, `human_sessions`, `oauth_transactions`,
  `spend_fence` (runs + day-caps), `audit_log` (append-only). Toda tabla lleva `workspace_id`; keys/índices por
  `(workspace_id, id)`; columnas `expires_at` para sesiones/OAuth; CHECK/constraints de invariantes.

### Slice 2 — Impls durables detrás de los ports

- Impls Postgres de `ExperimentStorePort`, `EvaluationReportStorePort`, `SpendFencePort` (reserve/settle/release
  atómico cross-réplica), y partir `InternalSmokeSessionStore` en `SessionStorePort` + `OAuthTransactionStorePort`
  durables. Sin tocar callsites (los ports ya toman `workspaceId`).

### Slice 3 — Wiring + relajar el guard

- `apps/studio-web/src/app.ts`: inyectar las impls durables cuando hay DB configurada; relajar
  `globe_memory_store_forbidden` para permitir el path durable fuera de `internal_smoke` (in-memory sigue vetado
  para prod). `maxScale=1` se mantiene (subirlo es decisión posterior, no de esta task).

### Slice 4 — Audit append-only + tests negativos

- Sink de audit durable append-only (actor/correlation/decisión/estado/error sanitizado; sin secretos/PII) cableado
  en el dispatch. Tests negativos: aislamiento cross-tenant (get de otro workspace → miss), idempotencia,
  reserve/settle bajo concurrencia, expiración de sesión/OAuth.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1465 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga cross-tenant o lógica duplicada | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | query sin workspace predicate |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Toda fila y operación queda ligada a studio_workspace_id.
- [ ] Tests negativos demuestran ausencia de acceso cross-tenant.
- [ ] UI, SDK y agentes consumen los mismos commands/readers.
- [ ] Negative paths demuestran que HTTP/SDK/body/headers no pueden elegir otro workspace ni elevar grants.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1465`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
