# TASK-714d (umbrella) — Internal Transfer Pair Invariant + Global66 ledger canonicalization

## Status

- Lifecycle: `to-do` (umbrella, parcialmente cerrada)
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto` (ya ejecutados Slice 1 + Slice 2 Global66)
- Type: `umbrella`
- Domain: `finance`
- Branch: `task/TASK-714d-internal-transfer-pair-invariant-and-global66`

## Summary

Garantizar que TODO `settlement_group` con `leg_type='internal_transfer'` mantenga el invariante bilateral (`out_count = in_count`) y reclasificar correctamente las salidas Global66 que son pagos de payroll a colaboradores externos (Daniela, Andrés, David).

Esta umbrella tiene 4 slices, 2 ya ejecutados al 2026-04-28.

## Slices

### Slice 1 — Detector + helper canónico ✅ EJECUTADO 2026-04-28

- ✅ Helper canónico `createInternalTransferSettlement` (ya existente en `anchored-payments.ts`) emite par completo (out + in) atómicamente.
- ✅ Detector ledger-health `task714d.internalTransferGroupsWithMissingPair`. Steady state esperado: 0.
- ✅ Tests cubriendo el detector (4/4 pass).
- ✅ El detector flagged 8 settlement_groups imbalanced — los 5 de Global66 (resueltos en Slice 2) y los 3 de Santander Corp TC (deferidos a Slice 4).

### Slice 2 — Backfill Global66 ✅ EJECUTADO 2026-04-28

- ✅ Script `scripts/finance/backfill-internal-transfer-pairs.ts` con dry-run + apply, idempotente, con verificación pre/post-flight de closing balances.
- ✅ Aplicado contra `--target-account global66-clp`. 5 grupos viejos superseded + recreados via helper canónico.
- ✅ **Invariante de seguridad respetado**: closing Santander CLP 28/04 = $4,172,563 SIN cambios. Closing Global66 28/04 = $8,562 SIN cambios (DIFF = 0).
- ✅ Re-detector post-apply: pasamos de 8 imbalanced → 3 (solo TC pendiente).
- ✅ Global66 ahora muestra inflows correctos (e.g. 04/04: $1,865,465 entrantes desde Santander, $1,865,465 salientes a Daniela/Andrés/FX fees, neto $0).
- ✅ **Post-flight read model refresh** (2026-04-28): después del backfill las daily `account_balances` quedaron correctas pero `account_balances_monthly` (read model TASK-705 que consume el drawer chart) seguía con el snapshot pre-backfill — el chart quedaba vacío. Refresco aplicado via `refreshMonthlyBatch` para 2026-03 y 2026-04. Estado post-refresh: 2026-04 closing=$8,562 (preservado), in=$1,865,465 = out=$1,865,465 (cuadrado). El drawer chart ahora pinta correctamente.

#### Hygiene rule reusable

Cualquier script de backfill que toque settlement_legs / income_payments / expense_payments y luego llame `rematerializeAccountBalancesFromDate` debe **también** refrescar `account_balances_monthly` para los meses tocados. La rematerialize daily NO dispara el read model mensual — eso requiere `refreshMonthlyBatch(items)` explícito o esperar a la lane reactiva del worker.

Patrón canónico post-backfill:

```ts
import { refreshMonthlyBatch } from '@/lib/finance/account-balances-monthly'

// Después de rematerializeAccountBalancesFromDate, calcular meses tocados
const monthsTouched = new Set<string>() // 'YYYY-MM' keys
for (const o of orphans) monthsTouched.add(o.transaction_date.slice(0, 7))

const items = Array.from(monthsTouched).map(key => ({
  accountId: targetAccount,
  year: Number(key.slice(0, 4)),
  month: Number(key.slice(5, 7))
}))

