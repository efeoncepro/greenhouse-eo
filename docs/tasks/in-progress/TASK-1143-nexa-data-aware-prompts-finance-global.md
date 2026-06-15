# TASK-1143 — Nexa data-aware suggested prompts: Finanzas global

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|finance|ui`
- Blocked by: `TASK-1141` (composer registry)
- Branch: `task/TASK-1143-nexa-data-aware-prompts-finance-global`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende los prompts data-aware de Nexa al contexto **Finanzas global** (`/finance` dashboards: P&L, cash-out, banco). Cuando el operador financiero abre Nexa, los prompts arrancan desde las **anomalías reales del ledger** ("Hay N movimientos con drift de ledger", "N conciliaciones sin cerrar", "El ledger está degradado") en vez de plantillas fijas. Reusa el registry de resolvers de TASK-1141 + el hint UI de TASK-1139.

## Why This Task Exists

El contexto `finance` global (los dashboards, no la ficha de un cliente) hoy muestra plantillas fijas. El valor de Nexa en finanzas es arrancar desde lo que **requiere atención real** (drift de ledger, conciliaciones abiertas, degradación de fuentes). Requiere un resolver de dominio finance que componga esas señales reusando `getFinanceLedgerHealth` + los signals de drift.

## Goal

- Resolver `finance` en el registry (TASK-1141): compone anomalías del ledger reusando `getFinanceLedgerHealth` (`src/lib/finance/ledger-health.ts`) + readers de drift. NUNCA recomputa el ledger.
- El dashboard `/finance` declara `NexaContextScope entityKind='finance_scope' contextKey='finance'` (scope tenant/período, no una entidad puntual).
- Copy es-CL vía `greenhouse-ux-writing`. Reusa hint UI. Mismo flag. Degradación honesta.
- Gateado por capability/rol finance (anti-oracle: solo quien ve finanzas).

## Dependencies & Impact

- **Depende de:** TASK-1141 (registry). Readers: `src/lib/finance/ledger-health.ts` (`getFinanceLedgerHealth`), `src/lib/reliability/queries/ledger-unresolved-drift-items.ts`, `account-balances-fx-drift`.
- **Impacta a:** `suggested-prompts-data-aware.ts` (+ resolver `finance`), `suggested-prompts.ts` (`NexaPageEntityKind` += `finance_scope`), `/finance` dashboard page (declara contexto), copy.
- **Archivos owned:** `src/lib/nexa/data-aware-resolvers/finance.ts`, la page `/finance` que declare el contexto, `src/lib/copy/nexa.ts`.

## Current Repo State

- **Already exists (post TASK-1141):** registry + hint UI + contexto `finance` (plantillas) + `getFinanceLedgerHealth` + signals de drift.
- **Gap:** no hay resolver `finance` data-aware; el dashboard `/finance` no declara contexto de scope.

## Scope (slices)

- **Slice 1 — Resolver `finance` + copy.** `src/lib/nexa/data-aware-resolvers/finance.ts`: compone `ledger_drift` (movimientos con drift) / `unreconciled` (conciliaciones abiertas) / `ledger_degraded` (fuente caída) desde `getFinanceLedgerHealth`. Allowlist categórica (counts/estados, nunca montos). Copy es-CL.
- **Slice 2 — Declaración de página + ruteo.** El dashboard `/finance` declara `NexaContextScope entityKind='finance_scope'`; el resolver usa el scope tenant del subject (anti-oracle).
- **Slice 3 — Tests + GVC + doc.** Tests del resolver + GVC (Nexa en `/finance` con drift real) + Delta doc.

## Out of Scope

- My space (TASK-1141) · Payroll (TASK-1142).
- La ficha de cliente en Finanzas (`/finance/clients/[id]`) — esa YA es data-aware vía contexto `client` (TASK-1139). Esta task es el **dashboard global**.
- Recomputar el ledger (solo se LEE health). Nueva UI (reusa cards + hint).

## Detailed Spec

- **Resolver `finance`:** invoca `getFinanceLedgerHealth()` (+ drift readers) y mapea: settlement drift > 0 → `ledger_drift` (`anomaly`/error); unreconciled > 0 → `unreconciled` (`pending`); `degradedChecks` no vacío → `ledger_degraded` (`risk`). Counts SÍ, montos NO.
- **Anti-oracle:** gate de acceso finance del subject antes de devolver señal; si no, `template_fallback`. `getFinanceLedgerHealth` es tenant-level (Efeonce) — el scope es el tenant del subject.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
Slice 1 → 2 → 3. Depende de TASK-1141 mergeada.

### Risk matrix
| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Monto crudo al prompt | resolver finance | Baja | Allowlist (counts/estados) | test allowlist |
| Subject sin acceso ve anomalías | resolver finance | Baja | Gate finance antes de señal | test anti-oracle |
| `getFinanceLedgerHealth` lento bloquea el endpoint | endpoint | Baja | `withSourceTimeout` + cache de ruta (TASK-1139) | degradación honesta |

### Feature flags / cutover
Mismo flag. Aditivo.

### Rollback plan per slice
Todos: `revert commit` (<2 min, reversible).

### Production verification sequence
1. Local (flag ON): Nexa en `/finance` con drift real → prompt lo refleja. 2. Staging GVC. 3. Prod = próximo release.

### Out-of-band coordination required
Ninguna.

## Acceptance Criteria

- [ ] En `/finance` con drift de ledger real, el prompt lo refleja; sin anomalía → Tier 1/1.5.
- [ ] El resolver verifica acceso finance del subject (anti-oracle) — test.
- [ ] Ningún prompt lleva monto crudo (counts/estados OK) — test allowlist.
- [ ] El resolver reusa `getFinanceLedgerHealth` (NO recomputa ledger) — review.
- [ ] Con el flag off, `/finance` muestra plantillas.
- [ ] `pnpm nexa:doc-gate` verde.

## Verification

- `pnpm local:check` + tests focales + suite Nexa.
- **UI por skills**: `greenhouse-ux-writing` + GVC desktop+mobile de `/finance` con drift real.
- `pnpm test` + `pnpm build`.

## Closing Protocol

- `Lifecycle: complete` + mover + sync README/REGISTRY + Delta doc + changelog/Handoff.

## Follow-ups

- Ninguno (cierra el contexto Finanzas global).
