# TASK-895 — Leave Accrual Participation-Aware (TASK-893 V1.1a)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (riesgo legal CL Art 67 CT — sobreacumulacion de feriado legal)
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-payroll-participation-window-v1.1`
- Status real: `Disenio canonizado por arch-architect + greenhouse-payroll-auditor 2026-05-16`
- Rank: `TBD`
- Domain: `hr|payroll`
- Blocked by: `TASK-893 V1 SHIPPED` (verde, 2026-05-16)
- Branch: `develop` (zero behavioral change post-merge — flag-gated)
- Legacy ID: `TASK-893 V1.1a`
- GitHub Issue: `none`

## Summary

Hoy `src/lib/hr-core/leave-domain.ts:calculateAccruedLeaveAllowanceDays` usa `members.hire_date` como ancla canonical del accrual de feriado legal CL. TASK-893 introdujo `compensation.effective_from` como source de elegibilidad payroll month-scope. Inconsistency: cuando un colaborador transita `contractor → dependent` mid-month, el sistema acumula feriado durante el periodo contractor (cuando Art 67 CT NO genera derecho), generando **sobrepago al finiquito** y precedente contractual riesgoso. La V1.1a crea primitive canonico `LeaveAccrualEligibilityWindow` year-scope que compone `resolvePayrollParticipationWindowsForMembers` (TASK-893) mes a mes del year, filtrando solo `rule_lane='internal_payroll'`. Flag default OFF. Pre-flag-ON gate: legal review + HR signoff + signal `hr.leave.accrual_overshoot_drift` count=0 sustained ≥30d.

## Why This Task Exists

**Bug class detectado por discovery del Leave module 2026-05-16** (post TASK-893 V1 SHIPPED):

- Caso disparador hipotetico: colaborador `hire_date=2026-01-15` empezo como contractor (no-CL-dependent). En `2026-02-01` paso a contractor honorarios (no acumula feriado legal CL). En `2026-05-13` paso a `dependent` indefinido (effective_from=2026-05-13). Hoy `calculateAccruedLeaveAllowanceDays` calcula accrual desde `hire_date=2026-01-15` ignorando que feb-may NO genero derecho. Resultado: ~5 dias adicionales de feriado registrados que legalmente no existen → al finiquito se pagan como feriado proporcional adeudado → sobrepago laboral + riesgo de litigio "consideren que mi vinculo continuo era dependent".

**Posicion regulatoria CL (greenhouse-payroll-auditor verdict 2026-05-16)**:

- Art 67 CT: feriado anual acumula **solo durante vinculo dependent vigente** (indefinido o plazo fijo). Honorarios y contractor internacional **NO generan feriado legal** (no son trabajadores subordinados bajo CT).
- Art 68 CT: dias progresivos (+1 cada 3 anios sobre 10) **si computan antiguedad cumulada con empleadores anteriores** hasta cap 10 anios, pero el accrual del year en curso requiere vinculo dependent activo.
- Practica HR/Previred: cuando hay transicion `contractor → dependent` en la misma empresa, HR debe (1) resetear accrual canonical desde `effective_from` de la version dependent, (2) preservar antiguedad acumulada previa SOLO para dias progresivos, (3) NO acumular feriado durante periodo contractor.

**Por que no se reinventa**: el usuario fue explicito 2026-05-16: "Ojo que hoy ya tenemos un calculo en Leave de vacaciones proporcionales, no deberiamos reinventar tal vez deberiamos revisar esos y ampliar su alcance para que no quede inconsistente". El modulo Leave es robusto (pure functions, tested) — la V1.1a **extiende** sin reescribir.

## Goal

- Crear primitive canonico `LeaveAccrualEligibilityWindow` year-scope en `src/lib/leave/participation-window/` componiendo TASK-893 month-scope.
- Filter `rule_lane='internal_payroll'` cuando se computa accrual de feriado legal CL (excluir contractor/honorarios/external).
- Wire en `calculateAccruedLeaveAllowanceDays` behind flag `LEAVE_PARTICIPATION_AWARE_ENABLED=false` default.
- Signal canonical `hr.leave.accrual_overshoot_drift` (kind=drift, severity warning >0, steady=0) detectando casos donde accrual legacy > accrual participation-aware (sobreacumulacion).
- Backfill audit script (read-only dry-run default) que reporta cuantos miembros tienen drift > N dias entre legacy y participation-aware.
- Zero behavioral change post-merge (flag OFF preserva legacy bit-for-bit).

## Dependencies & Impact

- **Depende de**: TASK-893 V1 SHIPPED (resolver `resolvePayrollParticipationWindowsForMembers` + types canonical) + TASK-890 lanes canonical (`rule_lane='internal_payroll'`).
- **Impacta a**: `src/lib/hr-core/leave-domain.ts` (no muta firma — extiende via composition), `member_leave_360` VIEW (no muta — read path same), finiquito calculations (TASK-862/863 leen del balance — beneficiado indirecto post-flag-ON).
- **Archivos owned**: `src/lib/leave/participation-window/{types,resolver,index}.ts` + tests + `src/lib/reliability/queries/leave-accrual-overshoot-drift.ts` + reliability wiring + admin script `scripts/leave/audit-accrual-drift.ts`.

## Detailed Spec

### Primitive canonical `LeaveAccrualEligibilityWindow`

```ts
// src/lib/leave/participation-window/types.ts
export interface LeaveAccrualEligibilityWindow {
  readonly memberId: string
  readonly year: number
  readonly eligibleDays: number                     // dias hableiles efectivos en periodo dependent del year
  readonly firstDependentEffectiveFrom: string | null  // ISO date o null si nunca dependent en year
  readonly policy: 'full_year' | 'partial_dependent' | 'no_dependent' | 'unknown'
  readonly reasonCodes: ReadonlyArray<string>
  readonly degradedMode: boolean
  readonly degradedReason?: 'task_893_resolver_failed' | 'task_890_lookup_failed' | 'no_compensation_versions'
}
```

### Resolver canonical

```ts
// src/lib/leave/participation-window/resolver.ts
import 'server-only'

