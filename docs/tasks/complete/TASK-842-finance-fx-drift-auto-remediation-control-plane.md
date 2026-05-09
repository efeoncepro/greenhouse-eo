# TASK-842 — Finance FX Drift Auto-Remediation Control Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementado y validado`
- Rank: `TBD`
- Domain: `finance|ops|data|reliability`
- Blocked by: `none`
- Branch: `develop` (instruccion explicita del usuario; no crear/cambiar branch)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Convertir `finance.account_balances.fx_drift` de un detector reactivo con recovery manual a un control plane autocorrectivo, auditable y seguro para finanzas. El resultado esperado es que drift elegible en `greenhouse_finance.account_balances` se detecte, planifique, rematerialice y verifique desde `ops-worker` usando primitives canonicas, sin depender de que Playwright o un humano sean la primera linea de respuesta.

La solucion debe preservar los controles financieros: no mutar saldos reconciliados/cerrados de forma silenciosa, no actualizar `account_balances` ad hoc, no duplicar logica de FX y no ocultar drift desconocido. Para bugs de clase conocida y evidencia suficiente, el sistema puede auto-remediar con auditoria explicita.

## Why This Task Exists

El 2026-05-09 reaparecio el mismo sintoma operativo que `ISSUE-069` habia cerrado el 2026-05-08: el Playwright smoke `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts` fallo porque el reliability signal `finance.account_balances.fx_drift` esperaba `severity=ok` y recibio `severity=error`.

Diagnostico runtime del 2026-05-09:

- `scripts/finance/diagnose-fx-drift.ts` detecto 1 drift activo.
- Cuenta: `santander-clp`.
- Fecha: `2026-05-01`.
- Persistido: `inflows_clp=0.00`, `outflows_clp=0.00`.
- Esperado: `expected_inflows_clp=0`, `expected_outflows_clp=402562.50`.
- Drift: `-402562.50`.
- Recovery manual ejecutado con `scripts/finance/backfill-account-balances-fx-fix.ts --account-id=santander-clp --from-date=2026-05-01 --evidence-guard=warn_only`.
- Resultado post-recovery: `daysMaterialized=70`, `finalClosingBalance=1212492.07`.
- Diagnostico posterior: `Sin drift detectado. Steady state.`

La causa inmediata se puede reparar manualmente, pero la brecha arquitectonica sigue abierta: el detector y el rematerializador existen, pero no hay control plane que los conecte con una politica segura, scheduler, auditoria y run tracking. Por eso el sistema puede volver a fallar como "goteo diario" y CI/Playwright termina actuando como alarma operacional tardia.

## Goal

- Automatizar la remediacion de drift elegible en `account_balances` usando el rematerializador canonico, no updates directos.
- Mantener el detector `finance.account_balances.fx_drift` como source of truth de steady state.
- Agregar una politica explicita para distinguir drift auto-remediable, drift bloqueado por control financiero y drift desconocido que debe escalar.
- Registrar cada intento en run tracking/auditoria con evidencia suficiente para investigacion posterior.
- Hacer que el scheduler de `ops-worker` deje el sistema en steady state antes de que Playwright lo verifique.
- Conservar el comportamiento correcto cuando el drift no es seguro de auto-corregir: no esconderlo, reportarlo como bloqueado/accionable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md`
- `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md`
- `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`
- `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md`

Reglas obligatorias:

- `greenhouse_finance.account_balances` es una proyeccion/materializacion operativa, no el ledger canonico.
- Nunca corregir drift con `UPDATE greenhouse_finance.account_balances ...` escrito ad hoc desde scripts, routes o worker.
- Toda rematerializacion debe pasar por la primitive canonica existente: `rematerializeAccountBalanceRange`.
- El contrato de seed es intencional: el dia seed es ancla muda; cualquier scheduler debe usar el helper canonico que evita el blind spot de `ISSUE-069`.
- El detector `finance.account_balances.fx_drift` debe seguir comparando persisted vs recompute desde readers/views canonicos.
- La remediacion automatica debe ser idempotente, bounded y auditada.
- Datos reconciliados, snapshots aceptados o periodos cerrados no se sobreescriben silenciosamente. Si se auto-restatan por bug class conocido, debe quedar evidencia explicita y reversible.
- Playwright smoke verifica steady state; no debe ejecutar recuperacion.
- Si se agregan endpoints operativos, deben vivir en `ops-worker` con auth/guardrails equivalentes a los jobs existentes.

## Normative Docs

- `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md`
- `services/ops-worker/README.md` si existe al tomar la task; si no existe, documentar en `Handoff.md` y no bloquear por eso.

## Dependencies & Impact

### Depends on

- `src/lib/reliability/queries/account-balances-fx-drift.ts` — reader/signal actual.
- `src/lib/reliability/get-reliability-overview.ts` — composer que expone el signal al portal y Playwright.
- `src/lib/finance/account-balances-rematerialize.ts` — primitive canonica de rematerializacion.
- `services/ops-worker/finance-rematerialize-seed.ts` — helper que corrige el seed blind spot de `ISSUE-069`.
- `services/ops-worker/server.ts` — superficie runtime para jobs internos.
- `services/ops-worker/deploy.sh` — definicion deploy/scheduler de Cloud Run.
- `scripts/finance/diagnose-fx-drift.ts` — diagnostico operativo actual.
- `scripts/finance/backfill-account-balances-fx-fix.ts` — recovery manual actual.
- `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts` — smoke que falla cuando el signal no esta en steady state.
- `greenhouse_finance.account_balances` — materializacion afectada.
- `greenhouse_sync.source_sync_runs` / `greenhouse_sync.source_sync_failures` — candidatos canonicos para run tracking si el runtime confirma su shape vigente.

### Blocks / Impacts

- Reduce falsos rojos recurrentes de Playwright/CI por drift ya remediable.
- Endurece la confiabilidad del dashboard `/admin/operations`.
- Reduce dependencia de scripts one-shot manuales para saldos bancarios.
- Puede requerir actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` y documentacion funcional de saldos.
- Impacta jobs Cloud Scheduler/Cloud Run de `ops-worker`; validar deploy y env con `gcloud`.

