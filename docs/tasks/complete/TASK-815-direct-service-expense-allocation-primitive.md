# TASK-815 — Direct Service Expense Allocation Primitive

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07 en develop`
- Domain: `commercial / finance / service attribution`
- Trigger: follow-up TASK-806 — direct-client expenses quedaban `operational` por falta de ancla canónica `service_id`
- Branch: `develop` (por instrucción explícita del usuario; no cambiar rama)

## Summary

Se agrega la primitive aprobada `greenhouse_finance.expense_service_allocations` para anclar explícitamente un gasto directo de cliente a un `service_id`. Esto resuelve la deuda de TASK-806 sin heurísticas: un gasto solo se reclasifica como service-linked cuando existe una allocation aprobada, auditable y validada por DB.

## Why This Task Exists

TASK-806 dejó correcto que `commercial_cost_attribution_v2` no inventara `service_id` para `expense_direct_client`: sin ancla canónica, reclasificar era inseguro. Pero eso dejaba los gastos directos de cliente asociados a Sample Sprints como `operational`.

La solución robusta es una primitive explícita `expense -> service`:

- DB valida que el expense sea directo de cliente, no anulado y que no se sobre-asigne.
- DB valida que el service esté activo, no archivado legacy y no `unmapped`.
- `commercial_cost_attribution_v2` expone una lane nueva `expense_direct_service`.
- El residual del gasto sigue como `expense_direct_client` solo por el monto no asignado.
- `service_attribution_facts` consume allocations aprobadas como facts `high` confidence.

## Decisions

- **No inferencia por nombre/cliente/servicio.** El `service_id` solo nace de `expense_service_allocations.review_status='approved'`.
- **Scope V1: direct-client expenses.** La tabla rechaza expenses sin `allocated_client_id` o `cost_is_direct != TRUE` para evitar doble conteo con la lane existente `expense_direct_member_via_fte`.
- **Approval explícito.** Drafts no afectan P&L ni service attribution; solo approved entra a serving views/materializer.
- **Residual, no reemplazo destructivo.** Si un expense de $100.000 tiene $40.000 aprobados a service, v2 emite $40.000 como `expense_direct_service` y $60.000 como `expense_direct_client`.
- **Management accounting, no contabilidad fiscal/legal.** La tabla no muta `expenses`, pagos, settlement ni tax classification; solo alimenta attribution gerencial y service P&L.

## Delivered

- Migration `20260507164348236_task-815-direct-service-expense-allocation.sql`:
  - Crea `greenhouse_finance.expense_service_allocations`.
  - Agrega checks de status, approval/rejection shape, reason y monto.
  - Agrega FKs a `expenses`, `services` y `clients`.
  - Agrega trigger de defaults/guardrails/cap por expense.
  - Reescribe `greenhouse_serving.commercial_cost_attribution_v2` con lane `expense_direct_service`.
- Helper TS `src/lib/finance/expense-service-allocations.ts`:
  - `createExpenseServiceAllocation`
  - `approveExpenseServiceAllocation`
  - `rejectExpenseServiceAllocation`
  - `listExpenseServiceAllocationsForExpense`
- Reader `src/lib/commercial-cost-attribution/v2-reader.ts`:
  - Soporta `expenseDirectService` en totals, coverage y breakdown por cliente.
- Materializer `src/lib/service-attribution/materialize.ts`:
  - Consume allocations aprobadas como `finance_direct_cost / expense_service_allocation`.
  - Descuenta allocations aprobadas del residual de expenses directos para no duplicar.
- Tests unitarios:
  - Helper de allocations.
  - Reader v2 con lane `expense_direct_service`.
  - Regression existente de service attribution.

## Access Model

- `routeGroups`: sin cambios.
- `views`: sin cambios.
- `entitlements`: sin cambios en esta slice; futuras APIs/UI deben usar capabilities Finance/Commercial existentes o declarar capabilities granulares antes de exponer writes.
- `startup policy`: sin cambios.

## Runtime Verification

- `pnpm pg:doctor` OK.
- `pnpm pg:connect:migrate` OK; types Kysely regenerados.
- SQL smoke:
  - `to_regclass('greenhouse_finance.expense_service_allocations')` retorna tabla.
  - `expense_service_allocations` inicia con `0` filas.
  - `commercial_cost_attribution_v2` no emite `expense_direct_service` mientras no existan allocations aprobadas.

## Follow-ups

- TASK-809 debe conectar la UI aprobada de Sample Sprints a esta primitive cuando exponga la asignación manual/guiada de gastos a services.
- TASK-807 puede agregar signal de health si existen expenses direct-client de Sample Sprint sin allocation aprobada por encima de un umbral operativo.
