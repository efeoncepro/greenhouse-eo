# TASK-1512 — Globe Cross-Replica Spend Fence Exercise

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Preflight vivo completo; corrida bloqueada por tenancy/readiness y gasto no autorizado`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-1512-globe-cross-replica-spend-fence-exercise`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ejercitar por primera vez el **spend fence cross-réplica** de Globe con concurrencia real contra el Model Lab, ahora
que `TASK-1508` levantó el cap efectivo de 1 a 3 instancias. El fence es la defensa que aborta un run *antes* de gastar
y su atomicidad bajo row locks es justo lo que un fence in-memory no podía dar; hasta hoy esa propiedad está **probada
por construcción y por tests, pero nunca por ejecución concurrente real**.

## Checkpoint 2026-07-23 — preflight sin gasto; no ejecutable todavía

- El dry-run autenticado confirmó catálogo, routes/circuits/rights y estimates; total máximo observado: 32 créditos.
- Tenancy efectiva respondió `access_denied` y Model Readiness `not_found` para Image/Video/Audio. No existe una
  corrida elegible que pueda producir contención real entre réplicas.
- No hay autorización humana explícita para gasto de proveedor en esta prueba. Se mantiene `to-do`, sin fake que
  pretenda demostrar evidencia horizontal live y sin relajar kill switch, cap o fence.

## Why This Task Exists

`TASK-1465` construyó `DurableSpendFence` con `reserve`/`settle`/`release` atómico bajo row locks precisamente para
hacer seguro `maxScale > 1`. `TASK-1508` descubrió que ambos servicios estaban capados a **1 instancia efectiva** —
Cloud Run aplica el menor entre el ceiling a nivel servicio y el de revisión, y el de servicio estaba en 1 — de modo
que **nunca hubo dos réplicas y el camino cross-réplica jamás se ejecutó**.

El cap ya está corregido. Queda la deuda de verificación: una defensa de gasto que nunca se ejerció bajo la condición
para la que fue diseñada es una defensa asumida, no verificada. Y el modo de falla que cubre —dos réplicas reservando
créditos en paralelo y superando el cap— es exactamente el que cuesta dinero real.

## Goal

- Producir concurrencia real contra `globe-api-internal` suficiente para que Cloud Run levante ≥2 instancias
  simultáneas y el fence resuelva reservas competidas.
- Demostrar con evidencia que el cap por-run y el cap por-workspace-día se respetan bajo concurrencia, sin
  sobre-reserva ni doble cobro.
- Acotar y declarar el gasto de proveedor que la verificación consume.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007 — `DurableSpendFence`)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` (kill switch, private-ingest, state machine)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`

Reglas obligatorias:

- El fence es de **seguridad**, NO el credit ledger comercial (eso es `TASK-1468`). Esta task no lo convierte en ledger.
- El gasto que consuma la verificación debe estar acotado por el propio cap diario y declarado antes de ejecutar.
- No bajar el kill switch ni relajar el fence para "facilitar" la prueba: eso invalidaría la evidencia.
- Los outputs siguen siendo *candidates*; esta task no aprueba craft ni promueve superficies.

## Normative Docs

- `docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`
- `docs/tasks/complete/TASK-1508-globe-cloud-run-iac-deploy-ownership.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Dependencies & Impact

### Depends on

- `TASK-1508` completa: sin el cap corregido a 3/3 no puede haber una segunda réplica.
- `packages/database` de Globe: `DurableSpendFence`, tablas `globe.spend_fence_runs` / `globe.spend_fence_days`.
- `globe-api-internal` vivo con `GLOBE_LAB_ENABLED=true` y su caller autorizado (`greenhouse-globe-caller`).
- Autorización de gasto del owner de billing: la verificación invoca proveedores reales.

### Blocks / Impacts

- Cierra la única deuda de verificación que `TASK-1508` dejó abierta explícitamente.
- Da evidencia real al gate de HA antes de cualquier aumento futuro de réplicas.
- No desbloquea Production ni clientes externos (`TASK-1480`).

### Files owned

- `../efeonce-globe/scripts/smoke-spend-fence-concurrency.mjs` (nuevo) `[verificar]`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`

## Current Repo State

### Already exists

- `DurableSpendFence` con `reserve`/`settle`/`release` atómico bajo row locks (`packages/database/src/stores/`).
- Cap doble: por-run (`hardCapCredits`) y por-workspace-día UTC.
- Tests unitarios del fence con dobles; smoke workload `scripts/smoke-private-api.mjs`.
- Cap efectivo 3/3 en ambos servicios desde `TASK-1508`.

### Gap

