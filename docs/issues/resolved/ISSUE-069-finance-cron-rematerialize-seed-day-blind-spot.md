# ISSUE-069 — Cron rematerialize-balances deja un día ciego en el límite del lookback

## Ambiente

staging + production

## Detectado

2026-05-08 — Playwright smoke `finance-account-balances-fx-drift.spec.ts` rojo desde 2026-05-08 11:28 UTC. Reliability signal `finance.account_balances.fx_drift` reportando `severity=error, count=1`.

## Síntoma

El reliability signal `finance.account_balances.fx_drift` (subsystem Finance Data Quality) detectó 1 cuenta+fecha con drift entre `closing_balance_clp` persistido y el recompute esperado desde VIEWs canónicas TASK-766.

Caso concreto:

- `account_id = santander-clp` (Santander, CLP nativa)
- `balance_date = 2026-05-01`
- Persistido: `period_inflows=0, period_outflows=0, transaction_count=0`
- Esperado: `period_outflows=$402,562.50 CLP` (2 settlement_legs outgoing creados el 2026-05-02 19:20 UTC con `transaction_date=2026-05-01`)
- Drift: `-$402,562.50`

Hash del balance row roto: `acctbal-santander-clp-2026-05-01` (computed_at: 2026-05-08 09:00:01 UTC, justo después del cron diario).

## Causa raíz

