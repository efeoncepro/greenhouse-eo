# TASK-708b — Nubox Phantom Cohort Remediation (historical cleanup)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (deuda histórica con plata real adentro; bloquea `CHECK VALIDATE` final de TASK-708)
- Effort: `Medio-Alto`
- Type: `remediation`
- Epic: `[optional EPIC-###]`
- Status real: `Cerrada 2026-04-28 — apply runbook ejecutado contra Postgres dev: 21 income repaired_with_account, 65 expense dismissed_no_cash, 2 cascade-supersede de legs cuyos linked payments ya estaban superseded, CHECK constraint VALIDATED enforced.`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-708` (necesita las invariantes activas para no reintroducir contaminación durante la remediación)
- Coordinates with: `TASK-705` (Banco read-model cutover) — Banco lee post-remediación
- Branch: `task/TASK-708b-nubox-phantom-cohort-remediation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Remediar la deuda histórica de payments contaminados por Nubox-as-cash-SoT, en dos cohortes con datos validados en Postgres (`efeonce-group:us-east4:greenhouse-pg-dev`, 2026-04-28). La remediación corre **después** de que TASK-708 dejó las invariantes activas; aplica las mismas reglas a las filas vivas de la base sin destruir auditoría.

## Why This Task Exists

TASK-708 corta el flujo runtime que crea phantoms; pero la base ya tiene 23 income_payments + 65 expense_payments + 4 settlement legs + 1 bank_statement_row reconciliada que violan la invariante. Esos rows:

- bloquean el `VALIDATE` final del `CHECK` de `settlement_legs_principal_requires_instrument`.
- contaminan el pool conciliable apenas se importe la cartola del período correspondiente (Cohorte B son candidatas latentes).
- mantienen `payment_status='paid'` en documentos cuyo cash real Greenhouse no conoce.
- ensucian dashboards de Banco, Cobros, Pagos.

La remediación no es un script ad-hoc: es un runbook auditado, idempotente, con dry-run y apply explícito, que respeta los principios de resilencia (defensa estructural, supersede chain, preservación de evidencia) heredados de TASK-708.

## Cohort Inventory (validado 2026-04-28)

### Cohorte A — Runtime live (`income_payments.payment_source='nubox_bank_sync'`)

| Métrica | Valor |
|---|---|
| Total rows | 23 |
| `payment_account_id IS NULL` | 23 (100%) |
| Ya reconciliadas | 1 (`PAY-NUBOX-inc-3699924`, $6,902,000 CLP, 2026-03-06) |
| Settlement legs sin instrumento asociadas | 3 receipt + 1 funding |
| `bank_statement_row` reconciliada contra leg null | 1 |
| Incomes únicos afectados | 24 |
| Rango temporal | 2025-11-27 a 2026-04-13 |
| Monto total exposed | TBD en Slice 1 (query inventario) |

Query canónica de inventario:

```sql
SELECT ip.payment_id, ip.income_id, ip.payment_date, ip.amount, ip.currency,
       ip.is_reconciled, i.nubox_document_id, i.payment_status, i.total_amount
FROM greenhouse_finance.income_payments ip
JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
WHERE ip.payment_source = 'nubox_bank_sync'
ORDER BY ip.payment_date DESC;
```

### Cohorte B — Backfill histórico (`expense_payments.payment_source='manual'` con prefijo `exp-pay-backfill-EXP-NB-*`)

| Métrica | Valor |
|---|---|
| Total rows | 65 |
| `payment_account_id IS NULL` | 65 (100%) |
| Ya reconciliadas | 0 (latentes) |
| Expenses únicos afectados | 65 |
| Origen | backfill antiguo que mirroreó `nubox_purchase_id` como cash sin resolver cuenta |
| Rango temporal | 2025-12-24 a 2026-02-27 |
| Monto total exposed | TBD en Slice 1 (query inventario) |

Query canónica de inventario:

```sql
SELECT ep.payment_id, ep.expense_id, ep.payment_date, ep.amount, ep.currency,
       e.nubox_purchase_id, e.payment_status, e.total_amount
FROM greenhouse_finance.expense_payments ep
JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
WHERE ep.payment_source = 'manual'
  AND ep.payment_id LIKE 'exp-pay-backfill-EXP-NB-%'
  AND ep.payment_account_id IS NULL
ORDER BY ep.payment_date DESC;
```

