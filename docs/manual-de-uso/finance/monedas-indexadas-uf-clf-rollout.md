# Monedas indexadas UF/CLF — rollout y operación

> **Tipo de documento:** Manual de uso (runbook)
> **Version:** 1.0
> **Creado:** 2026-06-21 por Claude (TASK-995)
> **Ultima actualizacion:** 2026-06-21 por Claude (TASK-995)
> **Modulo:** Finance
> **Documentacion relacionada:** [Monedas y Tipos de Cambio](../../documentation/finance/monedas-y-tipos-de-cambio.md), ADR [`GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1`](../../architecture/GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md), [Feature Flag State Ledger](../../operations/FEATURE_FLAG_STATE_LEDGER.md)

## Para qué sirve

Habilitar que las **Órdenes de Compra que recibimos de clientes en UF** (Unidad de Fomento) se materialicen como factura/income con su **monto nativo en UF + valor legal en CLP**, sin que la UF se trate nunca como dinero de caja. Este manual explica **cómo prender la capability (flags), cómo verificar que funciona y qué NO hacer**.

> Capability code-complete detrás de flags **apagados por defecto**. Mientras estén apagados, UF sigue siendo solo del cotizador y nada cambia. Las compras en UF del lado proveedor (expense) **aún no están habilitadas**.

## Antes de empezar

- Acceso a Vercel CLI con scope `efeonce-7670142f` (`cat .vercel/project.json` debe dar el proyecto canónico).
- Confirmar que la UF está fresca: el signal `finance.uf.rate_freshness` debe estar en `ok` (lee `economic_indicators.UF`).
- Sign-off de Finance para tratar facturas UF como income oficial.

## Los flags (todos `*_ENABLED`, default OFF)

| Flag | Qué habilita |
|---|---|
| `FINANCE_CORE_CLF_INDEXED_ENABLED` | Master: CLF como unidad nativa/indexada de finance-core. |
| `FINANCE_CLF_INCOME_PROJECTION_ENABLED` | Proyectar una cotización/OC en UF → income CLP + plano native UF + snapshot. |
| `FINANCE_CLF_OBLIGATIONS_ENABLED` | (Diferido) obligaciones de pago en UF que liquidan en CLP. |
| `FINANCE_CLF_REPORTING_ENABLED` | (Diferido) exponer el plano UF/indexado en readers. |
| `FINANCE_CLF_BACKFILL_APPLY_ENABLED` | (Diferido) aplicar un backfill allowlisted CLF. |

> Estado vivo siempre en `vercel env ls`; el registro humano está en el [Feature Flag State Ledger](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (§ Pendientes de acción).

## Paso a paso (rollout en staging, luego prod)

1. **Staging primero.** Setear el master + income projection:
   ```bash
   vercel env add FINANCE_CORE_CLF_INDEXED_ENABLED true preview --scope efeonce-7670142f   # (environment develop/staging)
   vercel env add FINANCE_CLF_INCOME_PROJECTION_ENABLED true preview --scope efeonce-7670142f
   ```
2. **Redeploy** staging (los env-var flags se toman en el próximo deploy, no en caliente).
3. **Verificar con una OC/cotización CLF real:** convertir una cotización en UF a factura. El income resultante debe tener:
   - `currency = CLP` (moneda legal/cash),
   - `native_currency = CLF` + `native_amount` = monto UF,
   - `total_amount_clp` = monto UF × valor UF del día,
   - `native_to_functional_fx_snapshot_id` apuntando a un snapshot `CLF→CLP` (`from_unit_class='indexed_unit'`, fuente `economic_indicators.UF`).
4. **Revisar los signals** en `/admin/operations` (todos en `ok`):
   - `finance.uf.rate_freshness`, `finance.indexed_unit.snapshot_missing`, `finance.indexed_unit.native_functional_drift`, `finance.indexed_unit.settlement_currency_violation`.
5. **Producción** tras sign-off de Finance: repetir 1–2 en `production` y verificar con un caso real.
6. **Actualizar el ledger** (§ Snapshot) con el estado nuevo por environment.

## Qué significan los estados / señales

- `finance.uf.rate_freshness` — `warning` si la UF tiene ≥7 días, `error` si ≥30 o no hay UF. Una factura UF no se proyecta sin valor UF (falla en duro, no aplana a CLP en silencio).
- `finance.indexed_unit.snapshot_missing` — un income/expense/obligación CLF sin su snapshot `CLF→CLP`. Steady = 0.
- `finance.indexed_unit.native_functional_drift` — el monto UF × valor UF no cuadra con el CLP funcional. Steady = 0.
- `finance.indexed_unit.settlement_currency_violation` — apareció CLF en una cuenta/orden/leg de caja (no debería pasar nunca). Steady = 0.

## Qué NO hacer

- **No** crear cuentas bancarias, órdenes de pago ni movimientos de caja en CLF. Una OC en UF se **cobra en CLP**. (Hay una guarda que rechaza una orden de pago en CLF con error `unsupported_currency`.)
- **No** recalcular el CLP de una factura UF ya emitida: el valor UF queda congelado en el snapshot. Si la UF cambió al cobro, eso es **revaluación de unidad indexada** (carril aparte), no resultado cambiario ni ingreso.
- **No** prender `FINANCE_CLF_OBLIGATIONS_ENABLED`/`FINANCE_CLF_REPORTING_ENABLED`/`FINANCE_CLF_BACKFILL_APPLY_ENABLED` todavía: sus consumers están diferidos (sin flujo vivo). Prenderlos sin código consumidor no hace nada útil.
- **No** asumir que toda OC de cliente es UF: llegan en UF/MXN/CLP/USD; el sistema enruta por la moneda real de cada OC.

## Problemas comunes

- **"No hay valor UF para proyectar…"** al convertir una cotización CLF → la UF no está fresca en `economic_indicators`. Verificar el sync de indicadores (TASK-058) y `finance.uf.rate_freshness`.
- **La factura quedó en CLP sin plano native UF** → el flag `FINANCE_CLF_INCOME_PROJECTION_ENABLED` está OFF o no se redeployó. Es el comportamiento legacy esperado con flag apagado.
- **Una cotización CLF no convertía antes del rollout** → correcto: sin la capability, `income.currency='CLF'` choca con el CHECK de DB. Con la capability prendida se proyecta como CLP + native UF.

## Referencias técnicas

- ADR: [`GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md`](../../architecture/GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md)
- Proyección: [`src/lib/finance/multi-currency/clf-income-projection.ts`](../../../src/lib/finance/multi-currency/clf-income-projection.ts), snapshot [`fx-snapshot.ts`](../../../src/lib/finance/multi-currency/fx-snapshot.ts)
- Señales: [`src/lib/reliability/queries/indexed-unit-signals.ts`](../../../src/lib/reliability/queries/indexed-unit-signals.ts)
- Spec/task: [TASK-995](../../tasks/in-progress/TASK-995-clf-uf-indexed-finance-core.md)
