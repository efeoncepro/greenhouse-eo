# Saldos bancarios FX drift — Manual operativo

> **Tipo de documento:** Manual de uso operativo
> **Version:** 1.0
> **Creado:** 2026-05-09 por Codex
> **Ultima actualizacion:** 2026-05-09 por Codex
> **Modulo:** Finanzas / Banco / Reliability
> **Ruta en portal:** `/finance/bank` y `/admin/operations`
> **Documentacion relacionada:** [Consistencia FX de saldos de cuenta](../../documentation/finance/saldos-de-cuenta-fx-consistencia.md), [Arquitectura financiera](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md#task-842--fx-drift-remediation-control-plane), [TASK-842](../../tasks/complete/TASK-842-finance-fx-drift-auto-remediation-control-plane.md)

## Para que sirve

Este manual explica como operar el control plane que mantiene consistente el
signal `finance.account_balances.fx_drift`.

El objetivo es evitar reparaciones manuales repetidas sobre saldos bancarios.
Cuando aparece drift elegible, Greenhouse debe diagnosticar, planear,
rematerializar con primitives canonicas y dejar auditoria. El sistema no debe
hacer `UPDATE` directo sobre `account_balances` ni esconder drift desconocido.

## Antes de empezar

Necesitas acceso operativo a:

- `/admin/operations` para revisar el signal de reliability.
- CLI autenticado contra GCP/Postgres si vas a ejecutar diagnostico o dry-run.
- Criterio financiero para distinguir drift de bug conocido vs diferencia que
  requiere revision de periodo, conciliacion o evidencia bancaria.

El job automatico corre todos los dias:

- Scheduler: `ops-finance-fx-drift-remediate`.
- Horario: `05:15 America/Santiago`.
- Endpoint interno: `POST /finance/account-balances/fx-drift/remediate`.
- Auditoria: `greenhouse_sync.source_sync_runs` con
  `source_object_type='account_balances_fx_drift_remediation'`.

## Paso a paso

1. Revisa `/admin/operations` y confirma si
   `finance.account_balances.fx_drift` esta distinto de `ok`.
2. Ejecuta diagnostico en CLI:

   ```bash
   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
     scripts/finance/diagnose-fx-drift.ts
   ```

3. Si el diagnostico reporta steady state, no hagas nada mas.
4. Si hay drift, revisa la evidencia: cuenta, fecha, monto, movement esperado,
   persisted values y si hay periodo cerrado o snapshot reconciliado.
5. Para simular remediacion manual, usa el wrapper en dry-run:

   ```bash
   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
     scripts/finance/backfill-account-balances-fx-fix.ts \
     --account-id=<account_id> \
     --from-date=<YYYY-MM-DD>
   ```

6. Solo si el caso es elegible y entendido, ejecuta live mode con `--apply`.
   El wrapper reutiliza el mismo command canonico del ops-worker.
7. Despues de cualquier remediacion, vuelve a ejecutar el diagnostico y revisa
   el ultimo run en `source_sync_runs`.

## Que significan las policies

| Policy | Uso esperado | Escritura |
|---|---|---:|
| `detect_only` | Diagnostico y plan sin mutar datos. | No |
| `auto_open_periods` | Drift de periodo abierto, sin evidencia protegida. | Si |
| `known_bug_class_restatement` | Bug conocido con evidencia suficiente, por ejemplo seed blind spot de ISSUE-069. | Si, acotada |
| `strict_no_restatement` | Bloquea cualquier caso protegido aunque parezca bug conocido. | Si, solo open-period |

## Que revisar en la auditoria

Consulta el ultimo run:

```sql
select sync_run_id,
       status,
       records_read,
       records_written_raw,
       records_written_conformed,
       records_projected_postgres,
       notes,
       started_at,
       finished_at
from greenhouse_sync.source_sync_runs
where source_system = 'finance'
  and source_object_type = 'account_balances_fx_drift_remediation'
order by started_at desc
limit 5;
```

Interpretacion rapida:

- `records_read`: filas de drift observadas.
- `records_written_raw`: filas bloqueadas por politica o evidencia.
- `records_written_conformed`: filas remediadas.
- `records_projected_postgres`: cuentas rematerializadas.
- `notes`: policy, dry-run/live, filas vistas, remediadas, bloqueadas y
  residual final.

## Que no hacer

- **NO** hagas `UPDATE` directo sobre `greenhouse_finance.account_balances`.
- **NO** recalcules CLP inline desde `expense_payments`, `income_payments` o
  `settlement_legs`; usa readers/VIEWS canonicas.
- **NO** apagues o relajes el Playwright smoke para que pase CI.
- **NO** cambies `evidenceGuard` a `off` para saldos bancarios.
- **NO** uses `--apply` si el diagnostico muestra periodo cerrado,
  conciliacion aceptada/reconciliada o bug class no entendido.
- **NO** aumentes `maxRows`, `maxAccounts` o `maxAbsDriftClp` para forzar un
  run grande sin revisar causa raiz.

## Problemas comunes

- **El scheduler corrio pero no remedio nada.**
  Revisa `notes`. Si `seen=0`, no habia drift. Si `blocked>0`, hay evidencia
  protegida o overflow de politica.

- **Queda `residual>0` despues de remediar.**
  No repitas a ciegas. Revisa si el drift viene de una fuente no cubierta por
  el bug class conocido o de un periodo protegido.

- **El smoke de Playwright falla otra vez por FX drift.**
  Ejecuta diagnostico primero. Si el job diario ya corrio y aun queda drift,
  tratelo como incidente de datos o contrato, no como problema de Playwright.

- **El caso cruza una fecha conciliada o aceptada.**
  Usa policy conservadora y eleva revision financiera. La remediacion automatica
  no debe reescribir historia protegida salvo bug class conocido y auditable.

## Referencias tecnicas

- Reader del signal: `src/lib/reliability/queries/account-balances-fx-drift.ts`
- Command canonico: `src/lib/finance/account-balances-fx-drift-remediation.ts`
- Endpoint ops-worker: `services/ops-worker/server.ts`
- Scheduler deploy: `services/ops-worker/deploy.sh`
- Wrapper manual: `scripts/finance/backfill-account-balances-fx-fix.ts`
- Diagnostico: `scripts/finance/diagnose-fx-drift.ts`
- Tests: `src/lib/finance/account-balances-fx-drift-remediation.test.ts`
- Arquitectura: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
