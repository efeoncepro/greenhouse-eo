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

- Crear `src/lib/payroll/participation-window/types.ts`.
- Crear `src/lib/payroll/participation-window/policy.ts` con funcion pura que derive policy, reason codes y factor.
- Crear `src/lib/payroll/participation-window/index.ts` server-only.
- Tests unitarios con matriz:
  - full month
  - `effective_from` dia 13 Felipe-like
  - `effective_from = periodStart`
  - `effective_from > periodEnd`
  - `effective_to < periodStart`
  - `effective_to` dentro del mes
  - entry y exit en el mismo mes
  - Maria-like salida external payroll via TASK-890

### Slice 2 — Bulk Query + TASK-890 Composition

- Implementar reader bulk-first para facts de participacion.
- Componer `resolveExitEligibilityForMembers()` para `eligibleTo`.
- Determinar source precedence documentada para `eligibleFrom`:
  1. workforce relationship/onboarding start si existe y esta confiable
  2. `compensation_versions.effective_from`
  3. `periodStart`
- Si el runtime no tiene start date confiable fuera de compensation, documentar V1 como `compensation.effective_from` source y dejar hook future-ready.

### Slice 3 — Projection Integration Behind Flag

- Agregar env flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED`.
- Integrar en `projectPayrollForPeriod()` despues de obtener compensations y antes de construir entries.
- Aplicar `prorationFactor` por member para `projected_month_end` y `actual_to_date`.
- Mantener legacy parity bit-for-bit cuando flag=false.
- Agregar shadow compare opcional/logged sin romper response.

### Slice 4 — Official Calculation Integration

- Integrar la misma primitive en `calculatePayroll()`.
- Persistir `workingDaysInPeriod`, `daysPresent`, `adjusted*` sin contaminar attendance con entry proration.
- Asegurar que `payroll_entries` reflejen montos prorrateados pero no inventen ausencias.
- Mantener rollback instant via flag=false.

### Slice 5 — Reliability Signals + Operator Evidence

- Agregar signals:
  - `payroll.participation_window.projection_delta_anomaly`
  - `payroll.participation_window.full_month_entry_drift`
- Emitir reason-code distribution y counts por periodo.
- Agregar Sentry capture/warn en degraded resolver path.
- Agregar fixtures de Felipe-like y Maria-like a tests/regression docs.

### Slice 6 — Docs + Rollout

- Actualizar:
  - `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
  - `docs/architecture/DECISIONS_INDEX.md`
  - `docs/documentation/hr/periodos-de-nomina.md`
  - `docs/manual-de-uso/hr/periodos-de-nomina.md`
  - `CLAUDE.md` hard rules si el contrato se materializa en runtime.
  - `Handoff.md`
  - `changelog.md`
- Ejecutar staging shadow compare y documentar resultado.

## Out of Scope

- Split de una persona en multiples payroll entries por cambios de salario intra-mes.
- Cambiar la base legal de prorrateo a calendario operacional con feriados. V1 usa weekdays canonicos existentes.
- Mutar datos productivos de Felipe, Maria u otros colaboradores.
- Backfill historico automatico de payroll entries ya calculadas/exportadas.
- Cambiar la clasificacion legal de `honorarios`, `contractor`, `eor` o `indefinido`.

## Detailed Spec

### Canonical Formula

```text
eligibleFrom = max(periodStart, compensation.effective_from, relationshipStartDate if known)
eligibleTo   = min(periodEnd, compensation.effective_to, TASK-890 exit cutoff if applicable)
```

If `eligibleFrom > eligibleTo`, exclude.

If the window equals the period, pay full period.

If the window starts inside the period, prorate from start.

If the window ends inside the period, prorate until end.

If both bounds are inside the period, prorate bounded window.

### Proration

```text
eligibleWorkingDays = countWeekdays(eligibleFrom, eligibleTo)
periodWorkingDays = countWeekdays(periodStart, periodEnd)
factor = eligibleWorkingDays / periodWorkingDays
```

Apply factor to monetary fields via a shared helper equivalent to current `prorateEntry()`, but member-specific and safe for official calculation.

### Felipe-like Expected Behavior

For a member with:

- `effective_from = 2026-05-13`
- period `2026-05-01` to `2026-05-31`
- base salary `650000`

Expected:

- policy `prorate_from_start`
- reason code `entry_mid_period`
- gross/net no longer equal full-month values
- attendance fields must not imply absence from May 1 to May 12

