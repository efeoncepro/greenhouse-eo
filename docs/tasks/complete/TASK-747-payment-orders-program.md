# TASK-747 — Payment Orders Program

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Programa V1 cerrado 2026-05-01 — TASK-748 + TASK-749 + TASK-750 + TASK-751 entregadas. Backlog V2 declarado en TASK-752/753/754/755.`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-747-payment-orders-program`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Programa transversal para crear la capa canónica de **Órdenes de Pago** en Finance/Tesorería. Separa obligaciones, órdenes, pagos reales, settlement y conciliación para que Payroll exporte obligaciones sin asumir que la nómina ya fue pagada.

## Why This Task Exists

Hoy `payroll_period.exported` crea expenses pendientes, pero Greenhouse no modela la operación de pago: instrumentos distintos por colaborador, processors como Previred/Deel/Global66, batches, maker-checker, settlement legs, evidencia y conciliación. Eso afecta Banco, Finanzas, conciliación y trazabilidad de caja.

## Goal

- Coordinar la implementación del módulo Payment Orders.
- Evitar que Payroll absorba responsabilidades de Tesorería.
- Asegurar rollout incremental sin romper cálculo, exportación ni reliquidación de Payroll.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

Reglas obligatorias:

- Payroll calcula y exporta obligaciones; Finance/Tesorería paga y concilia.
- `payroll_period.exported` no significa `paid`.
- Payments reales viven en `expense_payments` + `settlement_legs`.
- Reconciliación matchea pagos/legs, no Payroll directo.
- Reliquidación sobre pagos cerrados crea deltas compensatorios, no mutación histórica.

## Dependencies & Impact

### Depends on

- Foundation Finance existente: `expense_payments`, `settlement_groups`, `settlement_legs`, `reconciliation_periods`, `accounts`.
- Runtime Payroll export existente: `src/lib/finance/payroll-expense-reactive.ts`.

### Blocks / Impacts

- `TASK-748` Payment Obligations Foundation.
- `TASK-749` Beneficiary Payment Profiles + Routing Policies.
- `TASK-750` Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime.
- `TASK-751` Payroll Settlement Orchestration + Reconciliation Integration.
- `TASK-745` y `TASK-746` deben integrarse con obligaciones/órdenes en vez de crear pagos directos.

### Files owned

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-748-payment-obligations-foundation.md`
- `docs/tasks/to-do/TASK-749-beneficiary-payment-profiles-routing.md`
- `docs/tasks/to-do/TASK-750-payment-orders-batches-maker-checker.md`
- `docs/tasks/to-do/TASK-751-payroll-settlement-orchestration-reconciliation.md`

## Current Repo State

### Already exists

- `src/lib/finance/payroll-expense-reactive.ts` crea expenses `payroll` y `social_security` en `pending`.
- `src/lib/finance/expense-payment-ledger.ts` registra pagos reales y settlement.
- `docs/documentation/finance/modulos-caja-cobros-pagos.md` ya define processors operacionales y settlement multi-leg.

### Gap

- No existe entidad de obligación componentizada.
- No existe orden de pago aprobable.
- No existe perfil de pago versionado por beneficiario.
- Payroll no puede mostrar estado downstream robusto de pago/conciliación.

## Scope

### Slice 1 — Program governance

- Mantener arquitectura y tasks hijas sincronizadas.
- Revisar colisiones con `TASK-745`, `TASK-746`, `TASK-706`, `TASK-707*`, `TASK-714d`.

### Slice 2 — Execution order

- Ejecutar primero `TASK-748`.
- Ejecutar después `TASK-749`.
- Ejecutar `TASK-750` cuando existan obligations + routing.
- Ejecutar `TASK-751` al final para conectar Payroll end-to-end.

## Out of Scope

- Implementar schema/runtime dentro de esta umbrella.
- Cambiar cálculo de Payroll.
- Registrar pagos reales sin la foundation de órdenes.

## Acceptance Criteria

- [ ] `TASK-748` cerrada.
- [ ] `TASK-749` cerrada.
- [ ] `TASK-750` cerrada.
- [ ] `TASK-751` cerrada.
- [ ] Docs de arquitectura, documentación funcional y manuales quedan sincronizados.

## Verification

- Revisión documental.
- Chequeo de tasks hijas.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