### Files owned

- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `src/lib/reliability/queries/account-balances-fx-drift.test.ts`
- `src/lib/finance/account-balances-rematerialize.ts`
- `src/lib/finance/*fx-drift*`
- `services/ops-worker/server.ts`
- `services/ops-worker/finance-rematerialize-seed.ts`
- `services/ops-worker/deploy.sh`
- `scripts/finance/diagnose-fx-drift.ts`
- `scripts/finance/backfill-account-balances-fx-fix.ts`
- `scripts/finance/*fx-drift*`
- `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`
- `Handoff.md`
- `changelog.md` si cambia protocolo operativo o comportamiento runtime.

## Current Repo State

### Already exists

- Reliability signal `finance.account_balances.fx_drift`:
  - `src/lib/reliability/queries/account-balances-fx-drift.ts`
  - `src/lib/reliability/queries/account-balances-fx-drift.test.ts`
  - `src/lib/reliability/get-reliability-overview.ts`
- Smoke E2E:
  - `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts`
- Diagnostico manual:
  - `scripts/finance/diagnose-fx-drift.ts`
- Backfill manual:
  - `scripts/finance/backfill-account-balances-fx-fix.ts`
- Rematerializador canonico:
  - `src/lib/finance/account-balances-rematerialize.ts`
- Seed helper post-`ISSUE-069`:
  - `services/ops-worker/finance-rematerialize-seed.ts`
