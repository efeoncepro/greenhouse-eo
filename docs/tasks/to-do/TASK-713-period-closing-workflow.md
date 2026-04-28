# TASK-713 — Period Closing Workflow: snapshots inmutables y restatement controlado

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Crítico` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Domain | Cost Intelligence / Finance / Management Accounting |
| Sequence | Después de TASK-710 (materializers deben existir) |

## Summary

Implementar el **workflow operativo de cierre mensual** descrito en `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` §5 (Snapshots Inmutables) + §6 (Period Closing). El cierre produce snapshots inmutables de `member_loaded_cost_per_period` y `client_full_cost_per_period` con auditoría completa de quién, cuándo, contra qué inputs.

Esta task entrega:

- Tabla `accounting_periods` con estados (`open`, `pending_close`, `closed`, `restated`) y FK al user que cerró
- Tabla `member_loaded_cost_per_period_snapshot` (inmutable, append-only)
- Tabla `client_full_cost_per_period_snapshot` (inmutable, append-only)
- Función `closeAccountingPeriod(year, month, actorUserId)` con preflight checks (coverage, drift, gates)
- Función `restateAccountingPeriod(year, month, motivo, actorUserId)` con audit trail completo
- UI `/admin/finance/period-closing` con preflight dashboard, close button, restatement form
- Outbox events `finance.period.closed`, `finance.period.restated`

## Why This Task Exists

El modelo dimensional MLCM_V1 produce facts mutables que cambian con cada nueva expense, payroll entry, o reclassification. Sin snapshots:

1. **Reportes históricos drift**: Service P&L de marzo cambia si en abril alguien backfilla un expense de marzo.
2. **No hay defendibilidad legal/contable**: stakeholders necesitan "el cost de marzo según se cerró el 15 de abril, inmutable".
3. **No hay restatement controlado**: cuando aparece un expense legítimo de un periodo cerrado, no hay protocolo claro.

El workflow de cierre es el **único modo defendible** de operar cost intelligence enterprise-grade.

## Scope

### In scope

- Migración `accounting_periods` — cardinalidad `(year, month)` UNIQUE
- Migración snapshots inmutables (CHECK constraint contra UPDATE/DELETE post-cierre via trigger)
- Preflight checks previos al cierre:
  - Coverage `tool_consumption_period` >95%
  - Coverage `payroll_member_client_allocations` >95% (saturation drift = 0)
  - Drift `income_settlement_reconciliation` = 0 (TASK-571 contract)
  - Drift `account_balances` vs OTB chain (TASK-703 contract)
  - All reliability signals `Finance Data Quality` en `green` o `amber` (no `red`)
- Close button con confirmación de gates pasados
- Restatement workflow: diff entre snapshot inmutable original y new snapshot con motivo persistido
- Outbox events para downstream consumers (BI, exports, dashboards históricos)
- Reliability signal `period_closing.last_close` — flag amber si último mes cerrado >35 días atrás
- Tests vitest:
  - Snapshot inmutability: UPDATE/DELETE post-close fail
  - Preflight gates fail si signals están en red
  - Restatement preserva audit chain
  - Idempotency: re-run close mismo periodo es no-op si ya cerrado

### Out of scope

- Cierre automático scheduled (manual-trigger only, futuro TASK)
- BU-level closing (enterprise extension, TASK-394)
- Multi-entity consolidation closing (TASK-394)
- Variance vs budget integration (TASK-395 / TASK-396)

## Architecture Reference

Spec raíz: `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`

- §5 Snapshots Inmutables
- §6 Period Closing Workflow
- §11 Roadmap — Fase 4 Period Governance

Spec subordinada: `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` — gate Reliable Actual Foundation describe los preflight checks.

## Dependencies & Impact

### Depende de

- TASK-710 (Tool Consumption Bridge) — sin Fact 2/3/4 materializados no hay nada que snapshotear
- TASK-176 (Labor Provisions) — gate Reliable Actual Foundation requiere fully-loaded labor cost
- TASK-571 (Income settlement reconciliation) — preflight check
- TASK-703 (OTB cascade) — preflight check
- TASK-393 (period governance restatements) — esta task implementa el subset operativo de TASK-393

### Impacta a

- TASK-396 (variance) — consume snapshots
- TASK-146 (Service P&L) — versión histórica viene del snapshot, no del live fact
- Reliability dashboard — nueva subsystem `Period Closing`

### Archivos owned

- `migrations/<ts>_task-713-accounting-periods.sql`
- `migrations/<ts>_task-713-mlcm-snapshots.sql`
- `src/lib/cost-intelligence/period-closing.ts`
- `src/app/(dashboard)/admin/finance/period-closing/*`
- `src/app/api/admin/finance/period-closing/route.ts`

## Acceptance Criteria

- Admin puede cerrar mes vía UI con preflight checks visibles
- Snapshot inmutable se materializa atómicamente con outbox event
- Restatement con motivo + audit trail funcional
- Trigger anti-mutación previene UPDATE/DELETE post-close
- Reliability signal `period_closing.last_close` en dashboard
- Tests passing
- Doc operativo `docs/documentation/finance/cierre-mensual-cost-intelligence.md`

## Notes

Esta task convierte a Greenhouse de "live cost view" a "auditable accounting platform". Es el último gate antes de exponer Cost Intelligence a stakeholders externos (board, partners, audits).

Coordinación con TASK-393: ese task tiene scope más amplio (restatement engine, reclassification, multi-period). Esta TASK-713 es el slice mínimo viable para cerrar el primer mes con MLCM live.
