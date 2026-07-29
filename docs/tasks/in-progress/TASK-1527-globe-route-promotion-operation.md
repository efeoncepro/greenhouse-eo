# TASK-1527 — Globe Route Promotion Operation and Recovery

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Epic: `EPIC-028`
- Status real: `Desplegado internal-only con flag ON: recovery worker + señales + identities disjuntas + canary authority vivos; rehearsal stage→rollback y recovery autónomo verificados live; restauración de binding image + saga promote-from-candidate pendientes`
- Rank: `TBD`
- Domain: `creative|ops|security`
- Blocked by: `none`
- Branch: `task/TASK-1527-globe-route-promotion-operation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un aggregate durable de promoción de rutas que coordine, sin concentrar autoridad, el lifecycle
`planned → controls_staged → readiness_promoted → activated → canary_passed` y sus caminos de fallo/rollback.
Cada fase verifica el readback de derechos, review, binding, circuito y canary desde sus authorities canónicas.

## Why This Task Exists

Los commands individuales de readiness y routing ya tienen CAS, idempotencia e historial append-only, pero el
script actual no registra una operación coordinada. Una falla entre sistemas puede dejar una promoción parcial,
y ningún principal posee correctamente todas las capacidades. TASK-1521 exige recuperación, lock y evidencia
verificable, no una sesión todopoderosa ni una secuencia mantenida en memoria.

## Goal

- Persistir una operación por ruta/workspace con fases, evidence refs, actor y deadlines.
- Mantener maker, reviewer, promoter y routing operator separados.
- Reanudar o revertir una operación parcial de forma idempotente, sin SQL manual.
- Exponer reader/commands transport-neutral y señales de operaciones estancadas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- El aggregate coordina; no reemplaza `model_readiness_*`, `generated_rights_policies`,
  `production_route_binding_revisions` ni `provider_circuit_state_revisions`.
- `stage` publica derechos, binding deshabilitado y circuito abierto; `promote` usa checker independiente;
  `activate` habilita binding y cierra circuito sólo tras readback; rollback abre circuito primero.
- Una fase no acepta evidencia suministrada sólo por el browser; resuelve authorities server-side.
- Ninguna operación promueve una familia/modelo por herencia: la identidad exacta es route/provider/model/version.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/in-progress/TASK-1521-globe-commercial-runtime-enablement.md`

## Dependencies & Impact

### Depends on

- `TASK-1463` readiness, `TASK-1467` rights, `TASK-1470` routing/circuits y `TASK-1469` governed runs.
- El phase split fail-closed de `scripts/producer-ui-canary-lib.mjs` en Globe.

### Blocks / Impacts

- Bloquea la promoción segura de las siete rutas restantes de `TASK-1521`.
- `TASK-1480` consume evidencia final; no es reemplazada.

### Files owned

- `../efeonce-globe/packages/contracts/src/production-promotion-operation.ts`
- `../efeonce-globe/packages/domain/src/production-promotion-operation.ts`
- `../efeonce-globe/packages/database/migrations/`
- `../efeonce-globe/packages/database/src/stores/production-promotion-operation-store.ts`
- `../efeonce-globe/packages/{contracts,domain,database}/src/**generated-rights-polic**`
- wiring API/SDK/worker/IaC y tests focales del mismo aggregate

## Current Repo State

### Already exists

- Readiness, rights, binding y circuit commands son tenant-scoped, CAS e idempotentes.
- La herramienta canary ya separa `stage|promote|activate|rollback` y activa sólo tras readback.

### Gap

- Código local en `../efeonce-globe` ya define operation id, phase history, CAS, leases/fencing, commands/readers,
  store durable, migration aditiva y wiring API/BFF para publicar el aggregate. Sigue pendiente desplegarlo,
  aplicar/verificar migrations en Cloud SQL, asignar grants separados, habilitar worker/recovery, señales y ensayos
  live.