- Documentacion vigente:
  - `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md`
  - `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

### Gap

- El detector sabe encontrar drift, pero no expone un contrato reutilizable de filas/remediation plan suficientemente rico para automation.
- El backfill sabe reparar, pero esta implementado como script operativo manual, no como servicio/command reusable por scheduler, endpoint y CLI.
- `ops-worker` rematerializa una ventana rolling, pero no tiene un job dedicado que consuma el detector y repare drift residual/retroactivo.
- No existe politica runtime para separar:
  - drift seguro de auto-remediar;
  - drift bloqueado por snapshot/reconciliacion/cierre;
  - drift desconocido o fuera de umbral.
- No existe run tracking especifico que diga: rows vistos, rows remediados, rows bloqueados, cuentas afectadas, rango rematerializado, politica aplicada y evidencia.
- El Playwright smoke falla tarde y obliga a un humano a ejecutar comandos de recuperacion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Open Questions

Estas decisiones se consideran resueltas para la implementacion inicial. Si Discovery demuestra que el runtime real contradice alguna, corregir la task antes de implementar.

1. **Q: Debe Playwright ejecutar el fix si detecta drift?**  
   **Resolucion:** No. Playwright solo verifica steady state.  
   **Rationale:** CI no debe mutar datos financieros ni depender de credenciales operativas para reparar estado.

2. **Q: Debe el scheduler auto-remediar cualquier drift?**  
   **Resolucion:** No. Solo drift elegible segun politica explicita.  
   **Rationale:** En finanzas, resiliencia no significa sobrescribir controles; significa reparar lo deterministicamente reparable y escalar lo que requiere decision contable.

3. **Q: Como tratar el bug class `ISSUE-069` cuando cruza una fecha protegida por snapshot/reconciliacion?**  
   **Resolucion:** Permitir auto-restatement solo si la evidencia matchea una clase conocida y acotada: drift en materializacion `account_balances`, recompute canonico desde views validas, movimiento bancario canonico existente, no hay diferencia en ledger source, y la rematerializacion es idempotente. Debe registrar `policy=known_seed_blind_spot_restatement` o equivalente en run metadata.  
   **Rationale:** Evita que el equipo repita backfills diarios para el mismo bug class, pero deja trazabilidad fuerte de por que se permitio cruzar el guard.

4. **Q: Debe crearse una tabla nueva para approvals?**  
   **Resolucion:** No en el primer slice. Usar `source_sync_runs`/`source_sync_failures` o el mecanismo canonico vigente para run tracking si alcanza. Crear tabla nueva solo si Discovery demuestra que no hay forma robusta de representar `blocked/pending_review` con evidencia.  
   **Rationale:** Reutilizar antes de crear y mantener bajo blast radius.

5. **Q: Debe emitirse un outbox event nuevo?**  
   **Resolucion:** Por defecto no. Reutilizar eventos/materialization existentes si ya existen. Agregar evento versionado solo si hay consumidor real o necesidad de auditoria cross-domain no cubierta por run tracking.  
   **Rationale:** TASK-774 ya evito duplicar eventos para este flujo; no reintroducir ruido sin consumidor.

6. **Q: Debe el script manual desaparecer?**  
   **Resolucion:** No. Debe convertirse en wrapper thin sobre el command canonico compartido, con `--dry-run`, `--apply`, filtros y politica.  
   **Rationale:** Mantiene herramienta operacional, pero elimina logica paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Detector Reader Reusable

- Extraer o extender el reader de `finance.account_balances.fx_drift` para devolver filas detalladas, no solo count/severity.
- Mantener el signal actual como wrapper sobre el reader canonico.
- Incluir por fila:
  - `account_id`
  - `account_name`
  - `currency`
  - `balance_date`
  - `persisted_inflows_clp`
  - `persisted_outflows_clp`
  - `persisted_closing_balance_clp`
  - `expected_inflows_clp`
  - `expected_outflows_clp`
  - `expected_closing_balance_clp`
  - `drift_clp`
  - `abs_drift_clp`
  - `evidence_refs` o campos equivalentes disponibles
  - `detected_at`
- Mantener tolerancia canonica de $1 CLP salvo que arquitectura vigente declare otra.
- Agregar tests unitarios para:
  - steady state `count=0`;
  - drift positivo/negativo;
  - tolerancia;
  - ordenamiento por severidad/fecha/cuenta;
  - compatibilidad del signal existente.

### Slice 2 — Remediation Planner

- Crear command/helper canonico, por ejemplo `src/lib/finance/account-balances-fx-drift-remediation.ts`.
- Exportar al menos:
  - `planAccountBalancesFxDriftRemediation(input)`
  - `remediateAccountBalancesFxDrift(input)`
  - tipos `FxDriftRemediationPlan`, `FxDriftRemediationDecision`, `FxDriftRemediationResult`.
- El planner debe agrupar drift por cuenta y calcular rangos minimos seguros para rematerializar.
- El planner debe clasificar cada fila:
  - `auto_remediable`
  - `known_bug_class_restatement`
  - `blocked_reconciled_or_closed`
  - `blocked_out_of_policy`
  - `unknown_requires_review`
- Guardrails minimos:
  - `maxRows`
  - `maxAccounts`
  - `maxAbsDriftClp`
  - `fromDate` / `toDate`
  - `accountId`
  - `dryRun`
  - `policy`
  - `evidenceGuard`
- La politica default debe ser segura: no cruzar protecciones financieras salvo bug class conocido y evidencia suficiente.
- No duplicar logica de movimientos diarios ni FX. El command debe consumir detector + rematerializador canonico.

### Slice 3 — Canonical Remediation Execution

- Ejecutar rematerializacion por cuenta/rango usando `rematerializeAccountBalanceRange`.
- Reutilizar el contrato de seed vigente y `computeRematerializeSeedDate` cuando el flujo sea rolling/window-based.
- Evitar `new Pool()` y credenciales manuales; usar DB primitives canonicas del repo.
- Asegurar idempotencia:
  - repetir el mismo run no debe duplicar efectos;
  - si no hay drift, retorna `succeeded` con `remediated=0`;
  - si hay drift bloqueado, retorna `partial` o `blocked` con evidencia.
- Revalidar el detector post-rematerializacion dentro del mismo command para confirmar steady state o residual drift.
- No cerrar conexiones a golpes desde script wrapper; si el helper abre recursos, debe exponer/usar lifecycle canonico para no dejar procesos colgados.

### Slice 4 — Ops Worker Endpoint + Scheduler

- Agregar endpoint interno en `services/ops-worker/server.ts`, por ejemplo:
  - `POST /finance/account-balances/fx-drift/remediate`
  - o naming equivalente consistente con rutas existentes del worker.
- Auth/guardrails:
  - misma proteccion que jobs internos existentes;
  - no exponer publicamente sin IAM/token;
  - body con `dryRun`, `maxRows`, `maxAccounts`, `policy`, `windowDays`, `accountId`, `fromDate`, `toDate`.
- Agregar job Cloud Scheduler en `services/ops-worker/deploy.sh`:
  - ejecutar despues del job de rematerializacion rolling;
  - frecuencia inicial conservadora, por ejemplo diaria post-rematerializacion y opcional hourly dry-run si arquitectura lo permite;
  - timeout y retry policy explicitos;
  - payload bounded.
- La ruta debe ser safe para replay: reintentos no duplican efectos.
- Verificar con `gcloud` en staging y registrar evidencia en `Handoff.md`.

### Slice 5 — Run Tracking, Evidence and Signals

- Registrar cada ejecucion en la primitive canonica disponible:
  - preferente: `greenhouse_sync.source_sync_runs`;
  - fallback solo si Discovery demuestra que el dominio de run tracking usa otra tabla/helper.
- Metadata minima por run:
  - `source_system=finance`
  - `source_object_type=account_balances_fx_drift_remediation` o equivalente canonico
  - `status`
  - `started_at`
  - `finished_at`
  - `drift_rows_seen`
  - `drift_rows_remediated`
  - `drift_rows_blocked`
  - `accounts_seen`
  - `accounts_rematerialized`
  - `policy`
  - `dry_run`
  - `max_rows`
  - `max_accounts`
  - `window_days`
  - `residual_drift_count`
  - `blocked_reasons`
  - `evidence`
- Si hay `source_sync_failures`, registrar fallas con error sanitizado.
- Evaluar si hace falta nuevo signal:
  - `finance.account_balances.fx_drift_remediation_lag`
  - `finance.account_balances.fx_drift_blocked`
  - No crear si el existing overview puede representar adecuadamente `blocked` con evidencia.

### Slice 6 — Script/CLI Canonico

- Refactorizar `scripts/finance/backfill-account-balances-fx-fix.ts` para que sea wrapper thin del command canonico.
- Mantener compatibilidad razonable con flags existentes:
  - `--account-id`
  - `--from-date`
  - `--to-date`
  - `--dry-run`
  - `--evidence-guard`
- Agregar flags nuevos si aplica:
  - `--apply`
  - `--policy`
  - `--max-rows`
  - `--max-accounts`
  - `--max-abs-drift-clp`
  - `--json`
- Actualizar `scripts/finance/diagnose-fx-drift.ts` para sugerir el nuevo command y mostrar razon de bloqueo si el planner la conoce.
- Si se agrega script npm, documentarlo en `package.json` solo si sigue patrones existentes.

### Slice 7 — Tests and Regression Coverage

- Tests unitarios para el reader y el planner.
- Tests de command con fixtures/mocks DB siguiendo los patrones vigentes.
- Tests de `services/ops-worker/finance-rematerialize-seed.ts` no deben degradarse.
- Tests de endpoint worker si existe harness para `ops-worker`.
- Regression case explicito para el bug class:
  - cuenta `santander-clp`;
  - fecha `2026-05-01`;
  - outflow esperado `402562.50`;
  - debe planear auto-remediation solo bajo policy segura de bug class conocido.
- Verificar que drift bloqueado no se marque como `ok` artificialmente.

### Slice 8 — Docs and Runbook

- Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`:
  - control plane de drift;
  - politica de auto-remediation;
  - reglas de restatement;
  - scheduler;
  - run tracking.
