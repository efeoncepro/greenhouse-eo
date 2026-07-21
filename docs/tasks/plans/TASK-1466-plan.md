# Plan — TASK-1466 Globe Operating Modes and Responsibility Contract

## Discovery summary

- `TASK-1465` está completa, desplegada y verificada; su blocker en TASK-1466 era metadata stale y fue retirado.
- Globe ya tiene Postgres durable, migration runner SQL-first, `audit_log`, trusted context, registry de
  commands/readers, HTTP privado, SDK tipado y conformance. La implementación debe extender esos seams.
- El ADR de plataforma ya acepta `client-operated | co-operated | efeonce-managed` como accountability por
  run/lane, nunca como tier ni grant. No hace falta una ADR nueva; sí una spec técnica versionada.
- `TASK-1511` no bloquea: esta task guarda accountability y actor refs; no crea workspace/member/grant ni altera
  `workspaceBindings`. Un assignment nunca participa en autorización.
- El runtime no tiene aún un aggregate de run gobernado (TASK-1469). El scope `run` usa un id opaco y tenant-scoped,
  sin FK inventada; el default de workspace permite resolver `effective` y un override de run puede aparecer después.
- El envelope ya exige `idempotencyKey`, pero el handler no la recibe. Se extenderá el command metadata del registry
  de forma backward-compatible para que el nuevo store pueda hacer replay durable sin duplicar lógica en transporte.

## Audit

### Supuestos correctos

- Un solo producto usa tres modos; cambiar modo conserva contexto y no concede authority.
- Antes de gastar, el sistema debe resolver operator, creative/budget approvers, template/rights authority y
  delivery owner/approver.
- UI, HTTP, SDK, MCP y agentes deben converger en commands/readers del spine.

### Supuestos desactualizados

- TASK-1466 declaraba TASK-1465 como blocker aunque ya está completa → corregido antes del hook.
- La task describía provider budget/circuit breaker y canary, pero aquí no hay provider call → contrato recalibrado
  a migración, optimistic concurrency, idempotency y audit.
- La derivación de workspace aún comenta que TASK-1465 la reemplazaría; el modelo rico quedó realmente diferido a
  TASK-1511. TASK-1466 conserva el workspace string broker-derived y no intenta resolver ese drift.

### Arquitectura / docs obligatorios

- `EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_{DECISION,ARCHITECTURE}_V1.md` → modos y roles semánticos aceptados.
- `creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` → Full API Parity, trusted context y coverage.
- `creative-studio/PLATFORM_FOUNDATION_V1.md` + SPEC-007 durable persistence → stores, migrations y audit.
- Business Model V1 → tres ejes independientes y combinación Staff Augmentation × efeonce-managed inválida.

### Código existente para reutilizar

- `packages/contracts/src/index.ts` → vocabulary, envelopes y coverage.
- `packages/domain/src/index.ts` → trusted context, capability registry y error mapping.
- `packages/database/src/index.ts` + `migrate.ts` → pool/transacción y migraciones numeradas.
- `packages/database/src/stores/audit-log.ts` → schema/semántica append-only a reutilizar en la misma transacción.
- `apps/studio-web/src/{app,dispatch,main}.ts` → registry, auth, transporte y DI.
- `packages/sdk/src/index.ts` → métodos tipados sobre el command/reader genérico.

### Schema / runtime real

- Cloud SQL `globe-pg`, schema `globe`; migración vigente `0001_init.sql` con seis aggregates/store families y
  `audit_log`. Nueva migración aditiva `0002_operating_responsibilities.sql`.
- Ambos servicios pueden usar stores durables inyectados; no se hará deploy ni migración live sin autorización.

### Access model

- `routeGroups/views/startup policy`: no aplican en Globe.
- `capabilities`: nacen `globe.responsibility.manage` y `globe.responsibility.read`.
- El internal service principal recibe ambos grants para el carril internal-only; humanos sólo los reciben cuando
  el broker los emita por una task/gate posterior. El modo/assignment nunca muta capabilities.

### Skills