await refreshMonthlyBatch(items)
```

**Followup pendiente** (no bloquea): el path `historySource='recompute'` en `getAccountDetailOverview` (`src/lib/finance/account-balances.ts:1641`) usa `DISTINCT ON (date_trunc('month', balance_date))` que retorna sólo el último día del mes — pierde los `period_inflows`/`period_outflows` del resto del mes. Bug pre-existente sin impacto hoy (drawer usa `monthly_read_model`). Se debe reemplazar por `SUM(period_inflows)` agrupado cuando se aborde. Tracking: deferido a Slice 5.

### Slice 3 — Reclasificación payroll Global66 ⏳ PENDIENTE

Los 8 expense_payments con `payment_account_id='global66-clp'` están como `expense_type='supplier'` cuando deberían ser:

| Reference | Monto | Beneficiario | Reclasificar a |
|---|---|---|---|
| g66-20260404-daniela-1090731 | $1,090,731 | Daniela Ferreira (España) | `payroll`, `member_id`, `direct_member` |
| g66-20260404-andres-688058 | $688,058 | Andrés (Colombia) | `payroll`, `member_id`, `direct_member` |
| g66-20260311-david-632040 | $632,040 | David Carlosama (Colombia) | `payroll`, `member_id`, `direct_member` |
| g66-20260306-daniela-1034522 | $1,034,522 | Daniela Ferreira (España) | `payroll`, `member_id`, `direct_member` |
| g66-20260404-fxfee-46631 | $46,631 | Global66 FX fee | mantener como `bank_fee` ✓ |
| g66-20260404-fxfee-40045 | $40,045 | Global66 FX fee | mantener como `bank_fee` ✓ |
| g66-20260310-fxfee-36785 | $36,785 | Global66 FX fee | mantener como `bank_fee` ✓ |
| g66-20260305-fxfee-44228 | $44,228 | Global66 FX fee | mantener como `bank_fee` ✓ |

Decisiones operativas requeridas del usuario:

1. **member_id**: ¿Daniela/Andrés/David existen como `team_members` con `member_id`? Si no, crearlos antes.
2. **Atribución a cliente**: ¿están asignados a un cliente específico (Sky Airline, GORE, etc.) via `client_team_assignments`? Eso decide la atribución de `cost_category='direct_member'` y `allocated_client_id`.
3. **Payroll period link**: ¿hay `payroll_entries` para febrero/marzo 2026 que estos pagos deberían anclar?

Sin esas decisiones, no se puede ejecutar la reclasificación. La task queda bloqueada por input humano.

#### Plan ejecutable cuando se desbloquee

- Script `scripts/finance/reclassify-global66-payroll.ts` con dry-run + apply.
- Cascade-supersede del expense_payment legacy + creación canónica via factory `createPayrollExpensePayment` (verificar existencia, sino crear).
- Recompute reactivo de `commercial_cost_attribution` + `client_economics` + `client_labor_cost_allocation_consolidated` (TASK-709) para meses afectados.
- Verificación drift: `labor_allocation_saturation_drift` en 0.
- Closing Global66 NO debe cambiar (cambio interno de categoría).

### Slice 4 — TC (Santander Corp) backfill ⏳ DEFERIDA

Los 3 grupos TC pendientes:

| Group | Date | Amount | Notas |
|---|---|---|---|
| stlgrp-itx-20260306-amcg | 03/06 | $597,697 | santander-clp → santander-corp-clp |
| stlgrp-itx-20260312-l45c | 03/12 | $1,003,975 | santander-clp → santander-corp-clp |
| stlgrp-itx-20260406-9uwu | 04/06 | $696,198 | santander-clp → santander-corp-clp |

**Razón de deferral**: TC es liability. Las legs `incoming` faltantes, si se backfillean, se interpretarán como "pagos recibidos = reducción de deuda". PERO esos pagos pueden estar siendo modelados como `expense_payments` con `payment_account_id='santander-corp-clp'` (cargos a TC con la app), lo cual causa **doble conteo si ambos modelos coexisten**.

Antes de ejecutar Slice 4 hay que verificar:

1. ¿Las 3 transferencias Santander → TC ya están reflejadas como reducción de deuda en los `expense_payments` actuales de TC?
2. Si sí: NO crear las legs `incoming` (sería duplicación). En su lugar SUPERSEDE las legs `outgoing` de Santander como `internal_transfer` y registrarlas como `expense_payment` desde Santander hacia el supplier "Santander Corp TC" (porque el cash sale de Santander para reducir deuda TC).
3. Si no: backfillear el par bilateral con el script (idéntico al Global66).

**Verificación**: closing TC 28/04 = $268,442 (snapshot reportado). Calcular el closing esperado bajo cada modelo y comparar.

#### Plan ejecutable cuando se desbloquee

- Análisis read-only de `expense_payments` con `payment_account_id='santander-corp-clp'` para detectar duplicación potencial.
- Decisión arquitectónica: bilateral internal_transfer vs expense_payment como pago de deuda.
- Script + apply con verificación pre/post-flight.

### Slice 5 — Verificación OTB Global66 ⏳ PENDIENTE

El opening_balance de Global66 es **$8,562 al 2026-04-05**. Las transferencias del 03/06 y 04/04 ya están post-OTB Global66, pero la cartola Global66 muestra movimientos pre-04/05 (febrero $825k + $1,085k). Esos están absorbidos en el OTB.

Verificación pendiente:
- Saldo real Global66 al 04/04/2026 según cartola Global66.
- Si != $52,790 (closing actual de account_balances al 04-04), declarar nuevo OTB con cascade-supersede.

## Out of Scope

- Refactor estructural del settlement_model como tabla formal `internal_transfers` (Nivel C del análisis original). Volumen actual no lo justifica.
- TASK-707 (Previred runtime). Independiente.
- UI changes en el drawer de Global66 (TASK-714 / TASK-706 ya cubrieron).

## Acceptance Criteria

- [x] Detector ledger-health `task714d.internalTransferGroupsWithMissingPair` (Slice 1).
- [x] Helper canónico ya disponible (Slice 1).
- [x] Backfill Global66 ejecutado SIN drift (Slice 2).
- [ ] Reclasificación payroll Daniela/Andrés/David (Slice 3 — bloqueado por input humano).
- [ ] TC backfill o reclasificación (Slice 4 — bloqueado por análisis).
- [ ] OTB Global66 verificado (Slice 5).

## Verification

- Detector live: `task714d.internalTransferGroupsWithMissingPair = 3` post-Slice 2 (los 3 TC remanentes). Steady state esperado = 0 cuando Slice 4 cierre.
- Global66 4/04: inflows $1,865,465 + outflows $1,865,465 (cuadrado).
- Santander CLP 28/04: $4,172,563 (sin cambios respecto pre-Slice 2).

## Closing Protocol

- Cierre de la umbrella requiere las 4 slices completas.
- Slices 1+2 ya cerrados — quedan en este markdown como audit.
- Slices 3+4+5 derivadas a tasks dedicadas (2026-04-28):
  - **Slice 3** → `TASK-717` (reclasificación payroll declarativa via intents table)
  - **Slice 4** → `TASK-718` (TC backfill: análisis automatizado debt-reduction model + apply)
  - **Slice 5** → `TASK-719` (OTB Global66 verificación contra cartola + detector evidence_refs)
- La umbrella se cierra cuando las 3 derivadas estén `complete`.

## Hard rules aplicadas

- Cero DELETE en settlement_legs.
- Cero rematerialize de cuentas fuera del scope de cada slice.
- Verificación pre/post-flight de closing balances en cada apply.
- WHERE clauses enforcement por scope explícito.

## Delta 2026-05-25 — El detector de imbalance produce falsos positivos por OTB-supersede (diagnóstico TASK-929)

Durante TASK-929 (finance ledger drift remediation) se trazaron los 3 grupos que el detector `TASK714D_INTERNAL_TRANSFER_PAIR_IMBALANCE_COUNT_SQL` ([src/lib/finance/ledger-health.ts](../../../src/lib/finance/ledger-health.ts)) reporta como desbalanceados. **No son transferencias incompletas — son falsos positivos del detector, misma bug class que TASK-929 Slice 1 arregló en la VIEW de settlement.**

### Los 3 grupos (trazados live 2026-05-25 contra greenhouse-pg-dev)

| settlement_group_id | De | A | Monto | Fecha transfer |
|---|---|---|---|---|
| `stlgrp-itx-20260306-amcg` | `santander-clp` | `santander-corp-clp` (tarjeta crédito) | $597.697 | 2026-03-06 |
| `stlgrp-itx-20260312-l45c` | `santander-clp` | `santander-corp-clp` | $1.003.975 | 2026-03-12 |
| `stlgrp-itx-20260406-9uwu` | `santander-clp` | `santander-corp-clp` | $696.198 | 2026-04-06 |

Son **pagos de la cuenta corriente Santander hacia la tarjeta de crédito Santander Corp** (abonos a la deuda de la tarjeta).

### Causa raíz del falso positivo

Cada grupo **SÍ tiene ambas patas** (outgoing + incoming, creadas juntas el backfill 2026-04-27). Pero la **pata `incoming` (lado tarjeta) fue superseded por un re-anclaje OTB (TASK-703b)** el 2026-04-28 (`superseded_by_otb_id = obtb-santander-corp-clp-2026040{6,7}-...`): cuando se recalibró el OTB de la tarjeta al cierre de ciclo de marzo, el cascade-supersede absorbió esos abonos pre-anchor dentro del saldo de apertura. La pata `outgoing` (lado cuenta corriente) queda activa porque a `santander-clp` NO se la re-ancló.

El detector filtra `superseded_at IS NULL AND superseded_by_otb_id IS NULL` y cuenta patas activas → ve `out=1, in=0` → flag. Pero la transferencia está completa y ambas cuentas consistentes (la tarjeta absorbió la entrada en su saldo de apertura). **El ledger está correcto; el detector no entiende el OTB-supersede.**

### Fix canónico (espejar TASK-929 Slice 1)

El detector debe chequear **completitud del par ORIGINAL** (todas las patas creadas, incluyendo superseded), no solo patas activas. Casos a distinguir con tests:

1. **Nunca existió pata incoming** (0 incoming en el historial completo) → desbalance REAL (mantener flag — el caso para el que nació TASK-714d, e.g. salidas Global66 sin pata).
2. **Pata incoming superseded por OTB** (`superseded_by_otb_id IS NOT NULL`) → falso positivo (par completo, entrada absorbida en saldo de apertura). NO flag.
3. **Pata superseded por payment** (`superseded_by_payment_id IS NOT NULL`) → mirar el reemplazo antes de decidir.

**Regla candidata provably-safe**: un grupo es imbalance solo si `COUNT(outgoing ever) <> COUNT(incoming ever)` (contando TODAS las patas, superseded incluidas) — esto NO puede ocultar el caso "nunca existió" (sigue dando 1≠0 → flag) y des-flaggea el caso OTB-absorbed (1 ever out, 1 ever in → balanceado). Edge a cubrir con tests: patas reemplazadas por payment-supersede (una pata + su reemplazo darían 2 vs 1).

**Por qué NO se arregló en TASK-929**: el detector es invariante canónico de TASK-714d (su dueño). Un fix demasiado permisivo ocultaría un faltante real de plata (false-negative = el modo de falla más grave en un ledger). Hacerlo robusto requiere el razonamiento de historial de patas + tests por caso + entender la interacción con `createInternalTransferSettlement` + el OTB cascade — dominio de TASK-714d. Decisión 4-pillar documentada en TASK-929 (lente arch-architect): el rojo honesto del detector es más seguro que un verde tuneado sin owner del invariante.

**Estado**: estos 3 NO son plata a recuperar. El detector debe arreglarse (read-only, blast bajo) para dejar de generar el falso positivo. Bloquea el cierre de `JAVASCRIPT-NEXTJS-4Q` mientras el detector siga reportándolos.
