# TASK-718 — TC backfill: análisis automatizado debt-reduction model + apply

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (el análisis es read-only y resuelve la decisión)
- Branch: `task/TASK-718-tc-debt-reduction-model-decision`
- Origin: derivada de TASK-714d Slice 4

## Summary

Resolver el deferral del backfill de los 3 settlement_groups Santander Corp TC (`stlgrp-itx-20260306-amcg`, `20260312-l45c`, `20260406-9uwu`) via análisis read-only automatizado que decide entre 2 modelos: (A) bilateral internal_transfer — backfilear leg `incoming` TC, o (B) expense reduction — supersede outgoing Santander como `expense_payment` hacia supplier "Santander Corp TC". Decisión data-driven contra closing TC reportado por banco ($268,442 al 28/04), no humana.

## Why This Task Exists

TASK-714d Slice 4 quedó deferida porque crear las legs `incoming` faltantes en TC podría duplicar lo que ya está modelado como `expense_payments` con `payment_account_id='santander-corp-clp'` (cargos a TC). Sin análisis previo, no se puede aplicar el backfill genérico de Slice 2 — riesgo de double-counting. El análisis manual no escala: la próxima vez que aparezca este patrón (otro liability account con transfers ambiguos), vuelve a bloquear.

Solución: script analizador que computa ambos modelos hipotéticos, los compara contra realidad bancaria, y emite recomendación binaria. Después, ejecutor con flag `--model=A|B`.

## Goal

- Script `scripts/finance/analyze-tc-debt-reduction-model.ts` (read-only)
- Output: tabla por settlement_group con expected closing TC bajo cada modelo + recomendación
- Script `scripts/finance/backfill-tc-internal-transfer-pairs.ts` con `--model=A|B --apply`
- Modelo A reusa `backfill-internal-transfer-pairs.ts` con `--target-account santander-corp-clp`
- Modelo B nuevo path: supersede outgoing Santander + emit pareja `expense_payment` via `createSupplierExpensePayment`
- Hardening: extender `createInternalTransferSettlement` con `liabilityCounterpartyMode` para prevenir reincidencia
- Closing TC al 28/04 debe quedar $268,442 ± tolerancia post-apply
- Detector `task714d.internalTransferGroupsWithMissingPair` debe llegar a 0

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md` (sign convention liability)
- CLAUDE.md sección "Finance — OTB cascade-supersede" (patrón liability)
- CLAUDE.md sección "Finance — Internal Account Number Allocator" (provider model)

Reglas obligatorias:

- Cero DELETE en `settlement_legs` o `expense_payments`. Cascade-supersede only.
- Pre/post-flight verification de closings TC + Santander + Santander Corp.
- Closing Santander CLP unchanged (invariante TASK-714d).
- Sign convention liability: positivo = deuda activa, negativo = crédito a favor.
- Idempotencia: rerunear script no debe duplicar.

## Dependencies & Impact

### Depends on

- TASK-703 (OTB liability sign convention)
- TASK-714d Slice 1 (detector internal_transfer pair invariant)
- Helper `createInternalTransferSettlement`
- Helper `createSupplierExpensePayment` (verificar existencia)
- Cartola TC reciente con closing al 28/04 (evidence ref)

### Blocks / Impacts

- TASK-714d cierre umbrella (Slice 4 dependency)
- Patrón reusable para futuros liability transfers (intercompany loans, factoring fees)

### Files owned

- `scripts/finance/analyze-tc-debt-reduction-model.ts`
- `scripts/finance/backfill-tc-internal-transfer-pairs.ts`
- `src/lib/finance/payment-instruments/anchored-payments.ts` (extensión `liabilityCounterpartyMode`)
- `src/lib/finance/__tests__/tc-debt-reduction-model.test.ts`

## Current Repo State

### Already exists

- 3 settlement_groups TC imbalanced (5 legs total: 3 outgoing Santander, 0 incoming TC)
- Detector `task714d.internalTransferGroupsWithMissingPair` reportando 3
- Script `backfill-internal-transfer-pairs.ts` (reusable para Modelo A)
- Helper `createInternalTransferSettlement`

### Gap

- No existe script analizador de debt-reduction model
- No existe path Modelo B en `backfill-internal-transfer-pairs` (asume bilateral siempre)
- `createInternalTransferSettlement` no distingue asset↔asset vs asset↔liability
- No hay supplier "Santander Corp TC" registrado (necesario para Modelo B)

## Scope

### Slice 1 — Análisis read-only

- Script `analyze-tc-debt-reduction-model.ts`:
  - Para cada uno de los 3 settlement_groups TC imbalanced:
    - Listar `expense_payments` con `payment_account_id='santander-corp-clp'` en ventana ±3 días
    - Listar `settlement_legs` con `instrument_id='santander-corp-clp'` (todos los axes superseded)
    - Computar closing TC al 28/04 bajo Modelo A (bilateral) y Modelo B (expense reduction)
  - Comparar contra $268,442 (cartola)
  - Emitir recomendación: A o B con justificación numérica
- Output JSON + console table
- Tests: 3-4 tests con fixtures de cada modelo

### Slice 2 — Ejecutor Modelo A o B

- Si análisis decide Modelo A: ejecutar `backfill-internal-transfer-pairs.ts --target-account santander-corp-clp --apply`
- Si análisis decide Modelo B: nuevo script `backfill-tc-internal-transfer-pairs.ts --model=B --apply`:
  - Supersede leg `outgoing` Santander como `internal_transfer` superseded_by con razón
  - Crear `expense_payment` desde Santander hacia supplier "Santander Corp TC"
  - Settlement leg pareja en Santander como `expense_payment` outgoing, en TC como `expense_payment` incoming (reduce deuda)
- Pre/post-flight verification idéntico a Slice 2 de TASK-714d
- Tests: 4-5 tests cubriendo apply + idempotencia + drift detection

### Slice 3 — Hardening helper

- Extender `createInternalTransferSettlement` con parámetro `liabilityCounterpartyMode: 'create_pair' | 'expense_reduction'`
- Detección automática del mode basado en `instrument_category` del destination (si liability → preguntar)
- Tests de regresión: existing callers no rompen (default `create_pair`)

## Out of Scope

- Backfill de OTB TC (separado, TASK-714d Slice 5 / TASK-719)
- Reclasificación payroll Global66 (TASK-717)
- Otros liability accounts (employee_wallet, intercompany_loan) — emergerán cuando aparezcan

## Detailed Spec

### Decisión Modelo A vs Modelo B — algoritmo

```
Para cada grupo G en [amcg, l45c, 9uwu]:
  amount = G.outgoing_leg.amount  // e.g. $597,697
  date = G.outgoing_leg.transaction_date
  
  // Modelo A — bilateral
  closing_TC_modelA = closing_TC_actual - amount  // crear incoming reduce deuda
  
  // Modelo B — expense reduction
  // El expense_payment ya existe en TC, no añade reducción adicional
  // Solo supersede outgoing Santander como expense_payment outgoing
  closing_TC_modelB = closing_TC_actual  // sin cambio neto

