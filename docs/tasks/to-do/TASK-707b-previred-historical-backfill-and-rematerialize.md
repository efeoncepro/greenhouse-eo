# TASK-707b — Previred Historical Backfill & Downstream Rematerialize

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation` + `runbook execution`
- Status real: `Bloqueada — espera 7+ días de operación limpia de TASK-707a antes de scheduler`
- Domain: `finance`
- Blocked by: `TASK-707a` (detection + canonical state runtime debe estar viva y validada)
- Branch: `task/TASK-707b-previred-historical-backfill-and-rematerialize`
- Parent task: [`TASK-707`](TASK-707-previred-canonical-payment-runtime-and-backfill.md)

## Summary

Migrar las filas históricas de pagos Previred mal clasificadas (`bank_fee`, `previred_unallocated`, `cost_category='overhead'`) hacia el contrato canónico (`expense_type='social_security'`, `componentization_status` poblado, anchor en cuenta pagadora real). Después: rematerializar `commercial_cost_attribution` y `client_economics` sin doble conteo y sin drift en `client_labor_cost_allocation_consolidated` (TASK-709).

Esta task NO se ejecuta hasta que TASK-707a haya operado limpiamente ≥ 7 días en producción, con cero degradación silenciosa observada.

## Why This Task Exists (split rationale)

`TASK-707` original junta backfill histórico con detection + componentización. Backfill toca filas que ya alimentaron projections downstream — recomputar mal cambia P&L histórico. Aislar esta task permite:

- Ejecutar runbook + dry-run + apply + verificación con calma.
- Tener TASK-707a vivo como fuente canónica para nuevas filas → backfill no compite con write-path.
- Bloquear si emerge bug en 707a (cero filas adicionales contaminadas mientras se diagnostica).

## Goal

- Identificar todas las filas Previred históricas mal clasificadas (cohorte `previred_unallocated` / `bank_fee` con texto/provider Previred).
- Reclasificar atómicamente: cascade-supersede del payment legacy + crear payment canónico nuevo `social_security` + re-match `bank_statement_rows.matched_payment_id` al nuevo ID.
- Rematerializar downstream sin doble conteo: `commercial_cost_attribution`, `client_economics`, `client_labor_cost_allocation_consolidated`.
- Verificar que P&L de marzo/abril 2026 NO cambia el total agregado por cliente (solo cambia la categoría: overhead → social_security).
- Audit trail completo: cada fila migrada queda con `superseded_at` + `superseded_reason` referenciando el runbook.

## Architecture Alignment

Patrones canónicos a reutilizar:

- **Cascade-supersede atómico** (TASK-708b / TASK-715 santander-clp followups): `superseded_at = NOW()` + cascade a `settlement_legs` + `bank_statement_rows.matched_payment_id` re-asignado.
- **Camino E migration pattern** (TASK-708b): VALIDATE idempotente self-checking.
- **Rematerialize canónico** (TASK-705): `pnpm tsx scripts/finance/rematerialize-account.ts` para account_balances; cron `ops-finance-rematerialize-balances` para read model mensual.
- **Drift verification** (TASK-709): `client_labor_cost_allocation_consolidated.source_payroll_entry_count` y `labor_allocation_saturation_drift` — deben quedar en 0 o explicarse delta.
- **Reactive projection refresh** (TASK-708): outbox event `finance.expense.payment_dismissed_historical` + `finance.expense.payment_recorded` para que projections downstream re-corran.

## Dependencies & Impact

### Depends on

- **TASK-707a** (carril canónico activo) — sin esto, las nuevas filas que ingresen durante backfill caen en el contrato viejo.
- `src/lib/finance/payment-instruments/dismiss-phantom.ts` (cascade-supersede helper TASK-708b).
- `src/lib/finance/payment-ledger-remediation.ts` (script existente de remediación de payment ledgers).
- `scripts/finance/conciliate-march-april-2026.ts` — fuente de verdad de qué filas son Previred reales.
- `client_labor_cost_allocation_consolidated` (TASK-709) — verificación drift post-backfill.

### Blocks / Impacts

- `commercial_cost_attribution` recompute para meses afectados.
- `client_economics` recompute.
- Revierte rows con `cost_category='overhead'` que alimentaron reportes históricos — comunicar a stakeholders antes de apply.
- TASK-714 / TASK-706 drawer: muestra histórico ya canónico tras backfill (UX consistency win).

### Files owned (provisional)

- `scripts/finance/backfill-previred-historical.ts` (script con dry-run + --apply)
- `docs/operations/runbooks/TASK-707b-previred-backfill-runbook.md` (runbook canónico)
- `migrations/` (si se necesita columna auxiliar para tracking del batch)
- `docs/documentation/finance/conciliacion-bancaria.md` (sección backfill ejecutado)

## Current Repo State

### Already exists

- Filas Previred mal clasificadas en `expense_payments` con reference patrones `sclp-*-previred-*` (verificado en santander-clp followups).
- `expenses` con `expense_type='bank_fee'` o `cost_category='overhead'` que en realidad son `social_security`.
- Helpers de cascade-supersede listos (TASK-708b cascade pattern + TASK-715 update).
- Remediation script base en `src/lib/finance/payment-ledger-remediation.ts`.
- TASK-707a (cuando esté completa) — factory canónica routing automático para nuevas filas.

### Gap

- No existe inventario formal de filas a migrar.
- No existe runbook con dry-run / apply / verification idempotente.
- No existe script que coordine cascade-supersede + creación canónica + re-match `bank_statement_rows` + rematerialize en una transacción atómica.
- No hay protocolo de verificación post-apply para drift downstream.

## Scope

### Slice 1 — Inventory

- Query reproducible que liste filas candidatas:
  ```sql
  SELECT ep.payment_id, ep.expense_id, ep.payment_date, ep.amount, ep.reference,
         e.expense_type, e.cost_category, e.miscellaneous_category
  FROM expense_payments ep
  JOIN expenses e ON e.expense_id = ep.expense_id
  WHERE ep.superseded_at IS NULL
    AND ep.superseded_by_payment_id IS NULL
    AND ep.superseded_by_otb_id IS NULL
    AND (
      e.expense_type = 'bank_fee' OR e.cost_category = 'overhead' OR e.miscellaneous_category = 'previred_unallocated'
    )
    AND (LOWER(ep.reference) LIKE '%previred%' OR LOWER(e.supplier_name) LIKE '%previred%')
  ```
- Resultado guardado como `docs/operations/runbooks/TASK-707b-evidence-pre-apply-YYYYMMDD.json`.
- Counts esperados V1 (a confirmar en discovery): rows marzo + abril 2026, monto total ≈ $552k CLP (276k × 2 pagos visibles + EXP-202603-006 $32k pendiente).

### Slice 2 — Backfill script (dry-run default)

- `scripts/finance/backfill-previred-historical.ts`:
  - Lee inventory.
  - Para cada row:
    1. Crea nuevo payment canónico `expense_type='social_security'` con `componentization_status='pending_componentization'` (a menos que haya payroll anchor disponible — entonces `componentized`).
    2. Cascade-supersede del legacy: `expense_payments.superseded_at = NOW()`, settlement_legs idem, `bank_statement_rows.matched_payment_id` re-apuntado al nuevo.
    3. Outbox events: `finance.expense.payment_dismissed_historical` (legacy) + `finance.expense.payment_recorded` (canónico).
  - Idempotencia: si row ya tiene `componentization_status` poblado → skip (TASK-707a ya lo tomó).
  - Dry-run default. `--apply` requerido + confirmación manual.

### Slice 3 — Downstream rematerialize

- Después del apply:
  - `pnpm tsx scripts/finance/rematerialize-account.ts santander-clp <genesis>` — reconstruye account_balances.
  - Recompute reactive de `commercial_cost_attribution` para los meses afectados (vía outbox events que ya emitirá el script).
  - Recompute reactive de `client_economics` idem.
  - Verificación: comparar `client_economics.total_cost_clp` per cliente per mes ANTES y DESPUÉS — el agregado debe ser idéntico (solo cambió la categoría interna).

### Slice 4 — Drift verification

- Validar que `labor_allocation_saturation_drift` queda en 0 o tiene delta explicable.
- Validar que `task708d.postCutoverPhantomsWithoutBankEvidence` no se dispara (los nuevos canónicos tienen bank_statement_row matched).
- Validar que `getProcessorDigest('previred-clp')` retorna `componentizationStatus` correcto post-backfill.
- Smoke manual del drawer TASK-706 para Previred.

### Slice 5 — Documentation + closing

- Runbook completo `docs/operations/runbooks/TASK-707b-previred-backfill-runbook.md`.
- Update `Handoff.md` + `changelog.md` con la batch ejecutada y diffs antes/después.
- Update `docs/documentation/finance/modulos-caja-cobros-pagos.md` con la nota histórica del cutover.

## Out of Scope

- Detection runtime / canonical state — TASK-707a.
- Componentization de pagos `pending_componentization` a `componentized` con `payroll_entry_id` — TASK-707c.
- Cambios al esquema de `expenses` / `expense_payments` adicionales a los de TASK-707a.
- Rediseño UI.

## Acceptance Criteria

- [ ] Inventory snapshot guardado como evidencia pre-apply.
- [ ] Script backfill ejecutado con `--apply` + audit trail completo (cascade-supersede + outbox events).
- [ ] `commercial_cost_attribution` y `client_economics` recomputados sin drift por cliente/mes (cambio interno de categoría, no del total).
- [ ] `labor_allocation_saturation_drift` = 0 post-apply o delta explicado.
- [ ] `bank_statement_rows.matched_payment_id` re-asignados al nuevo payment canónico.
- [ ] `getProcessorDigest('previred-clp')` retorna `componentizationStatus` coherente con histórico canónico.
- [ ] Cero filas Previred quedan con `expense_type='bank_fee'` o `cost_category='overhead'`.
- [ ] Cero filas Previred quedan duplicadas (legacy + nuevo activos al mismo tiempo).
- [ ] Runbook canónico publicado.

## Verification

- Pre-apply: dry-run + comparar inventory contra spec.
- Post-apply:
  - `pnpm test` clean.
  - Re-run getProcessorDigest contra dev DB y validar samples.
  - Diff manual de `client_economics` totals per cliente per mes (antes vs después).
  - `task708d.postCutoverPhantomsWithoutBankEvidence` = 0.
  - Smoke manual `/finance/bank > Previred` y `/finance/expenses` con filtro social_security.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] Archivo movido a `complete/` SOLO post apply exitoso.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` registra apply + diffs.
- [ ] `changelog.md` registra el cutover histórico.
- [ ] Runbook finalizado con outcomes reales.
- [ ] TASK-707c desbloqueada (componentization runtime ya tiene contrato canónico vivo + histórico limpio).

## Follow-ups

- TASK-707c: componentization runtime cuando emerja el siguiente pago Previred con payroll context disponible.
- Reliability signal `previredOverheadResidual` en `ledger-health.ts` para detectar regression (si vuelve a aparecer una fila Previred en `expense_type='bank_fee'`, dispara alerta).

## Open Questions

- Si el histórico tiene rows con `bank_statement_rows.matched_settlement_leg_id` (no solo matched_payment_id), la cascade-supersede debe coordinarse con settlement_leg supersede + re-match.
- Si los meses afectados están en `reconciliation_periods` con `status='reconciled'`, ¿reabrir el período o aplicar sobre period reconciled? (decisión arquitectónica del runbook).
