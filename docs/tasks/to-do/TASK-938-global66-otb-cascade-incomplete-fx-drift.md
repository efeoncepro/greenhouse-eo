# TASK-938 — Global66 OTB cascade incompleto → fx_drift falso-real + posible regresión de rematerialize

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `remediation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-938-global66-otb-cascade-incomplete`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El signal `finance.account_balances.fx_drift` reporta `error` (2 drifts en `global66-clp`, fechas 2026-03-06 y 2026-04-04) y eso hace fallar el smoke `finance-account-balances-fx-drift.spec.ts` (Playwright en develop). **NO es false-positive del detector ni regresión de TASK-937** — es un **OTB cascade incompleto**: el OTB re-anchor bank-verified de 04-05 ($8.562) existe, pero las transacciones/`account_balances` pre-genesis no quedaron superseded/pruned. Esta task completa el cascade (recovery) e investiga la causa de por qué quedó incompleto (posible regresión: el rematerialize del dedup reciente re-creó filas pre-genesis).

## Why This Task Exists

Investigación en vivo 2026-05-26 (disparada por el fallo de Playwright en el commit `a22390d9`):

- El detector fx_drift (TASK-774) está **correcto**: su SQL filtra `superseded_by_otb_id IS NULL` en settlement_legs y consume las VIEWs normalizadas (TASK-766) que excluyen OTB-superseded. Verificado en `src/lib/reliability/queries/account-balances-fx-drift.ts:188-279`.
- Existe el OTB `obtb-global66-clp-20260405-dcd6d635`: `genesis_date=2026-04-05 SOD`, `opening_balance=8562`, `audit_status=reconciled`, bank-verified (screenshot `global66.com/wallets/2303987` + cartola xls). Supersede el OTB viejo de $380.
- Pero el `cascade_supersede_pre_otb_transactions` (TASK-703b) **no quedó aplicado** para estas fechas:

  | Evidencia (PG live 2026-05-26) | Estado actual | Esperado post-cascade |
  |---|---|---|
  | `expense_payments` 03-06/04-04 `superseded_by_otb_id` | `0` (solo superseded por dedup TASK-936) | marcados con el obtb-id |
  | `account_balances` 03-06 (closing 721.615) | existe | pruned (pre-genesis) |
  | `account_balances` 04-04 (closing 52.790) | existe | pruned (pre-genesis) |
  | `account_balances` 04-05 (closing 8.562) | existe ✓ | correcto (= OTB = banco) |

- El detector flaggea esas 2 filas pre-anchor stale. Su "expected" (1.83M / 1.75M) recomputa el día asumiendo que la fila debe existir — pero **no debe existir** (el OTB la absorbe en $8.562). Por eso ni el persisted (52.790) ni el expected (1.83M) son la verdad: la verdad es el OTB ($8.562).
- **Trampa evitada:** rematerializar a "expected" (1.83M) habría corrompido el saldo alejándolo de la verdad bancaria ($8.562). El fix correcto NO es corregir el día, es completar el cascade para que los días pre-genesis desaparezcan.

**Hipótesis de causa raíz (a confirmar en Slice 1):** el OTB+cascade corrió OK al declararse (2026-04-28), pero el **rematerialize del dedup reciente de Global66 (TASK-936/929, commits ~2026-05-24/25) re-creó los `account_balances` pre-genesis** que el cascade había pruned, porque el seed del rematerialize no respeta el genesis del OTB. Si se confirma, es una regresión sistémica (mirror inverso de TASK-871: en vez de no materializar el seed, materializa días < genesis).

## Goal

