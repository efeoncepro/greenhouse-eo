# TASK-768 — Finance Expense Economic Category Dimension (root-cause classification)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Discovery (2026-05-03)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (foundations TASK-571, TASK-699, TASK-708/728, TASK-721, TASK-742, TASK-766 ya cerradas)
- Branch: `task/TASK-768-finance-expense-economic-category-dimension`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Separar las dos dimensiones que hoy están conflated en `expense_type` (y simétrico en `income.income_type`): la **taxonomía contable** que SII / P&L / regulatorio necesitan, y la **categoría económica** que los KPIs operativos / ICO / cost attribution / member loaded cost necesitan. Hoy son la misma columna, lo que hace que pagos económicamente-payroll caigan en bucket `supplier` cuando el bank reconciler no puede inferir mejor; eso sesga TODO el rollup analítico downstream (cash-out KPI Nómina solo capturó $1.432.644 cuando los costos labor reales del periodo eran ~$4.5M; los $3M faltantes están dispersos en los buckets `supplier` y `bank_fee` por mis-clasificación). Solución de raíz: nueva columna `economic_category` poblada en write-time desde fuentes canónicas, backfill defensivo idempotente, CHECK constraint NOT NULL post-cutover, hint engine en el bank reconciler, reclassification UI con audit log + outbox v1, reliability signal anti-regresión, migración de TODOS los consumers analíticos al campo nuevo. Cero lentes derivadas; cero bandaid.

## Why This Task Exists

**Detección 2026-05-03**: usuario observó que el KPI Nómina en `/finance/cash-out` para abril 2026 mostraba $1.432.644 cuando el gasto labor real del periodo era significativamente mayor. Investigación SQL confirmó que **$3.037.136 de payments ECONÓMICAMENTE-payroll están clasificados como `expense_type='supplier'` o `'bank_fee'`** porque el bank reconciler defaultea a `supplier` cuando no puede inferir naturaleza desde la transacción raw:

| Pago | Beneficiario | Monto | `expense_type` actual (BUG) | `economic_category` correcto |
|---|---|---|---|---|
| 2026-04-04 | Daniela (España) Global66 | $1.090.731 | `supplier` ❌ | `labor_cost_external` |
| 2026-04-04 | Andrés (Colombia) Global66 | $688.058 | `supplier` ❌ | `labor_cost_external` |
| 2026-04-04 | FX fee Daniela | $46.631 | `bank_fee` ❌ | `labor_cost_external` (cost-of-payroll) o `bank_fee` payroll-tagged |
| 2026-04-04 | FX fee Andrés | $40.045 | `bank_fee` ❌ | idem |
| 2026-04-06 | Valentina Hoyos (transferencia) | $437.077 | `supplier` ❌ | `labor_cost_external` |
| 2026-04-15 | Valentina Hoyos (transferencia) | $158.371 | `supplier` ❌ | `labor_cost_external` |
| 2026-04-09 | Humberly Henriquez (transferencia 300k) | $300.000 | `supplier` ❌ | `labor_cost_internal` |
| 2026-04-13 | Previred (cotizaciones) | $276.223 | `bank_fee` ❌ | `regulatory_payment` |

**Verificación crítica**: los saldos bancarios SÍ cuadran y la conciliación está completa. El cash flow está correctamente registrado. El sesgo es **únicamente en la dimensión de bucket** (qué KPI card recibe qué pago). Las dimensiones "cuánto salió de la caja" y "en qué bucket cae" son **legítimamente ortogonales** y hoy están conflated en una sola columna.

**Por qué no resolverlo con una lente read-time** (descartado en discovery):

1. **No ataca causa raíz** — bank reconciler seguirá creando expenses mal clasificados, lente compensa eternamente.
2. **Blast radius mucho mayor que cash-out** — `expense_type` lo lee P&L engine, `commercial_cost_attribution`, ICO engine, member loaded cost (TASK-710-713), budget engine (TASK-178), reliability signals, reportes SII. Una lente que solo arregla cash-out deja todos los demás consumers con KPIs sesgados.
3. **Source of truth dividida** — SQL ad-hoc, exports, BigQuery siempre verán `expense_type='supplier'`. La lente sería "verdad solo en el helper canónico" → viola principio TASK-571/699/766.
4. **Auditabilidad pobre** — sin outbox event cuando categoría cambia, sin trail de cuándo/por qué/quién decidió que un pago es payroll.
5. **Performance** — JOIN read-time contra `team_members` + `identity_profiles` + known-providers en cada KPI request.

**Solución robusta**: separar dimensiones, populate at write-time, backfill defensivo, CHECK constraint, hint engine, reclassification UI con audit, signal anti-regresión, migración exhaustiva de consumers. Mismo patrón que TASK-708/728 (account_id required after cutover) + TASK-766 (CLP currency reader contract): single source of truth en columna persistida, NOT VALID + VALIDATE atomic, capability granular, lint rule, reliability signal con steady=0.

## Goal