cartola = $268,442

Si abs(sum(closing_TC_modelA) - cartola) < abs(sum(closing_TC_modelB) - cartola):
  recomendación = "Modelo A — bilateral"
Sino:
  recomendación = "Modelo B — expense reduction"
```

### Nota de la sign convention

- Si TC closing actual = $300,000 y cartola = $268,442:
  - Modelo A: $300k - $597k - $1,003k - $696k = -$1,996k (deuda negativa = crédito a favor — IMPOSIBLE)
  - Modelo B: $300k unchanged → drift $32k atribuible a otros movimientos
  - Modelo B gana
- Si TC closing actual = $2,565,872 (suma de los 3 + cartola):
  - Modelo A: $2,565k - $2,297k = $268k ✓ matches cartola
  - Modelo B: $2,565k drift $2,297k del cartola — IMPOSIBLE
  - Modelo A gana

El análisis debe ejecutar este cálculo con datos reales de PG.

## Acceptance Criteria

- [ ] Script analizador emite recomendación A o B con justificación numérica
- [ ] Script ejecutor maneja ambos modelos
- [ ] Helper `createInternalTransferSettlement` extendido con `liabilityCounterpartyMode`
- [ ] Closing TC 28/04 = $268,442 ± tolerancia post-apply
- [ ] Closing Santander CLP 28/04 = $4,172,563 SIN cambios
- [ ] Detector `task714d.internalTransferGroupsWithMissingPair` = 0 post-apply
- [ ] Tests pass (10+ tests entre análisis, ejecutor, helper)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/tc-debt-reduction-model.test.ts`
- Análisis read-only ejecutado y resultado revisado por humano antes de apply
- Apply en staging si es posible, sino dry-run extensivo
- Verificación post-apply: closings + detector + drift

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado: TASK-714d Slice 4 marcar como cerrado
- [ ] Detector `task714d.internalTransferGroupsWithMissingPair = 0` confirmado en producción

## Follow-ups

- Extender el patrón a otros liability accounts cuando emerjan
- Documentar en spec arquitectónica el helper extendido como canónico

## Open Questions

- ¿Existe supplier "Santander Corp TC" registrado, o hay que crearlo? (Modelo B lo requiere)
- ¿La cartola TC al 28/04 está en `account_balances.closing_balance` para `santander-corp-clp`, o solo en bank export externo?
