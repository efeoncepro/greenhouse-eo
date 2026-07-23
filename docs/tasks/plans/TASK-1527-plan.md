# Plan — TASK-1527 Globe Route Promotion Operation and Recovery

## Estado del plan

- Fecha: `2026-07-23`
- Mode: `standard`
- Checkpoint: `human` (`P0`, esfuerzo `Alto`)
- Branch: `develop` por instrucción del operador; no crear branch/worktree.
- Estado: `pendiente de aprobación humana`; no se inicia runtime antes del checkpoint.

## Discovery summary

### Supuestos correctos

- Readiness, route binding y circuit state ya son authorities append-only, tenant-scoped, CAS e idempotentes.
- El orden seguro sigue siendo:
  - stage: policy exacta → binding disabled → circuit open;
  - activate: readback completo → binding enabled → circuit closed;
  - rollback: circuit open → binding disabled.
- `CapabilityRegistry` exige una capability fija por command; las fases deben ser commands separados.
- Globe es la plataforma hermana dueña de código/runtime; Greenhouse conserva task, ADR, handoff y cierre.

### Supuestos desactualizados

- `generated_rights_policies` **no** es tenant-scoped: el contrato, store y migración `0019` carecen de
  `workspace_id`, y `get/list` ignoran el trusted context.
- Readiness no verifica la policy durable exacta: `createModelReadinessRightsPolicy` sólo compara una versión de
  env y campos no vacíos del fixture.
- El canary actual es evidencia local JSON/script; no existe una attestation durable que resuelva run, attempt,
  output retenido, governance y tuple exacta server-side.
- Los commands inferiores de rights/routing siguen otorgados al caller interno genérico y podrían saltarse el
  aggregate nuevo.

### Causa raíz y solución

La causa no es falta de otro script secuencial, sino ausencia de una saga durable y de authorities de evidencia
tenant-safe. Se crea un único aggregate con checkpoints/receipts y recovery por readback; no se finge una
transacción distribuida ni se escriben directamente las tablas de readiness/routing/rights.

## Architecture decision

- ADR existente: Creative Producer architecture + durable persistence + API Contract Spine.
- Delta propuesto y requerido antes de código:
  1. `generated_rights_policies` pasa de registry global implícito a policy de aplicación workspace-scoped; la
     evidencia de términos del provider puede seguir siendo global, pero su adopción/restricciones no.
  2. Promotion es una saga durable de commands idempotentes con checkpoint antes/después, readback y fencing.
  3. Worker recovery sólo reconcilia outcomes y ejecuta rollback no expansivo; nunca promueve, activa ni certifica
     canary.
  4. Commands inferiores quedan break-glass y fuera de los grants normales cuando el aggregate esté habilitado.
- Reversibilidad: `two-way-but-slow` por migration/IAM; flag OFF y circuit open + binding disabled preservan
  rollback.
- Revisit trigger: nueva authority de policy global explícita, cambio de readiness identity o provider route
  tuple.

## Access model

- `views`: no cambia; no hay UI.
- `entitlements/capabilities`: nuevas capabilities disjuntas `read`, `plan-stage`, `promote`, `activate`,
  `canary-attest`, `rollback`, `recover`.
- Principals:
  - humano maker/reviewer: review/propose; maker ≠ reviewer;
  - readiness promoter: promote/read;
  - routing operator: start/stage/activate/rollback/read;
  - canary checker: attest/read;
  - recovery worker: recover/rollback/read.
- Ningún principal normal combina reviewer + promoter + routing.

## Backend/data contract

- Source of truth: operation head + revision history + command receipts; authorities existentes permanecen
  canónicas.
- Identity: workspace + `routeId/modelVersion` serializa una operación activa; projection fija provider/model,
  capability/fidelity, endpoint/region/driver.
- Consistency: saga durable. Cada child command usa key determinística
  `promotion:{operationId}:{phase}:{step}`; ante outcome incierto se hace readback antes de retry.
- Concurrency: advisory lock corto + row lock + expected revision + lease/fencing; nunca lock durante I/O externo.
- History: revisiones append-only con actor, capability, refs/digests y safe codes; head mutable sólo por CAS.
- Rollout: migration aditiva, flag OFF, shadow readers, rehearsal rollback, canary internal y soak.

## Subagent strategy

`fork` para Discovery; implementación consolidada por el agente principal:

- Persistence audit: schema, CAS, locks, idempotency y tests.
- API audit: capabilities, principals, SDK/parity y evidencia server-side.
- Recovery audit: leases, worker, signals, alertas y rollback.

