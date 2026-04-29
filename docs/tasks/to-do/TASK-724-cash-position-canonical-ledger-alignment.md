# TASK-724 — Cash Position Canonical Ledger Alignment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-724-cash-position-canonical-ledger-alignment`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Alinear `/finance/cash-position` con el ledger canonico de Banco para que KPIs, flujo de caja y saldos usen `account_balances` / `account_balances_monthly`, FX canónico y freshness, en vez de recalcular desde pagos crudos. La task corrige el caso visible donde abril 2026 muestra egresos por ~$1.017B porque un pago CLP asociado a un documento USD se multiplica nuevamente por el tipo de cambio del documento.

## Why This Task Exists

`/finance/bank` ya opera sobre un modelo ledger-first e instrument-aware: saldos por cuenta, movimientos, drift, conciliacion, FX y freshness vienen de snapshots/materializaciones canonicas. En cambio, `/finance/cash-position` sigue calculando su serie de 12 meses directamente desde `income_payments` y `expense_payments`, con formulas locales.

La investigacion del 2026-04-29 encontro el bug concreto:

- `GET /api/finance/cash-position` calcula egresos como `ep.amount * COALESCE(e.exchange_rate_to_clp, 1)`.
- El pago `exp-pay-sha-46679051-7ba82530` de HubSpot tiene `ep.amount = 1.106.321 CLP`, `ep.amount_clp = 1.106.321`, pero el documento original es USD con `e.exchange_rate_to_clp = 910.552263`.
- La API lo infla a `1.106.321 * 910.552263 = 1.007.363.090`, generando casi todo el egreso falso de abril.
- Si se usa `ep.amount_clp`, el egreso de abril baja de `$1.017.381.177,82` a aproximadamente `$11.124.408,67`.

El fix puntual seria usar `amount_clp`, pero eso solo corrige un sintoma. La deuda real es que `cash-position` no comparte contrato con Banco, por lo que puede divergir en saldos, FX, categorias de instrumentos, drift, conciliacion y freshness.

## Goal

- Convertir `Posicion de caja` en un resumen ejecutivo derivado del ledger canonico de Banco.
- Eliminar doble conversion FX y cualquier recalculo financiero local desde pagos crudos para KPIs principales.
- Separar semanticamente caja disponible, credito/deuda, cuentas por cobrar, cuentas por pagar, posicion neta y flujo mensual.
- Mantener fallback resiliente y observable si el read model esta stale o incompleto.
- Agregar tests para que pagos CLP sobre documentos USD no puedan inflar cash flow.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `Banco` / `account_balances` es la fuente operacional canonica para saldos, inflows/outflows por instrumento, FX materializado y freshness.
- `Posicion de caja` no debe recalcular saldos ni FX desde `income_payments` / `expense_payments` crudos cuando exista read model canonico.
- Para pagos, si existe `amount_clp`, ese valor es el equivalente CLP del pago; nunca se debe multiplicar nuevamente por el tipo de cambio del documento.
- El resultado cambiario debe leerse desde `greenhouse_finance.fx_pnl_breakdown` o `src/lib/finance/fx-pnl.ts`, no derivarse desde pagos crudos.
- Si el read model esta stale, la UI debe mostrar estado degradado/honesto como Banco, no recomputar silenciosamente en el request path.
- Access model: la task no debe crear nuevas views ni entitlements. Si cambia visibilidad, navegacion o permisos, debe documentar ambos planos (`views` + `entitlements`) antes de implementar.

## Normative Docs

