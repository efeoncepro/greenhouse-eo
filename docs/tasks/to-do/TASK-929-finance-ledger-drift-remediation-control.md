# TASK-929 — Finance ledger drift remediation control

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno derivado de auditoria Sentry semanal 2026-05-24`
- Rank: `TBD`
- Domain: `finance|accounting|data|reliability`
- Blocked by: `none`
- Branch: `task/TASK-929-finance-ledger-drift-remediation-control`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Remediar `JAVASCRIPT-NEXTJS-4Q` como deuda contable real, no como ruido Sentry. La task separa settlement drift resoluble por reconciliacion canonica de gastos pagados sin anchor, que requieren evidencia supplier/tool/payroll/tax/loan/linked income o cola de revision humana.

## Why This Task Exists

El health check diario de finance ledger sigue detectando drift. En esta sesion se agrego dedupe/audit a la alerta para que Sentry avise cuando la firma cambia materialmente, pero no se debe ocultar el estado unhealthy ni autoclasificar contabilidad sin evidencia suficiente.

## Goal

- Clasificar cada drift por tipo contable y fuente de verdad.
- Remediar settlement drift con reconciliacion canonica y evidence guard.
- Enviar expenses pagados sin anchor a cola de revision si no hay evidencia contable suficiente.
- Mantener una senal visible de deuda conocida hasta que el ledger quede reconciliado.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/audits/sentry/SENTRY_WEEKLY_REMEDIATION_AUDIT_2026-05-24.md`

Reglas obligatorias:

- No mutar ledger sin `pnpm pg:doctor` y dry-run previo.
- No clasificar expenses sin anchor si falta evidencia contable.
- No esconder `JAVASCRIPT-NEXTJS-4Q`; solo resolver cuando el drift sea cero o aceptado con decision contable documentada.
- Todo write path debe dejar audit trail, idempotency key y rollback/compensation plan.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts` registra health runs `finance_ledger_health` con `driftSignature`.
- Signals/health actual de finance ledger.

### Blocks / Impacts

- Cierre real de `JAVASCRIPT-NEXTJS-4Q`.
- Menos ruido Sentry sin perder visibilidad contable.
- Mayor confianza en dashboards de caja, settlements y P&L.

### Files owned

- `src/lib/finance/**`
- `services/ops-worker/**`
- `scripts/finance/**`
- `docs/audits/finance/**`
- `docs/documentation/finance/**`

## Current Repo State

### Already exists

- Health check diario detecta drift.
- Dedupe/audit de alertas por firma deterministica implementado localmente.
- Remediadores financieros previos existen para FX/account balances y patrones de evidence guard.

### Gap

- No existe inventario contable accionable por sample.
- Settlement drift y unanchored paid expenses no estan separados en flujos de remediation.
- No hay cola de revision humana para casos sin anchor evidente.

## Scope

### Slice 1 — Drift ledger inventory

- Crear reporte read-only por drift type: settlement, phantom/stale balance, unanchored paid expense.
- Incluir source rows, amounts, dates, linked documents y evidencia disponible.

### Slice 2 — Canonical settlement reconciliation

- Para settlement drift con source canonico claro, ejecutar dry-run y remediation idempotente.
- Usar evidence guard y registrar antes/despues.

### Slice 3 — Unanchored expense decision queue

- Clasificar expense pagado por anchors posibles: supplier, tool, payroll, tax, loan, linked income.
- Si falta evidencia, crear cola de revision con owner y razon; no autoclasificar.

### Slice 4 — Health signal semantics

- Ajustar finance ledger health para distinguir known debt, new drift y materially changed drift.
- Mantener estado visible hasta cierre contable.

### Slice 5 — Documentation and closeout

- Auditoria finance versionada con resultado de remediation.
- Runbook para futuras corridas y Sentry closeout.

## Out of Scope

- Cambios cosmeticos en dashboards finance.
- Reescribir el ledger completo.
- Borrar o sobrescribir movimientos historicos sin compensating entry y audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 read-only -> Slice 2/3 remediation controlada -> Slice 4 signals -> Slice 5 closeout. Ninguna mutacion antes de inventario y dry-run.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Clasificacion contable incorrecta | finance/accounting | medium | evidence guard + revision humana | finance ledger health |
| Doble remediation | finance/data | low | idempotency key + audit trail | driftSignature cambia inesperadamente |
| Ocultar deuda conocida | reliability | medium | status visible + known debt notes | Sentry + source_sync_runs |
| Mutacion irreversible | finance/data | medium | dry-run + compensating entry plan | post-run reconciliation |

### Feature flags / cutover

Remediation mutante debe ser dry-run por defecto. Cualquier auto-apply requiere flag/env explicito y allowlist de drift IDs o periodos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | doc/report only | inmediato | si |
| 2 | compensating entries segun runbook | variable | parcial |
| 3 | cerrar/reabrir items de revision | inmediato | si |
| 4 | revert PR | <15 min | si |
| 5 | doc correction | inmediato | si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. Read-only inventory.
3. Dry-run remediation con diff esperado.
4. Approval humano para casos no triviales.
5. Apply acotado por allowlist.
6. Re-run health; Sentry se resuelve solo si no hay recurrencia 24-48h y el cierre contable esta documentado.

## Verification

- `pnpm pg:doctor`
- Tests focales finance/remediation.
- Dry-run + diff contable.
- Health check finance ledger post-apply.
