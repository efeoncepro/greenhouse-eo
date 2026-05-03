# Greenhouse EO — Finance Economic Category Dimension V1

> **Spec canónica del modelo dimensional analítico/operativo separado de la taxonomía fiscal en el dominio Finance.**
>
> Versión: `1.0`
> Estado: `vigente`
> Creada: `2026-05-03` por TASK-768
> Cierra: ISSUE-065 (KPI Nómina abril 2026 sub-counted ~$3M por dimension conflate en `expense_type`)

---

## 0. Resumen ejecutivo

Greenhouse Finance opera con **dos dimensiones legítimamente ortogonales** sobre cada expense / income:

1. **Taxonomía fiscal/SII** (`expense_type` legacy, alias `accounting_type`) — para SII, IVA engine, VAT ledger, chile-tax, contabilidad regulatoria.
2. **Categoría económica/operativa** (`economic_category` nueva — TASK-768) — para KPIs, ICO Engine, P&L gerencial, Member Loaded Cost, Budget Engine, Cost Attribution, dashboards.

Hasta TASK-768, ambas dimensiones estaban **conflate en una sola columna** (`expense_type`), lo que sesgaba el rollup analítico downstream cuando un pago económicamente-payroll caía en bucket fiscal-supplier (caso real abril 2026: ~$3M en pagos a colaboradores internacionales y previsionales clasificados como Proveedor).

Esta spec define el **modelo dimensional canónico**, el **clasificador automático**, el **diccionario extensible**, las **5 capas de defensa anti-regresión**, las **herramientas operativas para reclasificación**, y el **contrato downstream con programas analíticos** (Budget, Member Loaded Cost, ICO, Cost Attribution).

Todo lo construido en TASK-768 es **infraestructura permanente del portal**, no fix puntual del KPI Nómina.

---

## 1. Por qué existe la separación dimensional

### 1.1 El problema arquitectónico

`expense_type` y `income_type` servían a dos masters semánticos contradictorios:

- **Fiscal/SII**: lo que la expense ES desde la perspectiva tributaria (factura proveedor, recibo, impuesto, previsional). Lo lee VAT engine (TASK-532), IVA ledger (TASK-533), SII reports, chile-tax (TASK-529-531).
- **Analítico/operativo**: lo que la expense REPRESENTA desde la perspectiva económica de Greenhouse (gasto labor interno, externo, vendor SaaS, regulatorio, comisión bancaria real, etc.). Lo necesita P&L gerencial, ICO, KPIs cash-out, member loaded cost, budget engine, cost attribution.

A veces coincidían. **Frecuentemente NO**. Caso crítico recurrente:

- Pago a Deel Inc. → fiscalmente `supplier` (Deel emite factura a Greenhouse) → económicamente `labor_cost_external` (Deel paga a Melkin como costo labor).
- Pago a Daniela Toro vía Global66 → fiscalmente `supplier` (Global66 fintech) → económicamente `labor_cost_external` (es nómina internacional directa).
- Pago a Previred → fiscalmente `bank_fee` (transferencia automatizada legacy) → económicamente `regulatory_payment` (cotización previsional).
- FX fee Global66 al enviar a Andrés Colombia → fiscalmente `bank_fee` → económicamente `labor_cost_external` (cost-of-payroll internacional).

El bank reconciler defaulteaba `expense_type='supplier'` cuando ingestaba transacciones bancarias sin metadata para inferir naturaleza payroll → ~$3M abril 2026 mal-clasificados sistémicamente. **Bug arquitectónico, no de un endpoint.**

### 1.2 Por qué NO una lente read-time

Antes de TASK-768 se evaluó (y descartó) una lente derivada read-time que computara `economic_category` desde `expense_type` + lookups al momento de cada query analítica. Razones del descarte:

| Razón | Detalle |
|---|---|
| No ataca causa raíz | Bank reconciler seguiría escribiendo bucket equivocado; lente compensaría eternamente. |
| Source of truth dividida | SQL ad-hoc, BigQuery exports, Sentry payloads verían `expense_type` legacy; lente solo en helper. |
| Auditabilidad pobre | Sin trail de cuándo/por qué/quién decidió que un pago es payroll. |
| Performance | JOIN read-time contra `team_members` + `identity_profiles` + known-providers en cada KPI request. |
| Blast radius | Cruza P&L, ICO, Member Loaded Cost, Budget — todos consumirían lente; mantenibilidad pobre. |

