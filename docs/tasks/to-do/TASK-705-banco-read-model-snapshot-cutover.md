# TASK-705 — Banco Read Model & Snapshot Cutover

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-705-banco-read-model-snapshot-cutover`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Desacoplar `Finance > Banco` del request-time materialization y convertir overview + drawer en readers puros sobre snapshots y read models canónicos. Hoy abrir `/finance/bank` o un drawer vuelve a recalcular balances en caliente, reusa readers demasiado amplios y dispara latencias de ~7-11s en staging. Esta task mueve la carga pesada fuera del request path, crea un contrato de lectura especializado y deja una base escalable para más cuentas, más períodos y mayor concurrencia.

## Why This Task Exists

La latencia actual no es un bug superficial; es un problema de arquitectura del módulo:

1. `GET /api/finance/bank/[accountId]` llama `getBankOverview()` antes de resolver el detalle de la cuenta, así que el drawer paga casi todo el costo del overview completo.
2. `getBankOverview()` materializa balances del período en tiempo de request para todas las cuentas activas.
3. El drawer además rematerializa 12 meses de histórico para una sola cuenta antes de dibujar el gráfico.
4. Los readers mezclan responsabilidades de write-path y read-path: UI, materialización, recomputo histórico, drift summary, FX breakdown, coverage y movimientos recientes viven demasiado acoplados.
5. El patrón no escala: más cuentas, más history window, más aperturas simultáneas de drawer o más tráfico desde staging/preview solo empeoran la latencia y elevan el riesgo de timeouts.

Sin esta task, cada mejora puntual al drawer seguirá peleando contra el mismo cuello estructural. Con esta task, `Banco` pasa a operar con un contrato canónico de snapshots/read models y la materialización queda donde corresponde: fuera del request interactivo.

## Goal

- `Bank overview` y `account detail` leen exclusivamente desde snapshots/read models ya materializados.
- El drawer deja de depender de `getBankOverview()` y usa un reader dedicado por cuenta/período.
- El histórico "Últimos 12 meses" se sirve desde un read model mensual, no desde rematerialización diaria en cada apertura.
- La materialización queda en lanes explícitos reactivos/operativos y no en el request path de UI.
- El contrato resultante soporta crecimiento de cuentas, períodos, reconciliación y futuros consumers sin degradar latencia.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- `Banco` no debe materializar balances ni recomputar históricos completos dentro de un request interactivo de UI.
- Los endpoints `/api/finance/bank` y `/api/finance/bank/[accountId]` deben quedar como readers puros sobre contratos persistidos.
- La source of truth sigue siendo `income_payments`, `expense_payments`, `settlement_legs`, OTB y reconciliación; los nuevos read models son proyecciones derivadas, no una segunda verdad editable.
- El histórico mensual del drawer debe quedar materializado con semántica canónica por `account_id + balance_month`, reutilizable por otros consumers.
- Los cambios de materialización pesada deben respetar el carril operativo del `ops-worker` o proyecciones reactivas existentes; no crear un segundo runtime paralelo.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/operations/ops-worker-reactive-crons.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-699-banco-fx-result-canonical-pipeline.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`
- `src/lib/finance/account-balances.ts`
- `src/app/api/finance/bank/route.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`

### Blocks / Impacts

- `/finance/bank` overview
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- futuros consumers de tesorería / reliability / health que hoy dependen de recomputo inline
- materialización operativa de balances y snapshots mensuales en `ops-worker`

### Files owned