- Separar la dimensión `accounting_type` (preserva semántica fiscal/SII) de `economic_category` (semántica analítica/operativa) en `expenses` y simétrico en `income`. Ambas son first-class columnas materializadas, ambas auditables, ambas single source of truth para sus consumidores respectivos.
- Cerrar el gap de los $3M+ mal-clasificados de abril 2026 (y todo el histórico) vía backfill defensivo idempotente con rules engine determinístico. Ningún cambio destructivo a `accounting_type` legacy.
- Bloquear arquitectónicamente la regresión via CHECK NOT NULL post-cutover + lint rule custom + reliability signal con steady=0.
- Migrar TODOS los consumers analíticos (KPIs cash-out + cash-in + dashboard/pnl + finance/intelligence + ICO engine + member loaded cost + budget engine + commercial_cost_attribution + reliability dashboards) al nuevo campo. Cero callsite legacy.
- Hint engine en el bank reconciler que resuelve `economic_category` automáticamente al ingestion-time desde lookup de identity + regex de known regulators + known international payroll vendors. Fallback queue para operador.
- UI admin de reclassification con outbox audit + capability granular `finance.expenses.reclassify_economic_category` (least-privilege, mismo patrón TASK-742/765/766).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico (extender objetos canónicos, no crear identidades paralelas)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance (Delta 2026-05-03 documenta TASK-766; este Delta extiende el contrato)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals + AI Observer
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events versionados
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities granulares
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` — modelo dimensional Provider × Tool × Member × Client × Period × Expense (consume `expense_type` para clasificar costos labor; debe migrar a `economic_category`)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — Delta 2026-05-03 (TASK-766) define el patrón "consumer obligations + canonical reader" que TASK-768 replica para la dimensión categórica

Reglas obligatorias:

- **NUNCA** modificar `accounting_type` (legacy `expense_type`) histórico — es fuente de verdad fiscal/SII y blast radius enorme. La nueva columna es aditiva.
- **NUNCA** poblar `economic_category` con DEFAULT genérico en CHECK pre-validation. Cualquier fila pre-cutover sin clasificar va a `manual_review_queue`. NULL es estado transitorio aceptable durante backfill, NUNCA en runtime post-cutover.
- **NUNCA** computar `economic_category` en read-time desde un consumer. Toda lectura usa la columna persistida o el helper canónico.
- **NUNCA** branchear logic de KPIs por `expense_type` después de la migración. Lint rule bloquea el patrón legacy `expense_type IN ('payroll', ...)` en código de KPI/dashboard.
- Replicar simétricamente para `income` (la mis-clasificación es bidireccional: ingresos por reembolsos vs ingresos por servicios pueden caer en buckets equivocados).
- **3-axis supersede preservado**: VIEW `expense_payments_normalized` ya filtra superseded; `economic_category` se persiste en `expenses` (no en `expense_payments`), y la VIEW resuelve down-the-stack.
- Todo writer canónico (`recordExpensePayment`, `bank_reconciler.create_expense_from_statement`, `payroll_materializer`, `factoring_proceeds_recorder`, `manual /api/finance/expenses` POST) debe llamar a `resolveEconomicCategory()` en INSERT. Ninguna fila nace sin la columna poblada post-cutover (CHECK constraint enforce).

## Normative Docs

- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` — patrón canónico VIEW + helper + CHECK NOT VALID/VALIDATE + reliability signal + lint rule. TASK-768 replica este shape para la dimensión categórica en lugar de la dimensión CLP.
- `docs/tasks/complete/TASK-708-finance-settlement-legs.md` — patrón CHECK constraint NOT VALID + VALIDATE atomic + cutover_date.
- `docs/tasks/complete/TASK-728-expense-payments-account-required.md` — mirror del patrón aplicado a `payment_account_id`. Plantilla idéntica para `economic_category`.
- `docs/issues/resolved/ISSUE-064-cash-out-kpi-inflated-clp-currency-anti-pattern.md` — incidente que disparó TASK-766 (dimensión CLP). Este task disparado por descubrimiento sub-secuente: el bucket también está roto.

## Dependencies & Impact

### Depends on

- TASK-766 (`expense_payments_normalized` + `income_payments_normalized` VIEWs) — TASK-768 extiende ambas VIEWs con `economic_category` resuelto via JOIN a `expenses`/`income`.
- TASK-708/728 (CHECK NOT VALID + VALIDATE atomic pattern) — patrón de migración.
- TASK-742 (capability granular pattern + audit log) — `finance.expenses.reclassify_economic_category`.
- TASK-571 (canonical reader pattern) — single source of truth en columna + helper.
- TASK-699 (consumer contract for derived columns) — política de "no recomputar inline".
- `greenhouse_core.team_members.member_id` + `greenhouse_core.identity_profiles.identity_profile_id` — lookups del classifier.
- `greenhouse_finance.exchange_rates` — para FX fees del payroll internacional.
- `greenhouse_payroll.payroll_entries` — fuente canónica de pagos labor internos (cross-check del classifier).
- Bank reconciler (`src/lib/finance/reconciliation/`) — punto de hint engine.

### Blocks / Impacts

- **TASK-178** (Finance Budget Engine) — actualmente lee `expense_type` para forecasts; debe migrar a `economic_category`. Bonus: budgets vs actuals serán comparables apples-to-apples.
- **TASK-710 / 711 / 712 / 713** (Member Loaded Cost program) — el modelo dimensional Provider × Tool × Member × Client × Period × Expense necesita la categoría económica correcta para clasificar costos labor vs overhead vs vendor.
- **TASK-080+** (ICO Engine) — cost-per-FTE depende de bucket Nómina canónico.
- **TASK-484** (FX provider sync) — FX fees de payroll internacional clasifica correctamente como `labor_cost_external` no como `bank_fee` genérico.
- **TASK-705/706** (Commercial Cost Attribution) — allocations por cliente con dimensión correcta.
- **Reliability dashboard** — subsystem `Finance Data Quality` recibe nuevo signal `economic_category_unresolved`.

### Files owned