- Ninguna evidencia de ejecución con ≥2 réplicas simultáneas: el camino de contención de row locks nunca corrió en vivo.
- No existe un smoke que genere concurrencia deliberada contra el Lab ni que lea el estado del fence post-ejecución.
- No está medido cuánto gasto consume una verificación de este tipo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/scripts + globe-api-internal en Cloud Run + Cloud SQL globe-pg`
- Future candidate home: `remain-shared`
- Boundary: `el smoke entra por el spine (API/SDK → command → fence); nunca toca el store ni el proveedor directo`
- Server/browser split: `n/a; verificación server-side y service-to-service`
- Build impact: `none`
- Extraction blocker: `requiere el servicio vivo, su caller autorizado y el datastore durable`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `globe.spend_fence_runs / globe.spend_fence_days en Cloud SQL globe-pg`
- Consumidores afectados: `Model Lab (commands prepare/execute), Evaluation Harness, futuros gates de HA`
- Runtime target: `production` (infra interna de Globe; internal-only)

### Contract surface

- Contrato existente a respetar: `SPEC-007 DurableSpendFence; Model Lab state machine; kill switch fail-closed`
- Contrato nuevo o modificado: `ninguno — esta task verifica, no cambia el contrato`
- Backward compatibility: `sin cambio de contrato`
- Full API parity: `N/A — no capability nueva`

### Data model and invariants

- Entidades/tablas/views afectadas: `globe.spend_fence_runs`, `globe.spend_fence_days` (lectura + escrituras del propio fence)
- Invariantes que no se pueden romper:
  - `la suma de reservas concurrentes NUNCA supera el cap por-workspace-día`
  - `un run no puede reservar dos veces ni settlear una reserva ajena`
  - `una reserva liberada (release) vuelve a estar disponible sin doble contabilidad`
  - `el fence sigue siendo de seguridad, no el ledger comercial (TASK-1468)`
- Tenant/space boundary: `todo scoped por workspace; la prueba usa un workspace de smoke dedicado`
- Idempotency/concurrency: `es el objeto de la prueba — reservas competidas resueltas bajo row locks`
- Audit/outbox/history: `audit_log append-only + lectura directa de las tablas del fence como evidencia`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `sin cambios de configuración; el Lab ya está habilitado en el api`
- Backfill plan: `N/A`
- Rollback path: `ninguna mutación de infra que revertir; si el gasto excede lo previsto, bajar GLOBE_LAB_DAILY_CAP_CREDITS o el kill switch`
- External coordination: `owner de billing/GCP para autorizar el gasto de la verificación`

### Security and access

- Auth/access gate: `service account + ID token verificado in-app (api mode); caller allowlisted`
- Sensitive data posture: `secrets` — sin imprimir tokens ni claves de proveedor
- Error contract: `errores del spine ya mapeados; un fence agotado responde policy/limit, no 500`
- Abuse/rate-limit posture: `la prueba se acota con el cap diario; nunca desactivarlo para que "pase"`

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check`
- DB/runtime checks: lectura de `spend_fence_runs`/`spend_fence_days` antes y después; conteo de instancias en Cloud Run
- Integration checks: N requests concurrentes al command de ejecución del Lab; verificación de que ≥2 instancias sirvieron
- Reliability signals/logs: Cloud Run request logs con `instanceId`, audit log de Globe, métricas de instancias activas
- Production verification sequence: ver §Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, invariantes y consumidores nombrados con tablas reales.
- [ ] Evidencia de ≥2 instancias sirviendo simultáneamente, no inferida.
- [ ] Gasto consumido medido y declarado.
- [ ] Sin relajar kill switch, cap ni fence para obtener el resultado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Smoke de concurrencia

- Script en `../efeonce-globe/scripts/` que dispara N ejecuciones concurrentes del Lab por el spine (API/SDK), con
  workspace de smoke dedicado, `idempotencyKey` distinto por run y cap declarado.
- Captura por run: instancia que lo sirvió, resultado del fence (reservado / rechazado por cap) y créditos.

### Slice 2 — Ejecución con concurrencia real y lectura del fence

- Correr el smoke contra `globe-api-internal` con carga suficiente para forzar ≥2 instancias.
- Leer `spend_fence_runs` / `spend_fence_days` antes y después; verificar que la suma de reservas respeta el cap y que
  ningún run quedó reservado sin settle ni release.

### Slice 3 — Evidencia y cierre documental

- Registrar el resultado en SPEC-007 y en el runtime handoff: qué se ejercitó, con cuántas instancias y qué gasto.
- Si la prueba revela un defecto real del fence, abrir `ISSUE-###` y NO cerrar la task como verde.

## Out of Scope