- `src/lib/finance/account-balances.ts`
- `src/lib/finance/fx-pnl.ts`
- `src/app/api/finance/bank/route.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `services/ops-worker/server.ts`
- `migrations/`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- `account_balances` como snapshot diario canónico por cuenta/fecha.
- `getBankOverview()` y `getBankAccountDetail()` en `src/lib/finance/account-balances.ts`.
- lanes de rematerialización y CLI operativa de balances.
- OTB y clasificación liability/asset cerradas en `TASK-703`.
- drift summaries y FX breakdown ya desacoplados como helpers especializados, aunque siguen siendo llamados desde readers amplios.

### Gap

- `getBankAccountDetail()` reusa `getBankOverview()` y hereda trabajo que no necesita.
- el overview materializa en caliente todas las cuentas del período.
- el drawer rematerializa 12 meses completos para una cuenta antes de responder.
- no existe un read model mensual especializado para el chart del drawer.
- faltan índices compuestos alineados al patrón real de lectura en `income_payments` y `expense_payments`.
- no existe un contrato explícito que diga qué lane refresca overview snapshots vs monthly history.

## Scope

### Slice 1 — Reader contract split

- separar `getBankOverview()` y `getBankAccountDetail()` para que el drawer no invoque el overview completo.
- extraer helpers de lectura dedicados para:
  - snapshot actual por cuenta/período
  - movimientos recientes por cuenta/período
  - metadata básica de la cuenta para header/status
- definir un contrato claro de qué datos son `overview-only`, `detail-only` y `shared`.

### Slice 2 — Monthly history read model

- crear un read model canónico mensual para `account_id + balance_month`.
- materializar `closing_balance`, `closing_balance_clp`, `period_inflows`, `period_outflows`, `fx_gain_loss_clp` por mes.
- backfill inicial para las cuentas existentes y helper de lectura del histórico de 12 meses.

### Slice 3 — Materialization lane cutover

- mover el refresh de snapshots/histórico fuera del request path de UI.
- definir lane canónica:
  - reactiva para cambios de ledger relevantes
  - operativa/manual para backfill o recomputo por rango
  - `ops-worker` para materializaciones pesadas
- dejar los endpoints web leyendo contratos ya listos y, como máximo, validando freshness/degraded state.

### Slice 4 — Query/index hardening

- agregar índices compuestos alineados a los filtros reales de tesorería:
  - `income_payments (payment_account_id, payment_date DESC)` o equivalente con scope si aplica
  - `expense_payments (payment_account_id, payment_date DESC)` o equivalente con scope si aplica
- revisar si el read model mensual requiere índice adicional por `(account_id, balance_month DESC)`.
- medir overview y drawer antes/después en staging.

### Slice 5 — UI + degraded semantics

- `BankView` y `AccountDetailDrawer` deben mostrar estados honestos si el snapshot está stale/degraded, sin disparar recomputo síncrono.
- mantener la UX actual de overview + drawer sin rediseñar la surface.
- documentar el nuevo contrato funcional en finance docs.

## Out of Scope

- rediseño visual de `/finance/bank`
- cambios al modelo contable de reconciliación, OTB, liabilities o FX más allá de lo necesario para el read path
- reemplazo completo del ledger actual
- caching HTTP genérico como parche principal
- nuevas capacidades de permisos, navegación o surface access

## Detailed Spec

El target arquitectónico es:

1. **Write path**
   - `income_payments`, `expense_payments`, `settlement_legs`, reconciliación, OTB
   - emiten señales/eventos para refresh incremental por cuenta/período

2. **Projection path**
   - `account_balances` sigue siendo snapshot diario canónico
   - nuevo snapshot mensual/read model para history del drawer
   - refresh pesado corre fuera del request path

3. **Read path**
   - `/api/finance/bank`:
     - KPIs
     - resumen por cuenta
     - crédito disponible
     - unassigned coverage
   - `/api/finance/bank/[accountId]`:
     - account header/status
     - snapshot actual
     - monthly history
     - recent movements
     - active OTB context

4. **Scalability rule**
   - abrir el drawer no puede gatillar rematerialización de overview global ni recomputo anual por cuenta.

## Acceptance Criteria

- [ ] `GET /api/finance/bank/[accountId]` ya no depende de `getBankOverview()` para responder el drawer.
- [ ] overview y drawer leen snapshots/read models persistidos, no rematerializan inline como comportamiento normal.
- [ ] el chart "Últimos 12 meses" sale desde un read model mensual persistido.
- [ ] existe una lane canónica y documentada para refrescar snapshots fuera del request path.
- [ ] los índices nuevos cubren los filtros principales de pagos por cuenta/fecha.
- [ ] staging muestra mejora material de latencia en `/api/finance/bank` y `/api/finance/bank/[accountId]`.
- [ ] los estados stale/degraded quedan visibles sin ocultar el problema con recomputo síncrono.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm staging:request /api/finance/bank?year=YYYY&month=MM`
- `pnpm staging:request /api/finance/bank/<accountId>?year=YYYY&month=MM`
- validación manual en `/finance/bank` abriendo al menos 2 drawers reales

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` quedo actualizado con el nuevo contrato de lectura/materialización

## Follow-ups

- reliability signal explícita de freshness/staleness para tesorería
- potencial split posterior de `account-balances.ts` en `overview-reader`, `detail-reader` y `materializer`
- consumers adicionales sobre el read model mensual (reportes, health, admin finance)

## Open Questions

- si el snapshot mensual conviene como tabla física reactiva o como materialized view refrescada por lane operativa
- qué SLA de freshness debe prometer `Banco` para overview vs drawer en staging/production