- `migrations/20260503_task-768-add-economic-category-column.sql`
- `migrations/20260503_task-768-backfill-economic-category-rules-engine.sql`
- `migrations/20260503_task-768-economic-category-required-after-cutover.sql`
- `migrations/20260503_task-768-extend-views-with-economic-category.sql`
- `src/lib/finance/economic-category/index.ts` — module barrel
- `src/lib/finance/economic-category/resolver.ts` — `resolveEconomicCategory({beneficiary_id, document_type, source_kind, raw_description, ...})` con rules engine + fallback queue
- `src/lib/finance/economic-category/rules.ts` — declarative rules (identity match → `labor_cost_internal`; Deel/Remote → `labor_cost_external`; Previred/Mutual/AFP/SII → `regulatory_payment`; etc.)
- `src/lib/finance/economic-category/__tests__/resolver.test.ts`
- `src/lib/finance/economic-category/__tests__/rules.test.ts`
- `src/lib/finance/economic-category/types.ts` — `EconomicCategory` union (`labor_cost_internal | labor_cost_external | vendor_cost | regulatory_payment | tax | financial_cost | overhead | financial_settlement | other`)
- `src/lib/reliability/queries/expenses-economic-category-unresolved.ts`
- `src/app/api/admin/finance/expenses/[id]/economic-category/route.ts` — PATCH endpoint
- `src/app/api/admin/finance/expenses/[id]/economic-category/route.test.ts`
- `eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs` — lint rule custom
- `eslint-plugins/greenhouse/rules/__tests__/no-untokenized-expense-type-for-analytics.test.mjs`
- `src/views/greenhouse/admin/finance/EconomicCategoryReclassifyDialog.tsx` — UI reclassify
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta nuevo)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta nuevo)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta nuevo)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (Delta nuevo — extender consumer obligations a la dimensión categórica)
- `docs/issues/resolved/ISSUE-065-finance-kpi-economic-category-mis-classification.md`
- `CLAUDE.md` (sección nueva "Finance — Economic Category Dimension Invariants (TASK-768)")

## Current Repo State

### Already exists

- `greenhouse_finance.expenses.expense_type` enum: `supplier | payroll | social_security | tax | miscellaneous | financial_cost | bank_fee` — preservado intacto como `accounting_type` (semántica fiscal).
- VIEWs `expense_payments_normalized` + `income_payments_normalized` (TASK-766) — extender con JOIN a `expenses.economic_category`.
- Helpers `sumExpensePaymentsClpForPeriod` + `sumIncomePaymentsClpForPeriod` (TASK-766) — extender con breakdown por `economic_category`.
- Reliability registry `finance.expense_payments` + `finance.income_payments` (TASK-766) — agregar 2 signals nuevos para `economic_category_unresolved`.
- CHECK NOT VALID + VALIDATE atomic pattern probado 4 veces (TASK-708, TASK-728, TASK-766×2).
- Lint rule infra `eslint-plugins/greenhouse/` (TASK-265, TASK-743, TASK-766) — extender con regla nueva.
- Capability runtime (`src/lib/entitlements/runtime.ts` + `src/config/entitlements-catalog.ts`) — agregar `finance.expenses.reclassify_economic_category`.
- Outbox infra (`publishOutboxEvent`) — agregar event v1 nuevo.
- Bank reconciler (`src/lib/finance/reconciliation/`) — punto de inserción del hint engine.
- `team_members.full_name` + `team_members.rut` + `identity_profiles.email` — fuentes de identity match para classifier.

### Gap

- No existe la dimensión `economic_category` separada de `accounting_type` (`expense_type`) — esa es la causa raíz de los $3M mal-clasificados.
- No existe `resolveEconomicCategory()` helper — bank reconciler crea expenses con default genérico.
- No existe rules engine declarativo para classification — la lógica está implícita en code paths separados (Deel handler etiqueta payroll, bank reconciler defaultea supplier).
- No existe lookup table `known_regulators` (Previred, Mutual, AFP, SII, FONASA, ISAPRE, Mutual de Seguridad) — clasificación por regex frágil.
- No existe lookup table `known_payroll_vendors` (Deel, Remote, Velocity Global, Oyster, Globalization Partners, Papaya Global) — Deel está hardcoded en su handler.
- No existe UI de reclassification — operador no puede corregir mis-clasificaciones del histórico.
- No existe outbox event `finance.expense.economic_category_changed` v1.
- No existe reliability signal `finance.expenses.economic_category_unresolved`.
- No existe lint rule que bloquee callsites legacy de `expense_type` para análisis económico.
- KPIs cash-out, cash-in, dashboard/pnl, finance/intelligence siguen leyendo `expense_type` para bucket económico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + columna `economic_category` aditiva (cero side effects)

- Migration `ALTER TABLE greenhouse_finance.expenses ADD COLUMN economic_category TEXT` (nullable initially).
- Migration `ALTER TABLE greenhouse_finance.income ADD COLUMN economic_category TEXT` (nullable initially).
- Partial indexes para reliability signal performance: `CREATE INDEX expenses_economic_category_unresolved_idx ON greenhouse_finance.expenses (created_at) WHERE economic_category IS NULL` (idem income).
- Tipo TS canónico `EconomicCategory` union en `src/lib/finance/economic-category/types.ts`. 9 valores: `labor_cost_internal | labor_cost_external | vendor_cost | regulatory_payment | tax | financial_cost | overhead | financial_settlement | other`.
- DB types regenerados (`pnpm db:generate-types`).
- Lookup tables seed: `greenhouse_finance.known_regulators` (Previred, Mutual de Seguridad, AFP*, SII, FONASA, ISAPRE*, Mutual CChC) con regex match patterns. `greenhouse_finance.known_payroll_vendors` (Deel, Remote, Velocity Global, Oyster, Globalization Partners, Papaya Global, Multiplier) con regex match patterns. Ambas tablas seedeadas en migration.
- Tests TS para tipos + tabla seed validation.

### Slice 2 — Resolver canónico `resolveEconomicCategory()` + rules engine declarativo

- `src/lib/finance/economic-category/resolver.ts` con firma:
  ```ts
  export const resolveEconomicCategory = async (input: {
    beneficiaryName?: string | null
    beneficiaryRut?: string | null
    beneficiaryMemberId?: string | null
    beneficiaryIdentityProfileId?: string | null
    beneficiarySupplierId?: string | null
    documentType?: string | null  // 'invoice' | 'receipt' | 'transfer' | ...
    sourceKind?: string | null  // 'manual' | 'bank_statement' | 'payroll_system' | 'deel_integration' | ...
    rawDescription?: string | null
    accountingType?: string | null  // hint, no autoritativo
    amount?: number | null
    currency?: string | null
  }): Promise<{
    category: EconomicCategory
    confidence: 'high' | 'medium' | 'low' | 'manual_required'
    matchedRule: string  // identifier de la regla que ganó
    evidence: Record<string, unknown>  // qué triggered the match (audit trail)
  }>
  ```
