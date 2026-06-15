# TASK-1142 — Nexa data-aware suggested prompts: Nómina

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|hr|payroll|ui`
- Blocked by: `TASK-1141` (composer registry)
- Branch: `task/TASK-1142-nexa-data-aware-prompts-payroll`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende los prompts data-aware de Nexa al contexto **Nómina** (`/hr/payroll/*`). Cuando el operador de nómina abre Nexa en un período, los prompts arrancan desde los **pendientes reales de cierre** ("Quedan N finiquitos por ratificar antes del cierre", "N colaboradores con variación >10% este mes", "El período sigue en borrador") en vez de plantillas fijas. Reusa el registry de resolvers de TASK-1141 + el hint UI de TASK-1139.

## Why This Task Exists

El contexto `payroll` hoy muestra plantillas fijas que no miran el estado del período. El valor de Nexa en nómina es arrancar desde lo que **bloquea el cierre** (finiquitos sin ratificar, variaciones anómalas, período no exportado). Requiere un resolver de dominio payroll que componga esos pendientes reusando readers canónicos.

## Goal

- Resolver `payroll` en el registry (TASK-1141): compone pendientes de cierre del período reusando readers canónicos (estado del período, finiquitos pendientes de ratificación, variaciones). NUNCA recomputa nómina.
- La página `/hr/payroll/*` declara `NexaContextScope entityKind='payroll_period' entityId={periodId} contextKey='payroll'`.
- Copy es-CL vía `greenhouse-ux-writing`. Reusa hint UI. Mismo flag. Degradación honesta a Tier 1/1.5.
- Gateado por capability/rol como el resto de payroll (anti-oracle: solo quien ve nómina).

## Dependencies & Impact

- **Depende de:** TASK-1141 (registry). Readers payroll: `src/lib/payroll/postgres-store.ts` (estado de período), `final_settlement_documents` (finiquitos pendientes de ratificación), readers de variación.
- **Impacta a:** `suggested-prompts-data-aware.ts` (+ resolver `payroll`), `suggested-prompts.ts` (`NexaPageEntityKind` += `payroll_period`), `/hr/payroll/*` page (declara contexto), copy.
- **Archivos owned:** `src/lib/nexa/data-aware-resolvers/payroll.ts`, la page de payroll que declare el contexto, `src/lib/copy/nexa.ts`.

## Current Repo State

- **Already exists (post TASK-1141):** registry de resolvers + hint UI + contexto `payroll` (plantillas) + readers de período/finiquitos.
- **Gap:** no hay resolver `payroll` data-aware; la page de payroll no declara `entityId` de período.

## Scope (slices)

- **Slice 1 — Resolver `payroll` + copy.** `src/lib/nexa/data-aware-resolvers/payroll.ts`: compone `pending_finiquitos` (por ratificar) / `period_draft` (no exportado) / `salary_variations` (>10%) del período. Allowlist categórica (nunca montos). Copy es-CL.
- **Slice 2 — Declaración de página + ruteo.** La page `/hr/payroll/[period]` (o equivalente) declara `NexaContextScope entityKind='payroll_period' entityId={periodId}`. El resolver valida el acceso del subject al período (anti-oracle).
- **Slice 3 — Tests + GVC + doc.** Tests del resolver + GVC (Nexa en un período con finiquito pendiente) + Delta doc.

## Out of Scope

- My space (TASK-1141) · Finance global (TASK-1143).
- Recomputar nómina / finiquitos (solo se LEEN pendientes).
- Nueva UI (reusa cards + hint).

## Detailed Spec

- **Resolver `payroll`:** dado el `periodId` + subject, lee estado del período + count de finiquitos pendientes de ratificación + count de variaciones >10%. Cada uno → gancho con `hint` (`pending`/`anomaly`). Counts SÍ (es el gancho: "Quedan 3 finiquitos"), montos NO.
- **Anti-oracle:** el resolver verifica que el subject pueda ver nómina (mismo gate que las superficies payroll) antes de devolver señales; si no, `template_fallback`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
Slice 1 (resolver) → Slice 2 (page) → Slice 3 (tests/GVC). Depende de TASK-1141 mergeada.

### Risk matrix
| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Monto crudo al prompt | resolver payroll | Baja | Allowlist categórica + counts solamente | test allowlist |
| Subject sin acceso ve pendientes | resolver payroll | Baja | Gate de acceso payroll antes de devolver señal | test anti-oracle |
| Recomputar nómina por error | resolver payroll | Baja | Solo readers de estado/count; NUNCA `buildPayrollEntry` | review |

### Feature flags / cutover
Mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED`. Aditivo.

### Rollback plan per slice
Todos: `revert commit` (<2 min, reversible).

### Production verification sequence
1. Local (flag ON): Nexa en un período con finiquito pendiente → prompt lo refleja. 2. Staging GVC. 3. Prod = próximo release.

### Out-of-band coordination required
Ninguna.

## Acceptance Criteria

- [ ] En un período con finiquito pendiente de ratificación, el prompt lo refleja; sin pendiente → Tier 1/1.5.
- [ ] El resolver verifica acceso payroll del subject (anti-oracle) — test.
- [ ] Ningún prompt lleva monto crudo (counts OK) — test allowlist.
- [ ] El resolver NO invoca `buildPayrollEntry` ni recomputa nómina — review.
- [ ] Con el flag off, payroll muestra plantillas.
- [ ] `pnpm nexa:doc-gate` verde.

## Verification

- `pnpm local:check` + tests focales + suite Nexa + `pnpm vitest run src/lib/payroll` (no-regresión).
- **UI por skills**: `greenhouse-ux-writing` + GVC desktop+mobile de payroll con pendiente real.
- `pnpm test` + `pnpm build`.

## Closing Protocol

- `Lifecycle: complete` + mover + sync README/REGISTRY + Delta doc + changelog/Handoff.

## Follow-ups

- Ninguno (cierra el contexto Nómina).
