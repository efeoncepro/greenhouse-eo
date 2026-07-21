# TASK-1466 — Globe Operating Modes and Responsibility Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Completa y verificada en runtime internal-only; clientes externos y producción comercial permanecen bloqueados`
- Rank: `TBD`
- Domain: `creative|commercial|data`
- Blocked by: `none`
- Branch: `main` en `efeonce-globe`; `develop` en Greenhouse
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Modelar client-operated, co-operated y efeonce-managed mediante asignaciones explícitas de responsabilidad y contexto comercial inmutable, sin convertir accountability en entitlements.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Cambiar el modo operativo sin perder contexto ni elevar permisos implícitamente.

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

- `TASK-1465` — completa, desplegada y verificada en vivo.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/database/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/{contracts,domain,database} + apps/studio-web; Greenhouse sólo control plane documental`
- Future candidate home: `remain-shared`
- Boundary: `OperatingResponsibilityAssignment versionado por workspace/run; accountability separada de memberships, grants y autorización`
- Server/browser split: `schemas/proyecciones serializables en contracts; policy, stores, Postgres, idempotencia y audit sólo server-side`
- Build impact: `sin package/dependencia nueva; extiende packages existentes y el Dockerfile ya incluye @efeonce-globe/database`
- Extraction blocker: `trusted workspace derivado por el spine + transacción Postgres para version/idempotency/audit; no hay extracción desde Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `assign/change responsibility commands and effective-responsibility readers, versioned by run/workspace`
- Backward compatibility: `gated`
- Full API parity: `mode/responsibility writes use propose-confirm-execute capable commands; surfaces never infer authority locally`

### Data model and invariants

- Entidades/tablas/views afectadas: `responsibility_assignment_versions (nueva, append-only/versionada) + audit_log existente`
- Invariantes que no se pueden romper: `workspace server-derived; scope workspace|run; versión monotónica; replay estable; cambio de modo nunca concede capabilities; cada rol requerido tiene un actor/party explícito`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `unique(workspace_id,idempotency_key) + request fingerprint; expectedVersion + row/advisory lock transaccional; replay devuelve la misma versión y key reutilizada con payload distinto falla conflict`
- Audit/outbox/history: `la misma transacción inserta versión y audit append-only con actor/correlation/decisión/estado; sin secretos, pricing ni payload crudo`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno; ausencia de assignment falla cerrado y no se inventa desde el modo`
- Rollback path: `revert de wiring/capability; la tabla aditiva y su historia permanecen; no hacer DROP tras writes`
- External coordination: `migración/readback Cloud SQL y eventual deploy requieren autorización separada; sin provider/Legal/Finance en el slice de código`

### Security and access

- Auth/access gate: `capabilities finas manage/read desde principal autenticado; assignment describe accountability y jamás actúa como grant`
- Sensitive data posture: `actor refs y contexto comercial sin PII ni pricing; logs/audit redacted; DB server-only`
- Error contract: `invalid_request | not_found | conflict | access_denied; raw DB errors no cruzan la frontera`
- Abuse/rate-limit posture: `idempotency + optimistic concurrency + scope tenant; sin provider call ni gasto en esta task`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migración 0002 + readback tenant-scoped y replay/conflict contra Postgres real cuando el rollout sea autorizado`
- Integration checks: `API/SDK/conformance assign/change/get/effective/history + deny/replay/cross-workspace; sin provider canary`
- Reliability signals/logs: `correlation_id, scope, version, operating_mode, actor y outcome; sin pricing/PII`
- Production verification sequence: `local -> migración/readback sandbox/internal -> deploy internal allowlist -> promoción explícita; nunca clientes externos`

### Acceptance criteria additions

- [x] El contrato programático existe antes que cualquier UI específica.
- [x] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia local y live proporcional.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Definir roles de brief, craft, gasto, rights, review y delivery.

### Slice 2

- Persistir assignments versionados por workspace/run.

### Slice 3

- Exponer readers y guards compartidos.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1466 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Responsabilidad ambigua en una entrega | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | run sin owner o approver requerido |
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

- [x] Cada run declara responsables y aprobadores por función.
- [x] Cambiar modo genera audit y no concede capability por sí mismo.
- [x] El contexto comercial se vincula sin convertirlo en pricing público.
- [x] API/SDK/conformance prueban assign/change/read, deny y replay sobre el mismo audit; ningún consumer cambia
      modo o responsabilidades por DB/config directo.
- [x] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [x] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1466`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

### Evidence 2026-07-21

- `../efeonce-globe`: `pnpm check && pnpm build` — PASS; typecheck, regresión completa y build de los ocho workspaces.
- Dominio: 98 pruebas PASS, incluyendo assign/replay/change/history, override por run, tenant scope, policy inválida,
  optimistic-concurrency conflict y capability denial.
- Database: 15 pruebas PASS; assignment + audit en una transacción, replay sin segundo write, fingerprint conflictivo
  sin write y current read tenant-scoped.
- Studio transport: 40 pruebas PASS; HTTP + SDK tipado prueban assign/change/effective/history, replay correlacionado y
  conflict 409 por key reutilizada y cross-workspace denial sobre el mismo primitive.
- SDK: 5 pruebas PASS; el método tipado usa el dispatch canónico y conserva auth/correlation sanitizados.
- Rollout harness: el smoke canónico `scripts/smoke-private-api.mjs` acepta `GLOBE_SMOKE_RESPONSIBILITY=1`; existe
  readback no mutante `verify:responsibility-migration` para ledger, owner, grants y constraints.
- PostgreSQL 16 efímero: migraciones `0001→0002` aplicadas bajo `SET ROLE globe_owner`; owner verificado, write
  assignment+audit correlacionado y constraints de scope/idempotency fail-closed. Contenedor eliminado y Colima
  restaurado a apagado.
- Canon técnico: `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md` (SPEC-008).
- Commit runtime `00fee5ded505da7c1e276ae32645bb7a8fd2a2be`; fix del smoke `3baafde83156319240c0391640e2c2c7dbbd6e1e`, ambos en `origin/main`.
- CI del head `3baafde`: run `29859476143` PASS (`pnpm check` + `pnpm build`).
- Cloud SQL: migración `0002_operating_responsibilities.sql` aplicada por el migrador IAM; verifier live confirma
  owner `globe_owner`, grants `SELECT/INSERT/UPDATE/DELETE` para API/web runtime y siete constraints.
- Deploys internal-only exitosos: API run `29858616172` y Studio run `29858618168`; revisiones Ready
  `globe-api-internal-00012-lcq` y `globe-studio-internal-00017-4sd`, imagen `00fee5ded505`, `maxScale=3`.
- Smoke autenticado: scope `task-1466-smoke-be28c266-4ff4-473d-9cec-2e286198bdc4`; unauthenticated/wrong audience
  denegados, assign v1, replay estable, replay conflictivo 409, change v2, effective/history y cross-workspace deny.
- Readback Cloud SQL: workspace `greenhouse-org:efeonce`, dos versiones (`co-operated` → `efeonce-managed`) y dos
  auditorías correlacionadas (`responsibility.assign` / `responsibility.change`).
- El grant temporal `roles/iam.serviceAccountTokenCreator` usado para el smoke fue revocado en service account y
  proyecto; readback final no muestra la vinculación. No se habilitaron UI, MCP, clientes externos ni producción.

## Closing Protocol

- [x] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [x] QA release auditor y documentation governor ejecutados.
- [x] Migración, deploy, smoke y readback live registrados; no quedan pendientes dentro del scope internal-only.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
