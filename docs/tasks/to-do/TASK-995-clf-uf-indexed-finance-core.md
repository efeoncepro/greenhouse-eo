# TASK-995 — CLF/UF Indexed Finance Core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-TBD]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance` (owner) - touches `commercial`, `treasury`, `data`, `integrations`, `reliability`
- Blocked by: ADR acceptance required for `GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1` or accepted delta to `GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1`; TASK-990 Slice 1-2 foundation should land first
- Branch: `task/TASK-995-clf-uf-indexed-finance-core`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Promover CLF/UF desde pricing-only a soporte finance-core como **unidad indexada nativa**, no como moneda bancaria. Greenhouse ya cotiza en UF y el negocio puede pactar/cobrar importes en UF, pero la factura legal y el movimiento de caja normalmente se materializan en CLP. Esta task extiende la arquitectura multi-currency de TASK-990 para preservar UF nativa, CLP funcional, USD reporting y settlement real sin fingir que existen cuentas u ordenes bancarias en UF.

## Why This Task Exists

TASK-990 resuelve el caso MXN/Berel con moneda nativa de contrato y settlement real en MXN. UF/CLF necesita la misma disciplina de snapshots y planos, pero tiene otra naturaleza: es una unidad de cuenta reajustable/indexada a CLP, publicada diariamente, no una moneda de caja operativa normal.

Hoy Greenhouse soporta `CLF` en `pricing_output`, product catalog y cotizaciones; tambien usa UF en Payroll para Isapre/topes. Pero finance core no puede representar correctamente el flujo "contrato/cotizacion en UF -> factura CLP -> cobro asociado al valor UF/CLP". Si se mete `CLF` como un simple `FinanceCurrency`, se corre el riesgo de habilitar cuentas, payment orders, settlement legs o balances en UF cuando el sistema deberia modelar CLP cash con evidencia UF.

## Goal

- Greenhouse acepta `CLF` como unidad nativa/indexada para income, expenses y obligations cuando el contrato/documento lo justifica.
- La factura legal CLP queda preservada como plano funcional/documental, con snapshot UF->CLP auditable.
- El settlement/cash real queda en `CLP` (o moneda real observada) y nunca se infiere como `CLF` salvo que exista un instrumento real que lo pruebe y una ADR futura lo permita.
- Los readers/reportes muestran native UF, CLP funcional y USD reporting sin recalcular UF al leer.
- El tratamiento de reajuste/indexacion UF queda separado de FX gain/loss de monedas extranjeras.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

Reglas obligatorias:

- No implementar sin ADR aceptado o delta aceptado al ADR multi-currency que declare CLF como unidad indexada.
- No agregar `CLF` a `accounts.currency`, `payment_orders.currency`, `settlement_legs.currency` o `AccountCurrency` como moneda de caja por reflejo.
- No confundir `CLF native/indexed unit` con `SettlementCurrency`.
- No recalcular UF->CLP en lectores sobre eventos ya emitidos, facturados, cerrados o pagados.
- No usar `CLF` para Chile statutory payroll currency; Payroll puede usar UF como indicador de calculo, pero el pago dependiente Chile sigue en CLP.
- No mezclar `FX gain/loss` de moneda extranjera con `indexed_unit_revaluation` / reajuste UF.
- No escribir `amount * uf_value` inline en readers nuevos; extender primitives/snapshots/views canonicas.
- No mutar facturas, income, obligations o cobros reales sin dry-run, allowlist, actor, reason y rollback/compensacion.

## Normative Docs

- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
- `docs/documentation/finance/pricing-comercial.md`
- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md`
- `docs/tasks/complete/TASK-058-economic-indicators-runtime-layer.md`

## Dependencies & Impact

### Depends on

- TASK-990 foundation slices for money primitives, FX snapshots and schema migration map.
- `src/lib/finance/currency-domain.ts`
- `src/lib/finance/currency-registry.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/fx-readiness.ts`
- `src/lib/finance/fx/providers/clf-from-indicators.ts`
- `src/lib/finance/economic-indicators.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/multi-currency/**` (if/when TASK-990 lands this foundation)
- `src/lib/nubox/**` if any invoice/source-document projection carries UF-derived CLP evidence
- `src/lib/finance/payment-obligations/**`
- `src/lib/finance/payment-orders/**`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/income-settlement.ts`

### Blocks / Impacts

- UF-denominated commercial agreements that need finance-core traceability.
- CLF quotation -> CLP invoice -> CLP settlement reconciliation.
- Future client profitability reporting with native UF detail.
- Any future finance-core promotion of indexed units beyond CLF.

### Files owned

- `docs/tasks/to-do/TASK-995-clf-uf-indexed-finance-core.md`
- `docs/architecture/GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md` `[crear o reemplazar por delta aceptado en GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1]`
- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `src/lib/finance/currency-domain.ts`
- `src/lib/finance/currency-registry.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/fx-readiness.ts`
- `src/lib/finance/fx/providers/clf-from-indicators.ts`
- `src/lib/finance/multi-currency/**`
- `src/lib/finance/payment-obligations/**`
- `src/lib/finance/payment-orders/**`
- `src/lib/finance/**/normalized-readers-[verificar-en-plan]`
- `migrations/*task-995*.sql`
- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Current Repo State

### Already exists

- `CLF` ya existe en `CURRENCIES_ALL` y `pricing_output`.
- `CURRENCY_REGISTRY.CLF` ya declara `provider='clf_from_indicators'`, `compositionHub='CLP'`, `coverage='auto_synced'` y notas de UF como unidad indexada.
- `src/lib/finance/fx/providers/clf-from-indicators.ts` existe y materializa CLP<->CLF desde `greenhouse_finance.economic_indicators.UF`.
- `src/lib/finance/economic-indicators.ts` y TASK-058 cubren UF/UTM/IPC como indicadores economicos.
- Commercial/pricing/product catalog ya trabaja con `CLP, USD, CLF, COP, MXN, PEN`.
- Payroll ya consume UF para calculos Chile, pero como indicador de calculo, no como moneda de pago.

### Gap

- `finance_core` no acepta `CLF` como native/indexed unit.
- Los tipos actuales tienden a mezclar moneda nativa, moneda de settlement y moneda de cuenta bajo `FinanceCurrency`.
- Las constraints finance-core no distinguen `native_currency='CLF'` de `settlement_currency='CLP'`.
- No existe contrato canonico para "cotizacion/contrato en UF, factura legal CLP, cobro CLP indexado a UF".
- No existe decision aceptada sobre la fecha de conversion UF->CLP por evento: send, invoice emission, due date, payment date o contract-specific policy.
- No existe reliability signal que detecte eventos CLF sin snapshot UF bloqueado o con settlement/revaluation mal clasificado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR and inventory

- Create and obtain acceptance for `GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1` or an explicit accepted delta to `GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1`.
- Run `pnpm pg:doctor`.
- Inventory all existing CLF/UF consumers in pricing, product catalog, Payroll, economic indicators, quotes and finance readers.
- Inspect PostgreSQL constraints for native/settlement/account/payment-order currency fields touched by TASK-990.
- Produce a table-by-table map that states which fields may accept `CLF` and which must stay cash-only.
- Decide and document UF->CLP date policy per event class:
  - quote/send
  - contract/PO acceptance
  - invoice emission
  - due date
  - payment/settlement
  - period-close reporting

### Slice 1 — Type split for indexed units vs cash currencies

- Introduce or refactor typed primitives so Greenhouse can represent:
  - `FinanceNativeUnit = 'CLP' | 'USD' | 'MXN' | 'CLF'`
  - `SettlementCurrency = 'CLP' | 'USD' | 'MXN'`
  - `AccountCurrency = 'CLP' | 'USD' | 'MXN'`
  - `ReportingCurrency = 'CLP' | 'USD'`
- Keep `CLF` out of cash-account and payment-order header paths unless the ADR explicitly creates a separate supported instrument model.
- Update money/snapshot helpers from TASK-990 so `CLF` native events can snapshot `CLF->CLP` and `CLP->USD`.
- Add tests proving CLF is allowed as native/indexed unit but rejected as account currency/order settlement currency.

### Slice 2 — Schema expand for CLF native facts, no behavior flip

- Add or widen native unit fields for `income`, `expenses`, and `payment_obligations` according to the Slice 0 map.
- Preserve existing CLP/USD/MXN behavior bit-for-bit.
- Do not widen `accounts.currency`, `payment_orders.currency`, `payment_order_lines.currency`, `settlement_legs.currency` to `CLF` unless the accepted ADR explicitly allows a real cash rail.
- Add nullable snapshot FKs or reuse TASK-990 `fx_snapshots` links:
  - `native_to_functional_fx_snapshot_id` for CLF->CLP.
  - `functional_to_reporting_fx_snapshot_id` for CLP->USD.
- Add CHECK constraints with `NOT VALID + VALIDATE` where native-vs-settlement invariants need phased validation.

### Slice 3 — CLF source-document and invoice projection

- Model source evidence for UF-denominated commercial facts:
  - native CLF amount.
  - UF value/date used.
  - legal/documentary CLP amount when the invoice/source carries it.
  - source of the UF policy (`quote_snapshot`, `contract`, `nubox_legal_document`, `manual_reviewed`).
- Ensure the invoice/legal document row preserves CLP documentary value and native CLF evidence without overwriting either.
- If a source invoice only carries CLP but is linked to a CLF quote/contract, preserve the link as evidence; do not infer CLF from customer name or country.
- Add fixtures for "UF quote -> CLP invoice" and "UF-denominated receivable -> CLP payment".

### Slice 4 — CLF obligations, AR and payment preparation

- Allow payment obligations to carry native/indexed amount in CLF while producing CLP payment/order amounts from a locked UF snapshot.
- Keep payment orders single-currency and cash-denominated; V1 expected order currency for UF obligations is `CLP`.
- Define whether unpaid UF receivables are remeasured until invoice, due date or payment date based on ADR policy.
- Add server-side rejection for attempts to create payment orders with `currency='CLF'` unless an explicit future rail is approved.
- Add tests for mixed native-unit groups: CLF obligations become CLP cash orders and do not mix with MXN/USD cash orders.

### Slice 5 — Indexed-unit revaluation and reconciliation

- Extend canonical readers/views, not parallel helpers, to expose:
  - native CLF amount.
  - functional CLP amount.
  - reporting USD amount.
  - settlement CLP amount.
  - indexed-unit delta when policy says the UF value changed between recognition and settlement.
- Classify UF deltas separately from FX gain/loss, e.g. `indexed_unit_revaluation` or an ADR-approved `financial_cost` sublane.
- Ensure `income_settlement_reconciliation` does not mark false drift when the legal invoice is CLP but the source agreement is CLF.
- Ensure account balances remain per cash account currency and do not create UF balances.

### Slice 6 — Reliability, docs and rollout

- Add reliability signals:
  - `finance.uf.rate_freshness`
  - `finance.indexed_unit.snapshot_missing`
  - `finance.indexed_unit.native_functional_drift`
  - `finance.indexed_unit.settlement_currency_violation`
  - `finance.indexed_unit.revaluation_unclassified`
- Wire signals into the Finance Data Quality / reliability overview.
- Update docs for quoting in UF, invoicing in CLP and settlement behavior.
- Execute staging/prod rollout with flags disabled first, then enable by client/allowlist.

## Out of Scope

- Promoting COP/PEN/BRL to finance core.
- Replacing TASK-990 or delaying MXN/Berel rollout.
- Treating `CLF` as a bank account currency by default.
- Changing Chile statutory payroll payment currency away from CLP.
- Rewriting Payroll UF calculations for Isapre/topes except where a shared helper can be safely reused.
- Creating a legal GL.
- Mutating historical invoices or receivables without an allowlisted backfill.

## Detailed Spec

### Canonical CLF event shape

```ts
interface IndexedUnitFinanceEvent {
  native: {
    amount: string
    unit: 'CLF'
  }
  functional: {
    amount: string
    currency: 'CLP'
  }
  reporting: {
    amount: string
    currency: 'USD'
  }
  settlement?: {
    amount: string
    currency: 'CLP' | 'USD' | 'MXN'
  }
  indexedUnitSnapshots: Array<{
    fromUnit: 'CLF'
    toCurrency: 'CLP'
    rate: string
    rateDate: string
    source: 'economic_indicators.UF' | 'quote_snapshot' | 'legal_document' | 'manual_override'
    policy:
      | 'rate_at_send'
      | 'rate_at_event'
      | 'rate_at_due_date'
      | 'rate_at_settlement'
      | 'rate_at_period_close'
      | 'manual_override'
    lockedAt: string
  }>
}
```

### Binding semantic direction

- `CLF` is allowed as `native.unit` / `native_currency` only where the domain fact is UF-denominated.
- `CLP` is the functional/legal/cash plane for most Chile UF facts.
- `USD` reporting is derived from CLP functional, consistent with TASK-990's presentation-currency policy.
- Settlement/cash readers must use the real cash currency, not the indexed unit.

### Fail-closed behavior

- If UF value is missing for the required event date: block write unless Finance Admin records manual override with reason.
- If the CLF event lacks a conversion policy: block write.
- If a payment order tries to use `CLF` as header currency: reject with explicit canonical error.
- If a CLF native fact lacks CLP functional amount/snapshot: reliability signal error.
- If revaluation/indexation delta exists but is not classified: reliability signal error.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST complete before implementation.
- Slice 1 MUST complete before Slice 2.
- Slice 2 MUST complete before any production write path accepts CLF native facts.
- Slice 3 and Slice 4 require Slice 1 + Slice 2.
- Slice 5 requires Slices 3-4.
- Slice 6 closes only after staging + production verification.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CLF leaks into cash account/order currency | treasury/payment orders | medium | Type split + CHECK constraints + server-side rejection | `finance.indexed_unit.settlement_currency_violation` |
| UF->CLP conversion date applied inconsistently | finance/data | high | ADR event-policy table + locked snapshots | `finance.indexed_unit.native_functional_drift` |
| CLF invoice projected as CLP-only, losing native evidence | integrations/finance | medium | Source evidence mapping + native fields + fixtures | `finance.indexed_unit.snapshot_missing` |
| UF revaluation buried as FX or revenue | accounting/reporting | medium | Separate indexed-unit lane + reader tests | `finance.indexed_unit.revaluation_unclassified` |
| Payroll UF helper changes break Isapre/topes | payroll | low-medium | No payroll behavior change unless explicit tests pass | Payroll readiness/tests |
| Backfill mutates historical invoices incorrectly | data | low | dry-run, allowlist, expected mutation count abort | script output + reliability signals |

### Feature flags / cutover

- `FINANCE_CORE_CLF_INDEXED_ENABLED=false` default.
- `FINANCE_CLF_INCOME_PROJECTION_ENABLED=false` default.
- `FINANCE_CLF_OBLIGATIONS_ENABLED=false` default.
- `FINANCE_CLF_REPORTING_ENABLED=false` default.
- `FINANCE_CLF_BACKFILL_APPLY_ENABLED=false` default.

Flags must exist in Production, staging and Preview develop before rollout. Redeploy is required after env var changes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs/ADR only. | <5 min | yes |
| Slice 1 | Revert code if flags off; no data mutation. | <15 min | yes |
| Slice 2 | Leave additive columns; disable flags. Re-narrow constraints only after verifying zero CLF native rows if needed. | 30-90 min | partial |
| Slice 3 | Disable projection flag; revert mapper. | <15 min | yes |
| Slice 4 | Disable obligations flag; existing CLF obligations remain readable only. | <15 min | partial |
| Slice 5 | Disable reporting flag; fallback to legacy CLP readers. | <15 min | yes |
| Slice 6 | Docs/signals only; revert if signal noise is unacceptable. | <30 min | yes |

### Production verification sequence

1. `pnpm pg:doctor` local/staging.
2. Run migrations in staging with all flags false.
3. Verify CLP/USD/MXN flows from TASK-990 remain unchanged.
4. Enable `FINANCE_CORE_CLF_INDEXED_ENABLED=true` in staging.
5. Create/read a CLF native fixture without settlement; verify CLF->CLP and CLP->USD snapshots.
6. Enable `FINANCE_CLF_INCOME_PROJECTION_ENABLED=true` in staging.
7. Project a UF quote/contract -> CLP invoice fixture; verify native CLF + legal CLP + USD reporting.
8. Enable `FINANCE_CLF_OBLIGATIONS_ENABLED=true` in staging.
9. Create CLF native obligation and verify resulting payment order is CLP, not CLF.
10. Enable reporting flag and verify readers/signals.
11. Repeat production deploy with flags false.
12. Flip production flags one by one only after staging evidence is attached to `Handoff.md`.
13. Monitor reliability signals for 7 days.

### Out-of-band coordination required

- Finance must confirm the UF->CLP date policy per event class before ADR acceptance.
- Finance/Treasury must confirm whether any real instrument behaves as UF-denominated cash. Default V1 assumes no: cash settlement is CLP unless proven otherwise.
- If source systems (Nubox/SII/HubSpot/contracts) expose UF evidence differently, discovery must confirm the authoritative source before projection.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR/delta for CLF indexed finance core is accepted and indexed in `DECISIONS_INDEX.md`.
- [ ] Types distinguish native/indexed units from settlement/account/payment-order currencies.
- [ ] `CLF` is accepted only where the accepted ADR allows native/indexed-unit facts.
- [ ] `CLF` is rejected as payment order header currency and account currency in V1 unless ADR explicitly says otherwise.
- [ ] UF->CLP snapshots are locked for CLF native facts and never recomputed on read.
- [ ] USD reporting derives from functional CLP, not direct CLF->USD.
- [ ] UF quote/contract -> CLP invoice fixture preserves native CLF, legal/documentary CLP and USD reporting.
- [ ] CLF native obligation creates/prepares CLP cash payment/order output with explicit snapshot evidence.
- [ ] Indexed-unit deltas are classified separately from FX gain/loss and operating revenue/cost.
- [ ] Required reliability signals are wired and steady-state after rollout.
- [ ] Docs explain UF quoting/contracting, CLP invoice, CLP settlement and snapshot policy.
- [ ] Staging and production flags/env vars were verified with CLI and affected targets redeployed.

## Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test`
- Targeted tests:
  - `pnpm vitest run src/lib/finance src/lib/finance/__tests__/fx-readiness.test.ts src/lib/finance/economic-indicators.test.ts`
  - `pnpm vitest run src/lib/finance/payment-orders src/lib/finance/payment-obligations src/lib/reliability`
- Migration verification:
  - `pnpm pg:connect`
  - inspect native/settlement/account/order constraints before/after.
- Runtime verification:
  - CLF native fixture dry-run.
  - CLP invoice projection fixture.
  - CLP payment order from CLF obligation fixture.
  - reliability overview signals.
- If any UI/reporting surface changes visibly:
  - `pnpm fe:capture --route=<route> --env=staging --hold=3000`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-990 y Payroll UF
- [ ] `docs/architecture/DECISIONS_INDEX.md` refleja el status final del ADR/delta
- [ ] `docs/documentation/finance/monedas-y-tipos-de-cambio.md` refleja CLF finance-core solo si el rollout esta operativo
- [ ] Staging and production flags/env vars were verified with CLI, not assumed
- [ ] Production redeploy/restart was performed where env vars changed

## Follow-ups

- Extend CLF indexed-unit support to any future legal entity with a non-CLP functional currency only through a new ADR.
- Consider a shared `IndexedUnit` primitive for UTM/IPC if finance facts begin to use them as native units.
- UI admin queue for manual UF override or source-disposition if no existing Finance Admin surface can safely host it.

## Open Questions

- What is the canonical UF->CLP date policy for each event type: quote send, contract/PO acceptance, invoice emission, due date, payment date and period close?
- Does any current customer actually pay into an instrument that should be represented as UF-denominated cash, or is "recibimos en UF" operationally "amount indexed in UF, cash in CLP"?
- Which source system is authoritative for UF evidence when the legal invoice is CLP: quote snapshot, contract/PO, Nubox/SII document, or manual reviewed disposition?