Bug determinístico en el cron Cloud Scheduler `ops-finance-rematerialize-balances` (handler en [services/ops-worker/server.ts:951-1100](services/ops-worker/server.ts#L951-L1100)).

El cron calcula su seed:

```ts
// services/ops-worker/server.ts:963 (commit 7733e562)
const seedDate = new Date(today.getTime() - lookbackDays * 86_400_000)
  .toISOString().slice(0, 10)
// con lookbackDays=7 → seedDate = today − 7d
```

Y llama [`rematerializeAccountBalanceRange`](src/lib/finance/account-balances-rematerialize.ts#L186) con `seedMode='explicit'` y `seedDate = today − 7d`.

**El contrato del rematerializer** ([account-balances-rematerialize.ts:258](src/lib/finance/account-balances-rematerialize.ts#L258)):

```ts
let cursor = addDays(toUtcDate(seedDate), 1)
const stop = toUtcDate(endDate)
while (cursor.getTime() <= stop.getTime()) {
  lastResult = await materializeAccountBalance({ accountId, balanceDate: ymd(cursor), client })
  ...
}
```

El loop empieza en `seedDate + 1`. **El día seed nunca se materializa** — se inserta como "seed row" con `period_inflows=0, period_outflows=0, transaction_count=0` por [insertSeedRow](src/lib/finance/account-balances-rematerialize.ts#L125-L168). Esto es intencional: el día seed es el "ancla de partida", no un día a recomputar.

**Consecuencia operacional**: cualquier `settlement_leg`, `expense_payment` o `income_payment` que llegue retroactivo y caiga exactamente en `today − lookbackDays` queda invisible al cron. Como el window rota cada día, el "día ciego" se mueve diariamente — siempre hay un día sin materializar.

Caso real (Santander 2026-05-01):

| Día | Estado |
|---|---|
| 2026-05-02 | legs creados (con `transaction_date=2026-05-01`) |
| 2026-05-03 a 2026-05-07 | cron diario rematerializó OK (2026-05-01 estaba dentro del window, no era seed) |
| 2026-05-08 09:00 UTC | cron usa `seedDate=2026-05-01` → 2026-05-01 queda como seed row con outflows=0, los legs no se contabilizan |

## Impacto

**Funcionalidad afectada**: precisión de saldos diarios (`account_balances`) cuando hay registros retroactivos.

**Para quién**: cualquier consumer de `account_balances` o `account_balance_clp` (dashboards Finance Bank, drawer cuentas, reconciliation engine, P&L engine, treasury cashflow forecast). Si un saldo se computa con outflows incorrectos para un día específico, todas las agregaciones descendentes lo arrastran.

**Magnitud**: bug determinístico que afecta a TODAS las cuentas y TODOS los días — no es edge case. La probabilidad de detectar drift depende de la frecuencia de retroactivos por cuenta. La mayoría de las cuentas no acumulan retroactivos a diario, por eso el bug pasó desapercibido pre-TASK-774 (que introdujo el reliability signal que ahora lo expone).

**Defense-in-depth ya activa**:

- Reliability signal `finance.account_balances.fx_drift` (TASK-774) detecta el drift en tiempo real.
- Playwright smoke verifica el signal en cada CI run.
- Backfill canónico [`scripts/finance/backfill-account-balances-fx-fix.ts`](scripts/finance/backfill-account-balances-fx-fix.ts) permite recovery one-shot por cuenta.

## Solución

### Fix raíz (1 línea, blast radius mínimo)

Cambiar el seed del cron de `today − lookbackDays` a `today − (lookbackDays + 1)`. Eso desplaza el día seed UN día adicional hacia atrás, garantizando que **los últimos `lookbackDays` días completos se materialicen** (incluyendo lo que antes era el "día ciego").

```ts
// services/ops-worker/server.ts:963 — antes
const seedDate = new Date(today.getTime() - lookbackDays * 86_400_000)
  .toISOString().slice(0, 10)

// después
const seedDate = new Date(today.getTime() - (lookbackDays + 1) * 86_400_000)
  .toISOString().slice(0, 10)
```

**Por qué cumple los 4 pillars**:

| Pillar | Cumplimiento |
|---|---|
| Safety | NO destructivo. Solo amplía 1 día la ventana de cómputo. El día seed sigue siendo "ancla, no se recomputa" — preserva el contrato canónico de `rematerializeAccountBalanceRange`. |
| Robustness | Resuelve el caso retroactivo determinísticamente para CUALQUIER cuenta y CUALQUIER día dentro de los últimos `lookbackDays`. |
| Resilience | Auto-recupera al siguiente run del cron una vez que el día queda dentro del window materializable. |
| Scalability | Costo: 1 día extra de cómputo por cuenta por noche. Trivial. Lineal en número de cuentas (mismo orden que ya tenía). |

### NO se modifica `rematerializeAccountBalanceRange`

Su contrato (seed row no se materializa) es intencional para preservar reconciliation snapshots aceptados (TASK-721) y respetar el OTB anchor (TASK-703). El bug es del **caller** (cron), no de la primitiva canónica.

### Test de regresión

Agregar un test Vitest que reproduzca el escenario:

- Setup: account `test-acc-clp` con OTB en T-30d.
- Crear settlement_leg con `transaction_date = T-7d` (= seedDate del cron) creado retroactivamente.
- Invocar el orchestrator del cron.
- Assert: el balance de T-7d debe tener `period_outflows = monto_del_leg`, NO 0.

### Recovery one-shot del registro ya roto

El cron sólo rolea hacia adelante. El balance de Santander 2026-05-01 ya quedó persistido con outflows=0 y no se va a auto-corregir. Necesita backfill manual una vez:

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/finance/backfill-account-balances-fx-fix.ts \
  --account-id=santander-clp \
  --from-date=2026-05-01
```

## Verificación

1. ✅ Tests Vitest pasan: 7/7 en `services/ops-worker/finance-rematerialize-seed.test.ts` (commit 7483efa2).
2. ✅ ops-worker auto-deployed: workflow `ops-worker-deploy.yml` run para commit `7483efa2`, status `success` (2026-05-08 14:49 UTC).
3. ✅ Backfill recovery aplicado: `santander-clp` rematerializado desde OTB genesis (2026-02-28), 69 días materializados, closing balance final $1,212,492.07. Duración 77.2s.
4. ✅ Reliability signal en steady state: `finance.account_balances.fx_drift` reporta `severity=ok, count=0` post-backfill (verificado via `pnpm staging:request /api/admin/reliability` 2026-05-08 15:02 UTC).
5. ⏳ Próximo Playwright smoke debería pasar (a verificar).
6. ✅ Auditoría retrospectiva: `scripts/finance/diagnose-fx-drift.ts` confirma 0 cuentas con drift en los últimos 90 días post-backfill.

## Resolución

- **Causa raíz fixeada**: helper canónico `computeRematerializeSeedDate(today, lookbackDays)` en `services/ops-worker/finance-rematerialize-seed.ts` resta `lookbackDays + 1` para que los últimos `lookbackDays` días COMPLETOS se materialicen (incluyendo lo que antes era el "día ciego"). El handler `handleFinanceRematerializeBalances` consume el helper canónico.
- **Anti-regresión**: 7 tests pin-ean el contrato (steady state, edge cases lookback=1/30, cross month/year, ISO format guard, día crítico SE materializa).
- **Recovery**: santander-clp 2026-05-01 rematerializado.
- **Defense-in-depth**: regla canónica documentada en `CLAUDE.md` + `AGENTS.md` para que ningún cron futuro re-introduzca el bug.
- **Diagnostic tool**: `scripts/finance/diagnose-fx-drift.ts` queda como herramienta operativa reusable.

## Estado

resolved (2026-05-08)

## Relacionado

- TASK-774 (Account balance CLP-native reader contract) — introdujo el reliability signal que expuso el bug.
- TASK-766 (CLP currency reader contract) — VIEWs canónicas que el reader consume.
- TASK-703 / TASK-703b (OTB cascade-supersede) — contrato del seed que el rematerializer respeta.
- TASK-721 (Evidence canonical uploader) — reconciliation snapshots que protegen el seed row.
- Cron Cloud Scheduler: `ops-finance-rematerialize-balances` en `services/ops-worker/deploy.sh`.
- Spec: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta 2026-05-03 (TASK-774).
