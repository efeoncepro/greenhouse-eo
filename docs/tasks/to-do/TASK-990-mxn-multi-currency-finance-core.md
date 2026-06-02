# TASK-990 — MXN Multi-Currency Finance Core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-TBD]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance` (owner) — touches `integrations` (Nubox sync), `treasury` (settlement/FX), `data` (BQ conformed), `reliability` (signals). Domain boundary per `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`: Finance owns income, expenses, payments, reconciliation, FX, P&L. Commercial (pricing MXN) is upstream evidence only, NOT modified by this task.
- Blocked by: `ADR acceptance: docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`
- Branch: `task/TASK-990-mxn-multi-currency-finance-core`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Promover MXN desde soporte comercial/pricing-only a soporte finance-core end-to-end. Greenhouse debe preservar moneda nativa MXN, calcular y bloquear snapshots CLP/USD, proyectar facturas de exportacion Nubox, soportar cobros/pagos/ordenes en MXN y exponer reportería CLP/USD sin perder el detalle nativo.

## Why This Task Exists

Greenhouse hoy puede cotizar en MXN, pero finance core sigue limitado a `CLP | USD`. El caso real Grupo Berel confirma el gap: Nubox ingirio una factura de exportacion con equivalente CLP `4.617.647` y monto extranjero `89.960`, pero la venta quedo orphaned y, si se proyectara hoy, el sync la persistiria como CLP-only. Eso rompe AR, caja, conciliacion, P&L, FX gain/loss y trazabilidad contractual.

No basta agregar `MXN` a un enum. Esta task debe cambiar el contrato financiero completo, con expand-and-contract, flags, snapshots FX, identity RFC, Nubox export detail, payment orders, settlement y reporting.

## Goal

- Greenhouse acepta `MXN` como `finance_core` currency para income, expenses, obligations, payment profiles, payment orders, cash signals, settlement y reporting cuando el flujo lo permite.
- Cada evento financiero relevante preserva `native` currency, `functional` CLP, `reporting` USD y `settlement` currency cuando aplica.
- La factura Nubox exportacion de Berel (`source_object_id=28800562`) se puede proyectar con MXN nativo, CLP legal/documental y USD reporting, sin guesswork ni SQL manual.
- Cobros/pagos MXN quedan conciliables, con FX gain/loss separado de revenue/costo operacional.
- Los readers/reportes exponen native detail + CLP + USD y no recalculan FX silenciosamente al leer.

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
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

Reglas obligatorias:

- No implementar si el ADR multi-currency sigue `Proposed` sin aprobacion humana explicita.
- No declarar soporte MXN si solo funciona en cotizaciones.
- No hardcodear `currency='CLP'` en Nubox, cash signals o finance write paths cuando el source trae moneda extranjera.
- No inferir MXN solo por pais Mexico; pais es señal, no source of truth.
- No recalcular FX de eventos emitidos/cerrados al leer.
- No mezclar monedas dentro de una `payment_order`.
- No clasificar FX gain/loss como revenue, payroll, contractor, vendor o overhead.
- No mutar datos reales sin dry-run, allowlist, counts, sample rows y rollback/compensacion.
- No paralelizar las VIEWs/helpers canonicos de finance: MXN se agrega EXTENDIENDO `expense_payments_normalized` / `income_payments_normalized` (TASK-766), `income_settlement_reconciliation` (TASK-571), `fx_pnl_breakdown` (TASK-699), `materializeAccountBalance` (TASK-774). Ver `## Canonical Pattern Alignment`.
- No escribir `SUM(ep.amount * exchange_rate_to_clp)`, `SUM(ip.amount)`, `SUM(sl.amount)` ni variantes en readers nuevos: el lint rule `greenhouse/no-untokenized-fx-math` (modo `error`) bloquea el build. Toda agregacion CLP/USD pasa por la VIEW canonica o por su helper.
- No usar `Sentry.captureException` directo en los code paths nuevos: usar `captureWithDomain(err, 'finance', { tags: { source: '<...>' } })`.
- No retornar `NextResponse.json({ error: 'English prose' }, ...)`: todo error API que cruce al cliente usa `canonicalErrorResponse(code, ...)` con `code` es-CL (incluye `unsupported_corridor`, `fx_snapshot_missing`, `fx_rate_stale`, `nubox_export_orphan_rfc`).
- No seedear una capability nueva (manual FX override, reviewed disposition) sin su grant en `src/lib/entitlements/runtime.ts` en el MISMO PR: el guard `capability-grant-coverage.test.ts` rompe el build (TASK-873/935). Ver `## Capabilities & Access`.
- No aplicar IVA 19% a una factura de exportacion (DTE 110): es IVA-exenta por D.L. 825 Art 12. La fila `income` se proyecta con `is_tax_exempt=true`, `tax_rate=0`, `tax_amount=0`. Ver `## Currency Plane Sourcing Contract`.

## Canonical Pattern Alignment (binding — extend, never parallel)

> Esta seccion es vinculante. El ADR define el contrato conceptual; aqui se fija EXACTAMENTE que primitiva canonica existente extiende cada pieza. La task original no nombraba estos artefactos y un agente implementador que siga `CLAUDE.md` chocara con sus lint rules y reliability signals. **No crear primitivas nuevas donde ya existe la canonica.**