La solución correcta es **separación write-time + persistencia + audit**: una columna nueva poblada en INSERT, con audit log inmutable y reclassification UI.

---

## 2. Modelo dimensional canónico

### 2.1 Schema separation

```sql
-- greenhouse_finance.expenses (post-TASK-768)
expense_type        TEXT NOT NULL  -- legacy, fiscal/SII (NO se modifica)
economic_category   TEXT           -- nueva, analítica/operativa (NULLABLE inicial; CHECK NOT NULL post-cleanup)

-- greenhouse_finance.income (mirror)
income_type         TEXT NOT NULL  -- legacy
economic_category   TEXT           -- mirror
```

Ambas dimensiones coexisten en la misma fila. Cero sobrescritura.

### 2.2 Enum canónico para `expenses.economic_category`

11 valores:

| Valor | Cuándo aplica |
|---|---|
| `labor_cost_internal` | Nómina chilena interna (employees ECG con employment_type='internal') |
| `labor_cost_external` | Nómina internacional via Deel/Remote/Velocity Global; transferencias directas a contractors fuera de Chile |
| `vendor_cost_saas` | Suscripciones SaaS (Adobe, Vercel, Notion, Anthropic, OpenAI, GitHub) |
| `vendor_cost_professional_services` | Servicios profesionales contratados (contadora, asesoría legal, consultoría) |
| `regulatory_payment` | Previred, AFP, Mutual de Seguridad, Isapre, FONASA, TGR, Dirección del Trabajo |
| `tax` | IVA, F29, retenciones SII directas |
| `financial_cost` | Intereses créditos, cuotas préstamos, factoring fees |
| `bank_fee_real` | Comisiones bancarias operativas reales (mantención, comisión transfer local) |
| `overhead` | Costos generales no atribuibles |
| `financial_settlement` | Settlements internos (placeholder para wallets/loans/factoring futuros) |
| `other` | Fallback explícito; emite reliability signal si count > 0 |

### 2.3 Enum canónico para `income.economic_category`

8 valores:

| Valor | Cuándo aplica |
|---|---|
| `service_revenue` | Default razonable; ingreso por servicios facturados |
| `client_reimbursement` | Reembolso de cliente por gasto pre-aprobado |
| `factoring_proceeds` | Anticipos de factoring (TASK-571 settlement) |
| `partner_payout_offset` | Cuando un partner cobra directo al cliente y nos transfiere parte |
| `internal_transfer_in` | Transferencias internas entre cuentas Greenhouse |
| `tax_refund` | Devolución SII / IVA refund |
| `financial_income` | Intereses ganados, rendimientos de inversión |
| `other` | Fallback |

### 2.4 Mapping fiscal × económica

No es 1:1. Un mismo `expense_type` puede mapear a múltiples `economic_category`:

| `accounting_type` (legacy) | `economic_category` posibles | Ejemplo |
|---|---|---|
| `payroll` | `labor_cost_internal` | Nómina ECG Chile (Luis, Humberly) |
| `supplier` | `labor_cost_external` | Pago a Deel/Global66/colaborador internacional |
| `supplier` | `vendor_cost_saas` | Suscripciones (Adobe, Vercel, Anthropic, Notion) |
| `supplier` | `vendor_cost_professional_services` | Contadora, asesores legales |
| `supplier` | `overhead` | Servicios generales no atribuibles |
| `bank_fee` | `regulatory_payment` | Pago Previred via transferencia legacy |
| `bank_fee` | `financial_cost` | Comisiones bancarias reales |
| `bank_fee` | `labor_cost_external` | FX fee asociado a payment internacional de nómina |
| `tax` | `tax` | Pagos SII directos |
| `social_security` | `regulatory_payment` | Cotizaciones previsionales |
| `financial_cost` | `financial_cost` | Cuotas créditos, intereses |
| `miscellaneous` | `other` | Caso fallback (raro post-cutover) |

---

