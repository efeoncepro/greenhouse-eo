# ISSUE-064 — `/finance/cash-out` mostraba KPIs inflados 88× por anti-patrón sistémico CLP × rate

## Ambiente

production / staging / dev (mismo runtime; reproducido en dev)

## Estado

`resolved` — 2026-05-03

## Síntoma

El 2026-05-02, la página `/finance/cash-out` mostraba el KPI **"Total pagado" = $1.017.803.262 CLP** para abril 2026, cuando el valor real era **$11.546.493 CLP** (88× inflado, mil millones fantasma).

KPIs adicionales afectados en mismo dashboard:

- "Pagos a proveedores": valor inflado proporcional al peso del payment HubSpot CCA en la mezcla.
- KPIs Nómina y Fiscal correctos (no había payments USD ahí).

Detección: el usuario notó que los números "no hacían sentido" comparados con el saldo de Santander CLP. Sin alerta automática previa.

## Causa raíz

**Anti-patrón sistémico** en queries SQL embebidos a lo largo del módulo Finance:

```sql
SELECT SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))
FROM greenhouse_finance.expense_payments ep
JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
```

El campo `exchange_rate_to_clp` vive en el documento original (`expenses` / `income`), NO en el payment. Cuando un expense USD se paga en CLP nativo (caso CCA shareholder reimbursable TASK-714c — payment HubSpot CCA `exp-pay-sha-46679051-7ba82530`: $1.106.321 CLP sobre un expense documentado en USD con rate 910.55), multiplicar el monto CLP por el rate USD del documento infla los KPIs en mil millones por payment:

| Concepto | Valor real | Valor "broken" |
|---|---|---|
| `payment.amount` | $1.106.321 CLP | $1.106.321 CLP |
| `payment.currency` | CLP | CLP |
| `expense.exchange_rate_to_clp` | (n/a — pero almacenado como 910.55 del documento USD) | 910.55 |
| KPI computado | $1.106.321 (canonical) | **$1.007.363.090 (88×)** |

Cualquier futuro callsite del anti-patrón (cualquier nuevo dashboard, P&L, finance intelligence, agency view) iba a repetir el bug. El problema no era puntual al endpoint — era arquitectónico.

Cadena de contribuyentes secundarios:

- **Falta de single source of truth para `payment_amount_clp`.** Cada endpoint computaba su propia agregación inline en lugar de delegar a un helper canónico (en contraste con `getBankFxPnlBreakdown` TASK-699 o `income_settlement_reconciliation` TASK-571).
- **Falta de enforcement mecánico.** No había lint rule que bloqueara el patrón; cualquier code reviewer humano podía dejarlo pasar.
- **Falta de drift signal.** No había reliability signal para detectar payments con `currency != 'CLP' AND amount_clp IS NULL` — la condición exacta que el anti-patrón explotaba.
- **Caso CCA (TASK-714c) no era el único shape posible.** Cualquier payment futuro CLP sobre expense no-CLP (o viceversa) iba a ser víctima del mismo bug.

## Impacto

- **KPI inflado 88×** en `/finance/cash-out` por 24+ horas hasta detección por usuario.
- **Cascada potencial** a 8 endpoints adicionales que compartían el anti-patrón: `/api/finance/cash-in`, `/api/finance/cash-position`, `/api/finance/dashboard/{pnl,summary,cashflow}`, `/api/finance/expenses/summary`, `/api/finance/income/summary`. Todos ya migrados como bonus en la solución.
- **Riesgo de decisión incorrecta**: stakeholders que mirasen los dashboards en ese estado podrían concluir que el outflow del mes era 100× el real.
- **Cero alerta automática** — silent inflation hasta que el usuario notó la inconsistencia.

## Diagnóstico

Investigación documentada en sesión 2026-05-02 con `pnpm pg:connect` + queries directas:

- `greenhouse_finance.expense_payments WHERE payment_id = 'exp-pay-sha-46679051-7ba82530'` → confirmado `amount=1106321, currency=CLP, amount_clp=NULL` (legacy pre-TASK-708, sin `amount_clp` poblado).
- `greenhouse_finance.expenses WHERE expense_id = 'EXP-SHA-46679051'` → confirmado `currency=USD, exchange_rate_to_clp=910.55` (rate del documento original al momento de issuance).
- Reproducción del query broken: `SUM(1106321 * 910.55) = 1,007,363,090` ← el $1B fantasma.
- Reproducción del query canónico: `SUM(COALESCE(amount_clp, CASE WHEN currency='CLP' THEN amount END)) = 1,106,321` ← el valor real.
- Confirmación: la diferencia exacta entre el broken total y el canonical total era atribuible a este único payment.

Cross-check: 2 income_payments adicionales detectados pre-cutover con `currency != 'CLP' AND amount_clp IS NULL` (legacy). 23 income_payments adicionales necesitaban backfill 1:1 (`currency='CLP'` pero `amount_clp IS NULL`).

## Solución aplicada

**TASK-766 — Finance CLP-Currency Reader Contract Resilience.** 5 slices entregados que convierten el cómputo de KPIs CLP de payments en single-source-of-truth con enforcement mecánico anti-regresión. Ver `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`.

Componentes que cierran cada falla:

