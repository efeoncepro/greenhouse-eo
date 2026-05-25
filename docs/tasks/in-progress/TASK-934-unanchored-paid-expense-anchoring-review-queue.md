# TASK-934 — Unanchored paid expense anchoring + suspense review queue

## Status

- Lifecycle: `in-progress`
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

- Permitir resolver cada gasto unanchored por dos vías: **anclar** (vendor → `supplier_id`) o **aceptar como deuda conocida** (labor/regulatory clasificado por `economic_category`, sin supplier apropiado).
- `acknowledgedDebt` separado de `healthy` en `getFinanceLedgerHealth` (estilo SUM de auditoría): la deuda aceptada queda visible, no flip silencioso. Inventory + signal excluyen acknowledged del conteo de pendientes.
- Capability granular `finance.expenses.acknowledge_unanchored`.

## Decisión de diseño 2026-05-25 (recalibración pre-execution, lente arch + finance)

La spec original pedía una tabla-cola `ledger_drift_review_queue` con state machine. **Tras Discovery (los 37 son pagos reales con identidad: 18 vendor_cost_saas anclables, 11 labor a personas, 8 regulatory/bank_fee), se pivota a un diseño más robusto y liviano.**

**NO tabla-cola paralela.** Acknowledgment-on-expense + reuse del anchor path existente:

| Resolución | Cómo | Net-new |
|---|---|---|
| Anclar vendor (18 `vendor_cost_saas`: Vercel, Beeconta, SaaS) | PUT `/api/finance/expenses/[id]` con `supplierId` (canónico, ya existe) | reuse, cero código |
| Aceptar labor/regulatory (19: Daniela/Andrés/David/Valentina + regulatory/bank_fee) | `acknowledgeUnanchoredExpense` — columnas `unanchored_acknowledged_*` en `expenses` + outbox + capability (mirror `dismiss-phantom.ts`) | nuevo |

**Rationale**: una tabla-cola separada duplicaría el estado del expense (sync risk — anti-patrón). El expense ES la fuente de verdad; el acknowledgment es propiedad suya (igual que `dismiss-phantom` usa `superseded_at` en la fila). La "cola de revisión" = el inventory de TASK-929 filtrando acknowledged (sin surface nueva, OQ3 TASK-929). Finance-correcto: labor (personas) se acepta clasificado (un `supplier_id` sería category error); vendors se anclan. **No hay write-off** — los 37 son reales y se quedan en P&L; por eso tampoco se requiere segundo actor (no es destructivo; el gasto permanece íntegro). El recompute remediator (`fn_recompute_income_amount_paid`) se omite: no hay `amount_paid` stale en expenses (ese fn es de income).

## Dependencies & Impact

### Depends on

- TASK-929: inventory `getLedgerDriftInventory()` + signal `finance.ledger.unresolved_drift_items` + materialidad (`UNANCHORED_MATERIALITY_THRESHOLD_CLP`).
- Patrón canónico: `account-balances-fx-drift-remediation.ts` (policy/dryRun/decision/evidenceGuard), `payment_order_state_transitions` (state-machine+CHECK+append-only exemplar), capability seed (`finance.payments.repair_clp`).

### Impacta a

- Cost attribution (TASK-709), ICO, Member Loaded Cost — anclar a supplier mejora la atribución.
- `getFinanceLedgerHealth` (agrega `acknowledgedDebt`).

## Scope (recalibrado 2026-05-25)

### Slice 1 — Acknowledgment columns + helper + capability

- Migración: columnas `unanchored_acknowledged_at TIMESTAMPTZ`, `unanchored_acknowledged_by TEXT`, `unanchored_acknowledged_reason TEXT` en `greenhouse_finance.expenses` (nullable; sin tabla nueva).
- Helper canónico `acknowledgeUnanchoredExpense({expenseId, reason, actorUserId})` (mirror `dismiss-phantom.ts`): idempotente, reason >= 10 chars, UPDATE atómico + outbox event `finance.expense.unanchored_acknowledged v1`. NO superseded (el gasto se queda en P&L).
- Capability `finance.expenses.acknowledge_unanchored` (catalog + runtime grant + registry seed + parity).

### Slice 2 — Wire acknowledgedDebt en health/inventory/signal

- `getFinanceLedgerHealth`: el check unanchored excluye acknowledged del conteo que alimenta `healthy`; expone `acknowledgedDebt` (count + total) separado.
- `getLedgerDriftInventory`: excluye acknowledged de pending, sección `acknowledged` separada.
- Signal `finance.ledger.unresolved_drift_items`: excluye acknowledged del conteo de unanchored.

### Slice 3 — Admin endpoint + docs + closeout

- `POST /api/admin/finance/expenses/[id]/acknowledge-unanchored` (capability gate, sanitización error). Anclar vendors = reuse del PUT existente (no endpoint nuevo).
- Docs (CLAUDE.md invariante, arch Delta, EVENT_CATALOG, doc funcional) + closeout.

## Out of Scope

- internal_transfer imbalance (3 grupos) — territorio TASK-714d (reclasificado a falso positivo del detector, ver TASK-714d Delta 2026-05-25).
- Settlement drift detection — ya resuelto en TASK-929 Slice 1.
- Tabla-cola con state machine — descartada por recalibración (acknowledgment-on-expense es single source of truth).
- Write-off / segundo actor — no aplica (los 37 son reales, se quedan en P&L; acknowledgment no es destructivo).
- recompute remediator — `fn_recompute_income_amount_paid` es de income, no expenses; no hay amount_paid stale acá.
- Anchor endpoint nuevo — reuse PUT `/api/finance/expenses/[id]` existente.

## Verification

- `pnpm pg:doctor`, dry-run + diff, tests focales, health post-apply.