## 3. Clasificador automático canónico

### 3.1 Topología de dos motores

Cada vez que se registra un pago, **dos motores independientes** poblan `economic_category`:

**Motor 1 — Trigger PG `populate_economic_category_default_trigger` BEFORE INSERT** (cero invasivo a 12 canonical writers existentes):

```text
expense_type='tax'             → 'tax'
expense_type='social_security' → 'regulatory_payment'
expense_type='financial_cost'  → 'financial_cost'
expense_type='bank_fee'        → 'bank_fee_real'
expense_type='payroll'         → 'labor_cost_internal'  (default; international se reclasifica)
expense_type='supplier'        → 'vendor_cost_saas'     (default; reclassify si professional_services)
expense_type='miscellaneous'   → 'other'                (low confidence)
```

Mapeo transparente, cero metadata adicional. Cubre ~80% de los casos.

**Motor 2 — Resolver canónico TS** (`src/lib/finance/economic-category/resolver.ts`) invocado explícitamente desde:
- Backfill script (`scripts/finance/backfill-economic-category.ts`)
- Reclassification endpoints (`PATCH /api/admin/finance/{expenses,income}/[id]/economic-category`)
- Futuros writers que quieran resolver con confidence alta antes del INSERT

### 3.2 Resolver canónico — 10 reglas first-match-wins

```text
1. IDENTITY_MATCH_BY_MEMBER_ID         — beneficiary ya viene resuelto a member_id
2. IDENTITY_MATCH_BY_RUT               — RUT extraído de description → lookup chain (organizations.tax_id → person_legal_entity_relationships → members)
3. IDENTITY_MATCH_BY_EMAIL             — beneficiary email → members.primary_email | email_aliases
4. IDENTITY_MATCH_BY_NAME              — fuzzy ILIKE contra members.display_name | legal_name (single-match)
5. KNOWN_PAYROLL_VENDOR_REGEX          — Deel, Remote, Velocity Global, Oyster, Globalization Partners, Papaya Global, Multiplier, Rippling Global → labor_cost_external
6. KNOWN_REGULATOR_REGEX               — Previred, SII, Mutual CChC, AFPs, Isapres, FONASA, TGR → regulatory_payment
7. SUPPLIER_LOOKUP_PARTNER             — supplier marked as partner (factoring) → financial_settlement
8. ACCOUNTING_TYPE_TRANSPARENT_MAP     — tax → tax, social_security → regulatory_payment, financial_cost → financial_cost
9. ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK  — supplier/bank_fee/miscellaneous sin más contexto → vendor_cost_saas low confidence + manual queue
10. MANUAL_REQUIRED_FALLBACK           — emit other + enqueue manual queue
```

Cada resolución retorna:

```ts
{
  category: ExpenseEconomicCategory,
  confidence: 'high' | 'medium' | 'low' | 'manual_required',
  matchedRule: string,
  evidence: Record<string, unknown>  // qué triggered the match (audit trail)
}
```

### 3.3 Decisión high vs manual queue

- `confidence === 'high' || 'medium'` → persistir directo a `expenses.economic_category`.
- `confidence === 'low' || 'manual_required'` → **NO** persistir; enqueue en `economic_category_manual_queue` con candidate_category + candidate_evidence. Operador resuelve via UI / endpoint.

Razón: tolerancia cero a clasificación incorrecta automatizada. Mejor `NULL` + queue que un default sesgado.

---

## 4. Diccionario extensible

### 4.1 `greenhouse_finance.known_regulators` (17 entries seedeadas)

Tabla declarativa con `regulator_id`, `display_name`, `match_regex` (regex POSIX case-insensitive), `jurisdiction`, `active`.

Seedeadas: Previred, SII, Mutual de Seguridad CChC, FONASA, Isapre Banmédica/Colmena/Cruz Blanca/Vida Tres, AFP Habitat/ProVida/Modelo/Capital/Cuprum/PlanVital/Uno, TGR, Dirección del Trabajo.

**Cuando emerja un regulador nuevo** (ej. Mutual de Seguridad subsidiaria, ISL, Suseso): `INSERT INTO greenhouse_finance.known_regulators (...) VALUES (...)`. Cero código nuevo.