- `generated_rights_policies` ya fue expandido localmente a workspace-scoped con readers por trusted context y
  recovery plan; commercial rollout permanece bloqueado hasta verificar la migración/backfill en el ambiente exacto
  y retirar cualquier compatibilidad no comercial.
- Pause/retire y rights supersession/revocation no tienen una ruta operable completa para rollback semántico.
- No hay señal para promoción parcial o estancada.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/contracts|domain|database + API/worker/SDK`
- Future candidate home: `remain-shared`
- Boundary: `globe.production-promotion.operation.*`, consumido por operator CLI/SDK/API y workers
- Server/browser split: stores, evidencia, secrets y transiciones permanecen server-side
- Build impact: `migration aditiva y worker recovery; sin SDK de provider nuevo`
- Extraction blocker: transacción, capabilities y readback de cuatro aggregates Globe

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `promotion operation history; authorities existentes permanecen canónicas`
- Consumidores afectados: `API|SDK|CLI|worker|ops`
- Runtime target: `internal Cloud Run/Job; commercial gateado`

### Contract surface

- Contrato existente a respetar: commands/readers de readiness, rights y production routing
- Contrato nuevo o modificado: operation aggregate, `start|advance|fail|rollback|read|list`
- Backward compatibility: `compatible`
- Full API parity: todas las fases son commands/readers gobernados; ningún operador usa SQL

### Data model and invariants

- Entidades/tablas/views afectadas: `globe.production_promotion_operations` + history/receipts aditivos
- Invariantes que no se pueden romper:
  - una operación fija workspace y tuple exacta;
  - una fase sólo avanza si el readback canónico satisface su precondición;
  - retry con igual idempotency key no duplica mutaciones;
  - rollback abre circuito antes de deshabilitar binding.
- Tenant/space boundary: workspace deriva de trusted context
- Idempotency/concurrency: operation id + expected revision + advisory lock por exact tuple
- Audit/outbox/history: phase history append-only y evidence refs sanitizados

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `disabled`
- Backfill plan: `no se infieren operaciones históricas; las policies existentes se asignan sólo al workspace
  interno conocido mediante expand/migrate verificado antes de retirar el default de compatibilidad`
- Rollback path: `flag OFF; circuit open; binding disabled; conservar historial`
- External coordination: grants separados, deploy API/worker y rehearsal con operator/checker

### Security and access

- Auth/access gate: capabilities distintas para plan/stage, promote, activate y rollback
- Sensitive data posture: refs/digests; nunca términos completos, tokens ni secrets
- Error contract: códigos sanitizados por precondición/fase/conflicto
- Abuse/rate-limit posture: lock, CAS, bounded retries y circuit breaker

### Runtime evidence

- Local checks: state-machine, CAS, replay, actor separation, API registry wiring y failure injection
- DB/runtime checks: migrate/readback y operación parcial recuperada sin SQL manual
- Integration checks: una ruta internal-only stage→rollback y otra stage→canary_passed
- Reliability signals/logs: `promotion_operation_stalled|partial|rollback_failed`
- Production verification sequence: flag OFF → shadow reader → internal rehearsal → soak

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Commands/readers, capabilities, grants y coverage se entregan juntos.
- [ ] SDK/CLI/API usan el mismo aggregate y no reconstruyen fases.
- [ ] Worker recovery usa la misma primitive que el operador.
- [ ] Replays, stale CAS, wrong actor y cross-workspace tienen negativos.

Checkpoint local 2026-07-23: commands/readers, capabilities y coverage están implementados y publicados por
`createStudioApp`; grants/identities/IaC y worker recovery siguen pendientes, por eso el DoD de parity no se marca
complete.

<!-- ZONE 2 — PLAN MODE -->

### 2026-07-23/24 — Rollout live + rehearsals 1-2 + hallazgos (ejecución autorizada expresamente)

- **Código remanente implementado y pushed** (`ffe4102`, fixes `f66b24c`/`ca211af`/`ff24093`, CI verde):
  flag `GLOBE_PRODUCTION_PROMOTION_OPERATIONS_ENABLED` (mutations→`policy_blocked`, readers shadow),
  lane de recovery en el worker (scan cross-workspace bajo policy RLS de migración `0028`, claim
  `SKIP LOCKED`+fencing, `recover` canónico), `DurableProductionPromotionCanaryAuthority` (run gobernado
  post-activación + output retenido + governance `eligible`, server-side), 3 clases workload disjuntas
  (`promotion-routing|promoter|checker`) con retiro de `production-routing.manage`/`asset-rights-policy.manage`
  del caller genérico al prender el flag, SDK tipado (11 métodos), CLI por fase
  (`scripts/production-promotion-cli.mjs`), grants DB del worker en sync exacto SQL↔verifier.
- **Rollout aplicado**: migración `0028` (`pending=[]`), prepare grants `ready:true`, `tofu apply`
  12 add/3 change/0 destroy → `No changes`; deploys api/studio/worker success; shadow verification con flag
  OFF (reader `200 []`, `start`→`policy_blocked`); flag ON aplicado (api rev `00061-cdc`→`00063-z7d`).
- **Rehearsal 1 (stage→rollback) ✅** con identity `promotion-routing`: `controls_staged` rev 3 (binding
  disabled rev 2, circuit open rev 2, rights readback exacto) → `rolled_back` rev 5. **Atrapó un defecto
  real**: las claves de idempotencia de circuit/binding no discriminaban fase (stage vs rollback colisionaban
  y el rollback quedaba atascado en `rolling_back`). Fix conforme ADR (`promotion:{op}:{phase}:{step}` +
  readback-first en `executeRollback`), test actualizado, redesplegado (`f66b24c`).
- **Rehearsal 2 (recovery autónomo) ✅**: op `promotion_87922b94…` con deadline 2 min quedó `rolled_back`
  con `safeCode=promotion_recovery_deadline` **sin intervención** (worker tick + lease + fencing). Señal
  `globe_promotion_partial` (ERROR) emitida como jsonPayload; el evento `globe_worker_completed` lleva el
  resumen de la lane + `promotionQueueOldestAgeSeconds=0` post-batch. Métricas/alertas Terraform vivas.
- **Hallazgo de diseño (follow-up)**: `model-readiness.pause` es human-only por diseño y no tiene superficie
  humana operable (403 correcto con tenancy-operator aunque se le agregó la capability `ca211af`). El saga
  completo promote-from-paused no es ejercitable sin fabricar camino; el path real (promote-from-**candidate**)
  se ejercitará con la primera de las 7 rutas cuando exista su evidencia real (prohibido fabricarla).
- **Restauración completada (2026-07-24, autorizada expresamente)**: ruta image de vuelta operativa —
  binding `enabled` rev 3 + circuito `closed` rev 3 vía carril gobernado (flag OFF Terraform →
  `appendProductionRoute`/`transitionProviderCircuit` con `greenhouse-globe-caller` → flag ON, api rev
  `00065-g67`, `tofu plan` No changes). tokenCreator del caller otorgado→usado→revocado, corte verificado.
  Worker post-ciclo: lane promotion limpia (`claimed:0`, `promotionQueueOldestAgeSeconds:0`).
- **Queda para cierre definitivo de la task**: ejercitar `stage→promote→activate→canary_passed` con la
  primera de las 7 rutas reales cuando exista su evidencia (candidate + review firmada + rights + canary
  facturable con sign-off); dar superficie humana operable a `model-readiness.pause` (follow-up).

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contract and persistence

- Aceptar el delta ADR; volver `generated_rights_policies` workspace-scoped; definir aggregate, phases,
  evidence refs, migration y store append-only.

### Slice 2 — Commands, readers and separation

- Implementar commands por fase, readers, evidence authorities server-side y actor separation.

### Slice 3 — Recovery and signals

- Añadir bounded recovery de operaciones parciales y alertas con severidad.

### Slice 4 — Internal rehearsal

- Ejercitar stage→rollback y stage→promote→activate→canary_passed con dos identities.

## Out of Scope

- Fabricar términos, reviews o reportes de las siete rutas.
- Implementar provider drivers o media delivery.
- Declarar commercial ready.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`contract/migration → commands/readers → recovery/signals → internal rehearsal`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| promoción parcial | release | medium | phase readback + recovery | `promotion_operation_partial` |
| autoridad concentrada | security | low | capability split + actor tests | access audit |
| rollback incompleto | provider | medium | circuit-first | `promotion_operation_rollback_failed` |

### Feature flags / cutover

`GLOBE_PRODUCTION_PROMOTION_OPERATIONS_ENABLED=false` por defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–3 | flag OFF + revert; tablas aditivas permanecen | <15 min | sí |
| 4 | circuit open + binding disabled | inmediato | sí |

### Production verification sequence

1. Tests y migration local.
2. Deploy internal flag OFF; reader vacío.
3. Flag ON para operator/checker; rehearsal de rollback.
4. Canary internal acotado; verificar history y señales.

### Out-of-band coordination required

Asignar identities/grants separados y sign-off humano para canary facturable.

## Acceptance Criteria

- [ ] Rights policy/readers son workspace-scoped y readiness resuelve policy exacta; no basta una versión de env.
- [ ] Cada fase tiene precondiciones de readback y actor/capability propias.
- [ ] Una falla inyectada tras cada command se reanuda o revierte sin SQL manual.
- [ ] Rollback siempre abre circuito antes de deshabilitar binding.
- [ ] No hay principal requerido con authority combinada de reviewer+promoter+routing operator.
- [ ] Operación final referencia review, rights, readiness, binding, circuit, canary y rollback evidence.
- [ ] Stalled/partial/rollback failure son observables.

## Verification

- `../efeonce-globe`: `pnpm --filter @efeonce-globe/studio-web typecheck` ✅
- `../efeonce-globe`: `pnpm --filter @efeonce-globe/studio-web test` ✅ 210/210
- `../efeonce-globe`: `pnpm --filter @efeonce-globe/contracts test` ✅ 35/35
- `../efeonce-globe`: `pnpm --filter @efeonce-globe/domain test` ✅ 298/298
- `../efeonce-globe`: `pnpm --filter @efeonce-globe/database test` ✅ 96/96
- `../efeonce-globe`: `pnpm check` ✅
- `../efeonce-globe`: `pnpm build` ✅
- Migration/readback live ✅ (`0028` pending=[]); worker recovery con lease/fence ✅ (rehearsal 2 autónomo);
  stage→rollback con identity separada ✅ (rehearsal 1). Pendiente: restauración binding image y
  stage→promote→activate→canary con la primera ruta candidate real.

## Plan

- [`TASK-1527-plan.md`](../plans/TASK-1527-plan.md)

## Audit

- Goal activo: cierre robusto de `TASK-1521`; `TASK-1527` es su build unit de promotion/recovery.
- Branch: excepción autorizada `develop`; no se creó branch/worktree.
- Subagentes: tres auditorías read-only de persistence, API/capabilities y recovery/observability; cero edits.
- Checkpoint derivado: `human` (`P0` + esfuerzo `Alto`). No se escribe runtime antes de aprobación.
- Checkpoint humano aprobado por el operador el `2026-07-23`; autoriza implementación del aggregate, migration,
  capabilities, identities y recovery, pero no autoriza promover rutas sin evidencia independiente.
- Implementación local posterior al checkpoint: `production-promotion-operation` quedó cableado en API/BFF, `main.ts`
  instancia `DurableProductionPromotionOperationStore`, `dispatch.ts` mapea errores sanitizados y el port
  `readRights` recibe la identidad exacta para evitar readback inventado o memoria de proceso.

## Closing Protocol

- [ ] Lifecycle/registry/README sincronizados.
- [ ] `TASK-1521`, Handoff y runtime handoff actualizados.
- [ ] `pnpm qa:gates --changed` y `pnpm docs:closure-check` verdes.