- `docs/tasks/complete/TASK-699-banco-fx-result-canonical-pipeline.md`
- `docs/tasks/complete/TASK-705-banco-read-model-snapshot-cutover.md`
- `docs/tasks/complete/TASK-720-instrument-category-kpi-rules.md`
- `docs/tasks/to-do/TASK-722-bank-reconciliation-synergy-workbench.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Dependencies & Impact

### Depends on

- `src/app/api/finance/cash-position/route.ts`
- `src/views/greenhouse/finance/CashPositionView.tsx`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/account-balances-monthly.ts`
- `src/lib/finance/fx-pnl.ts`
- `greenhouse_finance.accounts`
- `greenhouse_finance.account_balances`
- `greenhouse_finance.account_balances_monthly`
- `greenhouse_finance.fx_pnl_breakdown`
- `greenhouse_finance.income`
- `greenhouse_finance.expenses`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.expense_payments`

### Blocks / Impacts

- Impacta `/finance/cash-position`.
- Reduce divergencia entre `Banco`, `Conciliacion`, `Cobros`, `Pagos` y `Posicion de caja`.
- Mejora confiabilidad de `TASK-722` al hacer que el resumen ejecutivo consuma el mismo estado operacional que Banco.
- Desbloquea mejores insights para `TASK-723` porque AI no deberia explicar datos inflados por doble conversion FX.

### Files owned

- `src/app/api/finance/cash-position/route.ts`
- `src/views/greenhouse/finance/CashPositionView.tsx`
- `src/lib/finance/cash-position/*` (nuevo, si el plan decide extraer helper)
- `src/lib/finance/__tests__/cash-position*.test.ts` (nuevo o existente)
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (delta breve si cambia contrato)

## Current Repo State

### Already exists

- `/finance/bank` usa `GET /api/finance/bank?year=YYYY&month=M`.
- `src/app/api/finance/bank/route.ts` llama `getBankOverview({ materialize: 'skip' })`.
- `src/lib/finance/account-balances.ts` expone `getBankOverview()`.
- `src/lib/finance/account-balances-monthly.ts` agrega read model mensual derivado.
- `src/lib/finance/fx-pnl.ts` centraliza `getBankFxPnlBreakdown()` y prohibe re-derivar FX desde pagos crudos.
- `src/views/greenhouse/finance/BankView.tsx` ya muestra freshness, breakdown de instrumentos, drift y FX con estado honesto.
- `src/app/api/finance/cash-position/route.ts` existe y devuelve:
  - `accounts`
  - `receivable`
  - `payable`
  - `fxGainLossClp`
  - `netPosition`
  - `monthlySeries`
- `src/views/greenhouse/finance/CashPositionView.tsx` renderiza KPIs y grafico de 12 meses desde ese endpoint.

### Gap

- `cash-position` calcula `monthlySeries` desde pagos crudos:
  - ingresos: `ip.amount * COALESCE(i.exchange_rate_to_clp, 1)`
  - egresos: `ep.amount * COALESCE(e.exchange_rate_to_clp, 1)`
- Ese calculo rompe cuando el pago ya esta en CLP (`ep.amount_clp`) pero el documento original esta en USD.
- `fxGainLossClp` se suma desde `income_payments.fx_gain_loss_clp` + `expense_payments.fx_gain_loss_clp`, ignorando `fx_pnl_breakdown`.
- `accounts` muestra `opening_balance`, no saldo vigente/materializado.
- `netPosition` hoy equivale a `receivable - payable`, pero el subtitle dice "Caja disponible estimada"; semanticamente es confuso.
- La vista no muestra freshness/staleness, drift ni la relacion clara con Banco.

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

### Slice 1 — Safety hotfix inside existing endpoint

- Corregir el calculo legacy de `monthlySeries` para usar `amount_clp` cuando exista:
  - `COALESCE(ip.amount_clp, ip.amount * COALESCE(ip.exchange_rate_at_payment, i.exchange_rate_to_clp, 1))`
  - `COALESCE(ep.amount_clp, ep.amount * COALESCE(ep.exchange_rate_at_payment, e.exchange_rate_to_clp, 1))`
- Excluir pagos superseded usando el filtro canonico TASK-703b: `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL` (las dos columnas estan coordinadas — payment-chain + anchor-chain). NO usar `superseded_at IS NOT NULL` solo: es solo el timestamp, el contrato canonico son los FKs.
- Aplicar el mismo fix de doble FX en las queries de `receivable` y `payable` (lineas 67 y 77 del route): hoy `total_amount_clp - amount_paid * COALESCE(exchange_rate_to_clp, 1)` subestima el balance pendiente cuando `amount_paid` esta en CLP sobre un documento USD. Es el mismo anti-pattern que `monthlySeries` y debe caer en el mismo hotfix, no esperar a Slice 2.
- Agregar test de regresion con pago CLP sobre documento USD que debe sumar `$1.106.321`, no `$1.007.363.090`.
- Agregar test de regresion adicional con pago superseded (`superseded_by_payment_id IS NOT NULL`) que NO debe contar en flujo ni en `amount_paid` para receivable/payable.
- Mantener el contrato JSON actual para no romper la UI mientras se construye el alineamiento canonico.

### Slice 2 — Canonical cash position service

- Extraer `src/lib/finance/cash-position/overview.ts` o helper equivalente.
- Leer saldos, inflows/outflows y freshness desde `getBankOverview()` o desde los mismos helpers/read models que usa Banco.
- **Decision a tomar en plan mode**: si el helper consume `settlement_legs` (canal canonico forward TASK-708) o se queda en `income_payments` / `expense_payments` por compatibilidad temporal. Default sugerido: legs cuando exista cobertura completa para el periodo y fallback a payments con flag `source: 'legacy_payments_fallback'` cuando no. Cualquier otra surface de finance que migre despues va a esperar la misma decision — documentarla en el delta de arquitectura.
- Definir payload versionado para `CashPositionOverview` con:
  - `cashAvailableClp`
  - `creditUsedClp`
  - `platformInternalClp`
  - `receivableClp`
  - `payableClp`
  - `netPositionClp`
  - `fxGainLoss`
  - `activeAccounts`
  - `freshness`
  - `accounts`
  - `monthlySeries`
- Mantener compatibilidad temporal con campos legacy (`receivable`, `payable`, `fxGainLossClp`, `netPosition`) mientras la UI migra.

### Slice 3 — Monthly series from read model

- Construir el flujo mensual desde `account_balances_monthly` / `account_balances`, no desde pagos crudos, cuando el read model exista.
- Definir semantica por categoria de instrumento:
  - asset cash/bank/fintech: inflows suman entrada de caja, outflows suman salida de caja.
  - credit_card/liability: cargos aumentan deuda, pagos reducen deuda; no mezclar como caja disponible sin clasificacion.
  - shareholder_account/platform_internal/payroll_processor: usar reglas de `instrument_category_kpi_rules` o equivalente existente.
- Si falta read model mensual para un mes, responder con degraded metadata en ese punto y no inventar valores.
- Documentar si la serie representa `flujo neto de caja operacional`, `cambio de saldo disponible`, o ambos.

### Slice 4 — FX and freshness convergence

- Reemplazar `fxGainLossClp` crudo por `getBankFxPnlBreakdown()` para el periodo seleccionado o el rango que aplique.
- Incluir `hasExposure`, `isDegraded`, `realizedClp`, `translationClp` e `internalTransferClp` en el payload.
- Propagar `freshness` desde Banco y mostrar banner en `CashPositionView` cuando el read model este stale.
- Evitar request-time rematerialization.

### Slice 5 — UI semantics and drill-down

- Renombrar o aclarar KPIs para que la UI no llame "Caja disponible" a `receivable - payable`.
- Propuesta de KPIs:
  - `Caja disponible`
  - `Por cobrar`
  - `Por pagar`
  - `Credito utilizado`
  - `Resultado cambiario`
  - `Posicion neta`
- Agregar CTA o drill-down hacia `/finance/bank` para el detalle por instrumento y hacia `/finance/reconciliation` cuando haya drift/periodos pendientes.
- Actualizar tabla de cuentas para mostrar saldo vigente/materializado, categoria y estado de conciliacion cuando exista.

### Slice 6 — Observability and docs

- Agregar guardrail/test que compare endpoint legacy vs canonical para detectar diferencias > umbral configurado durante rollout.
- Documentar el contrato en `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con delta breve.
- Actualizar `docs/documentation/finance/modulos-caja-cobros-pagos.md` en lenguaje funcional.
- Agregar nota en `Handoff.md` si quedan decisiones pendientes o si el rollout queda con feature flag/fallback.

## Out of Scope

- No cambiar la semantica de `Banco` ni de `account_balances`.
- No implementar AI ni sugerencias de conciliacion; eso vive en `TASK-723`.
- No redisenar por completo `/finance/reconciliation`; eso vive en `TASK-722`.
- No resolver FX de transferencias internas pendiente de `TASK-699` follow-up / `TASK-714d`.
- No crear una contabilidad legal ni P&L nuevo.
- No hacer backfills destructivos ni DELETEs sobre pagos.

## Detailed Spec

### Contrato objetivo

`GET /api/finance/cash-position` debe convertirse en reader puro sobre estado canonico:

```ts
type CashPositionOverview = {
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
  }
  kpis: {
    cashAvailableClp: number
    receivableClp: number
    payableClp: number
    creditUsedClp: number
    platformInternalClp: number
    netPositionClp: number
    activeAccounts: number
  }
  fxGainLoss: {
    totalClp: number
    realizedClp: number
    translationClp: number
    internalTransferClp: number
    hasExposure: boolean
    isDegraded: boolean
  }
  monthlySeries: Array<{
    year: number
    month: number
    cashInClp: number
    cashOutClp: number
    netFlowClp: number
    source: 'monthly_read_model' | 'daily_fallback' | 'legacy_safe_fallback'
    isDegraded: boolean
  }>
  accounts: Array<{
    accountId: string
    accountName: string
    bankName: string | null
    currency: string
    instrumentCategory: string | null
    providerSlug: string | null
    openingBalance: number
    closingBalance: number
    closingBalanceClp: number
    periodInflows: number
    periodOutflows: number
    accountKind: 'asset' | 'liability'
    reconciliationStatus: string | null
    driftAmount: number | null
  }>
  freshness: {
    lastMaterializedAt: string | null
    ageSeconds: number | null
    isStale: boolean
    label: string
  }
  legacy?: {
    routeCashOutClp?: number
    canonicalCashOutClp?: number
    varianceClp?: number
  }
}
```

### Immediate regression fixture

Crear test con este caso minimo:

```ts
expense.currency = 'USD'
expense.exchange_rate_to_clp = 910.552263
expense.total_amount = 1215
expense.total_amount_clp = 1106321
expense_payment.currency = 'CLP'
expense_payment.amount = 1106321
expense_payment.amount_clp = 1106321
expense_payment.exchange_rate_at_payment = 1
```

Resultado esperado:

- `cashOutClp = 1106321`
- no `1007363090`
- ninguna funcion nueva debe preferir `document.exchange_rate_to_clp` sobre `payment.amount_clp`.

### Rollout strategy

- Slice 1 puede salir como fix pequeño y seguro.
- Slices 2-5 migran la vista al contrato canonico.
- Si se usa feature flag, debe default-ear al contrato legacy-safe corregido y documentar fecha de retiro.
- El endpoint debe seguir respondiendo aunque `account_balances_monthly` este stale, pero debe marcar `freshness.isStale=true`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Abril 2026 en `/api/finance/cash-position` ya no muestra egresos inflados por doble conversion FX.
- [ ] El pago HubSpot CLP sobre documento USD suma `$1.106.321` al flujo, no ~$1.007B.
- [ ] `CashPositionView` muestra KPIs con semantica financiera clara: caja disponible no se confunde con `por cobrar - por pagar`.
- [ ] `Resultado cambiario` de cash position consume `fx_pnl_breakdown` / helper canonico, no pagos crudos.
- [ ] La serie mensual usa `account_balances_monthly` / `account_balances` cuando existe read model canonico.
- [ ] Si el read model esta stale o incompleto, la API/UI exponen freshness/degraded state.
- [ ] La vista mantiene links/drill-down hacia Banco y Conciliacion para detalle operacional.
- [ ] Tests cubren doble conversion FX en `monthlySeries` Y en `receivable`/`payable`, pagos superseded (filtro canonico TASK-703b) y fallback seguro.
- [ ] El filtro de superseded usa `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL`, no `superseded_at IS NOT NULL`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/finance`
- `pnpm staging:request /api/finance/cash-position --pretty`
- `pnpm staging:request '/api/finance/bank?year=2026&month=4' --pretty`
- Validacion visual en `/finance/cash-position` y `/finance/bank` con abril 2026.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` quedo alineado con la semantica nueva
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` recibio delta breve si el contrato API cambio

## Follow-ups

- Internal transfer FX P&L si se decide mostrar spread de transferencias multi-moneda en `Resultado cambiario`.
- Export/CSV de `Cash Position` basado en el contrato canonico.
- Home/Nexa insight read-only cuando `cash-position` detecte stale read model o drift financiero relevante.

## Delta 2026-04-29

Task creada tras investigar staging + DB + codebase sin cambios runtime:

- `GET /api/finance/cash-position` devolvio abril 2026 con `cashOutClp = 1017381177.82`.
- Consulta directa a Postgres mostro que el total legacy-safe usando `ep.amount_clp` es `11124408.67`.
- El principal outlier fue `exp-pay-sha-46679051-7ba82530` / `EXP-SHA-46679051` HubSpot: pago CLP de `$1.106.321` sobre gasto USD, inflado por doble FX a `$1.007.363.090`.
- `/api/finance/bank?year=2026&month=4` mostro saldos instrument-aware sanos y muy distintos, confirmando divergencia arquitectonica.

## Open Questions

- Definir si el grafico principal debe mostrar `flujo neto de caja operacional`, `cambio neto de caja disponible`, o ambos.
- Definir si tarjetas de credito aparecen como serie separada de deuda o como egreso operacional solo cuando se paga la tarjeta.
- Definir si `cash-position` debe aceptar selector de periodo como Banco o mantener 12 meses rolling desde `CURRENT_DATE`.