### 4.2 `greenhouse_finance.known_payroll_vendors` (8 entries seedeadas)

Tabla declarativa con `vendor_id`, `display_name`, `match_regex`, `vendor_type`, `active`.

Seedeadas: Deel, Remote.com, Velocity Global, Oyster HR, Globalization Partners, Papaya Global, Multiplier, Rippling Global.

**Cuando emerja un nuevo vendor** (ej. Atlas, Justworks, Boundless): `INSERT INTO greenhouse_finance.known_payroll_vendors (...) VALUES (...)`. Cero código nuevo.

### 4.3 Política de extensión

- Agregar regla nueva del resolver (no transparent map, no regex match) → **requiere nueva versión del resolver TS** + tests + nuevo enum value si emerge categoría legítimamente nueva.
- Agregar entrada a lookup table existente → **solo INSERT row**.
- Agregar nueva categoría al enum (ej. `marketing_spend`) → migration con `ALTER TABLE ... DROP CONSTRAINT canonical_values; ADD CONSTRAINT ...`. Backfill explícito + Delta en esta spec.

---

## 5. Defensa-en-profundidad — 5 capas

| # | Capa | Qué evita |
|---|---|---|
| 1 | **Trigger PG `populate_default` BEFORE INSERT** | Que un nuevo pago entre con la columna vacía — todos quedan clasificados from day-1 |
| 2 | **CHECK constraint `canonical_values` (VALIDATED)** | Que alguien escriba un valor inventado o legacy fuera del enum |
| 3 | **CHECK constraint `required_after_cutover` (NOT VALID hasta cleanup)** | Que post-cutover quede una fila INSERTed sin clasificar |
| 4 | **Lint rule `no-untokenized-expense-type-for-analytics` mode `error`** | Que un dev nuevo escriba `WHERE expense_type='supplier'` en código analítico y reintroduzca el bug. Override block exime SII/VAT/operacional/resolver. |
| 5 | **Reliability signals `economic_category_unresolved` (steady=0)** | Que si algo bypassea las capas anteriores, AI Observer alerte antes que el operador note. |

**Adicional**: audit log append-only `economic_category_resolution_log` con trigger anti-update/delete (TASK-765 pattern) — historial inmutable de toda resolución para forensics.

---

## 6. Herramientas operativas

### 6.1 Endpoints admin de reclassify

```http
PATCH /api/admin/finance/expenses/{id}/economic-category
PATCH /api/admin/finance/income/{id}/economic-category
Body: { economicCategory, reason (min 10 chars), bulkContext? }
Capability: finance.{expenses,income}.reclassify_economic_category (FINANCE_ADMIN + EFEONCE_ADMIN)
```

Atomic transaction:
1. UPDATE `economic_category`
2. INSERT `economic_category_resolution_log` (matched_rule='manual_reclassify', evidence con previous_category + reason + actor + bulk_context)
3. UPDATE `economic_category_manual_queue` → status='resolved' (si pending)
4. Outbox event `finance.{expense,income}.economic_category_changed` v1 (fire-and-forget)

Idempotente: misma categoría no publica evento ni emite cambio.

### 6.2 Manual queue

`greenhouse_finance.economic_category_manual_queue`:
- `target_kind` ∈ ('expense', 'income')
- `target_id`
- `candidate_category` + `candidate_confidence` + `candidate_rule` + `candidate_evidence`
- `status` ∈ ('pending', 'resolved', 'archived')
- UNIQUE(target_kind, target_id) — un target solo puede estar pending una vez

Operador filtra por `status='pending'` para resolver (orden FIFO por created_at).

### 6.3 Backfill script

`pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-economic-category.ts [--dry-run] [--batch-size=N] [--limit=N] [--kind=expense|income|both]`

Idempotente: skip rows con `economic_category != NULL`. Reusable para futuros remediation runs (ej. cuando se agregue una categoría nueva al enum y se quiera retro-clasificar).

### 6.4 Outbox events v1

