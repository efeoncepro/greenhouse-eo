# ISSUE-065 — KPI Nómina sub-counted por mis-clasificación en `expense_type` (dimensión conflate)

## Ambiente

production / staging / dev

## Estado

`resolved` — 2026-05-03

## Síntoma

El 2026-05-03, post-cutover TASK-766 (KPIs CLP correctos), el usuario observó que el KPI Nómina en `/finance/cash-out` mostraba **$1.030.082** para abril 2026 cuando los costos labor reales del periodo eran **~$4 millones**. Faltaban ~$3M en el bucket Nómina, infladas las dos categorías Proveedores y Bancario.

Pagos económicamente-payroll que aparecían en buckets equivocados (verificado en data viva):

| Beneficiario | Path | Monto | Mostraba | Debería |
|---|---|---|---|---|
| Daniela Toro (España) | Global66 | $1.090.731 | Proveedor | Nómina externa |
| Andrés Carlosama (Colombia) | Global66 | $688.058 | Proveedor | Nómina externa |
| Valentina Hoyos | Transfer Internet | $437.077 + $158.371 | Proveedor | Nómina externa |
| Humberly Henriquez (anticipo) | Transfer Internet | $300.000 | Proveedor | Nómina interna |
| Previred (cotizaciones) | Bank linea | $276.223 | Bancario | Regulatorio |
| FX fees Global66 | Bank fee | $46.631 + $40.045 | Bancario | Cost-of-payroll externa |

Total mis-clasificado: **~$3.037.136 CLP**.

## Causa raíz

`expense_type` y `income_type` mezclan **dos dimensiones legítimamente ortogonales** en una sola columna:

1. **Taxonomía contable/SII** (lo que es una expense desde la perspectiva fiscal — invoice de proveedor, recibo, impuesto, etc.).
2. **Categoría económica/operativa** (lo que es desde la perspectiva analítica de Greenhouse — gasto en personas, gasto en herramientas, costo regulatorio, etc.).

A veces coinciden, frecuentemente NO. Ejemplos:
- Pago a Deel Inc. → **fiscalmente** es proveedor (factura Deel a Greenhouse), **económicamente** es nómina (paga a Melkin como costo labor para Greenhouse).
- Pago FX fee Global66 → **fiscalmente** comisión bancaria, **económicamente** parte del costo de la nómina internacional.

El bank reconciler que crea expenses desde transacciones bancarias defaultea `expense_type='supplier'` cuando no puede inferir mejor (description text + payment_account_id no son suficientes para inferir naturaleza payroll). Eso sesga sistemáticamente el KPI Nómina hacia abajo y Proveedores hacia arriba.

## Impacto

- **KPI Nómina sub-counted en ~$3M abril 2026** (~75% del costo labor real perdido en otros buckets).
- **KPI Proveedores inflado proporcionalmente.**
- **Cascada a P&L gerencial, ICO Engine, Cost Attribution, Member Loaded Cost, Budget Engine** — todos consumían `expense_type` para análisis económico.
- **Sin alerta automática previa** — los KPIs cuadran arithméticamente (total = suma de buckets), pero la distribución entre buckets miente.
- Los saldos bancarios cuadran perfectos (cash flow ortogonal a la dimensión bucket), por lo que el problema no era visible vía conciliación.

## Diagnóstico

Investigación 2026-05-03 con `pnpm pg:connect:shell` + queries directas:

- `greenhouse_finance.expenses` schema — 1 columna `expense_type` con valores fiscales (`supplier | payroll | social_security | tax | miscellaneous | financial_cost | bank_fee`). Esa misma columna se usa para análisis económico → mismo dato sirve a dos masters semánticos.
- 50 expenses Nubox con `expense_type='supplier'` por default genérico del reconciler — sin metadata para distinguir SaaS (Adobe, Vercel) de payroll vendor (Deel, Global66).
- Pagos Deel a Melkin tenían `expense_type='payroll'` correcto (porque el integrador Deel inyecta el tipo). Pagos Global66 a Daniela/Andrés tenían `expense_type='supplier'` (porque Global66 es "fintech" en el lente del reconciler, no payroll).
- Helper canónico `sumExpensePaymentsClpForPeriod` (TASK-766) usaba `FILTER (WHERE e.expense_type IN ('payroll'))` para el bucket Nómina → solo capturaba 6 payments Deel, dejando los $3M de Global66/transferencias fuera.

