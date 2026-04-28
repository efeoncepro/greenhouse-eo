# TASK-719 — OTB Global66 verificación contra cartola + detector de evidence_refs

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (requiere captura de cartola Global66 al 2026-04-05)
- Branch: `task/TASK-719-otb-global66-verification-and-evidence-detector`
- Origin: derivada de TASK-714d Slice 5

## Summary

Verificar que el OTB declarado de Global66 ($8,562 al 2026-04-05) calza con la cartola Global66 real en esa fecha. Si discrepa, ejecutar cascade-supersede patrón TASK-703b. Adicionalmente, agregar detector ledger-health `task719.openingTrialBalancesWithoutEvidence` que cuenta OTBs activas sin `evidence_refs` poblado — empuja a que toda OTB futura nazca con cartola adjunta.

## Why This Task Exists

TASK-714d Slice 5 quedó pendiente: el OTB de Global66 fue declarado con valor $8,562 al 2026-04-05, pero no se verificó contra cartola Global66 real. Si el valor real banco es distinto, el chain de account_balances arrastra drift estructural que se va a manifestar en cascade en cualquier reconciliación futura. Adicionalmente, el sistema permite declarar OTBs sin `evidence_refs` — eso degrada la auditabilidad y permite reincidencia.

## Goal

- Captura de cartola Global66 al 2026-04-05 (PDF/screenshot/export) subida a evidence storage
- Test de integración que asserta `OTB(global66-clp).openingBalance === bank_reality && evidenceRefs nonempty`
- Si discrepa: cascade-supersede via `pnpm finance:declare-otbs` con nuevo anchor + `rematerialize-account.ts` + `refreshMonthlyBatch` (hygiene rule TASK-714d)
- Detector ledger-health `task719.openingTrialBalancesWithoutEvidence` (steady state = 0)
- Documentación actualizada del patrón en CLAUDE.md (sección OTB)

## Architecture Alignment

- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`
- CLAUDE.md sección "Finance — OTB cascade-supersede"
- CLAUDE.md sección "Slice 2 — Backfill Global66 — Hygiene rule reusable" (post-backfill monthly refresh)

Reglas obligatorias:

- Cero DELETE manual de `account_balances` o `expense_payments`
- Si re-anchor: usar `cascade_supersede_pre_otb_transactions` SQL function
- Post-supersede: rematerialize daily + `refreshMonthlyBatch` para meses afectados
- Evidence ref obligatorio: PDF/screenshot/export con timestamp visible

## Dependencies & Impact

### Depends on

- TASK-703b (cascade-supersede pattern)
- TASK-714d Slice 2 (post-backfill hygiene rule documentada)
- Cartola Global66 al 2026-04-05 (input externo)

### Blocks / Impacts

- TASK-714d cierre umbrella (Slice 5 dependency)
- Disciplina de evidence_refs en futuras OTBs

### Files owned

- `src/lib/finance/__tests__/otb-global66-verification.test.ts`
- `src/lib/finance/ledger-health.ts` (nuevo detector)
- `evidence/global66-cartola-20260405.pdf` (path TBD según evidence storage)
- `CLAUDE.md` (update sección OTB)
- `scripts/finance/declare-opening-trial-balances.ts` (update si re-anchor necesario)

## Current Repo State

### Already exists

- OTB Global66 activo: $8,562 al 2026-04-05 (declarado, sin verificar contra banco)
- Helper `getActiveOpeningTrialBalance(accountId)` — verificar nombre exacto en repo
- Patrón cascade-supersede via `declareOpeningTrialBalance` documentado y probado
- Hygiene rule monthly read model refresh post-rematerialize

### Gap

- No existe captura de cartola Global66 al 2026-04-05 en evidence storage
- No existe test de paridad OTB ↔ cartola
- Detector ledger-health no incluye check de `evidence_refs IS NOT NULL`
- Sin disciplina enforced, futuras OTBs pueden declararse sin evidence

## Scope

### Slice 1 — Captura + verificación

- Subir cartola Global66 al 2026-04-05 a evidence storage
- Update fila `account_opening_trial_balance` para `global66-clp` con `evidence_refs` poblado
- Test de integración:
  ```ts
  it('Global66 OTB matches bank cartola', async () => {
    const otb = await getActiveOpeningTrialBalance('global66-clp')
    expect(otb.genesisDate).toBe('2026-04-05')
    expect(Number(otb.openingBalance)).toBe(8562)
    expect(otb.evidenceRefs.length).toBeGreaterThan(0)
  })
  ```
- Si la cartola revela un valor distinto: ejecutar cascade-supersede

### Slice 2 — Cascade re-anchor (condicional)

- SOLO si Slice 1 detecta discrepancia
- Editar `scripts/finance/declare-opening-trial-balances.ts` con nuevo `genesisDate` + `openingBalance`
- `pnpm finance:declare-otbs`
- `pnpm tsx ... rematerialize-account.ts global66-clp`
- `refreshMonthlyBatch` para meses afectados
- Verificar: closing post-rematerialize ≈ realidad banco actual ($8,562 si no cambia, o nuevo valor)

### Slice 3 — Detector evidence_refs

- Nueva métrica `task719.openingTrialBalancesWithoutEvidence` en `getFinanceLedgerHealth`
- SQL: `SELECT COUNT(*) FROM account_opening_trial_balance WHERE superseded_by IS NULL AND (evidence_refs IS NULL OR jsonb_array_length(evidence_refs) = 0)`
- Surface en Reliability dashboard como warning (no critical — pre-existing OTBs pueden no tener)
- Tests: 3 tests cubriendo steady state, flag con sample, graceful degradation

## Out of Scope

- Verificación de OTBs de otras cuentas (Santander CLP, TC, CCAs) — separar en tasks por cuenta si necesario
- UI admin para subir evidence desde portal
- Integración automatizada con Global66 API (no existe API pública estable)

## Detailed Spec

### Patrón de re-anchor (referencia, ya documentado en CLAUDE.md)

1. Identificar bank statement authoritative más reciente
2. Editar `declare-opening-trial-balances.ts` con: `genesisDate` (SOD), `openingBalance` (= bank reality), `auditStatus='reconciled'`, `evidenceRefs` apuntando al PDF
3. `pnpm finance:declare-otbs` ejecuta:
   - INSERT new OTB row
   - UPDATE old active OTB → `superseded_by = new.obtb_id`
   - SQL function `cascade_supersede_pre_otb_transactions` marca settlement_legs/income_payments/expense_payments con `transaction_date < genesisDate` como `superseded_by_otb_id = new.obtb_id`
   - DELETE account_balances rows con `balance_date < genesisDate`
   - Outbox event `finance.account.opening_trial_balance.declared`
4. `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/rematerialize-account.ts global66-clp`
5. `refreshMonthlyBatch` para meses afectados (hygiene rule)

### Tolerancia drift residual

Aceptable < 5-10% por: refunds pendientes, FX rate diff, holds bancarios. Si > 10%: investigar antes de re-anchor.

## Acceptance Criteria

- [ ] Cartola Global66 al 2026-04-05 capturada y subida
- [ ] `account_opening_trial_balance` de `global66-clp` tiene `evidence_refs` poblado
- [ ] Test de paridad OTB ↔ cartola pass
- [ ] Si discrepa: cascade-supersede ejecutado y verificado
- [ ] Closing actual Global66 al 2026-04-28 ≈ realidad banco
- [ ] Detector `task719.openingTrialBalancesWithoutEvidence` en ledger-health
- [ ] Tests pass

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/otb-global66-verification.test.ts`
- `pnpm test src/lib/finance/__tests__/ledger-health-task719.test.ts`
- Manual: comparar valor cartola vs OTB declarado

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado: TASK-714d Slice 5 marcar como cerrado
- [ ] Detector `task719.openingTrialBalancesWithoutEvidence` reportado como warning (eventualmente 0)

## Follow-ups

- Repetir verificación para OTBs de otras cuentas (Santander CLP, TC, CCAs) — crear task por cuenta
- Considerar enforcement vía CHECK constraint en `account_opening_trial_balance` para que `evidence_refs` sea NOT NULL en futuras inserts (decisión separada)

## Open Questions

- ¿Existe ya un evidence storage path canónico, o hay que definirlo? (e.g. `gs://greenhouse-finance-evidence/otbs/`)
- ¿El usuario tiene acceso a cartola Global66 al 2026-04-05 o necesita pedirla al banco?