```ts
// finance.expense.economic_category_changed
type FinanceExpenseEconomicCategoryChangedV1 = {
  eventVersion: 'v1'
  expenseId: string
  previousCategory: ExpenseEconomicCategory | null
  newCategory: ExpenseEconomicCategory
  reason: string
  bulkContext: string | null
  matchedRule: string  // 'manual_reclassify' o regla del resolver
  confidence: 'manual' | 'high' | 'medium' | 'low' | 'manual_required'
  actorUserId: string
  changedAt: string
}

// finance.income.economic_category_changed (mirror)
```

Documentados en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-05-03.

### 6.5 Reliability signals canónicos

```text
finance.expenses.economic_category_unresolved
  - kind: drift
  - severity: error si count > 0, ok si count === 0
  - steady value: 0 post-cleanup
  - reader: getExpensesEconomicCategoryUnresolvedSignal
  - subsystem: finance_data_quality

finance.income.economic_category_unresolved (mirror)
```

Cualquier valor > 0 post-cutover indica trigger bypass o admin override SQL directo. AI Observer enlaza al endpoint reclassify canónico.

---

## 7. Contrato consumer downstream

### 7.1 Política consumer (regla dura)

**Ningún consumer analítico puede filtrar/agrupar por `expense_type` o `income_type` para análisis económico.** Para SII/VAT/IVA, usar la dimensión legacy es legítimo y necesario.

Enforcement mecánico: lint rule `greenhouse/no-untokenized-expense-type-for-analytics` modo `error`. Override block exime usos fiscales legítimos.

### 7.2 API de lectura canónica

```ts
import { sumExpensePaymentsClpForPeriod } from '@/lib/finance/expense-payments-reader'

const summary = await sumExpensePaymentsClpForPeriod({
  fromDate: '2026-04-01',
  toDate: '2026-04-30'
})

summary.byEconomicCategory.labor_cost_internal      // Nómina interna ECG
summary.byEconomicCategory.labor_cost_external      // Nómina internacional via Deel/Global66/etc.
summary.byEconomicCategory.regulatory_payment       // Previred + AFP + Mutual + Isapre + SII previsional
summary.byEconomicCategory.vendor_cost_saas         // Adobe, Vercel, Notion, etc.
summary.byEconomicCategory.vendor_cost_professional_services
// ... 11 keys totales

summary.economicCategoryUnresolvedCount             // alerta si > 0
```

Backwards-compat preservada: campos legacy `summary.supplierClp`, `payrollClp`, `fiscalClp` siguen retornándose (TASK-766 23 tests verdes).

### 7.3 Programas downstream desbloqueados

TASK-768 era prerequisite literal para:

| Task downstream | Cómo consume `economic_category` |
|---|---|
| **TASK-178 Budget Engine** | Variance analysis presupuesto vs actual por categoría económica (apples-to-apples comparable). |
| **TASK-710 Tool Consumption Bridge** | `tool_consumption_period.expense_id → expenses.expense_id` con filter `economic_category IN ('vendor_cost_saas', 'overhead')`. |
| **TASK-711 Member↔Tool UI** | Distingue tool cost (vendor_cost_*) de labor cost (labor_cost_internal/external) para pricing y cost attribution. |
| **TASK-712 Tool Catalog** | Categoriza tools por costo económico + provenance. |
| **TASK-713 Period Closing** | Snapshot inmutable del breakdown económico al cierre de período. |
| **TASK-080+ ICO Engine** | Cost-per-FTE canónico — denominador "costo Nómina" deja de estar sub-counted. |
| **TASK-705/706 Cost Attribution** | Allocations a clientes con dimensión económica correcta (no fiscal). |

Hasta TASK-768, ninguna podía iniciar limpiamente porque `expense_type` mezclaba dimensiones.

---

## 8. Topología de archivos canónicos

### 8.1 Schema (greenhouse_finance)

| Objeto | Path migration |
|---|---|
| Columna `expenses.economic_category` + `income.economic_category` | `migrations/20260503095632629_task-768-economic-category-column-nullable.sql` |
| Lookup tables `known_regulators` + `known_payroll_vendors` | (mismo file) |
| Audit log `economic_category_resolution_log` | `migrations/20260503101103789_...` |
| Manual queue `economic_category_manual_queue` | (mismo file) |
| Trigger `populate_economic_category_default` | `migrations/20260503104729619_...` |
| CHECK constraints `canonical_values` + `required_after_cutover` | `migrations/20260503110112356_...` |
| VIEWs canónicas extendidas | `migrations/20260503110610829_...` |