- `finance.account_balances.fx_drift` vuelve a `ok` para global66-clp (0 drifts) respetando la verdad bancaria ($8.562 @ 04-05).
- Smoke `finance-account-balances-fx-drift.spec.ts` vuelve verde.
- Confirmar/descartar la regresión del rematerialize (¿re-crea filas pre-genesis?). Si se confirma, fix sistémico para que el rematerialize respete el genesis del OTB.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (OTB cascade-supersede, TASK-703b Delta)
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`
- `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md` (detector fx_drift)
- `docs/tasks/complete/TASK-871-account-balance-rolling-anchor-contract.md` (seed/anchor contract)
- CLAUDE.md — "Finance — OTB cascade-supersede (TASK-703b)" + "Finance — Rolling rematerialize anchor contract (TASK-871)"

Reglas obligatorias:

- **NUNCA** rematerializar a "expected" cuando hay un OTB bank-verified — la verdad es el OTB, no el recompute de los días pre-anchor.
- **NUNCA** DELETE manual de `account_balances` — usar `cascade_supersede_pre_otb_transactions` (TASK-703b).
- **NUNCA** bypassear `evidenceGuard` para "arreglar" estos días — el snapshot 04-04 es reconciled bank-verified; el fix es completar el cascade, no restatear sobre el reconciled.
- Toda mutación es finance → dry-run + autorización operador + idempotencia + reversibilidad documentada.

## Dependencies & Impact

### Depends on

- `greenhouse_finance.cascade_supersede_pre_otb_transactions(account_id, obtb_id, genesis_date, reason)` (migration `20260428000125705` + `20260428085056958`).
- `greenhouse_finance.account_opening_trial_balance` (OTB `obtb-global66-clp-20260405-dcd6d635`).
- `scripts/finance/rematerialize-account.ts` / `rematerialize-account-balances.ts`.
- `declareOpeningTrialBalance` (`src/lib/finance/account-opening-trial-balance.ts:190`).

### Blocks / Impacts

- Desbloquea el smoke `finance-account-balances-fx-drift.spec.ts` (Playwright develop, rojo desde commit `8191ed9b`/`a22390d9`).
- Relacionada con TASK-929/934/936 (dedup Global66) — el dedup reciente es el sospechoso de re-crear las filas pre-genesis.
- Si se confirma regresión del rematerialize: impacta el contrato TASK-871 (rolling anchor) y cualquier cuenta con OTB re-anchor.

### Files owned

- `docs/tasks/to-do/TASK-938-*.md`
- (Slice 2, si aplica) `src/lib/finance/account-balances-rematerialize.ts` o el seed resolver, para respetar genesis OTB.

## Current Repo State

### Already exists

- Detector fx_drift correcto (respeta `superseded_by_otb_id`).
- Función cascade canónica TASK-703b.
- OTB bank-verified declarado.
- Scripts de rematerialize + diagnóstico (`scripts/finance/diagnose-fx-drift.ts`).

### Gap

- El cascade del OTB 04-05 no está aplicado a la data actual (payments no superseded_by_otb_id, account_balances pre-genesis no pruned).
- No está confirmado QUÉ re-creó las filas pre-genesis (dedup rematerialize sospechoso).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Confirmar causa raíz (read-only)

- Verificar si el rematerialize/dedup reciente re-crea filas `account_balances` con `balance_date < genesis_date` del OTB. Reproducir: rematerializar global66-clp en un entorno seguro y observar si re-aparecen 03-06/04-04.
- Determinar si el `cascade_supersede_pre_otb_transactions` original (2026-04-28) realmente pruned esas filas y algo las re-creó, o si nunca corrió completo.
- Decisión: ¿fix one-time (re-correr cascade) o fix sistémico (rematerialize respeta genesis)?

### Slice 2 — Recovery one-time (gated, dry-run primero)

- Re-correr `cascade_supersede_pre_otb_transactions('global66-clp', 'obtb-global66-clp-20260405-dcd6d635', '2026-04-05', 'TASK-938 re-run cascade — pre-anchor rows re-created post-dedup')`.
- Rematerializar desde genesis 04-05 (`scripts/finance/rematerialize-account.ts`).
- Verificar: account_balances 03-06/04-04 pruned, payments superseded_by_otb_id, closing 04-05 = 8.562, signal fx_drift = ok.

### Slice 3 — Fix sistémico (solo si Slice 1 confirma regresión)

- Que el rematerialize/seed resolver **no materialice días `< genesis_date`** del OTB activo (extender el contrato TASK-871). Tests anti-regresión.

### Slice 4 — Verificación

- `pnpm staging:request '/api/admin/reliability'` → fx_drift ok.
- Re-disparar Playwright smoke `finance-account-balances-fx-drift.spec.ts` → verde.

## Out of Scope

- Tocar el detector fx_drift (está correcto).
- Bypassear evidenceGuard / restatear el snapshot reconciled 04-04 (es bank-verified, no se toca).
- Rematerializar a "expected" (corrompería la verdad bancaria).

## Rollout Plan & Risk Matrix

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Re-correr cascade sin confirmar causa → se vuelve a re-crear post próximo rematerialize | finance/OTB | medium | Slice 1 confirma causa antes de Slice 2; si es regresión, Slice 3 la cierra | `finance.account_balances.fx_drift` |
| Rematerialize corrompe saldo vs bank truth | finance | low | genesis OTB ancla en 8.562 bank-verified; cascade prunea pre-anchor; dry-run primero | fx_drift |
| Cascade marca de más (payments post-genesis) | finance | low | la función filtra `transaction_date < genesis_date` (04-05); payments 04-05+ intactos | fx_drift |

### Feature flags / cutover

Sin flag — recovery one-time + (si aplica) fix de contrato. Dry-run obligatorio antes de cualquier apply.

### Rollback plan per slice

- Slice 2: el supersede es append-only (audit-preserved); los account_balances pruned se rematerializan. Si algo sale mal, re-rematerializar desde genesis. El OTB original intacto.

## 4-Pillar Score

- **Safety**: mutación finance gated por autorización operador + dry-run; no toca el snapshot reconciled bank-verified; blast radius = 1 cuenta (global66-clp). Residual: si Slice 1 no se hace, Slice 2 puede recurrir.
- **Robustness**: cascade idempotente (filtra por genesis_date); rematerialize idempotente.
- **Resilience**: signal `finance.account_balances.fx_drift` detecta recurrencia (steady=0).
- **Scalability**: 1 cuenta, 1 OTB — trivial.

## Hard Rules

- **NUNCA** rematerializar a expected con OTB bank-verified presente.
- **NUNCA** DELETE manual de account_balances — usar el cascade.
- **SIEMPRE** dry-run + autorización antes de mutar finance.

## Open Questions

- ¿El rematerialize del dedup (TASK-936/929) re-crea filas pre-genesis? (Slice 1 lo confirma — define si hay fix sistémico Slice 3.)
- ¿Hay otras cuentas con OTB re-anchor afectadas por la misma regresión? (escanear post-Slice 1.)