### Cohorte C — Settlement legs sin instrumento (transversales a A)

| Métrica | Valor |
|---|---|
| Total legs | 4 (`3 receipt` + `1 funding`) |
| Reconciliadas | 1 receipt |
| Match canónico | un `bank_statement_row` reconciliada contra una leg `instrument_id IS NULL` |

## Resilience Principles (heredados de TASK-708)

1. **Cero `DELETE` destructivo**: toda fila contaminada se supersedea via `superseded_by_payment_id` (cuando se reemplaza por payment limpio) o `superseded_by_otb_id` (cuando se anula vía nuevo OTB anchor) o se marca `dismissed` en `external_cash_signals` si hay señal asociada. La auditoría sobrevive.
2. **Idempotencia**: el runbook puede correr N veces; un row ya remediado se detecta por su `superseded_at IS NOT NULL` y se omite.
3. **Reversibilidad**: cada apply produce un changeset trazable (signal_id / payment_id / settlement_leg_id) que puede inspeccionarse o revertirse vía `superseded_at = NULL` controlado.
4. **Decisión humana auditada**: cada reparación requiere capability `finance.cash.adopt-external-signal` o `finance.cash.dismiss-historical-payment`; el actor queda en `resolved_by_user_id`.
5. **No reintroducción de contaminación**: el runbook escribe a través de `recordPayment` / `recordExpensePayment` con `payment_account_id` resuelto. Las invariantes de TASK-708 garantizan que un payment limpio no puede crearse sin cuenta.
6. **Observabilidad first-class**: cada métrica del histórico baja a 0 en pasos visibles; el dashboard distingue runtime vs histórico hasta que histórico llega a cero.

## Goal

- todas las rows de Cohorte A clasificadas y resueltas en uno de tres estados: `repaired_with_account` / `superseded_replaced` / `dismissed_no_cash`.
- todas las rows de Cohorte B clasificadas y resueltas equivalentemente.
- las 4 settlement legs sin instrumento (Cohorte C) resueltas o supersededas; el bank_statement_row reconciliada contra leg null queda apuntando a leg con instrumento o se desreconciliza con audit.
- después del apply, queries de Acceptance == 0 para todas las cohortes runtime y bajan a 0 para histórico.
- migración final aplica `ALTER TABLE settlement_legs VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument` con éxito.
- métrica `payments_pending_account_resolution_historical` en `ledger-health.ts` baja a 0 en producción.

## Architecture Alignment

Mismas referencias que TASK-708:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

Reglas obligatorias adicionales:

- toda escritura sobre `income_payments`/`expense_payments` durante la remediación pasa por la API canónica con `AccountId` branded.
- `external_cash_signals` se materializa retroactivamente para Cohorte A y Cohorte B con `source_system='nubox'` y `account_resolution_status` calibrado por el outcome de la clasificación.
- `superseded_by_payment_id` / `superseded_at` se marcan con `superseded_reason='task_708b_historical_cleanup'` para trazabilidad.

## Dependencies & Impact

### Depends on

- TASK-708 cerrada (invariantes activas, módulo `external-cash-signals` operativo, capability `finance.cash.adopt-external-signal` deployada).
- `src/lib/finance/external-cash-signals/` (D1/D3/D5 desde TASK-708).
- `src/lib/finance/payment-ledger.ts`, `src/lib/finance/expense-payment-ledger.ts`, `src/lib/finance/settlement-orchestration.ts`.
- acceso a cartolas bancarias del período correspondiente para reanclar Cohorte A reconciled (1 row de $6.9M CLP requiere cartola real).

### Blocks / Impacts

- `VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument` (final de TASK-708 → se completa al cierre de TASK-708b).
- `TASK-705` (Banco read-model cutover) lee solo cash limpio post-remediación.
- métricas históricas en `ledger-health.ts` y dashboard `Finance Data Quality`.
- documento `payment_status` deriva correcto solo después que se supersedean phantoms.

### Files owned