- `greenhouse-task-execution-hook` → lifecycle, checkpoint y closure.
- `greenhouse-globe` → boundary, spine, persistencia y verificación del repo hermano.
- `software-architect-2026` → forma/ADR; concluye que el ADR aceptado existente es suficiente.
- Al cierre: `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

### Subagent strategy

`sequential`: no hay autorización para subagentes y contracts/domain/store/wiring comparten tipos y orden causal.

### Riesgos / blast radius

- Un cambio al handler metadata afecta todos los commands: debe ser aditivo y cubrirse con regresión completa.
- Idempotencia débil podría duplicar versiones/audit; se resuelve dentro de una transacción durable.
- Actor refs aún no son memberships: se almacenan como accountability y nunca se usan para authorize.
- Aplicar la migración o desplegar amplía runtime; quedan fuera hasta autorización separada.

### Open questions resueltas

- Scope sin run aggregate → `workspace | run` con id opaco tenant-scoped; sin FK hasta TASK-1469.
- `co-operated` → no admite party “both”; cada responsabilidad tiene un único party/actor de record.
- Commercial context → delivery model + engagement form + referencia contractual opaca; sin precio, moneda o margen.
- Compatibilidad inválida → Staff Augmentation + `efeonce-managed` falla `invalid_request`.

## Architecture decision

- ADR existente: Efeonce Creative Studio Agentic Platform Decision V1, Delta “un Studio, tres modos”.
- ADR nueva: no requerida; la decisión one-way ya está aceptada y el schema es aditivo/local a Globe.
- Spec técnica a crear: `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`.

## Backend/data contract

- Source of truth: snapshots append-only en Globe Postgres, nunca Greenhouse ni el broker.
- Aggregate: `OperatingResponsibilityAssignmentV1`, scope `workspace|run`, version monotónica.
- Roles: brief authority, operator of record, creative approver, budget approver, template authority, rights
  authority, delivery owner y delivery approver; cada uno tiene party + actor ref explícito.
- Commands: `assign` (version 1) y `change` (expectedVersion); readers: `get`, `effective`, `history`.
- Transaction: lock por workspace/scope, replay por idempotency key + request fingerprint, insert snapshot + audit.
- Migration: aditiva, sin backfill; ausencia falla cerrado. Rollback de code/wiring preserva historia.
- Runtime evidence: local tests obligatorios; Cloud SQL readback/deploy/smoke se ejecutan sólo con autorización.

## Execution order

1. **Spec + migration.** Documentar aggregate/invariantes y crear `0002_operating_responsibilities.sql`.
2. **Contracts.** Agregar vocabulary, schemas, commands/readers y capabilities browser-safe.
3. **Domain.** Crear port/store in-memory, validators/policy, assign/change/get/effective/history y registry wiring;
   extender command metadata para idempotency sin romper handlers existentes.
4. **Database.** Implementar store durable transaccional con replay/conflict/version monotónica + audit atómico.
5. **Runtime/SDK.** Inyectar/register store, grants internal-only, error mapping y métodos SDK tipados.
6. **Conformance.** Probar assign/change/read, replay estable, payload conflict, expectedVersion conflict, deny,
   cross-workspace, coverage y que cambiar modo no altera capabilities.
7. **Verification/closure.** `pnpm check && pnpm build` en Globe; task/ops/QA/docs gates en Greenhouse; no cerrar
   hasta aplicar y verificar migración/deploy/smoke internal-only o declarar explícitamente el rollout pendiente.

## Files to create

- `../efeonce-globe/packages/domain/src/responsibility.ts`
- `../efeonce-globe/packages/domain/src/responsibility.test.ts`
- `../efeonce-globe/packages/database/migrations/0002_operating_responsibilities.sql`
- `../efeonce-globe/packages/database/src/stores/responsibility-store.ts`
- `../efeonce-globe/packages/database/scripts/verify-responsibility-migration.mjs`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`

## Files to modify

- `../efeonce-globe/packages/contracts/src/{index.ts,index.test.ts}` — wire contract/capabilities.
- `../efeonce-globe/packages/domain/{package.json,src/index.ts}` — exports, metadata y tests.
- `../efeonce-globe/packages/database/src/{index.ts,index.test.ts}` — durable store export/tests.
- `../efeonce-globe/apps/studio-web/src/{app.ts,main.ts,dispatch.ts,conformance.test.ts}` — DI, registry, grants/error.
- `../efeonce-globe/packages/sdk/src/{index.ts,index.test.ts}` — métodos tipados.
- `../efeonce-globe/scripts/smoke-private-api.mjs` — lane de smoke live opt-in sobre el mismo SDK.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — secuencia exacta de migración/readback/deploy/smoke.
- Task, EPIC/README/changelog/Handoff canónicos en Greenhouse al cierre.

## Files to delete

- Ninguno.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Focal `node --test` de contracts/domain/database/studio-web/sdk mediante scripts de package.
- `pnpm task:lint --task TASK-1466`, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`.
- `pnpm docs:closure-check`; `pnpm docs:context-check:strict` si se actualiza handoff/changelog.

## Checkpoint

- P1 + esfuerzo Medio → aprobación humana obligatoria antes de escribir código o migración.
- Permanecer en `develop` fue autorizado por el goal/hook; no push, deploy, migration apply ni rollout.

## Execution result — 2026-07-21

El operador confirmó implementación y, posteriormente, relanzó el rollout internal-only. Migración `0002`, deploys,
smoke autenticado y readback Cloud SQL pasaron; commits `00fee5d` y `3baafde` quedaron en `efeonce-globe/main`.
No se habilitaron clientes externos ni producción comercial.