### 8.2 Module TS canónico

```text
src/lib/finance/economic-category/
  index.ts              ← public API barrel
  types.ts              ← EXPENSE_ECONOMIC_CATEGORIES + INCOME_ECONOMIC_CATEGORIES + type guards
  identity-lookup.ts    ← extractRutsFromText, lookupMemberByRut/Email/Name, lookupSupplierByRut, lookupKnownRegulator/PayrollVendor
  resolver.ts           ← resolveExpenseEconomicCategory + resolveIncomeEconomicCategory (10 reglas)
  __tests__/            ← 49 tests
```

### 8.3 Endpoints + scripts

```text
src/app/api/admin/finance/expenses/[id]/economic-category/route.ts
src/app/api/admin/finance/income/[id]/economic-category/route.ts
scripts/finance/backfill-economic-category.ts
src/lib/reliability/queries/economic-category-unresolved.ts
eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs
```

### 8.4 VIEWs canónicas (post-extensión Slice 7)

```text
greenhouse_finance.expense_payments_normalized   ← incluye e.economic_category via JOIN
greenhouse_finance.income_payments_normalized    ← incluye i.economic_category via JOIN
```

### 8.5 Helpers consumer

```text
src/lib/finance/expense-payments-reader.ts   ← sumExpensePaymentsClpForPeriod retorna byEconomicCategory
src/lib/finance/income-payments-reader.ts    ← idem mirror
```

---

## 9. Casos de uso futuros previstos

### 9.1 Wallets / loans / factoring (TASK-derivada)

Cuando emerjan tipos nuevos de payments (employee_wallet, intercompany_loan, factoring_advance), su categoría económica debería caer en valores ya canónicos:
- `labor_cost_internal/external` para wallets de colaboradores
- `financial_settlement` para intercompany_transfer / loan principal
- `financial_cost` para intereses

Si emerge una categoría legítimamente nueva (ej. `equity_payout` para distribuciones a accionistas), agregar al enum requiere migration + Delta en esta spec.

### 9.2 Multi-jurisdicción (Globe expansion)

Hoy `known_regulators` está seedeado con jurisdiction='CL'. Cuando Greenhouse opere en otras jurisdicciones (CO, MX, PE, BR, ES), agregar entries con jurisdicción correspondiente. El resolver hace match por regex independiente de jurisdiction (el regulator se asume válido si matchea).

### 9.3 Machine learning fallback

Hoy todas las reglas son determinísticas. Si la tasa de `manual_required` supera ~5% en producción sostenida, evaluar fine-tuning de un modelo o LLM con grounding al rules engine como fallback de la regla 10. Spec separada cuando emerja la necesidad.

### 9.4 BigQuery sync

VIEWs canónicas extendidas se exportan via outbox → `greenhouse_raw.postgres_outbox_events` → BQ marts (5min cron). VIEW BQ `fin_expenses_from_outbox` debe extraer `economic_category` del JSON payload. Verificación post-deploy en TASK-768 follow-up.

---

## 10. Tests y verificación

| Test | Cubre |
|---|---|
| `src/lib/finance/economic-category/__tests__/types.test.ts` | 11 — type guards exhaustivos |
| `src/lib/finance/economic-category/__tests__/resolver.test.ts` | 26 — cada regla del resolver + casos reales del incidente |
| `src/lib/finance/economic-category/__tests__/identity-lookup.test.ts` | 7 — extractRutsFromText + edge cases |
| `src/lib/finance/economic-category/__tests__/lookup-tables.test.ts` | 5 — lookup table queries |
| `src/app/api/admin/finance/expenses/[id]/economic-category/route.test.ts` | 9 — auth + capability + validation + audit + outbox + idempotency |
| `src/app/api/admin/finance/income/[id]/economic-category/route.test.ts` | 5 — mirror income |
| `eslint-plugins/greenhouse/rules/__tests__/no-untokenized-expense-type-for-analytics.test.mjs` | 11 — RuleTester valid + invalid |
| `src/lib/finance/__tests__/expense-payments-reader.test.ts` | 15 — backwards-compat TASK-766 + nuevos campos byEconomicCategory |