### Maria-like Expected Behavior

For external payroll offboarding covered by TASK-890:

- TASK-890 continues to decide exit cutoff and exclusion policy.
- Participation window composes that decision and excludes/prorates consistently.
- No duplicated lane/status logic is allowed in TASK-893 code.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (pure policy) -> Slice 2 (bulk resolver + TASK-890 composition) -> Slice 3 (projected integration) -> Slice 4 (official integration) -> Slice 5 (signals) -> Slice 6 (docs/rollout).
- Slice 4 MUST NOT ship without Slice 1-3 tests green.
- Slice 5 may begin after Slice 2 but must land before any production flag flip.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Overpay/underpay due to incorrect entry date precedence | payroll | medium | deterministic source precedence + reason codes + staging shadow compare | `payroll.participation_window.projection_delta_anomaly` |
| Projected and official payroll diverge | payroll | medium | shared primitive consumed by both paths; tests assert same policy | `payroll.participation_window.full_month_entry_drift` |
| TASK-890 exit logic duplicated and drifts | payroll/hr | medium | compose `resolveExitEligibilityForMembers`; lint/review guard | Sentry warning `participation_window.exit_composition_failed` |
| Attendance polluted with non-participation days | payroll/compliance | low | hard rule: no attendance mutation for entry proration | tests on `daysPresent`/`daysAbsent` unchanged |
| Production behavior changes before validation | release | medium | env flag default false + staging-only flip + production approval | flag audit in Handoff |

### Feature flags / cutover

- Env var: `PAYROLL_PARTICIPATION_WINDOW_ENABLED`.
- Default: `false` in production and staging until Slice 3 shadow compare is available.
- Staging cutover: set `true`, redeploy, verify Felipe-like and Maria-like cases.
- Production cutover: set `true`, redeploy, verify `/api/hr/payroll/projected` and one official calculation dry-run/preview before any persisted recalculation.
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
2. Deploy to staging with flag=false and verify legacy parity.
3. Flip flag=true in staging and verify:
   - Felipe-like no longer full-month.
   - Maria-like remains excluded when TASK-890 flag is on.
   - full-month collaborators remain unchanged.
4. Capture staging shadow compare evidence in Handoff.
5. Keep production flag=false until Julio/HR-Finance approves.
6. Flip production flag via Vercel env var + redeploy.
7. Verify authenticated `GET /api/hr/payroll/projected?year=<current>&month=<current>&mode=projected_month_end`.
8. Monitor reliability signals for 7 days.

### Out-of-band coordination required

- HR/Finance approval before production flag flip.
- Communicate that projected payroll totals may decrease for mid-month joiners because the system will stop treating non-participation days as payable days.
- No external provider coordination required for V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolvePayrollParticipationWindowsForMembers()` exists and is bulk-first/server-only.
- [ ] Felipe-like fixture with `effective_from` inside the month prorates and no longer pays full month.
- [ ] Maria-like fixture composes TASK-890 and remains excluded/prorated according to exit policy.
- [ ] Full-month collaborators remain bit-for-bit equal when eligible for the whole period.
- [ ] `projectPayrollForPeriod()` and `calculatePayroll()` consume the same participation primitive.
- [ ] Flag=false preserves current behavior.
- [ ] Flag=true in staging passes authenticated `/api/hr/payroll/projected` verification.
- [ ] Reliability signals are documented and emitted/readable.
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

- V2: split entries por multiples compensation versions dentro del mismo periodo.
- V2: usar operational calendar con feriados por pais/region si HR/Finance define esa base como canonica.
- V2: surface UI que explique reason codes en nomina proyectada.

## Delta 2026-05-15

- Task creada desde investigacion del caso Felipe Zurita: production projected payroll mostro full-month para `effective_from` mid-month (`baseSalary=650000`, `grossTotal=650000`, `prorationFactor=1`, `contractTypeSnapshot=honorarios`).
- Arquitectura validada con `software-architect-2026`: decision `Accepted / high confidence`; se adopta Payroll Participation Window como primitive compartida, no fix local.

## Open Questions

- Confirmar en Slice 2 si `work_relationship_onboarding_cases` o Person 360 relationship tiene start date mas confiable que `compensation_versions.effective_from` para V1.
- Confirmar con HR/Finance si prorrateo V1 por weekdays es suficiente o si se requiere operational calendar con feriados desde el primer rollout.