| Necesidad de la task | Primitiva canonica existente (NO paralelizar) | Como se extiende para MXN |
|---|---|---|
| Resolver CLP de income/expense payments | VIEW `greenhouse_finance.expense_payments_normalized` + `income_payments_normalized` (TASK-766) + helpers `sumExpensePaymentsClpForPeriod` / `sumIncomePaymentsClpForPeriod` en `src/lib/finance/{expense,income}-payments-reader.ts` | La VIEW ya emite `payment_amount_clp` con COALESCE chain. MXN se agrega como currency valida del filtro 3-axis supersede + se EXTIENDE la VIEW para exponer tambien `payment_amount_usd` (plano reporting) sin recomputar inline. Cualquier reader nuevo lee de la VIEW, jamas `amount * rate`. |
| Reconciliacion de `income.amount_paid` (cobros MXN) | VIEW `greenhouse_finance.income_settlement_reconciliation` (TASK-571, extendida TASK-929 superseded-exclusion) + helper `src/lib/finance/income-settlement.ts` | La ecuacion canonica `amount_paid == SUM(pagos activos) + factoring_fee + withholding` debe volverse currency-aware: una factura MXN pagada en MXN/CLP/USD no debe producir `drift` falso. EXTENDER la VIEW para reconciliar en el plano nativo de la factura. NO branchear en consumers. |
| FX gain/loss de settlement MXN | VIEW `greenhouse_finance.fx_pnl_breakdown` (TASK-699) + helper `getBankFxPnlBreakdown` en `src/lib/finance/fx-pnl.ts` | El FX result de Slice 7 NO es un mecanismo nuevo: es la **fuente #1 (realized FX en settlement)** y **#3 (realized FX en transferencias internas)** de la VIEW canonica que ya existe. EXTENDER `fx_pnl_breakdown` con el delta MXN invoice-vs-settlement. El `economic_category` canonico del FX result es `financial_cost` (ya existe en `economic-category/types.ts`), NUNCA revenue/payroll/vendor. |
| Balance diario de cuenta MXN | `materializeAccountBalance` en `src/lib/finance/account-balances.ts` (TASK-774) + signal `finance.account_balances.fx_drift` + rolling anchor TASK-871 + genesis floor TASK-938 | Una cuenta `currency='MXN'` fluye por el MISMO materializer (ya consume VIEWs canonicas + COALESCE `settlement_legs.amount_clp`). NO crear computo de balance nuevo. El signal `fx_drift` ya cubre drift de recompute; verificar que ignora correctamente el plano nativo MXN. |
| Dimension analitica del gasto/ingreso | `economic_category` (TASK-768) + resolver `src/lib/finance/economic-category/resolver.ts` | El FX result usa `economic_category='financial_cost'`. NO leer `expense_type`/`income_type` (fiscal SII) para analitica: el lint rule `greenhouse/no-untokenized-expense-type-for-analytics` (modo `error`) lo bloquea. |
| Proyeccion a BigQuery de hechos MXN | Outbox + reactive consumer (TASK-771/773), NO inline en route handlers | Toda proyeccion downstream (BQ conformed, AR marts) corre via outbox event versionado v1 + reactive consumer en ops-worker. El Nubox→PG→BQ de Slice 3/5 respeta el decoupling: el write a `income` emite outbox; la proyeccion BQ la consume el reactive worker. NO bloquear el request path con la proyeccion. |
| Error API que cruza al cliente | `canonicalErrorResponse(code)` (`src/lib/api/canonical-error-response.ts`) | Extender el enum `CanonicalErrorCode` con `unsupported_corridor`, `fx_snapshot_missing`, `fx_rate_stale`, `nubox_export_orphan_rfc`, `mixed_currency_payment_order`. Prosa es-CL, `actionable` correcto (stale/missing → `actionable:false` salvo override path). |

**Interaccion con el lint rule `greenhouse/no-untokenized-fx-math`** (modo `error`, override block en `eslint.config.mjs`): los readers canonicos (`expense-payments-reader.ts`, `income-payments-reader.ts`) ya estan exentos. Si Slice 8 crea un reader USD nuevo que necesita `amount * rate`, la unica via legitima es: (a) agregar la columna pre-resuelta a la VIEW canonica (preferido), o (b) agregar el archivo al override block con razon documentada. NUNCA desactivar el rule inline.

## Currency Plane Sourcing Contract (binding decision — resuelve ambiguedad ADR §8.2)

> El ADR dice "functional CLP" y "Nubox CLP legal equivalent" sin declarar si son el MISMO numero ni cual rate produce el plano USD. Esta ambiguedad genera `finance.multi_currency.native_equivalent_drift` falso si dos paths producen CLP/USD distintos. **Decision canonica, no interpretable:**

Para una factura de exportacion Nubox (DTE 110), los 3 planos se sourcing asi:

1. **`native`** = monto extranjero del documento, tal cual lo trae Nubox. Berel: `89.960 MXN`. Inmutable. Es el monto contractual y la base de revenue recognition (IFRS 15: transaction price en la moneda del contrato).

