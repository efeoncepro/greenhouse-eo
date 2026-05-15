# TASK-893 — Payroll Participation Window

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|payroll|workforce|reliability`
- Blocked by: `TASK-890 debe estar deployado/promovido al ambiente donde se valide la composicion de salida`
- Branch: `task/TASK-893-payroll-participation-window`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear la primitive canonica `Payroll Participation Window` para que Payroll calcule la porcion elegible del periodo por colaborador. Cierra el bug class donde un colaborador que inicia a mitad de mes, como Felipe Zurita, entra al roster correctamente pero se cuantifica como mes completo.

La solucion debe aplicar tanto a nomina proyectada como a calculo oficial, componiendo fechas de compensacion, inicio de relacion laboral/onboarding y la salida canonica de TASK-890.

## Why This Task Exists

Hoy `pgGetApplicableCompensationVersionsForPeriod()` incluye miembros cuya compensacion solapa el mes (`effective_from <= periodEnd` y `effective_to >= periodStart`). Ese criterio sirve para descubrir roster, pero no para calcular el monto. En `projected_month_end`, `projectPayrollForPeriod()` usa `prorationFactor = 1`, y `buildPayrollEntry()` solo reduce por ausencias/licencias no pagadas.

Resultado: si alguien inicia el dia 13, Greenhouse puede pagar/proyectar el mes completo. Modelar los dias previos como ausencia seria incorrecto; antes del inicio no hay ausencia, hay no-participacion contractual/operativa.

## Goal

- Crear un resolver bulk-first `resolvePayrollParticipationWindowsForMembers()` server-only.
- Compartir la decision entre `projectPayrollForPeriod()` y `calculatePayroll()`.
- Reutilizar TASK-890 para cortes de salida/offboarding, sin reimplementar su matriz lane/status.
- Prorratear por dias habiles canonicos en V1.
- Agregar feature flag, shadow compare, tests y reliability signals para rollout seguro.

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
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No usar attendance para representar dias previos al inicio contractual.
- No arreglar solo projected payroll; official payroll debe consumir la misma primitive.
- No duplicar la logica de TASK-890; componer `resolveExitEligibilityForMembers`.
- No escribir filtros inline nuevos para inclusion payroll en SQL o consumers.
- Feature flag default `false` hasta staging shadow compare y aprobacion explicita.

## Normative Docs

- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/tasks/TASK_PROCESS.md`
- `CLAUDE.md`
- `AGENTS.md`

## Dependencies & Impact

### Depends on

- `TASK-890` — `src/lib/payroll/exit-eligibility/*` y flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`.
- `TASK-894` — si existe `international_internal` antes o durante esta implementacion, la matriz de participacion debe tratarlo como pago interno internacional prorrateable, sin Deel ni descuentos Chile.
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/fetch-attendance-for-period.ts`
- `src/lib/calendar/operational-calendar.ts` (future-ready, no obligatorio V1 si `countWeekdays` sigue siendo base)

### Blocks / Impacts

- Correccion de Felipe Zurita y cualquier colaborador con `effective_from` dentro del mes.
- Payroll projected payroll (`GET /api/hr/payroll/projected`).
- Official payroll calculation (`calculatePayroll()`).
- Future payment obligations/personnel expense que consumen payroll entries.
- Reliability and audit posture for HR/Finance mid-month changes.

### Files owned