1. **VIEW canónica `greenhouse_finance.expense_payments_normalized`** (mirror `income_payments_normalized`). Expone `payment_amount_clp` con COALESCE chain canonical: `amount_clp` first → CLP-trivial fallback (`WHEN currency='CLP' THEN amount`) → `NULL` con `has_clp_drift=TRUE`. Aplica filtro 3-axis supersede inline. Replica el patrón TASK-571 (`income_settlement_reconciliation`) y TASK-699 (`fx_pnl_breakdown`).
2. **Helper TS canónico** `src/lib/finance/expense-payments-reader.ts` + `income-payments-reader.ts`. Single source of truth para todo cómputo CLP de payments. Validates filters, returns canonical struct. Ningún consumer puede recomputar inline.
3. **Backfill defensivo** + `requires_fx_repair BOOLEAN` column + CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE atomic, mirror TASK-708/728, cutover 2026-05-03). Bloquea INSERT/UPDATE de non-CLP sin `amount_clp` post-cutover a nivel DB. 23 income_payments backfilled.
4. **2 reliability signals canónicos** (`finance.expense_payments.clp_drift` + `finance.income_payments.clp_drift`, kind=drift, severity=error si count>0, steady=0). Subsystem rollup en `Finance Data Quality`. AI Observer captura cualquier reaparición.
5. **Lint rule mecánica** `greenhouse/no-untokenized-fx-math` modo `error` desde commit-1. Detecta 4 patrones (expense + income, con/sin COALESCE). Bloquea cualquier futuro callsite del anti-patrón.
6. **Migración exhaustiva**: 8 endpoints migrados al helper canónico. Bonus 4 callsites con leak de supersede fixed automáticamente.
7. **Repair admin endpoint** `POST /api/admin/finance/payments-clp-repair` (capability granular `finance.payments.repair_clp` — FINANCE_ADMIN + EFEONCE_ADMIN, least-privilege). Resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates`. Per-row atomic. Idempotente. Outbox audit `finance.payments.clp_repaired` v1.

## Recovery del incidente

Backfill aplicado en migration `20260503015255538`:

- **23 income_payments** backfilled (`amount_clp = amount` para `currency='CLP'`).
- **0 payments en drift residual** post-backfill — el CHECK constraint VALIDATE pasó atomic dentro de la misma migration.
- El payment HubSpot CCA `exp-pay-sha-46679051-7ba82530` queda servido por la VIEW (CLP-trivial fallback retorna `amount_clp = 1.106.321` correctamente sin necesidad de UPDATE).

Cutover: 2026-05-03 00:00:00+00 America/Santiago. Post-cutover, la cadena `recordExpensePayment` / `recordIncomePayment` (helpers canónicos pre-existentes) ya resuelve rate histórico al insert; cualquier nuevo payment nace con `amount_clp` poblado.

## Verificación

KPIs `/finance/cash-out` post-cutover (queries SQL ejecutadas vs el helper canónico):

| KPI | Pre-fix | Post-fix |
|---|---|---|
| Total pagado abril 2026 | $1.017.803.262 (broken) | **$11.546.493 (canonical)** |
| Pagos a proveedores | inflado proporcional | **$5.321.241** |
| Pagos nómina | $1.432.644 (correcto, no había USD) | **$1.432.644** (sin cambio) |
| Pagos fiscales | $4.308.114 (correcto) | **$4.308.114** (sin cambio) |
| `driftCount` (signal nuevo) | n/a | **0** |

Reliability signals POST-cutover:

- `finance.expense_payments.clp_drift`: **n=0** (steady)
- `finance.income_payments.clp_drift`: **n=0** (steady, post-backfill)

Tests anti-regresión:

- `cash-out/route.test.ts` assert hard `totalPaidClp < 20_000_000` para impedir que los $1B fantasma vuelvan jamás.
- 79 tests TASK-766 acumulados verdes.
- 2940/2940 del suite full pasan.

## Lecciones operativas

- **Anti-patrones SQL embebidos son sistémicos.** Una vez que un patrón roto se "aprende" en un endpoint, se replica por copy-paste o por copying-the-style. La defensa es lint rule en `error` mode, NO convención humana.
- **VIEWs canónicas + helpers TS son el shape correcto para "columna derivada de N mecanismos legítimos".** Patrón ya validado en TASK-571 (settlement reconciliation), TASK-699 (FX P&L breakdown), TASK-721 (canonical helper enforcement). TASK-766 lo formaliza por tercera vez para CLP currency reading.
- **Reliability signals con steady=0 son contratos vivos.** Si el signal vuelve a > 0, el operador ve el problema antes que el usuario lo reporte. AI Observer enlaza al endpoint repair canónico.
- **CHECK NOT VALID + VALIDATE atomic** es el patrón canónico para introducir constraints que requieran backfill previo. Probado en TASK-708/728 y replicado en TASK-766 sin issues.
- **Capability granular least-privilege**: cada nueva mutación operacional merece su propia capability. Compartir capabilities entre dimensiones ortogonales (FX repair vs payroll rematerialize) acopla acciones que deberían ser delegables independiente. TASK-742 + TASK-765 + TASK-766 consistente.
- **Bonus fixes durante migración exhaustiva** (4 callsites con leak de supersede): cuando se migra para resolver un bug, vale la pena auditar todo el universo de callsites — frecuentemente emergen otros bugs latentes que el patrón canónico cierra automáticamente.

## Referencias

- TASK origen: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`
- Spec arquitectónica updated: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-05-03)
- Spec FX & Currency updated: `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (Delta 2026-05-03)
- Reliability spec updated: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta 2026-05-03)
- Outbox events nuevos: `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta 2026-05-03)
- CLAUDE.md: sección nueva "Finance — CLP currency reader invariants (TASK-766)"
- ISSUE precedente con misma raíz arquitectónica (skip silencioso): `ISSUE-063-payment-orders-paid-without-bank-impact.md` (TASK-765)