- Actualizar `docs/documentation/finance/saldos-de-cuenta-fx-consistencia.md`:
  - explicar que la recuperacion normal es automatica;
  - cuando interviene un humano;
  - comandos manuales como fallback controlado.
- Agregar Delta en `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md` indicando que TASK-842 cierra la brecha operacional post-fix.
- Actualizar `Handoff.md` con:
  - scheduler creado;
  - evidencia staging;
  - ultimo run;
  - riesgos/follow-ups.
- Actualizar `changelog.md` si cambia comportamiento operativo relevante.

## Out of Scope

- No redisenar todo el modulo de tesoreria ni absorber TASK-778/TASK-779.
- No cambiar el source of truth contable de movimientos bancarios.
- No crear una UI de aprobaciones humana completa salvo que Discovery demuestre que es bloqueante. Si se necesita, crear follow-up.
- No modificar period close/reconciliation governance mas alla de leer sus estados para decidir policy.
- No relajar Playwright para que ignore el signal rojo.
- No introducir un segundo detector paralelo.
- No crear outbox events sin consumidor real.

## Detailed Spec

### Target Architecture

Flujo deseado:

1. `ops-finance-rematerialize-balances` mantiene la ventana rolling sana usando seed correcto.
2. `finance.account_balances.fx_drift` detecta drift residual/retroactivo contra recompute canonico.
3. `ops-finance-fx-drift-remediate` consume el reader detallado del detector.
4. El planner clasifica drift por politica.
5. El executor rematerializa solo filas/cuentas elegibles con `rematerializeAccountBalanceRange`.
6. El command re-ejecuta el detector.
7. El run queda auditado.
8. Playwright verifica que el signal esta en steady state, sin mutar datos.