**Total**: 89 tests directamente del scope TASK-768. Plus 23 tests TASK-766 verdes preservados (backwards-compat). Full suite post-TASK-768: 533 files / 3003 tests verdes (+63 vs TASK-766 baseline).

---

## 11. Cosas que NO hace V1

- **NO modifica `expense_type` legacy** — preservado intacto para SII/VAT/IVA.
- **NO mueve lógica de chile-tax / VAT engine** a `economic_category` — esos siguen en `expense_type` correctamente.
- **NO sincroniza bidireccional con HubSpot/Nubox** para `economic_category` — es dimensión interna a Greenhouse.
- **NO afecta saldos bancarios** — cash flow es ortogonal a la dimensión bucket.
- **NO afecta P&L histórico** — KPI rollups cambian de bucket, no de total.
- **NO incluye UI dialog dedicada de reclassify** — operador usa endpoint admin (UI follow-up TASK derivada cuando emerja necesidad de UX dedicada).
- **NO incluye ML/LLM-based classification** — solo rules engine determinístico (V1).

---

## 12. Deltas

### Delta 2026-05-03 — V1 foundation (TASK-768)

- Foundation completa entregada en 9 slices (schema + lookup tables + types + resolver + identity helpers + backfill + audit log + manual queue + trigger PG + CHECK constraints + reclassify endpoints + capabilities granulares + outbox events v1 + audit append-only + VIEWs extendidas + helpers byEconomicCategory + reliability signals + lint rule mode error + cash-out exposure + 5 docs canónicos updated).
- Cierra ISSUE-065 (KPI Nómina abril 2026 sub-counted ~$3M).
- Bloqueantes downstream desbloqueados: TASK-178, TASK-710-713, TASK-080+, TASK-705/706.
- Verificación end-to-end: 533 files / 3003 tests verdes (+63 vs TASK-766 baseline).
- 5 migrations + 1 lint rule + 2 capabilities + 2 outbox events + 2 reliability signals + 1 trigger PG + 1 backfill script + 5 docs.

### Follow-ups esperados

- **VALIDATE post-cleanup manual queue**: una vez que el operador resuelva los 161 expenses + 19 income en `economic_category_manual_queue`, migration follow-up hará `ALTER TABLE ... VALIDATE CONSTRAINT expenses_economic_category_required_after_cutover`. Atomic.
- **UI dialog dedicado** para reclassify — TASK derivada si emerge volumen de reclassifies > 1/semana.
- **BigQuery VIEW sync** — TASK-768 follow-up para extender `fin_expenses_from_outbox` con extracción JSON de `economicCategory`.
- **Member identity lookup robustness** — si emerge tasa alta de `manual_required` por colaboradores no registrados en `members`, evaluar onboarding obligatorio pre-payment.

---

## Referencias

- Spec de tarea: [`TASK-768`](../tasks/complete/TASK-768-finance-expense-economic-category-dimension.md)
- Incidente cerrado: [ISSUE-065](../issues/resolved/ISSUE-065-kpi-nomina-mis-classification-by-expense-type-conflate.md)
- Documentación funcional: [Categoría económica de pagos](../documentation/finance/categoria-economica-de-pagos.md)
- Manual operativo: [Reclasificar pagos por categoría económica](../manual-de-uso/finance/reclasificar-pagos-categoria-economica.md)
- Patrones reusados:
  - TASK-571 (canonical reader pattern)
  - TASK-699 (consumer contract for derived columns)
  - TASK-708/728/766 (CHECK NOT VALID + VALIDATE atomic + cutover_date)
  - TASK-721 (canonical helper enforcement)
  - TASK-742/765/766 (capabilities granulares + audit + outbox)
- Module canónico: [`src/lib/finance/economic-category/`](../../src/lib/finance/economic-category/)
- CLAUDE.md sección: "Finance — Economic Category Dimension Invariants (TASK-768)"
- Bonus: CLAUDE.md sección "Database — Migration markers (anti pre-up-marker bug)"