Path de transmisión confirmado: bank reconciler insert con `expense_type='supplier'` default → helper TASK-766 segrega buckets por `expense_type` → cash-out KPI muestra Nómina parcial.

## Solución aplicada

**TASK-768 — Finance Expense Economic Category Dimension**. 9 slices entregados que separan la dimensión analítica de la fiscal sin tocar `expense_type` legacy. Ver `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`.

Componentes que cierran cada falla:

1. **Schema separation** (Slice 1): nueva columna `economic_category` aditiva en `expenses` + `income`, NULLABLE inicial. 11 valores expense (`labor_cost_internal`, `labor_cost_external`, `vendor_cost_saas`, `vendor_cost_professional_services`, `regulatory_payment`, `tax`, `financial_cost`, `bank_fee_real`, `overhead`, `financial_settlement`, `other`) + 8 valores income.
2. **Lookup tables canónicas** (Slice 1): `known_regulators` (17 entries: Previred, SII, Mutual CChC, FONASA, 4 Isapres, 7 AFPs, TGR, Dirección del Trabajo) + `known_payroll_vendors` (8 entries: Deel, Remote, Velocity Global, Oyster, Globalization Partners, Papaya Global, Multiplier, Rippling Global). Regex match.
3. **Resolver canónico TS** (Slice 2): `resolveExpenseEconomicCategory` + `resolveIncomeEconomicCategory` con 10 reglas declarativas (member_id explicit → RUT lookup → email → name fuzzy → known payroll vendor regex → known regulator regex → supplier partner → accounting_type transparent map → ambiguous fallback → manual_required). Cada resolución retorna `{category, confidence, matchedRule, evidence}`.
4. **Backfill defensivo** (Slice 3): Node script idempotente `scripts/finance/backfill-economic-category.ts` con `--dry-run` + `--batch-size` + `--limit`. Audit log append-only `economic_category_resolution_log` (trigger anti-update/delete TASK-765 pattern). Manual queue `economic_category_manual_queue` para confidence low/manual_required. Backfill abril 2026 resolvió 22 `labor_cost_external`, 13 `labor_cost_internal`, 7 `regulatory_payment`, 2 `financial_cost`.
5. **Trigger PG default** (Slice 5): `populate_economic_category_default_trigger` BEFORE INSERT — cero invasivo a 12 canonical writers existentes. Transparent map del `expense_type` → default seguro.
6. **CHECK constraint NOT VALID + canonical_values VALIDATED** (Slice 4): `expenses_economic_category_required_after_cutover` (NOT VALID hasta resolución manual queue post-Slice 6) + `expenses_economic_category_canonical_values` (VALIDATED — solo enum-style values).
7. **Reclassification endpoints + audit + outbox** (Slice 6): `PATCH /api/admin/finance/expenses/[id]/economic-category` + mirror income, capability granular least-privilege (`finance.expenses.reclassify_economic_category`, FINANCE_ADMIN + EFEONCE_ADMIN), atomic UPDATE + audit log + manual queue resolved + outbox `finance.expense.economic_category_changed` v1.
8. **VIEWs canónicas extendidas + reliability signals** (Slice 7): `expense_payments_normalized` + `income_payments_normalized` ahora exponen `economic_category` via JOIN. Helpers `sumExpensePaymentsClpForPeriod` retornan `byEconomicCategory` breakdown (11 keys) + `economicCategoryUnresolvedCount`. Backwards-compat preservada (TASK-766 23 tests verdes). 2 reliability signals nuevos: `finance.expenses.economic_category_unresolved` + `finance.income.economic_category_unresolved` (drift, error si count>0, steady=0).
9. **Lint rule + cash-out exposure** (Slice 8): `greenhouse/no-untokenized-expense-type-for-analytics` mode `error`. Override block exime SII/VAT/operacional/resolver. cash-out endpoint expone `summary.byEconomicCategory` para que UI migre a leer la dimensión correcta.

## Recovery del incidente

