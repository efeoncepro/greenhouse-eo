# TASK-761 — Payroll Final Settlement / Finiquito Engine Chile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-760`
- Branch: `task/TASK-761-payroll-final-settlement-finiquito-engine-chile`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el motor canónico de cálculo de cierre laboral/finiquito para Chile, empezando por el caso de `resignation` en trabajadores dependientes. El motor debe consumir un `OffboardingCase` ya aprobado, resolver haberes y descuentos finales del trabajador saliente, y producir un settlement auditable separado de la nómina mensual normal.

## Why This Task Exists

Greenhouse ya calcula nómina mensual, pero un finiquito no es simplemente “otra liquidación del mes”. Requiere una capa específica para:

- causal de salida
- fecha efectiva / último día trabajado
- vacaciones pendientes o proporcionales
- haberes finales
- descuentos finales
- reglas legales que no son iguales al payroll mensual normal

Si intentamos modelarlo como un ajuste sobre `payroll_entries` mensuales, mezclamos dos contratos distintos y abrimos riesgo alto de compliance.

## Goal

- Crear un aggregate o runtime explícito de `final_settlement` / `finiquito`.
- Soportar V1 para Chile dependiente con causal `resignation`.
- Calcular haberes y descuentos finales sobre snapshot contractual + caso de salida.
- Mantener el cálculo separado del payroll mensual ordinario.
- Dejar explicación/auditoría clara de inputs, fórmulas y resultado final.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- No modelar el finiquito como mutación silenciosa de payroll mensual.
- Partir por `resignation` en Chile dependiente; otras causales/regímenes como extensiones.
- Toda fórmula debe ser auditable y explicable.
- El engine debe fallar cerrado si faltan datos críticos del caso o snapshot contractual.

## Normative Docs

- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- `docs/tasks/complete/TASK-076-payroll-chile-liquidacion-parity.md`
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`

## Dependencies & Impact

### Depends on

- `TASK-760`
- Runtime payroll Chile existente
- Datos de compensación y antigüedad contractual

### Blocks / Impacts

- Bloquea `TASK-762` como prerequisito de documento real.
- Impacta Payroll, HR, Finance provisioning/read-model y offboarding flows.

### Files owned

- `migrations/<ts>_task-761-final-settlement-engine.sql`
- `src/lib/payroll/final-settlement/**`
- `src/app/api/hr/offboarding/[caseId]/final-settlement/**`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`

## Current Repo State

### Already exists

- Payroll Chile mensual
- Offboarding architecture
- Legacy notion de “finiquito en curso”
- Provisiones laborales documentadas fuera del cálculo de cierre

### Gap

- No existe runtime específico de finiquito.
- No existe cálculo final separado del payroll mensual.
- No existe aggregate/documento auditable de settlement final.

## Scope

### Slice 1 — Final settlement aggregate

- Crear schema base para `final_settlements`
- Link obligatorio a `offboarding_case_id`
- Snapshot contractual + inputs legales mínimos

### Slice 2 — Chile resignation engine

- Resolver V1 de cálculo para renuncia Chile dependiente
- Haberes y descuentos finales soportados en el alcance V1
- Explanation output + breakdown persistido

### Slice 3 — Validation + readiness

- Validar datos mínimos del caso
- Falla cerrada ante inputs faltantes
- Estados del settlement: draft, calculated, reviewed, approved, issued, cancelled

## Out of Scope

- No cubrir todos los países.
- No cubrir desde el día 1 todas las causales de término.
- No emitir aún el documento formal final si depende de `TASK-762`.
- No absorber Onboarding.

## Acceptance Criteria

- [ ] Existe runtime separado de payroll mensual para finiquito/final settlement.
- [ ] Se puede calcular un caso V1 de renuncia Chile dependiente desde un offboarding case.
- [ ] El resultado queda auditable y explicable.
- [ ] No se contamina el motor de payroll mensual con lógica ad hoc de finiquito.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/payroll`
- Casos de prueba de settlement final sobre fixtures Chile

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo movido a la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] arquitectura/documentación actualizadas

## Follow-ups

- `TASK-762`