2. **`functional` (CLP)** = el **equivalente CLP legal/documental que Nubox/SII ya calculo** (Berel: `4.617.647 CLP`). Greenhouse **NO recomputa** MXN→CLP con su propio rate; toma el CLP observado del documento legal como verdad del plano funcional. El rate implicito (`4.617.647 / 89.960 = 51,3300 CLP/MXN`) se persiste como **evidencia** en el `FxSnapshot` con `source='nubox_legal_document'` y `policy='rate_at_event'`. Esto preserva la conciliacion exacta contra el RCV/F29 del SII y evita drift contra el libro de ventas.

3. **`reporting` (USD)** = se deriva **deterministicamente desde el plano funcional CLP** via snapshot bloqueado `CLP→USD` (`rate_at_event` a la fecha de emision), NO desde un MXN→USD independiente. Razon: los 3 planos deben reconciliar por un unico ancla (el CLP legal). Si USD se sacara de MXN→USD con un rate distinto, `native * mxn_usd_rate != functional_clp / clp_usd_rate` y el signal `native_equivalent_drift` dispararia falso. La cadena canonica es **`MXN (native) → CLP (legal Nubox) → USD (snapshot CLP→USD)`**.

   - Excepcion declarada: si Finance decide que el plano USD debe reflejar el mercado MXN directo (MXN→USD banxico), eso es una **decision de governance** que debe registrarse en el ADR y ajustar el contrato de `native_equivalent_drift` para tolerar la diferencia entre ambas cadenas. Hasta entonces, la cadena via CLP legal es la unica canonica.

**`native_equivalent_drift` — definicion deterministica del recompute** (para que el signal no de falsos positivos): `functional_clp` debe igualar `native_amount * fx_snapshot[native→functional].rate` dentro de tolerancia de redondeo (±1 CLP, mismo umbral que `account_balances.fx_drift`), donde el snapshot es el `nubox_legal_document` rate implicito; y `reporting_usd` debe igualar `functional_clp * fx_snapshot[CLP→USD].rate` dentro de ±0,01 USD. Cualquier consumer que recompute por otra cadena viola el contrato.

**Tratamiento fiscal (DTE 110, IVA-exento)**: la factura de exportacion es **IVA-exenta** por D.L. 825 Art 12 letra D/E. La fila `income` se proyecta con `is_tax_exempt=true`, `tax_rate=0`, `tax_amount=0`. NUNCA aplicar IVA 19% a un DTE 110. El plano funcional CLP es el valor exento documental. (No es asesoria tributaria de filing; el mapeo del campo de exportacion debe verificarse contra el artefacto Nubox/SII en Discovery — ver Open Questions.)

**FX gain/loss en settlement** (cuando Berel paga): `fx_result = settlement_functional_clp - invoice_functional_clp`, donde `invoice_functional_clp` es el CLP legal Nubox (punto 2) y `settlement_functional_clp` se snapshotea con `policy='rate_at_settlement'` a la fecha del movimiento bancario. El resultado se clasifica `economic_category='financial_cost'` y se materializa via `fx_pnl_breakdown` (TASK-699), NUNCA dentro de revenue. Esto es FX realizado (skill finance Lens 5: diferencia entre rate documento y rate pago).

## Capabilities & Access (binding — TASK-873/935 grant coverage)