Backfill ejecutado en dev DB (estado pre-deploy):
- **22 expenses → `labor_cost_external`** (Daniela, Andrés, Melkin via Deel/regex, FX fees con context payroll).
- **13 expenses → `labor_cost_internal`** (pagos a colaboradores ECG con RUT match).
- **7 expenses → `regulatory_payment`** (Previred, SII matches via regex).
- **2 expenses → `financial_cost`** (cuotas crédito).
- **54 income → `service_revenue`** (default razonable).
- **161 expenses + 19 income en manual queue** (Nubox imports con `expense_type='supplier'` sin RUT/member match — operador resuelve via UI Slice 6 antes de cutover).

Expectativa post-cutover production: KPI Nómina cash-out abril 2026 sube de $1.030.082 a ~$4M (sumando `labor_cost_internal + labor_cost_external`). Total Pagado se mantiene en $11.143.931 (cero impacto en saldos).

## Verificación

Reliability signals POST-backfill:
- `finance.expenses.economic_category_unresolved`: count = 161 (manual queue pending → severity=error temporal hasta resolución manual + VALIDATE)
- `finance.income.economic_category_unresolved`: count = 19 (idem)

Tests anti-regresión (108 totales TASK-768):
- 11 types
- 26 resolver
- 7 identity-lookup (regex RUT)
- 5 lookup-tables
- 14 endpoints (9 expense + 5 income)
- 11 lint rule RuleTester
- 23 TASK-766 backwards-compat preserved
- 11 ad-hoc

Verificación end-to-end: `pnpm tsc --noEmit` clean, `pnpm lint` 0 errors, `pnpm build` clean.

KPI canónico post-deploy production verificable via:
```sql
SELECT
  SUM(payment_amount_clp) FILTER (WHERE economic_category IN ('labor_cost_internal', 'labor_cost_external')) AS nomina_canonical_clp,
  SUM(payment_amount_clp) FILTER (WHERE economic_category IN ('vendor_cost_saas', 'vendor_cost_professional_services')) AS proveedores_canonical_clp,
  SUM(payment_amount_clp) FILTER (WHERE economic_category IN ('tax', 'regulatory_payment')) AS fiscal_canonical_clp,
  SUM(payment_amount_clp) AS total_clp
FROM greenhouse_finance.expense_payments_normalized
WHERE payment_date BETWEEN '2026-04-01' AND '2026-04-30';
```

## Lecciones operativas

- **Conflate de dimensiones es bug arquitectónico.** Una columna sirviendo a dos semánticas (fiscal vs analítica) sesga uno de los dos mundos sistémicamente. La separación ortogonal es la solución robusta.
- **Lente read-time NO es solución robusta.** Frente a la primera idea de "compute economic_category at read-time desde expense_type", se descartó por: (a) no ataca causa raíz upstream, (b) source of truth dividida, (c) auditabilidad pobre, (d) blast radius cruza P&L/ICO/cost attribution. Solución correcta: separación write-time + persistencia + audit.
- **CHECK NOT VALID + VALIDATE atomic** es el patrón canónico para introducir constraints que requieran backfill previo. Probado en TASK-708/728/766/768 (4 veces).
- **Trigger BEFORE INSERT + transparent map** es cero invasivo cuando hay 12+ canonical writers — más mantenible que modificar cada writer.
- **Lint rule + override block** garantizan tolerancia cero forward sin romper código operacional legítimo (SII/VAT/auth-fiscal).
- **Resolver canónico TS** + lookup tables seedeadas separan reglas (datos) de motor (código). Agregar nuevo regulador chileno o vendor de payroll = INSERT row en seed table, cero código nuevo.
- **`-- Up Migration` marker es load-bearing.** node-pg-migrate parsea el archivo buscando ese marker exacto. Si falta, la migración se registra como aplicada sin ejecutar SQL real (bug detectado en Slice 1, agregado al CLAUDE.md como invariante).

## Referencias

- TASK origen: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`
- ISSUE precedente con dimensión adyacente (CLP currency): `ISSUE-064-cash-out-kpi-inflated-clp-currency-anti-pattern.md` (TASK-766)
- Spec arquitectónica updated: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-05-03)
- Reliability spec updated: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta 2026-05-03)
- Outbox events nuevos: `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta 2026-05-03)
- CLAUDE.md: sección nueva "Finance — Economic Category Dimension Invariants (TASK-768)" + sección nueva "Database — Migration markers (anti pre-up-marker bug)"
- Bloquea desbloqueado: TASK-178 (Budget Engine), TASK-710-713 (Member Loaded Cost program)
