# TASK-720 — Instrument Category KPI Rules + policy-driven Bank aggregation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Cerrada 2026-04-28`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-720-instrument-category-kpi-rules`

## Summary

El KPI "Saldo CLP" en `/finance/bank` muestra $5,494,893 cuando el cash real es $4,181,125 (Santander + Global66). Está sumando deuda de tarjeta de crédito ($1,141,273) + saldo CCA accionista ($172,495) como si fueran cash disponible — bug determinístico introducido cuando se permitieron cuentas liability (TASK-714, TASK-700/701) sin actualizar el agregador. Solución: catálogo declarativo `instrument_category_kpi_rules` que dicta cómo cada `instrument_category` contribuye a cada KPI. Policy-driven, reusable para todas las categorías futuras (wallets, loans, factoring).

## Why This Task Exists

`getBankOverview` (`src/lib/finance/account-balances.ts:1427-1441`) suma `closingBalance` de todas las cuentas CLP sin distinguir asset vs liability. Para cuentas liability, `closingBalance` representa deuda activa (sign convention TASK-703), no cash. El bug:

- "Saldo CLP" infla en $1,313,768 (suma TC + CCA como si fueran cash)
- "Equivalente CLP" tiene el mismo defecto
- Cuando emerjan wallets / loans / factoring, el bug se repite y/o silencia

Solución estructural: tabla declarativa `instrument_category_kpi_rules` + helper canónico `aggregateBankKpis` + detector ledger-health + FK enforcement. Mismo patrón que `payment_provider_catalog` (TASK-701) y `internal_account_type_catalog` (TASK-700).

## Goal

- Tabla `greenhouse_finance.instrument_category_kpi_rules` con seed para 6+ categorías actuales
- Helper canónico `aggregateBankKpis` (TS) con paridad ↔ SQL
- Refactor `getBankOverview` para consumir el helper en lugar de lógica inline
- 2 cards nuevos UI: "Crédito utilizado" + "Cuentas internas" con breakdown
- Detector ledger-health `task720.instrumentCategoriesWithoutKpiRule` (steady = 0)
- FK `accounts.instrument_category → instrument_category_kpi_rules.instrument_category` (Slice 5)
- Tests: paridad SQL ↔ TS + KPI before/after + detector

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- TASK-701 (payment_provider_catalog) — patrón canónico de tabla declarativa + rules
- TASK-700 (internal_account_type_catalog) — patrón canónico de catálogo
- TASK-703 (liability sign convention)
- TASK-714 (credit_card semantics)

Reglas obligatorias:

- Cero cambios en materializeAccountBalance, account_balances, settlement_legs
- Cambio de fórmula es contenible: 1 commit en `getBankOverview`
- Detector debe correr en steady state = 0 antes de cierre
- FK Slice 5 valida pre-apply que TODAS las filas tengan rule (ABORT si no)
- Reversible: cada slice 1 commit, revert granular sin pérdida de datos

## Dependencies & Impact

### Depends on

- TASK-701 (instrument_category_provider_rules — patrón referencia)
- TASK-703 (liability sign convention)
- VIEW `greenhouse_finance.fx_pnl_breakdown` (TASK-699 — sin cambios)

### Blocks / Impacts

