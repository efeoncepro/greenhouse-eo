# TASK-934 — Unanchored paid expense anchoring + suspense review queue

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Derivada de TASK-929 (scope diferido por decisión del operador 2026-05-24)`
- Domain: `finance|accounting|data|reliability`
- Blocked by: `none`
- Branch: `task/TASK-934-unanchored-paid-expense-anchoring-review-queue`

## Summary

Rutear y resolver los gastos pagados sin FK-anchor que TASK-929 dejó visibles vía el inventory + el signal `finance.ledger.unresolved_drift_items`. TASK-929 construyó la detección + clasificación + materialidad (read-only). Esta task construye el **write-path**: anclar (link a supplier/tool/payroll/tax/loan/linked-income con evidencia) o aceptar como deuda conocida (`acknowledgedDebt`), vía una cola de revisión modelada como cuenta de suspenso.

## Why This Task Exists

Discovery de TASK-929 (probe limpio post-hardening 2026-05-24) reveló **37 gastos pagados sin FK-anchor** ($8.2M CLP; 21 material >$50k, 16 inmaterial). **Todos tienen `economic_category`** → están clasificados para P&L (data-completeness, no integridad rota), por eso no son urgentes. La mayoría son `EXP-RECON-*` originados por la conciliación bancaria (bank statement row matched a expense sin link a supplier). El operador difirió la cola de revisión + remediator de TASK-929 a esta task derivada para no construir infra pesada sobre el set ya clasificado mientras la drift core (settlement) se resolvía.

## Goal

- Cola de revisión (suspense account) con state machine `pending → classified → resolved | written_off | dismissed` + CHECK + append-only audit.
- Resolución: anclar el gasto a su FK-anchor con evidencia, o aceptar como `acknowledgedDebt` (batch para inmateriales con política documentada).
- Capability granular `finance.ledger.resolve_unanchored`; write-off / dismiss con segundo actor.
- `acknowledgedDebt` separado de `healthy` en `getFinanceLedgerHealth` (estilo SUM de auditoría): la deuda aceptada queda visible, no flip silencioso.
- (Opcional) recompute remediator endpoint reusando `fn_recompute_income_amount_paid` para futuros `amount_paid` stale.

## Dependencies & Impact

### Depends on

- TASK-929: inventory `getLedgerDriftInventory()` + signal `finance.ledger.unresolved_drift_items` + materialidad (`UNANCHORED_MATERIALITY_THRESHOLD_CLP`).
- Patrón canónico: `account-balances-fx-drift-remediation.ts` (policy/dryRun/decision/evidenceGuard), `payment_order_state_transitions` (state-machine+CHECK+append-only exemplar), capability seed (`finance.payments.repair_clp`).

### Impacta a

- Cost attribution (TASK-709), ICO, Member Loaded Cost — anclar a supplier mejora la atribución.
- `getFinanceLedgerHealth` (agrega `acknowledgedDebt`).

## Scope

### Slice 1 — Review queue table (suspense account)

- Tabla `greenhouse_finance.ledger_drift_review_queue`: `drift_type` enum cerrado, estados con CHECK, columnas ortogonales (drift_type / estado / candidate_anchor), append-only audit, owner `greenhouse_ops`, idempotency key estable `hash(drift_type + source_row_id)`.
- Capability `finance.ledger.resolve_unanchored` (catalog + runtime grant + registry seed + parity).

### Slice 2 — Resolución endpoint + acknowledgedDebt

- `POST /api/admin/finance/ledger-drift/resolve` (dry-run default, capability, write-off con 2º actor).
- `acknowledgedDebt` en `getFinanceLedgerHealth` separado de `healthy`.

### Slice 3 — (Opcional) recompute remediator

- Endpoint thin reusando `fn_recompute_income_amount_paid` para `amount_paid` stale futuros.

### Slice 4 — Docs + closeout

## Out of Scope

- internal_transfer imbalance (3 grupos, ~$2.3M) — territorio TASK-714d, no esta task.
- Settlement drift detection — ya resuelto en TASK-929 Slice 1.

## Verification

- `pnpm pg:doctor`, dry-run + diff, tests focales, health post-apply.