### Policy Contract

El agente que implemente debe codificar una politica explicita equivalente a:

```ts
type FxDriftRemediationPolicy =
  | 'detect_only'
  | 'auto_open_periods'
  | 'known_bug_class_restatement'
  | 'strict_no_restatement'
```

Comportamiento esperado:

- `detect_only`: nunca muta; retorna plan.
- `auto_open_periods`: remedia drift en periodos/cuentas sin proteccion financiera.
- `known_bug_class_restatement`: permite restatement acotado cuando evidencia matchea una clase conocida, por ejemplo seed blind spot `ISSUE-069`.
- `strict_no_restatement`: bloquea cualquier fila protegida aunque sea bug class conocido.

Si el repo ya tiene naming/policy primitives equivalentes, reutilizarlas y documentar el mapping.

### Decision Contract

Cada fila del plan debe tener decision estructurada:

```ts
type FxDriftRemediationDecision = {
  accountId: string
  balanceDate: string
  driftClp: string
  decision:
    | 'auto_remediable'
    | 'known_bug_class_restatement'
    | 'blocked_reconciled_or_closed'
    | 'blocked_out_of_policy'
    | 'unknown_requires_review'
  reason: string
  evidence: Record<string, unknown>
}
```

Usar `Decimal`/numeric handling canonico del repo para montos. No usar floating point para CLP/materialized balances.

### Execution Contract

El executor debe retornar un resultado estructurado:

```ts
type FxDriftRemediationResult = {
  status: 'succeeded' | 'partial' | 'blocked' | 'failed'
  dryRun: boolean
  driftRowsSeen: number
  driftRowsRemediated: number
  driftRowsBlocked: number
  accountsSeen: number
  accountsRematerialized: number
  residualDriftCount: number
  decisions: FxDriftRemediationDecision[]
  runs: Array<{
    accountId: string
    fromDate: string
    toDate: string
    daysMaterialized?: number
    finalClosingBalance?: string
  }>
}
```

El shape exacto puede adaptarse al estilo TS del repo, pero debe conservar estos conceptos.

### Scheduler Contract

Job recomendado:

- Nombre: `ops-finance-fx-drift-remediate` o naming equivalente vigente.
- Target: `ops-worker`.
- Metodo: `POST`.
- Payload inicial:

```json
{
  "dryRun": false,
  "policy": "known_bug_class_restatement",
  "windowDays": 90,
  "maxRows": 25,
  "maxAccounts": 10,
  "maxAbsDriftClp": "5000000"
}
```

La implementacion debe ajustar limites segun el runtime real y documentar rationale. Los limites deben proteger contra una rematerializacion masiva accidental.

### Failure Matrix