- Convertir el fence en el credit ledger comercial (`TASK-1468`).
- Subir el ceiling por encima de 3 o cambiar la política de escala.
- Habilitar Production, clientes externos o pricing (`TASK-1480`).
- Cambiar el contrato del Model Lab, sus providers o sus rutas.

## Detailed Spec

La prueba sólo es válida si la concurrencia es **real**: dos requests atendidos por la misma instancia no ejercitan el
row lock cross-réplica. Por eso la evidencia obligatoria es el `instanceId` distinto en los logs de Cloud Run, no la
mera simultaneidad de los clientes.

El gasto se acota por diseño: el cap por-workspace-día es el techo natural de la prueba. Si el proveedor real resulta
caro para el volumen necesario, es preferible correr la prueba con `GLOBE_LAB_PROVIDER=fake` para el camino de
contención —que ejercita el fence igual, porque el fence reserva antes de invocar al proveedor— y dejar una corrida
acotada con proveedor real como confirmación. Esa decisión se toma en Discovery y se declara.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (smoke) → Slice 2 (ejecución + lectura) → Slice 3 (evidencia).
- NUNCA relajar el kill switch, el cap diario ni el fence para lograr que la prueba "pase".
- Si el fence falla bajo concurrencia, eso es el hallazgo: abrir issue, no ajustar la prueba.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El gasto excede lo previsto | Billing | medium | cap diario declarado antes de correr; opción proveedor fake para el grueso | créditos consumidos por encima del presupuesto declarado |
| Cloud Run no levanta una 2.ª instancia y la prueba no ejercita nada | Verificación | high | forzar concurrencia por encima de la concurrencia por instancia (20); verificar `instanceId` distinto | todos los runs con el mismo `instanceId` |
| El fence deja reservas colgadas | Datos | low | leer `spend_fence_runs` post-corrida; toda reserva debe estar settled o released | filas reservadas sin resolución |
| La prueba contamina datos productivos | Datos | low | workspace de smoke dedicado, scoped | filas de fence fuera del workspace de prueba |

### Feature flags / cutover

Sin flag nuevo. `GLOBE_LAB_ENABLED` y `GLOBE_LAB_PROVIDER` ya existen y se usan tal cual; `GLOBE_LAB_DAILY_CAP_CREDITS`
acota el gasto. Ninguno se relaja para la prueba.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no se ejecuta nada; el script queda sin correr | <5 min | sí |
| Slice 2 | detener la corrida; el fence libera o settlea lo reservado | <10 min | sí |
| Slice 3 | corregir la documentación al resultado real | <15 min | sí |

### Production verification sequence

1. Declarar el presupuesto de créditos y confirmar el cap diario vigente.
2. Correr el smoke con concurrencia creciente hasta observar ≥2 `instanceId` distintos.
3. Leer las tablas del fence antes/después y verificar los invariantes.
4. Registrar evidencia y gasto real; abrir issue si algo falló.

### Out-of-band coordination required

- Owner de billing/GCP para autorizar el gasto de proveedor de la verificación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Hay evidencia de ≥2 instancias de `globe-api-internal` sirviendo runs simultáneos (`instanceId` distintos en logs).
- [ ] Bajo esa concurrencia, la suma de reservas respeta el cap por-workspace-día y ningún run supera su cap por-run.
- [ ] Ninguna reserva queda colgada: toda fila de `spend_fence_runs` de la corrida termina settled o released.
- [ ] El gasto de proveedor consumido está medido y declarado.
- [ ] No se relajó kill switch, cap ni fence para obtener el resultado.
- [ ] SPEC-007 y el runtime handoff registran que el camino cross-réplica quedó ejercitado, con su fecha y alcance.

## Verification

- `cd ../efeonce-globe && pnpm check`
- Smoke de concurrencia contra `globe-api-internal` con evidencia de `instanceId`
- Lectura de `globe.spend_fence_runs` / `globe.spend_fence_days` pre/post
- `pnpm task:lint --task TASK-1512`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `GLOBE_RUNTIME_HANDOFF.md` y SPEC-007 actualizados con la evidencia.
- [ ] Si la prueba encontró un defecto, existe `ISSUE-###` y la task NO se cierra como verde.
- [ ] Runtime Rollout Completion Gate: sin corrida real con ≥2 instancias, el estado es `pendiente`, nunca `complete`.

## Follow-ups

- Credit ledger comercial durable y append-only (`TASK-1468`).
- Revisión del ceiling por encima de 3 si el uso lo justifica, con su propia decisión de HA.

## Open Questions

- ¿La corrida de contención se hace con proveedor real o con `fake` (el fence reserva antes de invocar al proveedor,
  así que `fake` ejercita el mismo camino sin gasto)? Decidir en Discovery y declararlo.
