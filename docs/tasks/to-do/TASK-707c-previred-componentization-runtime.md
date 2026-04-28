# TASK-707c — Previred Componentization Runtime

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Bloqueada — espera TASK-707a + TASK-707b cerradas`
- Domain: `finance` + `payroll`
- Blocked by: `TASK-707a`, `TASK-707b`
- Branch: `task/TASK-707c-previred-componentization-runtime`
- Parent task: [`TASK-707`](TASK-707-previred-canonical-payment-runtime-and-backfill.md)

## Summary

Definir cómo un pago Previred pasa de `componentization_status='pending_componentization'` a `'componentized'` cuando existe payroll context suficiente: descomposición por `payroll_entry_id`, `payroll_period_id`, `member_id`, `social_security_type`. Esta task se ejecuta cuando el lifecycle real de pagos Previred lo amerita — no urgente hoy (1 fila pendiente al 2026-04-28).

## Why This Task Exists (split rationale)

`TASK-707` original lo junta con detection + backfill, pero la componentización efectiva requiere:

- Payroll module con `payroll_entry_id` desglosado por miembro Y por componente social_security_type.
- Política operativa de cuándo componentizar (inline en write-path vs reactive worker).
- Coordinación con AFP / Fonasa / Mutual / etc. cada uno con su lógica.

Hoy hay 1 caso (`EXP-202603-006` $32,811 pending). No es bloqueante operativamente. Aplazar minimiza el riesgo de over-engineering ante volumen real bajo.

## Goal

- Definir contrato runtime para transición `pending_componentization` → `componentized`.
- Reusar `createPreviredSettlement()` o factorizarla si necesita soportar split por componente.
- Idempotencia + audit trail entre el pago consolidado y los componentes.
- Coordinación con payroll engine (TASK-186 / payroll exports).

## Architecture Alignment

- Payroll period como anchor canónico: `payroll_period_id` + `payroll_entry_id` + `social_security_type`.
- TASK-186 (payroll engine) provee el desglose por miembro × institución.
- TASK-708 invariantes (payment_account_id NOT NULL) ya respetadas por carril 707a.

## Dependencies & Impact

### Depends on

- **TASK-707a** completa (carril runtime canónico activo).
- **TASK-707b** completa (histórico ya canónico).
- `src/lib/finance/payment-instruments/anchored-payments.ts` — `createPreviredSettlement` factory (refactorizar si requiere split).
- `src/lib/finance/payroll-expense-reactive.ts` — reactivo desde `payroll_period.exported`.
- Payroll module — `payroll_entries.social_security_*` (estructura por miembro × tipo).

### Blocks / Impacts

- Reportería previsional por miembro / institución / período.
- Cost attribution por miembro (si componentes alimentan `client_labor_cost_allocation_consolidated` por separado del consolidado).

### Files owned (provisional)

- `src/lib/finance/payment-instruments/anchored-payments.ts`
- `src/lib/finance/payroll-expense-reactive.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts` (si la componentización cambia atribución)
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/hr/payroll.md` (si existe)

## Current Repo State

### Already exists

- `payroll_entries` con desglose social_security por miembro.
- `expenses.payroll_entry_id` + `payroll_period_id` + `social_security_type` ya como columnas (verificadas en discovery TASK-706).
- Factory `createPreviredSettlement()` que ya soporta el path canónico básico.

### Gap

- No existe transición `pending_componentization` → `componentized` automática cuando emerge payroll anchor.
- No existe política sobre componentización inline vs reactive worker.
- No existe contrato sobre cómo el consolidado convive con los componentes (si supersede el padre o lo extiende).

## Scope (high-level — Discovery refina)

### Slice 1 — Política de componentización

- Decisión arquitectónica: componentización es inline (en el write-path cuando emerja payroll context) o reactiva (worker que escucha `payroll_period.exported` + `finance.expense.payment_recorded`).
- Recomendación inicial: reactiva, porque el payroll period puede cerrarse después del pago bancario (lo que es común en flujo Previred CL).

### Slice 2 — Refactor de la factory

- Extender `createPreviredSettlement` para emitir consolidado + componentes en una sola transacción cuando el contexto está listo.
- Definir convención: el consolidado queda como `superseded_by` el primer componente, o el consolidado coexiste con los componentes (modelo father-children).
- Tests cubriendo idempotencia (componentización ejecutada 2 veces = no-op).

### Slice 3 — Transition runtime

- Worker reactivo `previred-componentization-projection` que:
  - Escucha `finance.expense.payment_recorded` con `expense_type='social_security'` AND `componentization_status='pending_componentization'`.
  - Verifica `canBuildPreviredComponents(payrollPeriodId)`.
  - Si sí: ejecuta componentización + actualiza `componentization_status='componentized'`.

### Slice 4 — Tests + observability

- Métrica nueva en ledger-health: `task707c.previredStuckPending` (rows pending con > 30 días). Steady state esperado: 0.
- Tests de transición + idempotencia.

### Slice 5 — Documentation

- Update `docs/documentation/finance/modulos-caja-cobros-pagos.md` con el lifecycle completo.
- Cross-reference desde `docs/documentation/hr/` si aplica.

## Out of Scope

- Detection / canonical state — TASK-707a.
- Backfill histórico — TASK-707b.
- Rediseño del payroll engine.
- Componentización para procesadores que no son Previred (Caja de Compensación, etc.) — emerge cuando aparezca el segundo processor.

## Acceptance Criteria

- [ ] Política de componentización (inline vs reactive) decidida y documentada.
- [ ] Pagos `pending_componentization` con payroll context suficiente transicionan a `componentized` automáticamente.
- [ ] Idempotencia garantizada (re-ejecución = no-op).
- [ ] Audit trail entre consolidado y componentes.
- [ ] Métrica `task707c.previredStuckPending` visible y en 0 cuando el lifecycle es saludable.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke manual sobre el primer pago Previred del lifecycle que amerite componentización.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo movido a `complete/`.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] TASK-707 padre marcada como complete.

## Follow-ups

- Generalización: si emerge un segundo `payroll_processor` (Caja de Compensación, etc.) con componentización, abstraer el contrato.

## Open Questions

- Modelo father-children vs supersede chain — decisión arquitectónica importante.
- Inline vs reactive — confirmar timing real con stakeholder de payroll.
- Si la componentización cambia `commercial_cost_attribution` (atribución por miembro vs consolidado), coordinar con TASK-709 / TASK-710.