- `src/lib/payroll/participation-window/*`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/*participation*.test.ts`
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- TASK-890 exit eligibility resolver:
  - `src/lib/payroll/exit-eligibility/index.ts`
  - `src/lib/payroll/exit-eligibility/policy.ts`
  - `src/lib/payroll/exit-eligibility/query.ts`
- Payroll projection:
  - `src/lib/payroll/project-payroll.ts`
  - `src/app/api/hr/payroll/projected/route.ts`
- Official payroll calculation:
  - `src/lib/payroll/calculate-payroll.ts`
- Current roster overlap query:
  - `src/lib/payroll/postgres-store.ts`
  - `src/lib/payroll/get-compensation.ts`
- Working-day helper:
  - `src/lib/payroll/fetch-attendance-for-period.ts`

### Gap

- No canonical participation window exists for mid-period entry.
- `projected_month_end` always uses `prorationFactor = 1`.
- `buildPayrollEntry()` reduces amounts only for absence/unpaid leave, not for non-participation before start.
- Honorarios skips attendance adjustment, so Felipe-like cases show full base salary and null attendance fields.
- Projected and official calculation do not share a participation decision.

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

### Slice 1 — ADR Sync + Resolver Foundation

- Crear `src/lib/payroll/participation-window/types.ts`. Tipo `PayrollParticipationWindow` **embebe** `exitEligibility: WorkforceExitPayrollEligibilityWindow | null` (NO duplica `eligibleFrom`/`eligibleTo` exit-side).
- Crear `src/lib/payroll/participation-window/policy.ts` con funcion pura que derive policy, reason codes, warnings y `prorationFactor`.
- Crear `src/lib/payroll/participation-window/index.ts` server-only.
- Declarar matriz canonica `policy × validReasonCodes` documentada (consumers branch en `policy`, NUNCA en `reasonCodes`).
- Declarar `PayrollParticipationWarningCode` enum: `exit_resolver_disabled | exit_resolver_failed | source_date_disagreement | compensation_version_overlap`.
- Tests unitarios con matriz:
  - full month
  - `effective_from` dia 13 Felipe-like
  - `effective_from = periodStart`
  - `effective_from > periodEnd`
  - `effective_to < periodStart`
  - `effective_to` dentro del mes
  - entry y exit en el mismo mes (`prorate_bounded_window`)
  - Maria-like salida external payroll via TASK-890 (`exclude_from_cutoff`)
  - TASK-890 flag OFF degraded path → warning `exit_resolver_disabled` + `exitEligibility = null`
  - TASK-890 throw → warning `exit_resolver_failed` + `captureWithDomain('payroll', ...)`
  - Cada uno de los 4 regimenes (chile_dependent, honorarios, deel, international_internal)

### Slice 2 — Bulk Query + TASK-890 Composition

- Implementar reader bulk-first para facts de participacion.
- Invocar `resolveExitEligibilityForMembers()` EXPLICITO desde el resolver (NUNCA leer `exitEligibilityWindow` ya attachado por `pgGetApplicableCompensationVersionsForPeriod` — esa attachment depende del flag TASK-890; el participation resolver siempre necesita decision exit fresca).
- Source precedence V1 (single entry source canonical):
  - `eligibleFrom = max(periodStart, compensation.effective_from)` — unica fuente V1.
  - Onboarding source (`work_relationship_onboarding_cases`) **NO se consume** en V1; se LEFT JOIN a la query bulk SOLO para detectar drift via signal `source_date_disagreement` (data-driven trigger para V1.1).
- Flag dependency check: si TASK-890 flag OFF, emitir warning `exit_resolver_disabled` per member con exit case activo en periodo + degradar `exitEligibility = null` honest.
- Si `resolveExitEligibilityForMembers` throw, emitir `captureWithDomain('payroll', err, { source: 'participation_window.exit_composition_failed' })` + warning `exit_resolver_failed`.

### Slice 3 — Projection Integration Behind Flag

- Agregar env flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED` (default `false`).
- Pre-condicion documentada: TASK-893 flag=true requiere TASK-890 flag=true en mismo env (sino warning + degrade).
- Refactor `prorationFactor` en `ProjectedPayrollEntry`: de scalar period-wide a per-member.
- Composition formula canonica (declarada en codigo + comentado): `finalFactor = participationFactor × (actualToDateFactor if mode = 'actual_to_date' else 1)`.
- Integrar en `projectPayrollForPeriod()` despues de `pgGetApplicableCompensationVersionsForPeriod` y antes del loop de `buildPayrollEntry`.
- Mantener legacy parity bit-for-bit cuando flag=false (escalar period-wide preservado).
- Migrar tests existentes que mockean `prorationFactor: 22` global ANTES del refactor (caso `project-payroll.test.ts:28`).
- Agregar shadow compare logged sin romper response — emite `captureWithDomain('payroll', { source: 'participation_window.shadow_compare', tags: { period, legacy_total, new_total, delta_pct } })` cuando flag=false.

### Slice 4 — Official Calculation Integration

- Integrar la misma primitive en `calculatePayroll()`.
- Aplicar `prorationFactor` per-member tambien para regimenes honorarios + international_deel + international_internal (NO solo chile_dependent).
- Persistir `workingDaysInPeriod`, `daysPresent`, `adjusted*` SIN contaminar attendance con entry proration. Hard rule: participation ≠ attendance.
- Asegurar que `payroll_entries` reflejen montos prorrateados pero no inventen ausencias.
- Implementar guard `no_recompute_closed_periods`: si periodo está `status IN ('exported','approved')`, refuse to overwrite + surface error code `period_closed_no_recompute`. Capability `payroll.period.force_recompute` queda V1.1+.
- Validar con `greenhouse-payroll-auditor` que finiquito calculation (TASK-862/863) maneja same-month entry+exit correctamente ANTES de mergear Slice 4.
- Mantener rollback instant via flag=false.

### Slice 5 — Reliability Signals + Operator Evidence

- Agregar 3 signals (subsystem `Finance Data Quality`, `incidentDomainTag='payroll'`):
  - `payroll.participation_window.projection_delta_anomaly` (drift, warning > 5% / error > 15%, steady < 5%)
  - `payroll.participation_window.full_month_entry_drift` (drift, error > 0, steady = 0)
  - `payroll.participation_window.source_date_disagreement` (drift, warning > 0, steady = 0)
- Signal payloads: `period_year`, `period_month`, `count`, `member_ids[]` redacted via `redactSensitive`, `reason_code_distribution`.
- Agregar Sentry capture/warn en degraded resolver path (`exit_resolver_disabled` + `exit_resolver_failed`).
- Agregar fixtures de Felipe-like, Maria-like y same-month entry+exit a tests/regression docs.
- Wire signals en `getReliabilityOverview` con rollup `Finance Data Quality`.

### Slice 6 — Docs + Rollout

- Actualizar:
  - `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` (ya updated en este review)
  - `docs/architecture/DECISIONS_INDEX.md`
  - `docs/documentation/hr/periodos-de-nomina.md`
  - `docs/manual-de-uso/hr/periodos-de-nomina.md`
  - `CLAUDE.md` lift de la seccion "Hard Rules — Canonical" del ADR
  - `AGENTS.md` si hay reglas operativas para agentes
  - `Handoff.md`
  - `changelog.md`
- Pre-flip checklist:
  - TASK-890 flag ON en production >= 7 dias steady
  - HR/Finance written approval (documented en `Handoff.md`)
  - `greenhouse-payroll-auditor` validation completa para finiquito same-month entry+exit
  - Mensaje de coordinacion a downstream consumers (Finance P&L, ICO observers)
- Ejecutar staging shadow compare y documentar resultado.

## Out of Scope

- Split de una persona en multiples payroll entries por cambios de salario intra-mes.
- Cambiar la base legal de prorrateo a calendario operacional con feriados. V1 usa weekdays canonicos existentes.
- Mutar datos productivos de Felipe, Maria u otros colaboradores.
- Backfill historico automatico de payroll entries ya calculadas/exportadas.
- Cambiar la clasificacion legal de `honorarios`, `contractor`, `eor` o `indefinido`.
- Crear el nuevo contrato `international_internal`; esa taxonomia vive en `TASK-894`, pero esta task debe consumirla si ya existe.

## Detailed Spec

### Canonical Formula

V1 usa exactamente dos sources de entry (compensation + period) y compone exit via TASK-890:

```text
eligibleFrom = max(periodStart, compensation.effective_from)
eligibleTo   = min(
                  periodEnd,
                  compensation.effective_to,
                  exitEligibility.eligibleTo   when exitEligibility != null
                )
```

If `exitEligibility.projectionPolicy === 'exclude_entire_period'` → policy `exclude`, ambos bounds `null`.

If `exitEligibility.projectionPolicy === 'exclude_from_cutoff'` AND cutoff ≤ periodStart → policy `exclude`.

If `eligibleFrom > eligibleTo` → policy `exclude`, ambos bounds `null`.

If the window equals the period → `full_period`, `prorationFactor = 1`.

If only start is bounded inside the period → `prorate_from_start`.

If only end is bounded inside the period → `prorate_until_end`.

If both bounds are inside the period → `prorate_bounded_window`.

### Source Precedence — V1 single entry source

| Source | Status V1 | Razon |
| --- | --- | --- |
| `compensation_versions.effective_from` | canonical | poblado para todo member activo; ya consumido por reader; CHECK constraints |
| `work_relationship_onboarding_cases.completed_at` | V1.1+ deferred | tabla existe (`src/lib/workforce/onboarding/store.ts`) pero sin columna canonica en `members`; requiere schema work + HR validation |
| `members.relationship_started_at` | does not exist | requeriria TASK dedicada |

V1 hard rule: el resolver usa `compensation.effective_from` UNICO para `eligibleFrom`. Onboarding source es V1.1+ gated en (a) HR confirma que onboarding es canonica para proration, (b) materializar columna en `members` o derivacion table. Hook V1: LEFT JOIN onboarding cases para detectar drift via signal `source_date_disagreement` SIN consumir el dato.

### Flag Dependency — TASK-893 requiere TASK-890

`PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` en cualquier env requiere `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en mismo env. Sino, participation resolver compone exit decision degradada (`full_period` para todos) → overpay silente para exiting collaborators mientras prorratea correctamente entering ones (peor failure mode: partial correctness sin awareness).

Resolver MUST:

1. Invocar `resolveExitEligibilityForMembers` EXPLICITO (NUNCA leer `exitEligibilityWindow` attachado por reader — esa attachment depende del flag TASK-890).
2. Si TASK-890 retorna legacy fallback (flag OFF), emitir warning `exit_resolver_disabled` per member con exit case activo + degradar `exitEligibility = null`.
3. Si TASK-890 throw, emitir `captureWithDomain('payroll', err, { source: 'participation_window.exit_composition_failed' })` + warning `exit_resolver_failed` + degradar.

### Triple-gate roster semantics

Post-rollout, 3 gates ortogonales filtran el roster en orden canonico:

1. **Compensation overlap** (no flag, always on): roster discovery via `cv.effective_from <= periodEnd AND cv.effective_to >= periodStart`.
2. **Intake gate** (TASK-872 flag, filter): excluye members con `workforce_intake_status != 'completed'` ANTES de participation.
3. **Participation window** (TASK-893 flag, intersection): intersecta entry + exit windows + period bounds; computa `prorationFactor` per member. Internamente compone TASK-890 (gate dentro de gate).

NUNCA colapsar los 3 en uno. NUNCA reordenar. Cuando emerja un 4to gate ortogonal (legal hold, garnishment, leave override), agregarlo como capa separada, no mezclar dimensiones.

### Régimen coverage

`prorationFactor` aplica a los 4 regimenes canonicos (TASK-758 taxonomy). Basis `countWeekdays` es la misma; lo que se multiplica difiere:

| Régimen | `prorationFactor` aplica a |
| --- | --- |
| `chile_dependent` | base salary + fixed haberes; `chileTotalDeductions` recomputado desde prorated gross |
| `honorarios` | base honorarios; `siiRetentionAmount` recomputado desde prorated gross (Art. 74 N°2 LIR scales linearly) |
| `international_deel` | `baseGross` only (Greenhouse projects, Deel reconcilia final); footnote en receipt |
| `international_internal` | base salary + fixed haberes; sin deducciones chile-specific |

Implementacion DEBE extender `prorateEntry` al path honorarios. Hoy honorarios skipea attendance proration; ese skip NO se extiende a participation. Participation es contractual eligibility gate, no attendance phenomenon.

### Proration

```text
participationFactor = countWeekdays(eligibleFrom, eligibleTo) / countWeekdays(periodStart, periodEnd)
```

Composition formula canonica (consumer-side):

```text
finalFactor = participationFactor × (actualToDateFactor if mode = 'actual_to_date' else 1)
```

Composition vive en consumer (`projectPayrollForPeriod`, `calculatePayroll`), NO en resolver. Resolver solo conoce la participation window.

### Felipe-like Expected Behavior

For a member with:

- `effective_from = 2026-05-13`
- period `2026-05-01` to `2026-05-31`
- base salary `650000`
- régimen `honorarios`

Expected:

- policy `prorate_from_start`
- reason code `entry_mid_period`
- gross/net no longer equal full-month values
- attendance fields must not imply absence from May 1 to May 12
- `siiRetentionAmount` recomputado desde prorated gross

### Maria-like Expected Behavior

For external payroll offboarding covered by TASK-890:

- TASK-890 continues to decide exit cutoff and exclusion policy.
- Participation window composes that decision and excludes/prorates consistently.
- No duplicated lane/status logic is allowed in TASK-893 code.

### Same-month entry+exit Expected Behavior

For a member that enters AND exits within the same period:

- policy `prorate_bounded_window`
- reason codes `[entry_mid_period, exit_mid_period]` (or `external_payroll_exit` for Deel)
- `eligibleFrom = max(periodStart, comp.effective_from)`
- `eligibleTo = min(periodEnd, comp.effective_to, exitEligibility.eligibleTo)`
- finiquito calculation (TASK-862/863) MUST be validated with `greenhouse-payroll-auditor` before Slice 4 ships

### Downstream consumers — cross-domain blast

6 sistemas downstream consumen payroll entries (o derivados); flag flip propaga delta:

| Sistema | Blast | Mitigacion |
| --- | --- | --- |
| `/api/hr/payroll/projected` | montos proyectados bajan para joiners mid-month | staging shadow compare >= 7d |
| `calculatePayroll()` oficial | persisted amounts change | HR/Finance OOB approval; `no_recompute_closed_periods` invariant |
| `payment_obligations` (TASK-748) | obligaciones reflejan montos prorated en periods abiertos | re-materialization gated |
| `commercial_cost_attribution_v2` (TASK-708) + labor allocation consolidada (TASK-709) | `expense_direct_member_via_fte` baja; client_economics ICO baja | signal cascade existente |
| `client_economics` materializer + ICO motor | ICO economics shift para clients con joiners | signal cascade |
| Final settlement (TASK-862/863) | bases legales same-month entry+exit cambian | validar con `greenhouse-payroll-auditor` ANTES de Slice 4 |

### No-recompute-silente invariant

Periodos `status IN ('exported','approved')` MUST preservar legacy semantic. Recompute en periodo cerrado requires:

- Capability `payroll.period.force_recompute` (V1.1+; EFEONCE_ADMIN + FINANCE_ADMIN).
- Reason >= 20 chars persistida en audit row.
- Explicit operator action via admin endpoint; never automatic.

Hasta que la capability aterrize (V1.1), `calculatePayroll()` MUST refuse to overwrite entries on closed periods + surface error code `period_closed_no_recompute`. Flag-on NO retroactiva past months.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (pure policy) -> Slice 2 (bulk resolver + TASK-890 composition) -> Slice 3 (projected integration) -> Slice 4 (official integration) -> Slice 5 (signals) -> Slice 6 (docs/rollout).
- Slice 4 MUST NOT ship without Slice 1-3 tests green.
- Slice 5 may begin after Slice 2 but must land before any production flag flip.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Overpay/underpay due to incorrect entry date precedence | payroll | medium | deterministic single source V1 + reason codes + staging shadow compare | `payroll.participation_window.projection_delta_anomaly` |
| Projected and official payroll diverge | payroll | medium | shared primitive consumed by both paths; tests assert same policy | `payroll.participation_window.full_month_entry_drift` |
| TASK-890 exit logic duplicated and drifts | payroll/hr | medium | compose `resolveExitEligibilityForMembers`; lint/review guard | Sentry warning `participation_window.exit_composition_failed` |
| Attendance polluted with non-participation days | payroll/compliance | low | hard rule: no attendance mutation for entry proration | tests on `daysPresent`/`daysAbsent` unchanged |
| Flag misaligned: TASK-893 ON + TASK-890 OFF | release/payroll | medium | flag dependency check at resolver entry; warning `exit_resolver_disabled` per member | `payroll.participation_window.full_month_entry_drift` (catches exit cases that should be excluded but aren't) |
| Silent recompute on closed period | payroll/finance | low | `no_recompute_closed_periods` guard + error code `period_closed_no_recompute` | application-layer error surfaced to operator |
| Source date drift (onboarding vs compensation) | payroll | low V1 / unknown V1.1+ | LEFT JOIN onboarding cases in resolver bulk query (observe without consume V1) | `payroll.participation_window.source_date_disagreement` |
| Finiquito same-month entry+exit miscalculation | payroll/legal | medium | `greenhouse-payroll-auditor` validation BEFORE Slice 4 ships | manual review + audit log |
| `prorationFactor` shape change breaks legacy tests | dev | high | migrate `project-payroll.test.ts:28` mock + sibling tests in Slice 1 BEFORE Slice 3 refactor | CI test suite |
| Downstream cost attribution + ICO show unexplained deltas | finance/commercial | medium | document 6 downstream systems in spec + coordinate notify | existing `commercial.cost_attribution.delta_anomaly` |
| Production behavior changes before validation | release | medium | env flag default false + staging-only flip + production approval | flag audit in Handoff |

### Feature flags / cutover

- Env var: `PAYROLL_PARTICIPATION_WINDOW_ENABLED`.
- Default: `false` in production and staging until Slice 3 shadow compare is available.
- **Flag dependency canonical**: TASK-893 flag=true requiere TASK-890 flag=true en mismo env. Verificar ANTES del staging flip.
- Staging cutover: set `true`, redeploy, verify Felipe-like, Maria-like, full-month, same-month entry+exit, y los 4 regimenes.
- Production cutover: set `true`, redeploy, verify `/api/hr/payroll/projected` y one official calculation dry-run/preview before any persisted recalculation.
- Revert: set env var to `false` and redeploy. Target revert time: <5 minutes via Vercel.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert code commit; no runtime flag consumed | <10 min | si |
| Slice 2 | Revert resolver/query commit; no production behavior if flag=false | <10 min | si |
| Slice 3 | Flip `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false` + redeploy | <5 min | si |
| Slice 4 | Flip flag=false + redeploy; do not recalculate official periods until fixed | <5 min | parcial for persisted recalculations |
| Slice 5 | Disable signal emission via code revert or leave warn-only; no payroll amount impact | <10 min | si |
| Slice 6 | Docs revert/update | <10 min | si |

### Production verification sequence

1. Run unit tests for participation-window, payroll projection and official calculation.
2. Verify TASK-890 flag ON en production >= 7 dias steady (`PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true`).
3. Deploy to staging with flag=false and verify legacy parity.
4. Flip flag=true in staging and verify:
   - Felipe-like no longer full-month.
   - Maria-like remains excluded via TASK-890.
   - full-month collaborators remain unchanged.
   - same-month entry+exit produces `prorate_bounded_window`.
   - 4 regimenes (chile_dependent, honorarios, deel, international_internal) prorratean correctamente.
   - 3 reliability signals readable y steady (delta < 5%, full_month_drift = 0, source_disagreement reports actual count).
5. Capture staging shadow compare evidence in Handoff.
6. Validate finiquito calculation (TASK-862/863) for same-month entry+exit with `greenhouse-payroll-auditor`.
7. Coordinate notify to downstream consumers (Finance P&L, ICO observers, commercial cost attribution).
8. Keep production flag=false until HR/Finance written approval (documented en Handoff).
9. Flip production flag via Vercel env var + redeploy.
10. Verify authenticated `GET /api/hr/payroll/projected?year=<current>&month=<current>&mode=projected_month_end`.
11. Monitor 3 reliability signals for 7 days.

### Out-of-band coordination required

- HR/Finance written approval before production flag flip (documented en `Handoff.md`).
- `greenhouse-payroll-auditor` skill validation para finiquito same-month entry+exit ANTES de Slice 4 merge.
- Communicate to downstream consumers (Finance P&L, ICO observers, commercial cost attribution) que personnel expense puede bajar para meses con joiners mid-month.
- No external provider coordination required for V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolvePayrollParticipationWindowsForMembers()` exists and is bulk-first/server-only.
- [ ] `PayrollParticipationWindow` type **embeds** `exitEligibility: WorkforceExitPayrollEligibilityWindow | null` (NO duplica `eligibleFrom`/`eligibleTo` exit-side).
- [ ] V1 source precedence: `eligibleFrom = max(periodStart, compensation.effective_from)` — single canonical source. Onboarding NO consumido en V1.
- [ ] Flag dependency check: cuando TASK-890 flag OFF, emite warning `exit_resolver_disabled` + degrade `exitEligibility = null` honest.
- [ ] Felipe-like fixture con `effective_from` inside the month prorates and no longer pays full month.
- [ ] Maria-like fixture composes TASK-890 and remains excluded/prorated according to exit policy.
- [ ] Same-month entry+exit fixture produces `prorate_bounded_window` policy con bounds correctas.
- [ ] Full-month collaborators remain bit-for-bit equal when eligible for the whole period.
- [ ] 4 regimenes (chile_dependent, honorarios, deel, international_internal) prorratean correctamente; honorarios extiende `prorateEntry` sin contaminar attendance.
- [ ] `projectPayrollForPeriod()` and `calculatePayroll()` consume the same participation primitive.
- [ ] `prorationFactor` shape migrado de period-wide scalar a per-member; legacy tests (`project-payroll.test.ts:28`) migrados ANTES de Slice 3 refactor.
- [ ] Composition formula canonica documentada en codigo: `finalFactor = participationFactor × actualToDateFactor`.
- [ ] Flag=false preserves current behavior bit-for-bit.
- [ ] Flag=true in staging passes authenticated `/api/hr/payroll/projected` verification.
- [ ] 3 reliability signals documented y emitted/readable bajo subsystem `Finance Data Quality`:
  - [ ] `payroll.participation_window.projection_delta_anomaly`
  - [ ] `payroll.participation_window.full_month_entry_drift`
  - [ ] `payroll.participation_window.source_date_disagreement`
- [ ] `no_recompute_closed_periods` guard implementado; `period_closed_no_recompute` error code surface en `calculatePayroll`.
- [ ] `greenhouse-payroll-auditor` validation completa para finiquito same-month entry+exit (TASK-862/863) ANTES de Slice 4 merge.
- [ ] Hard rules lifted a `CLAUDE.md` (seccion "Payroll Participation Window invariants") en Slice 6.
- [ ] Downstream consumers (6 sistemas) coordinated/notified.
- [ ] Docs/manuals/handoff/changelog are synchronized.

## Verification

- `pnpm vitest run src/lib/payroll/participation-window`
- `pnpm vitest run src/lib/payroll/project-payroll.test.ts src/lib/payroll/postgres-store.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- Authenticated staging request:
  - `node scripts/staging-request.mjs "/api/hr/payroll/projected?year=2026&month=5&mode=projected_month_end"`
- Production verification only after approved flag flip.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/DECISIONS_INDEX.md` sigue apuntando al ADR vigente
- [ ] `CLAUDE.md` incluye hard rules si el runtime quedo implementado

## Follow-ups

- V1.1: materializar `relationship_started_at` canonico en `members` o derivacion table cuando `source_date_disagreement` signal acumule count sostenido > 0 — data-driven trigger.
- V1.1: capability `payroll.period.force_recompute` + admin endpoint con reason >= 20 chars + audit row para recompute explicito de periodos cerrados.
- V2: split entries por multiples compensation versions dentro del mismo periodo.
- V2: usar operational calendar con feriados por pais/region si HR/Finance define esa base como canonica.
- V2: surface UI que explique reason codes en nomina proyectada.
- V2: cuando emerja un 4to gate ortogonal (legal hold, garnishment, leave override), agregar como capa separada NO colapsar en participation.
- Cross-task: si `TASK-894` se implementa primero, agregar fixture `international_internal` al resolver de participacion y a projected/official payroll antes de cerrar TASK-893.

## Delta 2026-05-15

- Task creada desde investigacion del caso Felipe Zurita: production projected payroll mostro full-month para `effective_from` mid-month (`baseSalary=650000`, `grossTotal=650000`, `prorationFactor=1`, `contractTypeSnapshot=honorarios`).
- Arquitectura validada con `software-architect-2026`: decision `Accepted / high confidence`; se adopta Payroll Participation Window como primitive compartida, no fix local.
- Cross-task agregado: `TASK-894` cubre el gap de contrato `international_internal`; TASK-893 debe incluirlo como interno internacional prorrateable cuando la taxonomia exista.
- **Review arquitectonico pre-Slice 1 (2026-05-15)** via `arch-architect`: 5 ajustes incorporados al ADR + task spec:
  1. Type shape `PayrollParticipationWindow` **embebe** `exitEligibility` en lugar de duplicar shape (T1 fix).
  2. V1 source precedence reducido a 1 fuente unica (`compensation.effective_from`); onboarding V1.1+ data-driven via signal.
  3. Flag dependency canonical declarada: TASK-893=true requiere TASK-890=true mismo env.
  4. 3er signal agregado: `source_date_disagreement` + subsystem rollup `Finance Data Quality` explicito.
  5. Blast radius cross-domain documentado: 6 downstream systems + `no_recompute_closed_periods` invariant.
- Blind spots adicionales documentados: triple-gate semantics, regimen coverage 4 canonicos, `prorationFactor` shape change (period-wide → per-member).
- Hard rules canonicos declarados en ADR para lift a `CLAUDE.md` en Slice 6.

## Open Questions

1. ~~Source onboarding vs compensation~~ **Resuelto**: V1 ships con `compensation.effective_from` unica. Onboarding queda V1.1+ con trigger data-driven via signal `source_date_disagreement`.
2. Confirmar con HR/Finance si prorrateo V1 por weekdays es suficiente o si se requiere operational calendar con feriados desde el primer rollout. (Mi recomendacion: shippear V1 con weekdays, operational calendar es follow-up con validacion legal independiente.)
3. **Pre-Slice 4**: validar con `greenhouse-payroll-auditor` si finiquito (TASK-862/863) reutiliza la participation window primitive o tiene su propia logica de prorrateo. Caso de prueba: persona entra dia 13, renuncia dia 20 mismo mes. Dias trabajados = 6. Bases legales finiquito (indemnizacion proporcional, gratificacion legal) deben converger con la primitive.
4. **Pre-Slice 5**: confirmar subsystem rollup definitivo (`Finance Data Quality` recomendado; alternativa `Identity & Access`). Mi recomendacion: `Finance Data Quality` porque los deltas son economicos (payroll amounts), no workforce identity.
5. **Pre-rollout production**: politica explicita HR/Finance sobre periodos exported pre-flip — preserve-legacy (recomendacion default) vs recompute-all-once con override capability.