export async function resolveLeaveAccrualWindowForMember(
  memberId: string,
  year: number
): Promise<LeaveAccrualEligibilityWindow> {
  // 1. Construir windows mensuales del year (12 windows).
  // 2. Para cada mes, invocar resolvePayrollParticipationWindowsForMembers([memberId], monthStart, monthEnd).
  // 3. Filtrar windows con rule_lane='internal_payroll' (descartar contractor/honorarios/external).
  // 4. Sumar dias habiles efectivos solo de windows internal_payroll.
  // 5. firstDependentEffectiveFrom = min(effective_from) de versiones dependent del year.
  // 6. policy = derivePolicy(eligibleDays, expectedFullYearDays).
  // 7. captureWithDomain('hr', ...) en degraded fallback con eligibleDays=expectedFullYearDays (legacy bit-for-bit safe).
}
```

### Integration en `leave-domain.ts`

```ts
// src/lib/hr-core/leave-domain.ts (extension, not rewrite)
export async function calculateAccruedLeaveAllowanceDays(input: {
  annualDays: number
  accrualType: AccrualType
  hireDate: string
  year: number
  asOfDate: string
  memberId?: string  // NEW — opcional para back-compat
}) {
  if (
    process.env.LEAVE_PARTICIPATION_AWARE_ENABLED === 'true' &&
    input.memberId &&
    input.accrualType === 'monthly_accrual'
  ) {
    const window = await resolveLeaveAccrualWindowForMember(input.memberId, input.year)
    if (!window.degradedMode) {
      return (input.annualDays * window.eligibleDays) / DAYS_IN_FULL_YEAR
    }
  }
  // Legacy bit-for-bit (preserves CL legal floor on fallback).
  return computeLegacyAccrual(input)
}
```

### Signal canonical `hr.leave.accrual_overshoot_drift`

```ts
// src/lib/reliability/queries/leave-accrual-overshoot-drift.ts
// kind=drift, severity warning >0, steady=0
// Cuenta members donde legacy accrual - participation-aware accrual > 0.5 dias (umbral material)
// para el current year.
```

### Backfill audit script

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/leave/audit-accrual-drift.ts --year=2026 [--apply]
```

