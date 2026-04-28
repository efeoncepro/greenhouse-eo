# TASK-714c — Shareholder Reimbursable Expense Canonical Runtime (factory + UI)

## Status

- Lifecycle: `to-do`
- Priority: `P3` (no urgente — script + runbook cubren el caso V1)
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Bloqueada por trigger de volumen — esperar 3+ casos en un trimestre o 1 caso ambiguo`
- Domain: `finance`
- Branch: `task/TASK-714c-shareholder-reimbursable-expense-canonical-runtime`
- Parent: [`TASK-714`](../complete/TASK-714-banco-instrument-detail-semantic-drawer.md)

## Summary

Promover el patrón "accionista financia con tarjeta personal, empresa reembolsa via CCA" desde un script manual + runbook (V1, ya en producción) hacia una **factory canónica + UI dedicada**. La V1 vive en:

- `scripts/finance/record-shareholder-reimbursable-expense.ts` (script reusable parametrizado).
- `docs/operations/runbooks/shareholder-reimbursable-expense-runbook.md` (runbook canónico).

Cuando aparezcan 3+ casos en un trimestre o 1 caso ambiguo (partial reimbursement, monto distinto por consolidación, FX dispute), esta task absorbe el script en una factory + agrega UI.

## Why This Task Exists

El patrón "accionista financia → empresa reembolsa" tiene 5 ejecuciones conocidas en 8 meses (deel-REC-2026-3 a 2026-7 + HubSpot 46679051 + EXP-NB-22793816). No es volumen suficiente para justificar infraestructura nueva HOY, pero el patrón es claro y reusable.

V1 manual con script + runbook resuelve el problema visible sin over-engineerear. Esta task captura el cierre estructural cuando el volumen lo justifique.

## Goal

- Factory `createShareholderReimbursableExpense({ supplier, document, amounts, card, shareholderAccount, reimbursementDate })` en `anchored-payments.ts`.
- Detector heurístico: cuando llega un `expense_payment` con `payment_account_id=CCA` AND existe transferencia Santander→accionista mismo día con monto idéntico, sugerir el match automáticamente.
- Migration aditiva: columna `expenses.shareholder_card_spread_clp` para separar el spread de tarjeta personal del FX P&L de tesorería (hoy se mezcla en `exchange_rate_to_clp`).
- UI: sección "Adelantos pendientes" en el drawer del CCA mostrando expenses con `shareholder_reimbursable=true` y status. Coordinada con TASK-714 / TASK-706 resolver pattern.
- Outbox event `finance.shareholder_advance.recorded` y `finance.shareholder_advance.reimbursed` (estados explícitos).

## Architecture Alignment

- Reusar resolver `instrument-presentation.ts` perfil `shareholder_account` (TASK-714b).
- Coordinar con `commercial_cost_attribution`: el costo del proveedor se atribuye correctamente (overhead operational hoy).
- Si emerge tabla `shareholder_advances` formal (Nivel C del análisis original), coordinar con identity y permisos del accionista (capability nueva o reusar finance.cca.write).

## Dependencies & Impact

### Depends on

- `scripts/finance/record-shareholder-reimbursable-expense.ts` (V1 ya en producción).
- `docs/operations/runbooks/shareholder-reimbursable-expense-runbook.md` (canónico).
- TASK-714b (perfil shareholder_account corregido) — resolver UI ya consume `closing_balance` con sign correcto.
- `src/lib/finance/payment-instruments/anchored-payments.ts` — factory infrastructure.

### Blocks / Impacts

- UX del CCA drawer si se agrega sección "Adelantos pendientes".
- Reportes de accounts payable (separar deuda con accionista vs deuda con proveedores externos).
- Posible refinamiento de `fx_pnl_breakdown` para excluir spread de tarjeta personal.

### Files owned

- `src/lib/finance/payment-instruments/anchored-payments.ts`
- `src/lib/finance/instrument-presentation.ts` (extensión perfil shareholder)
- `migrations/` (columna `shareholder_card_spread_clp` si se decide modelar)
- `docs/operations/runbooks/shareholder-reimbursable-expense-runbook.md` (actualizar para reflejar factory)
- `scripts/finance/record-shareholder-reimbursable-expense.ts` (refactorizar para usar factory)

## Current Repo State

### Already exists (V1)

- Script reusable `scripts/finance/record-shareholder-reimbursable-expense.ts` con dry-run + apply, idempotencia por (supplier_id, document_number) o (expense_id, payment_account_id, payment_date).
- Runbook canónico `docs/operations/runbooks/shareholder-reimbursable-expense-runbook.md`.
- Caso aplicado: HubSpot recibo 46679051 (USD $1,215 = CLP $1,106,321) cargado al CCA Julio Reyes el 2026-04-27. Closing CCA post-fix = +$172,495.43 (alineado con la narrativa del accionista).
- TASK-714b labels canónicos en perfil shareholder_account.

### Gap

- No existe factory canónica `createShareholderReimbursableExpense`.
- No existe detector que sugiera match automático cuando llega un nuevo expense_payment al CCA.
- No existe distinción entre deuda con accionista vs deuda con proveedor externo en reportes.
- El spread de tarjeta personal se mezcla con el FX P&L de tesorería (no contamina hoy porque volumen es bajo, pero escalará).
- Caso pendiente: `EXP-NB-22793816` (HubSpot Nubox agosto 2025, $1,175,488 CLP) sin fecha de reembolso confirmada.

## Scope (Discovery refina)

### Slice 1 — Factory canónica

- Mover lógica del script a `anchored-payments.ts` como factory `createShareholderReimbursableExpense`.
- El script queda como wrapper CLI sobre la factory.
- Tests unitarios cubriendo: create-new, link-existing, idempotencia, monto USD vs CLP, spread de tarjeta.

### Slice 2 — Schema aditiva

- Migración: columna `expenses.shareholder_card_spread_clp NUMERIC NULL` para separar spread del FX P&L canónico.
- Update `fx_pnl_breakdown` reader: excluir filas con `shareholder_card_spread_clp IS NOT NULL` del `realizedClp`.
- Cero backfill — la columna nace NULL.

### Slice 3 — Detector heurístico

- Worker reactivo o helper inline en el reconciliation flow:
  - Cuando llega un `expense_payment` con `payment_account_id=<cca>` AND existe `settlement_leg` `internal_transfer` Santander→CCA mismo día con `amount` idéntico, sugerir el match.
  - Outbox event `finance.shareholder_advance.match_suggested`.

### Slice 4 — UI section "Adelantos pendientes"

- Extender el resolver shareholder_account profile con sección dedicada.
- Lista de expenses con CCA cargado pero sin reembolso correspondiente (= aporte pendiente del accionista, empresa debe).
- Cuando hay match (settlement_leg cubre el aporte), pasa a "saldado".

### Slice 5 — Tests + observability

- Métrica nueva en ledger-health: `task714c.shareholderAdvancesPending` (count + sum). Steady state esperado: bajo, refleja deuda real con accionistas.
- Tests del detector + factory.
- Documentar runbook actualizado.

## Out of Scope

- Permisos / capability nueva por accionista (reusar finance.cca.write existente).
- Tabla formal `shareholder_advances` con lifecycle (pending → partial → fully_reimbursed → disputed) — eso es una task aparte si emerge complejidad real.
- Backfill histórico de casos antiguos no reflejados en el sistema (e.g. el EXP-NB-22793816 pendiente de confirmación).
- Multi-shareholder runtime (hoy hay 1 CCA activo, Julio Reyes). Cuando aparezca un segundo accionista con CCA, refinar.

## Acceptance Criteria

- [ ] Factory `createShareholderReimbursableExpense` reusable + tests.
- [ ] Script `record-shareholder-reimbursable-expense.ts` refactorizado como wrapper CLI sobre factory.
- [ ] Detector heurístico sugiere matches automáticamente.
- [ ] UI sección "Adelantos pendientes" en drawer CCA (si Discovery confirma necesidad).
- [ ] Spread de tarjeta personal separado del FX P&L de tesorería (si Discovery confirma necesidad).
- [ ] Métrica ledger-health `shareholderAdvancesPending` visible.
- [ ] Doc actualizada.

## Verification

- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`.
- Smoke manual del próximo caso shareholder reimbursable.

## Closing Protocol

- Estándar.
- Verificar que el script V1 sigue funcionando como wrapper.
- Coordinar con TASK-706 si emerge perfil dedicado.

## Follow-ups

- Si el volumen pasa de 5 casos/trimestre → considerar tabla formal `shareholder_advances`.
- Si hay disputed reimbursements (monto distinto, partial), modelar lifecycle states explícitos.

## Open Questions

- ¿Detector inline o reactive worker?
- ¿Spread de tarjeta queda en metadata de expense o en columna dedicada?
- ¿UI section "Adelantos pendientes" justifica esfuerzo, o el chip per-row en movements basta?

## Estado actual del trigger (2026-04-28)

- Casos aplicados V1: 1 (HubSpot 46679051).
- Casos pendientes V1: 1 (EXP-NB-22793816, esperando fecha de reembolso del operador).
- Trigger para activar TASK-714c: 3+ casos en un trimestre o 1 ambiguo.
- A 2026-04-28: bajo el threshold. Task queda en backlog.