- `scripts/finance/remediate-task708-cohort-a.ts` (nuevo)
- `scripts/finance/remediate-task708-cohort-b.ts` (nuevo)
- `scripts/finance/remediate-task708-cohort-c-legs.ts` (nuevo)
- `scripts/finance/_task708b-inventory.ts` (helper inventario reutilizable)
- `migrations/` (migración final que ejecuta `VALIDATE CONSTRAINT` y limpia flags transitorios)
- `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md` (runbook canónico)

## Scope

### Slice 1 — Inventario reproducible y materialización en `external_cash_signals`

- script `scripts/finance/_task708b-inventory.ts` produce CSV/JSON con todas las rows de Cohorte A, B, C (payment_id, document_id, monto, fecha, contexto upstream).
- script idempotente `scripts/finance/backfill-cohort-a-signals.ts` crea filas en `external_cash_signals` para cada Cohorte A row con `source_system='nubox'`, `source_event_id=reference (nubox-mvmt-*)`, `account_resolution_status='unresolved'`, `promoted_payment_id=ip.payment_id`. Esto retroactivamente expone las phantom como señales en la cola admin.
- mismo backfill para Cohorte B con `source_event_id=nubox_purchase_id`.
- el inventario produce snapshot inmutable en `docs/operations/runbooks/TASK-708b-evidence-<date>.json` para audit.

### Slice 2 — Clasificación

Para cada row de Cohorte A y B, asignar uno de tres outcomes determinísticos:

1. `repaired_with_account`: cuenta inferible con confianza alta vía D5 rules (TASK-708) + revisión humana. La señal queda `resolved_high_confidence` y se promueve a payment canónico nuevo.
2. `superseded_replaced`: la cartola bancaria del período tiene un movimiento que matchea (monto + fecha + ref). Se crea el payment canónico desde el bank_statement_row y se supersedea el phantom apuntando al nuevo payment_id (`superseded_by_payment_id`).
3. `dismissed_no_cash`: no hay evidencia de cash real en Greenhouse (Nubox lo dijo pero nunca llegó); se marca señal `dismissed` con razón documentada y el phantom payment se supersedea (`superseded_by_payment_id=NULL` pero `superseded_at`/`superseded_reason` no nulos — patrón "anulado sin reemplazo").

La clasificación corre como dry-run y produce reporte con la propuesta por row. Humano firma antes del apply.

### Slice 3 — Apply Cohorte A (income_payments + 1 reconciled + cohort C legs)

- runbook ejecuta apply por chunks (max 10 rows por transacción, retry idempotente).
- caso especial `PAY-NUBOX-inc-3699924` ($6.9M CLP, ya reconciliada): requiere cartola del período `2026-03` o equivalente. El `bank_statement_row.matched_settlement_leg_id` apuntando a leg null se redirige al nuevo payment_id, o se desreconcilia explícitamente con audit si no hay match real.
- las 4 settlement legs sin instrumento se supersedean si la income_payment correspondiente se supersedea, o se reanclan con `instrument_id` resuelto si la opción es repair.
- `payment_status` de income afectados se recomputa por trigger D2 al supersedear los phantoms.

### Slice 4 — Apply Cohorte B (expense_payments backfill)

- 65 rows con prefijo `exp-pay-backfill-EXP-NB-*` revisadas en chunks.
- la mayoría esperada en `dismissed_no_cash` (backfill optimista sin evidencia bancaria); algunas en `superseded_replaced` cuando la cartola de gasto correspondiente se importe.
- los 65 expenses afectados pasan a `payment_status` derivado real (probablemente `pending` post-remediación, hasta que llegue cartola).

### Slice 5 — Cierre y `VALIDATE CONSTRAINT`

- query final confirma `payments_pending_account_resolution_historical == 0`.
- migración aplica `ALTER TABLE greenhouse_finance.settlement_legs VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument`. Si falla, runbook indica row(s) residual(es).
- baja métrica `external_cash_signals_unresolved_over_threshold` para `source_system='nubox'` debajo del threshold operativo.
- update Reliability Control Plane signals.

## Out of Scope

- crear o modificar las invariantes de TASK-708 (solo se usan).
- procesar señales de `source_system != 'nubox'` (no hay Cohorte de Previred/file imports todavía; cuando aparezca, herederá el mismo runbook).
- redesign de UI de Cobros/Pagos/Banco (vive en TASK-705 y followups).
- backfill de cartolas bancarias faltantes (input externo; si no hay cartola, la decisión cae en `dismissed_no_cash`).