| Caso | Resultado esperado |
| --- | --- |
| No hay drift | `succeeded`, `remediated=0`, signal sigue `ok` |
| Drift open-period elegible | rematerializa, revalida, signal `ok` |
| Drift `ISSUE-069` con evidencia completa | restatement acotado, audit metadata, revalida |
| Drift reconciliado sin bug class | `blocked`, evidence, signal sigue accionable |
| Drift excede limites | `blocked_out_of_policy`, no muta |
| Rematerializer falla | `failed`, failure sanitized, no false ok |
| Revalidacion post-run mantiene drift | `partial` o `failed`, evidence residual |
| Retry del mismo payload | idempotente, sin duplicar efectos |

### Security and Data Safety

- No imprimir secrets, DSNs ni raw stack traces a logs externos.
- Sanitizar errores en run tracking.
- No aceptar body arbitrario sin parse/validation.
- No permitir payload sin limites.
- No exponer endpoint sin auth interna.
- No hacer destructive DB operations.
- No usar `evidence-guard=warn_only` como default silencioso; si se necesita para clase conocida, renombrarlo/encapsularlo como policy explicita y auditada.

### Architecture Decision

No se requiere ADR dedicado si la implementacion conserva el contrato actual: `account_balances` como materializacion, detector como signal, rematerializador como unica primitive de write. Si Discovery decide introducir tabla nueva de approvals, nuevo outbox event cross-domain o cambio de politica de restatement, debe revisar `docs/architecture/DECISIONS_INDEX.md` y proponer ADR antes de implementar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `finance.account_balances.fx_drift` conserva su contrato publico y sigue siendo el source of truth de steady state.
- [ ] Existe reader/helper reusable que retorna detalle estructurado de drift.
- [ ] Existe command canonico compartido para planear y ejecutar remediacion de FX drift.
- [ ] El script manual actual es wrapper del command canonico o queda documentado por que no aplica.
- [ ] `ops-worker` tiene endpoint interno seguro para remediacion.
- [ ] Cloud Scheduler ejecuta el endpoint con limites y retry policy.
- [ ] Runs quedan trackeados con rows vistos/remediados/bloqueados, cuentas, policy, residual drift y evidencia.
- [ ] Drift elegible se remedia automaticamente con `rematerializeAccountBalanceRange`.
- [ ] Drift protegido/desconocido no se oculta: queda bloqueado/accionable con evidencia.
- [ ] El caso `santander-clp` / `2026-05-01` queda cubierto como regression test o fixture equivalente.
- [ ] Playwright smoke `finance-account-balances-fx-drift.spec.ts` pasa sin ejecutar remediacion.
- [ ] Docs de arquitectura y documentacion funcional reflejan el nuevo control plane.

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/reliability/queries/account-balances-fx-drift.test.ts`
- `pnpm test` sobre los tests nuevos del planner/command.
- `pnpm test` sobre tests relevantes de `services/ops-worker`.
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/diagnose-fx-drift.ts`
- Dry-run local/staging del nuevo command.
- Apply controlado en staging si hay drift elegible.
- `gcloud scheduler jobs run <job-name>` en staging o equivalente documentado.
- `pnpm staging:request /api/admin/reliability` para confirmar `finance.account_balances.fx_drift` en `severity=ok`, `count=0` cuando no hay drift residual.
- Playwright smoke:
  - `pnpm exec playwright test tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts --project=chromium`

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado con scheduler, evidencia staging, riesgos y follow-ups.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo operativo.
- [ ] docs de arquitectura/documentacion funcional quedaron actualizadas.
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-774, ISSUE-069, TASK-773 y jobs finance existentes.
- [ ] no quedan scripts que impriman recovery instructions obsoletas.
- [ ] no queda drift live elegible sin remediar.

## Follow-ups

- UI administrativa para revisar/autorizar drift bloqueado si aparecen casos reales que no deben auto-restatarse.
- Politica formal de period close/restatement para Finance si el volumen de casos protegidos crece.
- Signal separado para `fx_drift_blocked` si el equipo necesita distinguir "data incorrecta" de "control financiero requiere aprobacion".
- Runbook de incident response para drift financiero cross-account si se detecta drift masivo.

## Delta 2026-05-09

Task creada despues de verificar recurrencia real del fallo Playwright `finance.account_balances.fx_drift — TASK-774` en CI. Se uso `greenhouse-finance-accounting-operator` para criterio financiero y `software-architect-2026` para separar detector, policy, command, scheduler y run tracking. El drift live observado en `santander-clp` / `2026-05-01` fue remediado manualmente antes de crear esta task, pero la task existe porque el gap sistemico no queda cerrado con ese backfill.