Read-only por default. `--apply` requiere capability nueva V1.2 — fuera de scope V1.1a.

## Verification

- 30+ tests pure function sobre `resolver.ts` cubren: full_year, partial_dependent (transicion mid-year), no_dependent (contractor entero year), unknown degraded, year boundary edge cases.
- Live test (skip si no PG) sobre integration con 3 fixtures: dependent full year, contractor→dependent mid-year, dependent→contractor mid-year.
- 504/504 payroll + leave tests verde con flag OFF (legacy bit-for-bit).
- Signal reader test cubre ok/warning/degraded/unknown.
- `pnpm test` + `pnpm build` full antes de cerrar.

## Slicing recomendado

- **S0**: ADR + type contract `LeaveAccrualEligibilityWindow` (no code, no test).
- **S1**: Resolver puro + 30 tests pure function.
- **S2**: Wire en `leave-domain.ts` behind flag `LEAVE_PARTICIPATION_AWARE_ENABLED=false`. Tests legacy bit-for-bit + tests flag-ON.
- **S3**: Signal `hr.leave.accrual_overshoot_drift` reader + builder + reliability wiring + tests.
- **S4**: Backfill audit script dry-run + runbook `docs/operations/runbooks/leave-accrual-drift-audit.md`.
- **S5**: Pre-flag-ON gates: legal review + HR signoff documentado + signal count=0 sustained ≥30d staging.

Cada slice mergeable solo, flag-gated, zero behavioral change post-merge.

## Hard rules (canonizar al cerrar)

- **NUNCA** recomputar accrual inline desde `hire_date` solo cuando `LEAVE_PARTICIPATION_AWARE_ENABLED=true` y memberId disponible.
- **NUNCA** mezclar Leave year-scope con Payroll month-scope en consumers. Leave compone Payroll, no al reves.
- **NUNCA** activar flag en production sin signal count=0 sustained ≥30d staging + legal/HR signoff documentado.
- **NUNCA** mutar `leave_balances` automaticamente cuando se activa el flag — backfill audit script es read-only V1.1a; mutation auditada queda V1.2.
- **SIEMPRE** que un consumer downstream necesite "dias efectivos de dependent en este year", llamar al resolver canonico. Cero composicion ad-hoc.

## Open questions (deliberadamente NO en V1.1a)

- ¿Honorarios acumulan feriado proporcional? Hoy NO — `dependent` only. Si HR pide cambio → ADR separado.
- ¿Saldos negativos por vacaciones tomadas pre-transicion contractor→dependent? V1.2 con write-path reconciliation auditado (capability `leave.balances.reconcile`).
- ¿Cross-empleador antiguedad para Art 68 dias progresivos? Hoy lee `member.total_seniority_years` canonical 360 — si emerge gap, ADR separado.

## Skills consultadas

- `arch-architect` (Greenhouse overlay) — 2026-05-16. Veredicto: 2 tasks separadas (V1.1a + V1.1b), `LeaveAccrualEligibilityWindow` vive en Leave domain y compone TASK-893, anti-corruption DAG-leaf direction.
- `greenhouse-payroll-auditor` — 2026-05-16. Veredicto: posicion regulatoria CL Art 67 CT clara, riesgo dominante = sobreacumulacion, recomendacion = nuevo primitive Leave-owned + flag default OFF + signal `accrual_overshoot_drift`.

## Referencias

- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` — V1 spec (TASK-893)
- `src/lib/payroll/participation-window/` — primitive month-scope canonical (TASK-893)
- `src/lib/hr-core/leave-domain.ts` — modulo Leave existente a extender
- `docs/architecture/DECISIONS_INDEX.md` — registrar ADR V1.1a al merge S0
- `CLAUDE.md` — hard rules section TASK-893 (extender al cerrar V1.1a)