## Acceptance Criteria

Inventario y modelado:

- [ ] inventario reproducible producido en `docs/operations/runbooks/TASK-708b-evidence-<date>.json` con totales coincidentes con counts en producción
- [ ] `external_cash_signals` materializadas para 23 rows Cohorte A + 65 rows Cohorte B (`source_system='nubox'`, idempotente por `UNIQUE (source_system, source_event_id)`)
- [ ] cada signal apunta a su `promoted_payment_id` original via Slice 1 backfill

Clasificación:

- [ ] reporte de clasificación firmado humano con outcome por row (`repaired_with_account` / `superseded_replaced` / `dismissed_no_cash`)
- [ ] caso especial `PAY-NUBOX-inc-3699924` ($6.9M CLP) tiene decisión documentada con evidencia (cartola escaneada o ausencia justificada)

Apply:

- [ ] post-apply, query `SELECT COUNT(*) FROM greenhouse_finance.income_payments WHERE payment_source='nubox_bank_sync' AND payment_account_id IS NULL AND superseded_by_payment_id IS NULL AND superseded_at IS NULL` retorna 0
- [ ] post-apply, query `SELECT COUNT(*) FROM greenhouse_finance.expense_payments WHERE payment_source='manual' AND payment_id LIKE 'exp-pay-backfill-EXP-NB-%' AND payment_account_id IS NULL AND superseded_by_payment_id IS NULL AND superseded_at IS NULL` retorna 0
- [ ] post-apply, query `SELECT COUNT(*) FROM greenhouse_finance.settlement_legs WHERE leg_type IN ('receipt','payout') AND instrument_id IS NULL AND superseded_at IS NULL` retorna 0
- [ ] `bank_statement_row` previamente matched contra leg null queda apuntando a leg con `instrument_id NOT NULL` o se desreconcilia con audit explícito

Modelo:

- [ ] migración aplicada exitosamente: `ALTER TABLE greenhouse_finance.settlement_legs VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument`
- [ ] `income.payment_status` y `expenses.payment_status` recomputados por trigger D2 reflejan estado real post-remediación

Observabilidad:

- [ ] `ledger-health.ts` métrica `payments_pending_account_resolution_historical` retorna 0 en staging y prod
- [ ] dashboard Reliability Control Plane `Finance Data Quality` no muestra rollup degraded por estas cohortes
- [ ] runbook `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md` actualizado con resultado final + lecciones aprendidas

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- queries de acceptance ejecutadas en staging (post-deploy de chunks) y prod (post-apply final)
- inspección manual del UI `/finance/external-signals` para confirmar señales en estados correctos
- `pnpm staging:request /api/admin/finance/ledger-health` muestra cohortes históricas en 0

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado
- [ ] `Handoff.md` actualizado con resultado y aprendizajes
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-705 (Banco read-model)
- [ ] runbook canónico vive en `docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md` con dry-run + apply + rollback documentados
- [ ] `VALIDATE CONSTRAINT` final confirmado en prod

## Follow-ups

- generalizar el runbook a un patrón reutilizable `external_signal_cohort_remediation` para futuras cohortes (Previred, file imports, HubSpot) — vive como template en `docs/operations/runbooks/_template-external-signal-remediation.md`.
- evaluar promover el `CHECK` `income_payments_account_required_after_cutover` (con `OR created_at < ...`) a `NOT NULL` puro una vez la base esté limpia y un período razonable haya pasado.
- documentar en `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` el patrón canónico de remediación histórica heredado.

## Open Questions

- política exacta para el caso especial `PAY-NUBOX-inc-3699924` ($6.9M CLP ya reconciliado): pedir cartola al cliente / banco vs `dismissed_no_cash` con audit. Decisión bloqueante para Slice 3.
- threshold operativo para `external_cash_signals_unresolved_over_threshold` (¿7 días? ¿30?). Default propuesto: 14 días para `source_system='nubox'`.
- si las 65 expenses de Cohorte B requieren confirmación tributaria (¿se reportaron como gastos pagados al SII?). Coordinar con contabilidad antes del apply masivo de `dismissed_no_cash`.