Esta task introduce 2 superficies de escritura nuevas que requieren capability dedicada (overlay arch #7) + grant en `runtime.ts` en el MISMO PR (sino el guard `capability-grant-coverage.test.ts` rompe el build y el endpoint da 403):

| Capability | Module / action / scope | Roles (grant en `runtime.ts`) | Superficie |
|---|---|---|---|
| `finance.fx.manual_override` | `finance` / `update` / `tenant` | FINANCE_ADMIN + EFEONCE_ADMIN | Override de rate cuando readiness es `temporarily_unavailable` o `supported_but_stale`. Requiere `rate`, `reason >= 10 chars`, audit row + outbox. El valor crudo del override no se loggea fuera del audit. |
| `finance.nubox_export.review_disposition` | `finance` / `approve` / `tenant` | FINANCE_ADMIN + EFEONCE_ADMIN | Resolver manualmente el match RFC↔organization cuando el resolver no encuentra match. Name similarity es evidencia candidata, NUNCA write authority. Disposition es append-only audit. |

Ambas escriben outbox event v1 + audit append-only (anti-UPDATE/anti-DELETE trigger). El reviewed disposition NUNCA proyecta a `income` por nombre similar sin firma humana.

## Normative Docs

- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/payment-orders-bank-settlement-resilience.md`
- `docs/documentation/finance/pricing-comercial.md`
- `docs/documentation/finance/cotizador.md`

## Dependencies & Impact

### Depends on

- ADR approval: `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`.
- FX foundation runtime:
  - `src/lib/finance/currency-domain.ts`
  - `src/lib/finance/currency-registry.ts`
  - `src/lib/finance/fx-readiness.ts`
  - `src/lib/finance/fx/sync-orchestrator.ts`
  - `src/app/api/cron/fx-sync-latam/route.ts`
- Finance contracts/runtime:
  - `src/lib/finance/contracts.ts`
  - `src/lib/finance/postgres-store.ts`
  - `src/lib/finance/shared.ts`
- Nubox sync:
  - `src/lib/nubox/types.ts`
  - `src/lib/nubox/mappers.ts`
  - `src/lib/nubox/sync-nubox-to-postgres.ts`
- Payment obligations:
  - `src/lib/finance/payment-obligations/create-obligation.ts`
  - `src/lib/finance/payment-obligations/list-obligations.ts`
  - `src/lib/finance/payment-obligations/row-mapper.ts`
- Payment orders:
  - `src/lib/finance/payment-orders/create-from-obligations.ts`
  - `src/lib/finance/payment-orders/mark-paid-atomic.ts`
  - `src/lib/finance/payment-orders/record-payment-from-order.ts`
  - `src/lib/finance/payment-orders/source-instrument-policy.ts`
  - `src/lib/finance/payment-orders/list-orders.ts`
- Beneficiary payment profiles:
  - `src/lib/finance/beneficiary-payment-profiles/create-profile.ts`
  - `src/lib/finance/beneficiary-payment-profiles/approve-profile.ts`
  - `src/lib/finance/beneficiary-payment-profiles/row-mapper.ts`
  - `src/lib/finance/beneficiary-payment-profiles/resolve-self-service-context.ts`
- Existing migrations to inspect before new migrations:
  - `migrations/20260421011323497_task-466-expand-quotation-currency-constraint.sql`
  - `migrations/20260501140545647_task-748-payment-obligations.sql`
  - `migrations/20260501143749876_task-750-payment-orders.sql`
  - `migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql`
  - `migrations/20260505172907393_payment-order-processor-funding-policy.sql`

### Blocks / Impacts

- Berel/Grupo Berel MXN AR and cash workflow.
- Nubox export invoice projection correctness.
- MXN payment order creation and settlement.
- Finance dashboards and P&L that currently assume CLP-normalized-only facts.
- Any future LATAM finance-core currency promotion.

### Files owned

- `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`
- `src/lib/finance/currency-domain.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/currency-registry.ts`
- `src/lib/finance/fx-readiness.ts`
- `src/lib/finance/fx/sync-orchestrator.ts`
- `src/lib/nubox/types.ts`
- `src/lib/nubox/mappers.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-obligations/**`
- `src/lib/finance/payment-orders/**`
- `src/lib/finance/beneficiary-payment-profiles/**`
- `src/lib/finance/**/reporting-or-reader-files-[verificar-en-plan]`
- `migrations/*task-990*.sql`
- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Current Repo State

### Already exists

- Pricing/commercial supports MXN output:
  - `src/lib/finance/currency-domain.ts`
  - `src/lib/finance/currency-registry.ts`
  - `src/lib/finance/pricing/contracts.ts`
  - `src/lib/commercial/product-catalog-prices.ts`
  - quotation/product catalog migrations for `CLP, USD, CLF, COP, MXN, PEN`.
- FX provider platform exists:
  - `src/lib/finance/fx/sync-orchestrator.ts`
  - providers including `banxico_sie`, `frankfurter`, `fawaz_ahmed`.
  - `/api/cron/fx-sync-latam?window=evening` includes MXN.
- Payment Orders architecture exists and keeps source/processor/settlement separation.
- Nubox sync already ingests raw/conformed sales but does not model export foreign detail in finance projection.

### Gap

- `finance_core` rejects MXN by domain matrix and TypeScript contract.
- Core DB constraints still reject MXN in obligations, payment orders, payment lines, payment profiles and funding policies.
- Nubox exportation detail is not typed/mapped/projected.
- Nubox sync hardcodes `income.currency='CLP'` and `exchange_rate_to_clp=1`.
- External cash signals from Nubox bank movements are hardcoded as CLP.
- Berel/RFC identity cannot project the invoice into `income`.
- CLP/USD reporting planes are not guaranteed by locked snapshots for MXN native events.
- Treasury does not yet classify MXN settlement deltas as explicit FX gain/loss.

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

### Slice 0 — ADR acceptance, inventory and migration map

- Confirm human acceptance of `docs/architecture/GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md`.
- Run `pnpm pg:doctor`.
- Inspect actual PostgreSQL constraints for:
  - `greenhouse_finance.income`
  - `greenhouse_finance.expenses`
  - `greenhouse_finance.payment_obligations`
  - `greenhouse_finance.payment_orders`
  - `greenhouse_finance.payment_order_lines`
  - `greenhouse_finance.beneficiary_payment_profiles`
  - `greenhouse_finance.payment_order_processor_funding_policies`
  - `greenhouse_finance.accounts`
  - `greenhouse_finance.income_payments`
  - `greenhouse_finance.expense_payments`
  - `greenhouse_finance.settlement_legs`
  - `greenhouse_finance.external_cash_signals`
- Inspect Nubox raw/conformed BigQuery fields for document `28800562`.
- Inventory the canonical VIEWs/helpers that MXN must extend (ver `## Canonical Pattern Alignment`): `expense_payments_normalized`, `income_payments_normalized`, `income_settlement_reconciliation`, `fx_pnl_breakdown`. Document their current column contract + the `payment_amount_clp` COALESCE chain before altering.
- Inventory the `economic_category` canonical values (`financial_cost` is the FX-result home) and the lint rules `no-untokenized-fx-math` + `no-untokenized-expense-type-for-analytics` (both `error`) — the migration map must state which readers are exempt and which must be added to the override block.
- Produce and commit a table-by-table AND view-by-view migration map inside this task as a `Delta` before Slice 1 implementation. The map must state, per artifact: current columns/constraint, target, compatibility field, whether CHECK widening is instant (adding `'MXN'` to `IN (...)` validates immediately, no `NOT VALID` needed) vs new-column constraints that require `NOT VALID + VALIDATE` two-step (overlay arch #12), and rollback stance.

### Slice 1 — Money primitives and FX snapshot contract

- Expand `FinanceCurrency` to `CLP | USD | MXN`.
- Expand `CURRENCY_DOMAIN_SUPPORT.finance_core` to include MXN.
- Introduce canonical money/snapshot helpers under `src/lib/finance/` using existing local patterns.
- Ensure resolver can produce snapshotable evidence for all six directions:
  - `CLP->USD`
  - `USD->CLP`
  - `MXN->CLP`
  - `CLP->MXN`
  - `MXN->USD`
  - `USD->MXN`
- Add tests for direct, inverse and composition paths.
- Keep production write paths blocked by flags.

### Slice 2 — Schema expand, no behavior flip

- Add/alter CHECK constraints to include MXN only after readers/helpers can classify MXN safely.
- Add nullable native/functional/reporting/snapshot columns or snapshot link tables according to Slice 0 map.
- Preserve existing CLP/USD rows bit-for-bit.
- Add indexes required for currency/period/source queries.
- Add migration DO blocks that fail if constraints are not in the expected pre-state.
- Do not backfill Berel or any live row in this slice.

### Slice 3 — Nubox export invoice conformed model

- Extend `src/lib/nubox/types.ts` with `exportationDetail`.
- Extend `src/lib/nubox/mappers.ts` to map foreign amount and currency evidence.
- Add conformed shape fields for:
  - `foreign_total_amount`
  - `foreign_currency_code`
  - `functional_total_amount_clp`
  - `exportation_detail_json`
  - `foreign_currency_evidence_source`
  - `foreign_currency_confidence`
- Add tests using a Berel-like fixture.
- Do not project into `income` yet unless `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=true`.

### Slice 4 — Cross-country fiscal identity matching

- Add or reuse an organization tax identity resolver that supports Mexican RFC. Extender la identidad 360 (`greenhouse_core.organizations` tax identities / RUT matching) — NUNCA crear identidad paralela (overlay arch #1).
- Normalize RFC `PBE970101718` (validar el patron RFC persona moral: 3 letras + 6 digitos fecha + 3 homoclave).
- Add reviewed disposition path when RFC cannot be matched automatically, gated por capability `finance.nubox_export.review_disposition` (ver `## Capabilities & Access`) + grant en `runtime.ts` en el mismo PR + audit append-only.
- Ensure name similarity is candidate evidence only, never write authority.
- Add signal `finance.nubox_export.orphan_rfc`.
- Produce dry-run report for Berel.

### Slice 5 — Income and AR projection with MXN native amount

- Update Nubox-to-Postgres projection (`src/lib/nubox/sync-nubox-to-postgres.ts`) to preserve, segun el `## Currency Plane Sourcing Contract`:
  - native MXN amount (monto extranjero del documento, inmutable).
  - functional CLP = el equivalente CLP legal Nubox (NO recomputado por Greenhouse); persistir el rate implicito como `FxSnapshot{source='nubox_legal_document', policy='rate_at_event'}`.
  - reporting USD derivado deterministicamente `CLP(legal) → USD` (snapshot `rate_at_event`), NO un MXN→USD independiente.
  - FX snapshot ids o campos de evidencia equivalentes.
- Remove CLP hardcode for export invoices. El hardcode concreto a remover vive en el upsert de income (no en el de cash signal). Verificar tambien que el income export NO aplique IVA (DTE 110 → `is_tax_exempt=true`, `tax_rate=0`, `tax_amount=0`).
- Keep CLP-only behavior for non-export invoices whose source is CLP (bit-for-bit, sin cambio de semantica).
- Toda lectura CLP/USD downstream pasa por las VIEWs canonicas extendidas (`income_payments_normalized` / `income_settlement_reconciliation`), NUNCA recompute inline (lint `no-untokenized-fx-math`).
- Gate with `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=false` and `FINANCE_CORE_MXN_ENABLED=false` defaults.
- Backfill Berel in dry-run first; apply only through allowlist and explicit flag (`FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED`). Emitir outbox v1 para la proyeccion BQ (reactive consumer, TASK-771), NO proyectar inline.

### Slice 6 — Payment obligations, profiles and payment orders MXN

- Expand payment obligations to MXN.
- Expand beneficiary payment profiles to MXN.
- Expand payment orders and payment lines to MXN.
- Keep one-order-one-currency invariant.
- Update routing/source policy to handle `order_currency='MXN'` or explicitly return `unsupported_corridor` before creating an order.
- Add tests for mixed-currency rejection.
- Add signal `finance.payment_order.mixed_currency_attempt`.

### Slice 7 — Treasury cash, settlement legs and FX result

- Update income/expense payment recording to accept MXN settlement currency where the source supports it.
- Update `settlement_legs` handling to model MXN funding, FX, fees and payouts. Reusar el COALESCE `settlement_legs.amount_clp` canonico (TASK-774); el balance de cuenta MXN fluye por `materializeAccountBalance` sin computo nuevo.
- Ensure processors remain separate from source accounts per TASK-799.
- Add explicit FX gain/loss classification for invoice-vs-settlement delta **extendiendo la VIEW canonica `fx_pnl_breakdown` (TASK-699, fuente #1 realized-settlement / #3 internal-transfer), NO un mecanismo nuevo**. Formula: `fx_result = settlement_functional_clp - invoice_functional_clp` (invoice CLP = legal Nubox; settlement CLP = snapshot `rate_at_settlement`). `economic_category='financial_cost'`.
- Add signal `finance.fx_gain_loss.unclassified`.
- Add tests for:
  - MXN invoice paid in MXN.
  - MXN invoice settled in CLP.
  - MXN invoice settled in USD.
  - no double debit when processor is counterparty/intermediary.

### Slice 8 — Reporting and reliability readers

- Add or update readers for native, CLP and USD planes, **extendiendo las VIEWs canonicas, no paralelizando**:
  - AR/income → `income_payments_normalized` + `income_settlement_reconciliation` (extendidas con plano USD).
  - cash position → `materializeAccountBalance` / `account_balances` (consolidado CLP/USD ya derivable; preservar account-native currency).
  - payment obligations / payment orders → readers existentes en `src/lib/finance/payment-{obligations,orders}/`.
  - client profitability / P&L [verificar exact reader in Plan Mode].
- Si un reader USD nuevo requiere `amount * rate`: agregar la columna pre-resuelta a la VIEW canonica (preferido) o al override block de `eslint.config.mjs` con razon documentada. NUNCA `// eslint-disable` inline del rule `no-untokenized-fx-math`.
- Preserve native currency dimension in detailed exports.
- Add signals:
  - `finance.fx.mxn_rate_freshness`
  - `finance.fx.snapshot_missing`
  - `finance.nubox_export.foreign_amount_missing`
  - `finance.multi_currency.native_equivalent_drift`
  - `finance.cash_signal.unsupported_currency`
- Wire into reliability overview.

### Slice 9 — Docs, rollout and production verification

- Update finance functional docs:
  - `docs/documentation/finance/monedas-y-tipos-de-cambio.md`
  - `docs/documentation/finance/ordenes-de-pago.md`
  - `docs/documentation/finance/conciliacion-bancaria.md`
  - any Nubox/export invoice doc discovered in Plan Mode.
- Update `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` with a dated delta pointing to the accepted multi-currency ADR.
- Update `docs/architecture/DECISIONS_INDEX.md` if ADR status changes to Accepted.
- Execute staging and production rollout sequence exactly as below.

## Out of Scope

- Adding COP/PEN/CLF/BRL to `finance_core`.
- Replacing Greenhouse with a legal GL.
- Changing Chile statutory payroll currency away from CLP.
- Adding new UI workbenches unless required for a reviewed disposition/admin queue found in Plan Mode.
- Mutating unrelated Nubox invoices outside the allowlist.
- Manual SQL data fixes outside a committed, reviewed, idempotent script.
- Changing pricing product catalog semantics beyond consuming the existing MXN foundation.

## Detailed Spec

### Canonical event shape

Every new or migrated write path must be able to reconstruct:

```ts
interface FinanceMonetaryEvent {
  native: {
    amount: string
    currency: 'CLP' | 'USD' | 'MXN'
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
  fxSnapshots: Array<{
    fromCurrency: 'CLP' | 'USD' | 'MXN'
    toCurrency: 'CLP' | 'USD' | 'MXN'
    rate: string
    inverseRate: string
    rateDate: string
    rateDateResolved: string
    source: string
    policy: 'rate_at_event' | 'rate_at_send' | 'rate_at_period_close' | 'rate_at_settlement' | 'manual_override'
    lockedAt: string
  }>
}
```

### Berel acceptance fixture

The canonical test fixture must include:

```json
{
  "sourceSystem": "nubox",
  "sourceObjectId": "28800562",
  "dteType": 110,
  "clientName": "PINTURAS BEREL SA DE CV",
  "clientTaxId": "PBE970101718",
  "emissionDate": "2026-06-01T22:52:13Z",
  "dueDate": "2026-07-01",
  "functionalTotalAmountClp": 4617647,
  "foreignTotalAmount": 89960,
  "foreignCurrencyCode": "MXN"
}
```

### Fail-closed behavior

- If MXN rate is missing: block event creation unless Finance Admin supplies manual override.
- If MXN rate is stale: block client-facing emission and payment creation unless override is recorded.
- If RFC identity is unresolved: keep Nubox sale conformed/orphaned; do not project into `income`.
- If order would mix currencies: reject before transaction starts.
- If settlement currency is unsupported by source policy: reject with explicit `unsupported_corridor`.
- If FX snapshot cannot be locked: no write.

### Backfill contract

Backfill scripts must support:

```bash
--dry-run
--apply
--allowlist-source-object-id 28800562
--actor <user-id>
--reason "<human-readable reason>"
--max-rows <n>
```

Dry-run output must include:

- candidate count.
- rows skipped by reason.
- before/after payload preview.
- FX snapshot source/rate/date.
- organization match evidence.
- exact SQL mutation count expected.

Apply must abort if actual mutation count differs from expected.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST complete before any implementation.
- Slice 1 MUST complete before Slice 2.
- Slice 2 MUST complete before any production write path accepts MXN.
- Slice 3 and Slice 4 can run after Slice 1, but Slice 5 requires both.
- Slice 6 requires Slice 1 + Slice 2.
- Slice 7 requires Slice 6.
- Slice 8 requires Slices 5-7.
- Slice 9 closes only after staging + production verification.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CLP/USD legacy rows change semantics | finance/data | medium | Expand-and-contract, bit-for-bit CLP/USD tests, no column semantic rename without map | `finance.multi_currency.native_equivalent_drift` |
| MXN invoice projected as CLP-only | Nubox/finance | high pre-task | Export detail mapper, hard rule against CLP hardcode, signal | `finance.nubox_export.foreign_amount_missing` |
| Berel matched to wrong organization | identity/data | medium | RFC resolver + reviewed disposition; name match advisory only | `finance.nubox_export.orphan_rfc` |
| Missing/stale MXN rate creates wrong amounts | FX/finance | medium | fail-closed readiness, manual override audit | `finance.fx.mxn_rate_freshness`, `finance.fx.snapshot_missing` |
| Mixed-currency payment order | payment orders | medium | server-side reject + tests | `finance.payment_order.mixed_currency_attempt` |
| FX loss buried in operating P&L | reporting/accounting | medium | explicit FX result lane + tests | `finance.fx_gain_loss.unclassified` |
| Processor double-debits cash during MXN settlement | treasury | low-medium | TASK-799 source/intermediary policy, settlement tests | existing payment-order settlement signals + new MXN tests |
| Backfill mutates too many rows | data | low | allowlist, dry-run, expected mutation count abort | script output + Sentry capture |
| Production env flags not deployed/redeployed | rollout | medium | explicit Vercel env verification + redeploy sequence | rollout checklist |

### Feature flags / cutover

- `FINANCE_CORE_MXN_ENABLED=false` default.
- `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=false` default.
- `FINANCE_MXN_PAYMENT_ORDERS_ENABLED=false` default.
- `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED=false` default.
- `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED=false` default.

Flags must be present in Production, staging and Preview develop before the code path is considered rollout-ready. Redeploy is required after env var changes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs only. | <5 min | yes |
| Slice 1 | Revert code if flags off; no data mutation. | <15 min | yes |
| Slice 2 | If additive columns only, leave columns and disable flags; if constraint expansion causes issue, apply follow-up constraint narrowing after verifying no MXN rows. | 30-90 min | partial |
| Slice 3 | Disable `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`; revert mapper. | <15 min | yes |
| Slice 4 | Disable projection apply; reviewed dispositions remain audit evidence. | <30 min | partial |
| Slice 5 | Disable `FINANCE_CORE_MXN_ENABLED` and projection flag; if Berel backfill applied, run compensating supersede/reprojection script from stored dry-run evidence. | 1-2h | partial |
| Slice 6 | Disable `FINANCE_MXN_PAYMENT_ORDERS_ENABLED`; existing MXN orders remain readable but no new creates. | <15 min | partial |
| Slice 7 | Disable mark-paid MXN path; do not delete settlement evidence; apply compensating reversal only with Finance approval. | 1-4h | partial |
| Slice 8 | Disable `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED`; fallback to legacy readers. | <15 min | yes |
| Slice 9 | Rollout docs only; no runtime rollback. | N/A | yes |

### Production verification sequence

1. `pnpm pg:doctor` local and staging.
2. Run all migrations in staging.
3. Deploy staging with all flags `false`.
4. Verify CLP/USD finance flows unchanged:
   - existing Nubox non-export projection.
   - existing payment order create/approve/mark-paid.
   - existing account balance health.
5. Enable `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=true` in staging.
6. Dry-run Berel projection for `28800562`; verify native MXN, CLP and USD values.
7. Enable `FINANCE_CORE_MXN_ENABLED=true` in staging.
8. Apply Berel allowlist backfill in staging.
9. Verify `income` projection, AR reader, reporting reader and reliability signals.
10. Enable `FINANCE_MXN_PAYMENT_ORDERS_ENABLED=true` in staging.
11. Create MXN obligation/order/profile fixture and verify mixed-currency rejection.
12. Exercise MXN settlement scenarios in staging.
13. Enable `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED=true` in staging.
14. Verify dashboards/readers and CLP/USD consolidated outputs.
15. Repeat production deploy with flags `false`.
16. Configure flags in Production but keep disabled until staging evidence is attached to Handoff.
17. Enable production flags one by one using the same order.
18. Apply Berel production backfill only with allowlist and explicit actor/reason.
19. Monitor listed signals for 7 days.

### Out-of-band coordination required

- Finance must confirm Berel's contractual/invoice currency as MXN and approve the source of currency evidence if Nubox JSON lacks explicit currency code.
- Finance must decide whether Banxico primary token (`BANXICO_SIE_TOKEN`) is required before production MXN finance-core writes, or whether Frankfurter/Fawaz fallback is acceptable temporarily with visible degraded source.
- Finance/Treasury must identify the expected MXN settlement path: MXN bank account, processor, conversion to CLP, conversion to USD or manual reconciliation.
- If production flags/env vars are added or changed, Vercel redeploy is required for affected targets.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1` is accepted or this task is explicitly authorized to proceed from Proposed status.
- [ ] `FinanceCurrency` and `finance_core` domain support include MXN.
- [ ] All known CLP/USD finance-core DB constraints are expanded or explicitly bounded.
- [ ] Nubox export invoices map foreign amount and currency evidence.
- [ ] Berel invoice `28800562` dry-run shows MXN `89,960`, CLP `4,617,647` and USD reporting equivalent from locked FX snapshot.
- [ ] Berel projection cannot write without RFC organization match or reviewed disposition.
- [ ] Income/AR preserves native MXN plus CLP/USD equivalents.
- [ ] Payment obligations/profiles/orders support MXN or reject unsupported corridors before creating orders.
- [ ] Mixed-currency payment orders are rejected server-side.
- [ ] Settlement paths classify FX gain/loss explicitly.
- [ ] Reporting/readers expose native detail, CLP consolidated and USD consolidated planes.
- [ ] Required reliability signals are wired (subsystem rollup `Finance Data Quality`) and return steady-state after rollout.
- [ ] Production rollout includes flags/env vars, redeploy, allowlist backfill and runtime verification.
- [ ] MXN se agrega EXTENDIENDO las VIEWs canonicas (`expense_payments_normalized`, `income_payments_normalized`, `income_settlement_reconciliation`, `fx_pnl_breakdown`, `materializeAccountBalance`); no se crea ninguna VIEW/helper paralelo.
- [ ] Ningun reader nuevo viola `greenhouse/no-untokenized-fx-math` (build verde sin `eslint-disable` inline).
- [ ] Los 3 planos reconcilian por la cadena canonica `MXN(native) → CLP(legal Nubox) → USD(snapshot CLP→USD)`; `native_equivalent_drift` no da falsos positivos.
- [ ] La factura de exportacion DTE 110 se proyecta IVA-exenta (`is_tax_exempt=true`, `tax_rate=0`, `tax_amount=0`).
- [ ] FX gain/loss se materializa via `fx_pnl_breakdown` con `economic_category='financial_cost'`, fuera de revenue/operating P&L.
- [ ] Las capabilities `finance.fx.manual_override` y `finance.nubox_export.review_disposition` estan seedeadas + granteadas en `runtime.ts` (guard `capability-grant-coverage.test.ts` verde) con audit append-only.
- [ ] Errores API nuevos usan `canonicalErrorResponse` (es-CL) y los code paths usan `captureWithDomain(err, 'finance', ...)`.

## Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test`
- Targeted tests:
  - `pnpm vitest run src/lib/finance src/lib/nubox src/lib/reliability`
  - `pnpm vitest run src/lib/finance/payment-orders src/lib/finance/payment-obligations src/lib/finance/beneficiary-payment-profiles`
- Migration verification:
  - `pnpm pg:connect`
  - inspect constraints before/after.
- Runtime verification:
  - `pnpm staging:request GET /api/finance/nubox/sync-status --pretty`
  - Berel dry-run/apply script output.
  - payment order MXN staging fixture.
  - reliability overview signals.
- If any UI/reporting surface changes visibly:
  - `pnpm fe:capture --route=<route> --env=staging --hold=3000`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/DECISIONS_INDEX.md` refleja el status final del ADR
- [ ] `docs/documentation/finance/monedas-y-tipos-de-cambio.md` refleja que finance_core soporta MXN solo si el rollout esta operativo
- [ ] Staging and production flags/env vars were verified with CLI, not assumed
- [ ] Production redeploy/restart was performed where env vars changed
- [ ] Berel backfill evidence is attached in Handoff

## Follow-ups

- Promote `BANXICO_SIE_TOKEN` and MXN coverage to `auto_synced` if Finance requires official MXN source before broader rollout.
- Future ADR/task for COP/PEN finance-core promotion if commercial demand repeats outside MXN.
- UI task for Finance Admin reviewed-disposition queue if Plan Mode finds no existing surface can safely host RFC/orphan review.
- Treasury task for MXN bank/processor onboarding if no current account/rail can settle MXN.

## Open Questions

- Does Nubox expose explicit foreign currency code in XML/PDF or another endpoint for export invoices, or must Greenhouse use reviewed commercial evidence?
- Will Berel pay into an MXN-denominated account, or will the bank/processor convert before Greenhouse observes settlement?
- Does Finance require Banxico primary source for production MXN write paths, or is fallback acceptable with degraded-source evidence?
- Should `reporting` and `analytics` expose USD broadly now, or only in finance multi-currency readers behind `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` first?
- **Governance del plano USD (resuelto por defecto, confirmar con Finance):** el `## Currency Plane Sourcing Contract` fija la cadena canonica `MXN → CLP(legal Nubox) → USD`. Si Finance prefiere que el plano USD refleje el mercado MXN directo (`MXN → USD` banxico), es una decision de governance que debe registrarse en el ADR y relajar la tolerancia de `native_equivalent_drift`. ¿Confirma Finance la cadena via CLP legal como canonica para V1?
- **Verificacion fiscal DTE 110:** confirmar contra el artefacto Nubox/SII real (XML/PDF de `28800562`) que el income export se mapea IVA-exento (D.L. 825 Art 12) y que el equivalente CLP que trae Nubox es el valor documental legal (no un estimado). Escalar a contador si el campo de exportacion no es inequivoco.
- **`account_balances.fx_drift` con cuenta MXN nativa:** confirmar en Slice 7 que el signal `finance.account_balances.fx_drift` (TASK-774) trata correctamente el plano nativo MXN y no dispara drift artificial sobre una cuenta cuyo `currency='MXN'`.