- Cualquier categoría futura (`employee_wallet`, `intercompany_loan`, `factoring_advance`, `escrow_account`)
- TASK-722+ que necesiten breakdown net worth / cash position multi-currency

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-720-instrument-category-kpi-rules.sql`
- `migrations/YYYYMMDDHHMMSS_task-720-kpi-rules-fk-constraint.sql`
- `src/lib/finance/instrument-kpi-rules.ts`
- `src/lib/finance/__tests__/instrument-kpi-rules.test.ts`
- `src/lib/finance/account-balances.ts` (refactor sección agregador)
- `src/lib/finance/ledger-health.ts` (nuevo detector)
- `src/lib/finance/__tests__/ledger-health-task720.test.ts`
- `src/views/greenhouse/finance/BankView.tsx` (2 cards nuevos + tooltip)
- `docs/documentation/finance/modulos-caja-cobros-pagos.md` (update)

## Current Repo State

### Already exists

- 6 instrument_categories activos: bank_account, fintech, payment_platform, payroll_processor, credit_card, shareholder_account
- `accounts.account_kind` con CHECK ('asset', 'liability')
- VIEW `fx_pnl_breakdown` (TASK-699)
- Patrón `instrument_category_provider_rules` (TASK-701)
- Sign convention liability (TASK-703)

### Gap

- No existe tabla `instrument_category_kpi_rules`
- Lógica de agregación KPI inline en `getBankOverview`, sin distinción asset/liability
- UI no muestra breakdown — KPI infla y oculta deuda
- Sin detector que prevenga reincidencia con futuras categorías

## Scope

### Slice 1 — Catálogo + helper TS

- Migration `instrument_category_kpi_rules` con CHECK constraints
- Seed con 6 categorías activas + 4 reservadas (employee_wallet, intercompany_loan, factoring_advance, escrow_account)
- Helper `src/lib/finance/instrument-kpi-rules.ts`:
  - Type `KpiRule`
  - Reader `loadKpiRules(): Promise<KpiRule[]>` con cache TTL 60s
  - `aggregateBankKpis(accounts, rules): KpiAggregation`
- Tests: 6+ tests cubriendo aggregation por grupo, signo liability, missing rule fail-fast

### Slice 2 — Refactor getBankOverview

- Reemplazar `totalClp/totalUsd/consolidatedClp` inline por `aggregateBankKpis`
- Extender shape `kpis` con `breakdown: { cash, credit, platformInternal }` — backward-compat (totalClp/totalUsd/consolidatedClp siguen)
- Tests: snapshot KPIs pre vs post para abril 2026 — confirma corrección $5,494,893 → $4,181,125

### Slice 3 — UI breakdown

- Tooltip en card "Saldo CLP" explicando composición
- 2 cards nuevos en row de KPIs: "Crédito utilizado" + "Cuentas internas"
- Solo se muestran si `breakdown.credit > 0` o `breakdown.platformInternal > 0` (no clutter cuando 0)
- Doc funcional update

### Slice 4 — Detector ledger-health

- Métrica `task720.instrumentCategoriesWithoutKpiRule`
- SQL: `SELECT instrument_category FROM accounts WHERE is_active AND instrument_category NOT IN (SELECT instrument_category FROM instrument_category_kpi_rules)`
- Surface en Reliability dashboard
- Tests: steady=0/healthy + flag con sample + graceful degradation

### Slice 5 — FK enforcement (anti-reincidencia)

- Migration aditiva: pre-flight valida que TODAS las filas activas tengan rule, ABORT si no
- ADD CONSTRAINT FK `accounts.instrument_category → instrument_category_kpi_rules.instrument_category`
- Tests: insert con categoría unknown debe fallar

## Out of Scope

- Card "Patrimonio neto" (asset - liability) — diseño completo en task derivada si emerge necesidad
- Multi-currency net worth calculator — task aparte cuando aparezca caso de uso
- Refactor de otras superficies (CashPosition, P&L) — esta task solo arregla `/finance/bank`

## Detailed Spec

### Schema

```sql
CREATE TABLE greenhouse_finance.instrument_category_kpi_rules (
  instrument_category TEXT PRIMARY KEY,
  account_kind TEXT NOT NULL CHECK (account_kind IN ('asset', 'liability')),
  contributes_to_cash BOOLEAN NOT NULL,
  contributes_to_consolidated_clp BOOLEAN NOT NULL,
  contributes_to_net_worth BOOLEAN NOT NULL,
  net_worth_sign SMALLINT NOT NULL CHECK (net_worth_sign IN (-1, 1)),
  display_label TEXT NOT NULL,
  display_group TEXT NOT NULL CHECK (display_group IN ('cash', 'credit', 'platform_internal')),
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_implies_consolidated CHECK (
    NOT contributes_to_cash OR contributes_to_consolidated_clp
  ),
  CONSTRAINT consolidated_implies_net_worth CHECK (
    NOT contributes_to_consolidated_clp OR contributes_to_net_worth
  )
);
```

### Seed

| category | kind | cash | consol | net_worth | sign | label | group |
|---|---|---|---|---|---|---|---|
| bank_account | asset | T | T | T | +1 | Cuenta corriente | cash |
| fintech | asset | T | T | T | +1 | Fintech | cash |
| payment_platform | asset | T | T | T | +1 | Plataforma de pagos | cash |
| payroll_processor | asset | F | F | F | +1 | Procesador de nómina | platform_internal |
| credit_card | liability | F | F | T | -1 | Tarjeta de crédito | credit |
| shareholder_account | liability | F | F | T | -1 | Cuenta corriente accionista | platform_internal |
| employee_wallet | liability | F | F | T | -1 | Wallet de colaborador | platform_internal |
| intercompany_loan | liability | F | F | T | -1 | Préstamo intercompañía | platform_internal |
| factoring_advance | liability | F | F | T | -1 | Adelanto de factoring | credit |
| escrow_account | asset | F | T | T | +1 | Cuenta escrow | platform_internal |

### Helper signature

```ts
export type KpiAggregation = {
  totalCashByCurrency: Record<string, number>
  consolidatedCashClp: number
  netWorthByCurrency: Record<string, number>
  netWorthClp: number
  byGroup: { cash: number; credit: number; platformInternal: number }
}

export const aggregateBankKpis = (
  accounts: Pick<TreasuryBankAccountOverview, 'currency' | 'closingBalance' | 'closingBalanceClp' | 'instrumentCategory'>[],
  rules: KpiRule[]
): KpiAggregation
```

Si una cuenta tiene `instrument_category` sin rule → throw `MissingKpiRuleError` (fail-fast). El detector previene que esto ocurra en producción.

## Acceptance Criteria

- [ ] Tabla `instrument_category_kpi_rules` creada con CHECKs
- [ ] 10 rules seed-cargadas
- [ ] Helper `aggregateBankKpis` con paridad SQL ↔ TS testeada
- [ ] `getBankOverview` consume el helper, no lógica inline
- [ ] "Saldo CLP" abril 2026 = $4,181,125 (post-fix)
- [ ] "Equivalente CLP" abril 2026 = ~$4,182,862 (post-fix)
- [ ] 2 cards UI nuevos con breakdown
- [ ] Detector `task720.instrumentCategoriesWithoutKpiRule` en ledger-health
- [ ] FK constraint aplicada y validada
- [ ] Tests pass (15+ tests)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/instrument-kpi-rules.test.ts`
- `pnpm test src/lib/finance/__tests__/ledger-health-task720.test.ts`
- Verificación manual: abrir `/finance/bank` y confirmar Saldo CLP = $4,181,125

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Detector `task720.instrumentCategoriesWithoutKpiRule = 0` confirmado
- [ ] CLAUDE.md sección actualizada con regla de catálogo

## Follow-ups

- Card "Patrimonio neto" cuando emerja necesidad
- Extender pattern para Cobros / Pagos / CashPosition si se detectan inflados similares