- `src/lib/finance/economic-category/rules.ts` con 8 rules ordenadas (first-match wins):
  1. `IDENTITY_MATCH_INTERNAL_MEMBER` — beneficiaryRut/email match `team_members` con employment_type `internal` → `labor_cost_internal` (high)
  2. `IDENTITY_MATCH_EXTERNAL_CONTRACTOR` — beneficiaryRut/email match `team_members` con employment_type `contractor`/`international` → `labor_cost_external` (high)
  3. `KNOWN_PAYROLL_VENDOR` — beneficiaryName regex match `known_payroll_vendors` table → `labor_cost_external` (high)
  4. `KNOWN_REGULATOR` — beneficiaryName regex match `known_regulators` table → `regulatory_payment` (high)
  5. `RAW_DESCRIPTION_HINT` — rawDescription regex match patterns ("PAGO PREVIRED", "PAGO SII", "Transf.Internet a [RUT match team_members]") → applied category (medium)
  6. `ACCOUNTING_TYPE_TRANSPARENT_MAP` — accountingType `tax` → `tax`, `social_security` → `regulatory_payment`, `financial_cost` → `financial_cost` (medium-high; trust legacy column when it's already specific)
  7. `ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK` — accountingType `supplier` o `bank_fee` o `miscellaneous` con baja confianza → `vendor_cost` con confidence `low` y trigger del manual queue
  8. `MANUAL_REQUIRED_FALLBACK` — todo lo demás → `other` con confidence `manual_required`
- Tests vitest exhaustivos: 30+ casos cubriendo cada rule + edge cases (rut malformado, identity profile sin team_member, regex false positives, accounting_type missing, beneficiary_member_id NULL).
- Helper auxiliar `resolveEconomicCategoryBulkBatch()` para backfill (slice 3) — toma batch de filas y resuelve N en paralelo con cache de identity lookups.

### Slice 3 — Backfill defensivo idempotente + verificación

- Migration SQL que recorre `expenses` con `economic_category IS NULL` en batches de 500, llamando al resolver TS (via función PG/PLPython si práctico, o vía endpoint admin transient si no — decisión en discovery).
- Alternativa probable y más robusta: helper Node `scripts/finance/backfill-economic-category.ts` con `--dry-run` + `--batch-size` + `--limit` que invoca el resolver TS, escribe resultado + `evidence_json` en `expenses.economic_category` + nueva tabla `economic_category_resolution_log` (audit del backfill: rule matched, confidence, timestamp, runner).
- Para `income` mismo patrón.
- Idempotente: re-corrida no toca filas con `economic_category != NULL`.
- Cap defensivo: si confidence == `manual_required`, fila se deja `economic_category=NULL` y se enqueue en `economic_category_manual_queue`. Operador resuelve via UI (slice 5).
- Verificación post-backfill: query SQL que cuenta filas con `economic_category IS NULL` post-run. Si > 0 esperado (manual queue), se documenta count en `Handoff.md`.
- Tests del script de backfill (mock resolver, idempotency, dry-run).

### Slice 4 — CHECK constraint NOT NULL post-cutover (NOT VALID + VALIDATE atomic)

- Migration `ALTER TABLE greenhouse_finance.expenses ADD CONSTRAINT expenses_economic_category_required_after_cutover CHECK (economic_category IS NOT NULL OR created_at < '2026-XX-XX 00:00:00+00') NOT VALID`. Cutover_date pinned al timestamp de close-of-backfill (slice 3).
- Si `economic_category_manual_queue` está vacío post-backfill (caso esperado para Greenhouse pequeño): `ALTER TABLE ... VALIDATE CONSTRAINT` atomic en la misma migration.
- Si manual queue > 0: VALIDATE diferido a migration posterior dentro del mismo slice 5 (post-resolución manual via UI).
- Idem para `income`.
- Atomic per CLAUDE.md TASK-708/728/766 pattern.
- Trigger PG anti-bypass: `expenses_economic_category_anti_bypass_trigger` BEFORE INSERT/UPDATE que rechaza filas post-cutover sin `economic_category` poblado, redundante con CHECK pero defensa in depth (mismo patrón TASK-765 anti-zombie trigger).
- Tests SQL del trigger.

### Slice 5 — Hint engine en bank reconciler + canonical writers

- Migration de los 6+ canonical writers para llamar a `resolveEconomicCategory()` en INSERT:
  - `src/lib/finance/expense-payments/record.ts` (`recordExpensePayment`)
  - `src/lib/finance/reconciliation/create-expense-from-statement.ts`
  - `src/lib/finance/payroll/materialize-expenses.ts` (`materializePayrollExpensesForExportedPeriod`)
  - `src/lib/integrations/deel/expense-handler.ts` (Deel ya etiqueta payroll, ahora también `labor_cost_external`)
  - `src/app/api/finance/expenses/route.ts` (POST manual)
  - `src/lib/finance/factoring/proceeds-recorder.ts` (income side simétrico)
  - Cualquier otro writer detectado en discovery.
- Bank reconciler: hint engine inline que lee description raw + match contra `team_members.full_name`/`rut` + match contra `known_regulators` + match contra `known_payroll_vendors`. Si confidence `high` → escribe directo. Si `medium`/`low` → enqueue en manual queue + escribe con la mejor categoría candidata (pre-aprobación operador).
- Tests integration: cada writer test verifica que `economic_category` se persiste correctamente.
- Tests anti-regresión: snapshot test que enumera 14+ INSERT sites (replica TASK-765 universal column-parity test pattern) y verifica que TODOS poblan `economic_category`. Cualquier nuevo INSERT site sin la columna rompe build.

### Slice 6 — Reclassification UI + capability granular + outbox audit

- Capability nueva `finance.expenses.reclassify_economic_category` en `src/config/entitlements-catalog.ts`. Reservada FINANCE_ADMIN + EFEONCE_ADMIN. Mismo patrón TASK-742/765/766 (least-privilege).
- Endpoint `PATCH /api/admin/finance/expenses/[id]/economic-category`:
  - Auth gate `requireAdminTenantContext` + `can(tenant, 'finance.expenses.reclassify_economic_category', 'update', 'tenant')`.
  - Body validation: `{ economicCategory: EconomicCategory, reason: string (min 10 chars), bulkContext?: string }`.
  - Audit log append-only: nueva tabla `expenses_economic_category_audit` con `(audit_id, expense_id, prev_category, next_category, reason, actor_user_id, changed_at, bulk_context)`. Trigger anti-update/delete (mirror TASK-765 audit pattern).
  - Outbox event `finance.expense.economic_category_changed` v1: `{ eventVersion: 'v1', expenseId, previousCategory, newCategory, reason, actorUserId, changedAt }`. Documented en `GREENHOUSE_EVENT_CATALOG_V1.md`.
  - Tests (8+ casos): auth gates, capability check, validation, happy path, audit trigger, outbox publish, idempotency.
- Endpoint `POST /api/admin/finance/expenses/economic-category/bulk-reclassify` para operaciones bulk (e.g. todos los pagos a Daniela del histórico → `labor_cost_external`). Mismo gate + capability + audit + outbox per-row.
- UI dialog `EconomicCategoryReclassifyDialog.tsx` integrado en `/finance/expenses` (single-row CTA + bulk mode con filter + select). Patrón Vuexy + `greenhouse-ux-writing` skill compliance + microcopy via `getMicrocopy()`. Reason field obligatorio. Confirmation step.
- UI banner en `/admin/finance/data-quality/economic-category-queue` listando filas en `economic_category_manual_queue` con CTA "Resolver" → invoca el dialog.
- Tests E2E Playwright (1 test happy path + 1 test bulk) — mode `synthetic` con fixture data.

### Slice 7 — VIEWs canónicas extendidas + helpers + reliability signals

- Migration `CREATE OR REPLACE VIEW greenhouse_finance.expense_payments_normalized` agregando JOIN a `expenses.economic_category` + columna `economic_category` en la VIEW. Idem `income_payments_normalized`.
- `src/lib/finance/expense-payments-reader.ts` y `income-payments-reader.ts` extendidos:
  - `sumExpensePaymentsClpForPeriod` retorna shape extendido con breakdown por `economic_category`: `{ totalClp, totalPayments, unreconciledCount, byEconomicCategory: { labor_cost_internal, labor_cost_external, vendor_cost, regulatory_payment, tax, financial_cost, overhead, financial_settlement, other }, driftCount, economicCategoryUnresolvedCount }`.
  - Backwards-compatible: campos legacy `supplierClp`/`payrollClp`/`fiscalClp` se mantienen pero **se computan vía `economic_category`** (con mapping documented: payrollClp = labor_cost_internal + labor_cost_external; fiscalClp = tax + regulatory_payment; supplierClp = vendor_cost; etc.).
  - Lint rule custom override aplicable a los 2 readers canónicos exclusivamente.
- 2 reliability signals nuevos:
  - `finance.expenses.economic_category_unresolved` (kind=drift, severity=error si count>0, steady=0). Reader: count `WHERE economic_category IS NULL`.
  - `finance.income.economic_category_unresolved` (idem).
  - Subsystem rollup: `Finance Data Quality`.
  - Documentados en `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.
- Tests vitest (10+ casos): VIEW shape, helper breakdown, drift detection, reliability signal severity rollup.

### Slice 8 — Migración exhaustiva de consumers analíticos al campo nuevo + lint rule

- Lint rule `eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs` modo `error` que detecta:
  - SQL embedido con `expense_type IN ('payroll', 'social_security', ...)` para análisis económico.
  - SQL embedido con `WHERE expense_type = 'supplier'` en consumers de KPIs/dashboards/cost attribution.
  - TS code que ramifica logic por `expense_type` para cómputo de bucket económico.
  - Override block aplicable solo a:
    - SII/regulatorio reports (pueden y deben usar `accounting_type`).
    - El resolver mismo (`src/lib/finance/economic-category/resolver.ts`).
    - Tests del resolver.
- Tests RuleTester: 10+ casos válidos (uses `economic_category`) + 10+ inválidos (uses `expense_type` for analytics).
- Migración exhaustiva de 8+ endpoints/lib analíticos detectados en discovery:
  - `/api/finance/cash-out` (ya migrado a `economic_category` breakdown)
  - `/api/finance/cash-in`
  - `/api/finance/dashboard/{pnl,summary,cashflow}`
  - `/api/finance/expenses/summary`
  - `/api/finance/income/summary`
  - `src/lib/commercial-cost-attribution/...`
  - `src/lib/ico/...` (cost-per-FTE)
  - `src/lib/finance/budget/...` (TASK-178 readiness)
  - `src/lib/finance/p-and-l/...`
  - `src/lib/finance/member-loaded-cost/...` (TASK-710-713 readiness)
  - Reliability dashboards.
- Tests anti-regresión por endpoint (replica patrón TASK-766 slice 4).
- Reliability dashboard UI surface el breakdown por `economic_category` en lugar de mezclar.

### Slice 9 — Docs canónicos + governance final

- CLAUDE.md sección nueva "Finance — Economic Category Dimension Invariants (TASK-768)" con:
  - Decision tree para nuevos consumers (analítico → `economic_category`; fiscal/SII → `accounting_type`).
  - 8+ reglas duras (NUNCA recomputar inline, NUNCA modificar `accounting_type`, NUNCA bypass del resolver, etc.).
  - Lista de helpers canónicos.
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta nuevo con causa raíz, resolución arquitectónica, contrato, diagram dimensional.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta con 2 signals nuevos.
- `GREENHOUSE_EVENT_CATALOG_V1.md` Delta con `finance.expense.economic_category_changed` v1 + `finance.income.economic_category_changed` v1.
- `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` Delta extendiendo consumer obligations al dimensión categórica (no solo al dimensión CLP).
- `docs/documentation/finance/categoria-economica-de-pagos.md` — doc funcional (lenguaje simple) sobre cómo Greenhouse clasifica pagos económicamente vs contablemente.
- `docs/manual-de-uso/finance/reclasificar-pagos-categoria-economica.md` — manual operador para usar la UI de reclassification.
- ISSUE-065 en `docs/issues/resolved/` documentando el descubrimiento del 2026-05-03 + resolución vía TASK-768. Misma forma que ISSUE-064 ↔ TASK-766.

## Out of Scope

- **NO** modificar `expense_type` (legacy `accounting_type`) histórico — preservado intacto para fines fiscales/SII. Cualquier reclassification del operador via UI cambia SOLO `economic_category`.
- **NO** mover lógica de SII/Chile tax (TASK-529, TASK-530, TASK-531, TASK-532, TASK-533) a `economic_category` — eso vive sobre `accounting_type` correctamente.
- **NO** introducir lente read-time (descartado en discovery — viola single source of truth).
- **NO** machine learning ni LLM-based classification en Slice 1-9. Rules engine determinístico solamente. Si emerge necesidad de ML, follow-up TASK separada.
- **NO** sincronizar bidireccional con HubSpot ni Nubox para `economic_category` — esa dimensión es interna a Greenhouse. HubSpot/Nubox siguen viendo `accounting_type`.
- **NO** modificar saldos bancarios ni `account_balances` — esa dimensión es ortogonal y ya cuadra. TASK-768 cero impacto en cash flow.
- **NO** afectar P&L histórico — los KPI rollups cambian de bucket, no de total. Total pagado canónico ($11.546.493 abril 2026) sigue siendo el mismo; solo cambia cómo se distribuye entre buckets.

## Detailed Spec

### Schema dimensional final (post-TASK-768)

```sql
-- expenses (post-task-768)
CREATE TABLE greenhouse_finance.expenses (
  expense_id              TEXT PRIMARY KEY,
  -- ...todas las columnas existentes...

  -- Dimensión taxonómica fiscal/contable (legacy, preservada)
  expense_type            TEXT NOT NULL,  -- enum: supplier | payroll | social_security | tax | miscellaneous | financial_cost | bank_fee
                                          -- Semántica: "qué es esto desde la perspectiva del SII / contabilidad / regulatorio".
                                          -- Lo lee: P&L tributario, SII reports, IVA engine (TASK-532), VAT ledger (TASK-533).

  -- Dimensión analítica/operativa (nueva — TASK-768)
  economic_category       TEXT,  -- enum: labor_cost_internal | labor_cost_external | vendor_cost | regulatory_payment |
                                 -- tax | financial_cost | overhead | financial_settlement | other.
                                 -- Semántica: "qué representa esto desde la perspectiva económica/operativa de Greenhouse".
                                 -- Lo lee: KPIs cash-out/in, P&L gerencial, ICO engine, member loaded cost, allocations, dashboards.
                                 -- NULLABLE pre-cutover; CHECK NOT NULL post-cutover.

  CONSTRAINT expenses_economic_category_required_after_cutover
    CHECK (economic_category IS NOT NULL OR created_at < '2026-XX-XX 00:00:00+00')
);

CREATE INDEX expenses_economic_category_unresolved_idx
  ON greenhouse_finance.expenses (created_at)
  WHERE economic_category IS NULL;
```

### Mapping accounting × economic (no es 1:1)

| `accounting_type` | `economic_category` posibles | Ejemplo |
|---|---|---|
| `payroll` | `labor_cost_internal` | Nómina ECG Chile (Luis, Humberly) |
| `supplier` | `labor_cost_external` | Pagos a Deel/Global66/transferencia directa a colaborador internacional |
| `supplier` | `vendor_cost` | Suscripciones SaaS (Adobe, Vercel, Anthropic, Notion) |
| `supplier` | `overhead` | Servicios profesionales (Beeconta, contadora) |
| `bank_fee` | `regulatory_payment` | Pago Previred via transferencia automatizada (legacy) |
| `bank_fee` | `financial_cost` | Comisiones bancarias reales (FX fees, transfer fees) |
| `bank_fee` | `labor_cost_external` | FX fee asociado al pago internacional de nómina |
| `tax` | `tax` | Pagos SII directos (IVA, F29, retenciones) |
| `social_security` | `regulatory_payment` | Cotizaciones previsionales |
| `financial_cost` | `financial_cost` | Cuotas créditos, intereses |
| `miscellaneous` | `other` | Caso fallback (debería ser raro post-cutover) |

### Rules engine ordenado (first-match wins, declarative)

```ts
// src/lib/finance/economic-category/rules.ts (pseudocode)

export const RULES: EconomicCategoryRule[] = [
  {
    id: 'IDENTITY_MATCH_INTERNAL_MEMBER',
    confidence: 'high',
    match: async ({ beneficiaryRut, beneficiaryIdentityProfileId }) => {
      const member = await lookupTeamMemberByRutOrIdentity({ beneficiaryRut, beneficiaryIdentityProfileId })
      if (!member) return null
      if (member.employment_type === 'internal') return { category: 'labor_cost_internal' }
      return null
    }
  },
  {
    id: 'IDENTITY_MATCH_EXTERNAL_CONTRACTOR',
    confidence: 'high',
    match: async ({ beneficiaryRut, beneficiaryIdentityProfileId }) => {
      const member = await lookupTeamMemberByRutOrIdentity({ beneficiaryRut, beneficiaryIdentityProfileId })
      if (!member) return null
      if (['contractor', 'international', 'deel_managed'].includes(member.employment_type)) {
        return { category: 'labor_cost_external' }
      }
      return null
    }
  },
  {
    id: 'KNOWN_PAYROLL_VENDOR',
    confidence: 'high',
    match: async ({ beneficiaryName }) => {
      if (!beneficiaryName) return null
      const vendor = await lookupKnownPayrollVendor(beneficiaryName)
      return vendor ? { category: 'labor_cost_external' } : null
    }
  },
  {
    id: 'KNOWN_REGULATOR',
    confidence: 'high',
    match: async ({ beneficiaryName, rawDescription }) => {
      const regulator = await lookupKnownRegulator(beneficiaryName, rawDescription)
      return regulator ? { category: 'regulatory_payment' } : null
    }
  },
  {
    id: 'RAW_DESCRIPTION_HINT',
    confidence: 'medium',
    match: ({ rawDescription }) => {
      if (!rawDescription) return null
      // "Transf.Internet a 27.836.817-3" → extraer RUT, lookup team_members
      const rutMatch = rawDescription.match(/\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b/)
      if (rutMatch) {
        return { category: 'labor_cost_internal', secondary_lookup: { kind: 'rut', value: rutMatch[0] } }
      }
      return null
    }
  },
  {
    id: 'ACCOUNTING_TYPE_TRANSPARENT_MAP',
    confidence: 'high',
    match: ({ accountingType }) => {
      const map = { tax: 'tax', social_security: 'regulatory_payment', financial_cost: 'financial_cost' }
      return map[accountingType] ? { category: map[accountingType] } : null
    }
  },
  {
    id: 'ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK',
    confidence: 'low',
    match: ({ accountingType }) => {
      if (['supplier', 'bank_fee', 'miscellaneous'].includes(accountingType ?? '')) {
        return { category: 'vendor_cost', enqueue_manual: true }
      }
      return null
    }
  },
  {
    id: 'MANUAL_REQUIRED_FALLBACK',
    confidence: 'manual_required',
    match: () => ({ category: 'other', enqueue_manual: true })
  }
]
```

### Outbox event v1

```ts
type FinanceExpenseEconomicCategoryChangedV1 = {
  eventVersion: 'v1'
  expenseId: string
  previousCategory: EconomicCategory | null  // null si era pre-backfill
  newCategory: EconomicCategory
  reason: string
  bulkContext: string | null  // si fue bulk reclassify
  matchedRule: string | null  // si fue auto-resolved
  confidence: 'high' | 'medium' | 'low' | 'manual'
  actorUserId: string
  changedAt: string
}
```

### Reliability signal canónico

```ts
{
  signalKey: 'finance.expenses.economic_category_unresolved',
  kind: 'drift',
  severityRule: count => count > 0 ? 'error' : 'ok',
  steadyValue: 0,
  reader: getExpensesEconomicCategoryUnresolvedSignal,
  subsystemId: 'finance_data_quality',
  rollupBehavior: 'count > 0 → subsystem error → /api/admin/platform-health.safeMode.financeReadSafe = false'
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Columna `economic_category` agregada a `expenses` + `income` con tipo TS canónico exhaustivo (9 valores).
- [ ] CHECK constraint `*_economic_category_required_after_cutover` aplicado y `convalidated=true` en ambas tablas.
- [ ] Trigger PG anti-bypass instalado y testeado.
- [ ] Backfill 100% completo (`COUNT(*) WHERE economic_category IS NULL` = 0 o documentado en manual queue con razón).
- [ ] Manual queue resuelta (filas pre-cutover con confidence `manual_required` clasificadas via UI por operador antes del cutover).
- [ ] Resolver canónico TS con 8 rules + 30+ tests cubriendo cada rule + edge cases.
- [ ] 6+ canonical writers populan `economic_category` en INSERT. Universal column-parity test detecta cualquier nuevo writer sin la columna.
- [ ] Bank reconciler hint engine resuelve correctamente al menos los casos del incidente: Daniela España, Andrés Colombia, Valentina, Humberly transferencia, Previred (cross-check con SQL post-deploy en dev).
- [ ] Endpoint admin `PATCH /api/admin/finance/expenses/[id]/economic-category` funcional con auth + capability + audit + outbox.
- [ ] Endpoint admin bulk reclassify funcional.
- [ ] UI `EconomicCategoryReclassifyDialog.tsx` integrado en `/finance/expenses` (single + bulk).
- [ ] UI manual queue surface en `/admin/finance/data-quality/economic-category-queue`.
- [ ] VIEWs `expense_payments_normalized` + `income_payments_normalized` extendidas con `economic_category`.
- [ ] Helpers `sumExpensePaymentsClpForPeriod` + `sumIncomePaymentsClpForPeriod` retornan breakdown `byEconomicCategory` (9 keys).
- [ ] Backwards-compat preservada: campos legacy `payrollClp`/`supplierClp`/`fiscalClp` se computan via `economic_category` mapping documented.
- [ ] 2 reliability signals nuevos (`expenses.economic_category_unresolved` + `income.economic_category_unresolved`) en `RELIABILITY_REGISTRY` con steady=0.
- [ ] Lint rule `greenhouse/no-untokenized-expense-type-for-analytics` modo `error` detectando 4+ patrones. Override block para SII/regulatorio + resolver mismo.
- [ ] 8+ endpoints analíticos migrados al breakdown por `economic_category`.
- [ ] CLAUDE.md sección nueva agregada.
- [ ] 4 architecture docs con Delta 2026-XX-XX.
- [ ] Doc funcional + manual de uso creados.
- [ ] ISSUE-065 documentado y resuelto.
- [ ] **KPI Nómina cash-out abril 2026 muestra `labor_cost_internal + labor_cost_external` ≈ $4.5M** (vs $1.43M pre-fix). Total pagado canónico SIGUE siendo $11.546.493 (cero impacto en saldos).
- [ ] Verificación final: `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` todos verdes. `pnpm pg:doctor` healthy.

## Verification

- `pnpm lint` (incluye nueva rule `no-untokenized-expense-type-for-analytics`)
- `pnpm tsc --noEmit`
- `pnpm test` (target: 80+ tests nuevos cubriendo resolver + writers + endpoint + reliability + lint)
- `pnpm migrate:status` (4+ migrations TASK-768 aplicadas)
- `pnpm pg:doctor`
- `pnpm pg:connect:shell` + queries:
  - `SELECT COUNT(*) FROM greenhouse_finance.expenses WHERE economic_category IS NULL` = 0 (post-cutover)
  - `SELECT economic_category, COUNT(*), SUM(total_amount_clp) FROM greenhouse_finance.expenses GROUP BY economic_category` (verificar distribución sane)
  - Reliability signals query (verificar steady=0)
- Verificación manual en `/finance/cash-out` post-deploy: KPI Nómina ≈ $4.5M para abril 2026, Proveedores baja en proporción, Total pagado se mantiene en $11.5M.
- Verificación en `/admin/finance/data-quality/economic-category-queue`: 0 filas pendientes (todas resueltas).
- Smoke test del endpoint admin (auth + capability + audit + outbox via `pnpm staging:request`).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomar, `complete` al cerrar).
- [ ] El archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con resumen del cierre + diff de KPI Nómina antes/después + count del manual queue post-backfill.
- [ ] `changelog.md` con entry visible.
- [ ] Chequeo de impacto cruzado: TASK-178 (Budget Engine), TASK-708/728 (CHECK pattern reuse), TASK-710-713 (Member Loaded Cost), TASK-080 (ICO Engine), TASK-705/706 (Cost Attribution), TASK-484 (FX), TASK-742 (capabilities), TASK-766 (paired contract). Actualizar Delta de cada una si la solución cierra un gap downstream.
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` con `finance.expense.economic_category_changed` v1 + `finance.income.economic_category_changed` v1.
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con Delta + diagram dimensional `accounting_type` × `economic_category`.
- [ ] `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` con 2 signals nuevos.
- [ ] `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` con consumer obligations extendidas a dimensión categórica.
- [ ] CLAUDE.md sección nueva "Finance — Economic Category Dimension Invariants (TASK-768)".
- [ ] PR mergeada a `develop`. Production rollout staged (cutover constraint solo dispara post-backfill complete).
- [ ] ISSUE-065 creado en `docs/issues/resolved/` documentando el descubrimiento del 2026-05-03 (KPI Nómina sub-counted by $3M+) + resolución vía TASK-768.

## Follow-ups

- **TASK-derivada Auditoría BigQuery cross-domain** — dashboards y reports BQ probablemente comparten el patrón legacy `expense_type` para análisis. Migrar a `economic_category` en data warehouse.
- **TASK-derivada ML/LLM-based classification** — si las rules deterministicas tienen tasa de "manual_required" > 5%, evaluar fine-tuning de un modelo o uso de LLM con grounding al rules engine como fallback.
- **TASK-derivada Cross-currency cost-of-payroll allocation** — los FX fees de payroll internacional deberían potencialmente ser allocated al costo del miembro específico (Daniela / Andrés) en lugar de overhead. Decisión de modelado, no urgente.
- **TASK-derivada Cost-by-business-unit lens** — extender el resolver para inferir `business_unit` además de `economic_category` (ICO Performance, Branding, Dev). Nuevo dimension level.
- **TASK-derivada Income economic_category sweep** — TASK-768 introduce la columna en `income` pero el ROIC del trabajo está en expenses. Si emerge mis-classification visible en revenue dashboards, sweep equivalente.

## Open Questions

Las siguientes decisiones se cerrarán durante Discovery (Plan Mode), antes de empezar Slice 1:

- **Q1 — `EconomicCategory` enum: 9 valores propuestos suficientes?** Lista actual: `labor_cost_internal | labor_cost_external | vendor_cost | regulatory_payment | tax | financial_cost | overhead | financial_settlement | other`. ¿Agregar `marketing_spend`? `client_reimbursement`? `intercompany_transfer`? Decidir antes de Slice 1 ya que el enum es backwards-incompatible una vez deployado.
- **Q2 — Ubicación del backfill: SQL function vs Node script vs admin endpoint transient?** SQL function (PG) es más rápido pero requiere PLPython o función PL/pgSQL con regex. Node script (slice 3) es más maintainable pero más lento. Admin endpoint transient (run via curl from operator) es híbrido. Decisión per cost/maintainability tradeoff.
- **Q3 — Cutover_date del CHECK constraint: pinned o derivado del backfill?** Mismo patrón TASK-708/728/766 (derivado, atomic VALIDATE post-backfill clean). Confirmar.
- **Q4 — Lookup tables `known_regulators` + `known_payroll_vendors`: schema en `greenhouse_finance` o `greenhouse_core`?** Argumentos por ambos. Decisión per ownership (probable: `greenhouse_finance` ya que solo Finance las consume).
- **Q5 — `accounting_type` rename del `expense_type` legacy: lo hacemos en este task o follow-up?** Renombrar es invasivo (afecta dashboards SQL ad-hoc, BQ exports, types.d.ts). Mi propuesta: NO renombrar en TASK-768; documentar el alias semántico en CLAUDE.md y rename como TASK derivada cuando la dimensión esté madura.
- **Q6 — Mode lint rule: `error` desde commit-1 (mismo pattern TASK-766) o `warn` durante migración (TASK-265 pattern)?** Mi propuesta: `error` from commit-1, ya que CHECK constraint asegura que post-cutover no hay rows sin clasificar — un callsite legacy de `expense_type` para análisis no produciría drift de dato pero sí producirá KPI sesgado. Tolerancia cero.

## Open Question — Symmetric income classification

**Q7 — Símetrico para `income.income_type`?** El task scope incluye `income.economic_category` aditivo. ¿Hay mis-clasificación equivalente del lado revenue? Pre-discovery: probable que sí (reembolsos clasificados como `service_revenue` o viceversa). Decisión final post-Discovery.