No hubo edits de subagentes. Si la implementación se autoriza, sólo se delegarán tests/IaC en archivos exclusivos
después de fijar los contracts base.

## Execution order

### Slice 0 — ADR y rights tenant boundary

1. Agregar delta ADR a la arquitectura Creative Producer y enlazarlo desde el índice.
2. Expandir `GeneratedRightsPolicyV1`/store/readers con `workspaceId` derivado del trusted context.
3. Migration compat: asignar únicamente rows legacy al workspace interno verificado, mantener default temporal
   sólo durante rollout internal y retirarlo antes del stage comercial.
4. Reemplazar el verifier de env por resolución durable exacta con policy id/version/digest/validez/restricciones.

### Slice 1 — Aggregate y persistencia

1. Contrato `production-promotion-operation` y estados:
   `planned → staging_controls → controls_staged → promoting_readiness → readiness_promoted → activating →
   activated → verifying_canary → canary_passed`.
2. Caminos `rolling_back → rolled_back`; `rollback_failed` permanece reclaimable.
3. Migration para head, revisions y receipts; índice único parcial por workspace+route+modelVersion.
4. Store con CAS, idempotencia, leases/fencing, list/history y negativos cross-workspace.

### Slice 2 — Commands, evidence authorities y API parity

1. Commands `start|stage|promote|activate|canary-confirm|fail|rollback|recover`.
2. Readers `get|list|history|stalled`.
3. `PromotionEvidenceAuthorityPort` resuelve policy/review/readiness/routing/canary desde authorities server-side.
4. Canary confirma run/attempt/output/governance exactos posteriores a activation; no acepta booleano del caller.
5. Registro, error mapping, SDK tipado, coverage de ocho surfaces y CLI por fase.

### Slice 3 — Recovery, principals e IaC

1. Worker dedicado con claim `SKIP LOCKED`, lease/fence, bounded attempts y rollback no expansivo.
2. Identities/allowlists/grants disjuntos; retirar grants inferiores del caller normal al activar el aggregate.
3. Signals: stalled `WARNING`, partial `ERROR`, rollback_failed `CRITICAL`; queue age sólo reclaimable.
4. Flags/env/Job/alerts/runbook con rollout y kill switch.

### Slice 4 — Verification y rehearsal

1. Failure injection después de cada child mutation; retry converge sin duplicar.
2. Negativos actor overlap, stale CAS, cross-workspace, tampered evidence, lease/fence stale.
3. Rehearsal internal stage→rollback y stage→promote→activate→canary con identities separadas.
4. Readback Cloud SQL, signals/alerts, `pnpm check && pnpm build`, QA/docs gates.

## Files to create

- `../efeonce-globe/packages/contracts/src/production-promotion-operation.ts`
- `../efeonce-globe/packages/domain/src/production-promotion-operation.ts`
- `../efeonce-globe/packages/database/src/stores/production-promotion-operation-store.ts`
- migrations `0026+` según separación expand/contract
- tests focales registrados explícitamente en cada `package.json`

## Files to modify

- contracts/domain/database exports y capabilities
- generated rights contracts/domain/store/migration compatibility
- `apps/studio-web/src/{app,main,dispatch,worker-main}.ts`
- `packages/sdk/src/index.ts`
- `scripts/producer-ui-canary*.mjs`
- `infra/terraform/*promotion*` y observability
- arquitectura/runtime handoff/task/changelog en Greenhouse

## Risk flags

- Migration de policy global a workspace; no inferir tenants desconocidos.
- Un grant inferior residual permite bypass.
- Canary declarativo o evidence payload browser-side produciría falso positivo.
- Recovery con authority expansiva rompería separation of duties.
- No promover las siete rutas sólo porque el aggregate exista.

## Open questions resolved

1. Rights scope → workspace-scoped application policy; términos vendor pueden ser evidencia global separada.
2. `advance` genérico → rechazado; commands por fase con capability fija.
3. Recovery auto-promote/activate → rechazado; sólo reconcile/readback/rollback.
4. Rollback rights → policy immutable queda como evidencia; una supersession/revocation explícita se registra
   cuando la policy deba dejar de ser válida, sin borrar historia.
5. Canary booleano → rechazado; attestation server-resolved con refs/digests.

## Checkpoint humano requerido

La aprobación autoriza el delta material: rights tenant migration, nueva saga/API/capabilities, identities/IAM y
worker dedicado. No autoriza todavía promover rutas sin sus evidencias independientes ni declarar commercial
readiness.
